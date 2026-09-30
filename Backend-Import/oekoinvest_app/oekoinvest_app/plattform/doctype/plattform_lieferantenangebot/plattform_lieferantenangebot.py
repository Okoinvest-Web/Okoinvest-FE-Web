# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Lieferantenangebot – Verdecktes Angebot (Preisblatt) eines Versorgers je Runde – nur der Versorger selbst und das Backoffice sehen es.
# Energiebeschaffung (plattform/api/energie.py). Daten nur über die API; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformLieferantenangebot(PlattformDokument):
	def validate(self):
		# Verdeckte Angebote: nach Abgabe keine Preisänderung im Desk (Nachweis); Änderungen nur als neue Version über die API
		if not self.is_new() and not getattr(self.flags, 'ueber_api', False):
			alt = self.get_doc_before_save()
			if alt and (alt.positionen != self.positionen or alt.bindefrist_bis != self.bindefrist_bis):
				import frappe

				frappe.throw('Angebote werden nur über das Versorger-Portal geändert.')
