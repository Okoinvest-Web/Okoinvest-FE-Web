# Copyright (c) 2026, ÖkoInvest GmbH
#
# Backoffice-Ausbau – gemeinsamer Kern für api/crm.py, api/automation.py, api/berichte.py:
#  - Präfixe der neuen DocTypes (Kennungen PRÄFIX-JJ-XXXXXX)
#  - Objekt-Infos (Tags, Priorität, Akquise-Angaben), Kontext für Vorlagen, Fakten für Bedingungen
#  - Flächen-Scoring (vereinfachte Portierung von src/lib/rechner/flaechencheck.js), SLA Erstkontakt, Gebiete
#  - Automations-Motor mit Schleifenschutz (wie backend/demo/automation.js) und Ereignis-Einstieg
#    backoffice_ereignis(), aufgerufen aus anfrage.anlegen, ablauf.uebergang_anwenden/system_wechsel,
#    dokument.speichern und ablauf.investoren_benachrichtigen. Fehler hier verhindern nie den Kernvorgang.

import re
from datetime import timedelta

import frappe
from frappe.utils import add_days, cint, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, jetzt, jetzt_iso, name_von, neue_id, objekt_laden, protokoll
from oekoinvest_app.plattform.konstanten import DOCTYPE, LAENDER, PRAEFIX, PROJEKT_TYPEN, VORGANG_TYPEN

PRAEFIX.update(
	{
		"Plattform CRM Kontakt": "K",
		"Plattform CRM Organisation": "KO",
		"Plattform CRM Aktivitaet": "KA",
		"Plattform Automation Regel": "R",
		"Plattform Automation Lauf": "AL",
		"Plattform Vorlage": "VL",
		"Plattform Gebiet": "GE",
		"Plattform Objekt Info": "OI",
	}
)

SCHLEIFE = {"tiefe": 3, "pro_stunde": 3}
ARTEN = ["vorgang", "flaeche", "projekt", "interesse", "provision"]
PRIORITAETEN = ["A", "B", "C"]
AUSLOESER = ["vorgang_neu", "status", "frist", "suchprofil", "dokument"]
FRISTEN = ["sla_erstkontakt", "status_dauer", "aufgabe_ueberfaellig"]
AKTIONEN = ["zustaendig", "aufgabe", "mail", "nachricht", "tag", "status", "prioritaet"]
FELDER = {"typ": "auswahl", "land": "auswahl", "bundesland": "text", "plz": "text", "mwp": "zahl", "ha": "zahl", "score": "zahl", "kanal": "text", "status": "text", "kategorie": "auswahl", "tag": "text"}
OPERATOREN = ["gleich", "ungleich", "in", "min", "max", "enthaelt", "beginnt"]
HA_JE_MWP = 1.1  # FREIFLAECHE.haProMwp in src/lib/invest/markt.js

# ================================================================ Objekt-Infos & Tags


def info(art, objekt_id, erzeugen=False):
	name = frappe.db.get_value("Plattform Objekt Info", {"objekt_art": art, "objekt_id": objekt_id}, "name")
	if name:
		return frappe.get_doc("Plattform Objekt Info", name)
	if not erzeugen:
		return None
	return frappe.get_doc({"doctype": "Plattform Objekt Info", "objekt_art": art, "objekt_id": objekt_id, "tags": "[]"}).insert(ignore_permissions=True)


def info_json(art, objekt_id):
	i = info(art, objekt_id)
	if not i:
		return {"tags": [], "prioritaet": None, "besonderheiten": [], "netz": "unbekannt", "fristen": {}}
	return {"tags": aus_json(i.tags) or [], "prioritaet": i.prioritaet or None, "besonderheiten": aus_json(i.besonderheiten) or [], "netz": i.netz or "unbekannt", "fristen": aus_json(i.fristen) or {}}


def tag_setzen(art, objekt_id, tag, an=True):
	i = info(art, objekt_id, erzeugen=True)
	tags = aus_json(i.tags) or []
	t = v.text(tag, 40)
	vorhanden = any(x.lower() == t.lower() for x in tags)
	if an and not vorhanden:
		tags.append(t)
	if not an:
		tags = [x for x in tags if x.lower() != t.lower()]
	i.tags = als_json(tags)
	i.save(ignore_permissions=True)
	return tags


# ================================================================ Verwandte Objekte, Kontakt, Kontext


def verwandte(art, o):
	r = {"vorgang": None, "flaeche": None, "projekt": None, "interesse": None}
	if not o:
		return r
	r[art] = o
	if art == "vorgang" and o.get("flaeche_id"):
		r["flaeche"] = objekt_laden("flaeche", o.flaeche_id)
	if art == "flaeche" and o.get("vorgang_id"):
		r["vorgang"] = objekt_laden("vorgang", o.vorgang_id)
	if art in ("interesse", "provision") and o.get("projekt_id"):
		r["projekt"] = objekt_laden("projekt", o.projekt_id)
	return r


def besitzer_id(art, o):
	from oekoinvest_app.plattform.kern import besitzer

	return besitzer(art, o)


def kontakt_von(art, o):
	"""CRM-Kontakt mit Bezug, sonst Kontakt aus dem Vorgang bzw. Eigentümerkonto (dict)."""
	if not o:
		return None
	k = frappe.db.get_value("Plattform CRM Bezug", {"parenttype": "Plattform CRM Kontakt", "art": art, "bezug_id": o.name}, "parent")
	if k:
		return frappe.get_doc("Plattform CRM Kontakt", k).as_dict()
	r = verwandte(art, o)
	vg = r["vorgang"]
	if vg and vg.email:
		k = frappe.db.get_value("Plattform CRM Kontakt", {"email": vg.email}, "name")
		if k:
			return frappe.get_doc("Plattform CRM Kontakt", k).as_dict()
		kt = aus_json(vg.kontakt) or {}
		return frappe._dict({**kt, "email": vg.email})
	uid = besitzer_id(art, o)
	if uid:
		u = frappe.db.get_value("Plattform Konto", uid, ["name", "vorname", "nachname", "email", "firma"], as_dict=True)
		if u:
			return frappe._dict({"vorname": u.vorname, "nachname": u.nachname, "email": u.email, "firma": u.firma, "nutzer_id": u.name})
	return None


def _zahl1(x):
	try:
		return round(float(x) * 10) / 10
	except (TypeError, ValueError):
		return None


def portal_pfad(art, o):
	if not o:
		return "/portal"
	return {"vorgang": f"/portal/anfragen/{o.name}", "flaeche": f"/portal/flaechen/{o.name}", "projekt": f"/portal/projekte/{o.name}", "interesse": f"/portal/boerse/{o.get('projekt_id')}"}.get(art, "/portal")


def admin_pfad(art, o):
	if not o:
		return "/portal/admin"
	return {"vorgang": f"/portal/admin/vorgaenge/{o.name}", "flaeche": f"/portal/flaechen/{o.name}", "projekt": f"/portal/projekte/{o.name}", "interesse": f"/portal/admin/interessen?id={o.name}", "provision": "/portal/admin/deals"}.get(art, "/portal/admin")


def objekt_titel(art, o):
	if not o:
		return ""
	if art == "vorgang":
		kt = aus_json(o.kontakt) or {}
		return f"{VORGANG_TYPEN.get(o.typ, 'Anfrage')} · {' '.join(x for x in (kt.get('vorname'), kt.get('nachname')) if x)}"
	if art == "flaeche":
		return o.bezeichnung or o.name
	if art == "projekt":
		return o.titel or o.name
	if art == "interesse":
		return f"Interesse {name_von(o.investor_id)} · {frappe.db.get_value('Plattform Projekt', o.projekt_id, 'titel') or o.projekt_id}"
	return o.name


def kontext_fuer(art, o, kontakt=None):
	"""Kontext der Vorlagen-Platzhalter (siehe PLATZHALTER in src/lib/plattform/vorlagen.js) – nie vertrauliche Felder."""
	from oekoinvest_app.plattform.mail import basis_url
	from oekoinvest_app.plattform.prozesse import status_label
	from oekoinvest_app.plattform.konstanten import PHASEN

	r = verwandte(art, o) if o else {"vorgang": None, "flaeche": None, "projekt": None}
	k = kontakt or (kontakt_von(art, o) if o else None) or {}
	zid = (o.get("zustaendig_id") if o else None) or (r["flaeche"] and r["flaeche"].get("zustaendig_id")) or (r["vorgang"] and r["vorgang"].get("zustaendig_id"))
	z = frappe.db.get_value("Plattform Konto", zid, ["vorname", "nachname"], as_dict=True) if zid else None
	anrede = k.get("anrede") if k.get("anrede") in ("Frau", "Herr") else ""
	name = " ".join(x for x in (k.get("vorname"), k.get("nachname")) if x)
	brief = f"Sehr geehrte Frau {k.get('nachname') or ''}".strip() if anrede == "Frau" else f"Sehr geehrter Herr {k.get('nachname') or ''}".strip() if anrede == "Herr" else f"Guten Tag {name}".strip()
	f = r["flaeche"]
	p = r["projekt"]
	fs = flaechen_score(f) if f else None
	return {
		"anrede": anrede,
		"briefanrede": brief,
		"vorname": k.get("vorname") or "",
		"nachname": k.get("nachname") or "",
		"firma": k.get("firma") or "",
		"email": k.get("email") or "",
		"ort": k.get("ort") or (f.ort if f else "") or "",
		"vorgang": {"id": r["vorgang"].name, "typ": VORGANG_TYPEN.get(r["vorgang"].typ, ""), "status": status_label("vorgang", r["vorgang"].status)} if r["vorgang"] else None,
		"flaeche": {"bezeichnung": f.bezeichnung, "ha": _zahl1(f.ha), "ort": f.ort, "bundesland": f.bundesland, "score": fs["score"], "mwp": fs["mwp"], "status": status_label("flaeche", f.status)} if f else None,
		"projekt": {"titel": p.titel, "mwp": _zahl1(p.mwp), "phase": next((x.get("label") or x.get("kurz") for x in PHASEN if x["id"] == p.phase), p.phase), "land": LAENDER.get(p.land, p.land), "status": status_label("projekt", p.status), "typ": PROJEKT_TYPEN.get(p.typ)} if p else None,
		"zustaendig": {"name": " ".join(x for x in (z.vorname, z.nachname) if x), "vorname": z.vorname} if z else {"name": "Ihr ÖkoInvest-Team", "vorname": ""},
		"portal": {"link": f"{basis_url() or ''}{portal_pfad(art, o)}"},
		"heute": now_datetime().strftime("%d.%m.%Y"),
	}


PLATZHALTER = {
	"anrede", "briefanrede", "vorname", "nachname", "firma", "email", "ort", "vorgang.id", "vorgang.typ", "vorgang.status", "flaeche.bezeichnung", "flaeche.ha",
	"flaeche.ort", "flaeche.bundesland", "flaeche.score", "flaeche.mwp", "flaeche.status", "projekt.titel", "projekt.mwp", "projekt.phase", "projekt.land",
	"projekt.status", "zustaendig.name", "zustaendig.vorname", "portal.link", "heute",
}
MUSTER = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_.]{0,60})\s*\}\}")


def rendern(vorlage_text, kontext):
	unbekannt, leer = set(), set()

	def ersetzen(m):
		k = m.group(1)
		if k not in PLATZHALTER:
			unbekannt.add(k)
			return ""
		wert = kontext
		for t in k.split("."):
			wert = wert.get(t) if isinstance(wert, dict) else None
		if wert is None or wert == "":
			leer.add(k)
			return ""
		if isinstance(wert, float):
			return f"{wert:.1f}".replace(".", ",").replace(",0", "") if wert != int(wert) else str(int(wert))
		return str(wert)

	text = MUSTER.sub(ersetzen, str(vorlage_text or ""))
	return {"text": re.sub(r"\n{3,}", "\n\n", text), "unbekannt": sorted(unbekannt), "leer": sorted(leer)}


# ================================================================ Scoring, SLA, Gebiete

REGION_DE = {
	"de-nord": ["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"],
	"de-ost": ["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"],
	"de-west": ["Nordrhein-Westfalen", "Hessen", "Rheinland-Pfalz", "Saarland"],
	"de-sued": ["Bayern", "Baden-Württemberg"],
}


def flaechen_score(f, zusatz=None):
	"""Vereinfachte, gleichgerichtete Portierung des Flächenchecks (Größe, Nutzung, Besonderheiten, Netz, Eigentum).

	Maßgeblich für die Anzeige ist die Website (src/lib/plattform/akquise.js → flaechencheck.js); diese Funktion
	liefert denselben Wertebereich für Bedingungen (score) und Platzhalter in Frappe."""
	zusatz = zusatz if zusatz is not None else info_json("flaeche", f.name)
	ha = float(f.ha or 0)
	punkte, deckel = 50, 100
	if ha < 1:
		punkte -= 30
		deckel = 35
	elif ha < 3:
		punkte -= 10
	elif ha < 5:
		punkte += 5
	elif ha <= 100:
		punkte += 20 if ha >= 20 else 15
	else:
		punkte += 12
	punkte += {"acker": 5, "gruenland": 0, "konversion": 15, "gewerbe": 0, "sonstige": 0}.get(f.nutzung, 0)
	bes = zusatz.get("besonderheiten") or []
	if "randstreifen" in bes:
		punkte += 15
	if "benachteiligt" in bes and (f.land or "DE") == "DE":
		punkte += 8
	if "schutzgebiet" in bes:
		punkte -= 30
		deckel = min(deckel, 45)
	if "wald" in bes:
		punkte -= 8
	if "hang" in bes:
		punkte -= 10
	if "ueberschwemmung" in bes:
		punkte -= 20
		deckel = min(deckel, 55)
	punkte += {"lt1": 15, "1-3": 5, "3-5": 5, "5-10": -8, "gt10": -20}.get(zusatz.get("netz"), 0)
	punkte += {"eigentum": 5, "miteigentum": 0, "verwaltung": 0}.get(f.eigentum, 0)
	score = int(round(max(0, min(min(punkte, deckel), 100))))
	if ha <= 0:
		score = min(score, 30)
	return {"score": score, "ampel": "gruen" if score >= 65 else "gelb" if score >= 40 else "rot", "mwp": round(ha / HA_JE_MWP * 10) / 10 if ha > 0 else 0}


def prioritaet_auto(score, ha):
	if score >= 65 and float(ha or 0) >= 5:
		return "A"
	return "B" if score >= 45 else "C"


def werktage_spaeter(dt, werktage=2):
	d = get_datetime(dt)
	while d.weekday() >= 5:
		d = (d + timedelta(days=1)).replace(hour=7, minute=0, second=0, microsecond=0)
	rest = werktage
	while rest > 0:
		d = d + timedelta(days=1)
		if d.weekday() < 5:
			rest -= 1
	return d


def sla_status(eingang, erstkontakt, jetzt_=None):
	if not eingang:
		return {"ampel": "grau", "status": "unbekannt", "fristBis": None, "text": "Kein Eingang"}
	jetzt_ = jetzt_ or now_datetime()
	frist = werktage_spaeter(eingang)
	std = lambda a, b: max(0, round((get_datetime(b) - get_datetime(a)).total_seconds() / 3600))  # noqa: E731
	if erstkontakt:
		if get_datetime(erstkontakt) <= frist:
			return {"ampel": "gruen", "status": "erledigt", "fristBis": iso(frist), "text": f"Erstkontakt nach {std(eingang, erstkontakt)} h"}
		return {"ampel": "gelb", "status": "verspaetet", "fristBis": iso(frist), "text": f"Erstkontakt verspätet ({std(frist, erstkontakt)} h nach Frist)"}
	if jetzt_ > frist:
		return {"ampel": "rot", "status": "ueberfaellig", "fristBis": iso(frist), "text": f"Erstkontakt überfällig seit {std(frist, jetzt_)} h"}
	if (frist - jetzt_).total_seconds() < 24 * 3600:
		return {"ampel": "gelb", "status": "faellig", "fristBis": iso(frist), "text": f"Erstkontakt fällig in {std(jetzt_, frist)} h"}
	return {"ampel": "gruen", "status": "offen", "fristBis": iso(frist), "text": f"Frist läuft ({std(jetzt_, frist)} h)"}


def eingang_am(art, o):
	if art == "flaeche" and o.get("vorgang_id"):
		return frappe.db.get_value("Plattform Vorgang", o.vorgang_id, "creation") or o.creation
	return o.creation


def erstkontakt_am(art, o, eingang):
	r = verwandte(art, o)
	ids = [x.name for x in (r["vorgang"], r["flaeche"]) if x]
	zeiten = []
	if ids:
		zeiten += frappe.get_all("Plattform CRM Aktivitaet", filters={"bezug_id": ("in", ids), "typ": ("in", ["anruf", "email", "termin"])}, pluck="am")
		zeiten += frappe.get_all("Plattform Nachricht", filters={"bezug_id": ("in", ids), "von_admin": 1, "system": 0}, pluck="am")
		for x in (r["vorgang"], r["flaeche"]):
			if x:
				zeiten += [e.am for e in (x.get("status_verlauf") or []) if e.von_rolle == "admin" and e.status not in ("eingegangen", "entwurf")]
	ab = get_datetime(eingang) - timedelta(minutes=1)
	gueltig = sorted(get_datetime(t) for t in zeiten if t and get_datetime(t) >= ab)
	return gueltig[0] if gueltig else None


def _plz_passt(plz, muster):
	p = re.sub(r"\D", "", str(plz or ""))
	m = str(muster or "").replace(" ", "")
	if not p or not m:
		return False
	b = re.match(r"^(\d{1,5})-(\d{1,5})$", m)
	if b:
		von, bis = b.group(1), b.group(2)
		n = max(len(von), len(bis))
		return len(p) >= n and int(von.ljust(n, "0")) <= int(p[:n]) <= int(bis.ljust(n, "9"))
	return bool(re.match(r"^\d{1,5}$", m)) and p.startswith(m)


def gebiet_fuer(land, bundesland, plz):
	best = None
	for g in frappe.get_all("Plattform Gebiet", filters={"aktiv": 1}, fields=["name", "bezeichnung", "land", "plz", "bundeslaender", "mitarbeiter_id"], order_by="reihenfolge asc"):
		if g.land and land and g.land != land:
			continue
		plz_liste = aus_json(g.plz) or []
		bl = aus_json(g.bundeslaender) or []
		punkte, grund = 0, ""
		if any(_plz_passt(plz, x) for x in plz_liste):
			punkte, grund = 3, f"PLZ {plz}"
		elif bundesland and bundesland in bl:
			punkte, grund = 2, bundesland
		elif g.land and g.land == land and not plz_liste and not bl:
			punkte, grund = 1, f"Land {land}"
		if punkte and (not best or punkte > best["punkte"]):
			best = {"gebiet": g, "punkte": punkte, "grund": grund}
	return best


def fakten_fuer(art, o, extra=None):
	r = verwandte(art, o)
	f, vg, p = r["flaeche"], r["vorgang"], r["projekt"]
	d = aus_json(vg.daten) if vg else {}
	d = d or {}
	ha = float(f.ha) if f and f.ha else (v.zahl(d.get("ha") or d.get("hektar") or d.get("flaecheHa"), min=0) if vg else None)
	kontakt = aus_json(vg.kontakt) if vg else {}
	kontakt = kontakt or {}
	herkunft = (aus_json(vg.herkunft) if vg else {}) or {}
	tags = set(info_json(art, o.name)["tags"])
	if f and art != "flaeche":
		tags |= set(info_json("flaeche", f.name)["tags"])
	if vg and art != "vorgang":
		tags |= set(info_json("vorgang", vg.name)["tags"])
	out = {
		"typ": p.typ if art in ("projekt", "interesse") and p else (vg.typ if vg else ("agri" if f and f.agri else "flaeche" if f else None)),
		"land": (p and p.land) or (f and f.land) or kontakt.get("land"),
		"bundesland": (p and p.bundesland) or (f and f.bundesland) or d.get("bundesland"),
		"plz": (f and f.plz) or kontakt.get("plz"),
		"mwp": float(p.mwp) if p and p.mwp else (round(ha / HA_JE_MWP * 10) / 10 if ha else None),
		"ha": ha,
		"score": flaechen_score(f)["score"] if f else None,
		"kanal": herkunft.get("kanal") or herkunft.get("utm_source"),
		"status": o.status,
		"kategorie": None,
		"tags": sorted(tags),
	}
	out.update(extra or {})
	return out


# ================================================================ Regeln: Bereinigung und Auswertung


def regel_bereinigen(roh):
	"""Wie regelBereinigen in src/lib/plattform/automation.js. Liefert {"regel": …} oder {"fehler": …}."""
	from oekoinvest_app.plattform.prozesse import PROZESSE

	roh = roh if isinstance(roh, dict) else {}
	name = v.text(roh.get("name"), 120)
	if len(name) < 3:
		return {"fehler": "Bitte einen Namen (mind. 3 Zeichen) angeben."}
	a = roh.get("ausloeser") if isinstance(roh.get("ausloeser"), dict) else {}
	typ = a.get("typ") if a.get("typ") in AUSLOESER else None
	if not typ:
		return {"fehler": "Bitte einen Auslöser wählen."}
	aus = {"typ": typ}
	if typ == "vorgang_neu":
		aus["art"] = "vorgang"
	elif typ == "suchprofil":
		aus["art"] = "projekt"
	else:
		art = a.get("art") if a.get("art") in ARTEN else ("" if typ == "dokument" else None)
		if art is None:
			return {"fehler": "Bitte die Objektart wählen."}
		if art:
			aus["art"] = art
	status = PROZESSE.get(aus.get("art") or "vorgang", {}).get("status", {})
	if typ == "status":
		for k in ("von", "nach"):
			if a.get(k):
				if a[k] not in status:
					return {"fehler": "Unbekannter Status."}
				aus[k] = a[k]
	if typ == "frist":
		if a.get("frist") not in FRISTEN:
			return {"fehler": "Bitte die Frist wählen."}
		aus["frist"] = a["frist"]
		if a["frist"] == "status_dauer":
			if a.get("status") not in status:
				return {"fehler": "Zu lange im Status: Status wählen."}
			aus["status"] = a["status"]
			aus["tage"] = max(1, min(365, cint(a.get("tage")) or 14))
	bedingungen = []
	for b in (roh.get("bedingungen") or [])[:10]:
		if not isinstance(b, dict) or b.get("feld") not in FELDER or b.get("op") not in OPERATOREN:
			continue
		if b["op"] in ("min", "max"):
			z = v.zahl(b.get("wert"))
			if z is not None:
				bedingungen.append({"feld": b["feld"], "op": b["op"], "wert": z})
		elif b["op"] == "in":
			liste = [v.text(x, 60) for x in (b.get("wert") if isinstance(b.get("wert"), list) else str(b.get("wert") or "").split(","))]
			liste = [x for x in liste if x][:30]
			if liste:
				bedingungen.append({"feld": b["feld"], "op": "in", "wert": liste})
		elif v.text(b.get("wert"), 80):
			bedingungen.append({"feld": b["feld"], "op": b["op"], "wert": v.text(b.get("wert"), 80)})
	aktionen = []
	for x in (roh.get("aktionen") or [])[:8]:
		t = (x or {}).get("typ")
		if t not in AKTIONEN:
			return {"fehler": "Unbekannte Aktion."}
		if t == "zustaendig":
			ziel = "gebiet" if x.get("mitarbeiterId") == "gebiet" else v.kennung(x.get("mitarbeiterId"))
			if not ziel:
				return {"fehler": "Zuständigen setzen: Person oder „nach Gebiet“ wählen."}
			aktionen.append({"typ": t, "mitarbeiterId": ziel})
		elif t == "aufgabe":
			titel = v.text(x.get("titel"), 160)
			if len(titel) < 3:
				return {"fehler": "Aufgabe: Titel mit mind. 3 Zeichen."}
			z = x.get("zustaendig") if x.get("zustaendig") in ("zustaendig", "gebiet") else (v.kennung(x.get("zustaendig")) or "zustaendig")
			aktionen.append({"typ": t, "titel": titel, "faelligInTagen": max(0, min(60, cint(x.get("faelligInTagen")))), "zustaendig": z, "beschreibung": v.mehrzeilig(x.get("beschreibung"), 1000)})
		elif t in ("mail", "nachricht"):
			vid = v.kennung(x.get("vorlageId"))
			if not vid:
				return {"fehler": "Bitte eine Vorlage wählen."}
			aktionen.append({"typ": t, "vorlageId": vid, **({"an": "zustaendig" if x.get("an") == "zustaendig" else "kontakt"} if t == "mail" else {})})
		elif t == "tag":
			tag = v.text(x.get("tag"), 40)
			if len(tag) < 2:
				return {"fehler": "Tag: mind. 2 Zeichen."}
			aktionen.append({"typ": t, "tag": tag})
		elif t == "status":
			if x.get("nach") not in status:
				return {"fehler": "Status setzen: Zielstatus passt nicht zur Objektart."}
			aktionen.append({"typ": t, "nach": x["nach"], "kommentar": v.mehrzeilig(x.get("kommentar"), 500)})
		elif t == "prioritaet":
			if x.get("wert") not in PRIORITAETEN or aus.get("art") not in ("flaeche", "vorgang"):
				return {"fehler": "Priorität A, B oder C – nur für Flächen bzw. Flächen-Anfragen."}
			aktionen.append({"typ": t, "wert": x["wert"]})
	if not aktionen:
		return {"fehler": "Bitte mindestens eine Aktion festlegen."}
	return {"regel": {"name": name, "aktiv": roh.get("aktiv") is not False, "beschreibung": v.mehrzeilig(roh.get("beschreibung"), 500), "ausloeser": aus, "bedingungen": bedingungen, "aktionen": aktionen}}


def _norm(x):
	return str("" if x is None else x).strip().lower()


def bedingung_erfuellt(b, fakten):
	if b["feld"] == "tag":
		tags = [_norm(t) for t in fakten.get("tags") or []]
		if b["op"] == "ungleich":
			return _norm(b["wert"]) not in tags
		if b["op"] == "in":
			return any(_norm(x) in tags for x in b["wert"])
		return _norm(b["wert"]) in tags
	f = fakten.get(b["feld"])
	op = b["op"]
	if op == "gleich":
		return _norm(f) == _norm(b["wert"])
	if op == "ungleich":
		return _norm(f) != _norm(b["wert"])
	if op == "in":
		return _norm(f) in [_norm(x) for x in b["wert"]]
	if op in ("min", "max"):
		try:
			z = float(f)
		except (TypeError, ValueError):
			return False
		return z >= b["wert"] if op == "min" else z <= b["wert"]
	if op == "enthaelt":
		return _norm(b["wert"]) in _norm(f)
	if op == "beginnt":
		return _norm(f).startswith(_norm(b["wert"]))
	return False


def ausloeser_passt(regel, e):
	a = regel["ausloeser"]
	if a.get("typ") != e.get("typ"):
		return False
	if a.get("art") and e.get("art") and a["art"] != e["art"]:
		return False
	if a["typ"] == "status" and ((a.get("nach") and a["nach"] != e.get("nach")) or (a.get("von") and a["von"] != e.get("von"))):
		return False
	if a["typ"] == "frist" and a.get("frist") != e.get("frist"):
		return False
	return True


def regel_dict(doc):
	return {
		"id": doc.name,
		"name": doc.bezeichnung,
		"aktiv": bool(cint(doc.aktiv)),
		"beschreibung": doc.beschreibung or "",
		"ausloeser": aus_json(doc.ausloeser) or {},
		"bedingungen": aus_json(doc.bedingungen) or [],
		"aktionen": aus_json(doc.aktionen) or [],
		"erstelltVon": doc.erstellt_von,
	}


# ================================================================ Motor

_KETTE = {"aktiv": None}
AUTOMAT = frappe._dict(id=None, rollen=["admin"], vorname="Automation", nachname="")


def _lauf(e):
	frappe.get_doc({"doctype": "Plattform Automation Lauf", "am": jetzt(), **e}).insert(ignore_permissions=True)


def _aktive_backoffice(konto_id):
	if not konto_id or not cint(frappe.db.get_value("Plattform Konto", konto_id, "aktiv")):
		return False
	return bool(frappe.db.exists("Plattform Konto Rolle", {"parent": konto_id, "parenttype": "Plattform Konto", "rolle": "admin"}))


def _zustaendig_aufloesen(regel, art, o, wunsch):
	from oekoinvest_app.plattform.rechte import stufe
	from oekoinvest_app.plattform.kern import konto_json

	fk = fakten_fuer(art, o)
	r = verwandte(art, o)
	if wunsch not in (None, "", "zustaendig", "gebiet") and _aktive_backoffice(wunsch):
		return wunsch, "fest"
	if wunsch == "gebiet":
		g = gebiet_fuer(fk.get("land"), fk.get("bundesland"), fk.get("plz"))
		if g and _aktive_backoffice(g["gebiet"].mitarbeiter_id):
			return g["gebiet"].mitarbeiter_id, f"Gebiet „{g['gebiet'].bezeichnung}“ ({g['grund']})"
	vorhanden = o.get("zustaendig_id") or (r["flaeche"] and r["flaeche"].get("zustaendig_id")) or (r["vorgang"] and r["vorgang"].get("zustaendig_id"))
	if vorhanden and _aktive_backoffice(vorhanden):
		return vorhanden, "bisher zuständig"
	if wunsch != "gebiet":
		g = gebiet_fuer(fk.get("land"), fk.get("bundesland"), fk.get("plz"))
		if g and _aktive_backoffice(g["gebiet"].mitarbeiter_id):
			return g["gebiet"].mitarbeiter_id, f"Gebiet „{g['gebiet'].bezeichnung}“"
	if _aktive_backoffice(regel.get("erstelltVon")):
		return regel["erstelltVon"], "Ersteller der Regel"
	for kid in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"):
		if _aktive_backoffice(kid) and stufe(frappe._dict(konto_json(frappe.get_doc("Plattform Konto", kid))), "rechte") >= 2:
			return kid, "Leitung"
	return None, ""


def _aktion(regel, a, e):
	from oekoinvest_app.plattform import benachrichtigung
	from oekoinvest_app.plattform.ablauf import uebergang_anwenden
	from oekoinvest_app.plattform.kern import nachricht_anlegen
	from oekoinvest_app.plattform.prozesse import pruefe_uebergang, status_label

	art, o = e["art"], e["objekt"]
	t = a["typ"]
	if t == "zustaendig":
		z, grund = _zustaendig_aufloesen(regel, art, o, a.get("mitarbeiterId"))
		if not z or (a.get("mitarbeiterId") == "gebiet" and not grund.startswith("Gebiet")):
			return {"typ": t, "ok": False, "text": "Kein passendes Gebiet mit aktiver Person gefunden."}
		r = verwandte(art, o)
		for x in [o] + [r["flaeche"] if art == "vorgang" else r["vorgang"] if art == "flaeche" else None]:
			if x:
				frappe.db.set_value(x.doctype, x.name, "zustaendig_id", z)
		protokoll(None, "zuweisen", art, o.name, f"Zuständig: {name_von(z)} (Automation „{regel['name']}“, {grund})")
		return {"typ": t, "ok": True, "text": f"Zuständig: {name_von(z)} – {grund}"}
	if t == "aufgabe":
		z, _ = _zustaendig_aufloesen(regel, art, o, a.get("zustaendig"))
		if not z:
			return {"typ": t, "ok": False, "text": "Keine zuständige Person gefunden."}
		ktx = kontext_fuer(art, o)
		titel = v.text(rendern(a["titel"], ktx)["text"], 160) or a["titel"]
		bezug = art if art in ("vorgang", "flaeche", "projekt", "interesse") else None
		faellig = add_days(nowdate(), a.get("faelligInTagen") or 0)
		auf = frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": titel, "beschreibung": v.mehrzeilig(f"{rendern(a.get('beschreibung') or '', ktx)['text']}\nAutomatisch angelegt durch Regel „{regel['name']}“.".strip(), 2000), "faellig_am": faellig, "zustaendig_id": z, "status": "offen", "bezug_art": bezug, "bezug_id": o.name if bezug else None}).insert(ignore_permissions=True)
		benachrichtigung.anlegen(z, "aufgabe", f"Neue Aufgabe: {titel}", f"Automation „{regel['name']}“", "/portal/admin/aufgaben", bezug, o.name if bezug else auf.name)
		protokoll(None, "aufgabe", bezug or "aufgabe", o.name if bezug else auf.name, f"Aufgabe „{titel}“ angelegt (Automation „{regel['name']}“, zuständig {name_von(z)})")
		return {"typ": t, "ok": True, "text": f"Aufgabe „{titel}“ für {name_von(z)}"}
	if t in ("mail", "nachricht"):
		if not frappe.db.exists("Plattform Vorlage", a["vorlageId"]):
			return {"typ": t, "ok": False, "text": "Vorlage fehlt."}
		vl = frappe.get_doc("Plattform Vorlage", a["vorlageId"])
		if not cint(vl.aktiv):
			return {"typ": t, "ok": False, "text": "Vorlage ist inaktiv."}
		akt = vorlage_aktuell(vl)
		ktx = kontext_fuer(art, o)
		betreff, text = rendern(akt.betreff, ktx), rendern(akt.text, ktx)
		if betreff["unbekannt"] or text["unbekannt"]:
			return {"typ": t, "ok": False, "text": "Unbekannte Platzhalter in der Vorlage."}
		if t == "nachricht":
			nachricht_anlegen(art, o.name, von_admin=True, system=False, text=text["text"])
			protokoll(None, "vorlage_gesendet", art, o.name, f"Nachricht aus Vorlage „{vl.bezeichnung}“ (Automation „{regel['name']}“)")
			return {"typ": t, "ok": True, "text": f"Portal-Nachricht „{vl.bezeichnung}“"}
		if a.get("an") == "zustaendig":
			z, _ = _zustaendig_aufloesen(regel, art, o, "zustaendig")
			an = frappe.db.get_value("Plattform Konto", z, "email") if z else None
		else:
			k = kontakt_von(art, o)
			an = k.get("email") if k else None
		if not an:
			return {"typ": t, "ok": False, "text": "Keine E-Mail-Adresse für den Empfänger."}
		vorlage_mail(an, betreff["text"], text["text"])
		protokoll(None, "vorlage_gesendet", art, o.name, f"E-Mail „{vl.bezeichnung}“ an {an} (Automation „{regel['name']}“)")
		return {"typ": t, "ok": True, "text": f"E-Mail „{betreff['text']}“ an {an}"}
	if t == "tag":
		tag_setzen(art, o.name, a["tag"])
		return {"typ": t, "ok": True, "text": f"Tag „{a['tag']}“ gesetzt"}
	if t == "prioritaet":
		f = o if art == "flaeche" else verwandte(art, o)["flaeche"]
		if not f:
			return {"typ": t, "ok": False, "text": "Keine Fläche am Objekt."}
		i = info("flaeche", f.name, erzeugen=True)
		i.prioritaet = a["wert"]
		i.save(ignore_permissions=True)
		return {"typ": t, "ok": True, "text": f"Priorität {a['wert']}"}
	if t == "status":
		kommentar = a.get("kommentar") or f"Automatisch (Regel „{regel['name']}“)."
		extra = {"kommentar": kommentar, "grund": kommentar}
		if art == "projekt" and a["nach"] == "veroeffentlicht" and o.get("provision_satz"):
			extra["provisionSatz"] = o.provision_satz  # bereits vereinbarter Satz (Reservierung aufheben)
		try:
			u = pruefe_uebergang(art, o.status, a["nach"], "admin", extra, o)
		except Exception as fehler:  # noqa: BLE001 – nicht vorgesehener Übergang → Aktion scheitert, Regel protokolliert
			frappe.clear_last_message()
			return {"typ": t, "ok": False, "text": str(fehler)[:200]}
		von = o.status
		pflicht = (u or {}).get("pflicht") or []
		uebergang_anwenden(AUTOMAT, art, o, a["nach"], "admin", extra if "grund" in pflicht else {k: x for k, x in extra.items() if k != "grund"})
		return {"typ": t, "ok": True, "text": f"Status „{status_label(art, von)}“ → „{status_label(art, a['nach'])}“"}
	return {"typ": t, "ok": False, "text": "Unbekannte Aktion."}


def ausfuehren(e, nur_regeln=None, testlauf=False):
	"""Ereignis e = {typ, art, objekt (Dokument), von?, nach?, frist?, extra?} verarbeiten."""
	o = e.get("objekt")
	if not o:
		return []
	regeln = nur_regeln if nur_regeln is not None else [regel_dict(frappe.get_doc("Plattform Automation Regel", n)) for n in frappe.get_all("Plattform Automation Regel", filters={"aktiv": 1}, pluck="name")]
	kandidaten = [r for r in regeln if ausloeser_passt(r, e)]
	if not kandidaten:
		return []
	aussen = _KETTE["aktiv"] is None
	if aussen:
		_KETTE["aktiv"] = {"id": neue_id("Plattform Automation Lauf"), "tiefe": 0, "gefeuert": set(), "testlauf": testlauf}
	k = _KETTE["aktiv"]
	k["tiefe"] += 1
	ergebnisse = []
	try:
		for regel in kandidaten:
			basis = {"regel_id": regel["id"] if not str(regel["id"]).startswith("R-TEST") else None, "regel_name": regel["name"], "ausloeser": e["typ"], "art": e["art"], "objekt_id": o.name, "objekt_titel": objekt_titel(e["art"], o), "tiefe": k["tiefe"], "kette": k["id"], "testlauf": 1 if k["testlauf"] else 0}
			fakten = fakten_fuer(e["art"], o, e.get("extra"))
			pruef = [{"feld": b["feld"], "op": b["op"], "wert": b["wert"], "ist": fakten.get(b["feld"]) if b["feld"] != "tag" else ", ".join(fakten.get("tags") or []), "erfuellt": bedingung_erfuellt(b, fakten)} for b in regel["bedingungen"]]
			if not all(x["erfuellt"] for x in pruef):
				_lauf({**basis, "status": "nicht_erfuellt", "bedingungen": als_json(pruef), "aktionen": "[]"})
				ergebnisse.append({**basis, "status": "nicht_erfuellt", "bedingungen": pruef})
				continue
			schluessel = f"{regel['id']}|{e['art']}:{o.name}"
			if k["tiefe"] > SCHLEIFE["tiefe"] or schluessel in k["gefeuert"]:
				text = "Regel hat in dieser Ereigniskette an diesem Objekt schon ausgelöst – Schleife verhindert." if schluessel in k["gefeuert"] else f"Maximale Kettentiefe {SCHLEIFE['tiefe']} erreicht – abgebrochen."
				_lauf({**basis, "status": "schleife", "bedingungen": als_json(pruef), "aktionen": "[]", "text": text})
				ergebnisse.append({**basis, "status": "schleife", "text": text})
				continue
			if not k["testlauf"] and basis["regel_id"]:
				zuletzt = frappe.db.count("Plattform Automation Lauf", {"regel_id": regel["id"], "objekt_id": o.name, "status": "ausgefuehrt", "testlauf": 0, "am": (">", now_datetime() - timedelta(hours=1))})
				if zuletzt >= SCHLEIFE["pro_stunde"]:
					_lauf({**basis, "status": "gedrosselt", "bedingungen": als_json(pruef), "aktionen": "[]", "text": f"Mehr als {SCHLEIFE['pro_stunde']} Ausführungen pro Stunde – gedrosselt."})
					continue
			k["gefeuert"].add(schluessel)
			aktionen = []
			for a in regel["aktionen"]:
				try:
					aktionen.append(_aktion(regel, a, e))
				except Exception as fehler:  # noqa: BLE001 – Fehler einer Aktion protokollieren, Kernvorgang nie abbrechen
					frappe.clear_last_message()
					aktionen.append({"typ": a["typ"], "ok": False, "text": str(fehler)[:200]})
			status = "ausgefuehrt" if all(x["ok"] for x in aktionen) else "teilweise"
			_lauf({**basis, "status": status, "bedingungen": als_json(pruef), "aktionen": als_json(aktionen)})
			if not k["testlauf"] and basis["regel_id"]:
				frappe.db.set_value("Plattform Automation Regel", regel["id"], {"ausgefuehrt": cint(frappe.db.get_value("Plattform Automation Regel", regel["id"], "ausgefuehrt")) + 1, "zuletzt": jetzt()}, update_modified=False)
			ergebnisse.append({**basis, "status": status, "aktionen": aktionen, "bedingungen": pruef})
	finally:
		k["tiefe"] -= 1
		if aussen:
			_KETTE["aktiv"] = None
	return ergebnisse


def backoffice_ereignis(typ, art, objekt, **weiter):
	"""Einstieg aus dem Kern. Fehler werden protokolliert und verschluckt (Savepoint), der Kernvorgang läuft weiter."""
	if frappe.flags.in_install or frappe.flags.in_migrate:
		return
	sp = "backoffice_ereignis"
	try:
		frappe.db.savepoint(sp)
		if typ == "vorgang_neu":
			from oekoinvest_app.plattform.api.crm import aus_vorgang

			aus_vorgang(objekt)
		ausfuehren({"typ": typ, "art": art, "objekt": objekt, **weiter})
	except Exception:  # noqa: BLE001
		frappe.db.rollback(save_point=sp)
		frappe.clear_last_message()
		frappe.log_error(title=f"ÖkoInvest Backoffice: Ereignis {typ}", message=frappe.get_traceback())


def fristen_pruefen_intern():
	from oekoinvest_app.plattform.prozesse import status_label  # noqa: F401

	regeln = [regel_dict(frappe.get_doc("Plattform Automation Regel", n)) for n in frappe.get_all("Plattform Automation Regel", filters={"aktiv": 1}, pluck="name")]
	regeln = [r for r in regeln if r["ausloeser"].get("typ") == "frist"]
	anzahl = 0
	for regel in regeln:
		a = regel["ausloeser"]
		art = a.get("art") or "flaeche"
		dt = DOCTYPE[art]
		kandidaten = []
		if a["frist"] == "sla_erstkontakt":
			st = ["eingegangen"] if art == "vorgang" else ["eingegangen", "vorpruefung"]
			for n in frappe.get_all(dt, filters={"status": ("in", st), "creation": (">", add_days(now_datetime(), -90))}, pluck="name"):
				o = frappe.get_doc(dt, n)
				ein = eingang_am(art, o)
				if sla_status(ein, erstkontakt_am(art, o, ein))["status"] == "ueberfaellig":
					kandidaten.append((o, ""))
		elif a["frist"] == "status_dauer":
			for n in frappe.get_all(dt, filters={"status": a["status"]}, pluck="name"):
				o = frappe.get_doc(dt, n)
				seit = max([e.am for e in (o.get("status_verlauf") or []) if e.status == o.status] or [o.creation])
				if (now_datetime() - get_datetime(seit)).days >= a["tage"]:
					kandidaten.append((o, f"|{iso(seit)}"))
		elif a["frist"] == "aufgabe_ueberfaellig":
			for t in frappe.get_all("Plattform Aufgabe", filters={"status": "offen", "faellig_am": ("<", nowdate()), "bezug_art": art}, fields=["name", "bezug_id"]):
				o = objekt_laden(art, t.bezug_id)
				if o:
					kandidaten.append((o, f"|{t.name}"))
		for o, zusatz in kandidaten:
			i = info(art, o.name, erzeugen=True)
			fr = aus_json(i.fristen) or {}
			sch = f"{regel['id']}{zusatz}"
			if sch in fr:
				continue
			fr[sch] = jetzt_iso()
			i.fristen = als_json(fr)
			i.save(ignore_permissions=True)
			ausfuehren({"typ": "frist", "frist": a["frist"], "art": art, "objekt": o}, nur_regeln=[regel])
			anzahl += 1
	return anzahl


def fristen_taeglich():
	"""Scheduler (hooks.py, täglich): Regeln „Frist überschritten“ auslösen."""
	fristen_pruefen_intern()
	frappe.db.commit()


# ================================================================ Vorlagen & Postausgang


def vorlage_aktuell(vl):
	return next((x for x in vl.versionen if cint(x.version) == cint(vl.version)), vl.versionen[-1] if vl.versionen else frappe._dict(betreff="", text=""))


def vorlage_mail(an, betreff, text):
	"""Vorlagen-Mail über die Email Queue (Text, kein HTML)."""
	try:
		frappe.sendmail(recipients=[an], subject=betreff, message=frappe.utils.escape_html(text).replace("\n", "<br>"), now=False, delayed=True, add_unsubscribe_link=0)
		return True
	except Exception:  # noqa: BLE001
		frappe.clear_last_message()
		frappe.log_error(title="ÖkoInvest Backoffice: Vorlagen-Mail nicht in der Warteschlange", message=betreff)
		return False
