# Copyright (c) 2026, ÖkoInvest GmbH
#
# Zwei-Faktor-Anmeldung ohne Fremdpakete (nur hmac/hashlib/struct/base64) – Port von src/lib/plattform/totp.js:
#  - TOTP nach RFC 6238 (HMAC-SHA1, 30 s, 6 Stellen) auf Basis von HOTP (RFC 4226)
#  - Base32 (RFC 4648) für den Schlüssel in Authenticator-Apps, otpauth-URI
#  - Wiederherstellungscodes (einmalig, nur als SHA-256 gespeichert)
# Der TOTP-Schlüssel liegt im DocType „Plattform Zwei Faktor“ in einem Password-Feld (verschlüsselt mit dem
# encryption_key der Site) und verlässt Frappe nur einmal bei der Einrichtung.
#
# Replay-Schutz: `totp_pruefen` liefert den Zeitschritt des akzeptierten Codes; gespeichert wird er als
# `letzter_schritt`, danach zählen nur noch spätere Schritte.
# Ohne Frappe-Abhängigkeit, damit die Logik einfach testbar bleibt.

import base64
import hashlib
import hmac
import re
import secrets
import struct
import time
from urllib.parse import quote

PERIODE_S = 30
STELLEN = 6
FENSTER = 1  # Toleranz ± Zeitschritte (Uhrabweichung des Telefons)
AUSSTELLER = "ÖkoInvest"

B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # ohne 0/O/1/I
ANZAHL_CODES = 10


def _uri_teil(s):
	"""encodeURIComponent aus JavaScript."""
	return quote(str(s), safe="-_.!~*'()")


def base32(daten):
	"""Bytes → Base32 ohne Auffüllzeichen (wie base32 in totp.js)."""
	return base64.b32encode(bytes(daten)).decode("ascii").rstrip("=")


def base32_lesen(s):
	"""Base32 (Groß-/Kleinschreibung, Leerzeichen, Bindestriche egal) → Bytes. Ungültig → ValueError."""
	sauber = re.sub(r"[\s=-]", "", str(s or "")).upper()
	bits = 0
	wert = 0
	out = bytearray()
	for z in sauber:
		i = B32.find(z)
		if i < 0:
			raise ValueError("Ungültiges Base32")
		wert = ((wert << 5) | i) & 0xFFFF  # nur die unteren Bits werden gebraucht
		bits += 5
		if bits >= 8:
			out.append((wert >> (bits - 8)) & 255)
			bits -= 8
	return bytes(out)


def geheimnis_erzeugen():
	"""Neuer TOTP-Schlüssel: 160 Bit (Empfehlung RFC 4226), Base32."""
	return base32(secrets.token_bytes(20))


def hotp(schluessel, zaehler, stellen=STELLEN, algo="sha1"):
	"""HOTP-Wert (RFC 4226) für Zähler `zaehler`."""
	h = hmac.new(bytes(schluessel), struct.pack(">Q", int(zaehler)), getattr(hashlib, algo)).digest()
	o = h[-1] & 0x0F
	binaer = struct.unpack(">I", h[o : o + 4])[0] & 0x7FFFFFFF
	return str(binaer % (10**stellen)).zfill(stellen)


def zeitschritt(zeit_s=None):
	return int((time.time() if zeit_s is None else zeit_s) // PERIODE_S)


def totp(geheimnis_b32, zeit_s=None, stellen=STELLEN):
	"""TOTP-Code eines Base32-Schlüssels zu einem Zeitpunkt (für Tests und Anzeige)."""
	return hotp(base32_lesen(geheimnis_b32), zeitschritt(zeit_s), stellen)


def totp_pruefen(geheimnis_b32, code, letzter_schritt=-1, zeit_s=None, fenster=FENSTER):
	"""Code prüfen. Liefert den Zeitschritt des passenden Codes oder None.

	Nur Schritte > `letzter_schritt` zählen (derselbe Code ist nie zweimal gültig).
	"""
	c = re.sub(r"\s", "", str(code if code is not None else ""))
	if not re.fullmatch(r"\d{6}", c) or not geheimnis_b32:
		return None
	try:
		schluessel = base32_lesen(geheimnis_b32)
	except ValueError:
		return None
	jetzt = zeitschritt(zeit_s)
	letzter = -1 if letzter_schritt is None else int(letzter_schritt)
	treffer = None
	# alle Fenster-Schritte rechnen (gleiche Laufzeit, unabhängig vom Treffer)
	for d in range(-fenster, fenster + 1):
		s = jetzt + d
		if hmac.compare_digest(hotp(schluessel, s), c) and s > letzter and treffer is None:
			treffer = s
	return treffer


def otpauth_uri(geheimnis, konto, aussteller=AUSSTELLER):
	"""otpauth-URI für Authenticator-Apps (Google Authenticator, Microsoft Authenticator, 1Password …)."""
	label = f"{_uri_teil(aussteller)}:{_uri_teil(konto)}"
	return f"otpauth://totp/{label}?secret={geheimnis}&issuer={_uri_teil(aussteller)}&algorithm=SHA1&digits={STELLEN}&period={PERIODE_S}"


# ---------------------------------------------------------------- Wiederherstellungscodes


def _ein_code():
	"""Ein Code: XXXXX-XXXXX (50 Bit)."""
	b = secrets.token_bytes(10)
	s = "".join(CODE_ALPHABET[x % 32] for x in b)
	return f"{s[:5]}-{s[5:]}"


def codes_erzeugen(anzahl=ANZAHL_CODES):
	return [_ein_code() for _ in range(anzahl)]


def code_normal(c):
	return re.sub(r"[^0-9A-Z]", "", str(c or "").upper())


def code_hash(c):
	return hashlib.sha256(f"oekoinvest-wiederherstellung|{code_normal(c)}".encode("utf-8")).hexdigest()


def ist_wiederherstellungscode(c):
	return bool(re.fullmatch(r"[0-9A-Z]{10}", code_normal(c)))
