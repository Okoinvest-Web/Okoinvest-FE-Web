# Copyright (c) 2026, ÖkoInvest GmbH
# Geplante Aufgaben (hooks.scheduler_events) und Wiedervorlagen-Erinnerung.

import frappe
from frappe.utils import add_days, getdate, now_datetime, nowdate


def tokens_aufraeumen():
	"""Benutzte oder abgelaufene Einmal-Tokens nach 7 Tagen löschen (nur Hashes, keine Klartext-Tokens)."""
	grenze = add_days(now_datetime(), -7)
	frappe.db.delete("Plattform Token", {"ablauf": ("<", grenze)})
	frappe.db.delete("Plattform Token", {"benutzt": 1, "modified": ("<", grenze)})
	frappe.db.commit()


def _tag_de(d):
	return getdate(d).strftime("%d.%m.%Y") if d else "–"


def wiedervorlagen_fuer(konto_id=None):
	"""Fällige, offene Aufgaben (fällig ≤ heute, noch nicht erinnert) einmalig als Benachrichtigung melden.

	Ohne konto_id für alle Zuständigen (täglicher Scheduler), sonst nur für dieses Konto (beim Öffnen der Glocke).
	"""
	from oekoinvest_app.plattform.ausgabe import thread_info
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	filters = {"status": "offen", "faellig_am": ("<=", nowdate()), "erinnert_am": ("is", "not set")}
	if konto_id:
		filters["zustaendig_id"] = konto_id
	anzahl = 0
	for a in frappe.get_all("Plattform Aufgabe", filters=filters, fields=["name", "titel", "faellig_am", "zustaendig_id", "bezug_art", "bezug_id"], limit_page_length=500):
		info = thread_info(a.bezug_art, a.bezug_id, frappe._dict(id=a.zustaendig_id, rollen=["admin"])) if a.bezug_art and a.bezug_id else None
		anlegen(
			a.zustaendig_id,
			"aufgabe",
			f"Wiedervorlage fällig: {a.titel}",
			f"Fällig am {_tag_de(a.faellig_am)}" + (f" · {info['titel']}" if info else ""),
			"/portal/admin/aufgaben?ansicht=meine",
			a.bezug_art or "aufgabe",
			a.bezug_id or a.name,
		)
		frappe.db.set_value("Plattform Aufgabe", a.name, "erinnert_am", now_datetime(), update_modified=False)
		anzahl += 1
	return anzahl


def wiedervorlagen_erinnern():
	"""Täglich: fällige Wiedervorlagen melden (Glocke + E-Mail je nach Einstellung des Zuständigen)."""
	wiedervorlagen_fuer()
	frappe.db.commit()
