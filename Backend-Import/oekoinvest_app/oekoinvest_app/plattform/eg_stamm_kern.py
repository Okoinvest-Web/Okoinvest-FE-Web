# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP1 „Kern-Stammdaten“ – reine Regeln (ohne Frappe), 1:1 aus src/lib/plattform/eg/
# {zaehlpunkt,stamm,mitglied,anlage,tarif,netzbetreiber,netzentgelt,rechte,status,migration}.js.
# Gemeinsame Testvektoren: src/lib/plattform/eg/testdaten/stamm/*.json (tests/test_eg_stamm_kern.py, scripts/plattform-test-eg-stamm.mjs).
# Datenmodell: eg_modell.py (erzeugt aus eg/modell.js). Vertrag: docs/EG-SCHNITTSTELLEN.md. KEINE Rechts- oder Steuerberatung.

import math
import re

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform.mitglied_kern import (
	MitgliedFehler, _js_round, auswahl, datum, fehler, ganz, iban as iban_pruefen, konflikt_fehler, mehrzeilig, plus_tage, text, wahr, zahl,
)

EgFehler = MitgliedFehler
EDA_PORTAL_GRENZE_ZP = 50
ANLAGE_STATUS = {"geplant": "Geplant", "aktiv": "In Betrieb", "stillgelegt": "Stillgelegt"}


def _num(v):
	"""JS Number(v) für Werte aus JSON: None → 0, '' → 0, ungültig → nan."""
	if v is None or v == "":
		return 0.0
	if isinstance(v, bool):
		return 1.0 if v else 0.0
	try:
		return float(v)
	except (TypeError, ValueError):
		return math.nan


def _n0(v):
	"""JS `Number(v) || 0`."""
	x = _num(v)
	return 0 if math.isnan(x) else x


def _num_oder_nan(v):
	"""JS Number(undefined) = NaN: fehlende Werte (None) hier als NaN."""
	return math.nan if v is None else _num(v)


def _de_zahl(x):
	"""JS Number.toLocaleString('de-DE') (max. 3 Nachkommastellen, Tausenderpunkt)."""
	r = _js_round(abs(x) * 1000) / 1000
	ganz_, _, nk = f"{r:.3f}".partition(".")
	nk = nk.rstrip("0")
	ganz_ = f"{int(ganz_):,}".replace(",", ".")
	return ("-" if x < 0 else "") + ganz_ + ("," + nk if nk else "")


def _g(d, *pfad):
	for p in pfad:
		d = d.get(p) if isinstance(d, dict) else None
	return d


# ================================================================ Kennungen (zaehlpunkt.js)

def kennung_normalisieren(v):
	return re.sub(r"\s|-|\.", "", ("" if v is None else str(v)).upper())


_ZP_AT = re.compile(r"^AT(\d{6})(\d{5})([0-9A-Z]{20})$")


def zaehlpunkt_pruefen(eingabe, netzbetreiber=None):
	netzbetreiber = netzbetreiber or []
	s = kennung_normalisieren(eingabe)
	leer = {"ok": False, "wert": s, "fehler": "", "nbNummer": "", "plz": "", "netzbetreiberId": "", "hinweise": []}
	if not s:
		return {**leer, "fehler": "Bitte geben Sie die Zählpunktnummer an."}
	if len(s) != 33:
		return {**leer, "fehler": f"Die Zählpunktnummer hat 33 Zeichen (derzeit {len(s)})."}
	if not s.startswith("AT"):
		return {**leer, "fehler": "Die Zählpunktnummer beginnt mit „AT“."}
	m = _ZP_AT.match(s)
	if not m:
		return {**leer, "fehler": "Aufbau: AT + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen (Ziffern und Großbuchstaben)."}
	nb_nummer, plz = m.group(1), m.group(2)
	hinweise = []
	if plz != "00000" and (plz[0] != "0" or int(plz[1:]) < 1000):
		hinweise.append(f"Die Postleitzahl im Zählpunkt ({plz}) ist für Österreich ungewöhnlich (erwartet 0 + vierstellige PLZ). Bitte mit der Netzrechnung vergleichen.")
	nb = next((x for x in netzbetreiber if x.get("nbNummer") and x["nbNummer"] == nb_nummer), None)
	if netzbetreiber and not nb:
		hinweise.append(f"Netzbetreibernummer {nb_nummer} ist in den Stammdaten nicht hinterlegt – bitte Netzbetreiber zuordnen.")
	return {"ok": True, "wert": s, "fehler": "", "nbNummer": nb_nummer, "plz": plz, "netzbetreiberId": (nb or {}).get("id", ""), "hinweise": hinweise}


def plz_aus_zaehlpunkt(zp):
	p = kennung_normalisieren(zp)[8:13]
	return p[1:] if re.match(r"^0\d{4}$", p) and p != "00000" else ""


_MP = re.compile(r"^(RC|CC|GC)(\d{6})$")


def marktpartner_id_pruefen(eingabe, modell):
	s = kennung_normalisieren(eingabe)
	if not s:
		return {"ok": True, "wert": "", "fehler": ""}
	soll = {"eeg": "RC", "beg": "CC", "gea": "GC"}.get(modell)
	if not soll:
		return {"ok": True, "wert": s, "fehler": ""} if re.match(r"^[A-Z]{2}\d{6}$", s) else {"ok": False, "wert": s, "fehler": "Marktpartner-ID: 2 Buchstaben + 6 Ziffern."}
	m = _MP.match(s)
	if not m or m.group(1) != soll:
		return {"ok": False, "wert": s, "fehler": f"Die Marktpartner-ID einer {modell.upper()} beginnt mit „{soll}“ und hat 6 Ziffern (z. B. {soll}100015)."}
	return {"ok": True, "wert": s, "fehler": "", "nummer": m.group(2)}


_GID_ORT = re.compile(r"^AT(\d{6})(\d{5})(RC|GC)(\d{6})([0-9A-Z]{12})$")
_GID_BEG = re.compile(r"^ATCC9999(DYNAM|STATI)CC(\d{6})([0-9A-Z]{12})$")


def gemeinschafts_id_pruefen(eingabe, modell=None, marktpartner_id="", verteilmodell=""):
	s = kennung_normalisieren(eingabe)
	r = {"ok": True, "wert": s, "fehler": "", "hinweise": [], "nbNummer": ""}
	if not s:
		return r
	if len(s) != 33:
		return {**r, "ok": False, "fehler": f"Die Gemeinschafts-ID hat 33 Zeichen (derzeit {len(s)})."}
	nummer = ""
	if modell == "beg":
		m = _GID_BEG.match(s)
		if not m:
			return {**r, "ok": False, "fehler": "Aufbau BEG: AT + CC9999 + DYNAM oder STATI + CC + 6 Ziffern + 12 Zeichen."}
		nummer = m.group(2)
		if verteilmodell and (m.group(1) == "DYNAM") != (verteilmodell == "dynamisch"):
			r["hinweise"].append("Verteilmodell der Gemeinschafts-ID (DYNAM/STATI) passt nicht zum gespeicherten Verteilmodell.")
	elif modell in ("eeg", "gea"):
		m = _GID_ORT.match(s)
		k = "RC" if modell == "eeg" else "GC"
		if not m or m.group(3) != k:
			return {**r, "ok": False, "fehler": f"Aufbau {modell.upper()}: AT + Netzbetreibernummer (6) + PLZ (5, auch 00000) + {k} + 6 Ziffern + 12 Zeichen."}
		nummer = m.group(4)
		r["nbNummer"] = m.group(1)
	elif not re.match(r"^AT[0-9A-Z]{31}$", s):
		return {**r, "ok": False, "fehler": "Die Gemeinschafts-ID beginnt mit „AT“ und enthält 31 weitere Ziffern bzw. Großbuchstaben."}
	mp = _MP.match(kennung_normalisieren(marktpartner_id)) if marktpartner_id else None
	if mp and nummer and mp.group(2) != nummer:
		r["hinweise"].append(f"Die Nummer in der Gemeinschafts-ID ({nummer}) weicht von der Marktpartner-ID ({mp.group(2)}) ab.")
	return r


# ================================================================ Netzbetreiber (netzbetreiber.js)

_KOORD = "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber/"
_NB = [
	{"id": "ENB-WIEN", "nbNummer": "001000", "nbNummerStatus": "zu_bestaetigen", "name": "Wiener Netze GmbH", "kurzname": "Wiener Netze", "bundesland": ["W"], "vertragsweg": "email", "kontaktEmail": "energiegemeinschaften@wienernetze.at", "portalUrl": "", "formularUrl": "", "besonderheiten": "Daten bzw. Vertrag per E-Mail.", "quelle": _KOORD},
	{"id": "ENB-NOE", "nbNummer": "002000", "nbNummerStatus": "zu_bestaetigen", "name": "Netz Niederösterreich GmbH", "kurzname": "Netz NÖ", "bundesland": ["N"], "vertragsweg": "email", "kontaktEmail": "", "portalUrl": "https://netz-noe.at/strom/energiegemeinschaften/eeg-erneuerbare-energie-gemeinschaft", "formularUrl": "", "besonderheiten": "Datenübermittlung per E-Mail nach Schritt-für-Schritt-Anleitung; eigene Seiten für EEG, BEG und GEA.", "quelle": "https://netz-noe.at/strom/energiegemeinschaften/eeg-erneuerbare-energie-gemeinschaft"},
	{"id": "ENB-OOE", "nbNummer": "003000", "nbNummerStatus": "zu_bestaetigen", "name": "Netz Oberösterreich GmbH", "kurzname": "Netz OÖ", "bundesland": ["O"], "vertragsweg": "formular", "kontaktEmail": "", "portalUrl": "", "formularUrl": "", "besonderheiten": "Online-Formular „Anmeldung Ihrer Energiegemeinschaft beim Netzbetreiber“.", "quelle": _KOORD},
	{"id": "ENB-LINZ", "nbNummer": "", "nbNummerStatus": "offen", "name": "LINZ NETZ GmbH", "kurzname": "LINZ NETZ", "bundesland": ["O"], "vertragsweg": "formular", "kontaktEmail": "", "portalUrl": "https://www.linznetz.at/portal/de/home/strom/mein_stromanschluss/erzeugungsanlage_anschliessen/energiegemeinschaften/umsetzung", "formularUrl": "", "besonderheiten": "Eigene Seite zur Umsetzung von Energiegemeinschaften.", "quelle": "https://www.linznetz.at/portal/de/home/strom/mein_stromanschluss/erzeugungsanlage_anschliessen/energiegemeinschaften/umsetzung"},
	{"id": "ENB-BGLD", "nbNummer": "", "nbNummerStatus": "offen", "name": "Netz Burgenland GmbH", "kurzname": "Netz Burgenland", "bundesland": ["B"], "vertragsweg": "email", "kontaktEmail": "info.energiegemeinschaften@netzburgenland.at", "portalUrl": "", "formularUrl": "", "besonderheiten": "Vertragsvorlage herunterladen und per E-Mail senden.", "quelle": _KOORD},
	{"id": "ENB-STMK", "nbNummer": "", "nbNummerStatus": "offen", "name": "Energienetze Steiermark GmbH", "kurzname": "Energienetze Steiermark", "bundesland": ["St"], "vertragsweg": "email", "kontaktEmail": "energiegemeinschaften@e-netze.at", "portalUrl": "https://www.e-netze.at/Strom/Energiegemeinschaften/Default.aspx", "formularUrl": "", "besonderheiten": "RC-Nummer und Partnerdaten per E-Mail.", "quelle": "https://www.e-netze.at/Strom/Energiegemeinschaften/Default.aspx"},
	{"id": "ENB-GRAZ", "nbNummer": "", "nbNummerStatus": "offen", "name": "Stromnetz Graz GmbH & Co KG", "kurzname": "Stromnetz Graz", "bundesland": ["St"], "vertragsweg": "email", "kontaktEmail": "", "portalUrl": "", "formularUrl": "", "besonderheiten": "Städtischer Verteilnetzbetreiber – Ablauf einzeln klären.", "quelle": _KOORD},
	{"id": "ENB-SBG", "nbNummer": "", "nbNummerStatus": "offen", "name": "Salzburg Netz GmbH", "kurzname": "Salzburg Netz", "bundesland": ["S"], "vertragsweg": "formular", "kontaktEmail": "", "portalUrl": "", "formularUrl": "", "besonderheiten": "Formular zur Anforderung des Vertrags.", "quelle": _KOORD},
	{"id": "ENB-TIROL", "nbNummer": "", "nbNummerStatus": "offen", "name": "TINETZ-Tiroler Netze GmbH", "kurzname": "TINETZ", "bundesland": ["T"], "vertragsweg": "email", "kontaktEmail": "netzanschluss@tinetz.at", "portalUrl": "", "formularUrl": "https://www.tinetz.at/uploads/tx_bh/334/formular-tinetz-vertrag_vnb-mit-betreiber-eeg.pdf", "besonderheiten": "Unterschriebenen Vertrag „Betrieb einer EEG“ per E-Mail.", "quelle": "https://www.tinetz.at/uploads/tx_bh/334/formular-tinetz-vertrag_vnb-mit-betreiber-eeg.pdf"},
	{"id": "ENB-IKB", "nbNummer": "", "nbNummerStatus": "offen", "name": "Innsbrucker Kommunalbetriebe AG (Netz)", "kurzname": "IKB", "bundesland": ["T"], "vertragsweg": "email", "kontaktEmail": "", "portalUrl": "", "formularUrl": "", "besonderheiten": "Städtischer Verteilnetzbetreiber – Ablauf einzeln klären.", "quelle": _KOORD},
	{"id": "ENB-KTN", "nbNummer": "", "nbNummerStatus": "offen", "name": "KNG-Kärnten Netz GmbH", "kurzname": "Kärnten Netz", "bundesland": ["K"], "vertragsweg": "portal", "kontaktEmail": "", "portalUrl": "", "formularUrl": "", "besonderheiten": "Antrag im Kundenportal „Mein Portal“, Vertrag wird zugesandt.", "quelle": _KOORD},
	{"id": "ENB-VBG", "nbNummer": "", "nbNummerStatus": "offen", "name": "Vorarlberger Energienetze GmbH", "kurzname": "Vorarlberg Netz", "bundesland": ["V"], "vertragsweg": "post", "kontaktEmail": "energiegemeinschaft@vorarlbergnetz.at", "portalUrl": "", "formularUrl": "", "besonderheiten": "Vorlage herunterladen, per Post (Weidachstraße 10, 6900 Bregenz) oder E-Mail.", "quelle": _KOORD},
]
NETZBETREIBER = [{"marktpartnerId": f"AT{x['nbNummer']}" if x["nbNummer"] else "", "plzListe": [], "netzentgeltAp": [], **x} for x in _NB]


def netzbetreiber_fuer_zaehlpunkt(zp, liste=None):
	liste = NETZBETREIBER if liste is None else liste
	nr = re.sub(r"\s", "", str(zp or "").upper())[2:8]
	return next((x for x in liste if x["nbNummer"] == nr), None) if re.match(r"^\d{6}$", nr) else None


# ================================================================ Netzentgelt (netzentgelt.js)

_SNE = "https://www.ris.bka.gv.at/geltendefassung.wxe?abfrage=bundesnormen&gesetzesnummer=20010107"
_SNE_NEU = "https://www.e-control.at/documents/1785851/0/V+SNE+01_26+SNE-G-V+Begutachtungsentwurf+samt+Erl%C3%A4uterungen.pdf/1425ce2f-897d-bea7-b8e6-e84f67f978ab"


def _r(id_, **d):
	return {"id": id_, "gueltigAb": "", "gueltigBis": "", "modelle": [], "zonelevel": [], "abgabenBefreitModelle": [], "quelleUrl": _SNE, **d}


NETZENTGELT_REGELN = [
	_r("ENR-2026-EEG-LOKAL", gueltigBis="2026-12-31", bezug="modell", modelle=["eeg"], zonelevel=[3], netzebenen=[6, 7], reduktionPct=57, abgabenBefreitModelle=["eeg"], quelle="SNE-V 2018 § 5 Abs. 1a (EEG lokal, NE 6/7)", status="gesichert"),
	_r("ENR-2026-EEG-REG-NS", gueltigBis="2026-12-31", bezug="modell", modelle=["eeg"], zonelevel=[4, 5], netzebenen=[6, 7], reduktionPct=28, abgabenBefreitModelle=["eeg"], quelle="SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 6/7)", status="gesichert"),
	_r("ENR-2026-EEG-REG-MS", gueltigBis="2026-12-31", bezug="modell", modelle=["eeg"], zonelevel=[4, 5], netzebenen=[4, 5], reduktionPct=64, abgabenBefreitModelle=["eeg"], quelle="SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 4/5)", status="gesichert"),
	_r("ENR-2026-GEA", gueltigBis="2026-12-31", bezug="modell", modelle=["gea"], zonelevel=[1, 2], netzebenen=[7], reduktionPct=100, abgabenBefreitModelle=["gea"], quelle="Eigendeckung hinter dem Netzanschluss ohne Netznutzung (ElWG § 68; Koordinationsstelle)", status="entwurf"),
	_r("ENR-2026-BEG", gueltigBis="2026-12-31", bezug="modell", modelle=["beg", "p2p", "eigenversorgung"], zonelevel=[1, 2, 3, 4, 5, 6, 7], netzebenen=[3, 4, 5, 6, 7], reduktionPct=0, quelle="SNE-V 2018 § 5 Abs. 1a gilt nur für EEG", status="gesichert"),
	_r("ENR-2027-Z1-2", gueltigAb="2027-01-01", bezug="zonelevel", zonelevel=[1, 2], netzebenen=[7], reduktionPct=100, abgabenBefreitModelle=["eeg", "gea"], quelleUrl=_SNE_NEU, quelle="Arbeitshypothese Fachkonzept 1.3: keine Netzkosten für Eigendeckung (neue SNE-VO)", status="platzhalter"),
	_r("ENR-2027-Z3", gueltigAb="2027-01-01", bezug="zonelevel", zonelevel=[3], netzebenen=[6, 7], reduktionPct=57, abgabenBefreitModelle=["eeg"], quelleUrl=_SNE_NEU, quelle="Arbeitshypothese Fachkonzept 1.3 (Lokalbereich, neue SNE-VO)", status="platzhalter"),
	_r("ENR-2027-Z4-5-NS", gueltigAb="2027-01-01", bezug="zonelevel", zonelevel=[4, 5], netzebenen=[6, 7], reduktionPct=28, abgabenBefreitModelle=["eeg"], quelleUrl=_SNE_NEU, quelle="Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 6/7, neue SNE-VO)", status="platzhalter"),
	_r("ENR-2027-Z4-5-MS", gueltigAb="2027-01-01", bezug="zonelevel", zonelevel=[4, 5], netzebenen=[4, 5], reduktionPct=64, abgabenBefreitModelle=["eeg"], quelleUrl=_SNE_NEU, quelle="Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 4/5, neue SNE-VO)", status="platzhalter"),
	_r("ENR-2027-Z6-7", gueltigAb="2027-01-01", bezug="zonelevel", zonelevel=[6, 7], netzebenen=[3, 4, 5, 6, 7], reduktionPct=0, quelleUrl=_SNE_NEU, quelle="Arbeitshypothese Fachkonzept 1.3 (keine Verbindung)", status="platzhalter"),
]


def _im_zeitraum(x, d):
	return (not x["gueltigAb"] or x["gueltigAb"] <= d) and (not x["gueltigBis"] or x["gueltigBis"] >= d)


def netzentgelt_regel(datum_, modell, zonelevel, netzebene, regeln=None):
	regeln = NETZENTGELT_REGELN if regeln is None else regeln
	d = str(datum_ or "")[:10]
	z = _n0(zonelevel)
	ne = _n0(netzebene) or 7
	treffer = next((x for x in regeln if _im_zeitraum(x, d) and ne in x["netzebenen"] and ((modell in x["modelle"] and (not x["zonelevel"] or z in x["zonelevel"])) if x["bezug"] == "modell" else z in x["zonelevel"])), None)
	if not treffer:
		return {"regel": None, "reduktionPct": 0, "faktor": 0, "abgabenBefreit": False, "status": "gesichert", "quelle": "keine Reduktion", "text": "keine Netzentgelt-Reduktion"}
	pct = treffer.get("reduktionPct") or 0
	return {
		"regel": treffer["id"], "reduktionPct": pct, "faktor": pct / 100, "abgabenBefreit": modell in treffer["abgabenBefreitModelle"], "status": treffer["status"], "quelle": treffer["quelle"],
		"text": (f"−{pct} % Netznutzungs-Arbeitspreis" if pct > 0 else "keine Netzentgelt-Reduktion") + (" (Platzhalter bis zur neuen SNE-VO)" if treffer["status"] == "platzhalter" else ""),
	}


def runde_ct2(x):
	x = float(_n0(x))
	s = (x > 0) - (x < 0)
	return s * _js_round(abs(x) * 100 + 1e-9) / 100


def reduzierter_ap(ap_ct, reduktion_pct):
	return runde_ct2(_n0(ap_ct) * (1 - _n0(reduktion_pct) / 100))


def regeln_am(stichtag, regeln=None):
	regeln = NETZENTGELT_REGELN if regeln is None else regeln
	return [x for x in regeln if _im_zeitraum(x, str(stichtag or "")[:10])]


# ================================================================ Rechte je Gemeinschaft (rechte.js)

_R = list(M.EG_TEAMROLLEN)
_RM = {
	"eigene_daten": ("Eigene Daten, Zählpunkte, Belege, Dashboard", [1, 2, 2, 2, 2, 2, 2, 0, 0]),
	"beitritt": ("Beitritt beantragen, TF-Wunsch, Kündigung", [2, 2, 2, 0, 0, 0, 0, 0, 0]),
	"mitgliederliste": ("Mitgliederliste (Name, Status)", [0, 0, 0, 2, 2, 2, 1, 2, 1]),
	"mitglied_aufnehmen": ("Mitglied aufnehmen bzw. ablehnen (1 = vorbereiten)", [0, 0, 0, 2, 0, 0, 0, 1, 0]),
	"stammdaten": ("Zählpunkte, Anlagen, Mitgliederdaten pflegen", [0, 0, 0, 2, 1, 2, 1, 2, 2]),
	"organe_statuten": ("Statuten, Organe, Rechtsdaten der Gemeinschaft (1 = vorbereiten)", [0, 1, 1, 2, 0, 2, 0, 1, 2]),
	"eda_ausloesen": ("EDA-Prozesse auslösen (Anmeldung, TF, Abmeldung)", [0, 0, 0, 0, 0, 0, 0, 2, 2]),
	"eda_freigeben": ("EDA-Massenvorgänge freigeben (Vier-Augen)", [0, 0, 0, 2, 0, 0, 0, 0, 0]),
	"qh_aggregiert": ("Viertelstundenwerte aggregiert", [0, 0, 0, 1, 1, 0, 1, 1, 0]),
	"qh_einzeln": ("Viertelstundenwerte einzelner Mitglieder (Zweckbindung, protokolliert)", [0, 0, 0, 1, 0, 0, 0, 1, 0]),
	"tarife": ("Tarife und Preisblatt (1 = Vorschlag/vorbereiten)", [0, 0, 0, 2, 1, 0, 0, 1, 0]),
	"abrechnung_vorschau": ("Abrechnungslauf: Vorschau", [0, 0, 0, 1, 1, 0, 1, 2, 0]),
	"abrechnung_freigabe_1": ("Abrechnung freigeben (1. Auge)", [0, 0, 0, 0, 2, 0, 0, 0, 0]),
	"abrechnung_freigabe_2": ("Abrechnung freigeben (2. Auge)", [0, 0, 0, 2, 0, 0, 0, 0, 0]),
	"abrechnung_versand": ("Belege versenden (Vorstand/Kassier: 2 nur in Selbstverwaltung ohne Organisator)", [0, 0, 0, 1, 1, 0, 0, 2, 0]),
	"sepa": ("SEPA-Dateien erzeugen, Zahlungen abgleichen", [0, 0, 0, 0, 2, 0, 1, 2, 0]),
	"buchhaltung": ("Buchhaltung, UVA-Vorbereitung, Jahresabschluss", [0, 0, 0, 1, 2, 0, 1, 2, 0]),
	"buchhaltung_pruefen": ("Rechnungsprüfung (Prüfpfad, Prüfvermerk)", [0, 0, 0, 0, 0, 0, 2, 0, 0]),
	"gv": ("GV einberufen, Protokoll (Mitglieder: Teilnahme und Stimme)", [0, 1, 1, 2, 0, 2, 1, 1, 0]),
	"gruendungsauftrag": ("Gründungsauftrag", [2, 0, 2, 2, 0, 0, 0, 0, 2]),
	"audit": ("Audit-Log der Gemeinschaft", [0, 0, 0, 1, 1, 0, 1, 1, 0]),
}
EG_RECHTE = {k: {"label": lab, "rollen": dict(zip(_R, s))} for k, (lab, s) in _RM.items()}
EG_RECHTE_IDS = list(EG_RECHTE)
_BACKOFFICE_ROLLEN = ["organisator", "gruendung"]
SELBST_VERSAND = ["vorstand", "kassier"]
BACKOFFICE_PFLEGE = ["mitgliederliste", "stammdaten", "organe_statuten", "mitglied_aufnehmen", "tarife", "audit", "qh_aggregiert"]
_VOR_BETRIEB = ["interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit"]


def organ_wirksam(o, heute):
	if not o or o.get("status") == "beendet":
		return False
	h = str(heute or "")[:10]
	return (not o.get("von") or str(o["von"])[:10] <= h) and (not o.get("bis") or str(o["bis"])[:10] >= h)


def eg_rollen(nutzer, gemeinschaft, organe=None, mitglieder=None, heute=""):
	"""Kontext-Rollen eines Kontos in einer Gemeinschaft (wie egRollen)."""
	rollen, bo = set(), 0
	selbst = not ((gemeinschaft or {}).get("dienstleistung") or {}).get("aktiv")
	if not nutzer or not gemeinschaft:
		return {"rollen": [], "backofficeStufe": 0, "selbstverwaltung": selbst}
	gid = gemeinschaft.get("id")
	for o in organe or []:
		if o.get("gemeinschaftId") == gid and o.get("kontoId") and o["kontoId"] == nutzer.get("id") and organ_wirksam(o, heute):
			r = (M.ORGAN_FUNKTIONEN.get(o.get("funktion")) or {}).get("teamrolle")
			if r:
				rollen.add(r)
	for m in mitglieder or []:
		if m.get("gemeinschaftId") != gid or not m.get("kontoId") or m["kontoId"] != nutzer.get("id"):
			continue
		if m.get("status") in M.MITGLIED_AKTIV:
			rollen.add("gemeinde" if m.get("art") == "gemeinde" else "mitglied")
		elif m.get("status") in ("interessent", "antrag", "geprueft"):
			rollen.add("interessent")
	if "admin" in (nutzer.get("rollen") or []):
		from oekoinvest_app.plattform import rechte as BR

		if BR.stufe(nutzer, "eg") >= 1:
			bo = 2 if BR.stufe(nutzer, "eg") >= 2 else 1
			if gemeinschaft.get("status") in _VOR_BETRIEB or gemeinschaft.get("status") not in M.GEMEINSCHAFT_STATUS:
				rollen.add("gruendung")
			if (gemeinschaft.get("dienstleistung") or {}).get("aktiv"):
				rollen.add("organisator")
	return {"rollen": [r for r in _R if r in rollen], "backofficeStufe": bo, "selbstverwaltung": selbst}


def eg_stufe(kontext, recht):
	z = (EG_RECHTE.get(recht) or {}).get("rollen")
	if not z or not kontext:
		return 0
	bo = kontext.get("backofficeStufe") or 0
	aus = max([min(z.get(r, 0), bo) if r in _BACKOFFICE_ROLLEN else z.get(r, 0) for r in kontext.get("rollen") or []] or [0])
	if recht == "abrechnung_versand" and kontext.get("selbstverwaltung") and any(r in SELBST_VERSAND for r in kontext.get("rollen") or []):
		return 2
	return max(aus, bo) if recht in BACKOFFICE_PFLEGE else aus


def eg_darf(kontext, recht, st=1):
	return eg_stufe(kontext, recht) >= st


def eg_rechte_von(kontext):
	return {r: eg_stufe(kontext, r) for r in EG_RECHTE_IDS}


def ist_organ(kontext):
	return any((M.EG_TEAMROLLEN.get(r) or {}).get("art") == "organ" for r in (kontext or {}).get("rollen") or [])


# ================================================================ Anlage (anlage.js)

def anlage_bereinigen(d):
	d = d or {}
	st = d.get("standort") or {}
	a = {
		"bezeichnung": text(d.get("bezeichnung"), 120), "art": auswahl(d.get("art"), M.ANLAGE_ARTEN, ""),
		"engpassleistungKw": zahl(d.get("engpassleistungKw"), 0, 100000, 2), "kwp": zahl(d.get("kwp"), 0, 100000, 2),
		"ausrichtung": zahl(d.get("ausrichtung"), -180, 180, 0), "neigung": zahl(d.get("neigung"), 0, 90, 0),
		"standort": {"lat": zahl(st.get("lat"), 46, 49.1, 6), "lon": zahl(st.get("lon"), 9.4, 17.2, 6), "adresse": text(st.get("adresse"), 200)},
		"eigentuemerMitgliedId": text(d.get("eigentuemerMitgliedId"), 40) or None, "betreiber": text(d.get("betreiber"), 120), "betriebsfuehrung": text(d.get("betriebsfuehrung"), 120),
		"nutzungsmodell": auswahl(d.get("nutzungsmodell"), M.NUTZUNGSMODELLE, "ueberschuss"), "foerderung": auswahl(d.get("foerderung"), M.FOERDERUNGEN, "keine"),
		"inbetriebnahme": datum(d.get("inbetriebnahme")), "hknRegistriert": wahr(d.get("hknRegistriert")), "speicherKwh": zahl(d.get("speicherKwh"), 0, 100000, 2),
		"speicherLadequelle": text(d.get("speicherLadequelle"), 80), "iotQuelle": text(d.get("iotQuelle"), 60), "haushalt": wahr(d.get("haushalt")),
		"status": auswahl(d.get("status"), ANLAGE_STATUS, "aktiv"),
	}
	if not a["bezeichnung"]:
		raise fehler("Bitte geben Sie eine Bezeichnung der Anlage an.", "bezeichnung")
	if not a["art"]:
		raise fehler("Bitte wählen Sie die Art der Anlage.", "art")
	if a["art"] in M.ANLAGE_ERZEUGEND and a["engpassleistungKw"] is None and a["kwp"] is None:
		raise fehler("Bitte Engpassleistung (kW) oder Modulleistung (kWp) angeben.", "engpassleistungKw")
	if a["art"] == "speicher" and a["speicherKwh"] is None:
		raise fehler("Bitte die Speicherkapazität (kWh) angeben.", "speicherKwh")
	if (a["engpassleistungKw"] or 0) > M.MAX_LEISTUNG_JE_ZP_KW:
		raise fehler("Mehr als 6 MW Erzeugungsleistung je Zählpunkt sind für die gemeinsame Energienutzung nicht zulässig (ElWG § 67).", "engpassleistungKw")
	return a


def leistung_kw(a):
	v = a.get("engpassleistungKw") if a.get("engpassleistungKw") is not None else a.get("kwp")
	return _num(v) if v is not None and not math.isnan(_num(v)) else 0


def erzeugungsleistung(anlagen):
	aktiv = [a for a in anlagen or [] if a.get("art") in M.ANLAGE_ERZEUGEND and a.get("status") not in ("stillgelegt", "geplant")]
	r = lambda x: _js_round(x * 100) / 100  # noqa: E731
	gesamt = r(sum(leistung_kw(a) for a in aktiv))
	haushalt = r(sum(leistung_kw(a) for a in aktiv if a.get("haushalt")))
	return {"gesamtKw": gesamt, "haushaltKw": haushalt, "lieferantenpflichten": gesamt > M.LIEFERANTENPFLICHT_KW["allgemein"] or haushalt > M.LIEFERANTENPFLICHT_KW["haushalt"]}


# ================================================================ Gemeinschaft, Organ, Kennzahlen (stamm.js)

def uid_pruefen(v):
	s = re.sub(r"\s", "", str(v or "").upper())
	return s if re.match(r"^ATU\d{8}$", s) else ""


def _plz4(v):
	s = str(v or "").strip()
	return s if re.match(r"^\d{4}$", s) else ""


def gemeinschaft_bereinigen(d, alt=None, netzbetreiber_ids=None):
	d = d or {}
	netzbetreiber_ids = netzbetreiber_ids or []
	modell = auswahl(d.get("modell"), M.EG_MODELLE, (alt or {}).get("modell") or "")
	if not modell:
		raise fehler("Bitte wählen Sie das Modell (EEG, BEG, GEA, P2P oder Eigenversorgung).", "modell")
	sa = d.get("sitzAdresse") or {}
	dl = d.get("dienstleistung") or {}
	nb_roh = d.get("netzbetreiber") if isinstance(d.get("netzbetreiber"), list) else [d.get("netzbetreiber")]
	nb = list(dict.fromkeys(x for x in (text(y, 40) for y in nb_roh) if x))[:12]
	zl = _n0(d.get("zonelevel")) or _n0((alt or {}).get("zonelevel")) or 0
	zl = int(zl) if not math.isnan(zl) and float(zl).is_integer() else zl
	g = {
		"name": text(d.get("name"), 140), "kurzname": text(d.get("kurzname"), 40), "modell": modell, "zonelevel": zl,
		"nahebereichRef": text(d.get("nahebereichRef"), 80),
		"rechtsform": auswahl(d.get("rechtsform"), M.RECHTSFORMEN, "verein" if M.EG_MODELLE[modell]["rechtsperson"] else "keine"),
		"zvrZahl": re.sub(r"\s", "", text(d.get("zvrZahl"), 20)), "firmenbuchnummer": re.sub(r"\s", "", text(d.get("firmenbuchnummer"), 20)).lower(),
		"sitzAdresse": {"strasse": text(sa.get("strasse"), 120), "plz": _plz4(sa.get("plz")), "ort": text(sa.get("ort"), 80)},
		"email": text(d.get("email"), 160).lower(), "telefon": text(d.get("telefon"), 40), "uid": uid_pruefen(d.get("uid")),
		"steuernummer": text(d.get("steuernummer"), 30), "finanzamt": text(d.get("finanzamt"), 80),
		"ustStatus": auswahl(d.get("ustStatus"), M.UST_STATUS, "kleinunternehmer"), "ustOptionSeit": datum(d.get("ustOptionSeit")),
		"iban": iban_pruefen(d.get("iban")) if d.get("iban") else "", "bic": re.sub(r"\s", "", text(d.get("bic"), 11).upper()),
		"creditorId": re.sub(r"\s", "", text(d.get("creditorId"), 35).upper()), "netzbetreiber": nb, "marktpartnerId": "", "gemeinschaftsId": "",
		"verteilmodell": auswahl(d.get("verteilmodell"), M.VERTEILMODELLE, "dynamisch"), "edaAnbindung": auswahl(d.get("edaAnbindung"), M.EDA_ANBINDUNGEN, "anwenderportal"),
		"organisatorAngezeigtAm": datum(d.get("organisatorAngezeigtAm")),
		"dienstleistung": {"aktiv": wahr(dl.get("aktiv")), "paket": text(dl.get("paket"), 40), "seit": datum(dl.get("seit")), "avvAm": datum(dl.get("avvAm"))},
		"abrechnungsrhythmus": auswahl(d.get("abrechnungsrhythmus"), M.ABRECHNUNGSRHYTHMEN, "monat"), "statutenVersion": text(d.get("statutenVersion"), 40),
		"betreibervertragDatum": datum(d.get("betreibervertragDatum")), "beschreibung": mehrzeilig(d.get("beschreibung"), 2000),
		"gruendungsauftragId": text(d.get("gruendungsauftragId"), 40) or (alt or {}).get("gruendungsauftragId") or "",
	}
	zk = str(g["zonelevel"])
	if not g["name"]:
		raise fehler("Bitte geben Sie den Namen der Gemeinschaft an.", "name")
	if d.get("iban") and not g["iban"]:
		raise fehler("Die IBAN ist ungültig (Prüfsumme).", "iban")
	if d.get("uid") and not g["uid"]:
		raise fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "uid")
	if zk not in M.ZONELEVEL:
		raise fehler("Bitte wählen Sie den Nahebereich (Zonelevel 1–7).", "zonelevel")
	if modell not in M.ZONELEVEL[zk]["modelle"]:
		raise fehler(f"Zonelevel {zk} („{M.ZONELEVEL[zk]['label']}“) ist für {M.EG_MODELLE[modell]['kurz']} nicht zulässig.", "zonelevel")
	if g["rechtsform"] == "keine" and M.EG_MODELLE[modell]["rechtsperson"]:
		raise fehler(f"Eine {M.EG_MODELLE[modell]['kurz']} braucht eine Rechtsperson (Verein, Genossenschaft, GmbH, OG/KG).", "rechtsform")
	mp = marktpartner_id_pruefen(d.get("marktpartnerId"), modell)
	if not mp["ok"]:
		raise fehler(mp["fehler"], "marktpartnerId")
	g["marktpartnerId"] = mp["wert"]
	gid = gemeinschafts_id_pruefen(d.get("gemeinschaftsId"), modell, g["marktpartnerId"], g["verteilmodell"])
	if not gid["ok"]:
		raise fehler(gid["fehler"], "gemeinschaftsId")
	g["gemeinschaftsId"] = gid["wert"]
	if netzbetreiber_ids and any(x not in netzbetreiber_ids for x in nb):
		raise fehler("Unbekannter Netzbetreiber.", "netzbetreiber")
	if not nb and modell != "p2p":
		raise fehler("Bitte wählen Sie den Netzbetreiber.", "netzbetreiber")
	if len(nb) > 1 and g["zonelevel"] not in (5, 7) and modell != "beg":
		raise fehler("Mehrere Netzbetreiber sind nur bei BEG bzw. Zonelevel 5 oder 7 möglich.", "netzbetreiber")
	if g["ustStatus"] == "regelbesteuert" and not g["uid"]:
		raise fehler("Bei Regelbesteuerung bitte die UID-Nummer angeben.", "uid")
	return g


def organ_bereinigen(d):
	d = d or {}
	o = {
		"kontoId": text(d.get("kontoId"), 40) or None, "name": text(d.get("name"), 120), "email": text(d.get("email"), 160).lower(),
		"funktion": auswahl(d.get("funktion"), M.ORGAN_FUNKTIONEN, ""), "von": datum(d.get("von")), "bis": datum(d.get("bis")),
		"gewaehltIn": text(d.get("gewaehltIn"), 40), "zeichnungsberechtigt": wahr(d.get("zeichnungsberechtigt")),
	}
	if not o["funktion"]:
		raise fehler("Bitte wählen Sie die Funktion.", "funktion")
	if not o["kontoId"] and not o["name"] and not o["email"]:
		raise fehler("Bitte Person angeben (Konto, E-Mail oder Name).", "name")
	if not o["von"]:
		raise fehler("Bitte den Beginn der Funktionsperiode angeben.", "von")
	if o["bis"] and o["bis"] < o["von"]:
		raise fehler("Das Ende der Funktionsperiode liegt vor dem Beginn.", "bis")
	return o


def organ_hinweise(g, organe, heute):
	h = []
	wirksam = [o for o in organe or [] if o.get("gemeinschaftId") == g.get("id") and organ_wirksam(o, heute)]
	person = lambda o: o.get("kontoId") or o.get("name")  # noqa: E731
	leitung = {person(o) for o in wirksam if (M.ORGAN_FUNKTIONEN.get(o.get("funktion")) or {}).get("leitung")}
	pruefer = {person(o) for o in wirksam if o.get("funktion") == "rechnungspruefer"}
	if g.get("rechtsform") == "verein":
		if len(leitung) < 2:
			h.append({"stufe": "warn", "text": "Das Leitungsorgan eines Vereins besteht aus mindestens 2 Personen (VerG § 5) (zu bestätigen)."})
		if len(pruefer) < 2:
			h.append({"stufe": "warn", "text": "Ein Verein braucht 2 Rechnungsprüfer (VerG § 21) (zu bestätigen)."})
		if any(p in leitung for p in pruefer):
			h.append({"stufe": "fehler", "text": "Rechnungsprüfer dürfen nicht dem Leitungsorgan angehören."})
	if g.get("rechtsform") == "egen" and len(leitung) < 2:
		h.append({"stufe": "warn", "text": "Der Vorstand einer Genossenschaft besteht aus mindestens 2 Personen (GenG) (zu bestätigen)."})
	if not any(o.get("zeichnungsberechtigt") for o in wirksam) and (M.EG_MODELLE.get(g.get("modell")) or {}).get("rechtsperson"):
		h.append({"stufe": "info", "text": "Noch keine zeichnungsberechtigte Person – Vier-Augen-Freigaben (Abrechnung, Zahlungsdateien) brauchen mindestens zwei."})
	return h


def kennzahlen(g, k):
	gid = g.get("id")
	t = [x for x in k.get("teilnahmen") or [] if x.get("gemeinschaftId") == gid]
	aktiv = [x for x in t if x.get("status") == "aktiv"]
	zp = {z["id"]: z for z in k.get("zaehlpunkte") or []}
	ls = erzeugungsleistung([a for a in k.get("anlagen") or [] if a.get("gemeinschaftId") == gid])
	mg = [m for m in k.get("mitglieder") or [] if m.get("gemeinschaftId") == gid]
	return {
		"mitgliederAktiv": len([m for m in mg if m.get("status") in M.MITGLIED_AKTIV]),
		"mitgliederOffen": len([m for m in mg if m.get("status") in ("interessent", "antrag", "geprueft")]),
		"zaehlpunkteAktiv": len(aktiv),
		"verbrauchAktiv": len([x for x in aktiv if (zp.get(x.get("zaehlpunktId")) or {}).get("richtung") == "verbrauch"]),
		"erzeugungAktiv": len([x for x in aktiv if (zp.get(x.get("zaehlpunktId")) or {}).get("richtung") == "erzeugung"]),
		"teilnahmenOffen": len([x for x in t if x.get("status") in ("entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik")]),
		"erzeugungsleistungKw": ls["gesamtKw"], "lieferantenpflichten": ls["lieferantenpflichten"],
	}


def gemeinschaft_hinweise(g, k, heute=""):
	h = []
	z = kennzahlen(g, k)
	if z["lieferantenpflichten"]:
		h.append({"stufe": "warn", "text": f"Erzeugungsleistung {_de_zahl(z['erzeugungsleistungKw'])} kW: Lieferantenpflichten nach § 69 ElWG (AGB, Informationsblatt, Rechnungsinhalte, Wahl Monats-/Jahresrechnung). Ein Organisator kann sie übernehmen."})
	if g.get("edaAnbindung") == "anwenderportal" and z["zaehlpunkteAktiv"] + z["teilnahmenOffen"] > EDA_PORTAL_GRENZE_ZP:
		h.append({"stufe": "info", "text": f"Mehr als {EDA_PORTAL_GRENZE_ZP} Zählpunkte: Das EDA-Anwenderportal ist darüber kostenpflichtig – E-Mail- oder KEP-Anbindung prüfen (zu bestätigen)."})
	if g.get("verteilmodell") == "statisch" and (not g.get("status") or g.get("status") in ("interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb")) and str(heute or "") >= M.MARKTPHASEN["1"]:
		h.append({"stufe": "warn", "text": "Neu aktivierte Gemeinschaften erhalten ab 05.10.2026 voraussichtlich nur noch das dynamische Modell (zu bestätigen)."})
	if (M.EG_MODELLE.get(g.get("modell")) or {}).get("rechtsperson") and g.get("status") in M.GEMEINSCHAFT_STATUS and g.get("status") in ("aktiv", "aufnahmestopp") and z["mitgliederAktiv"] < 2:
		h.append({"stufe": "fehler", "text": "Eine EEG bzw. BEG braucht mindestens 2 Mitglieder."})
	if (g.get("dienstleistung") or {}).get("aktiv") and not g.get("organisatorAngezeigtAm"):
		h.append({"stufe": "warn", "text": "ÖkoInvest ist als Organisator tätig – die Anzeige an den Netzbetreiber (§ 68 Abs. 2 ElWG) ist noch nicht vermerkt."})
	if g.get("status") in ("aktiv", "aufnahmestopp") and not g.get("gemeinschaftsId") and g.get("modell") in ("eeg", "beg", "gea"):
		h.append({"stufe": "fehler", "text": "Aktive Gemeinschaft ohne Gemeinschafts-ID – bitte aus dem Betreibervertrag übernehmen."})
	if g.get("modell") == "eeg" and any(m.get("gemeinschaftId") == g.get("id") and m.get("art") == "grossunternehmen" and m.get("status") in M.MITGLIED_AKTIV for m in k.get("mitglieder") or []):
		h.append({"stufe": "fehler", "text": "Großunternehmen dürfen nicht Mitglied einer EEG sein (ElWG § 6 Abs. 1 Z 61; EAG § 79 Abs. 2)."})
	return h


# ================================================================ Mitglied, Zählpunkt, Teilnahme (mitglied.js)

def ist_grossunternehmen(g):
	g = g or {}
	ma = _num_oder_nan(g.get("mitarbeiter"))
	if not math.isnan(ma) and ma >= M.GROSSUNTERNEHMEN["mitarbeiter"]:
		return True
	u, b = _num_oder_nan(g.get("umsatzMioEur")), _num_oder_nan(g.get("bilanzMioEur"))
	return (not math.isnan(u) and u > M.GROSSUNTERNEHMEN["umsatzMioEur"]) and (not math.isnan(b) and b > M.GROSSUNTERNEHMEN["bilanzMioEur"])


def mitglied_hindernisse(m, g):
	if not g:
		return []
	if g.get("modell") == "eeg" and not (M.MITGLIED_ARTEN.get(m.get("art")) or {}).get("eeg"):
		return ["Großunternehmen dürfen nicht Mitglied einer Erneuerbare-Energie-Gemeinschaft sein (ElWG § 6 Abs. 1 Z 61, EAG § 79 Abs. 2) – möglich ist eine BEG."]
	return []


def mitglied_bereinigen(d, gemeinschaft=None):
	d = d or {}
	ug = d.get("unternehmensgroesse") or {}
	groesse = {"mitarbeiter": zahl(ug.get("mitarbeiter"), 0, 1e7, 0), "umsatzMioEur": zahl(ug.get("umsatzMioEur"), 0, 1e6, 2), "bilanzMioEur": zahl(ug.get("bilanzMioEur"), 0, 1e6, 2), "nachweis": text(ug.get("nachweis"), 200)}
	art = auswahl(d.get("art"), M.MITGLIED_ARTEN, "")
	if art in ("kmu", "grossunternehmen"):
		art = "grossunternehmen" if ist_grossunternehmen(groesse) else art
	p = d.get("person") or {}
	sm = d.get("sepaMandat") or {}
	m = {
		"kontoId": text(d.get("kontoId"), 40) or None, "art": art,
		"person": {"vorname": text(p.get("vorname"), 80), "nachname": text(p.get("nachname"), 80), "firma": text(p.get("firma"), 140), "strasse": text(p.get("strasse"), 120), "plz": _plz4(p.get("plz")), "ort": text(p.get("ort"), 80), "email": text(p.get("email"), 160).lower(), "telefon": text(p.get("telefon"), 40)},
		"unternehmensgroesse": groesse, "steuerstatusErzeuger": auswahl(d.get("steuerstatusErzeuger"), M.STEUERSTATUS_ERZEUGER, "kleinunternehmer"),
		"uid": uid_pruefen(d.get("uid")), "schutzbeduerftig": wahr(d.get("schutzbeduerftig")), "iban": iban_pruefen(d.get("iban")) if d.get("iban") else "",
		"sepaMandat": {"referenz": text(sm.get("referenz"), 35), "datum": datum(sm.get("datum")), "status": auswahl(sm.get("status"), {"aktiv": 1, "widerrufen": 1}, "")},
		"rechnungsweg": auswahl(d.get("rechnungsweg"), M.RECHNUNGSWEGE, "portal"), "abrechnungsrhythmus": auswahl(d.get("abrechnungsrhythmus"), M.ABRECHNUNGSRHYTHMEN, ""),
		"beitrittAm": datum(d.get("beitrittAm")),
	}
	if not m["art"]:
		raise fehler("Bitte wählen Sie die Mitgliedsart.", "art")
	if not m["person"]["nachname"] and not m["person"]["firma"]:
		raise fehler("Bitte Name bzw. Firma des Mitglieds angeben.", "person.nachname")
	if d.get("iban") and not m["iban"]:
		raise fehler("Die IBAN ist ungültig (Prüfsumme).", "iban")
	if d.get("uid") and not m["uid"]:
		raise fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "uid")
	if (M.STEUERSTATUS_ERZEUGER.get(m["steuerstatusErzeuger"]) or {}).get("uidPflicht") and not m["uid"]:
		raise fehler("Für regelbesteuerte Erzeuger bzw. Gemeinden mit BgA ist die UID-Nummer Pflicht (Reverse Charge).", "uid")
	if m["sepaMandat"]["status"] == "aktiv" and (not m["iban"] or not m["sepaMandat"]["referenz"] or not m["sepaMandat"]["datum"]):
		raise fehler("Ein aktives SEPA-Mandat braucht IBAN, Mandatsreferenz und Datum.", "sepaMandat.referenz")
	h = mitglied_hindernisse(m, gemeinschaft)
	if h:
		raise konflikt_fehler(h[0])
	return m


def naechste_mitgliedsnummer(mitglieder, gemeinschaft_id):
	return 1 + max([int(_n0(m.get("mitgliedsnummer"))) for m in mitglieder or [] if m.get("gemeinschaftId") == gemeinschaft_id] or [0])


def mitglied_name(m):
	p = (m or {}).get("person")
	if not p:
		return ""
	return p.get("firma") or " ".join(x for x in (p.get("vorname"), p.get("nachname")) if x)


def zaehlpunkt_bereinigen(d, netzbetreiber=None):
	d = d or {}
	p = zaehlpunkt_pruefen(d.get("zaehlpunktnummer"), netzbetreiber or [])
	if not p["ok"]:
		raise fehler(p["fehler"], "zaehlpunktnummer")
	ne = _num(d.get("netzebene"))
	z = {
		"zaehlpunktnummer": p["wert"], "nbNummer": p["nbNummer"], "plz": p["plz"], "netzbetreiberId": p["netzbetreiberId"] or text(d.get("netzbetreiberId"), 40),
		"richtung": auswahl(d.get("richtung"), M.ZP_RICHTUNGEN, ""), "anlageId": text(d.get("anlageId"), 40) or None, "inhaberKontoId": text(d.get("inhaberKontoId"), 40) or None,
		"inhaberName": text(d.get("inhaberName"), 140), "smartMeter": auswahl(d.get("smartMeter"), M.SMART_METER, "unbekannt"), "qhAktiv": wahr(d.get("qhAktiv")),
		"nahebereichRef": text(d.get("nahebereichRef"), 80), "auskunftAm": datum(d.get("auskunftAm")),
		"netzebene": int(ne) if not math.isnan(ne) and float(ne).is_integer() and str(int(ne)) in M.NETZEBENEN else None,
		"lieferant": text(d.get("lieferant"), 120), "energieabnehmer": text(d.get("energieabnehmer"), 120),
	}
	if not z["richtung"]:
		raise fehler("Bitte die Energierichtung wählen (Verbrauch oder Erzeugung).", "richtung")
	return {"zaehlpunkt": z, "hinweise": p["hinweise"]}


def teilnahme_bereinigen(d, gemeinschaft=None):
	d = d or {}
	statisch = (gemeinschaft or {}).get("verteilmodell") == "statisch"
	t = {
		"zaehlpunktId": text(d.get("zaehlpunktId"), 40), "mitgliedId": text(d.get("mitgliedId"), 40),
		"teilnahmefaktor": ganz(d.get("teilnahmefaktor", 100) if d.get("teilnahmefaktor") is not None else 100, M.TF_MIN, M.TF_MAX),
		"aufteilungsschluesselPct": zahl(d.get("aufteilungsschluesselPct"), 0.1, 100, 1) if statisch else None, "consentId": text(d.get("consentId"), 80),
	}
	if not t["zaehlpunktId"]:
		raise fehler("Bitte den Zählpunkt wählen.", "zaehlpunktId")
	if not t["mitgliedId"]:
		raise fehler("Bitte das Mitglied wählen.", "mitgliedId")
	if t["teilnahmefaktor"] is None:
		raise fehler(f"Der Teilnahmefaktor ist eine ganze Zahl von {M.TF_MIN} bis {M.TF_MAX} %.", "teilnahmefaktor")
	if statisch and t["aufteilungsschluesselPct"] is None and d.get("aufteilungsschluesselPct") not in (None, ""):
		raise fehler("Aufteilungsschlüssel: 0,1 bis 100 % (eine Nachkommastelle).", "aufteilungsschluesselPct")
	return t


def teilnahme_regeln(teilnahmen, neu, fremd_tf=0, fremd_anzahl=0):
	andere = [t for t in teilnahmen or [] if t.get("id") != neu.get("id") and t.get("status") in M.TEILNAHME_ZAEHLT]
	summe = sum(_n0(t.get("teilnahmefaktor")) for t in andere) + _n0(fremd_tf)
	anzahl = len(andere) + int(_n0(fremd_anzahl)) + 1
	tf = _n0(neu.get("teilnahmefaktor"))
	summe, tf = int(summe) if float(summe).is_integer() else summe, int(tf) if float(tf).is_integer() else tf
	r = {"ok": True, "fehler": "", "summeTf": summe + tf, "anzahl": anzahl, "freiTf": max(0, M.TF_MAX - summe)}
	if any(t.get("gemeinschaftId") == neu.get("gemeinschaftId") for t in andere):
		return {**r, "ok": False, "fehler": "Der Zählpunkt nimmt an dieser Gemeinschaft bereits teil (bzw. eine Anmeldung läuft)."}
	if anzahl > M.MAX_TEILNAHMEN_JE_ZP:
		return {**r, "ok": False, "fehler": f"Ein Zählpunkt darf an höchstens {M.MAX_TEILNAHMEN_JE_ZP} gemeinsamen Energienutzungen teilnehmen (ElWG § 71 Abs. 5)."}
	if summe + tf > M.TF_MAX:
		return {**r, "ok": False, "fehler": f"Die Summe der Teilnahmefaktoren dieses Zählpunkts läge bei {summe + tf} % – höchstens {M.TF_MAX} % (frei: {max(0, M.TF_MAX - summe)} %)."}
	return r


def tf_am(t, stichtag):
	d = str(stichtag or "")[:10]
	h = sorted([x for x in (t or {}).get("tfHistorie") or [] if x["gueltigAb"] <= d], key=lambda x: x["gueltigAb"])
	return h[-1]["tf"] if h else _n0((t or {}).get("teilnahmefaktor"))


# ================================================================ Tarif und Verteilschlüssel (tarif.js)

_ZEIT = re.compile(r"^([01]\d|2[0-3]):(00|15|30|45)$")


def _zeit(v):
	return str(v) if _ZEIT.match(str(v or "")) else ""


def _zeitfenster_bereinigen(z, i):
	z = z or {}
	f = {
		"id": text(z.get("id"), 20) or f"Z{i + 1}", "label": text(z.get("label"), 60),
		"tage": list(dict.fromkeys(x for x in (z.get("tage") if isinstance(z.get("tage"), list) else []) if x in M.WOCHENTAGE)),
		"von": _zeit(z.get("von")), "bis": _zeit(z.get("bis")),
		"monate": sorted(set(int(_num(x)) for x in (z.get("monate") if isinstance(z.get("monate"), list) else []) if not math.isnan(_num(x)) and 1 <= _num(x) <= 12)),
		"bezugspreisCt": zahl(z.get("bezugspreisCt"), 0, 100, 4), "einspeisepreisCt": zahl(z.get("einspeisepreisCt"), 0, 100, 4),
	}
	if not f["label"]:
		raise fehler("Bitte jedes Zeitfenster benennen (z. B. „Mittagsstrom“).", f"zeitfenster.{i}.label")
	if not f["von"] or not f["bis"]:
		raise fehler("Zeitfenster: Beginn und Ende im Viertelstundenraster (HH:MM).", f"zeitfenster.{i}.von")
	if f["bezugspreisCt"] is None and f["einspeisepreisCt"] is None:
		raise fehler("Zeitfenster: Bezugs- oder Einspeisepreis angeben.", f"zeitfenster.{i}.bezugspreisCt")
	return f


def tarif_bereinigen(d):
	d = d or {}
	b = d.get("beschluss") or {}
	so = d.get("sozialtarif") or {}

	def ind(x, i):
		e = {"mitgliedId": text(x.get("mitgliedId"), 40), "bezugspreisCt": zahl(x.get("bezugspreisCt"), 0, 100, 4), "einspeisepreisCt": zahl(x.get("einspeisepreisCt"), 0, 100, 4), "grund": text(x.get("grund"), 200)}
		if not e["mitgliedId"] or not e["grund"]:
			raise fehler("Individuelle Preise brauchen Mitglied und dokumentierten Grund.", f"individuell.{i}.grund")
		return e

	nz = lambda v: 0 if v is None else v  # noqa: E731
	t = {
		"bezeichnung": text(d.get("bezeichnung"), 80) or "Tarif", "gueltigAb": datum(d.get("gueltigAb")), "gueltigBis": datum(d.get("gueltigBis")),
		"beschluss": {"art": auswahl(b.get("art"), M.TARIF_BESCHLUSS, "vorstand"), "datum": datum(b.get("datum")), "referenz": text(b.get("referenz"), 80)},
		"bezugspreisCt": zahl(d.get("bezugspreisCt"), 0, 100, 4), "einspeisepreisCt": zahl(d.get("einspeisepreisCt"), 0, 100, 4),
		"zeitfenster": [_zeitfenster_bereinigen(z, i) for i, z in enumerate((d.get("zeitfenster") if isinstance(d.get("zeitfenster"), list) else [])[:12])],
		"grundgebuehrMonat": nz(zahl(d.get("grundgebuehrMonat"), 0, 1000, 2)), "zaehlpunktgebuehrMonat": nz(zahl(d.get("zaehlpunktgebuehrMonat"), 0, 1000, 2)),
		"einmalgebuehrBeitritt": nz(zahl(d.get("einmalgebuehrBeitritt"), 0, 10000, 2)), "mitgliedsbeitragJahr": nz(zahl(d.get("mitgliedsbeitragJahr"), 0, 10000, 2)),
		"sozialtarif": {"bezugspreisCt": zahl(so.get("bezugspreisCt"), 0, 100, 4), "kontingentPct": zahl(so.get("kontingentPct"), 0, 100, 1)},
		"individuell": [ind(x, i) for i, x in enumerate((d.get("individuell") if isinstance(d.get("individuell"), list) else [])[:500])],
		"status": auswahl(d.get("status"), M.TARIF_STATUS, "entwurf"),
	}
	if not t["gueltigAb"]:
		raise fehler("Bitte das Gültigkeitsdatum (ab) angeben.", "gueltigAb")
	if t["gueltigBis"] and t["gueltigBis"] < t["gueltigAb"]:
		raise fehler("„Gültig bis“ liegt vor „gültig ab“.", "gueltigBis")
	if t["bezugspreisCt"] is None or t["einspeisepreisCt"] is None:
		raise fehler("Bitte Bezugs- und Einspeisepreis (netto, ct/kWh) angeben.", "bezugspreisCt")
	if t["einspeisepreisCt"] > t["bezugspreisCt"]:
		raise fehler("Der Einspeisepreis liegt über dem Bezugspreis – die Gemeinschaft könnte ihre Kosten nicht decken.", "einspeisepreisCt")
	if t["status"] in ("beschlossen", "aktiv") and not t["beschluss"]["datum"]:
		raise fehler("Für einen beschlossenen Tarif bitte das Beschlussdatum angeben.", "beschluss.datum")
	return t


def tarif_am(tarife, tag):
	d = str(tag or "")[:10]
	k = [t for t in tarife or [] if t.get("status") in ("beschlossen", "aktiv") and t["gueltigAb"] <= d and (not t.get("gueltigBis") or t["gueltigBis"] >= d)]
	k.sort(key=lambda t: t["gueltigAb"], reverse=True)
	return k[0] if k else None


def tarif_versionieren(tarife, neu):
	aus = []
	for t in tarife or []:
		if t.get("id") != neu.get("id") and t.get("status") in ("beschlossen", "aktiv") and t["gueltigAb"] < neu["gueltigAb"] and (not t.get("gueltigBis") or t["gueltigBis"] >= neu["gueltigAb"]):
			aus.append({**t, "gueltigBis": plus_tage(neu["gueltigAb"], -1), "status": "abgeloest"})
		else:
			aus.append(t)
	return aus


_WT = ["mo", "di", "mi", "do", "fr", "sa", "so"]  # date.weekday(): Montag = 0


def preis_fuer(tarif, lokal, mitglied_id=""):
	from datetime import date as _d

	tarif = tarif or {}
	ind = next((x for x in tarif.get("individuell") or [] if x.get("mitgliedId") == mitglied_id), None)
	d = _d.fromisoformat(str(lokal)[:10])
	wt, mon, hm = _WT[d.weekday()], d.month, str(lokal)[11:16]

	def passt(z):
		if z["tage"] and wt not in z["tage"]:
			return False
		if z["monate"] and mon not in z["monate"]:
			return False
		return (z["von"] <= hm < z["bis"]) if z["von"] <= z["bis"] else (hm >= z["von"] or hm < z["bis"])

	f = next((z for z in tarif.get("zeitfenster") or [] if passt(z)), None)

	def wahl(feld):
		for q in (ind, f, tarif):
			if q and q.get(feld) is not None:
				return q[feld]
		return 0

	return {"bezugspreisCt": wahl("bezugspreisCt"), "einspeisepreisCt": wahl("einspeisepreisCt"), "zeitfenster": (f or {}).get("id", "")}


def verteilschluessel_bereinigen(d):
	d = d or {}
	pos = []
	for p in (d.get("positionen") if isinstance(d.get("positionen"), list) else [])[:2000]:
		e = {"teilnahmeId": text(p.get("teilnahmeId"), 40), "pct": zahl(p.get("pct"), 0, 100, 1)}
		if e["teilnahmeId"] and e["pct"] is not None:
			pos.append(e)
	v = {"gueltigAb": datum(d.get("gueltigAb")), "positionen": pos}
	if not v["gueltigAb"]:
		raise fehler("Bitte das Gültigkeitsdatum angeben.", "gueltigAb")
	if not pos:
		raise fehler("Bitte mindestens eine Position mit Anteil angeben.", "positionen")
	if len({p["teilnahmeId"] for p in pos}) != len(pos):
		raise fehler("Jede Teilnahme darf nur einmal vorkommen.", "positionen")
	v["summePct"] = _js_round(sum(p["pct"] for p in pos) * 10) / 10
	v["hinweis"] = "Summe über 100 % – der Netzbetreiber normiert die Anteile (HA II 12.2)." if v["summePct"] > 100 else ("Summe unter 100 % – nicht zugeteilte Anteile gelten als Überschuss." if v["summePct"] < 100 else "")
	return v


# ================================================================ Zustandswechsel (status.js)

def gemeinschaft_uebergang(g, nach, grund=""):
	von = (g or {}).get("status") or "interesse"
	if nach not in M.GEMEINSCHAFT_STATUS:
		raise fehler("Unbekannter Status der Gemeinschaft.", "status")
	if von == nach:
		return {"status": nach}
	if nach not in (M.GEMEINSCHAFT_STATUS.get(von) or {}).get("naechste", []):
		raise konflikt_fehler(f"Wechsel von „{(M.GEMEINSCHAFT_STATUS.get(von) or {}).get('label', von)}“ nach „{M.GEMEINSCHAFT_STATUS[nach]['label']}“ ist nicht vorgesehen.")
	if nach == "rechtsperson" and g.get("rechtsform") != "keine" and not (g.get("zvrZahl") or g.get("firmenbuchnummer")):
		raise fehler("Für den Status „Rechtsperson“ bitte ZVR-Zahl bzw. Firmenbuchnummer eintragen.", "zvrZahl")
	if nach == "marktpartner" and not g.get("marktpartnerId"):
		raise fehler("Für den Status „Marktpartner“ bitte die Marktpartner-ID (ebUtilities) eintragen.", "marktpartnerId")
	if nach == "vertrag_nb" and not g.get("gemeinschaftsId"):
		raise fehler("Für den Status „Vertrag mit dem Netzbetreiber“ bitte die Gemeinschafts-ID eintragen.", "gemeinschaftsId")
	if nach in ("aufgeloest", "in_aufloesung") and not text(grund, 500):
		raise fehler("Bitte den Beschluss bzw. Grund angeben.", "grund")
	return {"status": nach}


def mitglied_uebergang(m, nach, grund="", zum=""):
	von = (m or {}).get("status") or "interessent"
	if nach not in M.MITGLIED_STATUS:
		raise fehler("Unbekannter Mitgliedsstatus.", "status")
	if von == nach:
		return {"status": nach}
	if nach not in (M.MITGLIED_STATUS.get(von) or {}).get("naechste", []):
		raise konflikt_fehler(f"Wechsel von „{(M.MITGLIED_STATUS.get(von) or {}).get('label', von)}“ nach „{M.MITGLIED_STATUS[nach]['label']}“ ist nicht vorgesehen.")
	if nach == "gekuendigt" and not datum(zum):
		raise fehler("Bitte das Austrittsdatum (Kündigung zum) angeben.", "zum")
	if nach in ("abgelehnt", "ausgeschlossen") and not text(grund, 500):
		raise fehler("Bitte einen Grund angeben.", "grund")
	return {"status": nach, **({"austrittZum": datum(zum)} if nach == "gekuendigt" else {})}


def teilnahme_uebergang(t, ereignis, heute, datum_="", consent_id=None, teilnahmefaktor=None, responsecode=None, prozess_id="", grund="", von_konto=None, am=None):
	von = (t or {}).get("status") or "entwurf"
	ziel = ((M.TEILNAHME_STATUS.get(von) or {}).get("ereignisse") or {}).get(ereignis)
	if not ziel:
		raise konflikt_fehler(f"Ereignis „{ereignis}“ ist im Status „{(M.TEILNAHME_STATUS.get(von) or {}).get('label', von)}“ nicht vorgesehen.")
	h = str(heute or "")[:10]
	d = datum(datum_) or h
	neu = {**t, "status": ziel, "tfHistorie": list(t.get("tfHistorie") or []), "verlauf": list(t.get("verlauf") or [])}
	if responsecode is not None:
		neu["responsecode"] = text(responsecode, 40)
	if ereignis == "anforderung_econ":
		neu["fristBis"] = plus_tage(d, M.ZUSTIMMUNG_FRIST_TAGE)
	if ereignis == "zustimmung_econ":
		neu["consentId"] = text(consent_id, 80) or t.get("consentId") or ""
		neu["fristBis"] = ""
	if ereignis == "abschluss_econ":
		if not datum(datum_):
			raise fehler("Für die Aktivierung bitte das Aktivierungsdatum laut ABSCHLUSS_ECON angeben.", "datum")
		neu["gueltigAb"], neu["gueltigBis"] = d, ""
		neu["tfHistorie"].append({"gueltigAb": d, "tf": t.get("teilnahmefaktor"), "prozessId": text(prozess_id, 40)})
	if ereignis == "tf_geaendert":
		tf = ganz(teilnahmefaktor, M.TF_MIN, M.TF_MAX)
		if tf is None:
			raise fehler(f"Der Teilnahmefaktor ist eine ganze Zahl von {M.TF_MIN} bis {M.TF_MAX} %.", "teilnahmefaktor")
		if any(x.get("gueltigAb") == d for x in neu["tfHistorie"]):
			raise konflikt_fehler("Je Gemeinschaft und Zählpunkt ist derzeit nur eine Änderung des Teilnahmefaktors pro Tag möglich.")
		neu["teilnahmefaktor"] = tf
		neu["tfHistorie"].append({"gueltigAb": d, "tf": tf, "prozessId": text(prozess_id, 40)})
	if ereignis == "cm_rev_sp":
		if d < h:
			raise konflikt_fehler("Eine Abmeldung ist nicht rückwirkend möglich (Prozessdatum frühestens heute).")
		neu["gueltigBis"] = d
	if ereignis in ("abmeldung_ok", "cm_rev_cus", "cm_rev_imp"):
		neu["gueltigBis"] = (t.get("gueltigBis") or d) if ereignis == "abmeldung_ok" else d
		neu["beendetGrund"] = "widerruf" if ereignis == "cm_rev_cus" else ("implizit" if ereignis == "cm_rev_imp" else "abmeldung")
	if ereignis == "abmeldung_abgelehnt":
		neu["gueltigBis"] = ""
	if ereignis == "erneut":
		neu.update({"consentId": "", "fristBis": "", "responsecode": ""})
	neu["verlauf"].append({"am": am or f"{h}T12:00:00.000Z", "von": von, "nach": ziel, "ereignis": ereignis, "prozessId": text(prozess_id, 40), "text": text(grund, 300), "vonKonto": von_konto})
	return neu


def teilnahme_ereignisse(t):
	return list(((M.TEILNAHME_STATUS.get((t or {}).get("status") or "entwurf") or {}).get("ereignisse") or {}).keys())


# ================================================================ Migration aus dem Prototyp (migration.js)

_FORM = {"eeg_lokal": ("eeg", 3), "eeg_regional": ("eeg", 4), "beg": ("beg", 6), "gea": ("gea", 1)}
_GSTATUS = {"aufbau": "in_gruendung", "aktiv": "aktiv", "geschlossen": "aufnahmestopp"}
_TSTATUS = {"beantragt": "entwurf", "angemeldet": "angefragt", "aktiv": "aktiv", "beendet": "beendet", "abgelehnt": "abgelehnt"}
_MSTATUS = {"entwurf": "antrag", "angefragt": "aufgenommen", "aktiv": "aktiv", "beendet": "ausgeschieden", "abgelehnt": "abgelehnt"}


def _rechtsform_aus(t, modell):
	s = str(t or "").lower()
	if modell == "gea":
		return "keine"
	if re.search(r"genossenschaft|egen", s):
		return "egen"
	if "gmbh" in s:
		return "gmbh"
	if re.search(r"\bog\b|\bkg\b", s):
		return "og_kg"
	return "verein"


def _netzbetreiber_aus(text_, zps, liste):
	s = str(text_ or "").lower()
	for x in liste:
		if s and (x["kurzname"].lower() in s or re.sub(r" gmbh.*$", "", x["name"].lower()) in s):
			return x["id"]
	for z in zps:
		p = zaehlpunkt_pruefen(z, liste)
		if p["netzbetreiberId"]:
			return p["netzbetreiberId"]
	if re.search(r"ober(ö|oe)sterreich", s):
		return "ENB-OOE"
	return ""


def migration_aus_prototyp(alt, neue_id, heute, vorhanden=None, netzbetreiber=None, namen=None):
	"""Wie migrationAusPrototyp (eg/migration.js). `neue_id(praefix)` liefert Kennungen."""
	netzbetreiber = NETZBETREIBER if netzbetreiber is None else netzbetreiber
	namen = namen or (lambda _id: None)
	r = {"gemeinschaften": [], "mitglieder": [], "zaehlpunkte": [], "teilnahmen": [], "anlagen": [], "tarife": [], "warnungen": [], "uebersprungen": []}
	schon = {g.get("migriertAus") for g in (vorhanden or {}).get("gemeinschaften") or [] if g.get("migriertAus")}
	meta = {"erstelltAm": f"{heute}T00:00:00.000Z", "erstelltVon": None, "geaendertAm": f"{heute}T00:00:00.000Z", "geaendertVon": None}
	for a in (alt or {}).get("gemeinschaften") or []:
		if a.get("land") != "AT":
			r["uebersprungen"].append({"id": a.get("id"), "name": a.get("name"), "grund": f"Land {a.get('land')}: bleibt im Prototyp (international, vereinfacht)."})
			continue
		if a.get("id") in schon:
			r["uebersprungen"].append({"id": a.get("id"), "name": a.get("name"), "grund": "bereits migriert"})
			continue
		modell, zonelevel = _FORM.get(a.get("form"), ("eeg", 3))
		if a.get("form") not in _FORM:
			r["warnungen"].append(f"{a.get('name')}: unbekannte Form „{a.get('form')}“ – als EEG lokal übernommen, bitte prüfen.")
		tn = [t for t in alt.get("teilnahmen") or [] if t.get("egId") == a.get("id")]
		zp_liste = [z for t in tn for z in ((t.get("stamm") or {}).get("zaehlpunkt"), (t.get("stamm") or {}).get("zaehlpunktEinspeisung")) if z]
		nb = _netzbetreiber_aus(a.get("netzbetreiber"), zp_liste, netzbetreiber)
		if not nb:
			r["warnungen"].append(f"{a.get('name')}: Netzbetreiber „{a.get('netzbetreiber')}“ nicht zugeordnet – bitte wählen.")
		gid_roh = kennung_normalisieren(re.sub(r"\(demo\)", "", str(a.get("gemeinschaftsId") or ""), count=1, flags=re.I))
		gid = gemeinschafts_id_pruefen(gid_roh, modell)
		if gid_roh and not gid["ok"]:
			r["warnungen"].append(f"{a.get('name')}: Gemeinschafts-ID „{a.get('gemeinschaftsId')}“ entspricht nicht dem Format ({gid['fehler']}) – in die Beschreibung übernommen.")
		g = {
			"id": neue_id("EGG"), "migriertAus": a.get("id"), "name": a.get("name"), "kurzname": "", "modell": modell, "zonelevel": zonelevel, "nahebereichRef": a.get("gebiet") or "",
			"rechtsform": _rechtsform_aus(a.get("rechtsform"), modell), "zvrZahl": "", "firmenbuchnummer": "",
			"sitzAdresse": {"strasse": "", "plz": (a.get("plzListe") or [""])[0] if a.get("plzListe") else "", "ort": ""}, "email": "", "telefon": "", "uid": "", "steuernummer": "", "finanzamt": "",
			"ustStatus": "kleinunternehmer", "ustOptionSeit": "", "iban": "", "bic": "", "creditorId": "", "netzbetreiber": [nb] if nb else [], "marktpartnerId": "",
			"gemeinschaftsId": gid_roh if gid_roh and gid["ok"] else "", "verteilmodell": "statisch" if a.get("verteilschluessel") == "statisch" else "dynamisch",
			"vorgaengerId": None, "nachfolgerId": None, "edaAnbindung": "anwenderportal", "organisatorOrgId": None, "organisatorAngezeigtAm": "",
			"dienstleistung": {"aktiv": a.get("status") == "aktiv", "paket": "migration", "seit": heute, "avvAm": ""}, "abrechnungsrhythmus": "monat", "statutenVersion": "", "betreibervertragDatum": "",
			"beschreibung": "\n".join(x for x in (a.get("info"), f"Gemeinschafts-ID laut Prototyp: {a.get('gemeinschaftsId')}" if gid_roh and not gid["ok"] else "") if x),
			"status": _GSTATUS.get(a.get("status"), "in_gruendung"), **meta, **({"demo": True} if a.get("demo") else {}),
		}
		r["gemeinschaften"].append(g)
		ab_min = sorted(t.get("ab") for t in tn if t.get("ab"))[0] if any(t.get("ab") for t in tn) else heute
		if a.get("tarifBezugCt") is not None:
			r["tarife"].append({"id": neue_id("ETF"), "gemeinschaftId": g["id"], "bezeichnung": "Übernahme aus dem Prototyp", "gueltigAb": ab_min, "gueltigBis": "", "beschluss": {"art": "vorstand", "datum": ab_min, "referenz": "Migration Prototyp – Beschluss nachtragen"}, "bezugspreisCt": _n0(a.get("tarifBezugCt")), "einspeisepreisCt": _n0(a.get("tarifEinspeisungCt")), "zeitfenster": [], "grundgebuehrMonat": _n0(a.get("grundgebuehrMonat")), "zaehlpunktgebuehrMonat": 0, "einmalgebuehrBeitritt": 0, "mitgliedsbeitragJahr": 0, "sozialtarif": {"bezugspreisCt": None, "kontingentPct": None}, "individuell": [], "status": "aktiv", **meta})
		mitglied_fuer, nr = {}, 0
		for t in tn:
			st = t.get("stamm") or {}
			schluessel = t.get("nutzerId") or f"name:{t.get('name')}"
			tst = _TSTATUS.get(t.get("status"), "entwurf")
			m = mitglied_fuer.get(schluessel)
			if not m:
				n = namen(t["nutzerId"]) if t.get("nutzerId") else None
				firma = t.get("name") if not n and t.get("name") else ""
				nr += 1
				m = {"id": neue_id("EMG"), "migriertAus": t.get("id"), "gemeinschaftId": g["id"], "kontoId": t.get("nutzerId") or None, "mitgliedsnummer": nr,
					"art": "kmu" if firma and re.search(r"gmbh|kg|og|bäckerei|hof|gasthof|tischlerei", firma, re.I) else "privat",
					"person": {"vorname": (n or {}).get("vorname") or "", "nachname": (n or {}).get("nachname") or "", "firma": firma, "strasse": "", "plz": st.get("plz") or "", "ort": st.get("ort") or "", "email": (n or {}).get("email") or "", "telefon": ""},
					"unternehmensgroesse": {"mitarbeiter": None, "umsatzMioEur": None, "bilanzMioEur": None, "nachweis": ""}, "steuerstatusErzeuger": "kleinunternehmer", "uid": "", "schutzbeduerftig": False, "iban": "", "sepaMandat": {"referenz": "", "datum": "", "status": ""},
					"rechnungsweg": "portal" if t.get("nutzerId") else "email", "abrechnungsrhythmus": "", "vertraege": [], "beitrittAm": t.get("ab") or "", "austrittZum": t.get("bis") or "", "status": _MSTATUS.get(tst, "antrag"), **meta}
				mitglied_fuer[schluessel] = m
				r["mitglieder"].append(m)
				if m["art"] == "kmu":
					r["warnungen"].append(f"{a.get('name')}: „{firma}“ als KMU übernommen – Mitgliedsart und Steuerstatus prüfen.")
			rolle = st.get("rolle") or "bezug"
			paare = []
			if st.get("zaehlpunkt"):
				paare.append((st["zaehlpunkt"], "erzeugung" if rolle == "einspeisung" else "verbrauch"))
			if st.get("zaehlpunktEinspeisung") and rolle != "bezug":
				paare.append((st["zaehlpunktEinspeisung"], "erzeugung"))
			if not paare:
				r["warnungen"].append(f"{a.get('name')}: Teilnahme {t.get('id')} ohne Zählpunkt – nur Mitglied übernommen.")
			for nummer, richtung in paare:
				p = zaehlpunkt_pruefen(nummer, netzbetreiber)
				if not p["ok"]:
					r["warnungen"].append(f"{a.get('name')}: Zählpunkt „{nummer}“ ungültig ({p['fehler']}) – übersprungen.")
					continue
				anlage_id = None
				if richtung == "erzeugung" and _n0(st.get("anlageKwp")) > 0:
					an = {"id": neue_id("EAN"), "migriertAus": t.get("id"), "gemeinschaftId": g["id"], "bezeichnung": f"PV {m['person']['firma'] or m['person']['nachname'] or 'Mitglied'}", "art": "pv", "engpassleistungKw": None, "kwp": _num(st["anlageKwp"]), "ausrichtung": None, "neigung": None, "standort": {"lat": None, "lon": None, "adresse": ""}, "eigentuemerMitgliedId": m["id"], "betreiber": "", "betriebsfuehrung": "", "nutzungsmodell": "ueberschuss", "foerderung": "keine", "inbetriebnahme": "", "hknRegistriert": False, "speicherKwh": None, "speicherLadequelle": "", "iotQuelle": "", "haushalt": m["art"] == "privat", "status": "aktiv", **meta}
					r["anlagen"].append(an)
					anlage_id = an["id"]
				sm = st.get("smartMeter")
				z = {"id": neue_id("EZP"), "migriertAus": t.get("id"), "zaehlpunktnummer": p["wert"], "netzbetreiberId": p["netzbetreiberId"] or nb, "nbNummer": p["nbNummer"], "plz": p["plz"], "richtung": richtung, "anlageId": anlage_id, "inhaberKontoId": m["kontoId"], "inhaberName": m["person"]["firma"] or " ".join(x for x in (m["person"]["vorname"], m["person"]["nachname"]) if x), "bezeichnung": "", "smartMeter": "nein" if sm is False or sm == "nein" else ("ja" if sm else "unbekannt"), "qhAktiv": tst == "aktiv", "nahebereichRef": g["nahebereichRef"], "auskunftAm": "", "netzebene": 7, "lieferant": "", "energieabnehmer": "", **meta}
				r["zaehlpunkte"].append(z)
				ab = t.get("ab") or ""
				r["teilnahmen"].append({
					"id": neue_id("ETN"), "migriertAus": t.get("id"), "zaehlpunktId": z["id"], "gemeinschaftId": g["id"], "mitgliedId": m["id"], "teilnahmefaktor": 100,
					"aufteilungsschluesselPct": (t.get("anteilPct") if t.get("anteilPct") is not None else None) if g["verteilmodell"] == "statisch" and richtung == "verbrauch" else None,
					"consentId": "", "gueltigAb": ab if tst in ("aktiv", "beendet") else "", "gueltigBis": (t.get("bis") or "") if tst == "beendet" else "",
					"tfHistorie": [{"gueltigAb": ab, "tf": 100, "prozessId": ""}] if ab and tst in ("aktiv", "beendet") else [],
					"status": tst, "beendetGrund": "abmeldung" if tst == "beendet" else "", "responsecode": "", "fristBis": "",
					"verlauf": [{"am": meta["erstelltAm"], "von": "", "nach": tst, "ereignis": "migration", "prozessId": "", "text": f"Übernahme aus dem Prototyp (Status „{t.get('status')}“)", "vonKonto": None}], **meta,
				})
		if any(t.get("status") == "aktiv" for t in tn):
			r["warnungen"].append(f"{a.get('name')}: Consent-IDs fehlen im Prototyp – nach der Übernahme EC_PODLIST anfordern und abgleichen.")
	return r


# Namen laut Vertrag (docs/EG-SCHNITTSTELLEN.md) für andere Pakete
rollen_von = eg_rollen
stufe_von = eg_stufe
