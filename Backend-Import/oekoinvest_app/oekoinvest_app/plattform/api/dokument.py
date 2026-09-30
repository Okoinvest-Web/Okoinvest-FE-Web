# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dokumente: private Frappe-Files, nur für Berechtigte.
#  - Typ an den ersten Bytes geprüft (PDF/JPG/PNG), ≤ 10 MB – die Website prüft vorab, hier erneut
#  - zufälliger Dateiname, is_private = 1, SHA-256 gespeichert
#  - Datenraum-Dokumente (Kategorie „datenraum“) nur an Projekten; Investoren sehen sie erst nach NDA-Freigabe
#  - jeder Download wird protokolliert

import base64
import binascii
import re
import secrets

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import dokument_meta, ist_eigen, thread_info
from oekoinvest_app.plattform.kern import (
	besitzer,
	darf_bezug,
	ist_admin,
	jetzt,
	nachricht_anlegen,
	nicht_gefunden,
	nutzer,
	objekt_laden,
	protokoll,
	sha256,
	ungueltig,
	verboten,
)
from oekoinvest_app.plattform.konstanten import BEZUG_ARTEN, DOCTYPE, DOKUMENT_KATEGORIEN, ORGANISATION_OBJEKTE, UPLOAD_MAX_BYTES, UPLOAD_TYPEN
from oekoinvest_app.plattform.organisation import aktive_organisation, darf_team_lesen_objekt, datenraum_interesse
from oekoinvest_app.plattform.checkliste import CHECKLISTE_IDS
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS

MAX_BASE64 = (UPLOAD_MAX_BYTES + 2) // 3 * 4 + 16
FELDER = ["name", "bezug_art", "bezug_id", "dateiname", "mime", "groesse", "kategorie", "checkliste", "am", "hochgeladen_von", "datei_id",
	"version", "vorgaenger", "ersetzt_durch", "freigabe_status", "freigabe_von", "freigabe_am", "freigabe_kommentar"]  # Querschnitt: Versionen, Freigabe


def mime_aus_bytes(b):
	"""Dateityp an den ersten Bytes erkennen (nie dem Dateinamen/Browser-MIME trauen)."""
	if len(b) >= 5 and b[:5] == b"%PDF-":
		return "application/pdf"
	if len(b) >= 3 and b[:3] == b"\xff\xd8\xff":
		return "image/jpeg"
	if len(b) >= 8 and b[:8] == b"\x89PNG\r\n\x1a\n":
		return "image/png"
	return ""


def darf_dokument(n, d):
	if ist_admin(n):
		return True
	if d.hochgeladen_von == n.id:
		return True
	o = objekt_laden(d.bezug_art, d.bezug_id)
	if not o:
		return False
	if besitzer(d.bezug_art, o) == n.id or darf_team_lesen_objekt(n, o):  # auch Team des Eigentümers
		return True
	if d.bezug_art == "projekt" and d.kategorie == "datenraum" and o.status in (*BOERSE_STATUS, "verkauft"):
		# eigenes Interesse oder – im Team – das Interesse der Organisation mit freigegebenem Datenraum
		i = datenraum_interesse(n, o.name, DATENRAUM_STATUS)
		if not i:
			return False
		from oekoinvest_app.plattform.dealroom_kern import stufe_ok  # Deal-Room: Stufe 2 erst nach LOI

		return stufe_ok(o.name, d.name, i.investor_id)
	return False


def _mit_bezug(meta, n, cache):
	schluessel = (meta["bezugArt"], meta["bezugId"])
	if schluessel not in cache:
		cache[schluessel] = thread_info(meta["bezugArt"], meta["bezugId"], n) or {}
	info = cache[schluessel]
	return {**meta, "bezugTitel": info.get("titel") or meta["bezugId"], "bezugLink": info.get("link")}


@frappe.whitelist(methods=["POST"])
def liste(bezugArt=None, bezugId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if bezugArt:
		if bezugArt not in BEZUG_ARTEN or not v.kennung(bezugId):
			return []
		kandidaten = frappe.get_all("Plattform Dokument", filters={"bezug_art": bezugArt, "bezug_id": bezugId}, fields=FELDER, limit_page_length=0)
	elif ist_admin(n):
		kandidaten = frappe.get_all("Plattform Dokument", fields=FELDER, order_by="am desc", limit_page_length=500)
	else:
		# Übersicht: nur Dokumente an eigenen Objekten bzw. eigene Uploads (kein Datenraum fremder Projekte)
		from oekoinvest_app.plattform.api.nachricht import eigene_bezuege

		gesehen = {}
		for d in frappe.get_all("Plattform Dokument", filters={"hochgeladen_von": n.id}, fields=FELDER, limit_page_length=0):
			gesehen[d.name] = d
		for art, namen in eigene_bezuege(n).items():
			if namen:
				for d in frappe.get_all("Plattform Dokument", filters={"bezug_art": art, "bezug_id": ("in", namen)}, fields=FELDER, limit_page_length=0):
					gesehen[d.name] = d
		# Im Organisationskontext zusätzlich die Dokumente an Objekten der aktiven Organisation
		aktiv = aktive_organisation(n)
		if aktiv:
			for art in ORGANISATION_OBJEKTE:
				namen = frappe.get_all(DOCTYPE[art], filters={"organisation_id": aktiv}, pluck="name", limit_page_length=0)
				if namen:
					for d in frappe.get_all("Plattform Dokument", filters={"bezug_art": art, "bezug_id": ("in", namen)}, fields=FELDER, limit_page_length=0):
						gesehen[d.name] = d
		kandidaten = list(gesehen.values())
	erlaubt = [d for d in kandidaten if darf_dokument(n, d)]
	erlaubt.sort(key=lambda d: str(d.am or ""), reverse=True)
	cache = {}
	return [_mit_bezug(dokument_meta(d), n, cache) for d in erlaubt[:500]]


@frappe.whitelist(methods=["POST"])
def lesen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Dokument", k):
		nicht_gefunden("Dokument nicht gefunden.")
	d = frappe.get_doc("Plattform Dokument", k)
	if not darf_dokument(n, d):
		verboten()
	if not d.datei_id or not frappe.db.exists("File", d.datei_id):
		nicht_gefunden("Dokument nicht gefunden.")
	datei = frappe.get_doc("File", d.datei_id)
	with open(datei.get_full_path(), "rb") as fh:
		inhalt = fh.read()
	if d.sha256 and sha256(inhalt) != d.sha256:
		frappe.log_error(title="ÖkoInvest: Prüfsumme eines Dokuments stimmt nicht", message=f"Dokument {d.name}")
		ungueltig("Das Dokument ist beschädigt. Bitte wenden Sie sich an das Backoffice.")
	# Download-Protokoll (Datenraum: wer hat wann welche Unterlage geöffnet)
	protokoll(n, "download", d.bezug_art, d.bezug_id, f"Dokument {d.dateiname} geöffnet")
	return {"meta": dokument_meta(d), "inhaltBase64": base64.b64encode(inhalt).decode("ascii")}


@frappe.whitelist(methods=["POST"])
def speichern(bezugArt=None, bezugId=None, name=None, mime=None, kategorie=None, inhaltBase64=None, checkliste=None, stumm=None, als_benutzer=None):  # stumm: Anhang einer Nachricht (Querschnitt)
	n = nutzer(als_benutzer)
	if mime not in UPLOAD_TYPEN:
		ungueltig("Erlaubt sind PDF, JPG und PNG.")
	roh = inhaltBase64 if isinstance(inhaltBase64, str) else ""
	if not roh or len(roh) > MAX_BASE64:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	try:
		daten = base64.b64decode(roh, validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")
	if not daten or len(daten) > UPLOAD_MAX_BYTES:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	if mime_aus_bytes(daten) != mime:
		ungueltig("Erlaubt sind PDF, JPG und PNG.")
	kat = v.auswahl(kategorie, DOKUMENT_KATEGORIEN, "allgemein")
	if kat == "datenraum" and bezugArt != "projekt":
		ungueltig("Datenraum-Dokumente gehören zu einem Projekt.")
	punkt = v.auswahl(checkliste, CHECKLISTE_IDS.get(bezugArt, []), "")
	endung = UPLOAD_TYPEN[mime]
	sauber = re.sub(r'[\\/:*?"<>|]', "_", v.text(name, 120)) or f"dokument.{endung}"

	o = darf_bezug(n, bezugArt, bezugId, schreiben=True)  # Rechte vor dem Schreiben der Datei (Team ab „Mitglied“)
	eigen = ist_eigen(bezugArt, o, n)
	als_admin = ist_admin(n) and not eigen

	d = frappe.get_doc(
		{
			"doctype": "Plattform Dokument",
			"bezug_art": bezugArt,
			"bezug_doctype": DOCTYPE[bezugArt],  # vor dem Insert nötig: Dynamic Link wird vor validate() geprüft
			"bezug_id": o.name,
			"dateiname": sauber,
			"mime": mime,
			"groesse": len(daten),
			"kategorie": kat,
			"checkliste": punkt,
			"hochgeladen_von": n.id,
			"am": jetzt(),
			"sha256": sha256(daten),
		}
	).insert(ignore_permissions=True)
	datei = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": f"{d.name}-{secrets.token_hex(8)}.{endung}",
			"is_private": 1,
			"content": daten,
			"attached_to_doctype": "Plattform Dokument",
			"attached_to_name": d.name,
		}
	)
	datei.flags.ignore_permissions = True
	datei.insert(ignore_permissions=True)
	d.datei = datei.file_url
	d.datei_id = datei.name
	d.save(ignore_permissions=True)

	if not v.wahr(stumm):
		nachricht_anlegen(
			bezugArt,
			o.name,
			von_id=n.id,
			von_admin=als_admin,
			system=True,
			text=f"Dokument hochgeladen: {sauber}",
			gelesen_nutzer=None if als_admin else True,
			gelesen_admin=None if als_admin else False,
			ereignis="nachricht",
		)
	protokoll(n, "upload", bezugArt, o.name, f"Dokument {sauber} ({len(daten)} B)")
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: Automationen

	backoffice_ereignis("dokument", bezugArt, o, extra={"kategorie": kat})
	return dokument_meta(d)


@frappe.whitelist(methods=["POST"])
def loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Dokument", k):
		nicht_gefunden("Dokument nicht gefunden.")
	d = frappe.get_doc("Plattform Dokument", k)
	if not ist_admin(n) and d.hochgeladen_von != n.id:
		verboten("Nur eigene Uploads können gelöscht werden.")
	protokoll(n, "loeschen", d.bezug_art, d.bezug_id, f"Dokument {d.dateiname} gelöscht")
	datei_id = d.datei_id
	if datei_id and frappe.db.exists("File", datei_id):
		frappe.delete_doc("File", datei_id, ignore_permissions=True, force=True)
	frappe.delete_doc("Plattform Dokument", d.name, ignore_permissions=True, force=True)
	return {"ok": True}
