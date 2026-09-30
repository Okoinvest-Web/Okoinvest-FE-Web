# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiebeschaffung & Versorger-Ausschreibung – reine Rechenlogik (OHNE Frappe, testbar mit `python -m unittest`).
# Gleiche Regeln wie src/lib/plattform/energie/{markt,beschaffung,ausschreibung,los}.js:
#  - Zeit: Ortszeit MEZ/MESZ (EU-Regel, DE/AT), Peak = Mo–Fr 08–20 Uhr Ortszeit (EEX-Konvention)
#  - Terminmarkt: Produktcodes Cal-JJ / Qn-JJ / Mmm-JJ, Prüfung eingespielter Kurse (Quelle Pflicht), Kaskade M → Q → Cal
#  - Stundenpreiskurve (HPFC) Peak/Offpeak je Monat, Normierung von Angeboten auf das Kundenprofil, Ranking, Sensitivität
#  - Wechselanalyse (ausschreiben | abwarten | verlaengern | pruefen), Kündigungsstichtag, Fristen-Alarmstufen
#  - Anonymisierung des Loses, Bestpreis-Hinweis ohne Namen, Portfolio (Hedge-Quote, Mark-to-Market, Risiko)
# Die Website rechnet dieselben Werte; Abweichungen < 1 € je Jahr durch Rundung sind möglich.

import calendar
import math
from datetime import datetime, timedelta, timezone

H = 3600

# ================================================================ Zeit


def _letzter_sonntag(jahr, monat):
	tage = calendar.monthrange(jahr, monat)[1]
	d = datetime(jahr, monat, tage, tzinfo=timezone.utc)
	return tage - ((d.weekday() + 1) % 7)


def sommerzeit_grenzen(jahr):
	"""Beginn/Ende der Sommerzeit (01:00 UTC am letzten Sonntag im März/Oktober) als UTC-Sekunden."""
	b = datetime(jahr, 3, _letzter_sonntag(jahr, 3), 1, tzinfo=timezone.utc).timestamp()
	e = datetime(jahr, 10, _letzter_sonntag(jahr, 10), 1, tzinfo=timezone.utc).timestamp()
	return b, e


def ortszeit(ts):
	"""UTC-Sekunden → Ortszeit (datetime ohne Zeitzone) MEZ/MESZ."""
	j = datetime.fromtimestamp(ts, timezone.utc).year
	b, e = sommerzeit_grenzen(j)
	versatz = 2 if b <= ts < e else 1
	return datetime.fromtimestamp(ts, timezone.utc).replace(tzinfo=None) + timedelta(hours=versatz)


def ist_peak(ts):
	o = ortszeit(ts)
	return o.weekday() < 5 and 8 <= o.hour < 20


def monats_beginn(monat):
	"""„JJJJ-MM“ → UTC-Sekunden der Mitternacht (Ortszeit) am Monatsersten."""
	j, m = (int(x) for x in monat.split("-"))
	sommer = datetime(j, m, 1, tzinfo=timezone.utc).timestamp() - 2 * H
	return sommer if ortszeit(sommer).hour == 0 else sommer + H


def naechster_monat(monat):
	j, m = (int(x) for x in monat.split("-"))
	return f"{j + 1}-01" if m == 12 else f"{j}-{m + 1:02d}"


def monate_zwischen(von, bis):
	out, m = [], von
	while m <= bis and len(out) < 240:
		out.append(m)
		m = naechster_monat(m)
	return out


def zwoelf_monate(von):
	m = von
	for _ in range(11):
		m = naechster_monat(m)
	return m


# ================================================================ Terminmarkt

ZONEN = {"DE": "DE-LU", "AT": "AT"}
TERMIN_TYPEN = ("base", "peak")


def produkt_zeitraum(code):
	import re

	m = re.match(r"^(Cal|Q[1-4]|M(0[1-9]|1[0-2]))-(\d{2})$", str(code or "").strip())
	if not m:
		return None
	jahr = 2000 + int(m.group(3))
	if m.group(1) == "Cal":
		return {"code": m.group(0), "art": "cal", "jahr": jahr, "von": f"{jahr}-01", "bis": f"{jahr}-12", "monate": 12}
	if m.group(1)[0] == "Q":
		q = int(m.group(1)[1])
		v = (q - 1) * 3 + 1
		return {"code": m.group(0), "art": "quartal", "jahr": jahr, "von": f"{jahr}-{v:02d}", "bis": f"{jahr}-{v + 2:02d}", "monate": 3}
	mo = int(m.group(1)[1:])
	return {"code": m.group(0), "art": "monat", "jahr": jahr, "von": f"{jahr}-{mo:02d}", "bis": f"{jahr}-{mo:02d}", "monate": 1}


def _datum(s):
	import re

	x = str(s or "").strip()
	if re.match(r"^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$", x):
		return x
	m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", x)
	if m:
		return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
	return ""


def termin_eintrag_pruefen(d):
	"""→ (eintrag, fehler). Pflicht: Handelstag, Zone, Produkt, Typ, Preis €/MWh, Quelle."""
	handelstag = _datum(d.get("handelstag"))
	zone = str(d.get("zone") or "").upper().replace("DE-LU", "DE")
	p = produkt_zeitraum(d.get("produkt"))
	typ = str(d.get("typ") or "").lower()
	try:
		preis = float(str(d.get("preisEurMwh") if d.get("preisEurMwh") is not None else d.get("preis_eur_mwh", "")).replace(",", "."))
	except ValueError:
		preis = None
	quelle = " ".join(str(d.get("quelle") or "").split())[:160]
	if not handelstag:
		return None, "Handelstag fehlt oder ist ungültig (TT.MM.JJJJ oder JJJJ-MM-TT)."
	if zone not in ZONEN:
		return None, "Zone muss DE oder AT sein."
	if not p:
		return None, "Produkt ungültig – erwartet z. B. Cal-27, Q1-27 oder M11-26."
	if typ not in TERMIN_TYPEN:
		return None, "Typ muss base oder peak sein."
	if preis is None or not math.isfinite(preis) or not -500 < preis < 3000:
		return None, "Preis in €/MWh fehlt oder ist ungültig."
	if len(quelle) < 3:
		return None, "Bitte die Quelle angeben."
	return {"handelstag": handelstag, "zone": zone, "produkt": p["code"], "typ": typ, "preisEurMwh": round(preis, 2), "quelle": quelle}, None


def termin_csv_parsen(text, quelle_standard=""):
	zeilen = [z.strip() for z in str(text or "").lstrip("﻿").splitlines() if z.strip()]
	if len(zeilen) < 2:
		return [], [{"zeile": 1, "text": "Kopfzeile und mindestens eine Datenzeile erwartet."}]
	sep = ";" if ";" in zeilen[0] else ("\t" if "\t" in zeilen[0] else ",")
	kopf = [k.strip().strip('"').lower() for k in zeilen[0].split(sep)]

	def idx(*namen):
		for i, k in enumerate(kopf):
			if any(k.startswith(n) for n in namen):
				return i
		return -1

	sp = {"handelstag": idx("handelstag", "datum", "trading", "tag"), "zone": idx("zone", "markt", "gebiet"), "produkt": idx("produkt", "product", "kontrakt"), "typ": idx("typ", "type", "last"), "preis": idx("preis", "price", "settlement"), "quelle": idx("quelle", "source")}
	for k, i in sp.items():
		if i < 0 and k != "quelle":
			return [], [{"zeile": 1, "text": f"Spalte „{k}“ fehlt in der Kopfzeile."}]
	eintraege, fehler = [], []
	for n, z in enumerate(zeilen[1:5001], start=2):
		f = [x.strip().strip('"') for x in z.split(sep)]
		g = lambda i: f[i] if 0 <= i < len(f) else ""  # noqa: E731
		e, err = termin_eintrag_pruefen({"handelstag": g(sp["handelstag"]), "zone": g(sp["zone"]), "produkt": g(sp["produkt"]), "typ": g(sp["typ"]), "preisEurMwh": g(sp["preis"]), "quelle": g(sp["quelle"]) or quelle_standard})
		if e:
			eintraege.append(e)
		else:
			fehler.append({"zeile": n, "text": err})
	return eintraege, fehler


def aktuelle_kurve(eintraege, stichtag="9999-12-31"):
	k = {}
	for e in eintraege:
		if e["handelstag"] > stichtag:
			continue
		key = f"{e['zone']}|{e['produkt']}|{e['typ']}"
		alt = k.get(key)
		if not alt or e["handelstag"] > alt["handelstag"] or (e["handelstag"] == alt["handelstag"] and str(e.get("am") or "") > str(alt.get("am") or "")):
			k[key] = e
	return k


def termin_preis_monat(kurve, zone, monat, typ="base"):
	j, m = (int(x) for x in monat.split("-"))
	jj = str(j)[2:]
	for p in (f"M{m:02d}-{jj}", f"Q{(m - 1) // 3 + 1}-{jj}", f"Cal-{jj}"):
		e = kurve.get(f"{zone}|{p}|{typ}")
		if e:
			return {"preis": e["preisEurMwh"], "produkt": p, "handelstag": e["handelstag"], "demo": bool(e.get("demo"))}
	return None


def termin_preis_zeitraum(kurve, zone, von, bis, typ="base"):
	s = n = 0
	for m in monate_zwischen(von, bis):
		p = termin_preis_monat(kurve, zone, m, typ)
		if not p:
			return None
		stunden = (monats_beginn(naechster_monat(m)) - monats_beginn(m)) / H
		s += p["preis"] * stunden
		n += stunden
	return round(s / n, 2) if n else None


def stundenpreiskurve(kurve, zone, von, bis, ersatz_base=90.0):
	"""HPFC ohne Stundenform: je Monat Peak- bzw. Offpeak-Preis (Offpeak aus Base und Peak). → (start, werte[], fehlend[])"""
	start = monats_beginn(von)
	ende = monats_beginn(naechster_monat(bis))
	werte = [0.0] * int(round((ende - start) / H))
	fehlend = []
	for m in monate_zwischen(von, bis):
		a, b = monats_beginn(m), monats_beginn(naechster_monat(m))
		be = termin_preis_monat(kurve, zone, m, "base")
		pe = termin_preis_monat(kurve, zone, m, "peak")
		if not be:
			fehlend.append(m)
		base = be["preis"] if be else ersatz_base
		peak = pe["preis"] if pe else base * 1.08
		stunden = list(range(int(a), int(b), H))
		np_ = sum(1 for t in stunden if ist_peak(t))
		na = len(stunden)
		off = (base * na - peak * np_) / (na - np_) if na - np_ else base
		for t in stunden:
			werte[int(round((t - start) / H))] = peak if ist_peak(t) else off
	return start, werte, fehlend


# ================================================================ Kundenprofil (synthetisch bzw. aus Lastgang-Analyse)


def _wochenform(profil):
	f = [[0.0] * 24 for _ in range(7)]
	for wt in range(7):
		for h in range(24):
			if profil == "dreischicht":
				x = 1 if wt < 5 else (0.75 if wt == 5 else 0.55)
			elif profil == "zweischicht":
				x = (1.35 if 6 <= h < 22 else 0.35) if wt < 5 else ((0.7 if 7 <= h < 14 else 0.3) if wt == 5 else 0.25)
			elif profil == "handel":
				x = (1.3 if 7 <= h < 20 else 0.45) if wt < 6 else 0.35
			else:
				x = (1.6 if 6 <= h < 16 else 0.3) if wt < 5 else 0.22
			f[wt][h] = x
	m = sum(sum(r) for r in f) / 168
	return [[x / m for x in r] for r in f]


SAISON = [1.1, 1.08, 1.03, 0.98, 0.94, 0.9, 0.9, 0.92, 0.97, 1.02, 1.07, 1.1]


def kunden_reihe(von, jahres_kwh, profil="einschicht", analyse=None, bis=None):
	"""Stundenreihe (kWh je Stunde) für 12 Monate ab `von` – Lastgang-Analyse (Wochenprofil + Monate) oder synthetisch."""
	bis = bis or zwoelf_monate(von)
	start = monats_beginn(von)
	werte = [0.0] * int(round((monats_beginn(naechster_monat(bis)) - start) / H))
	hat_lg = bool(analyse and len(analyse.get("wochenprofil") or []) == 7 and len(analyse.get("monate") or []) == 12)
	form = analyse["wochenprofil"] if hat_lg else _wochenform(profil)
	if hat_lg:
		voll = [m["kwh"] for m in analyse["monate"] if m.get("kwh")]
		mittel = sum(voll) / len(voll) if voll else jahres_kwh / 12
		mk = [(m["kwh"] if m.get("kwh") and m.get("vollstaendig") is not False else mittel) for m in analyse["monate"]]
		ziel = jahres_kwh or analyse.get("jahresverbrauchKwh") or 0
		s = sum(mk)
		mk = [x * ziel / s for x in mk] if ziel and s else mk
	else:
		s = sum(SAISON)
		mk = [jahres_kwh * x / s for x in SAISON]
	for mm in monate_zwischen(von, bis):
		mi = int(mm[5:]) - 1
		a, b = monats_beginn(mm), monats_beginn(naechster_monat(mm))
		stunden = list(range(int(a), int(b), H))
		gew = []
		for t in stunden:
			o = ortszeit(t)
			gew.append(max(0.0, form[o.weekday()][o.hour]))
		sg = sum(gew)
		for t, g in zip(stunden, gew):
			werte[int(round((t - start) / H))] = g * mk[mi] / sg if sg else 0
	return start, werte


def normierung_kontext(reihe, hpfc):
	(rs, rw), (hs, hw) = reihe, hpfc
	kwh = last = base = n = 0
	for i, x in enumerate(rw):
		j = int(round((rs + i * H - hs) / H))
		if 0 <= j < len(hw):
			kwh += x
			last += x * hw[j]
			base += hw[j]
			n += 1
	return {"kwh": kwh, "lastgewichtetEurMwh": last / kwh if kwh else None, "baseEurMwh": base / n if n else None}


# ================================================================ Angebote

PRODUKT_ARTEN = ("fix", "tranchen", "spot")
SICHERHEITEN = ("keine", "vorauszahlung", "buergschaft", "garantie", "kaution")
BESTPREIS_REGELN = ("aus", "rang", "abstand", "bestpreis")
MARKT_EXPOSITION = {"fix": 0.0, "tranchen": 0.5, "spot": 1.0}


def produkte_bereinigen(liste):
	out = []
	for p in (liste or [])[:8]:
		art = p.get("art") if isinstance(p, dict) else None
		if art not in PRODUKT_ARTEN:
			continue
		lz = int(p.get("laufzeitJahre") or 1) if int(p.get("laufzeitJahre") or 1) in (1, 2, 3) else 1
		tr = min(24, max(2, round(float(p.get("tranchen") or 4)))) if art == "tranchen" else None
		out.append({"id": f"P{len(out) + 1}", "art": art, "laufzeitJahre": lz, "tranchen": tr, "gruen": p.get("gruen") in (True, "ja")})
	if not out:
		raise ValueError("Bitte mindestens eine Produktvariante wählen (Festpreis, Tranchen oder Spot-Index).")
	return out


def _zahl(v, lo, hi, stellen=3):
	if v in (None, "") or isinstance(v, (bool, dict, list)):
		return None
	try:
		n = float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if not math.isfinite(n) or n < lo or n > hi:
		return None
	return round(n, stellen)


def preisblatt_pruefen(eingabe, produkte, frist_ts=None):
	"""Preisblatt prüfen → dict; ValueError mit deutscher Meldung bei fehlenden Pflichtangaben."""
	positionen, gesehen = [], set()
	for x in (eingabe.get("positionen") or [])[:8]:
		p = next((y for y in produkte if y["id"] == (x or {}).get("produktId")), None)
		if not p or p["id"] in gesehen:
			continue
		gesehen.add(p["id"])
		pos = {"produktId": p["id"], "art": p["art"], "arbeitspreisCt": None, "aufschlagCt": None, "grundpreisEurMonat": _zahl(x.get("grundpreisEurMonat"), 0, 100000, 2), "hknCt": None, "mengentoleranzProzent": _zahl(x.get("mengentoleranzProzent"), 0, 100, 1)}
		if p["art"] == "fix":
			pos["arbeitspreisCt"] = _zahl(x.get("arbeitspreisCt"), 0.5, 100)
			if pos["arbeitspreisCt"] is None:
				raise ValueError(f"{p['id']}: Arbeitspreis in ct/kWh fehlt oder ist unplausibel (0,5–100).")
		else:
			pos["aufschlagCt"] = _zahl(x.get("aufschlagCt"), -5, 20)
			if pos["aufschlagCt"] is None:
				raise ValueError(f"{p['id']}: Aufschlag in ct/kWh fehlt oder ist unplausibel (−5 bis 20).")
		if pos["grundpreisEurMonat"] is None:
			raise ValueError(f"{p['id']}: Grundpreis in €/Monat fehlt (0 ist zulässig).")
		if p["gruen"]:
			pos["hknCt"] = _zahl(x.get("hknCt"), 0, 10)
			if pos["hknCt"] is None:
				raise ValueError(f"{p['id']}: Aufschlag für Herkunftsnachweise fehlt (0 ist zulässig).")
		positionen.append(pos)
	if not positionen:
		raise ValueError("Bitte mindestens eine Produktvariante bepreisen.")
	try:
		bf = datetime.fromisoformat(str(eingabe.get("bindefristBis") or "").replace("Z", "+00:00"))
		if bf.tzinfo is None:
			bf = bf.replace(tzinfo=timezone.utc)
	except ValueError:
		raise ValueError("Bitte eine Bindefrist (Datum und Uhrzeit) angeben.") from None
	if frist_ts and bf.timestamp() < frist_ts + H:
		raise ValueError("Die Bindefrist muss mindestens eine Stunde nach der Angebotsfrist liegen.")
	zz = _zahl(eingabe.get("zahlungszielTage"), 0, 90, 0)
	if zz is None:
		raise ValueError("Bitte ein Zahlungsziel in Tagen angeben (0–90).")
	if eingabe.get("sicherheit") not in SICHERHEITEN:
		raise ValueError("Bitte die geforderte Sicherheit angeben.")
	return {"positionen": positionen, "bindefristBis": bf.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"), "zahlungszielTage": int(zz), "sicherheit": eingabe["sicherheit"], "bemerkung": str(eingabe.get("bemerkung") or "")[:1500]}


def position_normieren(pos, ctx, markt_faktor=1.0):
	kwh = ctx["kwh"]
	if not kwh:
		return None
	ct = pos["arbeitspreisCt"] if pos["art"] == "fix" else ctx["lastgewichtetEurMwh"] * markt_faktor / 10 + pos["aufschlagCt"]
	eur = kwh * (ct + (pos.get("hknCt") or 0)) / 100 + (pos.get("grundpreisEurMonat") or 0) * 12
	return {"eurJahr": round(eur), "ctKwh": round(eur / kwh * 100, 3)}


def angebote_vergleichen(angebote, produkte, ctx, szenarien=(-30, -15, 15, 30)):
	zeilen = []
	for a in angebote:
		for pos in a.get("positionen") or []:
			p = next((x for x in produkte if x["id"] == pos["produktId"]), None)
			if not p:
				continue
			norm = position_normieren(pos, ctx)
			if not norm:
				continue
			sens = {str(s): position_normieren(pos, ctx, 1 + s / 100 * MARKT_EXPOSITION[p["art"]])["eurJahr"] for s in szenarien}
			zeilen.append({"angebotId": a["id"], "lieferantId": a["lieferantId"], "runde": a.get("runde"), "produktId": p["id"], "art": p["art"], **norm, "sensitivitaet": sens})
	zeilen.sort(key=lambda z: z["eurJahr"])
	best = zeilen[0]["eurJahr"] if zeilen else None
	for i, z in enumerate(zeilen):
		z["rang"] = i + 1
		z["abstandProzent"] = round((z["eurJahr"] - best) / best * 100, 2) if best else 0
	return {"zeilen": zeilen, "bester": zeilen[0] if zeilen else None, "szenarien": list(szenarien)}


def beste_je_lieferant(vergleich):
	seen, out = set(), []
	for z in vergleich["zeilen"]:
		if z["lieferantId"] not in seen:
			seen.add(z["lieferantId"])
			out.append(z)
	return out


def bestpreis_hinweis(regel, lieferant_id, vergleich):
	if not vergleich or regel not in BESTPREIS_REGELN or regel == "aus":
		return None
	liste = beste_je_lieferant(vergleich)
	if not liste:
		return None
	best = liste[0]
	eigen = next((z for z in liste if z["lieferantId"] == lieferant_id), None)
	if regel == "bestpreis":
		return {"regel": regel, "bestpreisCt": best["ctKwh"], "text": f"Bestes normiertes Angebot der Vorrunde: {best['ctKwh']:.3f} ct/kWh".replace(".", ",")}
	if not eigen:
		return {"regel": regel, "text": "Sie haben in der Vorrunde kein Angebot abgegeben."}
	rang = liste.index(eigen) + 1
	if regel == "rang":
		return {"regel": regel, "rang": rang, "von": len(liste), "text": f"Ihr bestes Angebot lag in der Vorrunde auf Rang {rang} von {len(liste)}."}
	abstand = round((eigen["eurJahr"] - best["eurJahr"]) / best["eurJahr"] * 100, 2)
	return {"regel": regel, "abstandProzent": abstand, "text": "Ihr Angebot war in der Vorrunde das günstigste." if abstand <= 0 else f"Ihr bestes Angebot lag in der Vorrunde {abstand:.2f} % über dem besten Angebot.".replace(".", ",", 1)}


def _r(x, schritt):
	return round(x / schritt) * schritt if x is not None else None


def los_anonym(reihe, lose):
	"""Anonymisiertes Profil (nur gerundete Kennzahlen, normiertes Wochenprofil, Monatsanteile, Häufigkeiten)."""
	start, werte = reihe
	woche = [[0.0] * 24 for _ in range(7)]
	anz = [[0] * 24 for _ in range(7)]
	monate = [0.0] * 12
	kwh = spitze = peak = 0.0
	for i, x in enumerate(werte):
		t = start + i * H
		o = ortszeit(t)
		kwh += x
		spitze = max(spitze, x)
		woche[o.weekday()][o.hour] += x
		anz[o.weekday()][o.hour] += 1
		monate[o.month - 1] += x
		if o.weekday() < 5 and 8 <= o.hour < 20:
			peak += x
	mw = [[woche[t][h] / anz[t][h] if anz[t][h] else 0 for h in range(24)] for t in range(7)]
	mittel = sum(sum(r) for r in mw) / 168 or 1
	mwh = kwh / 1000
	haeufig = lambda k: {v: sum(1 for e in lose if e.get(k) == v) for v in {e.get(k) for e in lose if e.get(k)}}  # noqa: E731
	return {
		"anzahlKunden": f"{len(lose)} Kunden (Pool)" if len(lose) > 1 else "1 Kunde",
		"abnahmestellen": sum(max(1, int(e.get("abnahmestellen") or 1)) for e in lose),
		"jahresMengeMwh": _r(mwh, 50 if mwh >= 1000 else 10),
		"spitzeKw": _r(spitze, 10),
		"benutzungsstunden": _r(kwh / spitze, 50) if spitze else None,
		"peakAnteilProzent": round(peak / kwh * 100) if kwh else None,
		"wochenprofil": [[round(x / mittel, 2) for x in r] for r in mw],
		"monatsanteileProzent": [round(m / kwh * 100, 1) if kwh else 0 for m in monate],
		"laender": haeufig("land"),
		"spannungsebenen": haeufig("spannungsebene"),
		"messarten": haeufig("messart"),
	}


VERBOTENE_LIEFERANTEN_FELDER = ("kundeId", "kundenIds", "nutzerId", "firma", "maloId", "meloId", "zaehlpunkt", "plz", "ort", "email", "kundenname", "abnahmestelleId")

# ================================================================ Wechselanalyse, Fristen, Portfolio

ANNAHMEN_STANDARD = {
	"lieferantAufschlagCt": 1.2,
	"profilAufschlagCt": 0.4,
	"hknCt": 0.1,
	"schwelleProzent": 5,
	"vorlaufTage": 120,
	"beobachtenTage": 240,
	"fristAlarmTage": [90, 60, 30, 14, 7],
	"verguetungModell": "fee",
	"serviceFeeEurMwh": 0,
	"erfolgsAnteil": 0,
	"risikoSchockProzent": 20,
	"bestpreisRegelStandard": "abstand",
	"demoKurve": False,
}
EMPFEHLUNGEN = {"ausschreiben": "Jetzt ausschreiben", "abwarten": "Abwarten und beobachten", "verlaengern": "Verlängern / bestehenden Vertrag halten", "pruefen": "Daten ergänzen"}
# Nicht beeinflussbare Preisbestandteile DE (wie STROM.bestandteile in src/lib/invest/markt.js): Netz, Umlagen, Konzession, Stromsteuer
FIXE_BESTANDTEILE_CT = 5.5 + 1.8 + 0.11 + 2.05


def kuendigungs_stichtag(vertrag_ende, frist_monate=None, frist_wochen=None):
	try:
		d = datetime.strptime(str(vertrag_ende or ""), "%Y-%m-%d")
	except ValueError:
		return None
	if frist_wochen:
		return (d - timedelta(weeks=int(frist_wochen))).strftime("%Y-%m-%d")
	m = int(frist_monate) if frist_monate is not None else 3
	j, mo = d.year, d.month - m
	while mo < 1:
		mo += 12
		j -= 1
	tag = min(d.day, calendar.monthrange(j, mo)[1])
	return f"{j}-{mo:02d}-{tag:02d}"


def tage_zwischen(von, bis):
	return (datetime.strptime(bis, "%Y-%m-%d") - datetime.strptime(von, "%Y-%m-%d")).days


def frist_alarm_stufe(tage, schwellen=(90, 60, 30, 14, 7)):
	if tage is None:
		return None
	if tage < 0:
		return 0
	for s in sorted(schwellen):
		if tage <= s:
			return s
	return None


def energiepreis_ct(preis_ct, preis_art="energie"):
	if preis_ct is None:
		return None
	return round(max(0.0, preis_ct - FIXE_BESTANDTEILE_CT), 3) if preis_art == "gesamt" else preis_ct


def wechselanalyse(vertrag, markt, annahmen=None, stichtag=None):
	a = {**ANNAHMEN_STANDARD, **(annahmen or {})}
	stichtag = stichtag or datetime.now(timezone.utc).strftime("%Y-%m-%d")
	beg = []
	vct = energiepreis_ct(vertrag.get("preisCt"), vertrag.get("preisArt"))
	kst = kuendigungs_stichtag(vertrag.get("vertragEnde"), vertrag.get("kuendigungsfristMonate"), vertrag.get("kuendigungsfristWochen"))
	tage = tage_zwischen(stichtag, kst) if kst else None
	fwd = markt.get("forwardEurMwh")
	pf = markt.get("profilfaktor") if (markt.get("profilfaktor") or 0) > 0 else None
	mct = round(fwd * (pf or 1) / 10 + (0 if pf else a["profilAufschlagCt"]) + a["lieferantAufschlagCt"] + (a.get("serviceFeeEurMwh") or 0) / 10, 3) if fwd is not None else None
	out = {"stichtag": kst, "tageBisStichtag": tage, "alarm": frist_alarm_stufe(tage, a["fristAlarmTage"]), "vertragCt": vct, "marktCt": mct, "deltaCt": None, "deltaProzent": None, "deltaEurJahr": None, "fristVerpasst": tage is not None and tage < 0, "begruendung": beg}

	def fertig(e):
		return {**out, "empfehlung": e, "label": EMPFEHLUNGEN[e]}

	if vct is None or mct is None or not kst:
		if vct is None:
			beg.append("Preis des laufenden Vertrags fehlt.")
		if not kst:
			beg.append("Vertragsende bzw. Kündigungsfrist fehlt.")
		if mct is None:
			beg.append("Kein Terminpreis für den Folgezeitraum verfügbar (Terminkurve einspielen).")
		return fertig("pruefen")
	out["deltaCt"] = round(vct - mct, 3)
	out["deltaProzent"] = round((vct - mct) / vct, 4)
	if vertrag.get("jahresKwh"):
		out["deltaEurJahr"] = round((vct - mct) / 100 * vertrag["jahresKwh"])
	vorteil = out["deltaProzent"] * 100
	beg.append(f"Vertrag {vct:.2f} ct/kWh gegenüber Markt {mct:.2f} ct/kWh.".replace(".", ","))
	if out["fristVerpasst"]:
		beg.append("Kündigungsstichtag verstrichen – der Vertrag verlängert sich in der Regel. Nächstes Kündigungsfenster vormerken.")
		return fertig("verlaengern")
	beg.append(f"Kündigung spätestens am {kst} ({tage} Tage).")
	verl = vertrag.get("verlaengerungPreisCt")
	if vorteil >= a["schwelleProzent"]:
		beg.append("Der Markt liegt deutlich unter dem Vertrag – Angebote jetzt einholen.")
		return fertig("ausschreiben")
	if tage <= a["vorlaufTage"]:
		if vorteil < 0 and verl is not None and verl <= mct:
			beg.append("Das Verlängerungsangebot liegt unter dem Marktniveau.")
			return fertig("verlaengern")
		beg.append("Wenig Vorlauf bis zum Stichtag – Ausschreibung starten.")
		return fertig("ausschreiben")
	if vorteil < 0 and verl is not None and verl <= mct:
		beg.append("Vertrag und Verlängerungsangebot liegen unter dem Markt.")
		return fertig("verlaengern")
	if (markt.get("trend") or {}).get("richtung") == "fallend":
		beg.append("Terminpreise fallen und es bleibt Zeit – beobachten.")
		return fertig("abwarten")
	if tage > a["beobachtenTage"]:
		beg.append("Viel Zeit bis zum Stichtag – Markt beobachten.")
		return fertig("abwarten")
	beg.append("Zeitfenster für eine geordnete Ausschreibung ist offen.")
	return fertig("ausschreiben")


def portfolio(bedarf, tranchen, marktpreis, schock_prozent=20):
	je = {b["periode"]: {"periode": b["periode"], "bedarf": b["mwh"], "ges": 0.0, "kosten": 0.0} for b in bedarf}
	for t in tranchen:
		if t.get("status") == "storniert":
			continue
		e = je.setdefault(t["periode"], {"periode": t["periode"], "bedarf": 0.0, "ges": 0.0, "kosten": 0.0})
		e["ges"] += t["mwh"]
		e["kosten"] += t["mwh"] * t["preisEurMwh"]
	perioden = []
	for e in je.values():
		mp = marktpreis(e["periode"])
		mittel = e["kosten"] / e["ges"] if e["ges"] else None
		offen = max(0.0, e["bedarf"] - e["ges"])
		perioden.append({
			"periode": e["periode"], "bedarfMwh": round(e["bedarf"], 1), "gesichertMwh": round(e["ges"], 1), "offenMwh": round(offen, 1),
			"hedgeQuote": round(min(1, e["ges"] / e["bedarf"]), 3) if e["bedarf"] else None, "mittelpreis": round(mittel, 2) if mittel is not None else None,
			"marktpreis": mp, "mtmEur": round((mp - mittel) * e["ges"]) if mp is not None and mittel is not None else None,
			"risikoEur": round(offen * mp * schock_prozent / 100) if mp is not None else None,
		})
	bed = sum(p["bedarfMwh"] for p in perioden)
	ges = sum(min(p["gesichertMwh"], p["bedarfMwh"] or p["gesichertMwh"]) for p in perioden)
	return {"perioden": perioden, "summe": {"bedarfMwh": round(bed, 1), "gesichertMwh": round(ges, 1), "hedgeQuote": round(ges / bed, 3) if bed else None, "mtmEur": sum(p["mtmEur"] or 0 for p in perioden), "risikoEur": sum(p["risikoEur"] or 0 for p in perioden), "schockProzent": schock_prozent}}


def los_kennzeichen(ausschreibung_id):
	return f"Los {str(ausschreibung_id or '').split('-')[-1][:4].upper()}"
