# Copyright (c) 2026, ÖkoInvest GmbH
#
# EDA-Marktkommunikation der Energiegemeinschaften (WP2) – reine Regeln, 1:1-Spiegel von src/lib/plattform/eg/eda/*.js
# (codes, xml, zeit, schema, automat, daten, simulator). Nur Standardbibliothek, KEIN frappe-Import: die Datei wird auch
# vom Gateway-Dienst Backend-Import/dienste/eda-gateway geladen. Gleiche Testvektoren wie JS:
# src/lib/plattform/eg/testdaten/eda/*.json (plattform/tests/test_eg_eda_kern.py, scripts/plattform-test-eg-eda.mjs).
#
# Fachliche Quellen und Kennzeichnung „(zu bestätigen)“ siehe Kopf der JS-Dateien (HA II, ebUtilities, Fachkonzept 2.4–2.7,
# 3.8, 3.14; ElWG §§ 70, 71). Funktionsnamen snake_case, Datenfelder camelCase wie die API.

import copy
import math
from datetime import date, datetime, timedelta, timezone

EDA_STAND = "2026-10-01"
SEKTOR_STROM = "01"

# ================================================================ codes.js

EDA_PROZESSE = {
	"EC_REQ_ONL": {"label": "Anmeldung mit Online-Zustimmung", "kurz": "Anmeldung", "richtung": "aus", "start": "ANFORDERUNG_ECON", "antworten": ["ANTWORT_ECON", "ZUSTIMMUNG_ECON", "ABSCHLUSS_ECON", "ABLEHNUNG_ECON", "EDASendError"], "schema": "CMRequest", "version": "01.30", "teilnahme": True, "quelle": "HA II 5.1; ebutilities.at/prozesse/597"},
	"EC_REQ_OFF": {"label": "Anmeldung mit Offline-Zustimmung (QR-Code)", "kurz": "Anmeldung offline", "richtung": "aus", "start": "ANFORDERUNG_ECON", "antworten": ["ANTWORT_ECON", "ZUSTIMMUNG_ECON", "ABSCHLUSS_ECON", "ABLEHNUNG_ECON", "EDASendError"], "schema": "CMRequest", "version": "01.30", "teilnahme": True, "quelle": "HA II 5.2 (QR-Code 30 Tage gültig, danach 5 Tage Widerruf)"},
	"EC_PRTFACT_CHG": {"label": "Änderung des Teilnahmefaktors", "kurz": "TF-Änderung", "richtung": "aus", "start": "ANFORDERUNG_CPF", "antworten": ["ANTWORT_CPF", "ABLEHNUNG_CPF", "EDASendError"], "schema": "CPRequest", "version": "01.12", "teilnahme": True, "quelle": "HA II 5.6; ElWG § 71 Abs. 5 (1 Änderung je Tag bis 01.04.2028)"},
	"EC_PRT_CHANGE": {"label": "Änderung des Aufteilungsschlüssels (statisch)", "kurz": "Schlüssel-Änderung", "richtung": "aus", "start": "ANFORDERUNG_CPF", "antworten": ["ANTWORT_CPF", "ABLEHNUNG_CPF", "EDASendError"], "schema": "CPRequest", "version": "01.12", "teilnahme": True, "quelle": "HA II 8, 12.2 (Normierung erst über 100 %)"},
	"EC_PODLIST": {"label": "Zählpunktliste anfordern (Abgleich)", "kurz": "Zählpunktliste", "richtung": "aus", "start": "ANFORDERUNG_ECP", "antworten": ["SENDEN_ECP", "ABLEHNUNG_ECP", "EDASendError"], "schema": "ECMPList", "version": "01.10", "teilnahme": False, "quelle": "HA II 5.5; ebutilities.at/prozesse/396"},
	"CM_REV_SP": {"label": "Abmeldung durch die Gemeinschaft", "kurz": "Abmeldung", "richtung": "aus", "start": "AUFHEBUNG_CCMS", "antworten": ["ANTWORT_CCMS", "ABLEHNUNG_CCMS", "EDASendError"], "schema": "CMRevoke", "version": "01.10", "teilnahme": True, "quelle": "HA II 9; Fachkonzept 2.7 (nicht rückwirkend)"},
	"CM_REV_CUS": {"label": "Widerruf durch das Mitglied (Netzbetreiber-Portal)", "kurz": "Widerruf", "richtung": "ein", "start": "AUFHEBUNG_CCMS", "antworten": [], "schema": "CMRevoke", "version": "01.10", "teilnahme": True, "quelle": "Fachkonzept 2.7"},
	"CM_REV_IMP": {"label": "Implizite Abmeldung (Auszug / vertragsloser Zustand)", "kurz": "Implizite Abmeldung", "richtung": "ein", "start": "AUFHEBUNG_CCMS", "antworten": [], "schema": "CMRevoke", "version": "01.10", "teilnahme": True, "quelle": "Fachkonzept 2.7"},
	"CR_REQ_PT": {"label": "Nachforderung von Energiedaten", "kurz": "Nachforderung", "richtung": "aus", "start": "ANFORDERUNG_PT", "antworten": ["ANTWORT_PT", "ABLEHNUNG_PT", "DATEN_CRMSG", "EDASendError"], "schema": "CPRequest", "version": "01.12", "teilnahme": True, "quelle": "Fachkonzept 2.5 (eegfaktura-Doku, zu bestätigen)"},
	"CR_MSG": {"label": "Empfang Energiedaten (Gemeinschaftsanteile)", "kurz": "Energiedaten", "richtung": "ein", "start": "DATEN_CRMSG", "antworten": [], "schema": "ConsumptionRecord", "version": "01.30", "teilnahme": False, "quelle": "HA II 13 (täglich; ab 10/2026 höchstens 2 Läufe je Tag, zu bestätigen)"},
	"REKLAMATION": {"label": "Datenqualitäts-Reklamation an den Netzbetreiber", "kurz": "Reklamation", "richtung": "aus", "start": "REKLAMATION_NB", "antworten": ["ANTWORT_NB"], "schema": "", "version": "", "teilnahme": False, "intern": True, "quelle": "Plattform-Ablauf; schriftliche Dokumentation für die Schlichtungsstelle der E-Control"},
}

EDA_NACHRICHTEN = {
	"ANFORDERUNG_ECON": {"label": "Anmeldung (Anforderung Zuordnung)", "richtung": "aus", "schema": "CMRequest"},
	"ANTWORT_ECON": {"label": "Antwort Netzbetreiber (Anmeldung)", "richtung": "ein", "schema": "CMNotification"},
	"ZUSTIMMUNG_ECON": {"label": "Zustimmung des Kunden", "richtung": "ein", "schema": "CMNotification"},
	"ABLEHNUNG_ECON": {"label": "Ablehnung (Anmeldung)", "richtung": "ein", "schema": "CMNotification"},
	"ABSCHLUSS_ECON": {"label": "Abschluss – Zuordnung aktiv", "richtung": "ein", "schema": "ECMPList"},
	"ANFORDERUNG_CPF": {"label": "Änderung Teilnahmefaktor bzw. Schlüssel", "richtung": "aus", "schema": "CPRequest"},
	"ANTWORT_CPF": {"label": "Änderung bestätigt", "richtung": "ein", "schema": "CPNotification"},
	"ABLEHNUNG_CPF": {"label": "Änderung abgelehnt", "richtung": "ein", "schema": "CPNotification"},
	"AUFHEBUNG_CCMS": {"label": "Aufhebung der Zuordnung", "richtung": "beide", "schema": "CMRevoke"},
	"ANTWORT_CCMS": {"label": "Aufhebung bestätigt", "richtung": "ein", "schema": "CMNotification"},
	"ABLEHNUNG_CCMS": {"label": "Aufhebung abgelehnt", "richtung": "ein", "schema": "CMNotification"},
	"ANFORDERUNG_PT": {"label": "Nachforderung Energiedaten", "richtung": "aus", "schema": "CPRequest"},
	"ANTWORT_PT": {"label": "Nachforderung angenommen", "richtung": "ein", "schema": "CPNotification"},
	"ABLEHNUNG_PT": {"label": "Nachforderung abgelehnt", "richtung": "ein", "schema": "CPNotification"},
	"ANFORDERUNG_ECP": {"label": "Zählpunktliste anfordern (zu bestätigen)", "richtung": "aus", "schema": "CPRequest"},
	"SENDEN_ECP": {"label": "Zählpunktliste der Gemeinschaft", "richtung": "ein", "schema": "ECMPList"},
	"ABLEHNUNG_ECP": {"label": "Zählpunktliste abgelehnt", "richtung": "ein", "schema": "CPNotification"},
	"DATEN_CRMSG": {"label": "Energiedaten (Viertelstundenwerte)", "richtung": "ein", "schema": "ConsumptionRecord"},
	"ABLEHNUNG_CRMSG": {"label": "Energiedaten zurückgewiesen", "richtung": "aus", "schema": "CPNotification"},
	"EDASendError": {"label": "Zustellfehler der EDA-Plattform", "richtung": "ein", "schema": "EDASendError"},
	"REKLAMATION_NB": {"label": "Reklamation an den Netzbetreiber (E-Mail)", "richtung": "aus", "schema": "", "intern": True},
	"ANTWORT_NB": {"label": "Antwort des Netzbetreibers auf die Reklamation", "richtung": "ein", "schema": "", "intern": True},
}

NACHRICHT_PROZESSE = {c: [k for k, p in EDA_PROZESSE.items() if p["start"] == c or c in p["antworten"]] for c in EDA_NACHRICHTEN}

PROZESS_STATUS = {
	"freigabe_offen": {"label": "Freigabe offen (Vier-Augen)", "ton": "warn", "offen": True},
	"entwurf": {"label": "Wartet auf Versand", "ton": "neutral", "offen": True},
	"gesendet": {"label": "Gesendet – Antwort offen", "ton": "info", "offen": True},
	"bestaetigt": {"label": "Vom Netzbetreiber angenommen – läuft", "ton": "info", "offen": True},
	"abgeschlossen": {"label": "Abgeschlossen", "ton": "ok", "offen": False},
	"abgelehnt": {"label": "Abgelehnt", "ton": "warn", "offen": False},
	"fehler": {"label": "Fehler (Klärfall)", "ton": "warn", "offen": False},
	"zeitueberschreitung": {"label": "Zeitüberschreitung", "ton": "warn", "offen": False},
	"verworfen": {"label": "Verworfen", "ton": "neutral", "offen": False},
}
PROZESS_OFFEN = [k for k, v in PROZESS_STATUS.items() if v["offen"]]

EDA_FRISTEN = {
	"zustimmungTage": 30,
	"offlineWiderrufTage": 5,
	"antwortTage": 2,
	"maxVersuche": 3,
	"backoffTage": [2, 4, 8],
	"technikHinweisTage": 60,
	"nachforderungTage": 5,
	"reklamationAntwortTage": 14,
	"l3ErsatzTage": 60,
	"l3ErsatzTageBeg": 15,
	"datenVerzugTage": 2,
	"erinnerungTage": [2, 7, 14, 21, 27],
}
VIER_AUGEN_AB = 3
MASSEN_MAX = 500

RESPONSECODES = {
	"56": {"text": "Zählpunkt nicht gefunden", "kategorie": "stammdaten", "erneut": True, "loesung": "Zählpunktnummer mit der Netzrechnung vergleichen (33 Zeichen, AT + Netzbetreibernummer + PLZ) und korrigieren, dann erneut anmelden."},
	"57": {"text": "Zählpunkt nicht versorgt bzw. nicht aktiv", "kategorie": "stammdaten", "erneut": True, "loesung": "Mit dem Mitglied klären, ob der Anschluss aktiv ist (Neubau, Abmeldung, Lieferantenwechsel); nach Aktivierung erneut anmelden."},
	"76": {"text": "Ungültige Anforderungsdaten", "kategorie": "stammdaten", "erneut": True, "loesung": "Gemeinschafts-ID, Energierichtung, Teilnahmefaktor und Datum prüfen; Rohnachricht im Journal ansehen."},
	"82": {"text": "Prozessdatum ungültig", "kategorie": "stammdaten", "erneut": True, "loesung": "Prozessdatum prüfen (Abmeldung nicht rückwirkend, Änderung nicht in der Vergangenheit)."},
	"86": {"text": "Konflikt mit einem laufenden Prozess", "kategorie": "konflikt", "erneut": True, "loesung": "Laufenden Prozess am Zählpunkt abwarten (z. B. offene Anmeldung oder Änderung), danach erneut senden."},
	"94": {"text": "Keine Daten im angeforderten Zeitraum", "kategorie": "info", "erneut": False, "loesung": "Zeitraum prüfen (vor Aktivierung gibt es keine Gemeinschaftsdaten); bei Lücken nach Aktivierung Reklamation vorbereiten."},
	"99": {"text": "Meldung erhalten – Anfrage angenommen", "kategorie": "ok", "erneut": False, "loesung": ""},
	"104": {"text": "Falsche Energierichtung", "kategorie": "stammdaten", "erneut": True, "loesung": "Richtung des Zählpunkts (Verbrauch/Erzeugung) in den Stammdaten korrigieren und erneut anmelden."},
	"158": {"text": "Zählpunkt für diese Gemeinschaft nicht teilnahmeberechtigt (Nahebereich)", "kategorie": "stammdaten", "erneut": False, "loesung": "Nahebereich (Trafostation bzw. Umspannwerk) beim Netzbetreiber erfragen (ElWG § 70 Abs. 6, Auskunft binnen 14 Tagen); ggf. BEG statt EEG."},
	"172": {"text": "Kunde hat die Zustimmung abgelehnt", "kategorie": "kunde", "erneut": True, "loesung": "Mit dem Mitglied sprechen (Missverständnis im Netzbetreiber-Portal?); bei Einverständnis erneut anmelden."},
	"173": {"text": "Kunde hat nicht fristgerecht zugestimmt (Zeitüberschreitung)", "kategorie": "frist", "erneut": True, "loesung": "Mitglied mit Anleitung für das Netzbetreiber-Portal erinnern und Anmeldung erneut anstoßen."},
	"174": {"text": "Angefragte Daten nicht lieferbar", "kategorie": "technik", "erneut": False, "loesung": "Netzbetreiber nach dem Grund fragen (Messung, Zählertausch); ggf. Reklamation vorbereiten."},
	"175": {"text": "Zustimmung erteilt", "kategorie": "ok", "erneut": False, "loesung": ""},
	"178": {"text": "Zuordnung bzw. Consent besteht bereits", "kategorie": "konflikt", "erneut": False, "loesung": "Zählpunktliste (EC_PODLIST) anfordern und Bestand abgleichen – die Teilnahme ist vermutlich schon aktiv."},
	"179": {"text": "Consent-ID unbekannt", "kategorie": "stammdaten", "erneut": False, "loesung": "Consent-ID per Zählpunktliste (EC_PODLIST) abgleichen; bei Altfällen vor dem 03.10.2022 lautet sie „Migration“ (HA II 7.2)."},
	"181": {"text": "Gemeinschafts-ID unbekannt", "kategorie": "stammdaten", "erneut": True, "loesung": "Gemeinschafts-ID (33 Zeichen) mit dem Betreibervertrag vergleichen; nach Umwandlung neue ID verwenden."},
	"182": {"text": "Kein fernauslesbarer Zähler (Smart Meter fehlt)", "kategorie": "technik", "erneut": False, "loesung": "Smart-Meter-Einbau bzw. Viertelstundenmessung beim Netzbetreiber anstoßen (bis zu 2 Monate, HA II 5.1.1); der Prozess läuft weiter."},
	"183": {"text": "Summe der Teilnahmefaktoren über 100 %", "kategorie": "konflikt", "erneut": True, "loesung": "Mitglied nach Teilnahmen in anderen Gemeinschaften fragen; Teilnahmefaktor senken (Σ ≤ 100 %, ElWG § 71 Abs. 5) und erneut anmelden."},
	"185": {"text": "Höchstzahl gleichzeitiger Teilnahmen erreicht (5)", "kategorie": "konflikt", "erneut": False, "loesung": "Der Zählpunkt nimmt bereits an 5 Gemeinschaften teil (ElWG § 71 Abs. 5); Mitglied muss zuerst eine Teilnahme beenden."},
}
CODES_KEINE_ZUSTIMMUNG = ["173"]
CODES_TECHNIK = ["182"]


def responsecode_info(code):
	c = str(code if code is not None else "").strip()
	if not c:
		return {"code": "", "text": "", "kategorie": "", "erneut": False, "loesung": "", "bekannt": False}
	r = RESPONSECODES.get(c)
	if r:
		return {"code": c, **r, "bekannt": True}
	return {"code": c, "text": f"Responsecode {c}", "kategorie": "unbekannt", "erneut": False, "loesung": "Code in der Responsecode-Liste auf ebutilities.at nachschlagen und in eda/codes.js ergänzen.", "bekannt": False}


METER_CODES = {
	"1-1:1.9.0 G.01": "verbrauch_gemessen",
	"1-1:1.9.0 P.01": "verbrauch_tf",
	"1-1:2.9.0 G.02": "anteil_erzeugung",
	"1-1:2.9.0 G.03": "eigendeckung",
	"1-1:2.9.0 G.04": "eigendeckung_ee",
	"1-1:2.9.0 G.01": "erzeugung_gemessen",
	"1-1:2.9.0 P.01": "erzeugung_tf",
	"1-1:2.9.0 G.05": "restueberschuss",
}
GROESSE_METER_CODE = {v: k for k, v in METER_CODES.items()}
GROESSEN_JE_RICHTUNG = {
	"verbrauch": ["verbrauch_gemessen", "verbrauch_tf", "anteil_erzeugung", "eigendeckung"],
	"erzeugung": ["erzeugung_gemessen", "erzeugung_tf", "restueberschuss"],
}
QUALITAETEN = ["L1", "L2", "L3"]

PORTAL_ANLEITUNGEN = {
	"allgemein": {
		"portal": "Smart-Meter- bzw. Kundenportal Ihres Netzbetreibers",
		"schritte": [
			"Im Smart-Meter- bzw. Kundenportal Ihres Netzbetreibers anmelden. Noch kein Zugang? Registrieren Sie sich mit Zählpunktnummer und Kunden- bzw. Vertragskontonummer von Ihrer Netzrechnung; manche Netzbetreiber senden einen Aktivierungscode per Post.",
			"Den Bereich „Energiegemeinschaften“ bzw. „Datenfreigaben“ öffnen.",
			"Die Anfrage der Gemeinschaft prüfen: Name, Gemeinschafts-ID, Zählpunkt und Teilnahmefaktor müssen mit unserer E-Mail übereinstimmen.",
			"„Zustimmen“ wählen und bestätigen. Fertig – wir sehen die Zustimmung automatisch.",
		],
		"hinweis": "Ohne Zustimmung lehnt der Netzbetreiber die Anmeldung nach Fristablauf ab. Sie können die Zustimmung jederzeit im Portal widerrufen.",
	},
	"ENB-WIEN": {"portal": "Smart Meter-Webportal der Wiener Netze (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-NOE": {"portal": "Smart Meter Portal der Netz Niederösterreich (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-OOE": {"portal": "eService-Portal der Netz Oberösterreich (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-LINZ": {"portal": "Kundenportal der LINZ NETZ (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-SBG": {"portal": "Kundenportal der Salzburg Netz (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-TIROL": {"portal": "Kundenportal der TINETZ (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-KTN": {"portal": "„Mein Portal“ der KNG-Kärnten Netz", "schritte": None, "hinweis": ""},
	"ENB-STMK": {"portal": "Kundenportal der Energienetze Steiermark (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-VBG": {"portal": "Kundenportal der Vorarlberger Energienetze (zu bestätigen)", "schritte": None, "hinweis": ""},
	"ENB-BGLD": {"portal": "Kundenportal der Netz Burgenland (zu bestätigen)", "schritte": None, "hinweis": ""},
}


def portal_anleitung(netzbetreiber_id):
	a = PORTAL_ANLEITUNGEN["allgemein"]
	x = PORTAL_ANLEITUNGEN.get(netzbetreiber_id) or {}
	return {"portal": x.get("portal") or a["portal"], "schritte": x.get("schritte") or a["schritte"], "hinweis": x.get("hinweis") or a["hinweis"]}


# ================================================================ Hilfen (JS-Parität)


def js_str(v):
	"""Wie String(x) in JavaScript (ganze Floats ohne „.0“, None → "")."""
	if v is None:
		return ""
	if isinstance(v, bool):
		return "true" if v else "false"
	if isinstance(v, float):
		if math.isfinite(v) and v == int(v):
			return str(int(v))
		return repr(v)
	return str(v)


def js_round(x):
	return math.floor(x + 0.5)


def _num(v):
	try:
		if v is None or (isinstance(v, str) and not v.strip()):
			return float("nan") if v is None else 0.0
		return float(v)
	except (TypeError, ValueError):
		return float("nan")


def _n0(v):
	x = _num(v)
	return x if math.isfinite(x) and x != 0 else 0


def _gleich_zahl(a, b):
	x, y = _num(a), _num(b)
	return x == y


def _datum_de(t):
	return "-".join(reversed(str(t)[:10].split("-"))).replace("-", ".") if t else ""


# ================================================================ zeit.js

TAG_MS = 864e5


def _tag_ms(tag):
	d = date.fromisoformat(str(tag)[:10])
	return (d - date(1970, 1, 1)).days * TAG_MS


def tag_von(iso):
	return str(iso or "")[:10]


def iso_aus(ms):
	return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ms_von(iso):
	s = str(iso)
	d = datetime(int(s[0:4]), int(s[5:7]), int(s[8:10]), int(s[11:13]), int(s[14:16]), int(s[17:19]), tzinfo=timezone.utc)
	return (d - datetime(1970, 1, 1, tzinfo=timezone.utc)).total_seconds() * 1000


def plus_tage(tag, n):
	return (date.fromisoformat(str(tag)[:10]) + timedelta(days=int(n))).isoformat()


def tage_zwischen(von, bis):
	return (date.fromisoformat(str(bis)[:10]) - date.fromisoformat(str(von)[:10])).days


def tage_liste(von, bis):
	aus = []
	t = tag_von(von)
	while t <= tag_von(bis) and len(aus) < 3700:
		aus.append(t)
		t = plus_tage(t, 1)
	return aus


def _letzter_sonntag_utc(jahr, monat):
	if monat == 12:
		d = date(jahr, 12, 31)
	else:
		d = date(jahr, monat + 1, 1) - timedelta(days=1)
	while d.weekday() != 6:
		d -= timedelta(days=1)
	return (d - date(1970, 1, 1)).days * TAG_MS + 3600e3


def wien_offset_minuten(ms):
	j = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).year
	return 120 if _letzter_sonntag_utc(j, 3) <= ms < _letzter_sonntag_utc(j, 10) else 60


def tag_beginn_utc(tag):
	m = _tag_ms(tag)
	return iso_aus(m - wien_offset_minuten(m - 3 * 3600e3) * 60000)


def qh_anzahl(tag):
	return js_round((ms_von(tag_beginn_utc(plus_tage(tag, 1))) - ms_von(tag_beginn_utc(tag))) / 9e5)


def lokal_tag(iso_utc):
	ms = ms_von(iso_utc)
	return iso_aus(ms + wien_offset_minuten(ms) * 60000)[:10]


# ================================================================ xml.js

XML_MAX_BYTES = 8 * 1024 * 1024
XML_MAX_TIEFE = 40


class XmlFehler(Exception):
	pass


def xml_escape(s):
	return js_str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


def xml_schreiben(knoten, deklaration=True):
	zeilen = []
	if deklaration:
		zeilen.append('<?xml version="1.0" encoding="UTF-8"?>')

	def schreib(k, tiefe):
		einr = "  " * tiefe
		attrs = "".join(f' {a}="{xml_escape(v)}"' for a, v in (k.get("attrs") or {}).items() if v is not None)
		kinder = [c for c in (k.get("kinder") or []) if c]
		text = k.get("text")
		if kinder:
			zeilen.append(f"{einr}<{k['name']}{attrs}>")
			for c in kinder:
				schreib(c, tiefe + 1)
			zeilen.append(f"{einr}</{k['name']}>")
		elif text is not None and js_str(text) != "":
			zeilen.append(f"{einr}<{k['name']}{attrs}>{xml_escape(text)}</{k['name']}>")
		else:
			zeilen.append(f"{einr}<{k['name']}{attrs}/>")

	schreib(knoten, 0)
	return "\n".join(zeilen) + "\n"


_CDATA_AUF = "<!\x5bCDATA\x5b"
_CDATA_ZU = "\x5d\x5d>"


def _lokal(n):
	i = n.find(":")
	return n[i + 1 :] if i >= 0 else n


def _ist_leer(c):
	return c in (" ", "\n", "\r", "\t")


def _ist_namenszeichen(c):
	k = ord(c)
	return 48 <= k <= 57 or 65 <= k <= 90 or 97 <= k <= 122 or c in "_-.:" or k > 127


def _entitaeten(s):
	if "&" not in s:
		return s
	aus = []
	i = 0
	while i < len(s):
		amp = s.find("&", i)
		if amp < 0:
			aus.append(s[i:])
			break
		aus.append(s[i:amp])
		semi = s.find(";", amp)
		if semi < 0 or semi - amp > 10:
			raise XmlFehler("Ungültige Zeichenreferenz.")
		e = s[amp + 1 : semi]
		fest = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'"}.get(e)
		if fest is not None:
			aus.append(fest)
		elif e.startswith("#x") or e.startswith("#X"):
			aus.append(chr(int(e[2:], 16)))
		elif e.startswith("#"):
			aus.append(chr(int(e[1:], 10)))
		else:
			raise XmlFehler(f"Unbekannte Entität „{e}“.")
		i = semi + 1
	return "".join(aus)


def xml_lesen(xml):
	s = str(xml if xml is not None else "")
	if not s.strip():
		raise XmlFehler("Leere Nachricht.")
	if len(s) > XML_MAX_BYTES:
		raise XmlFehler("Nachricht zu groß.")
	i = 0
	stapel = []
	wurzel = None

	def text_an(t):
		if not stapel:
			if t.strip():
				raise XmlFehler("Text außerhalb des Wurzelelements.")
			return
		stapel[-1]["_text"] += t

	n = len(s)
	while i < n:
		lt = s.find("<", i)
		if lt < 0:
			text_an(s[i:])
			break
		if lt > i:
			text_an(s[i:lt])
		if s.startswith("<?", lt):
			e = s.find("?>", lt)
			if e < 0:
				raise XmlFehler("Verarbeitungsanweisung nicht geschlossen.")
			i = e + 2
			continue
		if s.startswith("<!--", lt):
			e = s.find("-->", lt)
			if e < 0:
				raise XmlFehler("Kommentar nicht geschlossen.")
			i = e + 3
			continue
		if s.startswith(_CDATA_AUF, lt):
			e = s.find(_CDATA_ZU, lt)
			if e < 0:
				raise XmlFehler("CDATA nicht geschlossen.")
			text_an(s[lt + 9 : e])
			i = e + 3
			continue
		if s.startswith("<!", lt):
			raise XmlFehler("DOCTYPE und Deklarationen sind nicht erlaubt.")
		if lt + 1 < n and s[lt + 1] == "/":
			e = s.find(">", lt)
			if e < 0:
				raise XmlFehler("Endtag nicht geschlossen.")
			name = _lokal(s[lt + 2 : e].strip())
			k = stapel.pop() if stapel else None
			if not k or k["name"] != name:
				raise XmlFehler(f"Endtag „{name}“ passt nicht.")
			k["text"] = _entitaeten(k["_text"]).strip()
			del k["_text"]
			i = e + 1
			continue
		j = lt + 1
		while j < n and _ist_namenszeichen(s[j]):
			j += 1
		roh = s[lt + 1 : j]
		if not roh:
			raise XmlFehler("Ungültiger Elementname.")
		k = {"name": _lokal(roh), "attrs": {}, "kinder": [], "text": "", "_text": ""}
		zu = False
		while True:
			while j < n and _ist_leer(s[j]):
				j += 1
			if j >= n:
				raise XmlFehler("Starttag nicht geschlossen.")
			if s[j] == ">":
				j += 1
				break
			if s[j] == "/" and j + 1 < n and s[j + 1] == ">":
				zu = True
				j += 2
				break
			a0 = j
			while j < n and _ist_namenszeichen(s[j]):
				j += 1
			an = s[a0:j]
			if not an:
				raise XmlFehler("Ungültiges Attribut.")
			while j < n and _ist_leer(s[j]):
				j += 1
			if j >= n or s[j] != "=":
				raise XmlFehler("Attribut ohne Wert.")
			j += 1
			while j < n and _ist_leer(s[j]):
				j += 1
			q = s[j] if j < n else ""
			if q not in ('"', "'"):
				raise XmlFehler("Attributwert ohne Anführungszeichen.")
			e = s.find(q, j + 1)
			if e < 0:
				raise XmlFehler("Attributwert nicht geschlossen.")
			if not an.startswith("xmlns"):
				k["attrs"][_lokal(an)] = _entitaeten(s[j + 1 : e])
			j = e + 1
		if stapel:
			stapel[-1]["kinder"].append(k)
		elif wurzel is not None:
			raise XmlFehler("Mehr als ein Wurzelelement.")
		else:
			wurzel = k
		if zu:
			del k["_text"]
		else:
			stapel.append(k)
			if len(stapel) > XML_MAX_TIEFE:
				raise XmlFehler("Verschachtelung zu tief.")
		i = j
	if stapel:
		raise XmlFehler(f"Element „{stapel[-1]['name']}“ nicht geschlossen.")
	if wurzel is None:
		raise XmlFehler("Kein Wurzelelement.")
	return wurzel


def kind(k, name):
	for c in (k or {}).get("kinder") or []:
		if c["name"] == name:
			return c
	return None


def kinder_mit(k, name):
	return [c for c in (k or {}).get("kinder") or [] if c["name"] == name]


def kind_text(k, name):
	c = kind(k, name)
	return c["text"] if c else ""


# ================================================================ schema.js


class EdaFehler(Exception):
	def __init__(self, msg, fehler=None):
		super().__init__(msg)
		self.fehler = fehler or []
		self.status = 422


NS_BASIS = "urn:oekoinvest:eda"
RICHTUNG_EDA = {"verbrauch": "CONSUMPTION", "erzeugung": "GENERATION"}
MODELL_EDA = {"dynamisch": "DYNAMIC", "statisch": "STATIC"}
QH_MINUTEN = 15

_MP = ["MeteringPoint", "zp", 1]
_RC = ["ResponseCode", "code", 1]
_RID = ["CMRequestId", "text", 1]
_ECID = ["ECID", "ecid", 1]

SCHEMA_FELDER = {
	"ANFORDERUNG_ECON": [_MP, _RID, ["ReqDatType", "auswahl", 1, ["EnergyCommunityRegistration", "EnergyCommunityRegistrationOffline"]], ["DateFrom", "datum", 1], _ECID, ["ECPartFact", "tf", 1], ["EnergyDirection", "richtung", 1], ["ECShare", "anteil", 0], ["ECDisModel", "modell", 0]],
	"ANTWORT_ECON": [_MP, _RID, _RC],
	"ZUSTIMMUNG_ECON": [_MP, _RID, _RC, ["ConsentId", "text", 1]],
	"ABLEHNUNG_ECON": [_MP, _RID, _RC],
	"ABSCHLUSS_ECON": [_MP, _ECID, ["ConsentId", "text", 1], ["DateActivate", "datum", 1], ["ECPartFact", "tf", 1], ["EnergyDirection", "richtung", 1], ["DateTo", "datum", 0]],
	"ANFORDERUNG_CPF": [_MP, _ECID, ["ConsentId", "text", 1], ["DateFrom", "datum", 1], ["ECPartFact", "tf", 0], ["ECShare", "anteil", 0]],
	"ANTWORT_CPF": [_MP, _RC, ["DateFrom", "datum", 0]],
	"ABLEHNUNG_CPF": [_MP, _RC],
	"AUFHEBUNG_CCMS": [_MP, _ECID, ["ConsentId", "text", 1], ["ConsentEnd", "datum", 1], ["Reason", "auswahl", 0, ["SP", "CUS", "IMP"]]],
	"ANTWORT_CCMS": [_MP, _RC, ["ConsentEnd", "datum", 0]],
	"ABLEHNUNG_CCMS": [_MP, _RC],
	"ANFORDERUNG_PT": [_MP, ["ECID", "ecid", 0], ["DateTimeFrom", "zeit", 1], ["DateTimeTo", "zeit", 1]],
	"ANTWORT_PT": [_MP, _RC],
	"ABLEHNUNG_PT": [_MP, _RC],
	"ANFORDERUNG_ECP": [_ECID],
	"SENDEN_ECP": [_ECID, ["ECDisModel", "modell", 0], ["MPListData", "liste", 1, [_MP, ["ConsentId", "text", 0], ["EnergyDirection", "richtung", 1], ["ECPartFact", "tf", 0], ["DateFrom", "datum", 0], ["DateTo", "datum", 0]]]],
	"ABLEHNUNG_ECP": [_RC],
	"DATEN_CRMSG": [_MP, ["ECID", "ecid", 0], ["Energy", "energie", 1]],
	"ABLEHNUNG_CRMSG": [_MP, _RC],
	"EDASendError": [["ResponseCode", "code", 0], ["ErrorText", "text", 0]],
}


def _feld(spec):
	name, typ, pflicht = spec[0], spec[1], spec[2]
	opt = spec[3] if len(spec) > 3 else None
	return name, typ, pflicht, opt


def _ziffern(s):
	return len(s) > 0 and all("0" <= c <= "9" for c in s)


def _alnum_gross(s):
	return len(s) > 0 and all(("0" <= c <= "9") or ("A" <= c <= "Z") for c in s)


def ist_datum(s):
	s = js_str(s)
	if len(s) != 10 or s[4] != "-" or s[7] != "-" or not _ziffern(s[0:4] + s[5:7] + s[8:10]):
		return False
	try:
		date.fromisoformat(s)
		return True
	except ValueError:
		return False


def ist_zeit(s):
	s = js_str(s)
	if len(s) != 20 or s[10] != "T" or s[13] != ":" or s[16] != ":" or s[19] != "Z" or not ist_datum(s[:10]):
		return False
	h, m, x = s[11:13], s[14:16], s[17:19]
	return _ziffern(h + m + x) and int(h) < 24 and int(m) < 60 and int(x) < 60


def ist_zaehlpunkt(s):
	s = js_str(s)
	return len(s) == 33 and s.startswith("AT") and _ziffern(s[2:13]) and _alnum_gross(s[13:])


def ist_gemeinschafts_id(s):
	s = js_str(s)
	return len(s) == 33 and s.startswith("AT") and _alnum_gross(s)


def ist_marktpartner(s):
	s = js_str(s)
	return len(s) == 8 and "A" <= s[0] <= "Z" and "A" <= s[1] <= "Z" and _ziffern(s[2:])


def zahl_format(x):
	try:
		n = float(x)
	except (TypeError, ValueError):
		raise EdaFehler("Ungültiger Zahlenwert.")
	if not math.isfinite(n):
		raise EdaFehler("Ungültiger Zahlenwert.")
	t = f"{n:.6f}"
	if "." in t:
		t = t.rstrip("0")
		if t.endswith("."):
			t = t[:-1]
	return "0" if t == "-0" else t


def _wert_pruefen(name, typ, wert, opt):
	s = js_str(wert).strip()
	if typ == "zp":
		return "" if ist_zaehlpunkt(s) else f"{name}: Zählpunktnummer ungültig (33 Zeichen, AT + Netzbetreibernummer + PLZ + 20 Zeichen)."
	if typ == "ecid":
		return "" if ist_gemeinschafts_id(s) else f"{name}: Gemeinschafts-ID ungültig (33 Zeichen)."
	if typ == "datum":
		return "" if ist_datum(s) else f"{name}: Datum JJJJ-MM-TT erwartet."
	if typ == "zeit":
		return "" if ist_zeit(s) else f"{name}: Zeitpunkt JJJJ-MM-TTThh:mm:ssZ (UTC) erwartet."
	if typ == "tf":
		return "" if _ziffern(s) and len(s) <= 3 and 1 <= int(s) <= 100 else f"{name}: Teilnahmefaktor ganzzahlig 1–100."
	if typ == "anteil":
		p = s.split(".")
		ok = len(p) <= 2 and _ziffern(p[0]) and (len(p) == 1 or (_ziffern(p[1]) and len(p[1]) <= 1))
		ok = ok and 0 <= float(s) <= 100
		return "" if ok else f"{name}: Anteil 0–100 % mit höchstens einer Nachkommastelle."
	if typ == "richtung":
		return "" if s in ("CONSUMPTION", "GENERATION") else f"{name}: CONSUMPTION oder GENERATION."
	if typ == "modell":
		return "" if s in ("DYNAMIC", "STATIC") else f"{name}: DYNAMIC oder STATIC."
	if typ == "code":
		return "" if _ziffern(s) and len(s) <= 4 else f"{name}: Responsecode (Ziffern) erwartet."
	if typ == "auswahl":
		return "" if s in (opt or []) else f"{name}: zulässig sind {', '.join(opt or [])}."
	return "" if 1 <= len(s) <= 120 else f"{name}: Text (1–120 Zeichen) erwartet."


def _leer(w):
	return w is None or (isinstance(w, str) and not w.strip()) or (isinstance(w, list) and not w)


def daten_pruefen(code, daten=None):
	daten = daten or {}
	felder = SCHEMA_FELDER.get(code)
	if not felder:
		return [f"Unbekannter Nachrichtencode „{code}“."]
	fehler = []
	for spec in felder:
		name, typ, pflicht, opt = _feld(spec)
		w = daten.get(name)
		if _leer(w):
			if pflicht:
				fehler.append(f"{name}: Pflichtfeld fehlt.")
			continue
		if typ == "liste":
			if not isinstance(w, list):
				fehler.append(f"{name}: Liste erwartet.")
				continue
			for i, z in enumerate(w):
				for uspec in opt:
					un, ut, up, uo = _feld(uspec)
					x = (z or {}).get(un)
					if x is None or js_str(x).strip() == "":
						if up:
							fehler.append(f"{name} {i + 1}, {un}: Pflichtfeld fehlt.")
						continue
					f = _wert_pruefen(f"{name} {i + 1}, {un}", ut, x, uo)
					if f:
						fehler.append(f)
		elif typ == "energie":
			fehler.extend(_energie_pruefen(w))
		else:
			f = _wert_pruefen(name, typ, w, opt)
			if f:
				fehler.append(f)
	if code == "ANFORDERUNG_CPF" and not js_str(daten.get("ECPartFact")).strip() and not js_str(daten.get("ECShare")).strip():
		fehler.append("ECPartFact oder ECShare: eines von beiden ist Pflicht.")
	return fehler


def _energie_pruefen(e):
	f = []
	if not isinstance(e, dict):
		return ["Energy: Energiedaten fehlen."]
	if not ist_zeit(e.get("start")):
		f.append("Energy: MeteringPeriodStart ungültig.")
	if not ist_zeit(e.get("ende")):
		f.append("Energy: MeteringPeriodEnd ungültig.")
	reihen = e.get("reihen") if isinstance(e.get("reihen"), list) else []
	if not reihen:
		f.append("Energy: keine EnergyData.")
	soll = js_round((ms_von(e["ende"]) - ms_von(e["start"])) / (QH_MINUTEN * 60000)) if ist_zeit(e.get("start")) and ist_zeit(e.get("ende")) else None
	if soll is not None and (soll < 1 or soll > 31 * 100):
		f.append("Energy: Zeitraum ungültig.")
	for i, r in enumerate(reihen):
		r = r or {}
		if not js_str(r.get("meterCode")).strip():
			f.append(f"EnergyData {i + 1}: MeterCode fehlt.")
		w = r.get("werte") if isinstance(r.get("werte"), list) else []
		if soll is not None and len(w) != soll:
			f.append(f"EnergyData {i + 1}: {len(w)} Werte, erwartet {soll}.")
		if any(x is not None and not math.isfinite(_num(x)) for x in w):
			f.append(f"EnergyData {i + 1}: ungültiger Wert.")
		q = r.get("qualitaet") if isinstance(r.get("qualitaet"), list) else []
		if len(q) != len(w):
			f.append(f"EnergyData {i + 1}: Qualität fehlt.")
	return f


def _plus_minuten(iso, minuten):
	return iso_aus(ms_von(iso) + minuten * 60000)


def nachricht_bauen(n):
	n = n or {}
	code = n.get("code")
	prozesscode = n.get("prozesscode")
	absender, empfaenger, erstellt = n.get("absender"), n.get("empfaenger"), n.get("erstellt")
	message_id, conversation_id, prozessdatum = n.get("messageId"), n.get("conversationId"), n.get("prozessdatum")
	modus = n.get("modus") or "PROD"
	duplikat = bool(n.get("duplikat"))
	daten = n.get("daten") or {}
	info = EDA_NACHRICHTEN.get(code)
	fehler = []
	if not info or info.get("intern"):
		fehler.append(f"Nachrichtencode „{code}“ ist keine EDA-Nachricht.")
	if prozesscode not in EDA_PROZESSE or prozesscode not in (NACHRICHT_PROZESSE.get(code) or []):
		fehler.append(f"Prozess „{prozesscode}“ passt nicht zu „{code}“.")
	if not ist_marktpartner(absender):
		fehler.append("Absender: EDA-Adresse (2 Buchstaben + 6 Ziffern) erwartet.")
	if not ist_marktpartner(empfaenger):
		fehler.append("Empfänger: EDA-Adresse (2 Buchstaben + 6 Ziffern) erwartet.")
	if not ist_zeit(erstellt):
		fehler.append("Erstellt: Zeitpunkt UTC erwartet.")
	if not js_str(message_id).strip() or len(js_str(message_id)) > 80:
		fehler.append("MessageId fehlt.")
	if not js_str(conversation_id).strip() or len(js_str(conversation_id)) > 80:
		fehler.append("ConversationId fehlt.")
	if not ist_datum(prozessdatum):
		fehler.append("ProcessDate: Datum erwartet.")
	if info and not info.get("intern"):
		fehler.extend(daten_pruefen(code, daten))
	if fehler:
		raise EdaFehler(f"Nachricht {code} ist ungültig: {fehler[0]}", fehler)
	schema = info["schema"]
	version = EDA_PROZESSE[prozesscode]["version"] or "01.00"

	def t(name, text):
		return {"name": name, "text": "" if text is None else js_str(text)}

	felder = []
	for spec in SCHEMA_FELDER[code]:
		name, typ, _p, opt = _feld(spec)
		w = daten.get(name)
		if _leer(w):
			continue
		if typ == "liste":
			for z in w:
				felder.append({"name": name, "kinder": [t(un, zahl_format(z[un]) if ut == "anteil" else js_str(z[un]).strip()) for un, ut, *_r in opt if z.get(un) is not None and js_str(z.get(un)) != ""]})
		elif typ == "energie":
			anzahl = js_round((ms_von(w["ende"]) - ms_von(w["start"])) / (QH_MINUTEN * 60000))
			kinder = [t("MeteringReason", "00"), t("MeteringPeriodStart", w["start"]), t("MeteringPeriodEnd", w["ende"]), t("MeteringIntervall", "QH"), t("NumberOfMeteringIntervall", anzahl)]
			for r in w["reihen"]:
				eps = []
				for i, x in enumerate(r["werte"]):
					if x is None:
						continue
					eps.append({"name": "EP", "kinder": [t("DTF", _plus_minuten(w["start"], i * QH_MINUTEN)), t("MM", r["qualitaet"][i] or "L1"), t("BQ", zahl_format(x))]})
				kinder.append({"name": "EnergyData", "attrs": {"MeterCode": r["meterCode"], "UOM": "KWH"}, "kinder": eps})
			felder.append({"name": "Energy", "kinder": kinder})
		else:
			felder.append(t(name, zahl_format(w) if typ == "anteil" else js_str(w).strip()))
	return xml_schreiben(
		{
			"name": schema,
			"attrs": {"xmlns": f"{NS_BASIS}:{schema}:{version}", "SchemaVersion": version},
			"kinder": [
				{
					"name": "MarketParticipantDirectory",
					"attrs": {"DocumentMode": "SIMU" if modus == "SIMU" else "PROD", "Duplicate": "true" if duplikat else "false"},
					"kinder": [
						{"name": "RoutingHeader", "kinder": [{"name": "Sender", "attrs": {"AddressType": "EC_NUMBER"}, "kinder": [t("MessageAddress", absender)]}, {"name": "Receiver", "attrs": {"AddressType": "EC_NUMBER"}, "kinder": [t("MessageAddress", empfaenger)]}, t("DocumentCreationDateTime", erstellt)]},
						t("Sector", SEKTOR_STROM),
						t("MessageCode", code),
						t("ProcessCode", prozesscode),
					],
				},
				{"name": "ProcessDirectory", "kinder": [t("MessageId", message_id), t("ConversationId", conversation_id), t("ProcessDate", prozessdatum), *felder]},
			],
		}
	)


def nachricht_lesen(xml):
	fehler, hinweise = [], []
	try:
		w = xml_lesen(xml)
	except XmlFehler as e:
		return {"ok": False, "fehler": [f"XML: {e}"], "hinweise": hinweise, "kopf": {}, "daten": {}}
	mpd = kind(w, "MarketParticipantDirectory")
	pd = kind(w, "ProcessDirectory")
	if not mpd or not pd:
		return {"ok": False, "fehler": ["Aufbau: MarketParticipantDirectory bzw. ProcessDirectory fehlt."], "hinweise": hinweise, "kopf": {"schema": w["name"]}, "daten": {}}
	rh = kind(mpd, "RoutingHeader")
	kopf = {
		"schema": w["name"],
		"version": w["attrs"].get("SchemaVersion") or "",
		"absender": kind_text(kind(rh, "Sender"), "MessageAddress"),
		"empfaenger": kind_text(kind(rh, "Receiver"), "MessageAddress"),
		"erstellt": kind_text(rh, "DocumentCreationDateTime"),
		"sektor": kind_text(mpd, "Sector"),
		"nachrichtencode": kind_text(mpd, "MessageCode"),
		"prozesscode": kind_text(mpd, "ProcessCode"),
		"modus": mpd["attrs"].get("DocumentMode") or "PROD",
		"duplikat": mpd["attrs"].get("Duplicate") == "true",
		"messageId": kind_text(pd, "MessageId"),
		"conversationId": kind_text(pd, "ConversationId"),
		"prozessdatum": kind_text(pd, "ProcessDate"),
	}
	code = kopf["nachrichtencode"]
	info = EDA_NACHRICHTEN.get(code)
	if not info or info.get("intern"):
		fehler.append(f"Unbekannter Nachrichtencode „{code}“.")
	elif info["schema"] != w["name"]:
		fehler.append(f"Schema „{w['name']}“ passt nicht zu {code} (erwartet {info['schema']}).")
	if not kopf["prozesscode"]:
		moegl = NACHRICHT_PROZESSE.get(code) or []
		if len(moegl) == 1:
			kopf["prozesscode"] = moegl[0]
			hinweise.append(f"ProcessCode fehlt – aus {code} abgeleitet ({moegl[0]}).")
		else:
			fehler.append("ProcessCode fehlt.")
	elif info and kopf["prozesscode"] not in (NACHRICHT_PROZESSE.get(code) or []):
		fehler.append(f"Prozess „{kopf['prozesscode']}“ passt nicht zu {code}.")
	if not ist_marktpartner(kopf["absender"]):
		fehler.append("Absender (MessageAddress) ungültig.")
	if not ist_marktpartner(kopf["empfaenger"]):
		fehler.append("Empfänger (MessageAddress) ungültig.")
	if kopf["sektor"] and kopf["sektor"] != SEKTOR_STROM:
		hinweise.append(f"Sektor {kopf['sektor']} (erwartet {SEKTOR_STROM} Strom).")
	if not ist_zeit(kopf["erstellt"]):
		fehler.append("DocumentCreationDateTime ungültig.")
	if not kopf["messageId"] or len(kopf["messageId"]) > 80:
		fehler.append("MessageId fehlt.")
	if not kopf["conversationId"] or len(kopf["conversationId"]) > 80:
		fehler.append("ConversationId fehlt.")
	if not ist_datum(kopf["prozessdatum"]):
		fehler.append("ProcessDate ungültig.")
	daten = {}
	for spec in SCHEMA_FELDER.get(code) or []:
		name, typ, _p, opt = _feld(spec)
		if typ == "liste":
			liste = kinder_mit(pd, name)
			if liste:
				daten[name] = [{un: kind_text(z, un) for un, *_r in opt if kind_text(z, un) != ""} for z in liste]
		elif typ == "energie":
			e = kind(pd, "Energy")
			if e:
				daten["Energy"] = _energie_lesen(e, hinweise)
		else:
			v = kind_text(pd, name)
			if v != "":
				daten[name] = v
	if info and not info.get("intern"):
		fehler.extend(daten_pruefen(code, daten))
	return {"ok": not fehler, "fehler": fehler, "hinweise": hinweise, "kopf": kopf, "daten": daten}


def _energie_lesen(e, hinweise):
	start = kind_text(e, "MeteringPeriodStart")
	ende = kind_text(e, "MeteringPeriodEnd")
	anzahl = js_round((ms_von(ende) - ms_von(start)) / (QH_MINUTEN * 60000)) if ist_zeit(start) and ist_zeit(ende) else 0
	reihen = []
	for d in kinder_mit(e, "EnergyData"):
		werte = [None] * max(0, anzahl)
		qualitaet = [""] * max(0, anzahl)
		mc = d["attrs"].get("MeterCode") or ""
		for ep in kinder_mit(d, "EP"):
			dtf = kind_text(ep, "DTF")
			i = js_round((ms_von(dtf) - ms_von(start)) / (QH_MINUTEN * 60000)) if ist_zeit(dtf) and ist_zeit(start) else -1
			if i < 0 or i >= anzahl:
				hinweise.append(f"EnergyData {mc}: Wert außerhalb des Zeitraums verworfen.")
				continue
			bq = _num(kind_text(ep, "BQ"))
			werte[i] = bq if math.isfinite(bq) else None
			mm = kind_text(ep, "MM") or "L1"
			qualitaet[i] = mm if mm in ("L1", "L2", "L3") else "L3"
		fehlend = sum(1 for x in werte if x is None)
		if fehlend:
			hinweise.append(f"EnergyData {mc}: {fehlend} Viertelstunde(n) ohne Wert.")
		reihen.append({"meterCode": mc, "werte": werte, "qualitaet": ["L3" if werte[i] is None else q for i, q in enumerate(qualitaet)]})
	return {"start": start, "ende": ende, "reihen": reihen}


# ================================================================ automat.js

_ZAEHLT = ["entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt"]
_MAX_TEILNAHMEN = 5
_GEMEINSCHAFT_EDA = ["eda_bereit", "aktiv", "aufnahmestopp", "in_aufloesung"]


def eda_id(absender, jetzt_iso, zufall_text):
	ts = str(jetzt_iso or "")[:19].replace("-", "").replace(":", "").replace("T", "")
	z = str(zufall_text or "").upper()[:6].ljust(6, "0")
	return f"{absender}{ts}{z}"


def _ganz(v):
	if isinstance(v, bool):
		return None
	if isinstance(v, int):
		return v
	if isinstance(v, float) and math.isfinite(v) and v == int(v):
		return int(v)
	return None


def gemeinschaft_eda_pruefen(g):
	fehler = []
	if not g:
		return ["Gemeinschaft fehlt."]
	if not ist_marktpartner(g.get("marktpartnerId")):
		fehler.append("Marktpartner-ID (ebUtilities) fehlt – Registrierung als Marktpartner abschließen (Fachkonzept 2.3).")
	if not ist_gemeinschafts_id(g.get("gemeinschaftsId")):
		fehler.append("Gemeinschafts-ID (33 Zeichen) fehlt – sie vergibt der Netzbetreiber mit dem Betreibervertrag (HA II 7.1).")
	if g.get("status") not in _GEMEINSCHAFT_EDA:
		fehler.append("EDA-Prozesse sind erst ab dem Status „EDA-bereit“ möglich.")
	return fehler


def anmeldung_pruefen(gemeinschaft=None, teilnahme=None, zaehlpunkt=None, teilnahmenDesZp=None, offeneProzesse=None, heute=None):
	fehler = list(gemeinschaft_eda_pruefen(gemeinschaft))
	hinweise, vorher = [], []
	if not teilnahme:
		return {"ok": False, "fehler": ["Teilnahme fehlt."], "hinweise": hinweise, "ereignisseVorher": vorher}
	g = gemeinschaft or {}
	if g.get("status") == "aufnahmestopp":
		fehler.append("Die Gemeinschaft hat einen Aufnahmestopp.")
	if teilnahme.get("status") in ("abgelehnt", "abgelaufen"):
		vorher.append("erneut")
	elif teilnahme.get("status") != "entwurf":
		fehler.append(f"Anmeldung nur aus dem Entwurf (aktuell: {teilnahme.get('status')}).")
	zp = zaehlpunkt or None
	if not zp or not ist_zaehlpunkt(zp.get("zaehlpunktnummer")):
		fehler.append("Zählpunktnummer fehlt oder ist ungültig.")
	if zp and zp.get("richtung") not in RICHTUNG_EDA:
		fehler.append("Energierichtung des Zählpunkts fehlt.")
	tf = _ganz(teilnahme.get("teilnahmefaktor"))
	if tf is None or tf < 1 or tf > 100:
		fehler.append("Teilnahmefaktor ganzzahlig 1–100 (ElWG § 71 Abs. 5).")
	if g.get("verteilmodell") == "statisch" and (zp or {}).get("richtung") == "verbrauch" and not (_num(teilnahme.get("aufteilungsschluesselPct")) > 0):
		fehler.append("Statisches Modell: Aufteilungsschlüssel des Verbrauchszählpunkts fehlt.")
	if g.get("verteilmodell") == "statisch":
		hinweise.append("Neu aktivierte Gemeinschaften erhalten ab 05.10.2026 voraussichtlich nur noch das dynamische Modell (zu bestätigen).")
	andere = [t for t in (teilnahmenDesZp or []) if t.get("id") != teilnahme.get("id") and t.get("status") in _ZAEHLT]
	if len(andere) >= _MAX_TEILNAHMEN:
		fehler.append(f"Der Zählpunkt nimmt bereits an {len(andere)} Gemeinschaften teil (höchstens {_MAX_TEILNAHMEN}, ElWG § 71 Abs. 5).")
	summe = sum(_n0(t.get("teilnahmefaktor")) for t in andere) + (tf if tf is not None else 0)
	if summe > 100:
		fehler.append(f"Summe der bekannten Teilnahmefaktoren {js_str(summe)} % > 100 % (ElWG § 71 Abs. 5).")
	if any(p.get("teilnahmeId") == teilnahme.get("id") and p.get("status") in PROZESS_OFFEN for p in (offeneProzesse or [])):
		fehler.append("Für diese Teilnahme läuft bereits ein EDA-Prozess.")
	if (zp or {}).get("smartMeter") == "nein":
		hinweise.append("Kein Smart Meter hinterlegt – der Netzbetreiber muss ggf. erst einbauen (bis zu 2 Monate, HA II 5.1.1).")
	if (zp or {}).get("smartMeter") == "unbekannt":
		hinweise.append("Smart Meter unbekannt – bitte beim Mitglied nachfragen.")
	if not heute:
		fehler.append("Stichtag fehlt.")
	return {"ok": not fehler, "fehler": fehler, "hinweise": hinweise, "ereignisseVorher": vorher}


def tf_aenderung_pruefen(gemeinschaft=None, teilnahme=None, teilnahmefaktor=None, ab=None, teilnahmenDesZp=None, prozesse=None, heute=None):
	fehler = list(gemeinschaft_eda_pruefen(gemeinschaft))
	hinweise = []
	if not teilnahme:
		return {"ok": False, "fehler": ["Teilnahme fehlt."], "hinweise": hinweise}
	prozesse = prozesse or []
	if teilnahme.get("status") != "aktiv":
		fehler.append("Der Teilnahmefaktor ist nur bei aktiven Teilnahmen änderbar.")
	tf = _ganz(teilnahmefaktor)
	if tf is None or tf < 1 or tf > 100:
		fehler.append("Teilnahmefaktor ganzzahlig 1–100 (ElWG § 71 Abs. 5).")
	if tf is not None and _gleich_zahl(tf, teilnahme.get("teilnahmefaktor")):
		fehler.append("Der Teilnahmefaktor ist unverändert.")
	if not ist_datum(ab):
		fehler.append("Gültig-ab-Datum fehlt.")
	elif ab < heute:
		fehler.append("Eine Änderung ist nicht rückwirkend möglich (frühestens heute).")
	tage = {h.get("gueltigAb") for h in teilnahme.get("tfHistorie") or []}
	tage |= {(p.get("parameter") or {}).get("ab") for p in prozesse if p.get("teilnahmeId") == teilnahme.get("id") and p.get("prozesscode") == "EC_PRTFACT_CHG" and p.get("status") in ("gesendet", "bestaetigt", "abgeschlossen", "freigabe_offen", "entwurf")}
	if ist_datum(ab) and ab in tage:
		fehler.append("Je Gemeinschaft und Zählpunkt ist derzeit nur eine Änderung des Teilnahmefaktors pro Tag möglich (bis 01.04.2028).")
	if any(p.get("teilnahmeId") == teilnahme.get("id") and p.get("status") in PROZESS_OFFEN for p in prozesse):
		fehler.append("Für diese Teilnahme läuft bereits ein EDA-Prozess (Responsecode 86 vermeiden).")
	andere = sum(_n0(t.get("teilnahmefaktor")) for t in (teilnahmenDesZp or []) if t.get("id") != teilnahme.get("id") and t.get("status") in _ZAEHLT)
	if tf is not None and andere + tf > 100:
		fehler.append(f"Summe der bekannten Teilnahmefaktoren {js_str(andere + tf)} % > 100 %.")
	if not teilnahme.get("consentId"):
		hinweise.append("Consent-ID fehlt – Zählpunktliste (EC_PODLIST) abgleichen.")
	return {"ok": not fehler, "fehler": fehler, "hinweise": hinweise}


def abmeldung_pruefen(gemeinschaft=None, teilnahme=None, zum=None, prozesse=None, heute=None):
	fehler = list(gemeinschaft_eda_pruefen(gemeinschaft))
	hinweise = []
	if not teilnahme:
		return {"ok": False, "fehler": ["Teilnahme fehlt."], "hinweise": hinweise}
	if teilnahme.get("status") != "aktiv":
		fehler.append("Abmelden lassen sich nur aktive Teilnahmen.")
	if not ist_datum(zum):
		fehler.append("Datum der Abmeldung (letzter Tag der Zuordnung) fehlt.")
	elif zum < heute:
		fehler.append("Eine Abmeldung ist nicht rückwirkend möglich (Prozessdatum frühestens heute, Fachkonzept 2.7).")
	if any(p.get("teilnahmeId") == teilnahme.get("id") and p.get("status") in PROZESS_OFFEN for p in (prozesse or [])):
		fehler.append("Für diese Teilnahme läuft bereits ein EDA-Prozess.")
	if not teilnahme.get("consentId"):
		hinweise.append("Consent-ID fehlt – wird als „Migration“ gesendet (Altfall vor 03.10.2022, HA II 7.2), bitte prüfen.")
	return {"ok": not fehler, "fehler": fehler, "hinweise": hinweise}


def nachforderung_pruefen(gemeinschaft=None, teilnahme=None, von=None, bis=None, heute=None):
	fehler = list(gemeinschaft_eda_pruefen(gemeinschaft))
	if not teilnahme:
		return {"ok": False, "fehler": ["Teilnahme fehlt."], "hinweise": []}
	if teilnahme.get("status") not in ("aktiv", "abmeldung_angefragt", "beendet"):
		fehler.append("Nachforderung nur für aktivierte Teilnahmen.")
	if not ist_datum(von) or not ist_datum(bis) or von > bis:
		fehler.append("Zeitraum (von ≤ bis) fehlt.")
	else:
		if bis >= heute:
			fehler.append("Nachforderung nur für vergangene Tage (Daten frühestens am Folgetag).")
		if teilnahme.get("gueltigAb") and von < teilnahme["gueltigAb"]:
			fehler.append(f"Vor der Aktivierung ({_datum_de(teilnahme['gueltigAb'])}) gibt es keine Gemeinschaftsdaten.")
		if tage_zwischen(von, bis) > 30:
			fehler.append("Höchstens 31 Tage je Nachforderung (Plattform-Regel).")
	return {"ok": not fehler, "fehler": fehler, "hinweise": []}


def vier_augen_noetig(art, anzahl):
	return art in ("abmelden", "tf") and _num(anzahl) >= VIER_AUGEN_AB


def prozess_neu(prozesscode, gemeinschaft=None, teilnahme=None, zaehlpunkt=None, netzbetreiber=None, prozessdatum=None, parameter=None, freigabeNoetig=False, jetzt=None, von=None):
	p = EDA_PROZESSE.get(prozesscode)
	if not p:
		raise ValueError(f"Unbekannter Prozess {prozesscode}")
	status = "freigabe_offen" if freigabeNoetig else "entwurf"
	zp = zaehlpunkt or {}
	nb = netzbetreiber or {}
	return {
		"gemeinschaftId": (gemeinschaft or {}).get("id") or "",
		"prozesscode": prozesscode,
		"version": p["version"],
		"teilnahmeId": (teilnahme or {}).get("id") or "",
		"zaehlpunktId": zp.get("id") or "",
		"zaehlpunktnummer": zp.get("zaehlpunktnummer") or "",
		"netzbetreiberId": nb.get("id") or zp.get("netzbetreiberId") or "",
		"empfaenger": nb.get("marktpartnerId") or "",
		"prozessdatum": prozessdatum,
		"status": status,
		"responsecode": "",
		"responsetext": "",
		"fristBis": "",
		"gesendetAm": "",
		"versuche": 0,
		"freigabe": {"status": "offen", "beantragtVon": von, "von": None, "am": ""} if freigabeNoetig else {"status": "", "beantragtVon": None, "von": None, "am": ""},
		"massenId": "",
		"parameter": parameter or {},
		"ergebnis": {},
		"erinnerungen": [],
		"merker": [],
		"nachfolgerId": "",
		"verlauf": [{"am": jetzt, "von": "", "nach": status, "nachricht": "", "text": "Angelegt – Freigabe durch den Vorstand nötig (Vier-Augen)" if freigabeNoetig else "Angelegt", "konto": von}],
	}


def start_nachricht(prozess, gemeinschaft, zaehlpunkt=None, teilnahme=None, messageId=None, erstellt=None, modus="PROD", duplikat=False):
	pc = prozess["prozesscode"]
	d = EDA_PROZESSE.get(pc)
	if not d or d["richtung"] != "aus" or d.get("intern"):
		raise ValueError(f"Prozess {pc} wird nicht von der Gemeinschaft gestartet.")
	zp = (zaehlpunkt or {}).get("zaehlpunktnummer") or prozess.get("zaehlpunktnummer")
	ecid = gemeinschaft.get("gemeinschaftsId")
	consent = (teilnahme or {}).get("consentId") or "Migration"
	par = prozess.get("parameter") or {}
	daten = {}
	if pc in ("EC_REQ_ONL", "EC_REQ_OFF"):
		tn = teilnahme or {}
		tf = tn.get("teilnahmefaktor") if tn.get("teilnahmefaktor") is not None else par.get("teilnahmefaktor")
		share = tn.get("aufteilungsschluesselPct") if gemeinschaft.get("verteilmodell") == "statisch" and tn.get("aufteilungsschluesselPct") else None
		daten = {
			"MeteringPoint": zp,
			"CMRequestId": prozess.get("conversationId"),
			"ReqDatType": "EnergyCommunityRegistrationOffline" if pc == "EC_REQ_OFF" else "EnergyCommunityRegistration",
			"DateFrom": prozess.get("prozessdatum"),
			"ECID": ecid,
			"ECPartFact": js_str(tf),
			"EnergyDirection": RICHTUNG_EDA.get((zaehlpunkt or {}).get("richtung")) or par.get("richtung"),
			"ECShare": share,
			"ECDisModel": MODELL_EDA.get(gemeinschaft.get("verteilmodell")),
		}
	elif pc == "EC_PRTFACT_CHG":
		daten = {"MeteringPoint": zp, "ECID": ecid, "ConsentId": consent, "DateFrom": par.get("ab"), "ECPartFact": js_str(par.get("teilnahmefaktor"))}
	elif pc == "EC_PRT_CHANGE":
		daten = {"MeteringPoint": zp, "ECID": ecid, "ConsentId": consent, "DateFrom": par.get("ab"), "ECShare": par.get("pct")}
	elif pc == "CM_REV_SP":
		daten = {"MeteringPoint": zp, "ECID": ecid, "ConsentId": consent, "ConsentEnd": par.get("zum"), "Reason": "SP"}
	elif pc == "CR_REQ_PT":
		daten = {"MeteringPoint": zp, "ECID": ecid, "DateTimeFrom": par.get("vonUtc"), "DateTimeTo": par.get("bisUtc")}
	elif pc == "EC_PODLIST":
		daten = {"ECID": ecid}
	code = d["start"]
	xml = nachricht_bauen({"code": code, "prozesscode": pc, "absender": gemeinschaft.get("marktpartnerId"), "empfaenger": prozess.get("empfaenger"), "erstellt": erstellt, "messageId": messageId, "conversationId": prozess.get("conversationId"), "prozessdatum": prozess.get("prozessdatum"), "modus": modus, "duplikat": duplikat, "daten": daten})
	return {"code": code, "xml": xml}


def als_gesendet(prozess, jetzt, messageId, wiederholung=False):
	neu = copy.deepcopy(prozess)
	von = neu["status"]
	neu["status"] = "gesendet"
	neu["gesendetAm"] = jetzt
	neu["versuche"] = (neu.get("versuche") or 0) + 1
	text = f"Erneut gesendet (Versuch {neu['versuche']}, {messageId})" if wiederholung else f"Gesendet ({messageId})"
	neu["verlauf"].append({"am": jetzt, "von": von, "nach": "gesendet", "nachricht": (EDA_PROZESSE.get(prozess["prozesscode"]) or {}).get("start") or "", "text": text, "konto": None})
	return neu


def freigabe_anwenden(prozess, entscheidung, von, jetzt, grund=""):
	if prozess.get("status") != "freigabe_offen":
		raise ValueError("Für diesen Prozess ist keine Freigabe offen.")
	if von and (prozess.get("freigabe") or {}).get("beantragtVon") and von == prozess["freigabe"]["beantragtVon"]:
		raise ValueError("Vier-Augen-Prinzip: Die beantragende Person kann nicht selbst freigeben.")
	ok = entscheidung == "erteilen"
	nach = "entwurf" if ok else "verworfen"
	neu = copy.deepcopy(prozess)
	neu["status"] = nach
	neu["freigabe"] = {**(prozess.get("freigabe") or {}), "status": "erteilt" if ok else "abgelehnt", "von": von, "am": jetzt}
	neu["verlauf"].append({"am": jetzt, "von": "freigabe_offen", "nach": nach, "nachricht": "", "text": "Freigegeben (Vier-Augen)" if ok else ("Freigabe abgelehnt" + (f": {grund}" if grund else "")), "konto": von})
	return neu


def _setze(prozess, status, jetzt, code, text, responsecode=None):
	neu = copy.deepcopy(prozess)
	neu["verlauf"] = list(neu.get("verlauf") or [])
	neu["merker"] = list(neu.get("merker") or [])
	if responsecode:
		neu["responsecode"] = responsecode
		neu["responsetext"] = responsecode_info(responsecode)["text"]
	von = neu.get("status")
	if status:
		neu["status"] = status
	neu["verlauf"].append({"am": jetzt, "von": von, "nach": neu["status"], "nachricht": code, "text": text or "", "konto": None})
	return neu


def eingang_anwenden(prozess, n, teilnahme=None, jetzt=None):
	kopf = n.get("kopf") or {}
	code = kopf.get("nachrichtencode")
	d = n.get("daten") or {}
	rc = d.get("ResponseCode") or ""
	info = responsecode_info(rc)
	pc = prozess["prozesscode"]
	ts = (teilnahme or {}).get("status") or ""
	tag = tag_von(kopf.get("erstellt") or jetzt)
	par = prozess.get("parameter") or {}
	aus = {"prozess": prozess, "ereignisse": [], "energiedaten": False, "hinweise": [], "klaerfall": "", "verteilschluessel": ""}

	def ev(ereignis, **extra):
		e = {"ereignis": ereignis}
		if rc:
			e["responsecode"] = rc
		e.update({k: v for k, v in extra.items() if v is not None})
		aus["ereignisse"].append(e)

	def setze(status, text):
		return _setze(prozess, status, jetzt, code, text, rc)

	offen = prozess.get("status") in PROZESS_OFFEN
	if not offen and not (pc == "CR_REQ_PT" and code == "DATEN_CRMSG"):
		aus["prozess"] = setze(None, "Nachricht zu bereits abgeschlossenem Prozess – nur protokolliert")
		aus["hinweise"].append(f"Prozess ist bereits „{(PROZESS_STATUS.get(prozess.get('status')) or {}).get('label') or prozess.get('status')}“ – Nachricht {code} nur protokolliert.")
		return aus
	if code == "EDASendError":
		aus["prozess"] = setze("fehler", "Zustellfehler der EDA-Plattform" + (f": {d['ErrorText']}" if d.get("ErrorText") else ""))
		if ts == "angefragt":
			ev("fehler")
		aus["klaerfall"] = "Zustellfehler – Adressierung (Marktpartner-ID des Netzbetreibers) und Gateway prüfen, dann erneut senden."
		return aus
	if pc in ("EC_REQ_ONL", "EC_REQ_OFF"):
		if code == "ANTWORT_ECON":
			if ts == "angefragt":
				ev("anforderung_econ", datum=tag)
				x = setze("bestaetigt", f"Netzbetreiber hat die Anmeldung angenommen und die Zustimmung beim Mitglied angefordert (Frist {EDA_FRISTEN['zustimmungTage']} Tage)")
				x["fristBis"] = plus_tage(tag, EDA_FRISTEN["zustimmungTage"])
				aus["prozess"] = x
			elif ts in ("zugestimmt", "zustimmung_offen"):
				if ts == "zustimmung_offen":
					aus["hinweise"].append("ANTWORT_ECON nach Zustimmungsanforderung – nur protokolliert.")
				else:
					ev("antwort_econ", datum=tag)
				text = f"Technik ausständig: {info['text']}" if rc in CODES_TECHNIK else ("Antwort des Netzbetreibers" + (f" ({rc} {info['text']})" if rc else ""))
				x = setze("bestaetigt", text)
				if ts == "zugestimmt":
					x["technikSeit"] = tag
				aus["prozess"] = x
			else:
				aus["prozess"] = setze(None, "Antwort protokolliert")
				aus["hinweise"].append(f"ANTWORT_ECON passt nicht zum Teilnahme-Status „{ts or '–'}“.")
			return aus
		if code == "ZUSTIMMUNG_ECON":
			if ts == "angefragt":
				ev("anforderung_econ", datum=tag)
			if ts in ("angefragt", "zustimmung_offen"):
				ev("zustimmung_econ", consentId=d.get("ConsentId"), datum=tag)
			else:
				aus["hinweise"].append(f"ZUSTIMMUNG_ECON passt nicht zum Teilnahme-Status „{ts or '–'}“.")
			zusatz = f"; Widerruf binnen {EDA_FRISTEN['offlineWiderrufTage']} Tagen möglich" if pc == "EC_REQ_OFF" else ""
			x = setze("bestaetigt", f"Mitglied hat zugestimmt (Consent-ID {d.get('ConsentId')}){zusatz}")
			x["fristBis"] = ""
			aus["prozess"] = x
			return aus
		if code == "ABSCHLUSS_ECON":
			if ts == "angefragt":
				ev("anforderung_econ", datum=tag)
			if ts in ("angefragt", "zustimmung_offen"):
				ev("zustimmung_econ", consentId=d.get("ConsentId"), datum=tag)
			if ts in ("angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik"):
				ev("abschluss_econ", datum=d.get("DateActivate"), consentId=d.get("ConsentId"))
			else:
				aus["hinweise"].append(f"ABSCHLUSS_ECON passt nicht zum Teilnahme-Status „{ts or '–'}“.")
			if teilnahme and not _gleich_zahl(d.get("ECPartFact"), teilnahme.get("teilnahmefaktor")):
				aus["klaerfall"] = f"Netzbetreiber meldet Teilnahmefaktor {d.get('ECPartFact')} %, Plattform {js_str(teilnahme.get('teilnahmefaktor'))} % – bitte abgleichen (EC_PODLIST)."
			x = setze("abgeschlossen", f"Zuordnung aktiv ab {_datum_de(d.get('DateActivate'))}")
			x["fristBis"] = ""
			x["ergebnis"] = {**(prozess.get("ergebnis") or {}), "aktivAb": d.get("DateActivate"), "consentId": d.get("ConsentId")}
			aus["prozess"] = x
			return aus
		if code == "ABLEHNUNG_ECON":
			if ts == "zustimmung_offen" and rc in CODES_KEINE_ZUSTIMMUNG:
				ev("frist_abgelaufen", datum=tag)
			elif ts in ("angefragt", "zustimmung_offen", "wartet_technik"):
				ev("ablehnung_econ", datum=tag)
			elif ts == "zugestimmt":
				ev("antwort_econ", datum=tag)
				ev("ablehnung_econ", datum=tag)
			else:
				aus["hinweise"].append(f"ABLEHNUNG_ECON passt nicht zum Teilnahme-Status „{ts or '–'}“.")
			x = setze("zeitueberschreitung" if rc in CODES_KEINE_ZUSTIMMUNG else "abgelehnt", f"Abgelehnt: {rc} {info['text']}")
			x["fristBis"] = ""
			aus["prozess"] = x
			return aus
	if pc in ("EC_PRTFACT_CHG", "EC_PRT_CHANGE"):
		if code == "ANTWORT_CPF":
			if pc == "EC_PRTFACT_CHG":
				if ts == "aktiv":
					tf = _num(par.get("teilnahmefaktor"))
					ev("tf_geaendert", teilnahmefaktor=int(tf) if math.isfinite(tf) and tf == int(tf) else tf, datum=d.get("DateFrom") or par.get("ab"))
				else:
					aus["hinweise"].append(f"TF-Bestätigung, aber Teilnahme ist „{ts or '–'}“.")
				text = f"Teilnahmefaktor {js_str(par.get('teilnahmefaktor'))} % ab {_datum_de(d.get('DateFrom') or par.get('ab'))} bestätigt"
			else:
				aus["verteilschluessel"] = "gueltig"
				text = "Aufteilungsschlüssel bestätigt"
			aus["prozess"] = setze("abgeschlossen", text)
			return aus
		if code == "ABLEHNUNG_CPF":
			aus["prozess"] = setze("abgelehnt", f"Abgelehnt: {rc} {info['text']}")
			return aus
	if pc == "CM_REV_SP":
		if code == "ANTWORT_CCMS":
			if ts == "abmeldung_angefragt":
				ev("abmeldung_ok", datum=d.get("ConsentEnd") or par.get("zum"))
			else:
				aus["hinweise"].append(f"Abmeldebestätigung, aber Teilnahme ist „{ts or '–'}“.")
			aus["prozess"] = setze("abgeschlossen", f"Abmeldung zum {_datum_de(d.get('ConsentEnd') or par.get('zum'))} bestätigt")
			return aus
		if code == "ABLEHNUNG_CCMS":
			if ts == "abmeldung_angefragt":
				ev("abmeldung_abgelehnt")
			aus["prozess"] = setze("abgelehnt", f"Abmeldung abgelehnt: {rc} {info['text']}")
			return aus
	if pc == "CR_REQ_PT":
		if code == "ANTWORT_PT":
			x = setze("bestaetigt", "Nachforderung angenommen – Daten folgen")
			x["bestaetigtAm"] = jetzt
			aus["prozess"] = x
			return aus
		if code == "ABLEHNUNG_PT":
			aus["prozess"] = setze("abgelehnt", f"Nachforderung abgelehnt: {rc} {info['text']}")
			return aus
		if code == "DATEN_CRMSG":
			aus["energiedaten"] = True
			aus["prozess"] = _setze(prozess, "abgeschlossen", jetzt, code, "Nachgeforderte Energiedaten empfangen")
			return aus
	if pc == "EC_PODLIST":
		if code == "SENDEN_ECP":
			x = _setze(prozess, "abgeschlossen", jetzt, code, f"Zählpunktliste empfangen ({len(d.get('MPListData') or [])} Einträge)")
			x["ergebnis"] = {**(prozess.get("ergebnis") or {}), "liste": d.get("MPListData") or [], "modell": d.get("ECDisModel") or ""}
			aus["prozess"] = x
			return aus
		if code == "ABLEHNUNG_ECP":
			aus["prozess"] = setze("abgelehnt", f"Zählpunktliste abgelehnt: {rc} {info['text']}")
			return aus
	aus["prozess"] = setze(None, "Unerwartete Nachricht – nur protokolliert")
	aus["hinweise"].append(f"Nachricht {code} ist im Prozess {pc} nicht vorgesehen.")
	aus["klaerfall"] = f"Unerwartete Nachricht {code} im Prozess {pc}."
	return aus


def eingang_ohne_prozess(n, teilnahme=None):
	kopf = n.get("kopf") or {}
	code, pc = kopf.get("nachrichtencode"), kopf.get("prozesscode")
	d = n.get("daten") or {}
	ts = (teilnahme or {}).get("status") or ""
	if code == "AUFHEBUNG_CCMS" and pc in ("CM_REV_CUS", "CM_REV_IMP"):
		ereignis = "cm_rev_cus" if pc == "CM_REV_CUS" else "cm_rev_imp"
		ereignisse, hinweise = [], []
		if ts == "aktiv":
			ereignisse.append({"ereignis": ereignis, "datum": d.get("ConsentEnd")})
		elif ts == "abmeldung_angefragt":
			ereignisse.append({"ereignis": "abmeldung_ok", "datum": d.get("ConsentEnd")})
		else:
			hinweise.append(f"Aufhebung durch den Netzbetreiber, aber Teilnahme ist „{ts or 'nicht gefunden'}“.")
		if pc == "CM_REV_CUS":
			text = f"Mitglied hat die Zuordnung im Netzbetreiber-Portal widerrufen (Ende {_datum_de(d.get('ConsentEnd'))}) – Vertragsende prüfen"
		else:
			text = f"Implizite Abmeldung (Auszug bzw. vertragsloser Zustand) zum {_datum_de(d.get('ConsentEnd'))} – Nachmieter muss sich neu anmelden"
		return {"prozesscode": pc, "ereignisse": ereignisse, "energiedaten": False, "text": text, "hinweise": hinweise}
	if code == "DATEN_CRMSG":
		return {"prozesscode": "CR_MSG", "ereignisse": [], "energiedaten": True, "text": "Energiedaten empfangen", "hinweise": []}
	return {"prozesscode": "", "ereignisse": [], "energiedaten": False, "text": "", "hinweise": [f"Nachricht {code} ohne zugehörigen Prozess (ConversationId {kopf.get('conversationId')})."]}


def erinnerung_faellig(prozess, teilnahme, heute):
	if not prozess or prozess.get("status") != "bestaetigt" or (teilnahme or {}).get("status") != "zustimmung_offen" or not prozess.get("fristBis"):
		return 0
	seit = tage_zwischen(plus_tage(prozess["fristBis"], -EDA_FRISTEN["zustimmungTage"]), heute)
	if heute > prozess["fristBis"]:
		return 0
	erledigt = {e.get("stufe") for e in prozess.get("erinnerungen") or []}
	faellig = 0
	for i, t in enumerate(EDA_FRISTEN["erinnerungTage"]):
		if seit >= t and (i + 1) not in erledigt:
			faellig = i + 1
	return faellig if faellig and not any(s > faellig for s in erledigt if isinstance(s, int)) else 0


def fristen_pruefen(prozesse=None, teilnahmen=None, heute=None):
	aktionen = []
	teilnahmen = teilnahmen or {}
	for p in prozesse or []:
		t = teilnahmen.get(p.get("teilnahmeId")) if p.get("teilnahmeId") else None

		def a(art, text, **extra):
			aktionen.append({"art": art, "prozessId": p.get("id"), "teilnahmeId": p.get("teilnahmeId") or "", "text": text, **extra})

		merker = set(p.get("merker") or [])
		ts = (t or {}).get("status")
		if p.get("status") == "gesendet" and p.get("gesendetAm") and not (EDA_PROZESSE.get(p.get("prozesscode")) or {}).get("intern"):
			vers = p.get("versuche") or 1
			idx = max(0, vers - 1)
			warte = EDA_FRISTEN["backoffTage"][idx] if idx < len(EDA_FRISTEN["backoffTage"]) else EDA_FRISTEN["antwortTage"]
			if tage_zwischen(tag_von(p["gesendetAm"]), heute) >= warte:
				if vers < EDA_FRISTEN["maxVersuche"]:
					a("wiederholen", f"Keine Antwort seit {warte} Tagen – erneut senden (Versuch {vers + 1}).")
				else:
					a("zeitueberschreitung", f"Keine Antwort nach {p.get('versuche')} Versuchen – Klärfall (Gateway, Adressierung, Netzbetreiber).")
		if p.get("status") == "bestaetigt" and ts == "zustimmung_offen" and p.get("fristBis") and heute > p["fristBis"]:
			a("frist_abgelaufen", f"Zustimmungsfrist am {_datum_de(p['fristBis'])} abgelaufen.")
		stufe = erinnerung_faellig(p, t, heute)
		if stufe:
			a("erinnern", f"Erinnerung {stufe} an das Mitglied (noch {tage_zwischen(heute, p['fristBis'])} Tage).", stufe=stufe)
		if p.get("status") == "bestaetigt" and ts == "wartet_technik" and p.get("technikSeit") and tage_zwischen(p["technikSeit"], heute) >= EDA_FRISTEN["technikHinweisTage"] and "technik" not in merker:
			a("hinweis_technik", f"Seit {tage_zwischen(p['technikSeit'], heute)} Tagen wartet die Aktivierung auf den Netzbetreiber (Smart Meter) – nachfragen bzw. Reklamation.")
		if p.get("prozesscode") == "CR_REQ_PT" and p.get("status") == "bestaetigt" and p.get("bestaetigtAm") and tage_zwischen(tag_von(p["bestaetigtAm"]), heute) >= EDA_FRISTEN["nachforderungTage"] and "nachforderung" not in merker:
			a("hinweis_nachforderung", f"Nachgeforderte Daten fehlen seit {EDA_FRISTEN['nachforderungTage']} Tagen – Reklamation vorbereiten.")
		if p.get("prozesscode") == "REKLAMATION" and p.get("status") == "gesendet" and p.get("fristBis") and heute > p["fristBis"] and "eskalation" not in merker:
			a("reklamation_eskalation", f"Keine Antwort des Netzbetreibers bis {_datum_de(p['fristBis'])} – Eskalation (Schlichtungsstelle der E-Control) vorbereiten.")
	return aktionen


def frist_anwenden(prozess, art, jetzt, text=""):
	nach = {"zeitueberschreitung": "zeitueberschreitung", "frist_abgelaufen": "zeitueberschreitung", "reklamation_eskalation": "zeitueberschreitung"}.get(art)
	merker = {"hinweis_technik": "technik", "hinweis_nachforderung": "nachforderung", "reklamation_eskalation": "eskalation"}.get(art)
	neu = _setze(prozess, nach, jetzt, "", text or art)
	if merker:
		m = list(neu.get("merker") or [])
		if merker not in m:
			m.append(merker)
		neu["merker"] = m
	if art == "frist_abgelaufen":
		neu["fristBis"] = prozess.get("fristBis")
	return neu


def frist_ampel(prozess, teilnahme, heute):
	s = prozess.get("status")
	ts = (teilnahme or {}).get("status")
	if s == "freigabe_offen":
		return {"ampel": "gelb", "tageRest": None, "text": "Freigabe durch den Vorstand offen"}
	if s in ("abgelehnt", "fehler", "zeitueberschreitung"):
		if prozess.get("nachfolgerId"):
			return {"ampel": "grau", "tageRest": None, "text": "Neu gestartet"}
		text = ("Abgelehnt" + (f" ({prozess['responsecode']})" if prozess.get("responsecode") else "")) if s == "abgelehnt" else PROZESS_STATUS[s]["label"]
		return {"ampel": "rot", "tageRest": None, "text": text}
	if s in ("abgeschlossen", "verworfen"):
		return {"ampel": "grau", "tageRest": None, "text": PROZESS_STATUS[s]["label"]}
	if s == "bestaetigt" and prozess.get("fristBis") and ts == "zustimmung_offen":
		rest = tage_zwischen(heute, prozess["fristBis"])
		if rest < 0:
			return {"ampel": "rot", "tageRest": rest, "text": "Frist abgelaufen"}
		return {"ampel": "rot" if rest <= 3 else ("gelb" if rest <= 10 else "gruen"), "tageRest": rest, "text": f"Zustimmung offen – noch {rest} {'Tag' if rest == 1 else 'Tage'}"}
	if s == "bestaetigt" and ts == "wartet_technik":
		seit = tage_zwischen(prozess["technikSeit"], heute) if prozess.get("technikSeit") else 0
		return {"ampel": "rot" if seit >= EDA_FRISTEN["technikHinweisTage"] else "gelb", "tageRest": None, "text": f"Wartet auf Technik seit {seit} Tagen"}
	if prozess.get("prozesscode") == "REKLAMATION" and s == "gesendet" and prozess.get("fristBis"):
		rest = tage_zwischen(heute, prozess["fristBis"])
		return {"ampel": "rot" if rest < 0 else ("gelb" if rest <= 3 else "gruen"), "tageRest": rest, "text": f"Antwort des Netzbetreibers bis {_datum_de(prozess['fristBis'])}"}
	if s == "gesendet":
		v = prozess.get("versuche") or 1
		return {"ampel": "gelb" if v > 1 else "gruen", "tageRest": None, "text": f"Antwort offen – Versuch {prozess.get('versuche')}" if v > 1 else "Antwort offen"}
	return {"ampel": "gruen", "tageRest": None, "text": (PROZESS_STATUS.get(s) or {}).get("label") or s}


def erinnerung_text(name="", gemeinschaftName="", gemeinschaftsId="", zaehlpunktnummer="", teilnahmefaktor=None, fristBis="", netzbetreiberId="", netzbetreiberName="", stufe=1, heute=None):
	a = portal_anleitung(netzbetreiberId)
	rest = tage_zwischen(heute, fristBis) if fristBis else None
	dringend = rest is not None and rest <= 3
	vor = "Dringend: " if dringend else ("Erinnerung: " if stufe > 1 else "")
	betreff = f"{vor}Bitte Teilnahme an „{gemeinschaftName}“ im Portal Ihres Netzbetreibers bestätigen"
	frist = ""
	if fristBis:
		frist = f" – bis spätestens {_datum_de(fristBis)}"
		if rest is not None and rest >= 0:
			frist += f" (noch {rest} {'Tag' if rest == 1 else 'Tage'})"
	zeilen = [
		f"Guten Tag{' ' + name if name else ''},",
		"",
		f"Ihre Anmeldung zur Energiegemeinschaft „{gemeinschaftName}“ liegt bei {netzbetreiberName or 'Ihrem Netzbetreiber'}. Damit sie wirksam wird, müssen Sie selbst im {a['portal']} zustimmen{frist}.",
		"",
		"Ihre Angaben zum Vergleich:",
		f"• Zählpunkt: {zaehlpunktnummer}",
		f"• Gemeinschafts-ID: {gemeinschaftsId}",
		f"• Teilnahmefaktor: {js_str(teilnahmefaktor)} %",
		"",
		"So geht es:",
		*[f"{i + 1}. {s}" for i, s in enumerate(a["schritte"])],
		"",
		a["hinweis"],
		"Brauchen Sie Hilfe? Antworten Sie im Portal von ÖkoInvest unter „Nachrichten“ – wir rufen Sie gerne zurück.",
	]
	return {"betreff": betreff, "text": "\n".join(zeilen)}


# ================================================================ daten.js


def energiedaten_payload(n, gemeinschaftId=None, nachrichtId=None):
	e = ((n or {}).get("daten") or {}).get("Energy")
	hinweise = []
	if not e:
		return {"payload": None, "hinweise": ["Keine Energiedaten in der Nachricht."], "tag": ""}
	reihen = []
	for r in e.get("reihen") or []:
		g = METER_CODES.get(r.get("meterCode"))
		if not g:
			hinweise.append(f"MeterCode „{r.get('meterCode')}“ unbekannt – Reihe nicht übernommen (Tabelle in eda/codes.js prüfen).")
			continue
		reihen.append({"groesse": g, "werte": r["werte"], "qualitaet": r["qualitaet"]})
	payload = {"gemeinschaftId": gemeinschaftId, "zaehlpunktnummer": n["daten"].get("MeteringPoint"), "nachrichtId": nachrichtId, "messageId": n["kopf"].get("messageId"), "von": e["start"], "bis": e["ende"], "reihen": reihen}
	return {"payload": payload, "hinweise": hinweise, "tag": lokal_tag(e["start"])}


def energiedaten_kennzahlen(payload):
	aus = {"groessen": {}, "werte": 0, "l3": 0, "fehlend": 0}
	for r in (payload or {}).get("reihen") or []:
		s = 0.0
		for i, x in enumerate(r["werte"]):
			aus["werte"] += 1
			if x is None:
				aus["fehlend"] += 1
			else:
				s += float(x)
			if r["qualitaet"][i] == "L3":
				aus["l3"] += 1
		aus["groessen"][r["groesse"]] = js_round(s * 1000) / 1000
	aus["anteilL3"] = js_round((aus["l3"] / aus["werte"]) * 1000) / 1000 if aus["werte"] else 0
	return aus


def datenluecken(teilnahmen=None, empfangen=None, von=None, bis=None, heute=None):
	grenze = plus_tage(heute, -EDA_FRISTEN["datenVerzugTage"])
	empfangen = empfangen or {}
	aus = []
	for t in teilnahmen or []:
		if not t.get("gueltigAb"):
			continue
		a = t["gueltigAb"] if t["gueltigAb"] > von else von
		b = bis if bis < grenze else grenze
		if t.get("gueltigBis") and t["gueltigBis"] < b:
			b = t["gueltigBis"]
		if a > b:
			continue
		da = set(empfangen.get(t["zaehlpunktnummer"]) or [])
		fehlend = [x for x in tage_liste(a, b) if x not in da]
		if fehlend:
			aus.append({"teilnahmeId": t.get("teilnahmeId"), "zaehlpunktnummer": t["zaehlpunktnummer"], "fehlend": fehlend, "anzahl": len(fehlend), "aeltester": fehlend[0]})
	aus.sort(key=lambda x: (-x["anzahl"], x["zaehlpunktnummer"]))
	return aus


def zeitraeume(tage=None):
	aus = []
	for t in sorted(tage or []):
		if aus and plus_tage(aus[-1]["bis"], 1) == t:
			aus[-1]["bis"] = t
		else:
			aus.append({"von": t, "bis": t})
	return aus


def podlist_abgleich(soll=None, ist=None, heute=""):
	richtung = {"verbrauch": "CONSUMPTION", "erzeugung": "GENERATION"}
	soll, ist = soll or [], ist or []

	def noch_zugeordnet(s):
		return s.get("status") in ("aktiv", "abmeldung_angefragt") or (s.get("status") == "beendet" and bool(heute) and bool(s.get("gueltigBis")) and s["gueltigBis"] >= heute)

	erwartet = [s for s in soll if noch_zugeordnet(s)]
	soll_map = {f"{s['zaehlpunktnummer']}|{richtung.get(s.get('richtung'), s.get('richtung'))}": s for s in soll}
	ist_map = {f"{i['MeteringPoint']}|{i.get('EnergyDirection')}": i for i in ist}
	aus = []
	for s in erwartet:
		k = f"{s['zaehlpunktnummer']}|{richtung.get(s.get('richtung'), s.get('richtung'))}"
		i = ist_map.get(k)
		if not i:
			aus.append({"zaehlpunktnummer": s["zaehlpunktnummer"], "teilnahmeId": s.get("teilnahmeId"), "art": "fehlt_beim_nb", "text": "Beim Netzbetreiber nicht zugeordnet", "empfehlung": "Anmeldung prüfen (Verlauf, Responsecodes); ggf. erneut anmelden. Bis dahin keine Gemeinschaftsdaten.", "soll": s, "ist": None})
			continue
		abw = []
		if i.get("ECPartFact") not in (None, "") and not _gleich_zahl(i.get("ECPartFact"), s.get("teilnahmefaktor")):
			abw.append(["tf_abweichend", f"Teilnahmefaktor NB {i['ECPartFact']} % ≠ Plattform {js_str(s.get('teilnahmefaktor'))} %", "TF-Historie prüfen; Wert des Netzbetreibers ist für die Zuteilung maßgeblich – Plattform korrigieren oder EC_PRTFACT_CHG senden."])
		if i.get("ConsentId") and s.get("consentId") and i["ConsentId"] != s["consentId"]:
			abw.append(["consent_abweichend", f"Consent-ID NB {i['ConsentId']} ≠ Plattform {s['consentId']}", "Consent-ID des Netzbetreibers übernehmen (Korrektur mit Begründung)."])
		if i.get("ConsentId") and not s.get("consentId"):
			abw.append(["consent_fehlt", f"Consent-ID {i['ConsentId']} fehlt in der Plattform", "Consent-ID übernehmen (z. B. nach Wechsel vom Altdienstleister)."])
		if not abw:
			aus.append({"zaehlpunktnummer": s["zaehlpunktnummer"], "teilnahmeId": s.get("teilnahmeId"), "art": "ok", "text": "Übereinstimmung", "empfehlung": "", "soll": s, "ist": i})
		for art, text, empf in abw:
			aus.append({"zaehlpunktnummer": s["zaehlpunktnummer"], "teilnahmeId": s.get("teilnahmeId"), "art": art, "text": text, "empfehlung": empf, "soll": s, "ist": i})
	for i in ist:
		k = f"{i['MeteringPoint']}|{i.get('EnergyDirection')}"
		s = soll_map.get(k)
		if s and noch_zugeordnet(s):
			continue
		aus.append({
			"zaehlpunktnummer": i["MeteringPoint"],
			"teilnahmeId": (s or {}).get("teilnahmeId") or "",
			"art": "fehlt_bei_uns",
			"text": f"Beim Netzbetreiber aktiv, in der Plattform „{s['status']}“" if s else "Beim Netzbetreiber zugeordnet, in der Plattform unbekannt",
			"empfehlung": "Teilnahme-Status per dokumentierter Korrektur angleichen (Begründung: EC_PODLIST)." if s else "Zählpunkt und Teilnahme anlegen (Wechsel-Import) oder Abmeldung prüfen.",
			"soll": s,
			"ist": i,
		})
	rang = {"fehlt_beim_nb": 0, "fehlt_bei_uns": 1, "tf_abweichend": 2, "consent_abweichend": 3, "consent_fehlt": 4, "ok": 9}
	aus.sort(key=lambda z: (rang[z["art"]], z["zaehlpunktnummer"]))
	return aus


BEFUND_ARTEN = {
	"datenluecke": {"label": "Fehlende Energiedaten (CR_MSG)", "quelle": "HA II 13 (tägliche Bereitstellung je Zählpunkt)"},
	"l3_anteil": {"label": "Nicht belastbare Werte (L3)", "quelle": "HA II 2.3.1, 13.1 (L3 nicht abrechenbar, Ersatz binnen 60 bzw. 15 Tagen)"},
	"keine_antwort": {"label": "Keine Antwort auf EDA-Prozess", "quelle": "ebUtilities-Prozessbeschreibung (Antwortpflicht)"},
	"aktivierung_verzoegert": {"label": "Aktivierung verzögert (Smart Meter)", "quelle": "HA II 5.1.1 (Einbau bis zu 2 Monate, zu bestätigen)"},
	"zuordnung_abweichend": {"label": "Abweichende Zuordnung (Zählpunktliste)", "quelle": "HA II 5.5 (EC_PODLIST)"},
	"nachforderung_offen": {"label": "Nachforderung nicht erfüllt (CR_REQ_PT)", "quelle": "Fachkonzept 2.5"},
}


def reklamation_befunde(luecken=None, prozesse=None, podlist=None, qualitaet=None, heute=None):
	b = []
	for lu in luecken or []:
		for z in zeitraeume(lu["fehlend"]):
			n = tage_zwischen(z["von"], z["bis"]) + 1
			text = f"Keine Daten für {_datum_de(z['von'])}" if z["von"] == z["bis"] else f"Keine Daten vom {_datum_de(z['von'])} bis {_datum_de(z['bis'])} ({n} Tage)"
			b.append({"art": "datenluecke", "zaehlpunktnummer": lu["zaehlpunktnummer"], "text": text, "seit": z["von"], "umfang": n})
	for q in qualitaet or []:
		if (q.get("anteilL3") or 0) > 0:
			pct = js_str(js_round(q["anteilL3"] * 1000) / 10)
			zusatz = f" (ältester {_datum_de(q['aeltesterL3'])}, Ersatz fällig {_datum_de(plus_tage(q['aeltesterL3'], EDA_FRISTEN['l3ErsatzTage']))})" if q.get("aeltesterL3") else ""
			b.append({"art": "l3_anteil", "zaehlpunktnummer": q.get("zaehlpunktnummer"), "text": f"{pct} % L3-Werte im {q.get('monat')}{zusatz}", "seit": q.get("aeltesterL3") or "", "umfang": q["anteilL3"]})
	for p in prozesse or []:
		g = str(p.get("gesendetAm") or "")[:10]
		if p.get("status") == "gesendet" and p.get("gesendetAm") and tage_zwischen(g, heute) >= EDA_FRISTEN["antwortTage"]:
			b.append({"art": "keine_antwort", "zaehlpunktnummer": p.get("zaehlpunktnummer"), "text": f"{p['prozesscode']} vom {_datum_de(p['gesendetAm'])} (Conversation {p.get('conversationId')}) ohne Antwort", "seit": g, "umfang": p.get("versuche") or 1})
		if p.get("status") == "zeitueberschreitung" and not p.get("nachfolgerId") and p.get("prozesscode") != "REKLAMATION" and p.get("responsecode") not in ("173",):
			b.append({"art": "keine_antwort", "zaehlpunktnummer": p.get("zaehlpunktnummer"), "text": f"{p['prozesscode']} (Conversation {p.get('conversationId')}) nach {p.get('versuche') or 1} Versuchen ohne Antwort", "seit": g, "umfang": p.get("versuche") or 1})
		if p.get("technikSeit") and p.get("status") == "bestaetigt" and tage_zwischen(p["technikSeit"], heute) >= EDA_FRISTEN["technikHinweisTage"]:
			rc = f"; Responsecode {p['responsecode']} {responsecode_info(p['responsecode'])['text']}" if p.get("responsecode") else ""
			b.append({"art": "aktivierung_verzoegert", "zaehlpunktnummer": p.get("zaehlpunktnummer"), "text": f"Zustimmung liegt vor, Aktivierung offen seit {_datum_de(p['technikSeit'])} ({tage_zwischen(p['technikSeit'], heute)} Tage){rc}", "seit": p["technikSeit"], "umfang": tage_zwischen(p["technikSeit"], heute)})
		if p.get("prozesscode") == "CR_REQ_PT" and p.get("status") == "bestaetigt" and p.get("bestaetigtAm") and tage_zwischen(str(p["bestaetigtAm"])[:10], heute) >= EDA_FRISTEN["nachforderungTage"]:
			par = p.get("parameter") or {}
			b.append({"art": "nachforderung_offen", "zaehlpunktnummer": p.get("zaehlpunktnummer"), "text": f"Nachforderung {_datum_de(par.get('von'))}–{_datum_de(par.get('bis'))} am {_datum_de(p['bestaetigtAm'])} angenommen, Daten fehlen", "seit": str(p["bestaetigtAm"])[:10], "umfang": 1})
	for z in podlist or []:
		if z.get("art") not in ("ok", "consent_fehlt"):
			b.append({"art": "zuordnung_abweichend", "zaehlpunktnummer": z.get("zaehlpunktnummer"), "text": z.get("text"), "seit": "", "umfang": 1})
	return b


def _csv(v):
	s = js_str(v)
	f = "'" + s if s and s[0] in "=+-@" else s
	return '"' + f.replace('"', '""') + '"' if (";" in f or '"' in f or "\n" in f) else f


def reklamation_vorlage(gemeinschaft, netzbetreiber=None, befunde=None, heute=None, absender="ÖkoInvest GmbH als Organisator (ElWG § 68 Abs. 2)"):
	befunde = befunde or []
	nb = netzbetreiber or {}
	antwort_bis = plus_tage(heute, EDA_FRISTEN["reklamationAntwortTage"])
	arten = []
	for x in befunde:
		if x["art"] not in arten:
			arten.append(x["art"])
	wort = "Befund" if len(befunde) == 1 else "Befunde"
	betreff = f"Energiegemeinschaft {gemeinschaft.get('gemeinschaftsId') or gemeinschaft.get('name')}: Reklamation Datenqualität ({len(befunde)} {wort})"
	zeilen = [
		f"An: {nb.get('name') or 'Netzbetreiber'}" + (f" <{nb['kontaktEmail']}>" if nb.get("kontaktEmail") else ""),
		"",
		"Sehr geehrte Damen und Herren,",
		"",
		f"für die Energiegemeinschaft „{gemeinschaft.get('name')}“ (Gemeinschafts-ID {gemeinschaft.get('gemeinschaftsId') or '–'}, Marktpartner-ID {gemeinschaft.get('marktpartnerId') or '–'}) stellen wir folgende Abweichungen in der Marktkommunikation fest:",
		"",
		*[f"{i + 1}. {x.get('zaehlpunktnummer') or 'Gemeinschaft'}: {x['text']}" for i, x in enumerate(befunde)],
		"",
		"Grundlage:",
		*[f"• {(BEFUND_ARTEN.get(a) or {}).get('label') or a}: {(BEFUND_ARTEN.get(a) or {}).get('quelle') or ''}" for a in arten],
		"",
		f"Wir bitten um Behebung bzw. Nachlieferung über EDA und um eine kurze Rückmeldung bis {_datum_de(antwort_bis)}. Für die Abrechnung der Gemeinschaft sind ausschließlich die von Ihnen gelieferten Werte maßgeblich (ElWG § 71 Abs. 1 und 4); fehlende oder nicht belastbare Werte verzögern die Abrechnung aller Mitglieder.",
		"",
		"Die Befundliste liegt als CSV bei. Diese Reklamation wird mit Datum und Inhalt protokolliert.",
		"",
		"Mit freundlichen Grüßen",
		absender,
	]
	kopf = "nr;art;zaehlpunkt;befund;seit;umfang"
	zeilen_csv = [kopf] + [";".join(_csv(v) for v in [i + 1, (BEFUND_ARTEN.get(x["art"]) or {}).get("label") or x["art"], x.get("zaehlpunktnummer"), x["text"], x.get("seit"), x.get("umfang")]) for i, x in enumerate(befunde)]
	return {"betreff": betreff, "text": "\n".join(zeilen), "antwortBis": antwort_bis, "csv": "\n".join(zeilen_csv) + "\n"}


def reklamation_akte(prozess, nachrichten=None):
	e = prozess.get("ergebnis") or {}
	z = [
		f"Beschwerdeakte {prozess.get('id')} – {e.get('netzbetreiberName') or prozess.get('netzbetreiberId')}",
		f"Gemeinschaft: {e.get('gemeinschaftName') or prozess.get('gemeinschaftId')}",
		f"Status: {prozess.get('status')}" + (f" · Antwortfrist {_datum_de(prozess['fristBis'])}" if prozess.get("fristBis") else ""),
		"",
		"Verlauf:",
		*[f"{str(v.get('am'))[:16].replace('T', ' ')} UTC · {v.get('nach')}" + (f" · {v['nachricht']}" if v.get("nachricht") else "") + f" · {v.get('text')}" for v in prozess.get("verlauf") or []],
		"",
		"Schriftverkehr (mit SHA-256 der Rohinhalte):",
		*[f"{str(n.get('zeitpunkt'))[:16].replace('T', ' ')} UTC · {'an NB' if n.get('richtung') == 'aus' else 'vom NB'} · {n.get('nachrichtencode')} · {n.get('sha256')}" for n in nachrichten or []],
	]
	return "\n".join(z) + "\n"


# ================================================================ simulator.js

SIMULATOR_ANNAHMEN = {"zustimmung": 0.72, "ablehnungKunde": 0.1, "tfAnnahme": 0.95, "nachforderungAnnahme": 0.9, "podlistAbweichung": 0.5, "lieferluecke": 0.04}
M32 = 0xFFFFFFFF


def seed_von(text):
	h = 0x811C9DC5
	b = js_str(text).encode("utf-16-le")
	for i in range(0, len(b), 2):
		c = b[i] | (b[i + 1] << 8)
		h = (h ^ c) & M32
		h = (h * 0x01000193) & M32
	return h


def zufall(seed):
	st = {"a": seed_von(seed)}

	def r():
		st["a"] = (st["a"] + 0x6D2B79F5) & M32
		t = st["a"]
		t = ((t ^ (t >> 15)) * (t | 1)) & M32
		m = ((t ^ (t >> 7)) * (t | 61)) & M32
		t = (t ^ ((t + m) & M32)) & M32
		return ((t ^ (t >> 14)) & M32) / 4294967296

	return r


def _r3(x):
	return math.floor(x * 1000 + 0.5) / 1000


def _hex(r, n):
	return "".join("0123456789ABCDEF"[math.floor(r() * 16)] for _ in range(n))


def simulator_antworten(n, nb=None, seed="", heute=None):
	nb = nb or {}
	kopf = n.get("kopf") or {}
	r = zufall(f"{seed}|{kopf.get('messageId')}")
	pc = kopf.get("prozesscode")
	d = n.get("daten") or {}
	zp = d.get("MeteringPoint") or ""
	info = (nb.get("zaehlpunkte") or {}).get(zp) or {}
	aus = []

	def a(nach, code, daten):
		aus.append({"nachTagen": nach, "code": code, "prozesscode": pc, "daten": daten})

	if pc in ("EC_REQ_ONL", "EC_REQ_OFF"):
		basis = {"MeteringPoint": zp, "CMRequestId": d.get("CMRequestId")}
		if info.get("bekannt") is False:
			a(0.01, "ABLEHNUNG_ECON", {**basis, "ResponseCode": "56"})
			return aus
		if nb.get("gemeinschaftsIds") is not None and d.get("ECID") not in nb["gemeinschaftsIds"]:
			a(0.01, "ABLEHNUNG_ECON", {**basis, "ResponseCode": "181"})
			return aus
		if (info.get("fremdAnzahl") or 0) >= 5:
			a(0.01, "ABLEHNUNG_ECON", {**basis, "ResponseCode": "185"})
			return aus
		if (info.get("fremdTf") or 0) + _num(d.get("ECPartFact")) > 100:
			a(0.01, "ABLEHNUNG_ECON", {**basis, "ResponseCode": "183"})
			return aus
		a(0.01, "ANTWORT_ECON", {**basis, "ResponseCode": "99"})
		u = r()
		if u < SIMULATOR_ANNAHMEN["zustimmung"]:
			tz = 1 + math.floor(r() * 14)
			consent = f"SIM{_hex(r, 12)}"
			a(tz, "ZUSTIMMUNG_ECON", {**basis, "ResponseCode": "175", "ConsentId": consent})
			if info.get("smartMeter") == "nein":
				a(tz + 0.5, "ANTWORT_ECON", {**basis, "ResponseCode": "182"})
				t_abschluss = tz + 35 + math.floor(r() * 25)
			else:
				t_abschluss = tz + 1 + math.floor(r() * 2)
			a(t_abschluss, "ABSCHLUSS_ECON", {"MeteringPoint": zp, "ECID": d.get("ECID"), "ConsentId": consent, "DateActivate": plus_tage(heute, math.ceil(t_abschluss)), "ECPartFact": d.get("ECPartFact"), "EnergyDirection": d.get("EnergyDirection")})
		elif u < SIMULATOR_ANNAHMEN["zustimmung"] + SIMULATOR_ANNAHMEN["ablehnungKunde"]:
			a(1 + math.floor(r() * 10), "ABLEHNUNG_ECON", {**basis, "ResponseCode": "172"})
		else:
			a(30, "ABLEHNUNG_ECON", {**basis, "ResponseCode": "173"})
		return aus
	if pc in ("EC_PRTFACT_CHG", "EC_PRT_CHANGE"):
		if r() < SIMULATOR_ANNAHMEN["tfAnnahme"]:
			a(0.01, "ANTWORT_CPF", {"MeteringPoint": zp, "ResponseCode": "99", "DateFrom": d.get("DateFrom")})
		else:
			a(0.01, "ABLEHNUNG_CPF", {"MeteringPoint": zp, "ResponseCode": "86"})
		return aus
	if pc == "CM_REV_SP":
		a(0.01, "ANTWORT_CCMS", {"MeteringPoint": zp, "ResponseCode": "99", "ConsentEnd": d.get("ConsentEnd")})
		return aus
	if pc == "CR_REQ_PT":
		if r() < SIMULATOR_ANNAHMEN["nachforderungAnnahme"]:
			a(0.01, "ANTWORT_PT", {"MeteringPoint": zp, "ResponseCode": "99"})
			von = str(d.get("DateTimeFrom"))[:10]
			bis = str(d.get("DateTimeTo"))[:10]
			t = von
			i = 0
			while i < 7 and t <= bis:
				a(0.5, "DATEN_CRMSG", {"MeteringPoint": zp, "ECID": d.get("ECID"), "tag": t})
				i += 1
				t = plus_tage(t, 1)
		else:
			a(0.01, "ABLEHNUNG_PT", {"MeteringPoint": zp, "ResponseCode": "94"})
		return aus
	if pc == "EC_PODLIST":
		liste = [dict(x) for x in nb.get("liste") or []]
		if liste and r() < SIMULATOR_ANNAHMEN["podlistAbweichung"]:
			i = math.floor(r() * len(liste))
			tf = _num(liste[i].get("ECPartFact") or 100)
			liste[i]["ECPartFact"] = js_str(tf - 10 if tf > 50 else tf + 10)
		a(0.01, "SENDEN_ECP", {"ECID": d.get("ECID"), "ECDisModel": nb.get("modell") or "DYNAMIC", "MPListData": liste})
		return aus
	return aus


def simulator_liefert_tag(zaehlpunktnummer, tag, seed):
	return zufall(f"{seed}|liefer|{zaehlpunktnummer}|{tag}")() >= SIMULATOR_ANNAHMEN["lieferluecke"]


def simulator_energiedaten(zaehlpunktnummer, tag, richtung, teilnahmefaktor=100, kwp=10, jahresverbrauchKwh=3500, seed=""):
	r = zufall(f"{seed}|daten|{zaehlpunktnummer}|{tag}")
	anzahl = qh_anzahl(tag)
	start = tag_beginn_utc(tag)
	start_ms = ms_von(start)
	monat = int(tag[5:7])
	saison = 0.35 + 0.65 * math.sin((math.pi * (monat - 0.5)) / 12)
	tageslaenge = 8.5 + 7 * math.sin((math.pi * (monat - 0.5)) / 12)
	wolken = 0.3 + 0.7 * r()
	tf = _num(teilnahmefaktor) / 100
	q_l2 = math.floor(r() * anzahl) if r() < 0.05 else -1
	q_l3 = math.floor(r() * anzahl) if r() < 0.02 else -1
	reihen = {g: [] for g in GROESSEN_JE_RICHTUNG[richtung]}
	qualitaet = []
	for i in range(anzahl):
		ms = start_ms + i * 9e5
		off = wien_offset_minuten(ms)
		d = datetime.fromtimestamp((ms + off * 60000) / 1000, tz=timezone.utc)
		h = d.hour + d.minute / 60 + 0.125
		mittag = 12.1 + (1 if off == 120 else 0)
		x = (h - (mittag - tageslaenge / 2)) / tageslaenge
		pv = math.sin(math.pi * x) if 0 < x < 1 else 0
		verh = pv * 2.2 * wolken * saison
		if q_l3 >= 0 and q_l3 <= i < q_l3 + 4:
			q = "L3"
		elif q_l2 >= 0 and q_l2 <= i < q_l2 + 8:
			q = "L2"
		else:
			q = "L1"
		qualitaet.append(q)
		if richtung == "erzeugung":
			e = _r3(kwp * 0.25 * pv * saison * wolken * (0.92 + 0.08 * r()))
			etf = _r3(e * tf)
			reihen["erzeugung_gemessen"].append(e)
			reihen["erzeugung_tf"].append(etf)
			reihen["restueberschuss"].append(_r3(etf * (1 - 1 / verh) if verh > 1 else 0))
		else:
			profil = 0.55 + 0.7 * math.exp(-((h - 7.5) ** 2) / 2) + 1.0 * math.exp(-((h - 19) ** 2) / 4) + 0.25 * math.exp(-((h - 12.5) ** 2) / 3)
			v = _r3(((jahresverbrauchKwh / 365) * profil * (0.85 + 0.3 * r())) / 96 / 1.05)
			vtf = _r3(v * tf)
			anteil = _r3(vtf * verh)
			reihen["verbrauch_gemessen"].append(v)
			reihen["verbrauch_tf"].append(vtf)
			reihen["anteil_erzeugung"].append(anteil)
			reihen["eigendeckung"].append(anteil if anteil < vtf else vtf)
	return {"start": start, "ende": tag_beginn_utc(plus_tage(tag, 1)), "reihen": [{"meterCode": GROESSE_METER_CODE[g], "werte": w, "qualitaet": list(qualitaet)} for g, w in reihen.items()]}
