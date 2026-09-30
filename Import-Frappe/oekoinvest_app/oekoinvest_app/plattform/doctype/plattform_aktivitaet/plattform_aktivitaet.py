# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Aktivitaet – Aktivitätsprotokoll, append-only und revisionssicher (Hash-Kette).
# Einträge entstehen nur über kern.protokoll(); Ändern, Umbenennen und Löschen verbietet der Controller
# (auch für Administratoren). Aufbewahrung/Löschkonzept: siehe ANLEITUNG.md (offener Punkt).
#
# Hash-Kette (plattform/hashkette.py): Beim Anlegen (validate, Kennung steht dann fest) wird der Kettenkopf
# „Plattform Kette“ (Single) per SELECT … FOR UPDATE gesperrt; der Eintrag erhält kette_nr = anzahl + 1,
# prev_hash = letzter Hash und entry_hash = SHA-256(prev_hash + LF + Inhalt). Der neue Kopf wird in derselben
# Transaktion geschrieben – parallele Einträge werden dadurch serialisiert, die Reihenfolge ist eindeutig.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument

MELDUNG = "Das Aktivitätsprotokoll kann nicht verändert werden."
KETTE = "Plattform Kette"


def kopf_sperren():
	"""Kettenkopf lesen und bis zum Ende der Transaktion sperren."""
	zeilen = frappe.db.sql(
		"select field, value from `tabSingles` where doctype=%s and field in ('letzter_hash', 'anzahl', 'seit') for update",
		KETTE,
		as_dict=True,
	)
	werte = {z.field: z.value for z in zeilen}
	return werte.get("letzter_hash") or None, int(werte.get("anzahl") or 0), werte.get("seit")


class PlattformAktivitaet(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)
		self.verketten()

	def verketten(self):
		from oekoinvest_app.plattform.hashkette import KETTE_START, doc_als_eintrag, eintrag_hash
		from oekoinvest_app.plattform.kern import jetzt

		letzter, anzahl, seit = kopf_sperren()
		if not self.am:
			self.am = jetzt()
		self.kette_nr = anzahl + 1
		self.prev_hash = letzter or KETTE_START
		self.entry_hash = eintrag_hash(self.prev_hash, doc_als_eintrag(self))
		frappe.db.set_single_value(KETTE, {"letzter_hash": self.entry_hash, "anzahl": self.kette_nr, **({} if seit else {"seit": self.am})})

	def on_trash(self):
		frappe.throw("Einträge des Aktivitätsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Aktivitaet", ["objekt_id"])
	frappe.db.add_index("Plattform Aktivitaet", ["kette_nr"])
