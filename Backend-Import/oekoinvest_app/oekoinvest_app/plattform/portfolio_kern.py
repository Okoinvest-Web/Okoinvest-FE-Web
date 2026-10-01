# Copyright (c) 2026, ÖkoInvest GmbH
#
# Investor-Portfolio nach dem Kauf – reine Regeln (ohne Frappe, mit unittest prüfbar). 1:1 wie
# src/lib/plattform/portfolio/kern.js (dort ist die Wahrheit; Abgleich über tests/test_portfolio_kern.py).
#
#   Positionen      Zustandsautomat UEBERGAENGE, Position aus vollzogenem Closing, Status nach der Übergabe
#   Ertrag          Soll = P50 × Monatsanteil × (1 − Degradation)^Betriebsjahre gegen Ist, Ampel ≥ −5 % / ≥ −10 %
#   Covenants       DSCR aus Ist-Erlösen − Betriebskosten (saisonbereinigt hochgerechnet, mind. 6 Monate), Lock-up/Default
#   Kapitalabrufe   ≤ offene Zusage, Frist ≥ 10 Tage, angekündigt → gemeldet → bezahlt | storniert
#   Ausschüttungen  Arten, Quellensteuer-Hinweis, Sperre bei DSCR unter Lock-up (nur mit Bankzustimmung)
#   Berichte        Perioden (Quartal/Jahr), Steuerhinweise je Land
#   Wiederverkauf   Anfrage prüfen, Börsen-Entwurf
#
# Marktwerte wie src/lib/invest/markt.js (ALLGEMEIN.pvMonatsanteile, FREIFLAECHE.degradation/opexProKwp,
# FINANZIERUNG.projekt.dscrLockup/dscrDefault, FINANZIERUNG.quellensteuerAusschuettung).

import math
import re
from datetime import date, timedelta

PV_MONATSANTEILE = [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025]
DEGRADATION = 0.004
OPEX_PRO_KWP = 9
DSCR_LOCKUP = 1.1
DSCR_DEFAULT = 1.05
QUELLENSTEUER = {"DE": 0.26375, "AT": 0.275, "CH": 0.35}
ERTRAG_AMPEL = {"gruen": -0.05, "gelb": -0.1}
ABRUF_MIN_FRIST_TAGE = 10


class PortfolioFehler(Exception):
	def __init__(self, status, text):
		super().__init__(text)
		self.status = status


def _ungueltig(t):
	return PortfolioFehler(422, t)


def _konflikt(t):
	return PortfolioFehler(409, t)


ARTEN = {"bestand": "Bestandsanlage (erworben)", "projekt": "Projektkauf (vor Inbetriebnahme)", "codev": "Co-Development-Beteiligung"}
STATUS = {
	"uebernahme": ("Übernahme läuft", "warn"),
	"entwicklung": ("In Entwicklung", "info"),
	"bau": ("Im Bau", "info"),
	"betrieb": ("In Betrieb", "ok"),
	"verkauf_angefragt": ("Wiederverkauf angefragt", "warn"),
	"verkauf_boerse": ("Wiederverkauf in der Börse", "info"),
	"verkauft": ("Verkauft", "neutral"),
	"beendet": ("Beendet", "neutral"),
}
AKTIV = ["uebernahme", "entwicklung", "bau", "betrieb", "verkauf_angefragt", "verkauf_boerse"]
UEBERGAENGE = {
	"uebernahme": ["betrieb", "bau", "beendet"],
	"entwicklung": ["bau", "betrieb", "beendet"],
	"bau": ["betrieb", "verkauf_angefragt", "beendet"],
	"betrieb": ["verkauf_angefragt", "beendet"],
	"verkauf_angefragt": ["verkauf_boerse", "betrieb", "bau"],
	"verkauf_boerse": ["verkauft", "betrieb", "bau"],
	"verkauft": [],
	"beendet": [],
}
ABRUF_STATUS = {"angekuendigt": ("Offen", "warn"), "gemeldet": ("Zahlung gemeldet", "info"), "bezahlt": ("Bezahlt", "ok"), "storniert": ("Storniert", "neutral")}
ABRUF_OFFEN = ["angekuendigt", "gemeldet"]
AUSSCHUETTUNG_ARTEN = {
	"gewinn": ("Gewinnausschüttung (Kapitalgesellschaft)", True, True),
	"entnahme": ("Entnahme / Gewinnanteil (Personengesellschaft)", False, True),
	"zinsen": ("Zinsen Gesellschafterdarlehen", False, True),
	"tilgung": ("Tilgung Gesellschafterdarlehen", False, True),
	"kapital": ("Kapitalrückzahlung (Einlagenrückgewähr)", False, True),
	"verkauf": ("Verkaufserlös (Exit)", False, False),
}
WV_STRUKTUREN = {"share": "Anteilskauf (Share Deal)", "asset": "Kauf der Anlage (Asset Deal)"}

_TAG = re.compile(r"^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")
_MONAT = re.compile(r"^20\d\d-(0[1-9]|1[0-2])$")
_PERIODE = re.compile(r"^20\d\d(-Q[1-4]|-(0[1-9]|1[0-2]))?$")


def ist_tag(s):
	return bool(_TAG.match(str(s or "")))


def ist_monat(s):
	return bool(_MONAT.match(str(s or "")))


def ist_periode(s):
	return bool(_PERIODE.match(str(s or "")))


def _zahl(x):
	try:
		if x is None or x == "" or isinstance(x, bool):
			return None
		f = float(x)
		return f if math.isfinite(f) else None
	except (TypeError, ValueError):
		return None


def _runden(x, st=0):
	if x is None or not math.isfinite(x):
		return None
	# wie Math.round in JS (halbe Werte nach oben)
	f = 10 ** st
	return math.floor(x * f + 0.5) / f if st else math.floor(x + 0.5)


def de_zahl(x):
	return f"{x:.2f}".replace(".", ",")


def plus_tage(tag, n):
	return (date.fromisoformat(tag) + timedelta(days=n)).isoformat()


def tage_zwischen(a, b):
	return (date.fromisoformat(b) - date.fromisoformat(a)).days


def monat_plus(monat, n):
	j, m = (int(x) for x in monat.split("-"))
	x = j * 12 + (m - 1) + n
	return f"{x // 12}-{x % 12 + 1:02d}"


def monate_bis(bis, n):
	return [monat_plus(bis, i - n + 1) for i in range(n)]


def uebergang_pruefen(von, nach):
	if nach not in STATUS:
		raise _ungueltig("Unbekannter Status.")
	if nach not in UEBERGAENGE.get(von, []):
		raise _konflikt(f"Statuswechsel von „{STATUS.get(von, (von,))[0]}“ nach „{STATUS[nach][0]}“ ist nicht möglich.")
	return nach


# ---------------------------------------------------------------- Ertrag


def soll_monat(pos, monat):
	p50 = _zahl(pos.get("p50KwhJahr")) or 0
	if not p50 or not ist_monat(monat):
		return None
	start = str(pos.get("inbetriebnahme") or pos.get("kaufdatum") or "")[:7]
	if ist_monat(start) and monat < start:
		return None
	j, m = (int(x) for x in monat.split("-"))
	betriebsjahre = max(0, (j * 12 + m - (int(start[:4]) * 12 + int(start[5:7]))) // 12) if ist_monat(start) else 0
	deg = _zahl(pos.get("degradation"))
	deg = DEGRADATION if deg is None else deg
	return p50 * PV_MONATSANTEILE[m - 1] * (1 - deg) ** betriebsjahre


def ampel_ertrag(abw):
	if abw is None:
		return "grau"
	return "gruen" if abw >= ERTRAG_AMPEL["gruen"] else "gelb" if abw >= ERTRAG_AMPEL["gelb"] else "rot"


def ertrag_auswertung(pos, ertraege=None, bis=None, monate=12):
	ertraege = ertraege or []
	ende = bis if ist_monat(bis) else (sorted(e["monat"] for e in ertraege if ist_monat(e.get("monat"))) or [None])[-1]
	if not ende:
		return {"bis": None, "monate": [], "summe12": None, "jahr": None, "ampel": "grau", "spezifisch12": None}
	ist = {}
	for e in ertraege:
		k = _zahl(e.get("kwh"))
		if ist_monat(e.get("monat")) and k is not None:
			ist[e["monat"]] = {"kwh": k, "quelle": e.get("quelle") or ""}
	verguetung = _zahl(pos.get("verguetungCt")) or 0
	zeilen = []
	for monat in monate_bis(ende, monate):
		soll = soll_monat(pos, monat)
		i = ist.get(monat)
		kwh = i["kwh"] if i else None
		zeilen.append({
			"monat": monat, "soll": _runden(soll) if soll is not None else None, "ist": None if kwh is None else _runden(kwh),
			"abw": _runden(kwh / soll - 1, 4) if soll and kwh is not None else None,
			"erloes": _runden(kwh * verguetung / 100) if kwh is not None and verguetung else None, "quelle": (i or {}).get("quelle", ""),
		})

	def summe(liste):
		mit = [z for z in liste if z["ist"] is not None and z["soll"]]
		if not mit:
			return None
		s = sum(z["soll"] for z in mit)
		x = sum(z["ist"] for z in mit)
		return {"monate": len(mit), "soll": _runden(s), "ist": _runden(x), "abw": _runden(x / s - 1, 4) if s else None, "erloes": _runden(x * verguetung / 100) if verguetung else None}

	s12 = summe(zeilen)
	jahr = summe([z for z in zeilen if z["monat"][:4] == ende[:4]])
	kwp = (_zahl(pos.get("mwp")) or 0) * 1000
	return {"bis": ende, "monate": zeilen, "summe12": s12, "jahr": jahr, "ampel": ampel_ertrag(s12["abw"] if s12 else None), "spezifisch12": _runden(s12["ist"] / kwp) if s12 and kwp and s12["monate"] == 12 else None}


# ---------------------------------------------------------------- Ist-Erträge aus dem Anlagen-Monitoring (= kern.js)

ERTRAG_AUTO_QUELLEN = {
	"zaehler_geprueft": "Anlagen-Monitoring – geeichter Zähler (geprüft)",
	"zaehler": "Anlagen-Monitoring – Zählerwert (ungeprüft)",
}


def _zahl_ok(x):
	try:
		return x is not None and x != "" and math.isfinite(float(x))
	except (TypeError, ValueError):
		return False


def ist_aus_zaehler(zeilen=None, erzeugung_ids=None, ab="", bis=""):
	"""Monats-Ist aus Zählerstand-Monatswerten: Summe Register 2.8.0 aller Erzeugungszähler, nur vollständige Monate."""
	ids = set(erzeugung_ids or [])
	if not ids:
		return []
	je_monat = {}
	for z in zeilen or []:
		if not ist_monat(z.get("monat")) or z.get("messpunktId") not in ids or z.get("register") != "2.8.0" or not _zahl_ok(z.get("menge")):
			continue
		if (ist_monat(ab) and z["monat"] < ab) or (ist_monat(bis) and z["monat"] > bis):
			continue
		je_monat.setdefault(z["monat"], {}).setdefault(z["messpunktId"], z)
	out = []
	for monat in sorted(je_monat):
		m = je_monat[monat]
		if len(m) < len(ids):
			continue
		werte = list(m.values())
		out.append({"monat": monat, "kwh": int(_runden(sum(float(z["menge"]) for z in werte))), "herkunft": "zaehler_geprueft" if all(z.get("geprueft") for z in werte) else "zaehler"})
	return out


def ertraege_abgleichen(vorhanden=None, auto=None, position_id=None, am=""):
	"""Manuelle Werte behalten Vorrang; automatische je Monat ersetzen/ergänzen. → {liste, neu, geaendert}"""
	vorhanden = list(vorhanden or [])
	auto = list(auto or [])
	manuell = {e.get("monat") for e in vorhanden if not e.get("automatisch")}
	alt = {e.get("monat"): e for e in vorhanden if e.get("automatisch")}
	auto_monate = {a["monat"] for a in auto}
	liste = [e for e in vorhanden if not e.get("automatisch") or (e.get("monat") not in auto_monate and e.get("monat") not in manuell)]
	neu = geaendert = 0
	for a in auto:
		if a["monat"] in manuell:
			continue
		quelle = ERTRAG_AUTO_QUELLEN.get(a.get("herkunft")) or ERTRAG_AUTO_QUELLEN["zaehler"]
		vorher = alt.get(a["monat"])
		if vorher and vorher.get("kwh") == a["kwh"] and vorher.get("quelle") == quelle:
			liste.append(vorher)
			continue
		if vorher:
			geaendert += 1
		else:
			neu += 1
		liste.append({"id": (vorher or {}).get("id"), "positionId": position_id, "monat": a["monat"], "kwh": a["kwh"], "quelle": quelle, "automatisch": True, "herkunft": a.get("herkunft"), "vonId": None, "am": am})
	liste.sort(key=lambda e: str(e.get("monat")))
	return {"liste": liste, "neu": neu, "geaendert": geaendert}


# ---------------------------------------------------------------- Covenants


def covenant_auswertung(pos, ertraege=None, bis=None):
	sd = _zahl(pos.get("schuldendienstJahr")) or 0
	grenzen = {"lockup": _zahl(pos.get("dscrLockup")) or DSCR_LOCKUP, "default": _zahl(pos.get("dscrDefault")) or DSCR_DEFAULT}
	if not sd:
		return {"aktiv": False, "ampel": "grau", "dscr": None, "grenzen": grenzen, "gesperrt": False, "grund": "Kein Fremdkapital hinterlegt."}
	e = ertrag_auswertung(pos, ertraege, bis)
	mit = [z for z in e["monate"] if z["ist"] is not None]
	if len(mit) < 6:
		return {"aktiv": True, "ampel": "grau", "dscr": None, "grenzen": grenzen, "gesperrt": False, "grund": "Für den DSCR werden mindestens 6 Monatswerte benötigt.", "bis": e["bis"]}
	anteil = sum(PV_MONATSANTEILE[int(z["monat"][5:7]) - 1] for z in mit)
	erloese = sum(z["erloes"] or 0 for z in mit) / (anteil or 1)
	opex = _zahl(pos.get("opexJahr")) or 0
	cfads = erloese - opex
	dscr = _runden(cfads / sd, 2)
	ampel = "rot" if dscr < grenzen["default"] else "gelb" if dscr < grenzen["lockup"] else "gruen"
	if ampel == "rot":
		grund = f"DSCR {de_zahl(dscr)} unter {de_zahl(grenzen['default'])} – möglicher Kündigungsgrund (Event of Default), Bank informieren."
	elif ampel == "gelb":
		grund = f"DSCR {de_zahl(dscr)} unter {de_zahl(grenzen['lockup'])} – Ausschüttungssperre (Lock-up)."
	else:
		grund = f"DSCR {de_zahl(dscr)} über der Lock-up-Grenze {de_zahl(grenzen['lockup'])}."
	return {
		"aktiv": True, "ampel": ampel, "dscr": dscr, "grenzen": grenzen, "gesperrt": ampel != "gruen", "bis": e["bis"], "monate": len(mit), "hochgerechnet": len(mit) < 12,
		"erloeseJahr": _runden(erloese), "opexJahr": _runden(opex), "cfads": _runden(cfads), "schuldendienstJahr": _runden(sd), "grund": grund,
	}


# ---------------------------------------------------------------- Kapitalabrufe


def zusage_stand(pos, abrufe=None):
	zusage = _zahl(pos.get("zusage")) or 0
	gueltig = [a for a in (abrufe or []) if a.get("status") != "storniert"]
	abgerufen = sum(_zahl(a.get("betrag")) or 0 for a in gueltig)
	bezahlt = sum(_zahl(a.get("betrag")) or 0 for a in gueltig if a.get("status") == "bezahlt")
	return {"zusage": zusage, "abgerufen": abgerufen, "bezahlt": bezahlt, "offen": max(0, zusage - abgerufen), "quote": _runden(abgerufen / zusage, 4) if zusage else None}


def abruf_pruefen(pos, abrufe, daten, heute):
	if pos.get("art") not in ("codev", "projekt") or not ((_zahl(pos.get("zusage")) or 0) > 0):
		raise _konflikt("Kapitalabrufe gibt es nur für Beteiligungen mit Kapitalzusage.")
	if pos.get("status") not in AKTIV:
		raise _konflikt("Die Position ist abgeschlossen.")
	betrag = _zahl(daten.get("betrag"))
	if betrag is None or betrag < 1 or betrag > 1e10:
		raise _ungueltig("Bitte einen Betrag angeben.")
	stand = zusage_stand(pos, abrufe)
	if betrag > stand["offen"] + 0.005:
		raise _ungueltig(f"Der Abruf übersteigt die offene Zusage ({round(stand['offen']):,} €).".replace(",", "."))
	if not ist_tag(daten.get("faelligAm")):
		raise _ungueltig("Bitte ein Fälligkeitsdatum angeben.")
	if tage_zwischen(heute, daten["faelligAm"]) < ABRUF_MIN_FRIST_TAGE:
		raise _ungueltig(f"Die Frist muss mindestens {ABRUF_MIN_FRIST_TAGE} Tage betragen (frühestens {plus_tage(heute, ABRUF_MIN_FRIST_TAGE)}).")
	zweck = str(daten.get("zweck") or "").strip()[:200]
	if len(zweck) < 5:
		raise _ungueltig("Bitte den Zweck des Abrufs angeben (mind. 5 Zeichen).")
	return {"betrag": round(betrag * 100) / 100, "faelligAm": daten["faelligAm"], "zweck": zweck, "meilenstein": str(daten.get("meilenstein") or "").strip()[:160], "angekuendigtAm": heute, "nummer": len(abrufe or []) + 1}


def abruf_aktion(a, aktion, daten, heute, rolle):
	daten = daten or {}
	if aktion == "melden":
		if rolle != "investor":
			raise _konflikt("Nur der Investor meldet die Zahlung.")
		if a.get("status") != "angekuendigt":
			raise _konflikt("Der Abruf ist nicht mehr offen.")
		return {"status": "gemeldet", "gemeldetAm": heute, "referenz": str(daten.get("referenz") or "").strip()[:80]}
	if aktion == "bestaetigen":
		if rolle != "backoffice":
			raise _konflikt("Nur das Backoffice bestätigt den Zahlungseingang.")
		if a.get("status") not in ABRUF_OFFEN:
			raise _konflikt("Der Abruf ist nicht mehr offen.")
		datum = daten.get("datum") if ist_tag(daten.get("datum")) else heute
		if datum > heute:
			raise _ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.")
		return {"status": "bezahlt", "bezahltAm": datum}
	if aktion == "stornieren":
		if rolle != "backoffice":
			raise _konflikt("Nur das Backoffice storniert Abrufe.")
		if a.get("status") not in ABRUF_OFFEN:
			raise _konflikt("Nur offene Abrufe können storniert werden.")
		grund = str(daten.get("grund") or "").strip()[:300]
		if len(grund) < 5:
			raise _ungueltig("Bitte einen Grund angeben.")
		return {"status": "storniert", "storniertAm": heute, "grund": grund}
	raise _ungueltig("Unbekannte Aktion.")


def abruf_verzug(a, heute):
	if a.get("status") != "angekuendigt" or not ist_tag(a.get("faelligAm")):
		return 0
	return max(0, tage_zwischen(a["faelligAm"], heute))


# ---------------------------------------------------------------- Ausschüttungen


def ausschuettung_pruefen(pos, daten, heute, covenant=None):
	if pos.get("art") not in ("bestand", "projekt", "codev"):
		raise _ungueltig("Unbekannte Position.")
	if pos.get("status") == "beendet":
		raise _konflikt("Die Position ist beendet.")
	art = daten.get("art") if daten.get("art") in AUSSCHUETTUNG_ARTEN else None
	if not art:
		raise _ungueltig("Bitte die Art der Ausschüttung wählen.")
	betrag = _zahl(daten.get("betrag"))
	if betrag is None or betrag < 1 or betrag > 1e10:
		raise _ungueltig("Bitte einen Betrag angeben.")
	if not ist_periode(daten.get("periode")):
		raise _ungueltig("Bitte die Periode angeben (z. B. 2026, 2026-Q2 oder 2026-06).")
	if not ist_tag(daten.get("datum")):
		raise _ungueltig("Bitte das Zahlungsdatum angeben.")
	if daten["datum"] > plus_tage(heute, 60):
		raise _ungueltig("Das Zahlungsdatum liegt zu weit in der Zukunft (höchstens 60 Tage).")
	bank = daten.get("bankZustimmung") in (True, "true", 1, "1")
	if covenant and covenant.get("gesperrt") and AUSSCHUETTUNG_ARTEN[art][2] and not bank:
		raise _konflikt(f"Ausschüttungssperre: {covenant['grund']} Buchung nur mit Zustimmung der finanzierenden Bank.")
	return {"art": art, "periode": daten["periode"], "betrag": round(betrag * 100) / 100, "datum": daten["datum"], "bankZustimmung": bank, "notiz": str(daten.get("notiz") or "").strip()[:300], "status": "gebucht"}


def quellensteuer_hinweis(land, art):
	if not AUSSCHUETTUNG_ARTEN.get(art, (None, False))[1]:
		return None
	satz = QUELLENSTEUER.get(land)
	if not satz:
		return None
	name = {"DE": "Kapitalertragsteuer inkl. Solidaritätszuschlag", "AT": "Kapitalertragsteuer (KESt)", "CH": "Verrechnungssteuer"}[land]
	prozent = f"{satz * 100:.3f}".rstrip("0").rstrip(".").replace(".", ",")
	return {"satz": satz, "text": f"{name} in der Regel {prozent} % – Einbehalt und Bescheinigung durch die ausschüttende Gesellschaft; für Kapitalgesellschaften als Gesellschafter gelten oft Befreiungen oder Erstattungen."}


def cashflow_kennzahlen(pos, abrufe=None, ausschuettungen=None, heute=None):
	anteil = max(0, min(100, _zahl(pos.get("anteilProzent")) or 100)) / 100
	kaufpreis = 0 if pos.get("art") == "codev" else (_zahl(pos.get("kaufpreis")) or 0) * anteil
	z = zusage_stand(pos, abrufe)
	paid_in = kaufpreis + z["bezahlt"]
	gueltig = [a for a in (ausschuettungen or []) if a.get("status") != "storniert"]
	summe = sum(_zahl(a.get("betrag")) or 0 for a in gueltig)
	ab = plus_tage(heute, -365) if heute else ""
	zwoelf = sum(_zahl(a.get("betrag")) or 0 for a in gueltig if not ab or (a["datum"] > ab and a["datum"] <= heute))
	return {
		"kaufpreisAnteil": _runden(kaufpreis), "paidIn": _runden(paid_in), "ausgeschuettet": _runden(summe), "ausgeschuettet12": _runden(zwoelf),
		"dpi": _runden(summe / paid_in, 3) if paid_in else None, "cashRendite12": _runden(zwoelf / paid_in, 4) if paid_in else None, "zusage": z,
	}


# ---------------------------------------------------------------- Berichte


def periode_monate(art, periode):
	if art == "quartal":
		m = re.match(r"^(20\d\d)-Q([1-4])$", str(periode or ""))
		if not m:
			raise _ungueltig("Bitte ein Quartal im Format 2026-Q2 angeben.")
		start = (int(m.group(2)) - 1) * 3 + 1
		return [f"{m.group(1)}-{start + i:02d}" for i in range(3)]
	if art == "jahr":
		if not re.match(r"^20\d\d$", str(periode or "")):
			raise _ungueltig("Bitte ein Jahr im Format 2025 angeben.")
		return [f"{periode}-{i + 1:02d}" for i in range(12)]
	raise _ungueltig("Unbekannte Berichtsart.")


def periode_standard(art, heute):
	j = int(heute[:4])
	q = (int(heute[5:7]) - 1) // 3 + 1
	if art == "jahr":
		return str(j - 1)
	return f"{j - 1}-Q4" if q == 1 else f"{j}-Q{q - 1}"


def perioden_auswahl(pos, heute):
	beginn = str(pos.get("kaufdatum") or pos.get("inbetriebnahme") or heute)[:7]
	quartale = []
	p = periode_standard("quartal", heute)
	for _ in range(12):
		if periode_monate("quartal", p)[2] < beginn:
			break
		quartale.append(p)
		j, q = int(p[:4]), int(p[6:])
		p = f"{j - 1}-Q4" if q == 1 else f"{j}-Q{q - 1}"
	jahre = []
	j = int(heute[:4]) - 1
	while j >= int(beginn[:4]) and len(jahre) < 5:
		jahre.append(str(j))
		j -= 1
	return {"quartal": quartale, "jahr": jahre}


STEUER_HINWEISE = {
	"DE": [
		"Gewinnausschüttungen einer GmbH unterliegen in der Regel der Kapitalertragsteuer (25 % zzgl. Solidaritätszuschlag); die Gesellschaft stellt eine Steuerbescheinigung aus. Für Kapitalgesellschaften als Gesellschafter sind Ausschüttungen nach § 8b KStG weitgehend steuerfrei (Gewerbesteuer abhängig von der Beteiligungshöhe).",
		"Bei einer GmbH & Co. KG werden die Einkünfte gesondert und einheitlich festgestellt – Sie erhalten eine Mitteilung über Ihren Anteil. Gewerbesteuer fällt auf Ebene der KG an; für Solaranlagen gilt ein besonderer Zerlegungsmaßstab zugunsten der Standortgemeinde (§ 29 GewStG).",
		"Die Anlage wird in der Regel über 20 Jahre abgeschrieben (AfA-Tabelle); für Anschaffungen vom 1.7.2025 bis 31.12.2027 ist die degressive AfA möglich.",
	],
	"AT": [
		"Gewinnausschüttungen einer GmbH unterliegen der KESt von 27,5 % (bei natürlichen Personen in der Regel Endbesteuerung); zwischen Kapitalgesellschaften sind Beteiligungserträge in der Regel steuerfrei (§ 10 KStG).",
		"Bei Personengesellschaften (z. B. GmbH & Co KG) werden die Einkünfte einheitlich und gesondert festgestellt; Einspeiseerlöse sind betriebliche Einkünfte.",
		"Investitionsfreibetrag und degressive AfA hängen vom Anschaffungszeitpunkt ab – Anschaffungsdatum und Kaufpreisaufteilung dokumentieren.",
	],
	"CH": [
		"Dividenden einer AG bzw. GmbH unterliegen der Verrechnungssteuer von 35 %; je nach Empfänger Rückerstattung oder Meldeverfahren (qualifizierte Beteiligungen).",
		"Kapitalgesellschaften als Empfänger können den Beteiligungsabzug geltend machen (in der Regel ab 10 % Beteiligung oder 1 Mio. CHF Verkehrswert).",
		"Vermögens- bzw. Kapitalsteuer und Bewertung der Beteiligung sind kantonal unterschiedlich.",
	],
}
STEUER_UNTERLAGEN = [
	"Jahresabschluss der Projektgesellschaft (Bilanz, GuV, ggf. Lagebericht)",
	"Steuerbescheinigung bzw. Bescheinigung über einbehaltene Quellensteuer – stellt die ausschüttende Gesellschaft aus",
	"Bei Personengesellschaften: Mitteilung über den Gewinnanteil (einheitliche und gesonderte Feststellung)",
	"Jahresbericht aus dem Portfolio (Ertrag, Ausschüttungen, Kapitaleinzahlungen) als Übersicht",
	"Nachweise über Kaufpreis und Kapitaleinzahlungen (Anschaffungskosten der Beteiligung)",
]
STEUER_HINWEIS_TEXT = "Hinweise zur Orientierung – keine Steuerberatung. Maßgeblich sind die Bescheinigungen der Gesellschaft und die Beurteilung Ihrer Steuerberatung."


def steuer_hinweise(land):
	return {"land": land, "punkte": STEUER_HINWEISE.get(land) or STEUER_HINWEISE["DE"], "unterlagen": STEUER_UNTERLAGEN, "hinweis": STEUER_HINWEIS_TEXT}


# ---------------------------------------------------------------- Wiederverkauf


def wiederverkauf_pruefen(pos, daten, heute):
	if pos.get("status") not in ("betrieb", "bau"):
		raise _konflikt("Ein Wiederverkauf ist für Positionen im Bau oder in Betrieb möglich.")
	roh = daten.get("preisvorstellung")
	preis = None if roh in (None, "") else _zahl(roh)
	if roh not in (None, "") and (preis is None or preis < 1 or preis > 1e10):
		raise _ungueltig("Bitte eine gültige Preisvorstellung angeben (oder leer lassen).")
	if not ist_monat(daten.get("zeitpunkt")) or daten["zeitpunkt"] < heute[:7]:
		raise _ungueltig("Bitte den gewünschten Zeitpunkt angeben (Monat, nicht in der Vergangenheit).")
	struktur = daten.get("struktur") if daten.get("struktur") in WV_STRUKTUREN else "share"
	maximal = max(1, min(100, _zahl(pos.get("anteilProzent")) or 100))
	anteil = maximal if daten.get("anteilProzent") in (None, "") else _zahl(daten.get("anteilProzent"))
	if anteil is None or anteil < 1 or anteil > maximal:
		raise _ungueltig(f"Der Anteil muss zwischen 1 und {maximal:g} % liegen.")
	grund = str(daten.get("grund") or "").strip()[:600]
	if len(grund) < 10:
		raise _ungueltig("Bitte kurz beschreiben, was verkauft werden soll und warum (mind. 10 Zeichen).")
	return {"preisvorstellung": None if preis is None else round(preis), "zeitpunkt": daten["zeitpunkt"], "struktur": struktur, "anteilProzent": anteil, "grund": grund, "angefragtAm": heute, "vorherStatus": pos.get("status")}


def boerse_entwurf(pos, wv=None):
	wv = wv or {}
	betrieb = pos.get("status") == "betrieb" or wv.get("vorherStatus") == "betrieb"
	anteil = _zahl(wv.get("anteilProzent")) or 100
	titel = re.sub(r"\s*\(Demo\)\s*$", "", str(pos.get("titel") or "Anlage"))
	mwp = _zahl(pos.get("mwp")) or 0
	ib = str(pos.get("inbetriebnahme") or "")[:7]
	inbetrieb = f" (Inbetriebnahme {ib})" if ib else ""
	return {
		"titel": f"{titel} – {f'{anteil:g} % ' if anteil < 100 else ''}Wiederverkauf"[:120],
		"typ": pos.get("typ") or "freiflaeche", "land": pos.get("land") if pos.get("land") in ("DE", "AT", "CH") else "DE", "bundesland": pos.get("bundesland") or "",
		"mwp": mwp or None, "phase": "cod" if betrieb else "rtb", "netzanschluss": "vorhanden" if betrieb else "zusage",
		"codGeplant": "" if betrieb else str(pos.get("inbetriebnahme") or "")[:7],
		"preisModus": "gesamt" if wv.get("preisvorstellung") else "anfrage", "preis": wv.get("preisvorstellung") or None,
		"beschreibung": " ".join([
			f"{'Bestandsanlage in Betrieb' if betrieb else 'Projekt im Bau'}{inbetrieb}, {f'{mwp:g}'.replace('.', ',')} MWp.",
			f"Angeboten wird {f'ein Anteil von {anteil:g} %' if anteil < 100 else 'die gesamte Position'} als {WV_STRUKTUREN.get(wv.get('struktur'), WV_STRUKTUREN['share'])}.",
			"Ertragshistorie, Verträge und Finanzierung stehen nach NDA im Datenraum bereit.",
		]),
	}


# ---------------------------------------------------------------- Closing → Position


def status_nach_uebergabe(art, uebergabe, punkte):
	erledigt = {u.get("schluessel") for u in (uebergabe or []) if u.get("erledigt")}
	if not punkte or not all(p in erledigt for p in punkte):
		return "uebernahme"
	return "bau" if art == "projekt" else "betrieb"


def position_aus_closing(c, p):
	p = p or {}
	art = "bestand" if p.get("phase") == "cod" or p.get("netzanschluss") == "vorhanden" else "projekt"
	vt = p.get("vertraulich") or {}
	db = p.get("datenblatt") or {}
	ertrag = _zahl(vt.get("ertragKwhKwp"))
	mwp = _zahl(p.get("mwp")) or 0
	verguetung = _zahl(db.get("eegZuschlagCt")) or _zahl(db.get("ppaPreisCt"))
	return {
		"art": art, "status": "uebernahme", "titel": p.get("titel") or "Erworbenes Projekt", "typ": p.get("typ") or "freiflaeche", "land": c.get("land") or p.get("land") or "DE",
		"bundesland": p.get("bundesland") or "", "mwp": mwp, "closingId": c.get("id"), "projektId": c.get("projektId"), "kaufpreis": _zahl(c.get("kaufpreis")) or 0,
		"kaufdatum": c.get("vollzogenAm") or "", "anteilProzent": _zahl(c.get("anteilProzent")) or 100, "spvName": c.get("spvName") or "", "struktur": c.get("struktur") or "",
		"inbetriebnahme": "" if art == "bestand" else str(p.get("codGeplant") or ""),
		"p50KwhJahr": round(ertrag * mwp * 1000) if ertrag and mwp else None, "verguetungCt": verguetung,
		"opexJahr": round(mwp * 1000 * (_zahl(db.get("opexEurKwp")) or OPEX_PRO_KWP)) if mwp else None, "schuldendienstJahr": None, "zusage": 0,
	}
