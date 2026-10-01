# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fristerinnerungen per täglichem Lauf – wie src/lib/plattform/backend/demo/fristErinnerung.js.
# Regeln: plattform/frist_erinnerung_kern.py (= src/lib/plattform/fristErinnerung.js).
#
#   Pachtakte       Fristen aus Pachtvertrag + Pachtangebot, Rückbausicherheit fehlt → Eigentümer bzw. Backoffice „pachtakte“
#   Genossenschaft  Einzahlungsfrist nach Zulassung → Mitglied (überfällig: auch Backoffice „genossenschaft“)
#   Gemeinde        Frist offener Stellungnahmen → Gemeinde-Konto des geprüften Anliegens bzw. Backoffice „kommunen“
#
# Scheduler: hooks.py → scheduler_events.daily → erinnerungen_taeglich. Manuell: lauf (Backoffice).
# „Bereits gemeldet“ = Plattform Aktivitaet mit aktion „frist_erinnerung“ und objekt_id = Schlüssel der Erinnerung.

import frappe
from frappe.utils import nowdate

from oekoinvest_app.plattform import frist_erinnerung_kern as R
from oekoinvest_app.plattform.kern import aus_json, ist_admin, jetzt_iso, konto_json, nicht_angemeldet, nutzer, protokoll, verboten
from oekoinvest_app.plattform.rechte import stufe

BEREICHE = ("pachtakte", "genossenschaft", "kommunen")
MAIL_TEXT = "Eine Frist läuft bald ab bzw. ist überschritten. Details finden Sie im Portal."


def _backoffice(bereich):
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins

	out = []
	for k in aktive_admins()[:100]:
		if stufe(frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k))), bereich) >= 2:
			out.append(k)
		if len(out) >= 5:
			break
	return out


def _gesendet(schluessel):
	return bool(frappe.db.exists("Plattform Aktivitaet", {"aktion": "frist_erinnerung", "objekt_id": schluessel}))


def ermitteln(heute=None):
	"""Alle fälligen Erinnerungen mit Zielen [{…, "ziele": [(konto, link, art)]}] – ohne Schreiben."""
	heute = heute or str(nowdate())
	out = []
	bo_cache = {}

	def bo(bereich):
		if bereich not in bo_cache:
			bo_cache[bereich] = _backoffice(bereich)
		return bo_cache[bereich]

	# Pachtakte
	from oekoinvest_app.plattform import pachtakte_kern as PK
	from oekoinvest_app.plattform.api import pachtakte as PA
	from oekoinvest_app.plattform.finanzen import abrechnung as A

	for name in frappe.get_all("Plattform Pachtvertrag", filters={"status": ["in", ["aktiv", "gekuendigt"]]}, pluck="name", limit_page_length=5000):
		pt = A.pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", name))
		flaeche = PA._flaeche(pt.get("flaecheId")) if pt.get("flaecheId") else None
		angebot = (flaeche or {}).get("pachtangebot") or None
		akte_name = frappe.db.get_value(PA.DT_P, {"vertrag_id": pt["id"]}, "name")
		akte = PA._akte_dict(frappe.get_doc(PA.DT_P, akte_name)) if akte_name else {**PK.akte_start(angebot), "kuendigungZum": ""}
		vertrag = PA._kurz(pt, akte)
		fristen = PK.vertrags_fristen(vertrag, angebot, heute)
		for e in R.pacht_erinnerungen(vertrag=vertrag, fristen=fristen, akte=akte, heute=heute):
			ziele = []
			if "eigentuemer" in e["an"]:
				ziele.append((pt["eigentuemerId"], "/portal/pachtvertraege", "status"))
			if "backoffice" in e["an"]:
				ziele += [(k, f"/portal/admin/pachtakten/{pt['id']}", "aufgabe") for k in bo("pachtakte")]
			out.append({**e, "objektArt": "pachtvertrag", "objektId": pt["id"], "ziele": ziele})

	# Genossenschaft
	from oekoinvest_app.plattform import mitglied_kern as MK
	from oekoinvest_app.plattform.api import mitglied as MA

	genos = {}
	for name in frappe.get_all(MA.DT_GM, filters={"status": "zugelassen"}, pluck="name", limit_page_length=5000):
		m = MA._m(frappe.get_doc(MA.DT_GM, name))
		if m["genoId"] not in genos:
			genos[m["genoId"]] = MA._geno(frappe.get_doc(MA.DT_GE, m["genoId"])) if frappe.db.exists(MA.DT_GE, m["genoId"]) else None
		g = genos[m["genoId"]]
		if not g:
			continue
		for e in R.einzahlung_erinnerungen(mitglied=m, offen_eur=MK.offener_betrag(m, g), geno_name=g.get("name") or "", heute=heute):
			ziele = []
			if "mitglied" in e["an"]:
				ziele.append((m.get("nutzerId"), "/portal/beteiligung/genossenschaft", "status"))
			if "backoffice" in e["an"]:
				ziele += [(k, "/portal/admin/genossenschaft", "aufgabe") for k in bo("genossenschaft")]
			out.append({**e, "objektArt": "mitglied", "objektId": m["id"], "ziele": ziele})

	# Gemeinde
	from oekoinvest_app.plattform.api import gemeinde as GA
	from oekoinvest_app.plattform.flaeche_fach import KOMMUNE_GEPRUEFT

	vorgaenge = [frappe.get_doc("Plattform Vorgang", x) for x in frappe.get_all("Plattform Vorgang", filters={"typ": "kommune", "status": ["in", list(KOMMUNE_GEPRUEFT)]}, pluck="name", limit_page_length=5000)]
	for akte in frappe.get_all(GA.DT, fields=["name", "schluessel", "gemeinde", "daten"], limit_page_length=5000):
		d = aus_json(akte.daten, {}) or {}
		vgs = [vg for vg in vorgaenge if GA.akte_schluessel(GA._gemeinde_von(vg)) == akte.schluessel]
		for e in R.stellungnahme_erinnerungen(akte_id=akte.name, gemeinde=akte.gemeinde or "", stellungnahmen=d.get("stellungnahmen") or [], heute=heute):
			ziele = []
			if "gemeinde" in e["an"]:
				ziele += [(vg.nutzer_id, "/portal/kommune", "status") for vg in vgs if vg.nutzer_id]
			if "backoffice" in e["an"]:
				ziele += [(k, f"/portal/kommune?vorgang={vgs[0].name}" if vgs else "/portal/admin/vorgaenge", "aufgabe") for k in bo("kommunen")]
			out.append({**e, "objektArt": "gemeinde", "objektId": akte.name, "ziele": ziele})
	return out


def _lauf(heute=None):
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	erg = {"erinnerungen": 0, "benachrichtigungen": 0, "pacht": 0, "genossenschaft": 0, "gemeinde": 0}
	for e in ermitteln(heute):
		if _gesendet(e["schluessel"]):
			continue
		erg["erinnerungen"] += 1
		erg["pacht" if e["objektArt"] == "pachtvertrag" else "genossenschaft" if e["objektArt"] == "mitglied" else "gemeinde"] += 1
		gesehen = set()
		for konto, link, art in e["ziele"]:
			if not konto or konto in gesehen:
				continue
			gesehen.add(konto)
			if anlegen(konto, art, e["titel"], e["text"], link, e["objektArt"], e["objektId"], mail=True, mail_text=MAIL_TEXT, mail_betreff=f"{e['titel']} – ÖkoInvest"):
				erg["benachrichtigungen"] += 1
		protokoll(None, "frist_erinnerung", "frist", e["schluessel"], f"{e['titel']}: {e['text']}"[:280])
	return erg


@frappe.whitelist(methods=["POST"])
def lauf(als_benutzer=None):
	"""Backoffice-Knopf „Fristerinnerungen jetzt senden“ (Bereich pachtakte, genossenschaft oder kommunen schreiben)."""
	n = nutzer(als_benutzer)
	if not n:
		nicht_angemeldet()
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	if not any(stufe(n, b) >= 2 for b in BEREICHE):
		verboten("Ihre Backoffice-Rolle erlaubt den Fristenlauf nicht.")
	return {"ok": True, **_lauf(), "am": jetzt_iso()}


def erinnerungen_taeglich():
	"""Scheduler (hooks.py → scheduler_events.daily): Fristerinnerungen Pachtakte, Genossenschaft, Gemeinde."""
	try:
		_lauf()
		frappe.db.commit()
	except Exception:  # noqa: BLE001 – ein Fehler darf den Scheduler nicht blockieren
		frappe.log_error(title="Fristerinnerungen: täglicher Lauf", message=frappe.get_traceback())
