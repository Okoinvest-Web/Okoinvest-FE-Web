# Copyright (c) 2026, ÖkoInvest GmbH
#
# Pachtakte (Team 1 – Flächeneigentümer, Landwirt, Dacheigentümer) – Referenz: src/lib/plattform/backend/demo/pachtakte.js,
# Vertrag: docs/API.md, Abschnitt „Pachtakte“. Regeln: plattform/pachtakte_kern.py (= src/lib/plattform/pachtakte.js).
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Eigentümer   – Rolle flaeche/landwirt, nur eigene Pachtverträge (Plattform Pachtvertrag.eigentuemer_id)
#   Backoffice   – Rolle admin mit Bereich „pachtakte“ (rechte.py): lesen ≥ 1, schreiben = 2
# Wirkungen beim Erledigen: Kündigung → Pachtvertrag „gekuendigt“ (Pachtakte.kuendigung_zum); Eigentümerwechsel/Erbfall
# mit Konto → Pachtvertrag.eigentuemer_id und Fläche.nutzer_id auf das neue Konto (künftige Gutschriften dorthin,
# Auszahlung erst nach dessen KYC); Zahlungsaufteilung → Pachtakte.aufteilung (Umsetzung im Abrechnungslauf: offen).
# Rückbau abgenommen + Sicherheit freigegeben → Vertrag „beendet“ (Abrechnungslauf überspringt ihn).

import frappe
from frappe.utils import add_days, cint, nowdate

from oekoinvest_app.plattform import benachrichtigung as B
from oekoinvest_app.plattform import pachtakte_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.api import finanzen as FA
from oekoinvest_app.plattform.ausgabe import flaeche_json
from oekoinvest_app.plattform.finanzen import abrechnung as A
from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.kern import (
	als_json,
	aus_json,
	ist_admin,
	jetzt_iso,
	konflikt,
	name_von,
	nicht_angemeldet,
	nicht_gefunden,
	nutzer,
	protokoll,
	ungueltig,
	verboten,
)
from oekoinvest_app.plattform.konstanten import PRAEFIX
from oekoinvest_app.plattform.rechte import stufe

PRAEFIX.update({"Plattform Pacht Anliegen": "PAN", "Plattform Agri Nachweis": "AGN", "Plattform Pachtakte": "PAK"})

DT_A, DT_N, DT_P, DT_V = "Plattform Pacht Anliegen", "Plattform Agri Nachweis", "Plattform Pachtakte", "Plattform Pachtvertrag"
BEREICH = "pachtakte"
EIGENTUEMER_ROLLEN = ("flaeche", "landwirt")
OFFEN = K.ANLIEGEN_OFFEN


def _bo_lesen(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 1


def _bo_schreiben(n):
	return ist_admin(n) and stufe(n, BEREICH) >= 2


def _lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _bo_lesen(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Pachtakten“ kein Lesen." if ist_admin(n) else "Nur für das Backoffice.")


def _schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Pachtakten“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice.")


def _eigentuemer_rolle(n):
	if not n:
		nicht_angemeldet()
	if not ist_admin(n) and not any(r in (n.get("rollen") or []) for r in EIGENTUEMER_ROLLEN):
		verboten("Die Pachtakte ist für Flächen- und Dacheigentümer sowie Landwirte.")


def _k(fn, *args, **kw):
	"""Regel aus pachtakte_kern ausführen; Fehler 409 → DuplicateEntryError, 422 → ValidationError (wie die Website)."""
	try:
		return fn(*args, **kw)
	except K.PachtakteFehler as e:
		(konflikt if e.status == 409 else ungueltig)(e.text)


def _heute():
	return L.heute()


# ================================================================ Laden


def _vertrag(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_V, k):
		nicht_gefunden("Pachtvertrag nicht gefunden.")
	return frappe.get_doc(DT_V, k)


def _flaeche(fid):
	return flaeche_json(frappe.get_doc("Plattform Flaeche", fid)) if fid and frappe.db.exists("Plattform Flaeche", fid) else None


def _akte_doc(pt, flaeche=None):
	name = frappe.db.get_value(DT_P, {"vertrag_id": pt["id"]}, "name")
	if name:
		return frappe.get_doc(DT_P, name)
	start = K.akte_start((flaeche or {}).get("pachtangebot") if flaeche else None)
	doc = frappe.get_doc({"doctype": DT_P, "vertrag_id": pt["id"], "rueckbau_status": "offen", "sicherheit_status": start["sicherheit"]["status"], "rueckbau": als_json(start["rueckbau"]), "sicherheit": als_json(start["sicherheit"]), "historie": als_json([]), "aufteilung": None})
	doc.insert(ignore_permissions=True)
	return doc


def _akte_dict(doc):
	return {
		"rueckbau": aus_json(doc.rueckbau, {}) or {"status": doc.rueckbau_status or "offen", "termin": "", "verlauf": []},
		"sicherheit": aus_json(doc.sicherheit, {}) or {"status": doc.sicherheit_status or "keine", "verlauf": []},
		"historie": aus_json(doc.historie, []) or [],
		"aufteilung": aus_json(doc.aufteilung),
		"kuendigungZum": str(doc.kuendigung_zum or ""),
	}


def _akte_speichern(doc, akte):
	doc.rueckbau = als_json(akte["rueckbau"])
	doc.sicherheit = als_json(akte["sicherheit"])
	doc.rueckbau_status = akte["rueckbau"]["status"]
	doc.sicherheit_status = akte["sicherheit"]["status"]
	doc.historie = als_json(akte.get("historie") or [])
	doc.aufteilung = als_json(akte.get("aufteilung")) if akte.get("aufteilung") else None
	doc.kuendigung_zum = akte.get("kuendigungZum") or None
	doc.save(ignore_permissions=True)


def _kurz(pt, akte):
	return {
		"id": pt["id"], "bezeichnung": pt["bezeichnung"], "land": pt["land"], "status": pt["status"], "objektArt": pt["objektArt"], "flaecheId": pt.get("flaecheId"), "vertragsdatum": pt.get("vertragsdatum") or "",
		"beginn": pt.get("beginn") or "", "laufzeitJahre": pt.get("laufzeitJahre"), "ende": K.laufzeit_ende(pt.get("beginn"), pt.get("laufzeitJahre")), "kuendigungZum": akte.get("kuendigungZum") or "", "eigentuemerId": pt["eigentuemerId"],
	}


def _anliegen_dict(doc):
	return {"id": doc.name, "vertragId": doc.vertrag_id, "kontoId": doc.konto_id, "art": doc.art, "status": doc.status, "daten": aus_json(doc.daten, {}) or {}, "ergebnis": aus_json(doc.ergebnis), "verlauf": aus_json(doc.verlauf, []) or [], "bearbeitungBis": str(doc.bearbeitung_bis or ""), "aufgabeId": doc.aufgabe_id, "erstelltAm": str(doc.creation), "geaendertAm": str(doc.modified)}


def _nachweis_dict(doc):
	return {"id": doc.name, "vertragId": doc.vertrag_id, "kontoId": doc.konto_id, "flaecheId": doc.flaeche_id, "status": doc.status, "daten": aus_json(doc.daten, {}) or {}, "verlauf": aus_json(doc.verlauf, []) or [], "aufgabeId": doc.aufgabe_id, "erstelltAm": str(doc.creation), "geaendertAm": str(doc.modified)}


def _verlauf_aus(liste, backoffice=False):
	return [{"am": x.get("am"), "von": x.get("von"), "nach": x.get("nach"), "wer": x.get("wer"), "text": x.get("text") or "", **({"name": name_von(x["nutzerId"])} if backoffice and x.get("nutzerId") else {})} for x in (liste or [])]


def _anliegen_aus(a, pt, backoffice=False):
	info = K.anliegen_info(a["art"], pt["land"] if pt else "DE")
	aus = {
		"id": a["id"], "vertragId": a["vertragId"], "vertrag": pt["bezeichnung"] if pt else "", "art": a["art"], "artLabel": info["label"] if info else a["art"], "status": a["status"],
		"statusLabel": K.ANLIEGEN_STATUS.get(a["status"], {}).get("label", a["status"]), "daten": a["daten"], "zusammenfassung": K.anliegen_zusammenfassung(a), "ergebnis": a["ergebnis"],
		"hinweise": info["hinweise"] if info else [], "unterlagen": info["unterlagen"] if info else [], "bearbeitungBis": a["bearbeitungBis"], "erstelltAm": a["erstelltAm"], "geaendertAm": a["geaendertAm"],
		"verlauf": _verlauf_aus(a["verlauf"], backoffice),
		"aktionen": [{"nach": u["nach"], "aktion": u["aktion"], "pflicht": u.get("pflicht") or []} for u in K.anliegen_aktionen(a["status"], "admin" if backoffice else "eigentuemer")],
	}
	if backoffice:
		aus.update({"kontoId": a["kontoId"], "konto": name_von(a["kontoId"]), "email": frappe.db.get_value("Plattform Konto", a["kontoId"], "email") or "", "land": pt["land"] if pt else "", "flaecheId": pt.get("flaecheId") if pt else None, "aufgabeId": a.get("aufgabeId")})
	return aus


def _nachweis_aus(x, pt, backoffice=False, referenz=None, kategorie=""):
	pruefung = K.agri_nachweis_pruefen(x["daten"], kategorie=kategorie, referenz=referenz if x["daten"].get("art") == "betrieb" else None, land=pt["land"] if pt else "DE")
	aus = {
		"id": x["id"], "vertragId": x["vertragId"], "vertrag": pt["bezeichnung"] if pt else "", "status": x["status"], "statusLabel": K.AGRI_NACHWEIS_STATUS.get(x["status"], {}).get("label", x["status"]),
		"daten": x["daten"], "pruefung": pruefung, "bearbeitbar": K.agri_bearbeitbar(x), "erstelltAm": x["erstelltAm"], "geaendertAm": x["geaendertAm"], "verlauf": _verlauf_aus(x["verlauf"], backoffice),
	}
	if backoffice:
		aus.update({"kontoId": x["kontoId"], "konto": name_von(x["kontoId"]), "aktionen": [{"nach": u["nach"], "aktion": u["aktion"], "pflicht": u.get("pflicht") or []} for u in K.AGRI_NACHWEIS_UEBERGAENGE if u["wer"] == "admin" and x["status"] in u["von"]]})
	return aus


ANGEBOT_FELDER = ("modell", "laufzeitJahre", "laufzeitBeginn", "verlaengerungJahre", "verlaengerung", "vorlaufJahre", "optionsfristJahre", "nichtbau", "kuendigung", "rueckbau", "rueckbauAb", "rueckbauEuro", "dienstbarkeit", "rangruecktritt")


def _akte_aus(pt_doc, backoffice=False, vertrag_ausgabe=None):
	heute = _heute()
	pt = A.pachtvertrag_dict(pt_doc)
	f = _flaeche(pt.get("flaecheId"))
	pa = (f or {}).get("pachtangebot") or None
	akte_doc = _akte_doc(pt, f)
	akte = _akte_dict(akte_doc)
	kurz = _kurz(pt, akte)
	agri_moeglich = bool(f and (f.get("agri") or ((f.get("fach") or {}).get("agri") or {}).get("kultur")))
	fach_agri = ((f or {}).get("fach") or {}).get("agri") or {}
	kategorie = fach_agri.get("kategorie") or ""
	nachweise = [_nachweis_dict(frappe.get_doc(DT_N, x)) for x in frappe.get_all(DT_N, filters={"vertrag_id": pt["id"]}, pluck="name", limit_page_length=0)]
	nachweise.sort(key=lambda x: (-int(x["daten"].get("jahr") or 0), x["daten"].get("art") or ""))
	anliegen = [_anliegen_dict(frappe.get_doc(DT_A, x)) for x in frappe.get_all(DT_A, filters={"vertrag_id": pt["id"]}, order_by="creation desc", pluck="name", limit_page_length=0)]
	rb, si = akte["rueckbau"], akte["sicherheit"]
	try:
		beendbar = backoffice and pt["status"] != "beendet" and K.beenden_pruefen(akte)
	except K.PachtakteFehler:
		beendbar = False
	return {
		"vertrag": {**(vertrag_ausgabe or FA._vertrag_ausgabe(pt)), **kurz, "statusLabel": L.PACHTVERTRAG_STATUS.get(pt["status"], pt["status"])},
		"flaeche": {"id": f["id"], "bezeichnung": f["bezeichnung"], "status": f["status"], "agri": f["agri"], "land": f["land"], "kategorie": kategorie} if f else None,
		"angebot": {k: pa[k] for k in ANGEBOT_FELDER if pa.get(k) not in (None, "")} if pa else None,
		"fristen": K.vertrags_fristen(kurz, pa, heute),
		"rueckbau": {**rb, "statusLabel": K.RUECKBAU_STATUS.get(rb["status"], {}).get("label"), "text": K.RUECKBAU_STATUS.get(rb["status"], {}).get("text"), "verlauf": _verlauf_aus(rb.get("verlauf"), backoffice), "moeglich": K.rueckbau_moeglich(kurz, heute),
			"aktionen": [{"nach": u["nach"], "aktion": u["aktion"], "pflicht": u.get("pflicht") or []} for u in K.RUECKBAU_UEBERGAENGE if u["wer"] == ("admin" if backoffice else "eigentuemer") and rb["status"] in u["von"]]},
		"sicherheit": {**si, "statusLabel": K.SICHERHEIT_STATUS.get(si["status"], {}).get("label"), "artLabel": K.SICHERHEIT_ARTEN.get(si.get("art") or "", ""), "verlauf": _verlauf_aus(si.get("verlauf"), backoffice), "hinweise": K.sicherheit_hinweise(akte, kurz)},
		"anliegen": [_anliegen_aus(a, pt, backoffice) for a in anliegen],
		"agri": {"moeglich": True, "kategorie": kategorie, "nachweise": [_nachweis_aus(x, pt, backoffice, K.agri_referenz(nachweise, fach_agri, x["daten"].get("einheit")), kategorie) for x in nachweise], "referenz": K.agri_referenz(nachweise, fach_agri, "")} if agri_moeglich else {"moeglich": False, "nachweise": []},
		"historie": [{"am": h.get("am"), "ab": h.get("ab") or "", "anlass": h.get("anlass"), **({"vonName": name_von(h.get("vonId")), "nachName": name_von(h.get("nachId"))} if backoffice else {})} for h in akte["historie"]],
		"beendbar": bool(beendbar),
	}


def _eigener_vertrag(n, vertrag_id):
	doc = _vertrag(vertrag_id)
	if doc.eigentuemer_id != n.id:
		verboten("Dieser Pachtvertrag gehört nicht zu Ihrem Konto.")
	return doc


def _zustaendig(pt):
	f = _flaeche(pt.get("flaecheId"))
	from oekoinvest_app.plattform.kern import konto_json

	kandidaten = []
	for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name", limit_page_length=0):
		kj = konto_json(frappe.get_doc("Plattform Konto", k))
		if "admin" in (kj.get("rollen") or []) and stufe(frappe._dict(kj), BEREICH) >= 2:
			kandidaten.append(kj["id"])
	if f and f.get("zustaendigId") in kandidaten:
		return f["zustaendigId"]
	return kandidaten[0] if kandidaten else None


def _aufgabe(n, pt, titel, beschreibung):
	z = _zustaendig(pt)
	if not z:
		return None
	a = frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(beschreibung, 2000), "faellig_am": add_days(nowdate(), K.ANLIEGEN_BEARBEITUNG_TAGE), "zustaendig_id": z, "status": "offen",
		"erstellt_von": n.id, "bezug_art": "flaeche" if pt.get("flaecheId") else "", "bezug_id": pt.get("flaecheId") or None, "bezug_doctype": "Plattform Flaeche" if pt.get("flaecheId") else None}).insert(ignore_permissions=True)
	B.anlegen(z, "aufgabe", f"Neue Aufgabe: {a.titel}"[:160], "Pachtakte", link="/portal/admin/pachtakten", objekt_art="flaeche" if pt.get("flaecheId") else None, objekt_id=pt.get("flaecheId"))
	return a.name


def _aufgabe_erledigen(n, aufgabe_id):
	if aufgabe_id and frappe.db.exists("Plattform Aufgabe", aufgabe_id) and frappe.db.get_value("Plattform Aufgabe", aufgabe_id, "status") == "offen":
		frappe.db.set_value("Plattform Aufgabe", aufgabe_id, {"status": "erledigt", "erledigt_am": frappe.utils.now_datetime(), "erledigt_von": n.id})


def _melden(pt, konto_id, titel, text):
	B.anlegen(konto_id, "status", titel, text, link="/portal/pachtvertraege", objekt_art="pachtvertrag", objekt_id=pt["id"])


# ================================================================ Eigentümer


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	_eigentuemer_rolle(n)
	fin = FA.meine(als_benutzer=als_benutzer)
	aus = {x["id"]: x for x in (fin.get("pacht") or {}).get("vertraege") or []}
	eigene = frappe.get_all(DT_V, filters={"eigentuemer_id": n.id, "status": ["!=", "entwurf"]}, pluck="name", limit_page_length=0)
	vertraege = [_akte_aus(frappe.get_doc(DT_V, x), vertrag_ausgabe=aus.get(x)) for x in eigene]
	frueher = []
	for a in frappe.get_all(DT_P, filters={"historie": ["like", f"%{n.id}%"]}, fields=["vertrag_id", "historie"], limit_page_length=0):
		h = [x for x in (aus_json(a.historie, []) or []) if x.get("vonId") == n.id]
		if h and a.vertrag_id not in eigene:
			frueher.append({"id": a.vertrag_id, "bezeichnung": frappe.db.get_value(DT_V, a.vertrag_id, "bezeichnung") or "", "uebergabe": {"am": h[-1].get("am"), "ab": h[-1].get("ab") or "", "anlass": h[-1].get("anlass")}})
	belege = (fin.get("pacht") or {}).get("belege") or []
	return {"vertraege": vertraege, "frueher": frueher, "bescheinigungsJahre": K.bescheinigungs_jahre(belege), "auszahlung": (fin.get("pacht") or {}).get("auszahlung")}


@frappe.whitelist(methods=["POST"])
def anliegen_anlegen(vertragId=None, art=None, daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_eigentuemer_rolle(n)
	pt_doc = _eigener_vertrag(n, vertragId)
	pt = A.pachtvertrag_dict(pt_doc)
	akte = _akte_dict(_akte_doc(pt, _flaeche(pt.get("flaecheId"))))
	a0 = K.auswahl(art, K.ANLIEGEN_ARTEN)
	offene = [{"art": x.art, "status": x.status} for x in frappe.get_all(DT_A, filters={"vertrag_id": pt["id"]}, fields=["art", "status"], limit_page_length=0)]
	_k(K.anliegen_erlaubt, a0, _kurz(pt, akte), offene)
	d = _k(K.anliegen_bereinigen, a0, aus_json(daten, {}) or {}, heute=_heute(), land=pt["land"], vertrag=_kurz(pt, akte))
	bis = add_days(nowdate(), K.ANLIEGEN_BEARBEITUNG_TAGE)
	a = {"art": a0, "daten": d}
	doc = frappe.get_doc({"doctype": DT_A, "vertrag_id": pt["id"], "konto_id": n.id, "art": a0, "status": "eingereicht", "bearbeitung_bis": bis, "daten": als_json(d), "verlauf": als_json([{"am": jetzt_iso(), "von": "", "nach": "eingereicht", "wer": "eigentuemer", "nutzerId": n.id, "text": ""}])})
	doc.aufgabe_id = _aufgabe(n, pt, f"Pachtakte: {K.ANLIEGEN_ARTEN[a0]['kurz']} – {pt['bezeichnung']}", f"{K.anliegen_zusammenfassung(a)}\nEigentümer: {name_von(n.id)}\nBearbeitung: /portal/admin/pachtakten")
	doc.insert(ignore_permissions=True)
	protokoll(n, "pachtakte_anliegen", "pachtvertrag", pt["id"], f"Anliegen „{K.ANLIEGEN_ARTEN[a0]['kurz']}“ eingereicht: {K.anliegen_zusammenfassung(a)}"[:280], ip or "")
	_melden(pt, n.id, f"Anliegen eingegangen: {K.ANLIEGEN_ARTEN[a0]['kurz']}", f"Wir bearbeiten Ihr Anliegen zu „{pt['bezeichnung']}“ und melden uns bis {K.datum_de(str(bis))}.")
	return _anliegen_aus(_anliegen_dict(doc), pt)


def _wirkung(n, a, pt_doc, akte, ergebnis):
	pt = A.pachtvertrag_dict(pt_doc)
	if a["art"] == "kuendigung":
		pt_doc.status = "gekuendigt"
		pt_doc.save(ignore_permissions=True)
		akte["kuendigungZum"] = ergebnis["wirksamZum"]
		protokoll(n, "pachtvertrag_gekuendigt", "pachtvertrag", pt["id"], f"Kündigung wirksam zum {K.datum_de(ergebnis['wirksamZum'])} (Anliegen {a['id']})")
	if a["art"] in ("eigentuemerwechsel", "erbfall") and ergebnis.get("neuesKontoId"):
		neu = v.kennung(ergebnis["neuesKontoId"])
		from oekoinvest_app.plattform.kern import konto_json

		konto = frappe.get_doc("Plattform Konto", neu) if neu and frappe.db.exists("Plattform Konto", neu) else None
		kj = konto_json(konto) if konto else None
		if not kj or not kj.get("aktiv") or not any(r in (kj.get("rollen") or []) for r in EIGENTUEMER_ROLLEN):
			ungueltig("Das neue Konto muss ein aktives Eigentümer- oder Landwirt-Konto sein.")
		if neu == pt_doc.eigentuemer_id:
			ungueltig("Das neue Konto ist bereits Eigentümer dieses Vertrags.")
		alt = pt_doc.eigentuemer_id
		akte["historie"] = (akte.get("historie") or []) + [{"am": jetzt_iso(), "ab": ergebnis.get("ab") or "", "vonId": alt, "nachId": neu, "anlass": "erbfall" if a["art"] == "erbfall" else (a["daten"].get("anlass") or "wechsel"), "anliegenId": a["id"]}]
		pt_doc.eigentuemer_id = neu
		pt_doc.save(ignore_permissions=True)
		fid = pt.get("flaecheId")
		if fid and frappe.db.get_value("Plattform Flaeche", fid, "nutzer_id") == alt:
			frappe.db.set_value("Plattform Flaeche", fid, "nutzer_id", neu)
			protokoll(n, "flaeche_eigentuemer", "flaeche", fid, f"Fläche an {name_von(neu)} übertragen (Anliegen {a['id']})")
		protokoll(n, "pachtvertrag_eigentuemer", "pachtvertrag", pt["id"], f"Eigentümer gewechselt: {name_von(alt)} → {name_von(neu)} (Anliegen {a['id']})")
		_melden(pt, neu, "Pachtvertrag übernommen", f"Sie sind jetzt Vertragspartner für „{pt['bezeichnung']}“. Bitte schließen Sie die Verifizierung ab, damit die Pacht ausgezahlt werden kann.")
	if a["art"] == "zahlungsaufteilung":
		akte["aufteilung"] = {"empfaenger": a["daten"].get("empfaenger"), "grundlage": a["daten"].get("grundlage"), "ab": a["daten"].get("ab") or "", "anliegenId": a["id"], "am": jetzt_iso()}
		protokoll(n, "pachtvertrag_aufteilung", "pachtvertrag", pt["id"], f"Zahlungsaufteilung vermerkt: {K.anliegen_zusammenfassung(a)} (Anliegen {a['id']})"[:280])


@frappe.whitelist(methods=["POST"])
def anliegen_aktion(id=None, eingabe=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not n:
		nicht_angemeldet()
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_A, k):
		nicht_gefunden("Anliegen nicht gefunden.")
	doc = frappe.get_doc(DT_A, k)
	a = _anliegen_dict(doc)
	pt_doc = _vertrag(a["vertragId"])
	pt = A.pachtvertrag_dict(pt_doc)
	eigen = a["kontoId"] == n.id and pt_doc.eigentuemer_id == n.id and not ist_admin(n)
	wer = "eigentuemer" if eigen else "admin"
	if not eigen:
		_schreib_noetig(n)
	e = aus_json(eingabe, {}) or {}
	u = _k(K.anliegen_uebergang, a, K.text(e.get("nach"), 30), wer, e, _heute())
	akte_doc = _akte_doc(pt, _flaeche(pt.get("flaecheId")))
	akte = _akte_dict(akte_doc)
	if u["nach"] == "erledigt":
		_wirkung(n, a, pt_doc, akte, u["ergebnis"])
		_akte_speichern(akte_doc, akte)
		doc.ergebnis = als_json({"text": u["kommentar"], **u["ergebnis"], "am": jetzt_iso()})
	doc.status = u["nach"]
	if u["nach"] == "eingereicht":
		doc.bearbeitung_bis = add_days(nowdate(), K.ANLIEGEN_BEARBEITUNG_TAGE)
	doc.verlauf = als_json(a["verlauf"] + [{"am": jetzt_iso(), "von": u["von"], "nach": u["nach"], "wer": wer, "nutzerId": n.id, "text": u["kommentar"]}])
	doc.save(ignore_permissions=True)
	if u["nach"] in ("erledigt", "abgelehnt", "zurueckgezogen"):
		_aufgabe_erledigen(n, doc.aufgabe_id)
	protokoll(n, "pachtakte_anliegen", "pachtvertrag", pt["id"], f"Anliegen {doc.name}: {u['aktion']}", ip or "")
	texte = {
		"in_pruefung": ("Anliegen in Bearbeitung", f"Wir bearbeiten Ihr Anliegen zu „{pt['bezeichnung']}“."),
		"rueckfrage": ("Rückfrage zu Ihrem Anliegen", f"Zu „{pt['bezeichnung']}“ brauchen wir noch eine Angabe – bitte antworten Sie in der Pachtakte."),
		"erledigt": ("Anliegen erledigt", f"Ihr Anliegen zu „{pt['bezeichnung']}“ ist abgeschlossen – das Ergebnis finden Sie in der Pachtakte."),
		"abgelehnt": ("Anliegen abgelehnt", f"Ihr Anliegen zu „{pt['bezeichnung']}“ konnte so nicht umgesetzt werden – Begründung in der Pachtakte."),
	}
	if wer == "admin" and u["nach"] in texte:
		_melden(pt, a["kontoId"], *texte[u["nach"]])
	elif wer == "eigentuemer" and u["nach"] == "eingereicht":
		z = frappe.db.get_value("Plattform Aufgabe", doc.aufgabe_id, "zustaendig_id") if doc.aufgabe_id else _zustaendig(pt)
		if z:
			B.anlegen(z, "aufgabe", f"Antwort zur Pachtakte: {pt['bezeichnung']}"[:160], "Der Eigentümer hat auf die Rückfrage geantwortet.", link="/portal/admin/pachtakten")
	return _anliegen_aus(_anliegen_dict(doc), A.pachtvertrag_dict(pt_doc), backoffice=wer == "admin")


@frappe.whitelist(methods=["POST"])
def agri_speichern(vertragId=None, id=None, daten=None, einreichen=False, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_eigentuemer_rolle(n)
	pt_doc = _eigener_vertrag(n, vertragId)
	pt = A.pachtvertrag_dict(pt_doc)
	if pt["status"] == "beendet":
		konflikt("Der Pachtvertrag ist beendet.")
	f = _flaeche(pt.get("flaecheId"))
	fach_agri = ((f or {}).get("fach") or {}).get("agri") or {}
	if not (f and (f.get("agri") or fach_agri.get("kultur"))):
		konflikt("Bewirtschaftungsnachweise gibt es nur für Agri-PV-Flächen.")
	d = _k(K.agri_nachweis_bereinigen, aus_json(daten, {}) or {}, _heute())
	if d["art"] == "betrieb" and not pt.get("beginn"):
		ungueltig("Betriebsjahre gibt es erst ab Pachtbeginn (Bau bzw. Inbetriebnahme) – bitte als Referenzjahr erfassen.")
	doc = None
	if id:
		k = v.kennung(id)
		if not k or not frappe.db.exists(DT_N, k) or frappe.db.get_value(DT_N, k, "vertrag_id") != pt["id"]:
			nicht_gefunden("Nachweis nicht gefunden.")
		doc = frappe.get_doc(DT_N, k)
	doppelt = frappe.get_all(DT_N, filters={"vertrag_id": pt["id"], "jahr": d["jahr"], "art": d["art"], "name": ["!=", doc.name if doc else ""]}, pluck="name")
	if doppelt:
		konflikt(f"Für {d['jahr']} gibt es bereits einen Nachweis ({K.AGRI_NACHWEIS_ARTEN[d['art']]}).")
	if doc and not K.agri_bearbeitbar({"status": doc.status}):
		konflikt("Der Nachweis ist eingereicht bzw. bestätigt und kann nicht mehr geändert werden.")
	if not doc:
		doc = frappe.get_doc({"doctype": DT_N, "vertrag_id": pt["id"], "konto_id": n.id, "flaeche_id": pt.get("flaecheId"), "status": "entwurf", "verlauf": als_json([])})
	doc.jahr, doc.art, doc.daten = d["jahr"], d["art"], als_json(d)
	verlauf = aus_json(doc.verlauf, []) or []
	if cint(einreichen) or einreichen is True:
		u = _k(K.agri_uebergang, {"status": doc.status or "entwurf"}, "eingereicht", "eigentuemer", {})
		doc.status = u["nach"]
		verlauf.append({"am": jetzt_iso(), "von": u["von"], "nach": u["nach"], "wer": "eigentuemer", "nutzerId": n.id, "text": ""})
		doc.aufgabe_id = _aufgabe(n, pt, f"Agri-PV-Nachweis {d['jahr']} prüfen – {pt['bezeichnung']}", f"{K.AGRI_NACHWEIS_ARTEN[d['art']]}, {K.AGRI_NACHWEIS_KULTUREN[d['kultur']]}, {d['ertrag']} {K.AGRI_NACHWEIS_EINHEITEN[d['einheit']]}\nBearbeitung: /portal/admin/pachtakten")
		protokoll(n, "agri_nachweis", "pachtvertrag", pt["id"], f"Agri-PV-Nachweis {d['jahr']} eingereicht", ip or "")
	doc.verlauf = als_json(verlauf)
	doc.save(ignore_permissions=True) if not doc.is_new() else doc.insert(ignore_permissions=True)
	alle = [_nachweis_dict(frappe.get_doc(DT_N, x)) for x in frappe.get_all(DT_N, filters={"vertrag_id": pt["id"]}, pluck="name", limit_page_length=0)]
	return _nachweis_aus(_nachweis_dict(doc), pt, referenz=K.agri_referenz(alle, fach_agri, d["einheit"]), kategorie=fach_agri.get("kategorie") or "")


@frappe.whitelist(methods=["POST"])
def agri_aktion(id=None, eingabe=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_N, k):
		nicht_gefunden("Nachweis nicht gefunden.")
	doc = frappe.get_doc(DT_N, k)
	x = _nachweis_dict(doc)
	e = aus_json(eingabe, {}) or {}
	u = _k(K.agri_uebergang, x, K.text(e.get("nach"), 30), "admin", e)
	doc.status = u["nach"]
	doc.verlauf = als_json(x["verlauf"] + [{"am": jetzt_iso(), "von": u["von"], "nach": u["nach"], "wer": "admin", "nutzerId": n.id, "text": u["kommentar"]}])
	doc.save(ignore_permissions=True)
	_aufgabe_erledigen(n, doc.aufgabe_id)
	pt = A.pachtvertrag_dict(_vertrag(doc.vertrag_id))
	protokoll(n, "agri_nachweis", "pachtvertrag", pt["id"], f"Agri-PV-Nachweis {x['daten'].get('jahr')}: {u['aktion']}", ip or "")
	_melden(pt, doc.konto_id, f"Bewirtschaftungsnachweis {x['daten'].get('jahr')} bestätigt" if u["nach"] == "bestaetigt" else f"Rückfrage zum Nachweis {x['daten'].get('jahr')}", f"Ihr Nachweis zu „{pt['bezeichnung']}“ ist geprüft." if u["nach"] == "bestaetigt" else "Bitte ergänzen Sie den Nachweis in der Pachtakte.")
	f = _flaeche(pt.get("flaecheId"))
	fach_agri = ((f or {}).get("fach") or {}).get("agri") or {}
	alle = [_nachweis_dict(frappe.get_doc(DT_N, y)) for y in frappe.get_all(DT_N, filters={"vertrag_id": pt["id"]}, pluck="name", limit_page_length=0)]
	return _nachweis_aus(_nachweis_dict(doc), pt, backoffice=True, referenz=K.agri_referenz(alle, fach_agri, x["daten"].get("einheit")), kategorie=fach_agri.get("kategorie") or "")


@frappe.whitelist(methods=["POST"])
def rueckbau_aktion(vertragId=None, eingabe=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not n:
		nicht_angemeldet()
	pt_doc = _vertrag(vertragId)
	pt = A.pachtvertrag_dict(pt_doc)
	eigen = pt_doc.eigentuemer_id == n.id and not ist_admin(n)
	if not eigen:
		_schreib_noetig(n)
	e = aus_json(eingabe, {}) or {}
	ziel = K.auswahl(e.get("ziel") or "rueckbau", {"rueckbau": 1, "sicherheit": 1, "vertrag": 1})
	if eigen and ziel != "rueckbau":
		verboten("Dieser Schritt ist dem Backoffice vorbehalten.")
	akte_doc = _akte_doc(pt, _flaeche(pt.get("flaecheId")))
	akte = _akte_dict(akte_doc)
	nach = K.text(e.get("nach"), 30)
	if ziel == "rueckbau":
		u = _k(K.rueckbau_uebergang, akte, nach, "eigentuemer" if eigen else "admin", e, _kurz(pt, akte), _heute())
		rb = akte["rueckbau"]
		rb["status"] = u["nach"]
		if u["termin"]:
			rb["termin"] = u["termin"]
		rb["verlauf"] = (rb.get("verlauf") or []) + [{"am": jetzt_iso(), "von": u["von"], "nach": u["nach"], "wer": "eigentuemer" if eigen else "admin", "nutzerId": n.id, "text": " · ".join(x for x in (u["kommentar"], f"Termin {K.datum_de(u['termin'])}" if u["termin"] else "") if x)}]
		protokoll(n, "pachtakte_rueckbau", "pachtvertrag", pt["id"], f"Rückbau: {u['aktion']}", ip or "")
		if eigen:
			z = _zustaendig(pt)
			if z:
				B.anlegen(z, "aufgabe", f"Rückbau {'abgenommen' if u['nach'] == 'abgenommen' else '– Mängel gemeldet'}: {pt['bezeichnung']}"[:160], u["kommentar"] or "Der Eigentümer hat die Abnahme bestätigt.", link="/portal/admin/pachtakten")
		else:
			_melden(pt, pt["eigentuemerId"], f"Rückbau: {K.RUECKBAU_STATUS[u['nach']]['label']}", f"Bitte prüfen Sie die Fläche „{pt['bezeichnung']}“ und bestätigen Sie die Abnahme in der Pachtakte." if u["nach"] == "abnahme_bereit" else f"Neuer Stand zum Rückbau „{pt['bezeichnung']}“.")
	elif ziel == "sicherheit":
		u = _k(K.sicherheit_uebergang, akte, nach, e)
		si = akte["sicherheit"]
		si["status"] = u["nach"]
		if u["nach"] == "hinterlegt":
			si.update({"art": u["art"], "betrag": u["betrag"], "geber": u["geber"], "hinterlegtAm": u["hinterlegtAm"]})
		si["verlauf"] = (si.get("verlauf") or []) + [{"am": jetzt_iso(), "von": u["von"], "nach": u["nach"], "wer": "admin", "nutzerId": n.id, "text": (f"{K.SICHERHEIT_ARTEN[u['art']]} über {L.euro(u['betrag'])} ({u['geber']})" + (f" · {u['kommentar']}" if u.get("kommentar") else "")) if u["nach"] == "hinterlegt" else u["kommentar"]}]
		protokoll(n, "pachtakte_sicherheit", "pachtvertrag", pt["id"], f"Rückbausicherheit {K.SICHERHEIT_STATUS[u['nach']]['label']}", ip or "")
		_melden(pt, pt["eigentuemerId"], f"Rückbausicherheit {K.SICHERHEIT_STATUS[u['nach']]['label'].lower()}", f"Zu „{pt['bezeichnung']}“ gibt es einen neuen Stand der Rückbausicherheit.")
	elif ziel == "vertrag":
		if nach != "beendet":
			ungueltig("Unbekannter Schritt.")
		if pt["status"] == "beendet":
			konflikt("Der Pachtvertrag ist bereits beendet.")
		_k(K.beenden_pruefen, akte)
		kommentar = K.mehrzeilig(e.get("kommentar"), 1000)
		if len(kommentar) < 3:
			ungueltig("Bitte das Vertragsende dokumentieren (z. B. Löschungsbewilligung der Dienstbarkeit erteilt).")
		pt_doc.status = "beendet"
		pt_doc.save(ignore_permissions=True)
		akte["rueckbau"]["beendetAm"] = K.heute_wien() if hasattr(K, "heute_wien") else jetzt_iso()[:10]  # Abrechnungslauf: letzte Gutschrift anteilig bis hier
		akte["rueckbau"]["verlauf"] = (akte["rueckbau"].get("verlauf") or []) + [{"am": jetzt_iso(), "von": "abgenommen", "nach": "abgenommen", "wer": "admin", "nutzerId": n.id, "text": f"Vertrag beendet: {kommentar}"}]
		protokoll(n, "pachtvertrag_beendet", "pachtvertrag", pt["id"], f"Pachtvertrag beendet: {kommentar}"[:280], ip or "")
		_melden(pt, pt["eigentuemerId"], "Pachtvertrag beendet", f"Der Pachtvertrag „{pt['bezeichnung']}“ ist abgeschlossen. Ihre Abrechnungen bleiben im Portal abrufbar.")
	else:
		ungueltig("Unbekannter Bereich.")
	_akte_speichern(akte_doc, akte)
	return _akte_aus(frappe.get_doc(DT_V, pt["id"]), backoffice=not eigen)


@frappe.whitelist(methods=["POST"])
def jahresbescheinigung(jahr=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_eigentuemer_rolle(n)
	fin = FA.meine(als_benutzer=als_benutzer)
	belege = (fin.get("pacht") or {}).get("belege") or []
	j = cint(jahr)
	if j not in K.bescheinigungs_jahre(belege):
		nicht_gefunden("Für dieses Jahr liegen keine Pachtabrechnungen vor.")
	ids = {(b.get("bezug") or {}).get("pachtvertragId") for b in belege} | set(frappe.get_all(DT_V, filters={"eigentuemer_id": n.id}, pluck="name"))
	vertraege = [{"id": x.name, "bezeichnung": x.bezeichnung, "land": x.land} for x in frappe.get_all(DT_V, filters={"name": ["in", [i for i in ids if i]]}, fields=["name", "bezeichnung", "land"], limit_page_length=0)]
	b = K.jahresbescheinigung(belege, vertraege, j)
	partei = A.partei(konto_id=n.id)
	aussteller = next((x.get("gesellschaft") for x in belege if str((x.get("zeitraum") or {}).get("von") or "").startswith(str(j)) and x.get("gesellschaft")), None) or A.gesellschaft(None)["name"]
	protokoll(n, "jahresbescheinigung", "konto", n.id, f"Jahresbescheinigung {j} abgerufen", ip or "")
	return {**b, "empfaenger": {"name": partei.get("name") or name_von(n.id), "anschrift": partei.get("anschrift") or ""}, "aussteller": aussteller, "erstelltAm": _heute()}


# ================================================================ Backoffice


def _konten():
	from oekoinvest_app.plattform.kern import konto_json

	aus = []
	for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name", limit_page_length=0):
		kj = konto_json(frappe.get_doc("Plattform Konto", k))
		if any(r in (kj.get("rollen") or []) for r in EIGENTUEMER_ROLLEN):
			aus.append({"id": kj["id"], "name": name_von(kj["id"]), "email": kj.get("email") or ""})
	return sorted(aus, key=lambda x: x["name"])


@frappe.whitelist(methods=["POST"])
def backoffice(vertragId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese_noetig(n)
	if vertragId:
		pt_doc = _vertrag(vertragId)
		return {"akte": _akte_aus(pt_doc, backoffice=True), "eigentuemer": {"id": pt_doc.eigentuemer_id, "name": name_von(pt_doc.eigentuemer_id), "email": frappe.db.get_value("Plattform Konto", pt_doc.eigentuemer_id, "email") or ""}, "konten": _konten(), "schreiben": _bo_schreiben(n)}
	heute = _heute()
	vertraege = []
	vt_cache = {}
	for name in frappe.get_all(DT_V, filters={"status": ["!=", "entwurf"]}, pluck="name", limit_page_length=0):
		pt = A.pachtvertrag_dict(frappe.get_doc(DT_V, name))
		vt_cache[name] = pt
		f = _flaeche(pt.get("flaecheId"))
		pa = (f or {}).get("pachtangebot")
		akte_name = frappe.db.get_value(DT_P, {"vertrag_id": name}, "name")
		akte = _akte_dict(frappe.get_doc(DT_P, akte_name)) if akte_name else K.akte_start(pa)
		akte.setdefault("kuendigungZum", "")
		kurz = _kurz(pt, akte)
		naechste = next((x for x in K.vertrags_fristen(kurz, pa, heute) if x["tage"] is not None and x["tage"] >= 0), None)
		vertraege.append({
			**kurz, "eigentuemer": name_von(pt["eigentuemerId"]), "statusLabel": L.PACHTVERTRAG_STATUS.get(pt["status"], pt["status"]),
			"rueckbau": akte["rueckbau"]["status"], "rueckbauLabel": K.RUECKBAU_STATUS[akte["rueckbau"]["status"]]["label"], "sicherheit": akte["sicherheit"]["status"], "sicherheitLabel": K.SICHERHEIT_STATUS[akte["sicherheit"]["status"]]["label"],
			"sicherheitWarnung": any(h["ton"] == "warn" for h in K.sicherheit_hinweise(akte, kurz)), "naechsteFrist": naechste,
			"offeneAnliegen": frappe.db.count(DT_A, {"vertrag_id": name, "status": ["in", list(OFFEN)]}),
		})
	anliegen = [_anliegen_dict(frappe.get_doc(DT_A, x)) for x in frappe.get_all(DT_A, filters={"status": ["in", list(OFFEN)]}, order_by="bearbeitung_bis asc", pluck="name", limit_page_length=500)]
	erledigt = [_anliegen_dict(frappe.get_doc(DT_A, x)) for x in frappe.get_all(DT_A, filters={"status": ["not in", list(OFFEN)]}, order_by="modified desc", pluck="name", limit_page_length=50)]
	nachweise = []
	for x in frappe.get_all(DT_N, filters={"status": "eingereicht"}, pluck="name", limit_page_length=500):
		nd = _nachweis_dict(frappe.get_doc(DT_N, x))
		pt = vt_cache.get(nd["vertragId"]) or A.pachtvertrag_dict(_vertrag(nd["vertragId"]))
		fach_agri = (((_flaeche(pt.get("flaecheId")) or {}).get("fach") or {}).get("agri")) or {}
		alle = [_nachweis_dict(frappe.get_doc(DT_N, y)) for y in frappe.get_all(DT_N, filters={"vertrag_id": pt["id"]}, pluck="name", limit_page_length=0)]
		nachweise.append(_nachweis_aus(nd, pt, backoffice=True, referenz=K.agri_referenz(alle, fach_agri, nd["daten"].get("einheit")), kategorie=fach_agri.get("kategorie") or ""))

	def pt_von(vid):
		return vt_cache.get(vid) or (A.pachtvertrag_dict(frappe.get_doc(DT_V, vid)) if frappe.db.exists(DT_V, vid) else None)

	return {
		"anliegen": [_anliegen_aus(a, pt_von(a["vertragId"]), backoffice=True) for a in anliegen],
		"erledigt": [_anliegen_aus(a, pt_von(a["vertragId"]), backoffice=True) for a in erledigt],
		"nachweise": nachweise, "vertraege": vertraege, "konten": _konten(), "schreiben": _bo_schreiben(n),
	}
