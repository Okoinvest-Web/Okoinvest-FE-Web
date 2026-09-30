# Copyright (c) 2026, ÖkoInvest GmbH
#
# Investor-Portfolio nach dem Kauf – Vertrag: docs/API.md, Abschnitt „Portfolio“. Referenz: src/lib/plattform/backend/demo/portfolio.js.
# Regeln: plattform/portfolio_kern.py (1:1 wie portfolio/kern.js).
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Investor   – nur eigene Positionen (investor_id) bzw. Positionen seiner Organisation (Teamrolle; „Nur lesen“ ohne Aktionen)
#   Backoffice – Rolle admin mit Bereich „portfolio“ (rechte.py): lesen ≥ 1, schreiben = 2
# KYC: Kapitalabrufe und Ausschüttungen nur an verifizierte Investoren (kyc_kern.kyc_status) – sonst 409 (Code „kyc“).
# Positionen aus vollzogenen Closings werden beim Lesen übernommen (Käufer = Investor), Status folgt der Übergabe-Checkliste.
# Daten: Plattform Portfolio Position (Monatserträge, Dokumente, Wiederverkauf, Verlauf als JSON), Plattform Kapitalabruf,
# Plattform Ausschuettung (beide unveränderlich bis auf Status/Storno), Dateien privat als File an der Position.

import base64
import binascii
import secrets

import frappe
from frappe.utils import cint, flt, nowdate

from oekoinvest_app.plattform import portfolio_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt_iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Portfolio Position"
DT_ABRUF = "Plattform Kapitalabruf"
DT_AUS = "Plattform Ausschuettung"
BEREICH = "portfolio"
LABEL = "Portfolio & Beteiligungen"
MIME = {b"%PDF-": "application/pdf", b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}
DOK_ARTEN = ["jahresabschluss", "steuer", "bericht", "vertrag", "gesellschafter", "sonstiges"]
TYPEN = {"freiflaeche": "Freiflächen-PV", "agri": "Agri-PV", "carport": "Solarcarport / Parkplatz", "speicher": "Batteriegroßspeicher", "hybrid": "PV mit Speicher", "dach": "Dach-PV (Gewerbe/Halle)"}
LAENDER = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz"}
UEBERGABE_PUNKTE = ["unterlagen", "zugaenge", "vertraege", "netzbetreiber", "direktvermarkter", "behoerden", "grundbuch"]  # wie closing/closing.js


# ================================================================ Rechte / Hilfen


def _bo_lesen(n):
	return bool(n) and ist_admin(n) and stufe(n, BEREICH) >= 1


def _bo_schreiben(n):
	return bool(n) and ist_admin(n) and stufe(n, BEREICH) >= 2


def _schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _bo_schreiben(n):
		verboten(f"Ihre Backoffice-Rolle erlaubt im Bereich „{LABEL}“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice.")


def _lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice.")


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.PortfolioFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _heute():
	return nowdate()


def _letzter_monat():
	return K.monat_plus(_heute()[:7], -1)


def _rolle(n, doc):
	if not n or not doc:
		return None
	if _bo_lesen(n):
		return "backoffice"
	if "investor" not in (n.get("rollen") or []):
		return None
	if doc.investor_id == n.id:
		return "investor"
	if doc.organisation_id:
		from oekoinvest_app.plattform.organisation import darf_team_schreiben, team_rolle

		r = team_rolle(n.id, doc.organisation_id)
		if r:
			return "investor" if darf_team_schreiben(r) else "leser"
	return None


def _laden(n, kennung_):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung_)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Position nicht gefunden.")
	doc = frappe.get_doc(DT, k)
	rolle = _rolle(n, doc)
	if not rolle:
		nicht_gefunden("Position nicht gefunden.")
	return doc, rolle


def _verlauf(doc, n, text, oeffentlich=False):
	liste = aus_json(doc.verlauf, []) or []
	liste.append({"am": jetzt_iso(), "vonId": (n.get("id") if n else None), "text": v.text(text, 300), "oeffentlich": bool(oeffentlich)})
	doc.verlauf = als_json(liste[-300:])


def _melden(konto_id, titel, text, link, objekt_id, mail=True, mail_text=None, mail_betreff=None, art="portfolio"):
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	anlegen(konto_id, art, titel, text, link, "portfolio", objekt_id, mail=mail, mail_text=mail_text, mail_betreff=mail_betreff)


def _empfaenger(doc):
	ids = [doc.investor_id]
	if doc.organisation_id:
		for m in frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": doc.organisation_id, "rolle": ["in", ["inhaber", "admin"]]}, pluck="nutzer_id"):
			if m not in ids:
				ids.append(m)
	return ids


def _investor_melden(doc, titel, text, mail=True, mail_betreff=None, mail_text=None):
	for k in _empfaenger(doc):
		_melden(k, titel, text, f"/portal/portfolio/{doc.name}", doc.name, mail=mail, mail_betreff=mail_betreff, mail_text=mail_text)


def _backoffice_melden(titel, text, objekt_id):
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins
	from oekoinvest_app.plattform.kern import konto_json

	gemeldet = 0
	for k in aktive_admins()[:50]:
		n = frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k)))
		if stufe(n, BEREICH) >= 2:
			_melden(k, titel, text, f"/portal/admin/portfolio/{objekt_id}", objekt_id, mail=False, art="status")
			gemeldet += 1
			if gemeldet >= 5:
				break


def _kyc_pruefen(doc, text):
	from oekoinvest_app.plattform.kyc_kern import kyc_status

	s = kyc_status(doc.investor_id, doc.organisation_id) if doc.organisation_id else kyc_status(doc.investor_id)
	if not s.get("verifiziert") and doc.organisation_id:
		s = kyc_status(doc.investor_id)
	if not s.get("verifiziert"):
		from oekoinvest_app.plattform.kyc_kern import _kyc_fehler

		frappe.throw(text, _kyc_fehler())  # 409, Website-Code „kyc“


# ================================================================ Abbildung Doc ↔ dict (camelCase wie Website)


def _pos_dict(doc):
	return {
		"id": doc.name, "art": doc.art, "status": doc.status, "titel": doc.titel, "typ": doc.typ or "freiflaeche", "land": doc.land or "DE", "bundesland": doc.bundesland or "",
		"mwp": flt(doc.mwp) or None, "spvName": doc.spv_name or "", "anteilProzent": flt(doc.anteil_prozent) or 100, "struktur": doc.struktur or "", "kaufpreis": flt(doc.kaufpreis),
		"kaufdatum": str(doc.kaufdatum or ""), "inbetriebnahme": doc.inbetriebnahme or "", "zusage": flt(doc.zusage), "investorId": doc.investor_id, "organisationId": doc.organisation_id or None,
		"closingId": doc.closing_id or None, "projektId": doc.projekt_id or None, "entwicklungId": doc.entwicklung_id or None, "boerseProjektId": doc.boerse_projekt_id or None,
		"p50KwhJahr": flt(doc.p50_kwh_jahr) or None, "verguetungCt": flt(doc.verguetung_ct) or None, "opexJahr": flt(doc.opex_jahr) or None, "schuldendienstJahr": flt(doc.schuldendienst_jahr) or None,
		"degradation": doc.degradation if doc.degradation not in (None, "") and flt(doc.degradation) else None, "dscrLockup": flt(doc.dscr_lockup) or None, "dscrDefault": flt(doc.dscr_default) or None,
		"wiederverkauf": aus_json(doc.wiederverkauf, None), "notizIntern": doc.notiz_intern or "", "verlauf": aus_json(doc.verlauf, []) or [], "geaendertAm": iso(doc.modified),
	}


def _abrufe(pos_id):
	zeilen = frappe.get_all(DT_ABRUF, filters={"position_id": pos_id}, fields=["name", "nummer", "betrag", "zweck", "meilenstein", "angekuendigt_am", "faellig_am", "status", "gemeldet_am", "referenz", "bezahlt_am", "storniert_am", "grund", "erinnert"], order_by="nummer asc", limit_page_length=500)
	return [{
		"id": z.name, "nummer": cint(z.nummer), "betrag": flt(z.betrag), "zweck": z.zweck or "", "meilenstein": z.meilenstein or "", "angekuendigtAm": str(z.angekuendigt_am or ""),
		"faelligAm": str(z.faellig_am or ""), "status": z.status, "gemeldetAm": str(z.gemeldet_am or ""), "referenz": z.referenz or "", "bezahltAm": str(z.bezahlt_am or ""),
		"storniertAm": str(z.storniert_am or ""), "grund": z.grund or "", "erinnert": aus_json(z.erinnert, {}) or {},
	} for z in zeilen]


def _ausschuettungen(pos_id):
	zeilen = frappe.get_all(DT_AUS, filters={"position_id": pos_id}, fields=["name", "art", "periode", "betrag", "datum", "status", "bank_zustimmung", "notiz"], order_by="datum desc", limit_page_length=1000)
	return [{"id": z.name, "art": z.art, "periode": z.periode, "betrag": flt(z.betrag), "datum": str(z.datum or ""), "status": z.status, "bankZustimmung": bool(cint(z.bank_zustimmung)), "notiz": z.notiz or ""} for z in zeilen]


def _abruf_ausgabe(a, rolle, heute):
	s = K.ABRUF_STATUS.get(a["status"], (a["status"], "neutral"))
	return {**{k: w for k, w in a.items() if k != "erinnert"}, "statusLabel": s[0], "statusTon": s[1], "verzugTage": K.abruf_verzug(a, heute), "darfMelden": rolle == "investor" and a["status"] == "angekuendigt"}


def _entwicklung(doc):
	if not doc.entwicklung_id or not frappe.db.exists("Plattform Entwicklungsprojekt", doc.entwicklung_id):
		return None
	p = frappe.get_doc("Plattform Entwicklungsprojekt", doc.entwicklung_id)
	ms = frappe.get_all("Plattform Entwicklung Meilenstein", filters={"projekt_id": p.name}, fields=["name", "titel", "extern_titel", "status", "phase", "kategorie", "soll_ende", "ist_ende", "reihenfolge"], order_by="reihenfolge asc", limit_page_length=500)
	relevant = [m for m in ms if m.extern_titel or m.phase in ("netz", "genehmigung", "cod", "bau") or m.kategorie == "meilenstein"][:14] or ms[:14]
	erledigt = len([m for m in ms if m.status in ("erledigt", "entfaellt")])
	return {
		"id": p.name, "titel": p.titel, "phase": p.phase or "", "status": p.status or "", "zielCod": p.ziel_cod or "", "fortschritt": round(erledigt / len(ms) * 100) if ms else 0,
		"meilensteine": [{"id": m.name, "titel": m.extern_titel or m.titel, "status": m.status, "sollEnde": str(m.soll_ende or ""), "istEnde": str(m.ist_ende or "")} for m in relevant],
		"link": f"/portal/entwicklung/{p.name}",
	}


def _ausgabe(n, doc, detail=False):
	rolle = _rolle(n, doc)
	bo = rolle == "backoffice"
	heute = _heute()
	pos = _pos_dict(doc)
	abrufe = _abrufe(doc.name)
	aus = _ausschuettungen(doc.name)
	ertraege = aus_json(doc.ertraege, []) or []
	bis = _letzter_monat()
	ertrag = K.ertrag_auswertung(pos, ertraege, bis) if pos["p50KwhJahr"] else None
	covenant = K.covenant_auswertung(pos, ertraege, bis)
	kennzahlen = K.cashflow_kennzahlen(pos, abrufe, aus, heute)
	offen = [a for a in abrufe if a["status"] in K.ABRUF_OFFEN]
	st = K.STATUS.get(doc.status, (doc.status, "neutral"))
	basis = {
		"id": doc.name, "art": doc.art, "artLabel": K.ARTEN.get(doc.art), "status": doc.status, "statusLabel": st[0], "statusTon": st[1], "titel": doc.titel, "typ": pos["typ"],
		"typLabel": TYPEN.get(pos["typ"], pos["typ"]), "land": pos["land"], "landLabel": LAENDER.get(pos["land"], pos["land"]), "bundesland": pos["bundesland"], "mwp": pos["mwp"],
		"spvName": pos["spvName"], "anteilProzent": pos["anteilProzent"], "struktur": pos["struktur"], "kaufpreis": pos["kaufpreis"], "kaufdatum": pos["kaufdatum"], "inbetriebnahme": pos["inbetriebnahme"],
		"zusage": pos["zusage"], "kennzahlen": kennzahlen, "ertragAmpel": (ertrag or {}).get("ampel", "grau"), "ertragAbw12": ((ertrag or {}).get("summe12") or {}).get("abw"),
		"covenantAmpel": covenant["ampel"], "dscr": covenant["dscr"], "offeneAbrufe": len(offen), "offenerAbrufBetrag": sum(a["betrag"] for a in offen),
		"naechsteFaelligkeit": sorted(a["faelligAm"] for a in offen)[0] if offen else "", "ueberfaellig": any(K.abruf_verzug(a, heute) > 0 for a in offen), "meineRolle": rolle, "geaendertAm": pos["geaendertAm"],
	}
	if bo:
		basis["investor"] = {"id": doc.investor_id, "anzeige": " – ".join(x for x in [frappe.db.get_value("Plattform Konto", doc.investor_id, "firma") or "", name_von(doc.investor_id)] if x)}
	if not detail:
		return basis
	uebergabe = None
	if doc.closing_id and frappe.db.exists("Plattform Closing", doc.closing_id):
		ue = aus_json(frappe.db.get_value("Plattform Closing", doc.closing_id, "uebergabe"), []) or []
		uebergabe = {"closingId": doc.closing_id, "erledigt": len([u for u in ue if u.get("erledigt")]), "gesamt": len(UEBERGABE_PUNKTE), "link": f"/portal/admin/closing/{doc.closing_id}" if bo else f"/portal/closing/{doc.closing_id}"}
	wv = pos["wiederverkauf"]
	if wv:
		wv = {**wv, "strukturLabel": K.WV_STRUKTUREN.get(wv.get("struktur"))}
		if doc.boerse_projekt_id and frappe.db.exists("Plattform Projekt", doc.boerse_projekt_id):
			bp = frappe.db.get_value("Plattform Projekt", doc.boerse_projekt_id, ["name", "titel", "status", "provision_akzeptiert", "slug"], as_dict=True)
			wv["boerse"] = {"id": bp.name, "titel": bp.titel, "status": bp.status, "provisionAkzeptiert": bool(bp.provision_akzeptiert), "slug": bp.slug}
		else:
			wv["boerse"] = None
	dokumente = [d for d in (aus_json(doc.dokumente, []) or []) if bo or d.get("freigabe")]
	verlauf = pos["verlauf"] if bo else [{"am": e.get("am"), "text": e.get("text")} for e in pos["verlauf"] if e.get("oeffentlich")]
	boerse_offen = bool(wv and wv.get("boerse") and not wv["boerse"]["provisionAkzeptiert"])
	return {
		**basis,
		"closingId": pos["closingId"], "projektId": pos["projektId"], "entwicklungId": pos["entwicklungId"],
		"stammdaten": {k: pos[k] for k in ("p50KwhJahr", "verguetungCt", "opexJahr", "schuldendienstJahr", "degradation", "dscrLockup", "dscrDefault")},
		"ertrag": ertrag, "covenant": covenant,
		"abrufe": [_abruf_ausgabe(a, rolle, heute) for a in abrufe],
		"ausschuettungen": [{**a, "artLabel": K.AUSSCHUETTUNG_ARTEN.get(a["art"], (a["art"],))[0], "notiz": a["notiz"] if bo else None, "quellensteuer": K.quellensteuer_hinweis(pos["land"], a["art"])} for a in aus],
		"dokumente": sorted([{"id": d["id"], "name": d["name"], "art": d.get("art"), "groesse": d.get("groesse"), "am": d.get("am"), "freigabe": bool(d.get("freigabe")), "link": f"/api/admin/portfolio/dokumente/{d['id']}" if bo else f"/api/portal/portfolio/dokumente/{d['id']}"} for d in dokumente], key=lambda d: str(d["am"]), reverse=True),
		"entwicklung": _entwicklung(doc), "uebergabe": uebergabe, "wiederverkauf": wv,
		"steuer": K.steuer_hinweise(pos["land"]), "perioden": K.perioden_auswahl(pos, heute), "periodeStandard": {"quartal": K.periode_standard("quartal", heute), "jahr": K.periode_standard("jahr", heute)},
		"verlauf": verlauf, "notizIntern": pos["notizIntern"] if bo else None, "uebergaenge": K.UEBERGAENGE.get(doc.status, []) if bo else [],
		"darf": {
			"schreiben": _bo_schreiben(n), "melden": rolle == "investor", "wiederverkauf": rolle == "investor" and doc.status in ("betrieb", "bau"),
			"zurueckziehen": rolle == "investor" and doc.status == "verkauf_angefragt", "provision": rolle == "investor" and doc.status == "verkauf_boerse" and boerse_offen,
		},
	}


# ================================================================ Abgleich mit Closing und Börse


def _abgleichen():
	"""Vollzogene Closings → Positionen; Übergabe vollständig → Betrieb/Bau; Börsen-Wiederverkauf verkauft → Position verkauft."""
	vorhanden = set(frappe.get_all(DT, filters={"closing_id": ["is", "set"]}, pluck="closing_id"))
	for c in frappe.get_all("Plattform Closing", filters={"status": "vollzogen"}, fields=["name", "projekt_id", "interesse_id", "kaeufer_id", "land", "struktur", "kaufpreis", "spv_name", "anteil_prozent", "vollzogen_am", "uebergabe"], limit_page_length=2000):
		ue = aus_json(c.uebergabe, []) or []
		if c.name not in vorhanden:
			p = frappe.get_doc("Plattform Projekt", c.projekt_id) if c.projekt_id and frappe.db.exists("Plattform Projekt", c.projekt_id) else None
			pd = {"titel": p.titel, "typ": p.typ, "land": p.land, "bundesland": p.bundesland, "mwp": p.mwp, "phase": p.phase, "netzanschluss": p.netzanschluss, "codGeplant": p.cod_geplant, "vertraulich": aus_json(p.vertraulich, {}) or {}, "datenblatt": aus_json(p.get("datenblatt"), {}) or {}} if p else {}
			x = K.position_aus_closing({"id": c.name, "projektId": c.projekt_id, "land": c.land, "struktur": c.struktur, "kaufpreis": flt(c.kaufpreis), "spvName": c.spv_name, "anteilProzent": flt(c.anteil_prozent), "vollzogenAm": str(c.vollzogen_am or "")}, pd)
			org = frappe.db.get_value("Plattform Interesse", c.interesse_id, "organisation_id") if c.interesse_id else None
			doc = frappe.get_doc({
				"doctype": DT, "titel": x["titel"], "art": x["art"], "status": "uebernahme", "investor_id": c.kaeufer_id, "organisation_id": org or None, "typ": x["typ"], "land": x["land"], "bundesland": x["bundesland"],
				"mwp": x["mwp"], "spv_name": x["spvName"], "anteil_prozent": x["anteilProzent"], "struktur": x["struktur"], "kaufpreis": x["kaufpreis"], "kaufdatum": x["kaufdatum"] or None,
				"inbetriebnahme": x["inbetriebnahme"], "zusage": 0, "closing_id": c.name, "projekt_id": c.projekt_id, "p50_kwh_jahr": x["p50KwhJahr"], "verguetung_ct": x["verguetungCt"], "opex_jahr": x["opexJahr"],
				"ertraege": "[]", "dokumente": "[]", "verlauf": "[]",
			})
			_verlauf(doc, None, f"Aus dem Closing {c.name} übernommen – Übergabe läuft.", True)
			doc.insert(ignore_permissions=True)
			_investor_melden(doc, f"Neu im Portfolio: {doc.titel}", "Nach dem Closing finden Sie die Position mit Übergabestand, Dokumenten und später Ertrag und Ausschüttungen im Portfolio.", mail_betreff="Neue Position im Portfolio – ÖkoInvest", mail_text="Ein abgeschlossener Kauf wurde in Ihr Portfolio übernommen. Details finden Sie im Portal.")
		for name in frappe.get_all(DT, filters={"closing_id": c.name, "status": "uebernahme"}, pluck="name"):
			doc = frappe.get_doc(DT, name)
			nach = K.status_nach_uebergabe(doc.art, ue, UEBERGABE_PUNKTE)
			if nach != "uebernahme":
				doc.status = nach
				if nach == "betrieb" and not doc.inbetriebnahme:
					doc.inbetriebnahme = str(c.vollzogen_am or _heute())[:7]
				_verlauf(doc, None, f"Übergabe abgeschlossen – Status „{K.STATUS[nach][0]}“.", True)
				doc.save(ignore_permissions=True)
				_investor_melden(doc, f"Übergabe abgeschlossen: {doc.titel}", "Die Übergabe-Checkliste ist vollständig. Monatliche Erträge und Berichte folgen im Portfolio.", mail=False)
	for name in frappe.get_all(DT, filters={"status": "verkauf_boerse", "boerse_projekt_id": ["is", "set"]}, pluck="name"):
		doc = frappe.get_doc(DT, name)
		if frappe.db.get_value("Plattform Projekt", doc.boerse_projekt_id, "status") == "verkauft":
			doc.status = "verkauft"
			_verlauf(doc, None, "Wiederverkauf über die Projektbörse abgeschlossen.", True)
			doc.save(ignore_permissions=True)


# ================================================================ Investor


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	_abgleichen()
	if _bo_lesen(n):
		namen = frappe.get_all(DT, pluck="name", order_by="modified desc", limit_page_length=2000)
	else:
		namen = set(frappe.get_all(DT, filters={"investor_id": n.id}, pluck="name"))
		from oekoinvest_app.plattform.organisation import organisationen_ids

		orgs = organisationen_ids(n.id)
		if orgs:
			namen |= set(frappe.get_all(DT, filters={"organisation_id": ["in", orgs]}, pluck="name"))
	liste = [x for x in (_ausgabe(n, frappe.get_doc(DT, k)) for k in namen) if x["meineRolle"]]
	aktiv = [x for x in liste if x["status"] in K.AKTIV]
	summe = lambda f: sum((f(x) or 0) for x in aktiv)  # noqa: E731
	liste.sort(key=lambda x: (K.AKTIV.index(x["status"]) if x["status"] in K.AKTIV else 99, x["geaendertAm"] or ""))
	return {
		"positionen": liste,
		"kennzahlen": {
			"anzahl": len(aktiv), "mwp": round(summe(lambda x: (x["mwp"] or 0) * (x["anteilProzent"] or 100) / 100), 2), "paidIn": summe(lambda x: x["kennzahlen"]["paidIn"]),
			"ausgeschuettet": summe(lambda x: x["kennzahlen"]["ausgeschuettet"]), "ausgeschuettet12": summe(lambda x: x["kennzahlen"]["ausgeschuettet12"]), "offeneZusage": summe(lambda x: x["kennzahlen"]["zusage"]["offen"]),
			"offeneAbrufe": summe(lambda x: x["offeneAbrufe"]), "offenerAbrufBetrag": summe(lambda x: x["offenerAbrufBetrag"]),
			"warnungen": len([x for x in aktiv if x["ueberfaellig"] or x["covenantAmpel"] in ("gelb", "rot") or x["ertragAmpel"] == "rot"]),
		},
	}


@frappe.whitelist(methods=["POST"])
def position(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	doc, _ = _laden(n, id)
	return _ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def portal_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) if isinstance(daten, str) else (daten or {})
	aktion = d.get("aktion")
	if aktion not in ("abruf_melden", "wiederverkauf", "wiederverkauf_zurueck", "provision_akzeptieren"):
		ungueltig("Unbekannte Aktion.")
	doc, rolle = _laden(n, id)
	if rolle != "investor":
		verboten("Mit der Teamrolle „Nur lesen“ sind keine Aktionen möglich." if rolle == "leser" else "Nur für den Investor.")
	heute = _heute()
	if aktion == "abruf_melden":
		k = v.kennung(d.get("abrufId"))
		if not k or frappe.db.get_value(DT_ABRUF, k, "position_id") != doc.name:
			nicht_gefunden("Kapitalabruf nicht gefunden.")
		a = frappe.get_doc(DT_ABRUF, k)
		neu = _fach(K.abruf_aktion, {"status": a.status}, "melden", {"referenz": v.text(d.get("referenz"), 80)}, heute, "investor")
		a.status, a.gemeldet_am, a.referenz = neu["status"], neu["gemeldetAm"], neu["referenz"]
		a.save(ignore_permissions=True)
		_verlauf(doc, n, f"Zahlung zu Kapitalabruf Nr. {a.nummer} gemeldet{f' (Referenz {a.referenz})' if a.referenz else ''}.", True)
		_backoffice_melden(f"Kapitalabruf Nr. {a.nummer}: Zahlung gemeldet", f"{doc.titel} – bitte Zahlungseingang prüfen.", doc.name)
	elif aktion == "wiederverkauf":
		pos = _pos_dict(doc)
		wv = _fach(K.wiederverkauf_pruefen, pos, {**d, "grund": v.mehrzeilig(d.get("grund"), 600)}, heute)
		_fach(K.uebergang_pruefen, doc.status, "verkauf_angefragt")
		doc.wiederverkauf = als_json({**wv, "vonId": n.id})
		doc.status = "verkauf_angefragt"
		_verlauf(doc, n, f"Wiederverkauf angefragt ({K.WV_STRUKTUREN[wv['struktur']]}, {wv['anteilProzent']:g} %, ab {wv['zeitpunkt']}).", True)
		_backoffice_melden(f"Wiederverkauf angefragt: {doc.titel}", "Bitte Preisindikation prüfen und den Börsen-Entwurf vorbereiten.", doc.name)
	elif aktion == "wiederverkauf_zurueck":
		if doc.status != "verkauf_angefragt":
			konflikt("Nur eine offene Anfrage kann zurückgezogen werden.")
		wv = aus_json(doc.wiederverkauf, {}) or {}
		doc.status = wv.get("vorherStatus") if wv.get("vorherStatus") in ("betrieb", "bau") else "betrieb"
		doc.wiederverkauf = als_json({**wv, "zurueckgezogenAm": heute})
		_verlauf(doc, n, "Wiederverkaufsanfrage zurückgezogen.", True)
	elif aktion == "provision_akzeptieren":
		if doc.status != "verkauf_boerse" or not doc.boerse_projekt_id:
			konflikt("Für diese Position gibt es keinen Börsen-Entwurf.")
		if doc.investor_id != n.id:
			verboten("Die Verkäuferprovision nimmt das Konto an, dem die Position gehört.")
		from oekoinvest_app.plattform.api.projekt import provision_akzeptieren

		provision_akzeptieren(id=doc.boerse_projekt_id, ip=d.get("ip"), als_benutzer=n.id)
		_verlauf(doc, n, "Verkäuferprovision für den Wiederverkauf akzeptiert.", True)
		_backoffice_melden(f"Wiederverkauf: Provision akzeptiert – {doc.titel}", "Der Börsen-Entwurf kann geprüft und veröffentlicht werden.", doc.name)
	doc.save(ignore_permissions=True)
	protokoll(n, f"portfolio_{aktion}", "portfolio", doc.name, aktion)
	return _ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def bericht_daten(id=None, art=None, periode=None, ip=None, als_benutzer=None):  # noqa: A002
	"""Rohdaten für den Bericht (Rechte geprüft) – den Bericht rechnet die Website mit portfolio/bericht.js (berichtRechnen)."""
	n = nutzer(als_benutzer)
	doc, _ = _laden(n, id)
	a = "jahr" if art == "jahr" else "quartal"
	per = v.text(periode, 7) or K.periode_standard(a, _heute())
	_fach(K.periode_monate, a, per)
	protokoll(n, "portfolio_bericht", "portfolio", doc.name, f"{a} {per}", v.text(ip, 64))
	pos = _pos_dict(doc)
	pos.pop("notizIntern", None)
	pos.pop("verlauf", None)
	firma = frappe.db.get_value("Plattform Konto", n.id, "firma") or ""
	return {
		"position": _ausgabe(n, doc), "stammdaten": pos, "art": a, "periode": per, "heute": _heute(),
		"ertraege": aus_json(doc.ertraege, []) or [], "abrufe": _abrufe(doc.name), "ausschuettungen": _ausschuettungen(doc.name),
		"empfaenger": " – ".join(x for x in [firma, name_von(n.id)] if x),
	}


@frappe.whitelist(methods=["POST"])
def dokument_lesen(dokId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if not dokId or not frappe.db.exists("File", dokId):
		nicht_gefunden("Dokument nicht gefunden.")
	f = frappe.get_doc("File", dokId)
	if f.attached_to_doctype != DT or not frappe.db.exists(DT, f.attached_to_name):
		nicht_gefunden("Dokument nicht gefunden.")
	doc, rolle = _laden(n, f.attached_to_name)
	meta = next((d for d in (aus_json(doc.dokumente, []) or []) if d.get("id") == f.name), None)
	if not meta or (rolle != "backoffice" and not meta.get("freigabe")):
		nicht_gefunden("Dokument nicht gefunden.")
	with open(f.get_full_path(), "rb") as fh:
		daten = fh.read()
	protokoll(n, "portfolio_download", "portfolio", doc.name, f"Download {meta.get('name')}", v.text(ip, 64))
	mime = next((m for sig, m in MIME.items() if daten.startswith(sig)), "application/octet-stream")
	return {"name": meta.get("name") or f.file_name, "mime": mime, "inhalt": base64.b64encode(daten).decode()}


# ================================================================ Backoffice


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n)
	_abgleichen()
	heute = _heute()
	liste = [_ausgabe(n, frappe.get_doc(DT, k)) for k in frappe.get_all(DT, pluck="name", order_by="modified desc", limit_page_length=2000)]
	titel = {x["id"]: x["titel"] for x in liste}
	abrufe = []
	for z in frappe.get_all(DT_ABRUF, filters={"status": ["in", K.ABRUF_OFFEN]}, fields=["name", "position_id"], limit_page_length=2000):
		a = next((x for x in _abrufe(z.position_id) if x["id"] == z.name), None)
		if a:
			abrufe.append({**_abruf_ausgabe(a, "backoffice", heute), "positionId": z.position_id, "position": titel.get(z.position_id, "")})
	abrufe.sort(key=lambda a: a["faelligAm"])
	return {
		"positionen": liste, "abrufe": abrufe, "wiederverkauf": [x for x in liste if x["status"] == "verkauf_angefragt"],
		"kennzahlen": {
			"positionen": len([x for x in liste if x["status"] in K.AKTIV]), "uebernahme": len([x for x in liste if x["status"] == "uebernahme"]), "abrufeOffen": len(abrufe),
			"abrufeUeberfaellig": len([a for a in abrufe if a["verzugTage"] > 0]), "covenantWarnungen": len([x for x in liste if x["covenantAmpel"] in ("gelb", "rot")]),
			"ausgeschuettet12": sum(x["kennzahlen"]["ausgeschuettet12"] or 0 for x in liste),
		},
		"schreiben": _bo_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n)
	investoren = []
	for k in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "investor", "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=5000, ignore_permissions=True):
		w = frappe.db.get_value("Plattform Konto", k, ["name", "firma", "aktiv"], as_dict=True)
		if w and cint(w.aktiv):
			investoren.append({"id": w.name, "name": name_von(w.name), "firma": w.firma or ""})
	entwicklung = []
	for p in frappe.get_all("Plattform Entwicklungsprojekt", filters={"status": ["!=", "abgebrochen"]}, fields=["name", "titel", "mwp", "land", "typ"], limit_page_length=2000):
		codev = frappe.get_all("Plattform Entwicklung Freigabe", filters={"projekt_id": p.name}, pluck="nutzer_id")
		entwicklung.append({"id": p.name, "titel": p.titel, "mwp": flt(p.mwp), "land": p.land, "typ": p.typ, "codev": [x for x in codev if x]})
	return {"investoren": investoren, "entwicklung": entwicklung, "arten": {k: {"label": w} for k, w in K.ARTEN.items()}, "typen": TYPEN}


def _stammdaten(d, doc=None):
	"""Werte aus dem Formular (nur übergebene Felder) → Doc-Felder"""
	werte = {}
	for feld, doc_feld, lo, hi in (("mwp", "mwp", 0.01, 5000), ("anteilProzent", "anteil_prozent", 1, 100), ("kaufpreis", "kaufpreis", 0, 1e11), ("zusage", "zusage", 0, 1e11),
		("p50KwhJahr", "p50_kwh_jahr", 0, 1e10), ("verguetungCt", "verguetung_ct", 0, 100), ("opexJahr", "opex_jahr", 0, 1e9), ("schuldendienstJahr", "schuldendienst_jahr", 0, 1e10),
		("degradation", "degradation", 0, 0.05), ("dscrLockup", "dscr_lockup", 1, 3), ("dscrDefault", "dscr_default", 1, 3)):
		if feld in d:
			x = K._zahl(d.get(feld))
			werte[doc_feld] = x if x is not None and lo <= x <= hi else None
	for feld, doc_feld, laenge in (("titel", "titel", 140), ("bundesland", "bundesland", 80), ("spvName", "spv_name", 160), ("notizIntern", "notiz_intern", 1000)):
		if feld in d:
			werte[doc_feld] = v.text(d.get(feld), laenge)
	if "typ" in d:
		werte["typ"] = d.get("typ") if d.get("typ") in TYPEN else (doc.typ if doc else "freiflaeche")
	if "land" in d:
		werte["land"] = d.get("land") if d.get("land") in LAENDER else (doc.land if doc else "DE")
	if "kaufdatum" in d:
		werte["kaufdatum"] = d.get("kaufdatum") if K.ist_tag(d.get("kaufdatum")) else None
	if "inbetriebnahme" in d:
		ib = str(d.get("inbetriebnahme") or "")
		werte["inbetriebnahme"] = ib if K.ist_monat(ib[:7]) else ""
	return werte


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib_noetig(n)
	d = aus_json(daten, {}) if isinstance(daten, str) else (daten or {})
	art = d.get("art") if d.get("art") in K.ARTEN else None
	if not art:
		ungueltig("Bitte die Art der Position wählen.")
	inv = v.kennung(d.get("investorId"))
	if not inv or not frappe.db.exists("Plattform Konto Rolle", {"parent": inv, "rolle": "investor"}):
		ungueltig("Bitte ein Investorenkonto wählen.")
	org = v.kennung(d.get("organisationId")) or None
	if org:
		from oekoinvest_app.plattform.organisation import team_rolle

		if not team_rolle(inv, org):
			ungueltig("Der Investor ist nicht Mitglied dieser Organisation.")
	ep = None
	if art == "codev":
		k = v.kennung(d.get("entwicklungId"))
		if not k or not frappe.db.exists("Plattform Entwicklungsprojekt", k):
			ungueltig("Bitte das Entwicklungsprojekt wählen.")
		ep = frappe.get_doc("Plattform Entwicklungsprojekt", k)
		if frappe.db.exists(DT, {"entwicklung_id": ep.name, "investor_id": inv, "status": ["in", K.AKTIV]}):
			konflikt("Für dieses Projekt gibt es bereits eine Beteiligung des Investors.")
	werte = _stammdaten({**({"titel": ep.titel, "mwp": ep.mwp, "land": ep.land, "typ": ep.typ} if ep else {}), **d})
	doc = frappe.get_doc({"doctype": DT, "art": art, "status": "entwicklung" if art == "codev" else "bau" if art == "projekt" else "betrieb", "investor_id": inv, "organisation_id": org,
		"entwicklung_id": ep.name if ep else None, "struktur": d.get("struktur") if d.get("struktur") in ("share", "asset") else "share", "ertraege": "[]", "dokumente": "[]", "verlauf": "[]", **werte})
	_kyc_pruefen(doc, "Beteiligungen nur für verifizierte Investoren (KYC/KYB).")
	v.pflicht(len(doc.titel or "") >= 3, "Bitte einen Titel angeben.")
	if art == "codev":
		v.pflicht(flt(doc.zusage) > 0, "Bitte die Kapitalzusage angeben.")
	else:
		v.pflicht(flt(doc.kaufpreis) > 0, "Bitte den Kaufpreis angeben.")
	if not doc.kaufdatum:
		doc.kaufdatum = _heute()
	if not doc.anteil_prozent:
		doc.anteil_prozent = 100
	_verlauf(doc, n, f"Position angelegt ({K.ARTEN[art]}).", True)
	doc.insert(ignore_permissions=True)
	_investor_melden(doc, f"Neu im Portfolio: {doc.titel}", "Ihre Co-Development-Beteiligung mit Kapitalzusage und Abrufen ist im Portfolio." if art == "codev" else "Die Position ist in Ihrem Portfolio.", mail_betreff="Neue Position im Portfolio – ÖkoInvest", mail_text="In Ihrem Portfolio wurde eine Position angelegt. Details finden Sie im Portal.")
	protokoll(n, "portfolio_anlegen", "portfolio", doc.name, f"{art}: {doc.titel}")
	return _ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib_noetig(n)
	doc, _ = _laden(n, id)
	if doc.status in ("verkauft", "beendet"):
		konflikt("Die Position ist abgeschlossen.")
	d = aus_json(daten, {}) if isinstance(daten, str) else (daten or {})
	werte = _stammdaten(d, doc)
	if "zusage" in werte and doc.art == "codev":
		abgerufen = sum(a["betrag"] for a in _abrufe(doc.name) if a["status"] != "storniert")
		if (werte["zusage"] or 0) < abgerufen:
			ungueltig("Die Zusage darf nicht unter den bereits abgerufenen Betrag sinken.")
	doc.update(werte)
	v.pflicht(len(doc.titel or "") >= 3, "Bitte einen Titel angeben.")
	_verlauf(doc, n, "Stammdaten geändert.")
	doc.save(ignore_permissions=True)
	protokoll(n, "portfolio_aendern", "portfolio", doc.name, "Stammdaten")
	return _ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002, C901
	n = nutzer(als_benutzer)
	_schreib_noetig(n)
	d = aus_json(daten, {}) if isinstance(daten, str) else (daten or {})
	a_name = d.get("aktion")
	if a_name not in ("status", "ertrag", "abruf", "abruf_bestaetigen", "abruf_stornieren", "ausschuettung", "ausschuettung_storno", "boerse"):
		ungueltig("Unbekannte Aktion.")
	doc, _ = _laden(n, id)
	heute = _heute()
	pos = _pos_dict(doc)
	if a_name == "status":
		nach = _fach(K.uebergang_pruefen, doc.status, str(d.get("nach") or ""))
		if nach == "verkauf_angefragt":
			konflikt("Den Wiederverkauf fragt der Investor im Portfolio an.")
		if nach == "verkauf_boerse":
			konflikt("Bitte den Börsen-Entwurf über „In die Börse übernehmen“ anlegen.")
		vorher = doc.status
		doc.status = nach
		if nach == "betrieb" and not doc.inbetriebnahme:
			doc.inbetriebnahme = heute[:7]
		if nach in ("betrieb", "bau") and vorher in ("verkauf_angefragt", "verkauf_boerse"):
			doc.wiederverkauf = als_json({**(aus_json(doc.wiederverkauf, {}) or {}), "beendetAm": heute, "ergebnis": v.text(d.get("grund"), 300) or "nicht weiterverfolgt"})
		grund = v.text(d.get("grund"), 200)
		_verlauf(doc, n, f"Status: {K.STATUS[nach][0]}{f' – {grund}' if grund else ''}.", True)
		_investor_melden(doc, f"{doc.titel}: {K.STATUS[nach][0]}", "Der Status Ihrer Position hat sich geändert.", mail_betreff="Neuigkeiten zu Ihrem Portfolio – ÖkoInvest", mail_text="Der Status einer Position in Ihrem Portfolio hat sich geändert. Details finden Sie im Portal.")
	elif a_name == "ertrag":
		monat = d.get("monat")
		if not K.ist_monat(monat) or monat > heute[:7]:
			ungueltig("Bitte einen vergangenen oder den laufenden Monat angeben (JJJJ-MM).")
		liste = [e for e in (aus_json(doc.ertraege, []) or []) if e.get("monat") != monat]
		if d.get("kwh") in (None, ""):
			_verlauf(doc, n, f"Ertrag {monat} gelöscht.")
		else:
			kwh = K._zahl(d.get("kwh"))
			if kwh is None or kwh < 0 or kwh > 1e10:
				ungueltig("Bitte die erzeugte Energie in kWh angeben.")
			e = {"monat": monat, "kwh": round(kwh), "quelle": v.text(d.get("quelle"), 80) or "Betriebsführung", "vonId": n.id, "am": jetzt_iso()}
			liste.append(e)
			_verlauf(doc, n, f"Ertrag {monat}: {e['kwh']:,} kWh ({e['quelle']}).".replace(",", "."))
		doc.ertraege = als_json(sorted(liste, key=lambda x: x["monat"])[-240:])
	elif a_name == "abruf":
		_kyc_pruefen(doc, "Kapitalabrufe nur an verifizierte Investoren (KYC/KYB).")
		neu = _fach(K.abruf_pruefen, pos, _abrufe(doc.name), {**d, "zweck": v.text(d.get("zweck"), 200), "meilenstein": v.text(d.get("meilenstein"), 160)}, heute)
		a = frappe.get_doc({"doctype": DT_ABRUF, "position_id": doc.name, "nummer": neu["nummer"], "betrag": neu["betrag"], "zweck": neu["zweck"], "meilenstein": neu["meilenstein"],
			"angekuendigt_am": neu["angekuendigtAm"], "faellig_am": neu["faelligAm"], "status": "angekuendigt", "erinnert": "{}", "von_id": n.id}).insert(ignore_permissions=True)
		betrag = f"{a.betrag:,.0f}".replace(",", ".")
		_verlauf(doc, n, f"Kapitalabruf Nr. {a.nummer} über {betrag} € angekündigt, fällig am {neu['faelligAm']} ({a.zweck}).", True)
		faellig = ".".join(reversed(neu["faelligAm"].split("-")))
		_investor_melden(doc, f"Kapitalabruf Nr. {a.nummer}: {doc.titel}", f"{betrag} € fällig am {faellig} – {a.zweck}", mail_betreff="Kapitalabruf zu Ihrer Beteiligung – ÖkoInvest", mail_text="Zu einer Ihrer Beteiligungen wurde Kapital abgerufen. Betrag, Frist und Zahlungsdetails finden Sie im Portal.")
	elif a_name in ("abruf_bestaetigen", "abruf_stornieren"):
		k = v.kennung(d.get("abrufId"))
		if not k or frappe.db.get_value(DT_ABRUF, k, "position_id") != doc.name:
			nicht_gefunden("Kapitalabruf nicht gefunden.")
		a = frappe.get_doc(DT_ABRUF, k)
		neu = _fach(K.abruf_aktion, {"status": a.status}, "bestaetigen" if a_name == "abruf_bestaetigen" else "stornieren", {"datum": d.get("datum"), "grund": v.text(d.get("grund"), 300)}, heute, "backoffice")
		a.status = neu["status"]
		if a_name == "abruf_bestaetigen":
			a.bezahlt_am = neu["bezahltAm"]
			txt = f"Zahlungseingang zu Kapitalabruf Nr. {a.nummer} bestätigt ({neu['bezahltAm']})."
		else:
			a.storniert_am, a.grund = neu["storniertAm"], neu["grund"]
			txt = f"Kapitalabruf Nr. {a.nummer} storniert: {neu['grund']}"
		a.save(ignore_permissions=True)
		_verlauf(doc, n, txt, True)
		_investor_melden(doc, f"Zahlung eingegangen: Abruf Nr. {a.nummer}" if a_name == "abruf_bestaetigen" else f"Abruf Nr. {a.nummer} storniert", f"{doc.titel} – {txt}", mail=False)
	elif a_name == "ausschuettung":
		_kyc_pruefen(doc, "Ausschüttungen nur an verifizierte Investoren (KYC/KYB).")
		cov = K.covenant_auswertung(pos, aus_json(doc.ertraege, []) or [], _letzter_monat())
		neu = _fach(K.ausschuettung_pruefen, pos, {**d, "notiz": v.text(d.get("notiz"), 300)}, heute, cov)
		frappe.get_doc({"doctype": DT_AUS, "position_id": doc.name, "art": neu["art"], "periode": neu["periode"], "betrag": neu["betrag"], "datum": neu["datum"], "status": "gebucht",
			"bank_zustimmung": 1 if neu["bankZustimmung"] else 0, "notiz": neu["notiz"], "von_id": n.id}).insert(ignore_permissions=True)
		label = K.AUSSCHUETTUNG_ARTEN[neu["art"]][0]
		betrag = f"{neu['betrag']:,.0f}".replace(",", ".")
		_verlauf(doc, n, f"Ausschüttung gebucht: {label}, {betrag} € ({neu['periode']}){' – mit Zustimmung der Bank' if neu['bankZustimmung'] else ''}.", True)
		_investor_melden(doc, f"Ausschüttung: {doc.titel}", f"{label} {betrag} € (Periode {neu['periode']}, Zahlung {'.'.join(reversed(neu['datum'].split('-')))}).", mail_betreff="Ausschüttung zu Ihrer Beteiligung – ÖkoInvest", mail_text="Zu einer Ihrer Beteiligungen wurde eine Ausschüttung gebucht. Details finden Sie im Portal.")
	elif a_name == "ausschuettung_storno":
		k = v.kennung(d.get("ausschuettungId"))
		if not k or frappe.db.get_value(DT_AUS, k, "position_id") != doc.name:
			nicht_gefunden("Ausschüttung nicht gefunden.")
		a = frappe.get_doc(DT_AUS, k)
		if a.status == "storniert":
			konflikt("Die Ausschüttung ist bereits storniert.")
		grund = v.text(d.get("grund"), 300)
		v.pflicht(len(grund) >= 5, "Bitte einen Grund angeben.")
		a.status, a.storniert_am, a.grund = "storniert", heute, grund
		a.save(ignore_permissions=True)
		_verlauf(doc, n, f"Ausschüttung vom {a.datum} storniert: {grund}", True)
	elif a_name == "boerse":
		if doc.status != "verkauf_angefragt" or not doc.wiederverkauf:
			konflikt("Zuerst muss der Investor den Wiederverkauf anfragen.")
		_fach(K.uebergang_pruefen, doc.status, "verkauf_boerse")
		from oekoinvest_app.plattform.api.projekt import projekt_daten
		from oekoinvest_app.plattform.kern import verlauf as status_verlauf

		werte = projekt_daten(K.boerse_entwurf(pos, aus_json(doc.wiederverkauf, {}) or {}))
		p = frappe.get_doc({"doctype": "Plattform Projekt", "anbieter_id": doc.investor_id, "organisation_id": None, "status": "entwurf", "aufrufe": 0, **werte})
		status_verlauf(p, "entwurf", n, "admin", "Wiederverkauf aus dem Portfolio")
		p.insert(ignore_permissions=True)
		doc.boerse_projekt_id = p.name
		doc.status = "verkauf_boerse"
		_verlauf(doc, n, f"Börsen-Entwurf {p.name} angelegt – nach Annahme der Verkäuferprovision prüft ÖkoInvest und veröffentlicht.", True)
		_investor_melden(doc, f"Wiederverkauf vorbereitet: {doc.titel}", "Bitte die Verkäuferprovision im Portfolio annehmen – danach prüft und veröffentlicht ÖkoInvest das Angebot.", mail_betreff="Wiederverkauf vorbereitet – ÖkoInvest", mail_text="Für Ihre Position wurde ein Angebot in der Projektbörse vorbereitet. Bitte prüfen Sie es im Portal.")
	doc.save(ignore_permissions=True)
	protokoll(n, f"portfolio_{a_name}", "portfolio", doc.name, a_name)
	return _ausgabe(n, doc, detail=True)


@frappe.whitelist(methods=["POST"])
def dokument_speichern(positionId=None, art=None, name=None, mime=None, freigabe=True, inhalt=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_schreib_noetig(n)
	doc, _ = _laden(n, positionId)
	try:
		daten = base64.b64decode(str(inhalt or ""), validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")
	erkannt = next((m for sig, m in MIME.items() if daten.startswith(sig)), "")
	if not erkannt or erkannt != mime or len(daten) > 10 * 1024 * 1024:
		ungueltig("Erlaubt sind PDF, JPG und PNG bis 10 MB.")
	anzeige = v.text(str(name or "").replace("/", "_").replace("\\", "_"), 160) or "dokument"
	f = frappe.get_doc({"doctype": "File", "file_name": f"{doc.name}-{secrets.token_hex(6)}-{anzeige}"[:140], "is_private": 1, "content": daten, "attached_to_doctype": DT, "attached_to_name": doc.name})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	frei = freigabe not in (False, 0, "0", "false")
	meta = {"id": f.name, "name": anzeige, "art": art if art in DOK_ARTEN else "sonstiges", "groesse": len(daten), "am": jetzt_iso(), "freigabe": frei, "vonId": n.id}
	doc.dokumente = als_json((aus_json(doc.dokumente, []) or []) + [meta])
	_verlauf(doc, n, f"Dokument „{anzeige}“ bereitgestellt{'' if frei else ' (intern)'}.", frei)
	doc.save(ignore_permissions=True)
	if frei:
		_investor_melden(doc, f"Neues Dokument: {doc.titel}", anzeige, mail_betreff="Neues Dokument in Ihrem Portfolio – ÖkoInvest", mail_text="Zu einer Position in Ihrem Portfolio wurde ein Dokument bereitgestellt.")
	protokoll(n, "portfolio_dokument", "portfolio", doc.name, anzeige)
	return {k: meta[k] for k in ("id", "name", "art", "groesse", "am", "freigabe")}


def _fristen():
	heute = _heute()
	erg = {"erinnerungen": 0, "verzug": 0, "covenant": 0}
	for z in frappe.get_all(DT_ABRUF, filters={"status": "angekuendigt"}, fields=["name"], limit_page_length=5000):
		a = frappe.get_doc(DT_ABRUF, z.name)
		if not frappe.db.exists(DT, a.position_id):
			continue
		doc = frappe.get_doc(DT, a.position_id)
		er = aus_json(a.erinnert, {}) or {}
		faellig = str(a.faellig_am or "")
		betrag = f"{flt(a.betrag):,.0f}".replace(",", ".")
		geaendert = False
		if faellig and heute <= faellig <= K.plus_tage(heute, 3) and not er.get("vorher"):
			er["vorher"] = heute
			erg["erinnerungen"] += 1
			geaendert = True
			_investor_melden(doc, f"Erinnerung: Kapitalabruf Nr. {a.nummer} fällig am {'.'.join(reversed(faellig.split('-')))}", f"{doc.titel} – {betrag} €", mail_betreff="Erinnerung Kapitalabruf – ÖkoInvest", mail_text="Ein Kapitalabruf zu Ihrer Beteiligung wird in Kürze fällig. Details im Portal.")
		if K.abruf_verzug({"status": a.status, "faelligAm": faellig}, heute) > 0 and not er.get("verzug"):
			er["verzug"] = heute
			erg["verzug"] += 1
			geaendert = True
			_investor_melden(doc, f"Kapitalabruf Nr. {a.nummer} überfällig", f"{doc.titel} – bitte Zahlung veranlassen bzw. im Portal melden. Verzugsfolgen richten sich nach dem Beteiligungsvertrag.", mail_betreff="Kapitalabruf überfällig – ÖkoInvest", mail_text="Ein Kapitalabruf zu Ihrer Beteiligung ist überfällig. Details im Portal.")
			_backoffice_melden(f"Kapitalabruf überfällig: {doc.titel}", f"Abruf Nr. {a.nummer}, fällig {faellig}.", doc.name)
		if geaendert:
			frappe.db.set_value(DT_ABRUF, a.name, "erinnert", als_json(er), update_modified=False)
	for name in frappe.get_all(DT, filters={"status": ["in", K.AKTIV]}, pluck="name", limit_page_length=5000):
		doc = frappe.get_doc(DT, name)
		c = K.covenant_auswertung(_pos_dict(doc), aus_json(doc.ertraege, []) or [], _letzter_monat())
		if c["ampel"] != (doc.covenant_ampel_gemeldet or "") and c["ampel"] in ("gelb", "rot"):
			erg["covenant"] += 1
			_backoffice_melden(f"Covenant {'verletzt' if c['ampel'] == 'rot' else 'Frühwarnung'}: {doc.titel}", c["grund"], doc.name)
			_investor_melden(doc, f"Covenant-Hinweis: {doc.titel}", c["grund"], mail=False)
		if c["ampel"] != (doc.covenant_ampel_gemeldet or ""):
			frappe.db.set_value(DT, doc.name, "covenant_ampel_gemeldet", c["ampel"], update_modified=False)
	return {"ok": True, **erg, "am": jetzt_iso()}


@frappe.whitelist(methods=["POST"])
def fristen_lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n)
	return _fristen()


def fristen_taeglich():
	"""Scheduler (hooks.py, täglich): Erinnerung/Verzug der Kapitalabrufe, Covenant-Ampel aus Monatserträgen."""
	try:
		_abgleichen()
		_fristen()
	except Exception:  # noqa: BLE001 – ein Fehler darf den Scheduler nicht blockieren
		frappe.log_error(title="Portfolio: Fristenlauf", message=frappe.get_traceback())
