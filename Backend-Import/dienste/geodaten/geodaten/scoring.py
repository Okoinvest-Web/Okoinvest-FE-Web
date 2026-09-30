# Scoring-Engine der Flächenakquise – Python-Gegenstück zu src/lib/plattform/geodaten/scoring.js.
# Reine Funktionen ohne GIS-Bibliotheken (lokal mit `python -m unittest` testbar). Identische Regeln, Schwellen
# und Konstanten wie die JS-Fassung; tests/faelle.json enthält gemeinsame Testfälle mit den Ergebnissen der JS-Engine.
#
# Kriterien (Höchstpunkte): Größe 20 · Form 8 · Neigung/Exposition 12 · Nutzung 8 · Siedlungsabstand 8 ·
# Netz (Trassenlänge) 22 · Netzanschlusskosten 8 · Widmungslage 10 · Einstrahlung 4 = 100.
# Abzüge: Schutzgebiete, knappe Netzkapazität. K.-o.-Kriterien deckeln den Punktwert.

from .geometrie import distanz_m
from .netz import FREIFLAECHE, PACHT, ebene_fuer, jsround, netzkosten

SCORING_VERSION = "2026-09-30.1"

GEWICHTE = {"groesse": 20, "form": 8, "neigung": 12, "nutzung": 8, "siedlung": 8, "netz": 22, "kosten": 8, "widmung": 10, "einstrahlung": 4}
TRASSE = {"umwegFaktor": 1.25, "querungZuschlagM": 150, "suchradiusKm": 25}
SCHWELLEN = {"mindestHa": 2, "idealHa": (5, 50), "maxNeigungGrad": 15, "siedlungAbstandM": (100, 300), "ampel": {"gruen": 65, "gelb": 45}}

SCHUTZ_ARTEN = {
	"nationalpark": {"label": "Nationalpark", "kern": True, "abzugNah": 6},
	"natura2000": {"label": "Natura 2000 / Europaschutzgebiet", "kern": True, "abzugNah": 6},
	"naturschutz": {"label": "Naturschutzgebiet", "kern": True, "abzugNah": 5},
	"wasserschutz": {"label": "Wasserschutz-/Schongebiet", "kern": False, "abzug": 10, "abzugNah": 0},
	"landschaftsschutz": {"label": "Landschaftsschutzgebiet", "kern": False, "abzug": 8, "abzugNah": 2},
	"sonstig": {"label": "sonstiges Schutzgebiet", "kern": False, "abzug": 5, "abzugNah": 0},
}

KNOTEN_ARTEN = {
	"uew": "UW 380/220 kV",
	"uw110": "UW 110 kV",
	"ms": "UW MS",
	"trafo": "Trafostation",
}
KNOTEN_FUER_EBENE = {"msLeitung": ("trafo", "ms", "uw110"), "uwMs": ("uw110",), "hs": ("uw110", "uew")}

ERTRAG = {
	"Burgenland": 1210, "Kärnten": 1240, "Niederösterreich": 1190, "Oberösterreich": 1130, "Salzburg": 1140, "Steiermark": 1220,
	"Tirol": 1370, "Vorarlberg": 1130, "Wien": 1190, "_AT": 1120, "_DE": 1020, "_CH": 1050,
}

WIDMUNG = {
	"Oberösterreich": {"art": "uw_radius", "zoneKm": 5, "angrenzendKm": 7.5, "text": "Kriterienkatalog PV-FFA: energiewirtschaftliche Priorität 1 (≤ 5 km zum Umspannwerk) bzw. 2 (≤ 7,5 km); Bodenfruchtbarkeit Stufe 4–5 im Einzelfall prüfen (DORIS)."},
	"Niederösterreich": {"art": "zonen", "angrenzendM": 200, "maxHaAusserhalb": 2, "text": "SekRop PV: 116 Zonen (je Zone 5 ha, mit Ökologiekonzept 10 ha); außerhalb höchstens 2 ha, Zusammenrechnung im 200-m-Umkreis."},
	"Burgenland": {"art": "zonen", "angrenzendM": 0, "maxHaAusserhalb": 0, "text": "Freiflächen-PV nur in Eignungszonen (Bgld. RPG 2019 § 22d); unter 10 ha zusätzlich Widmung nötig."},
	"Steiermark": {"art": "zonen", "angrenzendM": 500, "text": "SAPRO Solarenergie: 36 Vorrangzonen (> 10 ha); außerhalb Sondernutzung im Freiland über die Gemeinde, Ausschlusszonen beachten."},
	"Salzburg": {"art": "einzelfall", "text": "Kennzeichnung nach § 39b ROG 2009 über 200 m² mit Punktesystem der PV-Kennzeichnungsverordnung 2023 (je Bodenkategorie 20–40 Punkte)."},
	"Kärnten": {"art": "einzelfall", "maxHa": 4, "text": "Widmung „Grünland – Photovoltaikanlage“, zusammenhängend max. 4 ha, 1.000 m Abstand zwischen Widmungsflächen (K-PhV 2024)."},
	"Tirol": {"art": "einzelfall", "text": "Sonderfläche bis 250 kWp, darüber Bewilligung nach TEG – Einzelfall."},
	"Vorarlberg": {"art": "einzelfall", "text": "Sondergebiet in der Freifläche; Landesgrünzone Rheintal/Walgau beachten."},
	"Wien": {"art": "einzelfall", "text": "Vorbelastete Flächen bevorzugt; Grünland-Schutzgebiet beachten."},
}

SUED = ("S", "SO", "SW", "eben")


def r1(x):
	return jsround(x * 10) / 10


def clamp(x, a=0.0, b=1.0):
	return max(a, min(b, x))


def mwp_fuer(ha):
	return r1((float(ha or 0)) / FREIFLAECHE["haProMwp"])


def trasse_m(luftlinie_m, querungen=0):
	return jsround(luftlinie_m * TRASSE["umwegFaktor"] + max(0, querungen) * TRASSE["querungZuschlagM"])


def bester_knoten(punkt, mwp, knoten, querungen=None):
	"""Bester Netzknoten nach geschätzten Anschlusskosten im Suchradius (wie besterKnoten in scoring.js).
	punkt = (lon, lat); knoten = [{id, name, art, spannungKv, kapazitaet, lon, lat}]; querungen(k) -> int."""
	ebene = ebene_fuer(mwp)
	arten = KNOTEN_FUER_EBENE[ebene]
	best = None
	for k in knoten:
		if k.get("art") not in arten:
			continue
		luft = distanz_m(punkt, (k["lon"], k["lat"]))
		if luft > TRASSE["suchradiusKm"] * 1000:
			continue
		tr = trasse_m(luft, querungen(k) if querungen else 0)
		kosten = netzkosten(mwp, tr / 1000, "msLeitung" if k["art"] in ("trafo", "ms") else ebene, k.get("kapazitaet") or "unbekannt")
		wert = kosten["summe"] * (1.5 if k.get("kapazitaet") == "knapp" else 1)
		if best is None or wert < best["_wert"] or (wert == best["_wert"] and luft < best["luftlinieM"]):
			best = {"knoten": k, "luftlinieM": jsround(luft), "trasseM": tr, "kosten": kosten, "ebene": kosten["ebene"], "_wert": wert}
	if best:
		best.pop("_wert")
	return best


def naechster_knoten(punkt, knoten, arten=("uw110", "uew")):
	best = None
	for k in knoten:
		if k.get("art") not in arten:
			continue
		d = distanz_m(punkt, (k["lon"], k["lat"]))
		if best is None or d < best["luftlinieM"]:
			best = {"knoten": k, "luftlinieM": jsround(d)}
	return best


def _km(x):
	return str(x).replace(".", ",")


def widmungslage(bundesland=None, uw_abstand_km=None, zone_abstand_m=None):
	regel = WIDMUNG.get(bundesland)
	if not regel:
		return {"status": "unklar", "text": "Keine Widmungsregel hinterlegt – Einzelfallprüfung.", "regel": None}
	if regel["art"] == "uw_radius":
		if uw_abstand_km is None:
			return {"status": "unklar", "text": regel["text"], "regel": regel}
		if uw_abstand_km <= regel["zoneKm"]:
			return {"status": "zone", "text": f"Priorität 1 (≤ {regel['zoneKm']} km zum Umspannwerk). {regel['text']}", "regel": regel}
		if uw_abstand_km <= regel["angrenzendKm"]:
			return {"status": "angrenzend", "text": f"Priorität 2 (≤ {_km(regel['angrenzendKm'])} km zum Umspannwerk). {regel['text']}", "regel": regel}
		return {"status": "ausserhalb", "text": f"Außerhalb der Prioritätsradien. {regel['text']}", "regel": regel}
	if regel["art"] == "zonen":
		if zone_abstand_m is None:
			return {"status": "unklar", "text": f"Zonendaten nicht geladen. {regel['text']}", "regel": regel}
		if zone_abstand_m <= 0:
			return {"status": "zone", "text": f"Innerhalb einer verordneten Zone. {regel['text']}", "regel": regel}
		if regel.get("angrenzendM") and zone_abstand_m <= regel["angrenzendM"]:
			return {"status": "angrenzend", "text": f"Angrenzend an eine Zone ({jsround(zone_abstand_m)} m). {regel['text']}", "regel": regel}
		return {"status": "ausserhalb", "text": f"Außerhalb der Zonen. {regel['text']}", "regel": regel}
	return {"status": "unklar", "text": regel["text"], "regel": regel}


def bewerte(m):
	"""Punktwert einer Kandidatenfläche – Eingabe/Ausgabe wie bewerte() in scoring.js (Texte ohne Zahlformatierung)."""
	k = []
	ko = []

	def add(id_, label, punkte, maximum, text, art=None):
		if art is None:
			art = "plus" if punkte >= maximum * 0.66 else ("neutral" if punkte > 0 else "minus")
		k.append({"id": id_, "label": label, "punkte": r1(punkte), "max": maximum, "text": text, "art": art})

	ha = float(m.get("ha") or 0)
	mwp = mwp_fuer(ha)

	# Größe
	if ha < SCHWELLEN["mindestHa"]:
		pg = 0
		ko.append({"id": "groesse", "text": f"Unter {SCHWELLEN['mindestHa']} ha – für Freiflächen-PV meist unwirtschaftlich.", "deckel": 25})
	elif ha < 3:
		pg = 6
	elif ha < SCHWELLEN["idealHa"][0]:
		pg = 6 + ((ha - 3) / 2) * 8
	elif ha <= SCHWELLEN["idealHa"][1]:
		pg = 20
	else:
		pg = 16
	add("groesse", "Größe", pg, GEWICHTE["groesse"], f"{r1(ha)} ha")

	# Form
	kp = clamp(float(m.get("kompaktheit") or 0))
	add("form", "Form/Kompaktheit", clamp((kp - 0.45) / 0.45) * GEWICHTE["form"], GEWICHTE["form"], "kompakt" if kp >= 0.85 else ("brauchbar" if kp >= 0.65 else "zerklüftet/schmal"))

	# Neigung/Exposition
	n = max(0.0, float(m.get("neigungGrad") or 0))
	exp = m.get("exposition") or "eben"
	sued = exp in SUED or n <= 2
	if n <= 3:
		pn = 12
	elif n <= 7:
		pn = 10 if sued else 6
	elif n <= 12:
		pn = 6 if sued else 1
	else:
		pn = 2 if sued else 0
	if n > SCHWELLEN["maxNeigungGrad"]:
		ko.append({"id": "neigung", "text": f"Mittlere Neigung {r1(n)}° – zu steil.", "deckel": 20})
	add("neigung", "Neigung/Exposition", pn, GEWICHTE["neigung"], f"{r1(n)}°, {exp}")

	# Nutzung
	nu = m.get("nutzung") or {}
	acker, gruen, sonst = float(nu.get("acker") or 0), float(nu.get("gruenland") or 0), float(nu.get("sonstige") or 0)
	summe = (acker + gruen + sonst) or 1
	add("nutzung", "Nutzung", (acker * 8 + gruen * 7 + sonst * 3) / summe, GEWICHTE["nutzung"], "Acker" if acker >= gruen else "Grünland")

	# Schutzgebiete
	for s in m.get("schutz") or []:
		d = SCHUTZ_ARTEN.get(s.get("art")) or SCHUTZ_ARTEN["sonstig"]
		anteil = clamp(float(s.get("anteil") or 0))
		abstand = s.get("abstandM")
		abstand = float("inf") if abstand is None else float(abstand)
		if anteil > 0.05 and d["kern"]:
			ko.append({"id": f"schutz_{s.get('art')}", "text": f"{jsround(anteil * 100)} % im {d['label']} – in der Regel ausgeschlossen.", "deckel": 15})
			add(f"schutz_{s.get('art')}", d["label"], -10, 0, f"überdeckt {jsround(anteil * 100)} %", "ko")
		elif anteil > 0.05:
			add(f"schutz_{s.get('art')}", d["label"], -d["abzug"] * min(1, anteil * 2), 0, f"überdeckt {jsround(anteil * 100)} %", "minus")
		elif abstand <= 200 and d.get("abzugNah"):
			add(f"schutz_{s.get('art')}", f"Nähe {d['label']}", -d["abzugNah"], 0, f"{jsround(abstand)} m entfernt", "minus")

	# Siedlungsabstand
	sa = m.get("siedlungAbstandM")
	s_min, s_voll = SCHWELLEN["siedlungAbstandM"]
	if sa is None:
		ps = 4
	else:
		sa = float(sa)
		ps = 0 if sa < s_min else (8 if sa >= s_voll else 4 + ((sa - s_min) / (s_voll - s_min)) * 4)
	add("siedlung", "Abstand Siedlung", ps, GEWICHTE["siedlung"], "unbekannt" if sa is None else f"{jsround(sa)} m")

	# Netz
	netz = m.get("netz")
	if netz:
		km = netz["trasseM"] / 1000
		if km <= 1:
			p = 22
		elif km <= 3:
			p = 22 - ((km - 1) / 2) * 4
		elif km <= 5:
			p = 18 - ((km - 3) / 2) * 5
		elif km <= 8:
			p = 13 - ((km - 5) / 3) * 6
		elif km <= 12:
			p = 7 - ((km - 8) / 4) * 4
		else:
			p = max(0, 3 - (km - 12) / 4)
		kn = netz.get("knoten") or {}
		add("netz", "Netzanschluss (Trasse)", p, GEWICHTE["netz"], f"{r1(km)} km Trasse")
		if kn.get("kapazitaet") == "knapp":
			add("kapazitaet", "Netzkapazität", -8, 0, "knapp", "minus")
		elif kn.get("kapazitaet") == "frei":
			add("kapazitaet", "Netzkapazität", 3, 0, "frei", "plus")
		anteil = (netz.get("kosten") or {}).get("anteil", 1)
		if anteil < 0.08:
			pk = 8
		elif anteil < 0.15:
			pk = 8 - ((anteil - 0.08) / 0.07) * 3
		elif anteil < 0.25:
			pk = 5 - ((anteil - 0.15) / 0.1) * 3
		else:
			pk = max(0, 2 - (anteil - 0.25) * 10)
		add("kosten", "Netzanschlusskosten", pk, GEWICHTE["kosten"], f"{jsround(anteil * 100)} % der Anlagenkosten")
	else:
		add("netz", "Netzanschluss (Trasse)", 0, GEWICHTE["netz"], "kein Netzknoten im Suchradius", "minus")
		add("kosten", "Netzanschlusskosten", 0, GEWICHTE["kosten"], "nicht bestimmbar", "minus")

	# Widmung
	w = m.get("widmung") or {"status": "unklar"}
	pw = {"zone": 10, "angrenzend": 6, "unklar": 4, "ausserhalb": 2}.get(w.get("status"), 4)
	add("widmung", "Widmungslage", pw, GEWICHTE["widmung"], w.get("status") or "unklar")
	regel = w.get("regel") or WIDMUNG.get(m.get("bundesland"))
	if regel and "maxHaAusserhalb" in regel and w.get("status") != "zone" and ha > regel["maxHaAusserhalb"]:
		ko.append({"id": "widmung", "text": "Außerhalb der Zonen nur eingeschränkt widmungsfähig.", "deckel": 45 if regel["maxHaAusserhalb"] > 0 else 20})
	if regel and regel.get("maxHa") and ha > regel["maxHa"]:
		add("widmung_max", "Widmungsgrenze", -3, 0, f"max. {regel['maxHa']} ha je Widmung", "minus")

	# Einstrahlung
	ertrag = ERTRAG.get(m.get("bundesland")) or ERTRAG.get(f"_{m.get('land') or 'AT'}") or ERTRAG["_AT"]
	add("einstrahlung", "Einstrahlung", clamp((ertrag - 1000) / 200) * GEWICHTE["einstrahlung"], GEWICHTE["einstrahlung"], f"{ertrag} kWh/kWp")

	score = sum(x["punkte"] for x in k)
	score = max(0, min(100, score))
	for x in ko:
		score = min(score, x["deckel"])
	score = jsround(score)
	ampel = "gruen" if score >= SCHWELLEN["ampel"]["gruen"] else ("gelb" if score >= SCHWELLEN["ampel"]["gelb"] else "rot")
	return {"score": score, "ampel": ampel, "ko": ko, "kriterien": k, "mwp": mwp, "ertragKwhProKwp": ertrag}


def kennzahlen(ha, ertrag_kwh_pro_kwp=ERTRAG["_AT"], agri=False):
	mwp = mwp_fuer(ha)
	p = PACHT["agriProHa"] if agri else PACHT["freiflaecheProHa"]
	return {
		"mwp": mwp,
		"ertragMwh": jsround(mwp * ertrag_kwh_pro_kwp),
		"pachtJahr": {"min": jsround(ha * p["min"]), "mittel": jsround(ha * p["mittel"]), "max": jsround(ha * p["max"])},
		"capex": {"min": jsround(mwp * 1000 * FREIFLAECHE["capexProKwp"]["min"]), "max": jsround(mwp * 1000 * FREIFLAECHE["capexProKwp"]["max"])},
	}


def prioritaet(score, ha):
	if score >= 65 and float(ha or 0) >= 5:
		return "A"
	if score >= 45:
		return "B"
	return "C"
