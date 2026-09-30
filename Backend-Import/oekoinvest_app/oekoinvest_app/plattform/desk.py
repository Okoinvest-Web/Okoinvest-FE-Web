# Copyright (c) 2026, ÖkoInvest GmbH
#
# Statuswechsel im Frappe-Desk (Knöpfe „Status: …“ im Formular, public/js/desk_status.js).
#
# Warum keine aktiven Frappe-Workflows? Die Website ruft Frappe als API-Benutzer auf und wechselt per
# frappe.set_user() in den (Website-)User des Kontos. Ein aktiver Workflow würde JEDE Statusänderung mit den
# Frappe-Rollen dieses Users und dessen DocType-Leserechten prüfen – die fachlichen Rollen haben bewusst keine
# DocPerm, jeder Statuswechsel aus dem Portal würde scheitern. Die Workflows unter fixtures/workflow.json sind
# daher INAKTIV (Prozessdarstellung im Workflow-Builder); die Knöpfe hier nutzen denselben Weg wie das Portal:
#   prozesse.pruefe_uebergang (Automat, Pflichtangaben, Bedingungen) → ablauf.uebergang_anwenden
#   (Statusverlauf, Nachricht an den Nutzer, Provision/Interessen, Protokoll, Automationen).
# Erlaubt sind nur Übergänge mit wer = „admin“ – Eigentümer-Schritte (Pachtangebot annehmen, Projekt einreichen,
# NDA akzeptieren, LOI abgeben) bleiben dem Portal vorbehalten.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.kern import protokoll
from oekoinvest_app.plattform.prozesse import PFLICHT_LABEL, PROZESSE, pruefe_uebergang, status_label

ART_FUER_DOCTYPE = {
	"Plattform Vorgang": "vorgang",
	"Plattform Flaeche": "flaeche",
	"Plattform Projekt": "projekt",
	"Plattform Interesse": "interesse",
	"Plattform Provision": "provision",
}

# Desk-Rollen, die Statuswechsel je Objektart auslösen dürfen (zusätzlich immer: System Manager)
ROLLEN_FUER_ART = {
	"vorgang": ["ÖkoInvest Admin", "ÖkoInvest Akquise"],
	"flaeche": ["ÖkoInvest Admin", "ÖkoInvest Akquise"],
	"projekt": ["ÖkoInvest Admin", "ÖkoInvest Transaktion"],
	"interesse": ["ÖkoInvest Admin", "ÖkoInvest Transaktion"],
	"provision": ["ÖkoInvest Admin", "ÖkoInvest Buchhaltung"],
}

# Pflichtangaben → Dialogfelder (Frappe-Feldtypen); verschachtelte Angaben mit „__“ (pachtangebot__euroProHaJahr)
DIALOG_FELDER = {
	"grund": [{"fieldname": "grund", "fieldtype": "Small Text", "label": "Begründung (erscheint beim Nutzer)", "reqd": 1}],
	"kommentar": [{"fieldname": "kommentar", "fieldtype": "Small Text", "label": "Kommentar an den Nutzer", "reqd": 1}],
	"provisionSatz": [{"fieldname": "provisionSatz", "fieldtype": "Float", "label": "Provisionssatz in % (1,5–3)", "reqd": 1}],
	"kaufpreis": [{"fieldname": "kaufpreis", "fieldtype": "Currency", "label": "Kaufpreis (EUR)", "reqd": 1}],
	"interesseId": [{"fieldname": "interesseId", "fieldtype": "Link", "options": "Plattform Interesse", "label": "Käufer (Interesse)", "reqd": 1}],
	"pachtangebot": [
		{"fieldname": "pachtangebot__euroProHaJahr", "fieldtype": "Currency", "label": "Pacht je ha und Jahr (EUR)", "reqd": 1},
		{"fieldname": "pachtangebot__laufzeitJahre", "fieldtype": "Int", "label": "Laufzeit (Jahre)", "reqd": 1},
		{"fieldname": "pachtangebot__verlaengerung", "fieldtype": "Data", "label": "Verlängerungsoption"},
		{"fieldname": "pachtangebot__text", "fieldtype": "Small Text", "label": "Text an den Eigentümer"},
	],
}


def _art(doctype):
	art = ART_FUER_DOCTYPE.get(doctype)
	if not art:
		frappe.throw("Für diesen DocType gibt es keinen Zustandsautomaten.", frappe.ValidationError)
	return art


def darf(art):
	rollen = set(frappe.get_roles())
	return "System Manager" in rollen or bool(rollen.intersection(ROLLEN_FUER_ART.get(art, [])))


def _desk_nutzer():
	"""Nutzer-Objekt für Statusverlauf/Protokoll: verknüpftes Backoffice-Konto (gleiche E-Mail) oder anonym „Desk“."""
	konto = frappe.db.get_value("Plattform Konto", {"email": frappe.session.user}, "name")
	return frappe._dict(id=konto, rollen=["admin"], desk=frappe.session.user)


@frappe.whitelist(methods=["GET", "POST"])
def aktionen(doctype, name):
	"""Mögliche Admin-Übergänge ab dem aktuellen Status (für die Knöpfe im Formular)."""
	art = _art(doctype)
	if not frappe.has_permission(doctype, "read", name) or not darf(art):
		return []
	status = frappe.db.get_value(doctype, name, "status")
	ergebnis = []
	for u in PROZESSE[art]["uebergaenge"]:
		if u["wer"] != "admin" or status not in u["von"]:
			continue
		felder = [f for p in u["pflicht"] for f in DIALOG_FELDER.get(p, [])]
		if u["nach"] in ("abgelehnt", "zurueckgezogen") and not felder:
			felder = [{"fieldname": "kommentar_frei", "fieldtype": "Small Text", "label": "Kommentar (optional)"}]
		ergebnis.append(
			{
				"nach": u["nach"],
				"nachLabel": status_label(art, u["nach"]),
				"aktion": u["aktion"],
				"pflicht": [PFLICHT_LABEL.get(p, p) for p in u["pflicht"]],
				"felder": felder,
				"gefahr": u["nach"] in ("abgelehnt", "storniert"),
			}
		)
	return ergebnis


def _extra(angaben):
	angaben = frappe.parse_json(angaben) if angaben else {}
	extra = {}
	for schluessel, wert in (angaben or {}).items():
		if schluessel == "kommentar_frei":
			if wert:
				extra["kommentar"] = wert
			continue
		if "__" in schluessel:
			oben, unten = schluessel.split("__", 1)
			extra.setdefault(oben, {})[unten] = wert
		else:
			extra[schluessel] = wert
	return extra


@frappe.whitelist(methods=["POST"])
def wechseln(doctype, name, nach, angaben=None):
	"""Statuswechsel aus dem Desk – gleiche Prüfung und Nebenwirkungen wie im Portal-Backoffice."""
	from oekoinvest_app.plattform.ablauf import uebergang_anwenden

	art = _art(doctype)
	if not darf(art) or not frappe.has_permission(doctype, "write", name):
		frappe.throw("Für diesen Statuswechsel fehlt Ihnen die Berechtigung.", frappe.PermissionError)
	o = frappe.get_doc(doctype, name)
	extra = _extra(angaben)
	pruefe_uebergang(art, o.status, nach, "admin", extra, objekt=o)
	n = _desk_nutzer()
	ip = getattr(frappe.local, "request_ip", "") or ""
	uebergang_anwenden(n, art, o, nach, "admin", extra, ip)
	protokoll(n, "desk_status", art, o.name, f"Statuswechsel im Desk durch {frappe.session.user}", ip)
	return {"status": o.status, "label": status_label(art, o.status), "ok": cint(1)}
