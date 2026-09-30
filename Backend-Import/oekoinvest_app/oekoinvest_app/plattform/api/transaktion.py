# Copyright (c) 2026, ÖkoInvest GmbH
#
# Deal-Pipeline (Team 8, Transaktion) – Referenz: src/lib/plattform/backend/demo/transaktion.js, Logik: transaktion_kern.py.
# Liest Projekte, Interessen, Bieterverfahren/Gebote und Closing-Räume; eigene Daten nur die Prognose je Projekt
# (Plattform Deal Prognose).
#
# Rechte (rechte.py): lesen Bereich „projekte“ ≥ 1, Prognose ändern „projekte“ = 2 (Leitung, Transaktion).

import frappe
from frappe.utils import now_datetime

from oekoinvest_app.plattform import transaktion_kern as T
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.kern import aus_json, ist_admin, iso, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

PR = "Plattform Deal Prognose"


def _lesen(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "projekte") >= 1):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Lesen.")


def _projekt(p):
	return {"id": p.name, "titel": p.titel, "status": p.status, "land": p.land, "typ": p.typ, "mwp": p.mwp, "preis": p.preis, "preisProKwp": p.preis_pro_kwp, "kaufpreis": p.kaufpreis,
		"provisionSatz": p.provision_satz, "erstelltAm": iso(p.creation), "geaendertAm": iso(p.modified)}


def _karten(land="", phase=""):
	heute = L.heute()
	prognosen = {x.projekt_id: {"wahrscheinlichkeit": int(x.wahrscheinlichkeit) if str(x.wahrscheinlichkeit or "").isdigit() else None, "closingErwartet": x.closing_erwartet or "", "notiz": x.notiz or "", "vonName": name_von(x.von_id) if x.von_id else "", "am": iso(x.modified)}
		for x in frappe.get_all(PR, fields=["projekt_id", "wahrscheinlichkeit", "closing_erwartet", "notiz", "von_id", "modified"], limit_page_length=0)}
	filters = {"status": ["in", ["pruefung", "veroeffentlicht", "reserviert", "verkauft"]]}
	if land in ("AT", "DE", "CH"):
		filters["land"] = land
	aus = []
	for p in frappe.get_all("Plattform Projekt", filters=filters, fields=["name", "titel", "status", "land", "typ", "mwp", "preis", "preis_pro_kwp", "kaufpreis", "provision_satz", "creation", "modified", "zustaendig_id"], limit_page_length=0):
		interessen = [{"status": i.status, "loi": aus_json(i.loi, None), "geaendertAm": iso(i.modified)} for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name}, fields=["status", "loi", "modified"], limit_page_length=0)]
		vf = frappe.get_all("Plattform Bieterverfahren", filters={"projekt_id": p.name, "status": ["!=", "abgebrochen"]}, fields=["name", "status"], order_by="creation desc", limit_page_length=1)
		cl = frappe.get_all("Plattform Closing", filters={"projekt_id": p.name, "status": ["!=", "abgebrochen"]}, fields=["name", "status", "kaufpreis", "modified"], order_by="creation desc", limit_page_length=1)
		gebote = [{"status": g.status, "preis": g.preis, "preisProKwp": g.preis_pro_kwp} for g in frappe.get_all("Plattform Gebot", filters={"projekt_id": p.name}, fields=["status", "preis", "preis_pro_kwp"], limit_page_length=0)]
		k = T.deal_karte(_projekt(p), interessen, {"id": vf[0].name, "status": vf[0].status} if vf else None,
			{"id": cl[0].name, "status": cl[0].status, "kaufpreis": cl[0].kaufpreis, "geaendertAm": iso(cl[0].modified)} if cl else None, gebote, prognosen.get(p.name), heute)
		if k and (not phase or k["phase"] == phase):
			aus.append({**k, "zustaendig": name_von(p.zustaendig_id) if p.zustaendig_id else ""})
	return aus


@frappe.whitelist(methods=["POST"])
def pipeline(land=None, phase=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	karten = _karten(land or "", phase or "")
	return {"heute": L.heute(), "darfSchreiben": stufe(n, "projekte") >= 2, "phasen": T.PHASEN, **T.pipeline_auswerten(karten), "karten": karten}


@frappe.whitelist(methods=["POST"])
def prognose(projekt_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	if stufe(n, "projekte") < 2:
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Schreiben.")
	pid = v.kennung(projekt_id)
	if not pid or not frappe.db.exists("Plattform Projekt", pid):
		nicht_gefunden("Projekt nicht gefunden.")
	try:
		o = T.override_pruefen(aus_json(daten, {}) or {})
	except ValueError as e:
		ungueltig(str(e))
	name = frappe.db.get_value(PR, {"projekt_id": pid}, "name")
	leer = o["wahrscheinlichkeit"] is None and not o["closingErwartet"] and not o["notiz"]
	if leer and name:
		frappe.delete_doc(PR, name, ignore_permissions=True, force=True)
	elif not leer:
		werte = {"wahrscheinlichkeit": "" if o["wahrscheinlichkeit"] is None else str(o["wahrscheinlichkeit"]), "closing_erwartet": o["closingErwartet"], "notiz": o["notiz"], "von_id": n.id}
		if name:
			frappe.db.set_value(PR, name, werte)
		else:
			frappe.get_doc({"doctype": PR, "projekt_id": pid, **werte}).insert(ignore_permissions=True)
	protokoll(n, "deal_prognose", "projekt", pid, "Prognose auf Standard zurückgesetzt" if leer else f"Prognose: {o['wahrscheinlichkeit'] if o['wahrscheinlichkeit'] is not None else 'Standard'} %, Closing {o['closingErwartet'] or 'Standard'}")
	return next((k for k in _karten() if k["projektId"] == pid), None)


@frappe.whitelist(methods=["POST"])
def bericht(land=None, phase=None, als_benutzer=None):
	d = pipeline(land=land, phase=phase, als_benutzer=als_benutzer)
	n = nutzer(als_benutzer)
	protokoll(n, "export", "projekt", "PIPELINE", f"Deal-Bericht exportiert ({len(d['karten'])} Projekte)")
	return {**d, "csv": T.bericht_csv(d["karten"]), "erstelltAm": iso(now_datetime())}
