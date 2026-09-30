# Copyright (c) 2026, ÖkoInvest GmbH
#
# Firmenkonten (Organisationen & Teams) – Port von src/lib/plattform/backend/demo/organisation.js
# (Vertrag: docs/API.md, Abschnitt 8; Methodennamen: src/lib/plattform/backend/frappe/sicherheit.js).
#
# Modell: Plattform Organisation (titel, art, suchprofil), Plattform Mitgliedschaft (Teamrolle inhaber|admin|mitglied|lesen),
# Plattform Einladung (nur SHA-256 des Tokens, 7 Tage). Flächen, Projekte und Interessen tragen `organisation_id`
# (leer = persönlich). Die aktive Organisation hängt an der Sitzung (Plattform Sitzung.organisation_id).
# Nicht-Mitglieder erfahren nicht, ob es eine Organisation gibt (immer 403).
# „Öffentlich“ (ohne als_benutzer, nur API-Nutzer): einladung_info.

import re
import secrets

import frappe
from frappe.utils import add_days, cint, get_datetime, now_datetime

from oekoinvest_app.plattform import sicherheit as s
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import verknuepfen
from oekoinvest_app.plattform.kern import (
	api_pruefen,
	aus_json,
	iso,
	jetzt,
	konflikt,
	kurz,
	name_von,
	nicht_angemeldet,
	nicht_gefunden,
	nutzer,
	protokoll,
	sha256,
	ungueltig,
	verboten,
)
from oekoinvest_app.plattform.konstanten import (
	DOCTYPE,
	EINLADUNG_ROLLEN,
	EINLADUNG_TAGE,
	MAX_MITGLIEDER,
	MAX_ORGANISATIONEN_JE_KONTO,
	ORGANISATION_ARTEN,
	ORGANISATION_OBJEKTE,
	TEAM_ROLLEN,
)
from oekoinvest_app.plattform.organisation import (
	aktive_organisation,
	darf_team_schreiben,
	darf_team_verwalten,
	darf_team_verwalten_objekt,
	organisationen_von,
	team_rolle,
	team_rolle_label,
	team_stufe,
)

BESITZ_FELD = {"flaeche": "nutzer_id", "projekt": "anbieter_id", "interesse": "investor_id"}
TOKEN = re.compile(r"^[A-Za-z0-9_-]{20,200}$")

# ================================================================ Ausgabe


def _titel(art, o):
	if art == "flaeche":
		return o.get("bezeichnung")
	if art == "projekt":
		return o.get("titel")
	return None


def _projekt_titel(projekt_id):
	return frappe.db.get_value("Plattform Projekt", projekt_id, "titel") or projekt_id


def organisation_ausgabe(org, n):
	rolle = team_rolle(n.id, org.name)
	verwalten = darf_team_verwalten(rolle)
	mitglieder = frappe.get_all(
		"Plattform Mitgliedschaft", filters={"organisation_id": org.name}, fields=["name", "nutzer_id", "rolle", "seit"], limit_page_length=0
	)
	mitglieder.sort(key=lambda m: (-team_stufe(m.rolle), str(m.seit or "")))
	flaechen = frappe.get_all("Plattform Flaeche", filters={"organisation_id": org.name}, fields=["name", "bezeichnung", "status"], limit_page_length=0)
	projekte = frappe.get_all("Plattform Projekt", filters={"organisation_id": org.name}, fields=["name", "titel", "status"], limit_page_length=0)
	interessen = frappe.get_all("Plattform Interesse", filters={"organisation_id": org.name}, fields=["name", "projekt_id", "status"], limit_page_length=0)
	einladungen = []
	if verwalten:
		for e in frappe.get_all(
			"Plattform Einladung",
			filters={"organisation_id": org.name, "status": "offen"},
			fields=["name", "email", "rolle", "ablauf", "eingeladen_von", "creation"],
			order_by="creation desc",
			limit_page_length=0,
		):
			einladungen.append(
				{
					"id": e.name,
					"email": e.email,
					"rolle": e.rolle,
					"ablauf": iso(e.ablauf),
					"abgelaufen": bool(e.ablauf) and get_datetime(e.ablauf) < now_datetime(),
					"eingeladenVon": name_von(e.eingeladen_von),
					"erstelltAm": iso(e.creation),
				}
			)
	zuordenbar = []
	if darf_team_schreiben(rolle):
		ohne_org = {"organisation_id": ("is", "not set")}
		zuordenbar = [
			*[{"art": "flaeche", "id": x.name, "titel": x.bezeichnung} for x in frappe.get_all("Plattform Flaeche", filters={"nutzer_id": n.id, **ohne_org}, fields=["name", "bezeichnung"], limit_page_length=0)],
			*[{"art": "projekt", "id": x.name, "titel": x.titel} for x in frappe.get_all("Plattform Projekt", filters={"anbieter_id": n.id, **ohne_org}, fields=["name", "titel"], limit_page_length=0)],
			*[{"art": "interesse", "id": x.name, "titel": _projekt_titel(x.projekt_id)} for x in frappe.get_all("Plattform Interesse", filters={"investor_id": n.id, **ohne_org}, fields=["name", "projekt_id"], limit_page_length=0)],
		][:100]
	return {
		"id": org.name,
		"name": org.titel,
		"art": org.art,
		"rolle": rolle,
		"erstelltAm": iso(org.creation),
		"suchprofil": aus_json(org.suchprofil),
		"mitglieder": [{"id": m.name, "nutzer": kurz(m.nutzer_id), "rolle": m.rolle, "seit": iso(m.seit), "ich": m.nutzer_id == n.id} for m in mitglieder],
		"einladungen": einladungen,
		"objekte": {
			"flaechen": len(flaechen),
			"projekte": len(projekte),
			"interessen": len(interessen),
			"liste": [
				*[{"art": "flaeche", "id": x.name, "titel": x.bezeichnung, "status": x.status, "link": f"/portal/flaechen/{x.name}"} for x in flaechen],
				*[{"art": "projekt", "id": x.name, "titel": x.titel, "status": x.status, "link": f"/portal/projekte/{x.name}"} for x in projekte],
				*[{"art": "interesse", "id": x.name, "titel": _projekt_titel(x.projekt_id), "status": x.status, "link": f"/portal/boerse/{x.projekt_id}"} for x in interessen],
			][:200],
		},
		# Eigene persönliche Objekte, die in die Organisation übernommen werden können (ab Mitglied)
		"zuordenbar": zuordenbar,
	}


def _org_laden(n, kennung, verwalten=False, inhaber=False):
	"""Organisation + eigene Teamrolle. Nicht-Mitglieder erfahren nicht, ob es die Organisation gibt → immer 403."""
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	org = frappe.get_doc("Plattform Organisation", k) if k and frappe.db.exists("Plattform Organisation", k) else None
	rolle = team_rolle(n.id, org.name) if org else None
	if not org or not rolle:
		verboten("Sie sind kein Mitglied dieser Organisation.")
	if inhaber and rolle != "inhaber":
		verboten("Nur der Inhaber kann das.")
	if verwalten and not darf_team_verwalten(rolle):
		verboten("Dafür brauchen Sie die Teamrolle Admin oder Inhaber.")
	return org, rolle


def _mitglied_anlegen(org_id, nutzer_id, rolle, eingeladen_von=None):
	return frappe.get_doc(
		{"doctype": "Plattform Mitgliedschaft", "organisation_id": org_id, "nutzer_id": nutzer_id, "rolle": rolle, "seit": jetzt(), "eingeladen_von": eingeladen_von or None}
	).insert(ignore_permissions=True)


# ================================================================ Organisationen


@frappe.whitelist(methods=["POST"])
def liste(als_benutzer=None):
	n = nutzer(als_benutzer)
	orgs = [{**o, "mitglieder": frappe.db.count("Plattform Mitgliedschaft", {"organisation_id": o["id"]})} for o in organisationen_von(n.id)]
	return {"organisationen": orgs, "aktiv": aktive_organisation(n)}


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else {}
	name = v.text(d.get("name"), 120)
	v.pflicht(len(name) >= 2, "Bitte geben Sie den Namen der Organisation an.")
	art = v.auswahl(d.get("art"), ORGANISATION_ARTEN, "")
	v.pflicht(art, "Bitte wählen Sie die Art der Organisation.")
	v.pflicht(frappe.db.count("Plattform Mitgliedschaft", {"nutzer_id": n.id}) < MAX_ORGANISATIONEN_JE_KONTO, "Sie sind bereits Mitglied in 20 Organisationen.")
	org = frappe.get_doc({"doctype": "Plattform Organisation", "titel": name, "art": art, "erstellt_von": n.id}).insert(ignore_permissions=True)
	_mitglied_anlegen(org.name, n.id, "inhaber")
	protokoll(n, "organisation", "organisation", org.name, f"Organisation „{name}“ angelegt ({ORGANISATION_ARTEN[art][0]})")
	return organisation_ausgabe(org, n)


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	org, _ = _org_laden(n, id)
	return organisation_ausgabe(org, n)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	org, _ = _org_laden(n, id, verwalten=True)
	d = daten if isinstance(daten, dict) else {}
	if "name" in d:
		name = v.text(d.get("name"), 120)
		v.pflicht(len(name) >= 2, "Bitte geben Sie den Namen der Organisation an.")
		org.titel = name
	if "art" in d:
		art = v.auswahl(d.get("art"), ORGANISATION_ARTEN, "")
		v.pflicht(art, "Unbekannte Art.")
		org.art = art
	org.save(ignore_permissions=True)
	protokoll(n, "organisation", "organisation", org.name, f"Organisation bearbeitet: {org.titel}")
	return organisation_ausgabe(org, n)


@frappe.whitelist(methods=["POST"])
def loeschen(id=None, als_benutzer=None):  # noqa: A002
	"""Nur Inhaber. Objekte fallen an ihre Eigentümer zurück (nichts wird gelöscht)."""
	n = nutzer(als_benutzer)
	org, _ = _org_laden(n, id, inhaber=True)
	titel = org.titel
	for art in ORGANISATION_OBJEKTE:
		frappe.db.sql(f"update `tab{DOCTYPE[art]}` set organisation_id = null where organisation_id = %s", (org.name,))
	frappe.db.sql("update `tabPlattform Sitzung` set organisation_id = null where organisation_id = %s", (org.name,))
	frappe.db.delete("Plattform Mitgliedschaft", {"organisation_id": org.name})
	frappe.db.delete("Plattform Einladung", {"organisation_id": org.name})
	frappe.delete_doc("Plattform Organisation", org.name, ignore_permissions=True, force=True)
	protokoll(n, "organisation", "organisation", org.name, f"Organisation „{titel}“ gelöscht")
	return {"ok": True}


# ================================================================ Einladungen


@frappe.whitelist(methods=["POST"])
def einladen(id=None, email=None, rolle=None, basisUrl=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	e = v.email(email)
	v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	r = v.auswahl(rolle, EINLADUNG_ROLLEN, "")
	v.pflicht(r, "Bitte wählen Sie eine Teamrolle.")
	org, eigene = _org_laden(n, id, verwalten=True)
	if team_stufe(r) > team_stufe(eigene):
		verboten("Sie können keine höhere Rolle vergeben als Ihre eigene.")
	vorhanden = frappe.db.get_value("Plattform Konto", {"email": e}, ["name", "vorname"], as_dict=True)
	if vorhanden and team_rolle(vorhanden.name, org.name):
		konflikt("Diese Person ist bereits Mitglied.")
	v.pflicht(frappe.db.count("Plattform Mitgliedschaft", {"organisation_id": org.name}) < MAX_MITGLIEDER, "Die Organisation hat die maximale Mitgliederzahl erreicht.")
	# offene Einladung an dieselbe Adresse ersetzen
	for x in frappe.get_all("Plattform Einladung", filters={"organisation_id": org.name, "email": e, "status": "offen"}, pluck="name", limit_page_length=0):
		frappe.db.set_value("Plattform Einladung", x, "status", "ersetzt")
	token = secrets.token_urlsafe(32)
	einl = frappe.get_doc(
		{
			"doctype": "Plattform Einladung",
			"organisation_id": org.name,
			"email": e,
			"rolle": r,
			"hash": sha256(token),
			"ablauf": add_days(now_datetime(), EINLADUNG_TAGE),
			"status": "offen",
			"eingeladen_von": n.id,
		}
	).insert(ignore_permissions=True)
	s.mail_senden(
		e,
		vorhanden.vorname if vorhanden else "",
		f"Einladung in das Team „{org.titel}“ – ÖkoInvest",
		f"{name_von(n.id)} lädt Sie ein, im Portal von ÖkoInvest dem Team „{org.titel}“ beizutreten (Rolle: {team_rolle_label(r)}). "
		f"Der Link ist {EINLADUNG_TAGE} Tage gültig. Ohne Konto registrieren Sie sich mit dieser E-Mail-Adresse.",
		f"/einladung/{token}",
		"Einladung ansehen",
		"Sie kennen die einladende Person nicht? Dann ignorieren Sie diese E-Mail bitte.",
		fallback=basisUrl,
		sicherheit=False,
	)
	protokoll(n, "einladung", "organisation", org.name, f"Einladung an {e} als {team_rolle_label(r)}")
	return {"id": einl.name, "email": e, "rolle": r, "ablauf": iso(einl.ablauf)}


@frappe.whitelist(methods=["POST"])
def einladung_widerrufen(id=None, einladungId=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	org, _ = _org_laden(n, id, verwalten=True)
	k = v.kennung(einladungId)
	e = frappe.db.get_value("Plattform Einladung", {"name": k, "organisation_id": org.name, "status": "offen"}, ["name", "email"], as_dict=True) if k else None
	if not e:
		nicht_gefunden("Einladung nicht gefunden.")
	frappe.db.set_value("Plattform Einladung", e.name, "status", "widerrufen")
	protokoll(n, "einladung", "organisation", org.name, f"Einladung an {e.email} widerrufen")
	return {"ok": True}


def _einladung_suchen(token):
	t = token if isinstance(token, str) else ""
	if not TOKEN.match(t):
		return None
	name = frappe.db.get_value("Plattform Einladung", {"hash": sha256(t)}, "name")
	return frappe.get_doc("Plattform Einladung", name) if name else None


def _maskieren(email):
	lokal, _, domain = str(email).partition("@")
	return f"{lokal[:1]}{'•' * max(2, min(6, len(lokal) - 1))}@{domain}"


def _abgelaufen(e):
	return not e.ablauf or get_datetime(e.ablauf) < now_datetime()


@frappe.whitelist(methods=["POST"])
def einladung_info(token=None):
	"""Öffentliche Kurzinfo zur Einladungsseite – verrät nur, was der Link-Empfänger ohnehin weiß."""
	api_pruefen()
	e = _einladung_suchen(token)
	org = frappe.db.get_value("Plattform Organisation", e.organisation_id, ["name", "titel", "art"], as_dict=True) if e else None
	if not e or not org or e.status != "offen" or _abgelaufen(e):
		return {"gueltig": False, "status": ("abgelaufen" if e.status == "offen" else e.status) if e else "unbekannt"}
	return {
		"gueltig": True,
		"organisation": {"name": org.titel, "art": org.art},
		"rolle": e.rolle,
		"eingeladenVon": name_von(e.eingeladen_von),
		"email": _maskieren(e.email),
		"ablauf": iso(e.ablauf),
	}


@frappe.whitelist(methods=["POST"])
def einladung_annehmen(token=None, als_benutzer=None):
	from oekoinvest_app.plattform import benachrichtigung

	n = nutzer(als_benutzer)
	e = _einladung_suchen(token)
	if not e or e.status != "offen" or _abgelaufen(e):
		ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.")
	konto = frappe.get_doc("Plattform Konto", n.id)
	if konto.email != e.email:
		verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.")
	org = frappe.db.get_value("Plattform Organisation", e.organisation_id, ["name", "titel"], as_dict=True)
	if not org:
		nicht_gefunden("Die Organisation besteht nicht mehr.")
	if not team_rolle(konto.name, org.name):
		_mitglied_anlegen(org.name, konto.name, e.rolle, e.eingeladen_von)
	frappe.db.set_value("Plattform Einladung", e.name, {"status": "angenommen", "angenommen_am": jetzt(), "angenommen_von": konto.name})
	# Wer die Einladung per E-Mail erhalten hat, hat die Adresse nachgewiesen
	if not cint(konto.email_bestaetigt):
		konto.email_bestaetigt = 1
		konto.save(ignore_permissions=True)
		verknuepfen(konto)
	if e.eingeladen_von:
		benachrichtigung.anlegen(
			e.eingeladen_von,
			"status",
			f"Team „{org.titel}“",
			f"{name_von(konto.name)} hat die Einladung angenommen ({team_rolle_label(e.rolle)}).",
			"/portal/organisation",
			"organisation",
			org.name,
			mail=False,
		)
	protokoll(n, "einladung", "organisation", org.name, f"Einladung angenommen ({team_rolle_label(e.rolle)})")
	return {"organisationId": org.name, "name": org.titel, "rolle": e.rolle}


# ================================================================ Mitglieder


@frappe.whitelist(methods=["POST"])
def mitglied_aendern(id=None, mitgliedId=None, rolle=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	r = v.auswahl(rolle, TEAM_ROLLEN, "")
	v.pflicht(r, "Unbekannte Teamrolle.")
	org, eigene = _org_laden(n, id, verwalten=True)
	k = v.kennung(mitgliedId)
	m = frappe.db.get_value("Plattform Mitgliedschaft", {"name": k, "organisation_id": org.name}, ["name", "nutzer_id", "rolle"], as_dict=True) if k else None
	if not m:
		nicht_gefunden("Mitglied nicht gefunden.")
	if r == "inhaber":
		# Übertragung der Inhaberschaft: nur durch den Inhaber, bisheriger Inhaber wird Admin
		if eigene != "inhaber":
			verboten("Nur der Inhaber kann die Inhaberschaft übertragen.")
		if m.nutzer_id == n.id:
			return organisation_ausgabe(org, n)
		for alt in frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": org.name, "rolle": "inhaber"}, pluck="name", limit_page_length=0):
			frappe.db.set_value("Plattform Mitgliedschaft", alt, "rolle", "admin")
		frappe.db.set_value("Plattform Mitgliedschaft", m.name, "rolle", "inhaber")
	else:
		if m.rolle == "inhaber":
			konflikt("Die Rolle des Inhabers ändern Sie, indem Sie die Inhaberschaft übertragen.")
		if team_stufe(r) > team_stufe(eigene) or team_stufe(m.rolle) > team_stufe(eigene):
			verboten("Sie können keine Rolle über Ihrer eigenen vergeben oder ändern.")
		frappe.db.set_value("Plattform Mitgliedschaft", m.name, "rolle", r)
	neue = frappe.db.get_value("Plattform Mitgliedschaft", m.name, "rolle")
	protokoll(n, "mitglied", "organisation", org.name, f"{name_von(m.nutzer_id)}: Teamrolle {team_rolle_label(neue)}")
	return organisation_ausgabe(org, n)


@frappe.whitelist(methods=["POST"])
def mitglied_entfernen(id=None, mitgliedId=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	org, eigene = _org_laden(n, id)
	k = v.kennung(mitgliedId)
	m = frappe.db.get_value("Plattform Mitgliedschaft", {"name": k, "organisation_id": org.name}, ["name", "nutzer_id", "rolle"], as_dict=True) if k else None
	if not m:
		nicht_gefunden("Mitglied nicht gefunden.")
	selbst = m.nutzer_id == n.id
	if not selbst and not darf_team_verwalten(eigene):
		verboten("Dafür brauchen Sie die Teamrolle Admin oder Inhaber.")
	if m.rolle == "inhaber":
		konflikt("Übertragen Sie zuerst die Inhaberschaft oder löschen Sie die Organisation." if selbst else "Der Inhaber kann nicht entfernt werden.")
	if not selbst and team_stufe(m.rolle) > team_stufe(eigene):
		verboten()
	frappe.delete_doc("Plattform Mitgliedschaft", m.name, ignore_permissions=True, force=True)
	frappe.db.sql(
		"update `tabPlattform Sitzung` set organisation_id = null where nutzer_id = %s and organisation_id = %s",
		(m.nutzer_id, org.name),
	)
	protokoll(n, "mitglied", "organisation", org.name, "Organisation verlassen" if selbst else f"{name_von(m.nutzer_id)} entfernt")
	return {"ok": True, "verlassen": True} if selbst else organisation_ausgabe(org, n)


# ================================================================ Kontext & Zuordnung


@frappe.whitelist(methods=["POST"])
def wechseln(organisationId=None, sitzungId=None, als_benutzer=None):
	"""Aktive Organisation der aktuellen Sitzung setzen (None = persönlich)."""
	n = nutzer(als_benutzer)
	ziel = v.kennung(organisationId) if organisationId else None
	if organisationId and not ziel:
		verboten("Sie sind kein Mitglied dieser Organisation.")
	if ziel and not team_rolle(n.id, ziel):
		verboten("Sie sind kein Mitglied dieser Organisation.")
	sid = v.kennung(sitzungId)
	sitzung = frappe.db.get_value("Plattform Sitzung", {"name": sid, "nutzer_id": n.id}, "name") if sid else None
	if not sitzung:
		konflikt("Bitte melden Sie sich neu an, um die Organisation zu wechseln.")
	frappe.db.set_value("Plattform Sitzung", sitzung, "organisation_id", ziel, update_modified=False)
	org = frappe.db.get_value("Plattform Organisation", ziel, ["name", "titel", "art"], as_dict=True) if ziel else None
	return {"aktiv": ziel, "organisation": {"id": org.name, "name": org.titel, "art": org.art, "rolle": team_rolle(n.id, org.name)} if org else None}


@frappe.whitelist(methods=["POST"])
def zuordnen(art=None, id=None, organisationId=None, als_benutzer=None):  # noqa: A002
	"""Eigenes Objekt einer Organisation zuordnen oder wieder persönlich machen."""
	n = nutzer(als_benutzer)
	if art not in ORGANISATION_OBJEKTE:
		ungueltig("Unbekannte Objektart.")
	dt = DOCTYPE[art]
	k = v.kennung(id)
	o = frappe.get_doc(dt, k) if k and frappe.db.exists(dt, k) else None
	if not o:
		nicht_gefunden()
	eigen = o.get(BESITZ_FELD[art]) == n.id
	ziel = v.kennung(organisationId) if organisationId else None
	if organisationId and not ziel:
		verboten("Dafür brauchen Sie in der Organisation mindestens die Rolle Mitglied.")
	if ziel:
		if not eigen:
			verboten("Nur eigene Objekte können einer Organisation zugeordnet werden.")
		if not darf_team_schreiben(team_rolle(n.id, ziel)):
			verboten("Dafür brauchen Sie in der Organisation mindestens die Rolle Mitglied.")
	elif not eigen and not darf_team_verwalten_objekt(n, o):
		verboten()
	vorher = o.get("organisation_id") or None
	frappe.db.set_value(dt, o.name, "organisation_id", ziel)
	titel = frappe.db.get_value("Plattform Organisation", ziel, "titel") if ziel else None
	protokoll(n, "zuordnung", art, o.name, f"Organisation zugeordnet: {titel}" if ziel else f"Aus Organisation gelöst ({vorher or '–'})")
	return {"id": o.name, "art": art, "organisationId": ziel, "titel": _titel(art, o)}
