# Copyright (c) 2026, ÖkoInvest GmbH
#
# Finanzen & Abrechnung (docs/API.md, Abschnitt „Finanzen & Abrechnung“) – Referenz: src/lib/plattform/backend/demo/finanzen.js.
# ERPNext optional (installiert + site_config oekoinvest_erpnext): Purchase Invoice = Pacht-Gutschrift, Sales Invoice =
# Contracting-/Provisionsrechnung, Asset, Project. Ohne ERPNext sind die Plattform-Abrechnungen maßgeblich.
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Backoffice  – Rolle admin mit Bereich „finanzen“ (rechte.py): lesen ≥ 1, schreiben = 2 (Leitung, Buchhaltung): Läufe,
#                 Zahlungsstatus, Verträge, SEPA-Export
#   Empfänger   – nur eigene Belege (Konto bzw. Mitglied der Organisation), Pachtverträge nur als Eigentümer
#   Auszahlung  – nur mit verifiziertem KYC und geprüfter Bankverbindung (abrechnung.kyc_auszahlung)

import hashlib

import frappe
from frappe.utils import cint, flt, getdate, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.finanzen import abrechnung as A
from oekoinvest_app.plattform.finanzen import erpnext as E
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.finanzen import sepa as S
from oekoinvest_app.plattform.finanzen import steuer as T
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.organisation import team_rolle
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Abrechnung"


def fin_lesen(n):
	return ist_admin(n) and stufe(n, "finanzen") >= 1


def fin_schreiben(n):
	return ist_admin(n) and stufe(n, "finanzen") >= 2


def lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not fin_lesen(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Lesen." if ist_admin(n) else "Nur für das Backoffice (Buchhaltung).")


def schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not fin_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Buchhaltung).")


def _zugriff(n, b):
	if fin_lesen(n):
		return "backoffice"
	if b.get("empfaengerId") and b["empfaengerId"] == n.id:
		return "empfaenger"
	if b.get("organisationId") and team_rolle(n.id, b["organisationId"]):
		return "team"
	return None


# ================================================================ Ausgabe (camelCase wie das Demo-Backend)


def beleg_ausgabe(b, backoffice=False, detail=False):
	heute = L.heute()
	zs = L.zahlungsstatus(b, heute)
	aus = {
		"id": b["id"], "nummer": b["nummer"], "art": b["art"], "artLabel": L.ABRECHNUNG_ARTEN[b["art"]]["label"], "beleg": b["beleg"], "titel": b["titel"],
		"empfaenger": (b.get("partei") or {}).get("name", ""), "zeitraum": b["zeitraum"], "rechnungsdatum": b["rechnungsdatum"], "faelligAm": b["faelligAm"],
		"netto": b["netto"], "steuerBetrag": (b.get("steuer") or {}).get("betrag", 0), "steuerSatz": (b.get("steuer") or {}).get("satz", 0), "brutto": b["brutto"], "waehrung": "EUR",
		"status": b["status"], "zahlungsstatus": zs, "zahlungsstatusLabel": L.ZAHLUNGSSTATUS.get(zs, zs), "bezahltAm": b.get("bezahltAm"), "bezugText": b.get("bezugText", ""),
		"kennzahlen": b.get("kennzahlen") or {}, "gesellschaftId": b.get("gesellschaftId"), "gesellschaft": (b.get("aussteller") or {}).get("name", ""),
		"bezug": {k: (b.get("bezug") or {}).get(k) for k in ("pachtvertragId", "anlageId", "provisionId", "projektId", "monat", "phase")},
	}
	if b["art"] == "pacht":
		k = A.kyc_auszahlung(b.get("empfaengerId"), (b.get("bezug") or {}).get("flaecheId"))
		aus["auszahlung"] = {"ok": k["ok"], "ibanMaskiert": S.iban_maskieren(k["iban"])}
		if backoffice:
			aus["auszahlung"].update({"gruende": k["gruende"], "quelle": k["quelle"], "kycStatus": k["status"]})
		elif not k["ok"]:
			aus["auszahlung"]["hinweis"] = "Die Auszahlung erfolgt, sobald Ihre Verifizierung inkl. Bankverbindung abgeschlossen ist (Portal → Verifizierung)."
	if backoffice:
		aus.update({
			"empfaengerId": b.get("empfaengerId"), "organisationId": b.get("organisationId"), "erpnext": b.get("erpnext"), "laufId": b.get("laufId"), "zahlungslaufId": b.get("zahlungslaufId"),
			"mahnungen": b.get("mahnungen") or [], "mahnhinweis": L.mahnhinweis(b, heute), "pflichtFehlt": b.get("pflichtFehlt") or [], "hinweise": b.get("hinweise") or [],
		})
	if detail:
		ges = A.gesellschaft(b.get("gesellschaftId"))
		aus.update({
			"partei": b.get("partei"), "aussteller": b.get("aussteller"), "positionen": b.get("positionen") or [], "steuer": b.get("steuer"), "erklaerung": b.get("erklaerung") or [],
			"zaehlerstaende": b.get("zaehlerstaende") or [], "erinnerungen": len(b.get("mahnungen") or []),
			"bankverbindung": {"name": ges["name"], "iban": " ".join(S.iban_normalisieren(ges["iban"])[i : i + 4] for i in range(0, len(S.iban_normalisieren(ges["iban"])), 4)), "bic": ges["bic"], "beispiel": False} if b["beleg"] == "rechnung" and ges.get("iban") else None,
		})
	return aus


def _beleg_laden(n, kennung):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Abrechnung nicht gefunden.")
	b = A.beleg_dict(frappe.get_doc(DT, k))
	zg = _zugriff(n, b)
	if not zg:
		verboten("Diese Abrechnung gehört nicht zu Ihrem Konto.")
	return b, zg


def _vertrag_ausgabe(pt, backoffice=False):
	heute = L.heute()
	tabelle = A.vpi_tabelle()
	jahrespacht, erkl = None, []
	if pt["modell"] == "indexiert" and pt.get("index"):
		regel = {**pt["index"], "basisBetrag": pt["pachtJahr"]}
		r = L.indexierte_pacht(regel, int(heute[:4]), tabelle)
		jahrespacht, erkl = r["betrag"], L.index_erklaerung(regel, r)
	elif pt["modell"] == "fest":
		jahrespacht, erkl = pt["pachtJahr"], [f"Feste Jahrespacht {L.euro(pt['pachtJahr'])} ohne Indexanpassung."]
	elif pt.get("umsatz"):
		u = pt["umsatz"]
		erkl = [f"{L.zahl_de(u['anteil'] * 100, 2)} % der Stromerlöse der Anlage (vereinbarter Erlös {L.zahl_de(u['erloesCtKwh'], 3)} ct/kWh), mindestens {L.euro(u['mindestJahr'])} pro Jahr."]
	nf = L.naechste_faelligkeit(A.fuer_faelligkeit(pt), heute)
	naechste = None
	if nf:
		r = L.pacht_positionen(pt, nf, tabelle, 0 if pt["modell"] == "umsatz" else None)
		naechste = {"faelligAm": nf["faelligAm"], "zeitraum": {"von": nf["von"], "bis": nf["bis"]}, "phase": nf["phase"], "betrag": r["netto"], "mindestens": pt["modell"] == "umsatz" and nf["phase"] == "pacht"}
	vorlage = A.pacht_steuer_vorlage(pt)
	aus = {
		**{k: pt[k] for k in ("id", "bezeichnung", "objektArt", "land", "flaecheHa", "flaecheId", "anlageId", "modell", "pachtJahr", "index", "umsatz", "reservierungJahr", "vertragsdatum", "beginnArt", "beginn", "laufzeitJahre", "faelligkeit", "zahlweise", "zahlungszielTage", "status")},
		"objektLabel": L.PACHT_OBJEKTE.get(pt["objektArt"], pt["objektArt"]), "modellLabel": L.PACHTMODELLE.get(pt["modell"], pt["modell"]), "beginnLabel": L.BEGINN_ARTEN.get(pt["beginnArt"], ""),
		"ende": L.laufzeit_ende(pt["beginn"], pt["laufzeitJahre"]) or "", "faelligkeitLabel": L.RHYTHMEN.get(pt["faelligkeit"], ("",))[0], "zahlweiseLabel": L.ZAHLWEISEN.get(pt["zahlweise"], ""),
		"statusLabel": L.PACHTVERTRAG_STATUS.get(pt["status"], pt["status"]), "jahrespachtAktuell": jahrespacht, "erklaerung": erkl, "naechsteZahlung": naechste,
		"steuer": {"vorlage": vorlage, "label": T.STEUERVORLAGEN.get(vorlage, ("", 0, "", ""))[3]},
	}
	if backoffice:
		k = A.kyc_auszahlung(pt["eigentuemerId"], pt.get("flaecheId"))
		ges = A.gesellschaft(pt["gesellschaftId"]) if pt.get("gesellschaftId") else (A.anlage_gesellschaft(A.anlage_daten(pt["anlageId"])["anlage"]) if pt.get("anlageId") else A.gesellschaft(None))
		aus.update({
			"eigentuemerId": pt["eigentuemerId"], "eigentuemer": {"id": pt["eigentuemerId"], "name": name_von(pt["eigentuemerId"]), "email": frappe.db.get_value("Plattform Konto", pt["eigentuemerId"], "email")},
			"gesellschaftId": pt.get("gesellschaftId"), "gesellschaft": ges["name"], "steuervorlage": pt["steuervorlage"], "steuerOption": pt["steuerOption"], "kleinunternehmer": pt["kleinunternehmer"], "bemerkung": pt["bemerkung"],
			"belege": frappe.db.count(DT, {"pachtvertrag_id": pt["id"]}), "auszahlung": {"ok": k["ok"], "gruende": k["gruende"], "ibanMaskiert": S.iban_maskieren(k["iban"]), "quelle": k["quelle"], "kycStatus": k["status"]},
			"erstelltAm": pt["erstelltAm"], "geaendertAm": pt["geaendertAm"],
		})
	return aus


def _summen(liste):
	return {
		"anzahl": len(liste), "netto": L.summe(liste, "netto"), "brutto": L.summe(liste, "brutto"),
		"bezahlt": L.summe([b for b in liste if b["status"] == "bezahlt"], "brutto"), "offen": L.summe([b for b in liste if b["status"] in ("offen", "angewiesen")], "brutto"),
	}


# ================================================================ Portal


@frappe.whitelist(methods=["POST"])
def meine(jahr=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	filters = [[DT, "status", "!=", "storniert"]]
	namen = set(frappe.get_all(DT, filters=filters + [[DT, "empfaenger_id", "=", n.id]], pluck="name", limit_page_length=0))
	orgs = frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": n.id}, pluck="organisation_id")
	if orgs:
		namen |= set(frappe.get_all(DT, filters=filters + [[DT, "organisation_id", "in", orgs]], pluck="name", limit_page_length=0))
	eigene = [A.beleg_dict(frappe.get_doc(DT, x)) for x in namen]
	jahre = sorted({int((b["zeitraum"]["von"] or b["rechnungsdatum"])[:4]) for b in eigene}, reverse=True)
	aktuell = int(L.heute()[:4])
	j = cint(jahr) if cint(jahr) in jahre else (aktuell if aktuell in jahre else (jahre[0] if jahre else aktuell))
	im_jahr = lambda b: str(b["zeitraum"]["von"]).startswith(str(j))  # noqa: E731
	sortiert = lambda liste: sorted(liste, key=lambda b: (b["zeitraum"]["von"], b["nummer"]), reverse=True)  # noqa: E731
	pacht = [b for b in eigene if b["art"] == "pacht"]
	vertraege = [_vertrag_ausgabe(A.pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", p))) for p in frappe.get_all("Plattform Pachtvertrag", filters={"eigentuemer_id": n.id, "status": ["!=", "entwurf"]}, pluck="name")]
	naechste = sorted([{**x["naechsteZahlung"], "vertrag": x["bezeichnung"]} for x in vertraege if x["naechsteZahlung"]], key=lambda z: z["faelligAm"])
	kyc = A.kyc_auszahlung(n.id) if pacht or vertraege else None
	contracting = [b for b in eigene if b["art"] == "contracting"]
	monate = {}
	for b in [x for x in contracting if im_jahr(x)]:
		m = (b.get("bezug") or {}).get("monat") or b["zeitraum"]["von"][:7]
		e = monate.setdefault(m, {"monat": m, "kwh": 0, "netto": 0, "brutto": 0, "anlagen": 0})
		e["kwh"] += flt((b.get("kennzahlen") or {}).get("gelieferteKwh"))
		e["netto"] = L.rund2(e["netto"] + b["netto"])
		e["brutto"] = L.rund2(e["brutto"] + b["brutto"])
		e["anlagen"] += 1
	provision = [b for b in eigene if b["art"] == "provision"]
	return {
		"jahr": j, "jahre": jahre or [aktuell],
		"pacht": {"sichtbar": bool(pacht or vertraege), "belege": [beleg_ausgabe(b) for b in sortiert(pacht)], "jahr": _summen([b for b in pacht if im_jahr(b)]), "vertraege": vertraege, "naechsteZahlung": naechste[0] if naechste else None,
			"auszahlung": {"ok": kyc["ok"], "ibanMaskiert": S.iban_maskieren(kyc["iban"]), "hinweis": "" if kyc["ok"] else "Auszahlungen erfolgen erst nach abgeschlossener Verifizierung mit geprüfter Bankverbindung."} if kyc else None},
		"contracting": {"sichtbar": bool(contracting), "belege": [beleg_ausgabe(b) for b in sortiert(contracting)], "jahr": _summen([b for b in contracting if im_jahr(b)]), "monate": sorted(monate.values(), key=lambda x: x["monat"])},
		"provision": {"sichtbar": bool(provision), "belege": [beleg_ausgabe(b) for b in sortiert(provision)], "jahr": _summen([b for b in provision if im_jahr(b)])},
	}


@frappe.whitelist(methods=["POST"])
def abrechnung(id=None, als_benutzer=None):  # noqa: A002 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	b, zg = _beleg_laden(n, id)
	return beleg_ausgabe(b, backoffice=zg == "backoffice", detail=True)


@frappe.whitelist(methods=["POST"])
def abrechnung_pdf(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	b, zg = _beleg_laden(n, id)
	protokoll(n, "abrechnung_pdf", "abrechnung", b["id"], f"PDF {b['nummer']} abgerufen", ip or "")
	return beleg_ausgabe(b, backoffice=zg == "backoffice", detail=True)


# ================================================================ Backoffice


@frappe.whitelist(methods=["POST"])
def cockpit(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	heute = L.heute()
	e = A.einstellungen()
	offen = [A.beleg_dict(frappe.get_doc(DT, x)) for x in frappe.get_all(DT, filters={"status": ["in", ["offen", "angewiesen"]]}, pluck="name", limit_page_length=0)]
	forderungen = [b for b in offen if b["beleg"] == "rechnung" and b["status"] == "offen"]
	ueber = [b for b in forderungen if L.zahlungsstatus(b, heute) == "ueberfaellig"]
	gutschriften = [b for b in offen if b["art"] == "pacht" and b["status"] == "offen"]
	gesperrt = [b for b in gutschriften if not A.kyc_auszahlung(b.get("empfaengerId"), (b.get("bezug") or {}).get("flaecheId"))["ok"]]
	jahr = heute[:4]
	jahr_summe = {art: flt(frappe.db.sql(f"select coalesce(sum(netto),0) from `tab{DT}` where art=%s and status!='storniert' and zeitraum_von like %s", (art, f"{jahr}%"))[0][0]) for art in ("pacht", "contracting", "provision")}
	je_ges = {}
	for r in frappe.db.sql(f"select gesellschaft_id, art, sum(netto) netto from `tab{DT}` where status!='storniert' and zeitraum_von like %s group by gesellschaft_id, art", (f"{jahr}%",), as_dict=True):
		g = je_ges.setdefault(r.gesellschaft_id or A.OEKOINVEST_ID, {"erloese": {"contracting": 0, "provision": 0}, "pachtaufwand": 0})
		if r.art == "pacht":
			g["pachtaufwand"] = flt(r.netto)
		else:
			g["erloese"][r.art] = flt(r.netto)
	warnungen = []
	if not e["uid"]:
		warnungen.append("UID-Nummer der ÖkoInvest GmbH fehlt in den Finanzeinstellungen – Pflichtangabe auf Rechnungen (§ 11 Abs. 1 UStG 1994).")
	if not S.iban_pruefen(e["iban"]):
		warnungen.append("IBAN des Geschäftskontos fehlt oder ist ungültig (Finanzeinstellungen) – SEPA-Dateien und Zahlungshinweise nicht möglich.")
	pflicht = len([b for b in offen if b.get("pflichtFehlt")])
	if pflicht:
		warnungen.append(f"{pflicht} offene Belege mit unvollständigen Pflichtangaben (Details am Beleg).")
	laeufe = []
	for l in frappe.get_all("Plattform Abrechnungslauf", fields=["name", "art", "stichtag", "monat", "creation", "von_id", "ergebnis"], order_by="creation desc", limit_page_length=8):
		erg = aus_json(l.ergebnis, {}) or {}
		laeufe.append({"id": l.name, "art": l.art, "artLabel": L.LAUF_ARTEN.get(l.art, l.art), "stichtag": str(l.stichtag), "monat": l.monat, "am": iso(l.creation), "vonName": name_von(l.von_id) if l.von_id else "Scheduler", "erzeugt": len(erg.get("erzeugt") or []), "summe": L.summe(erg.get("erzeugt") or [], "brutto"), "klaerfaelle": len(erg.get("klaerfaelle") or []), "vorhanden": erg.get("vorhanden", 0)})
	zl = [_zahlungslauf_json(frappe.get_doc("Plattform Zahlungslauf", x)) for x in frappe.get_all("Plattform Zahlungslauf", order_by="creation desc", pluck="name", limit_page_length=8)]
	return {
		"heute": heute,
		"einstellungen": {"firma": {"name": e["firma"], "anschrift": e["anschrift"], "land": e["land"], "firmenbuch": e["firmenbuch"], "uid": e["uid"]}, "auftraggeber": {"name": e["firma"], "ibanMaskiert": S.iban_maskieren(e["iban"]), "beispiel": False}, "zahlungszielTage": e["zahlungszielTage"],
			"erpnext": {"aktiv": E.aktiv(), "modus": "ERPNext" if E.aktiv() else ("ERPNext installiert, Schalter aus" if E.installiert() else "Eigenbetrieb"), "hinweis": "Belege werden zusätzlich als Purchase/Sales Invoice in der Company der ausstellenden Gesellschaft angelegt." if E.aktiv() else "Belege entstehen als Plattform-Abrechnungen. ERPNext aktivieren: App installieren, Setup-Assistent ausführen und site_config „oekoinvest_erpnext“: 1."}},
		"kennzahlen": {
			"forderungenOffen": L.summe(forderungen, "brutto"), "forderungenAnzahl": len(forderungen), "ueberfaellig": L.summe(ueber, "brutto"), "ueberfaelligAnzahl": len(ueber),
			"gutschriftenOffen": L.summe(gutschriften, "brutto"), "gutschriftenAnzahl": len(gutschriften), "gutschriftenGesperrt": len(gesperrt),
			"klaerfaelleOffen": frappe.db.count("Plattform Klaerfall", {"status": "offen"}), "pachtvertraegeAktiv": frappe.db.count("Plattform Pachtvertrag", {"status": "aktiv"}), "jahr": jahr_summe,
		},
		"jeGesellschaft": [{"id": gid, "name": A.gesellschaft(gid)["name"], "spv": gid != A.OEKOINVEST_ID, **w, "forderungenOffen": L.summe([b for b in forderungen if b.get("gesellschaftId") == gid], "brutto"), "anlagen": 0} for gid, w in je_ges.items()] or [{"id": A.OEKOINVEST_ID, "name": e["firma"], "spv": False, "erloese": {"contracting": 0, "provision": 0}, "pachtaufwand": 0, "forderungenOffen": 0, "anlagen": 0}],
		"mahnvorschlaege": [x for x in (beleg_ausgabe(b, backoffice=True) for b in ueber) if (x.get("mahnhinweis") or {}).get("faellig")][:20],
		"laeufe": laeufe, "zahlungslaeufe": zl, "warnungen": warnungen, "darfSchreiben": fin_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def abrechnungen(art=None, status=None, q=None, limit=300, als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	heute = L.heute()
	filters = {}
	if art in L.ABRECHNUNG_ARTEN:
		filters["art"] = art
	if status in ("offen", "angewiesen", "bezahlt", "storniert"):
		filters["status"] = status
	elif status == "ueberfaellig":
		filters.update({"status": "offen", "faellig_am": ["<", heute]})
	such = v.text(q, 80)
	or_filters = {"nummer": ["like", f"%{such}%"], "titel": ["like", f"%{such}%"], "name": ["like", f"%{such}%"]} if such else None
	namen = frappe.get_all(DT, filters=filters, or_filters=or_filters, order_by="rechnungsdatum desc, nummer desc", pluck="name", limit_page_length=min(1000, cint(limit) or 300))
	return [beleg_ausgabe(A.beleg_dict(frappe.get_doc(DT, x)), backoffice=True) for x in namen]


@frappe.whitelist(methods=["POST"])
def abrechnung_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	b, _ = _beleg_laden(n, id)
	doc = frappe.get_doc(DT, b["id"])
	heute = L.heute()
	aktion = d.get("aktion")
	if aktion == "bezahlt":
		if doc.status not in ("offen", "angewiesen"):
			konflikt("Nur offene Belege können als bezahlt markiert werden.")
		if doc.art == "pacht":
			k = A.kyc_auszahlung(doc.empfaenger_id, (b.get("bezug") or {}).get("flaecheId"))
			if not k["ok"]:
				konflikt(f"Keine Auszahlung ohne abgeschlossene Verifizierung: {' '.join(k['gruende'])}")
		datum = d.get("datum") if L.ist_datum(d.get("datum")) else heute
		if datum > heute:
			ungueltig("Das Zahlungsdatum darf nicht in der Zukunft liegen.")
		doc.db_set({"status": "bezahlt", "bezahlt_am": datum})
		b = A.beleg_dict(doc)
		A.provision_nachziehen(n, b)
		A.beleg_melden(b, "bezahlt")
	elif aktion == "offen":
		if doc.status != "angewiesen":
			konflikt("Nur angewiesene Zahlungen können zurückgesetzt werden.")
		doc.db_set({"status": "offen", "zahlungslauf_id": None})
	elif aktion == "mahnen":
		if doc.beleg != "rechnung" or L.zahlungsstatus(b, heute) != "ueberfaellig":
			konflikt("Erinnern nur bei überfälligen Rechnungen.")
		h = L.mahnhinweis(b, heute) or {}
		daten_ = aus_json(doc.daten, {}) or {}
		daten_["mahnungen"] = (daten_.get("mahnungen") or []) + [{"am": iso(now_datetime()), "stufe": max(1, h.get("stufe") or 1), "label": h.get("label") or "Zahlungserinnerung", "vonId": n.id}]
		doc.db_set("daten", als_json(daten_))
		A.beleg_melden(A.beleg_dict(doc), "erinnerung")
	elif aktion == "storno":
		grund = v.mehrzeilig(d.get("grund"), 500)
		if len(grund) < 5:
			ungueltig("Bitte geben Sie einen Grund für die Stornierung an (mind. 5 Zeichen).")
		if doc.status != "offen":
			konflikt("Nur offene Belege können storniert werden (bezahlte/angewiesene zuerst zurücksetzen bzw. Gutschrift korrigieren).")
		if doc.erpnext_name and E.aktiv():
			E.rechnung_stornieren(doc.erpnext_doctype, doc.erpnext_name)
		doc.db_set({"status": "storniert", "storno_grund": grund})
	else:
		ungueltig("Unbekannte Aktion.")
	protokoll(n, f"abrechnung_{aktion}", "abrechnung", doc.name, f"{doc.nummer}: {aktion}")
	return beleg_ausgabe(A.beleg_dict(frappe.get_doc(DT, doc.name)), backoffice=True, detail=True)


@frappe.whitelist(methods=["POST"])
def lauf(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	art = d.get("art") if d.get("art") in L.LAUF_ARTEN else None
	if not art:
		ungueltig("Bitte wählen Sie die Art des Laufs.")
	heute = L.heute()
	stichtag = d.get("stichtag") if L.ist_datum(d.get("stichtag")) else heute
	if stichtag > L.plus_tage(heute, 62):
		ungueltig("Der Stichtag darf höchstens zwei Monate in der Zukunft liegen.")
	monat = d.get("monat") if v.text(d.get("monat"), 7) and len(str(d.get("monat"))) == 7 else L.vormonat(stichtag[:7])
	if monat >= heute[:7]:
		ungueltig("Contracting wird erst nach Monatsende abgerechnet (Monatswerte des Messstellenbetreibers).")
	ids = lambda x: [v.kennung(i) for i in (x or [])[:200] if v.kennung(i)]  # noqa: E731
	return A.lauf_ausfuehren(n, art, stichtag, monat, bool(d.get("trockenlauf")), ids(d.get("vertragIds")), ids(d.get("anlageIds")))


# ---------------------------------------------------------------- Pachtverträge

FELD = {
	"eigentuemerId": "eigentuemer_id", "bezeichnung": "bezeichnung", "objektArt": "objekt_art", "land": "land", "flaecheHa": "flaeche_ha", "flaecheId": "flaeche_id", "anlageId": "anlage_id",
	"gesellschaftId": "gesellschaft_id", "modell": "modell", "pachtJahr": "pacht_jahr", "reservierungJahr": "reservierung_jahr", "vertragsdatum": "vertragsdatum", "beginnArt": "beginn_art",
	"beginn": "beginn", "laufzeitJahre": "laufzeit_jahre", "faelligkeit": "faelligkeit", "zahlweise": "zahlweise", "zahlungszielTage": "zahlungsziel_tage", "steuervorlage": "steuervorlage",
	"steuerOption": "steuer_option", "kleinunternehmer": "kleinunternehmer", "status": "status", "bemerkung": "bemerkung",
}


def _vertrag_setzen(doc, d, neu):
	has = lambda k: neu or k in d  # noqa: E731
	if has("eigentuemerId"):
		k = v.kennung(d.get("eigentuemerId"))
		if not k or not frappe.db.exists("Plattform Konto", k):
			ungueltig("Bitte wählen Sie das Konto des Eigentümers.")
		rollen = frappe.get_all("Plattform Konto Rolle", filters={"parent": k}, pluck="rolle")
		if not {"flaeche", "landwirt"} & set(rollen):
			ungueltig("Das Konto hat keine Eigentümer-Rolle (Flächeneigentümer/Landwirt).")
		doc.eigentuemer_id = k
	if has("bezeichnung"):
		doc.bezeichnung = v.text(d.get("bezeichnung"), 120)
	for k, auswahl in (("objektArt", L.PACHT_OBJEKTE), ("land", ("AT", "DE", "CH")), ("modell", L.PACHTMODELLE), ("beginnArt", L.BEGINN_ARTEN), ("faelligkeit", L.RHYTHMEN), ("zahlweise", L.ZAHLWEISEN), ("status", L.PACHTVERTRAG_STATUS)):
		if has(k) and (d.get(k) in auswahl or neu):
			doc.set(FELD[k], d.get(k) if d.get(k) in auswahl else doc.get(FELD[k]))
	for k, maximal in (("flaecheHa", 100000), ("pachtJahr", 1e8), ("reservierungJahr", 1e7)):
		if has(k):
			doc.set(FELD[k], flt(v.zahl(d.get(k), min=0, max=maximal) or 0))
	for k in ("vertragsdatum", "beginn"):
		if has(k):
			doc.set(k, d.get(k) if L.ist_datum(d.get(k)) else None)
	if has("laufzeitJahre"):
		doc.laufzeit_jahre = max(0, min(60, cint(d.get("laufzeitJahre"))))
	if has("zahlungszielTage"):
		doc.zahlungsziel_tage = max(0, min(90, cint(d.get("zahlungszielTage") if d.get("zahlungszielTage") is not None else 14)))
	if has("steuervorlage"):
		doc.steuervorlage = d.get("steuervorlage") if d.get("steuervorlage") in T.STEUERVORLAGEN else ""
	for k in ("steuerOption", "kleinunternehmer"):
		if has(k):
			doc.set(FELD[k], 1 if d.get(k) in (True, 1, "1", "true") else 0)
	if has("bemerkung"):
		doc.bemerkung = v.mehrzeilig(d.get("bemerkung"), 1000)
	for k in ("flaecheId", "anlageId"):
		if has(k):
			doc.set(FELD[k], v.kennung(d.get(k)) or None)
	if has("gesellschaftId"):
		g = v.text(d.get("gesellschaftId"), 40)
		doc.gesellschaft_id = g if g and g != A.OEKOINVEST_ID else None
	if has("index"):
		i = d.get("index") or {}
		doc.index_reihe = i.get("reihe") if i.get("reihe") in L.INDEX_REIHEN else {"DE": "VPI-DE-2020", "CH": "LIK-CH-2020"}.get(doc.land, "VPI-AT-2020")
		doc.index_basis_jahr = cint(i.get("basisJahr"))
		doc.index_basis_wert = flt(i.get("basisIndex")) or None
		doc.index_schwelle_pct = max(0, min(25, flt(i.get("schwellePct"))))
		doc.index_anteil_pct = max(0, min(100, flt(i.get("anteilPct") if i.get("anteilPct") not in (None, "") else 100)))
		doc.index_nur_erhoehung = 1 if i.get("nurErhoehung") in (True, 1, "1", "true") else 0
	if has("umsatz"):
		u = d.get("umsatz") or {}
		anteil = flt(u.get("anteil"))
		doc.umsatz_anteil = anteil / 100 if anteil > 0.5 else anteil
		doc.umsatz_erloes_ct = flt(u.get("erloesCtKwh"))
		doc.umsatz_mindest_jahr = flt(u.get("mindestJahr"))
	# Pflichtangaben
	if len(doc.bezeichnung or "") < 3:
		ungueltig("Bitte geben Sie eine Bezeichnung an (mind. 3 Zeichen).")
	if not doc.land or not doc.modell or not doc.vertragsdatum or not cint(doc.laufzeit_jahre):
		ungueltig("Bitte Land, Pachtmodell, Vertragsdatum und Laufzeit angeben.")
	if doc.beginn and str(doc.beginn) < str(doc.vertragsdatum):
		ungueltig("Der Pachtbeginn liegt vor dem Vertragsdatum.")
	if doc.modell != "umsatz" and not flt(doc.pacht_jahr) > 0:
		ungueltig("Bitte geben Sie die Jahrespacht an.")
	if doc.modell == "indexiert" and not cint(doc.index_basis_jahr):
		ungueltig("Bitte geben Sie das Basisjahr des Index an.")
	if doc.modell == "umsatz" and (not flt(doc.umsatz_anteil) > 0 or not flt(doc.umsatz_erloes_ct) > 0 or not doc.anlage_id):
		ungueltig("Umsatzbeteiligung: Anteil, Erlös je kWh und verknüpfte Anlage angeben.")
	if doc.flaeche_id and frappe.db.get_value("Plattform Flaeche", doc.flaeche_id, "nutzer_id") != doc.eigentuemer_id:
		ungueltig("Die Fläche gehört nicht zum gewählten Eigentümer.")
	if doc.anlage_id and not frappe.db.exists("Plattform Anlage", doc.anlage_id):
		ungueltig("Anlage nicht gefunden.")


@frappe.whitelist(methods=["POST"])
def pachtvertraege(status=None, q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	filters = {"status": status} if status in L.PACHTVERTRAG_STATUS else {}
	such = v.text(q, 80)
	if such:
		filters["bezeichnung"] = ["like", f"%{such}%"]
	return [_vertrag_ausgabe(A.pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", x)), backoffice=True) for x in frappe.get_all("Plattform Pachtvertrag", filters=filters, order_by="bezeichnung asc", pluck="name", limit_page_length=500)]


@frappe.whitelist(methods=["POST"])
def pachtvertrag(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Pachtvertrag", k):
		nicht_gefunden("Pachtvertrag nicht gefunden.")
	pt = A.pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", k))
	if fin_lesen(n):
		return _vertrag_ausgabe(pt, backoffice=True)
	if pt["eigentuemerId"] != n.id:
		verboten("Dieser Pachtvertrag gehört nicht zu Ihrem Konto.")
	return _vertrag_ausgabe(pt)


@frappe.whitelist(methods=["POST"])
def pachtvertrag_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	if id:
		k = v.kennung(id)
		if not k or not frappe.db.exists("Plattform Pachtvertrag", k):
			nicht_gefunden("Pachtvertrag nicht gefunden.")
		doc = frappe.get_doc("Plattform Pachtvertrag", k)
		_vertrag_setzen(doc, d, False)
		doc.save(ignore_permissions=True)
		protokoll(n, "pachtvertrag_geaendert", "pachtvertrag", doc.name, f"Pachtvertrag geändert: {', '.join(d)}"[:280])
	else:
		doc = frappe.new_doc("Plattform Pachtvertrag")
		_vertrag_setzen(doc, d, True)
		doc.insert(ignore_permissions=True)
		protokoll(n, "pachtvertrag_angelegt", "pachtvertrag", doc.name, f"Pachtvertrag angelegt: {doc.bezeichnung}")
	return _vertrag_ausgabe(A.pachtvertrag_dict(doc), backoffice=True)


@frappe.whitelist(methods=["POST"])
def pacht_auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	konten = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": ["in", ["flaeche", "landwirt"]], "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0))
	eig = []
	for k in konten:
		x = frappe.db.get_value("Plattform Konto", k, ["name", "email", "aktiv"], as_dict=True)
		if x and cint(x.aktiv):
			eig.append({"id": x.name, "name": name_von(x.name), "email": x.email})
	return {
		"eigentuemer": sorted(eig, key=lambda x: x["name"]),
		"flaechen": [{"id": f.name, "bezeichnung": f.bezeichnung, "nutzerId": f.nutzer_id, "ha": flt(f.ha), "land": f.land} for f in frappe.get_all("Plattform Flaeche", filters={"nutzer_id": ["is", "set"]}, fields=["name", "bezeichnung", "nutzer_id", "ha", "land"], limit_page_length=0)],
		"anlagen": [{"id": a.name, "name": a.titel, "land": a.land, "kwp": flt(a.kwp)} for a in frappe.get_all("Plattform Anlage", fields=["name", "titel", "land", "kwp"], limit_page_length=0)],
		"steuervorlagen": [{"id": k, "label": s[3], "land": s[0]} for k, s in T.STEUERVORLAGEN.items()],
		"gesellschaften": [{"id": A.OEKOINVEST_ID, "name": A.einstellungen()["firma"], "spv": False}],
	}


# ---------------------------------------------------------------- Klärfälle


def _klaerfall_json(k):
	return {
		"id": k.name, "art": k.art, "artLabel": L.ABRECHNUNG_ARTEN.get(k.art, {}).get("label", k.art), "schluessel": k.schluessel, "bezugText": k.bezug_text, "gruende": aus_json(k.gruende, []) or [],
		"status": k.status, "statusLabel": L.KLAERFALL_STATUS.get(k.status, k.status), "anzahl": cint(k.anzahl), "erstelltAm": iso(k.creation), "zuletztAm": iso(k.zuletzt_am), "kommentar": k.kommentar or "",
		"bezug": {"pachtvertragId": k.pachtvertrag_id, "anlageId": k.anlage_id, "provisionId": k.provision_id, "monat": k.monat},
	}


@frappe.whitelist(methods=["POST"])
def klaerfaelle(status="offen", als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	filters = {} if status == "alle" else {"status": status if status in L.KLAERFALL_STATUS else "offen"}
	return [_klaerfall_json(frappe.get_doc("Plattform Klaerfall", x)) for x in frappe.get_all("Plattform Klaerfall", filters=filters, order_by="modified desc", pluck="name", limit_page_length=300)]


@frappe.whitelist(methods=["POST"])
def klaerfall_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Klaerfall", k):
		nicht_gefunden("Klärfall nicht gefunden.")
	doc = frappe.get_doc("Plattform Klaerfall", k)
	if doc.status != "offen":
		konflikt("Der Klärfall ist bereits abgeschlossen.")
	if d.get("aktion") not in ("erledigt", "verworfen"):
		ungueltig("Unbekannte Aktion.")
	text = v.mehrzeilig(d.get("kommentar"), 1000)
	if len(text) < 3:
		ungueltig("Bitte kurz begründen (z. B. „Monatswert nachgetragen“).")
	doc.db_set({"status": d["aktion"], "kommentar": text, "erledigt_am": now_datetime(), "erledigt_von": n.id})
	protokoll(n, f"klaerfall_{d['aktion']}", "klaerfall", doc.name, f"{doc.bezug_text}: {text}"[:280])
	return _klaerfall_json(frappe.get_doc("Plattform Klaerfall", k))


# ---------------------------------------------------------------- Zahlungsvorschlag und SEPA


def _zahlungslauf_json(z):
	return {"id": z.name, "am": iso(z.creation), "ausfuehrungAm": str(z.ausfuehrung_am), "gesellschaftId": z.gesellschaft_id, "gesellschaft": A.gesellschaft(z.gesellschaft_id)["name"], "anzahl": cint(z.anzahl), "summe": flt(z.summe), "belegIds": aus_json(z.belege, []) or [], "sha256": z.sha256, "vonId": z.von_id, "vonName": name_von(z.von_id) if z.von_id else "", "status": z.status}


@frappe.whitelist(methods=["POST"])
def zahlungsvorschlag(bis=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	stichtag = bis if L.ist_datum(bis) else L.plus_tage(L.heute(), 14)
	gruppen = {}
	for x in frappe.get_all(DT, filters={"art": "pacht", "status": "offen", "faellig_am": ["<=", stichtag]}, pluck="name", limit_page_length=0):
		b = A.beleg_dict(frappe.get_doc(DT, x))
		k = A.kyc_auszahlung(b.get("empfaengerId"), (b.get("bezug") or {}).get("flaecheId"))
		gid = b.get("gesellschaftId") or A.OEKOINVEST_ID
		g = gruppen.setdefault(f"{gid}|{b.get('empfaengerId')}", {"kontoId": b.get("empfaengerId"), "empfaenger": (b.get("partei") or {}).get("name", ""), "gesellschaftId": gid, "gesellschaft": A.gesellschaft(gid)["name"], "ibanMaskiert": S.iban_maskieren(k["iban"]), "kycStatus": k["status"], "belege": [], "summe": 0, "ok": True, "gruende": []})
		g["belege"].append({"id": b["id"], "nummer": b["nummer"], "zeitraum": b["zeitraum"], "faelligAm": b["faelligAm"], "brutto": b["brutto"], "ok": k["ok"], "gruende": k["gruende"], "bezugText": b.get("bezugText", "")})
		g["summe"] = L.rund2(g["summe"] + b["brutto"])
		if not k["ok"]:
			g["ok"] = False
			g["gruende"] = list(dict.fromkeys(g["gruende"] + k["gruende"]))
	eintraege = sorted(gruppen.values(), key=lambda e: (not e["ok"], e["empfaenger"]))
	return {
		"bis": stichtag, "eintraege": eintraege, "summeFrei": L.summe([e for e in eintraege if e["ok"]], "summe"), "summeGesperrt": L.summe([e for e in eintraege if not e["ok"]], "summe"),
		"auftraggeber": [{"gesellschaftId": gid, "name": A.gesellschaft(gid)["name"], "ibanMaskiert": S.iban_maskieren(A.gesellschaft(gid)["iban"]), "ibanOk": S.iban_pruefen(A.gesellschaft(gid)["iban"]), "beispiel": False} for gid in dict.fromkeys(e["gesellschaftId"] for e in eintraege)],
	}


@frappe.whitelist(methods=["POST"])
def sepa_export(ids=None, ausfuehrungAm=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	liste = list(dict.fromkeys(v.kennung(i) for i in (aus_json(ids, []) or [])[:500] if v.kennung(i)))
	if not liste:
		ungueltig("Bitte wählen Sie mindestens eine Gutschrift.")
	heute = L.heute()
	datum = ausfuehrungAm if L.ist_datum(ausfuehrungAm) else L.plus_tage(heute, 1)
	if datum < heute:
		ungueltig("Das Ausführungsdatum liegt in der Vergangenheit.")
	gesperrt, zahlungen, belege = [], [], []
	for x in liste:
		if not frappe.db.exists(DT, x):
			nicht_gefunden("Gutschrift nicht gefunden.")
		doc = frappe.get_doc(DT, x, for_update=True)
		b = A.beleg_dict(doc)
		if b["art"] != "pacht":
			nicht_gefunden("Gutschrift nicht gefunden.")
		if b["status"] != "offen":
			konflikt(f"{b['nummer']} ist nicht offen.")
		k = A.kyc_auszahlung(b.get("empfaengerId"), (b.get("bezug") or {}).get("flaecheId"))
		if not k["ok"]:
			gesperrt.append(f"{b['nummer']} ({(b.get('partei') or {}).get('name', '')}): {' '.join(k['gruende'])}")
			continue
		belege.append(b)
		zahlungen.append({"endToEndId": b["nummer"], "betrag": b["brutto"], "name": k["kontoinhaber"] or (b.get("partei") or {}).get("name"), "iban": k["iban"], "bic": k["bic"], "verwendungszweck": f"Gutschrift {b['nummer']} {b.get('bezugText', '')}"})
	if gesperrt:
		konflikt(f"Keine Auszahlung ohne abgeschlossene Verifizierung (KYC) und geprüfte Bankverbindung: {' · '.join(gesperrt)}")
	gids = list(dict.fromkeys(b.get("gesellschaftId") or A.OEKOINVEST_ID for b in belege))
	if len(gids) > 1:
		ungueltig("Die Gutschriften stammen von verschiedenen Gesellschaften – bitte je Gesellschaft (Auftraggeberkonto) eine SEPA-Datei erzeugen.")
	ges = A.gesellschaft(gids[0])
	if not S.iban_pruefen(ges["iban"]):
		ungueltig(f"Die IBAN der zahlenden Gesellschaft ({ges['name']}) fehlt oder ist ungültig – bitte im Gesellschaftsverzeichnis bzw. in den Finanzeinstellungen pflegen.")
	zl = frappe.get_doc({"doctype": "Plattform Zahlungslauf", "gesellschaft_id": ges["id"], "ausfuehrung_am": datum, "anzahl": len(zahlungen), "summe": L.summe(zahlungen, "betrag"), "status": "erstellt", "von_id": n.id, "belege": als_json([b["id"] for b in belege])}).insert(ignore_permissions=True)
	xml = S.pain001(zl.name, datum, {"name": ges["name"], "iban": ges["iban"], "bic": ges["bic"]}, zahlungen)
	zl.db_set("sha256", hashlib.sha256(xml.encode("utf-8")).hexdigest())
	for b in belege:
		frappe.db.set_value(DT, b["id"], {"status": "angewiesen", "zahlungslauf_id": zl.name})
	protokoll(n, "sepa_export", "zahlungslauf", zl.name, f"SEPA-Datei {zl.name}: {len(zahlungen)} Zahlungen, {L.euro(zl.summe)}", ip or "")
	return {"xml": xml, "dateiname": f"SEPA-{zl.name}-{datum}.xml", "zahlungslauf": _zahlungslauf_json(frappe.get_doc("Plattform Zahlungslauf", zl.name))}


@frappe.whitelist(methods=["POST"])
def zahlungslauf_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Zahlungslauf", k):
		nicht_gefunden("Zahlungslauf nicht gefunden.")
	zl = frappe.get_doc("Plattform Zahlungslauf", k)
	if zl.status != "erstellt":
		konflikt("Der Zahlungslauf ist bereits abgeschlossen.")
	belege = [x for x in (aus_json(zl.belege, []) or []) if frappe.db.get_value(DT, x, "status") == "angewiesen"]
	if d.get("aktion") == "bestaetigen":
		datum = min(str(zl.ausfuehrung_am), L.heute())
		for x in belege:
			frappe.db.set_value(DT, x, {"status": "bezahlt", "bezahlt_am": datum})
			A.beleg_melden(A.beleg_dict(frappe.get_doc(DT, x)), "bezahlt")
		zl.db_set({"status": "ausgefuehrt", "abgeschlossen_am": now_datetime()})
	elif d.get("aktion") == "verwerfen":
		for x in belege:
			frappe.db.set_value(DT, x, {"status": "offen", "zahlungslauf_id": None})
		zl.db_set({"status": "verworfen", "abgeschlossen_am": now_datetime()})
	else:
		ungueltig("Unbekannte Aktion.")
	protokoll(n, f"zahlungslauf_{d.get('aktion')}", "zahlungslauf", zl.name, f"{zl.name}: {d.get('aktion')} ({len(belege)} Gutschriften)")
	return _zahlungslauf_json(frappe.get_doc("Plattform Zahlungslauf", k))


# ---------------------------------------------------------------- Index (VPI)


@frappe.whitelist(methods=["POST"])
def vpi_werte(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	reihen = {k: {"land": r[0], "label": r[1], "quelle": r[2]} for k, r in L.INDEX_REIHEN.items()}
	return {"reihen": reihen, "werte": sorted(A.vpi_tabelle(), key=lambda x: (x["reihe"], x["jahr"]))}


@frappe.whitelist(methods=["POST"])
def vpi_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	reihe, jahr = d.get("reihe"), cint(d.get("jahr"))
	try:
		wert = float(str(d.get("wert")).replace(",", "."))
	except (TypeError, ValueError):
		wert = 0
	if reihe not in L.INDEX_REIHEN or not (1990 <= jahr <= 2100) or not (1 <= wert <= 1000):
		ungueltig("Bitte Reihe, Jahr und Indexwert (Jahresdurchschnitt) angeben.")
	name = f"{reihe}-{jahr}"
	quelle = v.text(d.get("quelle"), 200) or L.INDEX_REIHEN[reihe][2]
	if frappe.db.exists("Plattform VPI Wert", name):
		frappe.db.set_value("Plattform VPI Wert", name, {"wert": wert, "quelle": quelle})
	else:
		frappe.get_doc({"doctype": "Plattform VPI Wert", "reihe": reihe, "jahr": jahr, "wert": wert, "quelle": quelle}).insert(ignore_permissions=True)
	protokoll(n, "vpi", "finanzen", name, f"Indexwert {reihe} {jahr} = {wert}")
	return {"reihe": reihe, "jahr": jahr, "wert": wert, "quelle": quelle}


# ---------------------------------------------------------------- Anlagenbuchhaltung


@frappe.whitelist(methods=["POST"])
def anlagen(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	jahr = int(L.heute()[:4])
	aus = []
	for a in frappe.get_all("Plattform Anlage", fields=["name", "titel", "typ", "land", "kwp", "inbetriebnahme", "eigentuemer", "eigentuemer_id"], limit_page_length=0):
		ak = frappe.db.get_value("Plattform Anlagen Aktivierung", {"anlage_id": a.name}, ["name", "anschaffungswert", "nutzungsdauer_jahre", "inbetriebnahme", "regel", "erpnext_asset", "bemerkung"], as_dict=True)
		regel = (ak or {}).get("regel") or (a.land if a.land in ("AT", "DE", "CH") else "AT")
		plan = L.afa_plan(ak.anschaffungswert, ak.nutzungsdauer_jahre, str(ak.inbetriebnahme), regel) if ak else []
		ges = A.anlage_gesellschaft(a)
		aus.append({
			"anlageId": a.name, "name": a.titel, "typ": a.typ, "land": a.land, "kwp": flt(a.kwp), "inbetriebnahme": str(a.inbetriebnahme or ""),
			"gesellschaftId": ges["id"], "gesellschaft": ges["name"], "erpnextCompany": ges["erpnextCompany"], "aktiviert": bool(ak),
			"asset": {"id": ak.name, "anschaffungswert": flt(ak.anschaffungswert), "nutzungsdauerJahre": cint(ak.nutzungsdauer_jahre), "inbetriebnahme": str(ak.inbetriebnahme), "regel": ak.regel, "erpnextAsset": ak.erpnext_asset, "bemerkung": ak.bemerkung or ""} if ak else None,
			"regel": regel, "vorschlag": {"nutzungsdauerJahre": L.AFA_NUTZUNGSDAUER["speicher" if a.typ == "speicher" else "pv"], "regel": regel}, "plan": plan,
			"afaJahr": next((p["afa"] for p in plan if p["jahr"] == jahr), 0), "buchwert": next((p["restbuchwert"] for p in reversed(plan) if p["jahr"] <= jahr), flt(ak.anschaffungswert)) if ak else None,
		})
	return aus


@frappe.whitelist(methods=["POST"])
def anlage_speichern(anlageId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(anlageId)
	if not k or not frappe.db.exists("Plattform Anlage", k):
		nicht_gefunden("Anlage nicht gefunden.")
	a = frappe.get_doc("Plattform Anlage", k)
	w, nd = flt(d.get("anschaffungswert")), cint(d.get("nutzungsdauerJahre"))
	ib = d.get("inbetriebnahme") if L.ist_datum(d.get("inbetriebnahme")) else (str(a.inbetriebnahme) if a.inbetriebnahme else "")
	if not w > 0 or not 1 <= nd <= 50 or not ib:
		ungueltig("Bitte Anschaffungswert, Nutzungsdauer und Inbetriebnahme angeben.")
	name = frappe.db.get_value("Plattform Anlagen Aktivierung", {"anlage_id": k}, "name")
	doc = frappe.get_doc("Plattform Anlagen Aktivierung", name) if name else frappe.new_doc("Plattform Anlagen Aktivierung")
	doc.update({"anlage_id": k, "gesellschaft_id": A.anlage_gesellschaft(a.as_dict())["id"], "anschaffungswert": w, "nutzungsdauer_jahre": nd, "inbetriebnahme": ib, "regel": d.get("regel") if d.get("regel") in ("AT", "DE", "CH") else (a.land or "AT"), "bemerkung": v.text(d.get("bemerkung"), 200)})
	doc.save(ignore_permissions=True)
	if E.aktiv() and not doc.erpnext_asset:
		try:
			doc.db_set("erpnext_asset", E.asset_anlegen({"anschaffungswert": w, "nutzungsdauerJahre": nd, "inbetriebnahme": ib}, {"id": a.name, "name": a.titel, "typ": a.typ, "eigentuemer": a.get("eigentuemer"), "eigentuemer_id": a.get("eigentuemer_id")}))
		except Exception as fehler:  # noqa: BLE001
			frappe.log_error(title="ÖkoInvest Finanzen: ERPNext Asset", message=frappe.get_traceback())
			ungueltig(f"Aktivierung gespeichert, ERPNext-Asset nicht angelegt: {str(fehler)[:200]}")
	protokoll(n, "anlage_aktiviert", "anlage", k, f"AfA: {L.euro(w)} über {nd} Jahre ab {ib}")
	return {"id": doc.name, "anlageId": k, "anschaffungswert": w, "nutzungsdauerJahre": nd, "inbetriebnahme": ib, "regel": doc.regel, "erpnextAsset": doc.erpnext_asset}


# ---------------------------------------------------------------- Projektcontrolling (Ist-Kosten Entwicklung)


def _entwicklung_lesen(n):
	if not n:
		nicht_angemeldet()
	if not (fin_lesen(n) or (ist_admin(n) and stufe(n, "entwicklung") >= 1)):
		verboten("Nur für das Backoffice (Buchhaltung/Projektentwicklung).")


def _kostentraeger():
	aus = [{"id": k.name, "bezeichnung": k.bezeichnung, "mwp": flt(k.mwp) or None, "budget": flt(k.budget) or None, "entwicklungId": k.entwicklung_id} for k in frappe.get_all("Plattform Kostentraeger", fields=["name", "bezeichnung", "mwp", "budget", "entwicklung_id"], limit_page_length=0)]
	# Entwicklungsprojekte des Teams Projektentwicklung (DocType-Name tolerant) – vor Einsatz gegen den Stand prüfen
	for dt in ("Plattform Entwicklungsprojekt", "Plattform Entwicklung Projekt"):
		if frappe.db.exists("DocType", dt):
			meta = frappe.get_meta(dt)
			felder = ["name"] + [f for f in ("titel", "mwp", "budget", "budget_gesamt") if meta.has_field(f)]
			for p in frappe.get_all(dt, fields=felder, limit_page_length=0):
				if not any(x["id"] == p.name or x.get("entwicklungId") == p.name for x in aus):
					aus.append({"id": p.name, "bezeichnung": p.get("titel") or p.name, "mwp": flt(p.get("mwp")) or None, "budget": flt(p.get("budget_gesamt") or p.get("budget")) or None, "entwicklungId": p.name})
	return aus


def _ist(kt):
	quelle = "plattform"
	pos = [{"id": p.name, "kostenart": p.kostenart, "betrag": flt(p.betrag), "datum": str(p.datum), "beleg": p.beleg or "", "beschreibung": p.beschreibung or "", "quelle": p.quelle or "manuell"} for p in frappe.get_all("Plattform Projektkosten", filters={"projekt_id": ["in", [kt["id"], kt.get("entwicklungId") or kt["id"]]]}, fields=["name", "kostenart", "betrag", "datum", "beleg", "beschreibung", "quelle"], limit_page_length=0)]
	if E.aktiv():
		r = E.projekt_ist(kt.get("entwicklungId") or kt["id"])
		if r:
			pos += r["positionen"]
			quelle = "erpnext"
	return {"projektId": kt["id"], "bezeichnung": kt["bezeichnung"], "mwp": kt.get("mwp"), "quelle": quelle, **L.budget_vergleich(pos, kt.get("budget"), kt.get("mwp")), "positionen": sorted(pos, key=lambda x: x["datum"], reverse=True), "kostenarten": L.KOSTENARTEN}


@frappe.whitelist(methods=["POST"])
def entwicklung_kosten(als_benutzer=None):
	n = nutzer(als_benutzer)
	_entwicklung_lesen(n)
	aus = []
	for kt in _kostentraeger():
		i = _ist(kt)
		i["anzahl"] = len(i.pop("positionen"))
		aus.append(i)
	return aus


@frappe.whitelist(methods=["POST"])
def entwicklung_ist(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_entwicklung_lesen(n)
	k = v.kennung(projektId) or v.text(projektId, 40)
	kt = next((x for x in _kostentraeger() if k in (x["id"], x.get("entwicklungId"))), None)
	if not kt:
		return {"projektId": k, "quelle": "plattform", **L.budget_vergleich([], None, None), "positionen": []}
	return _ist(kt)


@frappe.whitelist(methods=["POST"])
def entwicklung_kosten_buchen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	kt = next((x for x in _kostentraeger() if d.get("projektId") in (x["id"], x.get("entwicklungId"))), None)
	if not kt:
		ungueltig("Kostenträger bzw. Entwicklungsprojekt nicht gefunden.")
	betrag = flt(str(d.get("betrag") or "0").replace(",", "."))
	if not betrag:
		ungueltig("Bitte einen Betrag angeben (Gutschriften negativ).")
	datum = d.get("datum") if L.ist_datum(d.get("datum")) else L.heute()
	doc = frappe.get_doc({"doctype": "Plattform Projektkosten", "projekt_id": kt["id"], "kostenart": d.get("kostenart") if d.get("kostenart") in L.KOSTENARTEN else "sonstiges", "betrag": betrag, "datum": getdate(datum), "beleg": v.text(d.get("beleg"), 60), "beschreibung": v.text(d.get("beschreibung"), 200), "quelle": "manuell", "von_id": n.id}).insert(ignore_permissions=True)
	protokoll(n, "projektkosten", "entwicklung", kt["id"], f"{L.KOSTENARTEN.get(doc.kostenart)}: {L.euro(betrag)} ({doc.beleg or 'ohne Beleg'})")
	return {"id": doc.name, "projektId": kt["id"], "kostenart": doc.kostenart, "betrag": betrag, "datum": datum, "beleg": doc.beleg, "beschreibung": doc.beschreibung, "quelle": "manuell"}
