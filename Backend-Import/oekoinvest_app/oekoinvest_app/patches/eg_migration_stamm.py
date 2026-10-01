# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP1: Prototyp-Daten (Plattform Energiegemeinschaft / Plattform EG Teilnahme, JSON-Feld „daten“) in die
# normalisierten DocTypes „Plattform EG …“ übernehmen. Idempotent (migriert_aus); nur österreichische Gemeinschaften.
# Die alten DocTypes bleiben lesbar (DE/CH bleiben im Prototyp). Regeln: plattform/eg_stamm_kern.py migration_aus_prototyp.

import frappe


def execute():
	if not frappe.db.exists("DocType", "Plattform EG Gemeinschaft") or not frappe.db.exists("DocType", "Plattform Energiegemeinschaft"):
		return
	from oekoinvest_app.plattform.api import eg_stamm as S

	r = S._migration_lauf()
	if not r["gemeinschaften"]:
		return
	S.migration_schreiben(r)
	frappe.db.commit()
	for w in r["warnungen"]:
		print(f"[eg_migration_stamm] {w}")
