# Copyright (c) 2026, ÖkoInvest GmbH
#
# Druckformate bauen: HTML (Jinja) + gemeinsames CSS → Print-Format-JSON (Standard „Yes“, Modul Plattform).
#
#   python Backend-Import/werkzeuge/bauen.py
#
# Quelle ist jeweils plattform/print_format/<ordner>/<ordner>.html und plattform/print_format/oekoinvest_druck.css.
# Frappe liest zur Laufzeit die .html-Datei (Pfad = scrub(Name)); die JSON trägt dieselbe HTML als Rückfall und das CSS.
# „modified“ wird nur bei Änderungen erhöht (sonst überspringt `bench migrate` die Aktualisierung).
# Neue Druckformate: Eintrag in DRUCKFORMATE + HTML-Datei anlegen, dann dieses Skript ausführen.
# Läuft ohne Frappe.

import json
import os
from datetime import datetime

HIER = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HIER, "..", "oekoinvest_app", "oekoinvest_app", "plattform", "print_format"))
CSS = os.path.join(PF, "oekoinvest_druck.css")

# Name (ASCII, damit Ordner = frappe.scrub(Name)) → DocType
DRUCKFORMATE = {
	"Provisionsvereinbarung": "Plattform Projekt",
	"Vertraulichkeitsvereinbarung NDA": "Plattform Interesse",
	"Pacht-Vorvertrag Muster": "Plattform Flaeche",
	"Expose vertraulich": "Plattform Projekt",
	"Expose Teaser": "Plattform Projekt",
	"LOI Eingang": "Plattform Interesse",
	"Ereignisbericht Anlage": "Plattform Stoerungsfall",
	"Monatsbericht Backoffice": "Plattform Monatsbericht",
	"Anlagen-Datenblatt": "Plattform Anlage",
	"Vorgangsblatt": "Plattform Vorgang",
	"Projektsteckbrief": "Plattform Entwicklungsprojekt",  # Projektentwicklung
	"Abrechnung Beleg": "Plattform Abrechnung",  # ERPNext-Finanzen & Abrechnung (Gutschrift/Rechnung)
	"Projektgesellschaft Gruendungspaket": "Plattform Projektgesellschaft",  # Dienste: SPV-Gründung (Muster)
	"Bonitaet Information": "Plattform Bonitaetsauskunft",  # Dienste: Information des Betroffenen (Art. 14 DSGVO)
	"Angebotsvergleich Energie": "Plattform Ausschreibung",  # Energiebeschaffung: normierter Vergleich
	"Zuschlagsschreiben Energie": "Plattform Ausschreibung",  # Energiebeschaffung: Zuschlag an den Versorger
	"Signaturprotokoll": "Plattform Signaturvorgang",  # Elektronische Unterschrift (EES): Prüfsummen, Unterzeichner, Protokoll
	"Finanzierungsvergleich": "Plattform Finanzierungsszenario",  # Finanzierung: Szenario aus dem Cockpit
	"Bank Reporting Covenants": "Plattform Finanzierungsfall",  # Finanzierung: Quartalsbericht an die Bank (DSCR/LLCR)
	# Grundbuch & Closing: Muster zur anwaltlichen/notariellen Prüfung und Abschlussbericht
	"Dienstbarkeitsvertrag Freiflaeche Muster": "Plattform Grundbuch Vorgang",
	"Dachnutzungsvertrag Servitut Muster": "Plattform Grundbuch Vorgang",
	"Rangruecktritt Ersuchen Muster": "Plattform Grundbuch Vorgang",
	"Loeschungsbewilligung Hinweis Muster": "Plattform Grundbuch Vorgang",
	"Kaufvertrag SPA Muster": "Plattform Closing",
	"Closing Abschlussbericht": "Plattform Closing",
}


def scrub(name):
	return name.replace(" ", "_").replace("-", "_").lower()


def druckformat_json(name, doc_type, html, css, alt=None):
	d = dict(alt or {})
	d.update(
		{
			"absolute_value": 0,
			"align_labels_right": 0,
			"css": css,
			"custom_format": 1,
			"default_print_language": "de",
			"disabled": 0,
			"doc_type": doc_type,
			"docstatus": 0,
			"doctype": "Print Format",
			"font_size": 0,
			"html": html,
			"idx": 0,
			"line_breaks": 0,
			"margin_bottom": 15.0,
			"margin_left": 15.0,
			"margin_right": 15.0,
			"margin_top": 15.0,
			"modified_by": "Administrator",
			"module": "Plattform",
			"name": name,
			"owner": "Administrator",
			"page_number": "Hide",
			"print_format_builder": 0,
			"print_format_type": "Jinja",
			"raw_printing": 0,
			"show_section_headings": 0,
			"standard": "Yes",
		}
	)
	d.setdefault("creation", "2026-09-30 08:00:00.000000")
	return d


def main():
	with open(CSS, encoding="utf-8") as f:
		css = f.read()
	geaendert = 0
	for name, doc_type in DRUCKFORMATE.items():
		ordner = os.path.join(PF, scrub(name))
		with open(os.path.join(ordner, scrub(name) + ".html"), encoding="utf-8") as f:
			html = f.read()
		pfad = os.path.join(ordner, scrub(name) + ".json")
		alt = None
		if os.path.exists(pfad):
			with open(pfad, encoding="utf-8") as f:
				alt = json.load(f)
		neu = druckformat_json(name, doc_type, html, css, alt)
		vergleich = lambda d: {k: v for k, v in (d or {}).items() if k != "modified"}  # noqa: E731
		if alt and vergleich(alt) == vergleich(neu):
			continue
		neu["modified"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
		with open(pfad, "w", encoding="utf-8", newline="\n") as f:
			json.dump(neu, f, indent=1, ensure_ascii=False, sort_keys=True)
			f.write("\n")
		geaendert += 1
		print(f"gebaut: {name}")
	print(f"{geaendert} Druckformat(e) aktualisiert, {len(DRUCKFORMATE) - geaendert} unverändert.")


if __name__ == "__main__":
	main()
