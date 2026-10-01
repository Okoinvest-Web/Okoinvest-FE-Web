# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gemeinsames Datenmodell Energiegemeinschaften (ElWG §§ 65–72) – Python-Spiegel von src/lib/plattform/eg/modell.js
# (dort ist die Wahrheit; Vertrag: docs/EG-SCHNITTSTELLEN.md). Abgleich: plattform/tests/test_eg_stamm_kern.py (Node-Export).
# ERZEUGT mit scripts/eg-modell-export.mjs – nicht von Hand ändern, sondern modell.js ändern und neu erzeugen.
# Hinweis: Schlüssel von ZONELEVEL, NETZEBENEN und MARKTPHASEN sind wie in JSON Zeichenketten ("1" … "7").

ABRECHNUNGSRHYTHMEN = {"monat": "Monatlich", "quartal": "Quartalsweise", "jahr": "Jährlich"}

ANLAGE_ARTEN = {
	"pv": "Photovoltaik",
	"wind": "Wind",
	"wasser": "Wasserkraft",
	"biomasse": "Biomasse",
	"speicher": "Speicher",
	"verbrauch": "Verbrauchsanlage",
}

ANLAGE_ERZEUGEND = ["pv", "wind", "wasser", "biomasse"]

CONSENT_MIGRATION = "Migration"

EDA_ANBINDUNGEN = {
	"anwenderportal": {"label": "EDA-Anwenderportal", "text": "kostenlos bis 50 Zählpunkte je Marktteilnehmer (zu bestätigen)"},
	"email": {"label": "E-Mail-Anbindung", "text": "bis ca. 200 Zählpunkte"},
	"kep": {"label": "KEP (Kommunikationsendpunkt)", "text": "unbegrenzt, EDA-Plattformvertrag"},
}

EG_EREIGNISSE = {
	"eg.energiedaten.empfangen": {
		"von": "WP2",
		"an": "WP3",
		"operation": "enEnergiedatenEmpfangen",
		"text": "CR_MSG/DATEN_CRMSG je Zählpunkt (Payload siehe EgEnergiedatenPayload)",
	},
	"eg.teilnahme.geaendert": {
		"von": "WP1",
		"an": ["WP3", "WP4", "WP6"],
		"operation": None,
		"text": "Statuswechsel einer Teilnahme (nur Protokoll/Benachrichtigung, keine Pflicht-Empfänger)",
	},
	"eg.gemeinschaft.eda_bereit": {
		"von": "WP5",
		"an": "WP2",
		"operation": "edaGemeinschaftBereit",
		"text": "Gründung abgeschlossen – EDA-Erstanmeldung kann starten",
	},
	"eg.periode.freigegeben": {"von": "WP4", "an": "WP6", "operation": None, "text": "Belege einer Periode stehen im Mitgliedsportal"},
	"eg.import.uebernommen": {
		"von": "WP5",
		"an": "WP2",
		"operation": "edaPodlistAnfordern",
		"argument": "gemeinschaftId",
		"text": "Nach dem Wechsel-Import EC_PODLIST anfordern (Abgleich)",
	},
}

EG_MODELLE = {
	"eeg": {
		"label": "Erneuerbare-Energie-Gemeinschaft (EEG)",
		"kurz": "EEG",
		"quelle": "ElWG § 66; EAG § 79 Abs. 1, 2, 4",
		"marktpartnerPraefix": "RC",
		"gemeinschaftsIdKennung": "RC",
		"rechtsperson": True,
	},
	"beg": {
		"label": "Bürgerenergiegemeinschaft (BEG)",
		"kurz": "BEG",
		"quelle": "ElWG § 67",
		"marktpartnerPraefix": "CC",
		"gemeinschaftsIdKennung": "CC",
		"rechtsperson": True,
	},
	"gea": {
		"label": "Gemeinschaftliche Erzeugungsanlage (GEA)",
		"kurz": "GEA",
		"quelle": "ElWG §§ 68, 70 Abs. 6 Z 1",
		"marktpartnerPraefix": "GC",
		"gemeinschaftsIdKennung": "GC",
		"rechtsperson": False,
	},
	"p2p": {
		"label": "Peer-to-Peer-Vertrag (P2P)",
		"kurz": "P2P",
		"quelle": "ElWG § 68 Abs. 1",
		"marktpartnerPraefix": "",
		"gemeinschaftsIdKennung": "",
		"rechtsperson": False,
	},
	"eigenversorgung": {
		"label": "Eigenversorgung an anderem Standort",
		"kurz": "EV",
		"quelle": "ElWG § 65 Abs. 2",
		"marktpartnerPraefix": "",
		"gemeinschaftsIdKennung": "",
		"rechtsperson": False,
	},
}

EG_MODELL_VERSION = 1

EG_PRAEFIX = {
	"gemeinschaft": {"praefix": "EGG", "doctype": "Plattform EG Gemeinschaft", "wp": "WP1"},
	"organ": {"praefix": "EGO", "doctype": "Plattform EG Organ", "wp": "WP1"},
	"mitglied": {"praefix": "EMG", "doctype": "Plattform EG Mitglied", "wp": "WP1"},
	"zaehlpunkt": {"praefix": "EZP", "doctype": "Plattform EG Zaehlpunkt", "wp": "WP1"},
	"teilnahme": {"praefix": "ETN", "doctype": "Plattform EG ZP Teilnahme", "wp": "WP1"},
	"anlage": {"praefix": "EAN", "doctype": "Plattform EG Anlage", "wp": "WP1"},
	"tarif": {"praefix": "ETF", "doctype": "Plattform EG Tarif", "wp": "WP1"},
	"verteilschluessel": {"praefix": "EVS", "doctype": "Plattform EG Verteilschluessel", "wp": "WP1"},
	"netzbetreiber": {"praefix": "ENB", "doctype": "Plattform EG Netzbetreiber", "wp": "WP1"},
	"netzentgeltRegel": {"praefix": "ENR", "doctype": "Plattform EG Netzentgelt Regel", "wp": "WP1"},
	"edaProzess": {"praefix": "EDP", "doctype": "Plattform EG EDA Prozess", "wp": "WP2"},
	"edaNachricht": {"praefix": "EDN", "doctype": "Plattform EG EDA Nachricht", "wp": "WP2"},
	"messreihe": {"praefix": "EMR", "doctype": "Plattform EG Messreihe", "wp": "WP3"},
	"messmonat": {"praefix": "EMM", "doctype": "Plattform EG Messmonat", "wp": "WP3"},
	"simulation": {"praefix": "ESI", "doctype": "Plattform EG Simulation", "wp": "WP3"},
	"periode": {"praefix": "EPR", "doctype": "Plattform EG Periode", "wp": "WP4"},
	"beleg": {"praefix": "EBL", "doctype": "Plattform EG Beleg", "wp": "WP4"},
	"zahlung": {"praefix": "EZA", "doctype": "Plattform EG Zahlung", "wp": "WP4"},
	"buchung": {"praefix": "EBU", "doctype": "Plattform EG Buchung", "wp": "WP4"},
	"gruendungsauftrag": {"praefix": "EGA", "doctype": "Plattform EG Gruendungsauftrag", "wp": "WP5"},
	"import": {"praefix": "EIM", "doctype": "Plattform EG Import", "wp": "WP5"},
	"foerdercheck": {"praefix": "EFC", "doctype": "Plattform EG Foerdercheck", "wp": "WP5"},
	"dokument": {"praefix": "EGD", "doctype": "Plattform EG Dokument", "wp": "WP5"},
	"versammlung": {"praefix": "EGV", "doctype": "Plattform EG Versammlung", "wp": "WP5"},
	"versammlungStimme": {"praefix": "EGS", "doctype": "Plattform EG Versammlung Stimme", "wp": "WP5"},
	"beschluss": {"praefix": "EBS", "doctype": "Plattform EG Beschluss", "wp": "WP5"},
	"beitrag": {"praefix": "EBT", "doctype": "Plattform EG Beitrag", "wp": "WP5"},
	"vereinsakte": {"praefix": "EVA", "doctype": "Plattform EG Vereinsakte", "wp": "WP5"},
	"interesse": {"praefix": "EIN", "doctype": "Plattform EG Interesse", "wp": "WP6"},
}

EG_TEAMROLLEN = {
	"interessent": {"label": "Interessent/in", "art": "extern"},
	"mitglied": {"label": "Mitglied", "art": "mitglied"},
	"gemeinde": {"label": "Gemeinde (Mitglied)", "art": "mitglied"},
	"vorstand": {"label": "Obmann / Vorstand", "art": "organ"},
	"kassier": {"label": "Kassier/in", "art": "organ"},
	"schriftfuehrer": {"label": "Schriftführung", "art": "organ"},
	"rechnungspruefer": {"label": "Rechnungsprüfung", "art": "organ"},
	"organisator": {"label": "ÖkoInvest-Betriebsführung (Organisator)", "art": "backoffice"},
	"gruendung": {"label": "ÖkoInvest-Gründungsberatung", "art": "backoffice"},
}

FOERDERUNGEN = {
	"keine": "keine",
	"investzuschuss": "EAG-Investitionszuschuss",
	"marktpraemie": "EAG-Marktprämie",
	"beides": "Investitionszuschuss und Marktprämie",
}

GEMEINSCHAFT_IN_BETRIEB = ["aktiv", "aufnahmestopp", "in_aufloesung"]

GEMEINSCHAFT_STATUS = {
	"interesse": {
		"label": "Interesse",
		"ton": "neutral",
		"naechste": ["machbarkeit", "in_gruendung", "aufgeloest"],
	},
	"machbarkeit": {
		"label": "Machbarkeit",
		"ton": "info",
		"naechste": ["in_gruendung", "aufgeloest"],
	},
	"in_gruendung": {
		"label": "In Gründung",
		"ton": "warn",
		"naechste": ["rechtsperson", "vertrag_nb", "in_aufloesung"],
	},
	"rechtsperson": {
		"label": "Rechtsperson (ZVR/FN)",
		"ton": "warn",
		"naechste": ["marktpartner", "in_aufloesung"],
	},
	"marktpartner": {
		"label": "Marktpartner (ebUtilities)",
		"ton": "warn",
		"naechste": ["vertrag_nb", "in_aufloesung"],
	},
	"vertrag_nb": {
		"label": "Vertrag mit dem Netzbetreiber",
		"ton": "warn",
		"naechste": ["eda_bereit", "in_aufloesung"],
	},
	"eda_bereit": {
		"label": "EDA-bereit",
		"ton": "info",
		"naechste": ["aktiv", "in_aufloesung"],
	},
	"aktiv": {
		"label": "Aktiv",
		"ton": "ok",
		"naechste": ["aufnahmestopp", "in_aufloesung", "umgewandelt"],
	},
	"aufnahmestopp": {
		"label": "Aufnahmestopp",
		"ton": "neutral",
		"naechste": ["aktiv", "in_aufloesung", "umgewandelt"],
	},
	"in_aufloesung": {
		"label": "In Auflösung",
		"ton": "warn",
		"naechste": ["aufgeloest"],
	},
	"aufgeloest": {
		"label": "Aufgelöst",
		"ton": "neutral",
		"naechste": [],
	},
	"umgewandelt": {
		"label": "Umgewandelt (Nachfolger)",
		"ton": "neutral",
		"naechste": [],
	},
}

GROSSUNTERNEHMEN = {"mitarbeiter": 250, "umsatzMioEur": 50, "bilanzMioEur": 43}

LIEFERANTENPFLICHT_KW = {"allgemein": 100, "haushalt": 30}

MARKTPHASEN = {"1": "2026-10-05", "2": "2027-04-05", "3": "2027-10-04", "4": "2028-04-01"}

MAX_LEISTUNG_JE_ZP_KW = 6000

MAX_TEILNAHMEN_JE_ZP = 5

MESS_GROESSEN = {
	"verbrauch_gemessen": {"label": "Verbrauch laut Messung", "richtung": "verbrauch"},
	"verbrauch_tf": {"label": "Verbrauch × Teilnahmefaktor", "richtung": "verbrauch"},
	"anteil_erzeugung": {"label": "Anteil an der Erzeugung", "richtung": "verbrauch"},
	"eigendeckung": {"label": "Eigendeckung", "richtung": "verbrauch"},
	"eigendeckung_ee": {"label": "Eigendeckung aus Erneuerbaren (BEG)", "richtung": "verbrauch"},
	"erzeugung_gemessen": {"label": "Erzeugung laut Messung", "richtung": "erzeugung"},
	"erzeugung_tf": {"label": "Erzeugung × Teilnahmefaktor", "richtung": "erzeugung"},
	"restueberschuss": {"label": "Restüberschuss", "richtung": "erzeugung"},
}

MESS_QUALITAET = {"L1": "Echtwert", "L2": "belastbarer Ersatzwert", "L3": "nicht belastbar (nicht abrechenbar)"}

MITGLIED_AKTIV = ["aufgenommen", "aktiv", "gekuendigt"]

MITGLIED_ARTEN = {
	"privat": {"label": "Privatperson", "eeg": True, "beg": True},
	"landwirt": {"label": "Landwirt/in", "eeg": True, "beg": True},
	"kmu": {"label": "Unternehmen (KMU)", "eeg": True, "beg": True},
	"grossunternehmen": {"label": "Großunternehmen", "eeg": False, "beg": True},
	"gemeinde": {"label": "Gemeinde / Gebietskörperschaft", "eeg": True, "beg": True},
	"oeffentlich": {"label": "Sonstige juristische Person öffentlichen Rechts", "eeg": True, "beg": True},
	"verein": {"label": "Verein / sonstige juristische Person", "eeg": True, "beg": True},
}

MITGLIED_STATUS = {
	"interessent": {
		"label": "Interessent",
		"ton": "neutral",
		"naechste": ["antrag", "abgelehnt"],
	},
	"antrag": {
		"label": "Antrag gestellt",
		"ton": "info",
		"naechste": ["geprueft", "abgelehnt"],
	},
	"geprueft": {
		"label": "Geprüft",
		"ton": "info",
		"naechste": ["aufgenommen", "abgelehnt"],
	},
	"aufgenommen": {
		"label": "Aufgenommen",
		"ton": "warn",
		"naechste": ["aktiv", "gekuendigt", "ausgeschlossen"],
	},
	"aktiv": {
		"label": "Aktiv",
		"ton": "ok",
		"naechste": ["gekuendigt", "ausgeschlossen"],
	},
	"gekuendigt": {
		"label": "Gekündigt",
		"ton": "warn",
		"naechste": ["ausgeschieden", "aktiv"],
	},
	"ausgeschieden": {
		"label": "Ausgeschieden",
		"ton": "neutral",
		"naechste": [],
	},
	"abgelehnt": {
		"label": "Abgelehnt",
		"ton": "neutral",
		"naechste": [],
	},
	"ausgeschlossen": {
		"label": "Ausgeschlossen",
		"ton": "neutral",
		"naechste": ["ausgeschieden"],
	},
}

NETZEBENEN = {
	"3": "Netzebene 3 (Hochspannung)",
	"4": "Netzebene 4 (Umspannung HS/MS)",
	"5": "Netzebene 5 (Mittelspannung)",
	"6": "Netzebene 6 (Umspannung MS/NS)",
	"7": "Netzebene 7 (Niederspannung)",
}

NUTZUNGSMODELLE = {
	"ueberschuss": "Überschusseinspeisung",
	"volleinspeisung": "Volleinspeisung",
	"pacht": "Pacht durch die Gemeinschaft",
	"eigenanlage_eg": "Eigene Anlage der Gemeinschaft",
}

ORGAN_FUNKTIONEN = {
	"obmann": {"label": "Obmann / Obfrau", "teamrolle": "vorstand", "leitung": True},
	"obmann_stv": {"label": "Obmann-Stellvertretung", "teamrolle": "vorstand", "leitung": True},
	"vorstand": {"label": "Vorstand", "teamrolle": "vorstand", "leitung": True},
	"geschaeftsfuehrer": {"label": "Geschäftsführung", "teamrolle": "vorstand", "leitung": True},
	"kassier": {"label": "Kassier/in", "teamrolle": "kassier", "leitung": True},
	"schriftfuehrer": {"label": "Schriftführer/in", "teamrolle": "schriftfuehrer", "leitung": True},
	"rechnungspruefer": {"label": "Rechnungsprüfer/in", "teamrolle": "rechnungspruefer", "leitung": False},
	"aufsichtsrat": {"label": "Aufsichtsrat", "teamrolle": "rechnungspruefer", "leitung": False},
}

RECHNUNGSWEGE = {"portal": "Portal", "email": "E-Mail", "post": "Post"}

RECHTSFORMEN = {
	"verein": {"label": "Verein", "register": "zvr", "quelle": "VerG 2002"},
	"egen": {"label": "Genossenschaft (eGen)", "register": "fn", "quelle": "GenG"},
	"gmbh": {"label": "GmbH", "register": "fn", "quelle": "GmbHG"},
	"og_kg": {"label": "Personengesellschaft (OG/KG)", "register": "fn", "quelle": "UGB"},
	"keine": {"label": "Keine eigene Rechtsperson (GEA/P2P)", "register": "", "quelle": "ElWG § 68"},
}

REGEL_BEZUG = {"modell": "nach Modell (bis 31.12.2026)", "zonelevel": "nach Zonelevel (ab 01.01.2027)"}

REGEL_STATUS = {
	"gesichert": "gesichert (Primärquelle)",
	"entwurf": "Entwurf / Arbeitshypothese",
	"platzhalter": "Platzhalter (Arbeitshypothese, Wert offen)",
}

SMART_METER = {"ja": "Smart Meter (Viertelstundenwerte)", "nein": "kein Smart Meter", "unbekannt": "unbekannt"}

STAND = "2026-10-01"

STEUERSTATUS_ERZEUGER = {
	"nicht_unternehmerisch": {"label": "Nicht unternehmerisch (unentgeltlich)"},
	"kleinunternehmer": {"label": "Kleinunternehmer"},
	"pauschalierter_landwirt": {"label": "Pauschalierter Landwirt (§ 22 UStG, 13 %)"},
	"regelbesteuert": {"label": "Regelbesteuert (Reverse Charge)", "uidPflicht": True},
	"gemeinde_bga": {"label": "Gemeinde mit Betrieb gewerblicher Art", "uidPflicht": True},
}

TARIF_BESCHLUSS = {"gv": "Generalversammlung", "vorstand": "Vorstand", "organisator": "Organisator (Vollmacht)"}

TARIF_STATUS = {"entwurf": "Entwurf", "beschlossen": "Beschlossen", "aktiv": "Gültig", "abgeloest": "Abgelöst"}

TEILNAHME_ENDE_GRUENDE = {
	"abmeldung": "Abmeldung (CM_REV_SP)",
	"widerruf": "Widerruf des Mitglieds (CM_REV_CUS)",
	"implizit": "Auszug / vertragsloser Zustand (CM_REV_IMP)",
	"korrektur": "Dokumentierte Korrektur (Organisator)",
}

TEILNAHME_STATUS = {
	"entwurf": {
		"label": "Entwurf",
		"ton": "neutral",
		"ereignisse": {"senden": "angefragt", "verwerfen": "verworfen"},
	},
	"angefragt": {
		"label": "Beim Netzbetreiber angefragt",
		"ton": "info",
		"ereignisse": {"anforderung_econ": "zustimmung_offen", "ablehnung_econ": "abgelehnt", "fehler": "entwurf"},
	},
	"zustimmung_offen": {
		"label": "Zustimmung des Mitglieds offen",
		"ton": "warn",
		"ereignisse": {"zustimmung_econ": "zugestimmt", "frist_abgelaufen": "abgelaufen", "ablehnung_econ": "abgelehnt"},
	},
	"zugestimmt": {
		"label": "Zugestimmt",
		"ton": "info",
		"ereignisse": {"antwort_econ": "wartet_technik", "abschluss_econ": "aktiv"},
	},
	"wartet_technik": {
		"label": "Wartet auf Technik (z. B. Smart Meter)",
		"ton": "warn",
		"ereignisse": {"abschluss_econ": "aktiv", "ablehnung_econ": "abgelehnt"},
	},
	"aktiv": {
		"label": "Aktiv",
		"ton": "ok",
		"ereignisse": {"tf_geaendert": "aktiv", "cm_rev_sp": "abmeldung_angefragt", "cm_rev_cus": "beendet", "cm_rev_imp": "beendet"},
	},
	"abmeldung_angefragt": {
		"label": "Abmeldung angefragt",
		"ton": "warn",
		"ereignisse": {"abmeldung_ok": "beendet", "abmeldung_abgelehnt": "aktiv"},
	},
	"beendet": {
		"label": "Beendet",
		"ton": "neutral",
		"ereignisse": {},
	},
	"abgelehnt": {
		"label": "Abgelehnt",
		"ton": "neutral",
		"ereignisse": {"erneut": "entwurf"},
	},
	"abgelaufen": {
		"label": "Zustimmungsfrist abgelaufen",
		"ton": "neutral",
		"ereignisse": {"erneut": "entwurf"},
	},
	"verworfen": {
		"label": "Verworfen",
		"ton": "neutral",
		"ereignisse": {},
	},
}

TEILNAHME_ZAEHLT = ["entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt"]

TF_AENDERUNGEN_JE_TAG = 1

TF_MAX = 100

TF_MIN = 1

UST_STATUS = {
	"kleinunternehmer": {"label": "Kleinunternehmer (§ 6 Abs. 1 Z 27 UStG)"},
	"regelbesteuert": {"label": "Regelbesteuert (Option U 12, 5 Jahre bindend)"},
}

VERTEILMODELLE = {
	"dynamisch": {
		"label": "Dynamisch",
		"text": "Aufteilung je Viertelstunde im Verhältnis zum Verbrauch; ab 05.10.2026 für Neuaktivierungen der Regelfall (zu bestätigen).",
	},
	"statisch": {
		"label": "Statisch",
		"text": "Fester Aufteilungsschlüssel je Verbrauchszählpunkt; nicht genutzte Anteile gelten als Überschuss. Nur noch für Bestandsgemeinschaften.",
	},
}

VERTRAGSWEGE = {"email": "E-Mail", "portal": "Portal", "formular": "Online-Formular", "post": "Post / Vorlage"}

WOCHENTAGE = {"mo": "Mo", "di": "Di", "mi": "Mi", "do": "Do", "fr": "Fr", "sa": "Sa", "so": "So"}

ZONELEVEL = {
	"1": {
		"label": "Hauptleitung",
		"feld": "ID Anschlussobjekt",
		"modelle": ["gea", "eigenversorgung", "p2p", "beg"],
		"phase": 1,
		"netzebenen": [7],
	},
	"2": {
		"label": "Standortbereich",
		"feld": "ID Anschlussobjekt (zwei Anschlüsse)",
		"modelle": ["gea", "eigenversorgung", "p2p", "beg"],
		"phase": 2,
		"netzebenen": [7],
	},
	"3": {
		"label": "Lokalbereich (Niederspannung bis Trafostation)",
		"feld": "ID der Trafostation",
		"modelle": ["eigenversorgung", "p2p", "eeg", "beg"],
		"phase": 1,
		"netzebenen": [6, 7],
	},
	"4": {
		"label": "Regionalbereich, ein Netzgebiet",
		"feld": "ID des Umspannwerks",
		"modelle": ["eigenversorgung", "p2p", "eeg", "beg"],
		"phase": 1,
		"netzebenen": [4, 5, 6, 7],
	},
	"5": {
		"label": "Regionalbereich, mehrere Netzgebiete",
		"feld": "ID des Umspannwerks",
		"modelle": ["eigenversorgung", "p2p", "eeg", "beg"],
		"phase": 2,
		"netzebenen": [4, 5, 6, 7],
	},
	"6": {
		"label": "Keine Verbindung, ein Netzgebiet",
		"feld": "NONE",
		"modelle": ["eigenversorgung", "p2p", "beg"],
		"phase": 1,
		"netzebenen": [3, 4, 5, 6, 7],
	},
	"7": {
		"label": "Keine Verbindung, mehrere Netzgebiete",
		"feld": "NONE",
		"modelle": ["eigenversorgung", "p2p", "beg"],
		"phase": 2,
		"netzebenen": [3, 4, 5, 6, 7],
	},
}

ZP_LAENGE = 33

ZP_RICHTUNGEN = {
	"verbrauch": {"label": "Verbrauch", "eda": "CONSUMPTION"},
	"erzeugung": {"label": "Erzeugung", "eda": "GENERATION"},
}

ZUSTIMMUNG_FRIST_TAGE = 30
