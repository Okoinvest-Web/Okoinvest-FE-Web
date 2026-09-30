# Copyright (c) 2026, ÖkoInvest GmbH
#
# CRM & Akquise (Backoffice, Rechte über plattform/rechte.py): Kontakte und Organisationen (auch ohne Portal-Konto),
# Beziehungen zu Objekten, Aktivitäten mit Wiedervorlage, Dubletten, Massenaktionen; Akquise-Pipeline Flächen mit
# Score, Priorität, Gebietszuordnung und SLA-Ampel. Ausgabe wie backend/demo/crm.js bzw. backend/demo/akquise.js.

import re
import unicodedata

import frappe
from frappe.utils import cint, get_datetime, getdate

from oekoinvest_app.plattform import backoffice as bo
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt, kurz, name_von, nicht_gefunden, nutzer, objekt_laden, protokoll
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, DOCTYPE, LAENDER, VORGANG_TYPEN
from oekoinvest_app.plattform.prozesse import status_label
from oekoinvest_app.plattform.rechte import recht_noetig

KONTAKT_ROLLEN = ["eigentuemer", "landwirt", "investor", "anbieter", "unternehmen", "mitglied", "gemeinde", "netzbetreiber", "gutachter", "bank", "behoerde", "berater", "sonstige"]
ORG_ARTEN = ["gemeinde", "netzbetreiber", "gutachter", "bank", "investor", "entwickler", "unternehmen", "landwirtschaft", "behoerde", "verband", "sonstige", "stadtwerk"]  # stadtwerk: Fachprüfung Kommunen
AKTIVITAET_TYPEN = {"anruf": "Anruf", "termin": "Termin", "email": "E-Mail", "notiz": "Notiz"}
BEZUG_ROLLEN = ["Anfragender", "Eigentümer", "Ansprechpartner", "Gemeinde", "Netzbetreiber", "Gutachter", "Finanzierer", "Investor", "Anbieter", "Sonstige"]
CRM_ROLLE_FUER_TYP = {"flaeche": "eigentuemer", "agri": "landwirt", "investor": "investor", "projekt": "anbieter", "reststrom": "unternehmen", "carport": "unternehmen", "speicher": "unternehmen", "kommune": "gemeinde", "genossenschaft": "mitglied", "energiegemeinschaft": "mitglied", "kontakt": "sonstige"}
BEZUG_ARTEN = ["vorgang", "flaeche", "projekt", "interesse"]
BESONDERHEITEN = ["randstreifen", "benachteiligt", "schutzgebiet", "wald", "hang", "ueberschwemmung"]
NETZ = ["lt1", "1-3", "3-5", "5-10", "gt10", "unbekannt"]
OFFEN_FLAECHE = ["entwurf", "eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"]


# ================================================================ Normalisierung & Dubletten (wie src/lib/plattform/crm.js)


def norm_text(s):
	t = str(s or "").lower()
	t = re.sub(r"\((demo|fiktiv)\)", " ", t)
	for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
		t = t.replace(a, b)
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	t = re.sub(r"\b(dr|prof|dipl|ing|herr|frau)\b\.?", " ", t)
	return re.sub(r"[^a-z0-9]+", " ", t).strip()


def _telefon(t):
	z = re.sub(r"\D", "", str(t or ""))
	return z[-9:] if len(z) >= 7 else ""


def dubletten_score(a, b, org=lambda x: ""):
	gruende, score = [], 0
	if a.get("email") and (a.get("email") or "").lower() == (b.get("email") or "").lower():
		score = 100
		gruende.append("gleiche E-Mail-Adresse")
	na = norm_text(f"{a.get('vorname') or ''} {a.get('nachname') or ''}")
	gleich = len(na) >= 5 and na == norm_text(f"{b.get('vorname') or ''} {b.get('nachname') or ''}")
	pa = re.sub(r"\D", "", str(a.get("plz") or ""))
	if gleich and pa and pa == re.sub(r"\D", "", str(b.get("plz") or "")):
		score = max(score, 85)
		gruende.append("gleicher Name und gleiche PLZ")
	oa = norm_text(a.get("firma") or org(a.get("organisation_id")))
	if gleich and oa and oa == norm_text(b.get("firma") or org(b.get("organisation_id"))):
		score = max(score, 75)
		gruende.append("gleicher Name und gleiche Organisation")
	if _telefon(a.get("telefon")) and _telefon(a.get("telefon")) == _telefon(b.get("telefon")):
		score = max(score, 70)
		gruende.append("gleiche Telefonnummer")
	nn = norm_text(a.get("nachname"))
	if not gleich and len(nn) >= 3 and nn == norm_text(b.get("nachname")) and pa and pa == re.sub(r"\D", "", str(b.get("plz") or "")) and norm_text(a.get("vorname"))[:1] and norm_text(a.get("vorname"))[:1] == norm_text(b.get("vorname"))[:1]:
		score = max(score, 60)
		gruende.append("gleicher Nachname, Initiale und PLZ")
	return score, gruende


FELDER_K = ["name", "anrede", "titel", "vorname", "nachname", "firma", "funktion", "email", "telefon", "plz", "ort", "land", "organisation_id", "rollen", "tags", "notiz", "zustaendig_id", "nutzer_id", "quelle", "herkunft", "creation", "modified"]


def _org_namen():
	return dict(frappe.get_all("Plattform CRM Organisation", fields=["name", "bezeichnung"], as_list=True))


def dubletten_finden(kontakte, schwelle=60):
	orgs = _org_namen()
	gruppen = {}
	for k in kontakte:
		for s in (f"e:{(k.email or '').lower()}" if k.email else "", f"n:{norm_text(k.nachname)}" if len(norm_text(k.nachname)) >= 3 else "", f"t:{_telefon(k.telefon)}" if _telefon(k.telefon) else ""):
			if s:
				gruppen.setdefault(s, []).append(k)
	paare, gesehen = [], set()
	for liste in gruppen.values():
		for i in range(len(liste)):
			for j in range(i + 1, len(liste)):
				a, b = liste[i], liste[j]
				sch = "|".join(sorted([a.name, b.name]))
				if sch in gesehen:
					continue
				gesehen.add(sch)
				score, gr = dubletten_score(a, b, lambda x: orgs.get(x, ""))
				if score >= schwelle:
					paare.append({"a": a, "b": b, "score": score, "gruende": gr})
	return sorted(paare, key=lambda p: -p["score"])


# ================================================================ Ausgabe


def _k_eintrag(k, dubletten=None):
	akt = frappe.get_all("Plattform CRM Aktivitaet", filters={"kontakt_id": k.name}, fields=["typ", "betreff", "am", "aufgabe_id"], order_by="am desc", limit_page_length=50)
	offen = [frappe.db.get_value("Plattform Aufgabe", a.aufgabe_id, ["status", "faellig_am"], as_dict=True) for a in akt if a.aufgabe_id]
	wv = sorted(str(x.faellig_am) for x in offen if x and x.status == "offen")
	return {
		"id": k.name, "anrede": k.anrede or "", "vorname": k.vorname or "", "nachname": k.nachname or "", "firma": k.firma or "", "funktion": k.funktion or "",
		"email": k.email or "", "telefon": k.telefon or "", "plz": k.plz or "", "ort": k.ort or "", "land": k.land or "",
		"rollen": aus_json(k.rollen) or [], "tags": aus_json(k.tags) or [], "organisationId": k.organisation_id or None,
		"organisation": frappe.db.get_value("Plattform CRM Organisation", k.organisation_id, "bezeichnung") if k.organisation_id else "",
		"nutzerId": k.nutzer_id or None, "quelle": k.quelle or "manuell", "herkunft": k.herkunft or "", "zustaendig": kurz(k.zustaendig_id),
		"bezuege": frappe.db.count("Plattform CRM Bezug", {"parent": k.name, "parenttype": "Plattform CRM Kontakt"}),
		"letzteAktivitaet": {"typ": akt[0].typ, "betreff": akt[0].betreff, "am": iso(akt[0].am)} if akt else None,
		"wiedervorlage": wv[0] if wv else None, "dublette": bool(dubletten and k.name in dubletten),
		"erstelltAm": iso(k.creation), "geaendertAm": iso(k.modified),
	}


def _bezug_ausgabe(b):
	o = objekt_laden(b.art, b.bezug_id)
	return {"art": b.art, "id": b.bezug_id, "rolle": b.rolle, "titel": bo.objekt_titel(b.art, o) if o else f"{b.art} {b.bezug_id} (nicht mehr vorhanden)", "link": bo.admin_pfad(b.art, o) if o else None, "status": o.status if o else None, "statusLabel": status_label(b.art, o.status) if o else "", "tags": bo.info_json(b.art, b.bezug_id)["tags"]}


def _akt_ausgabe(a):
	auf = frappe.db.get_value("Plattform Aufgabe", a.aufgabe_id, ["name", "faellig_am", "status", "zustaendig_id"], as_dict=True) if a.aufgabe_id else None
	o = objekt_laden(a.bezug_art, a.bezug_id) if a.bezug_art and a.bezug_id else None
	return {
		"id": a.name, "typ": a.typ, "betreff": a.betreff, "text": a.text or "", "am": iso(a.am), "kontaktId": a.kontakt_id, "organisationId": a.organisation_id,
		"bezugArt": a.bezug_art, "bezugId": a.bezug_id, "system": bool(cint(a.system)), "von": "System" if cint(a.system) else name_von(a.von_id) or "–",
		"bezugTitel": bo.objekt_titel(a.bezug_art, o) if o else "", "bezugLink": bo.admin_pfad(a.bezug_art, o) if o else None,
		"wiedervorlage": {"id": auf.name, "faelligAm": str(auf.faellig_am), "status": auf.status, "zustaendig": name_von(auf.zustaendig_id)} if auf else None,
	}


# ================================================================ Lead aus Anfrage (Ereignis vorgang_neu)


def _bezug_hinzu(k, art, bezug_id, rolle):
	if not any(b.art == art and b.bezug_id == bezug_id for b in k.bezuege or []):
		k.append("bezuege", {"art": art, "bezug_doctype": DOCTYPE[art], "bezug_id": bezug_id, "rolle": rolle, "am": jetzt()})


def _aktivitaet(kontakt_id, typ, betreff, text="", bezug_art=None, bezug_id=None, von_id=None, system=False, organisation_id=None, am=None):
	return frappe.get_doc({"doctype": "Plattform CRM Aktivitaet", "kontakt_id": kontakt_id, "organisation_id": organisation_id, "typ": typ, "betreff": v.text(betreff, 160), "text": v.mehrzeilig(text, 3000), "am": am or jetzt(), "bezug_art": bezug_art, "bezug_id": bezug_id, "von_id": von_id, "system": 1 if system else 0}).insert(ignore_permissions=True)


def aus_vorgang(vg):
	"""Neuer Vorgang → CRM-Kontakt anlegen bzw. per E-Mail zuordnen (keine Dublette bei gleicher Adresse)."""
	if not vg.email:
		return None
	kt = aus_json(vg.kontakt) or {}
	rolle = CRM_ROLLE_FUER_TYP.get(vg.typ, "sonstige")
	name = frappe.db.get_value("Plattform CRM Kontakt", {"email": vg.email.lower()}, "name")
	if name:
		k = frappe.get_doc("Plattform CRM Kontakt", name)
		for f in ("vorname", "nachname", "firma", "telefon", "plz", "ort", "land"):
			if not k.get(f) and kt.get(f):
				k.set(f, kt.get(f))
		rollen = aus_json(k.rollen) or []
		if rolle not in rollen:
			k.rollen = als_json(rollen + [rolle])
	else:
		herkunft = aus_json(vg.herkunft) or {}
		k = frappe.get_doc({"doctype": "Plattform CRM Kontakt", "anrede": kt.get("anrede") if kt.get("anrede") in ("Frau", "Herr") else "", "vorname": kt.get("vorname"), "nachname": kt.get("nachname"), "firma": kt.get("firma"), "email": vg.email, "telefon": kt.get("telefon"), "plz": kt.get("plz"), "ort": kt.get("ort"), "land": kt.get("land") or "", "rollen": als_json([rolle]), "tags": "[]", "nutzer_id": vg.nutzer_id, "quelle": "anfrage", "herkunft": herkunft.get("kanal") or ""})
	if vg.typ == "kommune" and kt.get("firma") and not k.organisation_id:
		org = next((o.name for o in frappe.get_all("Plattform CRM Organisation", fields=["name", "bezeichnung"]) if norm_text(o.bezeichnung) == norm_text(kt["firma"])), None)
		if not org:
			org = frappe.get_doc({"doctype": "Plattform CRM Organisation", "bezeichnung": kt["firma"], "art": "stadtwerk" if (aus_json(vg.daten) or {}).get("absender") == "stadtwerk" else "gemeinde", "plz": kt.get("plz"), "ort": kt.get("ort"), "land": kt.get("land") or "DE", "tags": "[]"}).insert(ignore_permissions=True).name
		k.organisation_id = org
	_bezug_hinzu(k, "vorgang", vg.name, "Anfragender")
	if vg.get("flaeche_id"):
		_bezug_hinzu(k, "flaeche", vg.flaeche_id, "Eigentümer")
	k.save(ignore_permissions=True) if not k.is_new() else k.insert(ignore_permissions=True)
	_aktivitaet(k.name, "notiz", f"Anfrage eingegangen: {VORGANG_TYPEN.get(vg.typ, vg.typ)}", bezug_art="vorgang", bezug_id=vg.name, system=True)
	return k


# ================================================================ Kontakte


def _kontakt_daten(d, k):
	for f, n in (("anrede", 20), ("titel", 40), ("vorname", 80), ("nachname", 80), ("firma", 120), ("funktion", 80), ("telefon", 40), ("ort", 80)):
		if f in d:
			k.set(f, v.text(d.get(f), n))
	if "email" in d:
		e = v.email(d.get("email"))
		v.pflicht(e or not d.get("email"), "Bitte eine gültige E-Mail-Adresse angeben (oder leer lassen).")
		k.email = e or None
	if "plz" in d:
		k.plz = v.plz(d.get("plz"))
	if "land" in d:
		k.land = v.auswahl(d.get("land"), LAENDER, "")
	if "organisationId" in d:
		o = v.kennung(d.get("organisationId"))
		v.pflicht(not o or frappe.db.exists("Plattform CRM Organisation", o), "Organisation nicht gefunden.")
		k.organisation_id = o or None
	if "rollen" in d:
		k.rollen = als_json(v.mehrfach(d.get("rollen"), KONTAKT_ROLLEN))
	if "tags" in d:
		k.tags = als_json(_tags(d.get("tags")))
	if "notiz" in d:
		k.notiz = v.mehrzeilig(d.get("notiz"), 3000)
	if "zustaendigId" in d:
		z = v.kennung(d.get("zustaendigId"))
		v.pflicht(not z or bo._aktive_backoffice(z), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
		k.zustaendig_id = z or None


def _tags(t):
	liste = t if isinstance(t, list) else str(t or "").split(",")
	return list(dict.fromkeys(x for x in (v.text(y, 40) for y in liste) if len(x) >= 2))[:20]


@frappe.whitelist(methods=["POST"])
def kontakte(q=None, rolle=None, tag=None, organisationId=None, zustaendigId=None, quelle=None, nurDubletten=None, limit=500, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 1)
	filters = {}
	if organisationId:
		filters["organisation_id"] = v.kennung(organisationId)
	if zustaendigId:
		filters["zustaendig_id"] = v.kennung(zustaendigId)
	if quelle in ("anfrage", "konto", "manuell"):
		filters["quelle"] = quelle
	alle = frappe.get_all("Plattform CRM Kontakt", fields=FELDER_K, limit_page_length=0)
	liste = [k for k in alle if all(k.get(f) == w for f, w in filters.items())]
	if rolle:
		liste = [k for k in liste if rolle in (aus_json(k.rollen) or [])]
	if tag:
		liste = [k for k in liste if tag.lower() in [x.lower() for x in aus_json(k.tags) or []]]
	if q:
		s = norm_text(q)
		liste = [k for k in liste if s in norm_text(" ".join(str(k.get(f) or "") for f in ("vorname", "nachname", "firma", "ort", "plz"))) or str(q).lower() in (k.email or "")]
	dub = {x for p in dubletten_finden(alle) for x in (p["a"].name, p["b"].name)}
	if v.wahr(nurDubletten):
		liste = [k for k in liste if k.name in dub]
	liste.sort(key=lambda k: str(k.modified), reverse=True)
	tags = sorted({t for k in alle for t in aus_json(k.tags) or []}, key=str.lower)
	return {"kontakte": [_k_eintrag(k, dub) for k in liste[: min(2000, cint(limit) or 500)]], "gesamt": len(liste), "tags": tags, "dubletten": len(dub)}


@frappe.whitelist(methods=["POST"])
def kontakt(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 1)
	kid = v.kennung(id)
	if not kid or not frappe.db.exists("Plattform CRM Kontakt", kid):
		nicht_gefunden("Kontakt nicht gefunden.")
	k = frappe.get_doc("Plattform CRM Kontakt", kid)
	aus = _k_eintrag(k)
	akt = [_akt_ausgabe(a) for a in frappe.get_all("Plattform CRM Aktivitaet", filters={"kontakt_id": k.name}, fields=["*"], order_by="am desc", limit_page_length=300)]
	bez = [_bezug_ausgabe(b) for b in k.bezuege or []]
	verlauf = [{"am": a["am"], "art": "aktivitaet", "typ": a["typ"], "titel": f"{AKTIVITAET_TYPEN.get(a['typ'])}: {a['betreff']}", "text": a["text"], "von": a["von"], "link": a["bezugLink"]} for a in akt]
	for b in k.bezuege or []:
		o = objekt_laden(b.art, b.bezug_id)
		if not o:
			continue
		for e in o.get("status_verlauf") or []:
			verlauf.append({"am": iso(e.am), "art": "status", "typ": b.art, "titel": f"{bo.objekt_titel(b.art, o)}: {status_label(b.art, e.status)}", "text": e.kommentar or "", "von": name_von(e.von_id) or e.von_rolle, "link": bo.admin_pfad(b.art, o)})
	verlauf.sort(key=lambda x: str(x["am"]), reverse=True)
	alle = frappe.get_all("Plattform CRM Kontakt", filters={"name": ("!=", k.name)}, fields=FELDER_K, limit_page_length=0)
	dub = []
	for x in alle:
		score, gr = dubletten_score(k.as_dict(), x)
		if score >= 60:
			dub.append({"id": x.name, "name": " ".join(y for y in (x.vorname, x.nachname) if y), "email": x.email, "plz": x.plz, "score": score, "gruende": gr})
	org = frappe.db.get_value("Plattform CRM Organisation", k.organisation_id, ["name", "bezeichnung", "art"], as_dict=True) if k.organisation_id else None
	return {**aus, "notiz": k.notiz or "", "titel": k.titel or "", "zustaendigId": k.zustaendig_id, "organisationObjekt": {"id": org.name, "name": org.bezeichnung, "art": org.art} if org else None, "konto": kurz(k.nutzer_id), "bezuegeListe": bez, "aktivitaeten": akt, "verlauf": verlauf[:300], "dubletten": dub}


@frappe.whitelist(methods=["POST"])
def kontakt_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	d = daten if isinstance(daten, dict) else {}
	if id:
		kid = v.kennung(id)
		if not kid or not frappe.db.exists("Plattform CRM Kontakt", kid):
			nicht_gefunden("Kontakt nicht gefunden.")
		k = frappe.get_doc("Plattform CRM Kontakt", kid)
	else:
		k = frappe.get_doc({"doctype": "Plattform CRM Kontakt", "quelle": "manuell", "rollen": "[]", "tags": "[]"})
	_kontakt_daten(d, k)
	v.pflicht(k.nachname or k.firma, "Bitte mindestens Nachname oder Firma angeben.")
	if k.email and not v.wahr(d.get("trotzdem")):
		doppelt = frappe.db.get_value("Plattform CRM Kontakt", {"email": k.email, "name": ("!=", k.name or "-")}, "name")
		if doppelt:
			frappe.throw(f"Es gibt bereits einen Kontakt mit dieser E-Mail-Adresse ({doppelt}).", frappe.DuplicateEntryError)
	if k.is_new():
		k.nutzer_id = frappe.db.get_value("Plattform Konto", {"email": k.email}, "name") if k.email else None
		k.insert(ignore_permissions=True)
		protokoll(n, "crm", "kontakt", k.name, f"Kontakt angelegt: {' '.join(x for x in (k.vorname, k.nachname) if x) or k.firma}")
	else:
		k.save(ignore_permissions=True)
		protokoll(n, "crm", "kontakt", k.name, "Kontakt bearbeitet")
	return _k_eintrag(k)


@frappe.whitelist(methods=["POST"])
def beziehung(kontaktId=None, art=None, id=None, rolle=None, entfernen=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	kid = v.kennung(kontaktId)
	if not kid or not frappe.db.exists("Plattform CRM Kontakt", kid):
		nicht_gefunden("Kontakt nicht gefunden.")
	v.pflicht(art in BEZUG_ARTEN, "Unbekannte Objektart.")
	o = objekt_laden(art, id)
	if not o:
		nicht_gefunden("Objekt nicht gefunden.")
	k = frappe.get_doc("Plattform CRM Kontakt", kid)
	if v.wahr(entfernen):
		k.bezuege = [b for b in k.bezuege if not (b.art == art and b.bezug_id == o.name)]
	else:
		b = next((x for x in k.bezuege if x.art == art and x.bezug_id == o.name), None)
		r = v.auswahl(rolle, BEZUG_ROLLEN, "Ansprechpartner")
		if b:
			b.rolle = r
		else:
			_bezug_hinzu(k, art, o.name, r)
	k.save(ignore_permissions=True)
	protokoll(n, "crm", art, o.name, f"{'Beziehung entfernt' if v.wahr(entfernen) else 'Beziehung gesetzt'}: Kontakt {k.name}")
	return {"ok": True, "bezuege": [_bezug_ausgabe(b) for b in k.bezuege]}


# ================================================================ Organisationen


def _org_ausgabe(o):
	kontakte_ = frappe.get_all("Plattform CRM Kontakt", filters={"organisation_id": o.name}, pluck="name")
	return {"id": o.name, "name": o.bezeichnung, "art": o.art, "strasse": o.strasse or "", "plz": o.plz or "", "ort": o.ort or "", "land": o.land or "", "bundesland": o.bundesland or "", "website": o.website or "", "telefon": o.telefon or "", "email": o.email or "", "tags": aus_json(o.tags) or [], "notiz": o.notiz or "", "kontakte": len(kontakte_), "aktivitaeten": frappe.db.count("Plattform CRM Aktivitaet", {"organisation_id": o.name}), "erstelltAm": iso(o.creation), "geaendertAm": iso(o.modified)}


@frappe.whitelist(methods=["POST"])
def organisationen(q=None, art=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 1)
	liste = frappe.get_all("Plattform CRM Organisation", filters={"art": art} if art in ORG_ARTEN else {}, fields=["*"], order_by="bezeichnung asc", limit_page_length=0)
	if q:
		s = norm_text(q)
		liste = [o for o in liste if s in norm_text(f"{o.bezeichnung} {o.ort} {o.plz} {o.bundesland}")]
	return [_org_ausgabe(o) for o in liste]


@frappe.whitelist(methods=["POST"])
def organisation(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 1)
	oid = v.kennung(id)
	if not oid or not frappe.db.exists("Plattform CRM Organisation", oid):
		nicht_gefunden("Organisation nicht gefunden.")
	o = frappe.get_doc("Plattform CRM Organisation", oid)
	kontakte_ = [frappe.get_doc("Plattform CRM Kontakt", k) for k in frappe.get_all("Plattform CRM Kontakt", filters={"organisation_id": o.name}, pluck="name")]
	ids = [k.name for k in kontakte_]
	akt = frappe.get_all("Plattform CRM Aktivitaet", or_filters={"organisation_id": o.name, "kontakt_id": ("in", ids or ["-"])}, fields=["*"], order_by="am desc", limit_page_length=300)
	bez, gesehen = [], set()
	for k in kontakte_:
		for b in k.bezuege or []:
			if b.bezug_id not in gesehen:
				gesehen.add(b.bezug_id)
				bez.append({**_bezug_ausgabe(b), "kontakt": " ".join(x for x in (k.vorname, k.nachname) if x)})
	return {**_org_ausgabe(o), "kontakteListe": [_k_eintrag(k) for k in kontakte_], "aktivitaeten": [_akt_ausgabe(a) for a in akt], "bezuege": bez}


@frappe.whitelist(methods=["POST"])
def organisation_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	d = daten if isinstance(daten, dict) else {}
	o = frappe.get_doc("Plattform CRM Organisation", v.kennung(id)) if id and frappe.db.exists("Plattform CRM Organisation", v.kennung(id)) else None
	if id and not o:
		nicht_gefunden("Organisation nicht gefunden.")
	o = o or frappe.get_doc({"doctype": "Plattform CRM Organisation", "tags": "[]"})
	for f, feld, lang in (("name", "bezeichnung", 160), ("strasse", "strasse", 120), ("ort", "ort", 80), ("bundesland", "bundesland", 60), ("website", "website", 160), ("telefon", "telefon", 40)):
		if f in d:
			o.set(feld, v.text(d.get(f), lang))
	if "art" in d:
		o.art = v.auswahl(d.get("art"), ORG_ARTEN, "sonstige")
	if "plz" in d:
		o.plz = v.plz(d.get("plz"))
	if "land" in d:
		o.land = v.auswahl(d.get("land"), LAENDER, "DE")
	if "email" in d:
		o.email = v.email(d.get("email")) or None
	if "tags" in d:
		o.tags = als_json(_tags(d.get("tags")))
	if "notiz" in d:
		o.notiz = v.mehrzeilig(d.get("notiz"), 3000)
	v.pflicht(len(o.bezeichnung or "") >= 2, "Bitte einen Namen angeben.")
	o.save(ignore_permissions=True) if not o.is_new() else o.insert(ignore_permissions=True)
	protokoll(n, "crm", "organisation", o.name, f"Organisation gespeichert: {o.bezeichnung}")
	return _org_ausgabe(o)


# ================================================================ Aktivitäten, Dubletten, Massenaktion


@frappe.whitelist(methods=["POST"])
def aktivitaet_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	d = daten if isinstance(daten, dict) else {}
	typ = v.auswahl(d.get("typ"), AKTIVITAET_TYPEN, "")
	v.pflicht(typ, "Bitte die Art der Aktivität wählen.")
	betreff = v.text(d.get("betreff"), 160)
	v.pflicht(len(betreff) >= 3, "Bitte einen Betreff (mind. 3 Zeichen) angeben.")
	kid = v.kennung(d.get("kontaktId"))
	oid = v.kennung(d.get("organisationId"))
	if kid and not frappe.db.exists("Plattform CRM Kontakt", kid):
		nicht_gefunden("Kontakt nicht gefunden.")
	bezug_art = bezug_id = None
	if d.get("bezugArt"):
		v.pflicht(d["bezugArt"] in BEZUG_ARTEN, "Unbekannte Objektart.")
		o = objekt_laden(d["bezugArt"], d.get("bezugId"))
		if not o:
			nicht_gefunden("Objekt nicht gefunden.")
		bezug_art, bezug_id = d["bezugArt"], o.name
	v.pflicht(kid or oid or bezug_art, "Aktivität braucht einen Kontakt, eine Organisation oder ein Objekt.")
	a = _aktivitaet(kid, typ, betreff, d.get("text"), bezug_art, bezug_id, n.id, organisation_id=oid or (frappe.db.get_value("Plattform CRM Kontakt", kid, "organisation_id") if kid else None), am=get_datetime(d["am"]) if d.get("am") else None)
	a.dauer_min = v.zahl(d.get("dauerMin"), min=0, max=600, stellen=0)
	a.ergebnis = v.text(d.get("ergebnis"), 160)
	if d.get("wiedervorlageAm"):
		try:
			f = str(getdate(v.text(d.get("wiedervorlageAm"), 10)))
		except Exception:  # noqa: BLE001
			f = ""
		v.pflicht(f, "Wiedervorlage: gültiges Datum angeben.")
		z = v.kennung(d.get("zustaendigId")) or n.id
		v.pflicht(bo._aktive_backoffice(z), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
		auf = frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(f"Wiedervorlage: {betreff}", 160), "beschreibung": v.mehrzeilig(f"{AKTIVITAET_TYPEN[typ]}: {a.text or ''}\nCRM: /portal/admin/crm/{kid or ''}", 2000), "faellig_am": f, "zustaendig_id": z, "status": "offen", "bezug_art": bezug_art, "bezug_id": bezug_id, "erstellt_von": n.id}).insert(ignore_permissions=True)
		a.aufgabe_id = auf.name
		a.wiedervorlage_am = f
	a.save(ignore_permissions=True)
	protokoll(n, "crm", bezug_art or "kontakt", bezug_id or kid or oid, f"{AKTIVITAET_TYPEN[typ]}: {betreff}")
	return _akt_ausgabe(frappe._dict(a.as_dict()))


@frappe.whitelist(methods=["POST"])
def dubletten(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 1)
	alle = frappe.get_all("Plattform CRM Kontakt", fields=FELDER_K, limit_page_length=0)
	return [{"score": p["score"], "gruende": p["gruende"], "a": _k_eintrag(p["a"]), "b": _k_eintrag(p["b"])} for p in dubletten_finden(alle)[:200]]


@frappe.whitelist(methods=["POST"])
def zusammenfuehren(zielId=None, quelleId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	zid, qid = v.kennung(zielId), v.kennung(quelleId)
	v.pflicht(zid and qid and zid != qid, "Bitte zwei verschiedene Kontakte wählen.")
	if not frappe.db.exists("Plattform CRM Kontakt", zid) or not frappe.db.exists("Plattform CRM Kontakt", qid):
		nicht_gefunden("Kontakt nicht gefunden.")
	z, q = frappe.get_doc("Plattform CRM Kontakt", zid), frappe.get_doc("Plattform CRM Kontakt", qid)
	if z.nutzer_id and q.nutzer_id and z.nutzer_id != q.nutzer_id:
		frappe.throw("Beide Kontakte gehören zu verschiedenen Portal-Konten – bitte nicht zusammenführen.", frappe.DuplicateEntryError)
	for f in ("anrede", "titel", "vorname", "nachname", "firma", "funktion", "telefon", "plz", "ort", "land", "organisation_id", "zustaendig_id", "nutzer_id", "herkunft"):
		if not z.get(f) and q.get(f):
			z.set(f, q.get(f))
	if not z.email and q.email:
		z.email = q.email
	z.rollen = als_json(list(dict.fromkeys((aus_json(z.rollen) or []) + (aus_json(q.rollen) or []))))
	z.tags = als_json(list(dict.fromkeys((aus_json(z.tags) or []) + (aus_json(q.tags) or []))))
	for b in q.bezuege or []:
		_bezug_hinzu(z, b.art, b.bezug_id, b.rolle)
	frappe.db.sql("update `tabPlattform CRM Aktivitaet` set kontakt_id=%s where kontakt_id=%s", (z.name, q.name))
	q_name = f"{q.vorname or ''} {q.nachname or ''}".strip()
	frappe.delete_doc("Plattform CRM Kontakt", q.name, ignore_permissions=True, force=True)
	z.save(ignore_permissions=True)
	_aktivitaet(z.name, "notiz", f"Dublette zusammengeführt: {q_name} ({qid})", von_id=n.id, system=True)
	protokoll(n, "crm", "kontakt", z.name, f"Kontakt {qid} in {z.name} zusammengeführt")
	return _k_eintrag(z)


@frappe.whitelist(methods=["POST"])
def massenaktion(ids=None, tag=None, tagEntfernen=None, zustaendigId=None, rolle=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "crm", 2)
	liste = [x for x in (v.kennung(i) for i in (ids or [])[:500]) if x]
	v.pflicht(liste, "Bitte Kontakte auswählen.")
	if zustaendigId:
		v.pflicht(bo._aktive_backoffice(zustaendigId), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
	t = v.text(tag, 40)
	geaendert = 0
	for kid in liste:
		if not frappe.db.exists("Plattform CRM Kontakt", kid):
			continue
		k = frappe.get_doc("Plattform CRM Kontakt", kid)
		tags = aus_json(k.tags) or []
		if t:
			tags = [x for x in tags if x != t] if v.wahr(tagEntfernen) else list(dict.fromkeys(tags + [t]))
		k.tags = als_json(tags)
		if zustaendigId:
			k.zustaendig_id = zustaendigId
		if rolle in KONTAKT_ROLLEN:
			k.rollen = als_json(list(dict.fromkeys((aus_json(k.rollen) or []) + [rolle])))
		k.save(ignore_permissions=True)
		geaendert += 1
	protokoll(n, "crm", "kontakt", liste[0], f"Massenaktion für {geaendert} Kontakt(e)")
	return {"ok": True, "geaendert": geaendert}


# ================================================================ Akquise-Pipeline & Gebiete


def _gebiet_ausgabe(g):
	return {"id": g.name, "name": g.bezeichnung, "land": g.land or "", "bundeslaender": aus_json(g.bundeslaender) or [], "plz": aus_json(g.plz) or [], "mitarbeiterId": g.mitarbeiter_id, "aktiv": bool(cint(g.aktiv)), "mitarbeiter": kurz(g.mitarbeiter_id)}


def _zeile(f):
	i = bo.info_json("flaeche", f.name)
	s = bo.flaechen_score(f, i)
	auto = bo.prioritaet_auto(s["score"], f.ha)
	ein = bo.eingang_am("flaeche", f)
	sla = {"ampel": "grau", "status": "entwurf", "text": "Noch nicht eingereicht"} if f.status == "entwurf" and not f.vorgang_id else bo.sla_status(ein, bo.erstkontakt_am("flaeche", f, ein))
	g = bo.gebiet_fuer(f.land, f.bundesland, f.plz)
	k = bo.kontakt_von("flaeche", f)
	return {
		"id": f.name, "bezeichnung": f.bezeichnung, "land": f.land, "bundesland": f.bundesland, "plz": f.plz, "ort": f.ort, "ha": float(f.ha or 0), "nutzung": f.nutzung, "agri": bool(cint(f.agri)),
		"status": f.status, "statusLabel": status_label("flaeche", f.status), "vorgangId": f.vorgang_id or None, "score": s["score"], "ampel": s["ampel"], "mwp": s["mwp"], "gruende": [],
		"prioritaet": i["prioritaet"] or auto, "prioritaetManuell": bool(i["prioritaet"]), "prioritaetAuto": auto, "besonderheiten": i["besonderheiten"], "netz": i["netz"], "tags": i["tags"],
		"zustaendig": kurz(f.zustaendig_id), "gebiet": {"id": g["gebiet"].name, "name": g["gebiet"].bezeichnung, "grund": g["grund"], "mitarbeiter": kurz(g["gebiet"].mitarbeiter_id)} if g else None,
		"sla": sla, "eingangAm": iso(ein), "kontakt": {"id": k.get("name") if k.get("doctype") else None, "name": " ".join(x for x in (k.get("vorname"), k.get("nachname")) if x) or k.get("email"), "email": k.get("email") or ""} if k else None, "geaendertAm": iso(f.modified),
	}


@frappe.whitelist(methods=["POST"])
def akquise(land=None, prioritaet=None, sla=None, zustaendigId=None, status=None, q=None, alle=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "akquise", 1)
	bo.fristen_pruefen_intern()
	filters = {} if v.wahr(alle) else {"status": ("in", OFFEN_FLAECHE)}
	zeilen = [_zeile(frappe.get_doc("Plattform Flaeche", x)) for x in frappe.get_all("Plattform Flaeche", filters=filters, pluck="name", limit_page_length=2000)]
	liste = zeilen
	if land:
		liste = [z for z in liste if z["land"] == land]
	if prioritaet:
		liste = [z for z in liste if z["prioritaet"] == prioritaet]
	if sla:
		liste = [z for z in liste if z["sla"]["ampel"] == sla]
	if zustaendigId == "ohne":
		liste = [z for z in liste if not z["zustaendig"]]
	elif zustaendigId:
		liste = [z for z in liste if (z["zustaendig"] or {}).get("id") == zustaendigId]
	if status:
		liste = [z for z in liste if z["status"] == status]
	if q:
		s = str(q).lower()
		liste = [z for z in liste if s in " ".join(str(z.get(f) or "") for f in ("id", "bezeichnung", "ort", "plz", "bundesland")).lower()]
	liste.sort(key=lambda z: ("ABC".index(z["prioritaet"]), {"rot": 0, "gelb": 1, "gruen": 2, "grau": 3}[z["sla"]["ampel"]], -z["score"]))
	summe = lambda feld: round(sum(float(z[feld] or 0) for z in zeilen) * 10) / 10  # noqa: E731
	konten = [kurz(k) for k in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent") if bo._aktive_backoffice(k)]
	return {
		"flaechen": liste,
		"kennzahlen": {"anzahl": len(zeilen), "ha": summe("ha"), "mwp": summe("mwp"), "slaRot": sum(1 for z in zeilen if z["sla"]["ampel"] == "rot"), "slaGelb": sum(1 for z in zeilen if z["sla"]["ampel"] == "gelb"), "ohneZustaendig": sum(1 for z in zeilen if not z["zustaendig"]), "prioA": sum(1 for z in zeilen if z["prioritaet"] == "A"), "scoreMittel": round(sum(z["score"] for z in zeilen) / len(zeilen)) if zeilen else 0},
		"konten": konten,
		"gebiete": [_gebiet_ausgabe(g) for g in frappe.get_all("Plattform Gebiet", fields=["*"], order_by="reihenfolge asc")],
	}


@frappe.whitelist(methods=["POST"])
def akquise_setzen(flaecheId=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "akquise", 2)
	f = objekt_laden("flaeche", flaecheId)
	if not f:
		nicht_gefunden("Fläche nicht gefunden.")
	d = daten if isinstance(daten, dict) else {}
	i = bo.info("flaeche", f.name, erzeugen=True)
	if "prioritaet" in d:
		i.prioritaet = d["prioritaet"] if d["prioritaet"] in bo.PRIORITAETEN else None
	if "besonderheiten" in d:
		i.besonderheiten = als_json(v.mehrfach(d.get("besonderheiten"), BESONDERHEITEN))
	if "netz" in d:
		i.netz = v.auswahl(d.get("netz"), NETZ, "unbekannt")
	i.save(ignore_permissions=True)
	protokoll(n, "akquise", "flaeche", f.name, "Akquise-Angaben gespeichert")
	return _zeile(f)


@frappe.whitelist(methods=["POST"])
def gebiete(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "akquise", 1)
	konten = [kurz(k) for k in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent") if bo._aktive_backoffice(k)]
	return {"gebiete": [_gebiet_ausgabe(g) for g in frappe.get_all("Plattform Gebiet", fields=["*"], order_by="reihenfolge asc")], "konten": konten}


@frappe.whitelist(methods=["POST"])
def gebiete_speichern(liste=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "akquise", 2)
	v.pflicht(isinstance(liste, list) and len(liste) <= 100, "Höchstens 100 Gebiete.")
	neu = []
	for i, g in enumerate(liste):
		name = v.text(g.get("name"), 80)
		v.pflicht(len(name) >= 2, "Jedes Gebiet braucht einen Namen.")
		land = v.auswahl(g.get("land"), LAENDER, "")
		mid = v.kennung(g.get("mitarbeiterId"))
		v.pflicht(bo._aktive_backoffice(mid), f"Gebiet „{name}“: Zuständig kann nur ein aktives Backoffice-Konto sein.")
		plz = [str(x).replace(" ", "") for x in (g.get("plz") if isinstance(g.get("plz"), list) else str(g.get("plz") or "").split(",")) if str(x).strip()][:30]
		v.pflicht(all(re.match(r"^\d{1,5}(-\d{1,5})?$", x) for x in plz), f"Gebiet „{name}“: PLZ-Bereiche wie „80-87“ oder „9“ angeben.")
		bl = v.mehrfach(g.get("bundeslaender"), BUNDESLAENDER.get(land, []) if land else [b for x in BUNDESLAENDER.values() for b in x])
		v.pflicht(land or plz or bl, f"Gebiet „{name}“: Land, Bundesland oder PLZ-Bereich angeben.")
		neu.append({"bezeichnung": name, "land": land, "plz": als_json(plz), "bundeslaender": als_json(bl), "mitarbeiter_id": mid, "aktiv": 0 if g.get("aktiv") is False else 1, "reihenfolge": i})
	for alt in frappe.get_all("Plattform Gebiet", pluck="name"):
		frappe.delete_doc("Plattform Gebiet", alt, ignore_permissions=True, force=True)
	for g in neu:
		frappe.get_doc({"doctype": "Plattform Gebiet", **g}).insert(ignore_permissions=True)
	protokoll(n, "akquise", "gebiete", "gebiete", f"Gebietszuordnung gespeichert ({len(neu)} Gebiete)")
	return {"gebiete": [_gebiet_ausgabe(g) for g in frappe.get_all("Plattform Gebiet", fields=["*"], order_by="reihenfolge asc")], "gespeichertAm": iso(jetzt())}


@frappe.whitelist(methods=["POST"])
def akquise_zuweisen(ids=None, modus="gebiet", zustaendigId=None, ueberschreiben=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "akquise", 2)
	recht_noetig(n, "flaechen", 2)
	liste = [x for x in (v.kennung(i) for i in (ids or [])[:500]) if x]
	v.pflicht(liste, "Bitte Flächen auswählen.")
	if modus != "gebiet":
		v.pflicht(bo._aktive_backoffice(zustaendigId), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
	erg = {"zugewiesen": 0, "uebersprungen": 0, "ohneGebiet": 0}
	for fid in liste:
		f = objekt_laden("flaeche", fid)
		if not f:
			continue
		if f.zustaendig_id and not v.wahr(ueberschreiben):
			erg["uebersprungen"] += 1
			continue
		ziel, grund = zustaendigId, "manuell"
		if modus == "gebiet":
			g = bo.gebiet_fuer(f.land, f.bundesland, f.plz)
			if not g:
				erg["ohneGebiet"] += 1
				continue
			ziel, grund = g["gebiet"].mitarbeiter_id, f"Gebiet „{g['gebiet'].bezeichnung}“"
		frappe.db.set_value("Plattform Flaeche", f.name, "zustaendig_id", ziel)
		if f.vorgang_id and (v.wahr(ueberschreiben) or not frappe.db.get_value("Plattform Vorgang", f.vorgang_id, "zustaendig_id")):
			frappe.db.set_value("Plattform Vorgang", f.vorgang_id, "zustaendig_id", ziel)
		protokoll(n, "zuweisen", "flaeche", f.name, f"Zuständig: {name_von(ziel)} ({grund})")
		erg["zugewiesen"] += 1
	return erg
