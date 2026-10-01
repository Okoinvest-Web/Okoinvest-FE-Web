# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP5 „Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check, Lieferantenpflichten“ –
# Frappe-API (Vertrag: docs/EG-SCHNITTSTELLEN.md Abschnitt 4, Ergänzungen docs/eg/gruendung.md; Referenz:
# src/lib/plattform/backend/demo/eg-gruendung.js). Regeln: plattform/eg_gruendung_kern.py (= src/lib/plattform/eg/*.js).
#
# Rechte (jede Methode prüft den Aufrufer per kern.nutzer UND den Kontext):
#   Backoffice  – Rolle admin mit Bereich „eg“ (rechte.stufe): lesen ≥ 1 alle Aufträge, schreiben = 2 Angebote/Schritte/Importe
#   Auftraggeber – Konto, das den Auftrag angefragt hat (eigener Auftrag, Annahme, eigene Schritte)
#   Organe      – Kontext-Rollen je Gemeinschaft (eg_stamm.zugriff / eg_stamm_kern.eg_stufe): gv, organe_statuten, buchhaltung …
#   sonst       – 404. Kein allow_guest.
# Fremde Entitäten (Gemeinschaft anlegen, Organe, Mitglieder, Tarif, Auflösungsstatus) schreibt der Website-Adapter über die
# WP1-/WP4-Methoden (backend/frappe/eg-gruendung.js: Vorprüfung hier → WP1/WP4 → Ergebnis hier speichern). Einzige Ausnahme:
# die Wirkung erledigter Schritte (Felder/Status der Gemeinschaft) – mit den WP1-Regeln in derselben Transaktion (_wirkung),
# damit auch vom Auftraggeber erledigte Schritte wirken (Systemkonto, protokolliert). Ausgabe camelCase.


import frappe
from frappe.utils import now_datetime, nowdate

from oekoinvest_app.plattform import eg_gruendung_kern as K
from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import mitglied_kern as MK
from oekoinvest_app.plattform.api import eg_stamm as STAMM
from oekoinvest_app.plattform.kern import (
	als_json,
	aus_json,
	ist_admin,
	jetzt_iso,
	konflikt,
	nicht_angemeldet,
	nicht_gefunden,
	nutzer,
	protokoll,
	sha256,
	ungueltig,
	verboten,
)
from oekoinvest_app.plattform.rechte import stufe as bo_stufe

DT_A, DT_I, DT_F, DT_D = "Plattform EG Gruendungsauftrag", "Plattform EG Import", "Plattform EG Foerdercheck", "Plattform EG Dokument"
DT_V, DT_S, DT_B, DT_BT, DT_VA = "Plattform EG Versammlung", "Plattform EG Versammlung Stimme", "Plattform EG Beschluss", "Plattform EG Beitrag", "Plattform EG Vereinsakte"
_SCHRITT_FELDER = {"schluessel": "schluessel", "reihenfolge": "reihenfolge", "label": "label", "abschnitt": "abschnitt", "phase": "phase", "zustaendig": "zustaendig", "pflicht": "pflicht", "status": "status", "gestartetAm": "gestartet_am", "datum": "datum", "wert": "wert", "notiz": "notiz", "fristManuell": "frist_manuell", "vonId": "von_id"}


def _heute():
	return nowdate()


def _daten(x):
	return aus_json(x, {}) or {} if not isinstance(x, dict) else x


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.GrFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))
	except MK.MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _bo_lesen(n):
	return bool(n) and ist_admin(n) and bo_stufe(n, "eg") >= 1


def _bo_schreiben(n):
	return bool(n) and ist_admin(n) and bo_stufe(n, "eg") >= 2


def _vid(n):
	return None if (not n or n.get("system")) else n.get("id")


def _melden(konto_id, titel, text, link, objekt_id, mail=False):
	if not konto_id:
		return
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	anlegen(konto_id, "status", titel, text, link, "eg_gruendungsauftrag", objekt_id, mail=mail)


def _gemeinschaft(gid):
	if not gid or not frappe.db.exists(STAMM.DT["gemeinschaft"], gid):
		return None
	return STAMM.aus_doc("gemeinschaft", frappe.get_doc(STAMM.DT["gemeinschaft"], gid))


def _mit_kennzahlen(g):
	if not g:
		return None
	daten = STAMM.gemeinschaft_daten(g["id"])
	return {**g, "kennzahlen": STAMM.K.kennzahlen(g, daten)}, daten


# ================================================================ Auftrag Doc ↔ dict


def _auftrag(doc):
	d = aus_json(doc.daten, {}) or {}
	schritte = []
	for r in doc.get("schritte") or []:
		s = {k: r.get(f) for k, f in _SCHRITT_FELDER.items()}
		s["pflicht"] = bool(s["pflicht"])
		for k in ("gestartetAm", "datum", "fristManuell"):
			s[k] = str(s[k]) if s[k] else ""
		for k in ("wert", "notiz"):
			s[k] = s[k] or ""
		s["nachweise"] = aus_json(r.get("nachweise"), []) or []
		s["reihenfolgeVorlage"] = s["reihenfolge"]
		schritte.append(s)
	return {**d, "id": doc.name, "arbeitsname": doc.arbeitsname, "paket": doc.paket, "modell": doc.modell, "status": doc.status, "auftraggeberKontoId": doc.auftraggeber, "gemeinschaftId": doc.gemeinschaft or None,
		"plz": doc.plz or "", "ort": doc.ort or "", "auftragAm": str(doc.auftrag_am or ""), "stichtag": str(doc.stichtag or ""), "signaturId": doc.signatur_id or None, "bearbeiterId": doc.bearbeiter or None,
		"schritte": schritte, "erstelltAm": str(doc.creation or ""), "geaendertAm": str(doc.modified or "")}


_SPALTEN = {"id", "arbeitsname", "paket", "modell", "status", "auftraggeberKontoId", "gemeinschaftId", "plz", "ort", "auftragAm", "stichtag", "signaturId", "bearbeiterId", "schritte", "erstelltAm", "geaendertAm"}


def _auftrag_speichern(a, doc=None):
	doc = doc or frappe.new_doc(DT_A)
	doc.arbeitsname, doc.paket, doc.modell, doc.status = a["arbeitsname"], a["paket"], a.get("modell"), a["status"]
	doc.auftraggeber = a.get("auftraggeberKontoId") or None
	doc.gemeinschaft = a.get("gemeinschaftId") or None
	doc.plz, doc.ort = a.get("plz") or "", a.get("ort") or ""
	doc.auftrag_am = a.get("auftragAm") or None
	doc.stichtag = a.get("stichtag") or None
	doc.signatur_id = a.get("signaturId") or ""
	doc.bearbeiter = a.get("bearbeiterId") or None
	ang = a.get("angebot") or {}
	doc.angebot_netto = ang.get("betragNetto") or 0
	doc.angebot_gueltig_bis = ang.get("gueltigBis") or None
	doc.set("schritte", [{**{f: s.get(k) for k, f in _SCHRITT_FELDER.items()}, "pflicht": 1 if s.get("pflicht") else 0, "gestartet_am": s.get("gestartetAm") or None, "datum": s.get("datum") or None, "frist_manuell": s.get("fristManuell") or None, "nachweise": als_json(s.get("nachweise") or [])} for s in a.get("schritte") or []])
	doc.daten = als_json({k: v for k, v in a.items() if k not in _SPALTEN})
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc


def _rolle(n, a):
	if not n:
		return None
	if _bo_lesen(n):
		return "backoffice"
	if a.get("auftraggeberKontoId") and a["auftraggeberKontoId"] == n.get("id"):
		return "auftraggeber"
	g = _gemeinschaft(a.get("gemeinschaftId"))
	if g and STAMM.K.eg_stufe(STAMM._kontext(n, g), "gruendungsauftrag") >= 1:
		return "organ"
	return None


def _laden(n, id_):
	if not n:
		nicht_angemeldet()
	if not id_ or not frappe.db.exists(DT_A, str(id_)):
		nicht_gefunden("Auftrag nicht gefunden.")
	doc = frappe.get_doc(DT_A, str(id_))
	a = _auftrag(doc)
	r = _rolle(n, a)
	if not r:
		nicht_gefunden("Auftrag nicht gefunden.")
	return doc, a, r


def _als_auftraggeber(n, a, rolle):
	if rolle == "auftraggeber":
		return True
	if rolle == "organ":
		return STAMM.K.eg_stufe(STAMM._kontext(n, _gemeinschaft(a["gemeinschaftId"])), "gruendungsauftrag") >= 2
	return False


def _vl(a, n, text, oeffentlich=True):
	a.setdefault("verlauf", []).append({"am": jetzt_iso(), "von": _vid(n), "text": str(text)[:1000], "oeffentlich": oeffentlich})
	a["verlauf"] = a["verlauf"][-300:]


def _signatur(a):
	sid = a.get("signaturId")
	if not sid:
		return None
	st = frappe.db.get_value("Plattform Signaturvorgang", sid, "status") if frappe.db.exists("Plattform Signaturvorgang", sid) else "unbekannt"
	lab = {"laufend": "Zur Unterschrift", "abgeschlossen": "Unterschrieben", "abgelehnt": "Abgelehnt", "widerrufen": "Widerrufen", "abgelaufen": "Frist abgelaufen"}.get(st, st)
	return {"id": sid, "status": st, "statusLabel": lab, "link": f"/portal/signatur/{sid}"}


def _dokument_kurz(doc):
	d = aus_json(doc.daten, {}) or {}
	return {"id": doc.name, "vorlage": doc.vorlage, "titel": doc.titel, "version": doc.version, "sha256": doc.sha256, "stand": str(doc.stand or ""), "fehlend": len(d.get("fehlend") or []), "erstelltAm": str(doc.creation), "gemeinschaftId": doc.gemeinschaft or "", "auftragId": doc.auftrag or ""}


def _detail(n, a, rolle):
	h = _heute()
	bo = rolle == "backoffice"
	g0 = _gemeinschaft(a.get("gemeinschaftId"))
	g, gdaten = _mit_kennzahlen(g0) if g0 else (None, None)
	nb = STAMM._netzbetreiber_liste()
	organe = []
	if g:
		for o in gdaten["organe"]:
			organe.append({**o, "funktionLabel": (M.ORGAN_FUNKTIONEN.get(o["funktion"]) or {}).get("label", o["funktion"]), "personName": o.get("name") or "", "wirksam": STAMM.K.organ_wirksam(o, h)})
	schritte = K.schritte_anreichern(a["schritte"], a, {"heute": h})
	hilfen = []
	for s in schritte:
		if s["hilfe"] in ("vereinsanzeige", "finanzamt", "ust", "elabg", "ebutilities", "betreibervertrag", "eda_zugang", "rechtsform") and s["hilfe"] not in hilfen:
			hilfen.append(s["hilfe"])
	ctx = {"gemeinschaft": g, "netzbetreiber": nb, "organe": organe, "auftrag": a, "zaehlpunkte": (g or {}).get("kennzahlen", {}).get("zaehlpunkteAktiv", 0)}
	dfilt = {"auftrag": a["id"]}
	dok_namen = set(frappe.get_all(DT_D, filters=dfilt, pluck="name"))
	if g:
		dok_namen |= set(frappe.get_all(DT_D, filters={"gemeinschaft": g["id"]}, pluck="name"))
	dokumente = sorted([_dokument_kurz(frappe.get_doc(DT_D, x)) for x in dok_namen], key=lambda x: x["erstelltAm"], reverse=True)
	gdok = [{"vorlage": x["vorlage"], "stand": x["stand"]} for x in dokumente if x["gemeinschaftId"]]
	sig = _signatur(a)
	kunde = _als_auftraggeber(n, a, rolle)
	aktionen = []
	if bo and _bo_schreiben(n):
		for k, u in K.AUFTRAG_UEBERGAENGE.items():
			if a["status"] in u["von"] and k not in ("annehmen", "ablehnen"):
				aktionen.append(k)
		if a["status"] == "angebot" and a.get("angebot") and (sig or {}).get("status") not in ("laufend", "abgeschlossen"):
			aktionen.append("signatur")
		if not a.get("gemeinschaftId") and a["status"] not in ("anfrage", "abgebrochen"):
			aktionen += ["gemeinschaft_anlegen", "gemeinschaft_verknuepfen"]
		aktionen += ["daten", "notiz", "schritte_aktualisieren", "statuten"]
		if a["paket"] == "wechsel":
			aktionen += ["stichtag", "probeabrechnung", "mitglieder_informieren"]
	elif kunde:
		if a["status"] == "angebot" and not a.get("signaturId"):
			aktionen.append("annehmen")
		if a["status"] == "angebot":
			aktionen.append("ablehnen")
		aktionen += ["notiz", "statuten"]
		if a["status"] == "anfrage":
			aktionen.append("daten")
	importe = []
	if g:
		for x in frappe.get_all(DT_I, filters={"gemeinschaft": g["id"]}, pluck="name"):
			importe.append(_import_kurz(frappe.get_doc(DT_I, x)))
	fc = []
	for x in frappe.get_all(DT_F, filters={"auftrag": a["id"]}, fields=["name", "creation", "daten"]):
		fc.append({"id": x.name, "erstelltAm": str(x.creation), "kennzahlen": ((aus_json(x.daten, {}) or {}).get("ergebnis") or {}).get("kennzahlen")})
	lp = K.lieferantenpflichten({"anlagen": gdaten["anlagen"], "organisator": bool((g.get("dienstleistung") or {}).get("aktiv")), "organisatorAngezeigtAm": g.get("organisatorAngezeigtAm") or "", "dokumente": gdok, "mitglieder": gdaten["mitglieder"], "tarife": gdaten["tarife"], "heute": h}) if g else None
	return {
		**a, "auftraggeberKontoId": a.get("auftraggeberKontoId") if bo else None, "kontrolle": a.get("kontrolle") if bo else ({"am": a["kontrolle"]["am"], "summe": (a["kontrolle"].get("vergleich") or {}).get("summe")} if a.get("kontrolle") else None),
		"paketLabel": K.GR_PAKETE[a["paket"]]["label"], "paketText": K.GR_PAKETE[a["paket"]]["text"], "statusLabel": K.GR_STATUS.get(a["status"], {}).get("label", a["status"]), "ton": K.GR_STATUS.get(a["status"], {}).get("ton", "neutral"),
		"modellLabel": (M.EG_MODELLE.get(a.get("modell")) or {}).get("label", a.get("modell")), "zonelevelLabel": (M.ZONELEVEL.get(str(a.get("zonelevel"))) or {}).get("label", ""), "rechtsformLabel": (M.RECHTSFORMEN.get(a.get("rechtsform")) or {}).get("label", a.get("rechtsform")),
		"schritte": schritte, "fortschritt": K.auftrag_fortschritt(a["schritte"], {"heute": h, "auftrag": a}), "hinweise": K.auftrag_hinweise(a, {"heute": h}),
		"gemeinschaft": g, "organe": organe, "organCheck": K.organ_check(g, gdaten["organe"], {"heute": h}) if g else None,
		"signatur": sig, "rolle": rolle, "aktionen": aktionen, "darfSchreiben": bo and _bo_schreiben(n), "alsAuftraggeber": kunde,
		"verlauf": [{**v, "vonName": "" if v.get("von") else "ÖkoInvest"} for v in a.get("verlauf") or [] if bo or v.get("oeffentlich")],
		"formulare": {k: K.formular_hilfe(k, ctx) for k in hilfen}, "rechtsformHilfe": K.rechtsform_empfehlung(a),
		"edaBereit": K.eda_bereit_pruefen(g, {"schritte": a["schritte"], "organisator": a.get("organisator")}),
		"umstellungsplan": K.umstellungsplan({"stichtag": a.get("stichtag"), "heute": h}) if a["paket"] == "wechsel" else None,
		"elwg": K.elwg_anpassung(g, {"mitglieder": gdaten["mitglieder"], "dokumente": gdok, "stichtag": a.get("stichtag")}) if a["paket"] == "wechsel" and g else None,
		"lieferantenpflichten": lp, "dokumente": dokumente, "vorlagen": K.vorlagen_fuer({"modell": (g or {}).get("modell") or a.get("modell"), "rechtsform": (g or {}).get("rechtsform") or a.get("rechtsform")}),
		"importe": importe, "foerderchecks": fc, "statutenEingaben": K.statuten_eingaben(a.get("statutenEingaben") or {}), "heute": h,
	}


def _kurz(a, h):
	f = K.auftrag_fortschritt(a["schritte"], {"heute": h, "auftrag": a})
	ang = a.get("angebot")
	return {"id": a["id"], "arbeitsname": a["arbeitsname"], "paket": a["paket"], "paketLabel": K.GR_PAKETE[a["paket"]]["label"], "modell": a.get("modell"), "modellKurz": (M.EG_MODELLE.get(a.get("modell")) or {}).get("kurz", a.get("modell")),
		"status": a["status"], "statusLabel": K.GR_STATUS.get(a["status"], {}).get("label", a["status"]), "ton": K.GR_STATUS.get(a["status"], {}).get("ton", "neutral"), "auftraggeberName": (a.get("auftraggeber") or {}).get("name", ""),
		"ort": a.get("ort"), "plz": a.get("plz"), "bundesland": a.get("bundesland"), "erstelltAm": a["erstelltAm"], "auftragAm": a.get("auftragAm"), "gemeinschaftId": a.get("gemeinschaftId"), "fortschritt": f,
		"angebot": {"betragNetto": ang["betragNetto"], "gueltigBis": ang["gueltigBis"], "nummer": ang.get("nummer")} if ang else None, "bearbeiterId": a.get("bearbeiterId")}


# ================================================================ Aufträge


@frappe.whitelist(methods=["POST"])
def auftraege(filter=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _daten(filter)
	h = _heute()
	sichtbar = []
	for name in frappe.get_all(DT_A, pluck="name", order_by="modified desc", limit_page_length=2000):
		a = _auftrag(frappe.get_doc(DT_A, name))
		if _rolle(n, a):
			sichtbar.append(a)
	q = str(f.get("q") or "").lower().strip()
	st, pk = f.get("status") or "", f.get("paket") or ""
	liste = [_kurz(a, h) for a in sichtbar if (not st or a["status"] == st or (st == "aktiv" and a["status"] in K.GR_AKTIV)) and (not pk or a["paket"] == pk) and (not q or q in f"{a['arbeitsname']} {(a.get('auftraggeber') or {}).get('name', '')} {a.get('ort')} {a.get('plz')} {a['id']}".lower())]
	return {"auftraege": liste, "kennzahlen": K.auftraege_kennzahlen(sichtbar, {"heute": h}) if _bo_lesen(n) else None, "backoffice": _bo_lesen(n), "darfSchreiben": _bo_schreiben(n), "pakete": K.GR_PAKETE, "status": K.GR_STATUS, "heute": h}


@frappe.whitelist(methods=["POST"])
def auftrag(id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	doc, a, rolle = _laden(n, id)
	sig = _signatur(a)
	if a["status"] == "angebot" and (sig or {}).get("status") == "abgeschlossen":
		_beauftragen(None, a, {"art": "signatur", "nachweis": f"Signaturvorgang {a['signaturId']}"})
		doc = _auftrag_speichern(a, doc)
		a = _auftrag(doc)
	return _detail(n, a, rolle)


@frappe.whitelist(methods=["POST"])
def auftrag_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = _daten(daten)
	if d.get("einwilligung") is not True and not _bo_lesen(n):
		ungueltig("Bitte bestätigen Sie die Verarbeitung Ihrer Angaben für das Angebot.")
	b = _fach(K.auftrag_bereinigen, d)
	konto = n.get("id")
	ag = {"name": " ".join(x for x in (n.get("vorname"), n.get("nachname")) if x) or n.get("email") or "", "anschrift": "", "email": n.get("email") or ""}
	if _bo_schreiben(n) and d.get("auftraggeberEmail"):
		k = frappe.db.get_value("Plattform Konto", {"email": str(d["auftraggeberEmail"]).lower().strip()}, ["name", "vorname", "nachname", "email"], as_dict=True)
		if not k:
			ungueltig("Für diese E-Mail gibt es kein Portalkonto – der Auftraggeber muss sich zuerst registrieren.")
		konto = k.name
		ag = {"name": " ".join(x for x in (k.vorname, k.nachname) if x) or k.email, "anschrift": "", "email": k.email}
	elif not _bo_lesen(n) and frappe.db.count(DT_A, {"auftraggeber": konto, "status": ["in", ["anfrage", "angebot"]]}) >= 5:
		konflikt("Sie haben bereits fünf offene Anfragen – bitte warten Sie auf unser Angebot.")
	if d.get("auftraggeberName"):
		ag["name"] = str(d["auftraggeberName"])[:160]
	if d.get("auftraggeberAnschrift"):
		ag["anschrift"] = str(d["auftraggeberAnschrift"])[:200]
	a = {**b, "paketLabel": K.GR_PAKETE[b["paket"]]["label"], "auftraggeberKontoId": konto, "auftraggeber": ag, "status": "anfrage", "angebot": None, "signaturId": None, "auftragAm": "", "annahme": None, "stichtag": "", "gemeinschaftId": None, "bearbeiterId": None, "statutenEingaben": {}, "kontrolle": None, "verlauf": []}
	_vl(a, n, "Anfrage eingegangen")
	a["schritte"] = K.schritte_erzeugen(a)
	doc = _auftrag_speichern(a)
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen

	for k in aktive_admins()[:20]:
		anlegen(k, "anfrage", f"Gründungsauftrag: {a['arbeitsname']}", f"{K.GR_PAKETE[a['paket']]['label']} · {a['plz']} {a['ort']}", f"/portal/admin/eg/gruendung/{doc.name}", "eg_gruendungsauftrag", doc.name, mail=False)
	protokoll(n, "anlegen", "eg_gruendungsauftrag", doc.name, f"Gründungsauftrag angefragt: {a['arbeitsname']}")
	a = _auftrag(doc)
	return _detail(n, a, _rolle(n, a))


def _beauftragen(n, a, annahme):
	a["status"] = _fach(K.auftrag_uebergang, a, "beauftragt_manuell" if annahme["art"] == "manuell" else "annehmen", {"heute": _heute()})
	a["auftragAm"] = annahme.get("am") or _heute()
	a["annahme"] = {**annahme, "am": a["auftragAm"]}
	a["schritte"] = K.schritte_erzeugen(a, {"vorhanden": a["schritte"], "gemeinschaft": _gemeinschaft(a.get("gemeinschaftId"))})
	a["status"] = K.auftrag_status_aus_schritten(a, a["schritte"])
	_vl(a, n, "Auftrag elektronisch unterschrieben – die Gründung startet" if annahme["art"] == "signatur" else f"Auftrag erteilt ({annahme.get('nachweis') or 'manuell'})")
	if a.get("auftraggeberKontoId") and a["auftraggeberKontoId"] != (n or {}).get("id"):
		_melden(a["auftraggeberKontoId"], f"Auftrag „{a['arbeitsname']}“ erteilt", "Vielen Dank – Ihr Gründungsfahrplan mit Fristen steht im Portal.", f"/portal/eg/gruendung/{a['id']}", a["id"], mail=True)


@frappe.whitelist(methods=["POST"])
def auftrag_aktion(id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	doc, a, rolle = _laden(n, id)
	d = _daten(daten)
	aktion = str(d.get("aktion") or "")
	bo = rolle == "backoffice"
	bo_w = bo and _bo_schreiben(n)
	kunde = _als_auftraggeber(n, a, rolle)

	def nur_bo():
		if not bo_w:
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Energiegemeinschaften“ kein Schreiben." if bo else "Diese Aktion führt ÖkoInvest aus.")

	g = _gemeinschaft(a.get("gemeinschaftId"))
	# Vorprüfung der Aktionen, deren Wirkung der Website-Adapter über andere Pakete ausführt (Signatur, WP1, WP4)
	if aktion == "signatur":
		nur_bo()
		if a["status"] != "angebot" or not a.get("angebot"):
			konflikt("Unterschrieben wird ein vorliegendes Angebot.")
		if not a.get("auftraggeberKontoId"):
			konflikt("Der Auftraggeber hat kein Portalkonto.")
		return {"ok": True}
	if aktion == "gemeinschaft_anlegen":
		nur_bo()
		if a.get("gemeinschaftId"):
			konflikt("Die Gemeinschaft ist bereits angelegt.")
		return {"ok": True}
	if aktion == "probeabrechnung":
		nur_bo()
		if not g:
			konflikt("Bitte zuerst die Gemeinschaft anlegen bzw. verknüpfen.")
		return {"ok": True}
	if aktion == "angebot":
		nur_bo()
		ang = _fach(K.angebot_bereinigen, d, {"heute": _heute(), "paket": a["paket"]})
		a["status"] = _fach(K.auftrag_uebergang, a, "angebot")
		jahr = _heute()[:4]
		nr = (a.get("angebot") or {}).get("nummer") or f"ANG-{jahr}-{frappe.db.count(DT_A, {'angebot_netto': ['>', 0], 'creation': ['>=', f'{jahr}-01-01']}) + 1:04d}"
		a["angebot"] = {**ang, "nummer": nr, "erstelltAm": jetzt_iso(), "erstelltVon": _vid(n)}
		a["signaturId"] = None
		_vl(a, n, f"Angebot {nr} erstellt ({ang['betragNetto']} € netto, gültig bis {K.datum_de(ang['gueltigBis'])})")
		_melden(a.get("auftraggeberKontoId"), f"Angebot für „{a['arbeitsname']}“", f"Ihr Angebot {nr} liegt im Portal bereit.", f"/portal/eg/gruendung/{a['id']}", a["id"], mail=True)
	elif aktion == "signatur_verknuepfen":
		nur_bo()
		sid = str(d.get("signaturId") or "")
		if a["status"] != "angebot" or not frappe.db.exists("Plattform Signaturvorgang", sid):
			konflikt("Signaturvorgang nicht gefunden bzw. kein offenes Angebot.")
		a["signaturId"] = sid
		_vl(a, n, "Auftrag zur elektronischen Unterschrift bereitgestellt")
	elif aktion == "annehmen":
		if not kunde:
			verboten("Das Angebot nimmt der Auftraggeber an.")
		if a.get("signaturId"):
			konflikt("Bitte unterschreiben Sie den Auftrag elektronisch (Portal → Unterschriften).")
		if d.get("bestaetigt") is not True:
			ungueltig("Bitte bestätigen Sie die Beauftragung.")
		_beauftragen(n, a, {"art": "klick", "nachweis": "Annahme im Portal"})
	elif aktion == "beauftragt_manuell":
		nur_bo()
		if not str(d.get("nachweis") or "").strip():
			ungueltig("Bitte den Nachweis angeben (z. B. unterschriebenes Angebot per Post).")
		_beauftragen(n, a, {"art": "manuell", "am": d["datum"] if K.datum_gueltig(d.get("datum")) else _heute(), "nachweis": str(d["nachweis"])[:200]})
	elif aktion == "ablehnen":
		if not kunde:
			verboten("Das Angebot lehnt der Auftraggeber ab.")
		a["status"] = _fach(K.auftrag_uebergang, a, "ablehnen")
		_vl(a, n, "Angebot abgelehnt" + (f": {str(d.get('grund'))[:200]}" if d.get("grund") else ""))
	elif aktion == "abbrechen":
		nur_bo()
		if not str(d.get("grund") or "").strip():
			ungueltig("Bitte einen Grund angeben.")
		a["status"] = _fach(K.auftrag_uebergang, a, "abbrechen")
		_vl(a, n, f"Auftrag abgebrochen: {str(d['grund'])[:200]}")
	elif aktion == "uebergeben":
		nur_bo()
		a["status"] = _fach(K.auftrag_uebergang, a, "uebergeben")
		_vl(a, n, "Gründung abgeschlossen und übergeben")
	elif aktion == "gemeinschaft_verknuepfen":
		nur_bo()
		ziel = _gemeinschaft(str(d.get("gemeinschaftId") or ""))
		if not ziel:
			ungueltig("Gemeinschaft nicht gefunden.")
		if frappe.db.exists(DT_A, {"gemeinschaft": ziel["id"], "name": ["!=", a["id"]], "status": ["not in", ["abgebrochen", "uebergeben"]]}):
			konflikt("Mit dieser Gemeinschaft ist bereits ein offener Auftrag verknüpft.")
		a["gemeinschaftId"] = ziel["id"]
		a["schritte"] = K.schritte_erzeugen(a, {"vorhanden": a["schritte"], "gemeinschaft": ziel})
		a["status"] = K.auftrag_status_aus_schritten(a, a["schritte"])
		_vl(a, n, f"Gemeinschaft „{ziel['name']}“ verknüpft")
	elif aktion == "daten":
		if not bo_w and not (kunde and a["status"] == "anfrage"):
			verboten("Die Angaben ändert nach dem Angebot ÖkoInvest.")
		neu = d.get("daten") or {}
		b = _fach(K.auftrag_bereinigen, {**a, **neu, "ansprechpartner": {**(a.get("ansprechpartner") or {}), **(neu.get("ansprechpartner") or {})}, "bestehend": {**(a.get("bestehend") or {}), **neu["bestehend"]} if neu.get("bestehend") else a.get("bestehend")})
		a.update(b)
		a["paketLabel"] = K.GR_PAKETE[b["paket"]]["label"]
		if bo_w and "bearbeiterId" in neu:
			a["bearbeiterId"] = neu["bearbeiterId"] or None
		a["schritte"] = K.schritte_erzeugen(a, {"vorhanden": a["schritte"], "gemeinschaft": g})
		a["status"] = K.auftrag_status_aus_schritten(a, a["schritte"])
		_vl(a, n, "Angaben aktualisiert", False)
	elif aktion == "schritte_aktualisieren":
		nur_bo()
		gk = _mit_kennzahlen(g)[0] if g else None
		a["schritte"] = K.schritte_erzeugen(a, {"vorhanden": a["schritte"], "gemeinschaft": gk})
		a["status"] = K.auftrag_status_aus_schritten(a, a["schritte"])
	elif aktion == "stichtag":
		nur_bo()
		if a["paket"] != "wechsel":
			konflikt("Der Stichtag gilt für einen Wechsel.")
		p = K.umstellungsplan({"stichtag": d.get("stichtag"), "heute": _heute()})
		if not p["stichtag"]:
			ungueltig(p["warnungen"][0])
		a["stichtag"] = p["stichtag"]
		_vl(a, n, f"Stichtag {K.datum_de(p['stichtag'])} festgelegt (letzte Abrechnung beim Altdienstleister: {p['letzteAltabrechnung']})")
	elif aktion == "statuten":
		if not bo_w and not kunde:
			verboten("Statuten-Angaben ändern Auftraggeber bzw. ÖkoInvest.")
		a["statutenEingaben"] = K.statuten_eingaben({**(a.get("statutenEingaben") or {}), **(d.get("eingaben") or {})})
		_vl(a, n, "Angaben für die Statuten gespeichert", False)
	elif aktion == "notiz":
		t = str(d.get("text") or "").strip()[:1000]
		if not t:
			ungueltig("Bitte einen Text eingeben.")
		_vl(a, n, t, not (bo and d.get("intern") is True))
	elif aktion == "kontrolle_speichern":
		nur_bo()
		liste = lambda x: [{"schluessel": str(y.get("schluessel") or ""), "name": str(y.get("name") or ""), "kwh": y.get("kwh") or 0, "betragEur": y.get("betragEur") or 0} for y in (x or [])[:5000] if y.get("schluessel")]
		v = K.kontroll_vergleich(liste(d.get("alt")), liste(d.get("neu")), {"toleranzEur": d.get("toleranzEur") or 0.05, "toleranzKwh": d.get("toleranzKwh") or 0.5})
		a["kontrolle"] = {"am": jetzt_iso(), "von": d.get("von") or "", "bis": d.get("bis") or "", "wp4": d.get("wp4") or {}, "vergleich": v}
		_vl(a, n, f"Kontrollabrechnung: {v['summe']['gleich']} gleich, {v['summe']['abweichung']} Abweichung(en)")
	elif aktion == "mitglieder_informieren":
		nur_bo()
		if not g:
			konflikt("Bitte zuerst die Gemeinschaft anlegen bzw. verknüpfen.")
		if not a.get("stichtag"):
			konflikt("Bitte zuerst den Stichtag festlegen.")
		alt = {"eegfaktura": "EEG Faktura", "energiedigital": "energiedigital", "egon": "EGON", "eda_portal": "EDA-Anwenderportal"}.get((a.get("bestehend") or {}).get("altdienstleister"), "")
		msg = K.wechsel_nachricht({"name": g["name"], "stichtag": a["stichtag"], "altdienstleister": alt})
		zahl = 0
		from oekoinvest_app.plattform.benachrichtigung import anlegen

		for m in STAMM.gemeinschaft_daten(g["id"])["mitglieder"]:
			if m.get("kontoId") and m.get("status") in M.MITGLIED_AKTIV:
				anlegen(m["kontoId"], "status", msg["titel"], msg["text"], "/portal/eg", "eg_gemeinschaft", g["id"], mail=True)
				zahl += 1
		_vl(a, n, f"Mitglieder informiert ({zahl} mit Portalkonto; übrige mit der Mitgliederinformation als PDF)")
	else:
		ungueltig("Unbekannte Aktion.")
	doc = _auftrag_speichern(a, doc)
	protokoll(n, "aendern", "eg_gruendungsauftrag", doc.name, f"Auftrag: {aktion}")
	a = _auftrag(doc)
	return _detail(n, a, _rolle(n, a))


_BEARBEITBAR = ["beauftragt", "machbarkeit", "rechtsform_statuten", "konstituierung", "behoerde", "finanzamt_bank", "marktpartner", "nb_vertrag", "eda", "mitgliederaufnahme", "wechsel_mandat", "wechsel_daten", "wechsel_parallel", "wechsel_umstellung", "betriebsbereit"]


@frappe.whitelist(methods=["POST"])
def schritt_aktion(id=None, daten=None, als_benutzer=None):
	"""Schritt-Aktion mit Wirkung auf die Gemeinschaft (WP1-Regeln, siehe _wirkung); das WP2-Ereignis sendet der Adapter."""
	n = nutzer(als_benutzer)
	doc, a, rolle = _laden(n, id)
	d = _daten(daten)
	bo = rolle == "backoffice" and _bo_schreiben(n)
	kunde = _als_auftraggeber(n, a, rolle)
	if a["status"] not in _BEARBEITBAR:
		konflikt("Schritte werden nach der Beauftragung bearbeitet.")
	schl, aktion = str(d.get("schritt") or ""), str(d.get("aktion") or "")
	x0 = next((s for s in a["schritte"] if s["schluessel"] == schl), None)
	if not x0:
		nicht_gefunden("Schritt nicht gefunden.")
	if not bo:
		if not kunde:
			verboten("Diesen Schritt bearbeitet ÖkoInvest.")
		if x0["zustaendig"] != "auftraggeber" and aktion != "notiz":
			verboten("Diesen Schritt bearbeitet ÖkoInvest – Sie können eine Notiz hinterlassen.")
		if aktion in ("entfaellt", "wiedereroeffnen", "frist"):
			verboten("Diese Aktion führt ÖkoInvest aus.")
	g = _gemeinschaft(a.get("gemeinschaftId"))
	opt = {k: d.get(k) for k in ("datum", "wert", "notiz", "frist", "grund", "nachweis") if d.get(k) is not None}
	neu = _fach(K.schritt_aktion, x0, aktion, {**opt, "heute": _heute(), "von": _vid(n), "gemeinschaft": g, "paket": a["paket"]})
	if aktion == "erledigen" and schl == "eda_bereit" and g:
		p = K.eda_bereit_pruefen(_mit_kennzahlen(g)[0], {"schritte": [neu if s["schluessel"] == schl else s for s in a["schritte"]], "organisator": a.get("organisator")})
		if not p["bereit"]:
			konflikt("Noch nicht EDA-bereit: " + " ".join(p["fehlend"]))
	wirkung = K.schritt_wirkung(neu, {"auftrag": a, "gemeinschaft": g}) if aktion == "erledigen" else {"felder": {}, "statusZiel": "", "ereignis": ""}
	if aktion == "erledigen" and not g and (K.schritt_definition(schl, a["paket"]) or {}).get("feld") and neu.get("wert"):
		konflikt("Bitte zuerst die Gemeinschaft anlegen (ÖkoInvest) – dann wird der Wert in die Stammdaten übernommen.")
	meldungen = _wirkung(n if bo else STAMM.system_nutzer(), g, wirkung, neu["label"]) if g else []
	a["schritte"] = [neu if s["schluessel"] == schl else s for s in a["schritte"]]
	if aktion == "erledigen" and schl == "gruendungsversammlung":
		a["gruendungsversammlungAm"] = neu["datum"]
	vorher = a["status"]
	a["status"] = K.auftrag_status_aus_schritten(a, a["schritte"])
	if aktion in ("erledigen", "entfaellt", "wiedereroeffnen"):
		_vl(a, n, f"{neu['label']}: {K.SCHRITT_STATUS[neu['status']]['label']}" + (f" ({neu['wert']})" if neu.get("wert") else ""))
	if vorher != a["status"]:
		_vl(a, None, f"Neuer Abschnitt: {K.GR_STATUS[a['status']]['label']}")
		if a.get("auftraggeberKontoId") != n.get("id"):
			_melden(a.get("auftraggeberKontoId"), f"Gründung „{a['arbeitsname']}“", f"Nächster Abschnitt: {K.GR_STATUS[a['status']]['label']}.", f"/portal/eg/gruendung/{a['id']}", a["id"])
	doc = _auftrag_speichern(a, doc)
	protokoll(n, "aendern", "eg_gruendungsauftrag", doc.name, f"Schritt {schl}: {aktion}")
	a = _auftrag(doc)
	return {**_detail(n, a, _rolle(n, a)), "meldungen": meldungen, "ereignis": wirkung.get("ereignis") or ""}


def _wirkung(n_aus, g, w, label):
	"""Wirkung eines erledigten Schritts auf die Gemeinschaft – mit den WP1-Regeln (eg_stamm_kern.gemeinschaft_bereinigen /
	gemeinschaft_uebergang) und WP1-Persistenz (eg_stamm.in_doc/_speichern), in derselben Transaktion wie der Schritt.
	Vom Auftraggeber erledigte Schritte führt das Systemkonto der Gründungsberatung aus (protokolliert). Das Ereignis an WP2
	(EDA-Start) sendet der Website-Adapter nach dem Speichern (Rückgabe „ereignis“)."""
	meldungen = []
	gid = g["id"]
	if w.get("felder"):
		voll = _gemeinschaft(gid)
		neu = {**voll, **w["felder"], "dienstleistung": w["felder"].get("dienstleistung") or voll.get("dienstleistung")}
		gb = STAMM._fach(STAMM.K.gemeinschaft_bereinigen, neu, voll, [x["id"] for x in STAMM._netzbetreiber_liste()])
		if gb.get("gemeinschaftsId") and frappe.db.exists(STAMM.DT["gemeinschaft"], {"gemeinschafts_id": gb["gemeinschaftsId"], "name": ["!=", gid]}):
			konflikt("Diese Gemeinschafts-ID ist bereits einer anderen Gemeinschaft zugeordnet.")
		STAMM._speichern(STAMM.in_doc("gemeinschaft", gb, frappe.get_doc(STAMM.DT["gemeinschaft"], gid)))
		STAMM._proto(n_aus, "eg_aendern", gid, f"Gemeinschaft geändert (Gründungsschritt {label})")
	if w.get("statusZiel"):
		for s in K.status_pfad(_gemeinschaft(gid)["status"], w["statusZiel"]):
			cur = _gemeinschaft(gid)
			try:
				r = STAMM.K.gemeinschaft_uebergang(cur, s, f"Gründungsschritt {label}")
			except MK.MitgliedFehler as e:
				meldungen.append(f"Status der Gemeinschaft nicht geändert: {e}")
				break
			frappe.db.set_value(STAMM.DT["gemeinschaft"], gid, "status", r["status"])
			STAMM._proto(n_aus, "eg_status", gid, f"Status {cur['status']} → {r['status']} (Gründungsschritt {label})")
	return meldungen


# ================================================================ Dokumente


def _dok_kontext(n, gemeinschaft_id="", auftrag_id=""):
	if auftrag_id:
		_doc, a, rolle = _laden(n, auftrag_id)
		g = _gemeinschaft(a.get("gemeinschaftId"))
		return a, g, rolle, (STAMM._kontext(n, g) if g else None)
	g, k = STAMM.zugriff(n, gemeinschaft_id, "organe_statuten", 1)
	if not STAMM.K.ist_organ(k) and not k["backofficeStufe"]:
		verboten("Dokumente erzeugen die Organe der Gemeinschaft bzw. ÖkoInvest.")
	a = None
	x = frappe.get_all(DT_A, filters={"gemeinschaft": g["id"], "status": ["!=", "abgebrochen"]}, pluck="name", limit_page_length=1)
	if x:
		a = _auftrag(frappe.get_doc(DT_A, x[0]))
	return a, g, "backoffice" if k["backofficeStufe"] else "organ", k


def _vereinsakte(gid):
	name = frappe.db.get_value(DT_VA, {"gemeinschaft": gid}, "name")
	return frappe.get_doc(DT_VA, name) if name else None


@frappe.whitelist(methods=["POST"])
def dokument_erzeugen(gemeinschaftId=None, auftragId=None, vorlage=None, daten=None, dokumentId=None, speichern=True, als_benutzer=None):
	n = nutzer(als_benutzer)
	if dokumentId:
		if not frappe.db.exists(DT_D, dokumentId):
			nicht_gefunden("Dokument nicht gefunden.")
		dd = frappe.get_doc(DT_D, dokumentId)
		if dd.gemeinschaft:
			_dok_kontext(n, gemeinschaft_id=dd.gemeinschaft)
		else:
			_dok_kontext(n, auftrag_id=dd.auftrag)
		x = aus_json(dd.daten, {}) or {}
		return {"dokument": _dokument_kurz(dd), "dok": x.get("dok"), "pruefung": x.get("pruefung")}
	v = K.VORLAGEN.get(vorlage or "")
	if not v:
		ungueltig("Unbekannte Vorlage.")
	a, g, rolle, k = _dok_kontext(n, gemeinschaftId or "", auftragId or "")
	roh = _daten(daten)
	gk, gd = _mit_kennzahlen(g) if g else (None, {"organe": [], "mitglieder": [], "zaehlpunkte": [], "anlagen": [], "tarife": []})
	akte = _vereinsakte(g["id"]) if g else None
	statuten = K.statuten_eingaben({**(aus_json(akte.statuten, {}) if akte else {}), **((a or {}).get("statutenEingaben") or {}), **roh})
	darf_person = bool(g) and (rolle == "backoffice" or STAMM.K.eg_stufe(k, "stammdaten") >= 1)
	mitglied = next((m for m in gd["mitglieder"] if m["id"] == roh.get("mitgliedId")), None) if darf_person and roh.get("mitgliedId") else None
	zp = next((z for z in gd["zaehlpunkte"] if z["id"] == roh.get("zaehlpunktId")), None) if mitglied and roh.get("zaehlpunktId") else None
	anlage = next((x for x in gd["anlagen"] if zp and x["id"] == zp.get("anlageId")), None)
	freie = {kk: (w[:600] if isinstance(w, str) else w) for kk, w in roh.items() if kk not in ("mitgliedId", "zaehlpunktId") and not isinstance(w, (dict, list))}
	auf = {**a, "paketLabel": K.GR_PAKETE[a["paket"]]["label"]} if a else None
	dd = K.dokument_daten({"gemeinschaft": gk, "netzbetreiber": STAMM._netzbetreiber_liste(), "tarif": STAMM.K.tarif_am(gd["tarife"], _heute()) if g else None, "mitglied": mitglied, "zaehlpunkt": zp, "anlage": anlage, "auftrag": auf, "organe": gd["organe"], "eingaben": {"ab": _heute(), **statuten, **freie}, "heute": _heute()})
	if mitglied and not dd.get("steuerstatusText"):
		dd["steuerstatusText"] = {"nicht_unternehmerisch": "nicht unternehmerisch", "kleinunternehmer": "Kleinunternehmer", "pauschalierter_landwirt": "pauschalierter Landwirt", "regelbesteuert": "regelbesteuert", "gemeinde_bga": "Gemeinde mit Betrieb gewerblicher Art"}.get(mitglied.get("steuerstatusErzeuger"), "")
	dok = K.vorlage_rendern(v, dd)
	pruefung = K.statuten_pruefen({**(gk or {}), "modell": dd["modell"], "rechtsform": dd["rechtsform"], "name": dd["name"], "sitzOrt": dd["sitzOrt"]}, statuten, dok) if v.get("art") == "statuten" else None
	h = sha256(dok["text"])
	if speichern is False or speichern in ("0", "false"):
		return {"dokument": {"id": "", "vorlage": vorlage, "titel": dok["titel"], "version": 0, "sha256": h, "stand": dok["stand"], "fehlend": len(dok["fehlend"])}, "dok": dok, "pruefung": pruefung}
	flt = {"vorlage": vorlage, "mitglied": (mitglied or {}).get("id")}
	if g:
		flt["gemeinschaft"] = g["id"]
	else:
		flt["auftrag"] = (a or {}).get("id")
	letzte = frappe.get_all(DT_D, filters=flt, fields=["name", "version", "sha256"], order_by="version desc", limit_page_length=1)
	if letzte and letzte[0].sha256 == h:
		x = frappe.get_doc(DT_D, letzte[0].name)
		return {"dokument": _dokument_kurz(x), "dok": dok, "pruefung": pruefung, "unveraendert": True}
	rec = frappe.get_doc({"doctype": DT_D, "vorlage": vorlage, "titel": dok["titel"][:140], "version": (letzte[0].version if letzte else 0) + 1, "sha256": h, "stand": dok["stand"], "gemeinschaft": (g or {}).get("id"), "auftrag": (a or {}).get("id"), "mitglied": (mitglied or {}).get("id"), "daten": als_json({"dok": dok, "pruefung": pruefung, "eingaben": freie, "fehlend": dok["fehlend"]})}).insert(ignore_permissions=True)
	protokoll(n, "anlegen", "eg_dokument", rec.name, f"Dokument erzeugt: {rec.titel} (Version {rec.version}, SHA-256 {h[:12]}…)")
	return {"dokument": _dokument_kurz(rec), "dok": dok, "pruefung": pruefung}


# ================================================================ Import (Wechsel)


def _import_kurz(doc):
	d = aus_json(doc.daten, {}) or {}
	return {"id": doc.name, "dateiname": doc.dateiname, "anbieter": doc.anbieter, "anbieterLabel": (K.ANBIETER_PROFILE.get(doc.anbieter) or {}).get("label", doc.anbieter), "status": doc.status, "zeilen": doc.zeilen or 0, "kennzahlen": d.get("kennzahlen"), "ergebnis": d.get("ergebnis"), "erstelltAm": str(doc.creation), "ausgefuehrtAm": str(doc.ausgefuehrt_am or "")}


def _bestand_zp(gd):
	return [z["zaehlpunktnummer"] for z in gd["zaehlpunkte"]]


@frappe.whitelist(methods=["POST"])
def import_vorschau(gemeinschaftId=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = _daten(daten)
	g, _k = STAMM.zugriff(n, gemeinschaftId, "stammdaten", 1)
	csv = str(d.get("csv") or "")
	if len(csv) > 3_000_000:
		ungueltig("Die Datei ist zu groß (max. 3 MB) – bitte aufteilen.")
	doc = frappe.get_doc(DT_I, d["importId"]) if d.get("importId") and frappe.db.exists(DT_I, {"name": d["importId"], "gemeinschaft": g["id"]}) else None
	if d.get("importId") and not doc:
		nicht_gefunden("Import nicht gefunden.")
	if doc and doc.status == "ausgefuehrt":
		konflikt("Dieser Import ist bereits übernommen.")
	alt = aus_json(doc.daten, {}) if doc else {}
	if csv:
		t = K.tabelle_lesen(csv)
		if not t["kopf"]:
			ungueltig("Die Datei ist leer bzw. ohne Kopfzeile.")
		kopf, kopf_norm, zeilen = t["kopf"], t["kopfNorm"], t["zeilen"]
	elif doc:
		kopf, kopf_norm, zeilen = alt["kopf"], alt["kopfNorm"], alt["zeilenRoh"]
	else:
		ungueltig("Bitte eine CSV-Datei wählen oder Zellen aus Excel einfügen.")
	erkannt = K.anbieter_erkennen(kopf_norm)
	z = K.zuordnung_bereinigen(d["zuordnung"], len(kopf)) if isinstance(d.get("zuordnung"), dict) else K.zuordnung_vorschlagen(kopf_norm)
	ds = K.zeilen_abbilden(zeilen, z)
	gd = STAMM.gemeinschaft_daten(g["id"])
	p = K.plausibilitaet(ds, {"gemeinschaft": g, "netzbetreiber": STAMM._netzbetreiber_liste(), "bestandZaehlpunkte": _bestand_zp(gd)})
	anbieter = d.get("anbieter") if d.get("anbieter") in K.ANBIETER_PROFILE else (doc.anbieter if doc and not csv else erkannt["anbieter"])
	doc = doc or frappe.new_doc(DT_I)
	doc.gemeinschaft, doc.auftrag = g["id"], d.get("auftragId") or doc.get("auftrag") or None
	doc.dateiname = str(d.get("dateiname") or doc.get("dateiname") or "import.csv")[:120]
	doc.anbieter, doc.status, doc.zeilen = anbieter, "geprueft" if p["ok"] else "vorschau", len(zeilen)
	doc.daten = als_json({"kopf": kopf, "kopfNorm": kopf_norm, "zeilenRoh": zeilen, "zuordnung": z, "erkannt": erkannt, "kennzahlen": p["kennzahlen"]})
	doc.insert(ignore_permissions=True) if doc.is_new() else doc.save(ignore_permissions=True)
	protokoll(n, "aendern", "eg_import", doc.name, f"Import-Vorschau {doc.dateiname}: {p['kennzahlen']['zeilen']} Zeilen, {len(p['fehler'])} Fehler")
	vorschau = []
	for x in ds[:200]:
		pp = x["mitglied"]["person"]
		vorschau.append({"zeile": x["zeile"], "name": pp["firma"] or " ".join(y for y in (pp["vorname"], pp["nachname"]) if y), "mitgliedsnummer": x["mitglied"]["mitgliedsnummer"], "art": x["mitglied"]["art"], "email": pp["email"], "zaehlpunkt": (x.get("zaehlpunkt") or {}).get("nummer", ""), "richtung": (x.get("zaehlpunkt") or {}).get("richtung", ""), "teilnahmefaktor": (x.get("teilnahme") or {}).get("teilnahmefaktor"), "consentId": (x.get("teilnahme") or {}).get("consentId", ""), "kwp": (x.get("anlage") or {}).get("kwp"), "status": p["zeilenStatus"].get(str(x["zeile"]))})
	return {"import": _import_kurz(doc), "kopf": kopf, "zuordnung": z, "felder": {kk: f["label"] for kk, f in K.IMPORT_FELDER.items()}, "anbieterProfile": {kk: {"label": f["label"], "export": f["export"]} for kk, f in K.ANBIETER_PROFILE.items()}, "erkannt": erkannt, "plausibilitaet": p, "vorschau": vorschau}


@frappe.whitelist(methods=["POST"])
def import_ausfuehren(importId=None, daten=None, als_benutzer=None):
	"""phase „plan“: Rechte prüfen und Importplan liefern (Adapter führt ihn über WP1 aus); phase „abschliessen“: Ergebnis ablegen."""
	n = nutzer(als_benutzer)
	d = _daten(daten)
	if not importId or not frappe.db.exists(DT_I, importId):
		nicht_gefunden("Import nicht gefunden.")
	doc = frappe.get_doc(DT_I, importId)
	g, _k = STAMM.zugriff(n, doc.gemeinschaft, "stammdaten", 2)
	if doc.status == "ausgefuehrt":
		konflikt("Dieser Import ist bereits übernommen.")
	x = aus_json(doc.daten, {}) or {}
	if d.get("phase") == "abschliessen":
		erg = d.get("ergebnis") or {}
		x.update({"ergebnis": erg, "soll": d.get("soll") or [], "zuordnungNummern": d.get("zuordnungNummern") or []})
		doc.status = "fehlgeschlagen" if erg.get("fehler") else "ausgefuehrt"
		doc.ausgefuehrt_am = None if erg.get("fehler") else now_datetime()
		doc.daten = als_json(x)
		doc.save(ignore_permissions=True)
		protokoll(n, "aendern", "eg_import", doc.name, f"Import {doc.status}: {erg.get('angelegt', 0)} neu, {erg.get('geaendert', 0)} aktualisiert")
		return {"import": _import_kurz(doc), "ergebnis": erg, "soll": len(d.get("soll") or [])}
	ds = K.zeilen_abbilden(x["zeilenRoh"], x["zuordnung"])
	gd = STAMM.gemeinschaft_daten(g["id"])
	bestand_zp = _bestand_zp(gd)
	p = K.plausibilitaet(ds, {"gemeinschaft": g, "netzbetreiber": STAMM._netzbetreiber_liste(), "bestandZaehlpunkte": bestand_zp})
	fehler_zeilen = sorted({f["zeile"] for f in p["fehler"] if f["zeile"]})
	if fehler_zeilen and d.get("ohneFehlerzeilen") is False:
		konflikt(f"{len(fehler_zeilen)} Zeile(n) mit Fehlern – bitte korrigieren oder ohne diese Zeilen übernehmen.")
	bereits = [y["zeile"] for y in ds if y.get("zaehlpunkt") and y["zaehlpunkt"]["nummer"] in bestand_zp]
	bestand = [{"mitgliedsnummer": m.get("mitgliedsnummer"), "email": (m.get("person") or {}).get("email") or ""} for m in gd["mitglieder"]]
	plan = K.import_plan(ds, {"bestand": bestand, "ausschliessen": fehler_zeilen + bereits})
	stichtag = ""
	if doc.auftrag and frappe.db.exists(DT_A, doc.auftrag):
		stichtag = str(frappe.db.get_value(DT_A, doc.auftrag, "stichtag") or "")
	return {"plan": plan, "gemeinschaftId": g["id"], "fehlerZeilen": len(fehler_zeilen), "uebersprungen": len(bereits), "anbieterLabel": (K.ANBIETER_PROFILE.get(doc.anbieter) or {}).get("label", "Altsystem"), "stichtag": stichtag, "heute": _heute()}


# ================================================================ Förder-Check


@frappe.whitelist(methods=["POST"])
def foerdercheck(gemeinschaftId=None, auftragId=None, daten=None, speichern=False, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = _daten(daten)
	a = _laden(n, auftragId)[1] if auftragId else None
	g = STAMM.zugriff(n, gemeinschaftId, "mitgliederliste", 1)[0] if gemeinschaftId else _gemeinschaft((a or {}).get("gemeinschaftId"))
	anlagen = d.get("anlagen") if isinstance(d.get("anlagen"), list) and d.get("anlagen") else None
	if anlagen is None and g:
		anlagen = [{"art": x["art"], "kwp": x.get("kwp") or x.get("engpassleistungKw"), "speicherKwh": x.get("speicherKwh"), "status": "in_betrieb" if x.get("status") == "aktiv" else "geplant", "bezeichnung": x.get("bezeichnung")} for x in STAMM.gemeinschaft_daten(g["id"])["anlagen"]]
	if not anlagen and a:
		anlagen = ([{"art": "pv", "kwp": a["erzeugungKwp"], "status": "geplant", "bezeichnung": "geplante PV (laut Anfrage)"}] if a.get("erzeugungKwp") else []) + ([{"art": "speicher", "speicherKwh": a["speicherKwh"], "status": "geplant", "bezeichnung": "geplanter Speicher"}] if a.get("speicherKwh") else [])
	eingaben = {"modell": d.get("modell") or (g or {}).get("modell") or (a or {}).get("modell") or "eeg", "bundesland": d.get("bundesland") or (a or {}).get("bundesland") or "", "antragsteller": d.get("antragsteller") or "eg", "gemeindeBeteiligt": d["gemeindeBeteiligt"] if "gemeindeBeteiligt" in d else (a or {}).get("gemeindeBeteiligt", False), "anlagen": anlagen or []}
	erg = K.foerder_check(eingaben)
	if not speichern or (not g and not a):
		return {"foerdercheck": {"id": "", "eingaben": eingaben, **erg}, "programme": K.FOERDER_PROGRAMME}
	rec = frappe.get_doc({"doctype": DT_F, "gemeinschaft": (g or {}).get("id"), "auftrag": (a or {}).get("id"), "stand": erg["stand"], "treffer": erg["kennzahlen"]["pruefen"], "daten": als_json({"eingaben": eingaben, "ergebnis": erg})}).insert(ignore_permissions=True)
	protokoll(n, "anlegen", "eg_foerdercheck", rec.name, f"Förder-Check: {erg['kennzahlen']['pruefen']} zu prüfen")
	return {"foerdercheck": {"id": rec.name, "eingaben": eingaben, **erg}, "programme": K.FOERDER_PROGRAMME}


# ================================================================ Verein


def _jetzt_lokal():
	return now_datetime().strftime("%Y-%m-%dT%H:%M")


def _gv(doc):
	return {**(aus_json(doc.daten, {}) or {}), "id": doc.name, "gemeinschaftId": doc.gemeinschaft, "titel": doc.titel, "status": doc.status, "datum": doc.datum}


def _gv_speichern(gv, doc=None):
	doc = doc or frappe.new_doc(DT_V)
	doc.gemeinschaft, doc.titel, doc.status, doc.datum = gv["gemeinschaftId"], gv["titel"], gv["status"], gv["datum"]
	doc.daten = als_json({k: v for k, v in gv.items() if k not in ("id", "gemeinschaftId", "titel", "status", "datum")})
	doc.insert(ignore_permissions=True) if doc.is_new() else doc.save(ignore_permissions=True)
	return doc


def _stimmen(gv_id):
	return [{"id": s.name, "mitgliedId": s.mitglied, "am": str(s.am or ""), "stimmen": aus_json(s.stimmen, {}) or {}} for s in frappe.get_all(DT_S, filters={"versammlung": gv_id}, fields=["name", "mitglied", "am", "stimmen"], limit_page_length=0)]


def _verein(n, g, k):
	h = _heute()
	gd = STAMM.gemeinschaft_daten(g["id"])
	organ = STAMM.K.ist_organ(k) or bool(k["backofficeStufe"])
	aktiv = [m for m in gd["mitglieder"] if m.get("status") in M.MITGLIED_AKTIV]
	mitglied = next((m for m in aktiv if m.get("kontoId") == n.get("id")), None)
	akte = _vereinsakte(g["id"])
	statuten = K.statuten_eingaben(aus_json(akte.statuten, {}) if akte else {})
	gvs = []
	for name in frappe.get_all(DT_V, filters={"gemeinschaft": g["id"]}, pluck="name", order_by="datum desc"):
		gv = _gv(frappe.get_doc(DT_V, name))
		if not organ and gv["status"] == "entwurf":
			continue
		st = _stimmen(gv["id"])
		eigene = next((s for s in st if mitglied and s["mitgliedId"] == mitglied["id"]), None)
		offen = MK.abstimmung_offen(gv, _jetzt_lokal())
		gvs.append({**gv, "zugang": gv.get("zugang", "") if gv["status"] != "entwurf" or organ else "", "statusLabel": MK.GV_STATUS.get(gv["status"], gv["status"]), "ton": {"entwurf": "neutral", "eingeladen": "info", "abstimmung": "warn", "abgeschlossen": "ok", "abgesagt": "neutral"}.get(gv["status"], "neutral"),
			"ergebnis": gv.get("ergebnis") if gv["status"] == "abgeschlossen" else None, "protokoll": gv.get("protokoll") if gv["status"] == "abgeschlossen" else None,
			"zwischenstand": MK.ergebnis_rechnen(gv, st, len(aktiv)) if organ and gv["status"] == "abstimmung" else None, "stimmberechtigt": len(aktiv), "abgegeben": len(st) if organ else None,
			"abstimmungOffen": offen, "eigeneStimme": {"am": eigene["am"], "stimmen": eigene["stimmen"]} if eigene else None, "darfAbstimmen": bool(mitglied) and not eigene and offen and gv.get("form") in MK.ONLINE_FORMEN})
	beschluesse = []
	for b in frappe.get_all(DT_B, filters={"gemeinschaft": g["id"]}, fields=["name", "datum", "gremium", "kategorie", "gegenstand", "angenommen", "daten"], order_by="datum desc", limit_page_length=500):
		if not organ and b.gremium != "gv":
			continue
		beschluesse.append({**(aus_json(b.daten, {}) or {}), "id": b.name, "datum": str(b.datum), "gremium": b.gremium, "kategorie": b.kategorie, "gegenstand": b.gegenstand, "angenommen": bool(b.angenommen)})
	organe = [{"id": o["id"], "funktion": o["funktion"], "funktionLabel": (M.ORGAN_FUNKTIONEN.get(o["funktion"]) or {}).get("label", o["funktion"]), "personName": o.get("name") or "", "kontoId": o.get("kontoId") if organ else None, "von": o.get("von"), "bis": o.get("bis"), "zeichnungsberechtigt": o.get("zeichnungsberechtigt"), "status": o.get("status"), "wirksam": STAMM.K.organ_wirksam(o, h)} for o in gd["organe"]]
	darf_b = STAMM.K.eg_stufe(k, "buchhaltung") >= 1
	beitraege = []
	if darf_b:
		mg = {m["id"]: m for m in gd["mitglieder"]}
		for b in frappe.get_all(DT_BT, filters={"gemeinschaft": g["id"]}, fields=["name", "mitglied", "jahr", "art", "betrag", "faellig_am", "status", "einhebung"], limit_page_length=0):
			m = mg.get(b.mitglied) or {}
			beitraege.append({"id": b.name, "mitgliedId": b.mitglied, "jahr": b.jahr, "art": b.art, "betragEur": b.betrag, "faelligAm": str(b.faellig_am or ""), "status": b.status, "einhebung": b.einhebung, "mitgliedName": STAMM.K.mitglied_name(m) if m else "", "mitgliedsnummer": m.get("mitgliedsnummer", "")})
	tarif = STAMM.K.tarif_am(gd["tarife"], h)
	dok = [_dokument_kurz(frappe.get_doc(DT_D, x)) for x in frappe.get_all(DT_D, filters={"gemeinschaft": g["id"]}, pluck="name", order_by="creation desc")] if organ else []
	aufl = aus_json(akte.aufloesung, None) if akte else None
	return {
		"gemeinschaft": {"id": g["id"], "name": g["name"], "modell": g["modell"], "modellKurz": M.EG_MODELLE[g["modell"]]["kurz"], "rechtsform": g["rechtsform"], "rechtsformLabel": (M.RECHTSFORMEN.get(g["rechtsform"]) or {}).get("label", g["rechtsform"]), "status": g["status"], "statusLabel": (M.GEMEINSCHAFT_STATUS.get(g["status"]) or {}).get("label", g["status"])},
		"versammlungen": gvs, "beschluesse": beschluesse, "organe": organe,
		"organCheck": K.organ_check(g, gd["organe"], {"heute": h, "funktionsperiodeJahre": int(statuten["funktionsperiodeJahre"])}) if organ else None,
		"gvPflicht": K.gv_pflicht({"rechtsform": g["rechtsform"], "versammlungen": [_gv(frappe.get_doc(DT_V, x)) for x in frappe.get_all(DT_V, filters={"gemeinschaft": g["id"]}, pluck="name")], "heute": h, "turnusJahre": statuten["gvTurnusJahre"], "gegruendetAm": str(g.get("erstelltAm") or "")[:10]}),
		"statuten": statuten, "gvKonfig": K.gv_konfig(g, statuten), "tagesordnungVorlage": K.gv_tagesordnung_vorlage({"art": "ordentlich", "rechtsform": g["rechtsform"], "tarif": True, "beitrag": True}) if organ else [],
		"beitraege": beitraege, "beitragsUebersicht": K.beitrags_uebersicht(beitraege, {"jahr": int(h[:4])}) if darf_b else None, "beitragTarif": {"mitgliedsbeitragJahr": tarif.get("mitgliedsbeitragJahr"), "einmalgebuehrBeitritt": tarif.get("einmalgebuehrBeitritt"), "bezeichnung": tarif.get("bezeichnung")} if tarif else None,
		"dokumente": dok, "vorlagen": K.vorlagen_fuer({"modell": g["modell"], "rechtsform": g["rechtsform"]}) if organ else [],
		"aufloesung": {**aufl, **K.aufloesung_checkliste(g, {"teilnahmenAktiv": len([t for t in gd["teilnahmen"] if t.get("status") == "aktiv"]), "stand": aufl.get("stand") or {}})} if aufl else None,
		"eigenesMitglied": {"id": mitglied["id"], "mitgliedsnummer": mitglied.get("mitgliedsnummer")} if mitglied else None,
		"rechte": {"gv": STAMM.K.eg_stufe(k, "gv"), "organe": STAMM.K.eg_stufe(k, "organe_statuten"), "buchhaltung": STAMM.K.eg_stufe(k, "buchhaltung"), "organ": organ, "backoffice": k["backofficeStufe"]},
		"rollen": k["rollen"], "heute": h, "beitragEinhebung": K.BEITRAG_EINHEBUNG,
	}


@frappe.whitelist(methods=["POST"])
def versammlungen(gemeinschaftId=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	g, k = STAMM.zugriff(n, gemeinschaftId, "gv", 1)
	d = _daten(daten)
	aktion, vid, x = str(d.get("aktion") or ""), str(d.get("id") or ""), d.get("daten") or {}
	if not aktion:
		return _verein(n, g, k)
	organ = STAMM.K.ist_organ(k) or bool(k["backofficeStufe"])

	def recht(r, s):
		if STAMM.K.eg_stufe(k, r) < s:
			verboten("Ihre Rolle in dieser Gemeinschaft erlaubt diese Aktion nicht.")

	akte = _vereinsakte(g["id"])
	statuten = K.statuten_eingaben(aus_json(akte.statuten, {}) if akte else {})
	konfig = K.gv_konfig(g, statuten)
	gdoc = frappe.get_doc(DT_V, vid) if vid and frappe.db.exists(DT_V, {"name": vid, "gemeinschaft": g["id"]}) else None
	if aktion.startswith("gv_") and (aktion != "gv_speichern" or vid) and not gdoc:
		nicht_gefunden("Versammlung nicht gefunden.")
	gv = _gv(gdoc) if gdoc else None
	gd = STAMM.gemeinschaft_daten(g["id"])
	aktiv = [m for m in gd["mitglieder"] if m.get("status") in M.MITGLIED_AKTIV]
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	if aktion == "gv_speichern":
		if not organ:
			verboten("Versammlungen bereiten die Organe bzw. ÖkoInvest vor.")
		recht("gv", 1)
		b = _fach(MK.versammlung_bereinigen, x, konfig)
		if gv and gv["status"] != "entwurf":
			konflikt("Nur Entwürfe sind änderbar.")
		_gv_speichern({**(gv or {}), **b, "gemeinschaftId": g["id"], "status": "entwurf"}, gdoc)
	elif aktion == "gv_einladen":
		recht("gv", 2)
		_fach(MK.einladung_pruefen, gv, konfig, _heute())
		gv.update({"status": "eingeladen", "eingeladenAm": jetzt_iso(), "eingeladen": len(aktiv)})
		for m in aktiv:
			if m.get("kontoId"):
				anlegen(m["kontoId"], "status", f"Einladung: {gv['titel']}", f"{g['name']} lädt Sie am {K.datum_de(gv['datum'])} um {str(gv['datum'])[11:16]} Uhr ein.", f"/portal/eg/{g['id']}/verein", "eg_versammlung", gv["id"], mail=True)
		_gv_speichern(gv, gdoc)
	elif aktion == "gv_oeffnen":
		recht("gv", 2)
		if gv["status"] != "eingeladen":
			konflikt("Die Abstimmung wird nach der Einladung geöffnet.")
		if gv.get("form") not in MK.ONLINE_FORMEN:
			konflikt("Bei einer Präsenzversammlung wird im Saal abgestimmt – Ergebnis beim Abschluss eintragen.")
		gv["status"] = "abstimmung"
		_gv_speichern(gv, gdoc)
	elif aktion == "gv_abstimmen":
		recht("gv", 1)
		m = next((y for y in aktiv if y.get("kontoId") == n.get("id")), None)
		if not m:
			verboten("Abstimmen können stimmberechtigte Mitglieder mit eigenem Portalkonto.")
		if not MK.abstimmung_offen(gv, _jetzt_lokal()):
			konflikt("Die Abstimmung ist nicht geöffnet.")
		if frappe.db.exists(DT_S, {"versammlung": gv["id"], "mitglied": m["id"]}):
			konflikt("Sie haben bereits abgestimmt – die Stimme kann nicht geändert werden.")
		s = _fach(MK.stimme_bereinigen, x.get("stimmen") or x, gv)
		frappe.get_doc({"doctype": DT_S, "versammlung": gv["id"], "mitglied": m["id"], "stimmen": als_json(s), "am": now_datetime()}).insert(ignore_permissions=True)
	elif aktion == "gv_abschliessen":
		recht("gv", 2)
		if gv["status"] not in ("eingeladen", "abstimmung"):
			konflikt("Abgeschlossen wird eine eingeladene Versammlung.")
		st = _stimmen(gv["id"])
		ab = _fach(MK.abschluss_bereinigen, x, gv, len(aktiv), len(st))
		gv["ergebnis"] = MK.ergebnis_rechnen(gv, st, len(aktiv), {"anwesend": ab["anwesend"], "tops": ab["tops"]})
		gv["protokoll"] = {**ab, "sha256": sha256(MK.stimmen_kanonisch(gv["id"], st)), "am": jetzt_iso()}
		gv.update({"status": "abgeschlossen", "abgeschlossenAm": jetzt_iso()})
		_gv_speichern(gv, gdoc)
		for b in K.beschluesse_aus_versammlung(gv, gv["ergebnis"]):
			_beschluss_anlegen(g["id"], b)
	elif aktion == "gv_absagen":
		recht("gv", 2)
		if gv["status"] in ("abgeschlossen", "abgesagt"):
			konflikt("Diese Versammlung kann nicht mehr abgesagt werden.")
		if not str(x.get("grund") or "").strip():
			ungueltig("Bitte einen Grund angeben.")
		gv.update({"status": "abgesagt", "absage": {"grund": str(x["grund"])[:300], "am": jetzt_iso()}})
		_gv_speichern(gv, gdoc)
	elif aktion == "beschluss_speichern":
		if STAMM.K.eg_stufe(k, "organe_statuten") < 2 and STAMM.K.eg_stufe(k, "gv") < 2:
			verboten("Beschlüsse erfassen Vorstand und Schriftführung.")
		_beschluss_anlegen(g["id"], _fach(K.beschluss_bereinigen, x, {"heute": _heute()}))
	elif aktion == "beitraege_vorschreiben":
		recht("buchhaltung", 2)
		tarif = STAMM.K.tarif_am(gd["tarife"], _heute()) or {}
		vorh = [{"mitgliedId": b.mitglied, "jahr": b.jahr, "art": b.art} for b in frappe.get_all(DT_BT, filters={"gemeinschaft": g["id"]}, fields=["mitglied", "jahr", "art"], limit_page_length=0)]
		neu = _fach(K.beitraege_vorschreiben, {"mitglieder": gd["mitglieder"], "jahr": x.get("jahr") or int(_heute()[:4]), "betragJahr": x["betragJahr"] if x.get("betragJahr") is not None else tarif.get("mitgliedsbeitragJahr", 0), "beitrittsgebuehr": x["beitrittsgebuehr"] if x.get("beitrittsgebuehr") is not None else tarif.get("einmalgebuehrBeitritt", 0), "anteilig": x.get("anteilig") is True, "vorhandene": vorh, "faelligAm": x.get("faelligAm")})
		for b in neu:
			frappe.get_doc({"doctype": DT_BT, "gemeinschaft": g["id"], "mitglied": b["mitgliedId"], "jahr": b["jahr"], "art": b["art"], "betrag": b["betragEur"], "faellig_am": b["faelligAm"], "status": "offen", "einhebung": "abrechnung" if x.get("einhebung") == "abrechnung" else "gesondert"}).insert(ignore_permissions=True)
	elif aktion == "beitrag_status":
		recht("buchhaltung", 2)
		st = x.get("status") if x.get("status") in K.BEITRAG_STATUS else ""
		if not st:
			ungueltig("Status: offen, bezahlt oder erlassen.")
		for bid in (x.get("ids") or [])[:2000]:
			if frappe.db.exists(DT_BT, {"name": str(bid), "gemeinschaft": g["id"]}):
				frappe.db.set_value(DT_BT, str(bid), {"status": st, "bezahlt_am": _heute() if st == "bezahlt" else None})
	elif aktion == "statuten_speichern":
		recht("organe_statuten", 2)
		e = K.statuten_eingaben({**statuten, **x})
		akte = akte or frappe.get_doc({"doctype": DT_VA, "gemeinschaft": g["id"]})
		akte.statuten = als_json(e)
		akte.insert(ignore_permissions=True) if akte.is_new() else akte.save(ignore_permissions=True)
	else:
		ungueltig("Unbekannte Aktion.")
	protokoll(n, "aendern", "eg_versammlung", vid or g["id"], f"Verein: {aktion}")
	return _verein(n, g, STAMM._kontext(n, g))


def _beschluss_anlegen(gid, b):
	frappe.get_doc({"doctype": DT_B, "gemeinschaft": gid, "datum": b["datum"], "gremium": b["gremium"], "kategorie": b["kategorie"], "gegenstand": b["gegenstand"][:140], "angenommen": 1 if b["angenommen"] else 0, "versammlung": b.get("versammlungId") or None, "daten": als_json({k: b[k] for k in ("text", "ja", "nein", "enthaltung", "mehrheit", "top")})}).insert(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def aufloesung(gemeinschaftId=None, daten=None, als_benutzer=None):
	"""aktion lesen | starten | punkt | abschliessen. Statuswechsel der Gemeinschaft führt der Adapter über WP1 aus (phase „pruefen“)."""
	n = nutzer(als_benutzer)
	d = _daten(daten)
	aktion = d.get("aktion") or "lesen"
	g, _k = STAMM.zugriff(n, gemeinschaftId, "organe_statuten", 1 if aktion == "lesen" else 2)
	akte = _vereinsakte(g["id"])
	stand = aus_json(akte.aufloesung, {}) if akte else {}
	stand = stand or {"stand": {}, "gestartetAm": ""}
	gd = STAMM.gemeinschaft_daten(g["id"])

	def ausgabe():
		return {"gemeinschaft": {"id": g["id"], "name": g["name"], "status": g["status"], "statusLabel": (M.GEMEINSCHAFT_STATUS.get(g["status"]) or {}).get("label")}, "gemeinschaftId": g["id"], **stand, **K.aufloesung_checkliste(g, {"teilnahmenAktiv": len([t for t in gd["teilnahmen"] if t.get("status") in ("aktiv", "abmeldung_angefragt")]), "stand": stand.get("stand") or {}})}

	if aktion == "lesen":
		return ausgabe()
	if aktion not in ("starten", "punkt", "abschliessen"):
		ungueltig("Unbekannte Aktion.")
	if aktion == "starten" and not str(d.get("grund") or "").strip():
		ungueltig("Bitte den Auflösungsbeschluss angeben (Datum, Gremium, Mehrheit).")
	if aktion == "abschliessen" and not ausgabe()["abschliessbar"]:
		konflikt(f"Noch {ausgabe()['offen']} Pflichtpunkt(e) offen.")
	if d.get("phase") == "pruefen":
		return ausgabe()
	if aktion == "starten":
		stand.update({"gestartetAm": _heute(), "beschluss": str(d["grund"])[:300]})
		stand["stand"] = {**(stand.get("stand") or {}), "beschluss": {"erledigt": True, "am": _heute(), "notiz": str(d["grund"])[:300]}}
	if aktion == "punkt":
		if not stand.get("gestartetAm"):
			konflikt("Bitte zuerst die Auflösung starten (Beschluss).")
		stand["stand"] = {**(stand.get("stand") or {}), str(d.get("punkt") or "")[:40]: {"erledigt": d.get("erledigt") is not False, "am": _heute(), "notiz": str(d.get("notiz") or "")[:300]}}
	if aktion == "abschliessen":
		stand["abgeschlossenAm"] = _heute()
	akte = akte or frappe.get_doc({"doctype": DT_VA, "gemeinschaft": g["id"]})
	akte.aufloesung = als_json(stand)
	akte.insert(ignore_permissions=True) if akte.is_new() else akte.save(ignore_permissions=True)
	protokoll(n, "aendern", "eg_gemeinschaft", g["id"], f"Auflösung: {aktion}")
	return ausgabe()
