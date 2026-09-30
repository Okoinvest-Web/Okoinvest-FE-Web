# Copyright (c) 2026, ÖkoInvest GmbH
#
# Anlagen & Monitoring (docs/API.md, Abschnitt 10; Architektur docs/ANLAGEN-IOT.md) – Referenz:
# src/lib/plattform/backend/demo/anlagen.js. Stammdaten und Prozesse: Anlage, Komponenten, Messpunkte, Gerätezugänge
# (MQTT), Störungsfälle, Wartungen, Contracting-Vertrag, Zählerstand-Monatswerte. Zeitreihen liegen NICHT hier,
# sondern im Ingest-Dienst (TimescaleDB).
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Backoffice  – Rolle admin mit Bereich „anlagen“ (rechte.py): lesen ≥ 1 sieht alle Anlagen, schreiben = 2 pflegt
#                 Stammdaten, Geräte und bearbeitet Störungen (Unterrollen leitung, betrieb)
#   Kunde       – Konto `kunde_id` der Anlage oder Mitglied der Organisation `organisation_id` (jede Teamrolle liest);
#                 kommentiert Störungen als Kundenkonto bzw. ab Teamrolle „Mitglied“. Nie Gerätezugänge, nie interne Kommentare.
#   Ingest-Dienst – eigener API-Benutzer NUR mit Rolle „ÖkoInvest Anlagen-Dienst“: ausschließlich dienst_*-Methoden.

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.anlagen_kern import (
	ANLAGE_STATUS, ANLAGE_TYPEN, KOMPONENTEN_ARTEN, LASTPROFILE, MAX_ZUGAENGE_JE_ANLAGE, MESSPUNKT_ARTEN, MESSSTELLEN, REGISTER_LABEL,
	STOERUNG_OFFEN, STOERUNG_REGELN, STOERUNG_SCHWERE, STOERUNG_STATUS, WARTUNG_ARTEN, WARTUNG_STATUS, fingerabdruck, geraet_passwort,
	mqtt_benutzer, passwort_hash, prioritaet, region_fuer, topic_basis,
)
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import (
	als_json, aus_json, ist_admin, iso, jetzt, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten,
)
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, LAENDER, ROLLE_ANLAGEN_DIENST
from oekoinvest_app.plattform.organisation import darf_team_schreiben, team_rolle
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Anlage"

# Eigentum & Betrieb (Fachprüfung Kapitalseite): Anlage im Eigentum von ÖkoInvest bzw. einer Projektgesellschaft (SPV),
# ÖkoInvest verkauft den Strom an den Kunden (Stromabnehmer). Gleiche Werte wie src/lib/plattform/anlagen.js.
BETRIEBSFUEHRER_STANDARD = "ÖkoInvest GmbH"
DIENSTBARKEIT_STATUS = {"nicht_erforderlich": "Nicht erforderlich", "vorbereitung": "In Vorbereitung", "beantragt": "Beim Grundbuch beantragt", "eingetragen": "Im Grundbuch eingetragen"}
INDEX_BASIS = ["fest", "prozent", "vpi", "strompreis"]
ENDSCHAFT = ["kaufoption", "uebergang", "verlaengerung", "rueckbau"]


# ================================================================ Rechte


def bo_lesen(n):
	return ist_admin(n) and stufe(n, "anlagen") >= 1


def bo_schreiben(n):
	return ist_admin(n) and stufe(n, "anlagen") >= 2


def schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Betrieb).")


def lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_lesen(n):
		verboten("Nur für das Backoffice (Betrieb).")


def zugriff(n, a):
	"""backoffice | kunde | team-schreiben | team-lesen | None"""
	if not n or not a:
		return None
	if bo_lesen(n):
		return "backoffice"
	if a.kunde_id and a.kunde_id == n.id:
		return "kunde"
	r = team_rolle(n.id, a.organisation_id) if a.organisation_id else None
	if r:
		return "team-schreiben" if darf_team_schreiben(r) else "team-lesen"
	return None


def anlage_laden(n, kennung):
	if not n:
		nicht_angemeldet()
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT, k):
		nicht_gefunden("Anlage nicht gefunden.")
	a = frappe.get_doc(DT, k)
	if not zugriff(n, a):
		verboten("Diese Anlage gehört nicht zu Ihrem Konto.")
	return a


def dienst_pruefen():
	"""Nur der technische Benutzer des Ingest-Dienstes (Rolle „ÖkoInvest Anlagen-Dienst“)."""
	if frappe.session.user == "Guest" or ROLLE_ANLAGEN_DIENST not in frappe.get_roles(frappe.session.user):
		frappe.throw("Nicht berechtigt.", frappe.PermissionError)


# ================================================================ Ausgabe (camelCase wie das Demo-Backend)


def _org_name(org_id):
	return (frappe.db.get_value("Plattform Organisation", org_id, "titel") or "") if org_id else ""


def _vertrag(anlage_id):
	name = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": anlage_id}, "name")
	return frappe.get_doc("Plattform Contracting Vertrag", name) if name else None


def vertrag_json(c):
	if not c:
		return None
	beginn = str(c.beginn or "")
	ende = f"{int(beginn[:4]) + cint(c.laufzeit_jahre)}{beginn[4:]}" if beginn else ""
	return {
		"id": c.name, "anlageId": c.anlage_id, "nummer": c.nummer or "", "beginn": beginn, "laufzeitJahre": cint(c.laufzeit_jahre), "ende": ende,
		"strompreisCt": flt(c.strompreis_ct), "grundgebuehrMonat": flt(c.grundgebuehr_monat), "indexierungPct": flt(c.indexierung_pct),
		"kuendigungsfristMonate": cint(c.kuendigungsfrist_monate), "status": c.status, "bemerkung": c.bemerkung or "",
		# Vertragsdetails: Preisgleitung, Mindestabnahme (Take-or-Pay), Endschaft/Kaufoption
		"indexBasis": c.get("index_basis") or "fest", "mindestabnahmeKwhJahr": flt(c.get("mindestabnahme_kwh_jahr")) or None,
		"endschaft": c.get("endschaft") or "", "kaufoptionEur": flt(c.get("kaufoption_eur")) or None, "endschaftText": c.get("endschaft_text") or "",
	}


def zugang_json(z):
	return {
		"id": z.name, "anlageId": z.anlage_id, "bezeichnung": z.bezeichnung or "", "benutzer": z.benutzer, "topic": z.topic,
		"status": "gesperrt" if cint(z.gesperrt) else "verbunden" if cint(z.verbunden) else "wartet",
		"gesperrt": bool(cint(z.gesperrt)), "erstelltAm": iso(z.creation), "letzteVerbindung": iso(z.letzte_verbindung), "letzteNachricht": iso(z.letzte_nachricht),
		# nur Fingerabdruck – weder Passwort noch Hash verlassen Frappe
		"hash": {"algorithmus": str(z.passwort_hash or "").split("$")[0] or "scrypt", "fingerabdruck": fingerabdruck(z.passwort_hash)},
	}


def stoerung_json(n, s, zg, anlage=None):
	bo = zg == "backoffice"
	a = anlage or frappe.db.get_value(DT, s.anlage_id, ["name", "titel", "typ", "ort"], as_dict=True)
	alter_h = (now_datetime() - get_datetime(s.erkannt_am or s.creation)).total_seconds() / 3600
	offen = s.status in STOERUNG_OFFEN
	kommentare = [k for k in (aus_json(s.kommentare, []) or []) if bo or not k.get("intern")]
	return {
		"id": s.name, "anlageId": s.anlage_id, "anlage": {"id": a.name, "name": a.titel, "typ": a.typ, "ort": a.ort or ""} if a else None,
		"regel": s.regel, "regelLabel": STOERUNG_REGELN.get(s.regel, (s.regel,))[0], "schwere": s.schwere, "schwereLabel": STOERUNG_SCHWERE.get(s.schwere, (s.schwere,))[0],
		"titel": s.titel, "text": s.text or "", "status": s.status, "statusLabel": STOERUNG_STATUS.get(s.status, s.status),
		"erkanntAm": iso(s.erkannt_am), "zuletztAm": iso(s.zuletzt_am or s.erkannt_am), "anzahl": cint(s.anzahl) or 1, "behobenAm": iso(s.behoben_am),
		"quittiert": bool(s.quittiert_am), "quittiertAm": iso(s.quittiert_am), "quittiertVon": name_von(s.quittiert_von) if s.quittiert_von else None,
		"zustaendig": {"id": s.zustaendig_id, "name": name_von(s.zustaendig_id)} if s.zustaendig_id else None,
		"prioritaet": prioritaet(s.schwere, alter_h, bool(s.quittiert_am), offen),
		"kommentare": [{"id": k.get("id"), "vonName": "ÖkoInvest Betrieb" if k.get("backoffice") and not bo else k.get("vonName"), "backoffice": bool(k.get("backoffice")), "am": k.get("am"), "text": k.get("text"), "intern": bool(k.get("intern"))} for k in kommentare],
		"verlauf": (aus_json(s.verlauf, []) or []) if bo else None,
		"darfKommentieren": bo_schreiben(n) if bo else zg in ("kunde", "team-schreiben"),
		"darfBearbeiten": bo_schreiben(n),
	}


def anlage_json(n, a, detail=False):
	zg = zugriff(n, a)
	bo = zg == "backoffice"
	offen = frappe.get_all("Plattform Stoerungsfall", filters={"anlage_id": a.name, "status": ["in", STOERUNG_OFFEN]}, fields=["name", "schwere", "status", "titel", "regel"], limit_page_length=0)
	c = _vertrag(a.name)
	kunde = frappe.db.get_value("Plattform Konto", a.kunde_id, ["name", "vorname", "nachname", "firma", "email"], as_dict=True) if a.kunde_id else None
	out = {
		"id": a.name, "name": a.titel, "typ": a.typ, "typLabel": ANLAGE_TYPEN.get(a.typ, a.typ), "status": a.status, "statusLabel": ANLAGE_STATUS.get(a.status, a.status),
		"land": a.land, "bundesland": a.bundesland, "ort": a.ort or "", "regionId": a.region_id or region_fuer(a.land, a.bundesland),
		"kwp": flt(a.kwp), "speicherKwh": flt(a.speicher_kwh), "speicherKw": flt(a.speicher_kw), "inbetriebnahme": str(a.inbetriebnahme or ""),
		"lastprofil": a.lastprofil, "lastJahrKwh": flt(a.last_jahr_kwh), "wechselrichterAnzahl": cint(a.wechselrichter_anzahl) or 1, "beschreibung": a.beschreibung or "",
		"simulation": None,
		"kunde": {"id": kunde.name, "name": " ".join(x for x in (kunde.vorname, kunde.nachname) if x), "firma": kunde.firma or "", "email": kunde.email} if kunde else None,
		"organisation": {"id": a.organisation_id, "name": _org_name(a.organisation_id)} if a.organisation_id else None,
		# Eigentum & Betrieb – Kunde ist Stromabnehmer, nicht Eigentümer
		"eigentuemer": a.get("eigentuemer") or "", "eigentuemerId": a.get("eigentuemer_id") or None, "betriebsfuehrer": a.get("betriebsfuehrer") or BETRIEBSFUEHRER_STANDARD,
		"dachgeber": (_org_name(a.organisation_id) or (kunde.firma if kunde else "") or "Stromabnehmer") if cint(a.get("dachgeber_ist_kunde")) else (a.get("dachgeber") or ""),
		"dachgeberIstKunde": bool(cint(a.get("dachgeber_ist_kunde"))),
		"dienstbarkeitStatus": a.get("dienstbarkeit_status") or "", "dienstbarkeitStatusLabel": DIENSTBARKEIT_STATUS.get(a.get("dienstbarkeit_status") or "", ""),
		"dienstbarkeitDatum": str(a.get("dienstbarkeit_datum") or ""), "dienstbarkeitDokumentId": a.get("dienstbarkeit_dokument_id") or None, "dienstbarkeitHinweis": a.get("dienstbarkeit_hinweis") or "",
		"finanziertDurch": (a.get("finanziert_durch") or "") if bo else None,
		"offeneStoerungen": [{"id": s.name, "schwere": s.schwere, "status": s.status, "titel": s.titel, "regel": s.regel} for s in offen],
		"vertrag": {"strompreisCt": flt(c.strompreis_ct), "grundgebuehrMonat": flt(c.grundgebuehr_monat), "status": c.status} if c else None,
		"meinZugriff": zg, "darfBearbeiten": bo_schreiben(n), "erstelltAm": iso(a.creation), "geaendertAm": iso(a.modified),
	}
	if not detail:
		return out
	komponenten = frappe.get_all("Plattform Anlagenkomponente", filters={"anlage_id": a.name}, fields=["*"], order_by="creation asc", limit_page_length=0)
	messpunkte = frappe.get_all("Plattform Messpunkt", filters={"anlage_id": a.name}, fields=["*"], order_by="creation asc", limit_page_length=0)
	wartungen = frappe.get_all("Plattform Wartung", filters={"anlage_id": a.name}, fields=["*"], order_by="datum desc", limit_page_length=0)
	stoerungen = frappe.get_all("Plattform Stoerungsfall", filters={"anlage_id": a.name}, fields=["*"], order_by="erkannt_am desc", limit_page_length=500)
	a_kurz = frappe._dict(name=a.name, titel=a.titel, typ=a.typ, ort=a.ort)
	out.update({
		"vertrag": vertrag_json(c),
		# Technische Tiefe nur fürs Backoffice; Kunden sehen nur abrechnungsrelevante Messpunkte
		"komponenten": None if not bo else [{"id": k.name, "anlageId": a.name, "art": k.art, "artLabel": KOMPONENTEN_ARTEN.get(k.art, k.art), "hersteller": k.hersteller or "", "modell": k.modell or "", "seriennummer": k.seriennummer or "", "anzahl": cint(k.anzahl) or 1, "leistungKw": flt(k.leistung_kw) or None, "kapazitaetKwh": flt(k.kapazitaet_kwh) or None, "inbetriebnahme": str(k.inbetriebnahme or ""), "garantieBis": str(k.garantie_bis or ""), "bemerkung": k.bemerkung or ""} for k in komponenten],
		"messpunkte": [{"id": m.name, "anlageId": a.name, "bezeichnung": m.bezeichnung or "", "zaehlernummer": m.zaehlernummer, "art": m.art, "artLabel": MESSPUNKT_ARTEN.get(m.art, (m.art,))[0], "messstelle": m.messstelle, "messstelleLabel": MESSSTELLEN.get(m.messstelle, m.messstelle), "abrechnungsrelevant": bool(cint(m.abrechnungsrelevant)), "smgw": bool(cint(m.smgw)), "msb": m.msb or "", "eichgueltigBis": str(m.eichgueltig_bis or ""), "bemerkung": m.bemerkung or ""} for m in messpunkte if bo or cint(m.abrechnungsrelevant)],
		"wartungen": [{"id": w.name, "anlageId": a.name, "art": w.art, "artLabel": WARTUNG_ARTEN.get(w.art, w.art), "datum": str(w.datum or ""), "status": w.status, "statusLabel": WARTUNG_STATUS.get(w.status, w.status), "dienstleister": w.dienstleister or "", "bericht": w.bericht or "", "naechsteFaelligkeit": str(w.naechste_faelligkeit or ""), **({"kostenEur": flt(w.kosten_eur) or None} if bo else {})} for w in wartungen],
		"stoerungen": [stoerung_json(n, s, zg, a_kurz) for s in stoerungen],
		"geraete": [zugang_json(z) for z in frappe.get_all("Plattform Geraetezugang", filters={"anlage_id": a.name}, fields=["*"], order_by="creation asc", limit_page_length=0)] if bo else None,
		"datenVerbunden": bool(frappe.db.exists("Plattform Geraetezugang", {"anlage_id": a.name, "verbunden": 1, "gesperrt": 0})),
	})
	return out


# ================================================================ Lesen


def _sichtbare_namen(n):
	if bo_lesen(n):
		return None  # alle
	namen = set(frappe.get_all(DT, filters={"kunde_id": n.id}, pluck="name", limit_page_length=0))
	from oekoinvest_app.plattform.organisation import organisationen_ids

	orgs = organisationen_ids(n.id)
	if orgs:
		namen |= set(frappe.get_all(DT, filters={"organisation_id": ["in", orgs]}, pluck="name", limit_page_length=0))
	return namen


@frappe.whitelist(methods=["POST"])
def liste(q=None, typ=None, status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	filters = {}
	if typ in ANLAGE_TYPEN:
		filters["typ"] = typ
	if status in ANLAGE_STATUS:
		filters["status"] = status
	namen = _sichtbare_namen(n)
	if namen is not None:
		if not namen:
			return []
		filters["name"] = ["in", list(namen)]
	such = v.text(q, 80).lower()
	erg = []
	for name in frappe.get_all(DT, filters=filters, pluck="name", order_by="titel asc", limit_page_length=0):
		a = frappe.get_doc(DT, name)
		if such and such not in " ".join([a.titel or "", a.ort or "", a.bundesland or "", a.name, _org_name(a.organisation_id), a.get("eigentuemer") or ""]).lower():
			continue
		erg.append(anlage_json(n, a))
	return erg


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	return anlage_json(n, anlage_laden(n, id), detail=True)


@frappe.whitelist(methods=["POST"])
def kunden(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	konten = []
	for name in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "unternehmen", "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0):
		k = frappe.db.get_value("Plattform Konto", name, ["name", "vorname", "nachname", "firma", "email", "aktiv"], as_dict=True)
		if k and cint(k.aktiv):
			konten.append({"id": k.name, "name": " ".join(x for x in (k.vorname, k.nachname) if x), "firma": k.firma or "", "email": k.email})
	orgs = [{"id": o.name, "name": o.titel, "art": o.art} for o in frappe.get_all("Plattform Organisation", fields=["name", "titel", "art"], order_by="titel asc", limit_page_length=0)]
	betrieb = []
	for name in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0):
		k = frappe.db.get_value("Plattform Konto", name, ["name", "aktiv", "backoffice_rollen"], as_dict=True)
		if k and cint(k.aktiv) and stufe(frappe._dict(rollen=["admin"], backofficeRollen=k.backoffice_rollen or ""), "anlagen") >= 1:
			betrieb.append({"id": k.name, "name": name_von(k.name)})
	# Eigentümergesellschaften aus dem Gesellschaftsverzeichnis (falls installiert)
	ges = []
	if frappe.db.exists("DocType", "Plattform Projektgesellschaft"):
		ges = [{"id": g.name, "name": g.firma, "status": g.status} for g in frappe.get_all("Plattform Projektgesellschaft", fields=["name", "firma", "status"], order_by="firma asc", limit_page_length=0)]
	return {"konten": sorted(konten, key=lambda x: x["name"]), "organisationen": orgs, "betrieb": betrieb, "gesellschaften": ges}


# ================================================================ Stammdaten (Backoffice)

FELDER = {
	"name": "titel", "typ": "typ", "status": "status", "land": "land", "bundesland": "bundesland", "ort": "ort", "kwp": "kwp", "speicherKwh": "speicher_kwh",
	"speicherKw": "speicher_kw", "lastJahrKwh": "last_jahr_kwh", "wechselrichterAnzahl": "wechselrichter_anzahl", "lastprofil": "lastprofil",
	"inbetriebnahme": "inbetriebnahme", "beschreibung": "beschreibung", "kundeId": "kunde_id", "organisationId": "organisation_id",
}


def _datum(s):
	s = v.text(s, 10)
	return s if len(s) == 10 and s[:2] == "20" and s[4] == "-" and s[7] == "-" else None


def _anlage_setzen(a, d, neu):
	d = d or {}
	has = lambda k: k in d or neu  # noqa: E731
	if has("name"):
		a.titel = v.text(d.get("name"), 120)
	if has("typ"):
		a.typ = v.auswahl(d.get("typ"), list(ANLAGE_TYPEN), a.typ or "")
	if has("status"):
		a.status = v.auswahl(d.get("status"), list(ANLAGE_STATUS), a.status or "betrieb")
	if has("land"):
		a.land = v.auswahl(d.get("land"), list(LAENDER), a.land or "DE")
	if has("bundesland"):
		a.bundesland = v.auswahl(d.get("bundesland"), BUNDESLAENDER.get(a.land, []), "")
	if "ort" in d:
		a.ort = v.text(d.get("ort"), 80)
	for k, feld, maximal in (("kwp", "kwp", 500000), ("speicherKwh", "speicher_kwh", 1000000), ("speicherKw", "speicher_kw", 500000), ("lastJahrKwh", "last_jahr_kwh", 1e9)):
		if k in d:
			a.set(feld, v.zahl(d.get(k), min=0, max=maximal, stellen=1) or 0)
	if "wechselrichterAnzahl" in d:
		a.wechselrichter_anzahl = int(v.zahl(d.get("wechselrichterAnzahl"), min=1, max=999) or 1)
	if has("lastprofil"):
		a.lastprofil = v.auswahl(d.get("lastprofil"), list(LASTPROFILE), a.lastprofil or "gewerbe")
	if "inbetriebnahme" in d:
		a.inbetriebnahme = _datum(d.get("inbetriebnahme"))
	if "beschreibung" in d:
		a.beschreibung = v.mehrzeilig(d.get("beschreibung"), 2000)
	if "kundeId" in d:
		k = v.kennung(d.get("kundeId"))
		if k and not frappe.db.exists("Plattform Konto", k):
			ungueltig("Kundenkonto nicht gefunden.")
		a.kunde_id = k or None
	if "organisationId" in d:
		o = v.kennung(d.get("organisationId"))
		if o and not frappe.db.exists("Plattform Organisation", o):
			ungueltig("Organisation nicht gefunden.")
		a.organisation_id = o or None
	# Eigentum & Betrieb (Pflicht: Eigentümergesellschaft)
	if has("eigentuemer"):
		a.eigentuemer = v.text(d.get("eigentuemer"), 160)
	if "eigentuemerId" in d:
		gid = v.kennung(d.get("eigentuemerId")) or None
		if gid:
			firma = frappe.db.get_value("Plattform Projektgesellschaft", gid, "firma") if frappe.db.exists("DocType", "Plattform Projektgesellschaft") else None
			if not firma:
				ungueltig("Gesellschaft nicht im Gesellschaftsverzeichnis gefunden.")
			a.eigentuemer = firma  # Name aus dem Verzeichnis übernehmen
		a.eigentuemer_id = gid
	if has("betriebsfuehrer"):
		a.betriebsfuehrer = v.text(d.get("betriebsfuehrer"), 160) or a.get("betriebsfuehrer") or BETRIEBSFUEHRER_STANDARD
	if "dachgeberIstKunde" in d:
		a.dachgeber_ist_kunde = 1 if v.wahr(d.get("dachgeberIstKunde")) else 0
	if "dachgeber" in d:
		a.dachgeber = v.text(d.get("dachgeber"), 160)
	if "dienstbarkeitStatus" in d:
		a.dienstbarkeit_status = v.auswahl(d.get("dienstbarkeitStatus"), list(DIENSTBARKEIT_STATUS), "")
	if "dienstbarkeitDatum" in d:
		a.dienstbarkeit_datum = _datum(d.get("dienstbarkeitDatum"))
	if "dienstbarkeitHinweis" in d:
		a.dienstbarkeit_hinweis = v.text(d.get("dienstbarkeitHinweis"), 200)
	if "dienstbarkeitDokumentId" in d:
		dok = v.kennung(d.get("dienstbarkeitDokumentId"))
		if dok and not frappe.db.exists("Plattform Dokument", dok):
			ungueltig("Dokument nicht gefunden.")
		a.dienstbarkeit_dokument_id = dok or None
	if "finanziertDurch" in d:
		a.finanziert_durch = v.text(d.get("finanziertDurch"), 160)
	v.pflicht(len(a.get("eigentuemer") or "") >= 3, "Bitte geben Sie die Eigentümergesellschaft an (ÖkoInvest GmbH oder Projektgesellschaft).")
	if a.get("dienstbarkeit_status") in ("beantragt", "eingetragen"):
		v.pflicht(bool(a.get("dienstbarkeit_datum")), "Bitte geben Sie das Datum des Antrags bzw. der Eintragung der Dienstbarkeit an.")
	v.pflicht(len(a.titel or "") >= 3, "Bitte geben Sie eine Bezeichnung an (mind. 3 Zeichen).")
	v.pflicht(bool(a.typ), "Bitte wählen Sie den Anlagentyp.")
	v.pflicht(bool(a.bundesland), "Bitte wählen Sie Bundesland bzw. Kanton.")
	if a.typ == "speicher":
		v.pflicht(flt(a.speicher_kwh) > 0, "Ein Batteriespeicher braucht eine Kapazität in kWh.")
	else:
		v.pflicht(flt(a.kwp) > 0, "Bitte geben Sie die Leistung in kWp an.")
	if a.status == "betrieb":
		v.pflicht(bool(a.inbetriebnahme), "Für Anlagen in Betrieb ist das Inbetriebnahmedatum Pflicht.")
	a.region_id = region_fuer(a.land, a.bundesland)


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	a = frappe.new_doc(DT)
	_anlage_setzen(a, d, neu=True)
	a.insert(ignore_permissions=True)
	protokoll(n, "anlage_angelegt", "anlage", a.name, f"Anlage angelegt: {a.titel}")
	return anlage_json(n, a, detail=True)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	a = anlage_laden(n, id)
	d = aus_json(daten, {}) or {}
	_anlage_setzen(a, d, neu=False)
	a.save(ignore_permissions=True)
	protokoll(n, "anlage_geaendert", "anlage", a.name, ("Stammdaten geändert: " + ", ".join(k for k in d if k in FELDER))[:280])
	return anlage_json(n, a, detail=True)


EINTRAG_DT = {
	"komponente": "Plattform Anlagenkomponente", "messpunkt": "Plattform Messpunkt", "wartung": "Plattform Wartung",
	"vertrag": "Plattform Contracting Vertrag", "monatswert": "Plattform Zaehlerstand Monatswert",
}


def _eintrag_felder(art, d, a):
	if art == "komponente":
		f = {
			"art": v.auswahl(d.get("art"), list(KOMPONENTEN_ARTEN), ""), "hersteller": v.text(d.get("hersteller"), 80), "modell": v.text(d.get("modell"), 120),
			"seriennummer": v.text(d.get("seriennummer"), 80), "anzahl": int(v.zahl(d.get("anzahl"), min=1, max=100000) or 1),
			"leistung_kw": v.zahl(d.get("leistungKw"), min=0, max=500000, stellen=1), "kapazitaet_kwh": v.zahl(d.get("kapazitaetKwh"), min=0, max=1000000, stellen=1),
			"inbetriebnahme": _datum(d.get("inbetriebnahme")), "garantie_bis": _datum(d.get("garantieBis")), "bemerkung": v.text(d.get("bemerkung"), 300),
		}
		v.pflicht(bool(f["art"]), "Bitte wählen Sie die Art der Komponente.")
		v.pflicht(bool(f["hersteller"] or f["modell"]), "Bitte geben Sie Hersteller oder Modell an.")
		return f
	if art == "messpunkt":
		f = {
			"bezeichnung": v.text(d.get("bezeichnung"), 100), "zaehlernummer": v.text(d.get("zaehlernummer"), 40), "art": v.auswahl(d.get("art"), list(MESSPUNKT_ARTEN), ""),
			"messstelle": v.auswahl(d.get("messstelle"), list(MESSSTELLEN), "monitoring"), "abrechnungsrelevant": 1 if v.wahr(d.get("abrechnungsrelevant")) else 0,
			"msb": v.text(d.get("msb"), 100), "smgw": 1 if v.wahr(d.get("smgw")) else 0, "eichgueltig_bis": _datum(d.get("eichgueltigBis")), "bemerkung": v.text(d.get("bemerkung"), 300),
		}
		v.pflicht(bool(f["zaehlernummer"]), "Bitte geben Sie die Zählernummer an.")
		v.pflicht(bool(f["art"]), "Bitte wählen Sie die Art des Messpunkts.")
		if f["abrechnungsrelevant"] and f["messstelle"] != "geeicht":
			ungueltig("Abrechnungsrelevant sind nur geeichte Messstellen bzw. Smart-Meter-Gateways – MQTT-Werte dienen ausschließlich dem Monitoring.")
		f["bezeichnung"] = f["bezeichnung"] or MESSPUNKT_ARTEN[f["art"]][0]
		return f
	if art == "wartung":
		f = {
			"art": v.auswahl(d.get("art"), list(WARTUNG_ARTEN), ""), "datum": _datum(d.get("datum")), "status": v.auswahl(d.get("status"), list(WARTUNG_STATUS), "geplant"),
			"dienstleister": v.text(d.get("dienstleister"), 100), "bericht": v.mehrzeilig(d.get("bericht"), 2000), "naechste_faelligkeit": _datum(d.get("naechsteFaelligkeit")),
			"kosten_eur": v.zahl(d.get("kostenEur"), min=0, max=10000000, stellen=2),
		}
		v.pflicht(bool(f["art"]), "Bitte wählen Sie die Art der Wartung.")
		v.pflicht(bool(f["datum"]), "Bitte geben Sie das Datum an.")
		return f
	if art == "vertrag":
		f = {
			"nummer": v.text(d.get("nummer"), 40), "beginn": _datum(d.get("beginn")), "laufzeit_jahre": int(v.zahl(d.get("laufzeitJahre"), min=1, max=40) or 0),
			"strompreis_ct": v.zahl(d.get("strompreisCt"), min=0, max=100, stellen=3), "grundgebuehr_monat": v.zahl(d.get("grundgebuehrMonat"), min=0, max=1000000, stellen=2),
			"indexierung_pct": v.zahl(d.get("indexierungPct"), min=0, max=10, stellen=2) or 0, "kuendigungsfrist_monate": int(v.zahl(d.get("kuendigungsfristMonate"), min=0, max=36) or 6),
			"status": v.auswahl(d.get("status"), ["aktiv", "gekuendigt", "beendet"], "aktiv"), "bemerkung": v.text(d.get("bemerkung"), 300),
			# Vertragsdetails (wie demo/anlagen.js)
			"index_basis": v.auswahl(d.get("indexBasis"), INDEX_BASIS, "prozent" if flt(d.get("indexierungPct")) > 0 else "fest"),
			"mindestabnahme_kwh_jahr": v.zahl(d.get("mindestabnahmeKwhJahr"), min=0, max=1e9, stellen=0),
			"endschaft": v.auswahl(d.get("endschaft"), ENDSCHAFT, ""),
			"kaufoption_eur": v.zahl(d.get("kaufoptionEur"), min=0, max=1e9, stellen=0),
			"endschaft_text": v.text(d.get("endschaftText"), 300),
		}
		v.pflicht(bool(f["beginn"]), "Bitte geben Sie den Vertragsbeginn an.")
		v.pflicht(f["laufzeit_jahre"] > 0, "Bitte geben Sie die Laufzeit in Jahren an (1–40).")
		v.pflicht(f["strompreis_ct"] is not None, "Bitte geben Sie den Strompreis in ct/kWh an (0 bei reiner Monatsrate).")
		v.pflicht(f["grundgebuehr_monat"] is not None, "Bitte geben Sie die Grundgebühr je Monat an (0 möglich).")
		return f
	# monatswert
	mp_id = v.kennung(d.get("messpunktId"))
	mp = frappe.db.get_value("Plattform Messpunkt", {"name": mp_id, "anlage_id": a.name}, ["name", "art", "abrechnungsrelevant", "zaehlernummer"], as_dict=True) if mp_id else None
	if not mp:
		ungueltig("Messpunkt nicht gefunden.")
	if not cint(mp.abrechnungsrelevant):
		ungueltig("Monatswerte für die Abrechnung nur für abrechnungsrelevante (geeichte) Messpunkte.")
	monat = v.text(d.get("monat"), 7)
	f = {
		"messpunkt_id": mp.name, "monat": monat if len(monat) == 7 and monat[4] == "-" and "01" <= monat[5:] <= "12" else "",
		"register": v.auswahl(d.get("register"), MESSPUNKT_ARTEN[mp.art][1], ""), "stand": v.zahl(d.get("stand"), min=0, max=1e12, stellen=3),
		"quelle": v.text(d.get("quelle"), 80) or "Messstellenbetreiber", "geprueft": 1 if v.wahr(d.get("geprueft")) else 0,
	}
	v.pflicht(bool(f["monat"]) and bool(f["register"]) and f["stand"] is not None, "Bitte Monat, Register und Zählerstand angeben.")
	return f


def eintrag_json(art, e):
	if art == "vertrag":
		return vertrag_json(e)
	if art == "monatswert":
		mp = frappe.db.get_value("Plattform Messpunkt", e.messpunkt_id, ["zaehlernummer"], as_dict=True) or {}
		return {"id": e.name, "anlageId": e.anlage_id, "messpunktId": e.messpunkt_id, "zaehlernummer": mp.get("zaehlernummer", ""), "monat": e.monat, "register": e.register, "stand": flt(e.stand), "menge": flt(e.menge) if e.menge is not None else None, "quelle": e.quelle or "", "geprueft": bool(cint(e.geprueft))}
	d = {"id": e.name, "anlageId": e.anlage_id}
	for k, val in e.as_dict().items():
		if k in ("name", "anlage_id", "doctype", "owner", "creation", "modified", "modified_by", "docstatus", "idx"):
			continue
		teile = k.split("_")
		d[teile[0] + "".join(t.capitalize() for t in teile[1:])] = str(val) if hasattr(val, "isoformat") else val
	if "abrechnungsrelevant" in d:
		d["abrechnungsrelevant"] = bool(cint(d["abrechnungsrelevant"]))
		d["smgw"] = bool(cint(d.get("smgw")))
	return d


@frappe.whitelist(methods=["POST"])
def eintrag_speichern(anlageId=None, art=None, id=None, daten=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	if art not in EINTRAG_DT:
		ungueltig("Unbekannte Art.")
	a = anlage_laden(n, anlageId)
	dt = EINTRAG_DT[art]
	felder = _eintrag_felder(art, aus_json(daten, {}) or {}, a)
	name = None
	if art == "vertrag":
		name = frappe.db.get_value(dt, {"anlage_id": a.name}, "name")
		if felder.get("status") == "aktiv" and (a.kunde_id or a.organisation_id) and not (name and frappe.db.get_value(dt, name, "status") == "aktiv"):
			from oekoinvest_app.plattform.kyc_kern import kyc_sperre  # KYC/KYB: Contracting-Vertrag nur mit verifiziertem Kunden

			kyc_sperre("contracting", konto_id=a.kunde_id or None, organisation_id=a.organisation_id or None, text="Contracting-Vertrag nicht möglich: Der Kunde ist noch nicht verifiziert (KYB).")
	elif art == "monatswert":
		name = frappe.db.get_value(dt, {"messpunkt_id": felder["messpunkt_id"], "register": felder["register"], "monat": felder["monat"]}, "name")
	elif id:
		name = frappe.db.get_value(dt, {"name": v.kennung(id), "anlage_id": a.name}, "name")
		if not name:
			nicht_gefunden("Eintrag nicht gefunden.")
	e = frappe.get_doc(dt, name) if name else frappe.new_doc(dt)
	e.update(felder)
	e.anlage_id = a.name
	e.save(ignore_permissions=True) if name else e.insert(ignore_permissions=True)
	protokoll(n, f"anlage_{art}", "anlage", a.name, f"{art} gespeichert ({e.name})")
	return eintrag_json(art, e)


@frappe.whitelist(methods=["POST"])
def eintrag_loeschen(anlageId=None, art=None, id=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	if art not in EINTRAG_DT or art == "vertrag":
		ungueltig("Dieser Eintrag kann nicht gelöscht werden.")
	a = anlage_laden(n, anlageId)
	name = frappe.db.get_value(EINTRAG_DT[art], {"name": v.kennung(id), "anlage_id": a.name}, "name")
	if not name:
		nicht_gefunden("Eintrag nicht gefunden.")
	if art == "messpunkt" and frappe.db.exists("Plattform Zaehlerstand Monatswert", {"messpunkt_id": name}):
		konflikt("Für diesen Messpunkt liegen Monatswerte vor – er kann nicht gelöscht werden.")
	frappe.delete_doc(EINTRAG_DT[art], name, ignore_permissions=True)
	protokoll(n, f"anlage_{art}_geloescht", "anlage", a.name, f"{art} gelöscht ({name})")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def monatswerte(anlageId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a = anlage_laden(n, anlageId)
	mps = {m.name: m for m in frappe.get_all("Plattform Messpunkt", filters={"anlage_id": a.name, "abrechnungsrelevant": 1}, fields=["name", "bezeichnung", "zaehlernummer", "art"], limit_page_length=0)}
	if not mps:
		return []
	zeilen = frappe.get_all("Plattform Zaehlerstand Monatswert", filters={"messpunkt_id": ["in", list(mps)]}, fields=["*"], order_by="monat desc", limit_page_length=2000)
	return [
		{
			"id": z.name, "monat": z.monat, "messpunktId": z.messpunkt_id, "zaehlernummer": mps[z.messpunkt_id].zaehlernummer, "bezeichnung": mps[z.messpunkt_id].bezeichnung or "",
			"register": z.register, "registerLabel": REGISTER_LABEL.get((mps[z.messpunkt_id].art, z.register), z.register), "stand": flt(z.stand),
			"menge": flt(z.menge) if z.menge is not None else None, "quelle": z.quelle or "", "geprueft": bool(cint(z.geprueft)),
		}
		for z in zeilen
	]


# ================================================================ Gerätezugänge (MQTT)


def _broker():
	conf = frappe.local.conf
	return {"host": conf.get("oekoinvest_mqtt_host") or "mqtt.example.com", "port": cint(conf.get("oekoinvest_mqtt_port")) or 8883, "tls": True}


def _zugang_laden(n, kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists("Plattform Geraetezugang", k):
		nicht_gefunden("Gerätezugang nicht gefunden.")
	z = frappe.get_doc("Plattform Geraetezugang", k)
	anlage_laden(n, z.anlage_id)
	return z


@frappe.whitelist(methods=["POST"])
def geraet_anlegen(anlageId=None, bezeichnung=None, als_benutzer=None):  # noqa: N803
	"""Neuer MQTT-Zugang – das Passwort steht NUR in dieser Antwort, gespeichert wird der scrypt-Hash."""
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	a = anlage_laden(n, anlageId)
	if frappe.db.count("Plattform Geraetezugang", {"anlage_id": a.name}) >= MAX_ZUGAENGE_JE_ANLAGE:
		konflikt("Höchstens 20 Gerätezugänge je Anlage.")
	passwort = geraet_passwort()
	# Kennung vorab ziehen (Benutzer und Topic enthalten sie); autoname() respektiert einen bereits gesetzten Namen nicht,
	# daher Platzhalter einfügen und danach Benutzer/Topic aus der vergebenen Kennung setzen.
	z = frappe.get_doc({
		"doctype": "Plattform Geraetezugang", "anlage_id": a.name, "bezeichnung": v.text(bezeichnung, 80) or "Datenlogger",
		"benutzer": f"neu-{frappe.generate_hash(length=16)}", "topic": "", "passwort_hash": passwort_hash(passwort), "gesperrt": 0, "verbunden": 0, "erstellt_von": n.id,
	})
	z.insert(ignore_permissions=True)
	z.benutzer = mqtt_benutzer(a.name, z.name)
	z.topic = f"{topic_basis(a.name, z.name)}/#"
	z.save(ignore_permissions=True)
	protokoll(n, "geraet_angelegt", "anlage", a.name, f"Gerätezugang {z.benutzer} angelegt")
	return {"zugang": zugang_json(z), "passwort": passwort, "einmalig": True, "broker": _broker()}


@frappe.whitelist(methods=["POST"])
def geraet(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	lese_noetig(n)
	return {"zugang": zugang_json(_zugang_laden(n, id)), "broker": _broker()}


@frappe.whitelist(methods=["POST"])
def geraet_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	z = _zugang_laden(n, id)
	aktion = (aus_json(daten, {}) or {}).get("aktion")
	if aktion == "sperren":
		z.gesperrt = 1
	elif aktion == "entsperren":
		z.gesperrt = 0
	elif aktion == "neu":
		passwort = geraet_passwort()
		z.passwort_hash = passwort_hash(passwort)
		z.verbunden = 0
		z.letzte_verbindung = None
		z.save(ignore_permissions=True)
		protokoll(n, "geraet_neu", "anlage", z.anlage_id, f"Neues Passwort für {z.benutzer} erzeugt (altes ungültig)")
		return {"zugang": zugang_json(z), "passwort": passwort, "einmalig": True, "broker": _broker()}
	elif aktion == "testnachricht":
		konflikt("Testnachrichten gibt es nur im Demo-Betrieb – bitte senden Sie mit mosquitto_pub (siehe Assistent).")
	else:
		ungueltig("Unbekannte Aktion.")
	z.save(ignore_permissions=True)
	protokoll(n, f"geraet_{aktion}", "anlage", z.anlage_id, f"Gerätezugang {z.benutzer}: {aktion}")
	return {"zugang": zugang_json(z), "broker": _broker()}


# ================================================================ Störungen


def _melden(s, anlass="neu", mail=True):
	"""Glocke (+ E-Mail ohne Inhalte) für Kunde/Team (ab Schwere „mittel“ bzw. bei Behebung) und Betrieb (bei neuen Störungen)."""
	try:
		a = frappe.db.get_value(DT, s.anlage_id, ["name", "titel", "kunde_id", "organisation_id"], as_dict=True)
		if not a:
			return
		link = f"/portal/anlagen/{a.name}?tab=stoerungen"
		titel = f"Störung behoben: {a.titel}" if anlass == "behoben" else f"Störung: {a.titel}"
		text = f"{STOERUNG_SCHWERE.get(s.schwere, ('',))[0]} – {s.titel}"
		empf = set()
		if STOERUNG_SCHWERE.get(s.schwere, ("", 0))[1] >= 2 or anlass == "behoben":
			if a.kunde_id:
				empf.add(a.kunde_id)
			if a.organisation_id:
				empf |= set(frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": a.organisation_id}, pluck="nutzer_id", limit_page_length=0))
		if anlass == "neu":
			if s.zustaendig_id:
				empf.add(s.zustaendig_id)
			else:
				empf |= {b["id"] for b in _betrieb_konten()}
		for konto_id in empf:
			benachrichtigen(konto_id, "stoerung", titel, text, link, "anlage", a.name, mail=mail)
	except Exception:
		frappe.log_error(title="ÖkoInvest: Störungsbenachrichtigung fehlgeschlagen", message=s.name)


def _betrieb_konten():
	erg = []
	for name in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0):
		k = frappe.db.get_value("Plattform Konto", name, ["name", "aktiv", "backoffice_rollen"], as_dict=True)
		if k and cint(k.aktiv) and stufe(frappe._dict(rollen=["admin"], backofficeRollen=k.backoffice_rollen or ""), "anlagen") >= 1:
			erg.append({"id": k.name})
	return erg


def stoerung_anlegen_intern(anlage_id, regel="manuell", schwere=None, titel="", text="", geraet_id=None, schluessel=None, von=None):
	"""Offene Störungen derselben Regel an derselben Anlage werden zusammengefasst; `schluessel` verhindert Wiederholungen."""
	if regel != "manuell":
		offen = frappe.db.get_value("Plattform Stoerungsfall", {"anlage_id": anlage_id, "regel": regel, "status": ["in", STOERUNG_OFFEN]}, "name")
		if offen:
			s = frappe.get_doc("Plattform Stoerungsfall", offen)
			s.anzahl = cint(s.anzahl) + 1
			s.zuletzt_am = jetzt()
			s.save(ignore_permissions=True)
			return s, False
		if schluessel and frappe.db.exists("Plattform Stoerungsfall", {"schluessel": schluessel}):
			return None, False
	t = jetzt()
	regel = regel if regel in STOERUNG_REGELN else "manuell"
	s = frappe.get_doc({
		"doctype": "Plattform Stoerungsfall", "anlage_id": anlage_id, "geraet_id": geraet_id if geraet_id and frappe.db.exists("Plattform Geraetezugang", geraet_id) else None,
		"regel": regel, "schwere": schwere if schwere in STOERUNG_SCHWERE else STOERUNG_REGELN[regel][1], "status": "offen",
		"titel": v.text(titel, 140) or STOERUNG_REGELN[regel][0], "text": v.mehrzeilig(text, 2000), "erkannt_am": t, "zuletzt_am": t, "anzahl": 1,
		"schluessel": v.text(schluessel, 140) or None, "kommentare": als_json([]),
		"verlauf": als_json([{"am": iso(t), "text": f"Manuell erfasst von {name_von(von)}" if von else "Störung erkannt"}]),
	})
	s.insert(ignore_permissions=True)
	_melden(s, "neu")
	return s, True


@frappe.whitelist(methods=["POST"])
def stoerungen(anlageId=None, status="offen", limit=200, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	filters = {}
	if anlageId:
		filters["anlage_id"] = anlage_laden(n, anlageId).name
	else:
		namen = _sichtbare_namen(n)
		if namen is not None:
			if not namen:
				return []
			filters["anlage_id"] = ["in", list(namen)]
	if status == "behoben":
		filters["status"] = "behoben"
	elif status != "alle":
		filters["status"] = ["in", STOERUNG_OFFEN]
	zeilen = frappe.get_all("Plattform Stoerungsfall", filters=filters, fields=["*"], order_by="erkannt_am desc", limit_page_length=min(500, max(1, cint(limit) or 200)))
	anlagen = {}
	erg = []
	for s in zeilen:
		if s.anlage_id not in anlagen:
			anlagen[s.anlage_id] = frappe.get_doc(DT, s.anlage_id)
		zg = zugriff(n, anlagen[s.anlage_id])
		if zg:
			erg.append(stoerung_json(n, s, zg, anlagen[s.anlage_id]))
	return sorted(erg, key=lambda x: (-x["prioritaet"], x["erkanntAm"] or ""), reverse=False)


@frappe.whitelist(methods=["POST"])
def stoerung_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	v.pflicht(len(v.text(d.get("titel"), 140)) >= 3, "Bitte beschreiben Sie die Störung kurz (Titel).")
	a = anlage_laden(n, d.get("anlageId"))
	s, _ = stoerung_anlegen_intern(a.name, "manuell", d.get("schwere"), d.get("titel"), d.get("text"), von=n.id)
	protokoll(n, "stoerung_angelegt", "anlage", a.name, f"Störung erfasst: {s.titel}")
	return stoerung_json(n, s, "backoffice", a)


@frappe.whitelist(methods=["POST"])
def stoerung_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Stoerungsfall", k):
		nicht_gefunden("Störung nicht gefunden.")
	s = frappe.get_doc("Plattform Stoerungsfall", k)
	a = anlage_laden(n, s.anlage_id)
	zg = zugriff(n, a)
	d = aus_json(daten, {}) or {}
	aktion = d.get("aktion")
	t = jetzt()
	wer = name_von(n.id)
	verlauf = aus_json(s.verlauf, []) or []
	if aktion == "kommentar":
		ok = bo_schreiben(n) if zg == "backoffice" else zg in ("kunde", "team-schreiben")
		if not ok:
			verboten("Sie können diese Störung nur ansehen.")
		text = v.mehrzeilig(d.get("text"), 2000)
		v.pflicht(len(text) >= 2, "Bitte geben Sie einen Kommentar ein.")
		kommentare = aus_json(s.kommentare, []) or []
		if len(kommentare) >= 200:
			konflikt("Zu viele Kommentare an dieser Störung.")
		kommentare.append({"id": f"KO-{frappe.generate_hash(length=10).upper()}", "von": n.id, "vonName": wer, "backoffice": zg == "backoffice", "am": iso(t), "text": text, "intern": zg == "backoffice" and v.wahr(d.get("intern"))})
		s.kommentare = als_json(kommentare)
		if zg != "backoffice":
			for b in ([{"id": s.zustaendig_id}] if s.zustaendig_id else _betrieb_konten()):
				benachrichtigen(b["id"], "stoerung", f"Kommentar zur Störung: {a.titel}", f"{wer}: {text[:160]}", f"/portal/anlagen/{a.name}?tab=stoerungen", "anlage", a.name, mail=False)
	else:
		if not bo_schreiben(n):
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." if zg == "backoffice" else "Störungen quittiert und bearbeitet der Betrieb von ÖkoInvest.")
		if aktion == "quittieren":
			if s.quittiert_am:
				konflikt("Die Störung ist bereits quittiert.")
			s.quittiert_am = t
			s.quittiert_von = n.id
			if s.status == "offen":
				s.status = "in_arbeit"
			s.zustaendig_id = s.zustaendig_id or n.id
			verlauf.append({"am": iso(t), "text": f"Quittiert von {wer}"})
		elif aktion == "status":
			neu = v.auswahl(d.get("status"), list(STOERUNG_STATUS), "")
			if not neu:
				ungueltig("Unbekannter Status.")
			if neu == s.status:
				konflikt("Die Störung hat diesen Status bereits.")
			s.status = neu
			if neu == "behoben":
				s.behoben_am = t
				if not s.quittiert_am:
					s.quittiert_am, s.quittiert_von = t, n.id
			else:
				s.behoben_am = None
			verlauf.append({"am": iso(t), "text": f"Status: {STOERUNG_STATUS[neu]} ({wer})" + (f" – {v.text(d.get('text'), 200)}" if d.get("text") else "")})
		elif aktion == "zuweisen":
			zid = v.kennung(d.get("zustaendigId"))
			if zid and zid not in {b["id"] for b in _betrieb_konten()}:
				ungueltig("Zuständig kann nur ein Backoffice-Konto mit Zugriff auf Anlagen sein.")
			s.zustaendig_id = zid or None
			verlauf.append({"am": iso(t), "text": f"Zugewiesen: {name_von(zid)}" if zid else "Zuweisung entfernt"})
			if zid and zid != n.id:
				benachrichtigen(zid, "stoerung", f"Störung zugewiesen: {a.titel}", s.titel, f"/portal/anlagen/{a.name}?tab=stoerungen", "anlage", a.name, mail=False)
		elif aktion == "schwere":
			neu = v.auswahl(d.get("schwere"), list(STOERUNG_SCHWERE), "")
			if not neu:
				ungueltig("Unbekannte Schwere.")
			s.schwere = neu
			verlauf.append({"am": iso(t), "text": f"Schwere: {STOERUNG_SCHWERE[neu][0]} ({wer})"})
		else:
			ungueltig("Unbekannte Aktion.")
		s.verlauf = als_json(verlauf)
		protokoll(n, f"stoerung_{aktion}", "anlage", a.name, f"Störung {s.name}: {aktion}")
	s.save(ignore_permissions=True)
	if aktion == "status" and s.status == "behoben":
		_melden(s, "behoben")
	return stoerung_json(n, s, zg, a)


@frappe.whitelist(methods=["POST"])
def leitstand(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	liste_ = stoerungen(status="offen", limit=500, als_benutzer=als_benutzer)
	grenze = add_days(nowdate(), 14)
	return {
		"stoerungen": liste_,
		"zaehler": {
			"offen": sum(1 for s in liste_ if s["status"] == "offen"),
			"inArbeit": sum(1 for s in liste_ if s["status"] == "in_arbeit"),
			"unquittiert": sum(1 for s in liste_ if not s["quittiert"]),
			"kritisch": sum(1 for s in liste_ if s["schwere"] in ("hoch", "kritisch")),
			"anlagen": frappe.db.count(DT),
			"geraeteWartend": frappe.db.count("Plattform Geraetezugang", {"verbunden": 0, "gesperrt": 0}),
			"wartungenFaellig": frappe.db.count("Plattform Wartung", {"status": "geplant", "datum": ["<=", grenze]}),
		},
	}


# ================================================================ Ingest-Dienst (Rolle „ÖkoInvest Anlagen-Dienst“, ohne als_benutzer)


@frappe.whitelist(methods=["POST"])
def dienst_zugaenge():
	"""Alle Gerätezugänge für den Broker-Auth-Hook – nur Hashes, nie Passwörter."""
	dienst_pruefen()
	return [
		{"benutzer": z.benutzer, "passwortHash": z.passwort_hash, "anlageId": z.anlage_id, "geraetId": z.name, "gesperrt": bool(cint(z.gesperrt))}
		for z in frappe.get_all("Plattform Geraetezugang", fields=["name", "benutzer", "passwort_hash", "anlage_id", "gesperrt"], limit_page_length=0)
	]


@frappe.whitelist(methods=["POST"])
def dienst_anlagen():
	"""Stammdaten für Plausibilisierung und Regeln (keine Kundendaten)."""
	dienst_pruefen()
	verbunden = {}
	for z in frappe.get_all("Plattform Geraetezugang", filters={"verbunden": 1, "gesperrt": 0}, fields=["anlage_id"], limit_page_length=0):
		verbunden[z.anlage_id] = verbunden.get(z.anlage_id, 0) + 1
	return [
		{"id": a.name, "status": a.status, "kwp": flt(a.kwp), "speicherKw": flt(a.speicher_kw), "regionId": a.region_id or region_fuer(a.land, a.bundesland), "geraete": verbunden.get(a.name, 0)}
		for a in frappe.get_all(DT, fields=["name", "status", "kwp", "speicher_kw", "region_id", "land", "bundesland"], limit_page_length=0)
	]


@frappe.whitelist(methods=["POST"])
def dienst_stoerung(befund=None):
	"""Befund des Ingest-Dienstes → Störungsfall (zusammengefasst je offener Regel, Schlüssel gegen Wiederholung)."""
	dienst_pruefen()
	b = aus_json(befund, {}) or {}
	aid = v.kennung(b.get("anlageId"))
	regel = b.get("regel")
	if not aid or not frappe.db.exists(DT, aid) or regel not in STOERUNG_REGELN or regel == "manuell":
		ungueltig("Ungültiger Befund.")
	s, neu = stoerung_anlegen_intern(aid, regel, b.get("schwere"), b.get("titel"), b.get("text"), v.kennung(b.get("geraetId")) or None, v.text(b.get("schluessel"), 140) or None)
	return {"id": s.name if s else None, "neu": neu}


@frappe.whitelist(methods=["POST"])
def dienst_verbindung(geraetId=None, letzteNachricht=None):  # noqa: N803
	"""Erste/letzte Nachricht eines Geräts (Assistent: „Warte auf erste Nachricht …“ → „verbunden“)."""
	dienst_pruefen()
	gid = v.kennung(geraetId)
	if not gid or not frappe.db.exists("Plattform Geraetezugang", gid):
		nicht_gefunden("Gerätezugang nicht gefunden.")
	t = jetzt()
	frappe.db.set_value("Plattform Geraetezugang", gid, {"verbunden": 1, "letzte_verbindung": t, "letzte_nachricht": t}, update_modified=False)
	return {"ok": True}
