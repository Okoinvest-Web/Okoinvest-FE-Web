# Copyright (c) 2026, ÖkoInvest GmbH
# Geplante Aufgaben (hooks.scheduler_events).

import frappe
from frappe.utils import add_days, now_datetime


def tokens_aufraeumen():
	"""Benutzte oder abgelaufene Einmal-Tokens nach 7 Tagen löschen (nur Hashes, keine Klartext-Tokens)."""
	grenze = add_days(now_datetime(), -7)
	frappe.db.delete("Plattform Token", {"ablauf": ("<", grenze)})
	frappe.db.delete("Plattform Token", {"benutzt": 1, "modified": ("<", grenze)})
	frappe.db.commit()
