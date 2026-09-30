# Copyright (c) 2026, ÖkoInvest GmbH
#
# Betriebsführung der Anlagen (docs/API.md, Abschnitt „Betriebsführung“) – Referenz: src/lib/plattform/backend/demo/betrieb.js.
# Regeln: plattform/betrieb_kern.py (= src/lib/plattform/betrieb/kern.js). Ergänzt plattform/api/anlagen.py um:
#   Störung als Ticket (SLA, Ursache, Maßnahme, Ertragsausfall) · Serviceaufträge · Versicherungsfälle · Wartungspläne ·
#   Prüfprotokolle · Ersatzteillager · Einstrahlung (Performance Ratio) · Freigabe von Zählerständen · täglicher Fristen-Lauf.
# Messdaten (Monitoring) liegen im Ingest-Dienst; Kennzahlen, Plausibilisierung und Berichte rechnet die Website
# (src/lib/plattform/betrieb/auswertung.js) und übergibt Kontext bzw. Befund serverseitig.
#
# Rechte: ausschließlich Backoffice mit Bereich „anlagen“ (rechte.py): lesen ≥ 1, schreiben = 2. Kunden sehen die
# Betriebsführung nicht; sie erhalten nur Benachrichtigungen zu Servicetermin und Behebung.
#
# Scheduler (hooks.py, täglich): lauf_taeglich – Fristen (Eichung, Garantie, Wartung, Meldefrist), SLA-Verletzungen, Nachbestellung.

import frappe
from frappe.utils import cint, flt, get_datetime, getdate, nowdate

from oekoinvest_app.plattform import betrieb_kern as bk
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.anlagen_kern import STOERUNG_OFFEN, WARTUNG_ARTEN
from oekoinvest_app.plattform.benachrichtigung import aktive_admins
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, ungueltig, verboten
from oekoinvest_app.plattform.kern import protokoll as _log
from oekoinvest_app.plattform.rechte import stufe

DT_A = "Plattform Anlage"
DT_S = "Plattform Stoerungsfall"
WP = "Plattform Wartungsplan"
PP = "Plattform Pruefprotokoll"
SA = "Plattform Serviceauftrag"
VF = "Plattform Versicherungsfall"
ET = "Plattform Ersatzteil"
EB = "Plattform Ersatzteil Bewegung"
KZ = "Plattform Anlagen Einstrahlung"
ZF = "Plattform Zaehler Freigabe"
ES = "Plattform Betrieb Einstellungen"
BEREICH = "anlagen"


# ================================================================ Rechte & Hilfen


def _bo_lesen(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 1


def _bo_schreiben(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 2


def _lese(n):
	if not n:
		nicht_angemeldet()
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice (Betrieb).")


def _schreib(n):
	if not n:
		nicht_angemeldet()
	if not _bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Betrieb).")


def _fach(fn, *a, **kw):
	"""BetriebFehler der reinen Regeln → Frappe-Fehler mit passendem Status (422 / 409)."""
	try:
		return fn(*a, **kw)
	except bk.BetriebFehler as e:
		if e.status == 409:
			konflikt(e.text)
		ungueltig(e.text)


def _daten(d):
	return aus_json(d, {}) or {}


def _heute():
	return nowdate()


def _datum(s):
	s = str(s or "")[:10]
	return s if len(s) == 10 and s[:2] == "20" and s[4] == "-" and s[7] == "-" else ""


def _zeit(s):
	try:
		return get_datetime(str(s).replace("Z", "").replace("T", " ")[:19]) if s else None
	except Exception:
		return None


def _anlage(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_A, k):
		nicht_gefunden("Anlage nicht gefunden.")
	return frappe.get_doc(DT_A, k)


def _kurz(a):
	return {"id": a.name, "name": a.titel, "typ": a.typ, "land": a.land, "kwp": flt(a.kwp)} if a else None


def _anlage_kurz(anlage_id):
	a = frappe.db.get_value(DT_A, anlage_id, ["name", "titel", "typ", "land", "kwp"], as_dict=True) if anlage_id else None
	return _kurz(a)


def _betrieb_konten(schreiben=False):
	from oekoinvest_app.plattform.api.anlagen import _betrieb_konten as bk_konten

	erg = []
	for b in bk_konten():
		if schreiben:
			k = frappe.db.get_value("Plattform Konto", b["id"], ["backoffice_rollen"], as_dict=True) or {}
			if stufe(frappe._dict(rollen=["admin"], backofficeRollen=k.get("backoffice_rollen") or ""), BEREICH) < 2:
				continue
		erg.append(b["id"])
	return erg


def _zustaendig():
	konten = _betrieb_konten(True)
	for k in konten:
		if "betrieb" in str(frappe.db.get_value("Plattform Konto", k, "backoffice_rollen") or ""):
			return k
	return konten[0] if konten else None


def _aufgabe(titel, beschreibung, faellig, zustaendig):
	if not zustaendig:
		return
	frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(beschreibung, 2000), "faellig_am": faellig, "zustaendig_id": zustaendig, "status": "offen"}).insert(ignore_permissions=True)


def _verlauf(doc, text):
	liste = aus_json(doc.verlauf, []) or []
	liste.append({"am": iso(jetzt()), "text": text})
	doc.verlauf = als_json(liste[-200:])


# ================================================================ Ausgabe (camelCase wie das Demo-Backend)


def _stoerung_dict(s):
	return {"schwere": s.schwere, "erkanntAm": iso(s.erkannt_am or s.creation), "quittiertAm": iso(s.quittiert_am), "behobenAm": iso(s.behoben_am)}


def _auftrag_json(x):
	return {
		"id": x.name, "anlageId": x.anlage_id, "stoerungId": x.stoerung_id, "planId": x.plan_id, "art": x.art, "artLabel": bk.AUFTRAG_ARTEN.get(x.art, x.art), "status": x.status,
		"statusLabel": bk.AUFTRAG_STATUS.get(x.status, x.status), "offen": x.status in bk.AUFTRAG_OFFEN, "dienstleister": x.dienstleister or "", "kontakt": x.kontakt or "", "termin": x.termin or "",
		"kostenEur": flt(x.kosten_eur) or None, "bestellnummer": x.bestellnummer or "", "beauftragtAm": iso(x.beauftragt_am), "erledigtAm": str(x.erledigt_am or "") or None,
		"beschreibung": x.beschreibung or "", "bericht": x.bericht or "", "stornoGrund": x.storno_grund or "", "verlauf": aus_json(x.verlauf, []) or [], "erstelltAm": iso(x.creation),
	}


def _vers_json(x):
	offen = x.status in bk.VERSICHERUNG_OFFEN
	frist = str(x.meldefrist_bis or "")
	return {
		"id": x.name, "anlageId": x.anlage_id, "stoerungId": x.stoerung_id, "art": x.art, "artLabel": bk.VERSICHERUNG_ARTEN.get(x.art, x.art), "status": x.status,
		"statusLabel": bk.VERSICHERUNG_STATUS.get(x.status, x.status), "offen": offen, "versicherer": x.versicherer or "", "police": x.police or "", "schadennummer": x.schadennummer or "",
		"schadentag": str(x.schadentag or ""), "meldefristBis": frist, "gemeldetAm": str(x.gemeldet_am or "") or None, "verspaetet": bool(cint(x.verspaetet)), "reguliertAm": str(x.reguliert_am or "") or None,
		"schadenEur": flt(x.schaden_eur) or None, "selbstbehaltEur": flt(x.selbstbehalt_eur) or None, "ertragsausfallEur": flt(x.ertragsausfall_eur) or None,
		"erstattetEur": flt(x.erstattet_eur) if x.status == "reguliert" else None, "schadenbeschreibung": x.schadenbeschreibung or "", "abschlussGrund": x.abschluss_grund or "", "bemerkung": x.bemerkung or "",
		"meldefristTage": bk.tage_zwischen(_heute(), frist) if x.status == "entwurf" and frist else None, "verlauf": aus_json(x.verlauf, []) or [], "erstelltAm": iso(x.creation),
	}


def _plan_json(p):
	d = {
		"id": p.name, "anlageId": p.anlage_id, "art": p.art, "artLabel": WARTUNG_ARTEN.get(p.art, p.art), "bezeichnung": p.bezeichnung, "intervallMonate": cint(p.intervall_monate),
		"vorlaufTage": cint(p.vorlauf_tage), "naechsteFaelligkeit": str(p.naechste_faelligkeit or ""), "letzteDurchfuehrung": str(p.letzte_durchfuehrung or ""), "norm": p.norm or "",
		"hinweis": p.hinweis or "", "dienstleister": p.dienstleister or "", "aktiv": bool(cint(p.aktiv)),
	}
	d["stand"] = bk.plan_stand(d, _heute())
	return d


def _teil_json(t):
	d = {
		"id": t.name, "bezeichnung": t.bezeichnung, "art": t.art, "hersteller": t.hersteller or "", "artikelnummer": t.artikelnummer or "", "einheit": t.einheit or "Stück",
		"bestand": flt(t.bestand), "mindestbestand": flt(t.mindestbestand), "zielbestand": flt(t.zielbestand) or None, "lagerort": t.lagerort or "", "preisEur": flt(t.preis_eur) or None,
		"bemerkung": t.bemerkung or "", "aktiv": bool(cint(t.aktiv)),
	}
	d["nachbestellung"] = bk.nachbestellung(d)
	return d


def _bewegung_json(b):
	t = frappe.db.get_value(ET, b.ersatzteil_id, ["name", "bezeichnung", "einheit"], as_dict=True)
	return {
		"id": b.name, "ersatzteilId": b.ersatzteil_id, "art": b.art, "artLabel": bk.ERSATZTEIL_BEWEGUNG.get(b.art, b.art), "menge": flt(b.menge), "bestandVor": flt(b.bestand_vor), "bestandNach": flt(b.bestand_nach),
		"anlageId": b.anlage_id, "stoerungId": b.stoerung_id, "auftragId": b.auftrag_id, "bemerkung": b.bemerkung or "", "am": iso(b.am), "vonName": name_von(b.von_id) if b.von_id else "",
		"teil": {"id": t.name, "bezeichnung": t.bezeichnung, "einheit": t.einheit} if t else None, "anlage": _anlage_kurz(b.anlage_id),
	}


def _protokoll_json(p):
	m = aus_json(p.messwerte, {}) or {}
	return {
		"id": p.name, "anlageId": p.anlage_id, "planId": p.plan_id, "art": p.art, "artLabel": bk.PRUEF_ARTEN.get(p.art, p.art), "datum": str(p.datum or ""), "pruefer": p.pruefer or "",
		"firma": p.firma or "", "norm": p.norm or "", "einstrahlungWm2": flt(p.einstrahlung_wm2) or None, "ergebnis": p.ergebnis, "ergebnisLabel": bk.PRUEF_ERGEBNIS.get(p.ergebnis, p.ergebnis),
		"strings": m.get("strings") or [], "punkte": m.get("punkte") or {}, "thermografie": m.get("thermografie") or [], "maengel": m.get("maengel") or [],
		"befunde": aus_json(p.befunde, []) or [], "bemerkung": p.bemerkung or "", "stoerungId": p.stoerung_id, "dokumentId": p.dokument_id, "erstelltVonName": name_von(p.erstellt_von) if p.erstellt_von else "",
	}


def _ticket_json(s):
	uk = s.get("ursache_kategorie") or ""
	return {
		"id": s.name, "anlageId": s.anlage_id, "anlage": _anlage_kurz(s.anlage_id), "titel": s.titel, "text": s.text or "", "regel": s.regel, "schwere": s.schwere, "status": s.status,
		"erkanntAm": iso(s.erkannt_am or s.creation), "quittiertAm": iso(s.quittiert_am), "behobenAm": iso(s.behoben_am),
		"zustaendig": {"id": s.zustaendig_id, "name": name_von(s.zustaendig_id)} if s.zustaendig_id else None,
		"sla": bk.sla_status(_stoerung_dict(s)),
		"ursacheKategorie": uk, "ursacheLabel": bk.URSACHEN.get(uk, ("",))[0], "ursacheText": s.get("ursache_text") or "", "massnahme": s.get("massnahme") or "", "versicherbar": bool(bk.URSACHEN.get(uk, ("", False))[1]),
		"ausfallBeginn": iso(s.get("ausfall_beginn")) or "", "ausfallEnde": iso(s.get("ausfall_ende")) or "", "betroffenPct": flt(s.get("betroffen_pct")) if s.get("betroffen_pct") is not None else None,
		"ertragsausfall": aus_json(s.get("ertragsausfall"), None),
		"auftraege": [_auftrag_json(x) for x in frappe.get_all(SA, filters={"stoerung_id": s.name}, fields=["*"], order_by="creation asc", limit_page_length=0)],
		"versicherungen": [_vers_json(x) for x in frappe.get_all(VF, filters={"stoerung_id": s.name}, fields=["*"], order_by="creation asc", limit_page_length=0)],
		"entnahmen": [_bewegung_json(b) for b in frappe.get_all(EB, filters={"stoerung_id": s.name}, fields=["*"], order_by="am asc", limit_page_length=0)],
		"ursacheFehlt": s.status == "behoben" and not uk,
	}


def _komponenten(anlage_id):
	return [{"id": k.name, "art": k.art, "hersteller": k.hersteller or "", "modell": k.modell or "", "anzahl": cint(k.anzahl) or 1, "garantieBis": str(k.garantie_bis or "")} for k in frappe.get_all("Plattform Anlagenkomponente", filters={"anlage_id": anlage_id}, fields=["name", "art", "hersteller", "modell", "anzahl", "garantie_bis"], limit_page_length=0)]


def _messpunkte(anlage_id):
	return [{"id": m.name, "bezeichnung": m.bezeichnung or "", "zaehlernummer": m.zaehlernummer, "art": m.art, "abrechnungsrelevant": bool(cint(m.abrechnungsrelevant)), "eichgueltigBis": str(m.eichgueltig_bis or "")} for m in frappe.get_all("Plattform Messpunkt", filters={"anlage_id": anlage_id}, fields=["name", "bezeichnung", "zaehlernummer", "art", "abrechnungsrelevant", "eichgueltig_bis"], limit_page_length=0)]


def _fristen(a):
	aid = a.name
	f = bk.fristen_ermitteln(
		{"id": aid}, _komponenten(aid), _messpunkte(aid),
		[_plan_json(p) for p in frappe.get_all(WP, filters={"anlage_id": aid}, fields=["*"], limit_page_length=0)],
		[_vers_json(x) for x in frappe.get_all(VF, filters={"anlage_id": aid, "status": "entwurf"}, fields=["*"], limit_page_length=0)],
		_heute(),
	)
	k = _kurz(a)
	return [{**x, "anlage": k} for x in f]


# ================================================================ Lesen


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	e = frappe.get_single(ES)
	if not e.lauf_am or (get_datetime(jetzt()) - get_datetime(e.lauf_am)).total_seconds() > 86400:
		_lauf(None)
	anlagen = [frappe.get_doc(DT_A, x) for x in frappe.get_all(DT_A, filters={"status": ["!=", "rueckbau"]}, pluck="name", order_by="titel asc", limit_page_length=0)]
	fristen = [f for a in anlagen for f in _fristen(a) if f["stufe"] != "spaeter"]
	offen = frappe.get_all(DT_S, filters={"status": ["in", STOERUNG_OFFEN]}, pluck="name", limit_page_length=500)
	tickets = sorted([_ticket_json(frappe.get_doc(DT_S, x)) for x in offen], key=lambda t: {"rot": 0, "gelb": 1, "gruen": 2}.get((t["sla"] or {}).get("ampel"), 3))
	grenze = frappe.utils.add_days(_heute(), -90)
	ohne = [_ticket_json(frappe.get_doc(DT_S, x)) for x in frappe.get_all(DT_S, filters={"status": "behoben", "behoben_am": [">=", grenze], "ursache_kategorie": ["is", "not set"]}, pluck="name", limit_page_length=100)]
	teile = [_teil_json(t) for t in frappe.get_all(ET, filters={"aktiv": 1}, fields=["*"], order_by="bezeichnung asc", limit_page_length=0)]
	jahr = _heute()[:4]
	kwh = eur = 0.0
	for s in frappe.get_all(DT_S, filters={"ausfall_beginn": [">=", f"{jahr}-01-01"]}, fields=["ertragsausfall"], limit_page_length=0):
		ea = aus_json(s.ertragsausfall, None) or {}
		kwh += flt(ea.get("ausfallKwh"))
		eur += flt(ea.get("ausfallEur"))
	auftraege = [{**_auftrag_json(x), "anlage": _anlage_kurz(x.anlage_id)} for x in frappe.get_all(SA, filters={"status": ["in", list(bk.AUFTRAG_OFFEN)]}, fields=["*"], order_by="termin asc", limit_page_length=200)]
	vers = [{**_vers_json(x), "anlage": _anlage_kurz(x.anlage_id)} for x in frappe.get_all(VF, filters={"status": ["in", list(bk.VERSICHERUNG_OFFEN)]}, fields=["*"], limit_page_length=200)]
	plaene = frappe.get_all(WP, filters={"aktiv": 1}, fields=["*"], limit_page_length=0)
	return {
		"zaehler": {
			"slaVerletzt": sum(1 for t in tickets if (t["sla"] or {}).get("ampel") == "rot"), "slaKritisch": sum(1 for t in tickets if (t["sla"] or {}).get("ampel") == "gelb"),
			"fristenUeberfaellig": sum(1 for f in fristen if f["stufe"] == "ueberfaellig"), "fristenDringend": sum(1 for f in fristen if f["stufe"] in ("dringend", "fehlt")),
			"auftraegeOffen": len(auftraege), "versicherungOffen": len(vers), "nachbestellen": sum(1 for t in teile if t["nachbestellung"]), "ohneUrsache": len(ohne),
			"ausfallJahrKwh": round(kwh), "ausfallJahrEur": round(eur),
		},
		"tickets": tickets, "ohneUrsache": ohne, "fristen": fristen, "auftraege": auftraege, "versicherungen": vers,
		"ersatzteile": sorted(teile, key=lambda t: (0 if t["nachbestellung"] else 1, t["bezeichnung"])),
		"bewegungen": [_bewegung_json(b) for b in frappe.get_all(EB, fields=["*"], order_by="am desc", limit_page_length=30)],
		"anlagen": [{**_kurz(a), "plaene": sum(1 for p in plaene if p.anlage_id == a.name), "faellig": sum(1 for p in plaene if p.anlage_id == a.name and _plan_json(p)["stand"]["stufe"] in ("faellig", "ueberfaellig"))} for a in anlagen],
		"laufAm": iso(frappe.db.get_single_value(ES, "lauf_am")), "darfSchreiben": _bo_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def anlage(anlage_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	a = _anlage(anlage_id)
	plaene = [_plan_json(p) for p in frappe.get_all(WP, filters={"anlage_id": a.name}, fields=["*"], order_by="naechste_faelligkeit asc", limit_page_length=0)]
	return {
		"anlage": {**_kurz(a), "bundesland": a.bundesland, "inbetriebnahme": str(a.inbetriebnahme or ""), "status": a.status, "speicherKwh": flt(a.speicher_kwh), "eigentuemer": a.get("eigentuemer") or "", "betriebsfuehrer": a.get("betriebsfuehrer") or ""},
		"plaene": plaene,
		"vorschlag": bk.plan_vorschlag({"land": a.land, "typ": a.typ, "speicherKwh": flt(a.speicher_kwh)}, plaene),
		"protokolle": [_protokoll_json(p) for p in frappe.get_all(PP, filters={"anlage_id": a.name}, fields=["*"], order_by="datum desc", limit_page_length=100)],
		"auftraege": [_auftrag_json(x) for x in frappe.get_all(SA, filters={"anlage_id": a.name}, fields=["*"], order_by="creation desc", limit_page_length=100)],
		"versicherungen": [_vers_json(x) for x in frappe.get_all(VF, filters={"anlage_id": a.name}, fields=["*"], order_by="creation desc", limit_page_length=100)],
		"tickets": [_ticket_json(frappe.get_doc(DT_S, x)) for x in frappe.get_all(DT_S, filters={"anlage_id": a.name}, pluck="name", order_by="erkannt_am desc", limit_page_length=100)],
		"fristen": _fristen(a),
		"einstrahlung": [{"id": x.name, "anlageId": a.name, "monat": x.monat, "kwhM2": flt(x.kwh_m2), "quelle": x.quelle or ""} for x in frappe.get_all(KZ, filters={"anlage_id": a.name}, fields=["name", "monat", "kwh_m2", "quelle"], order_by="monat desc", limit_page_length=0)],
		"freigaben": [{"id": x.name, "monat": x.monat, "register": x.register, "stufe": x.stufe, "begruendung": x.begruendung or "", "am": iso(x.am), "vonName": name_von(x.von_id) if x.von_id else ""} for x in frappe.get_all(ZF, filters={"anlage_id": a.name}, fields=["*"], order_by="am desc", limit_page_length=60)],
		"messpunkte": [m for m in _messpunkte(a.name) if m["abrechnungsrelevant"]],
		"ersatzteile": [_teil_json(t) for t in frappe.get_all(ET, filters={"aktiv": 1}, fields=["*"], limit_page_length=0)],
		"darfSchreiben": _bo_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def stoerung(stoerung_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	s = _stoerung_laden(stoerung_id)
	c = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": s.anlage_id}, ["strompreis_ct", "status"], as_dict=True)
	return {
		**_ticket_json(s), "ersatzteile": [_teil_json(t) for t in frappe.get_all(ET, filters={"aktiv": 1}, fields=["*"], limit_page_length=0)],
		"vertrag": {"strompreisCt": flt(c.strompreis_ct), "status": c.status} if c else None, "betrieb": [{"id": k, "name": name_von(k)} for k in _betrieb_konten()], "darfSchreiben": _bo_schreiben(n),
	}


def _stoerung_laden(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_S, k):
		nicht_gefunden("Störung nicht gefunden.")
	return frappe.get_doc(DT_S, k)


# ================================================================ Störung: Ticket


@frappe.whitelist(methods=["POST"])
def stoerung_speichern(stoerung_id=None, daten=None, kontext=None, als_benutzer=None):
	"""kontext (serverseitig von der Website berechnet): {jahresKwh, arbeitspreisCt, eigenverbrauchQuote}"""
	n = nutzer(als_benutzer)
	_schreib(n)
	s = _stoerung_laden(stoerung_id)
	d = _daten(daten)
	k = _daten(kontext)
	uk = v.auswahl(d.get("ursacheKategorie"), list(bk.URSACHEN), "")
	beginn, ende = d.get("ausfallBeginn"), d.get("ausfallEnde")
	pct = v.zahl(d.get("betroffenPct"), 0, 100)
	ea = None
	if beginn or ende:
		v.pflicht(beginn and ende, "Bitte Beginn und Ende des Ausfalls angeben.")
		v.pflicht(pct is not None, "Bitte den betroffenen Anteil der Anlage in % angeben (100 = Totalausfall).")
		ea = _fach(bk.ertragsausfall, flt(k.get("jahresKwh")), beginn, ende, pct, k.get("arbeitspreisCt"), k.get("eigenverbrauchQuote"))
	s.ursache_kategorie = uk
	s.ursache_text = v.mehrzeilig(d.get("ursacheText"), 1000)
	s.massnahme = v.mehrzeilig(d.get("massnahme"), 1000)
	s.ausfall_beginn = _zeit(beginn) if ea else None
	s.ausfall_ende = _zeit(ende) if ea else None
	s.betroffen_pct = pct if ea else None
	s.ertragsausfall = als_json(ea)
	verlauf = aus_json(s.verlauf, []) or []
	verlauf.append({"am": iso(jetzt()), "text": f"Ticket gepflegt ({name_von(n.id)})" + (f": Ursache {bk.URSACHEN[uk][0]}" if uk else "") + (f", Ertragsausfall {ea['ausfallKwh']} kWh" if ea else "")})
	s.verlauf = als_json(verlauf)
	s.save(ignore_permissions=True)
	_log(n, "betrieb_ticket", "anlage", s.anlage_id, f"Störung {s.name}: Ursache/Ertragsausfall gespeichert")
	return _ticket_json(s)


@frappe.whitelist(methods=["POST"])
def stoerung_beheben(stoerung_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	s = _stoerung_laden(stoerung_id)
	if s.status == "behoben":
		konflikt("Die Störung ist bereits behoben.")
	_fach(bk.behebung_pruefen, s.get("ursache_kategorie"), s.get("massnahme"))
	if frappe.db.exists(SA, {"stoerung_id": s.name, "status": ["in", ["beauftragt", "terminiert", "vor_ort"]]}):
		konflikt("Es ist noch ein Serviceauftrag offen – bitte zuerst abschließen oder stornieren.")
	from oekoinvest_app.plattform.api.anlagen import stoerung_aktion

	text = v.text(_daten(daten).get("text") or f"{bk.URSACHEN[s.ursache_kategorie][0]} – {s.massnahme}", 200)
	stoerung_aktion(id=s.name, daten={"aktion": "status", "status": "behoben", "text": text}, als_benutzer=n.id)
	return stoerung(stoerung_id=s.name, als_benutzer=n.id)


# ================================================================ Serviceaufträge


def _auftrag_felder(d):
	termin = str(d.get("termin") or "")
	return {
		"art": v.auswahl(d.get("art"), list(bk.AUFTRAG_ARTEN), ""), "dienstleister": v.text(d.get("dienstleister"), 120), "kontakt": v.text(d.get("kontakt"), 160),
		"beschreibung": v.mehrzeilig(d.get("beschreibung"), 2000), "termin": termin[:16] if _datum(termin) else "", "kosten_eur": v.zahl(d.get("kostenEur"), 0, 10000000), "bestellnummer": v.text(d.get("bestellnummer"), 60),
	}


@frappe.whitelist(methods=["POST"])
def auftrag_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	f = _auftrag_felder(d)
	v.pflicht(f["art"], "Bitte die Art des Auftrags wählen.")
	v.pflicht(len(f["beschreibung"]) >= 5, "Bitte den Auftrag beschreiben (mind. 5 Zeichen).")
	if d.get("id"):
		k = v.kennung(d.get("id"))
		if not k or not frappe.db.exists(SA, k):
			nicht_gefunden("Auftrag nicht gefunden.")
		x = frappe.get_doc(SA, k)
		if x.status not in bk.AUFTRAG_OFFEN:
			konflikt("Abgeschlossene Aufträge können nicht mehr geändert werden.")
		x.update(f)
		x.save(ignore_permissions=True)
		_log(n, "betrieb_auftrag", "anlage", x.anlage_id, f"Serviceauftrag {x.name} geändert")
		return _auftrag_json(x)
	a = _anlage(d.get("anlageId"))
	st = v.kennung(d.get("stoerungId"))
	if st and frappe.db.get_value(DT_S, st, "anlage_id") != a.name:
		ungueltig("Störung gehört nicht zu dieser Anlage.")
	pl = v.kennung(d.get("planId"))
	if pl and frappe.db.get_value(WP, pl, "anlage_id") != a.name:
		ungueltig("Wartungsplan gehört nicht zu dieser Anlage.")
	x = frappe.get_doc({"doctype": SA, "anlage_id": a.name, "stoerung_id": st or None, "plan_id": pl or None, **f, "status": "angelegt", "verlauf": als_json([{"am": iso(jetzt()), "text": f"Angelegt von {name_von(n.id)}"}])}).insert(ignore_permissions=True)
	_log(n, "betrieb_auftrag", "anlage", a.name, f"Serviceauftrag {x.name} angelegt")
	return _auftrag_json(x)


@frappe.whitelist(methods=["POST"])
def auftrag_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(SA, k):
		nicht_gefunden("Auftrag nicht gefunden.")
	x = frappe.get_doc(SA, k)
	d = _daten(daten)
	neu = v.auswahl(d.get("status"), list(bk.AUFTRAG_STATUS), "")
	alt = _auftrag_json(x)
	patch = _fach(bk.auftrag_uebergang, alt, neu, {"termin": d.get("termin"), "bericht": v.mehrzeilig(d.get("bericht"), 2000) if d.get("bericht") is not None else None, "erledigtAm": _datum(d.get("erledigtAm")), "grund": v.text(d.get("grund"), 200), "dienstleister": x.dienstleister}, _heute())
	x.status = patch["status"]
	if "beauftragtAm" in patch:
		x.beauftragt_am = jetzt()
	if "termin" in patch:
		x.termin = patch["termin"]
	if "bericht" in patch:
		x.bericht = patch["bericht"]
	if "erledigtAm" in patch:
		x.erledigt_am = patch["erledigtAm"]
	if "stornoGrund" in patch:
		x.storno_grund = patch["stornoGrund"]
	if d.get("kostenEur") is not None:
		x.kosten_eur = v.zahl(d.get("kostenEur"), 0, 10000000)
	_verlauf(x, f"{bk.AUFTRAG_STATUS[neu]} ({name_von(n.id)})")
	x.save(ignore_permissions=True)
	a = frappe.db.get_value(DT_A, x.anlage_id, ["name", "titel", "kunde_id", "organisation_id"], as_dict=True)
	if neu == "terminiert" and a:
		empf = {a.kunde_id} if a.kunde_id else set()
		if a.organisation_id:
			empf |= set(frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": a.organisation_id}, pluck="nutzer_id", limit_page_length=0))
		for konto in empf:
			benachrichtigen(konto, "stoerung", f"Servicetermin an Ihrer Anlage: {a.titel}", f"Ein Techniker ist für {x.termin.replace('T', ' ')} eingeplant. Bitte ermöglichen Sie den Zugang.", f"/portal/anlagen/{a.name}?tab=stoerungen", "anlage", a.name, mail_text="Für Ihre Anlage ist ein Servicetermin eingeplant. Details finden Sie im Portal.", mail_betreff="Servicetermin an Ihrer Anlage – ÖkoInvest")
	if neu == "erledigt" and x.plan_id:
		_plan_durchgefuehrt(x.plan_id, x.erledigt_am, f"Serviceauftrag {x.name}: {x.bericht}", x.dienstleister, flt(x.kosten_eur) or None)
	_log(n, "betrieb_auftrag", "anlage", x.anlage_id, f"Serviceauftrag {x.name}: {neu}")
	return _auftrag_json(x)


@frappe.whitelist(methods=["POST"])
def auftrag(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_lese(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(SA, k):
		nicht_gefunden("Auftrag nicht gefunden.")
	x = frappe.get_doc(SA, k)
	a = frappe.get_doc(DT_A, x.anlage_id)
	s = frappe.get_doc(DT_S, x.stoerung_id) if x.stoerung_id and frappe.db.exists(DT_S, x.stoerung_id) else None
	return {
		"auftrag": _auftrag_json(x), "anlage": {**_kurz(a), "bundesland": a.bundesland, "ort": a.ort or "", "betriebsfuehrer": a.get("betriebsfuehrer") or "", "eigentuemer": a.get("eigentuemer") or ""},
		"stoerung": {"id": s.name, "titel": s.titel, "schwere": s.schwere, "erkanntAm": iso(s.erkannt_am), "sla": bk.sla_status(_stoerung_dict(s))} if s else None,
		"komponenten": _komponenten(a.name), "ersteller": name_von(n.id),
	}


# ================================================================ Versicherungsfälle


def _vers_felder(d):
	return {
		"art": v.auswahl(d.get("art"), list(bk.VERSICHERUNG_ARTEN), "allgefahren"), "versicherer": v.text(d.get("versicherer"), 120), "police": v.text(d.get("police"), 60),
		"schadennummer": v.text(d.get("schadennummer"), 60), "schadentag": _datum(d.get("schadentag")) or None, "schadenbeschreibung": v.mehrzeilig(d.get("schadenbeschreibung"), 2000),
		"schaden_eur": v.zahl(d.get("schadenEur"), 0, 1e9), "selbstbehalt_eur": v.zahl(d.get("selbstbehaltEur"), 0, 1e8), "ertragsausfall_eur": v.zahl(d.get("ertragsausfallEur"), 0, 1e9), "bemerkung": v.mehrzeilig(d.get("bemerkung"), 1000),
	}


@frappe.whitelist(methods=["POST"])
def versicherung_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	f = _vers_felder(d)
	if f["schadentag"] and f["schadentag"] > _heute():
		ungueltig("Der Schadentag darf nicht in der Zukunft liegen.")
	f["meldefrist_bis"] = bk.meldefrist_bis(f["schadentag"]) or None
	if d.get("id"):
		k = v.kennung(d.get("id"))
		if not k or not frappe.db.exists(VF, k):
			nicht_gefunden("Versicherungsfall nicht gefunden.")
		x = frappe.get_doc(VF, k)
		if x.status not in bk.VERSICHERUNG_OFFEN:
			konflikt("Abgeschlossene Versicherungsfälle können nicht mehr geändert werden.")
		x.update(f)
		x.save(ignore_permissions=True)
		_log(n, "betrieb_versicherung", "anlage", x.anlage_id, f"Versicherungsfall {x.name} geändert")
		return _vers_json(x)
	a = _anlage(d.get("anlageId"))
	st = v.kennung(d.get("stoerungId"))
	if st:
		if frappe.db.get_value(DT_S, st, "anlage_id") != a.name:
			ungueltig("Störung gehört nicht zu dieser Anlage.")
		if frappe.db.exists(VF, {"stoerung_id": st, "art": f["art"], "status": ["in", list(bk.VERSICHERUNG_OFFEN)]}):
			konflikt("Zu dieser Störung gibt es bereits einen offenen Versicherungsfall dieser Art.")
		if f["ertragsausfall_eur"] is None:
			ea = aus_json(frappe.db.get_value(DT_S, st, "ertragsausfall"), None) or {}
			f["ertragsausfall_eur"] = ea.get("ausfallEur")
	x = frappe.get_doc({"doctype": VF, "anlage_id": a.name, "stoerung_id": st or None, **f, "status": "entwurf", "verlauf": als_json([{"am": iso(jetzt()), "text": f"Angelegt von {name_von(n.id)}"}])}).insert(ignore_permissions=True)
	_log(n, "betrieb_versicherung", "anlage", a.name, f"Versicherungsfall {x.name} angelegt")
	return _vers_json(x)


@frappe.whitelist(methods=["POST"])
def versicherung_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(VF, k):
		nicht_gefunden("Versicherungsfall nicht gefunden.")
	x = frappe.get_doc(VF, k)
	d = _daten(daten)
	if d.get("schadennummer"):
		x.schadennummer = v.text(d.get("schadennummer"), 60)
	neu = v.auswahl(d.get("status"), list(bk.VERSICHERUNG_STATUS), "")
	patch = _fach(bk.versicherung_uebergang, _vers_json(x), neu, {"gemeldetAm": _datum(d.get("gemeldetAm")) or None, "erstattetEur": v.zahl(d.get("erstattetEur"), 0, 1e9), "grund": v.text(d.get("grund"), 300)}, _heute())
	x.status = patch["status"]
	for js, feld in (("gemeldetAm", "gemeldet_am"), ("verspaetet", "verspaetet"), ("erstattetEur", "erstattet_eur"), ("reguliertAm", "reguliert_am"), ("abschlussGrund", "abschluss_grund")):
		if js in patch:
			x.set(feld, patch[js])
	_verlauf(x, f"{bk.VERSICHERUNG_STATUS[neu]} ({name_von(n.id)})" + (" – nach interner Meldefrist" if patch.get("verspaetet") else ""))
	x.save(ignore_permissions=True)
	_log(n, "betrieb_versicherung", "anlage", x.anlage_id, f"Versicherungsfall {x.name}: {neu}")
	return _vers_json(x)


# ================================================================ Wartungspläne


def _plan_durchgefuehrt(plan_id, datum, bericht, dienstleister="", kosten=None):
	p = frappe.get_doc(WP, plan_id)
	p.letzte_durchfuehrung = datum
	p.naechste_faelligkeit = bk.naechste_faelligkeit(str(datum), p.intervall_monate)
	p.save(ignore_permissions=True)
	geplant = frappe.db.get_value("Plattform Wartung", {"anlage_id": p.anlage_id, "art": p.art, "status": "geplant"}, "name")
	w = frappe.get_doc("Plattform Wartung", geplant) if geplant else frappe.get_doc({"doctype": "Plattform Wartung", "anlage_id": p.anlage_id, "art": p.art})
	w.update({"datum": datum, "status": "erledigt", "dienstleister": dienstleister or p.dienstleister or "", "bericht": v.mehrzeilig(bericht, 2000), "naechste_faelligkeit": p.naechste_faelligkeit})
	if kosten is not None:
		w.kosten_eur = kosten
	w.save(ignore_permissions=True) if geplant else w.insert(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def plan_speichern(anlage_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	d = _daten(daten)
	f = {
		"art": v.auswahl(d.get("art"), list(WARTUNG_ARTEN), ""), "bezeichnung": v.text(d.get("bezeichnung"), 200), "intervall_monate": cint(v.zahl(d.get("intervallMonate"), 1, 120) or 0),
		"vorlauf_tage": cint(v.zahl(d.get("vorlaufTage"), 0, 365) if d.get("vorlaufTage") not in (None, "") else 30), "naechste_faelligkeit": _datum(d.get("naechsteFaelligkeit")) or None,
		"norm": v.text(d.get("norm"), 200), "hinweis": v.text(d.get("hinweis"), 300), "dienstleister": v.text(d.get("dienstleister"), 120), "aktiv": 1 if d.get("aktiv") is None or v.wahr(d.get("aktiv")) else 0,
	}
	v.pflicht(f["art"], "Bitte die Art der Wartung wählen.")
	v.pflicht(len(f["bezeichnung"]) >= 3, "Bitte eine Bezeichnung angeben.")
	v.pflicht(f["intervall_monate"] > 0, "Bitte das Intervall in Monaten angeben (1–120).")
	v.pflicht(f["naechste_faelligkeit"], "Bitte die nächste Fälligkeit angeben.")
	if d.get("id"):
		k = v.kennung(d.get("id"))
		if not k or frappe.db.get_value(WP, k, "anlage_id") != a.name:
			nicht_gefunden("Wartungsplan nicht gefunden.")
		p = frappe.get_doc(WP, k)
		p.update(f)
		p.save(ignore_permissions=True)
	else:
		v.pflicht(frappe.db.count(WP, {"anlage_id": a.name}) < 40, "Höchstens 40 Wartungspläne je Anlage.")
		p = frappe.get_doc({"doctype": WP, "anlage_id": a.name, **f}).insert(ignore_permissions=True)
	_log(n, "betrieb_plan", "anlage", a.name, f"Wartungsplan {p.name} gespeichert")
	return _plan_json(p)


@frappe.whitelist(methods=["POST"])
def plan_loeschen(anlage_id=None, id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	k = v.kennung(id)
	if not k or frappe.db.get_value(WP, k, "anlage_id") != a.name:
		nicht_gefunden("Wartungsplan nicht gefunden.")
	if frappe.db.exists(PP, {"plan_id": k}):
		konflikt("Zu diesem Plan gibt es Prüfprotokolle – bitte deaktivieren statt löschen.")
	frappe.delete_doc(WP, k, ignore_permissions=True)
	_log(n, "betrieb_plan", "anlage", a.name, f"Wartungsplan {k} gelöscht")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def plaene_vorschlagen(anlage_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	vorhandene = [_plan_json(p) for p in frappe.get_all(WP, filters={"anlage_id": a.name}, fields=["*"], limit_page_length=0)]
	anzahl = 0
	for p in bk.plan_vorschlag({"land": a.land, "typ": a.typ, "speicherKwh": flt(a.speicher_kwh)}, vorhandene):
		letzte = frappe.get_all("Plattform Wartung", filters={"anlage_id": a.name, "art": p["art"], "status": "erledigt"}, pluck="datum", order_by="datum desc", limit_page_length=1)
		if letzte:
			faellig = bk.naechste_faelligkeit(str(letzte[0]), p["intervallMonate"])
		elif a.inbetriebnahme:
			faellig = bk.naechste_faelligkeit(str(a.inbetriebnahme), p["intervallMonate"])
			while faellig < _heute():
				faellig = bk.naechste_faelligkeit(faellig, p["intervallMonate"])
		else:
			faellig = _heute()
		frappe.get_doc({"doctype": WP, "anlage_id": a.name, "art": p["art"], "bezeichnung": p["bezeichnung"], "intervall_monate": p["intervallMonate"], "vorlauf_tage": p.get("vorlaufTage") or 30, "norm": p.get("norm") or "", "hinweis": p.get("hinweis") or "", "naechste_faelligkeit": faellig, "letzte_durchfuehrung": str(letzte[0]) if letzte else None, "aktiv": 1}).insert(ignore_permissions=True)
		anzahl += 1
	_log(n, "betrieb_plan", "anlage", a.name, f"{anzahl} Wartungspläne aus der Vorlage {a.land} übernommen")
	return {"angelegt": anzahl}


# ================================================================ Prüfprotokolle


def _protokoll_felder(d):
	strings = []
	for s in (d.get("strings") or [])[:200]:
		z = {"bezeichnung": v.text(s.get("bezeichnung"), 40) or "String", "uocV": v.zahl(s.get("uocV"), 0, 2000), "uocSollV": v.zahl(s.get("uocSollV"), 0, 2000), "iscA": v.zahl(s.get("iscA"), 0, 100), "rIsoMOhm": v.zahl(s.get("rIsoMOhm"), 0, 100000)}
		if any(z[k] is not None for k in ("uocV", "iscA", "rIsoMOhm")):
			strings.append(z)
	punkte = {k: v.wahr(w) for k, w in (d.get("punkte") or {}).items() if k in bk.PRUEF_PUNKTE and w not in (None, "")}
	thermo = [{"ort": v.text(t.get("ort"), 80), "deltaK": v.zahl(t.get("deltaK"), 0, 200), "text": v.text(t.get("text"), 200)} for t in (d.get("thermografie") or [])[:200]]
	thermo = [t for t in thermo if t["ort"] or t["deltaK"] is not None]
	maengel = [{"text": v.text(m.get("text"), 300), "schwere": v.auswahl(m.get("schwere"), ["gering", "mittel", "gefahr"], "mittel")} for m in (d.get("maengel") or [])[:100]]
	return {
		"art": v.auswahl(d.get("art"), list(bk.PRUEF_ARTEN), ""), "datum": _datum(d.get("datum")), "pruefer": v.text(d.get("pruefer"), 120), "firma": v.text(d.get("firma"), 120), "norm": v.text(d.get("norm"), 200),
		"einstrahlungWm2": v.zahl(d.get("einstrahlungWm2"), 0, 1500), "strings": strings, "punkte": punkte, "thermografie": thermo, "maengel": [m for m in maengel if len(m["text"]) >= 3], "bemerkung": v.mehrzeilig(d.get("bemerkung"), 2000),
	}


@frappe.whitelist(methods=["POST"])
def protokoll_speichern(anlage_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	d = _daten(daten)
	f = _protokoll_felder(d)
	v.pflicht(f["art"], "Bitte die Art der Prüfung wählen.")
	v.pflicht(f["datum"] and f["datum"] <= _heute(), "Bitte das Prüfdatum angeben (nicht in der Zukunft).")
	v.pflicht(len(f["pruefer"]) >= 3, "Bitte die prüfende Person angeben (Elektrofachkraft).")
	if f["art"] == "thermografie" and f["einstrahlungWm2"] is not None and f["einstrahlungWm2"] < 600:
		ungueltig("Thermografie nach IEC TS 62446-3 erfordert mindestens 600 W/m² Einstrahlung – bitte Messbedingungen prüfen.")
	if f["art"] in ("wiederkehrend", "erstpruefung"):
		v.pflicht(f["strings"] or f["punkte"], "Bitte Messwerte (Strings) bzw. Prüfpunkte erfassen.")
	b = bk.pruefung_bewerten(f["strings"], f["punkte"], f["thermografie"], f["maengel"])
	plan = v.kennung(d.get("planId"))
	if plan and frappe.db.get_value(WP, plan, "anlage_id") != a.name:
		plan = None
	if not plan:
		plan = frappe.db.get_value(WP, {"anlage_id": a.name, "aktiv": 1, "art": bk.PRUEF_WARTUNG_ART[f["art"]]}, "name")
	pk = frappe.get_doc({
		"doctype": PP, "anlage_id": a.name, "plan_id": plan or None, "art": f["art"], "datum": f["datum"], "pruefer": f["pruefer"], "firma": f["firma"], "norm": f["norm"], "einstrahlung_wm2": f["einstrahlungWm2"],
		"ergebnis": b["ergebnis"], "messwerte": als_json({k: f[k] for k in ("strings", "punkte", "thermografie", "maengel")}), "befunde": als_json(b["befunde"]), "bemerkung": f["bemerkung"], "erstellt_von": n.id,
	}).insert(ignore_permissions=True)
	bericht = f"{bk.PRUEF_ARTEN[f['art']]}: {bk.PRUEF_ERGEBNIS[b['ergebnis']]} – {len(b['befunde'])} Befund(e) (Prüfprotokoll {pk.name})"
	if plan:
		_plan_durchgefuehrt(plan, f["datum"], bericht, f["firma"])
	else:
		frappe.get_doc({"doctype": "Plattform Wartung", "anlage_id": a.name, "art": bk.PRUEF_WARTUNG_ART[f["art"]], "datum": f["datum"], "status": "erledigt", "dienstleister": f["firma"], "bericht": bericht}).insert(ignore_permissions=True)
	if b["ergebnis"] != "bestanden":
		from oekoinvest_app.plattform.api.anlagen import stoerung_anlegen_intern

		wichtig = [x for x in b["befunde"] if x["stufe"] != "hinweis"]
		s, _ = stoerung_anlegen_intern(a.name, "manuell", "kritisch" if b["ergebnis"] == "nicht_bestanden" else "mittel", f"Prüfbefund: {'Prüfung nicht bestanden' if b['ergebnis'] == 'nicht_bestanden' else 'Mängel festgestellt'} ({bk.PRUEF_ARTEN[f['art']]})", "\n".join(f"• {x['text']}" for x in wichtig)[:1900], von=n.id)
		pk.db_set("stoerung_id", s.name)
	_log(n, "betrieb_pruefung", "anlage", a.name, f"Prüfprotokoll {pk.name}: {b['ergebnis']}")
	return _protokoll_json(frappe.get_doc(PP, pk.name))


@frappe.whitelist(methods=["POST"])
def protokoll(id=None, als_benutzer=None):  # noqa: A002, F811 – Name wie im Vertrag; kern.protokoll wird als _log genutzt
	n = nutzer(als_benutzer)
	_lese(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(PP, k):
		nicht_gefunden("Prüfprotokoll nicht gefunden.")
	p = frappe.get_doc(PP, k)
	a = frappe.get_doc(DT_A, p.anlage_id)
	return {"protokoll": _protokoll_json(p), "anlage": {**_kurz(a), "bundesland": a.bundesland, "ort": a.ort or "", "eigentuemer": a.get("eigentuemer") or "", "betriebsfuehrer": a.get("betriebsfuehrer") or "", "inbetriebnahme": str(a.inbetriebnahme or "")}, "punkteLabels": bk.PRUEF_PUNKTE}


# ================================================================ Ersatzteile


@frappe.whitelist(methods=["POST"])
def ersatzteil_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	f = {
		"bezeichnung": v.text(d.get("bezeichnung"), 160), "art": v.auswahl(d.get("art"), ["wechselrichter", "modul", "speicher", "zaehler", "datenlogger", "sonstiges"], "sonstiges"), "hersteller": v.text(d.get("hersteller"), 80),
		"artikelnummer": v.text(d.get("artikelnummer"), 60), "einheit": v.text(d.get("einheit"), 20) or "Stück", "mindestbestand": v.zahl(d.get("mindestbestand"), 0, 1e6) or 0,
		"zielbestand": v.zahl(d.get("zielbestand"), 0, 1e6), "lagerort": v.text(d.get("lagerort"), 80), "preis_eur": v.zahl(d.get("preisEur"), 0, 1e7), "bemerkung": v.text(d.get("bemerkung"), 300),
		"aktiv": 1 if d.get("aktiv") is None or v.wahr(d.get("aktiv")) else 0,
	}
	v.pflicht(len(f["bezeichnung"]) >= 3, "Bitte eine Bezeichnung angeben.")
	if d.get("id"):
		k = v.kennung(d.get("id"))
		if not k or not frappe.db.exists(ET, k):
			nicht_gefunden("Ersatzteil nicht gefunden.")
		t = frappe.get_doc(ET, k)
		t.update(f)
		t.save(ignore_permissions=True)
		_log(n, "betrieb_lager", "ersatzteil", t.name, f"Ersatzteil {t.name} geändert")
		return _teil_json(t)
	if f["artikelnummer"] and frappe.db.exists(ET, {"artikelnummer": f["artikelnummer"], "hersteller": f["hersteller"]}):
		konflikt("Dieser Artikel ist bereits angelegt.")
	bestand = v.zahl(d.get("bestand"), 0, 1e6) or 0
	t = frappe.get_doc({"doctype": ET, **f, "bestand": bestand}).insert(ignore_permissions=True)
	if bestand > 0:
		frappe.get_doc({"doctype": EB, "ersatzteil_id": t.name, "art": "zugang", "menge": bestand, "bestand_vor": 0, "bestand_nach": bestand, "von_id": n.id, "am": jetzt(), "bemerkung": "Anfangsbestand"}).insert(ignore_permissions=True)
	_log(n, "betrieb_lager", "ersatzteil", t.name, f"Ersatzteil {t.name} angelegt")
	return _teil_json(t)


@frappe.whitelist(methods=["POST"])
def ersatzteil_bewegung(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(ET, k):
		nicht_gefunden("Ersatzteil nicht gefunden.")
	d = _daten(daten)
	# Sperre gegen parallele Buchungen (Bestand)
	t = frappe.get_doc(ET, k, for_update=True)
	art = v.auswahl(d.get("art"), list(bk.ERSATZTEIL_BEWEGUNG), "")
	menge = v.zahl(d.get("menge"), 0, 1e6)
	neu = _fach(bk.bestand_nach, flt(t.bestand), art, menge)
	anlage_id = stoerung_id = None
	if art == "entnahme":
		st = v.kennung(d.get("stoerungId"))
		if st:
			anlage_id = frappe.db.get_value(DT_S, st, "anlage_id")
			if not anlage_id:
				ungueltig("Störung nicht gefunden.")
			stoerung_id = st
		elif d.get("anlageId"):
			anlage_id = _anlage(d.get("anlageId")).name
		v.pflicht(anlage_id, "Bei einer Entnahme bitte Anlage bzw. Störung angeben (Nachweis, Garantie, Kosten).")
	if art == "korrektur":
		v.pflicht(len(v.text(d.get("bemerkung"), 300)) >= 3, "Bitte die Inventurkorrektur begründen.")
	b = frappe.get_doc({"doctype": EB, "ersatzteil_id": t.name, "art": art, "menge": menge, "bestand_vor": flt(t.bestand), "bestand_nach": neu, "anlage_id": anlage_id, "stoerung_id": stoerung_id, "auftrag_id": v.kennung(d.get("auftragId")) or None, "von_id": n.id, "am": jetzt(), "bemerkung": v.text(d.get("bemerkung"), 300)}).insert(ignore_permissions=True)
	t.db_set("bestand", neu)
	if stoerung_id:
		s = frappe.get_doc(DT_S, stoerung_id)
		verlauf = aus_json(s.verlauf, []) or []
		verlauf.append({"am": iso(jetzt()), "text": f"Ersatzteil entnommen: {menge} × {t.bezeichnung}"})
		s.db_set("verlauf", als_json(verlauf))
	_log(n, "betrieb_lager", "ersatzteil", t.name, f"{bk.ERSATZTEIL_BEWEGUNG[art]}: {menge} (Bestand {neu})")
	return {"teil": _teil_json(frappe.get_doc(ET, t.name)), "bewegung": _bewegung_json(b)}


# ================================================================ Einstrahlung, Freigabe, Bericht


@frappe.whitelist(methods=["POST"])
def einstrahlung_speichern(anlage_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	d = _daten(daten)
	monat = v.monat(d.get("monat"))
	kwh = v.zahl(d.get("kwhM2"), 0, 300)
	quelle = v.text(d.get("quelle"), 120)
	v.pflicht(len(monat) == 7, "Bitte den Monat angeben.")
	v.pflicht(kwh, "Bitte die Einstrahlung in Modulebene in kWh/m² angeben (0–300 je Monat).")
	v.pflicht(len(quelle) >= 3, "Bitte die Quelle angeben (Pyranometer/Referenzzelle vor Ort, Satellitendaten mit Anbieter).")
	name = frappe.db.get_value(KZ, {"anlage_id": a.name, "monat": monat}, "name")
	if name:
		frappe.db.set_value(KZ, name, {"kwh_m2": kwh, "quelle": quelle, "von_id": n.id})
	else:
		frappe.get_doc({"doctype": KZ, "anlage_id": a.name, "monat": monat, "kwh_m2": kwh, "quelle": quelle, "von_id": n.id}).insert(ignore_permissions=True)
	_log(n, "betrieb_einstrahlung", "anlage", a.name, f"Einstrahlung {monat}: {kwh} kWh/m²")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def monatswert_freigeben(anlage_id=None, daten=None, als_benutzer=None):
	"""Befund berechnet die Website (Monitoring, Prognose); die Eichfrist prüft Frappe selbst (409), Auffälliges nur mit Begründung (422)."""
	n = nutzer(als_benutzer)
	_schreib(n)
	a = _anlage(anlage_id)
	d = _daten(daten)
	mp = v.kennung(d.get("messpunktId"))
	m = frappe.db.get_value("Plattform Messpunkt", mp, ["name", "anlage_id", "abrechnungsrelevant", "eichgueltig_bis", "zaehlernummer"], as_dict=True) if mp else None
	if not m or m.anlage_id != a.name or not cint(m.abrechnungsrelevant):
		ungueltig("Abrechnungsrelevanter Messpunkt nicht gefunden.")
	monat = str(d.get("monat") or "")[:7]
	register = str(d.get("register") or "")
	befund = d.get("befund") or {}
	eigen = bk.plausibilisieren(monat, 0, eichgueltig_bis=str(m.eichgueltig_bis or ""))
	gesamt = {"eichFehler": eigen["eichFehler"] or bool(befund.get("eichFehler")), "stufe": "fehler" if eigen["eichFehler"] else v.auswahl(befund.get("stufe"), ["ok", "hinweis", "warnung", "fehler"], "ok")}
	_fach(bk.freigabe_pruefen, gesamt, d.get("begruendung"))
	vorhanden = frappe.db.get_value("Plattform Zaehlerstand Monatswert", {"messpunkt_id": m.name, "register": register, "monat": monat}, ["name", "stand", "quelle"], as_dict=True)
	stand = flt(vorhanden.stand) if vorhanden else v.zahl(d.get("stand"), 0, 1e12)
	v.pflicht(stand is not None, "Zählerstand fehlt.")
	from oekoinvest_app.plattform.api.anlagen import eintrag_speichern

	e = eintrag_speichern(anlageId=a.name, art="monatswert", id=vorhanden.name if vorhanden else None, daten={"messpunktId": m.name, "register": register, "monat": monat, "stand": stand, "quelle": (vorhanden.quelle if vorhanden else "") or "Messstellenbetreiber", "geprueft": True}, als_benutzer=n.id)
	frappe.get_doc({"doctype": ZF, "anlage_id": a.name, "monatswert_id": (e or {}).get("id"), "messpunkt_id": m.name, "register": register, "monat": monat, "stand": stand, "stufe": gesamt["stufe"], "befunde": als_json([v.text(b.get("text"), 300) for b in (befund.get("befunde") or [])[:10]]), "begruendung": v.mehrzeilig(d.get("begruendung"), 1000), "von_id": n.id, "am": jetzt()}).insert(ignore_permissions=True)
	_log(n, "betrieb_zaehler", "anlage", a.name, f"Monatswert {m.zaehlernummer}/{register} {monat} freigegeben ({gesamt['stufe']})")
	return {"ok": True, "monatswert": e}


@frappe.whitelist(methods=["POST"])
def bericht_daten(anlage_id=None, von=None, bis=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	a = _anlage(anlage_id)
	v0, b0 = str(von or "")[:10], str(bis or "")[:10]
	v.pflicht(_datum(v0) and _datum(b0) and v0 < b0, "Ungültiger Zeitraum.")
	stoerungen = frappe.get_all(DT_S, filters={"anlage_id": a.name, "erkannt_am": ["<", b0]}, pluck="name", limit_page_length=1000)
	tickets = []
	for x in stoerungen:
		s = frappe.get_doc(DT_S, x)
		if s.behoben_am and str(s.behoben_am)[:10] < v0:
			continue
		tickets.append(_ticket_json(s))
	c = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": a.name}, ["strompreis_ct", "grundgebuehr_monat", "status"], as_dict=True)
	return {
		"anlage": {**_kurz(a), "bundesland": a.bundesland, "ort": a.ort or "", "inbetriebnahme": str(a.inbetriebnahme or ""), "status": a.status, "speicherKwh": flt(a.speicher_kwh), "eigentuemer": a.get("eigentuemer") or "", "betriebsfuehrer": a.get("betriebsfuehrer") or "", "organisation": frappe.db.get_value("Plattform Organisation", a.organisation_id, "titel") if a.organisation_id else ""},
		"tickets": tickets,
		"wartungen": [{"id": w.name, "art": w.art, "datum": str(w.datum), "status": w.status, "dienstleister": w.dienstleister or "", "bericht": w.bericht or ""} for w in frappe.get_all("Plattform Wartung", filters={"anlage_id": a.name, "datum": ["between", [v0, b0]]}, fields=["name", "art", "datum", "status", "dienstleister", "bericht"], limit_page_length=0) if str(w.datum) < b0],
		"protokolle": [_protokoll_json(p) for p in frappe.get_all(PP, filters={"anlage_id": a.name, "datum": [">=", v0]}, fields=["*"], limit_page_length=0) if str(p.datum) < b0],
		"auftraege": [_auftrag_json(x) for x in frappe.get_all(SA, filters={"anlage_id": a.name, "creation": [">=", v0]}, fields=["*"], limit_page_length=0)],
		"versicherungen": [_vers_json(x) for x in frappe.get_all(VF, filters={"anlage_id": a.name}, fields=["*"], limit_page_length=0) if x.status in bk.VERSICHERUNG_OFFEN or str(x.creation)[:10] >= v0],
		"einstrahlung": [{"monat": x.monat, "kwhM2": flt(x.kwh_m2), "quelle": x.quelle or ""} for x in frappe.get_all(KZ, filters={"anlage_id": a.name}, fields=["monat", "kwh_m2", "quelle"], limit_page_length=0)],
		"fristen": [f for f in _fristen(a) if f["stufe"] != "spaeter"],
		"vertrag": {"strompreisCt": flt(c.strompreis_ct), "grundgebuehrMonat": flt(c.grundgebuehr_monat), "status": c.status} if c else None,
		"ersteller": name_von(n.id),
	}


# ================================================================ Lauf (Scheduler)


def _lauf(n=None):
	e = frappe.get_single(ES)
	alarme = aus_json(e.alarme, {}) or {}
	erg = {"fristen": 0, "sla": 0, "lager": 0}
	z = _zustaendig()
	heute = _heute()

	def einmal(key):
		if key in alarme:
			return False
		alarme[key] = iso(jetzt())
		return True

	for name in frappe.get_all(DT_A, filters={"status": ["!=", "rueckbau"]}, pluck="name", limit_page_length=0):
		a = frappe.get_doc(DT_A, name)
		for f in _fristen(a):
			relevant = f["stufe"] in ("ueberfaellig", "dringend", "fehlt") or (f["art"] == "wartung" and f["tage"] is not None and f["tage"] <= cint(frappe.db.get_value(WP, f["bezug"]["id"], "vorlauf_tage") or 30))
			if not relevant or not einmal(f"frist|{f['bezug']['art']}|{f['bezug']['id']}|{f['datum']}|{'u' if f['stufe'] == 'ueberfaellig' else 'v'}"):
				continue
			erg["fristen"] += 1
			_aufgabe(f"{a.titel}: {f['titel']}", f"Frist {f['art']} – Stand: {f['stufe']}.\nBetriebsführung: /portal/admin/anlagen/betrieb/{a.name}", f["datum"] if f["datum"] and f["datum"] > heute else heute, z)
	for x in frappe.get_all(DT_S, filters={"status": ["in", STOERUNG_OFFEN]}, fields=["name", "anlage_id", "schwere", "erkannt_am", "creation", "quittiert_am", "behoben_am", "zustaendig_id", "titel"], limit_page_length=0):
		sla = bk.sla_status(_stoerung_dict(x))
		if not sla or sla["ampel"] != "rot":
			continue
		teil = "reaktion" if sla["reaktion"] and sla["reaktion"]["verletzt"] and not sla["reaktion"]["erledigt"] else "loesung"
		if not einmal(f"sla|{x.name}|{teil}"):
			continue
		erg["sla"] += 1
		titel = frappe.db.get_value(DT_A, x.anlage_id, "titel") or x.anlage_id
		for konto in ([x.zustaendig_id] if x.zustaendig_id else _betrieb_konten(True)):
			benachrichtigen(konto, "stoerung", f"SLA verletzt: {titel}", f"{'Reaktionszeit' if teil == 'reaktion' else 'Lösungszeit'} überschritten – {x.titel}", f"/portal/admin/anlagen/betrieb/stoerung/{x.name}", "anlage", x.anlage_id, mail=False)
		for konto in aktive_admins():
			if "leitung" in str(frappe.db.get_value("Plattform Konto", konto, "backoffice_rollen") or ""):
				benachrichtigen(konto, "aufgabe", f"SLA verletzt: {titel}", x.titel, f"/portal/admin/anlagen/betrieb/stoerung/{x.name}", "anlage", x.anlage_id, mail=False)
	for t in frappe.get_all(ET, filters={"aktiv": 1}, fields=["*"], limit_page_length=0):
		nb = bk.nachbestellung(_teil_json(t))
		if not nb or not einmal(f"lager|{t.name}|{flt(t.bestand)}"):
			continue
		erg["lager"] += 1
		_aufgabe(f"Ersatzteil nachbestellen: {t.bezeichnung}", f"{nb['grund']}. Vorschlag: {nb['menge']} {t.einheit or 'Stück'}" + (f" (Art.-Nr. {t.artikelnummer})" if t.artikelnummer else "") + ".", heute, z)
	if len(alarme) > 5000:
		alarme = dict(list(alarme.items())[-5000:])
	frappe.db.set_single_value(ES, "alarme", als_json(alarme))
	frappe.db.set_single_value(ES, "lauf_am", jetzt())
	return erg


@frappe.whitelist(methods=["POST"])
def lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	erg = _lauf(n)
	_log(n, "betrieb_lauf", "anlage", "lauf", f"Betriebsführung: {erg['fristen']} Fristen, {erg['sla']} SLA-Verletzungen, {erg['lager']} Nachbestellungen")
	return erg


def lauf_taeglich():
	"""Scheduler (täglich): Fristen, SLA-Verletzungen, Nachbestellungen."""
	_lauf()
	frappe.db.commit()
