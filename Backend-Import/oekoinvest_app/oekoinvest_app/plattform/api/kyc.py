# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC/KYB – Identitäts- und Firmenprüfung (docs/API.md, Abschnitt „KYC/KYB“). Referenz: src/lib/plattform/backend/demo/kyc.js.
#
# Rechte (jede Methode selbst, nach kern.nutzer()):
#   Person selbst – eigener Fall: Angaben, Uploads, eigene Unterlagen ansehen/löschen (solange bearbeitbar), einreichen
#   Compliance    – Backoffice-Unterrolle „compliance“ (rechte.py, Bereich compliance = 2): Warteschlange, Fall, Unterlagen,
#                   Prüfliste, Risiko, Entscheidung, Vier-Augen, Sanktionsabgleich, Einstellungen, Fristen
#   Leitung       – Bereich compliance = 1: nur Warteschlange/Status
#   API-Nutzer    – ohne als_benutzer: status/freigabe (Systemaufruf der Website), ergebnis_anhaengen (externe Dienste)
# Jeder Zugriff auf Unterlagen/Falldetails → Plattform Aktivitaet (Hash-Kette). Sanktionstreffer sieht der Nutzer nie
# (Status bleibt „In Prüfung“ – Tipping-off-Verbot, § 47 GwG).
#
# Ablage: privates File (is_private=1) mit AES-256-GCM-verschlüsseltem Inhalt (kyc_kern.verschluesseln). Zusätzlich
# empfohlen: Verschlüsselung des Dateisystems/Backups auf dem Server bzw. Ablage in Frappe Drive nur mit gleicher
# Zugriffsbeschränkung (vor Einsatz gegen die installierte Drive-Version prüfen).

import base64
import binascii
import json

import frappe
from frappe.utils import add_months, cint, flt, getdate, nowdate

from oekoinvest_app.plattform import kyc_kern as k
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe, unterrollen

MAX_BASE64 = (k.UPLOAD_MAX_BYTES + 2) // 3 * 4 + 16

# ================================================================ Rechte


def ist_compliance(n):
	return ist_admin(n) and "compliance" in unterrollen(n) and stufe(n, "compliance") >= 2


def compliance_lesen(n):
	return ist_admin(n) and stufe(n, "compliance") >= 1


def compliance_noetig(n):
	if not n:
		nicht_angemeldet()
	if not ist_compliance(n):
		verboten("Nur für die Compliance (Backoffice-Rolle „Compliance“).")


# ================================================================ Fall ⇄ JSON


def _verlauf(f, status, n, rolle, kommentar="", oeffentlich=True):
	liste = aus_json(f.verlauf_json, []) or []
	liste.append({"status": status, "am": iso(jetzt()), "vonId": (n or {}).get("id"), "rolle": rolle, "kommentar": v.mehrzeilig(kommentar, 1000), "oeffentlich": oeffentlich})
	f.verlauf_json = als_json(liste[-200:])


def _status_setzen(f, nach, n, wer, kommentar="", oeffentlich=True):
	if not k.uebergang_erlaubt(f.status, nach, wer):
		konflikt(f"Statuswechsel „{k.STATUS.get(f.status)}“ → „{k.STATUS.get(nach)}“ ist nicht möglich.")
	von = f.status
	f.status = nach
	_verlauf(f, nach, n, wer, kommentar, oeffentlich)
	f.flags.kyc_uebergang = True
	protokoll(n, "kyc_status", "kyc", f.name, f"{k.STATUS.get(von)} → {k.STATUS.get(nach)}")


def _dokumente(fall_name, geloescht=False):
	filters = {"fall": fall_name}
	if not geloescht:
		filters["geloescht"] = 0
	return frappe.get_all(k.DT_DOK, filters=filters, fields=["name", "fall", "konto", "art", "flaeche", "person_id", "ausgestellt_am", "dateiname", "mime", "groesse", "sha256", "status", "pruefung_json", "am", "geloescht", "datei_id"], order_by="am asc")


def dokument_meta(d, compliance=False):
	out = {
		"id": d.name, "fallId": d.fall, "art": d.art, "artLabel": k.DOKUMENTE.get(d.art, (d.art,))[0], "name": d.dateiname, "mime": d.mime, "groesse": cint(d.groesse), "am": iso(d.am),
		"flaecheId": d.flaeche or None, "personId": d.person_id or None, "ausgestelltAm": str(d.ausgestellt_am) if d.ausgestellt_am else None, "status": d.status,
		"grund": (aus_json(d.pruefung_json, {}) or {}).get("notiz", "") if d.status == "abgelehnt" else "",
	}
	if compliance:
		out.update({"sha256": d.sha256, "pruefung": aus_json(d.pruefung_json), "verschluesselt": True, "pruefpunkte": k.DOKUMENTE.get(d.art, ("", "", []))[2]})
	return out


def _bank(fall_name):
	return frappe.db.get_value(k.DT_BANK, {"fall": fall_name}, ["name", "iban", "bic", "kontoinhaber", "iban_ok", "inhaber_passt", "geprueft"], as_dict=True)


def fall_dict(f, mit_dokumenten=True):
	"""Interne Darstellung wie im Demo-Backend (für Anforderungen, Risiko, Abgleich)."""
	firma = aus_json(f.firma_json, {}) or {}
	b = _bank(f.name) or {}
	return {
		"id": f.name, "kontoId": f.konto, "organisationId": f.organisation or None, "kontotyp": f.kontotyp or "", "investorTyp": f.get("investor_typ") or "", "status": f.status,
		"person": aus_json(f.person_json, {}) or {}, "firma": {kk: vv for kk, vv in firma.items() if kk != "einreicherVertretungsberechtigt"},
		"einreicherVertretungsberechtigt": firma.get("einreicherVertretungsberechtigt"),
		"ubos": [{"id": u.zeile_id or u.name, "vorname": u.vorname, "nachname": u.nachname, "geburtsdatum": str(u.geburtsdatum) if u.geburtsdatum else "", "staatsangehoerigkeit": u.staatsangehoerigkeit, "wohnsitzland": u.wohnsitzland, "anteil": flt(u.anteil) or None, "kontrolleArt": u.kontrolle_art, "pep": bool(u.pep)} for u in f.get("ubos") or []],
		"vertreter": aus_json(f.vertreter_json, []) or [],
		"pep": aus_json(f.pep_json, {}) or {}, "mittelherkunft": aus_json(f.mittelherkunft_json, {}) or {}, "steuer": aus_json(f.steuer_json, {}) or {},
		"bank": {"iban": b.get("iban") or "", "bic": b.get("bic") or "", "kontoinhaber": b.get("kontoinhaber") or "", "geprueft": bool(b.get("geprueft"))} if b else {},
		"risiko": aus_json(f.risiko_json, {}) or ({"stufe": f.risiko} if f.risiko else {}), "sanktionen": aus_json(f.sanktionen_json, {}) or {},
		"dokumente": [{"id": d.name, "art": d.art, "status": d.status, "geloescht": cint(d.geloescht), "flaecheId": d.flaeche, "personId": d.person_id, "ausgestelltAm": str(d.ausgestellt_am) if d.ausgestellt_am else None} for d in _dokumente(f.name)] if mit_dokumenten else [],
	}


def _konto_rollen(konto_id):
	return [r.rolle for r in frappe.get_all("Plattform Konto Rolle", filters={"parent": konto_id, "parenttype": "Plattform Konto"}, fields=["rolle"])]


def _flaechen(konto_id):
	return [{"id": x.name, "bezeichnung": x.bezeichnung, "land": x.land} for x in frappe.get_all("Plattform Flaeche", filters={"nutzer_id": konto_id}, fields=["name", "bezeichnung", "land"])]


def _anforderungen(f, nur_geprueft=False):
	d = fall_dict(f)
	if nur_geprueft:
		d["dokumente"] = [x for x in d["dokumente"] if x["status"] == "ok"]
	return k.anforderungen(d, rollen=_konto_rollen(f.konto), flaechen=_flaechen(f.konto), einstellungen=k.einstellungen())


def fall_fuer_nutzer(f):
	if not f:
		return None
	d = fall_dict(f)
	sicht = "in_pruefung" if f.status == "zweitpruefung" else f.status
	b = d["bank"]
	return {
		"investorVorgaben": k.investor_vorgaben(d["investorTyp"]),
		**{kk: d[kk] for kk in ("id", "kontotyp", "investorTyp", "organisationId", "person", "firma", "ubos", "vertreter", "einreicherVertretungsberechtigt", "pep", "mittelherkunft", "steuer")},
		"status": sicht, "statusLabel": k.STATUS.get(sicht, sicht),
		"bank": {"iban": " ".join(b["iban"][i:i + 4] for i in range(0, len(b["iban"]), 4)) if b.get("iban") else "", "kontoinhaber": b.get("kontoinhaber", ""), "bic": b.get("bic", ""), "geprueft": f.status == "verifiziert" and b.get("geprueft", False)} if b else {},
		"nachforderung": f.nachforderung or "" if f.status == "nachgefordert" else "",
		"eingereichtAm": iso(f.eingereicht_am), "verifiziertAm": iso(f.verifiziert_am), "naechstePruefung": str(f.naechste_pruefung) if f.naechste_pruefung else None,
		"verlauf": [{"status": "in_pruefung" if x.get("status") == "zweitpruefung" else x.get("status"), "am": x.get("am"), "kommentar": "" if x.get("rolle") == "nutzer" else x.get("kommentar", "")} for x in aus_json(f.verlauf_json, []) or [] if x.get("oeffentlich", True)],
		"bearbeitbar": f.status in k.BEARBEITBAR,
		"dokumente": [dokument_meta(x) for x in _dokumente(f.name)],
	}


def _investor_typ(n):
	"""Investorentyp aus dem (Konto- bzw. Team-)Suchprofil – nur Investorenkonten; wird in den KYC-Fall übernommen."""
	if "investor" not in (n.get("rollen") or []):
		return ""
	from oekoinvest_app.plattform.organisation import suchprofil_fuer

	sp = suchprofil_fuer(n) or {}
	typ = sp.get("investorTyp") if isinstance(sp, dict) else ""
	if not typ:
		eigen = aus_json(frappe.db.get_value("Plattform Konto", n.id, "suchprofil"), {}) or {}
		typ = eigen.get("investorTyp") if isinstance(eigen, dict) else ""
	return typ if k.investor_vorgaben(typ) else ""


def _eigener_fall(n):
	name = frappe.db.get_value(k.DT_FALL, {"konto": n.id, "status": ["!=", "geloescht"]}, "name", order_by="creation desc")
	return frappe.get_doc(k.DT_FALL, name) if name else None


def _fall_laden(kennung):
	name = v.kennung(kennung)
	if not name or not frappe.db.exists(k.DT_FALL, name):
		nicht_gefunden("KYC-Fall nicht gefunden.")
	return frappe.get_doc(k.DT_FALL, name)


def _spalten_setzen(f):
	"""Abgeleitete Spalten für Listen, Report, Druckformat und Notification."""
	p = aus_json(f.person_json, {}) or {}
	fi = aus_json(f.firma_json, {}) or {}
	f.vorname, f.nachname = p.get("vorname") or "", p.get("nachname") or ""
	f.geburtsdatum = p.get("geburtsdatum") or None
	f.staatsangehoerigkeit = p.get("staatsangehoerigkeit") or ""
	f.wohnsitzland = (p.get("adresse") or {}).get("land") or ""
	f.ausweis_gueltig_bis = (p.get("ausweis") or {}).get("gueltigBis") or None
	f.firma_name, f.firma_land, f.registernummer = fi.get("name") or "", fi.get("land") or "", fi.get("registernummer") or ""
	f.bezeichnung = (f.firma_name if f.kontotyp == "unternehmen" else f"{f.vorname} {f.nachname}".strip()) or name_von(f.konto)
	pep = aus_json(f.pep_json, {}) or {}
	f.pep = 1 if (pep.get("istPep") or pep.get("naheStehend") or any(u.pep for u in f.get("ubos") or [])) else 0
	if not f.email:
		f.email = frappe.db.get_value("Plattform Konto", f.konto, "email")


def _speichern(f):
	_spalten_setzen(f)
	f.flags.kyc_uebergang = True
	f.save(ignore_permissions=True)


def _nutzer_melden(f, titel, text):
	# Glocke ohne E-Mail – die E-Mail (ohne Inhalte) versendet die Notification „KYC Status an Nutzer“
	benachrichtigen(f.konto, "status", titel, text, "/portal/verifizierung", "kyc", f.name, mail=False)


def _compliance_konten():
	out = []
	for name in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"):
		kk = frappe.db.get_value("Plattform Konto", name, ["name", "aktiv", "backoffice_rollen"], as_dict=True)
		if kk and cint(kk.aktiv) and "compliance" in str(kk.backoffice_rollen or "").split(","):
			out.append(kk.name)
	return out


def _compliance_melden(f, titel, text, ohne=None):
	for kid in _compliance_konten():
		if kid != ohne:
			benachrichtigen(kid, "aufgabe", titel, text, f"/portal/admin/compliance/{f.name}", "kyc", f.name, mail_text="Im Compliance-Bereich liegt ein Vorgang zur Prüfung bereit. Details nur im Portal.")


# ================================================================ Sanktionsabgleich


def liste_laden():
	stand = frappe.db.get_single_value(k.DT_EINST, "liste_stand") or ""
	schluessel = f"oekoinvest_kyc_liste:{stand}"
	gecacht = frappe.cache().get_value(schluessel)
	if gecacht is not None:
		return gecacht
	eintraege = [
		{"id": e.eintrag_id, "euRef": e.eu_ref or "", "typ": e.typ or "", "namen": aus_json(e.namen, []) or [], "geburtsdaten": aus_json(e.geburtsdaten, []) or [], "programm": e.programm or ""}
		for e in frappe.get_all(k.DT_LISTE, fields=["eintrag_id", "eu_ref", "typ", "namen", "geburtsdaten", "programm"], limit_page_length=0)
	]
	liste = {"quelle": frappe.db.get_single_value(k.DT_EINST, "liste_quelle") or "", "stand": stand, "eintraege": eintraege}
	frappe.cache().set_value(schluessel, liste, expires_in_sec=3600)
	return liste


def abgleich_ausfuehren(f, n, anlass):
	liste = liste_laden()
	e = k.einstellungen()
	d = fall_dict(f, mit_dokumenten=False)
	prueflinge = k.prueflinge_aus_fall(d)
	treffer = []
	for p in prueflinge:
		for t in k.sanktions_abgleich(p, liste["eintraege"], schwelle=flt(e["trefferSchwelle"]) or 0.88):
			treffer.append({**t, "pruefling": p["rolle"], "prueflingName": p["name"]})
	alt = {f"{t.get('eintragId')}|{t.get('prueflingName')}": t for t in (aus_json(f.sanktionen_json, {}) or {}).get("treffer", [])}
	neu = []
	for t in treffer:
		a = alt.get(f"{t['eintragId']}|{t['prueflingName']}")
		neu.append({**t, **({kk: a.get(kk) for kk in ("bewertung", "begruendung", "bewertetVon", "bewertetAm")} if a and a.get("bewertung") else {"bewertung": None})})
	status = "bestaetigt" if any(t["bewertung"] == "bestaetigt" for t in neu) else "treffer_pruefen" if any(not t["bewertung"] for t in neu) else ("ausgeschlossen" if neu else "kein_treffer")
	s = {"status": status, "treffer": neu, "letzterAbgleich": iso(jetzt()), "listeStand": liste["stand"], "listeQuelle": liste["quelle"]}
	f.sanktionen_json = als_json(s)
	f.sanktionen_status = status
	frappe.get_doc({"doctype": k.DT_ABGLEICH, "fall": f.name, "am": jetzt(), "anlass": v.text(anlass, 100), "prueflinge": len(prueflinge), "treffer": len(neu), "liste_stand": liste["stand"], "von": (n or {}).get("id"), "treffer_json": als_json(neu)}).insert(ignore_permissions=True)
	protokoll(n, "kyc_abgleich", "kyc", f.name, f"Sanktionsabgleich ({anlass}): {len(prueflinge)} Namen, {len(neu)} Treffer")
	return s


def _risiko_neu(f):
	r = aus_json(f.risiko_json, {}) or {}
	if r.get("manuell"):
		return
	neu = {**k.risiko(fall_dict(f, mit_dokumenten=False), k.einstellungen()), "manuell": False}
	f.risiko_json = als_json(neu)
	f.risiko = neu["stufe"]


# ================================================================ Nutzer


@frappe.whitelist(methods=["POST"])
def fall(als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _eigener_fall(n)
	rollen = n.get("rollen") or []
	anf = k.anforderungen(fall_dict(f) if f else None, rollen=rollen, flaechen=_flaechen(n.id), einstellungen=k.einstellungen())
	st = k.kyc_status(n.id, (n.get("organisation") or {}).get("id"))
	e = k.einstellungen()
	sicht = "in_pruefung" if st["status"] == "zweitpruefung" else st["status"]
	return {
		"fall": fall_fuer_nutzer(f), "anforderungen": anf, "fortschritt": k.fortschritt(anf),
		"status": {**st, "status": sicht, "statusLabel": k.STATUS.get(sicht, sicht), "risiko": None},
		"flaechen": _flaechen(n.id),
		"investorVorgaben": k.investor_vorgaben((f.get("investor_typ") if f else "") or _investor_typ(n)),  # Vorschlag Kontotyp/Unterlagen aus dem Suchprofil
		"freigaben": {s: {"label": d[0], "aktiv": k.schritt_aktiv(s, n.id, e, k._umgebung()), "pflichtBeiGeltung": (e.get("gating") or {}).get(s) is not False, "ok": st["verifiziert"]} for s, d in k.SCHRITTE.items()},
		"ablage": {"gesetzt": bool(frappe.conf.get("oekoinvest_kyc_schluessel")), "entwicklung": False},
	}


def _datum(x):
	x = str(x or "")[:10]
	return x if len(x) == 10 and x[4] == "-" and x[7] == "-" else ""


def _land(x):
	x = str(x or "").upper()
	return x if len(x) == 2 and x.isalpha() else ""


def _person(d):
	a = d.get("adresse") if isinstance(d.get("adresse"), dict) else {}
	aw = d.get("ausweis") if isinstance(d.get("ausweis"), dict) else {}
	return {
		"vorname": v.text(d.get("vorname"), 80), "nachname": v.text(d.get("nachname"), 80), "geburtsdatum": _datum(d.get("geburtsdatum")), "geburtsort": v.text(d.get("geburtsort"), 80),
		"staatsangehoerigkeit": _land(d.get("staatsangehoerigkeit")),
		"adresse": {"strasse": v.text(a.get("strasse"), 120), "plz": v.text(a.get("plz"), 12), "ort": v.text(a.get("ort"), 80), "land": _land(a.get("land"))},
		"ausweis": {"art": v.auswahl(aw.get("art"), ["personalausweis", "reisepass", "aufenthaltstitel"], ""), "nummer": v.text(aw.get("nummer"), 30), "behoerde": v.text(aw.get("behoerde"), 120), "gueltigBis": _datum(aw.get("gueltigBis"))},
	}


def _zeilen_id(x):
	i = str((x or {}).get("id") or "")
	return i if 4 <= len(i) <= 20 and i.replace("-", "").isalnum() else frappe.generate_hash(length=8).lower()


@frappe.whitelist(methods=["POST"])
def speichern(abschnitt=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	f = _eigener_fall(n)
	if abschnitt not in ("kontotyp", "person", "firma", "ubos", "vertreter", "pep", "mittelherkunft", "steuer", "bank"):
		ungueltig("Unbekannter Abschnitt.")
	if not f:
		if abschnitt != "kontotyp":
			ungueltig("Bitte wählen Sie zuerst den Kontotyp.")
		it = _investor_typ(n)
		f = frappe.get_doc({"doctype": k.DT_FALL, "konto": n.id, "status": "offen", "kontotyp": "", "investor_typ": it})
		_verlauf(f, "offen", n, "nutzer", f"Verifizierung begonnen (Investorentyp: {k.investor_vorgaben(it)['label']})." if it else "Verifizierung begonnen.")
		f.flags.kyc_uebergang = True
		f.insert(ignore_permissions=True)
	if f.status not in k.BEARBEITBAR:
		konflikt("Ihre Verifizierung ist abgeschlossen. Für Änderungen starten Sie bitte eine erneute Prüfung." if f.status == "verifiziert" else "Ihre Angaben liegen gerade zur Prüfung vor und können nicht geändert werden.")
	f.investor_typ = _investor_typ(n) or f.get("investor_typ") or ""  # Suchprofil kann sich geändert haben
	if abschnitt == "kontotyp":
		# ohne Angabe: Vorschlag aus dem Investorentyp des Suchprofils
		typ = v.auswahl(d.get("kontotyp"), list(k.KONTOTYPEN), "") or (k.investor_vorgaben(f.investor_typ) or {}).get("kontotyp") or ""
		v.pflicht(typ, "Bitte wählen Sie den Kontotyp.")
		f.kontotyp = typ
		org = n.get("organisation") or {}
		if typ == "unternehmen" and org.get("id") and org.get("rolle") in ("inhaber", "admin") and not frappe.db.exists(k.DT_FALL, {"organisation": org["id"], "name": ["!=", f.name]}):
			f.organisation = org["id"]
			fi = aus_json(f.firma_json, {}) or {}
			fi.setdefault("name", org.get("name") or "")
			f.firma_json = als_json(fi)
		if typ == "privat":
			f.organisation = None
	elif abschnitt == "person":
		f.person_json = als_json(_person(d))
	elif abschnitt == "firma":
		fi = {"name": v.text(d.get("name"), 160), "rechtsform": v.text(d.get("rechtsform"), 60), "registernummer": v.text(d.get("registernummer"), 60), "registergericht": v.text(d.get("registergericht"), 120), "land": _land(d.get("land")), "sitz": v.text(d.get("sitz"), 160), "mehrstufig": v.wahr(d.get("mehrstufig")), "treuhand": v.wahr(d.get("treuhand"))}
		if "einreicherVertretungsberechtigt" in d:
			fi["einreicherVertretungsberechtigt"] = v.wahr(d.get("einreicherVertretungsberechtigt"))
		f.firma_json = als_json(fi)
	elif abschnitt == "ubos":
		f.set("ubos", [])
		for u in (d.get("liste") or [])[:10]:
			f.append("ubos", {"zeile_id": _zeilen_id(u), "vorname": v.text(u.get("vorname"), 80), "nachname": v.text(u.get("nachname"), 80), "geburtsdatum": _datum(u.get("geburtsdatum")) or None, "staatsangehoerigkeit": _land(u.get("staatsangehoerigkeit")), "wohnsitzland": _land(u.get("wohnsitzland")), "anteil": v.zahl(u.get("anteil"), min=0, max=100, stellen=2) or 0, "kontrolle_art": v.auswahl(u.get("kontrolleArt"), list(k.KONTROLLE_ARTEN), "anteil"), "pep": 1 if v.wahr(u.get("pep")) else 0})
	elif abschnitt == "vertreter":
		f.vertreter_json = als_json([{"id": _zeilen_id(x), "vorname": v.text(x.get("vorname"), 80), "nachname": v.text(x.get("nachname"), 80), "geburtsdatum": _datum(x.get("geburtsdatum")), "funktion": v.text(x.get("funktion"), 80), "istEinreicher": v.wahr(x.get("istEinreicher"))} for x in (d.get("liste") or [])[:8]])
	elif abschnitt == "pep":
		f.pep_json = als_json({"istPep": None if d.get("istPep") is None else v.wahr(d.get("istPep")), "naheStehend": None if d.get("naheStehend") is None else v.wahr(d.get("naheStehend")), "funktion": v.text(d.get("funktion"), 200), "angaben": v.mehrzeilig(d.get("angaben"), 1000)})
	elif abschnitt == "mittelherkunft":
		f.mittelherkunft_json = als_json({"ticket": v.auswahl(d.get("ticket"), list(k.TICKETS), ""), "quellen": v.mehrfach(d.get("quellen"), list(k.MITTEL_QUELLEN)), "text": v.mehrzeilig(d.get("text"), 1500)})
	elif abschnitt == "steuer":
		f.steuer_json = als_json({"land": _land(d.get("land")), "steuerId": v.text(d.get("steuerId"), 40)})
	elif abschnitt == "bank":
		ib = k.iban_pruefen(d.get("iban"))
		if d.get("iban") and not ib["ok"]:
			ungueltig(ib["fehler"])
		b = _bank(f.name)
		doc = frappe.get_doc(k.DT_BANK, b.name) if b else frappe.get_doc({"doctype": k.DT_BANK, "fall": f.name, "konto": n.id})
		doc.update({"iban": ib["iban"] if ib["ok"] else "", "bic": v.text(d.get("bic"), 11).upper(), "kontoinhaber": v.text(d.get("kontoinhaber"), 160), "iban_ok": 1 if ib["ok"] else 0, "geprueft": 0, "geaendert_am": jetzt()})
		doc.save(ignore_permissions=True) if b else doc.insert(ignore_permissions=True)
	_speichern(f)
	protokoll(n, "kyc_angaben", "kyc", f.name, f"Angaben gespeichert: {abschnitt}")
	anf = _anforderungen(f)
	return {"fall": fall_fuer_nutzer(f), "anforderungen": anf, "fortschritt": k.fortschritt(anf)}


@frappe.whitelist(methods=["POST"])
def dokument_speichern(art=None, flaecheId=None, personId=None, ausgestelltAm=None, name=None, mime=None, inhaltBase64=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if art not in k.DOKUMENTE:
		ungueltig("Unbekannte Dokumentart.")
	roh = str(inhaltBase64 or "")
	if not roh or len(roh) > MAX_BASE64:
		frappe.throw("Die Datei ist leer oder größer als 10 MB.", frappe.ValidationError)
	try:
		daten = base64.b64decode(roh, validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Ungültige Datei.")
	echt = k.mime_aus_bytes(daten)
	if not echt or len(daten) > k.UPLOAD_MAX_BYTES:
		ungueltig("Erlaubt sind PDF, JPG und PNG bis 10 MB.")
	f = _eigener_fall(n)
	if not f:
		ungueltig("Bitte wählen Sie zuerst den Kontotyp.")
	if f.status not in k.BEARBEITBAR:
		konflikt("Ihre Unterlagen liegen gerade zur Prüfung vor bzw. sind geprüft. Für Änderungen starten Sie bitte eine erneute Prüfung.")
	bezug = k.DOKUMENTE[art][1]
	fl = None
	if bezug == "flaeche":
		fl = v.kennung(flaecheId)
		if not fl or frappe.db.get_value("Plattform Flaeche", fl, "nutzer_id") != n.id:
			verboten("Eigentumsnachweise nur für eigene Flächen.")
	if bezug == "vertreter":
		v.pflicht(any(x.get("id") == str(personId or "") for x in aus_json(f.vertreter_json, []) or []), "Bitte ordnen Sie den Ausweis einer vertretungsberechtigten Person zu.")
	d = frappe.get_doc({"doctype": k.DT_DOK, "fall": f.name, "konto": n.id, "art": art, "flaeche": fl, "person_id": str(personId) if bezug == "vertreter" else None, "ausgestellt_am": _datum(ausgestelltAm) or None, "dateiname": v.text(name, 160) or f"unterlage.{k.UPLOAD_TYPEN[echt]}", "mime": echt, "groesse": len(daten), "sha256": k.sha256_hex(daten), "status": "neu", "am": jetzt()})
	d.insert(ignore_permissions=True)
	datei = frappe.get_doc({"doctype": "File", "file_name": f"{d.name}-{frappe.generate_hash(length=12)}.bin", "is_private": 1, "content": k.verschluesseln(daten, d.name), "attached_to_doctype": k.DT_DOK, "attached_to_name": d.name})
	datei.flags.ignore_permissions = True
	datei.insert(ignore_permissions=True)
	d.db_set("datei_id", datei.name)
	protokoll(n, "kyc_upload", "kyc", f.name, f"Unterlage hochgeladen: {k.DOKUMENTE[art][0]} ({d.name})")
	return dokument_meta(frappe.get_doc(k.DT_DOK, d.name))


@frappe.whitelist(methods=["POST"])
def dokument_lesen(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	name = v.kennung(id)
	if not name or not frappe.db.exists(k.DT_DOK, name):
		nicht_gefunden("Unterlage nicht gefunden.")
	d = frappe.get_doc(k.DT_DOK, name)
	if cint(d.geloescht):
		nicht_gefunden("Unterlage nicht gefunden.")
	eigen = d.konto == n.id
	if not eigen and not ist_compliance(n):
		protokoll(n, "kyc_zugriff_verweigert", "kyc", d.fall, f"Zugriff auf Unterlage {d.name} verweigert", ip or "")
		frappe.db.commit()  # Protokoll trotz Fehler behalten
		verboten("Auf diese Unterlage haben Sie keinen Zugriff.")
	inhalt = k.entschluesseln(frappe.get_doc("File", d.datei_id).get_content(), d.name)
	protokoll(n, "kyc_zugriff", "kyc", d.fall, f"Unterlage {d.name} ({k.DOKUMENTE.get(d.art, (d.art,))[0]}) geöffnet – {'eigene' if eigen else 'Compliance'}", ip or "")
	return {"meta": dokument_meta(d), "inhaltBase64": base64.b64encode(inhalt).decode()}


def _datei_loeschen(d):
	if d.datei_id and frappe.db.exists("File", d.datei_id):
		frappe.delete_doc("File", d.datei_id, ignore_permissions=True, force=True)


@frappe.whitelist(methods=["POST"])
def dokument_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	name = v.kennung(id)
	d = frappe.get_doc(k.DT_DOK, name) if name and frappe.db.exists(k.DT_DOK, name) else None
	if not d or d.konto != n.id or cint(d.geloescht):
		nicht_gefunden("Unterlage nicht gefunden.")
	f = frappe.get_doc(k.DT_FALL, d.fall)
	if f.status not in k.BEARBEITBAR or d.status == "ok":
		konflikt("Geprüfte bzw. eingereichte Unterlagen können nicht gelöscht werden.")
	_datei_loeschen(d)
	d.db_set({"geloescht": 1, "datei_id": None})
	protokoll(n, "kyc_upload_geloescht", "kyc", f.name, f"Unterlage {d.name} gelöscht")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def einreichen(ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _eigener_fall(n)
	if not f:
		ungueltig("Bitte beginnen Sie zuerst mit der Verifizierung.")
	if f.status in k.BEARBEITBAR:
		f.investor_typ = _investor_typ(n) or f.get("investor_typ") or ""
	fp = k.fortschritt(_anforderungen(f))
	if fp["fehlend"]:
		ungueltig("Es fehlen noch: " + " · ".join(x["label"] for x in fp["fehlend"]))
	_status_setzen(f, "eingereicht", n, "nutzer", "Zur Prüfung eingereicht.")
	f.eingereicht_am = jetzt()
	f.nachforderung = ""
	b = _bank(f.name)
	if b:
		d = fall_dict(f, mit_dokumenten=False)
		passt = k.kontoinhaber_passt(b.kontoinhaber, firma=d["firma"].get("name")) if f.kontotyp == "unternehmen" else k.kontoinhaber_passt(b.kontoinhaber, d["person"].get("vorname"), d["person"].get("nachname"))
		frappe.db.set_value(k.DT_BANK, b.name, "inhaber_passt", 1 if passt else 0)
	abgleich_ausfuehren(f, n, "Einreichung")
	_risiko_neu(f)
	_speichern(f)
	_compliance_melden(f, f"{'KYB' if f.kontotyp == 'unternehmen' else 'KYC'} zur Prüfung: {f.name}", f"Neuer Vorgang in der Warteschlange (Risiko {f.risiko}).")
	_nutzer_melden(f, "Verifizierung eingereicht", "Vielen Dank – wir prüfen Ihre Angaben und melden uns im Portal.")
	anf = _anforderungen(f)
	return {"fall": fall_fuer_nutzer(f), "anforderungen": anf, "fortschritt": k.fortschritt(anf)}


@frappe.whitelist(methods=["POST"])
def erneut(als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _eigener_fall(n)
	if not f:
		nicht_gefunden("Keine Verifizierung vorhanden.")
	if f.status == "abgelehnt":
		konflikt("Bitte wenden Sie sich über „Nachrichten“ an ÖkoInvest.")
	if f.status != "verifiziert":
		konflikt("Ihre Verifizierung kann derzeit bereits bearbeitet werden.")
	_status_setzen(f, "offen", n, "nutzer", "Erneute Prüfung gestartet.")
	_speichern(f)
	anf = _anforderungen(f)
	return {"fall": fall_fuer_nutzer(f), "anforderungen": anf, "fortschritt": k.fortschritt(anf)}


@frappe.whitelist(methods=["POST"])
def status(kontoId=None, organisationId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer, pflicht=False)
	if n and not ist_admin(n):
		if kontoId and kontoId != n.id:
			verboten()
		if organisationId and (n.get("organisation") or {}).get("id") != organisationId:
			verboten()
	st = k.kyc_status(kontoId or (n.id if n and not organisationId else None), organisationId)
	sicht = "in_pruefung" if st["status"] == "zweitpruefung" else st["status"]
	return {**st, "status": sicht, "statusLabel": k.STATUS.get(sicht, sicht), "risiko": st["risiko"] if n and compliance_lesen(n) else None}


@frappe.whitelist(methods=["POST"])
def freigabe(schritt=None, kontoId=None, organisationId=None, flaecheId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer, pflicht=False)
	if schritt not in k.SCHRITTE:
		ungueltig("Unbekannter Schritt.")
	ziel = kontoId or (n.id if n else None)
	if n and not ist_admin(n) and (ziel != n.id or (organisationId and (n.get("organisation") or {}).get("id") != organisationId)):
		verboten()
	return {**k.kyc_freigabe(schritt, ziel, organisationId, v.kennung(flaecheId) or None), "schrittLabel": k.SCHRITTE[schritt][0]}


@frappe.whitelist(methods=["POST"])
def ergebnis_anhaengen(fallId=None, kontoId=None, organisationId=None, eintrag=None, als_benutzer=None):  # noqa: N803
	"""Nur der API-Nutzer (Systemaufruf, kein als_benutzer): externes Prüfergebnis anhängen."""
	if als_benutzer:
		verboten("Nur als Systemaufruf.")
	nutzer(None, pflicht=False)
	r = k.ergebnis_anhaengen(v.kennung(fallId) or None, aus_json(eintrag, {}) or {}, konto_id=v.kennung(kontoId) or None, organisation_id=v.kennung(organisationId) or None)
	if r["ergebnis"] in ("auffaellig", "fehler"):
		_compliance_melden(frappe.get_doc(k.DT_FALL, r["fallId"]), f"Externes Prüfergebnis auffällig: {r['fallId']}", f"{r['quelle']}: {r['zusammenfassung'] or r['ergebnis']}"[:280])
	return r


# ================================================================ Compliance


def _zeile(f):
	konto = frappe.db.get_value("Plattform Konto", f.konto, ["name", "email", "vorname", "nachname"], as_dict=True) or {}
	warte = f.eingereicht_am or f.creation
	return {
		"id": f.name, "kontoId": f.konto, "konto": {"name": f"{konto.get('vorname') or ''} {konto.get('nachname') or ''}".strip(), "email": konto.get("email"), "rollen": _konto_rollen(f.konto)} if konto else None,
		"organisation": {"id": f.organisation, "name": frappe.db.get_value("Plattform Organisation", f.organisation, "titel")} if f.organisation else None,
		"kontotyp": f.kontotyp, "investorTyp": f.get("investor_typ") or "", "investorTypLabel": (k.investor_vorgaben(f.get("investor_typ")) or {}).get("label", ""),
		"bezeichnung": f.bezeichnung, "status": f.status, "statusLabel": k.STATUS.get(f.status), "risiko": f.risiko or None, "sanktionen": f.sanktionen_status or None,
		"pep": bool(cint(f.pep)), "eingereichtAm": iso(f.eingereicht_am), "wartetTage": (getdate(nowdate()) - getdate(warte)).days if warte else None,
		"bearbeiterId": f.bearbeiter, "bearbeiter": name_von(f.bearbeiter) if f.bearbeiter else "", "erstPrueferId": f.erst_pruefer,
		"naechstePruefung": str(f.naechste_pruefung) if f.naechste_pruefung else None, "ausweisGueltigBis": str(f.ausweis_gueltig_bis) if f.ausweis_gueltig_bis else None, "loeschenAb": str(f.loeschen_ab) if f.loeschen_ab else None,
	}


@frappe.whitelist(methods=["POST"])
def warteschlange(status=None, q=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not compliance_lesen(n):
		verboten("Nur für die Compliance.")
	felder = ["name", "konto", "organisation", "kontotyp", "investor_typ", "bezeichnung", "status", "risiko", "sanktionen_status", "pep", "eingereicht_am", "creation", "bearbeiter", "erst_pruefer", "naechste_pruefung", "ausweis_gueltig_bis", "loeschen_ab"]
	alle = frappe.get_all(k.DT_FALL, filters={"status": ["!=", "geloescht"]}, fields=felder, limit_page_length=5000)
	status = status or "offen"
	heute = getdate(nowdate())
	faellig = lambda f: f.status == "verifiziert" and f.naechste_pruefung and (getdate(f.naechste_pruefung) - heute).days <= 30  # noqa: E731
	if status == "offen":
		liste = [f for f in alle if f.status in k.WARTESCHLANGE]
	elif status in k.STATUS:
		liste = [f for f in alle if f.status == status]
	elif status == "treffer":
		liste = [f for f in alle if f.sanktionen_status in ("treffer_pruefen", "bestaetigt")]
	elif status == "faellig":
		liste = [f for f in alle if faellig(f)]
	else:
		liste = alle
	zeilen = [_zeile(f) for f in liste]
	suche = v.text(q, 80).lower()
	if suche:
		zeilen = [z for z in zeilen if suche in f"{z['id']} {z['bezeichnung']} {(z['konto'] or {}).get('email', '')}".lower()]
	rang = {"zweitpruefung": 0, "eingereicht": 1, "in_pruefung": 2}
	zeilen.sort(key=lambda z: (rang.get(z["status"], 5), 0 if z["risiko"] == "hoch" else 1, z["eingereichtAm"] or ""))
	if not ist_compliance(n):
		for z in zeilen:
			if z["konto"]:
				z["konto"] = {"name": z["konto"]["name"], "rollen": z["konto"]["rollen"]}
	liste_info = liste_laden()
	return {
		"faelle": zeilen,
		"kennzahlen": {
			"warteschlange": sum(1 for f in alle if f.status in k.WARTESCHLANGE), "zweitpruefung": sum(1 for f in alle if f.status == "zweitpruefung"),
			"treffer": sum(1 for f in alle if f.sanktionen_status == "treffer_pruefen"), "hoch": sum(1 for f in alle if f.risiko == "hoch" and f.status != "abgelehnt"),
			"verifiziert": sum(1 for f in alle if f.status == "verifiziert"), "faellig": sum(1 for f in alle if faellig(f)), "nachgefordert": sum(1 for f in alle if f.status == "nachgefordert"),
		},
		"liste": {"quelle": liste_info["quelle"], "stand": liste_info["stand"], "anzahl": len(liste_info["eintraege"]), "demo": False},
		"schreiben": ist_compliance(n),
	}


@frappe.whitelist(methods=["POST"])
def fall_detail(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	compliance_noetig(n)
	f = _fall_laden(id)
	protokoll(n, "kyc_einsicht", "kyc", f.name, "Fall eingesehen (Compliance)", ip or "")
	d = fall_dict(f)
	e = k.einstellungen()
	b = _bank(f.name)
	anf = _anforderungen(f)
	konto = frappe.db.get_value("Plattform Konto", f.konto, ["name", "email", "vorname", "nachname", "firma"], as_dict=True) or {}
	zugriffe = frappe.get_all("Plattform Aktivitaet", filters={"objekt_art": "kyc", "objekt_id": f.name}, fields=["name", "am", "aktion", "text", "nutzer_id", "entry_hash"], order_by="am desc", limit_page_length=60) if frappe.db.has_column("Plattform Aktivitaet", "entry_hash") else frappe.get_all("Plattform Aktivitaet", filters={"objekt_art": "kyc", "objekt_id": f.name}, fields=["name", "am", "aktion", "text", "nutzer_id"], order_by="am desc", limit_page_length=60)
	risiko = aus_json(f.risiko_json, {}) or {}
	pruefung = aus_json(f.pruefung_json, {}) or {}
	return {
		**_zeile(f),
		"konto": {"id": f.konto, "name": f"{konto.get('vorname') or ''} {konto.get('nachname') or ''}".strip(), "email": konto.get("email"), "rollen": _konto_rollen(f.konto), "firma": konto.get("firma") or ""},
		**{kk: d[kk] for kk in ("person", "firma", "ubos", "vertreter", "einreicherVertretungsberechtigt", "pep", "mittelherkunft", "steuer")},
		"bank": {**d["bank"], "ibanFormatiert": " ".join(d["bank"]["iban"][i:i + 4] for i in range(0, len(d["bank"]["iban"]), 4)), "ibanPruefung": k.iban_pruefen(d["bank"]["iban"]), "inhaberPasst": bool(cint(b.inhaber_passt))} if b else None,
		"risikoDetail": risiko or None, "risikoRegel": k.risiko(d, e), "sanktionenDetail": aus_json(f.sanktionen_json) or None,
		"abgleiche": [{"id": a.name, "am": iso(a.am), "anlass": a.anlass, "prueflinge": a.prueflinge, "treffer": a.treffer, "listeStand": a.liste_stand} for a in frappe.get_all(k.DT_ABGLEICH, filters={"fall": f.name}, fields=["name", "am", "anlass", "prueflinge", "treffer", "liste_stand"], order_by="am desc", limit_page_length=20)],
		"pruefung": pruefung, "nachforderung": f.nachforderung or "", "entscheidung": pruefung.get("entscheidung"),
		"verlauf": [{**x, "von": name_von(x.get("vonId")) if x.get("vonId") else ("System" if x.get("rolle") == "system" else "")} for x in aus_json(f.verlauf_json, []) or []],
		"dokumente": [{**dokument_meta(x, compliance=True), "flaeche": frappe.db.get_value("Plattform Flaeche", x.flaeche, "bezeichnung") if x.flaeche else None} for x in _dokumente(f.name)],
		"anforderungen": anf, "fortschritt": k.fortschritt(anf), "fortschrittGeprueft": k.fortschritt(_anforderungen(f, nur_geprueft=True)),
		"vierAugen": vier_augen_noetig(f, e),
		"pruefergebnisse": list(reversed(aus_json(f.pruefergebnisse_json, []) or [])),
		"zugriffe": [{"id": z.name, "am": iso(z.am), "aktion": z.aktion, "text": z.text, "nutzer": name_von(z.nutzer_id) or "System", "hash": z.get("entry_hash")} for z in zugriffe],
		"beziehungEnde": str(f.beziehung_ende) if f.beziehung_ende else None, "loeschenAb": str(f.loeschen_ab) if f.loeschen_ab else None, "ichBinErstpruefer": f.erst_pruefer == n.id,
	}


def vier_augen_noetig(f, e):
	"""Vier-Augen: immer (Einstellung), bei Risiko hoch oder wenn ein Sanktionstreffer ausgeschlossen wurde."""
	treffer = (aus_json(f.sanktionen_json, {}) or {}).get("treffer") or []
	return k.vier_augen(e, f.risiko, aus_json(f.risiko_json, {}) or {}, treffer)  # Regel-Risiko „hoch“ bleibt Vier-Augen-pflichtig


def _verifizieren_pruefen(f):
	s = aus_json(f.sanktionen_json, {}) or {}
	if s.get("status") in ("treffer_pruefen", "bestaetigt"):
		konflikt("Offener oder bestätigter Sanktionstreffer – eine Verifizierung ist nicht möglich.")
	ungeprueft = [x for x in _dokumente(f.name) if x.status == "neu"]
	if ungeprueft:
		konflikt("Bitte zuerst alle Unterlagen prüfen (Prüfliste): " + ", ".join(k.DOKUMENTE.get(x.art, (x.art,))[0] for x in ungeprueft))
	fp = k.fortschritt(_anforderungen(f, nur_geprueft=True))
	if fp["fehlend"]:
		konflikt("Pflichtangaben/-unterlagen fehlen oder sind nicht geprüft: " + " · ".join(x["label"] for x in fp["fehlend"]))


def desk_entscheidung_pruefen(f, von):
	"""Desk/Workflow: gleiche Regeln wie die API (Controller KYC Fall)."""
	if f.status != von and f.konto and frappe.db.get_value("Plattform Konto", f.konto, "user") == frappe.session.user:
		frappe.throw("Den eigenen KYC-Fall prüft eine andere Person der Compliance.", frappe.PermissionError)
	if f.status == "verifiziert":
		_verifizieren_pruefen(f)
		e = k.einstellungen()
		vier = vier_augen_noetig(f, e)
		if vier and von != "zweitpruefung":
			frappe.throw("Hohes Risiko: zuerst „Zweitprüfung“, die Freigabe erteilt eine andere Person.")


def _verifiziert_setzen(f, n, e):
	f.verifiziert_am = jetzt()
	f.naechste_pruefung = add_months(nowdate(), cint((e.get("wiederholungMonate") or {}).get(f.risiko or "mittel", 24)))
	b = _bank(f.name)
	if b:
		d = fall_dict(f, mit_dokumenten=False)
		ok = k.iban_pruefen(b.iban)["ok"]
		passt = k.kontoinhaber_passt(b.kontoinhaber, firma=d["firma"].get("name")) if f.kontotyp == "unternehmen" else k.kontoinhaber_passt(b.kontoinhaber, d["person"].get("vorname"), d["person"].get("nachname"))
		frappe.db.set_value(k.DT_BANK, b.name, {"iban_ok": 1 if ok else 0, "inhaber_passt": 1 if passt else 0, "geprueft": 1 if ok and passt else 0})
	f.erinnerungen_json = als_json({})
	_nutzer_melden(f, "Verifizierung abgeschlossen", "Ihre Identität ist bestätigt. Alle Funktionen stehen Ihnen offen.")


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	compliance_noetig(n)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("aktion"), ["uebernehmen", "pruefliste", "risiko", "entscheiden", "zweitfreigabe", "treffer", "abgleich", "beziehungEnde", "notiz"], "")
	if not art:
		ungueltig("Unbekannte Aktion.")
	f = _fall_laden(id)
	if f.konto == n.id:
		verboten("Den eigenen KYC-Fall prüft eine andere Person der Compliance.")
	e = k.einstellungen()
	pruefung = aus_json(f.pruefung_json, {}) or {}
	hinweis = ""
	if art == "uebernehmen":
		f.bearbeiter = n.id
		if f.status == "eingereicht":
			_status_setzen(f, "in_pruefung", n, "compliance", "Prüfung begonnen.")
	elif art == "pruefliste":
		if f.status not in k.WARTESCHLANGE:
			konflikt("Die Prüfliste kann nur während der Prüfung bearbeitet werden.")
		name = v.kennung(d.get("dokumentId"))
		if not name or frappe.db.get_value(k.DT_DOK, name, "fall") != f.name:
			nicht_gefunden("Unterlage nicht gefunden.")
		dok = frappe.get_doc(k.DT_DOK, name)
		punkte = {p: v.wahr((d.get("punkte") or {}).get(p)) for p in k.DOKUMENTE[dok.art][2]}
		ergebnis = v.auswahl(d.get("ergebnis"), ["ok", "abgelehnt", "neu"], "neu")
		notiz = v.mehrzeilig(d.get("notiz"), 600)
		if ergebnis == "ok":
			v.pflicht(all(punkte.values()), "Für „geprüft“ müssen alle Prüfpunkte bestätigt sein: " + " · ".join(k.PRUEFPUNKTE[p] for p in k.DOKUMENTE[dok.art][2]))
		if ergebnis == "abgelehnt":
			v.pflicht(len(notiz) >= 5, "Bitte begründen Sie die Ablehnung der Unterlage (wird dem Nutzer angezeigt).")
		dok.db_set({"status": ergebnis, "pruefung_json": als_json({"punkte": punkte, "notiz": notiz, "vonId": n.id, "am": iso(jetzt())})})
		if f.status == "eingereicht":
			_status_setzen(f, "in_pruefung", n, "compliance", "Prüfung begonnen.")
		protokoll(n, "kyc_pruefliste", "kyc", f.name, f"Unterlage {dok.name}: {ergebnis}")
	elif art == "risiko":
		st = v.auswahl(d.get("stufe"), ["niedrig", "mittel", "hoch"], "")
		begr = v.mehrzeilig(d.get("begruendung"), 600)
		v.pflicht(st, "Bitte Risikostufe wählen.")
		v.pflicht(len(begr) >= 5, "Bitte begründen Sie die manuelle Einstufung.")
		regel = k.risiko(fall_dict(f, mit_dokumenten=False), e)
		f.risiko_json = als_json({**regel, "stufe": st, "manuell": True, "begruendung": begr, "regelStufe": regel["stufe"], "vonId": n.id, "am": iso(jetzt())})
		f.risiko = st
		f.risiko_manuell = 1
		protokoll(n, "kyc_risiko", "kyc", f.name, f"Risiko manuell: {st} (Regel: {regel['stufe']})")
	elif art == "abgleich":
		s = abgleich_ausfuehren(f, n, "manuell")
		_risiko_neu(f)
		if f.status == "verifiziert" and s["status"] == "treffer_pruefen":
			f.status = "in_pruefung"
			_verlauf(f, "in_pruefung", n, "compliance", "Erneute Prüfung nach Sanktionsabgleich.", oeffentlich=False)
		hinweis = f"{len(s['treffer'])} möglicher Treffer – manuelle Prüfung erforderlich." if s["treffer"] else "Kein Treffer."
	elif art == "treffer":
		s = aus_json(f.sanktionen_json, {}) or {}
		t = next((x for x in s.get("treffer", []) if x.get("eintragId") == str(d.get("eintragId") or "") and (not d.get("prueflingName") or x.get("prueflingName") == d.get("prueflingName"))), None)
		if not t:
			nicht_gefunden("Treffer nicht gefunden.")
		bew = v.auswahl(d.get("bewertung"), ["ausgeschlossen", "bestaetigt"], "")
		begr = v.mehrzeilig(d.get("begruendung"), 1000)
		v.pflicht(bew, "Bitte bewerten Sie den Treffer.")
		v.pflicht(len(begr) >= 10, "Bitte dokumentieren Sie die Begründung (mind. 10 Zeichen).")
		t.update({"bewertung": bew, "begruendung": begr, "bewertetVon": n.id, "bewertetAm": iso(jetzt())})
		liste = s["treffer"]
		s["status"] = "bestaetigt" if any(x.get("bewertung") == "bestaetigt" for x in liste) else "treffer_pruefen" if any(not x.get("bewertung") for x in liste) else "ausgeschlossen"
		f.sanktionen_json = als_json(s)
		f.sanktionen_status = s["status"]
		_risiko_neu(f)
		protokoll(n, "kyc_treffer", "kyc", f.name, f"Sanktionstreffer {t['eintragId']} ({t.get('prueflingName')}): {bew}")
		if bew == "bestaetigt":
			hinweis = "Treffer bestätigt: Geldwäschebeauftragten informieren, keine Mittel bereitstellen, Meldepflicht prüfen (§ 43 GwG). Den Kunden nicht informieren (§ 47 GwG)."
	elif art in ("entscheiden", "zweitfreigabe"):
		ergebnis = v.auswahl(d.get("ergebnis"), ["verifiziert", "nachgefordert", "abgelehnt"], "")
		grund = v.mehrzeilig(d.get("grund"), 1500)
		v.pflicht(ergebnis, "Bitte wählen Sie ein Ergebnis.")
		if art == "zweitfreigabe":
			if f.status != "zweitpruefung":
				konflikt("Der Fall wartet nicht auf eine Zweitfreigabe.")
			if f.erst_pruefer == n.id:
				konflikt("Vier-Augen-Prinzip: Die Zweitfreigabe muss eine andere Person erteilen.")
		elif f.status not in ("eingereicht", "in_pruefung"):
			konflikt("Der Fall ist nicht in Prüfung.")
		if ergebnis in ("nachgefordert", "abgelehnt"):
			v.pflicht(len(grund) >= 5, "Bitte begründen Sie die Entscheidung.")
		if ergebnis == "verifiziert":
			_verifizieren_pruefen(f)
		vier = vier_augen_noetig(f, e)
		if ergebnis == "verifiziert" and art == "entscheiden" and vier:
			f.erst_pruefer = n.id
			pruefung.update({"erstPrueferId": n.id, "erstAm": iso(jetzt()), "erstGrund": grund})
			_status_setzen(f, "zweitpruefung", n, "compliance", "Erstprüfung positiv – Zweitfreigabe (Vier-Augen) erforderlich.", oeffentlich=False)
			_compliance_melden(f, f"Zweitfreigabe nötig: {f.name}", "Hohes Risiko – bitte als zweite Person prüfen.", ohne=n.id)
			hinweis = "Zweitfreigabe angefordert (Vier-Augen-Prinzip)."
		else:
			if art == "zweitfreigabe":
				f.zweit_pruefer = n.id
				pruefung.update({"zweitPrueferId": n.id, "zweitAm": iso(jetzt())})
			else:
				f.erst_pruefer = n.id
				pruefung.update({"erstPrueferId": n.id, "erstAm": iso(jetzt())})
			pruefung["entscheidung"] = {"ergebnis": ergebnis, "grund": grund, "vonId": n.id, "am": iso(jetzt())}
			if ergebnis == "verifiziert":
				_status_setzen(f, "verifiziert", n, "compliance", "Verifizierung abgeschlossen.")
				_verifiziert_setzen(f, n, e)
			elif ergebnis == "nachgefordert":
				f.nachforderung = grund
				_status_setzen(f, "nachgefordert", n, "compliance", grund)
				_nutzer_melden(f, "Bitte Unterlagen ergänzen", "Für Ihre Verifizierung benötigen wir noch Angaben oder Unterlagen.")
			else:
				_status_setzen(f, "abgelehnt", n, "compliance", "Die Verifizierung konnte nicht abgeschlossen werden.")
				pruefung["ablehnGrund"] = grund
				f.loeschen_ab = k.loeschen_ab(nowdate(), cint(e.get("aufbewahrungJahre") or 5))
				_nutzer_melden(f, "Verifizierung nicht abgeschlossen", "Ihre Verifizierung konnte nicht abgeschlossen werden. Bei Fragen schreiben Sie uns über „Nachrichten“.")
		f.pruefung_json = als_json(pruefung)
	elif art == "beziehungEnde":
		dt = _datum(d.get("datum"))
		v.pflicht(dt, "Bitte geben Sie das Ende der Geschäftsbeziehung an (JJJJ-MM-TT).")
		f.beziehung_ende = dt
		f.loeschen_ab = k.loeschen_ab(dt, cint(e.get("aufbewahrungJahre") or 5))
		protokoll(n, "kyc_frist", "kyc", f.name, f"Geschäftsbeziehung beendet am {dt}, Löschung ab {f.loeschen_ab}")
	elif art == "notiz":
		t = v.mehrzeilig(d.get("text"), 1000)
		v.pflicht(len(t) >= 2, "Bitte Notiz eingeben.")
		_verlauf(f, f.status, n, "compliance", t, oeffentlich=False)
		protokoll(n, "kyc_notiz", "kyc", f.name, "Interne Notiz")
	_speichern(f)
	return {"ok": True, "status": f.status, "hinweis": hinweis}


@frappe.whitelist(methods=["POST"])
def einstellungen(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not compliance_lesen(n):
		verboten("Nur für die Compliance.")
	e = k.einstellungen()
	return {**e, "geltungWirksam": k.geltung(e, k._umgebung()), "geltungUmgebung": frappe.conf.get("oekoinvest_kyc_gating"), "schritte": {s: {"label": d[0], "hinweis": d[1]} for s, d in k.SCHRITTE.items()}, "pilotKonten": [{"id": x, "name": name_von(x), "email": frappe.db.get_value("Plattform Konto", x, "email") or ""} for x in e.get("pilotKonten") or []]}


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	compliance_noetig(n)
	d = aus_json(daten, {}) or {}
	e = k.einstellungen()
	if isinstance(d.get("gating"), dict):
		for s in k.SCHRITTE:
			if s in d["gating"]:
				e["gating"][s] = v.wahr(d["gating"][s])
	if "geltung" in d:
		e["geltung"] = d["geltung"] if d["geltung"] in ("alle", "pilot", "aus") else None
	for s in ("vierAugenBeiHoch", "vierAugenImmer"):
		if s in d:
			e[s] = v.wahr(d[s])
	if "trefferSchwelle" in d:
		e["trefferSchwelle"] = v.zahl(d["trefferSchwelle"], min=0.7, max=0.99, stellen=2) or e["trefferSchwelle"]
	if isinstance(d.get("hochrisikoLaender"), list):
		e["hochrisikoLaender"] = sorted({_land(x) for x in d["hochrisikoLaender"] if _land(x)})[:80]
	if isinstance(d.get("pilotKonto"), dict):
		kid = v.kennung(d["pilotKonto"].get("id"))
		if not kid or not frappe.db.exists("Plattform Konto", kid):
			nicht_gefunden("Konto nicht gefunden.")
		s = set(e.get("pilotKonten") or [])
		(s.add if v.wahr(d["pilotKonto"].get("an")) else s.discard)(kid)
		e["pilotKonten"] = sorted(s)[-500:]
	doc = frappe.get_single(k.DT_EINST)
	doc.einstellungen_json = json.dumps(e, ensure_ascii=False)
	doc.save(ignore_permissions=True)
	protokoll(n, "kyc_einstellungen", "kyc", "einstellungen", "KYC-Einstellungen geändert")
	return {"ok": True, "einstellungen": e}


@frappe.whitelist(methods=["POST"])
def sanktionsliste(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not compliance_lesen(n):
		verboten("Nur für die Compliance.")
	liste = liste_laden()
	return {"quelle": liste["quelle"], "stand": liste["stand"], "importiertAm": iso(frappe.db.get_single_value(k.DT_EINST, "liste_importiert_am")), "anzahl": len(liste["eintraege"]), "demo": False}


@frappe.whitelist(methods=["POST"])
def sanktion_pruefen(name=None, geburtsdatum=None, art=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	compliance_noetig(n)
	nm = v.text(name, 160)
	v.pflicht(len(nm) >= 3, "Bitte Namen angeben.")
	treffer = k.sanktions_abgleich({"name": nm, "geburtsdatum": _datum(geburtsdatum), "art": "organisation" if art == "organisation" else "person"}, liste_laden()["eintraege"], schwelle=flt(k.einstellungen()["trefferSchwelle"]) or 0.88)
	protokoll(n, "kyc_abgleich", "kyc", "einzel", f"Einzelabgleich: {len(treffer)} Treffer")
	return {"treffer": treffer}


@frappe.whitelist(methods=["POST"])
def fristen(stichtag=None, fallId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	compliance_noetig(n)
	from oekoinvest_app.plattform.kyc_aufgaben import fristen_laufen

	return fristen_laufen(n=n, stichtag=None, fall_id=v.kennung(fallId) or None)  # Stichtag nur im Demo-Backend
