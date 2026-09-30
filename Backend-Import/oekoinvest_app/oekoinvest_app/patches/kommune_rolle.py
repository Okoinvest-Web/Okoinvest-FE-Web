# Copyright (c) 2026, ÖkoInvest GmbH
#
# Onboarding B1: eigene Rolle „kommune“. Konten mit kommunalem Anliegen (Plattform Vorgang, typ „kommune“), die bisher
# die Rolle „unternehmen“ bekamen, erhalten „kommune“. „unternehmen“ bleibt nur, wenn das Konto auch
# Unternehmens-Anliegen hat (Reststrom, Carport, Speicher). Idempotent; der Konto-Controller überträgt die Frappe-Rollen.

import frappe

UNTERNEHMEN_TYPEN = ("reststrom", "carport", "speicher")


def execute():
	from oekoinvest_app.plattform.installation import stammdaten_anlegen

	stammdaten_anlegen()  # Plattform Rolle „kommune“ + Frappe-Rolle „Plattform Kommune“
	konten = frappe.get_all("Plattform Vorgang", filters={"typ": "kommune", "nutzer_id": ["is", "set"]}, pluck="nutzer_id", distinct=True)
	for konto_id in set(konten):
		if not frappe.db.exists("Plattform Konto", konto_id):
			continue
		konto = frappe.get_doc("Plattform Konto", konto_id)
		rollen = [r.rolle for r in konto.get("rollen") or []]
		if "kommune" in rollen:
			continue
		behalten = bool(frappe.db.exists("Plattform Vorgang", {"nutzer_id": konto_id, "typ": ["in", UNTERNEHMEN_TYPEN]}))
		konto.set("rollen", [r for r in konto.get("rollen") or [] if r.rolle != "unternehmen" or behalten])
		konto.append("rollen", {"rolle": "kommune"})
		konto.save(ignore_permissions=True)
