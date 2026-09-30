# Netzanschlusskosten – Python-Gegenstück zu src/lib/rechner/netzanschluss.js (Funktionen kosten/ebeneFuer/Ampel).
# Konstanten gespiegelt aus src/lib/invest/markt.js (FREIFLAECHE, FREIFLAECHE.netz), Stand 30.09.2026.
# Bei Änderungen in markt.js hier nachziehen – tests/faelle.json prüft die Gleichheit mit der JS-Implementierung.

import math

FREIFLAECHE = {
	"haProMwp": 1.1,
	"capexProKwp": {"min": 400, "mittel": 470, "max": 600},
	"kabelProMeter": 120,
	"netzanschlussFixProMwp": 35000,
}
NETZ = {
	"msSystemMw": 12,
	"zusatzSystemFaktor": 0.6,
	"uwFeld": {"min": 150000, "mittel": 250000, "max": 400000},
	"einschleifen": 80000,
	"hsKabelProKm": {"min": 900000, "mittel": 1300000, "max": 2000000},
	"kundenUwFix": 2000000,
	"kundenUwProMva": 40000,
	"grenzeMsMw": 12,
	"grenzeUwMw": 35,
}
PACHT = {
	"freiflaecheProHa": {"min": 1500, "mittel": 2800, "max": 4500},
	"agriProHa": {"min": 600, "mittel": 1200, "max": 2000},
}
SPANNE = {"min": 0.8, "max": 1.4}


def jsround(x):
	"""Rundung wie JavaScript Math.round (halbe Werte Richtung +∞) – Python round() rundet zur geraden Zahl."""
	return int(math.floor(x + 0.5))


def ebene_fuer(anschluss_mw):
	if anschluss_mw <= NETZ["grenzeMsMw"]:
		return "msLeitung"
	if anschluss_mw <= NETZ["grenzeUwMw"]:
		return "uwMs"
	return "hs"


def _kosten(mwp, km, anschluss_mw, ebene):
	systeme = max(1, math.ceil(anschluss_mw / NETZ["msSystemMw"] - 1e-9))
	kabel_ms = km * 1000 * FREIFLAECHE["kabelProMeter"] * (1 + (systeme - 1) * NETZ["zusatzSystemFaktor"])
	summe = mwp * FREIFLAECHE["netzanschlussFixProMwp"]
	if ebene == "msLeitung":
		summe += NETZ["einschleifen"] + kabel_ms
	elif ebene == "uwMs":
		summe += NETZ["uwFeld"]["mittel"] * systeme + kabel_ms
	else:
		summe += NETZ["kundenUwFix"] + NETZ["kundenUwProMva"] * anschluss_mw + km * NETZ["hsKabelProKm"]["mittel"]
	return summe


def netzkosten(mwp, trasse_km, ebene="auto", kapazitaet="unbekannt"):
	"""Wie scoring.js netzkosten(): Kosten, Spanne, €/kWp, Anteil an der Anlage, Ampel, Zeitrahmen (Monate)."""
	mwp = max(0.1, float(mwp))
	km = max(0.0, float(trasse_km))
	kap = kapazitaet if kapazitaet in ("frei", "knapp") else "unbekannt"
	ebene_ist = ebene_fuer(mwp) if ebene == "auto" else ebene
	summe = _kosten(mwp, km, mwp, ebene_ist)
	capex = mwp * 1000 * FREIFLAECHE["capexProKwp"]["mittel"]
	anteil = summe / capex
	if kap == "knapp" or anteil > 0.3:
		ampel = "kritisch"
	elif kap == "unbekannt" or anteil > 0.15:
		ampel = "pruefen"
	else:
		ampel = "gut"
	basis = {"msLeitung": (9, 18), "uwMs": (12, 30), "hs": (24, 48)}[ebene_ist]
	plus = {"frei": (0, 0), "unbekannt": (0, 12), "knapp": (24, 60)}[kap]
	trasse = (3, 9) if km > 5 else (0, 0)
	return {
		"ebene": ebene_ist,
		"summe": jsround(summe),
		"min": jsround(summe * SPANNE["min"]),
		"max": jsround(summe * SPANNE["max"]),
		"proKwp": jsround(summe / (mwp * 1000)),
		"anteil": jsround(anteil * 1000) / 1000,
		"ampel": ampel,
		"monate": [basis[0] + plus[0] + trasse[0], basis[1] + plus[1] + trasse[1]],
	}
