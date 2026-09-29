# Copyright (c) 2026, ÖkoInvest GmbH
#
# Zustandsautomaten – 1:1 aus src/lib/plattform/prozesse.js (PROZESSE).
# Ein Übergang ist erlaubt, wenn (von, nach, wer) in der Tabelle steht; `wer` ∈ admin | eigentuemer | system.
# Pflichtangaben fehlen → ValidationError, Bedingung nicht erfüllt → ValidationError mit Liste,
# Übergang nicht vorgesehen → DuplicateEntryError (HTTP 409), falsche Rolle → PermissionError (403).

import frappe

from oekoinvest_app.plattform.validierung import zahl

OFFEN_VORGANG = ["eingegangen", "in_pruefung", "qualifiziert", "angebot"]
OFFEN_FLAECHE = ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"]


def _u(von, nach, wer, aktion, pflicht=None, bedingung=None):
	return {"von": list(von), "nach": nach, "wer": wer, "aktion": aktion, "pflicht": pflicht or [], "bedingung": bedingung}


PROZESSE = {
	"vorgang": {
		"label": "Anfrage",
		"start": "eingegangen",
		"pipeline": ["eingegangen", "in_pruefung", "qualifiziert", "angebot", "abgeschlossen"],
		"status": {
			"eingegangen": "Eingegangen",
			"in_pruefung": "In Prüfung",
			"qualifiziert": "Qualifiziert",
			"angebot": "Angebot / Gespräch",
			"abgeschlossen": "Abgeschlossen",
			"abgelehnt": "Abgelehnt",
			"zurueckgezogen": "Zurückgezogen",
		},
		"uebergaenge": [
			_u(["eingegangen"], "in_pruefung", "admin", "Prüfung beginnen"),
			_u(["in_pruefung"], "qualifiziert", "admin", "Als qualifiziert markieren"),
			_u(["qualifiziert"], "angebot", "admin", "Angebot / Gespräch"),
			_u(["angebot"], "abgeschlossen", "admin", "Abschließen"),
			_u(OFFEN_VORGANG, "abgelehnt", "admin", "Ablehnen", ["grund"]),
			_u(["abgelehnt", "zurueckgezogen"], "in_pruefung", "admin", "Wieder aufnehmen"),
			_u(OFFEN_VORGANG, "zurueckgezogen", "eigentuemer", "Anfrage zurückziehen"),
		],
	},
	"flaeche": {
		"label": "Fläche",
		"start": "eingegangen",
		"pipeline": ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung", "bau", "betrieb"],
		"status": {
			"entwurf": "Entwurf",
			"eingegangen": "Eingegangen",
			"vorpruefung": "Vorprüfung",
			"standortanalyse": "Standortanalyse",
			"pachtangebot": "Pachtangebot",
			"vertrag": "Vertrag",
			"planung": "Planung & Genehmigung",
			"bau": "Bau",
			"betrieb": "Betrieb",
			"abgelehnt": "Abgelehnt",
		},
		"uebergaenge": [
			_u(["entwurf"], "eingegangen", "eigentuemer", "Zur Prüfung einreichen", bedingung="flaecheVollstaendig"),
			_u(["entwurf"], "eingegangen", "admin", "Als eingegangen übernehmen"),
			_u(["eingegangen"], "vorpruefung", "admin", "Vorprüfung starten"),
			_u(["vorpruefung"], "standortanalyse", "admin", "Standortanalyse starten"),
			_u(["standortanalyse"], "pachtangebot", "admin", "Pachtangebot senden", ["pachtangebot"]),
			_u(["pachtangebot"], "vertrag", "eigentuemer", "Pachtangebot annehmen"),
			_u(["pachtangebot"], "vertrag", "admin", "Angebot angenommen (erfasst)"),
			_u(["vertrag"], "planung", "admin", "Planung & Genehmigung starten"),
			_u(["planung"], "bau", "admin", "Baubeginn"),
			_u(["bau"], "betrieb", "admin", "Inbetriebnahme"),
			_u(["entwurf", *OFFEN_FLAECHE], "abgelehnt", "admin", "Ablehnen", ["grund"]),
			_u(["abgelehnt"], "vorpruefung", "admin", "Wieder aufnehmen"),
		],
	},
	"projekt": {
		"label": "Projekt",
		"start": "entwurf",
		"pipeline": ["entwurf", "pruefung", "veroeffentlicht", "reserviert", "verkauft"],
		"status": {
			"entwurf": "Entwurf",
			"pruefung": "In Prüfung",
			"veroeffentlicht": "Veröffentlicht",
			"reserviert": "Reserviert",
			"verkauft": "Verkauft",
			"abgelehnt": "Abgelehnt",
		},
		"uebergaenge": [
			_u(["entwurf"], "pruefung", "eigentuemer", "Zur Prüfung einreichen", bedingung="projektEinreichbar"),
			_u(["pruefung"], "entwurf", "eigentuemer", "Einreichung zurückziehen"),
			_u(["pruefung"], "veroeffentlicht", "admin", "Veröffentlichen", ["provisionSatz"]),
			_u(["pruefung"], "entwurf", "admin", "Zur Überarbeitung zurückgeben", ["kommentar"]),
			_u(["pruefung"], "abgelehnt", "admin", "Ablehnen", ["grund"]),
			_u(["abgelehnt"], "entwurf", "eigentuemer", "Überarbeiten"),
			_u(["veroeffentlicht"], "entwurf", "eigentuemer", "Von der Börse nehmen"),
			_u(["veroeffentlicht"], "reserviert", "admin", "Als reserviert markieren"),
			_u(["reserviert"], "veroeffentlicht", "admin", "Reservierung aufheben"),
			_u(["veroeffentlicht", "reserviert"], "verkauft", "admin", "Verkauf abschließen", ["interesseId", "kaufpreis"]),
		],
	},
	"interesse": {
		"label": "Projektinteresse",
		"start": "gemerkt",
		"pipeline": ["gemerkt", "nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen"],
		"status": {
			"gemerkt": "Gemerkt",
			"nda_angefragt": "NDA angefragt",
			"nda_freigegeben": "Datenraum frei",
			"loi_abgegeben": "LOI abgegeben",
			"loi_angenommen": "LOI angenommen",
			"abgeschlossen": "Abgeschlossen",
			"abgelehnt": "Abgelehnt",
		},
		"uebergaenge": [
			_u(["gemerkt"], "nda_angefragt", "eigentuemer", "NDA akzeptieren & Datenraum anfragen", ["ndaAkzeptiert"]),
			_u(["nda_angefragt"], "nda_freigegeben", "admin", "Datenraum freigeben"),
			_u(["nda_angefragt"], "abgelehnt", "admin", "Ablehnen", ["grund"]),
			_u(["nda_freigegeben"], "loi_abgegeben", "eigentuemer", "LOI abgeben", ["loi"]),
			_u(["loi_abgegeben"], "loi_angenommen", "admin", "LOI annehmen"),
			_u(["loi_abgegeben", "nda_freigegeben"], "abgelehnt", "admin", "Ablehnen", ["grund"]),
			_u(["loi_angenommen", "loi_abgegeben", "nda_freigegeben"], "abgeschlossen", "system", "Kauf abgeschlossen"),
			_u(["gemerkt", "nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen"], "abgelehnt", "system", "Projekt anderweitig verkauft"),
		],
	},
	"provision": {
		"label": "Provision",
		"start": "offen",
		"pipeline": ["offen", "in_rechnung", "bezahlt"],
		"status": {
			"offen": "Offen",
			"in_rechnung": "In Rechnung",
			"bezahlt": "Bezahlt",
			"storniert": "Storniert",
		},
		"uebergaenge": [
			_u(["offen"], "in_rechnung", "admin", "Rechnung gestellt"),
			_u(["in_rechnung"], "bezahlt", "admin", "Zahlung erhalten"),
			_u(["offen", "in_rechnung"], "storniert", "admin", "Stornieren", ["grund"]),
		],
	},
}

# Status, mit denen ein Objekt neu angelegt werden darf (Controller-Prüfung)
STARTSTATUS = {
	"vorgang": ["eingegangen"],
	"flaeche": ["entwurf"],
	"projekt": ["entwurf"],
	"interesse": ["gemerkt"],
	"provision": ["offen"],
}

PFLICHT_LABEL = {
	"grund": "Begründung",
	"kommentar": "Kommentar",
	"pachtangebot": "Pachtangebot",
	"provisionSatz": "Provisionssatz",
	"interesseId": "Käufer (Interessent)",
	"kaufpreis": "Kaufpreis",
	"ndaAkzeptiert": "Zustimmung zur Vertraulichkeitsvereinbarung",
	"loi": "Absichtserklärung (LOI)",
}

# Status, in denen ein Investor den Datenraum sehen darf
DATENRAUM_STATUS = ["nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen"]
# Status, in denen ein Projekt in der Börse sichtbar ist
BOERSE_STATUS = ["veroeffentlicht", "reserviert"]
# Offene (nicht finale) Status je Art – für Kennzahlen
OFFENE_STATUS = {
	"vorgang": OFFEN_VORGANG,
	"flaeche": ["entwurf", *OFFEN_FLAECHE],
	"projekt": ["entwurf", "pruefung", "veroeffentlicht", "reserviert"],
	"interesse": ["nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen"],
}


def status_label(art, status):
	return PROZESSE.get(art, {}).get("status", {}).get(status) or status or "–"


def uebergang_vorhanden(art, von, nach, wer_liste, ohne_pflicht=False):
	p = PROZESSE.get(art)
	if not p:
		return False
	return any(
		u["nach"] == nach and von in u["von"] and u["wer"] in wer_liste and not (ohne_pflicht and (u["pflicht"] or u["bedingung"]))
		for u in p["uebergaenge"]
	)


# ---------------------------------------------------------------- Bedingungen


def _wert(objekt, feld):
	if objekt is None:
		return None
	if isinstance(objekt, dict):
		return objekt.get(feld)
	return objekt.get(feld) if hasattr(objekt, "get") else getattr(objekt, feld, None)


def _json(wert):
	if isinstance(wert, str) and wert:
		import json

		try:
			return json.loads(wert)
		except ValueError:
			return None
	return wert


def projekt_einreichbar(p):
	"""Fehlende Punkte für die Einreichung (Objekt mit snake_case-Feldern: Document oder dict)."""
	fehlt = []
	if not _wert(p, "titel"):
		fehlt.append("Projekttitel")
	if not _wert(p, "typ"):
		fehlt.append("Projekttyp")
	if not _wert(p, "land"):
		fehlt.append("Land")
	if not _wert(p, "bundesland"):
		fehlt.append("Bundesland / Kanton")
	if not _wert(p, "region"):
		fehlt.append("Region (grob)")
	mwp = zahl(_wert(p, "mwp"))
	if not (mwp is not None and mwp > 0):
		fehlt.append("Leistung in MWp")
	if not _wert(p, "phase"):
		fehlt.append("Entwicklungsphase")
	beschreibung = _wert(p, "beschreibung") or ""
	if len(str(beschreibung)) < 80:
		fehlt.append("Beschreibung (mind. 80 Zeichen)")
	akzeptiert = _json(_wert(p, "provision_akzeptiert")) or {}
	if not (isinstance(akzeptiert, dict) and akzeptiert.get("am")):
		fehlt.append("Provisionsvereinbarung akzeptieren")
	return fehlt


def flaeche_vollstaendig(f):
	fehlt = []
	if not _wert(f, "bezeichnung"):
		fehlt.append("Bezeichnung")
	if not _wert(f, "land"):
		fehlt.append("Land")
	if not _wert(f, "plz"):
		fehlt.append("PLZ")
	if not _wert(f, "ort"):
		fehlt.append("Ort / Gemeinde")
	ha = zahl(_wert(f, "ha"))
	if not (ha is not None and ha > 0):
		fehlt.append("Größe in Hektar")
	return fehlt


BEDINGUNGEN = {"projektEinreichbar": projekt_einreichbar, "flaecheVollstaendig": flaeche_vollstaendig}


def _fehlt(v):
	# wie im JS-Vorbild: undefined, null, "" und false gelten als fehlend – 0 nicht
	return v is None or v is False or (isinstance(v, str) and v == "")


def pruefe_uebergang(art, von, nach, wer, extra=None, objekt=None):
	"""Prüft einen Übergang und liefert ihn zurück – oder wirft die passende Frappe-Ausnahme."""
	extra = extra if isinstance(extra, dict) else {}
	p = PROZESSE.get(art)
	if not p:
		frappe.throw("Unbekannte Objektart.", frappe.ValidationError)
	if nach not in p["status"]:
		frappe.throw("Unbekannter Zielstatus.", frappe.ValidationError)
	kandidaten = [u for u in p["uebergaenge"] if u["nach"] == nach and von in u["von"]]
	if not kandidaten:
		frappe.throw(
			f"Wechsel von „{status_label(art, von)}“ nach „{status_label(art, nach)}“ ist nicht vorgesehen.",
			frappe.DuplicateEntryError,
		)
	u = next((k for k in kandidaten if k["wer"] == wer), None)
	if not u:
		frappe.throw("Diesen Schritt dürfen Sie nicht auslösen.", frappe.PermissionError)
	for feld in u["pflicht"]:
		if _fehlt(extra.get(feld)):
			frappe.throw(f"Pflichtangabe fehlt: {PFLICHT_LABEL.get(feld, feld)}", frappe.ValidationError)
	if u["bedingung"]:
		fehlt = BEDINGUNGEN[u["bedingung"]](objekt)
		if fehlt:
			frappe.throw(f"Bitte ergänzen: {', '.join(fehlt)}", frappe.ValidationError)
	return u
