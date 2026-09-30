# Copyright (c) 2026, ÖkoInvest GmbH
#
# Compliance – Datenschutz & Geldwäsche: reine Logik OHNE Frappe-Import (tests/test_compliance_kern.py).
# 1:1-Spiegel von src/lib/plattform/compliance/{datenschutz,verdacht,sla,vvt}.js – bei Änderungen beide Seiten nachziehen.
# Frist Art. 12 Abs. 3 DSGVO (1 Monat, Verlängerung + 2 Monate; Monatsfrist nach VO (EWG) Nr. 1182/71), CH revDSG/DSV 30 Tage.
# Verdachtsfall: interner Workflow, KEIN Versand an die Meldestelle (FIU/A-FIU/MROS nur manuell über goAML).

import json
import os
from calendar import monthrange
from datetime import date, timedelta

DS_ARTEN = {
	"auskunft": {"label": "Auskunft", "norm": "Art. 15 DSGVO", "export": True},
	"berichtigung": {"label": "Berichtigung", "norm": "Art. 16 DSGVO"},
	"loeschung": {"label": "Löschung", "norm": "Art. 17 DSGVO"},
	"einschraenkung": {"label": "Einschränkung", "norm": "Art. 18 DSGVO"},
	"uebertragbarkeit": {"label": "Datenübertragbarkeit", "norm": "Art. 20 DSGVO", "export": True},
	"widerspruch": {"label": "Widerspruch", "norm": "Art. 21 DSGVO"},
}
DS_STATUS = {"eingegangen": "Eingegangen", "identitaet": "Identität wird geprüft", "in_bearbeitung": "In Bearbeitung", "verlaengert": "Frist verlängert", "erledigt": "Erledigt", "abgelehnt": "Abgelehnt"}
DS_TON = {"eingegangen": "warn", "identitaet": "warn", "in_bearbeitung": "info", "verlaengert": "warn", "erledigt": "ok", "abgelehnt": "neutral"}
DS_UEBERGAENGE = {
	"identitaet_anfordern": (["eingegangen"], "identitaet", ["notiz"]),
	"identitaet_bestaetigen": (["eingegangen", "identitaet"], "in_bearbeitung", ["notiz"]),
	"verlaengern": (["in_bearbeitung"], "verlaengert", ["begruendung"]),
	"erledigen": (["in_bearbeitung", "verlaengert"], "erledigt", ["ergebnis"]),
	"ablehnen": (["eingegangen", "identitaet", "in_bearbeitung", "verlaengert"], "abgelehnt", ["begruendung"]),
}
DS_OFFEN = ["eingegangen", "identitaet", "in_bearbeitung", "verlaengert"]


def _d(s):
	return date.fromisoformat(str(s)[:10])


def plus_monate(iso, n):
	d = _d(iso)
	m0 = d.month - 1 + int(n)
	j, m = d.year + m0 // 12, m0 % 12 + 1
	return date(j, m, min(d.day, monthrange(j, m)[1])).isoformat()


def plus_tage(iso, n):
	return (_d(iso) + timedelta(days=n)).isoformat()


def ds_frist(eingang_am, land="AT", verlaengert=False):
	if land == "CH":
		return plus_tage(eingang_am, 90 if verlaengert else 30)
	return plus_monate(eingang_am, 3 if verlaengert else 1)


def ds_frist_status(a, heute):
	frist = ds_frist(a["eingangAm"], a.get("land") or "AT", a.get("status") == "verlaengert" or bool(a.get("verlaengertAm")))
	if a.get("status") not in DS_OFFEN:
		return {"frist": frist, "restTage": None, "ampel": "erledigt", "ueberfaellig": False}
	rest = (_d(frist) - _d(heute)).days
	return {"frist": frist, "restTage": rest, "ampel": "rot" if rest < 0 else ("gelb" if rest <= 7 else "gruen"), "ueberfaellig": rest < 0}


def ds_uebergang(a, aktion, daten=None, heute=None):
	daten = daten or {}
	u = DS_UEBERGAENGE.get(aktion)
	if not u:
		return {"ok": False, "fehler": "Unbekannte Aktion."}
	von, nach, pflicht = u
	if a.get("status") not in von:
		return {"ok": False, "fehler": f"Aktion nicht möglich im Status „{DS_STATUS.get(a.get('status'), a.get('status'))}“."}
	for p in pflicht:
		if len(str(daten.get(p) or "").strip()) < 10:
			was = "eine Notiz zur Identitätsprüfung" if p == "notiz" else ("eine Begründung" if p == "begruendung" else "das Ergebnis")
			return {"ok": False, "fehler": f"Bitte {was} angeben (mind. 10 Zeichen)."}
	if aktion == "verlaengern":
		if a.get("land") == "CH":
			return {"ok": False, "fehler": "Für Anfragen nach Schweizer Recht ist keine pauschale Verlängerung vorgesehen – Verzögerung begründet mitteilen."}
		if a.get("verlaengertAm"):
			return {"ok": False, "fehler": "Die Frist wurde bereits verlängert."}
		if heute and heute > ds_frist(a["eingangAm"], a.get("land") or "AT"):
			return {"ok": False, "fehler": "Eine Verlängerung ist nur innerhalb der ersten Monatsfrist möglich (Art. 12 Abs. 3 DSGVO)."}
	if aktion == "erledigen" and a.get("art") == "loeschung" and daten.get("loeschErgebnis") not in ("geloescht", "gesperrt", "keine_daten"):
		return {"ok": False, "fehler": "Bitte das Löschergebnis wählen (gelöscht/anonymisiert, gesperrt wegen Aufbewahrungspflicht, keine Daten)."}
	if aktion == "erledigen" and DS_ARTEN.get(a.get("art"), {}).get("export") and not a.get("exportAm"):
		return {"ok": False, "fehler": "Bitte zuerst den Datenexport erstellen und prüfen (Auskunft/Übertragbarkeit)."}
	return {"ok": True, "nach": nach}


def ds_antwort_entwurf(a, frist):
	art = DS_ARTEN[a["art"]]
	de = lambda s: "/".join(reversed(str(s)[:10].split("-"))).replace("/", ".")  # noqa: E731
	stelle = "Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)" if a.get("land") == "CH" else ("zuständigen Datenschutz-Aufsichtsbehörde" if a.get("land") == "DE" else "Österreichischen Datenschutzbehörde")
	if a.get("status") == "verlaengert":
		return f"Ihre Anfrage ({art['label']}, {art['norm']}) vom {de(a['eingangAm'])} erfordert wegen ihrer Komplexität mehr Zeit. Wir beantworten sie bis spätestens {de(frist)}. Grund: {a.get('verlaengerungsgrund') or '…'}"
	if a.get("status") == "abgelehnt":
		return f"Wir können Ihrer Anfrage ({art['label']}) nicht entsprechen. Begründung: {a.get('begruendung') or '…'} Sie haben das Recht, Beschwerde bei der {stelle} einzulegen und einen gerichtlichen Rechtsbehelf einzulegen."
	return f"Wir bestätigen den Eingang Ihrer Anfrage ({art['label']}, {art['norm']}) vom {de(a['eingangAm'])} und beantworten sie bis spätestens {de(frist)}."


# ================================================================ Verdachtsfall

MELDESTELLEN = {
	"DE": {"name": "FIU – Zentralstelle für Finanztransaktionsuntersuchungen", "portal": "goAML Web (FIU)", "norm": "§ 43 GwG"},
	"AT": {"name": "Geldwäschemeldestelle (A-FIU) im Bundeskriminalamt", "portal": "goAML (A-FIU)", "norm": "§§ 365m1 ff. GewO 1994 (Gewerbetreibende) bzw. einschlägige Materiengesetze"},
	"CH": {"name": "Meldestelle für Geldwäscherei (MROS), fedpol", "portal": "goAML (MROS)", "norm": "Art. 9 GwG"},
}
VERDACHT_STATUS = {"erfasst": "Erfasst", "in_pruefung": "In Prüfung (Geldwäschebeauftragte/r)", "meldung_vorbereitet": "Meldung vorbereitet", "gemeldet": "Gemeldet", "keine_meldung": "Keine Meldung – dokumentiert", "abgeschlossen": "Abgeschlossen"}
VERDACHT_OFFEN = ["erfasst", "in_pruefung", "meldung_vorbereitet"]
VERDACHT_ANLAESSE = {"identitaet": "Zweifel an Identität / Dokumenten", "herkunft": "Mittelherkunft unplausibel", "sanktion": "Sanktions-/Embargobezug", "struktur": "Undurchsichtige Eigentums-/Kontrollstruktur",
	"transaktion": "Ungewöhnliche Transaktion (Betrag, Weg, Drittland)", "video": "Videoidentifizierung mit Verdacht", "sonstiges": "Sonstiges"}
VERDACHT_UEBERGAENGE = {
	"pruefen": (["erfasst"], "in_pruefung", []),
	"meldung_vorbereiten": (["in_pruefung"], "meldung_vorbereitet", ["begruendung"]),
	"gemeldet": (["meldung_vorbereitet"], "gemeldet", ["aktenzeichen", "gemeldetAm"]),
	"keine_meldung": (["in_pruefung", "meldung_vorbereitet"], "keine_meldung", ["begruendung"]),
	"abschliessen": (["gemeldet", "keine_meldung"], "abgeschlossen", []),
}


def verdacht_aufbewahrung_bis(abgeschlossen_am, land="AT"):
	j = int(str(abgeschlossen_am or "")[:4] or date.today().year)
	return f"{j + (10 if land == 'CH' else 5)}-12-31"


def verdacht_uebergang(f, aktion, daten=None, heute=None, ich_id=None):
	import re

	daten = daten or {}
	u = VERDACHT_UEBERGAENGE.get(aktion)
	if not u:
		return {"ok": False, "fehler": "Unbekannte Aktion."}
	von, nach, pflicht = u
	if f.get("status") not in von:
		return {"ok": False, "fehler": f"Aktion nicht möglich im Status „{VERDACHT_STATUS.get(f.get('status'), f.get('status'))}“."}
	for p in pflicht:
		w = str(daten.get(p) or "").strip()
		if p == "begruendung" and len(w) < 20:
			return {"ok": False, "fehler": "Bitte die Abwägung nachvollziehbar begründen (mind. 20 Zeichen)."}
		if p == "aktenzeichen" and not re.fullmatch(r"[A-Za-z0-9./ -]{3,40}", w):
			return {"ok": False, "fehler": "Bitte das Aktenzeichen/die Referenz der Meldestelle angeben."}
		if p == "gemeldetAm" and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}", w) or (heute and w > heute)):
			return {"ok": False, "fehler": "Bitte das Meldedatum angeben (nicht in der Zukunft)."}
	if aktion in ("meldung_vorbereiten", "keine_meldung") and ich_id and f.get("erfasstVon") == ich_id and not f.get("alleinEntscheidung"):
		return {"ok": False, "fehler": "Die Entscheidung trifft eine andere Person als die meldende (Vier-Augen-Prinzip)."}
	return {"ok": True, "nach": nach}


# ================================================================ KYC-SLA

KYC_SLA = {"kyc": 3, "kyb": 5, "zweitpruefung": 2}


def werktage(a, b):
	von, bis = _d(a), _d(b)
	vz = 1 if bis >= von else -1
	n, d = 0, von
	while (d < bis) if vz > 0 else (d > bis):
		d += timedelta(days=vz)
		if d.weekday() < 5:
			n += vz
	return n


def plus_werktage(iso, n):
	d, rest = _d(iso), n
	while rest > 0:
		d += timedelta(days=1)
		if d.weekday() < 5:
			rest -= 1
	return d.isoformat()


def kyc_sla(f, heute, sla=None):
	sla = sla or KYC_SLA
	offen = f.get("status") in ("eingereicht", "in_pruefung", "zweitpruefung")
	start = ((f.get("pruefung") or {}).get("erstAm") or f.get("eingereichtAm")) if f.get("status") == "zweitpruefung" else f.get("eingereichtAm")
	if not offen or not start:
		return {"ampel": "keine", "zielTage": None, "faelligAm": None, "restWerktage": None}
	ziel = sla["zweitpruefung"] if f.get("status") == "zweitpruefung" else (sla["kyb"] if f.get("kontotyp") == "unternehmen" else sla["kyc"])
	faellig = plus_werktage(str(start)[:10], ziel)
	rest = werktage(heute, faellig)
	return {"zielTage": ziel, "faelligAm": faellig, "restWerktage": rest, "ampel": "rot" if rest < 0 else ("gelb" if rest == 0 else "gruen")}


# ================================================================ VVT (Art. 30 DSGVO) – Entwurf, Quelle: vvt.json (aus src/lib/plattform/compliance/vvt.js)

VVT_STAND = "2026-09-30"
VVT_VERANTWORTLICHER = "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething, Österreich (FN 541505g)"


def vvt():
	with open(os.path.join(os.path.dirname(__file__), "compliance_vvt.json"), encoding="utf-8") as f:
		return json.load(f)


def vvt_csv(liste=None):
	liste = liste if liste is not None else vvt()["taetigkeiten"]

	def feld(v):
		s = str(v if v is not None else "")
		if s[:1] in ("=", "+", "-", "@", "\t", "\r"):
			s = "'" + s
		return '"' + s.replace('"', '""') + '"' if any(c in s for c in ';"\r\n') else s

	kopf = ["Nr.", "Verarbeitungstätigkeit", "Zweck", "Rechtsgrundlage", "Betroffene", "Datenkategorien", "Empfänger", "Drittland", "Löschfrist", "Offene Punkte"]
	zeilen = [";".join(feld(x) for x in [i + 1, v["titel"], v["zweck"], v["rechtsgrundlage"], v["betroffene"], v["daten"], v["empfaenger"], v["drittland"], v["loeschung"], v.get("offen") or ""]) for i, v in enumerate(liste)]
	return "﻿" + "\r\n".join([f"Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) – Entwurf, Stand {VVT_STAND};;;;;;;;;", f"Verantwortlicher: {feld(VVT_VERANTWORTLICHER)};;;;;;;;;", ";".join(kopf), *zeilen]) + "\r\n"
