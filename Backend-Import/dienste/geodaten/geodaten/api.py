# REST-API des Geodaten-Dienstes (FastAPI). Nur für den Website-Server (Next.js) – Bearer-Token DIENST_TOKEN,
# zeitkonstanter Vergleich. Rechte der Portal-Nutzer prüft die Website (Backoffice-Bereich „geodaten“), der Dienst
# protokolliert die durchgereichte Konto-ID (Kopfzeile X-Plattform-Nutzer) je Abruf in geo.zugriff.
#
# Vertrag (Antworten wie src/lib/plattform/geodaten/demo.js, Koordinaten WGS84):
#   GET  /v1/gesundheit                                   ohne Token
#   GET  /v1/quellen                                      Lizenzen/Attributionen/Stand
#   GET  /v1/uebersicht                                   Kennzahlen, Gebietslisten (Filter)
#   GET  /v1/kandidaten?bbox=&minHa=&maxTrasseKm=&minScore=&bundesland=&bezirk=&gemeinde=&ampel=&q=&limit=
#   GET  /v1/kandidaten/{id}
#   GET  /v1/umkreis?knoten=<id>&km=<radius>
#   GET  /v1/netzknoten?bbox=&arten=uew,uw110,ms,trafo
#   GET  /v1/ebenen/{schutzgebiete|zonen}?bbox=
#   GET  /v1/suche?q=                                     Gemeinde, KG, Grundstücksnummer, Umspannwerk
#   PUT  /v1/netzkapazitaet/{knotenId}                    { kapazitaet, freiMw, quelle, stand, gepflegtVon }
#   GET  /v1/tiles/{ebene}/{z}/{x}/{y}.pbf                Mapbox Vector Tiles (kandidaten | parzellen | netzknoten)

import hmac
import json
import os
import re

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from psycopg_pool import ConnectionPool

from .quellen import QUELLEN
from .scoring import SCORING_VERSION

TOKEN = os.environ.get("DIENST_TOKEN", "")
if len(TOKEN) < 32:
	raise SystemExit("DIENST_TOKEN fehlt oder ist zu kurz (mindestens 32 Zeichen, siehe .env.example)")

pool = ConnectionPool(os.environ["DATABASE_URL"], min_size=1, max_size=int(os.environ.get("DB_POOL", "8")), open=True)
app = FastAPI(title="ÖkoInvest Geodaten-Dienst", version=SCORING_VERSION, docs_url=None, redoc_url=None, openapi_url=None)

MAX_BBOX_GRAD = 3.0
MAX_LIMIT = 2000


def token_pruefen(authorization: str = Header(default="")):
	erwartet = f"Bearer {TOKEN}"
	if not hmac.compare_digest(authorization.encode(), erwartet.encode()):
		raise HTTPException(status_code=401, detail="Token ungültig")


def bbox_lesen(text):
	if not text:
		return None
	try:
		z = [float(x) for x in text.split(",")]
	except ValueError:
		raise HTTPException(400, "bbox: minLon,minLat,maxLon,maxLat")
	if len(z) != 4 or z[0] >= z[2] or z[1] >= z[3] or z[2] - z[0] > MAX_BBOX_GRAD or z[3] - z[1] > MAX_BBOX_GRAD:
		raise HTTPException(400, f"bbox ungültig oder größer als {MAX_BBOX_GRAD}°")
	return z


def protokoll(conn, request: Request, anzahl):
	conn.execute("INSERT INTO geo.zugriff (pfad, nutzer, anzahl) VALUES (%s, %s, %s)", (request.url.path[:200], (request.headers.get("x-plattform-nutzer") or "")[:60], anzahl))


KANDIDAT_FELDER = """k.id, k.demo, k.flaeche_ha, k.score, k.ampel, k.prioritaet, k.ko, k.kriterien, k.land, k.bundesland, k.bezirk, k.gemeinde,
  k.kompaktheit, k.neigung_grad, k.exposition, k.nutzung, k.siedlung, k.schutz, k.netz, k.umspannwerk, k.widmung, k.kennzahlen, k.parzellen,
  ST_AsGeoJSON(ST_Transform(k.schwerpunkt, 4326), 6), ST_AsGeoJSON(ST_Transform(k.geom, 4326), 6), Box2D(ST_Transform(k.geom, 4326))::text"""


def kandidat_json(conn, r, detail=False):
	(kid, demo, ha, score, ampel, prio, ko, kriterien, land, bl, bez, gem, kompakt, neigung, expo, nutzung, siedlung, schutz, netz, uw, widmung, kz, parz, sp, geo, box) = r
	zahlen = [float(x) for x in re.findall(r"-?\d+\.?\d*", box or "")]
	out = {
		"id": kid, "demo": demo, "ha": ha, "mwp": kz.get("mwp"), "score": score, "ampel": ampel, "prioritaet": prio, "ko": ko, "kriterien": kriterien,
		"schwerpunkt": json.loads(sp)["coordinates"], "bbox": zahlen[:4], "geometrie": json.loads(geo), "land": land, "bundesland": bl, "bezirk": bez, "gemeinde": gem,
		"merkmale": {"kompaktheit": kompakt, "neigungGrad": neigung, "exposition": expo, "nutzung": nutzung, "hauptnutzung": "acker" if (nutzung or {}).get("acker", 0) >= (nutzung or {}).get("gruenland", 0) else "gruenland", "siedlung": siedlung, "schutz": schutz},
		"netz": netz, "umspannwerk": uw, "widmung": widmung, "kennzahlen": {k: v for k, v in kz.items() if k != "agri"}, "kennzahlenAgri": kz.get("agri"),
	}
	if detail:
		zeilen = conn.execute("SELECT id, kg_name, kg_nr, gst_nr, round((flaeche_m2 / 10000)::numeric, 2), nutzung, COALESCE(kultur, '') FROM geo.parzelle WHERE id = ANY(%s) ORDER BY id", (parz,)).fetchall()
		out["parzellen"] = [{"id": z[0], "kg": z[1], "kgNr": z[2], "gstNr": z[3], "ha": float(z[4]), "nutzung": z[5], "kultur": z[6]} for z in zeilen]
		out["kg"] = sorted({z[1] for z in zeilen if z[1]})
	else:
		out["parzellen"] = [{"id": p} for p in parz]
		out["kg"] = []
	return out


@app.get("/v1/gesundheit")
def gesundheit():
	with pool.connection() as conn:
		n = conn.execute("SELECT count(*) FROM geo.kandidat").fetchone()[0]
	return {"ok": True, "version": SCORING_VERSION, "kandidaten": n}


@app.get("/v1/quellen", dependencies=[Depends(token_pruefen)])
def quellen():
	with pool.connection() as conn:
		zeilen = conn.execute("SELECT id, titel, herausgeber, lizenz, attribution, url, stand, importiert_am, anzahl FROM geo.quelle ORDER BY id").fetchall()
	return {"quellen": [{"id": z[0], "titel": z[1], "herausgeber": z[2], "lizenz": z[3], "attribution": z[4], "url": z[5], "stand": z[6].isoformat() if z[6] else None, "importiertAm": z[7].isoformat() if z[7] else None, "anzahl": z[8]} for z in zeilen],
		"basemap": QUELLEN["basemap"]}


@app.get("/v1/uebersicht", dependencies=[Depends(token_pruefen)])
def uebersicht():
	"""Kennzahlen und Gebietslisten für die Filter (aggregiert in SQL, ohne Geometrien)."""
	with pool.connection() as conn:
		k = conn.execute(
			"""SELECT count(*), COALESCE(sum(flaeche_ha), 0), COALESCE(sum((kennzahlen->>'mwp')::numeric), 0),
			          count(*) FILTER (WHERE ampel = 'gruen'), count(*) FILTER (WHERE prioritaet = 'A') FROM geo.kandidat""").fetchone()
		gebiete = {}
		for feld, name in (("bundesland", "bundeslaender"), ("bezirk", "bezirke"), ("gemeinde", "gemeinden")):
			gebiete[name] = [{"name": z[0], "anzahl": z[1]} for z in conn.execute(f"SELECT {feld}, count(*) FROM geo.kandidat WHERE {feld} IS NOT NULL GROUP BY 1 ORDER BY 1").fetchall()]
	return {"version": SCORING_VERSION, "kennzahlen": {"kandidaten": k[0], "ha": round(float(k[1]), 1), "mwp": round(float(k[2]), 1), "gruen": k[3], "prioA": k[4]}, "gebiete": gebiete}


@app.get("/v1/kandidaten", dependencies=[Depends(token_pruefen)])
def kandidaten(request: Request, bbox: str = "", minHa: float = 0, maxTrasseKm: float = 0, minScore: int = 0, bundesland: str = "", bezirk: str = "", gemeinde: str = "",
		ampel: str = "", q: str = Query("", max_length=80), limit: int = 500):
	box = bbox_lesen(bbox)
	bed = ["TRUE"]
	par = {}
	if box:
		bed.append("k.geom && ST_Transform(ST_MakeEnvelope(%(x0)s, %(y0)s, %(x1)s, %(y1)s, 4326), 31287)")
		par.update(x0=box[0], y0=box[1], x1=box[2], y1=box[3])
	if minHa:
		bed.append("k.flaeche_ha >= %(minHa)s")
		par["minHa"] = minHa
	if maxTrasseKm:
		bed.append("(k.netz->>'trasseM')::numeric <= %(tr)s")
		par["tr"] = maxTrasseKm * 1000
	if minScore:
		bed.append("k.score >= %(ms)s")
		par["ms"] = minScore
	for feld, wert in (("bundesland", bundesland), ("bezirk", bezirk), ("gemeinde", gemeinde)):
		if wert:
			bed.append(f"k.{feld} = %({feld})s")
			par[feld] = wert
	if ampel in ("gruen", "gelb", "rot"):
		bed.append("k.ampel = %(ampel)s")
		par["ampel"] = ampel
	if q:
		bed.append("(k.gemeinde ILIKE %(q)s OR k.bezirk ILIKE %(q)s OR k.id ILIKE %(q)s OR EXISTS (SELECT 1 FROM geo.parzelle p WHERE p.id = ANY(k.parzellen) AND (p.kg_name ILIKE %(q)s OR p.kg_nr || ' ' || p.gst_nr ILIKE %(q)s)))")
		par["q"] = f"%{q}%"
	par["limit"] = max(1, min(MAX_LIMIT, limit))
	with pool.connection() as conn:
		zeilen = conn.execute(f"SELECT {KANDIDAT_FELDER} FROM geo.kandidat k WHERE {' AND '.join(bed)} ORDER BY k.score DESC, k.flaeche_ha DESC LIMIT %(limit)s", par).fetchall()
		liste = [kandidat_json(conn, z) for z in zeilen]
		protokoll(conn, request, len(liste))
	return {"kandidaten": liste, "anzahl": len(liste), "version": SCORING_VERSION}


@app.get("/v1/kandidaten/{kid}", dependencies=[Depends(token_pruefen)])
def kandidat(kid: str, request: Request):
	with pool.connection() as conn:
		z = conn.execute(f"SELECT {KANDIDAT_FELDER} FROM geo.kandidat k WHERE k.id = %s", (kid[:80],)).fetchone()
		if not z:
			raise HTTPException(404, "Kandidat nicht gefunden")
		protokoll(conn, request, 1)
		return {"kandidat": kandidat_json(conn, z, detail=True)}


@app.get("/v1/umkreis", dependencies=[Depends(token_pruefen)])
def umkreis(request: Request, knoten: str, km: float = 5, limit: int = 200):
	km = max(0.5, min(30.0, km))
	with pool.connection() as conn:
		k = conn.execute("SELECT geom FROM geo.netzknoten WHERE id = %s", (knoten[:80],)).fetchone()
		if not k:
			raise HTTPException(404, "Netzknoten nicht gefunden")
		zeilen = conn.execute(
			f"SELECT {KANDIDAT_FELDER}, ST_Distance(k.schwerpunkt, %(g)s::geometry) FROM geo.kandidat k WHERE ST_DWithin(k.schwerpunkt, %(g)s::geometry, %(r)s) ORDER BY k.score DESC LIMIT %(l)s",
			{"g": k[0], "r": km * 1000, "l": max(1, min(MAX_LIMIT, limit))}).fetchall()
		liste = [{**kandidat_json(conn, z[:-1]), "abstandZumKnotenM": round(z[-1])} for z in zeilen]
		protokoll(conn, request, len(liste))
	return {"kandidaten": liste, "anzahl": len(liste)}


@app.get("/v1/netzknoten", dependencies=[Depends(token_pruefen)])
def netzknoten(bbox: str = "", arten: str = "uew,uw110,ms,trafo"):
	box = bbox_lesen(bbox)
	a = [x for x in arten.split(",") if x in ("uew", "uw110", "ms", "trafo")]
	with pool.connection() as conn:
		zeilen = conn.execute(
			"""SELECT n.id, n.name, n.art, n.spannung_kv, n.betreiber, COALESCE(k.kapazitaet, 'unbekannt'), k.frei_mw, k.quelle, k.stand, ST_AsGeoJSON(ST_Transform(n.geom, 4326), 5)
			   FROM geo.netzknoten n LEFT JOIN geo.netzkapazitaet k ON k.knoten_id = n.id
			   WHERE n.art = ANY(%(a)s) AND (%(ohne)s OR n.geom && ST_Transform(ST_MakeEnvelope(%(x0)s, %(y0)s, %(x1)s, %(y1)s, 4326), 31287)) LIMIT 20000""",
			{"a": a, "ohne": box is None, "x0": box[0] if box else 0, "y0": box[1] if box else 0, "x1": box[2] if box else 0, "y1": box[3] if box else 0}).fetchall()
	return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": json.loads(z[9]), "properties": {"id": z[0], "name": z[1] or "", "art": z[2], "spannungKv": z[3] or [], "betreiber": z[4] or "", "kapazitaet": z[5], "freiMw": z[6], "kapazitaetQuelle": z[7], "kapazitaetStand": z[8].isoformat() if z[8] else None}} for z in zeilen]}


@app.get("/v1/ebenen/{ebene}", dependencies=[Depends(token_pruefen)])
def ebenen(ebene: str, bbox: str = ""):
	box = bbox_lesen(bbox)
	if not box:
		raise HTTPException(400, "bbox erforderlich")
	tabelle = {"schutzgebiete": ("geo.schutzgebiet", "id, name, art"), "zonen": ("geo.widmungszone", "id, name, art, bundesland")}.get(ebene)
	if not tabelle:
		raise HTTPException(404, "Ebene unbekannt")
	toleranz = max(1.0, (box[2] - box[0]) * 20)  # Meter – grobe Vereinfachung je nach Ausschnitt
	with pool.connection() as conn:
		zeilen = conn.execute(
			f"""SELECT {tabelle[1]}, ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(geom, %(t)s), 4326), 5) FROM {tabelle[0]}
			    WHERE geom && ST_Transform(ST_MakeEnvelope(%(x0)s, %(y0)s, %(x1)s, %(y1)s, 4326), 31287) LIMIT 5000""",
			{"t": toleranz, "x0": box[0], "y0": box[1], "x1": box[2], "y1": box[3]}).fetchall()
	felder = [f.strip() for f in tabelle[1].split(",")]
	return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": json.loads(z[-1]), "properties": dict(zip(felder, z[:-1]))} for z in zeilen]}


@app.get("/v1/suche", dependencies=[Depends(token_pruefen)])
def suche(q: str = Query(..., min_length=2, max_length=80)):
	muster = f"%{q}%"
	treffer = []
	with pool.connection() as conn:
		for z in conn.execute("SELECT ebene, name, kennziffer, ST_X(ST_Transform(ST_PointOnSurface(geom), 4326)), ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326)), Box2D(ST_Transform(geom, 4326))::text FROM geo.verwaltung WHERE name ILIKE %s OR kennziffer = %s ORDER BY similarity(name, %s) DESC LIMIT 8", (muster, q, q)).fetchall():
			treffer.append({"typ": z[0], "label": f"{z[1]} ({z[0]} {z[2]})", "lon": z[3], "lat": z[4], "bbox": [float(x) for x in re.findall(r"-?\d+\.?\d*", z[5])][:4]})
		m = re.match(r"^\s*(\d{5})\s*[-/ ]\s*([\d/.]+)\s*$", q)
		if m:
			for z in conn.execute("SELECT id, kg_name, kg_nr, gst_nr, ST_X(ST_Transform(ST_PointOnSurface(geom), 4326)), ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326)) FROM geo.parzelle WHERE kg_nr = %s AND gst_nr = %s LIMIT 5", (m.group(1), m.group(2))).fetchall():
				treffer.append({"typ": "grundstueck", "label": f"KG {z[2]} {z[1] or ''}, Gst. {z[3]}", "lon": z[4], "lat": z[5], "parzelleId": z[0]})
		for z in conn.execute("SELECT id, name, art, ST_X(ST_Transform(geom, 4326)), ST_Y(ST_Transform(geom, 4326)) FROM geo.netzknoten WHERE name ILIKE %s AND art IN ('uew','uw110','ms') LIMIT 6", (muster,)).fetchall():
			treffer.append({"typ": "netzknoten", "label": z[1], "art": z[2], "knotenId": z[0], "lon": z[3], "lat": z[4]})
	return {"treffer": treffer[:20]}


@app.put("/v1/netzkapazitaet/{knoten_id}", dependencies=[Depends(token_pruefen)])
async def kapazitaet_setzen(knoten_id: str, request: Request):
	d = await request.json()
	kap = d.get("kapazitaet")
	if kap not in ("frei", "knapp", "unbekannt"):
		raise HTTPException(422, "kapazitaet: frei | knapp | unbekannt")
	quelle = str(d.get("quelle") or "").strip()[:200]
	if not quelle:
		raise HTTPException(422, "Quelle der Kapazitätsangabe fehlt")
	with pool.connection() as conn:
		if not conn.execute("SELECT 1 FROM geo.netzknoten WHERE id = %s", (knoten_id[:80],)).fetchone():
			raise HTTPException(404, "Netzknoten nicht gefunden")
		conn.execute(
			"""INSERT INTO geo.netzkapazitaet (knoten_id, kapazitaet, frei_mw, quelle, stand, gepflegt_von) VALUES (%s,%s,%s,%s,%s,%s)
			   ON CONFLICT (knoten_id) DO UPDATE SET kapazitaet=EXCLUDED.kapazitaet, frei_mw=EXCLUDED.frei_mw, quelle=EXCLUDED.quelle, stand=EXCLUDED.stand,
			     gepflegt_von=EXCLUDED.gepflegt_von, gepflegt_am=now()""",
			(knoten_id, kap, d.get("freiMw"), quelle, d.get("stand") or None, str(d.get("gepflegtVon") or "")[:60]))
	# Neuberechnung der betroffenen Kandidaten: nächtlicher Lauf bzw. `cli ableiten --umkreis <knoten>` (siehe README)
	return {"ok": True}


TILE_SQL = {
	"kandidaten": "SELECT id, score, ampel, flaeche_ha AS ha, prioritaet, ST_AsMVTGeom(ST_Transform(geom, 3857), b.env) AS geom FROM geo.kandidat, b WHERE geom && ST_Transform(b.env, 31287)",
	"parzellen": "SELECT id, kg_nr, gst_nr, nutzung, ST_AsMVTGeom(ST_Transform(geom, 3857), b.env) AS geom FROM geo.parzelle, b WHERE geom && ST_Transform(b.env, 31287)",
	"netzknoten": "SELECT id, name, art, ST_AsMVTGeom(ST_Transform(geom, 3857), b.env) AS geom FROM geo.netzknoten, b WHERE geom && ST_Transform(b.env, 31287)",
}
MIN_ZOOM = {"kandidaten": 8, "parzellen": 14, "netzknoten": 7}


@app.get("/v1/tiles/{ebene}/{z}/{x}/{y}.pbf", dependencies=[Depends(token_pruefen)])
def kachel(ebene: str, z: int, x: int, y: int):
	if ebene not in TILE_SQL or not (0 <= z <= 20) or not (0 <= x < 2**z) or not (0 <= y < 2**z):
		raise HTTPException(404, "Kachel unbekannt")
	if z < MIN_ZOOM[ebene]:
		return Response(content=b"", media_type="application/vnd.mapbox-vector-tile")
	with pool.connection() as conn:
		daten = conn.execute(f"WITH b AS (SELECT ST_TileEnvelope(%s, %s, %s) AS env), t AS ({TILE_SQL[ebene]}) SELECT ST_AsMVT(t, %s) FROM t", (z, x, y, ebene)).fetchone()[0]
	return Response(content=bytes(daten or b""), media_type="application/vnd.mapbox-vector-tile", headers={"Cache-Control": "private, max-age=300"})
