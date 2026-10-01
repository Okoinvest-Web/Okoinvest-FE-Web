# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP6 „Portale Mitglied, Interessent, Gemeinde, öffentlicher Rechner“ – Frappe-API
# (Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4; Referenz: src/lib/plattform/backend/demo/eg-portal.js).
# Regeln: plattform/eg_portal_kern.py (= src/lib/plattform/eg/{interesse,dashboard,anreize,empfehlung}.js).
#
# Rechte: jede Methode prüft den Aufrufer (kern.nutzer: nur API-Benutzer der Website, Konto aktiv) und das EIGENTUM
# (Mitglied-Eintrag mit konto = Aufrufer, Kontext-Recht „eigene_daten“ über eg_stamm.zugriff). Fremde Gemeinschaften → 404.
# Öffentlich (ohne Konto, aber nur über den API-Benutzer, kein allow_guest): interesse, rechner – ohne Personendaten
# in der Antwort.
# Schreiben fremder Entitäten nur über die WP1-Funktionen (eg_stamm.mitglied_speichern/mitglied_status/zaehlpunkt_speichern/
# teilnahme_speichern/teilnahme_uebergang_intern) mit dem Systemkonto, NACH der Prüfung hier. Nachbarpakete (WP3 Energie,
# WP4 Abrechnung, WP5 Gründung) werden lesend und fehlertolerant aufgerufen – fehlen sie, liefert das Portal Leerzustände.

import importlib
import inspect
import json

import frappe
from frappe.utils import nowdate

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import eg_portal_kern as P
from oekoinvest_app.plattform import eg_stamm_kern as K
from oekoinvest_app.plattform.api import eg_stamm as S
from oekoinvest_app.plattform.kern import jetzt_iso, konflikt, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler, iban_maskiert

DT_INTERESSE = "Plattform EG Interesse"
_AT = P._AT


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _daten(x):
	if isinstance(x, str):
		try:
			x = json.loads(x or "{}")
		except ValueError:
			x = {}
	return x if isinstance(x, dict) else {}


def _heute():
	return nowdate()


def _sys():
	return S.system_nutzer()


def _doc(art, name):
	return S.aus_doc(art, frappe.get_doc(S.DT[art], name))


def _liste(art, filters):
	return [_doc(art, x) for x in frappe.get_all(S.DT[art], filters=filters, pluck="name", order_by="creation asc")]


def _eigene_mitglieder(n):
	return _liste("mitglied", {"konto": n.id})


def _nachbar(modul, methode, **kw):
	"""Operation eines Nachbarpakets fehlertolerant aufrufen → (ok, wert, text)."""
	try:
		fn = getattr(importlib.import_module(f"oekoinvest_app.plattform.api.{modul}"), methode)
	except (ImportError, AttributeError):
		return False, None, "Diese Daten werden gerade angebunden."
	try:
		return True, fn(**kw), ""
	except frappe.PermissionError:
		return False, None, "Keine Daten freigegeben."
	except Exception:  # noqa: BLE001 – Nachbarpaket darf das Portal nicht abbrechen
		frappe.log_error(title=f"eg_portal: {modul}.{methode}")
		return False, None, "Die Daten sind gerade nicht erreichbar."


def _als_system(fn, **kw):
	"""WP1-Funktion mit dem Systemkonto (nur nach eigener Prüfung); Funktionen ohne _n werden nicht aufgerufen."""
	if "_n" not in inspect.signature(fn).parameters:
		return None
	return fn(**kw, _n=_sys())


def _netzbetreiber():
	return S._netzbetreiber_liste()


def _tarif(gid):
	return K.tarif_am(_liste("tarif", {"gemeinschaft": gid}), _heute())


def _gemeinschaft_kurz(g):
	return {
		"id": g["id"], "name": g["name"], "kurzname": g.get("kurzname") or "", "modell": g["modell"], "modellKurz": M.EG_MODELLE[g["modell"]]["kurz"], "modellLabel": M.EG_MODELLE[g["modell"]]["label"],
		"zonelevel": g["zonelevel"], "zonelevelLabel": (M.ZONELEVEL.get(str(g["zonelevel"])) or {}).get("label", ""), "status": g["status"], "statusLabel": (M.GEMEINSCHAFT_STATUS.get(g["status"]) or {}).get("label", g["status"]),
		"ort": (g.get("sitzAdresse") or {}).get("ort", ""), "organisator": bool((g.get("dienstleistung") or {}).get("aktiv")),
	}


def _oeffentlich(g, nb):
	mitglieder = _liste("mitglied", {"gemeinschaft": g["id"]})
	tn = _liste("teilnahme", {"gemeinschaft": g["id"]})
	plz = [(m.get("person") or {}).get("plz") for m in mitglieder]
	for t in tn:
		z = frappe.db.get_value(S.DT["zaehlpunkt"], t["zaehlpunktId"], "plz")
		plz.append((z or "")[1:])
	namen = [next((x["kurzname"] for x in nb if x["id"] == i), i) for i in g.get("netzbetreiber") or []]
	return P.gemeinschaft_oeffentlich(g, tarif=_tarif(g["id"]), mitglieder=len([m for m in mitglieder if m["status"] in M.MITGLIED_AKTIV]), plz_bereich=plz, netzbetreiber_namen=namen)


def _mitglied_eigen(m):
	sepa = m.get("sepaMandat") or {}
	return {
		"id": m["id"], "gemeinschaftId": m["gemeinschaftId"], "mitgliedsnummer": m.get("mitgliedsnummer"), "art": m["art"], "artLabel": (M.MITGLIED_ARTEN.get(m["art"]) or {}).get("label", m["art"]), "name": K.mitglied_name(m),
		"person": dict(m.get("person") or {}), "status": m["status"], "statusLabel": (M.MITGLIED_STATUS.get(m["status"]) or {}).get("label", m["status"]), "ton": (M.MITGLIED_STATUS.get(m["status"]) or {}).get("ton", "neutral"),
		"beitrittAm": m.get("beitrittAm"), "austrittZum": m.get("austrittZum"), "iban": iban_maskiert(m.get("iban") or ""),
		"sepaMandat": {"referenz": sepa.get("referenz"), "datum": sepa.get("datum"), "status": sepa.get("status")} if sepa.get("status") else None, "rechnungsweg": m.get("rechnungsweg"), "schutzbeduerftig": bool(m.get("schutzbeduerftig")),
	}


def _teilnahmen_eigen(g, m, nb):
	aus = []
	for t in _liste("teilnahme", {"mitglied": m["id"], "gemeinschaft": g["id"]}):
		if t["status"] == "verworfen":
			continue
		z = _doc("zaehlpunkt", t["zaehlpunktId"]) if frappe.db.exists(S.DT["zaehlpunkt"], t["zaehlpunktId"]) else {}
		offen = t["status"] in ("entwurf", "angefragt", "zustimmung_offen") and m["status"] not in ("ausgeschieden", "abgelehnt")
		nbz = next((x for x in nb if x["id"] == z.get("netzbetreiberId")), None)
		s = M.TEILNAHME_STATUS.get(t["status"]) or {}
		aus.append({
			"id": t["id"], "zaehlpunktId": z.get("id"), "zaehlpunktnummer": z.get("zaehlpunktnummer"), "bezeichnung": z.get("bezeichnung") or "", "richtung": z.get("richtung"), "richtungLabel": (M.ZP_RICHTUNGEN.get(z.get("richtung") or "") or {}).get("label", ""),
			"smartMeter": z.get("smartMeter"), "teilnahmefaktor": t["teilnahmefaktor"], "status": t["status"], "statusLabel": s.get("label", t["status"]), "ton": s.get("ton", "neutral"), "gueltigAb": t.get("gueltigAb"), "gueltigBis": t.get("gueltigBis"), "fristBis": t.get("fristBis"),
			"schritte": P.teilnahme_schritte(m["status"], t, _heute()), "anleitung": P.zustimmungs_anleitung(nbz, g, t, z.get("zaehlpunktnummer")) if offen else None, "tfWunsch": None,
		})
	return aus


def _preise(g, nb, netzebene=7):
	t = _tarif(g["id"])
	regel = K.netzentgelt_regel(_heute(), g["modell"], g["zonelevel"], netzebene)
	n0 = next((x for x in nb if x["id"] == (g.get("netzbetreiber") or [""])[0]), None) or {}
	ap = sorted([x for x in n0.get("netzentgeltAp") or [] if int(x.get("netzebene") or 0) == netzebene], key=lambda x: x.get("gueltigAb") or "", reverse=True)
	return {"bezugspreisCt": (t or {}).get("bezugspreisCt", _AT["gemeinschaftCt"]) if t else _AT["gemeinschaftCt"], "einspeisepreisCt": (t or {}).get("einspeisepreisCt") or 0, "lieferantCt": _AT["energiepreis"], "netzApCt": ap[0]["ctKwh"] if ap else _AT["netzAp"], "reduktionPct": regel["reduktionPct"], "abgabenBefreit": regel["abgabenBefreit"], "abgabenCt": _AT["abgabenCt"], "co2KgJeKwh": P.RECHNER_STANDARD["co2KgJeKwh"], "regelText": regel["text"], "regelStatus": regel["status"]}


def _energie(g, eigene, nb):
	zr = P.zeitraeume(_heute())
	ids = {t["id"] for t in eigene}
	richtung = {t["id"]: t["richtung"] for t in eigene}
	p = _preise(g, nb)
	werte, fehlt = {}, ""
	for k, z in zr.items():
		ok, w, txt = _nachbar("eg_energie", "periodenwerte", gemeinschaftId=g["id"], von=z["von"], bis=z["bis"], _n=_sys())
		if not ok:
			fehlt, werte[k] = txt, None
			continue
		liste = [{**e, "richtung": richtung.get(e.get("teilnahmeId"))} for e in (w or {}).get("zaehlpunkte") or [] if e.get("teilnahmeId") in ids]
		werte[k] = {**z, **P.energie_kennzahlen(liste, p)}
	return {"zeitraeume": zr, "werte": werte, "verfuegbar": not fehlt, "hinweis": fehlt, "preise": {"bezugspreisCt": p["bezugspreisCt"], "lieferantCt": p["lieferantCt"], "netzApCt": p["netzApCt"], "regel": p["regelText"], "regelStatus": p["regelStatus"]}}


def _belege_liste(w):
	return w if isinstance(w, list) else (w or {}).get("belege") or []


# ================================================================ Lesen

@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	nb = _netzbetreiber()
	mitgliedschaften, meine_tn = [], []
	for m in _eigene_mitglieder(n):
		if m["status"] == "abgelehnt" or not frappe.db.exists(S.DT["gemeinschaft"], m["gemeinschaftId"]):
			continue
		g = _doc("gemeinschaft", m["gemeinschaftId"])
		k = S._kontext(n, g)
		t = _tarif(g["id"])
		mitgliedschaften.append({"gemeinschaft": _gemeinschaft_kurz(g), "mitglied": _mitglied_eigen(m), "rollen": k["rollen"], "organ": K.ist_organ(k), "teilnahmen": _teilnahmen_eigen(g, m, nb), "tarif": {"bezeichnung": t.get("bezeichnung"), "bezugspreisCt": t.get("bezugspreisCt"), "einspeisepreisCt": t.get("einspeisepreisCt"), "mitgliedsbeitragJahr": t.get("mitgliedsbeitragJahr"), "grundgebuehrMonat": t.get("grundgebuehrMonat"), "zeitfensterHeute": P.tarif_zeitfenster_am(t, _heute())} if t else None})
		meine_tn += _liste("teilnahme", {"mitglied": m["id"]})
	aufgaben = sorted([{"gemeinschaftId": ms["gemeinschaft"]["id"], "gemeinschaft": ms["gemeinschaft"]["name"], "teilnahmeId": t["id"], "zaehlpunktnummer": t["zaehlpunktnummer"], "text": t["schritte"]["aufgabe"], "frist": t["schritte"]["frist"]} for ms in mitgliedschaften for t in ms["teilnahmen"] if t["schritte"]["aktuell"] == "zustimmung" or any(s["zustand"] == "fehler" for s in t["schritte"]["schritte"])], key=lambda a: (a["frist"] or {}).get("tageRest", 999))
	zp_ids = sorted({t["zaehlpunktId"] for t in meine_tn})
	alle_g = [_doc("gemeinschaft", x) for x in frappe.get_all(S.DT["gemeinschaft"], pluck="name")]
	mehrfach = P.mehrfach_uebersicht([_doc("zaehlpunkt", z) for z in zp_ids if frappe.db.exists(S.DT["zaehlpunkt"], z)], meine_tn, alle_g)
	organe = []
	for g in alle_g:
		k = S._kontext(n, g)
		if K.ist_organ(k):
			organe.append({"id": g["id"], "name": g["name"], "rollen": k["rollen"], "href": f"/portal/eg/{g['id']}/verwaltung"})
	mitglied_in = {ms["gemeinschaft"]["id"] for ms in mitgliedschaften if ms["mitglied"]["status"] not in ("ausgeschieden", "interessent")}
	offene = [o for o in (_oeffentlich(g, nb) for g in alle_g) if o["beitrittOffen"] and o["id"] not in mitglied_in]
	plz = str(n.get("plz") or ((mitgliedschaften[0]["mitglied"]["person"] or {}).get("plz") if mitgliedschaften else "") or "")
	interessen = [{"id": i.name, "am": str(i.creation), "plz": i.plz, "rolle": i.rolle, "status": i.status, "statusLabel": (P.INTERESSE_STATUS.get(i.status) or {}).get("label", i.status), "gemeinschaftId": i.gemeinschaft or ""} for i in frappe.get_all(DT_INTERESSE, filters=[["konto", "=", n.id]], or_filters=None, fields=["name", "creation", "plz", "rolle", "status", "gemeinschaft"])]
	gemeinde = "kommune" in (n.get("rollen") or []) or any(m["art"] == "gemeinde" and m["status"] in M.MITGLIED_AKTIV for m in _eigene_mitglieder(n))
	return {"heute": _heute(), "mitgliedschaften": mitgliedschaften, "aufgaben": aufgaben, "mehrfach": mehrfach, "organe": organe, "gemeinde": gemeinde, "interessen": interessen, "plz": plz, "offeneGemeinschaften": offene, "vorschlaege": P.gemeinschaften_suchen(offene, plz=plz) if plz else [], "netzbetreiber": [{"id": b["id"], "kurzname": b["kurzname"], "name": b["name"], "nbNummer": b["nbNummer"]} for b in nb]}


@frappe.whitelist(methods=["POST"])
def gemeinschaft(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	g, k = S.zugriff(n, gemeinschaftId, "eigene_daten", 1)
	nb = _netzbetreiber()
	eigene = sorted([m for m in _eigene_mitglieder(n) if m["gemeinschaftId"] == g["id"]], key=lambda m: 0 if m["status"] in M.MITGLIED_AKTIV else 1)
	m = eigene[0] if eigene else None
	tarif = _tarif(g["id"])
	reiter = [r for r in [{"id": "verwaltung", "label": "Verwaltung", "pfad": "/verwaltung", "recht": "mitgliederliste"}, {"id": "abrechnung", "label": "Abrechnung & Freigaben", "pfad": "/abrechnung", "recht": "abrechnung_vorschau"}, {"id": "kasse", "label": "Kassa & Buchhaltung", "pfad": "/kasse", "recht": "buchhaltung"}, {"id": "versammlungen", "label": "Versammlungen", "pfad": "/versammlungen", "recht": "gv"}, {"id": "energie", "label": "Energiedaten", "pfad": "/energie", "recht": "qh_aggregiert"}] if K.eg_stufe(k, r["recht"]) >= 1] if K.ist_organ(k) else []
	basis = {"heute": _heute(), "gemeinschaft": {**_oeffentlich(g, nb), **_gemeinschaft_kurz(g)}, "tarif": tarif, "rollen": k["rollen"], "organ": K.ist_organ(k), "organReiter": reiter, "netzentgelt": _preise(g, nb)["regelText"]}
	if not m:
		return {**basis, "mitglied": None, "teilnahmen": [], "energie": None, "belege": {"verfuegbar": False, "liste": []}, "empfehlungen": [], "stunden": P.gruene_stunden(None, _heute()), "meilensteine": [], "mehrfach": [], "aktionen": {}}
	tn = _teilnahmen_eigen(g, m, nb)
	aktiv = [t for t in tn if t["status"] in ("aktiv", "abmeldung_angefragt", "beendet")]
	en = _energie(g, aktiv, nb) if aktiv else {"verfuegbar": False, "hinweis": "Energiedaten gibt es ab der Aktivierung Ihres Zählpunkts.", "werte": {}, "zeitraeume": P.zeitraeume(_heute())}
	ok_b, w_b, txt_b = _nachbar("eg_abrechnung", "belege", gemeinschaftId=g["id"], mitgliedId=m["id"], als_benutzer=n.id)
	ok_p, w_p, _ = _nachbar("eg_energie", "prognose", gemeinschaftId=g["id"], _n=_sys()) if aktiv else (False, None, "")
	stunden = P.gruene_stunden(w_p if ok_p else None, _heute())
	# TF-Optimierer (WP3) auf Abruf (Website-Route /api/portal/eg/optimierung), nicht beim Seitenaufbau
	meine_ids = {x["id"] for x in _eigene_mitglieder(n)}
	zps = [t["zaehlpunktId"] for t in tn]
	meine_tn = [t for z in zps for t in _liste("teilnahme", {"zaehlpunkt": z}) if t["mitgliedId"] in meine_ids]
	mehrfach = P.mehrfach_uebersicht([_doc("zaehlpunkt", z) for z in zps if z and frappe.db.exists(S.DT["zaehlpunkt"], z)], meine_tn, [_doc("gemeinschaft", x) for x in frappe.get_all(S.DT["gemeinschaft"], pluck="name")])
	jahr = (en.get("werte") or {}).get("jahr")
	anlagen = _liste("anlage", {"eigentuemer_mitglied": m["id"]}) if frappe.get_meta(S.DT["anlage"]).has_field("eigentuemer_mitglied") else []
	return {
		**basis, "mitglied": _mitglied_eigen(m), "teilnahmen": tn, "energie": en, "anlagen": [{"id": a["id"], "bezeichnung": a.get("bezeichnung"), "art": a.get("art"), "kwp": a.get("kwp"), "speicherKwh": a.get("speicherKwh")} for a in anlagen],
		"belege": {"verfuegbar": True, "liste": _belege_liste(w_b)} if ok_b else {"verfuegbar": False, "liste": [], "hinweis": txt_b},
		"stunden": stunden, "tfVorschlag": None,
		"empfehlungen": P.anreize_fuer(tarif=tarif, heute=_heute(), stunden=stunden, kennzahlen=jahr, zaehlpunkte=tn, anlagen=anlagen, mehrfach=mehrfach),
		"meilensteine": P.meilensteine(kwh=jahr["eigendeckungKwh"], anteilPct=jahr.get("anteilPct") or 0) if jahr and jahr.get("hatDaten") else [],
		"zeitfensterHeute": P.tarif_zeitfenster_am(tarif, _heute()), "mehrfach": mehrfach,
		"aktionen": {"kuendigen": m["status"] in ("aufgenommen", "aktiv"), "zurueckziehen": m["status"] in ("interessent", "antrag", "geprueft"), "tfWunsch": any(t["status"] in ("entwurf", "aktiv") for t in tn), "kuendigungFruehestens": P.kuendigung_fruehestens(_heute(), g.get("kuendigungsfristTage") or P.KUENDIGUNG_FRIST_TAGE)},
		"kuendigung": None,
	}


@frappe.whitelist(methods=["POST"])
def belege(als_benutzer=None):
	n = nutzer(als_benutzer)
	aus, hinweis, verfuegbar = [], "", True
	for m in _eigene_mitglieder(n):
		if m["status"] not in [*M.MITGLIED_AKTIV, "ausgeschieden"]:
			continue
		ok, w, txt = _nachbar("eg_abrechnung", "belege", mitgliedId=m["id"], als_benutzer=n.id)
		if not ok:
			verfuegbar, hinweis = False, txt
			continue
		name = frappe.db.get_value(S.DT["gemeinschaft"], m["gemeinschaftId"], "titel") or ""
		aus += [{**b, "gemeinschaft": name} for b in _belege_liste(w)]
	return {"verfuegbar": verfuegbar, "hinweis": hinweis, "belege": aus}


@frappe.whitelist(methods=["POST"])
def energie(zaehlpunktId=None, von=None, bis=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	meine = {m["id"] for m in _eigene_mitglieder(n)}
	t = next((x for x in _liste("teilnahme", {"zaehlpunkt": zaehlpunktId or ""}) if x["mitgliedId"] in meine), None)
	if not t:
		nicht_gefunden("Zählpunkt nicht gefunden.")
	from oekoinvest_app.plattform.mitglied_kern import datum, tage_zwischen

	v, b = datum(von), datum(bis)
	if not v or not b or v > b:
		ungueltig("Bitte einen gültigen Zeitraum angeben.")
	if tage_zwischen(v, b) > 366:
		ungueltig("Höchstens ein Jahr je Abruf.")
	ok, w, txt = _nachbar("eg_energie", "messreihen", gemeinschaftId=t["gemeinschaftId"], zaehlpunktId=zaehlpunktId, von=v, bis=b, _n=_sys())
	return {"verfuegbar": True, "zaehlpunktId": zaehlpunktId, "von": v, "bis": b, "daten": w} if ok else {"verfuegbar": False, "zaehlpunktId": zaehlpunktId, "von": v, "bis": b, "hinweis": txt}


# ================================================================ Beitritt, Kündigung, TF-Wunsch

@frappe.whitelist(methods=["POST"])
def beitritt_antrag(gemeinschaftId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	gid = str(gemeinschaftId or "")
	if not gid or not frappe.db.exists(S.DT["gemeinschaft"], gid):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	g = _doc("gemeinschaft", gid)
	if g["status"] not in P.BEITRITT_OFFEN:
		konflikt("Diese Gemeinschaft nimmt derzeit keine Beitrittsanträge an.")
	vorhanden = next((m for m in _eigene_mitglieder(n) if m["gemeinschaftId"] == gid and m["status"] not in ("ausgeschieden", "abgelehnt")), None)
	if vorhanden and vorhanden["status"] != "interessent":
		konflikt("Sie sind bereits Mitglied bzw. Ihr Antrag liegt der Gemeinschaft vor.")
	nb = _netzbetreiber()
	b = _fach(P.beitritt_bereinigen, _daten(daten), g, nb)
	person = {**b["mitglied"]["person"], "email": str(n.get("email") or "").lower()}
	_fach(K.mitglied_bereinigen, {**b["mitglied"], "person": person}, g)
	for z in b["zaehlpunkte"]:
		kurz = "…" + z["zaehlpunktnummer"][-6:]
		alt = frappe.db.get_value(S.DT["zaehlpunkt"], {"zaehlpunktnummer": z["zaehlpunktnummer"]}, ["name", "inhaber_konto", "richtung"], as_dict=True)
		if alt and alt.inhaber_konto and alt.inhaber_konto != n.id:
			konflikt(f"Der Zählpunkt {kurz} ist bereits einem anderen Konto zugeordnet. Bitte wenden Sie sich an die Gemeinschaft.")
		if alt and alt.richtung != z["richtung"]:
			konflikt(f"Der Zählpunkt {kurz} ist als {M.ZP_RICHTUNGEN[alt.richtung]['label']} erfasst.")
		if alt:
			r = K.teilnahme_regeln(_liste("teilnahme", {"zaehlpunkt": alt.name}), {"gemeinschaftId": gid, "teilnahmefaktor": z["teilnahmefaktor"]}, z["fremdTf"], z["fremdAnzahl"])
			if not r["ok"]:
				konflikt(f"Zählpunkt {kurz}: {r['fehler']}")
		elif z["teilnahmefaktor"] + z["fremdTf"] > 100:
			konflikt(f"Zählpunkt {kurz}: Teilnahmefaktor und Anteile in anderen Gemeinschaften ergeben mehr als 100 %.")
	am = jetzt_iso()
	dokumente = [{"id": d["id"], "titel": d["titel"], "version": P.BEITRITT_VERSION} for d in P.BEITRITT_DOKUMENTE if d["id"] in b["zustimmungen"]]
	mdaten = {**b["mitglied"], "person": person, "kontoId": n.id, "vertraege": [{"art": d["id"], "dokumentId": "", "version": d["version"], "am": am[:10]} for d in dokumente],
		"sepaMandat": {"referenz": "EG-" + sha256(f"{n.id}{gid}{am}")[:6].upper(), "datum": _heute(), "status": "aktiv"} if b["mitglied"]["iban"] else {"referenz": "", "datum": "", "status": ""}}
	if vorhanden:
		S.mitglied_speichern(id=vorhanden["id"], daten=mdaten, _n=_sys())
		mitglied = S.mitglied_status(id=vorhanden["id"], daten={"nach": "antrag"}, _n=_sys())
	else:
		mitglied = S.mitglied_speichern(gemeinschaftId=gid, daten={**mdaten, "status": "antrag"}, _n=_sys())
	name = K.mitglied_name({"person": person})
	angelegt = []
	for z in b["zaehlpunkte"]:
		anlage_id = None
		if z["richtung"] == "erzeugung" and z["kwp"]:
			a = _als_system(S.anlage_speichern, gemeinschaftId=gid, daten={"bezeichnung": z["bezeichnung"] or f"PV {name}", "art": "pv", "kwp": z["kwp"], "engpassleistungKw": z["kwp"], "eigentuemerMitgliedId": mitglied["id"], "betreiber": name, "haushalt": b["mitglied"]["art"] == "privat", "status": "aktiv"})
			anlage_id = (a or {}).get("id")
		zr = S.zaehlpunkt_speichern(gemeinschaftId=gid, daten={"zaehlpunktnummer": z["zaehlpunktnummer"], "richtung": z["richtung"], "bezeichnung": z["bezeichnung"], "smartMeter": z["smartMeter"], "inhaberKontoId": n.id, "inhaberName": name, "anlageId": anlage_id}, _n=_sys())
		t = S.teilnahme_speichern(gemeinschaftId=gid, daten={"zaehlpunktId": zr["zaehlpunkt"]["id"], "mitgliedId": mitglied["id"], "teilnahmefaktor": z["teilnahmefaktor"], "fremdTf": z["fremdTf"], "fremdAnzahl": z["fremdAnzahl"]}, _n=_sys())
		angelegt.append({"teilnahmeId": t["id"], "zaehlpunktnummer": zr["zaehlpunkt"]["zaehlpunktnummer"], "teilnahmefaktor": t["teilnahmefaktor"]})
	nachweis = sha256(json.dumps({"gemeinschaftId": gid, "mitgliedId": mitglied["id"], "kontoId": n.id, "dokumente": dokumente, "name": b["unterschrift"]["name"], "am": am}, ensure_ascii=False, separators=(",", ":")))
	for i in frappe.get_all(DT_INTERESSE, filters={"email": person["email"], "status": ["not in", ["beigetreten", "verworfen"]]}, pluck="name"):
		frappe.db.set_value(DT_INTERESSE, i, {"status": "beigetreten", "gemeinschaft": gid})
	protokoll(n, "eg_beitritt", "eg_gemeinschaft", gid, f"Beitrittsantrag ({len(angelegt)} Zählpunkte), Unterschrift „{b['unterschrift']['name']}“, Nachweis {nachweis}", ip or "")
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	anlegen(n.id, "system", f"Beitrittsantrag „{g['name']}“", "Ihr Antrag ist eingegangen. Als Nächstes entscheidet die Gemeinschaft über die Aufnahme – danach melden wir Ihren Zählpunkt beim Netzbetreiber an.", f"/portal/eg/{gid}", "eg_gemeinschaft", gid, mail=False)
	m2 = _doc("mitglied", mitglied["id"])
	return {"ok": True, "gemeinschaftId": gid, "mitglied": _mitglied_eigen(m2), "teilnahmen": _teilnahmen_eigen(g, m2, nb), "nachweis": {"hash": nachweis, "am": am, "dokumente": dokumente}}


@frappe.whitelist(methods=["POST"])
def kuendigung(mitgliedId=None, zum=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	m = next((x for x in _eigene_mitglieder(n) if x["id"] == str(mitgliedId or "")), None)
	if not m:
		nicht_gefunden("Mitgliedschaft nicht gefunden.")
	g = _doc("gemeinschaft", m["gemeinschaftId"])
	if m["status"] in ("interessent", "antrag", "geprueft"):
		for t in _liste("teilnahme", {"mitglied": m["id"], "status": "entwurf"}):
			S.teilnahme_uebergang_intern(_sys(), t["id"], {"ereignis": "verwerfen", "grund": "Antrag durch das Mitglied zurückgezogen"})
		r = S.mitglied_status(id=m["id"], daten={"nach": "abgelehnt", "grund": "Antrag durch das Mitglied zurückgezogen"}, _n=_sys())
		protokoll(n, "eg_antrag_zurueck", "eg_gemeinschaft", m["gemeinschaftId"], f"Beitrittsantrag Mitglied {m.get('mitgliedsnummer')} zurückgezogen")
		return {"ok": True, "art": "zurueckgezogen", "status": r["status"], "text": "Ihr Antrag ist zurückgezogen."}
	if m["status"] not in ("aufgenommen", "aktiv"):
		konflikt("Die Mitgliedschaft ist bereits gekündigt." if m["status"] == "gekuendigt" else "Diese Mitgliedschaft kann nicht gekündigt werden.")
	from oekoinvest_app.plattform.mitglied_kern import datum

	frueh = P.kuendigung_fruehestens(_heute(), g.get("kuendigungsfristTage") or P.KUENDIGUNG_FRIST_TAGE)
	d = datum(zum) or frueh
	if d < frueh:
		ungueltig(f"Frühestmöglicher Austritt laut Kündigungsfrist: {'.'.join(reversed(frueh.split('-')))}.")
	r = S.mitglied_status(id=m["id"], daten={"nach": "gekuendigt", "zum": d}, _n=_sys())
	protokoll(n, "eg_kuendigung", "eg_gemeinschaft", m["gemeinschaftId"], f"Kündigung durch Mitglied {m.get('mitgliedsnummer')} zum {d}")
	return {"ok": True, "art": "kuendigung", "status": r["status"], "austrittZum": d, "text": f"Ihre Kündigung ist eingegangen. Die Gemeinschaft meldet Ihre Zählpunkte zum {'.'.join(reversed(d.split('-')))} beim Netzbetreiber ab und erstellt die Schlussabrechnung."}


@frappe.whitelist(methods=["POST"])
def tf_wunsch(teilnahmeId=None, teilnahmefaktor=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	meine = {m["id"] for m in _eigene_mitglieder(n)}
	tid = str(teilnahmeId or "")
	t = _doc("teilnahme", tid) if tid and frappe.db.exists(S.DT["teilnahme"], tid) else None
	if not t or t["mitgliedId"] not in meine:
		nicht_gefunden("Teilnahme nicht gefunden.")
	from oekoinvest_app.plattform.mitglied_kern import ganz

	tf = ganz(teilnahmefaktor, 1, 100)
	if tf is None:
		ungueltig("Der Teilnahmefaktor ist eine ganze Zahl von 1 bis 100 %.")
	if tf == t["teilnahmefaktor"]:
		konflikt("Dieser Teilnahmefaktor gilt bereits.")
	r = K.teilnahme_regeln(_liste("teilnahme", {"zaehlpunkt": t["zaehlpunktId"]}), {"id": t["id"], "gemeinschaftId": t["gemeinschaftId"], "teilnahmefaktor": tf})
	if not r["ok"]:
		konflikt(r["fehler"])
	if t["status"] == "entwurf":
		neu = S.teilnahme_speichern(gemeinschaftId=t["gemeinschaftId"], id=t["id"], daten={"zaehlpunktId": t["zaehlpunktId"], "mitgliedId": t["mitgliedId"], "teilnahmefaktor": tf}, _n=_sys())
		protokoll(n, "eg_tf_wunsch", "eg_gemeinschaft", t["gemeinschaftId"], f"TF-Wunsch {t['teilnahmefaktor']} → {tf} % (Entwurf, direkt übernommen)")
		return {"ok": True, "umgesetzt": True, "teilnahmefaktor": neu["teilnahmefaktor"], "text": "Übernommen – der neue Teilnahmefaktor gilt für die Anmeldung beim Netzbetreiber."}
	if t["status"] != "aktiv":
		konflikt("Während die Anmeldung läuft, kann der Teilnahmefaktor nicht geändert werden.")
	wunsch = {"teilnahmeId": t["id"], "gemeinschaftId": t["gemeinschaftId"], "mitgliedId": t["mitgliedId"], "kontoId": n.id, "von": t["teilnahmefaktor"], "nach": tf, "am": jetzt_iso(), "status": "offen"}
	# Weitergabe an die Gemeinschaft: Protokoll (Aktion eg_tf_wunsch) – WP2 setzt per edaTfAendern (EC_PRTFACT_CHG) um
	protokoll(n, "eg_tf_wunsch", "eg_gemeinschaft", t["gemeinschaftId"], f"TF-Wunsch Teilnahme {t['id']}: {t['teilnahmefaktor']} → {tf} % (an die Gemeinschaft, EC_PRTFACT_CHG)")
	return {"ok": True, "umgesetzt": False, "wunsch": wunsch, "text": "Ihr Wunsch ist bei der Gemeinschaft. Sie meldet die Änderung elektronisch beim Netzbetreiber; derzeit ist eine Änderung pro Tag möglich."}


# ================================================================ Interessent, Gemeinde, Auskunft, Rechner

@frappe.whitelist(methods=["POST"])
def interesse(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	nb = _netzbetreiber()
	d = _daten(daten)
	i = _fach(P.interesse_bereinigen, {**d, "email": d.get("email") or (n.get("email") if n else ""), "vorname": d.get("vorname") or (n.get("vorname") if n else ""), "nachname": d.get("nachname") or (n.get("nachname") if n else ""), "firma": d.get("firma") or (n.get("firma") if n else "")}, nb)
	if i["gemeinschaftId"] and (not frappe.db.exists(S.DT["gemeinschaft"], i["gemeinschaftId"]) or frappe.db.get_value(S.DT["gemeinschaft"], i["gemeinschaftId"], "status") not in P.BEITRITT_OFFEN):
		i["gemeinschaftId"] = ""
	c = P.interesse_cluster(i, nb)
	felder = {
		"vorname": i["vorname"], "nachname": i["nachname"], "firma": i["firma"], "email": i["email"], "telefon": i["telefon"], "plz": i["plz"], "ort": i["ort"], "rolle": i["rolle"], "art": i["art"],
		"zaehlpunktnummer": i["zaehlpunktnummer"], "jahresverbrauch_kwh": i["jahresverbrauchKwh"] or 0, "kwp": i["kwp"] or 0, "gemeinschaft": i["gemeinschaftId"] or None, "nachricht": i["nachricht"], "herkunft": i["herkunft"],
		"cluster_netzbetreiber": c["netzbetreiberId"], "cluster_schluessel": c["schluessel"], "einwilligung": 1, "einwilligung_text": P.INTERESSE_EINWILLIGUNG, "einwilligung_am": frappe.utils.now_datetime(), "einwilligung_ip": str(ip or "")[:64],
	}
	if n:
		felder["konto"] = n.id
	alt = frappe.db.get_value(DT_INTERESSE, {"email": i["email"], "plz": i["plz"], "status": ["in", ["neu", "kontaktiert", "zugeordnet"]]}, "name")
	if alt:
		doc = frappe.get_doc(DT_INTERESSE, alt)
		doc.update(felder)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": DT_INTERESSE, "status": "neu", **felder}).insert(ignore_permissions=True)
	protokoll(n, "eg_interesse", "eg_interesse", doc.name, f"Interesse {c['schluessel']} ({i['rolle']})", ip or "")
	liste = [_oeffentlich(_doc("gemeinschaft", x), nb) for x in frappe.get_all(S.DT["gemeinschaft"], pluck="name")]
	return {"ok": True, "id": doc.name, "cluster": {"netzbetreiberId": c["netzbetreiberId"], "plz": c["plz"]}, "passend": P.gemeinschaften_suchen(liste, plz=i["plz"], zaehlpunktnummer=i["zaehlpunktnummer"], netzbetreiber=nb)[:5]}


@frappe.whitelist(methods=["POST"])
def gemeinde_sicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	eigene = [m for m in _eigene_mitglieder(n) if m["art"] == "gemeinde" and m["status"] in [*M.MITGLIED_AKTIV, "antrag", "geprueft"]]
	if not eigene and "kommune" not in (n.get("rollen") or []):
		verboten("Die Gemeinde-Sicht steht Gemeinden zur Verfügung.")
	nb = _netzbetreiber()
	gemeinden = []
	for m in eigene:
		g = _doc("gemeinschaft", m["gemeinschaftId"])
		tn = _teilnahmen_eigen(g, m, nb)
		zr = P.zeitraeume(_heute())
		p = _preise(g, nb)
		ok, w, txt = _nachbar("eg_energie", "periodenwerte", gemeinschaftId=g["id"], von=zr["jahr"]["von"], bis=zr["jahr"]["bis"], _n=_sys())
		werte = (w or {}).get("zaehlpunkte") or [] if ok else []

		def wert(tid, gr):
			return P._n(((next((x for x in werte if x.get("teilnahmeId") == tid), {}) or {}).get("groessen") or {}).get(gr))

		gebaeude = [{**t, "jahr": P.energie_kennzahlen([{**e, "richtung": t["richtung"]}], p) if (e := next((x for x in werte if x.get("teilnahmeId") == t["id"]), None)) else None} for t in tn]
		alle_tn = _liste("teilnahme", {"gemeinschaft": g["id"]})
		mitglieder = _liste("mitglied", {"gemeinschaft": g["id"]})
		aktiv_m = [x for x in mitglieder if x["status"] in M.MITGLIED_AKTIV]
		schutz = {x["id"] for x in aktiv_m if x.get("schutzbeduerftig")}
		richtung = {t["id"]: frappe.db.get_value(S.DT["zaehlpunkt"], t["zaehlpunktId"], "richtung") for t in alle_tn}

		def erz(tid):
			return wert(tid, "erzeugung_tf") or wert(tid, "erzeugung_gemessen")

		erz_alle = sum(erz(t["id"]) for t in alle_tn if richtung.get(t["id"]) == "erzeugung")
		erz_gemeinde = sum(erz(t["id"]) for t in tn if t["richtung"] == "erzeugung")
		ed_schutz = sum(wert(t["id"], "eigendeckung") for t in alle_tn if t["mitgliedId"] in schutz and richtung.get(t["id"]) != "erzeugung")
		tarif = _tarif(g["id"])
		sq = P.sozialquote(erzeugungKwh=erz_gemeinde, anSchutzbeduerftigeKwh=(ed_schutz * erz_gemeinde / erz_alle) if erz_alle > 0 else 0, schutzbeduerftigeHaushalte=len(schutz), sozialtarif=(tarif or {}).get("sozialtarif"))
		arten = {}
		for x in aktiv_m:
			arten[x["art"]] = arten.get(x["art"], 0) + 1
		plz_bereich = _oeffentlich(g, nb)["plzBereich"]
		gemeinden.append({
			"gemeinschaft": _gemeinschaft_kurz(g), "mitglied": _mitglied_eigen(m), "gebaeude": gebaeude, "energieVerfuegbar": ok, "energieHinweis": "" if ok else txt, "sozialquote": {**sq, "gilt": any(t["richtung"] == "erzeugung" for t in tn)},
			"beteiligung": {"mitgliederAktiv": len(aktiv_m), "nachArt": sorted([{"art": a, "label": (M.MITGLIED_ARTEN.get(a) or {}).get("label", a), "anzahl": z} for a, z in arten.items()], key=lambda x: -x["anzahl"]), "antraegeOffen": len([x for x in mitglieder if x["status"] in ("antrag", "geprueft")]), "zustimmungOffen": len([t for t in alle_tn if t["status"] == "zustimmung_offen"]), "interessenImGebiet": frappe.db.count(DT_INTERESSE, {"plz": ["in", plz_bereich or ["-"]], "status": ["in", ["neu", "kontaktiert", "zugeordnet"]]})},
			"tarif": {"bezeichnung": tarif.get("bezeichnung"), "bezugspreisCt": tarif.get("bezugspreisCt"), "einspeisepreisCt": tarif.get("einspeisepreisCt"), "sozialtarif": tarif.get("sozialtarif")} if tarif else None,
			"summe": {"gebaeude": len(tn), "aktiv": len([t for t in tn if t["status"] == "aktiv"]), "erzeugungKwp": 0},
		})
	ok, w, txt = _nachbar("eg_gruendung", "auftraege", als_benutzer=n.id)
	return {"heute": _heute(), "gemeinden": gemeinden, "gruendung": {"verfuegbar": True, "auftraege": w if isinstance(w, list) else (w or {}).get("auftraege") or []} if ok else {"verfuegbar": False, "auftraege": [], "hinweis": txt}}


@frappe.whitelist(methods=["POST"])
def datenauskunft(als_benutzer=None):
	n = nutzer(als_benutzer)
	mitglieder = _eigene_mitglieder(n)
	ids = {m["id"] for m in mitglieder}
	teilnahmen = [t for m in mitglieder for t in _liste("teilnahme", {"mitglied": m["id"]})]
	zps = sorted({t["zaehlpunktId"] for t in teilnahmen})
	interessen = frappe.get_all(DT_INTERESSE, filters={"konto": n.id}, fields=["*"]) + frappe.get_all(DT_INTERESSE, filters={"email": str(n.get("email") or "").lower(), "konto": ["is", "not set"]}, fields=["*"])
	auskunft = {
		"erstelltAm": jetzt_iso(), "rechtsgrundlage": "Art. 15 DSGVO", "verantwortlich": "die jeweilige Energiegemeinschaft; ÖkoInvest als Auftragsverarbeiter (Organisator), soweit beauftragt",
		"konto": {"id": n.id, "email": n.get("email"), "vorname": n.get("vorname"), "nachname": n.get("nachname")},
		"mitgliedschaften": [{**m, "gemeinschaft": frappe.db.get_value(S.DT["gemeinschaft"], m["gemeinschaftId"], "titel") or ""} for m in mitglieder],
		"zaehlpunkte": [_doc("zaehlpunkt", z) for z in zps if frappe.db.exists(S.DT["zaehlpunkt"], z)], "teilnahmen": teilnahmen,
		"anlagen": [a for m in ids for a in (_liste("anlage", {"eigentuemer_mitglied": m}) if frappe.get_meta(S.DT["anlage"]).has_field("eigentuemer_mitglied") else [])],
		"interessen": [{k: (str(v) if v is not None and not isinstance(v, (int, float, str)) else v) for k, v in i.items()} for i in interessen],
		"beitritte": [], "tfWuensche": [], "kuendigungen": [],
		"hinweis": "Viertelstundenwerte und Belege stellen wir auf Wunsch zusätzlich als Datei bereit (Energiedaten bzw. Abrechnung). Beitritte, TF-Wünsche und Kündigungen sind im Protokoll der Gemeinschaft dokumentiert.",
	}
	protokoll(n, "eg_datenauskunft", "konto", n.id, "Datenauskunft Energiegemeinschaften erstellt")
	return auskunft


@frappe.whitelist(methods=["POST"])
def rechner(daten=None, als_benutzer=None):
	nutzer(als_benutzer, pflicht=False)
	return P.rechner_oeffentlich(_daten(daten))


__all__ = ["uebersicht", "gemeinschaft", "belege", "energie", "beitritt_antrag", "kuendigung", "tf_wunsch", "interesse", "gemeinde_sicht", "datenauskunft", "rechner", "nicht_angemeldet"]
