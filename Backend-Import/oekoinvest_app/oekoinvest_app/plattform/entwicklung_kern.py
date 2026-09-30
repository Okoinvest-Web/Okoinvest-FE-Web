# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektentwicklung – reine Regeln, 1:1 wie src/lib/plattform/entwicklung.js der Website (bei Änderungen dort hier
# nachziehen): Stammlisten, Terminplanung (Vorwärtsrechnung über Abhängigkeiten), kritischer Pfad, Verzug, Phase aus
# erledigten Meilensteinen, Pipeline-Wert. Ohne Frappe/Datenbank – mit `python -m unittest` testbar.
#
# Meilensteine sind hier dicts mit den Schlüsseln der Website (camelCase):
#   id, nach [ids], status (offen|in_arbeit|erledigt|entfaellt), dauerMonate, sollStart, sollEnde, sollFix, istStart, istEnde, phase

from datetime import date, timedelta

from oekoinvest_app.plattform.entwicklung_vorlagen import VORLAGEN

ENTWICKLUNG_TYPEN = {
	"freiflaeche": "Freiflächen-PV", "agri": "Agri-PV", "carport": "Solarcarport / Parkplatz", "dach": "Dach-PV (Gewerbe/Halle)",
	"speicher": "Batteriegroßspeicher", "hybrid": "PV mit Speicher",
}
ENTWICKLUNG_STATUS = {"aktiv": "In Entwicklung", "pausiert": "Pausiert", "boerse": "An Börse übergeben", "bau": "An Bau/Betrieb übergeben", "abgebrochen": "Abgebrochen"}
ENTWICKLUNG_OFFEN = ("aktiv", "pausiert")
VERMARKTUNG = {"eeg": "Förderung (Ausschreibung/Marktprämie)", "ppa": "PPA (Stromliefervertrag)", "merchant": "Merchant (Direktvermarktung ohne Förderung)"}
VERMARKTUNG_LAND = {"DE": "EEG-Ausschreibung / Marktprämie", "AT": "EAG-Marktprämie / Investitionszuschuss", "CH": "Einmalvergütung (Pronovo)"}
PACHT_STATUS = {"angefragt": "Angefragt", "verhandlung": "In Verhandlung", "option": "Optionsvertrag", "pachtvertrag": "Pachtvertrag unterschrieben", "abgelehnt": "Abgelehnt / verloren"}
PACHT_GESICHERT = ("option", "pachtvertrag")
MEILENSTEIN_STATUS = {"offen": "Geplant", "in_arbeit": "In Arbeit", "erledigt": "Erledigt", "entfaellt": "Entfällt"}
MEILENSTEIN_FERTIG = ("erledigt", "entfaellt")
KATEGORIEN = {
	"flaeche": "Fläche", "netz": "Netz", "gemeinde": "Gemeinde & Planungsrecht", "gutachten": "Gutachten", "genehmigung": "Genehmigung",
	"vermarktung": "Vermarktung", "finanzierung": "Finanzierung", "bau": "Bau & Inbetriebnahme",
}
RISIKO_KATEGORIEN = {
	"genehmigung": "Genehmigung / Planungsrecht", "netz": "Netzanschluss", "flaeche": "Fläche / Eigentümer", "natur": "Natur- und Artenschutz",
	"akzeptanz": "Akzeptanz / Gemeinde", "markt": "Markt / Vermarktung", "finanzierung": "Finanzierung", "technik": "Technik / Bau", "sonstige": "Sonstige",
}
RISIKO_STATUS = {"offen": "Offen", "beobachten": "Beobachten", "mitigiert": "Gemindert", "eingetreten": "Eingetreten", "geschlossen": "Geschlossen"}
BUDGET_KATEGORIEN = {
	"flaeche": "Flächensicherung & Pacht (Entwicklungsphase)", "planung": "Planung & Bauleitplanung", "gutachten": "Gutachten", "netz": "Netzanfrage & Netzplanung",
	"recht": "Rechtsberatung & Verträge", "gebuehren": "Gebühren & Sicherheiten", "personal": "Eigenleistung (Stunden)", "sonstiges": "Sonstiges",
}
KONTAKT_ROLLEN = {
	"gemeinde": "Gemeinde / Bürgermeister", "bauamt": "Bauamt / Planungsbehörde", "naturschutz": "Naturschutzbehörde", "netzbetreiber": "Netzbetreiber",
	"landratsamt": "Landratsamt / Bezirkshauptmannschaft / Kanton", "planer": "Planungsbüro", "gutachter": "Gutachter", "eigentuemer": "Eigentümer / Bewirtschafter",
	"sonstige": "Sonstige Stakeholder",
}
GUTACHTER_FACHGEBIETE = {
	"artenschutz": "Artenschutz / Faunistik (saP)", "umwelt": "Umweltbericht / UVP / Eingriffsregelung", "ffh": "FFH- bzw. Naturverträglichkeitsprüfung",
	"landschaft": "Landschaftsplanung / Landschaftsbild", "blendung": "Blendgutachten", "schall": "Schallimmissionen", "geotechnik": "Baugrund / Geotechnik / Rammtests",
	"kampfmittel": "Kampfmittelerkundung (UXO)", "archaeologie": "Archäologie / Denkmalpflege", "hydrologie": "Entwässerung / Hydrologie", "netz": "Netzplanung / Netzverträglichkeit",
	"statik": "Statik / Tragwerksplanung", "brandschutz": "Brandschutz", "bauleitplanung": "Bauleitplanung / Stadtplanung", "agrar": "Agrarwissenschaft (Agri-PV, DIN SPEC 91434)",
	"vermessung": "Vermessung",
}
GUTACHTER_QUALIFIKATION = {
	"oebuv": "Öffentlich bestellt und vereidigt (Sachverständige/r)", "zertifiziert": "Zertifiziert / akkreditiert (z. B. DIN EN ISO/IEC 17024)",
	"kammer": "Kammermitglied (Architekten-/Ingenieurkammer, Ziviltechniker)", "fachbuero": "Fachbüro / Fachplaner", "sonstige": "Sonstige Qualifikation",
}
ENTSCHEIDUNG_ARTEN = {"go": "Go / Freigabe", "nogo": "Stopp / No-Go", "budget": "Budget", "strategie": "Strategie / Vermarktung", "sonstige": "Sonstige"}

# wie PHASEN (src/lib/invest/markt.js): Preisspanne €/kWp je Phase
PHASEN = [
	{"id": "flaeche", "kurz": "Flächensicherung", "min": 5, "max": 20},
	{"id": "netz", "kurz": "Netzzusage", "min": 15, "max": 40},
	{"id": "aufstellung", "kurz": "Aufstellungsbeschluss", "min": 25, "max": 55},
	{"id": "satzung", "kurz": "Baurecht", "min": 45, "max": 90},
	{"id": "rtb", "kurz": "Baureif", "min": 60, "max": 130},
	{"id": "cod", "kurz": "Bestand", "min": 550, "max": 850},
]
PHASEN_IDS = [p["id"] for p in PHASEN]
# wie ENTWICKLUNG (markt.js) – interne Planannahme, je Projekt überschreibbar
ZIEL_MWP_JAHR = 50
WAHRSCHEINLICHKEIT = {"akquise": 0.05, "flaeche": 0.15, "netz": 0.25, "aufstellung": 0.4, "satzung": 0.65, "rtb": 0.85, "cod": 1}


def vermarktung_label(v, land):
	return VERMARKTUNG_LAND.get(land) if v == "eeg" and land in VERMARKTUNG_LAND else VERMARKTUNG.get(v, "–")


def vorlage(land="DE", typ="freiflaeche"):
	"""Standard-Vorlage (Liste von dicts: schluessel, titel, kategorie, dauerMonate, nach, phase, dokumentPflicht, externTitel, gutachten)."""
	t = typ if typ in ENTWICKLUNG_TYPEN else "freiflaeche"
	l = land if land in ("DE", "AT", "CH") else "DE"
	return [dict(x) for x in VORLAGEN[f"{l}|{t}"]]


def risiko_score(eintritt, auswirkung):
	e = min(5, max(1, int(eintritt or 1)))
	a = min(5, max(1, int(auswirkung or 1)))
	return e * a


def risiko_ampel(score):
	return "hoch" if score >= 15 else "mittel" if score >= 8 else "gering"


# ================================================================ Termine

def _d(iso):
	return date.fromisoformat(str(iso)[:10]) if iso else None


def _iso(d):
	return d.isoformat() if d else None


def heute_iso():
	return date.today().isoformat()


def plus_monate(iso, monate):
	"""wie plusMonate: ganze Monate kalendarisch, Rest × 30,4 Tage."""
	d = _d(iso)
	ganz = int(monate // 1)
	m = d.month - 1 + ganz
	jahr = d.year + m // 12
	monat = m % 12 + 1
	# JS setUTCMonth läuft bei zu großem Tag in den Folgemonat über
	tag = d.day
	basis = date(jahr, monat, 1)
	d2 = basis + timedelta(days=tag - 1)
	rest = monate - ganz
	if rest:
		d2 = d2 + timedelta(days=round(rest * 30.4))
	return d2.isoformat()


def tage_zwischen(a, b):
	return (_d(b) - _d(a)).days


def _max_iso(liste):
	werte = sorted(x for x in liste if x)
	return werte[-1] if werte else None


def effektives_ende(m, heute=None, prognose=True):
	heute = heute or heute_iso()
	if m.get("status") == "erledigt":
		return m.get("istEnde") or m.get("sollEnde")
	if m.get("status") == "entfaellt":
		return m.get("istEnde") or m.get("sollStart") or m.get("sollEnde")
	if prognose and m.get("sollEnde") and m["sollEnde"] < heute:
		return heute
	return m.get("sollEnde")


def topologisch(meilensteine):
	nach_id = {m["id"]: m for m in meilensteine}
	erg, status = [], {}

	def besuch(m):
		if status.get(m["id"]):
			return
		status[m["id"]] = 1
		for v in m.get("nach") or []:
			if v in nach_id:
				besuch(nach_id[v])
		status[m["id"]] = 2
		erg.append(m)

	for m in meilensteine:
		besuch(m)
	return erg


def erzeugt_kreis(meilensteine, mid, neue_vorgaenger):
	nach_id = {m["id"]: dict(m) for m in meilensteine}
	if mid in nach_id:
		nach_id[mid]["nach"] = list(neue_vorgaenger)
	gesehen, stapel = set(), list(neue_vorgaenger)
	while stapel:
		x = stapel.pop()
		if x == mid:
			return True
		if x in gesehen:
			continue
		gesehen.add(x)
		stapel.extend((nach_id.get(x) or {}).get("nach") or [])
	return False


def plan_berechnen(meilensteine, start=None, heute=None, fixieren=True, prognose=True):
	"""Soll-Termine vorwärts rechnen (neue dicts). Erledigte/entfallene und (fixieren) fixierte behalten ihre Termine."""
	start = start or heute_iso()
	heute = heute or heute_iso()
	neu = {}
	for m in topologisch(meilensteine):
		x = dict(m)
		if x.get("status") not in MEILENSTEIN_FERTIG and not (fixieren and x.get("sollFix")):
			vorg = [neu[v] for v in (x.get("nach") or []) if v in neu]
			beginn = _max_iso([start, *[effektives_ende(v, heute, prognose) for v in vorg]])
			s = x.get("istStart") or beginn
			x["sollStart"] = s
			x["sollEnde"] = plus_monate(s, float(x.get("dauerMonate") or 1))
		neu[x["id"]] = x
	return [neu[m["id"]] for m in meilensteine]


def kritischer_pfad(meilensteine, heute=None):
	"""→ ({id: {puffer, kritisch, prognoseStart, prognoseEnde}}, projektEnde) – wie kritischerPfad in entwicklung.js."""
	heute = heute or heute_iso()
	aktiv = [m for m in meilensteine if m.get("status") != "entfaellt"]
	ids = {m["id"] for m in aktiv}
	prog = {}
	for m in topologisch(aktiv):
		dauer = max(1, tage_zwischen(m.get("sollStart") or heute, m.get("sollEnde") or heute))
		vorg = [prog[v] for v in (m.get("nach") or []) if v in ids and v in prog]
		if m.get("status") == "erledigt":
			start = m.get("istStart") or m.get("sollStart")
		else:
			start = _max_iso([m.get("istStart") or m.get("sollStart"), *[v["ende"] for v in vorg]])
		start = start or heute
		if m.get("status") == "erledigt":
			ende = m.get("istEnde") or m.get("sollEnde")
		else:
			ende = (_d(start) + timedelta(days=dauer)).isoformat()
			if ende < heute:
				ende = heute
		prog[m["id"]] = {"start": start, "ende": ende, "dauer": dauer}
	projekt_ende = _max_iso([p["ende"] for p in prog.values()]) or heute
	nachfolger = {m["id"]: [] for m in aktiv}
	for m in aktiv:
		for v in m.get("nach") or []:
			if v in nachfolger:
				nachfolger[v].append(m["id"])
	spaet = {}
	for m in reversed(topologisch(aktiv)):
		nf = nachfolger.get(m["id"]) or []
		if nf:
			spaet[m["id"]] = sorted((_d(spaet[n]) - timedelta(days=prog[n]["dauer"])).isoformat() for n in nf)[0]
		else:
			spaet[m["id"]] = projekt_ende
	erg = {}
	for m in aktiv:
		p = prog[m["id"]]
		puffer = tage_zwischen(p["ende"], spaet[m["id"]])
		erg[m["id"]] = {"puffer": puffer, "kritisch": m.get("status") != "erledigt" and puffer <= 0, "prognoseStart": p["start"], "prognoseEnde": p["ende"]}
	return erg, projekt_ende


def verzug_tage(m, heute=None):
	heute = heute or heute_iso()
	if not m.get("sollEnde") or m.get("status") == "entfaellt":
		return 0
	if m.get("status") == "erledigt":
		return max(0, tage_zwischen(m["sollEnde"], m["istEnde"])) if m.get("istEnde") else 0
	return max(0, tage_zwischen(m["sollEnde"], heute))


def ist_ueberfaellig(m, heute=None):
	heute = heute or heute_iso()
	return m.get("status") not in MEILENSTEIN_FERTIG and bool(m.get("sollEnde")) and m["sollEnde"] < heute


def offene_vorgaenger(meilensteine, m):
	nach_id = {x["id"]: x for x in meilensteine}
	return [nach_id[v] for v in (m.get("nach") or []) if v in nach_id and nach_id[v].get("status") not in MEILENSTEIN_FERTIG]


# ================================================================ Phase & Pipeline

def phase_aus_meilensteinen(meilensteine):
	best = -1
	for m in meilensteine:
		if m.get("status") == "erledigt" and m.get("phase") in PHASEN_IDS:
			best = max(best, PHASEN_IDS.index(m["phase"]))
	return PHASEN_IDS[best] if best >= 0 else None


def phase_label(pid):
	return next((p["kurz"] for p in PHASEN if p["id"] == pid), "Akquise") if pid else "Akquise"


def _js_round(x):
	import math

	return math.floor(x + 0.5)


def pipeline_wert(mwp, phase, wahrscheinlichkeit=None):
	"""MWp × 1000 × Mitte der Phasenspanne × Wahrscheinlichkeit (wie pipelineWert)."""
	p = next((x for x in PHASEN if x["id"] == phase), PHASEN[0])
	preis = (p["min"] + p["max"]) / 2
	w = float(wahrscheinlichkeit) if wahrscheinlichkeit not in (None, "") else WAHRSCHEINLICHKEIT.get(phase or "akquise", 0)
	kwp = float(mwp or 0) * 1000
	volumen = _js_round(kwp * preis)
	return {
		"phase": phase or None, "phaseLabel": phase_label(phase), "preisProKwp": preis if preis % 1 else int(preis), "wahrscheinlichkeit": w,
		"volumen": volumen, "wert": _js_round(volumen * w), "gewichtetMwp": _js_round(float(mwp or 0) * w * 100) / 100,
	}


def plan_monate(schritte):
	nach_s = {s["schluessel"]: s for s in schritte}
	ende = {}

	def rechne(s, tiefe=0):
		if s["schluessel"] in ende:
			return ende[s["schluessel"]]
		if tiefe > 60:
			return 0
		v = max([0, *[rechne(nach_s[n], tiefe + 1) for n in s["nach"] if n in nach_s]])
		ende[s["schluessel"]] = v + s["dauerMonate"]
		return ende[s["schluessel"]]

	return max([0, *[rechne(s) for s in schritte]])


def mwp_aus_flaeche(ha, agri=False, ha_pro_mwp=1.1):
	x = float(ha or 0)
	return _js_round(x / (ha_pro_mwp * 1.6 if agri else ha_pro_mwp) * 10) / 10


def quartal(iso):
	if not iso:
		return ""
	d = _d(iso)
	return f"Q{(d.month - 1) // 3 + 1} {d.year}"
