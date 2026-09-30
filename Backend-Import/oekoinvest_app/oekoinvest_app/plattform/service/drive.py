# Copyright (c) 2026, ÖkoInvest GmbH
#
# Adapter Frappe Drive (optional, Schalter `oekoinvest_drive` in site_config, App `drive` installiert).
#
# Zweck: Plattform-Dokumente (Datenraum, Flächen-, Projekt- und Vorgangsakten, signierte PDFs) zusätzlich im Drive des
# INTERNEN Teams ablegen – als Arbeitskopie für das Backoffice. Maßgeblich für Rechte bleibt die Plattform:
#   - Portal-Nutzer (Kunden, Investoren) erhalten NIE Drive-Zugriff; Downloads laufen weiter über die Plattform-API.
#   - Die Drive-Ordner gehören einem technischen Team-Benutzer (`oekoinvest_drive_benutzer`) bzw. einem Drive-Team
#     (`oekoinvest_drive_team`), das nur Backoffice-Mitarbeiter enthält.
#   - KYC-Unterlagen nur mit zusätzlichem Schalter `oekoinvest_drive_kyc`, NUR verschlüsselt (Fernet mit dem
#     Site-Schlüssel, Endung .enc) und in einem abgeschotteten Ordner des Compliance-Benutzers
#     (`oekoinvest_drive_kyc_benutzer`) – ohne Schalter werden KYC-Dokumente nie gespiegelt.
#
# ACHTUNG – vor Einsatz gegen die installierte Drive-Version prüfen: Drive hat seine DocTypes mehrfach geändert
# („Drive Entity“ mit parent_drive_entity bis 2024, danach „Drive File“ mit parent_entity/team). Der Adapter erkennt beide
# Varianten über die Metadaten und bricht mit klarer Fehlermeldung ab, wenn Pflichtfelder unbekannt sind.
# Fehler beim Spiegeln brechen nie den fachlichen Vorgang ab (Hintergrundjob, Fehlerprotokoll ohne Inhalte).

import base64

import frappe

from oekoinvest_app.plattform.service.integration import aktiv

WURZEL = "ÖkoInvest Plattform"
BEZUG_ORDNER = {"projekt": "Projekte", "flaeche": "Flächen", "vorgang": "Vorgänge", "interesse": "Projektinteressen", "nutzer": "Konten", "signatur": "Signaturen"}


class DriveFehler(Exception):
	pass


def _variante():
	"""(doctype, feld_eltern, feld_team|None) der installierten Drive-Version."""
	for dt, eltern in (("Drive File", ("parent_entity", "parent_drive_entity")), ("Drive Entity", ("parent_drive_entity", "parent_entity"))):
		if frappe.db.exists("DocType", dt):
			meta = frappe.get_meta(dt)
			feld = next((f for f in eltern if meta.has_field(f)), None)
			if not feld or not meta.has_field("is_group") or not meta.has_field("title"):
				raise DriveFehler(f"Frappe Drive: DocType „{dt}“ hat nicht die erwarteten Felder (is_group, title, {'/'.join(eltern)}). Adapter an die installierte Version anpassen.")
			return dt, feld, ("team" if meta.has_field("team") else None)
	raise DriveFehler("Frappe Drive ist nicht installiert oder unbekannt (weder „Drive File“ noch „Drive Entity“).")


def _benutzer(kyc=False):
	b = frappe.conf.get("oekoinvest_drive_kyc_benutzer" if kyc else "oekoinvest_drive_benutzer")
	if not b or not frappe.db.exists("User", b):
		raise DriveFehler("site_config: " + ("oekoinvest_drive_kyc_benutzer" if kyc else "oekoinvest_drive_benutzer") + " fehlt oder ist kein Benutzer.")
	return b


def _ordner(titel, eltern, besitzer):
	dt, feld, team = _variante()
	filt = {"title": titel, "is_group": 1, feld: eltern, "owner": besitzer}
	name = frappe.db.get_value(dt, filt, "name")
	if name:
		return name
	daten = {"doctype": dt, "title": titel, "is_group": 1, feld: eltern}
	if team:
		daten[team] = frappe.conf.get("oekoinvest_drive_team")
	doc = frappe.get_doc(daten)
	doc.owner = besitzer
	doc.flags.ignore_permissions = True
	doc.insert(ignore_permissions=True)
	return doc.name


def ordner_sicherstellen(teile, kyc=False):
	"""Ordnerpfad (Liste von Titeln) unterhalb der Wurzel anlegen; liefert den Namen des letzten Ordners."""
	besitzer = _benutzer(kyc)
	eltern = None
	for t in [WURZEL + (" – KYC (verschlüsselt)" if kyc else "")] + list(teile):
		eltern = _ordner(str(t)[:140], eltern, besitzer)
	return eltern


def _datei(ordner, dateiname, inhalt, mime, besitzer):
	"""Datei als privates Frappe-File speichern und im Drive-Ordner referenzieren."""
	dt, feld, team = _variante()
	f = frappe.get_doc({"doctype": "File", "file_name": dateiname, "is_private": 1, "content": inhalt})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	meta = frappe.get_meta(dt)
	daten = {"doctype": dt, "title": dateiname, "is_group": 0, feld: ordner}
	for feldname, wert in (("file_size", len(inhalt)), ("mime_type", mime), ("path", f.get_full_path()), ("file_url", f.file_url)):
		if meta.has_field(feldname):
			daten[feldname] = wert
	if team:
		daten[team] = frappe.conf.get("oekoinvest_drive_team")
	doc = frappe.get_doc(daten)
	doc.owner = besitzer
	doc.flags.ignore_permissions = True
	doc.insert(ignore_permissions=True)
	return doc.name


def dokument_spiegeln(name):
	"""Hintergrundjob: Plattform Dokument → Drive (Ordner je Bezug). Idempotent über `drive_ref` im Dokument (falls Feld vorhanden)."""
	if not aktiv("drive"):
		return None
	try:
		d = frappe.get_doc("Plattform Dokument", name)
		if not d.datei_id or not frappe.db.exists("File", d.datei_id):
			return None
		if d.meta.has_field("drive_ref") and d.get("drive_ref"):
			return d.drive_ref
		inhalt = frappe.get_doc("File", d.datei_id).get_content()
		ordner = ordner_sicherstellen([BEZUG_ORDNER.get(d.bezug_art, "Sonstiges"), d.bezug_id, "Datenraum" if d.kategorie == "datenraum" else "Akte"])
		ref = _datei(ordner, d.dateiname, inhalt, d.mime, _benutzer())
		if d.meta.has_field("drive_ref"):
			frappe.db.set_value("Plattform Dokument", d.name, "drive_ref", ref, update_modified=False)
		return ref
	except Exception:
		frappe.log_error(title="ÖkoInvest: Drive-Spiegelung fehlgeschlagen", message=f"Plattform Dokument {name}")
		return None


def kyc_spiegeln(name):
	"""Hintergrundjob: KYC Dokument → abgeschotteter Drive-Ordner, NUR verschlüsselt. Ohne oekoinvest_drive_kyc: nichts."""
	if not (aktiv("drive") and frappe.conf.get("oekoinvest_drive_kyc")):
		return None
	try:
		from frappe.utils.password import encrypt

		d = frappe.get_doc("KYC Dokument", name)
		if not d.get("datei_id") or not frappe.db.exists("File", d.datei_id):
			return None
		roh = frappe.get_doc("File", d.datei_id).get_content()
		if isinstance(roh, str):
			roh = roh.encode("latin1")
		verschluesselt = encrypt(base64.b64encode(roh).decode("ascii")).encode("ascii")
		ordner = ordner_sicherstellen([d.get("konto") or "ohne Konto", d.get("fall") or "Fall"], kyc=True)
		return _datei(ordner, f"{d.name}.enc", verschluesselt, "application/octet-stream", _benutzer(kyc=True))
	except Exception:
		frappe.log_error(title="ÖkoInvest: KYC-Drive-Ablage fehlgeschlagen", message=f"KYC Dokument {name}")
		return None


def kyc_entschluesseln(inhalt_enc):
	"""Für die Compliance: .enc-Inhalt (bytes/str) → Originalbytes."""
	from frappe.utils.password import decrypt

	text = inhalt_enc.decode("ascii") if isinstance(inhalt_enc, bytes) else str(inhalt_enc)
	return base64.b64decode(decrypt(text))


# ---------------------------------------------------------------- doc_events (hooks.py)


def nach_dokument(doc, method=None):
	if aktiv("drive"):
		frappe.enqueue("oekoinvest_app.plattform.service.drive.dokument_spiegeln", queue="short", name=doc.name, enqueue_after_commit=True)


def nach_kyc_dokument(doc, method=None):
	if aktiv("drive") and frappe.conf.get("oekoinvest_drive_kyc"):
		frappe.enqueue("oekoinvest_app.plattform.service.drive.kyc_spiegeln", queue="short", name=doc.name, enqueue_after_commit=True)
