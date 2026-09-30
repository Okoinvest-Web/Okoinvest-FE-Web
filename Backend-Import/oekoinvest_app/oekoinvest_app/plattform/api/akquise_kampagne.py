# Copyright (c) 2026, ÖkoInvest GmbH
#
# Akquise Ausbaustufe 2 (docs/AKQUISE-GEODATEN.md Abschnitt 10/11, docs/API.md „Akquise-Kampagnen“) – Referenz:
# src/lib/plattform/backend/demo/akquise-kampagne.js und gemeinde-screening.js (gleiche Semantik, gleiche Ausgaben).
#
#   Kampagne → Ziele (Kandidaten des Geodaten-Dienstes) → Empfänger (Eigentümer aus dem Grundbuch, manuell) mit Einmalcode
#   Aufgabenkette: Start → je Ziel Aufgabe „Grundbuchabfrage“ (Kostenschätzung) → Ergebnis → Serienbrief (Druckformat
#   „Serienbrief Akquise“ bzw. PDF der Website) → Versand bestätigen → Rücklauf → Nachfassen (täglich, scheduler_events)
#   Sperrliste: Widerspruch → Person (Hash Name + PLZ) und Flurstücke gesperrt, über alle Kampagnen
#   Gemeinde-Screening: Ranking aus Kandidaten (vom Website-Server aus dem Dienst geladen) + gepflegten Angaben
#
# Rechte (jede Methode selbst): Backoffice-Bereich „geodaten“ (Leitung, Akquise); Änderungen zusätzlich „akquise“ schreiben.
# Öffentlich (Angebotsseite) nur über den API-Benutzer der Website und nur der Flächen-Steckbrief ohne Eigentümerdaten.
# Pfeffer der Sperr-Hashes: site_config „oekoinvest_sperrliste_pfeffer“ (geheim, nie ändern – sonst greifen alte Sperren nicht).

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import akquise_kampagne_kern as kk
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.druck import FIRMA
from oekoinvest_app.plattform.kern import aus_json, als_json, api_pruefen, iso, jetzt, jetzt_iso, konflikt, name_von, nicht_gefunden, nutzer, protokoll, sha256, ungueltig
from oekoinvest_app.plattform.konstanten import PRAEFIX
from oekoinvest_app.plattform.mail import basis_url
from oekoinvest_app.plattform.rechte import recht_noetig, unterrollen

PRAEFIX.update({"Plattform Kampagne": "AQ", "Plattform Kampagnenziel": "AQZ", "Plattform Sperrliste": "SL", "Plattform Gemeinde Potenzial": "GP"})

DT_K = "Plattform Kampagne"
DT_Z = "Plattform Kampagnenziel"
DT_S = "Plattform Sperrliste"
DT_G = "Plattform Gemeinde Potenzial"
EMPF_FELDER = {
	# camelCase (Website) → Feld der Kindtabelle
	"anrede": "anrede", "titel": "titel", "vorname": "vorname", "nachname": "nachname", "firma": "firma", "zusatz": "zusatz", "strasse": "strasse", "plz": "plz", "ort": "ort",
	"land": "land", "code": "code", "codeAktiv": "code_aktiv", "gesperrt": "gesperrt", "gesperrtGrund": "gesperrt_grund", "status": "status", "aufrufe": "aufrufe",
	"rueckmeldungText": "rueckmeldung_text",
}
EMPF_JSON = {"flurstuecke": "flurstuecke", "briefe": "briefe", "anfragen": "anfragen", "termine": "termine", "einwilligungTelefon": "einwilligung_telefon", "einwilligungEmail": "einwilligung_email", "nachfass": "nachfass"}
EMPF_ZEIT = {"ersterAufrufAm": "erster_aufruf_am", "letzterAufrufAm": "letzter_aufruf_am", "rueckmeldungAm": "rueckmeldung_am", "widerspruchAm": "widerspruch_am"}


def _pfeffer():
	return frappe.conf.get("oekoinvest_sperrliste_pfeffer") or "oekoinvest-sperrliste-demo"


def _hash(s):
	return sha256(f"{_pfeffer()}|{s}")


def _schreibrecht(n):
	recht_noetig(n, "geodaten", 2)
	recht_noetig(n, "akquise", 2)


def _leitung(n):
	return "leitung" in unterrollen(n)


# ---------------------------------------------------------------- Umwandlung Doc ↔ Dict (camelCase wie die Demo)


def _empf(row, mit_hash=False):
	d = {"id": row.empfaenger_id}
	for k, f in EMPF_FELDER.items():
		d[k] = row.get(f)
	d["codeAktiv"] = bool(cint(row.code_aktiv))
	d["gesperrt"] = bool(cint(row.gesperrt))
	d["aufrufe"] = cint(row.aufrufe)
	for k, f in EMPF_JSON.items():
		d[k] = aus_json(row.get(f), [] if k in ("flurstuecke", "briefe", "anfragen", "termine") else ({} if k == "nachfass" else None))
	for k, f in EMPF_ZEIT.items():
		d[k] = iso(row.get(f))
	if mit_hash:
		d["sperrHash"] = row.sperr_hash
	return d


def _empf_setzen(row, d):
	for k, f in EMPF_FELDER.items():
		if k in d:
			row.set(f, d[k])
	for k, f in EMPF_JSON.items():
		if k in d:
			row.set(f, als_json(d[k]))
	for k, f in EMPF_ZEIT.items():
		if k in d:
			row.set(f, get_datetime(d[k]) if d[k] else None)


def _ziel(z, mit_empfaengern=True, intern=False):
	sch = aus_json(z.grundbuch_schaetzung, {}) or {}
	empf = [_empf(e, mit_hash=intern) for e in z.empfaenger]
	d = {
		"id": z.name, "kampagneId": z.kampagne, "kandidatId": z.kandidat_id, "demo": bool(cint(z.demo)), "land": z.land, "bundesland": z.bundesland, "bezirk": z.bezirk,
		"gemeinde": z.gemeinde, "ha": flt(z.flaeche_ha), "mwp": flt(z.mwp), "score": cint(z.score), "ampel": z.ampel, "prioritaet": z.prioritaet,
		"parzellen": aus_json(z.parzellen, []) or [], "netz": aus_json(z.netz), "kulisse": aus_json(z.kulisse), "widmungText": z.widmung_text or "",
		"schwerpunkt": aus_json(z.schwerpunkt), "pacht": aus_json(z.pacht, {}) or {}, "status": z.status, "statusLabel": kk.ZIEL_STATUS.get(z.status, z.status),
		"gesperrteFlurstuecke": aus_json(z.gesperrte_flurstuecke, []) or [], "auchInAndererKampagne": bool(cint(z.auch_in_anderer_kampagne)),
		"grundbuch": {"schaetzung": sch, "aufgabeId": z.grundbuch_aufgabe, "status": z.grundbuch_status, "kostenIst": flt(z.grundbuch_kosten_ist) if z.grundbuch_kosten_ist else None, "ergebnisAm": iso(z.grundbuch_ergebnis_am)},
		"gesichertHa": flt(z.gesichert_ha) if z.gesichert_ha else None, "empfaengerAnzahl": len(empf),
	}
	if mit_empfaengern:
		d["empfaenger"] = [{**e, "anzeige": kk.person_maskiert(e), "statusLabel": kk.EMPFAENGER_STATUS.get(e["status"], e["status"])} for e in empf]
	if intern:
		d["empfaengerIntern"] = empf
		d["geometrie"] = aus_json(z.geometrie)
	return d


def _kampagne_dict(k):
	return {
		"id": k.name, "name": k.titel, "beschreibung": k.beschreibung or "", "land": k.land, "status": k.status, "statusLabel": kk.KAMPAGNE_STATUS.get(k.status),
		"quelle": {"art": k.quelle_art, "gemeinde": k.quelle_gemeinde or "", "filter": aus_json(k.quelle_filter)}, "nachfass": aus_json(k.nachfass, []) or [],
		"kosten": {"porto": flt(k.kosten_porto) or None, "druck": flt(k.kosten_druck) or None, "sonstige": flt(k.kosten_sonstige)}, "vorlageId": k.vorlage_id,
		"test": bool(cint(k.test)), "demo": bool(cint(k.demo)), "zustaendigId": k.zustaendig_id, "erstelltVon": k.erstellt_von, "erstelltAm": iso(k.creation), "gestartetAm": iso(k.gestartet_am),
	}


def _ziele_von(kampagne_id):
	return [frappe.get_doc(DT_Z, x) for x in frappe.get_all(DT_Z, filters={"kampagne": kampagne_id}, pluck="name", order_by="creation asc", limit_page_length=0)]


def _kampagne_aus(k, ziele=None):
	ziele = ziele if ziele is not None else _ziele_von(k.name)
	d = _kampagne_dict(k)
	d["erstelltVonName"] = name_von(k.erstellt_von)
	d["zustaendigName"] = name_von(k.zustaendig_id)
	d["kennzahlen"] = kk.kampagnen_kennzahlen(d, [_ziel(z) for z in ziele])
	return d


# ---------------------------------------------------------------- Sperrliste (intern)


def _person_gesperrt(person):
	h = _hash(kk.person_schluessel(person))
	return frappe.db.get_value(DT_S, {"person_hash": h, "aktiv": 1}, ["name", "grund", "creation"], as_dict=True)


def _flurstueck_gesperrt(land, p):
	"""Aktiver Sperrlisten-Eintrag zu einem Flurstück (Hash) oder None."""
	h = _hash(kk.flurstueck_schluessel(land, (p or {}).get("kgNr"), (p or {}).get("gstNr")))
	return frappe.db.get_value(DT_S, {"aktiv": 1, "flurstueck_hashes": ["like", f'%"{h}"%']}, ["name", "grund", "creation"], as_dict=True)


def _flurstueck_hashes_aktiv():
	aktiv = set()
	for x in frappe.get_all(DT_S, filters={"aktiv": 1}, fields=["flurstueck_hashes"], limit_page_length=0):
		aktiv.update(aus_json(x.flurstueck_hashes, []) or [])
	return aktiv


def _sperre_eintragen(n, person=None, land=None, flurstuecke=(), grund="widerspruch", quelle="brief", kampagne=None, ziel=None, notiz=""):
	person_hash = _hash(kk.person_schluessel(person)) if person else None
	f_hashes = [_hash(kk.flurstueck_schluessel(land, p.get("kgNr"), p.get("gstNr"))) for p in flurstuecke]
	vorhanden = frappe.db.get_value(DT_S, {"person_hash": person_hash, "aktiv": 1}, "name") if person_hash else None
	if vorhanden:
		s = frappe.get_doc(DT_S, vorhanden)
		s.flurstueck_hashes = als_json(sorted(set((aus_json(s.flurstueck_hashes, []) or []) + f_hashes)))
		s.save(ignore_permissions=True)
	else:
		s = frappe.get_doc({
			"doctype": DT_S, "anzeige": kk.person_maskiert(person) if person else f"{len(f_hashes)} Flurstück(e)", "aktiv": 1,
			"grund": v.auswahl(grund, list(kk.SPERR_GRUENDE), "widerspruch"), "quelle": v.auswahl(quelle, list(kk.SPERR_QUELLEN), "brief"), "land": land or None,
			"person_hash": person_hash, "flurstueck_hashes": als_json(f_hashes), "kampagne": kampagne, "ziel": ziel, "von": (n or {}).get("id"), "notiz": v.text(notiz, 300),
		}).insert(ignore_permissions=True)
		protokoll(n, "sperrliste", "sperrliste", s.name, f"Sperrvermerk ({kk.SPERR_GRUENDE.get(s.grund)}, {kk.SPERR_QUELLEN.get(s.quelle)}) – {s.anzeige}")
	# Sofort wirksam: alle Empfänger derselben Person sperren (Miteigentümer bleiben ansprechbar)
	if person_hash:
		for zname in frappe.get_all("Plattform Kampagnenempfaenger", filters={"sperr_hash": person_hash, "gesperrt": 0}, pluck="parent", limit_page_length=0):
			z = frappe.get_doc(DT_Z, zname)
			for e in z.empfaenger:
				if e.sperr_hash == person_hash and not cint(e.gesperrt):
					e.gesperrt, e.code_aktiv, e.status, e.gesperrt_grund = 1, 0, "widerspruch", kk.SPERR_GRUENDE.get(s.grund)
					if s.grund == "widerspruch" and not e.widerspruch_am:
						e.widerspruch_am = now_datetime()
			if z.empfaenger and all(cint(e.gesperrt) for e in z.empfaenger):
				z.status = "gesperrt"
			z.save(ignore_permissions=True)
	return s


# ---------------------------------------------------------------- Nachfassen


def _nachfassen_intern():
	neu = 0
	heute = now_datetime()
	for kname in frappe.get_all(DT_K, filters={"status": "aktiv"}, pluck="name", limit_page_length=0):
		k = frappe.get_doc(DT_K, kname)
		kd = _kampagne_dict(k)
		for z in _ziele_von(k.name):
			geaendert = False
			for row in z.empfaenger:
				e = _empf(row)
				for f in kk.nachfass_faellig(kd, e, heute):
					eintrag = {"am": jetzt_iso(), "ergebnis": f["ergebnis"], "grund": f["grund"], "aufgabeId": None}
					if f["ergebnis"] == "aufgabe":
						zweiter = f["stufe"]["art"] == "zweiter_brief"
						a = frappe.get_doc({
							"doctype": "Plattform Aufgabe",
							"titel": v.text(("Zweiten Brief senden (einmalig): " if zweiter else "Anruf (Einwilligung liegt vor): ") + f"{z.gemeinde} · {kk.person_maskiert(e)}", 160),
							"beschreibung": "\n".join([
								f"Kampagne {k.titel} ({k.name}), Zielfläche {z.name}: {f['stufe']['nachTagen']} Tage ohne Reaktion auf den Brief vom {str((e.get('briefe') or [{}])[0].get('am') or '')[:10]}.",
								"Zweitbrief über „Serienbrief → Stufe 2“ erzeugen und den Versand bestätigen." if zweiter else f"Einwilligung Telefon: {(e.get('einwilligungTelefon') or {}).get('quelle') or '–'}. Nur im Rahmen dieser Einwilligung anrufen.",
								f"Link: /portal/admin/akquise/kampagnen/{k.name}",
							]),
							"faellig_am": add_days(nowdate(), 3), "zustaendig_id": k.zustaendig_id or k.erstellt_von, "status": "offen", "erstellt_von": k.erstellt_von,
						}).insert(ignore_permissions=True)
						eintrag["aufgabeId"] = a.name
					e["nachfass"] = {**(e.get("nachfass") or {}), f["stufe"]["id"]: eintrag}
					_empf_setzen(row, {"nachfass": e["nachfass"]})
					geaendert = True
					neu += 1
			if geaendert:
				z.save(ignore_permissions=True)
	return neu


def nachfassen_taeglich():
	"""scheduler_events daily: fällige Nachfassstufen aller aktiven Kampagnen."""
	_nachfassen_intern()


@frappe.whitelist(methods=["POST"])
def nachfassen(als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	return {"ok": True, "ausgeloest": _nachfassen_intern()}


# ---------------------------------------------------------------- Lesen


def _kampagne_laden(kid):
	name = v.kennung(kid)
	if not name or not frappe.db.exists(DT_K, name):
		nicht_gefunden("Kampagne nicht gefunden.")
	return frappe.get_doc(DT_K, name)


def _ziel_laden(zid):
	name = v.kennung(zid)
	if not name or not frappe.db.exists(DT_Z, name):
		nicht_gefunden("Zielfläche nicht gefunden.")
	return frappe.get_doc(DT_Z, name)


@frappe.whitelist(methods=["POST"])
def kampagnen(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	_nachfassen_intern()
	liste = [_kampagne_aus(frappe.get_doc(DT_K, x)) for x in frappe.get_all(DT_K, pluck="name", order_by="creation desc", limit_page_length=200)]
	return {"kampagnen": liste, "sperrlisteAnzahl": frappe.db.count(DT_S, {"aktiv": 1})}


@frappe.whitelist(methods=["POST"])
def kampagne(id=None, als_benutzer=None):  # noqa: A002 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	k = _kampagne_laden(id)
	ziele = _ziele_von(k.name)
	aufgaben_ids = [z.grundbuch_aufgabe for z in ziele if z.grundbuch_aufgabe]
	for z in ziele:
		for e in z.empfaenger:
			aufgaben_ids += [x.get("aufgabeId") for x in (aus_json(e.nachfass, {}) or {}).values() if x.get("aufgabeId")]
	aufgaben = [
		{"id": a.name, "titel": a.titel, "status": a.status, "faelligAm": str(a.faellig_am) if a.faellig_am else None, "zustaendig": name_von(a.zustaendig_id)}
		for a in frappe.get_all("Plattform Aufgabe", filters={"name": ["in", aufgaben_ids or ["-"]]}, fields=["name", "titel", "status", "faellig_am", "zustaendig_id"], limit_page_length=0)
	]
	vorlagen = [{"id": x.name, "name": x.bezeichnung or x.name} for x in frappe.get_all("Plattform Vorlage", filters={"aktiv": 1}, fields=["name", "bezeichnung"], limit_page_length=200)]
	return {"kampagne": _kampagne_aus(k, ziele), "ziele": [_ziel(z) for z in ziele], "aufgaben": aufgaben, "vorlagen": vorlagen}


# ---------------------------------------------------------------- Anlegen / Ändern / Starten / Löschen


@frappe.whitelist(methods=["POST"])
def kampagne_anlegen(kandidaten=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	liste = aus_json(kandidaten, []) or []
	d = aus_json(daten, {}) or {}
	name = v.text(d.get("name"), 120)
	v.pflicht(len(name) >= 3, "Bitte einen Namen für die Kampagne angeben (mind. 3 Zeichen).")
	v.pflicht(isinstance(liste, list) and liste, "Die Auswahl enthält keine Kandidatenflächen.")
	v.pflicht(len(liste) <= 300, "Höchstens 300 Flächen je Kampagne.")
	laender = {x.get("land") or "AT" for x in liste if isinstance(x, dict)}
	v.pflicht(len(laender) == 1, "Eine Kampagne umfasst Flächen aus genau einem Land (Rechtslage, Brieftext, Kosten).")
	land = laender.pop()
	v.pflicht(land in ("DE", "AT", "CH"), "Unbekanntes Land.")
	test = d.get("test") is True
	if test:
		v.pflicht(_leitung(n), "Testkampagnen darf nur die Leitung anlegen.")
	quelle = d.get("quelle") if isinstance(d.get("quelle"), dict) else {}
	k = frappe.get_doc({
		"doctype": DT_K, "titel": name, "status": "entwurf", "land": land, "test": 1 if test else 0, "demo": 1 if any(x.get("demo") for x in liste) else 0,
		"beschreibung": v.mehrzeilig(d.get("beschreibung"), 1000), "quelle_art": v.auswahl(quelle.get("art"), ["auswahl", "filter", "gemeinde"], "auswahl"),
		"quelle_gemeinde": v.text(quelle.get("gemeinde"), 80), "quelle_filter": als_json(quelle.get("filter")) if isinstance(quelle.get("filter"), dict) else None,
		"nachfass": als_json(kk.nachfass_bereinigen(d.get("nachfass"), land)), "zustaendig_id": n.id, "erstellt_von": n.id,
	}).insert(ignore_permissions=True)
	gesperrt_fs = _flurstueck_hashes_aktiv()
	aktiv_kandidaten = set(frappe.get_all(DT_Z, filters={"kampagne": ["in", frappe.get_all(DT_K, filters={"status": ["!=", "abgeschlossen"], "name": ["!=", k.name]}, pluck="name") or ["-"]]}, pluck="kandidat_id", limit_page_length=0))
	anzahl_gesperrt = 0
	for c in liste:
		parz = [
			{"id": v.text(p.get("id"), 60), "kg": v.text(p.get("kg"), 80), "kgNr": v.text(p.get("kgNr"), 12), "gstNr": v.text(p.get("gstNr"), 24), "ha": v.zahl(p.get("ha"), min=0, max=100000, stellen=4)}
			for p in (c.get("parzellen") or [])[:60] if isinstance(p, dict)
		]
		gesperrt = [p["id"] for p in parz if _hash(kk.flurstueck_schluessel(land, p["kgNr"], p["gstNr"])) in gesperrt_fs]
		status = "gesperrt" if parz and len(gesperrt) == len(parz) else "offen"
		anzahl_gesperrt += status == "gesperrt"
		ha = v.zahl(c.get("ha"), min=0, max=100000, stellen=2) or 0
		netz = c.get("netz") if isinstance(c.get("netz"), dict) else None
		kn = (netz or {}).get("knoten") or {}
		geom = frappe.as_json(c.get("geometrie")) if c.get("geometrie") else None
		frappe.get_doc({
			"doctype": DT_Z, "titel": v.text(f"{c.get('gemeinde') or ''} · {ha} ha · Score {cint(c.get('score'))}", 140), "kampagne": k.name, "status": status,
			"kandidat_id": v.text(c.get("id"), 80), "demo": 1 if c.get("demo") else 0, "auch_in_anderer_kampagne": 1 if c.get("id") in aktiv_kandidaten else 0,
			"land": land, "bundesland": v.text(c.get("bundesland"), 60), "bezirk": v.text(c.get("bezirk"), 80), "gemeinde": v.text(c.get("gemeinde"), 80),
			"flaeche_ha": ha, "mwp": v.zahl(c.get("mwp"), min=0, max=100000, stellen=1) or 0, "score": cint(v.zahl(c.get("score"), min=0, max=100) or 0),
			"ampel": v.auswahl(c.get("ampel"), ["gruen", "gelb", "rot"], "gelb"), "prioritaet": v.auswahl(c.get("prioritaet"), ["A", "B", "C"], "C"),
			"netz": als_json({"name": v.text(kn.get("name"), 120), "art": v.text(kn.get("art"), 10), "trasseM": v.zahl((netz or {}).get("trasseM"), min=0), "kostenMin": v.zahl(((netz or {}).get("kosten") or {}).get("min"), min=0), "kostenMax": v.zahl(((netz or {}).get("kosten") or {}).get("max"), min=0)}) if netz else None,
			"kulisse": als_json(((c.get("merkmale") or {}).get("kulisse"))), "widmung_text": v.text(((c.get("widmung") or {}).get("text")), 600),
			"schwerpunkt": als_json(c.get("schwerpunkt")), "geometrie": geom if geom and len(geom) < 200000 else None, "pacht": als_json(kk.pachtspanne(ha, c.get("ampel"))),
			"parzellen": als_json(parz), "gesperrte_flurstuecke": als_json(gesperrt), "grundbuch_status": "offen",
			"grundbuch_schaetzung": als_json(kk.grundbuch_schaetzung(land, len(parz) - len(gesperrt))),
		}).insert(ignore_permissions=True)
	protokoll(n, "anlegen", "kampagne", k.name, f"Akquise-Kampagne „{name}“ mit {len(liste)} Zielflächen angelegt{' (Test)' if test else ''}")
	return {"kampagne": _kampagne_aus(k), "ziele": len(liste), "gesperrt": anzahl_gesperrt}


@frappe.whitelist(methods=["POST"])
def kampagne_aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	k = _kampagne_laden(id)
	d = aus_json(daten, {}) or {}
	if "name" in d:
		name = v.text(d.get("name"), 120)
		v.pflicht(len(name) >= 3, "Name: mind. 3 Zeichen.")
		k.titel = name
	if "beschreibung" in d:
		k.beschreibung = v.mehrzeilig(d.get("beschreibung"), 1000)
	if "nachfass" in d:
		k.nachfass = als_json(kk.nachfass_bereinigen(d.get("nachfass"), k.land))
	if isinstance(d.get("kosten"), dict):
		for f in ("porto", "druck", "sonstige"):
			if f in d["kosten"]:
				k.set(f"kosten_{f}", v.zahl(d["kosten"][f], min=0, max=1e7 if f == "sonstige" else 20, stellen=2))
	if "vorlageId" in d:
		vid = v.kennung(d.get("vorlageId"))
		v.pflicht(not vid or frappe.db.exists("Plattform Vorlage", vid), "Vorlage nicht gefunden.")
		k.vorlage_id = vid or None
	if "status" in d:
		st = v.auswahl(d.get("status"), list(kk.KAMPAGNE_STATUS), "")
		v.pflicht(st, "Unbekannter Status.")
		ok, text = kk.kampagne_status_wechsel_erlaubt(k.status, st)
		if not ok:
			ungueltig(text)
		k.status = st
	k.save(ignore_permissions=True)
	protokoll(n, "aendern", "kampagne", k.name, f"Kampagne „{k.titel}“ geändert")
	return _kampagne_aus(k)


def _grundbuch_hinweis(land):
	if land == "DE":
		return "Grundbucheinsicht beim Grundbuchamt: berechtigtes Interesse darlegen (§ 12 GBO; Vorhaben erneuerbare Energien ab 750 kW: § 43a GBV, Eigenerklärung). Nur nach Flurstück, nicht nach Person."
	if land == "AT":
		return "Grundbuchauszug je Grundstück über die Verrechnungsstelle (Suche nach KG + Grundstücksnummer, nie nach Person)."
	return "Eigentümerauskunft nach Art. 970 Abs. 2 ZGB beim kantonalen Grundbuchamt bzw. Online-Portal."


@frappe.whitelist(methods=["POST"])
def kampagne_starten(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	k = _kampagne_laden(id)
	v.pflicht(k.status == "entwurf", "Nur Entwürfe lassen sich starten.")
	k.status = "aktiv"
	k.gestartet_am = now_datetime()
	k.save(ignore_permissions=True)
	neu = 0
	for z in _ziele_von(k.name):
		if z.status == "gesperrt" or z.grundbuch_aufgabe:
			continue
		parz = aus_json(z.parzellen, []) or []
		gesperrt = set(aus_json(z.gesperrte_flurstuecke, []) or [])
		offen = [p for p in parz if p.get("id") not in gesperrt]
		sch = aus_json(z.grundbuch_schaetzung, {}) or {}
		a = frappe.get_doc({
			"doctype": "Plattform Aufgabe",
			"titel": v.text(f"Grundbuchabfrage: {z.gemeinde} ({len(offen)} Flurstück{'' if len(offen) == 1 else 'e'}) – ca. {kk.zahl_de(sch.get('betrag'), 2 if sch.get('betrag', 0) % 1 else 0)} {'CHF' if sch.get('waehrung') == 'CHF' else '€'}", 160),
			"beschreibung": "\n".join([
				f"Kampagne {k.titel} ({k.name}), Zielfläche {z.name} · {z.flaeche_ha} ha · Score {z.score}.",
				"Flurstücke: " + ", ".join(f"{p.get('kgNr')}/{p.get('gstNr')}" for p in offen) + ".",
				_grundbuch_hinweis(k.land),
				f"Kostenschätzung: {sch.get('anzahl')} × {sch.get('jeAbfrage')} = {sch.get('betrag')} {sch.get('waehrung')} ({sch.get('text')}).",
				"Ergebnis in der Kampagne erfassen – die Aufgabe wird dann automatisch erledigt.",
				f"Link: /portal/admin/akquise/kampagnen/{k.name}",
			]),
			"faellig_am": add_days(nowdate(), 7), "zustaendig_id": k.zustaendig_id or n.id, "status": "offen", "erstellt_von": n.id,
		}).insert(ignore_permissions=True)
		z.grundbuch_aufgabe = a.name
		z.grundbuch_status = "beantragt"
		if z.status == "offen":
			z.status = "grundbuch"
		z.save(ignore_permissions=True)
		neu += 1
	protokoll(n, "aendern", "kampagne", k.name, f"Kampagne „{k.titel}“ gestartet – {neu} Grundbuch-Aufgaben")
	return {"kampagne": _kampagne_aus(k), "aufgaben": neu}


@frappe.whitelist(methods=["POST"])
def kampagne_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	k = _kampagne_laden(id)
	ziele = _ziele_von(k.name)
	versandt = any(aus_json(e.briefe, []) for z in ziele for e in z.empfaenger)
	if not cint(k.test):
		v.pflicht(k.status == "entwurf" and not versandt, "Nur Entwürfe ohne Versand bzw. Testkampagnen lassen sich löschen.")
	elif not _leitung(n):
		frappe.throw("Testkampagnen löscht die Leitung.", frappe.PermissionError)
	entfernt = {"ziele": len(ziele), "aufgaben": 0, "sperren": 0, "vorgaenge": 0}
	frappe.flags.akquise_kampagne_loeschen = True
	try:
		aufgaben = [z.grundbuch_aufgabe for z in ziele if z.grundbuch_aufgabe] + [x.get("aufgabeId") for z in ziele for e in z.empfaenger for x in (aus_json(e.nachfass, {}) or {}).values() if x.get("aufgabeId")]
		for a in aufgaben:
			if frappe.db.exists("Plattform Aufgabe", a):
				frappe.delete_doc("Plattform Aufgabe", a, ignore_permissions=True, force=True)
				entfernt["aufgaben"] += 1
		if cint(k.test):
			for s in frappe.get_all(DT_S, filters={"kampagne": k.name}, pluck="name"):
				frappe.delete_doc(DT_S, s, ignore_permissions=True, force=True)
				entfernt["sperren"] += 1
			for vg in {x.get("vorgangId") for z in ziele for e in z.empfaenger for x in (aus_json(e.anfragen, []) or []) if x.get("vorgangId")}:
				if frappe.db.exists("Plattform Vorgang", vg):
					fl = frappe.db.get_value("Plattform Vorgang", vg, "flaeche_id")
					frappe.delete_doc("Plattform Vorgang", vg, ignore_permissions=True, force=True)
					if fl and frappe.db.exists("Plattform Flaeche", fl):
						frappe.delete_doc("Plattform Flaeche", fl, ignore_permissions=True, force=True)
					entfernt["vorgaenge"] += 1
		for z in ziele:
			frappe.delete_doc(DT_Z, z.name, ignore_permissions=True, force=True)
		frappe.delete_doc(DT_K, k.name, ignore_permissions=True, force=True)
	finally:
		frappe.flags.akquise_kampagne_loeschen = False
	protokoll(n, "loeschen", "kampagne", k.name, f"Kampagne „{k.titel}“ gelöscht{' (Test)' if cint(k.test) else ''}: {frappe.as_json(entfernt)}")
	return {"ok": True, "entfernt": entfernt}


# ---------------------------------------------------------------- Eigentümer, Rücklauf, Sperren


def _person_lesen(p):
	p = p if isinstance(p, dict) else {}
	e = {
		"anrede": v.auswahl(p.get("anrede"), ["Frau", "Herr", "Divers", ""], ""), "titel": v.text(p.get("titel"), 30), "vorname": v.text(p.get("vorname"), 80),
		"nachname": v.text(p.get("nachname"), 80), "firma": v.text(p.get("firma"), 120), "zusatz": v.text(p.get("zusatz"), 80), "strasse": v.text(p.get("strasse"), 120),
		"plz": v.plz(p.get("plz")), "ort": v.text(p.get("ort"), 80), "land": v.auswahl(p.get("land"), ["DE", "AT", "CH"], ""),
	}
	v.pflicht(e["nachname"] or e["firma"], "Eigentümer: Nachname oder Firma angeben.")
	v.pflicht(e["strasse"] and e["plz"] and e["ort"], "Eigentümer: vollständige Postanschrift (Straße, PLZ, Ort) angeben.")
	return e


@frappe.whitelist(methods=["POST"])
def grundbuch_ergebnis(ziel_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	liste = (d.get("empfaenger") or [])[:20] if isinstance(d.get("empfaenger"), list) else []
	v.pflicht(liste, "Bitte mindestens einen Eigentümer erfassen.")
	personen = [{**_person_lesen(p), "flurstuecke": v.text_liste(p.get("flurstuecke"), maximal=60, laenge=60)} for p in liste]
	kosten = None if d.get("kostenIst") in (None, "") else v.zahl(d.get("kostenIst"), min=0, max=100000, stellen=2)
	z = _ziel_laden(ziel_id)
	k = frappe.get_doc(DT_K, z.kampagne)
	v.pflicht(k.status != "abgeschlossen", "Die Kampagne ist abgeschlossen.")
	v.pflicht(z.status != "gesperrt", "Für dieses Ziel liegt ein Widerspruch vor (Sperrliste) – kein Grundbuch-Ergebnis.")
	parz = aus_json(z.parzellen, []) or []
	gesperrte_fs = set(aus_json(z.gesperrte_flurstuecke, []) or [])
	parz_ids = {p.get("id") for p in parz} - gesperrte_fs
	neu = []
	for p in personen:
		# Widerspruch je Person ODER alle angegebenen Flurstücke der Person stehen auf der Sperrliste (Art. 21 DSGVO)
		eigene = [x for x in parz if x.get("id") in p["flurstuecke"]]
		fs_sperren = [s_ for s_ in (_flurstueck_gesperrt(k.land, x) for x in eigene) if s_]
		sperre = _person_gesperrt(p) or (fs_sperren[0] if eigene and len(fs_sperren) == len(eigene) else None)
		code = kk.code_erzeugen()
		while frappe.db.exists("Plattform Kampagnenempfaenger", {"code": code}):
			code = kk.code_erzeugen()
		row = z.append("empfaenger", {})
		row.empfaenger_id = f"AQE-{now_datetime().strftime('%y')}-{kk.code_erzeugen()[:6]}"
		_empf_setzen(row, {**p, "flurstuecke": [x for x in p["flurstuecke"] if x in parz_ids], "code": code, "codeAktiv": 0 if sperre else 1, "gesperrt": 1 if sperre else 0,
			"gesperrtGrund": kk.SPERR_GRUENDE.get(sperre.grund) if sperre else "", "status": "widerspruch" if sperre else "neu", "aufrufe": 0,
			"briefe": [], "anfragen": [], "termine": [], "nachfass": {}, "widerspruchAm": iso(sperre.creation) if sperre else None})
		row.sperr_hash = _hash(kk.person_schluessel(p))
		row.erfasst_von = n.id
		neu.append({"id": row.empfaenger_id, "gesperrt": bool(sperre), "anzeige": kk.person_maskiert(p)})
	z.grundbuch_status = "erledigt"
	z.grundbuch_ergebnis_am = now_datetime()
	if kosten is not None:
		z.grundbuch_kosten_ist = kosten
	z.status = kk.ziel_status_nach_grundbuch(z.status, all(cint(e.gesperrt) for e in z.empfaenger))  # fortgeschrittenen Status nicht zurücksetzen
	z.save(ignore_permissions=True)
	if z.grundbuch_aufgabe and frappe.db.get_value("Plattform Aufgabe", z.grundbuch_aufgabe, "status") == "offen":
		a = frappe.get_doc("Plattform Aufgabe", z.grundbuch_aufgabe)
		a.status, a.erledigt_von = "erledigt", n.id
		a.save(ignore_permissions=True)
	protokoll(n, "aendern", "kampagne", k.name, f"Grundbuch-Ergebnis zu {z.name}: {len(neu)} Eigentümer ({len([x for x in neu if x['gesperrt']])} gesperrt)")
	return {"ziel": _ziel(z), "neu": neu}


def _empfaenger_row(z, empfaenger_id):
	row = next((e for e in z.empfaenger if e.empfaenger_id == v.kennung(empfaenger_id)), None)
	if not row:
		nicht_gefunden("Empfänger nicht gefunden.")
	return row


@frappe.whitelist(methods=["POST"])
def empfaenger_aendern(ziel_id=None, empfaenger_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	z = _ziel_laden(ziel_id)
	row = _empfaenger_row(z, empfaenger_id)
	e = _empf(row)
	v.pflicht(kk.gesperrt_aenderung_erlaubt(e["gesperrt"], d), "Gesperrte Empfänger (Widerspruch) können nicht weiter bearbeitet werden.")  # nur Notizen
	for feld in ("einwilligungTelefon", "einwilligungEmail"):
		if feld in d:
			x = d.get(feld)
			if x:
				q = v.text(x.get("quelle"), 120)
				v.pflicht(len(q) >= 3, "Einwilligung: Quelle/Nachweis angeben.")
				e[feld] = {"am": jetzt_iso(), "quelle": q, "telefon": v.text(x.get("telefon"), 40), "email": v.email(x.get("email")), "vonId": n.id}
			else:
				e[feld] = None
	if d.get("rueckmeldung"):
		e["rueckmeldungAm"] = jetzt_iso()
		e["rueckmeldungText"] = v.mehrzeilig(d.get("rueckmeldung"), 1000)
		if e["status"] in ("neu", "angeschrieben"):
			e["status"] = "reaktion"
	if d.get("termin"):
		am = str(d["termin"].get("am") or "")[:16]
		v.pflicht(len(am) >= 10, "Termin: Datum angeben.")
		e["termine"] = (e.get("termine") or []) + [{"am": am, "notiz": v.text(d["termin"].get("notiz"), 300), "vonId": n.id, "erfasstAm": jetzt_iso()}]
		e["status"] = "termin"
		if z.status != "gesichert":
			z.status = "termin"
	if "status" in d:
		st = v.auswahl(d.get("status"), ["reaktion", "termin", "gesichert", "abgelehnt"], "")
		v.pflicht(st, "Unbekannter Status.")
		e["status"] = st
		if st == "gesichert":
			z.status = "gesichert"
			z.gesichert_ha = v.zahl(d.get("gesichertHa"), min=0, max=100000, stellen=2) or z.flaeche_ha
	_empf_setzen(row, e)
	if "status" in d and d.get("status") == "abgelehnt" and all(x.status in ("abgelehnt", "widerspruch") for x in z.empfaenger):
		z.status = "abgelehnt"
	z.save(ignore_permissions=True)
	protokoll(n, "aendern", "kampagne", z.kampagne, f"Rücklauf {z.name}/{e['id']}: {kk.EMPFAENGER_STATUS.get(e['status'], e['status'])}")
	return {"ziel": _ziel(z)}


@frappe.whitelist(methods=["POST"])
def empfaenger_sperren(ziel_id=None, empfaenger_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	z = _ziel_laden(ziel_id)
	e = _empf(_empfaenger_row(z, empfaenger_id))
	parz = [p for p in (aus_json(z.parzellen, []) or []) if not e["flurstuecke"] or p.get("id") in e["flurstuecke"]]
	s = _sperre_eintragen(n, e, z.land, parz, d.get("grund") or "widerspruch", d.get("quelle") or "brief", z.kampagne, z.name, d.get("notiz") or "")
	return {"sperre": {"id": s.name, "anzeige": s.anzeige}, "ziel": _ziel(frappe.get_doc(DT_Z, z.name))}


# ---------------------------------------------------------------- Serienbrief, Versand


def _versand_empfaenger(k, stufe):
	out = []
	nachfass = aus_json(k.nachfass, []) or []
	for z in _ziele_von(k.name):
		if z.status == "gesperrt":  # Widerspruch auf Ziel-/Flurstücksebene
			continue
		for row in z.empfaenger:
			e = _empf(row)
			if e["gesperrt"] or not e["codeAktiv"] or _person_gesperrt(e):
				continue
			n_briefe = len(e["briefe"] or [])
			if stufe == 1 and n_briefe == 0:
				out.append((z, row, e))
			elif stufe == 2 and n_briefe == 1 and e["status"] not in kk.REAKTION and any(x.get("ergebnis") == "aufgabe" and next((s for s in nachfass if s["id"] == sid), {}).get("art") == "zweiter_brief" for sid, x in (e["nachfass"] or {}).items()):
				out.append((z, row, e))
	return out


def _vorlage(k):
	"""Aktuelle Version der gewählten Vorlage (Plattform Vorlage → versionen) oder None (Standard-Serienbrief)."""
	if not k.vorlage_id or not frappe.db.exists("Plattform Vorlage", k.vorlage_id):
		return None
	vl = frappe.get_doc("Plattform Vorlage", k.vorlage_id)
	akt = next((x for x in vl.versionen if cint(x.get("version")) == cint(vl.version)), vl.versionen[-1] if vl.versionen else None)
	return {"betreff": akt.get("betreff"), "text": akt.get("text"), "name": vl.bezeichnung or vl.name, "version": cint(vl.version)} if akt else None


@frappe.whitelist(methods=["POST"])
def serienbrief_daten(id=None, stufe=1, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	recht_noetig(n, "akquise", 1)
	k = _kampagne_laden(id)
	st = 2 if cint(stufe) == 2 else 1
	vorlage = _vorlage(k)
	z_konto = frappe.db.get_value("Plattform Konto", k.zustaendig_id or k.erstellt_von, ["vorname", "nachname"], as_dict=True) or {}
	protokoll(n, "export", "kampagne", k.name, f"Serienbrief-Daten Stufe {st}")
	return {
		"kampagne": {"id": k.name, "name": k.titel, "land": k.land, "demo": bool(cint(k.demo) or cint(k.test))}, "stufe": st, "vorlage": vorlage,
		"zustaendig": {"name": " ".join(x for x in (z_konto.get("vorname"), z_konto.get("nachname")) if x), "vorname": z_konto.get("vorname")} if z_konto else None,
		"empfaenger": [{"ziel": _ziel(z, mit_empfaengern=False), "empfaenger": {**e, "anzeige": kk.person_maskiert(e)}} for z, _row, e in _versand_empfaenger(k, st)],
	}


@frappe.whitelist(methods=["POST"])
def versand_bestaetigen(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	k = _kampagne_laden(id)
	v.pflicht(k.status == "aktiv", "Nur aktive Kampagnen können versenden.")
	st = 2 if cint(d.get("stufe")) == 2 else 1
	nur = set(map(str, d.get("empfaengerIds") or [])) if isinstance(d.get("empfaengerIds"), list) else None
	anzahl = 0
	geaendert = {}
	for z, row, e in _versand_empfaenger(k, st):
		if nur is not None and e["id"] not in nur:
			continue
		e["briefe"] = (e["briefe"] or []) + [{"nr": st, "am": jetzt_iso(), "art": "erstbrief" if st == 1 else "zweitbrief", "vonId": n.id}]
		if e["status"] == "neu":
			e["status"] = "angeschrieben"
		_empf_setzen(row, {"briefe": e["briefe"], "status": e["status"]})
		if z.status in ("ermittelt", "grundbuch", "offen"):
			z.status = "angeschrieben"
		geaendert[z.name] = z
		anzahl += 1
	v.pflicht(anzahl, "Keine versandbereiten Empfänger (Eigentümer erfasst? bereits angeschrieben? gesperrt?).")
	for z in geaendert.values():
		z.save(ignore_permissions=True)
	protokoll(n, "aendern", "kampagne", k.name, f"Versand bestätigt: {anzahl} {'Erstbriefe' if st == 1 else 'Zweitbriefe'}")
	return {"ok": True, "anzahl": anzahl, "kennzahlen": _kampagne_aus(k)["kennzahlen"]}


# ---------------------------------------------------------------- Sperrliste


@frappe.whitelist(methods=["POST"])
def sperrliste(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	out = []
	for s in frappe.get_all(DT_S, fields=["name", "anzeige", "flurstueck_hashes", "land", "grund", "quelle", "creation", "von", "aktiv", "kampagne", "notiz"], order_by="creation desc", limit_page_length=1000):
		out.append({
			"id": s.name, "anzeige": s.anzeige, "flurstuecke": len(aus_json(s.flurstueck_hashes, []) or []), "land": s.land, "grund": s.grund, "grundLabel": kk.SPERR_GRUENDE.get(s.grund),
			"quelle": s.quelle, "quelleLabel": kk.SPERR_QUELLEN.get(s.quelle), "am": iso(s.creation), "von": name_von(s.von) or ("Online (Eigentümer)" if s.quelle == "online" else ""),
			"aktiv": bool(cint(s.aktiv)), "kampagneId": s.kampagne, "notiz": s.notiz,
		})
	return {"eintraege": out}


@frappe.whitelist(methods=["POST"])
def sperre_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	p = d.get("person") if isinstance(d.get("person"), dict) else {}
	person = {"vorname": v.text(p.get("vorname"), 80), "nachname": v.text(p.get("nachname"), 80), "firma": v.text(p.get("firma"), 120), "plz": v.plz(p.get("plz"))}
	v.pflicht(((person["nachname"] and person["vorname"]) or person["firma"]) and person["plz"], "Sperrvermerk: Vor- und Nachname (bzw. Firma) und PLZ angeben – der Abgleich läuft über Name + PLZ.")
	s = _sperre_eintragen(n, person, v.auswahl(d.get("land"), ["DE", "AT", "CH"], None), [], d.get("grund") or "widerspruch", d.get("quelle") or "brief", notiz=d.get("notiz") or "")
	return {"id": s.name, "anzeige": s.anzeige}


@frappe.whitelist(methods=["POST"])
def sperre_aufheben(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	if not _leitung(n):
		frappe.throw("Sperren aufheben darf nur die Leitung.", frappe.PermissionError)
	d = aus_json(daten, {}) or {}
	b = v.text(d.get("begruendung"), 300)
	v.pflicht(len(b) >= 10, "Bitte begründen (mind. 10 Zeichen).")
	name = v.kennung(id)
	if not name or not frappe.db.exists(DT_S, name):
		nicht_gefunden("Sperrvermerk nicht gefunden.")
	s = frappe.get_doc(DT_S, name)
	s.update({"aktiv": 0, "aufgehoben_am": now_datetime(), "aufgehoben_von": n.id, "aufhebungsgrund": b})
	s.save(ignore_permissions=True)
	protokoll(n, "sperrliste", "sperrliste", s.name, f"Sperrvermerk aufgehoben: {b}")
	return {"ok": True}


# ---------------------------------------------------------------- Öffentliche Angebotsseite (nur API-Benutzer, ohne Eigentümerdaten)


def _empfaenger_fuer_code(code):
	c = kk.code_normalisieren(code)
	if not c:
		return None
	r = frappe.db.get_value("Plattform Kampagnenempfaenger", {"code": c, "parenttype": DT_Z}, ["parent", "name"], as_dict=True)
	if not r:
		return None
	z = frappe.get_doc(DT_Z, r.parent)
	row = next((e for e in z.empfaenger if e.name == r.name), None)
	return z, row, frappe.get_doc(DT_K, z.kampagne)


@frappe.whitelist(methods=["POST"])
def angebot_fuer_code(code=None):
	api_pruefen()
	r = _empfaenger_fuer_code(code)
	if not r or r[2].status == "entwurf":
		return None
	z, row, k = r
	if cint(row.gesperrt) or not cint(row.code_aktiv):
		return {"gesperrt": True}
	ku = aus_json(z.kulisse) or None
	netz = aus_json(z.netz) or {}
	return {
		"gemeinde": z.gemeinde, "bundesland": z.bundesland, "land": z.land, "ha": flt(z.flaeche_ha), "mwp": flt(z.mwp), "ampel": z.ampel, "pacht": aus_json(z.pacht, {}),
		"netzKm": round(flt(netz.get("trasseM")) / 100) / 10 if netz.get("trasseM") else None,
		"kulisse": {"randstreifen": (ku.get("randstreifenAnteil") or 0) >= 0.5, "privilegiert": (ku.get("privilegiertAnteil") or 0) >= 0.5, "benachteiligt": (ku.get("benachteiligtAnteil") or 0) >= 0.5, "moor": (ku.get("moorAnteil") or 0) >= 0.5} if ku else None,
		"flurstueckeAnzahl": len(aus_json(row.flurstuecke, []) or []) or len(aus_json(z.parzellen, []) or []), "geometrie": aus_json(z.geometrie),
		"demo": bool(cint(z.demo) or cint(k.demo) or cint(k.test)), "anfrageGestellt": bool(aus_json(row.anfragen, [])),
	}


@frappe.whitelist(methods=["POST"])
def angebot_aufruf(code=None):
	api_pruefen()
	r = _empfaenger_fuer_code(code)
	if not r or cint(r[1].gesperrt) or not cint(r[1].code_aktiv) or r[2].status == "entwurf":
		return {"ok": False}
	z, row, _k = r
	row.aufrufe = cint(row.aufrufe) + 1
	row.erster_aufruf_am = row.erster_aufruf_am or now_datetime()
	row.letzter_aufruf_am = now_datetime()
	z.save(ignore_permissions=True)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def angebot_anfrage(code=None, daten=None):
	api_pruefen()
	d = aus_json(daten, {}) or {}
	r = _empfaenger_fuer_code(code)
	if not r or cint(r[1].gesperrt) or not cint(r[1].code_aktiv):
		nicht_gefunden("Code ungültig.")
	z, row, _k = r
	e = _empf(row)
	e["anfragen"] = (e["anfragen"] or []) + [{"am": jetzt_iso(), "vorgangId": v.kennung(d.get("vorgangId")) or None}]
	if d.get("einwilligungTelefon") and d.get("telefon"):
		e["einwilligungTelefon"] = {"am": jetzt_iso(), "quelle": "Online-Formular Angebotsseite (ausdrückliche Einwilligung)", "telefon": v.text(d.get("telefon"), 40), "vonId": None}
	if e["status"] in ("neu", "angeschrieben"):
		e["status"] = "reaktion"
	_empf_setzen(row, e)
	if z.status in ("ermittelt", "angeschrieben", "grundbuch"):
		z.status = "reaktion"
	z.save(ignore_permissions=True)
	protokoll(None, "aendern", "kampagne", z.kampagne, f"Rücklauf: Anfrage über Angebotsseite ({z.name})")
	return {"ok": True, "kampagneId": z.kampagne, "zielId": z.name, "ha": flt(z.flaeche_ha), "bundesland": z.bundesland, "land": z.land, "gemeinde": z.gemeinde}


@frappe.whitelist(methods=["POST"])
def angebot_widerspruch(code=None):
	api_pruefen()
	r = _empfaenger_fuer_code(code)
	if not r:
		nicht_gefunden("Code ungültig.")
	z, row, _k = r
	if cint(row.gesperrt):
		return {"ok": True, "bereits": True}
	e = _empf(row)
	parz = [p for p in (aus_json(z.parzellen, []) or []) if not e["flurstuecke"] or p.get("id") in e["flurstuecke"]]
	_sperre_eintragen(None, e, z.land, parz, "widerspruch", "online", z.kampagne, z.name)
	return {"ok": True}


# ---------------------------------------------------------------- Gemeinde-Screening


def _gemeinde_doc(schluessel, basis=None, erzeugen=False):
	s = v.text(schluessel, 140)
	v.pflicht(s and s[:3] in ("DE:", "AT:", "CH:") and s.count(":") == 2, "Ungültige Gemeinde.")
	name = frappe.db.get_value(DT_G, {"schluessel": s}, "name")
	if name:
		return frappe.get_doc(DT_G, name)
	if not erzeugen:
		return None
	b = basis or {}
	return frappe.get_doc({"doctype": DT_G, "schluessel": s, "gemeinde_name": v.text(b.get("name"), 120) or s.split(":")[-1], "land": s[:2], "bundesland": v.text(b.get("bundesland"), 60), "konkurrenz": "[]"})


@frappe.whitelist(methods=["POST"])
def gemeinden_screening(kandidaten=None, filter=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	f = aus_json(filter, {}) or {}
	gepflegt = {x.schluessel: x for x in frappe.get_all(DT_G, fields=["name", "schluessel", "bauleitplanung", "kriterienkatalog", "konkurrenz", "uebergabe", "notiz", "modified", "geaendert_von"], limit_page_length=0)}
	kap = {x.knoten_id: {"kapazitaet": x.kapazitaet, "freiMw": x.frei_mw} for x in frappe.get_all("Plattform Netzkapazitaet", fields=["knoten_id", "kapazitaet", "frei_mw"], limit_page_length=0)} if frappe.db.table_exists("Plattform Netzkapazitaet") else {}
	liste = []
	for g in kk.potenzial_je_gemeinde(aus_json(kandidaten, []) or [], kap).values():
		if f.get("land") and g["land"] != f["land"]:
			continue
		m = gepflegt.get(g["schluessel"]) or frappe._dict()
		info = {"bauleitplanung": m.bauleitplanung or "", "bauleitplanungQuelle": "manuell" if m.bauleitplanung else "", "kriterienkatalog": m.kriterienkatalog or "", "konkurrenz": aus_json(m.konkurrenz, []) or []}
		r = kk.gemeinde_ranking(g, info)
		if f.get("minPunkte") and r["punkte"] < float(f["minPunkte"]):
			continue
		ziele = frappe.get_all(DT_Z, filters={"land": g["land"], "gemeinde": g["name"]}, fields=["status", "gesichert_ha", "flaeche_ha"], limit_page_length=0)
		liste.append({**g, **info, "notiz": m.notiz or "", "ranking": r, "anliegen": None, "crm": None, "uebergabe": aus_json(m.uebergabe), "geaendertAm": iso(m.modified),
			"kampagnen": {"ziele": len(ziele), "gesichertHa": round(sum(flt(x.gesichert_ha or x.flaeche_ha) for x in ziele if x.status == "gesichert"), 1)}})
	liste.sort(key=lambda x: (-x["ranking"]["punkte"], -x["haGeeignet"]))
	for i, x in enumerate(liste):
		x["rang"] = i + 1
	return {"gemeinden": liste, "stand": jetzt_iso(), "labels": {"bauleitplanung": {"keine": "Noch keine Planung für Freiflächen-PV", "kriterien": "Kriterienkatalog bzw. Standortkonzept in Arbeit", "fnp": "Flächennutzungsplan mit PV-Sonderbauflächen", "aufstellung": "Aufstellungsbeschluss für ein Projekt gefasst", "laufend": "Mehrere Verfahren laufen bereits"}, "kriterienkatalog": {"ja": "Liegt vor (beschlossen)", "arbeit": "In Arbeit", "nein": "Nein"}, "konkurrenz": kk.KONKURRENZ_STATUS}}


@frappe.whitelist(methods=["POST"])
def gemeinde_speichern(schluessel=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	g = _gemeinde_doc(schluessel, d, erzeugen=True)
	if "bauleitplanung" in d:
		g.bauleitplanung = v.auswahl(d.get("bauleitplanung"), ["keine", "kriterien", "fnp", "aufstellung", "laufend"], "")
	if "kriterienkatalog" in d:
		g.kriterienkatalog = v.auswahl(d.get("kriterienkatalog"), ["ja", "arbeit", "nein"], "")
	if "notiz" in d:
		g.notiz = v.mehrzeilig(d.get("notiz"), 2000)
	g.geaendert_von = n.id
	g.save(ignore_permissions=True) if not g.is_new() else g.insert(ignore_permissions=True)
	protokoll(n, "aendern", "gemeinde", g.schluessel, f"Gemeinde-Screening {g.gemeinde_name}: Stand gepflegt")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def konkurrenz_anlegen(schluessel=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	d = aus_json(daten, {}) or {}
	x = {"id": f"KH-{now_datetime().strftime('%y')}-{kk.code_erzeugen()[:6]}", "entwickler": v.text(d.get("entwickler"), 120), "projekt": v.text(d.get("projekt"), 160),
		"mw": v.zahl(d.get("mw"), min=0, max=5000, stellen=1), "ha": v.zahl(d.get("ha"), min=0, max=10000, stellen=1), "status": v.auswahl(d.get("status"), list(kk.KONKURRENZ_STATUS), "geruecht"),
		"quelle": v.text(d.get("quelle"), 200), "aktiv": True, "am": jetzt_iso(), "vonId": n.id}
	v.pflicht(x["entwickler"] or x["projekt"], "Bitte Entwickler oder Projekt angeben.")
	v.pflicht(len(x["quelle"]) >= 3, "Bitte die Quelle angeben (z. B. Gemeinderatsprotokoll vom …, Presse, Gespräch).")
	g = _gemeinde_doc(schluessel, d, erzeugen=True)
	g.konkurrenz = als_json((aus_json(g.konkurrenz, []) or []) + [x])
	g.geaendert_von = n.id
	g.save(ignore_permissions=True) if not g.is_new() else g.insert(ignore_permissions=True)
	protokoll(n, "aendern", "gemeinde", g.schluessel, f"Konkurrenzhinweis {g.gemeinde_name}: {x['entwickler'] or x['projekt']}")
	return {"ok": True, "id": x["id"]}


@frappe.whitelist(methods=["POST"])
def konkurrenz_entfernen(schluessel=None, id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	g = _gemeinde_doc(schluessel)
	liste = aus_json(g.konkurrenz, []) if g else []
	neu = [x for x in liste if x.get("id") != id]
	if not g or len(neu) == len(liste):
		nicht_gefunden("Hinweis nicht gefunden.")
	g.konkurrenz = als_json(neu)
	g.save(ignore_permissions=True)
	protokoll(n, "aendern", "gemeinde", g.schluessel, f"Konkurrenzhinweis entfernt ({id})")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def gemeinde_uebergeben(schluessel=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	recht_noetig(n, "crm", 2)
	d = aus_json(daten, {}) or {}
	g = _gemeinde_doc(schluessel, d, erzeugen=True)
	if g.is_new():
		g.insert(ignore_permissions=True)
	termin = str(d.get("terminAm") or "")[:16] or None
	org = frappe.db.get_value("Plattform CRM Organisation", {"art": "gemeinde", "land": g.land, "ort": g.gemeinde_name}, "name")
	org_neu = False
	if not org:
		org = frappe.get_doc({"doctype": "Plattform CRM Organisation", "bezeichnung": v.text(f"Gemeinde {g.gemeinde_name}", 160), "art": "gemeinde", "ort": g.gemeinde_name, "land": g.land, "bundesland": g.bundesland, "tags": als_json(["Akquise-Screening"]), "notiz": "Angelegt aus dem Gemeinde-Screening (Flächenakquise)."}).insert(ignore_permissions=True).name
		org_neu = True
	notiz = v.mehrzeilig(d.get("notiz"), 1500)
	a = frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(f"Gemeinde {g.gemeinde_name} ansprechen (Freiflächen-PV, Bauleitplanung)", 160),
		"beschreibung": "\n".join(x for x in ["Bürgermeister bzw. Bauamt kontaktieren: Haltung zu Freiflächen-PV, Kriterienkatalog/Standortkonzept, Bürgerbeteiligung, § 6 EEG (DE).", "Screening: /portal/admin/akquise/gemeinden", notiz] if x),
		"faellig_am": termin[:10] if termin else add_days(nowdate(), 7), "zustaendig_id": n.id, "status": "offen", "erstellt_von": n.id}).insert(ignore_permissions=True)
	akt = frappe.get_doc({"doctype": "Plattform CRM Aktivitaet", "typ": "termin" if termin else "notiz", "betreff": v.text(f"Termin Gemeinde {g.gemeinde_name}: Freiflächen-PV / Kriterienkatalog" if termin else f"Gemeinde {g.gemeinde_name} für Ansprache vorgemerkt (Screening)", 160),
		"am": get_datetime(termin) if termin else now_datetime(), "organisation_id": org, "text": "\n".join(x for x in [notiz, "Aus dem Gemeinde-Screening übergeben."] if x), "von_id": n.id, "system": 0, "aufgabe_id": a.name}).insert(ignore_permissions=True)
	g.uebergabe = als_json({"am": jetzt_iso(), "vonId": n.id, "organisationId": org, "orgNeu": org_neu, "aktivitaetId": akt.name, "aufgabeId": a.name, "terminAm": termin})
	g.save(ignore_permissions=True)
	protokoll(n, "crm", "organisation", org, f"Gemeinde {g.gemeinde_name} aus dem Screening an die Kommune-Ansprache übergeben")
	return {"ok": True, "organisationId": org, "aktivitaetId": akt.name, "aufgabeId": a.name, "orgNeu": org_neu}


@frappe.whitelist(methods=["POST"])
def uebergabe_zuruecknehmen(schluessel=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	if not _leitung(n):
		frappe.throw("Nur die Leitung kann eine Übergabe zurücknehmen.", frappe.PermissionError)
	g = _gemeinde_doc(schluessel)
	u = aus_json(g.uebergabe) if g else None
	if not u:
		nicht_gefunden("Keine Übergabe vorhanden.")
	for dt, name in (("Plattform CRM Aktivitaet", u.get("aktivitaetId")), ("Plattform Aufgabe", u.get("aufgabeId"))):
		if name and frappe.db.exists(dt, name):
			frappe.delete_doc(dt, name, ignore_permissions=True, force=True)
	if u.get("orgNeu") and u.get("organisationId") and not frappe.db.exists("Plattform CRM Aktivitaet", {"organisation_id": u["organisationId"]}):
		frappe.delete_doc("Plattform CRM Organisation", u["organisationId"], ignore_permissions=True, force=True)
	g.uebergabe = None
	g.save(ignore_permissions=True)
	protokoll(n, "crm", "gemeinde", g.schluessel, "Übergabe an Kommune-Ansprache zurückgenommen")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def gemeinde_zuruecksetzen(schluessel=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreibrecht(n)
	if not _leitung(n):
		frappe.throw("Nur die Leitung.", frappe.PermissionError)
	g = _gemeinde_doc(schluessel)
	if not g:
		return {"ok": True}
	v.pflicht(not aus_json(g.uebergabe), "Erst die Übergabe zurücknehmen.")
	frappe.delete_doc(DT_G, g.name, ignore_permissions=True, force=True)
	protokoll(n, "aendern", "gemeinde", g.schluessel, "Gemeinde-Screening: gepflegte Angaben entfernt")
	return {"ok": True}


# ---------------------------------------------------------------- Druckformat „Serienbrief Akquise“ (Jinja)


def _qr_data_url(text):
	"""QR-Code als PNG-Data-URL (pyqrcode + pypng sind Frappe-Abhängigkeiten); ohne Bibliothek None (Link bleibt im Text)."""
	try:
		import pyqrcode

		return "data:image/png;base64," + pyqrcode.create(text, error="M").png_as_base64_str(scale=3, quiet_zone=2)
	except Exception:
		return None


def oekoinvest_serienbrief(ziel_name, stufe=1, nur_versandbereit=False):
	"""Jinja: Briefe aller (nicht gesperrten) Empfänger einer Zielfläche – für das Druckformat „Serienbrief Akquise“."""
	z = frappe.get_doc(DT_Z, ziel_name)
	k = frappe.get_doc(DT_K, z.kampagne)
	firma = FIRMA
	zd = _ziel(z, mit_empfaengern=False, intern=True)
	vorlage = _vorlage(k)
	z_konto = frappe.db.get_value("Plattform Konto", k.zustaendig_id or k.erstellt_von, ["vorname", "nachname"], as_dict=True) or {}
	zust = {"name": " ".join(x for x in (z_konto.get("vorname"), z_konto.get("nachname")) if x), "vorname": z_konto.get("vorname")}
	briefe = []
	for e in zd["empfaengerIntern"]:
		if e["gesperrt"] or not e["codeAktiv"]:
			continue
		if nur_versandbereit and len(e["briefe"] or []) != (0 if cint(stufe) == 1 else 1):
			continue
		b = kk.brief({"id": k.name, "name": k.titel, "land": k.land}, zd, e, basis_url() or "https://www.oekoinvest.com", firma, vorlage, zust)
		b["qr"] = _qr_data_url(b["link"])
		briefe.append(b)
	return {"briefe": briefe, "demo": bool(cint(k.demo) or cint(k.test)), "firma": firma}
