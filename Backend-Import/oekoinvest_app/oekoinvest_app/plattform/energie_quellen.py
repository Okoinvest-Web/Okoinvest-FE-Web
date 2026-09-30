# Copyright (c) 2026, ÖkoInvest GmbH
#
# Marktdaten der Energiebeschaffung – Abruf und Speicherung.
#
# Spot (Day-Ahead) DE-LU und AT: Energy-Charts (Fraunhofer ISE), https://api.energy-charts.info/price?bzn=DE-LU|AT&start=&end=
#   Lizenz laut API-Beschreibung (Stand 09/2026): Daten dieser Gebotszonen „CC BY 4.0 from Bundesnetzagentur | SMARD.de“ –
#   Quelle bei jeder Darstellung nennen. Seit 01.10.2025 Viertelstundenauflösung. Scheduler täglich (hooks.py):
#   spot_taeglich() holt die letzten 3 Tage und den Folgetag (idempotent, ein Wert je Zone und Zeitpunkt).
#   Nachladen der Historie einmalig: bench --site … execute oekoinvest_app.plattform.energie_quellen.historie_laden --kwargs "{'tage': 400}"
#
# Terminmarkt (EEX Cal/Q/M Base/Peak): KEIN automatischer Abruf – EEX-Daten sind lizenzpflichtig (EEX Group DataSource).
#   Einspielung über das Portal (manuell/CSV mit Quelle) oder einen lizenzierten Feed, der Plattform Marktpreis Termin befüllt.
#
# site_config (optional): oekoinvest_energy_charts_url (Standard https://api.energy-charts.info), oekoinvest_spot_abruf (0 = aus)

from datetime import datetime, timedelta, timezone

import frappe

QUELLE = "Energy-Charts (Fraunhofer ISE), Day-Ahead"
LIZENZ = "CC BY 4.0 – Daten der Gebotszonen DE-LU und AT: Bundesnetzagentur | SMARD.de, abgerufen über api.energy-charts.info"
BZN = {"DE": "DE-LU", "AT": "AT"}
DT = "Plattform Marktpreis Spot"


def _basis():
	return (frappe.conf.get("oekoinvest_energy_charts_url") or "https://api.energy-charts.info").rstrip("/")


def abrufen(zone, von, bis):
	"""Preise einer Zone von–bis (JJJJ-MM-TT) → [(utc_sekunden, eur_mwh)], Lizenztext. Zeitlimit, TLS-Prüfung, Wiederholung."""
	import requests

	url = f"{_basis()}/price"
	letzter = None
	for versuch in range(3):
		try:
			r = requests.get(url, params={"bzn": BZN[zone], "start": von, "end": bis}, timeout=(5, 30), headers={"Accept": "application/json", "User-Agent": "oekoinvest-handelsdesk"})
			r.raise_for_status()
			j = r.json()
			werte = [(int(s), float(p)) for s, p in zip(j.get("unix_seconds") or [], j.get("price") or []) if p is not None]
			return werte, str(j.get("license_info") or LIZENZ)[:300]
		except Exception as e:  # noqa: BLE001 – Netzwerk/Format; nach 3 Versuchen protokollieren
			letzter = e
			import time

			time.sleep(2 * (versuch + 1))
	raise frappe.ValidationError(f"Energy-Charts nicht erreichbar ({str(letzter)[:120]})")


def speichern(zone, werte, lizenz=LIZENZ):
	"""Werte idempotent speichern (vorhandene Zeitpunkte werden aktualisiert). → Anzahl neu/aktualisiert."""
	if not werte:
		return 0, 0
	schritt = min((b[0] - a[0] for a, b in zip(werte, werte[1:]) if b[0] > a[0]), default=3600)
	neu = geaendert = 0
	for ts, preis in werte:
		beginn = datetime.fromtimestamp(ts, timezone.utc).replace(tzinfo=None)
		name = frappe.db.get_value(DT, {"zone": zone, "beginn": beginn}, "name")
		if name:
			if abs(float(frappe.db.get_value(DT, name, "preis_eur_mwh") or 0) - preis) > 1e-6:
				frappe.db.set_value(DT, name, "preis_eur_mwh", preis, update_modified=False)
				geaendert += 1
			continue
		frappe.get_doc({"doctype": DT, "zone": zone, "beginn": beginn, "aufloesung_min": int(schritt // 60), "preis_eur_mwh": preis, "quelle": QUELLE, "lizenz": lizenz}).insert(ignore_permissions=True)
		neu += 1
	return neu, geaendert


def spot_taeglich():
	"""Scheduler (täglich): letzte 3 Tage und Folgetag je Zone nachladen."""
	if str(frappe.conf.get("oekoinvest_spot_abruf", "1")) == "0":
		return
	heute = datetime.now(timezone.utc).date()
	for zone in BZN:
		try:
			werte, lizenz = abrufen(zone, str(heute - timedelta(days=3)), str(heute + timedelta(days=2)))
			neu, geaendert = speichern(zone, werte, lizenz)
			frappe.db.commit()
			frappe.logger("oekoinvest").info(f"Spotpreise {zone}: {neu} neu, {geaendert} aktualisiert")
		except Exception:  # noqa: BLE001
			frappe.log_error(title=f"Energie: Spotpreise {zone}", message=frappe.get_traceback())


def historie_laden(tage=400):
	"""Einmalig: Historie in Monatsblöcken laden (für Kennzahlen, Stundenform, Kundenanalyse)."""
	heute = datetime.now(timezone.utc).date()
	start = heute - timedelta(days=int(tage))
	for zone in BZN:
		d = start
		while d <= heute:
			bis = min(d + timedelta(days=31), heute + timedelta(days=1))
			werte, lizenz = abrufen(zone, str(d), str(bis))
			speichern(zone, werte, lizenz)
			frappe.db.commit()
			d = bis


def stunden(zone, tage=400):
	"""Gespeicherte Werte der letzten `tage` Tage als Stundenmittel [{t (ms), eurMwh}] + Original ab vorgestern."""
	von = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=int(tage))
	rows = frappe.get_all(DT, filters={"zone": zone, "beginn": [">=", von]}, fields=["beginn", "preis_eur_mwh", "aufloesung_min"], order_by="beginn asc", limit_page_length=0)
	je = {}
	roh = []
	grenze = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
	for r in rows:
		ts = int(r.beginn.replace(tzinfo=timezone.utc).timestamp())
		h = ts - ts % 3600
		s, n = je.get(h, (0.0, 0))
		je[h] = (s + float(r.preis_eur_mwh), n + 1)
		if r.beginn >= grenze:
			roh.append({"t": ts * 1000, "eurMwh": float(r.preis_eur_mwh)})
	aufl = rows[-1].aufloesung_min if rows else 60
	return {
		"zone": zone,
		"quelle": "energycharts" if rows else "leer",
		"quelleLabel": QUELLE,
		"lizenz": LIZENZ,
		"aufloesungMin": aufl,
		"stunden": [{"t": h * 1000, "eurMwh": round(s / n, 2)} for h, (s, n) in sorted(je.items())],
		"aktuell": roh,
		"stand": datetime.now(timezone.utc).isoformat(),
		"fehler": None if rows else "Noch keine Spotpreise gespeichert – historie_laden ausführen bzw. Scheduler prüfen.",
	}
