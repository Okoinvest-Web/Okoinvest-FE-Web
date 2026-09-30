# Copyright (c) 2026, ÖkoInvest GmbH
#
# Passung Projekt ↔ Suchprofil eines Investors (0–100 Punkte) – Port von src/lib/plattform/matching.js.
# Gewichte: Typ 25, Phase 25, Land 20, Größe 20, Ticket 10. Leere Kriterien zählen als „egal“.

import math

from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN, PHASEN_IDS, PROJEKT_TYPEN


def _zahl(v):
	try:
		n = float(v)
	except (TypeError, ValueError):
		return 0.0
	return n if math.isfinite(n) else 0.0


def preis_gesamt(p):
	"""Kaufpreis gesamt (für den Ticket-Abgleich), None bei „auf Anfrage“ (Port von format.js)."""
	if not p or p.get("preisModus") == "anfrage":
		return None
	if p.get("preisModus") == "proKwp" and p.get("preisProKwp") and p.get("mwp"):
		return p["preisProKwp"] * p["mwp"] * 1000
	return p.get("preis") or None


def _index(phase):
	return PHASEN_IDS.index(phase) if phase in PHASEN_IDS else -1


def matching(projekt, profil):
	"""`projekt` in camelCase (Ausgabe), `profil` = Suchprofil-Dict."""
	if not projekt:
		return {"score": 0, "gruende": []}
	p = profil or {}
	gruende = []
	score = 0

	typen = p.get("typen") or []
	if not typen or projekt.get("typ") in typen:
		score += 25
		if typen:
			gruende.append(PROJEKT_TYPEN.get(projekt.get("typ"), projekt.get("typ")))

	phasen = p.get("phasen") or []
	if not phasen:
		score += 25
	elif projekt.get("phase") in phasen:
		score += 25
		kurz = next((x["kurz"] for x in PHASEN if x["id"] == projekt.get("phase")), projekt.get("phase"))
		gruende.append(kurz)
	else:
		idx = _index(projekt.get("phase"))
		if any(abs(_index(ph) - idx) == 1 for ph in phasen):
			score += 12

	laender = p.get("laender") or []
	if not laender or projekt.get("land") in laender:
		score += 20
		if laender:
			gruende.append(LAENDER.get(projekt.get("land"), projekt.get("land")))

	m = _zahl(projekt.get("mwp"))
	mn = _zahl(p.get("mwpMin"))
	mx = _zahl(p.get("mwpMax")) or math.inf
	if mn <= m <= mx:
		score += 20
		if p.get("mwpMin") or p.get("mwpMax"):
			gruende.append("Größe passt")
	elif mn * 0.75 <= m <= mx * 1.25:
		score += 10

	preis = preis_gesamt(projekt)
	t_min = _zahl(p.get("ticketMin"))
	t_max = _zahl(p.get("ticketMax")) or math.inf
	if not p.get("ticketMin") and not p.get("ticketMax"):
		score += 10
	elif preis is None:
		score += 5
	elif t_min <= preis <= t_max:
		score += 10
		gruende.append("Ticket passt")

	return {"score": int(math.floor(score + 0.5)), "gruende": gruende}
