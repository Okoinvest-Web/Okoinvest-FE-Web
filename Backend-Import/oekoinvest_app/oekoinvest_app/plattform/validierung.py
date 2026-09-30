# Copyright (c) 2026, ÖkoInvest GmbH
#
# Eingaben bereinigen – Port von src/lib/plattform/validierung.js.
# Jede Methode übernimmt Felder nur über diese Helfer (Positivliste statt „alles speichern“).
# Ohne Frappe-Abhängigkeit (bis auf `pflicht`), damit die Logik einfach testbar bleibt.

import math
import re

STEUER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
EMAIL = re.compile(
	r"^[^\s@<>()\[\]\\,;:\"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$",
	re.IGNORECASE,
)
KENNUNG = re.compile(r"^[A-Z]{1,3}-[0-9A-Z-]{4,40}$")
SLUG = re.compile(r"^[a-z0-9-]{3,120}$")
MONAT = re.compile(r"^20\d\d(-(0[1-9]|1[0-2]))?$")
PLZ = re.compile(r"^[0-9A-Za-z -]{3,10}$")
BUCHSTABE = re.compile(r"[A-Za-zÄÖÜäöüß]")
KEIN_BUCHSTABE = re.compile(r"[^A-Za-zÄÖÜäöüß]")


def _ist_leer(v):
	return v is None or isinstance(v, (dict, list, tuple, set))


def text(v, maximal=200):
	"""Einzeiliger Text: Steuerzeichen und Zeilenumbrüche raus, gekürzt."""
	if _ist_leer(v):
		return ""
	if isinstance(v, bool):
		v = "true" if v else "false"
	s = STEUER.sub("", str(v))
	s = re.sub(r"[\r\n\t]+", " ", s)
	s = re.sub(r"\s{2,}", " ", s).strip()
	return s[:maximal]


def mehrzeilig(v, maximal=5000):
	"""Mehrzeiliger Text (Beschreibungen, Nachrichten)."""
	if _ist_leer(v):
		return ""
	if isinstance(v, bool):
		v = "true" if v else "false"
	s = STEUER.sub("", str(v))
	s = re.sub(r"\r\n?", "\n", s)
	s = re.sub(r"\n{4,}", "\n\n\n", s).strip()
	return s[:maximal]


def email(v):
	e = text(v, 190).lower()
	return e if EMAIL.match(e) else ""


def _js_round(x):
	"""Math.round aus JavaScript (halbe Werte aufrunden)."""
	return math.floor(x + 0.5)


def zahl(v, min=-math.inf, max=math.inf, stellen=None):  # noqa: A002 – Namen wie im JS-Vorbild
	"""Zahl in Grenzen oder None."""
	if v is None or v == "" or isinstance(v, (bool, dict, list, tuple, set)):
		return None
	if isinstance(v, (int, float)):
		n = float(v)
	else:
		try:
			n = float(re.sub(r"\s", "", str(v)).replace(",", ".", 1))
		except ValueError:
			return None
	if not math.isfinite(n) or n < min or n > max:
		return None
	if stellen is None:
		return int(n) if n.is_integer() and abs(n) < 2**53 else n
	faktor = 10**stellen
	gerundet = _js_round(n * faktor) / faktor
	return int(gerundet) if float(gerundet).is_integer() else gerundet


def auswahl(v, erlaubt, standard=""):
	liste = list(erlaubt.keys()) if isinstance(erlaubt, dict) else list(erlaubt)
	return v if isinstance(v, str) and v in liste else standard


def mehrfach(v, erlaubt):
	liste = list(erlaubt.keys()) if isinstance(erlaubt, dict) else list(erlaubt)
	if not isinstance(v, list):
		return []
	ergebnis = []
	for x in v:
		if isinstance(x, str) and x in liste and x not in ergebnis:
			ergebnis.append(x)
	return ergebnis


def wahr(v):
	return v is True or v in ("true", "on") or (type(v) is int and v == 1)


def text_liste(v, maximal=10, laenge=160):
	if not isinstance(v, list):
		return []
	return [t for t in (text(x, laenge) for x in v) if t][:maximal]


def monat(v):
	"""Datum JJJJ-MM oder JJJJ (geplante Inbetriebnahme)."""
	s = text(v, 7)
	return s if MONAT.match(s) else ""


def plz(v):
	s = text(v, 10)
	return s if PLZ.match(s) else ""


def passwort_fehler(pw):
	"""Passwortregeln der Website – liefert Fehlermeldung oder ""."""
	p = pw if isinstance(pw, str) else ""
	if len(p) < 10:
		return "Das Passwort muss mindestens 10 Zeichen lang sein."
	if len(p) > 200:
		return "Das Passwort ist zu lang."
	if not BUCHSTABE.search(p) or not KEIN_BUCHSTABE.search(p):
		return "Bitte verwenden Sie Buchstaben und mindestens eine Ziffer oder ein Sonderzeichen."
	return ""


def kennung(v):
	s = "" if v is None else str(v)
	return s if KENNUNG.match(s) else ""


def slug(v):
	s = "" if v is None else str(v)
	return s if SLUG.match(s) else ""


def slugify(s):
	import unicodedata

	s = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	s = unicodedata.normalize("NFKD", s)
	s = "".join(c for c in s if not unicodedata.combining(c))
	s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
	return s[:80]


def pflicht(bedingung, meldung):
	"""Wirft ValidationError (→ HTTP 417, Website 422), wenn die Bedingung nicht erfüllt ist."""
	if not bedingung:
		import frappe

		frappe.throw(meldung, frappe.ValidationError)
