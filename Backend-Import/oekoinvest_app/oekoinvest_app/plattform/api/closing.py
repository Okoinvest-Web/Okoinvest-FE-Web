# Copyright (c) 2026, ÖkoInvest GmbH
#
# Grundbuch & Dienstbarkeiten + Deal-Abschluss (Closing) – Vertrag: docs/API.md, Abschnitt „Grundbuch & Closing“.
# Referenz: src/lib/plattform/backend/demo/closing.js. Regeln: plattform/closing_kern.py (1:1 wie closing/*.js).
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Backoffice – Rolle admin mit Bereich „grundbuch“ bzw. „closing“ (rechte.py): lesen ≥ 1, schreiben = 2
#   Eigentümer – nur eigene Grundbuch-Akte (eigentuemer_id), vereinfachte Ausgabe ohne interne Notizen
#   Käufer/Verkäufer – nur eigene Closing-Räume; Gegenseite anonym bis zur Kontaktfreigabe; CP melden nur in eigener Verantwortung
# Closing nur mit KYC beider Seiten (kyc_kern.kyc_status), Provision über den Zustandsautomaten (Projekt → verkauft),
# Provisionsrechnung über den Hook „Plattform Provision after_insert“ (finanzen.abrechnung.provision_angelegt).
# KEINE Rechtsberatung – Muster und Kosten sind Orientierung.

import base64
import binascii
import secrets

import frappe
from frappe.utils import cint, flt, get_datetime, nowdate

from oekoinvest_app.plattform import closing_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt_iso, konflikt, kurz, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

DT_GB = "Plattform Grundbuch Vorgang"
DT_CL = "Plattform Closing"
MIME = {b"%PDF-": "application/pdf", b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}


def _lesen(n, bereich):
	return bool(n) and ist_admin(n) and stufe(n, bereich) >= 1


def _schreiben(n, bereich):
	return bool(n) and ist_admin(n) and stufe(n, bereich) >= 2


def _lese_noetig(n, bereich):
	if not n:
		nicht_angemeldet()
	if not _lesen(n, bereich):
		verboten("Nur für das Backoffice.")


def _schreib_noetig(n, bereich, label):
	if not n:
		nicht_angemeldet()
	if not _schreiben(n, bereich):
		verboten(f"Ihre Backoffice-Rolle erlaubt im Bereich „{label}“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice.")


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.GrundbuchFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _heute():
	return nowdate()


def _verlauf_add(doc, n, text, oeffentlich=False):
	liste = aus_json(doc.verlauf, []) or []
	liste.append({"am": jetzt_iso(), "vonId": (n.get("id") if n else None), "text": v.text(text, 300), "oeffentlich": bool(oeffentlich)})
	doc.verlauf = als_json(liste[-300:])


def _melden(konto_id, titel, text, link, objekt_art, objekt_id, mail=True, mail_text=None):
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	anlegen(konto_id, "status", titel, text, link, objekt_art, objekt_id, mail=mail, mail_text=mail_text)


def _admins(bereich, st=2):
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins
	from oekoinvest_app.plattform.kern import konto_json

	out = []
	for k in aktive_admins()[:50]:
		n = frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k)))
		if stufe(n, bereich) >= st:
			out.append(k)
	return out[:5]


# ================================================================ Grundbuch – Abbildung Doc ↔ dict (camelCase wie Website)


def _akte_dict(doc):
	return {
		"id": doc.name, "titel": doc.titel, "land": doc.land, "objektArt": doc.objekt_art, "recht": doc.recht, "abgebrochen": bool(cint(doc.abgebrochen)),
		"erstelltAm": iso(doc.creation), "bezugArt": doc.bezug_art, "bezugId": doc.flaeche_id or doc.anlage_id or None,
		"eigentuemerId": doc.eigentuemer_id or None, "eigentuemerName": doc.eigentuemer_name or "", "eigentuemerAnschrift": doc.eigentuemer_anschrift or "", "eigentuemerAnzahl": cint(doc.eigentuemer_anzahl) or 1,
		"grundstueck": {"bezeichnung": doc.grundstueck_bezeichnung or "", "grundbuch": doc.grundbuch or "", "flurstuecke": doc.flurstuecke or "", "gebaeude": doc.gebaeude or ""},
		"berechtigter": doc.berechtigter or "ÖkoInvest GmbH", "entgeltJahr": flt(doc.entgelt_jahr), "laufzeitJahre": cint(doc.laufzeit_jahre) or 25, "laufzeitBeginn": doc.laufzeit_beginn or "",
		"vertragBezug": doc.vertrag_bezug or "", "pfandglaeubiger": aus_json(doc.pfandglaeubiger, []) or [], "notiz": doc.notiz or "",
		"schritte": [{
			"schluessel": s.schluessel, "reihenfolge": cint(s.reihenfolge), "status": s.status or "offen", "datum": str(s.datum or ""), "frist": str(s.frist or ""),
			"nachweisWert": s.nachweis_wert or "", "dokumentId": s.dokument or None, "signaturId": s.signatur_id or None, "notiz": s.notiz or "", "vonId": s.von_id or None,
		} for s in doc.get("schritte") or []],
		"verlauf": aus_json(doc.verlauf, []) or [],
	}


def _schritte_speichern(doc, schritte):
	defs = {d["schluessel"]: d for d in K.schritte_fuer(doc.land)}
	doc.set("schritte", [])
	for s in schritte:
		doc.append("schritte", {
			"schluessel": s["schluessel"], "reihenfolge": s.get("reihenfolge"), "label": defs.get(s["schluessel"], {}).get("label", s["schluessel"]), "status": s.get("status") or "offen",
			"datum": s.get("datum") or None, "frist": s.get("frist") or None, "nachweis_wert": s.get("nachweisWert") or "", "dokument": s.get("dokumentId") or None,
			"signatur_id": s.get("signaturId") or None, "notiz": s.get("notiz") or "", "von_id": s.get("vonId") or None,
		})


def _akte_status_setzen(doc):
	a = _akte_dict(doc)
	doc.status = K.akte_status(a)
	fr = [s["fristBerechnet"] for s in K.fristen_berechnen(a, _heute()) if s.get("status") not in K.FERTIG and s.get("fristBerechnet")]
	doc.naechste_frist = min(fr) if fr else None
	# Anlage spiegelt den Dienstbarkeitsstatus (Anlagen & Monitoring)
	if doc.anlage_id and frappe.db.exists("Plattform Anlage", doc.anlage_id):
		st = K.anlagen_dienstbarkeit_status(a)
		schritt = next((s for s in a["schritte"] if s["schluessel"] == ("eintragung" if st == "eingetragen" else "antrag")), {})
		frappe.db.set_value("Plattform Anlage", doc.anlage_id, {
			"dienstbarkeit_status": st, "dienstbarkeit_datum": schritt.get("datum") or (None if st == "vorbereitung" else _heute()),
			"dienstbarkeit_hinweis": f"Grundbuch-Akte {doc.name}: {K.GB_STATUS.get(doc.status, {}).get('label', '')}"[:200],
		})


def _rolle_akte(n, doc):
	if _lesen(n, "grundbuch"):
		return "backoffice"
	if n and doc.eigentuemer_id and doc.eigentuemer_id == n.id:
		return "eigentuemer"
	return None


def _akte_laden(n, kennung_):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung_)
	if not k or not frappe.db.exists(DT_GB, k):
		nicht_gefunden("Grundbuch-Akte nicht gefunden.")
	doc = frappe.get_doc(DT_GB, k)
	rolle = _rolle_akte(n, doc)
	if not rolle:
		verboten("Diese Grundbuch-Akte betrifft Ihr Konto nicht.")
	return doc, rolle


def _bezug(doc):
	if doc.flaeche_id:
		f = frappe.db.get_value("Plattform Flaeche", doc.flaeche_id, ["name", "bezeichnung", "status"], as_dict=True)
		if f:
			return {"art": "flaeche", "id": f.name, "titel": f.bezeichnung, "status": f.status, "link": f"/portal/flaechen/{f.name}", "portalLink": f"/portal/flaechen/{f.name}"}
	if doc.anlage_id:
		x = frappe.db.get_value("Plattform Anlage", doc.anlage_id, ["name", "titel", "status", "dienstbarkeit_status"], as_dict=True)
		if x:
			return {"art": "anlage", "id": x.name, "titel": x.titel, "status": x.status, "dienstbarkeitStatus": x.dienstbarkeit_status or "", "link": f"/portal/admin/anlagen/{x.name}", "portalLink": f"/portal/anlagen/{x.name}"}
	return None


def _signatur_status(sid):
	if not sid or not frappe.db.exists("Plattform Signaturvorgang", sid):
		return None
	s = frappe.db.get_value("Plattform Signaturvorgang", sid, ["name", "status", "titel"], as_dict=True)
	return {"id": s.name, "status": s.status, "titel": s.titel}


def _akte_ausgabe(n, doc, detail=False):
	a = _akte_dict(doc)
	rolle = _rolle_akte(n, doc)
	bo = rolle == "backoffice"
	status = K.akte_status(a)
	mit_frist = K.fristen_berechnen(a, _heute())
	naechster = K.naechster_schritt(a)
	fristen = sorted(s["fristBerechnet"] for s in mit_frist if s.get("status") not in K.FERTIG and s.get("fristBerechnet"))
	basis = {
		"id": doc.name, "titel": doc.titel, "land": doc.land, "landLabel": K.GB_LAENDER.get(doc.land), "objektArt": doc.objekt_art, "objektArtLabel": (K.GB_OBJEKTARTEN.get(doc.objekt_art) or {}).get("kurz"),
		"recht": doc.recht, "rechtLabel": ((K.GB_RECHTE.get(doc.land) or {}).get(doc.recht) or {}).get("label", ""), "status": status, "statusLabel": K.GB_STATUS.get(status, {}).get("label", status),
		"fortschritt": K.fortschritt(a), "naechster": {"schluessel": naechster["schluessel"], "label": naechster["label"]} if naechster else None,
		"ueberfaellig": len([s for s in mit_frist if s.get("ueberfaellig")]), "naechsteFrist": fristen[0] if fristen else "",
		"bezug": _bezug(doc), "eigentuemerName": doc.eigentuemer_name or "", "erstelltAm": iso(doc.creation), "geaendertAm": iso(doc.modified), "meineRolle": rolle,
	}
	if not detail:
		return basis
	defs = {d["schluessel"]: d for d in K.schritte_fuer(doc.land)}
	schritte = []
	for s in mit_frist:
		d = defs.get(s["schluessel"], {})
		schritte.append({
			"schluessel": s["schluessel"], "label": d.get("label"), "status": s["status"], "statusLabel": K.GB_SCHRITT_STATUS.get(s["status"], {}).get("label"), "datum": s.get("datum") or "",
			"frist": s.get("fristBerechnet") or "", "ueberfaellig": s.get("ueberfaellig"), "optional": bool(d.get("optional")), "nachweis": d.get("nachweis") or "", "nachweisLabel": d.get("nachweisLabel") or "",
			"nachweisWert": s.get("nachweisWert") or "" if (bo or s["schluessel"] == "eintragung") else "", "dokumentId": s.get("dokumentId"), "text": d.get("text") if bo else None, "portal": d.get("portal"),
			"signaturMoeglich": bo and bool(d.get("signatur")) and bool(doc.eigentuemer_id), "signatur": _signatur_status(s.get("signaturId")), "notiz": s.get("notiz") if bo else None,
			"darfZuruecksetzen": bo and s["status"] == "erledigt" and K.zuruecksetzen_erlaubt(a, s["schluessel"]),
		})
	kosten = K.grundbuch_kosten(doc.land, a["entgeltJahr"], a["laufzeitJahre"], len(a["pfandglaeubiger"]), a["eigentuemerAnzahl"])
	dokumente = []
	for s in doc.get("schritte") or []:
		if s.dokument and (bo or s.schluessel == "eintragung") and frappe.db.exists("File", {"file_url": s.dokument}):
			f = frappe.db.get_value("File", {"file_url": s.dokument}, ["name", "file_name", "file_size", "creation"], as_dict=True)
			dokumente.append({"id": f.name, "name": f.file_name, "schritt": s.schluessel, "am": iso(f.creation), "groesse": f.file_size})
	return {
		**basis, "schritte": schritte, "kosten": kosten, "einleitung": K.GB_PORTAL_EINLEITUNG.get(doc.land) or K.GB_PORTAL_EINLEITUNG["DE"], "hinweis": K.GB_HINWEIS,
		"vorlagen": [{"id": k, "label": x["label"]} for k, x in K.GB_VORLAGEN.items() if bo or doc.objekt_art in x["objektarten"]],
		"grundstueck": a["grundstueck"], "berechtigter": a["berechtigter"], "entgeltJahr": a["entgeltJahr"], "laufzeitJahre": a["laufzeitJahre"], "laufzeitBeginn": a["laufzeitBeginn"],
		"pfandglaeubiger": a["pfandglaeubiger"] if bo else [{"name": g.get("name")} for g in a["pfandglaeubiger"]],
		"eigentuemerId": doc.eigentuemer_id if bo else None, "eigentuemerAnschrift": a["eigentuemerAnschrift"] if bo else None, "eigentuemerAnzahl": a["eigentuemerAnzahl"],
		"vertragBezug": a["vertragBezug"], "notiz": a["notiz"] if bo else None, "abgebrochen": a["abgebrochen"], "dokumente": dokumente,
		"verlauf": a["verlauf"] if bo else [{"am": x.get("am"), "text": x.get("text")} for x in a["verlauf"] if x.get("oeffentlich")],
		"darfBearbeiten": _schreiben(n, "grundbuch"),
	}


def _stammdaten(doc, d):
	if "titel" in d:
		doc.titel = v.text(d.get("titel"), 140) or doc.titel
	if "recht" in d:
		doc.recht = K.recht_fuer(doc.land, d.get("recht"))
	for feld, key, laenge in (("berechtigter", "berechtigter", 160), ("eigentuemer_name", "eigentuemerName", 160), ("eigentuemer_anschrift", "eigentuemerAnschrift", 200), ("laufzeit_beginn", "laufzeitBeginn", 80), ("vertrag_bezug", "vertragBezug", 160)):
		if key in d:
			setattr(doc, feld, v.text(d.get(key), laenge))
	if "eigentuemerAnzahl" in d:
		doc.eigentuemer_anzahl = max(1, min(20, cint(d.get("eigentuemerAnzahl")) or 1))
	if "entgeltJahr" in d:
		doc.entgelt_jahr = v.zahl(d.get("entgeltJahr"), min=0, max=1e8) or 0
	if "laufzeitJahre" in d:
		doc.laufzeit_jahre = max(1, min(99, cint(d.get("laufzeitJahre")) or 20))
	if "notiz" in d:
		doc.notiz = v.mehrzeilig(d.get("notiz"), 2000)
	if isinstance(d.get("grundstueck"), dict):
		g = d["grundstueck"]
		doc.grundstueck_bezeichnung = v.text(g.get("bezeichnung"), 160) or doc.grundstueck_bezeichnung
		doc.grundbuch = v.text(g.get("grundbuch"), 160)
		doc.flurstuecke = v.text(g.get("flurstuecke"), 300)
		doc.gebaeude = v.text(g.get("gebaeude"), 160)
	if "pfandglaeubiger" in d:
		liste = [{"name": v.text(x.get("name"), 120), "recht": v.text(x.get("recht"), 160), "kontakt": v.text(x.get("kontakt"), 160)} for x in (d.get("pfandglaeubiger") or [])[:9] if isinstance(x, dict)]
		doc.pfandglaeubiger = als_json([x for x in liste if len(x["name"]) >= 2])


# ================================================================ Grundbuch – Methoden


@frappe.whitelist(methods=["POST"])
def gb_liste(status=None, land=None, q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n, "grundbuch")
	namen = frappe.get_all(DT_GB, pluck="name", order_by="modified desc", limit_page_length=2000)
	alle = [_akte_ausgabe(n, frappe.get_doc(DT_GB, x)) for x in namen]
	such = str(q or "").lower()[:80]
	akten = [a for a in alle if (not status or (a["status"] in K.GB_OFFEN if status == "offen" else a["status"] == status)) and (not land or a["land"] == land)]
	akten = [a for a in akten if not such or any(such in str(x or "").lower() for x in (a["id"], a["titel"], a["eigentuemerName"], (a["bezug"] or {}).get("titel")))]
	akten.sort(key=lambda a: a["naechsteFrist"] or "9999")
	offen = [a for a in alle if a["status"] in K.GB_OFFEN]
	return {
		"akten": akten,
		"kennzahlen": {"gesamt": len(alle), "offen": len(offen), "eingereicht": len([a for a in alle if a["status"] == "eingereicht"]), "eingetragen": len([a for a in alle if a["status"] == "eingetragen"]), "ueberfaellig": len([a for a in offen if a["ueberfaellig"]])},
		"bericht": [{"id": a["id"], "titel": a["titel"], "land": a["land"], "status": a["statusLabel"], "naechster": (a["naechster"] or {}).get("label", ""), "frist": a["naechsteFrist"], "ueberfaellig": a["ueberfaellig"], "eigentuemer": a["eigentuemerName"], "bezug": (a["bezug"] or {}).get("titel", "")} for a in offen],
		"schreiben": _schreiben(n, "grundbuch"),
	}


@frappe.whitelist(methods=["POST"])
def gb_meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	return {"akten": [_akte_ausgabe(n, frappe.get_doc(DT_GB, x)) for x in frappe.get_all(DT_GB, filters={"eigentuemer_id": n.id}, pluck="name", limit_page_length=200)]}


@frappe.whitelist(methods=["POST"])
def gb_zu_bezug(bezugArt=None, bezugId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	feld = {"flaeche": "flaeche_id", "anlage": "anlage_id"}.get(bezugArt)
	k = v.kennung(bezugId)
	if not feld or not k:
		return {"akten": []}
	out = []
	for x in frappe.get_all(DT_GB, filters={feld: k}, pluck="name", limit_page_length=20):
		doc = frappe.get_doc(DT_GB, x)
		if _rolle_akte(n, doc):
			out.append(_akte_ausgabe(n, doc))
	return {"akten": out}


@frappe.whitelist(methods=["POST"])
def gb_akte(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, rolle = _akte_laden(n, id)
	# Signatur-Modul: vollständig unterschrieben → Schritt „unterschrift“ erledigen
	for s in doc.get("schritte") or []:
		if s.schluessel == "unterschrift" and s.signatur_id and s.status != "erledigt" and rolle == "backoffice" and _schreiben(n, "grundbuch"):
			sig = _signatur_status(s.signatur_id)
			if sig and sig["status"] == "abgeschlossen":
				s.status = "erledigt"
				s.datum = _heute()
				_verlauf_add(doc, None, "Unterschrift über das Signatur-Modul abgeschlossen – Schritt erledigt.", True)
				_akte_status_setzen(doc)
				doc.save(ignore_permissions=True)
	return _akte_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def gb_auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n, "grundbuch")
	belegt = set()
	for r in frappe.get_all(DT_GB, filters={"abgebrochen": 0}, fields=["flaeche_id", "anlage_id"], limit_page_length=5000):
		belegt.add(r.flaeche_id or r.anlage_id)
	flaechen = [{"id": f.name, "titel": f.bezeichnung, "land": f.land or "DE", "status": f.status, "eigentuemer": name_von(f.nutzer_id), "belegt": f.name in belegt, "dach": f.nutzung == "dach"}
		for f in frappe.get_all("Plattform Flaeche", filters={"status": ["in", ["pachtangebot", "vertrag", "planung", "bau", "betrieb"]]}, fields=["name", "bezeichnung", "land", "status", "nutzer_id", "nutzung"], limit_page_length=2000)]
	anlagen = [{"id": x.name, "titel": x.titel, "land": x.land or "DE", "typ": x.typ, "dienstbarkeitStatus": x.dienstbarkeit_status or "", "belegt": x.name in belegt, "dach": x.typ in ("dach", "carport")}
		for x in frappe.get_all("Plattform Anlage", filters={"dienstbarkeit_status": ["!=", "nicht_erforderlich"]}, fields=["name", "titel", "land", "typ", "dienstbarkeit_status"], limit_page_length=2000)]
	return {"flaechen": flaechen, "anlagen": anlagen, "laender": K.GB_LAENDER, "rechte": K.GB_RECHTE, "objektarten": K.GB_OBJEKTARTEN}


@frappe.whitelist(methods=["POST"])
def gb_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten")
	d = aus_json(daten, {}) or {}
	bezug_art = v.auswahl(d.get("bezugArt"), ["flaeche", "anlage", "frei"], "frei")
	land = v.auswahl(d.get("land"), list(K.GB_LAENDER), "DE")
	objekt_art = v.auswahl(d.get("objektArt"), list(K.GB_OBJEKTARTEN), "freiflaeche")
	doc = frappe.new_doc(DT_GB)
	doc.bezug_art = bezug_art
	eigentuemer_id, eigentuemer_name, titel = None, v.text(d.get("eigentuemerName"), 160), v.text(d.get("titel"), 140)
	ohne_pfand = v.wahr(d.get("ohnePfandrecht"))
	if bezug_art == "flaeche":
		k = v.kennung(d.get("bezugId"))
		if not k or not frappe.db.exists("Plattform Flaeche", k):
			nicht_gefunden("Fläche nicht gefunden.")
		f = frappe.get_doc("Plattform Flaeche", k)
		land = f.land if f.land in K.GB_LAENDER else "DE"
		objekt_art = "dach" if f.nutzung == "dach" else "freiflaeche"
		eigentuemer_id = f.nutzer_id or None
		eigentuemer_name = eigentuemer_name or name_von(f.nutzer_id)
		titel = titel or f"Dienstbarkeit {f.bezeichnung}"
		doc.flaeche_id = f.name
		doc.grundstueck_bezeichnung = f.bezeichnung
		doc.grundbuch = f"{'KG' if land == 'AT' else 'Gemarkung'} {f.gemarkung}" if f.gemarkung else ""
		doc.flurstuecke = ", ".join(" ".join(str(x) for x in (r.get("gemarkung"), r.get("flur"), r.get("nummer")) if x) for r in (f.get("flurstuecke") or []) if hasattr(r, "get"))
		fach = aus_json(f.fach, {}) or {}
		if "grundschuld" in ((fach.get("eigentum") or {}).get("belastungen") or []):
			ohne_pfand = False
		pa = aus_json(f.pachtangebot, {}) or {}
		if not d.get("entgeltJahr") and pa.get("euroProHaJahr") and f.ha:
			d["entgeltJahr"] = round(flt(pa["euroProHaJahr"]) * flt(f.ha))
		if not d.get("laufzeitJahre") and pa.get("laufzeitJahre"):
			d["laufzeitJahre"] = pa["laufzeitJahre"]
		doc.vertrag_bezug = f"Pachtangebot zur Fläche {f.name}"
	elif bezug_art == "anlage":
		k = v.kennung(d.get("bezugId"))
		if not k or not frappe.db.exists("Plattform Anlage", k):
			nicht_gefunden("Anlage nicht gefunden.")
		x = frappe.get_doc("Plattform Anlage", k)
		land = x.land if x.land in K.GB_LAENDER else "DE"
		objekt_art = "dach" if x.typ in ("dach", "carport", "speicher") else "freiflaeche"
		eigentuemer_id = x.kunde_id if cint(x.dachgeber_ist_kunde) else None
		eigentuemer_name = eigentuemer_name or ((kurz(x.kunde_id) or {}).get("firma") or name_von(x.kunde_id) if cint(x.dachgeber_ist_kunde) else x.dachgeber or "")
		titel = titel or f"Dienstbarkeit {x.titel}"
		doc.anlage_id = x.name
		doc.grundstueck_bezeichnung = x.titel
		doc.gebaeude = ", ".join(y for y in (x.ort, x.bundesland) if y)
		cv = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": x.name}, "name")
		doc.vertrag_bezug = f"Contracting-Vertrag {cv}" if cv else ""
	else:
		v.pflicht(len(titel) >= 3, "Bitte geben Sie einen Titel an.")
		v.pflicht(len(eigentuemer_name) >= 2, "Bitte geben Sie den Eigentümer an.")
		if d.get("eigentuemerEmail"):
			eigentuemer_id = frappe.db.get_value("Plattform Konto", {"email": v.email(d.get("eigentuemerEmail"))}, "name")
	if doc.flaeche_id or doc.anlage_id:
		filt = {"flaeche_id": doc.flaeche_id} if doc.flaeche_id else {"anlage_id": doc.anlage_id}
		if frappe.db.exists(DT_GB, {**filt, "abgebrochen": 0}):
			konflikt("Für dieses Objekt gibt es bereits eine Grundbuch-Akte.")
	doc.update({"titel": titel, "land": land, "objekt_art": objekt_art, "recht": K.recht_fuer(land, d.get("recht")), "eigentuemer_id": eigentuemer_id, "eigentuemer_name": eigentuemer_name,
		"berechtigter": "ÖkoInvest GmbH", "laufzeit_jahre": 25, "laufzeit_beginn": "Inbetriebnahme", "erstellt_von": n.id, "abgebrochen": 0})
	_stammdaten(doc, {k: d[k] for k in d if k not in ("titel", "grundstueck")} | ({"grundstueck": {**{"bezeichnung": doc.grundstueck_bezeichnung, "grundbuch": doc.grundbuch, "flurstuecke": doc.flurstuecke, "gebaeude": doc.gebaeude}, **{k2: w for k2, w in (d.get("grundstueck") or {}).items() if w}}} if isinstance(d.get("grundstueck"), dict) else {}))
	if aus_json(doc.pfandglaeubiger, []):
		ohne_pfand = False
	_schritte_speichern(doc, K.schritte_anlegen(land, ohne_pfand))
	_verlauf_add(doc, n, f"Akte angelegt ({K.GB_LAENDER[land]}, {K.GB_OBJEKTARTEN[objekt_art]['kurz']}).")
	doc.insert(ignore_permissions=True)
	_akte_status_setzen(doc)
	doc.save(ignore_permissions=True)
	protokoll(n, "grundbuch_anlegen", "grundbuch", doc.name, f"Grundbuch-Akte „{doc.titel}“ angelegt")
	if doc.eigentuemer_id:
		_melden(doc.eigentuemer_id, "Grundbuch: Eintragung der Dienstbarkeit vorbereitet", f"{doc.titel} – Sie sehen jeden Schritt im Portal.", f"/portal/grundbuch/{doc.name}", "grundbuch", doc.name, mail_text="Für Ihre Fläche bzw. Ihr Dach wird die Eintragung der Dienstbarkeit vorbereitet. Den Stand und die nächsten Schritte sehen Sie im Portal.")
	return _akte_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def gb_aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten")
	doc, _ = _akte_laden(n, id)
	d = aus_json(daten, {}) or {}
	if cint(doc.abgebrochen) and not v.wahr(d.get("wiederaufnehmen")):
		konflikt("Die Akte ist abgebrochen.")
	_stammdaten(doc, d)
	if "abgebrochen" in d:
		ab = v.wahr(d.get("abgebrochen"))
		if ab and K.akte_status(_akte_dict(doc)) == "eingetragen":
			konflikt("Eine eingetragene Dienstbarkeit wird über die Löschung beendet, nicht durch Abbruch.")
		if ab:
			v.pflicht(len(v.text(d.get("grund"), 300)) >= 5, "Bitte geben Sie einen Grund für den Abbruch an.")
		doc.abgebrochen = 1 if ab else 0
		_verlauf_add(doc, n, f"Akte abgebrochen: {v.text(d.get('grund'), 300)}" if ab else "Akte wieder aufgenommen.")
	else:
		_verlauf_add(doc, n, "Stammdaten geändert.")
	_akte_status_setzen(doc)
	doc.save(ignore_permissions=True)
	return _akte_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def gb_schritt(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten")
	doc, _ = _akte_laden(n, id)
	if cint(doc.abgebrochen):
		konflikt("Die Akte ist abgebrochen.")
	d = aus_json(daten, {}) or {}
	a = _akte_dict(doc)
	alt = next((s for s in a["schritte"] if s["schluessel"] == d.get("schluessel")), None)
	if not alt:
		ungueltig("Unbekannter Schritt.")
	if alt["status"] == "erledigt" and d.get("status") and d.get("status") != "erledigt" and not K.zuruecksetzen_erlaubt(a, alt["schluessel"]):
		konflikt("Ein nachfolgender Schritt ist bereits erledigt – bitte zuerst diesen zurücksetzen.")
	aenderung = {k: d[k] for k in ("schluessel", "status", "datum", "nachweisWert", "notiz") if k in d}
	neu = _fach(K.schritt_pruefen, a, aenderung, _heute())
	if "frist" in d:
		neu["frist"] = d.get("frist") if K._ist_datum(d.get("frist")) else ""
	neu["vonId"] = n.id
	a["schritte"] = [neu if s["schluessel"] == neu["schluessel"] else s for s in a["schritte"]]
	_schritte_speichern(doc, a["schritte"])
	label = next((x["label"] for x in K.schritte_fuer(doc.land) if x["schluessel"] == neu["schluessel"]), neu["schluessel"])
	_verlauf_add(doc, n, f"{label}: {K.GB_SCHRITT_STATUS[neu['status']]['label']}" + (f" ({neu['nachweisWert']})" if neu.get("nachweisWert") else ""), neu["status"] == "erledigt")
	vorher = doc.status_gemeldet or ""
	_akte_status_setzen(doc)
	if doc.status != vorher and doc.eigentuemer_id and doc.status in ("eingereicht", "eingetragen"):
		doc.status_gemeldet = doc.status
		eingetragen = doc.status == "eingetragen"
		_melden(doc.eigentuemer_id, "Grundbuch: Dienstbarkeit eingetragen" if eingetragen else "Grundbuch: Eintragung beantragt", doc.titel, f"/portal/grundbuch/{doc.name}", "grundbuch", doc.name,
			mail_text="Die Dienstbarkeit ist im Grundbuch eingetragen. Details im Portal." if eingetragen else "Die Eintragung der Dienstbarkeit wurde beim Grundbuch beantragt. Details im Portal.")
	doc.save(ignore_permissions=True)
	protokoll(n, "grundbuch_schritt", "grundbuch", doc.name, f"{neu['schluessel']} → {neu['status']}")
	return _akte_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def gb_signatur(id=None, pdfBase64=None, dateiname=None, ip=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten")
	doc, _ = _akte_laden(n, id)
	if cint(doc.abgebrochen):
		konflikt("Die Akte ist abgebrochen.")
	if not doc.eigentuemer_id:
		konflikt("Für die elektronische Unterschrift braucht der Eigentümer ein Portal-Konto – sonst bitte das unterschriebene Dokument hochladen.")
	a = _akte_dict(doc)
	s = next((x for x in a["schritte"] if x["schluessel"] == "unterschrift"), None)
	if not s:
		konflikt("In diesem Land wird der Vertrag bei der öffentlichen Beurkundung unterschrieben.")
	if s["status"] == "erledigt":
		konflikt("Der Vertrag ist bereits unterschrieben.")
	if next((x for x in a["schritte"] if x["schluessel"] == "vertrag"), {}).get("status") != "erledigt":
		konflikt("Zuerst den Vertrag als erstellt markieren.")
	alt = _signatur_status(s.get("signaturId"))
	if alt and alt["status"] == "laufend":
		konflikt("Es läuft bereits ein Signaturvorgang für diesen Vertrag.")
	from frappe.utils import add_days

	from oekoinvest_app.plattform.api import signatur as sig_api

	pdf = sig_api._pdf_aus_base64(pdfBase64)
	titel = ("Dachnutzungs- und Servitutsvertrag" if doc.objekt_art == "dach" else "Dienstbarkeitsvertrag") + f" – {doc.titel}"
	sv = sig_api.vorgang_anlegen(titel[:160], "sonstiges", n.id, pdf, v.text(dateiname, 120) or f"{doc.name}-vertrag.pdf", sig_api._unterzeichner_aufloesen([{"kontoId": doc.eigentuemer_id}]), add_days(nowdate(), 21), True,
		"Bitte prüfen und unterschreiben Sie den Vertrag. Hinweis: Für das Grundbuch ist zusätzlich eine beglaubigte Unterschrift beim Notar nötig – dazu melden wir uns.",
		"flaeche" if doc.flaeche_id else None, doc.flaeche_id or None, ip=v.text(ip, 64))
	s.update({"signaturId": sv.name, "status": "in_arbeit"})
	_schritte_speichern(doc, [s if x["schluessel"] == "unterschrift" else x for x in a["schritte"]])
	_verlauf_add(doc, n, f"Vertrag zur elektronischen Unterschrift gesendet (Signaturvorgang {sv.name}).", True)
	_akte_status_setzen(doc)
	doc.save(ignore_permissions=True)
	return {"akte": _akte_ausgabe(n, doc, detail=True), "signaturId": sv.name}


@frappe.whitelist(methods=["POST"])
def gb_dokument_speichern(id=None, schritt=None, name=None, mime=None, inhalt=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten")
	doc, _ = _akte_laden(n, id)
	try:
		daten = base64.b64decode(str(inhalt or ""), validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")
	erkannt = next((m for sig, m in MIME.items() if daten.startswith(sig)), "")
	if not erkannt or erkannt != mime or len(daten) > 10 * 1024 * 1024:
		ungueltig("Erlaubt sind PDF, JPG und PNG bis 10 MB.")
	ziel = next((s for s in doc.get("schritte") or [] if s.schluessel == schritt), None)
	if not ziel:
		ungueltig("Bitte wählen Sie den Schritt, zu dem der Nachweis gehört.")
	f = frappe.get_doc({"doctype": "File", "file_name": f"{doc.name}-{secrets.token_hex(6)}-{v.text(name, 100) or 'nachweis'}"[:140], "is_private": 1, "content": daten, "attached_to_doctype": DT_GB, "attached_to_name": doc.name})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	ziel.dokument = f.file_url
	_verlauf_add(doc, n, f"Nachweis hochgeladen ({v.text(name, 100)}) zu „{schritt}“.")
	doc.save(ignore_permissions=True)
	protokoll(n, "grundbuch_dokument", "grundbuch", doc.name, f"Nachweis {v.text(name, 100)}")
	return {"id": f.name, "name": f.file_name, "schritt": schritt, "am": iso(f.creation), "groesse": len(daten)}


@frappe.whitelist(methods=["POST"])
def gb_dokument_lesen(id=None, dokId=None, ip=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	doc, rolle = _akte_laden(n, id)
	if not dokId or not frappe.db.exists("File", dokId):
		nicht_gefunden("Dokument nicht gefunden.")
	f = frappe.get_doc("File", dokId)
	schritt = next((s for s in doc.get("schritte") or [] if s.dokument and s.dokument == f.file_url), None)
	if f.attached_to_doctype != DT_GB or f.attached_to_name != doc.name or not schritt or (rolle != "backoffice" and schritt.schluessel != "eintragung"):
		nicht_gefunden("Dokument nicht gefunden.")
	with open(f.get_full_path(), "rb") as fh:
		daten = fh.read()
	protokoll(n, "grundbuch_download", "grundbuch", doc.name, f"Download {f.file_name}", v.text(ip, 64))
	mime = next((m for sig, m in MIME.items() if daten.startswith(sig)), "application/octet-stream")
	return {"name": f.file_name, "mime": mime, "inhalt": base64.b64encode(daten).decode()}


@frappe.whitelist(methods=["POST"])
def gb_muster_daten(id=None, vorlage=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, _ = _akte_laden(n, id)
	vl = vorlage if vorlage in K.GB_VORLAGEN else ("dachnutzung_servitut" if doc.objekt_art == "dach" else "dienstbarkeit_freiflaeche")
	protokoll(n, "grundbuch_muster", "grundbuch", doc.name, f"Muster {vl}", v.text(ip, 64))
	a = _akte_dict(doc)
	for k in ("verlauf", "eigentuemerId", "schritte", "notiz"):
		a.pop(k, None)
	return {"vorlage": vl, "akte": a}


@frappe.whitelist(methods=["POST"])
def gb_fristen_lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n, "grundbuch")
	return _fristen()


def _fristen():
	faellig = []
	for name in frappe.get_all(DT_GB, filters={"abgebrochen": 0, "status": ["in", list(K.GB_OFFEN)]}, pluck="name", limit_page_length=5000):
		a = _akte_dict(frappe.get_doc(DT_GB, name))
		for s in K.fristen_berechnen(a, _heute()):
			if s.get("ueberfaellig"):
				faellig.append({"akteId": a["id"], "titel": a["titel"], "schritt": s["schluessel"], "frist": s["fristBerechnet"]})
	return {"faellig": faellig, "anzahl": len(faellig)}


def fristen_taeglich():
	"""Scheduler (täglich): überfällige Schritte offener Akten an das Backoffice mit Bereich „grundbuch“ melden (je Akte einmal täglich)."""
	f = _fristen()
	je_akte = {}
	for x in f["faellig"]:
		je_akte.setdefault(x["akteId"], []).append(x)
	empfaenger = _admins("grundbuch")
	for akte_id, liste in list(je_akte.items())[:200]:
		for k in empfaenger:
			_melden(k, "Grundbuch: Frist überschritten", f"{liste[0]['titel']} – {len(liste)} Schritt(e) überfällig", f"/portal/admin/grundbuch/{akte_id}", "grundbuch", akte_id, mail=False)
	return f["anzahl"]


# ================================================================ Closing – Abbildung


def _cl_dict(doc):
	return {
		"id": doc.name, "status": doc.status, "struktur": doc.struktur, "land": doc.land, "kaufpreis": flt(doc.kaufpreis), "signing": aus_json(doc.signing, {}) or {},
		"cps": [{"schluessel": c.schluessel, "reihenfolge": cint(c.reihenfolge), "label": c.label, "text": c.text or "", "verantwortlich": c.verantwortlich, "frist": str(c.frist or ""),
			"status": c.status or "offen", "nachweis": c.nachweis or "", "erfuelltAm": str(c.erfuellt_am or ""), "vonId": c.von_id or None, "gemeldetVonId": c.gemeldet_von_id or None} for c in doc.get("bedingungen") or []],
		"zahlung": aus_json(doc.zahlung, {}) or {}, "notar": aus_json(doc.notar, {}) or {}, "meilensteine": aus_json(doc.meilensteine, []) or [], "uebergabe": aus_json(doc.uebergabe, []) or [],
		"verlauf": aus_json(doc.verlauf, []) or [],
	}


def _cps_speichern(doc, cps):
	doc.set("bedingungen", [])
	for c in cps:
		doc.append("bedingungen", {
			"schluessel": c["schluessel"], "reihenfolge": c.get("reihenfolge"), "label": c["label"], "text": c.get("text") or "", "verantwortlich": c.get("verantwortlich"), "frist": c.get("frist") or None,
			"status": c.get("status") or "offen", "nachweis": c.get("nachweis") or "", "erfuellt_am": c.get("erfuelltAm") or None, "von_id": c.get("vonId") or None, "gemeldet_von_id": c.get("gemeldetVonId") or None,
		})


def _kontakt_frei(doc):
	return bool(frappe.db.exists("Plattform Kontaktfreigabe", {"projekt_id": doc.projekt_id, "interesse_id": doc.interesse_id}))


def _kyc(doc):
	from oekoinvest_app.plattform.kyc_kern import kyc_status

	org_k = frappe.db.get_value("Plattform Interesse", doc.interesse_id, "organisation_id")
	org_v = frappe.db.get_value("Plattform Projekt", doc.projekt_id, "organisation_id")
	k = kyc_status(doc.kaeufer_id, org_k) or {}
	vk = kyc_status(doc.verkaeufer_id, org_v) or {}
	return {"kaeufer": bool(k.get("verifiziert")), "verkaeufer": bool(vk.get("verifiziert")), "kaeuferStatus": k.get("status"), "verkaeuferStatus": vk.get("status"), "kontaktFrei": _kontakt_frei(doc)}


def _sperre(text, kyc):
	"""409: fehlt KYC einer Seite → KycErforderlich (Website-Code „kyc“), sonst Konflikt."""
	if not (kyc["kaeufer"] and kyc["verkaeufer"]):
		from oekoinvest_app.plattform.kyc_kern import _kyc_fehler

		frappe.throw(text, _kyc_fehler())
	konflikt(text)


def _rolle_cl(n, doc):
	if _lesen(n, "closing"):
		return "backoffice"
	if n and doc.kaeufer_id == n.id:
		return "kaeufer"
	if n and doc.verkaeufer_id == n.id:
		return "verkaeufer"
	return None


def _cl_laden(n, kennung_):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung_)
	if not k or not frappe.db.exists(DT_CL, k):
		nicht_gefunden("Closing nicht gefunden.")
	doc = frappe.get_doc(DT_CL, k)
	rolle = _rolle_cl(n, doc)
	if not rolle:
		verboten("Dieser Deal betrifft Ihr Konto nicht.")
	return doc, rolle


def _partei(konto_id, sichtbar, rolle_text):
	k = kurz(konto_id)
	if not sichtbar or not k:
		return {"anzeige": f"{rolle_text} (anonym bis zur Kontaktfreigabe)", "anonym": True}
	name = " ".join(x for x in (k["vorname"], k["nachname"]) if x)
	return {"anzeige": " – ".join(x for x in (k["firma"], name) if x), "name": name, "firma": k["firma"], "email": k["email"], "anonym": False}


def _cl_ausgabe(n, doc, detail=False):
	rolle = _rolle_cl(n, doc)
	bo = rolle == "backoffice"
	c = _cl_dict(doc)
	kyc = _kyc(doc)
	p = frappe.db.get_value("Plattform Projekt", doc.projekt_id, ["name", "titel", "mwp", "land", "typ", "status"], as_dict=True)
	kaeufer = _partei(doc.kaeufer_id, bo or rolle == "kaeufer" or kyc["kontaktFrei"], "Käufer")
	verkaeufer = _partei(doc.verkaeufer_id, bo or rolle == "verkaeufer" or kyc["kontaktFrei"], "Verkäufer")
	if bo:
		kaeufer["id"], verkaeufer["id"] = doc.kaeufer_id, doc.verkaeufer_id
	offen = len([x for x in c["cps"] if x["status"] not in ("erfuellt", "verzichtet")])
	basis = {
		"id": doc.name, "projekt": {"id": p.name, "titel": p.titel, "mwp": p.mwp, "land": p.land, "typ": p.typ, "status": p.status} if p else None,
		"struktur": doc.struktur, "strukturLabel": K.CL_STRUKTUREN.get(doc.struktur, {}).get("label"), "status": doc.status, "statusLabel": K.CL_STATUS.get(doc.status, {}).get("label"),
		"land": doc.land, "kaufpreis": flt(doc.kaufpreis), "kaufpreisQuelle": doc.kaufpreis_quelle or "", "herkunft": doc.herkunft, "kaeufer": kaeufer, "verkaeufer": verkaeufer,
		"cpsOffen": offen, "cpsGesamt": len(c["cps"]), "notarTermin": iso(doc.notar_termin) if doc.notar_termin else "", "signingAm": str(doc.signing_am or ""), "vollzogenAm": str(doc.vollzogen_am or ""),
		"meineRolle": rolle, "kontaktFrei": kyc["kontaktFrei"], "erstelltAm": iso(doc.creation), "geaendertAm": iso(doc.modified),
	}
	if not detail:
		return basis
	ich = rolle if rolle in ("kaeufer", "verkaeufer") else None
	sig = K.signing_pruefen(c, kyc["kaeufer"], kyc["verkaeufer"])
	cl = K.closing_pruefen(c, kyc["kaeufer"], kyc["verkaeufer"])
	pv = frappe.db.get_value("Plattform Provision", doc.provision_id, ["name", "betrag", "satz", "status"], as_dict=True) if doc.provision_id else None
	beleg = frappe.db.get_value("Plattform Abrechnung", {"provision_id": doc.provision_id, "status": ["!=", "storniert"]}, ["name", "nummer", "status", "brutto"], as_dict=True) if doc.provision_id else None
	sichtbar_pv = bo or rolle == "verkaeufer"
	return {
		**basis, "spvName": doc.spv_name or "", "spvGesellschaftId": doc.spv_gesellschaft_id if bo else None, "anteilProzent": flt(doc.anteil_prozent) or 100,
		"meilensteine": c["meilensteine"], "earnOut": doc.earn_out or "",
		"signingStand": [{**x, "notiz": x["notiz"] if bo else None} for x in K.signing_stand(c, kyc["kaeufer"], kyc["verkaeufer"])],
		"kyc": {"kaeufer": kyc["kaeufer"], "verkaeufer": kyc["verkaeufer"], "kaeuferStatus": kyc["kaeuferStatus"] if bo or rolle == "kaeufer" else None, "verkaeuferStatus": kyc["verkaeuferStatus"] if bo or rolle == "verkaeufer" else None},
		"signingPruefung": sig if bo else {"ok": sig["ok"], "gruende": []}, "closingPruefung": cl if bo else {"ok": cl["ok"], "gruende": []},
		"cps": [{**x, "verantwortlichLabel": K.CL_VERANTWORTLICH.get(x["verantwortlich"]), "statusLabel": K.CP_STATUS.get(x["status"], {}).get("label"), "darfMelden": bool(ich) and x["verantwortlich"] == ich and x["status"] == "offen",
			"vonId": x["vonId"] if bo else None, "gemeldetVonId": x["gemeldetVonId"] if bo else None} for x in c["cps"]],
		"notar": c["notar"], "zahlung": {**c["zahlung"], "hinweis": K.TREUHAND_HINWEIS.get(doc.land) or K.TREUHAND_HINWEIS["DE"]},
		"uebergabe": [{**u, **next((x for x in c["uebergabe"] if x.get("schluessel") == u["schluessel"]), {})} for u in K.UEBERGABE_PUNKTE],
		"formHinweise": K.form_hinweise(doc.struktur, doc.land), "hinweis": K.CL_HINWEIS,
		"provision": {"id": pv.name, "betrag": flt(pv.betrag), "satz": flt(pv.satz), "status": pv.status} if pv and sichtbar_pv else None,
		"rechnung": {"id": beleg.name, "nummer": beleg.nummer, "status": beleg.status, "brutto": flt(beleg.brutto)} if beleg and sichtbar_pv else None,
		"verlauf": c["verlauf"] if bo else [{"am": x.get("am"), "text": x.get("text")} for x in c["verlauf"] if x.get("oeffentlich")],
		"notizIntern": doc.notiz_intern or "" if bo else None,
		"darfBearbeiten": _schreiben(n, "closing") and doc.status in K.CL_OFFEN, "darfUebergabe": _schreiben(n, "closing") and doc.status == "vollzogen",
	}


def _beteiligte_melden(doc, titel, text):
	for k in (doc.kaeufer_id, doc.verkaeufer_id):
		if k:
			_melden(k, titel, text, f"/portal/closing/{doc.name}", "closing", doc.name, mail_text=f"{text} Details im Portal (Closing-Raum).")


def _zuschlag(projekt_id, interesse_id):
	vf = frappe.db.get_value("Plattform Bieterverfahren", {"projekt_id": projekt_id, "zuschlag_interesse_id": interesse_id}, ["name", "zuschlag_preis"], as_dict=True)
	return vf


# ================================================================ Closing – Methoden


@frappe.whitelist(methods=["POST"])
def cl_liste(status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n, "closing")
	alle = [_cl_ausgabe(n, frappe.get_doc(DT_CL, x)) for x in frappe.get_all(DT_CL, pluck="name", order_by="modified desc", limit_page_length=1000)]
	belegt = set(frappe.get_all(DT_CL, filters={"status": ["!=", "abgebrochen"]}, pluck="interesse_id", limit_page_length=5000))
	kandidaten = []
	for i in frappe.get_all("Plattform Interesse", filters={"status": "loi_angenommen"}, fields=["name", "projekt_id", "investor_id", "loi"], limit_page_length=500):
		if i.name in belegt:
			continue
		p = frappe.db.get_value("Plattform Projekt", i.projekt_id, ["name", "titel", "land", "mwp", "status"], as_dict=True)
		if not p or p.status not in ("veroeffentlicht", "reserviert"):
			continue
		vf = _zuschlag(p.name, i.name)
		loi = aus_json(i.loi, {}) or {}
		kp = K.kaufpreis_ableiten(vf.zuschlag_preis if vf else None, loi, p.mwp)
		kandidaten.append({"projektId": p.name, "interesseId": i.name, "projekt": p.titel, "land": p.land, "mwp": p.mwp, "herkunft": "zuschlag" if vf else "loi", "kaufpreis": kp["betrag"], "investor": kurz(i.investor_id), "struktur": loi.get("transaktion") or ""})
	return {
		"closings": [c for c in alle if not status or (c["status"] in K.CL_OFFEN if status == "offen" else c["status"] == status)],
		"kandidaten": kandidaten,
		"kennzahlen": {"offen": len([c for c in alle if c["status"] in K.CL_OFFEN]), "signing": len([c for c in alle if c["status"] == "signing"]), "vollzogen": len([c for c in alle if c["status"] == "vollzogen"]), "volumen": sum(c["kaufpreis"] for c in alle if c["status"] == "vollzogen")},
		"schreiben": _schreiben(n, "closing"),
	}


@frappe.whitelist(methods=["POST"])
def cl_meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	namen = set(frappe.get_all(DT_CL, filters={"kaeufer_id": n.id}, pluck="name")) | set(frappe.get_all(DT_CL, filters={"verkaeufer_id": n.id}, pluck="name"))
	return {"closings": [_cl_ausgabe(n, frappe.get_doc(DT_CL, x)) for x in sorted(namen)]}


@frappe.whitelist(methods=["POST"])
def cl_akte(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, _ = _cl_laden(n, id)
	return _cl_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def cl_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "closing", "Deal-Abschluss (Closing)")
	d = aus_json(daten, {}) or {}
	pid, iid = v.kennung(d.get("projektId")), v.kennung(d.get("interesseId"))
	if not pid or not frappe.db.exists("Plattform Projekt", pid):
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", pid)
	i = frappe.db.get_value("Plattform Interesse", {"name": iid, "projekt_id": pid}, ["name", "status", "investor_id", "loi"], as_dict=True) if iid else None
	if not i:
		nicht_gefunden("Interessent nicht gefunden.")
	vf = _zuschlag(pid, i.name)
	if i.status != "loi_angenommen" and not vf:
		konflikt("Ein Closing setzt einen Zuschlag im Bieterverfahren oder eine angenommene LOI voraus.")
	if p.status not in ("veroeffentlicht", "reserviert"):
		konflikt("Das Projekt ist nicht mehr in der Vermarktung.")
	if frappe.db.exists(DT_CL, {"projekt_id": pid, "status": ["!=", "abgebrochen"]}):
		konflikt("Für dieses Projekt gibt es bereits einen Closing-Raum.")
	loi = aus_json(i.loi, {}) or {}
	kp = K.kaufpreis_ableiten(vf.zuschlag_preis if vf else None, loi, p.mwp)
	eigen = v.zahl(d.get("kaufpreis"), min=1, max=1e11)
	struktur = v.auswahl(d.get("struktur"), list(K.CL_STRUKTUREN), loi.get("transaktion") if loi.get("transaktion") in K.CL_STRUKTUREN else "share")
	land = p.land if p.land in K.GB_LAENDER else "DE"
	doc = frappe.new_doc(DT_CL)
	doc.update({
		"projekt_id": pid, "interesse_id": i.name, "verfahren_id": vf.name if vf else None, "herkunft": "zuschlag" if vf else "loi", "kaeufer_id": i.investor_id, "verkaeufer_id": p.anbieter_id,
		"land": land, "struktur": struktur, "status": "vorbereitung", "spv_name": v.text(d.get("spvName"), 160), "spv_gesellschaft_id": v.kennung(d.get("spvGesellschaftId")) or None,
		"anteil_prozent": max(1, min(100, flt(d.get("anteilProzent")) or 100)), "kaufpreis": eigen or kp["betrag"], "kaufpreis_quelle": "vereinbart" if eigen else kp["quelle"],
		"earn_out": v.text(loi.get("zahlungDetails"), 400) if loi.get("zahlung") not in (None, "", "einmal") else "", "meilensteine": als_json([]),
		"signing": als_json({"punkte": K.signing_anlegen()}), "notar": als_json({}), "zahlung": als_json({"treuhand": struktur == "asset" or land == "DE"}), "uebergabe": als_json(K.uebergabe_anlegen()),
		"erstellt_von": n.id,
	})
	_cps_speichern(doc, K.cps_anlegen(struktur, loi.get("bedingungenListe") or [], _heute()))
	_verlauf_add(doc, n, f"Closing-Raum eröffnet ({'Zuschlag im Bieterverfahren' if vf else 'angenommene LOI'}, {K.CL_STRUKTUREN[struktur]['label']}).", True)
	doc.insert(ignore_permissions=True)
	protokoll(n, "closing_anlegen", "projekt", pid, f"Closing {doc.name} eröffnet (Interesse {i.name})")
	_beteiligte_melden(doc, f"Closing-Raum eröffnet: {p.titel}", "Der Deal-Abschluss wird vorbereitet – Checkliste, Bedingungen und Termine sehen Sie im Closing-Raum.")
	return _cl_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def cl_aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "closing", "Deal-Abschluss (Closing)")
	doc, _ = _cl_laden(n, id)
	if doc.status not in K.CL_OFFEN:
		konflikt("Der Closing-Raum ist abgeschlossen.")
	d = aus_json(daten, {}) or {}
	geaendert = []
	if "struktur" in d and d.get("struktur") != doc.struktur:
		if doc.status != "vorbereitung":
			konflikt("Die Struktur kann nach dem Signing nicht mehr geändert werden.")
		s = v.auswahl(d.get("struktur"), list(K.CL_STRUKTUREN), "")
		if not s:
			ungueltig("Unbekannte Struktur.")
		loi = aus_json(frappe.db.get_value("Plattform Interesse", doc.interesse_id, "loi"), {}) or {}
		alt = {x["schluessel"]: x for x in _cl_dict(doc)["cps"] if x["status"] != "offen"}
		doc.struktur = s
		_cps_speichern(doc, [alt.get(x["schluessel"], x) for x in K.cps_anlegen(s, loi.get("bedingungenListe") or [], _heute())])
		geaendert.append("Struktur")
	if "kaufpreis" in d:
		if doc.status != "vorbereitung":
			konflikt("Der Kaufpreis ist mit dem Signing festgelegt.")
		kp = v.zahl(d.get("kaufpreis"), min=1, max=1e11)
		v.pflicht(kp, "Bitte einen gültigen Kaufpreis angeben.")
		doc.kaufpreis, doc.kaufpreis_quelle = round(kp), "vereinbart"
		geaendert.append("Kaufpreis")
	if "spvName" in d:
		doc.spv_name = v.text(d.get("spvName"), 160)
	if "spvGesellschaftId" in d:
		doc.spv_gesellschaft_id = v.kennung(d.get("spvGesellschaftId")) or None
	if "anteilProzent" in d:
		doc.anteil_prozent = max(1, min(100, flt(d.get("anteilProzent")) or 100))
	if "earnOut" in d:
		doc.earn_out = v.mehrzeilig(d.get("earnOut"), 1000)
	if "meilensteine" in d:
		doc.meilensteine = als_json(_fach(K.meilensteine_bereinigen, d.get("meilensteine"), flt(doc.kaufpreis)))
		geaendert.append("Meilensteine")
	if isinstance(d.get("notar"), dict):
		x = d["notar"]
		termin = None
		if x.get("termin"):
			try:
				termin = get_datetime(str(x["termin"]).replace("Z", "").replace("T", " ")[:19])
			except Exception:  # noqa: BLE001
				ungueltig("Ungültiger Notartermin.")
		notar = {"name": v.text(x.get("name"), 120), "kanzlei": v.text(x.get("kanzlei"), 160), "email": v.email(x.get("email")) if x.get("email") else "", "telefon": v.text(x.get("telefon"), 40), "ort": v.text(x.get("ort"), 200), "termin": str(x.get("termin") or "")[:30] if termin else "", "notiz": v.text(x.get("notiz"), 300)}
		doc.notar = als_json(notar)
		doc.notar_termin = termin
		if termin:
			_verlauf_add(doc, n, f"Notartermin: {termin.strftime('%d.%m.%Y %H:%M')}{', ' + notar['ort'] if notar['ort'] else ''}.", True)
		geaendert.append("Notar")
	if isinstance(d.get("zahlung"), dict):
		z = {**(aus_json(doc.zahlung, {}) or {})}
		z.update({"treuhand": v.wahr(d["zahlung"].get("treuhand")), "kontoHinweis": v.text(d["zahlung"].get("kontoHinweis"), 200), "faelligAm": d["zahlung"].get("faelligAm") if K._ist_datum(d["zahlung"].get("faelligAm")) else ""})
		doc.zahlung = als_json(z)
		geaendert.append("Zahlung")
	if "notizIntern" in d:
		doc.notiz_intern = v.mehrzeilig(d.get("notizIntern"), 3000)
	if geaendert:
		_verlauf_add(doc, n, "Geändert: " + ", ".join(geaendert) + ".")
	doc.save(ignore_permissions=True)
	return _cl_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def cl_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n, "closing", "Deal-Abschluss (Closing)")
	doc, _ = _cl_laden(n, id)
	d = aus_json(daten, {}) or {}
	aktion = v.auswahl(d.get("aktion"), ["signing_punkt", "signing", "cp", "cp_neu", "zahlung_eingang", "closing", "uebergabe", "abbrechen"], "")
	if not aktion:
		ungueltig("Unbekannte Aktion.")
	if aktion == "closing":
		return _vollziehen(n, doc, v.text(d.get("ip"), 64))
	c = _cl_dict(doc)
	titel = frappe.db.get_value("Plattform Projekt", doc.projekt_id, "titel") or ""
	if aktion == "uebergabe":
		if doc.status != "vollzogen":
			konflikt("Die Übergabe folgt nach dem Closing.")
		liste = c["uebergabe"] or K.uebergabe_anlegen()
		u = next((x for x in liste if x.get("schluessel") == d.get("schluessel")), None)
		if not u:
			ungueltig("Unbekannter Punkt.")
		u.update({"erledigt": v.wahr(d.get("erledigt")), "am": _heute() if v.wahr(d.get("erledigt")) else "", "vonId": n.id, "notiz": v.text(d.get("notiz"), 300)})
		doc.uebergabe = als_json(liste)
		_verlauf_add(doc, n, f"Übergabe: {u['schluessel']} {'erledigt' if u['erledigt'] else 'offen'}.")
	else:
		if doc.status not in K.CL_OFFEN:
			konflikt("Der Closing-Raum ist abgeschlossen.")
		if aktion == "signing_punkt":
			p = next((x for x in K.SIGNING_PUNKTE if x["schluessel"] == d.get("schluessel")), None)
			if not p:
				ungueltig("Unbekannter Punkt.")
			if p.get("auto"):
				konflikt("Dieser Punkt wird automatisch aus dem KYC-Modul gesetzt.")
			if doc.status != "vorbereitung":
				konflikt("Das Signing ist bereits erfolgt.")
			sg = c["signing"] or {"punkte": K.signing_anlegen()}
			s = next((x for x in sg.get("punkte") or [] if x.get("schluessel") == p["schluessel"]), None)
			if not s:
				s = {"schluessel": p["schluessel"]}
				sg.setdefault("punkte", []).append(s)
			s.update({"erledigt": v.wahr(d.get("erledigt")), "am": _heute() if v.wahr(d.get("erledigt")) else "", "vonId": n.id, "notiz": v.text(d.get("notiz"), 300)})
			doc.signing = als_json(sg)
			_verlauf_add(doc, n, f"Signing-Checkliste: {p['label']} {'erledigt' if s['erledigt'] else 'offen'}.")
		elif aktion == "signing":
			kyc = _kyc(doc)
			pr = K.signing_pruefen(c, kyc["kaeufer"], kyc["verkaeufer"])
			if not kyc["kontaktFrei"]:
				pr["gruende"].append("Kontaktfreigabe (Deal-Room) fehlt – vor dem Signing müssen sich die Parteien namentlich kennen.")
			if pr["gruende"]:
				_sperre("Signing nicht möglich: " + " ".join(pr["gruende"]), kyc)
			doc.status = "signing"
			doc.signing_am = d.get("datum") if K._ist_datum(d.get("datum")) and d.get("datum") <= _heute() else _heute()
			_verlauf_add(doc, n, "Signing bestätigt – Kaufvertrag unterzeichnet. Jetzt folgen die Closing Conditions.", True)
			_beteiligte_melden(doc, f"Signing bestätigt: {titel}", "Der Kaufvertrag ist unterzeichnet. Offene Bedingungen und Fristen sehen Sie im Closing-Raum.")
		elif aktion == "cp":
			x = next((y for y in c["cps"] if y["schluessel"] == d.get("schluessel")), None)
			if not x:
				ungueltig("Unbekannte Bedingung.")
			st = v.auswahl(d.get("status"), list(K.CP_STATUS), "")
			if not st:
				ungueltig("Unbekannter Status.")
			nachweis = v.text(d.get("nachweis") if d.get("nachweis") is not None else x["nachweis"], 300)
			if st == "erfuellt":
				v.pflicht(len(nachweis) >= 3, "Bitte einen Nachweis angeben (z. B. Dokument, Datum, Aktenzeichen).")
			if st == "verzichtet":
				v.pflicht(len(v.text(d.get("nachweis"), 300)) >= 5, "Bitte den Verzicht begründen (wer hat verzichtet, Datum).")
			x.update({"status": st, "nachweis": nachweis, "erfuelltAm": _heute() if st in ("erfuellt", "verzichtet") else "", "vonId": n.id})
			if K._ist_datum(d.get("frist")):
				x["frist"] = d["frist"]
			_cps_speichern(doc, c["cps"])
			_verlauf_add(doc, n, f"Bedingung „{x['label']}“: {K.CP_STATUS[st]['label']}.", True)
		elif aktion == "cp_neu":
			label = v.text(d.get("label"), 160)
			v.pflicht(len(label) >= 5, "Bitte die Bedingung beschreiben (mind. 5 Zeichen).")
			c["cps"].append({"schluessel": f"eigen_{len(c['cps']) + 1}", "reihenfolge": len(c["cps"]) + 1, "label": label, "text": v.text(d.get("text"), 300), "verantwortlich": v.auswahl(d.get("verantwortlich"), list(K.CL_VERANTWORTLICH), "oekoinvest"),
				"frist": d.get("frist") if K._ist_datum(d.get("frist")) else "", "status": "offen", "nachweis": "", "erfuelltAm": "", "vonId": n.id})
			_cps_speichern(doc, c["cps"])
			_verlauf_add(doc, n, f"Neue Bedingung: {label}.", True)
		elif aktion == "zahlung_eingang":
			if doc.status != "signing":
				konflikt("Der Kaufpreis wird nach dem Signing gezahlt.")
			datum = d.get("datum") if K._ist_datum(d.get("datum")) else _heute()
			if datum > _heute():
				ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.")
			betrag = v.zahl(d.get("betrag"), min=1, max=1e11) or flt(doc.kaufpreis)
			ms = c["meilensteine"]
			faellig = flt(doc.kaufpreis) - sum(flt(m.get("betrag")) for m in ms if not m.get("bezahltAm")) if ms else flt(doc.kaufpreis)
			if betrag + 1 < max(0, faellig):
				ungueltig(f"Eingegangen sind {round(betrag):,} € – zum Closing fällig sind {round(faellig):,} €.".replace(",", "."))
			z = {**c["zahlung"], "eingangAm": datum, "betrag": round(betrag), "bestaetigtVonId": n.id}
			doc.zahlung = als_json(z)
			doc.zahlung_eingang_am = datum
			_verlauf_add(doc, n, "Zahlungseingang bestätigt" + (" (Treuhand-/Notaranderkonto)." if z.get("treuhand") else "."), True)
		elif aktion == "abbrechen":
			grund = v.text(d.get("grund"), 300)
			v.pflicht(len(grund) >= 5, "Bitte einen Grund angeben.")
			doc.status = "abgebrochen"
			_verlauf_add(doc, n, f"Closing abgebrochen: {grund}", True)
			_beteiligte_melden(doc, f"Deal-Abschluss abgebrochen: {titel}", "Der Closing-Raum wurde geschlossen.")
	doc.save(ignore_permissions=True)
	protokoll(n, f"closing_{aktion}", "closing", doc.name, f"{aktion} {v.text(d.get('schluessel'), 40)}".strip())
	return _cl_ausgabe(n, doc, detail=True)


def _vollziehen(n, doc, ip=""):
	kyc = _kyc(doc)
	pr = K.closing_pruefen(_cl_dict(doc), kyc["kaeufer"], kyc["verkaeufer"])
	if not pr["ok"]:
		_sperre("Closing nicht möglich: " + " ".join(pr["gruende"]), kyc)
	from oekoinvest_app.plattform.ablauf import uebergang_anwenden
	from oekoinvest_app.plattform.prozesse import pruefe_uebergang

	p = frappe.get_doc("Plattform Projekt", doc.projekt_id)
	if p.status != "verkauft":
		extra = {"interesseId": doc.interesse_id, "kaufpreis": flt(doc.kaufpreis)}
		pruefe_uebergang("projekt", p.status, "verkauft", "admin", extra, objekt=p)
		uebergang_anwenden(n, "projekt", p, "verkauft", "admin", extra, ip)  # → Provision (ablauf.verkauf_abschliessen) → Rechnung (Hook)
	pv = frappe.db.get_value("Plattform Provision", {"projekt_id": doc.projekt_id, "interesse_id": doc.interesse_id}, "name", order_by="creation desc")
	doc.provision_id = pv or None
	doc.status = "vollzogen"
	doc.vollzogen_am = _heute()
	beleg = frappe.db.get_value("Plattform Abrechnung", {"provision_id": pv, "status": ["!=", "storniert"]}, "nummer") if pv else None
	_verlauf_add(doc, n, "Closing vollzogen – Kaufgegenstand geht auf den Käufer über. Übergabe-Checkliste ist offen.", True)
	_verlauf_add(doc, n, f"Provision {pv} angelegt" + (f", Provisionsrechnung {beleg}." if beleg else " – Rechnung folgt im täglichen Abrechnungslauf.") if pv else "Keine Provision gefunden (Projekt bereits vorher verkauft?).")
	doc.save(ignore_permissions=True)
	titel = p.titel or ""
	_beteiligte_melden(doc, f"Closing vollzogen: {titel}", "Der Deal ist abgeschlossen. Übergabe und Abschlussbericht finden Sie im Closing-Raum.")
	for k in _admins("provisionen", 1):
		_melden(k, f"Closing vollzogen: {titel}", f"Provisionsrechnung {beleg} erzeugt." if beleg else "Provisionsrechnung prüfen.", f"/portal/admin/closing/{doc.name}", "closing", doc.name, mail=False)
	protokoll(n, "closing_vollzogen", "closing", doc.name, f"Closing {doc.name} vollzogen ({round(flt(doc.kaufpreis))} €)", ip)
	return _cl_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def cl_portal_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, rolle = _cl_laden(n, id)
	if rolle not in ("kaeufer", "verkaeufer"):
		verboten("Nur für Käufer und Verkäufer.")
	if doc.status not in K.CL_OFFEN:
		konflikt("Der Closing-Raum ist abgeschlossen.")
	d = aus_json(daten, {}) or {}
	if d.get("aktion") != "cp_melden":
		ungueltig("Unbekannte Aktion.")
	c = _cl_dict(doc)
	x = next((y for y in c["cps"] if y["schluessel"] == d.get("schluessel")), None)
	if not x:
		nicht_gefunden("Bedingung nicht gefunden.")
	if x["verantwortlich"] != rolle:
		verboten("Diese Bedingung liegt nicht in Ihrer Verantwortung.")
	if x["status"] != "offen":
		konflikt("Die Bedingung ist nicht mehr offen.")
	nachweis = v.text(d.get("nachweis"), 300)
	v.pflicht(len(nachweis) >= 5, "Bitte beschreiben Sie den Nachweis (mind. 5 Zeichen).")
	x.update({"status": "gemeldet", "nachweis": nachweis, "gemeldetVonId": n.id})
	_cps_speichern(doc, c["cps"])
	_verlauf_add(doc, n, f"{'Käufer' if rolle == 'kaeufer' else 'Verkäufer'} meldet „{x['label']}“ als erfüllt – Prüfung durch ÖkoInvest.", True)
	doc.save(ignore_permissions=True)
	for k in _admins("closing"):
		_melden(k, "Closing: Bedingung gemeldet", x["label"], f"/portal/admin/closing/{doc.name}", "closing", doc.name, mail=False)
	protokoll(n, "closing_cp_gemeldet", "closing", doc.name, x["schluessel"])
	return _cl_ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def cl_dokument_daten(id=None, art=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, _ = _cl_laden(n, id)
	bericht = art == "bericht"
	if bericht and doc.status != "vollzogen":
		konflikt("Der Abschlussbericht steht nach dem Closing bereit.")
	protokoll(n, "closing_bericht" if bericht else "closing_spa", "closing", doc.name, f"PDF {'bericht' if bericht else 'spa'}", v.text(ip, 64))
	return {"art": "bericht" if bericht else "spa", "closing": _cl_ausgabe(n, doc, detail=True)}


@frappe.whitelist(methods=["POST"])
def cl_termin(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, _ = _cl_laden(n, id)
	notar = aus_json(doc.notar, {}) or {}
	if not doc.notar_termin:
		nicht_gefunden("Kein Notartermin eingetragen.")
	titel = frappe.db.get_value("Plattform Projekt", doc.projekt_id, "titel") or doc.name
	return {"id": doc.name, "titel": f"Notartermin {K.CL_STRUKTUREN.get(doc.struktur, {}).get('label', '')}: {titel}", "start": notar.get("termin") or iso(doc.notar_termin), "dauerMinuten": 120, "ort": notar.get("ort") or "", "beschreibung": ", ".join(x for x in (notar.get("name"), notar.get("kanzlei")) if x)}


# ================================================================ Jinja (Druckformate)


def oekoinvest_grundbuch(name):
	"""Daten einer Grundbuch-Akte für die Druckformate (Muster): Akte, Schritte mit Texten, Kostenschätzung, Hinweise."""
	if not name or not frappe.db.exists(DT_GB, name):
		return {}
	doc = frappe.get_doc(DT_GB, name)
	a = _akte_dict(doc)
	defs = {d["schluessel"]: d for d in K.schritte_fuer(doc.land)}
	return {
		"akte": a, "land_label": K.GB_LAENDER.get(doc.land, doc.land), "recht_label": ((K.GB_RECHTE.get(doc.land) or {}).get(doc.recht) or {}).get("label", "Dienstbarkeit"),
		"schritte": [{**s, "label": defs.get(s["schluessel"], {}).get("label"), "text": defs.get(s["schluessel"], {}).get("text")} for s in a["schritte"]],
		"kosten": K.grundbuch_kosten(doc.land, a["entgeltJahr"], a["laufzeitJahre"], len(a["pfandglaeubiger"]), a["eigentuemerAnzahl"]),
		"hinweis": K.GB_HINWEIS, "loeschung": K.GB_LOESCHUNG.get(doc.land) or K.GB_LOESCHUNG["DE"], "status_label": K.GB_STATUS.get(doc.status, {}).get("label", doc.status),
	}


def oekoinvest_closing(name):
	"""Daten eines Closing-Raums für die Druckformate (SPA-Muster, Abschlussbericht) – Backoffice-Sicht."""
	if not name or not frappe.db.exists(DT_CL, name):
		return {}
	doc = frappe.get_doc(DT_CL, name)
	c = _cl_dict(doc)
	p = frappe.db.get_value("Plattform Projekt", doc.projekt_id, ["titel", "mwp", "land"], as_dict=True) or {}
	kyc = _kyc(doc)
	return {
		"c": c, "projekt": p, "struktur_label": K.CL_STRUKTUREN.get(doc.struktur, {}).get("label"), "status_label": K.CL_STATUS.get(doc.status, {}).get("label"),
		"kaeufer": _partei(doc.kaeufer_id, True, "Käufer"), "verkaeufer": _partei(doc.verkaeufer_id, True, "Verkäufer"),
		"signing": K.signing_stand(c, kyc["kaeufer"], kyc["verkaeufer"]), "uebergabe": [{**u, **next((x for x in c["uebergabe"] if x.get("schluessel") == u["schluessel"]), {})} for u in K.UEBERGABE_PUNKTE],
		"verantwortlich": K.CL_VERANTWORTLICH, "cp_status": K.CP_STATUS, "form": K.form_hinweise(doc.struktur, doc.land), "treuhand": K.TREUHAND_HINWEIS.get(doc.land) or K.TREUHAND_HINWEIS["DE"],
		"hinweis": K.CL_HINWEIS, "provision": frappe.db.get_value("Plattform Provision", doc.provision_id, ["name", "betrag", "satz", "status"], as_dict=True) if doc.provision_id else None,
		"rechnung": frappe.db.get_value("Plattform Abrechnung", {"provision_id": doc.provision_id, "status": ["!=", "storniert"]}, ["nummer", "status"], as_dict=True) if doc.provision_id else None,
	}
