# Copyright (c) 2026, ÖkoInvest GmbH
#
# Grundbuch & Dienstbarkeiten + Deal-Abschluss (Closing) – reine Regeln, 1:1 wie src/lib/plattform/closing/grundbuch.js
# und closing.js der Website. Stammlisten und Texte stehen in closing_vorlagen.json (aus den JS-Modulen generiert,
# Generator: docs/GRUNDBUCH-CLOSING.md). Ohne Frappe/Datenbank – mit `python -m unittest` testbar.
#
# Schritte und CPs sind dicts mit den Schlüsseln der Website (camelCase): schluessel, status, datum, frist, nachweisWert, dokumentId …
# KEINE Rechtsberatung – Muster und Kosten sind Orientierung.

import json
import math
import os
from datetime import date, timedelta

_PFAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "closing_vorlagen.json")
with open(_PFAD, encoding="utf-8") as _f:
	V = json.load(_f)

GB_LAENDER = V["GB_LAENDER"]
GB_OBJEKTARTEN = V["GB_OBJEKTARTEN"]
GB_RECHTE = V["GB_RECHTE"]
GB_SCHRITT_STATUS = V["GB_SCHRITT_STATUS"]
GB_STATUS = V["GB_STATUS"]
GB_OFFEN = tuple(V["GB_OFFEN"])
GB_SCHRITTE = V["GB_SCHRITTE"]
GB_VORLAGEN = V["GB_VORLAGEN"]
GB_HINWEIS = V["GB_HINWEIS"]
GB_PORTAL_EINLEITUNG = V["GB_PORTAL_EINLEITUNG"]
GB_LOESCHUNG = V["GB_LOESCHUNG"]
CL_STRUKTUREN = V["CL_STRUKTUREN"]
CL_STATUS = V["CL_STATUS"]
CL_OFFEN = tuple(V["CL_OFFEN"])
CL_VERANTWORTLICH = V["CL_VERANTWORTLICH"]
CP_STATUS = V["CP_STATUS"]
SIGNING_PUNKTE = V["SIGNING_PUNKTE"]
CP_STANDARD = V["CP_STANDARD"]
CP_AUS_LOI = V["CP_AUS_LOI"]
UEBERGABE_PUNKTE = V["UEBERGABE_PUNKTE"]
CL_HINWEIS = V["CL_HINWEIS"]
TREUHAND_HINWEIS = V["TREUHAND_HINWEIS"]
STAND = V["stand"]
FERTIG = ("erledigt", "entfaellt")


class GrundbuchFehler(Exception):
	def __init__(self, text, status=422):
		super().__init__(text)
		self.status = status


def _heute():
	return date.today().isoformat()


def _plus_tage(tag, n):
	return (date.fromisoformat(str(tag)[:10]) + timedelta(days=int(n))).isoformat()


def _ist_datum(x):
	try:
		return bool(x) and len(str(x)) == 10 and str(x).startswith("20") and date.fromisoformat(str(x)) is not None
	except ValueError:
		return False


# ================================================================ Grundbuch

def schritte_fuer(land):
	return GB_SCHRITTE.get(land) or GB_SCHRITTE["DE"]


def recht_fuer(land, recht):
	r = GB_RECHTE.get(land) or GB_RECHTE["DE"]
	return recht if recht in r else next(iter(r))


def schritte_anlegen(land, ohne_pfandrecht=False):
	out = []
	for i, d in enumerate(schritte_fuer(land)):
		entfaellt = d["schluessel"] == "rang" and ohne_pfandrecht
		out.append({
			"schluessel": d["schluessel"], "reihenfolge": i + 1, "status": "entfaellt" if entfaellt else "offen", "datum": "", "frist": "",
			"notiz": "Keine Grundpfandrechte angegeben." if entfaellt else "", "nachweisWert": "", "dokumentId": None, "signaturId": None,
		})
	return out


def _schritt(akte, schluessel):
	return next((s for s in akte.get("schritte") or [] if s.get("schluessel") == schluessel), None)


def _fertig(s):
	return bool(s) and s.get("status") in FERTIG


def schritt_pruefen(akte, aenderung, heute=None):
	"""Wie schrittPruefen (grundbuch.js): wirft GrundbuchFehler (422 Pflichtangabe, 409 Reihenfolge), liefert den neuen Schritt."""
	heute = heute or _heute()
	defs = schritte_fuer(akte.get("land"))
	d = next((x for x in defs if x["schluessel"] == aenderung.get("schluessel")), None)
	if not d:
		raise GrundbuchFehler("Unbekannter Schritt.")
	alt = _schritt(akte, d["schluessel"])
	if not alt:
		raise GrundbuchFehler("Schritt fehlt in der Akte.")
	status = aenderung.get("status") if aenderung.get("status") in GB_SCHRITT_STATUS else alt.get("status")
	if status == "entfaellt" and not d.get("optional"):
		raise GrundbuchFehler(f"„{d['label']}“ ist Pflicht und kann nicht entfallen.")
	if status == "erledigt":
		fehlt = [_schritt(akte, k) for k in d["nach"]]
		fehlt = [s for s in fehlt if s and not _fertig(s)]
		if fehlt:
			labels = [next((x["label"] for x in defs if x["schluessel"] == s["schluessel"]), s["schluessel"]) for s in fehlt]
			raise GrundbuchFehler("Zuerst erledigen: " + ", ".join(labels) + ".", 409)
	datum = aenderung.get("datum") if _ist_datum(aenderung.get("datum")) else (alt.get("datum") or heute if status == "erledigt" else alt.get("datum") or "")
	if status == "erledigt" and datum > heute:
		raise GrundbuchFehler("Das Datum der Erledigung darf nicht in der Zukunft liegen.")
	wert = str(aenderung.get("nachweisWert") or "").strip()[:120] if "nachweisWert" in aenderung else alt.get("nachweisWert") or ""
	dok = (aenderung.get("dokumentId") or None) if "dokumentId" in aenderung else alt.get("dokumentId")
	if status == "erledigt" and d.get("nachweis"):
		hat_wert = len(wert) >= 3
		ok = hat_wert if d["nachweis"] == "wert" else bool(dok) if d["nachweis"] == "dok" else (hat_wert or bool(dok))
		if not ok:
			raise GrundbuchFehler(f"Bitte Nachweis angeben: {d['nachweisLabel']}.")
	neu = dict(alt)
	neu.update({"status": status, "datum": "" if status == "offen" else datum, "nachweisWert": wert, "dokumentId": dok,
		"notiz": str(aenderung.get("notiz") or "")[:500] if "notiz" in aenderung else alt.get("notiz") or ""})
	return neu


def zuruecksetzen_erlaubt(akte, schluessel):
	for d in schritte_fuer(akte.get("land")):
		if schluessel in d["nach"] and (_schritt(akte, d["schluessel"]) or {}).get("status") == "erledigt":
			return False
	return True


def fristen_berechnen(akte, heute=None):
	heute = heute or _heute()
	defs = schritte_fuer(akte.get("land"))
	start = str(akte.get("erstelltAm") or heute)[:10]
	out = []
	for s in akte.get("schritte") or []:
		d = next((x for x in defs if x["schluessel"] == s.get("schluessel")), None)
		if not d:
			out.append({**s, "fristBerechnet": "", "ueberfaellig": False})
			continue
		vorg = [_schritt(akte, k) for k in d["nach"]]
		basis = sorted(x["datum"] for x in vorg if x and x.get("status") == "erledigt" and x.get("datum"))
		bereit = all(_fertig(x) for x in vorg if x is not None) and all(x is not None for x in vorg)
		frist = s.get("frist") or (_plus_tage(basis[-1] if basis else start, d["fristTage"]) if bereit else "")
		out.append({**s, "fristBerechnet": frist, "ueberfaellig": (not _fertig(s)) and bool(frist) and frist < heute})
	return out


def akte_status(akte):
	if akte.get("abgebrochen"):
		return "abgebrochen"
	offen = [(d, _schritt(akte, d["schluessel"])) for d in schritte_fuer(akte.get("land"))]
	offen = [(d, s) for d, s in offen if not _fertig(s)]
	if not offen:
		return "eingetragen"
	erster = next(((d, s) for d, s in offen if d["schluessel"] != "rang"), offen[0])
	return "vorbereitung" if erster[0]["schluessel"] == "vertrag" else erster[0]["phase"]


def naechster_schritt(akte):
	for d in schritte_fuer(akte.get("land")):
		s = _schritt(akte, d["schluessel"])
		if not _fertig(s) and all(_fertig(_schritt(akte, k)) for k in d["nach"]):
			return {**d, "status": (s or {}).get("status") or "offen"}
	return None


def fortschritt(akte):
	rel = [s for s in akte.get("schritte") or [] if s.get("status") != "entfaellt"]
	erl = len([s for s in rel if s.get("status") == "erledigt"])
	return {"erledigt": erl, "gesamt": len(rel), "quote": (erl / len(rel)) if rel else 0}


def anlagen_dienstbarkeit_status(akte):
	st = akte_status(akte)
	if st == "eingetragen":
		return "eingetragen"
	return "beantragt" if (_schritt(akte, "antrag") or {}).get("status") == "erledigt" else "vorbereitung"


# ---------------------------------------------------------------- Kostenschätzer (Orientierung, Quellen siehe grundbuch.js)

_STUFEN_B = [(500, 500, 15), (2000, 500, 4), (10000, 1000, 6), (25000, 3000, 8), (50000, 5000, 10), (200000, 15000, 27), (500000, 30000, 50),
	(5000000, 50000, 80), (10000000, 200000, 130), (20000000, 250000, 150), (60000000, 500000, 280)]
KOSTEN_AUFSCHLAG_2025 = 1.08


def gnotkg_tabelle_b(wert):
	w = max(0.0, float(wert or 0))
	geb = _STUFEN_B[0][2]
	bis = _STUFEN_B[0][0]
	for grenze, schritt, plus in _STUFEN_B[1:]:
		if w <= bis:
			break
		teil = min(w, grenze) - bis
		geb += math.ceil(teil / schritt) * plus
		bis = grenze
	return geb


def _r(x):
	return int(math.floor(x + 0.5))


def grundbuch_kosten(land="DE", entgelt_jahr=0, laufzeit_jahre=20, rangruecktritt=0, eigentuemer=1):
	jahr = max(0.0, float(entgelt_jahr or 0))
	jahre = max(1, min(99, int(laufzeit_jahre or 20)))
	gl = max(0, min(9, int(rangruecktritt or 0)))
	pers = max(1, min(20, int(eigentuemer or 1)))
	pos = []
	if land == "AT":
		wert = jahr * jahre
		pos += [
			{"label": "Rechtsgeschäftsgebühr Dienstbarkeit (2 % des Entgelts)", "betrag": _r(wert * 0.02), "quelle": "§ 33 TP 9 GebG – nur bei entgeltlicher Einräumung; Bemessung und Befreiungen im Einzelfall prüfen"},
			{"label": "Eintragungsgebühr Grundbuch (wertabhängig)", "betrag": _r(wert * 0.011), "quelle": "TP 9 lit. b GGG – Satz und Bemessungsgrundlage für Dienstbarkeiten vom Parteienvertreter bestätigen lassen (hier 1,1 % angesetzt)"},
			{"label": "Eingabengebühr Grundbuchsgesuch", "betrag": 70, "von": 50, "bis": 90, "quelle": "TP 9 lit. a GGG (elektronische Eingabe, Stand prüfen)"},
			{"label": f"Beglaubigung der Unterschrift(en) ({pers})", "betrag": 40 * pers, "von": 25 * pers, "bis": 80 * pers, "quelle": "Notariatstarifgesetz bzw. GGG (gerichtliche Beglaubigung) – Richtwert"},
			{"label": "Vertragserrichtung und Grundbuchsgesuch (Notar/Rechtsanwalt)", "betrag": 1500, "von": 800, "bis": 3000, "quelle": "Honorar nach Vereinbarung bzw. Tarif (NTG/RATG) – Richtwert"},
		]
		if gl:
			pos.append({"label": f"Vorrangseinräumung ({gl} Gläubiger, Beglaubigung + Bearbeitung Bank)", "betrag": 250 * gl, "von": 100 * gl, "bis": 500 * gl, "quelle": "Bankentgelt nach Konditionen + Beglaubigung – Richtwert"})
		return {"waehrung": "EUR", "geschaeftswert": wert, "positionen": pos, "summe": sum(p["betrag"] for p in pos), "hinweis": "Schätzung nach österreichischem Recht (GebG, GGG, NTG) – ohne Umsatzsteuer auf Honorare. Stand " + STAND + "."}
	if land == "CH":
		pos += [
			{"label": "Öffentliche Beurkundung (Notariat)", "betrag": 1500, "von": 800, "bis": 3000, "quelle": "Kantonale Notariatstarife – Richtwert"},
			{"label": "Grundbuchgebühr Eintragung", "betrag": 500, "von": 200, "bis": 1500, "quelle": "Kantonale Grundbuchgebührenverordnung – Richtwert"},
		]
		if gl:
			pos.append({"label": f"Rangrücktritt ({gl} Gläubiger)", "betrag": 300 * gl, "von": 150 * gl, "bis": 600 * gl, "quelle": "Bankentgelt + Grundbuchgebühr – Richtwert"})
		return {"waehrung": "CHF", "geschaeftswert": jahr * jahre, "positionen": pos, "summe": sum(p["betrag"] for p in pos), "hinweis": "Kosten in der Schweiz sind kantonal sehr unterschiedlich; beim zuständigen Notariat/Grundbuchamt Offerte einholen. Stand " + STAND + "."}
	wert = max(jahr * min(jahre, 20), 5000)
	b = gnotkg_tabelle_b(wert) * KOSTEN_AUFSCHLAG_2025
	pos += [
		{"label": "Notar: Entwurf und Beglaubigung der Eintragungsbewilligung (0,5 Gebühr)", "betrag": _r(b * 0.5), "quelle": "KV 24102/21201 GNotKG, Tabelle B – Näherung"},
		{"label": "Notar: Vollzug, Auslagen, Grundbuchabruf (pauschal)", "betrag": 80, "von": 50, "bis": 150, "quelle": "KV 22110 ff., 32000 ff. GNotKG – Richtwert"},
		{"label": "Grundbuchamt: Eintragung der Dienstbarkeit (1,0 Gebühr)", "betrag": _r(b), "quelle": "KV 14121 GNotKG, Tabelle B – Näherung"},
	]
	if gl:
		pos += [
			{"label": f"Grundbuchamt: Eintragung Rangänderung ({gl} × 0,5 Gebühr)", "betrag": _r(b * 0.5 * gl), "quelle": "KV 14130 GNotKG, Tabelle B – Näherung"},
			{"label": f"Beglaubigung Rangrücktrittserklärung Bank ({gl})", "betrag": 50 * gl, "von": 20 * gl, "bis": 70 * gl, "quelle": "KV 25100 GNotKG (0,2 Gebühr, mind. 20 €, höchstens 70 €) – Bankentgelte zusätzlich"},
		]
	return {"waehrung": "EUR", "geschaeftswert": wert, "positionen": pos, "summe": sum(p["betrag"] for p in pos), "hinweis": "Näherung nach GNotKG (Tabelle B, Stufen der Fassung 2013 mit pauschalem Aufschlag für die Anpassung 2025), zzgl. Umsatzsteuer auf Notarkosten. Geschäftswert nach § 52 GNotKG. Stand " + STAND + "."}


# ================================================================ Closing

def cps_anlegen(struktur, loi_bedingungen=None, heute=None):
	heute = heute or _heute()
	liste = list(CP_STANDARD["gemeinsam"]) + list(CP_STANDARD.get(struktur) or [])
	for b in loi_bedingungen or []:
		c = CP_AUS_LOI.get(b)
		if c and not any(x["schluessel"] == c["schluessel"] for x in liste):
			liste.append(c)
	return [{
		"schluessel": c["schluessel"], "reihenfolge": i + 1, "label": c["label"], "text": c["text"], "verantwortlich": c["verantwortlich"],
		"frist": _plus_tage(heute, c["fristTage"]), "status": "offen", "nachweis": "", "erfuelltAm": "",
	} for i, c in enumerate(liste)]


def signing_anlegen():
	return [{"schluessel": p["schluessel"], "erledigt": False, "am": "", "notiz": ""} for p in SIGNING_PUNKTE]


def uebergabe_anlegen():
	return [{"schluessel": p["schluessel"], "erledigt": False, "am": "", "notiz": ""} for p in UEBERGABE_PUNKTE]


def signing_stand(c, kyc_kaeufer=False, kyc_verkaeufer=False):
	out = []
	for p in SIGNING_PUNKTE:
		s = next((x for x in (c.get("signing") or {}).get("punkte") or [] if x.get("schluessel") == p["schluessel"]), {})
		erl = bool(kyc_kaeufer) if p["schluessel"] == "kyc_kaeufer" else bool(kyc_verkaeufer) if p["schluessel"] == "kyc_verkaeufer" else bool(s.get("erledigt"))
		out.append({**p, "auto": bool(p.get("auto")), "erledigt": erl, "am": s.get("am") or "", "notiz": s.get("notiz") or ""})
	return out


def signing_pruefen(c, kyc_kaeufer=False, kyc_verkaeufer=False):
	g = []
	if c.get("status") != "vorbereitung":
		g.append("Signing ist nur in der Vorbereitung möglich.")
	if not kyc_kaeufer:
		g.append("KYC/KYB des Käufers ist nicht verifiziert.")
	if not kyc_verkaeufer:
		g.append("KYC/KYB des Verkäufers ist nicht verifiziert.")
	for p in signing_stand(c, kyc_kaeufer, kyc_verkaeufer):
		if not p["auto"] and not p["erledigt"]:
			g.append(f"Offen: {p['label']}.")
	if not float(c.get("kaufpreis") or 0) > 0:
		g.append("Kaufpreis fehlt.")
	return {"ok": not g, "gruende": g}


def closing_pruefen(c, kyc_kaeufer=False, kyc_verkaeufer=False):
	g = []
	if c.get("status") != "signing":
		g.append("Zuerst Signing bestätigen." if c.get("status") == "vorbereitung" else "Closing ist in diesem Status nicht möglich.")
	if not kyc_kaeufer:
		g.append("KYC/KYB des Käufers ist nicht (mehr) verifiziert.")
	if not kyc_verkaeufer:
		g.append("KYC/KYB des Verkäufers ist nicht (mehr) verifiziert.")
	offen = [x for x in c.get("cps") or [] if x.get("status") not in ("erfuellt", "verzichtet")]
	if offen:
		g.append(f"{len(offen)} Closing Condition(s) offen: " + "; ".join(x["label"] for x in offen[:3]) + (" …" if len(offen) > 3 else "") + ".")
	z = c.get("zahlung") or {}
	if not z.get("eingangAm"):
		g.append("Eingang des Kaufpreises auf dem Treuhand-/Notaranderkonto ist nicht bestätigt." if z.get("treuhand") else "Zahlungseingang des Kaufpreises ist nicht bestätigt.")
	if not (c.get("notar") or {}).get("termin") and c.get("struktur") == "share":
		g.append("Notartermin für die Anteilsübertragung fehlt.")
	return {"ok": not g, "gruende": g}


def kaufpreis_ableiten(gebot_gesamt=None, loi=None, mwp=0):
	loi = loi or {}
	if float(gebot_gesamt or 0) > 0:
		return {"betrag": _r(float(gebot_gesamt)), "quelle": "zuschlag"}
	if float(loi.get("betrag") or 0) > 0:
		return {"betrag": _r(float(loi["betrag"])), "quelle": "loi"}
	if float(loi.get("preisProKwp") or 0) > 0 and float(mwp or 0) > 0:
		return {"betrag": _r(float(loi["preisProKwp"]) * float(mwp) * 1000), "quelle": "loi"}
	return {"betrag": 0, "quelle": ""}


def meilensteine_bereinigen(liste, kaufpreis):
	out = []
	for m in (liste or [])[:8]:
		m = m or {}
		x = {
			"label": str(m.get("label") or "").strip()[:120], "betrag": max(0, _r(float(m.get("betrag") or 0))), "bedingung": str(m.get("bedingung") or "").strip()[:200],
			"faelligAm": m.get("faelligAm") if _ist_datum(m.get("faelligAm")) else "", "bezahltAm": m.get("bezahltAm") if _ist_datum(m.get("bezahltAm")) else "",
		}
		if x["label"] and x["betrag"] > 0:
			out.append(x)
	if kaufpreis and sum(x["betrag"] for x in out) > kaufpreis:
		raise GrundbuchFehler("Die Summe der Meilensteinzahlungen übersteigt den Kaufpreis.")
	return out


def form_hinweise(struktur, land):
	return V["FORM_HINWEISE"].get(f"{struktur}:{land}") or V["FORM_HINWEISE"].get(f"{struktur}:DE") or []
