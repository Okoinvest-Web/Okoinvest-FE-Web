# Copyright (c) 2026, ÖkoInvest GmbH
#
# Elektronische Unterschrift – reine Regeln ohne Frappe (Spiegel von src/lib/plattform/signatur/index.js).
# Tests: plattform/tests/test_service_rein.py (python -m unittest, ohne Bench).
#
# Kennzeichnung: EINFACHE elektronische Signatur (EES) nach Art. 3 Nr. 10 eIDAS-VO – keine fortgeschrittene/qualifizierte.
# Integrität: SHA-256 der Originaldatei bei Anlage und vor jeder Unterschrift. Das signierte PDF entsteht als inkrementelles
# Update (Original + Prüfseite); Frappe prüft beim Abschluss, dass die Datei mit den unveränderten Originalbytes beginnt.

import hashlib
import hmac
import re
import secrets

SIGNATUR_ARTEN = {
	"nda": "Vertraulichkeitsvereinbarung (NDA)",
	"provision": "Provisionsvereinbarung",
	"pacht_loi": "Pacht-Absichtserklärung",
	"gutachter": "Auftrag Gutachter",
	"sonstiges": "Sonstiges Dokument",
}
SIGNATUR_STATUS = {
	"laufend": "Zur Unterschrift",
	"abgeschlossen": "Vollständig unterschrieben",
	"abgelehnt": "Abgelehnt",
	"widerrufen": "Widerrufen",
	"abgelaufen": "Frist abgelaufen",
}
UNTERZEICHNER_STATUS = {"wartet": "Wartet auf Vorgänger", "offen": "Zur Unterschrift", "unterschrieben": "Unterschrieben", "abgelehnt": "Abgelehnt"}
SIGNATUR_MODI = {"klick": "Klick-Bestätigung (bisher)", "signatur": "Elektronische Unterschrift (EES)"}

GRENZEN = {
	"max_unterzeichner": 6,
	"code_minuten": 10,
	"code_versuche": 5,
	"codes_je_stunde": 5,
	"bild_max_bytes": 200 * 1024,
	"pdf_max_bytes": 10 * 1024 * 1024,
	"frist_tage_standard": 14,
	"frist_tage_max": 90,
	"erinnerung_nach_tagen": 3,
}

KENNZEICHNUNG = "Einfache elektronische Signatur (EES) nach Art. 3 Nr. 10 eIDAS-Verordnung (EU) Nr. 910/2014 – keine fortgeschrittene und keine qualifizierte elektronische Signatur."
RECHTSHINWEIS = (
	"Die einfache elektronische Signatur erfüllt keine gesetzliche Schriftform (in Deutschland z. B. § 126 BGB, in Österreich in der Regel nur mit "
	"qualifizierter Signatur, in der Schweiz Art. 14 OR) und ersetzt keine notarielle Beurkundung. Sie eignet sich für formfreie Erklärungen wie "
	"Vertraulichkeitsvereinbarungen, Absichtserklärungen oder Aufträge; ihre Beweiskraft unterliegt der freien Beweiswürdigung des Gerichts. "
	"Formbedürftige Verträge (z. B. langfristige Pacht- oder Grundstücksverträge) werden gesondert in der vorgeschriebenen Form geschlossen."
)
ZUSTIMMUNG = (
	"Ich habe das Dokument vollständig gelesen und unterzeichne es elektronisch. Mir ist bekannt, dass es sich um eine einfache elektronische "
	"Signatur handelt und dass Zeitpunkt, IP-Adresse, Browser und Prüfsumme des Dokuments protokolliert werden."
)

PNG_SIGNATUR = b"\x89PNG\r\n\x1a\n"
DATA_URL = re.compile(r"^data:image/png;base64,([A-Za-z0-9+/=]+)$")
NAME = re.compile(r"^[^\W\d_][\w .'’-]*$", re.UNICODE)


def sha256(daten):
	return hashlib.sha256(daten if isinstance(daten, bytes) else str(daten).encode("utf-8")).hexdigest()


def ist_pdf(daten):
	return isinstance(daten, bytes) and len(daten) >= 20 and daten[:5] == b"%PDF-"


def ist_verschluesselt(daten):
	"""Grobe Prüfung auf /Encrypt im letzten Trailer (verschlüsselte PDFs werden abgelehnt)."""
	ende = daten[-4096:] if isinstance(daten, bytes) else b""
	return b"/Encrypt" in ende


def unterzeichner_status(vorgang_status, reihenfolge, liste, u):
	"""wartet | offen | unterschrieben | abgelehnt – `liste` = alle Unterzeichner (dicts mit position, status)."""
	if u["status"] in ("unterschrieben", "abgelehnt"):
		return u["status"]
	if vorgang_status != "laufend":
		return "wartet"
	if not reihenfolge:
		return "offen"
	vorher = [x for x in liste if x["position"] < u["position"]]
	return "offen" if all(x["status"] == "unterschrieben" for x in vorher) else "wartet"


def darf_jetzt(vorgang_status, reihenfolge, liste, u):
	return bool(u) and unterzeichner_status(vorgang_status, reihenfolge, liste, u) == "offen"


def alle_unterschrieben(liste):
	return bool(liste) and all(x["status"] == "unterschrieben" for x in liste)


def neuer_code():
	return f"{secrets.randbelow(1_000_000):06d}"


def code_hash(vorgang_id, unterzeichner_id, code):
	return sha256(f"{vorgang_id}:{unterzeichner_id}:{str(code).strip()}")


def code_gleich(erwartet_hash, vorgang_id, unterzeichner_id, code):
	c = re.sub(r"\s", "", str(code or ""))
	if not re.fullmatch(r"\d{6}", c) or not erwartet_hash:
		return False
	return hmac.compare_digest(erwartet_hash, code_hash(vorgang_id, unterzeichner_id, c))


def png_aus_data_url(wert):
	"""data:image/png;base64,… → Bytes oder None (Magic Bytes und Größe geprüft)."""
	import base64
	import binascii

	m = DATA_URL.match(str(wert or "").strip())
	if not m:
		return None
	try:
		b = base64.b64decode(m.group(1), validate=True)
	except (binascii.Error, ValueError):
		return None
	if not b.startswith(PNG_SIGNATUR) or len(b) > GRENZEN["bild_max_bytes"]:
		return None
	return b


def png_hat_inhalt(b, minimum=30):
	"""Grobe Leer-Prüfung: dekomprimierte Bilddaten mit mehr als `minimum` deckenden, dunklen Bytes-Gruppen."""
	import struct
	import zlib

	try:
		pos, idat, kopf = 8, b"", None
		while pos + 8 <= len(b):
			laenge = struct.unpack(">I", b[pos : pos + 4])[0]
			typ = b[pos + 4 : pos + 8]
			inhalt = b[pos + 8 : pos + 8 + laenge]
			if typ == b"IHDR":
				kopf = struct.unpack(">IIBB", inhalt[:10])
			elif typ == b"IDAT":
				idat += inhalt
			elif typ == b"IEND":
				break
			pos += 12 + laenge
		if not kopf or not idat:
			return False
		w, h, tiefe, farbtyp = kopf
		kanaele = {0: 1, 2: 3, 4: 2, 6: 4}.get(farbtyp)
		if tiefe != 8 or not kanaele or w * h > 4_000_000:
			return False
		roh = zlib.decompress(idat)
		if farbtyp not in (4, 6):
			return len(roh) > 0
		# Alphakanal: Anzahl deckender Pixel grob über ungefilterte Zeilen schätzen (Filter verfälscht nur Randwerte)
		zeile = w * kanaele + 1
		deckend = 0
		for y in range(h):
			z = roh[y * zeile + 1 : (y + 1) * zeile]
			deckend += sum(1 for i in range(kanaele - 1, len(z), kanaele) if z[i] > 16)
			if deckend >= minimum:
				return True
		return False
	except Exception:
		return False


def getippter_name_gueltig(name):
	t = str(name or "").strip()
	return 2 <= len(t) <= 80 and bool(NAME.match(t))


def beginnt_mit_original(signiert, original):
	"""Inkrementelles Update: signierte Datei beginnt mit den unveränderten Originalbytes und ist länger."""
	return isinstance(signiert, bytes) and isinstance(original, bytes) and len(signiert) > len(original) and signiert[: len(original)] == original


def ip_maskiert(ip):
	s = str(ip or "")
	if re.fullmatch(r"\d+\.\d+\.\d+\.\d+", s):
		return re.sub(r"\.\d+$", ".x", s)
	if ":" in s:
		return ":".join(s.split(":")[:3]) + ":…"
	return s or "–"


def email_maskiert(e):
	return re.sub(r"^(.).*?(.)?@", lambda m: f"{m.group(1)}…{m.group(2) or ''}@", str(e or ""))
