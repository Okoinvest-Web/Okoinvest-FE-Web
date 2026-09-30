# Copyright (c) 2026, ÖkoInvest GmbH
#
# Service & Support (Tickets mit SLA) – docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Referenz: src/lib/plattform/backend/demo/service-tickets.js.
# Eigene, schlanke Ticket-Logik („Plattform Ticket“); optional Spiegelung nach Frappe Helpdesk (service/helpdesk.py).
#
# Rechte:
#   Kunde      – eigene Tickets bzw. Tickets der Organisation (Teamrolle lesen/schreiben); eröffnen, antworten, Anhänge,
#                schließen. Nie interne Notizen, keine SLA-Interna.
#   Backoffice – Bereich „support“: lesen ≥ 1 alle; schreiben = 2 antworten, interne Notizen, Status, Priorität, Zuweisung,
#                Ticket aus Anlagen-Störung (leitung, betrieb).

import base64
import binascii
import secrets

import frappe
from frappe.utils import cint, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt, jetzt_iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe
from oekoinvest_app.plattform.service import helpdesk
from oekoinvest_app.plattform.service.sla import PRIORITAET_AUS_SCHWERE, TICKET_KATEGORIEN, TICKET_OFFEN, TICKET_PRIORITAETEN, TICKET_STATUS, sla_fristen, sla_stand
from oekoinvest_app.plattform.service.zeit import system_aus_iso

DT = "Plattform Ticket"
BEREICH = "support"
MIME = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}


def ist_admin(n):
	return bool(n) and "admin" in (n.get("rollen") or [])


def bo_lesen(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 1


def bo_schreiben(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 2


def zugriff(n, t):
	from oekoinvest_app.plattform.organisation import darf_team_schreiben, team_rolle

	if not n:
		return None
	if bo_lesen(n):
		return "backoffice"
	if t.konto_id == n.id:
		return "kunde"
	r = team_rolle(n.id, t.organisation_id) if t.organisation_id else None
	if r:
		return "team-schreiben" if darf_team_schreiben(r) else "team-lesen"
	return None


def laden(n, kennung):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Ticket nicht gefunden.")
	t = frappe.get_doc(DT, k)
	if not zugriff(n, t):
		verboten("Dieses Ticket gehört nicht zu Ihrem Konto.")
	neu = helpdesk.status_abgleichen(t)  # Status aus Frappe Helpdesk übernehmen (falls gespiegelt)
	if neu:
		t.status = neu
		if neu == "geloest" and not t.geloest_am:
			t.geloest_am = jetzt()
		_verlauf(t, f"Status aus Helpdesk: {TICKET_STATUS[neu][0]}", None)
		t.save(ignore_permissions=True)
	return t


def _verlauf(t, text, n):
	liste = aus_json(t.verlauf_json, []) or []
	liste.append({"am": jetzt_iso(), "text": v.text(text, 300), "vonId": n.id if n else None})
	t.verlauf_json = als_json(liste[-200:])


def _sla_dict(t):
	return {"prioritaet": t.prioritaet, "status": t.status, "slaReaktionBis": iso(t.sla_reaktion_bis), "slaLoesungBis": iso(t.sla_loesung_bis), "ersteReaktionAm": iso(t.erste_reaktion_am), "geloestAm": iso(t.geloest_am)}


def ausgabe(n, t, detail=False):
	zg = zugriff(n, t)
	bo = zg == "backoffice"
	sla = sla_stand(_sla_dict(t))
	nachrichten = aus_json(t.nachrichten_json, []) or []
	anlage = frappe.db.get_value("Plattform Anlage", t.anlage_id, ["name", "titel"], as_dict=True) if t.anlage_id else None
	kurz = lambda k: {"id": k, "name": name_von(k), "email": frappe.db.get_value("Plattform Konto", k, "email")} if k else None  # noqa: E731
	out = {
		"id": t.name, "betreff": t.betreff, "kategorie": t.kategorie, "kategorieLabel": TICKET_KATEGORIEN.get(t.kategorie, t.kategorie),
		"prioritaet": t.prioritaet, "prioritaetLabel": TICKET_PRIORITAETEN.get(t.prioritaet, (t.prioritaet,))[0],
		"status": t.status, "statusLabel": TICKET_STATUS.get(t.status, (t.status,))[0], "offen": t.status in TICKET_OFFEN,
		"anlage": {"id": anlage.name, "name": anlage.titel} if anlage else None, "stoerungId": t.stoerung_id or None,
		"kunde": kurz(t.konto_id) if bo else None,
		"zustaendig": (kurz(t.zustaendig_id) if bo else {"name": name_von(t.zustaendig_id)}) if t.zustaendig_id else None,
		"sla": sla if bo else {"ampel": "ok" if sla["ampel"] in ("verletzt", "warn") else sla["ampel"], "reaktionBis": iso(t.sla_reaktion_bis), "geantwortet": bool(t.erste_reaktion_am)},
		"antworten": sum(1 for m in nachrichten if bo or not m.get("intern")),
		"ungelesen": (not cint(t.gelesen_backoffice)) if bo else (not cint(t.gelesen_kunde)),
		"erstelltAm": iso(t.creation), "geaendertAm": iso(t.modified), "helpdesk": (t.helpdesk or None) if bo else None,
		"meinZugriff": zg, "darfAntworten": bo_schreiben(n) if bo else zg in ("kunde", "team-schreiben"), "darfBearbeiten": bo_schreiben(n),
	}
	if not detail:
		return out
	out.update({
		"nachrichten": [
			{"id": m.get("id"), "am": m.get("am"), "text": m.get("text"), "intern": bool(m.get("intern")), "backoffice": bool(m.get("backoffice")), "ich": m.get("vonId") == n.id,
			 "vonName": f"{(name_von(m.get('vonId')) or 'ÖkoInvest').split(' ')[0]} (ÖkoInvest Service)" if m.get("backoffice") and not bo else (name_von(m.get("vonId")) or "System")}
			for m in nachrichten if bo or not m.get("intern")
		],
		"anhaenge": [{"id": a.get("id"), "name": a.get("name"), "mime": a.get("mime"), "groesse": a.get("groesse"), "am": a.get("am"), "vonName": name_von(a.get("vonId"))} for a in (aus_json(t.anhaenge_json, []) or [])],
		"verlauf": (aus_json(t.verlauf_json, []) or []) if bo else None,
	})
	return out


def _zustaendig_waehlen():
	"""Support-Schreibende; Abwesende über die Vertretung; sonst die mit den wenigsten offenen Tickets."""
	from oekoinvest_app.plattform.api.hr import vertretung_fuer
	from oekoinvest_app.plattform.kern import konto_json

	kandidaten = []
	for k in aktive_admins():
		n = frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k)))
		if bo_schreiben(n):
			kandidaten.append(k)
	if not kandidaten:
		return None
	kandidaten.sort(key=lambda k: frappe.db.count(DT, {"zustaendig_id": k, "status": ["in", TICKET_OFFEN]}))
	for k in kandidaten:
		z = vertretung_fuer(k)
		if z:
			return z
	return kandidaten[0]


def ticket_erzeugen(n, betreff, kategorie, prioritaet, text, konto_id, organisation_id=None, anlage_id=None, stoerung_id=None, herkunft="portal"):
	erstellt = jetzt_iso()
	reaktion_bis, loesung_bis = sla_fristen(prioritaet, erstellt)
	nachrichten = [{"id": f"TN-{secrets.token_hex(4).upper()}", "am": erstellt, "vonId": n.id if n else None, "backoffice": herkunft == "stoerung", "intern": False, "text": text}] if text else []
	t = frappe.get_doc({
		"doctype": DT, "betreff": betreff, "kategorie": kategorie, "prioritaet": prioritaet, "status": "neu", "konto_id": konto_id, "organisation_id": organisation_id, "anlage_id": anlage_id,
		"stoerung_id": stoerung_id, "herkunft": herkunft, "zustaendig_id": _zustaendig_waehlen(), "sla_reaktion_bis": system_aus_iso(reaktion_bis), "sla_loesung_bis": system_aus_iso(loesung_bis),
		"gelesen_kunde": 1, "gelesen_backoffice": 0, "nachrichten_json": als_json(nachrichten), "anhaenge_json": "[]",
	})
	_verlauf(t, f"Ticket eröffnet ({TICKET_KATEGORIEN.get(kategorie)}, {TICKET_PRIORITAETEN[prioritaet][0]})", n)
	t.insert(ignore_permissions=True)
	t.helpdesk = helpdesk.ticket_anlegen(t, text, frappe.db.get_value("Plattform Konto", konto_id, "email") if konto_id else "")
	if t.helpdesk:
		t.save(ignore_permissions=True)
	if t.zustaendig_id:
		benachrichtigen(t.zustaendig_id, "ticket", f"Neues Ticket: {betreff}", f"{TICKET_PRIORITAETEN[prioritaet][0]} · Reaktion bis {iso(t.sla_reaktion_bis)}", f"/portal/admin/support?ticket={t.name}", "ticket", t.name)
	if konto_id and (not n or konto_id != n.id):
		benachrichtigen(konto_id, "ticket", f"Ticket eröffnet: {betreff}", "Wir kümmern uns darum.", f"/portal/support/{t.name}", "ticket", t.name)
	return t


# ================================================================ Lesen


@frappe.whitelist(methods=["POST"])
def liste(status=None, alle=None, q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	bo = bo_lesen(n)
	filters = {}
	if status == "offen":
		filters["status"] = ["in", TICKET_OFFEN]
	elif status == "erledigt":
		filters["status"] = ["not in", TICKET_OFFEN]
	elif status in TICKET_STATUS:
		filters["status"] = status
	if not (alle and bo):
		from oekoinvest_app.plattform.organisation import organisationen_ids

		namen = set(frappe.get_all(DT, filters={"konto_id": n.id}, pluck="name", limit_page_length=0))
		orgs = organisationen_ids(n.id)
		if orgs:
			namen |= set(frappe.get_all(DT, filters={"organisation_id": ["in", orgs]}, pluck="name", limit_page_length=0))
		filters["name"] = ["in", list(namen) or ["-"]]
	such = v.text(q, 80).lower()
	out = []
	for t in frappe.get_all(DT, filters=filters, fields=["*"], order_by="modified desc", limit_page_length=500):
		if such and such not in f"{t.name} {t.betreff} {name_von(t.konto_id)}".lower():
			continue
		out.append(ausgabe(n, t))
	if bo and alle:
		out.sort(key=lambda x: (-(10 if x["offen"] else 0) - TICKET_PRIORITAETEN[x["prioritaet"]][3]))
	return out


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	t = laden(n, id)
	bo = zugriff(n, t) == "backoffice"
	feld = "gelesen_backoffice" if bo else "gelesen_kunde"
	if not cint(t.get(feld)):
		frappe.db.set_value(DT, t.name, feld, 1, update_modified=False)
		t.set(feld, 1)
	return ausgabe(n, t, detail=True)


@frappe.whitelist(methods=["POST"])
def kennzahlen(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not bo_lesen(n):
		verboten("Nur für das Backoffice.")
	offen = frappe.get_all(DT, filters={"status": ["in", TICKET_OFFEN]}, fields=["*"], limit_page_length=0)
	staende = [sla_stand(_sla_dict(t)) for t in offen]
	return {
		"offen": len(offen), "neu": sum(1 for t in offen if t.status == "neu"), "wartetKunde": sum(1 for t in offen if t.status == "wartet_kunde"),
		"slaVerletzt": sum(1 for s in staende if s["ampel"] == "verletzt"), "slaKnapp": sum(1 for s in staende if s["ampel"] == "warn"),
		"meine": sum(1 for t in offen if t.zustaendig_id == n.id),
	}


# ================================================================ Anlegen, Antworten, Aktionen


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	betreff = v.text(d.get("betreff"), 160)
	v.pflicht(len(betreff) >= 4, "Bitte geben Sie einen Betreff an (mind. 4 Zeichen).")
	text = v.mehrzeilig(d.get("text"), 5000)
	v.pflicht(len(text) >= 10, "Bitte beschreiben Sie Ihr Anliegen (mind. 10 Zeichen).")
	kategorie = v.auswahl(d.get("kategorie"), list(TICKET_KATEGORIEN), "sonstiges")
	bo = bo_schreiben(n)
	prioritaet = v.auswahl(d.get("prioritaet"), list(TICKET_PRIORITAETEN) if bo else ["niedrig", "normal", "hoch"], "hoch" if kategorie == "stoerung" else "normal")
	anlage_id = None
	if d.get("anlageId"):
		from oekoinvest_app.plattform.api.anlagen import anlage_laden

		anlage_id = anlage_laden(n, d.get("anlageId")).name  # fremde Anlage → PermissionError
	konto_id = n.id
	if bo and d.get("fuerKontoId"):
		konto_id = v.kennung(d.get("fuerKontoId"))
		if not konto_id or not frappe.db.exists("Plattform Konto", konto_id):
			nicht_gefunden("Konto nicht gefunden.")
	org = None
	if not bo and n.get("organisation"):
		from oekoinvest_app.plattform.organisation import darf_team_schreiben

		if not darf_team_schreiben(n.organisation.get("rolle")):
			verboten("Mit der Rolle „Nur lesen“ können Sie in dieser Organisation nichts anlegen.")
		org = n.organisation.get("id")
	t = ticket_erzeugen(n, betreff, kategorie, prioritaet, text, konto_id, org, anlage_id, herkunft="backoffice" if bo else "portal")
	protokoll(n, "ticket", "ticket", t.name, f"Ticket „{betreff}“ eröffnet")
	return ausgabe(n, t, detail=True)


@frappe.whitelist(methods=["POST"])
def antworten(id=None, text=None, intern=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	inhalt = v.mehrzeilig(text, 5000)
	v.pflicht(len(inhalt) >= 2, "Bitte geben Sie eine Nachricht ein.")
	t = laden(n, id)
	zg = zugriff(n, t)
	bo = zg == "backoffice"
	if bo and not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Service & Support“ kein Schreiben.")
	if not bo and zg == "team-lesen":
		verboten("Mit der Rolle „Nur lesen“ können Sie nicht antworten.")
	if t.status == "geschlossen":
		konflikt("Das Ticket ist geschlossen. Bitte eröffnen Sie ein neues Ticket.")
	ist_intern = bo and v.wahr(intern)
	nachrichten = aus_json(t.nachrichten_json, []) or []
	nachrichten.append({"id": f"TN-{secrets.token_hex(4).upper()}", "am": jetzt_iso(), "vonId": n.id, "backoffice": bo, "intern": ist_intern, "text": inhalt})
	t.nachrichten_json = als_json(nachrichten)
	if bo and not ist_intern:
		t.erste_reaktion_am = t.erste_reaktion_am or jetzt()
		if t.status == "neu":
			t.status = "in_arbeit"
		t.gelesen_kunde = 0
		benachrichtigen(t.konto_id, "ticket", f"Antwort zu: {t.betreff}", "Das Service-Team hat geantwortet.", f"/portal/support/{t.name}", "ticket", t.name)
	elif not bo:
		if t.status in ("wartet_kunde", "geloest"):
			_verlauf(t, "Wieder geöffnet durch Antwort des Kunden", n)
			t.status, t.geloest_am = "in_arbeit", None
		t.gelesen_backoffice = 0
		if t.zustaendig_id:
			benachrichtigen(t.zustaendig_id, "ticket", f"Kundenantwort: {t.betreff}", name_von(n.id), f"/portal/admin/support?ticket={t.name}", "ticket", t.name, mail=False)
	t.save(ignore_permissions=True)
	if not ist_intern:
		helpdesk.antwort_spiegeln(t, inhalt, bo)  # interne Notizen nie
		helpdesk.status_setzen(t)
	return ausgabe(n, t, detail=True)


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	t = laden(n, id)
	zg = zugriff(n, t)
	art = d.get("aktion")
	if zg != "backoffice":
		if zg == "team-lesen":
			verboten("Mit der Rolle „Nur lesen“ können Sie das Ticket nicht ändern.")
		if art != "schliessen":
			verboten("Diese Änderung kann nur das Service-Team vornehmen.")
		if t.status == "geschlossen":
			konflikt("Das Ticket ist bereits geschlossen.")
		t.status, t.geloest_am = "geschlossen", t.geloest_am or jetzt()
		_verlauf(t, "Vom Kunden geschlossen", n)
		t.save(ignore_permissions=True)
		helpdesk.status_setzen(t)
		return ausgabe(n, t, detail=True)
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Service & Support“ kein Schreiben.")
	if art == "status":
		st = v.auswahl(d.get("status"), list(TICKET_STATUS), "")
		v.pflicht(st, "Unbekannter Status.")
		if st != t.status:
			_verlauf(t, f"Status: {TICKET_STATUS[t.status][0]} → {TICKET_STATUS[st][0]}", n)
			t.status = st
			if st == "geloest":
				t.geloest_am = jetzt()
			if st in TICKET_OFFEN:
				t.geloest_am = None
			if st != "neu" and not t.erste_reaktion_am:
				t.erste_reaktion_am = jetzt()
			benachrichtigen(t.konto_id, "ticket", f"{TICKET_STATUS[st][0]}: {t.betreff}", "Der Status Ihres Tickets hat sich geändert.", f"/portal/support/{t.name}", "ticket", t.name, mail=st in ("geloest", "wartet_kunde"))
	elif art == "prioritaet":
		p = v.auswahl(d.get("prioritaet"), list(TICKET_PRIORITAETEN), "")
		v.pflicht(p, "Unbekannte Priorität.")
		r, lo = sla_fristen(p, iso(t.creation))
		_verlauf(t, f"Priorität: {TICKET_PRIORITAETEN[t.prioritaet][0]} → {TICKET_PRIORITAETEN[p][0]} (SLA neu berechnet)", n)
		t.prioritaet, t.sla_reaktion_bis, t.sla_loesung_bis, t.sla_gemeldet = p, system_aus_iso(r), system_aus_iso(lo), 0
	elif art == "zuweisen":
		z = v.kennung(d.get("zustaendigId"))
		v.pflicht(z and z in aktive_admins(), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
		t.zustaendig_id = z
		_verlauf(t, f"Zugewiesen an {name_von(z)}", n)
		if z != n.id:
			benachrichtigen(z, "ticket", f"Ticket zugewiesen: {t.betreff}", f"Von {name_von(n.id)}", f"/portal/admin/support?ticket={t.name}", "ticket", t.name)
	else:
		ungueltig("Unbekannte Aktion.")
	t.save(ignore_permissions=True)
	helpdesk.status_setzen(t)
	protokoll(n, "ticket", "ticket", t.name, f"Ticket {art}")
	return ausgabe(n, t, detail=True)


@frappe.whitelist(methods=["POST"])
def aus_stoerung(stoerungId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Service & Support“ kein Schreiben.")
	sid = v.kennung(stoerungId)
	if not sid or not frappe.db.exists("Plattform Stoerungsfall", sid):
		nicht_gefunden("Störung nicht gefunden.")
	vorhanden = frappe.db.get_value(DT, {"stoerung_id": sid}, "name")
	if vorhanden:
		return ausgabe(n, frappe.get_doc(DT, vorhanden), detail=True)
	s = frappe.get_doc("Plattform Stoerungsfall", sid)
	a = frappe.db.get_value("Plattform Anlage", s.anlage_id, ["name", "titel", "kunde_id", "organisation_id"], as_dict=True) or frappe._dict()
	t = ticket_erzeugen(
		n, f"Störung „{a.titel or s.anlage_id}“: {s.titel}"[:160], "stoerung", PRIORITAET_AUS_SCHWERE.get(s.schwere, "normal"),
		f"Automatisch aus dem Störungs-Leitstand übernommen.\n\n{s.text or s.titel}", a.kunde_id, a.organisation_id, s.anlage_id, sid, "stoerung",
	)
	t.erste_reaktion_am = jetzt()
	t.save(ignore_permissions=True)
	protokoll(n, "ticket", "ticket", t.name, f"Ticket aus Störung {sid} angelegt")
	return ausgabe(n, t, detail=True)


# ================================================================ Anhänge (private Files)


@frappe.whitelist(methods=["POST"])
def anhang_speichern(id=None, name=None, mime=None, inhaltBase64=None, als_benutzer=None):  # noqa: A002, N803
	from oekoinvest_app.plattform.api.dokument import mime_aus_bytes

	n = nutzer(als_benutzer)
	t = laden(n, id)
	zg = zugriff(n, t)
	if zg == "team-lesen" or (zg == "backoffice" and not bo_schreiben(n)):
		verboten("Keine Berechtigung für Anhänge.")
	anhaenge = aus_json(t.anhaenge_json, []) or []
	if len(anhaenge) >= 5:
		konflikt("Höchstens 5 Anhänge je Ticket.")
	try:
		daten = base64.b64decode(str(inhaltBase64 or ""), validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")
	if not daten or len(daten) > 10 * 1024 * 1024 or mime not in MIME or mime_aus_bytes(daten) != mime:
		ungueltig("Erlaubt sind PDF, JPG und PNG bis 10 MB.")
	sauber = v.text(name, 120).replace("/", "_").replace("\\", "_") or f"anhang.{MIME[mime]}"
	f = frappe.get_doc({"doctype": "File", "file_name": f"{t.name}-{secrets.token_hex(8)}.{MIME[mime]}", "is_private": 1, "content": daten, "attached_to_doctype": DT, "attached_to_name": t.name})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	a = {"id": f"TA-{secrets.token_hex(4).upper()}", "name": sauber, "mime": mime, "groesse": len(daten), "datei": f.name, "am": jetzt_iso(), "vonId": n.id, "sha256": sha256(daten)}
	anhaenge.append(a)
	t.anhaenge_json = als_json(anhaenge)
	_verlauf(t, f"Anhang {sauber}", n)
	t.save(ignore_permissions=True)
	return {"id": a["id"], "name": a["name"], "mime": mime, "groesse": a["groesse"], "am": a["am"]}


@frappe.whitelist(methods=["POST"])
def anhang_lesen(id=None, anhangId=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	t = laden(n, id)
	a = next((x for x in (aus_json(t.anhaenge_json, []) or []) if x.get("id") == anhangId), None)
	if not a or not frappe.db.exists("File", a.get("datei")):
		nicht_gefunden("Anhang nicht gefunden.")
	f = frappe.get_doc("File", a["datei"])
	with open(f.get_full_path(), "rb") as fh:
		daten = fh.read()
	return {"meta": {"name": a["name"], "mime": a["mime"], "groesse": a["groesse"]}, "inhaltBase64": base64.b64encode(daten).decode("ascii")}


# ================================================================ Scheduler (hooks.py, stündlich)


def sla_pruefen():
	"""SLA-Verletzungen einmal je Ticket an die zuständige Person (bzw. alle Support-Schreibenden) melden."""
	for t in frappe.get_all(DT, filters={"status": ["in", TICKET_OFFEN], "sla_gemeldet": 0}, fields=["*"], limit_page_length=0):
		if sla_stand(_sla_dict(t))["ampel"] != "verletzt":
			continue
		empfaenger = [t.zustaendig_id] if t.zustaendig_id else aktive_admins()
		for k in empfaenger:
			benachrichtigen(k, "ticket", f"SLA überschritten: {t.betreff}", f"{TICKET_PRIORITAETEN[t.prioritaet][0]} · seit {iso(now_datetime())}", f"/portal/admin/support?ticket={t.name}", "ticket", t.name)
		frappe.db.set_value(DT, t.name, "sla_gemeldet", 1, update_modified=False)
	frappe.db.commit()
