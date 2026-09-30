# Copyright (c) 2026, ÖkoInvest GmbH
#
# Abrechnungskern (Frappe) – Referenz: src/lib/plattform/backend/demo/finanzen-kern.js.
# Belege (Plattform Abrechnung) mit fortlaufender Nummer je Kreis/Jahr (PG = Pacht-Gutschrift, CR = Contracting-Rechnung,
# PR = Provisionsrechnung), Klärfälle, Abrechnungslauf (Scheduler + manuell), KYC-Anbindung für Auszahlungen,
# Gesellschaften (ÖkoInvest GmbH / SPV als Aussteller) und optional ERPNext (erpnext.py).
# Keine Rechteprüfung hier – die API (plattform/api/finanzen.py) prüft vorher.

import frappe
from frappe.model.naming import make_autoname
from frappe.utils import cint, flt, now_datetime

from oekoinvest_app.plattform.finanzen import erpnext as E
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.finanzen import steuer as T
from oekoinvest_app.plattform.finanzen.sepa import iban_pruefen
from oekoinvest_app.plattform.kern import als_json, aus_json, iso, protokoll, verlauf

OEKOINVEST_ID = "OEKOINVEST"
DT = "Plattform Abrechnung"
EINST = "Plattform Finanzen Einstellungen"

# ================================================================ Einstellungen und Gesellschaften


def einstellungen():
	e = frappe.get_cached_doc(EINST) if frappe.db.exists("DocType", EINST) else frappe._dict()
	return {
		"firma": e.get("firma") or "ÖkoInvest GmbH",
		"anschrift": e.get("anschrift") or "Gewerbegebiet 10, 5121 Ostermiething, Österreich",
		"land": e.get("land") or "AT",
		"firmenbuch": e.get("firmenbuch") or "FN 541505g, LG Ried im Innkreis",
		"uid": e.get("uid") or frappe.conf.get("oekoinvest_uid") or "",
		"iban": e.get("iban") or "",
		"bic": e.get("bic") or "",
		"zahlungszielTage": cint(e.get("zahlungsziel_tage") or 14),
		"vorlaufTage": cint(e.get("vorlauf_tage") or 14),
		"erpnextCompany": e.get("erpnext_company") or "ÖkoInvest GmbH",
		"erpnextAutobuchen": cint(e.get("erpnext_autobuchen")),
		"erpnextSubscription": cint(e.get("erpnext_subscription")),
		"steuerzuordnung": aus_json(e.get("steuerzuordnung"), {}) or {},
		"kostenstellen": aus_json(e.get("kostenstellen"), {}) or {},
	}


VERZEICHNIS = ("Plattform Projektgesellschaft", "Plattform Gesellschaft")  # Gesellschaftsverzeichnis (Team Dienste)


def _verzeichnis_eintrag(gid=None, name=None):
	"""Gesellschaftsverzeichnis – DocType „Plattform Projektgesellschaft“ (firma, anschrift, land, uid, registernummer, gericht, erp_company)."""
	for dt in VERZEICHNIS:
		if not frappe.db.exists("DocType", dt):
			continue
		if gid and frappe.db.exists(dt, gid):
			return frappe.get_doc(dt, gid).as_dict()
		if name and frappe.get_meta(dt).has_field("firma"):
			treffer = frappe.db.get_value(dt, {"firma": name, "status": ["!=", "aufgeloest"]}, "name")
			if treffer:
				return frappe.get_doc(dt, treffer).as_dict()
	return None


def gesellschaft(gid):
	e = einstellungen()
	if not gid or gid == OEKOINVEST_ID:
		return {"id": OEKOINVEST_ID, "name": e["firma"], "anschrift": e["anschrift"], "land": e["land"], "uid": e["uid"], "firmenbuch": e["firmenbuch"], "iban": e["iban"], "bic": e["bic"], "erpnextCompany": e["erpnextCompany"], "spv": False, "bekannt": True}
	if str(gid).startswith("NAME:"):
		name = str(gid)[5:]
		return {"id": gid, "name": name, "anschrift": "", "land": "", "uid": "", "firmenbuch": "", "iban": "", "bic": "", "erpnextCompany": name, "spv": True, "bekannt": True, "nurName": True}
	g = _verzeichnis_eintrag(gid) or {}
	if (g.get("firma") or g.get("titel")) == e["firma"]:
		return gesellschaft(OEKOINVEST_ID)  # ÖkoInvest GmbH steht auch im Verzeichnis – Stammdaten aus den Finanzeinstellungen
	name = g.get("titel") or g.get("firma") or g.get("name1") or g.get("gesellschaft") or gid
	return {
		"id": gid, "name": name, "anschrift": g.get("anschrift") or g.get("sitz") or "", "land": g.get("land") or "", "uid": g.get("uid") or g.get("uid_nummer") or "",
		"firmenbuch": ", ".join(x for x in (g.get("firmenbuch") or g.get("registernummer"), g.get("gericht")) if x), "iban": g.get("iban") or "", "bic": g.get("bic") or "",
		"erpnextCompany": g.get("erp_company") or g.get("erpnext_company") or g.get("company") or name, "spv": True, "bekannt": bool(g),
	}


def anlage_gesellschaft(anlage):
	"""Eigentümergesellschaft einer Anlage: Plattform Anlage.eigentuemer_id (Verzeichnis) → eigentuemer (Name) → ÖkoInvest GmbH."""
	a = anlage or {}
	gid = a.get("eigentuemer_id") or a.get("eigentuemerId")
	name = (a.get("eigentuemer") or "").strip()
	standard = not name or name == "ÖkoInvest GmbH"
	if gid and gid != OEKOINVEST_ID:
		g = gesellschaft(gid)
		if g["bekannt"] or standard:
			return g
	if standard:
		return gesellschaft(OEKOINVEST_ID)
	treffer = _verzeichnis_eintrag(name=name)
	return gesellschaft(treffer["name"]) if treffer else gesellschaft(f"NAME:{name}")


# ================================================================ KYC und Parteien


def kyc_auszahlung(konto_id, flaeche_id=None):
	"""Auszahlung verbindlich über kyc_kern.kyc_freigabe("auszahlung", …) (Verifizierung + geprüfte IBAN + Eigentumsnachweis;
	Geltung laut KYC-Einstellungen/oekoinvest_kyc_gating). Die IBAN stammt immer aus der Verifizierung – ohne gültige IBAN keine
	Auszahlung. Ohne KYC-Modul: gesperrt (fail closed)."""
	try:
		from oekoinvest_app.plattform import kyc_kern as K
	except ImportError:
		return {"quelle": "kyc", "status": "offen", "verifiziert": False, "ok": False, "gruende": ["KYC-Modul nicht installiert – keine Auszahlung."], "iban": "", "bic": "", "kontoinhaber": ""}
	if not frappe.db.exists("DocType", K.DT_FALL):
		return {"quelle": "kyc", "status": "offen", "verifiziert": False, "ok": False, "gruende": ["KYC-Modul nicht eingerichtet – keine Auszahlung."], "iban": "", "bic": "", "kontoinhaber": ""}
	status = K.kyc_status(konto_id)
	fr = K.kyc_freigabe("auszahlung", konto_id=konto_id, flaeche_id=flaeche_id)
	bank = {}
	if status.get("fallId") and frappe.db.exists("DocType", K.DT_BANK):
		name = frappe.db.get_value(K.DT_BANK, {"fall": status["fallId"]}, "name")
		if name:
			d = frappe.get_doc(K.DT_BANK, name)
			meta = frappe.get_meta(K.DT_BANK)
			for feld in ("iban", "bic", "kontoinhaber"):
				df = meta.get_field(feld)
				if not df:
					continue
				if df.fieldtype == "Password":
					from frappe.utils.password import get_decrypted_password

					bank[feld] = get_decrypted_password(K.DT_BANK, name, feld, raise_exception=False) or ""
				else:
					bank[feld] = d.get(feld) or ""
	gruende = list(fr.get("gruende") or [])
	if not iban_pruefen(bank.get("iban")):
		gruende.append("Die IBAN der Bankverbindung ist ungültig oder nicht lesbar." if bank.get("iban") else "In der Verifizierung ist keine Bankverbindung hinterlegt – ohne IBAN keine Auszahlung.")
	return {"quelle": "kyc", "status": status.get("status"), "verifiziert": bool(status.get("verifiziert")), "ok": not gruende, "gruende": gruende, "iban": bank.get("iban", ""), "bic": bank.get("bic", ""), "kontoinhaber": bank.get("kontoinhaber", "")}


def partei(konto_id=None, organisation_id=None):
	k = frappe.db.get_value("Plattform Konto", konto_id, ["name", "vorname", "nachname", "firma", "email"], as_dict=True) if konto_id else None
	org = frappe.db.get_value("Plattform Organisation", organisation_id, "titel") if organisation_id else None
	fall = None
	try:
		from oekoinvest_app.plattform import kyc_kern as K

		if frappe.db.exists("DocType", K.DT_FALL):
			fid = K.fall_suchen(konto_id, organisation_id)
			fall = frappe.get_doc(K.DT_FALL, fid).as_dict() if fid else None
	except ImportError:
		fall = None
	fall = fall or {}
	person = " ".join(x for x in ((k or {}).get("vorname"), (k or {}).get("nachname")) if x)
	firma_fall = fall.get("firma_name") or (fall.get("firma") if isinstance(fall.get("firma"), str) else None)
	firma = firma_fall or org or (k or {}).get("firma") or ""
	anschrift = fall.get("anschrift") or ", ".join(x for x in (fall.get("strasse"), " ".join(y for y in (fall.get("plz"), fall.get("ort")) if y), fall.get("land")) if x)
	return {"name": firma or person or "–", "zuHaenden": person if firma and person else "", "anschrift": anschrift or "", "land": fall.get("land") or "", "uid": fall.get("uid") or "", "email": (k or {}).get("email") or ""}


def vpi_tabelle():
	return [{"reihe": r.reihe, "jahr": cint(r.jahr), "wert": flt(r.wert), "quelle": r.quelle or ""} for r in frappe.get_all("Plattform VPI Wert", fields=["reihe", "jahr", "wert", "quelle"], limit_page_length=0)]


# ================================================================ Pachtvertrag ↔ camelCase


def pachtvertrag_dict(p):
	return {
		"id": p.name, "eigentuemerId": p.eigentuemer_id, "bezeichnung": p.bezeichnung, "objektArt": p.objekt_art, "land": p.land, "flaecheHa": flt(p.flaeche_ha),
		"flaecheId": p.flaeche_id or None, "anlageId": p.anlage_id or None, "gesellschaftId": p.gesellschaft_id or None, "modell": p.modell, "pachtJahr": flt(p.pacht_jahr),
		"index": {"reihe": p.index_reihe, "basisJahr": cint(p.index_basis_jahr), "basisIndex": flt(p.index_basis_wert) or None, "schwellePct": flt(p.index_schwelle_pct), "anteilPct": flt(p.index_anteil_pct) if p.index_anteil_pct is not None else 100, "nurErhoehung": bool(cint(p.index_nur_erhoehung))} if p.modell == "indexiert" else None,
		"umsatz": {"anteil": flt(p.umsatz_anteil), "erloesCtKwh": flt(p.umsatz_erloes_ct), "mindestJahr": flt(p.umsatz_mindest_jahr)} if p.modell == "umsatz" else None,
		"reservierungJahr": flt(p.reservierung_jahr), "vertragsdatum": str(p.vertragsdatum or ""), "beginnArt": p.beginn_art, "beginn": str(p.beginn or ""),
		"laufzeitJahre": cint(p.laufzeit_jahre), "faelligkeit": p.faelligkeit, "zahlweise": p.zahlweise, "zahlungszielTage": cint(p.zahlungsziel_tage) if p.zahlungsziel_tage is not None else 14,
		"steuervorlage": p.steuervorlage or "", "steuerOption": bool(cint(p.steuer_option)), "kleinunternehmer": bool(cint(p.kleinunternehmer)), "status": p.status, "bemerkung": p.bemerkung or "",
		"erstelltAm": iso(p.creation), "geaendertAm": iso(p.modified),
	}


def pacht_steuer_vorlage(pt):
	if pt.get("steuervorlage") in T.STEUERVORLAGEN:
		return pt["steuervorlage"]
	return T.steuer_vorschlag("pacht", pt.get("land"), option=pt.get("steuerOption"), kleinunternehmer=pt.get("kleinunternehmer"))["vorlage"]


def fuer_faelligkeit(pt):
	e = einstellungen()
	return {**pt, "vorlaufTage": e["vorlaufTage"], "zahlungszielTage": pt.get("zahlungszielTage") if pt.get("zahlungszielTage") is not None else e["zahlungszielTage"]}


# ================================================================ Anlagen-Daten (Contracting, Umsatzbeteiligung)


def anlage_daten(anlage_id):
	a = frappe.get_doc("Plattform Anlage", anlage_id)
	from oekoinvest_app.plattform.api.anlagen import _vertrag, vertrag_json

	mps = [{"id": m.name, "art": m.art, "abrechnungsrelevant": bool(cint(m.abrechnungsrelevant)), "zaehlernummer": m.zaehlernummer, "bezeichnung": m.bezeichnung or ""} for m in frappe.get_all("Plattform Messpunkt", filters={"anlage_id": a.name}, fields=["name", "art", "abrechnungsrelevant", "zaehlernummer", "bezeichnung"], limit_page_length=0)]
	zeilen = [
		{"monat": z.monat, "messpunktId": z.messpunkt_id, "register": z.register, "stand": flt(z.stand), "menge": flt(z.menge) if z.menge is not None else None, "quelle": z.quelle or "", "geprueft": bool(cint(z.geprueft))}
		for z in frappe.get_all("Plattform Zaehlerstand Monatswert", filters={"anlage_id": a.name}, fields=["monat", "messpunkt_id", "register", "stand", "menge", "quelle", "geprueft"], limit_page_length=0)
	]
	vertrag = vertrag_json(_vertrag(a.name))
	return {
		"anlage": {"id": a.name, "name": a.titel, "kwp": flt(a.kwp), "land": a.land, "typ": a.typ, "kundeId": a.kunde_id or None, "organisationId": a.organisation_id or None, "eigentuemer": a.get("eigentuemer") or "", "eigentuemer_id": a.get("eigentuemer_id") or ""},
		"vertrag": vertrag, "messpunkte": mps, "zeilen": zeilen,
	}


# ================================================================ Belege


def beleg_dict(doc):
	d = aus_json(doc.daten, {}) or {}
	return {
		**d, "id": doc.name, "nummer": doc.nummer, "art": doc.art, "beleg": doc.beleg, "titel": doc.titel, "gesellschaftId": doc.gesellschaft_id or OEKOINVEST_ID,
		"empfaengerId": doc.empfaenger_id or None, "organisationId": doc.organisation_id or None, "schluessel": doc.schluessel,
		"zeitraum": {"von": str(doc.zeitraum_von or ""), "bis": str(doc.zeitraum_bis or "")}, "rechnungsdatum": str(doc.rechnungsdatum or ""), "faelligAm": str(doc.faellig_am or ""),
		"netto": flt(doc.netto), "brutto": flt(doc.brutto), "status": doc.status, "bezahltAm": str(doc.bezahlt_am) if doc.bezahlt_am else None, "zahlungslaufId": doc.zahlungslauf_id or None,
		"erpnext": {"doctype": doc.erpnext_doctype or L.ABRECHNUNG_ARTEN[doc.art]["erpnext"], "name": doc.erpnext_name or None}, "laufId": doc.lauf_id or None, "stornoGrund": doc.storno_grund or "",
		"erstelltAm": iso(doc.creation),
	}


def _aktiver_beleg(schluessel):
	return frappe.db.get_value(DT, {"schluessel": schluessel, "status": ["!=", "storniert"]}, "name")


def _klaerfall_schliessen(schluessel, text):
	for name in frappe.get_all("Plattform Klaerfall", filters={"schluessel": schluessel, "status": "offen"}, pluck="name"):
		frappe.db.set_value("Plattform Klaerfall", name, {"status": "erledigt", "kommentar": text, "erledigt_am": now_datetime()})


def klaerfall_melden(art, schluessel, bezug, bezug_text, gruende, lauf_id=None):
	offen = frappe.db.get_value("Plattform Klaerfall", {"schluessel": schluessel, "status": "offen"}, ["name", "anzahl"], as_dict=True)
	if offen:
		frappe.db.set_value("Plattform Klaerfall", offen.name, {"gruende": als_json(gruende), "zuletzt_am": now_datetime(), "anzahl": cint(offen.anzahl) + 1, "lauf_id": lauf_id})
		return offen.name, False
	doc = frappe.get_doc({
		"doctype": "Plattform Klaerfall", "art": art, "schluessel": schluessel, "bezug_text": bezug_text[:140], "status": "offen", "anzahl": 1, "zuletzt_am": now_datetime(),
		"pachtvertrag_id": bezug.get("pachtvertragId"), "anlage_id": bezug.get("anlageId"), "provision_id": bezug.get("provisionId"), "monat": bezug.get("monat"),
		"gruende": als_json(gruende), "lauf_id": lauf_id,
	}).insert(ignore_permissions=True)
	return doc.name, True


def beleg_anlegen(n, e, trocken=False, melden=True, rechnungsdatum=None):
	art = L.ABRECHNUNG_ARTEN[e["art"]]
	heute_ = rechnungsdatum or L.heute()
	netto = L.summe(e["positionen"], "betrag")
	st = T.steuer_berechnen(netto, e["steuerVorlage"])
	ges = gesellschaft(e.get("gesellschaftId"))
	beleg = {
		"art": e["art"], "beleg": art["beleg"], "titel": art["titel"], "gesellschaftId": ges["id"], "empfaengerId": e.get("empfaengerId"), "organisationId": e.get("organisationId"),
		"partei": e["partei"], "aussteller": {"name": ges["name"], "anschrift": ges["anschrift"], "land": ges["land"], "uid": ges["uid"], "firmenbuch": ges["firmenbuch"]},
		"bezug": e["bezug"], "bezugText": e["bezugText"], "schluessel": e["schluessel"], "zeitraum": e["zeitraum"], "rechnungsdatum": heute_, "faelligAm": e["faelligAm"],
		"positionen": e["positionen"], "netto": netto, "steuer": {k: st[k] for k in ("vorlage", "label", "satz", "art", "betrag", "text", "rechtsgrundlage")}, "brutto": st["brutto"],
		"waehrung": "EUR", "erklaerung": e.get("erklaerung") or [], "zaehlerstaende": e.get("zaehlerstaende") or [], "hinweise": e.get("hinweise") or [], "kennzahlen": e.get("kennzahlen") or {},
		"status": "offen", "mahnungen": [],
	}
	if trocken:
		beleg["nummer"] = "(Vorschau)"
		beleg["pflichtFehlt"] = T.pflichtangaben_pruefen({**beleg, "empfaenger": beleg["partei"]})
		return beleg
	beleg["nummer"] = make_autoname(f"{art['kreis']}-{heute_[:4]}-.#####")
	beleg["pflichtFehlt"] = T.pflichtangaben_pruefen({**beleg, "empfaenger": beleg["partei"]})
	daten = {k: beleg[k] for k in ("partei", "aussteller", "bezug", "bezugText", "positionen", "steuer", "erklaerung", "zaehlerstaende", "hinweise", "kennzahlen", "mahnungen", "pflichtFehlt", "waehrung")}
	doc = frappe.get_doc({
		"doctype": DT, "nummer": beleg["nummer"], "art": e["art"], "beleg": art["beleg"], "titel": art["titel"], "gesellschaft_id": ges["id"], "status": "offen",
		"empfaenger_id": e.get("empfaengerId"), "organisation_id": e.get("organisationId"), "pachtvertrag_id": e["bezug"].get("pachtvertragId"), "anlage_id": e["bezug"].get("anlageId"),
		"provision_id": e["bezug"].get("provisionId"), "projekt_id": e["bezug"].get("projektId"), "schluessel": e["schluessel"], "zeitraum_von": e["zeitraum"]["von"], "zeitraum_bis": e["zeitraum"]["bis"],
		"rechnungsdatum": heute_, "faellig_am": e["faelligAm"], "netto": netto, "steuer_vorlage": st["vorlage"], "steuer_satz": st["satz"], "steuer_betrag": st["betrag"], "brutto": st["brutto"],
		"lauf_id": e.get("laufId"), "daten": als_json(daten),
	}).insert(ignore_permissions=True)
	beleg["id"] = doc.name
	if E.aktiv():
		# ERPNext-Beleg in der Company der ausstellenden Gesellschaft; Fehler → Hinweis am Beleg, Plattform-Beleg bleibt gültig
		try:
			dt_, name_ = E.rechnung_anlegen(beleg)
			doc.db_set({"erpnext_doctype": dt_, "erpnext_name": name_})
		except Exception as fehler:  # noqa: BLE001 – ERPNext-Fehler dürfen die Abrechnung nicht verhindern
			frappe.log_error(title="ÖkoInvest Finanzen: ERPNext-Beleg", message=frappe.get_traceback())
			beleg["hinweise"].append(f"ERPNext-Beleg nicht angelegt: {str(fehler)[:200]}")
			daten["hinweise"] = beleg["hinweise"]
			doc.db_set("daten", als_json(daten))
	_klaerfall_schliessen(e["schluessel"], f"Beleg {beleg['nummer']} erzeugt.")
	protokoll(n, "abrechnung_erzeugt", "abrechnung", doc.name, f"{art['label']} {beleg['nummer']}: {L.euro(beleg['brutto'])} ({e['bezugText']})")
	if melden:
		beleg_melden(beleg_dict(doc), "neu")
	return beleg_dict(doc)


def beleg_melden(b, ereignis):
	from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen

	empfaenger = []
	if b.get("empfaengerId"):
		empfaenger.append(b["empfaengerId"])
	elif b.get("organisationId"):
		empfaenger = frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": b["organisationId"], "rolle": ["in", ["inhaber", "admin"]]}, pluck="nutzer_id")
	label = L.ABRECHNUNG_ARTEN[b["art"]]["label"]
	z = b.get("zeitraum") or {}
	texte = {
		"neu": (f"{'Neue Gutschrift' if b['beleg'] == 'gutschrift' else 'Neue Rechnung'} {b['nummer']}", f"{label} für {L.datum_de(z.get('von'))} – {L.datum_de(z.get('bis'))} liegt im Portal bereit.", "Neue Abrechnung im Portal – ÖkoInvest", "Für Sie liegt eine neue Abrechnung im Portal von ÖkoInvest bereit. PDF und Details finden Sie unter „Abrechnungen“."),
		"bezahlt": (f"Auszahlung {b['nummer']} ausgeführt", "Die Pacht wurde überwiesen.", "Pachtzahlung ausgeführt – ÖkoInvest", "Eine Pachtzahlung wurde ausgeführt. Details finden Sie im Portal unter „Abrechnungen“.") if b["beleg"] == "gutschrift" else (f"Zahlung zu {b['nummer']} eingegangen", "Vielen Dank – die Zahlung ist verbucht.", "Zahlung eingegangen – ÖkoInvest", "Ihre Zahlung ist bei uns eingegangen. Details finden Sie im Portal unter „Abrechnungen“."),
		"erinnerung": (f"Zahlungserinnerung {b['nummer']}", f"Die Rechnung war am {L.datum_de(b.get('faelligAm'))} fällig.", "Zahlungserinnerung – ÖkoInvest", "Zu einer Rechnung im Portal von ÖkoInvest ist noch keine Zahlung eingegangen. Details finden Sie unter „Abrechnungen“."),
	}.get(ereignis)
	if not texte:
		return
	for konto in empfaenger:
		benachrichtigen(konto, "abrechnung", texte[0], texte[1], "/portal/abrechnungen", "abrechnung", b.get("id"), mail_betreff=texte[2], mail_text=texte[3])


def provision_nachziehen(n, b):
	"""Provisionsstatus aus der Rechnung nachziehen (offen → in_rechnung → bezahlt)."""
	if b.get("art") != "provision" or not (b.get("bezug") or {}).get("provisionId"):
		return
	pv = frappe.get_doc("Plattform Provision", b["bezug"]["provisionId"])
	if pv.status == "storniert":
		return
	ziel = L.provision_status_aus_rechnung(b)
	reihe = ["offen", "in_rechnung", "bezahlt"]
	if reihe.index(ziel) <= reihe.index(pv.status if pv.status in reihe else "offen"):
		return
	von = pv.status
	pv.status = ziel
	verlauf(pv, ziel, None, "system", f"Zahlung zu Rechnung {b['nummer']} verbucht." if ziel == "bezahlt" else f"Rechnung {b['nummer']} gestellt.")
	pv.flags.plattform_uebergang = (von, ziel)
	pv.save(ignore_permissions=True)
	protokoll(n, "status", "provision", pv.name, f"{von} → {ziel} (Rechnung {b['nummer']})")
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis

	backoffice_ereignis("status", "provision", pv, von=von, nach=ziel)


# ================================================================ Abrechnungslauf


def lauf_ausfuehren(n, art="alle", stichtag=None, monat=None, trockenlauf=False, vertrag_ids=None, anlage_ids=None, melden=True, rechnungsdatum=None):
	stichtag = stichtag or L.heute()
	monat = monat or L.vormonat(stichtag[:7])
	e = einstellungen()
	lauf = {"id": None, "art": art, "stichtag": stichtag, "monat": monat, "trockenlauf": bool(trockenlauf), "erzeugt": [], "klaerfaelle": [], "vorhanden": 0, "uebersprungen": 0}
	if not trockenlauf:
		ldoc = frappe.get_doc({"doctype": "Plattform Abrechnungslauf", "art": art, "stichtag": stichtag, "monat": monat, "trockenlauf": 0, "von_id": (n or {}).get("id")}).insert(ignore_permissions=True)
		lauf["id"] = ldoc.name
	cache = {}

	def daten_anlage(aid):
		if aid not in cache:
			cache[aid] = anlage_daten(aid) if aid and frappe.db.exists("Plattform Anlage", aid) else None
		return cache[aid]

	def erzeugen(eintrag):
		b = beleg_anlegen(n, {**eintrag, "laufId": lauf["id"]}, trocken=trockenlauf, melden=melden, rechnungsdatum=rechnungsdatum)
		lauf["erzeugt"].append({"id": b.get("id"), "nummer": b["nummer"], "art": b["art"], "empfaenger": b["partei"].get("name"), "zeitraum": b["zeitraum"], "netto": b["netto"], "brutto": b["brutto"], "bezugText": b["bezugText"]})
		return b

	def klaeren(art_, schluessel, bezug, text, gruende):
		if trockenlauf:
			lauf["klaerfaelle"].append({"id": None, "art": art_, "bezugText": text, "gruende": gruende, "neu": True})
			return
		kid, neu = klaerfall_melden(art_, schluessel, bezug, text, gruende, lauf["id"])
		lauf["klaerfaelle"].append({"id": kid, "art": art_, "bezugText": text, "gruende": gruende, "neu": neu})

	tabelle = vpi_tabelle()
	# ---------------------------------------------------------------- Pacht
	if art in ("pacht", "alle"):
		for p in frappe.get_all("Plattform Pachtvertrag", filters={"status": ["in", ["aktiv", "gekuendigt"]]}, pluck="name", limit_page_length=0):
			if vertrag_ids and p not in vertrag_ids:
				continue
			pt = pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", p))
			for f in L.abzurechnen(fuer_faelligkeit(pt), stichtag):
				if _aktiver_beleg(f["schluessel"]):
					lauf["vorhanden"] += 1
					continue
				text = f"{pt['bezeichnung']} ({pt['id']}) {L.datum_de(f['von'])} – {L.datum_de(f['bis'])}"
				ertrag = {"kwh": None, "fehlt": []}
				ad = daten_anlage(pt.get("anlageId")) if pt.get("anlageId") else None
				if pt["modell"] == "umsatz" and f["phase"] == "pacht":
					ertrag = L.ertrag_aus_monatswerten(ad["zeilen"], ad["messpunkte"], f["von"], f["bis"]) if ad else {"kwh": None, "fehlt": ["keine Anlage/Monatswerte verknüpft"]}
				r = L.pacht_positionen(pt, f, tabelle, ertrag["kwh"], ertrag["fehlt"])
				if r["klaerung"]:
					klaeren("pacht", f["schluessel"], {"pachtvertragId": pt["id"]}, text, [r["klaerung"]])
					continue
				if not r["netto"] > 0:
					lauf["uebersprungen"] += 1
					continue
				kyc = kyc_auszahlung(pt["eigentuemerId"], pt.get("flaecheId"))
				kyc_schluessel = f"KYC:{pt['eigentuemerId']}:{pt['id']}"
				if not kyc["ok"] and not trockenlauf:
					kid, neu = klaerfall_melden("pacht", kyc_schluessel, {"pachtvertragId": pt["id"]}, f"Auszahlung an {partei(pt['eigentuemerId'])['name']} ({pt['bezeichnung']})", [f"KYC unvollständig: {' '.join(kyc['gruende'])}"], lauf["id"])
					if neu:
						lauf["klaerfaelle"].append({"id": kid, "art": "pacht", "bezugText": pt["bezeichnung"], "gruende": ["KYC unvollständig"], "neu": True})
				elif kyc["ok"] and not trockenlauf:
					_klaerfall_schliessen(kyc_schluessel, "KYC-Freigabe für Auszahlungen erteilt.")
				ges_id = pt.get("gesellschaftId") or (anlage_gesellschaft(ad["anlage"])["id"] if ad else OEKOINVEST_ID)
				erzeugen({
					"art": "pacht", "gesellschaftId": ges_id, "empfaengerId": pt["eigentuemerId"], "partei": partei(pt["eigentuemerId"]), "schluessel": f["schluessel"],
					"bezug": {"pachtvertragId": pt["id"], "flaecheId": pt.get("flaecheId"), "anlageId": pt.get("anlageId"), "phase": f["phase"]}, "bezugText": text,
					"zeitraum": {"von": f["von"], "bis": f["bis"]}, "faelligAm": f["faelligAm"], "positionen": r["positionen"], "steuerVorlage": pacht_steuer_vorlage(pt),
					"erklaerung": r["erklaerung"], "kennzahlen": {**r["basis"], "phase": f["phase"], "zahlweise": f["zahlweise"]},
					"hinweise": [] if kyc["ok"] else [f"Auszahlung gesperrt: {' '.join(kyc['gruende'])}"],
				})
	# ---------------------------------------------------------------- Contracting
	if art in ("contracting", "alle"):
		z = L.monats_zeitraum(monat)
		for cv in frappe.get_all("Plattform Contracting Vertrag", filters={"status": "aktiv"}, fields=["anlage_id", "beginn"], limit_page_length=0):
			if anlage_ids and cv.anlage_id not in anlage_ids:
				continue
			if not cv.beginn or str(cv.beginn) > z["bis"]:
				continue
			schluessel = f"CV:{cv.anlage_id}:{monat}"
			if _aktiver_beleg(schluessel):
				lauf["vorhanden"] += 1
				continue
			ad = daten_anlage(cv.anlage_id)
			a = ad["anlage"]
			text = f"{a['name']} ({a['id']}) {monat[5:]}/{monat[:4]}"
			vertrag = {**ad["vertrag"], "steuervorlage": (ad["vertrag"] or {}).get("steuervorlage")}
			if cint(e["erpnextSubscription"]) and E.aktiv():
				vertrag["grundgebuehrMonat"] = 0  # Grundgebühr kommt aus der ERPNext Subscription
			r = L.contracting_abrechnen(vertrag, a, monat, ad["messpunkte"], ad["zeilen"], tabelle)
			ges = anlage_gesellschaft(a)
			konto, org = a.get("kundeId"), a.get("organisationId")  # Kunde = Stromabnehmer (Fachprüfung)
			if r["ok"] and not ges["bekannt"]:
				klaeren("contracting", schluessel, {"anlageId": a["id"], "monat": monat}, text, [f"Eigentümergesellschaft {ges['id']} nicht im Gesellschaftsverzeichnis – Rechnungsaussteller unklar."])
				continue
			if not r["ok"] or not (konto or org):
				klaeren("contracting", schluessel, {"anlageId": a["id"], "monat": monat}, text, ["Kein Rechnungsempfänger (Stromabnehmer bzw. Kunde/Organisation) an der Anlage."] if r["ok"] else r["klaerung"])
				continue
			erzeugen({
				"art": "contracting", "gesellschaftId": ges["id"], "empfaengerId": konto, "organisationId": org, "partei": partei(konto, org), "schluessel": schluessel,
				"bezug": {"anlageId": a["id"], "vertragId": (ad["vertrag"] or {}).get("id"), "monat": monat}, "bezugText": text, "zeitraum": z,
				"faelligAm": L.plus_tage(rechnungsdatum or L.heute(), e["zahlungszielTage"]), "positionen": r["positionen"],
				"steuerVorlage": T.steuer_vorschlag("contracting", a.get("land"))["vorlage"], "zaehlerstaende": r["zaehlerstaende"], "hinweise": r["hinweise"],
				"kennzahlen": {"gelieferteKwh": r.get("gelieferteKwh"), "arbeitspreisCt": r.get("arbeitspreisCt"), "monat": monat, "kwp": a.get("kwp")},
				"erklaerung": ["Gelieferter PV-Strom = Erzeugung (geeichter Erzeugungszähler) abzüglich Einspeisung ins Netz. Grundlage: Zählerstand-Monatswerte des Messstellenbetreibers."] if r.get("gelieferteKwh") is not None else ["Abrechnung der monatlichen Grundgebühr laut Contracting-Vertrag."],
			})
	# ---------------------------------------------------------------- Provision
	if art in ("provision", "alle"):
		for pv in frappe.get_all("Plattform Provision", filters={"status": ["in", ["offen", "in_rechnung"]]}, fields=["name", "projekt_id", "anbieter_id", "kaufpreis", "satz", "betrag", "creation"], limit_page_length=0):
			schluessel = f"PV:{pv.name}"
			if _aktiver_beleg(schluessel):
				lauf["vorhanden"] += 1
				continue
			p = frappe.db.get_value("Plattform Projekt", pv.projekt_id, ["titel", "land", "organisation_id"], as_dict=True) or {}
			text = f"Provision {pv.name} – {p.get('titel') or pv.projekt_id}"
			pa = partei(pv.anbieter_id, p.get("organisation_id"))
			land = pa.get("land") or p.get("land") or "AT"
			vs = T.steuer_vorschlag("provision", land, grundstuecksbezug=True)
			tag = str(pv.creation)[:10]
			b = erzeugen({
				"art": "provision", "gesellschaftId": OEKOINVEST_ID, "empfaengerId": pv.anbieter_id, "organisationId": p.get("organisation_id"), "partei": pa, "schluessel": schluessel,
				"bezug": {"provisionId": pv.name, "projektId": pv.projekt_id}, "bezugText": text, "zeitraum": {"von": tag, "bis": tag},
				"faelligAm": L.plus_tage(rechnungsdatum or L.heute(), e["zahlungszielTage"]),
				"positionen": L.provision_positionen({"satz": flt(pv.satz), "kaufpreis": flt(pv.kaufpreis), "betrag": flt(pv.betrag), "projektId": pv.projekt_id}, p.get("titel") or ""),
				"steuerVorlage": vs["vorlage"], "hinweise": vs["hinweise"] + ([] if pa.get("land") else ["Sitz des Anbieters unbekannt – Land des Projekts verwendet."]),
				"erklaerung": [f"Provision laut Provisionsvereinbarung: {L.zahl_de(flt(pv.satz) * 100, 2)} % des Kaufpreises, fällig bei Abschluss."], "kennzahlen": {"kaufpreis": flt(pv.kaufpreis), "satz": flt(pv.satz)},
			})
			if not trockenlauf:
				provision_nachziehen(n, b)
	if not trockenlauf:
		frappe.db.set_value("Plattform Abrechnungslauf", lauf["id"], "ergebnis", als_json({**lauf, "erzeugt": lauf["erzeugt"][:200]}))
		protokoll(n, "abrechnungslauf", "finanzen", lauf["id"], f"Lauf {L.LAUF_ARTEN.get(art, art)} zum {L.datum_de(stichtag)}: {len(lauf['erzeugt'])} Belege, {len(lauf['klaerfaelle'])} Klärfälle")
	return lauf


# ================================================================ Scheduler und Hooks


def lauf_taeglich():
	"""Scheduler (täglich): fällige Pacht-Gutschriften, Provisionsrechnungen; Contracting des Vormonats ab dem 5. des Monats
	(Monatswerte des Messstellenbetreibers liegen dann in der Regel vor – fehlende → Klärfall); ERPNext-Zahlungsstatus."""
	heute_ = L.heute()
	try:
		lauf_ausfuehren(None, "pacht", heute_)
		lauf_ausfuehren(None, "provision", heute_)
		if int(heute_[8:10]) >= 5:
			lauf_ausfuehren(None, "contracting", heute_, L.vormonat(heute_[:7]))
		if E.aktiv():
			for name in frappe.get_all(DT, filters={"status": ["in", ["offen", "angewiesen"]], "erpnext_name": ["is", "set"]}, pluck="name", limit_page_length=0):
				zahlungsstatus_abgleichen(name)
		frappe.db.commit()
	except Exception:  # noqa: BLE001
		frappe.log_error(title="ÖkoInvest Finanzen: täglicher Abrechnungslauf", message=frappe.get_traceback())


def provision_angelegt(doc, method=None):
	"""Hook Plattform Provision after_insert: Provisionsrechnung sofort (Provision entsteht beim Verkauf)."""
	try:
		lauf_ausfuehren(None, "provision", L.heute())
	except Exception:  # noqa: BLE001 – der Verkauf darf nicht an der Rechnung scheitern; der tägliche Lauf holt nach
		frappe.log_error(title="ÖkoInvest Finanzen: Provisionsrechnung", message=frappe.get_traceback())


def zahlungsstatus_abgleichen(abrechnung_name):
	"""Status aus ERPNext (outstanding_amount = 0 → bezahlt) übernehmen; bei Provision den Provisionsstatus nachziehen."""
	doc = frappe.get_doc(DT, abrechnung_name)
	if not doc.erpnext_name or doc.status in ("bezahlt", "storniert"):
		return
	status, offen = E.offener_betrag(doc.erpnext_doctype, doc.erpnext_name)
	if status == "Cancelled":
		doc.db_set({"status": "storniert", "storno_grund": "In ERPNext storniert."})
		return
	if offen is not None and offen <= 0.004 and status in ("Paid", "Credit Note Issued"):
		doc.db_set({"status": "bezahlt", "bezahlt_am": L.heute()})
		b = beleg_dict(doc)
		provision_nachziehen(None, b)
		beleg_melden(b, "bezahlt")

