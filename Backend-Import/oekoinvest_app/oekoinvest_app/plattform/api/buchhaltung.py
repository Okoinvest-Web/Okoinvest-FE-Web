# Copyright (c) 2026, ÖkoInvest GmbH
#
# Buchhaltung (Team 8 „Backoffice-Werkzeuge“) – Referenz: src/lib/plattform/backend/demo/buchhaltung.js, Logik: buchhaltung_kern.py.
# Mahnwesen (Stufen/Gebühren/Zinsen konfigurierbar, Mahnbeleg MA-…), Storno-/Korrekturbeleg (ST-…), Zahlungseingang
# (CAMT/CSV) mit Zuordnung, OP-Liste, Nummernkreise, DATEV-/BMD-Export, Monatsabschluss.
# Mahnungen, Teilzahlungen und Mahnsperre liegen in Plattform Abrechnung.daten (mahnungen, zahlungen, mahnsperre).
#
# Rechte (jede Methode selbst, rechte.py): Bereich „finanzen“ lesen ≥ 1, schreiben = 2 (Leitung, Buchhaltung);
# Exporte zusätzlich „export“ ≥ 1. Empfänger sehen eigene Mahnungen/Stornobelege (beleg_dokument, meine_dokumente).
# Mit ERPNext: Zahlungsabgleich bevorzugt über ERPNext (Bank Reconciliation); dieser Import dient dem Eigenbetrieb.

import frappe
from frappe.model.naming import make_autoname
from frappe.utils import cint, now_datetime

from oekoinvest_app.plattform import buchhaltung_kern as B
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.finanzen import abrechnung as A
from oekoinvest_app.plattform.finanzen import erpnext as E
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.finanzen.sepa import iban_maskieren
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.organisation import team_rolle
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Abrechnung"
EIN = "Plattform Buchhaltung Einstellungen"
KREIS_LABEL = {"PG": "Pacht-Gutschriften", "CR": "Contracting-Rechnungen", "PR": "Provisionsrechnungen", "ST": "Storno-/Korrekturbelege", "MA": "Mahnungen"}


def _lesen(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "finanzen") >= 1):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Lesen." if ist_admin(n) else "Nur für das Backoffice (Buchhaltung).")


def _schreiben(n):
	_lesen(n)
	if stufe(n, "finanzen") < 2:
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben.")


def _mahn_konfig():
	try:
		return B.mahn_konfig_pruefen(aus_json(frappe.db.get_single_value(EIN, "mahnwesen"), None) or B.MAHN_STANDARD)
	except ValueError:
		return B.mahn_konfig_pruefen(B.MAHN_STANDARD)


def _konten():
	return B.konten_pruefen(aus_json(frappe.db.get_single_value(EIN, "konten"), None) or {})


def _land(b):
	return (b.get("aussteller") or {}).get("land") if (b.get("aussteller") or {}).get("land") in ("AT", "DE", "CH") else "AT"


def _belege(filters=None, limit=0):
	return [A.beleg_dict(frappe.get_doc(DT, x)) for x in frappe.get_all(DT, filters=filters or {}, pluck="name", order_by="creation desc", limit_page_length=limit)]


def _daten_setzen(name, fn):
	doc = frappe.get_doc(DT, name)
	d = aus_json(doc.daten, {}) or {}
	fn(d)
	doc.db_set("daten", als_json(d))
	return doc


def _empfaenger(b):
	if b.get("empfaengerId"):
		return [b["empfaengerId"]]
	if b.get("organisationId"):
		return frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": b["organisationId"], "rolle": ["in", ["inhaber", "admin"]]}, pluck="nutzer_id")
	return []


def _aufgabe(titel, beschreibung, faellig, zustaendig):
	if zustaendig:
		frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(beschreibung, 2000), "faellig_am": faellig, "zustaendig_id": zustaendig, "status": "offen"}).insert(ignore_permissions=True)


def _kompakt(b):
	return {"id": b["id"], "nummer": b["nummer"], "beleg": b["beleg"], "art": b["art"], "status": b["status"], "brutto": b["brutto"], "offen": B.offener_betrag(b) if b["beleg"] == "rechnung" else b["brutto"], "partei": {"name": (b.get("partei") or {}).get("name", "")}}


def _kreise(jahr):
	kreise = {}
	for kreis in KREIS_LABEL:
		for r in frappe.db.sql("select name, current from `tabSeries` where name like %s", (f"{kreis}-%",), as_dict=True):  # Frappe-Nummernkreise (make_autoname)
			teile = r.name.split("-")
			if len(teile) >= 2 and teile[1].isdigit():
				kreise.setdefault(kreis, {})[teile[1]] = cint(r.current)
	aus = []
	for kreis, jahre in kreise.items():
		for j, n_ in jahre.items():
			aus.append({"kreis": kreis, "label": KREIS_LABEL.get(kreis, kreis), "jahr": int(j), "letzte": f"{kreis}-{j}-{n_:05d}" if n_ else "–", "anzahl": n_, "naechste": f"{kreis}-{j}-{n_ + 1:05d}"})
	for kreis, label in KREIS_LABEL.items():
		if not any(x["kreis"] == kreis and x["jahr"] == jahr for x in aus):
			aus.append({"kreis": kreis, "label": label, "jahr": jahr, "letzte": "–", "anzahl": 0, "naechste": f"{kreis}-{jahr}-00001"})
	return sorted(aus, key=lambda x: (-x["jahr"], x["kreis"]))


def _mahn_ausgabe(b, m):
	return {"belegId": b["id"], "nummer": b["nummer"], "empfaenger": (b.get("partei") or {}).get("name", ""), "faelligAm": b.get("faelligAm"), "brutto": b["brutto"], **m}


def _storno_json(s):
	d = aus_json(s.daten, {}) or {}
	return {"id": s.name, "nummer": s.nummer, "ursprungId": s.ursprung_id, "ursprungNummer": s.ursprung_nummer, "art": s.art, "datum": str(s.datum), "brutto": float(s.brutto or 0), "grund": s.grund or "",
		"empfaenger": (d.get("partei") or {}).get("name", ""), "erstattung": d.get("erstattung"), "vonName": name_von(s.von_id) if s.von_id else ""}


def _eingang_json(e):
	return {"id": e.name, "importId": e.import_id, "datum": str(e.datum), "valuta": str(e.valuta or e.datum), "betrag": float(e.betrag or 0), "waehrung": e.waehrung, "richtung": e.richtung, "zweck": e.zweck or "",
		"name": e.name_gegenpartei or "", "iban": e.iban_maskiert or "", "referenz": e.referenz or "", "vorschlag": aus_json(e.vorschlag, {}) or {}, "status": e.status, "belegId": e.abrechnung_id,
		"nummer": e.nummer, "teilzahlung": bool(cint(e.teilzahlung)), "differenz": float(e.differenz or 0), "grund": e.grund or ""}


# ================================================================ Übersicht


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	heute = L.heute()
	k = _mahn_konfig()
	offen = _belege({"status": ["in", ["offen", "angewiesen"]]})
	op = B.op_liste(offen, heute)
	vorschlaege = []
	for b in offen:
		m = B.mahn_vorschlag(b, heute, k, _land(b))
		if m:
			vorschlaege.append(_mahn_ausgabe(b, m))
	vorschlaege.sort(key=lambda x: (not x["faellig"], -x["tage"]))
	juengste = _belege({}, 500)
	mahnungen = sorted([{**m, "belegId": b["id"], "nummer": b["nummer"], "empfaenger": (b.get("partei") or {}).get("name", "")} for b in juengste for m in (b.get("mahnungen") or []) if m.get("nr")], key=lambda x: str(x.get("am")), reverse=True)
	steuer = []
	for b in juengste:
		if b["status"] == "storniert":
			continue
		fehlt = list(b.get("pflichtFehlt") or [])
		if (b.get("steuer") or {}).get("art") == "reverse_charge" and not (b.get("partei") or {}).get("uid"):
			fehlt.append("UID des Leistungsempfängers (Reverse Charge)")
		if fehlt:
			steuer.append({"id": b["id"], "nummer": b["nummer"], "empfaenger": (b.get("partei") or {}).get("name", ""), "status": b["status"], "steuer": (b.get("steuer") or {}).get("label", ""), "fehlt": list(dict.fromkeys(fehlt))})
	nummern = frappe.get_all(DT, pluck="nummer", limit_page_length=0) + frappe.get_all("Plattform Stornobeleg", pluck="nummer", limit_page_length=0) + [m["nr"] for m in mahnungen]
	eingaenge = [_eingang_json(frappe.get_doc("Plattform Zahlungseingang", x)) for x in frappe.get_all("Plattform Zahlungseingang", order_by="creation desc", pluck="name", limit_page_length=200)]
	importe = [{"id": i.name, "am": iso(i.creation), "dateiname": i.dateiname, "format": i.format, "anzahl": cint(i.anzahl), "neu": cint(i.neu), "doppelt": cint(i.doppelt), "sicher": cint(i.sicher), "vonName": name_von(i.von_id) if i.von_id else ""}
		for i in frappe.get_all("Plattform Kontoauszug Import", fields=["name", "creation", "dateiname", "format", "anzahl", "neu", "doppelt", "sicher", "von_id"], order_by="creation desc", limit_page_length=10)]
	exporte = [{"id": x.name, "format": x.format, "von": str(x.von), "bis": str(x.bis), "anzahl": cint(x.anzahl), "am": iso(x.creation), "vonName": name_von(x.von_id) if x.von_id else ""}
		for x in frappe.get_all("Plattform Buchungsexport", fields=["name", "format", "von", "bis", "anzahl", "creation", "von_id"], order_by="creation desc", limit_page_length=10)]
	return {
		"heute": heute, "darfSchreiben": stufe(n, "finanzen") >= 2, "darfExport": stufe(n, "export") >= 1, "mahnwesen": k, "konten": _konten(),
		"op": {"summen": op["summen"], "posten": op["posten"][:300], "anzahl": len(op["posten"])}, "mahnvorschlaege": vorschlaege[:100], "mahnungen": mahnungen[:50],
		"stornos": [_storno_json(frappe.get_doc("Plattform Stornobeleg", x)) for x in frappe.get_all("Plattform Stornobeleg", order_by="creation desc", pluck="name", limit_page_length=50)],
		"eingaenge": {"offen": frappe.db.count("Plattform Zahlungseingang", {"status": "offen"}), "liste": eingaenge}, "importe": importe, "exporte": exporte,
		"nummernkreise": _kreise(int(heute[:4])), "luecken": B.nummern_luecken(nummern), "steuerCheck": steuer[:50],
		"abschluesse": [{"monat": a.monat, "status": a.status, "am": iso(a.abgeschlossen_am) if a.abgeschlossen_am else None, "vonName": name_von(a.abgeschlossen_von) if a.abgeschlossen_von else ""}
			for a in frappe.get_all("Plattform Monatsabschluss", fields=["monat", "status", "abgeschlossen_am", "abgeschlossen_von"], order_by="monat desc", limit_page_length=12)],
	}


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	try:
		km = B.mahn_konfig_pruefen(d["mahnwesen"]) if d.get("mahnwesen") else None
		kk = B.konten_pruefen(d["konten"]) if d.get("konten") else None
	except ValueError as e:
		ungueltig(str(e))
	doc = frappe.get_single(EIN)
	if km:
		doc.mahnwesen = als_json(km)
	if kk:
		doc.konten = als_json(kk)
	doc.save(ignore_permissions=True)
	protokoll(n, "buchhaltung_einstellungen", "finanzen", "BUCHHALTUNG", "Einstellungen gespeichert")
	return {"ok": True, "mahnwesen": _mahn_konfig(), "konten": _konten()}


# ================================================================ Mahnwesen


@frappe.whitelist(methods=["POST"])
def mahnlauf(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	auswahl = {v.kennung(x) for x in (d.get("ids") or [])[:200] if v.kennung(x)}
	trocken = v.wahr(d.get("trockenlauf"))
	heute = L.heute()
	k = _mahn_konfig()
	erzeugt, uebersprungen = [], []
	for b in _belege({"status": "offen", "beleg": "rechnung"}):
		if auswahl and b["id"] not in auswahl:
			continue
		m = B.mahn_vorschlag(b, heute, k, _land(b))
		if not m:
			if auswahl:
				uebersprungen.append({"nummer": b["nummer"], "grund": "Nicht überfällig bzw. kein offener Betrag."})
			continue
		if not m["faellig"]:
			if auswahl:
				uebersprungen.append({"nummer": b["nummer"], "grund": m["grund"]})
			continue
		nr = "(Vorschau)" if trocken else make_autoname(f"{B.MAHN_KREIS}-{heute[:4]}-.#####")
		eintrag = {"nr": nr, "am": iso(now_datetime()), "datum": heute, **{x: m.get(x) for x in ("stufe", "label", "offen", "gebuehr", "zinsen", "zinssatz", "zinsNorm", "pauschale", "pauschaleNorm", "kostenGesamt", "gesamt", "frist", "eskalation")}, "vonId": n.id, "vonName": name_von(n.id)}
		erzeugt.append(_mahn_ausgabe(b, eintrag))
		if trocken:
			continue
		_daten_setzen(b["id"], lambda x, e=eintrag: x.__setitem__("mahnungen", (x.get("mahnungen") or []) + [e]))
		for konto in _empfaenger(b):
			benachrichtigen(konto, "abrechnung", f"{m['label']} zu {b['nummer']}", f"Zur Rechnung {b['nummer']} ist noch keine Zahlung eingegangen. Neue Zahlungsfrist: {L.datum_de(m['frist'])}.", "/portal/abrechnungen", "abrechnung", b["id"],
				mail_betreff=f"{m['label']} – ÖkoInvest", mail_text="Zu einer Rechnung im Portal von ÖkoInvest ist noch keine Zahlung eingegangen. Das Schreiben (PDF) und die neue Zahlungsfrist finden Sie im Portal unter „Abrechnungen“.")
		protokoll(n, "mahnung", "abrechnung", b["id"], f"{nr} {m['label']} zu {b['nummer']}: offen {L.euro(m['offen'])}, Kosten {L.euro(m['kostenGesamt'])}, Frist {L.datum_de(m['frist'])}")
	return {"trockenlauf": trocken, "anzahl": len(erzeugt), "erzeugt": erzeugt, "uebersprungen": uebersprungen}


@frappe.whitelist(methods=["POST"])
def mahnsperre(beleg_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	k = v.kennung(beleg_id)
	if not k or not frappe.db.exists(DT, k) or frappe.db.get_value(DT, k, "beleg") != "rechnung":
		nicht_gefunden("Rechnung nicht gefunden.")
	b = A.beleg_dict(frappe.get_doc(DT, k))
	if (b.get("mahnsperre") or {}).get("anliegenId"):
		konflikt("Mahnsperre aus einem Einspruch des Kunden – sie endet mit der Entscheidung über den Einspruch (Anliegen).")
	bis = d.get("bis") or ""
	if not bis:
		_daten_setzen(k, lambda x: x.pop("mahnsperre", None))
		protokoll(n, "mahnsperre", "abrechnung", k, f"Mahnsperre {b['nummer']} aufgehoben")
		return {"ok": True, "mahnsperre": None}
	heute = L.heute()
	if not L.ist_datum(bis) or bis < heute or bis > L.plus_tage(heute, 180):
		ungueltig("Mahnsperre höchstens 180 Tage in die Zukunft.")
	grund = v.text(d.get("grund"), 200)
	if len(grund) < 10:
		ungueltig("Bitte den Grund der Mahnsperre angeben (mind. 10 Zeichen).")
	sperre = {"bis": bis, "grund": grund, "am": iso(now_datetime()), "vonId": n.id}
	_daten_setzen(k, lambda x: x.__setitem__("mahnsperre", sperre))
	protokoll(n, "mahnsperre", "abrechnung", k, f"Mahnsperre {b['nummer']} bis {L.datum_de(bis)}: {grund}")
	return {"ok": True, "mahnsperre": sperre}


# ================================================================ Storno


@frappe.whitelist(methods=["POST"])
def storno(beleg_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	grund = v.mehrzeilig(d.get("grund"), 500).strip()
	if len(grund) < 10:
		ungueltig("Bitte den Grund des Stornos angeben (mind. 10 Zeichen) – er steht auf dem Stornobeleg.")
	k = v.kennung(beleg_id)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Beleg nicht gefunden.")
	doc = frappe.get_doc(DT, k)
	b = A.beleg_dict(doc)
	ok = B.storno_erlaubt(b)
	if not ok["ok"]:
		konflikt(ok["grund"])
	heute = L.heute()
	s = B.storno_beleg(b, make_autoname(f"{B.STORNO_KREIS}-{heute[:4]}-.#####"), heute, grund)
	hinweise = []
	if doc.erpnext_name and E.aktiv():
		try:
			E.rechnung_stornieren(doc.erpnext_doctype, doc.erpnext_name)
		except Exception as fehler:  # noqa: BLE001 – bezahlte ERPNext-Belege lassen sich oft nicht stornieren
			frappe.log_error(title="ÖkoInvest Buchhaltung: ERPNext-Storno", message=frappe.get_traceback())
			hinweise.append(f"ERPNext-Beleg nicht storniert ({str(fehler)[:120]}) – bitte in ERPNext eine Gutschrift (Return/Credit Note) anlegen.")
	if s["bereitsGezahlt"] > 0:
		s["erstattung"] = {"betrag": s["bereitsGezahlt"], "richtung": "an_empfaenger" if b["beleg"] == "rechnung" else "rueckforderung", "status": "offen"}
	sb = frappe.get_doc({"doctype": "Plattform Stornobeleg", "nummer": s["nummer"], "ursprung_id": k, "ursprung_nummer": b["nummer"], "art": b["art"], "datum": heute, "brutto": s["brutto"], "grund": grund, "von_id": n.id,
		"daten": als_json({x: s.get(x) for x in ("titel", "partei", "aussteller", "zeitraum", "positionen", "netto", "steuer", "bereitsGezahlt", "erstattung", "text", "ursprung", "ursprungDatum")})}).insert(ignore_permissions=True)
	alt = doc.status
	doc.db_set({"status": "storniert", "storno_grund": grund})

	def _mark(x):
		for m in x.get("mahnungen") or []:
			m["storniert"] = True
		x["stornoBelegId"] = sb.name
		x["stornoNummer"] = s["nummer"]

	_daten_setzen(k, _mark)
	provision = None
	pid = (b.get("bezug") or {}).get("provisionId")
	if b["art"] == "provision" and pid and frappe.db.exists("Plattform Provision", pid):
		pv = frappe.get_doc("Plattform Provision", pid)
		if v.wahr(d.get("provisionStornieren")) and pv.status in ("offen", "in_rechnung"):
			from oekoinvest_app.plattform.ablauf import system_wechsel

			provision = "storniert" if system_wechsel("provision", pv, "storniert", f"Storno {s['nummer']}: {grund}") else pv.status
		else:
			provision = "neu_abrechnen" if pv.status in ("offen", "in_rechnung") else pv.status
	if s.get("erstattung"):
		_aufgabe(f"{'Erstattung' if s['erstattung']['richtung'] == 'an_empfaenger' else 'Rückforderung'} {L.euro(s['erstattung']['betrag'])} zu {s['nummer']}",
			f"Storno von {b['nummer']} ({(b.get('partei') or {}).get('name', '')}) – bereits {'bezahlt' if alt == 'bezahlt' else 'teilweise gezahlt'}. Erstatten bzw. zurückfordern oder verrechnen.", L.plus_tage(heute, 14), n.id)
	for konto in _empfaenger(b):
		benachrichtigen(konto, "abrechnung", f"{s['titel']} {s['nummer']}", f"Der Beleg {b['nummer']} wurde storniert. Der Stornobeleg liegt im Portal bereit.", "/portal/abrechnungen", "abrechnung", k,
			mail_betreff="Stornobeleg im Portal – ÖkoInvest", mail_text="Zu einem Ihrer Belege im Portal von ÖkoInvest wurde ein Stornobeleg erstellt. Details finden Sie unter „Abrechnungen“.")
	protokoll(n, "abrechnung_storno", "abrechnung", k, f"{s['nummer']} storniert {b['nummer']} ({L.euro(b['brutto'])}): {v.text(grund, 120)}")
	hinweis = "Die Provision bleibt bestehen – der nächste Abrechnungslauf erstellt eine neue (korrigierte) Provisionsrechnung." if provision == "neu_abrechnen" else ("Der nächste Abrechnungslauf erzeugt für diese Periode einen neuen Beleg (Korrektur)." if b["art"] in ("pacht", "contracting") else "")
	return {"ok": True, "storno": {"id": sb.name, "nummer": s["nummer"], "brutto": s["brutto"], "erstattung": s.get("erstattung")}, "provision": provision, "hinweis": " ".join([hinweis, *hinweise]).strip()}


def _zugriff(n, b):
	if ist_admin(n) and stufe(n, "finanzen") >= 1:
		return "backoffice"
	if b.get("empfaengerId") and b["empfaengerId"] == n.id:
		return "empfaenger"
	if b.get("organisationId") and team_rolle(n.id, b["organisationId"]):
		return "team"
	return None


@frappe.whitelist(methods=["POST"])
def beleg_dokument(beleg_id=None, art=None, nr=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	k = v.kennung(beleg_id)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Abrechnung nicht gefunden.")
	b = A.beleg_dict(frappe.get_doc(DT, k))
	if not _zugriff(n, b):
		verboten("Diese Abrechnung gehört nicht zu Ihrem Konto.")
	from oekoinvest_app.plattform.api.finanzen import beleg_ausgabe

	beleg = beleg_ausgabe(b, backoffice=_zugriff(n, b) == "backoffice", detail=True)
	if art == "mahnung":
		m = next((x for x in (b.get("mahnungen") or []) if x.get("nr") and x["nr"] == str(nr or "")), None)
		if not m:
			nicht_gefunden("Mahnung nicht gefunden.")
		aus = {"art": "mahnung", "mahnung": m, "text": B.mahn_text(b, m)}
	elif art == "storno":
		sid = b.get("stornoBelegId")
		if not sid or not frappe.db.exists("Plattform Stornobeleg", sid):
			nicht_gefunden("Stornobeleg nicht gefunden.")
		s = frappe.get_doc("Plattform Stornobeleg", sid)
		aus = {"art": "storno", "storno": {**(aus_json(s.daten, {}) or {}), "id": s.name, "nummer": s.nummer, "ursprungId": s.ursprung_id, "ursprungNummer": s.ursprung_nummer, "datum": str(s.datum), "brutto": float(s.brutto or 0), "grund": s.grund}}
	else:
		ungueltig("Unbekanntes Dokument.")
	protokoll(n, "buchhaltung_pdf", "abrechnung", k, f"{'Mahnung ' + str(nr) if art == 'mahnung' else 'Stornobeleg'} zu {b['nummer']} abgerufen", ip or "")
	return {"beleg": beleg, **aus}


@frappe.whitelist(methods=["POST"])
def meine_dokumente(als_benutzer=None):
	n = nutzer(als_benutzer)
	namen = set(frappe.get_all(DT, filters={"empfaenger_id": n.id}, pluck="name", limit_page_length=0))
	orgs = frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": n.id}, pluck="organisation_id")
	if orgs:
		namen |= set(frappe.get_all(DT, filters={"organisation_id": ["in", orgs]}, pluck="name", limit_page_length=0))
	aus = []
	for x in namen:
		b = A.beleg_dict(frappe.get_doc(DT, x))
		for m in b.get("mahnungen") or []:
			if m.get("nr") and not m.get("storniert"):
				aus.append({"art": "mahnung", "belegId": b["id"], "nummer": b["nummer"], "nr": m["nr"], "titel": m.get("label"), "datum": m.get("datum") or str(m.get("am"))[:10], "betrag": m.get("gesamt"), "frist": m.get("frist")})
		if b.get("stornoBelegId") and frappe.db.exists("Plattform Stornobeleg", b["stornoBelegId"]):
			s = frappe.get_doc("Plattform Stornobeleg", b["stornoBelegId"])
			aus.append({"art": "storno", "belegId": b["id"], "nummer": b["nummer"], "nr": s.nummer, "titel": (aus_json(s.daten, {}) or {}).get("titel") or "Stornobeleg", "datum": str(s.datum), "betrag": float(s.brutto or 0)})
	return sorted(aus, key=lambda z: str(z["datum"]), reverse=True)


# ================================================================ Zahlungseingang


@frappe.whitelist(methods=["POST"])
def zahlung_import(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	text = str(d.get("inhalt") or "")
	if len(text) > 3_000_000:
		ungueltig("Die Datei ist zu groß (max. ca. 3 MB).")
	try:
		gelesen = B.auszug_lesen(text, d.get("format") if d.get("format") in ("camt", "csv") else "")
	except ValueError as e:
		ungueltig(str(e))
	h = B.sha256(text)
	if frappe.db.exists("Plattform Kontoauszug Import", {"sha256": h}):
		konflikt("Diese Datei wurde bereits importiert.")
	belege = [_kompakt(b) for b in _belege({"status": ["in", ["offen", "angewiesen"]]})]
	imp = frappe.get_doc({"doctype": "Plattform Kontoauszug Import", "dateiname": v.text(d.get("dateiname"), 120) or "Kontoauszug", "format": gelesen["format"], "sha256": h, "anzahl": len(gelesen["buchungen"]), "von_id": n.id}).insert(ignore_permissions=True)
	neu, doppelt, sicher, gesehen = [], 0, 0, set()
	for bu in gelesen["buchungen"]:
		sl = B.buchung_schluessel(bu)
		if sl in gesehen or frappe.db.exists("Plattform Zahlungseingang", {"schluessel": sl}):
			doppelt += 1
			continue
		gesehen.add(sl)
		vs = B.zuordnen(bu, belege)
		sicher += vs["art"] == "sicher"
		e = frappe.get_doc({"doctype": "Plattform Zahlungseingang", "import_id": imp.name, "datum": bu["datum"], "valuta": bu["valuta"], "betrag": bu["betrag"], "waehrung": bu["waehrung"], "richtung": bu["richtung"],
			"zweck": bu["zweck"], "name_gegenpartei": bu["name"], "iban_maskiert": iban_maskieren(bu["iban"]) if bu["iban"] else "", "referenz": bu["referenz"], "schluessel": sl, "status": "offen", "vorschlag": als_json(vs)}).insert(ignore_permissions=True)
		neu.append(_eingang_json(e))
	imp.db_set({"neu": len(neu), "doppelt": doppelt, "sicher": sicher})
	protokoll(n, "zahlungsimport", "finanzen", imp.name, f"Kontoauszug {imp.dateiname} ({gelesen['format'].upper()}): {len(neu)} neue Buchungen, {doppelt} Dubletten, {sicher} sichere Treffer (SHA-256 {h[:16]}…)")
	return {"import": {"id": imp.name, "dateiname": imp.dateiname, "format": imp.format, "anzahl": imp.anzahl, "neu": len(neu), "doppelt": doppelt, "sicher": sicher}, "buchungen": neu,
		"hinweis": "ERPNext ist aktiv – den Abgleich bitte zusätzlich über die Bankabstimmung in ERPNext führen." if E.aktiv() else ""}


def _bezahlt(n, doc, datum):
	b = A.beleg_dict(doc)
	if doc.art == "pacht":
		k = A.kyc_auszahlung(doc.empfaenger_id, (b.get("bezug") or {}).get("flaecheId"))
		if not k["ok"]:
			konflikt(f"Keine Auszahlung ohne abgeschlossene Verifizierung: {' '.join(k['gruende'])}")
	doc.db_set({"status": "bezahlt", "bezahlt_am": datum})
	b = A.beleg_dict(frappe.get_doc(DT, doc.name))
	A.provision_nachziehen(n, b)
	A.beleg_melden(b, "bezahlt")


def _zuordnen(n, eid, beleg_id):
	e = frappe.get_doc("Plattform Zahlungseingang", eid)
	if e.status != "offen":
		konflikt("Die Buchung ist bereits verarbeitet.")
	if not beleg_id or not frappe.db.exists(DT, beleg_id):
		nicht_gefunden("Beleg nicht gefunden.")
	doc = frappe.get_doc(DT, beleg_id)
	b = A.beleg_dict(doc)
	eingang = e.richtung != "ausgang"
	if eingang and b["beleg"] != "rechnung":
		konflikt("Zahlungseingänge können nur Rechnungen zugeordnet werden.")
	if not eingang and b["beleg"] != "gutschrift":
		konflikt("Ausgänge können nur Gutschriften (Auszahlungen) zugeordnet werden.")
	if (b["status"] != "offen") if eingang else (b["status"] not in ("offen", "angewiesen")):
		konflikt(f"{b['nummer']} ist nicht offen.")
	if str(e.datum) > L.heute():
		ungueltig("Das Buchungsdatum liegt in der Zukunft.")
	offen = B.offener_betrag(b) if eingang else b["brutto"]
	betrag = float(e.betrag or 0)
	voll = betrag >= offen - 0.005
	if not eingang and not voll:
		konflikt("Auszahlungen werden nur in voller Höhe zugeordnet – Differenz bitte klären.")
	eintrag = {"am": str(e.datum), "betrag": L.rund2(min(betrag, offen) if voll else betrag), "eingangId": e.name, "vonId": n.id, "teil": not voll}
	_daten_setzen(beleg_id, lambda x: x.__setitem__("zahlungen", (x.get("zahlungen") or []) + [eintrag]))
	if voll:
		_bezahlt(n, frappe.get_doc(DT, beleg_id), str(e.datum))
	diff = L.rund2(betrag - offen)
	e.db_set({"status": "zugeordnet", "abrechnung_id": beleg_id, "nummer": b["nummer"], "teilzahlung": 0 if voll else 1, "differenz": diff if diff > 0.005 else 0, "erledigt_von": n.id, "erledigt_am": now_datetime()})
	b2 = A.beleg_dict(frappe.get_doc(DT, beleg_id))
	if not voll:
		for konto in _empfaenger(b2):
			benachrichtigen(konto, "abrechnung", f"Teilzahlung zu {b2['nummer']} verbucht", f"Es ist eine Teilzahlung eingegangen; offen bleiben {L.euro(B.offener_betrag(b2))}.", "/portal/abrechnungen", "abrechnung", beleg_id,
				mail_betreff="Teilzahlung verbucht – ÖkoInvest", mail_text="Zu einer Rechnung im Portal von ÖkoInvest wurde eine Teilzahlung verbucht. Details finden Sie unter „Abrechnungen“.")
	if diff > 0.005:
		_aufgabe(f"Überzahlung {L.euro(diff)} zu {b2['nummer']}", f"Zahlungseingang vom {L.datum_de(str(e.datum))} ({e.name_gegenpartei or 'ohne Namen'}) übersteigt den offenen Betrag. Erstattung oder Verrechnung klären.", L.plus_tage(L.heute(), 7), n.id)
	protokoll(n, "zahlung_zuordnen", "abrechnung", beleg_id, f"Buchung {L.datum_de(str(e.datum))} {L.euro(betrag)} → {b2['nummer']}{' (bezahlt)' if voll else ' (Teilzahlung)'}")
	return {"ok": True, "eingang": _eingang_json(frappe.get_doc("Plattform Zahlungseingang", eid)), "beleg": {"id": beleg_id, "nummer": b2["nummer"], "status": b2["status"], "offen": B.offener_betrag(b2)}}


@frappe.whitelist(methods=["POST"])
def zahlung_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	aktion = d.get("aktion")
	if aktion == "sichere_uebernehmen":
		ergebnis = {"uebernommen": 0, "fehler": []}
		for e in frappe.get_all("Plattform Zahlungseingang", filters={"status": "offen"}, fields=["name", "vorschlag"], limit_page_length=500):
			vs = aus_json(e.vorschlag, {}) or {}
			if vs.get("art") != "sicher":
				continue
			try:
				_zuordnen(n, e.name, vs.get("belegId"))
				ergebnis["uebernommen"] += 1
			except (frappe.ValidationError, frappe.DuplicateEntryError, frappe.DoesNotExistError) as x:  # konflikt()/ungueltig()/nicht_gefunden()
				ergebnis["fehler"].append(f"{vs.get('nummer')}: {x}")
			if ergebnis["uebernommen"] >= 200:
				break
		return ergebnis
	eid = v.kennung(id)
	if not eid or not frappe.db.exists("Plattform Zahlungseingang", eid):
		nicht_gefunden("Buchung nicht gefunden.")
	if aktion == "zuordnen":
		return _zuordnen(n, eid, v.kennung(d.get("belegId")))
	e = frappe.get_doc("Plattform Zahlungseingang", eid)
	if aktion == "ignorieren":
		if e.status != "offen":
			konflikt("Nur offene Buchungen können ignoriert werden.")
		grund = v.text(d.get("grund"), 200)
		if len(grund) < 5:
			ungueltig("Bitte kurz begründen (z. B. „Privatentnahme“, „Bankgebühr“).")
		e.db_set({"status": "ignoriert", "grund": grund, "erledigt_von": n.id, "erledigt_am": now_datetime()})
	elif aktion == "zuruecksetzen":
		if e.status != "ignoriert":
			konflikt("Nur ignorierte Buchungen können zurückgesetzt werden – Zuordnungen per Storno/Zahlungsstatus korrigieren.")
		e.db_set({"status": "offen", "grund": "", "erledigt_am": None})
	else:
		ungueltig("Unbekannte Aktion.")
	protokoll(n, f"zahlung_{aktion}", "finanzen", eid, f"Buchung {L.datum_de(str(e.datum))} {L.euro(e.betrag)}: {aktion}")
	return {"ok": True, "eingang": _eingang_json(frappe.get_doc("Plattform Zahlungseingang", eid))}


# ================================================================ Export


@frappe.whitelist(methods=["POST"])
def export(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	if stufe(n, "export") < 1:
		verboten("Ihre Backoffice-Rolle erlaubt keine Exporte.")
	d = aus_json(daten, {}) or {}
	fmt, von, bis = d.get("format") or "datev", d.get("von") or "", d.get("bis") or ""
	if fmt not in B.EXPORT_FORMATE:
		ungueltig("Unbekanntes Exportformat.")
	heute = L.heute()
	if fmt == "op":
		op = B.op_liste(_belege({"status": ["in", ["offen", "angewiesen"]]}), heute)
		text = B.op_csv([{**p, "artLabel": L.ABRECHNUNG_ARTEN.get(p["art"], {}).get("label", p["art"]), "statusLabel": "überfällig" if p["tageUeberfaellig"] > 0 else p["status"]} for p in op["posten"]])
		protokoll(n, "export", "finanzen", "OP", f"OP-Liste exportiert ({len(op['posten'])} Posten)")
		return {"text": text, "dateiname": f"OP-Liste-{heute}.csv", "anzahl": len(op["posten"]), "zeichensatz": "utf-8"}
	if not L.ist_datum(von) or not L.ist_datum(bis) or von > bis:
		ungueltig("Bitte einen gültigen Zeitraum wählen (von ≤ bis).")
	if L.tage_zwischen(von, bis) > 366:
		ungueltig("Höchstens ein Jahr je Export.")
	im = lambda x: bool(x) and von <= str(x)[:10] <= bis  # noqa: E731
	posten = []
	namen = set(frappe.get_all(DT, filters={"rechnungsdatum": ["between", [von, bis]]}, pluck="name", limit_page_length=0)) | set(frappe.get_all(DT, filters={"bezahlt_am": ["between", [von, bis]]}, pluck="name", limit_page_length=0))
	namen |= set(frappe.get_all("Plattform Zahlungseingang", filters={"status": "zugeordnet", "datum": ["between", [von, bis]]}, pluck="abrechnung_id", limit_page_length=0))
	for x in namen:
		if not x:
			continue
		b = A.beleg_dict(frappe.get_doc(DT, x))
		st = b.get("steuer") or {}
		basis = {"nummer": b["nummer"], "art": b["art"], "steuerArt": st.get("art"), "steuerVorlage": st.get("vorlage"), "steuerSatz": st.get("satz"), "steuerBetrag": st.get("betrag")}
		if im(b.get("rechnungsdatum")):
			posten.append({**basis, "typ": b["beleg"], "datum": b["rechnungsdatum"], "brutto": b["brutto"], "text": f"{'Gutschrift' if b['beleg'] == 'gutschrift' else 'Rechnung'} {(b.get('partei') or {}).get('name', '')}"})
		zahlungen = b.get("zahlungen") or []
		for z in zahlungen:
			if im(z.get("am")):
				posten.append({**basis, "typ": "zahlung", "richtung": "ausgang" if b["beleg"] == "gutschrift" else "eingang", "datum": z["am"], "brutto": z["betrag"], "text": f"Zahlung {b['nummer']}"})
		rest = L.rund2(b["brutto"] - sum(float(z.get("betrag") or 0) for z in zahlungen))
		if b["status"] == "bezahlt" and rest > 0.005 and im(b.get("bezahltAm")):
			posten.append({**basis, "typ": "zahlung", "richtung": "ausgang" if b["beleg"] == "gutschrift" else "eingang", "datum": b["bezahltAm"], "brutto": rest, "text": f"Zahlung {b['nummer']}"})
	for s in frappe.get_all("Plattform Stornobeleg", filters={"datum": ["between", [von, bis]]}, fields=["nummer", "ursprung_nummer", "art", "datum", "brutto", "daten"], limit_page_length=0):
		sd = aus_json(s.daten, {}) or {}
		st = sd.get("steuer") or {}
		posten.append({"typ": "storno", "ursprung": sd.get("ursprung"), "nummer": s.nummer, "art": s.art, "datum": str(s.datum), "brutto": float(s.brutto or 0), "steuerArt": st.get("art"), "steuerVorlage": st.get("vorlage"), "steuerSatz": st.get("satz"), "steuerBetrag": abs(float(st.get("betrag") or 0)), "text": f"Storno {s.ursprung_nummer}"})
	konten = _konten()
	zeilen = B.buchungen(posten, konten, fmt)
	text = B.datev_csv(zeilen, konten, von, bis, iso(now_datetime())) if fmt == "datev" else B.bmd_csv(zeilen, konten)
	ex = frappe.get_doc({"doctype": "Plattform Buchungsexport", "format": fmt, "von": von, "bis": bis, "anzahl": len(zeilen), "sha256": B.sha256(text), "von_id": n.id}).insert(ignore_permissions=True)
	protokoll(n, "export", "finanzen", ex.name, f"{B.EXPORT_FORMATE[fmt]} {L.datum_de(von)}–{L.datum_de(bis)}: {len(zeilen)} Buchungen")
	return {"text": B.latin1(text) if fmt == "datev" else text, "dateiname": f"{'EXTF_Buchungsstapel' if fmt == 'datev' else 'BMD_Buchungen'}_{von}_{bis}.csv", "anzahl": len(zeilen),
		"zeichensatz": "latin1" if fmt == "datev" else "utf-8", "hinweis": "Kontenzuordnung als Beispiel vorbelegt – vor dem ersten Echtimport mit der Steuerberatung abstimmen."}


# ================================================================ Monatsabschluss


def _monat(monat, heute):
	import re

	if not re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", str(monat or "")):
		ungueltig("Monat im Format JJJJ-MM.")
	if monat > heute[:7]:
		ungueltig("Künftige Monate können nicht bearbeitet werden.")
	return monat


def _fakten(monat, heute):
	z = L.monats_zeitraum(monat)
	von, bis = z["von"], z["bis"]
	laeufe = frappe.get_all("Plattform Abrechnungslauf", filters={"art": ["in", ["contracting", "alle"]], "monat": [">=", monat]}, pluck="name", limit_page_length=1)
	contracting_anlagen = frappe.db.count("Plattform Contracting Vertrag", {"status": "aktiv"}) if frappe.db.exists("DocType", "Plattform Contracting Vertrag") else 0
	fehlend = 0
	for pt in frappe.get_all("Plattform Pachtvertrag", filters={"status": ["in", ["aktiv", "gekuendigt"]]}, pluck="name", limit_page_length=0):
		vd = A.fuer_faelligkeit(A.pachtvertrag_dict(frappe.get_doc("Plattform Pachtvertrag", pt)))
		for f_ in L.abzurechnen(vd, bis):
			if not frappe.db.exists(DT, {"schluessel": f_["schluessel"], "status": ["!=", "storniert"]}):
				fehlend += 1
	k = _mahn_konfig()
	offen = _belege({"status": "offen", "beleg": "rechnung"})
	ex = frappe.get_all("Plattform Buchungsexport", filters={"format": ["in", ["datev", "bmd"]], "von": ["<=", von], "bis": [">=", bis]}, fields=["format", "creation"], order_by="creation desc", limit_page_length=1)
	pflicht = 0
	for b in _belege({"rechnungsdatum": ["between", [von, bis]], "status": ["!=", "storniert"]}):
		pflicht += bool(b.get("pflichtFehlt"))
	return {
		"contractingLauf": bool(laeufe) or not contracting_anlagen, "contractingAnlagen": contracting_anlagen, "pachtFehlend": fehlend,
		"klaerfaelleOffen": frappe.db.count("Plattform Klaerfall", {"status": "offen"}),
		"importVorhanden": bool(frappe.db.count("Plattform Zahlungseingang", {"datum": ["between", [von, bis]]})),
		"eingaengeOffen": frappe.db.count("Plattform Zahlungseingang", {"datum": ["between", [von, bis]], "status": "offen"}),
		"zahlungslaeufeOffen": frappe.db.count("Plattform Zahlungslauf", {"status": "erstellt", "creation": ["<=", f"{bis} 23:59:59"]}),
		"mahnungenFaellig": len([b for b in offen if (B.mahn_vorschlag(b, heute, k, _land(b)) or {}).get("faellig")]),
		"pflichtFehlt": pflicht, "exportErstellt": f"{ex[0].format.upper()} {L.datum_de(str(ex[0].creation)[:10])}" if ex else "",
	}


def _abschluss_ausgabe(monat, heute):
	name = frappe.db.get_value("Plattform Monatsabschluss", {"monat": monat}, "name")
	a = frappe.get_doc("Plattform Monatsabschluss", name) if name else None
	status = a.status if a else "offen"
	snap = aus_json(a.snapshot, None) if a else None
	bew = snap if status == "abgeschlossen" and snap else B.abschluss_bewerten(monat, _fakten(monat, heute), aus_json(a.manuell, {}) if a else {})
	return {**bew, "status": status, "statusLabel": B.ABSCHLUSS_STATUS.get(status, status), "am": iso(a.abgeschlossen_am) if a and a.abgeschlossen_am else None,
		"vonName": name_von(a.abgeschlossen_von) if a and a.abgeschlossen_von else "", "verlauf": aus_json(a.verlauf, []) if a else []}


@frappe.whitelist(methods=["POST"])
def abschluss(monat=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	heute = L.heute()
	return _abschluss_ausgabe(_monat(monat, heute), heute)


@frappe.whitelist(methods=["POST"])
def abschluss_aktion(monat=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = aus_json(daten, {}) or {}
	heute = L.heute()
	m = _monat(monat, heute)
	name = frappe.db.get_value("Plattform Monatsabschluss", {"monat": m}, "name")
	a = frappe.get_doc("Plattform Monatsabschluss", name) if name else frappe.get_doc({"doctype": "Plattform Monatsabschluss", "monat": m, "status": "offen", "manuell": "{}", "verlauf": "[]"}).insert(ignore_permissions=True)
	manuell, verlauf = aus_json(a.manuell, {}) or {}, aus_json(a.verlauf, []) or []
	wer = name_von(n.id)
	aktion = d.get("aktion")
	if aktion == "punkt":
		if a.status == "abgeschlossen":
			konflikt("Der Monat ist abgeschlossen – bitte zuerst wiedereröffnen.")
		punkt = next((p for p in B.ABSCHLUSS_PUNKTE if p[0] == d.get("punkt")), None)
		if not punkt:
			ungueltig("Unbekannter Punkt.")
		notiz = v.text(d.get("notiz"), 300)
		erledigt = v.wahr(d.get("erledigt"))
		if punkt[2] and erledigt and len(notiz) < 10:
			ungueltig("Automatische Punkte nur mit Begründung manuell bestätigen (mind. 10 Zeichen).")
		manuell[punkt[0]] = {"erledigt": erledigt, "notiz": notiz, "vonId": n.id, "vonName": wer, "am": iso(now_datetime())}
		verlauf.append({"am": iso(now_datetime()), "vonName": wer, "text": f"{punkt[1]}: {'erledigt' if erledigt else 'offen'}{(' – ' + notiz) if notiz else ''}"})
		a.db_set({"manuell": als_json(manuell), "verlauf": als_json(verlauf)})
	elif aktion == "abschliessen":
		if a.status == "abgeschlossen":
			konflikt("Der Monat ist bereits abgeschlossen.")
		if m >= heute[:7]:
			konflikt("Der laufende Monat kann erst nach Monatsende abgeschlossen werden.")
		bew = B.abschluss_bewerten(m, _fakten(m, heute), manuell)
		if not bew["bereit"]:
			konflikt(f"Noch offen: {' · '.join(bew['offen'])}")
		verlauf.append({"am": iso(now_datetime()), "vonName": wer, "text": "Monat abgeschlossen"})
		a.db_set({"status": "abgeschlossen", "abgeschlossen_von": n.id, "abgeschlossen_am": now_datetime(), "snapshot": als_json(bew), "verlauf": als_json(verlauf)})
	elif aktion == "wiedereroeffnen":
		if a.status != "abgeschlossen":
			konflikt("Nur abgeschlossene Monate können wiedereröffnet werden.")
		grund = v.text(d.get("grund"), 300)
		if len(grund) < 10:
			ungueltig("Bitte den Grund der Wiedereröffnung angeben (mind. 10 Zeichen).")
		verlauf.append({"am": iso(now_datetime()), "vonName": wer, "text": f"Wiedereröffnet: {grund}"})
		a.db_set({"status": "wiedereroeffnet", "snapshot": None, "verlauf": als_json(verlauf)})
	else:
		ungueltig("Unbekannte Aktion.")
	protokoll(n, f"monatsabschluss_{aktion}", "finanzen", f"MA-{m}", f"Monatsabschluss {m}: {aktion}")
	return _abschluss_ausgabe(m, heute)
