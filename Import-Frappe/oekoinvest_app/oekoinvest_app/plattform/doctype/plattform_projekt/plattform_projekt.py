# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Projekt – Projekt der Projektbörse (Automat „projekt“).
#  - Status nur entlang des Automaten (StatusDokument)
#  - Ab Einreichung ist die akzeptierte Provisionsvereinbarung Pflicht
#  - Veröffentlicht/reserviert/verkauft nur mit Provisionssatz 1,5–3 %
#  - Übergang nach „verkauft“ erzeugt automatisch die Provision (on_update → ablauf.verkauf_abschliessen)
#  - Slug = slugify(titel)-<letzte 4 Zeichen der ID>, fix ab erster Veröffentlichung

import json

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.basis import StatusDokument
from oekoinvest_app.plattform.konstanten import PROVISION_MAX, PROVISION_MIN
from oekoinvest_app.plattform.validierung import slugify

MIT_PROVISION = ("pruefung", "veroeffentlicht", "reserviert", "verkauft")


class PlattformProjekt(StatusDokument):
	prozess_art = "projekt"

	def validate(self):
		self.status_pruefen()
		self.slug_setzen()
		if self.status in MIT_PROVISION and not self.provision_akzeptiert_am():
			frappe.throw("Bitte akzeptieren Sie zuerst die Provisionsvereinbarung.", frappe.ValidationError)
		if self.status in ("veroeffentlicht", "reserviert", "verkauft"):
			satz = flt(self.provision_satz)
			if not (PROVISION_MIN - 1e-9 <= satz <= PROVISION_MAX + 1e-9):
				frappe.throw("Provisionssatz muss zwischen 1,5 und 3 % liegen.", frappe.ValidationError)
		if self.status == "verkauft":
			if not self.kaeufer_interesse_id or flt(self.kaufpreis) <= 0:
				frappe.throw("Für den Verkauf sind Käufer und Kaufpreis Pflicht.", frappe.ValidationError)
			if frappe.db.get_value("Plattform Interesse", self.kaeufer_interesse_id, "projekt_id") != self.name:
				frappe.throw("Der Käufer muss ein Interessent dieses Projekts sein.", frappe.ValidationError)
		if self.preis_modus != "gesamt":
			self.preis = 0
		if self.preis_modus != "proKwp":
			self.preis_pro_kwp = 0

	def on_update(self):
		if self.status == "verkauft" and self.has_value_changed("status"):
			from oekoinvest_app.plattform.ablauf import verkauf_abschliessen

			verkauf_abschliessen(self)

	def provision_akzeptiert_am(self):
		wert = self.provision_akzeptiert
		if isinstance(wert, str) and wert:
			try:
				wert = json.loads(wert)
			except ValueError:
				wert = None
		return wert.get("am") if isinstance(wert, dict) else None

	def slug_setzen(self):
		if self.slug and self.veroeffentlicht_am:
			return  # fix nach der ersten Veröffentlichung
		basis = slugify(self.titel) or "projekt"
		self.slug = f"{basis}-{self.name[-4:].lower()}"
