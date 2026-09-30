# Copyright (c) 2026, ÖkoInvest GmbH
#
# Mitglied & Genossenschaft (Team 5) – Vertrag: docs/API.md, Abschnitt „Mitglied & Genossenschaft“.
# Referenz: src/lib/plattform/backend/demo/mitglied.js. Regeln: plattform/mitglied_kern.py (1:1 wie mitglied/*.js).
#
# Rechte (Rolle UND Eigentum, jede Methode selbst):
#   Mitglied   – Rolle „mitglied“; nur eigene Mitgliedschaft/Teilnahme/Abrechnung; Versammlungen der eigenen Genossenschaft
#   Backoffice – Rolle admin mit Bereich „genossenschaft“ (plattform/rechte.py): lesen ≥ 1, schreiben = 2
# Einzelstimmen werden nur für die Auszählung gespeichert – ausgegeben werden Summen und die Teilnahme (ohne Stimme).
# KEINE Anlage-, Rechts- oder Steuerberatung – Texte und PDFs (erzeugt von der Website) sind Muster.

import hashlib

import frappe
from frappe.utils import cint, flt, now_datetime, nowdate

from oekoinvest_app.plattform import mitglied_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import PRAEFIX, als_json, aus_json, ist_admin, iso, jetzt_iso, konflikt, konto_json, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

PRAEFIX.update({
	"Plattform Genossenschaft": "GE", "Plattform Genossenschaftsmitglied": "GM", "Plattform Anteilsuebertragung": "GU", "Plattform Generalversammlung": "GV",
	"Plattform GV Stimme": "GS", "Plattform Genossenschaft Ausschuettung": "GAU", "Plattform Energiegemeinschaft": "EGM", "Plattform EG Teilnahme": "ET", "Plattform EG Abrechnung": "EA",
})
BEREICH = "genossenschaft"
DT_GE, DT_GM, DT_GU, DT_GV, DT_GS, DT_AU = "Plattform Genossenschaft", "Plattform Genossenschaftsmitglied", "Plattform Anteilsuebertragung", "Plattform Generalversammlung", "Plattform GV Stimme", "Plattform Genossenschaft Ausschuettung"
DT_EG, DT_ET, DT_EA = "Plattform Energiegemeinschaft", "Plattform EG Teilnahme", "Plattform EG Abrechnung"
LINK_GENO = "/portal/beteiligung/genossenschaft"
LINK_EG = "/portal/beteiligung/energiegemeinschaft"


# ================================================================ Rechte, Fehler, Hilfen


def _heute():
	return nowdate()


def _jetzt_lokal():
	return now_datetime().strftime("%Y-%m-%dT%H:%M")


def _mitglied_rolle(n):
	if not n:
		nicht_angemeldet()
	if not ist_admin(n) and "mitglied" not in (n.get("rollen") or []):
		verboten("Der Mitgliederbereich steht Mitgliedern zur Verfügung.")


def _bo_lesen(n):
	return bool(n) and ist_admin(n) and stufe(n, BEREICH) >= 1


def _bo_lesen_noetig(n):
	if not n:
		nicht_angemeldet()
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice.")


def _bo_schreiben_noetig(n):
	if not n:
		nicht_angemeldet()
	if not ist_admin(n) or stufe(n, BEREICH) < 2:
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Genossenschaft & Energiegemeinschaften“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice.")


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except K.MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _melden(konto_id, titel, text, link, objekt_id):
	if not konto_id:
		return
	from oekoinvest_app.plattform.benachrichtigung import anlegen

	anlegen(konto_id, "status", titel, text, link, "mitglied", objekt_id, mail=True, mail_text=f"{text} Details finden Sie im Portal.", mail_betreff=f"{titel} – ÖkoInvest")


def _backoffice_melden(titel, text, link, objekt_id):
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen

	ziel = []
	for k in aktive_admins()[:50]:
		n = frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k)))
		if stufe(n, BEREICH) >= 2:
			ziel.append(k)
	for k in ziel[:5]:
		anlegen(k, "anfrage", titel, text, link, "mitglied", objekt_id)


def _verlauf(d, n, text, oeffentlich=True):
	d.setdefault("verlauf", []).append({"am": jetzt_iso(), "vonId": (n.get("id") if n else None), "text": v.text(text, 300), "oeffentlich": oeffentlich})
	d["verlauf"] = d["verlauf"][-200:]


def _name_konto(konto_id):
	if not konto_id:
		return ""
	k = frappe.db.get_value("Plattform Konto", konto_id, ["vorname", "nachname", "email"], as_dict=True)
	return (" ".join(x for x in (k.vorname, k.nachname) if x) or k.email) if k else ""


def _datum_de(iso_):
	return ".".join(reversed(str(iso_)[:10].split("-"))) if iso_ else "–"


def _eur(x):
	return f"{flt(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ================================================================ Abbildung Doc ↔ dict (camelCase wie Website)


def _geno(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "name": doc.titel, "land": doc.land, "registerStatus": doc.register_status, "rechtsform": K.RECHTSFORM.get(doc.land, "")}


def _geno_laden(gid):
	if not gid or not frappe.db.exists(DT_GE, gid):
		nicht_gefunden("Genossenschaft nicht gefunden.")
	return _geno(frappe.get_doc(DT_GE, gid))


def _geno_ausgabe(g):
	return {**g, "registerLabel": K.GENO_REGISTER.get(g["registerStatus"], g["registerStatus"]), "registerName": K.REGISTER_NAME.get(g["land"]), "verbandName": K.VERBAND_NAME.get(g["land"]), "hinweise": _hinweise(g), "einladungsfrist": K.einladungsfrist(g)}


def _hinweise(g):
	"""Texte der Pflichtbestätigungen (wie beitrittHinweise in genossenschaft.js)."""
	land = g.get("land") or "DE"
	stand = f" (Stand {_datum_de(g['satzungStand'])})" if g.get("satzungStand") else ""
	h = [
		{"id": "satzung", "text": f"Ich habe die Satzung{stand} erhalten und gelesen. Die Satzung ist für meine Mitgliedschaft verbindlich."},
		{"id": "einzahlung", "text": "Ich verpflichte mich, die nach Gesetz und Satzung geschuldeten Einzahlungen auf den Geschäftsanteil bzw. die Geschäftsanteile zu leisten (§ 15a GenG)." if land == "DE" else "Ich verpflichte mich, die nach Gesetz und Satzung geschuldeten Einzahlungen auf die gezeichneten Geschäftsanteile fristgerecht zu leisten."},
		{"id": "risiko", "text": "Mir ist bewusst, dass Geschäftsanteile eine unternehmerische Beteiligung sind: Es gibt keine Einlagensicherung, Ausschüttungen sind nicht garantiert und im ungünstigsten Fall kann das eingezahlte Geld verloren gehen."},
		{"id": "beratung", "text": "ÖkoInvest und die Genossenschaft erbringen keine Anlage-, Rechts- oder Steuerberatung. Ich entscheide auf Grundlage der Satzung und der Informationen zur Beteiligung selbst."},
		{"id": "mitgliederliste", "text": "Ich bin einverstanden, dass meine Angaben in die Mitgliederliste aufgenommen werden (§ 30 GenG); Mitglieder können nach § 31 GenG Einsicht in ihre eigenen Daten verlangen." if land == "DE" else "Ich bin einverstanden, dass meine Angaben in das Mitgliederverzeichnis der Genossenschaft aufgenommen werden."},
	]
	if g.get("nachschusspflicht") and g["nachschusspflicht"] != "ausgeschlossen":
		h.insert(2, {"id": "nachschuss", "text": f"Die Satzung sieht Nachschüsse zur Insolvenzmasse bis zu einer Haftsumme von {_eur(g.get('haftsummeEur'))} € je Geschäftsanteil vor. Ich verpflichte mich, diese Nachschüsse im Insolvenzfall zu leisten." if g["nachschusspflicht"] == "beschraenkt" else "Die Satzung sieht eine unbeschränkte Nachschusspflicht zur Insolvenzmasse vor. Ich verpflichte mich, die zur Befriedigung der Gläubiger erforderlichen Nachschüsse zu leisten."})
	return h


def _m(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "genoId": doc.genossenschaft, "nutzerId": doc.konto_id or None, "status": doc.status, "nr": doc.nr or "", "anteile": cint(doc.anteile), "eingezahltEur": flt(doc.eingezahlt_eur), "vorgangId": doc.vorgang_id or None}


def _m_laden(mid, fuer_update=False):
	if not mid or not frappe.db.exists(DT_GM, mid):
		nicht_gefunden("Mitgliedschaft nicht gefunden.")
	return frappe.get_doc(DT_GM, mid, for_update=fuer_update)


def _m_speichern(doc, m):
	doc.status = m["status"]
	doc.nr = m.get("nr") or ""
	doc.anteile = m["anteile"]
	doc.eingezahlt_eur = m["eingezahltEur"]
	doc.vorgang_id = m.get("vorgangId") or None
	rest = {k: x for k, x in m.items() if k not in ("id", "genoId", "nutzerId", "status", "nr", "anteile", "eingezahltEur", "vorgangId")}
	doc.daten = als_json(rest)
	doc.save(ignore_permissions=True)


def _alle_m(filters):
	return [_m(frappe.get_doc(DT_GM, x)) for x in frappe.get_all(DT_GM, filters=filters, pluck="name", order_by="creation asc", limit_page_length=5000)]


def _anzeige_name(m):
	b = m.get("beitritt") or {}
	return b.get("firma") or f"{b.get('vorname') or ''} {b.get('nachname') or ''}".strip()


def _ueb(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "genoId": doc.genossenschaft, "vonId": doc.von_mitglied, "anId": doc.an_mitglied, "anNutzerId": doc.an_konto, "status": doc.status, "anteile": cint(doc.anteile), "betragEur": flt(doc.betrag_eur)}


def _m_ausgabe(m, admin=False):
	g = _geno_laden(m["genoId"])
	uebs = [_ueb(frappe.get_doc(DT_GU, x)) for x in frappe.get_all(DT_GU, or_filters={"von_mitglied": m["id"], "an_mitglied": m["id"]}, pluck="name", limit_page_length=200)]
	aus_ueb = []
	for u in uebs:
		gegen_id = u["anId"] if u["vonId"] == m["id"] else u["vonId"]
		gegen = _m(frappe.get_doc(DT_GM, gegen_id)) if gegen_id and frappe.db.exists(DT_GM, gegen_id) else None
		aus_ueb.append({**u, "richtung": "aus" if u["vonId"] == m["id"] else "ein", "gegenName": (_anzeige_name(gegen) if admin else f"Mitglied {gegen.get('nr') or ''}".strip()) if gegen else u.get("anEmail", "")})
	b = m.get("beitritt")
	beitritt = {**b, "iban": b.get("iban") if admin else K.iban_maskiert(b.get("iban") or ""), "ipHash": None} if b else None
	x = {
		"id": m["id"], "genoId": m["genoId"], "genoName": g["name"], "nutzerId": m["nutzerId"], "nr": m.get("nr") or "", "status": m["status"], "statusLabel": K.MITGLIED_STATUS.get(m["status"], m["status"]), "anteile": m["anteile"],
		"erklaertAm": m.get("erklaertAm"), "zugelassenAm": m.get("zugelassenAm"), "aktivSeit": m.get("aktivSeit"), "ausgeschiedenAm": m.get("ausgeschiedenAm"), "einzahlungFrist": m.get("einzahlungFrist"), "vorgangId": m.get("vorgangId"),
		"kennzahlen": K.mitglied_kennzahlen(m, g), "verwendungszweck": K.verwendungszweck(m), "beitritt": beitritt,
		"einzahlungen": m.get("einzahlungen") or [], "zeichnungen": m.get("zeichnungen") or [], "kuendigungen": m.get("kuendigungen") or [], "uebertragungen": aus_ueb,
		"verlauf": [e for e in m.get("verlauf") or [] if admin or e.get("oeffentlich") is not False],
	}
	if admin:
		x.update({"name": _anzeige_name(m) or _name_konto(m["nutzerId"]), "email": frappe.db.get_value("Plattform Konto", m["nutzerId"], "email") if m["nutzerId"] else "", "ablehnungsgrund": m.get("ablehnungsgrund") or ""})
	return x


def _gv(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "genoId": doc.genossenschaft, "titel": doc.titel, "status": doc.status, "datum": doc.datum}


def _gv_speichern(doc, gv):
	doc.titel = gv["titel"]
	doc.status = gv["status"]
	doc.datum = gv["datum"]
	doc.daten = als_json({k: x for k, x in gv.items() if k not in ("id", "genoId", "titel", "status", "datum")})
	doc.save(ignore_permissions=True)


def _stimmen(gv_id):
	return [{"id": s.name, "gvId": s.versammlung, "mitgliedId": s.mitglied, "am": iso(s.am), "stimmen": aus_json(s.stimmen, {}) or {}} for s in frappe.get_all(DT_GS, filters={"versammlung": gv_id}, fields=["name", "versammlung", "mitglied", "am", "stimmen"], limit_page_length=100000)]


def _gv_ausgabe(gv, admin=False, mitglied=None):
	stimmen = _stimmen(gv["id"])
	berechtigt = _alle_m({"genossenschaft": gv["genoId"], "status": ["in", K.MITGLIED_AKTIV]})
	eigene = next((s for s in stimmen if mitglied and s["mitgliedId"] == mitglied["id"]), None)
	offen = K.abstimmung_offen(gv, _jetzt_lokal())
	x = {
		"id": gv["id"], "genoId": gv["genoId"], "titel": gv["titel"], "art": gv.get("art"), "form": gv.get("form"), "datum": gv["datum"], "ort": gv.get("ort") or "", "abstimmungBis": gv.get("abstimmungBis") or "", "einleitung": gv.get("einleitung") or "",
		"tagesordnung": gv.get("tagesordnung") or [], "unterlagen": gv.get("unterlagen") or [], "status": gv["status"], "statusLabel": K.GV_STATUS.get(gv["status"], gv["status"]),
		"eingeladenAm": gv.get("eingeladenAm"), "abgeschlossenAm": gv.get("abgeschlossenAm"), "zugang": gv.get("zugang") or "" if gv["status"] != "entwurf" else "",
		"ergebnis": gv.get("ergebnis") if gv["status"] == "abgeschlossen" else None, "protokoll": gv.get("protokoll") if gv["status"] == "abgeschlossen" else None,
		"abstimmungOffen": offen, "eigeneStimme": {"am": eigene["am"], "stimmen": eigene["stimmen"]} if eigene else None,
		"darfAbstimmen": bool(mitglied) and mitglied["status"] in K.MITGLIED_AKTIV and not eigene and offen, "stimmberechtigt": len(berechtigt), "abgegeben": len(stimmen),
	}
	if admin:
		x["teilnahme"] = [{"mitgliedId": m["id"], "nr": m.get("nr"), "name": _anzeige_name(m), "abgestimmt": any(s["mitgliedId"] == m["id"] for s in stimmen)} for m in berechtigt]
		if gv["status"] == "abstimmung":
			x["zwischenstand"] = K.ergebnis_rechnen(gv, stimmen, len(berechtigt))
	return x


def _aus(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "genoId": doc.genossenschaft, "geschaeftsjahr": cint(doc.geschaeftsjahr), "art": doc.art, "status": doc.status}


def _aus_speichern(doc, a):
	doc.status = a["status"]
	doc.daten = als_json({k: x for k, x in a.items() if k not in ("id", "genoId", "geschaeftsjahr", "art", "status")})
	doc.save(ignore_permissions=True)


def _aus_fuer(a, ids):
	pos = [p for p in a.get("positionen") or [] if p.get("mitgliedId") in ids]
	return {"id": a["id"], "genoId": a["genoId"], "art": a["art"], "artLabel": K.AUSSCHUETTUNG_ARTEN.get(a["art"]), "geschaeftsjahr": a["geschaeftsjahr"], "satzPct": a.get("satzPct"), "ctProKwh": a.get("ctProKwh"), "stichtag": a.get("stichtag"), "status": a["status"], "beschlussDatum": a.get("beschlussDatum"), "ausgezahltAm": a.get("ausgezahltAm"), "positionen": pos}


def _eg(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "name": doc.titel, "land": doc.land, "form": doc.form, "status": doc.status}


def _eg_laden(eid):
	if not eid or not frappe.db.exists(DT_EG, eid):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	return frappe.get_doc(DT_EG, eid)


def _t(doc):
	d = aus_json(doc.daten, {}) or {}
	return {**d, "id": doc.name, "egId": doc.gemeinschaft, "nutzerId": doc.konto_id or None, "status": doc.status}


def _t_speichern(doc, t):
	doc.status = t["status"]
	doc.daten = als_json({k: x for k, x in t.items() if k not in ("id", "egId", "nutzerId", "status")})
	doc.save(ignore_permissions=True)


def _t_ausgabe(t, admin=False):
	eg = _eg(frappe.get_doc(DT_EG, t["egId"])) if frappe.db.exists(DT_EG, t["egId"]) else {}
	s = t.get("stamm") or {}
	x = {
		"id": t["id"], "egId": t["egId"], "egName": eg.get("name", ""), "nutzerId": t["nutzerId"], "status": t["status"], "statusLabel": K.TEILNAHME_STATUS.get(t["status"], t["status"]), "anteilPct": t.get("anteilPct"),
		"beantragtAm": t.get("beantragtAm"), "angemeldetAm": t.get("angemeldetAm"), "ab": t.get("ab"), "bis": t.get("bis"), "grund": t.get("grund") or "",
		"stamm": {k: s.get(k) for k in ("land", "form", "rolle", "zaehlpunkt", "maloId", "zaehlpunktEinspeisung", "plz", "jahresverbrauchKwh", "anlageKwp")} if s else None,
		"verlauf": [e for e in t.get("verlauf") or [] if admin or e.get("oeffentlich") is not False],
	}
	if admin:
		x.update({"name": t.get("name") or _name_konto(t["nutzerId"]), "email": frappe.db.get_value("Plattform Konto", t["nutzerId"], "email") if t["nutzerId"] else ""})
	return x


def _eg_ausgabe(eg, admin=False):
	rab = K.rabatt_fuer(eg["land"], eg["form"])
	teil = [_t(frappe.get_doc(DT_ET, x)) for x in frappe.get_all(DT_ET, filters={"gemeinschaft": eg["id"]}, pluck="name", limit_page_length=5000)]
	x = {
		**{k: y for k, y in eg.items() if k != "laeufe"}, "statusLabel": K.GEMEINSCHAFT_STATUS.get(eg["status"], eg["status"]), "formLabel": K.EG_FORMEN.get(eg["land"], {}).get(eg["form"], eg["form"]),
		"rabatt": {"anteil": rab, "label": _rabatt_label(eg["land"], eg["form"], rab)}, "waehrung": {"w": "CHF", "ct": "Rp."} if eg["land"] == "CH" else {"w": "€", "ct": "ct"},
		"schluesselText": {"dynamisch": "Der geteilte Strom wird je Viertelstunde im Verhältnis zum Verbrauch der Teilnehmer aufgeteilt; nicht benötigte Mengen gehen an die anderen Teilnehmer.", "statisch": "Jeder Teilnehmer erhält einen festen Prozentanteil an der Erzeugung (höchstens seinen Verbrauch); nicht genutzte Mengen werden ins Netz eingespeist."}.get(eg.get("verteilschluessel"), ""),
		"teilnehmerAktiv": len([t for t in teil if t["status"] == "aktiv"]),
	}
	if admin:
		x["teilnehmer"] = [_t_ausgabe(t, admin=True) for t in teil]
		x["laeufe"] = sorted(eg.get("laeufe") or [], key=lambda l: l["monat"], reverse=True)
	return x


def _rabatt_label(land, form, anteil):
	if land == "AT":
		return {"eeg_lokal": "EEG lokal (−57 % Netz-AP)", "eeg_regional": "EEG regional (−28 % Netz-AP)"}.get(form, "BEG (ohne Abschlag)")
	if land == "CH":
		return "LEG, eine Ebene (−40 % Netznutzung)" if form == "leg" else "kein Netzentgeltvorteil"
	return "Energy Sharing (§ 42c EnWG)"


def _stamm(konto_id):
	x = frappe.get_all("Plattform Beteiligung Interesse", filters={"konto_id": konto_id, "art": "eg"}, fields=["name", "daten"], limit_page_length=1)
	return {**(aus_json(x[0].daten, {}) or {}), "id": x[0].name} if x else None


# ================================================================ Portal


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	genos = [_geno(frappe.get_doc(DT_GE, x)) for x in frappe.get_all(DT_GE, pluck="name", order_by="creation asc", limit_page_length=100)]
	eigene = _alle_m({"konto_id": n.id})
	ids = [m["id"] for m in eigene]
	geno_ids = [m["genoId"] for m in eigene if m["status"] not in ("abgelehnt", "zurueckgezogen")]
	eingehend = []
	for u in [_ueb(frappe.get_doc(DT_GU, x)) for x in frappe.get_all(DT_GU, filters={"an_konto": n.id, "status": "angefragt"}, pluck="name", limit_page_length=50)]:
		von = _m(frappe.get_doc(DT_GM, u["vonId"]))
		eingehend.append({"id": u["id"], "anteile": u["anteile"], "betragEur": u["betragEur"], "am": u.get("am"), "genoName": _geno_laden(u["genoId"])["name"], "vonNr": von.get("nr") or ""})
	versammlungen = []
	if geno_ids:
		for x in frappe.get_all(DT_GV, filters={"genossenschaft": ["in", geno_ids], "status": ["!=", "entwurf"]}, pluck="name", order_by="datum desc", limit_page_length=100):
			gv = _gv(frappe.get_doc(DT_GV, x))
			versammlungen.append(_gv_ausgabe(gv, mitglied=next((m for m in eigene if m["genoId"] == gv["genoId"]), None)))
	aus = []
	if geno_ids:
		for x in frappe.get_all(DT_AU, filters={"genossenschaft": ["in", geno_ids], "status": ["!=", "entwurf"]}, pluck="name", limit_page_length=200):
			a = _aus(frappe.get_doc(DT_AU, x))
			if any(p.get("mitgliedId") in ids for p in a.get("positionen") or []):
				aus.append(_aus_fuer(a, ids))
	stamm = _stamm(n.id)
	egs = [_eg(frappe.get_doc(DT_EG, x)) for x in frappe.get_all(DT_EG, pluck="name", limit_page_length=200)]
	teil = [_t(frappe.get_doc(DT_ET, x)) for x in frappe.get_all(DT_ET, filters={"konto_id": n.id}, pluck="name", limit_page_length=100)]
	abr = [{**(aus_json(a.daten, {}) or {}), "id": a.name, "egId": a.gemeinschaft, "teilnahmeId": a.teilnahme, "nutzerId": a.konto_id, "monat": a.monat} for a in frappe.get_all(DT_EA, filters={"konto_id": n.id}, fields=["name", "gemeinschaft", "teilnahme", "konto_id", "monat", "daten"], order_by="monat desc", limit_page_length=24)]
	vorm = frappe.get_all("Plattform Beteiligung Interesse", filters={"konto_id": n.id, "art": "geno"}, fields=["name", "status", "daten", "modified"], limit_page_length=1)
	return {
		"heute": _heute(), "genos": [_geno_ausgabe(g) for g in genos], "mitgliedschaften": [_m_ausgabe(m) for m in eigene], "eingehend": eingehend, "versammlungen": versammlungen, "ausschuettungen": aus,
		"eg": {
			"stamm": stamm,
			"gemeinschaften": [{**_eg_ausgabe(g), "hindernisse": K.teilnahme_hindernisse(stamm, g)} for g in egs if g["status"] != "geschlossen" or any(t["egId"] == g["id"] for t in teil)],
			"teilnahmen": [_t_ausgabe(t) for t in teil], "abrechnungen": abr,
		},
		"vormerkung": {**(aus_json(vorm[0].daten, {}) or {}), "id": vorm[0].name, "status": vorm[0].status, "geaendertAm": iso(vorm[0].modified)} if vorm else None,
	}


@frappe.whitelist(methods=["POST"])
def beitritt(genoId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803
	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	if ist_admin(n) and "mitglied" not in n.rollen:
		verboten("Der Beitritt erfolgt über das Konto des Mitglieds.")
	g = _geno_laden(v.kennung(genoId))
	b = _fach(K.beitritt_bereinigen, daten or {}, g, _heute())
	if frappe.get_all(DT_GM, filters={"genossenschaft": g["id"], "konto_id": n.id, "status": ["not in", ["abgelehnt", "zurueckgezogen"]]}, limit_page_length=1):
		konflikt("Für diese Genossenschaft liegt bereits eine Beitrittserklärung bzw. Mitgliedschaft vor.")
	b["email"] = n.email
	b["ipHash"] = hashlib.sha256(f"mitglied:{ip}".encode()).hexdigest()[:16] if ip else ""
	m = {"status": "erklaert", "nr": "", "anteile": b["anteile"], "eingezahltEur": 0, "vorgangId": None, "beitritt": b, "erklaertAm": jetzt_iso(), "einzahlungen": [], "zeichnungen": [], "kuendigungen": [], "verlauf": []}
	_verlauf(m, n, f"Beitrittserklärung über {b['anteile']} Geschäftsanteile ({_eur(K.pflicht_betrag(m, g))} €) abgegeben")
	doc = frappe.get_doc({"doctype": DT_GM, "genossenschaft": g["id"], "konto_id": n.id, "status": "erklaert", "anteile": b["anteile"], "eingezahlt_eur": 0})
	doc.daten = als_json({k: x for k, x in m.items() if k not in ("status", "nr", "anteile", "eingezahltEur", "vorgangId")})
	doc.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "mitglied", doc.name, f"Beitrittserklärung {g['name']}: {b['anteile']} Anteile", v.text(ip, 64))
	_backoffice_melden("Neue Beitrittserklärung", f"{b['firma'] or (b['vorname'] + ' ' + b['nachname'])}: {b['anteile']} Anteile – Unterschrift prüfen und Beitritt zulassen.", "/portal/admin/genossenschaft", doc.name)
	# Vorgang „genossenschaft“: Nachrichten-Thread und Upload der unterschriebenen Erklärung (wie fach.lastgang_anfrage)
	try:
		from oekoinvest_app.plattform.api.anfrage import anlegen

		frappe.set_user(api_user)
		r = anlegen(
			typ="genossenschaft", kontakt={"vorname": n.vorname or b["vorname"] or "Mitglied", "nachname": n.nachname or b["nachname"], "firma": b["firma"], "email": n.email, "telefon": n.telefon, "plz": b["plz"], "ort": b["ort"], "land": b["land"]},
			daten={"quelle": "Beitrittserklärung im Portal", "genossenschaft": g["name"], "mitgliedschaftId": doc.name, "anteile": b["anteile"], "betragEur": b["betragEur"]},
			herkunft={"quelle": "portal", "kampagne": "beitritt"}, ip=ip, einwilligungText="Beitrittserklärung aus dem Portal (angemeldetes Konto).", als_benutzer=als_benutzer,
		)
		vid = (r or {}).get("id")
		if vid:
			if not frappe.db.get_value("Plattform Vorgang", vid, "nutzer_id"):
				frappe.db.set_value("Plattform Vorgang", vid, "nutzer_id", n.id, update_modified=False)
			frappe.db.set_value(DT_GM, doc.name, "vorgang_id", vid, update_modified=False)
	except Exception:  # noqa: BLE001 – der Beitritt bleibt gültig, der Vorgang ist Komfort
		frappe.log_error(title="Mitglied: Vorgang zur Beitrittserklärung nicht angelegt")
		frappe.set_user(api_user)
		nutzer(als_benutzer)
	return _m_ausgabe(_m(frappe.get_doc(DT_GM, doc.name)))


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	if akt in ("uebertragungAnnehmen", "uebertragungAblehnen"):
		return _uebertragung_empfang(n, v.kennung(d.get("uebertragungId")), akt == "uebertragungAnnehmen", ip)
	doc = _m_laden(v.kennung(id), fuer_update=True)
	m = _m(doc)
	if m["nutzerId"] != n.id:
		verboten("Diese Mitgliedschaft gehört nicht zu Ihrem Konto.")
	g = _geno_laden(m["genoId"])
	h = _heute()
	if akt == "zurueckziehen":
		if m["status"] != "erklaert":
			konflikt("Zurückziehen ist nur möglich, solange der Beitritt noch nicht zugelassen ist.")
		m["status"] = "zurueckgezogen"
		_verlauf(m, n, "Beitrittserklärung zurückgezogen")
	elif akt == "zeichnen":
		z = _fach(K.zeichnung_bereinigen, d, m, g)
		m.setdefault("zeichnungen", []).append({"id": _kennung("GZ"), "anteile": z["anteile"], "betragEur": z["betragEur"], "am": jetzt_iso(), "status": "beantragt"})
		_verlauf(m, n, f"Zeichnung weiterer {z['anteile']} Anteile beantragt")
		_backoffice_melden("Weitere Anteile gezeichnet", f"Mitglied {m['nr']}: {z['anteile']} weitere Anteile – Zulassung durch den Vorstand.", "/portal/admin/genossenschaft", doc.name)
	elif akt == "kuendigen":
		k = _fach(K.kuendigung_bereinigen, d, m, g, h)
		m.setdefault("kuendigungen", []).append({"id": _kennung("GK"), **k, "status": "eingereicht", "betragEur": K.auseinandersetzung(m, g, k["anteile"])})
		umfang = "Kündigung der Mitgliedschaft" if k["art"] == "voll" else f"Kündigung von {k['anteile']} Anteilen"
		_verlauf(m, n, f"{umfang} zum {_datum_de(k['wirksamZum'])} eingereicht")
		_backoffice_melden("Kündigung eingegangen", f"Mitglied {m['nr']}: {'Mitgliedschaft' if k['art'] == 'voll' else str(k['anteile']) + ' Anteile'} zum {_datum_de(k['wirksamZum'])}.", "/portal/admin/genossenschaft", doc.name)
	elif akt == "kuendigungZuruecknehmen":
		k = next((x for x in m.get("kuendigungen") or [] if x["id"] == d.get("kuendigungId") and x["status"] == "eingereicht"), None)
		if not k:
			konflikt("Zurücknehmen ist nur möglich, solange die Kündigung noch nicht bestätigt ist.")
		k["status"] = "zurueckgenommen"
		_verlauf(m, n, "Kündigung zurückgenommen")
	elif akt == "uebertragen":
		u = _fach(K.uebertragung_bereinigen, d, m, g)
		konto = frappe.db.get_value("Plattform Konto", {"email": u["anEmail"], "aktiv": 1}, "name")
		if konto == n.id:
			ungueltig("An sich selbst kann nicht übertragen werden.")
		empf_name = frappe.get_all(DT_GM, filters={"genossenschaft": g["id"], "konto_id": konto, "status": "aktiv"}, pluck="name", limit_page_length=1) if konto else []
		empf = _m(frappe.get_doc(DT_GM, empf_name[0])) if empf_name else None
		_fach(K.uebertragung_empfaenger_pruefen, empf, u["anteile"], g)
		if frappe.get_all(DT_GU, filters={"von_mitglied": m["id"], "status": ["in", ["angefragt", "angenommen"]]}, limit_page_length=1):
			konflikt("Es ist bereits eine Übertragung offen.")
		ue = frappe.get_doc({"doctype": DT_GU, "genossenschaft": g["id"], "von_mitglied": m["id"], "an_mitglied": empf["id"], "an_konto": konto, "status": "angefragt", "anteile": u["anteile"], "betrag_eur": u["betragEur"], "daten": als_json({"anEmail": u["anEmail"], "art": u["art"], "am": jetzt_iso()})})
		ue.insert(ignore_permissions=True)
		_verlauf(m, n, f"Übertragung von {u['anteile']} Anteilen an Mitglied {empf.get('nr')} angefragt")
		_melden(konto, "Übertragung von Geschäftsanteilen", f"Ein Mitglied der {g['name']} möchte Ihnen {u['anteile']} Geschäftsanteile übertragen. Bitte annehmen oder ablehnen.", LINK_GENO, ue.name)
	else:
		ungueltig("Unbekannte Aktion.")
	_m_speichern(doc, m)
	protokoll(n, "aendern", "mitglied", doc.name, f"Mitglied: {akt}", v.text(ip, 64))
	return _m_ausgabe(_m(doc))


def _kennung(praefix):
	import secrets

	from oekoinvest_app.plattform.kern import ALPHABET

	return f"{praefix}-{now_datetime().strftime('%y')}-" + "".join(secrets.choice(ALPHABET) for _ in range(6))


def _uebertragung_empfang(n, uid, annehmen, ip):
	if not uid or not frappe.db.exists(DT_GU, uid):
		nicht_gefunden("Übertragung nicht gefunden.")
	doc = frappe.get_doc(DT_GU, uid, for_update=True)
	if doc.an_konto != n.id:
		nicht_gefunden("Übertragung nicht gefunden.")
	if doc.status != "angefragt":
		konflikt("Diese Übertragung wurde bereits beantwortet.")
	u = _ueb(doc)
	doc.status = "angenommen" if annehmen else "abgelehnt"
	doc.daten = als_json({**(aus_json(doc.daten, {}) or {}), "beantwortetAm": jetzt_iso()})
	doc.save(ignore_permissions=True)
	vdoc = _m_laden(u["vonId"], fuer_update=True)
	von = _m(vdoc)
	_verlauf(von, None, "Empfänger hat die Übertragung angenommen – Zustimmung des Vorstands offen" if annehmen else "Empfänger hat die Übertragung abgelehnt")
	_m_speichern(vdoc, von)
	_melden(von["nutzerId"], "Übertragung angenommen" if annehmen else "Übertragung abgelehnt", "Der Empfänger hat die Übertragung Ihrer Anteile angenommen. Es fehlt noch die Zustimmung des Vorstands." if annehmen else "Der Empfänger hat die Übertragung Ihrer Anteile abgelehnt.", LINK_GENO, uid)
	if annehmen:
		_backoffice_melden("Übertragung zur Zustimmung", f"Übertragung von {u['anteile']} Anteilen – Zustimmung des Vorstands.", "/portal/admin/genossenschaft", uid)
	protokoll(n, "aendern", "mitglied", uid, f"Übertragung {'angenommen' if annehmen else 'abgelehnt'}", v.text(ip, 64))
	return {"ok": True, "status": doc.status}


@frappe.whitelist(methods=["POST"])
def gv_detail(gvId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	return _gv_detail(n, v.kennung(gvId))


def _gv_detail(n, gid):
	if not n:
		nicht_angemeldet()
	if not gid or not frappe.db.exists(DT_GV, gid):
		nicht_gefunden("Versammlung nicht gefunden.")
	gv = _gv(frappe.get_doc(DT_GV, gid))
	if _bo_lesen(n):
		return {**_gv_ausgabe(gv, admin=True), "geno": _geno_ausgabe(_geno_laden(gv["genoId"]))}
	_mitglied_rolle(n)
	mm = _alle_m({"genossenschaft": gv["genoId"], "konto_id": n.id, "status": ["in", ["aktiv", "ausgeschieden"]]})
	if not mm or gv["status"] == "entwurf":
		nicht_gefunden("Versammlung nicht gefunden.")
	return {**_gv_ausgabe(gv, mitglied=mm[0]), "geno": _geno_ausgabe(_geno_laden(gv["genoId"]))}


@frappe.whitelist(methods=["POST"])
def gv_abstimmen(gvId=None, stimmen=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	gid = v.kennung(gvId)
	if not gid or not frappe.db.exists(DT_GV, gid):
		nicht_gefunden("Versammlung nicht gefunden.")
	gv = _gv(frappe.get_doc(DT_GV, gid, for_update=True))
	mm = _alle_m({"genossenschaft": gv["genoId"], "konto_id": n.id, "status": "aktiv"})
	if not mm:
		verboten("Abstimmen können nur Mitglieder der Genossenschaft.")
	if not K.abstimmung_offen(gv, _jetzt_lokal()):
		konflikt("Die Abstimmung ist beendet." if gv["status"] == "abstimmung" else "Die Abstimmung ist nicht geöffnet.")
	if frappe.db.exists(DT_GS, {"versammlung": gid, "mitglied": mm[0]["id"]}):
		konflikt("Sie haben bereits abgestimmt – die Stimme kann nicht geändert werden.")
	s = _fach(K.stimme_bereinigen, stimmen or {}, gv)
	doc = frappe.get_doc({"doctype": DT_GS, "versammlung": gid, "mitglied": mm[0]["id"], "stimmen": als_json(s), "am": now_datetime()})
	doc.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "gv_stimme", gid, f"Stimme abgegeben ({gv['titel']})", v.text(ip, 64))
	return {"ok": True, "am": iso(doc.am), "stimmen": s}


@frappe.whitelist(methods=["POST"])
def eg_beitreten(egId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	egdoc = _eg_laden(v.kennung(egId))
	eg = _eg(egdoc)
	stamm = _stamm(n.id)
	b = _fach(K.eg_beitritt_bereinigen, daten or {}, stamm, eg)
	if frappe.get_all(DT_ET, filters={"konto_id": n.id, "gemeinschaft": eg["id"], "status": ["in", ["beantragt", "angemeldet", "aktiv"]]}, limit_page_length=1):
		konflikt("Sie nehmen an dieser Gemeinschaft bereits teil bzw. haben den Beitritt beantragt.")
	zp = stamm.get("zaehlpunkt") or stamm.get("maloId")
	for x in frappe.get_all(DT_ET, filters={"gemeinschaft": eg["id"], "status": ["in", ["beantragt", "angemeldet", "aktiv"]]}, fields=["daten"], limit_page_length=5000):
		s = (aus_json(x.daten, {}) or {}).get("stamm") or {}
		if zp and (s.get("zaehlpunkt") or s.get("maloId")) == zp:
			konflikt("Dieser Zählpunkt ist in der Gemeinschaft bereits angemeldet.")
	t = {"status": "beantragt", "anteilPct": b["anteilPct"], "beantragtAm": jetzt_iso(), "stamm": stamm, "verlauf": []}
	_verlauf(t, n, "Beitritt beantragt")
	doc = frappe.get_doc({"doctype": DT_ET, "gemeinschaft": eg["id"], "konto_id": n.id, "status": "beantragt"})
	doc.daten = als_json({k: x for k, x in t.items() if k != "status"})
	doc.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "eg_teilnahme", doc.name, f"Beitritt {eg['name']} beantragt", v.text(ip, 64))
	_backoffice_melden("Beitritt Energiegemeinschaft", f"{_name_konto(n.id)}: Beitritt zu „{eg['name']}“ – beim Netzbetreiber anmelden.", "/portal/admin/energiegemeinschaften", doc.name)
	return _t_ausgabe(_t(doc))


@frappe.whitelist(methods=["POST"])
def eg_teilnahme_aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_mitglied_rolle(n)
	tid = v.kennung(id)
	if not tid or not frappe.db.exists(DT_ET, tid):
		nicht_gefunden("Teilnahme nicht gefunden.")
	doc = frappe.get_doc(DT_ET, tid, for_update=True)
	if doc.konto_id != n.id:
		nicht_gefunden("Teilnahme nicht gefunden.")
	d = daten if isinstance(daten, dict) else {}
	if d.get("aktion") != "kuendigen":
		ungueltig("Unbekannte Aktion.")
	t = _t(doc)
	if t["status"] not in ("beantragt", "angemeldet", "aktiv"):
		konflikt("Die Teilnahme ist bereits beendet.")
	if t["status"] == "aktiv":
		t["bis"] = K.teilnahme_ende(_heute())
		_verlauf(t, n, f"Teilnahme zum {_datum_de(t['bis'])} gekündigt")
		_backoffice_melden("Kündigung Energiegemeinschaft", f"Teilnahme {tid} endet zum {_datum_de(t['bis'])} – beim Netzbetreiber abmelden.", "/portal/admin/energiegemeinschaften", tid)
	else:
		t["status"] = "beendet"
		t["bis"] = _heute()
		_verlauf(t, n, "Beitrittsantrag zurückgezogen")
	_t_speichern(doc, t)
	protokoll(n, "aendern", "eg_teilnahme", tid, "Teilnahme gekündigt", v.text(ip, 64))
	return _t_ausgabe(_t(doc))


@frappe.whitelist(methods=["POST"])
def dokument(art=None, id=None, ip=None, als_benutzer=None):  # noqa: A002
	"""Daten für ein Muster-PDF (Layout: Website server/mitglied-pdf.js)."""
	n = nutzer(als_benutzer)
	bo = _bo_lesen(n)
	if not bo:
		_mitglied_rolle(n)
	k = v.kennung(id)
	if art in ("beitritt", "bestaetigung"):
		m = _m(_m_laden(k))
		if not bo and m["nutzerId"] != n.id:
			nicht_gefunden("Mitgliedschaft nicht gefunden.")
		if art == "bestaetigung" and m["status"] != "aktiv":
			konflikt("Die Anteilsbestätigung gibt es für aktive Mitglieder nach Eingang der Einzahlung.")
		daten = {"art": art, "geno": _geno_ausgabe(_geno_laden(m["genoId"])), "mitglied": _m_ausgabe(m, admin=bo), "stand": _heute()}
	elif art == "ausschuettung":
		if not k or not frappe.db.exists(DT_AU, k):
			nicht_gefunden("Ausschüttung nicht gefunden.")
		a = _aus(frappe.get_doc(DT_AU, k))
		if a["status"] == "entwurf":
			nicht_gefunden("Ausschüttung nicht gefunden.")
		ids = [p.get("mitgliedId") for p in a.get("positionen") or []] if bo else [m["id"] for m in _alle_m({"konto_id": n.id})]
		aus = _aus_fuer(a, ids)
		if not aus["positionen"]:
			nicht_gefunden("Ausschüttung nicht gefunden.")
		empf = None if bo else _m_ausgabe(_m(_m_laden(aus["positionen"][0]["mitgliedId"])))
		daten = {"art": art, "geno": _geno_ausgabe(_geno_laden(a["genoId"])), "ausschuettung": {**aus, "summe": a.get("summe") if bo else None, "steuersatz": a.get("steuersatz")}, "empfaenger": empf}
	elif art in ("einladung", "protokoll"):
		gv = _gv_detail(n, k)
		if art == "protokoll" and gv["status"] != "abgeschlossen":
			konflikt("Das Protokoll liegt nach Abschluss der Versammlung vor.")
		daten = {"art": art, "gv": gv}
	elif art == "eg":
		if not k or not frappe.db.exists(DT_EA, k):
			nicht_gefunden("Abrechnung nicht gefunden.")
		x = frappe.get_doc(DT_EA, k)
		if not bo and x.konto_id != n.id:
			nicht_gefunden("Abrechnung nicht gefunden.")
		a = {**(aus_json(x.daten, {}) or {}), "id": x.name, "egId": x.gemeinschaft, "teilnahmeId": x.teilnahme, "nutzerId": x.konto_id, "monat": x.monat}
		t = _t(frappe.get_doc(DT_ET, x.teilnahme)) if x.teilnahme and frappe.db.exists(DT_ET, x.teilnahme) else None
		daten = {"art": art, "abrechnung": a, "gemeinschaft": _eg_ausgabe(_eg(frappe.get_doc(DT_EG, x.gemeinschaft))), "teilnahme": _t_ausgabe(t) if t else None, "empfaenger": _name_konto(x.konto_id) or a.get("name", "")}
	else:
		ungueltig("Unbekanntes Dokument.")
	protokoll(n, "abruf", "mitglied_dokument", k, f"PDF {art} abgerufen", v.text(ip, 64))
	return {**daten, "erstelltFuer": _name_konto(n.id), "demo": False}


# ================================================================ Backoffice: Genossenschaft


@frappe.whitelist(methods=["POST"])
def bo_geno(als_benutzer=None):
	n = nutzer(als_benutzer)
	_bo_lesen_noetig(n)
	genos = [_geno(frappe.get_doc(DT_GE, x)) for x in frappe.get_all(DT_GE, pluck="name", order_by="creation asc", limit_page_length=100)]
	mitglieder = [_m_ausgabe(m, admin=True) for m in _alle_m({})]
	aktiv = [m for m in mitglieder if m["status"] == "aktiv"]
	uebs = [_ueb(frappe.get_doc(DT_GU, x)) for x in frappe.get_all(DT_GU, pluck="name", order_by="creation desc", limit_page_length=500)]
	name_von = {m["id"]: m["name"] for m in mitglieder}
	versammlungen = [_gv_ausgabe(_gv(frappe.get_doc(DT_GV, x)), admin=True) for x in frappe.get_all(DT_GV, pluck="name", order_by="datum desc", limit_page_length=200)]
	aus = [{**_aus(frappe.get_doc(DT_AU, x)), "artLabel": ""} for x in frappe.get_all(DT_AU, pluck="name", order_by="creation desc", limit_page_length=200)]
	for a in aus:
		a["artLabel"] = K.AUSSCHUETTUNG_ARTEN.get(a["art"])
	return {
		"heute": _heute(), "darfSchreiben": stufe(n, BEREICH) >= 2, "genos": [_geno_ausgabe(g) for g in genos], "mitglieder": mitglieder,
		"uebertragungen": [{**u, "von": name_von.get(u["vonId"], ""), "an": name_von.get(u["anId"], "")} for u in uebs], "versammlungen": versammlungen, "ausschuettungen": aus,
		"kennzahlen": {
			"mitglieder": len(aktiv), "anteile": sum(m["anteile"] for m in aktiv), "guthabenEur": K.rund2(sum(m["kennzahlen"]["guthabenEur"] for m in aktiv)),
			"offeneEinzahlungenEur": K.rund2(sum(m["kennzahlen"]["offenEur"] for m in mitglieder if m["status"] in ("zugelassen", "aktiv"))),
			"offeneErklaerungen": len([m for m in mitglieder if m["status"] == "erklaert"]),
			"offeneKuendigungen": sum(len([k for k in m["kuendigungen"] if k["status"] in ("eingereicht", "bestaetigt", "wirksam")]) for m in mitglieder),
			"offeneUebertragungen": len([u for u in uebs if u["status"] == "angenommen"]),
		},
		"rechtOffen": RECHT_OFFEN,
	}


RECHT_OFFEN = [
	{"id": "prospekt", "titel": "Prospekt- und Informationspflichten", "text": "DE: Genossenschaftsanteile sind nach § 2 Abs. 1 Nr. 1 VermAnlG nur dann von der Prospektpflicht ausgenommen, wenn für den Vertrieb keine erfolgsabhängige Vergütung gezahlt wird – Plattform-Vergütung prüfen. AT: KMG 2019 bzw. AltFG (Schwellenwerte, Informationsblatt). CH: FIDLEG (Prospektpflicht und Ausnahmen). Bis zur Klärung: keine öffentliche Werbung für die Zeichnung, nur Information der Interessenten."},
	{"id": "form", "titel": "Form der Beitrittserklärung", "text": "Nach § 15 GenG (DE) bzw. Satzung ist die Beitrittserklärung zu unterzeichnen. Ob eine elektronische Erklärung (Textform/qualifizierte elektronische Signatur) genügt, ist zu prüfen. Bis dahin: Erklärung im Portal ausfüllen, als PDF drucken, unterschreiben und hochladen bzw. einsenden – der Vorstand lässt erst nach Eingang der Unterschrift zu."},
	{"id": "online_gv", "titel": "Online-Generalversammlung und elektronische Abstimmung", "text": "Nur zulässig, wenn die Satzung sie vorsieht (DE § 43b GenG; AT und CH nach Gesetz und Statuten, nach aktuellem Stand mit Satzungsgrundlage). Einladungsfristen und Beschlussmehrheiten laut Satzung."},
	{"id": "gwg", "titel": "Geldwäsche und Identifizierung", "text": "Ob und in welchem Umfang eine Identifizierung der Mitglieder nötig ist (GwG, FM-GwG, GwG CH), ist zu klären; die Plattform kann den vorhandenen KYC-Ablauf nutzen."},
	{"id": "steuer", "titel": "Steuern auf Ausschüttungen", "text": "Kapitalertragsteuer/KESt bzw. Verrechnungssteuer, Freistellungsaufträge und die Behandlung von Rückvergütungen mit der Steuerberatung abstimmen; die Berechnung im Portal ist vereinfacht."},
	{"id": "einlagen", "titel": "Kein Einlagengeschäft", "text": "Die Genossenschaft nimmt nur Einzahlungen auf gezeichnete Geschäftsanteile entgegen – keine sonstigen rückzahlbaren Gelder (KWG/BWG/BankG)."},
]


@frappe.whitelist(methods=["POST"])
def bo_geno_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	g = _fach(K.geno_bereinigen, daten or {})
	rest = {k: x for k, x in g.items() if k not in ("name", "land", "registerStatus", "rechtsform")}
	k = v.kennung(id)
	if k:
		doc = frappe.get_doc(DT_GE, k) if frappe.db.exists(DT_GE, k) else nicht_gefunden("Genossenschaft nicht gefunden.")
		if doc.land != g["land"] and frappe.db.exists(DT_GM, {"genossenschaft": k}):
			konflikt("Das Land kann nach dem ersten Beitritt nicht mehr geändert werden.")
		doc.update({"titel": g["name"], "land": g["land"], "register_status": g["registerStatus"], "daten": als_json(rest)})
		doc.save(ignore_permissions=True)
		protokoll(n, "aendern", "genossenschaft", doc.name, f"Stammdaten {g['name']} geändert")
	else:
		doc = frappe.get_doc({"doctype": DT_GE, "titel": g["name"], "land": g["land"], "register_status": g["registerStatus"], "daten": als_json(rest)})
		doc.insert(ignore_permissions=True)
		protokoll(n, "anlegen", "genossenschaft", doc.name, f"Genossenschaft {g['name']} angelegt")
	return _geno_ausgabe(_geno(doc))


def _aktivieren(n, m, g):
	m["status"] = "aktiv"
	m["aktivSeit"] = _heute()
	_verlauf(m, n, "Einzahlung vollständig – Mitgliedschaft aktiv, Anteilsbestätigung abrufbar")
	_melden(m["nutzerId"], "Mitgliedschaft aktiv", f"Ihre Einzahlung ist vollständig. Sie sind Mitglied Nr. {m['nr']} der {g['name']}; die Anteilsbestätigung steht im Portal bereit.", LINK_GENO, m["id"])


@frappe.whitelist(methods=["POST"])
def bo_mitglied_aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002, C901
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	h = _heute()
	if akt in ("uebertragungGenehmigen", "uebertragungAblehnen"):
		uid = v.kennung(d.get("uebertragungId") or id)
		if not uid or not frappe.db.exists(DT_GU, uid):
			nicht_gefunden("Übertragung nicht gefunden.")
		udoc = frappe.get_doc(DT_GU, uid, for_update=True)
		u = _ueb(udoc)
		if u["status"] != "angenommen":
			konflikt("Zugestimmt werden kann erst, wenn der Empfänger angenommen hat.")
		vdoc, adoc = _m_laden(u["vonId"], True), _m_laden(u["anId"], True)
		von, an = _m(vdoc), _m(adoc)
		g = _geno_laden(u["genoId"])
		extra = aus_json(udoc.daten, {}) or {}
		if akt == "uebertragungAblehnen":
			udoc.status = "abgelehnt"
			extra["grund"] = v.text(d.get("grund"), 300)
			_verlauf(von, n, "Übertragung vom Vorstand nicht genehmigt")
			_melden(von["nutzerId"], "Übertragung nicht genehmigt", "Der Vorstand hat der Übertragung Ihrer Anteile nicht zugestimmt.", LINK_GENO, uid)
		else:
			if u["anteile"] > von["anteile"] or von["status"] != "aktiv" or an["status"] != "aktiv":
				konflikt("Die Übertragung ist nicht mehr möglich (Anteile oder Status haben sich geändert).")
			_fach(K.uebertragung_empfaenger_pruefen, an, u["anteile"], g)
			betrag = min(u["betragEur"], von["eingezahltEur"])
			von["anteile"] -= u["anteile"]
			von["eingezahltEur"] = K.rund2(von["eingezahltEur"] - betrag)
			an["anteile"] += u["anteile"]
			an["eingezahltEur"] = K.rund2(an["eingezahltEur"] + betrag)
			udoc.status = "genehmigt"
			extra["genehmigtAm"] = jetzt_iso()
			_verlauf(von, n, f"{u['anteile']} Anteile an Mitglied {an.get('nr')} übertragen")
			_verlauf(an, n, f"{u['anteile']} Anteile von Mitglied {von.get('nr')} übernommen")
			if von["anteile"] == 0:
				von["status"] = "ausgeschieden"
				von["ausgeschiedenAm"] = h
				_verlauf(von, n, "Ausgeschieden durch Übertragung des gesamten Geschäftsguthabens (§ 76 GenG)" if g["land"] == "DE" else "Ausgeschieden durch Übertragung des gesamten Geschäftsguthabens")
			_melden(von["nutzerId"], "Übertragung durchgeführt", f"Ihre {u['anteile']} Anteile wurden übertragen.", LINK_GENO, uid)
			_melden(an["nutzerId"], "Anteile übernommen", f"Ihnen wurden {u['anteile']} Geschäftsanteile übertragen.", LINK_GENO, uid)
			_m_speichern(adoc, an)
		udoc.daten = als_json(extra)
		udoc.save(ignore_permissions=True)
		_m_speichern(vdoc, von)
		protokoll(n, "aendern", "mitglied", uid, f"Übertragung: {akt}", v.text(ip, 64))
		return {"ok": True}

	doc = _m_laden(v.kennung(id), fuer_update=True)
	m = _m(doc)
	g = _geno_laden(m["genoId"])
	if akt == "zulassen":
		if m["status"] != "erklaert":
			konflikt("Zugelassen werden kann nur eine eingegangene Beitrittserklärung.")
		if d.get("unterschrift") is not True:
			ungueltig("Bitte bestätigen Sie, dass die unterschriebene Beitrittserklärung vorliegt (Form laut Satzung).")
		m["status"] = "zugelassen"
		m["zugelassenAm"] = jetzt_iso()
		m["nr"] = K.naechste_nummer(frappe.get_all(DT_GM, filters={"genossenschaft": g["id"]}, pluck="nr", limit_page_length=100000))
		m["einzahlungFrist"] = K.plus_tage(h, g["einzahlungsfristTage"])
		_verlauf(m, n, f"Beitritt zugelassen – Mitgliedsnummer {m['nr']}, Einzahlung bis {_datum_de(m['einzahlungFrist'])}")
		_melden(m["nutzerId"], "Beitritt zugelassen", f"Willkommen in der {g['name']}. Bitte zahlen Sie {_eur(K.offener_betrag(m, g))} € bis {_datum_de(m['einzahlungFrist'])} ein (Verwendungszweck {K.verwendungszweck(m)}).", LINK_GENO, m["id"])
		if K.offener_betrag(m, g) == 0:
			_aktivieren(n, m, g)
	elif akt == "ablehnen":
		if m["status"] != "erklaert":
			konflikt("Nur eingegangene Beitrittserklärungen können abgelehnt werden.")
		grund = v.text(d.get("grund"), 300)
		if len(grund) < 5:
			ungueltig("Bitte geben Sie eine kurze Begründung für das Mitglied an.")
		m["status"] = "abgelehnt"
		m["ablehnungsgrund"] = grund
		_verlauf(m, n, f"Beitritt nicht zugelassen: {grund}")
		_melden(m["nutzerId"], "Beitritt nicht zugelassen", f"Der Vorstand der {g['name']} hat Ihren Beitritt nicht zugelassen. Begründung: {grund}", LINK_GENO, m["id"])
	elif akt == "einzahlung":
		if m["status"] not in ("zugelassen", "aktiv"):
			konflikt("Einzahlungen werden erst nach der Zulassung gebucht.")
		e = _fach(K.einzahlung_bereinigen, d, h)
		offen = K.offener_betrag(m, g)
		if e["betragEur"] > offen + 0.001:
			ungueltig(f"Der Betrag übersteigt die offene Einzahlung ({_eur(offen)} €) – Überzahlungen bitte zurücküberweisen (kein Einlagengeschäft).")
		m.setdefault("einzahlungen", []).append({"id": _kennung("GP"), **e, "vonId": n.id, "gebuchtAm": jetzt_iso()})
		m["eingezahltEur"] = K.rund2(m["eingezahltEur"] + e["betragEur"])
		_verlauf(m, n, f"Einzahlung {_eur(e['betragEur'])} € gebucht")
		if m["status"] == "zugelassen" and K.offener_betrag(m, g) == 0:
			_aktivieren(n, m, g)
		else:
			rest = K.offener_betrag(m, g)
			_melden(m["nutzerId"], "Einzahlung eingegangen", f"Wir haben {_eur(e['betragEur'])} € verbucht.{f' Offen: {_eur(rest)} €.' if rest else ''}", LINK_GENO, m["id"])
	elif akt in ("zeichnungZulassen", "zeichnungAblehnen"):
		z = next((x for x in m.get("zeichnungen") or [] if x["id"] == d.get("zeichnungId") and x["status"] == "beantragt"), None)
		if not z:
			konflikt("Keine offene Zeichnung gefunden.")
		if akt == "zeichnungZulassen":
			if m["anteile"] + z["anteile"] > g["maxAnteile"]:
				konflikt(f"Höchstzahl von {g['maxAnteile']} Anteilen würde überschritten.")
			z["status"] = "zugelassen"
			z["zugelassenAm"] = jetzt_iso()
			m["anteile"] += z["anteile"]
			_verlauf(m, n, f"{z['anteile']} weitere Anteile zugelassen – Einzahlung offen")
			_melden(m["nutzerId"], "Weitere Anteile zugelassen", f"{z['anteile']} weitere Anteile sind zugelassen. Bitte zahlen Sie {_eur(z['betragEur'])} € ein (Verwendungszweck {K.verwendungszweck(m)}).", LINK_GENO, m["id"])
		else:
			z["status"] = "abgelehnt"
			_verlauf(m, n, "Zeichnung weiterer Anteile nicht zugelassen")
			_melden(m["nutzerId"], "Weitere Anteile nicht zugelassen", "Der Vorstand hat die Zeichnung weiterer Anteile nicht zugelassen.", LINK_GENO, m["id"])
	elif akt in ("kuendigungBestaetigen", "kuendigungVollziehen", "auszahlung"):
		k = next((x for x in m.get("kuendigungen") or [] if x["id"] == d.get("kuendigungId")), None)
		if not k:
			nicht_gefunden("Kündigung nicht gefunden.")
		if akt == "kuendigungBestaetigen":
			if k["status"] != "eingereicht":
				konflikt("Die Kündigung ist bereits bestätigt.")
			k["status"] = "bestaetigt"
			k["bestaetigtAm"] = jetzt_iso()
			_verlauf(m, n, f"Kündigung zum {_datum_de(k['wirksamZum'])} bestätigt")
			bis = f" Das Auseinandersetzungsguthaben wird bis {_datum_de(k['auszahlungBis'])} ausgezahlt." if k.get("auszahlungBis") else ""
			_melden(m["nutzerId"], "Kündigung bestätigt", f"Ihre Kündigung wird zum {_datum_de(k['wirksamZum'])} wirksam.{bis}", LINK_GENO, m["id"])
		elif akt == "kuendigungVollziehen":
			if k["status"] != "bestaetigt":
				konflikt("Vollzogen werden kann nur eine bestätigte Kündigung.")
			if h < k["wirksamZum"]:
				konflikt(f"Die Kündigung wird erst zum {_datum_de(k['wirksamZum'])} wirksam.")
			k["betragEur"] = K.auseinandersetzung(m, g, k["anteile"])
			k["status"] = "wirksam"
			m["anteile"] -= k["anteile"]
			m["eingezahltEur"] = K.rund2(m["eingezahltEur"] - min(k["betragEur"], m["eingezahltEur"]))
			if k["art"] == "voll" or m["anteile"] <= 0:
				m["status"] = "ausgeschieden"
				m["ausgeschiedenAm"] = k["wirksamZum"]
			_verlauf(m, n, f"Kündigung wirksam – Auseinandersetzungsguthaben {_eur(k['betragEur'])} €")
			_melden(m["nutzerId"], "Kündigung wirksam", f"Ihre Kündigung ist wirksam. Auseinandersetzungsguthaben: {_eur(k['betragEur'])} € (vorbehaltlich des festgestellten Jahresabschlusses).", LINK_GENO, m["id"])
		else:
			if k["status"] != "wirksam":
				konflikt("Ausgezahlt wird nach Wirksamkeit der Kündigung.")
			k["status"] = "ausgezahlt"
			k["ausgezahltAm"] = K.datum(d.get("am")) or h
			_verlauf(m, n, f"Auseinandersetzungsguthaben {_eur(k['betragEur'])} € ausgezahlt")
			_melden(m["nutzerId"], "Auszahlung veranlasst", f"Ihr Auseinandersetzungsguthaben von {_eur(k['betragEur'])} € wurde an Ihr hinterlegtes Konto überwiesen.", LINK_GENO, m["id"])
	else:
		ungueltig("Unbekannte Aktion.")
	_m_speichern(doc, m)
	protokoll(n, "aendern", "mitglied", doc.name, f"Backoffice: {akt}", v.text(ip, 64))
	return _m_ausgabe(_m(doc), admin=True)


@frappe.whitelist(methods=["POST"])
def bo_gv_speichern(id=None, genoId=None, daten=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	k = v.kennung(id)
	alt = None
	if k:
		if not frappe.db.exists(DT_GV, k):
			nicht_gefunden("Versammlung nicht gefunden.")
		alt = frappe.get_doc(DT_GV, k, for_update=True)
		if alt.status != "entwurf":
			konflikt("Nach der Einladung können Tagesordnung und Termin nicht mehr geändert werden – ggf. absagen und neu einladen.")
	g = _geno_laden(alt.genossenschaft if alt else v.kennung(genoId))
	gv = _fach(K.versammlung_bereinigen, daten or {}, g)
	if alt:
		_gv_speichern(alt, {**_gv(alt), **gv, "status": "entwurf"})
		protokoll(n, "aendern", "generalversammlung", alt.name, f"Versammlung „{gv['titel']}“ geändert")
		return _gv_ausgabe(_gv(alt), admin=True)
	doc = frappe.get_doc({"doctype": DT_GV, "genossenschaft": g["id"], "titel": gv["titel"], "status": "entwurf", "datum": gv["datum"]})
	doc.daten = als_json({x: y for x, y in gv.items() if x not in ("titel", "datum")})
	doc.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "generalversammlung", doc.name, f"Versammlung „{gv['titel']}“ angelegt")
	return _gv_ausgabe(_gv(doc), admin=True)


@frappe.whitelist(methods=["POST"])
def bo_gv_aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_GV, k):
		nicht_gefunden("Versammlung nicht gefunden.")
	doc = frappe.get_doc(DT_GV, k, for_update=True)
	gv = _gv(doc)
	g = _geno_laden(gv["genoId"])
	aktiv = _alle_m({"genossenschaft": g["id"], "status": ["in", K.MITGLIED_AKTIV]})
	link = f"/portal/beteiligung/versammlung/{gv['id']}"
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	if akt == "einladen":
		_fach(K.einladung_pruefen, gv, g, _heute())
		gv["status"] = "eingeladen"
		gv["eingeladenAm"] = jetzt_iso()
		gv["eingeladen"] = len(aktiv)
		for m in aktiv:
			_melden(m["nutzerId"], f"Einladung: {gv['titel']}", f"Die {g['name']} lädt Sie zur Versammlung am {_datum_de(gv['datum'])} um {gv['datum'][11:16]} Uhr ein. Tagesordnung und Unterlagen finden Sie im Portal.", link, gv["id"])
	elif akt == "oeffnen":
		if gv["status"] != "eingeladen":
			konflikt("Geöffnet werden kann die Abstimmung nach der Einladung.")
		if gv.get("form") not in K.ONLINE_FORMEN:
			konflikt("Bei einer reinen Präsenzversammlung wird im Saal abgestimmt – Ergebnis beim Abschluss eintragen.")
		if not any(t.get("beschluss") for t in gv.get("tagesordnung") or []):
			konflikt("Die Tagesordnung enthält keine Beschlusspunkte.")
		gv["status"] = "abstimmung"
		gv["eroeffnetAm"] = jetzt_iso()
		for m in aktiv:
			_melden(m["nutzerId"], f"Abstimmung geöffnet: {gv['titel']}", "Sie können jetzt online abstimmen.", link, gv["id"])
	elif akt == "abschliessen":
		if gv["status"] not in ("eingeladen", "abstimmung"):
			konflikt("Abgeschlossen werden kann eine eingeladene Versammlung.")
		stimmen = _stimmen(gv["id"])
		x = _fach(K.abschluss_bereinigen, d, gv, len(aktiv), len(stimmen))
		gv["ergebnis"] = K.ergebnis_rechnen(gv, stimmen, len(aktiv), {"anwesend": x["anwesend"], "tops": x["tops"]})
		gv["protokoll"] = {"versammlungsleiter": x["versammlungsleiter"], "protokollfuehrer": x["protokollfuehrer"], "notiz": x["notiz"], "erstelltAm": jetzt_iso(), "hash": hashlib.sha256(K.stimmen_kanonisch(gv["id"], stimmen).encode()).hexdigest(), "anzahlStimmzettel": len(stimmen)}
		gv["status"] = "abgeschlossen"
		gv["abgeschlossenAm"] = jetzt_iso()
		for m in aktiv:
			_melden(m["nutzerId"], f"Ergebnis: {gv['titel']}", "Die Versammlung ist abgeschlossen. Ergebnis und Protokoll stehen im Portal bereit.", link, gv["id"])
	elif akt == "absagen":
		if gv["status"] in ("abgeschlossen", "abgesagt"):
			konflikt("Die Versammlung ist bereits abgeschlossen bzw. abgesagt.")
		grund = v.text(d.get("grund"), 300)
		if len(grund) < 5:
			ungueltig("Bitte geben Sie einen Grund für die Absage an.")
		war = gv["status"] != "entwurf"
		gv["status"] = "abgesagt"
		gv["absageGrund"] = grund
		if war:
			for m in aktiv:
				_melden(m["nutzerId"], f"Abgesagt: {gv['titel']}", f"Die Versammlung wurde abgesagt. Grund: {grund}", link, gv["id"])
	else:
		ungueltig("Unbekannte Aktion.")
	_gv_speichern(doc, gv)
	protokoll(n, "aendern", "generalversammlung", doc.name, f"Versammlung: {akt}", v.text(ip, 64))
	return _gv_ausgabe(_gv(doc), admin=True)


def _berechtigte(g, a):
	umsatz = {}
	if a["art"] == "rueckverguetung":
		for r in frappe.get_all(DT_EA, filters={"monat": ["like", f"{a['geschaeftsjahr']}-%"]}, fields=["konto_id", "daten"], limit_page_length=100000):
			umsatz[r.konto_id] = umsatz.get(r.konto_id, 0) + flt((aus_json(r.daten, {}) or {}).get("bezugGemeinschaftKwh"))
	out = []
	for m in _alle_m({"genossenschaft": g["id"], "status": "aktiv"}):
		if m.get("aktivSeit") and m["aktivSeit"] <= a["stichtag"]:
			out.append({"mitgliedId": m["id"], "nutzerId": m["nutzerId"], "nr": m.get("nr"), "name": _anzeige_name(m), "land": g["land"], "freistellung": bool((m.get("beitritt") or {}).get("freistellung")), "guthabenEur": K.geschaeftsguthaben(m, g), "umsatzKwh": umsatz.get(m["nutzerId"], 0) if m["nutzerId"] else 0})
	return out


@frappe.whitelist(methods=["POST"])
def bo_ausschuettung_anlegen(genoId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	g = _geno_laden(v.kennung(genoId))
	a = _fach(K.ausschuettung_bereinigen, daten or {}, _heute())
	if frappe.get_all(DT_AU, filters={"genossenschaft": g["id"], "geschaeftsjahr": a["geschaeftsjahr"], "art": a["art"], "status": ["!=", "entwurf"]}, limit_page_length=1):
		konflikt(f"Für {a['geschaeftsjahr']} ist bereits eine {K.AUSSCHUETTUNG_ARTEN[a['art']]} beschlossen.")
	for x in frappe.get_all(DT_AU, filters={"genossenschaft": g["id"], "geschaeftsjahr": a["geschaeftsjahr"], "art": a["art"], "status": "entwurf"}, pluck="name"):
		frappe.delete_doc(DT_AU, x, ignore_permissions=True, force=True)
	r = K.ausschuettung_berechnen(a, _berechtigte(g, a), g)
	if not r["anzahl"]:
		konflikt("Keine berechtigten Mitglieder bzw. keine Bemessungsgrundlage für diesen Stichtag.")
	doc = frappe.get_doc({"doctype": DT_AU, "genossenschaft": g["id"], "geschaeftsjahr": a["geschaeftsjahr"], "art": a["art"], "status": "entwurf"})
	doc.daten = als_json({**{x: y for x, y in a.items() if x not in ("geschaeftsjahr", "art")}, **r, "erstelltAm": jetzt_iso(), "vonId": n.id})
	doc.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "ausschuettung", doc.name, f"{K.AUSSCHUETTUNG_ARTEN[a['art']]} {a['geschaeftsjahr']} berechnet ({r['anzahl']} Mitglieder)")
	return {**_aus(doc), "artLabel": K.AUSSCHUETTUNG_ARTEN[a["art"]]}


@frappe.whitelist(methods=["POST"])
def bo_ausschuettung_aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_AU, k):
		nicht_gefunden("Ausschüttung nicht gefunden.")
	doc = frappe.get_doc(DT_AU, k, for_update=True)
	a = _aus(doc)
	g = _geno_laden(a["genoId"])
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	if akt == "beschliessen":
		if a["status"] != "entwurf":
			konflikt("Bereits beschlossen.")
		bd = K.datum(d.get("beschlussDatum"))
		if not bd:
			ungueltig("Bitte geben Sie das Datum des Beschlusses der Generalversammlung an (Gewinnverwendung).")
		if bd > _heute():
			ungueltig("Das Beschlussdatum liegt in der Zukunft.")
		gvk = v.kennung(d.get("gvId"))
		if gvk and not frappe.db.exists(DT_GV, {"name": gvk, "genossenschaft": g["id"], "status": "abgeschlossen"}):
			ungueltig("Die angegebene Versammlung ist nicht abgeschlossen.")
		a.update({"status": "beschlossen", "beschlussDatum": bd, "gvId": gvk or None})
	elif akt == "auszahlen":
		if a["status"] != "beschlossen":
			konflikt("Ausgezahlt wird nach dem Beschluss der Generalversammlung.")
		a["status"] = "ausgezahlt"
		a["ausgezahltAm"] = K.datum(d.get("am")) or _heute()
		for p in a.get("positionen") or []:
			_melden(p.get("nutzerId"), f"{'Dividende' if a['art'] == 'dividende' else 'Rückvergütung'} {a['geschaeftsjahr']}", f"Die {g['name']} hat {_eur(p['nettoEur'])} € an Ihr hinterlegtes Konto überwiesen. Die Mitteilung steht im Portal.", LINK_GENO, a["id"])
	elif akt == "verwerfen":
		if a["status"] != "entwurf":
			konflikt("Nur Entwürfe können verworfen werden.")
		frappe.delete_doc(DT_AU, k, ignore_permissions=True, force=True)
		protokoll(n, "loeschen", "ausschuettung", k, "Entwurf verworfen", v.text(ip, 64))
		return {"ok": True, "verworfen": True}
	else:
		ungueltig("Unbekannte Aktion.")
	_aus_speichern(doc, a)
	protokoll(n, "aendern", "ausschuettung", k, f"Ausschüttung: {akt}", v.text(ip, 64))
	return {**_aus(doc), "artLabel": K.AUSSCHUETTUNG_ARTEN[a["art"]]}


# ================================================================ Backoffice: Energiegemeinschaften


@frappe.whitelist(methods=["POST"])
def bo_eg(als_benutzer=None):
	n = nutzer(als_benutzer)
	_bo_lesen_noetig(n)
	return {"heute": _heute(), "darfSchreiben": stufe(n, BEREICH) >= 2, "gemeinschaften": [_eg_ausgabe(_eg(frappe.get_doc(DT_EG, x)), admin=True) for x in frappe.get_all(DT_EG, pluck="name", order_by="creation asc", limit_page_length=200)]}


@frappe.whitelist(methods=["POST"])
def bo_eg_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	g = _fach(K.gemeinschaft_bereinigen, daten or {})
	rest = {k: x for k, x in g.items() if k not in ("name", "land", "form", "status")}
	k = v.kennung(id)
	if k:
		doc = _eg_laden(k)
		if (doc.land != g["land"] or doc.form != g["form"]) and frappe.db.exists(DT_ET, {"gemeinschaft": k, "status": ["!=", "abgelehnt"]}):
			konflikt("Land und Form können nach dem ersten Beitritt nicht mehr geändert werden.")
		alt = aus_json(doc.daten, {}) or {}
		doc.update({"titel": g["name"], "land": g["land"], "form": g["form"], "status": g["status"], "daten": als_json({**rest, "laeufe": alt.get("laeufe") or []})})
		doc.save(ignore_permissions=True)
		protokoll(n, "aendern", "energiegemeinschaft", doc.name, f"Gemeinschaft {g['name']} geändert")
	else:
		doc = frappe.get_doc({"doctype": DT_EG, "titel": g["name"], "land": g["land"], "form": g["form"], "status": g["status"], "daten": als_json({**rest, "laeufe": []})})
		doc.insert(ignore_permissions=True)
		protokoll(n, "anlegen", "energiegemeinschaft", doc.name, f"Gemeinschaft {g['name']} angelegt")
	return _eg_ausgabe(_eg(doc), admin=True)


@frappe.whitelist(methods=["POST"])
def bo_teilnahme_aktion(id=None, daten=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	tid = v.kennung(id)
	if not tid or not frappe.db.exists(DT_ET, tid):
		nicht_gefunden("Teilnahme nicht gefunden.")
	doc = frappe.get_doc(DT_ET, tid, for_update=True)
	t = _t(doc)
	eg = _eg(frappe.get_doc(DT_EG, t["egId"]))
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	if akt == "anmelden":
		if t["status"] != "beantragt":
			konflikt("Angemeldet werden kann ein beantragter Beitritt.")
		t["status"] = "angemeldet"
		t["angemeldetAm"] = jetzt_iso()
		_verlauf(t, n, "Beim Netzbetreiber angemeldet (Zuordnung des Zählpunkts über EDA) – Freigabe der Viertelstundenwerte nötig" if eg["land"] == "AT" else "Beim Netz- bzw. Messstellenbetreiber angemeldet")
		_melden(t["nutzerId"], "Anmeldung beim Netzbetreiber", f"Ihr Zählpunkt wurde für „{eg['name']}“ angemeldet. Bitte bestätigen Sie die Datenfreigabe im Webportal Ihres Netzbetreibers." if eg["land"] == "AT" else f"Ihre Teilnahme an „{eg['name']}“ wurde beim Netzbetreiber angemeldet.", LINK_EG, tid)
	elif akt == "aktivieren":
		if t["status"] != "angemeldet":
			konflikt("Aktiviert wird nach der Anmeldung beim Netzbetreiber.")
		if eg["status"] != "aktiv":
			konflikt("Die Gemeinschaft ist noch nicht aktiv.")
		t["ab"] = K.datum(d.get("ab")) or _heute()
		t["status"] = "aktiv"
		_verlauf(t, n, f"Teilnahme aktiv ab {_datum_de(t['ab'])}")
		_melden(t["nutzerId"], "Energiegemeinschaft aktiv", f"Ab {_datum_de(t['ab'])} teilen Sie Strom in „{eg['name']}“. Die Abrechnung erhalten Sie monatlich im Portal.", LINK_EG, tid)
	elif akt == "ablehnen":
		if t["status"] not in ("beantragt", "angemeldet"):
			konflikt("Abgelehnt werden kann nur ein offener Beitritt.")
		grund = v.text(d.get("grund"), 300)
		if len(grund) < 5:
			ungueltig("Bitte geben Sie eine kurze Begründung an (z. B. Zählpunkt außerhalb des Netzgebiets).")
		t["status"] = "abgelehnt"
		t["grund"] = grund
		_verlauf(t, n, f"Nicht aufgenommen: {grund}")
		_melden(t["nutzerId"], "Energiegemeinschaft: nicht aufgenommen", f"Ihr Beitritt zu „{eg['name']}“ ist nicht möglich. Begründung: {grund}", LINK_EG, tid)
	elif akt == "beenden":
		if t["status"] not in ("aktiv", "angemeldet"):
			konflikt("Nur laufende Teilnahmen können beendet werden.")
		t["bis"] = K.datum(d.get("bis")) or t.get("bis") or _heute()
		t["status"] = "beendet"
		_verlauf(t, n, f"Teilnahme beendet zum {_datum_de(t['bis'])}")
		_melden(t["nutzerId"], "Energiegemeinschaft beendet", f"Ihre Teilnahme an „{eg['name']}“ endet zum {_datum_de(t['bis'])}.", LINK_EG, tid)
	else:
		ungueltig("Unbekannte Aktion.")
	_t_speichern(doc, t)
	protokoll(n, "aendern", "eg_teilnahme", tid, f"Teilnahme: {akt}", v.text(ip, 64))
	return _t_ausgabe(_t(doc), admin=True)


@frappe.whitelist(methods=["POST"])
def bo_eg_abrechnen(egId=None, monat=None, messwerte=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_bo_schreiben_noetig(n)
	egdoc = frappe.get_doc(DT_EG, v.kennung(egId), for_update=True) if v.kennung(egId) and frappe.db.exists(DT_EG, v.kennung(egId)) else nicht_gefunden("Gemeinschaft nicht gefunden.")
	eg = _eg(egdoc)
	mon = K.monat(monat)
	if not mon:
		ungueltig("Bitte wählen Sie den Abrechnungsmonat (JJJJ-MM).")
	if mon >= _heute()[:7]:
		ungueltig("Abgerechnet werden nur abgeschlossene Monate.")
	laeufe = eg.get("laeufe") or []
	if any(l["monat"] == mon for l in laeufe):
		konflikt(f"Der Monat {mon} ist für diese Gemeinschaft bereits abgerechnet.")
	mw = K.messwerte_bereinigen(messwerte or {})
	ende = K.teilnahme_ende(f"{mon}-01")
	tn = []
	for x in frappe.get_all(DT_ET, filters={"gemeinschaft": eg["id"], "status": ["in", ["aktiv", "beendet"]]}, pluck="name", limit_page_length=5000):
		t = _t(frappe.get_doc(DT_ET, x))
		if t.get("ab") and t["ab"] <= ende and (t["status"] == "aktiv" or (t.get("bis") and t["bis"] >= f"{mon}-01")):
			tn.append(t)
	if not tn:
		konflikt("Im Monat gab es keine aktiven Teilnehmer.")
	r = _fach(K.monatsabrechnung, eg, mon, [{"id": t["id"], "nutzerId": t["nutzerId"], "name": t.get("name") or _name_konto(t["nutzerId"]), "stamm": t.get("stamm"), "anteilPct": t.get("anteilPct"), "messwerte": mw.get(t["id"])} for t in tn])
	lauf = {"id": _kennung("EL"), "egId": eg["id"], "monat": mon, "erzeugungKwh": r["erzeugungKwh"], "geteiltKwh": r["geteiltKwh"], "ueberschussKwh": r["ueberschussKwh"], "summe": r["summe"], "geschaetzt": r["geschaetzt"], "anzahl": len(r["positionen"]), "am": jetzt_iso(), "vonId": n.id}
	daten = aus_json(egdoc.daten, {}) or {}
	daten["laeufe"] = (daten.get("laeufe") or []) + [lauf]
	egdoc.daten = als_json(daten)
	egdoc.save(ignore_permissions=True)
	for p in r["positionen"]:
		a = frappe.get_doc({"doctype": DT_EA, "gemeinschaft": eg["id"], "teilnahme": p["teilnahmeId"], "konto_id": p.get("nutzerId") or None, "monat": mon, "daten": als_json({**p, "laufId": lauf["id"], "am": jetzt_iso()})})
		a.insert(ignore_permissions=True)
		if p.get("nutzerId"):
			_melden(p["nutzerId"], f"Energiegemeinschaft: Abrechnung {mon[5:]}/{mon[:4]}", f"Geteilter Strom {p['bezugGemeinschaftKwh']} kWh, Saldo {_eur(p['saldoEur'])} €{' (geschätzt)' if p['geschaetzt'] else ''}.", LINK_EG, a.name)
	protokoll(n, "anlegen", "eg_abrechnung", lauf["id"], f"Monatslauf {eg['name']} {mon} ({len(r['positionen'])} Teilnehmer)")
	return lauf
