# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fachliche Erweiterung des Investoren-Suchprofils – 1:1 aus src/lib/plattform/fach/suchprofil.js.
# Der Matching-Score (matching.py) bleibt unverändert.

import math

INVESTOR_TYPEN = ["family_office", "fonds", "stadtwerk", "evu", "ipp", "versicherung", "unternehmen", "privat", "genossenschaft"]
DEAL_STRUKTUREN = ["asset", "share"]
CO_DEVELOPMENT = ["egal", "ja", "nein"]
ESG = ["taxonomie", "sfdr", "lieferkette", "biodiversitaet", "buergerbeteiligung"]
FINANZIERUNG = ["ek", "projektfinanzierung", "portfolio", "offen"]


def _zahl(v, mn, mx, stellen=1):
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


def _mehrfach(v, erlaubt):
	out = []
	for x in v if isinstance(v, list) else []:
		if x in erlaubt and x not in out:
			out.append(x)
	return out


def suchprofil_erweiterung(p, bundeslaender_alle):
	p = p if isinstance(p, dict) else {}
	return {
		"investorTyp": p.get("investorTyp") if p.get("investorTyp") in INVESTOR_TYPEN else "",
		"regionen": _mehrfach(p.get("regionen"), set(bundeslaender_alle)),
		"renditeZielPct": _zahl(p.get("renditeZielPct"), 0, 30, 1),
		"renditeBasis": p.get("renditeBasis") if p.get("renditeBasis") in ("projekt", "ek") else "ek",
		"dealStrukturen": _mehrfach(p.get("dealStrukturen"), DEAL_STRUKTUREN),
		"coDevelopment": p.get("coDevelopment") if p.get("coDevelopment") in CO_DEVELOPMENT else "egal",
		"esg": _mehrfach(p.get("esg"), ESG),
		"finanzierung": p.get("finanzierung") if p.get("finanzierung") in FINANZIERUNG else "",
		"datenraumMin": _zahl(p.get("datenraumMin"), 0, 100, 0),
	}
