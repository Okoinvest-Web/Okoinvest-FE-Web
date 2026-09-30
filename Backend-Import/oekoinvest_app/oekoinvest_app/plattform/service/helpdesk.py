# Copyright (c) 2026, ÖkoInvest GmbH
#
# Adapter Frappe Helpdesk (optional, Schalter `oekoinvest_helpdesk` in site_config, App `helpdesk` installiert).
#
# Die Plattform führt ihre Tickets selbst („Plattform Ticket“, Rechte und SLA wie im Portal). Mit Helpdesk wird jedes
# Ticket zusätzlich als „HD Ticket“ angelegt, öffentliche Antworten werden als Communication gespiegelt und der Status
# wird beim Lesen abgeglichen (Agent schließt im Helpdesk → Portal zeigt „Gelöst“).
#
# ACHTUNG – vor Einsatz gegen die installierte Helpdesk-Version prüfen: genutzt werden nur die verbreiteten Felder
# subject, description, raised_by, status, priority, ticket_type (Link), agent_group (optional). Priorität/Typ werden nur
# gesetzt, wenn der verlinkte Datensatz existiert (HD Ticket Priority / HD Ticket Type). Fehler brechen nie den Vorgang ab.

import frappe

from oekoinvest_app.plattform.service.integration import aktiv
from oekoinvest_app.plattform.service.sla import STATUS_AUS_HELPDESK, TICKET_KATEGORIEN, TICKET_PRIORITAETEN, TICKET_STATUS

DT = "HD Ticket"


def _verfuegbar():
	return aktiv("helpdesk") and frappe.db.exists("DocType", DT)


def ticket_anlegen(t, text, email):
	"""Plattform Ticket → HD Ticket. Liefert den Namen des HD Tickets oder None."""
	if not _verfuegbar():
		return None
	try:
		meta = frappe.get_meta(DT)
		daten = {"doctype": DT, "subject": f"[{t.name}] {t.betreff}"[:140], "description": frappe.utils.escape_html(text or ""), "raised_by": email or ""}
		prio = TICKET_PRIORITAETEN.get(t.prioritaet, TICKET_PRIORITAETEN["normal"])[4]
		if meta.has_field("priority") and frappe.db.exists("HD Ticket Priority", prio):
			daten["priority"] = prio
		typ = TICKET_KATEGORIEN.get(t.kategorie)
		if meta.has_field("ticket_type") and typ and frappe.db.exists("HD Ticket Type", typ):
			daten["ticket_type"] = typ
		team = frappe.conf.get("oekoinvest_helpdesk_team")
		if team and meta.has_field("agent_group") and frappe.db.exists("HD Team", team):
			daten["agent_group"] = team
		doc = frappe.get_doc(daten)
		doc.flags.ignore_permissions = True
		doc.insert(ignore_permissions=True)
		return doc.name
	except Exception:
		frappe.log_error(title="ÖkoInvest: HD Ticket konnte nicht angelegt werden", message=f"Plattform Ticket {t.name}")
		return None


def antwort_spiegeln(t, text, vom_backoffice):
	"""Öffentliche Antwort als Communication am HD Ticket (interne Notizen werden NIE gespiegelt)."""
	if not (_verfuegbar() and t.get("helpdesk")):
		return
	try:
		frappe.get_doc(
			{
				"doctype": "Communication",
				"communication_type": "Communication",
				"communication_medium": "Email",
				"sent_or_received": "Sent" if vom_backoffice else "Received",
				"subject": f"[{t.name}] {t.betreff}"[:140],
				"content": frappe.utils.escape_html(text),
				"reference_doctype": DT,
				"reference_name": t.helpdesk,
				"status": "Linked",
			}
		).insert(ignore_permissions=True)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Antwort nicht nach Helpdesk gespiegelt", message=f"Plattform Ticket {t.name}")


def status_setzen(t):
	"""Plattform-Status → HD Ticket."""
	if not (_verfuegbar() and t.get("helpdesk")):
		return
	try:
		frappe.db.set_value(DT, t.helpdesk, "status", TICKET_STATUS.get(t.status, ("", "Open"))[1], update_modified=True)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Helpdesk-Status nicht gesetzt", message=f"Plattform Ticket {t.name}")


def status_abgleichen(t):
	"""HD Ticket → Plattform-Status (beim Lesen). Liefert den neuen Status oder None."""
	if not (_verfuegbar() and t.get("helpdesk")):
		return None
	hd = frappe.db.get_value(DT, t.helpdesk, "status")
	neu = STATUS_AUS_HELPDESK.get(hd)
	return neu if neu and neu != t.status and not (t.status == "neu" and neu == "in_arbeit") else None
