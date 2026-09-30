# Copyright (c) 2026, ÖkoInvest GmbH
#
# Strukturierte Absichtserklärung (LOI) – 1:1 aus src/lib/plattform/fach/loi.js.
# Pflicht immer: Text ≥ 10 Zeichen und ein Preis > 0 (Gesamt, €/kWp oder Enterprise Value − Nettofinanzverbindlichkeiten).
# Pflicht bei struktur=True: Transaktionsstruktur, Zahlungsstruktur (+ Details bei Meilensteinen/Earn-out),
# Gültigkeit (Zukunft, ≤ 12 Monate), ≥ 1 Bedingung (oder ausdrücklich „keine“), Finanzierung.

import datetime
import math
import re

PREISBASIS = ["gesamt", "proKwp", "ev"]
STRUKTUR = ["asset", "share", "offen"]
ZAHLUNG = ["einmal", "meilensteine", "earnout"]
BEDINGUNGEN = {
	"dd": "Zufriedenstellende Due Diligence (technisch, rechtlich, steuerlich)",
	"gremien": "Zustimmung der Gremien (Investment Committee, Aufsichtsrat)",
	"finanzierung": "Finanzierungszusage der Bank",
	"netz": "Bestätigung Netzanschluss / Übertragung der Zusage",
	"genehmigung": "Rechtskraft bzw. Bestandskraft der Genehmigung",
	"kartell": "Fusionskontrolle bzw. Investitionsprüfung, falls erforderlich",
	"keine": "Keine aufschiebenden Bedingungen",
}
FINANZIERUNG = ["ek", "fk", "fonds"]
MAX_MONATE = 12


class LoiFehler(ValueError):
	pass


def _pflicht(b, msg):
	if not b:
		raise LoiFehler(msg)


def _mehrzeilig(v, maximal):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(v)).replace("\r\n", "\n").replace("\r", "\n").strip()[:maximal]


def _zahl(v, mn, mx, stellen=2):
	if v is None or v == "" or isinstance(v, (bool, dict, list)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if not math.isfinite(n) or n < mn or n > mx:
		return None
	r = math.floor(n * 10**stellen + 0.5) / 10**stellen
	return int(r) if stellen == 0 else r


def _plus_monate(d, monate):
	j, m = d.year + (d.month - 1 + monate) // 12, (d.month - 1 + monate) % 12 + 1
	import calendar

	return datetime.date(j, m, min(d.day, calendar.monthrange(j, m)[1]))


def loi_bereinigen(l, mwp=0, jetzt=None):
	l = l if isinstance(l, dict) else {}
	heute = datetime.date.fromisoformat((jetzt or datetime.date.today().isoformat())[:10])
	strukturiert = l.get("struktur") in (True, "true")
	t = _mehrzeilig(l.get("text"), 3000)
	_pflicht(len(t) >= 10, "Bitte beschreiben Sie Ihre Absichtserklärung (mind. 10 Zeichen).")
	standard = "proKwp" if l.get("preisProKwp") else "ev" if l.get("enterpriseValue") else "gesamt"
	preisbasis = l.get("preisbasis") if l.get("preisbasis") in PREISBASIS else standard
	kwp = (float(mwp or 0)) * 1000
	betrag = _zahl(l.get("betrag"), 0, 1e10, 0)
	pro_kwp = _zahl(l.get("preisProKwp"), 0, 10000, 2)
	ev = _zahl(l.get("enterpriseValue"), 0, 1e11, 0)
	netto = _zahl(l.get("nettoschulden"), -1e10, 1e11, 0)
	if preisbasis == "proKwp":
		_pflicht(bool(pro_kwp) and pro_kwp > 0, "Bitte geben Sie den Preis je kWp an.")
		if kwp > 0:
			betrag = int(math.floor(pro_kwp * kwp + 0.5))
	elif preisbasis == "ev":
		_pflicht(bool(ev) and ev > 0, "Bitte geben Sie den Enterprise Value an.")
		betrag = int(ev - (netto or 0))
		_pflicht(betrag > 0, "Enterprise Value abzüglich Nettofinanzverbindlichkeiten muss positiv sein (Eigenkapitalwert).")
	else:
		_pflicht(bool(betrag) and betrag > 0, "Bitte geben Sie einen indikativen Kaufpreis an.")
	liste = []
	for b in l.get("bedingungenListe") or []:
		if b in BEDINGUNGEN and b not in liste:
			liste.append(b)
	if "keine" in liste:
		_pflicht(len(liste) == 1, "„Keine aufschiebenden Bedingungen“ schließt weitere Bedingungen aus.")
	gueltig = str(l.get("gueltigBis") or "")
	gueltig = gueltig if re.fullmatch(r"20\d\d-\d\d-\d\d", gueltig) else ""
	struktur = l.get("transaktion") if l.get("transaktion") in STRUKTUR else ""
	zahlung = l.get("zahlung") if l.get("zahlung") in ZAHLUNG else ""
	finanzierung = l.get("finanzierung") if l.get("finanzierung") in FINANZIERUNG else ""
	if gueltig:
		_pflicht(gueltig >= heute.isoformat(), "Die Gültigkeit der LOI muss in der Zukunft liegen.")
		_pflicht(gueltig <= _plus_monate(heute, MAX_MONATE).isoformat(), f"Die Gültigkeit darf höchstens {MAX_MONATE} Monate betragen.")
	if strukturiert:
		_pflicht(struktur, "Bitte wählen Sie die Transaktionsstruktur (Asset Deal, Share Deal oder nach Due Diligence).")
		_pflicht(zahlung, "Bitte wählen Sie die Zahlungsstruktur.")
		_pflicht(gueltig, "Bitte geben Sie an, bis wann die LOI gilt.")
		_pflicht(bool(liste), "Bitte wählen Sie die Bedingungen – oder ausdrücklich „keine aufschiebenden Bedingungen“.")
		_pflicht(finanzierung, "Bitte geben Sie an, wie der Kauf finanziert wird.")
		if zahlung != "einmal":
			_pflicht(len(_mehrzeilig(l.get("zahlungDetails"), 1000)) >= 10, "Bitte beschreiben Sie Meilensteine bzw. Earn-out (mind. 10 Zeichen).")
	bed_text = _mehrzeilig(l.get("bedingungen"), 2000)
	return {
		"version": 2 if strukturiert else 1, "preisbasis": preisbasis, "betrag": betrag,
		"preisProKwp": pro_kwp if preisbasis == "proKwp" else (math.floor(betrag / kwp * 100 + 0.5) / 100 if kwp > 0 and betrag else None),
		"enterpriseValue": ev if preisbasis == "ev" else None, "nettoschulden": (netto or 0) if preisbasis == "ev" else None,
		"transaktion": struktur, "zahlung": zahlung, "zahlungDetails": _mehrzeilig(l.get("zahlungDetails"), 1000),
		"bedingungenListe": liste, "bedingungen": bed_text or "; ".join(BEDINGUNGEN[b] for b in liste),
		"finanzierung": finanzierung, "exklusivitaetWochen": _zahl(l.get("exklusivitaetWochen"), 0, 52, 0), "gueltigBis": gueltig,
		"text": t, "ansprechpartner": re.sub(r"\s+", " ", _mehrzeilig(l.get("ansprechpartner"), 120)),
	}
