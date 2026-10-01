# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP4 „Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung“ – reine Regeln OHNE Frappe, 1:1 aus
# src/lib/plattform/eg/{ust,abrechnung,belege,ersparnis,zahlung,buchhaltung}.js (Gleichheitstest mit den Vektoren
# src/lib/plattform/eg/testdaten/abrechnung/*.json in tests/test_eg_abrechnung_kern.py und scripts/plattform-test-eg-abrechnung.mjs).
# Quellen und Hinweise stehen in den JS-Dateien. KEINE Rechts- oder Steuerberatung – Fallregeln vor dem Livegang mit
# einer Steuerberatung abstimmen (Fachkonzept 9 Punkt 9).

import math
import re
from datetime import date, timedelta

from oekoinvest_app.plattform import buchhaltung_kern as BK
from oekoinvest_app.plattform.eg_stamm_kern import netzentgelt_regel, preis_fuer, reduzierter_ap
from oekoinvest_app.plattform.finanzen.sepa import bic_pruefen, iban_normalisieren, iban_pruefen, pain001, sepa_id, sepa_text
from oekoinvest_app.plattform.mitglied_kern import _js_round, plus_tage, rund2

ANLAGE_ARTEN = {"pv": "Photovoltaik", "wind": "Wind", "wasser": "Wasserkraft", "biomasse": "Biomasse", "speicher": "Speicher", "verbrauch": "Verbrauchsanlage"}


# ================================================================ Hilfen (JS-Semantik)

def _num(v):
	if v is None or v == "":
		return 0.0
	if isinstance(v, bool):
		return 1.0 if v else 0.0
	try:
		return float(v)
	except (TypeError, ValueError):
		return math.nan


def _n0(v):
	x = _num(v)
	return 0.0 if math.isnan(x) else x


def _js_str(x):
	"""JS String(number) für die hier vorkommenden Werte (ganzzahlig ohne „.0“)."""
	if isinstance(x, bool):
		return "true" if x else "false"
	if isinstance(x, int):
		return str(x)
	x = float(x)
	if x.is_integer():
		return str(int(x))
	r = repr(x)
	return r


def _r3(x):
	return _js_round(_n0(x) * 1000) / 1000


def kwh_text(x):
	return f"{_r3(x):.3f}".replace(".", ",")


def eur_text(x):
	return f"{rund2(x):.2f}".replace(".", ",") + " €"


def _ct_text(x):
	return _js_str(_js_round(_n0(x) * 10000) / 10000).replace(".", ",")


def _tag(v):
	return str(v or "")[:10]


def _zweistellig(n):
	return str(n).zfill(2)


def _monats_ende(j, m):
	if m == 12:
		return date(j, 12, 31).isoformat()
	return (date(j, m + 1, 1) - timedelta(days=1)).isoformat()


def _de1(x):
	"""JS toLocaleString('de-DE') für Werte mit höchstens einer Nachkommastelle."""
	return _js_str(x).replace(".", ",")


# ================================================================ USt (ust.js)

UST_QUELLEN = {
	"ku": "§ 6 Abs. 1 Z 27 UStG 1994 (Kleinunternehmer, ab 01.01.2025)",
	"normal": "§ 10 Abs. 1 UStG 1994 (Normalsteuersatz 20 %)",
	"rc": "§ 19 Abs. 1c UStG 1994 (Strom an Wiederverkäufer); BMF-Anfragebeantwortung 03.11.2023",
	"lw": "§ 22 UStG 1994 (Durchschnittssatz 13 %); EEG-Ratgeber Steuern 2024",
	"gutschrift": "§ 11 Abs. 7 und 8 UStG 1994 (Gutschrift als Rechnung)",
	"nichtSteuerbar": "§§ 1, 2 UStG 1994 (keine unternehmerische Tätigkeit)",
	"beitrag": "VereinsR 2001 Rz 339 ff.; EEG-Ratgeber Steuern 2024 (echter/unechter Mitgliedsbeitrag)",
}
Q = UST_QUELLEN
UST_REGELN = {
	"EG_KU": {"label": "Gemeinschaft Kleinunternehmer", "satz": 0, "art": "befreit", "hinweis": "Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG.", "quelle": Q["ku"]},
	"EG_REGEL": {"label": "Gemeinschaft regelbesteuert", "satz": 20, "art": "ust", "hinweis": "", "quelle": Q["normal"]},
	"ERZ_NICHT_UNTERNEHMERISCH": {"label": "Erzeuger nicht unternehmerisch", "satz": 0, "art": "nicht_steuerbar", "hinweis": "Unentgeltliche Einbringung durch eine Nichtunternehmerin bzw. einen Nichtunternehmer – umsatzsteuerlich nicht relevant.", "quelle": Q["nichtSteuerbar"]},
	"ERZ_KU": {"label": "Erzeuger Kleinunternehmer", "satz": 0, "art": "befreit", "hinweis": "Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG (Gutschrift gem. § 11 Abs. 7 UStG).", "quelle": f"{Q['ku']}; {Q['gutschrift']}"},
	"ERZ_LW": {"label": "Erzeuger pauschalierter Landwirt", "satz": 13, "art": "ust", "hinweis": "Durchschnittssteuersatz für pauschalierte Land- und Forstwirte gem. § 22 UStG (13 %) – Gutschrift gem. § 11 Abs. 7 UStG. Zuordnung der Stromlieferung zum land- und forstwirtschaftlichen Betrieb (zu bestätigen).", "quelle": f"{Q['lw']}; {Q['gutschrift']}"},
	"ERZ_RC": {"label": "Erzeuger regelbesteuert – Reverse Charge", "satz": 0, "art": "rc", "rcSatz": 20, "hinweis": "Übergang der Steuerschuld auf den Leistungsempfänger gem. § 19 Abs. 1c UStG (Gutschrift gem. § 11 Abs. 7 UStG).", "quelle": f"{Q['rc']}; {Q['gutschrift']}"},
	"BEITRAG_ECHT": {"label": "Echter Mitgliedsbeitrag", "satz": 0, "art": "nicht_steuerbar", "hinweis": "Echter Mitgliedsbeitrag – nicht steuerbar (zu bestätigen).", "quelle": Q["beitrag"]},
}


def _schritt(frage, antwort, quelle=""):
	return {"frage": frage, "antwort": antwort, "quelle": quelle}


def ust_fall(art="bezug", gemeinschaft=None, mitglied=None, mitgliedsbeitrag_art="unecht"):
	g = gemeinschaft or {}
	m = mitglied or {}
	eg_regel = g.get("ustStatus") == "regelbesteuert"
	pfad, fehler, warnungen = [], [], []
	pfad.append(_schritt("Umsatzsteuerstatus der Gemeinschaft", "regelbesteuert (Option U 12)" if eg_regel else "Kleinunternehmer", Q["normal"] if eg_regel else Q["ku"]))
	if art == "einspeisung":
		st = m.get("steuerstatusErzeuger") or "kleinunternehmer"
		pfad.append(_schritt("Steuerstatus des Erzeugers", st, "Fachkonzept 3.6 / 4.5"))
		if st == "nicht_unternehmerisch":
			regel = "ERZ_NICHT_UNTERNEHMERISCH"
		elif st == "pauschalierter_landwirt":
			regel = "ERZ_LW"
		elif st in ("regelbesteuert", "gemeinde_bga"):
			regel = "ERZ_RC"
		else:
			regel = "ERZ_KU"
		if regel == "ERZ_RC":
			pfad.append(_schritt("Lieferung von Strom an einen Wiederverkäufer (Gemeinschaft)?", "ja – Steuerschuld geht auf die Gemeinschaft über", Q["rc"]))
			if not m.get("uid"):
				fehler.append("Reverse Charge: UID des Erzeugers fehlt (Pflichtangabe bei Übergang der Steuerschuld).")
			pfad.append(_schritt("UID des Erzeugers", m.get("uid") or "fehlt", "§ 11 Abs. 1a UStG 1994"))
			if not g.get("uid"):
				warnungen.append("Reverse Charge: UID der Gemeinschaft fehlt – beim Finanzamt beantragen (auch als Kleinunternehmer) (zu bestätigen).")
			pfad.append(_schritt("UID der Gemeinschaft", g.get("uid") or "fehlt", "§ 11 Abs. 1a UStG 1994"))
			pfad.append(_schritt("Steuerschuld der Gemeinschaft", "20 % auf das Entgelt – auch als Kleinunternehmer (UVA bzw. Erklärung)", Q["rc"]))
			pfad.append(_schritt("Vorsteuerabzug der Gemeinschaft", "ja (regelbesteuert)" if eg_regel else "nein – die Steuer ist Aufwand der Gemeinschaft", "§ 12 Abs. 1 Z 3 UStG 1994" if eg_regel else Q["ku"]))
			if st == "gemeinde_bga":
				pfad.append(_schritt("Gemeinde mit Betrieb gewerblicher Art", "Reverse Charge wie Unternehmer (zu bestätigen)", "Fachkonzept 9 Punkt 9"))
		elif regel == "ERZ_LW":
			pfad.append(_schritt("Durchschnittssatz", "13 % auf der Gutschrift, kein Reverse Charge", Q["lw"]))
			pfad.append(_schritt("Vorsteuerabzug der Gemeinschaft", "ja (regelbesteuert)" if eg_regel else "nein (Kleinunternehmer)", "§ 12 UStG 1994"))
		elif regel == "ERZ_KU":
			pfad.append(_schritt("Kleinunternehmer-Erzeuger", "Gutschrift ohne USt, kein Reverse Charge", Q["ku"]))
		else:
			pfad.append(_schritt("Unternehmerische Tätigkeit?", "nein – keine Gutschrift mit Entgelt", Q["nichtSteuerbar"]))
		pfad.append(_schritt("Gutschriftverfahren", "Gutschrift gilt als Rechnung, wenn vereinbart und nicht widersprochen", Q["gutschrift"]))
	elif art == "mitgliedsbeitrag" and mitgliedsbeitrag_art == "echt":
		regel = "BEITRAG_ECHT"
		pfad.append(_schritt("Mitgliedsbeitrag", "echt (keine Gegenleistung) – nicht steuerbar (zu bestätigen)", Q["beitrag"]))
	else:
		regel = "EG_REGEL" if eg_regel else "EG_KU"
		if art == "mitgliedsbeitrag":
			pfad.append(_schritt("Mitgliedsbeitrag", "unecht (Leistungsaustausch) – wie die Lieferung", Q["beitrag"]))
		elif art != "bezug":
			pfad.append(_schritt("Gebühr", "unselbständige Nebenleistung zur Stromlieferung – Steuersatz wie die Lieferung", "UStR 2000 Rz 347 (Nebenleistung)"))
		pfad.append(_schritt("Ergebnis", "20 % USt" if eg_regel else "0 % – Hinweis Kleinunternehmer, kein Vorsteuerabzug", Q["normal"] if eg_regel else Q["ku"]))
	r = UST_REGELN[regel]
	return {
		"regel": regel, "label": r["label"], "satz": r["satz"], "art": r["art"], "rcSatz": r.get("rcSatz") or 0, "hinweis": r["hinweis"], "quelle": r["quelle"],
		"steuerschuldEg": regel == "ERZ_RC", "vorsteuerEg": eg_regel and regel in ("ERZ_RC", "ERZ_LW"),
		"pruefpfad": pfad, "fehler": fehler, "warnungen": warnungen,
	}


def ust_summen(positionen):
	gruppen = {}
	reihenfolge = []
	for p in positionen or []:
		u = p["ust"]
		k = f"{u['art']}|{_js_str(u['satz'])}|{u['regel']}"
		if k not in gruppen:
			gruppen[k] = {"art": u["art"], "satz": u["satz"], "rcSatz": u.get("rcSatz") or 0, "regel": u["regel"], "hinweis": u.get("hinweis") or "", "basis": 0.0}
			reihenfolge.append(k)
		gruppen[k]["basis"] += _n0(p.get("netto"))
	zeilen = []
	for k in reihenfolge:
		g = gruppen[k]
		basis = rund2(g["basis"])
		zeilen.append({"art": g["art"], "satz": g["satz"], "regel": g["regel"], "hinweis": g["hinweis"], "basis": basis, "betrag": rund2(basis * g["satz"] / 100) if g["art"] == "ust" else 0, "rcBetrag": rund2(basis * g["rcSatz"] / 100) if g["art"] == "rc" else 0})
	zeilen.sort(key=lambda z: z["regel"])
	netto = rund2(sum(z["basis"] for z in zeilen))
	ust = rund2(sum(z["betrag"] for z in zeilen))
	hinweise = []
	for z in zeilen:
		if z["hinweis"] and z["hinweis"] not in hinweise:
			hinweise.append(z["hinweis"])
	return {"zeilen": zeilen, "netto": netto, "ust": ust, "brutto": rund2(netto + ust), "rcSteuer": rund2(sum(z["rcBetrag"] for z in zeilen)), "hinweise": hinweise}


KU_GRENZE = 55000
KU_TOLERANZ = 60500
KU_WARNUNG_PCT = 80
KU_QUELLE = "https://www.usp.gv.at/aktuelles/newsliste/kleinunternehmerregelung-ab-2025.html"


def ku_monitor(ustStatus="kleinunternehmer", jahr=None, monateErfasst=12, umsatzBrutto=0, vorjahrBrutto=0, rcSteuer=0, vorsteuer=0, umsatzNetto=None):
	bisher = rund2(umsatzBrutto)
	monate = min(12, max(1, _n0(monateErfasst) or 1))
	prognose = rund2(bisher / monate * 12)
	quote = _js_round(bisher / KU_GRENZE * 1000) / 10
	quote_p = _js_round(prognose / KU_GRENZE * 1000) / 10
	status = "ok"
	text = f"Umsatz {jahr}: {_de1(quote)} % der Kleinunternehmergrenze (55.000 € brutto)."
	if ustStatus == "regelbesteuert":
		status = "regelbesteuert"
		text = "Die Gemeinschaft ist regelbesteuert (Option U 12, 5 Jahre bindend) – die Grenze ist nicht maßgeblich."
	elif _n0(vorjahrBrutto) > KU_GRENZE:
		status = "ueberschritten"
		text = "Der Vorjahresumsatz lag über 55.000 € – die Kleinunternehmerbefreiung gilt in diesem Jahr nicht. Steuerberatung einbinden."
	elif bisher > KU_TOLERANZ:
		status = "ueberschritten"
		text = "Umsatz über 60.500 € – ab dem Umsatz, der die Toleranzgrenze überschreitet, entfällt die Befreiung. Rechnungen ab sofort mit 20 % USt (Steuerberatung einbinden)."
	elif bisher > KU_GRENZE:
		status = "toleranz"
		text = "Umsatz über 55.000 €, aber innerhalb der Toleranz bis 60.500 € – die Befreiung gilt bis Jahresende; im Folgejahr entfällt sie."
	elif quote >= KU_WARNUNG_PCT or quote_p >= 100:
		status = "warnung"
		text = f"Frühwarnung: {_de1(quote)} % der Grenze erreicht, hochgerechnet {_de1(quote_p)} %. Tarif und Option U 12 prüfen."
	basis = bisher if umsatzNetto is None else rund2(umsatzNetto)
	ust_option = rund2(basis * 0.2)
	entlastung = rund2(_n0(rcSteuer) + _n0(vorsteuer))
	regel = ustStatus == "regelbesteuert"
	return {
		"status": status, "jahr": jahr, "grenze": KU_GRENZE, "toleranz": KU_TOLERANZ, "umsatzBrutto": bisher, "prognoseBrutto": prognose, "quote": quote, "quotePrognose": quote_p, "text": text, "quelle": KU_QUELLE,
		"option": {
			"rcSteuerNichtAbziehbar": 0 if regel else rund2(rcSteuer), "vorsteuerNichtAbziehbar": 0 if regel else rund2(vorsteuer), "entlastungGemeinschaft": entlastung, "ustAufMitglieder": ust_option,
			"empfehlung": "Option U 12 prüfen: Die abziehbaren Steuern übersteigen die zusätzliche USt auf die Mitglieder." if (not regel and entlastung > ust_option) else "Kleinunternehmerregelung bleibt nach diesen Zahlen günstiger (Mitglieder ohne Vorsteuerabzug zahlen keine USt).",
			"hinweis": "Vergleich ohne Investitions-Vorsteuern und ohne Bindungswirkung (5 Jahre) – keine Steuerberatung.",
		},
	}


# ================================================================ Ersparnis (ersparnis.js)

ELEKTRIZITAETSABGABE = [
	{"gueltigAb": "2026-01-01", "gueltigBis": "2026-12-31", "haushaltCt": 0.1, "sonstCt": 0.82, "status": "zu_bestaetigen", "quelle": "Senkung der Elektrizitätsabgabe 2026 (EY Steuernachrichten) (zu bestätigen)"},
	{"gueltigAb": "2027-01-01", "gueltigBis": "", "haushaltCt": 1.5, "sonstCt": 1.5, "status": "platzhalter", "quelle": "Fachkonzept 9 Punkt 5: Satz 2027 offen (zu bestätigen)"},
]
ERSPARNIS_TEXT = "Ihr Vorteil durch die Energiegemeinschaft (Schätzung, die Abrechnung erfolgt durch Ihren Netzbetreiber)"


def _im_zeitraum(x, d):
	return (not x.get("gueltigAb") or x["gueltigAb"] <= d) and (not x.get("gueltigBis") or x["gueltigBis"] >= d)


def netz_ap_fuer(netzbetreiber, datum, netzebene, ersatz_ct=None):
	d = _tag(datum)
	ne = int(_n0(netzebene) or 7)
	liste = [x for x in (netzbetreiber or {}).get("netzentgeltAp") or [] if int(_n0(x.get("netzebene"))) == ne and str(x.get("gueltigAb") or "") <= d]
	liste.sort(key=lambda x: str(x.get("gueltigAb")), reverse=True)
	if liste:
		t = liste[0]
		return {"ct": float(t["ctKwh"]), "quelle": f"{netzbetreiber.get('kurzname') or netzbetreiber.get('id')}, gültig ab {t['gueltigAb']}"}
	if ersatz_ct is not None and ersatz_ct != "":
		return {"ct": float(ersatz_ct), "quelle": "Annahme der Gemeinschaft (Einstellungen) – bitte mit der Netzrechnung abgleichen"}
	return {"ct": None, "quelle": "Netznutzungs-Arbeitspreis des Netzbetreibers nicht gepflegt"}


def ersparnis_berechnen(eigendeckungKwh=0, datum="", modell="", zonelevel=0, netzebene=7, netzApCt=None, haushalt=True, bezugspreisCt=0, lieferantPreisCt=None, efbApCt=None):
	kwh = _n0(eigendeckungKwh)
	regel = netzentgelt_regel(datum, modell, zonelevel, netzebene)
	quellen = [regel["quelle"]]
	netz_eur = None
	reduziert = None
	if netzApCt is not None:
		reduziert = reduzierter_ap(netzApCt, regel["reduktionPct"])
		netz_eur = rund2(kwh * (float(netzApCt) - reduziert) / 100)
	abgabe_eur = 0
	efb_eur = 0
	abgabe_ct = 0
	if regel["abgabenBefreit"]:
		ea = next((x for x in ELEKTRIZITAETSABGABE if _im_zeitraum(x, _tag(datum))), None)
		abgabe_ct = (ea["haushaltCt"] if haushalt else ea["sonstCt"]) if ea else 0
		abgabe_eur = rund2(kwh * abgabe_ct / 100)
		if ea:
			quellen.append(ea["quelle"])
		if efbApCt is not None:
			efb_eur = rund2(kwh * float(efbApCt) / 100)
	energie_eur = rund2(kwh * (float(lieferantPreisCt) - _n0(bezugspreisCt)) / 100) if lieferantPreisCt is not None else None
	summe = rund2((netz_eur or 0) + abgabe_eur + efb_eur + (energie_eur or 0))
	return {
		"regel": regel["regel"], "reduktionPct": regel["reduktionPct"], "status": regel["status"], "netzApCt": netzApCt, "reduziertCt": reduziert, "netzEur": netz_eur, "abgabenBefreit": regel["abgabenBefreit"], "abgabeCt": abgabe_ct,
		"abgabeEur": abgabe_eur, "efbEur": efb_eur, "energieEur": energie_eur, "summeEur": summe, "text": ERSPARNIS_TEXT, "platzhalter": regel["status"] == "platzhalter", "quellen": quellen,
	}


def erzeugervorteil(eingebrachtKwh=0, einspeisepreisCt=0, marktpreisCt=None):
	if marktpreisCt is None or marktpreisCt == "":
		return None
	return rund2(_n0(eingebrachtKwh) * (_n0(einspeisepreisCt) - _n0(marktpreisCt)) / 100)


def herkunft(mengen):
	je = {}
	for m in mengen or []:
		a = m.get("art") or "pv"
		je[a] = je.get(a, 0) + _n0(m.get("kwh"))
	summe = sum(je.values())
	anteile = [{"art": art, "label": ANLAGE_ARTEN.get(art, art), "kwh": _js_round(kwh * 1000) / 1000, "pct": (_js_round(kwh / summe * 1000) / 10) if summe > 0 else 0} for art, kwh in je.items() if kwh > 0]
	anteile.sort(key=lambda a: -a["kwh"])
	if anteile:
		text = "100 % erneuerbare Energie aus Anlagen der Gemeinschaft: " + ", ".join(f"{a['label']} {_js_str(a['pct']).replace('.', ',')} %" for a in anteile) + "."
	else:
		text = "100 % erneuerbare Energie aus Anlagen der Gemeinschaft (ElWG § 68: gemeinsame Nutzung nur erneuerbarer Energie)."
	return {"anteile": anteile, "summeKwh": _js_round(summe * 1000) / 1000, "text": text, "quelle": "ElWG §§ 66–68 (nur erneuerbare Energie); Stromkennzeichnung im Sinn der Lieferantenpflichten (zu bestätigen)"}


# ================================================================ Belege (belege.js)

BELEG_TYPEN = {
	"rechnung": {"label": "Rechnung", "kreis": "RE", "titel": "Rechnung Gemeinschaftsstrom"},
	"gutschrift": {"label": "Gutschrift", "kreis": "GU", "titel": "Gutschrift Einspeisung in die Gemeinschaft"},
	"storno": {"label": "Stornobeleg", "kreis": "ST", "titel": "Stornobeleg"},
	"schlussrechnung": {"label": "Schlussrechnung", "kreis": "RE", "titel": "Schlussrechnung"},
}
BELEG_OFFEN = ["final", "versendet", "teilbezahlt", "gemahnt"]
KLEINBETRAG_BRUTTO = 400
UID_EMPFAENGER_AB = 10000


def naechste_nummer(zaehler, typ, jahr):
	kreis = (BELEG_TYPEN.get(typ) or BELEG_TYPEN["rechnung"])["kreis"]
	schluessel = f"{kreis}-{jahr}"
	n = int(_n0((zaehler or {}).get(schluessel))) + 1
	return {"nummer": f"{schluessel}-{str(n).zfill(5)}", "schluessel": schluessel, "n": n}


def nummern_vergeben(belege, zaehler, jahr):
	z = dict(zaehler or {})
	sortiert = sorted(belege, key=lambda b: (0 if b.get("typ") == "rechnung" else 1, b.get("mitgliedsnummer") or 0, str(b.get("mitgliedId"))))
	nummern = {}
	for b in sortiert:
		x = naechste_nummer(z, b["typ"], jahr)
		z[x["schluessel"]] = x["n"]
		nummern[b["id"]] = x["nummer"]
	return {"nummern": nummern, "zaehler": z}


def beleg_luecken(belege):
	return BK.nummern_luecken([b["nummer"] for b in belege if b.get("nummer")])


def pflichtangaben_pruefen(b, lieferantenpflichten=False):
	f = []

	def fehlt(feld, text, quelle, stufe="fehler"):
		f.append({"feld": feld, "text": text, "quelle": quelle, "stufe": stufe})

	summen = b.get("summen") or {}
	brutto = abs(_n0(summen.get("brutto")))
	klein = brutto <= KLEINBETRAG_BRUTTO
	a = b.get("aussteller") or {}
	e = b.get("empfaenger") or {}
	if not a.get("name") or not a.get("strasse") or not a.get("plz") or not a.get("ort"):
		fehlt("aussteller", "Name und Anschrift der Gemeinschaft", "§ 11 Abs. 1 Z 3 lit. a UStG")
	if not klein and (not e.get("name") or not e.get("strasse") or not e.get("plz") or not e.get("ort")):
		fehlt("empfaenger", "Name und Anschrift des Mitglieds", "§ 11 Abs. 1 Z 3 lit. b UStG")
	if not b.get("von") or not b.get("bis"):
		fehlt("zeitraum", "Leistungszeitraum", "§ 11 Abs. 1 Z 3 lit. d UStG")
	if not b.get("positionen"):
		fehlt("positionen", "Menge und Art der Lieferung", "§ 11 Abs. 1 Z 3 lit. c UStG")
	if not b.get("nummer") and b.get("status") != "entwurf":
		fehlt("nummer", "fortlaufende Belegnummer", "§ 11 Abs. 1 Z 3 lit. h UStG")
	if not b.get("datum") and b.get("status") != "entwurf":
		fehlt("datum", "Ausstellungsdatum", "§ 11 Abs. 1 Z 3 lit. g UStG")
	arten = {z["art"] for z in summen.get("zeilen") or []}
	if "ust" in arten and not a.get("uid") and not klein:
		fehlt("aussteller.uid", "UID der Gemeinschaft (regelbesteuert)", "§ 11 Abs. 1 Z 3 lit. j UStG")
	if brutto > UID_EMPFAENGER_AB and b.get("typ") == "rechnung" and not e.get("uid") and e.get("unternehmer"):
		fehlt("empfaenger.uid", "UID des Empfängers (über 10.000 € brutto)", "§ 11 Abs. 1 Z 3 lit. i UStG", "warnung")
	if ("befreit" in arten or "rc" in arten) and not summen.get("hinweise"):
		fehlt("hinweis", "Hinweis auf Steuerbefreiung bzw. Übergang der Steuerschuld", "§ 11 Abs. 1a UStG")
	if b.get("typ") == "gutschrift":
		if not b.get("gutschriftZustimmung"):
			fehlt("gutschriftverfahren", "Vereinbarung des Gutschriftverfahrens mit dem Erzeuger (sonst muss der Erzeuger selbst Rechnung legen)", "§ 11 Abs. 7 UStG")
		if "rc" in arten:
			if not e.get("uid"):
				fehlt("empfaenger.uid", "UID des Erzeugers (Reverse Charge)", "§ 11 Abs. 1a UStG")
			if not a.get("uid"):
				fehlt("aussteller.uid", "UID der Gemeinschaft (Reverse Charge) (zu bestätigen)", "§ 11 Abs. 1a UStG", "warnung")
	if lieferantenpflichten and b.get("typ") == "rechnung":
		if not b.get("faelligAm"):
			fehlt("faelligAm", "Fälligkeit", "ElWG § 69 Abs. 1 Z 4")
		if not b.get("zaehlpunkte"):
			fehlt("zaehlpunkte", "Zählpunktbezeichnungen", "ElWG § 69 Abs. 1 Z 4")
		if not a.get("email") and not a.get("telefon"):
			fehlt("aussteller.kontakt", "Kontaktadresse des Vertragspartners", "ElWG § 69 Abs. 1 Z 4")
		if not b.get("energie"):
			fehlt("energie", "Energiewerte", "ElWG § 69 Abs. 1 Z 4")
	return f


def beleg_stornieren(b, nummer, datum, grund):
	if not b or b.get("status") not in ("final", "versendet", "teilbezahlt", "bezahlt", "gemahnt"):
		raise ValueError("Nur freigegebene Belege können storniert werden.")
	grund = str(grund or "").strip()
	if not grund:
		raise ValueError("Bitte einen Grund für das Storno angeben.")

	def neg(x):
		return rund2(-_n0(x))

	s = b.get("summen") or {}
	x = dict(b)
	x.pop("id", None)
	x.update({
		"typ": "storno", "ursprungTyp": b.get("typ"), "nummer": nummer, "datum": datum, "status": "final", "stornoVon": b.get("id"), "stornoVonNummer": b.get("nummer"), "grund": grund[:300],
		"positionen": [{**p, "netto": neg(p.get("netto"))} for p in b.get("positionen") or []],
		"summen": {**s, "zeilen": [{**z, "basis": neg(z.get("basis")), "betrag": neg(z.get("betrag")), "rcBetrag": neg(z.get("rcBetrag"))} for z in s.get("zeilen") or []], "netto": neg(s.get("netto")), "ust": neg(s.get("ust")), "brutto": neg(s.get("brutto")), "rcSteuer": neg(s.get("rcSteuer"))},
		"zahlungen": [], "mahnungen": [],
		"text": f"Storno {'der Gutschrift' if b.get('typ') == 'gutschrift' else 'der Rechnung'} {b.get('nummer')} vom {'.'.join(reversed(str(b.get('datum') or '').split('-')))}. Grund: {grund}",
	})
	return x


def beleg_inhalt(b):
	s = b.get("summen") or {}
	pos = ["|".join([p.get("art") or "", p.get("zaehlpunkt") or "", f"{_n0(p.get('menge')):.3f}", f"{_n0(p.get('preis')):.4f}", f"{_n0(p.get('netto')):.2f}", (p.get("ust") or {}).get("regel") or ""]) for p in b.get("positionen") or []]
	return "\n".join([str(b.get("gemeinschaftId")), str(b.get("typ")), b.get("nummer") or "", b.get("datum") or "", str(b.get("mitgliedId")), str(b.get("von")), str(b.get("bis")), f"{_n0(s.get('netto')):.2f}", f"{_n0(s.get('ust')):.2f}", f"{_n0(s.get('brutto')):.2f}", *pos])


def beleg_gezahlt(b):
	return rund2(sum(_n0(z.get("betrag")) for z in b.get("zahlungen") or []))


def beleg_offen(b):
	if b.get("status") not in BELEG_OFFEN:
		return 0
	return max(0, rund2(abs(_n0((b.get("summen") or {}).get("brutto"))) - beleg_gezahlt(b)))


def status_nach_zahlung(b):
	if b.get("status") == "storniert":
		return "storniert"
	offen = rund2(abs(_n0((b.get("summen") or {}).get("brutto"))) - beleg_gezahlt(b))
	if offen <= 0:
		return "bezahlt"
	return "teilbezahlt" if beleg_gezahlt(b) > 0 else b.get("status")


def beleg_fuer_mitglied(b):
	x = {k: v for k, v in b.items() if k not in ("pruefpfadIntern", "fehler", "warnungen")}
	x["positionen"] = [{k: v for k, v in p.items() if k != "pruefpfad"} for p in b.get("positionen") or []]
	return x


# ================================================================ Abrechnung (abrechnung.js)

PERIODEN_ARTEN = {"monat": "Monat", "quartal": "Quartal", "jahr": "Jahr", "schluss": "Schlussabrechnung"}
PERIODE_STATUS = {
	"offen": {"label": "Offen", "ton": "neutral"}, "vorschau": {"label": "Vorschau berechnet", "ton": "info"}, "freigabe_teilweise": {"label": "1 von 2 Freigaben", "ton": "warn"},
	"freigegeben": {"label": "Freigegeben", "ton": "ok"}, "versendet": {"label": "Versendet", "ton": "ok"}, "abgeschlossen": {"label": "Abgeschlossen", "ton": "neutral"},
	"storniert": {"label": "Storniert", "ton": "neutral"}, "probe": {"label": "Probe-Abrechnung", "ton": "info"},
}
PERIODE_AKTIONEN = {
	"offen": ["vorschau", "verwerfen"], "vorschau": ["vorschau", "freigeben", "verwerfen"], "freigabe_teilweise": ["vorschau", "freigeben"], "freigegeben": ["versenden", "stornieren"],
	"versendet": ["abschliessen", "stornieren"], "abgeschlossen": ["stornieren"], "storniert": [], "probe": ["vorschau", "vergleich", "verwerfen"],
}
EINSTELLUNGEN_STANDARD = {
	"zahlungszielTage": 14, "mitgliedsbeitragArt": "unecht", "beitragMonat": 1, "netzApCt": None, "efbApCt": None, "referenzLieferantCt": None, "referenzEinspeisungCt": None, "aufrechnung": True,
	"gruppen": [], "rabatte": [], "gutschriftverfahren": {}, "toleranzPct": 0.5, "toleranzKwh": 0.1,
}
DATEN_QUELLE = "ElWG § 71 Abs. 1 und 4; HA II 13 (Netzbetreiberwerte maßgeblich, L3 nicht abrechenbar)"
TARIF_GUELTIG = ("beschlossen", "aktiv", "abgeloest")
_DATUM_RE = re.compile(r"^\d\d\d\d-\d\d-\d\d$")


def periode_vorschlag(art, stichtag):
	j, m = (int(x) for x in _tag(stichtag).split("-")[:2])
	if art == "jahr":
		return {"von": f"{j - 1}-01-01", "bis": f"{j - 1}-12-31", "art": art}
	if art == "quartal":
		q = (m - 1) // 3
		vj = j - 1 if q == 0 else j
		vq = 3 if q == 0 else q - 1
		return {"von": f"{vj}-{_zweistellig(vq * 3 + 1)}-01", "bis": _monats_ende(vj, vq * 3 + 3), "art": art}
	vj = j - 1 if m == 1 else j
	vm = 12 if m == 1 else m - 1
	return {"von": f"{vj}-{_zweistellig(vm)}-01", "bis": _monats_ende(vj, vm), "art": "monat"}


def abrechnung_fruehestens(bis):
	j, m = (int(x) for x in _tag(bis).split("-")[:2])
	return f"{j + 1}-01-20" if m == 12 else f"{j}-{_zweistellig(m + 1)}-20"


def monate_im_zeitraum(von, bis):
	if not von or not bis or bis < von:
		return 0
	j1, m1 = (int(x) for x in _tag(von).split("-")[:2])
	j2, m2 = (int(x) for x in _tag(bis).split("-")[:2])
	return (j2 - j1) * 12 + (m2 - m1) + 1


def periode_bereinigen(d, heute=None, vorhandene=None):
	d = d or {}
	v, b = _tag(d.get("von")), _tag(d.get("bis"))
	art = d.get("art") or "monat"
	probe = bool(d.get("probe"))
	if not _DATUM_RE.match(v) or not _DATUM_RE.match(b):
		raise ValueError("Bitte Beginn und Ende der Periode angeben.")
	if b < v:
		raise ValueError("Das Ende liegt vor dem Beginn.")
	if art not in PERIODEN_ARTEN:
		raise ValueError("Unbekannte Periodenart.")
	if monate_im_zeitraum(v, b) > 12:
		raise ValueError("Eine Periode umfasst höchstens 12 Monate.")
	if heute and b >= _tag(heute):
		raise ValueError("Abgerechnet werden nur abgeschlossene Zeiträume (Ende vor heute).")
	if not probe:
		for p in vorhandene or []:
			if not p.get("probe") and p.get("status") != "storniert" and p.get("art") == art and p["von"] <= b and p["bis"] >= v:
				raise ValueError(f"Es gibt bereits eine Periode ({p['von']} bis {p['bis']}) dieser Art im Zeitraum.")
	hinweise = []
	if heute and _tag(heute) < abrechnung_fruehestens(b):
		hinweise.append(f"Die Netzbetreiber-Werte sind erst nach dem Clearing endgültig – Abrechnung frühestens ab {'.'.join(reversed(abrechnung_fruehestens(b).split('-')))} empfohlen (Koordinationsstelle, Schritt 7).")
	return {"von": v, "bis": b, "art": art, "probe": probe, "hinweise": hinweise}


def tarif_fuer_tag(tarife, d):
	t = _tag(d)
	liste = [x for x in tarife or [] if x.get("status") in TARIF_GUELTIG and x["gueltigAb"] <= t and (not x.get("gueltigBis") or x["gueltigBis"] >= t)]
	liste.sort(key=lambda x: x["gueltigAb"], reverse=True)
	return liste[0] if liste else None


def tarif_segmente(tarife, von, bis):
	grenzen = set()
	for x in tarife or []:
		if x.get("status") not in TARIF_GUELTIG:
			continue
		for d in (x.get("gueltigAb"), plus_tage(x["gueltigBis"], 1) if x.get("gueltigBis") else ""):
			if d and von < d <= bis:
				grenzen.add(d)
	starts = [von, *sorted(grenzen)]
	aus = []
	for i, s in enumerate(starts):
		e = plus_tage(starts[i + 1], -1) if i + 1 < len(starts) else bis
		t = tarif_fuer_tag(tarife, s)
		aus.append({"von": s, "bis": e, "tarifId": t["id"] if t else None})
	return aus


def zeitfenster_aufteilen(reihen, tarif, mitglied_id=""):
	aus = {}
	for q in reihen or []:
		zf = preis_fuer(tarif, q["lokal"], mitglied_id).get("zeitfenster") or ""
		z = aus.setdefault(zf, {})
		for g, w in (q.get("groessen") or {}).items():
			z[g] = z.get(g, 0) + _n0(w)
	return aus


def gruppe_von(mitglied, gruppen):
	for g in gruppen or []:
		if mitglied.get("id") in (g.get("mitgliedIds") or []):
			return g
	for g in gruppen or []:
		if mitglied.get("art") in (g.get("mitgliedArten") or []):
			return g
	return None


def preis_ermitteln(tarif, mitglied, gruppen=None, zeitfenster_id="", richtung="verbrauch"):
	tarif = tarif or {}
	feld = "einspeisepreisCt" if richtung == "erzeugung" else "bezugspreisCt"
	ind = next((x for x in tarif.get("individuell") or [] if x.get("mitgliedId") == mitglied.get("id")), None)
	grp = gruppe_von(mitglied, gruppen)
	zf = next((z for z in tarif.get("zeitfenster") or [] if z.get("id") == zeitfenster_id), None)
	kandidaten = [
		((ind or {}).get(feld), f"individueller Preis ({(ind or {}).get('grund') or 'dokumentierter Grund'})"),
		((grp or {}).get(feld), f"Tarifgruppe „{(grp or {}).get('label') or ''}“"),
		((zf or {}).get(feld), f"Zeitfenster „{(zf or {}).get('label') or ''}“"),
		(tarif.get(feld), f"Grundpreis {tarif.get('bezeichnung') or ''}".strip()),
	]
	preis, h = next(((p, t) for p, t in kandidaten if p is not None), (0, "kein Preis"))
	p = float(preis)
	sozial = (tarif.get("sozialtarif") or {}).get("bezugspreisCt")
	if richtung == "verbrauch" and mitglied.get("schutzbeduerftig") and sozial is not None and float(sozial) < p:
		p = float(sozial)
		h = "Sozialtarif für schutzbedürftige Haushalte (ElWG § 68 Abs. 6)"
	return {"preisCt": p, "herkunft": h}


def rhythmus_von(mitglied, gemeinschaft, lieferantenpflichten):
	return (lieferantenpflichten and mitglied.get("abrechnungsrhythmus")) or gemeinschaft.get("abrechnungsrhythmus") or "monat"


def _ueberlappt(a_von, a_bis, b_von, b_bis):
	return (not a_von or a_von <= b_bis) and (not a_bis or a_bis >= b_von)


def _zf_label(tarif, zf_id):
	z = next((x for x in tarif.get("zeitfenster") or [] if x.get("id") == zf_id), None)
	return (z or {}).get("label") or ""


def abrechnung_berechnen(gemeinschaft, periode, mitglieder=None, zaehlpunkte=None, teilnahmen=None, tarife=None, anlagen=None, netzbetreiber=None, werte=None, einstellungen=None, verrechnet=None, lieferantenpflichten=False, heute=""):
	g = gemeinschaft
	mitglieder, zaehlpunkte, teilnahmen, tarife = mitglieder or [], zaehlpunkte or [], teilnahmen or [], tarife or []
	anlagen, netzbetreiber, werte, verrechnet = anlagen or [], netzbetreiber or [], werte or [], verrechnet or {}
	ein = {**EINSTELLUNGEN_STANDARD, **(einstellungen or {})}
	fehler, warnungen, hinweise = [], [], []
	zp_von = {z["id"]: z for z in zaehlpunkte}
	tn_von = {t["id"]: t for t in teilnahmen}
	tarif_von = {t["id"]: t for t in tarife}
	anlage_von = {a["id"]: a for a in anlagen}
	nb_von = {n["id"]: n for n in netzbetreiber}
	beitritt = set(verrechnet.get("beitritt") or [])
	beitrag = set(verrechnet.get("beitrag") or [])
	jahr = int(periode["bis"][:4])
	sa = g.get("sitzAdresse") or {}
	aussteller = {
		"name": g.get("name"), "strasse": sa.get("strasse") or "", "plz": sa.get("plz") or "", "ort": sa.get("ort") or "", "email": g.get("email") or "", "telefon": g.get("telefon") or "",
		"uid": g.get("uid") or "", "zvr": g.get("zvrZahl") or "", "fn": g.get("firmenbuchnummer") or "", "iban": g.get("iban") or "", "bic": g.get("bic") or "", "creditorId": g.get("creditorId") or "",
		"gemeinschaftsId": g.get("gemeinschaftsId") or "", "ustStatus": g.get("ustStatus") or "kleinunternehmer",
	}
	je_tn = {}
	je_tn_reihe = []
	summe_ed = summe_g = summe_erz = summe_rest = summe_verbrauch = 0.0
	nicht_abrechenbar = 0
	herkunft_mengen = []
	for w in werte:
		t = tn_von.get(w.get("teilnahmeId"))
		if not t or t.get("gemeinschaftId") != g["id"]:
			continue
		z = zp_von.get(t.get("zaehlpunktId"))
		if not z:
			continue
		gr = w.get("groessen") or {}
		if z["richtung"] == "verbrauch":
			summe_ed += _n0(gr.get("eigendeckung"))
			summe_verbrauch += _n0(gr.get("verbrauch_gemessen"))
		else:
			eingebracht = max(0, _n0(gr.get("erzeugung_tf")) - _n0(gr.get("restueberschuss")))
			summe_g += eingebracht
			summe_erz += _n0(gr.get("erzeugung_tf"))
			summe_rest += _n0(gr.get("restueberschuss"))
			herkunft_mengen.append({"art": (anlage_von.get(z.get("anlageId")) or {}).get("art") or "pv", "kwh": eingebracht})
		if w.get("vollstaendig") is False or _n0(w.get("anteilL3")) > 0:
			nicht_abrechenbar += 1
			was = "Daten unvollständig" if w.get("vollstaendig") is False else f"{_js_str(_js_round(_n0(w.get('anteilL3')) * 1000) / 10)} % L3-Werte"
			fehler.append({"code": "daten", "mitgliedId": t.get("mitgliedId"), "text": f"Zählpunkt {z['zaehlpunktnummer']} ({w['von']} bis {w['bis']}): {was} – nicht abrechenbar, Nachforderung (CR_REQ_PT) auslösen.", "quelle": DATEN_QUELLE})
		if t["id"] not in je_tn:
			je_tn[t["id"]] = []
			je_tn_reihe.append(t["id"])
		je_tn[t["id"]].append(w)
	herk = herkunft(herkunft_mengen)

	belege, ausgeschlossen = [], []
	for m in sorted([x for x in mitglieder if x.get("gemeinschaftId") == g["id"]], key=lambda x: x.get("mitgliedsnummer") or 0):
		tns = [t for t in teilnahmen if t.get("mitgliedId") == m["id"] and t.get("gemeinschaftId") == g["id"] and t["id"] in je_tn]
		aktiv = _ueberlappt(m.get("beitrittAm") or "", m.get("austrittZum") or "", periode["von"], periode["bis"]) and m.get("status") not in ("interessent", "antrag", "geprueft", "abgelehnt")
		if not tns and not aktiv:
			continue
		r = rhythmus_von(m, g, lieferantenpflichten)
		if periode["art"] != "schluss" and r != periode["art"]:
			ausgeschlossen.append({"mitgliedId": m["id"], "grund": f"Abrechnungsrhythmus „{r}“ – wird in der entsprechenden Periode abgerechnet."})
			continue
		p_ = m.get("person") or {}
		name = p_.get("firma") or " ".join(x for x in (p_.get("vorname"), p_.get("nachname")) if x)
		empfaenger = {"name": name, "strasse": p_.get("strasse") or "", "plz": p_.get("plz") or "", "ort": p_.get("ort") or "", "email": p_.get("email") or "", "uid": m.get("uid") or "", "unternehmer": m.get("art") in ("kmu", "grossunternehmen", "landwirt") or bool(m.get("uid"))}
		datum_v = _tag(heute)
		basis = {
			"datum": datum_v, "faelligAm": plus_tage(datum_v, int(_n0(ein["zahlungszielTage"]) or 14)) if datum_v else "", "lieferantenpflichten": bool(lieferantenpflichten), "gemeinschaftId": g["id"], "periodeId": periode.get("id"),
			"mitgliedId": m["id"], "mitgliedsnummer": m.get("mitgliedsnummer"), "kontoId": m.get("kontoId") or None, "von": periode["von"], "bis": periode["bis"], "aussteller": aussteller, "empfaenger": empfaenger, "status": "entwurf", "herkunft": herk,
		}
		rech, gut, zps = [], [], []
		en_r = {"verbrauchGemessen": 0.0, "eigendeckung": 0.0}
		en_g = {"erzeugungTf": 0.0, "restueberschuss": 0.0, "eingebracht": 0.0}
		es_s = {"netzEur": 0.0, "abgabeEur": 0.0, "efbEur": 0.0, "energieEur": 0.0, "summeEur": 0.0, "netzBekannt": False, "energieBekannt": False, "platzhalter": False, "quellen": [], "reduktionPct": 0}
		fehler_r, fehler_g, beleg_warn = [], [], []
		for t in tns:
			z = zp_von[t["zaehlpunktId"]]
			zps.append({"nummer": z["zaehlpunktnummer"], "richtung": z["richtung"], "bezeichnung": z.get("bezeichnung") or "", "teilnahmefaktor": t.get("teilnahmefaktor")})
			for w in sorted(je_tn[t["id"]], key=lambda x: x["von"]):
				tarif = tarif_fuer_tag(tarife, w["von"]) or tarif_von.get(w.get("tarifId"))
				beleg_fehler = fehler_g if z["richtung"] == "erzeugung" else fehler_r
				if not tarif:
					beleg_fehler.append(f"Kein gültiger Tarif am {w['von']} – bitte Preisblatt beschließen.")
					continue
				gr = w.get("groessen") or {}
				richtung = z["richtung"]
				feld = "einspeisepreisCt" if richtung == "erzeugung" else "bezugspreisCt"
				tou = any(x.get(feld) is not None for x in tarif.get("zeitfenster") or [])
				if tou and w.get("jeZeitfenster"):
					teile = sorted(w["jeZeitfenster"].items(), key=lambda kv: kv[0])
				else:
					if tou:
						beleg_fehler.append(f"Tarif mit Zeitfenstern, aber keine Aufteilung der Werte je Zeitfenster für Zählpunkt {z['zaehlpunktnummer']} ({w['von']} bis {w['bis']}).")
					teile = [("", gr)]
				if richtung == "verbrauch":
					en_r["verbrauchGemessen"] += _n0(gr.get("verbrauch_gemessen"))
					en_r["eigendeckung"] += _n0(gr.get("eigendeckung"))
					netto_energie = 0.0
					for zf_id, wz in teile:
						kwh = _n0(wz.get("eigendeckung"))
						if kwh <= 0:
							continue
						pr = preis_ermitteln(tarif, m, ein["gruppen"], zf_id, richtung)
						u = ust_fall("bezug", g, m)
						netto = rund2(kwh * pr["preisCt"] / 100)
						netto_energie += netto
						lab = _zf_label(tarif, zf_id)
						rech.append({
							"art": "bezug", "text": f"Gemeinschaftsstrom (Eigendeckung){' – ' + lab if lab else ''}", "zaehlpunkt": z["zaehlpunktnummer"], "von": w["von"], "bis": w["bis"], "menge": _r3(kwh), "mengeRoh": kwh, "einheit": "kWh",
							"preis": pr["preisCt"], "preisEinheit": "ct/kWh", "netto": netto, "zeitfenster": zf_id, "preisHerkunft": pr["herkunft"], "ust": u,
							"pruefpfad": [_schritt("Menge", f"{kwh_text(kwh)} kWh Eigendeckung laut Netzbetreiber (Teilnahmefaktor {_js_str(t.get('teilnahmefaktor'))} %)", DATEN_QUELLE), _schritt("Preis", f"{_ct_text(pr['preisCt'])} ct/kWh – {pr['herkunft']}", "Tarif der Gemeinschaft (Fachkonzept 3.10)"), *u["pruefpfad"]],
						})
					kwh = _n0(gr.get("eigendeckung"))
					if kwh > 0:
						nb = nb_von.get(z.get("netzbetreiberId"))
						ap = netz_ap_fuer(nb, w["bis"], z.get("netzebene") or 7, ein["netzApCt"])
						es = ersparnis_berechnen(kwh, w["bis"], g.get("modell"), g.get("zonelevel"), z.get("netzebene") or 7, ap["ct"], m.get("art") == "privat", (netto_energie * 100 / kwh) if kwh > 0 else 0, ein["referenzLieferantCt"], ein["efbApCt"])
						if es["netzEur"] is not None:
							es_s["netzEur"] += es["netzEur"]
							es_s["netzBekannt"] = True
						es_s["abgabeEur"] += es["abgabeEur"]
						es_s["efbEur"] += es["efbEur"]
						if es["energieEur"] is not None:
							es_s["energieEur"] += es["energieEur"]
							es_s["energieBekannt"] = True
						es_s["summeEur"] += es["summeEur"]
						es_s["platzhalter"] = es_s["platzhalter"] or es["platzhalter"]
						es_s["reduktionPct"] = es["reduktionPct"]
						for q_ in [*es["quellen"], ap["quelle"]]:
							if q_ not in es_s["quellen"]:
								es_s["quellen"].append(q_)
				else:
					tf = _n0(gr.get("erzeugung_tf"))
					rest = _n0(gr.get("restueberschuss"))
					en_g["erzeugungTf"] += tf
					en_g["restueberschuss"] += rest
					en_g["eingebracht"] += max(0, tf - rest)
					for zf_id, wz in teile:
						kwh = max(0, _n0(wz.get("erzeugung_tf")) - _n0(wz.get("restueberschuss")))
						if kwh <= 0:
							continue
						pr = preis_ermitteln(tarif, m, ein["gruppen"], zf_id, richtung)
						u = ust_fall("einspeisung", g, m)
						nu = u["regel"] == "ERZ_NICHT_UNTERNEHMERISCH"
						netto = 0 if nu else rund2(kwh * pr["preisCt"] / 100)
						lab = _zf_label(tarif, zf_id)
						gut.append({
							"art": "einspeisung", "text": f"In die Gemeinschaft eingebrachter Strom{' – ' + lab if lab else ''}", "zaehlpunkt": z["zaehlpunktnummer"], "von": w["von"], "bis": w["bis"], "menge": _r3(kwh), "mengeRoh": kwh, "einheit": "kWh",
							"preis": 0 if nu else pr["preisCt"], "preisEinheit": "ct/kWh", "netto": netto, "zeitfenster": zf_id, "preisHerkunft": pr["herkunft"], "ust": u,
							"pruefpfad": [_schritt("Menge", f"{kwh_text(kwh)} kWh = Erzeugung × Teilnahmefaktor − Restüberschuss (Teilnahmefaktor {_js_str(t.get('teilnahmefaktor'))} %)", "Fachkonzept 4.5; HA II 13"), _schritt("Preis", f"{_ct_text(pr['preisCt'])} ct/kWh – {pr['herkunft']}", "Tarif der Gemeinschaft (Fachkonzept 3.10)"), *u["pruefpfad"]],
						})
						for f_ in u["fehler"]:
							if f_ not in fehler_g:
								fehler_g.append(f_)
						for x_ in u["warnungen"]:
							if x_ not in beleg_warn:
								beleg_warn.append(x_)

		tarif_ende = tarif_fuer_tag(tarife, periode["bis"])
		von_m = m["beitrittAm"] if m.get("beitrittAm") and m["beitrittAm"] > periode["von"] else periode["von"]
		bis_m = m["austrittZum"] if m.get("austrittZum") and m["austrittZum"] < periode["bis"] else periode["bis"]
		monate = monate_im_zeitraum(von_m, bis_m) if aktiv else 0
		if tarif_ende and monate > 0:
			def geb(art, text, menge, einheit, preis, extra=None):
				if not (preis > 0) or not (menge > 0):
					return
				u = ust_fall("mitgliedsbeitrag" if art == "mitgliedsbeitrag" else "gebuehr", g, m, ein["mitgliedsbeitragArt"])
				pos = {
					"art": art, "text": text, "zaehlpunkt": "", "von": periode["von"], "bis": periode["bis"], "menge": menge, "einheit": einheit, "preis": preis, "preisEinheit": "€", "netto": rund2(menge * preis),
					"zeitfenster": "", "preisHerkunft": f"{tarif_ende.get('bezeichnung')}", "ust": u, "pruefpfad": [_schritt("Grundlage", text, "Tarif der Gemeinschaft (Fachkonzept 3.10, 4.5)"), *u["pruefpfad"]],
				}
				pos.update(extra or {})
				rech.append(pos)

			mon_t = "Monat" if monate == 1 else "Monate"
			geb("grundgebuehr", f"Grundgebühr ({monate} {mon_t})", monate, "Monat", _n0(tarif_ende.get("grundgebuehrMonat")))
			zp_anzahl = len(tns)
			geb("zp_gebuehr", f"Zählpunktgebühr ({zp_anzahl} {'Zählpunkt' if zp_anzahl == 1 else 'Zählpunkte'} × {monate} {mon_t})", zp_anzahl * monate, "ZP-Monat", _n0(tarif_ende.get("zaehlpunktgebuehrMonat")))
			ba = m.get("beitrittAm") or ""
			if ba and periode["von"] <= ba <= periode["bis"] and m["id"] not in beitritt:
				geb("beitrittsgebuehr", "Einmalige Beitrittsgebühr", 1, "Stk", _n0(tarif_ende.get("einmalgebuehrBeitritt")), {"verrechnet": f"beitritt:{m['id']}"})
			faellig = f"{jahr}-{_zweistellig(int(ein.get('beitragMonat') or 1))}-01"
			beitrag_hier = (periode["von"] <= faellig <= periode["bis"] and (not ba or ba <= periode["bis"])) or (ba and periode["von"] <= ba <= periode["bis"] and ba > faellig)
			if beitrag_hier and f"{m['id']}:{jahr}" not in beitrag:
				geb("mitgliedsbeitrag", f"Mitgliedsbeitrag {jahr} ({'echter Beitrag' if ein['mitgliedsbeitragArt'] == 'echt' else 'Leistungsentgelt'})", 1, "Jahr", _n0(tarif_ende.get("mitgliedsbeitragJahr")), {"verrechnet": f"beitrag:{m['id']}:{jahr}"})

		for rb in ein.get("rabatte") or []:
			passt = (not rb.get("mitgliedIds") or m["id"] in rb["mitgliedIds"]) and (not rb.get("mitgliedArten") or m.get("art") in rb["mitgliedArten"]) and (not rb.get("gruppe") or (gruppe_von(m, ein["gruppen"]) or {}).get("id") == rb["gruppe"]) and _ueberlappt(rb.get("gueltigAb") or "", rb.get("gueltigBis") or "", periode["von"], periode["bis"])
			if not passt:
				continue
			bezug = rb.get("bezug") or "energie"
			if bezug == "alles":
				basis_netto = rund2(sum(p["netto"] for p in rech if p["art"] != "rabatt"))
			elif bezug == "energie":
				basis_netto = rund2(sum(p["netto"] for p in rech if p["art"] == "bezug"))
			else:
				basis_netto = rund2(sum(p["netto"] for p in rech if p["art"] not in ("bezug", "rabatt")))
			if basis_netto <= 0:
				continue
			betrag = rund2(basis_netto * _n0(rb.get("wert")) / 100) if rb.get("art") == "pct" else min(rund2(_n0(rb.get("wert"))), basis_netto)
			if not (betrag > 0):
				continue
			u = ust_fall("gebuehr", g, m)
			label = rb.get("label") or "Rabatt"
			rech.append({
				"art": "rabatt", "text": f"{label}{' (' + _js_str(rb.get('wert')).replace('.', ',') + ' %)' if rb.get('art') == 'pct' else ''}", "zaehlpunkt": "", "von": periode["von"], "bis": periode["bis"], "menge": 1, "einheit": "Stk",
				"preis": -betrag, "preisEinheit": "€", "netto": -betrag, "zeitfenster": "", "preisHerkunft": "Rabatt laut Beschluss", "ust": u,
				"pruefpfad": [_schritt("Rabatt", f"{label} auf {eur_text(basis_netto)}", rb.get("beschluss") or "Einstellungen der Gemeinschaft"), *u["pruefpfad"]],
			})

		def nr(liste):
			return [{"nr": i + 1, **p} for i, p in enumerate(liste)]

		if rech:
			summen = ust_summen(rech)
			ed = en_r["eigendeckung"]
			hat_verbrauch = any(x["richtung"] == "verbrauch" for x in zps)
			sep = m.get("sepaMandat") or {}
			b = {
				**basis, "typ": "rechnung", "positionen": nr(rech), "summen": summen, "zaehlpunkte": [x for x in zps if x["richtung"] == "verbrauch"] if hat_verbrauch else zps,
				"energie": {"verbrauchGemessen": _r3(en_r["verbrauchGemessen"]), "eigendeckung": _r3(ed), "quoteEigendeckung": (_js_round(ed / en_r["verbrauchGemessen"] * 1000) / 10) if en_r["verbrauchGemessen"] > 0 else None},
				"ersparnis": ({
					"netzEur": rund2(es_s["netzEur"]) if es_s["netzBekannt"] else None, "abgabeEur": rund2(es_s["abgabeEur"]), "efbEur": rund2(es_s["efbEur"]), "energieEur": rund2(es_s["energieEur"]) if es_s["energieBekannt"] else None,
					"summeEur": rund2(es_s["summeEur"]), "reduktionPct": es_s["reduktionPct"], "platzhalter": es_s["platzhalter"], "quellen": es_s["quellen"], "text": ERSPARNIS_TEXT,
				} if ed > 0 else None),
				"zahlweg": {"art": "lastschrift", "mandatRef": sep.get("referenz"), "mandatDatum": sep.get("datum"), "creditorId": g.get("creditorId"), "iban": m.get("iban")} if (sep.get("status") == "aktiv" and m.get("iban") and g.get("creditorId")) else {"art": "ueberweisung", "iban": g.get("iban") or "", "bic": g.get("bic") or ""},
				"verrechnet": [p["verrechnet"] for p in rech if p.get("verrechnet")],
				"fehler": list(fehler_r), "warnungen": [],
			}
			if summen["netto"] < 0:
				b["warnungen"].append("Negativer Rechnungsbetrag (Rabatt über Entgelt) – bitte prüfen.")
			belege.append(b)
		if gut:
			unternehmerisch = any(p["ust"]["regel"] != "ERZ_NICHT_UNTERNEHMERISCH" for p in gut)
			if not unternehmerisch:
				hinweise.append(f"{name}: Einbringung ohne Entgelt (nicht unternehmerisch) – {kwh_text(en_g['eingebracht'])} kWh, keine Gutschrift (nur Mengenbestätigung in der Jahresbescheinigung).")
			else:
				gv = (ein.get("gutschriftverfahren") or {}).get(m["id"])
				zustimmung = bool(gv and gv.get("zugestimmtAm") and not gv.get("widersprochenAm")) or any(v.get("art") in ("einspeisung", "gutschriftverfahren") for v in m.get("vertraege") or [])
				summen = ust_summen(gut)
				b = {
					**basis, "typ": "gutschrift", "positionen": nr(gut), "summen": summen, "zaehlpunkte": [x for x in zps if x["richtung"] == "erzeugung"],
					"energie": {"erzeugungTf": _r3(en_g["erzeugungTf"]), "restueberschuss": _r3(en_g["restueberschuss"]), "eingebracht": _r3(en_g["eingebracht"])},
					"erzeugervorteilEur": erzeugervorteil(en_g["eingebracht"], (summen["netto"] * 100 / en_g["eingebracht"]) if en_g["eingebracht"] > 0 else 0, ein["referenzEinspeisungCt"]),
					"gutschriftZustimmung": zustimmung, "zahlweg": {"art": "gutschrift_ueberweisung", "iban": m.get("iban") or ""}, "fehler": list(fehler_g), "warnungen": list(beleg_warn),
				}
				if not m.get("iban"):
					b["warnungen"].append("IBAN des Erzeugers fehlt – Auszahlung manuell.")
				belege.append(b)
		if not rech:
			for f_ in fehler_r:
				fehler.append({"code": "tarif", "mitgliedId": m["id"], "text": f"{name}: {f_}"})
		if not gut:
			for f_ in fehler_g:
				fehler.append({"code": "tarif", "mitgliedId": m["id"], "text": f"{name}: {f_}"})

	for b in belege:
		for p in pflichtangaben_pruefen(b, lieferantenpflichten):
			(b["fehler"] if p["stufe"] == "fehler" else b["warnungen"]).append(f"{p['text']} fehlt ({p['quelle']}).")
		eindeutig = []
		for f_ in b["fehler"]:
			if f_ not in eindeutig:
				eindeutig.append(f_)
		b["fehler"] = eindeutig
		for f_ in b["fehler"]:
			fehler.append({"code": "beleg", "mitgliedId": b["mitgliedId"], "typ": b["typ"], "text": f"{b['empfaenger']['name']} ({'Gutschrift' if b['typ'] == 'gutschrift' else 'Rechnung'}): {f_}"})
		for x_ in b["warnungen"]:
			warnungen.append({"code": "beleg", "mitgliedId": b["mitgliedId"], "typ": b["typ"], "text": f"{b['empfaenger']['name']}: {x_}"})

	differenz = _r3(summe_ed - summe_g)
	toleranz = max(_n0(ein["toleranzKwh"]) * max(1, len(werte)), summe_ed * _n0(ein["toleranzPct"]) / 100)
	kontrolle = {"eigendeckung": _r3(summe_ed), "eingebracht": _r3(summe_g), "differenz": differenz, "toleranz": _r3(toleranz), "ok": abs(differenz) <= toleranz}
	if not kontrolle["ok"] and werte:
		warnungen.append({"code": "kontrolle", "text": f"Summe Eigendeckung ({kwh_text(summe_ed)} kWh) weicht von der eingebrachten Erzeugung ({kwh_text(summe_g)} kWh) um {kwh_text(differenz)} kWh ab – Abweichungsbericht (WP3) prüfen."})
	if not werte:
		fehler.append({"code": "daten", "text": "Für die Periode liegen keine Energiedaten des Netzbetreibers vor."})
	rechnungen = [b for b in belege if b["typ"] == "rechnung"]
	gutschriften = [b for b in belege if b["typ"] == "gutschrift"]
	netto_bezug = rund2(sum(sum(p["netto"] for p in b["positionen"] if p["art"] == "bezug") for b in rechnungen))
	netto_einsp = rund2(sum(b["summen"]["netto"] for b in gutschriften))
	if g.get("modell") in ("eeg", "beg") and netto_bezug > 0 and netto_bezug - netto_einsp > netto_bezug * 0.25:
		hinweise.append(f"Die Energiemarge beträgt {eur_text(netto_bezug - netto_einsp)} ({_js_round((netto_bezug - netto_einsp) / netto_bezug * 100)} % des Bezugs). Hauptzweck der Gemeinschaft ist nicht finanzieller Gewinn (EAG § 79 Abs. 1; ElWG § 67 Abs. 2) – Preissenkung oder Rückvergütung prüfen.")
	if lieferantenpflichten:
		hinweise.append("Lieferantenpflichten nach § 69 ElWG: Rechnungsinhalt nach § 69 Abs. 1 Z 4–6, Wahl Monats-/Jahresrechnung je Mitglied, Erläuterung auf Verlangen kostenlos.")
	kennzahlen = {
		"mitglieder": len({b["mitgliedId"] for b in belege}), "rechnungen": len(rechnungen), "gutschriften": len(gutschriften),
		"verbrauch": _r3(summe_verbrauch), "eigendeckung": _r3(summe_ed), "erzeugungTf": _r3(summe_erz), "eingebracht": _r3(summe_g), "restueberschuss": _r3(summe_rest),
		"quoteEigendeckung": (_js_round(summe_ed / summe_verbrauch * 1000) / 10) if summe_verbrauch > 0 else None,
		"nettoRechnungen": rund2(sum(b["summen"]["netto"] for b in rechnungen)), "bruttoRechnungen": rund2(sum(b["summen"]["brutto"] for b in rechnungen)),
		"nettoGutschriften": netto_einsp, "bruttoGutschriften": rund2(sum(b["summen"]["brutto"] for b in gutschriften)),
		"ust": rund2(sum(b["summen"]["ust"] for b in belege)), "rcSteuer": rund2(sum(b["summen"]["rcSteuer"] for b in gutschriften)),
		"deckungsbeitrag": rund2(netto_bezug - netto_einsp), "nichtAbrechenbar": nicht_abrechenbar, "ersparnisSumme": rund2(sum((b.get("ersparnis") or {}).get("summeEur") or 0 for b in rechnungen)),
	}
	return {"belege": belege, "kennzahlen": kennzahlen, "kontrolle": kontrolle, "pruefung": {"fehler": fehler, "warnungen": warnungen, "hinweise": hinweise}, "ausgeschlossen": ausgeschlossen, "herkunft": herk, "heute": _tag(heute)}


def faelligkeit(datum, tage=14):
	return plus_tage(_tag(datum), int(_n0(tage)) or 14)


def vorschau_fingerabdruck(belege):
	teile = [":".join([str(b["mitgliedId"]), b["typ"], f"{rund2(b['summen']['netto']):.2f}", f"{rund2(b['summen']['brutto']):.2f}", str(len(b["positionen"]))]) for b in belege or []]
	return "|".join(sorted(teile))


def freigabe_pruefen(periode, stufen=None, konto_id="", fingerabdruck="", blockierende_fehler=0):
	stufen = stufen or {}

	def nein(grund):
		return {"ok": False, "grund": grund, "auge": None, "vollstaendig": False}

	if periode.get("probe"):
		return nein("Eine Probe-Abrechnung kann nicht freigegeben werden.")
	if periode.get("status") not in ("vorschau", "freigabe_teilweise"):
		return nein("Freigeben lässt sich nur eine berechnete Vorschau.")
	if blockierende_fehler > 0:
		return nein(f"Die Vorschau enthält {blockierende_fehler} blockierende {'Prüfung' if blockierende_fehler == 1 else 'Prüfungen'} – bitte zuerst klären.")
	if not fingerabdruck or periode.get("fingerabdruck") != fingerabdruck:
		return nein("Die Zahlen haben sich seit der Vorschau geändert – bitte Vorschau neu berechnen.")
	fg = [f for f in periode.get("freigaben") or [] if f.get("fingerabdruck") == periode.get("fingerabdruck")]
	if any(f.get("kontoId") == konto_id for f in fg):
		return nein("Vier-Augen-Prinzip: Die zweite Freigabe muss eine andere Person erteilen.")

	def hat(a):
		return any(f.get("auge") == a for f in fg)

	s1, s2 = stufen.get("freigabe1") or 0, stufen.get("freigabe2") or 0
	auge = 1 if (s1 >= 2 and not hat(1)) else 2 if (s2 >= 2 and not hat(2)) else None
	if not auge:
		return nein("Ihre Freigabe liegt bereits vor – es fehlt die Freigabe der anderen Funktion (Kassier bzw. Vorstand)." if (s1 >= 2 or s2 >= 2) else "Freigeben dürfen Kassier (1. Auge) und Obmann bzw. Vorstand (2. Auge).")
	return {"ok": True, "grund": "", "auge": auge, "vollstaendig": hat(2 if auge == 1 else 1)}


def altwerte_lesen(csv):
	zeilen = [z.strip() for z in str(csv or "").replace("\r", "").split("\n") if z.strip()]
	aus, fehler = [], []
	for i, z in enumerate(zeilen):
		t = [x.strip() for x in z.split(";")]
		if i == 0 and re.search("mitglied", t[0], re.I):
			continue
		try:
			nr = float(t[0])
		except ValueError:
			nr = math.nan
		typ = (t[1] if len(t) > 1 and t[1] else "rechnung").lower()
		try:
			netto = float((t[2] if len(t) > 2 else "").replace(".", "").replace(",", "."))
		except ValueError:
			netto = math.nan
		if math.isnan(nr) or not nr.is_integer() or nr < 1 or typ not in ("rechnung", "gutschrift") or math.isnan(netto) or math.isinf(netto):
			fehler.append(f"Zeile {i + 1}: erwartet „Mitgliedsnummer;rechnung|gutschrift;Netto“.")
		else:
			aus.append({"mitgliedsnummer": int(nr), "typ": typ, "netto": rund2(netto)})
	return {"werte": aus[:5000], "fehler": fehler}


def probe_vergleich(belege, altwerte, toleranz_eur=0.05):
	neu = {f"{b['mitgliedsnummer']}|{b['typ']}": b for b in belege or []}
	alt = {f"{a['mitgliedsnummer']}|{a['typ']}": a for a in altwerte or []}
	alle = sorted(set(neu) | set(alt), key=lambda k: (float(k.split("|")[0]), k))
	zeilen = []
	for k in alle:
		b, a = neu.get(k), alt.get(k)
		n = rund2(b["summen"]["netto"]) if b else 0
		v = rund2(a["netto"]) if a else 0
		d = rund2(n - v)
		zeilen.append({"mitgliedsnummer": int(float(k.split("|")[0])), "typ": k.split("|")[1], "name": ((b or {}).get("empfaenger") or {}).get("name") or "", "neu": n, "alt": v, "differenz": d, "pct": (_js_round(d / v * 1000) / 10) if v else None, "auffaellig": abs(d) > toleranz_eur, "nurNeu": not a, "nurAlt": not b})
	return {"zeilen": zeilen, "summeNeu": rund2(sum(z["neu"] for z in zeilen)), "summeAlt": rund2(sum(z["alt"] for z in zeilen)), "auffaellig": sum(1 for z in zeilen if z["auffaellig"])}


# ================================================================ Zahlung (zahlung.js)

MAHN_FAIR = {
	"stufen": [
		{"stufe": 1, "label": "Freundliche Zahlungserinnerung", "abTagen": 10, "gebuehr": 0, "fristTage": 14},
		{"stufe": 2, "label": "Mahnung", "abTagen": 30, "gebuehr": 3, "fristTage": 14},
		{"stufe": 3, "label": "Letzte Mahnung", "abTagen": 50, "gebuehr": 5, "fristTage": 14},
	],
	"verzugszinsen": False, "basiszinssatz": None, "pauschaleB2b": False, "mindestBetrag": 5, "aufschlagStufe": 3,
}
ZAHLUNG_ARTEN = {"pain008": "SEPA-Lastschrift (pain.008)", "pain001": "SEPA-Überweisung Gutschriften (pain.001)", "camt": "Kontoauszug (camt.053/054)", "manuell": "Manuell erfasst", "ruecklastschrift": "Rücklastschrift"}
RUECKLASTSCHRIFT = {"gebuehrStandard": 0, "gebuehrMax": 10}
MANDAT_VERFALL_MONATE = 36
GLAEUBIGER_ID = re.compile(r"^AT\d\dZZZ\d{11}$")


def _monate_zwischen(a, b):
	j1, m1 = (int(x) for x in str(a)[:7].split("-"))
	j2, m2 = (int(x) for x in str(b)[:7].split("-"))
	return (j2 - j1) * 12 + (m2 - m1)


def mandatsreferenz_vorschlag(kurzname, mitgliedsnummer):
	return sepa_id(f"{sepa_text(kurzname, 20).replace(' ', '')}-{str(mitgliedsnummer).zfill(4)}")


def mandat_pruefen(mandat=None, iban="", heute="", letzter_einzug=""):
	mandat = mandat or {}
	fehler, warnungen = [], []
	ref = mandat.get("referenz") or ""
	if not ref:
		fehler.append("Mandatsreferenz fehlt.")
	elif sepa_id(ref) != str(ref).upper() or len(str(ref)) > 35:
		fehler.append("Mandatsreferenz: höchstens 35 Zeichen, nur Buchstaben, Ziffern und Bindestrich.")
	if not _DATUM_RE.match(str(mandat.get("datum") or "")):
		fehler.append("Datum der Mandatserteilung fehlt.")
	elif heute and mandat["datum"] > heute:
		fehler.append("Mandatsdatum liegt in der Zukunft.")
	if mandat.get("status") != "aktiv":
		fehler.append("Mandat widerrufen." if mandat.get("status") == "widerrufen" else "Mandat nicht aktiv.")
	if not iban_pruefen(iban):
		fehler.append("IBAN des Mitglieds fehlt oder ist ungültig.")
	bezug = letzter_einzug or mandat.get("datum")
	if heute and bezug and _DATUM_RE.match(str(bezug)) and _monate_zwischen(bezug, heute) >= MANDAT_VERFALL_MONATE:
		fehler.append("Mandat verfallen (36 Monate ohne Einzug) – neues Mandat einholen.")
	elif heute and bezug and _DATUM_RE.match(str(bezug)) and _monate_zwischen(bezug, heute) >= MANDAT_VERFALL_MONATE - 3:
		warnungen.append("Mandat verfällt bald (36 Monate ohne Einzug).")
	return {"ok": not fehler, "fehler": fehler, "warnungen": warnungen, "seqTp": "RCUR" if letzter_einzug else "FRST"}


def _xml(s):
	return str("" if s is None else s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


def _betrag(x):
	return f"{rund2(x):.2f}"


def pain008(nachricht_id, einzug_am, glaeubiger, lastschriften, erstellt_am):
	if not lastschriften:
		raise ValueError("Keine Lastschriften")
	if not iban_pruefen(glaeubiger.get("iban")):
		raise ValueError("IBAN der Gemeinschaft ungültig")
	cid = re.sub(r"\s", "", str(glaeubiger.get("creditorId") or "")).upper()
	if not GLAEUBIGER_ID.match(cid):
		raise ValueError("Gläubiger-ID (Creditor-ID) fehlt oder ist ungültig")
	if not _DATUM_RE.match(einzug_am or ""):
		raise ValueError("Einzugsdatum ungültig")
	for l_ in lastschriften:
		if not iban_pruefen(l_.get("iban")):
			raise ValueError(f"IBAN ungültig ({l_.get('endToEndId')})")
		if not rund2(l_.get("betrag")) > 0:
			raise ValueError(f"Betrag ungültig ({l_.get('endToEndId')})")
		if not l_.get("mandatRef") or not _DATUM_RE.match(l_.get("mandatDatum") or ""):
			raise ValueError(f"Mandat unvollständig ({l_.get('endToEndId')})")
	msg = sepa_id(nachricht_id)
	zeit = re.sub(r"\.\d{3}Z$", "Z", str(erstellt_am))
	gruppen = [(seq, [l_ for l_ in lastschriften if (l_.get("seqTp") or "RCUR") == seq]) for seq in ("FRST", "RCUR")]
	gruppen = [(s, l_) for s, l_ in gruppen if l_]

	def summe(liste):
		return _betrag(sum(rund2(x["betrag"]) for x in liste))

	def agent(bic):
		return f"<FinInstnId><BICFI>{_xml(bic.upper())}</BICFI></FinInstnId>" if bic and bic_pruefen(bic) else "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>"

	pmt = []
	for i, (seq, liste) in enumerate(gruppen):
		tx = "\n".join(f"""      <DrctDbtTxInf>
        <PmtId><EndToEndId>{_xml(sepa_id(l_.get('endToEndId')) or 'NOTPROVIDED')}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">{_betrag(l_['betrag'])}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>{_xml(sepa_id(l_['mandatRef']))}</MndtId><DtOfSgntr>{_xml(l_['mandatDatum'])}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt>{agent(l_.get('bic'))}</DbtrAgt>
        <Dbtr><Nm>{_xml(sepa_text(l_.get('name'), 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>{_xml(iban_normalisieren(l_['iban']))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>{_xml(sepa_text(l_.get('verwendungszweck'), 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>""" for l_ in liste)
		pmt.append(f"""    <PmtInf>
      <PmtInfId>{_xml(sepa_id(f'{msg}-{i + 1}'))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>{len(liste)}</NbOfTxs>
      <CtrlSum>{summe(liste)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>{seq}</SeqTp></PmtTpInf>
      <ReqdColltnDt>{_xml(einzug_am)}</ReqdColltnDt>
      <Cdtr><Nm>{_xml(sepa_text(glaeubiger.get('name'), 70))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>{_xml(iban_normalisieren(glaeubiger['iban']))}</IBAN></Id></CdtrAcct>
      <CdtrAgt>{agent(glaeubiger.get('bic'))}</CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>{_xml(cid)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
{tx}
    </PmtInf>""")
	return f"""<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>{_xml(msg)}</MsgId>
      <CreDtTm>{_xml(zeit)}</CreDtTm>
      <NbOfTxs>{len(lastschriften)}</NbOfTxs>
      <CtrlSum>{summe(lastschriften)}</CtrlSum>
      <InitgPty><Nm>{_xml(sepa_text(glaeubiger.get('name'), 70))}</Nm></InitgPty>
    </GrpHdr>
{chr(10).join(pmt)}
  </CstmrDrctDbtInitn>
</Document>
"""


def pain008_pruefen(text):
	f = []
	s = str(text or "")
	if 'xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08"' not in s:
		f.append("Namespace pain.008.001.08 fehlt")
	for t in ("CstmrDrctDbtInitn", "GrpHdr", "MsgId", "PmtInf", "PmtMtd", "SeqTp", "ReqdColltnDt", "Cdtr", "CdtrAcct", "CdtrSchmeId", "DrctDbtTxInf", "MndtId", "DtOfSgntr"):
		if not re.search(rf"<{t}(\s|>)", s):
			f.append(f"Element {t} fehlt")
	tx = re.findall(r"<DrctDbtTxInf>", s)
	m = re.search(r"<GrpHdr>(?:.|\n)*?<NbOfTxs>(\d+)</NbOfTxs>", s)
	if m and int(m.group(1)) != len(tx):
		f.append("NbOfTxs passt nicht zur Anzahl der Lastschriften")
	betraege = re.findall(r'<InstdAmt Ccy="EUR">(.*?)</InstdAmt>', s)
	if any(not re.match(r"^\d+\.\d\d$", b) or float(b) <= 0 for b in betraege):
		f.append("Betrag nicht im Format 0.00 oder ≤ 0")
	summe = f"{sum(float(b) for b in betraege if re.match(r'^[0-9.]+$', b)):.2f}"
	k = re.search(r"<GrpHdr>(?:.|\n)*?<CtrlSum>(.*?)</CtrlSum>", s)
	if not k or k.group(1) != summe:
		f.append("CtrlSum passt nicht zur Summe der Beträge")
	for i in re.findall(r"<IBAN>(.*?)</IBAN>", s):
		if not iban_pruefen(i):
			f.append(f"IBAN ungültig: {i[:4]}…")
	return f


def _zweck(b, g):
	return f"{b['nummer']} {g.get('kurzname') or g.get('name')} {str(b['von'])[:7]}"


def zahlungslauf_bilden(art, belege, mitglieder, gemeinschaft, heute, beleg_ids=None, aufrechnung=True, letzte_einzuege=None):
	letzte_einzuege = letzte_einzuege or {}
	m_von = {m["id"]: m for m in mitglieder or []}
	offen = [b for b in belege or [] if b.get("status") in BELEG_OFFEN and b.get("nummer") and beleg_offen(b) > 0 and not b.get("zahlungslaufId")]
	typ, gegen = ("rechnung", "gutschrift") if art == "pain008" else ("gutschrift", "rechnung")
	auswahl = [b for b in offen if b["typ"] == typ and (beleg_ids is None or b["id"] in beleg_ids)]
	posten, uebersprungen, verrechnungen, verbraucht = [], [], [], set()
	for b in auswahl:
		m = m_von.get(b["mitgliedId"])
		if not m:
			uebersprungen.append({"belegId": b["id"], "nummer": b["nummer"], "grund": "Mitglied nicht gefunden."})
			continue
		betrag = beleg_offen(b)
		gegenbelege = [x for x in offen if x["typ"] == gegen and x["mitgliedId"] == m["id"] and x["id"] not in verbraucht] if aufrechnung else []
		gegen_summe = rund2(sum(beleg_offen(x) for x in gegenbelege))
		if gegenbelege:
			if gegen_summe >= betrag:
				uebersprungen.append({"belegId": b["id"], "nummer": b["nummer"], "grund": f"Wird mit {', '.join(x['nummer'] for x in gegenbelege)} verrechnet (Aufrechnung) – Auszahlung bzw. Einzug nur über den Gegenbeleg."})
				continue
			verrechnungen.append({"belegId": b["id"], "nummer": b["nummer"], "gegen": [{"belegId": x["id"], "nummer": x["nummer"], "betrag": beleg_offen(x)} for x in gegenbelege], "betrag": gegen_summe})
			for x in gegenbelege:
				verbraucht.add(x["id"])
			betrag = rund2(betrag - gegen_summe)
		zweck = _zweck(b, gemeinschaft) + (f" abzgl. {' '.join(x['nummer'] for x in gegenbelege)}" if gegenbelege else "")
		name = (b.get("empfaenger") or {}).get("name") or ""
		if art == "pain008":
			mp = mandat_pruefen(m.get("sepaMandat") or {}, m.get("iban"), heute, letzte_einzuege.get(m["id"]) or "")
			if not mp["ok"]:
				uebersprungen.append({"belegId": b["id"], "nummer": b["nummer"], "grund": " ".join(mp["fehler"])})
				continue
			posten.append({"belegId": b["id"], "nummer": b["nummer"], "mitgliedId": m["id"], "name": name, "iban": iban_normalisieren(m["iban"]), "betrag": betrag, "mandatRef": m["sepaMandat"]["referenz"], "mandatDatum": m["sepaMandat"]["datum"], "seqTp": mp["seqTp"], "endToEndId": b["nummer"], "verwendungszweck": zweck, "verrechnet": [x["id"] for x in gegenbelege]})
		else:
			if not iban_pruefen(m.get("iban")):
				uebersprungen.append({"belegId": b["id"], "nummer": b["nummer"], "grund": "IBAN des Erzeugers fehlt oder ist ungültig."})
				continue
			posten.append({"belegId": b["id"], "nummer": b["nummer"], "mitgliedId": m["id"], "name": name, "iban": iban_normalisieren(m["iban"]), "betrag": betrag, "endToEndId": b["nummer"], "verwendungszweck": zweck, "verrechnet": [x["id"] for x in gegenbelege]})
	return {"posten": posten, "uebersprungen": uebersprungen, "verrechnungen": verrechnungen, "summe": rund2(sum(p["betrag"] for p in posten)), "anzahl": len(posten)}


def zahlungsdatei(art, lauf, gemeinschaft, nachricht_id, erstellt_am, ausfuehrung_am):
	g = gemeinschaft
	if art == "pain008":
		return pain008(nachricht_id, ausfuehrung_am, {"name": g.get("name"), "iban": g.get("iban"), "bic": g.get("bic"), "creditorId": g.get("creditorId")}, lauf["posten"], erstellt_am)
	return pain001(nachricht_id, ausfuehrung_am, {"name": g.get("name"), "iban": g.get("iban"), "bic": g.get("bic")}, [{"endToEndId": p["endToEndId"], "betrag": p["betrag"], "name": p["name"], "iban": p["iban"], "verwendungszweck": p["verwendungszweck"]} for p in lauf["posten"]], erstellt_am)


def fuer_zuordnung(b):
	return {"id": b["id"], "nummer": b["nummer"], "beleg": "gutschrift" if b["typ"] == "gutschrift" else "rechnung", "status": ("angewiesen" if b.get("zahlungslaufId") else "offen"), "brutto": abs(_n0((b.get("summen") or {}).get("brutto"))), "offen": beleg_offen(b), "partei": {"name": (b.get("empfaenger") or {}).get("name") or ""}}


def ruecklastschrift_gebuehr(bankspesen, konfig=None):
	k = konfig or RUECKLASTSCHRIFT
	return min(rund2(max(0, _n0(k["gebuehrStandard"] if bankspesen is None else bankspesen))), k["gebuehrMax"])


def eg_mahnvorschlag(b, heute, konfig=None, schutzbeduerftig=False):
	if b.get("typ") != "rechnung" or b.get("status") not in BELEG_OFFEN:
		return None
	k = BK.mahn_konfig_pruefen(konfig or MAHN_FAIR)
	adapter = {"beleg": "rechnung", "status": "offen", "nummer": b.get("nummer"), "rechnungsdatum": b.get("datum"), "faelligAm": b.get("faelligAm"), "brutto": abs(_n0((b.get("summen") or {}).get("brutto"))), "zahlungen": b.get("zahlungen") or [], "mahnungen": b.get("mahnungen") or [], "mahnsperre": b.get("mahnsperre"), "partei": {"name": (b.get("empfaenger") or {}).get("name") or "", "uid": (b.get("empfaenger") or {}).get("uid") or ""}}
	v = BK.mahn_vorschlag(adapter, heute, k, "AT")
	if not v:
		return None
	if schutzbeduerftig and v.get("faellig"):
		kosten = rund2(v["kostenGesamt"] - v["gebuehr"])
		return {**v, "gebuehr": 0, "kostenGesamt": kosten, "gesamt": rund2(v["offen"] + kosten), "sozial": True, "hinweisSozial": "Schutzbedürftiger Haushalt: keine Mahngebühr, Ratenzahlung anbieten."}
	return {**v, "sozial": False, "hinweisEskalation": "Nach der letzten Mahnung entscheidet der Vorstand über Ratenplan, Ausschluss bzw. Abmeldung (CM_REV_SP) – keine Automatik." if v.get("eskalation") else ""}


# ================================================================ Buchhaltung (buchhaltung.js)

EG_KONTEN = {
	"2700": {"label": "Kassa", "art": "geld"}, "2800": {"label": "Bank", "art": "geld"}, "2000": {"label": "Forderungen Mitglieder", "art": "bestand"}, "3300": {"label": "Verbindlichkeiten Erzeuger", "art": "bestand"},
	"2500": {"label": "Vorsteuer", "art": "steuer"}, "2510": {"label": "Vorsteuer Reverse Charge (§ 19 Abs. 1c)", "art": "steuer"}, "3500": {"label": "Umsatzsteuer", "art": "steuer"}, "3510": {"label": "Umsatzsteuer Reverse Charge (§ 19 Abs. 1c)", "art": "steuer"},
	"4000": {"label": "Erlöse Stromlieferung an Mitglieder", "art": "einnahme"}, "4010": {"label": "Erlöse Gebühren (Grund-, Zählpunkt-, Beitrittsgebühr)", "art": "einnahme"}, "4800": {"label": "Mitgliedsbeiträge", "art": "einnahme"},
	"4890": {"label": "Sonstige Einnahmen (Förderungen, Zinsen, Spenden)", "art": "einnahme"}, "5000": {"label": "Stromeinkauf Erzeuger (Gutschriften)", "art": "ausgabe"}, "7300": {"label": "Plattform, Dienstleistung, Organisator", "art": "ausgabe"},
	"7600": {"label": "Verwaltung (Porto, Büro, Versicherung)", "art": "ausgabe"}, "7700": {"label": "Bankspesen", "art": "ausgabe"}, "7800": {"label": "Steuerberatung, Rechtsberatung", "art": "ausgabe"}, "7890": {"label": "Sonstige Ausgaben", "art": "ausgabe"},
	"9000": {"label": "Durchlaufende Posten / Umbuchung", "art": "neutral"},
}
BUCHUNG_KATEGORIEN = {nr: k["label"] for nr, k in EG_KONTEN.items() if k["art"] in ("einnahme", "ausgabe")}
VEREIN_SCHWELLEN = {"jahresabschluss": 1000000, "erweitert": 3000000}
ESTG_PV = {"kwh": 12500, "kwp": 35, "kw": 25, "quelle": "§ 3 Abs. 1 Z 39 EStG 1988 (Einspeisung natürlicher Personen; gilt auch bei Lieferung an Energiegemeinschaften, BMF)"}


def konto_fuer_position(art):
	return "5000" if art == "einspeisung" else "4800" if art == "mitgliedsbeitrag" else "4000" if art == "bezug" else "4010"


def buchungen_aus_zahlung(b, z, geldkonto="2800"):
	brutto = abs(_n0((b.get("summen") or {}).get("brutto")))
	if not brutto > 0:
		return []
	anteil = min(1, _n0(z.get("betrag")) / brutto)
	vz = -1 if b.get("typ") == "storno" else 1
	ausgabe = (b.get("ursprungTyp") if b.get("typ") == "storno" else b.get("typ")) == "gutschrift"
	je = {}
	for p in b.get("positionen") or []:
		k = konto_fuer_position(p.get("art"))
		je[k] = je.get(k, 0) + abs(_n0(p.get("netto")))
	basis = {"datum": z.get("datum"), "belegId": b.get("id"), "belegNr": b.get("nummer"), "zahlungId": z.get("id"), "geldkonto": geldkonto, "quelle": "zahlung", "mitgliedId": b.get("mitgliedId")}
	zeilen = [{**basis, "konto": k, "kategorie": "ausgabe" if ausgabe else "einnahme", "text": f"{'Gutschrift' if ausgabe else 'Rechnung'} {b.get('nummer')} – {EG_KONTEN[k]['label']}", "betrag": rund2(vz * n * anteil), "ust": 0, "ustArt": ""} for k, n in sorted(je.items())]
	for s in (b.get("summen") or {}).get("zeilen") or []:
		if s.get("art") == "ust" and s.get("betrag"):
			wert = rund2(vz * abs(s["betrag"]) * anteil)
			zeilen.append({**basis, "konto": "2500" if ausgabe else "3500", "kategorie": "ausgabe" if ausgabe else "einnahme", "text": f"{'Vorsteuer' if ausgabe else 'Umsatzsteuer'} {_js_str(s['satz'])} % {b.get('nummer')}", "betrag": wert, "ust": wert, "ustArt": f"ust{_js_str(s['satz'])}"})
	soll = rund2(vz * _n0(z.get("betrag")))
	ist = rund2(sum(x["betrag"] for x in zeilen))
	if zeilen and 0.01 <= abs(soll - ist) < 0.05:
		zeilen[0]["betrag"] = rund2(zeilen[0]["betrag"] + soll - ist)
	return zeilen


def buchung_bereinigen(d):
	d = d or {}
	datum_ = str(d.get("datum") or "")[:10]
	if not _DATUM_RE.match(datum_):
		raise ValueError("Bitte ein Buchungsdatum angeben.")
	konto = str(d.get("konto") or "")
	if konto not in BUCHUNG_KATEGORIEN:
		raise ValueError("Bitte ein Einnahmen- oder Ausgabenkonto wählen.")
	try:
		betrag = rund2(float(str("" if d.get("betrag") is None else d.get("betrag")).replace(",", ".")))
	except ValueError:
		betrag = math.nan
	if math.isnan(betrag) or betrag <= 0 or betrag > 1000000:
		raise ValueError("Bitte einen Betrag über 0 € angeben.")
	satz = _n0(d.get("ustSatz"))
	satz = int(satz) if satz in (0, 10, 13, 20) else 0
	text = re.sub(r"\s+", " ", str(d.get("text") or "")).strip()[:140]
	if not text:
		raise ValueError("Bitte einen Buchungstext angeben.")
	geldkonto = "2700" if d.get("geldkonto") == "2700" else "2800"
	beleg_nr = str(d.get("belegNr") or "").strip()[:40]
	if not beleg_nr:
		raise ValueError("Bitte die Belegnummer bzw. Quittung angeben (Belegprinzip).")
	ust = rund2(betrag - betrag / (1 + satz / 100)) if satz else 0
	return {"datum": datum_, "konto": konto, "kategorie": EG_KONTEN[konto]["art"], "betrag": betrag, "ust": ust, "ustArt": f"ust{satz}" if satz else "", "text": text, "geldkonto": geldkonto, "belegNr": beleg_nr, "quelle": "kassa" if geldkonto == "2700" else "manuell"}


def kassabuch(buchungen, anfangsbestand=0):
	saldo = rund2(anfangsbestand)
	fehler, zeilen = [], []
	liste = sorted([b for b in buchungen or [] if b.get("geldkonto") == "2700"], key=lambda b: (b["datum"], str(b.get("id") or "")))
	for i, b in enumerate(liste):
		ein = b["betrag"] if b.get("kategorie") == "einnahme" else 0
		aus = b["betrag"] if b.get("kategorie") == "ausgabe" else 0
		saldo = rund2(saldo + ein - aus)
		if saldo < 0:
			fehler.append(f"Kassastand negativ am {b['datum']} (lfd. Nr. {i + 1}) – Buchung fehlt oder Datum falsch.")
		zeilen.append({"nr": i + 1, "datum": b["datum"], "belegNr": b.get("belegNr"), "text": b.get("text"), "einnahme": rund2(ein), "ausgabe": rund2(aus), "saldo": saldo})
	return {"zeilen": zeilen, "endbestand": saldo, "fehler": fehler}


def ea_rechnung(buchungen, jahr, anfang=None, offene_forderungen=0, offene_verbindlichkeiten=0, vorjahr_einnahmen=None):
	anfang = anfang or {"bank": 0, "kassa": 0}
	im = [b for b in buchungen or [] if str(b.get("datum"))[:4] == str(jahr)]

	def summe_je(kat):
		je = {}
		for b in im:
			if b.get("kategorie") == kat:
				je[b["konto"]] = rund2(je.get(b["konto"], 0) + b["betrag"])
		return [{"konto": k, "label": (EG_KONTEN.get(k) or {}).get("label") or k, "betrag": v} for k, v in sorted(je.items())]

	einnahmen, ausgaben = summe_je("einnahme"), summe_je("ausgabe")
	se = rund2(sum(x["betrag"] for x in einnahmen))
	sa = rund2(sum(x["betrag"] for x in ausgaben))

	def geld(konto):
		return rund2(sum((b["betrag"] if b.get("kategorie") == "einnahme" else -b["betrag"] if b.get("kategorie") == "ausgabe" else 0) for b in im if b.get("geldkonto") == konto))

	bank_ende = rund2(_n0(anfang.get("bank")) + geld("2800"))
	kassa_ende = rund2(_n0(anfang.get("kassa")) + geld("2700"))
	gross = max(se, sa)
	groesse = "klein"
	vtext = "Einnahmen-Ausgaben-Rechnung mit Vermögensübersicht genügt (VerG § 21)."
	if gross > VEREIN_SCHWELLEN["erweitert"]:
		groesse = "gross"
		vtext = "Über 3 Mio. €: erweiterter Jahresabschluss und Abschlussprüfung, wenn auch im Vorjahr überschritten (VerG § 22 Abs. 2) (zu bestätigen)."
	elif gross > VEREIN_SCHWELLEN["jahresabschluss"]:
		groesse = "mittel"
		vtext = "Zwei Jahre über 1 Mio. €: ab dem folgenden Jahr Jahresabschluss (Bilanz, GuV) nach VerG § 22 Abs. 1." if (vorjahr_einnahmen is not None and _n0(vorjahr_einnahmen) > VEREIN_SCHWELLEN["jahresabschluss"]) else "Über 1 Mio. € Einnahmen bzw. Ausgaben: Folgt ein zweites Jahr, ist ein Jahresabschluss nach VerG § 22 Abs. 1 nötig."
	return {
		"jahr": int(jahr), "einnahmen": einnahmen, "ausgaben": ausgaben, "summeEinnahmen": se, "summeAusgaben": sa, "ergebnis": rund2(se - sa),
		"vermoegen": {"bankAnfang": rund2(anfang.get("bank") or 0), "kassaAnfang": rund2(anfang.get("kassa") or 0), "bankEnde": bank_ende, "kassaEnde": kassa_ende, "geldEnde": rund2(bank_ende + kassa_ende), "offeneForderungen": rund2(offene_forderungen), "offeneVerbindlichkeiten": rund2(offene_verbindlichkeiten), "reinvermoegen": rund2(bank_ende + kassa_ende + _n0(offene_forderungen) - _n0(offene_verbindlichkeiten))},
		"vereinsgroesse": groesse, "vereinsText": vtext, "anzahlBuchungen": len(im), "quelle": "VerG 2002 §§ 21, 22",
	}


def uva_vorbereitung(belege, von, bis, ust_status="kleinunternehmer"):
	im = [b for b in belege or [] if b.get("nummer") and von <= (b.get("datum") or "") <= bis and b.get("status") != "entwurf"]
	kz000 = kz022 = kz016 = rc_basis = vst13 = 0.0
	for b in im:
		typ = b.get("ursprungTyp") if b.get("typ") == "storno" else b.get("typ")
		for z in (b.get("summen") or {}).get("zeilen") or []:
			if typ == "rechnung":
				if z["art"] == "ust" and z["satz"] == 20:
					kz022 += z["basis"]
				if z["art"] == "befreit":
					kz016 += z["basis"]
				if z["art"] != "nicht_steuerbar":
					kz000 += z["basis"]
			elif typ == "gutschrift":
				if z["art"] == "rc":
					rc_basis += z["basis"]
				if z["art"] == "ust" and z["satz"] == 13:
					vst13 += z["betrag"]
	regel = ust_status == "regelbesteuert"
	ust20 = rund2(kz022 * 0.2)
	rc = rund2(rc_basis * 0.2)
	vst = rund2(vst13) if regel else 0
	vst_rc = rc if regel else 0
	return {
		"von": von, "bis": bis, "ustStatus": ust_status,
		"kennzahlen": [
			{"kz": "000", "label": "Gesamtbetrag der Bemessungsgrundlagen (Lieferungen, sonstige Leistungen)", "betrag": rund2(kz000)},
			{"kz": "016", "label": "davon steuerfrei ohne Vorsteuerabzug – Kleinunternehmer § 6 Abs. 1 Z 27", "betrag": rund2(kz016)},
			{"kz": "022", "label": "davon 20 % Normalsteuersatz (Bemessungsgrundlage)", "betrag": rund2(kz022), "steuer": ust20},
			{"kz": "057", "label": "Steuerschuld gemäß § 19 Abs. 1c (Strom an Wiederverkäufer) – Bemessungsgrundlage", "betrag": rund2(rc_basis), "steuer": rc},
			{"kz": "060", "label": "Gesamtbetrag der Vorsteuern (u. a. 13 % pauschalierte Landwirte)", "betrag": vst},
			{"kz": "066", "label": "Vorsteuern betreffend die Steuerschuld gemäß § 19 Abs. 1c", "betrag": vst_rc},
		],
		"zahllast": rund2(ust20 + rc - vst - vst_rc),
		"hinweis": "Regelbesteuert: UVA monatlich, bei Vorjahresumsatz bis 100.000 € vierteljährlich (§ 21 UStG)." if regel else "Kleinunternehmer: keine Vorsteuer; die Steuerschuld aus Reverse Charge ist trotzdem zu erklären und abzuführen (Fachkonzept 4.5) (zu bestätigen).",
		"quelle": "Formular U 30 – Kennzahlen (zu bestätigen); UStG §§ 19, 21",
	}


def pruefvermerk_bereinigen(d):
	d = d or {}
	ergebnis = d.get("ergebnis") if d.get("ergebnis") in ("ohne_beanstandung", "mit_hinweisen", "beanstandet") else ""
	if not ergebnis:
		raise ValueError("Bitte das Prüfergebnis wählen.")
	text = str(d.get("text") or "").strip()[:4000]
	if ergebnis != "ohne_beanstandung" and len(text) < 10:
		raise ValueError("Bitte Hinweise bzw. Beanstandungen beschreiben.")
	st = [str(x)[:40] for x in (d.get("stichproben") or []) if str(x)][:200] if isinstance(d.get("stichproben"), list) else []
	return {"ergebnis": ergebnis, "text": text, "stichproben": st, "jahr": int(_n0(d.get("jahr"))) or None}


def jahresbescheinigung(gutschriften, jahr, mitglied=None, anlagen_kwp=0, anschluss_kw=None, mengen_ohne_entgelt=0):
	mitglied = mitglied or {}
	im = [b for b in gutschriften or [] if str(b.get("bis"))[:4] == str(jahr) and b.get("nummer") and b.get("status") != "entwurf"]
	menge = 0.0
	for b in im:
		vz = -1 if b.get("typ") == "storno" else 1
		menge += vz * sum(_n0(p.get("mengeRoh") if p.get("mengeRoh") is not None else p.get("menge")) for p in b.get("positionen") or [] if p.get("art") == "einspeisung")
	kwh = _js_round((menge + _n0(mengen_ohne_entgelt)) * 1000) / 1000
	netto = rund2(sum(b["summen"]["netto"] for b in im))
	ust = rund2(sum(b["summen"]["ust"] for b in im))
	natuerlich = mitglied.get("art") in ("privat", "landwirt")
	befreit = natuerlich and kwh <= ESTG_PV["kwh"] and _n0(anlagen_kwp) <= ESTG_PV["kwp"] and (anschluss_kw is None or _n0(anschluss_kw) <= ESTG_PV["kw"])
	if natuerlich:
		t = "Einkünfte aus der Einspeisung bis 12.500 kWh sind bei Anlagen bis 35 kWp und 25 kW Anschlussleistung in der Regel einkommensteuerfrei (§ 3 Abs. 1 Z 39 EStG)." if befreit else "Die Grenzen des § 3 Abs. 1 Z 39 EStG (12.500 kWh, 35 kWp, 25 kW) sind überschritten – Einkünfte sind zu erklären."
	else:
		t = "Für Unternehmen und Gemeinden gilt die Befreiung nach § 3 Abs. 1 Z 39 EStG nicht."
	return {"jahr": int(jahr), "kwh": kwh, "netto": netto, "ust": ust, "brutto": rund2(netto + ust), "belege": [b["nummer"] for b in im], "estg": {"befreitMoeglich": befreit, "text": t, "quelle": ESTG_PV["quelle"]}, "hinweis": "Diese Bescheinigung ersetzt keine Steuerberatung."}


EXPORT_ARTEN = {"bmd": "BMD NTCS (CSV)", "rzl": "RZL (CSV) (Feldbelegung zu bestätigen)", "datev": "DATEV-Buchungsstapel (CSV)", "ea": "Einnahmen-Ausgaben-Rechnung (CSV)", "kassabuch": "Kassabuch (CSV)", "belegjournal": "Belegjournal (CSV)"}


def _csv_feld(v):
	if v is None:
		s = ""
	elif isinstance(v, (int, float)) and not isinstance(v, bool):
		s = f"{rund2(v):.2f}".replace(".", ",")
	else:
		s = str(v)
	if not (isinstance(v, (int, float)) and not isinstance(v, bool)) and re.match(r"^(=|\+|-|@|\t|\r)", s):
		s = "'" + s
	return '"' + s.replace('"', '""') + '"' if re.search(r';|"|\n|\r', s) else s


def _csv_aus(kopf, zeilen):
	return "﻿" + "\r\n".join([";".join(kopf), *(";".join(_csv_feld(x) for x in z) for z in zeilen)]) + "\r\n"


def _export_zeilen(buchungen):
	aus = []
	for b in buchungen:
		if b.get("kategorie") not in ("einnahme", "ausgabe"):
			continue
		ein = b["kategorie"] == "einnahme"
		storno = b["betrag"] < 0
		soll, haben = (b["geldkonto"], b["konto"]) if ein != storno else (b["konto"], b["geldkonto"])
		aus.append({"datum": b["datum"], "beleg": b.get("belegNr"), "text": b.get("text"), "betrag": abs(b["betrag"]), "soll": soll, "haben": haben, "steuerVorlage": b.get("ustArt") or "", "steuerBetrag": abs(b.get("ust") or 0), "steuerSatz": (float(b["ustArt"][3:]) / 100) if b.get("ustArt") else 0, "typ": "rechnung" if ein else "gutschrift"})
	return aus


def export_erzeugen(art, buchungen=None, belege=None, jahr=None, gemeinschaft=None, konten=None, ea=None, kassa=None, erzeugt_am=""):
	g = gemeinschaft or {}
	kurz = re.sub(r"-+", "-", re.sub(r"\s+", "-", str(g.get("kurzname") or g.get("name") or "EG")))[:30]
	im = sorted([b for b in buchungen or [] if str(b.get("datum"))[:4] == str(jahr)], key=lambda b: b["datum"])

	def name(x, endung="csv"):
		return f"{kurz}_{x}_{jahr}.{endung}"

	if art == "datev":
		k = BK.konten_pruefen(konten or {})
		return {"dateiname": name("DATEV"), "inhalt": BK.datev_csv(_export_zeilen(im), k, f"{jahr}-01-01", f"{jahr}-12-31", erzeugt_am or f"{jahr}-12-31T00:00:00.000Z"), "mime": "text/csv; charset=windows-1252"}
	if art == "bmd":
		k = BK.konten_pruefen(konten or {})
		return {"dateiname": name("BMD"), "inhalt": BK.bmd_csv(_export_zeilen(im), k), "mime": "text/csv; charset=utf-8"}
	if art == "rzl":
		zeilen = [[".".join(reversed(z["datum"].split("-"))), z["beleg"], z["soll"], z["haben"], z["betrag"], str(_js_round(z["steuerSatz"] * 100)) if z["steuerSatz"] else "", z["steuerBetrag"] or "", z["text"]] for z in _export_zeilen(im)]
		return {"dateiname": name("RZL"), "inhalt": _csv_aus(["Belegdatum", "Belegnummer", "Konto", "Gegenkonto", "Betrag", "Steuerprozent", "Steuerbetrag", "Buchungstext"], zeilen), "mime": "text/csv; charset=utf-8"}
	if art == "kassabuch":
		k = kassa or kassabuch(im)
		return {"dateiname": name("Kassabuch"), "inhalt": _csv_aus(["Lfd. Nr.", "Datum", "Beleg", "Text", "Einnahme", "Ausgabe", "Kassastand"], [[str(z["nr"]), z["datum"], z["belegNr"], z["text"], z["einnahme"], z["ausgabe"], z["saldo"]] for z in k["zeilen"]]), "mime": "text/csv; charset=utf-8"}
	if art == "belegjournal":
		liste = sorted([b for b in belege or [] if b.get("nummer") and str(b.get("datum"))[:4] == str(jahr)], key=lambda b: b["nummer"])
		return {"dateiname": name("Belegjournal"), "inhalt": _csv_aus(["Nummer", "Typ", "Datum", "Mitgliedsnr.", "Empfänger", "Zeitraum", "Netto", "USt", "Brutto", "RC-Steuer", "Status", "Prüfsumme"], [[b["nummer"], b["typ"], b["datum"], _js_str(b.get("mitgliedsnummer")) if b.get("mitgliedsnummer") is not None else "", (b.get("empfaenger") or {}).get("name") or "", f"{b['von']} bis {b['bis']}", b["summen"]["netto"], b["summen"]["ust"], b["summen"]["brutto"], b["summen"].get("rcSteuer") or 0, b["status"], (b.get("hash") or "")[:16]] for b in liste]), "mime": "text/csv; charset=utf-8"}
	e = ea or ea_rechnung(buchungen, jahr)
	zeilen = [
		*(["Einnahme", x["konto"], x["label"], x["betrag"]] for x in e["einnahmen"]), ["Summe Einnahmen", "", "", e["summeEinnahmen"]],
		*(["Ausgabe", x["konto"], x["label"], x["betrag"]] for x in e["ausgaben"]), ["Summe Ausgaben", "", "", e["summeAusgaben"]],
		["Ergebnis (Überschuss/Fehlbetrag)", "", "", e["ergebnis"]], ["Vermögen: Bank zum Jahresende", "2800", "", e["vermoegen"]["bankEnde"]], ["Vermögen: Kassa zum Jahresende", "2700", "", e["vermoegen"]["kassaEnde"]],
		["Offene Forderungen", "2000", "", e["vermoegen"]["offeneForderungen"]], ["Offene Verbindlichkeiten", "3300", "", e["vermoegen"]["offeneVerbindlichkeiten"]],
	]
	return {"dateiname": name("Einnahmen-Ausgaben"), "inhalt": _csv_aus(["Art", "Konto", "Bezeichnung", "Betrag"], zeilen), "mime": "text/csv; charset=utf-8"}
