# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektentwicklung – Steuerung (docs/API.md, Abschnitt 11a) – Referenz: src/lib/plattform/backend/demo/entwicklung-steuerung.js.
# Projektampel über alle Projekte, Pipeline MWp je Phase × Land mit Ziel-Abgleich, Kapazitätsplanung der Projektleitungen,
# projektübergreifendes Risikoregister, Entscheidungsvorlagen für die Geschäftsführung (Zustandsautomat, Vier-Augen-Prinzip,
# Folgeaktionen), Aufgaben aus fälligen Meilensteinen und Optionsfristen (täglich per Scheduler), Grundbuch-Sicherung.
# Reine Regeln: entwicklung_steuerung_kern.py (Spiegel von src/lib/plattform/entwicklung-steuerung.js).
#
# Rechte (jede Methode selbst): Backoffice mit Bereich „entwicklung“ lesen (≥ 1) bzw. schreiben (= 2); Entscheidung über
# Vorlagen und Kapazitäten nur Unterrolle „leitung“; wer eingereicht hat, entscheidet nicht selbst (Vier-Augen-Prinzip).
# Der Geschäftsmodell-Vergleich wird im Next.js-Adapter gerechnet (wie finanzierung.geschaeftsmodell): hier nur Eingaben
# liefern bzw. das Ergebnis beim Einreichen in der Momentaufnahme speichern.

import json

import frappe
from frappe.utils import add_days, cint, flt, getdate, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform import entwicklung_kern as K
from oekoinvest_app.plattform import entwicklung_steuerung_kern as S
from oekoinvest_app.plattform.api import entwicklung as E
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import als_json, aus_json, iso, konflikt, name_von, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import unterrollen

DT_VORLAGE = "Plattform Entwicklung Vorlage"
DT_KAP = "Plattform Entwicklung Kapazitaet"
DT_AUFGABE = "Plattform Aufgabe"


def ist_leitung(n):
	return bool(n) and "admin" in (n.get("rollen") or []) and "leitung" in unterrollen(n)


def _fehler(status, text):
	if status == 403:
		verboten(text)
	if status == 404:
		nicht_gefunden(text)
	if status == 409:
		konflikt(text)
	ungueltig(text)


def _datum(x):
	return str(getdate(x)) if x else ""


def _datum_ok(s):
	s = str(s or "")
	return s if len(s) == 10 and s[:2] == "20" and s[4] == "-" and s[7] == "-" else ""


# ================================================================ Daten je Projekt


def _flaechen(pid):
	return [{"id": f.name, "bezeichnung": f.bezeichnung, "ha": flt(f.ha), "pachtStatus": f.pacht_status, "grundbuch": f.get("grundbuch") or "keine", "grundbuchDatum": _datum(f.get("grundbuch_datum")),
		"optionBis": _datum(f.get("option_bis")), "optionAufgabeId": f.get("option_aufgabe_id") or None}
		for f in frappe.get_all(E.DT_FLAECHE, filters={"projekt_id": pid}, fields=["*"], order_by="creation asc", limit_page_length=0)]


def _meilensteine(pid):
	auf = {m.name: m.aufgabe_id for m in frappe.get_all(E.DT_MS, filters={"projekt_id": pid}, fields=["name", "aufgabe_id"], limit_page_length=0)}
	return [{**m, "aufgabeId": auf.get(m["id"]) or None} for m in E._ms_liste(pid)]


def _dokumente(pid):
	return [{"meilensteinId": d.meilenstein_id, "pflicht": d.pflicht or ""} for d in frappe.get_all(E.DT_DOKUMENT, filters={"projekt_id": pid}, fields=["meilenstein_id", "pflicht"], limit_page_length=0)]


def _risiken(pid):
	return frappe.get_all(E.DT_RISIKO, filters={"projekt_id": pid, "status": ["!=", "geschlossen"]}, fields=["*"], limit_page_length=0)


def _zusatz(pid, heute):
	liste, flaechen, risiken = _meilensteine(pid), _flaechen(pid), _risiken(pid)
	return {
		"liste": liste, "flaechen": flaechen, "risiken": risiken,
		"luecken": S.dokument_luecken(liste, _dokumente(pid), heute), "optionen": S.optionsfristen(flaechen, heute),
		"pruefung": [r for r in risiken if r.get("pruefen_am") and _datum(r.pruefen_am) < heute],
	}


def _ampel(kurz, z):
	return S.projekt_ampel({**kurz, "dokumentLuecken": len(z["luecken"]), "optionsfristen": len(z["optionen"]), "pruefungUeberfaellig": len(z["pruefung"])})


def _kapazitaet(heute):
	kap = {k.konto_id: cint(k.stunden_monat) for k in frappe.get_all(DT_KAP, fields=["konto_id", "stunden_monat"], limit_page_length=0)}
	leiter = []
	for u in E._projektleiter():
		rollen = frappe.db.get_value("Plattform Konto", u["id"], "backoffice_rollen") or ""
		leiter.append({**u, "stundenMonat": kap.get(u["id"]) or None, "projektleitung": "projektleitung" in rollen})
	projekte = [{"id": p.name, "projektleiterId": p.projektleiter_id, "status": p.status} for p in frappe.get_all(E.DT, fields=["name", "projektleiter_id", "status"], limit_page_length=0)]
	offen = {p["id"] for p in projekte if p["status"] in S.OFFEN}
	ms = []
	for m in frappe.get_all(E.DT_MS, filters={"projekt_id": ["in", list(offen) or ["-"]]}, fields=["projekt_id", "status", "soll_start", "soll_ende", "verantwortlich_id", "gutachten"], limit_page_length=0):
		ms.append({"projektId": m.projekt_id, "status": m.status, "sollStart": _datum(m.soll_start), "sollEnde": _datum(m.soll_ende), "verantwortlichId": m.verantwortlich_id or None, "gutachten": bool(cint(m.gutachten))})
	plan = S.kapazitaetsplan(leiter, projekte, ms, heute)
	mit_rolle = {u["id"] for u in leiter if u["projektleitung"]}
	plan["zeilen"] = [z for z in plan["zeilen"] if z["projekte"] or z["offeneMeilensteine"] or z["id"] in mit_rolle]
	v2 = S.projektleiter_vorschlag(plan)
	plan["vorschlag"] = v2["id"] if v2 else None
	return plan


# ================================================================ Übersicht


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	pf = E.portfolio(als_benutzer=als_benutzer)
	heute = nowdate()
	projekte, risiken, luecken, optionen = [], [], [], []
	for kurz in pf["projekte"]:
		z = _zusatz(kurz["id"], heute)
		a = _ampel(kurz, z)
		verwertung = frappe.db.get_value(E.DT, kurz["id"], "verwertung") or None
		projekte.append({**{k: kurz.get(k) for k in ("id", "titel", "typ", "typLabel", "land", "bundesland", "status", "statusLabel", "phase", "phaseLabel", "mwp", "mwh", "projektleiter", "prognoseCod", "zielCod",
			"codVerzugMonate", "budgetPlan", "budgetIst", "risikoMax", "fortschritt", "pipeline", "naechsterMeilenstein")}, "ampel": a, "sicherung": S.sicherungsgrad(z["flaechen"]), "dokumentLuecken": len(z["luecken"]), "verwertung": verwertung})
		if kurz["status"] not in S.OFFEN:
			continue
		for r in z["risiken"]:
			b = S.risiko_bewertung({"eintritt": r.eintritt, "auswirkung": r.auswirkung, "kostenEur": r.get("kosten_eur"), "restEintritt": r.get("rest_eintritt"), "restAuswirkung": r.get("rest_auswirkung")})
			pa = _datum(r.get("pruefen_am"))
			risiken.append({"id": r.name, "projektId": kurz["id"], "projektTitel": kurz["titel"], "titel": r.titel, "kategorie": r.kategorie, "kategorieLabel": K.RISIKO_KATEGORIEN.get(r.kategorie, r.kategorie),
				"status": r.status, "massnahme": r.massnahme or "", **b, "kostenEur": flt(r.get("kosten_eur")), "pruefenAm": pa, "pruefungUeberfaellig": bool(pa and pa < heute), "verantwortlich": E._person(r.verantwortlich_id)})
		doks = _dokumente(kurz["id"])
		for m in z["luecken"]:
			luecken.append({"projektId": kurz["id"], "projektTitel": kurz["titel"], "meilensteinId": m["id"], "titel": m["titel"], "sollEnde": m["sollEnde"],
				"fehlt": [pf2 for pf2 in m["dokumentPflicht"] if not any(d["meilensteinId"] == m["id"] and d["pflicht"] == pf2 for d in doks)]})
		for f in z["optionen"]:
			optionen.append({"projektId": kurz["id"], "projektTitel": kurz["titel"], "flaecheId": f["id"], "bezeichnung": f["bezeichnung"], "optionBis": f["optionBis"], "inTagen": f["inTagen"], "ha": f["ha"]})
	risiken.sort(key=lambda r: (-r["score"], -r["erwartet"]))
	luecken.sort(key=lambda m: m["sollEnde"] or "")
	offen = [p for p in projekte if p["status"] in S.OFFEN]
	vorlagen = [_vorlage_kurz(x) for x in frappe.get_all(DT_VORLAGE, filters={"status": ["in", list(S.VORLAGE_OFFEN)]}, fields=["*"], order_by="modified desc", limit_page_length=0)]
	vorlagen.sort(key=lambda x: 0 if x["status"] == "eingereicht" else 1)
	return {
		"stand": heute, "projekte": projekte, "verteilung": S.ampel_verteilung([p["ampel"] for p in offen]), "matrix": S.pipeline_matrix(projekte),
		"ziel": S.ziel_abgleich(pf["summen"]["jeJahr"], ziel=pf["summen"]["zielMwpJahr"], ab_jahr=int(heute[:4]), jahre=6), "zielMwpJahr": pf["summen"]["zielMwpJahr"],
		"summen": {k: pf["summen"][k] for k in ("anzahl", "mwp", "mwpGewichtet", "wert")}, "kapazitaet": _kapazitaet(heute),
		"risiken": risiken[:50], "risikoSumme": {"anzahl": len(risiken), "hoch": len([r for r in risiken if r["score"] >= 15]), "erwartet": sum(r["erwartet"] for r in risiken), "pruefungUeberfaellig": len([r for r in risiken if r["pruefungUeberfaellig"]])},
		"dokumentLuecken": luecken[:25], "optionsfristen": sorted(optionen, key=lambda o: o["inTagen"]), "vorlagen": vorlagen,
		"aufgabenLaufAm": None, "leitung": ist_leitung(n), "darfBearbeiten": E.bo_schreiben(n),
	}


# ================================================================ Projekt


@frappe.whitelist(methods=["POST"])
def projekt(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	p = E._projekt(projektId)
	kurz = E.projekt_kurz(p)
	heute = nowdate()
	z = _zusatz(p.name, heute)
	fall = frappe.db.get_value("Plattform Finanzierungsfall", {"bezug_art": "entwicklung", "bezug_id": p.name}, ["name", "titel", "status", "eingaben", "geschaeftsmodell_detail"], as_dict=True) if frappe.db.exists("DocType", "Plattform Finanzierungsfall") else None
	ges = frappe.db.get_value("Plattform Projektgesellschaft", {"entwicklungsprojekt": p.name, "status": ["!=", "aufgeloest"]}, ["name", "firma", "status"], as_dict=True) if frappe.db.exists("DocType", "Plattform Projektgesellschaft") else None
	auf_ids = [m["aufgabeId"] for m in z["liste"] if m.get("aufgabeId")]
	# Aufgaben der Steuerung tragen den Projektlink in der Beschreibung (Plattform Aufgabe kennt keinen Bezug „Entwicklung“)
	aufgaben = frappe.get_all(DT_AUFGABE, filters=[["beschreibung", "like", f"%/portal/admin/entwicklung/{p.name}%"]], fields=["name", "titel", "faellig_am", "status", "zustaendig_id"], limit_page_length=0)
	aufgaben += [a for a in frappe.get_all(DT_AUFGABE, filters={"name": ["in", auf_ids or ["-"]]}, fields=["name", "titel", "faellig_am", "status", "zustaendig_id"], limit_page_length=0) if a.name not in {x.name for x in aufgaben}]
	return {
		"projekt": {"id": p.name, "titel": p.titel, "land": p.land, "typ": p.typ, "typLabel": K.ENTWICKLUNG_TYPEN.get(p.typ, p.typ), "status": p.status, "verwertung": p.get("verwertung") or None, "verwertungLabel": (S.VERWERTUNG.get(p.get("verwertung") or "") or {}).get("label", "")},
		"ampel": _ampel(kurz, z),
		"flaechen": [{**f, "pachtStatusLabel": K.PACHT_STATUS.get(f["pachtStatus"], f["pachtStatus"]), "grundbuchLabel": S.GRUNDBUCH_SICHERUNG.get(f["grundbuch"], f["grundbuch"]),
			"optionInTagen": K.tage_zwischen(heute, f["optionBis"]) if f["optionBis"] else None} for f in z["flaechen"]],
		"sicherung": S.sicherungsgrad(z["flaechen"]), "grundbuchHinweis": S.GRUNDBUCH_HINWEIS.get(p.land) or S.GRUNDBUCH_HINWEIS["DE"],
		"dokumentLuecken": [{"id": m["id"], "titel": m["titel"], "sollEnde": m["sollEnde"]} for m in z["luecken"]],
		"vorlagen": [_vorlage_kurz(x) for x in frappe.get_all(DT_VORLAGE, filters={"projekt_id": p.name}, fields=["*"], order_by="creation desc", limit_page_length=0)],
		"geschaeftsmodellEingaben": {"eingaben": (aus_json(fall.eingaben, {}) if fall else None) or {"land": p.land, "typ": p.typ if p.typ in ("agri", "speicher") else "freiflaeche", "mwp": flt(p.mwp) or flt(p.mwh) / 2 or 1},
			"quelle": f"Finanzierungsfall {fall.name}" if fall else "Standardannahmen je Typ und Land (markt.js)", "gewaehlt": (aus_json(fall.geschaeftsmodell_detail, {}) or {}).get("gewaehlt") if fall else None},
		"gesellschaft": {"id": ges.name, "firma": ges.get("firma") or "", "status": ges.status} if ges else None,
		"finanzierungsfall": {"id": fall.name, "titel": fall.titel, "status": fall.status} if fall else None,
		"aufgaben": sorted([{"id": a.name, "titel": a.titel, "faelligAm": _datum(a.faellig_am), "status": a.status, "zustaendig": E._person(a.zustaendig_id)} for a in aufgaben], key=lambda a: a["faelligAm"]),
		"leitung": ist_leitung(n), "darfBearbeiten": E.bo_schreiben(n),
	}


# ================================================================ Kapazität, Flächensicherung


@frappe.whitelist(methods=["POST"])
def kapazitaet_setzen(nutzerId=None, stundenMonat=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	if not ist_leitung(n):
		verboten("Kapazitäten der Projektleitungen legt die Leitung fest.")
	kid = v.kennung(nutzerId)
	if not kid or kid not in {u["id"] for u in E._projektleiter()}:
		nicht_gefunden("Projektleitung nicht gefunden.")
	vorhanden = frappe.db.get_value(DT_KAP, {"konto_id": kid}, "name")
	if stundenMonat in (None, ""):
		if vorhanden:
			frappe.delete_doc(DT_KAP, vorhanden, ignore_permissions=True, force=True)
	else:
		h = v.zahl(stundenMonat, min=S.KAPAZITAET["min"], max=S.KAPAZITAET["max"], stellen=0)
		v.pflicht(h is not None, f"Bitte Stunden je Monat zwischen {S.KAPAZITAET['min']} und {S.KAPAZITAET['max']} angeben.")
		if vorhanden:
			frappe.db.set_value(DT_KAP, vorhanden, "stunden_monat", int(h))
		else:
			frappe.get_doc({"doctype": DT_KAP, "konto_id": kid, "stunden_monat": int(h)}).insert(ignore_permissions=True)
	protokoll(n, "entwicklung_kapazitaet", "entwicklung", kid, f"Kapazität {name_von(kid)}: {stundenMonat or 'Standard'} h/Monat")
	return {"ok": True, "nutzerId": kid, "stundenMonat": int(stundenMonat) if stundenMonat not in (None, "") else None, "kapazitaet": _kapazitaet(nowdate())}


@frappe.whitelist(methods=["POST"])
def sicherung(projektId=None, flaecheId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	p = E._projekt(projektId)
	fid = v.kennung(flaecheId)
	if not fid or not frappe.db.exists(E.DT_FLAECHE, {"name": fid, "projekt_id": p.name}):
		nicht_gefunden("Projektfläche nicht gefunden.")
	d = daten if isinstance(daten, dict) else {}
	f = frappe.get_doc(E.DT_FLAECHE, fid)
	if "grundbuch" in d:
		f.grundbuch = v.auswahl(d.get("grundbuch"), list(S.GRUNDBUCH_SICHERUNG), f.get("grundbuch") or "keine")
	if "grundbuchDatum" in d:
		f.grundbuch_datum = _datum_ok(d.get("grundbuchDatum")) or None
	if "optionBis" in d:
		neu = _datum_ok(d.get("optionBis"))
		if neu and f.pacht_status != "option":
			konflikt("Eine Optionsfrist gibt es nur bei Flächen mit Status „Optionsvertrag“.")
		if neu != _datum(f.get("option_bis")):
			f.option_aufgabe_id = None
		f.option_bis = neu or None
	if f.grundbuch == "eingetragen":
		v.pflicht(bool(f.grundbuch_datum), "Bitte das Eintragungsdatum angeben.")
	if f.grundbuch in ("vorgemerkt", "eingetragen") and f.pacht_status not in ("option", "pachtvertrag"):
		konflikt("Grundbuchliche Sicherung setzt einen Options- oder Pachtvertrag voraus.")
	if f.grundbuch_datum and _datum(f.grundbuch_datum) > nowdate():
		ungueltig("Das Eintragungsdatum liegt in der Zukunft.")
	f.save(ignore_permissions=True)
	protokoll(n, "projektflaeche", "entwicklung", p.name, f"Flächensicherung {f.bezeichnung}: Grundbuch „{S.GRUNDBUCH_SICHERUNG.get(f.grundbuch)}“" + (f", Option bis {_datum(f.option_bis)}" if f.option_bis else ""))
	return {"ok": True, "flaeche": {"id": f.name, "grundbuch": f.grundbuch or "keine", "grundbuchDatum": _datum(f.grundbuch_datum), "optionBis": _datum(f.option_bis)}, "sicherung": S.sicherungsgrad(_flaechen(p.name))}


# ================================================================ Entscheidungsvorlagen


def _vorlage_dict(x):
	return {
		"id": x.name, "projektId": x.projekt_id, "art": x.art, "titel": x.titel, "status": x.status, "budgetEur": flt(x.budget_eur), "empfehlung": x.empfehlung or "",
		"entscheidungBis": _datum(x.entscheidung_bis), "sachverhalt": x.sachverhalt or "", "beschlussvorschlag": x.beschlussvorschlag or "", "alternativen": x.alternativen or "",
		"risikenText": x.risiken_text or "", "eingereichtVon": x.eingereicht_von or None, "erstelltVon": x.erstellt_von or None,
	}


def _vorlage_kurz(x):
	return {
		"id": x.name, "projektId": x.projekt_id, "projektTitel": frappe.db.get_value(E.DT, x.projekt_id, "titel") or "", "art": x.art, "artLabel": S.VORLAGE_ARTEN.get(x.art, {}).get("label", x.art),
		"titel": x.titel, "status": x.status, "statusLabel": S.VORLAGE_STATUS.get(x.status, x.status), "budgetEur": flt(x.budget_eur), "empfehlung": x.empfehlung or "",
		"empfehlungLabel": (S.VERWERTUNG.get(x.empfehlung or "") or {}).get("label", ""), "entscheidungBis": _datum(x.entscheidung_bis), "eingereichtAm": iso(x.eingereicht_am),
		"entschiedenAm": iso(x.entschieden_am), "erstelltAm": iso(x.creation), "geaendertAm": iso(x.modified), "ersteller": E._person(x.erstellt_von), "eingereichtVon": E._person(x.eingereicht_von),
	}


def _vorlage_voll(n, x):
	verlauf = aus_json(x.verlauf, []) or []
	aktionen = [{"id": aid, "label": a["label"], "begruendung": a["begruendung"]} for aid, a in S.VORLAGE_AKTIONEN.items()
		if x.status in a["von"] and ((ist_leitung(n) and x.eingereicht_von != n.id) if a["wer"] == "leitung" else E.bo_schreiben(n))]
	return {
		**_vorlage_kurz(x), "sachverhalt": x.sachverhalt or "", "beschlussvorschlag": x.beschlussvorschlag or "", "alternativen": x.alternativen or "", "risikenText": x.risiken_text or "",
		"snapshot": aus_json(x.snapshot, None), "entscheidung": {"aktion": {"genehmigt": "genehmigen", "abgelehnt": "ablehnen", "zurueckgestellt": "zurueckstellen"}.get(x.status, ""), "am": iso(x.entschieden_am),
			"vonId": x.entschieden_von, "von": name_von(x.entschieden_von), "begruendung": x.entscheidung_begruendung or "", "option": x.gewaehlte_verwertung or None} if x.entschieden_von else None,
		"verlauf": [{**e, "von": name_von(e.get("vonId")) if e.get("vonId") else ""} for e in verlauf], "aktionen": aktionen,
		"bearbeitbar": E.bo_schreiben(n) and x.status in ("entwurf", "zurueckgestellt"), "leitung": ist_leitung(n),
	}


def _vorlage(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_VORLAGE, k):
		nicht_gefunden("Entscheidungsvorlage nicht gefunden.")
	return frappe.get_doc(DT_VORLAGE, k)


def _verlauf(x, n, text):
	liste = aus_json(x.verlauf, []) or []
	liste.append({"am": iso(now_datetime()), "vonId": n.id, "text": v.text(text, 300)})
	x.verlauf = als_json(liste[-200:])


@frappe.whitelist(methods=["POST"])
def vorlage_holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	return _vorlage_voll(n, _vorlage(id))


@frappe.whitelist(methods=["POST"])
def vorlage_speichern(projektId=None, id=None, daten=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	p = E._projekt(projektId)
	d = daten if isinstance(daten, dict) else {}
	if id:
		x = _vorlage(id)
		if x.projekt_id != p.name:
			nicht_gefunden("Entscheidungsvorlage nicht gefunden.")
		if x.status not in ("entwurf", "zurueckgestellt"):
			konflikt("Eingereichte oder entschiedene Vorlagen sind unveränderlich – bitte eine neue Vorlage anlegen.")
	else:
		if p.status not in S.OFFEN:
			konflikt("Für abgeschlossene Projekte können keine Vorlagen mehr angelegt werden.")
		x = frappe.get_doc({"doctype": DT_VORLAGE, "projekt_id": p.name, "art": "gate_entwicklung", "status": "entwurf", "erstellt_von": n.id, "verlauf": als_json([])})
	if "art" in d or not id:
		x.art = v.auswahl(d.get("art"), list(S.VORLAGE_ARTEN), x.art or "gate_entwicklung")
	if "titel" in d or not id:
		x.titel = v.text(d.get("titel"), 160) or f"{S.VORLAGE_ARTEN[x.art]['label']}: {p.titel}"[:160]
	for k, feld in (("sachverhalt", "sachverhalt"), ("beschlussvorschlag", "beschlussvorschlag"), ("alternativen", "alternativen"), ("risikenText", "risiken_text")):
		if k in d:
			x.set(feld, v.mehrzeilig(d.get(k), 4000))
	if "budgetEur" in d:
		x.budget_eur = v.zahl(d.get("budgetEur"), min=0, max=1e8) or 0
	if "empfehlung" in d:
		x.empfehlung = v.auswahl(d.get("empfehlung"), list(S.VERWERTUNG), "")
	if "entscheidungBis" in d:
		x.entscheidung_bis = _datum_ok(d.get("entscheidungBis")) or None
	if not S.VORLAGE_ARTEN[x.art].get("verwertung"):
		x.empfehlung = ""
	if not S.VORLAGE_ARTEN[x.art].get("budget"):
		x.budget_eur = 0
	if x.art == "abbruch" and frappe.db.exists(DT_VORLAGE, {"projekt_id": p.name, "art": "abbruch", "status": "eingereicht", "name": ["!=", x.name or ""]}):
		konflikt("Für dieses Projekt liegt bereits eine Abbruch-Vorlage zur Entscheidung vor.")
	_verlauf(x, n, "Vorlage bearbeitet" if id else "Vorlage angelegt")
	x.flags.plattform_vorlage = True
	x.save(ignore_permissions=True) if id else x.insert(ignore_permissions=True)
	protokoll(n, "entwicklung_vorlage", "entwicklung", p.name, f"Entscheidungsvorlage {'bearbeitet' if id else 'angelegt'}: {x.titel}")
	return _vorlage_voll(n, frappe.get_doc(DT_VORLAGE, x.name))


def _snapshot(n, p, geschaeftsmodell):
	k = E.projekt_json(n, p)
	heute = nowdate()
	z = _zusatz(p.name, heute)
	offen = [r for r in k["risiken"] if r["status"] != "geschlossen"]
	gm = geschaeftsmodell if isinstance(geschaeftsmodell, dict) and isinstance(geschaeftsmodell.get("zeilen"), list) else None
	if gm:  # nur übernehmen, was die Anzeige braucht (vom Adapter gerechnet)
		gm = {"quelle": v.text(gm.get("quelle"), 160), "beste": v.text(gm.get("beste"), 40), "bestLabel": v.text(gm.get("bestLabel"), 160), "empfehlung": v.mehrzeilig(gm.get("empfehlung"), 1000),
			"gewaehlt": v.text(gm.get("gewaehlt"), 40) or None,
			"zeilen": [{"id": v.text(zz.get("id"), 40), "label": v.text(zz.get("label"), 160), "barwert": flt(zz.get("barwert")), "kapitalbindung": flt(zz.get("kapitalbindung")), "irr": zz.get("irr") if isinstance(zz.get("irr"), (int, float)) else None} for zz in gm["zeilen"][:6] if isinstance(zz, dict)]}
	return {
		"am": iso(now_datetime()), "stand": heute,
		"projekt": {"id": k["id"], "titel": k["titel"], "typLabel": k["typLabel"], "land": k["land"], "bundesland": k["bundesland"], "gemeinde": k["gemeinde"], "mwp": k["mwp"], "mwh": k["mwh"], "vermarktungLabel": k["vermarktungLabel"],
			"projektleiter": (k.get("projektleiter") or {}).get("name", ""), "nvp": k.get("nvp") or "", "netzbetreiber": k.get("netzbetreiber") or ""},
		"phase": k["phase"], "phaseLabel": k["phaseLabel"], "fortschritt": k["fortschritt"], "prognoseCod": k["prognoseCod"], "zielCod": k["zielCod"], "codVerzugMonate": k["codVerzugMonate"],
		"pipeline": k["pipeline"], "budgetPlan": k["budgetPlan"], "budgetIst": k["budgetIst"], "flaecheHa": k["flaecheHa"], "flaecheGesichertHa": k["flaecheGesichertHa"], "sicherung": S.sicherungsgrad(z["flaechen"]),
		"ampel": _ampel(k, z),
		"risiken": [{"titel": r["titel"], "kategorieLabel": r["kategorieLabel"], "score": r["score"], "restScore": r.get("restScore"), "erwartet": r.get("erwartet") or 0, "massnahme": r["massnahme"]} for r in offen[:8]],
		"risikokosten": sum(r.get("erwartet") or 0 for r in offen),
		"meilensteine": [{"titel": m["titel"], "sollEnde": m["sollEnde"], "prognoseEnde": m["prognoseEnde"], "kritisch": m["kritisch"], "status": m["statusLabel"]}
			for m in sorted([m for m in k["meilensteine"] if m["status"] not in K.MEILENSTEIN_FERTIG], key=lambda m: m["sollEnde"] or "")[:8]],
		"erledigt": [{"titel": m["titel"], "istEnde": m["istEnde"]} for m in k["meilensteine"] if m["status"] == "erledigt"][-8:],
		"geschaeftsmodell": gm, "codQuartal": K.quartal(k["prognoseCod"]),
	}


def _aufgabe(zustaendig, titel, text, faellig, von_id, pid):
	a = frappe.get_doc({"doctype": DT_AUFGABE, "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(text, 2000), "faellig_am": faellig, "zustaendig_id": zustaendig, "status": "offen",
		"erstellt_von": von_id or zustaendig}).insert(ignore_permissions=True)
	benachrichtigen(zustaendig, "aufgabe", a.titel, f"Fällig am {faellig}.", "/portal/admin/aufgaben", "entwicklung", pid, mail=False)
	return a


@frappe.whitelist(methods=["POST"])
def vorlage_aktion(id=None, aktion=None, begruendung=None, option=None, geschaeftsmodell=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	x = _vorlage(id)
	if isinstance(geschaeftsmodell, str):
		try:
			geschaeftsmodell = json.loads(geschaeftsmodell)
		except ValueError:
			geschaeftsmodell = None
	pr = S.vorlage_uebergang({**_vorlage_dict(x), "status": x.status}, aktion, leitung=ist_leitung(n), schreiben=E.bo_schreiben(n), nutzer_id=n.id, begruendung=begruendung or "", option=option or "")
	if not pr["ok"]:
		_fehler(pr["status"], pr["fehler"])
	p = frappe.get_doc(E.DT, x.projekt_id)
	b = v.mehrzeilig(begruendung, 2000)
	jetzt = now_datetime()
	x.status = pr["nach"]
	_verlauf(x, n, f"{S.VORLAGE_AKTIONEN[aktion]['label']}{': ' + b if b else ''}")
	ersteller = x.eingereicht_von or x.erstellt_von
	if aktion == "einreichen":
		x.snapshot = als_json(_snapshot(n, p, geschaeftsmodell))
		x.eingereicht_am = jetzt
		x.eingereicht_von = n.id
		for u in E._projektleiter():
			if u["id"] != n.id and ist_leitung(frappe._dict(rollen=["admin"], backofficeRollen=frappe.db.get_value("Plattform Konto", u["id"], "backoffice_rollen") or "")):
				benachrichtigen(u["id"], "aufgabe", f"Entscheidungsvorlage: {x.titel}"[:160], f"{S.VORLAGE_ARTEN[x.art]['label']} zu „{p.titel}“ liegt zur Entscheidung vor.", f"/portal/admin/entwicklung/vorlagen/{x.name}", "entwicklung", p.name,
					mail_betreff="Entscheidungsvorlage zur Freigabe – ÖkoInvest", mail_text="Eine Entscheidungsvorlage der Projektentwicklung liegt zur Entscheidung vor. Details und PDF im Portal.")
	if aktion in ("genehmigen", "ablehnen", "zurueckstellen"):
		x.entschieden_am = jetzt
		x.entschieden_von = n.id
		x.entscheidung_begruendung = b
		folgen = S.vorlage_folgen(_vorlage_dict(x), option=option or "") if aktion == "genehmigen" else None
		x.gewaehlte_verwertung = (folgen or {}).get("verwertung") or ""
		if aktion != "zurueckstellen":
			beschluss = (x.beschlussvorschlag or "") + (f"\nVerwertung: {S.VERWERTUNG[folgen['verwertung']]['label']}" if folgen and folgen["verwertung"] else "") + (f"\nBudget: {folgen['budgetEur']:,} €".replace(",", ".") if folgen and folgen["budgetEur"] else "")
			E._entscheidung(p.name, f"{'Genehmigt' if aktion == 'genehmigen' else 'Abgelehnt'}: {S.VORLAGE_ARTEN[x.art]['label']}"[:160], folgen["entscheidungArt"] if folgen else "nogo", beschluss[:3000], n.id, b)
		if folgen:
			if folgen["budgetEur"]:
				frappe.get_doc({"doctype": E.DT_BUDGET, "projekt_id": p.name, "kategorie": "sonstiges", "bezeichnung": f"Budgetfreigabe {x.name}: {S.VORLAGE_ARTEN[x.art]['label']}"[:160], "plan_eur": folgen["budgetEur"], "ist_eur": 0,
					"ist_quelle": "manuell", "notiz": f"Genehmigt am {nowdate()} durch {name_von(n.id)}"}).insert(ignore_permissions=True)
			if folgen["verwertung"]:
				frappe.db.set_value(E.DT, p.name, "verwertung", folgen["verwertung"])
			if folgen["status"] and p.status in S.OFFEN:
				frappe.db.set_value(E.DT, p.name, "status", folgen["status"])
			zust = p.projektleiter_id or ersteller
			for a in folgen["aufgaben"]:
				if zust:
					_aufgabe(zust, f"{a['titel']} ({p.titel})", f"{a.get('text') or ''}\nAus Entscheidungsvorlage {x.name}. Projekt: /portal/admin/entwicklung/{p.name}".strip(), add_days(nowdate(), a["tage"]), n.id, p.name)
		for kid in {k for k in (ersteller, p.projektleiter_id) if k}:
			benachrichtigen(kid, "aufgabe", f"Vorlage {S.VORLAGE_STATUS[x.status].lower()}: {x.titel}"[:160], b or f"Die Geschäftsführung hat über „{x.titel}“ entschieden.", f"/portal/admin/entwicklung/vorlagen/{x.name}", "entwicklung", p.name)
	x.flags.plattform_vorlage = True
	x.save(ignore_permissions=True)
	protokoll(n, f"entwicklung_vorlage_{aktion}", "entwicklung", p.name, f"Entscheidungsvorlage {x.name}: {S.VORLAGE_AKTIONEN[aktion]['label']}")
	return _vorlage_voll(n, frappe.get_doc(DT_VORLAGE, x.name))


# ================================================================ Aufgaben aus Meilensteinen und Optionsfristen


def aufgaben_lauf(n=None, projekt_id=None):
	heute = nowdate()
	erg = {"angelegt": 0, "erledigt": 0, "meilensteine": 0, "optionen": 0}
	filters = {"status": ["in", list(S.OFFEN)]}
	if projekt_id:
		filters["name"] = projekt_id
	for pid in frappe.get_all(E.DT, filters=filters, pluck="name", limit_page_length=0):
		p = frappe.get_doc(E.DT, pid)
		liste = _meilensteine(pid)
		for m in liste:
			if m.get("aufgabeId") and m["status"] in K.MEILENSTEIN_FERTIG and frappe.db.get_value(DT_AUFGABE, m["aufgabeId"], "status") == "offen":
				frappe.db.set_value(DT_AUFGABE, m["aufgabeId"], {"status": "erledigt", "erledigt_am": now_datetime(), "erledigt_von": (n.id if n else None)})
				erg["erledigt"] += 1
		doks = _dokumente(pid)
		for m in S.aufgaben_faellig(liste, heute):
			zust = m.get("verantwortlichId") or p.projektleiter_id
			if not zust or not frappe.db.exists("Plattform Konto", zust):
				continue
			pflicht = [pf for pf in m["dokumentPflicht"] if not any(d["meilensteinId"] == m["id"] and d["pflicht"] == pf for d in doks)]
			text = "\n".join(x for x in [f"Soll-Ende {m['sollEnde']}{' – überfällig' if m['sollEnde'] < heute else ''}.", f"Pflichtdokumente offen: {', '.join(pflicht)}." if pflicht else "Pflichtdokumente vollständig.",
				"Externer Gutachter-/Planerauftrag: Stand beim Auftragnehmer abfragen." if m.get("gutachten") else "", f"Projekt: /portal/admin/entwicklung/{pid}?reiter=plan&ms={m['id']}"] if x)
			a = _aufgabe(zust, f"Meilenstein fällig: {m['titel']} ({p.titel})", text, heute if m["sollEnde"] < heute else m["sollEnde"], n.id if n else None, pid)
			frappe.db.set_value(E.DT_MS, m["id"], "aufgabe_id", a.name, update_modified=False)
			erg["angelegt"] += 1
			erg["meilensteine"] += 1
		for f in S.optionsfristen(_flaechen(pid), heute):
			if f.get("optionAufgabeId") or not p.projektleiter_id:
				continue
			faellig = heute if f["inTagen"] < 14 else add_days(f["optionBis"], -14)
			a = _aufgabe(p.projektleiter_id, f"Optionsfrist {f['bezeichnung']}: Option ausüben oder verlängern ({p.titel})",
				f"Die Option auf „{f['bezeichnung']}“ ({f['ha']} ha) läuft am {f['optionBis']} ab. Ausübung schriftlich erklären bzw. Verlängerung mit dem Eigentümer vereinbaren; Grundbuch-Sicherung prüfen.\nProjekt: /portal/admin/entwicklung/{pid}?reiter=steuerung",
				str(faellig), n.id if n else None, pid)
			frappe.db.set_value(E.DT_FLAECHE, f["id"], "option_aufgabe_id", a.name, update_modified=False)
			erg["angelegt"] += 1
			erg["optionen"] += 1
	if erg["angelegt"] or erg["erledigt"]:
		protokoll(n, "entwicklung_aufgaben", "entwicklung", projekt_id or "alle", f"Aufgaben aus Meilensteinen/Optionsfristen: {erg['angelegt']} angelegt, {erg['erledigt']} erledigt")
	return erg


@frappe.whitelist(methods=["POST"])
def aufgaben_erzeugen(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	pid = None
	if projektId:
		pid = E._projekt(projektId).name
	return {"ok": True, **aufgaben_lauf(n, pid)}


def aufgaben_taeglich():
	"""Scheduler (hooks.py, täglich): Aufgaben aus fälligen Meilensteinen und Optionsfristen, erledigte Meilensteine schließen."""
	try:
		aufgaben_lauf(None)
	except Exception:
		frappe.log_error(title="Entwicklungssteuerung: Aufgabenlauf")
