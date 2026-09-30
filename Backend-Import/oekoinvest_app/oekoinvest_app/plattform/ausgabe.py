# Copyright (c) 2026, ÖkoInvest GmbH
#
# Ausgabe (zu_json) der DocTypes im camelCase-Format der Website – identisch zu den Objekten des
# Demo-Backends (src/lib/plattform/backend/demo.js). Interne Felder (kaeufer_interesse_id, description …)
# verlassen die App nicht.

import frappe
from frappe.utils import cint, flt

from oekoinvest_app.plattform.kern import aus_json, besitzer, ist_admin, iso, kurz, name_von, objekt_laden, verlauf_json, zahl_oder_null
from oekoinvest_app.plattform.konstanten import VORGANG_TYPEN
from oekoinvest_app.plattform.oeffentlich import projekt_oeffentlich
from oekoinvest_app.plattform.organisation import zugriff_info

# ================================================================ Vorgang


def vorgang_json(vg):
	return {
		"id": vg.name,
		"typ": vg.typ,
		"status": vg.status,
		"statusVerlauf": verlauf_json(vg),
		"nutzerId": vg.nutzer_id or None,
		"email": vg.email,
		"kontakt": aus_json(vg.kontakt, {}),
		"daten": aus_json(vg.daten, {}),
		"herkunft": aus_json(vg.herkunft, {}),
		"ip": vg.ip or "",
		"einwilligung": aus_json(vg.einwilligung),
		"zustaendigId": vg.zustaendig_id or None,
		"flaecheId": vg.flaeche_id or None,
		"ablehnGrund": vg.ablehn_grund or "",
		"erstelltAm": iso(vg.creation),
		"geaendertAm": iso(vg.modified),
	}


def vorgang_ausgabe(vg, n):
	out = vorgang_json(vg)
	out["zustaendig"] = kurz(vg.zustaendig_id)
	if ist_admin(n):
		out["nutzer"] = kurz(vg.nutzer_id)
	else:
		out.pop("ip", None)
		out.pop("herkunft", None)
	return out


# ================================================================ Fläche


def flaeche_json(f):
	return {
		"id": f.name,
		"nutzerId": f.nutzer_id or None,
		"organisationId": f.get("organisation_id") or None,
		"vorgangId": f.vorgang_id or None,
		"bezeichnung": f.bezeichnung or "",
		"land": f.land or "",
		"bundesland": f.bundesland or "",
		"plz": f.plz or "",
		"ort": f.ort or "",
		"gemarkung": f.gemarkung or "",
		"flurstuecke": [{"gemarkung": x.gemarkung or "", "flur": x.flur or "", "nummer": x.nummer or ""} for x in (f.get("flurstuecke") or [])],
		"ha": zahl_oder_null(f.ha),
		"nutzung": f.nutzung or "",
		"agri": bool(cint(f.agri)),
		"eigentum": f.eigentum or "",
		"hinweise": f.hinweise or "",
		"status": f.status,
		"statusVerlauf": verlauf_json(f),
		"pachtangebot": aus_json(f.pachtangebot),
		"ablehnGrund": f.ablehn_grund or "",
		"zustaendigId": f.zustaendig_id or None,
		"erstelltAm": iso(f.creation),
		"geaendertAm": iso(f.modified),
	}


def anzahl_dokumente(art, kennung):
	return frappe.db.count("Plattform Dokument", {"bezug_art": art, "bezug_id": kennung})


def checkliste_dokumente(art, kennung):
	"""Metadaten (id, name, am, checkliste) der Dokumente eines Objekts für die Checkliste."""
	return [
		{"id": d.name, "name": d.dateiname, "am": iso(d.am), "checkliste": d.checkliste or ""}
		for d in frappe.get_all("Plattform Dokument", filters={"bezug_art": art, "bezug_id": kennung}, fields=["name", "dateiname", "am", "checkliste"], limit_page_length=0)
	]


def datenraum_qualitaet(pj):
	from oekoinvest_app.plattform.checkliste import checkliste_projekt

	return checkliste_projekt(pj, checkliste_dokumente("projekt", pj["id"]))["quote"]


def flaeche_ausgabe(f, n):
	from oekoinvest_app.plattform.checkliste import checkliste_flaeche

	out = flaeche_json(f)
	out["zustaendig"] = kurz(f.zustaendig_id)
	out["dokumente"] = anzahl_dokumente("flaeche", f.name)
	out["checkliste"] = checkliste_flaeche(out, checkliste_dokumente("flaeche", f.name))
	if ist_admin(n):
		out["eigentuemer"] = kurz(f.nutzer_id)
	out.update(zugriff_info(n, f, f.nutzer_id))  # organisation {id, name}, meinZugriff
	return out


# ================================================================ Projekt


def projekt_json(p):
	"""Vollständiges Projekt (nur für Anbieter/Admin bzw. als Quelle der öffentlichen Projektion)."""
	return {
		"id": p.name,
		"slug": p.slug or "",
		"anbieterId": p.anbieter_id,
		"organisationId": p.get("organisation_id") or None,
		"titel": p.titel or "",
		"typ": p.typ or "",
		"land": p.land or "",
		"bundesland": p.bundesland or "",
		"region": p.region or "",
		"mwp": zahl_oder_null(p.mwp),
		"mwhSpeicher": zahl_oder_null(p.mwh_speicher),
		"flaecheHa": zahl_oder_null(p.flaeche_ha),
		"phase": p.phase or "",
		"netzanschluss": p.netzanschluss or "offen",
		"codGeplant": p.cod_geplant or "",
		"preisModus": p.preis_modus or "anfrage",
		"preis": zahl_oder_null(p.preis) if p.preis_modus == "gesamt" else None,
		"preisProKwp": zahl_oder_null(p.preis_pro_kwp) if p.preis_modus == "proKwp" else None,
		"beschreibung": p.beschreibung or "",
		"highlights": aus_json(p.highlights, []) or [],
		"vertraulich": aus_json(p.vertraulich, {}) or {},
		"status": p.status,
		"statusVerlauf": verlauf_json(p),
		"provisionAkzeptiert": aus_json(p.provision_akzeptiert),
		"provisionSatz": zahl_oder_null(p.provision_satz),
		"ablehnGrund": p.ablehn_grund or "",
		"aufrufe": cint(p.aufrufe),
		"zustaendigId": p.zustaendig_id or None,
		"veroeffentlichtAm": iso(p.veroeffentlicht_am),
		"demo": bool(cint(p.demo)),
		"erstelltAm": iso(p.creation),
		"geaendertAm": iso(p.modified),
	}


def projekt_statistik(p):
	ints = frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name}, fields=["status", "gemerkt"])
	return {
		"aufrufe": cint(p.aufrufe),
		"merker": sum(1 for i in ints if cint(i.gemerkt)),
		"ndaAnfragen": sum(1 for i in ints if i.status != "gemerkt"),
		"lois": sum(1 for i in ints if i.status in ("loi_abgegeben", "loi_angenommen", "abgeschlossen")),
	}


def projekt_ausgabe(p, n):
	from oekoinvest_app.plattform.checkliste import checkliste_projekt

	out = projekt_json(p)
	out["statistik"] = projekt_statistik(p)
	out["dokumente"] = anzahl_dokumente("projekt", p.name)
	out["checkliste"] = checkliste_projekt(out, checkliste_dokumente("projekt", p.name))
	pv = frappe.db.get_value("Plattform Provision", {"projekt_id": p.name}, "name")
	out["provision"] = provision_json(frappe.get_doc("Plattform Provision", pv)) if pv else None
	if ist_admin(n):
		out["anbieter"] = kurz(p.anbieter_id)
		out["zustaendig"] = kurz(p.zustaendig_id)
	out.update(zugriff_info(n, p, p.anbieter_id))  # organisation {id, name}, meinZugriff
	return out


def projekt_oeffentlich_aus_doc(p):
	return projekt_oeffentlich(projekt_json(p))


# ================================================================ Interesse


def interesse_json(i, n=None):
	"""Interesse ohne Projekt. Für Nicht-Admins ohne NDA-IP/Browser (Nachweis nur für das Backoffice)."""
	nda = aus_json(i.nda)
	if nda and not ist_admin(n):
		nda = {k: w for k, w in nda.items() if k not in ("ip", "userAgent")}
	return {
		"id": i.name,
		"projektId": i.projekt_id,
		"investorId": i.investor_id,
		"organisationId": i.get("organisation_id") or None,
		"status": i.status,
		"gemerkt": bool(cint(i.gemerkt)),
		"statusVerlauf": verlauf_json(i),
		"nda": nda,
		"loi": aus_json(i.loi),
		"ablehnGrund": i.ablehn_grund or "",
		"zustaendigId": i.zustaendig_id or None,
		"erstelltAm": iso(i.creation),
		"geaendertAm": iso(i.modified),
	}


def interesse_ausgabe(i, n):
	out = interesse_json(i, n)
	p = objekt_laden("projekt", i.projekt_id)
	if p:
		pj = projekt_oeffentlich_aus_doc(p)
		if ist_admin(n):
			pj["anbieterId"] = p.anbieter_id
		out["projekt"] = pj
	else:
		out["projekt"] = None
	if ist_admin(n):
		out["investor"] = kurz(i.investor_id)
		out["anbieter"] = kurz(p.anbieter_id) if p else None
	out.update(zugriff_info(n, i, i.investor_id))  # organisation {id, name}, meinZugriff
	return out


# ================================================================ Provision


def provision_json(pv):
	return {
		"id": pv.name,
		"projektId": pv.projekt_id,
		"anbieterId": pv.anbieter_id,
		"investorId": pv.investor_id,
		"interesseId": pv.interesse_id,
		"kaufpreis": flt(pv.kaufpreis),
		"satz": flt(pv.satz),
		"betrag": flt(pv.betrag),
		"status": pv.status,
		"statusVerlauf": verlauf_json(pv),
		"ablehnGrund": pv.ablehn_grund or "",
		"erstelltAm": iso(pv.creation),
	}


# ================================================================ Änderungsprotokoll

# Bezeichnungen geänderter Felder (camelCase wie im Demo-Backend) für „wer hat was geändert“
FELD_NAMEN_FLAECHE = {
	"bezeichnung": "Bezeichnung", "land": "Land", "bundesland": "Bundesland", "plz": "PLZ", "ort": "Ort", "gemarkung": "Gemarkung",
	"flurstuecke": "Flurstücke", "ha": "Größe", "nutzung": "Nutzung", "agri": "Agri-PV", "eigentum": "Eigentum", "hinweise": "Hinweise",
}
FELD_NAMEN_PROJEKT = {
	"titel": "Titel", "typ": "Typ", "land": "Land", "bundesland": "Bundesland", "region": "Region", "mwp": "Leistung", "mwhSpeicher": "Speicher",
	"flaecheHa": "Fläche", "phase": "Phase", "netzanschluss": "Netzanschluss", "codGeplant": "COD", "preisModus": "Preismodus", "preis": "Preis",
	"preisProKwp": "Preis je kWp", "beschreibung": "Beschreibung", "highlights": "Highlights", "vertraulich": "vertrauliche Angaben",
}


def geaenderte_felder(alt, neu, namen):
	import json

	def norm(x):
		return json.dumps(x, sort_keys=True, ensure_ascii=False, default=str)

	return [label for k, label in namen.items() if norm(alt.get(k)) != norm(neu.get(k))]


# ================================================================ Allgemein


def objekt_json(art, o, n):
	"""Ergebnis von prozess.status_wechsel."""
	if art == "vorgang":
		return vorgang_ausgabe(o, n)
	if art == "flaeche":
		return flaeche_ausgabe(o, n)
	if art == "projekt":
		return projekt_ausgabe(o, n)
	if art == "interesse":
		return interesse_json(o, n)
	if art == "provision":
		return provision_json(o)
	return {"id": o.name, "status": o.get("status")}


def dokument_meta(d):
	return {
		"id": d.name,
		"bezugArt": d.bezug_art,
		"bezugId": d.bezug_id,
		"name": d.dateiname,
		"mime": d.mime,
		"groesse": cint(d.groesse),
		"kategorie": d.kategorie,
		"checkliste": d.get("checkliste") or "",
		"am": iso(d.am),
		"hochgeladenVon": d.hochgeladen_von or None,
	}


def thread_info(art, kennung, n, o=None):
	"""Titel, Link und Gegenüber eines Threads (wie threadInfo im Demo-Backend)."""
	admin = ist_admin(n)
	o = o or objekt_laden(art, kennung)
	if not o:
		return None
	if art == "vorgang":
		k = aus_json(o.kontakt, {}) or {}
		return {
			"titel": f"Anfrage {VORGANG_TYPEN.get(o.typ, o.typ)} · {o.name}",
			"link": f"/portal/admin/vorgaenge/{o.name}" if admin else f"/portal/anfragen/{o.name}",
			"gegenueber": " ".join(x for x in (k.get("vorname"), k.get("nachname")) if x),
		}
	if art == "flaeche":
		return {"titel": f"Fläche: {o.bezeichnung}", "link": f"/portal/flaechen/{o.name}", "gegenueber": name_von(o.nutzer_id)}
	if art == "projekt":
		return {"titel": f"Projekt: {o.titel}", "link": f"/portal/projekte/{o.name}", "gegenueber": name_von(o.anbieter_id)}
	if art == "interesse":
		titel = frappe.db.get_value("Plattform Projekt", o.projekt_id, "titel") or o.projekt_id
		return {
			"titel": f"Interesse: {titel}",
			"link": f"/portal/admin/interessen?id={o.name}" if admin else f"/portal/boerse/{o.projekt_id}",
			"gegenueber": name_von(o.investor_id),
		}
	if art == "nutzer":
		return {
			"titel": f"Allgemein · {name_von(o.name)}" if admin else "Allgemeine Nachrichten",
			"link": f"/portal/nachrichten?bezug=nutzer:{o.name}",
			"gegenueber": name_von(o.name),
		}
	return None


def ist_eigen(art, o, n):
	return bool(n) and besitzer(art, o) == n.id
