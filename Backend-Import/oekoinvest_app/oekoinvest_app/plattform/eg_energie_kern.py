# Copyright (c) 2026, ÖkoInvest GmbH
#
# WP3 „Energiedaten, Verteilung, Simulation und Prognose“ – reiner Rechenkern OHNE Frappe, 1:1-Spiegel von
#   src/lib/plattform/eg/messwerte.js · qualitaet.js · verteilung.js · simulation.js · speicher.js · prognose.js · optimierung.js
# Gleichheit über gemeinsame Testvektoren src/lib/plattform/eg/testdaten/energie/*.json
# (plattform/tests/test_eg_energie_kern.py bzw. scripts/plattform-test-eg-energie.mjs).
#
# Fachliche Grundlage: docs/EG-FACHKONZEPT.md 3.12 (Tagesblöcke), 4.1–4.4 (Zuteilung, Rundung), 4.7 (Simulation),
# 4.8 (Prognose), 4.9 (Mehrfachteilnahme), 4.10 (Sozialquote); HA II 2.3.1/13.1 (L1–L3); ElWG §§ 68 Abs. 6, 69, 71.
# Ausgaben verwenden die camelCase-Schlüssel der JS-Seite (die API gibt immer camelCase aus).

import calendar
import math
import re
from datetime import date, datetime, timedelta, timezone

from oekoinvest_app.plattform.eg_modell import MAX_TEILNAHMEN_JE_ZP, MESS_GROESSEN, MESS_QUALITAET, TF_MAX, TF_MIN
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler

QH_MS = 900000
H_MS = 3600000
TAG_MS = 86400000
GROESSEN = list(MESS_GROESSEN.keys())
GROESSEN_VERBRAUCH = [g for g in GROESSEN if MESS_GROESSEN[g]["richtung"] == "verbrauch"]
GROESSEN_ERZEUGUNG = [g for g in GROESSEN if MESS_GROESSEN[g]["richtung"] == "erzeugung"]
QUALITAETEN = list(MESS_QUALITAET.keys())
MAX_HISTORIE = 10
CSV_MAX_ZEILEN = 45000
M32 = 0xFFFFFFFF


def energie_fehler(msg, feld="", status=422):
	return MitgliedFehler(msg, status, feld)


def _f(x):
	"""Zahl wie in JS (None/NaN → 0)."""
	try:
		v = float(x)
	except (TypeError, ValueError):
		return 0.0
	return 0.0 if math.isnan(v) else v


def js_zahl(x):
	"""Zahl → Text wie JavaScript String(x) (ganzzahlige Floats ohne „.0“)."""
	if isinstance(x, bool):
		return "true" if x else "false"
	if isinstance(x, float) and x.is_integer():
		return str(int(x))
	return repr(x) if isinstance(x, float) else str(x)


# ---------------------------------------------------------------- Zahlen


def rund(x, stellen=3):
	f = 10 ** stellen
	v = _f(x)
	return (-1 if v < 0 else 1) * math.floor(abs(v) * f + 0.5 + 1e-9) / f


def summe(a):
	s = 0.0
	for x in a or []:
		if x is not None:
			s += x
	return s


def zufall(saat):
	"""mulberry32 – identisch zu messwerte.js zufall()."""
	zustand = [int(saat) & M32]

	def naechste():
		a = (zustand[0] + 0x6D2B79F5) & M32
		zustand[0] = a
		t = a
		t = ((t ^ (t >> 15)) * (t | 1)) & M32
		t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32)) & M32
		return ((t ^ (t >> 14)) & M32) / 4294967296

	return naechste


def hash32(s):
	h = 0x811C9DC5
	for c in str(s):
		h ^= ord(c)
		h = (h * 0x01000193) & M32
	return h


# ---------------------------------------------------------------- Zeit (Europe/Vienna)


def _ymd(ms):
	d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
	return f"{d.year:04d}-{d.month:02d}-{d.day:02d}"


def _dt(ms):
	return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


def _letzter_sonntag_ms(jahr, monat0):
	letzter_tag = calendar.monthrange(jahr, monat0 + 1)[1]
	ms = calendar.timegm((jahr, monat0 + 1, letzter_tag, 0, 0, 0)) * 1000
	wt = (date(jahr, monat0 + 1, letzter_tag).weekday() + 1) % 7  # 0 = Sonntag wie JS getUTCDay
	return ms - wt * TAG_MS


def sommerzeit_utc(jahr):
	return [_letzter_sonntag_ms(jahr, 2) + H_MS, _letzter_sonntag_ms(jahr, 9) + H_MS]


def versatz_min(ms):
	a, b = sommerzeit_utc(_dt(ms).year)
	return 120 if a <= ms < b else 60


def gueltiger_tag(t):
	t = str(t or "")
	if not re.match(r"^\d{4}-\d{2}-\d{2}$", t):
		return False
	try:
		date.fromisoformat(t)
		return True
	except ValueError:
		return False


def _tag_ms(tag):
	d = date.fromisoformat(str(tag)[:10])
	return calendar.timegm((d.year, d.month, d.day, 0, 0, 0)) * 1000


def plus_tag(tag, n=1):
	return _ymd(_tag_ms(tag) + n * TAG_MS)


def tage_zwischen(a, b):
	return round((_tag_ms(b) - _tag_ms(a)) / TAG_MS)


def wochentag(tag):
	return date.fromisoformat(str(tag)[:10]).weekday()


def monat_von(tag):
	return str(tag)[:7]


def tage_im_monat(monat):
	j, m = [int(x) for x in str(monat).split("-")]
	return calendar.monthrange(j, m)[1]


def tage_des_monats(monat):
	return [f"{monat}-{d:02d}" for d in range(1, tage_im_monat(monat) + 1)]


def monat_plus(monat, n):
	j, m = [int(x) for x in str(monat).split("-")]
	x = j * 12 + (m - 1) + n
	return f"{x // 12}-{(x % 12) + 1:02d}"


def tag_beginn_ms(tag):
	mitternacht = _tag_ms(tag)
	return mitternacht - versatz_min(mitternacht - 2 * H_MS) * 60000


def tag_beginn_utc(tag):
	return _dt(tag_beginn_ms(tag)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


_WJT = {}


def werte_je_tag(tag):
	n = _WJT.get(tag)
	if n is None:
		n = round((tag_beginn_ms(plus_tag(tag)) - tag_beginn_ms(tag)) / QH_MS)
		if len(_WJT) > 5000:
			_WJT.clear()
		_WJT[tag] = n
	return n


def lokal_zeit(ms):
	d = _dt(ms + versatz_min(ms) * 60000)
	return f"{d.year:04d}-{d.month:02d}-{d.day:02d}T{d.hour:02d}:{d.minute:02d}"


def lokal_tag(ms):
	return lokal_zeit(ms)[:10]


def viertelstunde_lokal(tag, i):
	return lokal_zeit(tag_beginn_ms(tag) + i * QH_MS)


def lokal_nach_utc(tag, stunde, minute, zweites=False):
	basis = _tag_ms(tag) + stunde * H_MS + minute * 60000
	ziel = f"{tag}T{stunde:02d}:{minute:02d}"
	kandidaten = [u for u in (basis - 120 * 60000, basis - 60 * 60000) if lokal_zeit(u) == ziel]
	if not kandidaten:
		return None
	return kandidaten[1] if len(kandidaten) == 2 and zweites else kandidaten[0]


def _iso_ms(text):
	"""ISO-Zeitpunkt (…Z oder mit Versatz) → UTC-ms; None bei Fehler."""
	try:
		t = str(text).strip().replace(" ", "T")
		if t.endswith("Z"):
			t = t[:-1] + "+00:00"
		d = datetime.fromisoformat(t)
		if d.tzinfo is None:
			d = d.replace(tzinfo=timezone.utc)
		return round(d.timestamp() * 1000)
	except (TypeError, ValueError):
		return None


def _ms_iso(ms):
	d = _dt(ms)
	return d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{int(ms % 1000):03d}Z"


# ---------------------------------------------------------------- Tagesblöcke


def block_kennzahlen(b):
	soll = werte_je_tag(b["tag"])
	s = 0.0
	ist = l3 = l2 = 0
	mx = 0.0
	werte = b["werte"]
	q = b["qualitaet"]
	for i in range(soll):
		w = werte[i] if i < len(werte) else None
		if w is None:
			continue
		ist += 1
		s += w
		if w > mx:
			mx = w
		if q[i] == "L3":
			l3 += 1
		elif q[i] == "L2":
			l2 += 1
	return {"summeKwh": s, "soll": soll, "ist": ist, "fehlend": soll - ist, "l3": l3, "l2": l2, "anteilL3": l3 / soll if soll else 0, "vollstaendig": ist == soll, "abrechenbar": ist == soll and l3 == 0, "maxKw": mx * 4}


def _qualitaet(q):
	return q if q in QUALITAETEN else ""


def block_bereinigen(d):
	tag = str(d.get("tag") or "")[:10]
	if not gueltiger_tag(tag):
		raise energie_fehler("Ungültiger Tag (JJJJ-MM-TT).", "tag")
	if d.get("groesse") not in GROESSEN:
		raise energie_fehler(f"Unbekannte Größe „{d.get('groesse')}“.", "groesse")
	n = werte_je_tag(tag)
	roh = d.get("werte") if isinstance(d.get("werte"), list) else []
	if len(roh) != n:
		raise energie_fehler(f"Der {tag} hat {n} Viertelstunden, geliefert wurden {len(roh)}.", "werte")
	werte = []
	for i, w in enumerate(roh):
		if w is None or w == "":
			werte.append(None)
			continue
		try:
			x = float(w)
		except (TypeError, ValueError):
			raise energie_fehler(f"Ungültiger Wert in Viertelstunde {i + 1}.", "werte")
		if math.isnan(x) or math.isinf(x):
			raise energie_fehler(f"Ungültiger Wert in Viertelstunde {i + 1}.", "werte")
		if x < 0:
			raise energie_fehler(f"Negativer Wert in Viertelstunde {i + 1} ({tag}) – nicht plausibel.", "werte")
		werte.append(x)
	q = d.get("qualitaet") if isinstance(d.get("qualitaet"), list) else []
	qualitaet = ["" if w is None else (_qualitaet(q[i] if i < len(q) else "") or "L1") for i, w in enumerate(werte)]
	quelle = d.get("quelle") or {}
	b = {
		"zaehlpunktId": str(d.get("zaehlpunktId") or ""),
		"gemeinschaftId": str(d.get("gemeinschaftId") or ""),
		"tag": tag,
		"beginnUtc": tag_beginn_utc(tag),
		"groesse": d["groesse"],
		"werte": werte,
		"qualitaet": qualitaet,
		"quelle": {"art": str(quelle.get("art") or "eda"), "nachrichtId": str(quelle.get("nachrichtId") or ""), "messageId": str(quelle.get("messageId") or ""), "datei": str(quelle.get("datei") or "")},
		"empfangenAm": str(d.get("empfangenAm") or ""),
		"version": int(d.get("version") or 1),
		"historie": (d.get("historie") or [])[-MAX_HISTORIE:],
	}
	b.update(block_kennzahlen(b))
	return b


def bloecke_zusammenfuehren(alt, neu, am=""):
	if not alt:
		b = dict(neu)
		b.update(block_kennzahlen(neu))
		return {"block": b, "geaendert": len([w for w in neu["werte"] if w is not None]), "konflikte": 0}
	werte = list(alt["werte"])
	qualitaet = list(alt["qualitaet"])
	geaendert = konflikte = 0
	for i in range(len(werte)):
		w = neu["werte"][i] if i < len(neu["werte"]) else None
		if w is None:
			continue
		qa = qualitaet[i]
		qn = neu["qualitaet"][i] or "L1"
		if qn == "L3" and qa in ("L1", "L2"):
			konflikte += 1
			continue
		if werte[i] != w or qa != qn:
			geaendert += 1
		werte[i] = w
		qualitaet[i] = qn
	alt_k = block_kennzahlen(alt)
	historie = alt.get("historie") or []
	if geaendert:
		historie = (historie + [{"version": alt.get("version") or 1, "am": alt.get("empfangenAm") or am, "quelle": alt.get("quelle"), "summeKwh": alt_k["summeKwh"], "anteilL3": alt_k["anteilL3"]}])[-MAX_HISTORIE:]
	block = dict(alt)
	block.update({
		"werte": werte, "qualitaet": qualitaet, "quelle": neu.get("quelle") if geaendert else alt.get("quelle"),
		"empfangenAm": (neu.get("empfangenAm") or am) if geaendert else alt.get("empfangenAm"),
		"erstEmpfangenAm": alt.get("erstEmpfangenAm") or alt.get("empfangenAm") or "",
		"version": (alt.get("version") or 1) + (1 if geaendert else 0), "historie": historie,
	})
	block.update(block_kennzahlen(block))
	return {"block": block, "geaendert": geaendert, "konflikte": konflikte}


def payload_zerlegen(p, zaehlpunkt_id="", gemeinschaft_id="", am=""):
	von = _iso_ms(p.get("von"))
	if von is None:
		raise energie_fehler("Payload ohne gültigen Beginn (von).", "von")
	if von % QH_MS != 0:
		raise energie_fehler("Beginn liegt nicht im Viertelstundenraster.", "von")
	reihen = p.get("reihen") if isinstance(p.get("reihen"), list) else []
	if not reihen:
		raise energie_fehler("Payload ohne Messreihen.", "reihen")
	tage = {}
	for r in reihen:
		if r.get("groesse") not in GROESSEN:
			raise energie_fehler(f"Unbekannte Größe „{r.get('groesse')}“.", "reihen")
		werte = r.get("werte") if isinstance(r.get("werte"), list) else []
		if len(werte) > 400 * 100:
			raise energie_fehler("Zu viele Werte in einer Lieferung.", "reihen")
		ql = r.get("qualitaet") or []
		for i, w in enumerate(werte):
			ms = von + i * QH_MS
			tag = lokal_tag(ms)
			k = f"{tag}|{r['groesse']}"
			if k not in tage:
				n = werte_je_tag(tag)
				tage[k] = {"tag": tag, "groesse": r["groesse"], "werte": [None] * n, "qualitaet": [""] * n}
			b = tage[k]
			idx = round((ms - tag_beginn_ms(tag)) / QH_MS)
			b["werte"][idx] = None if w is None else float(w)
			b["qualitaet"][idx] = "" if b["werte"][idx] is None else (_qualitaet(ql[i] if i < len(ql) else "") or "L1")
	quelle = {"art": "eda", "nachrichtId": str(p.get("nachrichtId") or ""), "messageId": str(p.get("messageId") or "")}
	aus = sorted(tage.values(), key=lambda b: b["tag"] + b["groesse"])
	return [block_bereinigen({**b, "zaehlpunktId": zaehlpunkt_id, "gemeinschaftId": gemeinschaft_id, "quelle": quelle, "empfangenAm": am}) for b in aus]


def monatswerte(bloecke):
	m = {}
	for b in bloecke:
		monat = monat_von(b["tag"])
		k = f"{b['zaehlpunktId']}|{b['gemeinschaftId']}|{b['groesse']}|{monat}"
		if k not in m:
			m[k] = {"zaehlpunktId": b["zaehlpunktId"], "gemeinschaftId": b["gemeinschaftId"], "groesse": b["groesse"], "monat": monat, "summeKwh": 0.0, "werteSoll": 0, "werteIst": 0, "l3": 0, "tage": 0, "maxKw": 0.0}
		x = m[k]
		kz = block_kennzahlen(b)
		x["summeKwh"] += kz["summeKwh"]
		x["werteIst"] += kz["ist"]
		x["l3"] += kz["l3"]
		x["tage"] += 1
		if kz["maxKw"] > x["maxKw"]:
			x["maxKw"] = kz["maxKw"]
	aus = []
	for x in m.values():
		soll = sum(werte_je_tag(t) for t in tage_des_monats(x["monat"]))
		aus.append({**x, "werteSoll": soll, "anteilL3": x["l3"] / soll if soll else 0, "vollstaendig": x["werteIst"] == soll, "abrechenbar": x["werteIst"] == soll and x["l3"] == 0})
	return sorted(aus, key=lambda a: a["zaehlpunktId"] + a["groesse"] + a["monat"])


def perioden_summen(bloecke, von, bis, preis_fenster=None):
	soll = 0
	t = von
	while t <= bis:
		soll += werte_je_tag(t)
		t = plus_tag(t)
	zp = {}
	for b in bloecke:
		if b["tag"] < von or b["tag"] > bis:
			continue
		k = f"{b['zaehlpunktId']}|{b['gemeinschaftId']}"
		if k not in zp:
			zp[k] = {"zaehlpunktId": b["zaehlpunktId"], "gemeinschaftId": b["gemeinschaftId"], "groessen": {}, "ist": {}, "l3": 0, "werte": 0, "fenster": {}}
		x = zp[k]
		kz = block_kennzahlen(b)
		x["groessen"][b["groesse"]] = x["groessen"].get(b["groesse"], 0) + kz["summeKwh"]
		x["ist"][b["groesse"]] = x["ist"].get(b["groesse"], 0) + kz["ist"]
		x["l3"] += kz["l3"]
		x["werte"] += kz["soll"]
		if preis_fenster:
			beginn = tag_beginn_ms(b["tag"])
			for i, w in enumerate(b["werte"]):
				if w is None:
					continue
				f = preis_fenster(lokal_zeit(beginn + i * QH_MS)) or ""
				x["fenster"].setdefault(f, {})
				x["fenster"][f][b["groesse"]] = x["fenster"][f].get(b["groesse"], 0) + w
	aus = []
	for x in zp.values():
		e = {"zaehlpunktId": x["zaehlpunktId"], "gemeinschaftId": x["gemeinschaftId"], "groessen": x["groessen"], "vollstaendig": len(x["groessen"]) > 0 and all(n == soll for n in x["ist"].values()), "anteilL3": x["l3"] / x["werte"] if x["werte"] else 0, "werteSoll": soll}
		if preis_fenster:
			e["nachFenster"] = x["fenster"]
		aus.append(e)
	return aus


def stundenwerte(werte):
	aus = []
	for i in range(0, len(werte), 4):
		s = 0.0
		n = 0
		for j in range(i, min(i + 4, len(werte))):
			if werte[j] is not None:
				s += werte[j]
				n += 1
		aus.append(s if n else None)
	return aus


# ---------------------------------------------------------------- CSV-/Excel-Import

CSV_SPALTEN = [
	{"groesse": "eigendeckung_ee", "muster": ["eigendeckung aus erneuerbaren", "eigendeckung ee", "erneuerbar"]},
	{"groesse": "eigendeckung", "muster": ["eigendeckung", "gemeinschaftlich bezogen", "bezug aus der gemeinschaft", "bezug gemeinschaft", "eeg-bezug", "eg-bezug", "gemeinschaftsanteil", "anteil gemeinschaft"]},
	{"groesse": "anteil_erzeugung", "muster": ["anteil an der erzeugung", "anteil erzeugung", "zugeteilt", "zuteilung"]},
	{"groesse": "restueberschuss", "muster": ["restüberschuss", "restueberschuss", "überschuss", "ueberschuss", "netzeinspeisung"]},
	{"groesse": "verbrauch_tf", "muster": ["verbrauch × tf", "verbrauch x tf", "verbrauch mit teilnahmefaktor", "verbrauch tf"]},
	{"groesse": "erzeugung_tf", "muster": ["erzeugung × tf", "erzeugung x tf", "erzeugung mit teilnahmefaktor", "erzeugung tf"]},
	{"groesse": "verbrauch_gemessen", "muster": ["verbrauch", "bezug", "1.8.0", "wirkenergie +a", "+a"]},
	{"groesse": "erzeugung_gemessen", "muster": ["einspeisung", "erzeugung", "lieferung", "2.8.0", "wirkenergie -a", "-a"]},
]
ZEIT_VON = ["zeit von", "von", "beginn", "start", "messzeitpunkt", "zeitstempel", "timestamp", "datum/uhrzeit", "datum uhrzeit", "zeitpunkt"]
ZEIT_BIS = ["zeit bis", "bis", "ende"]
DATUM = ["datum", "tag", "date"]
UHRZEIT = ["uhrzeit", "zeit", "time"]
ENDE_SPALTE = re.compile(r"(zeit|stempel|datum|timestamp).*(bis|ende)|(bis|ende).*(zeit|stempel)")
QUALI = ["qualität", "qualitaet", "status", "messmethode", "kennzeichen", "metering"]
IGNORIEREN = ["restnetz", "rest-netz", "reststrom", "zählerstand", "zaehlerstand"]
ZP_MUSTER = re.compile(r"AT\d{11}[0-9A-Z]{20}")


def _norm(s):
	t = str(s or "").lstrip("﻿").strip()
	t = re.sub(r'^"|"$', "", t)
	return t.lower()


def _passt(kopf, liste):
	return any(kopf == m or kopf.startswith(f"{m} ") or kopf.startswith(f"{m}(") or m in kopf for m in liste)


def _trennzeichen(zeile):
	z = {";": 0, "\t": 0, ",": 0}
	in_q = False
	for c in zeile:
		if c == '"':
			in_q = not in_q
		elif not in_q and c in z:
			z[c] += 1
	if z["\t"] >= z[";"] and z["\t"] > 0:
		return "\t"
	if z[";"] > 0:
		return ";"
	if z[","] > 0:
		return ","
	return ";"


def _zerlegen(zeile, t):
	aus = []
	cur = ""
	in_q = False
	i = 0
	while i < len(zeile):
		c = zeile[i]
		if c == '"':
			if in_q and i + 1 < len(zeile) and zeile[i + 1] == '"':
				cur += '"'
				i += 1
			else:
				in_q = not in_q
		elif c == t and not in_q:
			aus.append(cur)
			cur = ""
		else:
			cur += c
		i += 1
	aus.append(cur)
	return [x.strip() for x in aus]


def zahl_lesen(s):
	t = re.sub(r"\s", "", str("" if s is None else s).strip())
	if not t:
		return None
	if "," in t and "." in t:
		t = t.replace(".", "").replace(",", ".", 1) if t.rfind(",") > t.rfind(".") else t.replace(",", "")
	elif "," in t:
		t = t.replace(",", ".", 1)
	try:
		x = float(t)
	except ValueError:
		return None
	return None if math.isnan(x) or math.isinf(x) else x


def zeit_lesen(datum_text, zeit_text=""):
	s = f"{str(datum_text or '').strip()} {str(zeit_text or '').strip()}".strip()
	if re.match(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2})\D(\d{2})(?:\D\d{2}(?:\.\d+)?)?(Z|\+\d{2}\D?\d{2}|-\d{2}\D?\d{2})$", s):
		ms = _iso_ms(s.replace(" ", "T"))
		return {"utcMs": ms} if ms is not None else None
	m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{2,4})\D+(\d{1,2})\D(\d{2})", s)
	if m:
		d, mo, j, h, mi = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5))
		if j < 100:
			j += 2000
	else:
		m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})\D+(\d{1,2})\D(\d{2})", s)
		if not m:
			return None
		j, mo, d, h, mi = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5))
	tag = f"{j}-{mo:02d}-{d:02d}"
	if not gueltiger_tag(tag):
		return None
	if h == 24 and mi == 0:
		return {"tag": plus_tag(tag), "h": 0, "m": 0}
	if h > 23 or mi > 59:
		return None
	return {"tag": tag, "h": h, "m": mi}


def csv_parsen(text, zaehlpunktnummer=""):
	zeilen = re.split(r"\r\n|\n|\r", str(text or "").lstrip("﻿"))
	if len(zeilen) > CSV_MAX_ZEILEN + 50:
		raise energie_fehler(f"Die Datei hat mehr als {CSV_MAX_ZEILEN} Zeilen – bitte in Monatsdateien aufteilen.", "csv")
	hinweise = []
	fehler = []
	zp_nr = re.sub(r"\s", "", str(zaehlpunktnummer or "")).upper()
	kopf_idx = -1
	t = ";"
	kopf = []
	for i in range(min(len(zeilen), 40)):
		z = zeilen[i]
		if not zp_nr:
			m = ZP_MUSTER.search(re.sub(r"\s", "", z).upper())
			if m:
				zp_nr = m.group(0)
		tt = _trennzeichen(z)
		zellen = [_norm(c) for c in _zerlegen(z, tt)]
		hat_zeit = any(_passt(c, ZEIT_VON) or _passt(c, DATUM) or _passt(c, ZEIT_BIS) for c in zellen)
		hat_wert = any(any(_passt(c, s["muster"]) for s in CSV_SPALTEN) or "kwh" in c or c == "wert" or c.startswith("wert") for c in zellen)
		if hat_zeit and hat_wert and len(zellen) >= 2:
			kopf_idx = i
			t = tt
			kopf = zellen
			break
	if kopf_idx < 0:
		raise energie_fehler("Keine Kopfzeile mit Zeit- und Wertspalte gefunden (z. B. „Datum;Zeit von;Verbrauch (kWh)“).", "csv")
	genutzt = set()

	def idx(pruef):
		for i, c in enumerate(kopf):
			if pruef(i, c):
				return i
		return -1

	i_von = idx(lambda i, c: any(c == m or c.startswith(m) for m in ZEIT_VON) and "bis" not in c)
	i_bis = idx(lambda i, c: i != i_von and (any(c == m or c.startswith(m) for m in ZEIT_BIS) or bool(ENDE_SPALTE.search(c))))
	i_datum = idx(lambda i, c: i != i_von and i != i_bis and any(c == m or c.startswith(m) for m in DATUM) and "uhr" not in c)
	i_uhr = idx(lambda i, c: i not in (i_von, i_bis, i_datum) and any(c == m or c.startswith(m) for m in UHRZEIT))
	for i in (i_von, i_bis, i_datum, i_uhr):
		if i >= 0:
			genutzt.add(i)
	i_q = idx(lambda i, c: i not in genutzt and _passt(c, QUALI))
	if i_q >= 0:
		genutzt.add(i_q)
	reihen = []
	for s in CSV_SPALTEN:
		i = idx(lambda j, c, s=s: j not in genutzt and not any(x in c for x in IGNORIEREN) and _passt(c, s["muster"]))
		if i < 0:
			continue
		genutzt.add(i)
		k = kopf[i]
		einheit = "kWh" if "kwh" in k else ("kW" if re.search(r"\bkw\b|\(kw\)", k) else "kWh")
		reihen.append({"groesse": s["groesse"], "spalte": i, "einheit": einheit, "punkte": []})
	if not reihen:
		i = idx(lambda j, c: j not in genutzt and ("kwh" in c or c.startswith("wert")))
		if i >= 0:
			reihen.append({"groesse": "verbrauch_gemessen", "spalte": i, "einheit": "kWh", "punkte": []})
			hinweise.append("Spalte ohne erkennbare Größe – als „Verbrauch laut Messung“ übernommen. Bitte prüfen.")
	if not reihen:
		raise energie_fehler("Keine Wertspalte erkannt.", "csv")
	if any(r["einheit"] == "kW" for r in reihen):
		hinweise.append("Leistungswerte (kW) wurden in Viertelstunden-Energie (kWh = kW × 0,25) umgerechnet.")
	ende_stempel = True if (i_von < 0 and i_bis >= 0 and i_datum < 0) else (i_von < 0 and i_datum >= 0 and i_uhr < 0 and i_bis >= 0)
	if ende_stempel:
		hinweise.append("Zeitstempel bezeichnen das Ende des Intervalls – auf den Beginn umgerechnet.")
	gesehen = set()
	von = bis = None
	n = 0
	for z in range(kopf_idx + 1, len(zeilen)):
		roh = zeilen[z]
		if not roh.strip():
			continue
		c = _zerlegen(roh, t)
		zelle = lambda i: c[i] if 0 <= i < len(c) else ""
		zt = None
		if i_von >= 0:
			zt = zeit_lesen(zelle(i_von)) or (zeit_lesen(zelle(i_datum), zelle(i_von)) if i_datum >= 0 else None)
		elif i_datum >= 0 and i_uhr >= 0:
			zt = zeit_lesen(zelle(i_datum), zelle(i_uhr))
		elif i_bis >= 0:
			zt = zeit_lesen(zelle(i_bis)) or (zeit_lesen(zelle(i_datum), zelle(i_bis)) if i_datum >= 0 else None)
		elif i_datum >= 0:
			zt = zeit_lesen(zelle(i_datum))
		if not zt:
			if n == 0 and z < kopf_idx + 3:
				continue
			fehler.append({"zeile": z + 1, "text": "Zeitpunkt nicht lesbar."})
			continue
		if "utcMs" in zt:
			ms = zt["utcMs"]
		else:
			k = f"{zt['tag']}T{zt['h']:02d}:{zt['m']:02d}"
			zweites = k in gesehen
			ms = lokal_nach_utc(zt["tag"], zt["h"], zt["m"], zweites)
			gesehen.add(k)
			if ms is None:
				fehler.append({"zeile": z + 1, "text": f"Uhrzeit {zt['h']:02d}:{zt['m']:02d} existiert am {zt['tag']} nicht (Beginn der Sommerzeit)."})
				continue
		if ende_stempel:
			ms -= QH_MS
		if ms % QH_MS != 0:
			fehler.append({"zeile": z + 1, "text": "Zeitpunkt liegt nicht im Viertelstundenraster."})
			continue
		q_text = _norm(zelle(i_q)) if i_q >= 0 else ""
		q = "L3" if re.search(r"l3|vorläufig|vorlaeufig|nicht belastbar|ungültig", q_text) else ("L2" if re.search(r"l2|ersatz|geschätzt|geschaetzt|schätz", q_text) else "L1")
		ok = False
		for r in reihen:
			w = zahl_lesen(zelle(r["spalte"]))
			if w is None:
				continue
			if w < 0:
				fehler.append({"zeile": z + 1, "text": f"Negativer Wert ({MESS_GROESSEN[r['groesse']]['label']})."})
				continue
			r["punkte"].append({"ms": ms, "wert": w * 0.25 if r["einheit"] == "kW" else w, "qualitaet": q})
			ok = True
		if ok:
			n += 1
			if von is None or ms < von:
				von = ms
			if bis is None or ms > bis:
				bis = ms
	if not n:
		raise energie_fehler("Keine Messwerte gefunden.", "csv")
	if i_q < 0:
		hinweise.append("Keine Qualitätsspalte – Werte als L1 (Echtwert) übernommen. Maßgeblich bleiben die EDA-Daten des Netzbetreibers.")
	return {"zaehlpunktnummer": zp_nr, "reihen": reihen, "fehler": fehler[:200], "fehlerAnzahl": len(fehler), "hinweise": hinweise, "zeilen": n, "von": "" if von is None else _ms_iso(von), "bis": "" if bis is None else _ms_iso(bis + QH_MS)}


def csv_zu_bloecken(erg, zaehlpunkt_id="", gemeinschaft_id="", datei="", am=""):
	tage = {}
	for r in erg["reihen"]:
		for p in r["punkte"]:
			tag = lokal_tag(p["ms"])
			k = f"{tag}|{r['groesse']}"
			if k not in tage:
				n = werte_je_tag(tag)
				tage[k] = {"tag": tag, "groesse": r["groesse"], "werte": [None] * n, "qualitaet": [""] * n}
			b = tage[k]
			i = round((p["ms"] - tag_beginn_ms(tag)) / QH_MS)
			b["werte"][i] = (b["werte"][i] or 0) + p["wert"]
			b["qualitaet"][i] = p["qualitaet"]
	aus = sorted(tage.values(), key=lambda b: b["tag"] + b["groesse"])
	return [block_bereinigen({**b, "zaehlpunktId": zaehlpunkt_id, "gemeinschaftId": gemeinschaft_id, "quelle": {"art": "csv", "datei": datei}, "empfangenAm": am}) for b in aus]


# ---------------------------------------------------------------- Verteilung (4.1–4.4, 4.10)


def _w(x):
	return 0.0 if x is None else x


def tf_anwenden(werte, tf=100):
	f = _f(tf) / 100
	return [None if x is None else x * f for x in werte]


def tf_pruefen(tfs):
	fehler = []
	if len(tfs) > MAX_TEILNAHMEN_JE_ZP:
		fehler.append(f"Höchstens {MAX_TEILNAHMEN_JE_ZP} Teilnahmen je Zählpunkt (ElWG § 71 Abs. 5).")
	for t in tfs:
		if not isinstance(t, int) or isinstance(t, bool) or t < TF_MIN or t > TF_MAX:
			fehler.append(f"Teilnahmefaktor {js_zahl(t)} ungültig (ganzzahlig {TF_MIN}–{TF_MAX} %).")
	s = sum(_f(t) for t in tfs)
	s = int(s) if float(s).is_integer() else s
	if s > 100:
		fehler.append(f"Summe der Teilnahmefaktoren {js_zahl(s)} % über 100 %.")
	return {"ok": not fehler, "summe": s, "rest": max(0, 100 - s), "fehler": fehler}


def mehrfach_aufteilen(werte, teilnahmen):
	p = tf_pruefen([t["tf"] for t in teilnahmen])
	if not p["ok"]:
		raise energie_fehler(" ".join(p["fehler"]), "teilnahmefaktor")
	return {"anteile": {t["gemeinschaftId"]: tf_anwenden(werte, t["tf"]) for t in teilnahmen}, "rest": tf_anwenden(werte, p["rest"]), "pruefung": p}


def _vorverarbeiten(liste, n):
	aus = []
	for x in liste:
		tf = x.get("tf")
		f = (100 if tf is None else _f(tf)) / 100
		w = x.get("werte") or []
		aus.append([_w(w[q] if q < len(w) else None) * f for q in range(n)])
	return aus


def verteilen(modell="dynamisch", erzeuger=None, verbraucher=None):
	erzeuger = erzeuger or []
	verbraucher = verbraucher or []
	n = max([len(x.get("werte") or []) for x in erzeuger + verbraucher] or [0])
	E = _vorverarbeiten(erzeuger, n)
	V = _vorverarbeiten(verbraucher, n)
	Es = [0.0] * n
	Vs = [0.0] * n
	for q in range(n):
		s = 0.0
		for a in E:
			s += a[q]
		Es[q] = s
		t = 0.0
		for a in V:
			t += a[q]
		Vs[q] = t
	s_stern = None
	normierung = None
	if modell == "statisch":
		sl = [_f(x.get("schluesselPct")) for x in verbraucher]
		sm = 0
		for x in sl:
			sm += x
		normierung = sm
		s_stern = [(x / sm if sm > 100 else x / 100) for x in sl]
	v_out = [{"id": x.get("id"), "verbrauchTf": V[i], "anteil": [0.0] * n, "eigendeckung": [0.0] * n} for i, x in enumerate(verbraucher)]
	EDs = [0.0] * n
	for q in range(n):
		ed = 0.0
		for i in range(len(v_out)):
			v = V[i][q]
			if s_stern is not None:
				a = Es[q] * s_stern[i]
			else:
				a = (Es[q] * v) / Vs[q] if Vs[q] > 0 else 0.0
			d = min(a, v)
			v_out[i]["anteil"][q] = a
			v_out[i]["eigendeckung"][q] = d
			ed += d
		EDs[q] = ed
	Rs = [(max(0.0, Es[q] - EDs[q]) if s_stern is not None else max(0.0, Es[q] - Vs[q])) for q in range(n)]
	e_out = []
	for j, x in enumerate(erzeuger):
		r = [0.0] * n
		g = [0.0] * n
		for q in range(n):
			r[q] = (Rs[q] * E[j][q]) / Es[q] if Es[q] > 0 else 0.0
			g[q] = E[j][q] - r[q]
		e_out.append({"id": x.get("id"), "erzeugungTf": E[j], "restueberschuss": r, "eingebracht": g})
	return {"verbraucher": v_out, "erzeuger": e_out, "summe": {"erzeugungTf": Es, "verbrauchTf": Vs, "eigendeckung": EDs, "restueberschuss": Rs}, "normierung": normierung}


def _sum_js(a):
	s = 0.0
	for x in a:
		s += x
	return s


def verteilung_kennzahlen(z):
	E = _sum_js(z["summe"]["erzeugungTf"])
	V = _sum_js(z["summe"]["verbrauchTf"])
	ED = _sum_js(z["summe"]["eigendeckung"])
	R = _sum_js(z["summe"]["restueberschuss"])
	return {"erzeugungTfKwh": E, "verbrauchTfKwh": V, "eigendeckungKwh": ED, "restueberschussKwh": R, "restbezugKwh": V - ED, "eigendeckungsquote": ED / V if V > 0 else 0, "nutzungsgrad": ED / E if E > 0 else 0}


def bilanz_pruefen(z, toleranz=1e-6):
	ed = 0.0
	g = 0.0
	for v in z["verbraucher"]:
		for x in v["eigendeckung"]:
			ed += x
	for e in z["erzeuger"]:
		for x in e["eingebracht"]:
			g += x
	return {"eigendeckungKwh": ed, "eingebrachtKwh": g, "differenzKwh": ed - g, "ok": abs(ed - g) <= toleranz * max(1, ed)}


def nb_abgleich(posten, toleranz_pct=0.5, toleranz_kwh=0.1):
	zeilen = []
	for p in posten:
		eigen = p.get("eigenKwh") or 0
		nb = p.get("nbKwh") or 0
		abw = eigen - nb
		grenze = max(toleranz_kwh, (abs(nb) * toleranz_pct) / 100)
		pct = (abw / nb) * 100 if nb else (100 if eigen else 0)
		zeilen.append({**p, "abweichungKwh": abw, "abweichungPct": pct, "grenzeKwh": grenze, "klaerfall": abs(abw) > grenze + 1e-9})
	se = 0.0
	sn = 0.0
	for z in zeilen:
		se += z.get("eigenKwh") or 0
		sn += z.get("nbKwh") or 0
	return {"zeilen": zeilen, "summeEigenKwh": se, "summeNbKwh": sn, "abweichungKwh": se - sn, "klaerfaelle": len([z for z in zeilen if z["klaerfall"]]), "toleranzPct": toleranz_pct, "toleranzKwh": toleranz_kwh}


def sozialquote(verbraucher=None, erzeuger=None, ziel_pct=10):
	verbraucher = verbraucher or []
	erzeuger = erzeuger or []
	gem = [e for e in erzeuger if e.get("gemeinde")]
	if not gem:
		return {"anwendbar": False, "quotePct": None, "zielPct": ziel_pct, "text": "Keine Anlage einer Gebietskörperschaft – Sozialquote nicht anwendbar."}
	n = max([len(e["eingebracht"]) for e in erzeuger] + [0])
	basis = 0.0
	an_schutz = 0.0
	for q in range(n):
		g_g = 0.0
		g_alle = 0.0
		for e in erzeuger:
			g_alle += _w(e["eingebracht"][q] if q < len(e["eingebracht"]) else None)
		for e in gem:
			g_g += _w(e["eingebracht"][q] if q < len(e["eingebracht"]) else None)
			basis += _w(e["erzeugungTf"][q] if q < len(e["erzeugungTf"]) else None)
		if g_alle <= 0 or g_g <= 0:
			continue
		ed = 0.0
		for v in verbraucher:
			if v.get("schutzbeduerftig"):
				ed += _w(v["eigendeckung"][q] if q < len(v["eigendeckung"]) else None)
		an_schutz += (ed * g_g) / g_alle
	quote = (an_schutz / basis) * 100 if basis > 0 else 0
	text = f"Sozialquote erfüllt ({js_zahl(rund(quote, 1))} % ≥ {ziel_pct} %)." if quote >= ziel_pct else f"Sozialquote {js_zahl(rund(quote, 1))} % – unter {ziel_pct} % (ElWG § 68 Abs. 6). Steuerung über Teilnahmefaktor oder Sozialtarif."
	return {"anwendbar": True, "basisKwh": basis, "anSchutzbeduerftigeKwh": an_schutz, "quotePct": quote, "zielPct": ziel_pct, "erfuellt": quote >= ziel_pct, "fehlmengeKwh": max(0, (ziel_pct / 100) * basis - an_schutz), "text": text}


# ---------------------------------------------------------------- Datenqualität


AMPEL = {
	"ok": {"label": "Daten vollständig", "ton": "ok"},
	"erwartet": {"label": "Lieferung erwartet", "ton": "neutral"},
	"warn": {"label": "Prüfen", "ton": "warn"},
	"fehler": {"label": "Reklamation nötig", "ton": "fehler"},
	"keine": {"label": "keine Teilnahme", "ton": "neutral"},
}
QUALITAET_REGELN = {"lieferFristTage": 2, "l3FristTage": 60, "l3FristTageBeg": 15, "sprungFaktor": 1.5, "epsilonKwh": 1e-6, "reklamationFristTage": 14}
_STUFE = {"ok": 0, "erwartet": 1, "warn": 2, "fehler": 3}


def _schlechter(a, b):
	return b if _STUFE[b] > _STUFE[a] else a


def plausibilitaet(g, max_kw=None, regeln=None):
	regeln = regeln or QUALITAET_REGELN
	eps = regeln["epsilonKwh"]
	v = []

	def pruefe(regel, a, b):
		if a not in g or b not in g:
			return
		n = 0
		wa = g[a]["werte"]
		wb = g[b]["werte"]
		for i in range(min(len(wa), len(wb))):
			x, y = wa[i], wb[i]
			if x is not None and y is not None and x > y + eps:
				n += 1
		if n:
			v.append({"regel": regel, "viertelstunden": n})

	pruefe("Eigendeckung über Verbrauch × Teilnahmefaktor", "eigendeckung", "verbrauch_tf")
	pruefe("Eigendeckung über Anteil an der Erzeugung", "eigendeckung", "anteil_erzeugung")
	pruefe("Verbrauch × TF über Verbrauch laut Messung", "verbrauch_tf", "verbrauch_gemessen")
	pruefe("Erzeugung × TF über Erzeugung laut Messung", "erzeugung_tf", "erzeugung_gemessen")
	pruefe("Restüberschuss über Erzeugung × TF", "restueberschuss", "erzeugung_tf")
	for groesse, b in g.items():
		neg = sprung = 0
		grenze = max_kw * 0.25 * regeln["sprungFaktor"] if max_kw else None
		for x in b["werte"]:
			if x is None:
				continue
			if x < -eps:
				neg += 1
			if grenze is not None and x > grenze:
				sprung += 1
		if neg:
			v.append({"regel": f"Negative Werte ({groesse})", "viertelstunden": neg})
		if sprung:
			v.append({"regel": f"Sprung über der Spitzenleistung ({groesse})", "viertelstunden": sprung})
	return {"verstoesse": v}


def tages_ampel(tag, bloecke, erwartet, heute, modell="eeg", max_kw=None, regeln=None):
	regeln = regeln or QUALITAET_REGELN
	gruende = []
	ampel = "ok"
	l3 = l2 = fehlend = spaet = 0
	alter = tage_zwischen(tag, heute)
	vorhanden = [g for g in erwartet if g in bloecke]
	if not vorhanden:
		if alter <= regeln["lieferFristTage"]:
			return {"tag": tag, "ampel": "erwartet", "gruende": ["Lieferung noch innerhalb der Frist"], "l3": 0, "l2": 0, "fehlend": 0, "spaetTage": 0}
		return {"tag": tag, "ampel": "fehler", "gruende": ["Keine Daten geliefert"], "l3": 0, "l2": 0, "fehlend": werte_je_tag(tag), "spaetTage": 0, "fehlt": True}
	for g in erwartet:
		b = bloecke.get(g)
		if not b:
			ampel = _schlechter(ampel, "erwartet" if alter <= regeln["lieferFristTage"] else "fehler")
			gruende.append(f"Größe {g} fehlt")
			continue
		k = block_kennzahlen(b)
		l3 += k["l3"]
		l2 += k["l2"]
		fehlend += k["fehlend"]
		empf = b.get("erstEmpfangenAm") or b.get("empfangenAm")
		if empf:
			spaet = max(spaet, tage_zwischen(tag, str(empf)[:10]))
	if fehlend:
		ampel = _schlechter(ampel, "fehler")
		gruende.append(f"{fehlend} Viertelstunden fehlen")
	if l3:
		frist = regeln["l3FristTageBeg"] if modell == "beg" else regeln["l3FristTage"]
		if alter > frist:
			ampel = _schlechter(ampel, "fehler")
			gruende.append(f"L3-Werte nach Ablauf der Ersatzfrist ({frist} Tage)")
		else:
			ampel = _schlechter(ampel, "warn")
			gruende.append(f"{l3} L3-Werte (nicht abrechenbar, Ersatz bis {plus_tag(tag, frist)})")
	if spaet > regeln["lieferFristTage"]:
		ampel = _schlechter(ampel, "warn")
		gruende.append(f"verspätet geliefert (nach {spaet} Tagen)")
	p = plausibilitaet(bloecke, max_kw, regeln)
	if p["verstoesse"]:
		ampel = _schlechter(ampel, "fehler")
		for x in p["verstoesse"]:
			gruende.append(f"{x['regel']}: {x['viertelstunden']} Viertelstunden")
	if not gruende and l2:
		gruende.append(f"{l2} Ersatzwerte L2 (abrechenbar)")
	return {"tag": tag, "ampel": ampel, "gruende": gruende, "l3": l3, "l2": l2, "fehlend": fehlend, "spaetTage": spaet}


def gemeinschaft_pruefen(eigendeckungen, erzeugungen_tf, epsilon=1e-6):
	n = max([len(a) for a in eigendeckungen] + [len(a) for a in erzeugungen_tf] + [0])
	v = 0
	mx = 0.0
	for q in range(n):
		ed = 0.0
		e = 0.0
		for a in eigendeckungen:
			ed += (a[q] if q < len(a) and a[q] else 0)
		for a in erzeugungen_tf:
			e += (a[q] if q < len(a) and a[q] else 0)
		if ed > e + epsilon:
			v += 1
			mx = max(mx, ed - e)
	return {"verstoesse": v, "maxUeberhangKwh": mx}


def ersatzwerte(werte, vergleich=None, max_interpolation=8):
	aus = list(werte)
	art = ["" if x is None else "messung" for x in werte]
	i = 0
	while i < len(aus):
		if aus[i] is not None:
			i += 1
			continue
		j = i
		while j < len(aus) and aus[j] is None:
			j += 1
		laenge = j - i
		links = aus[i - 1] if i > 0 else None
		rechts = aus[j] if j < len(aus) else None
		for k in range(i, j):
			if laenge <= max_interpolation and links is not None and rechts is not None:
				aus[k] = links + ((rechts - links) * (k - i + 1)) / (laenge + 1)
				art[k] = "interpoliert"
			elif vergleich and k < len(vergleich) and vergleich[k] is not None:
				aus[k] = vergleich[k]
				art[k] = "vergleichstag"
			else:
				aus[k] = 0
				art[k] = "null"
		i = j
	return {"werte": aus, "art": art, "ersetzt": len([a for a in art if a and a != "messung"])}


def reklamations_faelle(zeilen, heute=None, regeln=None):
	regeln = regeln or QUALITAET_REGELN
	faelle = []
	for z in zeilen:
		lauf = None
		for t in sorted(z["tage"], key=lambda x: x["tag"]):
			if t["ampel"] == "fehler":
				if lauf and plus_tag(lauf["bis"]) == t["tag"]:
					lauf["bis"] = t["tag"]
					for g in t["gruende"]:
						if g not in lauf["gruende"]:
							lauf["gruende"].append(g)
				else:
					if lauf:
						faelle.append(lauf)
					lauf = {"zaehlpunktId": z["zaehlpunktId"], "von": t["tag"], "bis": t["tag"], "gruende": list(t["gruende"])}
			elif lauf:
				faelle.append(lauf)
				lauf = None
		if lauf:
			faelle.append(lauf)
	aus = []
	for f in faelle:
		art = "nachforderung" if any(re.search(r"fehlen|Keine Daten|fehlt", g) for g in f["gruende"]) else "klaerung"
		aus.append({**f, "tage": tage_zwischen(f["von"], f["bis"]) + 1, "fristBis": plus_tag(heute, regeln["reklamationFristTage"]) if heute else "", "art": art})
	return aus


def lieferstatistik(lieferungen, regeln=None):
	regeln = regeln or QUALITAET_REGELN
	je = {}
	for l in lieferungen:
		if not l.get("empfangenAm"):
			continue
		d = tage_zwischen(l["tag"], str(l["empfangenAm"])[:10])
		je.setdefault(l["netzbetreiberId"], []).append(d)
	aus = []
	for nb, d in je.items():
		s = sorted(d)
		median = s[(len(s) - 1) // 2] if len(s) % 2 else (s[len(s) // 2 - 1] + s[len(s) // 2]) / 2
		aus.append({"netzbetreiberId": nb, "lieferungen": len(s), "mittelTage": sum(s) / len(s), "medianTage": median, "maxTage": s[-1], "verspaetetPct": (len([x for x in s if x > regeln["lieferFristTage"]]) / len(s)) * 100})
	return sorted(aus, key=lambda a: a["netzbetreiberId"])


def qualitaets_zusammenfassung(zeilen):
	z = {"ok": 0, "erwartet": 0, "warn": 0, "fehler": 0}
	gesamt = "ok"
	for r in zeilen:
		for t in r["tage"]:
			if t["ampel"] not in z:
				continue
			z[t["ampel"]] += 1
			gesamt = _schlechter(gesamt, "ok" if t["ampel"] == "erwartet" else t["ampel"])
	n = z["ok"] + z["erwartet"] + z["warn"] + z["fehler"]
	return {"zaehler": z, "tage": n, "quoteOk": (z["ok"] + z["erwartet"]) / n if n else 1, "ampel": gesamt, "abrechenbar": z["fehler"] == 0 and z["warn"] == 0 and n > 0}


def reklamations_text(zaehlpunktnummer, von, bis, netzbetreiber="", gemeinschaft="", gemeinschafts_id="", gruende=None):
	gruende = gruende or []
	zeilen = [
		f"Betreff: Energiedaten Energiegemeinschaft – Nachforderung bzw. Klärung {zaehlpunktnummer} ({von} bis {bis})",
		"",
		f"Sehr geehrte Damen und Herren{f' der {netzbetreiber}' if netzbetreiber else ''},",
		"",
		f"für den Zählpunkt {zaehlpunktnummer} der Gemeinschaft {gemeinschaft}{f' (Gemeinschafts-ID {gemeinschafts_id})' if gemeinschafts_id else ''} liegen für den Zeitraum {von} bis {bis} keine vollständigen bzw. abrechenbaren Viertelstundenwerte vor:",
		*[f"– {g}" for g in gruende],
		"",
		"Wir bitten um Lieferung bzw. Korrektur der Werte über EDA (CR_MSG). Eine Nachforderung (CR_REQ_PT) wurde gestellt. L3-Werte sind nach HA II nicht abrechenbar und spätestens nach 60 Tagen (BEG/VEZ: 15 Kalendertage) durch L1/L2 zu ersetzen.",
		"",
		"Mit freundlichen Grüßen",
	]
	return "\n".join(zeilen)


# ---------------------------------------------------------------- Simulation (4.7)

SIM_STAND = "2026-10-01"
QH = 96
RAD = math.pi / 180
SIM_STANDARD = {"lieferantCt": 12, "netzApCt": 7, "bezugCt": 10, "einspeisCt": 8, "marktwertCt": 5, "elAbgHaushaltCt": 0.1, "elAbgSonstCt": 0.82, "efbCt": 0, "verwaltungEurJeTeilnehmer": 20, "mitgliedsbeitragEur": 0}
KLEINUNTERNEHMER_GRENZE_EUR = 55000
KLEINUNTERNEHMER_TOLERANZ_EUR = 60500
PV_MONATSANTEILE = [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025]
WP_MONATSANTEILE = [0.19, 0.16, 0.13, 0.08, 0.035, 0.01, 0.005, 0.005, 0.02, 0.07, 0.12, 0.175]
SIM_GRENZEN = {"teilnehmer": 250, "teilnehmerOeffentlich": 30, "anlagen": 60, "kwp": 6000, "verbrauchKwh": 5e7}
_H0 = {
	"w": {
		"wt": [70, 58, 52, 50, 50, 55, 80, 110, 125, 120, 118, 125, 140, 135, 120, 110, 115, 140, 185, 200, 190, 165, 135, 100],
		"sa": [80, 65, 58, 54, 52, 54, 62, 85, 115, 140, 150, 155, 160, 150, 135, 125, 130, 150, 185, 195, 185, 165, 140, 110],
		"so": [85, 70, 60, 55, 52, 52, 56, 70, 100, 135, 160, 175, 180, 155, 135, 125, 128, 145, 180, 190, 180, 160, 135, 105],
	},
	"s": {
		"wt": [75, 60, 54, 51, 51, 55, 75, 95, 105, 105, 105, 112, 125, 120, 105, 98, 100, 115, 140, 155, 160, 160, 140, 105],
		"sa": [85, 68, 58, 54, 52, 53, 60, 78, 102, 120, 128, 135, 140, 128, 115, 108, 110, 122, 140, 150, 152, 150, 135, 110],
		"so": [90, 72, 62, 56, 53, 52, 55, 65, 90, 120, 140, 152, 155, 135, 118, 108, 108, 118, 138, 148, 150, 148, 132, 108],
	},
}
_G0 = {
	"wt": [60, 58, 57, 57, 58, 65, 85, 120, 150, 160, 162, 160, 150, 150, 155, 150, 140, 120, 100, 85, 75, 70, 65, 62],
	"sa": [60, 58, 57, 57, 58, 60, 68, 85, 100, 108, 110, 108, 100, 92, 85, 80, 76, 72, 68, 65, 63, 62, 61, 60],
	"so": [58, 56, 55, 55, 55, 56, 58, 60, 62, 64, 65, 65, 64, 62, 61, 60, 60, 60, 60, 59, 59, 58, 58, 58],
}
_G1_WE = [30, 29, 28, 28, 28, 29, 30, 31, 32, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 31, 31, 30, 30, 30]
_G1 = {"wt": [30, 28, 28, 28, 30, 40, 80, 150, 200, 210, 210, 205, 190, 195, 200, 195, 170, 110, 60, 45, 40, 36, 33, 31], "sa": _G1_WE, "so": _G1_WE}
_L0 = [55, 50, 48, 48, 60, 110, 150, 130, 100, 90, 88, 90, 95, 90, 88, 90, 110, 150, 155, 120, 95, 80, 70, 60]
_WP_T = [1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.25, 1.2, 1.05, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.1, 1.1, 1.1, 1.1]
_EV_WT = [0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.6, 1, 1, 1, 0.9, 0.7, 0.4]
_EV_WE = [0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.7, 0.8, 0.8, 0.7, 0.5, 0.3, 0.4, 0.6, 0.6, 0.5, 0.4, 0.3, 0.2]
LASTPROFILE = {
	"H0": {"label": "Haushalt (H0)", "text": "Standardlastprofil Haushalt mit Dynamisierung"},
	"G0": {"label": "Gewerbe allgemein (G0)", "text": "Gewerbe gewichtet, werktags tagsüber"},
	"G1": {"label": "Gewerbe werktags 8–18 Uhr (G1)", "text": "Büro, Amt, Schule"},
	"L0": {"label": "Landwirtschaft (L0)", "text": "Morgen- und Abendspitze (Melken, Kühlung)"},
	"BAND": {"label": "Bandlast", "text": "gleichmäßig, z. B. Kläranlage, Pumpen"},
	"lastgang": {"label": "Eigener Lastgang", "text": "Viertelstundenwerte aus dem Netzbetreiber-Portal"},
}


def _schalt(j):
	return (j % 4 == 0 and j % 100 != 0) or j % 400 == 0


def tage_im_jahr(j):
	return 366 if _schalt(j) else 365


def _monatslaenge(j):
	return [31, 29 if _schalt(j) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def kalender_tag(j, d):
	ml = _monatslaenge(j)
	m = 0
	r = d
	while r >= ml[m]:
		r -= ml[m]
		m += 1
	wt = (date(j, 1, 1) + timedelta(days=d)).weekday()
	return {"monat": m, "tag": r + 1, "wochentag": wt}


def _jahreszeit(monat, tag):
	md = (monat + 1) * 100 + tag
	if md >= 1101 or md <= 320:
		return "w"
	if 515 <= md <= 914:
		return "s"
	return "u"


def _tagtyp(wt):
	return "sa" if wt == 5 else ("so" if wt == 6 else "wt")


def _stunden_profil(profil, monat, tag, wt):
	tt = _tagtyp(wt)
	jz = _jahreszeit(monat, tag)
	if profil == "H0":
		if jz == "u":
			return [(x + _H0["s"][tt][i]) / 2 for i, x in enumerate(_H0["w"][tt])]
		return _H0[jz][tt]
	f = 1.08 if jz == "w" else (0.92 if jz == "s" else 1)
	if profil == "G0":
		return [x * f for x in _G0[tt]]
	if profil == "G1":
		return [x * f for x in _G1[tt]]
	if profil == "L0":
		f2 = 1.05 if jz == "w" else (0.95 if jz == "s" else 1)
		return [x * f2 for x in _L0]
	return [100] * 24


def _viertelstunden(h24):
	aus = [0.0] * QH
	for q in range(QH):
		t = (q + 0.5) / 4 - 0.5
		a = math.floor(t)
		f = t - a
		x0 = h24[(a + 24) % 24]
		x1 = h24[(a + 25) % 24]
		aus[q] = x0 + (x1 - x0) * f
	return aus


def _dyn(t):
	return -3.92e-10 * t ** 4 + 3.2e-7 * t ** 3 - 7.02e-5 * t ** 2 + 2.1e-3 * t + 1.24


def lastprofil(profil, jahr=2025):
	n = tage_im_jahr(jahr)
	aus = [0.0] * (n * QH)
	s = 0.0
	ml = _monatslaenge(jahr)
	for d in range(n):
		k = kalender_tag(jahr, d)
		if profil == "WP":
			anteil = WP_MONATSANTEILE[k["monat"]] / ml[k["monat"]]
			v = _viertelstunden(_WP_T)
			vs = _sum_js(v)
			qv = [(x / vs) * anteil for x in v]
		elif profil == "EAUTO":
			v = [max(0, x) for x in _viertelstunden(_EV_WE if k["wochentag"] >= 5 else _EV_WT)]
			vs = _sum_js(v)
			qv = [x / vs for x in v]
		else:
			qv = _viertelstunden(_stunden_profil(profil, k["monat"], k["tag"], k["wochentag"]))
			if profil == "H0":
				f = _dyn(d + 1)
				qv = [x * f for x in qv]
		for q in range(QH):
			aus[d * QH + q] = qv[q]
			s += qv[q]
	return [x / s for x in aus]


def spez_ertrag_standard(lat=48):
	la = _f(lat) or 48
	return max(900, min(1250, 1100 - 30 * (la - 47)))


def pv_klarhimmel(tag_im_jahr, stunde_mez, lat=48, lon=14, ausrichtung=0, neigung=30):
	n = tag_im_jahr
	B = ((360 / 365) * (n - 81)) * RAD
	eot = 9.87 * math.sin(2 * B) - 7.53 * math.cos(B) - 1.5 * math.sin(B)
	sonnenzeit = stunde_mez + (4 * (lon - 15) + eot) / 60
	omega = 15 * (sonnenzeit - 12) * RAD
	delta = 23.45 * math.sin(((360 / 365) * (284 + n)) * RAD) * RAD
	phi = lat * RAD
	beta = neigung * RAD
	gamma = ausrichtung * RAD
	cz = math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.cos(omega)
	if cz <= 0.01:
		return 0
	am = 1 / cz
	dni = 1000 * 0.7 ** (am ** 0.678)
	ct = (
		math.sin(delta) * math.sin(phi) * math.cos(beta)
		- math.sin(delta) * math.cos(phi) * math.sin(beta) * math.cos(gamma)
		+ math.cos(delta) * math.cos(phi) * math.cos(beta) * math.cos(omega)
		+ math.cos(delta) * math.sin(phi) * math.sin(beta) * math.cos(gamma) * math.cos(omega)
		+ math.cos(delta) * math.sin(beta) * math.sin(gamma) * math.sin(omega)
	)
	diffus = 0.1 * dni * cz * ((1 + math.cos(beta)) / 2)
	return dni * max(0, ct) + diffus


def pv_tag_klar(tag_im_jahr, lat=48, lon=14, ausrichtung=0, neigung=30):
	return [pv_klarhimmel(tag_im_jahr, (q + 0.5) / 4, lat, lon, ausrichtung, neigung) for q in range(QH)]


def ausrichtungs_faktor(lat=48, lon=14, ausrichtung=0, neigung=30):
	a = 0.0
	r = 0.0
	for d in range(1, 366, 7):
		for q in range(0, QH, 2):
			a += pv_klarhimmel(d, (q + 0.5) / 4, lat, lon, ausrichtung, neigung)
			r += pv_klarhimmel(d, (q + 0.5) / 4, lat, lon, 0, 30)
	return a / r if r > 0 else 1


def wetterfaktoren(anzahl, saat):
	z = zufall(saat)
	return [0.12 + 0.88 * z() ** 0.7 for _ in range(anzahl)]


def pv_jahr(jahr=2025, lat=48, lon=14, ausrichtung=0, neigung=30, spez_ertrag=None, saat=1):
	n = tage_im_jahr(jahr)
	jahresertrag = (spez_ertrag or spez_ertrag_standard(lat)) * ausrichtungs_faktor(lat, lon, ausrichtung, neigung)
	wetter = wetterfaktoren(n, saat)
	aus = [0.0] * (n * QH)
	ml = _monatslaenge(jahr)
	d0 = 0
	for m in range(12):
		sm = 0.0
		for d in range(d0, d0 + ml[m]):
			p = pv_tag_klar(d + 1, lat, lon, ausrichtung, neigung)
			for q in range(QH):
				x = p[q] * wetter[d]
				aus[d * QH + q] = x
				sm += x
		ziel = jahresertrag * PV_MONATSANTEILE[m] * ((29 / 28) if (n == 366 and m == 1) else 1)
		f = ziel / sm if sm > 0 else 0
		for i in range(d0 * QH, (d0 + ml[m]) * QH):
			aus[i] *= f
		d0 += ml[m]
	return aus


def _zahl_oder(v, std, mn=0, mx=1e12):
	if isinstance(v, bool):
		x = float("nan")
	elif isinstance(v, (int, float)):
		x = float(v)
	elif v is None or v == "":
		x = float("nan")
	else:
		try:
			x = float(str(v).replace(",", ".", 1))
		except ValueError:
			x = float("nan")
	if math.isnan(x) or math.isinf(x):
		return std
	return min(mx, max(mn, x))


def _kurztext(v, mx=80):
	return "".join(" " if ord(c) < 32 else c for c in str("" if v is None else v)).strip()[:mx]


def _js_round(x):
	return math.floor(x + 0.5)


_ART_PROFIL = {"privat": "H0", "landwirt": "L0", "kmu": "G0", "grossunternehmen": "G0", "gemeinde": "G1", "oeffentlich": "G1", "verein": "G0"}
_ART_VERBRAUCH = {"privat": 3500, "landwirt": 12000, "kmu": 25000, "grossunternehmen": 500000, "gemeinde": 30000, "oeffentlich": 30000, "verein": 8000}


def simulation_bereinigen(d, oeffentlich=False):
	mx = SIM_GRENZEN["teilnehmerOeffentlich"] if oeffentlich else SIM_GRENZEN["teilnehmer"]
	tn = d.get("teilnehmer") if isinstance(d.get("teilnehmer"), list) else []
	an = d.get("anlagen") if isinstance(d.get("anlagen"), list) else []
	if not tn:
		raise energie_fehler("Bitte mindestens einen Teilnehmer mit Verbrauch angeben.", "teilnehmer")
	if len(tn) > mx:
		raise energie_fehler(f"Höchstens {mx} Teilnehmer je Simulation.", "teilnehmer")
	if len(an) > SIM_GRENZEN["anlagen"]:
		raise energie_fehler(f"Höchstens {SIM_GRENZEN['anlagen']} Gemeinschaftsanlagen.", "anlagen")
	st = d.get("standort") or {}
	lat = _zahl_oder(st.get("lat"), 48.2, 46, 49.1)
	lon = _zahl_oder(st.get("lon"), 13.5, 9.5, 17.2)
	p = d.get("preise") or {}
	preise = {k: _zahl_oder(p.get(k), v, 0, 100000 if k.endswith("Eur") else 100) for k, v in SIM_STANDARD.items()}
	modell = d.get("modell") if d.get("modell") in ("eeg", "beg", "gea", "p2p", "eigenversorgung") else "eeg"
	teilnehmer = []
	for i, t in enumerate(tn):
		art = t.get("art") if t.get("art") in _ART_PROFIL else "privat"
		profil = t.get("profil") if t.get("profil") in LASTPROFILE else _ART_PROFIL[art]
		lastgang = [_zahl_oder(x, 0, 0, 1e6) for x in t["lastgang"]] if profil == "lastgang" and isinstance(t.get("lastgang"), list) else None
		if profil == "lastgang" and (not lastgang or len(lastgang) < 8760):
			raise energie_fehler(f"Teilnehmer {i + 1}: Lastgang mit mindestens einem Jahr Stundenwerten (bzw. Viertelstunden) angeben.", f"teilnehmer.{i}.lastgang")
		tf_e = t.get("tfErzeugung") if t.get("tfErzeugung") is not None else t.get("tf")
		teilnehmer.append({
			"id": _kurztext(t.get("id"), 40) or f"T{i + 1}",
			"name": f"Teilnehmer {i + 1}" if oeffentlich else (_kurztext(t.get("name"), 80) or f"Teilnehmer {i + 1}"),
			"art": art,
			"profil": profil,
			"jahresverbrauchKwh": _zahl_oder(t.get("jahresverbrauchKwh"), _ART_VERBRAUCH[art], 0, SIM_GRENZEN["verbrauchKwh"]),
			"waermepumpeKwh": _zahl_oder(t.get("waermepumpeKwh"), 0, 0, 1e6),
			"eautoKwh": _zahl_oder(t.get("eautoKwh"), 0, 0, 1e6),
			"lastgang": lastgang,
			"tf": _js_round(_zahl_oder(t.get("tf"), 100, 1, 100)),
			"tfErzeugung": _js_round(_zahl_oder(tf_e, 100, 1, 100)),
			"pvKwp": _zahl_oder(t.get("pvKwp"), 0, 0, SIM_GRENZEN["kwp"]),
			"pvAusrichtung": _zahl_oder(t.get("pvAusrichtung"), 0, -180, 180),
			"pvNeigung": _zahl_oder(t.get("pvNeigung"), 30, 0, 90),
			"volleinspeisung": t.get("volleinspeisung") is True,
			"schutzbeduerftig": t.get("schutzbeduerftig") is True,
			"haushalt": (art == "privat") if t.get("haushalt") is None else t.get("haushalt") is True,
			"schluesselPct": _zahl_oder(t.get("schluesselPct"), 0, 0, 100),
			"anzahl": _js_round(_zahl_oder(t.get("anzahl"), 1, 1, 500)),
		})
	anlagen = []
	for i, a in enumerate(an):
		x = {
			"id": _kurztext(a.get("id"), 40) or f"A{i + 1}",
			"name": f"Anlage {i + 1}" if oeffentlich else (_kurztext(a.get("name"), 80) or f"Anlage {i + 1}"),
			"art": "pv",
			"kwp": _zahl_oder(a.get("kwp"), 0, 0, SIM_GRENZEN["kwp"]),
			"ausrichtung": _zahl_oder(a.get("ausrichtung"), 0, -180, 180),
			"neigung": _zahl_oder(a.get("neigung"), 30, 0, 90),
			"spezErtrag": _zahl_oder(a.get("spezErtrag"), None, 500, 1600) if a.get("spezErtrag") else None,
			"tf": _js_round(_zahl_oder(a.get("tf"), 100, 1, 100)),
			"gemeinde": a.get("gemeinde") is True,
			"haushalt": a.get("haushalt") is True,
		}
		if x["kwp"] > 0:
			anlagen.append(x)
	if not anlagen and not any(t["pvKwp"] > 0 for t in teilnehmer):
		raise energie_fehler("Bitte mindestens eine Erzeugungsanlage angeben (Gemeinschaftsanlage oder PV eines Teilnehmers).", "anlagen")
	sp = d.get("speicher") or {}
	speicher = None
	if _zahl_oder(sp.get("kapazitaetKwh"), 0, 0, 1e5) > 0:
		kap = _zahl_oder(sp.get("kapazitaetKwh"), 0, 0, 1e5)
		speicher = {"kapazitaetKwh": kap, "leistungKw": _zahl_oder(sp.get("leistungKw"), _zahl_oder(sp.get("kapazitaetKwh"), 0) / 2, 0.1, 1e5), "wirkungsgradPct": _zahl_oder(sp.get("wirkungsgradPct"), 90, 50, 100), "socMinPct": _zahl_oder(sp.get("socMinPct"), 5, 0, 50)}
	nz = d.get("netz") or {}
	netz = {
		"reduktionPct": _zahl_oder(nz.get("reduktionPct"), 57 if modell == "eeg" else 0, 0, 100),
		"abgabenBefreit": (modell in ("eeg", "gea")) if nz.get("abgabenBefreit") is None else nz.get("abgabenBefreit") is True,
		"quelle": _kurztext(nz.get("quelle"), 160),
		"status": _kurztext(nz.get("status"), 20),
	}
	varianten = []
	for i, v in enumerate((d.get("varianten") or [])[:8]):
		varianten.append({"id": _kurztext(v.get("id"), 30) or f"V{i + 1}", "label": _kurztext(v.get("label"), 80) or f"Variante {i + 1}", "reduktionPct": _zahl_oder(v.get("reduktionPct"), 0, 0, 100), "abgabenBefreit": v.get("abgabenBefreit") is True, "hinweis": _kurztext(v.get("hinweis"), 160)})
	sens = (d.get("sensitivitaet") or {}).get("haushalte")
	haushalte = [h for h in (_js_round(_zahl_oder(x, 0, 0, 200)) for x in (sens if isinstance(sens, list) else [])[:3]) if h > 0]
	return {
		"titel": _kurztext(d.get("titel"), 120) or "Simulation",
		"jahr": _js_round(_zahl_oder(d.get("jahr"), 2025, 2020, 2035)),
		"modell": modell,
		"zonelevel": _js_round(_zahl_oder(d.get("zonelevel"), 3 if modell == "eeg" else (1 if modell == "gea" else 6), 1, 7)),
		"verteilmodell": "statisch" if d.get("verteilmodell") == "statisch" else "dynamisch",
		"ustStatus": "regelbesteuert" if d.get("ustStatus") == "regelbesteuert" else "kleinunternehmer",
		"standort": {"lat": lat, "lon": lon},
		"preise": preise,
		"netz": netz,
		"varianten": varianten,
		"teilnehmer": teilnehmer,
		"anlagen": anlagen,
		"speicher": speicher,
		"saat": _js_round(_zahl_oder(d.get("saat"), 2026, 0, 1e9)),
		"sensitivitaet": {"haushalte": haushalte},
	}


def lastgang_auf_jahr(werte, jahr):
	n = tage_im_jahr(jahr) * QH
	stunden = len(werte) < 34000
	return [(werte[(i // 4) % len(werte)] / 4) if stunden else werte[i % len(werte)] for i in range(n)]


def ap_reduziert(ap_ct, pct):
	return rund(_f(ap_ct) * (1 - _f(pct) / 100), 2)


def _r2(x):
	return rund(x, 2)


def _r3(x):
	return rund(x, 3)


def _sim_kern(e, zusatz_haushalte=0):
	jahr = e["jahr"]
	n = tage_im_jahr(jahr) * QH
	profile = {}

	def prof(p):
		if p not in profile:
			profile[p] = lastprofil(p, jahr)
		return profile[p]

	pv_cache = {}

	def pv(ausrichtung, neigung, spez):
		k = f"{ausrichtung}|{neigung}|{spez or ''}"
		if k not in pv_cache:
			pv_cache[k] = pv_jahr(jahr, e["standort"]["lat"], e["standort"]["lon"], ausrichtung, neigung, spez, e["saat"])
		return pv_cache[k]

	tn = [{**t, "last": lastgang_auf_jahr(t["lastgang"], jahr) if t["lastgang"] else None} for t in e["teilnehmer"]]
	for k in range(zusatz_haushalte):
		tn.append({"id": f"S{k + 1}", "name": f"Zusatzhaushalt {k + 1}", "art": "privat", "profil": "H0", "jahresverbrauchKwh": 3500, "waermepumpeKwh": 0, "eautoKwh": 0, "last": None, "tf": 100, "tfErzeugung": 100, "pvKwp": 0, "pvAusrichtung": 0, "pvNeigung": 30, "volleinspeisung": False, "schutzbeduerftig": False, "haushalt": True, "schluesselPct": 0, "anzahl": 1, "zusatz": True})
	T = len(tn)
	A = len(e["anlagen"])
	reihen = [{"p": None if t["last"] else prof(t["profil"]), "wp": prof("WP") if t["waermepumpeKwh"] else None, "ev": prof("EAUTO") if t["eautoKwh"] else None, "pv": pv(t["pvAusrichtung"], t["pvNeigung"], None) if t["pvKwp"] else None} for t in tn]
	apv = [pv(a["ausrichtung"], a["neigung"], a["spezErtrag"]) for a in e["anlagen"]]
	statisch = e["verteilmodell"] == "statisch"
	s_sum = 0
	for t in tn:
		s_sum += t["schluesselPct"] * t["anzahl"]
	s_stern = [(t["schluesselPct"] / s_sum if s_sum > 100 else t["schluesselPct"] / 100) for t in tn]
	sp = e["speicher"]
	eta_l = math.sqrt(sp["wirkungsgradPct"] / 100) if sp else 1
	soc_min = (sp["kapazitaetKwh"] * sp["socMinPct"]) / 100 if sp else 0
	soc = soc_min if sp else 0
	S = [{"last": 0.0, "eigen": 0.0, "netzbezug": 0.0, "vtf": 0.0, "ed": 0.0, "edSpeicher": 0.0, "pv": 0.0, "ueberschuss": 0.0, "etf": 0.0, "eingebracht": 0.0, "rest": 0.0} for _ in tn]
	SA = [{"erzeugung": 0.0, "etf": 0.0, "eingebracht": 0.0, "rest": 0.0} for _ in e["anlagen"]]
	monate = [{"erzeugungTf": 0.0, "verbrauchTf": 0.0, "eigendeckung": 0.0, "restueberschuss": 0.0, "speicher": 0.0} for _ in range(12)]
	typ = {0: {"e": [0.0] * QH, "v": [0.0] * QH, "ed": [0.0] * QH, "tage": 0}, 6: {"e": [0.0] * QH, "v": [0.0] * QH, "ed": [0.0] * QH, "tage": 0}}
	vq = [0.0] * T
	eq = [0.0] * T
	aq = [0.0] * A
	sp_geladen = 0.0
	sp_entladen = 0.0
	ml = _monatslaenge(jahr)
	monat_von_tag = []
	for m in range(12):
		monat_von_tag += [m] * ml[m]
	for i in range(n):
		m = monat_von_tag[i // QH]
		q = i % QH
		Es = 0.0
		Vs = 0.0
		for k in range(T):
			t = tn[k]
			r = reihen[k]
			last = t["last"][i] if t["last"] else r["p"][i] * t["jahresverbrauchKwh"]
			if r["wp"]:
				last += r["wp"][i] * t["waermepumpeKwh"]
			if r["ev"]:
				last += r["ev"][i] * t["eautoKwh"]
			last *= t["anzahl"]
			erz = r["pv"][i] * t["pvKwp"] * t["anzahl"] if r["pv"] else 0
			eigen = 0 if t["volleinspeisung"] else min(last, erz)
			netzbezug = last - eigen
			ueb = erz - eigen
			v1 = (netzbezug * t["tf"]) / 100
			e1 = (ueb * t["tfErzeugung"]) / 100
			s = S[k]
			s["last"] += last
			s["eigen"] += eigen
			s["netzbezug"] += netzbezug
			s["pv"] += erz
			s["ueberschuss"] += ueb
			s["vtf"] += v1
			s["etf"] += e1
			vq[k] = v1
			eq[k] = e1
			Vs += v1
			Es += e1
		for j in range(A):
			a = e["anlagen"][j]
			x = apv[j][i] * a["kwp"]
			e1 = (x * a["tf"]) / 100
			SA[j]["erzeugung"] += x
			SA[j]["etf"] += e1
			aq[j] = e1
			Es += e1
		EDs = 0.0
		edk = [0.0] * T
		for k in range(T):
			a = Es * s_stern[k] * tn[k]["anzahl"] if statisch else ((Es * vq[k]) / Vs if Vs > 0 else 0)
			d = min(a, vq[k])
			edk[k] = d
			EDs += d
		R = max(0, Es - EDs)
		aus_speicher = 0
		if sp:
			dt_max = sp["leistungKw"] * 0.25
			if R > 0:
				laden = min(R, dt_max, (sp["kapazitaetKwh"] - soc) / eta_l)
				if laden > 0:
					soc += laden * eta_l
					R -= laden
					sp_geladen += laden
			else:
				bedarf = Vs - EDs
				if bedarf > 0:
					aus_speicher = min(bedarf, dt_max, (soc - soc_min) * eta_l)
					if aus_speicher > 0:
						soc -= aus_speicher / eta_l
						sp_entladen += aus_speicher
						for k in range(T):
							S[k]["edSpeicher"] += (aus_speicher * (vq[k] - edk[k])) / bedarf
					else:
						aus_speicher = 0
		for k in range(T):
			S[k]["ed"] += edk[k]
		if Es > 0:
			genutzt = (Es - R) / Es
			for k in range(T):
				if eq[k] > 0:
					S[k]["eingebracht"] += eq[k] * genutzt
					S[k]["rest"] += eq[k] * (1 - genutzt)
			for j in range(A):
				if aq[j] > 0:
					SA[j]["eingebracht"] += aq[j] * genutzt
					SA[j]["rest"] += aq[j] * (1 - genutzt)
		mo = monate[m]
		mo["erzeugungTf"] += Es
		mo["verbrauchTf"] += Vs
		mo["eigendeckung"] += EDs + aus_speicher
		mo["restueberschuss"] += R
		mo["speicher"] += aus_speicher
		if m in typ:
			typ[m]["e"][q] += Es
			typ[m]["v"][q] += Vs
			typ[m]["ed"][q] += EDs + aus_speicher
			if q == 0:
				typ[m]["tage"] += 1
	speicher = {"geladenKwh": sp_geladen, "entladenKwh": sp_entladen, "socEndeKwh": soc, "verlusteKwh": sp_geladen - sp_entladen - (soc - soc_min)} if sp else None
	return {"tn": tn, "S": S, "SA": SA, "monate": monate, "typ": typ, "speicher": speicher}


def _geld(e, r, netz):
	p = e["preise"]
	netz_eur_kwh = (p["netzApCt"] - ap_reduziert(p["netzApCt"], netz["reduktionPct"])) / 100
	aus = []
	for k, t in enumerate(r["tn"]):
		s = r["S"][k]
		ed = s["ed"] + s["edSpeicher"]
		el_abg = p["elAbgHaushaltCt"] if t["haushalt"] else p["elAbgSonstCt"]
		energie = _r2((ed * (p["lieferantCt"] - p["bezugCt"])) / 100)
		netz_e = _r2(ed * netz_eur_kwh)
		abgaben = _r2((ed * (el_abg + p["efbCt"])) / 100) if netz["abgabenBefreit"] else 0
		erzeuger = _r2((s["eingebracht"] * (p["einspeisCt"] - p["marktwertCt"])) / 100)
		beitrag = -_r2(p["mitgliedsbeitragEur"] * t["anzahl"])
		aus.append({"energie": energie, "netz": netz_e, "abgaben": abgaben, "erzeuger": erzeuger, "beitrag": beitrag, "summe": _r2(energie + netz_e + abgaben + erzeuger + beitrag)})
	return aus


def simulation_rechnen(daten, oeffentlich=False):
	e = simulation_bereinigen(daten, oeffentlich)
	r = _sim_kern(e)
	p = e["preise"]
	g = _geld(e, r, e["netz"])

	def sm(f):
		s = 0.0
		for x in r["S"]:
			s += f(x)
		return s + 0

	V = sm(lambda x: x["vtf"])
	ED = sm(lambda x: x["ed"] + x["edSpeicher"])
	Eges = sm(lambda x: x["etf"])
	for a in r["SA"]:
		Eges += a["etf"]
	R = 0.0
	for m in r["monate"]:
		R += m["restueberschuss"]
	last = sm(lambda x: x["last"])
	eigen = sm(lambda x: x["eigen"])
	teilnehmer = []
	for k, t in enumerate(r["tn"]):
		s = r["S"][k]
		ed = s["ed"] + s["edSpeicher"]
		teilnehmer.append({
			"id": t["id"], "name": t["name"], "art": t["art"], "profil": t["profil"], "anzahl": t["anzahl"], "tf": t["tf"], "schutzbeduerftig": t["schutzbeduerftig"],
			"verbrauchKwh": _r3(s["last"]), "eigenverbrauchKwh": _r3(s["eigen"]), "netzbezugKwh": _r3(s["netzbezug"]), "verbrauchTfKwh": _r3(s["vtf"]), "eigendeckungKwh": _r3(ed), "ausSpeicherKwh": _r3(s["edSpeicher"]), "restbezugKwh": _r3(s["netzbezug"] - ed),
			"deckungPct": rund((ed / s["vtf"]) * 100, 1) if s["vtf"] > 0 else 0, "autarkiePct": rund(((s["eigen"] + ed) / s["last"]) * 100, 1) if s["last"] > 0 else 0,
			"erzeugungKwh": _r3(s["pv"]), "ueberschussKwh": _r3(s["ueberschuss"]), "eingebrachtKwh": _r3(s["eingebracht"]), "restueberschussKwh": _r3(s["rest"]),
			"kostenEgEur": _r2((ed * p["bezugCt"]) / 100), "gutschriftEur": _r2((s["eingebracht"] * p["einspeisCt"]) / 100), "vorteil": g[k],
		})
	anlagen = []
	for j, a in enumerate(e["anlagen"]):
		x = r["SA"][j]
		anlagen.append({"id": a["id"], "name": a["name"], "kwp": a["kwp"], "tf": a["tf"], "gemeinde": a["gemeinde"], "erzeugungKwh": _r3(x["erzeugung"]), "erzeugungTfKwh": _r3(x["etf"]), "eingebrachtKwh": _r3(x["eingebracht"]), "restueberschussKwh": _r3(x["rest"]), "spezErtrag": rund(x["erzeugung"] / a["kwp"], 0) if a["kwp"] else 0, "gutschriftEur": _r2((x["eingebracht"] * p["einspeisCt"]) / 100)})
	eingebracht_ges = 0.0
	for t in teilnehmer:
		eingebracht_ges += t["eingebrachtKwh"]
	for a in anlagen:
		eingebracht_ges += a["eingebrachtKwh"]
	anzahl = 0
	for t in r["tn"]:
		anzahl += t["anzahl"]
	umsatz_netto = (ED * p["bezugCt"]) / 100 + p["mitgliedsbeitragEur"] * anzahl
	umsatz_brutto = umsatz_netto * 1.2 if e["ustStatus"] == "regelbesteuert" else umsatz_netto
	db = (ED * p["bezugCt"]) / 100 - (eingebracht_ges * p["einspeisCt"]) / 100 + p["mitgliedsbeitragEur"] * anzahl - p["verwaltungEurJeTeilnehmer"] * anzahl
	kw_ges = 0.0
	for a in e["anlagen"]:
		kw_ges += a["kwp"]
	for t in r["tn"]:
		kw_ges += t["pvKwp"] * t["anzahl"]
	alle_haushalt = all(a["haushalt"] for a in e["anlagen"]) and all(t["haushalt"] for t in r["tn"] if t["pvKwp"] > 0)
	lieferantenpflichten = kw_ges > 100 or (alle_haushalt and kw_ges > 30)
	vs = 0.0
	for x in g:
		vs += x["summe"]
	vorteil_summe = _r2(vs)
	varianten = []
	for v in e["varianten"]:
		gv = _geld(e, r, v)
		s1 = n1 = a1 = 0.0
		for x in gv:
			s1 += x["summe"]
			n1 += x["netz"]
			a1 += x["abgaben"]
		s = _r2(s1)
		varianten.append({**v, "vorteilEur": s, "netzEur": _r2(n1), "abgabenEur": _r2(a1), "jeTeilnehmerEur": _r2(s / anzahl) if anzahl else 0})
	sens_h = []
	for h in e["sensitivitaet"]["haushalte"]:
		rr = _sim_kern(e, h)
		v2 = 0.0
		ed2 = 0.0
		for x in rr["S"]:
			v2 += x["vtf"]
			ed2 += x["ed"] + x["edSpeicher"]
		sens_h.append({"zusaetzlich": h, "eigendeckungKwh": _r3(ed2), "eigendeckungsquote": rund(ed2 / v2, 4) if v2 > 0 else 0, "nutzungsgrad": rund(ed2 / Eges, 4) if Eges > 0 else 0})
	sensitivitaet = {"jeCtBezug": _r2(-ED / 100), "jeCtEinspeis": _r2(eingebracht_ges / 100), "haushalte": sens_h}
	hinweise = []
	if lieferantenpflichten:
		hinweise.append(f"Erzeugungsleistung {js_zahl(rund(kw_ges, 1))} kW: Lieferantenpflichten nach ElWG § 69 (AGB, Informationsblatt, Rechnungen nach § 42, Wahl Monats-/Jahresrechnung) – übernehmbar durch einen Organisator.")
	if umsatz_brutto > KLEINUNTERNEHMER_GRENZE_EUR * 0.8:
		hinweise.append(f"Umsatz der Gemeinschaft rund {js_zahl(_r2(umsatz_brutto))} € brutto – Kleinunternehmergrenze 55.000 € (Toleranz 60.500 €) im Blick behalten (§ 6 Abs. 1 Z 27 UStG).")
	if e["modell"] == "eeg" and any(t["art"] == "grossunternehmen" for t in r["tn"]):
		hinweise.append("Großunternehmen dürfen nicht Mitglied einer EEG sein (ElWG § 6 Abs. 1 Z 61, EAG § 79 Abs. 2) – BEG prüfen.")
	if Eges > 0 and ED / Eges < 0.5:
		hinweise.append("Weniger als die Hälfte der Erzeugung wird in der Gemeinschaft genutzt – weitere Verbraucher (Gewerbe, Gemeinde) oder ein Speicher erhöhen den Nutzungsgrad.")
	if V > 0 and ED / V < 0.15:
		hinweise.append("Geringe Eigendeckung – zusätzliche Erzeugung lohnt sich.")
	if db < 0:
		hinweise.append("Deckungsbeitrag negativ: Preisspanne Bezug/Einspeisung deckt die Verwaltungskosten nicht.")
	if e["speicher"]:
		hinweise.append("Gemeinschaftsspeicher: Messkonzepte nach § 111 ElWG sind offen; derzeit nur Beladung aus einer Erzeugungstechnologie (Koordinationsstelle) – Wirkung als Schätzung (zu bestätigen).")
	if e["netz"]["status"] == "platzhalter":
		hinweise.append("Netzentgelt-Reduktion ab 2027 ist ein Platzhalter bis zur neuen SNE-VO (zu bestätigen).")
	if e["verteilmodell"] == "statisch":
		hinweise.append("Statisches Modell nur noch für Bestandsgemeinschaften; Neuaktivierungen ab 05.10.2026 voraussichtlich nur dynamisch (zu bestätigen).")
	hinweise.append("Schätzung auf Basis angenäherter Standardlastprofile und eines typischen PV-Jahres – maßgeblich sind später die Viertelstundenwerte des Netzbetreibers. Keine Steuer- oder Rechtsberatung.")

	def typisch(m):
		t = r["typ"][m]
		return {"erzeugungTf": [_r3(x / t["tage"]) for x in t["e"]], "verbrauchTf": [_r3(x / t["tage"]) for x in t["v"]], "eigendeckung": [_r3(x / t["tage"]) for x in t["ed"]]}

	ergebnis = {
		"stand": SIM_STAND,
		"kennzahlen": {
			"teilnehmer": anzahl, "erzeugungsleistungKw": rund(kw_ges, 1), "verbrauchKwh": _r3(last), "eigenverbrauchKwh": _r3(eigen), "erzeugungTfKwh": _r3(Eges), "verbrauchTfKwh": _r3(V), "eigendeckungKwh": _r3(ED), "restueberschussKwh": _r3(R), "restbezugKwh": _r3(V - ED),
			"eigendeckungsquote": rund(ED / V, 4) if V > 0 else 0, "nutzungsgrad": rund(ED / Eges, 4) if Eges > 0 else 0, "autarkie": rund((eigen + ED) / last, 4) if last > 0 else 0,
			"vorteilEur": vorteil_summe, "vorteilJeTeilnehmerEur": _r2(vorteil_summe / anzahl) if anzahl else 0, "deckungsbeitragEur": _r2(db), "umsatzBruttoEur": _r2(umsatz_brutto),
			"kleinunternehmer": "unter_grenze" if umsatz_brutto <= KLEINUNTERNEHMER_GRENZE_EUR else ("toleranz" if umsatz_brutto <= KLEINUNTERNEHMER_TOLERANZ_EUR else "ueber_grenze"),
			"lieferantenpflichten": lieferantenpflichten, "netzReduktionPct": e["netz"]["reduktionPct"], "abgabenBefreit": e["netz"]["abgabenBefreit"],
		},
		"monate": [{"monat": i + 1, "erzeugungTfKwh": _r3(m["erzeugungTf"]), "verbrauchTfKwh": _r3(m["verbrauchTf"]), "eigendeckungKwh": _r3(m["eigendeckung"]), "restueberschussKwh": _r3(m["restueberschuss"]), "ausSpeicherKwh": _r3(m["speicher"])} for i, m in enumerate(r["monate"])],
		"typischerTag": {"januar": typisch(0), "juli": typisch(6)},
		"teilnehmer": teilnehmer,
		"anlagen": anlagen,
		"speicher": {**e["speicher"], "geladenKwh": _r3(r["speicher"]["geladenKwh"]), "entladenKwh": _r3(r["speicher"]["entladenKwh"]), "verlusteKwh": _r3(r["speicher"]["verlusteKwh"]), "zyklen": rund(r["speicher"]["entladenKwh"] / e["speicher"]["kapazitaetKwh"], 1) if e["speicher"]["kapazitaetKwh"] else 0} if r["speicher"] else None,
		"varianten": varianten,
		"sensitivitaet": sensitivitaet,
		"hinweise": hinweise,
	}
	if not oeffentlich:
		ergebnis["eingabe"] = {**e, "teilnehmer": [{**t, "lastgang": f"({len(t['lastgang'])} Werte)" if t["lastgang"] else None} for t in e["teilnehmer"]]}
	return ergebnis


def simulation_oeffentlich(daten):
	return simulation_rechnen(daten, oeffentlich=True)


def simulation_saat(s):
	return hash32(f"sim|{s}") % 1000000


# ---------------------------------------------------------------- Speicher


SPEICHER_HINWEIS = "Gemeinschaftsspeicher: Messkonzepte nach § 111 ElWG noch offen, Beladung derzeit nur aus einer Erzeugungstechnologie (Koordinationsstelle). Ergebnis als Empfehlung (zu bestätigen)."


def speicher_bereinigen(d):
	k = _zahl_oder(d.get("kapazitaetKwh"), float("nan"), -1e18, 1e18)
	if math.isnan(k) or k <= 0 or k > 100000:
		raise energie_fehler("Speicherkapazität zwischen 0 und 100.000 kWh angeben.", "kapazitaetKwh")
	p = _f(d.get("leistungKw")) if d.get("leistungKw") is not None else k / 2
	eta = _f(d.get("wirkungsgradPct")) if d.get("wirkungsgradPct") is not None else 90
	smin = _f(d.get("socMinPct")) if d.get("socMinPct") is not None else 5
	smax = _f(d.get("socMaxPct")) if d.get("socMaxPct") is not None else 100
	start = _f(d.get("socStartPct")) if d.get("socStartPct") is not None else smin
	if p <= 0:
		raise energie_fehler("Speicherleistung (kW) angeben.", "leistungKw")
	if not (50 <= eta <= 100):
		raise energie_fehler("Wirkungsgrad zwischen 50 und 100 %.", "wirkungsgradPct")
	if not (smin >= 0 and smin < smax and smax <= 100):
		raise energie_fehler("Ladezustandsgrenzen ungültig.", "socMinPct")
	return {"kapazitaetKwh": k, "leistungKw": p, "wirkungsgradPct": eta, "socMinPct": smin, "socMaxPct": smax, "socStartPct": min(smax, max(smin, start))}


def speicher_bilanz(erzeugung, verbrauch, parameter, mit_verlauf=False):
	sp = speicher_bereinigen(parameter)
	n = max(len(erzeugung), len(verbrauch))
	eta = math.sqrt(sp["wirkungsgradPct"] / 100)
	mn = (sp["kapazitaetKwh"] * sp["socMinPct"]) / 100
	mx = (sp["kapazitaetKwh"] * sp["socMaxPct"]) / 100
	start = (sp["kapazitaetKwh"] * sp["socStartPct"]) / 100
	dt = sp["leistungKw"] * 0.25
	soc = start
	geladen = entladen = ed_ohne = rest_ohne = bedarf_ohne = E = V = 0.0
	voll = leer = 0
	verlauf = [0.0] * n if mit_verlauf else None
	for q in range(n):
		e = (erzeugung[q] if q < len(erzeugung) else 0) or 0
		v = (verbrauch[q] if q < len(verbrauch) else 0) or 0
		E += e
		V += v
		ed_ohne += min(e, v)
		r = max(0, e - v)
		b = max(0, v - e)
		rest_ohne += r
		bedarf_ohne += b
		if r > 0:
			l = min(r, dt, (mx - soc) / eta)
			if l > 0:
				soc += l * eta
				geladen += l
			if mx - soc < 1e-9:
				voll += 1
		elif b > 0:
			x = min(b, dt, (soc - mn) * eta)
			if x > 0:
				soc -= x / eta
				entladen += x
			if soc - mn < 1e-9:
				leer += 1
		if verlauf is not None:
			verlauf[q] = soc
	verluste = geladen - entladen - (soc - start)
	return {
		"parameter": sp, "erzeugungKwh": _r3(E), "verbrauchKwh": _r3(V), "eigendeckungOhneKwh": _r3(ed_ohne), "eigendeckungMitKwh": _r3(ed_ohne + entladen),
		"restueberschussOhneKwh": _r3(rest_ohne), "restueberschussMitKwh": _r3(rest_ohne - geladen), "restbezugOhneKwh": _r3(bedarf_ohne), "restbezugMitKwh": _r3(bedarf_ohne - entladen),
		"geladenKwh": _r3(geladen), "entladenKwh": _r3(entladen), "verlusteKwh": _r3(verluste), "socEndeKwh": _r3(soc), "zyklen": rund(entladen / sp["kapazitaetKwh"], 2),
		"quoteOhne": rund(ed_ohne / V, 4) if V > 0 else 0, "quoteMit": rund((ed_ohne + entladen) / V, 4) if V > 0 else 0, "vollQh": voll, "leerQh": leer,
		"bilanzOk": abs(geladen - entladen - verluste - (soc - start)) < 1e-6, "verlauf": verlauf, "hinweis": SPEICHER_HINWEIS,
	}


def speicher_empfehlung(erzeugung, verbrauch, groessen=(10, 25, 50, 100, 200), wirkungsgrad_pct=90, wert_ct_kwh=10):
	vorher = 0
	vorher_k = 0
	aus = []
	for k in groessen:
		b = speicher_bilanz(erzeugung, verbrauch, {"kapazitaetKwh": k, "leistungKw": k / 2, "wirkungsgradPct": wirkungsgrad_pct})
		zusatz = b["entladenKwh"] - vorher
		aus.append({"kapazitaetKwh": k, "entladenKwh": b["entladenKwh"], "quoteMit": b["quoteMit"], "zyklen": b["zyklen"], "wertEur": rund((b["entladenKwh"] * wert_ct_kwh) / 100, 2), "grenzKwhJeKwh": rund(zusatz / (k - vorher_k), 3) if k - vorher_k > 0 else 0})
		vorher = b["entladenKwh"]
		vorher_k = k
	return aus


# ---------------------------------------------------------------- Prognose (4.8)


def _tag_im_jahr(tag):
	d = date.fromisoformat(tag)
	return (d - date(d.year, 1, 1)).days + 1


def klarhimmel_tag(tag, anlagen, standort, sommerzeit=False):
	n = _tag_im_jahr(tag)
	aus = [0.0] * QH
	for a in anlagen:
		lat = standort.get("lat", 48.2) if standort.get("lat") is not None else 48.2
		lon = standort.get("lon", 13.5) if standort.get("lon") is not None else 13.5
		au = a.get("ausrichtung") if a.get("ausrichtung") is not None else 0
		ne = a.get("neigung") if a.get("neigung") is not None else 30
		for q in range(QH):
			aus[q] += pv_klarhimmel(n, (q + 0.5) / 4 - (1 if sommerzeit else 0), lat, lon, au, ne) * (a.get("kwp") or 0)
	return aus


def _quantil(werte, p):
	if not werte:
		return 0
	s = sorted(werte)
	x = (len(s) - 1) * p
	lo = math.floor(x)
	hi = math.ceil(x)
	return s[lo] + (s[hi] - s[lo]) * (x - lo)


def gruene_fenster(stunden):
	f = []
	von = None
	for h in range(25):
		gruen = h < 24 and stunden[h]["e"] > stunden[h]["v"] and stunden[h]["e"] > 0
		if gruen and von is None:
			von = h
		if not gruen and von is not None:
			f.append({"von": f"{von:02d}:00", "bis": f"{h:02d}:00", "stunden": h - von})
			von = None
	return f


def prognose(heute, historie=None, anlagen=None, standort=None, tage=7, wetter=None):
	historie = historie or []
	anlagen = anlagen or []
	standort = standort or {}
	wetter = wetter or []

	def st(t):
		return versatz_min(_tag_ms(t) + 10 * H_MS) == 120

	hist = sorted([h for h in historie if h["tag"] < heute], key=lambda h: h["tag"])
	letzte30 = hist[-30:]
	verh = []
	sum_mess = sum_klar = 0.0
	for h in letzte30:
		k = _sum_js(klarhimmel_tag(h["tag"], anlagen, standort, st(h["tag"])))
		m = 0.0
		for x in (h.get("erzeugung") or [])[:QH]:
			m += x or 0
		if k > 0:
			verh.append(m / k)
			sum_mess += m
			sum_klar += k
	kal = sum_mess / sum_klar if sum_klar > 0 else 0
	p10 = _quantil(verh, 0.1)
	p90 = _quantil(verh, 0.9)
	w_map = {w["tag"]: max(0, min(1, _f(w["faktor"]))) for w in wetter}
	erg = []
	for d in range(1, tage + 1):
		tag = plus_tag(heute, d - 1)
		wt = wochentag(tag)
		gleiche = [h for h in hist if wochentag(h["tag"]) == wt][-4:]
		basis = gleiche if gleiche else hist[-7:]
		v = [0.0] * QH
		for h in basis:
			hv = h.get("verbrauch") or []
			for q in range(QH):
				v[q] += ((hv[q] if q < len(hv) else 0) or 0) / len(basis)
		klar = klarhimmel_tag(tag, anlagen, standort, st(tag))
		faktor = p90 * w_map[tag] if tag in w_map else kal
		e = [x * faktor for x in klar]
		ed = [min(x, v[q]) for q, x in enumerate(e)]
		stunden = []
		for h in range(24):
			se = sv = 0.0
			for q in range(h * 4, h * 4 + 4):
				se += e[q]
				sv += v[q]
			stunden.append({"stunde": h, "e": rund(se, 3), "v": rund(sv, 3)})
		E = _sum_js(e)
		V = _sum_js(v)
		ED = _sum_js(ed)
		kl = _sum_js(klar)
		beste = None
		for s in stunden:
			if s["e"] - s["v"] > 0 and (beste is None or s["e"] - s["v"] > beste["e"] - beste["v"]):
				beste = s
		erg.append({
			"tag": tag, "wochentag": wt, "quelle": "wetter" if tag in w_map else "klimamittel",
			"erzeugungKwh": rund(E, 3), "verbrauchKwh": rund(V, 3), "eigendeckungKwh": rund(ED, 3), "quote": rund(ED / V, 4) if V > 0 else 0,
			"band": {"p10Kwh": rund(kl * p10, 3), "p90Kwh": rund(kl * p90, 3)},
			"gruenFenster": gruene_fenster(stunden), "besteStunde": beste["stunde"] if beste else None, "stunden": stunden,
		})
	return {"heute": heute, "kalibrierung": rund(kal, 4), "tageHistorie": len(letzte30), "verhaeltnisP10": rund(p10, 4), "verhaeltnisP90": rund(p90, 4), "tage": erg, "hinweis": "Prognose aus Klimamittel und Messhistorie der letzten 30 Tage; mit Wettervorhersage genauer. Nur Empfehlung, keine Steuerung."}


# ---------------------------------------------------------------- Mehrfachteilnahme-Optimierer (4.9)


def geteilte_menge(richtung, werte, k, t):
	f = t / 100
	E = k.get("erzeugung") or []
	D = k.get("verbrauch") or []
	s = 0.0
	for q in range(len(werte)):
		x = (werte[q] or 0) * f
		if x <= 0:
			continue
		e = (E[q] if q < len(E) else 0) or 0
		d = (D[q] if q < len(D) else 0) or 0
		if richtung == "verbrauch":
			v = d + x
			s += x if e >= v else (e * x) / v
		else:
			g = e + x
			s += (min(g, d) * x) / g
	return s


def tf_optimieren(richtung="verbrauch", werte=None, kandidaten=None, hochrechnung=1):
	werte = werte or []
	kandidaten = kandidaten or []
	if richtung not in ("verbrauch", "erzeugung"):
		raise energie_fehler("Richtung verbrauch oder erzeugung.", "richtung")
	if not kandidaten:
		raise energie_fehler("Keine Gemeinschaft zur Auswahl.", "kandidaten")
	if len(kandidaten) > MAX_TEILNAHMEN_JE_ZP:
		raise energie_fehler(f"Höchstens {MAX_TEILNAHMEN_JE_ZP} Gemeinschaften je Zählpunkt (ElWG § 71 Abs. 5).", "kandidaten")
	K = len(kandidaten)
	kurven = []
	for k in kandidaten:
		c = [0.0] * 101
		for t in range(1, 101):
			c[t] = (geteilte_menge(richtung, werte, k, t) * hochrechnung * (k.get("vorteilCtKwh") or 0)) / 100
		kurven.append(c)
	best = [[0.0] * 101 for _ in range(K + 1)]
	wahl = [[0] * 101 for _ in range(K + 1)]
	for k in range(1, K + 1):
		for b in range(101):
			bw = best[k - 1][b]
			bt = 0
			for t in range(1, b + 1):
				x = best[k - 1][b - t] + kurven[k - 1][t]
				if x > bw + 1e-12:
					bw = x
					bt = t
			best[k][b] = bw
			wahl[k][b] = bt
	tf = [0] * K
	b = 100
	for k in range(K, 0, -1):
		tf[k - 1] = wahl[k][b]
		b -= wahl[k][b]

	def menge(i, t):
		return geteilte_menge(richtung, werte, kandidaten[i], t) * hochrechnung if t else 0

	aktuell = [max(0, min(100, _js_round(_f(k.get("aktuellTf") or 0)))) for k in kandidaten]
	aktuell_wert = 0.0
	for i, t in enumerate(aktuell):
		aktuell_wert += kurven[i][t]
	wert = 0.0
	for i, t in enumerate(tf):
		wert += kurven[i][t]
	empfehlung = []
	for i, k in enumerate(kandidaten):
		empfehlung.append({
			"gemeinschaftId": k["gemeinschaftId"], "label": k.get("label") or k["gemeinschaftId"], "vorteilCtKwh": k.get("vorteilCtKwh"), "aktuellTf": aktuell[i], "empfohlenTf": tf[i],
			"geteiltKwh": rund(menge(i, tf[i]), 3), "wertEur": rund(kurven[i][tf[i]], 2), "aktuellGeteiltKwh": rund(menge(i, aktuell[i]), 3), "aktuellWertEur": rund(kurven[i][aktuell[i]], 2),
			"kurve": [{"tf": t, "wertEur": rund(kurven[i][t], 2)} for t in range(0, 101, 10)],
		})
	gesamt = 0.0
	for x in werte:
		gesamt += x or 0
	gesamt *= hochrechnung
	summe_tf = sum(tf)
	hinweise = [
		"Teilnahmefaktoren ganzzahlig 1–100 %, Summe höchstens 100 %, bis zu 5 Gemeinschaften (ElWG § 71 Abs. 5).",
		"Änderung über EC_PRTFACT_CHG, derzeit einmal je Tag und Gemeinschaft (ab 01.04.2028 mehrmals täglich, zu bestätigen).",
	]
	if summe_tf < 100:
		hinweise.append(f"{100 - summe_tf} % bleiben ohne Gemeinschaft – dort lohnt keine weitere Teilnahme (Grenznutzen 0).")
	hinweise.append("Empfehlung auf Basis repräsentativer Viertelstunden; fremde Gemeinschaften nur mit Daten, die das Mitglied selbst bereitstellt.")
	return {"richtung": richtung, "empfehlung": empfehlung, "summeTf": summe_tf, "restTf": 100 - summe_tf, "wertEur": rund(wert, 2), "aktuellWertEur": rund(aktuell_wert, 2), "verbesserungEur": rund(wert - aktuell_wert, 2), "mengeKwh": rund(gesamt, 3), "aenderungen": len([x for x in empfehlung if x["aktuellTf"] != x["empfohlenTf"]]), "hinweise": hinweise}


OPTIMIERUNG_ZAEHLT = ("entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt")  # = TEILNAHME_ZAEHLT
OPTIMIERUNG_DATENBASIS = {
	"messwerte": "Messwerte des Netzbetreibers",
	"schaetzung": "Schätzung aus der Mitgliederliste (Standardlastprofile)",
	"keine": "keine Daten der übrigen Teilnehmer",
}


def optimierungs_teilnahmen(teilnahmen):
	"""Zählende Teilnahmen (auch Entwurf); verworfen/abgelehnt/abgelaufen/beendet nicht (= optimierungsTeilnahmen)."""
	return [t for t in teilnahmen or [] if (t or {}).get("status") in OPTIMIERUNG_ZAEHLT]


def reihen_summe(r):
	s = 0.0
	for x in list((r or {}).get("erzeugung") or []) + list((r or {}).get("verbrauch") or []):
		s += _f(x) if x else 0
	return s


def optimierungs_kandidat(k):
	"""Kandidat mit Datenbasis (= optimierungsKandidat): Messwerte nur mit Summe > 0, sonst Schätzung, sonst keine."""
	k = dict(k or {})
	messung = k.pop("messung", None)
	schaetzung = k.pop("schaetzung", None)
	basis = "messwerte" if reihen_summe(messung) > 0 else "schaetzung" if reihen_summe(schaetzung) > 0 else "keine"
	q = messung if basis == "messwerte" else schaetzung if basis == "schaetzung" else {}
	return {**k, "erzeugung": list(q.get("erzeugung") or []), "verbrauch": list(q.get("verbrauch") or []), "datenbasis": basis, "datenbasisText": OPTIMIERUNG_DATENBASIS[basis]}


def optimierungs_hinweise(kandidaten, empfehlung):
	"""Hinweise je Kandidat (= optimierungsHinweise)."""
	h = []
	for k in kandidaten or []:
		name = k.get("label") or k.get("gemeinschaftId")
		e = next((x for x in empfehlung or [] if x.get("gemeinschaftId") == k.get("gemeinschaftId")), None)
		if k.get("datenbasis") == "schaetzung":
			h.append(f"{name}: noch keine Messwerte der übrigen Teilnehmer – Wert geschätzt aus Standardlastprofilen der Mitglieder (unsicher).")
		elif k.get("datenbasis") == "keine":
			h.append(f"{name}: keine Daten der übrigen Teilnehmer – mit 0 bewertet.")
		if k.get("status") == "entwurf":
			h.append(f"{name}: Teilnahme ist noch ein Entwurf – der Teilnahmefaktor gilt erst mit der Anmeldung; Anteile aus einer aktiven Gemeinschaft erst nach der Aktivierung verschieben.")
		elif k.get("status") and k.get("status") not in ("aktiv", "abmeldung_angefragt") and e and e.get("empfohlenTf") != e.get("aktuellTf"):
			h.append(f"{name}: Anmeldung läuft – eine Änderung ist erst nach der Aktivierung möglich (EC_PRTFACT_CHG).")
	return h


def repraesentative_tage(tage):
	je = {}
	for t in tage:
		m = t[:7]
		je.setdefault(m, [])
		if len(je[m]) < 7:
			je[m].append(t)
	auswahl = sorted(x for v in je.values() for x in v)
	return {"tage": auswahl, "hochrechnung": 365 / len(auswahl) if auswahl else 1}
