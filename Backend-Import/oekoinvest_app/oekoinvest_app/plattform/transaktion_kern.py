# Copyright (c) 2026, ÖkoInvest GmbH
#
# Verkaufs-Pipeline (Transaktion) – reine Logik OHNE Frappe-Import (tests/test_transaktion_kern.py).
# 1:1-Spiegel von src/lib/plattform/transaktion/pipeline.js – bei Änderungen beide Seiten nachziehen.

import re
from datetime import date

PHASEN = [
	{"id": "pruefung", "label": "Prüfung", "wahrscheinlichkeit": 0.05, "monate": 12, "text": "Projekt eingereicht, Freigabe durch das Backoffice ausstehend."},
	{"id": "vermarktung", "label": "Vermarktung", "wahrscheinlichkeit": 0.1, "monate": 9, "text": "Veröffentlicht, noch kein freigegebener Datenraum."},
	{"id": "datenraum", "label": "Datenraum / DD", "wahrscheinlichkeit": 0.2, "monate": 6, "text": "Mindestens ein Investor mit NDA und Datenraumzugang."},
	{"id": "angebote", "label": "Angebote / Bieterverfahren", "wahrscheinlichkeit": 0.35, "monate": 4, "text": "LOI abgegeben oder Bieterverfahren läuft."},
	{"id": "exklusiv", "label": "Exklusivität", "wahrscheinlichkeit": 0.6, "monate": 3, "text": "LOI angenommen bzw. Zuschlag, Projekt reserviert."},
	{"id": "closing", "label": "Signing / Closing", "wahrscheinlichkeit": 0.8, "monate": 1, "text": "Closing-Raum aktiv; nach Signing 90 %."},
	{"id": "verkauft", "label": "Verkauft", "wahrscheinlichkeit": 1, "monate": 0, "text": "Closing vollzogen, Provision fällig."},
]
PROVISION_STANDARD = 0.015
STOCKT_TAGE = 21


def _rund2(x):
	return round(float(x) + 1e-12, 2)


def _zahl(x):
	try:
		return float(x) if x not in (None, "") else None
	except (TypeError, ValueError):
		return None


def preis_gesamt(g, mwp):
	if not g:
		return None
	if _zahl(g.get("preis")):
		return float(g["preis"])
	if _zahl(g.get("betrag")):
		return float(g["betrag"])
	if _zahl(g.get("preisProKwp")) and _zahl(mwp):
		return float(round(float(g["preisProKwp"]) * float(mwp) * 1000))
	return None


def phase_von(p, interessen=(), verfahren=None, closing=None):
	st = lambda: {i.get("status") for i in interessen}  # noqa: E731
	if p.get("status") == "verkauft" or (closing or {}).get("status") == "vollzogen":
		return "verkauft"
	if closing and closing.get("status") in ("vorbereitung", "signing"):
		return "closing"
	if p.get("status") == "reserviert" or "loi_angenommen" in st() or (verfahren or {}).get("status") == "zuschlag":
		return "exklusiv"
	if (verfahren and verfahren.get("status") in ("laufend", "auswertung")) or "loi_abgegeben" in st():
		return "angebote"
	if "nda_freigegeben" in st():
		return "datenraum"
	if p.get("status") == "veroeffentlicht":
		return "vermarktung"
	if p.get("status") == "pruefung":
		return "pruefung"
	return None


def erwarteter_preis(p, interessen=(), gebote=(), closing=None):
	if closing and _zahl(closing.get("kaufpreis")):
		return float(closing["kaufpreis"]), "Closing-Raum (Kaufpreis)"
	z = next((g for g in gebote if g.get("status") == "zuschlag"), None)
	if z:
		return preis_gesamt(z, p.get("mwp")), "Zuschlag im Bieterverfahren"
	lois = [i for i in interessen if i.get("status") in ("loi_angenommen", "loi_abgegeben") and _zahl((i.get("loi") or {}).get("betrag"))]
	lois.sort(key=lambda i: (0 if i["status"] == "loi_angenommen" else 1, -float(i["loi"]["betrag"])))
	if lois:
		return float(lois[0]["loi"]["betrag"]), "angenommene LOI" if lois[0]["status"] == "loi_angenommen" else "höchste LOI"
	beste = sorted([x for x in (preis_gesamt(g, p.get("mwp")) for g in gebote if g.get("status") not in ("zurueckgezogen", "abgelehnt")) if x], reverse=True)
	if beste:
		return beste[0], "bestes Gebot"
	if _zahl(p.get("kaufpreis")):
		return float(p["kaufpreis"]), "Kaufpreis"
	if _zahl(p.get("preis")):
		return float(p["preis"]), "Preisvorstellung Anbieter"
	if _zahl(p.get("preisProKwp")) and _zahl(p.get("mwp")):
		return float(round(float(p["preisProKwp"]) * float(p["mwp"]) * 1000)), "Preisvorstellung €/kWp × Leistung"
	return None, "kein Preis – bitte Preisvorstellung erfassen"


def _plus_monate(iso, n):
	d = date.fromisoformat(str(iso)[:10])
	m0 = d.month - 1 + n
	return f"{d.year + m0 // 12}-{m0 % 12 + 1:02d}"


def _quartal(monat):
	return f"{monat[:4]}-Q{(int(monat[5:7]) + 2) // 3}" if monat else ""


def deal_karte(p, interessen=(), verfahren=None, closing=None, gebote=(), override=None, heute=None):
	heute = heute or date.today().isoformat()
	phase = phase_von(p, interessen, verfahren, closing)
	if not phase:
		return None
	ph = next(x for x in PHASEN if x["id"] == phase)
	preis, quelle = erwarteter_preis(p, interessen, gebote, closing)
	satz = _zahl(p.get("provisionSatz"))
	annahme = satz is None
	satz = PROVISION_STANDARD if annahme else satz
	standard_w = 0.9 if phase == "closing" and (closing or {}).get("status") == "signing" else ph["wahrscheinlichkeit"]
	manuell = bool(override) and _zahl((override or {}).get("wahrscheinlichkeit")) is not None and phase != "verkauft"
	w = min(1.0, max(0.0, float(override["wahrscheinlichkeit"]) / 100)) if manuell else standard_w
	provision = _rund2(preis * satz) if preis else None
	aktiv = [i for i in interessen if i.get("status") not in ("abgelehnt", "gemerkt")]
	kandidaten = [p.get("geaendertAm"), *(i.get("geaendertAm") for i in aktiv), (closing or {}).get("geaendertAm")]
	letzte = max([str(x) for x in kandidaten if x] or [str(p.get("erstelltAm") or heute)])
	ruhig = max(0, (date.fromisoformat(heute) - date.fromisoformat(letzte[:10])).days)
	verkauft_am = str((closing or {}).get("geaendertAm") or p.get("geaendertAm") or heute)[:7] if phase == "verkauft" else None
	oc = (override or {}).get("closingErwartet") or ""
	closing_erwartet = verkauft_am or (oc if re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", oc) else _plus_monate(heute, ph["monate"]))
	return {
		"projektId": p["id"], "titel": p.get("titel"), "land": p.get("land"), "typ": p.get("typ"), "mwp": p.get("mwp"), "projektStatus": p.get("status"),
		"phase": phase, "phaseLabel": ph["label"], "wahrscheinlichkeit": _rund2(w), "wahrscheinlichkeitStandard": standard_w, "manuell": manuell,
		"preis": preis, "preisQuelle": quelle, "provisionSatz": satz, "provisionSatzAnnahme": annahme, "provision": provision, "provisionGewichtet": _rund2(provision * w) if provision is not None else None,
		"interessenten": len(aktiv), "lois": len([i for i in aktiv if i.get("status") in ("loi_abgegeben", "loi_angenommen")]),
		"bieterverfahren": {"id": verfahren.get("id"), "status": verfahren.get("status")} if verfahren else None, "closing": {"id": closing.get("id"), "status": closing.get("status")} if closing else None,
		"closingErwartet": closing_erwartet, "quartal": _quartal(closing_erwartet), "tageRuhig": ruhig, "stockt": phase != "verkauft" and ruhig > STOCKT_TAGE,
		"notiz": (override or {}).get("notiz") or "", "override": {"vonName": override.get("vonName") or "", "am": override.get("am") or ""} if override else None,
	}


def pipeline_auswerten(karten):
	spalten = []
	for ph in PHASEN:
		k = [x for x in karten if x["phase"] == ph["id"]]
		spalten.append({**ph, "karten": k, "anzahl": len(k), "volumen": _rund2(sum(x["preis"] or 0 for x in k)), "provisionGewichtet": _rund2(sum(x["provisionGewichtet"] or 0 for x in k))})
	offen = [k for k in karten if k["phase"] != "verkauft"]
	verkauft = [k for k in karten if k["phase"] == "verkauft"]
	q = {}
	for k in offen:
		e = q.setdefault(k["quartal"], {"quartal": k["quartal"], "anzahl": 0, "provision": 0.0, "provisionGewichtet": 0.0})
		e["anzahl"] += 1
		e["provision"] = _rund2(e["provision"] + (k["provision"] or 0))
		e["provisionGewichtet"] = _rund2(e["provisionGewichtet"] + (k["provisionGewichtet"] or 0))
	return {
		"spalten": spalten,
		"summen": {"deals": len(offen), "volumen": _rund2(sum(k["preis"] or 0 for k in offen)), "provisionMoeglich": _rund2(sum(k["provision"] or 0 for k in offen)),
			"provisionGewichtet": _rund2(sum(k["provisionGewichtet"] or 0 for k in offen)), "verkauft": len(verkauft), "provisionVerkauft": _rund2(sum(k["provision"] or 0 for k in verkauft)),
			"stockend": len([k for k in offen if k["stockt"]]), "ohnePreis": len([k for k in offen if not k["preis"]])},
		"prognose": sorted(q.values(), key=lambda x: x["quartal"]),
	}


def override_pruefen(d=None):
	d = d or {}
	w = d.get("wahrscheinlichkeit")
	w = None if w in (None, "") else _zahl(w)
	if d.get("wahrscheinlichkeit") not in (None, "") and (w is None or not 0 <= w <= 100):
		raise ValueError("Wahrscheinlichkeit zwischen 0 und 100 %.")
	c = str(d.get("closingErwartet") or "")
	if c and not re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", c):
		raise ValueError("Erwartetes Closing als Monat (JJJJ-MM).")
	notiz = re.sub(r"\s+", " ", str(d.get("notiz") or "")).strip()[:500]
	if w is not None and len(notiz) < 10:
		raise ValueError("Bitte die abweichende Wahrscheinlichkeit begründen (mind. 10 Zeichen).")
	return {"wahrscheinlichkeit": None if w is None else int(round(w)), "closingErwartet": c, "notiz": notiz}


def bericht_csv(karten):
	def f(v):
		s = "" if v is None else (str(v).replace(".", ",") if isinstance(v, (int, float)) and not isinstance(v, bool) else str(v))
		if not isinstance(v, (int, float)) and s[:1] in ("=", "+", "-", "@", "\t", "\r"):
			s = "'" + s
		return '"' + s.replace('"', '""') + '"' if any(c in s for c in ';"\r\n') else s
	kopf = ["Projekt", "Titel", "Land", "MWp", "Phase", "Wahrscheinlichkeit %", "manuell", "Erwarteter Kaufpreis €", "Preisquelle", "Provisionssatz %", "Provision €", "Provision gewichtet €", "Interessenten", "LOIs", "Closing erwartet", "Tage ohne Aktivität", "Notiz"]
	z = [";".join(f(x) for x in [k["projektId"], k["titel"], k["land"], k["mwp"], k["phaseLabel"], int(round(k["wahrscheinlichkeit"] * 100)), "ja" if k["manuell"] else "nein", k["preis"], k["preisQuelle"], _rund2(k["provisionSatz"] * 100), k["provision"], k["provisionGewichtet"], k["interessenten"], k["lois"], k["closingErwartet"], k["tageRuhig"], k["notiz"]]) for k in karten]
	return "﻿" + "\r\n".join([";".join(kopf), *z]) + "\r\n"
