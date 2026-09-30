# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC – Eigene Identifizierung: Videoidentifizierung durch die Compliance (docs/API.md, Abschnitt „KYC/KYB – Eigene
# Identifizierung“). Referenz: src/lib/plattform/backend/demo/kycIdent.js. MRZ und Methodenwahl: api/kyc.speichern
# (Abschnitte „mrz“, „methode“).
#
# Rechte (jede Methode selbst, nach kern.nutzer()):
#   Person selbst – video (Stand, freie Termine), video_buchen, video_stornieren (Terminbuchung über api/termine, Terminart
#                   „identifizierung“; anbietende Mitarbeiter nur mit Backoffice-Unterrolle Compliance)
#   Compliance    – video_aktion (start|punkt|tan_senden|tan_pruefen|notiz|abschluss), video_protokoll (Daten für das PDF)
#                   – nie der eigene Fall; ein laufendes Gespräch protokolliert nur, wer es begonnen hat.
# Jede Aktion → Plattform Aktivitaet (Hash-Kette). Abgeschlossene Protokolle erhalten einen SHA-256 über ihren kanonischen
# Inhalt. TAN: nur SHA-256 gespeichert, 10 Minuten gültig, 3 Versuche. Keine Video-/Tonaufzeichnung.
# Einrichtung: Compliance-Mitarbeiter bieten die Terminart an (Kalender → Verfügbarkeit, oder einmalig
#   bench --site <site> execute oekoinvest_app.plattform.api.kyc_ident.anbieter_einrichten).

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import kyc_ident_kern as ik
from oekoinvest_app.plattform import kyc_kern as k
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.api import kyc as kyc_api
from oekoinvest_app.plattform.kern import aus_json, als_json, konflikt, name_von, nicht_gefunden, nutzer, protokoll, ungueltig, verboten

ART = "identifizierung"
ABGESCHLOSSEN = ("verifiziert", "abgelehnt", "geloescht")


def _jetzt_iso():
	return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _sha(s):
	return hashlib.sha256(str(s).encode()).hexdigest()


def anbieter_einrichten():
	"""Compliance-Konten mit Plattform Mitarbeiter bieten die Terminart „identifizierung“ an (idempotent)."""
	anzahl = 0
	for kid in kyc_api._compliance_konten():
		name = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": kid}, "name")
		if not name:
			continue
		m = frappe.get_doc("Plattform Mitarbeiter", name)
		arten = aus_json(m.terminarten_json, []) or []
		if ART not in arten:
			m.terminarten_json = als_json([*arten, ART])
			m.save(ignore_permissions=True)
			anzahl += 1
	return {"ok": True, "ergaenzt": anzahl}


# ================================================================ Nutzer


def _eigener(n):
	f = kyc_api._eigener_fall(n)
	if not f:
		ungueltig("Bitte beginnen Sie zuerst mit der Verifizierung.")
	return f


@frappe.whitelist(methods=["POST"])
def video(von=None, bis=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _eigener(n)
	from oekoinvest_app.plattform.api import termine

	sicht = kyc_api.video_sicht(f)
	e = k.einstellungen()
	buchbar = f.status not in ABGESCHLOSSEN and not sicht["termin"] and sicht["status"] in ("offen", "abgebrochen")
	s = termine.slots(art=ART, von=von, bis=bis, als_benutzer=als_benutzer) if buchbar else None
	return {
		"video": ik.video_fuer_nutzer(sicht), "methode": f.get("methode") or "", "buchbar": buchbar, "slots": (s or {}).get("slots") or [], "dauer": (s or {}).get("dauer"),
		"videoLink": (e.get("videoLink") or "") if sicht["termin"] else "", "datenschutz": ik.VIDEO_DATENSCHUTZ,
	}


@frappe.whitelist(methods=["POST"])
def video_buchen(start=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	f = _eigener(n)
	if f.get("methode") != "video_intern":
		ungueltig("Bitte wählen Sie zuerst den Weg „Ausweis hochladen + Videogespräch“.")
	if f.status in ABGESCHLOSSEN:
		konflikt("Ihre Verifizierung ist abgeschlossen.")
	sicht = kyc_api.video_sicht(f)
	if sicht["termin"]:
		konflikt("Sie haben bereits einen Termin gebucht. Zum Verschieben sagen Sie ihn bitte zuerst ab.")
	if sicht["status"] not in ("offen", "abgebrochen"):
		konflikt("Das Videogespräch hat bereits stattgefunden.")
	from oekoinvest_app.plattform.api import termine

	r = termine.buchen(daten=json.dumps({"art": ART, "start": start, "notiz": f"Identifizierung per Video (KYC-Fall {f.name})"}), als_benutzer=als_benutzer)
	kyc_api._verlauf(f, f.status, n, "nutzer", f"Videotermin gebucht: {r['termin'].get('zeitraum', '')}", oeffentlich=False)
	kyc_api._speichern(f)
	protokoll(n, "kyc_video", "kyc", f.name, f"Videotermin gebucht ({r['termin'].get('id')})")
	return video(als_benutzer=als_benutzer)


@frappe.whitelist(methods=["POST"])
def video_stornieren(als_benutzer=None):
	n = nutzer(als_benutzer)
	t = kyc_api.ident_termin(n.id)
	if not t:
		nicht_gefunden("Kein gebuchter Videotermin.")
	from oekoinvest_app.plattform.api import termine

	termine.aendern(id=t["id"], daten=json.dumps({"aktion": "stornieren", "grund": "Abgesagt unter „Verifizierung“"}), als_benutzer=als_benutzer)
	return video(als_benutzer=als_benutzer)


# ================================================================ Compliance


def _maskiert(email):
	e = str(email or "")
	if "@" not in e:
		return e
	a, b = e.split("@", 1)
	return f"{a[:1]}{'•' * min(6, max(0, len(a) - 1))}@{b}"


def _eintrag(f, p, n, text, schritt="notiz", ergebnis="info"):
	p.setdefault("eintraege", []).append({"am": _jetzt_iso(), "vonId": n.id, "text": v.text(text, 400)})
	p["eintraege"] = p["eintraege"][-200:]
	f.append("video_eintraege", {"protokoll_id": p["id"], "am": frappe.utils.now_datetime(), "von": n.id, "schritt": v.text(schritt, 60), "ergebnis": ergebnis, "text": v.text(text, 400)})


@frappe.whitelist(methods=["POST"])
def video_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	"""Wie kycVideoAktion(): start | punkt | tan_senden | tan_pruefen | notiz | abschluss. Falscher TAN → {"ok": False, "error"} (Versuch gezählt)."""
	n = nutzer(als_benutzer)
	kyc_api.compliance_noetig(n)
	d = aus_json(daten, {}) or {}
	aktion = v.auswahl(d.get("aktion"), ["start", "punkt", "tan_senden", "tan_pruefen", "notiz", "abschluss"], "")
	if not aktion:
		ungueltig("Unbekannte Aktion.")
	f = kyc_api._fall_laden(id)
	if f.konto == n.id:
		verboten("Den eigenen KYC-Fall prüft eine andere Person der Compliance.")
	e = k.einstellungen()
	vd = aus_json(f.get("video_json"), {}) or {}
	liste = vd.setdefault("protokolle", [])
	p = next((x for x in liste if not x.get("beendetAm")), None)
	hinweis = ""
	ergebnis_rueck = {"ok": True}

	def sichern(text):
		f.video_json = als_json(vd)
		kyc_api._speichern(f)
		protokoll(n, "kyc_video", "kyc", f.name, text)

	if aktion == "start":
		if f.status in ABGESCHLOSSEN:
			konflikt("Der Fall ist abgeschlossen.")
		if p:
			konflikt(f"Es läuft bereits ein Gespräch ({name_von(p.get('durchfuehrenderId'))}).")
		t = kyc_api.ident_termin(f.konto)
		p = {"id": f"KV-{frappe.generate_hash(length=8).upper()}", "terminId": (t or {}).get("id"), "termin": {"start": t["start"], "ende": t["ende"]} if t else None, "durchfuehrenderId": n.id,
			"gestartetAm": _jetzt_iso(), "link": e.get("videoLink") or "", "punkte": {}, "eintraege": [], "tan": None, "ergebnis": None, "begruendung": "", "abbruchgrund": "", "beendetAm": None, "hash": None}
		liste.append(p)
		vd["protokolle"] = liste[-20:]
		_eintrag(f, p, n, "Gespräch begonnen (gebuchter Termin)" if t else "Gespräch begonnen (ohne gebuchten Termin)", "start")
		sichern(f"Videoidentifizierung begonnen ({p['id']})")
		return {"ok": True, "hinweis": "Gespräch begonnen. Bitte zuerst die Einwilligung einholen.", "protokollId": p["id"]}
	if not p:
		konflikt("Es läuft kein Gespräch. Bitte zuerst „Gespräch beginnen“.")
	if p.get("durchfuehrenderId") != n.id:
		konflikt(f"Dieses Gespräch führt {name_von(p.get('durchfuehrenderId')) or 'eine andere Person'} – nur sie bzw. er kann es protokollieren.")

	if aktion == "punkt":
		pid = v.auswahl(d.get("punkt"), [x for x in ik.VIDEO_PUNKT_IDS if x != "tan"], "")
		v.pflicht(pid, "Unbekannter Prüfpunkt.")
		ok = v.wahr(d.get("ok"))
		notiz = v.text(d.get("notiz"), 300)
		p["punkte"][pid] = {"ok": ok, "notiz": notiz, "am": _jetzt_iso(), "vonId": n.id}
		_eintrag(f, p, n, f"{ik.VIDEO_PUNKT_LABEL[pid]}: {'bestätigt' if ok else 'NICHT bestätigt'}{f' – {notiz}' if notiz else ''}", pid, "ok" if ok else "nicht_ok")
	elif aktion == "tan_senden":
		kanal = v.auswahl(d.get("kanal"), ["email", "sms"], "email")
		if kanal == "sms":
			ungueltig("Der SMS-Versand ist nicht eingerichtet – bitte den Code per E-Mail senden.")
		sendungen = cint((p.get("tan") or {}).get("sendungen"))
		if sendungen >= 5:
			konflikt("Zu viele Codes in diesem Gespräch – bitte abbrechen und neu beginnen.")
		email = frappe.db.get_value("Plattform Konto", f.konto, "email")
		if not email:
			konflikt("Für das Konto ist keine E-Mail-Adresse hinterlegt.")
		code = f"{secrets.randbelow(10 ** ik.TAN['stellen']):0{ik.TAN['stellen']}d}"
		p["tan"] = {"kanal": kanal, "hash": _sha(f"{p['id']}:{code}"), "gesendetAm": _jetzt_iso(), "gueltigBis": (datetime.now(timezone.utc) + timedelta(minutes=ik.TAN["gueltigMinuten"])).strftime("%Y-%m-%dT%H:%M:%S.000Z"), "versuche": 0, "bestaetigt": False, "bestaetigtAm": None, "sendungen": sendungen + 1}
		frappe.sendmail(
			recipients=[email], subject="Ihr Bestätigungscode – ÖkoInvest", now=True, add_unsubscribe_link=0,
			message=f"<p>Ihr Einmalcode für das laufende Videogespräch zur Identitätsprüfung lautet: <strong>{code}</strong></p><p>Der Code ist {ik.TAN['gueltigMinuten']} Minuten gültig. Nennen Sie ihn nur im laufenden Gespräch mit unserer Compliance. Haben Sie kein Gespräch mit uns, ignorieren Sie diese E-Mail bitte.</p>",
		)
		_eintrag(f, p, n, f"Einmalcode per E-Mail an {_maskiert(email)} gesendet", "tan", "info")
		hinweis = f"Code an {_maskiert(email)} gesendet – gültig {ik.TAN['gueltigMinuten']} Minuten."
	elif aktion == "tan_pruefen":
		t = p.get("tan")
		if not t:
			konflikt("Bitte zuerst einen Code senden.")
		if t.get("bestaetigt"):
			return {"ok": True, "hinweis": "Der Code ist bereits bestätigt."}
		if datetime.now(timezone.utc) > datetime.strptime(t["gueltigBis"], "%Y-%m-%dT%H:%M:%S.000Z").replace(tzinfo=timezone.utc):
			konflikt("Der Code ist abgelaufen – bitte einen neuen senden.")
		if cint(t.get("versuche")) >= ik.TAN["versuche"]:
			konflikt("Zu viele Fehlversuche – bitte einen neuen Code senden.")
		code = "".join(c for c in str(d.get("code") or "") if c.isdigit())[:12]
		if not secrets.compare_digest(_sha(f"{p['id']}:{code}"), t["hash"]):
			t["versuche"] = cint(t.get("versuche")) + 1
			rest = ik.TAN["versuche"] - t["versuche"]
			_eintrag(f, p, n, f"Einmalcode falsch (Versuch {t['versuche']} von {ik.TAN['versuche']})", "tan", "nicht_ok")
			sichern(f"Videoidentifizierung {p['id']}: Einmalcode falsch")
			return {"ok": False, "error": f"Der Code stimmt nicht (noch {rest} Versuch{'' if rest == 1 else 'e'})."}
		t.update({"bestaetigt": True, "bestaetigtAm": _jetzt_iso()})
		p["punkte"]["tan"] = {"ok": True, "notiz": "Einmalcode bestätigt", "am": t["bestaetigtAm"], "vonId": n.id}
		_eintrag(f, p, n, "Einmalcode bestätigt", "tan", "ok")
		hinweis = "Einmalcode bestätigt."
	elif aktion == "notiz":
		text = v.mehrzeilig(d.get("text"), 600)
		v.pflicht(len(text) >= 2, "Bitte Notiz eingeben.")
		_eintrag(f, p, n, f"Notiz: {text}")
	elif aktion == "abschluss":
		ergebnis = v.auswahl(d.get("ergebnis"), list(ik.VIDEO_ERGEBNISSE), "")
		begruendung = v.mehrzeilig(d.get("begruendung"), 1500)
		abbruchgrund = v.auswahl(d.get("abbruchgrund"), list(ik.VIDEO_ABBRUCHGRUENDE), "") if ergebnis == "abgebrochen" else ""
		pr = ik.video_abschluss_pruefen(p, ergebnis, begruendung, abbruchgrund)
		if not pr["ok"]:
			ungueltig(" ".join(pr["fehler"]))
		p.update({"ergebnis": ergebnis, "begruendung": begruendung, "abbruchgrund": abbruchgrund, "beendetAm": _jetzt_iso(), "hinweis": ik.VIDEO_HINWEIS})
		_eintrag(f, p, n, f"Gespräch beendet: {ik.VIDEO_ERGEBNISSE[ergebnis]}{f' ({ik.VIDEO_ABBRUCHGRUENDE[abbruchgrund]})' if abbruchgrund else ''}", "abschluss", "ok" if ergebnis == "bestanden" else "nicht_ok")
		ohne_hash = {**p, "hash": None, "tan": {**p["tan"], "hash": None} if p.get("tan") else None}
		ohne_hash.pop("hash")
		p["hash"] = _sha(ik.kanonisch_json(ohne_hash))
		vd["ergebnis"] = "verdacht" if any(x.get("ergebnis") == "verdacht" for x in liste) else ergebnis
		# Der genutzte Termin hat stattgefunden (Kalender): danach kann bei Abbruch ein neuer gebucht werden
		if p.get("terminId") and frappe.db.get_value("Plattform Termin", p["terminId"], "status") in ("gebucht", "bestaetigt"):
			frappe.db.set_value("Plattform Termin", p["terminId"], "status", "erledigt")
		kyc_api._verlauf(f, f.status, n, "compliance", f"Videoidentifizierung: {ik.VIDEO_ERGEBNISSE[ergebnis]}", oeffentlich=False)
		f.video_json = als_json(vd)
		if f.risiko:
			kyc_api._risiko_neu(f)  # Verdacht fließt ins Risiko (manuelle Einstufung bleibt)
		if ergebnis == "verdacht":
			kyc_api._compliance_melden(f, f"Videoidentifizierung mit Verdacht: {f.name}", "Bitte Geldwäschebeauftragten einbeziehen.", ohne=n.id)
			hinweis = "Verdacht dokumentiert: Geldwäschebeauftragten einbeziehen, Meldepflicht prüfen, keine Mittel bereitstellen. Die Person darf darüber nicht informiert werden."
		elif ergebnis == "abgebrochen":
			kyc_api._nutzer_melden(f, "Videogespräch nicht abgeschlossen", "Bitte buchen Sie unter „Verifizierung“ einen neuen Termin für das Videogespräch.")
			hinweis = "Gespräch abgebrochen – die Person wird gebeten, einen neuen Termin zu buchen."
		else:
			hinweis = "Videoidentifizierung bestanden. Die Entscheidung über die Verifizierung erfolgt wie gewohnt (bei hohem Risiko Vier-Augen, Freigabe durch eine andere Person)."
	sichern(f"Videoidentifizierung {p['id']}: {aktion}{' → ' + str(p.get('ergebnis')) if aktion == 'abschluss' else (' ' + str(d.get('punkt'))) if aktion == 'punkt' else ''}")
	return {**ergebnis_rueck, "hinweis": hinweis, "protokollId": p["id"]}


@frappe.whitelist(methods=["POST"])
def video_protokoll(id=None, protokollId=None, ip=None, als_benutzer=None):  # noqa: A002, N803
	"""Daten für das Protokoll-PDF (Website: server/kycVideoPdf.js). Nur Compliance; Abruf im Revisionsprotokoll."""
	n = nutzer(als_benutzer)
	kyc_api.compliance_noetig(n)
	f = kyc_api._fall_laden(id)
	vd = aus_json(f.get("video_json"), {}) or {}
	p = next((x for x in vd.get("protokolle") or [] if x.get("id") == v.kennung(protokollId)), None)
	if not p:
		nicht_gefunden("Protokoll nicht gefunden.")
	protokoll(n, "kyc_zugriff", "kyc", f.name, f"Videoprotokoll {p['id']} als PDF abgerufen", ip or "")
	person = aus_json(f.person_json, {}) or {}
	t = p.get("tan")
	ids = {p.get("durchfuehrenderId"), *[x.get("vonId") for x in p.get("eintraege") or []]}
	return {
		"fall": {"id": f.name, "kontotyp": f.kontotyp, "bezeichnung": f.bezeichnung},
		"person": {"name": f"{person.get('vorname') or ''} {person.get('nachname') or ''}".strip(), "geburtsdatum": person.get("geburtsdatum") or "", "ausweisArt": (person.get("ausweis") or {}).get("art") or "", "ausweisNummer": (person.get("ausweis") or {}).get("nummer") or ""},
		"protokoll": {**p, "tan": {"kanal": t.get("kanal"), "gesendetAm": t.get("gesendetAm"), "versuche": t.get("versuche"), "bestaetigt": bool(t.get("bestaetigt")), "bestaetigtAm": t.get("bestaetigtAm")} if t else None},
		"namen": {x: name_von(x) or x for x in ids if x},
		"erstelltVon": name_von(n.id) or n.id,
	}
