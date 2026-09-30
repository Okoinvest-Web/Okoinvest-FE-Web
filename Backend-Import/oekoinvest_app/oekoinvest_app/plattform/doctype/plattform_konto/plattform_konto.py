# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Konto – Erweiterung zum Frappe-User (1:1 über `user`).
#  - E-Mail = User.name, immer kleingeschrieben
#  - Rollen (Website-Kennungen) werden auf die Frappe-Rollen des Users übertragen
#  - Sperren (aktiv 1 → 0) erhöht die Sitzungsversion: alle Website-Sitzungen enden sofort
#  - Passwort liegt ausschließlich im User (frappe.utils.password), nie hier.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import ALLE_ROLLEN_IDS, FRAPPE_ROLLEN, ROLLEN


class PlattformKonto(PlattformDokument):
	def validate(self):
		self.email = (self.email or "").strip().lower()
		if not self.user:
			self.user = self.email
		if self.user != self.email:
			frappe.throw("E-Mail und Frappe-Benutzer des Kontos müssen übereinstimmen.")
		gesehen = []
		for r in list(self.get("rollen") or []):
			if r.rolle not in ALLE_ROLLEN_IDS or r.rolle in gesehen:
				self.remove(r)
			else:
				gesehen.append(r.rolle)
		if not self.is_new() and self.has_value_changed("aktiv") and not cint(self.aktiv):
			self.sitzung_version = cint(self.sitzung_version) + 1

	def on_update(self):
		self.benutzer_abgleichen()

	def on_trash(self):
		frappe.db.delete("Plattform Token", {"nutzer_id": self.name})
		frappe.db.delete("Plattform Benachrichtigung", {"nutzer_id": self.name})
		# Login, Sicherheit & Teams: kontobezogene Sicherheitsdaten entfallen mit dem Konto
		for dt in ("Plattform Sitzung", "Plattform Geraet", "Plattform Anmeldung", "Plattform Zwei Faktor", "Plattform Mitgliedschaft"):
			frappe.db.delete(dt, {"nutzer_id": self.name})

	def benutzer_abgleichen(self):
		"""Frappe-Rollen, Namen und Aktiv-Status des Users an das Konto angleichen."""
		if not frappe.db.exists("User", self.user):
			return
		user = frappe.get_doc("User", self.user)
		soll = {ROLLEN[r.rolle][0] for r in (self.get("rollen") or []) if r.rolle in ROLLEN}
		ist = {r.role for r in (user.get("roles") or [])}
		geaendert = False
		for r in list(user.get("roles") or []):
			if r.role in FRAPPE_ROLLEN and r.role not in soll:
				user.remove(r)
				geaendert = True
		for rolle in sorted(soll - ist):
			if frappe.db.exists("Role", rolle):
				user.append("roles", {"role": rolle})
				geaendert = True
		aktiv = 1 if cint(self.aktiv) else 0
		if cint(user.enabled) != aktiv:
			user.enabled = aktiv
			geaendert = True
		for feld, wert in (("first_name", self.vorname), ("last_name", self.nachname)):
			if wert and user.get(feld) != wert:
				user.set(feld, wert)
				geaendert = True
		if geaendert:
			user.flags.ignore_permissions = True
			user.flags.no_welcome_mail = True
			user.save()
