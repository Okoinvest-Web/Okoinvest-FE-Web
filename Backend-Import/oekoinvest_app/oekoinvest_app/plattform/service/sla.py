# Copyright (c) 2026, ÖkoInvest GmbH
#
# Tickets: Kategorien, Prioritäten mit SLA (Kalenderstunden), Status, SLA-Stand – reine Funktionen ohne Frappe
# (Spiegel von src/lib/plattform/tickets/index.js; Tests: tests/test_service_rein.py).

from datetime import datetime, timedelta, timezone

TICKET_KATEGORIEN = {
	"stoerung": "Störung an einer Anlage",
	"abrechnung": "Abrechnung & Zähler",
	"vertrag": "Vertrag & Pacht",
	"portal": "Portal & Zugang",
	"projekt": "Projekt & Börse",
	"sonstiges": "Sonstiges",
}

# Priorität → (Bezeichnung, Reaktion h, Lösung h, Stufe, Helpdesk-Priorität)
TICKET_PRIORITAETEN = {
	"niedrig": ("Niedrig", 48, 240, 0, "Low"),
	"normal": ("Normal", 24, 120, 1, "Medium"),
	"hoch": ("Hoch", 8, 48, 2, "High"),
	"kritisch": ("Kritisch", 2, 24, 3, "Urgent"),
}

# Status → (Bezeichnung, Helpdesk-Status)
TICKET_STATUS = {
	"neu": ("Neu", "Open"),
	"in_arbeit": ("In Bearbeitung", "Open"),
	"wartet_kunde": ("Wartet auf Ihre Antwort", "Replied"),
	"geloest": ("Gelöst", "Resolved"),
	"geschlossen": ("Geschlossen", "Closed"),
}
TICKET_OFFEN = ["neu", "in_arbeit", "wartet_kunde"]
STATUS_AUS_HELPDESK = {"Open": "in_arbeit", "Replied": "wartet_kunde", "Paused": "wartet_kunde", "Resolved": "geloest", "Closed": "geschlossen"}
PRIORITAET_AUS_SCHWERE = {"info": "niedrig", "niedrig": "niedrig", "mittel": "normal", "hoch": "hoch", "kritisch": "kritisch"}


def _dt(wert):
	if wert is None or wert == "":
		return None
	if isinstance(wert, datetime):
		return wert if wert.tzinfo else wert.replace(tzinfo=timezone.utc)
	s = str(wert).replace("Z", "+00:00")
	d = datetime.fromisoformat(s)
	return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _iso(d):
	return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"


def sla_fristen(prioritaet, erstellt_am):
	"""(reaktion_bis, loesung_bis) als ISO-Zeitpunkte (UTC)."""
	p = TICKET_PRIORITAETEN.get(prioritaet) or TICKET_PRIORITAETEN["normal"]
	t = _dt(erstellt_am)
	return _iso(t + timedelta(hours=p[1])), _iso(t + timedelta(hours=p[2]))


def sla_stand(ticket, jetzt=None):
	"""{reaktion, loesung, ampel} – ampel ok | warn | verletzt | erledigt (Warnung ab 25 % Restzeit)."""
	jetzt = _dt(jetzt) if jetzt else datetime.now(timezone.utc)
	p = TICKET_PRIORITAETEN.get(ticket.get("prioritaet")) or TICKET_PRIORITAETEN["normal"]

	def pruef(bis, erfuellt_am, gesamt_h):
		b = _dt(bis)
		if not b:
			return None
		if erfuellt_am:
			return {"bis": bis, "erfuellt": True, "verletzt": _dt(erfuellt_am) > b, "restMin": 0}
		rest = round((b - jetzt).total_seconds() / 60)
		return {"bis": bis, "erfuellt": False, "verletzt": rest < 0, "restMin": rest, "knapp": 0 <= rest < gesamt_h * 60 * 0.25}

	reaktion = pruef(ticket.get("slaReaktionBis"), ticket.get("ersteReaktionAm"), p[1])
	loesung = pruef(ticket.get("slaLoesungBis"), ticket.get("geloestAm"), p[2])
	offen = ticket.get("status") in TICKET_OFFEN
	verletzt = bool((reaktion or {}).get("verletzt") or (loesung or {}).get("verletzt"))
	if not offen:
		ampel = "verletzt" if verletzt else "erledigt"
	elif verletzt:
		ampel = "verletzt"
	elif (reaktion or {}).get("knapp") or (loesung or {}).get("knapp"):
		ampel = "warn"
	else:
		ampel = "ok"
	return {"reaktion": reaktion, "loesung": loesung, "ampel": ampel}
