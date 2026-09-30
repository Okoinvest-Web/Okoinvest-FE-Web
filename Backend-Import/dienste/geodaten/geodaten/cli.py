# Kommandozeile des Geodaten-Dienstes (im Container: docker compose run --rm geodaten python -m geodaten.cli …)
#
#   schema                          Datenmodell anlegen (idempotent)
#   import <schritt> --datei … [--stand JJJJ-MM-TT] [--bundesland …] [--erzwingen]
#       schritte: vgd | dkm | invekos | osm | natura2000 | schutz | dgm | zonen | gebaeude
#   ableiten [--bezirk …]           Nutzung, Kandidaten, Scoring (je Bezirk)
#   demo [--verzeichnis demo]       Demo-Datensatz laden und Kandidaten berechnen
#   quellen                         Quellen mit Lizenz/Stand ausgeben

import argparse
import datetime as dt

from . import ableiten, importe
from .db import schema_anlegen, verbindung


def datum(text):
	return dt.date.fromisoformat(text) if text else None


def main(argv=None):
	p = argparse.ArgumentParser(prog="geodaten")
	sub = p.add_subparsers(dest="befehl", required=True)
	sub.add_parser("schema")
	i = sub.add_parser("import")
	i.add_argument("schritt", choices=["vgd", "dkm", "invekos", "osm", "natura2000", "schutz", "dgm", "zonen", "gebaeude"])
	i.add_argument("--datei", required=True)
	i.add_argument("--stand")
	i.add_argument("--bundesland")
	i.add_argument("--quelle")
	i.add_argument("--art")
	i.add_argument("--jahr")
	i.add_argument("--erzwingen", action="store_true")
	a = sub.add_parser("ableiten")
	a.add_argument("--bezirk")
	d = sub.add_parser("demo")
	d.add_argument("--verzeichnis", default="demo")
	sub.add_parser("quellen")
	args = p.parse_args(argv)

	conn = verbindung()
	schema_anlegen(conn)
	if args.befehl == "schema":
		print("Schema angelegt.")
	elif args.befehl == "import":
		st, e = datum(args.stand), args.erzwingen
		schritte = {
			"vgd": lambda: importe.import_vgd(conn, args.datei, st, e),
			"dkm": lambda: importe.import_dkm(conn, args.datei, st, args.bundesland, e),
			"invekos": lambda: importe.import_invekos(conn, args.datei, st, args.jahr, e),
			"osm": lambda: importe.import_osm(conn, args.datei, e),
			"natura2000": lambda: importe.import_natura2000(conn, args.datei, st, e),
			"schutz": lambda: importe.import_schutz(conn, args.datei, st, args.quelle or "uba_schutzgebiete", e),
			"dgm": lambda: importe.import_dgm(conn, args.datei, st, e),
			"zonen": lambda: importe.import_zonen(conn, args.datei, args.quelle, args.bundesland, args.art, st, e),
			"gebaeude": lambda: importe.import_gebaeude(conn, args.datei, args.quelle or "bev_dlm_bauwerke", st, e),
		}
		if args.schritt == "zonen" and not (args.quelle and args.bundesland and args.art):
			raise SystemExit("zonen: --quelle, --bundesland und --art angeben (z. B. noe_pv_zonen, Niederösterreich, noe_pv_zone)")
		n = schritte[args.schritt]()
		print(f"{args.schritt}: {n} Datensätze" + (" (unverändert – übersprungen)" if n == 0 else ""))
	elif args.befehl == "ableiten":
		print(f"Kandidaten gesamt: {ableiten.alles(conn, args.bezirk)}")
	elif args.befehl == "demo":
		n = importe.import_demo(conn, args.verzeichnis)
		print(f"Demo-Parzellen: {n}")
		print(f"Kandidaten gesamt: {ableiten.alles(conn)}")
	elif args.befehl == "quellen":
		for z in conn.execute("SELECT id, lizenz, stand, anzahl, attribution FROM geo.quelle ORDER BY id").fetchall():
			print(f"{z[0]:24} {z[1]:14} Stand {str(z[2] or '–'):10} {z[3] or 0:>10}  {z[4]}")


if __name__ == "__main__":
	main()
