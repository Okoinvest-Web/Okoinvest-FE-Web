# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gutachter-/Planeraufträge – reine Logik ohne Frappe (Spiegel von src/lib/plattform/gutachter/kern.js; gleiche Regeln,
# Abgleich über tests/test_gutachter_bank_kern.py). Zustandsautomat, Angebot/Honorar, Termine, Zwischenstände, Mängel,
# Bewertung, Rechnungen (Abschlag ≤ vereinbarter Anteil, Summe ≤ Auftragssumme, Schlussrechnung erst nach Abnahme),
# Fristen. Pflichtangaben der Rechnung: DE § 14 Abs. 4 UStG, AT § 11 UStG, CH Art. 26 MWSTG (Nummer, Datum, Leistungszeitraum).

import math
import re
from datetime import date, timedelta

AUFTRAG_STATUS = {
	"angefragt": ("Angebot angefragt", 0), "angebot": ("Angebot abgegeben", 0), "beauftragt": ("Beauftragt – Bestätigung offen", 1),
	"in_arbeit": ("In Bearbeitung", 2), "in_pruefung": ("Lieferung in Prüfung", 3), "nachbesserung": ("Nachbesserung erforderlich", 3),
	"abnahmebereit": ("Endfassung freigegeben – Abnahme offen", 4), "abgenommen": ("Abgenommen", 5), "abgerechnet": ("Schlussrechnung gestellt", 6),
	"abgeschlossen": ("Abgeschlossen (bezahlt)", 7), "abgelehnt": ("Vom Gutachter abgelehnt", -1), "nicht_beauftragt": ("Nicht beauftragt", -1), "storniert": ("Storniert", -1),
}
AUFTRAG_OFFEN = ["angefragt", "angebot", "beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit", "abgenommen", "abgerechnet"]
BEARBEITUNG = ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"]
UEBERGAENGE = {
	"angebot_abgeben": (["angefragt", "angebot"], "angebot", "gutachter"),
	"anfrage_ablehnen": (["angefragt", "angebot"], "abgelehnt", "gutachter"),
	"beauftragen": (["angebot"], "beauftragt", "bo"),
	"angebot_ablehnen": (["angebot", "angefragt"], "nicht_beauftragt", "bo"),
	"auftrag_bestaetigen": (["beauftragt"], "in_arbeit", "gutachter"),
	"liefern": (["in_arbeit", "nachbesserung", "in_pruefung", "abnahmebereit"], "in_pruefung", "gutachter"),
	"maengel": (["in_pruefung"], "nachbesserung", "bo"),
	"freigeben": (["in_pruefung"], None, "bo"),
	"abnehmen": (["abnahmebereit"], "abgenommen", "bo"),
	"stornieren": (["angefragt", "angebot", "beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"], "storniert", "bo"),
}
HONORAR_ARTEN = {"pauschal": "Pauschalhonorar", "stunden": "Nach Aufwand (Stundensatz)"}
LIEFER_ARTEN = {"entwurf": "Entwurf / Zwischenstand", "endfassung": "Endfassung"}
TERMIN_ARTEN = {"begehung": "Ortsbegehung / Kartierung", "besprechung": "Besprechung", "behoerde": "Termin mit Behörde", "abgabe": "Abgabetermin", "sonstiges": "Sonstiger Termin"}
RECHNUNG_ARTEN = {"abschlag": "Abschlagsrechnung", "schluss": "Schlussrechnung"}
UST_SAETZE = [0, 2.6, 7, 8.1, 10, 13, 19, 20]
UST_STANDARD = {"DE": 19, "AT": 20, "CH": 8.1}
BEWERTUNG_KRITERIEN = {"qualitaet": "Fachliche Qualität", "termintreue": "Termintreue", "kommunikation": "Kommunikation", "preisLeistung": "Preis-Leistung"}
ZAHLUNGSZIEL_STANDARD = 30


class GutachterFehler(Exception):
	def __init__(self, text, status=422):
		super().__init__(text)
		self.status = status


def _mr(x, stellen=0):
	"""Kaufmännisch runden wie Math.round in JS (x.5 → aufwärts), nicht wie Pythons round (Banker's Rounding)."""
	f = 10 ** stellen
	return math.floor(float(x) * f + 0.5) / f


def _pflicht(bedingung, text, status=422):
	if not bedingung:
		raise GutachterFehler(text, status)


def _zahl(v, mini, maxi, stellen=2):
	if v is None or v == "" or isinstance(v, (dict, list, bool)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if n != n or n < mini or n > maxi:
		return None
	return _mr(n, stellen)


def _txt(v, maxi=500):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(v)).strip()[:maxi]


def _datum(v):
	s = str(v or "")
	if not re.match(r"^\d{4}-\d{2}-\d{2}$", s):
		return ""
	try:
		date.fromisoformat(s)
	except ValueError:
		return ""
	return s


def rund2(x):
	return _mr(float(x or 0), 2)


def plus_tage(iso, tage):
	return (date.fromisoformat(str(iso)[:10]) + timedelta(days=tage)).isoformat()


def tage_bis(heute, iso):
	return (date.fromisoformat(str(iso)[:10]) - date.fromisoformat(str(heute)[:10])).days


def uebergang(aktion, status, wer):
	u = UEBERGAENGE.get(aktion)
	_pflicht(u, "Unbekannte Aktion.")
	von, nach, seite = u
	_pflicht(seite == wer, "Das entscheidet die Projektleitung von ÖkoInvest." if seite == "bo" else "Diesen Schritt erledigt der beauftragte Gutachter.", 403)
	_pflicht(status in von, f"Im Status „{AUFTRAG_STATUS.get(status, (status,))[0]}“ ist das nicht möglich.", 409)
	return nach


def anfrage_bereinigen(d, heute=None, fachgebiete=None):
	d = d or {}
	a = {
		"titel": _txt(d.get("titel"), 160), "fachgebiet": _txt(d.get("fachgebiet"), 40), "leistung": _txt(d.get("leistung"), 4000),
		"angebotsfrist": _datum(d.get("angebotsfrist")), "wunschtermin": _datum(d.get("wunschtermin")), "hinweise": _txt(d.get("hinweise"), 1500),
	}
	_pflicht(len(a["titel"]) >= 3, "Bitte einen Titel für die Leistung angeben.")
	_pflicht(not fachgebiete or a["fachgebiet"] in fachgebiete, "Bitte ein Fachgebiet wählen.")
	_pflicht(len(a["leistung"]) >= 20, "Bitte die Leistung beschreiben (mind. 20 Zeichen): Umfang, Methodik, Ergebnisform.")
	_pflicht(a["angebotsfrist"], "Bitte eine Angebotsfrist angeben.")
	if heute:
		_pflicht(a["angebotsfrist"] > str(heute)[:10], "Die Angebotsfrist muss in der Zukunft liegen.")
	if a["wunschtermin"]:
		_pflicht(a["wunschtermin"] > a["angebotsfrist"], "Der gewünschte Abgabetermin muss nach der Angebotsfrist liegen.")
	return a


def angebot_summen(a):
	honorar = rund2((a.get("stundensatz") or 0) * (a.get("stunden") or 0)) if a.get("honorarArt") == "stunden" else rund2(a.get("honorarNetto") or 0)
	neben = rund2(honorar * (a.get("nebenkostenPct") or 0) / 100)
	netto = rund2(honorar + neben)
	ust = rund2(netto * (a.get("ustPct") or 0) / 100)
	return {"honorar": honorar, "nebenkosten": neben, "summeNetto": netto, "summeUst": ust, "summeBrutto": rund2(netto + ust)}


def _ust(v, standard):
	z = _zahl(v, 0, 30)
	return (int(z) if z is not None and float(z).is_integer() else z) if z is not None and z in UST_SAETZE else standard


def angebot_bereinigen(d, heute=None, land="DE"):
	d = d or {}
	art = d.get("honorarArt") if d.get("honorarArt") in HONORAR_ARTEN else "pauschal"
	a = {
		"honorarArt": art,
		"honorarNetto": _zahl(d.get("honorarNetto"), 0, 5e6) if art == "pauschal" else None,
		"stundensatz": _zahl(d.get("stundensatz"), 0, 1000) if art == "stunden" else None,
		"stunden": _zahl(d.get("stunden"), 0, 20000, 1) if art == "stunden" else None,
		"nebenkostenPct": _zahl(d.get("nebenkostenPct"), 0, 30) or 0,
		"ustPct": _ust(d.get("ustPct"), UST_STANDARD.get(land, 19)),
		"liefertermin": _datum(d.get("liefertermin")), "gueltigBis": _datum(d.get("gueltigBis")),
		"abschlagPct": _zahl(d.get("abschlagPct"), 0, 50, 0) or 0,
		"zahlungszielTage": _zahl(d.get("zahlungszielTage"), 7, 90, 0) or ZAHLUNGSZIEL_STANDARD,
		"termineVorschlag": _txt(d.get("termineVorschlag"), 500), "bemerkung": _txt(d.get("bemerkung"), 2000), "ustHinweis": _txt(d.get("ustHinweis"), 200),
	}
	if art == "pauschal":
		_pflicht((a["honorarNetto"] or 0) > 0, "Bitte das Pauschalhonorar (netto) angeben.")
	else:
		_pflicht((a["stundensatz"] or 0) > 0, "Bitte den Stundensatz (netto) angeben.")
		_pflicht((a["stunden"] or 0) > 0, "Bitte den geschätzten Aufwand in Stunden angeben.")
	_pflicht(a["liefertermin"], "Bitte den Liefertermin angeben.")
	if heute:
		_pflicht(a["liefertermin"] > str(heute)[:10], "Der Liefertermin muss in der Zukunft liegen.")
		if a["gueltigBis"]:
			_pflicht(a["gueltigBis"] >= str(heute)[:10], "Die Bindefrist des Angebots darf nicht in der Vergangenheit liegen.")
	if a["ustPct"] == 0:
		_pflicht(len(a["ustHinweis"]) >= 5, "Bei 0 % Umsatzsteuer bitte den Grund angeben (z. B. Reverse Charge, Kleinunternehmerregelung).")
	return {**a, **angebot_summen(a)}


def angebot_vergleich(liste):
	mit = [x for x in (liste or []) if x.get("angebot")]
	if not mit:
		return []
	min_preis = min(x["angebot"].get("summeNetto") or float("inf") for x in mit)
	min_termin = sorted(x["angebot"]["liefertermin"] for x in mit)[0]
	zeilen = []
	for x in mit:
		preis = min_preis / max(x["angebot"]["summeNetto"], 1) if min_preis > 0 else 1
		verzug = max(0, tage_bis(min_termin, x["angebot"]["liefertermin"]))
		termin = max(0, 1 - verzug / 120)
		bew = x.get("bewertung") if isinstance(x.get("bewertung"), (int, float)) else 3
		punkte = _mr(preis * 50 + termin * 25 + (bew / 5) * 25, 1)
		zeilen.append({"id": x["id"], "gutachter": x.get("gutachter"), "summeNetto": x["angebot"]["summeNetto"], "liefertermin": x["angebot"]["liefertermin"], "punkte": punkte, "guenstigstes": x["angebot"]["summeNetto"] == min_preis})
	zeilen.sort(key=lambda z: -z["punkte"])
	for i, z in enumerate(zeilen):
		z["rang"] = i + 1
	return zeilen


def termin_bereinigen(d, heute=None):
	d = d or {}
	t = {
		"art": d.get("art") if d.get("art") in TERMIN_ARTEN else "begehung", "datum": _datum(d.get("datum")),
		"uhrzeit": d.get("uhrzeit") if re.match(r"^([01]\d|2[0-3]):[0-5]\d$", str(d.get("uhrzeit") or "")) else "",
		"ort": _txt(d.get("ort"), 200), "notiz": _txt(d.get("notiz"), 1000),
	}
	_pflicht(t["datum"], "Bitte das Datum des Termins angeben.")
	if heute:
		_pflicht(t["datum"] >= str(heute)[:10], "Der Termin darf nicht in der Vergangenheit liegen.")
	return t


def bericht_bereinigen(d, letzter=0):
	d = d or {}
	b = {"text": _txt(d.get("text"), 3000), "fortschritt": _zahl(d.get("fortschritt"), 0, 100, 0)}
	_pflicht(len(b["text"]) >= 10, "Bitte den Zwischenstand kurz beschreiben (mind. 10 Zeichen).")
	_pflicht(b["fortschritt"] is not None, "Bitte den Fortschritt in Prozent angeben.")
	_pflicht(b["fortschritt"] >= (letzter or 0), f"Der Fortschritt kann nicht kleiner als der letzte Stand ({letzter} %) sein.")
	return b


def maengel_bereinigen(liste):
	roh = liste if isinstance(liste, list) else re.split(r"\n+", str(liste or ""))
	m = [x for x in (_txt(y, 300) for y in roh) if len(x) >= 3][:30]
	_pflicht(len(m) >= 1, "Bitte mindestens einen Mangel konkret benennen.")
	return m


def bewertung_bereinigen(d):
	d = d or {}
	b = {}
	for k, label in BEWERTUNG_KRITERIEN.items():
		w = _zahl(d.get(k), 1, 5, 0)
		_pflicht(w is not None, f"Bitte „{label}“ mit 1 bis 5 bewerten.")
		b[k] = int(w)
	b["kommentar"] = _txt(d.get("kommentar"), 1500)
	b["schnitt"] = _mr(sum(b[k] for k in BEWERTUNG_KRITERIEN) / 4, 1)
	return b


def bewertung_schnitt(bewertungen):
	liste = [b for b in (bewertungen or []) if b and isinstance(b.get("schnitt"), (int, float))]
	if not liste:
		return None
	return {"schnitt": _mr(sum(b["schnitt"] for b in liste) / len(liste), 1), "anzahl": len(liste)}


def iban_pruefen(iban):
	s = re.sub(r"\s", "", str(iban or "")).upper()
	if not re.match(r"^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$", s):
		return False
	umgestellt = s[4:] + s[:4]
	zahl = "".join(str(ord(c) - 55) if c.isalpha() else c for c in umgestellt)
	return int(zahl) % 97 == 1


def rechnung_bereinigen(d, auftrag, heute=None):
	d = d or {}
	ang = (auftrag or {}).get("angebot")
	_pflicht(ang, "Ohne angenommenes Angebot keine Rechnung.", 409)
	art = d.get("art") if d.get("art") in RECHNUNG_ARTEN else "schluss"
	r = {
		"art": art, "nummer": _txt(d.get("nummer"), 40), "datum": _datum(d.get("datum")), "leistungVon": _datum(d.get("leistungVon")), "leistungBis": _datum(d.get("leistungBis")),
		"netto": _zahl(d.get("netto"), 0.01, 5e6), "ustPct": _ust(d.get("ustPct"), ang.get("ustPct")), "ustHinweis": _txt(d.get("ustHinweis"), 200),
		"iban": re.sub(r"\s", "", _txt(d.get("iban"), 40)).upper(), "bemerkung": _txt(d.get("bemerkung"), 1000),
	}
	_pflicht(len(r["nummer"]) >= 1, "Bitte die Rechnungsnummer angeben.")
	_pflicht(r["datum"], "Bitte das Rechnungsdatum angeben.")
	if heute:
		_pflicht(r["datum"] <= str(heute)[:10], "Das Rechnungsdatum darf nicht in der Zukunft liegen.")
	_pflicht(r["leistungVon"] and r["leistungBis"] and r["leistungVon"] <= r["leistungBis"], "Bitte den Leistungszeitraum angeben (von ≤ bis).")
	_pflicht((r["netto"] or 0) > 0, "Bitte den Nettobetrag angeben.")
	if r["ustPct"] == 0:
		_pflicht(len(r["ustHinweis"]) >= 5, "Bei 0 % Umsatzsteuer bitte den Hinweis angeben (z. B. „Steuerschuldnerschaft des Leistungsempfängers“).")
	if r["iban"]:
		_pflicht(iban_pruefen(r["iban"]), "Die IBAN ist ungültig.")
	bisher = [x for x in (auftrag.get("rechnungen") or []) if x.get("status") != "zurueckgewiesen"]
	_pflicht(not any(x.get("nummer") == r["nummer"] for x in bisher), "Diese Rechnungsnummer wurde für den Auftrag bereits verwendet.", 409)
	_pflicht(not any(x.get("art") == "schluss" for x in bisher), "Die Schlussrechnung liegt bereits vor.", 409)
	summe_bisher = rund2(sum(x.get("netto") or 0 for x in bisher))
	if art == "abschlag":
		_pflicht(auftrag.get("status") in BEARBEITUNG, "Abschlagsrechnungen sind nur während der Bearbeitung möglich.", 409)
		_pflicht((ang.get("abschlagPct") or 0) > 0, "Im Angebot ist kein Abschlag vereinbart.", 409)
		grenze = rund2(ang["summeNetto"] * ang["abschlagPct"] / 100)
		_pflicht(rund2(summe_bisher + r["netto"]) <= grenze + 0.005, f"Abschläge sind auf {ang['abschlagPct']} % der Auftragssumme begrenzt ({grenze:.2f} € netto).".replace(".", ",", 1))
	else:
		_pflicht(auftrag.get("status") == "abgenommen", "Die Schlussrechnung ist erst nach der Abnahme möglich.", 409)
	_pflicht(rund2(summe_bisher + r["netto"]) <= rund2(ang["summeNetto"]) + 0.005, "Die Rechnungen übersteigen die Auftragssumme – Mehrleistungen bitte vorher als Nachtrag vereinbaren.")
	r["ust"] = rund2(r["netto"] * r["ustPct"] / 100)
	r["brutto"] = rund2(r["netto"] + r["ust"])
	r["faelligAm"] = plus_tage(r["datum"], ang.get("zahlungszielTage") or ZAHLUNGSZIEL_STANDARD)
	return r


def rechnungs_stand(auftrag, heute=None):
	r = [x for x in ((auftrag or {}).get("rechnungen") or []) if x.get("status") != "zurueckgewiesen"]
	summe = ((auftrag or {}).get("angebot") or {}).get("summeNetto") or 0
	berechnet = rund2(sum(x["netto"] for x in r))
	return {
		"auftragssumme": summe, "berechnetNetto": berechnet, "restNetto": rund2(summe - berechnet),
		"bezahltBrutto": rund2(sum(x["brutto"] for x in r if x.get("status") == "bezahlt")),
		"offenBrutto": rund2(sum(x["brutto"] for x in r if x.get("status") != "bezahlt")),
		"ueberfaellig": len([x for x in r if heute and x.get("status") != "bezahlt" and x.get("faelligAm") and x["faelligAm"] < str(heute)[:10]]),
		"schlussVorhanden": any(x.get("art") == "schluss" for x in r),
	}


def auftrag_fristen(a, heute):
	h = str(heute)[:10]
	f = []
	if a.get("status") == "angefragt" and a.get("angebotsfrist"):
		f.append({"art": "angebotsfrist", "datum": a["angebotsfrist"], "text": "Angebotsfrist"})
	if a.get("status") == "angebot" and (a.get("angebot") or {}).get("gueltigBis"):
		f.append({"art": "bindefrist", "datum": a["angebot"]["gueltigBis"], "text": "Bindefrist des Angebots"})
	if a.get("status") in ("beauftragt", "in_arbeit", "nachbesserung", "in_pruefung"):
		lt = (a.get("beauftragung") or {}).get("liefertermin") or (a.get("angebot") or {}).get("liefertermin")
		if lt:
			f.append({"art": "liefertermin", "datum": lt, "text": "Liefertermin"})
	for t in a.get("termine") or []:
		if t.get("status") in ("vorgeschlagen", "bestaetigt") and t.get("datum", "") >= h:
			f.append({"art": "termin", "datum": t["datum"], "text": TERMIN_ARTEN.get(t.get("art"), "Termin"), "id": t.get("id")})
	for r in a.get("rechnungen") or []:
		if r.get("status") in ("eingereicht", "geprueft") and r.get("faelligAm"):
			f.append({"art": "zahlung", "datum": r["faelligAm"], "text": f"Zahlung {r.get('nummer')}", "id": r.get("id")})
	for x in f:
		x["tage"] = tage_bis(h, x["datum"])
		x["ueberfaellig"] = x["datum"] < h
	return sorted(f, key=lambda x: x["datum"])


def naechste_version(lieferungen):
	return max([l.get("version") or 0 for l in (lieferungen or [])] or [0]) + 1
