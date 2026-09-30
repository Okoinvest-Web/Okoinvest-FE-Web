# Copyright (c) 2026, ÖkoInvest GmbH
#
# Planungsdateien (CAD) & Projektkostenkalkulation – reine Regeln (ohne Frappe lauffähig), Gegenstück zu
# src/lib/plattform/planung/regeln.js und src/lib/plattform/planung/kosten.js (gleiche Ergebnisse, Parität per Test:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_planung_kern).
# Vorschlagswerte: planung_markt.py (generiert aus markt.js).
#
# Die DXF-/Geo-Analyse läuft auf der Website (JavaScript, derselbe Parser wie die Vorschau); Frappe prüft beim Upload die
# Kennung der ersten Bytes zusätzlich (erkennen) und speichert Datei, abgeleitete Datei und Analyse.

import math
import re

from oekoinvest_app.plattform.planung_markt import MARKT

FF = MARKT["FREIFLAECHE"]
PK = MARKT["PROJEKTKOSTEN"]
SP = MARKT["SPEICHER"]
FIN = MARKT["FINANZIERUNG"]
PACHT = MARKT["PACHT"]

MB = 1024 * 1024

# ---------------------------------------------------------------------------------------------------- Formate & Status

FORMATE = {
	"dwg": {"label": "DWG (AutoCAD)", "endung": "dwg", "mime": "application/acad", "max": 30 * MB},
	"dxf": {"label": "DXF (AutoCAD, ASCII)", "endung": "dxf", "mime": "image/vnd.dxf", "max": 30 * MB},
	"pdf": {"label": "PDF-Plan", "endung": "pdf", "mime": "application/pdf", "max": 25 * MB},
	"kml": {"label": "KML (Google Earth)", "endung": "kml", "mime": "application/vnd.google-earth.kml+xml", "max": 10 * MB},
	"kmz": {"label": "KMZ (KML gepackt)", "endung": "kmz", "mime": "application/vnd.google-earth.kmz", "max": 10 * MB},
	"geojson": {"label": "GeoJSON", "endung": "geojson", "mime": "application/geo+json", "max": 10 * MB},
	"shape": {"label": "Shapefile (ZIP)", "endung": "zip", "mime": "application/zip", "max": 20 * MB},
}

PLANARTEN = {
	"lageplan": "Lageplan / Übersicht", "belegungsplan": "Belegungsplan (Modulbelegung)", "kabelplan": "Kabel- und Stringplan",
	"trassenplan": "Trassenplan Mittelspannung", "elektro": "Elektroplan / Einlinienschaltbild", "bplan": "Bebauungsplan / Vorhabenplan",
	"vermessung": "Vermessung / Bestand", "gruen": "Grünordnung / Ausgleich", "detail": "Detail / Schnitt", "sonstiges": "Sonstiger Plan",
}
MASSSTAEBE = ["1:100", "1:200", "1:250", "1:500", "1:1000", "1:2000", "1:2500", "1:5000", "1:10000", "ohne"]
BLATTFORMATE = ["A0", "A1", "A2", "A3", "A4", "Sonderformat", "digital"]
PLAN_STATUS = {"entwurf": "Entwurf", "pruefung": "Zur Prüfung", "freigegeben": "Freigegeben", "ersetzt": "Ersetzt"}
PLAN_AKTIONEN = {
	"einreichen": {"von": ["entwurf"], "nach": "pruefung", "wer": ["bo", "planer"], "kommentar": False},
	"freigeben": {"von": ["pruefung"], "nach": "freigegeben", "wer": ["bo"], "kommentar": False},
	"zurueckweisen": {"von": ["pruefung"], "nach": "entwurf", "wer": ["bo"], "kommentar": True},
	"zurueckziehen": {"von": ["freigegeben"], "nach": "pruefung", "wer": ["bo"], "kommentar": True},
}
DWG_VERSIONEN = {
	"AC1009": "R11/R12", "AC1012": "R13", "AC1014": "R14", "AC1015": "AutoCAD 2000", "AC1018": "AutoCAD 2004", "AC1021": "AutoCAD 2007",
	"AC1024": "AutoCAD 2010", "AC1027": "AutoCAD 2013", "AC1032": "AutoCAD 2018",
}


def aktion_pruefen(aktion, status, rolle, kommentar=""):
	"""→ (ok, nach | (http_status, text))"""
	a = PLAN_AKTIONEN.get(aktion)
	if not a:
		return False, (422, "Unbekannte Aktion.")
	if rolle not in a["wer"]:
		return False, (403, "Freigeben darf nur die Projektentwicklung." if rolle == "planer" else "Dafür fehlt Ihnen das Recht.")
	if status not in a["von"]:
		return False, (409, f"Aus dem Status „{PLAN_STATUS.get(status, status)}“ nicht möglich.")
	if a["kommentar"] and len((kommentar or "").strip()) < 5:
		return False, (422, "Bitte begründen Sie den Schritt (mindestens 5 Zeichen).")
	return True, a["nach"]


def naechster_index(vorhandene):
	def zahl(s):
		n = 0
		for c in s.upper():
			n = n * 26 + (ord(c) - 64)
		return n

	m = max([zahl(s) for s in vorhandene if s and re.fullmatch(r"[A-Za-z]{1,3}", s)] or [0])
	n = m + 1
	s = ""
	while n > 0:
		r = (n - 1) % 26
		s = chr(65 + r) + s
		n = (n - 1) // 26
	return s


def erkennen(daten, format_website):
	"""Prüft, ob die ersten Bytes zum von der Website erkannten Format passen (zweite Verteidigungslinie)."""
	kopf = bytes(daten[:400])
	if format_website not in FORMATE:
		return False
	if len(daten) > FORMATE[format_website]["max"]:
		return False
	if format_website == "pdf":
		return kopf.startswith(b"%PDF-")
	if format_website == "dwg":
		return bool(re.match(rb"AC10\d\d", kopf))
	if format_website in ("kmz", "shape"):
		return kopf.startswith(b"PK\x03\x04")
	text = kopf.decode("latin-1").lstrip()
	if format_website == "dxf":
		return bool(re.match(r"(999\s*[\r\n]+[^\r\n]*[\r\n]+\s*)*0\s*[\r\n]+\s*SECTION", text))
	if format_website == "kml":
		return "<kml" in text.lower()
	if format_website == "geojson":
		return text.startswith("{")
	return False


def plan_zugriff(z, plan, versionen):
	"""z = {backoffice, schreiben, nutzer_id, gutachter_ms: set, investor: dict|None} → dict (wie planZugriff in regeln.js)"""
	planer = bool(z.get("nutzer_id")) and ((plan.get("meilenstein_id") and plan["meilenstein_id"] in z.get("gutachter_ms", set())) or plan.get("planer_id") == z.get("nutzer_id"))
	investor = bool(z.get("investor")) and bool((z.get("investor") or {}).get("dokumente"))

	def version(v):
		return bool(z.get("backoffice") or planer or (investor and v.get("status") == "freigegeben"))

	return {
		"sehen": bool(z.get("backoffice") or planer or (investor and any(v.get("status") == "freigegeben" for v in versionen))),
		"hochladen": bool((z.get("backoffice") and z.get("schreiben")) or planer),
		"planer": bool(planer),
		"version": version,
	}


# ---------------------------------------------------------------------------------------------------- Kostenkalkulation


def r2(x):
	return math.floor(float(x or 0) * 100 + 0.5) / 100


def rund(x):
	return math.floor(x + 0.5)


GRUPPEN = {
	"entwicklung": ("Entwicklung", "700", 1), "grundstueck": ("Grundstück & Rechte", "100", 2), "technik": ("Technik / EPC", "400/500", 3),
	"netz": ("Netzanschluss", "200", 4), "neben": ("Nebenkosten Bau", "700", 5), "reserve": ("Unvorhergesehenes", "–", 6),
	"finanzierung": ("Finanzierungskosten", "760", 7), "sicherheit": ("Sicherheiten", "–", 8),
}
# Gewerk → (Label, Gruppe, KG, Kostenart Finanzmodul)
GEWERKE = {
	"ent_pacht": ("Pachtvorlauf / Reservierung", "entwicklung", "110", "flaeche"),
	"ent_planung": ("Planung (Objekt-, Genehmigungs-, B-Plan-Planung)", "entwicklung", "730", "planung"),
	"ent_gutachten": ("Gutachten", "entwicklung", "740", "planung"),
	"ent_gebuehren": ("Gebühren B-Plan / Genehmigung", "entwicklung", "770", "genehmigung"),
	"ent_recht": ("Rechtsberatung", "entwicklung", "770", "recht"),
	"ent_netzpruefung": ("Netzprüfung / Netzanfrage", "entwicklung", "720", "netz"),
	"gr_dienstbarkeit": ("Dienstbarkeiten (Leitungsrechte)", "grundstueck", "120", "flaeche"),
	"gr_notar": ("Notar / Grundbuch", "grundstueck", "120", "recht"),
	"module": ("Module", "technik", "440", None),
	"wechselrichter": ("Wechselrichter", "technik", "440", None),
	"unterkonstruktion": ("Unterkonstruktion inkl. Rammung und Montage", "technik", "440", None),
	"dc": ("DC-Verkabelung", "technik", "440", None),
	"ac": ("AC-Verkabelung (Niederspannung im Park)", "technik", "440", None),
	"bos": ("Monitoring, Blitzschutz, Kommunikation, Inbetriebnahme", "technik", "450", None),
	"zaun": ("Zaun, Tore, Kamera", "technik", "530", None),
	"wege": ("Wege und Erdarbeiten", "technik", "510", None),
	"ausgleich": ("Ausgleichs- und Ökomaßnahmen", "technik", "230", None),
	"speicher": ("Batteriespeicher", "technik", "440", None),
	"bauleitung": ("Bauleitung / EPC-Marge", "technik", "710", None),
	"station": ("Trafostation(en) / Übergabestation", "netz", "440", None),
	"trasse": ("Mittelspannungstrasse", "netz", "220", None),
	"querung": ("Querungen (Straße, Bahn, Gewässer)", "netz", "220", None),
	"netzanschluss": ("Umspannwerk- / Netzanschlusskosten", "netz", "220", None),
	"bkz": ("Baukostenzuschuss", "netz", "220", None),
	"versicherung": ("Versicherung Bauzeit (CAR/EAR)", "neben", "790", None),
	"contingency": ("Unvorhergesehenes (Contingency)", "reserve", "–", None),
	"bauzeitzinsen": ("Bauzeitzinsen", "finanzierung", "760", None),
	"fin_gebuehren": ("Finanzierungsgebühren", "finanzierung", "760", None),
	"rueckbau": ("Rückbausicherheit (Bürgschaft/Hinterlegung)", "sicherheit", "–", None),
	"sonstiges": ("Sonstiges", "neben", "790", "sonstiges"),
}
KOSTENSTAENDE = {
	"schaetzung": ("Kostenschätzung", 1), "kostenrahmen": ("Kostenrahmen", 2), "kostenberechnung": ("Kostenberechnung", 3),
	"angebote": ("Angebote", 4), "vergabe": ("Vergabe", 5), "abrechnung": ("Abrechnung", 6),
}
VERLEGEARTEN = {"graben": "Offener Graben (Acker/Wiese)", "pflug": "Kabelpflug", "bankett": "Straßenbankett", "asphalt": "Asphaltdecke", "spuelbohrung": "Spülbohrung (HDD)"}
QUERUNGEN = {"strasse": "Straße", "bahn": "Bahn", "gewaesser": "Gewässer"}


def capex_spanne(typ):
	if typ == "agri":
		return MARKT["AGRI_CAPEX"]
	if typ == "carport":
		return MARKT["CARPORT_CAPEX"]
	if typ == "dach":
		return MARKT["DACH_CAPEX"]
	return FF["capexProKwp"]


def _anteile(typ):
	return PK["epcAnteile"]["carport" if typ == "carport" else "dach" if typ == "dach" else "standard"]


def _hat_flaeche(typ):
	return typ in ("freiflaeche", "agri", "hybrid", "speicher")


def _zahl(x):
	return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def parameter_voll(p):
	p = p or {}
	typ = p.get("typ") or "freiflaeche"
	stand = p.get("kostenstand") if p.get("kostenstand") in KOSTENSTAENDE else "schaetzung"
	tr = p.get("trasse") or {}
	q = tr.get("querungen") or {}
	abschnitte = [{"art": a["art"], "laengeM": float(a["laengeM"])} for a in (tr.get("abschnitte") or []) if isinstance(a, dict) and a.get("art") in VERLEGEARTEN and _zahl(a.get("laengeM")) and a["laengeM"] > 0]
	return {
		"typ": typ,
		"land": p.get("land") or "DE",
		"mwp": max(0.0, float(p.get("mwp") or 0)),
		"mwh": max(0.0, float(p.get("mwh") or 0)),
		"flaecheHa": max(0.0, float(p.get("flaecheHa") or 0)),
		"flaechenAnzahl": max(1, rund(float(p.get("flaechenAnzahl") or 1))),
		"zaunM": max(0.0, float(p.get("zaunM") or 0)),
		"trasse": {"abschnitte": abschnitte, "querungen": {k: max(0, rund(float(q.get(k) or 0))) for k in QUERUNGEN}, "quelle": tr.get("quelle") or ""},
		"speicherNetzbezug": bool(p.get("speicherNetzbezug")),
		"kostenstand": stand,
		"contingency": max(0.0, min(0.5, float(p["contingency"]))) if _zahl(p.get("contingency")) else PK["contingency"][stand],
		"fkQuote": max(0.0, min(1.0, float(p["fkQuote"]))) if _zahl(p.get("fkQuote")) else FIN["fremdkapitalQuote"],
		"zinsBau": max(0.0, min(0.2, float(p["zinsBau"]))) if _zahl(p.get("zinsBau")) else (FIN["projekt"]["referenzzinsPct"] + FIN["projekt"]["margePct"]) / 100,
		"bauzeitMonate": max(1, min(36, rund(float(p.get("bauzeitMonate") or 0)) or PK["bauzeitMonate"].get(typ) or 6)),
		"gutachten": [{"schluessel": str(g["schluessel"]), "titel": str(g.get("titel") or g["schluessel"])} for g in (p.get("gutachten") or []) if isinstance(g, dict) and g.get("schluessel")],
	}


def trassen_laenge(p):
	return sum(float(a.get("laengeM") or 0) for a in ((p.get("trasse") or {}).get("abschnitte") or []))


def kabel_systeme(mw):
	return max(1, math.ceil(float(mw or 0) / FF["netz"]["msSystemMw"] - 1e-9))


def ebene_fuer(mw):
	n = FF["netz"]
	return "msLeitung" if mw <= n["grenzeMsMw"] else "uwMs" if mw <= n["grenzeUwMw"] else "hs"


def vorschlag(parameter):
	p = parameter_voll(parameter)
	kwp = p["mwp"] * 1000
	pos = []

	def add(**x):
		pos.append({"art": "menge", "satz": None, "basis": None, **x})

	spanne = capex_spanne(p["typ"])
	anteile = _anteile(p["typ"])
	pv = kwp > 0 and p["typ"] != "speicher"
	e_min, e_max = FF["entwicklungProKwp"]["min"], FF["entwicklungProKwp"]["max"]

	gutachten_summe = sum(PK["gutachtenEur"].get(g["schluessel"], PK["gutachtenEur"]["standard"]) for g in p["gutachten"])
	entw_gesamt = (kwp * (e_min + e_max)) / 2 if kwp * e_min > 0 else 0
	rest = max(kwp * e_min * 0.5, entw_gesamt - gutachten_summe)
	if _hat_flaeche(p["typ"]) and p["flaecheHa"] > 0:
		pro_ha = (PACHT["reservierungProHa"]["min"] + PACHT["reservierungProHa"]["max"]) / 2
		jahre = PACHT["reservierungJahre"]["ueblich"]
		add(schluessel="ent_pacht", gewerk="ent_pacht", bezeichnung=f"Reservierungsentgelt {jahre} Jahre bis Baubeginn", menge=r2(p["flaecheHa"] * jahre), einheit="ha·a", ep=pro_ha, quelle="markt.js PACHT.reservierungProHa (Mitte)")
	for k in ("planung", "gebuehren", "recht", "netzpruefung"):
		if not rest or not PK["entwicklungAnteile"].get(k):
			continue
		add(schluessel=f"ent_{k}", gewerk=f"ent_{k}", bezeichnung=GEWERKE[f"ent_{k}"][0], menge=1, einheit="psch", ep=r2(rest * PK["entwicklungAnteile"][k]), quelle="markt.js FREIFLAECHE.entwicklungProKwp (Mitte) abzgl. Gutachten")
	for g in p["gutachten"]:
		add(schluessel=f"gutachten:{g['schluessel']}", gewerk="ent_gutachten", bezeichnung=g["titel"], menge=1, einheit="Stk", ep=PK["gutachtenEur"].get(g["schluessel"], PK["gutachtenEur"]["standard"]), quelle="markt.js PROJEKTKOSTEN.gutachtenEur")

	tl = trassen_laenge(p)
	if tl > 0:
		add(schluessel="gr_dienstbarkeit", gewerk="gr_dienstbarkeit", bezeichnung="Entschädigung Leitungsrechte entlang der Trasse", menge=r2(tl), einheit="m", ep=PK["dienstbarkeitProM"], quelle="markt.js PROJEKTKOSTEN.dienstbarkeitProM")
	if _hat_flaeche(p["typ"]) or tl > 0:
		vorgaenge = p["flaechenAnzahl"] + (math.ceil(tl / 250) if tl > 0 else 0)
		add(schluessel="gr_notar", gewerk="gr_notar", bezeichnung="Notar/Grundbuch (Dienstbarkeiten, Vormerkungen)", menge=vorgaenge, einheit="Vorgang", ep=PK["notarJeFlaeche"], quelle="markt.js PROJEKTKOSTEN.notarJeFlaeche")

	epc = spanne["mittel"]
	if pv:
		for k in ("module", "wechselrichter", "unterkonstruktion", "dc", "ac", "bos"):
			if not anteile.get(k):
				continue
			add(schluessel=k, gewerk=k, bezeichnung=GEWERKE[k][0], menge=kwp, einheit="kWp", ep=r2(epc * anteile[k]), quelle=f"markt.js EPC {epc} €/kWp × Anteil {rund(anteile[k] * 100)} %")
		if anteile.get("zaun"):
			if p["zaunM"] > 0 or p["flaecheHa"] > 0:
				m = p["zaunM"] if p["zaunM"] > 0 else rund(4 * math.sqrt(p["flaecheHa"] * 10000) * 1.15)
				add(schluessel="zaun", gewerk="zaun", bezeichnung="Zaun inkl. Tore" + ("" if p["zaunM"] > 0 else " (Länge geschätzt aus Fläche)"), menge=m, einheit="m", ep=PK["zaunProM"], quelle="Zaunlänge aus Parametern/DXF" if p["zaunM"] > 0 else "Umfang ≈ 4 × √Fläche × 1,15")
				if p["flaecheHa"] > 0:
					add(schluessel="kamera", gewerk="zaun", bezeichnung="Kamera / Einbruchmeldeanlage", menge=r2(p["flaecheHa"]), einheit="ha", ep=PK["kameraProHa"], quelle="markt.js PROJEKTKOSTEN.kameraProHa")
			else:
				add(schluessel="zaun", gewerk="zaun", bezeichnung=GEWERKE["zaun"][0], menge=kwp, einheit="kWp", ep=r2(epc * anteile["zaun"]), quelle="EPC-Anteil (ohne Zaunlänge)")
		if anteile.get("wege"):
			if p["flaecheHa"] > 0 and _hat_flaeche(p["typ"]):
				add(schluessel="wege", gewerk="wege", bezeichnung=GEWERKE["wege"][0], menge=r2(p["flaecheHa"]), einheit="ha", ep=PK["wegeProHa"], quelle="markt.js PROJEKTKOSTEN.wegeProHa")
			else:
				add(schluessel="wege", gewerk="wege", bezeichnung="Belag, Entwässerung, Erdarbeiten" if p["typ"] == "carport" else GEWERKE["wege"][0], menge=kwp, einheit="kWp", ep=r2(epc * anteile["wege"]), quelle="EPC-Anteil")
		if _hat_flaeche(p["typ"]) and p["flaecheHa"] > 0:
			add(schluessel="ausgleich", gewerk="ausgleich", bezeichnung=GEWERKE["ausgleich"][0], menge=r2(p["flaecheHa"]), einheit="ha", ep=PK["ausgleichProHa"], quelle="markt.js PROJEKTKOSTEN.ausgleichProHa")
	if p["mwh"] > 0:
		add(schluessel="speicher", gewerk="speicher", bezeichnung="Batteriespeicher schlüsselfertig", menge=p["mwh"] * 1000, einheit="kWh", ep=SP["capexProKwh"]["mittel"], quelle="markt.js SPEICHER.capexProKwh (Mitte)")
	if pv and anteile.get("bauleitung"):
		pos.append({"schluessel": "bauleitung", "gewerk": "bauleitung", "bezeichnung": GEWERKE["bauleitung"][0], "art": "prozent", "menge": None, "einheit": "%", "ep": None, "satz": math.floor((anteile["bauleitung"] / (1 - anteile["bauleitung"])) * 1e6 + 0.5) / 1e6, "basis": "technik", "quelle": "EPC-Anteil als Aufschlag auf die Gewerke"})

	speicher_mw = p["mwh"] / 2 if p["mwh"] > 0 else 0
	anschluss_mw = max(p["mwp"], speicher_mw) if p["typ"] == "speicher" else p["mwp"]
	ebene = ebene_fuer(anschluss_mw)
	n = FF["netz"]
	if p["typ"] == "speicher":
		if anschluss_mw > 0:
			add(schluessel="station", gewerk="station", bezeichnung="Umspannung / Schaltanlage Speicher", menge=anschluss_mw * 1000, einheit="kW", ep=SP["netzanschlussProKw"]["hs" if ebene == "hs" else "ms"], quelle="markt.js SPEICHER.netzanschlussProKw")
	elif p["mwp"] > 0:
		add(schluessel="station", gewerk="station", bezeichnung=GEWERKE["station"][0], menge=r2(p["mwp"]), einheit="MWp", ep=FF["netzanschlussFixProMwp"], quelle="markt.js FREIFLAECHE.netzanschlussFixProMwp")
	if tl > 0:
		if ebene == "hs":
			add(schluessel="trasse:hs", gewerk="trasse", bezeichnung="Kabeltrasse 110 kV", menge=r2(tl), einheit="m", ep=n["hsKabelProKm"]["mittel"] / 1000, quelle="markt.js FREIFLAECHE.netz.hsKabelProKm (Mitte)")
		else:
			sys_ = kabel_systeme(anschluss_mw)
			faktor = 1 + (sys_ - 1) * n["zusatzSystemFaktor"]
			for a in p["trasse"]["abschnitte"]:
				add(schluessel=f"trasse:{a['art']}", gewerk="trasse", bezeichnung=f"MS-Trasse {VERLEGEARTEN[a['art']]}" + (f" ({sys_} Systeme)" if sys_ > 1 else ""), menge=r2(a["laengeM"]), einheit="m", ep=r2(PK["trasseProM"][a["art"]] * faktor), quelle="markt.js PROJEKTKOSTEN.trasseProM" + (" × Systemfaktor" if sys_ > 1 else ""))
	for k, anzahl in p["trasse"]["querungen"].items():
		if anzahl > 0:
			add(schluessel=f"querung:{k}", gewerk="querung", bezeichnung=f"Querung {QUERUNGEN[k]}", menge=anzahl, einheit="Stk", ep=PK["querung"][k], quelle="markt.js PROJEKTKOSTEN.querung")
	if anschluss_mw > 0:
		if ebene == "msLeitung":
			add(schluessel="netzanschluss", gewerk="netzanschluss", bezeichnung="Einschleifen in die MS-Leitung (Schaltanlage, Schutz)", menge=1, einheit="psch", ep=n["einschleifen"], quelle="markt.js FREIFLAECHE.netz.einschleifen")
		elif ebene == "uwMs":
			add(schluessel="netzanschluss", gewerk="netzanschluss", bezeichnung="Schaltfeld(er) im Umspannwerk", menge=kabel_systeme(anschluss_mw), einheit="Feld", ep=n["uwFeld"]["mittel"], quelle="markt.js FREIFLAECHE.netz.uwFeld (Mitte)")
		else:
			add(schluessel="netzanschluss", gewerk="netzanschluss", bezeichnung="Eigenes Umspannwerk 110/20 kV", menge=1, einheit="psch", ep=n["kundenUwFix"] + n["kundenUwProMva"] * anschluss_mw, quelle="markt.js FREIFLAECHE.netz.kundenUw*")
	if speicher_mw > 0 and p["speicherNetzbezug"]:
		add(schluessel="bkz", gewerk="bkz", bezeichnung="Netzbereitstellungsentgelt Speicher (Näherung wie BKZ)" if p["land"] == "AT" else "Baukostenzuschuss Netzbezug Speicher", menge=speicher_mw * 1000, einheit="kW", ep=SP["bkzProKw"]["hs" if ebene == "hs" else "ms"], quelle="markt.js SPEICHER.bkzProKw")

	pos.append({"schluessel": "versicherung", "gewerk": "versicherung", "bezeichnung": GEWERKE["versicherung"][0], "art": "prozent", "menge": None, "einheit": "%", "ep": None, "satz": PK["versicherungBau"], "basis": "bau", "quelle": "markt.js PROJEKTKOSTEN.versicherungBau"})
	pos.append({"schluessel": "contingency", "gewerk": "contingency", "bezeichnung": f"Unvorhergesehenes ({KOSTENSTAENDE[p['kostenstand']][0]})", "art": "prozent", "menge": None, "einheit": "%", "ep": None, "satz": p["contingency"], "basis": "bau", "quelle": "markt.js PROJEKTKOSTEN.contingency je Kostenstand"})
	pos.append({"schluessel": "bauzeitzinsen", "gewerk": "bauzeitzinsen", "bezeichnung": f"Bauzeitzinsen ({p['bauzeitMonate']} Monate, FK {rund(p['fkQuote'] * 100)} %, Ø 50 % in Anspruch)", "art": "zins", "menge": None, "einheit": "%", "ep": None, "satz": p["zinsBau"], "basis": "bau", "quelle": "markt.js FINANZIERUNG.projekt (Referenzzins + Marge)"})
	pos.append({"schluessel": "fin_gebuehren", "gewerk": "fin_gebuehren", "bezeichnung": "Bearbeitungsgebühr Finanzierung", "art": "prozent", "menge": None, "einheit": "%", "ep": None, "satz": r2(p["fkQuote"] * FIN["projekt"]["bearbeitungPct"] * 100) / 10000, "basis": "invest", "quelle": "markt.js FINANZIERUNG.projekt.bearbeitungPct × FK-Quote"})
	if pv:
		add(schluessel="rueckbau", gewerk="rueckbau", bezeichnung=GEWERKE["rueckbau"][0], menge=kwp, einheit="kWp", ep=FF["rueckbauProKwp"], quelle="markt.js FREIFLAECHE.rueckbauProKwp")
	return pos


def zusammenfuehren(gespeichert, vorschlaege):
	alt = {x["schluessel"]: x for x in (gespeichert or [])}
	out = []
	for v in vorschlaege:
		a = alt.pop(v["schluessel"], None)
		vor = {"menge": v.get("menge"), "ep": v.get("ep"), "satz": v.get("satz")}
		if a and a.get("manuell"):
			out.append({**v, **{k: a.get(k) for k in ("bezeichnung", "menge", "ep", "satz", "einheit")}, "istEur": a.get("istEur"), "notiz": a.get("notiz") or "", "angebot": a.get("angebot") or "", "manuell": True, "vorschlag": vor})
		else:
			out.append({**v, "istEur": (a or {}).get("istEur"), "notiz": (a or {}).get("notiz") or "", "angebot": (a or {}).get("angebot") or "", "manuell": False, "vorschlag": vor})
	for a in alt.values():
		frei = str(a["schluessel"]).startswith("frei:")
		if frei or a.get("manuell") or float(a.get("istEur") or 0) > 0:
			out.append({**a, "vorschlag": None if frei else a.get("vorschlag"), "entfallen": not frei})
	return out


def berechnen(positionen, parameter):
	p = parameter_voll(parameter)
	kwp = p["mwp"] * 1000
	liste = [{**x, "gruppe": GEWERKE.get(x.get("gewerk"), (None, "neben"))[1]} for x in positionen]

	def summe(f):
		return sum(x.get("betrag") or 0 for x in liste if f(x))

	for x in liste:
		if x.get("art") in ("menge", None):
			x["betrag"] = r2(float(x.get("menge") or 0) * float(x.get("ep") or 0))
	technik_basis = summe(lambda x: x["gruppe"] == "technik" and x.get("art") != "prozent" and x.get("gewerk") != "speicher")
	for x in liste:
		if x.get("art") == "prozent" and x.get("basis") == "technik":
			x["betrag"] = r2(technik_basis * float(x.get("satz") or 0))
	bau = summe(lambda x: x["gruppe"] in ("technik", "netz"))
	for x in liste:
		if x.get("art") == "prozent" and x.get("basis") == "bau":
			x["betrag"] = r2(bau * float(x.get("satz") or 0))
	bau_gesamt = summe(lambda x: x["gruppe"] in ("technik", "netz", "neben", "reserve") and x.get("art") != "zins")
	for x in liste:
		if x.get("art") == "zins":
			x["betrag"] = r2(p["fkQuote"] * bau_gesamt * float(x.get("satz") or 0) * (p["bauzeitMonate"] / 12) * 0.5)
	invest = summe(lambda x: x["gruppe"] not in ("finanzierung", "sicherheit"))
	for x in liste:
		if x.get("art") == "prozent" and x.get("basis") == "invest":
			x["betrag"] = r2(invest * float(x.get("satz") or 0))

	gruppen = {g: {"soll": 0.0, "ist": 0.0} for g in GRUPPEN}
	for x in liste:
		gruppen[x["gruppe"]]["soll"] += x.get("betrag") or 0
		gruppen[x["gruppe"]]["ist"] += float(x.get("istEur") or 0)
		x["eurProKwp"] = r2(x["betrag"] / kwp) if kwp > 0 else None
	for g in gruppen.values():
		g["soll"] = r2(g["soll"])
		g["ist"] = r2(g["ist"])
		g["eurProKwp"] = r2(g["soll"] / kwp) if kwp > 0 else None
	gesamt = r2(sum(g["soll"] for k, g in gruppen.items() if k != "sicherheit"))
	capex = r2(gesamt - gruppen["finanzierung"]["soll"])
	speicher = sum(x["betrag"] for x in liste if x.get("gewerk") == "speicher")
	epc = r2(gruppen["technik"]["soll"] - speicher)
	summen = {
		"gesamt": gesamt, "capex": capex, "finanzierungsbedarf": r2(gesamt + gruppen["sicherheit"]["soll"]), "bau": r2(bau), "invest": r2(invest),
		"ist": r2(sum(float(x.get("istEur") or 0) for x in liste)),
		"eurProKwp": r2(gesamt / kwp) if kwp > 0 else None, "capexProKwp": r2(capex / kwp) if kwp > 0 else None,
		"epcProKwp": r2(epc / kwp) if kwp > 0 and p["typ"] != "speicher" else None,
		"eurProKwh": r2(speicher / (p["mwh"] * 1000)) if p["mwh"] > 0 else None, "kwp": kwp,
	}
	return {"positionen": liste, "gruppen": gruppen, "summen": summen, "parameter": p}


def trasse_setzen(parameter, laenge_m, quelle=""):
	p = parameter_voll(parameter)
	alt = trassen_laenge(p)
	l = max(0.0, float(laenge_m or 0))
	if alt > 0:
		abschnitte = [{"art": a["art"], "laengeM": rund((a["laengeM"] / alt) * l * 10) / 10} for a in p["trasse"]["abschnitte"]]
	else:
		abschnitte = [{"art": "graben", "laengeM": l}] if l > 0 else []
	return {**(parameter or {}), "trasse": {**((parameter or {}).get("trasse") or {}), "abschnitte": abschnitte, "querungen": p["trasse"]["querungen"], "quelle": quelle}}


def schnappschuss(e):
	return {
		"summen": {k: e["summen"][k] for k in ("gesamt", "capex", "finanzierungsbedarf", "eurProKwp", "epcProKwp")},
		"gruppen": {k: g["soll"] for k, g in e["gruppen"].items()},
		"positionen": [{k: x.get(k) for k in ("schluessel", "gewerk", "bezeichnung", "art", "menge", "einheit", "ep", "satz", "betrag", "manuell")} for x in e["positionen"]],
	}
