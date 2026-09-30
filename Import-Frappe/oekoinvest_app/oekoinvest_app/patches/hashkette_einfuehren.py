# Copyright (c) 2026, ÖkoInvest GmbH
#
# Einführung der Hash-Kette: vorhandene Einträge des Aktivitätsprotokolls (ohne entry_hash) werden in ihrer
# Reihenfolge (creation, name) einmalig „nachgesiegelt“ und markiert. Danach verkettet der Controller jeden
# neuen Eintrag selbst. Idempotent: bereits verkettete Einträge bleiben unverändert.

import frappe

from oekoinvest_app.plattform.hashkette import KETTE_START, doc_als_eintrag, eintrag_hash


def execute():
	kopf = frappe.get_single("Plattform Kette")
	prev = kopf.letzter_hash or KETTE_START
	nr = int(kopf.anzahl or 0)
	offen = frappe.get_all(
		"Plattform Aktivitaet",
		filters={"entry_hash": ("is", "not set")},
		fields=["name", "am", "nutzer_id", "aktion", "objekt_art", "objekt_id", "text", "ip", "creation"],
		order_by="creation asc, name asc",
		limit_page_length=0,
	)
	for d in offen:
		nr += 1
		h = eintrag_hash(prev, doc_als_eintrag(d))
		frappe.db.set_value("Plattform Aktivitaet", d.name, {"kette_nr": nr, "prev_hash": prev, "entry_hash": h, "nachgesiegelt": 1}, update_modified=False)
		prev = h
	frappe.db.set_single_value("Plattform Kette", {"letzter_hash": prev if nr else None, "anzahl": nr, "nachgesiegelt": int(kopf.nachgesiegelt or 0) + len(offen), **({} if kopf.seit else {"seit": frappe.utils.now_datetime()})})
