# Copyright (c) 2026, ÖkoInvest GmbH
#
# Finanzen & Abrechnung – reine Logik OHNE Frappe-Import (python -m unittest, siehe test_logik.py).
# 1:1-Spiegel von src/lib/plattform/finanzen/{basis,konstanten,faelligkeit,indexierung,pacht,contracting,provision,afa}.js
# – bei Änderungen beide Seiten nachziehen.

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

# ================================================================ Stammlisten

PACHTMODELLE = {"fest": "Festpacht", "indexiert": "Indexierte Pacht", "umsatz": "Umsatzbeteiligung"}
PACHT_OBJEKTE = {"flaeche": "Fläche (Freifläche / Agri-PV)", "dach": "Dach / Gebäude"}
BEGINN_ARTEN = {"baubeginn": "Baubeginn", "inbetriebnahme": "Inbetriebnahme", "vertrag": "Vertragsbeginn"}
RHYTHMEN = {"jaehrlich": ("jährlich", 12), "halbjaehrlich": ("halbjährlich", 6), "quartalsweise": ("vierteljährlich", 3), "monatlich": ("monatlich", 1)}
ZAHLWEISEN = {"vorschuessig": "im Voraus (vorschüssig)", "nachschuessig": "im Nachhinein (nachschüssig)"}
PACHTVERTRAG_STATUS = {"entwurf": "Entwurf", "aktiv": "Aktiv", "gekuendigt": "Gekündigt", "beendet": "Beendet"}
INDEX_REIHEN = {
	"VPI-AT-2020": ("AT", "VPI 2020 (Österreich)", "Statistik Austria – Verbraucherpreisindex 2020 = 100"),
	"VPI-DE-2020": ("DE", "VPI 2020 (Deutschland)", "Destatis – Verbraucherpreisindex für Deutschland, 2020 = 100"),
	"LIK-CH-2020": ("CH", "LIK Dez. 2020 (Schweiz)", "BFS – Landesindex der Konsumentenpreise, Dezember 2020 = 100"),
}
# Gerundete BEISPIELWERTE (Jahresdurchschnitte) – vor echter Abrechnung mit der amtlichen Veröffentlichung abgleichen
INDEX_STARTWERTE = [
	("VPI-AT-2020", 2020, 100.0), ("VPI-AT-2020", 2021, 102.8), ("VPI-AT-2020", 2022, 111.6), ("VPI-AT-2020", 2023, 120.0), ("VPI-AT-2020", 2024, 123.5), ("VPI-AT-2020", 2025, 127.5),
	("VPI-DE-2020", 2020, 100.0), ("VPI-DE-2020", 2021, 103.1), ("VPI-DE-2020", 2022, 110.2), ("VPI-DE-2020", 2023, 116.7), ("VPI-DE-2020", 2024, 119.3), ("VPI-DE-2020", 2025, 121.9),
	("LIK-CH-2020", 2021, 100.6), ("LIK-CH-2020", 2022, 103.4), ("LIK-CH-2020", 2023, 105.6), ("LIK-CH-2020", 2024, 106.7), ("LIK-CH-2020", 2025, 106.9),
]
ABRECHNUNG_ARTEN = {
	"pacht": {"label": "Pachtabrechnung", "beleg": "gutschrift", "erpnext": "Purchase Invoice", "kreis": "PG", "titel": "Gutschrift – Pachtabrechnung"},
	"contracting": {"label": "Contracting-Rechnung", "beleg": "rechnung", "erpnext": "Sales Invoice", "kreis": "CR", "titel": "Rechnung – Contracting-Strom"},
	"provision": {"label": "Provisionsrechnung", "beleg": "rechnung", "erpnext": "Sales Invoice", "kreis": "PR", "titel": "Rechnung – Vermittlungsprovision"},
}
ZAHLUNGSSTATUS = {"offen": "Offen", "ueberfaellig": "Überfällig", "angewiesen": "Zahlung angewiesen", "bezahlt": "Bezahlt", "storniert": "Storniert"}
KLAERFALL_STATUS = {"offen": "Offen", "erledigt": "Erledigt", "verworfen": "Verworfen"}
LAUF_ARTEN = {"pacht": "Pachtabrechnung", "contracting": "Contracting-Abrechnung", "provision": "Provisionsrechnungen", "alle": "Alle Abrechnungen"}
MAHNSTUFEN = [(7, 1, "Zahlungserinnerung"), (21, 2, "1. Mahnung"), (35, 3, "2. Mahnung / Klärung")]
ARTIKEL = {
	"PACHT": "Pacht", "PACHT-RES": "Reservierungsprämie", "PACHT-UMSATZ": "Pacht Umsatzbeteiligung", "PROVISION": "Vermittlungsprovision Projektbörse",
	"CONTRACTING-STROM": "Contracting-Strom (Arbeitspreis)", "CONTRACTING-GRUND": "Contracting Grundgebühr",
}
KOSTENSTELLEN = {"pacht": "Flächen & Pacht", "contracting": "Contracting & PPA", "provision": "Projektbörse", "entwicklung": "Projektentwicklung", "verwaltung": "Verwaltung"}
KOSTENARTEN = {
	"planung": "Planung & Gutachten", "netz": "Netzanschluss & Netzprüfung", "genehmigung": "Genehmigung & Verfahren", "flaeche": "Flächensicherung (Reservierung/Pacht)",
	"personal": "Personal (Stunden)", "recht": "Recht & Steuern", "sonstiges": "Sonstiges",
}
AFA_NUTZUNGSDAUER = {"pv": 20, "speicher": 10}
MAX_KWH_JE_KWP_MONAT = 270

# ================================================================ Geld und Datum


def rund(x, stellen=2):
	"""Symmetrisch kaufmännisch runden wie rund() in finanzen/basis.js (−1,005 → −1,01; nie −0)."""
	f = 10 ** stellen
	x = float(x or 0)
	r = float(int(abs(x) * f + 0.5 + 1e-9)) / f * (1 if x >= 0 else -1)
	return r if r != 0 else 0.0  # −0.0 vermeiden („-0,00 €“)


def rund2(x):
	"""Kaufmännisch auf Cent (wie rund2 in JS)."""
	return rund(x, 2)


def summe(liste, feld=None):
	return rund2(sum(float((x.get(feld) if feld else x) or 0) for x in liste))


def ist_datum(s):
	try:
		return bool(s) and len(str(s)) == 10 and date.fromisoformat(str(s)).isoformat() == str(s)
	except ValueError:
		return False


def _d(s):
	return date.fromisoformat(str(s)[:10])


def plus_tage(s, n):
	return (_d(s) + timedelta(days=int(n or 0))).isoformat()


def tage_zwischen(a, b):
	return (_d(b) - _d(a)).days


def monats_ende(jahr, monat):
	j, m = jahr + (monat - 1) // 12, (monat - 1) % 12 + 1
	naechster = date(j + (m // 12), m % 12 + 1, 1)
	return (naechster - timedelta(days=1)).isoformat()


def monats_anfang(jahr, monat):
	j, m = jahr + (monat - 1) // 12, (monat - 1) % 12 + 1
	return date(j, m, 1).isoformat()


def monats_zeitraum(monat):
	j, m = int(monat[:4]), int(monat[5:7])
	return {"von": monats_anfang(j, m), "bis": monats_ende(j, m)}


def vormonat(monat):
	j, m = int(monat[:4]), int(monat[5:7])
	return f"{j - 1}-12" if m == 1 else f"{j}-{m - 1:02d}"


def heute(jetzt=None):
	jetzt = jetzt or datetime.now(timezone.utc)
	return jetzt.astimezone(ZoneInfo("Europe/Vienna")).date().isoformat()


def datum_de(s):
	return f"{s[8:10]}.{s[5:7]}.{s[:4]}" if ist_datum(s) else ""


def zahl_de(x, stellen=0):
	t = f"{float(x):,.{stellen}f}"
	return t.replace(",", "X").replace(".", ",").replace("X", ".")


def euro(x):
	return f"{zahl_de(x, 2)} €"


# ================================================================ Fälligkeiten


def periode_von(datum, rhythmus):
	monate = RHYTHMEN.get(rhythmus, ("", 12))[1]
	j, m = int(datum[:4]), int(datum[5:7])
	start = ((m - 1) // monate) * monate + 1
	return {"von": monats_anfang(j, start), "bis": monats_ende(j, start + monate - 1)}


def perioden(ab, bis=None, rhythmus="jaehrlich", stopp=None):
	if not ist_datum(ab):
		return []
	ende = bis if bis and ist_datum(bis) else stopp
	if not ende or ende < ab:
		return []
	monate = RHYTHMEN.get(rhythmus, ("", 12))[1]
	liste = []
	p = periode_von(ab, rhythmus)
	for _ in range(1200):
		if p["von"] > ende:
			break
		von = ab if ab > p["von"] else p["von"]
		bis_tag = bis if bis and bis < p["bis"] else p["bis"]
		voll = tage_zwischen(p["von"], p["bis"]) + 1
		tage = tage_zwischen(von, bis_tag) + 1
		liste.append({"periodeVon": p["von"], "periodeBis": p["bis"], "von": von, "bis": bis_tag, "tage": tage, "tageVoll": voll, "anteil": tage / voll, "monate": monate})
		p = periode_von(plus_tage(p["bis"], 1), rhythmus)
	return liste


def laufzeit_ende(beginn, laufzeit_jahre):
	if not ist_datum(beginn) or not (int(laufzeit_jahre or 0) > 0):
		return None
	j = int(beginn[:4]) + int(laufzeit_jahre)
	ziel = f"{j}{beginn[4:]}"
	# Beginn 29.02.: im Schaltjahr endet die Laufzeit am 28.02., sonst am Monatsende (28.02.) – nie am 27.02. (wie laufzeitEnde in JS)
	return plus_tage(ziel, -1) if ist_datum(ziel) else f"{j}-02-28"


def faelligkeiten(v, stichtag, ausblick_bis=None):
	"""v: {id, vertragsdatum, beginn, laufzeitJahre, faelligkeit, zahlweise, zahlungszielTage, reservierungJahr, vorlaufTage}"""
	rhythmus = v.get("faelligkeit") if v.get("faelligkeit") in RHYTHMEN else "jaehrlich"
	ziel = max(0, int(v.get("zahlungszielTage") if v.get("zahlungszielTage") is not None else 14))
	vorlauf = max(0, int(v.get("vorlaufTage") if v.get("vorlaufTage") is not None else 14))
	stopp = ausblick_bis if ausblick_bis and ausblick_bis > stichtag else stichtag
	aus = []

	def eintrag(phase, p, zahlweise):
		faellig = plus_tage(p["von"], ziel) if zahlweise == "vorschuessig" else plus_tage(p["bis"], 1 + ziel)
		erstellbar = plus_tage(faellig, -vorlauf - ziel) if zahlweise == "vorschuessig" else plus_tage(p["bis"], 1)
		aus.append({
			"schluessel": f"{v.get('id')}:{phase}:{p['von']}", "phase": phase, "von": p["von"], "bis": p["bis"], "anteil": p["anteil"], "tage": p["tage"], "tageVoll": p["tageVoll"],
			"faktorJahr": (p["monate"] / 12) * p["anteil"], "faelligAm": faellig, "erstellbarAb": erstellbar, "zahlweise": zahlweise,
		})

	if float(v.get("reservierungJahr") or 0) > 0 and ist_datum(v.get("vertragsdatum")):
		res_bis = plus_tage(v["beginn"], -1) if ist_datum(v.get("beginn")) else None
		if not res_bis or res_bis >= v["vertragsdatum"]:
			for p in perioden(v["vertragsdatum"], res_bis, rhythmus, stopp):
				eintrag("reservierung", p, "nachschuessig")
	if ist_datum(v.get("beginn")):
		ende = laufzeit_ende(v["beginn"], v.get("laufzeitJahre"))
		for p in perioden(v["beginn"], ende, rhythmus, stopp):
			eintrag("pacht", p, "vorschuessig" if v.get("zahlweise") == "vorschuessig" else "nachschuessig")
	return aus


def abzurechnen(v, stichtag):
	return [f for f in faelligkeiten(v, stichtag) if f["erstellbarAb"] <= stichtag]


def naechste_faelligkeit(v, stichtag):
	for f in faelligkeiten(v, stichtag, plus_tage(stichtag, 800)):
		if f["faelligAm"] >= stichtag:
			return f
	return None


# ================================================================ Indexierung


def index_wert(tabelle, reihe, jahr):
	for t in tabelle or []:
		if t.get("reihe") == reihe and int(t.get("jahr")) == int(jahr) and float(t.get("wert") or 0) > 0:
			return float(t["wert"])
	return None


def index_verlauf(basis_betrag, basis_jahr, reihe, tabelle, bis_jahr, basis_index=None, schwelle_pct=0, anteil_pct=100, nur_erhoehung=False):
	start = float(basis_index) if basis_index and float(basis_index) > 0 else index_wert(tabelle, reihe, basis_jahr)
	betrag = rund2(basis_betrag)
	schritte, fehlt = [], []
	if not start:
		return {"schritte": schritte, "betrag": betrag, "fehlt": [int(basis_jahr)], "basisIndex": None}
	letzter = start
	anteil = max(0.0, min(100.0, float(100 if anteil_pct is None else anteil_pct))) / 100
	schwelle = max(0.0, float(schwelle_pct or 0)) / 100
	for jahr in range(int(basis_jahr) + 1, int(bis_jahr) + 1):
		ref = jahr - 1
		idx = start if ref == int(basis_jahr) else index_wert(tabelle, reihe, ref)
		if not idx:
			fehlt.append(ref)
			schritte.append({"jahr": jahr, "referenzJahr": ref, "index": None, "basisIndex": letzter, "aenderungPct": None, "angepasst": False, "betrag": betrag, "text": f"Indexwert {ref} fehlt – Betrag unverändert"})
			continue
		aenderung = idx / letzter - 1
		angepasst = False
		if abs(aenderung) < 1e-12:
			text = "keine Indexänderung"
		elif nur_erhoehung and aenderung < 0:
			text = "Index gesunken – vereinbart ist nur eine Erhöhung"
		elif abs(aenderung) + 1e-12 < schwelle:
			text = f"Änderung {zahl_de(aenderung * 100, 2)} % unter der Schwelle von {zahl_de(schwelle * 100, 2)} %"
		else:
			alt = betrag
			betrag = rund2(betrag * (1 + anteil * aenderung))
			angepasst = True
			text = f"Anpassung {'+' if aenderung > 0 else ''}{zahl_de(aenderung * anteil * 100, 2)} % (Index {zahl_de(letzter, 1)} → {zahl_de(idx, 1)}): {euro(alt)} → {euro(betrag)}"
		schritte.append({"jahr": jahr, "referenzJahr": ref, "index": idx, "basisIndex": letzter, "aenderungPct": rund(aenderung * 100, 3), "angepasst": angepasst, "betrag": betrag, "text": text})
		if angepasst:
			letzter = idx
	return {"schritte": schritte, "betrag": betrag, "fehlt": fehlt, "basisIndex": start}


def indexierte_pacht(regel, jahr, tabelle):
	if int(jahr) <= int(regel["basisJahr"]):
		return {"betrag": rund2(regel["basisBetrag"]), "schritte": [], "fehlt": [], "basisIndex": regel.get("basisIndex")}
	return index_verlauf(regel["basisBetrag"], regel["basisJahr"], regel["reihe"], tabelle, jahr, regel.get("basisIndex"), regel.get("schwellePct") or 0, regel.get("anteilPct", 100), bool(regel.get("nurErhoehung")))


def index_erklaerung(regel, verlauf):
	label = INDEX_REIHEN.get(regel["reihe"], ("", regel["reihe"]))[1]
	zeilen = [
		f"Ihre Pacht ist wertgesichert über den {label} (Basisjahr {regel['basisJahr']}" + (f", Indexwert {zahl_de(verlauf['basisIndex'], 1)}" if verlauf.get("basisIndex") else "") + ").",
		f"Angepasst wird, sobald sich der Index seit der letzten Anpassung um mindestens {zahl_de(regel.get('schwellePct'), 1)} % verändert hat." if float(regel.get("schwellePct") or 0) > 0 else "Angepasst wird jährlich zum 1. Januar anhand des Jahresdurchschnitts des Vorjahres.",
	]
	if float(regel.get("anteilPct", 100) if regel.get("anteilPct") is not None else 100) < 100:
		zeilen.append(f"Weitergegeben werden {zahl_de(regel['anteilPct'], 0)} % der Indexänderung.")
	zeilen += [f"{s['jahr']}: {s['text']}" for s in verlauf["schritte"] if s["angepasst"] or s["index"] is None]
	return zeilen


# ================================================================ Pacht


def umsatzbeteiligung(ertrag_kwh, erloes_ct_kwh, anteil, mindest_jahr=0, faktor_jahr=1):
	erloes = rund2(float(ertrag_kwh or 0) * float(erloes_ct_kwh or 0) / 100)
	anteil_eur = rund2(erloes * float(anteil or 0))
	mindest = rund2(float(mindest_jahr or 0) * faktor_jahr)
	return {"erloesEur": erloes, "anteilEur": anteil_eur, "mindestEur": mindest, "betrag": rund2(max(anteil_eur, mindest)), "mindestGreift": mindest > anteil_eur}


def _zeitraum_text(f):
	t = f"{datum_de(f['von'])} – {datum_de(f['bis'])}"
	return t + (f" (anteilig {f.get('tage')}/{f.get('tageVoll')} Tage)" if f.get("anteil", 1) < 0.9999 else "")


def pacht_positionen(vertrag, f, index_tabelle=(), ertrag_kwh=None, ertrag_fehlt=()):
	pos, erkl, klaerung = [], [], None
	ha = float(vertrag.get("flaecheHa") or 0)
	jahr = int(f["von"][:4])
	if f["phase"] == "reservierung":
		res = float(vertrag.get("reservierungJahr") or 0)
		pos.append({"art": "reservierung", "artikel": "PACHT-RES", "text": f"Reservierungsprämie {_zeitraum_text(f)}", "menge": rund(f["faktorJahr"], 4), "einheit": "Jahr", "preis": rund2(res), "betrag": rund2(res * f["faktorJahr"])})
		erkl.append(f"Bis zum Pachtbeginn erhalten Sie eine Reservierungsprämie von {zahl_de(res, 2)} € pro Jahr" + (f" ({zahl_de(res / ha, 2)} €/ha)" if ha else "") + ", abgerechnet nach Ablauf jedes Zeitraums.")
		return {"positionen": pos, "netto": summe(pos, "betrag"), "erklaerung": erkl, "klaerung": None, "basis": {"jahresbetrag": rund2(res)}}
	if vertrag.get("modell") == "umsatz":
		u = vertrag.get("umsatz") or {}
		if ertrag_kwh is None or ertrag_fehlt:
			return {"positionen": [], "netto": 0, "erklaerung": [], "klaerung": f"Ertragsdaten der Anlage fehlen für {', '.join(ertrag_fehlt) if ertrag_fehlt else 'den Zeitraum'} – Umsatzbeteiligung kann nicht berechnet werden.", "basis": {}}
		r = umsatzbeteiligung(ertrag_kwh, u.get("erloesCtKwh"), u.get("anteil"), u.get("mindestJahr"), f["faktorJahr"])
		pos.append({"art": "umsatz", "artikel": "PACHT-UMSATZ", "text": f"Umsatzbeteiligung {zahl_de(float(u.get('anteil') or 0) * 100, 2)} % {_zeitraum_text(f)} – Erlös {zahl_de(r['erloesEur'], 2)} € ({zahl_de(ertrag_kwh)} kWh × {zahl_de(u.get('erloesCtKwh'), 3)} ct/kWh)", "menge": 1, "einheit": "Pauschale", "preis": r["anteilEur"], "betrag": r["anteilEur"]})
		if r["mindestGreift"]:
			diff = rund2(r["mindestEur"] - r["anteilEur"])
			pos.append({"art": "mindest", "artikel": "PACHT-UMSATZ", "text": f"Aufstockung auf die Mindestpacht ({zahl_de(u.get('mindestJahr'), 2)} €/Jahr, anteilig {zahl_de(r['mindestEur'], 2)} €)", "menge": 1, "einheit": "Pauschale", "preis": diff, "betrag": diff})
		erkl.append(f"Sie erhalten {zahl_de(float(u.get('anteil') or 0) * 100, 2)} % der Stromerlöse der Anlage, mindestens {zahl_de(u.get('mindestJahr'), 2)} € pro Jahr. Grundlage sind die geeichten Zählerstände (Erzeugung) und ein vereinbarter Erlös von {zahl_de(u.get('erloesCtKwh'), 3)} ct/kWh.")
		if r["mindestGreift"]:
			erkl.append("In diesem Zeitraum lag der Erlösanteil unter der Mindestpacht – ausgezahlt wird die Mindestpacht.")
		return {"positionen": pos, "netto": summe(pos, "betrag"), "erklaerung": erkl, "klaerung": None, "basis": {**r, "ertragKwh": ertrag_kwh}}
	jahresbetrag = rund2(vertrag.get("pachtJahr"))
	if vertrag.get("modell") == "indexiert":
		regel = {**(vertrag.get("index") or {}), "basisBetrag": vertrag.get("pachtJahr")}
		verlauf = indexierte_pacht(regel, jahr, index_tabelle)
		if verlauf["fehlt"]:
			klaerung = f"Indexwert fehlt ({INDEX_REIHEN.get(regel.get('reihe'), ('', regel.get('reihe')))[1]}, {', '.join(str(x) for x in verlauf['fehlt'])}) – bitte unter „Index (VPI)“ nachtragen."
		jahresbetrag = verlauf["betrag"]
		erkl += index_erklaerung(regel, verlauf)
		erkl.append(f"Jahrespacht {jahr}: {zahl_de(jahresbetrag, 2)} € (Ausgangswert {zahl_de(vertrag.get('pachtJahr'), 2)} €).")
	else:
		erkl.append(f"Feste Jahrespacht {zahl_de(jahresbetrag, 2)} €" + (f" ({zahl_de(jahresbetrag / ha, 2)} €/ha bei {zahl_de(ha, 2)} ha)" if ha else "") + ".")
	pos.append({"art": "index" if vertrag.get("modell") == "indexiert" else "pacht", "artikel": "PACHT", "text": f"{'Pacht (wertgesichert)' if vertrag.get('modell') == 'indexiert' else 'Pacht'} {_zeitraum_text(f)}", "menge": rund(f["faktorJahr"], 4), "einheit": "Jahr", "preis": jahresbetrag, "betrag": rund2(jahresbetrag * f["faktorJahr"])})
	return {"positionen": pos, "netto": summe(pos, "betrag"), "erklaerung": erkl, "klaerung": klaerung, "basis": {"jahresbetrag": jahresbetrag}}


def monate_im_zeitraum(von, bis):
	j, m = int(von[:4]), int(von[5:7])
	jb, mb = int(bis[:4]), int(bis[5:7])
	aus = []
	while j < jb or (j == jb and m <= mb):
		aus.append(f"{j}-{m:02d}")
		m += 1
		if m > 12:
			m, j = 1, j + 1
	return aus


def ertrag_aus_monatswerten(zeilen, messpunkte, von, bis):
	erz = {m["id"] for m in messpunkte or [] if m.get("art") == "erzeugung" and m.get("abrechnungsrelevant")}
	if not erz:
		return {"kwh": None, "fehlt": ["kein abrechnungsrelevanter Erzeugungszähler"]}
	fehlt, kwh = [], 0.0
	for monat in monate_im_zeitraum(von, bis):
		werte = [z for z in zeilen or [] if z.get("monat") == monat and z.get("messpunktId") in erz and z.get("register") == "2.8.0"]
		if len(werte) < len(erz) or any(w.get("menge") is None for w in werte):
			fehlt.append(monat)
			continue
		j, mm = int(monat[:4]), int(monat[5:7])
		tage_monat = int(monats_ende(j, mm)[8:10])
		start = int(von[8:10]) if monat == von[:7] else 1
		ende = int(bis[8:10]) if monat == bis[:7] else tage_monat
		kwh += sum(float(w["menge"]) for w in werte) * ((ende - start + 1) / tage_monat)
	return {"kwh": None if fehlt else round(kwh), "fehlt": fehlt}


# ================================================================ Contracting


REIHE_LAND = {"DE": "VPI-DE-2020", "AT": "VPI-AT-2020", "CH": "LIK-CH-2020"}


def arbeitspreis(vertrag, monat, index_tabelle=(), land="DE"):
	"""Preisgleitung (indexBasis): fest · prozent (% p. a. je volles Vertragsjahr) · vpi (jährlich, Basis Jahr vor Beginn) · strompreis (→ fehlt)."""
	basis = float(vertrag.get("strompreisCt") or 0)
	pct = float(vertrag.get("indexierungPct") or 0)
	art = vertrag.get("indexBasis") or ("prozent" if pct else "fest")
	j, m = int(monat[:4]), int(monat[5:7])
	if art == "fest" or not vertrag.get("beginn"):
		return {"ct": rund(basis, 3), "jahre": 0, "art": art}
	if art == "strompreis":
		return {"ct": rund(basis, 3), "jahre": 0, "art": art, "fehlt": "Preisgleitung nach Strompreisindex vereinbart – Indexwerte sind nicht hinterlegt. Arbeitspreis bitte manuell festlegen."}
	if art == "vpi":
		reihe = REIHE_LAND.get(land, "VPI-AT-2020")
		r = indexierte_pacht({"basisBetrag": basis * 1000, "basisJahr": int(str(vertrag["beginn"])[:4]) - 1, "reihe": reihe}, j, index_tabelle)
		return {"ct": rund(r["betrag"] / 1000, 3), "jahre": 0, "art": art, "reihe": reihe, "fehlt": f"Indexwert fehlt ({reihe}, {', '.join(str(x) for x in r['fehlt'])}) – bitte unter „Index (VPI)“ nachtragen." if r["fehlt"] else None}
	jahre = j - int(str(vertrag["beginn"])[:4]) - (1 if m < int(str(vertrag["beginn"])[5:7]) else 0)
	jahre = max(0, jahre)
	return {"ct": rund(basis * (1 + pct / 100) ** jahre, 3), "jahre": jahre, "art": art}


def contracting_abrechnen(vertrag, anlage, monat, messpunkte, zeilen, index_tabelle=()):
	klaerung, hinweise, staende = [], [], []
	if not vertrag:
		return {"ok": False, "klaerung": ["Kein Contracting-Vertrag hinterlegt."], "positionen": [], "netto": 0}
	relevant = [m for m in messpunkte or [] if m.get("abrechnungsrelevant")]
	preis = arbeitspreis(vertrag, monat, index_tabelle, (anlage or {}).get("land"))
	mit_arbeit = preis["ct"] > 0
	if mit_arbeit and preis.get("fehlt"):
		klaerung.append(preis["fehlt"])
	if float(vertrag.get("mindestabnahmeKwhJahr") or 0) > 0:
		hinweise.append(f"Mindestabnahme {zahl_de(vertrag['mindestabnahmeKwhJahr'])} kWh/Jahr vereinbart – ein Ausgleich (Take-or-Pay) erfolgt in der Jahresabrechnung, nicht monatlich.")

	def wert(mp, reg):
		return next((z for z in zeilen or [] if z.get("monat") == monat and z.get("messpunktId") == mp["id"] and z.get("register") == reg), None)

	def menge(art, reg):
		s, gefunden = 0.0, False
		for mp in [m for m in relevant if m.get("art") == art]:
			w = wert(mp, reg)
			if not w:
				klaerung.append(f"Monatswert {monat} fehlt: Zähler {mp.get('zaehlernummer')} ({mp.get('bezeichnung') or art}), Register {reg}.")
				continue
			if w.get("menge") is None:
				klaerung.append(f"Menge {monat} nicht berechenbar (Vormonatsstand fehlt): Zähler {mp.get('zaehlernummer')}, Register {reg}.")
				continue
			gefunden = True
			if not w.get("geprueft"):
				hinweise.append(f"Zählerstand {mp.get('zaehlernummer')}/{reg} noch nicht als geprüft markiert ({w.get('quelle') or 'Quelle unbekannt'}).")
			staende.append({"zaehlernummer": mp.get("zaehlernummer"), "bezeichnung": mp.get("bezeichnung") or "", "register": reg, "anfang": rund(float(w["stand"]) - float(w["menge"]), 3), "ende": float(w["stand"]), "menge": float(w["menge"])})
			s += float(w["menge"])
		return s if gefunden else None

	geliefert = 0
	if mit_arbeit:
		if any(m.get("art") == "erzeugung" for m in relevant):
			erz = menge("erzeugung", "2.8.0")
			einsp = menge("zweirichtung", "2.8.0") if any(m.get("art") == "zweirichtung" for m in relevant) else 0
			if erz is not None and einsp is not None:
				geliefert = round(erz - einsp)
				if geliefert < 0:
					klaerung.append(f"Einspeisung ({zahl_de(einsp)} kWh) größer als Erzeugung ({zahl_de(erz)} kWh) – Zählerzuordnung prüfen.")
				if float(anlage.get("kwp") or 0) > 0 and erz > float(anlage["kwp"]) * MAX_KWH_JE_KWP_MONAT:
					klaerung.append(f"Erzeugung {zahl_de(erz)} kWh unplausibel hoch für {zahl_de(anlage['kwp'])} kWp (> {MAX_KWH_JE_KWP_MONAT} kWh/kWp im Monat).")
		elif any(m.get("art") == "verbrauch" for m in relevant):
			v = menge("verbrauch", "1.8.0")
			if v is not None:
				geliefert = round(v)
		else:
			klaerung.append("Kein abrechnungsrelevanter Erzeugungs- oder Verbrauchszähler – Arbeitspreis kann nicht abgerechnet werden.")
	if klaerung:
		return {"ok": False, "klaerung": klaerung, "positionen": [], "netto": 0, "gelieferteKwh": None, "zaehlerstaende": staende, "hinweise": hinweise}
	z = monats_zeitraum(monat)
	pos = []
	if mit_arbeit:
		pos.append({"art": "arbeit", "artikel": "CONTRACTING-STROM", "text": f"PV-Strom {datum_de(z['von'])} – {datum_de(z['bis'])}: {zahl_de(geliefert)} kWh × {zahl_de(preis['ct'], 3)} ct/kWh" + (f" (indexiert, {preis['jahre']}. Vertragsjahr +{zahl_de(vertrag.get('indexierungPct'), 2)} % p. a.)" if preis["jahre"] else ""), "menge": geliefert, "einheit": "kWh", "preis": rund(preis["ct"] / 100, 5), "betrag": rund2(geliefert * preis["ct"] / 100)})
	if float(vertrag.get("grundgebuehrMonat") or 0) > 0:
		pos.append({"art": "grund", "artikel": "CONTRACTING-GRUND", "text": f"Grundgebühr {monat[5:]}/{monat[:4]}", "menge": 1, "einheit": "Monat", "preis": rund2(vertrag["grundgebuehrMonat"]), "betrag": rund2(vertrag["grundgebuehrMonat"])})
	if not pos:
		return {"ok": False, "klaerung": ["Weder Arbeitspreis noch Grundgebühr vereinbart – nichts abzurechnen."], "positionen": [], "netto": 0, "zaehlerstaende": staende, "hinweise": hinweise}
	return {"ok": True, "klaerung": [], "positionen": pos, "netto": summe(pos, "betrag"), "gelieferteKwh": geliefert if mit_arbeit else None, "arbeitspreisCt": preis["ct"], "zaehlerstaende": staende, "hinweise": hinweise}


# ================================================================ Provision, Zahlungsstatus


def provision_positionen(provision, projekt_titel=""):
	satz = float(provision.get("satz") or 0)
	kaufpreis = float(provision.get("kaufpreis") or 0)
	betrag = rund2(float(provision.get("betrag") or 0) or kaufpreis * satz)
	return [{"art": "provision", "artikel": "PROVISION", "text": f"Vermittlungsprovision Projektbörse {zahl_de(satz * 100, 2 if (satz * 100) % 1 else 0)} % auf den Kaufpreis von {zahl_de(kaufpreis, 2)} €" + (f" – Projekt „{projekt_titel}“" if projekt_titel else "") + f" ({provision.get('projektId') or ''})", "menge": 1, "einheit": "Pauschale", "preis": betrag, "betrag": betrag}]


def zahlungsstatus(beleg, heute_=None):
	if not beleg:
		return "offen"
	if beleg.get("status") in ("bezahlt", "storniert", "angewiesen"):
		return beleg["status"]
	if beleg.get("faelligAm") and heute_ and str(beleg["faelligAm"]) < heute_:
		return "ueberfaellig"
	return "offen"


def mahnhinweis(beleg, heute_):
	if zahlungsstatus(beleg, heute_) != "ueberfaellig":
		return None
	tage = tage_zwischen(str(beleg["faelligAm"]), heute_)
	erreicht = [s for s in MAHNSTUFEN if tage >= s[0]]
	letzte = max([int(m.get("stufe") or 0) for m in beleg.get("mahnungen") or []] or [0])
	if not erreicht:
		return {"tage": tage, "stufe": 0, "label": "Überfällig – noch keine Mahnstufe", "faellig": False}
	_, stufe, label = erreicht[-1]
	return {"tage": tage, "stufe": stufe, "label": label, "faellig": stufe > letzte, "text": f"Seit {tage} Tagen überfällig (fällig {datum_de(str(beleg['faelligAm']))}) – empfohlen: {label}"}


def provision_status_aus_rechnung(rechnung):
	if not rechnung or rechnung.get("status") == "storniert":
		return "offen"
	return "bezahlt" if rechnung.get("status") == "bezahlt" else "in_rechnung"


# ================================================================ AfA, Projektcontrolling


def afa_plan(anschaffungswert, nutzungsdauer_jahre, inbetriebnahme, regel="AT", restwert=0):
	basis = rund2(float(anschaffungswert or 0) - float(restwert or 0))
	nd = int(round(float(nutzungsdauer_jahre or 0)))
	if basis <= 0 or nd <= 0 or not ist_datum(inbetriebnahme):
		return []
	jahres = basis / nd
	j0, m0 = int(inbetriebnahme[:4]), int(inbetriebnahme[5:7])
	erster = (0.5 if m0 > 6 else 1) if regel == "AT" else (13 - m0) / 12
	plan, rest, i = [], basis, 0
	while rest > 0.004 and i <= nd + 1:
		soll = jahres * erster if i == 0 else jahres
		afa = rund2(min(rest, soll))
		rest = rund2(rest - afa)
		plan.append({"jahr": j0 + i, "afa": afa, "restbuchwert": rund2(rest + float(restwert or 0))})
		i += 1
	return plan


def budget_vergleich(kosten, budget=None, mwp=None):
	ist = rund2(sum(float(k.get("betrag") or 0) for k in kosten))
	je_art = {}
	for k in kosten:
		a = k.get("kostenart") or "sonstiges"
		je_art[a] = rund2(je_art.get(a, 0) + float(k.get("betrag") or 0))
	quote = ist / float(budget) if budget else None
	return {
		"ist": ist, "jeArt": je_art, "budget": budget, "abweichung": rund2(ist - float(budget)) if budget is not None else None,
		"quote": round(quote, 3) if quote is not None else None, "ampel": "offen" if quote is None else "rot" if quote > 1 else "gelb" if quote > 0.85 else "gruen",
		"jeMwp": rund2(ist / float(mwp)) if mwp and float(mwp) > 0 else None,
	}
