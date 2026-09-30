# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektentwicklung (docs/API.md, Abschnitt 11) – Referenz: src/lib/plattform/backend/demo/entwicklung.js.
# Internes Entwicklungsmanagement: Entwicklungsprojekt, Projektflächen, Meilensteine nach Vorlage (Land × Typ) mit Soll/Ist,
# Abhängigkeiten, Dokumentenpflicht und Gutachter-Zuweisung, Risiken, Kontakte (CRM), Entscheidungen, Budget/Ist,
# Pipeline-Wert, Übergabe an Börse bzw. Bau/Betrieb, Fristen-Erinnerungen, optionale ERPNext-Synchronisation.
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Backoffice   – Rolle admin mit Bereich „entwicklung“ (rechte.py): lesen ≥ 1, schreiben = 2 (Unterrollen leitung, projektleitung)
#   Eigentümer   – Konto/Team einer verknüpften Plattform-Fläche: nur vereinfachter Fortschritt (externe Titel, Quartale)
#   Co-Investor  – Freigabe je Projekt (Konto oder Organisation, Rolle investor): Fortschritt, externe Risiken, freigegebene Dokumente
#   Gutachter    – Rolle gutachter UND Zuweisung am Meilenstein: nur zugewiesene Meilensteine, eigene Rückfragen, Upload
#   sonst        – 403
#
# ERPNext (optional, nur wenn installiert UND site_config „oekoinvest_erpnext_entwicklung“: 1) – Standard-DocTypes v15:
#   nach ERPNext:  Project (project_name, status, expected_start_date, expected_end_date, notes) und je Meilenstein ein
#                  Task (subject, project, status, exp_start_date, exp_end_date, depends_on → „Task Depends On“.task)
#   von ERPNext:   Task.status = Completed + act_end_date → Ist-Ende am Meilenstein (nur wenn alle Vorgänger fertig; sonst Konflikt
#                  im Ergebnis); Project.total_costing_amount (Timesheets) → Budgetposition „Eigenleistung (Stunden)“,
#                  Project.total_purchase_cost → „Sonstiges (Einkauf ERPNext)“ – beide mit ist_quelle = erpnext
#   Vor Einsatz gegen die installierte ERPNext-Version prüfen (Feldnamen v15).

import base64
import binascii
import json
import re
import secrets

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, getdate, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform import entwicklung_kern as K
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import (
	als_json, aus_json, ist_admin, iso, jetzt, konflikt, kurz, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256,
	ungueltig, verboten,
)
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, LAENDER, UPLOAD_MAX_BYTES, UPLOAD_TYPEN
from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, team_rolle
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Entwicklungsprojekt"
DT_MS = "Plattform Entwicklung Meilenstein"
DT_RISIKO = "Plattform Entwicklung Risiko"
DT_ENTSCHEIDUNG = "Plattform Entwicklung Entscheidung"
DT_BUDGET = "Plattform Budgetposition"
DT_FLAECHE = "Plattform Projektflaeche"
DT_KONTAKT = "Plattform Entwicklung Kontakt"
DT_FREIGABE = "Plattform Entwicklung Freigabe"
DT_DOKUMENT = "Plattform Entwicklung Dokument"
DT_RUECKFRAGE = "Plattform Entwicklung Rueckfrage"
DT_EINLADUNG = "Plattform Gutachter Einladung"
DT_VORLAGE = "Plattform Meilenstein Vorlage"
DT_PROFIL = "Plattform Gutachter Profil"
EINLADUNG_TAGE = 14
MAX_BASE64 = (UPLOAD_MAX_BYTES + 2) // 3 * 4 + 16


# ================================================================ Rechte


def bo_lesen(n):
	return ist_admin(n) and stufe(n, "entwicklung") >= 1


def bo_schreiben(n):
	return ist_admin(n) and stufe(n, "entwicklung") >= 2


def lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_lesen(n):
		verboten("Nur für das Backoffice (Projektentwicklung).")


def schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Projektentwicklung).")


def _projekt(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Entwicklungsprojekt nicht gefunden.")
	return frappe.get_doc(DT, k)


def _ist_eigentuemer(n, pid):
	for fid in frappe.get_all(DT_FLAECHE, filters={"projekt_id": pid, "flaeche_id": ["is", "set"]}, pluck="flaeche_id", limit_page_length=0):
		if not frappe.db.exists("Plattform Flaeche", fid):
			continue
		f = frappe.get_doc("Plattform Flaeche", fid)
		if f.nutzer_id == n.id or darf_team_lesen_objekt(n, f):
			return True
	return False


def _freigabe(n, pid):
	if "investor" not in (n.get("rollen") or []):
		return None
	for fg in frappe.get_all(DT_FREIGABE, filters={"projekt_id": pid}, fields=["name", "nutzer_id", "organisation_id", "risiken", "dokumente"], limit_page_length=0):
		if (fg.nutzer_id and fg.nutzer_id == n.id) or (fg.organisation_id and team_rolle(n.id, fg.organisation_id)):
			return fg
	return None


def _ms_liste(pid):
	return [ms_dict(m) for m in frappe.get_all(DT_MS, filters={"projekt_id": pid}, fields=["*"], order_by="reihenfolge asc, creation asc", limit_page_length=0)]


def _gutachter_ms(n, pid, liste=None):
	if "gutachter" not in (n.get("rollen") or []):
		return []
	return [m for m in (liste if liste is not None else _ms_liste(pid)) if n.id in (m["gutachterIds"] or [])]


def zugriffe(n, p, liste=None):
	return {
		"backoffice": bo_lesen(n),
		"eigentuemer": _ist_eigentuemer(n, p.name),
		"investor": _freigabe(n, p.name),
		"gutachter": _gutachter_ms(n, p.name, liste),
	}


# ================================================================ Gutachter-Profil


def _profil_daten(d):
	d = d or {}
	return {
		"fachgebiete": v.mehrfach(d.get("fachgebiete") if isinstance(d.get("fachgebiete"), list) else [], list(K.GUTACHTER_FACHGEBIETE)),
		"qualifikation": v.auswahl(d.get("qualifikation"), list(K.GUTACHTER_QUALIFIKATION), ""),
		"buero": v.text(d.get("buero"), 160),
		"nachweis": v.text(d.get("nachweis"), 300),
	}


def _profil_setzen(konto_id, d):
	neu = _profil_daten(d)
	name = frappe.db.get_value(DT_PROFIL, {"konto_id": konto_id}, "name")
	doc = frappe.get_doc(DT_PROFIL, name) if name else frappe.new_doc(DT_PROFIL)
	doc.konto_id = konto_id
	for k, w in neu.items():
		if k in d or not name or w:
			doc.set(k, als_json(w) if k == "fachgebiete" else w)
	doc.save(ignore_permissions=True) if name else doc.insert(ignore_permissions=True)


def profil_json(konto_id):
	x = frappe.db.get_value(DT_PROFIL, {"konto_id": konto_id}, ["fachgebiete", "qualifikation", "buero", "nachweis"], as_dict=True) or {}
	fg = aus_json(x.get("fachgebiete"), []) or []
	return {
		"nutzerId": konto_id, **(_person(konto_id) or {}), "fachgebiete": fg, "fachgebieteLabel": [K.GUTACHTER_FACHGEBIETE.get(f, f) for f in fg],
		"qualifikation": x.get("qualifikation") or "", "qualifikationLabel": K.GUTACHTER_QUALIFIKATION.get(x.get("qualifikation") or "", ""), "buero": x.get("buero") or "", "nachweis": x.get("nachweis") or "",
	}


# ================================================================ Umwandlung Datenbank ↔ Website (camelCase)


def _datum(wert):
	return str(getdate(wert)) if wert else None


def ms_dict(m):
	return {
		"id": m.name, "projektId": m.projekt_id, "schluessel": m.schluessel or "", "titel": m.titel, "kategorie": m.kategorie, "dauerMonate": flt(m.dauer_monate) or 1,
		"nach": aus_json(m.nach, []) or [], "phase": m.phase or None, "dokumentPflicht": aus_json(m.dokument_pflicht, []) or [], "externTitel": m.extern_titel or "",
		"gutachten": bool(cint(m.gutachten)), "status": m.status, "sollStart": _datum(m.soll_start), "sollEnde": _datum(m.soll_ende), "sollFix": bool(cint(m.soll_fix)),
		"istStart": _datum(m.ist_start), "istEnde": _datum(m.ist_ende), "verantwortlichId": m.verantwortlich_id or None, "gutachterIds": aus_json(m.gutachter_ids, []) or [],
		"notiz": m.notiz or "", "eingereichtAm": iso(m.eingereicht_am), "nachweisVerzicht": m.nachweis_verzicht or "", "erinnert": aus_json(m.erinnert, {}) or {},
		"reihenfolge": cint(m.reihenfolge), "erpTask": m.get("erp_task") or None,
	}


def _termine_schreiben(liste):
	"""Soll-Termine aus der Planung zurückschreiben (nur geänderte)."""
	for x in liste:
		alt = frappe.db.get_value(DT_MS, x["id"], ["soll_start", "soll_ende"], as_dict=True)
		if alt and (_datum(alt.soll_start), _datum(alt.soll_ende)) != (x["sollStart"], x["sollEnde"]):
			frappe.db.set_value(DT_MS, x["id"], {"soll_start": x["sollStart"], "soll_ende": x["sollEnde"]}, update_modified=False)


def _person(kid):
	k = kurz(kid) if kid else None
	return {"id": k["id"], "name": " ".join(x for x in (k["vorname"], k["nachname"]) if x), "email": k["email"]} if k else None


def kennzahlen(p, liste=None, heute=None):
	heute = heute or nowdate()
	liste = liste if liste is not None else _ms_liste(p.name)
	je, projekt_ende = K.kritischer_pfad(liste, heute)
	phase = K.phase_aus_meilensteinen(liste)
	flaechen = frappe.get_all(DT_FLAECHE, filters={"projekt_id": p.name}, fields=["ha", "pacht_status"], limit_page_length=0)
	aktiv = [m for m in liste if m["status"] != "entfaellt"]
	erledigt = len([m for m in aktiv if m["status"] == "erledigt"])
	ueber = [m for m in liste if K.ist_ueberfaellig(m, heute)]
	cod = next((m for m in liste if m["phase"] == "cod"), None)
	prognose_cod = (je.get(cod["id"]) or {}).get("prognoseEnde") or cod["sollEnde"] if cod else projekt_ende
	ziel = str(p.ziel_cod or "")
	cod_verzug = 0
	if ziel and prognose_cod:
		ziel_tag = f"{ziel}-12-01" if len(ziel) == 4 else f"{ziel}-01"
		cod_verzug = max(0, round(K.tage_zwischen(ziel_tag, prognose_cod) / 30.4))
	budget = frappe.get_all(DT_BUDGET, filters={"projekt_id": p.name}, fields=["plan_eur", "ist_eur"], limit_page_length=0)
	risiken = frappe.get_all(DT_RISIKO, filters={"projekt_id": p.name, "status": ["!=", "geschlossen"]}, fields=["score"], limit_page_length=0)
	naechste = sorted([m for m in liste if m["status"] not in K.MEILENSTEIN_FERTIG], key=lambda m: m["sollEnde"] or "9999")
	mwp = flt(p.mwp) or (flt(p.mwh) / 2 if p.typ == "speicher" else 0)
	return {
		"phase": phase, "phaseLabel": K.phase_label(phase),
		"pipeline": K.pipeline_wert(mwp, phase, p.wahrscheinlichkeit if p.get("wahrscheinlichkeit") not in (None, "") and flt(p.wahrscheinlichkeit) > 0 else None),
		"fortschritt": round(erledigt / len(aktiv) * 100) if aktiv else 0,
		"meilensteine": {"gesamt": len(aktiv), "erledigt": erledigt, "ueberfaellig": len(ueber), "kritischUeberfaellig": len([m for m in ueber if (je.get(m["id"]) or {}).get("kritisch")])},
		"prognoseCod": prognose_cod, "codVerzugMonate": cod_verzug,
		"flaecheHa": round(sum(flt(f.ha) for f in flaechen), 1),
		"flaecheGesichertHa": round(sum(flt(f.ha) for f in flaechen if f.pacht_status in K.PACHT_GESICHERT), 1),
		"budgetPlan": sum(flt(b.plan_eur) for b in budget), "budgetIst": sum(flt(b.ist_eur) for b in budget),
		"risikoMax": max([cint(r.score) for r in risiken] or [0]), "risikenOffen": len(risiken),
		"naechsterMeilenstein": {"id": naechste[0]["id"], "titel": naechste[0]["titel"], "sollEnde": naechste[0]["sollEnde"]} if naechste else None,
		"_je": je, "_projektEnde": projekt_ende,
	}


def projekt_kurz(p, k=None):
	k = k or kennzahlen(p)
	return {
		"id": p.name, "titel": p.titel, "typ": p.typ, "typLabel": K.ENTWICKLUNG_TYPEN.get(p.typ, p.typ), "land": p.land, "bundesland": p.bundesland, "gemeinde": p.gemeinde or "",
		"mwp": flt(p.mwp), "mwh": flt(p.mwh), "status": p.status, "statusLabel": K.ENTWICKLUNG_STATUS.get(p.status, p.status), "zielCod": p.ziel_cod or "",
		"vermarktung": p.vermarktung, "vermarktungLabel": K.vermarktung_label(p.vermarktung, p.land), "projektleiter": _person(p.projektleiter_id),
		"boerseProjektId": p.boerse_projekt_id or None, "anlageId": p.anlage_id or None, "erstelltAm": iso(p.creation), "geaendertAm": iso(p.modified),
		**{x: y for x, y in k.items() if not x.startswith("_")},
	}


def _dokument_json(d):
	return {
		"id": d.name, "projektId": d.projekt_id, "meilensteinId": d.meilenstein_id or None, "pflicht": d.pflicht or "", "name": d.dateiname, "mime": d.mime, "groesse": cint(d.groesse),
		"vonId": d.von_id, "von": name_von(d.von_id), "am": iso(d.am), "freigabeInvestor": bool(cint(d.freigabe_investor)), "fuerGutachter": bool(cint(d.fuer_gutachter)),
		"link": f"/api/portal/entwicklung/dokumente/{d.name}",
	}


def projekt_json(n, p):
	heute = nowdate()
	liste = _ms_liste(p.name)
	k = kennzahlen(p, liste, heute)
	je = k["_je"]
	doks = frappe.get_all(DT_DOKUMENT, filters={"projekt_id": p.name}, fields=["*"], order_by="am desc", limit_page_length=0)
	fragen = frappe.get_all(DT_RUECKFRAGE, filters={"projekt_id": p.name}, fields=["*"], order_by="am asc", limit_page_length=0)
	meilensteine = []
	for m in liste:
		kp = je.get(m["id"]) or {}
		md = [d for d in doks if d.meilenstein_id == m["id"]]
		meilensteine.append({
			**m, "statusLabel": K.MEILENSTEIN_STATUS.get(m["status"], m["status"]), "kategorieLabel": K.KATEGORIEN.get(m["kategorie"], m["kategorie"]),
			"verantwortlich": _person(m["verantwortlichId"]), "gutachter": [x for x in (_person(g) for g in m["gutachterIds"]) if x],
			"verzugTage": K.verzug_tage(m, heute), "ueberfaellig": K.ist_ueberfaellig(m, heute), "kritisch": bool(kp.get("kritisch")), "puffer": kp.get("puffer"),
			"prognoseStart": kp.get("prognoseStart") or m["sollStart"], "prognoseEnde": kp.get("prognoseEnde") or m["sollEnde"], "dokumente": len(md),
			"pflichtErfuellt": [{"name": pf, "erfuellt": any(d.pflicht == pf for d in md)} for pf in m["dokumentPflicht"]],
			"rueckfragen": len([r for r in fragen if r.meilenstein_id == m["id"]]),
		})
	flaechen = []
	for f in frappe.get_all(DT_FLAECHE, filters={"projekt_id": p.name}, fields=["*"], order_by="creation asc", limit_page_length=0):
		pf = frappe.db.get_value("Plattform Flaeche", f.flaeche_id, ["name", "bezeichnung", "status", "nutzer_id"], as_dict=True) if f.flaeche_id else None
		flaechen.append({
			"id": f.name, "flaecheId": f.flaeche_id or None, "bezeichnung": f.bezeichnung, "eigentuemerName": f.eigentuemer_name or "", "ha": flt(f.ha), "pachtStatus": f.pacht_status,
			"pachtStatusLabel": K.PACHT_STATUS.get(f.pacht_status, f.pacht_status), "pachtBeginn": _datum(f.pacht_beginn) or "", "pachtEnde": _datum(f.pacht_ende) or "",
			"pachtEurHa": flt(f.pacht_eur_ha) or None, "notiz": f.notiz or "",
			"plattformFlaeche": {"id": pf.name, "bezeichnung": pf.bezeichnung, "status": pf.status} if pf else None, "eigentuemerKonto": _person(pf.nutzer_id) if pf else None,
		})
	risiken = []
	for r in frappe.get_all(DT_RISIKO, filters={"projekt_id": p.name}, fields=["*"], limit_page_length=0):
		sc = K.risiko_score(r.eintritt, r.auswirkung)
		risiken.append({
			"id": r.name, "titel": r.titel, "kategorie": r.kategorie, "kategorieLabel": K.RISIKO_KATEGORIEN.get(r.kategorie, r.kategorie), "eintritt": cint(r.eintritt), "auswirkung": cint(r.auswirkung),
			"score": sc, "ampel": {"id": K.risiko_ampel(sc), "label": K.risiko_ampel(sc)}, "massnahme": r.massnahme or "", "status": r.status, "statusLabel": K.RISIKO_STATUS.get(r.status, r.status),
			"extern": bool(cint(r.extern)), "meilensteinId": r.meilenstein_id or None, "verantwortlichId": r.verantwortlich_id or None, "verantwortlich": _person(r.verantwortlich_id),
		})
	risiken.sort(key=lambda r: -r["score"])
	kontakte = []
	for kt in frappe.get_all(DT_KONTAKT, filters={"projekt_id": p.name}, fields=["*"], limit_page_length=0):
		c = frappe.db.get_value("Plattform CRM Kontakt", kt.kontakt_id, ["name", "vorname", "nachname", "firma", "funktion", "email", "telefon"], as_dict=True) if kt.kontakt_id else None
		kontakte.append({"id": kt.name, "kontaktId": kt.kontakt_id, "rolle": kt.rolle, "rolleLabel": K.KONTAKT_ROLLEN.get(kt.rolle, kt.rolle), "notiz": kt.notiz or "",
			"kontakt": {"id": c.name, "name": " ".join(x for x in (c.vorname, c.nachname) if x) or c.firma or "", "firma": c.firma or "", "funktion": c.get("funktion") or "", "email": c.email or "", "telefon": c.telefon or ""} if c else None})
	return {
		**projekt_kurz(p, k),
		"beschreibung": p.beschreibung or "", "nvp": p.nvp or "", "netzbetreiber": p.netzbetreiber or "", "landkreis": p.landkreis or "", "start": _datum(p.start),
		"wahrscheinlichkeit": flt(p.wahrscheinlichkeit) or None, "erpProjekt": p.erp_projekt or None, "projektEnde": k["_projektEnde"],
		"flaechen": flaechen, "meilensteine": meilensteine, "risiken": risiken,
		"entscheidungen": [{"id": e.name, "datum": _datum(e.datum), "titel": e.titel, "art": e.art, "artLabel": K.ENTSCHEIDUNG_ARTEN.get(e.art, e.art), "beschluss": e.beschluss or "", "begruendung": e.begruendung or "", "beteiligte": e.beteiligte or "", "von": _person(e.von_id), "am": iso(e.creation)}
			for e in frappe.get_all(DT_ENTSCHEIDUNG, filters={"projekt_id": p.name}, fields=["*"], order_by="datum desc, creation desc", limit_page_length=0)],
		"budget": [{"id": b.name, "kategorie": b.kategorie, "kategorieLabel": K.BUDGET_KATEGORIEN.get(b.kategorie, b.kategorie), "bezeichnung": b.bezeichnung, "planEur": flt(b.plan_eur), "istEur": flt(b.ist_eur), "istQuelle": b.ist_quelle, "notiz": b.notiz or ""}
			for b in frappe.get_all(DT_BUDGET, filters={"projekt_id": p.name}, fields=["*"], order_by="creation asc", limit_page_length=0)],
		"kontakte": kontakte,
		"freigaben": [{"id": fg.name, "art": "codev", "nutzerId": fg.nutzer_id or None, "organisationId": fg.organisation_id or None, "risiken": bool(cint(fg.risiken)), "dokumente": bool(cint(fg.dokumente)), "seit": iso(fg.seit), "nutzer": _person(fg.nutzer_id),
			"organisation": {"id": fg.organisation_id, "name": frappe.db.get_value("Plattform Organisation", fg.organisation_id, "titel") or ""} if fg.organisation_id else None}
			for fg in frappe.get_all(DT_FREIGABE, filters={"projekt_id": p.name}, fields=["*"], limit_page_length=0)],
		"dokumente": [_dokument_json(d) for d in doks],
		"rueckfragen": [{"id": r.name, "projektId": r.projekt_id, "meilensteinId": r.meilenstein_id, "vonId": r.von_id, "anId": r.an_id or None, "backoffice": bool(cint(r.backoffice)), "text": r.text, "am": iso(r.am), "von": _person(r.von_id)} for r in fragen],
		"einladungen": [{"id": e.name, "projektId": e.projekt_id, "email": e.email, "meilensteinIds": aus_json(e.meilenstein_ids, []) or [], "ablauf": iso(e.ablauf), "status": e.status, "erstelltAm": iso(e.creation)}
			for e in frappe.get_all(DT_EINLADUNG, filters={"projekt_id": p.name}, fields=["name", "projekt_id", "email", "meilenstein_ids", "ablauf", "status", "creation"], limit_page_length=0)],
		"gutachterProfile": [profil_json(g) for g in dict.fromkeys(g for m in liste for g in m["gutachterIds"])],
		"darfBearbeiten": bo_schreiben(n),
	}


def _kennzahlen_speichern(p, k):
	"""Phase und Pipeline-Wert am Dokument aktualisieren (für Desk-Listen, Bericht und Druckformat)."""
	frappe.db.set_value(DT, p.name, {"phase": k["phase"] or "", "pipeline_wert": k["pipeline"]["wert"]}, update_modified=False)


# ================================================================ Lesen (Backoffice)


@frappe.whitelist(methods=["POST"])
def portfolio(q=None, status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	heute = nowdate()
	filters = {}
	if status in K.ENTWICKLUNG_STATUS:
		filters["status"] = status
	such = v.text(q, 80).lower()
	projekte, alle = [], []
	for name in frappe.get_all(DT, filters=filters, pluck="name", order_by="modified desc", limit_page_length=0):
		p = frappe.get_doc(DT, name)
		if such and such not in " ".join([p.titel or "", p.gemeinde or "", p.bundesland or "", p.name]).lower():
			continue
		liste = _ms_liste(p.name)
		k = kennzahlen(p, liste, heute)
		projekte.append(projekt_kurz(p, k))
		alle.append((p, liste, k))
	offen = [x for x in projekte if x["status"] in K.ENTWICKLUNG_OFFEN]
	r2 = lambda x: round(flt(x), 2)  # noqa: E731
	je_phase = []
	for ph in [None, *K.PHASEN_IDS]:
		t = [x for x in offen if (x["phase"] or None) == ph]
		je_phase.append({"phase": ph, "label": K.phase_label(ph), "anzahl": len(t), "mwp": r2(sum(x["mwp"] for x in t)), "wert": sum(x["pipeline"]["wert"] for x in t)})
	je_land = []
	for land, label in LAENDER.items():
		t = [x for x in offen if x["land"] == land]
		je_land.append({"land": land, "label": label, "anzahl": len(t), "mwp": r2(sum(x["mwp"] for x in t)), "wert": sum(x["pipeline"]["wert"] for x in t)})
	jahre = {}
	for x in projekte:
		if x["status"] == "abgebrochen":
			continue
		j = cint(str(x["prognoseCod"] or x["zielCod"] or "")[:4])
		if not j:
			continue
		e = jahre.setdefault(j, {"jahr": j, "mwp": 0, "mwpGewichtet": 0, "anzahl": 0})
		e["mwp"] = r2(e["mwp"] + x["mwp"])
		e["mwpGewichtet"] = r2(e["mwpGewichtet"] + x["pipeline"]["gewichtetMwp"])
		e["anzahl"] += 1
	in30 = K.plus_monate(heute, 1)
	verzug, fristen = [], []
	for p, liste, k in alle:
		if p.status not in K.ENTWICKLUNG_OFFEN:
			continue
		for m in liste:
			if m["status"] in K.MEILENSTEIN_FERTIG:
				continue
			e = {"projektId": p.name, "projektTitel": p.titel, "meilensteinId": m["id"], "titel": m["titel"], "sollEnde": m["sollEnde"], "status": m["status"],
				"kritisch": bool((k["_je"].get(m["id"]) or {}).get("kritisch")), "verantwortlich": _person(m["verantwortlichId"] or p.projektleiter_id)}
			if K.ist_ueberfaellig(m, heute):
				verzug.append({**e, "tage": K.verzug_tage(m, heute)})
			elif m["sollEnde"] and m["sollEnde"] <= in30:
				fristen.append({**e, "inTagen": K.tage_zwischen(heute, m["sollEnde"])})
	verzug.sort(key=lambda x: (not x["kritisch"], -x["tage"]))
	fristen.sort(key=lambda x: x["sollEnde"])
	auslastung = []
	for kid in {p.projektleiter_id for p, _l, _k in alle if p.projektleiter_id}:
		eigene = [(p, l) for p, l, _k in alle if p.projektleiter_id == kid and p.status in K.ENTWICKLUNG_OFFEN]
		offene = [m for _p, l in eigene for m in l if m["status"] not in K.MEILENSTEIN_FERTIG]
		auslastung.append({"id": kid, "name": name_von(kid), "projekte": len(eigene), "mwp": r2(sum(flt(p.mwp) for p, _l in eigene)), "offeneMeilensteine": len(offene),
			"ueberfaellig": len([m for m in offene if K.ist_ueberfaellig(m, heute)]), "faellig30": len([m for m in offene if m["sollEnde"] and heute <= m["sollEnde"] <= in30])})
	auslastung.sort(key=lambda a: -a["offeneMeilensteine"])
	return {
		"projekte": projekte,
		"summen": {"anzahl": len(offen), "mwp": r2(sum(x["mwp"] for x in offen)), "mwpGewichtet": r2(sum(x["pipeline"]["gewichtetMwp"] for x in offen)),
			"volumen": sum(x["pipeline"]["volumen"] for x in offen), "wert": sum(x["pipeline"]["wert"] for x in offen),
			"jePhase": je_phase, "jeLand": je_land, "jeJahr": sorted(jahre.values(), key=lambda e: e["jahr"]), "zielMwpJahr": K.ZIEL_MWP_JAHR},
		"verzug": verzug, "fristen": fristen, "auslastung": auslastung, "darfBearbeiten": bo_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	lese_noetig(n)
	return projekt_json(n, _projekt(id))


def _projektleiter():
	erg = []
	for kid in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0):
		k = frappe.db.get_value("Plattform Konto", kid, ["name", "aktiv", "backoffice_rollen"], as_dict=True)
		if k and cint(k.aktiv) and stufe(frappe._dict(rollen=["admin"], backofficeRollen=k.backoffice_rollen or ""), "entwicklung") >= 2:
			erg.append({"id": k.name, "name": name_von(k.name)})
	return erg


def _konten_mit_rolle(rolle):
	erg = []
	for kid in frappe.get_all("Plattform Konto Rolle", filters={"rolle": rolle, "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0):
		k = frappe.db.get_value("Plattform Konto", kid, ["name", "aktiv", "firma", "email"], as_dict=True)
		if k and cint(k.aktiv):
			erg.append({"id": k.name, "name": name_von(k.name), "firma": k.firma or "", "email": k.email})
	return erg


@frappe.whitelist(methods=["POST"])
def auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	verknuepft = set(frappe.get_all(DT_FLAECHE, filters={"flaeche_id": ["is", "set"]}, pluck="flaeche_id", limit_page_length=0))
	flaechen = [
		{"id": f.name, "bezeichnung": f.bezeichnung, "land": f.land, "bundesland": f.bundesland, "ort": f.ort or "", "ha": flt(f.ha), "agri": bool(cint(f.agri)), "status": f.status,
			"eigentuemer": name_von(f.nutzer_id) or "ohne Konto", "verknuepft": f.name in verknuepft}
		for f in frappe.get_all("Plattform Flaeche", filters={"status": ["not in", ["abgelehnt", "entwurf"]]}, fields=["name", "bezeichnung", "land", "bundesland", "ort", "ha", "agri", "status", "nutzer_id"], limit_page_length=0)
	]
	kontakte = [{"id": c.name, "name": " ".join(x for x in (c.vorname, c.nachname) if x) or c.firma or c.name, "firma": c.firma or "", "rollen": []}
		for c in frappe.get_all("Plattform CRM Kontakt", fields=["name", "vorname", "nachname", "firma"], order_by="nachname asc", limit_page_length=0)]
	return {
		"projektleiter": _projektleiter(), "flaechen": flaechen, "kontakte": kontakte, "investoren": _konten_mit_rolle("investor"),
		"organisationen": [{"id": o.name, "name": o.titel} for o in frappe.get_all("Plattform Organisation", fields=["name", "titel"], order_by="titel asc", limit_page_length=0)],
		"gutachter": [{**profil_json(k["id"]), **k} for k in _konten_mit_rolle("gutachter")],
	}


# ================================================================ Anlegen & Stammdaten


def _vorlage_schritte(land, typ):
	"""Vorlage aus dem Desk (aktiv) oder Standard aus entwicklung_vorlagen.py."""
	name = frappe.db.get_value(DT_VORLAGE, {"land": land, "typ": typ, "aktiv": 1}, "name")
	if not name:
		return K.vorlage(land, typ)
	d = frappe.get_doc(DT_VORLAGE, name)
	return [{
		"schluessel": s.schluessel, "titel": s.titel, "kategorie": s.kategorie or "gemeinde", "dauerMonate": flt(s.dauer_monate) or 1,
		"nach": [x.strip() for x in str(s.nach or "").split(",") if x.strip()], "phase": s.phase or None,
		"dokumentPflicht": [x.strip() for x in str(s.dokument_pflicht or "").splitlines() if x.strip()], "externTitel": s.extern_titel or "", "gutachten": bool(cint(s.gutachten)),
	} for s in d.schritte]


def _plan_anlegen(n, p):
	schritte = _vorlage_schritte(p.land, p.typ)
	# 1) anlegen (Kennungen per autoname), 2) Abhängigkeiten auf Kennungen abbilden, 3) Termine vorwärts rechnen
	id_von = {}
	for i, s in enumerate(schritte):
		doc = frappe.get_doc({
			"doctype": DT_MS, "projekt_id": p.name, "schluessel": s["schluessel"], "titel": s["titel"], "kategorie": s["kategorie"], "dauer_monate": s["dauerMonate"],
			"nach": als_json([]), "phase": s["phase"] or "", "dokument_pflicht": als_json(s["dokumentPflicht"]), "extern_titel": s["externTitel"], "gutachten": 1 if s["gutachten"] else 0,
			"status": "offen", "gutachter_ids": als_json([]), "erinnert": als_json({}), "reihenfolge": i,
		}).insert(ignore_permissions=True)
		id_von[s["schluessel"]] = doc.name
	liste = [{"id": id_von[s["schluessel"]], "nach": [id_von[x] for x in s["nach"] if x in id_von], "status": "offen", "dauerMonate": s["dauerMonate"], "_s": s} for s in schritte]
	geplant = K.plan_berechnen(liste, start=str(p.start or nowdate()), prognose=False)
	for m in geplant:
		frappe.db.set_value(DT_MS, m["id"], {"nach": als_json(m["nach"]), "soll_start": m["sollStart"], "soll_ende": m["sollEnde"]}, update_modified=False)
	if not p.ziel_cod:
		cod = next((m for m in geplant if m["_s"]["phase"] == "cod"), None)
		p.db_set("ziel_cod", (cod["sollEnde"] if cod else K.plus_monate(str(p.start), K.plan_monate(schritte)))[:7], update_modified=False)
	protokoll(n, "entwicklung_plan", "entwicklung", p.name, f"Meilenstein-Plan nach Vorlage {p.land}/{K.ENTWICKLUNG_TYPEN.get(p.typ)} angelegt ({len(geplant)} Meilensteine)")


def _stammdaten(p, d, neu):
	has = lambda k: k in d or neu  # noqa: E731
	if has("titel"):
		p.titel = v.text(d.get("titel"), 120)
	if has("typ"):
		p.typ = v.auswahl(d.get("typ"), list(K.ENTWICKLUNG_TYPEN), p.typ or "freiflaeche")
	if has("land"):
		p.land = v.auswahl(d.get("land"), list(LAENDER), p.land or "DE")
	if has("bundesland"):
		p.bundesland = v.auswahl(d.get("bundesland"), BUNDESLAENDER.get(p.land, []), "")
	for k, feld in (("gemeinde", "gemeinde"), ("landkreis", "landkreis"), ("nvp", "nvp"), ("netzbetreiber", "netzbetreiber")):
		if k in d:
			p.set(feld, v.text(d.get(k), 160))
	if "mwp" in d:
		p.mwp = v.zahl(d.get("mwp"), min=0, max=5000, stellen=2) or 0
	if "mwh" in d:
		p.mwh = v.zahl(d.get("mwh"), min=0, max=20000, stellen=1) or 0
	if "zielCod" in d:
		p.ziel_cod = v.monat(d.get("zielCod")) or ""
	if has("vermarktung"):
		p.vermarktung = v.auswahl(d.get("vermarktung"), list(K.VERMARKTUNG), p.vermarktung or "eeg")
	if "beschreibung" in d:
		p.beschreibung = v.mehrzeilig(d.get("beschreibung"), 4000)
	if "wahrscheinlichkeit" in d:
		p.wahrscheinlichkeit = v.zahl(d.get("wahrscheinlichkeit"), min=0, max=1, stellen=2) or 0
	if "start" in d:
		p.start = d.get("start") if re.match(r"^20\d\d-\d\d-\d\d$", str(d.get("start") or "")) else (p.start or nowdate())
	v.pflicht(len(p.titel or "") >= 3, "Bitte geben Sie einen Projekttitel an (mind. 3 Zeichen).")
	v.pflicht(bool(p.bundesland), "Bitte wählen Sie Bundesland bzw. Kanton.")
	if p.typ == "speicher":
		v.pflicht(flt(p.mwh) > 0 or flt(p.mwp) > 0, "Bitte geben Sie Leistung (MW) oder Kapazität (MWh) des Speichers an.")
	else:
		v.pflicht(flt(p.mwp) > 0, "Bitte geben Sie die geplante Leistung in MWp an.")


def _projektleiter_pruefen(kennung):
	k = v.kennung(kennung)
	if not k:
		return None
	if not any(x["id"] == k for x in _projektleiter()):
		ungueltig("Projektleitung: Konto mit Schreibrecht „Projektentwicklung“ wählen.")
	return k


def _vorschlag_aus_flaeche(f):
	typ = "dach" if f.nutzung == "dach" else "agri" if cint(f.agri) else "freiflaeche"
	return {"titel": f"{K.ENTWICKLUNG_TYPEN[typ]} {f.ort or f.bezeichnung}"[:100], "typ": typ, "land": f.land or "DE", "bundesland": f.bundesland or "", "gemeinde": f.ort or "",
		"mwp": None if typ == "dach" else K.mwp_aus_flaeche(f.ha, agri=bool(cint(f.agri)))}


def _pacht_aus_flaeche(status):
	if status in ("vertrag", "planung", "bau", "betrieb"):
		return "pachtvertrag"
	return "verhandlung" if status == "pachtangebot" else "angefragt"


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	f = None
	if d.get("flaecheId"):
		fid = v.kennung(d.get("flaecheId"))
		if not fid or not frappe.db.exists("Plattform Flaeche", fid):
			ungueltig("Fläche nicht gefunden.")
		if frappe.db.exists(DT_FLAECHE, {"flaeche_id": fid}):
			konflikt("Diese Fläche ist bereits einem Entwicklungsprojekt zugeordnet.")
		f = frappe.get_doc("Plattform Flaeche", fid)
	werte = {**(_vorschlag_aus_flaeche(f) if f else {}), **{k: w for k, w in d.items() if w not in (None, "")}}
	werte["start"] = d.get("start") or nowdate()
	p = frappe.new_doc(DT)
	_stammdaten(p, werte, neu=True)
	p.status = "aktiv"
	p.projektleiter_id = _projektleiter_pruefen(d.get("projektleiterId")) or (n.id if bo_schreiben(n) else None)
	p.insert(ignore_permissions=True)
	if f:
		frappe.get_doc({"doctype": DT_FLAECHE, "projekt_id": p.name, "flaeche_id": f.name, "bezeichnung": f.bezeichnung, "eigentuemer_name": name_von(f.nutzer_id) or "",
			"ha": flt(f.ha), "pacht_status": _pacht_aus_flaeche(f.status)}).insert(ignore_permissions=True)
	if d.get("mitVorlage") is not False:
		_plan_anlegen(n, p)
	p.reload()
	_kennzahlen_speichern(p, kennzahlen(p))
	protokoll(n, "entwicklung_angelegt", "entwicklung", p.name, f"Entwicklungsprojekt angelegt: {p.titel}" + (f" (aus Fläche {f.name})" if f else ""))
	return projekt_json(n, p)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	p = _projekt(id)
	d = aus_json(daten, {}) or {}
	alt_status = p.status
	_stammdaten(p, d, neu=False)
	if "projektleiterId" in d:
		p.projektleiter_id = _projektleiter_pruefen(d.get("projektleiterId"))
	if "status" in d:
		neu = v.auswahl(d.get("status"), list(K.ENTWICKLUNG_STATUS), p.status)
		if neu != alt_status and neu in ("boerse", "bau"):
			konflikt("Übergaben bitte über „Übergabe an Börse“ bzw. „Übergabe an Bau/Betrieb“.")
		p.status = neu
	p.save(ignore_permissions=True)
	if p.status != alt_status:
		_entscheidung(p.name, f"Status: {K.ENTWICKLUNG_STATUS[p.status]}", "nogo" if p.status == "abgebrochen" else "strategie",
			f"Projektstatus von „{K.ENTWICKLUNG_STATUS.get(alt_status)}“ auf „{K.ENTWICKLUNG_STATUS[p.status]}“ gesetzt.", n.id, v.mehrzeilig(d.get("begruendung"), 2000))
	_kennzahlen_speichern(p, kennzahlen(p))
	protokoll(n, "entwicklung_geaendert", "entwicklung", p.name, ("Stammdaten geändert: " + ", ".join(k for k in d if k != "id"))[:280])
	return projekt_json(n, p)


def _entscheidung(pid, titel, art, beschluss, von_id, begruendung=""):
	return frappe.get_doc({"doctype": DT_ENTSCHEIDUNG, "projekt_id": pid, "datum": nowdate(), "titel": v.text(titel, 160), "art": art, "beschluss": beschluss, "begruendung": begruendung, "von_id": von_id}).insert(ignore_permissions=True)


# ================================================================ Einträge


def _datum_ok(s):
	return s if re.match(r"^20\d\d-\d\d-\d\d$", str(s or "")) else None


def _meilenstein(n, p, kennung, d):
	liste = _ms_liste(p.name)
	alt = next((m for m in liste if m["id"] == kennung), None) if kennung else None
	if kennung and not alt:
		nicht_gefunden("Meilenstein nicht gefunden.")
	m = dict(alt) if alt else {"id": None, "projektId": p.name, "schluessel": "eigen", "titel": "", "kategorie": "gemeinde", "dauerMonate": 1, "nach": [], "phase": None, "dokumentPflicht": [],
		"externTitel": "", "gutachten": False, "status": "offen", "sollStart": None, "sollEnde": None, "sollFix": False, "istStart": None, "istEnde": None, "verantwortlichId": None,
		"gutachterIds": [], "notiz": "", "eingereichtAm": None, "nachweisVerzicht": "", "erinnert": {}, "reihenfolge": len(liste)}
	if "titel" in d or not alt:
		m["titel"] = v.text(d.get("titel"), 160)
	v.pflicht(len(m["titel"]) >= 3, "Bitte geben Sie einen Titel an.")
	if "kategorie" in d:
		m["kategorie"] = v.auswahl(d.get("kategorie"), list(K.KATEGORIEN), m["kategorie"])
	if "dauerMonate" in d:
		m["dauerMonate"] = v.zahl(d.get("dauerMonate"), min=0.25, max=60, stellen=2) or m["dauerMonate"]
	for k, n_ in (("externTitel", 120), ("notiz", 3000), ("nachweisVerzicht", 500)):
		if k in d:
			m[k] = v.text(d.get(k), n_) if k == "externTitel" else v.mehrzeilig(d.get(k), n_)
	if "phase" in d:
		m["phase"] = v.auswahl(d.get("phase"), K.PHASEN_IDS, "") or None
	if "dokumentPflicht" in d:
		m["dokumentPflicht"] = v.text_liste(d.get("dokumentPflicht"), maximal=8, laenge=120)
	if "verantwortlichId" in d:
		k = v.kennung(d.get("verantwortlichId"))
		if k and "admin" not in [r.rolle for r in (frappe.get_doc("Plattform Konto", k).rollen if frappe.db.exists("Plattform Konto", k) else [])]:
			ungueltig("Verantwortlich kann nur ein Backoffice-Konto sein.")
		m["verantwortlichId"] = k or None
	neue_gutachter = []
	if "gutachterIds" in d:
		ids = [x for x in (v.kennung(x) for x in (d.get("gutachterIds") or [])[:10]) if x]
		for g in ids:
			if not frappe.db.exists("Plattform Konto Rolle", {"parent": g, "rolle": "gutachter", "parenttype": "Plattform Konto"}):
				ungueltig("Zuweisen lassen sich nur Konten mit der Rolle Gutachter/Planer (Einladung nutzen).")
		neue_gutachter = [g for g in ids if g not in m["gutachterIds"]]
		m["gutachterIds"] = list(dict.fromkeys(ids))
	if "nach" in d:
		vorg = [x for x in (v.kennung(x) for x in (d.get("nach") or [])) if x]
		for x in vorg:
			if x == m["id"] or not any(y["id"] == x for y in liste):
				ungueltig("Abhängigkeit: unbekannter Meilenstein.")
		probe = [y for y in liste if y["id"] != m["id"]] + [{**m, "id": m["id"] or "__neu__"}]
		if K.erzeugt_kreis(probe, m["id"] or "__neu__", vorg):
			konflikt("Diese Abhängigkeit würde einen Kreis erzeugen.")
		m["nach"] = list(dict.fromkeys(vorg))
	for k in ("sollStart", "sollEnde", "istStart", "istEnde"):
		if k in d:
			m[k] = _datum_ok(d.get(k))
	if "sollStart" in d or "sollEnde" in d:
		m["sollFix"] = bool(m["sollStart"] and m["sollEnde"])
	if m["sollStart"] and m["sollEnde"] and m["sollEnde"] < m["sollStart"]:
		ungueltig("Das Soll-Ende liegt vor dem Soll-Start.")
	if m["istStart"] and m["istEnde"] and m["istEnde"] < m["istStart"]:
		ungueltig("Das Ist-Ende liegt vor dem Ist-Start.")
	alt_status = alt["status"] if alt else "offen"
	if "status" in d:
		m["status"] = v.auswahl(d.get("status"), list(K.MEILENSTEIN_STATUS), m["status"])
	gesamt = [y for y in liste if y["id"] != m["id"]] + [m]
	if m["status"] == "erledigt" and alt_status != "erledigt":
		offen = K.offene_vorgaenger(gesamt, m)
		if offen:
			konflikt("Erst die Vorgänger abschließen: " + ", ".join(x["titel"] for x in offen) + ".")
		pflichten = set(frappe.get_all(DT_DOKUMENT, filters={"meilenstein_id": m["id"]}, pluck="pflicht", limit_page_length=0)) if m["id"] else set()
		fehlt = [pf for pf in m["dokumentPflicht"] if pf not in pflichten]
		if fehlt and len(m["nachweisVerzicht"] or "") < 10:
			frappe.throw(f"Dokumentenpflicht: {', '.join(fehlt)} fehlt. Bitte hochladen oder den Verzicht begründen (mind. 10 Zeichen).", frappe.ValidationError)
		m["istEnde"] = m["istEnde"] or nowdate()
		m["istStart"] = m["istStart"] or m["sollStart"] or m["istEnde"]
	if m["status"] == "in_arbeit" and not m["istStart"]:
		m["istStart"] = nowdate()
	if alt_status == "erledigt" and m["status"] != "erledigt":
		nf = [y for y in liste if m["id"] in (y["nach"] or []) and y["status"] == "erledigt"]
		if nf:
			konflikt("Nachfolger sind bereits erledigt: " + ", ".join(x["titel"] for x in nf) + ".")
		m["istEnde"] = None
	if not m["sollStart"] or not m["sollEnde"]:
		probe = K.plan_berechnen([y for y in liste if y["id"] != m["id"]] + [{**m, "id": m["id"] or "__neu__"}], start=str(p.start or nowdate()), prognose=False)
		x = next(y for y in probe if y["id"] == (m["id"] or "__neu__"))
		m["sollStart"], m["sollEnde"] = x["sollStart"], x["sollEnde"]
	werte = {
		"titel": m["titel"], "kategorie": m["kategorie"], "dauer_monate": m["dauerMonate"], "nach": als_json(m["nach"]), "phase": m["phase"] or "", "dokument_pflicht": als_json(m["dokumentPflicht"]),
		"extern_titel": m["externTitel"], "status": m["status"], "soll_start": m["sollStart"], "soll_ende": m["sollEnde"], "soll_fix": 1 if m["sollFix"] else 0, "ist_start": m["istStart"],
		"ist_ende": m["istEnde"], "verantwortlich_id": m["verantwortlichId"], "gutachter_ids": als_json(m["gutachterIds"]), "notiz": m["notiz"], "nachweis_verzicht": m["nachweisVerzicht"],
	}
	if alt:
		doc = frappe.get_doc(DT_MS, alt["id"])
		doc.update(werte)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": DT_MS, "projekt_id": p.name, "schluessel": "eigen", "reihenfolge": m["reihenfolge"], "erinnert": als_json({}), **werte}).insert(ignore_permissions=True)
	# Nachfolger ohne Prognose neu terminieren (Soll-Basis bleibt)
	_termine_schreiben(K.plan_berechnen(_ms_liste(p.name), start=str(p.start or nowdate()), prognose=False))
	if m["status"] == "erledigt" and alt_status != "erledigt":
		protokoll(n, "meilenstein_erledigt", "entwicklung", p.name, f"Meilenstein erledigt: {doc.titel}")
		_fortschritt_melden(p, doc)
	else:
		protokoll(n, "meilenstein_geaendert" if alt else "meilenstein_angelegt", "entwicklung", p.name, f"{'Meilenstein geändert' if alt else 'Meilenstein angelegt'}: {doc.titel}")
	for g in neue_gutachter:
		benachrichtigen(g, "entwicklung", f"Neuer Auftrag: {doc.titel}", f"Ihnen wurde im Projekt „{p.titel}“ ein Meilenstein zugewiesen. Soll-Termin: {_datum(doc.soll_ende) or 'offen'}.",
			f"/portal/entwicklung/{p.name}", "entwicklung", p.name)
	return ms_dict(frappe.get_doc(DT_MS, doc.name))


def _fortschritt_melden(p, m):
	"""Meilenstein erledigt → vereinfachte Meldung an Eigentümer (nur mit externem Titel) und Co-Investoren."""
	gemeldet = set()
	if m.extern_titel:
		for fid in frappe.get_all(DT_FLAECHE, filters={"projekt_id": p.name, "flaeche_id": ["is", "set"]}, pluck="flaeche_id", limit_page_length=0):
			eig = frappe.db.get_value("Plattform Flaeche", fid, "nutzer_id")
			if eig and eig not in gemeldet:
				gemeldet.add(eig)
				benachrichtigen(eig, "entwicklung", "Neuer Fortschritt bei Ihrem Projekt", f"Erledigt: {m.extern_titel}.", f"/portal/entwicklung/{p.name}", "entwicklung", p.name)
	for kid in frappe.get_all(DT_FREIGABE, filters={"projekt_id": p.name, "nutzer_id": ["is", "set"]}, pluck="nutzer_id", limit_page_length=0):
		if kid not in gemeldet:
			gemeldet.add(kid)
			benachrichtigen(kid, "entwicklung", f"Meilenstein erreicht: {p.titel}", f"Erledigt: {m.titel}.", f"/portal/entwicklung/{p.name}", "entwicklung", p.name)


def _einfacher_eintrag(dt, p, kennung, felder, pruefen=None):
	if kennung:
		if not frappe.db.exists(dt, {"name": kennung, "projekt_id": p.name}):
			nicht_gefunden("Eintrag nicht gefunden.")
		doc = frappe.get_doc(dt, kennung)
		doc.update(felder)
		if pruefen:
			pruefen(doc)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": dt, "projekt_id": p.name, **felder})
		if pruefen:
			pruefen(doc)
		doc.insert(ignore_permissions=True)
	return doc


def _eintrag(n, p, art, kennung, d):
	if art == "gutachterprofil":  # kennung = Konto-ID des Gutachters
		if not kennung or not frappe.db.exists("Plattform Konto Rolle", {"parent": kennung, "rolle": "gutachter", "parenttype": "Plattform Konto"}):
			nicht_gefunden("Gutachter nicht gefunden.")
		_profil_setzen(kennung, d)
		protokoll(n, "gutachter_profil", "entwicklung", p.name, f"Gutachter-Profil gepflegt: {name_von(kennung)}")
		return profil_json(kennung)
	if art == "meilenstein":
		return _meilenstein(n, p, kennung, d)
	if art == "flaeche":
		f = {}
		if "flaecheId" in d:
			fid = v.kennung(d.get("flaecheId"))
			if fid and not frappe.db.exists("Plattform Flaeche", fid):
				ungueltig("Plattform-Fläche nicht gefunden.")
			if fid and frappe.db.exists(DT_FLAECHE, {"flaeche_id": fid, "name": ["!=", kennung or ""]}):
				konflikt("Diese Fläche ist bereits einem Entwicklungsprojekt zugeordnet.")
			f["flaeche_id"] = fid or None
			if fid:
				pf = frappe.db.get_value("Plattform Flaeche", fid, ["bezeichnung", "ha", "nutzer_id"], as_dict=True)
				f.setdefault("bezeichnung", pf.bezeichnung)
				f.setdefault("ha", flt(pf.ha))
				f.setdefault("eigentuemer_name", name_von(pf.nutzer_id))
		for k, feld in (("bezeichnung", "bezeichnung"), ("eigentuemerName", "eigentuemer_name")):
			if d.get(k):
				f[feld] = v.text(d.get(k), 120)
		if "ha" in d:
			f["ha"] = v.zahl(d.get("ha"), min=0, max=100000, stellen=2) or 0
		if "pachtStatus" in d:
			f["pacht_status"] = v.auswahl(d.get("pachtStatus"), list(K.PACHT_STATUS), "angefragt")
		for k, feld in (("pachtBeginn", "pacht_beginn"), ("pachtEnde", "pacht_ende")):
			if k in d:
				f[feld] = _datum_ok(d.get(k))
		if "pachtEurHa" in d:
			f["pacht_eur_ha"] = v.zahl(d.get("pachtEurHa"), min=0, max=100000) or 0
		if "notiz" in d:
			f["notiz"] = v.mehrzeilig(d.get("notiz"), 2000)
		doc = _einfacher_eintrag(DT_FLAECHE, p, kennung, f, lambda x: v.pflicht(len(x.bezeichnung or "") >= 2, "Bitte geben Sie eine Bezeichnung der Fläche an."))
		protokoll(n, "projektflaeche", "entwicklung", p.name, f"Projektfläche {'geändert' if kennung else 'verknüpft'}: {doc.bezeichnung}")
		return {"id": doc.name, "flaecheId": doc.flaeche_id or None, "bezeichnung": doc.bezeichnung, "pachtStatus": doc.pacht_status}
	if art == "risiko":
		f = {}
		if "titel" in d or not kennung:
			f["titel"] = v.text(d.get("titel"), 160)
		if "kategorie" in d:
			f["kategorie"] = v.auswahl(d.get("kategorie"), list(K.RISIKO_KATEGORIEN), "sonstige")
		for k in ("eintritt", "auswirkung"):
			if k in d:
				f[k] = int(v.zahl(d.get(k), min=1, max=5) or 3)
		if "massnahme" in d:
			f["massnahme"] = v.mehrzeilig(d.get("massnahme"), 2000)
		if "status" in d:
			f["status"] = v.auswahl(d.get("status"), list(K.RISIKO_STATUS), "offen")
		if "extern" in d:
			f["extern"] = 1 if v.wahr(d.get("extern")) else 0
		if "meilensteinId" in d:
			mid = v.kennung(d.get("meilensteinId"))
			f["meilenstein_id"] = mid if mid and frappe.db.exists(DT_MS, {"name": mid, "projekt_id": p.name}) else None
		if "verantwortlichId" in d:
			f["verantwortlich_id"] = v.kennung(d.get("verantwortlichId")) or None
		doc = _einfacher_eintrag(DT_RISIKO, p, kennung, f, lambda x: v.pflicht(len(x.titel or "") >= 3, "Bitte beschreiben Sie das Risiko."))
		protokoll(n, "risiko", "entwicklung", p.name, f"Risiko {'geändert' if kennung else 'erfasst'}: {doc.titel} ({doc.eintritt}×{doc.auswirkung})")
		return {"id": doc.name, "titel": doc.titel, "eintritt": cint(doc.eintritt), "auswirkung": cint(doc.auswirkung), "score": cint(doc.score)}
	if art == "entscheidung":
		if kennung:
			konflikt("Das Entscheidungsprotokoll ist unveränderlich – bitte eine neue Entscheidung erfassen.")
		titel, beschluss = v.text(d.get("titel"), 160), v.mehrzeilig(d.get("beschluss"), 3000)
		v.pflicht(len(titel) >= 3 and len(beschluss) >= 3, "Bitte Titel und Beschluss angeben.")
		doc = frappe.get_doc({"doctype": DT_ENTSCHEIDUNG, "projekt_id": p.name, "datum": _datum_ok(d.get("datum")) or nowdate(), "titel": titel, "art": v.auswahl(d.get("art"), list(K.ENTSCHEIDUNG_ARTEN), "sonstige"),
			"beschluss": beschluss, "begruendung": v.mehrzeilig(d.get("begruendung"), 3000), "beteiligte": v.text(d.get("beteiligte"), 300), "von_id": n.id}).insert(ignore_permissions=True)
		protokoll(n, "entscheidung", "entwicklung", p.name, f"Entscheidung protokolliert: {doc.titel}")
		return {"id": doc.name, "titel": doc.titel}
	if art == "budget":
		f = {}
		if "kategorie" in d:
			f["kategorie"] = v.auswahl(d.get("kategorie"), list(K.BUDGET_KATEGORIEN), "sonstiges")
		if "bezeichnung" in d or not kennung:
			f["bezeichnung"] = v.text(d.get("bezeichnung"), 160) or K.BUDGET_KATEGORIEN.get(f.get("kategorie") or "sonstiges")
		if "planEur" in d:
			f["plan_eur"] = v.zahl(d.get("planEur"), min=0, max=1e9) or 0
		if "istEur" in d:
			if kennung and frappe.db.get_value(DT_BUDGET, kennung, "ist_quelle") == "erpnext":
				konflikt("Ist-Werte dieser Position kommen aus ERPNext und sind hier nicht änderbar.")
			f["ist_eur"] = v.zahl(d.get("istEur"), min=0, max=1e9) or 0
			f["ist_quelle"] = "manuell"
		if "notiz" in d:
			f["notiz"] = v.mehrzeilig(d.get("notiz"), 1000)
		doc = _einfacher_eintrag(DT_BUDGET, p, kennung, f)
		protokoll(n, "budget", "entwicklung", p.name, f"Budgetposition {'geändert' if kennung else 'angelegt'}: {doc.bezeichnung}")
		return {"id": doc.name, "bezeichnung": doc.bezeichnung, "planEur": flt(doc.plan_eur), "istEur": flt(doc.ist_eur)}
	if art == "kontakt":
		f = {}
		if not kennung:
			kid = v.kennung(d.get("kontaktId"))
			if not kid or not frappe.db.exists("Plattform CRM Kontakt", kid):
				ungueltig("Bitte einen Kontakt aus dem CRM wählen.")
			f["kontakt_id"] = kid
		if "rolle" in d or not kennung:
			f["rolle"] = v.auswahl(d.get("rolle"), list(K.KONTAKT_ROLLEN), "sonstige")
		if "notiz" in d:
			f["notiz"] = v.mehrzeilig(d.get("notiz"), 1000)
		if not kennung and frappe.db.exists(DT_KONTAKT, {"projekt_id": p.name, "kontakt_id": f["kontakt_id"], "rolle": f["rolle"]}):
			konflikt("Dieser Kontakt ist mit dieser Rolle bereits verknüpft.")
		doc = _einfacher_eintrag(DT_KONTAKT, p, kennung, f)
		protokoll(n, "kontakt", "entwicklung", p.name, f"Stakeholder {'geändert' if kennung else 'verknüpft'} ({K.KONTAKT_ROLLEN.get(doc.rolle)})")
		return {"id": doc.name, "kontaktId": doc.kontakt_id, "rolle": doc.rolle}
	if art == "freigabe":
		f = {}
		if not kennung:
			kid, oid = v.kennung(d.get("nutzerId")), v.kennung(d.get("organisationId"))
			if kid and not frappe.db.exists("Plattform Konto Rolle", {"parent": kid, "rolle": "investor", "parenttype": "Plattform Konto"}):
				ungueltig("Co-Development-Freigaben gibt es nur für Investorenkonten.")
			if oid and not frappe.db.exists("Plattform Organisation", oid):
				ungueltig("Organisation nicht gefunden.")
			if not kid and not oid:
				ungueltig("Bitte ein Investorenkonto oder eine Organisation wählen.")
			if (kid and frappe.db.exists(DT_FREIGABE, {"projekt_id": p.name, "nutzer_id": kid})) or (oid and frappe.db.exists(DT_FREIGABE, {"projekt_id": p.name, "organisation_id": oid})):
				konflikt("Für dieses Konto bzw. diese Organisation besteht bereits eine Freigabe.")
			f.update(nutzer_id=kid or None, organisation_id=oid or None, seit=now_datetime(), von_id=n.id)
		for k in ("risiken", "dokumente"):
			if k in d or not kennung:
				f[k] = 1 if v.wahr(d.get(k, True)) else 0
		doc = _einfacher_eintrag(DT_FREIGABE, p, kennung, f)
		if not kennung and doc.nutzer_id:
			benachrichtigen(doc.nutzer_id, "entwicklung", "Co-Development: Projekt freigegeben", f"Sie können den Fortschritt von „{p.titel}“ im Portal verfolgen.", f"/portal/entwicklung/{p.name}", "entwicklung", p.name)
		protokoll(n, "freigabe", "entwicklung", p.name, f"Co-Development-Freigabe {'geändert' if kennung else 'erteilt'}")
		return {"id": doc.name, "nutzerId": doc.nutzer_id or None, "organisationId": doc.organisation_id or None}
	ungueltig("Unbekannte Eintragsart.")


@frappe.whitelist(methods=["POST"])
def eintrag_speichern(projektId=None, art=None, id=None, daten=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	p = _projekt(projektId)
	e = _eintrag(n, p, art, v.kennung(id) or None, aus_json(daten, {}) or {})
	p.reload()
	_kennzahlen_speichern(p, kennzahlen(p))
	return {"eintrag": e, "projekt": projekt_json(n, p)}


@frappe.whitelist(methods=["POST"])
def eintrag_loeschen(projektId=None, art=None, id=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	p = _projekt(projektId)
	k = v.kennung(id)
	dt = {"flaeche": DT_FLAECHE, "risiko": DT_RISIKO, "budget": DT_BUDGET, "kontakt": DT_KONTAKT, "freigabe": DT_FREIGABE, "meilenstein": DT_MS}.get(art)
	if art == "entscheidung":
		konflikt("Das Entscheidungsprotokoll ist unveränderlich.")
	if not dt:
		ungueltig("Unbekannte Eintragsart.")
	if not k or not frappe.db.exists(dt, {"name": k, "projekt_id": p.name}):
		nicht_gefunden("Eintrag nicht gefunden.")
	if art == "budget" and frappe.db.get_value(DT_BUDGET, k, "ist_quelle") == "erpnext":
		konflikt("Positionen mit Ist-Werten aus ERPNext werden dort gepflegt.")
	if art == "meilenstein":
		m = ms_dict(frappe.get_doc(DT_MS, k))
		if m["status"] == "erledigt":
			konflikt("Erledigte Meilensteine bleiben erhalten (Status „Entfällt“ nutzen).")
		if frappe.db.exists(DT_DOKUMENT, {"meilenstein_id": k}):
			konflikt("Am Meilenstein hängen Dokumente – bitte „Entfällt“ nutzen.")
		for x in _ms_liste(p.name):
			if k in x["nach"]:
				frappe.db.set_value(DT_MS, x["id"], "nach", als_json(list(dict.fromkeys([y for y in x["nach"] if y != k] + m["nach"]))), update_modified=False)
	frappe.delete_doc(dt, k, ignore_permissions=True, force=True)
	protokoll(n, "eintrag_entfernt", "entwicklung", p.name, f"Eintrag entfernt ({art})")
	_kennzahlen_speichern(p, kennzahlen(p))
	return projekt_json(n, p)


# ================================================================ Aktionen


@frappe.whitelist(methods=["POST"])
def aktion(projektId=None, aktion=None, begruendung=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	p = _projekt(projektId)
	liste = _ms_liste(p.name)
	if aktion == "plan_neu":
		neu = K.plan_berechnen([{**m, "sollFix": False} for m in liste], start=str(p.start or nowdate()), fixieren=False)
		_termine_schreiben(neu)
		frappe.db.sql(f"update `tab{DT_MS}` set soll_fix = 0 where projekt_id = %s", (p.name,))
		protokoll(n, "entwicklung_plan", "entwicklung", p.name, "Terminplan neu berechnet (Vorwärtsrechnung, fixe Termine gelöst)")
		return {"ok": True, "projekt": projekt_json(n, p)}
	if aktion == "vorlage_anwenden":
		if liste:
			konflikt("Das Projekt hat bereits Meilensteine.")
		_plan_anlegen(n, p)
		return {"ok": True, "projekt": projekt_json(n, p)}
	if aktion == "uebergabe_boerse":
		return _uebergabe_boerse(n, p, liste, v.mehrzeilig(begruendung, 2000))
	if aktion == "uebergabe_anlage":
		return _uebergabe_anlage(n, p, liste)
	if aktion == "erpnext_sync":
		return {"ok": True, **erpnext_sync(p, n), "projekt": projekt_json(n, p)}
	ungueltig("Unbekannte Aktion.")


def _uebergabe_boerse(n, p, liste, begruendung):
	if p.boerse_projekt_id:
		konflikt("Das Projekt wurde bereits an die Börse übergeben.")
	from oekoinvest_app.plattform.kern import verlauf

	k = kennzahlen(p, liste)
	zusage = next((m for m in liste if m["schluessel"] == "netzzusage"), None)
	anfrage = next((m for m in liste if m["schluessel"] == "netzanfrage"), None)
	netz = "zusage" if zusage and zusage["status"] == "erledigt" else "angefragt" if anfrage and anfrage["status"] == "erledigt" else "offen"
	titel = f"{K.ENTWICKLUNG_TYPEN.get(p.typ, 'PV-Projekt')} {str(flt(p.mwp)).replace('.', ',').rstrip('0').rstrip(',')} MWp, {p.bundesland}"[:120]
	bp = frappe.get_doc({
		"doctype": "Plattform Projekt", "anbieter_id": n.id, "status": "entwurf", "aufrufe": 0, "zustaendig_id": n.id,
		"titel": titel, "typ": p.typ, "land": p.land, "bundesland": p.bundesland, "region": p.landkreis or "", "mwp": flt(p.mwp), "mwh_speicher": flt(p.mwh), "flaeche_ha": k["flaecheHa"],
		"phase": k["phase"] or "flaeche", "netzanschluss": netz, "cod_geplant": (k["prognoseCod"] or "")[:7] or (p.ziel_cod or ""), "preis_modus": "anfrage",
		"beschreibung": f"Aus der eigenen Projektentwicklung von ÖkoInvest ({k['phaseLabel']}). {p.beschreibung or ''}".strip()[:4000], "highlights": als_json([]),
		"vertraulich": als_json({"gemeinde": p.gemeinde or "", "gemarkung": "", "flurstuecke": "", "netzbetreiber": p.netzbetreiber or "", "einspeisepunkt": p.nvp or "", "entfernungNetzKm": None,
			"sicherung": f"{k['flaecheGesichertHa']} von {k['flaecheHa']} ha gesichert", "planungsrecht": k["phaseLabel"], "ertragKwhKwp": None, "verguetung": K.vermarktung_label(p.vermarktung, p.land), "details": ""}),
	})
	verlauf(bp, "entwurf", n, "admin", f"Übergabe aus Entwicklungsprojekt {p.name}")
	bp.insert(ignore_permissions=True)
	p.db_set({"boerse_projekt_id": bp.name, "status": "boerse"})
	_entscheidung(p.name, "Übergabe an die Projektbörse", "strategie", f"Börsen-Projekt {bp.name} als Entwurf angelegt (Freigabe über „Projekt-Freigabe“).", n.id, begruendung)
	protokoll(n, "uebergabe_boerse", "entwicklung", p.name, f"An Börse übergeben: Projekt {bp.name}")
	protokoll(n, "anlegen", "projekt", bp.name, f"Projekt aus Entwicklung {p.name} angelegt")
	return {"ok": True, "boerseProjektId": bp.name, "projekt": projekt_json(n, p)}


def _uebergabe_anlage(n, p, liste):
	if stufe(n, "anlagen") < 2:
		verboten("Für die Übergabe an Bau/Betrieb ist zusätzlich das Schreibrecht „Anlagen & Monitoring“ nötig.")
	if p.anlage_id:
		konflikt("Das Projekt wurde bereits an Bau/Betrieb übergeben.")
	if K.phase_aus_meilensteinen(liste) not in ("rtb", "cod"):
		konflikt("Übergabe an Bau/Betrieb erst ab Baureife (RTB).")
	from oekoinvest_app.plattform.api import anlagen

	typ = "freiflaeche" if p.typ == "hybrid" else p.typ
	a = anlagen.anlegen(daten={
		"name": p.titel, "typ": typ, "status": "bau", "land": p.land, "bundesland": p.bundesland, "ort": p.gemeinde or "",
		"kwp": 0 if typ == "speicher" else round(flt(p.mwp) * 1000), "speicherKwh": round(flt(p.mwh) * 1000), "speicherKw": round(flt(p.mwp) * 1000) if typ == "speicher" else 0,
		"lastprofil": "keins", "beschreibung": f"Übernommen aus Entwicklungsprojekt {p.name}.",
	}, als_benutzer=n.id)
	p.db_set({"anlage_id": a["id"], "status": "bau"})
	_entscheidung(p.name, "Übergabe an Bau/Betrieb", "go", f"Anlage {a['id']} im Anlagen-Monitoring angelegt (Status „Im Bau“).", n.id)
	protokoll(n, "uebergabe_anlage", "entwicklung", p.name, f"An Bau/Betrieb übergeben: Anlage {a['id']}")
	return {"ok": True, "anlageId": a["id"], "projekt": projekt_json(n, p)}


# ================================================================ ERPNext (optional)


def erpnext_aktiv():
	return "erpnext" in frappe.get_installed_apps() and bool(cint(frappe.conf.get("oekoinvest_erpnext_entwicklung")))


def erpnext_sync(p, n=None):
	"""Beidseitige Synchronisation mit ERPNext Project/Task (siehe Kopfkommentar). Ohne ERPNext → Konflikt mit Hinweis."""
	if not erpnext_aktiv():
		konflikt("ERPNext ist nicht angebunden (App installieren und site_config „oekoinvest_erpnext_entwicklung“: 1 setzen). Ist-Kosten werden manuell gepflegt.")
	liste = _ms_liste(p.name)
	k = kennzahlen(p, liste)
	status_erp = {"aktiv": "Open", "pausiert": "Open", "boerse": "Completed", "bau": "Completed", "abgebrochen": "Cancelled"}.get(p.status, "Open")
	# ---- nach ERPNext
	if p.erp_projekt and frappe.db.exists("Project", p.erp_projekt):
		proj = frappe.get_doc("Project", p.erp_projekt)
	else:
		proj = frappe.new_doc("Project")
		proj.project_name = f"{p.titel} ({p.name})"[:140]
	proj.status = status_erp
	proj.expected_start_date = p.start
	proj.expected_end_date = k["prognoseCod"]
	proj.notes = f"Entwicklungsprojekt {p.name} – Pflege im Portal (Projektentwicklung)."
	proj.flags.ignore_permissions = True
	proj.save() if not proj.is_new() else proj.insert()
	if p.erp_projekt != proj.name:
		p.db_set("erp_projekt", proj.name, update_modified=False)
	task_von = {}
	for m in liste:
		name = m.get("erpTask")
		t = frappe.get_doc("Task", name) if name and frappe.db.exists("Task", name) else frappe.new_doc("Task")
		t.subject = m["titel"][:140]
		t.project = proj.name
		t.exp_start_date = m["sollStart"]
		t.exp_end_date = m["sollEnde"]
		if m["status"] == "erledigt":
			t.status = "Completed"
		elif m["status"] == "entfaellt":
			t.status = "Cancelled"
		elif t.status in (None, "", "Completed", "Cancelled"):
			t.status = "Working" if m["status"] == "in_arbeit" else "Open"
		t.flags.ignore_permissions = True
		t.save() if not t.is_new() else t.insert()
		task_von[m["id"]] = t.name
		if m.get("erpTask") != t.name:
			frappe.db.set_value(DT_MS, m["id"], "erp_task", t.name, update_modified=False)
	for m in liste:  # Abhängigkeiten (Task Depends On)
		t = frappe.get_doc("Task", task_von[m["id"]])
		soll = [task_von[x] for x in m["nach"] if x in task_von]
		if sorted(r.task for r in (t.get("depends_on") or [])) != sorted(soll):
			t.set("depends_on", [{"task": x} for x in soll])
			t.flags.ignore_permissions = True
			t.save()
	# ---- von ERPNext
	uebernommen, konflikte = [], []
	liste = _ms_liste(p.name)
	for m in liste:
		if m["status"] in K.MEILENSTEIN_FERTIG or not m.get("erpTask"):
			continue
		t = frappe.db.get_value("Task", m["erpTask"], ["status", "act_end_date"], as_dict=True)
		if t and t.status == "Completed":
			if K.offene_vorgaenger(liste, m):
				konflikte.append(m["titel"])
				continue
			frappe.db.set_value(DT_MS, m["id"], {"status": "erledigt", "ist_ende": _datum(t.act_end_date) or nowdate(), "ist_start": m["istStart"] or m["sollStart"],
				"nachweis_verzicht": m["nachweisVerzicht"] or "In ERPNext als erledigt gemeldet – Nachweis bitte im Portal ergänzen."})
			uebernommen.append(m["titel"])
	kosten = frappe.db.get_value("Project", proj.name, ["total_costing_amount", "total_purchase_cost"], as_dict=True) or {}
	for kategorie, bez, wert in (("personal", "Eigenleistung (ERPNext-Timesheets)", flt(kosten.get("total_costing_amount"))), ("sonstiges", "Einkauf (ERPNext)", flt(kosten.get("total_purchase_cost")))):
		name = frappe.db.get_value(DT_BUDGET, {"projekt_id": p.name, "ist_quelle": "erpnext", "kategorie": kategorie}, "name")
		if name:
			frappe.db.set_value(DT_BUDGET, name, "ist_eur", wert)
		elif wert:
			frappe.get_doc({"doctype": DT_BUDGET, "projekt_id": p.name, "kategorie": kategorie, "bezeichnung": bez, "plan_eur": 0, "ist_eur": wert, "ist_quelle": "erpnext"}).insert(ignore_permissions=True)
	if n:
		protokoll(n, "erpnext_sync", "entwicklung", p.name, f"ERPNext abgeglichen: {len(uebernommen)} Meilensteine übernommen, {len(konflikte)} Konflikte")
	return {"erpProjekt": proj.name, "uebernommen": uebernommen, "konflikte": konflikte}


# ================================================================ Assistent


@frappe.whitelist(methods=["POST"])
def assistent(flaecheId=None, land=None, typ=None, start=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	lese_noetig(n)
	f = None
	if flaecheId:
		fid = v.kennung(flaecheId)
		if not fid or not frappe.db.exists("Plattform Flaeche", fid):
			nicht_gefunden("Fläche nicht gefunden.")
		f = frappe.get_doc("Plattform Flaeche", fid)
	basis = _vorschlag_aus_flaeche(f) if f else {}
	l = v.auswahl(land, list(LAENDER), basis.get("land") or "DE")
	t = v.auswahl(typ, list(K.ENTWICKLUNG_TYPEN), basis.get("typ") or "freiflaeche")
	s = start if re.match(r"^20\d\d-\d\d-\d\d$", str(start or "")) else nowdate()
	schritte = _vorlage_schritte(l, t)
	plan = K.plan_berechnen([{**x, "id": x["schluessel"], "status": "offen"} for x in schritte], start=s, heute=s)
	je, ende = K.kritischer_pfad(plan, s)
	return {
		"vorschlag": {**basis, "land": l, "typ": t, "start": s, "flaecheId": f.name if f else None, "zielCod": ende[:7]},
		"flaeche": {"id": f.name, "bezeichnung": f.bezeichnung, "ha": flt(f.ha), "agri": bool(cint(f.agri)), "status": f.status, "eigentuemer": name_von(f.nutzer_id), "bereitsVerknuepft": bool(frappe.db.exists(DT_FLAECHE, {"flaeche_id": f.name}))} if f else None,
		"plan": [{"schluessel": m["schluessel"], "titel": m["titel"], "kategorie": m["kategorie"], "dauerMonate": m["dauerMonate"], "sollStart": m["sollStart"], "sollEnde": m["sollEnde"],
			"kritisch": bool((je.get(m["id"]) or {}).get("kritisch")), "phase": m["phase"], "dokumentPflicht": m["dokumentPflicht"], "gutachten": m["gutachten"]} for m in plan],
		"monateBisCod": K.plan_monate(schritte),
	}


# ================================================================ Gutachter-Einladung


def _einladung_suchen(token):
	t = str(token or "")
	if not re.match(r"^[A-Za-z0-9_-]{20,200}$", t):
		return None
	name = frappe.db.get_value(DT_EINLADUNG, {"hash": sha256(t)}, "name")
	return frappe.get_doc(DT_EINLADUNG, name) if name else None


@frappe.whitelist(methods=["POST"])
def gutachter_einladen(projektId=None, email=None, meilensteinIds=None, basisUrl=None, fachgebiete=None, qualifikation=None, buero=None, nachweis=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	p = _projekt(projektId)
	e = v.email(email)
	v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	ids = [x for x in (v.kennung(x) for x in (aus_json(meilensteinIds, []) or [])[:40]) if x and frappe.db.exists(DT_MS, {"name": x, "projekt_id": p.name})]
	v.pflicht(len(ids) > 0, "Bitte mindestens einen Meilenstein für den Auftrag wählen.")
	vorhanden = frappe.db.get_value("Plattform Konto", {"email": e}, "name")
	if vorhanden and frappe.db.exists("Plattform Konto Rolle", {"parent": vorhanden, "rolle": "admin", "parenttype": "Plattform Konto"}):
		konflikt("Backoffice-Konten brauchen keine Gutachter-Einladung.")
	for alt in frappe.get_all(DT_EINLADUNG, filters={"projekt_id": p.name, "email": e, "status": "offen"}, pluck="name"):
		frappe.db.set_value(DT_EINLADUNG, alt, "status", "ersetzt")
	token = secrets.token_urlsafe(32)
	einl = frappe.get_doc({"doctype": DT_EINLADUNG, "projekt_id": p.name, "email": e, "meilenstein_ids": als_json(ids), "hash": sha256(token), "ablauf": add_days(now_datetime(), EINLADUNG_TAGE),
		"profil": als_json(_profil_daten({"fachgebiete": aus_json(fachgebiete, []) or [], "qualifikation": qualifikation, "buero": buero, "nachweis": nachweis})),
		"status": "offen", "eingeladen_von": n.id}).insert(ignore_permissions=True)
	from oekoinvest_app.plattform import mail

	mail.hinweis(e, "", "Einladung als Gutachter/Planer – ÖkoInvest",
		f"{name_von(n.id)} lädt Sie ein, im Portal von ÖkoInvest an {len(ids)} Meilenstein(en) eines Entwicklungsprojekts mitzuarbeiten (Unterlagen hochladen, Rückfragen stellen). "
		f"Der Link ist {EINLADUNG_TAGE} Tage gültig. Ohne Konto registrieren Sie sich mit dieser E-Mail-Adresse.", f"/einladung/gutachter/{token}")
	protokoll(n, "gutachter_einladung", "entwicklung", p.name, f"Gutachter eingeladen: {e} ({len(ids)} Meilensteine)")
	return {"einladung": {"id": einl.name, "projektId": p.name, "email": e, "meilensteinIds": ids, "ablauf": iso(einl.ablauf), "status": "offen"}}


def _maskieren(email):
	lokal, _, domain = str(email).partition("@")
	return f"{lokal[:1]}{'•' * max(2, min(6, len(lokal) - 1))}@{domain}"


@frappe.whitelist(methods=["POST"])
def einladung_info(token=None):
	from oekoinvest_app.plattform.kern import api_pruefen

	api_pruefen()
	e = _einladung_suchen(token)
	if not e or e.status != "offen" or get_datetime(e.ablauf) < now_datetime():
		return {"gueltig": False}
	return {"gueltig": True, "auftraege": len(aus_json(e.meilenstein_ids, []) or []), "eingeladenVon": name_von(e.eingeladen_von), "email": _maskieren(e.email), "ablauf": iso(e.ablauf)}


@frappe.whitelist(methods=["POST"])
def einladung_annehmen(token=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	e = _einladung_suchen(token)
	if not e or e.status != "offen" or get_datetime(e.ablauf) < now_datetime():
		ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.")
	konto = frappe.get_doc("Plattform Konto", n.id)
	if konto.email != e.email:
		verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.")
	rollen = [r.rolle for r in konto.rollen]
	if "admin" in rollen:
		konflikt("Backoffice-Konten brauchen keine Gutachter-Rolle.")
	if "gutachter" not in rollen:
		konto.append("rollen", {"rolle": "gutachter"})
	if not cint(konto.email_bestaetigt):
		konto.email_bestaetigt = 1  # Link per E-Mail erhalten = Adresse nachgewiesen
	konto.save(ignore_permissions=True)
	if e.get("profil"):
		_profil_setzen(n.id, aus_json(e.profil, {}) or {})  # Fachgebiete/Qualifikation aus der Einladung
	ids = aus_json(e.meilenstein_ids, []) or []
	for mid in ids:
		if frappe.db.exists(DT_MS, mid):
			g = aus_json(frappe.db.get_value(DT_MS, mid, "gutachter_ids"), []) or []
			if n.id not in g:
				frappe.db.set_value(DT_MS, mid, "gutachter_ids", als_json([*g, n.id]))
	e.db_set({"status": "angenommen", "angenommen_am": now_datetime(), "angenommen_von": n.id})
	benachrichtigen(e.eingeladen_von, "entwicklung", "Gutachter-Einladung angenommen", f"{name_von(n.id)} arbeitet jetzt an {len(ids)} Meilenstein(en) mit.", f"/portal/admin/entwicklung/{e.projekt_id}", "entwicklung", e.projekt_id, mail=False)
	protokoll(n, "gutachter_einladung", "entwicklung", e.projekt_id, "Gutachter-Einladung angenommen")
	return {"projektId": e.projekt_id, "auftraege": len(ids)}


# ================================================================ Externe Sichten


def _schritt_datum(m, je):
	if m["status"] == "erledigt":
		return m["istEnde"] or m["sollEnde"] or ""
	return (je.get(m["id"]) or {}).get("prognoseEnde") or m["sollEnde"] or ""


def _extern_json(n, p, z, liste):
	heute = nowdate()
	k = kennzahlen(p, liste, heute)
	je = k["_je"]
	basis = {
		"id": p.name, "titel": p.titel, "typLabel": K.ENTWICKLUNG_TYPEN.get(p.typ, p.typ), "land": p.land, "bundesland": p.bundesland, "gemeinde": p.gemeinde or "",
		"phaseLabel": k["phaseLabel"], "fortschritt": k["fortschritt"], "statusLabel": K.ENTWICKLUNG_STATUS.get(p.status, p.status),
		"sichten": [x for x, an in (("eigentuemer", z["eigentuemer"]), ("investor", z["investor"]), ("gutachter", z["gutachter"])) if an],
	}
	if z["eigentuemer"]:
		meine = []
		for f in frappe.get_all(DT_FLAECHE, filters={"projekt_id": p.name, "flaeche_id": ["is", "set"]}, fields=["flaeche_id", "bezeichnung", "ha", "pacht_status"], limit_page_length=0):
			pf = frappe.get_doc("Plattform Flaeche", f.flaeche_id) if frappe.db.exists("Plattform Flaeche", f.flaeche_id) else None
			if pf and (pf.nutzer_id == n.id or darf_team_lesen_objekt(n, pf)):
				meine.append({"bezeichnung": f.bezeichnung, "ha": flt(f.ha), "pachtStatusLabel": K.PACHT_STATUS.get(f.pacht_status, ""), "flaecheId": f.flaeche_id})
		basis["eigentuemer"] = {
			"meineFlaechen": meine,
			# zeitlich sortiert (erledigt nach Ist-Ende, sonst nach Prognose), nur Quartale – keine genauen Termine
			"schritte": [
				{"titel": m["externTitel"], "stand": "erledigt" if m["status"] == "erledigt" else "laeuft" if m["status"] == "in_arbeit" else "geplant", "zeitraum": K.quartal(datum)}
				for datum, m in sorted([(_schritt_datum(m, je), m) for m in liste if m["externTitel"] and m["status"] != "entfaellt"], key=lambda x: x[0])
			],
			"inbetriebnahme": K.quartal(k["prognoseCod"]),
		}
	if z["investor"]:
		fg = z["investor"]
		risiken = []
		if cint(fg.risiken):
			for r in frappe.get_all(DT_RISIKO, filters={"projekt_id": p.name, "extern": 1, "status": ["!=", "geschlossen"]}, fields=["name", "titel", "kategorie", "eintritt", "auswirkung", "massnahme", "status"], limit_page_length=0):
				sc = K.risiko_score(r.eintritt, r.auswirkung)
				risiken.append({"id": r.name, "titel": r.titel, "kategorieLabel": K.RISIKO_KATEGORIEN.get(r.kategorie), "score": sc, "ampel": {"id": K.risiko_ampel(sc), "label": K.risiko_ampel(sc)}, "massnahme": r.massnahme or "", "statusLabel": K.RISIKO_STATUS.get(r.status)})
		doks = []
		if cint(fg.dokumente):
			doks = [{"id": d.name, "name": d.dateiname, "groesse": cint(d.groesse), "am": iso(d.am), "link": f"/api/portal/entwicklung/dokumente/{d.name}"}
				for d in frappe.get_all(DT_DOKUMENT, filters={"projekt_id": p.name, "freigabe_investor": 1}, fields=["name", "dateiname", "groesse", "am"], limit_page_length=0)]
		basis["investor"] = {
			"mwp": flt(p.mwp), "mwh": flt(p.mwh), "flaecheHa": k["flaecheHa"], "flaecheGesichertHa": k["flaecheGesichertHa"], "zielCod": p.ziel_cod or "", "prognoseCod": k["prognoseCod"],
			"vermarktungLabel": K.vermarktung_label(p.vermarktung, p.land),
			"meilensteine": [{"id": m["id"], "titel": m["titel"], "kategorie": m["kategorie"], "kategorieLabel": K.KATEGORIEN.get(m["kategorie"]), "status": m["status"], "statusLabel": K.MEILENSTEIN_STATUS.get(m["status"]),
				"sollStart": m["sollStart"], "sollEnde": m["sollEnde"], "istEnde": m["istEnde"], "verzugTage": K.verzug_tage(m, heute), "kritisch": bool((je.get(m["id"]) or {}).get("kritisch")), "nach": m["nach"],
				"prognoseStart": (je.get(m["id"]) or {}).get("prognoseStart") or m["sollStart"], "prognoseEnde": (je.get(m["id"]) or {}).get("prognoseEnde") or m["sollEnde"]}
				for m in liste if m["status"] != "entfaellt"],
			"risiken": risiken, "dokumente": doks,
		}
	if z["gutachter"]:
		auftraege = []
		for m in z["gutachter"]:
			doks = frappe.get_all(DT_DOKUMENT, filters={"meilenstein_id": m["id"]}, fields=["name", "dateiname", "pflicht", "groesse", "am", "von_id", "fuer_gutachter"], limit_page_length=0)
			fragen = frappe.get_all(DT_RUECKFRAGE, filters={"meilenstein_id": m["id"]}, fields=["name", "text", "am", "backoffice", "von_id", "an_id"], order_by="am asc", limit_page_length=0)
			auftraege.append({
				"id": m["id"], "titel": m["titel"], "kategorieLabel": K.KATEGORIEN.get(m["kategorie"]), "status": m["status"], "statusLabel": K.MEILENSTEIN_STATUS.get(m["status"]),
				"sollStart": m["sollStart"], "sollEnde": m["sollEnde"], "ueberfaellig": K.ist_ueberfaellig(m, heute), "eingereichtAm": m["eingereichtAm"], "dokumentPflicht": m["dokumentPflicht"],
				"dokumente": [{"id": d.name, "name": d.dateiname, "pflicht": d.pflicht or "", "groesse": cint(d.groesse), "am": iso(d.am), "eigenes": d.von_id == n.id, "link": f"/api/portal/entwicklung/dokumente/{d.name}"}
					for d in doks if d.von_id == n.id or cint(d.fuer_gutachter)],
				"rueckfragen": [{"id": r.name, "text": r.text, "am": iso(r.am), "backoffice": bool(cint(r.backoffice)), "von": "ÖkoInvest Projektentwicklung" if cint(r.backoffice) else "Sie"}
					for r in fragen if r.von_id == n.id or (cint(r.backoffice) and r.an_id == n.id)],
			})
		basis["gutachter"] = {"auftraege": auftraege}
	return basis


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	erg = []
	kandidaten = set()
	for fid in frappe.get_all("Plattform Flaeche", filters={"nutzer_id": n.id}, pluck="name", limit_page_length=0):
		kandidaten |= set(frappe.get_all(DT_FLAECHE, filters={"flaeche_id": fid}, pluck="projekt_id", limit_page_length=0))
	from oekoinvest_app.plattform.organisation import organisationen_ids

	orgs = organisationen_ids(n.id)
	if orgs:
		for fid in frappe.get_all("Plattform Flaeche", filters={"organisation_id": ["in", orgs]}, pluck="name", limit_page_length=0):
			kandidaten |= set(frappe.get_all(DT_FLAECHE, filters={"flaeche_id": fid}, pluck="projekt_id", limit_page_length=0))
	if "investor" in (n.get("rollen") or []):
		kandidaten |= set(frappe.get_all(DT_FREIGABE, filters={"nutzer_id": n.id}, pluck="projekt_id", limit_page_length=0))
		if orgs:
			kandidaten |= set(frappe.get_all(DT_FREIGABE, filters={"organisation_id": ["in", orgs]}, pluck="projekt_id", limit_page_length=0))
	if "gutachter" in (n.get("rollen") or []):
		for m in frappe.get_all(DT_MS, filters={"gutachter_ids": ["like", f"%{n.id}%"]}, fields=["projekt_id"], limit_page_length=0):
			kandidaten.add(m.projekt_id)
	for pid in sorted(kandidaten):
		p = frappe.get_doc(DT, pid)
		if p.status == "abgebrochen":
			continue
		liste = _ms_liste(pid)
		z = zugriffe(n, p, liste)
		if z["eigentuemer"] or z["investor"] or z["gutachter"]:
			erg.append(_extern_json(n, p, z, liste))
	return erg


@frappe.whitelist(methods=["POST"])
def extern(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	p = _projekt(id)
	liste = _ms_liste(p.name)
	z = zugriffe(n, p, liste)
	if not (z["eigentuemer"] or z["investor"] or z["gutachter"]) or p.status == "abgebrochen":
		verboten("Dieses Projekt ist für Ihr Konto nicht freigegeben.")
	return _extern_json(n, p, z, liste)


@frappe.whitelist(methods=["POST"])
def zaehler(als_benutzer=None):
	return len(meine(als_benutzer=als_benutzer))


@frappe.whitelist(methods=["POST"])
def meilenstein_melden(projektId=None, meilensteinId=None, aktion=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	p = _projekt(projektId)
	m = next((x for x in _gutachter_ms(n, p.name) if x["id"] == v.kennung(meilensteinId)), None)
	if not m:
		verboten("Dieser Meilenstein ist Ihnen nicht zugewiesen.")
	if m["status"] in K.MEILENSTEIN_FERTIG:
		konflikt("Der Meilenstein ist bereits abgeschlossen.")
	werte = {"status": "in_arbeit", "ist_start": m["istStart"] or nowdate()}
	if aktion == "eingereicht":
		if not frappe.db.exists(DT_DOKUMENT, {"meilenstein_id": m["id"], "von_id": n.id}):
			frappe.throw("Bitte laden Sie zuerst Ihr Gutachten bzw. Ihre Unterlagen hoch.", frappe.ValidationError)
		werte["eingereicht_am"] = now_datetime()
		benachrichtigen(m["verantwortlichId"] or p.projektleiter_id, "entwicklung", f"Gutachten eingereicht: {m['titel']}", f"{name_von(n.id)} hat Unterlagen zur Prüfung eingereicht ({p.titel}).",
			f"/portal/admin/entwicklung/{p.name}?reiter=plan", "entwicklung", p.name)
	elif aktion != "in_arbeit":
		ungueltig("Unbekannte Aktion.")
	frappe.db.set_value(DT_MS, m["id"], werte)
	protokoll(n, "gutachter_meldung", "entwicklung", p.name, f"Gutachter meldet „{'eingereicht' if aktion == 'eingereicht' else 'in Arbeit'}“: {m['titel']}")
	liste = _ms_liste(p.name)
	return {"ok": True, "projekt": _extern_json(n, p, zugriffe(n, p, liste), liste)}


@frappe.whitelist(methods=["POST"])
def rueckfrage(projektId=None, meilensteinId=None, text=None, anId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	t = v.mehrzeilig(text, 3000)
	v.pflicht(len(t) >= 3, "Bitte formulieren Sie Ihre Rückfrage.")
	p = _projekt(projektId)
	mid = v.kennung(meilensteinId)
	if not mid or not frappe.db.exists(DT_MS, {"name": mid, "projekt_id": p.name}):
		nicht_gefunden("Meilenstein nicht gefunden.")
	m = ms_dict(frappe.get_doc(DT_MS, mid))
	bo = bo_schreiben(n)
	if not bo and not ("gutachter" in (n.get("rollen") or []) and n.id in m["gutachterIds"]):
		verboten("Dieser Meilenstein ist Ihnen nicht zugewiesen.")
	an = (v.kennung(anId) or (m["gutachterIds"][0] if m["gutachterIds"] else None)) if bo else None
	if bo and (not an or an not in m["gutachterIds"]):
		ungueltig("Rückfragen gehen an einen zugewiesenen Gutachter.")
	r = frappe.get_doc({"doctype": DT_RUECKFRAGE, "projekt_id": p.name, "meilenstein_id": mid, "von_id": n.id, "an_id": an, "backoffice": 1 if bo else 0, "text": t, "am": now_datetime()}).insert(ignore_permissions=True)
	if bo:
		benachrichtigen(an, "entwicklung", f"Rückfrage: {m['titel']}", "Die Projektentwicklung hat Ihnen eine Rückfrage gestellt.", f"/portal/entwicklung/{p.name}", "entwicklung", p.name)
	else:
		benachrichtigen(m["verantwortlichId"] or p.projektleiter_id, "entwicklung", f"Rückfrage: {m['titel']}", f"{name_von(n.id)}: {t[:160]}", f"/portal/admin/entwicklung/{p.name}?reiter=plan", "entwicklung", p.name)
	protokoll(n, "rueckfrage", "entwicklung", p.name, f"Rückfrage zu „{m['titel']}“")
	return {"ok": True, "rueckfrage": {"id": r.name, "meilensteinId": mid, "text": t, "am": iso(r.am), "backoffice": bool(bo)}}


# ================================================================ Dokumente


def _mime_aus_bytes(b):
	if b[:5] == b"%PDF-":
		return "application/pdf"
	if b[:3] == b"\xff\xd8\xff":
		return "image/jpeg"
	if b[:8] == b"\x89PNG\r\n\x1a\n":
		return "image/png"
	return ""


@frappe.whitelist(methods=["POST"])
def dokument_speichern(projektId=None, meilensteinId=None, pflicht=None, name=None, mime=None, inhalt=None, freigabeInvestor=None, fuerGutachter=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	p = _projekt(projektId)
	mid = v.kennung(meilensteinId)
	m = ms_dict(frappe.get_doc(DT_MS, mid)) if mid and frappe.db.exists(DT_MS, {"name": mid, "projekt_id": p.name}) else None
	if mid and not m:
		nicht_gefunden("Meilenstein nicht gefunden.")
	bo = bo_schreiben(n)
	if not bo and not (m and "gutachter" in (n.get("rollen") or []) and n.id in m["gutachterIds"]):
		verboten("Hochladen dürfen nur die Projektentwicklung und zugewiesene Gutachter.")
	roh = inhalt if isinstance(inhalt, str) else ""
	if not roh or len(roh) > MAX_BASE64:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	try:
		daten = base64.b64decode(roh, validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")
	if mime not in UPLOAD_TYPEN or _mime_aus_bytes(daten) != mime or len(daten) > UPLOAD_MAX_BYTES:
		ungueltig("Erlaubt sind PDF, JPG und PNG bis 10 MB.")
	endung = UPLOAD_TYPEN[mime]
	sauber = re.sub(r'[\\/:*?"<>|]', "_", v.text(name, 160)) or f"dokument.{endung}"
	d = frappe.get_doc({
		"doctype": DT_DOKUMENT, "projekt_id": p.name, "meilenstein_id": m["id"] if m else None, "pflicht": pflicht if m and pflicht in m["dokumentPflicht"] else "",
		"dateiname": sauber, "mime": mime, "groesse": len(daten), "von_id": n.id, "am": now_datetime(),
		"freigabe_investor": 1 if bo and v.wahr(freigabeInvestor) else 0, "fuer_gutachter": 1 if bo and v.wahr(fuerGutachter) else 0,
	}).insert(ignore_permissions=True)
	datei = frappe.get_doc({"doctype": "File", "file_name": f"{d.name}-{secrets.token_hex(8)}.{endung}", "is_private": 1, "content": daten, "attached_to_doctype": DT_DOKUMENT, "attached_to_name": d.name})
	datei.flags.ignore_permissions = True
	datei.insert(ignore_permissions=True)
	d.db_set("datei", datei.file_url)
	protokoll(n, "dokument", "entwicklung", p.name, f"Dokument hochgeladen: {sauber}" + (f" ({m['titel']})" if m else ""))
	return _dokument_json(d)


@frappe.whitelist(methods=["POST"])
def dokument_lesen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_DOKUMENT, k):
		nicht_gefunden("Dokument nicht gefunden.")
	d = frappe.get_doc(DT_DOKUMENT, k)
	ok = bo_lesen(n)
	if not ok and d.meilenstein_id:
		g = aus_json(frappe.db.get_value(DT_MS, d.meilenstein_id, "gutachter_ids"), []) or []
		ok = "gutachter" in (n.get("rollen") or []) and n.id in g and (d.von_id == n.id or cint(d.fuer_gutachter))
	if not ok:
		fg = _freigabe(n, d.projekt_id)
		ok = bool(fg) and cint(fg.dokumente) and cint(d.freigabe_investor)
	if not ok:
		verboten("Kein Zugriff auf dieses Dokument.")
	name = frappe.db.get_value("File", {"file_url": d.datei}, "name") if d.datei else None
	if not name:
		nicht_gefunden("Dokument nicht gefunden.")
	with open(frappe.get_doc("File", name).get_full_path(), "rb") as fh:
		inhalt = fh.read()
	protokoll(n, "dokument_abruf", "entwicklung", d.projekt_id, f"Dokument abgerufen: {d.dateiname}")
	return {"name": d.dateiname, "mime": d.mime, "inhalt": base64.b64encode(inhalt).decode("ascii")}


# ================================================================ Fristen-Erinnerungen (Scheduler täglich)


def _fristen_lauf():
	heute = nowdate()
	vorab = verzug = 0
	for p in frappe.get_all(DT, filters={"status": ["in", list(K.ENTWICKLUNG_OFFEN)]}, fields=["name", "titel", "projektleiter_id"], limit_page_length=0):
		for m in _ms_liste(p.name):
			if m["status"] in K.MEILENSTEIN_FERTIG or not m["sollEnde"]:
				continue
			tage = K.tage_zwischen(heute, m["sollEnde"])
			st = "verzug" if tage < 0 else "vorab" if tage <= 7 else None
			if not st or m["erinnert"].get(st) == m["sollEnde"]:
				continue
			m["erinnert"][st] = m["sollEnde"]
			frappe.db.set_value(DT_MS, m["id"], "erinnert", als_json(m["erinnert"]), update_modified=False)
			for kid in [m["verantwortlichId"] or p.projektleiter_id, *m["gutachterIds"]]:
				if not kid:
					continue
				intern = frappe.db.exists("Plattform Konto Rolle", {"parent": kid, "rolle": "admin", "parenttype": "Plattform Konto"})
				titel = f"Überfällig: {m['titel']}" if st == "verzug" else f"Frist in {tage} Tag{'' if tage == 1 else 'en'}: {m['titel']}"
				benachrichtigen(kid, "entwicklung", titel, f"{p.titel} – Soll-Termin {m['sollEnde']}.",
					f"/portal/admin/entwicklung/{p.name}?reiter=plan" if intern else f"/portal/entwicklung/{p.name}", "entwicklung", p.name)
			if st == "verzug":
				verzug += 1
			else:
				vorab += 1
	return {"vorab": vorab, "verzug": verzug, "geprueftAm": heute}


@frappe.whitelist(methods=["POST"])
def fristen(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	return _fristen_lauf()


def fristen_taeglich():
	"""Scheduler (hooks.py, täglich): Erinnerungen ≤ 7 Tage bzw. überfällig; optional ERPNext-Abgleich aller offenen Projekte."""
	erg = _fristen_lauf()
	if erpnext_aktiv():
		for name in frappe.get_all(DT, filters={"status": ["in", list(K.ENTWICKLUNG_OFFEN)]}, pluck="name", limit_page_length=0):
			try:
				erpnext_sync(frappe.get_doc(DT, name))
			except Exception:
				frappe.log_error(title="ÖkoInvest: ERPNext-Abgleich Projektentwicklung", message=name)
	frappe.db.commit()
	return erg


# ================================================================ Installation & Druck


def vorlagen_sicherstellen():
	"""after_migrate: Standard-Vorlagen je Land × Typ anlegen, falls noch keine vorhanden (Anpassungen im Desk bleiben)."""
	if not frappe.db.table_exists(DT_VORLAGE):
		return
	for land in ("DE", "AT", "CH"):
		for typ in K.ENTWICKLUNG_TYPEN:
			if frappe.db.exists(DT_VORLAGE, {"land": land, "typ": typ}):
				continue
			frappe.get_doc({
				"doctype": DT_VORLAGE, "titel": f"{LAENDER[land]} · {K.ENTWICKLUNG_TYPEN[typ]}", "land": land, "typ": typ, "aktiv": 1,
				"schritte": [{"schluessel": s["schluessel"], "titel": s["titel"], "kategorie": s["kategorie"], "dauer_monate": s["dauerMonate"], "nach": ",".join(s["nach"]),
					"phase": s["phase"] or "", "dokument_pflicht": "\n".join(s["dokumentPflicht"]), "extern_titel": s["externTitel"], "gutachten": 1 if s["gutachten"] else 0} for s in K.vorlage(land, typ)],
			}).insert(ignore_permissions=True)


def oekoinvest_entwicklung(name):
	"""Jinja (Druckformat „Projektsteckbrief“): Kennzahlen, Meilensteine, Risiken, Flächen – nur im Desk (DocPerm Entwicklungsprojekt)."""
	if not frappe.has_permission(DT, "read", name):
		return {}
	p = frappe.get_doc(DT, name)
	liste = _ms_liste(name)
	k = kennzahlen(p, liste)
	je = k["_je"]
	heute = nowdate()
	return frappe._dict({
		"kennzahlen": {x: y for x, y in k.items() if not x.startswith("_")},
		"meilensteine": [frappe._dict({**m, "kritisch": bool((je.get(m["id"]) or {}).get("kritisch")), "ueberfaellig": K.ist_ueberfaellig(m, heute), "verzugTage": K.verzug_tage(m, heute),
			"statusLabel": K.MEILENSTEIN_STATUS.get(m["status"])}) for m in liste if m["status"] != "entfaellt"],
		"risiken": sorted([frappe._dict(r) for r in frappe.get_all(DT_RISIKO, filters={"projekt_id": name, "status": ["!=", "geschlossen"]}, fields=["titel", "score", "massnahme", "kategorie"], limit_page_length=0)], key=lambda r: -cint(r.score)),
		"flaechen": frappe.get_all(DT_FLAECHE, filters={"projekt_id": name}, fields=["bezeichnung", "ha", "pacht_status"], limit_page_length=0),
		"vermarktung": K.vermarktung_label(p.vermarktung, p.land), "typ": K.ENTWICKLUNG_TYPEN.get(p.typ, p.typ), "status": K.ENTWICKLUNG_STATUS.get(p.status, p.status),
		"projektleitung": name_von(p.projektleiter_id), "pacht_labels": K.PACHT_STATUS,
	})
