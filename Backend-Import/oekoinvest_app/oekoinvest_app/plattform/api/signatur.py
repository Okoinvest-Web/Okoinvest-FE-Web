# Copyright (c) 2026, ÖkoInvest GmbH
#
# Elektronische Unterschrift (EES) – docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Referenz: src/lib/plattform/backend/demo/service-signatur.js.
# Einfache elektronische Signatur nach Art. 3 Nr. 10 eIDAS-VO – ausdrücklich KEINE qualifizierte Signatur.
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Backoffice mit Bereich „signatur“: lesen ≥ 1 alle Vorgänge + volles Protokoll; schreiben = 2 anlegen, erinnern, widerrufen.
#   Ersteller sieht/widerruft eigene Vorgänge. Unterzeichner sehen nur ihre Vorgänge; unterschreiben nur, wenn an der Reihe,
#   mit Bestätigungscode per E-Mail (Hash, 10 min, 5 Versuche, 5 Codes/Stunde). Fremde → PermissionError.
#
# Signiertes PDF: Nach der letzten Unterschrift liefert `unterschreiben` abschlussNoetig=True. Die Website holt über
# `abschluss_daten` Original + Protokolldaten, erzeugt die Prüfseite (inkrementelles PDF-Update) und übergibt das Ergebnis
# an `abschliessen`. Frappe prüft: Datei beginnt byte-genau mit dem Original (SHA-256 wie protokolliert) → erst dann
# Status „abgeschlossen“. Standard-Erklärungen (NDA/Provision im Modus „signatur“) liefern eine folgeAktion für die Website.

import base64
import binascii
import secrets

import frappe
from frappe.utils import add_days, add_to_date, get_datetime, getdate, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt, jetzt_iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.konstanten import BEZUG_ARTEN, DOCTYPE
from oekoinvest_app.plattform.rechte import stufe
from oekoinvest_app.plattform.service import mails
from oekoinvest_app.plattform.signatur import kern as sk

DT = "Plattform Signaturvorgang"
BEREICH = "signatur"


# ================================================================ Rechte & Laden


def bo_lesen(n):
	return bool(n) and "admin" in (n.get("rollen") or []) and stufe(n, BEREICH) >= 1


def bo_schreiben(n):
	return bool(n) and "admin" in (n.get("rollen") or []) and stufe(n, BEREICH) >= 2


def schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Elektronische Unterschrift“ kein Schreiben." if "admin" in (n.get("rollen") or []) else "Nur für das Backoffice.")


def rolle_im(n, s):
	if not n or not s:
		return None
	if bo_lesen(n):
		return "backoffice"
	if s.ersteller_id and s.ersteller_id == n.id:
		return "ersteller"
	if any(u.konto_id == n.id for u in s.unterzeichner):
		return "unterzeichner"
	return None


def laden(n, kennung):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Vorgang nicht gefunden.")
	s = frappe.get_doc(DT, k)
	if not rolle_im(n, s):
		verboten("Dieser Signaturvorgang betrifft Ihr Konto nicht.")
	return s


def effektiver_status(s):
	if s.status == "laufend" and s.frist and getdate(s.frist) < getdate(nowdate()):
		return "abgelaufen"
	return s.status


def _liste(s):
	return [{"position": u.position, "status": u.status, "konto_id": u.konto_id, "row": u} for u in sorted(s.unterzeichner, key=lambda x: x.position)]


def u_status(s, u):
	return sk.unterzeichner_status(effektiver_status(s), bool(s.reihenfolge), [{"position": x.position, "status": x.status} for x in s.unterzeichner], {"position": u.position, "status": u.status})


def darf_jetzt(s, u):
	return bool(u) and u_status(s, u) == "offen"


def ereignis(s, art, text, konto_id=None, ip="", user_agent="", sha=""):
	p = aus_json(s.protokoll_json, []) or []
	p.append({"id": f"SP-{secrets.token_hex(4).upper()}", "am": jetzt_iso(), "art": art, "text": v.text(text, 300), "kontoId": konto_id, "ip": v.text(ip, 64), "userAgent": v.text(user_agent, 300), "sha256": sha or ""})
	s.protokoll_json = als_json(p)


def _signiert_name(s):
	name = s.dokument_name or "dokument.pdf"
	return (name[:-4] if name.lower().endswith(".pdf") else name) + "-signiert.pdf"


# ================================================================ Ausgabe (wie das Demo-Backend)


def _unterzeichner_json(s, u, n, rolle):
	voll = rolle == "backoffice" or u.konto_id == n.id
	st = u_status(s, u)
	us = None
	if u.status == "unterschrieben":
		us = {
			"art": u.art, "name": u.getippter_name or u.name_anzeige, "am": iso(u.unterschrieben_am), "sha256Dokument": u.sha256_dokument, "codeBestaetigtAm": iso(u.code_bestaetigt_am),
			"ip": u.ip if voll else sk.ip_maskiert(u.ip), "userAgent": u.user_agent if voll else None,
			"bild": f"data:image/png;base64,{u.bild_png}" if voll and u.bild_png else None,
		}
	return {
		"id": u.name, "position": u.position, "kontoId": u.konto_id if voll else None, "name": u.name_anzeige, "email": u.email if voll else None,
		"status": st, "statusLabel": sk.UNTERZEICHNER_STATUS.get(st, st), "ich": u.konto_id == n.id, "unterschrift": us,
		"abgelehnt": {"am": iso(u.abgelehnt_am), "grund": u.ablehn_grund or ""} if u.status == "abgelehnt" else None,
		"codeGesendetAm": iso(u.code_gesendet_am) if u.konto_id == n.id else None,
		"codeGueltigBis": iso(u.code_ablauf) if u.konto_id == n.id and u.code_hash and not u.code_verbraucht else None,
		"erinnertAm": iso(u.erinnert_am) if rolle == "backoffice" else None,
	}


def ausgabe(n, s, detail=False):
	rolle = rolle_im(n, s)
	status = effektiver_status(s)
	ich = next((u for u in s.unterzeichner if u.konto_id == n.id), None)
	ersteller = {"id": s.ersteller_id, "name": name_von(s.ersteller_id), "email": frappe.db.get_value("Plattform Konto", s.ersteller_id, "email")} if s.ersteller_id else {"id": None, "name": "ÖkoInvest (automatisch)", "email": ""}
	out = {
		"id": s.name, "titel": s.titel, "art": s.art, "artLabel": sk.SIGNATUR_ARTEN.get(s.art, s.art), "status": status, "statusLabel": sk.SIGNATUR_STATUS.get(status, status),
		"erstelltAm": iso(s.creation), "geaendertAm": iso(s.modified), "frist": str(s.frist) if s.frist else None, "abgeschlossenAm": iso(s.abgeschlossen_am), "reihenfolge": bool(s.reihenfolge),
		"ersteller": ersteller, "bezug": {"art": s.bezug_art, "id": s.bezug_id} if s.bezug_art else None,
		"standard": {"art": s.standard_art, "projektId": s.standard_projekt} if s.standard_art else None,
		"fortschritt": {"unterschrieben": sum(1 for u in s.unterzeichner if u.status == "unterschrieben"), "gesamt": len(s.unterzeichner)},
		"unterzeichner": [_unterzeichner_json(s, u, n, rolle) for u in sorted(s.unterzeichner, key=lambda x: x.position)],
		"ichBinDran": bool(ich) and status == "laufend" and darf_jetzt(s, ich),
		"meineRolle": rolle,
		"darfWiderrufen": status == "laufend" and (bo_schreiben(n) or s.ersteller_id == n.id),
		"darfErinnern": status == "laufend" and bo_schreiben(n),
	}
	if not detail:
		return out
	widerruf = aus_json(s.widerruf_json)
	out.update({
		"nachricht": s.nachricht or "",
		"dokument": {"name": s.dokument_name, "groesse": s.groesse or 0, "seiten": s.seiten or 0, "sha256": s.sha256_original},
		"signiert": {"name": _signiert_name(s), "groesse": s.groesse_signiert or 0, "sha256": s.sha256_signiert, "seiten": s.seiten_signiert or 0} if s.datei_signiert_id else None,
		"widerruf": widerruf,
		"protokoll": [
			{"id": e.get("id"), "am": e.get("am"), "art": e.get("art"), "text": e.get("text"), "name": name_von(e.get("kontoId")) if e.get("kontoId") else "System", "sha256": e.get("sha256") or "",
			 "ip": e.get("ip") if rolle == "backoffice" or e.get("kontoId") == n.id else sk.ip_maskiert(e.get("ip")),
			 "userAgent": e.get("userAgent") if rolle == "backoffice" or e.get("kontoId") == n.id else None}
			for e in (aus_json(s.protokoll_json, []) or [])
		],
		"kennzeichnung": sk.KENNZEICHNUNG, "rechtshinweis": sk.RECHTSHINWEIS, "zustimmungText": sk.ZUSTIMMUNG,
	})
	return out


# ================================================================ Dateien


def _datei_speichern(s, daten, name):
	f = frappe.get_doc({"doctype": "File", "file_name": f"{s.name}-{secrets.token_hex(8)}-{name}"[:140], "is_private": 1, "content": daten, "attached_to_doctype": DT, "attached_to_name": s.name})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	return f.name


def _datei_lesen(file_id):
	if not file_id or not frappe.db.exists("File", file_id):
		nicht_gefunden("Datei nicht gefunden.")
	f = frappe.get_doc("File", file_id)
	with open(f.get_full_path(), "rb") as fh:
		return fh.read()


def _pdf_aus_base64(roh):
	try:
		daten = base64.b64decode(str(roh or ""), validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die PDF-Datei konnte nicht gelesen werden.")
	if not sk.ist_pdf(daten):
		frappe.throw("Bitte laden Sie eine PDF-Datei hoch.", frappe.ValidationError)
	if len(daten) > sk.GRENZEN["pdf_max_bytes"]:
		ungueltig("Die PDF-Datei ist größer als 10 MB.")
	if sk.ist_verschluesselt(daten):
		ungueltig("Verschlüsselte PDFs können nicht signiert werden. Bitte ohne Kennwortschutz hochladen.")
	return daten


# ================================================================ Benachrichtigungen


def _melden(konto_id, titel, text, s, mail=True):
	benachrichtigen(konto_id, "signatur", titel, text, f"/portal/signatur/{s.name}", "signatur", s.name, mail=mail)


def _einladen(s):
	for u in s.unterzeichner:
		if darf_jetzt(s, u) and not u.eingeladen_am:
			u.eingeladen_am = jetzt()
			frist = f" · bitte bis {getdate(s.frist).strftime('%d.%m.%Y')}" if s.frist else ""
			_melden(u.konto_id, f"Zur Unterschrift: {s.titel}", f"{sk.SIGNATUR_ARTEN.get(s.art, 'Dokument')}{frist}", s)


# ================================================================ Lesen


@frappe.whitelist(methods=["POST"])
def liste(status=None, alle=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	bo = bo_lesen(n)
	if alle and bo:
		namen = frappe.get_all(DT, order_by="modified desc", pluck="name", limit_page_length=300)
	else:
		eigene = set(frappe.get_all("Plattform Signatur Unterzeichner", filters={"konto_id": n.id, "parenttype": DT}, pluck="parent", limit_page_length=0))
		eigene |= set(frappe.get_all(DT, filters={"ersteller_id": n.id}, pluck="name", limit_page_length=0))
		namen = frappe.get_all(DT, filters={"name": ["in", list(eigene) or ["-"]]}, order_by="modified desc", pluck="name", limit_page_length=300)
	out = []
	for name in namen:
		s = frappe.get_doc(DT, name)
		if status and effektiver_status(s) != status:
			continue
		out.append(ausgabe(n, s))
	return out


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	return ausgabe(n, laden(n, id), detail=True)


# ================================================================ Anlegen


def _unterzeichner_aufloesen(liste_roh):
	liste_roh = aus_json(liste_roh, []) or []
	v.pflicht(isinstance(liste_roh, list) and 1 <= len(liste_roh), "Bitte wählen Sie mindestens eine unterzeichnende Person.")
	v.pflicht(len(liste_roh) <= sk.GRENZEN["max_unterzeichner"], f"Höchstens {sk.GRENZEN['max_unterzeichner']} Unterzeichner.")
	gesehen, out = set(), []
	for i, x in enumerate(liste_roh):
		x = x if isinstance(x, dict) else {}
		kid = v.kennung(x.get("kontoId"))
		email = v.email(x.get("email"))
		k = frappe.db.get_value("Plattform Konto", kid if kid else {"email": email}, ["name", "email", "vorname", "nachname", "aktiv"], as_dict=True) if (kid or email) else None
		v.pflicht(k and k.aktiv, f"Unterzeichner {i + 1}: Es gibt kein aktives Portal-Konto mit dieser Angabe. Unterzeichner brauchen ein Konto.")
		v.pflicht(k.name not in gesehen, "Jede Person kann nur einmal unterschreiben.")
		gesehen.add(k.name)
		out.append({"position": i + 1, "konto_id": k.name, "name_anzeige": " ".join(p for p in (k.vorname, k.nachname) if p) or k.email, "email": k.email, "status": "offen"})
	return out


def vorgang_anlegen(titel, art, ersteller_id, pdf, dateiname, unterzeichner, frist, reihenfolge=True, nachricht="", bezug_art=None, bezug_id=None, standard=None, ip=""):
	s = frappe.new_doc(DT)
	s.update({
		"titel": titel, "art": art, "status": "laufend", "ersteller_id": ersteller_id, "frist": frist, "reihenfolge": 1 if reihenfolge else 0, "nachricht": nachricht,
		"bezug_art": bezug_art or "", "bezug_id": bezug_id, "standard_art": (standard or {}).get("art"), "standard_projekt": (standard or {}).get("projektId"),
		"dokument_name": dateiname, "groesse": len(pdf), "seiten": pdf.count(b"/Type /Page") - pdf.count(b"/Type /Pages") if b"/Type /Page" in pdf else 0, "sha256_original": sk.sha256(pdf),
	})
	for u in unterzeichner:
		s.append("unterzeichner", u)
	ereignis(s, "erstellt", f"Vorgang angelegt ({len(unterzeichner)} Unterzeichner, Reihenfolge {'fest' if reihenfolge else 'beliebig'})", ersteller_id, ip, sha=s.sha256_original)
	s.insert(ignore_permissions=True)
	s.datei_id = _datei_speichern(s, pdf, dateiname)
	_einladen(s)
	s.save(ignore_permissions=True)
	return s


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	titel = v.text(d.get("titel"), 160)
	v.pflicht(len(titel) >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).")
	art = v.auswahl(d.get("art"), list(sk.SIGNATUR_ARTEN), "")
	v.pflicht(art, "Bitte wählen Sie die Dokumentart.")
	pdf = _pdf_aus_base64(d.get("pdfBase64"))
	tage = min(sk.GRENZEN["frist_tage_max"], max(1, int(v.zahl(d.get("fristTage"), min=1, max=365) or sk.GRENZEN["frist_tage_standard"])))
	bezug_art = v.auswahl(d.get("bezugArt"), BEZUG_ARTEN, "") if d.get("bezugArt") else ""
	bezug_id = None
	if bezug_art:
		bezug_id = v.kennung(d.get("bezugId"))
		if not bezug_id or not frappe.db.exists(DOCTYPE[bezug_art], bezug_id):
			nicht_gefunden("Bezug nicht gefunden.")
	dateiname = (v.text(d.get("dateiname"), 120) or "dokument.pdf").replace("/", "_").replace("\\", "_")
	if not dateiname.lower().endswith(".pdf"):
		dateiname += ".pdf"
	s = vorgang_anlegen(titel, art, n.id, pdf, dateiname, _unterzeichner_aufloesen(d.get("unterzeichner")), add_days(nowdate(), tage), d.get("reihenfolge") is not False, v.mehrzeilig(d.get("nachricht"), 1000), bezug_art, bezug_id, ip=ip or "")
	protokoll(n, "signatur", "signatur", s.name, f"Signaturvorgang „{titel}“ angelegt", ip or "")
	return ausgabe(n, s, detail=True)


# ================================================================ Code & Unterschrift


def _mein_eintrag(n, s):
	u = next((x for x in s.unterzeichner if x.konto_id == n.id), None)
	if not u:
		verboten("Sie sind in diesem Vorgang nicht als Unterzeichner eingetragen.")
	return u


@frappe.whitelist(methods=["POST"])
def code_anfordern(id=None, ip=None, userAgent=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	s = laden(n, id)
	if effektiver_status(s) != "laufend":
		konflikt("Dieser Vorgang kann nicht mehr unterschrieben werden.")
	u = _mein_eintrag(n, s)
	if not darf_jetzt(s, u):
		konflikt("Sie sind noch nicht an der Reihe – vorher unterschreiben andere Personen.")
	grenze = iso(add_to_date(now_datetime(), hours=-1))  # ISO-UTC-Zeichenketten sind lexikografisch vergleichbar
	anzahl = sum(1 for e in (aus_json(s.protokoll_json, []) or []) if e.get("art") == "code" and e.get("kontoId") == n.id and str(e.get("am") or "") > grenze)
	if anzahl >= sk.GRENZEN["codes_je_stunde"]:
		frappe.throw("Zu viele Codes angefordert – bitte warten Sie eine Stunde.", frappe.TooManyRequestsError)
	code = sk.neuer_code()
	u.code_hash = sk.code_hash(s.name, u.name, code)
	u.code_ablauf = add_to_date(now_datetime(), minutes=sk.GRENZEN["code_minuten"])
	u.code_versuche = 0
	u.code_gesendet_am = jetzt()
	u.code_verbraucht = 0
	ereignis(s, "code", f"Bestätigungscode an {sk.email_maskiert(u.email)} gesendet", n.id, ip or "", userAgent or "")
	s.save(ignore_permissions=True)
	mails.signatur_code(u.email, frappe.db.get_value("Plattform Konto", n.id, "vorname"), s.name, code, sk.GRENZEN["code_minuten"])
	return {"ok": True, "gesendetAn": sk.email_maskiert(u.email), "gueltigBis": iso(u.code_ablauf)}


@frappe.whitelist(methods=["POST"])
def unterschreiben(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	ip, ua = v.text(d.get("ip"), 64), v.text(d.get("userAgent"), 300)
	v.pflicht(d.get("zustimmung") is True, "Bitte bestätigen Sie, dass Sie das Dokument gelesen haben und elektronisch unterschreiben.")
	art = d.get("art")
	bild = None
	if art == "gezeichnet":
		bild = sk.png_aus_data_url(d.get("bild"))
		v.pflicht(bild, "Die gezeichnete Unterschrift ist ungültig oder zu groß.")
		v.pflicht(sk.png_hat_inhalt(bild), "Das Unterschriftsfeld ist leer – bitte zeichnen Sie Ihre Unterschrift.")
	elif art == "getippt":
		v.pflicht(sk.getippter_name_gueltig(d.get("name")), "Bitte tippen Sie Ihren vollständigen Namen (2–80 Zeichen).")
	else:
		ungueltig("Bitte wählen Sie „zeichnen“ oder „tippen“.")
	s = laden(n, id)
	if effektiver_status(s) != "laufend":
		konflikt("Die Frist für diese Unterschrift ist abgelaufen." if effektiver_status(s) == "abgelaufen" else "Dieser Vorgang kann nicht mehr unterschrieben werden.")
	u = _mein_eintrag(n, s)
	if not darf_jetzt(s, u):
		konflikt("Sie sind noch nicht an der Reihe – vorher unterschreiben andere Personen.")
	if not u.code_hash or u.code_verbraucht or get_datetime(u.code_ablauf) < now_datetime():
		ungueltig("Bitte fordern Sie einen neuen Bestätigungscode an.")
	if (u.code_versuche or 0) >= sk.GRENZEN["code_versuche"]:
		frappe.throw("Zu viele Fehlversuche – bitte fordern Sie einen neuen Code an.", frappe.TooManyRequestsError)
	if not sk.code_gleich(u.code_hash, s.name, u.name, d.get("code")):
		u.code_versuche = (u.code_versuche or 0) + 1
		ereignis(s, "code_falsch", f"Falscher Bestätigungscode (Versuch {u.code_versuche})", n.id, ip, ua)
		s.save(ignore_permissions=True)
		frappe.db.commit()  # Fehlversuch zählt auch, wenn die Anfrage mit Fehler endet
		ungueltig("Der Bestätigungscode ist falsch.")
	sha_jetzt = sk.sha256(_datei_lesen(s.datei_id))
	if sha_jetzt != s.sha256_original:
		ereignis(s, "hash_abweichung", "Prüfsumme der Originaldatei weicht ab – Unterschrift abgelehnt", n.id, ip, ua, sha_jetzt)
		s.save(ignore_permissions=True)
		frappe.db.commit()
		konflikt("Das Dokument wurde nach der Bereitstellung verändert. Die Unterschrift ist nicht möglich – bitte wenden Sie sich an das Backoffice.")
	u.code_verbraucht = 1
	u.status = "unterschrieben"
	u.unterschrieben_am = jetzt()
	u.code_bestaetigt_am = jetzt()
	u.art = art
	u.getippter_name = v.text(d.get("name"), 80) if art == "getippt" else ""
	u.bild_png = base64.b64encode(bild).decode("ascii") if bild else ""
	u.ip, u.user_agent, u.sha256_dokument = ip, ua, sha_jetzt
	ereignis(s, "unterschrieben", f"{u.name_anzeige} hat unterschrieben ({'gezeichnet' if art == 'gezeichnet' else 'getippt'})", n.id, ip, ua, sha_jetzt)
	fertig = all(x.status == "unterschrieben" for x in s.unterzeichner)
	if not fertig:
		_einladen(s)
		if s.ersteller_id:
			_melden(s.ersteller_id, f"Unterschrieben: {s.titel}", f"{u.name_anzeige} hat unterschrieben.", s, mail=False)
	else:
		s.abgeschlossen_am = jetzt()
	s.save(ignore_permissions=True)
	protokoll(n, "signatur", "signatur", s.name, f"Unterschrift geleistet ({s.titel})", ip)
	folge = {"art": s.standard_art, "projektId": s.standard_projekt, "kontoId": n.id} if fertig and s.standard_art else None
	return {"vorgang": ausgabe(n, s, detail=True), "abschlussNoetig": fertig, "folgeAktion": folge}


@frappe.whitelist(methods=["POST"])
def abschluss_daten(id=None, als_benutzer=None):  # noqa: A002
	"""Original (base64) und Protokolldaten für die Prüfseite – nur wenn alle unterschrieben haben und noch kein signiertes PDF existiert."""
	n = nutzer(als_benutzer)
	s = laden(n, id)
	if s.datei_signiert_id or not all(x.status == "unterschrieben" for x in s.unterzeichner) or s.status != "laufend":
		konflikt("Für diesen Vorgang ist kein Abschluss offen.")
	return {
		"originalBase64": base64.b64encode(_datei_lesen(s.datei_id)).decode("ascii"),
		"vorgang": {
			"id": s.name, "titel": s.titel, "art": s.art, "dokumentName": s.dokument_name, "sha256Original": s.sha256_original, "seitenOriginal": s.seiten or 0,
			"reihenfolge": bool(s.reihenfolge), "erstelltAm": iso(s.creation), "abgeschlossenAm": iso(s.abgeschlossen_am) or jetzt_iso(),
			"ersteller": {"name": name_von(s.ersteller_id)} if s.ersteller_id else None,
			"unterzeichner": [
				{"position": u.position, "name": u.name_anzeige, "email": u.email, "status": u.status,
				 "unterschrift": {"art": u.art, "name": u.getippter_name or u.name_anzeige, "am": iso(u.unterschrieben_am), "ip": u.ip, "userAgent": u.user_agent, "sha256Dokument": u.sha256_dokument,
				                  "codeBestaetigtAm": iso(u.code_bestaetigt_am), "bildPngBase64": u.bild_png or None, "zustimmung": True}}
				for u in sorted(s.unterzeichner, key=lambda x: x.position)
			],
		},
	}


@frappe.whitelist(methods=["POST"])
def abschliessen(id=None, pdfBase64=None, sha256=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	s = laden(n, id)
	if s.datei_signiert_id:
		return ausgabe(n, s, detail=True)  # idempotent
	if s.status != "laufend" or not all(x.status == "unterschrieben" for x in s.unterzeichner):
		konflikt("Für diesen Vorgang ist kein Abschluss offen.")
	try:
		signiert = base64.b64decode(str(pdfBase64 or ""), validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Signiertes PDF nicht lesbar.")
	original = _datei_lesen(s.datei_id)
	if sk.sha256(original) != s.sha256_original or not sk.beginnt_mit_original(signiert, original) or len(signiert) - len(original) > 3 * 1024 * 1024:
		ereignis(s, "hash_abweichung", "Signiertes PDF abgelehnt: beginnt nicht mit dem unveränderten Original", n.id)
		s.save(ignore_permissions=True)
		frappe.db.commit()
		konflikt("Das signierte PDF passt nicht zum Original.")
	sha = sk.sha256(signiert)
	if sha256 and sha256 != sha:
		ungueltig("Prüfsumme des signierten PDFs stimmt nicht.")
	s.datei_signiert_id = _datei_speichern(s, signiert, _signiert_name(s))
	s.sha256_signiert, s.groesse_signiert = sha, len(signiert)
	s.seiten_signiert = (s.seiten or 0) + max(1, signiert[len(original):].count(b"/Type /Page ") + signiert[len(original):].count(b"/Type /Page\n"))
	s.status = "abgeschlossen"
	s.abgeschlossen_am = s.abgeschlossen_am or jetzt()
	ereignis(s, "abgeschlossen", "Alle Unterschriften liegen vor – signiertes PDF mit Prüfseite erzeugt", None, sha=sha)
	s.save(ignore_permissions=True)
	_am_bezug_ablegen(s, signiert, sha)
	for k in {s.ersteller_id, *[u.konto_id for u in s.unterzeichner]} - {None, ""}:
		_melden(k, f"Vollständig unterschrieben: {s.titel}", "Das signierte PDF mit Prüfseite steht zum Download bereit.", s)
	return ausgabe(n, s, detail=True)


def _am_bezug_ablegen(s, daten, sha):
	"""Signiertes PDF zusätzlich als Plattform Dokument (Kategorie „vertrag“) am Bezugsobjekt."""
	if not (s.bezug_art in BEZUG_ARTEN and s.bezug_id):
		return
	try:
		d = frappe.get_doc({
			"doctype": "Plattform Dokument", "bezug_art": s.bezug_art, "bezug_doctype": DOCTYPE[s.bezug_art], "bezug_id": s.bezug_id, "dateiname": _signiert_name(s), "mime": "application/pdf",
			"groesse": len(daten), "kategorie": "vertrag", "checkliste": "", "hochgeladen_von": s.ersteller_id or s.unterzeichner[0].konto_id, "am": jetzt(), "sha256": sha,
		}).insert(ignore_permissions=True)
		f = frappe.get_doc({"doctype": "File", "file_name": f"{d.name}-{secrets.token_hex(8)}.pdf", "is_private": 1, "content": daten, "attached_to_doctype": "Plattform Dokument", "attached_to_name": d.name})
		f.flags.ignore_permissions = True
		f.insert(ignore_permissions=True)
		d.datei, d.datei_id = f.file_url, f.name
		d.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Signiertes PDF nicht am Bezug abgelegt", message=s.name)


# ================================================================ Ablehnen, Widerruf, Erinnern, Datei


@frappe.whitelist(methods=["POST"])
def ablehnen(id=None, grund=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	g = v.mehrzeilig(grund, 1000)
	v.pflicht(len(g) >= 3, "Bitte geben Sie kurz an, warum Sie nicht unterschreiben.")
	s = laden(n, id)
	if effektiver_status(s) != "laufend":
		konflikt("Dieser Vorgang ist nicht mehr offen.")
	u = _mein_eintrag(n, s)
	if u.status == "unterschrieben":
		verboten("Sie können diesen Vorgang nicht ablehnen.")
	u.status, u.abgelehnt_am, u.ablehn_grund = "abgelehnt", jetzt(), g
	s.status = "abgelehnt"
	ereignis(s, "abgelehnt", f"{u.name_anzeige} hat die Unterschrift abgelehnt: {g}", n.id, ip or "")
	s.save(ignore_permissions=True)
	if s.ersteller_id:
		_melden(s.ersteller_id, f"Abgelehnt: {s.titel}", f"{u.name_anzeige} unterschreibt nicht.", s)
	return ausgabe(n, s, detail=True)


@frappe.whitelist(methods=["POST"])
def widerrufen(id=None, grund=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	g = v.mehrzeilig(grund, 1000)
	v.pflicht(len(g) >= 3, "Bitte geben Sie einen Grund für den Widerruf an.")
	s = laden(n, id)
	if not (bo_schreiben(n) or s.ersteller_id == n.id):
		verboten("Nur das Backoffice kann einen Signaturvorgang widerrufen.")
	if effektiver_status(s) != "laufend":
		konflikt("Nur laufende Vorgänge können widerrufen werden – abgeschlossene bleiben gültig.")
	s.status = "widerrufen"
	s.widerruf_json = als_json({"am": jetzt_iso(), "vonId": n.id, "grund": g})
	ereignis(s, "widerrufen", f"Vorgang widerrufen: {g}", n.id, ip or "")
	s.save(ignore_permissions=True)
	for u in s.unterzeichner:
		_melden(u.konto_id, f"Widerrufen: {s.titel}", "Das Dokument muss nicht mehr unterschrieben werden.", s)
	protokoll(n, "signatur", "signatur", s.name, f"Signaturvorgang widerrufen ({s.titel})", ip or "")
	return ausgabe(n, s, detail=True)


def _erinnern(s, von_id=None, grenze_stunden=12):
	grenze = add_to_date(now_datetime(), hours=-grenze_stunden)
	faellig = [u for u in s.unterzeichner if darf_jetzt(s, u) and (not u.erinnert_am or get_datetime(u.erinnert_am) < grenze)]
	for u in faellig:
		u.erinnert_am = jetzt()
		_melden(u.konto_id, f"Erinnerung: {s.titel}", "Das Dokument wartet auf Ihre Unterschrift.", s)
		ereignis(s, "erinnert", f"Erinnerung an {u.name_anzeige}", von_id)
	return len(faellig)


@frappe.whitelist(methods=["POST"])
def erinnern(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	s = laden(n, id)
	if effektiver_status(s) != "laufend":
		konflikt("Nur laufende Vorgänge.")
	if not _erinnern(s, n.id):
		konflikt("Die offene Person wurde in den letzten 12 Stunden bereits erinnert.")
	s.save(ignore_permissions=True)
	return ausgabe(n, s, detail=True)


@frappe.whitelist(methods=["POST"])
def datei(id=None, variante=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	s = laden(n, id)
	signiert = variante == "signiert"
	if signiert and not s.datei_signiert_id:
		nicht_gefunden("Das signierte PDF liegt erst nach der letzten Unterschrift vor.")
	daten = _datei_lesen(s.datei_signiert_id if signiert else s.datei_id)
	if not signiert and sk.sha256(daten) != s.sha256_original:
		frappe.log_error(title="ÖkoInvest: Prüfsumme eines Signatur-Originals stimmt nicht", message=s.name)
	ereignis(s, "download", f"{'Signiertes PDF' if signiert else 'Original'} abgerufen", n.id, ip or "", sha=sk.sha256(daten))
	s.save(ignore_permissions=True)
	return {"name": _signiert_name(s) if signiert else s.dokument_name, "mime": "application/pdf", "inhaltBase64": base64.b64encode(daten).decode("ascii")}


# ================================================================ Einstellungen & Standard-Erklärungen


def _einstellungen():
	e = frappe.get_single("Plattform Service Einstellungen")
	return {"ndaModus": e.nda_modus or "klick", "provisionModus": e.provision_modus or "klick", "modi": sk.SIGNATUR_MODI}


@frappe.whitelist(methods=["POST"])
def einstellungen(als_benutzer=None):
	nutzer(als_benutzer)
	return _einstellungen()


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	e = frappe.get_single("Plattform Service Einstellungen")
	if d.get("ndaModus") is not None:
		e.nda_modus = v.auswahl(d.get("ndaModus"), list(sk.SIGNATUR_MODI), "klick")
	if d.get("provisionModus") is not None:
		e.provision_modus = v.auswahl(d.get("provisionModus"), list(sk.SIGNATUR_MODI), "klick")
	e.save(ignore_permissions=True)
	protokoll(n, "signatur", "einstellungen", "signatur", f"Signatur-Modus: NDA {e.nda_modus}, Provision {e.provision_modus}")
	return _einstellungen()


def _standard_pdf(art, projekt, konto):
	"""NDA bzw. Provisionsvereinbarung als PDF (wkhtmltopdf über frappe.utils.pdf) – Texte wie die Klick-Variante."""
	from frappe.utils.pdf import get_pdf

	from oekoinvest_app.plattform.druck import oekoinvest_nda, oekoinvest_provision

	kontext = {"art": art, "projekt": projekt, "konto": konto, "nda": oekoinvest_nda(), "provision": oekoinvest_provision(), "hinweis": sk.KENNZEICHNUNG}
	return get_pdf(frappe.render_template("templates/signatur_standard.html", kontext))


@frappe.whitelist(methods=["POST"])
def standard(art=None, projektId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	v.pflicht(art in ("nda", "provision"), "Unbekannte Erklärung.")
	e = _einstellungen()
	modus = e["ndaModus"] if art == "nda" else e["provisionModus"]
	if modus != "signatur":
		return {"modus": "klick"}
	pid = v.kennung(projektId)
	if not pid or not frappe.db.exists("Plattform Projekt", pid):
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", pid)
	from oekoinvest_app.plattform.prozesse import BOERSE_STATUS

	if art == "nda" and p.status not in BOERSE_STATUS:
		nicht_gefunden("Projekt nicht gefunden.")
	if art == "provision" and p.anbieter_id != n.id:
		verboten("Nur der Anbieter unterschreibt die Provisionsvereinbarung.")
	vorhanden = frappe.get_all(DT, filters={"standard_art": art, "standard_projekt": pid}, fields=["name", "status", "frist"], order_by="creation desc")
	for x in vorhanden:
		s = frappe.get_doc(DT, x.name)
		if not s.unterzeichner or s.unterzeichner[0].konto_id != n.id:
			continue
		if s.status == "abgeschlossen":
			return {"modus": modus, "erledigt": True, "id": s.name}
		if effektiver_status(s) == "laufend":
			return {"modus": modus, "erledigt": False, "id": s.name}
	konto = frappe.db.get_value("Plattform Konto", n.id, ["name", "vorname", "nachname", "email"], as_dict=True)
	pdf = _standard_pdf(art, p, konto)
	titel = f"{'Vertraulichkeitsvereinbarung' if art == 'nda' else 'Provisionsvereinbarung'} zu Projekt {pid}"
	s = vorgang_anlegen(
		titel, art, None, pdf, f"{'NDA' if art == 'nda' else 'Provisionsvereinbarung'}-{pid}.pdf", _unterzeichner_aufloesen([{"kontoId": n.id}]), add_days(nowdate(), 30),
		True, "", "projekt" if art == "provision" else None, pid if art == "provision" else None, {"art": art, "projektId": pid}, ip or "",
	)
	return {"modus": modus, "erledigt": False, "id": s.name}


# ================================================================ Scheduler (hooks.py)


def erinnerungen_senden():
	"""Täglich: offene Unterzeichner nach 3 Tagen erinnern; abgelaufene Fristen setzen."""
	for name in frappe.get_all(DT, filters={"status": "laufend"}, pluck="name", limit_page_length=0):
		s = frappe.get_doc(DT, name)
		if effektiver_status(s) == "abgelaufen":
			s.status = "abgelaufen"
			ereignis(s, "abgelaufen", "Frist abgelaufen")
			s.save(ignore_permissions=True)
			continue
		if _erinnern(s, None, grenze_stunden=24 * sk.GRENZEN["erinnerung_nach_tagen"]):
			s.save(ignore_permissions=True)
	frappe.db.commit()
