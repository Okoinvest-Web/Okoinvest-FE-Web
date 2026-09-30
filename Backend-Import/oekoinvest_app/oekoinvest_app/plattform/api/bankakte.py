# Copyright (c) 2026, ÖkoInvest GmbH
#
# Bank-Akte je Finanzierungsanfrage und Bank-Team (docs/API.md, Abschnitt „Bank-Akte“) – Referenz: src/lib/plattform/backend/demo/
# bankakte.js, Regeln: plattform/bankakte_kern.py (= src/lib/plattform/finanzierung/bankakte.js). Ergänzt api/finanzierung.py um:
# Unterlagen-Anforderungen mit Frist · Q&A · Zuständigkeit · Kreditentscheidung · CP-Bestätigung durch die Bank · Auszahlungsanträge ·
# Monitoring-Berichte (Covenant-Report als Momentaufnahme) · Bank-Team (Leitung / Sachbearbeitung / Nur lesen, Einladung).
#
# Rechte:
#   Bank        – Website-Rolle „bank“ UND Konto in `Plattform Bank.konten` der angefragten Bank UND Teamrolle je Aktion
#                 (Plattform Bank Mitglied; ohne Eintrag = Leitung, Erstkontakt über die Einladung von ÖkoInvest)
#   Backoffice  – Bereich „finanzierung“ (rechte.py): lesen ≥ 1, schreiben = 2

import base64
import re
import secrets

import frappe
from frappe.utils import add_days, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import bankakte_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.api import finanzierung as FZ
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.finanzierung_kern import BANKENPAKET, BANKENPAKET_IDS
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, ist_admin, konflikt, name_von, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.konstanten import UPLOAD_MAX_BYTES, UPLOAD_TYPEN
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Bankakte"
DT_MG = "Plattform Bank Mitglied"
EINLADUNG_TAGE = 7


def _bo_lesen(n):
	return ist_admin(n) and stufe(n, "finanzierung") >= 1


def _bo_schreiben(n):
	return ist_admin(n) and stufe(n, "finanzierung") >= 2


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.BankakteFehler as e:
		if e.status == 409:
			konflikt(str(e))
		ungueltig(str(e))


def _mitglieder(bank_id):
	return [{"bankId": m.bank_id, "nutzerId": m.konto_id, "rolle": m.rolle, "status": m.status} for m in frappe.get_all(DT_MG, filters={"bank_id": bank_id, "konto_id": ["is", "set"], "status": ["in", ["aktiv", "entfernt"]]}, fields=["bank_id", "konto_id", "rolle", "status"], limit_page_length=0)]


def bank_rolle(n, bank_id):
	"""Teamrolle des Kontos in der Bank (None = kein Mitglied) – auch von api/finanzierung.bank_aktion genutzt."""
	if not n or "bank" not in (n.get("rollen") or []):
		return None
	konten = aus_json(frappe.db.get_value(FZ.DT_BANK, bank_id, "konten"), []) or []
	return K.rolle_aus(_mitglieder(bank_id), bank_id, konten, n.id)


def _zugriff(n, anfrage_id):
	k = v.kennung(anfrage_id)
	if not k or not frappe.db.exists(FZ.DT_ANFRAGE, k):
		nicht_gefunden("Anfrage nicht gefunden.")
	a = frappe.get_doc(FZ.DT_ANFRAGE, k)
	f = frappe.get_doc(FZ.DT_FALL, a.fall_id)
	if _bo_lesen(n):
		return a, f, "bo", "bo_schreiben" if _bo_schreiben(n) else "bo_lesen"
	rolle = bank_rolle(n, a.bank_id)
	if not rolle:
		verboten("Diese Anfrage richtet sich an eine andere Bank.")
	if a.status == "zurueckgezogen":
		verboten("Die Anfrage wurde zurückgezogen.")
	return a, f, "bank", rolle


def _rolle_noetig(sicht, rolle, aktion):
	if sicht == "bo":
		if rolle != "bo_schreiben":
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzierung & Banken“ kein Schreiben.")
		return
	noetig = K.BANK_AKTION_ROLLE.get(aktion, "leitung")
	if not K.rolle_reicht(rolle, noetig):
		verboten(f"Dafür ist in Ihrem Haus die Rolle „{K.BANK_TEAMROLLEN[noetig]}“ nötig.")


def _akte_doc(a, anlegen=False):
	name = frappe.db.get_value(DT, {"anfrage_id": a.name}, "name")
	if name:
		return frappe.get_doc(DT, name)
	doc = frappe.get_doc({"doctype": DT, "anfrage_id": a.name, "fall_id": a.fall_id, "bank_id": a.bank_id, "daten": als_json({})})
	if anlegen:
		doc.insert(ignore_permissions=True)
	return doc


def _akte(doc):
	x = aus_json(doc.daten, {}) or {}
	for k in ("anforderungen", "qa", "auszahlungen", "berichte", "dateien", "verlauf"):
		x.setdefault(k, [])
	x.setdefault("cpBank", {})
	x["zustaendigId"] = doc.zustaendig_id or None
	return x


def _speichern(doc, x):
	doc.zustaendig_id = x.get("zustaendigId")
	doc.kreditentscheidung = (x.get("kreditentscheidung") or {}).get("ergebnis") or ""
	doc.daten = als_json({k: w for k, w in x.items() if k != "zustaendigId"})
	doc.save(ignore_permissions=True)


def _verlauf(x, n, text):
	x["verlauf"].append({"am": iso(now_datetime()), "von": name_von(n.id) if n else "System", "text": v.text(text, 300)})
	x["verlauf"] = x["verlauf"][-200:]


def _an_bank(a, x, titel, text, mail=True):
	konten = aus_json(frappe.db.get_value(FZ.DT_BANK, a.bank_id, "konten"), []) or []
	ziel = [x["zustaendigId"]] if x.get("zustaendigId") in konten else konten
	for k in ziel:
		benachrichtigen(k, "finanzierung", titel, text, f"/portal/bank/{a.name}", "finanzierung", a.name, mail=mail, mail_betreff=f"ÖkoInvest: {titel}", mail_text="Es gibt Neuigkeiten zu einer Finanzierungsanfrage. Details sehen Sie nach der Anmeldung im Portal.")


def _id(praefix):
	return f"{praefix}-" + secrets.token_hex(5).upper()


# ================================================================ Ausgabe


def _ausgabe(a, f, sicht, rolle):
	doc = _akte_doc(a)
	x = _akte(doc)
	h = nowdate()
	dateien = {d["id"]: d for d in x["dateien"]}

	def dat(i):
		d = dateien.get(i)
		return {"id": d["id"], "name": d["name"], "mime": d["mime"], "groesse": d["groesse"], "am": d["am"], "link": f"/api/admin/finanzierung/bankakte/{a.name}/dateien/{d['id']}" if sicht == "bo" else f"/api/portal/bank/{a.name}/akte/dateien/{d['id']}"} if d else None

	ausgewaehlt = a.status == "ausgewaehlt"
	kv = FZ._kv_json(f) if ausgewaehlt else None
	cps_roh = aus_json(f.cps, []) or []
	cps = []
	for c in cps_roh if ausgewaehlt else []:
		bk = x["cpBank"].get(c.get("id"))
		cps.append({**c, "bank": bk if bk and bk.get("cpAm") == c.get("am") else None})
	cp_gueltig = {c["id"]: {"status": c["bank"]["status"]} for c in cps if c.get("bank")}
	cov = aus_json(f.covenant, None) if kv else None
	ts = FZ._neueste_ts(a.name)
	konten = aus_json(frappe.db.get_value(FZ.DT_BANK, a.bank_id, "konten"), []) or []
	mg = _mitglieder(a.bank_id)
	ke = x.get("kreditentscheidung")
	return {
		"anfrageId": a.name, "fallId": f.name, "bank": frappe.db.get_value(FZ.DT_BANK, a.bank_id, "bank_name") or "", "bankId": a.bank_id, "anfrageStatus": a.status, "titel": f.titel,
		"sicht": sicht, "rolle": rolle, "rolleLabel": K.BANK_TEAMROLLEN.get(rolle) or ("Backoffice" if sicht == "bo" else ""),
		"zustaendig": {"id": x["zustaendigId"], "name": name_von(x["zustaendigId"])} if x.get("zustaendigId") else None,
		"team": [{"id": k, "name": name_von(k), "rolle": K.rolle_aus(mg, a.bank_id, konten, k)} for k in konten if K.rolle_aus(mg, a.bank_id, konten, k)],
		"anforderungen": [{**y, "bausteinLabel": next((b[1] for b in BANKENPAKET if b[0] == y.get("baustein")), ""), "ueberfaellig": y["status"] in ("offen", "nachforderung") and y.get("frist", "") < h, "lieferung": {**y["lieferung"], "dateien": [dd for dd in (dat(i) for i in y["lieferung"].get("dateiIds") or []) if dd]} if y.get("lieferung") else None} for y in x["anforderungen"]],
		"qa": list(reversed([{**q, "kategorieLabel": K.QA_KATEGORIEN.get(q.get("kategorie")), "von": name_von(q.get("vonId")), "antwort": {**q["antwort"], "dateien": [dd for dd in (dat(i) for i in q["antwort"].get("dateiIds") or []) if dd]} if q.get("antwort") else None} for q in x["qa"]])),
		"kreditentscheidung": {**ke, "label": K.KREDIT_ERGEBNIS.get(ke.get("ergebnis")), "ton": {"genehmigt": "ok", "genehmigt_auflagen": "warn", "abgelehnt": "rot"}.get(ke.get("ergebnis"))} if ke else None,
		"termsheetBetrag": (aus_json(ts.termsheet, {}) or {}).get("betrag") if ts else None,
		"kreditvertrag": kv, "cps": cps, "cpOffen": len(K.cp_offen(cps_roh, cp_gueltig)) if kv else None,
		"auszahlungen": list(reversed(x["auszahlungen"])), "ausgezahlt": sum(y["betrag"] for y in x["auszahlungen"] if y["status"] == "ausgezahlt"),
		"covenant": {"ampel": cov.get("ampel"), "letzte": cov.get("letzte"), "llcr": cov.get("llcr"), "restschuld": cov.get("restschuld"), "geprueftAm": cov.get("geprueftAm"), "pruefungen": (cov.get("pruefungen") or [])[-8:]} if cov else None,
		"reporting": {"naechsteFrist": str(f.reporting_frist or ""), "zuletzt": iso(f.reporting_zuletzt)} if kv else None,
		"berichte": list(reversed([{**{k: w for k, w in y.items() if k != "snapshot"}, "artLabel": K.BERICHT_ARTEN.get(y.get("art")), "ueberfaellig": y["status"] == "angefordert" and y.get("faelligAm") and y["faelligAm"] < h, "datei": dat(y.get("dateiId")) if y.get("dateiId") else None, "pdf": (f"/api/admin/finanzierung/bankakte/{a.name}/berichte/{y['id']}" if sicht == "bo" else f"/api/portal/bank/{a.name}/akte/berichte/{y['id']}") if y.get("snapshot") else None} for y in x["berichte"]])),
		"bausteine": [{"id": b[0], "label": b[1], "freigegeben": b[0] in (aus_json(f.paket_freigabe, []) or [])} for b in BANKENPAKET if b[2] != "auto"],
		"stand": K.akte_stand(x, h), "verlauf": list(reversed(x["verlauf"][-40:])),
	}


# ================================================================ Lesen


@frappe.whitelist(methods=["POST"])
def akte(anfrageId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a, f, sicht, rolle = _zugriff(n, anfrageId)
	return _ausgabe(a, f, sicht, rolle)


@frappe.whitelist(methods=["POST"])
def staende(fallId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	filt = {"fall_id": v.kennung(fallId)} if v.kennung(fallId) else {}
	if not _bo_lesen(n):
		filt["bank_id"] = ["in", FZ._banken_des_kontos(n) or ["-"]]
	out = {}
	for an in frappe.get_all(FZ.DT_ANFRAGE, filters=filt, pluck="name", limit_page_length=300):
		try:
			a, _f, _s, rolle = _zugriff(n, an)
		except frappe.PermissionError:
			continue
		x = _akte(_akte_doc(a))
		out[an] = {**K.akte_stand(x, nowdate()), "zustaendig": name_von(x["zustaendigId"]) if x.get("zustaendigId") else "", "kredit": (x.get("kreditentscheidung") or {}).get("ergebnis"), "rolle": rolle}
	return out


# ================================================================ Aktionen


@frappe.whitelist(methods=["POST"])
def aktion(anfrageId=None, daten=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	art = v.text(d.get("aktion"), 40)
	a, f, sicht, rolle = _zugriff(n, anfrageId)
	_rolle_noetig(sicht, rolle, art)
	doc = _akte_doc(a, anlegen=True)
	x = _akte(doc)
	h = nowdate()
	bank = frappe.db.get_value(FZ.DT_BANK, a.bank_id, "bank_name") or "Bank"
	melde_bo = lambda titel, text, mail=True: FZ._backoffice_melden(titel, text, f"/portal/admin/finanzierung/{f.name}?tab=banken", f.name, mail=mail)  # noqa: E731

	def nur(seite):
		if sicht != seite:
			verboten("Diesen Schritt erledigt die Bank." if seite == "bank" else "Diesen Schritt erledigt ÖkoInvest.")

	def eigene_dateien(ids):
		bekannt = {y["id"] for y in x["dateien"]}
		return [i for i in (ids or []) if i in bekannt]

	if art == "anforderung":
		nur("bank")
		if a.status in ("abgesagt", "nicht_ausgewaehlt"):
			konflikt("Die Anfrage ist abgeschlossen.")
		liste = _fach(K.anforderungen_bereinigen, d, h, BANKENPAKET_IDS)
		for p in liste:
			x["anforderungen"].append({"id": _id("BU"), **p, "status": "offen", "vonId": n.id, "am": iso(now_datetime())})
		_verlauf(x, n, f"{len(liste)} Unterlage(n) angefordert")
		melde_bo(f"Unterlagen angefordert: {bank}", f"{len(liste)} Punkt(e) – {f.titel}")
	elif art == "anforderung_liefern":
		nur("bo")
		y = next((z for z in x["anforderungen"] if z["id"] == str(d.get("anforderungId") or "")), None)
		if not y:
			nicht_gefunden("Anforderung nicht gefunden.")
		if y["status"] not in ("offen", "nachforderung"):
			konflikt("Diese Anforderung ist bereits beantwortet.")
		text = v.mehrzeilig(d.get("text"), 2000)
		ids = eigene_dateien(d.get("dateiIds"))
		frei = bool(y.get("baustein")) and v.wahr(d.get("bausteinFreigeben"))
		if len(text) < 3 and not ids and not frei:
			ungueltig("Bitte eine Antwort, eine Datei oder die Freigabe des Bausteins angeben.")
		if frei:
			pf = aus_json(f.paket_freigabe, []) or []
			if y["baustein"] not in pf:
				f.paket_freigabe = als_json(pf + [y["baustein"]])
				FZ._verlauf(f, n, f"Baustein {y['baustein']} auf Anforderung von {bank} freigegeben")
				f.save(ignore_permissions=True)
		y["status"] = "geliefert"
		y["lieferung"] = {"text": text, "dateiIds": ids, "bausteinFreigegeben": frei, "am": iso(now_datetime()), "von": name_von(n.id)}
		_verlauf(x, n, f"Unterlage geliefert: {y['titel']}")
		_an_bank(a, x, f"Unterlage geliefert: {y['titel']}", f.titel)
	elif art == "anforderung_pruefen":
		nur("bank")
		y = next((z for z in x["anforderungen"] if z["id"] == str(d.get("anforderungId") or "")), None)
		if not y:
			nicht_gefunden("Anforderung nicht gefunden.")
		if y["status"] != "geliefert":
			konflikt("Nur gelieferte Unterlagen lassen sich prüfen.")
		erg = v.auswahl(d.get("ergebnis"), ["akzeptiert", "nachforderung"], "")
		if not erg:
			ungueltig("Bitte „akzeptieren“ oder „nachfordern“ wählen.")
		kommentar = v.text(d.get("kommentar"), 500)
		if erg == "nachforderung":
			if len(kommentar) < 5:
				ungueltig("Bitte beschreiben, was noch fehlt.")
			frist = K._datum(d.get("frist"))
			if frist:
				if frist <= h:
					ungueltig("Die neue Frist muss in der Zukunft liegen.")
				y["frist"] = frist
		y["status"] = erg
		y["pruefung"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": kommentar}
		_verlauf(x, n, f"{y['titel']}: {erg}")
		melde_bo(f"{bank}: {'akzeptiert' if erg == 'akzeptiert' else 'Nachforderung'} – {y['titel']}", kommentar or f.titel, mail=erg == "nachforderung")
	elif art == "frage":
		nur("bank")
		q = _fach(K.frage_bereinigen, d)
		x["qa"].append({"id": _id("BQ"), **q, "status": "offen", "vonId": n.id, "am": iso(now_datetime()), "antwort": None})
		FZ._anfrage_verlauf(a, f"Frage der Bank ({K.QA_KATEGORIEN[q['kategorie']]}): {q['frage'][:200]}")
		a.save(ignore_permissions=True)
		_verlauf(x, n, "Frage gestellt")
		melde_bo(f"Frage einer Bank: {bank}", q["frage"][:160], mail=False)
	elif art == "antwort":
		nur("bo")
		q = next((z for z in x["qa"] if z["id"] == str(d.get("frageId") or "")), None)
		if not q:
			nicht_gefunden("Frage nicht gefunden.")
		text = v.mehrzeilig(d.get("text"), 4000)
		if len(text) < 3:
			ungueltig("Bitte die Antwort eingeben.")
		q["antwort"] = {"text": text, "dateiIds": eigene_dateien(d.get("dateiIds")), "am": iso(now_datetime()), "von": name_von(n.id)}
		q["status"] = "beantwortet"
		_verlauf(x, n, "Frage beantwortet")
		_an_bank(a, x, "Antwort auf Ihre Frage", f.titel)
	elif art == "zustaendig":
		nur("bank")
		kid = v.kennung(d.get("nutzerId"))
		konten = aus_json(frappe.db.get_value(FZ.DT_BANK, a.bank_id, "konten"), []) or []
		if kid not in konten or not K.rolle_aus(_mitglieder(a.bank_id), a.bank_id, konten, kid):
			ungueltig("Zuständig kann nur ein aktives Mitglied Ihres Hauses sein.")
		x["zustaendigId"] = kid
		_verlauf(x, n, f"Zuständig: {name_von(kid)}")
		if kid != n.id:
			benachrichtigen(kid, "finanzierung", "Ihnen wurde eine Finanzierungsanfrage zugewiesen", f.titel, f"/portal/bank/{a.name}", "finanzierung", a.name)
	elif art == "kreditentscheidung":
		nur("bank")
		if FZ._kv_json(f):
			konflikt("Der Kreditvertrag ist bereits erfasst.")
		ts = FZ._neueste_ts(a.name)
		k = _fach(K.kreditentscheidung_bereinigen, d.get("entscheidung") or {}, a.status, (aus_json(ts.termsheet, {}) or {}).get("betrag") if ts else None, h)
		x["kreditentscheidung"] = {**k, "am": iso(now_datetime()), "vonId": n.id, "von": name_von(n.id)}
		FZ._anfrage_verlauf(a, f"Kreditentscheidung: {K.KREDIT_ERGEBNIS[k['ergebnis']]}")
		a.save(ignore_permissions=True)
		FZ._verlauf(f, n, f"Kreditentscheidung {bank}: {K.KREDIT_ERGEBNIS[k['ergebnis']]}")
		f.save(ignore_permissions=True)
		_verlauf(x, n, f"Kreditentscheidung: {K.KREDIT_ERGEBNIS[k['ergebnis']]}")
		melde_bo(f"Kreditentscheidung {bank}: {K.KREDIT_ERGEBNIS[k['ergebnis']]}", k["begruendung"][:160] if k["ergebnis"] == "abgelehnt" else f"{k['betrag']} €, gültig bis {k['gueltigBis']}")
	elif art == "cp_bestaetigen":
		nur("bank")
		if a.status != "ausgewaehlt" or not FZ._kv_json(f):
			konflikt("CPs bestätigt die ausgewählte Bank nach Erfassung des Kreditvertrags.")
		cp = next((c for c in (aus_json(f.cps, []) or []) if c.get("id") == v.text(d.get("cpId"), 40)), None)
		if not cp:
			nicht_gefunden("Auszahlungsvoraussetzung nicht gefunden.")
		if not cp.get("erledigt"):
			konflikt("Diese Voraussetzung ist von ÖkoInvest noch nicht als erfüllt gemeldet.")
		st = v.auswahl(d.get("status"), ["bestaetigt", "beanstandet"], "")
		if not st:
			ungueltig("Bitte „bestätigen“ oder „beanstanden“ wählen.")
		kommentar = v.text(d.get("kommentar"), 500)
		if st == "beanstandet" and len(kommentar) < 5:
			ungueltig("Bitte die Beanstandung begründen.")
		x["cpBank"][cp["id"]] = {"status": st, "kommentar": kommentar, "am": iso(now_datetime()), "von": name_von(n.id), "cpAm": cp.get("am")}
		_verlauf(x, n, f"CP {cp.get('label')}: {st}")
		if st == "beanstandet":
			melde_bo(f"CP beanstandet: {cp.get('label')}", f"{bank}: {kommentar}")
	elif art == "auszahlung_beantragen":
		nur("bo")
		if a.status != "ausgewaehlt":
			konflikt("Auszahlungen beantragt ÖkoInvest bei der ausgewählten Bank.")
		if (x.get("kreditentscheidung") or {}).get("ergebnis") == "abgelehnt":
			konflikt("Die Bank hat den Kredit abgelehnt.")
		cps = aus_json(f.cps, []) or []
		cp_bank = {i: y for i, y in x["cpBank"].items() if next((c for c in cps if c.get("id") == i), {}).get("am") == y.get("cpAm")}
		z = _fach(K.auszahlung_bereinigen, d, FZ._kv_json(f), cps, cp_bank, x["auszahlungen"], h)
		x["auszahlungen"].append({"id": _id("BZ"), **z, "status": "beantragt", "am": iso(now_datetime()), "von": name_von(n.id)})
		_verlauf(x, n, f"Auszahlung beantragt: {z['betrag']} € zum {z['wunschDatum']}")
		_an_bank(a, x, "Auszahlungsantrag", f"{z['betrag']} € zum {z['wunschDatum']} – {f.titel}")
	elif art == "auszahlung_entscheiden":
		nur("bank")
		y = next((z for z in x["auszahlungen"] if z["id"] == str(d.get("auszahlungId") or "")), None)
		if not y:
			nicht_gefunden("Auszahlungsantrag nicht gefunden.")
		erg = v.auswahl(d.get("ergebnis"), ["freigegeben", "ausgezahlt", "abgelehnt"], "")
		if not erg:
			ungueltig("Bitte eine Entscheidung wählen.")
		if erg == "ausgezahlt" and y["status"] != "freigegeben":
			konflikt("Ausgezahlt werden nur freigegebene Anträge.")
		if erg != "ausgezahlt" and y["status"] != "beantragt":
			konflikt("Der Antrag ist bereits entschieden.")
		kommentar = v.text(d.get("kommentar"), 500)
		if erg == "abgelehnt" and len(kommentar) < 5:
			ungueltig("Bitte die Ablehnung begründen.")
		if erg == "ausgezahlt":
			valuta = K._datum(d.get("valuta"))
			if not valuta or valuta > h:
				ungueltig("Bitte das Valutadatum angeben (nicht in der Zukunft).")
			y["valuta"] = valuta
			kv_name = frappe.db.get_value(FZ.DT_KV, {"fall_id": f.name}, "name")
			if kv_name and not frappe.db.get_value(FZ.DT_KV, kv_name, "auszahlung_am"):
				frappe.db.set_value(FZ.DT_KV, kv_name, "auszahlung_am", valuta)
			if f.status == "vertrag":
				f.status = "auszahlung"
				FZ._verlauf(f, n, f"Erste Auszahlung {y['betrag']} € (Valuta {valuta})")
				f.save(ignore_permissions=True)
		y["status"] = erg
		y["entscheid"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": kommentar}
		_verlauf(x, n, f"Auszahlung {y['betrag']} €: {erg}")
		melde_bo(f"Auszahlung {erg}: {bank}", f"{y['betrag']} € – {f.titel}", mail=erg != "freigegeben")
	elif art == "bericht_anfordern":
		nur("bank")
		if a.status != "ausgewaehlt":
			konflikt("Berichte fordert die finanzierende Bank an.")
		b = _fach(K.bericht_bereinigen, d, h, True)
		x["berichte"].append({"id": _id("BR"), **b, "status": "angefordert", "vonId": n.id, "am": iso(now_datetime())})
		_verlauf(x, n, f"Bericht angefordert: {b['art']} {b['periode']}")
		melde_bo(f"Bericht angefordert: {K.BERICHT_ARTEN[b['art']]}", f"{bank} – {b['periode']}, fällig {b['faelligAm']}")
	elif art == "bericht_einreichen":
		nur("bo")
		if a.status != "ausgewaehlt":
			konflikt("Berichte gehen an die finanzierende Bank.")
		y = next((z for z in x["berichte"] if z["id"] == str(d.get("berichtId") or "")), None) if d.get("berichtId") else None
		if d.get("berichtId") and not y:
			nicht_gefunden("Bericht nicht gefunden.")
		if y and y["status"] not in ("angefordert", "beanstandet"):
			konflikt("Dieser Bericht ist bereits eingereicht.")
		if not y:
			b = _fach(K.bericht_bereinigen, {"art": d.get("art"), "periode": d.get("periode"), "bemerkung": d.get("bemerkung")}, h)
			y = {"id": _id("BR"), **b, "faelligAm": "", "vonId": n.id, "am": iso(now_datetime())}
			x["berichte"].append(y)
		did = str(d.get("dateiId") or "")
		if did and did not in {z["id"] for z in x["dateien"]}:
			ungueltig("Datei nicht gefunden.")
		if y["art"] == "covenant":
			kv = FZ._kv_json(f)
			cov = aus_json(f.covenant, None)
			if not kv:
				konflikt("Covenant-Reports gibt es erst mit Kreditvertrag.")
			if not cov:
				konflikt("Noch keine Covenant-Prüfung – bitte im Reiter „Covenants & Reporting“ prüfen lassen.")
			y["snapshot"] = {"fall": {"titel": f.titel}, "kreditvertrag": kv, "covenant": {"ampel": cov.get("ampel"), "letzte": cov.get("letzte"), "llcr": cov.get("llcr"), "restschuld": cov.get("restschuld"), "pruefungen": (cov.get("pruefungen") or [])[-8:], "monate": (cov.get("monate") or [])[-12:]}}
			y["kennzahlen"] = {"dscr": (cov.get("letzte") or {}).get("dscr"), "llcr": cov.get("llcr"), "ampel": (cov.get("ampel") or {}).get("id") or "grau"}
			f.reporting_zuletzt = now_datetime()
			f.reporting_gemahnt = 0
			f.save(ignore_permissions=True)
		elif not did:
			ungueltig("Bitte den Bericht als Datei hochladen.")
		y.update({"dateiId": did or y.get("dateiId"), "status": "eingereicht", "eingereichtAm": iso(now_datetime()), "bemerkung": v.text(d.get("bemerkung"), 1000) or y.get("bemerkung") or ""})
		_verlauf(x, n, f"Bericht eingereicht: {y['art']} {y['periode']}")
		_an_bank(a, x, f"Bericht eingereicht: {K.BERICHT_ARTEN[y['art']]}", f"{y['periode']} – {f.titel}")
	elif art == "bericht_pruefen":
		nur("bank")
		y = next((z for z in x["berichte"] if z["id"] == str(d.get("berichtId") or "")), None)
		if not y:
			nicht_gefunden("Bericht nicht gefunden.")
		if y["status"] != "eingereicht":
			konflikt("Nur eingereichte Berichte lassen sich prüfen.")
		erg = v.auswahl(d.get("ergebnis"), ["geprueft", "beanstandet"], "")
		if not erg:
			ungueltig("Bitte „geprüft“ oder „beanstanden“ wählen.")
		kommentar = v.text(d.get("kommentar"), 500)
		if erg == "beanstandet" and len(kommentar) < 5:
			ungueltig("Bitte die Beanstandung begründen.")
		y["status"] = erg
		y["pruefung"] = {"am": iso(now_datetime()), "von": name_von(n.id), "kommentar": kommentar}
		_verlauf(x, n, f"Bericht {y['periode']}: {erg}")
		melde_bo(f"Bericht {erg}: {K.BERICHT_ARTEN[y['art']]}", f"{bank} – {y['periode']}", mail=erg == "beanstandet")
	else:
		ungueltig("Unbekannte Aktion.")
	_speichern(doc, x)
	protokoll(n, f"bankakte_{art}", "finanzierung", a.name, f"Bank-Akte: {art}")
	return {"ok": True, "akte": _ausgabe(a, frappe.get_doc(FZ.DT_FALL, f.name), sicht, rolle)}


@frappe.whitelist(methods=["POST"])
def datei_speichern(anfrageId=None, name=None, mime=None, inhalt=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a, f, sicht, rolle = _zugriff(n, anfrageId)
	if sicht == "bo" and rolle != "bo_schreiben":
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzierung & Banken“ kein Schreiben.")
	if sicht == "bank" and not K.rolle_reicht(rolle, "sachbearbeiter"):
		verboten("Mit der Rolle „Nur lesen“ können Sie keine Dateien hochladen.")
	if mime not in UPLOAD_TYPEN:
		ungueltig("Erlaubt sind PDF, JPG und PNG.")
	daten = base64.b64decode(inhalt or "")
	if not daten or len(daten) > UPLOAD_MAX_BYTES:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	doc = _akte_doc(a, anlegen=True)
	x = _akte(doc)
	if len(x["dateien"]) >= 200:
		konflikt("Für diese Anfrage sind bereits sehr viele Dateien hinterlegt.")
	did = _id("BD")
	datei = frappe.get_doc({"doctype": "File", "file_name": f"{doc.name}-{did}.{UPLOAD_TYPEN[mime]}", "is_private": 1, "content": daten, "attached_to_doctype": DT, "attached_to_name": doc.name}).insert(ignore_permissions=True)
	eintrag = {"id": did, "seite": sicht, "name": v.text(str(name or "").replace("/", "_").replace("\\", "_"), 160) or f"datei.{UPLOAD_TYPEN[mime]}", "mime": mime, "groesse": len(daten), "datei": datei.file_url, "sha256": sha256(daten), "vonId": n.id, "am": iso(now_datetime())}
	x["dateien"].append(eintrag)
	_speichern(doc, x)
	protokoll(n, "bankakte_datei", "finanzierung", a.name, f"Bank-Akte: Datei {eintrag['name']}")
	link = f"/api/admin/finanzierung/bankakte/{a.name}/dateien/{did}" if sicht == "bo" else f"/api/portal/bank/{a.name}/akte/dateien/{did}"
	return {"ok": True, "datei": {"id": did, "name": eintrag["name"], "mime": mime, "groesse": len(daten), "am": eintrag["am"], "link": link}}


@frappe.whitelist(methods=["POST"])
def datei_lesen(anfrageId=None, dateiId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a, _f, _s, _r = _zugriff(n, anfrageId)
	x = _akte(_akte_doc(a))
	d = next((y for y in x["dateien"] if y["id"] == str(dateiId or "")), None)
	if not d:
		nicht_gefunden("Datei nicht gefunden.")
	datei = frappe.get_doc("File", {"file_url": d["datei"]})
	protokoll(n, "download", "finanzierung", a.name, f"Bank-Akte: {d['name']} abgerufen", ip or "")
	return {"name": d["name"], "mime": d["mime"], "inhalt": base64.b64encode(datei.get_content()).decode()}


@frappe.whitelist(methods=["POST"])
def bericht_daten(anfrageId=None, berichtId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a, _f, _s, _r = _zugriff(n, anfrageId)
	x = _akte(_akte_doc(a))
	y = next((z for z in x["berichte"] if z["id"] == str(berichtId or "") and z.get("snapshot")), None)
	if not y:
		nicht_gefunden("Bericht nicht gefunden.")
	protokoll(n, "download", "finanzierung", a.name, f"Covenant-Report {y['periode']} abgerufen", ip or "")
	return {**y["snapshot"], "periode": y["periode"], "ersteller": name_von(n.id)}


# ================================================================ Bank-Team


def _eigene_bank(n, bank_id=None):
	ids = FZ._banken_des_kontos(n)
	b = v.kennung(bank_id) if bank_id else (ids[0] if ids else None)
	if not b or b not in ids or not bank_rolle(n, b):
		verboten("Nur für Mitglieder eines Finanzierungspartners.")
	return b


def _domain(email):
	return str(email or "").split("@")[-1] if "@" in str(email or "") else ""


@frappe.whitelist(methods=["POST"])
def team(bankId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	b = _eigene_bank(n, bankId)
	rolle = bank_rolle(n, b)
	konten = aus_json(frappe.db.get_value(FZ.DT_BANK, b, "konten"), []) or []
	mg = _mitglieder(b)
	return {
		"bank": {"id": b, "name": frappe.db.get_value(FZ.DT_BANK, b, "bank_name")}, "rolle": rolle, "rolleLabel": K.BANK_TEAMROLLEN.get(rolle), "darfVerwalten": rolle == "leitung",
		"rollen": {k: {"label": w, "text": ""} for k, w in K.BANK_TEAMROLLEN.items()},
		"mitglieder": [{"id": k, "name": name_von(k), "email": frappe.db.get_value("Plattform Konto", k, "email") or "", "rolle": K.rolle_aus(mg, b, konten, k), "ich": k == n.id} for k in konten if K.rolle_aus(mg, b, konten, k)],
		"einladungen": [{"id": e.name, "email": e.email, "rolle": e.rolle, "ablauf": iso(e.einladung_ablauf)} for e in frappe.get_all(DT_MG, filters={"bank_id": b, "status": "eingeladen", "einladung_ablauf": [">", now_datetime()]}, fields=["name", "email", "rolle", "einladung_ablauf"])] if rolle == "leitung" else [],
		"domain": _domain(n.email),
	}


@frappe.whitelist(methods=["POST"])
def team_aktion(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("aktion"), ["einladen", "rolle", "entfernen", "widerrufen"], "")
	if not art:
		ungueltig("Unbekannte Aktion.")
	b = _eigene_bank(n, d.get("bankId"))
	if bank_rolle(n, b) != "leitung":
		verboten("Das Team verwaltet die Leitung Ihres Hauses.")
	rolle = d.get("rolle") if d.get("rolle") in K.BANK_TEAMROLLEN else ""
	bank = frappe.get_doc(FZ.DT_BANK, b)
	konten = aus_json(bank.konten, []) or []
	demo_link = None
	if art == "einladen":
		email = v.email(d.get("email"))
		if not email:
			ungueltig("Bitte eine gültige E-Mail-Adresse angeben.")
		if not rolle:
			ungueltig("Bitte eine Rolle wählen.")
		if _domain(email) != _domain(n.email):
			ungueltig(f"Einladen lassen sich nur Adressen Ihres Hauses (@{_domain(n.email)}). Andere Adressen richtet ÖkoInvest auf Anfrage ein.")
		kid = frappe.db.get_value("Plattform Konto", {"email": email}, "name")
		if kid and kid in konten:
			konflikt("Diese Person gehört bereits zum Team.")
		for e in frappe.get_all(DT_MG, filters={"bank_id": b, "email": email, "status": "eingeladen"}, pluck="name"):
			frappe.db.set_value(DT_MG, e, "status", "ersetzt")
		token = secrets.token_urlsafe(32)
		frappe.get_doc({"doctype": DT_MG, "bank_id": b, "email": email, "rolle": rolle, "status": "eingeladen", "einladung_hash": sha256(token), "einladung_ablauf": add_days(now_datetime(), EINLADUNG_TAGE), "eingeladen_von": n.id}).insert(ignore_permissions=True)
		from oekoinvest_app.plattform.mail import basis_url

		link = f"{basis_url().rstrip('/')}/einladung/bankteam/{token}"  # Basis-URL aus site_config, nie aus dem Request
		FZ._bank_mail(email, email, f"Einladung in das Bank-Portal von ÖkoInvest ({bank.bank_name})", f"{name_von(n.id)} lädt Sie als „{K.BANK_TEAMROLLEN[rolle]}“ in das Bank-Portal ein. Der Link ist persönlich, {EINLADUNG_TAGE} Tage gültig und nur mit Anmeldung unter dieser E-Mail-Adresse nutzbar.", link)
		if frappe.conf.get("developer_mode"):
			demo_link = link
	elif art == "widerrufen":
		e = v.kennung(d.get("einladungId"))
		if not e or frappe.db.get_value(DT_MG, e, ["bank_id", "status"]) != (b, "eingeladen"):
			nicht_gefunden("Einladung nicht gefunden.")
		frappe.db.set_value(DT_MG, e, "status", "widerrufen")
	else:
		kid = v.kennung(d.get("nutzerId"))
		if kid not in konten:
			nicht_gefunden("Mitglied nicht gefunden.")
		if kid == n.id:
			konflikt("Die eigene Rolle ändert eine andere Person der Leitung.")
		mg = _mitglieder(b)
		leitungen = [k for k in konten if K.rolle_aus(mg, b, konten, k) == "leitung"]
		name = frappe.db.get_value(DT_MG, {"bank_id": b, "konto_id": kid}, "name")
		m = frappe.get_doc(DT_MG, name) if name else frappe.get_doc({"doctype": DT_MG, "bank_id": b, "konto_id": kid, "email": frappe.db.get_value("Plattform Konto", kid, "email"), "rolle": "leitung", "status": "aktiv"})
		if art == "rolle":
			if not rolle:
				ungueltig("Bitte eine Rolle wählen.")
			if m.rolle == "leitung" and rolle != "leitung" and len(leitungen) <= 1:
				konflikt("Mindestens eine Person muss die Leitung behalten.")
			m.rolle = rolle
		else:
			if m.rolle == "leitung" and len(leitungen) <= 1:
				konflikt("Mindestens eine Person muss die Leitung behalten.")
			m.status = "entfernt"
			bank.konten = als_json([k for k in konten if k != kid])
			bank.save(ignore_permissions=True)
			for akte_name in frappe.get_all(DT, filters={"bank_id": b, "zustaendig_id": kid}, pluck="name"):
				frappe.db.set_value(DT, akte_name, "zustaendig_id", None)
		m.save(ignore_permissions=True) if name else m.insert(ignore_permissions=True)
	protokoll(n, f"bankteam_{art}", "finanzierung", b, f"Bank-Team: {art}")
	out = {"ok": True, "team": team(b, als_benutzer)}
	if demo_link:
		out["demoLink"] = demo_link
	return out


def _einladung(token):
	t = str(token or "")
	if not re.match(r"^[A-Za-z0-9_-]{20,200}$", t):
		return None
	name = frappe.db.get_value(DT_MG, {"einladung_hash": sha256(t)}, "name")
	return frappe.get_doc(DT_MG, name) if name else None


@frappe.whitelist(methods=["POST"])
def team_einladung_info(token=None):
	from oekoinvest_app.plattform.kern import api_pruefen

	api_pruefen()
	e = _einladung(token)
	if not e or e.status != "eingeladen" or get_datetime(e.einladung_ablauf) < now_datetime():
		return {"gueltig": False}
	return {"gueltig": True, "email": e.email, "bank": frappe.db.get_value(FZ.DT_BANK, e.bank_id, "bank_name") or "", "rolle": K.BANK_TEAMROLLEN.get(e.rolle, e.rolle), "ablauf": iso(e.einladung_ablauf)}


@frappe.whitelist(methods=["POST"])
def team_einladung_annehmen(token=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	e = _einladung(token)
	if not e or e.status != "eingeladen" or get_datetime(e.einladung_ablauf) < now_datetime():
		ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.")
	konto = frappe.get_doc("Plattform Konto", n.id)
	if konto.email != e.email:
		verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.")
	rollen = [r.rolle for r in konto.rollen]
	if "admin" in rollen:
		konflikt("Backoffice-Konten können nicht Mitglied einer Bank sein.")
	if "bank" not in rollen:
		konto.append("rollen", {"rolle": "bank"})
		konto.save(ignore_permissions=True)
	bank = frappe.get_doc(FZ.DT_BANK, e.bank_id)
	konten = aus_json(bank.konten, []) or []
	if n.id not in konten:
		bank.konten = als_json(konten + [n.id])
		bank.save(ignore_permissions=True)
	for alt in frappe.get_all(DT_MG, filters={"bank_id": e.bank_id, "konto_id": n.id, "name": ["!=", e.name]}, pluck="name"):
		frappe.db.set_value(DT_MG, alt, "status", "ersetzt")
	e.konto_id = n.id
	e.status = "aktiv"
	e.einladung_hash = None
	e.save(ignore_permissions=True)
	if e.eingeladen_von:
		benachrichtigen(e.eingeladen_von, "finanzierung", "Einladung angenommen", f"{name_von(n.id)} ist jetzt Mitglied Ihres Teams.", "/portal/bank/team", "finanzierung", e.bank_id, mail=False)
	protokoll(n, "bankteam_beitritt", "finanzierung", e.bank_id, f"Bank-Team beigetreten ({bank.bank_name}, {e.rolle})")
	return {"ok": True, "bank": bank.bank_name}
