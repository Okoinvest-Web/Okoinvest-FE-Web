# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP4 „Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung“ – Frappe-API (Vertrag: docs/EG-SCHNITTSTELLEN.md,
# Abschnitt 4; Referenz: src/lib/plattform/backend/demo/eg-abrechnung.js). Regeln: plattform/eg_abrechnung_kern.py (= eg/*.js).
#
# Rechte: jede Methode prüft den Aufrufer (kern.nutzer) UND die Kontext-Rolle je Gemeinschaft (eg_stamm_kern.eg_rollen/eg_stufe):
#   abrechnung_vorschau ≥ 1 sehen; anlegen/berechnen zusätzlich Kassier, Vorstand oder Organisator; Freigabe Vier-Augen
#   (abrechnung_freigabe_1 Kassier + abrechnung_freigabe_2 Vorstand, verschiedene Konten, gebunden an den Fingerabdruck);
#   Versand abrechnung_versand 2; Zahlungen/Mahnungen sepa 2 (Zahlungsdatei erst nach Freigabe durch eine zweite Person);
#   Buchhaltung buchhaltung ≥ 1 (schreiben 2), Prüfvermerk buchhaltung_pruefen 2; Mitglieder nur eigene, versendete Belege.
# Ohne Rolle → 404, ohne Recht → 403. Energiedaten liest WP4 über api/eg_energie.periodenwerte (Systemkonto, nach eigener
# Rechteprüfung). Nummern vergibt die Freigabe unter Zeilensperre der Einstellung (lückenlos je Gemeinschaft und Jahr).

import json

import frappe
from frappe.utils import nowdate

from oekoinvest_app.plattform import eg_abrechnung_kern as K
from oekoinvest_app.plattform import eg_stamm_kern as SK
from oekoinvest_app.plattform.api import eg_stamm as S
from oekoinvest_app.plattform.kern import aus_json, jetzt_iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten, api_pruefen
from oekoinvest_app.plattform.mitglied_kern import iban_maskiert

DT = {"periode": "Plattform EG Periode", "beleg": "Plattform EG Beleg", "zahlung": "Plattform EG Zahlung", "buchung": "Plattform EG Buchung", "einstellung": "Plattform EG Abrechnung Einstellung"}
TYP_LABEL = {"rechnung": "Rechnung", "gutschrift": "Gutschrift", "storno": "Stornobeleg", "schlussrechnung": "Schlussrechnung"}
STATUS_LABEL = {"entwurf": "Entwurf", "final": "Freigegeben", "versendet": "Versendet", "teilbezahlt": "Teilbezahlt", "bezahlt": "Bezahlt", "gemahnt": "Gemahnt", "storniert": "Storniert"}


def _daten(x):
	if isinstance(x, str):
		try:
			x = json.loads(x or "{}")
		except ValueError:
			x = {}
	return x if isinstance(x, dict) else {}


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except ValueError as e:
		ungueltig(str(e))


def _heute():
	return nowdate()


def _n(als_benutzer):
	if als_benutzer == "system-eg":
		api_pruefen()  # Systemkonto nur für den technischen API-Benutzer
		return S.system_nutzer()
	return nutzer(als_benutzer)


# ================================================================ Zugriff

def _zugriff(n, gid, rechte, text="Ihre Rolle in dieser Gemeinschaft erlaubt diese Aktion nicht."):
	if not n:
		nicht_angemeldet()
	gid = str(gid or "")
	if not gid or not frappe.db.exists(S.DT["gemeinschaft"], gid):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gid))
	k = S._kontext(n, g)
	if not k["rollen"] and not k["backofficeStufe"]:
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	if not any(SK.eg_stufe(k, r) >= s for r, s in rechte):
		verboten(text)
	return g, k


def _stufen(k):
	st = lambda r: SK.eg_stufe(k, r)  # noqa: E731
	return {"vorschau": st("abrechnung_vorschau"), "freigabe1": st("abrechnung_freigabe_1"), "freigabe2": st("abrechnung_freigabe_2"), "versand": st("abrechnung_versand"), "sepa": st("sepa"), "buchhaltung": st("buchhaltung"), "pruefen": st("buchhaltung_pruefen"), "tarife": st("tarife")}


def _darf_rechnen(s):
	return s["vorschau"] >= 2 or (s["vorschau"] >= 1 and (s["freigabe1"] >= 2 or s["freigabe2"] >= 2))


def _proto(n, aktion, art, oid, text):
	protokoll(None if (n or {}).get("system") else n, aktion, art, oid, text)


# ================================================================ Einstellung (je Gemeinschaft)

def _einstellung(gid, sperren=False):
	if not frappe.db.exists(DT["einstellung"], gid):
		frappe.get_doc({"doctype": DT["einstellung"], "gemeinschaft": gid, "einstellungen": "{}", "zaehler": "{}", "verrechnet": json.dumps({"beitritt": [], "beitrag": []}), "anfang": "{}", "pruefvermerke": "[]"}).insert(ignore_permissions=True)
	return frappe.get_doc(DT["einstellung"], gid, for_update=sperren)


def _einstellungen(gid):
	return {**K.EINSTELLUNGEN_STANDARD, **(aus_json(_einstellung(gid).einstellungen, {}) or {})}


def _setze_json(doc, feld, wert):
	doc.db_set(feld, json.dumps(wert, ensure_ascii=False), update_modified=True)


# ================================================================ Belege ↔ Dokumente

def _beleg_dict(doc):
	d = aus_json(doc.daten, {}) or {}
	d.update({"id": doc.name, "gemeinschaftId": doc.gemeinschaft, "periodeId": doc.periode, "mitgliedId": doc.mitglied, "typ": doc.typ, "nummer": doc.nummer, "datum": str(doc.datum or ""), "faelligAm": str(doc.faellig_am or ""), "von": str(doc.von or ""), "bis": str(doc.bis or ""), "status": doc.status, "hash": doc.hash or "", "zahlungslaufId": doc.zahlungslauf or None, "stornoVon": doc.storno_von or None})
	return d


def _beleg_speichern(b, doc=None):
	neu = doc is None
	if neu:
		doc = frappe.new_doc(DT["beleg"])
	s = b.get("summen") or {}
	felder = {
		"gemeinschaft": b["gemeinschaftId"], "periode": b.get("periodeId"), "mitglied": b.get("mitgliedId"), "typ": b["typ"], "nummer": b.get("nummer"), "datum": b.get("datum") or None, "faellig_am": b.get("faelligAm") or None,
		"von": b.get("von") or None, "bis": b.get("bis") or None, "status": b.get("status") or "final", "netto": s.get("netto") or 0, "ust": s.get("ust") or 0, "brutto": s.get("brutto") or 0, "rc_steuer": s.get("rcSteuer") or 0,
		"zahlweg": (b.get("zahlweg") or {}).get("art") or "", "zahlungslauf": b.get("zahlungslaufId") or None, "storno_von": b.get("stornoVon") or None, "hash": b.get("hash") or "", "hinweistext": "\n".join(s.get("hinweise") or []),
	}
	for k, v in felder.items():
		if neu or k in ("status", "zahlungslauf"):
			doc.set(k, v)
	ohne = {k: v for k, v in b.items() if k not in ("id",)}
	doc.set("daten", json.dumps(ohne, ensure_ascii=False, default=str))
	if neu:
		doc.set("positionen", [{"nr": p.get("nr"), "art": p.get("art"), "text": p.get("text"), "zaehlpunkt": p.get("zaehlpunkt"), "von": p.get("von") or None, "bis": p.get("bis") or None, "menge": p.get("menge"), "einheit": p.get("einheit"), "preis": p.get("preis"), "preis_einheit": p.get("preisEinheit"), "netto": p.get("netto"), "zeitfenster": p.get("zeitfenster"), "ust_regel": (p.get("ust") or {}).get("regel"), "ust_satz": (p.get("ust") or {}).get("satz"), "ust_art": (p.get("ust") or {}).get("art"), "preis_herkunft": p.get("preisHerkunft"), "pruefpfad": json.dumps(p.get("pruefpfad") or [], ensure_ascii=False)} for p in b.get("positionen") or []])
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc


def _belege(filters):
	return [_beleg_dict(frappe.get_doc(DT["beleg"], x)) for x in frappe.get_all(DT["beleg"], filters=filters, pluck="name", order_by="nummer desc")]


def _beleg_ausgabe(b, voll=True):
	zw = b.get("zahlweg") or None
	aus = {**b, "typLabel": TYP_LABEL.get(b["typ"], b["typ"]), "statusLabel": STATUS_LABEL.get(b["status"], b["status"]), "brutto": (b.get("summen") or {}).get("brutto"), "offen": K.beleg_offen(b),
		"zahlweg": ({**zw, "iban": None, "ibanMaskiert": iban_maskiert(zw.get("iban") or "")} if zw else None), "pdfUrl": f"/api/portal/eg/{b['gemeinschaftId']}/abrechnung/belege/{b['id']}/pdf"}
	return aus if voll else K.beleg_fuer_mitglied(aus)


# ================================================================ Perioden ↔ Dokumente

_P_JSON = ("freigaben", "kennzahlen", "kontrolle", "hinweise", "vorschau", "vergleich", "verlauf")


def _periode_dict(doc):
	d = {"id": doc.name, "gemeinschaftId": doc.gemeinschaft, "von": str(doc.von), "bis": str(doc.bis), "art": doc.art, "probe": bool(doc.probe), "status": doc.status, "fingerabdruck": doc.fingerabdruck or "", "datenquelle": doc.datenquelle or "", "erstelltAm": str(doc.creation)}
	for f in _P_JSON:
		d[f] = aus_json(doc.get(f), None)
	d["freigaben"] = d["freigaben"] or []
	d["verlauf"] = d["verlauf"] or []
	d["hinweise"] = d["hinweise"] or []
	return d


def _periode_speichern(p, doc):
	for f in ("status", "fingerabdruck", "datenquelle"):
		doc.set(f, p.get(f) or ("offen" if f == "status" else ""))
	for f in _P_JSON:
		doc.set(f, json.dumps(p.get(f), ensure_ascii=False, default=str) if p.get(f) is not None else None)
	doc.save(ignore_permissions=True)


def _periode_ausgabe(p, mit_belegen=False):
	v = p.get("vorschau")
	aus = {**p, "artLabel": K.PERIODEN_ARTEN.get(p["art"], p["art"]), "statusLabel": K.PERIODE_STATUS.get(p["status"], {}).get("label", p["status"]), "ton": K.PERIODE_STATUS.get(p["status"], {}).get("ton", "neutral"), "aktionen": K.PERIODE_AKTIONEN.get(p["status"], []), "fruehestens": K.abrechnung_fruehestens(p["bis"])}
	if v:
		aus["vorschau"] = {**v, "belege": v.get("belege") if mit_belegen else None, "anzahlBelege": len(v.get("belege") or [])}
	aus["anzahlBelege"] = frappe.db.count(DT["beleg"], {"periode": p["id"]})
	return aus


# ================================================================ Energiedaten (WP3) und Berechnung

def _werte_aus_wp3(antwort, tarife, von, bis):
	segmente = K.tarif_segmente(tarife, von, bis)
	aus = []
	for z in (antwort or {}).get("zaehlpunkte") or []:
		if not z.get("teilnahmeId"):
			continue
		je_tarif = z.get("groessenJeTarif") or {}
		if not je_tarif:
			aus.append({"teilnahmeId": z["teilnahmeId"], "zaehlpunktId": z.get("zaehlpunktId"), "von": von, "bis": bis, "groessen": z.get("groessen") or {}, "jeZeitfenster": z.get("groessenJeZeitfenster") or None, "vollstaendig": z.get("vollstaendig") is not False, "anteilL3": float(z.get("anteilL3") or 0)})
			continue
		for tid, fenster in je_tarif.items():
			seg = [s for s in segmente if s["tarifId"] == tid]
			groessen = {}
			for w in (fenster or {}).values():
				for gr, kwh in w.items():
					groessen[gr] = groessen.get(gr, 0) + float(kwh or 0)
			aus.append({"teilnahmeId": z["teilnahmeId"], "zaehlpunktId": z.get("zaehlpunktId"), "von": seg[0]["von"] if seg else von, "bis": seg[-1]["bis"] if seg else bis, "tarifId": tid, "groessen": groessen, "jeZeitfenster": fenster, "vollstaendig": z.get("vollstaendig") is not False, "anteilL3": float(z.get("anteilL3") or 0)})
	return aus


def _periodenwerte(g, tarife, von, bis):
	try:
		from oekoinvest_app.plattform.api import eg_energie as EN
	except ImportError:
		konflikt("Energiedaten (WP3) sind nicht installiert.")
	r = EN.periodenwerte(gemeinschaftId=g["id"], von=von, bis=bis, als_benutzer="system-eg")
	return {"werte": _werte_aus_wp3(r, tarife, von, bis), "quelle": "netzbetreiber", "hinweis": (r or {}).get("hinweis") or ""}


def _berechnen(g, daten, p, werte, mitglieder_filter=None):
	ein = _einstellungen(g["id"])
	ver = aus_json(_einstellung(g["id"]).verrechnet, {}) or {}
	mitglieder = [m for m in daten["mitglieder"] if not mitglieder_filter or m["id"] in mitglieder_filter]
	return K.abrechnung_berechnen(g, p, mitglieder, daten["zaehlpunkte"], daten["teilnahmen"], daten["tarife"], daten["anlagen"], S._netzbetreiber_liste(), werte, ein, ver, SK.kennzahlen(g, daten)["lieferantenpflichten"], _heute())


def _finalisieren(g, p, entwuerfe, datum):
	e = _einstellung(g["id"], sperren=True)
	zaehler = aus_json(e.zaehler, {}) or {}
	ver = aus_json(e.verrechnet, {}) or {"beitritt": [], "beitrag": []}
	ein = {**K.EINSTELLUNGEN_STANDARD, **(aus_json(e.einstellungen, {}) or {})}
	tmp = [{**b, "id": f"tmp-{i}"} for i, b in enumerate(entwuerfe)]
	nv = K.nummern_vergeben(tmp, zaehler, int(datum[:4]))
	neu = []
	for b in tmp:
		f = {**b, "nummer": nv["nummern"][b["id"]], "datum": datum, "faelligAm": K.faelligkeit(datum, ein["zahlungszielTage"]), "status": "final", "zahlungen": [], "mahnungen": [], "periodeId": p["id"]}
		f.pop("id", None)
		f["hash"] = sha256(K.beleg_inhalt(f))
		for v in b.get("verrechnet") or []:
			teile = v.split(":")
			if teile[0] == "beitritt" and teile[1] not in ver["beitritt"]:
				ver["beitritt"].append(teile[1])
			if teile[0] == "beitrag" and f"{teile[1]}:{teile[2]}" not in ver["beitrag"]:
				ver["beitrag"].append(f"{teile[1]}:{teile[2]}")
		doc = _beleg_speichern(f)
		neu.append(_beleg_dict(doc))
	_setze_json(e, "zaehler", nv["zaehler"])
	_setze_json(e, "verrechnet", ver)
	return neu


def _zahlung_buchen(g, b, betrag, datum, art, referenz="", zahlung_id=None, geldkonto="2800"):
	b["zahlungen"] = [*(b.get("zahlungen") or []), {"betrag": abs(betrag), "datum": datum, "art": art, "referenz": referenz, "zahlungId": zahlung_id}]
	b["status"] = K.status_nach_zahlung(b)
	_beleg_speichern(b, frappe.get_doc(DT["beleg"], b["id"]))
	for z in K.buchungen_aus_zahlung(b, {"betrag": abs(betrag), "datum": datum, "id": zahlung_id}, geldkonto):
		_buchung_anlegen(g["id"], z)


def _buchung_anlegen(gid, z):
	frappe.get_doc({"doctype": DT["buchung"], "gemeinschaft": gid, "datum": z["datum"], "konto": z["konto"], "kategorie": z["kategorie"], "betrag": z["betrag"], "ust": z.get("ust") or 0, "ust_art": z.get("ustArt") or "", "text": (z.get("text") or "")[:140],
		"geldkonto": z.get("geldkonto") or "2800", "beleg_nr": z.get("belegNr") or "", "beleg": z.get("belegId") or None, "zahlung": z.get("zahlungId") or None, "mitglied": z.get("mitgliedId") or None, "quelle": z.get("quelle") if z.get("quelle") in ("zahlung", "manuell", "kassa", "camt") else "zahlung"}).insert(ignore_permissions=True)


def _buchungen(gid):
	aus = []
	for x in frappe.get_all(DT["buchung"], filters={"gemeinschaft": gid}, fields=["name", "datum", "konto", "kategorie", "betrag", "ust", "ust_art", "text", "geldkonto", "beleg_nr", "beleg", "zahlung", "quelle"], order_by="datum asc, creation asc"):
		aus.append({"id": x.name, "datum": str(x.datum), "konto": x.konto, "kategorie": x.kategorie, "betrag": float(x.betrag or 0), "ust": float(x.ust or 0), "ustArt": x.ust_art or "", "text": x.text or "", "geldkonto": x.geldkonto or "2800", "belegNr": x.beleg_nr or "", "belegId": x.beleg, "zahlungId": x.zahlung, "quelle": x.quelle})
	return aus


def _ku(g, belege):
	jahr = _heute()[:4]
	gueltig = [b for b in belege if b.get("nummer") and b["status"] != "storniert"]
	r_j = lambda j: [b for b in gueltig if str(b["datum"]).startswith(j) and b["typ"] == "rechnung"]  # noqa: E731
	gut = [b for b in gueltig if str(b["datum"]).startswith(jahr) and b["typ"] == "gutschrift"]
	monate = max(1, len({b["von"][:7] for b in gueltig if str(b["datum"]).startswith(jahr)}))
	return K.ku_monitor(ustStatus=g.get("ustStatus"), jahr=int(jahr), monateErfasst=monate, umsatzBrutto=sum(b["summen"]["brutto"] for b in r_j(jahr)), vorjahrBrutto=sum(b["summen"]["brutto"] for b in r_j(str(int(jahr) - 1))),
		rcSteuer=sum(b["summen"].get("rcSteuer") or 0 for b in gut), vorsteuer=sum(b["summen"]["ust"] for b in gut), umsatzNetto=sum(b["summen"]["netto"] for b in r_j(jahr)))


def _mitglied_name(m):
	p = m.get("person") or {}
	return p.get("firma") or f"{p.get('vorname') or ''} {p.get('nachname') or ''}".strip()


# ================================================================ Perioden

@frappe.whitelist(methods=["POST"])
def perioden(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, k = _zugriff(n, gemeinschaftId, [("abrechnung_vorschau", 1), ("buchhaltung", 1), ("sepa", 1)])
	s = _stufen(k)
	daten = S.gemeinschaft_daten(g["id"])
	belege = _belege({"gemeinschaft": g["id"]})
	offen = [b for b in belege if b["status"] in K.BELEG_OFFEN]
	ein = _einstellungen(g["id"])
	ps = [_periode_ausgabe(_periode_dict(frappe.get_doc(DT["periode"], x))) for x in frappe.get_all(DT["periode"], filters={"gemeinschaft": g["id"]}, pluck="name", order_by="von desc")]
	laeufe = []
	for x in frappe.get_all(DT["zahlung"], filters={"gemeinschaft": g["id"]}, pluck="name", order_by="creation desc", limit_page_length=30):
		z = frappe.get_doc(DT["zahlung"], x)
		d = aus_json(z.daten, {}) or {}
		laeufe.append({"id": z.name, "art": z.art, "artLabel": K.ZAHLUNG_ARTEN.get(z.art, z.art), "status": z.status, "ausfuehrungAm": str(z.ausfuehrung_am or ""), "anzahl": z.anzahl, "summe": float(z.summe or 0), "erstelltAm": str(z.creation), "freigaben": d.get("freigaben") or [], "uebersprungen": d.get("uebersprungen") or [], "hatDatei": bool(z.datei)})
	return {
		"gemeinschaft": {"id": g["id"], "name": g["name"], "kurzname": g.get("kurzname"), "modell": g["modell"], "ustStatus": g.get("ustStatus"), "uid": g.get("uid"), "creditorId": g.get("creditorId"), "iban": iban_maskiert(g.get("iban") or ""), "abrechnungsrhythmus": g.get("abrechnungsrhythmus"), "lieferantenpflichten": SK.kennzahlen(g, daten)["lieferantenpflichten"], "dienstleistung": bool((g.get("dienstleistung") or {}).get("aktiv"))},
		"perioden": ps, "vorschlaege": [K.periode_vorschlag(a, _heute()) for a in ("monat", "quartal", "jahr")],
		"kennzahlen": {"offeneForderungen": K.rund2(sum(K.beleg_offen(b) for b in offen if b["typ"] == "rechnung")), "offeneGutschriften": K.rund2(sum(K.beleg_offen(b) for b in offen if b["typ"] == "gutschrift")), "ueberfaellig": len([b for b in offen if b["typ"] == "rechnung" and b["faelligAm"] < _heute()]), "belegeJahr": len([b for b in belege if str(b["datum"]).startswith(_heute()[:4])]), "luecken": K.beleg_luecken(belege)},
		"ku": _ku(g, belege), "einstellungen": ein if (s["tarife"] >= 1 or s["buchhaltung"] >= 1) else {"zahlungszielTage": ein["zahlungszielTage"]},
		"mitglieder": [{"id": m["id"], "mitgliedsnummer": m.get("mitgliedsnummer"), "name": _mitglied_name(m), "art": m["art"], "schutzbeduerftig": bool(m.get("schutzbeduerftig"))} for m in daten["mitglieder"] if m["status"] not in ("abgelehnt", "interessent")],
		"zahlungslaeufe": laeufe, "rechte": SK.eg_rechte_von(k), "rollen": k["rollen"], "stufen": s, "darfRechnen": _darf_rechnen(s), "heute": _heute(),
	}


@frappe.whitelist(methods=["POST"])
def periode_anlegen(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, k = _zugriff(n, gemeinschaftId, [("abrechnung_vorschau", 1)])
	if not _darf_rechnen(_stufen(k)):
		verboten("Perioden legen Kassier, Vorstand oder der Organisator an.")
	d = _daten(daten)
	vorhandene = [{"von": str(x.von), "bis": str(x.bis), "art": x.art, "probe": bool(x.probe), "status": x.status} for x in frappe.get_all(DT["periode"], filters={"gemeinschaft": g["id"]}, fields=["von", "bis", "art", "probe", "status"])]
	p0 = _fach(K.periode_bereinigen, {"von": d.get("von"), "bis": d.get("bis"), "art": d.get("art") or "monat", "probe": bool(d.get("probe"))}, _heute(), vorhandene)
	doc = frappe.get_doc({"doctype": DT["periode"], "gemeinschaft": g["id"], "von": p0["von"], "bis": p0["bis"], "art": p0["art"], "probe": 1 if p0["probe"] else 0, "status": "probe" if p0["probe"] else "offen",
		"hinweise": json.dumps(p0["hinweise"], ensure_ascii=False), "freigaben": "[]", "verlauf": json.dumps([{"am": jetzt_iso(), "text": "Probe-Abrechnung angelegt" if p0["probe"] else "Periode angelegt", "von": n.get("id")}], ensure_ascii=False)}).insert(ignore_permissions=True)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Abrechnungsperiode {p0['von']} bis {p0['bis']} angelegt")
	return _periode_ausgabe(_periode_dict(doc))


@frappe.whitelist(methods=["POST"])
def periode_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002, C901
	n = _n(als_benutzer)
	d = _daten(daten)
	aktion = str(d.get("aktion") or "")
	if not id or not frappe.db.exists(DT["periode"], id):
		nicht_gefunden("Periode nicht gefunden.")
	doc = frappe.get_doc(DT["periode"], id, for_update=aktion not in ("lesen",))
	p = _periode_dict(doc)
	g, k = _zugriff(n, p["gemeinschaftId"], [("abrechnung_vorschau", 1), ("buchhaltung", 1)])
	s = _stufen(k)
	if aktion == "lesen":
		return {"periode": _periode_ausgabe(p, True), "belege": [_beleg_ausgabe(b) for b in _belege({"periode": p["id"]})], "stufen": s, "darfRechnen": _darf_rechnen(s), "kontoId": n.get("id")}
	if aktion != "beleg_stornieren" and aktion not in K.PERIODE_AKTIONEN.get(p["status"], []):
		konflikt(f"Im Status „{K.PERIODE_STATUS.get(p['status'], {}).get('label', p['status'])}“ ist „{aktion or '?'}“ nicht möglich.")
	daten_g = S.gemeinschaft_daten(g["id"])

	if aktion == "vorschau":
		if not _darf_rechnen(s):
			verboten("Die Vorschau berechnen Kassier, Vorstand oder der Organisator.")
		w = _periodenwerte(g, daten_g["tarife"], p["von"], p["bis"])
		r = _berechnen(g, daten_g, p, w["werte"])
		fp = K.vorschau_fingerabdruck(r["belege"])
		gueltig = [f for f in p["freigaben"] if f.get("fingerabdruck") == fp]
		if p["freigaben"] and not gueltig:
			p["verlauf"].append({"am": jetzt_iso(), "text": "Zahlen geändert – bisherige Freigaben verfallen.", "von": n.get("id")})
		p.update({"vorschau": {**r, "hinweiseDaten": [*(p["hinweise"] or []), *([w["hinweis"]] if w["hinweis"] else [])], "berechnetAm": jetzt_iso(), "berechnetVon": n.get("id")}, "fingerabdruck": fp, "freigaben": gueltig, "datenquelle": w["quelle"], "status": "probe" if p["probe"] else ("freigabe_teilweise" if gueltig else "vorschau"), "kennzahlen": r["kennzahlen"], "kontrolle": r["kontrolle"]})
		p["verlauf"].append({"am": jetzt_iso(), "text": f"Vorschau berechnet: {len(r['belege'])} Belege, {len(r['pruefung']['fehler'])} blockierende Prüfungen", "von": n.get("id")})
		_periode_speichern(p, doc)
		_proto(n, "eg_abrechnung", "eg_periode", p["id"], f"Vorschau {p['von']} bis {p['bis']}: {len(r['belege'])} Belege")
		return {"periode": _periode_ausgabe(p, True)}

	if aktion == "freigeben":
		f = K.freigabe_pruefen(p, {"freigabe1": s["freigabe1"], "freigabe2": s["freigabe2"]}, n.get("id"), str(d.get("fingerabdruck") or ""), len(((p.get("vorschau") or {}).get("pruefung") or {}).get("fehler") or []))
		if not f["ok"]:
			(konflikt if (s["freigabe1"] >= 2 or s["freigabe2"] >= 2) else verboten)(f["grund"])
		p["freigaben"].append({"auge": f["auge"], "kontoId": n.get("id"), "name": name_von(n.get("id")), "am": jetzt_iso(), "fingerabdruck": p["fingerabdruck"]})
		p["verlauf"].append({"am": jetzt_iso(), "text": f"Freigabe {f['auge']}. Auge ({'Kassier' if f['auge'] == 1 else 'Vorstand'})", "von": n.get("id")})
		if not f["vollstaendig"]:
			p["status"] = "freigabe_teilweise"
			_periode_speichern(p, doc)
			_proto(n, "eg_abrechnung", "eg_periode", p["id"], f"Freigabe {f['auge']}. Auge")
			return {"periode": _periode_ausgabe(p), "vollstaendig": False}
		neu = _finalisieren(g, p, p["vorschau"]["belege"], _heute())
		p["status"] = "freigegeben"
		_periode_speichern(p, doc)
		_proto(n, "eg_abrechnung", "eg_periode", p["id"], f"Abrechnung freigegeben (Vier-Augen): {len(neu)} Belege")
		return {"periode": _periode_ausgabe(p), "vollstaendig": True, "belege": len(neu)}

	if aktion == "versenden":
		if s["versand"] < 2:
			verboten("Belege versendet der Organisator (Betriebsführung).")
		from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen

		belege = _belege({"periode": p["id"], "status": "final"})
		mitglieder = {m["id"]: m for m in daten_g["mitglieder"]}
		for b in belege:
			b["status"] = "versendet"
			b["versendetAm"] = jetzt_iso()
			m = mitglieder.get(b["mitgliedId"]) or {}
			b["versandweg"] = m.get("rechnungsweg") or "email"
			_beleg_speichern(b, frappe.get_doc(DT["beleg"], b["id"]))
			if m.get("kontoId"):
				benachrichtigen(m["kontoId"], "system", f"{TYP_LABEL.get(b['typ'])} {b['nummer']}", f"{g['name']}: {TYP_LABEL.get(b['typ'])} über {K.eur_text(abs(b['summen']['brutto']))} steht im Portal.", link="/portal/eg", objekt_art="eg_beleg", objekt_id=b["id"], mail=False)
		p["status"] = "versendet"
		p["verlauf"].append({"am": jetzt_iso(), "text": f"{len(belege)} Belege versendet", "von": n.get("id")})
		_periode_speichern(p, doc)
		_proto(n, "eg_abrechnung", "eg_periode", p["id"], f"{len(belege)} Belege versendet")
		return {"periode": _periode_ausgabe(p), "versendet": len(belege)}

	if aktion == "abschliessen":
		if s["freigabe1"] < 2 and s["versand"] < 2:
			verboten("Abschließen dürfen Kassier oder Organisator.")
		p["status"] = "abgeschlossen"
		p["verlauf"].append({"am": jetzt_iso(), "text": "Periode abgeschlossen", "von": n.get("id")})
		_periode_speichern(p, doc)
		return {"periode": _periode_ausgabe(p)}

	if aktion in ("stornieren", "beleg_stornieren"):
		if s["freigabe1"] < 2 and s["freigabe2"] < 2:
			verboten("Stornieren dürfen Kassier oder Vorstand.")
		grund = str(d.get("grund") or "").strip()
		if len(grund) < 5:
			ungueltig("Bitte einen Grund für das Storno angeben (mind. 5 Zeichen).")
		ziel = [b for b in _belege({"periode": p["id"]}) if b["typ"] != "storno" and b["status"] != "storniert" and (aktion == "stornieren" or b["id"] == d.get("belegId"))]
		if not ziel:
			nicht_gefunden("Kein stornierbarer Beleg gefunden.")
		e = _einstellung(g["id"], sperren=True)
		zaehler = aus_json(e.zaehler, {}) or {}
		ver = aus_json(e.verrechnet, {}) or {"beitritt": [], "beitrag": []}
		stornos = []
		heute = _heute()
		for b in ziel:
			if b.get("zahlungslaufId") and b["status"] not in ("bezahlt", "teilbezahlt"):
				konflikt(f"{b['nummer']} steckt in einem offenen Zahlungslauf – Lauf zuerst verwerfen.")
			nr = K.naechste_nummer(zaehler, "storno", int(heute[:4]))
			zaehler[nr["schluessel"]] = nr["n"]
			st = _fach(K.beleg_stornieren, b, nr["nummer"], heute, grund)
			st["hash"] = sha256(K.beleg_inhalt(st))
			stornos.append(_beleg_dict(_beleg_speichern(st)))
			b["status"] = "storniert"
			b["storniertDurch"] = st["nummer"]
			_beleg_speichern(b, frappe.get_doc(DT["beleg"], b["id"]))
			gezahlt = sum(z.get("betrag") or 0 for z in b.get("zahlungen") or [])
			if gezahlt > 0:
				for z in K.buchungen_aus_zahlung(st, {"betrag": gezahlt, "datum": heute, "id": None}):
					_buchung_anlegen(g["id"], {**z, "text": f"{z['text']} (Rückabwicklung)"})
			for v in b.get("verrechnet") or []:
				t = v.split(":")
				if t[0] == "beitritt":
					ver["beitritt"] = [x for x in ver["beitritt"] if x != t[1]]
				if t[0] == "beitrag":
					ver["beitrag"] = [x for x in ver["beitrag"] if x != f"{t[1]}:{t[2]}"]
		_setze_json(e, "zaehler", zaehler)
		_setze_json(e, "verrechnet", ver)
		korrektur = []
		if aktion == "beleg_stornieren" and d.get("korrektur"):
			w = _periodenwerte(g, daten_g["tarife"], p["von"], p["bis"])
			r = _berechnen(g, S.gemeinschaft_daten(g["id"]), p, w["werte"], [ziel[0]["mitgliedId"]])
			if any(f.get("mitgliedId") == ziel[0]["mitgliedId"] for f in r["pruefung"]["fehler"]):
				konflikt("Der Korrekturbeleg hat blockierende Prüfungen – bitte Daten klären.")
			korrektur = _finalisieren(g, p, [{**x, "korrekturVon": ziel[0]["nummer"]} for x in r["belege"] if x["typ"] == ziel[0]["typ"]], heute)
		if aktion == "stornieren":
			p["status"] = "storniert"
		p["verlauf"].append({"am": jetzt_iso(), "text": f"{len(stornos)} Stornobeleg(e){f' und {len(korrektur)} Korrekturbeleg(e)' if korrektur else ''}: {grund}", "von": n.get("id")})
		_periode_speichern(p, doc)
		_proto(n, "eg_abrechnung", "eg_periode", p["id"], f"Storno: {grund}")
		return {"periode": _periode_ausgabe(p), "stornos": [_beleg_ausgabe(x) for x in stornos], "korrektur": [_beleg_ausgabe(x) for x in korrektur]}

	if aktion == "verwerfen":
		if not _darf_rechnen(s):
			verboten("Verwerfen dürfen Kassier, Vorstand oder Organisator.")
		frappe.delete_doc(DT["periode"], p["id"], ignore_permissions=True, force=True)
		_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Periode {p['von']} bis {p['bis']} verworfen")
		return {"verworfen": True}

	if aktion == "vergleich":
		if not p.get("vorschau"):
			konflikt("Bitte zuerst die Probe-Abrechnung berechnen.")
		alt = K.altwerte_lesen(str(d.get("csv") or "")[:200000])
		if not alt["werte"]:
			ungueltig(" ".join(alt["fehler"][:3]) or "Keine Altwerte erkannt.")
		p["vergleich"] = {**K.probe_vergleich(p["vorschau"]["belege"], alt["werte"]), "fehler": alt["fehler"][:20], "am": jetzt_iso()}
		_periode_speichern(p, doc)
		return {"periode": _periode_ausgabe(p, True)}
	ungueltig("Unbekannte Aktion.")


# ================================================================ Belege

@frappe.whitelist(methods=["POST"])
def belege(filter=None, als_benutzer=None):  # noqa: A002
	n = _n(als_benutzer)
	if not n:
		nicht_angemeldet()
	f = _daten(filter)
	sicht = lambda b: b["status"] not in ("entwurf", "final")  # noqa: E731
	if f.get("mitgliedId"):
		if not frappe.db.exists(S.DT["mitglied"], f["mitgliedId"]):
			nicht_gefunden("Mitglied nicht gefunden.")
		m = S.aus_doc("mitglied", frappe.get_doc(S.DT["mitglied"], f["mitgliedId"]))
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], m["gemeinschaftId"]))
		k = S._kontext(n, g)
		eigen = bool(m.get("kontoId")) and m["kontoId"] == n.get("id")
		organ = SK.eg_stufe(k, "abrechnung_vorschau") >= 1 or SK.eg_stufe(k, "buchhaltung") >= 1
		if not eigen and not organ:
			nicht_gefunden("Mitglied nicht gefunden.")
		return {"belege": [_beleg_ausgabe(b, organ) for b in _belege({"mitglied": m["id"]}) if organ or sicht(b)]}
	if not f.get("gemeinschaftId"):
		meine = frappe.get_all(S.DT["mitglied"], filters={"konto": n.get("id")}, pluck="name")
		return {"belege": [_beleg_ausgabe(b, False) for b in _belege({"mitglied": ["in", meine or ["-"]]}) if sicht(b)]}
	g, _k = _zugriff(n, f["gemeinschaftId"], [("abrechnung_vorschau", 1), ("buchhaltung", 1), ("sepa", 1)])
	filt = {"gemeinschaft": g["id"]}
	if f.get("periodeId"):
		filt["periode"] = f["periodeId"]
	liste = _belege(filt)
	return {"belege": [_beleg_ausgabe(b) for b in liste], "luecken": K.beleg_luecken(liste)}


@frappe.whitelist(methods=["POST"])
def beleg_pdf(id=None, als_benutzer=None):  # noqa: A002
	n = _n(als_benutzer)
	if not id or not frappe.db.exists(DT["beleg"], id):
		nicht_gefunden("Beleg nicht gefunden.")
	b = _beleg_dict(frappe.get_doc(DT["beleg"], id))
	g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], b["gemeinschaftId"]))
	k = S._kontext(n, g)
	m_konto = frappe.db.get_value(S.DT["mitglied"], b["mitgliedId"], "konto") if b.get("mitgliedId") else None
	eigen = bool(m_konto) and m_konto == n.get("id") and b["status"] not in ("entwurf", "final")
	if not eigen and SK.eg_stufe(k, "abrechnung_vorschau") < 1 and SK.eg_stufe(k, "buchhaltung") < 1:
		nicht_gefunden("Beleg nicht gefunden.")
	_proto(n, "eg_abrechnung", "eg_beleg", b["id"], f"Beleg {b['nummer']} als PDF abgerufen")
	return {"beleg": _beleg_ausgabe(b), "dateiname": f"{b['nummer']}.pdf"}


# ================================================================ Zahlungen

def _zahlung_dict(z):
	return {"id": z.name, "gemeinschaftId": z.gemeinschaft, "art": z.art, "status": z.status, "ausfuehrungAm": str(z.ausfuehrung_am or ""), "anzahl": z.anzahl, "summe": float(z.summe or 0), "daten": aus_json(z.daten, {}) or {}, "hatDatei": bool(z.datei)}


@frappe.whitelist(methods=["POST"])
def zahlungslauf(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("sepa", 2)], "Zahlungsläufe erstellen Kassier bzw. Organisator.")
	d = _daten(daten)
	art = d.get("art") or "pain008"
	if art not in ("pain008", "pain001"):
		ungueltig("Unbekannte Zahlungsart.")
	heute = _heute()
	am = d.get("ausfuehrungAm") if (d.get("ausfuehrungAm") or "") >= heute else heute
	belege_g = _belege({"gemeinschaft": g["id"]})
	letzte = {}
	for b in belege_g:
		for z in b.get("zahlungen") or []:
			if z.get("art") == "pain008" and z.get("datum", "") > letzte.get(b["mitgliedId"], ""):
				letzte[b["mitgliedId"]] = z["datum"]
	ids = [str(x) for x in d.get("belegIds") or []] or None
	lauf = K.zahlungslauf_bilden(art, belege_g, S.gemeinschaft_daten(g["id"])["mitglieder"], g, heute, ids, _einstellungen(g["id"])["aufrechnung"], letzte)
	if not lauf["anzahl"]:
		return {"lauf": {**lauf, "id": None}, "hinweis": "Keine offenen Belege für diesen Zahlungslauf."}
	doc = frappe.get_doc({"doctype": DT["zahlung"], "gemeinschaft": g["id"], "art": art, "status": "erzeugt", "ausfuehrung_am": am, "anzahl": lauf["anzahl"], "summe": lauf["summe"]}).insert(ignore_permissions=True)
	xml = _fach(K.zahlungsdatei, art, lauf, g, f"{(g.get('kurzname') or 'EG').replace(' ', '')}-{'DD' if art == 'pain008' else 'CT'}-{doc.name[-6:]}", jetzt_iso(), am)
	doc.db_set("datei", xml)
	doc.db_set("sha256", sha256(xml))
	doc.db_set("daten", json.dumps({"posten": [{**p, "iban": iban_maskiert(p["iban"])} for p in lauf["posten"]], "uebersprungen": lauf["uebersprungen"], "verrechnungen": lauf["verrechnungen"], "freigaben": [{"kontoId": n.get("id"), "name": name_von(n.get("id")), "am": jetzt_iso()}]}, ensure_ascii=False))
	for p in lauf["posten"]:
		for bid in [p["belegId"], *p["verrechnet"]]:
			frappe.get_doc(DT["beleg"], bid).db_set("zahlungslauf", doc.name)
	_proto(n, "eg_abrechnung", "eg_zahlung", doc.name, f"{art}: {lauf['anzahl']} Posten, {K.eur_text(lauf['summe'])}")
	return {"lauf": _zahlung_dict(frappe.get_doc(DT["zahlung"], doc.name)), "hinweis": "Datei erzeugt – Download nach Freigabe durch eine zweite berechtigte Person (Vier-Augen)."}


@frappe.whitelist(methods=["POST"])
def zahlungslauf_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = _n(als_benutzer)
	if not id or not frappe.db.exists(DT["zahlung"], id):
		nicht_gefunden("Zahlungslauf nicht gefunden.")
	z = frappe.get_doc(DT["zahlung"], id, for_update=True)
	_g, k = _zugriff(n, z.gemeinschaft, [("sepa", 1), ("abrechnung_freigabe_2", 2)])
	s = _stufen(k)
	aktion = _daten(daten).get("aktion")
	zd = aus_json(z.daten, {}) or {}
	if aktion == "datei":
		if z.status not in ("freigegeben", "eingereicht", "gebucht"):
			konflikt("Die Datei steht nach der Freigabe durch eine zweite Person bereit.")
		if s["sepa"] < 2:
			verboten("Download nur für Kassier bzw. Organisator.")
		_proto(n, "eg_abrechnung", "eg_zahlung", z.name, "Zahlungsdatei heruntergeladen")
		return {"dateiname": f"{z.art}-{z.name}.xml", "inhalt": z.datei, "mime": "application/xml"}
	if aktion == "freigeben":
		if z.status != "erzeugt":
			konflikt("Der Lauf ist bereits freigegeben.")
		if s["sepa"] < 2 and s["freigabe2"] < 2:
			verboten("Freigeben dürfen Kassier, Organisator oder Vorstand.")
		if any(f.get("kontoId") == n.get("id") for f in zd.get("freigaben") or []):
			konflikt("Vier-Augen-Prinzip: Die Freigabe muss eine andere Person erteilen.")
		zd.setdefault("freigaben", []).append({"kontoId": n.get("id"), "name": name_von(n.get("id")), "am": jetzt_iso()})
		z.db_set("daten", json.dumps(zd, ensure_ascii=False))
		z.db_set("status", "freigegeben")
	elif aktion == "eingereicht":
		if s["sepa"] < 2:
			verboten("Nur Kassier bzw. Organisator.")
		if z.status != "freigegeben":
			konflikt("Erst freigeben, dann einreichen.")
		z.db_set("status", "eingereicht")
	elif aktion == "verwerfen":
		if s["sepa"] < 2:
			verboten("Nur Kassier bzw. Organisator.")
		if z.status == "gebucht":
			konflikt("Gebuchte Läufe können nicht verworfen werden.")
		z.db_set("status", "verworfen")
		for bid in frappe.get_all(DT["beleg"], filters={"zahlungslauf": z.name, "status": ["not in", ["bezahlt", "teilbezahlt"]]}, pluck="name"):
			frappe.get_doc(DT["beleg"], bid).db_set("zahlungslauf", None)
	else:
		ungueltig("Unbekannte Aktion.")
	_proto(n, "eg_abrechnung", "eg_zahlung", z.name, f"Zahlungslauf: {aktion}")
	return {"lauf": _zahlung_dict(frappe.get_doc(DT["zahlung"], z.name))}


@frappe.whitelist(methods=["POST"])
def camt_import(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("sepa", 2)], "Kontoauszüge importieren Kassier bzw. Organisator.")
	d = _daten(daten)
	xml = str(d.get("xml") or "")
	if len(xml) > 5000000:
		ungueltig("Datei zu groß (höchstens 5 MB).")
	belege_g = _belege({"gemeinschaft": g["id"]})
	zeilen = _fach(K.BK.camt_lesen, xml)
	kandidaten = [K.fuer_zuordnung(b) for b in belege_g if b["status"] in K.BELEG_OFFEN and b.get("nummer")]
	vorschlaege = [{**z, "vorschlag": K.BK.zuordnen(z, kandidaten)} for z in zeilen]
	if not d.get("ausfuehren"):
		return {"buchungen": vorschlaege[:500], "ruecklastschriften": [], "anzahl": len(vorschlaege)}
	imp = frappe.get_doc({"doctype": DT["zahlung"], "gemeinschaft": g["id"], "art": "camt", "status": "gebucht", "anzahl": 0, "summe": 0}).insert(ignore_permissions=True)
	schon = set()
	for x in frappe.get_all(DT["zahlung"], filters={"gemeinschaft": g["id"], "art": "camt"}, fields=["daten"]):
		schon.update((aus_json(x.daten, {}) or {}).get("schluessel") or [])
	zu = d.get("zuordnungen") or {}
	uebernommen, summe, schluessel = 0, 0.0, []
	for i, bu in enumerate(vorschlaege):
		key = f"{bu['datum']}|{bu['betrag']}|{bu['richtung']}|{bu.get('referenz')}|{bu.get('zweck')}"[:300]
		if key in schon:
			continue
		bid = zu.get(str(i)) or (bu["vorschlag"].get("belegId") if bu["vorschlag"]["art"] == "sicher" else None)
		b = next((x for x in belege_g if x["id"] == bid), None)
		if not b:
			continue
		schluessel.append(key)
		_zahlung_buchen(g, b, bu["betrag"], bu["datum"], "camt", bu.get("referenz") or bu.get("zweck") or "", imp.name)
		uebernommen += 1
		summe += bu["betrag"]
	imp.db_set("anzahl", uebernommen)
	imp.db_set("summe", round(summe, 2))
	imp.db_set("daten", json.dumps({"schluessel": schluessel}, ensure_ascii=False))
	_proto(n, "eg_abrechnung", "eg_zahlung", imp.name, f"Kontoauszug: {uebernommen} Zahlungen übernommen")
	return {"uebernommen": uebernommen, "ruecklastschriften": 0, "import": imp.name}


@frappe.whitelist(methods=["POST"])
def zahlung_erfassen(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = _n(als_benutzer)
	if not id or not frappe.db.exists(DT["beleg"], id):
		nicht_gefunden("Beleg nicht gefunden.")
	b = _beleg_dict(frappe.get_doc(DT["beleg"], id, for_update=True))
	g, _k = _zugriff(n, b["gemeinschaftId"], [("sepa", 2)], "Zahlungen erfassen Kassier bzw. Organisator.")
	d = _daten(daten)
	try:
		x = round(float(str(d.get("betrag") or "").replace(",", ".")), 2)
	except ValueError:
		x = 0
	offen = K.beleg_offen(b)
	if not (x > 0) or x > offen + 0.009:
		ungueltig(f"Betrag zwischen 0,01 € und {K.eur_text(offen)}.")
	t = d.get("datum") if (d.get("datum") or "") and d["datum"] <= _heute() else _heute()
	z = frappe.get_doc({"doctype": DT["zahlung"], "gemeinschaft": g["id"], "art": "manuell", "status": "gebucht", "anzahl": 1, "summe": x}).insert(ignore_permissions=True)
	_zahlung_buchen(g, b, x, t, "manuell", str(d.get("referenz") or "")[:80], z.name, "2700" if d.get("geldkonto") == "2700" else "2800")
	_proto(n, "eg_abrechnung", "eg_beleg", b["id"], f"Zahlung {K.eur_text(x)} zu {b['nummer']} erfasst")
	return {"beleg": _beleg_ausgabe(_beleg_dict(frappe.get_doc(DT["beleg"], id)))}


@frappe.whitelist(methods=["POST"])
def mahnlauf(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, k = _zugriff(n, gemeinschaftId, [("sepa", 1), ("buchhaltung", 1)])
	d = _daten(daten)
	heute = _heute()
	ein = _einstellungen(g["id"])
	mitglieder = {m["id"]: m for m in S.gemeinschaft_daten(g["id"])["mitglieder"]}
	liste = []
	for b in _belege({"gemeinschaft": g["id"]}):
		v = K.eg_mahnvorschlag(b, heute, ein.get("mahnwesen") or K.MAHN_FAIR, bool((mitglieder.get(b["mitgliedId"]) or {}).get("schutzbeduerftig")))
		if v:
			liste.append({"belegId": b["id"], "nummer": b["nummer"], "empfaenger": (b.get("empfaenger") or {}).get("name") or "", "offen": K.beleg_offen(b), "faelligAm": b["faelligAm"], **v, "_b": b})
	if not d.get("ausfuehren"):
		return {"vorschlaege": [{k2: v2 for k2, v2 in x.items() if k2 != "_b"} for x in liste], "konfig": ein.get("mahnwesen") or K.MAHN_FAIR}
	if _stufen(k)["sepa"] < 2:
		verboten("Mahnungen erstellen Kassier bzw. Organisator.")
	auswahl = set(d.get("belegIds") or [])
	e = _einstellung(g["id"], sperren=True)
	zaehler = aus_json(e.zaehler, {}) or {}
	kreis = f"MA-{heute[:4]}"
	anzahl = 0
	for x in liste:
		if not x["faellig"] or (auswahl and x["belegId"] not in auswahl):
			continue
		b = x["_b"]
		zaehler[kreis] = int(zaehler.get(kreis) or 0) + 1
		m = {"nr": f"{kreis}-{str(zaehler[kreis]).zfill(5)}", "stufe": x["stufe"], "label": x["label"], "am": jetzt_iso(), "frist": x["frist"], "gebuehr": x["gebuehr"], "zinsen": x.get("zinsen") or 0, "pauschale": 0, "gesamt": x["gesamt"], "sozial": x.get("sozial")}
		m["text"] = K.BK.mahn_text({"nummer": b["nummer"], "rechnungsdatum": b["datum"], "faelligAm": b["faelligAm"]}, m)
		b["mahnungen"] = [*(b.get("mahnungen") or []), m]
		b["status"] = "gemahnt"
		_beleg_speichern(b, frappe.get_doc(DT["beleg"], b["id"]))
		anzahl += 1
	_setze_json(e, "zaehler", zaehler)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Mahnlauf: {anzahl} Mahnungen")
	return {"anzahl": anzahl}


@frappe.whitelist(methods=["POST"])
def mandate(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("sepa", 1)])
	heute = _heute()
	aus = []
	for m in sorted(S.gemeinschaft_daten(g["id"])["mitglieder"], key=lambda x: x.get("mitgliedsnummer") or 0):
		if m["status"] not in ("aufgenommen", "aktiv", "gekuendigt"):
			continue
		sm = m.get("sepaMandat") or {}
		aus.append({"mitgliedId": m["id"], "mitgliedsnummer": m.get("mitgliedsnummer"), "name": _mitglied_name(m), "referenz": sm.get("referenz") or "", "datum": sm.get("datum") or "", "status": sm.get("status") or "", "iban": iban_maskiert(m.get("iban") or ""), "pruefung": K.mandat_pruefen(sm, m.get("iban"), heute)})
	return {"mandate": aus}


# ================================================================ Buchhaltung

def _quartal_bis(j, q):
	return f"{j}-{str(q * 3).zfill(2)}-{'31' if q in (1, 4) else '30'}"


@frappe.whitelist(methods=["POST"])
def buchungen(gemeinschaftId=None, jahr=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, k = _zugriff(n, gemeinschaftId, [("buchhaltung", 1)], "Die Buchhaltung sehen Kassier, Vorstand, Rechnungsprüfung und Organisator.")
	j = str(jahr) if str(jahr or "").isdigit() and len(str(jahr)) == 4 else _heute()[:4]
	alle = _buchungen(g["id"])
	im = [b for b in alle if b["datum"].startswith(j)]
	belege_g = _belege({"gemeinschaft": g["id"]})
	e = _einstellung(g["id"])
	anfang = (aus_json(e.anfang, {}) or {}).get(j) or {"bank": 0, "kassa": 0}
	offen = [b for b in belege_g if b["status"] in K.BELEG_OFFEN]
	ea = K.ea_rechnung(alle, j, anfang, sum(K.beleg_offen(b) for b in offen if b["typ"] == "rechnung"), sum(K.beleg_offen(b) for b in offen if b["typ"] == "gutschrift"))
	return {
		"gemeinschaft": {"id": g["id"], "name": g["name"], "ustStatus": g.get("ustStatus"), "rechtsform": g.get("rechtsform")}, "jahr": int(j),
		"buchungen": sorted(im, key=lambda b: b["datum"], reverse=True), "ea": ea, "kassabuch": K.kassabuch(im, anfang.get("kassa") or 0),
		"uva": [{"quartal": q, **K.uva_vorbereitung(belege_g, f"{j}-{str(q * 3 - 2).zfill(2)}-01", _quartal_bis(j, q), g.get("ustStatus"))} for q in (1, 2, 3, 4)],
		"ku": _ku(g, belege_g), "luecken": K.beleg_luecken(belege_g), "pruefvermerke": aus_json(e.pruefvermerke, []) or [], "konten": K.BUCHUNG_KATEGORIEN, "exportArten": K.EXPORT_ARTEN, "kontenplan": K.EG_KONTEN,
		"rechte": SK.eg_rechte_von(k), "stufen": _stufen(k), "heute": _heute(),
	}


@frappe.whitelist(methods=["POST"])
def buchung_speichern(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("buchhaltung", 2)], "Buchungen erfassen Kassier bzw. Organisator.")
	b = _fach(K.buchung_bereinigen, _daten(daten))
	if b["datum"] > _heute():
		ungueltig("Buchungen nicht in der Zukunft.")
	if b["geldkonto"] == "2700":
		anfang = (aus_json(_einstellung(g["id"]).anfang, {}) or {}).get(b["datum"][:4]) or {}
		kb = K.kassabuch([*[x for x in _buchungen(g["id"]) if x["datum"][:4] == b["datum"][:4]], {**b, "id": "zzz"}], anfang.get("kassa") or 0)
		if kb["fehler"]:
			ungueltig(kb["fehler"][0])
	_buchung_anlegen(g["id"], b)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Buchung {b['belegNr']}: {b['text']} {K.eur_text(b['betrag'])}")
	return {"buchung": b}


@frappe.whitelist(methods=["POST"])
def pruefvermerk(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("buchhaltung_pruefen", 2)], "Den Prüfvermerk erteilt die Rechnungsprüfung.")
	v = _fach(K.pruefvermerk_bereinigen, _daten(daten))
	e = _einstellung(g["id"], sperren=True)
	liste = aus_json(e.pruefvermerke, []) or []
	x = {**v, "jahr": v["jahr"] or int(_heute()[:4]) - 1, "prueferId": n.get("id"), "pruefer": name_von(n.get("id")), "am": jetzt_iso(), "gemeinschaftId": g["id"]}
	x["hash"] = sha256(json.dumps([x["gemeinschaftId"], x["jahr"], x["ergebnis"], x["text"], x["stichproben"], x["prueferId"], x["am"]], ensure_ascii=False))
	liste.append(x)
	_setze_json(e, "pruefvermerke", liste)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Prüfvermerk {x['jahr']}: {x['ergebnis']}")
	return {"pruefvermerk": x}


@frappe.whitelist(methods=["POST"])
def export(gemeinschaftId=None, art=None, jahr=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("buchhaltung", 1)], "Exporte für Kassier, Vorstand, Rechnungsprüfung und Organisator.")
	art = art or "ea"
	if art not in K.EXPORT_ARTEN and art != "paket":
		ungueltig("Unbekannte Exportart.")
	j = int(jahr) if str(jahr or "").isdigit() else int(_heute()[:4])
	alle = _buchungen(g["id"])
	belege_g = _belege({"gemeinschaft": g["id"]})
	e = _einstellung(g["id"])
	anfang = (aus_json(e.anfang, {}) or {}).get(str(j)) or {"bank": 0, "kassa": 0}
	ea = K.ea_rechnung(alle, j, anfang)
	kassa = K.kassabuch([b for b in alle if b["datum"].startswith(str(j))], anfang.get("kassa") or 0)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], f"Export {art} {j}")
	if art == "paket":
		inhalt = json.dumps({"gemeinschaft": {"name": g["name"], "zvr": g.get("zvrZahl"), "ustStatus": g.get("ustStatus")}, "jahr": j, "erstelltAm": jetzt_iso(), "ea": ea, "kassabuch": kassa,
			"uva": [K.uva_vorbereitung(belege_g, f"{j}-{str(q * 3 - 2).zfill(2)}-01", _quartal_bis(j, q), g.get("ustStatus")) for q in (1, 2, 3, 4)],
			"belegjournal": [{"nummer": b["nummer"], "typ": b["typ"], "datum": b["datum"], "mitgliedsnummer": b.get("mitgliedsnummer"), "netto": b["summen"]["netto"], "ust": b["summen"]["ust"], "brutto": b["summen"]["brutto"], "status": b["status"], "hash": b.get("hash")} for b in belege_g if str(b["datum"]).startswith(str(j))],
			"luecken": K.beleg_luecken(belege_g), "pruefvermerke": aus_json(e.pruefvermerke, []) or [], "hinweis": "Jahresabschluss-Paket für Rechnungsprüfung und Steuerberatung (VerG § 21). Keine Steuerberatung."}, ensure_ascii=False, indent=1)
		return {"dateiname": f"{(g.get('kurzname') or 'EG').replace(' ', '-')}_Jahresabschluss_{j}.json", "inhalt": inhalt, "mime": "application/json"}
	return K.export_erzeugen(art, alle, belege_g, j, g, (_einstellungen(g["id"]).get("konten") or {}), ea, kassa, "")


@frappe.whitelist(methods=["POST"])
def kleinunternehmer(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, _k = _zugriff(n, gemeinschaftId, [("buchhaltung", 1), ("abrechnung_vorschau", 1)])
	return {"monitor": _ku(g, _belege({"gemeinschaft": g["id"]})), "gemeinschaft": {"id": g["id"], "name": g["name"], "ustStatus": g.get("ustStatus"), "ustOptionSeit": g.get("ustOptionSeit") or ""}}


@frappe.whitelist(methods=["POST"])
def jahresbescheinigung(mitgliedId=None, jahr=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	if not mitgliedId or not frappe.db.exists(S.DT["mitglied"], mitgliedId):
		nicht_gefunden("Mitglied nicht gefunden.")
	m = S.aus_doc("mitglied", frappe.get_doc(S.DT["mitglied"], mitgliedId))
	g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], m["gemeinschaftId"]))
	k = S._kontext(n, g)
	if not (m.get("kontoId") and m["kontoId"] == n.get("id")) and SK.eg_stufe(k, "buchhaltung") < 1:
		nicht_gefunden("Mitglied nicht gefunden.")
	j = int(jahr) if str(jahr or "").isdigit() else int(_heute()[:4])
	daten = S.gemeinschaft_daten(g["id"])
	zps = {t["zaehlpunktId"] for t in daten["teilnahmen"] if t["mitgliedId"] == m["id"]}
	anlagen = {z.get("anlageId") for z in daten["zaehlpunkte"] if z["id"] in zps and z.get("anlageId")}
	kwp = sum(float(a.get("kwp") or 0) for a in daten["anlagen"] if a["id"] in anlagen)
	gut = [b for b in _belege({"mitglied": m["id"]}) if b["typ"] == "gutschrift" or (b["typ"] == "storno" and b.get("ursprungTyp") == "gutschrift")]
	return {"gemeinschaft": {"name": g["name"]}, "mitglied": {"mitgliedsnummer": m.get("mitgliedsnummer"), "name": _mitglied_name(m)}, **K.jahresbescheinigung(gut, j, m, kwp)}


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803, C901
	n = _n(als_benutzer)
	g, k = _zugriff(n, gemeinschaftId, [("tarife", 2), ("buchhaltung", 2)], "Einstellungen ändern Vorstand (Tarifgruppen, Rabatte) bzw. Kassier (Zahlungsziel, Gutschriftverfahren).")
	s = _stufen(k)
	d = _daten(daten)
	e = _einstellung(g["id"], sperren=True)
	neu = {**K.EINSTELLUNGEN_STANDARD, **(aus_json(e.einstellungen, {}) or {})}

	def zahl(v, lo, hi):
		if v is None or v == "":
			return None
		try:
			return min(hi, max(lo, float(str(v).replace(",", "."))))
		except ValueError:
			return None

	if s["buchhaltung"] >= 2:
		if "zahlungszielTage" in d:
			neu["zahlungszielTage"] = int(round(zahl(d["zahlungszielTage"], 7, 60) or 14))
		if d.get("mitgliedsbeitragArt"):
			neu["mitgliedsbeitragArt"] = "echt" if d["mitgliedsbeitragArt"] == "echt" else "unecht"
		if "aufrechnung" in d:
			neu["aufrechnung"] = bool(d["aufrechnung"])
		if isinstance(d.get("gutschriftverfahren"), dict):
			mids = {m["id"] for m in S.gemeinschaft_daten(g["id"])["mitglieder"]}
			gv = dict(neu.get("gutschriftverfahren") or {})
			for mid, v in list(d["gutschriftverfahren"].items())[:2000]:
				if mid in mids:
					gv[mid] = {"zugestimmtAm": str((v or {}).get("zugestimmtAm") or "")[:10], "widersprochenAm": str((v or {}).get("widersprochenAm") or "")[:10]}
			neu["gutschriftverfahren"] = gv
	if s["tarife"] >= 2 or s["buchhaltung"] >= 2:
		for f in ("netzApCt", "efbApCt", "referenzLieferantCt", "referenzEinspeisungCt"):
			if f in d:
				neu[f] = zahl(d[f], 0, 100)
	if s["tarife"] >= 2:
		if isinstance(d.get("gruppen"), list):
			neu["gruppen"] = [{"id": str(x.get("id") or f"G{i + 1}")[:20], "label": str(x.get("label") or "Tarifgruppe")[:80], "mitgliedIds": [str(y) for y in x.get("mitgliedIds") or []][:2000], "mitgliedArten": [a for a in x.get("mitgliedArten") or [] if a in SK.M.MITGLIED_ARTEN], "bezugspreisCt": zahl(x.get("bezugspreisCt"), 0, 100), "einspeisepreisCt": zahl(x.get("einspeisepreisCt"), 0, 100), "grund": str(x.get("grund") or "")[:200]} for i, x in enumerate(d["gruppen"][:20])]
		if isinstance(d.get("rabatte"), list):
			neu["rabatte"] = [{"id": str(x.get("id") or f"R{i + 1}")[:20], "label": str(x.get("label") or "Rabatt")[:80], "art": "betrag" if x.get("art") == "betrag" else "pct", "wert": zahl(x.get("wert"), 0, 1000 if x.get("art") == "betrag" else 100) or 0, "bezug": x.get("bezug") if x.get("bezug") in ("energie", "gebuehren", "alles") else "energie", "mitgliedIds": [str(y) for y in x.get("mitgliedIds") or []][:2000], "mitgliedArten": [a for a in x.get("mitgliedArten") or [] if a in SK.M.MITGLIED_ARTEN], "gueltigAb": str(x.get("gueltigAb") or "")[:10], "gueltigBis": str(x.get("gueltigBis") or "")[:10], "beschluss": str(x.get("beschluss") or "")[:120]} for i, x in enumerate(d["rabatte"][:20])]
	_setze_json(e, "einstellungen", neu)
	_proto(n, "eg_abrechnung", "eg_gemeinschaft", g["id"], "Abrechnungseinstellungen geändert")
	return {"einstellungen": neu}
