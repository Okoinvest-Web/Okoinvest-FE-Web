# Copyright (c) 2026, ÖkoInvest GmbH
# KI-Assistent: Nutzungsprotokoll und Tages-Kontingent.
#
# Die KI-Aufrufe selbst laufen auf der Website (Next.js, Schlüssel ANTHROPIC_API_KEY in der Website-Umgebung,
# NIE in Frappe/site_config). Frappe speichert nur, WER WANN WELCHEN Anwendungsfall genutzt hat – ohne Inhalte.
#
# site_config (optional):
#   oekoinvest_ki_tageskontingent        Aufrufe je Konto und Tag (überschreibt KI_TAGESKONTINGENT der Website)
#   oekoinvest_ki_tageskontingent_admin  dasselbe für Backoffice-Konten

import frappe
from frappe.utils import cint, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import ist_admin, jetzt, nutzer

FAELLE = ["expose", "triage", "frage", "flaeche", "nachricht"]
MODI = ["ki", "regel"]


def _heute():
	"""Kalendertag in der Systemzeitzone der Frappe-Site (i. d. R. Europe/Vienna bzw. Europe/Berlin)."""
	return nowdate()


def _limit(n):
	schluessel = "oekoinvest_ki_tageskontingent_admin" if ist_admin(n) else "oekoinvest_ki_tageskontingent"
	return cint(frappe.conf.get(schluessel)) or None


@frappe.whitelist(methods=["POST"])
def nutzung_heute(als_benutzer=None):
	"""Anzahl der heutigen Aufrufe des angemeldeten Kontos und ggf. Kontingent aus site_config."""
	n = nutzer(als_benutzer)
	anzahl = frappe.db.count("Plattform KI Nutzung", {"nutzer_id": n.id, "tag": _heute()})
	return {"anzahl": anzahl, "limit": _limit(n)}


@frappe.whitelist(methods=["POST"])
def nutzung_protokollieren(fall=None, modus=None, ergebnis=None, tokensEin=None, tokensAus=None, objektArt=None, objektId=None, als_benutzer=None, **_):
	"""Nutzung anhängen (append-only). Inhalte werden nicht angenommen."""
	n = nutzer(als_benutzer)
	v.pflicht(fall in FAELLE, "Unbekannter Anwendungsfall.")
	v.pflicht(modus in MODI, "Unbekannter Modus.")
	frappe.get_doc(
		{
			"doctype": "Plattform KI Nutzung",
			"am": jetzt(),
			"tag": _heute(),
			"nutzer_id": n.id,
			"anwendungsfall": fall,
			"modus": modus,
			"ergebnis": v.text(ergebnis, 40) or "ok",
			"tokens_ein": max(0, cint(tokensEin)),
			"tokens_aus": max(0, cint(tokensAus)),
			"objekt_art": v.text(objektArt, 40),
			"objekt_id": v.text(objektId, 60),
		}
	).insert(ignore_permissions=True)
	return {"ok": True}
