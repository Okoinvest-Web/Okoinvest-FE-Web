# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP2 „EDA-Marktkommunikation“ – Frappe-API (Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 WP2;
# Referenz: src/lib/plattform/backend/demo/eg-eda.js). Regeln: plattform/eg_eda_kern.py (= src/lib/plattform/eg/eda/*.js).
#
# Rechte: jede Methode prüft den Aufrufer (kern.nutzer bzw. technischer Benutzer für System-/Gateway-Aufrufe) UND die
# Kontext-Rolle je Gemeinschaft über eg_stamm.zugriff (WP1): Lesen = eda_ausloesen ≥ 1 oder eda_freigeben ≥ 1 oder audit ≥ 1,
# Auslösen = eda_ausloesen 2, Freigabe (Vier-Augen) = eda_freigeben 2 und nicht die beantragende Person.
# Teilnahme-Status ändert nur WP1 (eg_stamm.teilnahme_uebergang_intern); Energiedaten gehen als Job an WP3
# (eg_energie.energiedaten_empfangen_intern, Ereignis eg.energiedaten.empfangen).
#
# Transport: Ohne Simulator bleiben ausgehende Nachrichten „wartend“, der Gateway-Dienst (Backend-Import/dienste/eda-gateway)
# holt sie über ausgang() ab, sendet per E-Mail/KEP und quittiert (ausgang_quittung); Eingänge liefert er an nachricht_eingang().
# Mit site_config „eg_eda_simulator“: 1 (nur Test/Demo) antwortet der Simulator-Netzbetreiber (eg_eda_kern.simulator_*),
# zugestellt vom stündlichen Job bzw. simulator(aktion „zustellen“). Zeitraffer: site_config „eg_eda_sim_minuten_je_tag“.

import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import frappe
from frappe.utils import get_datetime, get_system_timezone, nowdate

from oekoinvest_app.plattform import eg_eda_kern as K
from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import eg_stamm_kern as SK
from oekoinvest_app.plattform.api import eg_stamm as S
from oekoinvest_app.plattform.kern import PRAEFIX, aus_json, iso, jetzt_iso, konflikt, neue_id, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.konstanten import ROLLE_API

DP = "Plattform EG EDA Prozess"
DN = "Plattform EG EDA Nachricht"
PRAEFIX.update({DP: "EDP", DN: "EDN"})
ROLLE_GATEWAY = "ÖkoInvest EDA-Gateway"  # Fixture offen (Go-live-Team); bis dahin genügt „ÖkoInvest API“


# ================================================================ Grundlagen


def _heute():
	return nowdate()


def _daten(x):
	return x if isinstance(x, dict) else (aus_json(x, {}) or {})


def _n(als_benutzer):
	"""Angemeldeter Nutzer oder – ohne als_benutzer – System (nur technischer API-/Gateway-Benutzer)."""
	if als_benutzer:
		return nutzer(als_benutzer)
	rollen = frappe.get_roles(frappe.session.user) if frappe.session.user != "Guest" else []
	if ROLLE_API in rollen or ROLLE_GATEWAY in rollen:
		return S.system_nutzer()
	nicht_angemeldet()


def _dt(iso_wert):
	"""ISO-UTC (…Z) → naive Systemzeit für Datetime-Felder."""
	if not iso_wert:
		return None
	s = str(iso_wert).replace("Z", "+00:00")
	try:
		d = datetime.fromisoformat(s)
	except ValueError:
		return get_datetime(iso_wert)
	if d.tzinfo is None:
		return d
	return d.astimezone(ZoneInfo(get_system_timezone() or "UTC")).replace(tzinfo=None)


def _iso_sek(j):
	return str(j)[:19] + "Z"


def _z6():
	return neue_id(DN)[-6:]


def _lesen(n, gid):
	g, k = S.zugriff(n, gid, "mitgliederliste", 0)
	if max(SK.eg_stufe(k, "eda_ausloesen"), SK.eg_stufe(k, "eda_freigeben"), SK.eg_stufe(k, "audit")) < 1:
		verboten("Ihre Rolle in dieser Gemeinschaft erlaubt keinen Einblick in die EDA-Kommunikation.")
	return g, k


def _schreiben(n, gid):
	return S.zugriff(n, gid, "eda_ausloesen", 2)


def _proto(n, aktion, gid, text):
	protokoll(None if (n or {}).get("system") else n, aktion, "eg_gemeinschaft", gid, text)


def _simulator_aktiv():
	return bool(frappe.conf.get("eg_eda_simulator"))


def _minuten_je_tag():
	try:
		return max(1, int(frappe.conf.get("eg_eda_sim_minuten_je_tag") or 1440))
	except (TypeError, ValueError):
		return 1440


# ================================================================ Abbildung Dokument ↔ dict (camelCase wie Demo)

_PFELDER = {
	"prozesscode": "prozesscode", "version": "version", "conversationId": "conversation_id", "gemeinschaftId": "gemeinschaft", "teilnahmeId": "teilnahme", "zaehlpunktId": "zaehlpunkt",
	"zaehlpunktnummer": "zaehlpunktnummer", "netzbetreiberId": "netzbetreiber_id", "empfaenger": "empfaenger", "prozessdatum": "prozessdatum", "status": "status", "responsecode": "responsecode",
	"responsetext": "responsetext", "fristBis": "frist_bis", "gesendetAm": "gesendet_am", "versuche": "versuche", "technikSeit": "technik_seit", "bestaetigtAm": "bestaetigt_am",
	"nachfolgerId": "nachfolger", "massenId": "massen_id", "modus": "modus",
}
_PJSON = ["parameter", "ergebnis", "erinnerungen", "merker", "verlauf"]
_PDATUM = ["prozessdatum", "fristBis", "technikSeit"]
_PZEIT = ["gesendetAm", "bestaetigtAm"]


def _p_dict(doc):
	d = {"id": doc.name, "erstelltAm": iso(doc.creation) or "", "erstelltVon": None}
	for c, f in _PFELDER.items():
		w = doc.get(f)
		if c in _PDATUM:
			w = str(w) if w else ""
		elif c in _PZEIT:
			w = iso(w) or ""
		elif c == "versuche":
			w = int(w or 0)
		elif w is None:
			w = ""
		d[c] = w
	for c in _PJSON:
		d[c] = aus_json(doc.get(c), [] if c in ("erinnerungen", "merker", "verlauf") else {}) or ([] if c in ("erinnerungen", "merker", "verlauf") else {})
	d["freigabe"] = {"status": doc.freigabe_status or "", "beantragtVon": doc.freigabe_beantragt_von or None, "von": doc.freigabe_von or None, "am": iso(doc.freigabe_am) or ""}
	return d


def _p_speichern(p, doc=None):
	if doc is None:
		doc = frappe.get_doc(DP, p["id"]) if p.get("id") and frappe.db.exists(DP, p["id"]) else frappe.new_doc(DP)
	for c, f in _PFELDER.items():
		if c not in p:
			continue
		w = p[c]
		if c in _PDATUM:
			w = w or None
		elif c in _PZEIT:
			w = _dt(w)
		elif c in ("teilnahmeId", "zaehlpunktId", "nachfolgerId"):
			w = w or None
		doc.set(f, w)
	for c in _PJSON:
		if c in p:
			doc.set(c, json.dumps(p[c] if p[c] is not None else ([] if c != "parameter" and c != "ergebnis" else {}), ensure_ascii=False))
	fg = p.get("freigabe") or {}
	doc.freigabe_status = fg.get("status") or ""
	doc.freigabe_beantragt_von = fg.get("beantragtVon") or None
	doc.freigabe_von = fg.get("von") or None
	doc.freigabe_am = _dt(fg.get("am"))
	frappe.flags.eg_eda_api = True
	try:
		if doc.is_new():
			if p.get("id"):
				doc.name = p["id"]
				doc.flags.name_set = True
			doc.insert(ignore_permissions=True, set_name=p.get("id") or None)
		else:
			doc.save(ignore_permissions=True)
	finally:
		frappe.flags.eg_eda_api = False
	p["id"] = doc.name
	return doc


def _n_dict(doc, mit_roh=False):
	d = {
		"id": doc.name, "gemeinschaftId": doc.gemeinschaft or "", "prozessId": doc.prozess or "", "teilnahmeId": doc.teilnahme or "", "zaehlpunktnummer": doc.zaehlpunktnummer or "",
		"richtung": "aus" if doc.richtung == "ausgang" else "ein", "nachrichtencode": doc.nachrichtencode, "prozesscode": doc.prozesscode or "", "messageId": doc.message_id,
		"conversationId": doc.conversation_id or "", "absender": doc.absender or "", "empfaenger": doc.empfaenger or "", "zeitpunkt": iso(doc.zeitpunkt) or "", "tag": str(doc.tag or ""),
		"kanal": doc.kanal or "", "versandStatus": doc.versand_status or "", "versuche": int(doc.versuche or 0), "verarbeitet": bool(doc.verarbeitet), "verarbeitetAm": iso(doc.verarbeitet_am) or "",
		"weitergeleitet": bool(doc.weitergeleitet), "fehler": doc.fehler or "", "hinweise": aus_json(doc.hinweise, []) or [], "kennzahlen": aus_json(doc.kennzahlen, None), "sha256": doc.sha256 or "",
		"groesse": int(doc.groesse or 0), "betreff": doc.betreff or "", "rohinhaltArchiviert": False, "schluessel": doc.schluessel or "",
		"codeLabel": (K.EDA_NACHRICHTEN.get(doc.nachrichtencode) or {}).get("label") or doc.nachrichtencode,
	}
	if mit_roh:
		d["rohinhalt"] = doc.rohinhalt or ""
	return d


def _nachricht_anlegen(g, p, richtung, code, prozesscode, roh, absender, empfaenger, message_id, conversation_id, kanal="simulator", teilnahme_id="", zaehlpunktnummer="", tag="", betreff="", fehler="", hinweise=None, kennzahlen=None, verarbeitet=True, versand_status=None):
	doc = frappe.get_doc({
		"doctype": DN, "gemeinschaft": (g or {}).get("id") or None, "prozess": (p or {}).get("id") or None, "teilnahme": teilnahme_id or (p or {}).get("teilnahmeId") or None,
		"zaehlpunktnummer": zaehlpunktnummer or (p or {}).get("zaehlpunktnummer") or "", "richtung": "ausgang" if richtung == "aus" else "eingang", "nachrichtencode": code, "prozesscode": prozesscode,
		"message_id": message_id, "conversation_id": conversation_id, "absender": absender, "empfaenger": empfaenger, "zeitpunkt": frappe.utils.now_datetime(), "tag": tag or None,
		"kanal": kanal, "versand_status": versand_status if versand_status is not None else (("quittiert" if kanal == "simulator" else "wartend") if richtung == "aus" else ""),
		"versuche": 1 if richtung == "aus" else 0, "verarbeitet": 1 if verarbeitet else 0, "verarbeitet_am": frappe.utils.now_datetime() if verarbeitet else None, "fehler": fehler or "",
		"hinweise": json.dumps(hinweise or [], ensure_ascii=False), "kennzahlen": json.dumps(kennzahlen, ensure_ascii=False) if kennzahlen is not None else None, "betreff": betreff, "rohinhalt": roh or "",
	})
	doc.insert(ignore_permissions=True)
	return doc


def _prozesse(filters):
	return [_p_dict(frappe.get_doc(DP, x)) for x in frappe.get_all(DP, filters=filters, pluck="name", order_by="creation asc")]


def _teilnahme(tid):
	if not tid or not frappe.db.exists(S.DT["teilnahme"], tid):
		return None
	return S.aus_doc("teilnahme", frappe.get_doc(S.DT["teilnahme"], tid))


def _zaehlpunkt(zid):
	if not zid or not frappe.db.exists(S.DT["zaehlpunkt"], zid):
		return None
	return S.aus_doc("zaehlpunkt", frappe.get_doc(S.DT["zaehlpunkt"], zid))


def _nb(nb_id):
	return next((x for x in S._netzbetreiber_liste() if x["id"] == nb_id), None)


def _nb_fuer(g, zp):
	return _nb((zp or {}).get("netzbetreiberId")) or _nb((g.get("netzbetreiber") or [""])[0]) or {"id": (g.get("netzbetreiber") or [""])[0], "name": "Netzbetreiber", "kurzname": "", "marktpartnerId": ""}


def _mitglied_name(mid):
	if not mid or not frappe.db.exists(S.DT["mitglied"], mid):
		return ""
	m = S.aus_doc("mitglied", frappe.get_doc(S.DT["mitglied"], mid))
	p = m.get("person") or {}
	return p.get("firma") or " ".join(x for x in (p.get("vorname"), p.get("nachname")) if x)


def _ausgabe(p, heute=None):
	t = _teilnahme(p.get("teilnahmeId"))
	return {
		**p, "statusLabel": (K.PROZESS_STATUS.get(p["status"]) or {}).get("label") or p["status"], "ton": (K.PROZESS_STATUS.get(p["status"]) or {}).get("ton") or "neutral",
		"label": (K.EDA_PROZESSE.get(p["prozesscode"]) or {}).get("label") or p["prozesscode"], "kurz": (K.EDA_PROZESSE.get(p["prozesscode"]) or {}).get("kurz") or p["prozesscode"],
		"ampel": K.frist_ampel(p, t, heute or _heute()), "teilnahmeStatus": (t or {}).get("status") or "", "mitgliedName": _mitglied_name((t or {}).get("mitgliedId")), "mitgliedId": (t or {}).get("mitgliedId") or "",
		"response": K.responsecode_info(p.get("responsecode")),
	}


def _uebergang(n, teilnahme_id, daten, fehler):
	try:
		S.teilnahme_uebergang_intern(n, teilnahme_id, daten)
		return True
	except Exception as e:  # noqa: BLE001 – Fehler wird als Klärfall protokolliert
		fehler.append(f"{daten.get('ereignis')}: {e}")
		return False


# ================================================================ Versand und Simulator


def _nb_sicht(g, zpnr, empfaenger):
	zid = frappe.db.get_value(S.DT["zaehlpunkt"], {"zaehlpunktnummer": zpnr}, "name") if zpnr else None
	zp = _zaehlpunkt(zid) if zid else None
	fremd = []
	if zid:
		for t in frappe.get_all(S.DT["teilnahme"], filters={"zaehlpunkt": zid, "gemeinschaft": ["!=", g["id"]], "status": ["in", ["angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt"]]}, fields=["teilnahmefaktor"]):
			fremd.append(t.teilnahmefaktor or 0)
	liste = []
	for t in frappe.get_all(S.DT["teilnahme"], filters={"gemeinschaft": g["id"], "status": ["in", ["aktiv", "abmeldung_angefragt"]]}, fields=["zaehlpunkt", "consent_id", "teilnahmefaktor", "gueltig_ab"]):
		z = _zaehlpunkt(t.zaehlpunkt)
		if z:
			liste.append({"MeteringPoint": z["zaehlpunktnummer"], "ConsentId": t.consent_id or "", "EnergyDirection": K.RICHTUNG_EDA.get(z["richtung"]), "ECPartFact": K.js_str(t.teilnahmefaktor), **({"DateFrom": str(t.gueltig_ab)} if t.gueltig_ab else {})})
	info = {zpnr: {"bekannt": bool(zp) and (not zp.get("nbNummer") or f"AT{zp['nbNummer']}" == empfaenger), "smartMeter": (zp or {}).get("smartMeter") or "unbekannt", "fremdTf": sum(fremd), "fremdAnzahl": len(fremd)}} if zpnr else {}
	return {"zaehlpunkte": info, "liste": liste, "modell": "STATIC" if g.get("verteilmodell") == "statisch" else "DYNAMIC"}


def _versenden(p, g, wiederholung=False):
	t = _teilnahme(p.get("teilnahmeId"))
	zp = _zaehlpunkt(p.get("zaehlpunktId"))
	j = jetzt_iso()
	mid = K.eda_id(g["marktpartnerId"], j, _z6())
	sim = _simulator_aktiv()
	r = K.start_nachricht(p, g, zaehlpunkt=zp, teilnahme=t, messageId=mid, erstellt=_iso_sek(j), modus="SIMU" if sim else "PROD", duplikat=wiederholung)
	_nachricht_anlegen(g, p, "aus", r["code"], p["prozesscode"], r["xml"], g["marktpartnerId"], p["empfaenger"], mid, p["conversationId"], kanal="simulator" if sim else (g.get("edaAnbindung") if g.get("edaAnbindung") in ("email", "kep") else "datei"))
	neu = K.als_gesendet(p, j, mid, wiederholung)
	p.clear()
	p.update(neu)
	if sim:
		e = p.get("ergebnis") or {}
		offen = e.get("simulator") or []
		if not (wiederholung and offen):
			antworten = K.simulator_antworten(K.nachricht_lesen(r["xml"]), _nb_sicht(g, p.get("zaehlpunktnummer"), p.get("empfaenger")), seed=frappe.conf.get("eg_eda_sim_seed") or "oekoinvest", heute=_heute())
			jetzt_ms = datetime.now(timezone.utc).timestamp() * 1000
			for a in antworten:
				offen.append({"faelligMs": jetzt_ms + a["nachTagen"] * _minuten_je_tag() * 60000, "code": a["code"], "prozesscode": a["prozesscode"], "daten": a["daten"]})
			e["simulator"] = offen
			p["ergebnis"] = e
	_p_speichern(p)


def _neuer_prozess(g, prozesscode, n, teilnahme=None, zaehlpunkt=None, prozessdatum=None, parameter=None, freigabe=False, massen_id=""):
	nb = _nb_fuer(g, zaehlpunkt)
	p = K.prozess_neu(prozesscode, gemeinschaft=g, teilnahme=teilnahme, zaehlpunkt=zaehlpunkt, netzbetreiber=nb, prozessdatum=prozessdatum, parameter=parameter or {}, freigabeNoetig=freigabe, jetzt=jetzt_iso(), von=None if n.get("system") else n.get("id"))
	p["conversationId"] = K.eda_id(g.get("marktpartnerId") or "XX000000", jetzt_iso(), _z6())
	p["massenId"] = massen_id
	p["modus"] = "SIMU" if _simulator_aktiv() else "PROD"
	if not p["empfaenger"] and not (K.EDA_PROZESSE.get(prozesscode) or {}).get("intern"):
		konflikt(f"EDA-Adresse des Netzbetreibers {nb.get('kurzname') or nb.get('id')} fehlt (Marktpartner-ID in den Netzbetreiber-Stammdaten pflegen).")
	_p_speichern(p)
	return p


def _zustellen(gid=None, alle=False, maximal=300):
	jetzt_ms = datetime.now(timezone.utc).timestamp() * 1000
	filters = {"status": ["not in", ["verworfen"]]}
	if gid:
		filters["gemeinschaft"] = gid
	faellig = []
	for name in frappe.get_all(DP, filters=filters, pluck="name"):
		doc = frappe.get_doc(DP, name)
		e = aus_json(doc.ergebnis, {}) or {}
		offen = e.get("simulator") or []
		if not offen:
			continue
		jetzt_f = [a for a in offen if alle or a["faelligMs"] <= jetzt_ms]
		if not jetzt_f:
			continue
		e["simulator"] = [a for a in offen if a not in jetzt_f]
		frappe.db.set_value(DP, name, "ergebnis", json.dumps(e, ensure_ascii=False), update_modified=False)
		for a in jetzt_f:
			faellig.append((a, doc.gemeinschaft, doc.conversation_id, doc.empfaenger))
	faellig.sort(key=lambda x: x[0]["faelligMs"])
	n_ok = 0
	for a, gid2, conv, nb_mp in faellig[:maximal]:
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gid2))
		daten = a["daten"]
		if a["code"] == "DATEN_CRMSG" and daten.get("tag"):
			daten = {"MeteringPoint": daten["MeteringPoint"], "ECID": daten.get("ECID"), "Energy": _energie_fuer(g, daten["MeteringPoint"], daten["tag"])}
		j = jetzt_iso()
		xml = K.nachricht_bauen({"code": a["code"], "prozesscode": a["prozesscode"], "absender": nb_mp, "empfaenger": g["marktpartnerId"], "erstellt": _iso_sek(j), "messageId": K.eda_id(nb_mp, j, _z6()), "conversationId": conv, "prozessdatum": _heute(), "modus": "SIMU", "daten": daten})
		if _eingang(S.system_nutzer(), xml, "simulator").get("ok"):
			n_ok += 1
	return {"zugestellt": n_ok}


def _energie_fuer(g, zpnr, tag):
	zid = frappe.db.get_value(S.DT["zaehlpunkt"], {"zaehlpunktnummer": zpnr}, "name")
	zp = _zaehlpunkt(zid) or {}
	tf = frappe.db.get_value(S.DT["teilnahme"], {"zaehlpunkt": zid, "gemeinschaft": g["id"]}, "teilnahmefaktor") if zid else None
	kwp = frappe.db.get_value(S.DT["anlage"], zp.get("anlageId"), "kwp") if zp.get("anlageId") else None
	return K.simulator_energiedaten(zaehlpunktnummer=zpnr, tag=tag, richtung=zp.get("richtung") or "verbrauch", teilnahmefaktor=tf if tf is not None else 100, kwp=kwp or 10, seed=frappe.conf.get("eg_eda_sim_seed") or "oekoinvest")


# ================================================================ Eingang (idempotent je Absender + Message-ID)


def _eingang(n, xml, quelle="manuell"):
	gelesen = K.nachricht_lesen(xml)
	k = gelesen.get("kopf") or {}
	schluessel = f"{k.get('absender') or ''}|{k.get('messageId') or ''}"
	if k.get("messageId"):
		vorhanden = frappe.db.get_value(DN, {"schluessel": schluessel}, ["name", "prozess"], as_dict=True)
		if vorhanden:
			return {"ok": True, "doppelt": True, "nachrichtId": vorhanden.name, "prozessId": vorhanden.prozess or ""}
	gid = frappe.db.get_value(S.DT["gemeinschaft"], {"marktpartner_id": k.get("empfaenger")}, "name") if k.get("empfaenger") else None
	if not gid:
		nicht_gefunden("Keine Gemeinschaft mit dieser EDA-Adresse (Empfänger) gefunden.")
	if not n.get("system"):
		_schreiben(n, gid)
	g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gid))
	kanal = quelle if quelle in ("simulator", "email", "kep", "datei", "manuell", "portal") else "manuell"
	if not gelesen["ok"]:
		m = _nachricht_anlegen(g, None, "ein", k.get("nachrichtencode") or "EDASendError", k.get("prozesscode") or "", xml, k.get("absender") or "", k.get("empfaenger") or "", k.get("messageId") or f"UNGUELTIG-{_z6()}", k.get("conversationId") or "", kanal=kanal, fehler=" · ".join(gelesen["fehler"]), hinweise=gelesen["hinweise"], verarbeitet=False)
		_proto(n, "eg_eda_eingang_fehler", g["id"], f"Ungültige EDA-Nachricht {m.name}: {gelesen['fehler'][0]}")
		return {"ok": False, "nachrichtId": m.name, "fehler": gelesen["fehler"]}
	pname = frappe.db.get_value(DP, {"gemeinschaft": g["id"], "conversation_id": k.get("conversationId"), "prozesscode": ["!=", "CR_MSG"]}, "name")
	p = _p_dict(frappe.get_doc(DP, pname)) if pname else None
	zpnr = gelesen["daten"].get("MeteringPoint") or ""
	t = _teilnahme(p.get("teilnahmeId")) if p and p.get("teilnahmeId") else None
	if not t and zpnr:
		zid = frappe.db.get_value(S.DT["zaehlpunkt"], {"zaehlpunktnummer": zpnr}, "name")
		kand = [_teilnahme(x) for x in frappe.get_all(S.DT["teilnahme"], filters={"zaehlpunkt": zid, "gemeinschaft": g["id"]}, pluck="name")] if zid else []
		t = next((x for x in kand if x["status"] in ("aktiv", "abmeldung_angefragt")), None) or next((x for x in kand if x["status"] != "verworfen"), None)
	if p:
		r = K.eingang_anwenden(p, gelesen, teilnahme=t, jetzt=jetzt_iso())
		p = r["prozess"]
		_p_speichern(p)
	else:
		o = K.eingang_ohne_prozess(gelesen, teilnahme=t)
		r = {"ereignisse": o["ereignisse"], "energiedaten": o["energiedaten"], "hinweise": o["hinweise"], "klaerfall": "" if o["prozesscode"] else (o["hinweise"][0] if o["hinweise"] else ""), "verteilschluessel": ""}
		if o["prozesscode"] == "CR_MSG":
			mon = K.lokal_tag(((gelesen["daten"].get("Energy") or {}).get("start")) or _iso_sek(jetzt_iso()))[:7]
			conv = f"CRMSG-{g['id']}-{mon}"
			pname = frappe.db.get_value(DP, {"conversation_id": conv}, "name")
			if pname:
				p = _p_dict(frappe.get_doc(DP, pname))
			else:
				p = K.prozess_neu("CR_MSG", gemeinschaft=g, netzbetreiber=_nb_fuer(g, None), prozessdatum=f"{mon}-01", jetzt=jetzt_iso())
				p.update({"conversationId": conv, "status": "bestaetigt", "ergebnis": {"nachrichten": 0}})
				p["verlauf"].append({"am": jetzt_iso(), "von": "entwurf", "nach": "bestaetigt", "nachricht": "DATEN_CRMSG", "text": f"Datenempfang {mon}", "konto": None})
			p["ergebnis"] = {**(p.get("ergebnis") or {}), "nachrichten": int((p.get("ergebnis") or {}).get("nachrichten") or 0) + 1}
			_p_speichern(p)
		elif o["prozesscode"]:
			zp = _zaehlpunkt((t or {}).get("zaehlpunktId"))
			p = K.prozess_neu(o["prozesscode"], gemeinschaft=g, teilnahme=t, zaehlpunkt=zp, netzbetreiber=_nb_fuer(g, zp), prozessdatum=k.get("prozessdatum"), parameter={"zum": gelesen["daten"].get("ConsentEnd") or ""}, jetzt=jetzt_iso())
			p.update({"conversationId": k.get("conversationId"), "status": "abgeschlossen", "zaehlpunktnummer": zpnr})
			p["verlauf"].append({"am": jetzt_iso(), "von": "entwurf", "nach": "abgeschlossen", "nachricht": k.get("nachrichtencode"), "text": o["text"], "konto": None})
			_p_speichern(p)
	payload, kennzahlen, tag = None, None, ""
	hinweise = list(gelesen["hinweise"]) + list(r.get("hinweise") or [])
	if r.get("energiedaten"):
		e = K.energiedaten_payload(gelesen, gemeinschaftId=g["id"], nachrichtId="")
		payload, tag = e["payload"], e["tag"]
		kz = K.energiedaten_kennzahlen(payload)
		kennzahlen = {"werte": kz["werte"], "l3": kz["l3"], "fehlend": kz["fehlend"], "von": (payload or {}).get("von") or "", "groessen": kz["groessen"]}
		hinweise += e["hinweise"]
	m = _nachricht_anlegen(g, p, "ein", k.get("nachrichtencode"), k.get("prozesscode"), xml, k.get("absender"), k.get("empfaenger"), k.get("messageId"), k.get("conversationId"), kanal=kanal, teilnahme_id=(t or {}).get("id") or "", zaehlpunktnummer=zpnr, tag=tag, hinweise=hinweise, fehler=r.get("klaerfall") or "", kennzahlen=kennzahlen)
	fehler = []
	for ev in r.get("ereignisse") or []:
		if not t:
			fehler.append(f"Teilnahme zum Zählpunkt nicht gefunden – Ereignis {ev['ereignis']} nicht übernommen.")
			break
		if not _uebergang(S.system_nutzer(), t["id"], {**ev, "prozessId": (p or {}).get("id") or ""}, fehler):
			break
	weitergeleitet = False
	if payload:
		payload["nachrichtId"] = m.name
		try:
			frappe.enqueue("oekoinvest_app.plattform.api.eg_energie.energiedaten_empfangen_intern", queue="long", payload=payload, enqueue_after_commit=True)
			weitergeleitet = True
		except Exception as e:  # noqa: BLE001
			fehler.append(f"Weitergabe an Energiedaten (WP3): {e}")
	if r.get("verteilschluessel") and (p or {}).get("parameter", {}).get("verteilschluesselId") and hasattr(S, "verteilschluessel_status_intern"):
		vs_id = p["parameter"]["verteilschluesselId"]
		if not frappe.db.exists(DP, {"gemeinschaft": g["id"], "prozesscode": "EC_PRT_CHANGE", "status": ["in", K.PROZESS_OFFEN], "parameter": ["like", f"%{vs_id}%"]}):
			try:
				S.verteilschluessel_status_intern(S.system_nutzer(), vs_id, {"status": "gueltig", "edaProzessId": p["id"]})
			except Exception as e:  # noqa: BLE001
				fehler.append(f"Verteilschlüssel: {e}")
	if fehler or weitergeleitet:
		m.weitergeleitet = 1 if weitergeleitet else 0
		if fehler:
			m.fehler = " · ".join(x for x in [m.fehler, *fehler] if x)
		m.save(ignore_permissions=True)
	if (fehler or r.get("klaerfall")) and p:
		p["merker"] = sorted(set((p.get("merker") or []) + ["klaerfall"]))
		_p_speichern(p)
		_proto(None, "eg_eda_klaerfall", g["id"], f"EDA-Klärfall {m.nachrichtencode} ({m.name}): {(fehler or [r.get('klaerfall')])[0]}")
	return {"ok": True, "doppelt": False, "nachrichtId": m.name, "prozessId": (p or {}).get("id") or "", "ereignisse": [e["ereignis"] for e in r.get("ereignisse") or []], "weitergeleitet": weitergeleitet, "fehler": fehler}


# ================================================================ Lesen


def _teilnahmen_mit_zp(gid):
	aus = []
	for name in frappe.get_all(S.DT["teilnahme"], filters={"gemeinschaft": gid}, pluck="name", order_by="creation asc"):
		t = _teilnahme(name)
		zp = _zaehlpunkt(t.get("zaehlpunktId"))
		if zp:
			aus.append((t, zp))
	return aus


def _empfang_seit(gid, standard):
	"""Erster Tag mit Energiedaten über diese Plattform – davor (z. B. vor dem Wechsel) keine Lücken melden."""
	r = frappe.get_all(DN, filters={"gemeinschaft": gid, "nachrichtencode": "DATEN_CRMSG", "tag": ["is", "set"]}, pluck="tag", order_by="tag asc", limit_page_length=1)
	seit = str(r[0]) if r else ""
	return seit if seit and seit > standard else standard


def _empfangene_tage(gid):
	e = {}
	for r in frappe.get_all(DN, filters={"gemeinschaft": gid, "nachrichtencode": "DATEN_CRMSG", "tag": ["is", "set"]}, fields=["zaehlpunktnummer", "tag"]):
		e.setdefault(r.zaehlpunktnummer, []).append(str(r.tag))
	return e


@frappe.whitelist(methods=["POST"])
def uebersicht(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	if _simulator_aktiv():
		_zustellen(gemeinschaftId)
	g, k = _lesen(n, gemeinschaftId)
	h = _heute()
	ausg = sorted((_ausgabe(p, h) for p in _prozesse({"gemeinschaft": g["id"]})), key=lambda p: str((p.get("verlauf") or [{}])[-1].get("am") or ""), reverse=True)
	tl = []
	for t, zp in _teilnahmen_mit_zp(g["id"]):
		letzter = next((p for p in ausg if p.get("teilnahmeId") == t["id"] and p["prozesscode"] != "CR_MSG"), None)
		tl.append({"id": t["id"], "status": t["status"], "statusLabel": (M.TEILNAHME_STATUS.get(t["status"]) or {}).get("label") or t["status"], "teilnahmefaktor": t["teilnahmefaktor"], "consentId": t.get("consentId"), "gueltigAb": t.get("gueltigAb"), "gueltigBis": t.get("gueltigBis"), "fristBis": t.get("fristBis"), "zaehlpunktId": zp["id"], "zaehlpunktnummer": zp["zaehlpunktnummer"], "richtung": zp["richtung"], "smartMeter": zp.get("smartMeter"), "netzbetreiberId": zp.get("netzbetreiberId"), "mitgliedId": t.get("mitgliedId"), "mitgliedName": _mitglied_name(t.get("mitgliedId")), "letzterProzess": {"id": letzter["id"], "prozesscode": letzter["prozesscode"], "status": letzter["status"], "responsecode": letzter.get("responsecode"), "ampel": letzter["ampel"]} if letzter else None, "anmeldungVorgemerkt": bool(t.get("anmeldungVorgemerkt"))})
	luecken = K.datenluecken(teilnahmen=[{"teilnahmeId": x["id"], "zaehlpunktnummer": x["zaehlpunktnummer"], "gueltigAb": x["gueltigAb"], "gueltigBis": x["gueltigBis"]} for x in tl if x["gueltigAb"] and x["status"] in ("aktiv", "abmeldung_angefragt", "beendet")], empfangen=_empfangene_tage(g["id"]), von=_empfang_seit(g["id"], K.plus_tage(h, -14)), bis=h, heute=h)
	nbs = [x for x in (_nb(i) for i in dict.fromkeys(list(g.get("netzbetreiber") or []) + [x["netzbetreiberId"] for x in tl if x["netzbetreiberId"]])) if x]
	offen = [p for p in ausg if p["status"] in K.PROZESS_OFFEN and p["prozesscode"] != "CR_MSG"]
	return {
		"gemeinschaft": {c: g.get(c) for c in ("id", "name", "modell", "status", "marktpartnerId", "gemeinschaftsId", "verteilmodell", "edaAnbindung", "netzbetreiber")},
		"voraussetzungen": K.gemeinschaft_eda_pruefen(g), "rechte": {r: SK.eg_stufe(k, r) for r in SK.EG_RECHTE}, "rollen": k["rollen"], "heute": h,
		"kennzahlen": {
			"prozesseOffen": len(offen), "freigabenOffen": sum(1 for p in ausg if p["status"] == "freigabe_offen"), "zustimmungOffen": sum(1 for x in tl if x["status"] == "zustimmung_offen"),
			"wartetTechnik": sum(1 for x in tl if x["status"] == "wartet_technik"), "fristRot": sum(1 for p in ausg if p["ampel"]["ampel"] == "rot"), "fristGelb": sum(1 for p in ausg if p["ampel"]["ampel"] == "gelb"),
			"abgelehnt": sum(1 for x in tl if x["status"] in ("abgelehnt", "abgelaufen")), "entwurf": sum(1 for x in tl if x["status"] == "entwurf"), "aktiv": sum(1 for x in tl if x["status"] == "aktiv"),
			"nachrichtenHeute": frappe.db.count(DN, {"gemeinschaft": g["id"], "zeitpunkt": [">=", h]}), "zpMitLuecken": len(luecken), "lueckenTage": sum(x["anzahl"] for x in luecken),
		},
		"prozesse": ausg[:400], "teilnahmen": tl, "luecken": luecken,
		"netzbetreiber": [{"id": x["id"], "name": x["name"], "kurzname": x["kurzname"], "marktpartnerId": x["marktpartnerId"], "kontaktEmail": x["kontaktEmail"], "anleitung": K.portal_anleitung(x["id"])} for x in nbs],
		"simulator": {"aktiv": _simulator_aktiv(), "ausstehend": 0, "zeitrafferSekunden": _minuten_je_tag() * 60}, "vierAugenAb": K.VIER_AUGEN_AB,
	}


@frappe.whitelist(methods=["POST"])
def prozesse(gemeinschaftId=None, filter=None, als_benutzer=None):  # noqa: N803, A002
	n = _n(als_benutzer)
	f = _daten(filter)
	g, _k = _lesen(n, gemeinschaftId)
	flt = {"gemeinschaft": g["id"]}
	if f.get("status"):
		flt["status"] = f["status"]
	if f.get("code"):
		flt["prozesscode"] = f["code"]
	return {"prozesse": [_ausgabe(p) for p in _prozesse(flt)], "heute": _heute()}


@frappe.whitelist(methods=["POST"])
def prozess(id=None, als_benutzer=None):  # noqa: A002
	n = _n(als_benutzer)
	if not id or not frappe.db.exists(DP, id):
		nicht_gefunden("EDA-Prozess nicht gefunden.")
	p = _p_dict(frappe.get_doc(DP, id))
	g, k = _lesen(n, p["gemeinschaftId"])
	nachrichten = [_n_dict(frappe.get_doc(DN, x), True) for x in frappe.get_all(DN, filters={"prozess": id}, pluck="name", order_by="zeitpunkt asc")][-60:]
	abgleich = None
	if p["prozesscode"] == "EC_PODLIST" and (p.get("ergebnis") or {}).get("liste") is not None:
		soll = [{"zaehlpunktnummer": zp["zaehlpunktnummer"], "teilnahmeId": t["id"], "status": t["status"], "consentId": t.get("consentId"), "teilnahmefaktor": t["teilnahmefaktor"], "richtung": zp["richtung"], "gueltigBis": t.get("gueltigBis")} for t, zp in _teilnahmen_mit_zp(g["id"])]
		abgleich = K.podlist_abgleich(soll, p["ergebnis"]["liste"], _heute())
	return {"prozess": _ausgabe(p), "nachrichten": nachrichten, "teilnahme": _teilnahme(p.get("teilnahmeId")), "abgleich": abgleich, "rechte": {r: SK.eg_stufe(k, r) for r in SK.EG_RECHTE}, "gemeinschaft": {"id": g["id"], "name": g["name"]}}


@frappe.whitelist(methods=["POST"])
def journal(gemeinschaftId=None, filter=None, als_benutzer=None):  # noqa: N803, A002
	n = _n(als_benutzer)
	f = _daten(filter)
	g, _k = _lesen(n, gemeinschaftId)
	if f.get("nachrichtId"):
		if not frappe.db.exists(DN, {"name": f["nachrichtId"], "gemeinschaft": g["id"]}):
			nicht_gefunden("Nachricht nicht gefunden.")
		return {"nachricht": _n_dict(frappe.get_doc(DN, f["nachrichtId"]), True)}
	flt = {"gemeinschaft": g["id"]}
	if f.get("richtung") in ("aus", "ein"):
		flt["richtung"] = "ausgang" if f["richtung"] == "aus" else "eingang"
	if f.get("code"):
		flt["nachrichtencode"] = f["code"]
	oder = None
	q = str(f.get("q") or "").strip()
	if q:
		like = f"%{q}%"
		oder = [["message_id", "like", like], ["conversation_id", "like", like], ["zaehlpunktnummer", "like", like], ["sha256", "like", like]]
	limit = min(1000, max(1, int(f.get("limit") or 200)))
	namen = frappe.get_all(DN, filters=flt, or_filters=oder, pluck="name", order_by="zeitpunkt desc", limit_page_length=limit)
	codes = sorted({r.nachrichtencode for r in frappe.get_all(DN, filters={"gemeinschaft": g["id"]}, fields=["nachrichtencode"], distinct=True)})
	return {"nachrichten": [_n_dict(frappe.get_doc(DN, x)) for x in namen], "gesamt": frappe.db.count(DN, flt), "codes": codes, "gemeinschaft": {"id": g["id"], "name": g["name"]}}


@frappe.whitelist(methods=["POST"])
def freigaben(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	g, k = S.zugriff(n, gemeinschaftId, "eda_freigeben", 1)
	return {"freigaben": [_ausgabe(p) for p in _prozesse({"gemeinschaft": g["id"], "status": "freigabe_offen"})], "darfFreigeben": SK.eg_stufe(k, "eda_freigeben") >= 2, "gemeinschaft": {"id": g["id"], "name": g["name"]}}


# ================================================================ Auslösen


def _ids(liste):
	ids = list(dict.fromkeys(str(x) for x in (liste or [])))
	if not ids:
		ungueltig("Bitte mindestens eine Teilnahme auswählen.")
	if len(ids) > K.MASSEN_MAX:
		ungueltig(f"Höchstens {K.MASSEN_MAX} Teilnahmen je Auftrag.")
	return ids


def _teilnahmen_zp(zid):
	return [_teilnahme(x) for x in frappe.get_all(S.DT["teilnahme"], filters={"zaehlpunkt": zid}, pluck="name")]


def anmelden_intern(n, gid, ids, offline=False):
	g, _k = _schreiben(n, gid)
	prozesse_aus, fehler, hinweise = [], [], []
	for tid in ids:
		t = _teilnahme(tid)
		if not t or t["gemeinschaftId"] != g["id"]:
			fehler.append({"id": tid, "fehler": "Teilnahme nicht gefunden."})
			continue
		zp = _zaehlpunkt(t["zaehlpunktId"])
		offen = _prozesse({"teilnahme": tid})
		r = K.anmeldung_pruefen(gemeinschaft=g, teilnahme=t, zaehlpunkt=zp, teilnahmenDesZp=_teilnahmen_zp(t["zaehlpunktId"]), offeneProzesse=offen, heute=_heute())
		if not r["ok"]:
			fehler.append({"id": tid, "fehler": " ".join(r["fehler"])})
			continue
		hinweise += [{"id": tid, "hinweis": x} for x in r["hinweise"]]
		p = _neuer_prozess(g, "EC_REQ_OFF" if offline else "EC_REQ_ONL", n, teilnahme=t, zaehlpunkt=zp, prozessdatum=_heute(), parameter={"teilnahmefaktor": t["teilnahmefaktor"], "richtung": K.RICHTUNG_EDA.get(zp["richtung"])})
		fl = []
		ok = True
		for ev in r["ereignisseVorher"] + ["senden"]:
			if ok:
				ok = _uebergang(n, tid, {"ereignis": ev, "prozessId": p["id"]}, fl)
		if not ok:
			p["status"] = "verworfen"
			p["verlauf"].append({"am": jetzt_iso(), "von": "entwurf", "nach": "verworfen", "nachricht": "", "text": fl[0], "konto": None})
			_p_speichern(p)
			fehler.append({"id": tid, "fehler": " ".join(fl)})
			continue
		for alt in offen:
			if alt["id"] != p["id"] and alt["status"] in ("abgelehnt", "zeitueberschreitung", "fehler") and not alt.get("nachfolgerId"):
				alt["nachfolgerId"] = p["id"]
				_p_speichern(alt)
		_versenden(p, g)
		_proto(n, "eg_eda_anmeldung", g["id"], f"{p['prozesscode']} für {p['zaehlpunktnummer']} gesendet ({p['id']})")
		prozesse_aus.append(_ausgabe(p))
	return {"prozesse": prozesse_aus, "fehler": fehler, "hinweise": hinweise}


@frappe.whitelist(methods=["POST"])
def anmelden(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	d = _daten(daten)
	return anmelden_intern(_n(als_benutzer), gemeinschaftId, _ids(d.get("teilnahmeIds")), bool(d.get("offline")))


def _freigabe_melden(g, anzahl, was):
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	for o in frappe.get_all(S.DT["organ"], filters={"gemeinschaft": g["id"], "status": ["!=", "beendet"], "funktion": ["in", ["obmann", "obmann_stv", "vorstand", "geschaeftsfuehrer"]]}, fields=["konto"]):
		if o.konto:
			anlegen(o.konto, "system", f"Freigabe nötig: {anzahl} {was}", f"Für „{g['name']}“ liegen {anzahl} {was} zur Freigabe (Vier-Augen-Prinzip) bereit.", f"/portal/eg/{g['id']}/verwaltung", "eg_gemeinschaft", g["id"], mail=True)


@frappe.whitelist(methods=["POST"])
def tf_aendern(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	liste = (_daten(daten).get("aenderungen") or [])[: K.MASSEN_MAX]
	if not liste:
		ungueltig("Bitte mindestens eine Änderung angeben.")
	g, _k = _schreiben(n, gemeinschaftId)
	vier = K.vier_augen_noetig("tf", len(liste))
	massen = neue_id(DP) if vier else ""
	aus, fehler = [], []
	for a in liste:
		t = _teilnahme(str(a.get("teilnahmeId") or ""))
		if not t or t["gemeinschaftId"] != g["id"]:
			fehler.append({"id": a.get("teilnahmeId"), "fehler": "Teilnahme nicht gefunden."})
			continue
		try:
			tf = int(a.get("teilnahmefaktor"))
		except (TypeError, ValueError):
			tf = None
		r = K.tf_aenderung_pruefen(gemeinschaft=g, teilnahme=t, teilnahmefaktor=tf, ab=str(a.get("ab") or ""), teilnahmenDesZp=_teilnahmen_zp(t["zaehlpunktId"]), prozesse=_prozesse({"teilnahme": t["id"]}), heute=_heute())
		if not r["ok"]:
			fehler.append({"id": t["id"], "fehler": " ".join(r["fehler"])})
			continue
		p = _neuer_prozess(g, "EC_PRTFACT_CHG", n, teilnahme=t, zaehlpunkt=_zaehlpunkt(t["zaehlpunktId"]), prozessdatum=str(a["ab"]), parameter={"teilnahmefaktor": tf, "ab": str(a["ab"]), "vorher": t["teilnahmefaktor"]}, freigabe=vier, massen_id=massen)
		if not vier:
			_versenden(p, g)
		_proto(n, "eg_eda_tf", g["id"], f"TF {t['teilnahmefaktor']} → {tf} % ab {a['ab']} ({p['id']}{', Freigabe offen' if vier else ''})")
		aus.append(_ausgabe(p))
	if vier and aus:
		_freigabe_melden(g, len(aus), "TF-Änderungen")
	return {"prozesse": aus, "fehler": fehler, "freigabeNoetig": vier and bool(aus), "massenId": massen}


@frappe.whitelist(methods=["POST"])
def abmelden(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	ids = _ids(d.get("teilnahmeIds"))
	zum = str(d.get("zum") or "")
	g, _k = _schreiben(n, gemeinschaftId)
	vier = K.vier_augen_noetig("abmelden", len(ids))
	massen = neue_id(DP) if vier else ""
	aus, fehler = [], []
	for tid in ids:
		t = _teilnahme(tid)
		if not t or t["gemeinschaftId"] != g["id"]:
			fehler.append({"id": tid, "fehler": "Teilnahme nicht gefunden."})
			continue
		r = K.abmeldung_pruefen(gemeinschaft=g, teilnahme=t, zum=zum, prozesse=_prozesse({"teilnahme": tid}), heute=_heute())
		if not r["ok"]:
			fehler.append({"id": tid, "fehler": " ".join(r["fehler"])})
			continue
		p = _neuer_prozess(g, "CM_REV_SP", n, teilnahme=t, zaehlpunkt=_zaehlpunkt(t["zaehlpunktId"]), prozessdatum=zum, parameter={"zum": zum}, freigabe=vier, massen_id=massen)
		if not vier:
			fl = []
			if not _uebergang(n, tid, {"ereignis": "cm_rev_sp", "datum": zum, "prozessId": p["id"]}, fl):
				p["status"] = "verworfen"
				_p_speichern(p)
				fehler.append({"id": tid, "fehler": " ".join(fl)})
				continue
			_versenden(p, g)
		_proto(n, "eg_eda_abmeldung", g["id"], f"Abmeldung {p['zaehlpunktnummer']} zum {zum} ({p['id']}{', Freigabe offen' if vier else ''})")
		aus.append(_ausgabe(p))
	if vier and aus:
		_freigabe_melden(g, len(aus), "Abmeldungen")
	return {"prozesse": aus, "fehler": fehler, "freigabeNoetig": vier and bool(aus), "massenId": massen}


@frappe.whitelist(methods=["POST"])
def freigeben(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	entscheidung = d.get("entscheidung") or "erteilen"
	if entscheidung not in ("erteilen", "ablehnen"):
		ungueltig("Entscheidung: erteilen oder ablehnen.")
	ids = list(dict.fromkeys(str(x) for x in (d.get("prozessIds") or [])))[: K.MASSEN_MAX]
	if not ids:
		ungueltig("Bitte Prozesse auswählen.")
	g, _k = S.zugriff(n, gemeinschaftId, "eda_freigeben", 2)
	frei, abgel, fehler = 0, 0, []
	for pid in ids:
		if not frappe.db.exists(DP, {"name": pid, "gemeinschaft": g["id"]}):
			fehler.append({"id": pid, "fehler": "Prozess nicht gefunden."})
			continue
		p = _p_dict(frappe.get_doc(DP, pid))
		try:
			p = K.freigabe_anwenden(p, entscheidung, n.get("id"), jetzt_iso(), str(d.get("grund") or "")[:300])
		except ValueError as e:
			fehler.append({"id": pid, "fehler": str(e)})
			continue
		_p_speichern(p)
		_proto(n, "eg_eda_freigabe", g["id"], f"{p['prozesscode']} {p['zaehlpunktnummer']}: Freigabe {'erteilt' if entscheidung == 'erteilen' else 'abgelehnt'} ({pid})")
		if entscheidung != "erteilen":
			abgel += 1
			continue
		if p["prozesscode"] == "CM_REV_SP":
			fl = []
			if not _uebergang(S.system_nutzer(), p["teilnahmeId"], {"ereignis": "cm_rev_sp", "datum": p["parameter"].get("zum"), "prozessId": pid}, fl):
				p = K.frist_anwenden(p, "zeitueberschreitung", jetzt_iso(), f"Nach Freigabe nicht sendbar: {fl[0]}")
				p["status"] = "fehler"
				_p_speichern(p)
				fehler.append({"id": pid, "fehler": " ".join(fl)})
				continue
		_versenden(p, g)
		frei += 1
	return {"freigegeben": frei, "abgelehnt": abgel, "fehler": fehler}


@frappe.whitelist(methods=["POST"])
def verteilschluessel_senden(verteilschluesselId=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	if not verteilschluesselId or not frappe.db.exists(S.DT["verteilschluessel"], verteilschluesselId):
		nicht_gefunden("Verteilschlüssel nicht gefunden.")
	vs = S.aus_doc("verteilschluessel", frappe.get_doc(S.DT["verteilschluessel"], verteilschluesselId))
	g, _k = _schreiben(n, vs["gemeinschaftId"])
	if g.get("verteilmodell") != "statisch":
		konflikt("Aufteilungsschlüssel gibt es nur im statischen Modell.")
	if vs.get("status") != "entwurf":
		konflikt("Dieser Verteilschlüssel wurde bereits gesendet.")
	ab = vs["gueltigAb"] if vs["gueltigAb"] > _heute() else _heute()
	aus, fehler = [], []
	for pos in vs.get("positionen") or []:
		t = _teilnahme(pos["teilnahmeId"])
		if not t or t["status"] != "aktiv":
			fehler.append({"id": pos["teilnahmeId"], "fehler": "Teilnahme nicht aktiv."})
			continue
		if any(p["status"] in K.PROZESS_OFFEN for p in _prozesse({"teilnahme": t["id"]})):
			fehler.append({"id": t["id"], "fehler": "Für diese Teilnahme läuft bereits ein EDA-Prozess."})
			continue
		p = _neuer_prozess(g, "EC_PRT_CHANGE", n, teilnahme=t, zaehlpunkt=_zaehlpunkt(t["zaehlpunktId"]), prozessdatum=ab, parameter={"pct": pos["pct"], "ab": ab, "verteilschluesselId": vs["id"]})
		_versenden(p, g)
		aus.append(_ausgabe(p))
	if aus and hasattr(S, "verteilschluessel_status_intern"):
		try:
			S.verteilschluessel_status_intern(S.system_nutzer(), vs["id"], {"status": "gesendet", "edaProzessId": aus[0]["id"]})
		except Exception as e:  # noqa: BLE001
			fehler.append({"id": vs["id"], "fehler": str(e)})
	_proto(n, "eg_eda_schluessel", g["id"], f"Aufteilungsschlüssel {vs['id']} gesendet ({len(aus)} Zählpunkte)")
	return {"prozesse": aus, "fehler": fehler}


def podlist_intern(n, gid):
	g, _k = _schreiben(n, gid)
	v = K.gemeinschaft_eda_pruefen(g)
	if v:
		konflikt(v[0])
	offen = next((p for p in _prozesse({"gemeinschaft": g["id"], "prozesscode": "EC_PODLIST"}) if p["status"] in K.PROZESS_OFFEN), None)
	if offen:
		return {"prozess": _ausgabe(offen), "bereitsOffen": True}
	p = _neuer_prozess(g, "EC_PODLIST", n, prozessdatum=_heute())
	_versenden(p, g)
	_proto(n, "eg_eda_podlist", g["id"], f"Zählpunktliste angefordert ({p['id']})")
	return {"prozess": _ausgabe(p)}


@frappe.whitelist(methods=["POST"])
def podlist_anfordern(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	return podlist_intern(_n(als_benutzer), gemeinschaftId)


@frappe.whitelist(methods=["POST"])
def nachforderung(daten=None, als_benutzer=None):
	return nachforderung_intern(_n(als_benutzer), daten)


def nachforderung_intern(n, daten):
	"""CR_REQ_PT für einen Zählpunkt bzw. eine Teilnahme (auch für WP3: Datenqualitäts-Reklamation aus enQualitaet)."""
	d = _daten(daten)
	t = _teilnahme(d.get("teilnahmeId")) if d.get("teilnahmeId") else None
	if not t and d.get("zaehlpunktId"):
		flt = {"zaehlpunkt": d["zaehlpunktId"], "status": ["in", ["aktiv", "abmeldung_angefragt", "beendet"]]}
		if d.get("gemeinschaftId"):
			flt["gemeinschaft"] = d["gemeinschaftId"]
		kand = frappe.get_all(S.DT["teilnahme"], filters=flt, pluck="name")
		if len(kand) > 1:
			ungueltig("Der Zählpunkt nimmt an mehreren Gemeinschaften teil – bitte die Gemeinschaft angeben.")
		t = _teilnahme(kand[0]) if kand else None
	if not t:
		nicht_gefunden("Teilnahme nicht gefunden.")
	g, _k = _schreiben(n, t["gemeinschaftId"])
	von, bis = str(d.get("von") or ""), str(d.get("bis") or "")
	r = K.nachforderung_pruefen(gemeinschaft=g, teilnahme=t, von=von, bis=bis, heute=_heute())
	if not r["ok"]:
		ungueltig(" ".join(r["fehler"]))
	p = _neuer_prozess(g, "CR_REQ_PT", n, teilnahme=t, zaehlpunkt=_zaehlpunkt(t["zaehlpunktId"]), prozessdatum=_heute(), parameter={"von": von, "bis": bis, "vonUtc": K.tag_beginn_utc(von), "bisUtc": K.tag_beginn_utc(K.plus_tage(bis, 1))})
	_versenden(p, g)
	_proto(n, "eg_eda_nachforderung", g["id"], f"Nachforderung {p['zaehlpunktnummer']} {von}–{bis} ({p['id']})")
	return {"prozess": _ausgabe(p)}


@frappe.whitelist(methods=["POST"])
def nachricht_eingang(daten=None, als_benutzer=None):
	n = _n(als_benutzer)
	d = _daten(daten)
	xml = d.get("xml")
	if not isinstance(xml, str) or not xml.strip():
		ungueltig("Bitte die EDA-Nachricht (XML) angeben.")
	if len(xml) > 4 * 1024 * 1024:
		ungueltig("Nachricht zu groß.")
	return _eingang(n, xml, str(d.get("quelle") or "manuell"))


@frappe.whitelist(methods=["POST"])
def gemeinschaft_bereit(daten=None, als_benutzer=None):
	n = _n(als_benutzer)
	gid = _daten(daten).get("gemeinschaftId")
	ids = frappe.get_all(S.DT["teilnahme"], filters={"gemeinschaft": gid, "status": "entwurf", "anmeldung_vorgemerkt": 1}, pluck="name")
	if not ids:
		return {"prozesse": [], "fehler": [], "hinweise": [], "text": "Keine zur Anmeldung vorgemerkten Teilnahmen."}
	return anmelden_intern(n, gid, ids)


# ================================================================ Fristen, Erinnerungen, Massenaktionen


def erinnern_intern(n, gid, nur=None):
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	if n.get("system"):
		g = S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], gid))
	else:
		g, _k = _schreiben(n, gid)
	liste = []
	for t, zp in _teilnahmen_mit_zp(g["id"]):
		if t["status"] != "zustimmung_offen" or (nur and t["id"] not in nur):
			continue
		p = next((x for x in reversed(_prozesse({"teilnahme": t["id"], "prozesscode": ["in", ["EC_REQ_ONL", "EC_REQ_OFF"]], "status": "bestaetigt"}))), None)
		if not p:
			continue
		m = S.aus_doc("mitglied", frappe.get_doc(S.DT["mitglied"], t["mitgliedId"])) if t.get("mitgliedId") and frappe.db.exists(S.DT["mitglied"], t["mitgliedId"]) else {}
		name = _mitglied_name(t.get("mitgliedId"))
		nb = _nb_fuer(g, zp)
		stufe = len(p.get("erinnerungen") or []) + 1
		txt = K.erinnerung_text(name=name, gemeinschaftName=g["name"], gemeinschaftsId=g.get("gemeinschaftsId"), zaehlpunktnummer=zp["zaehlpunktnummer"], teilnahmefaktor=t["teilnahmefaktor"], fristBis=p.get("fristBis"), netzbetreiberId=nb.get("id"), netzbetreiberName=nb.get("kurzname") or nb.get("name"), stufe=stufe, heute=_heute())
		kanal = "vorbereitet"
		if m.get("kontoId"):
			if anlegen(m["kontoId"], "system", txt["betreff"], "Bitte stimmen Sie im Portal Ihres Netzbetreibers zu – Anleitung in der E-Mail.", "/portal/eg", "eg_gemeinschaft", g["id"], mail=True, mail_text=txt["text"], mail_betreff=txt["betreff"]):
				kanal = "portal"
		elif (m.get("person") or {}).get("email"):
			kanal = "email_vorbereitet"
		p["erinnerungen"] = (p.get("erinnerungen") or []) + [{"am": jetzt_iso(), "stufe": stufe, "kanal": kanal, "an": (m.get("person") or {}).get("email") or ("Portalkonto" if m.get("kontoId") else "")}]
		_p_speichern(p)
		liste.append({"teilnahmeId": t["id"], "prozessId": p["id"], "name": name, "kanal": kanal, "stufe": stufe, "betreff": txt["betreff"], "text": txt["text"], "email": (m.get("person") or {}).get("email") or ""})
	if liste:
		_proto(n, "eg_eda_erinnerung", g["id"], f"{len(liste)} Erinnerung(en) zur Zustimmung im Netzbetreiber-Portal")
	return {"erinnert": len(liste), "perPortal": sum(1 for x in liste if x["kanal"] == "portal"), "vorbereitet": sum(1 for x in liste if x["kanal"] != "portal"), "liste": liste}


@frappe.whitelist(methods=["POST"])
def erinnern(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	ids = _daten(daten).get("teilnahmeIds") or None
	return erinnern_intern(_n(als_benutzer), gemeinschaftId, [str(x) for x in ids] if ids else None)


@frappe.whitelist(methods=["POST"])
def erneut_anstossen(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	_schreiben(n, gemeinschaftId)
	nur = set(str(x) for x in (_daten(daten).get("teilnahmeIds") or [])) or None
	neu, uebersprungen = [], []
	for t, _zp in _teilnahmen_mit_zp(gemeinschaftId):
		if t["status"] not in ("abgelehnt", "abgelaufen") or (nur and t["id"] not in nur):
			continue
		letzter = (_prozesse({"teilnahme": t["id"]}) or [{}])[-1]
		info = K.responsecode_info(letzter.get("responsecode") or t.get("responsecode"))
		if info["code"] and not info["erneut"]:
			uebersprungen.append({"id": t["id"], "grund": f"{info['code']} {info['text']} – {info['loesung']}"})
		else:
			neu.append(t["id"])
	anm = anmelden_intern(n, gemeinschaftId, neu) if neu else {"prozesse": [], "fehler": []}
	er = erinnern_intern(n, gemeinschaftId, list(nur) if nur else None)
	return {"erneut": len(anm["prozesse"]), "erinnert": er["erinnert"], "uebersprungen": uebersprungen, "fehler": anm["fehler"], "prozesse": anm["prozesse"], "erinnerungen": er["liste"]}


def fristen_lauf_intern(n, gid=None):
	if _simulator_aktiv():
		_zustellen(gid)
	h = _heute()
	flt = {"status": ["in", K.PROZESS_OFFEN]}
	if gid:
		flt["gemeinschaft"] = gid
	prozesse_l = _prozesse(flt)
	tids = {p["teilnahmeId"] for p in prozesse_l if p.get("teilnahmeId")}
	teilnahmen = {t: _teilnahme(t) for t in tids}
	aktionen = K.fristen_pruefen(prozesse=prozesse_l, teilnahmen=teilnahmen, heute=h)
	erinnern_je = {}
	for a in aktionen:
		p = next(x for x in prozesse_l if x["id"] == a["prozessId"])
		try:
			if a["art"] == "erinnern":
				erinnern_je.setdefault(p["gemeinschaftId"], []).append(a["teilnahmeId"])
				a["ergebnis"] = "Erinnerung"
				continue
			if a["art"] == "wiederholen":
				_versenden(p, S.aus_doc("gemeinschaft", frappe.get_doc(S.DT["gemeinschaft"], p["gemeinschaftId"])), wiederholung=True)
				a["ergebnis"] = "erneut gesendet"
				continue
			if a["art"] == "frist_abgelaufen":
				_uebergang(S.system_nutzer(), a["teilnahmeId"], {"ereignis": "frist_abgelaufen", "prozessId": p["id"], "grund": a["text"]}, [])
			if a["art"] == "zeitueberschreitung" and a["teilnahmeId"] and (teilnahmen.get(a["teilnahmeId"]) or {}).get("status") == "angefragt":
				_uebergang(S.system_nutzer(), a["teilnahmeId"], {"ereignis": "fehler", "prozessId": p["id"], "grund": a["text"]}, [])
			_p_speichern(K.frist_anwenden(p, a["art"], jetzt_iso(), a["text"]))
			_proto(None, "eg_eda_frist", p["gemeinschaftId"], f"{p['prozesscode']} {p.get('zaehlpunktnummer') or ''}: {a['text']}")
			a["ergebnis"] = "vermerkt"
		except Exception as e:  # noqa: BLE001 – einzelne Aktion darf den Lauf nicht abbrechen
			a["ergebnis"] = f"Fehler: {e}"
	for g2, ids in erinnern_je.items():
		erinnern_intern(S.system_nutzer(), g2, ids)
	return {"aktionen": aktionen, "heute": h}


@frappe.whitelist(methods=["POST"])
def fristen_lauf(daten=None, als_benutzer=None):
	n = _n(als_benutzer)
	gid = _daten(daten).get("gemeinschaftId")
	if not n.get("system"):
		if not gid:
			verboten("Fristenlauf über alle Gemeinschaften nur durch das System.")
		_schreiben(n, gid)
	return fristen_lauf_intern(n, gid)


# ================================================================ Reklamation an den Netzbetreiber


def _reklamation_daten(g, nb_id):
	h = _heute()
	nb = _nb(nb_id) or _nb_fuer(g, None)
	tl = [(t, zp) for t, zp in _teilnahmen_mit_zp(g["id"]) if not nb_id or zp.get("netzbetreiberId") == nb["id"]]
	zps = {zp["zaehlpunktnummer"] for _t, zp in tl}
	luecken = K.datenluecken(teilnahmen=[{"teilnahmeId": t["id"], "zaehlpunktnummer": zp["zaehlpunktnummer"], "gueltigAb": t["gueltigAb"], "gueltigBis": t.get("gueltigBis")} for t, zp in tl if t.get("gueltigAb") and t["status"] in ("aktiv", "abmeldung_angefragt", "beendet")], empfangen=_empfangene_tage(g["id"]), von=_empfang_seit(g["id"], K.plus_tage(h, -60)), bis=h, heute=h)
	prozesse_l = [p for p in _prozesse({"gemeinschaft": g["id"], "prozesscode": ["!=", "REKLAMATION"]}) if not p.get("zaehlpunktnummer") or p["zaehlpunktnummer"] in zps]
	pl = [p for p in prozesse_l if p["prozesscode"] == "EC_PODLIST" and p["status"] == "abgeschlossen"]
	soll = [{"zaehlpunktnummer": zp["zaehlpunktnummer"], "teilnahmeId": t["id"], "status": t["status"], "consentId": t.get("consentId"), "teilnahmefaktor": t["teilnahmefaktor"], "richtung": zp["richtung"], "gueltigBis": t.get("gueltigBis")} for t, zp in tl]
	podlist = K.podlist_abgleich(soll, (pl[-1].get("ergebnis") or {}).get("liste") or [], h) if pl else []
	q = {}
	for r in frappe.get_all(DN, filters={"gemeinschaft": g["id"], "nachrichtencode": "DATEN_CRMSG", "tag": [">=", K.plus_tage(h, -60)]}, fields=["zaehlpunktnummer", "tag", "kennzahlen"]):
		if r.zaehlpunktnummer not in zps:
			continue
		kz = aus_json(r.kennzahlen, {}) or {}
		x = q.setdefault(r.zaehlpunktnummer, {"zaehlpunktnummer": r.zaehlpunktnummer, "werte": 0, "l3": 0, "aeltesterL3": ""})
		x["werte"] += kz.get("werte") or 0
		x["l3"] += kz.get("l3") or 0
		if kz.get("l3") and (not x["aeltesterL3"] or str(r.tag) < x["aeltesterL3"]):
			x["aeltesterL3"] = str(r.tag)
	qualitaet = [{**x, "anteilL3": K.js_round(x["l3"] / x["werte"] * 10000) / 10000, "monat": x["aeltesterL3"][:7]} for x in q.values() if x["l3"] > 0 and x["werte"]]
	befunde = K.reklamation_befunde(luecken=luecken, prozesse=prozesse_l, podlist=podlist, qualitaet=qualitaet, heute=h)
	return nb, befunde, luecken, K.reklamation_vorlage(g, netzbetreiber=nb, befunde=befunde, heute=h)


@frappe.whitelist(methods=["POST"])
def reklamation(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803, C901
	n = _n(als_benutzer)
	d = _daten(daten)
	aktion = str(d.get("reklamationAktion") or "vorschau")
	if aktion in ("vorschau", "akte"):
		g, _k = _lesen(n, gemeinschaftId)
		if aktion == "akte":
			pid = d.get("prozessId")
			if not pid or not frappe.db.exists(DP, {"name": pid, "gemeinschaft": g["id"], "prozesscode": "REKLAMATION"}):
				nicht_gefunden("Reklamation nicht gefunden.")
			p = _p_dict(frappe.get_doc(DP, pid))
			nachr = [_n_dict(frappe.get_doc(DN, x)) for x in frappe.get_all(DN, filters={"prozess": pid}, pluck="name", order_by="zeitpunkt asc")]
			return {"text": K.reklamation_akte(p, nachr), "dateiname": f"beschwerdeakte-{pid}.txt"}
		nb, befunde, luecken, vorlage = _reklamation_daten(g, d.get("netzbetreiberId"))
		rek = [_ausgabe(p) for p in reversed(_prozesse({"gemeinschaft": g["id"], "prozesscode": "REKLAMATION"}))]
		return {"netzbetreiber": {"id": nb.get("id"), "name": nb.get("name"), "kurzname": nb.get("kurzname"), "kontaktEmail": nb.get("kontaktEmail") or ""}, "befunde": befunde, "luecken": luecken, "vorlage": vorlage, "reklamationen": rek}
	g, _k = _schreiben(n, gemeinschaftId)
	if aktion == "anlegen":
		nb, befunde, _l, vorlage = _reklamation_daten(g, d.get("netzbetreiberId"))
		betreff = str(d.get("betreff") or vorlage["betreff"])[:200]
		text = str(d.get("text") or vorlage["text"])[:20000]
		p = _neuer_prozess(g, "REKLAMATION", n, prozessdatum=_heute(), parameter={"netzbetreiberId": nb.get("id")})
		p.update({"netzbetreiberId": nb.get("id"), "empfaenger": nb.get("marktpartnerId") or "", "ergebnis": {"netzbetreiberName": nb.get("name"), "gemeinschaftName": g["name"], "befunde": len(befunde), "betreff": betreff, "an": nb.get("kontaktEmail") or ""}})
		roh = f"Betreff: {betreff}\n\n{text}\n\n--- Befundliste (CSV) ---\n{vorlage['csv']}"
		_nachricht_anlegen(g, p, "aus", "REKLAMATION_NB", "REKLAMATION", roh, g.get("marktpartnerId") or "PLATTFORM", nb.get("kontaktEmail") or nb.get("marktpartnerId") or "", f"REK-{p['id']}", p["conversationId"], kanal="email", betreff=betreff, versand_status="gesendet")
		p = K.als_gesendet(p, jetzt_iso(), f"REK-{p['id']}")
		p["fristBis"] = vorlage["antwortBis"]
		_p_speichern(p)
		_proto(n, "eg_eda_reklamation", g["id"], f"Reklamation an {nb.get('kurzname') or nb.get('name')} ({len(befunde)} Befunde, {p['id']})")
		return {"prozess": _ausgabe(p), "mailto": f"mailto:{nb['kontaktEmail']}" if nb.get("kontaktEmail") else ""}
	pid = d.get("prozessId")
	if not pid or not frappe.db.exists(DP, {"name": pid, "gemeinschaft": g["id"], "prozesscode": "REKLAMATION"}):
		nicht_gefunden("Reklamation nicht gefunden.")
	p = _p_dict(frappe.get_doc(DP, pid))
	if aktion == "antwort":
		roh = str(d.get("antwortText") or "").strip()[:20000]
		if not roh:
			ungueltig("Bitte die Antwort des Netzbetreibers einfügen.")
		_nachricht_anlegen(g, p, "ein", "ANTWORT_NB", "REKLAMATION", roh, (p.get("ergebnis") or {}).get("an") or p.get("netzbetreiberId") or "", g.get("marktpartnerId") or "", f"REK-ANT-{_z6()}", p["conversationId"], kanal="manuell")
		p["verlauf"].append({"am": jetzt_iso(), "von": p["status"], "nach": "bestaetigt", "nachricht": "ANTWORT_NB", "text": "Antwort des Netzbetreibers erfasst", "konto": n.get("id")})
		p["status"] = "bestaetigt"
	elif aktion == "erledigt":
		p["verlauf"].append({"am": jetzt_iso(), "von": p["status"], "nach": "abgeschlossen", "nachricht": "", "text": "Reklamation erledigt", "konto": n.get("id")})
		p["status"] = "abgeschlossen"
	else:
		ungueltig("Unbekannte Aktion.")
	_p_speichern(p)
	_proto(n, "eg_eda_reklamation", g["id"], f"Reklamation {pid}: {aktion}")
	return {"prozess": _ausgabe(p)}


# ================================================================ Simulator und Gateway


@frappe.whitelist(methods=["POST"])
def simulator(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = _n(als_benutzer)
	d = _daten(daten)
	g, _k = _schreiben(n, gemeinschaftId)
	if not _simulator_aktiv():
		verboten("Der Simulator-Netzbetreiber ist nur in Test- und Demo-Umgebungen aktiv (site_config „eg_eda_simulator“).")
	aktion = d.get("simulatorAktion") or "status"
	if aktion == "zustellen":
		return _zustellen(g["id"], bool(d.get("alle")))
	if aktion == "energiedaten":
		tag = K.plus_tage(_heute(), -1)
		empf = _empfangene_tage(g["id"])
		seed = frappe.conf.get("eg_eda_sim_seed") or "oekoinvest"
		zahl, luecken = 0, 0
		for t, zp in [x for x in _teilnahmen_mit_zp(g["id"]) if x[0]["status"] == "aktiv"][:80]:
			if tag in (empf.get(zp["zaehlpunktnummer"]) or []):
				continue
			if not K.simulator_liefert_tag(zp["zaehlpunktnummer"], tag, seed):
				luecken += 1
				continue
			absender = (_nb(zp.get("netzbetreiberId")) or _nb_fuer(g, None)).get("marktpartnerId")
			j = jetzt_iso()
			xml = K.nachricht_bauen({"code": "DATEN_CRMSG", "prozesscode": "CR_MSG", "absender": absender, "empfaenger": g["marktpartnerId"], "erstellt": _iso_sek(j), "messageId": K.eda_id(absender, j, _z6()), "conversationId": K.eda_id(absender, j, _z6()), "prozessdatum": tag, "modus": "SIMU", "daten": {"MeteringPoint": zp["zaehlpunktnummer"], "ECID": g["gemeinschaftsId"], "Energy": _energie_fuer(g, zp["zaehlpunktnummer"], tag)}})
			if _eingang(S.system_nutzer(), xml, "simulator").get("ok"):
				zahl += 1
			_ = t
		return {"tag": tag, "nachrichten": zahl, "luecken": luecken}
	return {"ausstehend": sum(len((aus_json(x.ergebnis, {}) or {}).get("simulator") or []) for x in frappe.get_all(DP, filters={"gemeinschaft": g["id"]}, fields=["ergebnis"]))}


@frappe.whitelist(methods=["POST"])
def ausgang(daten=None, als_benutzer=None):
	"""Gateway-Dienst: wartende ausgehende EDA-Nachrichten (mit Rohinhalt, Kanal = EDA-Anbindung der Gemeinschaft)."""
	n = _n(None)
	if not n.get("system"):
		verboten("Nur für den Gateway-Dienst.")
	limit = min(200, max(1, int(_daten(daten).get("limit") or 50)))
	namen = frappe.get_all(DN, filters={"richtung": "ausgang", "versand_status": "wartend", "kanal": ["in", ["email", "kep", "datei"]]}, pluck="name", order_by="zeitpunkt asc", limit_page_length=limit)
	return {"nachrichten": [_n_dict(frappe.get_doc(DN, x), True) for x in namen]}


@frappe.whitelist(methods=["POST"])
def ausgang_quittung(daten=None, als_benutzer=None):
	n = _n(None)
	if not n.get("system"):
		verboten("Nur für den Gateway-Dienst.")
	d = _daten(daten)
	status = d.get("status") or "gesendet"
	if status not in ("gesendet", "quittiert", "fehler"):
		ungueltig("Status: gesendet, quittiert oder fehler.")
	nid = d.get("nachrichtId")
	if not nid or not frappe.db.exists(DN, {"name": nid, "richtung": "ausgang"}):
		nicht_gefunden("Nachricht nicht gefunden.")
	doc = frappe.get_doc(DN, nid)
	doc.versand_status = status
	doc.fehler = str(d.get("fehler") or "")[:500]
	if status == "fehler":
		doc.versuche = int(doc.versuche or 0) + 1
	doc.save(ignore_permissions=True)
	return {"ok": True}


