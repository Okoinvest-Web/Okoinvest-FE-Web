#!/usr/bin/env python3
# Demo-Datensatz für das Akquise-Cockpit bauen (nur Standardbibliothek).
#
#   python demo/demo_bauen.py <osm_netz.json> <osm_schutz_wege.json> <osm_schutz_relationen.json> <osm_orte.json> [ziel]
#
# Eingaben: Rohantworten der Overpass-Abfragen in demo/overpass/*.overpassql (einmalig ausgeführt, siehe README).
# Ausgaben (ziel, Standard: demo/):
#   netzknoten-ooe-sbg.geojson       Umspannwerke/Schaltwerke OÖ + Salzburg, Trafostationen nur Innviertel (OSM, ODbL)
#   schutzgebiete-innviertel.geojson Schutzgebiete aus OSM (boundary=protected_area, leisure=nature_reserve), ODbL
#   orte-innviertel.geojson          Siedlungspunkte (place=town/village/hamlet/suburb), ODbL
#   parzellen-demo.geojson           SYNTHETISCHE Parzellen (DEMO) rund um Braunau/Innviertel – keine echten Grundstücke,
#                                    keine Eigentümerdaten; KG-Nummern beginnen mit 99 (nicht vergeben)
#
# Deterministisch (fester Zufalls-Seed) – erneutes Ausführen liefert dieselben Parzellen.

import json
import math
import os
import random
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HIER))
from geodaten.geometrie import distanz_m, flaeche_m2, punkt_in_polygon  # noqa: E402

ODBL = "© OpenStreetMap-Mitwirkende, Open Database License (ODbL) 1.0 – https://www.openstreetmap.org/copyright"
INNVIERTEL_BBOX = (12.70, 47.95, 13.70, 48.45)

# Platzierungsgebiet der Demo-Parzellen (Innviertel, OÖ; mit Abstand zu Salzach/Inn und zur Grenze nach Salzburg)
GEBIET = [(12.83, 48.03), (12.82, 48.07), (12.88, 48.16), (12.96, 48.215), (13.06, 48.232), (13.20, 48.255), (13.33, 48.29),
	(13.45, 48.275), (13.55, 48.20), (13.50, 48.08), (13.25, 48.045), (13.05, 48.035), (12.83, 48.03)]
GEBIET_GEO = {"type": "Polygon", "coordinates": [[list(p) for p in GEBIET]]}
BEZIRKE = [("Braunau am Inn", (13.0346, 48.2566)), ("Braunau am Inn", (13.15, 48.10)), ("Braunau am Inn", (12.93, 48.07)), ("Ried im Innkreis", (13.4886, 48.2107)), ("Ried im Innkreis", (13.40, 48.15))]
SIEDLUNG_RADIUS = {"city": 1500, "town": 700, "suburb": 300, "village": 250, "hamlet": 60}
SIEDLUNG_MINDEST = {"city": 1600, "town": 1100, "suburb": 500, "village": 420, "hamlet": 120}


def lade(p):
	with open(p, encoding="utf-8") as f:
		return json.load(f)


def schreibe(p, fc):
	with open(p, "w", encoding="utf-8") as f:
		json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
	print(f"  {os.path.basename(p)}: {len(fc['features'])} Objekte, {os.path.getsize(p) // 1024} KB")


def r5(x):
	return round(x, 5)


# ------------------------------------------------------------------ Netzknoten


def spannungen(tag):
	werte = []
	for t in str(tag or "").replace(",", ";").split(";"):
		try:
			werte.append(int(float(t.strip())))
		except ValueError:
			pass
	return sorted({w for w in werte if w > 0}, reverse=True)


def knoten_art(tags):
	sub = tags.get("substation", "")
	if tags.get("power") == "transformer":
		return "trafo" if sub == "minor_distribution" else None
	if sub in ("traction", "industrial", "generation", "converter", "compensation", "transition"):
		return None
	name = str(tags.get("name", ""))
	# Kraftwerks- und Bahnunterwerke sind keine Netzverknüpfungspunkte für Dritte
	if re.search(r"(^|\W)(KW|FHKW)(\W|$)|Kraftwerk|Unterwerk|Wasserkraft", name):
		return None
	v = spannungen(tags.get("voltage"))
	vmax = v[0] if v else 0
	if vmax >= 220000:
		return "uew"
	if vmax >= 110000:
		return "uw110"
	if sub == "minor_distribution":
		return "trafo"
	if sub == "transmission":
		return "uw110" if not vmax else "ms"
	if sub == "distribution" or vmax >= 10000:
		return "ms" if (sub == "distribution" or tags.get("name")) else "trafo"
	return "trafo"


def netzknoten(roh):
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
		if art == "trafo" and not (INNVIERTEL_BBOX[0] <= lon <= INNVIERTEL_BBOX[2] and INNVIERTEL_BBOX[1] <= lat <= INNVIERTEL_BBOX[3]):
			continue
		v = spannungen(t.get("voltage"))
		fs.append({
			"type": "Feature",
			"id": f"osm-{e['type'][0]}{e['id']}",
			"geometry": {"type": "Point", "coordinates": [r5(lon), r5(lat)]},
			"properties": {
				"id": f"osm-{e['type'][0]}{e['id']}",
				"name": t.get("name") or t.get("ref") or "",
				"art": art,
				"spannungKv": [x // 1000 for x in v],
				"betreiber": t.get("operator", ""),
				"kapazitaet": "unbekannt",
				"quelle": "osm",
			},
		})
	fs.sort(key=lambda f: ("uew", "uw110", "ms", "trafo").index(f["properties"]["art"]))
	return fs


# ------------------------------------------------------------------ Schutzgebiete


def schutz_art(t):
	titel = " ".join(str(t.get(k, "")) for k in ("protection_title", "name", "designation")).lower()
	pc = str(t.get("protect_class", ""))
	if "nationalpark" in titel or pc == "2":
		return "nationalpark"
	if "natura" in titel or "europaschutz" in titel or "vogelschutz" in titel or "ffh" in titel:
		return "natura2000"
	if pc == "12" or "wasserschutz" in titel or "quellschutz" in titel or "schongebiet" in titel:
		return "wasserschutz"
	if "landschaftsschutz" in titel or "landschaftschutz" in titel or pc == "5":
		return "landschaftsschutz"
	if "naturschutz" in titel or pc in ("1", "1a", "1b", "4") or t.get("leisure") == "nature_reserve":
		return "naturschutz"
	return "sonstig"


def ringe_verbinden(segmente):
	"""Wege einer Multipolygon-Relation zu geschlossenen Ringen zusammensetzen."""
	offen = [list(s) for s in segmente if len(s) >= 2]
	ringe = []
	while offen:
		ring = offen.pop(0)
		geaendert = True
		while ring[0] != ring[-1] and geaendert:
			geaendert = False
			for i, s in enumerate(offen):
				if s[0] == ring[-1]:
					ring += s[1:]
				elif s[-1] == ring[-1]:
					ring += list(reversed(s))[1:]
				elif s[-1] == ring[0]:
					ring = s[:-1] + ring
				elif s[0] == ring[0]:
					ring = list(reversed(s))[:-1] + ring
				else:
					continue
				offen.pop(i)
				geaendert = True
				break
		if ring[0] == ring[-1] and len(ring) >= 4:
			ringe.append(ring)
	return ringe


def schutzgebiete(wege, relationen):
	fs = []
	for e in wege["elements"]:
		if e["type"] != "way" or not e.get("geometry"):
			continue
		ring = [[r5(p["lon"]), r5(p["lat"])] for p in e["geometry"]]
		if ring[0] != ring[-1] or len(ring) < 4:
			continue
		fs.append((e, {"type": "Polygon", "coordinates": [ring]}))
	for e in relationen["elements"]:
		aussen = [[[r5(p["lon"]), r5(p["lat"])] for p in m["geometry"]] for m in e.get("members", []) if m.get("type") == "way" and m.get("role", "outer") in ("outer", "") and m.get("geometry")]
		innen = [[[r5(p["lon"]), r5(p["lat"])] for p in m["geometry"]] for m in e.get("members", []) if m.get("type") == "way" and m.get("role") == "inner" and m.get("geometry")]
		ra = ringe_verbinden(aussen)
		ri = ringe_verbinden(innen)
		if not ra:
			continue
		polys = [[r] + [i for i in ri if punkt_in_polygon(i[0], {"type": "Polygon", "coordinates": [r]})] for r in ra]
		fs.append((e, {"type": "MultiPolygon", "coordinates": polys} if len(polys) > 1 else {"type": "Polygon", "coordinates": polys[0]}))
	out = []
	for e, g in fs:
		t = e.get("tags", {})
		out.append({
			"type": "Feature",
			"id": f"osm-{e['type'][0]}{e['id']}",
			"geometry": g,
			"properties": {"id": f"osm-{e['type'][0]}{e['id']}", "name": t.get("name") or t.get("protection_title") or "Schutzgebiet", "art": schutz_art(t), "titel": t.get("protection_title", ""), "quelle": "osm"},
		})
	return out


# ------------------------------------------------------------------ Orte


def orte(roh):
	fs = []
	for e in roh["elements"]:
		t = e.get("tags", {})
		if t.get("place") not in SIEDLUNG_RADIUS or "lat" not in e:
			continue
		fs.append({
			"type": "Feature",
			"geometry": {"type": "Point", "coordinates": [r5(e["lon"]), r5(e["lat"])]},
			"properties": {"name": t.get("name", ""), "typ": t["place"], "radiusM": SIEDLUNG_RADIUS[t["place"]]},
		})
	return fs


# ------------------------------------------------------------------ Synthetische Parzellen

KULTUREN_ACKER = ["Winterweizen", "Wintergerste", "Silomais", "Körnermais", "Sojabohne", "Winterraps", "Sommergerste", "Kleegras"]
KULTUREN_GRUEN = ["Mähwiese/-weide zwei Nutzungen", "Mähwiese/-weide drei und mehr Nutzungen", "Dauerweide", "Einmähdige Wiese"]


def versetzt(p, dx, dy):
	"""Punkt (lon, lat) um dx/dy Meter verschieben."""
	kx = math.cos(math.radians(p[1])) * 6371008.8 * math.pi / 180
	ky = 6371008.8 * math.pi / 180
	return (p[0] + dx / kx, p[1] + dy / ky)


def rechteck(ursprung, winkel, x0, x1, y0, y1):
	c, s = math.cos(winkel), math.sin(winkel)
	pts = []
	for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)):
		q = versetzt(ursprung, x * c - y * s, x * s + y * c)
		pts.append([round(q[0], 6), round(q[1], 6)])
	return {"type": "Polygon", "coordinates": [pts]}


def naechster(pt, orte_liste, typen=None):
	best = None
	for o in orte_liste:
		if typen and o["properties"]["typ"] not in typen:
			continue
		d = distanz_m(pt, o["geometry"]["coordinates"])
		if best is None or d < best[0]:
			best = (d, o)
	return best


def platz_frei(pt, orte_liste, schutz, erlaube_schutz):
	if not punkt_in_polygon(pt, GEBIET_GEO):
		return False
	for o in orte_liste:
		d = distanz_m(pt, o["geometry"]["coordinates"])
		if d < SIEDLUNG_MINDEST[o["properties"]["typ"]] + (30 if o["properties"]["typ"] == "hamlet" else 250):
			return False
	if not erlaube_schutz:
		for s in schutz:
			if punkt_in_polygon(pt, s["geometry"]):
				return False
	return True


def parzellen(orte_liste, schutz, knoten):
	rnd = random.Random(20260930)
	uws = [k for k in knoten if k["properties"]["art"] in ("uw110", "uew")]
	bloecke = []
	versuche = 0
	# Ein paar Blöcke gezielt nahe bestehender 110-kV-Umspannwerke im Innviertel (realistische Top-Kandidaten),
	# die übrigen verteilt – teils weit weg, teils an Schutzgebieten (Abwertung sichtbar).
	anker = [u["geometry"]["coordinates"] for u in uws if punkt_in_polygon(u["geometry"]["coordinates"], {"type": "Polygon", "coordinates": [[[12.7, 47.95], [13.7, 47.95], [13.7, 48.45], [12.7, 48.45], [12.7, 47.95]]]})]
	while len(bloecke) < 30 and versuche < 20000:
		versuche += 1
		if anker and len(bloecke) < 10:
			a = anker[versuche % len(anker)]
			w = rnd.uniform(0, 2 * math.pi)
			d = rnd.uniform(900, 4500)
			pt = versetzt(a, math.cos(w) * d, math.sin(w) * d)
		else:
			pt = (rnd.uniform(12.82, 13.55), rnd.uniform(48.03, 48.29))
		erlaube_schutz = False
		if not platz_frei(pt, orte_liste, schutz, erlaube_schutz):
			continue
		if any(distanz_m(pt, b) < 1500 for b in bloecke):
			continue
		bloecke.append(pt)

	# Zwei Blöcke gezielt an Schutzgebieten (OSM), damit Abwertung/Ausschluss vorführbar ist – einer davon in Salzburg
	sonder = {len(bloecke): ("Oberösterreich", "Braunau am Inn"), len(bloecke) + 1: ("Salzburg", "Salzburg-Umgebung")}
	bloecke += [(13.150, 48.2845), (13.046, 48.0265)]
	fs = []
	nr = 0
	for bi, mitte in enumerate(bloecke):
		winkel = rnd.uniform(0, math.pi)
		streifen = rnd.randint(3, 8)
		laenge = rnd.uniform(220, 620)
		huegel = bi in (7, 23)
		basis_neigung = rnd.uniform(9, 17) if huegel else rnd.uniform(0.5, 5)
		expos = rnd.choice(["S", "SO", "SW", "O", "W", "eben", "N", "S", "SO"]) if basis_neigung > 1.5 else "eben"
		breiten = [rnd.uniform(45, 190) for _ in range(streifen)]
		x = -sum(breiten) / 2
		ort = naechster(mitte, orte_liste, ("village", "town", "city"))
		ortsname = ort[1]["properties"]["name"] if ort else "Innviertel"
		bundesland, bezirk = sonder.get(bi) or ("Oberösterreich", min(BEZIRKE, key=lambda b: distanz_m(mitte, b[1]))[0])
		kg_nr = 99000 + bi * 7 + 1
		for si, b in enumerate(breiten):
			teile = 2 if rnd.random() < 0.3 else 1
			for ti in range(teile):
				y0 = -laenge / 2 + ti * laenge / teile
				y1 = y0 + laenge / teile
				g = rechteck(mitte, winkel, x, x + b, y0, y1)
				nr += 1
				zufall = rnd.random()
				nutzung = "wald" if zufall < 0.07 else ("gruenland" if zufall < 0.38 else "acker")
				kultur = rnd.choice(KULTUREN_ACKER if nutzung == "acker" else KULTUREN_GRUEN) if nutzung != "wald" else "Wald"
				neigung = max(0.2, basis_neigung + rnd.uniform(-1.2, 1.2))
				fs.append({
					"type": "Feature",
					"id": f"DEMO-P-{nr:03d}",
					"geometry": g,
					"properties": {
						"id": f"DEMO-P-{nr:03d}",
						"demo": True,
						"kg": f"DEMO-KG {ortsname}",
						"kgNr": str(kg_nr),
						"gstNr": f"{rnd.randint(100, 2400)}/{rnd.randint(1, 9)}" if rnd.random() < 0.6 else str(rnd.randint(100, 2400)),
						"gemeinde": ortsname,
						"bezirk": bezirk,
						"bundesland": bundesland,
						"land": "AT",
						"nutzung": nutzung,
						"kultur": kultur,
						"neigungGrad": round(neigung, 1),
						"exposition": expos if neigung > 1.5 else "eben",
						"flaecheM2": round(flaeche_m2(g)),
						"block": f"B{bi + 1:02d}",
					},
				})
			x += b
	# einige kleine Einzelparzellen (< 2 ha) für den K.-o.-Fall
	for i in range(6):
		for _ in range(2000):
			pt = (rnd.uniform(12.85, 13.5), rnd.uniform(48.04, 48.27))
			if platz_frei(pt, orte_liste, schutz, False) and all(distanz_m(pt, b) > 900 for b in bloecke):
				break
		g = rechteck(pt, rnd.uniform(0, math.pi), -40, 40, -rnd.uniform(60, 110), rnd.uniform(60, 110))
		nr += 1
		ort = naechster(pt, orte_liste, ("village", "town", "city"))
		fs.append({
			"type": "Feature",
			"id": f"DEMO-P-{nr:03d}",
			"geometry": g,
			"properties": {
				"id": f"DEMO-P-{nr:03d}", "demo": True, "kg": f"DEMO-KG {ort[1]['properties']['name'] if ort else 'Innviertel'}", "kgNr": str(99900 + i),
				"gstNr": str(rnd.randint(100, 2400)), "gemeinde": ort[1]["properties"]["name"] if ort else "Innviertel",
				"bezirk": min(BEZIRKE, key=lambda b: distanz_m(pt, b[1]))[0], "bundesland": "Oberösterreich", "land": "AT",
				"nutzung": "acker", "kultur": rnd.choice(KULTUREN_ACKER), "neigungGrad": round(rnd.uniform(0.5, 4), 1), "exposition": "eben",
				"flaecheM2": round(flaeche_m2(g)), "block": f"E{i + 1}",
			},
		})
	return fs


def main():
	if len(sys.argv) < 5:
		print(__doc__ or "Aufruf siehe Kopf der Datei")
		sys.exit(2)
	netz_roh, schutz_wege, schutz_rel, orte_roh = (lade(p) for p in sys.argv[1:5])
	ziel = sys.argv[5] if len(sys.argv) > 5 else HIER
	os.makedirs(ziel, exist_ok=True)
	stand = netz_roh.get("osm3s", {}).get("timestamp_osm_base", "")
	meta = {"quelle": "OpenStreetMap (Overpass API)", "lizenz": "ODbL-1.0", "attribution": ODBL, "stand": stand}

	kn = netzknoten(netz_roh)
	sg = schutzgebiete(schutz_wege, schutz_rel)
	ot = orte(orte_roh)
	pz = parzellen(ot, sg, kn)
	print("Demo-Datensatz:")
	schreibe(os.path.join(ziel, "netzknoten-ooe-sbg.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "inhalt": "Umspannwerke/Schaltwerke OÖ + Salzburg (power=substation), Trafostationen nur Innviertel"}, "features": kn})
	schreibe(os.path.join(ziel, "schutzgebiete-innviertel.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": schutz_wege.get("osm3s", {}).get("timestamp_osm_base", stand), "inhalt": "Schutzgebiete Innviertel (boundary=protected_area, leisure=nature_reserve) – nicht amtlich, im Betrieb durch amtliche Daten ersetzen"}, "features": sg})
	schreibe(os.path.join(ziel, "orte-innviertel.geojson"), {"type": "FeatureCollection", "metadata": {**meta, "stand": orte_roh.get("osm3s", {}).get("timestamp_osm_base", ""), "inhalt": "Siedlungspunkte place=* mit Näherungsradius"}, "features": ot})
	schreibe(os.path.join(ziel, "parzellen-demo.geojson"), {"type": "FeatureCollection", "metadata": {"quelle": "SYNTHETISCH – DEMO", "hinweis": "Frei erfundene Parzellen rund um Braunau/Innviertel. Keine echten Grundstücke, keine Eigentümerdaten. KG-Nummern 99xxx sind nicht vergeben.", "stand": "2026-09-30"}, "features": pz})


if __name__ == "__main__":
	main()
