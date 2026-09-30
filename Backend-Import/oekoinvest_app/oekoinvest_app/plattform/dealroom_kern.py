# Copyright (c) 2026, ÖkoInvest GmbH
#
# Deal-Room: Stammlisten und gemeinsame Regeln (Spiegel von src/lib/plattform/dealroom.js) sowie
# Rechte-/Anonymitäts-Helfer für api/qa.py, api/bieter.py, api/dealroom.py.
#
# Umgehungsschutz: Anbieter und Investoren sehen sich gegenseitig nicht, bis das Backoffice den Kontakt
# je Interesse freigibt (Plattform Kontaktfreigabe). Investoren erscheinen beim Anbieter als Pseudonym
# („Investor A“), der Anbieter beim Investor als „Anbieter“. Freitexte werden von Kontaktangaben bereinigt.

import re
from zoneinfo import ZoneInfo

import frappe
from frappe.utils import get_datetime, get_system_timezone, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, ist_admin, kurz, name_von, nicht_angemeldet, nicht_gefunden, verboten
from oekoinvest_app.plattform.prozesse import DATENRAUM_STATUS

# ---------------------------------------------------------------- Stammlisten (wie dealroom.js)

QA_KATEGORIEN = {"technisch": "Technisch", "rechtlich": "Rechtlich", "kaufmaennisch": "Kaufmännisch", "netz": "Netz"}
FRAGE_STATUS = {
	"eingereicht": "In Moderation",
	"freigegeben": "Offen beim Anbieter",
	"beantwortet": "Antwort in Prüfung",
	"veroeffentlicht": "Beantwortet",
	"abgelehnt": "Nicht zugelassen",
}
QA_FRIST_STANDARD, QA_FRIST_MIN, QA_FRIST_MAX = 5, 1, 30

DATENRAUM_ORDNER = [
	("flaeche", "01", "Fläche & Sicherung"),
	("planung", "02", "Planung & Genehmigung"),
	("netz", "03", "Netz"),
	("technik", "04", "Technik"),
	("ertrag", "05", "Ertrag"),
	("vertraege", "06", "Verträge"),
	("finanzen", "07", "Finanzen"),
	("allgemein", "00", "Allgemein"),
]
DATENRAUM_ORDNER_IDS = [o[0] for o in DATENRAUM_ORDNER]
ORDNER_TEXT = {
	"flaeche": "Lageplan, Grundbuch, Pacht- und Nutzungsverträge",
	"planung": "Aufstellungs-/Satzungsbeschluss, Widmung, Baugenehmigung, Gutachten",
	"netz": "Netzanfrage, Netzanschlusszusage, Reservierung, Trassenplanung",
	"technik": "Anlagenlayout, Komponenten, Betriebsdaten, Wartung",
	"ertrag": "Ertragsgutachten (P50/P90), Verschattung, Messdaten",
	"vertraege": "EEG-/EAG-Zuschlag, PPA, Direktvermarktung, Dienstleister",
	"finanzen": "Finanzmodell, Kostenschätzung, Steuern, Förderungen",
	"allgemein": "Exposé, Steckbrief, Sonstiges",
}
ORDNER_FUER_CHECKLISTE = {
	"pacht": "flaeche",
	"lageplan": "flaeche",
	"netzzusage": "netz",
	"aufstellung": "planung",
	"gutachten": "planung",
	"satzung": "planung",
	"baugenehmigung": "planung",
	"ertrag": "ertrag",
	"eeg": "vertraege",
	"betrieb": "technik",
}
STUFE2_STATUS = ("loi_abgegeben", "loi_angenommen", "abgeschlossen")

RUNDEN_ARTEN = {"indikativ": "Indikative Angebote", "verbindlich": "Verbindliche Angebote"}
GEBOT_PFLICHT = {"bedingungen": "Bedingungen / Vorbehalte", "finanzierung": "Finanzierungsnachweis", "zeitplan": "Zeitplan bis Signing/Closing"}
ERINNERUNG_STUNDEN = 48

PIPELINE_SPALTEN = ["beobachten", "nda", "datenraum", "angebot", "verhandlung", "gewonnen", "verloren"]
AKTIVE_SPALTEN = ["beobachten", "nda", "datenraum", "angebot", "verhandlung"]
NOTIZ_TAGS_MAX = 8
SUCHPROFILE_MAX = 8

MAIL_DEAL = "Im Deal-Room eines Projekts gibt es Neuigkeiten. Details finden Sie im Portal."


def deal_link(projekt_id, tab=""):
	return f"/portal/dealroom/{projekt_id}" + (f"?tab={tab}" if tab else "")


def ordner_vorschlag(name, checkliste=""):
	if checkliste in ORDNER_FUER_CHECKLISTE:
		return ORDNER_FUER_CHECKLISTE[checkliste]
	n = str(name or "").lower()
	regeln = [
		(r"netz|einspeis|umspann", "netz"),
		(r"ertrag|p50|p90|yield", "ertrag"),
		(r"finanz|kosten|capex|modell|steuer", "finanzen"),
		(r"vertrag|ppa|eeg|eag|zuschlag|direktvermarkt", "vertraege"),
		(r"beschluss|satzung|genehmig|bewilligung|widmung|gutacht|b-plan|bebauungsplan", "planung"),
		(r"lageplan|grundbuch|flur|pacht|nutzungsvertr", "flaeche"),
		(r"layout|modul|wechselricht|technik|betrieb|wartung", "technik"),
	]
	for muster, ordner in regeln:
		if re.search(muster, n):
			return ordner
	return "allgemein"


def investor_stufe(status, verbindlich=False):
	if status not in DATENRAUM_STATUS:
		return 0
	return 2 if status in STUFE2_STATUS or verbindlich else 1


def wasserzeichen_name(name, vorname, nachname):
	s = str(name or "dokument.pdf")
	punkt = s.rfind(".")
	basis = (s[:punkt] if punkt > 0 else s).strip()
	endung = s[punkt:] if punkt > 0 else ""
	wer = re.sub(r"\s*\(demo\)\s*", " Demo", " ".join(x for x in (vorname, nachname) if x), flags=re.I).strip() or "Empfaenger"
	sauber = lambda x: re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|]+', "_", x)).strip()  # noqa: E731
	return f"{sauber(basis)} - vertraulich fuer {sauber(wer)} {nowdate()}{endung}"[:180]


_MUSTER = [
	re.compile(r"[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,120}\.[A-Z]{2,24}", re.I),
	re.compile(r"\b(?:https?://|www\.)\S+", re.I),
	re.compile(r"(?:\+|00)\d[\d ()/.-]{6,20}\d"),
	re.compile(r"\b0\d{2,5}(?:[ /.-]?\d){4,14}\b"),
]


def anonymisieren(text):
	"""Kontaktangaben (E-Mail, Links, Rufnummern) entfernen. Liefert (text, bereinigt)."""
	t = str(text or "")
	bereinigt = False
	for m in _MUSTER:
		t, anzahl = m.subn("[Kontaktangabe entfernt]", t)
		bereinigt = bereinigt or anzahl > 0
	return t, bereinigt


def pseudonym_buchstabe(i):
	n = max(0, int(i))
	s = ""
	while True:
		s = chr(65 + n % 26) + s
		n = n // 26 - 1
		if n < 0:
			return s


def gebot_gesamt(modus, preis, pro_kwp, mwp):
	if modus == "proKwp":
		return round(float(pro_kwp) * float(mwp) * 1000) if pro_kwp and mwp else None
	return float(preis) if preis else None


def gebot_pro_kwp(modus, preis, pro_kwp, mwp):
	if modus == "proKwp":
		return float(pro_kwp) if pro_kwp else None
	return round(float(preis) / (float(mwp) * 1000)) if preis and mwp else None


def pipeline_spalte(status, gebot_abgegeben=False, zuschlag=False):
	if status == "abgeschlossen":
		return "gewonnen"
	if status == "abgelehnt":
		return "verloren"
	if status == "loi_angenommen" or zuschlag:
		return "verhandlung"
	if status == "loi_abgegeben" or gebot_abgegeben:
		return "angebot"
	if status == "nda_freigegeben":
		return "datenraum"
	if status == "nda_angefragt":
		return "nda"
	return "beobachten"


# ---------------------------------------------------------------- Zeit


def aus_iso(wert):
	"""ISO 8601 (auch mit Z) → naive Datetime in Systemzeitzone oder None."""
	s = v.text(wert, 40)
	if not s:
		return None
	try:
		dt = get_datetime(s.replace("Z", "+00:00"))
	except Exception:
		return None
	if dt.tzinfo is not None:
		dt = dt.astimezone(ZoneInfo(get_system_timezone() or "UTC")).replace(tzinfo=None)
	return dt


def frist_pruefen(wert):
	dt = aus_iso(wert)
	v.pflicht(dt is not None, "Bitte geben Sie eine gültige Frist an.")
	jetzt = now_datetime()
	v.pflicht((dt - jetzt).total_seconds() > 5 * 60, "Die Frist muss in der Zukunft liegen.")
	v.pflicht((dt - jetzt).days < 180, "Die Frist darf höchstens 180 Tage in der Zukunft liegen.")
	return dt


# ---------------------------------------------------------------- Rollen & Anonymität


def projekt_laden(projekt_id):
	k = v.kennung(projekt_id)
	if not k or not frappe.db.exists("Plattform Projekt", k):
		nicht_gefunden("Projekt nicht gefunden.")
	return frappe.get_doc("Plattform Projekt", k)


def interesse_von(projekt_id, investor_id):
	name = frappe.db.get_value("Plattform Interesse", {"projekt_id": projekt_id, "investor_id": investor_id}, "name")
	return frappe.get_doc("Plattform Interesse", name) if name else None


def rolle_im(n, p, investor_fehler=True):
	"""(rolle, interesse) – admin | anbieter | investor (Datenraum frei); sonst 403."""
	if not n:
		nicht_angemeldet()
	if ist_admin(n):
		return "admin", None
	if p.anbieter_id == n.id:
		return "anbieter", None
	if "investor" in (n.get("rollen") or []):
		i = interesse_von(p.name, n.id)
		if i and i.status in DATENRAUM_STATUS:
			return "investor", i
		if not investor_fehler:
			return None, i
		verboten("Der Deal-Room öffnet sich nach Freigabe Ihrer NDA.")
	verboten()


def pseudonyme(projekt_id):
	"""interesse_id → „Investor A“ … in der Reihenfolge der NDA-Anfragen (stabil)."""
	zeilen = frappe.get_all("Plattform Interesse", filters={"projekt_id": projekt_id}, fields=["name", "status", "nda", "creation"])
	liste = []
	for z in zeilen:
		nda = aus_json(z.nda) or {}
		if nda or z.status != "gemerkt":
			liste.append((str(nda.get("am") or z.creation), z.name))
	liste.sort()
	return {name: f"Investor {pseudonym_buchstabe(i)}" for i, (_, name) in enumerate(liste)}


def kontakt_frei(projekt_id, interesse_id):
	return bool(frappe.db.exists("Plattform Kontaktfreigabe", {"projekt_id": projekt_id, "interesse_id": interesse_id}))


def investor_anzeige(rolle, projekt_id, interesse_id, pseudo):
	name = pseudo.get(interesse_id) or "Investor"
	investor_id = frappe.db.get_value("Plattform Interesse", interesse_id, "investor_id") if interesse_id else None
	if not investor_id:
		return {"pseudonym": name}
	if rolle == "admin":
		return {"pseudonym": name, "investor": kurz(investor_id), "kontaktFrei": kontakt_frei(projekt_id, interesse_id)}
	if rolle == "anbieter" and kontakt_frei(projekt_id, interesse_id):
		k = kurz(investor_id) or {}
		return {"pseudonym": name, "name": name_von(investor_id), "firma": k.get("firma", ""), "kontaktFrei": True}
	return {"pseudonym": name}


def anbieter_anzeige(p, interesse):
	if interesse and kontakt_frei(p.name, interesse.name):
		k = kurz(p.anbieter_id) or {}
		return {"anonym": False, "name": name_von(p.anbieter_id), "firma": k.get("firma", "")}
	return {"anonym": True, "name": "Anbieter (anonym bis zur Kontaktfreigabe)"}


# ---------------------------------------------------------------- Freigabestufen (auch von api/dokument.py, api/boerse.py genutzt)


def verbindlich_zugelassen(projekt_id, interesse_id):
	for vf in frappe.get_all("Plattform Bieterverfahren", filters={"projekt_id": projekt_id, "status": ("!=", "abgebrochen")}, pluck="name"):
		for r in frappe.get_all("Plattform Bieterrunde", filters={"parent": vf, "parenttype": "Plattform Bieterverfahren", "art": "verbindlich"}, fields=["teilnehmer"]):
			if interesse_id in (aus_json(r.teilnehmer) or []):
				return True
	return False


def dokument_stufe(dokument_id):
	return 2 if str(frappe.db.get_value("Plattform Datenraum Eintrag", {"dokument_id": dokument_id}, "stufe") or "1") == "2" else 1


def stufe_ok(projekt_id, dokument_id, investor_id):
	"""Darf der Investor das Datenraum-Dokument nach Freigabestufe öffnen?"""
	i = frappe.db.get_value("Plattform Interesse", {"projekt_id": projekt_id, "investor_id": investor_id}, ["name", "status"], as_dict=True)
	if not i:
		return False
	stufe = investor_stufe(i.status, verbindlich_zugelassen(projekt_id, i.name))
	return stufe >= dokument_stufe(dokument_id)


def aufruf_zaehlen(projekt_id):
	"""Exposé-Aufruf je Tag zählen (Anbieter-Cockpit). Fehler dürfen den Aufruf nie stören."""
	try:
		tag = nowdate()
		name = frappe.db.get_value("Plattform Projektaufruf", {"projekt_id": projekt_id, "tag": tag}, "name")
		if name:
			frappe.db.sql("update `tabPlattform Projektaufruf` set anzahl = anzahl + 1 where name = %s", (name,))
		else:
			frappe.get_doc({"doctype": "Plattform Projektaufruf", "projekt_id": projekt_id, "tag": tag, "anzahl": 1}).insert(ignore_permissions=True)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Aufrufzähler", message=frappe.get_traceback())

