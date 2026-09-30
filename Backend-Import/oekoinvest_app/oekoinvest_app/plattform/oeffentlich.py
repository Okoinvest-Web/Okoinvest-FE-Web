# Copyright (c) 2026, ÖkoInvest GmbH
#
# Sichtbarkeitsregeln der Projektbörse (Positivliste) – identisch zu src/lib/plattform/oeffentlich.js.
#  - öffentlich:  anonymer Teaser, grobe Region, keine Anbieterdaten
#  - vertraulich: nur für Anbieter, Backoffice und Investoren mit freigegebenem NDA
# Projekte verlassen die App ausschließlich über diese Projektionen (bzw. vollständig nur für Anbieter/Admin).

OEFFENTLICH = [
	"id", "slug", "titel", "typ", "land", "bundesland", "region", "mwp", "mwhSpeicher", "flaecheHa", "phase", "netzanschluss",
	"codGeplant", "preisModus", "preis", "preisProKwp", "beschreibung", "highlights", "status", "veroeffentlichtAm", "demo",
]

VERTRAULICH_FELDER = [
	"gemeinde", "gemarkung", "flurstuecke", "netzbetreiber", "einspeisepunkt", "entfernungNetzKm",
	"sicherung", "planungsrecht", "ertragKwhKwp", "verguetung", "details",
]


def projekt_oeffentlich(p):
	"""Öffentlicher Teaser aus der camelCase-Ausgabe eines Projekts."""
	if not p:
		return None
	o = {k: p[k] for k in OEFFENTLICH if k in p}
	o["highlights"] = p.get("highlights") if isinstance(p.get("highlights"), list) else []
	return o


def projekt_vertraulich(p):
	"""Vertrauliche Felder – nur nach NDA-Freigabe (bzw. Anbieter/Admin)."""
	v = (p or {}).get("vertraulich") or {}
	if not isinstance(v, dict):
		return {}
	return {k: v[k] for k in VERTRAULICH_FELDER if k in v and v[k] != ""}
