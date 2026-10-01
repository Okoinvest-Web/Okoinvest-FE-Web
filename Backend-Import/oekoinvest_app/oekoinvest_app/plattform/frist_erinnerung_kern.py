# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fristerinnerungen per täglichem Lauf – reine Regeln, 1:1 wie src/lib/plattform/fristErinnerung.js (ohne Frappe testbar).
#
#   Pachtakte       Späteste Frist bis Baubeginn, „Verlängerung oder Rückbau abstimmen“, Ende der Grundlaufzeit, Vertragsende
#                   laut Kündigung → Eigentümer + Backoffice (90/30/7/0 Tage vorher); Rückbausicherheit fehlt → Backoffice (wöchentlich)
#   Genossenschaft  Einzahlungsfrist (7/0 Tage vorher) → Mitglied; überfällig → zusätzlich Backoffice
#   Gemeinde        Frist einer offenen Stellungnahme (7/2/0 Tage vorher) → angefragte Seite; überfällig → beide
#
# Schlüssel je Objekt/Frist/Datum/Stufe – gesendete Schlüssel merkt sich das Backend (Plattform Aktivitaet, aktion „frist_erinnerung“).

import re
from datetime import date

ERINNERUNG_STUFEN = {"pacht": [90, 30, 7, 0], "einzahlung": [7, 0], "stellungnahme": [7, 2, 0]}
UEBERFAELLIG_TAGE = 30
_TAG = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
PACHT_FRISTEN = ("baubeginn", "vorbereitung", "ende", "kuendigung")


def ist_datum(s):
	return bool(_TAG.match(str(s or "")[:10]))


def _d(s):
	j, m, t = (int(x) for x in str(s)[:10].split("-"))
	return date(j, m, t)


def tage_bis(heute, frist):
	return (_d(frist) - _d(heute)).days


def _datum_de(s):
	return ".".join(reversed(str(s or "")[:10].split("-")))


def _kompakt(s):
	return "".join(str(s or "")[:10].split("-"))


def _eur(x):
	return f"{int(round(float(x or 0))):,} €".replace(",", ".")


def erinnerungs_stufe(frist, heute, stufen=None):
	stufen = ERINNERUNG_STUFEN["pacht"] if stufen is None else stufen
	if not ist_datum(frist) or not ist_datum(heute):
		return None
	tage = tage_bis(heute, frist)
	if tage < 0:
		return {"stufe": "ueberfaellig", "tage": tage} if tage >= -UEBERFAELLIG_TAGE else None
	s = next((x for x in sorted(stufen) if tage <= x), None)
	return None if s is None else {"stufe": f"t{s}", "tage": tage}


def erinnerungs_schluessel(*teile):
	return ":".join(str(x) for x in teile if x not in (None, ""))[:60]


def _wann(tage):
	if tage > 1:
		return f"in {tage} Tagen"
	if tage == 1:
		return "morgen"
	if tage == 0:
		return "heute"
	return f"seit {-tage} {'Tag' if tage == -1 else 'Tagen'} überschritten"


def pacht_erinnerungen(vertrag=None, fristen=None, akte=None, heute=""):
	out = []
	if not vertrag or vertrag.get("status") not in ("aktiv", "gekuendigt"):
		return out
	name = vertrag.get("bezeichnung") or vertrag.get("id")
	for f in fristen or []:
		if f.get("id") not in PACHT_FRISTEN:
			continue
		if vertrag["status"] == "gekuendigt" and f["id"] != "kuendigung":
			continue
		st = erinnerungs_stufe(f.get("datum"), heute, ERINNERUNG_STUFEN["pacht"])
		if not st:
			continue
		out.append({
			"schluessel": erinnerungs_schluessel("PA", vertrag["id"], f["id"], _kompakt(f["datum"]), st["stufe"]),
			"an": ["eigentuemer", "backoffice"],
			"titel": f"Frist: {f['titel']}",
			"text": f"„{name}“ – {f['titel']} am {_datum_de(f['datum'])} ({_wann(st['tage'])}). {f.get('text') or ''}".strip(),
			"frist": f["datum"],
			"stufe": st["stufe"],
		})
	s = (akte or {}).get("sicherheit") or {}
	beginn = vertrag.get("beginn")
	if s.get("status") == "vorgesehen" and s.get("ab") == "baubeginn" and ist_datum(beginn) and str(beginn) <= str(heute):
		tage = -tage_bis(heute, beginn)
		w = f"w{tage // 7}"
		out.append({
			"schluessel": erinnerungs_schluessel("PA", vertrag["id"], "sicherheit", w),
			"an": ["backoffice"],
			"titel": "Rückbausicherheit fehlt",
			"text": f"„{name}“: Die Rückbausicherheit ist ab Baubeginn ({_datum_de(beginn)}) vereinbart, aber noch nicht als hinterlegt erfasst.",
			"frist": beginn,
			"stufe": w,
		})
	return out


def einzahlung_erinnerungen(mitglied=None, offen_eur=0, geno_name="", heute=""):
	if not mitglied or mitglied.get("status") != "zugelassen" or not float(offen_eur or 0) > 0:
		return []
	st = erinnerungs_stufe(mitglied.get("einzahlungFrist"), heute, ERINNERUNG_STUFEN["einzahlung"])
	if not st:
		return []
	ueber = st["stufe"] == "ueberfaellig"
	nr = f" – Mitgliedsnummer {mitglied['nr']}" if mitglied.get("nr") else ""
	return [{
		"schluessel": erinnerungs_schluessel("GM", mitglied["id"], "einzahlung", _kompakt(mitglied["einzahlungFrist"]), st["stufe"]),
		"an": ["mitglied", "backoffice"] if ueber else ["mitglied"],
		"titel": "Einzahlungsfrist überschritten" if ueber else "Erinnerung: Einzahlung auf Ihre Geschäftsanteile",
		"text": f"{f'{geno_name}: ' if geno_name else ''}Offen {_eur(offen_eur)}, Einzahlungsfrist {_datum_de(mitglied['einzahlungFrist'])} ({_wann(st['tage'])}){nr}.",
		"frist": mitglied["einzahlungFrist"],
		"stufe": st["stufe"],
	}]


def stellungnahme_erinnerungen(akte_id=None, gemeinde="", stellungnahmen=None, heute=""):
	out = []
	for s in stellungnahmen or []:
		if s.get("status") != "offen" or not ist_datum(s.get("frist")):
			continue
		st = erinnerungs_stufe(s["frist"], heute, ERINNERUNG_STUFEN["stellungnahme"])
		if not st:
			continue
		angefragt = "gemeinde" if s.get("von") == "oekoinvest" else "backoffice"
		ueber = st["stufe"] == "ueberfaellig"
		an = list(dict.fromkeys([angefragt, "backoffice"])) if ueber else [angefragt]
		out.append({
			"schluessel": erinnerungs_schluessel("GS", akte_id, s.get("id"), _kompakt(s["frist"]), st["stufe"]),
			"an": an,
			"titel": "Frist der Stellungnahme überschritten" if ueber else "Erinnerung: Frist der Stellungnahme",
			"text": f"{f'{gemeinde}: ' if gemeinde else ''}„{s.get('betreff')}“ – Frist {_datum_de(s['frist'])} ({_wann(st['tage'])}).",
			"frist": s["frist"],
			"stufe": st["stufe"],
		})
	return out
