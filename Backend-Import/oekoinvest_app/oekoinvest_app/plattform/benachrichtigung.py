# Copyright (c) 2026, ÖkoInvest GmbH
#
# Benachrichtigungen (Glocke im Portal) – Port von benachrichtigen/nachrichtMelden aus
# src/lib/plattform/backend/demo.js:
#  - jede neue Nachricht meldet die Seite, die sie noch nicht gelesen hat:
#      Eigentümer (gelesen_nutzer = 0) bzw. Backoffice (gelesen_admin = 0 → zuständiges Admin-Konto, sonst alle)
#  - Art: status (Systemnachricht „Status: …“), nda (Statuswechsel an Interessen), nachricht (sonst)
#  - neue Anfragen → alle aktiven Backoffice-Konten (Art anfrage), Aufgaben → Zuständiger (Art aufgabe)
#  - Suchprofil-Treffer → Investor (Art suchprofil, siehe ablauf.investoren_benachrichtigen)
#  - E-Mail nur, wenn das Konto die Art nicht abbestellt hat (mail_einstellungen); ohne Inhalte, nur Hinweis + Link

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, jetzt
from oekoinvest_app.plattform.konstanten import BENACHRICHTIGUNG_ARTEN, DOCTYPE, mail_einstellungen_standard

MAIL_VORLAGEN = {
	"status": ("Neuigkeiten zu Ihrem Vorgang – ÖkoInvest", "Der Status eines Ihrer Vorgänge hat sich geändert. Details finden Sie im Portal."),
	"nachricht": ("Neue Nachricht im Portal – ÖkoInvest", "Sie haben eine neue Nachricht im Portal von ÖkoInvest erhalten."),
	"nda": ("Neuigkeiten zu Ihrem Projektinteresse – ÖkoInvest", "Zu einem Projekt, für das Sie sich interessieren, gibt es Neuigkeiten (z. B. die Freigabe des Datenraums). Details finden Sie im Portal."),
	"suchprofil": ("Neues Projekt passend zu Ihrem Suchprofil – ÖkoInvest", "In der Projektbörse wurde ein Projekt veröffentlicht, das zu Ihrem Suchprofil passt."),
	"anfrage": ("Neue Anfrage über die Website – ÖkoInvest", "Über die Website ist eine neue Anfrage eingegangen."),
	"aufgabe": ("Aufgabe im Backoffice – ÖkoInvest", "Ihnen wurde eine Aufgabe zugewiesen bzw. eine Wiedervorlage ist fällig."),
	# Sicherheitsmeldungen versendet plattform/sicherheit.melden() immer selbst (Vorlage oekoinvest_sicherheit)
	# Anlagen & Monitoring (Texte ohne Inhalte, Details im Portal)
	"stoerung": ("Störung an einer Anlage – ÖkoInvest", "An einer Anlage wurde eine Störung erkannt oder behoben. Details finden Sie im Portal."),
	# Projektentwicklung (Fortschritt, Fristen, Gutachten-Aufträge) – ohne Inhalte
	"entwicklung": ("Neuigkeiten aus der Projektentwicklung – ÖkoInvest", "Zu einem Projekt, an dem Sie beteiligt sind, gibt es Neuigkeiten. Details finden Sie im Portal unter „Projektentwicklung“."),
	# Energiebeschaffung (Fristen, Angebotsvergleich zur Freigabe, Angebotsanfragen, Zuschläge) – ohne Inhalte
	"energie": ("Neuigkeiten zu Ihrer Energiebeschaffung – ÖkoInvest", "Zu Ihrer Energiebeschaffung bzw. einer Angebotsanfrage gibt es Neuigkeiten. Details finden Sie im Portal."),
	"sicherheit": ("Hinweis zur Sicherheit Ihres Kontos – ÖkoInvest", "Es gibt einen Hinweis zur Sicherheit Ihres Kontos. Details finden Sie im Portal unter „Sicherheit“."),
	# Dokumente, Signatur, Termine, Service & HR – ohne Inhalte
	"signatur": ("Elektronische Unterschrift – ÖkoInvest", "Im Portal von ÖkoInvest gibt es Neuigkeiten zu einem Dokument zur elektronischen Unterschrift."),
	"termin": ("Ihr Termin – ÖkoInvest", "Im Portal von ÖkoInvest gibt es Neuigkeiten zu einem Termin."),
	"ticket": ("Ihre Support-Anfrage – ÖkoInvest", "Im Portal von ÖkoInvest gibt es Neuigkeiten zu Ihrer Support-Anfrage."),
}


def portal_link(link):
	link = str(link or "")
	return link[:300] if link.startswith("/portal") and not link.startswith("//") else "/portal"


def einstellungen(konto):
	"""E-Mail-Einstellungen eines Kontos (Standard + gespeicherte Abweichungen)."""
	gespeichert = aus_json(konto.get("mail_einstellungen") if konto else None, {}) or {}
	return {**mail_einstellungen_standard(), **{k: bool(w) for k, w in gespeichert.items() if k in BENACHRICHTIGUNG_ARTEN}}


def anlegen(konto_id, art, titel, text="", link="/portal", objekt_art=None, objekt_id=None, mail=True, mail_text=None, mail_betreff=None):
	"""Benachrichtigung für ein Konto; E-Mail je nach Einstellung. Liefert das Dokument oder None."""
	if art not in BENACHRICHTIGUNG_ARTEN or not konto_id:
		return None
	konto = frappe.db.get_value("Plattform Konto", konto_id, ["name", "email", "vorname", "aktiv", "mail_einstellungen", "komfort"], as_dict=True)
	if not konto or not cint(konto.aktiv):
		return None
	from oekoinvest_app.plattform.organisation import mail_kanal_aktiv

	if not mail_kanal_aktiv(konto.get("komfort")):  # Kanal E-Mail global abschaltbar (Konto-Komfort)
		mail = False
	doc = frappe.get_doc(
		{
			"doctype": "Plattform Benachrichtigung",
			"nutzer_id": konto.name,
			"art": art,
			"titel": v.text(titel, 160),
			"text": v.text(text, 300),
			"link": portal_link(link),
			"objekt_art": v.text(objekt_art, 40) or None,
			"objekt_id": v.text(objekt_id, 60) or None,
			"am": jetzt(),
			"gelesen": 0,
			"mail": 0,
		}
	).insert(ignore_permissions=True)
	if mail and einstellungen(konto).get(art):
		from oekoinvest_app.plattform import mail as plattform_mail

		betreff, standard_text = MAIL_VORLAGEN[art]
		if plattform_mail.benachrichtigung(konto, mail_betreff or betreff, doc.titel if art in ("suchprofil", "aufgabe") else "", mail_text or standard_text, doc.link):
			frappe.db.set_value("Plattform Benachrichtigung", doc.name, "mail", 1, update_modified=False)
	return doc


def aktive_admins():
	namen = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"))
	return [k for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name") if k in namen]


def _info(art, bezug_id, konto_id, als_admin, o):
	from oekoinvest_app.plattform.ausgabe import thread_info

	rollen = ["admin"] if als_admin else []
	return thread_info(art, bezug_id, frappe._dict(id=konto_id, rollen=rollen), o) or {}


def aus_nachricht(m, ereignis=None, mail=True):
	"""Aus einer neuen Plattform Nachricht die Benachrichtigungen ableiten (Eigentümer bzw. Backoffice)."""
	try:
		dt = DOCTYPE.get(m.bezug_art)
		if not dt or not frappe.db.exists(dt, m.bezug_id):
			return
		o = frappe.get_doc(dt, m.bezug_id)
		from oekoinvest_app.plattform.kern import besitzer, name_von

		text = (m.text or "").strip()
		status_text = cint(m.system) and text.startswith("Status:")
		art = ereignis or (("nda" if m.bezug_art == "interesse" else "status") if status_text else "nachricht")
		kurz_text = " ".join(text.split())[:200]
		eigentuemer = besitzer(m.bezug_art, o)
		if not cint(m.gelesen_nutzer) and eigentuemer and eigentuemer != m.von_id:
			info = _info(m.bezug_art, m.bezug_id, eigentuemer, False, o)
			von = "ÖkoInvest Backoffice" if cint(m.von_admin) else (name_von(m.von_id) or "System")
			anlegen(eigentuemer, art, info.get("titel"), kurz_text if status_text else f"{von}: {kurz_text}", info.get("link"), m.bezug_art, m.bezug_id, mail=mail)
		if not cint(m.gelesen_admin):
			z = o.get("zustaendig_id")
			admins = aktive_admins()
			empfaenger = [z] if z and z in admins else admins
			for a in empfaenger:
				if a in (m.von_id, eigentuemer):
					continue
				info = _info(m.bezug_art, m.bezug_id, a, True, o)
				anlegen(a, "status" if art == "nda" else art, info.get("titel"), f"{name_von(m.von_id) or info.get('gegenueber') or 'Nutzer'}: {kurz_text}", info.get("link"), m.bezug_art, m.bezug_id, mail=mail)
	except Exception:
		# Benachrichtigungen dürfen den fachlichen Vorgang nie abbrechen
		frappe.log_error(title="ÖkoInvest: Benachrichtigung fehlgeschlagen", message=f"Nachricht {m.name}")


def neue_anfrage(vorgang, kontakt):
	"""Neue Anfrage → alle aktiven Backoffice-Konten; ohne Backoffice-Konto an plattform_backoffice_email."""
	admins = aktive_admins()
	if not admins:
		from oekoinvest_app.plattform import mail as plattform_mail

		plattform_mail.neue_anfrage(vorgang)
		return
	from oekoinvest_app.plattform.konstanten import VORGANG_TYPEN

	k = kontakt or {}
	text = f"{k.get('vorname', '')} {k.get('nachname', '')}".strip() + (f" · {k.get('firma')}" if k.get("firma") else "") + f" · {vorgang.name}"
	for a in admins:
		anlegen(a, "anfrage", f"Neue Anfrage: {VORGANG_TYPEN.get(vorgang.typ, vorgang.typ)}", text, f"/portal/admin/vorgaenge/{vorgang.name}", "vorgang", vorgang.name)


def fuer_objekt_gelesen(konto_id, objekt_art, objekt_id):
	"""Beim Lesen eines Threads zugehörige Benachrichtigungen (status, nachricht, nda) als gelesen markieren."""
	frappe.db.sql(
		"""update `tabPlattform Benachrichtigung` set gelesen = 1
		where nutzer_id = %(k)s and gelesen = 0 and objekt_art = %(a)s and objekt_id = %(o)s and art in ('status', 'nachricht', 'nda')""",
		{"k": konto_id, "a": objekt_art, "o": objekt_id},
	)


def arten_fuer(rollen):
	"""Ereignisarten, die ein Konto sieht/einstellen kann (wie benachrichtigungArtenFuer)."""
	admin = "admin" in (rollen or [])
	out = []
	from oekoinvest_app.plattform.konstanten import BENACHRICHTIGUNG_FEST

	for k, (_, _, nur_admin, fuer_rollen) in BENACHRICHTIGUNG_ARTEN.items():
		if k in BENACHRICHTIGUNG_FEST:  # immer per E-Mail, nicht einstellbar
			continue
		if nur_admin and not admin:
			continue
		if fuer_rollen and not admin and not any(r in (rollen or []) for r in fuer_rollen):
			continue
		out.append(k)
	return out

