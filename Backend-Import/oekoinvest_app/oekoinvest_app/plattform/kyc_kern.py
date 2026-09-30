# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC/KYB – Identitäts- und Firmenprüfung: Kern (1:1 zu src/lib/plattform/kyc.js, sanktionsliste.js und
# backend/demo/kycRegeln.js). Vertrag: docs/API.md, Abschnitt „KYC/KYB“.
#
# Teil 1 (rein, ohne Frappe – mit `python -m unittest` testbar): IBAN-Prüfziffer, Kontoinhaber-Abgleich, Namens-
#   normalisierung, Jaro-Winkler, Sanktionsabgleich, Import der EU-Finanzsanktionsliste (XML/CSV), Risikoeinstufung,
#   Anforderungen/Fortschritt, Fristen (Aufbewahrung), Gating-Entscheidung.
# Teil 2 (Frappe): Einstellungen, kyc_status(konto|organisation), kyc_sperre(schritt, …) für andere Module,
#   ergebnis_anhaengen(fall_id, eintrag) für externe Dienste, Verschlüsselung der Unterlagen (AES-256-GCM).
#
# FÜR ANDERE TEAMS:
#   from oekoinvest_app.plattform.kyc_kern import kyc_status, kyc_sperre, ergebnis_anhaengen
#   kyc_status(konto="U-26-…")                    → {"status", "verifiziert", "bank": {...}, "eigentum": [...], …}
#   kyc_sperre("auszahlung", konto_id=…, flaeche_id=…)   → wirft frappe.ValidationError (HTTP 417 → Website 422/409) mit Hinweis
#   ergebnis_anhaengen("KY-26-…", {"quelle": "idnow", "art": "video_ident", "ergebnis": "ok", "zusammenfassung": "…"})
#
# Rechtlicher Rahmen: siehe docs/PLATTFORM.md „KYC/KYB“ – vorsichtig formuliert, keine Rechtsberatung.

import csv
import hashlib
import io
import json
import re
import unicodedata
from datetime import date, datetime, timedelta

# ================================================================ Teil 1 – reine Regeln

KONTOTYPEN = {"privat": "Privatperson", "unternehmen": "Unternehmen"}
STATUS = {
	"offen": "Nicht abgeschlossen", "eingereicht": "Eingereicht", "in_pruefung": "In Prüfung", "zweitpruefung": "Zweitprüfung (Vier-Augen)",
	"nachgefordert": "Unterlagen nachgefordert", "verifiziert": "Verifiziert", "abgelehnt": "Abgelehnt", "abgelaufen": "Erneute Prüfung nötig", "geloescht": "Gelöscht",
}
BEARBEITBAR = ("offen", "nachgefordert", "abgelaufen")
WARTESCHLANGE = ("eingereicht", "in_pruefung", "zweitpruefung")
UEBERGAENGE = [
	(("offen", "nachgefordert", "abgelaufen"), "eingereicht", "nutzer"),
	(("eingereicht",), "in_pruefung", "compliance"),
	(("eingereicht", "in_pruefung"), "verifiziert", "compliance"),
	(("eingereicht", "in_pruefung"), "zweitpruefung", "compliance"),
	(("eingereicht", "in_pruefung", "zweitpruefung"), "nachgefordert", "compliance"),
	(("eingereicht", "in_pruefung", "zweitpruefung"), "abgelehnt", "compliance"),
	(("zweitpruefung",), "verifiziert", "compliance"),
	(("verifiziert",), "abgelaufen", "system"),
	(("verifiziert", "abgelehnt"), "offen", "nutzer"),
]


def uebergang_erlaubt(von, nach, wer):
	return any(nach == z and von in vs and wer == w for vs, z, w in UEBERGAENGE)


DOKUMENTE = {
	"ausweis_vorne": ("Personalausweis – Vorderseite", "person", ["lesbar", "gueltig", "datenStimmen"]),
	"ausweis_hinten": ("Personalausweis – Rückseite", "person", ["lesbar", "gueltig"]),
	"pass_datenseite": ("Reisepass – Datenseite", "person", ["lesbar", "gueltig", "datenStimmen"]),
	"selfie": ("Foto (optional)", "person", ["lesbar", "datenStimmen"]),
	"adressnachweis": ("Adressnachweis (optional)", "person", ["lesbar", "aktuell", "datenStimmen"]),
	"registerauszug": ("Registerauszug", "fall", ["lesbar", "aktuell", "datenStimmen"]),
	"gesellschafterliste": ("Gesellschafterliste (optional)", "fall", ["lesbar", "aktuell", "uboPlausibel"]),
	"satzung": ("Gesellschaftsvertrag / Satzung (optional)", "fall", ["lesbar"]),
	"transparenzregister": ("Auszug Transparenzregister / WiEReG / Erklärung wB", "fall", ["lesbar", "aktuell", "uboPlausibel"]),
	"vertreter_ausweis": ("Ausweis vertretungsberechtigte Person", "vertreter", ["lesbar", "gueltig", "datenStimmen"]),
	"vollmacht": ("Vollmacht", "fall", ["lesbar", "gueltig", "datenStimmen"]),
	"eigentumsnachweis": ("Eigentumsnachweis (Grundbuchauszug)", "flaeche", ["lesbar", "aktuell", "datenStimmen"]),
	"mittelherkunft": ("Nachweis Herkunft der Mittel", "fall", ["lesbar", "datenStimmen"]),
	"bank_nachweis": ("Kontonachweis (optional)", "fall", ["lesbar", "datenStimmen"]),
}
PRUEFPUNKTE = {
	"lesbar": "Vollständig lesbar, keine Manipulationsspuren",
	"gueltig": "Gültig (nicht abgelaufen, echt, unterschrieben)",
	"datenStimmen": "Name / Geburtsdatum bzw. Firma stimmen überein",
	"aktuell": "Aktuell (Registerauszug nicht älter als 3 Monate)",
	"uboPlausibel": "Wirtschaftlich Berechtigte plausibel (≥ 25 % bzw. Kontrolle)",
}
REGISTERAUSZUG_MAX_TAGE = 92
UPLOAD_MAX_BYTES = 10 * 1024 * 1024
UPLOAD_TYPEN = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}
KONTROLLE_ARTEN = ("anteil", "stimmrechte", "kontrolle", "fiktiv")
MITTEL_QUELLEN = ("eigenkapital", "einkommen", "verkauf", "erbe", "fonds", "finanzierung", "sonstiges")
TICKETS = {"bis250k": 250000, "bis1m": 1000000, "bis5m": 5000000, "ueber5m": 50000000}
SCHRITTE = {
	"nda": ("NDA-Freigabe / Datenraum", "Um den Datenraum zu öffnen, bitte Verifizierung abschließen."),
	"loi": ("Absichtserklärung (LOI)", "Um eine Absichtserklärung abzugeben, bitte Verifizierung abschließen."),
	"gebot": ("Gebot im Bieterverfahren", "Um ein Gebot abzugeben, bitte Verifizierung abschließen."),
	"zuschlag": ("Zuschlag", "Ein Zuschlag ist erst nach abgeschlossener Verifizierung des Bieters möglich."),
	"veroeffentlichung": ("Projekt-Veröffentlichung", "Projekte werden erst nach abgeschlossener Verifizierung des Anbieters (KYB) veröffentlicht."),
	"auszahlung": ("Pachtauszahlung / Gutschrift", "Auszahlungen setzen eine abgeschlossene Verifizierung, eine geprüfte Bankverbindung und einen Eigentumsnachweis voraus."),
	"contracting": ("Contracting-Vertrag", "Contracting-Verträge setzen eine abgeschlossene Verifizierung des Kunden (KYB) voraus."),
	"codevelopment": ("Co-Development (Projektentwicklung)", "Die Co-Development-Freigabe eines Entwicklungsprojekts setzt eine abgeschlossene Verifizierung voraus."),
}

# Investorentyp aus dem Suchprofil (fach/suchprofil.py INVESTOR_TYPEN) → Vorgaben für den KYC-Fall – wie KYC_INVESTOR_TYPEN in kyc.js:
# (vorgeschlagener Kontotyp, zusätzliche Pflichtunterlagen nur bei KYB, beaufsichtigt?, Hinweis)
INVESTOR_TYPEN = {
	"family_office": ("Family Office", "unternehmen", ("gesellschafterliste",), False, "Family Office: Häufig mehrstufige Holding- oder Stiftungsstrukturen – bitte die wirtschaftlich Berechtigten bis zur natürlichen Person angeben und die Gesellschafterliste beifügen."),
	"fonds": ("Fonds / Asset Manager (AIF, Spezialfonds)", "unternehmen", ("satzung",), True, "Fonds / Asset Manager: Angaben zur Kapitalverwaltungsgesellschaft bzw. zum Fonds (Register, Aufsicht) und Gesellschaftsvertrag bzw. Anlagebedingungen beifügen. Bei beaufsichtigten Einrichtungen können vereinfachte Sorgfaltspflichten in Betracht kommen – darüber entscheidet die Compliance."),
	"stadtwerk": ("Stadtwerk / kommunales Unternehmen", "unternehmen", ("gesellschafterliste",), False, "Stadtwerk / kommunales Unternehmen: Gesellschafterliste (Beteiligung der Kommune) beifügen. Ist keine natürliche Person wirtschaftlich berechtigt, sind in der Regel die gesetzlichen Vertreter als fiktive wirtschaftlich Berechtigte anzugeben."),
	"evu": ("Energieversorger", "unternehmen", ("gesellschafterliste",), False, "Energieversorger: Konzern- bzw. Beteiligungsstruktur mit der Gesellschafterliste offenlegen."),
	"ipp": ("Unabhängiger Stromerzeuger (IPP)", "unternehmen", ("gesellschafterliste",), False, "Unabhängiger Stromerzeuger (IPP): Konzern- bzw. Beteiligungsstruktur mit der Gesellschafterliste offenlegen."),
	"versicherung": ("Versicherung / Pensionskasse", "unternehmen", ("satzung",), True, "Versicherung / Pensionskasse: Satzung beifügen und die zuständige Aufsicht angeben. Bei beaufsichtigten Einrichtungen können vereinfachte Sorgfaltspflichten in Betracht kommen – darüber entscheidet die Compliance."),
	"unternehmen": ("Unternehmen (Eigenversorgung, PPA)", "unternehmen", (), False, "Unternehmen: Prüfung der Firma (KYB) mit wirtschaftlich Berechtigten und vertretungsberechtigten Personen."),
	"privat": ("Privatinvestor", "privat", (), False, "Privatinvestor: Prüfung als natürliche Person; bitte die Herkunft der Mittel angeben."),
	"genossenschaft": ("Energiegenossenschaft / Bürgerenergie", "unternehmen", ("satzung",), False, "Energiegenossenschaft: Satzung beifügen. Bei breiter Mitgliederstruktur sind in der Regel die Vorstandsmitglieder als fiktive wirtschaftlich Berechtigte anzugeben."),
}


def investor_vorgaben(investor_typ):
	"""Wie kycInvestorVorgaben() in kyc.js: {"typ", "label", "kontotyp", "pflichtDokumente", "reguliert", "hinweis"} oder None."""
	x = INVESTOR_TYPEN.get(investor_typ or "")
	if not x:
		return None
	return {"typ": investor_typ, "label": x[0], "kontotyp": x[1], "pflichtDokumente": list(x[2]), "reguliert": x[3], "hinweis": x[4]}


def einstellungen_standard():
	return {
		"gating": {s: True for s in SCHRITTE},
		"geltung": None,  # None = site_config „oekoinvest_kyc_gating“ bzw. „alle“; "alle" | "pilot" | "aus"
		"pilotKonten": [],
		"vierAugenBeiHoch": True,
		"vierAugenImmer": False,
		"trefferSchwelle": 0.88,
		"hochrisikoLaender": ["KP", "IR", "MM"],  # FATF „Call for Action“; EU-Liste (Delegierte VO (EU) 2016/1675 i. d. j. g. F.) pflegen
		"wiederholungMonate": {"niedrig": 36, "mittel": 24, "hoch": 12},
		"mittelherkunftNachweisAb": 1000000,
		"aufbewahrungJahre": 5,
		"erinnerungAusweisTage": 30,
	}


# ---------------------------------------------------------------- IBAN

IBAN_LAENGE = {
	"AD": 24, "AT": 20, "BE": 16, "BG": 22, "CH": 21, "CY": 28, "CZ": 24, "DE": 22, "DK": 18, "EE": 20, "ES": 24, "FI": 18, "FR": 27, "GB": 22, "GI": 23,
	"GR": 27, "HR": 21, "HU": 28, "IE": 22, "IS": 26, "IT": 27, "LI": 21, "LT": 20, "LU": 20, "LV": 21, "MC": 27, "MT": 31, "NL": 18, "NO": 15, "PL": 28,
	"PT": 25, "RO": 24, "SE": 24, "SI": 19, "SK": 24, "SM": 27, "VA": 22,
}


def iban_normalisieren(s):
	return re.sub(r"[\s-]", "", str(s or "").upper())


def iban_pruefen(eingabe):
	"""ISO 13616 (mod 97 = 1) + Länge je Land → {"ok", "iban", "land", "fehler"}"""
	iban = iban_normalisieren(eingabe)
	if not iban:
		return {"ok": False, "iban": "", "land": "", "fehler": "Bitte geben Sie eine IBAN an."}
	if not re.fullmatch(r"[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}", iban):
		return {"ok": False, "iban": iban, "land": iban[:2], "fehler": "Die IBAN hat ein ungültiges Format."}
	land = iban[:2]
	if land in IBAN_LAENGE and len(iban) != IBAN_LAENGE[land]:
		return {"ok": False, "iban": iban, "land": land, "fehler": f"Eine IBAN aus {land} hat {IBAN_LAENGE[land]} Zeichen."}
	zahl = "".join(str(ord(c) - 55) if c.isalpha() else c for c in iban[4:] + iban[:4])
	if int(zahl) % 97 != 1:
		return {"ok": False, "iban": iban, "land": land, "fehler": "Die Prüfziffer der IBAN stimmt nicht – bitte Eingabe prüfen."}
	return {"ok": True, "iban": iban, "land": land, "fehler": ""}


def iban_maskiert(iban):
	i = iban_normalisieren(iban)
	return f"{i[:2]}•• •••• {i[-4:]}" if i else ""


# ---------------------------------------------------------------- Namen

_RECHTSFORMEN = re.compile(r"\b(gmbh|ag|kg|og|ohg|gbr|ug|haftungsbeschrankt|mbh|co|eg|ev|se|sa|sarl|ltd|llc|inc|kgaa|stiftung|verein|genossenschaft|e\.?\s?u|eu)\b")
_FUELL = {"und", "the", "von", "van", "der", "de", "dr", "mag", "ing", "prof"}


def name_normalisieren(s):
	t = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	t = re.sub(r"\(demo\)|\(fiktiv\)|\(test\)", " ", t)
	t = re.sub(r"[^a-z0-9 ]+", " ", t)
	return re.sub(r"\s+", " ", t).strip()


def name_tokens(s, firma=False):
	n = name_normalisieren(s)
	if firma:
		n = re.sub(r"\s+", " ", _RECHTSFORMEN.sub(" ", n)).strip()
	return [t for t in n.split(" ") if len(t) > 1 and t not in _FUELL]


def kontoinhaber_passt(inhaber, vorname="", nachname="", firma=""):
	t = set(name_tokens(inhaber, firma=bool(firma)))
	if not t:
		return False
	if firma:
		f = name_tokens(firma, firma=True)
		return bool(f) and all(x in t for x in f)
	nach = name_tokens(nachname)
	if not nach:
		return False
	vor = name_tokens(vorname)
	vorname_ok = not vor or vor[0] in t or any(len(x) == 1 and x == vor[0][0] for x in t)
	return all(x in t for x in nach) and vorname_ok


def jaro_winkler(a, b):
	if a == b:
		return 1.0 if a else 0.0
	if not a or not b:
		return 0.0
	weite = max(0, max(len(a), len(b)) // 2 - 1)
	ta = [False] * len(a)
	tb = [False] * len(b)
	treffer = 0
	for i, ch in enumerate(a):
		for j in range(max(0, i - weite), min(len(b), i + weite + 1)):
			if tb[j] or ch != b[j]:
				continue
			ta[i] = tb[j] = True
			treffer += 1
			break
	if not treffer:
		return 0.0
	k = wechsel = 0
	for i, ch in enumerate(a):
		if not ta[i]:
			continue
		while not tb[k]:
			k += 1
		if ch != b[k]:
			wechsel += 1
		k += 1
	jaro = (treffer / len(a) + treffer / len(b) + (treffer - wechsel / 2) / treffer) / 3
	praefix = 0
	while praefix < 4 and praefix < len(a) and praefix < len(b) and a[praefix] == b[praefix]:
		praefix += 1
	return jaro + praefix * 0.1 * (1 - jaro)


def _tok(s):
	return [t for t in name_normalisieren(s).split(" ") if len(t) > 1]


def namens_aehnlichkeit(a, b):
	ta, tb = _tok(a), _tok(b)
	if not ta or not tb:
		return 0.0
	if ta == tb:
		return 1.0
	kurz, lang = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
	frei = list(lang)
	summe = 0.0
	for t in kurz:
		best, bi = 0.0, -1
		for i, x in enumerate(frei):
			s = jaro_winkler(t, x)
			if s > best:
				best, bi = s, i
		summe += best
		if bi >= 0:
			frei.pop(bi)
	return (summe / len(kurz)) * (0.85 + 0.15 * (len(kurz) / len(lang)))


def _geburtsdatum_vergleich(soll, liste):
	s = str(soll or "")[:10]
	if not s or not liste:
		return "unbekannt"
	if s in liste:
		return "gleich"
	if any(len(d) == 4 and s.startswith(d) for d in liste) or any(d[:4] == s[:4] for d in liste):
		return "jahr"
	return "abweichend"


def sanktions_abgleich(pruefling, eintraege, schwelle=0.88):
	"""pruefling: {"name", "geburtsdatum", "art": person|organisation, "rolle"} → Treffer ≥ Schwelle (sortiert)."""
	treffer = []
	name = (pruefling or {}).get("name") or ""
	if not _tok(name):
		return treffer
	art = pruefling.get("art")
	for e in eintraege or []:
		typ = e.get("typ") or ""
		if art == "organisation" and typ == "person":
			continue
		if art == "person" and typ and typ != "person":
			continue
		best, best_name = 0.0, ""
		for n in e.get("namen") or []:
			s = namens_aehnlichkeit(name, n)
			if s > best:
				best, best_name = s, n
		if best < schwelle - 0.08:
			continue
		gd = _geburtsdatum_vergleich(pruefling.get("geburtsdatum"), e.get("geburtsdaten") or []) if art == "person" else "unbekannt"
		score = best + {"gleich": 0.08, "jahr": 0.03, "abweichend": -0.12}.get(gd, 0)
		score = min(1.0, score)
		if score >= schwelle:
			treffer.append({"eintragId": str(e.get("id")), "euRef": e.get("euRef") or "", "name": best_name, "score": round(score, 3), "geburtsdatum": gd, "programm": e.get("programm") or "", "pruefling": pruefling.get("rolle") or ""})
	return sorted(treffer, key=lambda t: -t["score"])[:10]


def prueflinge_aus_fall(fall):
	f = fall or {}
	liste = []
	p = f.get("person") or {}
	if p.get("vorname") or p.get("nachname"):
		liste.append({"name": f"{p.get('vorname') or ''} {p.get('nachname') or ''}".strip(), "geburtsdatum": p.get("geburtsdatum"), "art": "person", "rolle": "Person"})
	if f.get("kontotyp") == "unternehmen" and (f.get("firma") or {}).get("name"):
		liste.append({"name": f["firma"]["name"], "art": "organisation", "rolle": "Unternehmen"})
	for u in f.get("ubos") or []:
		liste.append({"name": f"{u.get('vorname') or ''} {u.get('nachname') or ''}".strip(), "geburtsdatum": u.get("geburtsdatum"), "art": "person", "rolle": "Wirtschaftlich Berechtigter"})
	for x in f.get("vertreter") or []:
		liste.append({"name": f"{x.get('vorname') or ''} {x.get('nachname') or ''}".strip(), "geburtsdatum": x.get("geburtsdatum"), "art": "person", "rolle": "Vertreter"})
	gesehen, out = set(), []
	for x in liste:
		k = (name_normalisieren(x["name"]), x.get("geburtsdatum") or "", x["art"])
		if x["name"] and k not in gesehen:
			gesehen.add(k)
			out.append(x)
	return out


# ---------------------------------------------------------------- EU-Finanzsanktionsliste (Import)

def _attr(tag):
	import html

	return {m.group(1).split(":")[-1]: html.unescape(m.group(2)) for m in re.finditer(r'([\w:.-]+)\s*=\s*"([^"]*)"', tag)}


def eu_xml_lesen(xml):
	"""EU-FSF-XML v1.1 → [{"id", "euRef", "typ", "namen", "geburtsdaten", "laender", "programm"}] (Struktur vor Einsatz prüfen)."""
	text = xml.decode("utf-8", "replace") if isinstance(xml, bytes) else str(xml or "")
	out = []
	for m in re.finditer(r"<(?:\w+:)?sanctionEntity\b([^>]*)>(.*?)</(?:\w+:)?sanctionEntity>", text, re.S):
		kopf, inhalt = _attr(m.group(1)), m.group(2)
		namen = []
		for n in re.finditer(r"<(?:\w+:)?nameAlias\b([^>]*?)/?>", inhalt):
			a = _attr(n.group(1))
			ganz = a.get("wholeName") or " ".join(x for x in (a.get("firstName"), a.get("middleName"), a.get("lastName")) if x)
			if ganz and ganz not in namen:
				namen.append(ganz)
		daten = []
		for b in re.finditer(r"<(?:\w+:)?birthdate\b([^>]*?)/?>", inhalt):
			a = _attr(b.group(1))
			d = a.get("birthdate") or ""
			if not d and a.get("year"):
				d = a["year"] + (f"-{int(a['monthOfYear']):02d}" + (f"-{int(a['dayOfMonth']):02d}" if a.get("dayOfMonth") else "") if a.get("monthOfYear") else "")
			if d and d not in daten:
				daten.append(d)
		laender = sorted(set(re.findall(r'countryIso2Code="([A-Z]{2})"', inhalt)))
		typ = (re.search(r'<(?:\w+:)?subjectType\b[^>]*code="([^"]+)"', inhalt) or [None, ""])[1]
		programm = (re.search(r'<(?:\w+:)?regulation\b[^>]*programme="([^"]+)"', inhalt) or [None, ""])[1]
		if namen:
			out.append({"id": str(kopf.get("logicalId") or kopf.get("euReferenceNumber") or len(out) + 1), "euRef": kopf.get("euReferenceNumber") or "", "typ": "person" if typ == "person" else ("organisation" if typ else ""), "namen": namen, "geburtsdaten": daten, "laender": laender, "programm": programm})
	return out


def eu_csv_lesen(csv_text):
	"""EU-FSF-CSV v1.1 (Semikolon, eine Zeile je Alias/Datum) → Einträge je Entity_LogicalId."""
	text = csv_text.decode("utf-8-sig", "replace") if isinstance(csv_text, bytes) else str(csv_text or "").lstrip("﻿")
	erste = text.split("\n", 1)[0]
	trenner = ";" if erste.count(";") >= erste.count(",") else ","
	zeilen = list(csv.reader(io.StringIO(text), delimiter=trenner))
	if not zeilen:
		return []
	kopf = [h.strip() for h in zeilen[0]]

	def spalte(*namen):
		for n in namen:
			for i, h in enumerate(kopf):
				if h.lower() == n.lower():
					return i
		return -1

	i_id, i_ref, i_name = spalte("Entity_LogicalId", "id"), spalte("Entity_EU_ReferenceNumber", "euRef"), spalte("NameAlias_WholeName", "name")
	i_vor, i_nach, i_geb, i_jahr = spalte("NameAlias_FirstName"), spalte("NameAlias_LastName"), spalte("BirthDate_BirthDate", "geburtsdatum"), spalte("BirthDate_Year")
	i_typ, i_prog, i_land = spalte("Entity_SubjectType", "Entity_SubjectType_ClassificationCode", "typ"), spalte("Entity_Regulation_Programme", "programm"), spalte("Citizenship_CountryIso2Code", "Address_CountryIso2Code", "land")
	if i_id < 0 or (i_name < 0 and i_nach < 0):
		raise ValueError("CSV-Kopfzeile unbekannt: Spalten Entity_LogicalId und NameAlias_WholeName erwartet.")
	wert = lambda z, i: (z[i].strip() if 0 <= i < len(z) else "")  # noqa: E731
	daten = {}
	for z in zeilen[1:]:
		eid = wert(z, i_id)
		if not eid:
			continue
		e = daten.setdefault(eid, {"id": eid, "euRef": wert(z, i_ref), "typ": "", "namen": [], "geburtsdaten": [], "laender": [], "programm": wert(z, i_prog)})
		name = wert(z, i_name) or " ".join(x for x in (wert(z, i_vor), wert(z, i_nach)) if x)
		if name and name not in e["namen"]:
			e["namen"].append(name)
		geb = wert(z, i_geb) or wert(z, i_jahr)
		if geb and geb not in e["geburtsdaten"]:
			e["geburtsdaten"].append(geb)
		land = wert(z, i_land)
		if re.fullmatch(r"[A-Z]{2}", land) and land not in e["laender"]:
			e["laender"].append(land)
		typ = wert(z, i_typ).lower()
		if typ and not e["typ"]:
			e["typ"] = "person" if typ in ("person", "p") else "organisation"
	return [e for e in daten.values() if e["namen"]]


# ---------------------------------------------------------------- Datum, Fristen

def heute_iso():
	return date.today().isoformat()


def tage_bis(datum_iso, heute=None):
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(datum_iso or "")):
		return None
	h = date.fromisoformat(heute) if heute else date.today()
	return (date.fromisoformat(str(datum_iso)) - h).days


def monate_spaeter(datum_iso, monate):
	d = date.fromisoformat(str(datum_iso)[:10])
	m = d.month - 1 + monate
	jahr, monat = d.year + m // 12, m % 12 + 1
	import calendar

	return date(jahr, monat, min(d.day, calendar.monthrange(jahr, monat)[1])).isoformat()


def loeschen_ab(ende_iso, jahre=5):
	"""5 Jahre ab Schluss des Kalenderjahres, in dem die Geschäftsbeziehung endete (§ 8 Abs. 4 GwG) → 01.01. des Folgejahres."""
	if not re.match(r"\d{4}-\d{2}-\d{2}", str(ende_iso or "")):
		return None
	return f"{int(str(ende_iso)[:4]) + jahre + 1}-01-01"


# ---------------------------------------------------------------- Anforderungen, Risiko

def _gefuellt(*w):
	return all(x is not None and str(x).strip() != "" for x in w)


def anforderungen(fall, rollen=(), flaechen=(), einstellungen=None):
	"""Wie kycAnforderungen() in kyc.js: [{"id", "gruppe", "label", "pflicht", "erfuellt", "dokumentArt"?, "flaecheId"?, "personId"?}]"""
	e = {**einstellungen_standard(), **(einstellungen or {})}
	f = fall or {}
	docs = [d for d in f.get("dokumente") or [] if not d.get("geloescht") and d.get("status") != "abgelehnt"]

	def hat(art, pred=lambda d: True):
		return any(d.get("art") == art and pred(d) for d in docs)

	a = []

	def add(**x):
		a.append({"pflicht": True, **x})

	typ = f.get("kontotyp") or ""
	add(id="kontotyp", gruppe="Start", label="Kontotyp gewählt", erfuellt=typ in KONTOTYPEN)
	it = investor_vorgaben(f.get("investorTyp"))
	if it:
		add(id="investortyp", gruppe="Start", label=f"Investorentyp (aus Ihrem Suchprofil): {it['label']}", pflicht=False, erfuellt=True, hinweis=it["hinweis"])
	if not typ:
		return a
	p = f.get("person") or {}
	adr = p.get("adresse") or {}
	add(id="person", gruppe="Angaben", label="Angaben zur Person", erfuellt=_gefuellt(p.get("vorname"), p.get("nachname"), p.get("geburtsdatum"), p.get("geburtsort"), p.get("staatsangehoerigkeit"), adr.get("strasse"), adr.get("plz"), adr.get("ort"), adr.get("land")))
	aw = p.get("ausweis") or {}
	t = tage_bis(aw.get("gueltigBis"))
	add(id="ausweis_angaben", gruppe="Angaben", label="Ausweisdaten", erfuellt=_gefuellt(aw.get("art"), aw.get("nummer"), aw.get("behoerde"), aw.get("gueltigBis")) and t is not None and t >= 0)
	if aw.get("art") == "reisepass":
		add(id="doc_pass", gruppe="Unterlagen", label=DOKUMENTE["pass_datenseite"][0], dokumentArt="pass_datenseite", erfuellt=hat("pass_datenseite"))
	else:
		add(id="doc_ausweis_vorne", gruppe="Unterlagen", label=DOKUMENTE["ausweis_vorne"][0], dokumentArt="ausweis_vorne", erfuellt=hat("ausweis_vorne"))
		add(id="doc_ausweis_hinten", gruppe="Unterlagen", label=DOKUMENTE["ausweis_hinten"][0], dokumentArt="ausweis_hinten", erfuellt=hat("ausweis_hinten"))
	add(id="doc_selfie", gruppe="Unterlagen", label=DOKUMENTE["selfie"][0], dokumentArt="selfie", pflicht=False, erfuellt=hat("selfie"))
	if typ == "unternehmen":
		fi = f.get("firma") or {}
		aktuell = lambda d: not d.get("ausgestelltAm") or (tage_bis(d.get("ausgestelltAm")) or 0) >= -REGISTERAUSZUG_MAX_TAGE  # noqa: E731
		add(id="firma", gruppe="Unternehmen", label="Angaben zum Unternehmen", erfuellt=_gefuellt(fi.get("name"), fi.get("rechtsform"), fi.get("registernummer"), fi.get("land"), fi.get("sitz")))
		add(id="doc_registerauszug", gruppe="Unternehmen", label="Registerauszug (≤ 3 Monate)", dokumentArt="registerauszug", erfuellt=hat("registerauszug", aktuell))
		add(id="doc_transparenzregister", gruppe="Unternehmen", label=DOKUMENTE["transparenzregister"][0], dokumentArt="transparenzregister", erfuellt=hat("transparenzregister"))
		ubos = f.get("ubos") or []
		ubo_ok = bool(ubos) and all(_gefuellt(u.get("vorname"), u.get("nachname"), u.get("geburtsdatum"), u.get("wohnsitzland"), u.get("kontrolleArt")) and (u.get("kontrolleArt") in ("kontrolle", "fiktiv") or float(u.get("anteil") or 0) >= 25) for u in ubos)
		add(id="ubos", gruppe="Wirtschaftlich Berechtigte", label="Wirtschaftlich Berechtigte erfasst", erfuellt=ubo_ok)
		extra = (it or {}).get("pflichtDokumente") or []
		for art in ("gesellschafterliste", "satzung"):
			add(id=f"doc_{art}", gruppe="Unternehmen", label=DOKUMENTE[art][0].replace(" (optional)", "") if art in extra else DOKUMENTE[art][0], dokumentArt=art, pflicht=art in extra, erfuellt=hat(art))
		vt = f.get("vertreter") or []
		add(id="vertreter", gruppe="Vertretung", label="Vertretungsberechtigte erfasst", erfuellt=bool(vt) and all(_gefuellt(x.get("vorname"), x.get("nachname"), x.get("geburtsdatum"), x.get("funktion")) for x in vt))
		for x in vt:
			add(id=f"doc_vertreter_{x.get('id')}", gruppe="Vertretung", label=f"Ausweis {x.get('vorname', '')} {x.get('nachname', '')}".strip(), dokumentArt="vertreter_ausweis", personId=x.get("id"), erfuellt=hat("vertreter_ausweis", lambda d, i=x.get("id"): d.get("personId") == i) or bool(x.get("istEinreicher")))
		if f.get("einreicherVertretungsberechtigt") is False:
			add(id="doc_vollmacht", gruppe="Vertretung", label="Vollmacht", dokumentArt="vollmacht", erfuellt=hat("vollmacht"))
	pep = f.get("pep") or {}
	add(id="pep", gruppe="Erklärungen", label="PEP-Selbstauskunft", erfuellt=isinstance(pep.get("istPep"), bool) and isinstance(pep.get("naheStehend"), bool) and (not (pep.get("istPep") or pep.get("naheStehend")) or _gefuellt(pep.get("funktion"))))
	if "investor" in rollen:
		m = f.get("mittelherkunft") or {}
		add(id="mittelherkunft", gruppe="Erklärungen", label="Herkunft der Mittel und Ticketgröße", erfuellt=m.get("ticket") in TICKETS and bool(m.get("quellen")))
		if TICKETS.get(m.get("ticket"), 0) >= e["mittelherkunftNachweisAb"] or (f.get("risiko") or {}).get("stufe") == "hoch":
			add(id="doc_mittelherkunft", gruppe="Erklärungen", label="Nachweis Herkunft der Mittel", dokumentArt="mittelherkunft", erfuellt=hat("mittelherkunft"))
	add(id="steuer", gruppe="Erklärungen", label="Steuerliche Ansässigkeit (optional)", pflicht=False, erfuellt=_gefuellt((f.get("steuer") or {}).get("land")))
	if "flaeche" in rollen or "landwirt" in rollen:
		b = f.get("bank") or {}
		ib = iban_pruefen(b.get("iban"))
		inhaber = kontoinhaber_passt(b.get("kontoinhaber"), firma=(f.get("firma") or {}).get("name")) if typ == "unternehmen" else kontoinhaber_passt(b.get("kontoinhaber"), p.get("vorname"), p.get("nachname"))
		add(id="bank", gruppe="Auszahlung", label="Bankverbindung (IBAN + Kontoinhaber)", pflicht=False, erfuellt=ib["ok"] and inhaber)
		for fl in flaechen:
			add(id=f"doc_eigentum_{fl['id']}", gruppe="Eigentum", label=f"Eigentumsnachweis: {fl.get('bezeichnung')}", dokumentArt="eigentumsnachweis", flaecheId=fl["id"], pflicht=False, erfuellt=hat("eigentumsnachweis", lambda d, i=fl["id"]: d.get("flaecheId") == i))
	return a


def fortschritt(anf):
	pflicht = [x for x in anf if x.get("pflicht")]
	erfuellt = [x for x in pflicht if x.get("erfuellt")]
	return {"erfuellt": len(erfuellt), "gesamt": len(pflicht), "quote": round(len(erfuellt) / len(pflicht) * 100) if pflicht else 0, "fehlend": [x for x in pflicht if not x.get("erfuellt")]}


_DACH = {"DE", "AT", "CH", "LI"}
_EU_EWR = {"BE", "BG", "CY", "CZ", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "IS", "NO"}


def risiko(fall, einstellungen=None):
	"""Regeln wie kycRisiko() (Land, PEP, Struktur, Ticket, Sanktionstreffer) → {"stufe", "punkte", "gruende"}"""
	e = {**einstellungen_standard(), **(einstellungen or {})}
	f = fall or {}
	hoch = {str(x).upper() for x in e["hochrisikoLaender"]}
	gruende, punkte = [], 0

	def plus(n, g):
		nonlocal punkte
		punkte += n
		gruende.append(g)

	p = f.get("person") or {}
	laender = [str(x).upper() for x in [(p.get("adresse") or {}).get("land"), p.get("staatsangehoerigkeit"), (f.get("firma") or {}).get("land"), *[u.get("wohnsitzland") for u in f.get("ubos") or []]] if x]
	if any(x in hoch for x in laender):
		plus(4, "Bezug zu einem Drittland mit hohem Risiko")
	elif any(x not in _DACH and x not in _EU_EWR for x in laender):
		plus(2, "Bezug außerhalb EU/EWR/Schweiz")
	elif any(x not in _DACH for x in laender):
		plus(1, "Bezug zu einem EU/EWR-Land außerhalb DACH")
	pep = f.get("pep") or {}
	if pep.get("istPep"):
		plus(4, "Politisch exponierte Person (verstärkte Sorgfaltspflichten)")
	elif pep.get("naheStehend"):
		plus(4, "Familienangehöriger/nahestehende Person einer PEP")
	if any(u.get("pep") for u in f.get("ubos") or []):
		plus(4, "Wirtschaftlich Berechtigter ist PEP")
	if f.get("kontotyp") == "unternehmen":
		ubos = f.get("ubos") or []
		if not ubos or all(u.get("kontrolleArt") == "fiktiv" for u in ubos):
			plus(2, "Kein wirtschaftlich Berechtigter über Anteile ermittelbar (fiktiver wB)")
		if (f.get("firma") or {}).get("mehrstufig"):
			plus(2, "Mehrstufige Beteiligungsstruktur")
		if (f.get("firma") or {}).get("treuhand"):
			plus(2, "Treuhand-/Stiftungsstruktur")
	betrag = TICKETS.get((f.get("mittelherkunft") or {}).get("ticket"), 0)
	if betrag > 5000000:
		plus(2, "Ticketgröße über 5 Mio. €")
	elif betrag > 1000000:
		plus(1, "Ticketgröße über 1 Mio. €")
	if (f.get("sanktionen") or {}).get("status") in ("treffer_pruefen", "bestaetigt"):
		plus(4, "Möglicher Treffer im Sanktionslisten-Abgleich")
	return {"stufe": "hoch" if punkte >= 4 else "mittel" if punkte >= 2 else "niedrig", "punkte": punkte, "gruende": gruende}


# ---------------------------------------------------------------- Gating

def geltung(einstellungen=None, umgebung=None):
	e = (einstellungen or {}).get("geltung")
	if e in ("alle", "pilot", "aus"):
		return e
	u = str(umgebung or "").lower()
	if u in ("alle", "pilot", "aus"):
		return u
	return "alle"  # Frappe = Betrieb: Standard „an“ für alle Konten


def schritt_aktiv(schritt, konto_id, einstellungen=None, umgebung=None):
	e = {**einstellungen_standard(), **(einstellungen or {})}
	if schritt not in SCHRITTE or (e.get("gating") or {}).get(schritt) is False:
		return False
	g = geltung(e, umgebung)
	if g == "aus":
		return False
	if g == "pilot":
		return konto_id in (e.get("pilotKonten") or [])
	return True


def freigabe(schritt, status, aktiv=True, flaeche_id=None):
	if schritt not in SCHRITTE:
		return {"ok": False, "aktiv": True, "gruende": ["Unbekannter Schritt."], "hinweis": ""}
	if not aktiv:
		return {"ok": True, "aktiv": False, "gruende": [], "hinweis": ""}
	gruende = []
	if not (status or {}).get("verifiziert"):
		gruende.append("Die Verifizierung muss erneuert werden." if (status or {}).get("status") == "abgelaufen" else "Die Verifizierung ist nicht abgeschlossen.")
	if schritt == "auszahlung":
		if not ((status or {}).get("bank") or {}).get("geprueft"):
			gruende.append("Es fehlt eine geprüfte Bankverbindung (IBAN, Kontoinhaber = verifizierte Person/Firma).")
		if flaeche_id and flaeche_id not in ((status or {}).get("eigentum") or []):
			gruende.append("Für diese Fläche liegt kein geprüfter Eigentumsnachweis vor.")
	return {"ok": not gruende, "aktiv": True, "gruende": gruende, "hinweis": SCHRITTE[schritt][1] if gruende else ""}


# ================================================================ Teil 2 – Frappe

DT_FALL = "KYC Fall"
DT_DOK = "KYC Dokument"
DT_ABGLEICH = "KYC Sanktionsabgleich"
DT_LISTE = "KYC Sanktionslisteneintrag"
DT_BANK = "KYC Bankverbindung"
DT_EINST = "KYC Einstellungen"
ROLLE_COMPLIANCE = "ÖkoInvest Compliance"


def _j(wert, standard=None):
	if wert in (None, ""):
		return standard
	if isinstance(wert, (dict, list)):
		return wert
	try:
		return json.loads(wert)
	except (TypeError, ValueError):
		return standard


def einstellungen():
	import frappe

	roh = frappe.db.get_single_value(DT_EINST, "einstellungen_json") if frappe.db.exists("DocType", DT_EINST) else None
	return {**einstellungen_standard(), **(_j(roh, {}) or {})}


def _umgebung():
	"""site_config „oekoinvest_kyc_gating“ (alle|pilot|aus). In Testläufen (frappe.flags.in_test) ohne Angabe „aus“,
	damit Tests anderer Module ohne KYC-Daten laufen – test_kyc.py schaltet die Geltung ausdrücklich ein."""
	import frappe

	wert = frappe.conf.get("oekoinvest_kyc_gating")
	if not wert and getattr(frappe.flags, "in_test", False):
		return "aus"
	return wert


def fall_suchen(konto_id=None, organisation_id=None):
	"""Maßgeblicher Fall (Name) wie kycFallFuer(): eigener Fall, sonst verifizierter KYB-Fall der Organisation."""
	import frappe

	eigen = None
	if konto_id:
		eigen = frappe.db.get_value(DT_FALL, {"konto": konto_id, "status": ["!=", "geloescht"]}, ["name", "status"], as_dict=True, order_by="creation desc")
	org = None
	if organisation_id:
		org = frappe.db.get_value(DT_FALL, {"organisation": organisation_id, "status": "verifiziert"}, ["name", "status"], as_dict=True) or frappe.db.get_value(DT_FALL, {"organisation": organisation_id, "status": ["!=", "geloescht"]}, ["name", "status"], as_dict=True)
	if eigen and eigen.status == "verifiziert":
		return eigen.name
	if org and org.status == "verifiziert":
		return org.name
	return (eigen or org or {}).get("name") if (eigen or org) else None


def kyc_status(konto=None, organisation=None):
	"""Status für andere Module (ohne Rechteprüfung – nur serverseitig verwenden)."""
	import frappe

	name = fall_suchen(konto, organisation)
	if not name:
		return {"kontoId": konto, "organisationId": organisation, "fallId": None, "status": "offen", "verifiziert": False, "kontotyp": None, "risiko": None, "bank": {"vorhanden": False, "geprueft": False}, "eigentum": [], "verifiziertAm": None, "naechstePruefung": None, "ausweisGueltigBis": None, "label": "Nicht begonnen", "fehlt": ["Verifizierung nicht begonnen"]}
	f = frappe.get_doc(DT_FALL, name)
	verifiziert = f.status == "verifiziert"
	bank = frappe.db.get_value(DT_BANK, {"fall": f.name}, ["iban", "geprueft"], as_dict=True) or {}
	eigentum = frappe.get_all(DT_DOK, filters={"fall": f.name, "art": "eigentumsnachweis", "status": "ok", "geloescht": 0}, pluck="flaeche") if verifiziert else []
	return {
		"kontoId": f.konto, "organisationId": f.organisation or None, "fallId": f.name, "status": f.status, "verifiziert": verifiziert, "kontotyp": f.kontotyp,
		"risiko": f.risiko or None, "bank": {"vorhanden": bool(bank.get("iban")), "geprueft": verifiziert and bool(bank.get("geprueft"))},
		"eigentum": sorted({x for x in eigentum if x}), "verifiziertAm": str(f.verifiziert_am) if f.verifiziert_am else None,
		"naechstePruefung": str(f.naechste_pruefung) if f.naechste_pruefung else None, "ausweisGueltigBis": str(f.ausweis_gueltig_bis) if f.ausweis_gueltig_bis else None,
		"label": STATUS.get(f.status, f.status), "fehlt": _fehlend(f) if f.status in BEARBEITBAR else [],
	}


def _fehlend(f):
	"""Offene Pflichtpunkte (Bezeichnungen) – für Berichte (report/kyc_uebersicht)."""
	try:
		from oekoinvest_app.plattform.api.kyc import _anforderungen

		return [x["label"] for x in fortschritt(_anforderungen(f))["fehlend"]]
	except Exception:  # noqa: BLE001 – Bericht darf nie an einem Einzelfall scheitern
		return []


def kyc_freigabe(schritt, konto_id=None, organisation_id=None, flaeche_id=None):
	st = kyc_status(konto_id, organisation_id)
	aktiv = schritt_aktiv(schritt, konto_id, einstellungen(), _umgebung())
	return {**freigabe(schritt, st, aktiv=aktiv, flaeche_id=flaeche_id), "schritt": schritt, "status": st["status"]}


def _kyc_fehler():
	import frappe

	class KycErforderlich(frappe.ValidationError):
		"""HTTP 409 – der Website-Adapter (backend/frappe.js) macht daraus PlattformFehler(409, …, "kyc")."""

		http_status_code = 409

	return KycErforderlich


def kyc_sperre(schritt, konto_id=None, organisation_id=None, flaeche_id=None, text=None):
	"""Wirft KycErforderlich (ValidationError, HTTP 409) mit Hinweis, wenn der Schritt gesperrt ist."""
	import frappe

	r = kyc_freigabe(schritt, konto_id, organisation_id, flaeche_id)
	if r["ok"]:
		return r
	meldung = f"{text} {' '.join(r['gruende'])}" if text else f"{SCHRITTE[schritt][1]} {' '.join(r['gruende'])} (Portal → Verifizierung)"
	frappe.throw(meldung.strip(), _kyc_fehler(), title="KYC")


def kyc_uebergang_pruefen(art, o, nach, werfen=True):
	"""Hook für ablauf.uebergang_anwenden/system_wechsel (NDA-Freigabe, LOI, Veröffentlichung)."""
	ziel = None
	if art == "interesse" and nach == "nda_freigegeben":
		ziel = ("nda", o.get("investor_id"), o.get("organisation_id"), "Datenraum-Freigabe nicht möglich: Der Investor ist noch nicht verifiziert (KYC/KYB).")
	elif art == "interesse" and nach == "loi_abgegeben":
		ziel = ("loi", o.get("investor_id"), o.get("organisation_id"), None)
	elif art == "projekt" and nach == "veroeffentlicht":
		ziel = ("veroeffentlichung", o.get("anbieter_id"), o.get("organisation_id"), "Veröffentlichung nicht möglich: Der Anbieter ist noch nicht verifiziert (KYB).")
	if not ziel:
		return True
	if werfen:
		kyc_sperre(ziel[0], konto_id=ziel[1], organisation_id=ziel[2], text=ziel[3])
		return True
	return kyc_freigabe(ziel[0], ziel[1], ziel[2])["ok"]


ERGEBNIS_WERTE = ("ok", "auffaellig", "fehler", "hinweis", "ausstehend")


def ergebnis_anhaengen(fall_id=None, eintrag=None, konto_id=None, organisation_id=None):
	"""Externes Prüfergebnis an einen KYC-Fall hängen (Team „Dienste“). Entscheidet nie selbst."""
	import frappe

	from oekoinvest_app.plattform.kern import protokoll

	e = eintrag or {}
	name = fall_id if fall_id and frappe.db.exists(DT_FALL, fall_id) else fall_suchen(konto_id, organisation_id)
	if not name:
		frappe.throw("KYC-Fall nicht gefunden.", frappe.DoesNotExistError)
	quelle = str(e.get("quelle") or "").strip()[:60]
	if not quelle:
		frappe.throw("Quelle des Prüfergebnisses fehlt.", frappe.ValidationError)
	daten = {}
	for k, w in list((e.get("daten") or {}).items())[:30] if isinstance(e.get("daten"), dict) else []:
		key = re.sub(r"[^\w.-]", "", str(k))[:40]
		if key:
			daten[key] = w if isinstance(w, (int, float, bool)) else str(w)[:300]
	neu = {
		"id": f"KE-{frappe.generate_hash(length=10).upper()}", "quelle": quelle, "art": str(e.get("art") or "pruefung")[:40],
		"ergebnis": e.get("ergebnis") if e.get("ergebnis") in ERGEBNIS_WERTE else "hinweis", "zusammenfassung": str(e.get("zusammenfassung") or "")[:500],
		"rohdatenRef": str(e.get("rohdatenRef") or "")[:300] or None, "externeId": str(e.get("externeId") or "")[:120] or None, "daten": daten,
		"am": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
	}
	f = frappe.get_doc(DT_FALL, name)
	liste = (_j(f.pruefergebnisse_json, []) or []) + [neu]
	f.db_set("pruefergebnisse_json", json.dumps(liste[-100:], ensure_ascii=False), update_modified=True)
	protokoll(None, "kyc_ergebnis", "kyc", name, f"Prüfergebnis {neu['quelle']}/{neu['art']}: {neu['ergebnis']}")
	return {"fallId": name, **neu}


# ---------------------------------------------------------------- Verschlüsselung (AES-256-GCM)

_MAGIC = b"OIKYC1"


def _schluessel():
	"""site_config „oekoinvest_kyc_schluessel“ (32 Byte hex/base64 oder Passphrase ≥ 32 Zeichen); sonst aus dem Frappe-Schlüssel abgeleitet."""
	import base64

	import frappe

	s = str(frappe.conf.get("oekoinvest_kyc_schluessel") or "").strip()
	if s:
		if re.fullmatch(r"[0-9a-fA-F]{64}", s):
			return bytes.fromhex(s)
		try:
			b = base64.b64decode(s + "=" * (-len(s) % 4), validate=False)
			if len(b) == 32:
				return b
		except Exception:  # noqa: BLE001
			pass
		if len(s) < 32:
			frappe.throw("Der Schlüssel für die KYC-Ablage ist zu kurz (mindestens 32 Zeichen).")
		return hashlib.scrypt(s.encode(), salt=b"oekoinvest-kyc-v1", n=16384, r=8, p=1, dklen=32)
	from frappe.utils.password import get_encryption_key

	return hashlib.scrypt(get_encryption_key().encode(), salt=b"oekoinvest-kyc-frappe-v1", n=16384, r=8, p=1, dklen=32)


def verschluesseln(klartext, aad, schluessel=None):
	from cryptography.hazmat.primitives.ciphers.aead import AESGCM
	import os

	k = schluessel or _schluessel()
	iv = os.urandom(12)
	ct = AESGCM(k).encrypt(iv, bytes(klartext), str(aad).encode())  # Chiffrat + Tag (16 Byte am Ende)
	return _MAGIC + hashlib.sha256(k).digest()[:8] + iv + ct[-16:] + ct[:-16]  # gleiches Format wie server/kycKrypto.js


def entschluesseln(daten, aad, schluessel=None):
	from cryptography.hazmat.primitives.ciphers.aead import AESGCM

	b = bytes(daten)
	if len(b) < 42 or b[:6] != _MAGIC:
		raise ValueError("Die Datei ist beschädigt.")
	k = schluessel or _schluessel()
	if b[6:14] != hashlib.sha256(k).digest()[:8]:
		raise ValueError("Die Datei wurde mit einem anderen Schlüssel verschlüsselt.")
	return AESGCM(k).decrypt(b[14:26], b[42:] + b[26:42], str(aad).encode())


def mime_aus_bytes(b):
	if b[:5] == b"%PDF-":
		return "application/pdf"
	if b[:3] == b"\xff\xd8\xff":
		return "image/jpeg"
	if b[:8] == b"\x89PNG\r\n\x1a\n":
		return "image/png"
	return ""


def sha256_hex(b):
	return hashlib.sha256(b).hexdigest()


def _heute_plus(tage):
	return (date.today() + timedelta(days=tage)).isoformat()
