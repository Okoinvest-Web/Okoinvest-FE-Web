# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC/KYB – Hintergrundaufgaben, Import und Einrichtung.
#
#  fristen_taeglich()            Scheduler (hooks.py, daily): Ausweis-Ablauf erinnern, Wiederholungsprüfung (abgelaufen),
#                                Neuabgleich bei neuem Listenstand, Löschung nach Aufbewahrungsfrist (§ 8 Abs. 4 GwG)
#  sanktionsliste_importieren()  MANUELLER Import der EU-Finanzsanktionsliste – kein automatischer Download im Code:
#      1. Datei von der offiziellen Quelle laden (Financial Sanctions Files der EU-Kommission,
#         https://webgate.ec.europa.eu/fsd/fsf – „Consolidated list of persons, groups and entities subject to EU
#         financial sanctions“, Format XML v1.1 oder CSV v1.1) und Herkunft/Prüfsumme dokumentieren.
#      2. bench --site <site> execute oekoinvest_app.plattform.kyc_aufgaben.sanktionsliste_importieren \
#            --kwargs "{'pfad': '/home/frappe/import/eu-fsf-2026-09-30.xml', 'stand': '2026-09-30'}"
#      Ersetzt den Bestand vollständig (Einträge, die nicht mehr gelistet sind, werden entfernt). Beim nächsten
#      Fristen-Lauf werden alle offenen und verifizierten Fälle gegen den neuen Stand abgeglichen.
#  einrichten()                  after_migrate: Workflow „KYC Prüfung“ (Zustände/Aktionen; wie alle Plattform-Workflows
#                                INAKTIV = Prozessdarstellung, Entscheidungen im Portal), Einstellungen, Rolle

import json
import os

import frappe
from frappe.utils import cint, getdate, nowdate

from oekoinvest_app.plattform import kyc_kern as k
from oekoinvest_app.plattform.kern import aus_json, als_json, jetzt, protokoll


def fristen_taeglich():
	fristen_laufen(n=None)


def fristen_laufen(n=None, stichtag=None, fall_id=None):
	from oekoinvest_app.plattform.api.kyc import _nutzer_melden, _speichern, _verlauf, abgleich_ausfuehren, liste_laden, _compliance_melden

	e = k.einstellungen()
	heute = stichtag or nowdate()
	liste = liste_laden()
	erg = {"ausweisErinnert": 0, "wiederholungErinnert": 0, "abgelaufen": 0, "neuAbgeglichen": 0, "neueTreffer": 0, "geloescht": 0}
	filters = {"status": ["!=", "geloescht"]}
	if fall_id:
		filters["name"] = fall_id
	for name in frappe.get_all(k.DT_FALL, filters=filters, pluck="name", limit_page_length=0):
		f = frappe.get_doc(k.DT_FALL, name)
		geaendert = False
		erinn = aus_json(f.erinnerungen_json, {}) or {}
		gb = str(f.ausweis_gueltig_bis) if f.ausweis_gueltig_bis else None
		t = k.tage_bis(gb, heute) if gb else None
		if f.status == "verifiziert" and t is not None and t <= cint(e.get("erinnerungAusweisTage") or 30) and erinn.get("ausweis") != gb:
			erinn["ausweis"] = gb
			erg["ausweisErinnert"] += 1
			_nutzer_melden(f, "Ausweis abgelaufen" if t < 0 else "Ausweis läuft bald ab", "Bitte aktualisieren Sie Ihre Ausweisdaten unter „Verifizierung“ (erneute Prüfung).")
			geaendert = True
		np = str(f.naechste_pruefung) if f.naechste_pruefung else None
		w = k.tage_bis(np, heute) if np else None
		if f.status == "verifiziert" and w is not None:
			if w <= 0:
				f.status = "abgelaufen"
				_verlauf(f, "abgelaufen", None, "system", "Wiederkehrende Überprüfung fällig.")
				erg["abgelaufen"] += 1
				_nutzer_melden(f, "Verifizierung erneuern", "Ihre regelmäßige Überprüfung ist fällig. Bitte bestätigen bzw. aktualisieren Sie Ihre Angaben.")
				protokoll(n, "kyc_frist", "kyc", f.name, "Wiederholungsprüfung fällig → abgelaufen")
				geaendert = True
			elif w <= 30 and erinn.get("wiederholung") != np:
				erinn["wiederholung"] = np
				erg["wiederholungErinnert"] += 1
				_nutzer_melden(f, "Überprüfung Ihrer Angaben steht an", "In den nächsten Wochen ist die regelmäßige Überprüfung fällig.")
				geaendert = True
		s = aus_json(f.sanktionen_json, {}) or {}
		if f.status in ("verifiziert", "in_pruefung", "eingereicht", "zweitpruefung") and liste["stand"] and s.get("listeStand") != liste["stand"]:
			vorher = s.get("treffer") or []
			neu = abgleich_ausfuehren(f, n, "Neuer Listenstand")
			erg["neuAbgeglichen"] += 1
			if neu["status"] == "treffer_pruefen" and k.neuer_treffer(vorher, neu["treffer"]):  # Schlüssel statt Anzahl
				erg["neueTreffer"] += 1
				if f.status == "verifiziert":
					f.status = "in_pruefung"
					_verlauf(f, "in_pruefung", None, "system", "Möglicher Treffer bei Neuabgleich.", oeffentlich=False)
				_compliance_melden(f, f"Sanktionsabgleich: möglicher Treffer {f.name}", "Manuelle Prüfung erforderlich.")
			geaendert = True
		if f.loeschen_ab and getdate(f.loeschen_ab) <= getdate(heute):
			loeschen(f, n)
			erg["geloescht"] += 1
			continue
		if geaendert:
			f.erinnerungen_json = als_json(erinn)
			_speichern(f)
	return {"ok": True, "stichtag": str(heute), **erg}


def loeschen(f, n=None):
	"""Unterlagen (Files) löschen und personenbezogene Angaben entfernen – Rest-Datensatz ohne Personenbezug bleibt."""
	from oekoinvest_app.plattform.api.kyc import _datei_loeschen

	for d in frappe.get_all(k.DT_DOK, filters={"fall": f.name}, pluck="name"):
		doc = frappe.get_doc(k.DT_DOK, d)
		_datei_loeschen(doc)
		doc.flags.kyc_loeschen = True
		doc.delete(ignore_permissions=True, force=True)
	for b in frappe.get_all(k.DT_BANK, filters={"fall": f.name}, pluck="name"):
		doc = frappe.get_doc(k.DT_BANK, b)
		doc.flags.kyc_loeschen = True
		doc.delete(ignore_permissions=True)
	for a in frappe.get_all(k.DT_ABGLEICH, filters={"fall": f.name}, pluck="name"):
		doc = frappe.get_doc(k.DT_ABGLEICH, a)
		doc.flags.kyc_loeschen = True
		doc.delete(ignore_permissions=True)
	for feld in ("person_json", "firma_json", "vertreter_json", "pep_json", "mittelherkunft_json", "steuer_json", "pruefung_json", "risiko_json", "sanktionen_json", "pruefergebnisse_json", "verlauf_json", "erinnerungen_json", "vorname", "nachname", "geburtsdatum", "staatsangehoerigkeit", "wohnsitzland", "ausweis_gueltig_bis", "firma_name", "registernummer", "nachforderung", "email"):
		f.set(feld, None)
	f.set("ubos", [])
	f.bezeichnung = f"Gelöscht ({f.name})"
	f.status = "geloescht"
	f.flags.kyc_uebergang = True
	f.save(ignore_permissions=True)
	protokoll(n, "kyc_loeschung", "kyc", f.name, "Aufbewahrungsfrist abgelaufen – Unterlagen und personenbezogene Angaben gelöscht")


def sanktionsliste_importieren(pfad, stand=None, quelle=None):
	"""Manueller Import (siehe Kopfkommentar). Liefert {"anzahl", "stand", "sha256"}."""
	if not pfad or not os.path.isfile(pfad):
		frappe.throw(f"Datei nicht gefunden: {pfad}")
	with open(pfad, "rb") as fh:
		roh = fh.read()
	eintraege = k.eu_xml_lesen(roh) if roh.lstrip()[:1] == b"<" else k.eu_csv_lesen(roh)
	if not eintraege:
		frappe.throw("Keine Einträge erkannt – Format prüfen (EU-FSF XML v1.1 bzw. CSV v1.1).")
	stand = stand or nowdate()
	vorhanden = set(frappe.get_all(k.DT_LISTE, pluck="name", limit_page_length=0))
	neu = set()
	for e in eintraege:
		daten = {"eu_ref": e["euRef"], "typ": e["typ"] or "", "programm": e["programm"][:140], "liste_stand": stand, "namen": json.dumps(e["namen"], ensure_ascii=False), "geburtsdaten": json.dumps(e["geburtsdaten"]), "laender": ",".join(e["laender"])[:140]}
		if e["id"] in vorhanden:
			frappe.db.set_value(k.DT_LISTE, e["id"], daten, update_modified=False)
		else:
			frappe.get_doc({"doctype": k.DT_LISTE, "eintrag_id": e["id"], **daten}).insert(ignore_permissions=True)
		neu.add(e["id"])
	for alt in vorhanden - neu:
		frappe.delete_doc(k.DT_LISTE, alt, ignore_permissions=True, force=True)
	pruefsumme = k.sha256_hex(roh)
	doc = frappe.get_single(k.DT_EINST)
	doc.liste_quelle = quelle or f"EU-Finanzsanktionsliste (FSF), Datei {os.path.basename(pfad)}, SHA-256 {pruefsumme[:16]}…"
	doc.liste_stand = stand
	doc.liste_importiert_am = jetzt()
	doc.save(ignore_permissions=True)
	protokoll(None, "kyc_liste", "kyc", "sanktionsliste", f"Sanktionsliste importiert: {len(neu)} Einträge, Stand {stand}, SHA-256 {pruefsumme}")
	frappe.db.commit()
	return {"anzahl": len(neu), "entfernt": len(vorhanden - neu), "stand": stand, "sha256": pruefsumme}


# ================================================================ Einrichtung (after_migrate, idempotent)

WORKFLOW = "KYC Prüfung"
ZUSTAENDE = [("offen", "Warning"), ("eingereicht", "Primary"), ("in_pruefung", "Primary"), ("zweitpruefung", "Info"), ("nachgefordert", "Warning"), ("verifiziert", "Success"), ("abgelehnt", "Danger"), ("abgelaufen", "Warning"), ("geloescht", "Inverse")]
AKTIONEN = [
	("eingereicht", "Prüfung beginnen", "in_pruefung"),
	("eingereicht", "Nachfordern", "nachgefordert"),
	("in_pruefung", "Verifizieren", "verifiziert"),
	("in_pruefung", "Zur Zweitprüfung", "zweitpruefung"),
	("in_pruefung", "Nachfordern", "nachgefordert"),
	("in_pruefung", "Ablehnen", "abgelehnt"),
	("zweitpruefung", "Zweitfreigabe erteilen", "verifiziert"),
	("zweitpruefung", "Nachfordern", "nachgefordert"),
	("zweitpruefung", "Ablehnen", "abgelehnt"),
]


def einrichten():
	if not frappe.db.exists("DocType", k.DT_FALL):
		return
	if not frappe.db.exists("Role", k.ROLLE_COMPLIANCE):
		frappe.get_doc({"doctype": "Role", "role_name": k.ROLLE_COMPLIANCE, "desk_access": 1, "two_factor_auth": 1}).insert(ignore_permissions=True)
	for z, stil in ZUSTAENDE:
		if not frappe.db.exists("Workflow State", z):
			frappe.get_doc({"doctype": "Workflow State", "workflow_state_name": z, "style": stil}).insert(ignore_permissions=True)
	for _, a, _ in AKTIONEN:
		if not frappe.db.exists("Workflow Action Master", a):
			frappe.get_doc({"doctype": "Workflow Action Master", "workflow_action_name": a}).insert(ignore_permissions=True)
	if not frappe.db.exists("Workflow", WORKFLOW):
		wf = frappe.get_doc({"doctype": "Workflow", "workflow_name": WORKFLOW, "document_type": k.DT_FALL, "workflow_state_field": "status", "is_active": 0, "send_email_alert": 0, "override_status": 1})
		for z, _ in ZUSTAENDE:
			wf.append("states", {"state": z, "doc_status": "0", "allow_edit": k.ROLLE_COMPLIANCE, "update_field": "status", "update_value": z})
		for von, a, nach in AKTIONEN:
			wf.append("transitions", {"state": von, "action": a, "next_state": nach, "allowed": k.ROLLE_COMPLIANCE, "allow_self_approval": 0 if nach == "verifiziert" and von == "zweitpruefung" else 1})
		wf.insert(ignore_permissions=True)
	doc = frappe.get_single(k.DT_EINST)
	if not doc.einstellungen_json:
		doc.einstellungen_json = json.dumps(k.einstellungen_standard(), ensure_ascii=False)
		doc.save(ignore_permissions=True)
