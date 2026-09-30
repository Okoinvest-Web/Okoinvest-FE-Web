# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC – Eigene Identifizierung: reine Regeln (1:1 zu src/lib/plattform/kycIdent.js, gleiche Befund-Kennungen), ohne Frappe.
# Testbar ohne Bench: cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_mrz_kern -v
#
# 1. MRZ-Prüfung nach ICAO Doc 9303 (TD1 3 × 30, TD2 2 × 36, TD3 2 × 44; Prüfziffern 7-3-1) mit Abgleich gegen die
#    Personenangaben des KYC-Falls → Befundliste mit Ampel (gruen/gelb/rot). Kein OCR – die Person tippt die Zeilen ab.
#    Stimmige Prüfziffern belegen nur die innere Konsistenz, nicht die Echtheit des Dokuments.
# 2. Identifizierungswege: Bewertung (verfügbar, zulässig je Risiko/Investorentyp, Empfehlung).
# 3. Videoidentifizierung durch eigene Compliance-Mitarbeiter: Pflicht-Checkliste als MUSTER in Anlehnung an FMA
#    Online-Identifikationsverordnung und BaFin-Rundschreiben 3/2017 (GW) – keine Zulassung, keine Rechtsberatung.

import json
import re
import unicodedata
from datetime import date, datetime, timezone

# ================================================================ MRZ – Grundlagen

MRZ_FORMATE = {
	"TD1": {"zeilen": 3, "laenge": 30, "label": "Ausweiskarte (TD1, 3 × 30 Zeichen)"},
	"TD2": {"zeilen": 2, "laenge": 36, "label": "Ausweisdokument (TD2, 2 × 36 Zeichen)"},
	"TD3": {"zeilen": 2, "laenge": 44, "label": "Reisepass (TD3, 2 × 44 Zeichen)"},
}


def _wert(c):
	if "0" <= c <= "9":
		return ord(c) - 48
	if "A" <= c <= "Z":
		return ord(c) - 55
	if c == "<":
		return 0
	return -1


def mrz_pruefziffer(feld):
	"""Prüfziffer (Gewichte 7-3-1, Summe mod 10) oder None bei unzulässigen Zeichen."""
	summe = 0
	for i, c in enumerate(str(feld or "")):
		w = _wert(c)
		if w < 0:
			return None
		summe += w * (7, 3, 1)[i % 3]
	return summe % 10


def mrz_pruefziffer_ok(feld, ziffer):
	soll = mrz_pruefziffer(feld)
	if soll is None or ziffer is None:
		return False
	ist = 0 if ziffer == "<" else int(ziffer) if re.fullmatch(r"\d", ziffer or "") else -1
	return ist == soll


def mrz_zeilen(eingabe):
	"""Text (Zeilen per Umbruch) oder Liste → bereinigte Zeilen; einzeilige Eingabe mit 90/88/72 Zeichen wird aufgeteilt."""
	roh = [str(z if z is not None else "") for z in eingabe] if isinstance(eingabe, (list, tuple)) else str(eingabe or "").replace("\r", "").split("\n")
	zeilen = [re.sub(r"\s+", "", z.upper().replace("«", "<").replace("‹", "<")) for z in roh]
	zeilen = [z for z in zeilen if z][:3]
	if len(zeilen) == 1:
		z = zeilen[0]
		if len(z) == 90:
			return [z[:30], z[30:60], z[60:]]
		if len(z) == 88:
			return [z[:44], z[44:]]
		if len(z) == 72:
			return [z[:36], z[36:]]
	return zeilen


def mrz_format(zeilen):
	z = [x for x in (zeilen or []) if x]
	for fid, f in MRZ_FORMATE.items():
		if len(z) == f["zeilen"] and all(len(x) == f["laenge"] for x in z):
			return fid
	return None


def mrz_format_fuer_art(art):
	return "TD3" if art == "reisepass" else "TD1"


def _fueller(s):
	return re.sub(r"\s+", " ", str(s or "").replace("<", " ")).strip()


def _name_teilen(feld):
	teile = str(feld or "").split("<<")
	return {"nachname": _fueller(teile[0]), "vornamen": _fueller("<<".join(teile[1:]))}


def mrz_datum(jjmmtt, art="geburt", heute=None):
	"""JJMMTT → ISO; „geburt“ nie in der Zukunft, „ablauf“ höchstens 50 Jahre zurück (wie mrzDatum)."""
	s = str(jjmmtt or "")
	if not re.fullmatch(r"\d{6}", s):
		return None
	jj, mm, tt = int(s[:2]), int(s[2:4]), int(s[4:6])
	if not (1 <= mm <= 12 and 1 <= tt <= 31):
		return None
	jetzt_j = (heute or date.today()).year % 100
	jahr = (1900 + jj if jj > jetzt_j else 2000 + jj) if art == "geburt" else (1900 + jj if jj >= jetzt_j + 50 else 2000 + jj)
	try:
		return date(jahr, mm, tt).isoformat()
	except ValueError:
		return None


MRZ_STAATEN = {
	"D": "DE", "DEU": "DE", "AUT": "AT", "CHE": "CH", "LIE": "LI", "ITA": "IT", "FRA": "FR", "NLD": "NL", "BEL": "BE", "LUX": "LU", "DNK": "DK", "POL": "PL", "CZE": "CZ",
	"SVK": "SK", "HUN": "HU", "SVN": "SI", "HRV": "HR", "ESP": "ES", "PRT": "PT", "IRL": "IE", "SWE": "SE", "FIN": "FI", "NOR": "NO", "GBR": "GB", "USA": "US", "ROU": "RO",
	"BGR": "BG", "GRC": "GR", "TUR": "TR", "UKR": "UA", "ARE": "AE", "ISL": "IS", "EST": "EE", "LVA": "LV", "LTU": "LT", "MLT": "MT", "CYP": "CY",
}


def mrz_staat(c):
	return MRZ_STAATEN.get(str(c or "").replace("<", ""))


def mrz_dokumentart(code):
	c = str(code or "").replace("<", "")
	if c[:1] == "P":
		return "reisepass"
	if c == "AR":
		return "aufenthaltstitel"
	if c[:1] in ("I", "A", "C"):
		return "personalausweis"
	if c[:1] == "V":
		return "visum"
	return "unbekannt"


ART_LABEL = {"reisepass": "Reisepass", "personalausweis": "Personalausweis / Identitätskarte", "aufenthaltstitel": "Aufenthaltstitel", "visum": "Visum", "unbekannt": "unbekannt"}


def mrz_zerlegen(eingabe, heute=None):
	"""Wie mrzZerlegen(): {"format", "zeilen", "felder", "pruefziffern": [{"feld","label","ok"}], "zeichenOk"}"""
	zeilen = mrz_zeilen(eingabe)
	fmt = mrz_format(zeilen)
	if not fmt:
		return {"format": None, "zeilen": zeilen, "felder": {}, "pruefziffern": [], "zeichenOk": all(re.fullmatch(r"[A-Z0-9<]*", z) for z in zeilen)}
	p = []

	def pz(feld, label, wert, ziffer):
		p.append({"feld": feld, "label": label, "ok": mrz_pruefziffer_ok(wert, ziffer)})

	if fmt == "TD1":
		a, b, c = zeilen
		nummer, ziffer, optional1 = a[5:14], a[14], a[15:30]
		if ziffer == "<" and re.match(r"[A-Z0-9]", optional1[:1] or ""):
			ende = optional1.find("<")
			rest = optional1[:ende] if ende > 0 else optional1
			nummer, ziffer, optional1 = nummer + rest[:-1], rest[-1:], optional1[len(rest):]
		f = {
			"dokumentcode": re.sub(r"<$", "", a[0:2]), "ausstellerstaat": a[2:5], "dokumentnummer": nummer.replace("<", ""), "optional": _fueller(optional1 + b[18:29]),
			"geburtsdatumRoh": b[0:6], "geschlecht": b[7], "ablaufRoh": b[8:14], "staatsangehoerigkeit": b[15:18], **_name_teilen(c),
		}
		pz("dokumentnummer", "Dokumentnummer", nummer, ziffer)
		pz("geburtsdatum", "Geburtsdatum", b[0:6], b[6])
		pz("ablauf", "Ablaufdatum", b[8:14], b[14])
		pz("gesamt", "Gesamtprüfziffer", a[5:30] + b[0:7] + b[8:15] + b[18:29], b[29])
	else:
		a, b = zeilen
		td3 = fmt == "TD3"
		f = {
			"dokumentcode": re.sub(r"<$", "", a[0:2]), "ausstellerstaat": a[2:5], **_name_teilen(a[5:44 if td3 else 36]),
			"dokumentnummer": b[0:9].replace("<", ""), "staatsangehoerigkeit": b[10:13], "geburtsdatumRoh": b[13:19], "geschlecht": b[20], "ablaufRoh": b[21:27],
			"optional": _fueller(b[28:42 if td3 else 35]),
		}
		pz("dokumentnummer", "Dokumentnummer", b[0:9], b[9])
		pz("geburtsdatum", "Geburtsdatum", b[13:19], b[19])
		pz("ablauf", "Ablaufdatum", b[21:27], b[27])
		if td3:
			pz("optional", "Optionale Daten (persönliche Nummer)", b[28:42], b[42])
			pz("gesamt", "Gesamtprüfziffer", b[0:10] + b[13:20] + b[21:43], b[43])
		else:
			pz("gesamt", "Gesamtprüfziffer", b[0:10] + b[13:20] + b[21:35], b[35])
	f["ausstellerstaat"] = f["ausstellerstaat"].replace("<", "")
	f["staatsangehoerigkeit"] = f["staatsangehoerigkeit"].replace("<", "")
	f["geschlecht"] = "X" if f["geschlecht"] == "<" else f["geschlecht"]
	f["dokumentart"] = mrz_dokumentart(f["dokumentcode"])
	f["geburtsdatum"] = mrz_datum(f["geburtsdatumRoh"], "geburt", heute)
	f["gueltigBis"] = mrz_datum(f["ablaufRoh"], "ablauf", heute)
	return {"format": fmt, "zeilen": zeilen, "felder": f, "pruefziffern": p, "zeichenOk": all(re.fullmatch(r"[A-Z0-9<]+", z) for z in zeilen)}


# ================================================================ MRZ – Abgleich und Befund

def mrz_name(s):
	"""ICAO-Transliteration: Ä → AE, Ö → OE, Ü → UE, ß → SS, Å → AA, Æ → AE, Ø → OE, Akzente entfernt."""
	t = str(s or "").upper()
	for x, y in (("Ä", "AE"), ("Ö", "OE"), ("Ü", "UE"), ("ẞ", "SS"), ("ß", "SS"), ("Å", "AA"), ("Æ", "AE"), ("Ø", "OE")):
		t = t.replace(x, y)
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	return re.sub(r"\s+", " ", re.sub(r"[^A-Z]+", " ", t)).strip()


def _name_einfach(s):
	t = str(s or "").upper().replace("ẞ", "SS").replace("ß", "SS")
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	return re.sub(r"\s+", " ", re.sub(r"[^A-Z]+", " ", t)).strip()


def _namen_gleich(soll, mrz):
	b = mrz_name(mrz).split()
	for t in (mrz_name, _name_einfach):
		a = t(soll).split()
		if not a or not b:
			continue
		if a == b:
			return True
		if len(b) <= len(a) and all(w == a[i] or (i == len(b) - 1 and len(w) >= 2 and a[i].startswith(w)) for i, w in enumerate(b)):
			return True
	return False


def _vorname_gleich(soll, mrz_vornamen):
	b = mrz_name(mrz_vornamen).split()
	for t in (mrz_name, _name_einfach):
		a = t(soll).split()
		if a and b and (_namen_gleich(soll, mrz_vornamen) or all(w in b for w in a) or a[0] in b):
			return True
	return False


def alter_am(geburt_iso, stichtag_iso):
	if not geburt_iso or not stichtag_iso:
		return None
	g, s = date.fromisoformat(geburt_iso), date.fromisoformat(stichtag_iso)
	return s.year - g.year - (1 if (s.month, s.day) < (g.month, g.day) else 0)


def mrz_nummer_maskiert(n):
	n = str(n or "")
	return ("•" * max(0, len(n) - 3) + n[-3:]) if n else ""


_RANG = {"gruen": 0, "gelb": 1, "rot": 2}


def ampel_max(liste):
	m = "gruen"
	for x in liste:
		if _RANG[x] > _RANG[m]:
			m = x
	return m


def _ist_muster(f):
	return f.get("ausstellerstaat") == "UTO" or f.get("staatsangehoerigkeit") == "UTO" or f.get("nachname") in ("MUSTERMANN", "MUSTERFRAU", "SPECIMEN")


def _heute_datum(heute):
	if isinstance(heute, datetime):
		return heute.date()
	return heute or date.today()


def mrz_befund(eingabe, soll=None, heute=None):
	"""Wie mrzBefund(): {"format", "formatLabel", "ampel", "befunde": [{"id","ampel","text"}], "pruefziffern", "felder", "zusammenfassung", "geprueftAm"}"""
	soll = soll or {}
	h = _heute_datum(heute)
	z = mrz_zerlegen(eingabe, h)
	befunde = []

	def b(bid, ampel, text):
		befunde.append({"id": bid, "ampel": ampel, "text": text})

	def ergebnis(felder):
		ampel = ampel_max([x["ampel"] for x in befunde])
		rot = sum(1 for x in befunde if x["ampel"] == "rot")
		gelb = sum(1 for x in befunde if x["ampel"] == "gelb")
		if ampel == "gruen":
			zus = "MRZ stimmig, Abgleich mit den Angaben ohne Auffälligkeit."
		else:
			teile = ([f"{rot} auffällig"] if rot else []) + ([f"{gelb} Hinweis" + ("" if gelb == 1 else "e")] if gelb else [])
			zus = ", ".join(teile) + "."
		return {
			"format": z["format"], "formatLabel": MRZ_FORMATE[z["format"]]["label"] if z["format"] else "unbekannt", "ampel": ampel, "befunde": befunde,
			"pruefziffern": z["pruefziffern"], "felder": felder, "zusammenfassung": zus, "geprueftAm": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
		}

	if not z["format"]:
		laengen = " / ".join(str(len(x)) for x in z["zeilen"] if x) or "–"
		b("format", "rot", f"Unbekanntes Format (Zeilenlängen {laengen}). Erwartet: Ausweiskarte 3 × 30, Reisepass 2 × 44 oder 2 × 36 Zeichen.")
		return ergebnis({})
	if not z["zeichenOk"]:
		b("zeichen", "rot", "Die Zeilen enthalten unzulässige Zeichen (erlaubt: A–Z, 0–9 und „<“).")
	for p in z["pruefziffern"]:
		b(f"pz_{p['feld']}", "gruen" if p["ok"] else "rot", f"Prüfziffer {p['label']} korrekt." if p["ok"] else f"Prüfziffer {p['label']} falsch – Tippfehler oder verändertes Dokument.")
	f = z["felder"]
	heute_iso = h.isoformat()
	if not f["geburtsdatum"]:
		b("datum_geburt", "rot", "Das Geburtsdatum in der MRZ ist kein gültiges Datum.")
	if not f["gueltigBis"]:
		b("datum_ablauf", "rot", "Das Ablaufdatum in der MRZ ist kein gültiges Datum.")
	if not f["nachname"]:
		b("name_fehlt", "rot", "Der Name fehlt in der MRZ.")
	if f["gueltigBis"]:
		t = (date.fromisoformat(f["gueltigBis"]) - h).days
		if t < 0:
			b("abgelaufen", "rot", f"Das Dokument ist abgelaufen (gültig bis {f['gueltigBis']}).")
		elif t < 30:
			b("laeuft_ab", "gelb", f"Das Dokument läuft in {t} Tagen ab ({f['gueltigBis']}).")
		else:
			b("gueltig", "gruen", f"Dokument gültig bis {f['gueltigBis']}.")
	if f["geburtsdatum"]:
		alter = alter_am(f["geburtsdatum"], heute_iso)
		if alter < 18:
			b("minderjaehrig", "rot", f"Die Person ist laut MRZ {alter} Jahre alt – Geschäftsbeziehungen nur mit Volljährigen.")
	if _ist_muster(f):
		b("muster", "gelb", "Muster- bzw. Specimen-Daten erkannt (z. B. „Utopia“, „Mustermann“) – kein echtes Dokument.")

	aw = soll.get("ausweis") or {}
	fehlend = []
	if soll.get("nachname"):
		if _namen_gleich(soll["nachname"], f["nachname"]):
			b("name_nachname", "gruen", "Nachname stimmt mit den Angaben überein.")
		else:
			b("name_nachname", "rot", f"Nachname weicht ab (MRZ: {f['nachname'] or '–'}).")
	else:
		fehlend.append("Nachname")
	if soll.get("vorname"):
		if _vorname_gleich(soll["vorname"], f["vornamen"]):
			b("name_vorname", "gruen", "Vorname stimmt mit den Angaben überein.")
		else:
			b("name_vorname", "gelb", f"Vorname weicht ab (MRZ: {f['vornamen'] or '–'}) – Schreibweise prüfen.")
	else:
		fehlend.append("Vorname")
	if soll.get("geburtsdatum"):
		if str(soll["geburtsdatum"])[:10] == f["geburtsdatum"]:
			b("geburtsdatum", "gruen", "Geburtsdatum stimmt überein.")
		else:
			b("geburtsdatum", "rot", f"Geburtsdatum weicht ab (MRZ: {f['geburtsdatum'] or f['geburtsdatumRoh']}).")
	else:
		fehlend.append("Geburtsdatum")
	if soll.get("staatsangehoerigkeit"):
		if mrz_staat(f["staatsangehoerigkeit"]) == str(soll["staatsangehoerigkeit"]).upper():
			b("staatsangehoerigkeit", "gruen", "Staatsangehörigkeit stimmt überein.")
		else:
			b("staatsangehoerigkeit", "gelb", f"Staatsangehörigkeit weicht ab oder ist nicht zuordenbar (MRZ: {f['staatsangehoerigkeit'] or '–'}).")
	else:
		fehlend.append("Staatsangehörigkeit")
	if aw.get("art"):
		passt = aw["art"] == f["dokumentart"] or (aw["art"] == "aufenthaltstitel" and f["dokumentart"] == "personalausweis")
		if passt:
			b("dokumentart", "gruen", f"Dokumentart passt ({ART_LABEL[f['dokumentart']]}).")
		else:
			b("dokumentart", "gelb", f"Dokumentart weicht ab (Angabe: {ART_LABEL.get(aw['art'], aw['art'])}, MRZ: {ART_LABEL[f['dokumentart']]}).")
	if aw.get("nummer"):
		if re.sub(r"[^A-Z0-9]", "", str(aw["nummer"]).upper()) == f["dokumentnummer"]:
			b("dokumentnummer", "gruen", "Dokumentnummer stimmt mit der angegebenen Ausweisnummer überein.")
		else:
			b("dokumentnummer", "rot", "Dokumentnummer weicht von der angegebenen Ausweisnummer ab.")
	else:
		fehlend.append("Ausweisnummer")
	if aw.get("gueltigBis") and f["gueltigBis"]:
		if aw["gueltigBis"] == f["gueltigBis"]:
			b("gueltig_bis", "gruen", "„Gültig bis“ stimmt mit den Angaben überein.")
		else:
			b("gueltig_bis", "gelb", f"„Gültig bis“ weicht ab (Angabe {aw['gueltigBis']}, MRZ {f['gueltigBis']}).")
	if fehlend:
		b("abgleich_unvollstaendig", "gelb", f"Abgleich unvollständig – in den Angaben fehlt: {', '.join(fehlend)}.")
	return ergebnis({
		"dokumentart": f["dokumentart"], "dokumentcode": f["dokumentcode"], "ausstellerstaat": f["ausstellerstaat"], "nachname": f["nachname"], "vornamen": f["vornamen"],
		"geburtsdatum": f["geburtsdatum"], "staatsangehoerigkeit": f["staatsangehoerigkeit"], "geschlecht": f["geschlecht"], "gueltigBis": f["gueltigBis"],
		"dokumentnummerMaskiert": mrz_nummer_maskiert(f["dokumentnummer"]),
	})


MRZ_BEISPIELE = {
	"icaoTd3": ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", "L898902C36UTO7408122F1204159ZE184226B<<<<<10"],
	"icaoTd1": ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"],
	"icaoTd2": ["I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<", "D231458907UTO7408122F1204159<<<<<<<6"],
	"deTd1": ["IDD<<T220001293<<<<<<<<<<<<<<<", "6408125<2010315D<<<<<<<<<<<<<4", "MUSTERMANN<<ERIKA<<<<<<<<<<<<<"],
}

# ================================================================ Identifizierungswege

METHODEN_REIHENFOLGE = ["eid", "video_intern", "extern"]

# Spiegel von KYC_METHODEN (kyc.js). „verfuegbar“ für eid setzt das Team „eID“ (angebunden, siehe docs/EID.md und api/eid.py).
KYC_METHODEN = [
	{"id": "eid", "label": "Online-Ausweis (eID / ID Austria)", "kurz": "eID", "verfuegbar": True, "text": "Mit dem Personalausweis (Online-Ausweisfunktion) bzw. ID Austria – schnell und ohne Upload."},
	{"id": "video_intern", "label": "Ausweis hochladen + Videogespräch mit ÖkoInvest", "kurz": "Video", "verfuegbar": True, "text": "Ausweis hochladen, maschinenlesbare Zeile abtippen und einen kurzen Videotermin mit unserer Compliance buchen."},
	{"id": "extern", "label": "Externer Identifizierungsanbieter", "kurz": "Anbieter", "verfuegbar": True, "text": "Identifizierung über einen zugelassenen Dienstleister (Weiterleitung, Ergebnis kommt automatisch zurück)."},
]


def methoden_standard():
	return {"niedrig": ["eid", "video_intern", "extern"], "mittel": ["eid", "video_intern", "extern"], "hoch": ["eid", "video_intern"], "investorTypen": {}}


def methoden_bewerten(methoden=None, regeln=None, risiko="mittel", investor_typ=""):
	"""Wie kycMethodenBewerten(): je Weg {..., "zulaessig", "grund", "empfohlen"}."""
	r = {**methoden_standard(), **(regeln or {})}
	je_risiko = r.get(risiko) or r.get("mittel") or []
	typen = r.get("investorTypen") or {}
	je_typ = typen.get(investor_typ) if investor_typ and isinstance(typen.get(investor_typ), list) and typen.get(investor_typ) else None
	liste = []
	for m in sorted(methoden if methoden is not None else KYC_METHODEN, key=lambda x: METHODEN_REIHENFOLGE.index(x["id"]) if x["id"] in METHODEN_REIHENFOLGE else 99):
		grund = ""
		if not m.get("verfuegbar"):
			grund = "derzeit nicht verfügbar"
		elif m["id"] not in je_risiko:
			grund = f"bei Risiko „{risiko}“ nicht zugelassen"
		elif je_typ is not None and m["id"] not in je_typ:
			grund = "für Ihren Investorentyp nicht zugelassen"
		liste.append({**m, "zulaessig": not grund, "grund": grund, "empfohlen": False})
	for m in liste:
		if m["zulaessig"]:
			m["empfohlen"] = True
			break
	return liste


# ================================================================ Videoidentifizierung

VIDEO_HINWEIS = (
	"Muster-Checkliste in Anlehnung an die FMA Online-Identifikationsverordnung und das BaFin-Rundschreiben 3/2017 (GW) in der jeweils geltenden Fassung – "
	"keine Zulassung und keine Rechtsberatung. Ob ein eigenes Videoverfahren für ÖkoInvest genügt, ist vor dem Einsatz rechtlich zu klären."
)
VIDEO_DATENSCHUTZ = (
	"Das Gespräch findet über das angegebene Videokonferenz-Werkzeug statt. ÖkoInvest zeichnet kein Video auf; protokolliert werden die Prüfschritte mit "
	"Zeitpunkt und Ergebnis sowie die durchführende Person. Nähere Informationen in der Datenschutzerklärung (Abschnitt Identitätsprüfung)."
)

# (id, Bezeichnung, automatisch) – Reihenfolge = Gesprächsablauf, alle Pflicht
VIDEO_CHECKLISTE = [
	("einwilligung", "Einwilligung in die Protokollierung eingeholt, Datenschutzhinweis erteilt", False),
	("umgebung", "Bild- und Tonqualität ausreichend, Person allein, keine Anzeichen von Beeinflussung durch Dritte", False),
	("lichtbild", "Lichtbildabgleich: Die Person entspricht dem Foto im Dokument", False),
	("vorderseite", "Vorderseite vollständig gezeigt, Angaben mit dem KYC-Fall abgeglichen", False),
	("rueckseite", "Rückseite gezeigt (bei Karten), Anschrift und ausstellende Behörde abgeglichen", False),
	("hologramm", "Sicherheitsmerkmale: Hologramm bzw. Kinegramm durch Kippen geprüft", False),
	("schriftbild", "Schriftbild, Schrifttyp und Anordnung unauffällig", False),
	("beschaedigung", "Dokument unbeschädigt (Foto, Laminat, Ränder, Chip-Bereich)", False),
	("seriennummer", "Dokumentnummer von der Person vorgelesen und übereinstimmend", False),
	("plausibilitaet", "Plausibilitätsfragen stimmig beantwortet", False),
	("tan", "Einmalcode (TAN) während des Gesprächs bestätigt", True),
]
VIDEO_PUNKT_IDS = [p[0] for p in VIDEO_CHECKLISTE]
VIDEO_PUNKT_LABEL = {p[0]: p[1] for p in VIDEO_CHECKLISTE}
VIDEO_ERGEBNISSE = {"bestanden": "Bestanden", "abgebrochen": "Abgebrochen", "verdacht": "Verdacht"}
VIDEO_ABBRUCHGRUENDE = {
	"technik": "Bild oder Ton unzureichend", "dokument": "Dokument ungeeignet, beschädigt oder abgelaufen", "lichtbild": "Person entspricht nicht dem Lichtbild",
	"dritte": "Anwesenheit oder Einfluss Dritter", "mitwirkung": "Mitwirkung verweigert (z. B. Kippen, Vorlesen)", "tan": "Einmalcode nicht bestätigt",
	"einwilligung": "Keine Einwilligung", "kunde": "Abbruch durch die Person", "sonstiges": "Sonstiger Grund",
}
TAN = {"stellen": 6, "gueltigMinuten": 10, "versuche": 3}


def video_abschluss_pruefen(protokoll=None, ergebnis=None, begruendung="", abbruchgrund=""):
	"""Wie videoAbschlussPruefen(): {"ok", "fehler"}."""
	p = protokoll or {}
	fehler = []
	if ergebnis not in VIDEO_ERGEBNISSE:
		fehler.append("Bitte wählen Sie ein Ergebnis.")
	if len(str(begruendung or "").strip()) < 10:
		fehler.append("Bitte begründen Sie das Ergebnis (mindestens 10 Zeichen).")
	if ergebnis == "abgebrochen" and abbruchgrund not in VIDEO_ABBRUCHGRUENDE:
		fehler.append("Bitte wählen Sie einen Abbruchgrund.")
	if ergebnis == "bestanden":
		offen = [lab for pid, lab, auto in VIDEO_CHECKLISTE if pid != "tan" and ((p.get("punkte") or {}).get(pid) or {}).get("ok") is not True]
		if offen:
			fehler.append("Nicht bestätigte Pflichtpunkte: " + " · ".join(offen))
		if not (p.get("tan") or {}).get("bestaetigt"):
			fehler.append("Der Einmalcode (TAN) wurde nicht bestätigt.")
	return {"ok": not fehler, "fehler": fehler}


def video_sicht(protokolle=None, termin=None):
	"""Wie videoSicht() (ohne Datenbank): Status offen|gebucht|laufend|bestanden|abgebrochen|verdacht; Verdacht bleibt stehen."""
	protokolle = protokolle or []
	laufend = next((p for p in protokolle if not p.get("beendetAm")), None)
	fertig = [p for p in protokolle if p.get("beendetAm")]
	ergebnis = "verdacht" if any(p.get("ergebnis") == "verdacht" for p in fertig) else (fertig[-1].get("ergebnis") if fertig else None)
	if laufend:
		status = "laufend"
	elif ergebnis in ("verdacht", "bestanden"):
		status = ergebnis
	elif termin:
		status = "gebucht"
	elif ergebnis == "abgebrochen":
		status = "abgebrochen"
	else:
		status = "offen"
	return {"status": status, "ergebnis": ergebnis, "termin": termin, "laufendId": laufend.get("id") if laufend else None, "protokolle": protokolle, "anzahl": len(protokolle)}


def video_fuer_nutzer(sicht):
	"""Nutzersicht ohne „Verdacht“ (Tipping-off-Verbot)."""
	if not sicht:
		return None
	status = "abgeschlossen" if sicht["status"] in ("verdacht", "bestanden") else sicht["status"]
	t = sicht.get("termin")
	return {"status": status, "termin": {k: t.get(k) for k in ("id", "start", "ende", "zeitraum")} if t else None, "gespraeche": sum(1 for p in sicht.get("protokolle") or [] if p.get("beendetAm"))}


def kanonisch_json(wert):
	"""Kanonische Darstellung für den Protokoll-Hash (Schlüssel sortiert, None-Werte bleiben, wie kanonischJson ohne undefined)."""
	return json.dumps(wert, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
