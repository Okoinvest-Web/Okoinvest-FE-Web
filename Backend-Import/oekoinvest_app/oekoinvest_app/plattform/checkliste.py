# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dokumenten-Checklisten – 1:1 aus src/lib/plattform/checkliste.js.
# Ein Dokument erfüllt einen Punkt, wenn es mit dem Schlüssel (Feld `checkliste`) hochgeladen wurde.
# Der Vollständigkeitsgrad der Pflichtpunkte (0–100) ist die „Datenraum-Qualität“ der Börsenkarte.

import math

from oekoinvest_app.plattform.konstanten import PHASEN_IDS

# Fachprüfung Kapitalseite: Gewichtung der Datenraum-Qualität (wie QUALITAET_GEWICHT in checkliste.js)
QUALITAET_GEWICHT = {"unterlagen": 0.7, "datenblatt": 0.3}


def _idx(phase):
	return PHASEN_IDS.index(phase) if phase in PHASEN_IDS else 0


CHECKLISTE_PROJEKT = [
	{"id": "pacht", "ab": "flaeche", "pflicht": True, "label": "Pacht- bzw. Nutzungsverträge (geschwärzt)", "text": "Flächensicherung für alle Flurstücke inkl. Laufzeit und Verlängerungsoption."},
	{"id": "lageplan", "ab": "flaeche", "pflicht": True, "label": "Lageplan mit Flurstücken", "text": "Übersichtsplan mit Projektgrenze und Zuwegung."},
	{"id": "netzzusage", "ab": "netz", "pflicht": True, "label": "Netzanschlusszusage", "text": "Zusage bzw. Reservierung des Netzbetreibers mit Verknüpfungspunkt und Leistung."},
	{"id": "aufstellung", "ab": "aufstellung", "pflicht": True, "ohne": ["carport", "dach"], "label": "Aufstellungsbeschluss B-Plan", "land": {"AT": "Einleitung Umwidmung (Grünland-PV)", "CH": "Einleitung Nutzungsplanung"}, "text": "Beschluss der Gemeinde zur Bauleitplanung bzw. Einleitung des Widmungsverfahrens."},
	{"id": "gutachten", "ab": "aufstellung", "pflicht": True, "label": "Fachgutachten", "text": "Umwelt, Artenschutz, Blendung, Boden – soweit für das Verfahren gefordert."},
	{"id": "satzung", "ab": "satzung", "pflicht": True, "label": "B-Plan-Satzungsbeschluss", "land": {"AT": "Widmung Grünland-PV / Baubewilligung", "CH": "Baubewilligung"}, "text": "Rechtskräftiges Planungsrecht."},
	{"id": "ertrag", "ab": "satzung", "pflicht": True, "ohne": ["speicher"], "label": "Ertragsgutachten", "text": "Unabhängiges Ertragsgutachten (P50/P90)."},
	{"id": "baugenehmigung", "ab": "rtb", "pflicht": True, "label": "Baugenehmigung & Freigaben", "text": "Baugenehmigung bzw. -anzeige und Freigaben des Netzbetreibers."},
	{"id": "eeg", "ab": "rtb", "pflicht": False, "ohne": ["speicher"], "label": "EEG-Zuschlag bzw. Vermarktung", "land": {"AT": "EAG-Förderzusage bzw. PPA", "CH": "Einmalvergütung bzw. Abnahmevertrag"}, "text": "Zuschlag aus der Ausschreibung oder Vermarktungskonzept (PPA) – optional."},
	{"id": "betrieb", "ab": "cod", "pflicht": True, "label": "Betriebsdaten & Inbetriebnahme", "text": "Inbetriebnahmeprotokoll, Ertragsdaten, laufende Verträge (Wartung, Direktvermarktung)."},
]

CHECKLISTE_FLAECHE = [
	{"id": "grundbuch", "pflicht": True, "label": "Grundbuchauszug", "land": {"AT": "Grundbuchsauszug"}, "text": "Aktueller Auszug für alle Flurstücke (nicht älter als drei Monate)."},
	{"id": "flurkarte", "pflicht": True, "label": "Flurkarte", "land": {"AT": "Katastralmappe", "CH": "Katasterplan"}, "text": "Auszug aus dem Liegenschaftskataster mit markierten Flurstücken."},
	{"id": "vollmacht", "pflicht": True, "nur_mit_miteigentum": True, "label": "Vollmacht bzw. Zustimmung der Miteigentümer", "text": "Nur bei Miteigentum oder Verwaltung erforderlich."},
	{"id": "pachtDritter", "pflicht": False, "label": "Bestehende Pachtverträge Dritter", "text": "Falls die Fläche derzeit landwirtschaftlich verpachtet ist – optional."},
]

CHECKLISTE_IDS = {"projekt": [x["id"] for x in CHECKLISTE_PROJEKT], "flaeche": [x["id"] for x in CHECKLISTE_FLAECHE]}


def _belege(dokumente, schluessel):
	return [{"id": d.get("id"), "name": d.get("name"), "am": d.get("am")} for d in (dokumente or []) if d.get("checkliste") == schluessel]


def _auswerten(punkte):
	pflicht = [x for x in punkte if x["erwartet"] and x["pflicht"]]
	erfuellt = sum(1 for x in pflicht if x["vorhanden"])
	return {"punkte": punkte, "erwartet": len(pflicht), "erfuellt": erfuellt, "quote": int(math.floor(erfuellt / len(pflicht) * 100 + 0.5)) if pflicht else 100}  # wie Math.round


def checkliste_projekt(p, dokumente):
	"""p: Projekt-JSON (typ, phase, land), dokumente: Metadaten mit Schlüssel „checkliste“."""
	phase = _idx(p.get("phase"))
	punkte = []
	for x in CHECKLISTE_PROJEKT:
		if p.get("typ") in (x.get("ohne") or []):
			continue
		d = _belege(dokumente, x["id"])
		punkte.append(
			{
				"id": x["id"],
				"label": (x.get("land") or {}).get(p.get("land")) or x["label"],
				"text": x["text"],
				"pflicht": x["pflicht"],
				"ab": x["ab"],
				"erwartet": _idx(x["ab"]) <= phase,
				"vorhanden": bool(d),
				"dokumente": d,
			}
		)
	out = _auswerten(punkte)
	from oekoinvest_app.plattform.fach.datenblatt import datenblatt_vollstaendigkeit

	db = datenblatt_vollstaendigkeit(p)
	out["quoteUnterlagen"] = out["quote"]
	out["datenblatt"] = {"quote": db["quote"], "erwartet": db["erwartet"], "erfuellt": db["erfuellt"], "bereiche": db["bereiche"]}
	out["quote"] = int(math.floor(out["quoteUnterlagen"] * QUALITAET_GEWICHT["unterlagen"] + db["quote"] * QUALITAET_GEWICHT["datenblatt"] + 0.5))
	return out


def checkliste_flaeche(f, dokumente):
	punkte = []
	for x in CHECKLISTE_FLAECHE:
		d = _belege(dokumente, x["id"])
		erwartet = (f.get("eigentum") or "eigentum") != "eigentum" if x.get("nur_mit_miteigentum") else True
		punkte.append(
			{
				"id": x["id"],
				"label": (x.get("land") or {}).get(f.get("land")) or x["label"],
				"text": x["text"],
				"pflicht": x["pflicht"],
				"erwartet": erwartet,
				"vorhanden": bool(d),
				"dokumente": d,
			}
		)
	return _auswerten(punkte)
