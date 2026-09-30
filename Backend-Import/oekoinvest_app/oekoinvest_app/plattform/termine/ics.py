# Copyright (c) 2026, ÖkoInvest GmbH
#
# Kalenderdatei (RFC 5545) zu einem Termin – reine Funktion (Spiegel von icsErstellen in src/lib/plattform/termine/index.js).
# METHOD:PUBLISH, solange keine Organisator-Adresse konfiguriert ist (site_config `oekoinvest_termin_organisator`);
# mit Organisator REQUEST bzw. CANCEL. Zeilen auf 75 Oktette gefaltet, CRLF.

from datetime import datetime, timezone

from oekoinvest_app.plattform.termine.slots import TERMIN_ARTEN, aus_iso


def _zeit(iso):
	return aus_iso(iso).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def text(t):
	return str(t or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n")


def _falten(zeile):
	roh = zeile.encode("utf-8")
	if len(roh) <= 75:
		return zeile
	teile, aktuell, laenge = [], "", 0
	for z in zeile:
		n = len(z.encode("utf-8"))
		grenze = 74 if teile else 75
		if laenge + n > grenze:
			teile.append(aktuell)
			aktuell, laenge = "", 0
		aktuell += z
		laenge += n
	teile.append(aktuell)
	return "\r\n ".join(teile)


def ics_erstellen(t, organisator=None, jetzt=None):
	"""t: dict mit id, art, start, ende, status, sequenz, ort, kanal, mitarbeiterName, verwaltenLink."""
	art = TERMIN_ARTEN.get(t.get("art"))
	label = art[0] if art else "Termin"
	storniert = t.get("status") == "storniert"
	methode = ("CANCEL" if storniert else "REQUEST") if (organisator or {}).get("email") else "PUBLISH"
	beschreibung = "\n".join(
		x
		for x in (
			f"{label} mit ÖkoInvest",
			f"Ansprechpartner: {t['mitarbeiterName']}" if t.get("mitarbeiterName") else "",
			"Wir rufen Sie zum vereinbarten Zeitpunkt an." if t.get("kanal") == "telefon" else "Den Link zum Videogespräch erhalten Sie vor dem Termin im Portal." if t.get("kanal") == "video" else "",
			f"Umbuchen oder absagen: {t['verwaltenLink']}" if t.get("verwaltenLink") else "",
		)
		if x
	)
	stamp = (jetzt or datetime.now(timezone.utc)).strftime("%Y%m%dT%H%M%SZ")
	zeilen = [
		"BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OekoInvest GmbH//Plattform Termine//DE", "CALSCALE:GREGORIAN", f"METHOD:{methode}",
		"BEGIN:VEVENT", f"UID:{t['id']}@termine.oekoinvest", f"SEQUENCE:{int(t.get('sequenz') or 0)}", f"DTSTAMP:{stamp}",
		f"DTSTART:{_zeit(t['start'])}", f"DTEND:{_zeit(t['ende'])}", f"SUMMARY:{text(label + ' – ÖkoInvest')}", f"DESCRIPTION:{text(beschreibung)}",
	]
	if t.get("ort"):
		zeilen.append(f"LOCATION:{text(t['ort'])}")
	if (organisator or {}).get("email"):
		zeilen.append(f"ORGANIZER;CN={text(organisator.get('name') or 'ÖkoInvest')}:mailto:{organisator['email']}")
	zeilen += [f"STATUS:{'CANCELLED' if storniert else 'CONFIRMED'}", "TRANSP:OPAQUE"]
	if not storniert:
		zeilen += ["BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", f"DESCRIPTION:{text(label)}", "END:VALARM"]
	zeilen += ["END:VEVENT", "END:VCALENDAR"]
	return "\r\n".join(_falten(z) for z in zeilen) + "\r\n"
