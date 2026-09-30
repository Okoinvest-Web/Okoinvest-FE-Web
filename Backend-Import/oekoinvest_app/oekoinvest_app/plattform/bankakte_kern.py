# Copyright (c) 2026, ÖkoInvest GmbH
#
# Bank-Akte je Finanzierungsanfrage – reine Logik ohne Frappe (Spiegel von src/lib/plattform/finanzierung/bankakte.js):
# Bank-Teamrollen (Leitung / Sachbearbeitung / Nur lesen) je Aktion, Unterlagen-Anforderungen, Q&A, Kreditentscheidung,
# Auszahlungsanträge (nur mit erfüllten UND von der Bank bestätigten CPs, Summe ≤ Kreditbetrag), Monitoring-Berichte.

import math
import re
from datetime import date

BANK_TEAMROLLEN = {"leitung": "Leitung / Kreditentscheidung", "sachbearbeiter": "Sachbearbeitung", "lesen": "Nur lesen"}
_STUFE = {"lesen": 1, "sachbearbeiter": 2, "leitung": 3}
BANK_AKTION_ROLLE = {
	"termsheet": "sachbearbeiter", "rueckfrage": "sachbearbeiter", "frage": "sachbearbeiter", "anforderung": "sachbearbeiter", "anforderung_pruefen": "sachbearbeiter",
	"cp_bestaetigen": "sachbearbeiter", "bericht_anfordern": "sachbearbeiter", "bericht_pruefen": "sachbearbeiter", "zustaendig": "sachbearbeiter",
	"absage": "leitung", "kreditentscheidung": "leitung", "auszahlung_entscheiden": "leitung", "team": "leitung",
}
QA_KATEGORIEN = {"technik": "Technik / Ertrag", "recht": "Recht / Verträge / Genehmigung", "kommerziell": "Kommerziell / Erlöse", "steuer": "Steuern / Gesellschaft", "sonstiges": "Sonstiges"}
KREDIT_ERGEBNIS = {"genehmigt": "Kredit genehmigt", "genehmigt_auflagen": "Genehmigt mit Auflagen", "abgelehnt": "Abgelehnt"}
BERICHT_ARTEN = {
	"covenant": "Covenant-Report (DSCR/LLCR)", "ertrag": "Ertrags- und Verfügbarkeitsbericht", "jahresabschluss": "Jahresabschluss der Projektgesellschaft",
	"betrieb": "Technischer Betriebsbericht", "versicherung": "Versicherungsnachweis", "sonstiges": "Sonstiger Bericht",
}


class BankakteFehler(Exception):
	def __init__(self, text, status=422):
		super().__init__(text)
		self.status = status


def _pflicht(b, text, status=422):
	if not b:
		raise BankakteFehler(text, status)


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


def _zahl(v, mini, maxi, stellen=2):
	if v is None or v == "" or isinstance(v, (dict, list, bool)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if n != n or n < mini or n > maxi:
		return None
	f = 10 ** stellen
	return math.floor(n * f + 0.5) / f  # wie Math.round in JS


def rolle_reicht(rolle, noetig):
	return _STUFE.get(rolle or "", 0) >= _STUFE.get(noetig or "", 99)


def rolle_aus(mitglieder, bank_id, bank_konten, konto_id):
	"""Aktives Mitglied → dessen Rolle; ohne Eintrag, aber im Bankenstamm verknüpft (Erstkontakt) → „leitung“; sonst None."""
	if not bank_id or not konto_id:
		return None
	for m in mitglieder or []:
		if m.get("bankId") == bank_id and m.get("nutzerId") == konto_id and m.get("status") != "eingeladen":
			return m.get("rolle") if m.get("status") == "aktiv" and m.get("rolle") in BANK_TEAMROLLEN else None
	return "leitung" if konto_id in (bank_konten or []) else None


def anforderungen_bereinigen(d, heute=None, bausteine=()):
	d = d or {}
	punkte = d.get("punkte") if isinstance(d.get("punkte"), list) else [d]
	liste = [{"titel": _txt(p.get("titel"), 200), "beschreibung": _txt(p.get("beschreibung"), 1000), "baustein": p.get("baustein") if p.get("baustein") in bausteine else "", "frist": _datum(p.get("frist"))} for p in punkte[:20] if isinstance(p, dict)]
	for p in liste:
		_pflicht(len(p["titel"]) >= 3, "Bitte jede angeforderte Unterlage benennen.")
		_pflicht(p["frist"], "Bitte eine Frist je Unterlage angeben.")
		if heute:
			_pflicht(p["frist"] > str(heute)[:10], "Die Frist muss in der Zukunft liegen.")
	_pflicht(len(liste) >= 1, "Bitte mindestens eine Unterlage anfordern.")
	return liste


def frage_bereinigen(d):
	d = d or {}
	f = {"frage": _txt(d.get("frage") if d.get("frage") is not None else d.get("text"), 3000), "kategorie": d.get("kategorie") if d.get("kategorie") in QA_KATEGORIEN else "sonstiges"}
	_pflicht(len(f["frage"]) >= 5, "Bitte Ihre Frage eingeben.")
	return f


def kreditentscheidung_bereinigen(d, anfrage_status, termsheet_betrag=None, heute=None):
	d = d or {}
	_pflicht(anfrage_status == "ausgewaehlt", "Die Kreditentscheidung ist erst möglich, wenn ÖkoInvest Ihr Angebot ausgewählt hat.", 409)
	auflagen = d.get("auflagen") if isinstance(d.get("auflagen"), list) else re.split(r"\n+", str(d.get("auflagen") or ""))
	k = {
		"ergebnis": d.get("ergebnis") if d.get("ergebnis") in KREDIT_ERGEBNIS else "", "gremium": _txt(d.get("gremium"), 120), "beschlussAm": _datum(d.get("beschlussAm")),
		"betrag": _zahl(d.get("betrag"), 1, 5e9, 0), "gueltigBis": _datum(d.get("gueltigBis")),
		"auflagen": [x for x in (_txt(y, 300) for y in auflagen) if len(x) >= 3][:20], "begruendung": _txt(d.get("begruendung"), 2000),
	}
	_pflicht(k["ergebnis"], "Bitte das Ergebnis der Kreditentscheidung wählen.")
	_pflicht(k["beschlussAm"], "Bitte das Beschlussdatum angeben.")
	if heute:
		_pflicht(k["beschlussAm"] <= str(heute)[:10], "Das Beschlussdatum darf nicht in der Zukunft liegen.")
	if k["ergebnis"] == "abgelehnt":
		_pflicht(len(k["begruendung"]) >= 10, "Bitte die Ablehnung begründen (mind. 10 Zeichen).")
		k["betrag"], k["auflagen"] = None, []
	else:
		_pflicht((k["betrag"] or 0) > 0, "Bitte den genehmigten Kreditbetrag angeben.")
		if termsheet_betrag:
			_pflicht(k["betrag"] <= termsheet_betrag * 1.1 + 0.5, "Der genehmigte Betrag liegt mehr als 10 % über dem Term Sheet – bitte ein neues Term Sheet abgeben.")
		_pflicht(k["gueltigBis"], "Bitte angeben, bis wann die Kreditzusage gilt.")
		_pflicht(k["gueltigBis"] > k["beschlussAm"], "Die Zusage muss nach dem Beschlussdatum gültig sein.")
		if k["ergebnis"] == "genehmigt_auflagen":
			_pflicht(len(k["auflagen"]) >= 1, "Bitte die Auflagen benennen.")
	return k


def cp_offen(cps, cp_bank):
	return [c for c in (cps or []) if not c.get("erledigt") or (cp_bank or {}).get(c.get("id"), {}).get("status") != "bestaetigt"]


def auszahlung_bereinigen(d, kreditvertrag, cps, cp_bank, auszahlungen, heute=None):
	d = d or {}
	_pflicht(kreditvertrag, "Ohne Kreditvertrag keine Auszahlung.", 409)
	a = {"betrag": _zahl(d.get("betrag"), 1, 5e9, 0), "wunschDatum": _datum(d.get("wunschDatum")), "zweck": _txt(d.get("zweck"), 500)}
	_pflicht((a["betrag"] or 0) > 0, "Bitte den Auszahlungsbetrag angeben.")
	_pflicht(a["wunschDatum"], "Bitte das gewünschte Valutadatum angeben.")
	if heute:
		_pflicht(a["wunschDatum"] >= str(heute)[:10], "Das Valutadatum darf nicht in der Vergangenheit liegen.")
	_pflicht(len(a["zweck"]) >= 5, "Bitte den Verwendungszweck angeben (z. B. EPC-Rate 1 laut Zahlungsplan).")
	offen = cp_offen(cps, cp_bank)
	_pflicht(not offen, "Auszahlungsvoraussetzungen offen: " + "; ".join(c.get("label", "") for c in offen[:3]), 409)
	summe = sum(x.get("betrag") or 0 for x in (auszahlungen or []) if x.get("status") != "abgelehnt")
	_pflicht(summe + a["betrag"] <= (kreditvertrag.get("betrag") or 0) + 0.5, "Die Ziehungen übersteigen den Kreditbetrag.")
	return a


def bericht_bereinigen(d, heute=None, mit_frist=False):
	d = d or {}
	b = {"art": d.get("art") if d.get("art") in BERICHT_ARTEN else "", "periode": _txt(d.get("periode"), 40), "faelligAm": _datum(d.get("faelligAm")), "bemerkung": _txt(d.get("bemerkung"), 1000)}
	_pflicht(b["art"], "Bitte die Art des Berichts wählen.")
	_pflicht(len(b["periode"]) >= 2, "Bitte den Berichtszeitraum angeben (z. B. Q3/2026 oder GJ 2025).")
	if mit_frist:
		_pflicht(b["faelligAm"], "Bitte das Fälligkeitsdatum angeben.")
		if heute:
			_pflicht(b["faelligAm"] >= str(heute)[:10], "Das Fälligkeitsdatum darf nicht in der Vergangenheit liegen.")
	return b


def akte_stand(akte, heute):
	h = str(heute or "")[:10]
	anf = (akte or {}).get("anforderungen") or []
	ber = (akte or {}).get("berichte") or []
	return {
		"anforderungenOffen": len([x for x in anf if x.get("status") in ("offen", "nachforderung")]),
		"anforderungenUeberfaellig": len([x for x in anf if x.get("status") in ("offen", "nachforderung") and x.get("frist") and x["frist"] < h]),
		"anforderungenZuPruefen": len([x for x in anf if x.get("status") == "geliefert"]),
		"fragenOffen": len([x for x in (akte or {}).get("qa") or [] if x.get("status") == "offen"]),
		"berichteFaellig": len([x for x in ber if x.get("status") == "angefordert"]),
		"berichteUeberfaellig": len([x for x in ber if x.get("status") == "angefordert" and x.get("faelligAm") and x["faelligAm"] < h]),
		"berichteZuPruefen": len([x for x in ber if x.get("status") == "eingereicht"]),
		"auszahlungenOffen": len([x for x in (akte or {}).get("auszahlungen") or [] if x.get("status") in ("beantragt", "freigegeben")]),
	}
