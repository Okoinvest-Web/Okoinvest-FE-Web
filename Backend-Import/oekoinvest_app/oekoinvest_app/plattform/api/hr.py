# Copyright (c) 2026, ÖkoInvest GmbH
#
# HR & interne Steuerung – docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Referenz: src/lib/plattform/backend/demo/service-hr.js.
#   Team-Übersicht (Konto ↔ Employee, Gebiete aus der Akquise, Auslastung), Abwesenheiten → automatische Vertretung
#   (Aufgaben, Termine, Tickets; Hinweis-Aufgabe für Zuweisungen), Zeiterfassung (Schnittstelle Projektentwicklung/Finanzen),
#   interne Wissensdatenbank, Status der optionalen Integrationen.
#
# Rechte: nur Backoffice. team – lesen ≥ 1 Team/Abwesenheiten/Zeiten aller; schreiben = 2 (Leitung) Mitarbeiterdaten und
# Abwesenheiten/Zeiten anderer; eigene Abwesenheit/Zeiten erfasst jedes Backoffice-Konto. wissen – lesen ≥ 1, schreiben = 2.
# Mit HRMS (hr/hrms.py): Leave Application → Abwesenheit (täglich), Holiday List → Feiertage, Zeiteintrag → Timesheet-Entwurf.

import frappe
from frappe.utils import add_days, cint, flt, getdate, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen as benachrichtigen
from oekoinvest_app.plattform.hr.vertretung import ABWESENHEIT_ARTEN, GRENZEN, TAETIGKEITEN, WISSEN_KATEGORIEN, auslastung, tage_zwischen, vertretung_finden, wissen_treffer, zeiten_summieren
from oekoinvest_app.plattform.kern import admin_noetig, aus_json, als_json, iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe
from oekoinvest_app.plattform.service.integration import status as integrationen_status
from oekoinvest_app.plattform.service.sla import TICKET_OFFEN
from oekoinvest_app.plattform.termine.slots import TERMIN_AKTIV


def _lesen(n, bereich):
	return bool(n) and "admin" in (n.get("rollen") or []) and stufe(n, bereich) >= 1


def _schreiben(n, bereich):
	return bool(n) and "admin" in (n.get("rollen") or []) and stufe(n, bereich) >= 2


def kurz(k):
	return {"id": k, "name": name_von(k), "email": frappe.db.get_value("Plattform Konto", k, "email")} if k else None


def einstellungen():
	e = frappe.get_single("Plattform Service Einstellungen")
	return {"feiertage": aus_json(e.feiertage, []) or []}


# ================================================================ Vertretung (auch für andere Module)


def _abwesenheiten_liste():
	return [{"mitarbeiterId": a.mitarbeiter_id, "von": str(a.von), "bis": str(a.bis), "vertretungId": a.vertretung_id, "status": a.status}
	        for a in frappe.get_all("Plattform Abwesenheit", filters={"status": "genehmigt", "bis": [">=", add_days(nowdate(), -1)]}, fields=["mitarbeiter_id", "von", "bis", "vertretung_id", "status"], limit_page_length=0)]


def _mitarbeiter_map():
	return {m.konto_id: {"vertretungId": m.vertretung_id, "aktiv": bool(cint(m.aktiv))} for m in frappe.get_all("Plattform Mitarbeiter", fields=["konto_id", "vertretung_id", "aktiv"], limit_page_length=0)}


def vertretung_fuer(konto_id, tag=None):
	"""Konto, das konto_id am Tag vertritt (konto_id selbst, wenn anwesend) oder None."""
	r = vertretung_finden(konto_id, str(tag or nowdate()), _abwesenheiten_liste(), _mitarbeiter_map())
	return r["id"] if r else None


def _vertretung_anwenden(n, ab):
	"""Aufgaben (fällig im Zeitraum), Termine (im Zeitraum, ohne Doppelbuchung) und – bei laufender Abwesenheit – offene Tickets
	an die Vertretung. Zuweisungen (Vorgänge/Flächen) bleiben; die Vertretung erhält eine Hinweis-Aufgabe."""
	from oekoinvest_app.plattform.api import termine as tapi

	ergebnis = {"aufgaben": 0, "termine": 0, "tickets": 0, "hinweis": False}
	von, bis = str(ab.von), str(ab.bis)
	for a in frappe.get_all("Plattform Aufgabe", filters={"zustaendig_id": ab.mitarbeiter_id, "status": "offen", "faellig_am": ["between", [von, bis]]}, fields=["name", "titel", "faellig_am"], limit_page_length=0):
		z = vertretung_fuer(ab.mitarbeiter_id, a.faellig_am)
		if z and z != ab.mitarbeiter_id:
			frappe.db.set_value("Plattform Aufgabe", a.name, "zustaendig_id", z)
			ergebnis["aufgaben"] += 1
			benachrichtigen(z, "aufgabe", f"Vertretung: {a.titel}", f"für {name_von(ab.mitarbeiter_id)} (abwesend bis {getdate(bis).strftime('%d.%m.%Y')})", "/portal/admin/aufgaben?ansicht=meine", "aufgabe", a.name)
	for tn in frappe.get_all("Plattform Termin", filters={"mitarbeiter_id": ab.mitarbeiter_id, "status": ["in", TERMIN_AKTIV], "start": ["between", [von, add_days(bis, 1)]]}, pluck="name", limit_page_length=0):
		t = frappe.get_doc("Plattform Termin", tn)
		tag = tapi.lokal_tag_von(t.start)
		if not (von <= tag <= bis):
			continue
		z = vertretung_fuer(ab.mitarbeiter_id, tag)
		if not z or z == ab.mitarbeiter_id:
			continue
		belegt = any(iso(x.start) < iso(t.ende) and iso(t.start) < iso(x.ende) for x in frappe.get_all("Plattform Termin", filters={"mitarbeiter_id": z, "status": ["in", TERMIN_AKTIV], "name": ["!=", t.name]}, fields=["start", "ende"], limit_page_length=0))
		if belegt:
			tapi._verlauf(t, f"Vertretung {name_von(z)} ist zu dieser Zeit belegt – bitte manuell zuweisen", n)
			t.save(ignore_permissions=True)
			continue
		t.vertretung_fuer_id = t.vertretung_fuer_id or ab.mitarbeiter_id
		t.mitarbeiter_id = z
		t.sequenz = cint(t.sequenz) + 1
		tapi._verlauf(t, f"Vertretung wegen Abwesenheit: {name_von(ab.mitarbeiter_id)} → {name_von(z)}", n)
		t.save(ignore_permissions=True)
		tapi.versenden(t, "vertretung")
		ergebnis["termine"] += 1
	heute = nowdate()
	if von <= heute <= bis:
		z = vertretung_fuer(ab.mitarbeiter_id, heute)
		if z and z != ab.mitarbeiter_id:
			for tk in frappe.get_all("Plattform Ticket", filters={"zustaendig_id": ab.mitarbeiter_id, "status": ["in", TICKET_OFFEN]}, pluck="name", limit_page_length=0):
				frappe.db.set_value("Plattform Ticket", tk, "zustaendig_id", z)
				ergebnis["tickets"] += 1
	zuweisungen = sum(frappe.db.count(dt, {"zustaendig_id": ab.mitarbeiter_id, "status": ["not in", ["abgeschlossen", "abgelehnt", "zurueckgezogen", "vertrag"]]}) for dt in ("Plattform Vorgang", "Plattform Flaeche"))
	zv = vertretung_fuer(ab.mitarbeiter_id, von)
	if zuweisungen and zv and zv != ab.mitarbeiter_id:
		titel = f"Vertretung {name_von(ab.mitarbeiter_id)}: {zuweisungen} offene Zuweisungen im Blick behalten"
		beschreibung = f"Abwesenheit {getdate(von).strftime('%d.%m.%Y')}–{getdate(bis).strftime('%d.%m.%Y')}. Neue Nachrichten zu diesen Vorgängen und Flächen bitte vertretungsweise beantworten."
		frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": titel, "beschreibung": beschreibung, "faellig_am": von, "zustaendig_id": zv, "status": "offen", "erstellt_von": n.id if n else None}).insert(ignore_permissions=True)
		ergebnis["hinweis"] = True
	return ergebnis


def abwesenheit_uebernehmen(konto_id, von, bis, art, vertretung_id=None, quelle="plattform", leave_application=None, bemerkung="", n=None):
	m = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": konto_id}, "vertretung_id")
	ab = frappe.get_doc({
		"doctype": "Plattform Abwesenheit", "mitarbeiter_id": konto_id, "von": von, "bis": bis, "art": art, "vertretung_id": vertretung_id or m or None, "status": "genehmigt",
		"quelle": quelle, "leave_application": leave_application, "bemerkung": v.text(bemerkung, 200), "erstellt_von": n.id if n else None,
	}).insert(ignore_permissions=True)
	ergebnis = _vertretung_anwenden(n, ab)
	ab.vertretung_json = als_json(ergebnis)
	ab.save(ignore_permissions=True)
	return ab, ergebnis


# ================================================================ Team


def _zeile(n, konto_id):
	m = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": konto_id}, ["funktion", "employee", "vertretung_id", "kapazitaet_stunden", "aktiv"], as_dict=True) or frappe._dict()
	heute = nowdate()
	in7 = add_days(heute, 7)
	ab = frappe.get_all("Plattform Abwesenheit", filters={"mitarbeiter_id": konto_id, "status": "genehmigt", "bis": [">=", heute]}, fields=["name", "von", "bis", "art", "vertretung_id"], order_by="von asc", limit_page_length=5)
	termine = frappe.get_all("Plattform Termin", filters={"mitarbeiter_id": konto_id, "status": ["in", TERMIN_AKTIV], "start": ["between", [heute, in7]]}, fields=["start", "ende"], limit_page_length=0)
	minuten = sum((t.ende - t.start).total_seconds() / 60 for t in termine)
	aufgaben = frappe.db.count("Plattform Aufgabe", {"zustaendig_id": konto_id, "status": "offen"})
	tickets = frappe.db.count("Plattform Ticket", {"zustaendig_id": konto_id, "status": ["in", TICKET_OFFEN]})
	signaturen = frappe.db.count("Plattform Signaturvorgang", {"ersteller_id": konto_id, "status": "laufend"})
	abw_tage = sum(min(5, tage_zwischen(max(str(a.von), heute), min(str(a.bis), str(in7)))) for a in ab)
	kap = flt(m.kapazitaet_stunden) if m.kapazitaet_stunden is not None else 38.5
	stunden = frappe.db.sql("select coalesce(sum(stunden),0) from `tabPlattform Zeiteintrag` where konto_id=%s and datum like %s", (konto_id, f"{heute[:7]}%"))[0][0]
	rollen = [r for r in str(frappe.db.get_value("Plattform Konto", konto_id, "backoffice_rollen") or "").split(",") if r] or ["leitung"]
	return {
		"id": konto_id, "name": name_von(konto_id), "email": frappe.db.get_value("Plattform Konto", konto_id, "email"), "backofficeRollen": rollen, "funktion": m.funktion or "", "employeeId": m.employee or "",
		"vertretung": kurz(m.vertretung_id), "kapazitaetStunden": kap, "aktiv": m.aktiv is None or bool(cint(m.aktiv)),
		"gebiete": [{"id": g.name, "name": g.bezeichnung} for g in frappe.get_all("Plattform Gebiet", filters={"mitarbeiter_id": konto_id, "aktiv": 1}, fields=["name", "bezeichnung"])],
		"abwesendHeute": any(str(a.von) <= heute <= str(a.bis) for a in ab),
		"abwesenheiten": [{"id": a.name, "von": str(a.von), "bis": str(a.bis), "art": a.art, "artLabel": ABWESENHEIT_ARTEN.get(a.art, a.art), "vertretung": kurz(a.vertretung_id)} for a in ab],
		"last": {"termine": len(termine), "terminMinuten": minuten, "aufgabenOffen": aufgaben, "ticketsOffen": tickets, "signaturenOffen": signaturen},
		"auslastung": auslastung(kap, minuten, aufgaben, tickets, signaturen, abw_tage), "stundenMonat": round(flt(stunden), 2), "ich": konto_id == n.id,
	}


@frappe.whitelist(methods=["POST"])
def team(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	konten = aktive_admins() if _lesen(n, "team") else [n.id]
	from oekoinvest_app.plattform.service.integration import aktiv

	return {
		"mitarbeiter": sorted([_zeile(n, k) for k in konten], key=lambda x: x["name"]), "darfBearbeiten": _schreiben(n, "team"),
		"integration": {"hrms": aktiv("hrms"), "hinweis": "Mit HRMS: Employee, Leave Application, Holiday List und Timesheet (docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“)." if aktiv("hrms") else "Ohne HRMS: Mitarbeiter, Abwesenheiten und Zeiten werden in der Plattform geführt."},
	}


@frappe.whitelist(methods=["POST"])
def mitarbeiter_speichern(kontoId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if not _schreiben(n, "team"):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Team & HR“ kein Schreiben.")
	kid = v.kennung(kontoId)
	v.pflicht(kid and kid in aktive_admins(), "Nur Backoffice-Konten sind Mitarbeiter.")
	d = aus_json(daten, {}) or {}
	name = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": kid}, "name")
	m = frappe.get_doc("Plattform Mitarbeiter", name) if name else frappe.new_doc("Plattform Mitarbeiter")
	m.konto_id = kid
	if d.get("funktion") is not None:
		m.funktion = v.text(d.get("funktion"), 80)
	if d.get("employeeId") is not None:
		e = v.text(d.get("employeeId"), 40)
		v.pflicht(not e or all(c.isalnum() or c in "._/-" for c in e), "Die Employee-ID (HRMS) enthält ungültige Zeichen.")
		m.employee = e
	if d.get("kapazitaetStunden") is not None:
		m.kapazitaet_stunden = v.zahl(d.get("kapazitaetStunden"), min=0, max=60) or 38.5
	if d.get("aktiv") is not None:
		m.aktiv = 1 if d.get("aktiv") else 0
	if d.get("vertretungId") is not None:
		z = v.kennung(d.get("vertretungId"))
		if d.get("vertretungId"):
			v.pflicht(z and z in aktive_admins() and z != kid, "Vertretung muss ein anderes, aktives Backoffice-Konto sein.")
		m.vertretung_id = z or None
	m.save(ignore_permissions=True) if name else m.insert(ignore_permissions=True)
	protokoll(n, "team", "nutzer", kid, f"Mitarbeiterdaten von {name_von(kid)} gespeichert")
	return _zeile(n, kid)


# ================================================================ Abwesenheiten


@frappe.whitelist(methods=["POST"])
def abwesenheiten(von=None, bis=None, kontoId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	admin_noetig(n)
	filters = {}
	if not _lesen(n, "team"):
		filters["mitarbeiter_id"] = n.id
	elif kontoId:
		filters["mitarbeiter_id"] = kontoId
	if von:
		filters["bis"] = [">=", von]
	if bis:
		filters["von"] = ["<=", bis]
	return [
		{"id": a.name, "mitarbeiterId": a.mitarbeiter_id, "von": str(a.von), "bis": str(a.bis), "art": a.art, "artLabel": ABWESENHEIT_ARTEN.get(a.art, a.art), "status": a.status, "quelle": a.quelle,
		 "mitarbeiter": kurz(a.mitarbeiter_id), "vertretung": kurz(a.vertretung_id), "vertretungId": a.vertretung_id, "bemerkung": a.bemerkung or ""}
		for a in frappe.get_all("Plattform Abwesenheit", filters=filters, fields=["*"], order_by="von asc", limit_page_length=500)
	]


@frappe.whitelist(methods=["POST"])
def abwesenheit_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	d = aus_json(daten, {}) or {}
	von, bis = str(d.get("von") or ""), str(d.get("bis") or d.get("von") or "")
	try:
		v.pflicht(getdate(von) <= getdate(bis), "Bitte geben Sie einen gültigen Zeitraum an (von ≤ bis).")
	except Exception:
		ungueltig("Bitte geben Sie einen gültigen Zeitraum an (von ≤ bis).")
	v.pflicht(tage_zwischen(von, bis) <= GRENZEN["abwesenheit_tage_max"], f"Höchstens {GRENZEN['abwesenheit_tage_max']} Tage je Eintrag.")
	kid = v.kennung(d.get("mitarbeiterId")) or n.id
	if kid != n.id and not _schreiben(n, "team"):
		verboten("Abwesenheiten anderer erfasst nur die Leitung.")
	v.pflicht(kid in aktive_admins(), "Nur für Backoffice-Konten.")
	if frappe.db.exists("Plattform Abwesenheit", {"mitarbeiter_id": kid, "status": "genehmigt", "von": ["<=", bis], "bis": [">=", von]}):
		konflikt("Für diesen Zeitraum ist bereits eine Abwesenheit eingetragen.")
	vz = v.kennung(d.get("vertretungId")) if d.get("vertretungId") else None
	if vz:
		v.pflicht(vz in aktive_admins() and vz != kid, "Vertretung muss ein anderes, aktives Backoffice-Konto sein.")
	art = v.auswahl(d.get("art"), list(ABWESENHEIT_ARTEN), "urlaub")
	ab, ergebnis = abwesenheit_uebernehmen(kid, von, bis, art, vz, "plattform", None, d.get("bemerkung"), n)
	protokoll(n, "team", "nutzer", kid, f"Abwesenheit {von}–{bis} ({ABWESENHEIT_ARTEN[art]}) – Vertretung: {ergebnis['aufgaben']} Aufgaben, {ergebnis['termine']} Termine, {ergebnis['tickets']} Tickets")
	return {"abwesenheit": {"id": ab.name, "mitarbeiterId": kid, "von": von, "bis": bis, "art": art, "artLabel": ABWESENHEIT_ARTEN[art], "mitarbeiter": kurz(kid), "vertretung": kurz(ab.vertretung_id)}, "vertretung": ergebnis}


@frappe.whitelist(methods=["POST"])
def abwesenheit_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	admin_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Abwesenheit", k):
		nicht_gefunden("Abwesenheit nicht gefunden.")
	a = frappe.get_doc("Plattform Abwesenheit", k)
	if a.mitarbeiter_id != n.id and not _schreiben(n, "team"):
		verboten("Abwesenheiten anderer ändert nur die Leitung.")
	if a.quelle == "hrms":
		konflikt("Diese Abwesenheit stammt aus HRMS und wird dort gepflegt.")
	frappe.delete_doc("Plattform Abwesenheit", k, ignore_permissions=True)
	protokoll(n, "team", "nutzer", a.mitarbeiter_id, f"Abwesenheit {a.von}–{a.bis} gelöscht (Vertretungen bleiben bestehen)")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def vertretung(kontoId=None, tag=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	admin_noetig(n)
	t = str(tag or nowdate())
	r = vertretung_finden(v.kennung(kontoId), t, _abwesenheiten_liste(), _mitarbeiter_map())
	return {**r, "konto": kurz(r["id"]), "tag": t} if r else {"id": None, "kette": [], "grund": "niemand verfügbar", "tag": t}


# ================================================================ Zeiterfassung


def _zeit_json(z):
	titel = frappe.db.get_value("Plattform Projekt", z.projekt_id, "titel") if z.projekt_id else None
	return {"id": z.name, "kontoId": z.konto_id, "name": name_von(z.konto_id), "datum": str(z.datum), "stunden": flt(z.stunden), "projektId": z.projekt_id or None, "erpProjekt": z.erp_projekt or None,
	        "projektTitel": titel or z.erp_projekt or z.projekt_id or "", "taetigkeit": z.taetigkeit, "taetigkeitLabel": TAETIGKEITEN.get(z.taetigkeit, z.taetigkeit), "text": z.text or "", "timesheet": z.timesheet or None, "erstelltAm": iso(z.creation)}


@frappe.whitelist(methods=["POST"])
def zeiten(kontoId=None, monat=None, projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	admin_noetig(n)
	m = monat if v.monat(monat) and len(str(monat)) == 7 else nowdate()[:7]
	filters = {"datum": ["like", f"{m}%"]}
	if not _lesen(n, "team"):
		filters["konto_id"] = n.id
	elif kontoId:
		filters["konto_id"] = kontoId
	liste = [z for z in frappe.get_all("Plattform Zeiteintrag", filters=filters, fields=["*"], order_by="datum desc", limit_page_length=2000) if not projektId or projektId in (z.projekt_id, z.erp_projekt)]
	eintraege = [_zeit_json(z) for z in liste]
	return {"monat": m, "eintraege": eintraege, "summe": round(sum(e["stunden"] for e in eintraege), 2), "jeProjekt": zeiten_summieren(eintraege)}


@frappe.whitelist(methods=["POST"])
def zeit_erfassen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	d = aus_json(daten, {}) or {}
	datum = str(d.get("datum") or nowdate())
	try:
		v.pflicht(getdate(datum) <= getdate(add_days(nowdate(), 1)), "Bitte geben Sie ein gültiges Datum an (nicht in der Zukunft).")
	except Exception:
		ungueltig("Bitte geben Sie ein gültiges Datum an.")
	stunden = round((v.zahl(d.get("stunden"), min=0.25, max=GRENZEN["stunden_tag_max"]) or 0) * 4) / 4
	v.pflicht(stunden >= 0.25, "Bitte geben Sie die Stunden an (0,25–12).")
	taetigkeit = v.auswahl(d.get("taetigkeit"), list(TAETIGKEITEN), "")
	v.pflicht(taetigkeit, "Bitte wählen Sie eine Tätigkeit.")
	kid = v.kennung(d.get("kontoId")) or n.id
	if kid != n.id and not _schreiben(n, "team"):
		verboten("Zeiten anderer erfasst nur die Leitung.")
	pid = v.kennung(d.get("projektId"))
	erp = v.text(d.get("erpProjekt"), 60)
	v.pflicht(pid or erp, "Bitte wählen Sie ein Projekt.")
	if pid:
		v.pflicht(frappe.db.exists("Plattform Projekt", pid) or frappe.db.exists("Plattform Entwicklungsprojekt", pid), "Projekt nicht gefunden.")
	summe = flt(frappe.db.sql("select coalesce(sum(stunden),0) from `tabPlattform Zeiteintrag` where konto_id=%s and datum=%s", (kid, datum))[0][0])
	if summe + stunden > GRENZEN["stunden_tag_max"]:
		konflikt(f"Für diesen Tag sind bereits {summe:g} Stunden erfasst (höchstens {GRENZEN['stunden_tag_max']}).")
	z = frappe.get_doc({"doctype": "Plattform Zeiteintrag", "konto_id": kid, "datum": datum, "stunden": stunden, "projekt_id": pid or None, "erp_projekt": erp or None, "taetigkeit": taetigkeit, "text": v.text(d.get("text"), 200)}).insert(ignore_permissions=True)
	from oekoinvest_app.plattform.hr.hrms import timesheet_anlegen

	ts = timesheet_anlegen(z)
	if ts:
		frappe.db.set_value("Plattform Zeiteintrag", z.name, "timesheet", ts, update_modified=False)
		z.timesheet = ts
	return _zeit_json(z)


@frappe.whitelist(methods=["POST"])
def zeit_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	admin_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Zeiteintrag", k):
		nicht_gefunden("Eintrag nicht gefunden.")
	z = frappe.get_doc("Plattform Zeiteintrag", k)
	if z.konto_id != n.id and not _schreiben(n, "team"):
		verboten("Nur eigene Einträge.")
	if z.timesheet:
		konflikt("Der Eintrag ist bereits in ein Timesheet übernommen und wird dort korrigiert.")
	frappe.delete_doc("Plattform Zeiteintrag", k, ignore_permissions=True)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def zeiten_auswertung(projektId=None, von=None, bis=None, als_benutzer=None):  # noqa: N803
	"""Schnittstelle für Projektentwicklung/Finanzen: Stunden je Projekt und Tätigkeit (Bereich team, entwicklung oder finanzen lesen)."""
	n = nutzer(als_benutzer)
	admin_noetig(n)
	if not any(_lesen(n, b) for b in ("team", "entwicklung", "finanzen")):
		verboten("Keine Berechtigung für Zeitauswertungen.")
	filters = {}
	if von and bis:
		filters["datum"] = ["between", [von, bis]]
	elif von:
		filters["datum"] = [">=", von]
	elif bis:
		filters["datum"] = ["<=", bis]
	liste = [_zeit_json(z) for z in frappe.get_all("Plattform Zeiteintrag", filters=filters, fields=["*"], limit_page_length=0) if not projektId or projektId in (z.projekt_id, z.erp_projekt)]
	return {"projekte": zeiten_summieren(liste), "summe": round(sum(e["stunden"] for e in liste), 2), "eintraege": len(liste)}


# ================================================================ Wissensdatenbank (nur intern)


def _wissen_json(a, detail=False, punkte=None):
	inhalt = a.inhalt or ""
	out = {"id": a.name, "titel": a.titel, "kategorie": a.kategorie, "kategorieLabel": WISSEN_KATEGORIEN.get(a.kategorie, a.kategorie), "tags": aus_json(a.tags, []) or [], "autor": name_von(a.autor_id),
	       "geaendertAm": iso(a.modified), "version": cint(a.version) or 1, "auszug": " ".join("".join(c for c in inhalt if c not in "#*_>`-").split())[:180], "punkte": punkte}
	if detail:
		out.update({"inhalt": inhalt, "versionen": [{"version": x.get("version"), "am": x.get("am"), "autor": name_von(x.get("autorId"))} for x in (aus_json(a.versionen_json, []) or [])]})
	return out


def _wissen_lesen_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _lesen(n, "wissen"):
		verboten("Die Wissensdatenbank ist nur intern verfügbar.")


@frappe.whitelist(methods=["POST"])
def wissen(q=None, kategorie=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_wissen_lesen_noetig(n)
	filters = {"kategorie": kategorie} if kategorie in WISSEN_KATEGORIEN else {}
	treffer = []
	for a in frappe.get_all("Plattform Wissensartikel", filters=filters, fields=["*"], order_by="modified desc", limit_page_length=1000):
		p = wissen_treffer({"titel": a.titel, "inhalt": a.inhalt, "tags": aus_json(a.tags, [])}, q)
		if p:
			treffer.append((p, a))
	treffer.sort(key=lambda x: -x[0])
	return [_wissen_json(a, punkte=p) for p, a in treffer]


@frappe.whitelist(methods=["POST"])
def wissen_artikel(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_wissen_lesen_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Wissensartikel", k):
		nicht_gefunden("Artikel nicht gefunden.")
	return _wissen_json(frappe.get_doc("Plattform Wissensartikel", k), detail=True)


@frappe.whitelist(methods=["POST"])
def wissen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _schreiben(n, "wissen"):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Wissensdatenbank“ kein Schreiben." if n and "admin" in (n.get("rollen") or []) else "Nur für das Backoffice.")
	d = aus_json(daten, {}) or {}
	titel = v.text(d.get("titel"), 160)
	v.pflicht(len(titel) >= 4, "Bitte geben Sie einen Titel an (mind. 4 Zeichen).")
	inhalt = v.mehrzeilig(d.get("inhalt"), GRENZEN["wissen_inhalt"])
	v.pflicht(len(inhalt) >= 20, "Der Artikel ist zu kurz (mind. 20 Zeichen).")
	kategorie = v.auswahl(d.get("kategorie"), list(WISSEN_KATEGORIEN), "prozesse")
	tags = v.text_liste(d.get("tags"), maximal=10, laenge=30)
	if d.get("id"):
		k = v.kennung(d.get("id"))
		if not k or not frappe.db.exists("Plattform Wissensartikel", k):
			nicht_gefunden("Artikel nicht gefunden.")
		a = frappe.get_doc("Plattform Wissensartikel", k)
		versionen = [{"version": cint(a.version) or 1, "am": iso(a.modified), "autorId": a.autor_id, "titel": a.titel, "inhalt": a.inhalt}] + (aus_json(a.versionen_json, []) or [])
		a.update({"titel": titel, "inhalt": inhalt, "kategorie": kategorie, "tags": als_json(tags), "autor_id": n.id, "version": (cint(a.version) or 1) + 1, "versionen_json": als_json(versionen[:10])})
		a.save(ignore_permissions=True)
	else:
		a = frappe.get_doc({"doctype": "Plattform Wissensartikel", "titel": titel, "inhalt": inhalt, "kategorie": kategorie, "tags": als_json(tags), "autor_id": n.id, "version": 1, "versionen_json": "[]"}).insert(ignore_permissions=True)
	protokoll(n, "wissen", "wissen", a.name, f"Wissensartikel „{titel}“ gespeichert (Version {a.version})")
	return _wissen_json(a, detail=True)


@frappe.whitelist(methods=["POST"])
def wissen_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not _schreiben(n, "wissen"):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Wissensdatenbank“ kein Schreiben.")
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Wissensartikel", k):
		nicht_gefunden("Artikel nicht gefunden.")
	titel = frappe.db.get_value("Plattform Wissensartikel", k, "titel")
	frappe.delete_doc("Plattform Wissensartikel", k, ignore_permissions=True)
	protokoll(n, "wissen", "wissen", k, f"Wissensartikel „{titel}“ gelöscht")
	return {"ok": True}


# ================================================================ Integrationen & Scheduler


@frappe.whitelist(methods=["POST"])
def integrationen(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	return integrationen_status()


def hrms_abgleich():
	"""Täglich (hooks.py): Leave Applications → Abwesenheiten mit Vertretung."""
	from oekoinvest_app.plattform.hr.hrms import abwesenheiten_abgleichen

	abwesenheiten_abgleichen()
	frappe.db.commit()

