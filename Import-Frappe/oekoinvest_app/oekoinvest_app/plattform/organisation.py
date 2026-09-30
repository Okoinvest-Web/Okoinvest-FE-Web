# Copyright (c) 2026, ÖkoInvest GmbH
#
# Firmenkonten (Organisationen & Teams) – Rechte-Helfer und Konto-Komfort.
# Port von src/lib/plattform/organisation.js und der Rechte-Helfer aus src/lib/plattform/backend/demo/organisation.js.
#
# Rechte je Teamrolle (gelten für Objekte der Organisation: Flächen, Projekte, Interessen, Suchprofil):
#   lesen     – sehen (Listen im Organisationskontext, Detailseiten, Nachrichten, Dokumente, Datenraum nach NDA)
#   mitglied  – zusätzlich bearbeiten, Statusschritte als Eigentümer, hochladen, Nachrichten senden, anlegen
#   admin     – zusätzlich Mitglieder einladen/entfernen, Rollen bis „Admin“ vergeben, Stammdaten ändern
#   inhaber   – zusätzlich Inhaberschaft übertragen, Organisation löschen (genau ein Inhaber)
#
# Die aktive Organisation hängt an der Sitzung; die Website sendet sie bei jedem Aufruf als `als_organisation`.
# kern.nutzer() prüft die Mitgliedschaft und setzt `n.organisation = {id, name, art, rolle}` bzw. None.

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, verboten
from oekoinvest_app.plattform.konstanten import AVATAR_FARBEN, SPRACHEN, TEAM_ROLLEN

# ================================================================ Teamrollen


def team_stufe(rolle):
	return TEAM_ROLLEN[rolle][1] if rolle in TEAM_ROLLEN else 0


def darf_team_lesen(rolle):
	return team_stufe(rolle) >= 1


def darf_team_schreiben(rolle):
	return team_stufe(rolle) >= 2


def darf_team_verwalten(rolle):
	return team_stufe(rolle) >= 3


def team_rolle_label(rolle):
	return TEAM_ROLLEN[rolle][0] if rolle in TEAM_ROLLEN else (rolle or "")


# ================================================================ Mitgliedschaft & Kontext


def mitgliedschaft(nutzer_id, organisation_id):
	"""Mitgliedschaft (name, rolle, …) oder None."""
	if not nutzer_id or not organisation_id:
		return None
	return frappe.db.get_value(
		"Plattform Mitgliedschaft",
		{"nutzer_id": nutzer_id, "organisation_id": organisation_id},
		["name", "rolle", "seit", "eingeladen_von"],
		as_dict=True,
	)


def team_rolle(nutzer_id, organisation_id):
	"""Teamrolle des Kontos in der Organisation oder None."""
	m = mitgliedschaft(nutzer_id, organisation_id)
	return m.rolle if m else None


def kontext(nutzer_id, als_organisation):
	"""Aktive Organisation für kern.nutzer(): {id, name, art, rolle} – ohne Mitgliedschaft still None."""
	k = v.kennung(als_organisation)
	if not k:
		return None
	rolle = team_rolle(nutzer_id, k)
	if not rolle:
		return None
	o = frappe.db.get_value("Plattform Organisation", k, ["name", "titel", "art"], as_dict=True)
	if not o:
		return None
	return {"id": o.name, "name": o.titel or "", "art": o.art or "", "rolle": rolle}


def aktive_organisation(n):
	"""Kennung der aktiven Organisation (von kern.nutzer bereits geprüft) oder None."""
	org = (n or {}).get("organisation") if n else None
	return org.get("id") if isinstance(org, dict) and org.get("id") else None


def organisationen_von(nutzer_id):
	"""Organisationen des Kontos für Sitzung/Kopfzeile: [{id, name, art, rolle}] nach Name sortiert."""
	if not nutzer_id:
		return []
	out = []
	for m in frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": nutzer_id}, fields=["organisation_id", "rolle"], limit_page_length=0):
		o = frappe.db.get_value("Plattform Organisation", m.organisation_id, ["name", "titel", "art"], as_dict=True)
		if o:
			out.append({"id": o.name, "name": o.titel or "", "art": o.art or "", "rolle": m.rolle})
	out.sort(key=lambda x: x["name"].casefold())
	return out


def organisationen_ids(nutzer_id):
	return frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": nutzer_id}, pluck="organisation_id", limit_page_length=0) if nutzer_id else []


# ================================================================ Rechte an Objekten


def team_zugriff(n, o):
	"""Zugriff von n auf ein Objekt der Organisation: "schreiben" | "lesen" | None (ohne Eigentum/Admin)."""
	org_id = o.get("organisation_id") if o else None
	if not n or not org_id:
		return None
	r = team_rolle(n.get("id"), org_id)
	if not r:
		return None
	return "schreiben" if darf_team_schreiben(r) else "lesen"


def darf_team_lesen_objekt(n, o):
	return bool(team_zugriff(n, o))


def darf_team_schreiben_objekt(n, o):
	return team_zugriff(n, o) == "schreiben"


def darf_team_verwalten_objekt(n, o):
	org_id = o.get("organisation_id") if o else None
	if not n or not org_id:
		return False
	return darf_team_verwalten(team_rolle(n.get("id"), org_id))


def listen_filter(n, feld):
	"""Filter für Listen: ohne aktive Organisation eigene Objekte (`feld` = n.id), sonst alle der Organisation."""
	aktiv = aktive_organisation(n)
	return {"organisation_id": aktiv} if aktiv else {feld: n.id}


def organisation_fuer_neu(n):
	"""Organisation eines neu angelegten Objekts (aktive Organisation, Rolle ≥ Mitglied) oder None."""
	aktiv = aktive_organisation(n)
	if not aktiv:
		return None
	if not darf_team_schreiben(team_rolle(n.id, aktiv)):
		verboten("Mit der Rolle „Nur lesen“ können Sie in dieser Organisation nichts anlegen.")
	return aktiv


def zugriff_info(n, o, besitzer_id):
	"""Zusatzfelder für die Ausgabe eines Objekts: organisation {id, name} | None, meinZugriff."""
	org_id = o.get("organisation_id") if o else None
	titel = frappe.db.get_value("Plattform Organisation", org_id, "titel") if org_id else None
	admin = bool(n) and "admin" in (n.get("rollen") or [])
	if n and besitzer_id and besitzer_id == n.get("id"):
		mein = "eigentuemer"
	else:
		mein = team_zugriff(n, o) or ("admin" if admin else None)
	return {"organisation": {"id": org_id, "name": titel or ""} if titel is not None else None, "meinZugriff": mein}


def interesse_fuer(n, projekt_id):
	"""Interesse (Dokument), das n für ein Projekt „gehört“: im Organisationskontext das Interesse der
	Organisation (von jedem Mitglied angelegt), sonst das eigene – oder None."""
	if not n or not projekt_id:
		return None
	aktiv = aktive_organisation(n)
	name = None
	if aktiv:
		name = frappe.db.get_value("Plattform Interesse", {"projekt_id": projekt_id, "organisation_id": aktiv}, "name")
	if not name:
		name = frappe.db.get_value("Plattform Interesse", {"projekt_id": projekt_id, "investor_id": n.id}, "name")
	return frappe.get_doc("Plattform Interesse", name) if name else None


def datenraum_interesse(n, projekt_id, status):
	"""Eigenes oder Team-Interesse (beliebige Teamrolle) mit Status aus `status` (Zeile name/investor_id/status) oder None."""
	if not n or not projekt_id:
		return None
	for i in frappe.get_all(
		"Plattform Interesse",
		filters={"projekt_id": projekt_id, "status": ("in", list(status))},
		fields=["name", "investor_id", "organisation_id", "status"],
		limit_page_length=0,
	):
		if i.investor_id == n.id or darf_team_lesen_objekt(n, i):
			return i
	return None


def datenraum_ueber_interesse(n, projekt_id, status):
	"""Hat n über eigenes oder Team-Interesse (beliebige Teamrolle) Zugang zum Datenraum (Status aus `status`)?"""
	return bool(datenraum_interesse(n, projekt_id, status))


def suchprofil_fuer(n):
	"""Suchprofil im aktuellen Kontext (Organisation oder Konto)."""
	if not n:
		return None
	aktiv = aktive_organisation(n)
	if aktiv:
		return aus_json(frappe.db.get_value("Plattform Organisation", aktiv, "suchprofil"))
	return aus_json(frappe.db.get_value("Plattform Konto", n.id, "suchprofil"))


def team_bezuege(n):
	"""Kennungen der Objekte aller Organisationen des Kontos (jede Teamrolle) – für Threads/Dokumente."""
	orgs = organisationen_ids(n.id) if n else []
	leer = {"flaeche": [], "projekt": [], "interesse": []}
	if not orgs:
		return leer
	f = {"organisation_id": ("in", orgs)}
	return {
		"flaeche": frappe.get_all("Plattform Flaeche", filters=f, pluck="name", limit_page_length=0),
		"projekt": frappe.get_all("Plattform Projekt", filters=f, pluck="name", limit_page_length=0),
		"interesse": frappe.get_all("Plattform Interesse", filters=f, pluck="name", limit_page_length=0),
	}


def team_suchprofil_setzen(n, profil):
	"""Suchprofil der aktiven Organisation speichern (Rolle ≥ Mitglied). False ohne aktive Organisation."""
	from oekoinvest_app.plattform.kern import als_json, protokoll

	aktiv = aktive_organisation(n)
	if not aktiv:
		return False
	if not darf_team_schreiben(team_rolle(n.id, aktiv)):
		verboten("Mit der Rolle „Nur lesen“ können Sie das Team-Suchprofil nicht ändern.")
	frappe.db.set_value("Plattform Organisation", aktiv, "suchprofil", als_json(profil))
	protokoll(n, "suchprofil", "organisation", aktiv, "Team-Suchprofil gespeichert")
	return True


def organisations_alarm(p, pj, bereits):
	"""Suchprofil-Alarm für Organisationen: Mitglieder von Organisationen mit passendem Team-Suchprofil
	(ohne die Organisation des Anbieters) werden benachrichtigt – je Person höchstens einmal (`bereits`)."""
	from oekoinvest_app.plattform import benachrichtigung
	from oekoinvest_app.plattform.kern import protokoll
	from oekoinvest_app.plattform.konstanten import SUCHPROFIL_SCHWELLE
	from oekoinvest_app.plattform.matching import matching

	for org in frappe.get_all("Plattform Organisation", fields=["name", "titel", "suchprofil"], limit_page_length=0):
		sp = aus_json(org.suchprofil) or {}
		if not isinstance(sp, dict) or not sp.get("benachrichtigen") or org.name == p.get("organisation_id"):
			continue
		m = matching(pj, sp)
		schwelle = v.zahl(sp.get("schwelle"), min=1) or SUCHPROFIL_SCHWELLE["standard"]
		if m["score"] < schwelle:
			continue
		for mg in frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": org.name}, pluck="nutzer_id", limit_page_length=0):
			if mg in bereits or mg == p.anbieter_id or not frappe.db.get_value("Plattform Konto", mg, "aktiv"):
				continue
			bereits.add(mg)
			benachrichtigung.anlegen(
				mg,
				"suchprofil",
				f"Passendes Projekt: {p.titel}",
				f"{m['score']} % Passung (Team {org.titel})",
				f"/portal/boerse/{p.name}",
				"projekt",
				p.name,
				mail_text=f"In der Projektbörse wurde ein Projekt veröffentlicht, das zum Suchprofil Ihres Teams „{org.titel}“ passt ({m['score']} % Passung): „{p.titel}“.",
			)
			protokoll(None, "suchprofil_treffer", "projekt", p.name, f"Team-Suchprofil-Treffer für {mg} ({m['score']} %, {org.titel})")


# ================================================================ Konto-Komfort


def komfort_standard():
	return {"farbe": "navy", "sprache": "de", "kanaele": {"email": True, "sicherheitEmail": True}}


def komfort_bereinigen(k=None, basis=None):
	"""Komfort-Einstellungen bereinigen (Positivliste) – wie komfortBereinigen in organisation.js."""
	k = k if isinstance(k, dict) else {}
	basis = basis if isinstance(basis, dict) else komfort_standard()
	kanaele = k.get("kanaele") if isinstance(k.get("kanaele"), dict) else {}
	basis_kanaele = basis.get("kanaele") if isinstance(basis.get("kanaele"), dict) else {}
	email = kanaele.get("email")
	return {
		"farbe": k.get("farbe") if k.get("farbe") in AVATAR_FARBEN else basis.get("farbe", "navy"),
		"sprache": k.get("sprache") if k.get("sprache") in SPRACHEN else basis.get("sprache", "de"),
		"kanaele": {
			"email": email if isinstance(email, bool) else (basis_kanaele.get("email") if isinstance(basis_kanaele.get("email"), bool) else True),
			# Sicherheitsmeldungen (neues Gerät, 2FA, E-Mail-Änderung) gehen immer per E-Mail – nicht abschaltbar
			"sicherheitEmail": True,
		},
	}


def mail_kanal_aktiv(komfort):
	"""Globaler Kanal E-Mail (Konto-Komfort): nur ausdrücklich `false` schaltet Benachrichtigungs-E-Mails ab."""
	k = aus_json(komfort) if not isinstance(komfort, dict) else komfort
	kanaele = k.get("kanaele") if isinstance(k, dict) and isinstance(k.get("kanaele"), dict) else {}
	return kanaele.get("email") is not False
