# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fachprüfung Flächen & Kommunen – Port von src/lib/plattform/flaecheFach.js und src/lib/plattform/kommune.js:
#  - Flurstücke je Land (DE Gemarkung/Flur/Zähler-Nenner/Grundbuch, AT KG-Nr./Grundstücksnummer/EZ,
#    CH Gemeinde/Parzelle/E-GRID) mit Formatprüfung und Summenflächen-Plausibilisierung
#  - Fachangaben `fach` (Positivliste), Pflichtangaben beim Einreichen je Nutzung (Teil von flaecheVollstaendig)
#  - erweitertes Pachtangebot (Modell, Indexierung, Reservierung, Rückbau, Dienstbarkeit, Nebenflächen …)
#  - Kommune: strukturierte Anfrage, Zuordnung von Flächen zum Gemeindegebiet, § 6 EEG-Schätzung
# Reine Funktionen ohne Frappe-Abhängigkeit (Fehler über `Fehler` bzw. validierung.pflicht → ValidationError),
# damit die Logik mit `python -m unittest` testbar bleibt.

import re
from datetime import datetime, timezone

from oekoinvest_app.plattform import validierung as v

# ------------------------------------------------------------------ Kennzahlen (aus src/lib/invest/markt.js)
FREIFLAECHE_HA_PRO_MWP = 1.1
AGRI_HOCH_HA_PRO_MWP = 1.6
KOMMUNE_BETEILIGUNG_CT = 0.2  # § 6 EEG
REGION_ERTRAG = {"de-nord": 960, "de-ost": 1020, "de-west": 1000, "de-sued": 1100, "at": 1120, "ch": 1050}

JNU = ["ja", "nein", "unbekannt"]
EIGENTUM_FORMEN = ["eigentum", "miteigentum", "erbengemeinschaft", "gesellschaft", "verwaltung"]
VERTRETUNG = ["selbst", "alle", "vollmacht", "gesetzlich", "organ", "verwalter"]
BEWIRTSCHAFTUNG = ["selbst", "verpachtet", "keine"]
BELASTUNGEN = ["leitungsrecht", "wegerecht", "dienstbarkeit", "niessbrauch", "altenteil", "vorkaufsrecht", "vormerkung", "grundschuld", "flurbereinigung"]
WSG = ["nein", "zone3", "zone2", "zone1", "unbekannt"]
EXPOSITION = ["eben", "s", "so", "sw", "o", "w", "no", "nw", "n"]
ZUFAHRT = ["oeffentlich", "privatweg", "keine", "unbekannt"]
AGRI_KATEGORIE = ["1", "2", "offen"]
AGRI_SYSTEM = ["hoch", "vertikal", "nachgefuehrt", "offen"]
AGRI_KULTUREN = ["getreide", "mais", "raps", "hackfruechte", "gemuese", "gruenland", "weide", "obst", "beeren", "wein", "hopfen", "sonstige"]
REFERENZ_EINHEIT = ["dt", "ttm", "eur"]
REFERENZ_QUELLE = ["eigen", "statistik", "gutachten"]
NACHWEIS_66 = ["vorhanden", "geplant", "offen"]
DACHARTEN = ["trapez", "sandwich", "flach_folie", "flach_bitumen", "ziegel", "faserzement", "sonstige"]
STATIK = ["reserve", "nachweis", "unbekannt"]
DACH_NETZ = ["mittelspannung", "niederspannung", "unbekannt"]
DACH_NUTZER = ["eigen", "vermietet", "teilweise"]

PACHT_MODELLE = ["fest", "umsatz", "kombi"]
INDEX_ARTEN = ["keine", "vpi", "fest"]
LAUFZEIT_BEGINN = ["vertrag", "baubeginn", "inbetriebnahme"]
PACHT_OPTIONEN = {
	"rueckbau": ["buergschaft", "konzern", "ruecklage", "keine"],
	"rueckbauAb": ["baubeginn", "spaeter"],
	"kuendigung": ["befristet", "unbefristet", "jederzeit"],
	"nebenflaechen": ["keine", "verguetet", "teilweise", "unentgeltlich"],
	"nichtbau": ["entschaedigung", "rueckgabe", "nichts"],
	"bewirtschaftung": ["mitEntschaedigung", "ohne", "nein"],
	"dienstbarkeit": ["baubeginn", "sofortLoeschung", "sofortOhne"],
	"anwalt": ["voll", "gedeckelt", "keine"],
}

# Flurstücksfelder je Land: (Feld, Muster, Fehlertext, Pflicht). Einheitliche Speicherfelder wie im JS-Vorbild.
FLURSTUECK_FELDER = {
	"DE": {
		"gemarkung": (None, "", False),
		"gemarkungNr": (re.compile(r"^\d{4,6}$"), "Gemarkungsschlüssel: 4–6 Ziffern", False),
		"flur": (re.compile(r"^\d{1,3}$"), "Flur: 1–3 Ziffern (in Bayern leer lassen)", False),
		"nummer": (re.compile(r"^\d{1,5}(/\d{1,4})?$"), "Flurstück: Zähler oder Zähler/Nenner, z. B. 211 oder 211/3", True),
		"grundbuch": (None, "", False),
		"blatt": (re.compile(r"^\d{1,6}[A-Za-z]?$"), "Grundbuchblatt: bis 6 Ziffern", False),
		"m2": (None, "", False),
	},
	"AT": {
		"gemarkung": (None, "", False),
		"gemarkungNr": (re.compile(r"^\d{5}$"), "KG-Nummer: genau 5 Ziffern (siehe Grundbuchsauszug)", True),
		"nummer": (re.compile(r"^\.?\d{1,5}(/\d{1,4})?$"), "Grundstücksnummer: z. B. 1234, 1234/5 oder .12 (Baufläche)", True),
		"blatt": (re.compile(r"^\d{1,5}$"), "Einlagezahl (EZ): bis 5 Ziffern", False),
		"m2": (None, "", False),
	},
	"CH": {
		"gemarkung": (None, "", False),
		"gemarkungNr": (re.compile(r"^\d{1,4}$"), "BFS-Gemeindenummer: 1–4 Ziffern", False),
		"nummer": (re.compile(r"^[0-9A-Za-z]{1,8}([-./][0-9A-Za-z]{1,6})?$"), "Parzellennummer: z. B. 1234 oder 1234-1", True),
		"grundbuch": (None, "", False),
		"egrid": (re.compile(r"^CH[0-9A-Z]{12}$"), "E-GRID: „CH“ und 12 Zeichen, z. B. CH123456789012", False),
		"m2": (None, "", False),
	},
}
FELD_LABEL = {
	"DE": {"gemarkung": "Gemarkung", "gemarkungNr": "Gemarkungsnr.", "flur": "Flur", "nummer": "Flurstück", "grundbuch": "Grundbuch von", "blatt": "Blatt"},
	"AT": {"gemarkung": "Katastralgemeinde", "gemarkungNr": "KG-Nr.", "nummer": "Grundstücksnr.", "blatt": "EZ"},
	"CH": {"gemarkung": "Gemeinde", "gemarkungNr": "BFS-Nr.", "nummer": "Parzelle", "grundbuch": "Grundbuchkreis", "egrid": "E-GRID"},
}
FS_SCHLUESSEL = ["gemarkung", "gemarkungNr", "flur", "nummer", "grundbuch", "blatt", "egrid", "m2"]

GEMEINDE_SCHLUESSEL = {
	"DE": (re.compile(r"^\d{8}$"), "AGS: genau 8 Ziffern, z. B. 09778123"),
	"AT": (re.compile(r"^\d{5}$"), "Gemeindekennziffer: genau 5 Ziffern"),
	"CH": (re.compile(r"^\d{1,4}$"), "BFS-Gemeindenummer: 1–4 Ziffern"),
}

TAUSENDER = re.compile(r"^\d{1,3}(\.\d{3})+(,\d+)?$")


class Fehler(ValueError):
	"""Fachlicher Eingabefehler (→ 422). Die API übersetzt ihn mit `v.pflicht(False, str(e))`."""


def zahl_de(w, **kw):
	"""Zahl mit Tausenderpunkten („2.600“) oder Dezimalkomma („2,8“)."""
	if isinstance(w, str) and TAUSENDER.match(w.strip()):
		w = w.strip().replace(".", "")
	return v.zahl(w, **kw)


def m2_zahl(w):
	if w is None or w == "":
		return None
	s = re.sub(r"\s|m²|m2", "", str(w), flags=re.IGNORECASE)
	if TAUSENDER.match(s):
		s = s.replace(".", "")
	return v.zahl(s, min=1, max=100000000, stellen=0)


def _flurstueck_roh(x, land):
	d = FLURSTUECK_FELDER.get(land) or FLURSTUECK_FELDER["DE"]
	x = x if isinstance(x, dict) else {}
	fs = {}
	for k in FS_SCHLUESSEL:
		if k not in d:
			continue
		if k == "m2":
			fs["m2"] = m2_zahl(x.get("m2"))
			continue
		w = v.text(x.get(k), 80 if k in ("gemarkung", "grundbuch") else 30)
		if k == "egrid":
			w = re.sub(r"\s", "", w).upper()
		if k in ("nummer", "gemarkungNr", "blatt", "flur"):
			w = re.sub(r"\s", "", w)
		fs[k] = w
	return fs


def _fs_leer(fs):
	return not any(fs.get(k) for k in FS_SCHLUESSEL)


def flurstueck_fehler(fs, land):
	d = FLURSTUECK_FELDER.get(land) or FLURSTUECK_FELDER["DE"]
	fehler = []
	for k, (muster, text_, pflicht) in d.items():
		if k == "m2":
			continue
		w = fs.get(k)
		if not w:
			if pflicht:
				fehler.append({"feld": k, "text": f"{FELD_LABEL.get(land, FELD_LABEL['DE']).get(k, k)} fehlt"})
			continue
		if muster is not None and not muster.match(w):
			fehler.append({"feld": k, "text": text_})
	if land == "DE" and not fs.get("gemarkung") and not fs.get("gemarkungNr"):
		fehler.append({"feld": "gemarkung", "text": "Gemarkung (Name oder Nummer) fehlt"})
	if land == "CH" and not fs.get("gemarkung") and not fs.get("gemarkungNr") and not fs.get("egrid"):
		fehler.append({"feld": "gemarkung", "text": "Gemeinde fehlt"})
	return fehler


def flurstuecke_pruefen(liste, land="DE"):
	flurstuecke, fehler = [], []
	if not isinstance(liste, list):
		return flurstuecke, fehler
	for x in liste[:50]:
		fs = _flurstueck_roh(x, land)
		if _fs_leer(fs):
			continue
		i = len(flurstuecke)
		for f in flurstueck_fehler(fs, land):
			fehler.append({"index": i, **f})
		flurstuecke.append(fs)
	return flurstuecke, fehler


def summen_pruefung(flurstuecke, ha):
	"""{summeHa, vollstaendig, abweichung, stufe (ok|hinweis|warnung|fehler|None)} – wie summenPruefung im JS."""
	mit = [f for f in (flurstuecke or []) if (v.zahl(f.get("m2")) or 0) > 0]
	if not mit:
		return {"summeHa": None, "vollstaendig": False, "abweichung": None, "stufe": None}
	summe_ha = round(sum(float(f["m2"]) for f in mit) / 10000, 4)
	vollstaendig = len(mit) == len(flurstuecke)
	angabe = v.zahl(ha)
	if not vollstaendig or not angabe:
		return {"summeHa": summe_ha, "vollstaendig": vollstaendig, "abweichung": None, "stufe": "hinweis"}
	abw = (angabe - summe_ha) / summe_ha
	stufe = "fehler" if abw > 0.1 else "warnung" if abw > 0.02 else "hinweis" if abw < -0.1 else "ok"
	return {"summeHa": summe_ha, "vollstaendig": True, "abweichung": abw, "stufe": stufe}


def gemeinde_schluessel(w, land="DE"):
	s = re.sub(r"\s", "", v.text(w, 12))
	if not s:
		return ""
	muster, fehler = GEMEINDE_SCHLUESSEL.get(land) or GEMEINDE_SCHLUESSEL["DE"]
	if not muster.match(s):
		raise Fehler(fehler)
	return s


def _jnu(w):
	return v.auswahl(w, JNU, "")


def fach_bereinigen(roh, basis=None, land="DE"):
	"""Positivliste der Fachangaben (Teil-Updates: fehlende Bereiche bleiben aus `basis`). Wirft Fehler."""
	alt = basis if isinstance(basis, dict) else {}
	if not isinstance(roh, dict):
		return alt

	def bereich(k, fn):
		return fn(roh[k]) if isinstance(roh.get(k), dict) else (alt.get(k) or {})

	out = {
		"boden": bereich("boden", lambda b: {
			"ackerzahl": zahl_de(b.get("ackerzahl"), min=1, max=120, stellen=0),
			"gruenlandzahl": zahl_de(b.get("gruenlandzahl"), min=1, max=100, stellen=0),
			"bodenklimazahl": zahl_de(b.get("bodenklimazahl"), min=1, max=100, stellen=0),
			"ertragsmesszahl": zahl_de(b.get("ertragsmesszahl"), min=1, max=100000000, stellen=0),
			"quelle": v.text(b.get("quelle"), 120),
		}),
		"bewirtschaftung": bereich("bewirtschaftung", lambda b: {
			"art": v.auswahl(b.get("art"), BEWIRTSCHAFTUNG, ""),
			"paechter": v.text(b.get("paechter"), 120),
			"pachtEnde": v.monat(b.get("pachtEnde")),
			"kuendigungMonate": zahl_de(b.get("kuendigungMonate"), min=0, max=120, stellen=0),
		}),
		"foerderung": bereich("foerderung", lambda b: {
			"gap": _jnu(b.get("gap")),
			"aukm": _jnu(b.get("aukm")),
			"aukmArt": v.text(b.get("aukmArt"), 160),
			"aukmEnde": zahl_de(b.get("aukmEnde"), min=2000, max=2100, stellen=0),
		}),
		"schutz": bereich("schutz", lambda b: {
			"natura2000": _jnu(b.get("natura2000")),
			"nsg": _jnu(b.get("nsg")),
			"lsg": _jnu(b.get("lsg")),
			"wsg": v.auswahl(b.get("wsg"), WSG, ""),
			"ueberschwemmung": _jnu(b.get("ueberschwemmung")),
			"denkmal": _jnu(b.get("denkmal")),
			"biotop": _jnu(b.get("biotop")),
		}),
		"lage": bereich("lage", lambda b: {
			"gemeindeSchluessel": gemeinde_schluessel(b.get("gemeindeSchluessel"), land),
			"hangneigung": zahl_de(b.get("hangneigung"), min=0, max=100, stellen=1),
			"exposition": v.auswahl(b.get("exposition"), EXPOSITION, ""),
			"zufahrt": v.auswahl(b.get("zufahrt"), ZUFAHRT, ""),
			"waldAngrenzend": _jnu(b.get("waldAngrenzend")),
			"leitungen": _jnu(b.get("leitungen")),
			"leitungenText": v.text(b.get("leitungenText"), 200),
			"netzKm": zahl_de(b.get("netzKm"), min=0, max=200, stellen=1),
		}),
		"eigentum": bereich("eigentum", lambda b: {
			"anzahl": zahl_de(b.get("anzahl"), min=1, max=500, stellen=0),
			"vertretung": v.auswahl(b.get("vertretung"), VERTRETUNG, ""),
			"belastungen": v.mehrfach(b.get("belastungen"), BELASTUNGEN),
			"lastenBekannt": _jnu(b.get("lastenBekannt")),
			"glaeubiger": v.text(b.get("glaeubiger"), 120),
			"hinweise": v.mehrzeilig(b.get("hinweise"), 1000),
		}),
		"agri": bereich("agri", lambda b: {
			"kategorie": v.auswahl(b.get("kategorie"), AGRI_KATEGORIE, ""),
			"system": v.auswahl(b.get("system"), AGRI_SYSTEM, ""),
			"kultur": v.auswahl(b.get("kultur"), AGRI_KULTUREN, ""),
			"kulturText": v.text(b.get("kulturText"), 120),
			"arbeitsbreiteM": zahl_de(b.get("arbeitsbreiteM"), min=0.5, max=60, stellen=1),
			"durchfahrtshoeheM": zahl_de(b.get("durchfahrtshoeheM"), min=0.5, max=10, stellen=2),
			"gassenbreiteM": zahl_de(b.get("gassenbreiteM"), min=1, max=60, stellen=1),
			"referenzertrag": zahl_de(b.get("referenzertrag"), min=0, max=100000, stellen=1),
			"referenzEinheit": v.auswahl(b.get("referenzEinheit"), REFERENZ_EINHEIT, ""),
			"referenzQuelle": v.auswahl(b.get("referenzQuelle"), REFERENZ_QUELLE, ""),
			"nachweis66": v.auswahl(b.get("nachweis66"), NACHWEIS_66, ""),
			"gapWeiter": _jnu(b.get("gapWeiter")),
			"hofbezug": _jnu(b.get("hofbezug")),
			"hofEntfernungM": zahl_de(b.get("hofEntfernungM"), min=0, max=100000, stellen=0),
		}),
		"dach": bereich("dach", lambda b: {
			"dachart": v.auswahl(b.get("dachart"), DACHARTEN, ""),
			"baujahrGebaeude": zahl_de(b.get("baujahrGebaeude"), min=1850, max=2100, stellen=0),
			"baujahrDach": zahl_de(b.get("baujahrDach"), min=1850, max=2100, stellen=0),
			"sanierungGeplant": _jnu(b.get("sanierungGeplant")),
			"dachflaecheM2": m2_zahl(b.get("dachflaecheM2")),
			"neigungGrad": zahl_de(b.get("neigungGrad"), min=0, max=90, stellen=0),
			"statik": v.auswahl(b.get("statik"), STATIK, ""),
			"statikReserveKn": zahl_de(b.get("statikReserveKn"), min=0, max=10, stellen=2),
			"brandwaende": _jnu(b.get("brandwaende")),
			"asbest": _jnu(b.get("asbest")),
			"blitzschutz": _jnu(b.get("blitzschutz")),
			"netz": v.auswahl(b.get("netz"), DACH_NETZ, ""),
			"trafoKva": zahl_de(b.get("trafoKva"), min=0, max=100000, stellen=0),
			"nutzer": v.auswahl(b.get("nutzer"), DACH_NUTZER, ""),
			"mieter": v.text(b.get("mieter"), 120),
			"dachstrom": _jnu(b.get("dachstrom")),
			"denkmal": _jnu(b.get("denkmal")),
		}),
	}
	for k in list(out.keys()):
		werte = out[k] or {}
		if not any((len(x) if isinstance(x, list) else x not in (None, "")) for x in werte.values()):
			del out[k]
	return out


def flaeche_fach_daten(daten, basis=None, land="DE"):
	"""(flurstuecke, fach) – wirft Fehler mit Nummer des Flurstücks wie im JS-Vorbild."""
	basis = basis or {}
	d = daten if isinstance(daten, dict) else {}
	flurstuecke = basis.get("flurstuecke") or []
	if isinstance(d.get("flurstuecke"), list):
		liste, fehler = flurstuecke_pruefen(d["flurstuecke"], land)
		if fehler:
			f = fehler[0]
			mehr = len(fehler) - 1
			zusatz = f" (und {mehr} weitere Angabe{'n' if mehr > 1 else ''})" if mehr else ""
			raise Fehler(f"Flurstück {f['index'] + 1}: {f['text']}{zusatz}.")
		flurstuecke = liste
	fach = fach_bereinigen(d.get("fach"), basis.get("fach"), land) if "fach" in d else (basis.get("fach") or {})
	return flurstuecke, fach


def fach_pflicht_fehlt(f):
	"""Fehlende Pflichtangaben je Nutzung/Eigentum. `f` als dict (camelCase wie flaeche_json)."""
	fehlt = []
	fach = f.get("fach") or {}
	if f.get("nutzung") == "dach":
		d = fach.get("dach") or {}
		if not d.get("dachart"):
			fehlt.append("Dachart")
		if not d.get("asbest"):
			fehlt.append("Angabe zu Asbest / Faserzement")
		if not d.get("nutzer"):
			fehlt.append("Nutzung des Gebäudes (selbst / vermietet)")
	if f.get("agri") and f.get("nutzung") != "dach":
		if not (fach.get("agri") or {}).get("kultur"):
			fehlt.append("Geplante Kultur (Agri-PV)")
	if f.get("eigentum") and f.get("eigentum") != "eigentum" and not (fach.get("eigentum") or {}).get("vertretung"):
		fehlt.append("Vertretung der Eigentümer")
	b = fach.get("bewirtschaftung") or {}
	if b.get("art") == "verpachtet" and not b.get("pachtEnde") and b.get("kuendigungMonate") in (None, ""):
		fehlt.append("Ende oder Kündigungsfrist der bestehenden Pacht")
	if summen_pruefung(f.get("flurstuecke") or [], f.get("ha")).get("stufe") == "fehler":
		fehlt.append("Größe passend zur Katasterfläche der Flurstücke")
	return fehlt


def pachtangebot_bereinigen(pa, am=None):
	"""Pachtangebot (Backoffice, Übergang „Pachtangebot senden“). Wirft Fehler bei fehlenden Pflichtangaben."""
	x = pa if isinstance(pa, dict) else {}
	modell = v.auswahl(x.get("modell"), PACHT_MODELLE, "fest")
	euro = zahl_de(x.get("euroProHaJahr"), min=50, max=50000, stellen=0)
	umsatz = zahl_de(x.get("umsatzProzent"), min=0.5, max=30, stellen=2)
	mindest = zahl_de(x.get("mindestProHa"), min=0, max=50000, stellen=0)
	jahre = zahl_de(x.get("laufzeitJahre"), min=1, max=60, stellen=0)
	if modell == "fest":
		if euro is None or jahre is None:
			raise Fehler("Pachtangebot: Pacht je ha und Laufzeit angeben.")
	else:
		if umsatz is None or jahre is None:
			raise Fehler("Pachtangebot: Umsatzanteil in % und Laufzeit angeben.")
		if modell == "kombi" and mindest is None:
			raise Fehler("Pachtangebot: Mindestpacht je ha angeben.")

	def w(k):
		return v.auswahl(x.get(k), PACHT_OPTIONEN[k], "")

	rr = x.get("rangruecktritt")
	aus = {
		"modell": modell,
		"euroProHaJahr": euro if modell == "fest" else mindest if modell == "kombi" else euro,
		"umsatzProzent": None if modell == "fest" else umsatz,
		"mindestProHa": mindest if modell == "kombi" else None,
		"indexierung": v.auswahl(x.get("indexierung"), INDEX_ARTEN, ""),
		"indexSatzProzent": zahl_de(x.get("indexSatzProzent"), min=0, max=10, stellen=2),
		"reservierungProHaJahr": zahl_de(x.get("reservierungProHaJahr"), min=0, max=5000, stellen=0),
		"laufzeitJahre": jahre,
		"laufzeitBeginn": v.auswahl(x.get("laufzeitBeginn"), LAUFZEIT_BEGINN, ""),
		"verlaengerungJahre": zahl_de(x.get("verlaengerungJahre"), min=0, max=40, stellen=0),
		"verlaengerung": v.text(x.get("verlaengerung"), 80),
		"optionsfristJahre": zahl_de(x.get("optionsfristJahre"), min=0, max=15, stellen=0),
		"vorlaufJahre": zahl_de(x.get("vorlaufJahre"), min=0, max=10, stellen=0),
		"bewirtschaftung": w("bewirtschaftung"),
		"nichtbau": w("nichtbau"),
		"nichtbauEuroProHa": zahl_de(x.get("nichtbauEuroProHa"), min=0, max=50000, stellen=0),
		"kuendigung": w("kuendigung"),
		"rueckbau": w("rueckbau"),
		"rueckbauAb": w("rueckbauAb"),
		"rueckbauEuro": zahl_de(x.get("rueckbauEuro"), min=0, max=100000000, stellen=0),
		"dienstbarkeit": w("dienstbarkeit"),
		"rangruecktritt": None if rr in (None, "") else v.wahr(rr),
		"nebenflaechen": w("nebenflaechen"),
		"nebenflaechenText": v.text(x.get("nebenflaechenText"), 200),
		"anwalt": w("anwalt"),
		"anwaltEuro": zahl_de(x.get("anwaltEuro"), min=0, max=100000, stellen=0),
		"steuerhinweis": v.mehrzeilig(x.get("steuerhinweis"), 1000),
		"gueltigBis": str(x.get("gueltigBis")) if re.match(r"^\d{4}-\d{2}-\d{2}$", str(x.get("gueltigBis") or "")) else "",
		"text": v.mehrzeilig(x.get("text"), 2000),
		"am": am or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
	}
	return {k: w_ for k, w_ in aus.items() if w_ is not None and w_ != ""}


def fach_aus_anfrage(daten):
	"""Fachangaben aus den Chips von /dachflaeche-verpachten (daten.art = "dach")."""
	d = daten if isinstance(daten, dict) else {}
	if d.get("art") != "dach":
		return {}
	dach = {}
	art = {"trapez": "trapez", "sandwich": "sandwich", "flach": "flach_folie", "faserzement": "faserzement"}.get(d.get("dachart"))
	if art:
		dach["dachart"] = art
	m2 = {"1000-3000": 2000, "3000-10000": 6000, "10000+": 10000, "unter-1000": 800}.get(d.get("groesse"))
	if m2:
		dach["dachflaecheM2"] = m2
	if isinstance(d.get("interesse"), list) and "ppa" in d["interesse"]:
		dach["dachstrom"] = "ja"
	return {"dach": dach} if dach else {}


# ------------------------------------------------------------------ Kommune

KOMMUNE_ABSENDER = ["gemeinde", "stadtwerk", "landkreis"]
KOMMUNE_ROLLE = ["buergermeister", "bauamt", "kaemmerei", "klimaschutz", "rat", "geschaeftsfuehrung", "sonstige"]
BAULEITPLANUNG_STAND = ["keine", "kriterien", "fnp", "aufstellung", "laufend"]
KRITERIENKATALOG = ["ja", "arbeit", "nein"]
BUERGERBETEILIGUNG = ["genossenschaft", "darlehen", "gemeinschaft", "stadtwerk", "offen"]
KOMMUNE_THEMEN = ["solarpark", "agri", "kriterien", "beteiligung", "carport", "speicher", "dach"]
KOMMUNE_GEPRUEFT = ["qualifiziert", "angebot", "abgeschlossen"]
KOMMUNE_SICHTBAR = ["planung", "bau", "betrieb"]
KOMMUNE_PHASE = {"planung": "Bauleitplanung / Genehmigung", "bau": "Im Bau", "betrieb": "In Betrieb"}


def kommune_daten(d, land="", kontakt=None):
	x = d if isinstance(d, dict) else {}
	kontakt = kontakt or {}
	l = land if land in ("DE", "AT", "CH") else x.get("land") if x.get("land") in ("DE", "AT", "CH") else "DE"
	return {
		"land": l,
		"absender": v.auswahl(x.get("absender"), KOMMUNE_ABSENDER, "gemeinde"),
		"gemeinde": v.text(x.get("gemeinde"), 120) or v.text(kontakt.get("firma"), 120),
		"gemeindeSchluessel": gemeinde_schluessel(x.get("gemeindeSchluessel"), l),
		"rolle": v.auswahl(x.get("rolle"), KOMMUNE_ROLLE, ""),
		"gemeindeFlaechenHa": zahl_de(x.get("gemeindeFlaechenHa"), min=0, max=100000, stellen=1),
		"interesse6": v.auswahl(x.get("interesse6"), JNU, "") if l == "DE" else "",
		"buergerbeteiligung": v.mehrfach(x.get("buergerbeteiligung"), BUERGERBETEILIGUNG),
		"bauleitplanung": v.auswahl(x.get("bauleitplanung"), BAULEITPLANUNG_STAND, ""),
		"kriterienkatalog": v.auswahl(x.get("kriterienkatalog"), KRITERIENKATALOG, ""),
		"themen": v.mehrfach(x.get("themen"), KOMMUNE_THEMEN),
	}


def _norm_name(s):
	s = str(s or "").lower()
	s = re.sub(r"\((demo|fiktiv)\)", "", s)
	s = re.sub(r"^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde|ortsgemeinde|große kreisstadt|kreisstadt|hansestadt)\s+", "", s)
	s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	return re.sub(r"[^a-z0-9]+", " ", s).strip()


def flaeche_im_gebiet(f, gemeinde):
	"""`f` dict (camelCase), `gemeinde` {name, land, schluessel}."""
	if not f or not gemeinde:
		return False
	if gemeinde.get("land") and f.get("land") and gemeinde["land"] != f["land"]:
		return False
	gs = ((f.get("fach") or {}).get("lage") or {}).get("gemeindeSchluessel")
	if gemeinde.get("schluessel") and gs:
		return gs == gemeinde["schluessel"]
	return bool(gemeinde.get("name")) and _norm_name(f.get("ort")) == _norm_name(gemeinde["name"])


def _region(land, bundesland):
	if land == "AT":
		return "at"
	if land == "CH":
		return "ch"
	if bundesland in ("Bayern", "Baden-Württemberg"):
		return "de-sued"
	if bundesland in ("Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"):
		return "de-ost"
	if bundesland in ("Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"):
		return "de-nord"
	return "de-west"


def paragraph6_schaetzung(ha, land="DE", bundesland="", agri=False):
	ha = v.zahl(ha)
	if land != "DE" or not ha or ha <= 0:
		return None
	kwp = ha / (AGRI_HOCH_HA_PRO_MWP if agri else FREIFLAECHE_HA_PRO_MWP) * 1000
	kwh = kwp * REGION_ERTRAG[_region(land, bundesland)]
	return {"kwp": v._js_round(kwp), "kwh": v._js_round(kwh), "euroProJahr": v._js_round(kwh * KOMMUNE_BETEILIGUNG_CT / 100)}


def projekt_fuer_gemeinde(f, i):
	"""Vereinfachte Projektsicht – ohne personenbezogene oder vertrauliche Angaben."""
	ha = v.zahl(f.get("ha")) or 0
	seit = None
	for e in f.get("statusVerlauf") or []:
		if e.get("status") == f.get("status"):
			seit = e.get("am")
	dach = f.get("nutzung") == "dach"
	return {
		"nr": i + 1,
		"art": "Dach-PV" if dach else "Agri-PV" if f.get("agri") else "Freiflächen-PV",
		"ha": v._js_round(ha * 2) / 2,
		"status": f.get("status"),
		"phase": KOMMUNE_PHASE.get(f.get("status"), f.get("status")),
		"seit": seit or f.get("geaendertAm"),
		"par6": None if dach else paragraph6_schaetzung(ha, f.get("land"), f.get("bundesland"), bool(f.get("agri"))),
	}
