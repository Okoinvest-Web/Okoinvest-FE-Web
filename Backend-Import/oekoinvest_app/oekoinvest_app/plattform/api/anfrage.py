# Copyright (c) 2026, ÖkoInvest GmbH
# Öffentliches Anfrageformular aller Zielgruppen → Plattform Vorgang (+ Flächen-Entwurf bei flaeche/agri).

import json
import re

import frappe

from oekoinvest_app.plattform import benachrichtigung
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, jetzt_iso, nutzer, protokoll, verlauf
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, FLAECHE_NUTZUNG, LAENDER, VORGANG_TYPEN
from oekoinvest_app.plattform.flaeche_fach import fach_aus_anfrage  # Fachprüfung Flächen

VERBOTENE_SCHLUESSEL = {"__proto__", "constructor", "prototype"}


def daten_bereinigen(d, tiefe=0):
	"""Freie Zusatzdaten (flach, max. 60 Felder, eine Verschachtelungsebene) – wie datenBereinigen im Demo-Backend."""
	if not isinstance(d, dict):
		return {}
	out = {}
	for k, wert in list(d.items())[:60]:
		key = re.sub(r"[^\w.-]", "", str(k), flags=re.ASCII)[:60]
		if not key or key in VERBOTENE_SCHLUESSEL:
			continue
		if isinstance(wert, bool):
			out[key] = wert
		elif isinstance(wert, str):
			out[key] = v.mehrzeilig(wert, 2000)
		elif isinstance(wert, (int, float)):
			if wert == wert and wert not in (float("inf"), float("-inf")):
				out[key] = wert
		elif isinstance(wert, list):
			out[key] = [x if isinstance(x, (bool, int, float)) else v.text(x, 200) for x in wert[:30]]
		elif isinstance(wert, dict) and tiefe < 1:
			out[key] = daten_bereinigen(wert, tiefe + 1)
	return out


def _erster(d, *schluessel):
	for s in schluessel:
		if d.get(s) is not None:
			return d.get(s)
	return None


@frappe.whitelist(methods=["POST"])
def anlegen(typ=None, kontakt=None, daten=None, herkunft=None, ip=None, einwilligungText=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	t = v.auswahl(typ, VORGANG_TYPEN)
	v.pflicht(t, "Unbekannter Anfragetyp.")
	kt = kontakt if isinstance(kontakt, dict) else {}
	k = {
		"anrede": v.text(kt.get("anrede"), 20),
		"vorname": v.text(kt.get("vorname"), 80),
		"nachname": v.text(kt.get("nachname"), 80),
		"firma": v.text(kt.get("firma"), 120),
		"email": v.email(kt.get("email")),
		"telefon": v.text(kt.get("telefon"), 40),
		"plz": v.plz(kt.get("plz")),
		"ort": v.text(kt.get("ort"), 80),
		"land": v.auswahl(kt.get("land"), LAENDER, ""),
	}
	v.pflicht(k["vorname"] and k["nachname"], "Bitte geben Sie Vor- und Nachnamen an.")
	v.pflicht(k["email"], "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	d = daten_bereinigen(daten)
	if t == "kommune":  # Fachprüfung Kommunen: Positivliste + Gemeindeschlüssel je Land
		from oekoinvest_app.plattform.flaeche_fach import Fehler, kommune_daten

		try:
			d = {**d, **kommune_daten(daten, k["land"], k)}
		except Fehler as e:
			v.pflicht(False, str(e))
	v.pflicht(len(json.dumps(d, ensure_ascii=False)) <= 20000, "Zu viele Zusatzdaten.")
	h = daten_bereinigen(herkunft)
	ip_ = v.text(ip, 64)

	# Sofort zuordnen nur, wenn die bestätigte E-Mail des angemeldeten Nutzers übereinstimmt
	u = n if (n and n.email == k["email"] and n.emailBestaetigt) else None

	vg = frappe.get_doc(
		{
			"doctype": "Plattform Vorgang",
			"typ": t,
			"status": "eingegangen",
			"nutzer_id": u.id if u else None,
			"email": k["email"],
			"kontakt": als_json(k),
			"daten": als_json(d),
			"herkunft": als_json(h),
			"ip": ip_,
			"einwilligung": als_json({"am": jetzt_iso(), "ip": ip_, "text": v.text(einwilligungText, 400)}),
		}
	)
	verlauf(vg, "eingegangen", u, "eigentuemer", "")
	vg.insert(ignore_permissions=True)

	if t in ("flaeche", "agri"):
		land = k["land"] or "DE"
		ha = v.zahl(_erster(d, "ha", "hektar", "flaeche", "flaecheHa"), min=0, max=100000, stellen=2)
		ort_text = " ".join(x for x in (k["plz"], k["ort"]) if x) or "aus Anfrage"
		f = frappe.get_doc(
			{
				"doctype": "Plattform Flaeche",
				"nutzer_id": u.id if u else None,
				"vorgang_id": vg.name,
				"bezeichnung": v.text(d.get("bezeichnung"), 120) or f"Fläche {ort_text}",
				"land": land,
				"bundesland": v.auswahl(d.get("bundesland"), BUNDESLAENDER.get(land, []), ""),
				"plz": k["plz"],
				"ort": k["ort"],
				"ha": ha or 0,
				"nutzung": "dach" if d.get("art") == "dach" else v.auswahl(d.get("nutzung"), FLAECHE_NUTZUNG, "acker"),  # /dachflaeche-verpachten
				"agri": 1 if t == "agri" else 0,
				"eigentum": "eigentum",
				"fach": als_json(fach_aus_anfrage(d)),  # Fachprüfung Flächen: z. B. Dachart aus /dachflaeche-verpachten
				"hinweise": v.mehrzeilig(d.get("nachricht"), 2000),
				"status": "entwurf",
			}
		)
		verlauf(f, "entwurf", u, "system", "Aus Anfrage angelegt")
		f.insert(ignore_permissions=True)
		frappe.db.set_value("Plattform Vorgang", vg.name, "flaeche_id", f.name, update_modified=False)
		vg.flaeche_id = f.name

	protokoll(u, "anfrage", "vorgang", vg.name, f"Anfrage {VORGANG_TYPEN[t]} von {k['email']}", ip_)
	benachrichtigung.neue_anfrage(vg, k)
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: CRM-Lead + Automationen

	backoffice_ereignis("vorgang_neu", "vorgang", vg)
	return {"id": vg.name, "vorgang": {"id": vg.name, "typ": vg.typ, "status": vg.status, "flaecheId": vg.flaeche_id or None}}

