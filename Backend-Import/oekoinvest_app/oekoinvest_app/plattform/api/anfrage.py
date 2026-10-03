# Copyright (c) 2026, ÖkoInvest GmbH
# Öffentliches Anfrageformular aller Zielgruppen → Plattform Vorgang (+ Flächen-Entwurf bei flaeche/agri).
#
# Paket C (Welle 1) – gleiche Logik wie das Demo-Backend (src/lib/plattform/backend/demo.js, anfrageAnlegen):
#  - Land aus kontakt.land, sonst aus dem Seitenkontext (daten.land / daten.eingaben.land), sonst eindeutige PLZ
#    (5 Ziffern = DE; 4 Ziffern bleiben offen, weil AT und CH beide 4-stellig sind) – siehe src/lib/anfrage/laender.js
#  - Flächencheck: ha/nutzung flach oder unter daten.eingaben; Nutzung „parkplatz“ → gewerbe
#  - Hinweis (Art. 6 Abs. 1 lit. b) statt Pflicht-Einwilligung; optionale Einwilligungen mit Version und Text-Hash
#  - Zuständig nach Gebiet (backoffice.gebiet_fuer), Team-Postfach je Land (site_config anfrage_postfach_de/_at/_ch)
#  - Server-Zähler ohne Kennung: Logger „oekoinvest_anfrage_zaehler“ (Tag × Typ × Land × Kanal)

import json
import re

import frappe

from oekoinvest_app.plattform import benachrichtigung
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, jetzt_iso, nutzer, protokoll, verlauf
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, FLAECHE_NUTZUNG, LAENDER, VORGANG_TYPEN
from oekoinvest_app.plattform.flaeche_fach import fach_aus_anfrage  # Fachprüfung Flächen

VERBOTENE_SCHLUESSEL = {"__proto__", "constructor", "prototype"}
NUTZUNG_ALIAS = {"parkplatz": "gewerbe"}  # Flächencheck-IDs → FLAECHE_NUTZUNG (deponie gibt es hier schon)
KANAELE = {"Direkt", "Suchmaschine", "KI-Assistent", "Anzeige", "Social Media", "E-Mail", "Offline/QR", "Kampagne", "Verweis"}


def daten_bereinigen(d, tiefe=0):
	"""Freie Zusatzdaten (flach, max. 60 Felder, eine Verschachtelungsebene) – wie datenBereinigen im Demo-Backend."""
	if not isinstance(d, dict):
		return {}
	out = {}
	for k, wert in list(d.items())[:60]:
		key = re.sub(r"[^\w.-]", "", str(k), flags=re.ASCII)[:60]
		if not key or key in VERBOTENE_SCHLUESSEL:
			continue
		if isinstance(wert, bool):
			out[key] = wert
		elif isinstance(wert, str):
			out[key] = v.mehrzeilig(wert, 2000)
		elif isinstance(wert, (int, float)):
			if wert == wert and wert not in (float("inf"), float("-inf")):
				out[key] = wert
		elif isinstance(wert, list):
			out[key] = [x if isinstance(x, (bool, int, float)) else v.text(x, 200) for x in wert[:30]]
		elif isinstance(wert, dict) and tiefe < 1:
			out[key] = daten_bereinigen(wert, tiefe + 1)
	return out


def _erster(d, *schluessel):
	for s in schluessel:
		if d.get(s) is not None:
			return d.get(s)
	return None


def _land_normal(wert):
	s = wert.strip().upper() if isinstance(wert, str) else ""
	return s if s in LAENDER else ""


def land_bestimmen(kontakt, daten):
	"""Land einer Anfrage – Spiegel von anfrageLand() in src/lib/anfrage/laender.js."""
	kt = kontakt if isinstance(kontakt, dict) else {}
	d = daten if isinstance(daten, dict) else {}
	ein = d.get("eingaben") if isinstance(d.get("eingaben"), dict) else {}
	land = _land_normal(kt.get("land")) or _land_normal(d.get("land")) or _land_normal(ein.get("land"))
	if land:
		return land
	plz = str(kt.get("plz") or "").strip()
	return "DE" if re.fullmatch(r"\d{5}", plz) else ""


def _einwilligung(einwilligung_text, ip_, hinweis, einwilligungen):
	hw = hinweis if isinstance(hinweis, dict) else {}
	optional = []
	for e in (einwilligungen if isinstance(einwilligungen, list) else [])[:10]:
		if not isinstance(e, dict) or e.get("erteilt") is not True or not v.text(e.get("id"), 40):
			continue
		eintrag = {
			"id": v.text(e.get("id"), 40),
			"erteilt": True,
			"am": v.text(e.get("am"), 40),
			"version": v.text(e.get("version"), 40),
			"sprache": v.auswahl(e.get("sprache"), ["de", "en"], "de"),
			"textHash": v.text(e.get("textHash"), 64),
		}
		if e.get("doi"):
			eintrag["doi"] = v.text(e.get("doi"), 20)
		optional.append(eintrag)
	return {
		"am": jetzt_iso(),
		"ip": ip_,
		"text": v.text(einwilligung_text, 400),
		"art": "hinweis",  # Hinweis nach Art. 6 Abs. 1 lit. b statt Pflicht-Einwilligung
		"rechtsgrundlage": v.text(hw.get("rechtsgrundlage"), 60),
		"version": v.text(hw.get("version"), 40),
		"textHash": v.text(hw.get("textHash"), 64),
		"optional": optional,
	}


def _zustaendig_nach_gebiet(land, bundesland, plz):
	"""Gebiet → zuständiges, aktives Backoffice-Konto (oder None, Grund)."""
	if not land:
		return None, ""
	from oekoinvest_app.plattform import backoffice

	g = backoffice.gebiet_fuer(land, bundesland, plz)
	if not g or not backoffice._aktive_backoffice(g["gebiet"].mitarbeiter_id):
		return None, ""
	return g["gebiet"].mitarbeiter_id, f"Gebiet „{g['gebiet'].bezeichnung}“ ({g['grund']})"


def _team_postfach(vg, land):
	"""Team-Postfach je Land (site_config: anfrage_postfach_de / _at / _ch). Nur Hinweis + Link, keine Personendaten."""
	if not land:
		return
	adresse = v.email(str(frappe.conf.get(f"anfrage_postfach_{land.lower()}") or "").strip())
	if not adresse:
		return
	from oekoinvest_app.plattform import mail as plattform_mail

	try:
		plattform_mail.hinweis(adresse, "", f"Neue Anfrage {vg.name}: {VORGANG_TYPEN.get(vg.typ, vg.typ)} ({land})", "Über die Website ist eine neue Anfrage eingegangen.", f"/portal/admin/vorgaenge/{vg.name}")
	except Exception:
		frappe.log_error(title="Anfrage: Team-Postfach nicht erreichbar")


def _zaehlen(typ, land, kanal):
	"""Server-Zähler ohne Kennung (keine IP, keine E-Mail, keine Vorgangs-ID)."""
	try:
		eintrag = {
			"tag": frappe.utils.nowdate(),
			"ereignis": "angelegt",
			"typ": typ if typ in VORGANG_TYPEN else "?",
			"land": land or "?",
			"kanal": kanal if kanal in KANAELE else "?",
		}
		frappe.logger("oekoinvest_anfrage_zaehler").info(json.dumps(eintrag, ensure_ascii=False))
	except Exception:
		pass  # Messung darf keine Anfrage stören


@frappe.whitelist(methods=["POST"])
def anlegen(typ=None, kontakt=None, daten=None, herkunft=None, ip=None, einwilligungText=None, hinweis=None, einwilligungen=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	t = v.auswahl(typ, VORGANG_TYPEN)
	v.pflicht(t, "Unbekannter Anfragetyp.")
	kt = kontakt if isinstance(kontakt, dict) else {}
	k = {
		"anrede": v.text(kt.get("anrede"), 20),
		"vorname": v.text(kt.get("vorname"), 80),
		"nachname": v.text(kt.get("nachname"), 80),
		"firma": v.text(kt.get("firma"), 120),
		"email": v.email(kt.get("email")),
		"telefon": v.text(kt.get("telefon"), 40),
		"plz": v.plz(kt.get("plz")),
		"ort": v.text(kt.get("ort"), 80),
		"land": "",
	}
	k["land"] = v.auswahl(land_bestimmen({"land": kt.get("land"), "plz": k["plz"]}, daten), LAENDER, "")
	v.pflicht(k["vorname"] and k["nachname"], "Bitte geben Sie Vor- und Nachnamen an.")
	v.pflicht(k["email"], "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	d = daten_bereinigen(daten)
	if t == "kommune":  # Fachprüfung Kommunen: Positivliste + Gemeindeschlüssel je Land
		from oekoinvest_app.plattform.flaeche_fach import Fehler, kommune_daten

		try:
			d = {**d, **kommune_daten(daten, k["land"], k)}
		except Fehler as e:
			v.pflicht(False, str(e))
	v.pflicht(len(json.dumps(d, ensure_ascii=False)) <= 20000, "Zu viele Zusatzdaten.")
	h = daten_bereinigen(herkunft)
	ip_ = v.text(ip, 64)

	# Sofort zuordnen nur, wenn die bestätigte E-Mail des angemeldeten Nutzers übereinstimmt
	u = n if (n and n.email == k["email"] and n.emailBestaetigt) else None

	ein = d.get("eingaben") if isinstance(d.get("eingaben"), dict) else {}
	bl_liste = BUNDESLAENDER.get(k["land"], [])
	bundesland = v.auswahl(d.get("bundesland"), bl_liste, "") or v.auswahl(d.get("regionName"), bl_liste, "")  # Regionsseiten senden regionName
	zustaendig_id, zustaendig_grund = _zustaendig_nach_gebiet(k["land"], bundesland, k["plz"])

	vg = frappe.get_doc(
		{
			"doctype": "Plattform Vorgang",
			"typ": t,
			"status": "eingegangen",
			"nutzer_id": u.id if u else None,
			"email": k["email"],
			"kontakt": als_json(k),
			"daten": als_json(d),
			"herkunft": als_json(h),
			"ip": ip_,
			"einwilligung": als_json(_einwilligung(einwilligungText, ip_, hinweis, einwilligungen)),
			"zustaendig_id": zustaendig_id,
		}
	)
	verlauf(vg, "eingegangen", u, "eigentuemer", "")
	vg.insert(ignore_permissions=True)

	if t in ("flaeche", "agri"):
		land = k["land"] or "DE"  # unbekannt → wie bisher DE (Flächen-Select); der Vorgang behält kontakt.land = ""
		ha = v.zahl(_erster({**ein, **d}, "ha", "hektar", "flaeche", "flaecheHa"), min=0, max=100000, stellen=2)
		nutzung_roh = d.get("nutzung") if d.get("nutzung") is not None else ein.get("nutzungId")
		ort_text = " ".join(x for x in (k["plz"], k["ort"]) if x) or "aus Anfrage"
		f = frappe.get_doc(
			{
				"doctype": "Plattform Flaeche",
				"nutzer_id": u.id if u else None,
				"vorgang_id": vg.name,
				"bezeichnung": v.text(d.get("bezeichnung"), 120) or f"Fläche {ort_text}",
				"land": land,
				"bundesland": bundesland,
				"plz": k["plz"],
				"ort": k["ort"],
				"ha": ha or 0,
				"nutzung": "dach" if d.get("art") == "dach" else v.auswahl(NUTZUNG_ALIAS.get(nutzung_roh, nutzung_roh), FLAECHE_NUTZUNG, "acker"),  # /dachflaeche-verpachten
				"agri": 1 if t == "agri" else 0,
				"eigentum": "eigentum",
				"fach": als_json(fach_aus_anfrage(d)),  # Fachprüfung Flächen: z. B. Dachart aus /dachflaeche-verpachten
				"hinweise": v.mehrzeilig(d.get("nachricht"), 2000),
				"status": "entwurf",
				"zustaendig_id": zustaendig_id,
			}
		)
		verlauf(f, "entwurf", u, "system", "Aus Anfrage angelegt")
		f.insert(ignore_permissions=True)
		frappe.db.set_value("Plattform Vorgang", vg.name, "flaeche_id", f.name, update_modified=False)
		vg.flaeche_id = f.name

	protokoll(u, "anfrage", "vorgang", vg.name, f"Anfrage {VORGANG_TYPEN[t]} von {k['email']}", ip_)
	if zustaendig_id:
		protokoll(None, "zuweisen", "vorgang", vg.name, f"Zuständig: {zustaendig_id} ({zustaendig_grund})")
	_zaehlen(t, k["land"], h.get("kanal"))
	benachrichtigung.neue_anfrage(vg, k)
	_team_postfach(vg, k["land"])
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: CRM-Lead + Automationen

	backoffice_ereignis("vorgang_neu", "vorgang", vg)
	return {"id": vg.name, "vorgang": {"id": vg.name, "typ": vg.typ, "status": vg.status, "flaecheId": vg.flaeche_id or None, "land": k["land"]}}
