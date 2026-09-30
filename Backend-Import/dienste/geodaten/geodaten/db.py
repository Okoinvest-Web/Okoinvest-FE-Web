# Datenbankzugriff (psycopg 3) und gemeinsame Import-Helfer: Quelle registrieren, Prüfsumme, Importlauf,
# ogr2ogr in eine Stage-Tabelle und atomarer Austausch (idempotent: gleiche Prüfsumme → „unveraendert“).

import datetime as dt
import hashlib
import os
import subprocess

from .quellen import QUELLEN

SCHEMA_DATEI = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sql", "001_schema.sql")


def verbindung():
	import psycopg  # nur im Container installiert

	url = os.environ.get("DATABASE_URL")
	if not url:
		raise SystemExit("DATABASE_URL fehlt (siehe .env.example)")
	return psycopg.connect(url, autocommit=False)


def schema_anlegen(conn):
	"""001_schema.sql und alle weiteren sql/NNN_*.sql in Reihenfolge (idempotent; 002 = Deutschland/Schweiz)."""
	ordner = os.path.dirname(SCHEMA_DATEI)
	for name in sorted(x for x in os.listdir(ordner) if x.endswith(".sql")):
		with open(os.path.join(ordner, name), encoding="utf-8") as f:
			conn.execute(f.read())
	conn.commit()


def pruefsumme(*dateien):
	h = hashlib.sha256()
	for p in dateien:
		with open(p, "rb") as f:
			for block in iter(lambda: f.read(1 << 20), b""):
				h.update(block)
	return h.hexdigest()


def quelle_registrieren(conn, quelle_id, stand=None, pruefsumme_wert=None, anzahl=None, hinweis=None):
	q = QUELLEN[quelle_id]
	conn.execute(
		"""INSERT INTO geo.quelle (id, titel, herausgeber, lizenz, attribution, url, stand, importiert_am, pruefsumme, anzahl, hinweis)
		   VALUES (%s,%s,%s,%s,%s,%s,%s,now(),%s,%s,%s)
		   ON CONFLICT (id) DO UPDATE SET titel=EXCLUDED.titel, herausgeber=EXCLUDED.herausgeber, lizenz=EXCLUDED.lizenz,
		     attribution=EXCLUDED.attribution, url=EXCLUDED.url, stand=COALESCE(EXCLUDED.stand, geo.quelle.stand),
		     importiert_am=now(), pruefsumme=EXCLUDED.pruefsumme, anzahl=EXCLUDED.anzahl, hinweis=EXCLUDED.hinweis""",
		(quelle_id, q["titel"], q["herausgeber"], q["lizenz"], q["attribution"], q["url"], stand, pruefsumme_wert, anzahl, hinweis),
	)


class Importlauf:
	"""Kontext für einen Import: protokolliert in geo.importlauf, überspringt unveränderte Eingaben."""

	def __init__(self, conn, quelle_id, dateien, erzwingen=False):
		self.conn, self.quelle_id, self.dateien, self.erzwingen = conn, quelle_id, dateien, erzwingen
		self.summe = pruefsumme(*dateien) if dateien else None
		self.id = None
		self.unveraendert = False

	def __enter__(self):
		alt = self.conn.execute("SELECT pruefsumme FROM geo.quelle WHERE id = %s", (self.quelle_id,)).fetchone()
		self.unveraendert = bool(not self.erzwingen and alt and self.summe and alt[0] == self.summe)
		self.id = self.conn.execute(
			"INSERT INTO geo.importlauf (quelle_id, pruefsumme, status) VALUES (%s, %s, %s) RETURNING id",
			(self.quelle_id, self.summe, "unveraendert" if self.unveraendert else "laeuft"),
		).fetchone()[0]
		self.conn.commit()
		return self

	def fertig(self, anzahl, stand=None, hinweis=None):
		quelle_registrieren(self.conn, self.quelle_id, stand, self.summe, anzahl, hinweis)
		self.conn.execute("UPDATE geo.importlauf SET beendet=now(), status='ok', anzahl=%s WHERE id=%s", (anzahl, self.id))
		self.conn.commit()

	def __exit__(self, typ, wert, tb):
		if typ is not None:
			self.conn.rollback()
			self.conn.execute("UPDATE geo.importlauf SET beendet=now(), status='fehler', meldung=%s WHERE id=%s", (str(wert)[:2000], self.id))
			self.conn.commit()
		elif self.unveraendert:
			self.conn.execute("UPDATE geo.importlauf SET beendet=now() WHERE id=%s", (self.id,))
			self.conn.commit()
		return False


def pg_verbindungstext():
	"""PG:-Verbindungstext für ogr2ogr aus DATABASE_URL – Passwort NICHT in der Kommandozeile (PGPASSWORD, siehe ogr_env)."""
	from urllib.parse import urlparse

	u = urlparse(os.environ["DATABASE_URL"])
	return f"PG:host={u.hostname} port={u.port or 5432} dbname={u.path.lstrip('/')} user={u.username}"


def ogr_env():
	from urllib.parse import unquote, urlparse

	u = urlparse(os.environ["DATABASE_URL"])
	return {**os.environ, "PGPASSWORD": unquote(u.password or "")}


def ogr_nach_stage(datei, stage, *, layer=None, sql=None, where=None, spat=None, s_srs=None, typ="MULTIPOLYGON", extra=()):
	"""ogr2ogr: Datei → geo.<stage> (ersetzt), Ziel-SRS 31287, Geometrien repariert (-makevalid)."""
	cmd = [
		"ogr2ogr", "-f", "PostgreSQL", pg_verbindungstext(), datei,
		"-nln", f"geo.{stage}", "-overwrite", "-lco", "GEOMETRY_NAME=geom", "-lco", "FID=ogc_fid", "-lco", "SPATIAL_INDEX=GIST",
		"-t_srs", "EPSG:31287", "-nlt", typ, "-makevalid", "--config", "PG_USE_COPY", "YES", "-gt", "65536",
	]
	if s_srs:
		cmd += ["-s_srs", s_srs]
	if sql:
		cmd += ["-sql", sql]
	elif layer:
		cmd += [layer]
	if where:
		cmd += ["-where", where]
	if spat:
		cmd += ["-spat", *map(str, spat), "-spat_srs", "EPSG:4326"]
	cmd += list(extra)
	subprocess.run(cmd, check=True, env=ogr_env())


def heute():
	return dt.date.today()
