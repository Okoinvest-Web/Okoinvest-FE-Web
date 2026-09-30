# Copyright (c) 2026, ÖkoInvest GmbH
#
# Hilfsfunktionen für Druckformate, Briefkopf und E-Mail-Vorlagen (hooks.jinja „methods“).
# In Jinja unter ihrem Funktionsnamen verfügbar, z. B. {{ oekoinvest_eur(doc.kaufpreis) }}.
#
# Regeln:
#  - Funktionen, die WEITERE Datensätze laden, prüfen selbst frappe.has_permission (Druck prüft nur das Hauptdokument).
#  - Kontaktangaben (Telefon/E-Mail) sind noch nicht freigegeben: nur aus site_config, sonst None – nie erfinden.
#  - Öffentliche Ausgaben (Exposé-Teaser) nur über die Positivliste (oeffentlich.py).

import json
from datetime import date, datetime

import frappe
from frappe.utils import add_months, cint, flt, get_datetime, getdate, nowdate

from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN, PROJEKT_TYPEN, VORGANG_TYPEN
from oekoinvest_app.plattform.prozesse import status_label

# Text der Klick-NDA – identisch zu NDA in src/lib/plattform/konstanten.js der Website (Version NDA_VERSION).
# ENTWURF – Wortlaut vor dem Livegang juristisch prüfen lassen.
NDA_ABSAETZE = [
	"Ich verpflichte mich, alle Informationen und Unterlagen zu diesem Projekt, die mir über die Projektbörse von ÖkoInvest zugänglich gemacht werden, vertraulich zu behandeln und ausschließlich zur Prüfung eines möglichen Erwerbs bzw. einer Beteiligung zu verwenden.",
	"Eine Weitergabe an Dritte ist nur an Berater (Rechtsanwälte, Steuerberater, finanzierende Banken) zulässig, die ihrerseits zur Verschwiegenheit verpflichtet sind.",
	"Ich werde den Projektanbieter, Flächeneigentümer, Netzbetreiber oder die Standortgemeinde nicht ohne vorherige Abstimmung mit ÖkoInvest direkt kontaktieren (Umgehungsschutz).",
	"Die Verpflichtung gilt für zwei Jahre ab Annahme. Auf Verlangen lösche ich erhaltene Unterlagen.",
]

FIRMA = {
	"name": "ÖkoInvest GmbH",
	"strasse": "Gewerbegebiet 10",
	"ort": "5121 Ostermiething",
	"land": "Österreich",
	"fn": "FN 541505g",
	"gericht": "Landesgericht Ried im Innkreis",
	"gf": "Andreas Wegscheider, Manuel Thaler",
	"gruppe": "Teil der ÖKOVOLT Gruppe",
}

LABELS = {
	"vorgang_typ": VORGANG_TYPEN,
	"projekt_typ": PROJEKT_TYPEN,
	"land": LAENDER,
	"phase": {p["id"]: p["kurz"] for p in PHASEN},
	"netzanschluss": {"offen": "offen", "angefragt": "angefragt", "zusage": "Zusage liegt vor", "reserviert": "reserviert", "vorhanden": "vorhanden"},
	"nutzung": {"acker": "Acker", "gruenland": "Grünland", "konversion": "Konversionsfläche", "gewerbe": "Gewerbe", "sonstige": "Sonstige", "dach": "Dach"},
	"eigentum": {"eigentum": "Alleineigentum", "miteigentum": "Miteigentum", "verwaltung": "Verwaltung / Vollmacht"},
	"preis_modus": {"gesamt": "Gesamtpreis", "proKwp": "Preis je kWp", "anfrage": "auf Anfrage"},
}

VERTRAULICH_LABEL = {
	"gemeinde": "Gemeinde",
	"gemarkung": "Gemarkung",
	"flurstuecke": "Flurstücke",
	"netzbetreiber": "Netzbetreiber",
	"einspeisepunkt": "Einspeisepunkt",
	"entfernungNetzKm": "Entfernung Netzanschluss (km)",
	"sicherung": "Flächensicherung",
	"planungsrecht": "Planungsrecht",
	"ertragKwhKwp": "Spezifischer Ertrag (kWh/kWp)",
	"verguetung": "Vergütung / Vermarktung",
	"details": "Weitere Angaben",
}


def _anlagen_labels():
	try:
		from oekoinvest_app.plattform import anlagen_kern as ak

		return {
			"anlage_typ": ak.ANLAGE_TYPEN,
			"anlage_status": ak.ANLAGE_STATUS,
			"lastprofil": ak.LASTPROFILE,
			"komponente": ak.KOMPONENTEN_ARTEN,
			"messstelle": ak.MESSSTELLEN,
			"wartung_art": ak.WARTUNG_ARTEN,
			"wartung_status": ak.WARTUNG_STATUS,
			"schwere": {k: v[0] for k, v in ak.STOERUNG_SCHWERE.items()},
			"stoerung_status": ak.STOERUNG_STATUS,
			"regel": {k: v[0] for k, v in ak.STOERUNG_REGELN.items()},
			"messpunkt_art": {k: v[0] for k, v in ak.MESSPUNKT_ARTEN.items()},
		}
	except Exception:
		return {}


# ---------------------------------------------------------------- Formatierung


def oekoinvest_firma():
	"""Registerdaten für Briefkopf/Fußzeile; Kontakt nur aus site_config (sonst None)."""
	return {
		**FIRMA,
		"telefon": frappe.conf.get("oekoinvest_kontakt_telefon") or None,
		"email": frappe.conf.get("oekoinvest_kontakt_email") or None,
		"web": frappe.conf.get("oekoinvest_kontakt_web") or frappe.conf.get("plattform_basis_url") or None,
		"uid": frappe.conf.get("oekoinvest_uid") or None,
	}


def oekoinvest_json(wert, standard=None):
	if isinstance(wert, (dict, list)):
		return wert
	if not wert:
		return {} if standard is None else standard
	try:
		return json.loads(wert)
	except (TypeError, ValueError):
		return {} if standard is None else standard


def oekoinvest_datum(wert, mit_zeit=False):
	if not wert:
		return "–"
	try:
		if isinstance(wert, str) and wert.endswith("Z"):
			from zoneinfo import ZoneInfo

			dt = datetime.fromisoformat(wert.replace("Z", "+00:00")).astimezone(ZoneInfo("Europe/Vienna"))
		elif isinstance(wert, date) and not isinstance(wert, datetime) and not mit_zeit:
			return wert.strftime("%d.%m.%Y")
		else:
			dt = get_datetime(wert)
		return dt.strftime("%d.%m.%Y, %H:%M Uhr" if mit_zeit else "%d.%m.%Y")
	except Exception:
		return str(wert)


def _de(zahl_text):
	return zahl_text.replace(",", "X").replace(".", ",").replace("X", ".")


def oekoinvest_zahl(wert, stellen=0):
	if wert in (None, ""):
		return "–"
	return _de(f"{flt(wert):,.{cint(stellen)}f}")


def oekoinvest_eur(wert, stellen=0):
	if wert in (None, "") or not flt(wert):
		return "–"
	return f"{oekoinvest_zahl(wert, stellen)} €"


def oekoinvest_prozent(satz, stellen=1):
	"""Dezimalbruch (0.02) → „2,0 %“."""
	if satz in (None, ""):
		return "–"
	return f"{oekoinvest_zahl(flt(satz) * 100, stellen)} %"


def oekoinvest_status(art, status):
	return status_label(art, status)


def oekoinvest_label(gruppe, wert):
	if wert in (None, ""):
		return "–"
	tabelle = LABELS.get(gruppe) or _anlagen_labels().get(gruppe) or {}
	return tabelle.get(wert) or str(wert)


def oekoinvest_nda():
	from oekoinvest_app.plattform.konstanten import NDA_VERSION

	return {"version": NDA_VERSION, "titel": "Vertraulichkeitsvereinbarung (Klick-NDA)", "absaetze": NDA_ABSAETZE}


def oekoinvest_provision():
	from oekoinvest_app.plattform.konstanten import PROVISION_MAX, PROVISION_MIN, PROVISION_TEXT, PROVISION_VERSION

	return {"version": PROVISION_VERSION, "text": PROVISION_TEXT, "min": PROVISION_MIN, "max": PROVISION_MAX}


# ---------------------------------------------------------------- verknüpfte Datensätze (mit Rechteprüfung)


def _darf(doctype, name):
	return bool(name) and frappe.db.exists(doctype, name) and frappe.has_permission(doctype, "read", name)


def oekoinvest_konto(konto_id):
	"""Name/Firma eines Kontos für Vereinbarungen (nur mit Leserecht auf Plattform Konto)."""
	if not _darf("Plattform Konto", konto_id):
		return {"id": konto_id or "", "name": "–", "firma": "", "email": ""}
	k = frappe.db.get_value("Plattform Konto", konto_id, ["name", "vorname", "nachname", "firma", "email"], as_dict=True)
	return {"id": k.name, "name": " ".join(x for x in (k.vorname, k.nachname) if x) or "–", "firma": k.firma or "", "email": k.email or ""}


def oekoinvest_projekt(projekt_id):
	"""Öffentliche Eckdaten eines Projekts (Titel, Typ, Leistung, Region) – für NDA/LOI."""
	if not _darf("Plattform Projekt", projekt_id):
		return {"id": projekt_id or "", "titel": "–"}
	p = frappe.db.get_value("Plattform Projekt", projekt_id, ["name", "titel", "typ", "land", "bundesland", "region", "mwp", "phase"], as_dict=True)
	return {**p, "id": p.name}


def oekoinvest_oeffentlich(doc):
	"""Teaser-Felder nach Positivliste (oeffentlich.OEFFENTLICH) – nie vertrauliche Felder oder Anbieterdaten."""
	felder = {
		"titel": doc.get("titel"),
		"typ": doc.get("typ"),
		"land": doc.get("land"),
		"bundesland": doc.get("bundesland"),
		"region": doc.get("region"),
		"mwp": doc.get("mwp"),
		"mwhSpeicher": doc.get("mwh_speicher"),
		"flaecheHa": doc.get("flaeche_ha"),
		"phase": doc.get("phase"),
		"netzanschluss": doc.get("netzanschluss"),
		"codGeplant": doc.get("cod_geplant"),
		"preisModus": doc.get("preis_modus"),
		"preis": doc.get("preis"),
		"preisProKwp": doc.get("preis_pro_kwp"),
		"beschreibung": doc.get("beschreibung"),
		"highlights": oekoinvest_json(doc.get("highlights"), []),
		"veroeffentlichtAm": doc.get("veroeffentlicht_am"),
		"slug": doc.get("slug"),
		"id": doc.get("name"),
	}
	from oekoinvest_app.plattform.oeffentlich import OEFFENTLICH

	return {k: v for k, v in felder.items() if k in OEFFENTLICH}


def oekoinvest_vertraulich(doc):
	"""Vertrauliche Projektangaben als Liste (Label, Wert) – nur im vertraulichen Exposé."""
	from oekoinvest_app.plattform.oeffentlich import VERTRAULICH_FELDER

	v = oekoinvest_json(doc.get("vertraulich"))
	zeilen = []
	for k in VERTRAULICH_FELDER:
		wert = v.get(k) if isinstance(v, dict) else None
		if wert in (None, "", []):
			continue
		if isinstance(wert, list):
			wert = ", ".join(str(x.get("nr") if isinstance(x, dict) else x) for x in wert)
		elif isinstance(wert, dict):
			wert = ", ".join(f"{a}: {b}" for a, b in wert.items() if b not in (None, ""))
		zeilen.append({"label": VERTRAULICH_LABEL.get(k, k), "wert": str(wert)})
	return zeilen


def oekoinvest_anlage(anlage_id):
	"""Stammdaten einer Anlage mit Komponenten, Messpunkten, Vertrag, Wartungen und offenen Störungen."""
	if not _darf("Plattform Anlage", anlage_id):
		return {}
	kinder = {}
	for schluessel, dt, felder, sort in (
		("komponenten", "Plattform Anlagenkomponente", ["art", "hersteller", "modell", "seriennummer", "anzahl", "leistung_kw", "kapazitaet_kwh", "garantie_bis"], "art asc"),
		("messpunkte", "Plattform Messpunkt", ["bezeichnung", "zaehlernummer", "art", "messstelle", "abrechnungsrelevant", "smgw", "msb", "eichgueltig_bis"], "bezeichnung asc"),
		("wartungen", "Plattform Wartung", ["art", "datum", "status", "dienstleister", "naechste_faelligkeit"], "datum desc"),
		("vertraege", "Plattform Contracting Vertrag", ["nummer", "beginn", "laufzeit_jahre", "status", "strompreis_ct", "grundgebuehr_monat", "indexierung_pct", "kuendigungsfrist_monate"], "beginn desc"),
		("stoerungen", "Plattform Stoerungsfall", ["name", "titel", "schwere", "status", "erkannt_am"], "erkannt_am desc"),
	):
		if not frappe.has_permission(dt, "read"):
			kinder[schluessel] = []
			continue
		filters = {"anlage_id": anlage_id}
		if dt == "Plattform Stoerungsfall":
			filters["status"] = ("in", ["offen", "in_arbeit"])
		kinder[schluessel] = frappe.get_all(dt, filters=filters, fields=felder, order_by=sort, limit_page_length=50)
	return kinder


def oekoinvest_anlage_kurz(anlage_id):
	if not _darf("Plattform Anlage", anlage_id):
		return {"id": anlage_id or "", "titel": "–"}
	a = frappe.db.get_value("Plattform Anlage", anlage_id, ["name", "titel", "typ", "ort", "land", "kwp", "speicher_kwh"], as_dict=True)
	return {**a, "id": a.name}


# ---------------------------------------------------------------- Monatsbericht


def _monat_grenzen(monat):
	try:
		start = getdate(f"{monat}-01")
	except Exception:
		start = getdate(add_months(nowdate(), -1)).replace(day=1)
	return start, getdate(add_months(start, 1))


def _uebergaenge(parenttype, status, von, bis):
	return frappe.db.count(
		"Plattform Statusverlauf", {"parenttype": parenttype, "status": status, "am": ("between", [von, datetime.combine(bis, datetime.min.time())])}
	)


def _summe(doctype, feld, filters):
	zeilen = frappe.get_all(doctype, filters=filters, fields=[f"sum({feld}) as summe"])
	return flt(zeilen[0].summe) if zeilen else 0.0


def _zahlen(von, bis):
	bis_dt = datetime.combine(bis, datetime.min.time())
	zeitraum = ("between", [von, bis_dt])
	return [
		("Anfragen", "Neue Anfragen", frappe.db.count("Plattform Vorgang", {"creation": zeitraum})),
		("Anfragen", "Abgeschlossen", _uebergaenge("Plattform Vorgang", "abgeschlossen", von, bis)),
		("Flächen", "Eingereicht", _uebergaenge("Plattform Flaeche", "eingegangen", von, bis)),
		("Flächen", "Pachtangebote versendet", _uebergaenge("Plattform Flaeche", "pachtangebot", von, bis)),
		("Flächen", "Verträge", _uebergaenge("Plattform Flaeche", "vertrag", von, bis)),
		("Projektbörse", "Projekte eingereicht", _uebergaenge("Plattform Projekt", "pruefung", von, bis)),
		("Projektbörse", "Projekte veröffentlicht", _uebergaenge("Plattform Projekt", "veroeffentlicht", von, bis)),
		("Projektbörse", "NDA angefragt", _uebergaenge("Plattform Interesse", "nda_angefragt", von, bis)),
		("Projektbörse", "Datenräume freigegeben", _uebergaenge("Plattform Interesse", "nda_freigegeben", von, bis)),
		("Projektbörse", "LOI abgegeben", _uebergaenge("Plattform Interesse", "loi_abgegeben", von, bis)),
		("Projektbörse", "Verkäufe", _uebergaenge("Plattform Projekt", "verkauft", von, bis)),
		("Provisionen", "Neu (EUR)", _summe("Plattform Provision", "betrag", {"creation": zeitraum, "status": ("!=", "storniert")})),
		("Provisionen", "Bezahlt (Anzahl)", _uebergaenge("Plattform Provision", "bezahlt", von, bis)),
		("Betrieb", "Neue Störungen", frappe.db.count("Plattform Stoerungsfall", {"erkannt_am": zeitraum})),
		("Betrieb", "Behobene Störungen", frappe.db.count("Plattform Stoerungsfall", {"behoben_am": zeitraum})),
		("Backoffice", "Aufgaben erledigt", frappe.db.count("Plattform Aufgabe", {"erledigt_am": zeitraum})),
		("Konten", "Neue Konten", frappe.db.count("Plattform Konto", {"creation": zeitraum})),
	]


def oekoinvest_monatsbericht(monat=None):
	"""Kennzahlen des Monats (JJJJ-MM, Standard Vormonat) mit Vormonatsvergleich – ohne personenbezogene Daten."""
	if not frappe.has_permission("Plattform Monatsbericht", "print") and not frappe.has_permission("Plattform Monatsbericht", "read"):
		frappe.throw("Für den Monatsbericht fehlt Ihnen die Berechtigung.", frappe.PermissionError)
	start, ende = _monat_grenzen(monat or getdate(add_months(nowdate(), -1)).strftime("%Y-%m"))
	vstart, vende = _monat_grenzen(getdate(add_months(start, -1)).strftime("%Y-%m"))
	jetzt, vorher = _zahlen(start, ende), _zahlen(vstart, vende)
	zeilen = []
	for (bereich, kennzahl, wert), (_b, _k, alt) in zip(jetzt, vorher):
		zeilen.append({"bereich": bereich, "kennzahl": kennzahl, "wert": wert, "vormonat": alt, "delta": flt(wert) - flt(alt), "eur": "EUR" in kennzahl})
	offen = {
		"anfragen_offen": frappe.db.count("Plattform Vorgang", {"status": ("in", ["eingegangen", "in_pruefung", "qualifiziert", "angebot"])}),
		"projekte_boerse": frappe.db.count("Plattform Projekt", {"status": ("in", ["veroeffentlicht", "reserviert"])}),
		"stoerungen_offen": frappe.db.count("Plattform Stoerungsfall", {"status": ("in", ["offen", "in_arbeit"])}),
		"aufgaben_ueberfaellig": frappe.db.count("Plattform Aufgabe", {"status": "offen", "faellig_am": ("<", nowdate())}),
		"provision_offen_eur": _summe("Plattform Provision", "betrag", {"status": ("in", ["offen", "in_rechnung"])}),
	}
	return {"monat": start.strftime("%m/%Y"), "vormonat": vstart.strftime("%m/%Y"), "zeilen": zeilen, "stand": offen, "erstellt": oekoinvest_datum(datetime.now(), True)}
