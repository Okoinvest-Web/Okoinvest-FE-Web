# Copyright (c) 2026, ÖkoInvest GmbH
#
# Termine & Kalender – docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Referenz: src/lib/plattform/backend/demo/service-termine.js.
#
# Rechte:
#   öffentlich (ohne als_benutzer, nur API-Benutzer der Website): Slots und Buchung öffentlicher Terminarten; Verwaltung
#     nur per Einmal-Link (Token, gespeichert nur als SHA-256).
#   Portal-Konto: eigene Termine sehen/umbuchen/absagen; Datenraum-Session nur Investoren.
#   Backoffice (Bereich „kalender“): lesen ≥ 1 alle Termine/Verfügbarkeiten; schreiben = 2 buchen für Kunden, zuweisen, Status.
# Doppelbuchung: Zeile des Mitarbeiters wird per SELECT … FOR UPDATE gesperrt, danach „Slot frei“ erneut geprüft (→ 409).
# Abwesenheit (HR): abwesende Mitarbeiter haben keine Slots; bestehende Termine gehen an die Vertretung (api/hr.py).
# Optional: Frappe „Event“ je Termin (site_config oekoinvest_event = 1); Feiertage aus HRMS Holiday List (hr/hrms.py).

import secrets
from datetime import timedelta

import frappe
from frappe.utils import add_days, cint, get_datetime, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen, aktive_admins
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt_iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe
from oekoinvest_app.plattform.service import mails
from oekoinvest_app.plattform.service.integration import aktiv
from oekoinvest_app.plattform.service.zeit import system_aus_iso, utc_aus_system
from oekoinvest_app.plattform.termine.ics import ics_erstellen
from oekoinvest_app.plattform.termine.slots import (
	ARBEITSZEITEN_STANDARD, GRENZEN, KANAELE, TERMIN_AKTIV, TERMIN_ARTEN, TERMIN_STATUS, arbeitszeiten_bereinigen, aus_iso, freie_slots, heute_tag, lokal_tag, slot_frei,
	tag_gueltig, zeitraum_text,
)

DT = "Plattform Termin"
BEREICH = "kalender"


def ist_admin(n):
	return bool(n) and "admin" in (n.get("rollen") or [])


def bo_lesen(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 1


def bo_schreiben(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 2


def art_pruefen(n, art):
	a = TERMIN_ARTEN.get(art)
	if not a:
		ungueltig("Unbekannte Terminart.")
	if a[4]:
		return a
	if not n:
		nicht_angemeldet()
	if not ist_admin(n) and not any(r in (n.get("rollen") or []) for r in (a[5] or [])):
		verboten("Diese Terminart steht Ihrem Konto nicht zur Verfügung.")
	return a


# ================================================================ Mitarbeiter, Belegung, Slots


def _mitarbeiter(konto_id):
	return frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": konto_id}, ["name", "konto_id", "arbeitszeiten_json", "terminarten_json", "termine_aktiv", "aktiv", "vertretung_id"], as_dict=True)


def anbieter(art):
	admins = set(aktive_admins())
	out = []
	for m in frappe.get_all("Plattform Mitarbeiter", filters={"aktiv": 1, "termine_aktiv": 1}, fields=["konto_id", "terminarten_json", "arbeitszeiten_json"], limit_page_length=0):
		if m.konto_id in admins and art in (aus_json(m.terminarten_json, []) or []):
			out.append(m)
	return out


def _abwesenheiten(konto_id):
	return [{"von": str(a.von), "bis": str(a.bis)} for a in frappe.get_all("Plattform Abwesenheit", filters={"mitarbeiter_id": konto_id, "status": "genehmigt", "bis": [">=", add_days(heute_tag(), -1)]}, fields=["von", "bis"], limit_page_length=0)]


def _belegt(konto_id, ohne=None):
	filters = {"mitarbeiter_id": konto_id, "status": ["in", TERMIN_AKTIV], "ende": [">=", now_datetime()]}
	return [{"start": iso(t.start), "ende": iso(t.ende)} for t in frappe.get_all(DT, filters=filters, fields=["name", "start", "ende"], limit_page_length=0) if t.name != ohne]


def slot_param(konto_id, art, ohne=None, vorlauf=True):
	from oekoinvest_app.plattform.hr.hrms import feiertage

	a = TERMIN_ARTEN[art]
	m = _mitarbeiter(konto_id) or {}
	return {
		"arbeitszeiten": aus_json(m.get("arbeitszeiten_json"), None) or ARBEITSZEITEN_STANDARD, "feiertage": feiertage(konto_id, add_days(heute_tag(), -1), add_days(heute_tag(), GRENZEN["horizont_tage"] + 2)),
		"abwesenheiten": _abwesenheiten(konto_id), "belegt": _belegt(konto_id, ohne), "dauer": a[1], "puffer": a[2], "vorlauf_stunden": a[6] if vorlauf else 0,
	}


def zeitraum(von, bis):
	heute = heute_tag()
	von_tag = von if tag_gueltig(von) and von >= heute else heute
	max_bis = str(add_days(heute, GRENZEN["horizont_tage"]))
	bis_tag = bis if tag_gueltig(bis) else str(add_days(von_tag, 13))
	bis_tag = min(bis_tag, max_bis)
	return von_tag, max(bis_tag, von_tag)


@frappe.whitelist(methods=["POST"])
def slots(art=None, von=None, bis=None, mitarbeiterId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer, pflicht=False)
	a = art_pruefen(n, art)
	von_tag, bis_tag = zeitraum(von, bis)
	bo = bo_lesen(n)
	liste = anbieter(art)
	if mitarbeiterId and bo:
		liste = [m for m in liste if m.konto_id == mitarbeiterId]
	gesammelt = {}
	for m in liste:
		for s in freie_slots(von_tag=von_tag, bis_tag=bis_tag, **slot_param(m.konto_id, art)):
			e = gesammelt.setdefault(s["start"], {"start": s["start"], "ende": s["ende"], "anzahl": 0, "mitarbeiter": []})
			e["anzahl"] += 1
			if bo:
				e["mitarbeiter"].append({"id": m.konto_id, "name": name_von(m.konto_id)})
	werte = sorted(gesammelt.values(), key=lambda x: x["start"])[: GRENZEN["max_slots"]]
	return {"art": art, "artLabel": a[0], "dauer": a[1], "kanal": a[3], "von": von_tag, "bis": bis_tag, "slots": werte if bo else [{"start": x["start"], "ende": x["ende"]} for x in werte]}


# ================================================================ Ausgabe


def rolle_im(n, t):
	if not n:
		return None
	if bo_lesen(n):
		return "backoffice"
	if t.mitarbeiter_id == n.id:
		return "mitarbeiter"
	if t.konto_id and t.konto_id == n.id:
		return "kunde"
	return None


def ausgabe(n, t):
	rolle = rolle_im(n, t) if n else "token"
	intern = rolle in ("backoffice", "mitarbeiter")
	a = TERMIN_ARTEN.get(t.art)
	start, ende = iso(t.start), iso(t.ende)
	kommend = get_datetime(t.start) > now_datetime()
	return {
		"id": t.name, "art": t.art, "artLabel": a[0] if a else t.art, "kanal": t.kanal, "kanalLabel": KANAELE.get(t.kanal, t.kanal), "start": start, "ende": ende, "zeitraum": zeitraum_text(start, ende),
		"status": t.status, "statusLabel": TERMIN_STATUS.get(t.status, t.status), "ort": t.ort or "", "herkunft": t.herkunft,
		"mitarbeiter": ({"id": t.mitarbeiter_id, "name": name_von(t.mitarbeiter_id), "email": frappe.db.get_value("Plattform Konto", t.mitarbeiter_id, "email")} if intern else {"name": name_von(t.mitarbeiter_id)}) if t.mitarbeiter_id else None,
		"vertretungFuer": {"id": t.vertretung_fuer_id if intern else None, "name": name_von(t.vertretung_fuer_id)} if t.vertretung_fuer_id else None,
		"kunde": {"name": t.kontakt_name or "", "email": t.kontakt_email or "", "telefon": t.kontakt_telefon or "", "firma": t.kontakt_firma or ""} if intern or rolle in ("kunde", "token") else None,
		"kontoId": t.konto_id if intern else None, "notiz": t.notiz or "", "bezug": {"art": t.bezug_art, "id": t.bezug_id} if t.bezug_art else None, "sequenz": cint(t.sequenz),
		"darfUmbuchen": kommend and t.status in TERMIN_AKTIV and (rolle in ("kunde", "token") or bo_schreiben(n)),
		"darfBearbeiten": bool(n) and bo_schreiben(n),
		"verlauf": (aus_json(t.verlauf_json, []) or []) if intern else None,
		"erstelltAm": iso(t.creation),
	}


def _verlauf(t, text, n=None):
	liste = aus_json(t.verlauf_json, []) or []
	liste.append({"am": jetzt_iso(), "text": v.text(text, 300), "vonId": n.id if n else None})
	t.verlauf_json = als_json(liste[-100:])


BETREFF = {"neu": "Terminbestätigung", "umgebucht": "Termin verschoben", "storniert": "Termin abgesagt", "vertretung": "Neue Ansprechperson für Ihren Termin", "erinnerung": "Erinnerung an Ihren Termin", "bestaetigt": "Termin bestätigt"}


def ics_von(t, token=None):
	org = frappe.conf.get("oekoinvest_termin_organisator")  # {"name": …, "email": …} – erst nach Freigabe einer Kontaktadresse
	return ics_erstellen({"id": t.name, "art": t.art, "start": iso(t.start), "ende": iso(t.ende), "status": t.status, "sequenz": cint(t.sequenz), "ort": t.ort, "kanal": t.kanal, "mitarbeiterName": name_von(t.mitarbeiter_id), "verwaltenLink": f"/termin/verwalten?token={token}" if token else ""}, organisator=org if isinstance(org, dict) else None)


def versenden(t, anlass, token=None):
	a = TERMIN_ARTEN.get(t.art)
	ics = ics_von(t, token)
	text = f"{a[0] if a else 'Termin'}: {zeitraum_text(iso(t.start), iso(t.ende))}\nAnsprechperson: {name_von(t.mitarbeiter_id) or 'ÖkoInvest'}"
	betreff = f"{BETREFF.get(anlass, 'Ihr Termin')} – ÖkoInvest"
	if t.kontakt_email:
		pfad = "/portal/termine" if t.konto_id else (f"/termin/verwalten?token={token}" if token else "")
		mails.termin(t.kontakt_email, t.kontakt_name, betreff, text, pfad, ics, "Termin im Portal" if t.konto_id else "Termin verwalten")
	if anlass != "erinnerung" and t.mitarbeiter_id:
		m = frappe.db.get_value("Plattform Konto", t.mitarbeiter_id, ["email", "vorname"], as_dict=True)
		if m:
			mails.termin(m.email, m.vorname, f"{betreff} ({t.kontakt_name or 'Kunde'}) – Kalender", text, "/portal/admin/kalender", ics, "Zum Kalender")
	_event_abgleichen(t)


def _event_abgleichen(t):
	"""Optional: Frappe „Event“ (Kern-DocType) für den Desk-Kalender des Mitarbeiters."""
	if not aktiv("event"):
		return
	try:
		user = frappe.db.get_value("Plattform Konto", t.mitarbeiter_id, "user")
		daten = {"subject": f"{TERMIN_ARTEN[t.art][0]}: {t.kontakt_name or ''}"[:140], "starts_on": t.start, "ends_on": t.ende, "event_type": "Private", "status": "Cancelled" if t.status == "storniert" else "Closed" if t.status in ("erledigt", "nicht_erschienen") else "Open", "description": f"Plattform-Termin {t.name}"}
		if t.event and frappe.db.exists("Event", t.event):
			ev = frappe.get_doc("Event", t.event)
			ev.update(daten)
			ev.save(ignore_permissions=True)
		else:
			ev = frappe.get_doc({"doctype": "Event", **daten})
			if user:
				ev.owner = user
			ev.insert(ignore_permissions=True)
			frappe.db.set_value(DT, t.name, "event", ev.name, update_modified=False)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Event nicht abgeglichen", message=t.name)


def mitarbeiter_waehlen(art, start_iso, wunsch=None, ort=None):
	from oekoinvest_app.plattform.backoffice import gebiet_fuer

	kandidaten = [m.konto_id for m in anbieter(art) if slot_frei(start_iso, **slot_param(m.konto_id, art))]
	if wunsch:
		return wunsch if wunsch in kandidaten else None
	if not kandidaten:
		return None
	if art in ("besichtigung", "gemeinde") and (ort or {}).get("land"):
		g = gebiet_fuer(ort.get("land"), ort.get("bundesland"), ort.get("plz"))
		if g and g["gebiet"].mitarbeiter_id in kandidaten:
			return g["gebiet"].mitarbeiter_id
	last = {k: frappe.db.count(DT, {"mitarbeiter_id": k, "status": ["in", TERMIN_AKTIV], "start": [">", now_datetime()]}) for k in kandidaten}
	return sorted(kandidaten, key=lambda k: last[k])[0]


def lokal_tag_von(wert):
	"""Datetime-Feld (Systemzeitzone) → Kalendertag in Europe/Vienna."""
	return lokal_tag(utc_aus_system(wert))


def _sperren(konto_id):
	frappe.db.sql("select name from `tabPlattform Mitarbeiter` where konto_id=%s for update", (konto_id,))


# ================================================================ Buchen


def _kontakt(k):
	k = k if isinstance(k, dict) else {}
	name = v.text(k.get("name") or " ".join(x for x in (k.get("vorname"), k.get("nachname")) if x), 120)
	v.pflicht(len(name) >= 2, "Bitte geben Sie Ihren Namen an.")
	email = v.email(k.get("email"))
	v.pflicht(email, "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	return {"name": name, "email": email, "telefon": v.text(k.get("telefon"), 40), "firma": v.text(k.get("firma"), 120), "plz": v.text(k.get("plz"), 10), "ort": v.text(k.get("ort"), 80), "land": v.auswahl(k.get("land"), ["DE", "AT", "CH"], "")}


@frappe.whitelist(methods=["POST"])
def buchen(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("art"), list(TERMIN_ARTEN), "")
	a = art_pruefen(n, art)
	try:
		start = aus_iso(d.get("start"))
	except (TypeError, ValueError):
		ungueltig("Bitte wählen Sie einen Termin.")
	start_iso = iso(start)  # UTC-ISO wie die Slots
	bo = bo_schreiben(n)
	if not n:
		v.pflicht(v.wahr(d.get("einwilligung")), "Bitte stimmen Sie der Verarbeitung Ihrer Angaben zur Terminvereinbarung zu.")
	konto_id = None
	if n and not bo:
		konto_id = n.id
		k = frappe.db.get_value("Plattform Konto", n.id, ["email", "telefon", "firma"], as_dict=True)
		kd = d.get("kontakt") if isinstance(d.get("kontakt"), dict) else {}
		kontakt = {"name": name_von(n.id), "email": k.email, "telefon": v.text(d.get("telefon"), 40) or k.telefon or "", "firma": k.firma or "", "plz": v.text(kd.get("plz"), 10), "ort": v.text(kd.get("ort"), 80), "land": v.auswahl(kd.get("land"), ["DE", "AT", "CH"], "")}
	elif bo and d.get("fuerKontoId"):
		konto_id = v.kennung(d.get("fuerKontoId"))
		k = frappe.db.get_value("Plattform Konto", konto_id, ["email", "telefon", "firma"], as_dict=True) if konto_id else None
		if not k:
			nicht_gefunden("Konto nicht gefunden.")
		kontakt = {"name": name_von(konto_id), "email": k.email, "telefon": k.telefon or "", "firma": k.firma or ""}
	else:
		kontakt = _kontakt(d.get("kontakt"))
	offen = frappe.db.count(DT, {"kontakt_email": kontakt["email"], "status": ["in", TERMIN_AKTIV], "start": [">", now_datetime()]})
	if not bo and offen >= 3:
		konflikt("Sie haben bereits drei offene Termine. Bitte sagen Sie einen ab oder melden Sie sich über das Portal.")
	wunsch = v.kennung(d.get("mitarbeiterId")) if bo else None
	mid = mitarbeiter_waehlen(art, start_iso, wunsch, {"land": kontakt.get("land"), "bundesland": v.text((d.get("kontakt") or {}).get("bundesland") if isinstance(d.get("kontakt"), dict) else "", 60), "plz": kontakt.get("plz")})
	if not mid:
		konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.")
	_sperren(mid)
	if not slot_frei(start_iso, **slot_param(mid, art)):  # nach der Sperre erneut – verhindert Doppelbuchung paralleler Anfragen
		konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.")
	kanal = a[3] if a[3] == "vor_ort" or not d.get("kanal") else v.auswahl(d.get("kanal"), ["telefon", "video"], a[3])
	token = None if konto_id else secrets.token_urlsafe(32)
	t = frappe.get_doc({
		"doctype": DT, "art": art, "status": "gebucht", "start": system_aus_iso(start_iso), "ende": system_aus_iso(iso(start + timedelta(minutes=a[1]))),
		"kanal": kanal, "ort": v.text(d.get("ort") or " ".join(x for x in (kontakt.get("plz"), kontakt.get("ort")) if x), 160) if a[3] == "vor_ort" else "",
		"mitarbeiter_id": mid, "konto_id": konto_id, "kontakt_name": kontakt["name"], "kontakt_email": kontakt["email"], "kontakt_telefon": kontakt.get("telefon"), "kontakt_firma": kontakt.get("firma"),
		"kontakt_plz": kontakt.get("plz"), "kontakt_ort": kontakt.get("ort"), "kontakt_land": kontakt.get("land"), "notiz": v.mehrzeilig(d.get("notiz"), 1000),
		"bezug_art": v.auswahl(d.get("bezugArt"), ["vorgang", "flaeche", "projekt"], ""), "bezug_id": v.kennung(d.get("bezugId")) or None,
		"herkunft": "backoffice" if bo else "portal" if n else v.auswahl(d.get("herkunft"), ["kontakt", "flaechencheck", "website"], "website"),
		"sequenz": 0, "token_hash": sha256(token) if token else None, "ip": v.text(ip, 64),
	})
	_verlauf(t, f"Gebucht ({t.herkunft}) – zuständig {name_von(mid)}", n)
	t.insert(ignore_permissions=True)
	versenden(t, "neu", token)
	benachrichtigen(mid, "termin", f"Neuer Termin: {a[0]}", f"{zeitraum_text(iso(t.start), iso(t.ende))} · {kontakt['name']}", "/portal/admin/kalender", "termin", t.name, mail=False)
	if konto_id:
		benachrichtigen(konto_id, "termin", f"Termin gebucht: {a[0]}", zeitraum_text(iso(t.start), iso(t.ende)), "/portal/termine", "termin", t.name, mail=False)
	protokoll(n, "termin", "termin", t.name, f"Termin {a[0]} gebucht ({zeitraum_text(iso(t.start), iso(t.ende))})", ip or "")
	return {"termin": ausgabe(n, t), "verwaltenToken": token}


# ================================================================ Lesen


def laden(n, kennung):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Termin nicht gefunden.")
	t = frappe.get_doc(DT, k)
	if not rolle_im(n, t):
		verboten("Dieser Termin gehört nicht zu Ihrem Konto.")
	return t


@frappe.whitelist(methods=["POST"])
def liste(alle=None, von=None, bis=None, mitarbeiterId=None, status=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	filters = {}
	if not (alle and bo_lesen(n)):
		namen = set(frappe.get_all(DT, filters={"konto_id": n.id}, pluck="name", limit_page_length=0)) | set(frappe.get_all(DT, filters={"mitarbeiter_id": n.id}, pluck="name", limit_page_length=0))
		filters["name"] = ["in", list(namen) or ["-"]]
	if mitarbeiterId:
		filters["mitarbeiter_id"] = mitarbeiterId
	if status in TERMIN_STATUS:
		filters["status"] = status
	if tag_gueltig(von) and tag_gueltig(bis):
		filters["start"] = ["between", [add_days(von, -1), add_days(bis, 1)]]
	return [ausgabe(n, t) for t in frappe.get_all(DT, filters=filters, fields=["*"], order_by="start asc", limit_page_length=1000)]


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	return ausgabe(n, laden(n, id))


@frappe.whitelist(methods=["POST"])
def ics(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	return {"ics": ics_von(laden(n, id))}


# ================================================================ Ändern


def aktion_anwenden(n, t, d, als_kunde, token=None):
	a = TERMIN_ARTEN.get(t.art)
	aktion = d.get("aktion")
	kommend = get_datetime(t.start) > now_datetime()
	ziel_link = "/portal/admin/kalender" if als_kunde else "/portal/termine"
	gegenueber = t.mitarbeiter_id if als_kunde else t.konto_id
	if aktion == "stornieren":
		if t.status not in TERMIN_AKTIV:
			konflikt("Der Termin ist nicht mehr aktiv.")
		if als_kunde and not kommend:
			konflikt("Vergangene Termine können nicht abgesagt werden.")
		t.status = "storniert"
		t.sequenz = cint(t.sequenz) + 1
		_verlauf(t, f"Abgesagt{': ' + v.text(d.get('grund'), 200) if d.get('grund') else ''}", n)
		t.save(ignore_permissions=True)
		versenden(t, "storniert", token)
		if gegenueber:
			benachrichtigen(gegenueber, "termin", f"Termin abgesagt: {a[0]}", zeitraum_text(iso(t.start), iso(t.ende)), ziel_link, "termin", t.name, mail=False)
		return
	if aktion == "umbuchen":
		if t.status not in TERMIN_AKTIV or not kommend:
			konflikt("Nur künftige, aktive Termine können verschoben werden.")
		try:
			neu = iso(aus_iso(d.get("start")))
		except (TypeError, ValueError):
			ungueltig("Bitte wählen Sie einen neuen Termin.")
		ziel = t.mitarbeiter_id if slot_frei(neu, **slot_param(t.mitarbeiter_id, t.art, ohne=t.name)) else mitarbeiter_waehlen(t.art, neu)
		if not ziel:
			konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.")
		_sperren(ziel)
		if not slot_frei(neu, **slot_param(ziel, t.art, ohne=t.name)):
			konflikt("Dieser Zeitpunkt ist nicht (mehr) frei. Bitte wählen Sie einen anderen Termin.")
		alt = zeitraum_text(iso(t.start), iso(t.ende))
		t.start = system_aus_iso(neu)
		t.ende = system_aus_iso(iso(aus_iso(neu) + timedelta(minutes=a[1])))
		t.mitarbeiter_id, t.status, t.erinnert_am = ziel, "gebucht", None
		t.sequenz = cint(t.sequenz) + 1
		_verlauf(t, f"Verschoben von {alt} auf {zeitraum_text(iso(t.start), iso(t.ende))}", n)
		t.save(ignore_permissions=True)
		versenden(t, "umgebucht", token)
		if gegenueber:
			benachrichtigen(gegenueber if not als_kunde else t.mitarbeiter_id, "termin", f"Termin verschoben: {a[0]}", zeitraum_text(iso(t.start), iso(t.ende)), ziel_link, "termin", t.name, mail=False)
		return
	if als_kunde:
		verboten("Diese Änderung kann nur das Backoffice vornehmen.")
	if aktion == "bestaetigen":
		if t.status != "gebucht":
			konflikt("Nur gebuchte Termine können bestätigt werden.")
		t.status = "bestaetigt"
		_verlauf(t, "Bestätigt", n)
		t.save(ignore_permissions=True)
		versenden(t, "bestaetigt")
		return
	if aktion in ("erledigt", "nicht_erschienen"):
		if t.status not in TERMIN_AKTIV:
			konflikt("Der Termin ist nicht mehr aktiv.")
		t.status = aktion
		_verlauf(t, TERMIN_STATUS[aktion], n)
		t.save(ignore_permissions=True)
		_event_abgleichen(t)
		return
	if aktion == "zuweisen":
		z = v.kennung(d.get("mitarbeiterId"))
		v.pflicht(z and z in aktive_admins(), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
		_sperren(z)
		if not slot_frei(iso(t.start), **slot_param(z, t.art, ohne=t.name, vorlauf=False)):
			konflikt(f"{name_von(z)} ist zu diesem Zeitpunkt nicht verfügbar.")
		t.mitarbeiter_id = z
		t.sequenz = cint(t.sequenz) + 1
		_verlauf(t, f"Zugewiesen an {name_von(z)}", n)
		t.save(ignore_permissions=True)
		versenden(t, "vertretung")
		benachrichtigen(z, "termin", f"Termin übernommen: {a[0]}", zeitraum_text(iso(t.start), iso(t.ende)), "/portal/admin/kalender", "termin", t.name, mail=False)
		return
	ungueltig("Unbekannte Aktion.")


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	t = laden(n, id)
	d = aus_json(daten, {}) or {}
	bo = bo_schreiben(n)
	als_kunde = not bo and t.konto_id == n.id
	if not bo and not als_kunde:
		verboten("Diesen Termin können Sie nicht ändern.")
	aktion_anwenden(n, t, d, als_kunde)
	protokoll(n, "termin", "termin", t.name, f"Termin {d.get('aktion')}")
	return ausgabe(n, t)


def _per_token(token):
	token = str(token or "")
	name = frappe.db.get_value(DT, {"token_hash": sha256(token)}, "name") if len(token) >= 32 else None
	if not name:
		nicht_gefunden("Der Link ist ungültig oder der Termin existiert nicht mehr.")
	return frappe.get_doc(DT, name)


@frappe.whitelist(methods=["POST"])
def per_token(token=None):
	nutzer(None, pflicht=False)  # nur API-Benutzer der Website
	return ausgabe(None, _per_token(token))


@frappe.whitelist(methods=["POST"])
def per_token_aendern(token=None, daten=None):
	nutzer(None, pflicht=False)
	d = aus_json(daten, {}) or {}
	v.pflicht(d.get("aktion") in ("umbuchen", "stornieren"), "Unbekannte Aktion.")
	t = _per_token(token)
	aktion_anwenden(None, t, d, True, token=str(token))
	protokoll(None, "termin", "termin", t.name, f"Termin {d.get('aktion')} (Link aus E-Mail)")
	return ausgabe(None, t)


# ================================================================ Verfügbarkeiten


@frappe.whitelist(methods=["POST"])
def verfuegbarkeiten(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not bo_lesen(n):
		verboten("Nur für das Backoffice.")
	from oekoinvest_app.plattform.hr.hrms import feiertage

	heute = heute_tag()
	out = []
	for kid in aktive_admins():
		m = _mitarbeiter(kid)
		out.append({
			"id": kid, "name": name_von(kid), "email": frappe.db.get_value("Plattform Konto", kid, "email"),
			"arbeitszeiten": aus_json(m.arbeitszeiten_json, {}) if m else {}, "terminarten": aus_json(m.terminarten_json, []) if m else [], "aktiv": bool(m and cint(m.aktiv) and cint(m.termine_aktiv)),
			"abwesenheiten": [{"id": a.name, "von": str(a.von), "bis": str(a.bis), "art": a.art, "vertretung": {"id": a.vertretung_id, "name": name_von(a.vertretung_id)} if a.vertretung_id else None}
			                  for a in frappe.get_all("Plattform Abwesenheit", filters={"mitarbeiter_id": kid, "status": "genehmigt", "bis": [">=", heute]}, fields=["name", "von", "bis", "art", "vertretung_id"], order_by="von asc")],
		})
	return {"mitarbeiter": out, "feiertage": feiertage(None, heute, add_days(heute, 120))[:20], "darfBearbeiten": bo_schreiben(n)}


@frappe.whitelist(methods=["POST"])
def verfuegbarkeit_speichern(kontoId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Termine & Kalender“ kein Schreiben.")
	kid = v.kennung(kontoId)
	v.pflicht(kid and kid in aktive_admins(), "Verfügbarkeiten gibt es nur für Backoffice-Konten.")
	d = aus_json(daten, {}) or {}
	name = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": kid}, "name")
	m = frappe.get_doc("Plattform Mitarbeiter", name) if name else frappe.get_doc({"doctype": "Plattform Mitarbeiter", "konto_id": kid, "aktiv": 1, "termine_aktiv": 1})
	if d.get("arbeitszeiten") is not None:
		m.arbeitszeiten_json = als_json(arbeitszeiten_bereinigen(d.get("arbeitszeiten")))
	if d.get("terminarten") is not None:
		m.terminarten_json = als_json(v.mehrfach(d.get("terminarten"), list(TERMIN_ARTEN)))
	if d.get("aktiv") is not None:
		m.termine_aktiv = 1 if d.get("aktiv") else 0
	m.save(ignore_permissions=True) if name else m.insert(ignore_permissions=True)
	protokoll(n, "termin", "verfuegbarkeit", kid, f"Verfügbarkeit von {name_von(kid)} gespeichert")
	return {"arbeitszeiten": aus_json(m.arbeitszeiten_json, {}), "terminarten": aus_json(m.terminarten_json, []), "aktiv": bool(cint(m.termine_aktiv))}


# ================================================================ Scheduler (hooks.py, stündlich)


def erinnerungen_senden():
	"""Termine in den nächsten 24 Stunden erinnern (einmal je Termin)."""
	jetzt = now_datetime()
	for t in frappe.get_all(DT, filters={"status": ["in", TERMIN_AKTIV], "erinnert_am": ["is", "not set"], "start": ["between", [jetzt, jetzt + timedelta(hours=GRENZEN["erinnerung_stunden"])]]}, pluck="name", limit_page_length=500):
		doc = frappe.get_doc(DT, t)
		doc.erinnert_am = jetzt
		doc.save(ignore_permissions=True)
		versenden(doc, "erinnerung")
		if doc.konto_id:
			benachrichtigen(doc.konto_id, "termin", f"Erinnerung: {TERMIN_ARTEN[doc.art][0]}", zeitraum_text(iso(doc.start), iso(doc.ende)), "/portal/termine", "termin", doc.name, mail=False)
	frappe.db.commit()

