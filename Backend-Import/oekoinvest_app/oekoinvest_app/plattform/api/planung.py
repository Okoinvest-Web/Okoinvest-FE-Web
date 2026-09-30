# Copyright (c) 2026, ÖkoInvest GmbH
#
# Planungsdateien (CAD) & Projektkostenkalkulation (docs/API.md, Abschnitt „Planungsdateien & Projektkosten“) –
# Referenz: src/lib/plattform/backend/demo/planung.js, Adapter src/lib/plattform/backend/frappe/planung.js.
#
# Rechte (Rolle UND Eigentum, jede Methode selbst; Grundlage sind die Zugriffe der Projektentwicklung):
#   Pläne        Backoffice mit Bereich „entwicklung“ lesen/schreiben; Gutachter/Planer nur Pläne an ihnen zugewiesenen
#                Meilensteinen bzw. eigene Pläne (hochladen, „zur Prüfung“); Co-Investor (Freigabe mit „Dokumente“) nur
#                freigegebene Versionen; Eigentümer und alle anderen → 403.
#   Kalkulation  nur Backoffice (lesen ≥ 1, schreiben = 2).
#
# Formaterkennung und DXF-/Geo-Analyse macht die Website (derselbe Parser wie die Vorschau) und schickt sie mit; Frappe
# prüft die Kennung der ersten Bytes zusätzlich (planung_kern.erkennen) und legt Dateien privat ab.
# DWG → DXF: Hintergrundjob über den CAD-Konverter (Backend-Import/dienste/cad-konverter), nur wenn site_config
#   "cad_konverter_url" und "cad_konverter_token" (≥ 32 Zeichen) gesetzt sind; TLS-Prüfung bleibt an (requests-Standard).
# Kalkulation: Frappe liefert Rohdaten (wie kalkulationAusgabe in src/lib/plattform/planung/ausgabe.js erwartet) und rechnet
#   Summen für Liste/Druck mit planung_kern (Parität zu kosten.js per Test).

import base64
import binascii
import re
import secrets

import frappe
from frappe.utils import cint, flt, now_datetime, nowdate

from oekoinvest_app.plattform import planung_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.api import entwicklung as E
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import aus_json, als_json, iso, konflikt, name_von, nicht_gefunden, nutzer, protokoll, ungueltig, verboten

DT_PLAN = "Plattform Planunterlage"
DT_VER = "Plattform Planversion"
DT_KALK = "Plattform Kostenkalkulation"
DT_STAND = "Plattform Kostenstand"
DT_ZIEL = "Plattform Akquise Ziel"
MAX_BASE64 = (30 * 1024 * 1024 + 2) // 3 * 4 + 16


# ================================================================ Zugriff


def _kontext(n, p):
	liste = E._ms_liste(p.name)
	fg = E._freigabe(n, p.name)
	return {
		"backoffice": E.bo_lesen(n), "schreiben": E.bo_schreiben(n), "nutzer_id": n.id,
		"gutachter_ms": {m["id"] for m in E._gutachter_ms(n, p.name, liste)},
		"investor": {"dokumente": cint(fg.dokumente)} if fg else None,
	}


def _hat_zugriff(z):
	return z["backoffice"] or z["gutachter_ms"] or (z["investor"] and z["investor"]["dokumente"])


def _plan_dict(pl):
	return {"meilenstein_id": pl.meilenstein_id, "planer_id": pl.planer_id}


def _versionen(plan_name):
	return frappe.get_all(DT_VER, filters={"plan_id": plan_name}, fields=["*"], order_by="creation desc", limit_page_length=0)


def _person(kid):
	return {"id": kid, "name": name_von(kid)} if kid else None


# ================================================================ Ausgabe


def _version_json(x, z, planer):
	basis = f"/api/portal/planung/versionen/{x.name}"
	art = {"dxf": "dxf", "pdf": "pdf", "geojson": "geojson", "kml": "kml"}.get(x.format) or (x.abgeleitet_art or None)
	link = f"{basis}?abgeleitet=1" if x.abgeleitet_datei and x.format not in ("dxf", "geojson", "kml", "pdf") else basis
	analyse = aus_json(x.analyse, {}) or {}
	voll = z["backoffice"] or planer
	return {
		"id": x.name, "planId": x.plan_id, "projektId": x.projekt_id, "index": x.aenderungsindex, "format": x.format, "formatLabel": K.FORMATE.get(x.format, {}).get("label", x.format),
		"planstand": str(x.planstand) if x.planstand else None, "planer": x.planer or "", "aenderung": x.aenderung or "", "status": x.status, "statusLabel": K.PLAN_STATUS.get(x.status, x.status),
		"datei": {"name": x.dateiname, "groesse": cint(x.groesse), "mime": x.mime},
		"abgeleitet": {"name": x.abgeleitet_name, "art": x.abgeleitet_art} if x.abgeleitet_datei else None,
		"konvertierung": {"status": x.konvertierung_status, "hinweis": x.konvertierung_hinweis or ""} if x.format == "dwg" else None,
		"link": basis, "vorschau": {"art": art, "link": link, "seite": f"/portal/planung/{x.name}"} if art else None,
		"von": name_von(x.von_id) or "", "vonId": x.von_id if voll else None, "am": iso(x.am),
		"statusVerlauf": [{**s, "von": name_von(s.get("vonId")) or ""} for s in (aus_json(x.status_verlauf, []) or [])] if z["backoffice"] else None,
		"analyse": analyse if voll else ({"einheit": analyse.get("einheit"), "groesse": analyse.get("groesse")} if analyse else None),
	}


def _plan_json(pl, z):
	alle = _versionen(pl.name)
	zg = K.plan_zugriff(z, _plan_dict(pl), alle)
	sichtbar = [x for x in alle if zg["version"](x)]
	aktuell = next((x for x in sichtbar if x.status == "freigegeben"), sichtbar[0] if sichtbar else None)
	ms_titel = frappe.db.get_value("Plattform Entwicklung Meilenstein", pl.meilenstein_id, "titel") if pl.meilenstein_id else None
	return {
		"id": pl.name, "projektId": pl.projekt_id, "plannummer": pl.plannummer, "titel": pl.titel, "planart": pl.planart, "planartLabel": K.PLANARTEN.get(pl.planart, pl.planart),
		"massstab": pl.massstab, "blattformat": pl.blattformat, "meilensteinId": pl.meilenstein_id or None, "meilenstein": {"id": pl.meilenstein_id, "titel": ms_titel} if ms_titel else None,
		"planer": pl.planer or "", "planerKonto": _person(pl.planer_id) if z["backoffice"] else None, "erstelltAm": iso(pl.creation),
		"index": aktuell.aenderungsindex if aktuell else "", "status": aktuell.status if aktuell else "entwurf", "statusLabel": K.PLAN_STATUS.get(aktuell.status if aktuell else "entwurf"),
		"versionen": [_version_json(x, z, zg["planer"]) for x in sichtbar], "darfHochladen": zg["hochladen"], "istPlaner": zg["planer"],
	}


def _plaene(p, z):
	out = []
	for name in frappe.get_all(DT_PLAN, filters={"projekt_id": p.name}, pluck="name", order_by="plannummer asc", limit_page_length=0):
		pj = _plan_json(frappe.get_doc(DT_PLAN, name), z)
		if z["backoffice"] or pj["versionen"] or pj["istPlaner"]:
			out.append(pj)
	return out


def _aktuell_setzen(plan_name):
	vers = _versionen(plan_name)
	akt = next((x for x in vers if x.status == "freigegeben"), vers[0] if vers else None)
	if akt:
		frappe.db.set_value(DT_PLAN, plan_name, {"status": akt.status, "aktueller_index": akt.aenderungsindex}, update_modified=False)


# ================================================================ Pläne


@frappe.whitelist(methods=["POST"])
def liste(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	p = E._projekt(projektId)
	z = _kontext(n, p)
	if not _hat_zugriff(z):
		verboten("Kein Zugriff auf die Pläne dieses Projekts.")
	ms = [{"id": m["id"], "titel": m["titel"]} for m in E._ms_liste(p.name) if z["backoffice"] or m["id"] in z["gutachter_ms"]]
	return {
		"projekt": {"id": p.name, "titel": p.titel, "typ": p.typ}, "plaene": _plaene(p, z),
		"rechte": {"backoffice": z["backoffice"], "schreiben": z["schreiben"], "neuerPlan": z["schreiben"] or bool(z["gutachter_ms"])},
		"meilensteine": ms, "konverter": _konverter_konfiguriert(),
		"auswahl": {"planarten": K.PLANARTEN, "massstaebe": K.MASSSTAEBE, "blattformate": K.BLATTFORMATE, "aktionen": {"einreichen": "Zur Prüfung geben", "freigeben": "Freigeben", "zurueckweisen": "Zurückweisen", "zurueckziehen": "Freigabe zurücknehmen"}},
	}


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	projekte = set()
	if "gutachter" in (n.get("rollen") or []):
		projekte |= set(frappe.get_all("Plattform Entwicklung Meilenstein", filters={"gutachter_ids": ["like", f"%{n.id}%"]}, pluck="projekt_id", limit_page_length=0))
	if "investor" in (n.get("rollen") or []):
		projekte |= set(frappe.get_all("Plattform Entwicklung Freigabe", filters={"dokumente": 1}, pluck="projekt_id", limit_page_length=0))
	if E.bo_lesen(n):
		projekte |= set(frappe.get_all(E.DT, pluck="name", limit_page_length=0))
	out = []
	for pid in sorted(projekte):
		p = frappe.get_doc(E.DT, pid)
		z = _kontext(n, p)
		if not _hat_zugriff(z):
			continue
		plaene = _plaene(p, z)
		if plaene or z["gutachter_ms"]:
			out.append({"projekt": {"id": p.name, "titel": p.titel}, "plaene": plaene})
	return out


def _plan_daten(d, alt=None):
	d = d or {}
	alt = alt or {}
	x = {
		"plannummer": v.text(d.get("plannummer", alt.get("plannummer")), 40), "titel": v.text(d.get("titel", alt.get("titel")), 160),
		"planart": v.auswahl(d.get("planart", alt.get("planart")), list(K.PLANARTEN), "sonstiges"),
		"massstab": v.auswahl(d.get("massstab", alt.get("massstab")), K.MASSSTAEBE, "ohne"),
		"blattformat": v.auswahl(d.get("blattformat", alt.get("blattformat")), K.BLATTFORMATE, "digital"),
		"planer": v.text(d.get("planer", alt.get("planer")), 120),
	}
	if not x["plannummer"]:
		ungueltig("Bitte eine Plannummer angeben.")
	if not x["titel"]:
		ungueltig("Bitte einen Plantitel angeben.")
	return x


def _nummer_frei(pid, nummer, ausser=None):
	for name, nr in frappe.get_all(DT_PLAN, filters={"projekt_id": pid}, fields=["name", "plannummer"], as_list=True, limit_page_length=0):
		if (nr or "").lower() == nummer.lower() and name != ausser:
			konflikt(f"Plannummer „{nummer}“ ist bereits vergeben – bitte als neuen Planstand zum bestehenden Plan hochladen.")


@frappe.whitelist(methods=["POST"])
def plan_speichern(projektId=None, id=None, daten=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	p = E._projekt(projektId)
	daten = frappe.parse_json(daten) if isinstance(daten, str) else (daten or {})
	ms_id = v.kennung(daten.get("meilenstein_id") or daten.get("meilensteinId"))
	if ms_id and not frappe.db.exists("Plattform Entwicklung Meilenstein", {"name": ms_id, "projekt_id": p.name}):
		ungueltig("Meilenstein gehört nicht zu diesem Projekt.")
	if id:
		k = v.kennung(id)
		if not k or not frappe.db.exists(DT_PLAN, {"name": k, "projekt_id": p.name}):
			nicht_gefunden("Plan nicht gefunden.")
		pl = frappe.get_doc(DT_PLAN, k)
		x = _plan_daten(daten, pl.as_dict())
		_nummer_frei(p.name, x["plannummer"], pl.name)
		pl.update({**x, "meilenstein_id": ms_id or None})
		pl.save(ignore_permissions=True)
	else:
		x = _plan_daten(daten)
		_nummer_frei(p.name, x["plannummer"])
		pl = frappe.get_doc({"doctype": DT_PLAN, "projekt_id": p.name, **x, "meilenstein_id": ms_id or None, "erstellt_von": n.id}).insert(ignore_permissions=True)
	protokoll(n, "plan", "entwicklung", p.name, f"Plan {'geändert' if id else 'angelegt'}: {pl.plannummer} {pl.titel}")
	return _plan_json(pl, _kontext(n, p))


def _datei_ablegen(dt, name, dateiname, daten):
	f = frappe.get_doc({"doctype": "File", "file_name": dateiname, "is_private": 1, "content": daten, "attached_to_doctype": dt, "attached_to_name": name})
	f.flags.ignore_permissions = True
	f.insert(ignore_permissions=True)
	return f.file_url


def _datei_lesen(file_url):
	name = frappe.db.get_value("File", {"file_url": file_url}, "name") if file_url else None
	if not name:
		nicht_gefunden("Datei nicht gefunden.")
	with open(frappe.get_doc("File", name).get_full_path(), "rb") as fh:
		return fh.read()


def _b64(roh, maximal=MAX_BASE64):
	if not isinstance(roh, str) or not roh or len(roh) > maximal:
		ungueltig("Die Datei ist leer oder zu groß.")
	try:
		return base64.b64decode(roh, validate=True)
	except (binascii.Error, ValueError):
		ungueltig("Die Datei konnte nicht gelesen werden.")


@frappe.whitelist(methods=["POST"])
def hochladen(projektId=None, planId=None, plan=None, version=None, name=None, format=None, inhalt=None, analyse=None, abgeleitet=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	p = E._projekt(projektId)
	z = _kontext(n, p)
	plan = frappe.parse_json(plan) if isinstance(plan, str) else (plan or {})
	version = frappe.parse_json(version) if isinstance(version, str) else (version or {})
	daten = _b64(inhalt)
	if not K.erkennen(daten, format):
		frappe.throw("Erlaubt sind DWG, DXF (ASCII), PDF, KML/KMZ, GeoJSON und Shapefile (ZIP) im jeweiligen Größenlimit.", frappe.ValidationError)
	if planId:
		k = v.kennung(planId)
		if not k or not frappe.db.exists(DT_PLAN, {"name": k, "projekt_id": p.name}):
			nicht_gefunden("Plan nicht gefunden.")
		pl = frappe.get_doc(DT_PLAN, k)
		if not K.plan_zugriff(z, _plan_dict(pl), _versionen(pl.name))["hochladen"]:
			verboten("Neue Planstände dürfen nur die Projektentwicklung und der beauftragte Planer hochladen.")
	else:
		ms_id = v.kennung(plan.get("meilensteinId"))
		if not z["schreiben"] and not (ms_id and ms_id in z["gutachter_ms"]):
			verboten("Neue Pläne dürfen nur die Projektentwicklung und zugewiesene Planer/Gutachter anlegen.")
		if ms_id and not frappe.db.exists("Plattform Entwicklung Meilenstein", {"name": ms_id, "projekt_id": p.name}):
			ungueltig("Meilenstein gehört nicht zu diesem Projekt.")
		kopf = _plan_daten(plan)
		_nummer_frei(p.name, kopf["plannummer"])
		pl = frappe.get_doc({"doctype": DT_PLAN, "projekt_id": p.name, **kopf, "meilenstein_id": ms_id or None, "planer_id": None if z["schreiben"] else n.id, "erstellt_von": n.id}).insert(ignore_permissions=True)
	endung = K.FORMATE[format]["endung"]
	sauber = re.sub(r'[\\/:*?"<>|]', "_", v.text(name, 160)) or f"plan.{endung}"
	vorhanden = [x.aenderungsindex for x in _versionen(pl.name)]
	planstand = version.get("planstand") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(version.get("planstand") or "")) else nowdate()
	konfiguriert = _konverter_konfiguriert()
	x = frappe.get_doc({
		"doctype": DT_VER, "plan_id": pl.name, "projekt_id": p.name, "aenderungsindex": K.naechster_index(vorhanden), "status": "entwurf", "format": format,
		"planstand": planstand, "planer": v.text(version.get("planer"), 120) or pl.planer or name_von(n.id), "aenderung": v.text(version.get("aenderung"), 300) or ("" if vorhanden else "Erstausgabe"),
		"von_id": n.id, "am": now_datetime(), "dateiname": sauber, "mime": K.FORMATE[format]["mime"], "groesse": len(daten),
		"analyse": als_json(analyse if isinstance(analyse, dict) else frappe.parse_json(analyse) if analyse else {}),
		"konvertierung_status": ("ausstehend" if konfiguriert else "nicht_verfuegbar") if format == "dwg" else "",
		"konvertierung_hinweis": ("Vorschau nach Konvertierung" if konfiguriert else "Vorschau nach Konvertierung (Dienst nicht eingerichtet).") if format == "dwg" else "",
		"status_verlauf": als_json([{"status": "entwurf", "am": iso(now_datetime()), "vonId": n.id, "kommentar": "Hochgeladen"}]),
	}).insert(ignore_permissions=True)
	x.db_set("datei", _datei_ablegen(DT_VER, x.name, f"{x.name}-{secrets.token_hex(8)}.{endung}", daten))
	abg = frappe.parse_json(abgeleitet) if isinstance(abgeleitet, str) else abgeleitet
	if isinstance(abg, dict) and abg.get("inhalt") and abg.get("art") in ("geojson", "dxf"):
		ad = _b64(abg["inhalt"])
		x.db_set({"abgeleitet_datei": _datei_ablegen(DT_VER, x.name, f"{x.name}-{secrets.token_hex(8)}-vorschau.{abg['art']}", ad), "abgeleitet_name": v.text(abg.get("name"), 120) or f"vorschau.{abg['art']}", "abgeleitet_art": abg["art"]})
	if format == "dwg" and konfiguriert:
		frappe.enqueue("oekoinvest_app.plattform.api.planung.konvertieren_job", queue="long", timeout=600, version=x.name, enqueue_after_commit=True)
	_aktuell_setzen(pl.name)
	protokoll(n, "plan", "entwicklung", p.name, f"Planstand {pl.plannummer} Index {x.aenderungsindex} hochgeladen ({K.FORMATE[format]['label']})")
	x.reload()
	return {"plan": _plan_json(pl, z), "version": _version_json(x, z, True)}


def _version_laden(version_id):
	k = v.kennung(version_id)
	if not k or not frappe.db.exists(DT_VER, k):
		nicht_gefunden("Planversion nicht gefunden.")
	x = frappe.get_doc(DT_VER, k)
	return x, frappe.get_doc(DT_PLAN, x.plan_id), E._projekt(x.projekt_id)


@frappe.whitelist(methods=["POST"])
def version_aktion(versionId=None, aktion=None, kommentar=None, analyse=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	x, pl, p = _version_laden(versionId)
	z = _kontext(n, p)
	zg = K.plan_zugriff(z, _plan_dict(pl), [x])
	if not zg["version"](x):
		verboten("Kein Zugriff auf diesen Plan.")
	kommentar = v.text(kommentar, 300)
	if aktion in ("konvertieren", "analysieren"):
		if not z["schreiben"]:
			verboten("Nur die Projektentwicklung kann diese Aktion ausführen.")
		if aktion == "konvertieren":
			if x.format != "dwg":
				ungueltig("Nur DWG-Dateien werden konvertiert.")
			if not _konverter_konfiguriert():
				konflikt("Kein Konvertierungsdienst eingerichtet (site_config cad_konverter_url/cad_konverter_token).")
			x.db_set({"konvertierung_status": "ausstehend", "konvertierung_hinweis": "Konvertierung angestoßen"})
			frappe.enqueue("oekoinvest_app.plattform.api.planung.konvertieren_job", queue="long", timeout=600, version=x.name, enqueue_after_commit=True)
		else:
			a = analyse if isinstance(analyse, dict) else (frappe.parse_json(analyse) if analyse else None)
			if not isinstance(a, dict):
				ungueltig("Analyse fehlt.")
			x.db_set("analyse", als_json({**(aus_json(x.analyse, {}) or {}), **a}))
		protokoll(n, "plan", "entwicklung", p.name, f"Plan {pl.plannummer} Index {x.aenderungsindex}: {aktion}")
		x.reload()
		return _version_json(x, z, True)
	rolle = "bo" if z["schreiben"] else "planer" if zg["planer"] else ""
	if not rolle:
		verboten("Dafür fehlt Ihnen das Recht.")
	ok, erg = K.aktion_pruefen(aktion, x.status, rolle, kommentar)
	if not ok:
		status, text = erg
		frappe.throw(text, {403: frappe.PermissionError, 409: frappe.DuplicateEntryError}.get(status, frappe.ValidationError))
	verlauf = aus_json(x.status_verlauf, []) or []
	verlauf.append({"status": erg, "am": iso(now_datetime()), "vonId": n.id, "kommentar": kommentar})
	felder = {"status": erg, "status_verlauf": als_json(verlauf)}
	if erg == "freigegeben":
		felder.update({"freigegeben_am": now_datetime(), "freigegeben_von": n.id})
		for alt in frappe.get_all(DT_VER, filters={"plan_id": pl.name, "status": "freigegeben", "name": ["!=", x.name]}, fields=["name", "status_verlauf"], limit_page_length=0):
			va = aus_json(alt.status_verlauf, []) or []
			va.append({"status": "ersetzt", "am": iso(now_datetime()), "vonId": n.id, "kommentar": f"Ersetzt durch Index {x.aenderungsindex}"})
			frappe.db.set_value(DT_VER, alt.name, {"status": "ersetzt", "status_verlauf": als_json(va)})
	x.db_set(felder)
	_aktuell_setzen(pl.name)
	if aktion == "einreichen" and p.projektleiter_id and p.projektleiter_id != n.id:
		benachrichtigen(p.projektleiter_id, "entwicklung", f"Plan zur Prüfung: {pl.plannummer}", f"{pl.titel} (Index {x.aenderungsindex}) im Projekt „{p.titel}“ wartet auf Prüfung.", link=f"/portal/admin/entwicklung/{p.name}?reiter=planung", objekt_art="entwicklung", objekt_id=p.name, mail_betreff="Plan zur Prüfung – ÖkoInvest", mail_text="Ein Planstand wurde zur Prüfung eingereicht. Details finden Sie im Portal.")
	if aktion in ("freigeben", "zurueckweisen") and x.von_id and x.von_id != n.id and not frappe.db.exists("Plattform Konto Rolle", {"parent": x.von_id, "parenttype": "Plattform Konto", "rolle": "admin"}):
		benachrichtigen(x.von_id, "entwicklung", f"Plan {'freigegeben' if aktion == 'freigeben' else 'zurückgewiesen'}: {pl.plannummer}", f"{pl.titel} (Index {x.aenderungsindex})" + (f" – {kommentar}" if kommentar else ""), link=f"/portal/entwicklung/{p.name}", objekt_art="entwicklung", objekt_id=p.name, mail_betreff="Neuigkeiten zu Ihrem Plan – ÖkoInvest", mail_text="Der Status eines Planstands hat sich geändert. Details finden Sie im Portal.")
	protokoll(n, "plan", "entwicklung", p.name, f"Plan {pl.plannummer} Index {x.aenderungsindex}: {K.PLAN_STATUS[erg]}" + (f" ({kommentar})" if kommentar else ""))
	x.reload()
	return _version_json(x, z, True)


@frappe.whitelist(methods=["POST"])
def datei(versionId=None, abgeleitet=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	x, pl, p = _version_laden(versionId)
	z = _kontext(n, p)
	if not K.plan_zugriff(z, _plan_dict(pl), [x])["version"](x):
		verboten("Kein Zugriff auf diesen Plan.")
	abg = cint(abgeleitet)
	url = x.abgeleitet_datei if abg else x.datei
	if not url:
		nicht_gefunden("Für diese Version gibt es (noch) keine abgeleitete Datei." if abg else "Datei nicht gefunden.")
	inhalt = _datei_lesen(url)
	protokoll(n, "dokument_abruf", "entwicklung", p.name, f"Plan abgerufen: {pl.plannummer} Index {x.aenderungsindex}" + (" (abgeleitet)" if abg else ""))
	art = x.abgeleitet_art if abg else x.format
	mime = "application/geo+json" if art == "geojson" else K.FORMATE.get(art, {}).get("mime", "application/octet-stream")
	return {"name": x.abgeleitet_name if abg else x.dateiname, "mime": mime, "format": art, "inhalt": base64.b64encode(inhalt).decode("ascii")}


@frappe.whitelist(methods=["POST"])
def version(versionId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	x, pl, p = _version_laden(versionId)
	z = _kontext(n, p)
	zg = K.plan_zugriff(z, _plan_dict(pl), [x])
	if not zg["version"](x):
		verboten("Kein Zugriff auf diesen Plan.")
	return {
		"projekt": {"id": p.name, "titel": p.titel},
		"plan": {"id": pl.name, "plannummer": pl.plannummer, "titel": pl.titel, "massstab": pl.massstab, "blattformat": pl.blattformat, "planartLabel": K.PLANARTEN.get(pl.planart, pl.planart)},
		"version": _version_json(x, z, zg["planer"]), "backoffice": z["backoffice"],
	}


# ================================================================ DWG → DXF (Hintergrundjob)


def _konverter_konfiguriert():
	return bool(frappe.conf.get("cad_konverter_url") and len(frappe.conf.get("cad_konverter_token") or "") >= 32)


def konvertieren_job(version):
	"""Hintergrundjob: DWG an den CAD-Konverter senden, DXF als abgeleitete Datei speichern (Analyse danach über die Website)."""
	import requests

	x = frappe.get_doc(DT_VER, version)
	if x.format != "dwg" or not _konverter_konfiguriert():
		return
	x.db_set({"konvertierung_status": "laeuft", "konvertierung_hinweis": "Konvertierung läuft"})
	frappe.db.commit()  # noqa: nosemgrep – Zwischenstand für die Anzeige
	try:
		r = requests.post(
			f"{frappe.conf.get('cad_konverter_url').rstrip('/')}/v1/konvertieren?ziel=dxf",
			data=_datei_lesen(x.datei),
			headers={"Authorization": f"Bearer {frappe.conf.get('cad_konverter_token')}", "Content-Type": "application/octet-stream"},
			timeout=180,
		)
		if r.status_code != 200 or not K.erkennen(r.content, "dxf"):
			hinweis = "Konvertierung fehlgeschlagen"
			try:
				hinweis = (r.json().get("fehler") or hinweis)[:140]
			except ValueError:
				pass
			x.db_set({"konvertierung_status": "fehler", "konvertierung_hinweis": hinweis})
			return
		url = _datei_ablegen(DT_VER, x.name, f"{x.name}-{secrets.token_hex(8)}.dxf", r.content)
		x.db_set({"abgeleitet_datei": url, "abgeleitet_name": re.sub(r"\.dwg$", "", x.dateiname or "plan", flags=re.I) + ".dxf", "abgeleitet_art": "dxf", "konvertierung_status": "fertig", "konvertierung_hinweis": "DWG → DXF konvertiert – Kennzahlen im Portal auswerten"})
	except requests.RequestException:
		x.db_set({"konvertierung_status": "fehler", "konvertierung_hinweis": "Konvertierungsdienst nicht erreichbar"})
		frappe.log_error(title="CAD-Konverter", message=frappe.get_traceback())


# ================================================================ Kostenkalkulation


def _projekt_parameter(p):
	fl = frappe.get_all("Plattform Projektflaeche", filters={"projekt_id": p.name}, fields=["ha"], limit_page_length=0)
	gutachten = [{"schluessel": m["schluessel"], "titel": m["titel"]} for m in E._ms_liste(p.name) if m["gutachten"] and m["status"] != "entfaellt"]
	return {"typ": p.typ, "land": p.land, "mwp": flt(p.mwp), "mwh": flt(p.mwh), "flaecheHa": round(sum(flt(f.ha) for f in fl) * 100) / 100, "flaechenAnzahl": max(1, len(fl)), "gutachten": gutachten}


def _parameter_fuer(p, k):
	pp = _projekt_parameter(p)
	s = (aus_json(k.parameter, {}) or {}) if k else {}
	return {**s, "typ": pp["typ"], "land": pp["land"], "mwp": pp["mwp"], "mwh": pp["mwh"], "gutachten": pp["gutachten"],
		"flaecheHa": s.get("flaecheHa") if s.get("flaecheHa") is not None else pp["flaecheHa"],
		"flaechenAnzahl": s.get("flaechenAnzahl") if s.get("flaechenAnzahl") is not None else pp["flaechenAnzahl"],
		"kostenstand": (k.kostenstand if k else None) or s.get("kostenstand") or "schaetzung"}


def _pos_dict(r):
	return {"schluessel": r.schluessel, "gewerk": r.gewerk, "bezeichnung": r.bezeichnung, "art": r.art or "menge", "menge": r.menge, "einheit": r.einheit, "ep": r.ep,
		"satz": r.satz if r.art in ("prozent", "zins") else None, "manuell": bool(cint(r.manuell)), "istEur": r.ist_eur or None, "notiz": r.notiz or "", "angebot": r.angebot or ""}


def _kalk(p):
	name = frappe.db.get_value(DT_KALK, {"projekt_id": p.name}, "name")
	return frappe.get_doc(DT_KALK, name) if name else None


def _akquise_trasse(p):
	fl = [f for f in frappe.get_all("Plattform Projektflaeche", filters={"projekt_id": p.name, "flaeche_id": ["is", "set"]}, pluck="flaeche_id", limit_page_length=0) if f]
	if not fl or not frappe.db.table_exists(DT_ZIEL):
		return None
	ziele = frappe.get_all(DT_ZIEL, filters={"flaeche_id": ["in", fl], "trasse_m": [">", 0]}, fields=["name", "flaeche_id", "trasse_m", "umspannwerk_name", "umspannwerk_art", "netzkosten_min", "netzkosten_max", "demo"], order_by="trasse_m asc", limit_page_length=1)
	if not ziele:
		return None
	z = ziele[0]
	return {"zielId": z.name, "flaecheId": z.flaeche_id, "trasseM": cint(z.trasse_m), "umspannwerk": z.umspannwerk_name or z.umspannwerk_art or "", "kostenMin": z.netzkosten_min, "kostenMax": z.netzkosten_max, "demo": bool(cint(z.demo))}


def _dxf_quellen(p):
	out = []
	for x in frappe.get_all(DT_VER, filters={"projekt_id": p.name, "status": ["!=", "ersetzt"]}, fields=["name", "plan_id", "aenderungsindex", "status", "analyse"], limit_page_length=0):
		kz = (aus_json(x.analyse, {}) or {}).get("kennzahlen")
		if not kz or not kz.get("layerGefunden"):
			continue
		pl = frappe.db.get_value(DT_PLAN, x.plan_id, ["plannummer", "titel"], as_dict=True) or {}
		out.append({"versionId": x.name, "plannummer": pl.get("plannummer"), "titel": pl.get("titel"), "index": x.aenderungsindex, "status": x.status, "statusLabel": K.PLAN_STATUS.get(x.status), "kennzahlen": kz})
	return sorted(out, key=lambda q: 0 if q["status"] == "freigegeben" else 1)


def _ist(n, p):
	try:
		from oekoinvest_app.plattform.api import finanzen

		r = finanzen.entwicklung_ist(projektId=p.name, als_benutzer=n.id)
		return {"jeArt": r.get("jeArt") or {}, "quelle": r.get("quelle") or "plattform"}
	except Exception:  # noqa: BLE001 – Finanzmodul optional/ohne Recht: Ist bleibt manuell
		return None


def _roh(n, p):
	k = _kalk(p)
	staende = frappe.get_all(DT_STAND, filters={"projekt_id": p.name}, fields=["name", "stand", "am", "von_id", "kommentar", "schnappschuss"], order_by="am desc", limit_page_length=0)
	return {
		"projekt": {"id": p.name, "titel": p.titel, "typ": p.typ, "land": p.land, "mwp": flt(p.mwp), "mwh": flt(p.mwh)},
		"projektParameter": _projekt_parameter(p),
		"gespeichert": {"id": k.name, "kostenstand": k.kostenstand, "parameter": aus_json(k.parameter, {}) or {}, "positionen": [_pos_dict(r) for r in k.positionen], "geaendertAm": iso(k.modified), "geaendertVon": name_von(k.geaendert_von) or ""} if k else None,
		"ist": _ist(n, p),
		"staende": [{"id": s.name, "stand": s.stand, "am": iso(s.am), "von": name_von(s.von_id) or "", "kommentar": s.kommentar or "", **{kk: (aus_json(s.schnappschuss, {}) or {}).get(kk) for kk in ("summen", "gruppen")}} for s in staende],
		"uebergabe": aus_json(k.uebergabe, None) if k else None,
		"quellen": {"akquise": _akquise_trasse(p), "dxf": _dxf_quellen(p)},
		"darfBearbeiten": E.bo_schreiben(n),
	}


@frappe.whitelist(methods=["POST"])
def kalkulation(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	return _roh(n, E._projekt(projektId))


def _parameter_pruefen(d, alt):
	d = d or {}
	alt = alt or {}
	tr = d.get("trasse") if isinstance(d.get("trasse"), dict) else (alt.get("trasse") or {})
	q = tr.get("querungen") or {}
	abschnitte = []
	for a in (tr.get("abschnitte") or [])[:20]:
		art = v.auswahl((a or {}).get("art"), list(K.VERLEGEARTEN), "")
		laenge = v.zahl((a or {}).get("laengeM"), min=0, max=200000)
		if art and laenge:
			abschnitte.append({"art": art, "laengeM": round(laenge, 1)})

	def zahl(k, mini, maxi):
		if k not in d:
			return alt.get(k)
		w = d.get(k)
		return None if w in (None, "") else v.zahl(w, min=mini, max=maxi)

	return {
		"flaecheHa": zahl("flaecheHa", 0, 100000), "flaechenAnzahl": zahl("flaechenAnzahl", 1, 500), "zaunM": zahl("zaunM", 0, 200000),
		"trasse": {"abschnitte": abschnitte, "querungen": {k2: cint(v.zahl(q.get(k2), min=0, max=100) or 0) for k2 in K.QUERUNGEN}, "quelle": v.text(tr.get("quelle"), 80)},
		"speicherNetzbezug": bool(v.wahr(d["speicherNetzbezug"])) if "speicherNetzbezug" in d else bool(alt.get("speicherNetzbezug")),
		"contingency": zahl("contingency", 0, 0.5), "fkQuote": zahl("fkQuote", 0, 1), "zinsBau": zahl("zinsBau", 0, 0.2), "bauzeitMonate": zahl("bauzeitMonate", 1, 36),
	}


def _positionen_pruefen(liste):
	if not isinstance(liste, list):
		return None
	if len(liste) > 300:
		ungueltig("Höchstens 300 Positionen.")
	out, gesehen = [], set()
	for x in liste:
		x = x or {}
		s = v.text(x.get("schluessel"), 80)
		if not s or s == "frei:":
			s = f"frei:{secrets.token_urlsafe(6)}"
		if not re.fullmatch(r"[a-z_]+(:[A-Za-z0-9_-]+)?", s) or s in gesehen:
			continue
		gesehen.add(s)
		frei = s.startswith("frei:")
		gewerk = v.auswahl(x.get("gewerk"), list(K.GEWERKE), "sonstiges")
		pos = {
			"schluessel": s, "gewerk": gewerk, "bezeichnung": v.text(x.get("bezeichnung"), 160) or K.GEWERKE[gewerk][0], "art": "menge" if frei else v.auswahl(x.get("art"), ["menge", "prozent", "zins"], "menge"),
			"menge": v.zahl(x.get("menge"), min=-1e9, max=1e9), "einheit": v.text(x.get("einheit"), 20) or "psch", "ep": v.zahl(x.get("ep"), min=-1e9, max=1e9),
			"satz": v.zahl(x.get("satz"), min=0, max=1), "manuell": True if frei else bool(v.wahr(x.get("manuell"))), "istEur": v.zahl(x.get("istEur"), min=-1e10, max=1e10),
			"notiz": v.text(x.get("notiz"), 300), "angebot": v.text(x.get("angebot"), 120),
		}
		if frei and (pos["menge"] is None or pos["ep"] is None):
			ungueltig(f"Position „{pos['bezeichnung']}“: Menge und Einheitspreis angeben.")
		out.append(pos)
	return out


def _kalk_schreiben(n, p, k, parameter=None, positionen=None, kostenstand=None, uebergabe=None):
	if not k:
		k = frappe.get_doc({"doctype": DT_KALK, "projekt_id": p.name, "kostenstand": "schaetzung", "parameter": als_json({})})
	if parameter is not None:
		k.parameter = als_json(parameter)
	if kostenstand:
		k.kostenstand = kostenstand
	par = _parameter_fuer(p, k)
	if positionen is not None:
		gemischt = K.zusammenfuehren(positionen, K.vorschlag(par))
		behalten = [x for x in gemischt if x.get("manuell") or x.get("istEur") or x.get("notiz") or x.get("angebot") or str(x["schluessel"]).startswith("frei:")]
		k.set("positionen", [{"schluessel": x["schluessel"], "gewerk": x["gewerk"], "bezeichnung": x.get("bezeichnung"), "art": x.get("art") or "menge", "menge": x.get("menge"), "einheit": x.get("einheit"), "ep": x.get("ep"), "satz": x.get("satz"), "manuell": 1 if x.get("manuell") else 0, "ist_eur": x.get("istEur"), "notiz": x.get("notiz"), "angebot": x.get("angebot")} for x in behalten])
	e = K.berechnen(K.zusammenfuehren([_pos_dict(r) for r in k.positionen], K.vorschlag(par)), par)
	k.summe_gesamt = e["summen"]["gesamt"]
	k.capex = e["summen"]["capex"]
	k.finanzierungsbedarf = e["summen"]["finanzierungsbedarf"]
	k.eur_pro_kwp = e["summen"]["eurProKwp"] or 0
	if uebergabe is not None:
		k.uebergabe = als_json(uebergabe)
		k.status = "uebergeben"
	k.geaendert_von = n.id
	k.save(ignore_permissions=True) if not k.is_new() else k.insert(ignore_permissions=True)
	return k, e, par


@frappe.whitelist(methods=["POST"])
def kalkulation_speichern(projektId=None, parameter=None, positionen=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	p = E._projekt(projektId)
	k = _kalk(p)
	parameter = frappe.parse_json(parameter) if isinstance(parameter, str) else (parameter or {})
	positionen = frappe.parse_json(positionen) if isinstance(positionen, str) else positionen
	neu = _parameter_pruefen(parameter, (aus_json(k.parameter, {}) or {}) if k else {})
	_kalk_schreiben(n, p, k, parameter=neu, positionen=_positionen_pruefen(positionen) if positionen is not None else None)
	protokoll(n, "kalkulation", "entwicklung", p.name, "Kostenkalkulation gespeichert")
	return _roh(n, p)


@frappe.whitelist(methods=["POST"])
def kalkulation_aktion(projektId=None, aktion=None, stand=None, kommentar=None, versionId=None, felder=None, schluessel=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	E.schreib_noetig(n)
	p = E._projekt(projektId)
	k = _kalk(p)
	alt = (aus_json(k.parameter, {}) or {}) if k else {}
	kommentar = v.text(kommentar, 300)
	if aktion == "festschreiben":
		if stand not in K.KOSTENSTAENDE:
			ungueltig("Bitte einen Kostenstand wählen.")
		vorher = K.KOSTENSTAENDE.get(k.kostenstand if k else "schaetzung")[1]
		if K.KOSTENSTAENDE[stand][1] < vorher and len(kommentar) < 5:
			ungueltig("Rückschritt im Kostenstand: bitte begründen.")
		k, e, _par = _kalk_schreiben(n, p, k, kostenstand=stand)
		frappe.get_doc({"doctype": DT_STAND, "projekt_id": p.name, "kalkulation_id": k.name, "stand": stand, "am": now_datetime(), "von_id": n.id, "kommentar": kommentar,
			"summe_gesamt": e["summen"]["gesamt"], "eur_pro_kwp": e["summen"]["eurProKwp"] or 0, "schnappschuss": als_json(K.schnappschuss(e))}).insert(ignore_permissions=True)
		protokoll(n, "kalkulation", "entwicklung", p.name, f"Kostenstand festgeschrieben: {K.KOSTENSTAENDE[stand][0]} – {round(e['summen']['gesamt'] / 1000)} T€")
	elif aktion == "trasse_akquise":
		a = _akquise_trasse(p)
		if not a:
			konflikt("Für die Flächen dieses Projekts liegt keine Trassenlänge aus der Geodaten-Akquise vor.")
		_kalk_schreiben(n, p, k, parameter=K.trasse_setzen(alt, a["trasseM"], f"akquise:{a['zielId']}"))
		protokoll(n, "kalkulation", "entwicklung", p.name, f"Trassenlänge aus Akquise übernommen: {a['trasseM']} m")
	elif aktion == "dxf_uebernehmen":
		vid = v.kennung(versionId)
		if not vid or not frappe.db.exists(DT_VER, {"name": vid, "projekt_id": p.name}):
			nicht_gefunden("Planversion mit Kennzahlen nicht gefunden.")
		kz = (aus_json(frappe.db.get_value(DT_VER, vid, "analyse"), {}) or {}).get("kennzahlen")
		if not kz:
			nicht_gefunden("Planversion mit Kennzahlen nicht gefunden.")
		erlaubt = [f for f, w in (("zaunM", kz.get("zaunM")), ("trasse", kz.get("kabelMsM")), ("flaecheHa", kz.get("anlageHa"))) if flt(w) > 0]
		wahl = [f for f in (frappe.parse_json(felder) if isinstance(felder, str) else (felder or [])) if f in erlaubt]
		if not wahl:
			ungueltig("Bitte mindestens eine Kennzahl zur Übernahme bestätigen.")
		neu = dict(alt)
		if "zaunM" in wahl:
			neu["zaunM"] = K.rund(flt(kz["zaunM"]))
		if "flaecheHa" in wahl:
			neu["flaecheHa"] = flt(kz["anlageHa"])
		if "trasse" in wahl:
			neu = K.trasse_setzen(neu, K.rund(flt(kz["kabelMsM"])), f"dxf:{vid}")
		_kalk_schreiben(n, p, k, parameter=neu)
		protokoll(n, "kalkulation", "entwicklung", p.name, f"Kennzahlen aus Plan übernommen ({', '.join(wahl)})")
	elif aktion == "vorschlag":
		nur = set(frappe.parse_json(schluessel) if isinstance(schluessel, str) else schluessel) if schluessel else None
		pos = [_pos_dict(r) for r in (k.positionen if k else [])]
		pos = [{**x, "manuell": False} if not x["schluessel"].startswith("frei:") and (not nur or x["schluessel"] in nur) else x for x in pos]
		_kalk_schreiben(n, p, k, positionen=pos)
		protokoll(n, "kalkulation", "entwicklung", p.name, "Vorschlagswerte wiederhergestellt")
	elif aktion == "uebergeben":
		k, e, _par = _kalk_schreiben(n, p, k)
		s = e["summen"]
		stand_k = k.kostenstand or "schaetzung"
		ueb = {"gesamt": s["gesamt"], "capex": s["capex"], "finanzierungsbedarf": s["finanzierungsbedarf"], "eurProKwp": s["eurProKwp"], "epcProKwp": s["epcProKwp"], "stand": stand_k, "standLabel": K.KOSTENSTAENDE[stand_k][0], "kalkulationId": k.name, "am": iso(now_datetime()), "vonId": n.id}
		_kalk_schreiben(n, p, k, uebergabe=ueb)
		protokoll(n, "kalkulation", "entwicklung", p.name, f"Projektkosten übergeben: Finanzierungsbedarf {round(s['finanzierungsbedarf'] / 1000)} T€, Capex {round(s['capex'] / 1000)} T€")
	else:
		ungueltig("Unbekannte Aktion.")
	return _roh(n, p)


@frappe.whitelist(methods=["POST"])
def kalkulation_kennzahlen(projektId=None, als_benutzer=None):  # noqa: N803
	"""Übergabewerte für Finanzierung/Bewertung (Backoffice lesen)."""
	n = nutzer(als_benutzer)
	E.lese_noetig(n)
	p = E._projekt(projektId)
	k = _kalk(p)
	par = _parameter_fuer(p, k)
	e = K.berechnen(K.zusammenfuehren([_pos_dict(r) for r in (k.positionen if k else [])], K.vorschlag(par)), par)
	return {"projektId": p.name, "uebergeben": aus_json(k.uebergabe, None) if k else None, "aktuell": {kk: e["summen"][kk] for kk in ("gesamt", "capex", "finanzierungsbedarf", "eurProKwp")} | {"stand": par["kostenstand"]}}


# ================================================================ Druckformat „Kostenrahmen“


def oekoinvest_kostenrahmen(name):
	"""Jinja (Druckformat „Kostenrahmen“, Plattform Kostenkalkulation): Gruppen, Positionen, Summen, Kostenstände – nur mit DocPerm."""
	if not frappe.has_permission(DT_KALK, "read", name):
		return {}
	k = frappe.get_doc(DT_KALK, name)
	p = frappe.get_doc(E.DT, k.projekt_id)
	par = _parameter_fuer(p, k)
	e = K.berechnen(K.zusammenfuehren([_pos_dict(r) for r in k.positionen], K.vorschlag(par)), par)
	gruppen = []
	for g, (label, kg, _r) in sorted(K.GRUPPEN.items(), key=lambda x: x[1][2]):
		pos = [frappe._dict({**x, "kg": K.GEWERKE.get(x["gewerk"], ("", "", ""))[2]}) for x in e["positionen"] if x["gruppe"] == g and (x.get("betrag") or x.get("istEur"))]
		if pos:
			gruppen.append(frappe._dict({"id": g, "label": label, "kg": kg, "soll": e["gruppen"][g]["soll"], "eurProKwp": e["gruppen"][g]["eurProKwp"], "positionen": pos}))
	staende = frappe.get_all(DT_STAND, filters={"projekt_id": p.name}, fields=["stand", "am", "summe_gesamt", "eur_pro_kwp", "kommentar"], order_by="am desc", limit_page_length=0)
	return frappe._dict({
		"projekt": p, "summen": frappe._dict(e["summen"]), "parameter": frappe._dict(e["parameter"]), "gruppen": gruppen, "trasse_m": K.trassen_laenge(e["parameter"]),
		"kostenstand": K.KOSTENSTAENDE[par["kostenstand"]][0], "staende": [frappe._dict({**s, "label": K.KOSTENSTAENDE.get(s.stand, (s.stand,))[0]}) for s in staende],
		"uebergabe": aus_json(k.uebergabe, None),
	})
