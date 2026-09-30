# Copyright (c) 2026, ÖkoInvest GmbH
#
# Mitglieder: Interesse Genossenschaft (im Aufbau – nur Vormerkung) – 1:1 aus src/lib/plattform/fach/mitglied.js.

import re

ANTEIL_BEISPIEL_EUR = 250  # markt.js GEMEINSCHAFTEN.beteiligung.anteilEur (Beispielwert, Satzung legt fest)
MITGLIED_ARTEN = ["privat", "landwirt", "unternehmen", "kommune", "verein"]
MITGLIED_INTERESSEN = ["beteiligung", "strom", "mitwirkung", "flaeche"]
BESTAETIGUNGEN = ["aufbau", "risiko", "kuendigung", "beratung"]


class MitgliedFehler(ValueError):
	pass


def geno_interesse_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	land = d.get("land") if d.get("land") in ("DE", "AT", "CH") else "DE"
	try:
		anteile = int(round(float(d.get("anteile"))))
	except (TypeError, ValueError):
		anteile = 0
	if not 1 <= anteile <= 1000:
		raise MitgliedFehler("Bitte geben Sie an, wie viele Anteile Sie voraussichtlich zeichnen möchten (1–1.000).")
	art = d.get("art") if d.get("art") in MITGLIED_ARTEN else ""
	if not art:
		raise MitgliedFehler("Bitte wählen Sie, als wer Sie beitreten möchten.")
	interessen = []
	for x in d.get("interessen") or []:
		if x in MITGLIED_INTERESSEN and x not in interessen:
			interessen.append(x)
	if not interessen:
		raise MitgliedFehler("Bitte wählen Sie mindestens ein Interesse.")
	best = d.get("bestaetigt") if isinstance(d.get("bestaetigt"), dict) else {}
	if any(best.get(k) is not True for k in BESTAETIGUNGEN):
		raise MitgliedFehler("Bitte bestätigen Sie, dass Sie die Hinweise zur Genossenschaft gelesen haben.")
	return {
		"land": land, "anteile": anteile, "betragBeispielEur": anteile * ANTEIL_BEISPIEL_EUR, "art": art, "interessen": interessen,
		"bestaetigt": {k: True for k in BESTAETIGUNGEN}, "bemerkung": re.sub(r"[\x00-\x1f\x7f]", " ", str(d.get("bemerkung") or "")).strip()[:500],
	}
