# Copyright (c) 2026, ÖkoInvest GmbH
#
# Deal-Room (docs/API.md, Abschnitt 7) – Referenz: src/lib/plattform/backend/demo/dealroom.js.
#   kopf · kontakt_freigabe (Umgehungsschutz) · datenraum (Ordner, Versionen, Stufen) · einordnen ·
#   dokument (Download mit Empfänger + Datum im Dateinamen, Zugriffsprotokoll) · zugriffe ·
#   pipeline · notiz_speichern · suchprofile_speichern · cockpit (Anbieter) · uebersicht (Backoffice)

import base64
from collections import OrderedDict

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.api import bieter as bieter_api
from oekoinvest_app.plattform.api import qa as qa_api
from oekoinvest_app.plattform.api.dokument import darf_dokument
from oekoinvest_app.plattform.ausgabe import dokument_meta, projekt_oeffentlich_aus_doc
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.dealroom_kern import (
	AKTIVE_SPALTEN,
	DATENRAUM_ORDNER,
	DATENRAUM_ORDNER_IDS,
	MAIL_DEAL,
	NOTIZ_TAGS_MAX,
	ORDNER_TEXT,
	PIPELINE_SPALTEN,
	SUCHPROFILE_MAX,
	anbieter_anzeige,
	deal_link,
	gebot_gesamt,
	investor_anzeige,
	investor_stufe,
	kontakt_frei,
	ordner_vorschlag,
	pipeline_spalte,
	projekt_laden,
	pseudonyme,
	rolle_im,
	stufe_ok,
	verbindlich_zugelassen,
	wasserzeichen_name,
)
from oekoinvest_app.plattform.kern import aus_json, als_json, hat_rolle, ist_admin, iso, jetzt, konflikt, kurz, nicht_gefunden, nutzer, protokoll, sha256, verboten
from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN_IDS, PROJEKT_TYPEN, SUCHPROFIL_SCHWELLE
from oekoinvest_app.plattform.matching import matching
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS, status_label


def _stufe(i):
	return investor_stufe(i.status, verbindlich_zugelassen(i.projekt_id, i.name)) if i else 0


# ================================================================ Kopf & Kontaktfreigabe


@frappe.whitelist(methods=["POST"])
def kopf(projektId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	p = projekt_laden(projektId)
	rolle, interesse = rolle_im(n, p)
	if rolle == "investor" and p.status not in (*BOERSE_STATUS, "verkauft"):
		nicht_gefunden("Projekt nicht gefunden.")
	projekt = projekt_oeffentlich_aus_doc(p)
	if rolle != "investor":
		projekt.update({"anbieterId": p.anbieter_id, "provisionSatz": flt(p.provision_satz) or None})
	out = {
		"rolle": rolle,
		"projekt": projekt,
		"interesse": {"id": interesse.name, "status": interesse.status} if interesse else None,
		"stufe": _stufe(interesse) if rolle == "investor" else 2,
		"anbieter": anbieter_anzeige(p, interesse) if rolle == "investor" else kurz(p.anbieter_id) if rolle == "admin" else None,
	}
	if rolle == "investor":
		out["kontaktFrei"] = kontakt_frei(p.name, interesse.name)
	if rolle == "admin":
		pseudo = pseudonyme(p.name)
		out["interessenten"] = [
			{"id": i.name, "status": i.status, "pseudonym": pseudo.get(i.name, "Investor"), "investor": kurz(i.investor_id), "kontaktFrei": kontakt_frei(p.name, i.name)}
			for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name, "status": ("in", [*DATENRAUM_STATUS, "abgelehnt"])}, fields=["name", "status", "investor_id"])
		]
	return out


@frappe.whitelist(methods=["POST"])
def kontakt_freigabe(projektId=None, interesseId=None, an=True, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	p = projekt_laden(projektId)
	iid = v.kennung(interesseId)
	i = frappe.get_doc("Plattform Interesse", iid) if iid and frappe.db.exists("Plattform Interesse", iid) else None
	if not i or i.projekt_id != p.name:
		nicht_gefunden("Interessent nicht gefunden.")
	vorhanden = frappe.db.get_value("Plattform Kontaktfreigabe", {"projekt_id": p.name, "interesse_id": i.name}, "name")
	an = v.wahr(an) or an is True
	if an and not vorhanden:
		v.pflicht(i.status in DATENRAUM_STATUS, "Kontakte können erst nach Datenraum-Freigabe freigegeben werden.")
		frappe.get_doc({"doctype": "Plattform Kontaktfreigabe", "projekt_id": p.name, "interesse_id": i.name, "investor_id": i.investor_id, "von_id": n.id, "am": jetzt()}).insert(ignore_permissions=True)
		benachrichtigen(i.investor_id, "nda", f"Kontaktfreigabe: {p.titel}", "ÖkoInvest hat den direkten Kontakt zum Anbieter freigegeben.", deal_link(p.name), "interesse", i.name, mail_text=MAIL_DEAL)
		benachrichtigen(p.anbieter_id, "nachricht", f"Kontaktfreigabe: {p.titel}", "ÖkoInvest hat den Kontakt zu einem Interessenten freigegeben.", deal_link(p.name), "projekt", p.name, mail_text=MAIL_DEAL)
		protokoll(n, "kontaktfreigabe", "interesse", i.name, f"Kontaktfreigabe Anbieter ↔ Investor für {p.name}")
	elif not an and vorhanden:
		frappe.delete_doc("Plattform Kontaktfreigabe", vorhanden, ignore_permissions=True, force=True)
		protokoll(n, "kontaktfreigabe", "interesse", i.name, f"Kontaktfreigabe zurückgenommen für {p.name}")
	return {"projektId": p.name, "interesseId": i.name, "kontaktFrei": bool(an)}


# ================================================================ Datenraum 2.0


def _meta(d):
	e = frappe.db.get_value("Plattform Datenraum Eintrag", {"dokument_id": d.name}, ["ordner", "stufe", "version_von"], as_dict=True)
	if e:
		return {"ordner": e.ordner if e.ordner in DATENRAUM_ORDNER_IDS else ordner_vorschlag(d.dateiname, d.checkliste), "stufe": 2 if str(e.stufe) == "2" else 1, "versionVon": e.version_von or None}
	return {"ordner": ordner_vorschlag(d.dateiname, d.checkliste), "stufe": 1, "versionVon": None}


def _zugriff(projekt_id, nutzer_id, interesse_id, art, dokument_id=None, dokument_name="", ip=""):
	frappe.get_doc(
		{"doctype": "Plattform Zugriff", "am": jetzt(), "projekt_id": projekt_id, "nutzer_id": nutzer_id, "interesse_id": interesse_id, "art": art, "dokument_id": dokument_id, "dokument_name": v.text(dokument_name, 160), "ip": v.text(ip, 64)}
	).insert(ignore_permissions=True)


def datenraum_fuer(n, projekt_id, besuch=False, ip=""):
	p = projekt_laden(projekt_id)
	rolle, interesse = rolle_im(n, p)
	if rolle == "investor" and v.wahr(besuch):
		letzte = frappe.db.get_value("Plattform Zugriff", {"projekt_id": p.name, "nutzer_id": n.id, "art": "datenraum"}, "am", order_by="am desc")
		if not letzte or (now_datetime() - get_datetime(letzte)).total_seconds() > 30 * 60:
			_zugriff(p.name, n.id, interesse.name, "datenraum", ip=ip)
	stufe = _stufe(interesse) if rolle == "investor" else 2
	filters = {"bezug_art": "projekt", "bezug_id": p.name}
	if rolle == "investor":
		filters["kategorie"] = "datenraum"
	doks = frappe.get_all("Plattform Dokument", filters=filters, fields=["*"], order_by="am desc")
	metas = {d.name: _meta(d) for d in doks}
	nachfolger = {m["versionVon"]: k for k, m in metas.items() if m["versionVon"] in metas}
	nach_id = {d.name: d for d in doks}
	eintraege = []
	for d in doks:
		if d.name in nachfolger:
			continue
		kette, x, gesehen = [], d, set()
		while x and x.name not in gesehen:
			gesehen.add(x.name)
			kette.append(x)
			vv = metas[x.name]["versionVon"]
			x = nach_id.get(vv) if vv else None
		m = metas[d.name]
		version = len(kette)
		eintraege.append(
			{
				"id": d.name,
				"name": d.dateiname,
				"mime": d.mime,
				"groesse": cint(d.groesse),
				"am": iso(d.am),
				"kategorie": d.kategorie,
				"checkliste": d.checkliste or "",
				"ordner": m["ordner"],
				"stufe": m["stufe"],
				"version": version,
				"gesperrt": rolle == "investor" and m["stufe"] > stufe,
				"versionen": [{"id": k.name, "name": k.dateiname, "am": iso(k.am), "groesse": cint(k.groesse), "version": version - idx - 1, "gesperrt": rolle == "investor" and metas[k.name]["stufe"] > stufe} for idx, k in enumerate(kette[1:])],
				"eigenerUpload": d.hochgeladen_von == n.id,
			}
		)
	ordner = [{"id": oid, "nr": nr, "label": label, "text": ORDNER_TEXT[oid], "dokumente": sorted([e for e in eintraege if e["ordner"] == oid], key=lambda e: e["name"].lower())} for oid, nr, label in DATENRAUM_ORDNER]
	return {"rolle": rolle, "stufe": stufe, "ordner": ordner, "anzahl": len(eintraege), "gesperrt": sum(1 for e in eintraege if e["gesperrt"]), "projekt": {"id": p.name, "titel": p.titel}}


@frappe.whitelist(methods=["POST"])
def datenraum(projektId=None, besuch=None, ip=None, als_benutzer=None):
	return datenraum_fuer(nutzer(als_benutzer), projektId, besuch=besuch, ip=ip or "")


@frappe.whitelist(methods=["POST"])
def einordnen(dokumentId=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else {}
	k = v.kennung(dokumentId)
	dok = frappe.get_doc("Plattform Dokument", k) if k and frappe.db.exists("Plattform Dokument", k) else None
	if not dok or dok.bezug_art != "projekt":
		nicht_gefunden("Dokument nicht gefunden.")
	p = projekt_laden(dok.bezug_id)
	rolle, _ = rolle_im(n, p)
	if rolle not in ("admin", "anbieter"):
		verboten()
	alt = _meta(dok)
	neu = dict(alt)
	if "ordner" in d and d.get("ordner") is not None:
		neu["ordner"] = v.auswahl(d.get("ordner"), DATENRAUM_ORDNER_IDS, alt["ordner"])
	if "stufe" in d and d.get("stufe") is not None:
		neu["stufe"] = 2 if cint(d.get("stufe")) == 2 else 1
	if "versionVon" in d:
		vv = v.kennung(d.get("versionVon")) if d.get("versionVon") else None
		if vv:
			vor = frappe.db.get_value("Plattform Dokument", vv, ["name", "bezug_art", "bezug_id", "dateiname", "checkliste"], as_dict=True)
			v.pflicht(vor and vor.bezug_art == "projekt" and vor.bezug_id == p.name and vor.name != dok.name, "Vorversion muss ein anderes Dokument desselben Projekts sein.")
			belegt = frappe.db.get_value("Plattform Datenraum Eintrag", {"version_von": vv, "dokument_id": ("!=", dok.name)}, "name")
			if belegt:
				konflikt("Zu diesem Dokument gibt es bereits eine neuere Version.")
			x, gesehen = vv, {dok.name}
			while x:
				if x in gesehen:
					konflikt("Versionen dürfen keinen Kreis bilden.")
				gesehen.add(x)
				x = frappe.db.get_value("Plattform Datenraum Eintrag", {"dokument_id": x}, "version_von")
			vm = _meta(frappe._dict(name=vor.name, dateiname=vor.dateiname, checkliste=vor.checkliste))
			if d.get("ordner") is None:
				neu["ordner"] = vm["ordner"]
			if d.get("stufe") is None:
				neu["stufe"] = vm["stufe"]
		neu["versionVon"] = vv
	name = frappe.db.get_value("Plattform Datenraum Eintrag", {"dokument_id": dok.name}, "name")
	e = frappe.get_doc("Plattform Datenraum Eintrag", name) if name else frappe.get_doc({"doctype": "Plattform Datenraum Eintrag", "dokument_id": dok.name, "projekt_id": p.name})
	e.update({"ordner": neu["ordner"], "stufe": str(neu["stufe"]), "version_von": neu["versionVon"]})
	e.save(ignore_permissions=True) if name else e.insert(ignore_permissions=True)
	label = next((lb for oid, _, lb in DATENRAUM_ORDNER if oid == neu["ordner"]), "")
	protokoll(n, "datenraum", "projekt", p.name, f"Datenraum: {dok.dateiname} → {label}, Stufe {neu['stufe']}" + (", neue Version" if neu["versionVon"] else ""))
	return {"id": dok.name, **neu}


@frappe.whitelist(methods=["POST"])
def dokument(id=None, ip=None, anzeigen=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	d = frappe.get_doc("Plattform Dokument", k) if k and frappe.db.exists("Plattform Dokument", k) else None
	if not d or d.bezug_art != "projekt":
		nicht_gefunden("Dokument nicht gefunden.")
	p = projekt_laden(d.bezug_id)
	admin = ist_admin(n)
	anbieter = p.anbieter_id == n.id
	i = frappe.db.get_value("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}, ["name", "status"], as_dict=True)
	if not admin and not anbieter:
		if not i or i.status not in DATENRAUM_STATUS or d.kategorie != "datenraum":
			verboten()
		if not stufe_ok(p.name, d.name, n.id):
			verboten("Dieses Dokument ist für Stufe 2 (nach LOI bzw. Zulassung zur verbindlichen Runde) freigegeben.")
	if not darf_dokument(n, d):
		verboten()
	if not d.datei_id or not frappe.db.exists("File", d.datei_id):
		nicht_gefunden("Dokument nicht gefunden.")
	datei = frappe.get_doc("File", d.datei_id)
	with open(datei.get_full_path(), "rb") as fh:
		inhalt = fh.read()
	if d.sha256 and sha256(inhalt) != d.sha256:
		frappe.log_error(title="ÖkoInvest: Prüfsumme eines Dokuments stimmt nicht", message=f"Dokument {d.name}")
		frappe.throw("Das Dokument ist beschädigt. Bitte wenden Sie sich an das Backoffice.", frappe.ValidationError)
	if not admin and not anbieter:
		_zugriff(p.name, n.id, i.name if i else None, "ansehen" if v.wahr(anzeigen) else "download", d.name, d.dateiname, ip or "")
	protokoll(n, "download", "projekt", p.name, f"Dokument {d.dateiname} {'angesehen' if v.wahr(anzeigen) else 'heruntergeladen'} (Datenraum)", ip or "")
	return {"meta": dokument_meta(d), "inhaltBase64": base64.b64encode(inhalt).decode("ascii"), "dateiname": wasserzeichen_name(d.dateiname, n.get("vorname"), n.get("nachname"))}


def zugriffe_fuer(n, projekt_id, limit=300):
	p = projekt_laden(projekt_id)
	rolle, _ = rolle_im(n, p)
	if rolle not in ("admin", "anbieter"):
		verboten("Das Zugriffsprotokoll sehen Anbieter und Backoffice.")
	pseudo = pseudonyme(p.name)
	investoren = {i.investor_id: i.name for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name}, fields=["name", "investor_id"])}
	eintraege = [
		{"am": iso(z.am), "art": z.art, "dokumentId": z.dokument_id, "dokumentName": z.dokument_name or "", "interesseId": z.interesse_id or investoren.get(z.nutzer_id), "ip": z.ip if rolle == "admin" else None}
		for z in frappe.get_all("Plattform Zugriff", filters={"projekt_id": p.name, "nutzer_id": ("in", list(investoren) or ["-"])}, fields=["am", "art", "dokument_id", "dokument_name", "interesse_id", "nutzer_id", "ip"], order_by="am desc", limit_page_length=2000)
	]
	for a in frappe.get_all("Plattform Aktivitaet", filters={"aktion": "download", "objekt_art": "projekt", "objekt_id": p.name, "nutzer_id": ("in", list(investoren) or ["-"])}, fields=["am", "text", "nutzer_id", "ip"], limit_page_length=2000):
		if str(a.text or "").endswith("(Datenraum)"):
			continue
		name = str(a.text or "").removeprefix("Dokument ").removesuffix(" geöffnet")
		eintraege.append({"am": iso(a.am), "art": "download", "dokumentId": None, "dokumentName": name, "interesseId": investoren.get(a.nutzer_id), "ip": a.ip if rolle == "admin" else None})
	eintraege.sort(key=lambda e: e["am"] or "", reverse=True)
	pro = OrderedDict()
	for e in eintraege:
		x = pro.setdefault(e["interesseId"], {"zugriffe": 0, "besuche": 0, "dokumente": [], "letzter": e["am"], "erster": e["am"]})
		x["zugriffe"] += 1
		if e["art"] == "datenraum":
			x["besuche"] += 1
		elif e["dokumentName"] and e["dokumentName"] not in x["dokumente"]:
			x["dokumente"].append(e["dokumentName"])
		x["letzter"] = max(x["letzter"], e["am"])
		x["erster"] = min(x["erster"], e["am"])
	anzeige = lambda iid: investor_anzeige(rolle, p.name, iid, pseudo)  # noqa: E731
	return {
		"rolle": rolle,
		"investoren": [{**anzeige(iid), **({"interesseId": iid} if rolle == "admin" else {}), **x} for iid, x in pro.items()],
		"eintraege": [{**{k2: w for k2, w in e.items() if k2 != "interesseId" or rolle == "admin"}, "von": anzeige(e["interesseId"])} for e in eintraege[: max(1, min(1000, cint(limit) or 300))]],
	}


@frappe.whitelist(methods=["POST"])
def zugriffe(projektId=None, limit=None, als_benutzer=None):
	return zugriffe_fuer(nutzer(als_benutzer), projektId, limit or 300)


# ================================================================ Investor-Pipeline


def _profil(p, idx):
	zahl = lambda x, m: v.zahl(x, min=0, max=m)  # noqa: E731
	schwelle = v.zahl(p.get("schwelle"), min=SUCHPROFIL_SCHWELLE["min"], max=SUCHPROFIL_SCHWELLE["max"])
	return {
		"name": v.text(p.get("name"), 60) or f"Suchprofil {idx + 1}",
		"mwpMin": zahl(p.get("mwpMin"), 5000),
		"mwpMax": zahl(p.get("mwpMax"), 5000),
		"phasen": v.mehrfach(p.get("phasen"), PHASEN_IDS),
		"laender": v.mehrfach(p.get("laender"), list(LAENDER)),
		"typen": v.mehrfach(p.get("typen"), list(PROJEKT_TYPEN)),
		"ticketMin": zahl(p.get("ticketMin"), 1e11),
		"ticketMax": zahl(p.get("ticketMax"), 1e11),
		"schwelle": schwelle if schwelle is not None else SUCHPROFIL_SCHWELLE["standard"],
	}


def _suchprofile(n):
	return [{"id": s.name, **(aus_json(s.profil, {}) or {}), "name": s.titel} for s in frappe.get_all("Plattform Suchprofil", filters={"nutzer_id": n.id}, fields=["name", "titel", "profil", "reihenfolge"], order_by="reihenfolge asc")]


@frappe.whitelist(methods=["POST"])
def pipeline(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not hat_rolle(n, ["investor"]):
		verboten("Die Deal-Pipeline steht Investoren zur Verfügung.")
	notizen = {x.projekt_id: x for x in frappe.get_all("Plattform Notiz", filters={"nutzer_id": n.id}, fields=["projekt_id", "text", "tags", "spalte", "modified"])}
	karten = []
	for i in frappe.get_all("Plattform Interesse", filters={"investor_id": n.id}, fields=["name", "projekt_id", "status", "gemerkt", "modified"]):
		if not frappe.db.exists("Plattform Projekt", i.projekt_id):
			continue
		p = frappe.get_doc("Plattform Projekt", i.projekt_id)
		gebote = frappe.get_all("Plattform Gebot", filters={"interesse_id": i.name, "status": ("!=", "zurueckgezogen")}, fields=["preis_modus", "preis", "preis_pro_kwp", "runde", "status", "am"], order_by="am desc")
		zuschlag = any(g.status == "zuschlag" for g in gebote)
		auto = pipeline_spalte(i.status, bool(gebote), zuschlag)
		notiz = notizen.get(p.name)
		if not cint(i.gemerkt) and i.status == "gemerkt" and not notiz:
			continue
		eigen = notiz.spalte if notiz and notiz.spalte in PIPELINE_SPALTEN else ""
		letzt = gebote[0] if gebote else None
		karten.append(
			{
				"interesseId": i.name,
				"status": i.status,
				"statusLabel": status_label("interesse", i.status),
				"spalteAuto": auto,
				"spalte": eigen or auto,
				"manuell": bool(eigen and eigen != auto),
				"projekt": projekt_oeffentlich_aus_doc(p),
				"projektStatus": p.status,
				"notiz": {"text": notiz.text or "", "tags": aus_json(notiz.tags, []) or [], "geaendertAm": iso(notiz.modified)} if notiz else None,
				"gebote": len(gebote),
				"letztesGebot": {"preisGesamt": gebot_gesamt(letzt.preis_modus, letzt.preis, letzt.preis_pro_kwp, p.mwp), "runde": cint(letzt.runde), "status": letzt.status, "am": iso(letzt.am)} if letzt else None,
				"dealroom": i.status in DATENRAUM_STATUS,
				"geaendertAm": max(x for x in (iso(i.modified), iso(notiz.modified) if notiz else None) if x),
			}
		)
	karten.sort(key=lambda k: k["geaendertAm"] or "", reverse=True)
	aktiv = [k for k in karten if k["spalteAuto"] in AKTIVE_SPALTEN]
	mit_preis = [k for k in aktiv if k["projekt"].get("preisModus") != "anfrage" and (k["projekt"].get("preisProKwp") or k["projekt"].get("preis")) and k["projekt"].get("mwp")]
	kwp = sum(flt(k["projekt"]["mwp"]) * 1000 for k in mit_preis)
	preis = sum(flt(k["projekt"]["preisProKwp"]) * flt(k["projekt"]["mwp"]) * 1000 if k["projekt"].get("preisModus") == "proKwp" else flt(k["projekt"].get("preis")) for k in mit_preis)

	def verteilung(feld):
		o = {}
		for k in aktiv:
			key = k["projekt"].get(feld) or "–"
			x = o.setdefault(key, {"anzahl": 0, "mwp": 0})
			x["anzahl"] += 1
			x["mwp"] = round(x["mwp"] + flt(k["projekt"].get("mwp")), 1)
		return o

	sichtbar = [projekt_oeffentlich_aus_doc(frappe.get_doc("Plattform Projekt", x)) for x in frappe.get_all("Plattform Projekt", filters={"status": ("in", BOERSE_STATUS)}, pluck="name")]
	profile = []
	for sp in _suchprofile(n):
		treffer = sorted(((q, matching(q, sp)) for q in sichtbar), key=lambda t: -t[1]["score"])
		treffer = [t for t in treffer if t[1]["score"] >= (sp.get("schwelle") or SUCHPROFIL_SCHWELLE["standard"])]
		profile.append({**sp, "treffer": len(treffer), "beste": [{"id": q["id"], "titel": q["titel"], "score": m["score"]} for q, m in treffer[:3]]})
	gewonnen = [k for k in karten if k["spalteAuto"] == "gewonnen"]
	return {
		"karten": karten,
		"tags": sorted({t for k in karten for t in ((k["notiz"] or {}).get("tags") or [])}, key=str.lower),
		"suchprofile": profile,
		"kennzahlen": {
			"aktiv": len(aktiv),
			"mwpPipeline": round(sum(flt(k["projekt"].get("mwp")) for k in aktiv), 1),
			"preisProKwpMittel": round(preis / kwp) if kwp else None,
			"preisBasis": len(mit_preis),
			"gewonnen": len(gewonnen),
			"mwpGewonnen": round(sum(flt(k["projekt"].get("mwp")) for k in gewonnen), 1),
			"verloren": sum(1 for k in karten if k["spalteAuto"] == "verloren"),
			"laender": verteilung("land"),
			"phasen": verteilung("phase"),
			"typen": verteilung("typ"),
		},
	}


@frappe.whitelist(methods=["POST"])
def notiz_speichern(projektId=None, text=None, tags=None, spalte=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not hat_rolle(n, ["investor"]):
		verboten("Notizen stehen Investoren zur Verfügung.")
	p = projekt_laden(projektId)
	if not frappe.db.exists("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}):
		konflikt("Bitte merken Sie das Projekt zuerst.")
	name = frappe.db.get_value("Plattform Notiz", {"nutzer_id": n.id, "projekt_id": p.name}, "name")
	x = frappe.get_doc("Plattform Notiz", name) if name else frappe.get_doc({"doctype": "Plattform Notiz", "nutzer_id": n.id, "projekt_id": p.name, "text": "", "tags": "[]", "spalte": ""})
	if text is not None:
		x.text = v.mehrzeilig(text, 4000)
	if tags is not None:
		x.tags = als_json(list(dict.fromkeys(t.lstrip("#") for t in v.text_liste(tags, maximal=NOTIZ_TAGS_MAX, laenge=30) if t.lstrip("#"))))
	if spalte is not None:
		x.spalte = v.auswahl(spalte, PIPELINE_SPALTEN, "")
	x.save(ignore_permissions=True) if name else x.insert(ignore_permissions=True)
	return {"projektId": p.name, "text": x.text or "", "tags": aus_json(x.tags, []) or [], "spalte": x.spalte or "", "geaendertAm": iso(x.modified)}


@frappe.whitelist(methods=["POST"])
def suchprofile_speichern(profile=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not hat_rolle(n, ["investor"]):
		verboten("Suchprofile stehen Investoren zur Verfügung.")
	v.pflicht(isinstance(profile, list), "Ungültige Suchprofile.")
	v.pflicht(len(profile) <= SUCHPROFILE_MAX, f"Höchstens {SUCHPROFILE_MAX} Suchprofile.")
	liste = [_profil(p if isinstance(p, dict) else {}, i) for i, p in enumerate(profile)]
	vorhanden = {s.name for s in frappe.get_all("Plattform Suchprofil", filters={"nutzer_id": n.id}, fields=["name"])}
	behalten = set()
	out = []
	for idx, (roh, sp) in enumerate(zip(profile, liste)):
		sid = v.kennung((roh or {}).get("id")) if isinstance(roh, dict) else ""
		name = {k: w for k, w in sp.items() if k != "name"}
		if sid in vorhanden:
			doc = frappe.get_doc("Plattform Suchprofil", sid)
			doc.update({"titel": sp["name"], "reihenfolge": idx, "profil": als_json(name)})
			doc.save(ignore_permissions=True)
		else:
			doc = frappe.get_doc({"doctype": "Plattform Suchprofil", "nutzer_id": n.id, "titel": sp["name"], "reihenfolge": idx, "profil": als_json(name)}).insert(ignore_permissions=True)
		behalten.add(doc.name)
		out.append({"id": doc.name, **sp})
	for alt in vorhanden - behalten:
		frappe.delete_doc("Plattform Suchprofil", alt, ignore_permissions=True, force=True)
	protokoll(n, "suchprofile", "nutzer", n.id, f"{len(out)} Suchprofile gespeichert")
	return out


# ================================================================ Anbieter-Cockpit & Backoffice


def _war_in(i, status):
	if i.status == status:
		return True
	return bool(frappe.db.exists("Plattform Statusverlauf", {"parent": i.name, "parenttype": "Plattform Interesse", "status": status}))


@frappe.whitelist(methods=["POST"])
def cockpit(projektId=None, tage=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	p = projekt_laden(projektId)
	rolle, _ = rolle_im(n, p)
	if rolle not in ("admin", "anbieter"):
		verboten("Das Cockpit sehen Anbieter und Backoffice.")
	ints = [frappe.get_doc("Plattform Interesse", x) for x in frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name}, pluck="name")]
	bieter = set(frappe.get_all("Plattform Gebot", filters={"projekt_id": p.name, "status": ("!=", "zurueckgezogen")}, pluck="interesse_id"))
	trichter = [
		{"id": "aufrufe", "label": "Aufrufe", "wert": cint(p.aufrufe)},
		{"id": "merker", "label": "Merker", "wert": sum(1 for i in ints if cint(i.gemerkt) or i.status != "gemerkt")},
		{"id": "nda", "label": "NDA", "wert": sum(1 for i in ints if aus_json(i.nda) or i.status != "gemerkt")},
		{"id": "datenraum", "label": "Datenraum", "wert": sum(1 for i in ints if _war_in(i, "nda_freigegeben"))},
		{"id": "angebote", "label": "Angebote", "wert": sum(1 for i in ints if aus_json(i.loi) or i.name in bieter)},
	]
	anzahl = min(365, max(7, cint(tage) or 60))
	start = add_days(nowdate(), -(anzahl - 1))
	werte = {str(a.tag): cint(a.anzahl) for a in frappe.get_all("Plattform Projektaufruf", filters={"projekt_id": p.name, "tag": (">=", start)}, fields=["tag", "anzahl"])}
	verlauf = [{"tag": str(add_days(start, t)), "aufrufe": werte.get(str(add_days(start, t)), 0)} for t in range(anzahl)]
	qa = qa_api.liste_fuer(n, p.name)
	bv = bieter_api.verfahren_fuer(n, p.name)
	zg = zugriffe_fuer(n, p.name, 20)
	return {
		"rolle": rolle,
		"projekt": {"id": p.name, "titel": p.titel, "status": p.status, "veroeffentlichtAm": iso(p.veroeffentlicht_am), "mwp": flt(p.mwp)},
		"trichter": trichter,
		"verlauf": verlauf,
		"aufrufeZeitraum": sum(x["aufrufe"] for x in verlauf),
		"fragen": {"offen": [f for f in qa["fragen"] if f["status"] == "freigegeben"], "zaehler": qa["zaehler"]},
		"bieter": bv["verfahren"],
		"zugriffe": {"investoren": zg["investoren"][:8], "letzte": zg["eintraege"][:8]},
	}


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	titel = {}
	pseudo = {}
	fragen = []
	for f in frappe.get_all("Plattform Frage", filters={"status": ("in", ["eingereicht", "beantwortet", "freigegeben"])}, fields=["*"], order_by="creation asc", limit_page_length=500):
		if f.projekt_id not in titel:
			titel[f.projekt_id] = frappe.db.get_value("Plattform Projekt", f.projekt_id, "titel") or f.projekt_id
			pseudo[f.projekt_id] = pseudonyme(f.projekt_id)
		fragen.append({**qa_api.frage_json(f, "admin", n, pseudo[f.projekt_id]), "projektTitel": titel[f.projekt_id]})
	moderation = [f for f in fragen if f["status"] in ("eingereicht", "beantwortet")]
	return {
		"moderation": moderation,
		"beimAnbieter": [f for f in fragen if f["status"] == "freigegeben"],
		"verfahren": bieter_api.liste_fuer(n),
		"kennzahlen": {
			"fragenGesamt": frappe.db.count("Plattform Frage"),
			"moderation": len(moderation),
			"ueberfaellig": sum(1 for f in fragen if f.get("ueberfaellig")),
			"zugriffe7": frappe.db.count("Plattform Zugriff", {"am": (">=", add_days(now_datetime(), -7))}),
			"kontaktfreigaben": frappe.db.count("Plattform Kontaktfreigabe"),
		},
	}
