# Import-Schritte Deutschland und Schweiz (Ausbaustufe A1b) – gleiche Mechanik wie importe.py: Datei → Stage (ogr2ogr,
# EPSG:31287, makevalid) → Zieltabelle je quelle_id in EINER Transaktion → geo.quelle (Lizenz, Stand, SHA-256).
#
#   python -m geodaten.cli import alkis     --datei /daten/alkis_<land>.gpkg|.xml|.zip --bundesland Bayern|Nordrhein-Westfalen|… --quelle alkis_nw
#   python -m geodaten.cli import feldbloecke --datei /daten/feldbloecke_<land>.gpkg --bundesland … --quelle invekos_nw --jahr 2026
#   python -m geodaten.cli import kulisse   --datei /daten/benachteiligte_gebiete_by.shp --art benachteiligt --land DE --quelle kulisse_bena_by
#   python -m geodaten.cli import kulisse   --datei /daten/thuenen_organische_boeden.gpkg --art moor --land DE --quelle kulisse_moor_thuenen
#   python -m geodaten.cli import verkehr   --datei /daten/germany-latest.osm.pbf      (Autobahnen + Schienenwege, Gleiszahl)
#   python -m geodaten.cli import av_ch     --datei /daten/av_<kanton>.gpkg --bundesland Bern --quelle av_ch_be
#   python -m geodaten.cli import kulisse   --datei /daten/fff_<kanton>.gpkg --art fff --land CH --quelle ch_fff_be
#   python -m geodaten.cli import kulisse   --datei /daten/richtplan_solar_<kanton>.gpkg --art eignung --land CH --quelle ch_eignung_be
#   python -m geodaten.cli import dgm       --datei /daten/dgm_de.vrt   (Länder-DGM1/DGM5 bzw. swissALTI3D als VRT aus Kacheln)
#
# Annahmen (docs/AKQUISE-GEODATEN.md Abschnitt 9):
#  - ALKIS: Flurstücke OHNE Eigentümer (Open-Data-Abgabe der Länder). Feldnamen der NAS/GPKG-Abgaben variieren je Land –
#    die Kandidatenlisten unten decken AAA-Namen (flurstueckskennzeichen, gemarkungsnummer, flurstuecksnummer/zaehler/nenner,
#    amtlicheflaeche) und die „vereinfachten“ WFS/OGC-API-Schemata ab; sonst bricht der Import mit der Spaltenliste ab.
#  - Bayern: Flurstücksvektoren sind KEIN Open Data (kostenpflichtig je Flurstück) – nur mit Lizenzvertrag importieren.
#  - Gleiszahl: OSM-Tag tracks; fehlt er, gilt ein Hauptbahn-Weg als zweigleisig, wenn ein zweiter usage=main-Weg auf
#    ≥ 60 % seiner Länge näher als 12 m verläuft (gleiche Regel wie demo/demo_bauen_de.py). Im Betrieb besser: DB InfraGO
#    Infrastrukturregister. Maßgeblich für § 35 BauGB: Schienenwege des übergeordneten Netzes (§ 2b AEG) mit ≥ 2 Hauptgleisen.
#  - Abstände zur OSM-Mittellinie statt zum äußeren Fahrbahnrand → Korridore werden leicht UNTERschätzt (konservativ).

from .db import Importlauf, ogr_nach_stage
from .importe import _feld, _spalten, _stage_weg

KULISSE_ARTEN = ("benachteiligt", "moor", "konversion", "eignung", "fff", "vorbelastet")


# ------------------------------------------------------------------ ALKIS (Deutschland)
def import_alkis(conn, datei, stand=None, bundesland=None, quelle_id="alkis", erzwingen=False):
	if not bundesland:
		raise SystemExit("alkis: --bundesland angeben (z. B. Nordrhein-Westfalen)")
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_alkis")
		sp = _spalten(conn, "stage_alkis")
		kennz = _feld(sp, "flurstueckskennzeichen", "flstkennz", "kennzeichen", "flurstkennz", pflicht=False)
		gem_nr = _feld(sp, "gemarkungsnummer", "gemarkung_nr", "gemarkungnr", "gmk_nr", "land_gemarkung")
		gem_name = _feld(sp, "gemarkung", "gemarkungsname", "gemarkung_name", "gmk_name", pflicht=False)
		zaehler = _feld(sp, "flurstuecksnummer", "zaehler", "flstnrzae", "flurstuecksnummer_zaehler")
		nenner = _feld(sp, "nenner", "flstnrnen", "flurstuecksnummer_nenner", pflicht=False)
		flaeche = _feld(sp, "amtlicheflaeche", "flaeche", "amtl_flaeche", pflicht=False)
		gemeinde = _feld(sp, "gemeinde", "gemeindename", "gem_name", pflicht=False)
		nummer = f"{zaehler}::text || COALESCE('/' || NULLIF({nenner}::text, ''), '')" if nenner else f"{zaehler}::text"
		kennung = f"{kennz}::text" if kennz else f"{gem_nr}::text || '-' || {nummer}"
		conn.execute("DELETE FROM geo.parzelle WHERE quelle_id = %s", (quelle_id,))
		conn.execute(
			f"""INSERT INTO geo.parzelle (id, kg_nr, kg_name, gst_nr, gemeinde, bundesland, land, flaeche_m2, flaeche_kat, geom, quelle_id, stand)
			SELECT 'DE-' || {kennung}, {gem_nr}::text, {(gem_name + '::text') if gem_name else 'NULL'}, {nummer}, {(gemeinde + '::text') if gemeinde else 'NULL'},
			       %(bl)s, 'DE', ST_Area(geom), {(flaeche + '::double precision') if flaeche else 'NULL'}, ST_Multi(geom), %(q)s, %(stand)s
			FROM geo.stage_alkis WHERE ST_Area(geom) > 0
			ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom, flaeche_m2 = EXCLUDED.flaeche_m2, flaeche_kat = EXCLUDED.flaeche_kat, stand = EXCLUDED.stand""",
			{"bl": bundesland, "q": quelle_id, "stand": stand},
		)
		# Gemeinde/Kreis über Verwaltungsgrenzen (VG250 des BKG als 'verwaltung' importiert), falls vorhanden
		conn.execute(
			"""UPDATE geo.parzelle p SET
			  gemeinde = COALESCE(p.gemeinde, (SELECT g.name FROM geo.verwaltung g WHERE g.ebene='gemeinde' AND ST_Contains(g.geom, ST_PointOnSurface(p.geom)) LIMIT 1)),
			  bezirk = (SELECT b.name FROM geo.verwaltung b WHERE b.ebene='bezirk' AND ST_Contains(b.geom, ST_PointOnSurface(p.geom)) LIMIT 1)
			WHERE p.quelle_id = %s AND p.bezirk IS NULL""",
			(quelle_id,),
		)
		n = conn.execute("SELECT count(*) FROM geo.parzelle WHERE quelle_id = %s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_alkis")
		lauf.fertig(n, stand, f"Bundesland: {bundesland}")
		return n


# ------------------------------------------------------------------ Feldblöcke / InVeKoS (Deutschland, je Land)
def import_feldbloecke(conn, datei, stand=None, jahr=None, quelle_id="invekos_de", erzwingen=False):
	from .importe import nutzung_gruppe

	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_fb")
		sp = _spalten(conn, "stage_fb")
		fid = _feld(sp, "fb_ident", "flik", "feldblock_id", "fbi", "id", "gml_id")
		art = _feld(sp, "bodennutzung", "nutzung", "fb_art", "hbn", "hauptbodennutzung", "kultur", "code_txt")
		conn.execute("DELETE FROM geo.schlag WHERE quelle_id = %s", (quelle_id,))
		zeilen = conn.execute(f"SELECT DISTINCT {art}::text FROM geo.stage_fb").fetchall()
		gruppen = {z[0]: nutzung_gruppe(z[0] or "") for z in zeilen}
		# Feldblock-Arten der Länder: AL/A = Ackerland, GL/G = Grünland
		for code, g in (("AL", "acker"), ("A", "acker"), ("GL", "gruenland"), ("G", "gruenland")):
			if code in gruppen:
				gruppen[code] = g
		conn.execute("CREATE TEMP TABLE fb_gruppe (nutzung text, gruppe text) ON COMMIT DROP")
		with conn.cursor() as c:
			c.executemany("INSERT INTO fb_gruppe VALUES (%s, %s)", list(gruppen.items()))
		conn.execute(
			f"""INSERT INTO geo.schlag (id, jahr, nutzung, nutzung_gruppe, flaeche_m2, geom, quelle_id)
			SELECT %(q)s || '-' || s.{fid}::text, %(j)s, COALESCE(s.{art}::text, ''), COALESCE(g.gruppe, 'sonstige'), ST_Area(s.geom), ST_Multi(s.geom), %(q)s
			FROM geo.stage_fb s LEFT JOIN fb_gruppe g ON g.nutzung = s.{art}::text ON CONFLICT (id) DO NOTHING""",
			{"q": quelle_id, "j": jahr or (str(stand)[:4] if stand else "")},
		)
		n = conn.execute("SELECT count(*) FROM geo.schlag WHERE quelle_id = %s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_fb")
		lauf.fertig(n, stand)
		return n


# ------------------------------------------------------------------ Kulissen (DE: benachteiligt/Moor/Konversion, CH: Eignung/FFF/vorbelastet)
def import_kulisse(conn, datei, art, land, quelle_id, stand=None, name_feld=None, erzwingen=False):
	if art not in KULISSE_ARTEN:
		raise SystemExit(f"kulisse: --art eines von {KULISSE_ARTEN}")
	if land not in ("DE", "CH", "AT"):
		raise SystemExit("kulisse: --land DE, CH oder AT")
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_kulisse")
		sp = _spalten(conn, "stage_kulisse")
		nf = name_feld.lower() if name_feld and name_feld.lower() in sp else _feld(sp, "name", "gemeinde", "gemarkung", "bezeichnung", "gen", pflicht=False)
		conn.execute("DELETE FROM geo.kulisse WHERE quelle_id = %s", (quelle_id,))
		conn.execute(
			f"""INSERT INTO geo.kulisse (id, art, land, name, geom, quelle_id, stand)
			SELECT %(q)s || '-' || row_number() OVER (), %(a)s, %(l)s, {(nf + '::text') if nf else 'NULL'}, ST_Multi(geom), %(q)s, %(s)s FROM geo.stage_kulisse WHERE NOT ST_IsEmpty(geom)""",
			{"q": quelle_id, "a": art, "l": land, "s": stand},
		)
		n = conn.execute("SELECT count(*) FROM geo.kulisse WHERE quelle_id = %s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_kulisse")
		lauf.fertig(n, stand, f"{art} ({land})")
		return n


# ------------------------------------------------------------------ Autobahnen und Schienenwege (OSM, für § 37 EEG / § 35 BauGB)
def import_verkehr(conn, datei, quelle_id="osm_verkehr_de", erzwingen=False):
	import os

	conf = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "osmconf_verkehr.ini")
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		extra = ("--config", "OSM_CONFIG_FILE", conf, "--config", "OSM_USE_CUSTOM_INDEXING", "NO")
		ogr_nach_stage(datei, "stage_verkehr", sql="SELECT osm_id, name, ref, highway, railway, usage, service, tracks FROM lines WHERE highway = 'motorway' OR (railway = 'rail' AND usage IN ('main','branch') AND service IS NULL)", typ="MULTILINESTRING", extra=extra)
		conn.execute("DELETE FROM geo.verkehr_linie WHERE quelle_id = %s", (quelle_id,))
		conn.execute(
			"""INSERT INTO geo.verkehr_linie (id, art, usage, gleise, gleise_quelle, name, geom, quelle_id)
			SELECT 'osm-w' || osm_id, CASE WHEN highway = 'motorway' THEN 'autobahn' ELSE 'schiene' END, usage,
			       CASE WHEN tracks ~ '^[0-9]+$' THEN tracks::smallint ELSE 1 END, CASE WHEN tracks ~ '^[0-9]+$' THEN 'osm' ELSE 'schaetzung' END,
			       COALESCE(NULLIF(ref, ''), name), ST_Multi(geom), %s FROM geo.stage_verkehr ON CONFLICT (id) DO NOTHING""",
			(quelle_id,),
		)
		# Gleiszahl schätzen, wo tracks fehlt: paralleler Hauptbahn-Weg ≤ 12 m auf ≥ 60 % der Länge → zweigleisig
		conn.execute(
			"""UPDATE geo.verkehr_linie a SET gleise = 2 WHERE a.art = 'schiene' AND a.usage = 'main' AND a.gleise_quelle = 'schaetzung' AND EXISTS (
			     SELECT 1 FROM geo.verkehr_linie b WHERE b.id <> a.id AND b.art = 'schiene' AND b.usage = 'main' AND ST_DWithin(a.geom, b.geom, 12)
			       AND ST_Length(ST_Intersection(a.geom, ST_Buffer(b.geom, 12))) >= 0.6 * ST_Length(a.geom))""")
		n = conn.execute("SELECT count(*) FROM geo.verkehr_linie WHERE quelle_id = %s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_verkehr")
		lauf.fertig(n, None, "Autobahnen und Schienenwege; Gleiszahl aus tracks bzw. geschätzt")
		return n


# ------------------------------------------------------------------ Amtliche Vermessung Schweiz (geodienste.ch, Liegenschaften)
def import_av_ch(conn, datei, stand=None, bundesland=None, quelle_id="av_ch", erzwingen=False):
	"""Liegenschaften (Layer „Liegenschaft“/„resf“ des AV-Modells DM.01-AV-CH bzw. geodienste.ch-GPKG). Keine Eigentümer."""
	if not bundesland:
		raise SystemExit("av_ch: --bundesland (Kanton) angeben, z. B. Bern")
	with Importlauf(conn, quelle_id, [datei], erzwingen) as lauf:
		if lauf.unveraendert:
			return 0
		quelle = f"/vsizip/{datei}" if datei.endswith(".zip") else datei
		ogr_nach_stage(quelle, "stage_av")
		sp = _spalten(conn, "stage_av")
		nbid = _feld(sp, "nbident", "nb_ident", "gemeinde_bfs", "bfsnr")
		nummer = _feld(sp, "nummer", "parzellennummer", "number")
		egrid = _feld(sp, "egris_egrid", "egrid", pflicht=False)
		flaeche = _feld(sp, "flaechenmass", "flaeche", pflicht=False)
		conn.execute("DELETE FROM geo.parzelle WHERE quelle_id = %s", (quelle_id,))
		conn.execute(
			f"""INSERT INTO geo.parzelle (id, kg_nr, gst_nr, bundesland, land, flaeche_m2, flaeche_kat, geom, quelle_id, stand, kennzeichen)
			SELECT 'CH-' || COALESCE({(egrid + '::text') if egrid else 'NULL'}, {nbid}::text || '-' || {nummer}::text), {nbid}::text, {nummer}::text, %(bl)s, 'CH',
			       ST_Area(geom), {(flaeche + '::double precision') if flaeche else 'NULL'}, ST_Multi(geom), %(q)s, %(s)s, {(egrid + '::text') if egrid else 'NULL'}
			FROM geo.stage_av WHERE ST_Area(geom) > 0 ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom, stand = EXCLUDED.stand""",
			{"bl": bundesland, "q": quelle_id, "s": stand},
		)
		conn.execute(
			"""UPDATE geo.parzelle p SET gemeinde = (SELECT g.name FROM geo.verwaltung g WHERE g.ebene='gemeinde' AND ST_Contains(g.geom, ST_PointOnSurface(p.geom)) LIMIT 1),
			  bezirk = (SELECT b.name FROM geo.verwaltung b WHERE b.ebene='bezirk' AND ST_Contains(b.geom, ST_PointOnSurface(p.geom)) LIMIT 1)
			WHERE p.quelle_id = %s AND p.gemeinde IS NULL""",
			(quelle_id,),
		)
		n = conn.execute("SELECT count(*) FROM geo.parzelle WHERE quelle_id = %s", (quelle_id,)).fetchone()[0]
		_stage_weg(conn, "stage_av")
		lauf.fertig(n, stand, f"Kanton: {bundesland}")
		return n


# ------------------------------------------------------------------ Kulisse je Verbund (für ableiten.py)
def kulisse_verbund(conn, geom, land):
	"""Anteile (0–1) eines Verbunds an Korridoren/Kulissen – Gegenstück zu kulisseFuer() in kandidaten.js."""
	if land not in ("DE", "CH"):
		return None
	if land == "CH":
		r = conn.execute(
			"""SELECT
			  COALESCE((SELECT ST_Area(ST_Intersection(%(g)s::geometry, ST_Union(k.geom))) FROM geo.kulisse k WHERE k.land='CH' AND k.art='eignung' AND ST_Intersects(k.geom, %(g)s::geometry)), 0) / ST_Area(%(g)s::geometry),
			  COALESCE((SELECT ST_Area(ST_Intersection(%(g)s::geometry, ST_Union(k.geom))) FROM geo.kulisse k WHERE k.land='CH' AND k.art='fff' AND ST_Intersects(k.geom, %(g)s::geometry)), 0) / ST_Area(%(g)s::geometry),
			  EXISTS (SELECT 1 FROM geo.kulisse k WHERE k.land='CH' AND k.art='vorbelastet' AND ST_Intersects(k.geom, %(g)s::geometry))""",
			{"g": geom},
		).fetchone()
		return {"eignungAnteil": round(float(r[0]), 2), "fffAnteil": round(float(r[1]), 2), "vorbelastet": bool(r[2])}
	r = conn.execute(
		"""WITH a AS (SELECT ST_Area(%(g)s::geometry) AS f),
		  rand AS (SELECT ST_Union(ST_Buffer(v.geom, 500)) AS b FROM geo.verkehr_linie v WHERE ST_DWithin(v.geom, %(g)s::geometry, 500)),
		  priv AS (SELECT ST_Union(ST_Buffer(v.geom, 200)) AS b FROM geo.verkehr_linie v WHERE ST_DWithin(v.geom, %(g)s::geometry, 200)
		           AND (v.art = 'autobahn' OR (v.usage = 'main' AND v.gleise >= 2)))
		SELECT
		  COALESCE(ST_Area(ST_Intersection(%(g)s::geometry, (SELECT b FROM rand))), 0) / (SELECT f FROM a),
		  COALESCE(ST_Area(ST_Intersection(%(g)s::geometry, (SELECT b FROM priv))), 0) / (SELECT f FROM a),
		  COALESCE((SELECT ST_Area(ST_Intersection(%(g)s::geometry, ST_Union(k.geom))) FROM geo.kulisse k WHERE k.land='DE' AND k.art='benachteiligt' AND ST_Intersects(k.geom, %(g)s::geometry)), 0) / (SELECT f FROM a),
		  COALESCE((SELECT ST_Area(ST_Intersection(%(g)s::geometry, ST_Union(k.geom))) FROM geo.kulisse k WHERE k.land='DE' AND k.art='moor' AND ST_Intersects(k.geom, %(g)s::geometry)), 0) / (SELECT f FROM a),
		  COALESCE((SELECT ST_Area(ST_Intersection(%(g)s::geometry, ST_Union(k.geom))) FROM geo.kulisse k WHERE k.land='DE' AND k.art='konversion' AND ST_Intersects(k.geom, %(g)s::geometry)), 0) / (SELECT f FROM a),
		  (SELECT min(ST_Distance(v.geom, %(g)s::geometry)) FROM geo.verkehr_linie v WHERE v.art = 'autobahn' AND ST_DWithin(v.geom, %(g)s::geometry, 600)),
		  (SELECT min(ST_Distance(v.geom, %(g)s::geometry)) FROM geo.verkehr_linie v WHERE v.art = 'schiene' AND ST_DWithin(v.geom, %(g)s::geometry, 600))""",
		{"g": geom},
	).fetchone()
	return {
		"randstreifenAnteil": round(float(r[0]), 2), "privilegiertAnteil": round(float(r[1]), 2), "benachteiligtAnteil": round(float(r[2]), 2),
		"moorAnteil": round(float(r[3]), 2), "konversionAnteil": round(float(r[4]), 2),
		"abstandAutobahnM": round(float(r[5])) if r[5] is not None else None, "abstandSchieneM": round(float(r[6])) if r[6] is not None else None,
	}
