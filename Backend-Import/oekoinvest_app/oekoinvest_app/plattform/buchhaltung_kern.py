# Copyright (c) 2026, ÖkoInvest GmbH
#
# Buchhaltung – reine Logik OHNE Frappe-Import (python -m unittest, tests/test_buchhaltung_kern.py).
# 1:1-Spiegel von src/lib/plattform/buchhaltung/{mahnwesen,zahlungsimport,op,export,abschluss}.js – bei Änderungen beide
# Seiten nachziehen. Rechtlicher Rahmen und Hinweise siehe dort (Verzugszinsen § 288 BGB / § 456 UGB / Art. 104 OR,
# Pauschale § 288 Abs. 5 BGB / § 458 UGB; Basiszinssatz wird NICHT vorbelegt).

import hashlib
import html
import re
from datetime import date, timedelta

from oekoinvest_app.plattform.finanzen.logik import datum_de, euro, ist_datum, monats_zeitraum, plus_tage, rund2, tage_zwischen
from oekoinvest_app.plattform.finanzen.steuer import STEUERVORLAGEN

# ================================================================ Mahnwesen

MAHN_STANDARD = {
	"stufen": [
		{"stufe": 1, "label": "Zahlungserinnerung", "abTagen": 7, "gebuehr": 0, "fristTage": 7},
		{"stufe": 2, "label": "1. Mahnung", "abTagen": 21, "gebuehr": 5, "fristTage": 10},
		{"stufe": 3, "label": "2. Mahnung", "abTagen": 35, "gebuehr": 10, "fristTage": 10},
	],
	"verzugszinsen": False, "basiszinssatz": None, "pauschaleB2b": False, "mindestBetrag": 5, "aufschlagStufe": 3,
}
ZINS_REGELN = {
	"AT": {"b2b": {"aufschlag": 9.2, "norm": "§ 456 UGB"}, "b2c": {"fix": 4, "norm": "§ 1000 Abs. 1 ABGB"}},
	"DE": {"b2b": {"aufschlag": 9, "norm": "§ 288 Abs. 2 BGB"}, "b2c": {"aufschlag": 5, "norm": "§ 288 Abs. 1 BGB"}},
	"CH": {"b2b": {"fix": 5, "norm": "Art. 104 OR"}, "b2c": {"fix": 5, "norm": "Art. 104 OR"}},
}
PAUSCHALE_B2B = {"betrag": 40, "norm": {"DE": "§ 288 Abs. 5 BGB", "AT": "§ 458 UGB"}}
STORNO_KREIS = "ST"
MAHN_KREIS = "MA"


def _zahl(x, std):
	try:
		return float(x) if x not in (None, "") else std
	except (TypeError, ValueError):
		return std


def mahn_konfig_pruefen(k=None):
	"""Konfiguration prüfen/normalisieren – ValueError mit deutscher Meldung."""
	k = k or {}
	roh = k.get("stufen") or MAHN_STANDARD["stufen"]
	if len(roh) > 5:
		raise ValueError("Höchstens fünf Mahnstufen.")
	stufen = []
	for i, s in enumerate(roh):
		st = {"stufe": i + 1, "label": str(s.get("label") or f"{i + 1}. Stufe").strip()[:60], "abTagen": int(round(_zahl(s.get("abTagen"), 0))), "gebuehr": rund2(_zahl(s.get("gebuehr"), 0)), "fristTage": int(round(_zahl(s.get("fristTage"), 7)))}
		if not 1 <= st["abTagen"] <= 365:
			raise ValueError(f"Stufe {st['stufe']}: „ab Tagen“ muss zwischen 1 und 365 liegen.")
		if not 0 <= st["gebuehr"] <= 100:
			raise ValueError(f"Stufe {st['stufe']}: Mahngebühr zwischen 0 und 100 €.")
		if not 3 <= st["fristTage"] <= 60:
			raise ValueError(f"Stufe {st['stufe']}: Zahlungsfrist zwischen 3 und 60 Tagen.")
		if stufen and st["abTagen"] <= stufen[-1]["abTagen"]:
			raise ValueError("Die Stufen müssen nach Tagen aufsteigend sein.")
		stufen.append(st)
	basis = k.get("basiszinssatz")
	basis = None if basis in (None, "") else _zahl(basis, None)
	if basis is not None and not -5 <= basis <= 15:
		raise ValueError("Basiszinssatz unplausibel (−5 bis 15 %).")
	mindest = rund2(_zahl(k.get("mindestBetrag"), MAHN_STANDARD["mindestBetrag"]))
	if not 0 <= mindest <= 1000:
		raise ValueError("Mindestbetrag zwischen 0 und 1.000 €.")
	return {"stufen": stufen, "verzugszinsen": bool(k.get("verzugszinsen")), "basiszinssatz": basis, "pauschaleB2b": bool(k.get("pauschaleB2b")), "mindestBetrag": mindest,
		"aufschlagStufe": min(len(stufen), max(1, int(round(_zahl(k.get("aufschlagStufe"), len(stufen))))))}


def ist_b2b(partei):
	partei = partei or {}
	return bool(partei.get("uid") or partei.get("organisation") or partei.get("firma"))


def verzugszins_satz(land, b2b, basiszinssatz):
	r = (ZINS_REGELN.get(land) or ZINS_REGELN["AT"])["b2b" if b2b else "b2c"]
	if "fix" in r:
		return {"satz": r["fix"], "norm": r["norm"]}
	if basiszinssatz is None:
		return {"satz": None, "norm": r["norm"]}
	return {"satz": rund2(float(basiszinssatz) + r["aufschlag"]), "norm": r["norm"]}


def gezahlt(b):
	return rund2(sum(float(z.get("betrag") or 0) for z in (b.get("zahlungen") or [])))


def offener_betrag(b):
	if b.get("status") in ("bezahlt", "storniert"):
		return 0.0
	return max(0.0, rund2(float(b.get("brutto") or 0) - gezahlt(b)))


def mahnkosten(b):
	return rund2(sum(float(m.get("gebuehr") or 0) + float(m.get("zinsen") or 0) + float(m.get("pauschale") or 0) for m in (b.get("mahnungen") or [])))


def mahn_vorschlag(b, heute, konfig=None, land="AT"):
	k = konfig if konfig and konfig.get("stufen") and "mindestBetrag" in konfig else mahn_konfig_pruefen(konfig or MAHN_STANDARD)
	if not b or b.get("beleg") != "rechnung" or b.get("status") != "offen" or not ist_datum(b.get("faelligAm")) or not ist_datum(heute):
		return None
	tage = tage_zwischen(b["faelligAm"], heute)
	if tage <= 0:
		return None
	offen = offener_betrag(b)
	if offen <= 0:
		return None
	bisher = [m for m in (b.get("mahnungen") or []) if not m.get("storniert")]
	letzte = None
	for m in bisher:
		if int(m.get("stufe") or 0) > int((letzte or {}).get("stufe") or 0):
			letzte = m
	letzte_stufe = int((letzte or {}).get("stufe") or 0)
	naechste = k["stufen"][letzte_stufe] if letzte_stufe < len(k["stufen"]) else None
	basis = {"tage": tage, "offen": offen, "stufe": naechste["stufe"] if naechste else letzte_stufe, "label": naechste["label"] if naechste else "Alle Stufen ausgeschöpft"}
	sperre = b.get("mahnsperre")
	if sperre and (not sperre.get("bis") or heute <= sperre["bis"]):
		return {**basis, "faellig": False, "gesperrt": True, "grund": f"Mahnsperre{(' bis ' + datum_de(sperre['bis'])) if sperre.get('bis') else ''}: {sperre.get('grund') or 'Einwand/Klärung'}"}
	if not naechste:
		return {**basis, "faellig": False, "eskalation": True, "grund": "Alle Mahnstufen ausgeschöpft – Übergabe an Inkasso/Rechtsanwalt bzw. Klärung prüfen."}
	if offen < k["mindestBetrag"]:
		return {**basis, "faellig": False, "grund": f"Offener Betrag unter dem Mindestbetrag ({euro(k['mindestBetrag'])})."}
	if tage < naechste["abTagen"]:
		return {**basis, "faellig": False, "grund": f"{naechste['label']} ab {naechste['abTagen']} Tagen Überfälligkeit (aktuell {tage})."}
	letzte_frist = (letzte.get("frist") or plus_tage(str(letzte.get("am"))[:10], 7)) if letzte else None
	if letzte_frist and heute <= letzte_frist:
		return {**basis, "faellig": False, "grund": f"Frist der {letzte.get('label') or 'letzten Mahnung'} läuft bis {datum_de(letzte_frist)}."}
	b2b = ist_b2b(b.get("partei"))
	zinsen, zinssatz, zins_norm = 0.0, None, ""
	if k["verzugszinsen"]:
		z = verzugszins_satz(land, b2b, k["basiszinssatz"])
		zins_norm = z["norm"]
		if z["satz"] is not None:
			zinssatz = z["satz"]
			bereits = rund2(sum(float(m.get("zinsen") or 0) for m in bisher))
			zinsen = max(0.0, rund2(offen * (z["satz"] / 100) * tage / 365 - bereits))
	pauschale_schon = any(float(m.get("pauschale") or 0) > 0 for m in bisher)
	pauschale = PAUSCHALE_B2B["betrag"] if k["pauschaleB2b"] and b2b and land in ("DE", "AT") and not pauschale_schon and naechste["stufe"] >= 2 else 0
	gebuehr = naechste["gebuehr"]
	kosten = rund2(mahnkosten({"mahnungen": bisher}) + gebuehr + zinsen + pauschale)
	return {**basis, "faellig": True, "gebuehr": gebuehr, "zinsen": zinsen, "zinssatz": zinssatz, "zinsNorm": zins_norm, "pauschale": pauschale,
		"pauschaleNorm": PAUSCHALE_B2B["norm"].get(land, "") if pauschale else "", "kostenGesamt": kosten, "gesamt": rund2(offen + kosten),
		"frist": plus_tage(heute, naechste["fristTage"]), "eskalation": naechste["stufe"] >= k["aufschlagStufe"], "b2b": b2b}


def mahn_text(b, m):
	z = [
		f"sicher ist es Ihrer Aufmerksamkeit entgangen: Zur Rechnung {b['nummer']} vom {datum_de(b.get('rechnungsdatum'))} (fällig am {datum_de(b.get('faelligAm'))}) konnten wir noch keinen Zahlungseingang feststellen."
		if m["stufe"] == 1 else f"trotz unserer bisherigen Erinnerung ist die Rechnung {b['nummer']} vom {datum_de(b.get('rechnungsdatum'))} (fällig am {datum_de(b.get('faelligAm'))}) weiterhin offen.",
		f"Wir bitten Sie, den offenen Betrag von {euro(m['gesamt'])} bis zum {datum_de(m['frist'])} zu überweisen.",
		"Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos. Bei Rückfragen oder Einwänden zur Rechnung antworten Sie bitte über das Portal.",
	]
	if m.get("eskalation"):
		z.append("Sollte bis zum genannten Termin keine Zahlung eingehen, behalten wir uns weitere Schritte zur Durchsetzung der Forderung vor.")
	return z


# ================================================================ Zahlungsimport (CAMT/CSV) und Zuordnung

IMPORT_MAX_ZEILEN = 2000
NUMMER = re.compile(r"\b([A-Z]{2})-(20\d\d)-(\d{5})\b")


def betrag_lesen(s):
	t = re.sub(r"[€\s ]|EUR", "", str(s if s is not None else ""), flags=re.I).strip()
	if not t:
		return None
	neg = False
	if t.startswith("(") and t.endswith(")"):
		neg, t = True, t[1:-1]
	if t.endswith("-"):
		neg, t = True, t[:-1]
	if t.startswith("+"):
		t = t[1:]
	if t.startswith("-"):
		neg, t = (not neg), t[1:]
	if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", t) or re.fullmatch(r"\d+,\d+", t):
		t = t.replace(".", "").replace(",", ".")
	elif re.fullmatch(r"\d{1,3}(,\d{3})+(\.\d+)?", t):
		t = t.replace(",", "")
	if not re.fullmatch(r"\d+(\.\d+)?", t):
		return None
	x = float(t)
	return -x if neg else x


def datum_lesen(s):
	t = str(s or "").strip()
	m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", t)
	if m:
		iso = f"{m[1]}-{m[2]}-{m[3]}"
		return iso if ist_datum(iso) else ""
	m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})", t)
	if m:
		j = f"20{m[3]}" if len(m[3]) == 2 else m[3]
		iso = f"{j}-{m[2].zfill(2)}-{m[1].zfill(2)}"
		return iso if ist_datum(iso) else ""
	m = re.fullmatch(r"(\d{4})(\d{2})(\d{2})", t)
	if m:
		iso = f"{m[1]}-{m[2]}-{m[3]}"
		return iso if ist_datum(iso) else ""
	return ""


_P = r"(?:[A-Za-z0-9_]+:)?"


def _bloecke(xml, tag):
	return [m.group(1) for m in re.finditer(rf"<{_P}{tag}\b[^>]*>([\s\S]*?)</{_P}{tag}>", xml)]


def _text(s):
	return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def _erster(xml, pfad):
	teil = xml or ""
	for tag in pfad:
		b = _bloecke(teil, tag)
		if not b:
			return ""
		teil = b[0]
	return _text(teil)


def buchung_schluessel(z):
	return "|".join([z["datum"], f"{rund2(z['betrag']):.2f}", z["richtung"], (z.get("referenz") or "")[:60], (z.get("zweck") or "")[:140].upper(), (z.get("iban") or "")[-8:]])


def camt_lesen(xml):
	text = str(xml or "")
	if not re.search(r"<(?:[A-Za-z0-9_]+:)?(BkToCstmrStmt|BkToCstmrDbtCdtNtfctn|BkToCstmrAcctRpt)\b", text):
		raise ValueError("Keine CAMT-Datei (BkToCstmrStmt/…Ntfctn fehlt).")
	amt_re = re.compile(r"<(?:[A-Za-z0-9_]+:)?Amt\b[^>]*Ccy=\"([A-Z]{3})\"[^>]*>([^<]+)<")
	aus = []
	for ntry in _bloecke(text, "Ntry"):
		status = _erster(ntry, ["Sts", "Cd"]) or _erster(ntry, ["Sts"])
		if status and not status.upper().startswith("BOOK"):
			continue
		richtung = "ausgang" if _erster(ntry, ["CdtDbtInd"]) == "DBIT" else "eingang"
		datum = datum_lesen(_erster(ntry, ["BookgDt", "Dt"]) or _erster(ntry, ["BookgDt", "DtTm"]))
		valuta = datum_lesen(_erster(ntry, ["ValDt", "Dt"]) or _erster(ntry, ["ValDt", "DtTm"]))
		amt_n = amt_re.search(ntry)
		ref_n = _erster(ntry, ["AcctSvcrRef"])
		txs = _bloecke(ntry, "TxDtls")
		for tx in (txs or [ntry]):
			amt = (amt_re.search(tx) if len(txs) > 1 else None) or amt_n
			if not amt:
				continue
			partei = "Dbtr" if richtung == "eingang" else "Cdtr"
			zweck = " ".join([x for x in [*(_text(u) for u in _bloecke(tx, "Ustrd")), _erster(tx, ["CdtrRefInf", "Ref"])] if x])
			e2e = _erster(tx, ["Refs", "EndToEndId"])
			e2e = "" if e2e.upper() == "NOTPROVIDED" else e2e
			aus.append({
				"datum": datum or valuta, "valuta": valuta or datum, "betrag": rund2(float(amt.group(2))), "waehrung": amt.group(1), "richtung": richtung, "zweck": zweck[:500],
				"name": (_erster(tx, ["RltdPties", partei, "Pty", "Nm"]) or _erster(tx, ["RltdPties", partei, "Nm"]))[:140],
				"iban": re.sub(r"\s+", "", _erster(tx, ["RltdPties", f"{partei}Acct", "Id", "IBAN"])).upper(),
				"referenz": (e2e or _erster(tx, ["Refs", "AcctSvcrRef"]) or ref_n)[:80],
			})
	return aus


SPALTEN = {
	"datum": ["buchungstag", "buchungsdatum", "buchung", "datum", "date", "booking date"], "valuta": ["valuta", "wertstellung", "value date"],
	"betrag": ["betrag", "umsatz", "amount", "betrag (eur)", "betrag eur"], "haben": ["haben", "gutschrift", "eingang", "credit"], "soll": ["soll", "lastschrift", "belastung", "ausgang", "debit"],
	"zweck": ["verwendungszweck", "buchungstext", "zahlungsreferenz", "zweck", "text", "remittance", "beschreibung"],
	"name": ["auftraggeber", "zahlungspflichtiger", "beguenstigter", "begünstigter", "empfänger", "name", "gegenpartei", "partner"],
	"iban": ["iban", "kontonummer", "gegenkonto", "iban auftraggeber"], "referenz": ["end-to-end", "endtoend", "e2e", "referenz", "bankreferenz", "kundenreferenz"],
	"waehrung": ["währung", "waehrung", "currency", "wkz"],
}


def _csv_zeilen(text):
	t = str(text or "").lstrip("﻿")
	kopf = next((z for z in t.splitlines() if z.strip()), "")
	trenner = max([";", "\t", ","], key=lambda c: len(kopf.split(c)))
	zeilen, feld, zeile, in_q, i = [], "", [], False, 0
	while i < len(t):
		c = t[i]
		if in_q:
			if c == '"' and t[i + 1:i + 2] == '"':
				feld += '"'
				i += 1
			elif c == '"':
				in_q = False
			else:
				feld += c
		elif c == '"':
			in_q = True
		elif c == trenner:
			zeile.append(feld)
			feld = ""
		elif c in "\r\n":
			if c == "\r" and t[i + 1:i + 2] == "\n":
				i += 1
			zeile.append(feld)
			if any(x.strip() for x in zeile):
				zeilen.append(zeile)
			zeile, feld = [], ""
		else:
			feld += c
		i += 1
		if len(zeilen) > IMPORT_MAX_ZEILEN + 30:
			break
	zeile.append(feld)
	if any(x.strip() for x in zeile):
		zeilen.append(zeile)
	return zeilen


def _spalte(kopf, namen, belegt):
	k = [x.strip().lower() for x in kopf]
	for n in namen:
		for i, x in enumerate(k):
			if i not in belegt and x == n:
				return i
	for n in namen:
		for i, x in enumerate(k):
			if i not in belegt and n in x:
				return i
	return -1


def csv_lesen(text):
	zeilen = _csv_zeilen(text)
	if len(zeilen) < 2:
		raise ValueError("Die CSV-Datei enthält keine Buchungen.")
	ki = next((i for i, z in enumerate(zeilen) if any(re.search(r"datum|buchung|date", x, re.I) for x in z) and any(re.search(r"betrag|umsatz|amount|haben|soll", x, re.I) for x in z)), -1)
	if ki < 0:
		raise ValueError("Kopfzeile nicht erkannt – erwartet werden Spalten wie „Buchungsdatum“, „Betrag“, „Verwendungszweck“.")
	belegt, idx = set(), {}
	for feld_, namen in SPALTEN.items():
		i = _spalte(zeilen[ki], namen, belegt)
		idx[feld_] = i
		if i >= 0:
			belegt.add(i)
	if idx["datum"] < 0 or (idx["betrag"] < 0 and idx["haben"] < 0):
		raise ValueError("Spalten für Datum und Betrag nicht gefunden.")
	aus = []
	for z in zeilen[ki + 1:ki + 1 + IMPORT_MAX_ZEILEN]:
		wert = lambda f: str(z[idx[f]]).strip() if idx[f] >= 0 and idx[f] < len(z) else ""  # noqa: E731
		datum = datum_lesen(wert("datum"))
		betrag = betrag_lesen(wert("betrag")) if idx["betrag"] >= 0 else None
		if betrag is None:
			h, s = betrag_lesen(wert("haben")), betrag_lesen(wert("soll"))
			betrag = abs(h) if h else (-abs(s) if s is not None else None)
		if not datum or not betrag:
			continue
		w = wert("waehrung").upper()
		aus.append({"datum": datum, "valuta": datum_lesen(wert("valuta")) or datum, "betrag": rund2(abs(betrag)), "waehrung": w if re.fullmatch(r"[A-Z]{3}", w) else "EUR",
			"richtung": "ausgang" if betrag < 0 else "eingang", "zweck": re.sub(r"\s+", " ", wert("zweck"))[:500], "name": wert("name")[:140],
			"iban": re.sub(r"\s+", "", wert("iban")).upper()[:34], "referenz": wert("referenz")[:80]})
	return aus


def auszug_lesen(inhalt, format_=""):
	t = str(inhalt or "")
	if not t.strip():
		raise ValueError("Die Datei ist leer.")
	camt = format_ == "camt" or (format_ != "csv" and re.match(r"^\s*(<\?xml|<(?:[A-Za-z0-9_]+:)?Document\b)", t))
	buchungen_ = camt_lesen(t) if camt else csv_lesen(t)
	if len(buchungen_) > IMPORT_MAX_ZEILEN:
		raise ValueError(f"Höchstens {IMPORT_MAX_ZEILEN} Buchungen je Import.")
	return {"format": "camt" if camt else "csv", "buchungen": buchungen_}


_STOPP = {"gmbh", "demo", "fiktiv", "und", "co", "kg"}


def _namensteile(s):
	return {x for x in re.sub(r"[^a-zäöüß0-9 ]", " ", str(s or "").lower()).split() if len(x) >= 4 and x not in _STOPP}


def nummern_in(text):
	t = re.sub(r"\b([A-Z]{2})[\s/]?(20\d\d)[\s/-]?(\d{5})\b", r"\1-\2-\3", str(text or "").upper())
	return list(dict.fromkeys(f"{m[1]}-{m[2]}-{m[3]}" for m in NUMMER.finditer(t)))


def zuordnen(buchung, belege):
	eingang = buchung.get("richtung") != "ausgang"
	kand = [b for b in belege if b["beleg"] == "rechnung" and b["status"] == "offen"] if eingang else [b for b in belege if b["beleg"] == "gutschrift" and b["status"] in ("angewiesen", "offen")]
	nummern = nummern_in(f"{buchung.get('zweck', '')} {buchung.get('referenz', '')}")
	treffer = [b for b in kand if b["nummer"] in nummern]
	if buchung.get("waehrung") and buchung["waehrung"] != "EUR":
		return {"art": "keiner", "text": f"Fremdwährung {buchung['waehrung']} – bitte manuell prüfen."}
	soll = lambda b: rund2(b.get("offen") if b.get("offen") is not None else b["brutto"])  # noqa: E731
	if len(treffer) == 1:
		b = treffer[0]
		diff = rund2(buchung["betrag"] - soll(b))
		if abs(diff) < 0.01:
			return {"art": "sicher", "belegId": b["id"], "nummer": b["nummer"], "differenz": 0, "text": f"Belegnummer und Betrag stimmen ({b['nummer']})."}
		txt = f"Teilzahlung zu {b['nummer']}: es fehlen {f'{-diff:.2f}'.replace('.', ',')} €." if diff < 0 else f"Überzahlung zu {b['nummer']}: {f'{diff:.2f}'.replace('.', ',')} € zu viel – Erstattung/Verrechnung klären."
		return {"art": "nummer", "belegId": b["id"], "nummer": b["nummer"], "differenz": diff, "text": txt}
	if len(treffer) > 1:
		return {"art": "keiner", "text": f"Mehrere Belegnummern ({', '.join(b['nummer'] for b in treffer)}) – bitte manuell aufteilen."}
	gleich = [b for b in kand if abs(soll(b) - buchung["betrag"]) < 0.01]
	passend = [b for b in gleich if _namensteile((b.get("partei") or {}).get("name")) & _namensteile(buchung.get("name"))]
	if len(passend) == 1:
		b = passend[0]
		return {"art": "betrag", "belegId": b["id"], "nummer": b["nummer"], "differenz": 0, "text": f"Betrag und Name passen zu {b['nummer']} (ohne Belegnummer im Zweck) – bitte bestätigen."}
	if len(gleich) == 1 and not buchung.get("name"):
		b = gleich[0]
		return {"art": "betrag", "belegId": b["id"], "nummer": b["nummer"], "differenz": 0, "text": f"Einziger offener Beleg mit diesem Betrag: {b['nummer']} – bitte bestätigen."}
	return {"art": "keiner", "text": "Keine offene Rechnung erkannt – manuell zuordnen oder ignorieren." if eingang else "Ausgang ohne passende Gutschrift – ignorieren oder manuell zuordnen."}


# ================================================================ OP-Liste, Storno, Nummernkreise

ALTERSKLASSEN = [("nicht_faellig", "nicht fällig", 0), ("t1_30", "1–30 Tage", 30), ("t31_60", "31–60 Tage", 60), ("t61_90", "61–90 Tage", 90), ("t90", "über 90 Tage", float("inf"))]


def altersklasse(tage):
	if not tage or tage <= 0:
		return ALTERSKLASSEN[0]
	return next(k for k in ALTERSKLASSEN if tage <= k[2])


def op_liste(belege, heute, art="", richtung=""):
	posten = []
	for b in belege:
		forderung = b.get("beleg") == "rechnung"
		if (b.get("status") != "offen") if forderung else (b.get("status") not in ("offen", "angewiesen")):
			continue
		if art and b.get("art") != art:
			continue
		if richtung and (richtung == "forderung") != forderung:
			continue
		offen = offener_betrag(b) if forderung else rund2(b.get("brutto"))
		if offen <= 0:
			continue
		tage = tage_zwischen(b["faelligAm"], heute) if ist_datum(b.get("faelligAm")) else 0
		kl = altersklasse(tage)
		stufe = max([0] + [int(m.get("stufe") or 0) for m in (b.get("mahnungen") or []) if not m.get("storniert")])
		posten.append({
			"id": b["id"], "nummer": b["nummer"], "art": b.get("art"), "beleg": b.get("beleg"), "richtung": "forderung" if forderung else "verbindlichkeit",
			"empfaenger": (b.get("partei") or {}).get("name") or b.get("empfaenger") or "", "gesellschaftId": b.get("gesellschaftId"), "gesellschaft": (b.get("aussteller") or {}).get("name") or b.get("gesellschaft") or "",
			"rechnungsdatum": b.get("rechnungsdatum"), "faelligAm": b.get("faelligAm"), "tageUeberfaellig": max(0, tage), "altersklasse": kl[0], "altersklasseLabel": kl[1],
			"brutto": rund2(b.get("brutto")), "gezahlt": gezahlt(b), "offen": offen, "mahnstufe": stufe, "mahnkosten": mahnkosten(b), "status": b.get("status"),
		})
	posten.sort(key=lambda p: (-p["tageUeberfaellig"], str(p["faelligAm"])))
	je = {k[0]: 0.0 for k in ALTERSKLASSEN}
	for p in posten:
		if p["richtung"] == "forderung":
			je[p["altersklasse"]] = rund2(je[p["altersklasse"]] + p["offen"])
	summe = lambda liste: rund2(sum(p["offen"] for p in liste))  # noqa: E731
	return {"posten": posten, "summen": {
		"forderungen": summe([p for p in posten if p["richtung"] == "forderung"]), "verbindlichkeiten": summe([p for p in posten if p["richtung"] == "verbindlichkeit"]),
		"ueberfaellig": summe([p for p in posten if p["richtung"] == "forderung" and p["tageUeberfaellig"] > 0]), "mahnkosten": rund2(sum(p["mahnkosten"] for p in posten)), "jeKlasse": je}}


def storno_beleg(b, nummer, datum, grund):
	neg = lambda x: rund2(-float(x or 0))  # noqa: E731
	gs = b.get("beleg") == "gutschrift"
	st = dict(b.get("steuer") or {})
	st["betrag"] = neg(st.get("betrag"))
	return {
		"nummer": nummer, "ursprungId": b["id"], "ursprungNummer": b["nummer"], "ursprungDatum": b.get("rechnungsdatum"), "ursprung": b.get("beleg"), "art": b.get("art"),
		"titel": "Storno-Gutschrift" if gs else "Stornorechnung (Rechnungskorrektur)", "datum": datum, "grund": grund, "partei": b.get("partei"), "aussteller": b.get("aussteller"),
		"gesellschaftId": b.get("gesellschaftId"), "zeitraum": b.get("zeitraum"), "positionen": [{**p, "preis": neg(p.get("preis")), "betrag": neg(p.get("betrag"))} for p in (b.get("positionen") or [])],
		"netto": neg(b.get("netto")), "steuer": st, "brutto": neg(b.get("brutto")), "bereitsGezahlt": rund2(b.get("brutto")) if b.get("status") == "bezahlt" else gezahlt(b),
		"text": f"{'Storno der Gutschrift' if gs else 'Storno der Rechnung'} {b['nummer']} vom {datum_de(b.get('rechnungsdatum'))}. Grund: {grund}",
	}


def storno_erlaubt(b):
	if not b:
		return {"ok": False, "grund": "Beleg nicht gefunden."}
	if b.get("status") == "storniert":
		return {"ok": False, "grund": "Der Beleg ist bereits storniert."}
	if b.get("status") == "angewiesen":
		return {"ok": False, "grund": "Die Gutschrift ist zur Zahlung angewiesen – zuerst den Zahlungslauf verwerfen bzw. den Beleg zurücksetzen."}
	return {"ok": True, "grund": ""}


def nummern_luecken(nummern):
	je = {}
	for n in nummern:
		m = re.fullmatch(r"([A-Z]{2})-(\d{4})-(\d{5})", str(n or ""))
		if m:
			je.setdefault(f"{m[1]}-{m[2]}", []).append(int(m[3]))
	aus = []
	for k, liste in je.items():
		s, fehlt = set(liste), []
		for i in range(1, max(liste) + 1):
			if i not in s:
				fehlt.append(f"{k}-{i:05d}")
			if len(fehlt) >= 20:
				break
		if fehlt:
			aus.append({"kreis": k, "fehlt": fehlt})
	return aus


# ================================================================ Export DATEV / BMD / OP

EXPORT_FORMATE = {"datev": "DATEV-Buchungsstapel (CSV)", "bmd": "BMD NTCS Buchungsimport (CSV)", "op": "Offene-Posten-Liste (CSV)"}
KONTEN_STANDARD = {
	"datev": {"beraternummer": "", "mandantennummer": "", "sachkontenlaenge": 4, "wjBeginn": "01-01", "debitor": "10000", "kreditor": "70000", "bank": "1200",
		"erloes": {"provision": "8400", "contracting": "8400", "provision_rc": "8338", "contracting_rc": "8337"}, "aufwand": {"pacht": "4210"}, "buSchluessel": {}},
	"bmd": {"debitor": "200000", "kreditor": "330000", "bank": "2800", "erloes": {"provision": "4000", "contracting": "4000", "provision_rc": "4030", "contracting_rc": "4030"},
		"aufwand": {"pacht": "7400"}, "buchsymbol": {"rechnung": "AR", "gutschrift": "ER", "storno": "AR", "zahlung": "BK"}, "steuercode": {}},
}


def konten_pruefen(k=None):
	k = k or {}
	z = lambda x, std: str(x).strip() if re.fullmatch(r"[0-9]{1,9}", str(x if x is not None else "").strip()) else std  # noqa: E731
	frei = lambda o: {a: str(b) for a, b in list((o or {}).items())[:40] if re.fullmatch(r"[A-Za-z0-9-]{2,40}", str(a)) and re.fullmatch(r"[0-9A-Za-z]{1,6}", str(b))}  # noqa: E731
	D, B = KONTEN_STANDARD["datev"], KONTEN_STANDARD["bmd"]
	d, b = k.get("datev") or {}, k.get("bmd") or {}
	return {
		"datev": {
			"beraternummer": str(d.get("beraternummer")) if re.fullmatch(r"\d{4,7}", str(d.get("beraternummer") or "")) else "",
			"mandantennummer": str(d.get("mandantennummer")) if re.fullmatch(r"\d{1,5}", str(d.get("mandantennummer") or "")) else "",
			"sachkontenlaenge": int(d.get("sachkontenlaenge")) if str(d.get("sachkontenlaenge")) in ("4", "5", "6", "7", "8") else D["sachkontenlaenge"],
			"wjBeginn": d.get("wjBeginn") if re.fullmatch(r"(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])", str(d.get("wjBeginn") or "")) else D["wjBeginn"],
			"debitor": z(d.get("debitor"), D["debitor"]), "kreditor": z(d.get("kreditor"), D["kreditor"]), "bank": z(d.get("bank"), D["bank"]),
			"erloes": {x: z((d.get("erloes") or {}).get(x), D["erloes"][x]) for x in D["erloes"]}, "aufwand": {x: z((d.get("aufwand") or {}).get(x), D["aufwand"][x]) for x in D["aufwand"]},
			"buSchluessel": frei(d.get("buSchluessel")),
		},
		"bmd": {
			"debitor": z(b.get("debitor"), B["debitor"]), "kreditor": z(b.get("kreditor"), B["kreditor"]), "bank": z(b.get("bank"), B["bank"]),
			"erloes": {x: z((b.get("erloes") or {}).get(x), B["erloes"][x]) for x in B["erloes"]}, "aufwand": {x: z((b.get("aufwand") or {}).get(x), B["aufwand"][x]) for x in B["aufwand"]},
			"buchsymbol": {x: (str((b.get("buchsymbol") or {}).get(x)).strip() if re.fullmatch(r"[0-9A-Za-z]{1,6}", str((b.get("buchsymbol") or {}).get(x) or "").strip()) else B["buchsymbol"][x]) for x in B["buchsymbol"]},
			"steuercode": frei(b.get("steuercode")),
		},
	}


def buchungen(posten, konten, format_="datev"):
	k = konten[format_]
	rc = lambda p: p.get("steuerArt") in ("reverse_charge", "nicht_steuerbar")  # noqa: E731
	erloes = lambda p: k["erloes"].get(f"{p.get('art')}{'_rc' if rc(p) else ''}") or k["erloes"].get(p.get("art")) or k["erloes"]["provision"]  # noqa: E731
	aus = []
	for p in posten:
		basis = {"datum": p["datum"], "beleg": p["nummer"], "text": str(p.get("text") or "")[:60], "steuerVorlage": p.get("steuerVorlage") or "", "steuerBetrag": rund2(p.get("steuerBetrag") or 0), "steuerSatz": float(p.get("steuerSatz") or 0), "typ": p["typ"]}
		t = p["typ"]
		if t == "rechnung":
			aus.append({**basis, "betrag": rund2(p["brutto"]), "soll": k["debitor"], "haben": erloes(p)})
		elif t == "gutschrift":
			aus.append({**basis, "betrag": rund2(p["brutto"]), "soll": k["aufwand"]["pacht"], "haben": k["kreditor"]})
		elif t == "storno":
			if p.get("ursprung") == "gutschrift":
				aus.append({**basis, "betrag": rund2(abs(p["brutto"])), "soll": k["kreditor"], "haben": k["aufwand"]["pacht"]})
			else:
				aus.append({**basis, "betrag": rund2(abs(p["brutto"])), "soll": erloes(p), "haben": k["debitor"]})
		elif t == "zahlung":
			basis.update({"steuerVorlage": "", "steuerBetrag": 0})
			if p.get("richtung") == "ausgang":
				aus.append({**basis, "betrag": rund2(p["brutto"]), "soll": k["kreditor"], "haben": k["bank"]})
			else:
				aus.append({**basis, "betrag": rund2(p["brutto"]), "soll": k["bank"], "haben": k["debitor"]})
	return sorted([b for b in aus if b["betrag"] > 0], key=lambda b: (str(b["datum"]), str(b["beleg"])))


def _komma(x):
	return f"{rund2(abs(float(x or 0))):.2f}".replace(".", ",")


def _feld(s):
	return '"' + re.sub(r"[\r\n;]+", " ", str(s if s is not None else "").replace('"', '""'))[:60] + '"'


def datev_csv(zeilen, konten, von, bis, erzeugt_am):
	d = konten["datev"]
	jahr = str(von or "")[:4] or str(erzeugt_am)[:4]
	wj = f"{jahr}{d['wjBeginn'].replace('-', '')}"
	zeit = re.sub(r"[:.TZ-]", "", str(erzeugt_am))[:17].ljust(17, "0")  # Zeichenklasse umgestellt (Tailwind-Scan)
	kopf = ";".join(str(x) for x in ['"EXTF"', 700, 21, '"Buchungsstapel"', 13, zeit, "", '"RE"', '"OekoInvest"', '""', d["beraternummer"] or "", d["mandantennummer"] or "", wj, d["sachkontenlaenge"],
		str(von).replace("-", ""), str(bis).replace("-", ""), _feld("OekoInvest Plattform"), '""', 1, 0, 0, '"EUR"', "", '""', "", "", '""', '""'])
	spalten = ";".join(f'"{s}"' for s in ["Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz", "Kurs", "Basis-Umsatz", "WKZ Basis-Umsatz", "Konto", "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum", "Belegfeld 1", "Belegfeld 2", "Skonto", "Buchungstext"])
	koerper = [";".join([_komma(z["betrag"]), '"S"', '"EUR"', "", "", "", z["soll"], z["haben"], _feld(d["buSchluessel"].get(z["steuerVorlage"], "")), z["datum"][8:10] + z["datum"][5:7],
		_feld(re.sub(r"[^A-Za-z0-9$&%*+\-/]", "", str(z["beleg"]))[:36]), '""', "", _feld(z["text"])]) for z in zeilen]
	return "\r\n".join([kopf, spalten, *koerper]) + "\r\n"


def bmd_csv(zeilen, konten):
	b = konten["bmd"]
	txt = lambda s: re.sub(r'[;\r\n"]+', " ", str(s or ""))[:60]  # noqa: E731
	kopf = "satzart;konto;gkonto;belegnr;belegdat;buchsymbol;buchcode;prozent;steuercode;betrag;steuer;text"
	koerper = [";".join(["0", z["soll"], z["haben"], txt(z["beleg"]), f"{z['datum'][8:10]}.{z['datum'][5:7]}.{z['datum'][:4]}", b["buchsymbol"].get(z["typ"], b["buchsymbol"]["rechnung"]), "1",
		str(rund2(z["steuerSatz"] * 100)).replace(".", ",").removesuffix(",0") if z["steuerSatz"] else "", b["steuercode"].get(z["steuerVorlage"], ""), _komma(z["betrag"]), _komma(z["steuerBetrag"]) if z["steuerBetrag"] else "", txt(z["text"])]) for z in zeilen]
	return "﻿" + "\r\n".join([kopf, *koerper]) + "\r\n"


def op_csv(liste):
	def w(v):
		s = "" if v is None else (str(rund2(v)).replace(".", ",") if isinstance(v, (int, float)) and not isinstance(v, bool) else str(v))
		if not isinstance(v, (int, float)) and re.match(r"^[=+\-@\t\r]", s):
			s = "'" + s
		return '"' + s.replace('"', '""') + '"' if re.search(r'[;"\r\n]', s) else s
	kopf = ["Beleg", "Art", "Empfänger", "Gesellschaft", "Rechnungsdatum", "Fällig am", "Tage überfällig", "Altersklasse", "Brutto", "Gezahlt", "Offen", "Mahnstufe", "Mahnkosten", "Status"]
	zeilen = [";".join(w(x) for x in [o["nummer"], o.get("artLabel"), o["empfaenger"], o["gesellschaft"], o["rechnungsdatum"], o["faelligAm"], o["tageUeberfaellig"], o["altersklasseLabel"], o["brutto"], o["gezahlt"], o["offen"], o["mahnstufe"] or "", o["mahnkosten"], o.get("statusLabel")]) for o in liste]
	return "﻿" + "\r\n".join([";".join(kopf), *zeilen]) + "\r\n"


def latin1(text):
	t = str(text).replace("€", "EUR").replace("„", '"').replace("“", '"').replace("”", '"').replace("‚", "'").replace("‘", "'").replace("’", "'").replace("–", "-").replace("—", "-")
	return t.encode("latin-1", errors="replace").decode("latin-1")


def sha256(text):
	return hashlib.sha256(str(text).encode("utf-8")).hexdigest()


# ================================================================ Monatsabschluss

ABSCHLUSS_PUNKTE = [
	("contracting_lauf", "Contracting-Abrechnung des Monats erstellt", True, True, "Abrechnungslauf Contracting für den Monat ausgeführt (Monatswerte der Messpunkte)."),
	("pacht_lauf", "Pacht-Gutschriften mit Fälligkeit im Monat erzeugt", True, True, "Alle im Monat fälligen Perioden der aktiven Pachtverträge haben einen Beleg."),
	("klaerfaelle", "Keine offenen Klärfälle", True, True, "Fehlende Monatswerte, Index oder Empfänger geklärt."),
	("zahlungseingaenge", "Kontoauszüge importiert und zugeordnet", True, True, "CAMT/CSV des Monats eingelesen, keine Buchung ohne Zuordnung/Entscheidung."),
	("zahlungslaeufe", "SEPA-Zahlungsläufe bestätigt oder verworfen", True, True, "Kein Zahlungslauf mehr im Status „eingereicht?“."),
	("mahnlauf", "Mahnlauf durchgeführt", True, False, "Keine fällige Mahnstufe ohne Mahnung."),
	("pflichtangaben", "Pflichtangaben der Belege vollständig", True, True, "Keine Belege des Monats mit fehlenden Pflichtangaben (UID, Anschrift, Steuerhinweis)."),
	("op_abgestimmt", "OP-Liste mit Bankkonto und Personenkonten abgestimmt", False, True, "Summe offener Posten = Salden Debitoren/Kreditoren."),
	("afa", "Abschreibungen (AfA) gebucht", False, False, "Monatliche AfA der aktivierten Anlagen (ERPNext: Depreciation Entry)."),
	("ust", "Umsatzsteuer-Voranmeldung und Zusammenfassende Meldung vorbereitet", False, True, ""),
	("export", "Buchungsexport an die Steuerberatung übergeben", True, True, "DATEV- oder BMD-Export für den Monat erstellt."),
]
ABSCHLUSS_STATUS = {"offen": "Offen", "abgeschlossen": "Abgeschlossen", "wiedereroeffnet": "Wiedereröffnet"}


def _tag(j, m, t):
	# wie Date.UTC(j, m-1, t): Monat/Tag dürfen überlaufen (t=0 → Vormonatsletzter)
	j += (m - 1) // 12
	m = (m - 1) % 12 + 1
	return (date(j, m, 1) + timedelta(days=t - 1)).isoformat()


def steuer_fristen(monat):
	bis = monats_zeitraum(monat)["bis"]
	j, m = (int(x) for x in monat.split("-"))
	mm = "/".join(reversed(monat.split("-")))
	return [
		{"land": "AT", "text": f"UVA {mm} bis {datum_de(_tag(j, m + 2, 15))} (§ 21 Abs. 1 UStG 1994), Zusammenfassende Meldung bis {datum_de(_tag(j, m + 2, 0))}"},
		{"land": "DE", "text": f"falls in DE registriert: UStVA bis {datum_de(_tag(j, m + 1, 10))} (ohne Dauerfristverlängerung), ZM bis {datum_de(_tag(j, m + 1, 25))}"},
		{"land": "CH", "text": f"falls in CH registriert: MWST-Abrechnung je Quartal, 60 Tage nach Quartalsende (z. B. {datum_de(plus_tage(bis, 60))} bei Quartalsende {datum_de(bis)})"},
	]


def ust_verprobung(monat, belege=None, stornos=None):
	"""USt-Verprobung des Monats je Steuervorlage (Spiegel von buchhaltung/abschluss.js, ustVerprobung)."""
	zr = monats_zeitraum(monat)
	von, bis = zr["von"], zr["bis"]
	je = {}

	def zaehle(vorlage_id, netto, steuer, storno):
		vid = vorlage_id or "ohne"
		v = STEUERVORLAGEN.get(vid)
		z = je.setdefault(vid, {"vorlage": vid, "label": v[3] if v else "Ohne Steuervorlage", "land": v[0] if v else "", "satz": v[1] if v else None, "art": v[2] if v else "unbekannt", "anzahl": 0, "stornos": 0, "netto": 0, "steuer": 0, "brutto": 0})
		z["stornos" if storno else "anzahl"] += 1
		z["netto"] = rund2(z["netto"] + (float(netto or 0)))
		z["steuer"] = rund2(z["steuer"] + (float(steuer or 0)))
		z["brutto"] = rund2(z["netto"] + z["steuer"])

	for b in belege or []:
		d = str(b.get("rechnungsdatum") or "")[:10]
		if von <= d <= bis:
			zaehle((b.get("steuer") or {}).get("vorlage"), b.get("netto"), (b.get("steuer") or {}).get("betrag"), False)
	for s in stornos or []:
		d = str(s.get("datum") or "")[:10]
		if von <= d <= bis:
			zaehle((s.get("steuer") or {}).get("vorlage"), s.get("netto"), (s.get("steuer") or {}).get("betrag"), True)
	zeilen = sorted(je.values(), key=lambda z: str(z["vorlage"]))
	return {
		"monat": monat,
		"zeilen": zeilen,
		"summen": {
			"netto": rund2(sum(z["netto"] for z in zeilen)),
			"steuer": rund2(sum(z["steuer"] for z in zeilen)),
			"brutto": rund2(sum(z["brutto"] for z in zeilen)),
			"belege": sum(z["anzahl"] + z["stornos"] for z in zeilen),
		},
		"ohneVorlage": (je["ohne"]["anzahl"] + je["ohne"]["stornos"]) if "ohne" in je else 0,
		"hinweis": "Verprobung nach Rechnungsdatum (Soll-Besteuerung) – Grundlage für UVA/UStVA/MWST, keine Steuermeldung. Mit der Steuerberatung abstimmen (Ist-Besteuerung, Vorsteuer und Sonderfälle sind nicht enthalten).",
	}


def abschluss_bewerten(monat, fakten=None, manuell=None):
	f, manuell = fakten or {}, manuell or {}
	auto = {
		"contracting_lauf": (bool(f.get("contractingLauf")), "Lauf vorhanden" if f.get("contractingLauf") else ("noch kein Lauf für den Monat" if f.get("contractingAnlagen") else "keine Contracting-Anlagen")),
		"pacht_lauf": (not (f.get("pachtFehlend") or 0) > 0, f"{f.get('pachtFehlend')} Perioden ohne Beleg" if (f.get("pachtFehlend") or 0) > 0 else "vollständig"),
		"klaerfaelle": (not (f.get("klaerfaelleOffen") or 0) > 0, f"{f.get('klaerfaelleOffen')} offen" if (f.get("klaerfaelleOffen") or 0) > 0 else "keine"),
		"zahlungseingaenge": (bool(f.get("importVorhanden")) and not (f.get("eingaengeOffen") or 0) > 0, "kein Kontoauszug für den Monat importiert" if not f.get("importVorhanden") else (f"{f.get('eingaengeOffen')} Buchungen ohne Zuordnung" if (f.get("eingaengeOffen") or 0) > 0 else "alle zugeordnet")),
		"zahlungslaeufe": (not (f.get("zahlungslaeufeOffen") or 0) > 0, f"{f.get('zahlungslaeufeOffen')} unbestätigt" if (f.get("zahlungslaeufeOffen") or 0) > 0 else "alle bestätigt"),
		"mahnlauf": (not (f.get("mahnungenFaellig") or 0) > 0, f"{f.get('mahnungenFaellig')} Mahnungen fällig" if (f.get("mahnungenFaellig") or 0) > 0 else "nichts fällig"),
		"pflichtangaben": (not (f.get("pflichtFehlt") or 0) > 0, f"{f.get('pflichtFehlt')} Belege unvollständig" if (f.get("pflichtFehlt") or 0) > 0 else "vollständig"),
		"export": (bool(f.get("exportErstellt")), f"erstellt ({f.get('exportErstellt')})" if f.get("exportErstellt") else "noch kein Export für den Monat"),
	}
	fristen = steuer_fristen(monat)
	punkte = []
	for pid, titel, ist_auto, pflicht, text in ABSCHLUSS_PUNKTE:
		m = manuell.get(pid) or {}
		a = auto.get(pid)
		erledigt = (a[0] or bool(m.get("erledigt"))) if a else bool(m.get("erledigt"))
		punkte.append({"id": pid, "titel": titel, "auto": ist_auto, "pflicht": pflicht, "text": " · ".join(f"{x['land']}: {x['text']}" for x in fristen) if pid == "ust" else text,
			"erledigt": erledigt, "automatisch": a[0] if a else None, "info": a[1] if a else "", "notiz": m.get("notiz") or "", "vonName": m.get("vonName") or "", "am": m.get("am") or "",
			"uebersteuert": bool(a and not a[0] and m.get("erledigt"))})
	offen = [p for p in punkte if p["pflicht"] and not p["erledigt"]]
	return {"monat": monat, "punkte": punkte, "offen": [p["titel"] for p in offen], "bereit": not offen, "erledigt": len([p for p in punkte if p["erledigt"]]), "gesamt": len(punkte), "fristen": fristen}
