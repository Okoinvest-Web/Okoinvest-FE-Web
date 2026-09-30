# Copyright (c) 2026, ÖkoInvest GmbH
#
# Kundenseite Energie (Team 4) – reine Logik ohne Frappe, Gegenstück zu src/lib/plattform/kundenenergie.js
# (gleiche Regeln; Test auf Gleichheit in scripts/plattform-test-energiekunde.mjs --nur-logik und tests/test_kundenenergie_kern.py).
#
#   1. Kundenanliegen des Contracting-Kunden: Zustandsautomat je Art (einspruch, kuendigung, verlaengerung, kaufoption)
#   2. Lieferantenwechsel nach Zuschlag: Schritte mit Rolle, Voraussetzung, Frist
#   3. Energiekostenbericht (Netzbezug × Energiepreis + Contracting-Solarstrom)
#
# Fehler: FachFehler(status, text) – 403 Rolle, 409 Zustand/Frist, 422 Eingabe; die API übersetzt in Frappe-Fehler.

import calendar
import re
from datetime import date, timedelta


class FachFehler(Exception):
	def __init__(self, status, text):
		super().__init__(text)
		self.status = status
		self.text = text


DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _d(iso):
	return date.fromisoformat(str(iso)[:10])


def plus_tage(iso, tage):
	return (_d(iso) + timedelta(days=tage)).isoformat()


def tage_zwischen(von, bis):
	return (_d(bis) - _d(von)).days


def monate_zurueck(iso, monate):
	"""Datum minus Monate mit Monatsende-Kappung (31.12. − 3 Monate = 30.09.)."""
	j, m, t = (int(x) for x in str(iso)[:10].split("-"))
	idx = (j * 12 + (m - 1)) - monate
	jj, mm = divmod(idx, 12)
	mm += 1
	return date(jj, mm, min(t, calendar.monthrange(jj, mm)[1])).isoformat()


def _rund(x, s=2):
	return None if x is None else round(float(x) + 0.0, s)


def _text(v, maximal):
	s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(v if v is not None else "")).strip()
	return s[:maximal]


def _zahl(v, minimum=float("-inf"), maximum=float("inf"), stellen=2):
	"""None = leer, 'nan' = ungültig"""
	if v is None or v == "":
		return None
	try:
		x = float(str(v).replace(",", "."))
	except ValueError:
		return "nan"
	if x != x or x < minimum or x > maximum:
		return "nan"
	return round(x, stellen)


# ================================================================ 1. Kundenanliegen

ANLIEGEN_ARTEN = {
	"einspruch": {"label": "Einspruch gegen eine Abrechnung", "kurz": "Einspruch", "zielTage": 14, "bezug": "beleg"},
	"kuendigung": {"label": "Kündigung zum Laufzeitende", "kurz": "Kündigung", "zielTage": 14, "bezug": "anlage"},
	"verlaengerung": {"label": "Verlängerung des Liefervertrags anfragen", "kurz": "Verlängerung", "zielTage": 30, "bezug": "anlage"},
	"kaufoption": {"label": "Übernahme der Anlage (Kaufoption) anfragen", "kurz": "Übernahme", "zielTage": 30, "bezug": "anlage"},
}

EINSPRUCH_GRUENDE = {
	"menge": "Menge bzw. Zählerstand nicht nachvollziehbar",
	"preis": "Arbeitspreis oder Preisgleitung (Indexierung) falsch",
	"grundgebuehr": "Grundgebühr falsch",
	"zeitraum": "Abrechnungszeitraum falsch",
	"doppelt": "Doppelt abgerechnet",
	"ausfall": "Anlagenausfall bzw. Störung nicht berücksichtigt",
	"sonstiges": "Sonstiges",
}

ANLIEGEN_STATUS = {
	"eingereicht": {"label": "Eingereicht", "ton": "neutral", "offen": True},
	"in_pruefung": {"label": "In Prüfung", "ton": "info", "offen": True},
	"angebot": {"label": "Angebot liegt vor", "ton": "info", "offen": True},
	"stattgegeben": {"label": "Stattgegeben", "ton": "ok"},
	"teilweise": {"label": "Teilweise stattgegeben", "ton": "ok"},
	"bestaetigt": {"label": "Bestätigt", "ton": "ok"},
	"angenommen": {"label": "Angenommen", "ton": "ok"},
	"abgelehnt": {"label": "Abgelehnt", "ton": "warn"},
	"ausgeschlagen": {"label": "Angebot nicht angenommen", "ton": "neutral"},
	"zurueckgezogen": {"label": "Zurückgezogen", "ton": "neutral"},
}
ANLIEGEN_OFFEN = [k for k, x in ANLIEGEN_STATUS.items() if x.get("offen")]

AKTION_LABEL = {
	"pruefen": "In Prüfung nehmen", "stattgeben": "Stattgeben", "teilweise": "Teilweise stattgeben", "ablehnen": "Ablehnen", "bestaetigen": "Kündigung bestätigen",
	"angebot": "Angebot unterbreiten", "annehmen": "Angebot annehmen", "ausschlagen": "Angebot nicht annehmen", "zurueckziehen": "Zurückziehen",
}

_P = ("in_pruefung", "bo")
_Z = ("zurueckgezogen", "kunde")
_ABL = ("abgelehnt", "bo")
_ANG = ("angebot", "bo")
_VERTRAG = {
	"eingereicht": {"pruefen": _P, "angebot": _ANG, "ablehnen": _ABL, "zurueckziehen": _Z},
	"in_pruefung": {"angebot": _ANG, "ablehnen": _ABL, "zurueckziehen": _Z},
	"angebot": {"annehmen": ("angenommen", "kunde"), "ausschlagen": ("ausgeschlagen", "kunde"), "angebot": _ANG},
}
UEBERGAENGE = {
	"einspruch": {
		"eingereicht": {"pruefen": _P, "stattgeben": ("stattgegeben", "bo"), "teilweise": ("teilweise", "bo"), "ablehnen": _ABL, "zurueckziehen": _Z},
		"in_pruefung": {"stattgeben": ("stattgegeben", "bo"), "teilweise": ("teilweise", "bo"), "ablehnen": _ABL, "zurueckziehen": _Z},
	},
	"kuendigung": {
		"eingereicht": {"pruefen": _P, "bestaetigen": ("bestaetigt", "bo"), "ablehnen": _ABL, "zurueckziehen": _Z},
		"in_pruefung": {"bestaetigen": ("bestaetigt", "bo"), "ablehnen": _ABL, "zurueckziehen": _Z},
	},
	"verlaengerung": _VERTRAG,
	"kaufoption": _VERTRAG,
}


def uebergang(art, status, aktion, wer):
	t = ((UEBERGAENGE.get(art) or {}).get(status) or {}).get(aktion)
	if not t:
		raise FachFehler(409, f"„{AKTION_LABEL.get(aktion, aktion)}“ ist im Status „{(ANLIEGEN_STATUS.get(status) or {}).get('label', status)}“ nicht möglich.")
	if t[1] != wer:
		raise FachFehler(403, "Das entscheidet ÖkoInvest (Backoffice)." if t[1] == "bo" else "Diese Aktion führt der Kunde aus.")
	return t[0]


def erlaubte_aktionen(art, status, wer):
	return [a for a, t in ((UEBERGAENGE.get(art) or {}).get(status) or {}).items() if t[1] == wer]


def ziel_datum(art, eingereicht_am):
	return plus_tage(str(eingereicht_am)[:10], (ANLIEGEN_ARTEN.get(art) or {}).get("zielTage", 14))


def kuendigung_contracting(vertrag, heute):
	ende = (vertrag or {}).get("ende") or ""
	if not DATUM.match(ende):
		return {"ende": "", "stichtag": "", "tage": None, "fristgerecht": False}
	monate = max(0, int((vertrag or {}).get("kuendigungsfristMonate") or 0))
	stichtag = monate_zurueck(ende, monate)
	tage = tage_zwischen(heute, stichtag)
	return {"ende": ende, "stichtag": stichtag, "tage": tage, "fristgerecht": tage >= 0}


def _de(iso):
	return ".".join(reversed(str(iso)[:10].split("-")))


def anliegen_pruefen(art, d=None, beleg=None, vertrag=None, heute=None):
	d = d or {}
	if art not in ANLIEGEN_ARTEN:
		raise FachFehler(422, "Bitte wählen Sie die Art des Anliegens.")
	t = _text(d.get("text"), 3000)
	aus = {"art": art, "grund": "", "text": t, "betragStrittigEur": None, "wunschJahre": None, "wunschTermin": "", "wirksamZum": "", "stichtag": ""}
	if art == "einspruch":
		if not beleg:
			raise FachFehler(422, "Bitte wählen Sie die Rechnung, gegen die Sie Einspruch erheben.")
		if beleg.get("art") != "contracting" or beleg.get("beleg") != "rechnung":
			raise FachFehler(422, "Einspruch ist hier nur gegen Contracting-Rechnungen möglich.")
		if beleg.get("status") == "storniert":
			raise FachFehler(409, "Die Rechnung ist storniert.")
		aus["grund"] = d.get("grund") if d.get("grund") in EINSPRUCH_GRUENDE else ""
		if not aus["grund"]:
			raise FachFehler(422, "Bitte wählen Sie den Grund des Einspruchs.")
		if len(t) < 20:
			raise FachFehler(422, "Bitte begründen Sie den Einspruch nachvollziehbar (mindestens 20 Zeichen, z. B. abweichender Zählerstand).")
		b = _zahl(d.get("betragStrittigEur"), 0.01, float(beleg.get("brutto") or 1e9))
		if b == "nan":
			raise FachFehler(422, "Der strittige Betrag muss größer als 0 und höchstens der Rechnungsbetrag sein.")
		aus["betragStrittigEur"] = b
		return aus
	if not vertrag:
		raise FachFehler(422, "Für diese Anlage ist kein Stromliefervertrag hinterlegt.")
	if vertrag.get("status") != "aktiv":
		raise FachFehler(409, "Der Vertrag ist bereits gekündigt." if vertrag.get("status") == "gekuendigt" else "Der Vertrag ist nicht mehr aktiv.")
	if art == "kuendigung":
		if d.get("bestaetigt") is not True:
			raise FachFehler(422, "Bitte bestätigen Sie die Kündigungserklärung ausdrücklich.")
		k = kuendigung_contracting(vertrag, heute)
		if not k["ende"]:
			raise FachFehler(422, "Vertragsbeginn und Laufzeit fehlen – bitte wenden Sie sich an ÖkoInvest.")
		if not k["fristgerecht"]:
			raise FachFehler(409, f"Die Kündigungsfrist zum Laufzeitende ({_de(k['ende'])}) ist am {_de(k['stichtag'])} abgelaufen. Bitte klären Sie die Verlängerungsregelung Ihres Vertrags mit ÖkoInvest (Anfrage „Verlängerung“ oder Nachricht).")
		return {**aus, "wirksamZum": k["ende"], "stichtag": k["stichtag"]}
	if art == "verlaengerung":
		j = _zahl(d.get("wunschJahre"), 1, 20, 0)
		if j is None or j == "nan":
			raise FachFehler(422, "Bitte geben Sie die gewünschte Verlängerung in Jahren an (1–20).")
		return {**aus, "wunschJahre": int(j)}
	w = str(d.get("wunschTermin") or "")
	if w and (not DATUM.match(w) or w < heute):
		raise FachFehler(422, "Der Wunschtermin muss ein Datum in der Zukunft sein.")
	return {**aus, "wunschTermin": w or vertrag.get("ende") or ""}


def aktion_pruefen(art, aktion, d=None, anliegen=None, heute=None):
	d = d or {}
	anliegen = anliegen or {}
	begruendung = _text(d.get("begruendung"), 3000)
	aus = {"begruendung": begruendung, "korrekturEur": None, "angebot": None}
	if aktion in ("ablehnen", "stattgeben", "teilweise", "bestaetigen") and len(begruendung) < 10:
		raise FachFehler(422, "Bitte ergänzen Sie einen kurzen Bestätigungstext (mind. 10 Zeichen, z. B. Rückbau- oder Übergaberegelung)." if aktion == "bestaetigen" else "Bitte begründen Sie die Entscheidung (mindestens 10 Zeichen) – der Kunde erhält sie schriftlich.")
	if aktion in ("teilweise", "stattgeben"):
		k = _zahl(d.get("korrekturEur"), 0.01, 1e9)
		if k == "nan":
			raise FachFehler(422, "Der Korrekturbetrag muss größer als 0 sein.")
		if aktion == "teilweise" and k is None:
			raise FachFehler(422, "Bitte geben Sie den Korrekturbetrag (Gutschrift) an.")
		strittig = anliegen.get("betragStrittigEur")
		if strittig and k is not None and aktion == "teilweise" and k >= strittig:
			raise FachFehler(422, "Bei teilweiser Stattgabe liegt die Korrektur unter dem strittigen Betrag – sonst bitte „Stattgeben“.")
		aus["korrekturEur"] = k if k is not None else strittig
	if aktion == "angebot":
		gueltig = str(d.get("gueltigBis") or "")
		if not DATUM.match(gueltig) or gueltig <= heute:
			raise FachFehler(422, "Bitte geben Sie an, bis wann das Angebot gilt (Datum in der Zukunft).")
		atext = _text(d.get("text"), 2000)
		if art == "kaufoption":
			betrag = _zahl(d.get("betragEur"), 1, 1e9)
			if betrag is None or betrag == "nan":
				raise FachFehler(422, "Bitte geben Sie den Kaufpreis (netto) an.")
			stichtag = str(d.get("stichtag") or anliegen.get("wunschTermin") or "")
			if not DATUM.match(stichtag):
				raise FachFehler(422, "Bitte geben Sie den Übergabestichtag an.")
			aus["angebot"] = {"betragEur": betrag, "stichtag": stichtag, "gueltigBis": gueltig, "text": atext}
		else:
			jahre = _zahl(d.get("jahre"), 1, 20, 0)
			preis = _zahl(d.get("preisCt"), 0, 100, 3)
			if jahre is None or jahre == "nan":
				raise FachFehler(422, "Bitte geben Sie die Verlängerung in Jahren an (1–20).")
			if preis is None or preis == "nan":
				raise FachFehler(422, "Bitte geben Sie den Arbeitspreis der Verlängerung in ct/kWh an.")
			grund = _zahl(d.get("grundgebuehrMonat"), 0, 1e6)
			if grund == "nan":
				raise FachFehler(422, "Die Grundgebühr ist ungültig.")
			aus["angebot"] = {"jahre": int(jahre), "preisCt": preis, "grundgebuehrMonat": grund, "gueltigBis": gueltig, "text": atext}
	if aktion == "annehmen":
		a = anliegen.get("angebot")
		if not a:
			raise FachFehler(409, "Es liegt kein Angebot vor.")
		if a["gueltigBis"] < heute:
			raise FachFehler(409, f"Das Angebot war nur bis {_de(a['gueltigBis'])} gültig – bitte fordern Sie ein neues an.")
		if d.get("bestaetigt") is not True:
			raise FachFehler(422, "Bitte bestätigen Sie die Annahme ausdrücklich.")
	return aus


# ================================================================ 2. Lieferantenwechsel

WECHSEL_SCHRITTE = [
	{"id": "zuschlag", "label": "Zuschlag erteilt", "wer": []},
	{"id": "vertrag_versorger", "label": "Liefervertrag vom Versorger bereitgestellt", "wer": ["lieferant", "bo"], "nach": ["zuschlag"]},
	{"id": "vertrag_kunde", "label": "Liefervertrag gegengezeichnet", "wer": ["kunde", "bo"], "nach": ["vertrag_versorger"]},
	{"id": "kuendigung_alt", "label": "Bisheriger Vertrag gekündigt", "wer": ["bo", "kunde"], "nach": ["zuschlag"], "vorvertrag": True},
	{"id": "kuendigung_bestaetigt", "label": "Kündigungsbestätigung liegt vor", "wer": ["kunde", "bo"], "nach": ["kuendigung_alt"], "vorvertrag": True},
	{"id": "anmeldung_netz", "label": "Anmeldung beim Netzbetreiber bestätigt", "wer": ["lieferant", "bo"], "nach": ["vertrag_kunde"]},
	{"id": "lieferbeginn", "label": "Belieferung begonnen", "wer": ["lieferant", "bo"], "nach": ["anmeldung_netz"]},
	{"id": "erste_rechnung", "label": "Erste Rechnung geprüft", "wer": ["kunde", "bo"], "nach": ["lieferbeginn"]},
]
WECHSEL_ROLLE = {"kunde": "Kunde", "lieferant": "Versorger", "bo": "ÖkoInvest", "system": "System"}
KRITISCH = ("kuendigung_alt", "anmeldung_netz")
ALARM_SCHRITTE = ("kuendigung_alt", "anmeldung_netz", "vertrag_kunde")


def wechsel_anlegen(zuschlag_am, lieferbeginn, stichtag_alt=None, mit_vorvertrag=False):
	z = str(zuschlag_am or "")[:10]
	lb = f"{lieferbeginn}-01"
	frist = {
		"zuschlag": z, "vertrag_versorger": plus_tage(z, 10), "vertrag_kunde": plus_tage(z, 21), "kuendigung_alt": stichtag_alt or None,
		"kuendigung_bestaetigt": plus_tage(stichtag_alt, 14) if stichtag_alt else None, "anmeldung_netz": plus_tage(lb, -1), "lieferbeginn": lb, "erste_rechnung": plus_tage(lb, 45),
	}
	aus = []
	for s in WECHSEL_SCHRITTE:
		status = "erledigt" if s["id"] == "zuschlag" else ("entfaellt" if s.get("vorvertrag") and not mit_vorvertrag else "offen")
		aus.append({"id": s["id"], "status": status, "frist": frist[s["id"]], "am": str(zuschlag_am or "") if s["id"] == "zuschlag" else None, "von": "system" if s["id"] == "zuschlag" else None, "bemerkung": ""})
	return aus


def wechsel_schritt_erledigen(schritte, schritt_id, wer, am=None, bemerkung=""):
	definition = next((s for s in WECHSEL_SCHRITTE if s["id"] == schritt_id), None)
	s = next((x for x in schritte if x["id"] == schritt_id), None)
	if not definition or not s:
		raise FachFehler(422, "Unbekannter Schritt.")
	if s["status"] == "erledigt":
		raise FachFehler(409, "Dieser Schritt ist bereits erledigt.")
	if s["status"] == "entfaellt":
		raise FachFehler(409, "Dieser Schritt entfällt (kein bisheriger Vertrag).")
	if wer not in definition["wer"]:
		raise FachFehler(403, f"Diesen Schritt bestätigt {' oder '.join(WECHSEL_ROLLE[w] for w in definition['wer'])}.")
	status = {x["id"]: x["status"] for x in schritte}
	fehlt = [i for i in definition.get("nach", []) if status.get(i) not in ("erledigt", "entfaellt")]
	if fehlt:
		raise FachFehler(409, "Zuerst: " + ", ".join(next(x["label"] for x in WECHSEL_SCHRITTE if x["id"] == i) for i in fehlt) + ".")
	return [({**x, "status": "erledigt", "am": am, "von": wer, "bemerkung": _text(bemerkung, 300)} if x["id"] == schritt_id else x) for x in schritte]


def wechsel_stand(schritte, heute):
	relevant = [s for s in schritte if s["status"] != "entfaellt"]
	erledigt = len([s for s in relevant if s["status"] == "erledigt"])
	ueberfaellig = [s["id"] for s in relevant if s["status"] == "offen" and s.get("frist") and s["frist"] < heute]
	naechster = next((s["id"] for s in relevant if s["status"] == "offen"), None)
	fertig = erledigt == len(relevant)
	kritisch = any(i in KRITISCH for i in ueberfaellig)
	return {
		"erledigt": erledigt, "gesamt": len(relevant), "prozent": round(erledigt / len(relevant) * 100) if relevant else 0, "abgeschlossen": fertig,
		"ueberfaellig": ueberfaellig, "naechster": naechster, "ampel": "gruen" if fertig else ("rot" if kritisch else ("gelb" if ueberfaellig else "gruen")),
	}


# ================================================================ 3. Energiekostenbericht


def kostenreport(jahr, vertraege=None, netz_monate=None, pv_monate=None):
	j = int(jahr)
	vertraege = vertraege or []
	pv_monate = pv_monate or []
	monate = []
	geschaetzt = False
	ohne_preis = False
	for m in range(1, 13):
		monat = f"{j}-{m:02d}"
		anfang = f"{monat}-01"
		ende = date(j, m, calendar.monthrange(j, m)[1]).isoformat()
		passend = [x for x in vertraege if x.get("status") != "entwurf" and (not x.get("beginn") or x["beginn"] <= ende) and (not x.get("vertragEnde") or x["vertragEnde"] >= anfang)]
		passend.sort(key=lambda x: str(x.get("beginn") or ""), reverse=True)
		vt = passend[0] if passend else None
		netz = netz_monate[m - 1] if isinstance(netz_monate, list) and len(netz_monate) >= m and isinstance(netz_monate[m - 1], (int, float)) else None
		netz_g = False
		if netz is None and vt and vt.get("jahresKwh"):
			netz = round(vt["jahresKwh"] / 12)
			netz_g = True
			geschaetzt = True
		ct = vt.get("energiepreisCt") if vt and isinstance(vt.get("energiepreisCt"), (int, float)) else None
		if vt and ct is None:
			ohne_preis = True
		netz_eur = _rund(netz * ct / 100) if netz is not None and ct is not None else None
		pv = [x for x in pv_monate if x.get("monat") == monat]
		pv_kwh = sum(float(x.get("kwh") or 0) for x in pv) if pv else 0
		pv_eur = _rund(sum(float(x.get("netto") or 0) for x in pv)) if pv else 0
		pv_ct = _rund(pv_eur / pv_kwh * 100, 3) if pv_kwh > 0 else None
		gesamt_kwh = (netz or 0) + pv_kwh
		gesamt_eur = _rund((netz_eur or 0) + pv_eur)
		monate.append({
			"monat": monat, "lieferant": (vt or {}).get("lieferant") or "", "struktur": (vt or {}).get("struktur") or "", "netzKwh": netz, "netzGeschaetzt": netz_g, "netzCt": ct, "netzEur": netz_eur,
			"pvKwh": pv_kwh, "pvEur": pv_eur, "pvCt": pv_ct, "gesamtKwh": gesamt_kwh, "gesamtEur": gesamt_eur,
			"mischpreisCt": _rund(gesamt_eur / gesamt_kwh * 100, 3) if gesamt_kwh > 0 and (netz_eur is not None or not netz) else None,
			"pvErsparnisEur": _rund(pv_kwh * ct / 100 - pv_eur) if pv_kwh > 0 and ct is not None else None,
		})

	def s(k):
		return _rund(sum(float(x.get(k) or 0) for x in monate))

	summe = {k: s(k) for k in ("netzKwh", "netzEur", "pvKwh", "pvEur", "gesamtKwh", "gesamtEur", "pvErsparnisEur")}
	summe["mischpreisCt"] = _rund(summe["gesamtEur"] / summe["gesamtKwh"] * 100, 3) if summe["gesamtKwh"] > 0 else None
	summe["pvAnteil"] = _rund(summe["pvKwh"] / summe["gesamtKwh"], 4) if summe["gesamtKwh"] > 0 else None
	hinweise = ["Nur Energiekomponente: Netzentgelte, Umlagen, Abgaben und Steuern sind nicht enthalten. Die tatsächliche Ersparnis durch Solarstrom vor Ort ist deshalb in der Regel höher."]
	if geschaetzt:
		hinweise.append("Netzbezug teilweise geschätzt (Jahresmenge des Vertrags ÷ 12) – für genaue Werte bitte den Lastgang hochladen.")
	if ohne_preis:
		hinweise.append("Für Verträge mit Tranchen- oder Spotpreis steht der Energiepreis erst mit der Lieferantenrechnung fest – diese Monate sind ohne Betrag.")
	if not summe["pvKwh"]:
		hinweise.append("Keine Contracting-Rechnungen im Jahr – Solarstrom ist nicht enthalten.")
	return {"jahr": j, "monate": monate, "summe": summe, "hinweise": hinweise}
