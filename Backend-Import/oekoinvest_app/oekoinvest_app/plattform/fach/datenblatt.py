# Copyright (c) 2026, ÖkoInvest GmbH
#
# Standard-Projektdatenblatt der Projektbörse – 1:1 aus src/lib/plattform/fach/datenblatt.js:
# Bereinigung (Positivliste aus datenblatt_schema.json), Relevanz/Pflicht je Phase, Vollständigkeit,
# Plausibilitätsprüfungen und Due-Diligence-Index (acht Kategorien mit Ampel).
# Reine Funktionen ohne Frappe-Abhängigkeit (python -m unittest ohne Bench).
#
# Projekt-Dict im JSON-Format (camelCase): typ, land, bundesland, phase, mwp, flaecheHa, netzanschluss, codGeplant,
# vertraulich {…}, datenblatt {…}.

import datetime
import json
import math
import os
import re

_ORDNER = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_ORDNER, "datenblatt_schema.json"), encoding="utf-8") as _f:
	SCHEMA = json.load(_f)
with open(os.path.join(_ORDNER, "markt_werte.json"), encoding="utf-8") as _f:
	MARKT = json.load(_f)

PHASEN = SCHEMA["phasen"]
FELDER = [dict(f, bereich=b["id"]) for b in SCHEMA["bereiche"] for f in b["felder"]]
FELD = {f["id"]: f for f in FELDER}
DATENBLATT_VERTRAULICH = [f["id"] for f in FELDER if f.get("pfad") == "vertraulich"]
DATUM = re.compile(r"^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")
STEUER = re.compile(r"[\x00-\x1f\x7f]")


def _phase_idx(p):
	return PHASEN.index(p) if p in PHASEN else -1


def _js_round(x):
	return math.floor(x + 0.5)


# ---------------------------------------------------------------- Bereinigung


def _zahl(v, f):
	if v is None or v == "" or isinstance(v, (bool, dict, list)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if not math.isfinite(n) or n < f.get("min", -math.inf) or n > f.get("max", math.inf):
		return None
	s = f.get("stellen", 2)
	r = _js_round(n * 10**s) / 10**s
	return int(r) if s == 0 else r


def _text(v, laenge=200):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"\s{2,}", " ", STEUER.sub(" ", str(v))).strip()[:laenge]


def feld_bereinigen(f, v):
	t = f["typ"]
	if t == "zahl":
		return _zahl(v, f)
	if t == "auswahl":
		return v if any(o[0] == v for o in f["optionen"]) else ""
	if t == "datum":
		s = _text(v, 10)
		if not DATUM.match(s):
			return ""
		try:
			datetime.date.fromisoformat(s)
		except ValueError:
			return ""
		return s
	if t == "tabelle":
		if not isinstance(v, list):
			return []
		zeilen = []
		for z in v[:40]:
			z = z if isinstance(z, dict) else {}
			e = {
				"jahr": _zahl(z.get("jahr"), {"min": 1990, "max": 2100, "stellen": 0}),
				"istMwh": _zahl(z.get("istMwh"), {"min": 0, "max": 10000000, "stellen": 1}),
				"prognoseMwh": _zahl(z.get("prognoseMwh"), {"min": 0, "max": 10000000, "stellen": 1}),
			}
			if e["jahr"] is not None and (e["istMwh"] is not None or e["prognoseMwh"] is not None):
				zeilen.append(e)
		return sorted(zeilen, key=lambda z: z["jahr"])
	return _text(v, f.get("laenge") or 200)


def datenblatt_bereinigen(roh, basis=None):
	"""Wie datenblattBereinigen: roh None → basis unverändert; Felder mit pfad „vertraulich“ werden hier nicht gespeichert."""
	if roh is None or not isinstance(roh, dict):
		return basis if isinstance(basis, dict) else {}
	out = {}
	for f in FELDER:
		if f.get("pfad") == "vertraulich":
			continue
		w = feld_bereinigen(f, roh.get(f["id"]))
		if w is None or w == "" or (isinstance(w, list) and not w):
			continue
		out[f["id"]] = w
	return out


def feld_wert(p, f):
	q = (p or {}).get("vertraulich" if f.get("pfad") == "vertraulich" else "datenblatt") or {}
	return q.get(f["id"])


def _gefuellt(w):
	return not (w is None or w == "" or (isinstance(w, list) and not w))


# ---------------------------------------------------------------- Relevanz und Vollständigkeit


def feld_relevant(p, f):
	p = p or {}
	bestand = p.get("phase") == "cod"
	if f.get("nurTypen") and p.get("typ") not in f["nurTypen"]:
		return False
	if f.get("ohneTypen") and p.get("typ") in f["ohneTypen"]:
		return False
	if f.get("land") and f["land"] != p.get("land"):
		return False
	if f.get("nurBestand") and not bestand:
		return False
	if f.get("ohneBestand") and bestand:
		return False
	w = f.get("wenn")
	if w:
		bezug = FELD.get(w["feld"])
		wert = feld_wert(p, bezug) if bezug else None
		if w.get("gesetzt"):
			return _gefuellt(wert)
		if w.get("in") and wert not in w["in"]:
			return False
	return True


def feld_erwartet(p, f):
	if not f.get("pflicht") or not feld_relevant(p, f):
		return False
	phase = _phase_idx((p or {}).get("phase"))
	if phase < 0:
		return False
	if f.get("nurBestand"):
		return True
	if not f.get("ab"):
		return True
	return _phase_idx(f["ab"]) <= phase


def datenblatt_vollstaendigkeit(p):
	bereiche = []
	for b in SCHEMA["bereiche"]:
		erwartet = [f for f in b["felder"] if feld_erwartet(p, f)]
		fehlend = [f for f in erwartet if not _gefuellt(feld_wert(p, f))]
		bereiche.append({"id": b["id"], "titel": b["titel"], "erwartet": len(erwartet), "erfuellt": len(erwartet) - len(fehlend), "fehlend": [f["label"] for f in fehlend]})
	erwartet = sum(b["erwartet"] for b in bereiche)
	erfuellt = sum(b["erfuellt"] for b in bereiche)
	return {"quote": int(_js_round(erfuellt / erwartet * 100)) if erwartet else 100, "erwartet": erwartet, "erfuellt": erfuellt, "bereiche": bereiche}


# ---------------------------------------------------------------- Plausibilität

DE_REGION = {
	"Schleswig-Holstein": "de-nord", "Hamburg": "de-nord", "Niedersachsen": "de-nord", "Bremen": "de-nord", "Mecklenburg-Vorpommern": "de-nord",
	"Brandenburg": "de-ost", "Berlin": "de-ost", "Sachsen": "de-ost", "Sachsen-Anhalt": "de-ost", "Thüringen": "de-ost",
	"Nordrhein-Westfalen": "de-west", "Hessen": "de-west", "Rheinland-Pfalz": "de-west", "Saarland": "de-west",
	"Bayern": "de-sued", "Baden-Württemberg": "de-sued",
}


def region_fuer_projekt(p):
	land = (p or {}).get("land")
	if land == "AT":
		return "at"
	if land == "CH":
		return "ch"
	return DE_REGION.get((p or {}).get("bundesland"), "de-sued")


def bauart_fuer(aufstaenderung, typ):
	if aufstaenderung in MARKT["bauart"]:
		return aufstaenderung
	return "agriHoch" if typ == "agri" else "sued"


def erwarteter_ertrag(p):
	db = (p or {}).get("datenblatt") or {}
	ertrag = MARKT["regionen"].get(region_fuer_projekt(p), MARKT["regionen"]["de-sued"])
	typ = (p or {}).get("typ")
	if db.get("aufstaenderung") == "carport" or typ == "carport":
		return _js_round(ertrag * MARKT["carportErtragFaktor"])
	if db.get("aufstaenderung") == "dach" or typ == "dach":
		return _js_round(ertrag * 0.9)
	if db.get("aufstaenderung") == "schwimmend":
		return _js_round(ertrag * 0.97)
	return _js_round(ertrag * MARKT["bauart"][bauart_fuer(db.get("aufstaenderung"), typ)]["faktor"])


def _n(x):
	try:
		return float(x) if x not in (None, "") else 0.0
	except (TypeError, ValueError):
		return 0.0


def datenblatt_pruefen(p, jetzt=None):  # noqa: C901 – bewusst 1:1 zur JS-Referenz
	h = []

	def add(stufe, feld, dd, text):
		h.append({"stufe": stufe, "feld": feld, "dd": dd, "text": text})

	p = p or {}
	db = p.get("datenblatt") or {}
	vt = p.get("vertraulich") or {}
	mwp = _n(p.get("mwp"))
	heute = (jetzt or datetime.date.today().isoformat())[:10]
	phase = _phase_idx(p.get("phase"))
	bestand = p.get("phase") == "cod"
	pv = p.get("typ") != "speicher"
	cod = str(p.get("codGeplant") or "")

	if pv and mwp > 0 and _n(db.get("mwac")) > 0:
		r = mwp / _n(db["mwac"])
		if r < 0.95:
			add("warnung", "mwac", "technisch", f"DC/AC-Verhältnis {r:.2f} – AC-Leistung größer als die Modulleistung ist unüblich. Bitte prüfen.")
		elif r > 1.5:
			add("warnung", "mwac", "technisch", f"DC/AC-Verhältnis {r:.2f} – starke Überbauung, Abregelungsverluste im Ertragsgutachten ausweisen.")

	ha = _n(p.get("flaecheHa"))
	if pv and mwp > 0 and ha > 0 and p.get("typ") not in ("dach", "carport"):
		bauart = MARKT["bauart"][bauart_fuer(db.get("aufstaenderung"), p.get("typ"))]
		ha_je = ha / mwp
		if ha_je < bauart["haProMwp"] * 0.6:
			add("warnung", "flaecheHa", "technisch", f"Belegung {mwp / ha:.2f} MWp/ha ist für „{bauart['label']}“ sehr dicht (üblich rund {1 / bauart['haProMwp']:.2f} MWp/ha). Fläche oder Leistung prüfen.")
		elif ha_je > bauart["haProMwp"] * 2.5:
			add("info", "flaecheHa", "technisch", f"Belegung nur {mwp / ha:.2f} MWp/ha – Fläche enthält vermutlich Ausgleichs-, Abstands- oder Erweiterungsflächen. Bitte kurz erläutern.")

	p50 = _n(vt.get("ertragKwhKwp")) or None
	if pv and p50:
		soll = erwarteter_ertrag(p)
		abw = p50 / soll - 1
		if abw > 0.12:
			add("warnung", "ertragKwhKwp", "ertrag", f"P50 {p50:g} kWh/kWp liegt {_js_round(abw * 100)} % über dem regionalen Richtwert ({soll} kWh/kWp). Gutachten und Annahmen (Albedo, Bifazialgewinn, Verluste) prüfen.")
		elif abw < -0.2:
			add("warnung", "ertragKwhKwp", "ertrag", f"P50 {p50:g} kWh/kWp liegt deutlich unter dem regionalen Richtwert ({soll} kWh/kWp) – Verschattung oder Abregelung erläutern.")
	p90 = _n(db.get("ertragP90")) or None
	if pv and p50 and p90:
		if p90 >= p50:
			add("fehler", "ertragP90", "ertrag", "P90 muss kleiner als P50 sein (höhere Überschreitungswahrscheinlichkeit = niedrigerer Wert).")
		else:
			q = p90 / p50
			if q > 0.97:
				add("warnung", "ertragP90", "ertrag", "P90/P50 – ungewöhnlich geringe Unsicherheit. Handelt es sich um einen 10-Jahres-P90? Für die Finanzierung zählt meist der 1-Jahres-P90.")
			elif q < 0.8:
				add("warnung", "ertragP90", "ertrag", "P90/P50 – sehr hohe Unsicherheit. Datenbasis und Unsicherheitsbudget des Gutachtens prüfen.")
	p75 = _n(db.get("ertragP75")) or None
	if pv and p75 and ((p50 and p75 >= p50) or (p90 and p75 <= p90)):
		add("fehler", "ertragP75", "ertrag", "Reihenfolge der P-Werte stimmt nicht: P90 < P75 < P50.")
	if pv and db.get("ertragDatenbasis") == "eigen" and phase >= _phase_idx("satzung"):
		add("warnung", "ertragDatenbasis", "ertrag", "Nur Eigenberechnung – ab Baurecht erwarten Investoren und Banken ein unabhängiges Ertragsgutachten.")

	ac_ref = _n(db.get("mwac")) or mwp or None
	zusage = _n(db.get("zusageMw"))
	if zusage > 0 and ac_ref and zusage < ac_ref * 0.98:
		if db.get("ueberbauung") != "ja" and not db.get("einspeiseLimitMw"):
			add("warnung", "zusageMw", "netz", "Zusage liegt unter der Anlagenleistung – Überbauung bzw. Einspeisebegrenzung angeben und im Ertrag berücksichtigen.")
		else:
			add("info", "zusageMw", "netz", "Anschluss überbaut – Abregelungsverluste sollten im Ertragsgutachten enthalten sein.")
	bef = db.get("zusageBefristetBis")
	if bef and not bestand:
		if bef < heute:
			add("fehler", "zusageBefristetBis", "netz", "Die Befristung der Netzzusage ist abgelaufen – Verlängerung oder neue Zusage nachweisen.")
		elif cod and cod > bef[: len(cod)]:
			add("warnung", "zusageBefristetBis", "netz", "Geplante Inbetriebnahme liegt nach dem Ende der Netzreservierung.")
	if _n(vt.get("entfernungNetzKm")) > 15:
		add("warnung", "entfernungNetzKm", "netz", "Netzverknüpfungspunkt über 15 km entfernt – Trassensicherung (Dienstbarkeiten) und Kabelkosten gesondert ausweisen.")
	if p.get("netzanschluss") in ("zusage", "reserviert", "vorhanden") and pv and not db.get("zusageDatum") and not bestand and phase >= _phase_idx("netz"):
		add("info", "zusageDatum", "netz", "Netzanschluss laut Grunddaten zugesagt – Datum der Zusage ergänzen.")
	if phase >= _phase_idx("netz") and p.get("netzanschluss") == "offen":
		add("warnung", "netz", "netz", "Phase „Netzzusage“ oder später, aber Netzanschluss laut Grunddaten „noch nicht angefragt“ – Angaben widersprechen sich.")

	if _n(db.get("speicherMw")) > 0 and _n(db.get("speicherMwh")) > 0:
		dauer = _n(db["speicherMwh"]) / _n(db["speicherMw"])
		if dauer < 0.5 or dauer > 8:
			add("warnung", "speicherMwh", "technisch", f"Speicherdauer {dauer:.1f} h ist ungewöhnlich (üblich 1–4 h).")

	pacht = _n(db.get("pachtEurHa"))
	if pacht:
		sp = MARKT["pacht"]["agri" if p.get("typ") == "agri" else "freiflaeche"]
		if pacht > sp["max"] * 1.3:
			add("warnung", "pachtEurHa", "kaufmaennisch", "Pacht liegt deutlich über der Marktspanne – belastet die Wirtschaftlichkeit.")
		elif pacht < sp["min"] * 0.5:
			add("info", "pachtEurHa", "kaufmaennisch", "Pacht deutlich unter Marktspanne – Nachverhandlungs- bzw. Anfechtungsrisiko prüfen.")
	if "pachtLaufzeitJahre" in db and pv:
		gesamt = _n(db.get("pachtLaufzeitJahre")) + _n(db.get("pachtVerlaengerungJahre"))
		if gesamt < 25:
			add("warnung", "pachtLaufzeitJahre", "rechtlich", "Pacht einschließlich Optionen unter 25 Jahren – unter der üblichen Betriebsdauer. Finanzierung und Restwert sind eingeschränkt.")
	if "gesichertPct" in db and _n(db.get("gesichertPct")) < 100 and phase >= _phase_idx("satzung"):
		add("warnung", "gesichertPct", "rechtlich", "Nicht alle Flächen gesichert – ab Baurecht sollten alle Flurstücke gesichert sein.")
	if _n(db.get("eigentuemerAnzahl")) > 10:
		add("info", "eigentuemerAnzahl", "rechtlich", "Viele Eigentümer – höherer Aufwand bei Dienstbarkeiten und Vertragsänderungen.")

	if _n(db.get("eegZuschlagCt")) > MARKT["erloese"]["eegBesondereCt"] + 1.5:
		add("warnung", "eegZuschlagCt", "kaufmaennisch", "Zuschlagswert ungewöhnlich hoch – Segment und Bescheid prüfen.")
	frist = db.get("eegRealisierungsfrist")
	if frist and not bestand:
		if frist < heute:
			add("fehler", "eegRealisierungsfrist", "kaufmaennisch", "Realisierungsfrist des Zuschlags ist abgelaufen – Pönale bzw. Erlöschen des Zuschlags prüfen.")
		elif cod and cod > frist[: len(cod)]:
			add("warnung", "eegRealisierungsfrist", "kaufmaennisch", "Geplante Inbetriebnahme liegt nach der Realisierungsfrist des Zuschlags.")
	if _n(db.get("ppaPreisCt")) and _n(db.get("ppaPreisCt")) > MARKT["erloese"]["ppaCt"]["max"] * 1.6:
		add("warnung", "ppaPreisCt", "kaufmaennisch", "PPA-Preis deutlich über Marktniveau – Struktur (z. B. Baseload) erläutern.")

	capex = _n(db.get("capexEurKwp"))
	if capex and pv:
		sp = MARKT["capex"]["agri" if p.get("typ") == "agri" else "carport" if p.get("typ") == "carport" else "freiflaeche"]
		if capex < sp["min"] * 0.75:
			add("warnung", "capexEurKwp", "kaufmaennisch", "Capex unter der Marktspanne – Umfang (Netz, Trafo, Zaun) prüfen.")
		elif capex > sp["max"] * 1.35:
			add("warnung", "capexEurKwp", "kaufmaennisch", "Capex über der Marktspanne.")
	opex = _n(db.get("opexEurKwp"))
	if opex and pv and (opex < 4 or opex > 25):
		add("warnung", "opexEurKwp", "kaufmaennisch", "Opex außerhalb der üblichen Spanne (rund 6–15 €/kWp·a ohne Pacht).")
	if "irrPct" in db and _n(db.get("irrPct")) > 14:
		add("warnung", "irrPct", "kaufmaennisch", "Angegebene Rendite ist für PV im DACH-Raum sehr hoch – Basis und Annahmen offenlegen.")

	vorher = None
	for fid, label in (("mAufstellung", "Aufstellungsbeschluss"), ("mBeteiligung", "frühzeitige Beteiligung"), ("mOffenlage", "Offenlage"), ("mSatzung", "Satzungsbeschluss"), ("mBaugenehmigung", "Baugenehmigung")):
		d = db.get(fid)
		if not d:
			continue
		if d > heute:
			add("warnung", fid, "genehmigung", f"{label} liegt in der Zukunft ({d}) – Meilensteine bitte nur mit erreichtem Datum eintragen.")
		if vorher and d < vorher[1]:
			add("fehler", fid, "genehmigung", f"{label} liegt vor „{vorher[0]}“ – Reihenfolge prüfen.")
		vorher = (label, d)
	if phase >= _phase_idx("satzung") and db.get("genehmigungsweg") == "bplan" and not db.get("mSatzung"):
		add("info", "mSatzung", "genehmigung", "Phase „Baurecht“ – Datum des Satzungsbeschlusses ergänzen.")
	if db.get("genehmigungsweg") == "par35" and p.get("land") == "DE" and p.get("typ") == "agri" and ha > MARKT["agriPrivilegierungHa"]:
		add("warnung", "genehmigungsweg", "genehmigung", "Privilegierung für Agri-PV nach § 35 Abs. 1 Nr. 9 BauGB nur bis 2,5 ha Grundfläche mit Hofbezug – in der Regel ist ein B-Plan nötig.")
	if db.get("genehmigungsweg") == "umwidmung_at" and p.get("land") != "AT":
		add("fehler", "genehmigungsweg", "genehmigung", "Umwidmung Grünland-PV gilt nur für Österreich.")
	if db.get("genehmigungsweg") in ("bplan", "par35") and p.get("land") and p.get("land") != "DE":
		add("fehler", "genehmigungsweg", "genehmigung", "B-Plan bzw. § 35 BauGB gelten nur für Deutschland.")

	if bestand:
		reihen = [z for z in (db.get("ertraege") or []) if _n(z.get("istMwh")) > 0 and _n(z.get("prognoseMwh")) > 0]
		if reihen:
			q = sum(_n(z["istMwh"]) for z in reihen) / sum(_n(z["prognoseMwh"]) for z in reihen)
			if q < 0.92:
				add("warnung", "ertraege", "ertrag", f"Ist-Erträge im Mittel {_js_round(q * 100)} % der Prognose – Ursachen (Verfügbarkeit, Abregelung, Degradation) erläutern.")
			elif q > 1.08:
				add("info", "ertraege", "ertrag", f"Ist-Erträge im Mittel {_js_round(q * 100)} % der Prognose – Prognosebasis prüfen (konservatives Gutachten?).")
		if "verfuegbarkeitPct" in db and _n(db.get("verfuegbarkeitPct")) < 97:
			add("warnung", "verfuegbarkeitPct", "technisch", "Verfügbarkeit unter 97 % – üblich sind ≥ 98–99 %. O&M-Leistung und Garantien prüfen.")
		if db.get("eegEnde") and db.get("pachtEnde") and db["pachtEnde"] < db["eegEnde"]:
			add("warnung", "pachtEnde", "rechtlich", "Pacht endet vor dem Förderende – Verlängerung sichern, sonst fehlen Förderjahre.")
		if db.get("wrTausch") == "offen" and db.get("codDatum") and int(db["codDatum"][:4]) <= int(heute[:4]) - 8:
			add("info", "wrTausch", "technisch", "Anlage älter als acht Jahre, Wechselrichtertausch noch nicht geplant – Rücklage einplanen.")
	return h


# ---------------------------------------------------------------- Due-Diligence-Index

DD_CHECKLISTE = {
	"rechtlich": ["pacht", "lageplan"], "netz": ["netzzusage"], "genehmigung": ["aufstellung", "satzung", "baugenehmigung"], "ertrag": ["ertrag"],
	"kaufmaennisch": ["eeg"], "umwelt": ["gutachten"], "technisch": ["betrieb"], "steuern": [],
}

DD_PRUEFPUNKTE = {
	"technisch": ["Anlagenkonzept und Komponenten (Bankability der Hersteller)", "DC/AC-Auslegung, Layout, Verschattung", "Bestand: Verfügbarkeit, O&M-Vertrag, Garantien, Wechselrichtertausch"],
	"rechtlich": ["Pacht-/Nutzungsverträge aller Flurstücke inkl. Laufzeit und Optionen", "Dingliche Sicherung (Dienstbarkeiten, Rang)", "Gesellschaftsrecht, Change-of-Control-Klauseln"],
	"netz": ["Netzzusage mit Leistung, NVP und Befristung", "Kostenvoranschlag, Baukostenzuschuss", "Einspeisebegrenzung, Überbauung, Redispatch"],
	"genehmigung": ["B-Plan/Widmung/Baugenehmigung und Bestandskraft", "Auflagen und Fristen", "FNP-Anpassung, Raumordnung"],
	"ertrag": ["Unabhängiges Ertragsgutachten P50/P90", "Datenbasis und Unsicherheiten", "Bestand: Ist-Erträge vs. Prognose"],
	"kaufmaennisch": ["Vermarktung (EEG-Zuschlag, PPA, Merchant)", "Capex/Opex-Annahmen, Pacht", "Finanzierbarkeit (DSCR auf P90)"],
	"steuern": ["Deal-Struktur (Asset/Share), Grunderwerbsteuer", "Umsatzsteuer (Geschäftsveräußerung im Ganzen)", "Gewerbesteuer-Zerlegung, Verlustvorträge"],
	"umwelt": ["UVP-Pflicht, Umweltbericht", "Artenschutz, CEF- und Ausgleichsmaßnahmen", "Schutzgebiete, Boden, Wasser"],
}


def dd_index(p, checkliste=None, jetzt=None):
	pruef = datenblatt_pruefen(p, jetzt)
	punkte = (checkliste or {}).get("punkte") or []
	kategorien = []
	for kat, meta in SCHEMA["dd"].items():
		felder = [f for f in FELDER if f.get("dd") == kat and feld_erwartet(p, f)]
		fehlend = [f for f in felder if not _gefuellt(feld_wert(p, f))]
		doks = [x for x in punkte if x["id"] in DD_CHECKLISTE[kat] and x.get("erwartet") and x.get("pflicht") is not False]
		doks_fehlend = [x for x in doks if not x.get("vorhanden")]
		hinweise = [x for x in pruef if x["dd"] == kat]
		erwartet = len(felder) + len(doks)
		erfuellt = erwartet - len(fehlend) - len(doks_fehlend)
		quote = int(_js_round(erfuellt / erwartet * 100)) if erwartet else None
		ampel = "grau"
		if erwartet or hinweise:
			if any(x["stufe"] == "fehler" for x in hinweise) or (quote is not None and quote < 50):
				ampel = "rot"
			elif any(x["stufe"] == "warnung" for x in hinweise) or (quote is not None and quote < 100):
				ampel = "gelb"
			else:
				ampel = "gruen"
		kategorien.append({
			"id": kat, "label": meta["label"], "text": meta["text"], "ampel": ampel, "quote": quote,
			"fehlend": [f["label"] for f in fehlend] + [f"Unterlage: {x['label']}" for x in doks_fehlend],
			"hinweise": [{"stufe": x["stufe"], "text": x["text"]} for x in hinweise],
			"pruefpunkte": DD_PRUEFPUNKTE[kat],
		})
	relevant = [k for k in kategorien if k["ampel"] != "grau"]
	gesamt = "grau"
	if relevant:
		gesamt = "rot" if any(k["ampel"] == "rot" for k in relevant) else "gelb" if any(k["ampel"] == "gelb" for k in relevant) else "gruen"
	return {
		"kategorien": kategorien, "gesamt": gesamt,
		"rot": sum(1 for k in kategorien if k["ampel"] == "rot"), "gelb": sum(1 for k in kategorien if k["ampel"] == "gelb"), "gruen": sum(1 for k in kategorien if k["ampel"] == "gruen"),
	}
