# Copyright (c) 2026, ÖkoInvest GmbH
#
# Querschnitt (Team 10) – whitelisted Methoden, Vertrag wie backend/demo/querschnitt.js (docs/API.md, Abschnitt „Querschnitt“):
#  - dokument_versionen / dokument_neue_version / dokument_freigeben: Versionskette und Prüfstatus je Dokument
#  - protokoll_suche: Revisionsprotokoll durchsuchen (Text, Aktion, Objekt, Nutzer, Zeitraum), Treffer für CSV
#  - mail_rhythmus / mail_rhythmus_speichern: E-Mail sofort oder als Tages-Digest
#  - digest_lauf: manueller Lauf (nur Leitung); täglicher Lauf per Scheduler → digest_taeglich (hooks.py)
# Rolle UND Eigentum werden hier geprüft; die Website ist nur die erste Verteidigungslinie.

import frappe
from frappe.utils import cint, get_datetime, now_datetime

from oekoinvest_app.plattform import querschnitt_kern as qk
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import dokument_meta
from oekoinvest_app.plattform.kern import ist_admin, jetzt, name_von, nachricht_anlegen, nicht_gefunden, nutzer, protokoll, verboten
from oekoinvest_app.plattform.konstanten import BENACHRICHTIGUNG_ARTEN
from oekoinvest_app.plattform.rechte import recht_noetig

BEREICH_FUER_BEZUG = {"vorgang": "vorgaenge", "flaeche": "flaechen", "projekt": "projekte", "interesse": "interessen"}


def _dokument(k):
	k = v.kennung(k)
	if not k or not frappe.db.exists("Plattform Dokument", k):
		nicht_gefunden("Dokument nicht gefunden.")
	return frappe.get_doc("Plattform Dokument", k)


def _kette(d):
	liste, gesehen, x = [], set(), d
	while x and x.name not in gesehen:
		gesehen.add(x.name)
		liste.insert(0, x)
		x = frappe.get_doc("Plattform Dokument", x.vorgaenger) if x.get("vorgaenger") and frappe.db.exists("Plattform Dokument", x.vorgaenger) else None
	x = frappe.get_doc("Plattform Dokument", d.ersetzt_durch) if d.get("ersetzt_durch") and frappe.db.exists("Plattform Dokument", d.ersetzt_durch) else None
	while x and x.name not in gesehen:
		gesehen.add(x.name)
		liste.append(x)
		x = frappe.get_doc("Plattform Dokument", x.ersetzt_durch) if x.get("ersetzt_durch") and frappe.db.exists("Plattform Dokument", x.ersetzt_durch) else None
	return liste


# ================================================================ Dokumente


@frappe.whitelist(methods=["POST"])
def dokument_versionen(id=None, als_benutzer=None):  # noqa: A002
	from oekoinvest_app.plattform.api.dokument import darf_dokument

	n = nutzer(als_benutzer)
	d = _dokument(id)
	if not darf_dokument(n, d):
		verboten()
	return [{**dokument_meta(x), "vonName": name_von(x.hochgeladen_von) or ""} for x in _kette(d) if darf_dokument(n, x)]


@frappe.whitelist(methods=["POST"])
def dokument_neue_version(id=None, name=None, mime=None, inhaltBase64=None, als_benutzer=None):  # noqa: A002
	from oekoinvest_app.plattform.api.dokument import darf_dokument, speichern

	n = nutzer(als_benutzer)
	alt = _dokument(id)
	if not darf_dokument(n, alt):
		verboten()
	if alt.kategorie == "datenraum":
		frappe.throw("Datenraum-Unterlagen bitte im Deal-Room aktualisieren (Freigabestufen je Unterlage).", frappe.ValidationError)
	if alt.get("ersetzt_durch"):
		frappe.throw("Es gibt bereits eine neuere Version – bitte diese ersetzen.", frappe.DuplicateEntryError)
	# Schreibrecht am Bezug prüft speichern() (darf_bezug schreiben=True); stumm = ohne „Dokument hochgeladen“
	meta = speichern(bezugArt=alt.bezug_art, bezugId=alt.bezug_id, name=name or alt.dateiname, mime=mime, kategorie=alt.kategorie, inhaltBase64=inhaltBase64, checkliste=alt.get("checkliste"), stumm=True, als_benutzer=als_benutzer)
	neu = frappe.get_doc("Plattform Dokument", meta["id"])
	neu.db_set({"version": (cint(alt.get("version")) or 1) + 1, "vorgaenger": alt.name}, update_modified=False)
	alt.db_set("ersetzt_durch", neu.name, update_modified=False)
	als_admin = ist_admin(n) and alt.hochgeladen_von != n.id and alt.bezug_art != "nutzer"
	nachricht_anlegen(
		alt.bezug_art, alt.bezug_id, von_id=n.id, von_admin=als_admin, system=True,
		text=f"Neue Version {cint(neu.version)} hochgeladen: {neu.dateiname}",
		gelesen_nutzer=None if als_admin else True, gelesen_admin=None if als_admin else False, ereignis="nachricht",
	)
	protokoll(n, "version", alt.bezug_art, alt.bezug_id, f"Dokument {neu.dateiname}: Version {cint(neu.version)} ersetzt {alt.name}")
	return dokument_meta(frappe.get_doc("Plattform Dokument", neu.name))


@frappe.whitelist(methods=["POST"])
def dokument_freigeben(id=None, status=None, kommentar=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur das Backoffice gibt Dokumente frei.")
	st = v.auswahl(status, list(qk.DOKUMENT_FREIGABE), "")
	v.pflicht(st, "Bitte einen gültigen Status wählen.")
	text = v.mehrzeilig(kommentar, 1000)
	if st == "abgelehnt":
		v.pflicht(len(text) >= 5, "Bitte begründen Sie, was nachgebessert werden muss.")
	d = _dokument(id)
	recht_noetig(n, BEREICH_FUER_BEZUG.get(d.bezug_art, "vorgaenge"), 2)
	d.db_set({"freigabe_status": st, "freigabe_von": n.id, "freigabe_am": jetzt(), "freigabe_kommentar": text}, update_modified=False)
	protokoll(n, "freigabe", d.bezug_art, d.bezug_id, f"Dokument {d.dateiname}: {qk.DOKUMENT_FREIGABE[st]}")
	if d.hochgeladen_von and d.hochgeladen_von != n.id:
		rollen = frappe.get_all("Plattform Konto Rolle", filters={"parent": d.hochgeladen_von, "parenttype": "Plattform Konto"}, pluck="rolle")
		if "admin" not in rollen:
			from oekoinvest_app.plattform.benachrichtigung import anlegen

			anlegen(d.hochgeladen_von, "nachricht", f"Dokument {qk.DOKUMENT_FREIGABE[st].lower()}: {d.dateiname}", text or qk.DOKUMENT_FREIGABE_TEXT[st], "/portal/dokumente", d.bezug_art, d.bezug_id)
	return dokument_meta(frappe.get_doc("Plattform Dokument", d.name))


# ================================================================ Revisionsprotokoll


@frappe.whitelist(methods=["POST"])
def protokoll_suche(filter=None, als_benutzer=None):  # noqa: A002
	"""Datenbankseitige Vorauswahl (Aktion, Objektart, Zeitraum, Nutzer-ID), Freitext/Name wie querschnitt_kern."""
	n = nutzer(als_benutzer)
	recht_noetig(n, "protokoll", 1)
	f = qk.protokoll_filter_bereinigen(filter if isinstance(filter, dict) else {})
	filters = {}
	if f["aktion"]:
		filters["aktion"] = f["aktion"]
	if f["objektArt"]:
		filters["objekt_art"] = f["objektArt"]
	if f["von"] and f["bis"]:
		filters["am"] = ["between", [f"{f['von']} 00:00:00", f"{f['bis']} 23:59:59"]]
	elif f["von"]:
		filters["am"] = [">=", f"{f['von']} 00:00:00"]
	elif f["bis"]:
		filters["am"] = ["<=", f"{f['bis']} 23:59:59"]
	zeilen = frappe.get_all(
		"Plattform Aktivitaet", filters=filters,
		fields=["name", "am", "nutzer_id", "aktion", "objekt_art", "objekt_id", "text", "ip", "prev_hash", "entry_hash", "nachgesiegelt"],
		order_by="am desc", limit_page_length=20000,
	)
	namen = {}

	def name(k):
		if not k:
			return "Gast/System"
		if k not in namen:
			namen[k] = name_von(k) or k
		return namen[k]

	from oekoinvest_app.plattform.kern import iso

	eintraege = [
		{"id": z.name, "am": iso(z.am), "aktion": z.aktion, "objektArt": z.objekt_art, "objektId": z.objekt_id, "text": z.text, "nutzerId": z.nutzer_id, "nutzer": name(z.nutzer_id), "ip": z.ip or "", "prevHash": z.prev_hash or "", "hash": z.entry_hash or "", "nachgesiegelt": bool(cint(z.nachgesiegelt))}
		for z in zeilen
	]
	return qk.protokoll_filtern(eintraege, f)


# ================================================================ E-Mail-Rhythmus & Tages-Digest


@frappe.whitelist(methods=["POST"])
def mail_rhythmus(als_benutzer=None):
	n = nutzer(als_benutzer)
	k = frappe.db.get_value("Plattform Konto", n.id, ["mail_rhythmus", "digest_zuletzt"], as_dict=True) or {}
	from oekoinvest_app.plattform.kern import iso

	return {
		"rhythmus": k.get("mail_rhythmus") if k.get("mail_rhythmus") in qk.MAIL_RHYTHMEN else "sofort",
		"digestZuletzt": iso(k.get("digest_zuletzt")),
		"vorgemerkt": frappe.db.count("Plattform Benachrichtigung", {"nutzer_id": n.id, "digest_offen": 1}),
	}


@frappe.whitelist(methods=["POST"])
def mail_rhythmus_speichern(rhythmus=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	r = v.auswahl(rhythmus, list(qk.MAIL_RHYTHMEN), "")
	v.pflicht(r, "Bitte „sofort“ oder „Tages-Digest“ wählen.")
	werte = {"mail_rhythmus": r}
	if r == "taeglich" and not frappe.db.get_value("Plattform Konto", n.id, "digest_zuletzt"):
		werte["digest_zuletzt"] = jetzt()  # erster Digest frühestens nach 24 h
	frappe.db.set_value("Plattform Konto", n.id, werte, update_modified=False)
	protokoll(n, "einstellungen", "nutzer", n.id, f"E-Mail-Rhythmus: {r}")
	return {"rhythmus": r}


def _lauf(erzwingen=False):
	from oekoinvest_app.plattform import mail as plattform_mail
	from oekoinvest_app.plattform.benachrichtigung import einstellungen
	from oekoinvest_app.plattform.organisation import mail_kanal_aktiv

	labels = {k: w[0] for k, w in BENACHRICHTIGUNG_ARTEN.items()}
	konten = frappe.get_all("Plattform Konto", filters={"aktiv": 1, "mail_rhythmus": "taeglich"}, fields=["name", "email", "vorname", "mail_einstellungen", "komfort", "digest_zuletzt"], limit_page_length=0)
	mails = 0
	for k in konten:
		stunden = None if not k.digest_zuletzt else (now_datetime() - get_datetime(k.digest_zuletzt)).total_seconds() / 3600
		if not qk.digest_faellig("taeglich", stunden, erzwingen):
			continue
		offen = frappe.get_all("Plattform Benachrichtigung", filters={"nutzer_id": k.name, "digest_offen": 1}, fields=["name", "art"], limit_page_length=0)
		if not offen:
			continue
		ein = einstellungen(k)
		relevant = [b for b in offen if ein.get(b.art) and b.art not in qk.DIGEST_AUSNAHMEN]
		for b in offen:
			frappe.db.set_value("Plattform Benachrichtigung", b.name, "digest_offen", 0, update_modified=False)
		frappe.db.set_value("Plattform Konto", k.name, "digest_zuletzt", jetzt(), update_modified=False)
		if not relevant or not mail_kanal_aktiv(k.get("komfort")):
			continue
		t = qk.digest_text(relevant, labels)
		if plattform_mail.benachrichtigung(k, t["betreff"], "", t["text"], "/portal/benachrichtigungen"):
			for b in relevant:
				frappe.db.set_value("Plattform Benachrichtigung", b.name, "mail", 1, update_modified=False)
			mails += 1
	return {"konten": len(konten), "mails": mails}


@frappe.whitelist(methods=["POST"])
def digest_lauf(erzwingen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "rechte", 2)  # nur Leitung
	r = _lauf(v.wahr(erzwingen))
	protokoll(n, "digest", "system", "digest", f"Tages-Digest manuell: {r['mails']} E-Mail(s)")
	return r


def digest_taeglich():
	"""Scheduler (hooks.py, täglich): Tages-Digest an alle Konten mit Rhythmus „täglich“."""
	try:
		_lauf(False)
		frappe.db.commit()
	except Exception:
		frappe.log_error(title="ÖkoInvest: Tages-Digest fehlgeschlagen")
