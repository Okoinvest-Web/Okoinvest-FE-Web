# Copyright (c) 2026, ÖkoInvest GmbH
#
# Automationsregeln (Wenn–Und–Dann), Testlauf, Fristen, Tags sowie E-Mail-/Nachrichtenvorlagen mit Versionen.
# Motor und Schleifenschutz: plattform/backoffice.py. Ausgabe wie backend/demo/automation.js und demo/vorlagen.js.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import backoffice as bo
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt, kurz, name_von, nachricht_anlegen, nicht_gefunden, nutzer, objekt_laden, protokoll
from oekoinvest_app.plattform.prozesse import status_label
from oekoinvest_app.plattform.rechte import recht_noetig

BEREICH_TAG = {"vorgang": "vorgaenge", "flaeche": "akquise", "projekt": "projekte", "interesse": "interessen"}


def _regel_ausgabe(doc):
	r = bo.regel_dict(doc)
	letzte = frappe.get_all("Plattform Automation Lauf", filters={"regel_id": doc.name, "testlauf": 0}, fields=["am", "status", "objekt_titel"], order_by="am desc", limit=1)
	return {**r, "zaehler": {"ausgefuehrt": cint(doc.ausgefuehrt), "zuletzt": iso(doc.zuletzt)}, "erstelltVonName": name_von(doc.erstellt_von), "erstelltAm": iso(doc.creation), "geaendertAm": iso(doc.modified), "letzterLauf": {"am": iso(letzte[0].am), "status": letzte[0].status, "objektTitel": letzte[0].objekt_titel} if letzte else None}


def _lauf_ausgabe(x):
	return {"id": x.name, "am": iso(x.am), "regelId": x.regel_id, "regelName": x.regel_name, "ausloeser": x.ausloeser, "art": x.art, "objektId": x.objekt_id, "objektTitel": x.objekt_titel, "tiefe": cint(x.tiefe), "kette": x.kette, "testlauf": bool(cint(x.testlauf)), "status": x.status, "bedingungen": aus_json(x.bedingungen) or [], "aktionen": aus_json(x.aktionen) or [], "text": x.text or ""}


def _konten():
	return [kurz(k) for k in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent") if bo._aktive_backoffice(k)]


@frappe.whitelist(methods=["POST"])
def liste(protokollLimit=200, regelId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "automationen", 1)
	bo.fristen_pruefen_intern()
	filters = {"regel_id": v.kennung(regelId)} if regelId else {}
	lauf = frappe.get_all("Plattform Automation Lauf", filters=filters, fields=["*"], order_by="am desc", limit_page_length=min(1000, cint(protokollLimit) or 200))
	return {
		"regeln": [_regel_ausgabe(frappe.get_doc("Plattform Automation Regel", r)) for r in frappe.get_all("Plattform Automation Regel", pluck="name", order_by="creation asc")],
		"protokoll": [_lauf_ausgabe(x) for x in lauf],
		"vorlagen": [{"id": x.name, "name": x.bezeichnung, "kanal": x.kanal, "aktiv": bool(cint(x.aktiv))} for x in frappe.get_all("Plattform Vorlage", fields=["name", "bezeichnung", "kanal", "aktiv"])],
		"konten": _konten(),
		"gebiete": frappe.db.count("Plattform Gebiet"),
		"statistik": {
			"ausgefuehrt24h": frappe.db.count("Plattform Automation Lauf", {"status": "ausgefuehrt", "testlauf": 0, "am": (">", frappe.utils.add_days(jetzt(), -1))}),
			"fehler24h": frappe.db.count("Plattform Automation Lauf", {"status": "teilweise", "am": (">", frappe.utils.add_days(jetzt(), -1))}),
			"schleifen": frappe.db.count("Plattform Automation Lauf", {"status": "schleife"}),
		},
	}


def _gegen_db(regel):
	for a in regel["aktionen"]:
		if a["typ"] in ("mail", "nachricht"):
			kanal = frappe.db.get_value("Plattform Vorlage", a["vorlageId"], "kanal")
			v.pflicht(kanal, "Die gewählte Vorlage gibt es nicht.")
			v.pflicht(kanal == ("email" if a["typ"] == "mail" else "nachricht"), "Vorlage passt nicht zum Kanal der Aktion.")
		if a["typ"] == "zustaendig" and a["mitarbeiterId"] != "gebiet":
			v.pflicht(bo._aktive_backoffice(a["mitarbeiterId"]), "Zuständig kann nur ein aktives Backoffice-Konto sein.")


@frappe.whitelist(methods=["POST"])
def speichern(id=None, regel=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "automationen", 2)
	r = bo.regel_bereinigen(regel)
	if r.get("fehler"):
		frappe.throw(r["fehler"], frappe.ValidationError)
	r = r["regel"]
	_gegen_db(r)
	werte = {"bezeichnung": r["name"], "aktiv": 1 if r["aktiv"] else 0, "beschreibung": r["beschreibung"], "ausloeser": als_json(r["ausloeser"]), "bedingungen": als_json(r["bedingungen"]), "aktionen": als_json(r["aktionen"])}
	if id:
		rid = v.kennung(id)
		if not rid or not frappe.db.exists("Plattform Automation Regel", rid):
			nicht_gefunden("Regel nicht gefunden.")
		doc = frappe.get_doc("Plattform Automation Regel", rid)
		doc.update(werte)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": "Plattform Automation Regel", **werte, "erstellt_von": n.id}).insert(ignore_permissions=True)
	protokoll(n, "automation", "regel", doc.name, f"Regel „{r['name']}“ gespeichert ({'aktiv' if r['aktiv'] else 'inaktiv'})")
	return _regel_ausgabe(doc)


@frappe.whitelist(methods=["POST"])
def loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "automationen", 2)
	rid = v.kennung(id)
	if not rid or not frappe.db.exists("Plattform Automation Regel", rid):
		nicht_gefunden("Regel nicht gefunden.")
	name = frappe.db.get_value("Plattform Automation Regel", rid, "bezeichnung")
	frappe.db.set_value("Plattform Automation Lauf", {"regel_id": rid}, "regel_id", None, update_modified=False)  # Protokoll bleibt (Name steht im Eintrag)
	frappe.delete_doc("Plattform Automation Regel", rid, ignore_permissions=True, force=True)
	protokoll(n, "automation", "regel", rid, f"Regel „{name}“ gelöscht")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def testlauf(regelId=None, regel=None, bezugArt=None, bezugId=None, score=None, kategorie=None, als_benutzer=None):
	"""Mit Objekt: Regel in einer Transaktion ausführen, Wirkungen erfassen, dann zurückrollen (Savepoint) –
	nur der Testlauf-Eintrag bleibt. Ohne Objekt: Rückblick auf die letzten 50 Objekte der Art."""
	n = nutzer(als_benutzer)
	recht_noetig(n, "automationen", 1)
	if regelId:
		rid = v.kennung(regelId)
		if not rid or not frappe.db.exists("Plattform Automation Regel", rid):
			nicht_gefunden("Regel nicht gefunden.")
		r = bo.regel_dict(frappe.get_doc("Plattform Automation Regel", rid))
	else:
		b = bo.regel_bereinigen(regel)
		if b.get("fehler"):
			frappe.throw(b["fehler"], frappe.ValidationError)
		r = {"id": "R-TESTLAUF", "erstelltVon": n.id, **b["regel"]}
		_gegen_db(r)
	a = r["ausloeser"]
	art = a.get("art") or bezugArt or "vorgang"
	extra = {}
	if score not in (None, ""):
		extra["score"] = v.zahl(score, min=0, max=100)
	if kategorie:
		extra["kategorie"] = v.text(kategorie, 20)
	dt = bo.DOCTYPE[art]
	if not bezugId:
		objekte = []
		for name in frappe.get_all(dt, pluck="name", order_by="creation desc", limit=50):
			o = frappe.get_doc(dt, name)
			fk = bo.fakten_fuer(art, o, extra)
			pr = [{"feld": x["feld"], "ist": fk.get(x["feld"]), "erfuellt": bo.bedingung_erfuellt(x, fk)} for x in r["bedingungen"]]
			objekte.append({"id": o.name, "titel": bo.objekt_titel(art, o), "status": status_label(art, o.status), "passt": all(x["erfuellt"] for x in pr), "bedingungen": pr})
		return {"modus": "rueckblick", "art": art, "geprueft": len(objekte), "treffer": sum(1 for o in objekte if o["passt"]), "objekte": objekte}
	o = objekt_laden(art, bezugId)
	if not o:
		nicht_gefunden("Objekt nicht gefunden.")
	vorher = {"aufgaben": set(frappe.get_all("Plattform Aufgabe", pluck="name")), "status": o.status, "zustaendig": o.get("zustaendig_id"), "tags": set(bo.info_json(art, o.name)["tags"])}
	frappe.db.savepoint("bo_testlauf")
	try:
		ergebnisse = bo.ausfuehren({"typ": a["typ"], "art": art, "objekt": o, "frist": a.get("frist"), "nach": a.get("nach") or o.status, "von": a.get("von"), "extra": extra}, nur_regeln=[r], testlauf=True)
		o2 = objekt_laden(art, o.name)
		neue = [frappe.get_doc("Plattform Aufgabe", x) for x in set(frappe.get_all("Plattform Aufgabe", pluck="name")) - vorher["aufgaben"]]
		aenderungen = {
			"aufgaben": [{"titel": x.titel, "faelligAm": str(x.faellig_am), "zustaendig": name_von(x.zustaendig_id)} for x in neue],
			"mails": [{"an": x["text"].split(" an ")[-1], "betreff": x["text"], "text": ""} for e in ergebnisse for x in e.get("aktionen") or [] if x["typ"] == "mail" and x["ok"]],
			"nachrichten": [{"bezug": f"{art}:{o.name}", "text": x["text"]} for e in ergebnisse for x in e.get("aktionen") or [] if x["typ"] == "nachricht" and x["ok"]],
			"status": {"von": status_label(art, vorher["status"]), "nach": status_label(art, o2.status)} if o2.status != vorher["status"] else None,
			"zustaendig": name_von(o2.get("zustaendig_id")) if o2.get("zustaendig_id") != vorher["zustaendig"] else None,
			"tags": sorted(set(bo.info_json(art, o.name)["tags"]) - vorher["tags"]),
		}
	finally:
		frappe.db.rollback(save_point="bo_testlauf")
	frappe.get_doc({"doctype": "Plattform Automation Lauf", "am": jetzt(), "regel_id": r["id"] if regelId else None, "regel_name": r["name"], "ausloeser": a["typ"], "art": art, "objekt_id": o.name, "objekt_titel": bo.objekt_titel(art, o), "tiefe": 0, "testlauf": 1, "status": "testlauf", "bedingungen": als_json((ergebnisse[0] if ergebnisse else {}).get("bedingungen") or []), "aktionen": als_json([x for e in ergebnisse for x in e.get("aktionen") or []]), "text": f"Testlauf von {name_von(n.id)} – nichts wurde ausgeführt."}).insert(ignore_permissions=True)
	return {"modus": "objekt", "art": art, "objekt": {"id": o.name, "titel": bo.objekt_titel(art, o), "status": status_label(art, o.status)}, "protokoll": [{"id": f"T{i}", **e, "regelName": e.get("regel_name"), "testlauf": True} for i, e in enumerate(ergebnisse)], "aenderungen": aenderungen}


@frappe.whitelist(methods=["POST"])
def fristen_pruefen(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "automationen", 2)
	return {"ok": True, "ausgeloest": bo.fristen_pruefen_intern()}


@frappe.whitelist(methods=["POST"])
def tag_setzen(art=None, id=None, tag=None, an=True, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	v.pflicht(art in BEREICH_TAG, "Unbekannte Objektart.")
	recht_noetig(n, BEREICH_TAG[art], 2)
	t = v.text(tag, 40)
	v.pflicht(len(t) >= 2, "Tag: mind. 2 Zeichen.")
	o = objekt_laden(art, id)
	if not o:
		nicht_gefunden()
	tags = bo.tag_setzen(art, o.name, t, an is not False)
	protokoll(n, "tag", art, o.name, f"Tag {'gesetzt' if an is not False else 'entfernt'}: {t}")
	return {"ok": True, "tags": tags}


# ================================================================ Vorlagen


def _vl_ausgabe(vl):
	a = bo.vorlage_aktuell(vl)
	regeln = [{"id": r.name, "name": r.bezeichnung} for r in frappe.get_all("Plattform Automation Regel", fields=["name", "bezeichnung", "aktionen"]) if vl.name in (r.aktionen or "")]
	return {"id": vl.name, "name": vl.bezeichnung, "kanal": vl.kanal, "aktiv": bool(cint(vl.aktiv)), "version": cint(vl.version), "betreff": a.betreff or "", "text": a.text or "", "geaendertAm": iso(a.am), "geaendertVon": name_von(a.von_id) or "System", "versionen": [{"version": cint(x.version), "betreff": x.betreff or "", "text": x.text or "", "am": iso(x.am), "vonId": x.von_id, "von": name_von(x.von_id) or "System", "kommentar": x.kommentar or ""} for x in reversed(vl.versionen)], "verwendetIn": regeln}


def _vl_pruefen(name, kanal, betreff, text):
	if len(name) < 3:
		return "Bitte einen Namen (mind. 3 Zeichen) angeben."
	if kanal == "email" and len(betreff) < 3:
		return "Bitte einen Betreff angeben."
	if len(text) < 10:
		return "Der Text ist zu kurz (mind. 10 Zeichen)."
	unbekannt = sorted({m.group(1) for m in bo.MUSTER.finditer(f"{betreff}\n{text}")} - bo.PLATZHALTER)
	if unbekannt:
		return "Unbekannte Platzhalter: " + ", ".join(f"{{{{{k}}}}}" for k in unbekannt)
	return ""


@frappe.whitelist(methods=["POST"])
def vorlagen(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "vorlagen", 1)
	return [_vl_ausgabe(frappe.get_doc("Plattform Vorlage", x)) for x in frappe.get_all("Plattform Vorlage", pluck="name", order_by="bezeichnung asc")]


@frappe.whitelist(methods=["POST"])
def vorlage_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "vorlagen", 2)
	d = daten if isinstance(daten, dict) else {}
	name, kanal = v.text(d.get("name"), 120), v.auswahl(d.get("kanal"), ["email", "nachricht"], "email")
	betreff, text = v.text(d.get("betreff"), 200), v.mehrzeilig(d.get("text"), 8000)
	fehler = _vl_pruefen(name, kanal, betreff, text)
	if fehler:
		frappe.throw(fehler, frappe.ValidationError)
	kommentar = v.text(d.get("kommentar"), 200)
	if id:
		vid = v.kennung(id)
		if not vid or not frappe.db.exists("Plattform Vorlage", vid):
			nicht_gefunden("Vorlage nicht gefunden.")
		vl = frappe.get_doc("Plattform Vorlage", vid)
		a = bo.vorlage_aktuell(vl)
		vl.bezeichnung, vl.kanal = name, kanal
		if isinstance(d.get("aktiv"), bool):
			vl.aktiv = 1 if d["aktiv"] else 0
		if (a.betreff or "") != betreff or (a.text or "") != text:
			neu = max(cint(x.version) for x in vl.versionen) + 1
			vl.append("versionen", {"version": neu, "betreff": betreff, "text": text, "am": jetzt(), "von_id": n.id, "kommentar": kommentar})
			vl.version = neu
		vl.save(ignore_permissions=True)
	else:
		vl = frappe.get_doc({"doctype": "Plattform Vorlage", "bezeichnung": name, "kanal": kanal, "aktiv": 1, "version": 1, "versionen": [{"version": 1, "betreff": betreff, "text": text, "am": jetzt(), "von_id": n.id, "kommentar": kommentar or "Erste Fassung"}]}).insert(ignore_permissions=True)
	protokoll(n, "vorlage", "vorlage", vl.name, f"Vorlage „{name}“: Version {vl.version}")
	return _vl_ausgabe(vl)


@frappe.whitelist(methods=["POST"])
def vorlage_wiederherstellen(id=None, version=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "vorlagen", 2)
	vid = v.kennung(id)
	if not vid or not frappe.db.exists("Plattform Vorlage", vid):
		nicht_gefunden("Vorlage nicht gefunden.")
	vl = frappe.get_doc("Plattform Vorlage", vid)
	alt = next((x for x in vl.versionen if cint(x.version) == cint(version)), None)
	if not alt:
		nicht_gefunden("Version nicht gefunden.")
	neu = max(cint(x.version) for x in vl.versionen) + 1
	vl.append("versionen", {"version": neu, "betreff": alt.betreff, "text": alt.text, "am": jetzt(), "von_id": n.id, "kommentar": f"Wiederhergestellt aus Version {alt.version}"})
	vl.version = neu
	vl.save(ignore_permissions=True)
	protokoll(n, "vorlage", "vorlage", vl.name, f"Vorlage „{vl.bezeichnung}“: Version {alt.version} als {neu} wiederhergestellt")
	return _vl_ausgabe(vl)


BEISPIEL = {"anrede": "Frau", "briefanrede": "Sehr geehrte Frau Musterfrau", "vorname": "Erika", "nachname": "Musterfrau", "firma": "Demo-Hof GbR", "email": "erika@example.com", "ort": "Demo-Ort", "vorgang": {"id": "V-26-ABC123", "typ": "Fläche verpachten", "status": "In Prüfung"}, "flaeche": {"bezeichnung": "Acker am Mühlweg", "ha": "18,5", "ort": "Demo-Ort", "bundesland": "Bayern", "score": 72, "mwp": "16,8", "status": "Vorprüfung"}, "projekt": {"titel": "Freiflächen-PV 24 MWp in Niederbayern", "mwp": 24, "phase": "Satzungsbeschluss / Baurecht", "land": "Deutschland", "status": "Veröffentlicht"}, "zustaendig": {"name": "Backoffice Demo", "vorname": "Backoffice"}, "portal": {"link": "https://www.oekoinvest.com/portal"}, "heute": "30.09.2026"}


def _kontakt(kontakt_id):
	if not kontakt_id:
		return None
	if not frappe.db.exists("Plattform CRM Kontakt", v.kennung(kontakt_id)):
		nicht_gefunden("Kontakt nicht gefunden.")
	return frappe.get_doc("Plattform CRM Kontakt", v.kennung(kontakt_id)).as_dict()


@frappe.whitelist(methods=["POST"])
def vorlage_vorschau(vorlageId=None, betreff=None, text=None, bezugArt=None, bezugId=None, kontaktId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "vorlagen", 1)
	vl = frappe.get_doc("Plattform Vorlage", v.kennung(vorlageId)) if vorlageId and frappe.db.exists("Plattform Vorlage", v.kennung(vorlageId)) else None
	a = bo.vorlage_aktuell(vl) if vl else frappe._dict(betreff="", text="")
	quelle_b = v.text(betreff, 200) if betreff is not None else a.betreff or ""
	quelle_t = v.mehrzeilig(text, 8000) if text is not None else a.text or ""
	o = objekt_laden(bezugArt, bezugId) if bezugArt in BEREICH_TAG and bezugId else None
	if bezugId and not o:
		nicht_gefunden("Objekt für die Vorschau nicht gefunden.")
	k = _kontakt(kontaktId)
	ktx = bo.kontext_fuer(bezugArt, o, kontakt=k) if (o or k) else BEISPIEL
	b, t = bo.rendern(quelle_b, ktx), bo.rendern(quelle_t, ktx)
	return {"betreff": b["text"], "text": t["text"], "unbekannt": sorted(set(b["unbekannt"] + t["unbekannt"])), "leer": sorted(set(b["leer"] + t["leer"])), "beispiel": not (o or k)}


@frappe.whitelist(methods=["POST"])
def vorlage_senden(vorlageId=None, kontaktId=None, bezugArt=None, bezugId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "vorlagen", 1)
	recht_noetig(n, "crm", 2)
	vid = v.kennung(vorlageId)
	if not vid or not frappe.db.exists("Plattform Vorlage", vid) or not cint(frappe.db.get_value("Plattform Vorlage", vid, "aktiv")):
		nicht_gefunden("Vorlage nicht gefunden oder inaktiv.")
	vl = frappe.get_doc("Plattform Vorlage", vid)
	o = objekt_laden(bezugArt, bezugId) if bezugArt in BEREICH_TAG and bezugId else None
	k = _kontakt(kontaktId)
	ktx = bo.kontext_fuer(bezugArt, o, kontakt=k)
	a = bo.vorlage_aktuell(vl)
	b, t = bo.rendern(a.betreff, ktx), bo.rendern(a.text, ktx)
	v.pflicht(not (b["unbekannt"] or t["unbekannt"]), "Die Vorlage enthält unbekannte Platzhalter.")
	if vl.kanal == "nachricht":
		v.pflicht(o, "Portal-Nachrichten brauchen ein Objekt (Vorgang, Fläche, Projekt, Interesse).")
		nachricht_anlegen(bezugArt, o.name, von_id=n.id, von_admin=True, system=False, text=t["text"])
		protokoll(n, "vorlage_gesendet", bezugArt, o.name, f"Nachricht aus Vorlage „{vl.bezeichnung}“ (v{vl.version})")
		return {"ok": True, "kanal": "nachricht"}
	an = (k or {}).get("email") or ktx.get("email")
	v.pflicht(an, "Für diesen Kontakt ist keine E-Mail-Adresse hinterlegt.")
	bo.vorlage_mail(an, b["text"], t["text"])
	if k:
		frappe.get_doc({"doctype": "Plattform CRM Aktivitaet", "kontakt_id": k.get("name"), "organisation_id": k.get("organisation_id"), "typ": "email", "betreff": v.text(b["text"], 160), "text": v.mehrzeilig(t["text"], 3000), "am": jetzt(), "bezug_art": bezugArt if o else None, "bezug_id": o.name if o else None, "von_id": n.id, "vorlage_id": vl.name}).insert(ignore_permissions=True)
	protokoll(n, "vorlage_gesendet", bezugArt if o else "kontakt", o.name if o else (k or {}).get("name") or "", f"E-Mail aus Vorlage „{vl.bezeichnung}“ (v{vl.version}) an {an}")
	return {"ok": True, "kanal": "email"}
