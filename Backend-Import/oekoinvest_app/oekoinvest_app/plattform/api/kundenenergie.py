# Copyright (c) 2026, ÖkoInvest GmbH
#
# Kundenseite Energie (Team 4: Contracting-Kunde, Reststrom-Kunde, Energieversorger) – docs/API.md, Abschnitt
# „Kundenseite Energie“. Referenz: src/lib/plattform/backend/demo/kundenenergie.js; Regeln: plattform/kundenenergie_kern.py.
#
# Rechte (jede Methode prüft Rolle UND Eigentum selbst):
#   Kunde      – Rolle „unternehmen“: eigene Anliegen (Konto bzw. Organisation der Rechnung/Anlage; Einreichen/Annehmen nur Konto
#                oder Teamrolle mit Schreibrecht), eigene Lieferantenwechsel, eigener Kostenbericht
#   Lieferant  – Rolle „lieferant“ des bezuschlagten Versorgers: Vertragsdaten und Wechsel NUR dieser Ausschreibung
#   Backoffice – Anliegen: Bereich „finanzen“ (lesen ≥ 1, entscheiden = 2); Wechsel: Bereich „energie“
#
# Folgeaktionen: Einspruch → Mahnsperre (daten.mahnsperre der Plattform Abrechnung, finanzen/logik.mahnhinweis), bei (Teil-)Stattgabe
# Klärfall; Kündigung bestätigt → Contracting-Vertrag „gekuendigt“; Angebot angenommen → Aufgabe; Wechsel „lieferbeginn“ → neuer
# Vertrag aktiv, Altvertrag beendet. Jede Statusänderung benachrichtigt die Gegenseite (Glocke, E-Mail ohne Inhalte).

import frappe
from frappe.utils import cint, flt, nowdate

from oekoinvest_app.plattform import kundenenergie_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt, konflikt, kurz, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.konstanten import PRAEFIX
from oekoinvest_app.plattform.organisation import darf_team_schreiben, team_rolle
from oekoinvest_app.plattform.rechte import stufe

PRAEFIX.update({"Plattform Kundenanliegen": "KN", "Plattform Lieferantenwechsel": "LW"})

KN = "Plattform Kundenanliegen"
LW = "Plattform Lieferantenwechsel"
AB = "Plattform Abrechnung"
EV = "Plattform Energie Vertrag"
AU = "Plattform Ausschreibung"
LA = "Plattform Lieferantenangebot"
LF = "Plattform Lieferant"
MAIL_KUNDE = "Zu Ihrem Anliegen gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest."
MAIL_WECHSEL = "Zu Ihrem Lieferantenwechsel gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest."


# ================================================================ Grundlagen


def _heute():
	return nowdate()


def _fin_lesen(n):
	return ist_admin(n) and stufe(n, "finanzen") >= 1


def _fin_schreiben(n):
	return ist_admin(n) and stufe(n, "finanzen") >= 2


def _en_lesen(n):
	return ist_admin(n) and stufe(n, "energie") >= 1


def _en_schreiben(n):
	return ist_admin(n) and stufe(n, "energie") >= 2


def _fach(fn, *a, **kw):
	try:
		return fn(*a, **kw)
	except K.FachFehler as e:
		if e.status == 403:
			verboten(e.text)
		if e.status == 409:
			konflikt(e.text)
		ungueltig(e.text)


def _daten(d):
	return aus_json(d, {}) if isinstance(d, str) else (d or {})


def _tag(iso_):
	return ".".join(reversed(str(iso_)[:10].split("-"))) if iso_ else "–"


def _eur(x):
	return f"{flt(x):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".") if x is not None else "–"


def _admins_mit(bereich, mindest=1):
	erg = []
	for name in aktive_admins():
		k = frappe.db.get_value("Plattform Konto", name, ["name", "backoffice_rollen"], as_dict=True)
		if k and stufe(frappe._dict(rollen=["admin"], backofficeRollen=k.backoffice_rollen or ""), bereich) >= mindest:
			erg.append(k)
	return erg


def _zustaendig(bereich, unterrolle):
	liste = _admins_mit(bereich, 2)
	for k in liste:
		if unterrolle in str(k.backoffice_rollen or "").split(","):
			return k.name
	return liste[0].name if liste else None


def _aufgabe(titel, beschreibung, faellig, zustaendig):
	if not zustaendig:
		return
	frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(titel, 160), "beschreibung": v.mehrzeilig(beschreibung, 2000), "faellig_am": faellig, "zustaendig_id": zustaendig, "status": "offen"}).insert(ignore_permissions=True)


# ================================================================ Anliegen


def _zugriff(n, a):
	if not n or not a:
		return None
	if _fin_lesen(n):
		return "backoffice"
	if a.kunde_id == n.id:
		return "kunde"
	r = team_rolle(n.id, a.organisation_id) if a.organisation_id else None
	if r:
		return "team-schreiben" if darf_team_schreiben(r) else "team-lesen"
	return None


def _anliegen_json(n, a):
	zg = _zugriff(n, a)
	bo = zg == "backoffice"
	kunde_darf = zg in ("kunde", "team-schreiben")
	aktionen = (K.erlaubte_aktionen(a.art, a.status, "bo") if _fin_schreiben(n) else []) if bo else (K.erlaubte_aktionen(a.art, a.status, "kunde") if kunde_darf else [])
	d = aus_json(a.daten, {}) or {}
	st = K.ANLIEGEN_STATUS.get(a.status, {})
	k = kurz(a.kunde_id) or {}
	ziel = str(a.ziel_am or "")
	return {
		"id": a.name, "art": a.art, "artLabel": K.ANLIEGEN_ARTEN.get(a.art, {}).get("label", a.art), "status": a.status, "statusLabel": st.get("label", a.status), "ton": st.get("ton", "neutral"),
		"offen": a.status in K.ANLIEGEN_OFFEN, "eingereichtAm": iso(a.eingereicht_am), "zielAm": ziel, "entschiedenAm": iso(a.entschieden_am),
		"ueberfaellig": a.status in K.ANLIEGEN_OFFEN and a.status != "angebot" and bool(ziel) and ziel < _heute(),
		"anlageId": a.anlage_id, "anlageName": d.get("anlageName", ""), "belegId": a.beleg_id, "belegNummer": d.get("belegNummer", ""), "belegBrutto": d.get("belegBrutto"), "belegZeitraum": d.get("belegZeitraum"),
		"grund": a.grund or "", "grundLabel": K.EINSPRUCH_GRUENDE.get(a.grund or "", ""), "text": a.text or "", "betragStrittigEur": flt(a.betrag_strittig) or None,
		"wunschJahre": cint(a.wunsch_jahre) or None, "wunschTermin": str(a.wunsch_termin or ""), "wirksamZum": str(a.wirksam_zum or ""), "stichtag": str(a.stichtag or ""),
		"angebot": aus_json(a.angebot, None), "begruendung": a.begruendung or "", "korrekturEur": flt(a.korrektur_eur) or None, "klaerfallId": a.klaerfall_id if bo else None,
		"kunde": {"id": a.kunde_id, "name": name_von(a.kunde_id), "firma": k.get("firma", "")},
		"verlauf": aus_json(a.verlauf, []) or [], "aktionen": [{"id": x, "label": K.AKTION_LABEL[x]} for x in aktionen], "meinZugriff": zg,
	}


def _kunde_melden(a, titel, text):
	empf = {a.kunde_id} if a.kunde_id else set()
	if a.organisation_id:
		empf |= set(frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": a.organisation_id}, pluck="nutzer_id", limit_page_length=0))
	for konto in empf:
		benachrichtigen(konto, "abrechnung", titel, text, f"/portal/anliegen#{a.name}", "kundenanliegen", a.name, mail_text=MAIL_KUNDE, mail_betreff=f"{K.ANLIEGEN_ARTEN[a.art]['kurz']}: {K.ANLIEGEN_STATUS[a.status]['label']} – ÖkoInvest")


def _bo_melden(a, titel, text):
	for k in _admins_mit("finanzen"):
		benachrichtigen(k.name, "aufgabe", titel, text, f"/portal/admin/finanzen/anliegen#{a.name}", "kundenanliegen", a.name, mail=False)


def _verlauf(a, wer, text):
	vl = aus_json(a.verlauf, []) or []
	vl.append({"am": iso(jetzt()), "wer": wer, "text": v.text(text, 400)})
	a.verlauf = als_json(vl[-100:])


def _beleg(n, beleg_id):
	from oekoinvest_app.plattform.finanzen import abrechnung as FA

	k = v.kennung(beleg_id)
	if not k or not frappe.db.exists(AB, k):
		nicht_gefunden("Rechnung nicht gefunden.")
	doc = frappe.get_doc(AB, k)
	eigen = doc.empfaenger_id == n.id
	r = team_rolle(n.id, doc.organisation_id) if doc.organisation_id else None
	if not eigen and not r:
		verboten("Diese Rechnung gehört nicht zu Ihrem Konto.")
	if not eigen and not darf_team_schreiben(r):
		verboten("Ihre Teamrolle erlaubt nur das Lesen.")
	return doc, FA.beleg_dict(doc)


def _anlage_mit_vertrag(n, anlage_id):
	from oekoinvest_app.plattform.api import anlagen as AN

	a = AN.anlage_laden(n, anlage_id)
	zg = AN.zugriff(n, a)
	if zg not in ("kunde", "team-schreiben"):
		verboten("Ihre Teamrolle erlaubt nur das Lesen.")
	c = AN._vertrag(a.name)
	return a, (AN.vertrag_json(c) if c else None), c


@frappe.whitelist(methods=["POST"])
def anliegen_liste(status="alle", als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _fin_lesen(n) and "unternehmen" not in (n.get("rollen") or []):
		verboten()
	filters = {"status": ["in", K.ANLIEGEN_OFFEN]} if status == "offen" else {}
	if not _fin_lesen(n):
		orgs = frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": n.id}, pluck="organisation_id")
		namen = set(frappe.get_all(KN, filters={**filters, "kunde_id": n.id}, pluck="name", limit_page_length=0))
		if orgs:
			namen |= set(frappe.get_all(KN, filters={**filters, "organisation_id": ["in", orgs]}, pluck="name", limit_page_length=0))
		zeilen = [frappe.get_doc(KN, x) for x in namen]
	else:
		zeilen = [frappe.get_doc(KN, x) for x in frappe.get_all(KN, filters=filters, pluck="name", order_by="eingereicht_am desc", limit_page_length=300)]
	zeilen = [a for a in zeilen if _zugriff(n, a)]
	zeilen.sort(key=lambda a: str(a.eingereicht_am or ""), reverse=True)
	return [_anliegen_json(n, a) for a in zeilen[:300]]


@frappe.whitelist(methods=["POST"])
def anliegen_auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Anliegen reichen Contracting-Kunden ein.")
	from oekoinvest_app.plattform.api import anlagen as AN
	from oekoinvest_app.plattform.api import finanzen as FI

	abr = FI.meine(als_benutzer=n.id)
	belege = [{"id": b["id"], "nummer": b["nummer"], "titel": b["titel"], "zeitraum": b["zeitraum"], "brutto": b["brutto"], "status": b["status"], "anlageId": (b.get("bezug") or {}).get("anlageId")} for b in abr["contracting"]["belege"] if b["beleg"] == "rechnung"][:24]
	anlagen = []
	for x in AN.liste(als_benutzer=n.id)[:40]:
		c = AN._vertrag(x["id"])
		vt = AN.vertrag_json(c) if c else None
		anlagen.append({"id": x["id"], "name": x["name"], "ort": x.get("ort", ""), "meinZugriff": x.get("meinZugriff"),
			"vertrag": {"status": vt["status"], "ende": vt["ende"], "kuendigungsfristMonate": vt["kuendigungsfristMonate"], "endschaft": vt.get("endschaft", ""), "kaufoptionEur": vt.get("kaufoptionEur"), "kuendigung": K.kuendigung_contracting(vt, _heute())} if vt else None})
	return {"belege": belege, "anlagen": anlagen, "gruende": K.EINSPRUCH_GRUENDE}


@frappe.whitelist(methods=["POST"])
def anliegen_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Anliegen reichen Contracting-Kunden ein.")
	d = _daten(daten)
	art = d.get("art") if d.get("art") in K.ANLIEGEN_ARTEN else ""
	if not art:
		ungueltig("Bitte wählen Sie die Art des Anliegens.")
	beleg_doc = beleg = anlage = vertrag = None
	if art == "einspruch":
		beleg_doc, beleg = _beleg(n, d.get("belegId"))
	else:
		anlage, vertrag, _c = _anlage_mit_vertrag(n, d.get("anlageId"))
	g = _fach(K.anliegen_pruefen, art, d, beleg=beleg, vertrag=vertrag, heute=_heute())
	offen_filter = {"art": art, "status": ["in", K.ANLIEGEN_OFFEN], **({"beleg_id": beleg_doc.name} if beleg_doc else {"anlage_id": anlage.name})}
	if frappe.db.exists(KN, offen_filter):
		konflikt(f"Zu {'dieser Rechnung' if beleg_doc else 'dieser Anlage'} ist bereits ein Anliegen dieser Art offen.")
	if frappe.db.count(KN, {"kunde_id": n.id, "status": ["in", K.ANLIEGEN_OFFEN]}) >= 30:
		konflikt("Höchstens 30 offene Anliegen je Konto.")
	t = jetzt()
	anlage_id = (beleg or {}).get("bezug", {}).get("anlageId") if beleg_doc else anlage.name
	anlage_name = frappe.db.get_value("Plattform Anlage", anlage_id, "titel") if anlage_id else ""
	a = frappe.get_doc({
		"doctype": KN, "art": art, "status": "eingereicht", "kunde_id": n.id,
		"organisation_id": (beleg_doc.organisation_id if beleg_doc else anlage.organisation_id) or None, "anlage_id": anlage_id or None, "beleg_id": beleg_doc.name if beleg_doc else None,
		"grund": g["grund"] or None, "text": g["text"], "betrag_strittig": g["betragStrittigEur"], "wunsch_jahre": g["wunschJahre"], "wunsch_termin": g["wunschTermin"] or None,
		"wirksam_zum": g["wirksamZum"] or None, "stichtag": g["stichtag"] or None, "eingereicht_am": t, "ziel_am": K.ziel_datum(art, _heute()),
		"daten": als_json({"anlageName": anlage_name or "", "belegNummer": (beleg or {}).get("nummer", ""), "belegBrutto": (beleg or {}).get("brutto"), "belegZeitraum": (beleg or {}).get("zeitraum")}),
		"verlauf": als_json([{"am": iso(t), "wer": "kunde", "text": f"{K.ANLIEGEN_ARTEN[art]['label']} eingereicht von {name_von(n.id)}"}]),
	})
	frappe.flags.kundenenergie_api = True
	try:
		a.insert(ignore_permissions=True)
		if beleg_doc:
			bd = aus_json(beleg_doc.daten, {}) or {}
			bd["mahnsperre"] = {"anliegenId": a.name, "seit": iso(t), "grund": "Einspruch in Prüfung"}
			frappe.db.set_value(AB, beleg_doc.name, "daten", als_json(bd))
			_verlauf(a, "system", f"Mahnsperre für Rechnung {beleg['nummer']} gesetzt, solange der Einspruch geprüft wird")
			a.save(ignore_permissions=True)
	finally:
		frappe.flags.kundenenergie_api = False
	kurztext = f"{K.ANLIEGEN_ARTEN[art]['kurz']}: {(kurz(n.id) or {}).get('firma') or name_von(n.id)} · {(beleg or {}).get('nummer') or anlage_name}"
	_aufgabe(kurztext, f"{K.ANLIEGEN_ARTEN[art]['label']}\n{g['text']}\nBearbeitungsziel: {_tag(a.ziel_am)}\n/portal/admin/finanzen/anliegen#{a.name}", a.ziel_am, _zustaendig("finanzen", "buchhaltung"))
	_bo_melden(a, f"Neues Kundenanliegen – {kurztext}", f"Bearbeitungsziel {_tag(a.ziel_am)}")
	_kunde_melden(a, f"Eingangsbestätigung: {K.ANLIEGEN_ARTEN[art]['kurz']}", f"Ihr Anliegen {a.name} ist eingegangen. Wir melden uns bis voraussichtlich {_tag(a.ziel_am)}.")
	protokoll(n, "anliegen_anlegen", "kundenanliegen", a.name, f"{K.ANLIEGEN_ARTEN[art]['label']} zu {(beleg or {}).get('nummer') or anlage_name}")
	return _anliegen_json(n, a)


@frappe.whitelist(methods=["POST"])
def anliegen_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = _daten(daten)
	k = v.kennung(id)
	a = frappe.get_doc(KN, k) if k and frappe.db.exists(KN, k) else None
	zg = _zugriff(n, a) if a else None
	if not a or not zg:
		nicht_gefunden("Anliegen nicht gefunden.")
	if zg == "backoffice":
		if not _fin_schreiben(n):
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben.")
		wer = "bo"
	elif zg in ("kunde", "team-schreiben"):
		wer = "kunde"
	else:
		verboten("Ihre Teamrolle erlaubt nur das Lesen.")
	aktion = str(d.get("aktion") or "")
	vorher = a.status
	neu = _fach(K.uebergang, a.art, a.status, aktion, wer)
	anliegen = {"betragStrittigEur": flt(a.betrag_strittig) or None, "wunschTermin": str(a.wunsch_termin or ""), "angebot": aus_json(a.angebot, None)}
	e = _fach(K.aktion_pruefen, a.art, aktion, d, anliegen=anliegen, heute=_heute())
	t = jetzt()
	a.status = neu
	if e["begruendung"]:
		a.begruendung = e["begruendung"]
	text = f"{K.AKTION_LABEL[aktion]} – {'ÖkoInvest (' + name_von(n.id) + ')' if wer == 'bo' else name_von(n.id)}"
	if aktion == "angebot":
		ang = {**e["angebot"], "am": iso(t)}
		a.angebot = als_json(ang)
		text = f"Angebot: Kaufpreis {_eur(ang['betragEur'])} netto, Übergabe {_tag(ang['stichtag'])}, gültig bis {_tag(ang['gueltigBis'])}" if a.art == "kaufoption" else f"Angebot: {ang['jahre']} Jahre zu {ang['preisCt']} ct/kWh, gültig bis {_tag(ang['gueltigBis'])}"
	if aktion in ("stattgeben", "teilweise"):
		a.korrektur_eur = e["korrekturEur"]
	if not K.ANLIEGEN_STATUS[neu].get("offen"):
		a.entschieden_am = t
	_verlauf(a, wer, f"{text}: {e['begruendung'][:300]}" if e["begruendung"] and aktion != "angebot" else text)
	dd = aus_json(a.daten, {}) or {}
	# ---------------------------------------------------------------- Folgeaktionen
	if a.art == "einspruch" and not K.ANLIEGEN_STATUS[neu].get("offen") and a.beleg_id:
		bd = aus_json(frappe.db.get_value(AB, a.beleg_id, "daten"), {}) or {}
		if (bd.get("mahnsperre") or {}).get("anliegenId") == a.name:
			bd.pop("mahnsperre", None)
			frappe.db.set_value(AB, a.beleg_id, "daten", als_json(bd))
			_verlauf(a, "system", "Mahnsperre aufgehoben")
	if a.art == "einspruch" and neu in ("stattgegeben", "teilweise"):
		from oekoinvest_app.plattform.finanzen import abrechnung as FA

		kf, _neu = FA.klaerfall_melden("contracting", f"EINSPRUCH:{a.name}", {"anlageId": a.anlage_id}, f"Einspruch {dd.get('belegNummer') or a.beleg_id}",
			[f"Einspruch {'teilweise ' if neu == 'teilweise' else ''}stattgegeben: Korrektur {_eur(a.korrektur_eur) + ' ' if a.korrektur_eur else ''}per Gutschrift bzw. Korrekturrechnung zu {dd.get('belegNummer') or a.beleg_id} erstellen."])
		a.klaerfall_id = kf
		_verlauf(a, "system", f"Korrektur an die Buchhaltung übergeben (Klärfall {kf})")
	if a.art == "kuendigung" and neu == "bestaetigt" and a.anlage_id:
		c = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": a.anlage_id}, "name")
		if c:
			frappe.db.set_value("Plattform Contracting Vertrag", c, "status", "gekuendigt")
		_verlauf(a, "system", f"Vertrag zum {_tag(a.wirksam_zum)} als gekündigt vermerkt")
	if neu == "angenommen":
		ang = aus_json(a.angebot, {}) or {}
		was = f"Übernahme {dd.get('anlageName', '')}: Kaufvertrag, Übergabeprotokoll, Grundbuch/Dienstbarkeit und Abmeldung Betriebsführung vorbereiten (Stichtag {_tag(ang.get('stichtag'))})" if a.art == "kaufoption" else f"Verlängerung {dd.get('anlageName', '')}: Nachtrag zum Stromliefervertrag ({ang.get('jahre')} Jahre, {ang.get('preisCt')} ct/kWh) zur Unterschrift senden"
		_aufgabe(was[:150], f"{was}\nAnliegen {a.name} – vom Kunden angenommen am {_tag(_heute())}.", _heute(), _zustaendig("finanzen", "buchhaltung"))
		_verlauf(a, "system", "Angenommen – Backoffice bereitet die Vertragsunterlagen vor")
	frappe.flags.kundenenergie_api = True
	try:
		a.save(ignore_permissions=True)
	finally:
		frappe.flags.kundenenergie_api = False
	if wer == "bo":
		_kunde_melden(a, f"{K.ANLIEGEN_ARTEN[a.art]['kurz']}: {K.ANLIEGEN_STATUS[neu]['label']}", "Ihnen liegt ein Angebot vor – bitte im Portal annehmen oder ablehnen." if neu == "angebot" else (a.begruendung or "")[:200] or f"Status: {K.ANLIEGEN_STATUS[neu]['label']}")
	else:
		_bo_melden(a, f"{K.ANLIEGEN_ARTEN[a.art]['kurz']} {a.name}: {K.ANLIEGEN_STATUS[neu]['label']}", f"{name_von(n.id)} – {K.AKTION_LABEL[aktion]}")
	protokoll(n, f"anliegen_{aktion}", "kundenanliegen", a.name, f"{K.ANLIEGEN_ARTEN[a.art]['kurz']}: {K.ANLIEGEN_STATUS[vorher]['label']} → {K.ANLIEGEN_STATUS[neu]['label']}")
	return _anliegen_json(n, a)


@frappe.whitelist(methods=["POST"])
def anliegen_dokument(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	a = frappe.get_doc(KN, k) if k and frappe.db.exists(KN, k) else None
	if not a or not _zugriff(n, a):
		nicht_gefunden("Anliegen nicht gefunden.")
	ku = kurz(a.kunde_id) or {}
	eig = (frappe.db.get_value("Plattform Anlage", a.anlage_id, "eigentuemer") if a.anlage_id and frappe.get_meta("Plattform Anlage").has_field("eigentuemer") else None) or "ÖkoInvest GmbH"
	return {"anliegen": _anliegen_json(n, a), "kunde": {"name": name_von(a.kunde_id), "firma": ku.get("firma", ""), "email": ku.get("email", "")}, "eigentuemer": eig}


# ================================================================ Störung melden (Kunde)

AUSWIRKUNG = {"kein_ertrag": "hoch", "weniger_ertrag": "mittel", "sicherheit": "kritisch", "sonstiges": "niedrig"}


@frappe.whitelist(methods=["POST"])
def stoerung_melden(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Störungen melden Kunden hier; das Backoffice erfasst sie im Leitstand.")
	from oekoinvest_app.plattform.api import anlagen as AN

	d = _daten(daten)
	titel = v.text(d.get("titel"), 140)
	v.pflicht(len(titel) >= 5, "Bitte beschreiben Sie die Störung kurz (mindestens 5 Zeichen).")
	a = AN.anlage_laden(n, d.get("anlageId"))
	if AN.zugriff(n, a) not in ("kunde", "team-schreiben"):
		verboten("Ihre Teamrolle erlaubt nur das Lesen.")
	offen = frappe.get_all("Plattform Stoerungsfall", filters={"anlage_id": a.name, "status": ["in", ["offen", "in_arbeit"]], "verlauf": ["like", f"%{name_von(n.id)}%"]}, pluck="name", limit_page_length=10)
	if len(offen) >= 5:
		konflikt("Sie haben bereits fünf offene Meldungen zu dieser Anlage – bitte ergänzen Sie dort einen Kommentar.")
	s, _neu = AN.stoerung_anlegen_intern(a.name, "manuell", AUSWIRKUNG.get(d.get("auswirkung"), "mittel"), titel, v.mehrzeilig(d.get("text"), 2000), von=n.id)
	vl = aus_json(s.verlauf, []) or []
	if vl:
		vl[0]["text"] = f"Vom Kunden gemeldet ({name_von(n.id)})"
		frappe.db.set_value("Plattform Stoerungsfall", s.name, "verlauf", als_json(vl))
	benachrichtigen(n.id, "stoerung", f"Störungsmeldung eingegangen: {a.titel}", f"{titel} – der Betrieb ist informiert.", f"/portal/anlagen/{a.name}?tab=stoerungen", "anlage", a.name, mail=False)
	protokoll(n, "stoerung_kunde", "anlage", a.name, f"Störung gemeldet: {titel}")
	return AN.stoerung_json(n, frappe.get_doc("Plattform Stoerungsfall", s.name), AN.zugriff(n, a), a)


# ================================================================ Lieferantenwechsel


def _lieferant_von(n):
	from oekoinvest_app.plattform.api import energie as EN

	return EN._lieferant_von(n)


def _vertrag(name):
	return frappe.get_doc(EV, name) if name and frappe.db.exists(EV, name) else None


def _stichtag(vt):
	from oekoinvest_app.plattform import energie_kern as ek

	if not vt or not vt.vertrag_ende:
		return None
	return ek.kuendigungs_stichtag(str(vt.vertrag_ende), cint(vt.kuendigungsfrist_monate) if vt.kuendigungsfrist_monate is not None else None, cint(vt.kuendigungsfrist_wochen) or None)


def _wechsel_pflegen():
	"""Fehlende Wechsel zu Zuschlags-Verträgen anlegen; überfällige kritische Schritte einmalig als Aufgabe melden (auch per Scheduler)."""
	vorhanden = set(frappe.get_all(LW, pluck="vertrag_id", limit_page_length=0))
	for vt in frappe.get_all(EV, filters={"quelle": "zuschlag", "ausschreibung_id": ["is", "set"]}, fields=["name", "ausschreibung_id", "kunde_id", "lieferant_id", "vorvertrag_id", "creation"], limit_page_length=0):
		if vt.name in vorhanden:
			continue
		au = frappe.db.get_value(AU, vt.ausschreibung_id, ["name", "status", "lieferbeginn", "zuschlag"], as_dict=True)
		if not au or au.status != "zuschlag":
			continue
		z = aus_json(au.zuschlag, {}) or {}
		alt = _vertrag(vt.vorvertrag_id)
		frappe.flags.kundenenergie_api = True
		try:
			frappe.get_doc({
				"doctype": LW, "ausschreibung_id": au.name, "vertrag_id": vt.name, "kunde_id": vt.kunde_id, "lieferant_id": vt.lieferant_id, "vorvertrag_id": alt.name if alt else None,
				"lieferbeginn": au.lieferbeginn, "status": "laufend", "alarme": als_json({}),
				"schritte": als_json(K.wechsel_anlegen(z.get("am") or iso(vt.creation), au.lieferbeginn, _stichtag(alt), bool(alt))),
				"verlauf": als_json([{"am": iso(jetzt()), "wer": "system", "text": "Lieferantenwechsel angelegt (nach Zuschlag)"}]),
			}).insert(ignore_permissions=True)
		finally:
			frappe.flags.kundenenergie_api = False
	heute = _heute()
	for name in frappe.get_all(LW, filters={"status": "laufend"}, pluck="name", limit_page_length=0):
		w = frappe.get_doc(LW, name)
		schritte = aus_json(w.schritte, []) or []
		alarme = aus_json(w.alarme, {}) or {}
		neu = False
		for sid in [x for x in K.wechsel_stand(schritte, heute)["ueberfaellig"] if x in K.ALARM_SCHRITTE and x not in alarme]:
			alarme[sid] = iso(jetzt())
			neu = True
			s = next(x for x in schritte if x["id"] == sid)
			label = next(x["label"] for x in K.WECHSEL_SCHRITTE if x["id"] == sid)
			_aufgabe(f"Wechsel {(kurz(w.kunde_id) or {}).get('firma') or name_von(w.kunde_id)}: „{label}“ überfällig", f"Frist {_tag(s.get('frist'))} überschritten.\n/portal/admin/energie/wechsel#{w.name}", heute, _zustaendig("energie", "energie"))
		if neu:
			frappe.db.set_value(LW, w.name, "alarme", als_json(alarme))


def fristen_taeglich():
	"""Scheduler (hooks.py, täglich): Wechsel nach Zuschlag anlegen und Fristen-Alarme."""
	_wechsel_pflegen()


def _wechsel_json(n, w, rolle):
	schritte = aus_json(w.schritte, []) or []
	st = K.wechsel_stand(schritte, _heute())
	vt = _vertrag(w.vertrag_id)
	alt = _vertrag(w.vorvertrag_id)
	wer = ("bo" if _en_schreiben(n) else None) if rolle == "backoffice" else rolle
	status = {x["id"]: x["status"] for x in schritte}
	aus_schritte = []
	for s in schritte:
		d = next(x for x in K.WECHSEL_SCHRITTE if x["id"] == s["id"])
		vor_ok = all(status.get(i) in ("erledigt", "entfaellt") for i in d.get("nach", []))
		aus_schritte.append({**s, "label": d["label"], "text": "", "wer": d["wer"], "ueberfaellig": s["id"] in st["ueberfaellig"], "darf": bool(wer) and s["status"] == "offen" and wer in d["wer"] and vor_ok})
	ku = kurz(w.kunde_id) or {}
	titel = frappe.db.get_value(AU, w.ausschreibung_id, "titel") or ""
	lb = str(w.lieferbeginn or "")
	return {
		"id": w.name, "ausschreibungId": w.ausschreibung_id, "titel": f"Stromlieferung ab {'/'.join(reversed(lb.split('-')))}" if rolle == "lieferant" else titel, "lieferbeginn": lb,
		"lieferant": frappe.db.get_value(LF, w.lieferant_id, "lieferant_name") if w.lieferant_id else (vt.lieferant if vt else ""),
		"kunde": None if rolle == "kunde" else {"id": w.kunde_id, "name": name_von(w.kunde_id), "firma": ku.get("firma", "")},
		"vertrag": {"id": vt.name, "status": vt.status, "struktur": vt.struktur, "preisCt": flt(vt.preis_ct) or None, "aufschlagCt": flt(vt.aufschlag_ct) if vt.aufschlag_ct else None, "beginn": str(vt.beginn or ""), "vertragEnde": str(vt.vertrag_ende or "")} if vt else None,
		"vorvertrag": {"id": alt.name, "lieferant": alt.lieferant, "vertragEnde": str(alt.vertrag_ende or ""), "stichtag": _stichtag(alt), "status": alt.status} if alt and rolle != "lieferant" else None,
		"schritte": aus_schritte, "stand": st, "verlauf": [] if rolle == "lieferant" else (aus_json(w.verlauf, []) or [])[-30:], "rolle": rolle,
	}


@frappe.whitelist(methods=["POST"])
def wechsel_liste(ausschreibung_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_wechsel_pflegen()
	f = {"ausschreibung_id": v.kennung(ausschreibung_id)} if v.kennung(ausschreibung_id) else {}
	if _en_lesen(n):
		return [_wechsel_json(n, frappe.get_doc(LW, x), "backoffice") for x in frappe.get_all(LW, filters=f, pluck="name", order_by="creation desc", limit_page_length=300)]
	lf = _lieferant_von(n)
	if lf:
		return [_wechsel_json(n, frappe.get_doc(LW, x), "lieferant") for x in frappe.get_all(LW, filters={**f, "lieferant_id": lf.name}, pluck="name", limit_page_length=100)]
	if "unternehmen" in (n.get("rollen") or []) and not ist_admin(n):
		return [_wechsel_json(n, frappe.get_doc(LW, x), "kunde") for x in frappe.get_all(LW, filters={**f, "kunde_id": n.id}, pluck="name", limit_page_length=100)]
	verboten()


@frappe.whitelist(methods=["POST"])
def wechsel_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = _daten(daten)
	k = v.kennung(id)
	w = frappe.get_doc(LW, k) if k and frappe.db.exists(LW, k) else None
	if not w:
		nicht_gefunden("Lieferantenwechsel nicht gefunden.")
	lf = _lieferant_von(n)
	if _en_lesen(n):
		if not _en_schreiben(n):
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Energiebeschaffung“ kein Schreiben.")
		wer, rolle = "bo", "backoffice"
	elif lf and lf.name == w.lieferant_id:
		wer = rolle = "lieferant"
	elif "unternehmen" in (n.get("rollen") or []) and not ist_admin(n) and w.kunde_id == n.id:
		wer = rolle = "kunde"
	else:
		nicht_gefunden("Lieferantenwechsel nicht gefunden.")
	schritt = str(d.get("schritt") or "")
	bemerkung = v.text(d.get("bemerkung"), 300)
	schritte = _fach(K.wechsel_schritt_erledigen, aus_json(w.schritte, []) or [], schritt, wer, am=iso(jetzt()), bemerkung=bemerkung)
	label = next(x["label"] for x in K.WECHSEL_SCHRITTE if x["id"] == schritt)
	wname = f"ÖkoInvest ({name_von(n.id)})" if wer == "bo" else (f"Versorger ({name_von(n.id)})" if wer == "lieferant" else name_von(n.id))
	vl = aus_json(w.verlauf, []) or []
	vl.append({"am": iso(jetzt()), "wer": wer, "text": f"{label} – bestätigt von {wname}{': ' + bemerkung if bemerkung else ''}"})
	if schritt == "kuendigung_alt" and w.vorvertrag_id:
		frappe.db.set_value(EV, w.vorvertrag_id, "status", "gekuendigt")
	if schritt == "lieferbeginn":
		if frappe.db.get_value(EV, w.vertrag_id, "status") == "neu":
			frappe.db.set_value(EV, w.vertrag_id, "status", "aktiv")
		if w.vorvertrag_id and frappe.db.get_value(EV, w.vorvertrag_id, "status") != "beendet":
			frappe.db.set_value(EV, w.vorvertrag_id, "status", "beendet")
		vl.append({"am": iso(jetzt()), "wer": "system", "text": "Neuer Vertrag aktiv, bisheriger Vertrag beendet"})
	st = K.wechsel_stand(schritte, _heute())
	if st["abgeschlossen"]:
		vl.append({"am": iso(jetzt()), "wer": "system", "text": "Lieferantenwechsel abgeschlossen"})
	w.schritte = als_json(schritte)
	w.verlauf = als_json(vl[-100:])
	w.status = "abgeschlossen" if st["abgeschlossen"] else "laufend"
	frappe.flags.kundenenergie_api = True
	try:
		w.save(ignore_permissions=True)
	finally:
		frappe.flags.kundenenergie_api = False
	titel = "Lieferantenwechsel abgeschlossen" if st["abgeschlossen"] else f"Lieferantenwechsel: {label}"
	if wer != "kunde":
		benachrichtigen(w.kunde_id, "energie", titel, f"Bestätigt von {'ÖkoInvest' if wer == 'bo' else 'Ihrem neuen Versorger'}.", "/portal/energie/beschaffung#wechsel", "lieferantenwechsel", w.name, mail_text=MAIL_WECHSEL, mail_betreff="Ihr Lieferantenwechsel – ÖkoInvest")
	if wer != "lieferant" and schritt in ("vertrag_kunde", "kuendigung_bestaetigt", "erste_rechnung") and w.lieferant_id:
		for konto in aus_json(frappe.db.get_value(LF, w.lieferant_id, "konten"), []) or []:
			benachrichtigen(konto, "energie", titel, f"Los {w.ausschreibung_id}", f"/portal/ausschreibungen/{w.ausschreibung_id}#wechsel", "lieferantenwechsel", w.name, mail_text=MAIL_WECHSEL, mail_betreff="Lieferantenwechsel – ÖkoInvest")
	if wer != "bo":
		for k2 in _admins_mit("energie"):
			benachrichtigen(k2.name, "aufgabe", titel, f"{(kurz(w.kunde_id) or {}).get('firma') or name_von(w.kunde_id)} – {wname}", f"/portal/admin/energie/wechsel#{w.name}", "lieferantenwechsel", w.name, mail=False)
	protokoll(n, "wechsel_schritt", "lieferantenwechsel", w.name, f"{label} bestätigt ({wer})")
	return _wechsel_json(n, w, rolle)


# ================================================================ Vertragsdaten für den bezuschlagten Versorger


@frappe.whitelist(methods=["POST"])
def vertragsdaten(ausschreibung_id=None, ip="", als_benutzer=None):
	n = nutzer(als_benutzer)
	k = v.kennung(ausschreibung_id)
	au = frappe.get_doc(AU, k) if k and frappe.db.exists(AU, k) else None
	if not au:
		nicht_gefunden("Ausschreibung nicht gefunden.")
	z = aus_json(au.zuschlag, {}) or {}
	g = frappe.get_doc(LA, z["angebotId"]) if z.get("angebotId") and frappe.db.exists(LA, z["angebotId"]) else None
	lf = _lieferant_von(n)
	bo = _en_lesen(n)
	if not bo and not (lf and g and g.lieferant_id == lf.name):
		nicht_gefunden("Vertragsdaten nicht gefunden.")
	if au.status != "zuschlag" or not z.get("am"):
		konflikt("Vertragsdaten gibt es erst nach dem Zuschlag.")
	pos = next((p for p in (aus_json(g.positionen, []) or []) if p.get("produktId") == z.get("produktId")), {})
	produkt = next((p for p in (aus_json(au.produkte, []) or []) if p.get("id") == z.get("produktId")), {})
	lose = aus_json(au.lose, []) or []
	stellen_je = aus_json(au.abnahmestellen, {}) or {}
	kunden = []
	for kid in aus_json(au.kunden, []) or []:
		ku = frappe.db.get_value("Plattform Konto", kid, ["firma", "email", "telefon"], as_dict=True) or {}
		vt = frappe.get_all(EV, filters={"ausschreibung_id": au.name, "kunde_id": kid}, fields=["name", "beginn", "vertrag_ende", "jahres_kwh"], limit_page_length=1)
		ids = stellen_je.get(kid) or [] if isinstance(stellen_je, dict) else []
		stellen = []
		for s in frappe.get_all("Plattform Abnahmestelle", filters={"konto_id": kid}, fields=["name", "bezeichnung", "land", "daten"], limit_page_length=0):
			if ids and s.name not in ids:
				continue
			sd = aus_json(s.daten, {}) or {}
			stellen.append({"bezeichnung": s.bezeichnung, "land": s.land, "plz": sd.get("plz", ""), "ort": sd.get("ort", ""), "maloId": sd.get("maloId", ""), "meloId": sd.get("meloId", ""), "zaehlpunkt": sd.get("zaehlpunkt", ""), "messart": sd.get("messart", ""), "netzbetreiber": sd.get("netzbetreiber", ""), "spannungsebene": sd.get("spannungsebene") or sd.get("netzebeneAt") or "", "jahresverbrauchKwh": sd.get("jahresverbrauchKwh")})
		los = next((x for x in lose if x.get("kundeId") == kid), {})
		kunden.append({"firma": ku.get("firma") or "", "ansprechpartner": name_von(kid), "email": ku.get("email") or "", "telefon": ku.get("telefon") or "", "jahresKwh": los.get("jahresKwh") or (flt(vt[0].jahres_kwh) if vt else None),
			"vertragId": vt[0].name if vt else None, "beginn": str(vt[0].beginn) if vt else f"{au.lieferbeginn}-01", "vertragEnde": str(vt[0].vertrag_ende) if vt else "", "abnahmestellen": stellen})
	if not bo:
		protokoll(n, "vertragsdaten_abruf", "ausschreibung", au.name, f"Vertragsdaten (Kundendaten, Lokationen) durch Versorger {lf.lieferant_name} abgerufen", ip)
	return {
		"ausschreibung": {"id": au.name, "titel": au.titel, "lieferbeginn": au.lieferbeginn, "zone": au.zone, "zuschlagAm": z.get("am")},
		"lieferant": frappe.db.get_value(LF, g.lieferant_id, "lieferant_name") or "",
		"produkt": {"id": produkt.get("id"), "art": produkt.get("art"), "laufzeitJahre": produkt.get("laufzeitJahre"), "arbeitspreisCt": pos.get("arbeitspreisCt"), "aufschlagCt": pos.get("aufschlagCt"), "grundpreisEurMonat": pos.get("grundpreisEurMonat"), "hknCt": pos.get("hknCt")},
		"angebot": {"zahlungszielTage": cint(g.zahlungsziel_tage), "sicherheit": g.sicherheit, "bindefristBis": iso(g.bindefrist_bis)},
		"kunden": kunden,
		"hinweis": "Die Daten dürfen nur für Abschluss und Abwicklung dieses Liefervertrags verwendet werden (Zweckbindung). Die Kunden haben der Weitergabe mit der Freigabe des Zuschlags zugestimmt.",
	}


# ================================================================ Energiekostenbericht


@frappe.whitelist(methods=["POST"])
def kostenbericht(jahr=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Den Kostenbericht sehen Unternehmen für ihre eigenen Verträge.")
	from oekoinvest_app.plattform.api import energie as EN
	from oekoinvest_app.plattform.api import finanzen as FI

	aktuell = int(_heute()[:4])
	j = cint(jahr) if 2020 <= cint(jahr) <= 2100 else aktuell
	vertraege = []
	for x in frappe.get_all(EV, filters={"kunde_id": n.id}, fields=["*"], limit_page_length=0):
		vj = EN._vertrag_json(x)
		vertraege.append({"id": vj["id"], "lieferant": vj["lieferantName"] or vj["lieferant"], "beginn": vj["beginn"], "vertragEnde": vj["vertragEnde"], "energiepreisCt": vj["energiepreisCt"], "struktur": vj["strukturLabel"], "jahresKwh": vj["jahresKwh"], "status": vj["status"]})
	lg = frappe.get_all("Plattform Lastgang", filters={"konto_id": n.id}, fields=["titel", "analyse"], order_by="creation desc", limit_page_length=5)
	lgt = next((x for x in lg if len((aus_json(x.analyse, {}) or {}).get("monate") or []) == 12), None)
	netz = [flt(m.get("kwh")) for m in (aus_json(lgt.analyse, {}) or {})["monate"]] if lgt else None
	abr = FI.meine(jahr=j, als_benutzer=n.id)
	pv = [{"monat": m["monat"], "kwh": m["kwh"], "netto": m["netto"]} for m in abr["contracting"]["monate"]] if abr.get("jahr") == j else []
	r = K.kostenreport(j, vertraege, netz, pv)
	return {**r, "kunde": {"name": name_von(n.id), "firma": (kurz(n.id) or {}).get("firma", "")}, "quelleNetz": f"Lastgang „{lgt.titel or 'Upload'}“ (Monatssummen, gemittelt über die Jahre des Uploads)" if lgt else "Jahresmenge laut Vertrag",
		"jahre": [x for x in (j - 2, j - 1, j, j + 1) if x <= aktuell + 1], "vertraege": vertraege}
