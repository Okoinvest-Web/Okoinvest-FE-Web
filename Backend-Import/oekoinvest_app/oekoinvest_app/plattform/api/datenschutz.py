# Copyright (c) 2026, ÖkoInvest GmbH
#
# Compliance – Datenschutz & Geldwäsche (Team 8) – Referenz: src/lib/plattform/backend/demo/datenschutz.js, Logik: compliance_kern.py.
# Betroffenenanfragen Art. 15–21 DSGVO (Frist, Verlängerung, Export, Anonymisierung bei Löschersuchen), interne Verdachtsfälle
# (KEIN Versand an Behörden), VVT-Export, SLA der KYC-Warteschlange.
#
# Rechte (jede Methode selbst, rechte.py):
#   Anfragen   lesen „compliance“ ≥ 1 (Leitung, Compliance), schreiben = 2 (Compliance)
#   Verdacht   nur „compliance“ = 2 (Need-to-know; auch Leitung nicht); intern melden (verdacht_melden) jedes Backoffice-Konto

import frappe
from frappe.utils import now_datetime

from oekoinvest_app.plattform import compliance_kern as C
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

DS = "Plattform Datenschutzanfrage"
GW = "Plattform Verdachtsfall"


def _lesen(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "compliance") >= 1):
		verboten("Nur für Compliance und Leitung.")


def _schreiben(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "compliance") >= 2):
		verboten("Nur für die Backoffice-Rolle „Compliance“.")


def _aufgabe(titel, beschreibung, faellig, zustaendig):
	if zustaendig:
		frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(beschreibung, 2000), "faellig_am": faellig, "zustaendig_id": zustaendig, "status": "offen"}).insert(ignore_permissions=True)


def _compliance_konten():
	aus = []
	for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, fields=["name", "backoffice_rollen"], limit_page_length=0):
		if "compliance" in [x.strip() for x in str(k.backoffice_rollen or "").split(",")]:
			aus.append(k.name)
	return aus


def _neu(doctype, felder):
	return frappe.get_doc({"doctype": doctype, **felder})  # Kennung vergibt WerkzeugDokument.autoname


# ================================================================ Betroffenenanfragen


def _anfrage(doc):
	d = aus_json(doc.daten, {}) or {}
	return {"id": doc.name, "art": doc.art, "land": doc.land or "AT", "kanal": doc.kanal, "eingangAm": str(doc.eingang_am), "status": doc.status, "name": doc.name_betroffener, "email": doc.email or "",
		"kontoId": doc.konto_id, "vorgangId": doc.vorgang_id, "zustaendigId": doc.zustaendig_id, "beschreibung": doc.beschreibung or "", "erledigtAm": iso(doc.erledigt_am) if doc.erledigt_am else None, **d}


def _ausgabe(a, heute):
	f = C.ds_frist_status(a, heute)
	konto = None
	if a.get("kontoId") and frappe.db.exists("Plattform Konto", a["kontoId"]):
		k = frappe.db.get_value("Plattform Konto", a["kontoId"], ["name", "email", "geloescht_am"], as_dict=True)
		konto = {"id": k.name, "email": k.email, "name": name_von(k.name), "geloescht": bool(k.geloescht_am)}
	return {**a, "artLabel": C.DS_ARTEN[a["art"]]["label"], "norm": C.DS_ARTEN[a["art"]]["norm"], "statusLabel": C.DS_STATUS.get(a["status"]), "statusTon": C.DS_TON.get(a["status"]),
		"frist": f["frist"], "restTage": f["restTage"], "ampel": f["ampel"], "ueberfaellig": f["ueberfaellig"], "konto": konto, "zustaendig": name_von(a["zustaendigId"]) if a.get("zustaendigId") else "",
		"antwortEntwurf": C.ds_antwort_entwurf(a, f["frist"]), "exportVerfuegbar": bool(C.DS_ARTEN[a["art"]].get("export")) and bool(a.get("kontoId")),
		"verlauf": a.get("verlauf") or [], "identitaet": a.get("identitaet"), "exportAm": a.get("exportAm"), "exportSha": a.get("exportSha") or ""}


@frappe.whitelist(methods=["POST"])
def uebersicht(status="offen", als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	heute = L.heute()
	alle = [_ausgabe(_anfrage(frappe.get_doc(DS, x)), heute) for x in frappe.get_all(DS, pluck="name", order_by="eingang_am desc", limit_page_length=1000)]
	liste = [a for a in alle if status == "alle" or (a["status"] in C.DS_OFFEN if status == "offen" else a["status"] == status)]
	liste.sort(key=lambda a: str(a["frist"]))
	grenze = iso(now_datetime().replace(year=now_datetime().year - 1))
	vvt = C.vvt()
	return {
		"heute": heute, "darfSchreiben": stufe(n, "compliance") >= 2,
		"kennzahlen": {"offen": len([a for a in alle if a["status"] in C.DS_OFFEN]), "faellig7": len([a for a in alle if a["ampel"] == "gelb"]), "ueberfaellig": len([a for a in alle if a["ueberfaellig"]]),
			"erledigt12m": len([a for a in alle if a["status"] == "erledigt" and str(a.get("erledigtAm") or "") >= grenze])},
		"anfragen": liste, "arten": C.DS_ARTEN, "loeschkonzept": vvt.get("loeschkonzept") or [],
	}


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("art"), C.DS_ARTEN, "")
	if not art:
		ungueltig("Bitte die Art der Anfrage wählen.")
	heute = L.heute()
	eingang = d.get("eingangAm") if L.ist_datum(d.get("eingangAm")) else heute
	if eingang > heute:
		ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.")
	if eingang < C.plus_monate(heute, -12):
		ungueltig("Eingang älter als 12 Monate – bitte prüfen.")
	name = v.text(d.get("name"), 120)
	if len(name) < 2:
		ungueltig("Bitte den Namen der betroffenen Person angeben.")
	email = v.email(d.get("email")) if d.get("email") else ""
	konto = v.kennung(d.get("kontoId"))
	if konto and not frappe.db.exists("Plattform Konto", konto):
		nicht_gefunden("Konto nicht gefunden.")
	if not konto and email:
		konto = frappe.db.get_value("Plattform Konto", {"email": email}, "name")
	land = v.auswahl(d.get("land"), ["AT", "DE", "CH"], "AT")
	frist = C.ds_frist(eingang, land)
	daten_ = {"verlauf": [{"am": iso(now_datetime()), "vonId": n.id, "text": f"Anfrage erfasst ({C.DS_ARTEN[art]['label']}, Eingang {L.datum_de(eingang)})"}]}
	doc = _neu(DS, {"art": art, "status": "eingegangen", "land": land, "kanal": v.auswahl(d.get("kanal"), ["portal", "email", "brief", "telefon", "sonstiges"], "email"), "eingang_am": eingang, "frist": frist,
		"name_betroffener": name, "email": email, "konto_id": konto or None, "vorgang_id": v.kennung(d.get("vorgangId")) or None, "zustaendig_id": n.id, "beschreibung": v.mehrzeilig(d.get("beschreibung"), 2000), "daten": als_json(daten_)})
	doc.insert(ignore_permissions=True)
	_aufgabe(f"DSGVO {C.DS_ARTEN[art]['label']}: {name} ({doc.name})", f"Frist bis {L.datum_de(frist)} ({C.DS_ARTEN[art]['norm']}, Art. 12 Abs. 3 DSGVO).", max(heute, L.plus_tage(frist, -7)), n.id)
	if konto:
		benachrichtigen(konto, "nachricht", "Ihre Datenschutzanfrage ist eingegangen", f"Wir bearbeiten Ihre Anfrage ({C.DS_ARTEN[art]['label']}) und antworten bis spätestens {L.datum_de(frist)}.", "/portal/profil", "nutzer", konto,
			mail_betreff="Eingang Ihrer Datenschutzanfrage – ÖkoInvest", mail_text=f"Ihre Datenschutzanfrage ist bei uns eingegangen. Wir beantworten sie bis spätestens {L.datum_de(frist)}.")
	protokoll(n, "dsgvo_anfrage", "dsgvo", doc.name, f"{C.DS_ARTEN[art]['label']} erfasst (Frist {frist})")
	return _ausgabe(_anfrage(doc), heute)


def _anonymisieren(n, konto_id, anfrage_id):
	"""Wie api.sicherheit.konto_loeschen (ohne Passwort, auf Löschersuchen) – Hilfsfunktionen von dort."""
	from frappe.utils.password import delete_all_passwords_for

	from oekoinvest_app.plattform.api.sicherheit import _entwurf_loeschen, _organisation_aufloesen, _user_umbenennen
	from oekoinvest_app.plattform.kern import konto_rollen

	konto = frappe.get_doc("Plattform Konto", konto_id)
	if konto.geloescht_am:
		konflikt("Das Konto ist bereits anonymisiert.")
	if "admin" in konto_rollen(konto):
		konflikt("Backoffice-Konten werden über die Nutzerverwaltung (Leitung) entfernt.")
	eigene = frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": konto_id}, fields=["organisation_id", "rolle"], limit_page_length=0)
	inhaber = [m for m in eigene if m.rolle == "inhaber"]
	for m in inhaber:
		if frappe.db.count("Plattform Mitgliedschaft", {"organisation_id": m.organisation_id, "nutzer_id": ("!=", konto_id)}):
			konflikt("Das Konto ist Inhaber einer Organisation mit weiteren Mitgliedern – Inhaberschaft zuerst übertragen lassen.")
	for m in inhaber:
		_organisation_aufloesen(m.organisation_id)
	frappe.db.delete("Plattform Mitgliedschaft", {"nutzer_id": konto_id})
	for dt, art, feld in (("Plattform Flaeche", "flaeche", "nutzer_id"), ("Plattform Projekt", "projekt", "anbieter_id")):
		for x in frappe.get_all(dt, filters={feld: konto_id, "status": "entwurf", "organisation_id": ("is", "not set")}, pluck="name", limit_page_length=0):
			_entwurf_loeschen(dt, art, x)
	frappe.db.delete("Plattform Einladung", {"email": konto.email})
	frappe.db.delete("Plattform Zwei Faktor", {"nutzer_id": konto_id})
	delete_all_passwords_for("Plattform Zwei Faktor", konto_id)
	for dt in ("Plattform Sitzung", "Plattform Geraet", "Plattform Anmeldung", "Plattform Token", "Plattform Benachrichtigung"):
		frappe.db.delete(dt, {"nutzer_id": konto_id})
	neu = f"geloescht-{konto_id.lower()}@geloescht.invalid"
	_user_umbenennen(konto.user, neu)
	delete_all_passwords_for("User", neu)
	konto.reload()
	konto.update({"email": neu, "user": neu, "vorname": "Gelöschtes", "nachname": "Konto", "firma": "", "telefon": "", "aktiv": 0, "email_bestaetigt": 0, "suchprofil": None, "komfort": None, "mail_einstellungen": None, "geloescht_am": now_datetime()})
	konto.save(ignore_permissions=True)
	if frappe.db.get_value("User", neu, "enabled"):
		frappe.db.set_value("User", neu, "enabled", 0, update_modified=False)
	protokoll(n, "konto_geloescht", "nutzer", konto_id, f"Konto anonymisiert auf Löschersuchen {anfrage_id}")


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(id)
	if not k or not frappe.db.exists(DS, k):
		nicht_gefunden("Anfrage nicht gefunden.")
	doc = frappe.get_doc(DS, k)
	a = _anfrage(doc)
	daten_ = aus_json(doc.daten, {}) or {}
	verlauf = daten_.setdefault("verlauf", [])
	heute = L.heute()
	log = lambda t: verlauf.append({"am": iso(now_datetime()), "vonId": n.id, "text": v.text(t, 300)})  # noqa: E731
	felder = {}
	akt = d.get("aktion")
	if akt == "konto_verknuepfen":
		if a["status"] not in C.DS_OFFEN:
			konflikt("Die Anfrage ist abgeschlossen.")
		konto = v.kennung(d.get("kontoId")) or (frappe.db.get_value("Plattform Konto", {"email": v.email(d.get("email"))}, "name") if d.get("email") else None)
		if not konto or not frappe.db.exists("Plattform Konto", konto):
			nicht_gefunden("Kein Konto mit dieser Kennung/E-Mail.")
		felder["konto_id"] = konto
		log(f"Konto {konto} verknüpft")
	elif akt == "anonymisieren":
		if a["art"] != "loeschung":
			konflikt("Anonymisierung nur bei Löschersuchen.")
		if a["status"] not in ("in_bearbeitung", "verlaengert"):
			konflikt("Erst nach bestätigter Identität.")
		if str(d.get("bestaetigung") or "").strip().upper() not in ("LÖSCHEN", "LOESCHEN"):
			ungueltig("Bitte mit dem Wort LÖSCHEN bestätigen.")
		if not v.wahr(d.get("aufbewahrungGeprueft")):
			ungueltig("Bitte bestätigen, dass Aufbewahrungspflichten (Belege, GwG, Verträge) geprüft sind – betroffene Unterlagen bleiben gesperrt erhalten.")
		if not a.get("kontoId"):
			konflikt("Kein Konto verknüpft.")
		_anonymisieren(n, a["kontoId"], k)
		daten_["loeschErgebnis"] = "geloescht"
		if doc.email:
			felder["email"] = f"{doc.email[0]}•••@{doc.email.split('@')[-1]}"
		log(f"Konto {a['kontoId']} anonymisiert und gesperrt; Unterlagen mit Aufbewahrungspflicht bleiben gesperrt erhalten")
	else:
		p = C.ds_uebergang(a, akt, d, heute)
		if not p["ok"]:
			konflikt(p["fehler"])
		vorher = a["status"]
		felder["status"] = p["nach"]
		if akt == "identitaet_anfordern":
			daten_["identitaet"] = {"status": "angefordert", "notiz": v.text(d.get("notiz"), 300), "am": iso(now_datetime())}
		if akt == "identitaet_bestaetigen":
			daten_["identitaet"] = {"status": "bestaetigt", "notiz": v.text(d.get("notiz"), 300), "am": iso(now_datetime()), "vonId": n.id}
		if akt == "verlaengern":
			daten_.update({"verlaengertAm": iso(now_datetime()), "verlaengerungsgrund": v.text(d.get("begruendung"), 500)})
			felder["frist"] = C.ds_frist(a["eingangAm"], a["land"], True)
		if akt == "ablehnen":
			daten_["begruendung"] = v.text(d.get("begruendung"), 1000)
			felder["erledigt_am"] = now_datetime()
		if akt == "erledigen":
			daten_.update({"ergebnis": v.mehrzeilig(d.get("ergebnis"), 2000), "loeschErgebnis": d.get("loeschErgebnis") if a["art"] == "loeschung" else "", "loeschbarAb": C.plus_monate(heute, 36)})
			felder["erledigt_am"] = now_datetime()
		log(f"{C.DS_STATUS[vorher]} → {C.DS_STATUS[p['nach']]}{(': ' + (d.get('begruendung') or d.get('notiz'))) if (d.get('begruendung') or d.get('notiz')) else ''}")
		konto = a.get("kontoId")
		frist = C.ds_frist(a["eingangAm"], a["land"], bool(daten_.get("verlaengertAm")))
		text = {"verlaengern": f"Die Beantwortung Ihrer Datenschutzanfrage dauert länger. Neue Frist: {L.datum_de(frist)}.", "erledigen": "Ihre Datenschutzanfrage ist beantwortet.",
			"ablehnen": "Zu Ihrer Datenschutzanfrage liegt eine Antwort vor.", "identitaet_anfordern": "Für Ihre Datenschutzanfrage benötigen wir einen Identitätsnachweis."}.get(akt)
		if konto and text and not frappe.db.get_value("Plattform Konto", konto, "geloescht_am"):
			benachrichtigen(konto, "nachricht", "Ihre Datenschutzanfrage", text, "/portal/profil", "nutzer", konto, mail_betreff="Ihre Datenschutzanfrage – ÖkoInvest", mail_text=f"{text} Details erhalten Sie über den vereinbarten Kanal bzw. im Portal.")
	felder["daten"] = als_json(daten_)
	doc.db_set(felder)
	protokoll(n, f"dsgvo_{akt}", "dsgvo", k, f"{C.DS_ARTEN[a['art']]['label']}: {akt}")
	return _ausgabe(_anfrage(frappe.get_doc(DS, k)), heute)


@frappe.whitelist(methods=["POST"])
def export(id=None, ip=None, als_benutzer=None):  # noqa: A002
	"""Datenauskunft des verknüpften Kontos: api.sicherheit.daten_export im Namen des Kontos (technischer API-Kontext),
	ergänzt um Art.-15-Informationen, KYC-Status und Abrechnungen."""
	import json

	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	_schreiben(n)
	compliance_user = frappe.session.user
	k = v.kennung(id)
	if not k or not frappe.db.exists(DS, k):
		nicht_gefunden("Anfrage nicht gefunden.")
	doc = frappe.get_doc(DS, k)
	a = _anfrage(doc)
	if not C.DS_ARTEN[a["art"]].get("export"):
		konflikt("Export nur bei Auskunft oder Datenübertragbarkeit.")
	if a["status"] not in ("in_bearbeitung", "verlaengert"):
		konflikt("Export erst nach bestätigter Identität.")
	if not a.get("kontoId"):
		konflikt("Kein Konto verknüpft – Auskunft zu Daten ohne Konto (z. B. Anfragen, Akquise) bitte manuell zusammenstellen.")
	from oekoinvest_app.plattform.api.sicherheit import daten_export

	try:
		frappe.set_user(api_user)  # daten_export prüft die API-Rolle und wechselt selbst in das Konto
		daten = daten_export(als_benutzer=a["kontoId"])
	finally:
		frappe.set_user(compliance_user)
	kyc = [{"id": f.name, "status": f.status, "hinweis": "Unterlagen und Prüfergebnisse werden auf Wunsch gesondert bereitgestellt; Einschränkungen nach GwG bleiben vorbehalten."}
		for f in frappe.get_all("KYC Fall", filters={"konto": a["kontoId"]}, fields=["name", "status"], limit_page_length=0)] if frappe.db.exists("DocType", "KYC Fall") else []
	abr = frappe.get_all("Plattform Abrechnung", filters={"empfaenger_id": a["kontoId"]}, fields=["nummer", "art", "rechnungsdatum", "brutto", "status"], limit_page_length=0)
	vv = C.vvt()
	paket = {**daten, "anfrage": {"id": k, "art": C.DS_ARTEN[a["art"]]["label"], "eingangAm": a["eingangAm"], "erstelltAm": iso(now_datetime())},
		"informationenArt15": {"verantwortlicher": C.VVT_VERANTWORTLICHER, "zwecke": [{"taetigkeit": t["titel"], "zweck": t["zweck"], "rechtsgrundlage": t["rechtsgrundlage"], "empfaenger": t["empfaenger"], "speicherdauer": t["loeschung"]} for t in vv["taetigkeiten"] if t["id"] in ("konto", "anfragen", "boerse", "kyc", "finanzen", "energie", "anlagen", "signatur")],
			"rechte": "Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Beschwerde bei der Aufsichtsbehörde (Art. 77 DSGVO).",
			"automatisierteEntscheidung": "Keine ausschließlich automatisierte Entscheidung im Sinne von Art. 22 DSGVO."},
		"kyc": kyc, "abrechnungen": [{"nummer": x.nummer, "art": x.art, "rechnungsdatum": str(x.rechnungsdatum), "brutto": float(x.brutto or 0), "status": x.status} for x in abr]}
	text = json.dumps(paket, ensure_ascii=False, indent=2, default=str)
	d_ = aus_json(doc.daten, {}) or {}
	d_.update({"exportAm": iso(now_datetime()), "exportSha": sha256(text)})
	d_.setdefault("verlauf", []).append({"am": iso(now_datetime()), "vonId": n.id, "text": f"Datenexport erstellt (SHA-256 {sha256(text)[:16]}…)"})
	doc.db_set("daten", als_json(d_))
	protokoll(n, "dsgvo_export", "dsgvo", k, f"Datenexport für Konto {a['kontoId']} erstellt", ip or "")
	return {"text": text, "dateiname": f"Datenauskunft-{k}.json"}


@frappe.whitelist(methods=["POST"])
def vvt_export(format="csv", als_benutzer=None):  # noqa: A002
	import json

	n = nutzer(als_benutzer)
	_lesen(n)
	protokoll(n, "export", "dsgvo", "VVT", f"Verzeichnis der Verarbeitungstätigkeiten exportiert ({format})")
	if format == "json":
		return {"text": json.dumps(C.vvt(), ensure_ascii=False, indent=2), "dateiname": f"VVT-{C.VVT_STAND}.json", "typ": "application/json"}
	return {"text": C.vvt_csv(), "dateiname": f"VVT-{C.VVT_STAND}.csv", "typ": "text/csv; charset=utf-8"}


@frappe.whitelist(methods=["POST"])
def kyc_sla(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	heute = L.heute()
	faelle = []
	if frappe.db.exists("DocType", "KYC Fall"):
		for f in frappe.get_all("KYC Fall", filters={"status": ["in", ["eingereicht", "in_pruefung", "zweitpruefung"]]}, fields=["name", "status", "kontotyp", "eingereicht_am"], limit_page_length=0):
			faelle.append({"id": f.name, "status": f.status, "kontotyp": f.kontotyp, **C.kyc_sla({"status": f.status, "kontotyp": f.kontotyp, "eingereichtAm": str(f.eingereicht_am or "")[:10] or None}, heute)})
	return {"heute": heute, "sla": C.KYC_SLA, "faelle": faelle, "rot": len([f for f in faelle if f["ampel"] == "rot"]), "gelb": len([f for f in faelle if f["ampel"] == "gelb"])}


# ================================================================ Verdachtsfälle


def _fall(doc):
	d = aus_json(doc.daten, {}) or {}
	f = {"id": doc.name, "status": doc.status, "anlass": doc.anlass, "land": doc.land or "AT", "kontoId": doc.konto_id, "kycFallId": doc.kyc_fall_id, "sachverhalt": doc.sachverhalt or "",
		"erfasstVon": doc.erfasst_von, "erfasstAm": iso(doc.creation), "aufbewahrenBis": str(doc.aufbewahren_bis) if doc.aufbewahren_bis else None, **d}
	f.update({"statusLabel": C.VERDACHT_STATUS.get(doc.status), "statusTon": {"erfasst": "warn", "in_pruefung": "warn", "meldung_vorbereitet": "info", "gemeldet": "dunkel", "keine_meldung": "neutral", "abgeschlossen": "ok"}.get(doc.status),
		"anlassLabel": C.VERDACHT_ANLAESSE.get(doc.anlass, doc.anlass), "meldestelle": C.MELDESTELLEN.get(doc.land or "AT"), "erfasstVonName": name_von(doc.erfasst_von) if doc.erfasst_von else "",
		"konto": {"id": doc.konto_id, "name": name_von(doc.konto_id)} if doc.konto_id else None, "kycStatus": frappe.db.get_value("KYC Fall", doc.kyc_fall_id, "status") if doc.kyc_fall_id else None,
		"tageOffen": (now_datetime() - doc.creation).days, "verlauf": d.get("verlauf") or []})
	return f


@frappe.whitelist(methods=["POST"])
def verdacht_liste(status="offen", als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	alle = [_fall(frappe.get_doc(GW, x)) for x in frappe.get_all(GW, pluck="name", order_by="creation desc", limit_page_length=1000)]
	return {"faelle": [f for f in alle if status == "alle" or (f["status"] in C.VERDACHT_OFFEN if status == "offen" else f["status"] == status)],
		"kennzahlen": {"offen": len([f for f in alle if f["status"] in C.VERDACHT_OFFEN]), "gemeldet": len([f for f in alle if f["status"] == "gemeldet"]), "gesamt": len(alle)},
		"anlaesse": C.VERDACHT_ANLAESSE, "meldestellen": C.MELDESTELLEN}


@frappe.whitelist(methods=["POST"])
def verdacht_melden(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not n:
		nicht_angemeldet()
	if not ist_admin(n) or stufe(n, "cockpit") < 1:
		verboten("Nur für das Backoffice.")
	d = aus_json(daten, {}) or {}
	sachverhalt = v.mehrzeilig(d.get("sachverhalt"), 4000).strip()
	if len(sachverhalt) < 30:
		ungueltig("Bitte den Sachverhalt konkret beschreiben (mind. 30 Zeichen: wer, was, wann, warum auffällig).")
	anlass = v.auswahl(d.get("anlass"), C.VERDACHT_ANLAESSE, "sonstiges")
	konto = v.kennung(d.get("kontoId")) or None
	if konto and not frappe.db.exists("Plattform Konto", konto):
		nicht_gefunden("Konto nicht gefunden.")
	kyc = v.kennung(d.get("kycFallId")) or (frappe.db.get_value("KYC Fall", {"konto": konto}, "name") if konto and frappe.db.exists("DocType", "KYC Fall") else None)
	daten_ = {"verlauf": [{"am": iso(now_datetime()), "vonId": n.id, "text": "Intern gemeldet"}], "transaktionGesperrt": v.wahr(d.get("transaktionSperren")), "betrag": int(round(float(d["betrag"]))) if str(d.get("betrag") or "").replace(".", "", 1).isdigit() else None}
	doc = _neu(GW, {"status": "erfasst", "anlass": anlass, "land": v.auswahl(d.get("land"), ["AT", "DE", "CH"], "AT"), "konto_id": konto, "kyc_fall_id": kyc or None, "erfasst_von": n.id, "sachverhalt": sachverhalt, "daten": als_json(daten_)})
	doc.insert(ignore_permissions=True)
	for c in _compliance_konten():
		if c == n.id:
			continue
		benachrichtigen(c, "aufgabe", "Neuer interner Verdachtshinweis", f"Verdachtsfall {doc.name} ({C.VERDACHT_ANLAESSE[anlass]}) – bitte unverzüglich prüfen. Keine Information an die betroffene Person.", "/portal/admin/compliance/gwg", "verdacht", doc.name,
			mail_betreff="Interner Hinweis zur Prüfung – ÖkoInvest Compliance", mail_text="Im Backoffice liegt ein neuer vertraulicher Hinweis zur Prüfung vor. Details nur im Portal (Compliance).")
		_aufgabe(f"Verdachtsfall {doc.name} prüfen", "Sachverhalt würdigen, Unterlagen sichern, Entscheidung über Meldung dokumentieren. Keine Information an Betroffene (Tipping-off-Verbot).", L.plus_tage(L.heute(), 2), c)
	protokoll(n, "verdacht_gemeldet", "verdacht", doc.name, f"Interner Verdachtshinweis {doc.name} ({C.VERDACHT_ANLAESSE[anlass]})")
	return {"ok": True, "id": doc.name, "hinweis": "Der Hinweis ist bei Compliance eingegangen. Bitte die betroffene Person nicht informieren und keine eigenen Nachforschungen nach außen anstellen."}


@frappe.whitelist(methods=["POST"])
def verdacht_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(id)
	if not k or not frappe.db.exists(GW, k):
		nicht_gefunden("Verdachtsfall nicht gefunden.")
	doc = frappe.get_doc(GW, k)
	f = _fall(doc)
	daten_ = aus_json(doc.daten, {}) or {}
	verlauf = daten_.setdefault("verlauf", [])
	heute = L.heute()
	felder = {}
	akt = d.get("aktion")
	if akt == "notiz":
		t = v.mehrzeilig(d.get("text"), 2000).strip()
		if len(t) < 5:
			ungueltig("Bitte eine Notiz eingeben.")
		verlauf.append({"am": iso(now_datetime()), "vonId": n.id, "text": t})
	else:
		p = C.verdacht_uebergang(f, akt, d, heute, n.id)
		if not p["ok"]:
			konflikt(p["fehler"])
		vorher = f["status"]
		felder["status"] = p["nach"]
		if akt == "pruefen":
			daten_["pruefer"] = n.id
		if akt in ("meldung_vorbereiten", "keine_meldung"):
			daten_["entscheidung"] = {"art": "keine_meldung" if akt == "keine_meldung" else "meldung", "begruendung": v.mehrzeilig(d.get("begruendung"), 3000), "am": iso(now_datetime()), "vonId": n.id}
		if akt == "gemeldet":
			daten_["meldung"] = {"am": d.get("gemeldetAm"), "aktenzeichen": v.text(d.get("aktenzeichen"), 40), "stelle": C.MELDESTELLEN.get(f["land"], C.MELDESTELLEN["AT"])["name"], "erfasstAm": iso(now_datetime()), "vonId": n.id}
		if akt == "abschliessen":
			daten_["abgeschlossenAm"] = iso(now_datetime())
			felder["aufbewahren_bis"] = C.verdacht_aufbewahrung_bis(heute, f["land"])
		verlauf.append({"am": iso(now_datetime()), "vonId": n.id, "text": f"{C.VERDACHT_STATUS[vorher]} → {C.VERDACHT_STATUS[p['nach']]}"})
	felder["daten"] = als_json(daten_)
	doc.db_set(felder)
	protokoll(n, f"verdacht_{akt}", "verdacht", k, f"Verdachtsfall {k}: {akt}")
	return _fall(frappe.get_doc(GW, k))

