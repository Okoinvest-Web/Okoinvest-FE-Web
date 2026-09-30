#!/usr/bin/env python3
# Copyright (c) 2026, ÖkoInvest GmbH
#
# CAD-Konverter (DWG → DXF, optional DWG → SVG) als kleiner HTTP-Dienst – nur Python-Standardbibliothek.
#
#   POST /v1/konvertieren?ziel=dxf|svg   Rumpf = DWG-Datei (application/octet-stream), Kopfzeile Authorization: Bearer <Token>
#        200 → DXF (text/plain; charset=…) bzw. SVG; 400/401/413/415/422/429/500/504 → JSON {"fehler": "…"}
#   GET  /gesund                          {"ok": true, "modus": "libredwg"|"oda", "werkzeug": "<Version>"} (ohne Token)
#
# Konvertierung als SEPARATER PROZESS (kein Linken gegen GPL-Bibliotheken): LibreDWG `dwg2dxf`/`dwg2SVG` (Standard) oder
# ODA File Converter (KONVERTER=oda, siehe README – Lizenz prüfen). Schutz: Token (zeitkonstanter Vergleich), Größenlimit,
# Zeitlimit, Speicher-/CPU-/Datei-Limits je Prozess (setrlimit), eigener Temp-Ordner je Auftrag, keine Shell, höchstens
# KONVERTER_PARALLEL Aufträge gleichzeitig. Keine Inhalte und keine Token im Log. Netz/Nicht-root: Container (docker-compose.yml).
#
# Umgebung:
#   KONVERTER_TOKEN      Pflicht, ≥ 32 Zeichen (identisch mit CAD_KONVERTER_TOKEN der Website bzw. cad_konverter_token in Frappe)
#   KONVERTER            libredwg (Standard) | oda
#   KONVERTER_MAX_MB     Größenlimit Eingabe (Standard 30)
#   KONVERTER_ZEIT_S     Zeitlimit je Konvertierung in Sekunden (Standard 90)
#   KONVERTER_SPEICHER_MB Adressraum je Konvertierungsprozess (Standard 1536)
#   KONVERTER_PARALLEL   gleichzeitige Aufträge (Standard 2)
#   KONVERTER_PORT       Standard 8080
#   ODA_BEFEHL           Pfad zum ODA File Converter (Standard ODAFileConverter, headless über xvfb-run)

import hmac
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

MB = 1024 * 1024
LOG = logging.getLogger("cad-konverter")
DWG_KENNUNG = re.compile(rb"^AC10\d\d")
DXF_KENNUNG = re.compile(rb"^\s*(999\s*[\r\n]+[^\r\n]*[\r\n]+\s*)*0\s*[\r\n]+\s*SECTION")


def einstellungen(env=None):
	env = os.environ if env is None else env
	token = env.get("KONVERTER_TOKEN", "")
	if len(token) < 32:
		raise SystemExit("KONVERTER_TOKEN fehlt oder ist kürzer als 32 Zeichen.")
	modus = env.get("KONVERTER", "libredwg").strip().lower()
	if modus not in ("libredwg", "oda"):
		raise SystemExit("KONVERTER muss libredwg oder oda sein.")
	return {
		"token": token,
		"modus": modus,
		"max_bytes": int(env.get("KONVERTER_MAX_MB", "30")) * MB,
		"zeit_s": int(env.get("KONVERTER_ZEIT_S", "90")),
		"speicher_mb": int(env.get("KONVERTER_SPEICHER_MB", "1536")),
		"parallel": max(1, int(env.get("KONVERTER_PARALLEL", "2"))),
		"port": int(env.get("KONVERTER_PORT", "8080")),
		"oda": env.get("ODA_BEFEHL", "ODAFileConverter"),
	}


def token_ok(kopf, token):
	"""Authorization: Bearer <token> – zeitkonstanter Vergleich."""
	if not kopf or not kopf.startswith("Bearer "):
		return False
	return hmac.compare_digest(kopf[7:].strip().encode(), token.encode())


def _grenzen(speicher_mb, zeit_s):
	"""preexec_fn: Ressourcen-Limits für den Konvertierungsprozess (nur Linux/Unix)."""

	def setzen():
		import resource

		resource.setrlimit(resource.RLIMIT_AS, (speicher_mb * MB, speicher_mb * MB))
		resource.setrlimit(resource.RLIMIT_CPU, (zeit_s, zeit_s + 5))
		resource.setrlimit(resource.RLIMIT_FSIZE, (256 * MB, 256 * MB))
		resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
		resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
		os.setsid()

	return setzen if os.name == "posix" else None


def befehl(e, ziel, eingabe, ausgabe_ordner):
	"""Befehlszeile (Liste, keine Shell) für LibreDWG bzw. ODA."""
	if e["modus"] == "libredwg":
		if ziel == "svg":
			return ["dwg2SVG", eingabe], os.path.join(ausgabe_ordner, "plan.svg"), True  # schreibt auf stdout
		return ["dwg2dxf", "-y", "-o", os.path.join(ausgabe_ordner, "plan.dxf"), eingabe], os.path.join(ausgabe_ordner, "plan.dxf"), False
	# ODA File Converter: <Eingabeordner> <Ausgabeordner> <Version> <Typ> <Rekursiv> <Audit> [Filter]
	if ziel != "dxf":
		raise ValueError("ODA liefert nur DXF/DWG.")
	cmd = [e["oda"], os.path.dirname(eingabe), ausgabe_ordner, "ACAD2018", "DXF", "0", "1", "*.dwg"]
	if shutil.which("xvfb-run"):
		cmd = ["xvfb-run", "-a"] + cmd
	return cmd, os.path.join(ausgabe_ordner, "plan.dxf"), False


def konvertieren(e, daten, ziel="dxf"):
	"""→ (status, bytes|fehlertext, mime)"""
	if ziel not in ("dxf", "svg"):
		return 400, "Ziel muss dxf oder svg sein.", None
	if not daten:
		return 422, "Leere Datei.", None
	if len(daten) > e["max_bytes"]:
		return 413, f"Datei größer als {e['max_bytes'] // MB} MB.", None
	if not DWG_KENNUNG.match(daten[:6]):
		return 415, "Keine DWG-Datei (Kennung AC10xx fehlt).", None
	with tempfile.TemporaryDirectory(prefix="dwg-") as tmp:
		ein_ordner = os.path.join(tmp, "ein")
		aus_ordner = os.path.join(tmp, "aus")
		os.makedirs(ein_ordner)
		os.makedirs(aus_ordner)
		eingabe = os.path.join(ein_ordner, "plan.dwg")
		with open(eingabe, "wb") as f:
			f.write(daten)
		cmd, ausgabe, stdout_ausgabe = befehl(e, ziel, eingabe, aus_ordner)
		start = time.monotonic()
		try:
			r = subprocess.run(
				cmd, cwd=tmp, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=e["zeit_s"], check=False,
				env={"PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"), "LD_LIBRARY_PATH": os.environ.get("LD_LIBRARY_PATH", ""), "HOME": tmp, "LANG": "C.UTF-8"},
				preexec_fn=_grenzen(e["speicher_mb"], e["zeit_s"]),  # noqa: PLW1509 – bewusst: Limits vor exec
			)
		except subprocess.TimeoutExpired:
			return 504, f"Zeitlimit von {e['zeit_s']} s überschritten.", None
		except FileNotFoundError:
			return 500, "Konvertierungswerkzeug nicht installiert.", None
		dauer = time.monotonic() - start
		if stdout_ausgabe and r.stdout:
			with open(ausgabe, "wb") as f:
				f.write(r.stdout)
		if e["modus"] == "oda" and not os.path.exists(ausgabe):
			kandidaten = [x for x in os.listdir(aus_ordner) if x.lower().endswith(".dxf")]
			ausgabe = os.path.join(aus_ordner, kandidaten[0]) if kandidaten else ausgabe
		if not os.path.exists(ausgabe) or os.path.getsize(ausgabe) == 0:
			LOG.warning("Konvertierung ohne Ergebnis (Exit %s, %.1f s)", r.returncode, dauer)
			return 422, "Die DWG-Datei konnte nicht konvertiert werden (Version oder Datei beschädigt).", None
		with open(ausgabe, "rb") as f:
			erg = f.read()
		if ziel == "dxf" and not DXF_KENNUNG.match(erg[:400]):
			return 422, "Das Ergebnis ist keine gültige ASCII-DXF.", None
		LOG.info("Konvertiert %s → %s: %d → %d Byte in %.1f s (Exit %s)", "DWG", ziel.upper(), len(daten), len(erg), dauer, r.returncode)
		return 200, erg, "image/svg+xml" if ziel == "svg" else "application/dxf"


def werkzeug_version(e):
	try:
		if e["modus"] == "libredwg":
			r = subprocess.run(["dwg2dxf", "--version"], capture_output=True, timeout=10, check=False)
			return (r.stdout or r.stderr).decode(errors="replace").strip().splitlines()[0][:80]
		return "ODA File Converter"
	except (OSError, subprocess.SubprocessError, IndexError):
		return "nicht gefunden"


def handler_klasse(e):
	sperre = threading.BoundedSemaphore(e["parallel"])

	class Handler(BaseHTTPRequestHandler):
		server_version = "cad-konverter"
		sys_version = ""

		def log_message(self, fmt, *args):  # Zugriffsprotokoll ohne Kopfzeilen/Inhalte
			LOG.info("%s %s", self.address_string(), fmt % args)

		def _json(self, status, daten):
			rumpf = json.dumps(daten, ensure_ascii=False).encode()
			self.send_response(status)
			self.send_header("Content-Type", "application/json; charset=utf-8")
			self.send_header("Content-Length", str(len(rumpf)))
			self.send_header("Cache-Control", "no-store")
			self.end_headers()
			self.wfile.write(rumpf)

		def do_GET(self):  # noqa: N802
			if urlparse(self.path).path == "/gesund":
				return self._json(200, {"ok": True, "modus": e["modus"], "werkzeug": werkzeug_version(e)})
			return self._json(404, {"fehler": "Nicht gefunden."})

		def do_POST(self):  # noqa: N802
			url = urlparse(self.path)
			if url.path != "/v1/konvertieren":
				return self._json(404, {"fehler": "Nicht gefunden."})
			if not token_ok(self.headers.get("Authorization"), e["token"]):
				return self._json(401, {"fehler": "Nicht berechtigt."})
			try:
				laenge = int(self.headers.get("Content-Length") or 0)
			except ValueError:
				return self._json(400, {"fehler": "Content-Length fehlt."})
			if laenge <= 0:
				return self._json(422, {"fehler": "Leere Datei."})
			if laenge > e["max_bytes"]:
				return self._json(413, {"fehler": f"Datei größer als {e['max_bytes'] // MB} MB."})
			if not sperre.acquire(timeout=5):
				return self._json(429, {"fehler": "Zu viele gleichzeitige Konvertierungen – bitte später erneut."})
			try:
				daten = self.rfile.read(laenge)
				ziel = (parse_qs(url.query).get("ziel") or ["dxf"])[0]
				status, erg, mime = konvertieren(e, daten, ziel)
			except Exception:  # noqa: BLE001 – keine Interna an den Aufrufer
				LOG.exception("Unerwarteter Fehler")
				status, erg, mime = 500, "Interner Fehler.", None
			finally:
				sperre.release()
			if status != 200:
				return self._json(status, {"fehler": erg})
			self.send_response(200)
			self.send_header("Content-Type", mime)
			self.send_header("Content-Length", str(len(erg)))
			self.send_header("Cache-Control", "no-store")
			self.send_header("X-Content-Type-Options", "nosniff")
			self.end_headers()
			self.wfile.write(erg)

	return Handler


def main():
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", stream=sys.stdout)
	e = einstellungen()
	server = ThreadingHTTPServer(("0.0.0.0", e["port"]), handler_klasse(e))  # noqa: S104 – nur im internen Docker-Netz erreichbar
	LOG.info("CAD-Konverter (%s, %s) auf Port %d", e["modus"], werkzeug_version(e), e["port"])
	server.serve_forever()


if __name__ == "__main__":
	main()
