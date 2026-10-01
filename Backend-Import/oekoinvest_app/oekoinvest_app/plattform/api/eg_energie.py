# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP3 „Energiedaten, Verteilung, Simulation und Prognose“ – Frappe-API.
# Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP3); Referenz: src/lib/plattform/backend/demo/eg-energie.js;
# Rechenkern: plattform/eg_energie_kern.py (= src/lib/plattform/eg/{messwerte,qualitaet,verteilung,simulation,prognose,
# optimierung,speicher}.js, Gleichheit über testdaten/energie/vektoren.json).
#
# Rechte: jede Methode prüft den Aufrufer (kern.nutzer) UND die Kontext-Rolle je Gemeinschaft über api/eg_stamm.zugriff
# (eg_stamm_kern.eg_rollen/eg_stufe): qh_aggregiert (Summen, Qualität, Abweichung, Prognose), qh_einzeln (einzelne
# Zählpunkte, protokolliert – Zweckbindung DSGVO Art. 5 Abs. 1 lit. b; eigene Zählpunkte über eigene_daten),
# abrechnung_vorschau (Periodenwerte für WP4), stammdaten 2 (CSV-Import), eda_ausloesen 2 (Reklamation/Nachforderung).
# Energiedaten-Eingang (Ereignis eg.energiedaten.empfangen) nur System (als_benutzer = system-eg über den API-Schlüssel
# des Portals bzw. Python-intern energiedaten_empfangen_intern) oder Backoffice „eg“ schreiben. Kein allow_guest.
#
# Ablage: Plattform EG Messreihe (Tagesblock je ZP × Gemeinschaft × Tag × Größe, Werte/Qualität als JSON),
# Plattform EG Messmonat (Aggregat, wird bei jedem Eingang neu berechnet), Plattform EG Simulation.

import json

import frappe
from frappe.utils import nowdate

from oekoinvest_app.plattform import eg_energie_kern as K
from oekoinvest_app.plattform import eg_stamm_kern as SK
from oekoinvest_app.plattform.api import eg_stamm as S
from oekoinvest_app.plattform.kern import PRAEFIX, api_pruefen, aus_json, als_json, ist_admin, jetzt_iso, konflikt, neue_id, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler
from oekoinvest_app.plattform.rechte import stufe as bo_stufe

DT_REIHE = "Plattform EG Messreihe"
DT_MONAT = "Plattform EG Messmonat"
DT_SIM = "Plattform EG Simulation"
PRAEFIX.update({DT_REIHE: "EMR", DT_MONAT: "EMM", DT_SIM: "ESI"})
ERWARTET = {"verbrauch": ["verbrauch_gemessen", "verbrauch_tf", "anteil_erzeugung", "eigendeckung"], "erzeugung": ["erzeugung_gemessen", "erzeugung_tf", "restueberschuss"]}
AKTIV = ("aktiv", "abmeldung_angefragt", "beendet")
ZAEHLT = ("entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt")


def _erwartet(richtung, modell):
	e = list(ERWARTET.get(richtung, []))
	if richtung == "verbrauch" and modell == "beg":
		e.append("eigendeckung_ee")
	return e


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _daten(x):
	if isinstance(x, str):
		try:
			x = json.loads(x or "{}")
		except ValueError:
			x = {}
	return x if isinstance(x, dict) else {}


def _n(als_benutzer):
	if als_benutzer == "system-eg":
		api_pruefen()
		return S.system_nutzer()
	return nutzer(als_benutzer)


def _tag(t, feld):
	t = str(t or "")[:10]
	if not K.gueltiger_tag(t):
		ungueltig(f"Bitte {feld} als Datum (JJJJ-MM-TT) angeben.")
	return t


def _heute():
	return nowdate()


def _r3(x):
	return K.rund(x, 3)


# ================================================================ Datenzugriff


def _block_aus(doc):
	b = {
		"zaehlpunktId": doc.zaehlpunkt, "gemeinschaftId": doc.gemeinschaft or "", "tag": str(doc.tag), "beginnUtc": doc.beginn_utc or "", "groesse": doc.groesse,
		"werte": aus_json(doc.werte, []) or [], "qualitaet": aus_json(doc.qualitaet, []) or [],
		"quelle": {"art": doc.quelle_art or "eda", "nachrichtId": doc.nachricht_id or "", "messageId": doc.message_id or "", "datei": doc.datei or ""},
		"empfangenAm": doc.empfangen_am or "", "erstEmpfangenAm": doc.erst_empfangen_am or "", "version": doc.version or 1, "historie": aus_json(doc.historie, []) or [],
	}
	b.update(K.block_kennzahlen(b))
	return b


FELDER = ["name", "zaehlpunkt", "gemeinschaft", "tag", "beginn_utc", "groesse", "werte", "qualitaet", "quelle_art", "nachricht_id", "message_id", "datei", "empfangen_am", "erst_empfangen_am", "version", "historie"]


def _bloecke(gid, von, bis, zaehlpunkt=None, groessen=None):
	f = {"gemeinschaft": gid, "tag": ["between", [von, bis]]}
	if zaehlpunkt:
		f["zaehlpunkt"] = zaehlpunkt
	if groessen:
		f["groesse"] = ["in", groessen]
	return [_block_aus(frappe._dict(x)) for x in frappe.get_all(DT_REIHE, filters=f, fields=FELDER, order_by="tag asc", limit_page_length=200000)]


def _block_speichern(b):
	schluessel = f"{b['zaehlpunktId']}|{b['gemeinschaftId']}|{b['tag']}|{b['groesse']}"
	name = frappe.db.get_value(DT_REIHE, {"schluessel": schluessel}, "name")
	doc = frappe.get_doc(DT_REIHE, name) if name else frappe.get_doc({"doctype": DT_REIHE, "schluessel": schluessel})
	doc.update({
		"zaehlpunkt": b["zaehlpunktId"], "gemeinschaft": b["gemeinschaftId"] or None, "tag": b["tag"], "groesse": b["groesse"], "beginn_utc": b.get("beginnUtc") or K.tag_beginn_utc(b["tag"]),
		"werte": json.dumps(b["werte"], separators=(",", ":")), "qualitaet": json.dumps(b["qualitaet"], separators=(",", ":")),
		"summe_kwh": b["summeKwh"], "werte_soll": b["soll"], "werte_ist": b["ist"], "l3": b["l3"], "anteil_l3": b["anteilL3"], "vollstaendig": 1 if b["vollstaendig"] else 0, "abrechenbar": 1 if b["abrechenbar"] else 0,
		"quelle_art": (b.get("quelle") or {}).get("art") or "eda", "nachricht_id": (b.get("quelle") or {}).get("nachrichtId") or "", "message_id": (b.get("quelle") or {}).get("messageId") or "", "datei": (b.get("quelle") or {}).get("datei") or "",
		"empfangen_am": b.get("empfangenAm") or "", "erst_empfangen_am": b.get("erstEmpfangenAm") or b.get("empfangenAm") or "", "version": b.get("version") or 1, "historie": als_json(b.get("historie") or []),
	})
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)


def _monat_aktualisieren(zp, gid, monat):
	tage = K.tage_des_monats(monat)
	bl = _bloecke(gid, tage[0], tage[-1], zp)
	for m in K.monatswerte(bl):
		schluessel = f"{zp}|{gid}|{m['groesse']}|{monat}"
		name = frappe.db.get_value(DT_MONAT, {"schluessel": schluessel}, "name")
		doc = frappe.get_doc(DT_MONAT, name) if name else frappe.get_doc({"doctype": DT_MONAT, "schluessel": schluessel})
		doc.update({"zaehlpunkt": zp, "gemeinschaft": gid or None, "monat": monat, "groesse": m["groesse"], "summe_kwh": m["summeKwh"], "werte_soll": m["werteSoll"], "werte_ist": m["werteIst"], "l3": m["l3"], "anteil_l3": m["anteilL3"], "tage": m["tage"], "max_kw": m["maxKw"], "vollstaendig": 1 if m["vollstaendig"] else 0, "abrechenbar": 1 if m["abrechenbar"] else 0, "berechnet_am": jetzt_iso()})
		if doc.is_new():
			doc.insert(ignore_permissions=True)
		else:
			doc.save(ignore_permissions=True)


def _einarbeiten(gid, neu, am):
	geaendert = konflikte = 0
	betroffen = set()
	for b in neu:
		alt = _bloecke(gid, b["tag"], b["tag"], b["zaehlpunktId"], [b["groesse"]])
		r = K.bloecke_zusammenfuehren(alt[0] if alt else None, b, am)
		_block_speichern(r["block"])
		geaendert += r["geaendert"]
		konflikte += r["konflikte"]
		betroffen.add((b["zaehlpunktId"], K.monat_von(b["tag"])))
	for zp, monat in betroffen:
		_monat_aktualisieren(zp, gid, monat)
	return {"bloecke": len(neu), "tage": len({b["tag"] for b in neu}), "geaendertWerte": geaendert, "konflikte": konflikte, "hinweis": f"{konflikte} L3-Werte nicht übernommen (vorhandene L1/L2-Werte bleiben)." if konflikte else ""}


def _infos(gid, daten=None):
	daten = daten or S.gemeinschaft_daten(gid)
	zps = {z["id"]: z for z in daten["zaehlpunkte"]}
	mg = {m["id"]: m for m in daten["mitglieder"]}
	an = {a["id"]: a for a in daten["anlagen"]}
	aus = []
	for zid in sorted({t["zaehlpunktId"] for t in daten["teilnahmen"] if t["status"] in ZAEHLT + ("beendet",)}):
		z = zps.get(zid)
		if not z:
			continue
		ts = [t for t in daten["teilnahmen"] if t["zaehlpunktId"] == zid]
		aus.append({"zp": z, "teilnahmen": ts, "mitglied": mg.get(ts[0]["mitgliedId"]) if ts else None, "anlage": an.get(z.get("anlageId"))})
	return sorted(aus, key=lambda i: i["zp"]["zaehlpunktnummer"]), daten


def _aktiv_am(t, tag):
	return t["status"] in AKTIV and bool(t.get("gueltigAb")) and t["gueltigAb"] <= tag and (not t.get("gueltigBis") or t["gueltigBis"] >= tag)


def _tf_am(t, tag):
	h = sorted([x for x in t.get("tfHistorie") or [] if x.get("gueltigAb") and x["gueltigAb"] <= tag], key=lambda x: x["gueltigAb"], reverse=True)
	return float(h[0]["tf"]) if h else float(t.get("teilnahmefaktor") or 100)


def _monat_daten(g, monat, infos, daten):
	"""Wie monatsDaten im Demo-Backend: Summen je ZP/Größe, Tagesampeln, Tagessummen, eigene Zuteilung, Lieferungen."""
	h = _heute()
	tage = [t for t in K.tage_des_monats(monat) if t < h]
	if not tage:
		return {"monat": monat, "tage": [], "zp": {i["zp"]["id"]: {"groessen": {}, "ist": {}, "l3": 0, "l2": 0, "soll": 0, "tage": [], "eigen": {"eigendeckung": 0, "restueberschuss": 0}} for i in infos}, "tagesSummen": [], "lieferungen": [], "pruefVerstoesse": 0, "sozial": {"anwendbar": False}}
	alle = _bloecke(g["id"], tage[0], tage[-1])
	je_tag = {}
	for b in alle:
		je_tag.setdefault(b["tag"], {})[f"{b['zaehlpunktId']}|{b['groesse']}"] = b
	vs = (daten.get("verteilschluessel") or [])
	gueltig = sorted([v for v in vs if v.get("status") == "gueltig"], key=lambda v: v["gueltigAb"], reverse=True)
	schluessel = {p["teilnahmeId"]: p["pct"] for p in (gueltig[0]["positionen"] if gueltig else [])}
	zp = {i["zp"]["id"]: {"groessen": {}, "ist": {}, "l3": 0, "l2": 0, "soll": 0, "tage": [], "eigen": {"eigendeckung": 0.0, "restueberschuss": 0.0}} for i in infos}
	tages_summen = []
	lieferungen = []
	pruef = 0
	soz_b = soz_s = 0.0
	soz_a = False
	for tag in tage:
		d = je_tag.get(tag, {})
		summe = {"tag": tag, "erzeugungTf": 0.0, "verbrauchTf": 0.0, "eigendeckung": 0.0, "restueberschuss": 0.0, "erzeugungGemessen": 0.0, "verbrauchGemessen": 0.0}
		eds, ets, soz_v, soz_e, erz, ver = [], [], [], [], [], []
		for i in infos:
			zid = i["zp"]["id"]
			x = zp[zid]
			akt = next((t for t in i["teilnahmen"] if _aktiv_am(t, tag)), None)
			ew = _erwartet(i["zp"]["richtung"], g["modell"])
			bl = {gr: d[f"{zid}|{gr}"] for gr in ew if f"{zid}|{gr}" in d}
			if not akt and not bl:
				x["tage"].append({"tag": tag, "ampel": "keine", "gruende": []})
				continue
			amp = K.tages_ampel(tag, bl, ew, h, g["modell"], (i.get("anlage") or {}).get("kwp"))
			x["tage"].append({"tag": tag, "ampel": amp["ampel"], "gruende": amp["gruende"]})
			x["soll"] += K.werte_je_tag(tag)
			for gr, b in bl.items():
				x["groessen"][gr] = x["groessen"].get(gr, 0) + b["summeKwh"]
				x["ist"][gr] = x["ist"].get(gr, 0) + b["ist"]
				if gr == ew[0]:
					x["l3"] += b["l3"]
					x["l2"] += b["l2"]
			if ew[0] in bl:
				lieferungen.append({"zaehlpunktId": zid, "netzbetreiberId": i["zp"].get("netzbetreiberId"), "tag": tag, "empfangenAm": bl[ew[0]].get("erstEmpfangenAm") or bl[ew[0]].get("empfangenAm")})
			s = lambda gr: bl[gr]["summeKwh"] if gr in bl else 0  # noqa: E731
			summe["erzeugungTf"] += s("erzeugung_tf")
			summe["verbrauchTf"] += s("verbrauch_tf")
			summe["eigendeckung"] += s("eigendeckung")
			summe["restueberschuss"] += s("restueberschuss")
			summe["erzeugungGemessen"] += s("erzeugung_gemessen")
			summe["verbrauchGemessen"] += s("verbrauch_gemessen")
			gem = "verbrauch_gemessen" if i["zp"]["richtung"] == "verbrauch" else "erzeugung_gemessen"
			if akt and gem in bl:
				eintrag = {"id": zid, "werte": bl[gem]["werte"], "tf": _tf_am(akt, tag), "schluesselPct": schluessel.get(akt["id"], akt.get("aufteilungsschluesselPct") or 0)}
				(erz if i["zp"]["richtung"] == "erzeugung" else ver).append(eintrag)
			if "eigendeckung" in bl:
				eds.append(bl["eigendeckung"]["werte"])
				soz_v.append({"id": zid, "eigendeckung": bl["eigendeckung"]["werte"], "schutzbeduerftig": bool((i.get("mitglied") or {}).get("schutzbeduerftig"))})
			if "erzeugung_tf" in bl:
				ets.append(bl["erzeugung_tf"]["werte"])
				rest = bl["restueberschuss"]["werte"] if "restueberschuss" in bl else []
				soz_e.append({"id": zid, "erzeugungTf": bl["erzeugung_tf"]["werte"], "eingebracht": [(v or 0) - ((rest[q] if q < len(rest) else 0) or 0) for q, v in enumerate(bl["erzeugung_tf"]["werte"])], "gemeinde": (i.get("mitglied") or {}).get("art") == "gemeinde"})
		if erz or ver:
			z = K.verteilen(g.get("verteilmodell") or "dynamisch", erz, ver)
			for v in z["verbraucher"]:
				zp[v["id"]]["eigen"]["eigendeckung"] += sum(v["eigendeckung"])
			for e in z["erzeuger"]:
				zp[e["id"]]["eigen"]["restueberschuss"] += sum(e["restueberschuss"])
		pruef += K.gemeinschaft_pruefen(eds, ets)["verstoesse"]
		sq = K.sozialquote(soz_v, soz_e)
		if sq["anwendbar"]:
			soz_a = True
			soz_b += sq["basisKwh"]
			soz_s += sq["anSchutzbeduerftigeKwh"]
		tages_summen.append(summe)
	return {"monat": monat, "tage": tage, "zp": zp, "tagesSummen": tages_summen, "lieferungen": lieferungen, "pruefVerstoesse": pruef, "sozial": {"anwendbar": soz_a, "basisKwh": soz_b, "anSchutzbeduerftigeKwh": soz_s, "quotePct": (soz_s / soz_b) * 100 if soz_b > 0 else None}}


def _runde_summen(s):
	q = s["eigendeckung"] / s["verbrauchTf"] if s.get("verbrauchTf") else 0
	return {"erzeugungTfKwh": _r3(s.get("erzeugungTf", 0)), "verbrauchTfKwh": _r3(s.get("verbrauchTf", 0)), "eigendeckungKwh": _r3(s.get("eigendeckung", 0)), "restueberschussKwh": _r3(s.get("restueberschuss", 0)), "erzeugungGemessenKwh": _r3(s.get("erzeugungGemessen", 0)), "verbrauchGemessenKwh": _r3(s.get("verbrauchGemessen", 0)), "eigendeckungsquote": K.rund(q, 4)}


def _zp_name(i, k):
	return (i["zp"].get("bezeichnung") or i["zp"].get("inhaberName") or "") if SK.eg_stufe(k, "mitgliederliste") >= 1 else (i["zp"].get("bezeichnung") or "")


def _monate_bis(h, n=13):
	return [K.monat_plus(K.monat_von(h), i - n + 1) for i in range(n)]


# ================================================================ Messreihen


@frappe.whitelist(methods=["POST"])
def messreihen(filter=None, als_benutzer=None):  # noqa: A002, C901
	n = _n(als_benutzer)
	f = _daten(filter)
	h = _heute()
	von = _tag(f.get("von"), "„von“") if f.get("von") else K.plus_tag(h, -7)
	bis = _tag(f.get("bis"), "„bis“") if f.get("bis") else K.plus_tag(h, -1)
	if bis < von:
		ungueltig("„bis“ liegt vor „von“.")
	groessen = [x for x in (f.get("groessen") or []) if x in K.GROESSEN] or None
	gid = str(f.get("gemeinschaftId") or "")
	zid = str(f.get("zaehlpunktId") or "")
	if zid:
		if not gid or not frappe.db.exists(S.DT["gemeinschaft"], gid):
			nicht_gefunden("Gemeinschaft nicht gefunden.")
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gid))
		infos, daten = _infos(gid)
		k = S._kontext(n, g, daten)
		info = next((i for i in infos if i["zp"]["id"] == zid), None)
		eigen = bool(info) and any((next((m for m in daten["mitglieder"] if m["id"] == t["mitgliedId"]), {}) or {}).get("kontoId") == n.get("id") for t in info["teilnahmen"])
		if not eigen and SK.eg_stufe(k, "qh_einzeln") < 1:
			if not k["rollen"] and not k["backofficeStufe"]:
				nicht_gefunden("Gemeinschaft nicht gefunden.")
			verboten("Viertelstundenwerte einzelner Mitglieder sind zweckgebunden – Ihre Rolle sieht nur Summen der Gemeinschaft.")
		if not info:
			nicht_gefunden("Zählpunkt nicht gefunden.")
		if K.tage_zwischen(von, bis) > 62:
			ungueltig("Höchstens 62 Tage je Abfrage.")
		bloecke = _bloecke(gid, von, bis, zid, groessen)
		if not eigen:
			protokoll(None if n.get("system") else n, "eg_qh_einsicht", "eg_zaehlpunkt", zid, f"Viertelstundenwerte {info['zp']['zaehlpunktnummer']} {von}–{bis} eingesehen ({g['name']})")
		return {"gemeinschaftId": gid, "zaehlpunktId": zid, "zaehlpunktnummer": info["zp"]["zaehlpunktnummer"], "richtung": info["zp"]["richtung"], "von": von, "bis": bis, "bloecke": bloecke, "protokolliert": not eigen}
	g, k = S.zugriff(n, gid, "qh_aggregiert", 1)
	aufl = f.get("aufloesung") or "viertelstunde"
	if aufl in ("monat", "tag"):
		monate = []
		m = K.monat_von(von)
		while m <= K.monat_von(bis):
			monate.append(m)
			m = K.monat_plus(m, 1)
		if len(monate) > 25:
			ungueltig("Höchstens 25 Monate je Abfrage.")
		infos, daten = _infos(gid)
		zeilen = []
		for m in monate:
			md = _monat_daten(g, m, infos, daten)
			if aufl == "tag":
				zeilen += [{"tag": t["tag"], **_runde_summen(t)} for t in md["tagesSummen"] if von <= t["tag"] <= bis]
			else:
				s = {}
				for t in md["tagesSummen"]:
					for x in ("erzeugungTf", "verbrauchTf", "eigendeckung", "restueberschuss", "erzeugungGemessen", "verbrauchGemessen"):
						s[x] = s.get(x, 0) + t[x]
				zeilen.append({"monat": m, "tage": len(md["tagesSummen"]), **_runde_summen(s)})
		return {"gemeinschaftId": gid, "aggregiert": True, "aufloesung": aufl, "von": von, "bis": bis, "zeilen": zeilen}
	if K.tage_zwischen(von, bis) > 62:
		ungueltig("Höchstens 62 Tage je Abfrage.")
	ziel = groessen or ["erzeugung_tf", "verbrauch_tf", "eigendeckung", "restueberschuss"]
	tage = {}
	for b in _bloecke(gid, von, bis, None, ziel):
		t = tage.setdefault(b["tag"], {gr: [0.0] * K.werte_je_tag(b["tag"]) for gr in ziel})
		for i, w in enumerate(b["werte"]):
			t[b["groesse"]][i] += w or 0
	return {"gemeinschaftId": gid, "aggregiert": True, "aufloesung": "viertelstunde", "von": von, "bis": bis, "tage": [{"tag": t, "reihen": r} for t, r in sorted(tage.items())]}


# ================================================================ Eingang EDA


def energiedaten_empfangen_intern(payload):
	"""Für WP2 (Python-Jobs): Ereignis eg.energiedaten.empfangen ohne HTTP."""
	return _empfangen(S.system_nutzer(), _daten(payload))


def _empfangen(n, p):
	if not n.get("system") and not (ist_admin(n) and bo_stufe(n, "eg") >= 2):
		verboten("Energiedaten nimmt nur das System (EDA-Eingang) bzw. die Betriebsführung an.")
	mid = str(p.get("messageId") or "")
	if mid and frappe.db.exists(DT_REIHE, {"message_id": mid}):
		return {"doppelt": True, "messageId": mid, "bloecke": 0}
	gid = str(p.get("gemeinschaftId") or "")
	if not gid or not frappe.db.exists(S.DT["gemeinschaft"], gid):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	nr = str(p.get("zaehlpunktnummer") or "").replace(" ", "").upper()
	zid = frappe.db.get_value(S.DT["zaehlpunkt"], {"zaehlpunktnummer": nr}, "name")
	if not zid:
		nicht_gefunden(f"Zählpunkt {nr} ist nicht bekannt.")
	if not frappe.db.exists(S.DT["teilnahme"], {"zaehlpunkt": zid, "gemeinschaft": gid}):
		konflikt("Der Zählpunkt nimmt an dieser Gemeinschaft nicht teil.")
	am = jetzt_iso()
	neu = _fach(K.payload_zerlegen, p, zid, gid, am)
	r = _einarbeiten(gid, neu, am)
	r.update({"messageId": mid, "zaehlpunktId": zid})
	return r


@frappe.whitelist(methods=["POST"])
def energiedaten_empfangen(payload=None, als_benutzer=None):
	return _empfangen(_n(als_benutzer), _daten(payload))


# ================================================================ Periodenwerte (Eingang WP4)


@frappe.whitelist(methods=["POST"])
def periodenwerte(gemeinschaftId=None, von=None, bis=None, als_benutzer=None):  # noqa: N803, C901
	n = _n(als_benutzer)
	von = _tag(von, "„von“")
	bis = _tag(bis, "„bis“")
	if bis < von:
		ungueltig("„bis“ liegt vor „von“.")
	if K.tage_zwischen(von, bis) > 400:
		ungueltig("Höchstens 400 Tage je Periode.")
	if n.get("system"):
		if not frappe.db.exists(S.DT["gemeinschaft"], gemeinschaftId or ""):
			nicht_gefunden("Gemeinschaft nicht gefunden.")
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gemeinschaftId))
	else:
		g, _k = S.zugriff(n, gemeinschaftId, "abrechnung_vorschau", 1)
	infos, daten = _infos(g["id"])
	tarife = daten.get("tarife") or []
	je = {}
	for b in _bloecke(g["id"], von, bis):
		je.setdefault(b["tag"], {})[f"{b['zaehlpunktId']}|{b['groesse']}"] = b
	acc = {i["zp"]["id"]: {"groessen": {}, "fenster": {}, "tarif": {}, "l3": 0, "soll": 0, "fehlend": 0, "aktivTage": 0} for i in infos}

	def add(o, k, gr, w):
		o.setdefault(k, {})
		o[k][gr] = o[k].get(gr, 0) + w

	tag = von
	while tag <= bis:
		d = je.get(tag, {})
		t = SK.tarif_am(tarife, tag)
		for i in infos:
			if not any(_aktiv_am(tt, tag) for tt in i["teilnahmen"]):
				continue
			x = acc[i["zp"]["id"]]
			x["aktivTage"] += 1
			ew = _erwartet(i["zp"]["richtung"], g["modell"])
			x["soll"] += K.werte_je_tag(tag) * len(ew)
			for gr in ew:
				b = d.get(f"{i['zp']['id']}|{gr}")
				if not b:
					x["fehlend"] += K.werte_je_tag(tag)
					continue
				x["groessen"][gr] = x["groessen"].get(gr, 0) + b["summeKwh"]
				x["fehlend"] += b["fehlend"]
				x["l3"] += b["l3"]
				if not t:
					continue
				x["tarif"].setdefault(t["id"], {})
				if t.get("zeitfenster"):
					beginn = K.tag_beginn_ms(tag)
					for q, w in enumerate(b["werte"]):
						if w is None:
							continue
						zf = SK.preis_fuer(t, K.lokal_zeit(beginn + q * K.QH_MS), i["teilnahmen"][0]["mitgliedId"]).get("zeitfenster") or ""
						add(x["fenster"], zf, gr, w)
						add(x["tarif"][t["id"]], zf, gr, w)
				else:
					add(x["fenster"], "", gr, b["summeKwh"])
					add(x["tarif"][t["id"]], "", gr, b["summeKwh"])
		tag = K.plus_tag(tag)
	zps = []
	for i in infos:
		x = acc[i["zp"]["id"]]
		if not x["aktivTage"]:
			continue
		tn = next((t for t in i["teilnahmen"] if t.get("gueltigAb") and t["gueltigAb"] <= bis and (not t.get("gueltigBis") or t["gueltigBis"] >= von)), i["teilnahmen"][0])
		zps.append({"zaehlpunktId": i["zp"]["id"], "zaehlpunktnummer": i["zp"]["zaehlpunktnummer"], "richtung": i["zp"]["richtung"], "teilnahmeId": tn.get("id"), "mitgliedId": tn.get("mitgliedId"), "groessen": x["groessen"], "groessenJeZeitfenster": x["fenster"], "groessenJeTarif": x["tarif"], "vollstaendig": x["fehlend"] == 0, "fehlendeWerte": x["fehlend"], "l3Werte": x["l3"], "anteilL3": x["l3"] / x["soll"] if x["soll"] else 0, "abrechenbar": x["fehlend"] == 0 and x["l3"] == 0, "aktivTage": x["aktivTage"]})
	summe = lambda gr: sum(z["groessen"].get(gr, 0) for z in zps)  # noqa: E731
	abr = all(z["abrechenbar"] for z in zps)
	return {"gemeinschaftId": g["id"], "von": von, "bis": bis, "quelle": "netzbetreiber", "zaehlpunkte": zps, "summen": {"eigendeckungKwh": summe("eigendeckung"), "erzeugungTfKwh": summe("erzeugung_tf"), "restueberschussKwh": summe("restueberschuss"), "verbrauchTfKwh": summe("verbrauch_tf")}, "vollstaendig": all(z["vollstaendig"] for z in zps), "abrechenbar": abr, "hinweis": "" if abr else "Nicht alle Werte sind abrechenbar (Lücken bzw. L3) – Abrechnung frühestens nach Ersatz durch L1/L2 (HA II 13.1)."}


# ================================================================ Qualität, Reklamation, Abweichungsbericht


def _reklamieren(n, gid, r):
	g, _k = S.zugriff(n, gid, "eda_ausloesen", 2)
	von = _tag(r.get("von"), "„von“")
	bis = _tag(r.get("bis"), "„bis“")
	infos, _daten_ = _infos(gid)
	info = next((i for i in infos if i["zp"]["id"] == r.get("zaehlpunktId")), None)
	if not info:
		nicht_gefunden("Zählpunkt nicht gefunden.")
	status, prozess, hinweis = "gestellt", "", ""
	try:
		from oekoinvest_app.plattform.api import eg_eda  # WP2

		erg = eg_eda.nachforderung_intern(n, {"zaehlpunktId": info["zp"]["id"], "von": von, "bis": bis}) if hasattr(eg_eda, "nachforderung_intern") else None
		if erg is None:
			raise ImportError
		prozess = (erg.get("prozess") or {}).get("id") or erg.get("id") or ""
	except ImportError:
		status, hinweis = "vorgemerkt", "EDA-Nachforderung (CR_REQ_PT) ist noch nicht angebunden – Reklamation vorgemerkt."
	gruende = [str(x)[:200] for x in (r.get("gruende") or [])][:10]
	text = K.reklamations_text(info["zp"]["zaehlpunktnummer"], von, bis, "", g["name"], g.get("gemeinschaftsId") or "", gruende)
	rek = {"id": neue_id(DT_REIHE), "gemeinschaftId": gid, "zaehlpunktId": info["zp"]["id"], "von": von, "bis": bis, "status": status, "edaProzessId": prozess, "text": text, "am": jetzt_iso(), "vonKonto": None if n.get("system") else n.get("id"), "fristBis": K.plus_tag(_heute(), K.QUALITAET_REGELN["reklamationFristTage"])}
	protokoll(None if n.get("system") else n, "eg_reklamation", "eg_zaehlpunkt", info["zp"]["id"], f"Energiedaten reklamiert {info['zp']['zaehlpunktnummer']} {von}–{bis} ({status}) · {json.dumps(rek, ensure_ascii=False)[:180]}")
	return {"reklamation": rek, "hinweis": hinweis}


def _gestellte(gid):
	aus = []
	for x in frappe.get_all("Plattform Aktivitaet", filters={"aktion": "eg_reklamation", "objekt_art": "eg_zaehlpunkt"}, fields=["objekt_id", "text", "am"], limit_page_length=1000):
		try:
			rek = json.loads(x.text.split(" · ", 1)[1]) if " · " in (x.text or "") else None
		except ValueError:
			rek = None
		if rek and rek.get("gemeinschaftId") == gid:
			aus.append(rek)
	return aus


@frappe.whitelist(methods=["POST"])
def qualitaet(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	if d.get("reklamation"):
		return _reklamieren(n, gemeinschaftId, _daten(d["reklamation"]))
	g, k = S.zugriff(n, gemeinschaftId, "qh_aggregiert", 1)
	h = _heute()
	m = d.get("monat") if K.gueltiger_tag(f"{d.get('monat')}-01") else K.monat_von(K.plus_tag(h, -1))
	infos, daten_ = _infos(g["id"])
	md = _monat_daten(g, m, infos, daten_)
	zeilen = []
	for i in infos:
		x = md["zp"][i["zp"]["id"]]
		z = {"zaehlpunktId": i["zp"]["id"], "zaehlpunktnummer": i["zp"]["zaehlpunktnummer"], "name": _zp_name(i, k), "richtung": i["zp"]["richtung"], "netzbetreiberId": i["zp"].get("netzbetreiberId"), "tage": x["tage"], "l3": x["l3"], "l2": x["l2"], "vollstaendig": x["soll"] > 0 and all(v == x["soll"] for v in x["ist"].values())}
		if any(t["ampel"] != "keine" for t in z["tage"]):
			zeilen.append(z)
	gest = _gestellte(g["id"])
	rek = []
	for f in K.reklamations_faelle(zeilen, h):
		s = next((r for r in gest if r["zaehlpunktId"] == f["zaehlpunktId"] and r["von"] <= f["bis"] and r["bis"] >= f["von"]), None)
		z = next((x for x in zeilen if x["zaehlpunktId"] == f["zaehlpunktId"]), {})
		rek.append({**f, "zaehlpunktnummer": z.get("zaehlpunktnummer"), "name": z.get("name"), "status": (s or {}).get("status") or "offen", "reklamationId": (s or {}).get("id"), "gestelltAm": (s or {}).get("am") or "", "edaProzessId": (s or {}).get("edaProzessId") or ""})
	lief = list(md["lieferungen"])
	for i in (-2, -1):
		lief += _monat_daten(g, K.monat_plus(m, i), infos, daten_)["lieferungen"]
	nb = {x["id"]: x.get("kurzname") or x.get("name") for x in S._netzbetreiber_liste()}
	monate = []
	for mm in _monate_bis(h):
		s = K.qualitaets_zusammenfassung([{"tage": x["tage"]} for x in _monat_daten(g, mm, infos, daten_)["zp"].values()])
		monate.append({"monat": mm, "ampel": s["ampel"], "quoteOk": K.rund(s["quoteOk"], 4), "zaehler": s["zaehler"], "tage": s["tage"]})
	return {
		"gemeinschaftId": g["id"], "monat": m, "tage": md["tage"], "zeilen": zeilen, "zusammenfassung": K.qualitaets_zusammenfassung(zeilen), "reklamationen": rek,
		"lieferstatistik": [{**x, "netzbetreiber": nb.get(x["netzbetreiberId"], x["netzbetreiberId"]), "mittelTage": K.rund(x["mittelTage"], 1), "verspaetetPct": K.rund(x["verspaetetPct"], 1)} for x in K.lieferstatistik(lief)],
		"gemeinschaftPruefung": {"verstoesse": md["pruefVerstoesse"], "text": f"{md['pruefVerstoesse']} Viertelstunden mit Σ Eigendeckung über Σ Erzeugung × TF" if md["pruefVerstoesse"] else "Σ Eigendeckung ≤ Σ Erzeugung × TF in jeder Viertelstunde"},
		"monate": monate, "ampel": K.AMPEL, "regeln": K.QUALITAET_REGELN,
		"rechte": {"reklamieren": SK.eg_stufe(k, "eda_ausloesen") >= 2, "einzeln": SK.eg_stufe(k, "qh_einzeln") >= 1, "importieren": SK.eg_stufe(k, "stammdaten") >= 2},
	}


@frappe.whitelist(methods=["POST"])
def abweichungsbericht(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	g, k = S.zugriff(n, gemeinschaftId, "qh_aggregiert", 1)
	h = _heute()
	m = d.get("monat") if K.gueltiger_tag(f"{d.get('monat')}-01") else K.monat_von(K.plus_tag(h, -1))
	infos, daten_ = _infos(g["id"])
	md = _monat_daten(g, m, infos, daten_)
	posten = []
	for i in infos:
		x = md["zp"][i["zp"]["id"]]
		if not x["groessen"]:
			continue
		verbr = i["zp"]["richtung"] == "verbrauch"
		gr = "eigendeckung" if verbr else "restueberschuss"
		posten.append({"zaehlpunktId": i["zp"]["id"], "zaehlpunktnummer": i["zp"]["zaehlpunktnummer"], "name": _zp_name(i, k), "richtung": i["zp"]["richtung"], "groesse": gr, "eigenKwh": x["eigen"][gr], "nbKwh": x["groessen"].get(gr, 0)})
	tp = max(0, min(10, float(d.get("toleranzPct") or 0.5)))
	tk = max(0, min(100, float(d.get("toleranzKwh") or 0.1)))
	b = K.nb_abgleich(posten, tp, tk)
	sz = md["sozial"]
	return {
		"gemeinschaftId": g["id"], "monat": m,
		"zeilen": [{**z, "eigenKwh": _r3(z["eigenKwh"]), "nbKwh": _r3(z["nbKwh"]), "abweichungKwh": _r3(z["abweichungKwh"]), "abweichungPct": K.rund(z["abweichungPct"], 2), "grenzeKwh": _r3(z["grenzeKwh"])} for z in b["zeilen"]],
		"summeEigenKwh": _r3(b["summeEigenKwh"]), "summeNbKwh": _r3(b["summeNbKwh"]), "abweichungKwh": _r3(b["abweichungKwh"]), "klaerfaelle": b["klaerfaelle"], "toleranzPct": tp, "toleranzKwh": tk, "verteilmodell": g.get("verteilmodell"),
		"sozialquote": {"anwendbar": True, "basisKwh": _r3(sz["basisKwh"]), "anSchutzbeduerftigeKwh": _r3(sz["anSchutzbeduerftigeKwh"]), "quotePct": None if sz["quotePct"] is None else K.rund(sz["quotePct"], 2), "zielPct": 10, "erfuellt": (sz["quotePct"] or 0) >= 10} if sz.get("anwendbar") else {"anwendbar": False},
		"hinweis": "Eigene Zuteilung aus den gemessenen Werten und den Teilnahmefaktoren (Fachkonzept 4.2/4.3) gegen die Werte des Netzbetreibers. Maßgeblich bleiben die Werte des Netzbetreibers (ElWG § 71); über der Toleranz entsteht ein Klärfall.",
	}


# ================================================================ CSV-/Excel-Import


@frappe.whitelist(methods=["POST"])
def csv_import(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	ausfuehren = d.get("ausfuehren", True) is not False
	g, _k = S.zugriff(n, gemeinschaftId, "stammdaten", 2 if ausfuehren else 1)
	csv = str(d.get("csv") or "")
	if len(csv) > 6 * 1024 * 1024:
		ungueltig("Datei zu groß (höchstens 6 MB).")
	erg = _fach(K.csv_parsen, csv)
	infos, _d = _infos(g["id"])
	zid = d.get("zaehlpunktId") or ""
	info = next((i for i in infos if (i["zp"]["id"] == zid if zid else i["zp"]["zaehlpunktnummer"] == erg["zaehlpunktnummer"])), None)
	if not info:
		ungueltig(f"Zählpunkt {erg['zaehlpunktnummer']} nimmt an dieser Gemeinschaft nicht teil." if erg["zaehlpunktnummer"] and not zid else "Bitte den Zählpunkt auswählen (die Datei enthält keine Zählpunktnummer).")
	if erg["zaehlpunktnummer"] and erg["zaehlpunktnummer"] != info["zp"]["zaehlpunktnummer"]:
		ungueltig(f"Die Datei gehört zu {erg['zaehlpunktnummer']}, ausgewählt ist {info['zp']['zaehlpunktnummer']}.")
	richtung = info["zp"]["richtung"]
	reihen = [r for r in erg["reihen"] if K.MESS_GROESSEN[r["groesse"]]["richtung"] == richtung]
	falsch = [r for r in erg["reihen"] if K.MESS_GROESSEN[r["groesse"]]["richtung"] != richtung]
	if not reihen:
		ungueltig(f"Keine Spalte passt zur Richtung des Zählpunkts ({richtung}).")
	am = jetzt_iso()
	bloecke = _fach(K.csv_zu_bloecken, {**erg, "reihen": reihen}, info["zp"]["id"], g["id"], str(d.get("datei") or "")[:120], am)
	vorschau = {
		"zaehlpunktId": info["zp"]["id"], "zaehlpunktnummer": info["zp"]["zaehlpunktnummer"], "zeilen": erg["zeilen"], "von": erg["von"], "bis": erg["bis"], "tage": len({b["tag"] for b in bloecke}),
		"reihen": [{"groesse": r["groesse"], "label": K.MESS_GROESSEN[r["groesse"]]["label"], "einheit": r["einheit"], "werte": len(r["punkte"]), "summeKwh": _r3(sum(p["wert"] for p in r["punkte"]))} for r in reihen],
		"fehler": erg["fehler"], "fehlerAnzahl": erg["fehlerAnzahl"], "hinweise": erg["hinweise"] + ([f"Spalten der anderen Richtung ignoriert: {', '.join(K.MESS_GROESSEN[r['groesse']]['label'] for r in falsch)}."] if falsch else []),
		"unvollstaendigeTage": sorted({b["tag"] for b in bloecke if not b["vollstaendig"]})[:31],
	}
	if not ausfuehren:
		return {"vorschau": vorschau, "ausgefuehrt": False}
	r = _einarbeiten(g["id"], bloecke, am)
	protokoll(None if n.get("system") else n, "eg_energie_import", "eg_zaehlpunkt", info["zp"]["id"], f"CSV-Import {info['zp']['zaehlpunktnummer']}: {vorschau['tage']} Tage, {erg['zeilen']} Zeilen")
	return {"vorschau": vorschau, "ausgefuehrt": True, "ergebnis": r}


# ================================================================ Simulation


def _sim_recht(n, gid, speichern):
	if gid:
		return S.zugriff(n, gid, "stammdaten", 1)[0]
	if not n.get("system") and not (ist_admin(n) and bo_stufe(n, "eg") >= 1):
		verboten("Simulationen ohne Gemeinschaft stehen der Gründungsberatung (Backoffice) zur Verfügung.")
	if speichern and not n.get("system") and bo_stufe(n, "eg") < 2:
		verboten("Ihre Backoffice-Rolle erlaubt kein Speichern.")
	return None


def _netz_parameter(modell, zonelevel, netzebene, stichtag):
	r = SK.netzentgelt_regel(stichtag, modell, zonelevel, netzebene)
	return {"reduktionPct": r["reduktionPct"], "abgabenBefreit": r["abgabenBefreit"], "quelle": r["quelle"], "status": r["status"], "regel": r["regel"]}


def _varianten(stichtag, netzebene):
	aus = []
	for vid, label, modell, z in (("eeg3", "EEG lokal (Zonelevel 3)", "eeg", 3), ("eeg4", "EEG regional (Zonelevel 4)", "eeg", 4), ("beg6", "BEG ohne Nahebereich (Zonelevel 6)", "beg", 6), ("gea1", "GEA / Hauptleitung (Zonelevel 1)", "gea", 1)):
		p = _netz_parameter(modell, z, 7 if z == 1 else netzebene, stichtag)
		nur = {"gea1": "Nur im selben Gebäude bzw. an derselben Hauptleitung möglich. ", "eeg3": "Alle Teilnehmer an derselben Trafostation. ", "eeg4": "Alle Teilnehmer am selben Umspannwerk. "}.get(vid, "")
		aus.append({"id": vid, "label": label, "reduktionPct": p["reduktionPct"], "abgabenBefreit": p["abgabenBefreit"], "hinweis": f"{nur}{p['quelle']}{' (Platzhalter, zu bestätigen)' if p['status'] == 'platzhalter' else ''}"})
	return aus


def _vorlage(g):
	h = _heute()
	infos, daten = _infos(g["id"])
	jahr = {}
	for m in _monate_bis(h, 12):
		for x in frappe.get_all(DT_MONAT, filters={"gemeinschaft": g["id"], "monat": m, "groesse": "verbrauch_gemessen"}, fields=["zaehlpunkt", "summe_kwh"]):
			jahr[x.zaehlpunkt] = jahr.get(x.zaehlpunkt, 0) + (x.summe_kwh or 0)
	tarif = SK.tarif_am(daten.get("tarife") or [], h)
	profil = lambda art, bez: "G1" if any(w in (bez or "").lower() for w in ("schule", "amt")) else ("BAND" if "kläranlage" in (bez or "").lower() else {"privat": "H0", "landwirt": "L0", "kmu": "G0", "gemeinde": "G1"}.get(art, "H0"))  # noqa: E731
	tn, genutzt = [], set()
	aktiv = [i for i in infos if any(t["status"] != "beendet" for t in i["teilnahmen"])]
	for i in [x for x in aktiv if x["zp"]["richtung"] == "verbrauch"]:
		m = i.get("mitglied") or {}
		pv = next((x for x in aktiv if x["zp"]["richtung"] == "erzeugung" and x.get("anlage") and (x.get("mitglied") or {}).get("id") == m.get("id") and x["zp"]["id"] not in genutzt and x["anlage"].get("nutzungsmodell") != "volleinspeisung"), None)
		if pv:
			genutzt.add(pv["zp"]["id"])
		person = m.get("person") or {}
		tn.append({"id": i["zp"]["id"], "name": i["zp"].get("bezeichnung") or person.get("firma") or f"{person.get('vorname', '')} {person.get('nachname', '')}".strip(), "art": m.get("art") or "privat", "profil": profil(m.get("art"), i["zp"].get("bezeichnung")), "jahresverbrauchKwh": round(jahr.get(i["zp"]["id"], 0)) or None, "tf": i["teilnahmen"][0].get("teilnahmefaktor") or 100, "schutzbeduerftig": bool(m.get("schutzbeduerftig")), "pvKwp": (pv["anlage"].get("kwp") or 0) if pv else 0, "pvAusrichtung": (pv["anlage"].get("ausrichtung") or 0) if pv else 0, "pvNeigung": (pv["anlage"].get("neigung") or 30) if pv else 30, "tfErzeugung": pv["teilnahmen"][0].get("teilnahmefaktor") or 100 if pv else 100})
	anlagen = [{"id": i["anlage"]["id"], "name": i["anlage"].get("bezeichnung"), "kwp": i["anlage"].get("kwp") or i["anlage"].get("engpassleistungKw") or 0, "ausrichtung": i["anlage"].get("ausrichtung") or 0, "neigung": i["anlage"].get("neigung") or 30, "tf": i["teilnahmen"][0].get("teilnahmefaktor") or 100, "gemeinde": (i.get("mitglied") or {}).get("art") == "gemeinde"} for i in aktiv if i["zp"]["richtung"] == "erzeugung" and i.get("anlage") and i["zp"]["id"] not in genutzt]
	st = next(((a.get("standort") or {}) for a in daten["anlagen"] if (a.get("standort") or {}).get("lat")), {"lat": 48.2, "lon": 13.5})
	preise = dict(K.SIM_STANDARD)
	if tarif:
		preise.update({"bezugCt": tarif.get("bezugspreisCt"), "einspeisCt": tarif.get("einspeisepreisCt"), "mitgliedsbeitragEur": tarif.get("mitgliedsbeitragJahr") or 0})
	return {"titel": f"{g['name']} – Simulation", "gemeinschaftId": g["id"], "modell": g["modell"], "zonelevel": g["zonelevel"], "verteilmodell": g.get("verteilmodell"), "ustStatus": g.get("ustStatus"), "standort": {"lat": st.get("lat"), "lon": st.get("lon")}, "preise": preise, "teilnehmer": tn, "anlagen": anlagen, "saat": K.simulation_saat(g["id"]), "hinweis": "Jahresverbrauch aus den Netzbetreiber-Werten der letzten 12 Monate (bei Prosumern Netzbezug nach Eigenverbrauch)."}


@frappe.whitelist(methods=["POST"])
def simulation(daten=None, als_benutzer=None):
	n = _n(als_benutzer)
	d = _daten(daten)
	gid = str(d.get("gemeinschaftId") or "")
	g = _sim_recht(n, gid, bool(d.get("speichern")))
	if d.get("nurVorlage"):
		if not g:
			ungueltig("Vorlage nur aus einer Gemeinschaft.")
		return {"vorlage": _vorlage(g)}
	h = _heute()
	stichtag = d.get("stichtag") if K.gueltiger_tag(d.get("stichtag")) else h
	modell = str(d.get("modell") or (g or {}).get("modell") or "eeg")
	zonelevel = int(d.get("zonelevel") or (g or {}).get("zonelevel") or 3)
	netzebene = int(d.get("netzebene") or 7)
	netz = d["netz"] if isinstance(d.get("netz"), dict) and d["netz"].get("reduktionPct") not in (None, "") else _netz_parameter(modell, zonelevel, netzebene, stichtag)
	eingabe = {**d, "modell": modell, "zonelevel": zonelevel, "netz": netz, "varianten": _varianten(stichtag, netzebene), "sensitivitaet": d.get("sensitivitaet") or {"haushalte": [5, 10]}, "saat": d.get("saat") or K.simulation_saat(gid or d.get("titel") or "sim")}
	erg = _fach(K.simulation_rechnen, eingabe)
	erg["stichtag"] = stichtag
	erg["netzRegel"] = netz
	if d.get("speichern"):
		kz = erg["kennzahlen"]
		doc = frappe.get_doc({
			"doctype": DT_SIM, "titel": erg["eingabe"]["titel"], "gemeinschaft": (g or {}).get("id"), "konto": None if n.get("system") else n.get("id"), "stichtag": stichtag, "status": "gespeichert",
			"teilnehmer": kz["teilnehmer"], "erzeugungsleistung_kw": kz["erzeugungsleistungKw"], "eigendeckungsquote": kz["eigendeckungsquote"], "nutzungsgrad": kz["nutzungsgrad"], "vorteil_eur": kz["vorteilEur"],
			"kennzahlen": als_json(kz), "eingabe": als_json({**erg["eingabe"], "teilnehmer": [{**t, "lastgang": None} for t in erg["eingabe"]["teilnehmer"]]}),
			"ergebnis": als_json({x: erg[x] for x in ("monate", "teilnehmer", "anlagen", "varianten", "hinweise", "speicher", "sensitivitaet", "typischerTag")}),
		})
		doc.insert(ignore_permissions=True)
		protokoll(None if n.get("system") else n, "eg_simulation", "eg_simulation", doc.name, f"Simulation „{doc.titel}“ gespeichert")
		erg["id"] = doc.name
	return erg


@frappe.whitelist(methods=["POST"])
def simulationen(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g = _sim_recht(n, gemeinschaftId, False)
	f = {"gemeinschaft": g["id"]} if g else {}
	aus = []
	for x in frappe.get_all(DT_SIM, filters=f, fields=["name", "titel", "gemeinschaft", "stichtag", "kennzahlen", "creation", "status", "teilnehmer", "ergebnis", "eingabe"], order_by="creation desc", limit_page_length=200):
		aus.append({"id": x.name, "titel": x.titel, "gemeinschaftId": x.gemeinschaft, "gemeinschaft": frappe.db.get_value(S.DT["gemeinschaft"], x.gemeinschaft, "titel") if x.gemeinschaft else "", "stichtag": str(x.stichtag or ""), "kennzahlen": aus_json(x.kennzahlen, {}), "erstelltAm": str(x.creation), "status": x.status, "teilnehmer": x.teilnehmer, "ergebnis": aus_json(x.ergebnis, {}), "eingabe": aus_json(x.eingabe, {})})
	return {"simulationen": aus}


# ================================================================ Prognose


def _auf96(w):
	if len(w) == 96:
		return w
	if len(w) == 92:
		return w[:8] + [0, 0, 0, 0] + w[8:]
	return w[:12] + w[16:]


@frappe.whitelist(methods=["POST"])
def prognose(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	if not gemeinschaftId or not frappe.db.exists(S.DT["gemeinschaft"], gemeinschaftId):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gemeinschaftId))
	infos, daten_ = _infos(g["id"])
	k = S._kontext(n, g, daten_)
	if SK.eg_stufe(k, "qh_aggregiert") < 1 and SK.eg_stufe(k, "eigene_daten") < 1:
		if not k["rollen"] and not k["backofficeStufe"]:
			nicht_gefunden("Gemeinschaft nicht gefunden.")
		verboten("Ihre Rolle erlaubt diese Ansicht nicht.")
	h = _heute()
	hist = {}
	for b in _bloecke(g["id"], K.plus_tag(h, -35), K.plus_tag(h, -1), None, ["erzeugung_tf", "verbrauch_tf"]):
		t = hist.setdefault(b["tag"], {"tag": b["tag"], "erzeugung": [0.0] * 96, "verbrauch": [0.0] * 96})
		ziel = t["erzeugung"] if b["groesse"] == "erzeugung_tf" else t["verbrauch"]
		for q, w in enumerate(_auf96([x or 0 for x in b["werte"]])):
			ziel[q] += w
	gestern = K.plus_tag(h, -1)
	anlagen = [{"kwp": i["anlage"].get("kwp") or i["anlage"].get("engpassleistungKw") or 0, "ausrichtung": i["anlage"].get("ausrichtung") or 0, "neigung": i["anlage"].get("neigung") or 30} for i in infos if i["zp"]["richtung"] == "erzeugung" and i.get("anlage") and any(_aktiv_am(t, gestern) for t in i["teilnahmen"])]
	st = next(((a.get("standort") or {}) for a in daten_["anlagen"] if (a.get("standort") or {}).get("lat")), {"lat": 48.2, "lon": 13.5})
	tage = max(1, min(7, int(d.get("tage") or 7)))
	p = K.prognose(h, sorted(hist.values(), key=lambda x: x["tag"]), anlagen, {"lat": st.get("lat"), "lon": st.get("lon")}, tage, (d.get("wetter") or [])[:7])
	return {"gemeinschaftId": g["id"], **p}


# ================================================================ Mehrfachteilnahme-Optimierer


@frappe.whitelist(methods=["POST"])
def optimierung(zaehlpunktId=None, als_benutzer=None):  # noqa: N803, C901
	n = _n(als_benutzer)
	if not zaehlpunktId or not frappe.db.exists(S.DT["zaehlpunkt"], zaehlpunktId):
		nicht_gefunden("Zählpunkt nicht gefunden.")
	z = S.aus_doc("zaehlpunkt", frappe.get_doc(S.DT["zaehlpunkt"], zaehlpunktId))
	tns = [t for t in S._alle("teilnahme", {"zaehlpunkt": zaehlpunktId}) if t["status"] in ZAEHLT]
	if not tns:
		nicht_gefunden("Zählpunkt nicht gefunden.")
	gem = {}
	eigen = False
	berechtigt = bool(n.get("system"))
	for t in tns:
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], t["gemeinschaftId"]))
		infos, daten = _infos(g["id"])
		gem[g["id"]] = (g, infos, daten)
		m = next((x for x in daten["mitglieder"] if x["id"] == t["mitgliedId"]), {})
		if m.get("kontoId") == n.get("id"):
			eigen = True
		if SK.eg_stufe(S._kontext(n, g, daten), "qh_einzeln") >= 1:
			berechtigt = True
	if not (berechtigt or eigen):
		nicht_gefunden("Zählpunkt nicht gefunden.")
	h = _heute()
	alle = []
	d = f"{K.monat_plus(K.monat_von(h), -12)}-01"
	while d < f"{K.monat_von(h)}-01":
		alle.append(d)
		d = K.plus_tag(d)
	stich = K.repraesentative_tage(alle)
	richtung = z["richtung"]
	mess = "verbrauch_gemessen" if richtung == "verbrauch" else "erzeugung_gemessen"
	werte = []
	gemessen = 0
	for tag in stich["tage"]:
		reihe = None
		for t in tns:
			bl = _bloecke(t["gemeinschaftId"], tag, tag, zaehlpunktId, [mess])
			if bl:
				reihe = _auf96([x or 0 for x in bl[0]["werte"]])
				break
		if reihe:
			gemessen += 1
		werte += reihe or [0.0] * 96
	kandidaten = []
	for t in tns:
		g, infos, daten = gem[t["gemeinschaftId"]]
		tarif = SK.tarif_am(daten.get("tarife") or [], h)
		regel = SK.netzentgelt_regel(h, g["modell"], g["zonelevel"], z.get("netzebene") or 7)
		bezug = (tarif or {}).get("bezugspreisCt") or K.SIM_STANDARD["bezugCt"]
		einspeis = (tarif or {}).get("einspeisepreisCt") or K.SIM_STANDARD["einspeisCt"]
		st = K.SIM_STANDARD
		vorteil = (st["lieferantCt"] - bezug + (st["netzApCt"] - K.ap_reduziert(st["netzApCt"], regel["reduktionPct"])) + (st["elAbgSonstCt"] if regel["abgabenBefreit"] else 0)) if richtung == "verbrauch" else einspeis - st["marktwertCt"]
		E1, D1 = [], []
		for tag in stich["tage"]:
			e = [0.0] * 96
			dd = [0.0] * 96
			for b in _bloecke(g["id"], tag, tag, None, ["erzeugung_tf", "verbrauch_tf"]):
				if b["zaehlpunktId"] == zaehlpunktId:
					continue
				ziel = e if b["groesse"] == "erzeugung_tf" else dd
				for q, w in enumerate(_auf96([x or 0 for x in b["werte"]])):
					ziel[q] += w
			E1 += e
			D1 += dd
		kandidaten.append({"gemeinschaftId": g["id"], "label": g["name"], "vorteilCtKwh": K.rund(vorteil, 2), "erzeugung": E1, "verbrauch": D1, "aktuellTf": t.get("teilnahmefaktor"), "status": t["status"], "tarif": (tarif or {}).get("bezeichnung") or "Standardannahme (kein gültiger Tarif)", "netz": regel["text"]})
	erg = _fach(K.tf_optimieren, richtung, werte, kandidaten, stich["hochrechnung"])
	for e in erg["empfehlung"]:
		k = next(c for c in kandidaten if c["gemeinschaftId"] == e["gemeinschaftId"])
		e.update({"status": k["status"], "datenbasis": "Messwerte des Netzbetreibers" if any(k["verbrauch"]) or any(k["erzeugung"]) else "keine Messwerte der übrigen Teilnehmer", "tarif": k["tarif"], "netz": k["netz"]})
	n_tage = len(stich["tage"])
	return {"zaehlpunktId": zaehlpunktId, "zaehlpunktnummer": z["zaehlpunktnummer"], "richtung": richtung, "datenbasis": "Messwerte (repräsentative Wochen je Monat)" if gemessen == n_tage else ("teilweise Messwerte" if gemessen else "keine Messwerte"), "stichprobeTage": n_tage, "hochrechnung": K.rund(stich["hochrechnung"], 3), **erg, "eigen": eigen}

