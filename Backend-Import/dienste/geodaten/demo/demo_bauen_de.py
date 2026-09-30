#!/usr/bin/env python3
# Demo-Datensatz DEUTSCHLAND (Unterallgäu/Schwaben, Raum Türkheim – Sitz der Muttergesellschaft) – nur Standardbibliothek.
#
#   python demo/demo_bauen_de.py <osm_netz.json> <osm_verkehr.json> <osm_orte.json> <osm_schutz.json> [ziel]
#
# Eingaben: Rohantworten der Overpass-Abfragen demo/overpass/{netz-schwaben,verkehr-unterallgaeu,orte-unterallgaeu,
# schutzgebiete-unterallgaeu}.overpassql (einmalig ausgeführt am 30.09.2026, siehe QUELLEN.md).
# Ausgaben (ziel, Standard: demo/):
#   netzknoten-schwaben.geojson           Umspannwerke Schwaben (power=substation), Trafostationen nur Raum Türkheim (OSM, ODbL)
#   verkehr-unterallgaeu.geojson          Autobahn A 96 und Schienenwege (OSM, ODbL) mit GESCHÄTZTER Gleiszahl (siehe unten)
#   orte-unterallgaeu.geojson             Siedlungspunkte (place=*), ODbL
#   schutzgebiete-unterallgaeu.geojson    Schutzgebiete aus OSM (nicht amtlich), ODbL
#   parzellen-demo-de.geojson             SYNTHETISCHE Flurstücke (DEMO) – keine echten Grundstücke, keine Eigentümer;
#                                         Gemarkungsnummern 99xx (nicht vergeben)
#
# Annahmen (dokumentiert in docs/AKQUISE-GEODATEN.md, Abschnitt 9):
#  - Schienenwege: railway=rail mit usage=main|branch (ohne Abstell-, Werks- und Rangiergleise: service=*).
#  - Gleiszahl: OSM-Tag „tracks“ fehlt in diesem Ausschnitt durchgehend. Ein Hauptbahn-Weg (usage=main) gilt als
#    ZWEIGLEISIG, wenn ein zweiter usage=main-Weg auf mindestens 60 % seiner Stützpunkte näher als 12 m verläuft
#    (in OSM werden Gleise einzeln erfasst). Im Betrieb: DB InfraGO Infrastrukturregister statt Schätzung.
#  - „Benachteiligtes Gebiet“ und „Moor“ sind in der Demo SYNTHETISCHE Merkmale der Flurstücke (Eigenschaft `kulisse`),
#    NICHT die amtliche Gebietskulisse. Im Betrieb kommen sie als Polygone aus der Kulisse des Landes bzw. der
#    Thünen-Kulisse organischer Böden (Import-Schritte `kulisse`, siehe README).
#
# Deterministisch (fester Zufalls-Seed).

import json
import math
import os
import random
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HIER))
sys.path.insert(0, HIER)
from geodaten.geometrie import distanz_m, flaeche_m2, punkt_in_polygon  # noqa: E402
from demo_bauen import KULTUREN_ACKER, KULTUREN_GRUEN, ODBL, knoten_art, lade, orte, r5, rechteck, schreibe, schutzgebiete, spannungen, versetzt  # noqa: E402

TRAFO_BBOX = (10.45, 47.98, 10.80, 48.16)  # Trafostationen nur im Kerngebiet (Datenmenge)
GEBIET = (10.40, 47.985, 10.90, 48.15)  # Platzierungsgebiet der Demo-Flurstücke


def landkreis(pt):
	# Grobe Zuordnung für die Demo (Wertach ≈ Grenze Unterallgäu/Ostallgäu, Lech ≈ Landsberg) – keine amtlichen Grenzen
	if pt[0] >= 10.80:
		return "Landsberg am Lech"
	if pt[0] >= 10.69:
		return "Ostallgäu"
	return "Unterallgäu"


# ------------------------------------------------------------------ Netzknoten (wie AT, andere Trafo-Box)


def netzknoten_de(roh):
	fs = []
	for e in roh["elements"]:
		t = e.get("tags", {})
		art = knoten_art(t)
		if not art:
			continue
		lat = e.get("lat") or (e.get("center") or {}).get("lat")
		lon = e.get("lon") or (e.get("center") or {}).get("lon")
		if lat is None:
			continue
		if art == "trafo" and not (TRAFO_BBOX[0] <= lon <= TRAFO_BBOX[2] and TRAFO_BBOX[1] <= lat <= TRAFO_BBOX[3]):
			continue
		v = spannungen(t.get("voltage"))
		fs.append({
			"type": "Feature",
			"id": f"osm-{e['type'][0]}{e['id']}",
			"geometry": {"type": "Point", "coordinates": [r5(lon), r5(lat)]},
			"properties": {"id": f"osm-{e['type'][0]}{e['id']}", "name": t.get("name") or t.get("ref") or "", "art": art, "spannungKv": [x // 1000 for x in v], "betreiber": t.get("operator", ""), "kapazitaet": "unbekannt", "quelle": "osm", "land": "DE"},
		})
	fs.sort(key=lambda f: ("uew", "uw110", "ms", "trafo").index(f["properties"]["art"]))
	return fs


# ------------------------------------------------------------------ Verkehr (A 96, Schienenwege)


def _proj(bezug):
	kx = math.cos(math.radians(bezug[1])) * 6371008.8 * math.pi / 180
	ky = 6371008.8 * math.pi / 180
	return lambda p: ((p[0] - bezug[0]) * kx, (p[1] - bezug[1]) * ky)


def abstand_punkt_linie(pt, linie):
	pr = _proj(pt)
	q = pr(pt)
	xy = [pr(p) for p in linie]
	best = float("inf")
	for (ax, ay), (bx, by) in zip(xy, xy[1:]):
		dx, dy = bx - ax, by - ay
		l2 = dx * dx + dy * dy
		t = max(0.0, min(1.0, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)) if l2 else 0.0
		best = min(best, math.hypot(q[0] - (ax + t * dx), q[1] - (ay + t * dy)))
	return best


def verkehr(roh):
	autobahn, schiene = [], []
	for e in roh["elements"]:
		if e.get("type") != "way" or not e.get("geometry"):
			continue
		t = e.get("tags", {})
		koord = [[r5(p["lon"]), r5(p["lat"])] for p in e["geometry"]]
		if t.get("highway") == "motorway":
			autobahn.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": koord}, "properties": {"id": f"osm-w{e['id']}", "art": "autobahn", "ref": t.get("ref", ""), "name": t.get("ref", "Autobahn"), "quelle": "osm"}})
		elif t.get("railway") == "rail" and t.get("usage") in ("main", "branch") and not t.get("service"):
			schiene.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": koord}, "properties": {"id": f"osm-w{e['id']}", "art": "schiene", "usage": t["usage"], "name": t.get("name") or ("Hauptbahn" if t["usage"] == "main" else "Nebenbahn"), "gleise": 1, "gleiseQuelle": "schaetzung", "quelle": "osm"}})
	# Gleiszahl schätzen: parallele Hauptbahn-Wege (≤ 12 m) → zweigleisig
	haupt = [f for f in schiene if f["properties"]["usage"] == "main"]
	for f in haupt:
		pts = f["geometry"]["coordinates"]
		for g in haupt:
			if g is f:
				continue
			nah = sum(1 for p in pts if abstand_punkt_linie(p, g["geometry"]["coordinates"]) <= 12)
			if nah >= max(2, 0.6 * len(pts)):
				f["properties"]["gleise"] = 2
				break
	return autobahn, schiene


# ------------------------------------------------------------------ Synthetische Flurstücke


def platz_frei(pt, orte_liste, schutz, erlaube_schutz):
	if not (GEBIET[0] <= pt[0] <= GEBIET[2] and GEBIET[1] <= pt[1] <= GEBIET[3]):
		return False
	for o in orte_liste:
		d = distanz_m(pt, o["geometry"]["coordinates"])
		mindest = {"city": 1600, "town": 1100, "suburb": 500, "village": 450, "hamlet": 150}[o["properties"]["typ"]]
		if d < mindest:
			return False
	if not erlaube_schutz:
		for s in schutz:
			if punkt_in_polygon(pt, s["geometry"]):
				return False
	return True


def punkt_an_linie(linien, rnd):
	"""Zufälliger Punkt auf einer der Linien + Richtung (rad) des Segments."""
	f = rnd.choice(linien)
	c = f["geometry"]["coordinates"]
	i = rnd.randrange(0, len(c) - 1)
	a, b = c[i], c[i + 1]
	t = rnd.random()
	p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
	pr = _proj(a)
	bx, by = pr(b)
	return p, math.atan2(by, bx)


def parzellen(orte_liste, schutz, autobahn, schiene):
	rnd = random.Random(20260930)
	haupt2 = [f for f in schiene if f["properties"]["gleise"] == 2] or [f for f in schiene if f["properties"]["usage"] == "main"]
	# (Typ, Anzahl, Abstand zur Linie in m, Kulisse)
	plan = [
		("a96_nah", 4, (40, 110), []),  # im 200-m-Streifen der A 96 → privilegiert + EEG-Randstreifen
		("a96_rand", 3, (260, 380), []),  # 200–500 m → nur EEG-Randstreifen
		("bahn", 2, (60, 160), []),  # an Hauptbahn
		("benachteiligt", 3, None, ["benachteiligt"]),
		("moor", 1, None, ["moor"]),
		("ohne", 2, None, []),  # keine Kulisse → nur Agri-PV oder PPA
	]
	bloecke = []
	for typ, anzahl, abstand, kulisse in plan:
		n = 0
		for _ in range(40000):
			if n >= anzahl:
				break
			if abstand:
				linien = autobahn if typ.startswith("a96") else haupt2
				p, w = punkt_an_linie(linien, rnd)
				d = rnd.uniform(*abstand) + 120  # Blockmitte: halbe Blocktiefe (~120 m) zusätzlich
				seite = rnd.choice((-1, 1))
				mitte = versetzt(p, -math.sin(w) * d * seite, math.cos(w) * d * seite)
			else:
				mitte, w = (rnd.uniform(GEBIET[0], GEBIET[2]), rnd.uniform(GEBIET[1], GEBIET[3])), rnd.uniform(0, math.pi)
				if min(abstand_punkt_linie(mitte, f["geometry"]["coordinates"]) for f in autobahn + schiene) < 900:
					continue
			if not platz_frei(mitte, orte_liste, schutz, False):
				continue
			if any(distanz_m(mitte, b[1]) < 1300 for b in bloecke):
				continue
			bloecke.append((typ, mitte, w, kulisse))
			n += 1
	# ein Block gezielt am FFH-/Naturschutzgebiet (Abwertung/Ausschluss vorführbar), falls vorhanden
	ffh = [s for s in schutz if s["properties"]["art"] in ("natura2000", "naturschutz")]
	if ffh:
		c = ffh[0]["geometry"]["coordinates"][0][0] if ffh[0]["geometry"]["type"] == "Polygon" else ffh[0]["geometry"]["coordinates"][0][0][0]
		bloecke.append(("schutz", tuple(c), 0.3, ["benachteiligt"]))

	fs = []
	nr = 0
	for bi, (typ, mitte, w, kulisse) in enumerate(bloecke):
		streifen = rnd.randint(3, 7)
		tiefe = rnd.uniform(200, 260) if typ.startswith(("a96", "bahn")) else rnd.uniform(220, 560)
		breiten = [rnd.uniform(50, 170) for _ in range(streifen)]
		x = -sum(breiten) / 2
		basis_neigung = rnd.uniform(0.5, 4.5)
		expos = rnd.choice(["S", "SO", "SW", "O", "W", "eben", "S"]) if basis_neigung > 1.5 else "eben"
		ort = min((o for o in orte_liste if o["properties"]["typ"] in ("village", "town", "city")), key=lambda o: distanz_m(mitte, o["geometry"]["coordinates"]))
		ortsname = ort["properties"]["name"]
		gem_nr = 9900 + bi + 1
		for si, b in enumerate(breiten):
			teile = 2 if rnd.random() < 0.3 else 1
			for ti in range(teile):
				y0 = -tiefe / 2 + ti * tiefe / teile
				g = rechteck(mitte, w, x, x + b, y0, y0 + tiefe / teile)
				nr += 1
				z = rnd.random()
				nutzung = "wald" if z < 0.05 else ("gruenland" if z < (0.55 if typ == "moor" else 0.3) else "acker")
				kultur = "Wald" if nutzung == "wald" else rnd.choice(KULTUREN_ACKER if nutzung == "acker" else KULTUREN_GRUEN)
				neigung = max(0.2, basis_neigung + rnd.uniform(-1, 1))
				fs.append({
					"type": "Feature",
					"id": f"DEMO-DE-{nr:03d}",
					"geometry": g,
					"properties": {
						"id": f"DEMO-DE-{nr:03d}", "demo": True,
						"kg": f"DEMO-Gemarkung {ortsname}", "kgNr": str(gem_nr),
						"gstNr": f"{rnd.randint(100, 2400)}/{rnd.randint(1, 9)}" if rnd.random() < 0.5 else str(rnd.randint(100, 2400)),
						"gemeinde": ortsname, "bezirk": landkreis(mitte), "bundesland": "Bayern", "land": "DE",
						"nutzung": nutzung, "kultur": kultur, "neigungGrad": round(neigung, 1), "exposition": expos if neigung > 1.5 else "eben",
						"flaecheM2": round(flaeche_m2(g)), "block": f"D{bi + 1:02d}", "kulisse": kulisse, "kulisseDemo": True,
					},
				})
			x += b
	# kleine Einzelflurstücke (< 2 ha) für den K.-o.-Fall
	for i in range(3):
		for _ in range(5000):
			pt = (rnd.uniform(GEBIET[0], GEBIET[2]), rnd.uniform(GEBIET[1], GEBIET[3]))
			if platz_frei(pt, orte_liste, schutz, False) and all(distanz_m(pt, b[1]) > 900 for b in bloecke):
				break
		g = rechteck(pt, rnd.uniform(0, math.pi), -40, 40, -rnd.uniform(60, 110), rnd.uniform(60, 110))
		nr += 1
		ort = min((o for o in orte_liste if o["properties"]["typ"] in ("village", "town", "city")), key=lambda o: distanz_m(pt, o["geometry"]["coordinates"]))
		fs.append({
			"type": "Feature",
			"id": f"DEMO-DE-{nr:03d}",
			"geometry": g,
			"properties": {
				"id": f"DEMO-DE-{nr:03d}", "demo": True, "kg": f"DEMO-Gemarkung {ort['properties']['name']}", "kgNr": str(9990 + i),
				"gstNr": str(rnd.randint(100, 2400)), "gemeinde": ort["properties"]["name"], "bezirk": landkreis(pt), "bundesland": "Bayern", "land": "DE",
				"nutzung": "acker", "kultur": rnd.choice(KULTUREN_ACKER), "neigungGrad": round(rnd.uniform(0.5, 3), 1), "exposition": "eben",
				"flaecheM2": round(flaeche_m2(g)), "block": f"DE{i + 1}", "kulisse": ["benachteiligt"], "kulisseDemo": True,
			},
		})
	return fs


def schutz_de(roh):
	fs = schutzgebiete(roh, roh)
	# FFH/SPA (protect_class 97/98) und Naturparke (5) sicher zuordnen
	art_je_id = {}
	for e in roh["elements"]:
		t = e.get("tags", {})
		pc = str(t.get("protect_class", ""))
		titel = str(t.get("protection_title", "")).lower()
		if pc in ("97", "98") or "habitat" in titel or "vogelschutz" in titel:
			art_je_id[f"osm-{e['type'][0]}{e['id']}"] = "natura2000"
		elif "naturpark" in titel:
			art_je_id[f"osm-{e['type'][0]}{e['id']}"] = "landschaftsschutz"
	for f in fs:
		if f["properties"]["id"] in art_je_id:
			f["properties"]["art"] = art_je_id[f["properties"]["id"]]
		f["properties"]["land"] = "DE"
	return fs


def main():
	if len(sys.argv) < 5:
		print(__doc__ or "Aufruf siehe Kopf der Datei")
		sys.exit(2)
	netz_roh, verkehr_roh, orte_roh, schutz_roh = (lade(p) for p in sys.argv[1:5])
	ziel = sys.argv[5] if len(sys.argv) > 5 else HIER
	os.makedirs(ziel, exist_ok=True)
	stand = lambda r: r.get("osm3s", {}).get("timestamp_osm_base", "")  # noqa: E731
	meta = {"quelle": "OpenStreetMap (Overpass API)", "lizenz": "ODbL-1.0", "attribution": ODBL}

	kn = netzknoten_de(netz_roh)
	ab, sch = verkehr(verkehr_roh)
	ot = orte(orte_roh)
	sg = schutz_de(schutz_roh)
	pz = parzellen(ot, sg, ab, sch)
	print("Demo-Datensatz Deutschland (Unterallgäu):")
	schreibe(os.path.join(ziel, "netzknoten-schwaben.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": stand(netz_roh), "inhalt": "Umspannwerke/Schaltwerke Schwaben (power=substation), Trafostationen nur Raum Türkheim/Buchloe"}, "features": kn})
	schreibe(os.path.join(ziel, "verkehr-unterallgaeu.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": stand(verkehr_roh), "inhalt": "Autobahn A 96 (highway=motorway) und Schienenwege (railway=rail, usage=main|branch). Gleiszahl GESCHÄTZT aus parallelen OSM-Gleisen (tracks-Tag fehlt)."}, "features": ab + sch})
	schreibe(os.path.join(ziel, "orte-unterallgaeu.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": stand(orte_roh), "inhalt": "Siedlungspunkte place=* mit Näherungsradius"}, "features": ot})
	schreibe(os.path.join(ziel, "schutzgebiete-unterallgaeu.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": stand(schutz_roh), "inhalt": "Schutzgebiete Unterallgäu aus OSM – nicht amtlich, im Betrieb BfN/LfU bzw. EEA Natura 2000"}, "features": sg})
	schreibe(os.path.join(ziel, "parzellen-demo-de.geojson"), {"type": "FeatureCollection", "metadata": {"quelle": "SYNTHETISCH – DEMO", "hinweis": "Frei erfundene Flurstücke im Raum Türkheim/Unterallgäu. Keine echten Grundstücke, keine Eigentümerdaten. Gemarkungsnummern 99xx sind nicht vergeben. Kulissen-Merkmale (benachteiligt, Moor) sind synthetisch.", "stand": "2026-09-30"}, "features": pz})


if __name__ == "__main__":
	main()
