# Copyright (c) 2026, ÖkoInvest GmbH
#
# Finanzierung – reine Logik ohne Frappe (identisch zu src/lib/plattform/finanzierung/{kern,bank}.js, dort ausführlich
# beschrieben). Hier nur, was das Backend selbst rechnen muss: Tilgungsplan (Kreditvertrag), Term-Sheet-Prüfung,
# Covenant-Ampel und LTM-DSCR aus Monatswerten (Scheduler), LLCR, Bankenpaket/CP-Stammlisten.
# Das Financial Model, der Varianten- und der Term-Sheet-Vergleich rechnet die Website (Next.js-Server, reine Funktionen)
# mit denselben Daten – Frappe liefert Daten nur nach Rechteprüfung.
#
# Test: python -m unittest oekoinvest_app.plattform.tests.test_finanzierung (ohne Bench lauffähig)

import math

DSCR_LOCKUP = 1.10
DSCR_DEFAULT = 1.05
FRUEHWARN_PUFFER = 0.05

FALL_STATUS = ["vorbereitung", "angefragt", "termsheets", "entschieden", "vertrag", "auszahlung", "abgebrochen"]
ANFRAGE_STATUS = ["offen", "in_pruefung", "termsheet", "abgesagt", "ausgewaehlt", "nicht_ausgewaehlt", "zurueckgezogen"]
TILGUNG_PROFILE = ["annuitaet", "linear", "skulptiert", "endfaellig"]
REFERENZZINSEN = ["fix", "euribor3", "euribor6", "saron"]
SICHERHEITEN = ["uebereignung", "abtretung", "verpfaendung", "konten", "dienstbarkeit", "direct", "patronat"]
GESCHAEFTSMODELLE = {"verkauf": "Build-to-Sell (Verkauf an Investor)", "eigenbetrieb": "Eigenbetrieb mit Bankfinanzierung", "contracting": "Contracting im Eigentum (Direktlieferung)", "verpachtung": "Reine Verpachtung an Betreiber"}

BANKENPAKET = [
	("steckbrief", "Projektsteckbrief", "auto", True),
	("financial_model", "Financial Model (PDF + CSV)", "auto", True),
	("ertragsgutachten", "Ertragsgutachten (P50/P90)", "dokument", True),
	("pacht", "Pacht-/Nutzungsverträge und Dienstbarkeiten", "dokument", True),
	("netz", "Netzanschlusszusage / -vertrag", "dokument", True),
	("epc", "EPC-Vertrag (Generalunternehmer)", "dokument", True),
	("om", "O&M-Vertrag (Betriebsführung)", "dokument", True),
	("erloes", "Erlösvertrag (EEG-Zuschlag / EAG / PPA / Contracting)", "dokument", True),
	("genehmigung", "Genehmigungen (B-Plan/Baugenehmigung, Widmung)", "dokument", True),
	("versicherung", "Versicherungskonzept", "dokument", False),
	("gesellschaft", "Gesellschaftsunterlagen der SPV", "dokument", True),
	("kyb", "KYB der SPV (Identifizierung, wirtschaftlich Berechtigte)", "kyb", True),
]
BANKENPAKET_IDS = [b[0] for b in BANKENPAKET]

CP_STANDARD = [
	("kreditvertrag", "Kreditvertrag und Sicherheitenverträge unterzeichnet"),
	("gesellschaft", "Gesellschaftsdokumente, Beschlüsse und KYB der SPV"),
	("genehmigung", "Genehmigungen rechtskräftig (Baurecht / Widmung)"),
	("netz", "Netzanschlusszusage bzw. Netzanschlussvertrag"),
	("pacht", "Pachtverträge unterzeichnet, Dienstbarkeiten beantragt (Rang)"),
	("epc", "EPC- und O&M-Vertrag unterzeichnet"),
	("erloes", "Erlösvertrag (EEG-Zuschlag, EAG, PPA bzw. Contracting)"),
	("gutachten", "Unabhängiges Ertragsgutachten, technische und rechtliche Due Diligence"),
	("versicherung", "Versicherungsnachweise (Bauleistung, Betriebsunterbrechung)"),
	("eigenkapital", "Eigenkapital eingezahlt (bzw. Equity-Garantie)"),
	("dsra", "Schuldendienstreservekonto (DSRA) befüllt bzw. Garantie"),
	("direct", "Direktvereinbarungen (Direct Agreements) mit EPC/O&M/Abnehmer"),
	("gebuehren", "Gebühren bezahlt"),
]
CP_IDS = [c[0] for c in CP_STANDARD]


class FinanzierungFehler(ValueError):
	"""Validierungsfehler (API: 422)."""


def annuitaet(betrag, zins, jahre):
	if not jahre:
		return 0.0
	if zins == 0:
		return betrag / jahre
	return betrag * zins / (1 - (1 + zins) ** (-jahre))


def npv(rate, cashflows):
	return sum(cf / (1 + rate) ** t for t, cf in enumerate(cashflows))


def tilgungsplan(betrag, zins, jahre, profil="annuitaet", anlauf=0, T=None):
	"""Tilgungsplan (Listen Länge T, Index 0 = Jahr 1): zinsen, tilgung, rest, dienst. Skulptiert → wie Annuität (Vertragsplan)."""
	T = T or jahre
	zinsen, tilgung, rest = [0.0] * T, [0.0] * T, [0.0] * T
	r = max(0.0, float(betrag or 0))
	n = max(1, min(int(jahre or 1), T))
	a = min(int(anlauf or 0), n - 1)
	rate = annuitaet(r, zins, n - a) if profil in ("annuitaet", "skulptiert") else 0
	for t in range(1, T + 1):
		i = t - 1
		if r <= 0.005 or t > n:
			rest[i] = max(r, 0.0)
			continue
		zinsen[i] = r * zins
		if t <= a:
			tg = 0.0
		elif profil in ("annuitaet", "skulptiert"):
			tg = rate - zinsen[i]
		elif profil == "linear":
			tg = betrag / (n - a)
		else:
			tg = r if t == n else 0.0
		if t == n:
			tg = r
		tg = min(tg, r)
		tilgung[i] = tg
		r -= tg
		rest[i] = max(r, 0.0)
	return {"zinsen": zinsen, "tilgung": tilgung, "rest": rest, "dienst": [z + tg for z, tg in zip(zinsen, tilgung)]}


def _zahl(wert, lo, hi, stellen=4):
	try:
		n = float(str(wert).replace(",", "."))
	except (TypeError, ValueError):
		return None
	if math.isnan(n) or math.isinf(n):
		return None
	return round(min(hi, max(lo, n)), stellen)


def termsheet_bereinigen(d):
	"""Term Sheet prüfen (Prozentwerte als Prozentzahl, 1,8 = 1,8 %) – wie termsheetBereinigen in bank.js."""
	d = d or {}
	t = {
		"betrag": _zahl(d.get("betrag"), 0, 5e9, 0),
		"laufzeitJahre": _zahl(d.get("laufzeitJahre"), 1, 35, 0),
		"zinsArt": d.get("zinsArt") if d.get("zinsArt") in REFERENZZINSEN else "fix",
		"zinsPct": _zahl(d.get("zinsPct"), 0, 20),
		"referenzAnnahmePct": _zahl(d.get("referenzAnnahmePct"), -1, 15),
		"margePct": _zahl(d.get("margePct"), 0, 10),
		"tilgungsprofil": d.get("tilgungsprofil") if d.get("tilgungsprofil") in TILGUNG_PROFILE else "annuitaet",
		"tilgungsfreiJahre": _zahl(d.get("tilgungsfreiJahre"), 0, 5, 0) or 0,
		"dscrSizing": _zahl(d.get("dscrSizing"), 1, 3, 3),
		"dscrCovenant": _zahl(d.get("dscrCovenant"), 1, 3, 3) or DSCR_DEFAULT,
		"dscrLockup": _zahl(d.get("dscrLockup"), 1, 3, 3) or DSCR_LOCKUP,
		"llcrCovenant": _zahl(d.get("llcrCovenant"), 1, 3, 3),
		"dsraMonate": _zahl(d.get("dsraMonate"), 0, 24, 0) if d.get("dsraMonate") not in (None, "") else 6,
		"bearbeitungPct": _zahl(d.get("bearbeitungPct"), 0, 10) or 0,
		"bereitstellungPct": _zahl(d.get("bereitstellungPct"), 0, 5) or 0,
		"sicherheiten": [s for s in (d.get("sicherheiten") or []) if s in SICHERHEITEN][:10],
		"cps": [c for c in (d.get("cps") or []) if c in CP_IDS][:20],
		"gueltigBis": str(d.get("gueltigBis") or "")[:10] if len(str(d.get("gueltigBis") or "")) == 10 else "",
		"bemerkung": str(d.get("bemerkung") or "").strip()[:1500],
	}
	if t["referenzAnnahmePct"] is None:
		t["referenzAnnahmePct"] = 2.7
	if not t["betrag"]:
		raise FinanzierungFehler("Bitte den Kreditbetrag angeben.")
	if not t["laufzeitJahre"]:
		raise FinanzierungFehler("Bitte die Laufzeit angeben.")
	if t["zinsArt"] == "fix" and t["zinsPct"] is None:
		raise FinanzierungFehler("Bitte den Festzins angeben.")
	if t["zinsArt"] != "fix" and t["margePct"] is None:
		raise FinanzierungFehler("Bitte die Marge über dem Referenzzins angeben.")
	if t["dscrLockup"] < t["dscrCovenant"]:
		raise FinanzierungFehler("Der Lock-up-DSCR muss mindestens so hoch sein wie der Covenant-DSCR.")
	return t


def all_in_zins(t):
	return ((t.get("zinsPct") or 0) if t.get("zinsArt") == "fix" else (t.get("referenzAnnahmePct") or 0) + (t.get("margePct") or 0)) / 100.0


def covenant_ampel(dscr, lockup=DSCR_LOCKUP, covenant=DSCR_DEFAULT, vorher=None):
	if dscr is None:
		return {"id": "grau", "verletzt": False, "lockup": False, "grund": "Keine Messdaten bzw. kein Schuldendienst im Zeitraum."}
	if dscr < covenant:
		return {"id": "rot", "verletzt": True, "lockup": True, "grund": f"DSCR {dscr:.2f} unter dem Covenant {covenant:.2f} – Kündigungsrecht der Bank (Event of Default), sofort mit der Bank sprechen."}
	if dscr < lockup:
		return {"id": "rot", "verletzt": False, "lockup": True, "grund": f"DSCR {dscr:.2f} unter dem Lock-up {lockup:.2f} – Ausschüttungssperre."}
	if dscr < lockup + FRUEHWARN_PUFFER:
		return {"id": "gelb", "verletzt": False, "lockup": False, "grund": f"DSCR {dscr:.2f} nur knapp über dem Lock-up {lockup:.2f}."}
	if vorher is not None and vorher - dscr > 0.1:
		return {"id": "gelb", "verletzt": False, "lockup": False, "grund": f"DSCR fällt deutlich ({vorher:.2f} → {dscr:.2f})."}
	return {"id": "gruen", "verletzt": False, "lockup": False, "grund": f"DSCR {dscr:.2f} – ausreichend Abstand zum Lock-up."}


def covenant_pruefung(monate, lockup=DSCR_LOCKUP, covenant=DSCR_DEFAULT, llcr_covenant=None, restschuld=0.0, plan_cfads=None, zins=0.045):
	"""LTM-DSCR je Quartalsende + laufender Stand (letzter vollständiger Monat); LLCR zum Stichtag."""
	s = sorted(monate or [], key=lambda x: x["monat"])
	pruefungen = []
	for i in range(11, len(s)):
		m = s[i]["monat"]
		quartalsende = m[5:7] in ("03", "06", "09", "12")
		if not quartalsende and i != len(s) - 1:
			continue
		fenster = s[i - 11 : i + 1]
		cfads = sum(x.get("cfads") or 0 for x in fenster)
		ds = sum(x.get("schuldendienst") or 0 for x in fenster)
		dscr = cfads / ds if ds > 0.5 else None
		vorher = pruefungen[-1]["dscr"] if pruefungen else None
		periode = f"Q{math.ceil(int(m[5:7]) / 3)}/{m[:4]}" if quartalsende else f"LTM bis {m[5:7]}/{m[:4]}"
		pruefungen.append({"periode": periode, "bis": m, "laufend": not quartalsende, "cfads": cfads, "schuldendienst": ds, "dscr": dscr, "ampel": covenant_ampel(dscr, lockup, covenant, vorher)})
	llcr = npv(zins, [0] + list(plan_cfads)) / restschuld if restschuld > 0.5 and plan_cfads else None
	letzte = pruefungen[-1] if pruefungen else None
	ampel = letzte["ampel"] if letzte else covenant_ampel(None)
	if llcr is not None and llcr_covenant and llcr < llcr_covenant and ampel["id"] != "rot":
		ampel = {"id": "rot", "verletzt": True, "lockup": True, "grund": f"LLCR {llcr:.2f} unter dem Covenant {llcr_covenant:.2f}."}
	return {"pruefungen": pruefungen, "llcr": llcr, "ampel": ampel, "letzte": letzte}


def monats_cfads(erzeugung, einspeisung, strompreis_ct, grundgebuehr_monat, markt_ct, opex_monat, pacht_monat):
	"""CFADS eines Monats aus Zählerwerten: Direktlieferung × Arbeitspreis + Grundgebühr + Einspeisung × Marktwert − Kosten."""
	eigen = max(0.0, erzeugung - einspeisung)
	erloes = eigen * strompreis_ct / 100 + grundgebuehr_monat + einspeisung * markt_ct / 100
	kosten = opex_monat + pacht_monat
	return erloes, kosten, erloes - kosten
