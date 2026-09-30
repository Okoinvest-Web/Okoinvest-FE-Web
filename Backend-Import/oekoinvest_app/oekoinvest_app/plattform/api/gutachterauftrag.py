# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gutachter-/Planeraufträge (docs/API.md, Abschnitt „Gutachteraufträge“) – Referenz: src/lib/plattform/backend/demo/gutachter.js,
# Regeln: plattform/gutachter_kern.py (= src/lib/plattform/gutachter/kern.js). Leistungsanfrage an mehrere Gutachter → Angebot →
# Beauftragung (Auftragsbestätigung) → Bestätigung (Zuweisung am Meilenstein) → Termine, Zwischenstände, Rückfragen → Lieferungen
# mit Version/Mängeln/Freigabe → Abnahme → Rechnungen → Zahlung (Ist-Kosten „Plattform Projektkosten“, Kostenart Planung) → Bewertung.
#
# Rechte (jede Methode prüft Rolle UND Eigentum):
#   Backoffice  – Bereich „entwicklung“ (rechte.py): lesen ≥ 1, schreiben = 2; Zahlung zusätzlich „finanzen“ = 2
#   Gutachter   – Website-Rolle „gutachter“ UND gutachter_id = eigenes Konto; nie andere Angebote, Bewertungen, Notizen
# Daten: DocType „Plattform Gutachterauftrag“ (Kopf als Felder, Akte als JSON `daten`), Dateien privat am Auftrag.

import base64

import frappe
from frappe.utils import cint, now_datetime, nowdate

from oekoinvest_app.plattform import gutachter_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.entwicklung_kern import GUTACHTER_FACHGEBIETE
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, ist_admin, konflikt, name_von, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.konstanten import UPLOAD_MAX_BYTES, UPLOAD_TYPEN
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Gutachterauftrag"
DT_PROJEKT = "Plattform Entwicklungsprojekt"
DT_MS = "Plattform Entwicklung Meilenstein"
DT_DOK = "Plattform Entwicklung Dokument"
DT_KOSTEN = "Plattform Projektkosten"
MAIL_G = {"mail_betreff": "Neuigkeiten zu Ihrem Gutachterauftrag – ÖkoInvest", "mail_text": "Zu einem Ihrer Aufträge gibt es Neuigkeiten. Details sehen Sie nach der Anmeldung im Portal."}
MAIL_BO = {"mail_betreff": "Gutachterauftrag – ÖkoInvest", "mail_text": "Zu einem Gutachterauftrag gibt es Neuigkeiten. Details im Backoffice."}
KOPF = ["titel", "status", "gruppe", "projekt_id", "meilenstein_id", "gutachter_id", "verantwortlich_id", "fachgebiet", "angebotsfrist", "liefertermin", "summe_netto", "bewertung_schnitt"]


def _heute():
	return nowdate()


def _bo_lesen(n):
	return ist_admin(n) and stufe(n, "entwicklung") >= 1


def _bo_schreiben(n):
	return ist_admin(n) and stufe(n, "entwicklung") >= 2


def _fin_schreiben(n):
	return ist_admin(n) and stufe(n, "finanzen") >= 2


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.GutachterFehler as e:
		if e.status == 403:
			verboten(str(e))
		if e.status == 409:
			konflikt(str(e))
		ungueltig(str(e))


# ================================================================ Laden / Speichern


def _laden(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Auftrag nicht gefunden.")
	doc = frappe.get_doc(DT, k)
	a = aus_json(doc.daten, {}) or {}
	a.update({
		"id": doc.name, "titel": doc.titel, "status": doc.status, "gruppe": doc.gruppe, "projektId": doc.projekt_id, "meilensteinId": doc.meilenstein_id or None,
		"gutachterId": doc.gutachter_id, "verantwortlichId": doc.verantwortlich_id, "fachgebiet": doc.fachgebiet, "angebotsfrist": str(doc.angebotsfrist or ""),
		"erstelltAm": iso(doc.creation), "geaendertAm": iso(doc.modified),
	})
	for key in ("termine", "berichte", "lieferungen", "rueckfragen", "rechnungen", "dateien", "verlauf"):
		a.setdefault(key, [])
	a.setdefault("erinnert", {})
	return doc, a


def _speichern(doc, a):
	doc.titel, doc.status = a["titel"], a["status"]
	lt = (a.get("beauftragung") or {}).get("liefertermin") or (a.get("angebot") or {}).get("liefertermin") or None
	doc.liefertermin = lt
	doc.summe_netto = (a.get("angebot") or {}).get("summeNetto") or 0
	doc.bewertung_schnitt = (a.get("bewertung") or {}).get("schnitt") or 0
	doc.daten = als_json({k: w for k, w in a.items() if k not in ("id", "titel", "status", "gruppe", "projektId", "meilensteinId", "gutachterId", "verantwortlichId", "fachgebiet", "angebotsfrist", "erstelltAm", "geaendertAm")})
	doc.save(ignore_permissions=True)


def _sicht(n, a):
	if _bo_lesen(n):
		return "bo"
	if "gutachter" in (n.get("rollen") or []) and a["gutachterId"] == n.id:
		return "gutachter"
	verboten("Dieser Auftrag ist Ihrem Konto nicht zugeordnet.")


def _verlauf(a, n, text, extern=True):
	a["verlauf"].append({"am": iso(now_datetime()), "von": (name_von(n.id) if n else "") or ("ÖkoInvest" if ist_admin(n) else "System"), "text": v.text(text, 300), "extern": extern})
	a["verlauf"] = a["verlauf"][-200:]


def _pl(a):
	return a.get("verantwortlichId") or frappe.db.get_value(DT_PROJEKT, a["projektId"], "projektleiter_id")


def _an_gutachter(a, titel, text, mail=True):
	benachrichtigen(a["gutachterId"], "entwicklung", titel, text, f"/portal/gutachter/{a['id']}", "gutachterauftrag", a["id"], mail=mail, **MAIL_G)


def _an_pl(a, titel, text, mail=True):
	k = _pl(a)
	if k:
		benachrichtigen(k, "entwicklung", titel, text, f"/portal/admin/gutachter/{a['id']}", "gutachterauftrag", a["id"], mail=mail, **MAIL_BO)


def _admins_mit(bereich, st):
	erg = []
	for k in aktive_admins():
		br = frappe.db.get_value("Plattform Konto", k, "backoffice_rollen")
		if stufe(frappe._dict(rollen=["admin"], backofficeRollen=br or ""), bereich) >= st:
			erg.append(k)
	return erg


# ================================================================ Ausgabe


def _projekt_kurz(a):
	p = frappe.db.get_value(DT_PROJEKT, a["projektId"], ["name", "titel", "typ", "land", "bundesland", "gemeinde", "mwp"], as_dict=True)
	m = frappe.db.get_value(DT_MS, a.get("meilensteinId"), ["name", "titel"], as_dict=True) if a.get("meilensteinId") else None
	if not p:
		return None
	return {"id": p.name, "titel": p.titel, "typ": p.typ, "land": p.land, "bundesland": p.bundesland or "", "gemeinde": p.gemeinde or "", "mwp": p.mwp or 0, "meilenstein": {"id": m.name, "titel": m.titel} if m else None}


def _schnitt(gutachter_id):
	werte = [x for x in frappe.get_all(DT, filters={"gutachter_id": gutachter_id, "bewertung_schnitt": [">", 0]}, pluck="bewertung_schnitt", limit_page_length=0)]
	return K.bewertung_schnitt([{"schnitt": x} for x in werte])


def _rechte(a, sicht):
	s = a["status"]
	if sicht == "gutachter":
		bearb = s in K.BEARBEITUNG
		return {
			"angebot": s in ("angefragt", "angebot"), "ablehnen": s in ("angefragt", "angebot"), "bestaetigen": s == "beauftragt",
			"liefern": s in ("in_arbeit", "nachbesserung", "in_pruefung", "abnahmebereit"), "bericht": s in ("in_arbeit", "in_pruefung", "nachbesserung"),
			"termin": bearb, "rueckfrage": s in K.AUFTRAG_OFFEN, "abschlag": bearb and ((a.get("angebot") or {}).get("abschlagPct") or 0) > 0 and s != "beauftragt", "schluss": s == "abgenommen",
		}
	offen = s in K.AUFTRAG_OFFEN
	return {
		"beauftragen": s == "angebot", "ablehnen": s in ("angebot", "angefragt"), "pruefen": s == "in_pruefung", "abnehmen": s == "abnahmebereit",
		"stornieren": offen and s not in ("abgenommen", "abgerechnet"), "termin": s in K.BEARBEITUNG, "rueckfrage": offen,
		"bewerten": s in ("abgenommen", "abgerechnet", "abgeschlossen"), "liefertermin": s in ("beauftragt", "in_arbeit", "in_pruefung", "nachbesserung"),
	}


def _datei_json(a, d, sicht):
	return {"id": d.get("id"), "name": d.get("name"), "mime": d.get("mime"), "groesse": d.get("groesse"), "am": d.get("am"), "link": f"/api/{'admin' if sicht == 'bo' else 'portal'}/gutachter/{a['id']}/dateien/{d.get('id')}"}


def _ausgabe(a, sicht, voll=False):
	h = _heute()
	label, schritt = K.AUFTRAG_STATUS.get(a["status"], (a["status"], -1))
	g = frappe.db.get_value("Plattform Konto", a["gutachterId"], ["firma"], as_dict=True) or {}
	stand = K.rechnungs_stand(a, h)
	fristen = K.auftrag_fristen(a, h)
	aus = {
		"id": a["id"], "gruppe": a["gruppe"], "titel": a["titel"], "fachgebiet": a["fachgebiet"], "fachgebietLabel": GUTACHTER_FACHGEBIETE.get(a["fachgebiet"], a["fachgebiet"]),
		"status": a["status"], "statusLabel": label, "statusTon": "ok" if schritt >= 4 else "warn" if a["status"] in ("beauftragt", "nachbesserung") else "neutral" if schritt < 0 else "info", "schritt": schritt,
		"projekt": _projekt_kurz(a), "angebotsfrist": a.get("angebotsfrist"), "wunschtermin": a.get("wunschtermin") or "",
		"gutachter": {"id": a["gutachterId"], "name": name_von(a["gutachterId"]), "firma": g.get("firma") or ""},
		"angebot": a.get("angebot"), "beauftragung": a.get("beauftragung"), "abnahme": a.get("abnahme"), "absage": a.get("absage"),
		"liefertermin": (a.get("beauftragung") or {}).get("liefertermin") or (a.get("angebot") or {}).get("liefertermin") or a.get("wunschtermin") or "",
		"fristen": fristen, "rechnungsstand": stand, "erstelltAm": a.get("erstelltAm"), "geaendertAm": a.get("geaendertAm"),
		"fortschritt": a["berichte"][-1]["fortschritt"] if a["berichte"] else (100 if schritt >= 5 else 0),
		"ueberfaellig": any(f["ueberfaellig"] and f["art"] in ("angebotsfrist", "liefertermin", "zahlung") for f in fristen),
	}
	if sicht == "bo":
		aus["verantwortlich"] = name_von(a.get("verantwortlichId")) if a.get("verantwortlichId") else ""
		aus["bewertung"] = a.get("bewertung")
		aus["gutachter"]["schnitt"] = _schnitt(a["gutachterId"])
	if not voll:
		return aus
	beauftragt = a["status"] not in ("angefragt", "angebot", "abgelehnt", "nicht_beauftragt") and a.get("beauftragung")
	unterlagen = []
	if beauftragt and a["status"] != "storniert" and a.get("meilensteinId"):
		for d in frappe.get_all(DT_DOK, filters={"meilenstein_id": a["meilensteinId"], "fuer_gutachter": 1}, fields=["name", "dateiname", "am", "groesse"], limit_page_length=200):
			unterlagen.append({"id": d.name, "name": d.dateiname, "am": iso(d.am), "groesse": d.groesse, "link": f"/api/portal/entwicklung/dokumente/{d.name}"})
	dateien = {d["id"]: d for d in a["dateien"]}
	aus.update({
		"leistung": a.get("leistung"), "hinweise": a.get("hinweise") or "",
		"termine": sorted([{**t, "statusLabel": {"vorgeschlagen": "Vorgeschlagen", "bestaetigt": "Bestätigt", "erledigt": "Erledigt", "abgesagt": "Abgesagt"}.get(t["status"]), "von": "ÖkoInvest" if t.get("vonSeite") == "bo" else "Gutachter"} for t in a["termine"]], key=lambda t: f"{t['datum']}{t.get('uhrzeit') or ''}"),
		"berichte": list(reversed(a["berichte"])),
		"lieferungen": list(reversed([{**l, "datei": _datei_json(a, dateien.get(l.get("dateiId"), {"id": l.get("dateiId")}), sicht) if l.get("dateiId") else None} for l in a["lieferungen"]])),
		"rueckfragen": [{**r, "von": "ÖkoInvest Projektentwicklung" if r["seite"] == "bo" else ("Sie" if sicht == "gutachter" else name_von(a["gutachterId"]))} for r in a["rueckfragen"]],
		"rechnungen": list(reversed([{**r, "statusLabel": {"eingereicht": "Eingereicht – Prüfung", "geprueft": "Sachlich geprüft – zur Zahlung", "zurueckgewiesen": "Zurückgewiesen", "bezahlt": "Bezahlt"}.get(r["status"]), "datei": _datei_json(a, dateien.get(r.get("dateiId"), {"id": r.get("dateiId")}), sicht) if r.get("dateiId") else None, "ueberfaellig": r["status"] != "bezahlt" and r.get("faelligAm", "") < _heute()} for r in a["rechnungen"]])),
		"unterlagen": unterlagen,
		"verlauf": list(reversed([x for x in a["verlauf"] if sicht == "bo" or x.get("extern")][-60:])),
		"notiz": (a.get("notiz") or "") if sicht == "bo" else None,
		"rechte": _rechte(a, sicht),
	})
	return aus


# ================================================================ Gutachter


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "gutachter" not in (n.get("rollen") or []):
		verboten("Nur für Gutachter und Planer.")
	liste = [_ausgabe(_laden(x)[1], "gutachter") for x in frappe.get_all(DT, filters={"gutachter_id": n.id}, pluck="name", order_by="modified desc", limit_page_length=300)]
	fristen = sorted([{**f, "auftragId": a["id"], "auftrag": a["titel"], "projekt": (a["projekt"] or {}).get("titel", "")} for a in liste for f in a["fristen"] if f["tage"] <= 14 and f["art"] != "zahlung"], key=lambda f: f["datum"])
	return {
		"auftraege": liste, "fristen": fristen,
		"kennzahlen": {
			"anfragen": len([a for a in liste if a["status"] == "angefragt"]), "laufend": len([a for a in liste if a["status"] in K.BEARBEITUNG]),
			"ueberfaellig": len([a for a in liste if a["ueberfaellig"]]), "offenBrutto": K.rund2(sum(a["rechnungsstand"]["offenBrutto"] for a in liste)),
		},
	}


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_doc, a = _laden(id)
	sicht = _sicht(n, a)
	aus = _ausgabe(a, sicht, voll=True)
	if sicht == "bo":
		gruppe = [_laden(x)[1] for x in frappe.get_all(DT, filters={"gruppe": a["gruppe"]}, pluck="name", limit_page_length=20)]
		aus["gruppe"] = {
			"id": a["gruppe"], "auftraege": [_ausgabe(x, "bo") for x in gruppe],
			"vergleich": K.angebot_vergleich([{"id": x["id"], "gutachter": name_von(x["gutachterId"]), "angebot": x.get("angebot"), "bewertung": (_schnitt(x["gutachterId"]) or {}).get("schnitt")} for x in gruppe if x.get("angebot") and x["status"] not in ("abgelehnt", "nicht_beauftragt", "storniert")]),
		}
		aus["darfSchreiben"] = _bo_schreiben(n)
		aus["darfZahlung"] = _fin_schreiben(n)
	return aus


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002, C901
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	art = v.text(d.get("aktion"), 40)
	doc, a = _laden(id)
	sicht = _sicht(n, a)
	if sicht == "bo" and not _bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben.")
	wer = "bo" if sicht == "bo" else "gutachter"
	h = _heute()
	land = frappe.db.get_value(DT_PROJEKT, a["projektId"], "land") or "DE"

	def nach(akt):
		return _fach(K.uebergang, akt, a["status"], wer)

	if art == "angebot_abgeben":
		ziel = nach("angebot_abgeben")
		if a["status"] == "angefragt" and a.get("angebotsfrist") and a["angebotsfrist"] < h:
			konflikt("Die Angebotsfrist ist abgelaufen – bitte wenden Sie sich an die Projektleitung.")
		ang = _fach(K.angebot_bereinigen, d.get("angebot") or {}, h, land)
		a["angebot"] = {**ang, "am": iso(now_datetime()), "version": ((a.get("angebot") or {}).get("version") or 0) + 1}
		a["status"] = ziel
		_verlauf(a, n, f"Angebot abgegeben: {ang['summeNetto']} € netto, Liefertermin {ang['liefertermin']}")
		_an_pl(a, f"Angebot eingegangen: {a['titel']}", f"{name_von(a['gutachterId'])} – {ang['summeNetto']} € netto")
	elif art == "anfrage_ablehnen":
		a["status"] = nach("anfrage_ablehnen")
		a["absage"] = {"grund": v.text(d.get("grund"), 500) or "ohne Angabe", "am": iso(now_datetime()), "seite": "gutachter"}
		_verlauf(a, n, f"Anfrage abgelehnt: {a['absage']['grund']}")
		_an_pl(a, f"Gutachter hat abgelehnt: {a['titel']}", a["absage"]["grund"], mail=False)
	elif art == "beauftragen":
		ziel = nach("beauftragen")
		if (a["angebot"] or {}).get("gueltigBis") and a["angebot"]["gueltigBis"] < h:
			konflikt("Die Bindefrist des Angebots ist abgelaufen – bitte ein aktualisiertes Angebot anfordern.")
		lt = d.get("liefertermin") if K._datum(d.get("liefertermin")) else a["angebot"]["liefertermin"]
		if lt <= h:
			ungueltig("Der Liefertermin muss in der Zukunft liegen.")
		a["status"] = ziel
		a["beauftragung"] = {"am": iso(now_datetime()), "vonId": n.id, "von": name_von(n.id), "nummer": f"GA-{now_datetime().year}-{a['id'][-6:]}", "liefertermin": lt, "bedingungen": v.mehrzeilig(d.get("bedingungen"), 2000), "summeNetto": a["angebot"]["summeNetto"], "bestaetigtAm": None}
		_verlauf(a, n, f"Beauftragt (Auftrag {a['beauftragung']['nummer']}), Liefertermin {lt}")
		_an_gutachter(a, f"Auftrag erteilt: {a['titel']}", "Bitte bestätigen Sie den Auftrag im Portal. Danach sehen Sie die Projektunterlagen.")
		for x in frappe.get_all(DT, filters={"gruppe": a["gruppe"], "name": ["!=", a["id"]], "status": ["in", ["angefragt", "angebot"]]}, pluck="name"):
			dx, ax = _laden(x)
			ax["status"] = "nicht_beauftragt"
			_verlauf(ax, n, "Die Leistung wurde anderweitig vergeben. Vielen Dank für Ihr Angebot.")
			_speichern(dx, ax)
			_an_gutachter(ax, f"Anfrage entschieden: {ax['titel']}", "Die Leistung wurde anderweitig vergeben. Vielen Dank für Ihr Angebot.", mail=False)
	elif art == "angebot_ablehnen":
		a["status"] = nach("angebot_ablehnen")
		a["absage"] = {"grund": v.text(d.get("grund"), 500), "am": iso(now_datetime()), "seite": "bo"}
		_verlauf(a, n, "Angebot nicht angenommen.")
		_an_gutachter(a, f"Anfrage entschieden: {a['titel']}", "Ihr Angebot wurde nicht angenommen.", mail=False)
	elif art == "auftrag_bestaetigen":
		ziel = nach("auftrag_bestaetigen")
		if not v.wahr(d.get("zustimmung")):
			ungueltig("Bitte bestätigen Sie Leistung, Honorar, Termin und die Vertraulichkeitspflichten.")
		a["status"] = ziel
		a["beauftragung"].update({"bestaetigtAm": iso(now_datetime()), "bestaetigtVon": name_von(n.id), "bestaetigtIpHash": sha256(str(d.get("ip") or ""))[:16] if d.get("ip") else ""})
		if a.get("meilensteinId") and frappe.db.exists(DT_MS, a["meilensteinId"]):
			m = frappe.get_doc(DT_MS, a["meilensteinId"])
			ids = aus_json(m.gutachter_ids, []) or []
			if n.id not in ids:
				m.gutachter_ids = als_json(ids + [n.id])
			if m.status == "offen":
				m.status = "in_arbeit"
				m.ist_start = m.ist_start or h
			m.save(ignore_permissions=True)
		_verlauf(a, n, "Auftrag bestätigt")
		_an_pl(a, f"Auftrag bestätigt: {a['titel']}", f"{name_von(n.id)} hat den Auftrag angenommen.", mail=False)
	elif art == "termin":
		if not _rechte(a, sicht)["termin"]:
			konflikt("Termine sind nur während der Bearbeitung möglich.")
		t = _fach(K.termin_bereinigen, d.get("termin") or {}, h)
		a["termine"].append({"id": "GT-" + frappe.generate_hash(length=8).upper(), **t, "status": "vorgeschlagen", "vonSeite": wer, "vonId": n.id, "am": iso(now_datetime())})
		_verlauf(a, n, f"Termin vorgeschlagen: {t['datum']} {t['uhrzeit']}".strip())
		(_an_gutachter if wer == "bo" else _an_pl)(a, f"Terminvorschlag: {a['titel']}", f"{t['datum']} – bitte bestätigen.")
	elif art == "termin_status":
		t = next((x for x in a["termine"] if x["id"] == str(d.get("terminId") or "")), None)
		if not t:
			nicht_gefunden("Termin nicht gefunden.")
		s = v.auswahl(d.get("status"), ["bestaetigt", "erledigt", "abgesagt"], "")
		if not s:
			ungueltig("Unbekannter Terminstatus.")
		if s == "bestaetigt" and t.get("vonSeite") == wer:
			konflikt("Den Vorschlag bestätigt die andere Seite.")
		if t["status"] in ("erledigt", "abgesagt"):
			konflikt("Der Termin ist bereits abgeschlossen.")
		if s == "erledigt" and t["datum"] > h:
			konflikt("Ein Termin in der Zukunft kann nicht erledigt sein.")
		t["status"] = s
		t["protokoll"] = v.text(d.get("protokoll"), 1000) or t.get("protokoll") or ""
		_verlauf(a, n, f"Termin {t['datum']}: {s}")
		(_an_gutachter if wer == "bo" else _an_pl)(a, f"Termin {s}: {a['titel']}", t["datum"], mail=False)
	elif art == "bericht":
		if wer != "gutachter" or not _rechte(a, sicht)["bericht"]:
			konflikt("Zwischenstände meldet der beauftragte Gutachter während der Bearbeitung.")
		b = _fach(K.bericht_bereinigen, d, a["berichte"][-1]["fortschritt"] if a["berichte"] else 0)
		a["berichte"].append({"id": "GB-" + frappe.generate_hash(length=8).upper(), **b, "am": iso(now_datetime())})
		_verlauf(a, n, f"Zwischenstand {b['fortschritt']} %")
		_an_pl(a, f"Zwischenstand {b['fortschritt']} %: {a['titel']}", b["text"][:160], mail=False)
	elif art == "rueckfrage":
		if not _rechte(a, sicht)["rueckfrage"]:
			konflikt("Der Auftrag ist abgeschlossen.")
		t = v.mehrzeilig(d.get("text"), 3000)
		if len(t) < 3:
			ungueltig("Bitte formulieren Sie Ihre Rückfrage.")
		bezug = next((x for x in a["rueckfragen"] if x["id"] == str(d.get("antwortAuf") or "")), None)
		a["rueckfragen"].append({"id": "GR-" + frappe.generate_hash(length=8).upper(), "seite": wer, "vonId": n.id, "text": t, "am": iso(now_datetime()), "antwortAuf": bezug["id"] if bezug else None})
		if bezug:
			bezug["beantwortet"] = True
		_verlauf(a, n, "Antwort" if bezug else "Rückfrage")
		if wer == "bo":
			_an_gutachter(a, f"Nachricht zu Ihrem Auftrag: {a['titel']}", t[:160])
		else:
			_an_pl(a, f"Rückfrage des Gutachters: {a['titel']}", t[:160])
	elif art in ("maengel", "freigeben"):
		l = next((x for x in a["lieferungen"] if x["id"] == str(d.get("lieferungId") or "")), None) or next((x for x in reversed(a["lieferungen"]) if x["status"] == "zur_pruefung"), None)
		if not l or l["status"] != "zur_pruefung":
			konflikt("Keine Lieferung in Prüfung.")
		if art == "maengel":
			a["status"] = nach("maengel")
			liste = _fach(K.maengel_bereinigen, d.get("maengel"))
			l["status"] = "maengel"
			l["maengel"] = [{"id": "GM-" + frappe.generate_hash(length=8).upper(), "text": t, "erledigt": False} for t in liste]
			l["pruefung"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": v.text(d.get("kommentar"), 500)}
			_verlauf(a, n, f"Mängel zu Version {l['version']}: {len(liste)} Punkt(e)")
			_an_gutachter(a, f"Nachbesserung erforderlich: {a['titel']}", f"{len(liste)} Punkt(e) zu Version {l['version']}.")
		else:
			nach("freigeben")
			l["status"] = "freigegeben"
			l["pruefung"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": v.text(d.get("kommentar"), 500)}
			for x in a["lieferungen"]:
				if x["id"] != l["id"] and x["status"] == "freigegeben":
					x["status"] = "ersetzt"
			a["status"] = "abnahmebereit" if l["art"] == "endfassung" else "in_arbeit"
			_verlauf(a, n, f"Version {l['version']} freigegeben")
			_an_gutachter(a, f"Lieferung freigegeben: {a['titel']}", f"Version {l['version']}")
	elif art == "abnehmen":
		ziel = nach("abnehmen")
		l = next((x for x in a["lieferungen"] if x["status"] == "freigegeben" and x["art"] == "endfassung"), None)
		if not l:
			konflikt("Abnahme nur mit freigegebener Endfassung.")
		a["status"] = ziel
		a["abnahme"] = {"am": iso(now_datetime()), "vonId": n.id, "von": name_von(n.id), "lieferungId": l["id"], "version": l["version"], "vorbehalt": v.mehrzeilig(d.get("vorbehalt"), 1000)}
		_verlauf(a, n, f"Abgenommen (Version {l['version']})")
		_an_gutachter(a, f"Abnahme erfolgt: {a['titel']}", "Sie können jetzt die Schlussrechnung stellen.")
	elif art == "stornieren":
		ziel = nach("stornieren")
		grund = v.mehrzeilig(d.get("grund"), 1000)
		if len(grund) < 10:
			ungueltig("Bitte die Stornierung begründen (mind. 10 Zeichen).")
		a["status"] = ziel
		a["absage"] = {"grund": grund, "am": iso(now_datetime()), "seite": "bo"}
		weitere = frappe.db.exists(DT, {"name": ["!=", a["id"]], "gutachter_id": a["gutachterId"], "meilenstein_id": a.get("meilensteinId") or "-", "status": ["in", K.AUFTRAG_OFFEN]})
		if a.get("meilensteinId") and not weitere and frappe.db.exists(DT_MS, a["meilensteinId"]):
			m = frappe.get_doc(DT_MS, a["meilensteinId"])
			m.gutachter_ids = als_json([g for g in (aus_json(m.gutachter_ids, []) or []) if g != a["gutachterId"]])
			m.save(ignore_permissions=True)
		_verlauf(a, n, f"Storniert: {grund}")
		_an_gutachter(a, f"Auftrag storniert: {a['titel']}", grund[:160])
	elif art == "liefertermin":
		if wer != "bo" or not _rechte(a, sicht)["liefertermin"]:
			konflikt("Der Liefertermin lässt sich nur während der Bearbeitung ändern.")
		lt = K._datum(d.get("liefertermin"))
		if not lt or lt < h:
			ungueltig("Bitte einen Liefertermin in der Zukunft angeben.")
		grund = v.text(d.get("grund"), 300)
		if len(grund) < 5:
			ungueltig("Bitte den Grund der Terminänderung angeben.")
		a["beauftragung"]["liefertermin"] = lt
		a["erinnert"] = {}
		_verlauf(a, n, f"Liefertermin geändert auf {lt}: {grund}")
		_an_gutachter(a, f"Neuer Liefertermin: {a['titel']}", f"{lt} – {grund}")
	elif art == "rechnung_pruefen":
		if wer != "bo":
			verboten("Rechnungen prüft ÖkoInvest.")
		r = next((x for x in a["rechnungen"] if x["id"] == str(d.get("rechnungId") or "")), None)
		if not r:
			nicht_gefunden("Rechnung nicht gefunden.")
		if r["status"] != "eingereicht":
			konflikt("Die Rechnung ist bereits geprüft.")
		erg = v.auswahl(d.get("ergebnis"), ["geprueft", "zurueckgewiesen"], "")
		if not erg:
			ungueltig("Bitte „sachlich richtig“ oder „zurückweisen“ wählen.")
		kommentar = v.text(d.get("kommentar"), 500)
		if erg == "zurueckgewiesen" and len(kommentar) < 5:
			ungueltig("Bitte den Grund der Zurückweisung angeben.")
		r["status"] = erg
		r["pruefung"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": kommentar}
		if erg == "zurueckgewiesen" and r["art"] == "schluss" and a["status"] == "abgerechnet":
			a["status"] = "abgenommen"
		_verlauf(a, n, f"Rechnung {r['nummer']}: {erg}")
		_an_gutachter(a, f"Rechnung {r['nummer']}: {'geprüft' if erg == 'geprueft' else 'zurückgewiesen'}", kommentar or a["titel"], mail=erg == "zurueckgewiesen")
		if erg == "geprueft":
			for k in _admins_mit("finanzen", 2):
				benachrichtigen(k, "entwicklung", f"Gutachter-Rechnung zur Zahlung: {r['nummer']}", f"{r['brutto']} € brutto, fällig {r['faelligAm']} – {a['titel']}", f"/portal/admin/gutachter/{a['id']}", "gutachterauftrag", a["id"], mail=False)
	elif art == "bewerten":
		if wer != "bo" or not _rechte(a, sicht)["bewerten"]:
			konflikt("Bewerten lässt sich ein Auftrag nach der Abnahme.")
		a["bewertung"] = {**_fach(K.bewertung_bereinigen, d.get("bewertung") or {}), "am": iso(now_datetime()), "von": name_von(n.id)}
		_verlauf(a, n, f"Intern bewertet ({a['bewertung']['schnitt']})", extern=False)
	elif art == "notiz":
		if wer != "bo":
			verboten()
		a["notiz"] = v.mehrzeilig(d.get("notiz"), 2000)
	else:
		ungueltig("Unbekannte Aktion.")
	_speichern(doc, a)
	protokoll(n, f"gutachter_{art}", "entwicklung", a["projektId"], f"Gutachterauftrag {a['id']}: {art}")
	return {"ok": True, "auftrag": holen(a["id"], als_benutzer)}


@frappe.whitelist(methods=["POST"])
def datei_speichern(id=None, zweck=None, name=None, mime=None, inhalt=None, art=None, kommentar=None, rechnung=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, a = _laden(id)
	if _sicht(n, a) != "gutachter":
		verboten("Lieferungen und Rechnungen lädt der beauftragte Gutachter hoch.")
	if mime not in UPLOAD_TYPEN:
		ungueltig("Erlaubt sind PDF, JPG und PNG.")
	if zweck not in ("lieferung", "rechnung"):
		ungueltig("Unbekannter Zweck des Uploads.")
	if len(a["dateien"]) >= 60:
		konflikt("Für diesen Auftrag sind bereits sehr viele Dateien hinterlegt – bitte die Projektleitung kontaktieren.")
	daten = base64.b64decode(inhalt or "")
	if not daten or len(daten) > UPLOAD_MAX_BYTES:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	h = _heute()
	re_daten = None
	if zweck == "lieferung":
		ziel = _fach(K.uebergang, "liefern", a["status"], "gutachter")
	else:
		re_daten = _fach(K.rechnung_bereinigen, aus_json(rechnung, {}) or {}, a, h)
	dateiname = v.text(str(name or "").replace("/", "_").replace("\\", "_"), 160) or f"datei.{UPLOAD_TYPEN[mime]}"
	did = "GD-" + frappe.generate_hash(length=10).upper()
	f = frappe.get_doc({"doctype": "File", "file_name": f"{a['id']}-{did}.{UPLOAD_TYPEN[mime]}", "is_private": 1, "content": daten, "attached_to_doctype": DT, "attached_to_name": a["id"]}).insert(ignore_permissions=True)
	a["dateien"].append({"id": did, "name": dateiname, "mime": mime, "groesse": len(daten), "datei": f.file_url, "sha256": sha256(daten), "vonId": n.id, "am": iso(now_datetime())})
	out = {}
	if zweck == "lieferung":
		for x in a["lieferungen"]:
			if x["status"] == "zur_pruefung":
				x["status"] = "ersetzt"
		l = {"id": "GL-" + frappe.generate_hash(length=8).upper(), "version": K.naechste_version(a["lieferungen"]), "art": art if art in K.LIEFER_ARTEN else "endfassung", "kommentar": v.text(kommentar, 500), "dateiId": did, "status": "zur_pruefung", "am": iso(now_datetime())}
		a["lieferungen"].append(l)
		a["status"] = ziel
		if a.get("meilensteinId") and frappe.db.exists(DT_MS, a["meilensteinId"]):
			# Anbindung Projektentwicklung: Lieferung erscheint am Meilenstein (Dokumentenakte der Projektleitung)
			ed = frappe.get_doc({"doctype": DT_DOK, "projekt_id": a["projektId"], "meilenstein_id": a["meilensteinId"], "dateiname": f"{dateiname} (Version {l['version']})", "mime": mime, "groesse": len(daten), "datei": f.file_url, "von_id": n.id, "am": now_datetime(), "freigabe_investor": 0, "fuer_gutachter": 0}).insert(ignore_permissions=True)
			frappe.db.set_value(DT_MS, a["meilensteinId"], "eingereicht_am", now_datetime())
			l["entwicklungDokId"] = ed.name
		_verlauf(a, n, f"Lieferung Version {l['version']} eingereicht")
		_an_pl(a, f"Lieferung zur Prüfung: {a['titel']}", f"Version {l['version']}")
		out["lieferung"] = l
	else:
		r = {"id": "GI-" + frappe.generate_hash(length=8).upper(), **re_daten, "dateiId": did, "status": "eingereicht", "am": iso(now_datetime())}
		a["rechnungen"].append(r)
		if r["art"] == "schluss":
			a["status"] = "abgerechnet"
		_verlauf(a, n, f"Rechnung {r['nummer']} über {r['brutto']} € brutto eingereicht")
		_an_pl(a, f"Rechnung eingegangen: {r['nummer']}", f"{r['brutto']} € brutto, fällig {r['faelligAm']} – {a['titel']}")
		out["rechnung"] = r
	_speichern(doc, a)
	protokoll(n, f"gutachter_{zweck}", "entwicklung", a["projektId"], f"Gutachterauftrag {a['id']}: {zweck} hochgeladen")
	return {"ok": True, **out, "auftrag": holen(a["id"], als_benutzer)}


@frappe.whitelist(methods=["POST"])
def datei_lesen(id=None, dateiId=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	_doc, a = _laden(id)
	_sicht(n, a)
	d = next((x for x in a["dateien"] if x["id"] == str(dateiId or "")), None)
	if not d:
		nicht_gefunden("Datei nicht gefunden.")
	f = frappe.get_doc("File", {"file_url": d["datei"]})
	protokoll(n, "gutachter_datei_abruf", "entwicklung", a["projektId"], f"Gutachterauftrag {a['id']}: {d['name']} abgerufen")
	return {"name": d["name"], "mime": d["mime"], "inhalt": base64.b64encode(f.get_content()).decode()}


@frappe.whitelist(methods=["POST"])
def pdf_daten(id=None, art=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_doc, a = _laden(id)
	sicht = _sicht(n, a)
	art = "abnahme" if art == "abnahme" else "auftrag"
	if art == "auftrag" and not a.get("beauftragung"):
		konflikt("Der Auftrag ist noch nicht erteilt.")
	if art == "abnahme" and not a.get("abnahme"):
		konflikt("Der Auftrag ist noch nicht abgenommen.")
	g = frappe.db.get_value("Plattform Konto", a["gutachterId"], ["firma", "email"], as_dict=True) or {}
	protokoll(n, "gutachter_pdf", "entwicklung", a["projektId"], f"Gutachterauftrag {a['id']}: {art} (PDF)")
	return {"art": art, "auftrag": _ausgabe(a, sicht, voll=True), "gutachter": {"name": name_von(a["gutachterId"]), "firma": g.get("firma") or "", "email": g.get("email") or ""}, "ersteller": name_von(n.id)}


@frappe.whitelist(methods=["POST"])
def zaehler(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "gutachter" not in (n.get("rollen") or []):
		return {"offen": 0}
	return {"offen": frappe.db.count(DT, {"gutachter_id": n.id, "status": ["in", ["angefragt", "beauftragt", "nachbesserung"]]})}


# ================================================================ Backoffice


@frappe.whitelist(methods=["POST"])
def uebersicht(projektId=None, status=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice (Projektentwicklung).")
	filt = {}
	if v.kennung(projektId):
		filt["projekt_id"] = v.kennung(projektId)
	if status == "offen":
		filt["status"] = ["in", K.AUFTRAG_OFFEN]
	elif status in K.AUFTRAG_STATUS:
		filt["status"] = status
	liste = [_ausgabe(_laden(x)[1], "bo") for x in frappe.get_all(DT, filters=filt, pluck="name", order_by="modified desc", limit_page_length=500)]
	from oekoinvest_app.plattform.api.entwicklung import _konten_mit_rolle, profil_json

	gutachter = []
	for g in _konten_mit_rolle("gutachter"):
		p = profil_json(g["id"])
		eigene = frappe.get_all(DT, filters={"gutachter_id": g["id"]}, fields=["status"], limit_page_length=0)
		gutachter.append({**g, "fachgebiete": p["fachgebiete"], "fachgebieteLabel": p["fachgebieteLabel"], "schnitt": _schnitt(g["id"]), "laufend": len([x for x in eigene if x.status in K.BEARBEITUNG]), "gesamt": len(eigene), "termintreue": None})
	projekte = []
	for p in frappe.get_all(DT_PROJEKT, filters={"status": ["not in", ["abgebrochen"]]}, fields=["name", "titel", "land"], limit_page_length=500):
		ms = frappe.get_all(DT_MS, filters={"projekt_id": p.name, "status": ["not in", ["erledigt", "entfaellt"]]}, fields=["name", "titel", "kategorie", "gutachten"], order_by="reihenfolge asc", limit_page_length=200)
		projekte.append({"id": p.name, "titel": p.titel, "land": p.land, "meilensteine": [{"id": m.name, "titel": m.titel, "kategorie": m.kategorie, "gutachten": bool(cint(m.gutachten))} for m in ms]})
	fristen = sorted([{**f, "auftragId": a["id"], "auftrag": a["titel"], "gutachter": a["gutachter"]["name"], "projekt": (a["projekt"] or {}).get("titel", "")} for a in liste for f in a["fristen"] if f["tage"] <= 14], key=lambda f: f["datum"])
	return {
		"auftraege": liste, "gutachter": gutachter, "fristen": fristen, "projekte": projekte, "fachgebiete": GUTACHTER_FACHGEBIETE, "darfSchreiben": _bo_schreiben(n),
		"kennzahlen": {
			"offeneAnfragen": len([a for a in liste if a["status"] in ("angefragt", "angebot")]), "angeboteZuEntscheiden": len([a for a in liste if a["status"] == "angebot"]),
			"inPruefung": len([a for a in liste if a["status"] == "in_pruefung"]), "ueberfaellig": len([a for a in liste if a["ueberfaellig"]]),
			"rechnungenOffen": K.rund2(sum(a["rechnungsstand"]["offenBrutto"] for a in liste)),
			"auftragsvolumen": K.rund2(sum((a["angebot"] or {}).get("summeNetto") or 0 for a in liste if a["beauftragung"] and a["status"] != "storniert")),
		},
	}


@frappe.whitelist(methods=["POST"])
def anfrage_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Projektentwicklung).")
	d = aus_json(daten, {}) or {}
	ids = list(dict.fromkeys([v.kennung(x) for x in (d.get("gutachterIds") or []) if v.kennung(x)]))
	if not 1 <= len(ids) <= 8:
		ungueltig("Bitte einen bis acht Gutachter wählen (für einen Angebotsvergleich meist drei).")
	a0 = _fach(K.anfrage_bereinigen, d, _heute(), list(GUTACHTER_FACHGEBIETE))
	pid = v.kennung(d.get("projektId"))
	if not pid or not frappe.db.exists(DT_PROJEKT, pid):
		nicht_gefunden("Entwicklungsprojekt nicht gefunden.")
	if frappe.db.get_value(DT_PROJEKT, pid, "status") in ("abgebrochen", "abgeschlossen"):
		konflikt("Das Projekt ist nicht mehr aktiv.")
	mid = v.kennung(d.get("meilensteinId")) if d.get("meilensteinId") else None
	if d.get("meilensteinId") and (not mid or frappe.db.get_value(DT_MS, mid, "projekt_id") != pid):
		nicht_gefunden("Meilenstein nicht gefunden.")
	gruppe = "GG-" + frappe.generate_hash(length=8).upper()
	neu = []
	for gid in ids:
		if not frappe.db.exists("Plattform Konto Rolle", {"parent": gid, "rolle": "gutachter", "parenttype": "Plattform Konto"}) or not cint(frappe.db.get_value("Plattform Konto", gid, "aktiv")):
			ungueltig("Anfragen gehen nur an Konten mit der Rolle Gutachter/Planer (neue Büros bitte zuerst einladen).")
		if frappe.db.exists(DT, {"gutachter_id": gid, "projekt_id": pid, "meilenstein_id": mid or "", "fachgebiet": a0["fachgebiet"], "status": ["in", K.AUFTRAG_OFFEN]}):
			konflikt(f"{name_von(gid)} hat zu dieser Leistung bereits eine offene Anfrage bzw. einen Auftrag.")
		doc = frappe.get_doc({"doctype": DT, "titel": a0["titel"], "status": "angefragt", "gruppe": gruppe, "projekt_id": pid, "meilenstein_id": mid, "gutachter_id": gid, "verantwortlich_id": n.id, "fachgebiet": a0["fachgebiet"], "angebotsfrist": a0["angebotsfrist"]})
		a = {"leistung": a0["leistung"], "hinweise": a0["hinweise"], "wunschtermin": a0["wunschtermin"], "angebot": None, "beauftragung": None, "termine": [], "berichte": [], "lieferungen": [], "rueckfragen": [], "rechnungen": [], "dateien": [], "bewertung": None, "abnahme": None, "erinnert": {}, "verlauf": []}
		_verlauf(a, n, f"Angebot angefragt, Frist {a0['angebotsfrist']}")
		doc.daten = als_json(a)
		doc.insert(ignore_permissions=True)
		benachrichtigen(gid, "entwicklung", f"Neue Angebotsanfrage: {a0['titel']}", f"Angebotsfrist {a0['angebotsfrist']}", f"/portal/gutachter/{doc.name}", "gutachterauftrag", doc.name, **MAIL_G)
		neu.append(doc.name)
	protokoll(n, "gutachter_anfrage", "entwicklung", pid, f"Gutachter-Anfrage „{a0['titel']}“ an {len(ids)} Büro(s)")
	return {"ok": True, "gruppe": gruppe, "ids": neu}


@frappe.whitelist(methods=["POST"])
def zahlung(id=None, rechnungId=None, datum=None, betrag=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	if not _fin_schreiben(n):
		verboten("Zahlungen bucht die Buchhaltung (Bereich „Finanzen & Abrechnung“).")
	doc, a = _laden(id)
	r = next((x for x in a["rechnungen"] if x["id"] == str(rechnungId or "")), None)
	if not r:
		nicht_gefunden("Rechnung nicht gefunden.")
	if r["status"] != "geprueft":
		konflikt("Die Rechnung ist bereits bezahlt." if r["status"] == "bezahlt" else "Nur sachlich geprüfte Rechnungen können bezahlt werden.")
	am = K._datum(datum) or _heute()
	if am > _heute():
		ungueltig("Das Zahlungsdatum darf nicht in der Zukunft liegen.")
	b = K._zahl(betrag, 0.01, 1e8)
	b = r["brutto"] if b is None else b
	if abs(b - r["brutto"]) > 0.01:
		ungueltig("Der Zahlbetrag weicht vom Rechnungsbetrag ab – Teilzahlungen bitte in der Buchhaltung klären.")
	r["status"] = "bezahlt"
	r["zahlung"] = {"am": am, "betrag": b, "von": name_von(n.id)}
	# Anbindung Finanzen: Ist-Kosten (netto) am Entwicklungsprojekt; mit ERPNext zusätzlich Purchase Invoice/Payment Entry (finanzen/erpnext.py)
	if frappe.db.exists("DocType", DT_KOSTEN):
		frappe.get_doc({"doctype": DT_KOSTEN, "projekt_id": a["projektId"], "kostenart": "planung", "betrag": r["netto"], "datum": am, "beleg": r["nummer"], "beschreibung": f"{name_von(a['gutachterId'])}: {a['titel']}"[:140], "quelle": "Eingangsrechnung Gutachter", "von_id": n.id}).insert(ignore_permissions=True)
	stand = K.rechnungs_stand(a, _heute())
	if a["status"] == "abgerechnet" and stand["schlussVorhanden"] and stand["offenBrutto"] <= 0.01:
		a["status"] = "abgeschlossen"
	_verlauf(a, n, f"Zahlung {r['nummer']}: {b} € am {am}")
	_speichern(doc, a)
	_an_gutachter(a, f"Zahlung angewiesen: {r['nummer']}", f"{b} € am {am}")
	protokoll(n, "gutachter_zahlung", "finanzen", a["projektId"], f"Gutachter-Rechnung {r['nummer']} bezahlt ({b} €)")
	return {"ok": True, "auftrag": holen(a["id"], als_benutzer)}


# ================================================================ Fristen (Scheduler täglich)


def _lauf():
	h = _heute()
	anzahl = 0
	for name in frappe.get_all(DT, filters={"status": ["in", K.AUFTRAG_OFFEN]}, pluck="name", limit_page_length=0):
		doc, a = _laden(name)
		geaendert = False
		for f in K.auftrag_fristen(a, h):
			schl = f"{f['art']}:{f.get('id') or ''}:{f['datum']}:{'v' if f['ueberfaellig'] else 'a'}"
			faellig = {"angebotsfrist": f["tage"] <= 2, "liefertermin": f["tage"] <= 7, "termin": f["tage"] <= 1, "zahlung": f["tage"] <= 3}.get(f["art"], False)
			if not faellig or a["erinnert"].get(schl):
				continue
			a["erinnert"][schl] = h
			geaendert = True
			titel = f"{'Überfällig' if f['ueberfaellig'] else 'Frist'}: {f['text']} – {a['titel']}"
			if f["art"] != "zahlung":
				_an_gutachter(a, titel, f"Datum {f['datum']}")
			if f["art"] != "angebotsfrist" or f["ueberfaellig"]:
				_an_pl(a, titel, f"{name_von(a['gutachterId'])} – {f['datum']}", mail=f["ueberfaellig"])
			if f["art"] == "zahlung":
				for k in _admins_mit("finanzen", 2):
					benachrichtigen(k, "entwicklung", titel, f"Gutachter-Rechnung – {a['titel']}", f"/portal/admin/gutachter/{a['id']}", "gutachterauftrag", a["id"], mail=False)
			anzahl += 1
		if geaendert:
			_speichern(doc, a)
	return {"erinnerungen": anzahl, "geprueftAm": h}


@frappe.whitelist(methods=["POST"])
def fristen(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice (Projektentwicklung).")
	return _lauf()


def fristen_taeglich():
	"""Scheduler (hooks.py, täglich): Angebotsfristen, Liefertermine, Termine, Zahlungsziele."""
	_lauf()
	frappe.db.commit()
