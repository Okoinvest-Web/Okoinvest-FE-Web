#!/usr/bin/env python3
# Copyright (c) 2026, ÖkoInvest GmbH
#
# EDA-Gateway – Transport der EDA-Marktkommunikation (ebUtilities) zwischen Plattform (Frappe, plattform/api/eg_eda.py) und
# Netzbetreibern. Nur Python-Standardbibliothek (+ optional das System-Programm `openssl` für S/MIME).
#
#   python gateway.py --einmal            # ein Durchlauf: Ausgang abholen → senden → quittieren; Eingang abholen → einliefern
#   python gateway.py                      # Dauerbetrieb (EDA_INTERVALL_S, Standard 60 s)
#   python gateway.py --pruefen            # Konfiguration prüfen (ohne Netzverkehr), Exit-Code 1 bei Fehlern
#
# Adapter (EDA_ADAPTER): email (E-Mail-Anbindung, SMTP/IMAP mit TLS, optional S/MIME), kep (Kommunikationsendpunkt:
# Austauschordner oder HTTPS mit Client-Zertifikat), datei (Ordner – Tests, manuelle Übergabe), simulator (Simulator-
# Netzbetreiber, nur Test/Demo). Fachliche Prüfung (Parser, Automat) macht die Plattform; das Gateway prüft nur Aufbau und
# Größe und protokolliert Message-ID, Code und Prüfsumme – nie Inhalte, nie Zugangsdaten.
#
# Zugangsdaten ausschließlich aus Umgebungsvariablen (siehe .env.example) bzw. Dateien, auf die sie zeigen (Zertifikate,
# Schlüssel). Keine Geheimnisse im Code oder im Log. TLS-Prüfung ist immer an (eigene CA über EDA_CA_DATEI).

import argparse
import hashlib
import importlib.util
import json
import logging
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
LOG = logging.getLogger("eda-gateway")
MAX_BYTES = 8 * 1024 * 1024


def kern_laden(pfad=None):
	"""eg_eda_kern.py (reine Regeln, ohne Frappe) aus der App laden – gleiche Logik wie Plattform und Website."""
	pfad = pfad or os.environ.get("EDA_KERN_PFAD") or os.path.normpath(os.path.join(HIER, "..", "..", "oekoinvest_app", "oekoinvest_app", "plattform", "eg_eda_kern.py"))
	spec = importlib.util.spec_from_file_location("eg_eda_kern", pfad)
	if not spec or not os.path.isfile(pfad):
		raise SystemExit(f"eg_eda_kern.py nicht gefunden ({pfad}) – EDA_KERN_PFAD setzen.")
	mod = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(mod)
	return mod


def pruefsumme(text):
	return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ================================================================ Einstellungen


def einstellungen(env=None):
	env = os.environ if env is None else env
	e = {
		"adapter": (env.get("EDA_ADAPTER") or "datei").strip().lower(),
		"frappe_url": (env.get("EDA_FRAPPE_URL") or "").rstrip("/"),
		"api_key": env.get("EDA_FRAPPE_API_KEY") or "",
		"api_secret": env.get("EDA_FRAPPE_API_SECRET") or "",
		"ca_datei": env.get("EDA_CA_DATEI") or "",
		"intervall": max(10, int(env.get("EDA_INTERVALL_S") or 60)),
		"timeout": max(5, int(env.get("EDA_TIMEOUT_S") or 30)),
		"versuche": max(1, int(env.get("EDA_VERSUCHE") or 4)),
		"ordner": env.get("EDA_ORDNER") or os.path.join(HIER, "daten"),
		"env": env,
	}
	fehler = []
	if e["adapter"] not in ("email", "kep", "datei", "simulator"):
		fehler.append("EDA_ADAPTER: email, kep, datei oder simulator")
	if not e["frappe_url"].startswith("https://") and not env.get("EDA_FRAPPE_HTTP_ERLAUBT"):
		fehler.append("EDA_FRAPPE_URL muss mit https:// beginnen (nur für lokale Tests: EDA_FRAPPE_HTTP_ERLAUBT=1)")
	if not e["api_key"] or not e["api_secret"]:
		fehler.append("EDA_FRAPPE_API_KEY und EDA_FRAPPE_API_SECRET fehlen (API-Benutzer mit Rolle „ÖkoInvest EDA-Gateway“ bzw. „ÖkoInvest API“)")
	if e["ca_datei"] and not os.path.isfile(e["ca_datei"]):
		fehler.append("EDA_CA_DATEI zeigt auf keine Datei")
	e["fehler"] = fehler
	return e


def tls_kontext(ca_datei="", zert=None, schluessel=None):
	ctx = ssl.create_default_context(cafile=ca_datei or None)
	ctx.minimum_version = ssl.TLSVersion.TLSv1_2
	if zert:
		ctx.load_cert_chain(zert, schluessel or None)
	return ctx


# ================================================================ Frappe-Client


class FrappeClient:
	def __init__(self, url, api_key, api_secret, ca_datei="", timeout=30, versuche=4, oeffner=None):
		self.url = url
		self._auth = f"token {api_key}:{api_secret}"
		self.timeout = timeout
		self.versuche = versuche
		self.ctx = tls_kontext(ca_datei) if url.startswith("https://") else None
		self.oeffner = oeffner or urllib.request.urlopen

	def methode(self, name, **daten):
		body = json.dumps({"daten": daten}).encode("utf-8")
		ziel = f"{self.url}/api/method/oekoinvest_app.plattform.api.eg_eda.{name}"
		warte = 2
		for versuch in range(1, self.versuche + 1):
			req = urllib.request.Request(ziel, data=body, method="POST", headers={"Content-Type": "application/json", "Authorization": self._auth, "Accept": "application/json"})
			try:
				kw = {"timeout": self.timeout}
				if self.ctx is not None:
					kw["context"] = self.ctx
				with self.oeffner(req, **kw) as r:
					return (json.loads(r.read().decode("utf-8") or "{}") or {}).get("message")
			except urllib.error.HTTPError as e:
				if e.code < 500 or versuch == self.versuche:
					raise RuntimeError(f"Frappe {name}: HTTP {e.code}") from None
			except (urllib.error.URLError, TimeoutError, OSError) as e:
				if versuch == self.versuche:
					raise RuntimeError(f"Frappe {name}: nicht erreichbar ({type(e).__name__})") from None
			time.sleep(warte)
			warte = min(warte * 2, 60)
		return None


# ================================================================ Durchlauf


def durchlauf(client, adapter):
	"""Ausgang senden, Eingang einliefern. Liefert Zähler (für Log und Tests)."""
	z = {"gesendet": 0, "fehler": 0, "eingang": 0, "doppelt": 0, "abgelehnt": 0}
	ausgang = (client.methode("ausgang", limit=50) or {}).get("nachrichten") or []
	for n in ausgang:
		roh = n.get("rohinhalt") or ""
		try:
			if not roh or len(roh) > MAX_BYTES:
				raise ValueError("Rohinhalt fehlt oder zu groß")
			adapter.senden(n)
			client.methode("ausgang_quittung", nachrichtId=n["id"], status="gesendet")
			z["gesendet"] += 1
			LOG.info("gesendet %s %s sha256=%s", n.get("nachrichtencode"), n.get("messageId"), pruefsumme(roh)[:16])
		except Exception as e:  # noqa: BLE001 – Fehler wird quittiert, Plattform wiederholt per Fristenlauf
			z["fehler"] += 1
			LOG.warning("Senden fehlgeschlagen %s: %s", n.get("messageId"), type(e).__name__)
			try:
				client.methode("ausgang_quittung", nachrichtId=n["id"], status="fehler", fehler=f"Gateway: {type(e).__name__}")
			except RuntimeError:
				LOG.warning("Quittung nicht möglich %s", n.get("messageId"))
	for eintrag in adapter.empfangen():
		xml, quittieren = eintrag
		if len(xml) > MAX_BYTES:
			LOG.warning("Eingang verworfen: zu groß")
			quittieren(False)
			continue
		try:
			r = client.methode("nachricht_eingang", xml=xml, quelle=adapter.kanal) or {}
			if r.get("doppelt"):
				z["doppelt"] += 1
			elif r.get("ok"):
				z["eingang"] += 1
			else:
				z["abgelehnt"] += 1
			quittieren(True)
			LOG.info("eingang %s sha256=%s", "doppelt" if r.get("doppelt") else ("ok" if r.get("ok") else "ungültig"), pruefsumme(xml)[:16])
		except RuntimeError as e:
			LOG.warning("Eingang nicht eingeliefert (bleibt im Postfach): %s", e)
			quittieren(False)
	getattr(adapter, "abschliessen", lambda: None)()
	return z


def adapter_erzeugen(e, kern=None):
	import adapter as A

	if e["adapter"] == "datei":
		return A.DateiAdapter(e["ordner"])
	if e["adapter"] == "simulator":
		return A.SimulatorAdapter(e["ordner"], kern or kern_laden(), e["env"])
	if e["adapter"] == "email":
		return A.EmailAdapter(e["env"], ca_datei=e["ca_datei"])
	return A.KepAdapter(e["env"], ca_datei=e["ca_datei"])


def main(argv=None):
	logging.basicConfig(level=os.environ.get("EDA_LOGLEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
	p = argparse.ArgumentParser(description="EDA-Gateway (ebUtilities-Transport)")
	p.add_argument("--einmal", action="store_true")
	p.add_argument("--pruefen", action="store_true")
	a = p.parse_args(argv)
	e = einstellungen()
	try:
		adapter = adapter_erzeugen(e)
		e["fehler"] += adapter.pruefen()
	except Exception as x:  # noqa: BLE001
		e["fehler"].append(f"Adapter {e['adapter']}: {x}")
	if e["fehler"]:
		for f in e["fehler"]:
			LOG.error("Konfiguration: %s", f)
		return 1
	if a.pruefen:
		LOG.info("Konfiguration in Ordnung (Adapter %s)", e["adapter"])
		return 0
	client = FrappeClient(e["frappe_url"], e["api_key"], e["api_secret"], e["ca_datei"], e["timeout"], e["versuche"])
	while True:
		try:
			z = durchlauf(client, adapter)
			LOG.info("Durchlauf: %s", json.dumps(z))
		except RuntimeError as x:
			LOG.warning("Durchlauf abgebrochen: %s", x)
		if a.einmal:
			return 0
		time.sleep(e["intervall"])


if __name__ == "__main__":
	sys.exit(main())
