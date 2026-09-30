# Import-Schritte je Quelle (idempotent). Jeder Schritt: Datei → Stage-Tabelle (ogr2ogr, EPSG:31287, makevalid)
# → Ziel-Tabelle per DELETE … WHERE quelle_id + INSERT in EINER Transaktion → Quelle mit Lizenz/Stand/Prüfsumme.
# Unveränderte Eingaben (gleiche SHA-256) werden übersprungen, außer mit --erzwingen.
#
# Aufruf über die Kommandozeile (siehe cli.py / README):
#   python -m geodaten.cli import vgd       --datei /daten/VGD_Oesterreich_gen_50_20250401.zip --stand 2025-04-01
#   python -m geodaten.cli import dkm       --datei /daten/KAT_DKM_GST_epsg31287_20250401.gpkg --stand 2025-04-01 --bundesland Oberösterreich
#   python -m geodaten.cli import invekos   --datei /daten/inspire_schlaege_2025-1_polygon.gpkg --stand 2025-06-30
#   python -m geodaten.cli import osm       --datei /daten/austria-latest.osm.pbf
#   python -m geodaten.cli import natura2000 --datei /daten/Natura2000_end2024.gpkg --stand 2024-12-31
#   python -m geodaten.cli import schutz    --datei /daten/naturschutzgebiete_oesterreich_2025.gpkg --stand 2025-01-01
#   python -m geodaten.cli import dgm       --datei /daten/dgm_10m.tif
#   python -m geodaten.cli import zonen     --quelle noe_pv_zonen --datei /daten/pv_zonen_noe.gpkg --bundesland Niederösterreich --art noe_pv_zone
#   python -m geodaten.cli import gebaeude  --datei /daten/DLM_BAUWERKE.gpkg
#   python -m geodaten.cli ableiten                (Nutzung, Neigung, Kandidaten, Scoring)
#   python -m geodaten.cli demo --verzeichnis demo (Demo-Datensatz ohne echte Daten)
#
# Feldnamen der Quelldateien ändern sich gelegentlich zwischen Stichtagen: Die Zuordnung steht je Schritt oben als
# Konstante (FELDER_*) und wird vor dem Import gegen das Stage-Schema geprüft (klare Fehlermeldung statt stiller Nullen).

import json
import os
import subprocess
import tempfile

from .db import Importlauf, ogr_env, ogr_nach_stage, pg_verbindungstext

BUNDESLAND_KENNZIFFER = {"Burgenland": "1", "Kärnten": "2", "Niederösterreich": "3", "Oberösterreich": "4", "Salzburg": "5", "Steiermark": "6", "Tirol": "7", "Vorarlberg": "8", "Wien": "9"}


def _spalten(conn, stage):
	return {r[0] for r in conn.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='geo' AND table_name=%s", (stage,)).fetchall()}


def _feld(spalten, *kandidaten, pflicht=True):
	for k in kandidaten:
		if k.lower() in spalten:
			return k.lower()
	if pflicht:
		raise SystemExit(f"Feld nicht gefunden (erwartet eines von {kandidaten}); vorhandene Spalten: {sorted(spalten)}")
	return None


def _stage_weg(conn, stage):
	conn.execute(f"DROP TABLE IF EXISTS geo.{stage}")


# ------------------------------------------------------------------ BEV Verwaltungsgrenzen
FELDER_VGD = {"gemeinde": ("GKZ", "GEM_NAME", "PG"), "bezirk": ("BKZ", "BEZ_NAME", "PB"), "kg": ("KG_NR", "KG", "KG")}


def import_vgd(conn, datei, stand=None, erzwingen=False):
	with Importlauf(conn, "bev_vgd", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_vgd")
		sp = _spalten(conn, "stage_vgd")
		kg = _feld(sp, "kg_nr", "kgnr")
		kgn = _feld(sp, "kg", "kg_name", pflicht=False)
		gkz = _feld(sp, "gkz")
		gem = _feld(sp, "pg", "gem_name", "gemeinde")
		bkz = _feld(sp, "bkz")
		bez = _feld(sp, "pb", "bez_name", "bezirk")
		bl = _feld(sp, "bl", "bl_name", "bundesland")
		conn.execute("DELETE FROM geo.verwaltung WHERE quelle_id = 'bev_vgd'")
		conn.execute(f"""INSERT INTO geo.verwaltung (id, ebene, name, kennziffer, bundesland, geom, quelle_id)
			SELECT 'kg:' || {kg}, 'kg', COALESCE({kgn or kg}::text, {kg}::text), {kg}::text, {bl}::text, ST_Multi(geom), 'bev_vgd' FROM geo.stage_vgd
			ON CONFLICT (id) DO NOTHING""")
		for ebene, schl, name in (("gemeinde", gkz, gem), ("bezirk", bkz, bez)):
			conn.execute(f"""INSERT INTO geo.verwaltung (id, ebene, name, kennziffer, bundesland, geom, quelle_id)
				SELECT '{ebene[:3]}:' || {schl}, '{ebene}', max({name}::text), {schl}::text, max({bl}::text), ST_Multi(ST_Union(geom)), 'bev_vgd'
				FROM geo.stage_vgd GROUP BY {schl} ON CONFLICT (id) DO NOTHING""")
		n = conn.execute("SELECT count(*) FROM geo.verwaltung WHERE quelle_id='bev_vgd'").fetchone()[0]
		_stage_weg(conn, "stage_vgd")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ BEV DKM (Grundstücke)
def import_dkm(conn, datei, stand=None, bundesland=None, erzwingen=False):
	"""DKM-Grundstücke (GST-Layer). Mit --bundesland wird räumlich über geo.verwaltung gefiltert (VGD vorher importieren)."""
	with Importlauf(conn, "bev_dkm", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		ogr_nach_stage(datei, "stage_dkm")
		sp = _spalten(conn, "stage_dkm")
		kg = _feld(sp, "kg", "kg_nr", "kgnr")
		gst = _feld(sp, "gnr", "gst", "gst_nr", "gstnr")
		fl = _feld(sp, "fl", "flaeche", "gst_fl", pflicht=False)
		nutz = _feld(sp, "nutzung", "ba", "nutzungsart", pflicht=False)
		filter_sql = ""
		if bundesland:
			filter_sql = "AND EXISTS (SELECT 1 FROM geo.verwaltung v WHERE v.ebene='kg' AND v.bundesland=%(bl)s AND v.kennziffer = s." + kg + "::text)"
		conn.execute("DELETE FROM geo.parzelle WHERE quelle_id = 'bev_dkm'" + (" AND bundesland = %(bl)s" if bundesland else ""), {"bl": bundesland})
		conn.execute(f"""INSERT INTO geo.parzelle (id, kg_nr, gst_nr, flaeche_m2, flaeche_kat, nutzung_dkm, geom, quelle_id, stand, land)
			SELECT s.{kg}::text || '-' || s.{gst}::text, s.{kg}::text, s.{gst}::text, ST_Area(s.geom), {('s.' + fl) if fl else 'NULL'}, {('s.' + nutz + '::text') if nutz else 'NULL'},
			       ST_Multi(s.geom), 'bev_dkm', %(stand)s, 'AT'
			FROM geo.stage_dkm s WHERE ST_Area(s.geom) > 0 {filter_sql}
			ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom, flaeche_m2 = EXCLUDED.flaeche_m2, flaeche_kat = EXCLUDED.flaeche_kat,
			  nutzung_dkm = EXCLUDED.nutzung_dkm, stand = EXCLUDED.stand""", {"bl": bundesland, "stand": stand})
		# Verwaltungszuordnung (KG → Gemeinde/Bezirk/Bundesland) über den Schwerpunkt
		conn.execute("""UPDATE geo.parzelle p SET kg_name = kg.name, bundesland = kg.bundesland,
			  gemeinde = (SELECT g.name FROM geo.verwaltung g WHERE g.ebene='gemeinde' AND ST_Contains(g.geom, ST_PointOnSurface(p.geom)) LIMIT 1),
			  bezirk = (SELECT b.name FROM geo.verwaltung b WHERE b.ebene='bezirk' AND ST_Contains(b.geom, ST_PointOnSurface(p.geom)) LIMIT 1)
			FROM geo.verwaltung kg WHERE kg.ebene='kg' AND kg.kennziffer = p.kg_nr AND p.quelle_id='bev_dkm' AND p.gemeinde IS NULL""")
		n = conn.execute("SELECT count(*) FROM geo.parzelle WHERE quelle_id='bev_dkm'").fetchone()[0]
		_stage_weg(conn, "stage_dkm")
		lauf.fertig(n, stand, f"Bundesland: {bundesland}" if bundesland else None)
		return n


# ------------------------------------------------------------------ AMA INVEKOS-Schläge
# Gruppierung der Schlagnutzungsarten (Text) – Muster auf Kleinbuchstaben, erste Übereinstimmung gewinnt
NUTZUNG_GRUPPEN = [
	("gruenland", ("wiese", "weide", "grünland", "gruenland", "hutweide", "almfutter", "streuwiese", "kleegras", "feldfutter")),
	("dauerkultur", ("wein", "obst", "hopfen", "baumschul", "christbaum", "energieholz", "kurzumtrieb")),
	("acker", ("weizen", "gerste", "roggen", "triticale", "hafer", "mais", "raps", "soja", "sonnenblume", "rübe", "kartoffel", "erbse", "bohne", "hirse", "dinkel", "ackerbrache", "gemüse", "kürbis", "acker")),
]


def nutzung_gruppe(text):
	t = str(text or "").lower()
	for gruppe, muster in NUTZUNG_GRUPPEN:
		if any(m in t for m in muster):
			return gruppe
	return "sonstige"


def import_invekos(conn, datei, stand=None, jahr=None, erzwingen=False):
	with Importlauf(conn, "ama_invekos_schlaege", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_invekos")
		sp = _spalten(conn, "stage_invekos")
		nutz = _feld(sp, "snar_bezeichnung", "schlagnutzungsart", "nutzung", "snar_bez", "fnar_bezeichnung")
		bio = _feld(sp, "kz_bio_oepul_jn", pflicht=False)
		ident = _feld(sp, "gml_identifier", "id", "schlag_id", "ogc_fid")
		conn.execute("DELETE FROM geo.schlag WHERE quelle_id = 'ama_invekos_schlaege'")
		zeilen = conn.execute(f"SELECT DISTINCT {nutz}::text FROM geo.stage_invekos").fetchall()
		conn.execute("CREATE TEMP TABLE nutzung_map (text text PRIMARY KEY, gruppe text) ON COMMIT DROP")
		with conn.cursor() as c:
			c.executemany("INSERT INTO nutzung_map VALUES (%s, %s)", [(z[0], nutzung_gruppe(z[0])) for z in zeilen])
		conn.execute(f"""INSERT INTO geo.schlag (id, jahr, nutzung, nutzung_gruppe, bio, flaeche_m2, geom, quelle_id)
			SELECT 'inv-' || s.{ident}::text, %(jahr)s, s.{nutz}::text, COALESCE(m.gruppe, 'sonstige'), {('s.' + bio + " IN ('J','j','1','true')") if bio else 'NULL'},
			       ST_Area(s.geom), ST_Multi(s.geom), 'ama_invekos_schlaege'
			FROM geo.stage_invekos s LEFT JOIN nutzung_map m ON m.text = s.{nutz}::text
			ON CONFLICT (id) DO NOTHING""", {"jahr": jahr or (str(stand)[:4] if stand else "")})
		n = conn.execute("SELECT count(*) FROM geo.schlag").fetchone()[0]
		_stage_weg(conn, "stage_invekos")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ OSM: Netzknoten + Querungen
def _knoten_art_sql():
	# gleiche Regeln wie demo/demo_bauen.py knoten_art()
	return """CASE
	  WHEN power = 'transformer' AND COALESCE(substation,'') <> 'minor_distribution' THEN NULL
	  WHEN substation IN ('traction','industrial','generation','converter','compensation','transition') THEN NULL
	  WHEN name ~* '(^|\\W)(KW|FHKW)(\\W|$)|Kraftwerk|Unterwerk|Wasserkraft' THEN NULL
	  WHEN vmax >= 220000 THEN 'uew'
	  WHEN vmax >= 110000 THEN 'uw110'
	  WHEN substation = 'minor_distribution' THEN 'trafo'
	  WHEN substation = 'transmission' THEN CASE WHEN vmax IS NULL THEN 'uw110' ELSE 'ms' END
	  WHEN substation = 'distribution' OR vmax >= 10000 THEN CASE WHEN substation = 'distribution' OR name IS NOT NULL THEN 'ms' ELSE 'trafo' END
	  ELSE 'trafo' END"""


def import_osm(conn, datei, erzwingen=False):
	"""Geofabrik-PBF: Netzknoten (Punkte + Flächen-Schwerpunkte) und Querungslinien. OSMCONF mit power/voltage/substation."""
	conf = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "osmconf.ini")
	with Importlauf(conn, "osm_netz", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		extra = ("--config", "OSM_CONFIG_FILE", conf, "--config", "OSM_USE_CUSTOM_INDEXING", "NO")
		ogr_nach_stage(datei, "stage_osm_punkte", sql="SELECT osm_id, name, power, voltage, substation, operator FROM points WHERE power IN ('substation','transformer')", typ="POINT", extra=extra)
		ogr_nach_stage(datei, "stage_osm_flaechen", sql="SELECT osm_id, osm_way_id, name, power, voltage, substation, operator FROM multipolygons WHERE power = 'substation'", typ="MULTIPOLYGON", extra=extra)
		ogr_nach_stage(datei, "stage_osm_linien", sql="SELECT osm_id, highway, railway, waterway FROM lines WHERE highway IN ('motorway','trunk','primary','secondary') OR railway = 'rail' OR waterway = 'river'", typ="MULTILINESTRING", extra=extra)
		conn.execute("DELETE FROM geo.netzknoten WHERE quelle_id = 'osm_netz'")
		for tab, idfeld, geom in (("stage_osm_punkte", "'osm-n' || osm_id", "geom"), ("stage_osm_flaechen", "'osm-' || CASE WHEN osm_way_id IS NOT NULL THEN 'w' || osm_way_id ELSE 'r' || osm_id END", "ST_PointOnSurface(geom)")):
			conn.execute(f"""INSERT INTO geo.netzknoten (id, name, art, spannung_kv, betreiber, geom, quelle_id, osm_id)
				SELECT id, name, art, spannung, operator, g, 'osm_netz', id FROM (
				  SELECT {idfeld} AS id, name, operator, {geom} AS g,
				    (SELECT array_agg(DISTINCT (v::numeric / 1000)::int ORDER BY (v::numeric / 1000)::int DESC) FROM regexp_split_to_table(COALESCE(voltage,''), '[;,]') v WHERE v ~ '^[0-9]+$') AS spannung,
				    (SELECT max(v::numeric) FROM regexp_split_to_table(COALESCE(voltage,''), '[;,]') v WHERE v ~ '^[0-9]+$') AS vmax,
				    power, substation
				  FROM geo.{tab}) x
				CROSS JOIN LATERAL (SELECT {_knoten_art_sql()} AS art) a
				WHERE a.art IS NOT NULL
				ON CONFLICT (id) DO NOTHING""")
		conn.execute("DELETE FROM geo.querung_linie WHERE quelle_id = 'osm_querungen'")
		conn.execute("""INSERT INTO geo.querung_linie (id, art, geom, quelle_id)
			SELECT 'osm-' || osm_id, CASE WHEN highway = 'motorway' THEN 'autobahn' WHEN highway IS NOT NULL THEN 'strasse' WHEN railway IS NOT NULL THEN 'bahn' ELSE 'fluss' END,
			       ST_Multi(geom), 'osm_querungen' FROM geo.stage_osm_linien ON CONFLICT (id) DO NOTHING""")
		n = conn.execute("SELECT count(*) FROM geo.netzknoten WHERE quelle_id='osm_netz'").fetchone()[0]
		m = conn.execute("SELECT count(*) FROM geo.querung_linie").fetchone()[0]
		for t in ("stage_osm_punkte", "stage_osm_flaechen", "stage_osm_linien"):
			_stage_weg(conn, t)
		lauf.fertig(n, None, f"{m} Querungslinien")
		from .db import quelle_registrieren

		quelle_registrieren(conn, "osm_querungen", None, lauf.summe, m)
		conn.commit()
		return n


# ------------------------------------------------------------------ Schutzgebiete
def schutz_art_sql(titel_feld):
	return f"""CASE
	  WHEN {titel_feld} ~* 'nationalpark' THEN 'nationalpark'
	  WHEN {titel_feld} ~* 'natura|europaschutz|vogelschutz|ffh|habitat|birds' THEN 'natura2000'
	  WHEN {titel_feld} ~* 'wasserschutz|quellschutz|schongebiet' THEN 'wasserschutz'
	  WHEN {titel_feld} ~* 'landschaftsschutz' THEN 'landschaftsschutz'
	  WHEN {titel_feld} ~* 'naturschutz|naturdenkmal|ramsar|biosph' THEN 'naturschutz'
	  ELSE 'sonstig' END"""


def import_natura2000(conn, datei, stand=None, erzwingen=False):
	with Importlauf(conn, "eea_natura2000", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		# nur Österreich (MS = 'AT'); Layer-Name je Ausgabe prüfen (z. B. NaturaSite_polygon)
		ogr_nach_stage(datei, "stage_n2k", where="MS = 'AT'")
		sp = _spalten(conn, "stage_n2k")
		code = _feld(sp, "sitecode")
		name = _feld(sp, "sitename")
		conn.execute("DELETE FROM geo.schutzgebiet WHERE quelle_id = 'eea_natura2000'")
		conn.execute(f"""INSERT INTO geo.schutzgebiet (id, name, art, kennung, geom, quelle_id)
			SELECT 'n2k-' || {code}, {name}, 'natura2000', {code}, ST_Multi(ST_Union(geom)), 'eea_natura2000' FROM geo.stage_n2k GROUP BY {code}, {name}
			ON CONFLICT (id) DO NOTHING""")
		n = conn.execute("SELECT count(*) FROM geo.schutzgebiet WHERE quelle_id='eea_natura2000'").fetchone()[0]
		_stage_weg(conn, "stage_n2k")
		lauf.fertig(n, stand)
		return n


def import_schutz(conn, datei, stand=None, quelle_id="uba_schutzgebiete", erzwingen=False):
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		ogr_nach_stage(datei, "stage_schutz")
		sp = _spalten(conn, "stage_schutz")
		name = _feld(sp, "name", "sitename", "bezeichnung", "gebietsname")
		titel = _feld(sp, "kategorie", "schutzkategorie", "designation", "desig", "art", "typ", pflicht=False) or name
		conn.execute("DELETE FROM geo.schutzgebiet WHERE quelle_id = %s", (quelle_id,))
		conn.execute(f"""INSERT INTO geo.schutzgebiet (id, name, art, geom, quelle_id)
			SELECT %(q)s || '-' || ogc_fid, COALESCE({name}::text, 'Schutzgebiet'), {schutz_art_sql(f"COALESCE({titel}::text,'') || ' ' || COALESCE({name}::text,'')")}, ST_Multi(geom), %(q)s
			FROM geo.stage_schutz ON CONFLICT (id) DO NOTHING""", {"q": quelle_id})
		n = conn.execute("SELECT count(*) FROM geo.schutzgebiet WHERE quelle_id=%s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_schutz")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ Widmungs-/Eignungszonen
def import_zonen(conn, datei, quelle_id, bundesland, art, stand=None, erzwingen=False):
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_zonen")
		sp = _spalten(conn, "stage_zonen")
		name = _feld(sp, "zonename", "name", "bezeichnung", "zone", pflicht=False)
		conn.execute("DELETE FROM geo.widmungszone WHERE quelle_id = %s", (quelle_id,))
		conn.execute(f"""INSERT INTO geo.widmungszone (id, bundesland, art, name, geom, quelle_id)
			SELECT %(q)s || '-' || ogc_fid, %(bl)s, %(art)s, {name + '::text' if name else 'NULL'}, ST_Multi(geom), %(q)s FROM geo.stage_zonen""",
			{"q": quelle_id, "bl": bundesland, "art": art})
		n = conn.execute("SELECT count(*) FROM geo.widmungszone WHERE quelle_id=%s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_zonen")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ Gebäude (Siedlungsabstand)
def import_gebaeude(conn, datei, quelle_id="bev_dlm_bauwerke", stand=None, erzwingen=False):
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		ogr_nach_stage(datei, "stage_gebaeude")
		conn.execute("DELETE FROM geo.siedlung WHERE quelle_id = %s", (quelle_id,))
		conn.execute("""INSERT INTO geo.siedlung (id, art, geom, quelle_id)
			SELECT %(q)s || '-' || ogc_fid, 'gebaeude', geom, %(q)s FROM geo.stage_gebaeude WHERE ST_Area(geom) >= 30""", {"q": quelle_id})
		n = conn.execute("SELECT count(*) FROM geo.siedlung WHERE quelle_id=%s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_gebaeude")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ Geländemodell → Neigung/Exposition je Parzelle
def import_dgm(conn, datei, stand=None, erzwingen=False, arbeitsverzeichnis="/daten/dgm"):
	"""gdaldem slope/aspect (Grad) auf das DGM, dann Zonenstatistik je Parzelle (numpy.bincount über gerasterte Parzellen-IDs)."""
	import numpy as np
	from osgeo import gdal, ogr

	with Importlauf(conn, "dgm_10m", [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		os.makedirs(arbeitsverzeichnis, exist_ok=True)
		dgm = os.path.join(arbeitsverzeichnis, "dgm_31287.tif")
		neig = os.path.join(arbeitsverzeichnis, "neigung.tif")
		exp = os.path.join(arbeitsverzeichnis, "exposition.tif")
		gdal.Warp(dgm, datei, dstSRS="EPSG:31287", xRes=10, yRes=10, resampleAlg="bilinear", creationOptions=["COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER"])
		gdal.DEMProcessing(neig, dgm, "slope", computeEdges=True, creationOptions=["COMPRESS=DEFLATE", "TILED=YES"])
		gdal.DEMProcessing(exp, dgm, "aspect", computeEdges=True, zeroForFlat=True, creationOptions=["COMPRESS=DEFLATE", "TILED=YES"])

		ids = [r[0] for r in conn.execute("SELECT id FROM geo.parzelle ORDER BY id").fetchall()]
		index = {pid: i + 1 for i, pid in enumerate(ids)}
		ds_n = gdal.Open(neig)
		ds_e = gdal.Open(exp)
		gt = ds_n.GetGeoTransform()
		breite, hoehe = ds_n.RasterXSize, ds_n.RasterYSize
		summen = np.zeros(len(ids) + 1)
		sin_s = np.zeros(len(ids) + 1)
		cos_s = np.zeros(len(ids) + 1)
		anzahl = np.zeros(len(ids) + 1)
		kachel = 4096
		os.environ["PGPASSWORD"] = ogr_env()["PGPASSWORD"]  # nicht in den Verbindungstext
		pg = ogr.Open(pg_verbindungstext())
		for y0 in range(0, hoehe, kachel):
			for x0 in range(0, breite, kachel):
				w = min(kachel, breite - x0)
				h = min(kachel, hoehe - y0)
				minx = gt[0] + x0 * gt[1]
				maxy = gt[3] + y0 * gt[5]
				maxx = minx + w * gt[1]
				miny = maxy + h * gt[5]
				layer = pg.ExecuteSQL(f"SELECT id, geom FROM geo.parzelle WHERE geom && ST_MakeEnvelope({minx},{miny},{maxx},{maxy},31287)")
				if layer is None or layer.GetFeatureCount() == 0:
					if layer is not None:
						pg.ReleaseResultSet(layer)
					continue
				mem = gdal.GetDriverByName("MEM").Create("", w, h, 1, gdal.GDT_Int32)
				mem.SetGeoTransform((minx, gt[1], 0, maxy, 0, gt[5]))
				mem.SetProjection(ds_n.GetProjection())
				# Parzellen-ID → laufende Nummer als Brennwert
				lyr_mem = ogr.GetDriverByName("Memory").CreateDataSource("m").CreateLayer("p", layer.GetSpatialRef(), ogr.wkbMultiPolygon)
				lyr_mem.CreateField(ogr.FieldDefn("nr", ogr.OFTInteger))
				for f in layer:
					g = ogr.Feature(lyr_mem.GetLayerDefn())
					g.SetField("nr", index.get(f.GetField("id"), 0))
					g.SetGeometry(f.GetGeometryRef().Clone())
					lyr_mem.CreateFeature(g)
				pg.ReleaseResultSet(layer)
				gdal.RasterizeLayer(mem, [1], lyr_mem, options=["ATTRIBUTE=nr", "ALL_TOUCHED=FALSE"])
				nr = mem.ReadAsArray().ravel()
				n_arr = ds_n.GetRasterBand(1).ReadAsArray(x0, y0, w, h).ravel().astype(float)
				e_arr = np.radians(ds_e.GetRasterBand(1).ReadAsArray(x0, y0, w, h).ravel().astype(float))
				gueltig = (nr > 0) & (n_arr >= 0)
				summen += np.bincount(nr[gueltig], weights=n_arr[gueltig], minlength=len(ids) + 1)
				sin_s += np.bincount(nr[gueltig], weights=np.sin(e_arr[gueltig]), minlength=len(ids) + 1)
				cos_s += np.bincount(nr[gueltig], weights=np.cos(e_arr[gueltig]), minlength=len(ids) + 1)
				anzahl += np.bincount(nr[gueltig], minlength=len(ids) + 1)
		richtungen = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
		werte = []
		for pid, i in index.items():
			if anzahl[i] == 0:
				continue
			neigung = summen[i] / anzahl[i]
			azimut = (np.degrees(np.arctan2(sin_s[i], cos_s[i])) + 360) % 360
			expo = "eben" if neigung < 1 else richtungen[int((azimut + 22.5) // 45) % 8]
			werte.append((round(float(neigung), 1), expo, pid))
		with conn.cursor() as c:
			c.executemany("UPDATE geo.parzelle SET neigung_grad = %s, exposition = %s WHERE id = %s", werte)
		lauf.fertig(len(werte), stand)
		return len(werte)


# ------------------------------------------------------------------ Demo-Datensatz
def import_demo(conn, verzeichnis):
	"""Demo-GeoJSON (demo/*.geojson) in die Tabellen laden – für Vorführung und Integrationstest ohne echte Daten."""
	from .db import quelle_registrieren

	def lade(name):
		with open(os.path.join(verzeichnis, name), encoding="utf-8") as f:
			return json.load(f)

	def geo(g):
		return json.dumps(g)

	conn.execute("DELETE FROM geo.parzelle WHERE demo")
	for q in ("osm_netz", "demo"):
		quelle_registrieren(conn, q, None, None, None, "Demo-Datensatz")
	conn.execute("DELETE FROM geo.netzknoten WHERE quelle_id='osm_netz'")
	conn.execute("DELETE FROM geo.schutzgebiet WHERE quelle_id='osm_netz'")
	conn.execute("DELETE FROM geo.siedlung WHERE quelle_id='osm_netz'")
	with conn.cursor() as c:
		for f in lade("netzknoten-ooe-sbg.geojson")["features"]:
			p = f["properties"]
			c.execute("INSERT INTO geo.netzknoten (id, name, art, spannung_kv, betreiber, geom, quelle_id, osm_id) VALUES (%s,%s,%s,%s,%s,ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),31287),'osm_netz',%s) ON CONFLICT (id) DO NOTHING",
				(p["id"], p["name"] or None, p["art"], p["spannungKv"] or None, p["betreiber"] or None, geo(f["geometry"]), p["id"]))
		for f in lade("schutzgebiete-innviertel.geojson")["features"]:
			p = f["properties"]
			c.execute("INSERT INTO geo.schutzgebiet (id, name, art, geom, quelle_id) VALUES (%s,%s,%s,ST_Multi(ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),31287))),'osm_netz') ON CONFLICT (id) DO NOTHING",
				(p["id"], p["name"], p["art"], geo(f["geometry"])))
		for i, f in enumerate(lade("orte-innviertel.geojson")["features"]):
			p = f["properties"]
			# Ortspunkt mit Näherungsradius als Fläche (Siedlungskörper)
			c.execute("INSERT INTO geo.siedlung (id, art, name, geom, quelle_id) VALUES (%s,'ortspunkt',%s,ST_Buffer(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),31287), %s),'osm_netz') ON CONFLICT (id) DO NOTHING",
				(f"ort-{i}", p["name"], geo(f["geometry"]), p["radiusM"]))
		for f in lade("parzellen-demo.geojson")["features"]:
			p = f["properties"]
			c.execute("""INSERT INTO geo.parzelle (id, kg_nr, kg_name, gst_nr, gemeinde, bezirk, bundesland, land, nutzung, kultur, neigung_grad, exposition, flaeche_m2, demo, geom, quelle_id)
				VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true,ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),31287)),'demo')
				ON CONFLICT (id) DO NOTHING""",
				(p["id"], p["kgNr"], p["kg"], p["gstNr"], p["gemeinde"], p["bezirk"], p["bundesland"], p["land"], p["nutzung"], p["kultur"], p["neigungGrad"], p["exposition"], p["flaecheM2"], geo(f["geometry"])))
	conn.commit()
	return conn.execute("SELECT count(*) FROM geo.parzelle WHERE demo").fetchone()[0]


def pbf_pruefen():
	"""Prüft, ob ogr2ogr verfügbar ist (Container)."""
	try:
		subprocess.run(["ogr2ogr", "--version"], check=True, capture_output=True)
		return True
	except (OSError, subprocess.CalledProcessError):
		return False


def temp_datei(suffix):
	fd, pfad = tempfile.mkstemp(suffix=suffix)
	os.close(fd)
	return pfad
