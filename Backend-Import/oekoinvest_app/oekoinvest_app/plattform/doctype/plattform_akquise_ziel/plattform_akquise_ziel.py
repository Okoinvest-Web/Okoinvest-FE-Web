# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Akquise Ziel – Kandidatenfläche aus der Geodaten-Akquise (Geometrie als GeoJSON-Text, Score, UW-Bezug),
# verknüpft mit der Fläche der Akquise-Pipeline und der Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“.
# Anlage nur über plattform/api/geodaten.py (Rechte: Backoffice-Bereich „geodaten“ + „akquise“ schreiben).

import json

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Akquise Ziel": "AZ", "Plattform Netzkapazitaet": "NK"})

MAX_GEOMETRIE = 500_000  # Zeichen – größere Verbünde liefert der Dienst vereinfacht


def geometrie_pruefen(text):
	"""GeoJSON-Text prüfen (Polygon/MultiPolygon, WGS84-Wertebereich). Liefert Fehlertext oder None."""
	if not text:
		return None
	if len(text) > MAX_GEOMETRIE:
		return "Geometrie zu groß (bitte vereinfacht übernehmen)."
	try:
		g = json.loads(text)
	except ValueError:
		return "Geometrie ist kein gültiges GeoJSON."
	if not isinstance(g, dict) or g.get("type") not in ("Polygon", "MultiPolygon"):
		return "Geometrie muss ein Polygon oder MultiPolygon (GeoJSON, WGS84) sein."

	def punkte(c):
		if isinstance(c, (list, tuple)) and len(c) >= 2 and all(isinstance(x, (int, float)) for x in c[:2]):
			yield c
		elif isinstance(c, (list, tuple)):
			for x in c:
				yield from punkte(x)

	for p in punkte(g.get("coordinates") or []):
		if not (-180 <= p[0] <= 180 and -90 <= p[1] <= 90):
			return "Koordinaten außerhalb von WGS84 (Längengrad, Breitengrad erwartet)."
	return None


class PlattformAkquiseZiel(PlattformDokument):
	def validate(self):
		fehler = geometrie_pruefen(self.geometrie)
		if fehler:
			frappe.throw(fehler)
		if self.score is not None and not (0 <= int(self.score) <= 100):
			frappe.throw("Score muss zwischen 0 und 100 liegen.")
