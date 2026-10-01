# Copyright (c) 2026, ÖkoInvest GmbH
#
# WP5 Energiegemeinschaften – Gründungsdienstleistung, Wechsel, Vereinsorganisation, Statuten/Verträge (Dokumentgenerator),
# Förder-Check, Lieferantenpflichten. Reine Regeln ohne Frappe (lauffähig mit python -m unittest).
# 1:1-Spiegel von src/lib/plattform/eg/{gruendung,wechsel,verein,statuten,vertraege,foerder,lieferantenpflichten}.js –
# gleiche Testvektoren: src/lib/plattform/eg/testdaten/gruendung/vektoren.json (tests/test_eg_gruendung_kern.py).
# Daten (Vorlagen, Schrittvorlagen, Programme, Anbieterprofile) stammen aus eg_gruendung_daten.json, erzeugt mit
# node scripts/eg-gruendung-export.mjs – nicht von Hand ändern.
# Signaturen folgen bewusst den JS-Funktionen (Optionsobjekt als dict), damit die Vektoren direkt vergleichbar sind.
# Unsichere Angaben sind mit (zu bestätigen) gekennzeichnet; Dokumente sind MUSTER zur rechtlichen Prüfung.

import json
import math
import os
import re
from datetime import date, timedelta

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import eg_stamm_kern as ST
from oekoinvest_app.plattform import mitglied_kern as MK

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "eg_gruendung_daten.json"), encoding="utf-8") as _f:
	D = json.load(_f)

GR_STAND = D["stand"]
GR_PAKETE = D["GR_PAKETE"]
GR_STATUS = D["GR_STATUS"]
GR_AKTIV = D["GR_AKTIV"]
SCHRITT_STATUS = D["SCHRITT_STATUS"]
SCHRITT_FERTIG = D["SCHRITT_FERTIG"]
ZUSTAENDIG = D["ZUSTAENDIG"]
GR_SCHRITTE = D["GR_SCHRITTE"]
WECHSEL_SCHRITTE = D["WECHSEL_SCHRITTE"]
BUNDESLAENDER_GR = D["BUNDESLAENDER_GR"]
ALTDIENSTLEISTER = D["ALTDIENSTLEISTER"]
ZONELEVEL_STANDARD = D["ZONELEVEL_STANDARD"]
SCHRITT_AKTIONEN = D["SCHRITT_AKTIONEN"]
AUFTRAG_UEBERGAENGE = D["AUFTRAG_UEBERGAENGE"]
RECHTSFORM_PROFIL = D["RECHTSFORM_PROFIL"]
UST_SATZ_PCT = D["UST_SATZ_PCT"]
IMPORT_FELDER = D["IMPORT_FELDER"]
ANBIETER_PROFILE = D["ANBIETER_PROFILE"]
WP1_CSV_SPALTEN = D["WP1_CSV_SPALTEN"]
IMPORT_MAX_ZEILEN = D["IMPORT_MAX_ZEILEN"]
BESCHLUSS_GREMIEN = D["BESCHLUSS_GREMIEN"]
BESCHLUSS_KATEGORIEN = D["BESCHLUSS_KATEGORIEN"]
BEITRAG_STATUS = D["BEITRAG_STATUS"]
BEITRAG_EINHEBUNG = D["BEITRAG_EINHEBUNG"]
VERG_PFLICHTINHALTE = D["VERG_PFLICHTINHALTE"]
VORLAGEN = D["VORLAGEN"]
MUSTER_HINWEIS = D["MUSTER_HINWEIS"]
OEKOINVEST = D["OEKOINVEST"]
VORLAGEN_STAND = D["VORLAGEN_STAND"]
FOERDER_PROGRAMME = D["FOERDER_PROGRAMME"]
EAG_PV_KATEGORIEN = D["EAG_PV_KATEGORIEN"]
FOERDER_ERGEBNIS = D["FOERDER_ERGEBNIS"]
FOERDER_STAND = D["FOERDER_STAND"]
AENDERUNG_VORLAUF_TAGE = D["AENDERUNG_VORLAUF_TAGE"]
MEHRHEIT_ANTEIL = {"einfach": 0.5, "zweidrittel": 2 / 3, "dreiviertel": 0.75}
LUECKE = "……"


class GrFehler(Exception):
	"""Fachfehler (Status 422 Eingabe, 409 Konflikt) – wie Error mit status/feld in den JS-Modulen."""

	def __init__(self, text, status=422, feld=""):
		super().__init__(text)
		self.status = status
		self.feld = feld



def _nan(x):
	return isinstance(x, float) and math.isnan(x)

def _fehler(text, feld=""):
	return GrFehler(text, 422, feld)


def _konflikt(text):
	return GrFehler(text, 409)


# ================================================================ JS-Semantik (Zahlen, Text, Datum)


def _js_round(x):
	return math.floor(x + 0.5)


def _ganz_oder(x):
	"""Ganzzahlige Floats als int (JSON wie in JS)."""
	if isinstance(x, float) and math.isfinite(x) and x.is_integer():
		return int(x)
	return x


def _js_str(v):
	if v is True:
		return "true"
	if v is False:
		return "false"
	if v is None:
		return ""
	if isinstance(v, float):
		if math.isfinite(v) and v.is_integer():
			return str(int(v))
		return repr(v)
	return str(v)


def _js_number(v):
	"""Number(v) wie in JS (NaN als float('nan'))."""
	if v is None:
		return float("nan")
	if isinstance(v, bool):
		return 1.0 if v else 0.0
	if isinstance(v, (int, float)):
		return float(v)
	if isinstance(v, (dict, list)):
		return float("nan")
	s = str(v).strip()
	if s == "":
		return 0.0
	try:
		if re.fullmatch(r"[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?", s, re.ASCII):
			return float(s)
		if s in ("Infinity", "+Infinity"):
			return float("inf")
		if s == "-Infinity":
			return float("-inf")
	except ValueError:
		pass
	return float("nan")


def _zahl_oder_0(v):
	"""Number(v) || 0"""
	n = _js_number(v)
	return 0 if (_nan(n) or n == 0) else _ganz_oder(n)


def _txt(v, mx=200):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"\s+", " ", _js_str(v)).strip()[:mx]


def _mehr(v, mx=2000):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"\r\n?", "\n", _js_str(v)).strip()[:mx]


def _wahr(v):
	return v is True or v == "true" or v == "ja" or (type(v) in (int, float) and v == 1)


def _get(d, *pfad):
	x = d
	for k in pfad:
		if not isinstance(x, dict):
			return None
		x = x.get(k)
	return x


def datum_gueltig(v):
	s = "" if v is None else _js_str(v)
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s, re.ASCII):
		return False
	try:
		date.fromisoformat(s)
	except ValueError:
		return False
	return True


def _datum(v):
	return _js_str(v) if datum_gueltig(v) else ""


def _zahl(v, mn, mx):
	if v is None or v == "":
		return None
	n = _js_number(_js_str(v).replace(",", ".", 1))
	if _nan(n) or not math.isfinite(n) or n < mn or n > mx:
		return None
	return _ganz_oder(_js_round(n * 100) / 100)


def plus_tage(iso, tage):
	d = date.fromisoformat(_js_str(iso)[:10])
	n = _js_number(tage)
	n = 0 if _nan(n) else n
	return (d + timedelta(days=_js_round(n))).isoformat()


def tage_bis(von, bis):
	return (date.fromisoformat(_js_str(bis)[:10]) - date.fromisoformat(_js_str(von)[:10])).days


def _zl(z):
	return M.ZONELEVEL.get(_js_str(_ganz_oder(z)) if isinstance(z, (int, float)) else _js_str(z))


# ================================================================ Gründung: Auftrag, Angebot (gruendung.js)


def auftrag_bereinigen(d=None):
	d = d or {}
	paket = d.get("paket") if d.get("paket") in GR_PAKETE else ""
	if not paket:
		raise _fehler("Bitte wählen Sie ein Paket.", "paket")
	modell = d.get("modell") if d.get("modell") in M.EG_MODELLE else "eeg"
	zn = _zahl_oder_0(d.get("zonelevel")) if d.get("zonelevel") is not None else 0
	zl = zn or ZONELEVEL_STANDARD[modell]
	z = _zl(zl)
	if not z or modell not in z["modelle"]:
		raise _fehler(f"Zonelevel {_js_str(zl)} ist für {M.EG_MODELLE[modell]['kurz']} nicht zulässig.", "zonelevel")
	rp = M.EG_MODELLE[modell]["rechtsperson"]
	rechtsform = d.get("rechtsform") if d.get("rechtsform") in M.RECHTSFORMEN else ("verein" if rp else "keine")
	if rp and rechtsform == "keine":
		raise _fehler(f"Eine {M.EG_MODELLE[modell]['kurz']} braucht eine Rechtsperson.", "rechtsform")
	if not rp and rechtsform != "keine":
		raise _fehler(f"Für {M.EG_MODELLE[modell]['kurz']} ist keine eigene Rechtsperson nötig.", "rechtsform")
	ap = d.get("ansprechpartner") or {}
	plz = _js_str(d.get("plz") or "").strip()
	a = {
		"paket": paket, "modell": modell, "zonelevel": _ganz_oder(zl), "rechtsform": rechtsform,
		"arbeitsname": _txt(d.get("arbeitsname"), 140),
		"plz": plz if re.fullmatch(r"\d{4}", plz, re.ASCII) else "",
		"ort": _txt(d.get("ort"), 80),
		"bundesland": d.get("bundesland") if d.get("bundesland") in BUNDESLAENDER_GR else "",
		"netzbetreiberId": _txt(d.get("netzbetreiberId"), 40),
		"erwarteteMitglieder": _zahl(d.get("erwarteteMitglieder"), 0, 100000) or 0,
		"erzeugungKwp": _zahl(d.get("erzeugungKwp"), 0, 1000000) or 0,
		"speicherKwh": _zahl(d.get("speicherKwh"), 0, 1000000) or 0,
		"haushaltErzeugung": _wahr(d.get("haushaltErzeugung")),
		"gemeindeBeteiligt": _wahr(d.get("gemeindeBeteiligt")),
		"investitionGeplant": _wahr(d.get("investitionGeplant")),
		"organisator": paket in ("komplett", "wechsel") if "organisator" not in d else _wahr(d.get("organisator")),
		"zielTermin": _datum(d.get("zielTermin")),
		"ansprechpartner": {"name": _txt(ap.get("name"), 120), "email": _txt(ap.get("email"), 160).lower(), "telefon": _txt(ap.get("telefon"), 40)},
		"nachricht": _mehr(d.get("nachricht"), 2000),
		"bestehend": None,
	}
	if len(a["arbeitsname"]) < 3:
		raise _fehler("Bitte geben Sie einen Arbeitsnamen der Gemeinschaft an (mindestens 3 Zeichen).", "arbeitsname")
	if not a["plz"]:
		raise _fehler("Bitte die Postleitzahl (4 Ziffern) angeben – sie bestimmt Netzgebiet und Nahebereich.", "plz")
	if paket == "wechsel":
		b = d.get("bestehend") or {}
		la = _js_str(b.get("letzteAbrechnung") or "")
		a["bestehend"] = {
			"name": _txt(b.get("name"), 140), "gemeinschaftsId": re.sub(r"\s", "", _txt(b.get("gemeinschaftsId"), 40).upper()), "marktpartnerId": re.sub(r"\s", "", _txt(b.get("marktpartnerId"), 12).upper()),
			"altdienstleister": b.get("altdienstleister") if b.get("altdienstleister") in ALTDIENSTLEISTER else "sonstige",
			"mitglieder": _zahl(b.get("mitglieder"), 0, 100000) or 0, "zaehlpunkte": _zahl(b.get("zaehlpunkte"), 0, 100000) or 0,
			"letzteAbrechnung": b.get("letzteAbrechnung") if re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", la, re.ASCII) else "",
			"verteilmodell": "statisch" if b.get("verteilmodell") == "statisch" else "dynamisch",
		}
		if not a["bestehend"]["name"]:
			raise _fehler("Bitte den Namen der bestehenden Gemeinschaft angeben.", "bestehend.name")
		if a["bestehend"]["marktpartnerId"]:
			mp = ST.marktpartner_id_pruefen(a["bestehend"]["marktpartnerId"], modell)
			if not mp["ok"]:
				raise _fehler(mp["fehler"], "bestehend.marktpartnerId")
		if a["bestehend"]["gemeinschaftsId"]:
			g = ST.gemeinschafts_id_pruefen(a["bestehend"]["gemeinschaftsId"], modell, a["bestehend"]["marktpartnerId"])
			if not g["ok"]:
				raise _fehler(g["fehler"], "bestehend.gemeinschaftsId")
	return a


def auftrag_hinweise(a, o=None):
	heute = (o or {}).get("heute") or GR_STAND
	h = []
	kw = _zahl_oder_0(a.get("erzeugungKwp"))
	if kw > 100 or (a.get("haushaltErzeugung") and kw > 30):
		h.append({"stufe": "warn", "text": f"Erzeugungsleistung {_js_str(kw)} kW: Lieferantenpflichten nach § 69 ElWG (AGB, Informationsblatt, Rechnungsinhalte) – übernimmt auf Wunsch ÖkoInvest als Organisator.", "quelle": "ElWG § 69, § 68 Abs. 2"})
	if a.get("modell") == "eeg" and a.get("gemeindeBeteiligt"):
		h.append({"stufe": "info", "text": "Gemeinde mit eigener Anlage: mindestens 10 % der Erzeugung für schutzbedürftige Haushalte (Sozialquote) und fremdübliche Preise beachten.", "quelle": "ElWG § 68 Abs. 6; Fachkonzept 4.10"})
	zl = _zl(a.get("zonelevel"))
	if zl and zl["phase"] > 1:
		h.append({"stufe": "warn", "text": f"Zonelevel {_js_str(a.get('zonelevel'))} („{zl['label']}“) ist erst ab Marktprozess-Phase {zl['phase']} (05.04.2027) möglich (zu bestätigen).", "quelle": "ebUtilities-Konzept 17.04.2026"})
	if a.get("modell") == "beg":
		h.append({"stufe": "info", "text": "BEG: Netzentgelt-Reduktion bis 31.12.2026 keine; Kontrolle durch natürliche Personen, Gebietskörperschaften und kleine Unternehmen in den Statuten verankern.", "quelle": "ElWG § 67 Abs. 3; Fachkonzept 1.2"})
	if a.get("paket") != "wechsel":
		h.append({"stufe": "info", "text": f"Neu aktivierte Gemeinschaften erhalten ab {'05.10.2026' if heute < '2026-10-05' else 'sofort'} voraussichtlich nur noch das dynamische Verteilmodell (zu bestätigen).", "quelle": "ebUtilities-Konzept 17.04.2026"})
	if a.get("paket") == "wechsel" and _get(a, "bestehend", "verteilmodell") == "statisch":
		h.append({"stufe": "info", "text": "Statisches Verteilmodell im Bestand: Der Wechsel des Dienstleisters ändert das Modell nicht; ein Wechsel auf dynamisch hieße neuer Vertrag, neue Gemeinschafts-ID und Neuanmeldung aller Zählpunkte.", "quelle": "HA II 5.6, 8, 9; Fachkonzept 2.5"})
	return h


def angebot_bereinigen(d=None, o=None):
	d, o = d or {}, o or {}
	heute = o.get("heute") or GR_STAND
	paket = o.get("paket") or ""
	netto = _zahl(d.get("betragNetto"), 0, 1000000)
	if netto is None:
		raise _fehler("Bitte das Honorar (netto) angeben.", "betragNetto")
	tage = _zahl(d.get("gueltigTage"), 1, 180)
	bis = _datum(d.get("gueltigBis")) or plus_tage(heute, 30 if tage is None else tage)
	if bis < heute:
		raise _fehler("Das Angebot muss mindestens bis heute gültig sein.", "gueltigBis")
	quelle = d.get("leistungen") if isinstance(d.get("leistungen"), list) and d.get("leistungen") else (GR_PAKETE.get(paket) or {}).get("leistungen") or []
	leistungen = [x for x in (_txt(y, 200) for y in quelle) if x][:30]
	ust = _ganz_oder(_js_round(netto * UST_SATZ_PCT) / 100)
	return {"betragNetto": netto, "ustPct": UST_SATZ_PCT, "ustEur": ust, "betragBrutto": _ganz_oder(_js_round((netto + ust) * 100) / 100), "gueltigBis": bis, "leistungen": leistungen, "zahlungsplan": _mehr(d.get("zahlungsplan"), 600), "hinweise": _mehr(d.get("hinweise"), 1200)}


# ================================================================ Gründung: Schritte


def schritt_merkmale(a=None, g=None):
	a = a or {}
	modell = (g or {}).get("modell") or a.get("modell")
	kz = _get(g, "kennzahlen", "erzeugungsleistungKw")
	kw = _zahl_oder_0(kz if kz is not None else a.get("erzeugungKwp"))
	return {
		"modell": modell, "rechtsform": (g or {}).get("rechtsform") or a.get("rechtsform"), "paket": a.get("paket"),
		"rechtsperson": bool((M.EG_MODELLE.get(modell) or {}).get("rechtsperson")),
		"organisator": a.get("organisator") is True or bool(_get(g, "dienstleistung", "aktiv")),
		"lieferantenpflicht": bool(_get(g, "kennzahlen", "lieferantenpflichten")) or kw > 100 or (a.get("haushaltErzeugung") is True and kw > 30),
		"elabg": modell in ("eeg", "gea"),
	}


def _schritt_passt(v, m):
	if m["paket"] not in v["pakete"]:
		return False
	n = v.get("nur") or {}
	if n.get("modelle") and m["modell"] not in n["modelle"]:
		return False
	if n.get("rechtsformen") and m["rechtsform"] not in n["rechtsformen"]:
		return False
	if n.get("rechtsperson") and not m["rechtsperson"]:
		return False
	return not (n.get("wenn") and not m.get(n["wenn"]))


def schritt_definition(schluessel, paket=""):
	for liste in ((WECHSEL_SCHRITTE if paket == "wechsel" else GR_SCHRITTE), GR_SCHRITTE, WECHSEL_SCHRITTE):
		for x in liste:
			if x["s"] == schluessel:
				return x
	return None


def schritte_erzeugen(a, o=None):
	o = o or {}
	m = schritt_merkmale(a, o.get("gemeinschaft"))
	liste = WECHSEL_SCHRITTE if a.get("paket") == "wechsel" else GR_SCHRITTE
	alt = {x["schluessel"]: x for x in (o.get("vorhanden") or [])}
	neu = []
	for i, v in enumerate(liste):
		passt = _schritt_passt(v, m)
		x = alt.get(v["s"])
		if not passt:
			if x and x.get("status") not in SCHRITT_FERTIG:
				neu.append({**x, "status": "entfaellt", "notiz": x.get("notiz") or "Für diese Konstellation nicht erforderlich."})
			elif x:
				neu.append(x)
			continue
		neu.append({
			"schluessel": v["s"], "reihenfolge": i + 1, "label": v["label"], "abschnitt": v["abschnitt"], "phase": v["phase"], "zustaendig": v["zustaendig"], "pflicht": a.get("paket") in v["pflichtFuer"],
			"status": "offen", "gestartetAm": "", "datum": "", "wert": "", "notiz": "", "nachweise": [], "fristManuell": "", "vonId": None,
			**(x or {}),
			"reihenfolgeVorlage": i + 1,
		})
	neu.sort(key=lambda p: p.get("reihenfolgeVorlage") or p.get("reihenfolge") or 99)
	return [{**x, "reihenfolge": i + 1} for i, x in enumerate(neu)]


def schritt_frist(x, schritte=None, a=None):
	schritte, a = schritte or [], a or {}
	if x.get("fristManuell"):
		return x["fristManuell"]
	v = schritt_definition(x.get("schluessel"), a.get("paket"))
	f = (v or {}).get("frist")
	if not f:
		return ""
	if f["art"] == "auftrag":
		return plus_tage(a["auftragAm"], f["tage"]) if a.get("auftragAm") else ""
	if f["art"] == "start":
		return plus_tage(x["gestartetAm"], f["tage"]) if x.get("gestartetAm") else ""
	if f["art"] == "stichtag":
		return plus_tage(a["stichtag"], f["tage"]) if a.get("stichtag") else ""
	if f["art"] == "nach":
		for k in f.get("nach") or []:
			vor = next((y for y in schritte if y.get("schluessel") == k and y.get("status") == "erledigt" and y.get("datum")), None)
			if vor:
				return plus_tage(vor["datum"], f["tage"])
	return ""


def frist_ampel(frist, heute, status):
	if not frist or status in SCHRITT_FERTIG:
		return ""
	t = tage_bis(heute, frist)
	return "ueberfaellig" if t < 0 else "bald" if t <= 7 else "ok"


def schritte_anreichern(schritte=None, a=None, o=None):
	schritte, a = schritte or [], a or {}
	heute = (o or {}).get("heute") or GR_STAND
	out = []
	for x in schritte:
		v = schritt_definition(x.get("schluessel"), a.get("paket")) or {}
		frist = schritt_frist(x, schritte, a)
		out.append({
			**x, "frist": frist, "ampel": frist_ampel(frist, heute, x.get("status")) if x.get("pflicht") else "", "statusLabel": (SCHRITT_STATUS.get(x.get("status")) or {}).get("label") or x.get("status"),
			"abschnittLabel": (GR_STATUS.get(x.get("abschnitt")) or {}).get("label") or x.get("abschnitt"), "zustaendigLabel": ZUSTAENDIG.get(x.get("zustaendig")) or x.get("zustaendig"),
			"quelle": v.get("quelle") or "", "text": v.get("text") or "", "nachweisText": v.get("nachweis") or "", "feld": v.get("feld") or "", "hilfe": v.get("hilfe") or "", "vorlage": v.get("vorlage") or "",
			"fristArt": (v.get("frist") or {}).get("art") or "", "statusZiel": v.get("statusZiel") or "", "ereignis": v.get("ereignis") or "",
		})
	return out


def auftrag_status_aus_schritten(a, schritte=None):
	if a.get("status") not in GR_AKTIV:
		return a.get("status")
	offen = sorted([x for x in (schritte or []) if x.get("pflicht") and x.get("status") not in SCHRITT_FERTIG], key=lambda x: x.get("reihenfolge") or 0)
	return offen[0]["abschnitt"] if offen else "betriebsbereit"


def auftrag_fortschritt(schritte=None, o=None):
	schritte, o = schritte or [], o or {}
	heute = o.get("heute") or GR_STAND
	pflicht = [x for x in schritte if x.get("pflicht") and x.get("status") != "entfaellt"]
	fertig = len([x for x in pflicht if x.get("status") == "erledigt"])
	reich = schritte_anreichern(schritte, o.get("auftrag") or {}, {"heute": heute})
	return {
		"pflicht": len(pflicht), "erledigt": fertig, "prozent": _js_round(fertig / len(pflicht) * 100) if pflicht else 0,
		"ueberfaellig": len([x for x in reich if x["ampel"] == "ueberfaellig"]), "bald": len([x for x in reich if x["ampel"] == "bald"]),
		"naechste": [{"schluessel": x["schluessel"], "label": x["label"], "frist": x["frist"], "ampel": x["ampel"], "zustaendig": x["zustaendig"]} for x in reich if x.get("status") not in SCHRITT_FERTIG][:3],
	}


def feldwert_pruefen(feld, wert, o=None):
	o = o or {}
	s = _txt(wert, 60)
	if not feld:
		return ""
	if not s:
		raise _fehler("Bitte den Wert eintragen (z. B. Registernummer, IBAN, Kennung).", "wert")
	ohne = re.sub(r"\s", "", s)
	if feld == "zvrZahl":
		if not re.fullmatch(r"\d{9,10}", ohne, re.ASCII):
			raise _fehler("Die ZVR-Zahl besteht aus 9 bzw. 10 Ziffern (Format zu bestätigen).", "wert")
		return ohne
	if feld == "firmenbuchnummer":
		fn = re.sub(r"^fn", "", ohne.lower())
		if not re.fullmatch(r"\d{1,6}[a-z]", fn, re.ASCII):
			raise _fehler("Firmenbuchnummer: bis zu 6 Ziffern und ein Prüfbuchstabe (z. B. 541505g).", "wert")
		return fn
	if feld == "iban":
		i = MK.iban(ohne)
		if not i:
			raise _fehler("Die IBAN ist ungültig (Prüfsumme).", "wert")
		return i
	if feld == "creditorId":
		c = ohne.upper()
		if not re.fullmatch(r"AT\d{2}ZZZ\d{11}", c, re.ASCII):
			raise _fehler("SEPA-Gläubiger-ID Österreich: AT + 2 Prüfziffern + ZZZ + 11 Ziffern (zu bestätigen).", "wert")
		return c
	if feld == "marktpartnerId":
		r = ST.marktpartner_id_pruefen(ohne, o.get("modell") or "")
		if not r["ok"] or not r["wert"]:
			raise _fehler(r["fehler"] or "Bitte die Marktpartner-ID angeben.", "wert")
		return r["wert"]
	if feld == "gemeinschaftsId":
		r = ST.gemeinschafts_id_pruefen(ohne, o.get("modell") or "", o.get("marktpartnerId") or "", o.get("verteilmodell") or "")
		if not r["ok"] or not r["wert"]:
			raise _fehler(r["fehler"] or "Bitte die Gemeinschafts-ID angeben.", "wert")
		return r["wert"]
	if feld == "uid":
		u = ST.uid_pruefen(ohne)
		if not u:
			raise _fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "wert")
		return u
	if feld == "edaAnbindung":
		if s not in M.EDA_ANBINDUNGEN:
			raise _fehler(f"EDA-Anbindung: {', '.join(M.EDA_ANBINDUNGEN.keys())}.", "wert")
		return s
	return s


def schritt_aktion(x, aktion, o=None):
	o = o or {}
	heute = o.get("heute") or GR_STAND
	defi = SCHRITT_AKTIONEN.get(aktion)
	if not defi:
		raise _fehler("Unbekannte Aktion.", "aktion")
	if x.get("status") not in defi["von"]:
		raise _konflikt(f"„{defi['label']}“ ist im Status „{(SCHRITT_STATUS.get(x.get('status')) or {}).get('label') or x.get('status')}“ nicht möglich.")
	v = schritt_definition(x.get("schluessel"), o.get("paket") or "") or {}
	neu = {**x, "nachweise": list(x.get("nachweise") or []), "vonId": o.get("von")}
	tag = _datum(o.get("datum")) or heute
	if tag > heute and aktion == "erledigen":
		raise _fehler("Das Erledigungsdatum liegt in der Zukunft.", "datum")
	if aktion == "frist":
		frist = o.get("frist") or ""
		if frist and not datum_gueltig(frist):
			raise _fehler("Bitte ein gültiges Datum angeben.", "frist")
		neu["fristManuell"] = _datum(frist)
		return neu
	nachweis = o.get("nachweis")
	if nachweis and isinstance(nachweis, dict):
		neu["nachweise"].append({"titel": _txt(nachweis.get("titel"), 160) or "Nachweis", "dokumentId": _txt(nachweis.get("dokumentId"), 40), "am": heute})
	if o.get("notiz"):
		neu["notiz"] = _mehr(o.get("notiz"), 1000)
	if aktion == "notiz":
		return neu
	if aktion in ("starten", "warten") and not neu.get("gestartetAm"):
		neu["gestartetAm"] = tag
	if aktion == "entfaellt":
		if x.get("pflicht") and not _txt(o.get("grund"), 300):
			raise _fehler("Ein Pflichtschritt entfällt nur mit Begründung.", "grund")
		neu["notiz"] = _txt(o.get("grund"), 300) or neu.get("notiz")
	if aktion == "erledigen":
		g = o.get("gemeinschaft") or {}
		wert = o.get("wert") or ""
		if v.get("feld"):
			gw = g.get(v["feld"]) if g.get(v["feld"]) is not None else ""
			neu["wert"] = feldwert_pruefen(v["feld"], wert or gw, {"modell": g.get("modell"), "marktpartnerId": g.get("marktpartnerId"), "verteilmodell": g.get("verteilmodell")})
		elif wert:
			neu["wert"] = _txt(wert, 200)
		if v.get("nachweis") and x.get("pflicht") and not neu["nachweise"] and not neu.get("notiz") and not neu.get("wert"):
			raise _fehler(f"Bitte einen Nachweis anfügen oder vermerken: {v['nachweis']}.", "nachweis")
		neu["datum"] = tag
		if not neu.get("gestartetAm"):
			neu["gestartetAm"] = tag
	if aktion == "wiedereroeffnen":
		neu["datum"] = ""
	neu["status"] = defi["nach"]
	return neu


def schritt_wirkung(x, o=None):
	o = o or {}
	auftrag = o.get("auftrag") or {}
	g = o.get("gemeinschaft")
	v = schritt_definition(x.get("schluessel"), auftrag.get("paket")) or {}
	felder = {}
	if x.get("status") != "erledigt":
		return {"felder": felder, "statusZiel": "", "ereignis": ""}
	if v.get("feld") and x.get("wert"):
		felder[v["feld"]] = x["wert"]
	s = x.get("schluessel")
	if s == "betreibervertrag":
		felder["betreibervertragDatum"] = x.get("datum")
	if s == "organisator_anzeige":
		felder["organisatorAngezeigtAm"] = x.get("datum")
	if s in ("organisator_vollmacht", "dl_vertrag_avv"):
		felder["dienstleistung"] = {"aktiv": True, "paket": "rundum" if auftrag.get("paket") == "wechsel" else auftrag.get("paket"), "seit": _get(g, "dienstleistung", "seit") or x.get("datum"), "avvAm": _get(g, "dienstleistung", "avvAm") or x.get("datum")}
	if s == "ust_option" and x.get("wert"):
		felder.update({"ustStatus": "regelbesteuert", "ustOptionSeit": x.get("datum")})
	if s == "statuten" and not x.get("wert"):
		felder["statutenVersion"] = f"Muster {x.get('datum')}"
	return {"felder": felder, "statusZiel": v.get("statusZiel") or "", "ereignis": v.get("ereignis") or ""}


_KETTE = ["interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit", "aktiv"]


def status_pfad(von, nach):
	if von not in _KETTE or nach not in _KETTE or _KETTE.index(nach) <= _KETTE.index(von):
		return []
	ziel = _KETTE.index(nach)
	warte = [[von]]
	gesehen = {von}
	while warte:
		pfad = warte.pop(0)
		for n in (M.GEMEINSCHAFT_STATUS.get(pfad[-1]) or {}).get("naechste") or []:
			if n in gesehen or n not in _KETTE or _KETTE.index(n) > ziel:
				continue
			p = pfad + [n]
			if n == nach:
				return p[1:]
			gesehen.add(n)
			warte.append(p)
	return []


def eda_bereit_pruefen(g, o=None):
	o = o or {}
	f = []
	if not g:
		return {"bereit": False, "fehlend": ["Gemeinschaft ist noch nicht angelegt."]}
	if (M.EG_MODELLE.get(g.get("modell")) or {}).get("rechtsperson") and not (g.get("zvrZahl") or g.get("firmenbuchnummer")):
		f.append("ZVR-Zahl bzw. Firmenbuchnummer fehlt (Rechtsperson).")
	if g.get("modell") in ("eeg", "beg", "gea") and not g.get("marktpartnerId"):
		f.append("Marktpartner-ID (ebUtilities) fehlt.")
	if not g.get("gemeinschaftsId"):
		f.append("Gemeinschafts-ID aus dem Vertrag mit dem Netzbetreiber fehlt.")
	if not g.get("netzbetreiber") and g.get("modell") != "p2p":
		f.append("Netzbetreiber fehlt.")
	if not g.get("edaAnbindung"):
		f.append("EDA-Anbindung fehlt.")
	if (o.get("organisator") or _get(g, "dienstleistung", "aktiv")) and not g.get("organisatorAngezeigtAm"):
		f.append("Organisator ist dem Netzbetreiber noch nicht angezeigt (§ 68 Abs. 2 ElWG).")
	if g.get("status") not in ("vertrag_nb", "eda_bereit", "aktiv"):
		lab = (M.GEMEINSCHAFT_STATUS.get(g.get("status")) or {}).get("label") or g.get("status")
		f.append(f"Status der Gemeinschaft ist „{_js_str(lab) if lab is not None else 'undefined'}“ – erwartet „Vertrag mit dem Netzbetreiber“.")
	for x in o.get("schritte") or []:
		if x.get("pflicht") and x.get("status") not in SCHRITT_FERTIG and x.get("schluessel") in ("vertraege", "datenschutz", "eda_zugang", "lieferantenpflichten"):
			f.append(f"Schritt offen: {x.get('label')}.")
	return {"bereit": not f, "fehlend": f}


def rechtsform_empfehlung(d=None):
	d = d or {}
	modell = d.get("modell") if d.get("modell") in M.EG_MODELLE else "eeg"
	em = M.EG_MODELLE[modell]
	if not em["rechtsperson"]:
		return {"empfehlung": "keine", "begruendung": [f"Für {em['kurz']} ist keine eigene Rechtsperson nötig – es genügen Verträge zwischen den Beteiligten."], "alternativen": [], "quelle": em["quelle"]}
	b = []
	empf = "verein"
	mitglieder = _zahl_oder_0(d.get("erwarteteMitglieder"))
	kw = _zahl_oder_0(d.get("erzeugungKwp"))
	if d.get("investitionGeplant"):
		empf = "egen"
		b.append("Die Gemeinschaft will eigene Anlagen finanzieren – Geschäftsanteile einer Genossenschaft eignen sich dafür besser als Vereinsbeiträge.")
	else:
		b.append("Ohne eigene Investitionen ist der Verein die einfachste und günstigste Form.")
	if mitglieder > 300 and empf == "verein":
		b.append(f"Bei {_js_str(mitglieder)} erwarteten Mitgliedern auf eine professionelle Buchhaltung achten; ab 1 Mio. € Einnahmen in zwei Folgejahren besteht Bilanzpflicht (VerG § 22).")
	if kw > 100:
		b.append(f"Mit {_js_str(kw)} kW Erzeugungsleistung gelten Lieferantenpflichten nach § 69 ElWG – unabhängig von der Rechtsform; ein Organisator kann sie übernehmen.")
	if d.get("gemeindeBeteiligt"):
		b.append("Gemeinden können Mitglied jeder Rechtsform sein; Beschluss des Gemeinderats und beihilferechtlich fremdübliche Preise beachten.")
	if modell == "beg":
		b.append("BEG: Die Kontrollklausel (§ 67 Abs. 3 ElWG) ist in Statuten bzw. Satzung zu verankern.")
	alternativen = [{"rechtsform": rf, "label": M.RECHTSFORMEN[rf]["label"], "empfohlen": rf == empf, **p} for rf, p in RECHTSFORM_PROFIL.items()]
	return {"empfehlung": empf, "begruendung": b, "alternativen": alternativen, "quelle": "Fachkonzept 2.3; Ratgeber Rechtsformen der Koordinationsstelle"}


def _feld(label, wert, quelle="Stammdaten"):
	return {"label": label, "wert": wert or "", "quelle": quelle, "offen": not wert}


def formular_hilfe(art, k=None):
	k = k or {}
	g = k.get("gemeinschaft") or {}
	auftrag = k.get("auftrag") or {}
	netzbetreiber = k.get("netzbetreiber") or []
	organe = k.get("organe") or []
	name = g.get("name") or auftrag.get("arbeitsname") or ""
	sa = g.get("sitzAdresse") or {}
	ortteil = " ".join(x for x in (sa.get("plz") or auftrag.get("plz"), sa.get("ort") or auftrag.get("ort")) if x)
	sitz = ", ".join(x for x in (sa.get("strasse"), ortteil) if x)
	rf = g.get("rechtsform") or auftrag.get("rechtsform")
	modell = g.get("modell") or auftrag.get("modell")
	leitung = [f"{o.get('personName') or o.get('name')} ({o.get('funktionLabel') or o.get('funktion')})" for o in organe if o.get("status") != "beendet" and o.get("funktion") in ("obmann", "obmann_stv", "kassier", "schriftfuehrer", "vorstand", "geschaeftsfuehrer")]
	nbs = [x for x in netzbetreiber if x.get("id") in (g.get("netzbetreiber") or []) or x.get("id") == auftrag.get("netzbetreiberId")]
	if art == "vereinsanzeige":
		h = {"titel": "Errichtungsanzeige bei der Vereinsbehörde", "stelle": "Vereinsbehörde am Sitz (Bezirkshauptmannschaft bzw. Landespolizeidirektion)", "frist": "Die Behörde hat 4 Wochen (verlängerbar auf 6 Wochen) Zeit; danach entsteht der Verein bzw. schon mit Einladung zur Aufnahme der Tätigkeit (VerG § 13).", "quelle": "VerG §§ 11, 13",
			"felder": [_feld("Vereinsname", name), _feld("Sitz und Zustellanschrift", sitz), _feld("Statuten (beschlossene Fassung)", g.get("statutenVersion")), _feld("Organwalter des Leitungsorgans", "; ".join(leitung)), _feld("Gründungsversammlung", auftrag.get("gruendungsversammlungAm") or "", "Gründungsschritt")],
			"hinweise": ["Anzeige durch die Proponenten mit einem Exemplar der Statuten; Angaben zu den Organwaltern (Name, Geburtsdatum, Anschrift) laut Formular der Behörde (zu bestätigen).", "Die Anzeige ist in der Regel gebührenfrei (Fachkonzept 2.3, zu bestätigen)."]}
	elif art == "finanzamt":
		h = {"titel": "Verf 15a (Verein) und Verf 26" if rf == "verein" else "Verf 15 (Körperschaft) und Verf 26", "stelle": "Finanzamt Österreich (FinanzOnline bzw. Formular)", "frist": "binnen 1 Monat nach Beginn der Tätigkeit", "quelle": "EEG-Ratgeber Steuern & Abgaben (Fachkonzept 2.3)",
			"felder": [_feld("Name", name), _feld("ZVR-Zahl" if rf == "verein" else "Firmenbuchnummer", g.get("zvrZahl") if rf == "verein" else g.get("firmenbuchnummer")), _feld("Sitz", sitz), _feld("Bankverbindung (IBAN)", g.get("iban")), _feld("Vertretungsbefugte Personen (Verf 26)", "; ".join(leitung)), _feld("Umsatzsteuer", "Regelbesteuerung (U 12)" if g.get("ustStatus") == "regelbesteuert" else "Kleinunternehmer (§ 6 Abs. 1 Z 27 UStG)")],
			"hinweise": ["Verf 26: Angaben zu den vertretungsbefugten Personen (Bezeichnung laut Fachkonzept, zu bestätigen).", "Keine Steuerberatung – Umsatzsteuer-Option und Körperschaftsteuer mit der Steuerberatung klären."]}
	elif art == "ust":
		h = {"titel": "U 12 (Verzicht auf die Kleinunternehmerbefreiung) bzw. U 15 (UID)", "stelle": "Finanzamt Österreich", "frist": "Verzicht bindet 5 Kalenderjahre", "quelle": "UStG § 6 Abs. 3; EEG-Ratgeber Steuern",
			"felder": [_feld("Name", name), _feld("Steuernummer", g.get("steuernummer")), _feld("Beginn", "")],
			"hinweise": ["Sinnvoll vor allem bei Vorsteuer aus eigenen Investitionen bzw. Reverse-Charge-Bezügen von regelbesteuerten Erzeugern – vorher Kleinunternehmer-Monitor (WP4) und Steuerberatung."]}
	elif art == "elabg":
		kz = _get(g, "kennzahlen", "erzeugungsleistungKw")
		ew = f"{_js_str(kz)} kW" if kz else (f"{_js_str(auftrag.get('erzeugungKwp'))} kWp (Plan)" if auftrag.get("erzeugungKwp") else "")
		h = {"titel": "Meldung zur Befreiung von der Elektrizitätsabgabe", "stelle": "Finanzamt (Zollamt Österreich, zu bestätigen)", "frist": "binnen 4 Wochen nach Inbetriebnahme", "quelle": "Elektrizitätsabgabe-Eigenstrombefreiungsverordnung; EEG-Ratgeber Steuern",
			"felder": [_feld("Gemeinschaft", name), _feld("Gemeinschafts-ID", g.get("gemeinschaftsId")), _feld("Erzeugungsleistung", ew)],
			"hinweise": ["Befreiung laut Koordinationsstelle nur für EEG (und Eigendeckung in GEA); für BEG nicht (Fachkonzept 1.2).", "Jährliche Erklärung; bilanzielle Aufzeichnungen der EEG genügen (BMF-Anfragebeantwortung 03.11.2023)."]}
	elif art == "ebutilities":
		rolle = "BEG" if modell == "beg" else "GEA" if modell == "gea" else "EEG"
		h = {"titel": "Registrierung als Marktpartner auf ebUtilities", "stelle": f"ebUtilities.at (Rolle {rolle})", "frist": "nach Entstehung der Rechtsperson", "quelle": "HA II 11; Koordinationsstelle Schritt 4", "link": "https://energiegemeinschaften.gv.at/4-registrierung-als-marktpartner/",
			"felder": [_feld("Name", name), _feld("Rechtsform", (M.RECHTSFORMEN.get(rf) or {}).get("label")), _feld("ZVR-Zahl" if rf == "verein" else "Firmenbuchnummer", g.get("zvrZahl") if rf == "verein" else g.get("firmenbuchnummer")), _feld("Sitz", sitz), _feld("Ansprechperson", leitung[0] if leitung else _get(auftrag, "ansprechpartner", "name")), _feld("E-Mail", g.get("email") or _get(auftrag, "ansprechpartner", "email"))],
			"hinweise": [f"Ergebnis: Marktpartner-ID {(M.EG_MODELLE.get(modell) or {}).get('marktpartnerPraefix') or 'XX'} + 6 Ziffern.", "Upload: Identitätsnachweis und Vereinsregister- bzw. Firmenbuchauszug.", "Ab 05.10.2026 optimierter Ablauf (auch P2P und Eigenversorgung, Präfixe zu bestätigen)."]}
	elif art == "betreibervertrag":
		wege = [{"netzbetreiber": nb.get("name"), "weg": nb.get("vertragsweg"), "kontakt": nb.get("kontaktEmail") or "", "formular": nb.get("formularUrl") or nb.get("portalUrl") or "", "besonderheiten": nb.get("besonderheiten") or ""} for nb in nbs]
		link = "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber-beg/" if modell == "beg" else "https://energiegemeinschaften.gv.at/4-vertrag-mit-dem-netzbetreiber-gea/" if modell == "gea" else "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber/"
		zlw = g.get("zonelevel") or auftrag.get("zonelevel")
		zltext = f"{_js_str(zlw) if zlw else ''} {(_zl(zlw) or {}).get('label') or ''}".strip()
		org = "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething" if (_get(g, "dienstleistung", "aktiv") or auftrag.get("organisator")) else ""
		h = {"titel": "Vertrag über den Betrieb der Gemeinschaft mit dem Netzbetreiber", "stelle": ", ".join(x.get("name") for x in nbs) or "Netzbetreiber laut Zählpunkt", "frist": "Bearbeitungsdauer je Netzbetreiber (zu bestätigen)", "quelle": "HA II 7.1; Koordinationsstelle Schritt 5", "link": link,
			"felder": [_feld("Marktpartner-ID", g.get("marktpartnerId")), _feld("Name und Sitz", ", ".join(x for x in (name, sitz) if x)), _feld("Verteilmodell", g.get("verteilmodell") or "dynamisch"), _feld("Nahebereich / Zonelevel", zltext), _feld("Nahebereichs-ID (Trafostation bzw. Umspannwerk)", g.get("nahebereichRef")), _feld("Organisator", org)],
			"wege": wege, "hinweise": ["Ab 10/2026 im Vertrag: Nahebereichs-ID und Organisator (HA II, ebUtilities-Konzept, zu bestätigen).", "BEG: Die Gemeinschafts-ID vergibt ebUtilities." if modell == "beg" else "Der Netzbetreiber vergibt die Gemeinschafts-ID.", "Neu aktivierte Gemeinschaften ab 05.10.2026 voraussichtlich nur dynamisch (zu bestätigen)."]}
	elif art == "eda_zugang":
		n = _zahl_oder_0(k.get("zaehlpunkte")) or _zahl_oder_0(auftrag.get("erwarteteMitglieder"))
		vorschlag = "anwenderportal" if n <= 50 else "email" if n <= 200 else "kep"
		h = {"titel": "Zugang zur EDA-Plattform", "stelle": "EDA GmbH (eda.at)", "frist": "vor der ersten Anmeldung", "quelle": "HA II 6, 11; Koordinationsstelle Schritt 6", "link": "https://energiegemeinschaften.gv.at/6-registrierung-in-der-eda-infrastruktur/",
			"felder": [_feld("Marktpartner-ID", g.get("marktpartnerId")), _feld("Zählpunkte (erwartet)", _js_str(n) if n else ""), _feld("Vorschlag Anbindung", M.EDA_ANBINDUNGEN[vorschlag]["label"], "Regel: bis 50 ZP Portal, bis ca. 200 E-Mail, darüber KEP")],
			"vorschlag": vorschlag, "hinweise": ["Ein Dienstleister arbeitet immer mit der Marktpartner-ID der Gemeinschaft – als Benutzer im Portal oder bevollmächtigt im Plattformvertrag.", "Preise ab 50 Zählpunkten laut Preisliste der EDA GmbH (zu bestätigen)."]}
	elif art == "rechtsform":
		r = rechtsform_empfehlung({"modell": modell, "erwarteteMitglieder": auftrag.get("erwarteteMitglieder"), "investitionGeplant": auftrag.get("investitionGeplant"), "erzeugungKwp": auftrag.get("erzeugungKwp"), "gemeindeBeteiligt": auftrag.get("gemeindeBeteiligt")})
		h = {"titel": "Entscheidungshilfe Rechtsform", "stelle": "Gründungsinitiative", "frist": "", "quelle": r["quelle"], "felder": [_feld("Empfehlung", (M.RECHTSFORMEN.get(r["empfehlung"]) or {}).get("label") or r["empfehlung"], "Regel")], "empfehlung": r, "hinweise": r["begruendung"]}
	else:
		h = {"titel": "Hinweise", "stelle": "", "frist": "", "quelle": "", "felder": [], "hinweise": []}
	return {"art": art, **h, "fehlend": [x["label"] for x in h["felder"] if x["offen"]]}


def auftraege_kennzahlen(liste=None, o=None):
	liste = liste or []
	heute = (o or {}).get("heute") or GR_STAND
	k = {"gesamt": len(liste), "anfragen": 0, "angebote": 0, "inArbeit": 0, "betriebsbereit": 0, "ueberfaellig": 0, "wechsel": 0}
	for a in liste:
		st = a.get("status")
		if st == "anfrage":
			k["anfragen"] += 1
		elif st == "angebot":
			k["angebote"] += 1
		elif st in ("betriebsbereit", "uebergeben"):
			k["betriebsbereit"] += 1
		elif st in GR_AKTIV:
			k["inArbeit"] += 1
		if a.get("paket") == "wechsel":
			k["wechsel"] += 1
		schritte = a.get("schritte") or []
		if any(x.get("pflicht") and frist_ampel(schritt_frist(x, schritte, a), heute, x.get("status")) == "ueberfaellig" for x in schritte):
			k["ueberfaellig"] += 1
	return k


def auftrag_uebergang(a, aktion, o=None):
	heute = (o or {}).get("heute") or GR_STAND
	u = AUFTRAG_UEBERGAENGE.get(aktion)
	if not u:
		raise _fehler("Unbekannte Aktion.", "aktion")
	if a.get("status") not in u["von"]:
		raise _konflikt(f"„{aktion}“ ist im Status „{(GR_STATUS.get(a.get('status')) or {}).get('label') or a.get('status')}“ nicht möglich.")
	if aktion == "annehmen" and _get(a, "angebot", "gueltigBis") and a["angebot"]["gueltigBis"] < heute:
		raise _konflikt("Das Angebot ist abgelaufen – bitte ein neues Angebot anfordern.")
	return u["nach"]


# ================================================================ Wechsel (wechsel.js)


def spalte_normalisieren(s):
	t = _js_str(s).strip().lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	return re.sub(r"\W+", "", t, flags=re.ASCII).replace("_", "")


def tabelle_lesen(roh, o=None):
	max_zeilen = (o or {}).get("maxZeilen") or IMPORT_MAX_ZEILEN
	s = _js_str(roh or "")
	s = s.removeprefix("﻿")
	erste = re.split(r"\r?\n", s, maxsplit=1)[0] if s else ""
	anz = lambda z: erste.count(z)
	trenner = "\t" if anz("\t") > 0 and anz("\t") >= anz(";") else (";" if anz(";") >= anz(",") else ",")
	alle = []
	feld = ""
	zeile = []
	in_q = False
	i = 0
	n = len(s)
	while i < n:
		c = s[i]
		if in_q:
			if c == '"' and i + 1 < n and s[i + 1] == '"':
				feld += '"'
				i += 1
			elif c == '"':
				in_q = False
			else:
				feld += c
		elif c == '"' and feld == "":
			in_q = True
		elif c == trenner:
			zeile.append(feld)
			feld = ""
		elif c in ("\n", "\r"):
			if c == "\r" and i + 1 < n and s[i + 1] == "\n":
				i += 1
			zeile.append(feld)
			feld = ""
			if any(x.strip() != "" for x in zeile):
				alle.append(zeile)
			zeile = []
			if len(alle) > max_zeilen + 1:
				break
		else:
			feld += c
		i += 1
	if feld != "" or zeile:
		zeile.append(feld)
		if any(x.strip() != "" for x in zeile):
			alle.append(zeile)
	if not alle:
		return {"kopf": [], "kopfNorm": [], "zeilen": [], "trenner": trenner}
	kopf = [x.strip() for x in alle[0]]
	return {"kopf": kopf, "kopfNorm": [spalte_normalisieren(x) for x in kopf], "zeilen": [[(z[j] if j < len(z) else "").strip() for j in range(len(kopf))] for z in alle[1:max_zeilen + 1]], "trenner": trenner}


def anbieter_erkennen(kopf_norm=None):
	kopf_norm = kopf_norm or []
	best = {"anbieter": "generisch", "treffer": 0}
	for k, p in ANBIETER_PROFILE.items():
		t = len([e for e in p["erkennung"] if e in kopf_norm])
		if t > best["treffer"]:
			best = {"anbieter": k, "treffer": t}
	return {**best, "sicherheit": "hoch" if best["treffer"] >= 3 else "mittel" if best["treffer"] >= 2 else "keine"}


def zuordnung_vorschlagen(kopf_norm=None):
	kopf_norm = kopf_norm or []
	z = {}
	belegt = set()
	for runde in ("exakt", "teil"):
		for feld, defi in IMPORT_FELDER.items():
			if feld in z:
				continue
			for syn in defi["syn"]:
				treffer = -1
				for j, k in enumerate(kopf_norm):
					if j in belegt:
						continue
					if (k == syn) if runde == "exakt" else (len(syn) >= 4 and len(k) >= 4 and (k.startswith(syn) or k.endswith(syn))):
						treffer = j
						break
				if treffer >= 0:
					z[feld] = treffer
					belegt.add(treffer)
					break
	return z


def zuordnung_bereinigen(z=None, spalten=0):
	z = z or {}
	out = {}
	belegt = set()
	for f in IMPORT_FELDER:
		w = z.get(f)
		if w is None or w == "":
			continue
		n = _js_number(w)
		if _nan(n) or not float(n).is_integer() or n < 0 or n >= spalten or int(n) in belegt:
			continue
		out[f] = int(n)
		belegt.add(int(n))
	return out


_ART = {"privat": "privat", "privatperson": "privat", "haushalt": "privat", "person": "privat", "natuerlich": "privat", "natuerlicheperson": "privat", "verbraucher": "privat", "landwirt": "landwirt", "landwirtschaft": "landwirt", "unternehmen": "kmu", "firma": "kmu", "kmu": "kmu", "betrieb": "kmu", "gewerbe": "kmu", "grossunternehmen": "grossunternehmen", "gemeinde": "gemeinde", "kommune": "gemeinde", "gebietskoerperschaft": "gemeinde", "oeffentlich": "oeffentlich", "verein": "verein", "private": "privat", "company": "kmu", "municipality": "gemeinde"}
_RICHTUNG = {"verbrauch": "verbrauch", "bezug": "verbrauch", "consumption": "verbrauch", "verbraucher": "verbrauch", "c": "verbrauch", "erzeugung": "erzeugung", "einspeisung": "erzeugung", "generation": "erzeugung", "erzeuger": "erzeugung", "produktion": "erzeugung", "g": "erzeugung", "lieferung": "erzeugung"}
_STEUER = {"kleinunternehmer": "kleinunternehmer", "ku": "kleinunternehmer", "regelbesteuert": "regelbesteuert", "regelbesteuerung": "regelbesteuert", "ustpflichtig": "regelbesteuert", "regel": "regelbesteuert", "pauschalierterlandwirt": "pauschalierter_landwirt", "pauschaliert": "pauschalierter_landwirt", "landwirtpauschaliert": "pauschalierter_landwirt", "nichtunternehmerisch": "nicht_unternehmerisch", "privat": "nicht_unternehmerisch", "keine": "nicht_unternehmerisch", "gemeindebga": "gemeinde_bga", "bga": "gemeinde_bga"}
_STATUS = {"aktiv": "aktiv", "active": "aktiv", "aufgenommen": "aktiv", "mitglied": "aktiv", "ausgetreten": "ausgeschieden", "ausgeschieden": "ausgeschieden", "inaktiv": "ausgeschieden", "beendet": "ausgeschieden", "gekuendigt": "gekuendigt", "antrag": "antrag", "offen": "antrag", "neu": "antrag", "interessent": "interessent"}


def zahl_lesen(v):
	s = re.sub(r"%|€|\s|ct|kwp|kWp|EUR", "", "" if v is None else _js_str(v))
	if not s:
		return None
	if "," in s and "." in s:
		s = s.replace(".", "").replace(",", ".", 1) if s.rfind(",") > s.rfind(".") else s.replace(",", "")
	else:
		s = s.replace(",", ".", 1)
	n = _js_number(s)
	return _ganz_oder(n) if not _nan(n) and math.isfinite(n) else None


def datum_lesen(v):
	s = ("" if v is None else _js_str(v)).strip()[:10]
	if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s, re.ASCII):
		return s if datum_gueltig(s) else ""
	m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})", s, re.ASCII)
	if not m:
		return ""
	j = f"20{m.group(3)}" if len(m.group(3)) == 2 else m.group(3)
	iso = f"{j}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
	return iso if datum_gueltig(iso) else ""


def tf_lesen(v):
	roh = ("" if v is None else _js_str(v)).strip()
	n = zahl_lesen(roh)
	if n is None:
		return None
	if 0 < n <= 1 and re.search(r",|\.", roh) and "%" not in roh:
		return _js_round(n * 100)
	return n


def _nach_schluessel(mp, v):
	return mp.get(spalte_normalisieren(v)) or ""


def _t(v, mx=160):
	return re.sub(r"\s+", " ", "" if v is None else _js_str(v)).strip()[:mx]


def zeilen_abbilden(zeilen=None, zuordnung=None):
	zeilen, zuordnung = zeilen or [], zuordnung or {}

	def w(z, f):
		return "" if f not in zuordnung else _t(z[zuordnung[f]] if zuordnung[f] < len(z) else "", 300)

	out = []
	for i, z in enumerate(zeilen):
		firma = w(z, "firma")
		art = _nach_schluessel(_ART, w(z, "art")) or ("kmu" if firma else "privat")
		ib = re.sub(r"\s", "", w(z, "iban")).upper()
		ref = w(z, "sepa_referenz")
		email = w(z, "email").lower()
		nr = re.sub(r"^0+(?=\d)", "", w(z, "mitgliedsnummer"))
		person = {"vorname": w(z, "vorname"), "nachname": w(z, "nachname"), "firma": firma, "strasse": w(z, "strasse"), "plz": re.sub(r"^A-?", "", w(z, "plz"), flags=re.IGNORECASE), "ort": w(z, "ort"), "email": email, "telefon": w(z, "telefon")}
		m = {
			"mitgliedsnummer": nr, "art": art, "person": person,
			"iban": ib, "sepaMandat": {"referenz": ref[:35], "datum": datum_lesen(w(z, "sepa_datum")), "status": "aktiv"} if ref else None,
			"steuerstatusErzeuger": _nach_schluessel(_STEUER, w(z, "steuerstatus")), "uid": re.sub(r"\s", "", w(z, "uid")).upper(),
			"beitrittAm": datum_lesen(w(z, "beitritt_am")), "status": _nach_schluessel(_STATUS, w(z, "status")) or "aktiv",
		}
		zp = re.sub(r"\s|-|\.", "", w(z, "zaehlpunkt")).upper()
		richtung_roh = w(z, "richtung")
		richtung = _nach_schluessel(_RICHTUNG, richtung_roh)
		kwp = zahl_lesen(w(z, "kwp"))
		if not richtung and zp:
			richtung = "erzeugung" if kwp else ""
		tf = tf_lesen(w(z, "teilnahmefaktor"))
		consent = w(z, "consent_id")
		if nr:
			schluessel = f"nr:{nr}"
		elif email:
			schluessel = f"mail:{email}"
		else:
			schluessel = "name:" + spalte_normalisieren(f"{person['vorname']}{person['nachname']}{firma}{person['plz']}")
		out.append({
			"zeile": i + 2, "schluessel": schluessel, "mitglied": m,
			"zaehlpunkt": {"nummer": zp, "richtung": richtung, "richtungRoh": richtung_roh} if zp else None,
			"teilnahme": {"teilnahmefaktor": tf, "aufteilungsschluesselPct": zahl_lesen(w(z, "aufteilungsschluessel")), "consentId": consent, "gueltigAb": datum_lesen(w(z, "aktiv_seit"))} if zp else None,
			"anlage": {"kwp": kwp} if kwp else None,
			"tarif": {"bezugspreisCt": zahl_lesen(w(z, "tarif_bezug_ct")), "einspeisepreisCt": zahl_lesen(w(z, "tarif_einspeisung_ct"))},
			"saldoEur": zahl_lesen(w(z, "offener_saldo_eur")),
		})
	return out


def _r10(x):
	return _ganz_oder(_js_round(x * 10) / 10)


def _r100(x):
	return _ganz_oder(_js_round(x * 100) / 100)


def plausibilitaet(ds=None, k=None):
	ds, k = ds or [], k or {}
	gemeinschaft = k.get("gemeinschaft") or {}
	netzbetreiber = k.get("netzbetreiber") or []
	bestand = k.get("bestandZaehlpunkte") or []
	fehler, warnungen, hinweise = [], [], []

	def F(z, f, t):
		fehler.append({"zeile": z, "feld": f, "text": t})

	def W(z, f, t):
		warnungen.append({"zeile": z, "feld": f, "text": t})

	modell = gemeinschaft.get("modell") or ""
	nb_ids = gemeinschaft.get("netzbetreiber") or []
	zp_gesehen = {}
	nr_namen = {}
	mail_schl = {}
	tarife = []
	kwp_summe = 0
	ohne_consent = 0
	migration = 0
	saldo = 0
	aufteilung = 0
	mitglieder = set()
	for d in ds:
		m = d["mitglied"]
		p = m["person"]
		z = d["zeile"]
		mitglieder.add(d["schluessel"])
		if not p.get("nachname") and not p.get("firma"):
			F(z, "nachname", "Name bzw. Firma fehlt.")
		if m["art"] not in M.MITGLIED_ARTEN:
			F(z, "art", "Mitgliedsart unbekannt.")
		if modell == "eeg" and m["art"] == "grossunternehmen":
			F(z, "art", "Großunternehmen sind in einer EEG nicht zulässig (ElWG § 6 Abs. 1 Z 61) – möglich ist eine BEG.")
		if m.get("iban") and not MK.iban(m["iban"]):
			F(z, "iban", "IBAN ungültig (Prüfsumme).")
		if m.get("sepaMandat") and not m.get("iban"):
			F(z, "sepa_referenz", "SEPA-Mandat ohne IBAN.")
		if m.get("sepaMandat") and not m["sepaMandat"].get("datum"):
			W(z, "sepa_datum", "Mandatsdatum fehlt – Lastschrift erst nach Ergänzung.")
		if m.get("iban") and not m.get("sepaMandat"):
			W(z, "sepa_referenz", "IBAN ohne SEPA-Mandat – Zahlung per Überweisung.")
		st = m.get("steuerstatusErzeuger")
		if st and st not in M.STEUERSTATUS_ERZEUGER:
			F(z, "steuerstatus", "Steuerstatus unbekannt.")
		if (M.STEUERSTATUS_ERZEUGER.get(st) or {}).get("uidPflicht") and not ST.uid_pruefen(m.get("uid")):
			F(z, "uid", "Regelbesteuerte Erzeuger bzw. Gemeinden mit BgA brauchen eine gültige UID (Reverse Charge).")
		if m.get("uid") and not ST.uid_pruefen(m["uid"]):
			F(z, "uid", "UID-Format ATU + 8 Ziffern.")
		if p.get("plz") and not re.fullmatch(r"\d{4}", p["plz"], re.ASCII):
			W(z, "plz", "PLZ ist nicht vierstellig.")
		if m.get("mitgliedsnummer"):
			name = spalte_normalisieren(f"{p.get('vorname')}{p.get('nachname')}{p.get('firma')}")
			if m["mitgliedsnummer"] in nr_namen and nr_namen[m["mitgliedsnummer"]] != name:
				F(z, "mitgliedsnummer", f"Mitgliedsnummer {m['mitgliedsnummer']} ist mehreren Personen zugeordnet.")
			nr_namen[m["mitgliedsnummer"]] = name
		if p.get("email"):
			if p["email"] in mail_schl and mail_schl[p["email"]] != d["schluessel"]:
				W(z, "email", "Dieselbe E-Mail-Adresse bei mehreren Mitgliedern.")
			mail_schl[p["email"]] = d["schluessel"]
		if isinstance(d.get("saldoEur"), (int, float)) and not isinstance(d.get("saldoEur"), bool):
			saldo += d["saldoEur"]
		t = d["tarif"]
		if t.get("bezugspreisCt") is not None or t.get("einspeisepreisCt") is not None:
			key = f"{_js_str(t.get('bezugspreisCt')) if t.get('bezugspreisCt') is not None else ''}|{_js_str(t.get('einspeisepreisCt')) if t.get('einspeisepreisCt') is not None else ''}"
			if key not in tarife:
				tarife.append(key)
			for kk in ("bezugspreisCt", "einspeisepreisCt"):
				vv = t.get(kk)
				if vv is not None and (vv < 0 or vv > 60):
					W(z, kk, f"Preis {_js_str(vv)} ct/kWh ist ungewöhnlich (erwartet 0–60 ct netto).")
		if not d.get("zaehlpunkt"):
			W(z, "zaehlpunkt", "Kein Zählpunkt – Mitglied wird ohne Teilnahme übernommen (förderndes Mitglied bzw. Ergänzung später).")
			continue
		pr = ST.zaehlpunkt_pruefen(d["zaehlpunkt"]["nummer"], netzbetreiber)
		if not pr["ok"]:
			F(z, "zaehlpunkt", pr["fehler"])
			continue
		for h in pr["hinweise"]:
			W(z, "zaehlpunkt", h)
		if nb_ids and pr["netzbetreiberId"] and pr["netzbetreiberId"] not in nb_ids:
			W(z, "zaehlpunkt", "Zählpunkt liegt bei einem Netzbetreiber, der für diese Gemeinschaft nicht hinterlegt ist.")
		if pr["wert"] in zp_gesehen:
			F(z, "zaehlpunkt", f"Zählpunkt doppelt (auch Zeile {zp_gesehen[pr['wert']]}).")
		zp_gesehen[pr["wert"]] = z
		if pr["wert"] in bestand:
			W(z, "zaehlpunkt", "Zählpunkt ist in der Gemeinschaft bereits erfasst – vorhandene Teilnahme bleibt, keine Dublette.")
		if not d["zaehlpunkt"].get("richtung"):
			F(z, "richtung", f"Energierichtung unbekannt („{d['zaehlpunkt'].get('richtungRoh') or 'leer'}“) – erwartet Verbrauch/Bezug bzw. Erzeugung/Einspeisung.")
		tf = d["teilnahme"].get("teilnahmefaktor")
		if tf is None:
			W(z, "teilnahmefaktor", "Teilnahmefaktor fehlt – 100 % angenommen.")
		elif not float(tf).is_integer() or tf < M.TF_MIN or tf > M.TF_MAX:
			F(z, "teilnahmefaktor", f"Teilnahmefaktor {_js_str(tf)} – erlaubt sind ganze Prozent {M.TF_MIN}–{M.TF_MAX} (ElWG § 71 Abs. 5).")
		cid = d["teilnahme"].get("consentId")
		if not cid:
			ohne_consent += 1
		elif cid == M.CONSENT_MIGRATION:
			migration += 1
		if gemeinschaft.get("verteilmodell") == "statisch" and d["zaehlpunkt"].get("richtung") == "verbrauch":
			if d["teilnahme"].get("aufteilungsschluesselPct") is None:
				W(z, "aufteilungsschluessel", "Statisches Modell: Aufteilungsschlüssel fehlt.")
			else:
				aufteilung += d["teilnahme"]["aufteilungsschluesselPct"]
		if d["zaehlpunkt"].get("richtung") == "erzeugung":
			if not d.get("anlage"):
				W(z, "kwp", "Erzeugungszählpunkt ohne Anlagenleistung – § 69-Schwelle nicht prüfbar.")
			else:
				kwp_summe += d["anlage"]["kwp"]
	if ohne_consent:
		hinweise.append({"text": f"{ohne_consent} Zählpunkt(e) ohne Consent-ID – sie werden beim Abgleich mit der Zählpunktliste des Netzbetreibers (EC_PODLIST) ergänzt.", "quelle": "HA II 5.5"})
	if migration:
		hinweise.append({"text": f"{migration} Altzuordnung(en) mit Consent-ID „Migration“ (vor 03.10.2022) – gültig.", "quelle": "HA II 7.2"})
	if len(tarife) > 1:
		warnungen.append({"zeile": 0, "feld": "tarif", "text": f"{len(tarife)} verschiedene Preiskombinationen – übernommen wird der häufigste Preis als Tarif, Abweichungen als individuelle Preise prüfen."})
	if gemeinschaft.get("verteilmodell") == "statisch" and aufteilung and abs(aufteilung - 100) > 0.05:
		warnungen.append({"zeile": 0, "feld": "aufteilungsschluessel", "text": f"Summe der Aufteilungsschlüssel {_js_str(_r10(aufteilung))} % – der Netzbetreiber normiert erst über 100 % (HA II)."})
	if kwp_summe > M.LIEFERANTENPFLICHT_KW["allgemein"]:
		hinweise.append({"text": f"Erzeugungsleistung laut Import {_js_str(_r10(kwp_summe))} kWp – Lieferantenpflichten nach § 69 ElWG prüfen.", "quelle": "ElWG § 69"})
	if modell and modell not in M.EG_MODELLE:
		warnungen.append({"zeile": 0, "feld": "modell", "text": "Modell der Gemeinschaft unbekannt."})
	zeilen_status = {}
	for d in ds:
		zeilen_status[str(d["zeile"])] = "ok"
	for w in warnungen:
		if w["zeile"]:
			zeilen_status[str(w["zeile"])] = "warnung"
	for f in fehler:
		zeilen_status[str(f["zeile"])] = "fehler"
	return {
		"ok": not fehler, "fehler": fehler, "warnungen": warnungen, "hinweise": hinweise, "zeilenStatus": zeilen_status,
		"kennzahlen": {"zeilen": len(ds), "mitglieder": len(mitglieder), "zaehlpunkte": len(zp_gesehen), "verbrauch": len([d for d in ds if (d.get("zaehlpunkt") or {}).get("richtung") == "verbrauch"]), "erzeugung": len([d for d in ds if (d.get("zaehlpunkt") or {}).get("richtung") == "erzeugung"]), "ohneConsent": ohne_consent, "migrationConsent": migration, "kwp": _r100(kwp_summe), "tarife": len(tarife), "saldoEur": _r100(saldo), "fehlerZeilen": len([x for x in zeilen_status.values() if x == "fehler"])},
	}


def _csv_feld(v):
	s = "" if v is None else _js_str(v)
	return '"' + s.replace('"', '""') + '"' if re.search(r';|"|\n|\r', s) else s


def import_plan(ds=None, o=None):
	ds, o = ds or [], o or {}
	raus = set(o.get("ausschliessen") or [])
	bestand = o.get("bestand") or []
	liste = [d for d in ds if d["zeile"] not in raus]
	erst = []
	for d in liste:
		if d["schluessel"] not in erst:
			erst.append(d["schluessel"])
	pos = {k: i for i, k in enumerate(erst)}

	def erste(k):
		return next(x for x in liste if x["schluessel"] == k)

	def nr_alt(k):
		n = _js_number(erste(k)["mitglied"]["mitgliedsnummer"])
		return 1e12 if (_nan(n) or n == 0) else n

	reihenfolge = sorted(erst, key=lambda k: (nr_alt(k), pos[k]))
	naechste = 1 + max([_zahl_oder_0(x.get("mitgliedsnummer")) for x in bestand] or [0])
	nummer = {}
	for k in reihenfolge:
		d = erste(k)
		mail = d["mitglied"]["person"].get("email")
		vorh = next((b for b in bestand if b.get("email") and b["email"] == mail), None) if mail else None
		if vorh:
			nummer[k] = {"neu": False, "nummer": _zahl_oder_0(vorh.get("mitgliedsnummer"))}
		else:
			nummer[k] = {"neu": True, "nummer": naechste}
			naechste += 1
	zeilen = []
	gesehen = set()
	for k in reihenfolge:
		for d in [x for x in liste if x["schluessel"] == k]:
			m = d["mitglied"]
			p = m["person"]
			nn = nummer[k]
			nr = "" if nn["neu"] and k not in gesehen else _js_str(nn["nummer"])
			gesehen.add(k)
			tf = ""
			if d.get("zaehlpunkt"):
				tf = d["teilnahme"]["teilnahmefaktor"] if d["teilnahme"].get("teilnahmefaktor") is not None else 100
			zeilen.append([nr, m["art"], p["vorname"], p["nachname"], p["firma"], p["strasse"], p["plz"], p["ort"], p["email"], m["iban"], (m.get("sepaMandat") or {}).get("referenz") or "", (m.get("sepaMandat") or {}).get("datum") or "", m.get("steuerstatusErzeuger") or "", m.get("uid"), (d.get("zaehlpunkt") or {}).get("nummer") or "", (d.get("zaehlpunkt") or {}).get("richtung") or "", tf, (d.get("anlage") or {}).get("kwp") if d.get("anlage") else ""])
	csv = "\r\n".join([";".join(WP1_CSV_SPALTEN)] + [";".join(_csv_feld(v) for v in z) for z in zeilen]) + "\r\n"
	zaehl = {}
	reihe = []
	for d in liste:
		t = d["tarif"]
		if t.get("bezugspreisCt") is None and t.get("einspeisepreisCt") is None:
			continue
		key = f"{_js_str(t.get('bezugspreisCt')) if t.get('bezugspreisCt') is not None else ''}|{_js_str(t.get('einspeisepreisCt')) if t.get('einspeisepreisCt') is not None else ''}"
		if key not in zaehl:
			reihe.append(key)
		zaehl[key] = zaehl.get(key, 0) + 1
	tarif = None
	if zaehl:
		haeufig = min(reihe, key=lambda key: (-zaehl[key], key))
		a, b = haeufig.split("|")
		tarif = {"bezugspreisCt": None if a == "" else _ganz_oder(_js_number(a)), "einspeisepreisCt": None if b == "" else _ganz_oder(_js_number(b))}
	mitgl = []
	for k in reihenfolge:
		d = erste(k)
		mitgl.append({"schluessel": k, "mitgliedsnummer": nummer[k]["nummer"], "neu": nummer[k]["neu"], "alteNummer": d["mitglied"]["mitgliedsnummer"], "status": d["mitglied"]["status"], "saldoEur": _r100(sum((x.get("saldoEur") or 0) for x in liste if x["schluessel"] == k))})
	soll = [{"zaehlpunkt": d["zaehlpunkt"]["nummer"], "richtung": d["zaehlpunkt"]["richtung"], "teilnahmefaktor": d["teilnahme"]["teilnahmefaktor"] if d["teilnahme"].get("teilnahmefaktor") is not None else 100, "consentId": d["teilnahme"].get("consentId") or "", "gueltigAb": d["teilnahme"].get("gueltigAb") or "", "aufteilungsschluesselPct": d["teilnahme"].get("aufteilungsschluesselPct")} for d in liste if d.get("zaehlpunkt")]
	return {"csv": csv, "zeilen": len(zeilen), "mitglieder": mitgl, "tarif": tarif, "soll": soll}


def _erster_des_monats(iso, plus=0):
	j, m = int(_js_str(iso)[:4]), int(_js_str(iso)[5:7])
	idx = (j * 12 + (m - 1)) + plus
	return date(idx // 12, idx % 12 + 1, 1).isoformat()


def umstellungsplan(o=None):
	o = o or {}
	stichtag = o.get("stichtag") or ""
	heute = o.get("heute") or ""
	w = []
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", _js_str(stichtag), re.ASCII):
		return {"stichtag": "", "letzteAltabrechnung": "", "parallelVon": "", "parallelBis": "", "ersteAbrechnungAb": "", "termine": [], "warnungen": ["Bitte einen Stichtag wählen (Monatserster)."]}
	s = stichtag
	if s[8:10] != "01":
		s = _erster_des_monats(s, 1)
		w.append(f"Der Stichtag ist immer ein Monatserster – verschoben auf {'.'.join(reversed(s.split('-')))}.")
	vorlauf = tage_bis(heute, s) if heute else 99
	if vorlauf < 28:
		w.append(f"Nur {vorlauf} Tage bis zum Stichtag – empfohlen sind mindestens 8 Wochen (Mandat, EDA-Rolle, Mitgliederinformation, Parallellauf).")
	termine = []
	for x in WECHSEL_SCHRITTE:
		if (x.get("frist") or {}).get("art") == "stichtag":
			d = plus_tage(s, x["frist"]["tage"])
			termine.append({"datum": d, "schluessel": x["s"], "label": x["label"], "vergangen": (d < heute) if heute else False})
	erste_ab = _erster_des_monats(s, 1)[:8] + "20"
	termine.append({"datum": erste_ab, "schluessel": "erste_abrechnung", "label": "Erste Abrechnung bei ÖkoInvest (frühestens am 20. des Folgemonats)", "vergangen": False})
	termine.sort(key=lambda t: t["datum"])
	if any(t["vergangen"] for t in termine):
		w.append("Einige Termine liegen bereits in der Vergangenheit – Stichtag später wählen oder Schritte sofort erledigen.")
	return {"stichtag": s, "letzteAltabrechnung": _erster_des_monats(s, -1)[:7], "parallelVon": _erster_des_monats(s, -1), "parallelBis": plus_tage(s, -1), "ersteAbrechnungAb": erste_ab, "termine": termine, "warnungen": w}


def kontroll_vergleich(alt=None, neu=None, o=None):
	alt, neu, o = alt or [], neu or [], o or {}
	tol_eur = o.get("toleranzEur", 0.05)
	tol_kwh = o.get("toleranzKwh", 0.5)
	A = {_js_str(x.get("schluessel")): x for x in alt}
	N = {_js_str(x.get("schluessel")): x for x in neu}
	keys = sorted(set(A) | set(N))
	r2 = lambda x: _r100(_zahl_oder_0(x))
	zeilen = []
	for k in keys:
		a, n = A.get(k), N.get(k)
		if not a:
			zeilen.append({"schluessel": k, "name": n.get("name") or "", "altKwh": None, "neuKwh": r2(n.get("kwh")), "diffKwh": None, "altEur": None, "neuEur": r2(n.get("betragEur")), "diffEur": None, "status": "nur_neu", "erklaerung": "Nur in der neuen Abrechnung – z. B. Zählpunkt erst seit diesem Monat aktiv oder im Altsystem nicht abgerechnet."})
			continue
		if not n:
			zeilen.append({"schluessel": k, "name": a.get("name") or "", "altKwh": r2(a.get("kwh")), "neuKwh": None, "diffKwh": None, "altEur": r2(a.get("betragEur")), "neuEur": None, "diffEur": None, "status": "nur_alt", "erklaerung": "Fehlt in der neuen Abrechnung – Zählpunkt im Import bzw. in der Zählpunktliste des Netzbetreibers prüfen."})
			continue
		dk = r2(_zahl_oder_0(n.get("kwh")) - _zahl_oder_0(a.get("kwh")))
		de = r2(_zahl_oder_0(n.get("betragEur")) - _zahl_oder_0(a.get("betragEur")))
		gleich = abs(dk) <= tol_kwh and abs(de) <= tol_eur
		erkl = "" if gleich else ("Energiemenge weicht ab – Ersatzwerte (L2/L3), Nachlieferungen des Netzbetreibers oder Teilnahmefaktor prüfen." if abs(dk) > tol_kwh else "Gleiche Energiemenge, anderer Betrag – Preis, Rundung, Gebühren oder Umsatzsteuer prüfen.")
		zeilen.append({"schluessel": k, "name": n.get("name") or a.get("name") or "", "altKwh": r2(a.get("kwh")), "neuKwh": r2(n.get("kwh")), "diffKwh": dk, "altEur": r2(a.get("betragEur")), "neuEur": r2(n.get("betragEur")), "diffEur": de, "status": "gleich" if gleich else "abweichung", "erklaerung": erkl})
	s = lambda st: len([z for z in zeilen if z["status"] == st])
	return {"zeilen": zeilen, "summe": {"anzahl": len(zeilen), "gleich": s("gleich"), "abweichung": s("abweichung"), "nurAlt": s("nur_alt"), "nurNeu": s("nur_neu"), "diffEur": r2(sum(z["diffEur"] or 0 for z in zeilen)), "diffKwh": r2(sum(z["diffKwh"] or 0 for z in zeilen))}, "toleranz": {"eur": tol_eur, "kwh": tol_kwh}}


def elwg_anpassung(g=None, k=None):
	g, k = g or {}, k or {}
	mitglieder = k.get("mitglieder") or []
	dokumente = k.get("dokumente") or []
	stichtag = k.get("stichtag") or ""

	def hat(v):
		return any(d.get("vorlage") == v and _js_str(d.get("stand") or "") >= "2026-10-01" for d in dokumente)

	lp = bool(_get(g, "kennzahlen", "lieferantenpflichten"))
	dl = bool(_get(g, "dienstleistung", "aktiv"))
	p = [
		{"id": "statuten", "text": "Statuten auf §§ 65–72 ElWG umstellen (Verweise, Mehrfachteilnahme, Organisator, ggf. Online-Versammlung)", "pflicht": (M.EG_MODELLE.get(g.get("modell")) or {}).get("rechtsperson") is True, "erfuellt": hat("statuten_verein") or hat("statuten_egen") or bool(re.search("elwg", _js_str(g.get("statutenVersion") or ""), re.IGNORECASE)), "vorlage": "statuten_egen" if g.get("rechtsform") == "egen" else "statuten_verein", "quelle": "ElWG § 188, § 189 Abs. 17; Mustervorlagen Erneuerbare Energie Wien"},
		{"id": "vertraege", "text": "Teilnahme- und Erzeugerverträge anpassen und den Mitgliedern zur Zustimmung vorlegen (Nachtrag)", "pflicht": True, "erfuellt": hat("elwg_nachtrag") or (hat("teilnahmevertrag") and hat("erzeugervertrag")), "vorlage": "elwg_nachtrag", "quelle": "Koordinationsstelle: Verträge sollen angepasst werden"},
		{"id": "lieferantenpflichten", "text": f"Lieferantenpflichten (§ 69 ElWG): AGB und Informationsblatt{'' if lp else ' – derzeit unter der Schwelle'}", "pflicht": lp, "erfuellt": (not lp) or (hat("agb") and hat("informationsblatt")), "vorlage": "agb", "quelle": "ElWG § 69"},
		{"id": "rhythmus", "text": "Wahl zwischen Monats- und Jahresrechnung je Mitglied erfassen", "pflicht": lp, "erfuellt": (not lp) or all(m.get("status") not in ("aktiv", "aufgenommen") or bool(m.get("abrechnungsrhythmus")) for m in mitglieder), "quelle": "ElWG § 69 Abs. 3"},
		{"id": "organisator", "text": "Organisator bestellen und dem Netzbetreiber anzeigen", "pflicht": dl, "erfuellt": (not dl) or bool(g.get("organisatorAngezeigtAm")), "vorlage": "organisator_anzeige", "quelle": "ElWG § 68 Abs. 2"},
		{"id": "nahebereich", "text": "Nahebereichs-ID und Zonelevel mit dem Netzbetreiber abstimmen (Betreibervertrag)", "pflicht": g.get("modell") in ("eeg", "beg", "gea"), "erfuellt": bool(g.get("nahebereichRef")) and bool(g.get("zonelevel")), "quelle": "HA II 7.1; ebUtilities-Konzept 04/2026 (zu bestätigen)"},
		{"id": "datenschutz", "text": "Datenschutzinformation aktualisieren (Organisator als Auftragsverarbeiter)", "pflicht": True, "erfuellt": hat("datenschutz"), "vorlage": "datenschutz", "quelle": "DSGVO Art. 13, 28"},
		{"id": "kontrolle", "text": "BEG: Kontrollklausel in den Statuten prüfen", "pflicht": g.get("modell") == "beg", "erfuellt": g.get("modell") != "beg" or hat("statuten_verein") or hat("statuten_egen"), "quelle": "ElWG § 67 Abs. 3"},
		{"id": "grossunternehmen", "text": "EEG: keine Großunternehmen unter den Mitgliedern", "pflicht": g.get("modell") == "eeg", "erfuellt": g.get("modell") != "eeg" or not any(m.get("art") == "grossunternehmen" and m.get("status") in ("aktiv", "aufgenommen", "gekuendigt") for m in mitglieder), "quelle": "ElWG § 6 Abs. 1 Z 61; EAG § 79 Abs. 2"},
		{"id": "kommunikation", "text": "Mitglieder zur Netzentgelt-Übergangsregelung bis 31.12.2026 und zur neuen Verordnung ab 2027 informieren", "pflicht": False, "erfuellt": False, "quelle": "Fachkonzept 0 Punkt 2; Marktanalyse 1.5 (Widerspruch zu bestätigen)"},
	]
	for x in p:
		x["frist"] = (stichtag or "") if x["pflicht"] else ""
		x["status"] = "erfuellt" if x["erfuellt"] else "offen" if x["pflicht"] else "empfohlen"
	return {"punkte": p, "offen": len([x for x in p if x["status"] == "offen"]), "erfuellt": len([x for x in p if x["status"] == "erfuellt"]), "stichtag": stichtag}


def wechsel_nachricht(o=None):
	o = o or {}
	name, stichtag, alt = o.get("name") or "", o.get("stichtag") or "", o.get("altdienstleister") or ""
	d = ".".join(reversed(stichtag.split("-"))) if stichtag else ""
	return {
		"titel": f"Ihre Energiegemeinschaft „{name}“: neue Betriebsführung{f' ab {d}' if d else ''}",
		"text": f"Ab {d or 'dem Stichtag'} übernimmt die ÖkoInvest GmbH die Betriebsführung{f' (bisher {alt})' if alt else ''}. Ihre Zählpunkte bleiben angemeldet – Sie müssen beim Netzbetreiber nichts tun. Rechnungen und Gutschriften finden Sie künftig im Mitgliederportal.",
	}


# ================================================================ Verein (verein.js)


def _r2(x):
	x = float(x or 0)
	return _ganz_oder(_js_round(x * 100 + 1e-9) / 100)


def organ_check(g=None, organe=None, o=None):
	g, organe, o = g or {}, organe or [], o or {}
	heute = o.get("heute")
	periode = o.get("funktionsperiodeJahre", 3)
	vorlauf = o.get("vorlaufTage", 90)
	b = []

	def B(stufe, text, quelle):
		b.append({"stufe": stufe, "text": text, "quelle": quelle})

	wirksam = [x for x in organe if (not g.get("id") or x.get("gemeinschaftId") == g.get("id")) and ST.organ_wirksam(x, heute)]
	person = lambda x: x.get("kontoId") or _txt(x.get("name")).lower()
	leitung = {person(x) for x in wirksam if (M.ORGAN_FUNKTIONEN.get(x.get("funktion")) or {}).get("leitung")}
	pruefer = {person(x) for x in wirksam if x.get("funktion") == "rechnungspruefer"}
	zeichnung = {person(x) for x in wirksam if x.get("zeichnungsberechtigt")}
	hat = lambda f: any(x.get("funktion") == f for x in wirksam)
	rf = g.get("rechtsform")
	if rf == "verein":
		if len(leitung) < 2:
			B("fehler", f"Das Leitungsorgan besteht aus {len(leitung)} Person(en) – erforderlich sind mindestens 2.", "VerG § 5 Abs. 3")
		if not hat("obmann"):
			B("warn", "Keine Obfrau bzw. kein Obmann eingetragen (Vertretung nach außen laut Musterstatuten).", "Musterstatuten")
		if not hat("kassier"):
			B("warn", "Keine Kassierin bzw. kein Kassier – Geldgebarung und 1. Auge der Abrechnungsfreigabe fehlen.", "Musterstatuten; Fachkonzept 5")
		if len(pruefer) < 2:
			B("fehler", f"{len(pruefer)} Rechnungsprüfer – erforderlich sind 2.", "VerG § 5 Abs. 5")
		if any(p in leitung for p in pruefer):
			B("fehler", "Rechnungsprüfer dürfen dem Leitungsorgan nicht angehören.", "VerG § 5 Abs. 5")
	elif rf == "egen":
		vorstand = {person(x) for x in wirksam if x.get("funktion") in ("vorstand", "obmann", "obmann_stv", "geschaeftsfuehrer", "kassier", "schriftfuehrer")}
		if len(vorstand) < 2:
			B("fehler", "Der Vorstand einer Genossenschaft besteht aus mindestens 2 Personen.", "GenG § 15 (zu bestätigen)")
		if not hat("aufsichtsrat"):
			B("info", "Kein Aufsichtsrat eingetragen – nur nötig, wenn gesetzlich vorgeschrieben oder in der Satzung vorgesehen.", "GenG § 24 (zu bestätigen)")
	elif rf == "gmbh":
		if not hat("geschaeftsfuehrer"):
			B("fehler", "Keine Geschäftsführung eingetragen.", "GmbHG § 15")
	if len(zeichnung) < 2 and rf and rf != "keine":
		B("warn", f"{len(zeichnung)} zeichnungsberechtigte Person(en) – das Vier-Augen-Prinzip (Abrechnung, Zahlungsdateien) braucht zwei.", "Fachkonzept 5")
	faellig = []
	for x in wirksam:
		ende = x.get("bis") or (plus_tage(x["von"], _js_round(_zahl_oder_0(periode) * 365.25)) if x.get("von") else "")
		if not ende:
			continue
		t = tage_bis(heute, ende)
		if t <= vorlauf:
			faellig.append({"organId": x.get("id"), "name": x.get("personName") or x.get("name") or "", "funktion": x.get("funktion"), "funktionLabel": (M.ORGAN_FUNKTIONEN.get(x.get("funktion")) or {}).get("label") or x.get("funktion"), "ende": ende, "tage": t, "abgelaufen": t < 0, "ausBis": bool(x.get("bis"))})
	faellig.sort(key=lambda f: f["tage"])
	if any(f["abgelaufen"] for f in faellig):
		B("warn", "Funktionsperiode abgelaufen: " + ", ".join(f"{f['funktionLabel']} {f['name']}" for f in faellig if f["abgelaufen"]) + " – Neuwahl in der nächsten Versammlung.", "Statuten (Funktionsperiode)")
	elif faellig:
		B("info", "Funktionsperiode endet bald: " + ", ".join(f"{f['funktionLabel']} {f['name']}" for f in faellig) + " – Wahl auf die Tagesordnung setzen.", "Statuten (Funktionsperiode)")
	return {"ok": not any(x["stufe"] == "fehler" for x in b), "befunde": b, "besetzung": {"leitung": len(leitung), "pruefer": len(pruefer), "zeichnungsberechtigt": len(zeichnung), "wirksam": len(wirksam)}, "faellig": faellig}


def gv_konfig(g=None, statuten=None):
	g, statuten = g or {}, statuten or {}
	return {"land": "AT", "onlineGv": statuten.get("onlineGv") is not False, "einladungsfristTage": _zahl_oder_0(statuten.get("einladungsfristTage")) or 14, "name": g.get("name") or "", "rechtsform": g.get("rechtsform") or ""}


def gv_pflicht(o=None):
	o = o or {}
	rf = o.get("rechtsform") or "verein"
	heute = o.get("heute")
	ord_ = sorted(_js_str(v.get("datum"))[:10] for v in (o.get("versammlungen") or []) if v.get("status") == "abgeschlossen" and v.get("art") != "ausserordentlich")
	letzte = ord_[-1] if ord_ else ""
	jahre = min(5, max(1, _zahl_oder_0(o.get("turnusJahre", 1)) or 1)) if rf == "verein" else 1
	basis = letzte or o.get("gegruendetAm") or ""
	spaetestens = plus_tage(basis, _js_round(jahre * 365.25)) if basis else ""
	tage = tage_bis(heute, spaetestens) if spaetestens else None
	quelle = "VerG § 5 Abs. 2; Statuten" if rf == "verein" else "GenG; Satzung (jährlich, zu bestätigen)" if rf == "egen" else "GmbHG § 35 (zu bestätigen)"
	sd = ".".join(reversed(spaetestens.split("-"))) if spaetestens else ""
	text = "Noch keine ordentliche Versammlung erfasst." if not basis else (f"Die ordentliche Versammlung ist überfällig (spätestens {sd})." if tage < 0 else f"Nächste ordentliche Versammlung spätestens {sd} (in {tage} Tagen).")
	return {"letzte": letzte, "spaetestens": spaetestens, "tage": tage, "ueberfaellig": tage is not None and tage < 0, "text": text, "quelle": quelle, "turnusJahre": jahre}


def gv_tagesordnung_vorlage(o=None):
	o = o or {}
	t = []

	def add(titel, beschluss=False, mehrheit="einfach", satzung=False, text=""):
		t.append({"titel": titel, "beschluss": beschluss, "mehrheit": mehrheit if beschluss else None, "satzung": satzung, "text": text})

	verein = (o.get("rechtsform") or "verein") == "verein"
	add("Begrüßung, Feststellung der ordnungsgemäßen Einladung und der Beschlussfähigkeit")
	if o.get("art") != "ausserordentlich":
		add("Bericht des Vorstands über Tätigkeit, Energiebilanz und finanzielle Gebarung (§ 20 VerG)" if verein else "Bericht des Vorstands über das Geschäftsjahr")
		add("Bericht der Rechnungsprüfer" if verein else "Bericht über die Revision (Revisionsverband)")
		add("Genehmigung des Rechnungsabschlusses" if verein else "Feststellung des Jahresabschlusses", True)
		add("Entlastung des Vorstands", True)
		if o.get("wahl"):
			add("Wahl des Vorstands und der Rechnungsprüfer" if verein else "Wahlen in Vorstand bzw. Aufsichtsrat", True)
		if o.get("beitrag"):
			add("Festsetzung der Beitrittsgebühr und der Mitgliedsbeiträge", True)
		if o.get("tarif"):
			add("Beschluss über Tarife und Preisblatt", True, "einfach", False, "Information der Mitglieder mindestens einen Monat vor Wirksamkeit (§ 21 ElWG, bei Lieferantenpflicht).")
	if o.get("elwg"):
		add("Änderung der Statuten zur Anpassung an das ElWG (§§ 65–72 ElWG)", True, "zweidrittel", True)
	if o.get("organisator"):
		add("Bestellung eines Organisators nach § 68 Abs. 2 ElWG und Abschluss des Auftragsverarbeitungsvertrags", True)
	if o.get("wechsel"):
		add("Wechsel der Betriebsführung (Dienstleister) zum Stichtag", True)
	if o.get("aufloesung"):
		add("Freiwillige Auflösung und Bestellung einer Abwicklerin bzw. eines Abwicklers", True, "zweidrittel", True)
	add("Allfälliges")
	return t


def beschluss_bereinigen(d=None, o=None):
	d, o = d or {}, o or {}
	heute = o.get("heute")
	gremium = d.get("gremium") if d.get("gremium") in BESCHLUSS_GREMIEN else ""
	if not gremium:
		raise _fehler("Bitte das Gremium wählen.", "gremium")
	datum_ = d.get("datum") if datum_gueltig(d.get("datum")) else ""
	if not datum_:
		raise _fehler("Bitte das Datum des Beschlusses angeben.", "datum")
	if heute and datum_ > heute:
		raise _fehler("Das Beschlussdatum liegt in der Zukunft.", "datum")
	gegenstand = _txt(d.get("gegenstand"), 200)
	if len(gegenstand) < 3:
		raise _fehler("Bitte den Gegenstand des Beschlusses angeben.", "gegenstand")
	kategorie = d.get("kategorie") if d.get("kategorie") in BESCHLUSS_KATEGORIEN else "sonstiges"

	def zahl_ok(v):
		n = _js_number(v) if v is not None else float("nan")
		n = 0 if _nan(n) else n
		return max(0, min(100000, _js_round(n)))

	ja, nein, enth = zahl_ok(d.get("ja")), zahl_ok(d.get("nein")), zahl_ok(d.get("enthaltung"))
	mehrheit = d.get("mehrheit") if d.get("mehrheit") in MEHRHEIT_ANTEIL else "einfach"
	if kategorie in ("statuten", "aufloesung") and gremium != "gv":
		raise _fehler("Statutenänderung und Auflösung beschließt nur die Mitglieder- bzw. Generalversammlung.", "gremium")
	if kategorie in ("statuten", "aufloesung") and MEHRHEIT_ANTEIL[mehrheit] < MEHRHEIT_ANTEIL["zweidrittel"]:
		mehrheit = "zweidrittel"
	if kategorie == "wahl" and gremium == "umlauf":
		raise _fehler("Wahlen sind im Umlaufverfahren nicht vorgesehen (Musterstatuten).", "gremium")
	if not ja and not nein:
		raise _fehler("Bitte das Stimmenverhältnis angeben (Ja/Nein).", "ja")
	text = re.sub(r"\r\n?", "\n", _js_str(d.get("text") or "")).strip()[:3000]
	return {"gremium": gremium, "datum": datum_, "gegenstand": gegenstand, "kategorie": kategorie, "text": text, "ja": ja, "nein": nein, "enthaltung": enth, "mehrheit": mehrheit, "angenommen": MK.angenommen(ja, nein, mehrheit), "versammlungId": _txt(d.get("versammlungId"), 40), "top": _txt(d.get("top"), 10)}


def beschluesse_aus_versammlung(gv, ergebnis):
	datum_ = _js_str(gv.get("datum") or "")[:10]
	out = []
	for t in (ergebnis or {}).get("tops") or []:
		top = next((x for x in gv.get("tagesordnung") or [] if x.get("id") == t["id"]), {})
		ti = t["titel"]
		if top.get("satzung"):
			kat = "aufloesung" if re.search("aufl", ti, re.IGNORECASE) else "statuten"
		elif re.search("tarif|preis", ti, re.IGNORECASE):
			kat = "tarif"
		elif re.search("wahl", ti, re.IGNORECASE):
			kat = "wahl"
		elif re.search("entlast|rechnungsabschluss|jahresabschluss", ti, re.IGNORECASE):
			kat = "entlastung"
		elif re.search("beitr", ti, re.IGNORECASE):
			kat = "beitrag"
		elif re.search("organisator", ti, re.IGNORECASE):
			kat = "organisator"
		elif re.search("wechsel", ti, re.IGNORECASE):
			kat = "wechsel"
		else:
			kat = "sonstiges"
		out.append({"gremium": "gv", "datum": datum_, "gegenstand": ti, "kategorie": kat, "text": "", "ja": t["ja"], "nein": t["nein"], "enthaltung": t["enthaltung"], "mehrheit": t["mehrheit"], "angenommen": t["angenommen"], "versammlungId": gv.get("id"), "top": t["id"]})
	return out


def beitraege_vorschreiben(o=None):
	o = o or {}
	jn = _js_number(o.get("jahr")) if o.get("jahr") is not None else float("nan")
	if _nan(jn) or not float(jn).is_integer() or jn < 2000 or jn > 2100:
		raise _fehler("Bitte ein gültiges Jahr angeben.", "jahr")
	j = int(jn)
	b = _zahl_oder_0(o.get("betragJahr"))
	g = _zahl_oder_0(o.get("beitrittsgebuehr"))
	if b < 0 or b > 10000 or g < 0 or g > 10000:
		raise _fehler("Beitrag bzw. Gebühr: 0 bis 10.000 €.", "betragJahr")
	vorhandene = o.get("vorhandene") or []
	da = {f"{x.get('mitgliedId')}|{_js_str(x.get('jahr'))}|{x.get('art')}" for x in vorhandene}
	faellig = o.get("faelligAm") if datum_gueltig(o.get("faelligAm")) else f"{j}-03-31"
	out = []
	for m in o.get("mitglieder") or []:
		if m.get("status") not in ("aufgenommen", "aktiv", "gekuendigt"):
			continue
		ein = _js_str(m.get("beitrittAm") or "")[:10]
		if ein and int(ein[:4]) > j:
			continue
		if m.get("austrittZum") and _js_str(m["austrittZum"]) < f"{j}-01-01":
			continue
		if b > 0 and f"{m.get('id')}|{j}|jahresbeitrag" not in da:
			betrag = b
			if o.get("anteilig") and ein and int(ein[:4]) == j:
				betrag = _r2((b * (13 - int(ein[5:7]))) / 12)
			out.append({"mitgliedId": m.get("id"), "jahr": j, "art": "jahresbeitrag", "betragEur": _r2(betrag), "faelligAm": faellig, "status": "offen"})
		if g > 0 and ein and int(ein[:4]) == j and f"{m.get('id')}|{j}|beitrittsgebuehr" not in da and not any(x.get("mitgliedId") == m.get("id") and x.get("art") == "beitrittsgebuehr" for x in vorhandene):
			out.append({"mitgliedId": m.get("id"), "jahr": j, "art": "beitrittsgebuehr", "betragEur": _r2(g), "faelligAm": faellig, "status": "offen"})
	return out


def beitrags_uebersicht(beitraege=None, o=None):
	jahr = (o or {}).get("jahr")
	liste = [x for x in (beitraege or []) if jahr is None or x.get("jahr") == _zahl_oder_0(jahr)]
	s = lambda f: _r2(sum(_zahl_oder_0(x.get("betragEur")) for x in liste if f(x)))
	return {"anzahl": len(liste), "sollEur": s(lambda x: x.get("status") != "erlassen"), "bezahltEur": s(lambda x: x.get("status") == "bezahlt"), "offenEur": s(lambda x: x.get("status") == "offen"), "erlassenEur": s(lambda x: x.get("status") == "erlassen"), "offen": len([x for x in liste if x.get("status") == "offen"])}


def aufloesung_checkliste(g=None, o=None):
	g, o = g or {}, o or {}
	ta = o.get("teilnahmenAktiv", 0)
	op = o.get("offenePosten", 0)
	stand = o.get("stand") or {}
	verein = g.get("rechtsform") == "verein"
	liste = [
		{"id": "beschluss", "text": "Auflösungsbeschluss der Mitgliederversammlung (Zwei-Drittel-Mehrheit) und Bestellung der Abwicklung" if verein else "Auflösungsbeschluss der Generalversammlung bzw. der Gesellschafter", "quelle": "Statuten; VerG § 28", "pflicht": True},
		{"id": "abmeldung", "text": f"Alle Zählpunkte abmelden (CM_REV_SP, nicht rückwirkend){f' – derzeit {ta} aktive Teilnahme(n)' if ta else ''}", "quelle": "Fachkonzept 2.7; HA II", "pflicht": True, "auto": ta == 0},
		{"id": "betreibervertrag", "text": "Vertrag mit dem Netzbetreiber kündigen", "quelle": "Fachkonzept 2.7", "pflicht": g.get("modell") in ("eeg", "beg", "gea")},
		{"id": "schlussabrechnung", "text": f"Schlussabrechnung mit allen Mitgliedern{f' – {op} offene Posten' if op else ''}", "quelle": "Fachkonzept 2.7 (WP4)", "pflicht": True, **({} if op == 0 else {"auto": False})},
		{"id": "vermoegen", "text": "Vermögensverwendung laut Statuten (keine Verteilung an Mitglieder)", "quelle": "VerG § 3 Abs. 2 Z 11; Statuten", "pflicht": True},
		{"id": "behoerde", "text": "Anzeige der Auflösung an die Vereinsbehörde binnen 4 Wochen" if verein else "Liquidation und Löschung im Firmenbuch", "quelle": "VerG § 28 Abs. 2, §§ 29–30" if verein else "GenG; GmbHG (zu bestätigen)", "pflicht": g.get("rechtsform") != "keine"},
		{"id": "finanzamt", "text": "Abmeldung beim Finanzamt (Schlusserklärungen)", "quelle": "Fachkonzept 2.7", "pflicht": g.get("rechtsform") != "keine"},
		{"id": "ebutilities", "text": "Deregistrierung als Marktpartner auf ebUtilities", "quelle": "Fachkonzept 2.7", "pflicht": g.get("modell") in ("eeg", "beg", "gea")},
		{"id": "organisator", "text": "Vollmacht des Organisators widerrufen bzw. beenden", "quelle": "ElWG § 68 Abs. 2", "pflicht": bool(_get(g, "dienstleistung", "aktiv"))},
		{"id": "aufbewahrung", "text": "Bücher und Belege 7 Jahre aufbewahren (Export)", "quelle": "BAO § 132", "pflicht": True},
	]
	out = []
	for p in liste:
		st = stand.get(p["id"]) or {}
		out.append({**p, "erledigt": p.get("auto") is True or bool(st.get("erledigt")), "am": st.get("am") or "", "notiz": st.get("notiz") or ""})
	offen = [p for p in out if p["pflicht"] and not p["erledigt"]]
	return {"punkte": out, "offen": len(offen), "abschliessbar": not offen}


# ================================================================ Statuten (statuten.js)


def _ganz_zahl(v, mn, mx, std):
	n = _js_number(v) if v is not None else float("nan")
	return int(n) if not _nan(n) and math.isfinite(n) and float(n).is_integer() and mn <= n <= mx else std


def _stxt(v, mx=300):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"\s+", " ", _js_str(v)).strip()[:mx]


def statuten_eingaben(d=None):
	d = d or {}
	ga = d.get("geschaeftsanteilEur")
	if ga is None or ga == "":
		ga_s = ""
	else:
		n = _js_number(ga)
		ga_s = _js_str(_ganz_zahl(_js_round(n) if not _nan(n) else n, 1, 100000, 100))
	og = d.get("onlineGv")
	return {
		"taetigkeitsgebiet": _stxt(d.get("taetigkeitsgebiet"), 300),
		"zweckZusatz": _stxt(d.get("zweckZusatz"), 600),
		"kuendigungsfristWochen": _js_str(_ganz_zahl(d.get("kuendigungsfristWochen"), 1, 26, 6)),
		"funktionsperiodeJahre": _js_str(_ganz_zahl(d.get("funktionsperiodeJahre"), 1, 5, 3)),
		"einladungsfristTage": _js_str(_ganz_zahl(d.get("einladungsfristTage"), 7, 60, 14)),
		"gvTurnusJahre": _ganz_zahl(d.get("gvTurnusJahre"), 1, 5, 1),
		"onlineGv": True if "onlineGv" not in d or og is None else (og is True or og == "ja" or og == "true"),
		"tarifeDurch": "gv" if d.get("tarifeDurch") == "gv" else "vorstand",
		"vermoegensempfaenger": _stxt(d.get("vermoegensempfaenger"), 300) or "eine gemeinnützige Organisation oder Gebietskörperschaft, die gleiche oder ähnliche Zwecke verfolgt",
		"geschaeftsanteilEur": ga_s,
		"kuendigungsfristMonate": _js_str(_ganz_zahl(d.get("kuendigungsfristMonate"), 1, 24, 6)),
		"revisionsverband": _stxt(d.get("revisionsverband"), 160),
		"aufsichtsrat": d.get("aufsichtsrat") is True or d.get("aufsichtsrat") == "ja",
	}


def statuten_pruefen(g=None, e=None, dok=None):
	g, e = g or {}, e or {}
	b = []

	def f(stufe, text, quelle):
		b.append({"stufe": stufe, "text": text, "quelle": quelle})

	if not (M.EG_MODELLE.get(g.get("modell")) or {}).get("rechtsperson"):
		f("fehler", "Für dieses Modell sind keine Statuten nötig (keine eigene Rechtsperson, z. B. GEA oder P2P – dort genügen Verträge).", "ElWG § 68")
	if g.get("rechtsform") not in ("verein", "egen"):
		f("warn", "Für GmbH bzw. OG/KG ist ein Gesellschaftsvertrag (bei der GmbH als Notariatsakt) nötig – der Generator erzeugt Vereinsstatuten und Genossenschaftssatzungen.", "GmbHG § 4 (zu bestätigen)")
	if not _stxt(g.get("name")):
		f("fehler", "Der Name der Gemeinschaft fehlt.", "VerG § 3 Abs. 2 Z 1")
	if not _stxt(g.get("sitzOrt") or _get(g, "sitzAdresse", "ort")):
		f("fehler", "Der Sitz (Gemeinde) fehlt.", "VerG § 3 Abs. 2 Z 2")
	if not e.get("taetigkeitsgebiet"):
		f("fehler", "Bitte den Tätigkeitsbereich beschreiben (z. B. „das Gebiet der Gemeinde … im Bereich der Trafostation …“).", "VerG § 3 Abs. 2 Z 1–3")
	if g.get("modell") == "eeg":
		f("info", "EEG: Zweck „Hauptzweck nicht finanzieller Gewinn“, offener und freiwilliger Mitgliederkreis ohne Großunternehmen sind enthalten.", "EAG § 79 Abs. 2; ElWG § 66")
	if g.get("modell") == "beg":
		f("info", "BEG: Kontrollklausel (natürliche Personen, Gebietskörperschaften, kleine Unternehmen halten die satzungsändernde Mehrheit) ist enthalten.", "ElWG § 67 Abs. 3")
	kw = _zahl_oder_0(e.get("kuendigungsfristWochen"))
	if kw < 3 or kw > 7:
		f("warn", f"Austrittsfrist {_js_str(e.get('kuendigungsfristWochen'))} Wochen – üblich sind laut Koordinationsstelle 3–7 Wochen. Zu lange Fristen erschweren den freiwilligen Austritt.", "Fachkonzept 2.4")
	gt = _zahl_oder_0(e.get("gvTurnusJahre"))
	if gt > 5:
		f("fehler", "Die Mitgliederversammlung ist mindestens alle fünf Jahre einzuberufen.", "VerG § 5 Abs. 2")
	if gt > 1:
		f("info", "Eine jährliche Mitgliederversammlung ist für Energiegemeinschaften üblich (Rechnungsabschluss, Tarife, Entlastung).", "Fachkonzept 2.5")
	if _zahl_oder_0(e.get("einladungsfristTage")) < 14:
		f("warn", "Eine Einladungsfrist unter 14 Tagen ist kurz; virtuelle Teilnahme und Anträge brauchen Vorlauf.", "Musterstatuten (zu bestätigen)")
	if e.get("onlineGv"):
		f("info", "Virtuelle bzw. hybride Mitgliederversammlung und Umlaufbeschlüsse sind vorgesehen – das VerG regelt dies nicht ausdrücklich, daher in den Statuten verankert.", "VerG 2002 (zu bestätigen)")
	if g.get("rechtsform") == "egen":
		if not e.get("geschaeftsanteilEur"):
			f("fehler", "Bitte die Höhe des Geschäftsanteils angeben.", "GenG")
		if not e.get("revisionsverband"):
			f("fehler", "Bitte den Revisionsverband angeben – Genossenschaften müssen einem Revisionsverband angehören.", "GenRevG 1997")
	if dok and g.get("rechtsform") == "verein":
		titel = [re.sub(r"^§ \d+ ", "", _js_str(a.get("titel")), flags=re.ASCII) for a in dok.get("abschnitte") or []]
		for p in VERG_PFLICHTINHALTE:
			if p["abschnitt"] not in titel:
				f("fehler", f"Pflichtinhalt fehlt: {p['text']}.", "VerG § 3 Abs. 2")
		if dok.get("fehlend"):
			f("warn", f"Noch offene Angaben im Entwurf: {', '.join(dok['fehlend'])}.", "Statuten-Generator")
	f("info", "Muster zur Prüfung: vor der Errichtungsanzeige bzw. Firmenbuchanmeldung von einer befugten Stelle prüfen lassen.", "Fachkonzept 9, Punkt 8")
	return {"ok": not any(x["stufe"] == "fehler" for x in b), "befunde": b}


# ================================================================ Vorlagen und Dokumente (vertraege.js)

_PLATZ = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def _leer(v):
	return v is None or v == ""


def _text_wert(v):
	if v is True:
		return "ja"
	if v is False:
		return "nein"
	if isinstance(v, (int, float)):
		if float(v).is_integer():
			return str(int(v))
		return repr(float(v)).replace(".", ",", 1)
	return _js_str(v)


def ist_wahr(v):
	if v is True:
		return True
	if v is False or _leer(v):
		return False
	if isinstance(v, (int, float)):
		return v != 0
	return _js_str(v) not in ("nein", "false", "0")


def bedingung_erfuellt(wenn, daten=None):
	daten = daten or {}
	if not wenn:
		return True
	for roh in _js_str(wenn).split("&"):
		t = roh.strip()
		if not t:
			continue
		if "!=" in t:
			k, v = t.split("!=", 1)
			w = "" if _leer(daten.get(k.strip())) else _text_wert(daten.get(k.strip()))
			if w in v.split(","):
				return False
		elif "=" in t:
			k, v = t.split("=", 1)
			w = "" if _leer(daten.get(k.strip())) else _text_wert(daten.get(k.strip()))
			if w not in v.split(","):
				return False
		elif t.startswith("!"):
			if ist_wahr(daten.get(t[1:].strip())):
				return False
		elif not ist_wahr(daten.get(t)):
			return False
	return True


def platzhalter_ersetzen(text, daten=None, fehlend=None):
	daten = daten or {}
	fehlend = fehlend if fehlend is not None else []

	def ers(m):
		k = m.group(1)
		if _leer(daten.get(k)):
			if k not in fehlend:
				fehlend.append(k)
			return LUECKE
		return _text_wert(daten.get(k))

	return _PLATZ.sub(ers, _js_str(text))


def vorlage_passt(v, daten=None):
	daten = daten or {}
	if not v:
		return False
	if v.get("modelle") and daten.get("modell") and daten["modell"] not in v["modelle"]:
		return False
	if v.get("rechtsformen") and daten.get("rechtsform") and daten["rechtsform"] not in v["rechtsformen"]:
		return False
	return bedingung_erfuellt(v.get("wenn"), daten)


def kanonisch(dok):
	teile = [dok["titel"], dok["untertitel"]]
	for a in dok["abschnitte"]:
		teile.append(a["titel"])
		teile.extend(a["absaetze"])
	teile.extend(dok["unterschriften"])
	return "\n".join(teile)


def vorlage_rendern(vorlage, daten=None):
	daten = daten or {}
	if not vorlage:
		raise ValueError("Unbekannte Vorlage.")
	fehlend = []
	nr = vorlage.get("nummerierung") or "keine"
	abschnitte = []
	i = 0
	for a in vorlage.get("abschnitte") or []:
		if not bedingung_erfuellt(a.get("wenn"), daten):
			continue
		absaetze = []
		roh = [x for x in (a.get("absaetze") or []) if isinstance(x, str) or bedingung_erfuellt(x.get("wenn"), daten)]
		text_anzahl = len([x for x in roh if isinstance(x, str) or "text" in x])
		j = 0
		for x in roh:
			if isinstance(x, str) or "text" in x:
				j += 1
				t = platzhalter_ersetzen(x if isinstance(x, str) else x["text"], daten, fehlend)
				absaetze.append(f"({j}) {t}" if nr == "paragraph" and not a.get("ohneNummer") and text_anzahl > 1 else t)
			elif isinstance(x.get("liste"), list):
				for p in x["liste"]:
					if not isinstance(p, str) and not bedingung_erfuellt(p.get("wenn"), daten):
						continue
					absaetze.append("– " + platzhalter_ersetzen(p if isinstance(p, str) else p["text"], daten, fehlend))
		titel = platzhalter_ersetzen(a.get("titel") or "", daten, fehlend)
		if not a.get("ohneNummer") and titel:
			i += 1
			if nr == "paragraph":
				titel = f"§ {i} {titel}"
			elif nr == "abschnitt":
				titel = f"{i}. {titel}"
		abschnitte.append({"titel": titel, "absaetze": absaetze})
	titel = platzhalter_ersetzen(vorlage.get("titel") or "", daten, fehlend)
	untertitel = platzhalter_ersetzen(vorlage.get("untertitel") or "", daten, fehlend)
	unterschriften = [platzhalter_ersetzen(u, daten, fehlend) for u in vorlage.get("unterschriften") or []]
	pflicht = [f["id"] for f in vorlage.get("felder") or [] if f.get("pflicht")]
	dok = {
		"id": vorlage.get("id"), "titel": titel, "untertitel": untertitel, "kennzeichnung": MUSTER_HINWEIS, "quelle": vorlage.get("quelle") or "", "stand": vorlage.get("stand") or VORLAGEN_STAND,
		"abschnitte": abschnitte, "unterschriften": unterschriften, "fehlend": fehlend, "pflichtFehlend": [k for k in pflicht if _leer(daten.get(k))],
	}
	dok["text"] = kanonisch(dok)
	return dok


def datum_de(iso):
	return ".".join(reversed(_js_str(iso)[:10].split("-"))) if iso else ""


def zahl_de(x, stellen=2):
	n = _js_number(x)
	if _nan(n) or not math.isfinite(n):
		return ""
	f = 10 ** stellen
	r = _js_round(n * f + (1e-9 if n >= 0 else -1e-9)) / f
	g, _, kk = f"{abs(r):.{stellen}f}".partition(".")
	tausend = re.sub(r"\B(?=(\d{3})+(?!\d))", ".", g)
	return f"{'-' if r < 0 else ''}{tausend}{(',' + kk) if stellen else ''}"


def eur_de(x):
	return "" if _leer(x) or not math.isfinite(_js_number(x)) or _js_number(x) != _js_number(x) else f"{zahl_de(x, 2)} €"


def ct_de(x):
	if _leer(x):
		return ""
	n = _js_number(x)
	if _nan(n) or not math.isfinite(n):
		return ""
	g, _, k = zahl_de(x, 4).partition(",")
	while len(k) > 2 and k.endswith("0"):
		k = k[:-1]
	return f"{g},{k} ct/kWh"


_RECHTSGRUNDLAGE = {"eeg": "§ 66 ElWG in Verbindung mit § 79 EAG", "beg": "§ 67 ElWG", "gea": "§§ 68 und 70 Abs. 6 Z 1 ElWG", "p2p": "§ 68 Abs. 1 ElWG", "eigenversorgung": "§ 65 Abs. 2 ElWG"}
_MITGLIEDERKREIS = {
	"eeg": "natürliche Personen, Gemeinden, lokale Behörden und sonstige juristische Personen des öffentlichen Rechts sowie kleine und mittlere Unternehmen; bei Privatunternehmen darf die Teilnahme nicht deren gewerbliche oder berufliche Haupttätigkeit sein. Großunternehmen (ElWG § 6 Abs. 1 Z 61) können nicht Mitglied werden",
	"beg": "natürliche und juristische Personen sowie Gebietskörperschaften; Großunternehmen nur mit Erzeugungsanlagen bis 6 MW je Zählpunkt",
	"gea": "Netzbenutzer, deren Verbrauchsanlagen über dieselbe Hauptleitung wie die gemeinschaftliche Erzeugungsanlage versorgt werden",
	"p2p": "aktive Kunden als Vertragspartner",
	"eigenversorgung": "der aktive Kunde selbst an einem anderen Standort",
}
_RHYTHMUS = {"monat": "monatlich", "quartal": "vierteljährlich", "jahr": "jährlich"}
_GV_TURNUS = {1: "jährlich", 2: "alle zwei Jahre", 3: "alle drei Jahre", 4: "alle vier Jahre", 5: "mindestens alle fünf Jahre"}


def dokument_daten(k=None):
	k = k or {}
	g = k.get("gemeinschaft") or {}
	netzbetreiber = k.get("netzbetreiber") or []
	tarif = k.get("tarif")
	mitglied = k.get("mitglied")
	zaehlpunkt = k.get("zaehlpunkt")
	anlage = k.get("anlage")
	auftrag = k.get("auftrag")
	organe = k.get("organe") or []
	eingaben = k.get("eingaben") or {}
	heute = k.get("heute") or ""
	au = auftrag or {}
	modell = g.get("modell") or eingaben.get("modell") or au.get("modell") or ""
	nb = [x for x in netzbetreiber if x.get("id") in (g.get("netzbetreiber") or []) or x.get("id") == au.get("netzbetreiberId")]
	zl = _zahl_oder_0(g.get("zonelevel") or eingaben.get("zonelevel") or au.get("zonelevel"))
	zld = M.ZONELEVEL.get(_js_str(zl)) if zl else None
	lk = eingaben.get("erzeugungsleistungKw")
	if lk is None:
		lk = _get(g, "kennzahlen", "erzeugungsleistungKw")
	if lk is None:
		lk = au.get("erzeugungKwp")
	leistung = _zahl_oder_0(lk)
	person = (mitglied or {}).get("person") or {}

	def organ_name(f):
		return ", ".join(n for n in ((o.get("personName") or o.get("name")) for o in organe if o.get("funktion") == f and o.get("status") != "beendet") if n)

	sa = g.get("sitzAdresse") or {}
	if modell == "eeg":
		ref = f" ({g.get('nahebereichRef')})" if g.get("nahebereichRef") else ""
		nahe = f"im {(zld or {}).get('label') or 'Nahebereich'}{ref} laut Auskunft des Netzbetreibers"
	elif modell == "beg":
		nahe = f"im Netzgebiet von {' bzw. '.join(x.get('name') for x in nb) or LUECKE}"
	else:
		nahe = (zld or {}).get("label") or ""
	ortteil = " ".join(x for x in (sa.get("plz"), sa.get("ort")) if x)
	pteil = " ".join(x for x in (person.get("plz"), person.get("ort")) if x)
	ang = au.get("angebot") or None
	d = {
		"heute": datum_de(heute), "ort": sa.get("ort") or au.get("ort") or "",
		"name": g.get("name") or au.get("arbeitsname") or "", "kurzname": g.get("kurzname") or "",
		"modell": modell, "modellLabel": (M.EG_MODELLE.get(modell) or {}).get("label") or "", "modellKurz": (M.EG_MODELLE.get(modell) or {}).get("kurz") or "",
		"rechtsform": g.get("rechtsform") or au.get("rechtsform") or "", "rechtsgrundlage": _RECHTSGRUNDLAGE.get(modell) or "",
		"zonelevel": zl or "", "nahebereichLabel": (zld or {}).get("label") or "", "nahebereichRef": g.get("nahebereichRef") or "",
		"nahebereichText": nahe,
		"mitgliederkreisText": _MITGLIEDERKREIS.get(modell) or "",
		"sitzOrt": sa.get("ort") or au.get("ort") or "", "sitzAdresse": ", ".join(x for x in (sa.get("strasse"), ortteil) if x),
		"email": g.get("email") or "", "zvrZahl": g.get("zvrZahl") or "", "firmenbuchnummer": g.get("firmenbuchnummer") or "", "uid": g.get("uid") or "",
		"marktpartnerId": g.get("marktpartnerId") or "", "gemeinschaftsId": g.get("gemeinschaftsId") or "", "verteilmodell": g.get("verteilmodell") or "dynamisch",
		"netzbetreiberName": ", ".join(x.get("name") for x in nb), "netzbetreiberEmail": ", ".join(x.get("kontaktEmail") for x in nb if x.get("kontaktEmail")),
		"obmann": organ_name("obmann"), "kassier": organ_name("kassier"), "schriftfuehrer": organ_name("schriftfuehrer"), "rechnungspruefer": organ_name("rechnungspruefer"),
		"organisator": bool(_get(g, "dienstleistung", "aktiv")) or au.get("paket") in ("komplett", "wechsel"), "organisatorName": OEKOINVEST["name"], "organisatorAnschrift": OEKOINVEST["anschrift"], "organisatorFirmenbuch": OEKOINVEST["firmenbuch"],
		"erzeugungsleistungKw": zahl_de(leistung, 1) if leistung else "", "lieferantenpflicht": leistung > M.LIEFERANTENPFLICHT_KW["allgemein"] or eingaben.get("lieferantenpflicht") is True,
		"abrechnungsrhythmus": _RHYTHMUS.get(g.get("abrechnungsrhythmus")) or "monatlich",
		"bezugspreisCt": ct_de(tarif.get("bezugspreisCt")) if tarif else "", "einspeisepreisCt": ct_de(tarif.get("einspeisepreisCt")) if tarif else "", "tarifAb": datum_de(tarif.get("gueltigAb")) if tarif else "",
		"mitgliedsbeitrag": f"{eur_de(tarif.get('mitgliedsbeitragJahr'))} pro Jahr" if tarif and _zahl_oder_0(tarif.get("mitgliedsbeitragJahr")) else "", "beitrittsgebuehr": eur_de(tarif.get("einmalgebuehrBeitritt")) if tarif and _zahl_oder_0(tarif.get("einmalgebuehrBeitritt")) else "",
		"mitgliedName": person.get("firma") or " ".join(x for x in (person.get("vorname"), person.get("nachname")) if x), "mitgliedAnschrift": ", ".join(x for x in (person.get("strasse"), pteil) if x),
		"mitgliedsnummer": _js_str((mitglied or {}).get("mitgliedsnummer")) if (mitglied or {}).get("mitgliedsnummer") else "", "mitgliedEmail": person.get("email") or "",
		"zaehlpunkt": (zaehlpunkt or {}).get("zaehlpunktnummer") or "", "teilnahmefaktor": _js_str(eingaben.get("teilnahmefaktor")) if eingaben.get("teilnahmefaktor") else "100",
		"anlageBezeichnung": (anlage or {}).get("bezeichnung") or "", "anlageKwp": zahl_de(anlage.get("kwp") if anlage.get("kwp") is not None else anlage.get("engpassleistungKw"), 1) if anlage else "", "nutzungsmodell": (anlage or {}).get("nutzungsmodell") or "ueberschuss",
		"paket": au.get("paket") or "", "paketLabel": au.get("paketLabel") or "", "auftraggeberName": _get(au, "auftraggeber", "name") or "", "auftraggeberAnschrift": _get(au, "auftraggeber", "anschrift") or "",
		"angebotNetto": eur_de(ang.get("betragNetto")) if ang else "", "angebotUst": eur_de(ang.get("ustEur")) if ang else "", "angebotBrutto": eur_de(ang.get("betragBrutto")) if ang else "",
		"angebotGueltigBis": datum_de(ang.get("gueltigBis")) if ang else "", "angebotNummer": (ang or {}).get("nummer") or "", "auftragId": au.get("id") or "",
		"leistungenText": "; ".join((ang or {}).get("leistungen") or []),
		"funktionsperiodeJahre": "3", "einladungsfristTage": "14", "kuendigungsfristWochen": "6", "gvTurnusText": _GV_TURNUS[1], "onlineGv": True, "tarifeDurch": "vorstand",
		"leitungText": "der Obfrau bzw. dem Obmann, deren bzw. dessen Stellvertretung, der Kassierin bzw. dem Kassier und der Schriftführerin bzw. dem Schriftführer (mindestens zwei Personen)",
		"vermoegensempfaenger": "eine gemeinnützige Organisation oder Gebietskörperschaft, die gleiche oder ähnliche Zwecke verfolgt",
		"geschaeftsanteilEur": "", "kuendigungsfristMonate": "6", "revisionsverband": "", "aufsichtsrat": False,
		"datenschutzKontakt": g.get("email") or "",
	}
	for kk, v in eingaben.items():
		if v is None:
			continue
		if kk == "gvTurnusJahre":
			n = _zahl_oder_0(v)
			d["gvTurnusText"] = _GV_TURNUS.get(n) or d["gvTurnusText"]
		else:
			d[kk] = _js_str(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else v
	for kk in ("stichtag", "letzteAltabrechnung", "frist", "versammlungAm", "ab"):
		if eingaben.get(kk):
			d[f"{kk}De"] = datum_de(eingaben[kk])
	return d


def vorlagen_fuer(daten=None):
	daten = daten or {}
	out = []
	for v in VORLAGEN.values():
		if not vorlage_passt(v, daten):
			continue
		titel = v.get("kurz") or re.sub(r"\s+", " ", re.sub(r"„\{\{.*?\}\}“|\{\{.*?\}\}", "", v["titel"])).strip()
		out.append({"id": v["id"], "titel": titel, "art": v.get("art"), "quelle": v.get("quelle"), "gruppe": v.get("gruppe") or "vertrag"})
	return out


# ================================================================ Förder-Check (foerder.js)


def _kategorie_pv(kwp):
	return next((k for k in EAG_PV_KATEGORIEN if kwp <= k["bisKwp"]), None)


def foerder_check(d=None):
	d = d or {}
	anlagen = []
	for a in (d.get("anlagen") if isinstance(d.get("anlagen"), list) else [])[:50]:
		anlagen.append({"art": _js_str(a.get("art") or "pv"), "kwp": max(0, _zahl_oder_0(a.get("kwp"))), "speicherKwh": max(0, _zahl_oder_0(a.get("speicherKwh"))), "status": a.get("status") if a.get("status") in ("geplant", "in_bau", "in_betrieb") else "geplant", "bezeichnung": _js_str(a.get("bezeichnung") or "")[:80]})
	modell = d.get("modell") or "eeg"
	neu_pv = [a for a in anlagen if a["art"] == "pv" and a["status"] != "in_betrieb"]
	alt_pv = [a for a in anlagen if a["art"] == "pv" and a["status"] == "in_betrieb"]
	speicher = [a for a in anlagen if (a["art"] == "speicher" or a["speicherKwh"] > 0) and a["status"] != "in_betrieb"]
	erzeugend = [a for a in anlagen if a["art"] in ("pv", "wind", "wasser", "biomasse")]
	T = []

	def P(pid, ergebnis, gruende, bedingungen=None, naechster=""):
		T.append({"id": pid, **FOERDER_PROGRAMME[pid], "ergebnis": ergebnis, "ergebnisLabel": FOERDER_ERGEBNIS[ergebnis]["label"], "ton": FOERDER_ERGEBNIS[ergebnis]["ton"], "gruende": gruende, "bedingungen": bedingungen or [], "naechsterSchritt": naechster})

	r1 = _r10
	if neu_pv:
		passend = [a for a in neu_pv if 0 < a["kwp"] <= 1000]
		gross = [a for a in neu_pv if a["kwp"] > 1000]
		gruende = [f"{a['bezeichnung'] or 'PV-Anlage'} {_js_str(r1(a['kwp']))} kWp → {_kategorie_pv(a['kwp'])['label']}" for a in passend]
		if gross:
			gruende.append(f"{len(gross)} Anlage(n) über 1.000 kWp – Investitionszuschuss nicht vorgesehen, Marktprämie prüfen (zu bestätigen).")
		P("eag_invest_pv", "pruefen" if passend else "nicht_geeignet", gruende, ["Antrag im Fördercall vor der Bestellung bzw. vor Baubeginn (zu bestätigen)", "Investitionszuschuss und Marktprämie für dieselbe Anlage nicht kombinierbar (zu bestätigen)", "Fördersatz je kWp und Calltermine laut Abwicklungsstelle"], "Calltermine 2026 bei der EAG-Abwicklungsstelle prüfen und Antrag vorbereiten.")
	elif alt_pv:
		P("eag_invest_pv", "nicht_geeignet", ["Alle PV-Anlagen sind bereits in Betrieb – ein Investitionszuschuss ist nur für neue Anlagen möglich (zu bestätigen)."])
	else:
		P("eag_invest_pv", "nicht_geeignet", ["Keine geplante PV-Anlage angegeben."])
	if speicher:
		P("eag_invest_speicher", "pruefen" if (neu_pv or any(a["art"] == "pv" for a in anlagen)) else "nicht_geeignet", [f"{a['bezeichnung'] or 'Speicher'} {_js_str(r1(a['speicherKwh'] or a['kwp']))} kWh" for a in speicher], ["nur in Verbindung mit einer PV-Anlage (zu bestätigen)", "Mindestverhältnis kWh je kWp laut Call (zu bestätigen)"], "Speichergröße mit der Simulation (WP3) abstimmen.")
	if erzeugend:
		g = []
		if modell in ("eeg", "beg"):
			g.append("In der Gemeinschaft verbrauchte Mengen erhalten keine Marktprämie – nur der Restüberschuss; laut Fachkonzept höchstens 50 % der Erzeugung.")
		if any(a["art"] != "pv" for a in erzeugend):
			g.append("Wind, Wasser und Biomasse: Marktprämie je Technologie (Ausschreibung bzw. Antrag).")
		if any(a["kwp"] > 1000 for a in neu_pv):
			g.append("Große PV-Anlagen: Marktprämie über Ausschreibung.")
		P("eag_marktpraemie", "pruefen" if g else "nicht_geeignet", g or ["Für kleine PV-Anlagen ist der Investitionszuschuss der übliche Weg."], ["nicht mit dem Investitionszuschuss derselben Anlage kombinierbar (zu bestätigen)"])
	gemeinde = d.get("gemeindeBeteiligt") or d.get("antragsteller") == "gemeinde"
	P("klimafonds", "pruefen", ["Gemeinde beteiligt – Programme für Regionen und Gemeinden (z. B. KEM) prüfen." if gemeinde else "Programme richten sich häufig an Regionen, Gemeinden und Pilotprojekte."], ["Ausschreibungen sind befristet"])
	if (d.get("antragsteller") or "eg") in ("unternehmen", "landwirt", "gemeinde", "eg"):
		P("umweltfoerderung", "pruefen", ["Antragsteller ist Betrieb, Gemeinde bzw. juristische Person – Förderaktionen der Umweltförderung im Inland prüfen."], ["Antrag in der Regel vor Umsetzung (zu bestätigen)"])
	if gemeinde:
		P("kommunal", "pruefen", ["Gemeinde investiert selbst (z. B. PV auf Gemeindegebäuden für die Gemeinschaft)."], ["Gemeinderatsbeschluss", "fremdübliche Preise in der Gemeinschaft (Beihilferecht, Fachkonzept 2.5)"])
	P("koordinationsstelle", "geeignet", ["Kostenlose Muster und Beratung für jede Gemeinschaft."])
	land_id = f"land_{_js_str(d.get('bundesland')) if d.get('bundesland') is not None else 'undefined'}"
	P(land_id if land_id in FOERDER_PROGRAMME else "land_sonst", "geeignet", [f"Landes-Energieberatung{'' if d.get('bundesland') else ' (Bundesland angeben)'} – aktuelle Landesförderungen erfragen."])
	hinweise = ["Förderzusagen gibt nur die Förderstelle. Alle Angaben ohne Gewähr; Fördersätze und Fristen (zu bestätigen).", "Bei Investitionen der Gemeinschaft: Finanzierung über Mitgliedsbeiträge, Geschäftsanteile (eGen) oder Bürgerbeteiligung prüfen – ÖkoInvest unterstützt Projektierung und Bau über die ÖKOVOLT-Gruppe."]
	if modell == "beg":
		hinweise.append("BEG: keine Netzentgelt-Reduktion bis 31.12.2026 – die Wirtschaftlichkeit hängt stärker an Förderung und Preisen.")
	fristen = []
	if neu_pv:
		fristen.append({"text": "EAG-Fördercall PV: Termine laut Abwicklungsstelle (zu bestätigen) – Antrag vor Bestellung", "quelleUrl": FOERDER_PROGRAMME["eag_invest_pv"]["quelleUrl"]})
	fristen.append({"text": "Klima- und Energiefonds: laufende Ausschreibungen prüfen", "quelleUrl": FOERDER_PROGRAMME["klimafonds"]["quelleUrl"]})
	return {
		"stand": FOERDER_STAND, "treffer": T, "hinweise": hinweise, "fristen": fristen,
		"kennzahlen": {"anlagen": len(anlagen), "pvNeuKwp": r1(sum(a["kwp"] for a in neu_pv)), "speicherKwh": r1(sum(a["speicherKwh"] or a["kwp"] for a in speicher)), "geeignet": len([x for x in T if x["ergebnis"] == "geeignet"]), "pruefen": len([x for x in T if x["ergebnis"] == "pruefen"])},
	}


# ================================================================ Lieferantenpflichten (lieferantenpflichten.js)


def lieferantenpflichten(k=None):
	k = k or {}
	anlagen = k.get("anlagen") or []
	heute = k.get("heute") or ""
	ist = ST.erzeugungsleistung(anlagen)
	prognose = ST.erzeugungsleistung([{**a, "status": "aktiv"} if a.get("status") == "geplant" else a for a in anlagen])
	pflicht = ist["lieferantenpflichten"]
	bald = not pflicht and prognose["lieferantenpflichten"]
	dok = k.get("dokumente") or []

	def hat(v):
		return next((x for x in dok if x.get("vorlage") == v and _js_str(x.get("stand") or "") >= "2026-10-01"), None)

	aktiv = [m for m in (k.get("mitglieder") or []) if m.get("status") in ("aufgenommen", "aktiv")]
	ohne_rh = len([m for m in aktiv if not m.get("abrechnungsrhythmus")])
	knapp = [t for t in (k.get("tarife") or []) if t.get("status") in ("entwurf", "beschlossen") and t.get("gueltigAb") and heute and 0 <= tage_bis(heute, t["gueltigAb"]) < AENDERUNG_VORLAUF_TAGE]

	def pfl(pid, titel, quelle, erfuellt, hinweis, vorlage=""):
		return {"id": pid, "titel": titel, "quelle": quelle, "erfuellt": bool(erfuellt), "hinweis": hinweis, "vorlage": vorlage, "status": "nicht_noetig" if (not pflicht and not bald) else ("erfuellt" if erfuellt else "offen")}

	org = bool(k.get("organisator"))
	angez = k.get("organisatorAngezeigtAm") or ""
	agb = hat("agb")
	liste = [
		pfl("agb", "Allgemeine Lieferbedingungen (AGB)", "ElWG § 69 Abs. 1 Z 1 mit § 20", agb, f"Stand {datum_de(agb['stand'])}" if agb else "Vorlage „Allgemeine Lieferbedingungen“ erzeugen und beschließen.", "agb"),
		pfl("informationsblatt", "Informationsblatt vor Vertragsabschluss", "ElWG § 69 Abs. 1 Z 2", hat("informationsblatt"), "Im Beitrittsprozess (WP6) vor der Unterschrift anzeigen.", "informationsblatt"),
		pfl("rechnung", "Rechnung nach § 42 mit Pflichtinhalten (Betrag, Fälligkeit, Energiewerte, Vertragspartner, Zählpunktbezeichnung)", "ElWG § 69 Abs. 1 Z 4, § 42", True, "Belege der Abrechnung (WP4) enthalten die Pflichtinhalte."),
		pfl("rhythmus", "Wahl zwischen Monats- und Jahresrechnung", "ElWG § 69 Abs. 3", ohne_rh == 0, f"{ohne_rh} aktive Mitglied(er) ohne gewählten Rhythmus – Massenaktion „Abrechnungsrhythmus“ (WP1)." if ohne_rh else "Für alle aktiven Mitglieder erfasst."),
		pfl("kostenlos", "Rechnung mindestens jährlich kostenlos, Erläuterung auf Verlangen", "ElWG § 69 Abs. 1 Z 5–6", True, "Erläuterungsseite je Beleg (WP4/WP6)."),
		pfl("aenderung", "Änderungsinformation mindestens einen Monat vor Wirksamkeit", "ElWG § 21 (laut Fachkonzept 6.1)", not knapp, f"Tarif ab {datum_de(knapp[0]['gueltigAb'])} – Vorlauf unter einem Monat." if knapp else "Keine Tarifänderung mit zu kurzem Vorlauf."),
		pfl("organisator", "Übernahme der Pflichten durch den Organisator", "ElWG § 68 Abs. 2, § 69 Abs. 4", org and bool(angez), ("ÖkoInvest ist Organisator und angezeigt." if angez else "Organisator bestellt – Anzeige an den Netzbetreiber fehlt.") if org else "Optional: ÖkoInvest übernimmt die Pflichten als Organisator.", "vollmacht_organisator"),
	]
	liste[6]["pflichtpunkt"] = False
	kw = M.LIEFERANTENPFLICHT_KW
	if pflicht:
		grund = f"Erzeugungsleistung {_js_str(ist['gesamtKw'])} kW (Haushalte {_js_str(ist['haushaltKw'])} kW) – Schwelle über {kw['allgemein']} kW bzw. {kw['haushalt']} kW überschritten."
	elif bald:
		grund = f"Mit den geplanten Anlagen {_js_str(prognose['gesamtKw'])} kW – die Schwelle wird voraussichtlich überschritten. Pflichten vorbereiten."
	else:
		grund = f"Erzeugungsleistung {_js_str(ist['gesamtKw'])} kW – unter der Schwelle."
	return {
		"pflicht": pflicht, "bald": bald, "gesamtKw": ist["gesamtKw"], "haushaltKw": ist["haushaltKw"], "prognoseKw": prognose["gesamtKw"], "schwelle": kw,
		"grund": grund, "pflichten": liste, "offen": len([x for x in liste if x["status"] == "offen" and x.get("pflichtpunkt") is not False]),
		"quelle": "ElWG §§ 68–69; Fachkonzept 1.2, 6.1 Punkt 8",
	}
