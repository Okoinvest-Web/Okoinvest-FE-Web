# Ableitungen nach dem Import: Parzellen-Nutzung aus INVEKOS, Kandidaten-Verbünde (ST_ClusterDBSCAN), Merkmale je
# Verbund (Schutzgebiete, Siedlungsabstand, Netzknoten mit Querungen, Widmungszonen) und Scoring mit scoring.py.
# Läuft je Bezirk (begrenzter Speicherbedarf); ein Bezirk ist in sich idempotent (DELETE + INSERT in einer Transaktion).

import json

from .geometrie import kompaktheit
from .scoring import SCORING_VERSION, bester_knoten, bewerte, kennzahlen, mwp_fuer, naechster_knoten, prioritaet, widmungslage
from .netz import jsround, netzkosten

GEEIGNET = ("acker", "gruenland")
NACHBAR_M = 3
ZONEN_ARTEN = ("noe_pv_zone", "bgld_eignungszone", "stmk_sapro_vorrang")


def nutzung_ableiten(conn, bezirk=None):
	"""Nutzung je Parzelle aus dem INVEKOS-Schlag mit der größten Überdeckung, sonst aus der DKM-Nutzung."""
	filt = "AND p.bezirk = %(b)s" if bezirk else ""
	conn.execute(f"""WITH x AS (
		  SELECT DISTINCT ON (p.id) p.id, s.nutzung_gruppe, s.nutzung
		  FROM geo.parzelle p JOIN geo.schlag s ON ST_Intersects(p.geom, s.geom)
		  WHERE NOT p.demo {filt}
		  ORDER BY p.id, ST_Area(ST_Intersection(p.geom, s.geom)) DESC)
		UPDATE geo.parzelle p SET nutzung = CASE WHEN x.nutzung_gruppe IN ('acker','gruenland') THEN x.nutzung_gruppe ELSE 'sonstige' END, kultur = x.nutzung
		FROM x WHERE x.id = p.id""", {"b": bezirk})
	conn.execute(f"""UPDATE geo.parzelle p SET nutzung = CASE
		  WHEN p.nutzung_dkm ~* 'wald|forst' THEN 'wald' WHEN p.nutzung_dkm ~* 'gewässer|gewaesser|fluss|see' THEN 'gewaesser'
		  WHEN p.nutzung_dkm ~* 'bau|verkehr|straße|strasse|gebäude|gebaeude' THEN 'bau' ELSE 'sonstige' END
		WHERE p.nutzung IS NULL AND NOT p.demo {filt}""", {"b": bezirk})
	conn.commit()


def _knoten(conn, geom_wkb_hex, arten, radius=25000, limit=30):
	return conn.execute(
		"""SELECT n.id, n.name, n.art, n.spannung_kv, n.betreiber, COALESCE(k.kapazitaet, 'unbekannt'), k.frei_mw,
		          ST_X(ST_Transform(n.geom, 4326)), ST_Y(ST_Transform(n.geom, 4326)),
		          (SELECT count(*) FROM geo.querung_linie q WHERE ST_Intersects(q.geom, ST_MakeLine(%(p)s::geometry, n.geom)))
		   FROM geo.netzknoten n LEFT JOIN geo.netzkapazitaet k ON k.knoten_id = n.id
		   WHERE n.art = ANY(%(arten)s) AND ST_DWithin(n.geom, %(p)s::geometry, %(r)s)
		   ORDER BY n.geom <-> %(p)s::geometry LIMIT %(l)s""",
		{"p": geom_wkb_hex, "arten": list(arten), "r": radius, "l": limit},
	).fetchall()


def kandidaten_bezirk(conn, bezirk):
	"""Kandidaten eines Bezirks neu berechnen. Liefert Anzahl."""
	verbuende = conn.execute(
		"""WITH c AS (
		     SELECT id, ST_ClusterDBSCAN(geom, eps := %(eps)s, minpoints := 1) OVER () AS cl
		     FROM geo.parzelle WHERE bezirk = %(b)s AND nutzung = ANY(%(g)s) AND flaeche_m2 >= 200)
		   SELECT cl, array_agg(id ORDER BY id) FROM c GROUP BY cl""",
		{"b": bezirk, "g": list(GEEIGNET), "eps": NACHBAR_M},
	).fetchall()
	zeilen = []
	for _, ids in verbuende:
		teile = conn.execute(
			"""SELECT id, kg_nr, kg_name, gst_nr, flaeche_m2, nutzung, COALESCE(kultur,''), COALESCE(neigung_grad, 0), COALESCE(exposition, 'eben'),
			          bundesland, bezirk, gemeinde, land, demo, ST_AsGeoJSON(ST_Transform(geom, 4326), 6)
			   FROM geo.parzelle WHERE id = ANY(%s) ORDER BY id""", (ids,)).fetchall()
		m2 = sum(t[4] for t in teile)
		ha = jsround(m2 / 100) / 100
		g = conn.execute("SELECT ST_Multi(ST_Union(geom)), ST_PointOnSurface(ST_Union(geom)) FROM geo.parzelle WHERE id = ANY(%s)", (ids,)).fetchone()
		geom, sp = g[0], g[1]
		sp_ll = conn.execute("SELECT ST_X(ST_Transform(%(p)s::geometry, 4326)), ST_Y(ST_Transform(%(p)s::geometry, 4326))", {"p": sp}).fetchone()

		def mehrheit(idx):
			z = {}
			for t in teile:
				z[t[idx]] = z.get(t[idx], 0) + t[4]
			return max(z.items(), key=lambda x: x[1])[0] if z else ""

		nutzung = {"acker": 0.0, "gruenland": 0.0, "sonstige": 0.0}
		for t in teile:
			nutzung[t[5] if t[5] in nutzung else "sonstige"] += t[4] / 10000
		schutz = [
			{"id": r[0], "name": r[1], "art": r[2], "anteil": round(float(r[3]), 2), "abstandM": jsround(float(r[4]))}
			for r in conn.execute(
				"""SELECT s.id, s.name, s.art, ST_Area(ST_Intersection(s.geom, %(g)s::geometry)) / NULLIF(ST_Area(%(g)s::geometry), 0), ST_Distance(s.geom, %(g)s::geometry)
				   FROM geo.schutzgebiet s WHERE ST_DWithin(s.geom, %(g)s::geometry, 300)""", {"g": geom}).fetchall()
		]
		sd = conn.execute(
			"""SELECT name, art, ST_Distance(geom, %(g)s::geometry) d FROM (
			     SELECT name, art, geom FROM geo.siedlung ORDER BY geom <-> %(g)s::geometry LIMIT 12) x ORDER BY d LIMIT 1""", {"g": geom}).fetchone()
		siedlung = {"name": sd[0] or "", "typ": sd[1], "abstandM": jsround(float(sd[2]))} if sd else None
		bundesland = mehrheit(9)
		land = mehrheit(12) or "AT"
		mwp = mwp_fuer(ha)
		kn_zeilen = _knoten(conn, sp, ("uew", "uw110", "ms", "trafo"))
		knoten = [{"id": r[0], "name": r[1] or "", "art": r[2], "spannungKv": r[3] or [], "betreiber": r[4] or "", "kapazitaet": r[5], "freiMw": r[6], "lon": r[7], "lat": r[8], "querungen": r[9]} for r in kn_zeilen]
		uw_zeilen = _knoten(conn, sp, ("uew", "uw110"), radius=60000, limit=3)
		uws = [{"id": r[0], "name": r[1] or "", "art": r[2], "spannungKv": r[3] or [], "kapazitaet": r[5], "lon": r[7], "lat": r[8]} for r in uw_zeilen]
		netz = bester_knoten(sp_ll, mwp, knoten, querungen=lambda k: k.get("querungen", 0))
		uw = naechster_knoten(sp_ll, uws)
		zone = conn.execute(
			"""SELECT min(CASE WHEN ST_Area(ST_Intersection(z.geom, %(g)s::geometry)) > 0.5 * ST_Area(%(g)s::geometry) THEN 0 ELSE ST_Distance(z.geom, %(g)s::geometry) END), count(*)
			   FROM geo.widmungszone z WHERE z.bundesland = %(bl)s AND z.art = ANY(%(a)s) AND ST_DWithin(z.geom, %(g)s::geometry, 5000)""",
			{"g": geom, "bl": bundesland, "a": list(ZONEN_ARTEN)}).fetchone()
		hat_zonen = conn.execute("SELECT EXISTS (SELECT 1 FROM geo.widmungszone WHERE bundesland = %s AND art = ANY(%s))", (bundesland, list(ZONEN_ARTEN))).fetchone()[0]
		zone_abstand = (float(zone[0]) if zone[1] else 1e9) if hat_zonen else None
		widmung = widmungslage(bundesland, uw["luftlinieM"] / 1000 if uw else None, zone_abstand)
		parz_geos = [json.loads(t[14]) for t in teile]
		m = {
			"ha": ha, "kompaktheit": kompaktheit(parz_geos, m2), "neigungGrad": jsround(sum(t[7] * t[4] for t in teile) / m2 * 10) / 10,
			"exposition": mehrheit(8), "nutzung": nutzung, "schutz": schutz, "siedlungAbstandM": siedlung["abstandM"] if siedlung else None,
			"netz": netz, "widmung": widmung, "bundesland": bundesland, "land": land,
		}
		b = bewerte(m)
		kz = kennzahlen(ha, b["ertragKwhProKwp"])
		netz_json = None
		if netz:
			k = netz["knoten"]
			netz_json = {"knoten": {x: k.get(x) for x in ("id", "name", "art", "spannungKv", "betreiber", "kapazitaet", "freiMw", "lon", "lat")}, "luftlinieM": netz["luftlinieM"], "trasseM": netz["trasseM"],
				"querungen": k.get("querungen", 0), "ebene": netz["ebene"], "kosten": netz["kosten"],
				"kapazitaetAmpel": {"frei": "gruen", "knapp": "rot"}.get(k.get("kapazitaet"), "gelb")}
		uw_json = None
		if uw:
			u = uw["knoten"]
			uw_json = {**{x: u.get(x) for x in ("id", "name", "art", "spannungKv", "lon", "lat")}, "luftlinieM": uw["luftlinieM"], "kosten": netzkosten(mwp, uw["luftlinieM"] * 1.25 / 1000, "auto", u.get("kapazitaet") or "unbekannt")}
		zeilen.append({
			"id": f"K-{ids[0]}", "parzellen": ids, "ha": ha, "kompaktheit": m["kompaktheit"], "neigung": m["neigungGrad"], "exposition": m["exposition"],
			"nutzung": json.dumps({k2: round(v, 2) for k2, v in nutzung.items()}), "bundesland": bundesland, "bezirk": mehrheit(10), "gemeinde": mehrheit(11), "land": land,
			"siedlung": json.dumps(siedlung), "schutz": json.dumps(schutz, ensure_ascii=False), "netz": json.dumps(netz_json, ensure_ascii=False),
			"umspannwerk": json.dumps(uw_json, ensure_ascii=False), "widmung": json.dumps({"status": widmung["status"], "text": widmung["text"]}, ensure_ascii=False),
			"score": b["score"], "ampel": b["ampel"], "prioritaet": prioritaet(b["score"], ha), "kriterien": json.dumps(b["kriterien"], ensure_ascii=False),
			"ko": json.dumps(b["ko"], ensure_ascii=False), "kennzahlen": json.dumps({**kz, "agri": kennzahlen(ha, b["ertragKwhProKwp"], agri=True)}), "demo": any(t[13] for t in teile), "geom": geom, "sp": sp,
		})
	conn.execute("DELETE FROM geo.kandidat WHERE bezirk = %s", (bezirk,))
	with conn.cursor() as c:
		c.executemany(
			"""INSERT INTO geo.kandidat (id, parzellen, flaeche_ha, kompaktheit, neigung_grad, exposition, nutzung, bundesland, bezirk, gemeinde, land, siedlung, schutz, netz,
			     umspannwerk, widmung, score, ampel, prioritaet, kriterien, ko, kennzahlen, scoring_version, demo, geom, schwerpunkt)
			   VALUES (%(id)s, %(parzellen)s, %(ha)s, %(kompaktheit)s, %(neigung)s, %(exposition)s, %(nutzung)s, %(bundesland)s, %(bezirk)s, %(gemeinde)s, %(land)s,
			     %(siedlung)s, %(schutz)s, %(netz)s, %(umspannwerk)s, %(widmung)s, %(score)s, %(ampel)s, %(prioritaet)s, %(kriterien)s, %(ko)s, %(kennzahlen)s,
			     '""" + SCORING_VERSION + """', %(demo)s, %(geom)s, %(sp)s)
			   ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, kriterien = EXCLUDED.kriterien, berechnet_am = now()""",
			zeilen,
		)
	conn.commit()
	return len(zeilen)


def alles(conn, bezirk=None):
	bezirke = [bezirk] if bezirk else [r[0] for r in conn.execute("SELECT DISTINCT bezirk FROM geo.parzelle WHERE bezirk IS NOT NULL ORDER BY 1").fetchall()]
	summe = 0
	for b in bezirke:
		nutzung_ableiten(conn, b)
		n = kandidaten_bezirk(conn, b)
		print(f"  {b}: {n} Kandidaten")
		summe += n
	return summe
