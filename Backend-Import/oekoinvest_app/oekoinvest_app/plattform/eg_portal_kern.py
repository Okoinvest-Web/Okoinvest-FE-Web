# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP6 „Portale Mitglied, Interessent, Gemeinde, öffentlicher Rechner“ – reine Regeln (ohne Frappe),
# 1:1 aus src/lib/plattform/eg/{interesse,dashboard,anreize,empfehlung}.js. Gemeinsame Testvektoren:
# src/lib/plattform/eg/testdaten/portal/*.json (tests/test_eg_portal_kern.py, scripts/plattform-test-eg-portal.mjs).
# Keine EDA- oder Abrechnungslogik (WP2/WP4); die Ersparnis ist eine Schätzung. KEINE Rechts- oder Steuerberatung.

import math
import re
from datetime import date

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform.eg_stamm_kern import netzentgelt_regel, plz_aus_zaehlpunkt, reduzierter_ap, zaehlpunkt_pruefen
from oekoinvest_app.plattform.mitglied_kern import _js_round, auswahl, fehler, ganz, iban as iban_pruefen, plus_tage, tage_zwischen, text, wahr, zahl


def _n(v):
	"""JS Number(v) || 0 – ganzzahlige Werte als int (gleiche Texte wie in JS)."""
	if v is None or v == "" or isinstance(v, (dict, list)):
		return 0
	if isinstance(v, bool):
		return 1 if v else 0
	try:
		f = float(v)
	except (TypeError, ValueError):
		return 0
	if math.isnan(f) or math.isinf(f):
		return 0
	return int(f) if f.is_integer() else f


def _r(x, k):
	return _js_round(_n(x) * k) / k


def r0(x):
	return int(_js_round(_n(x)))


def r1(x):
	return _int(_r(x, 10))


def r2(x):
	return _int(_r(x, 100))


def r3(x):
	return _int(_r(x, 1000))


def _int(f):
	return int(f) if isinstance(f, float) and f.is_integer() else f


def _de(x):
	return str(_int(x)).replace(".", ",")


def _tag(v):
	return str(v or "")[:10]


# ================================================================ interesse.js

INTERESSE_ROLLEN = {
	"verbraucher": {"label": "Verbraucher/in", "text": "Ich möchte Strom aus der Gemeinschaft beziehen."},
	"erzeuger": {"label": "Erzeuger/in", "text": "Ich habe eine Anlage und möchte Überschuss einbringen."},
	"prosumer": {"label": "Beides (Prosumer)", "text": "Ich erzeuge und verbrauche."},
}
INTERESSE_STATUS = {
	"neu": {"label": "Neu", "ton": "info"}, "kontaktiert": {"label": "Kontaktiert", "ton": "warn"}, "zugeordnet": {"label": "Gemeinschaft zugeordnet", "ton": "info"},
	"beigetreten": {"label": "Beigetreten", "ton": "ok"}, "verworfen": {"label": "Verworfen", "ton": "neutral"},
}
INTERESSE_HERKUNFT = {"formular": "Formular", "rechner": "Ersparnis-Rechner", "portal": "Portal", "gemeinde": "Kampagne der Gemeinde", "oekovolt": "ÖKOVOLT-PV-Kunde"}
INTERESSE_EINWILLIGUNG = "Ich bin einverstanden, dass ÖkoInvest meine Angaben verarbeitet, um mich zu passenden Energiegemeinschaften zu informieren (DSGVO Art. 6 Abs. 1 lit. a, jederzeit widerrufbar)."
_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PLZ4 = re.compile(r"^\d{4}$")


def _plz4(v):
	s = str("" if v is None else v).strip()
	return s if _PLZ4.match(s) else ""


def interesse_bereinigen(d=None, netzbetreiber=None):
	d = d or {}
	i = {
		"vorname": text(d.get("vorname"), 80), "nachname": text(d.get("nachname"), 80), "firma": text(d.get("firma"), 140), "email": text(d.get("email"), 160).lower(), "telefon": text(d.get("telefon"), 40),
		"plz": _plz4(d.get("plz")), "ort": text(d.get("ort"), 80), "rolle": auswahl(d.get("rolle"), INTERESSE_ROLLEN, "verbraucher"), "art": auswahl(d.get("art"), M.MITGLIED_ARTEN, "privat"),
		"zaehlpunktnummer": "", "jahresverbrauchKwh": _zi(zahl(d.get("jahresverbrauchKwh"), 0, 1e8, 0)), "kwp": _zi(zahl(d.get("kwp"), 0, 100000, 1)),
		"gemeinschaftId": text(d.get("gemeinschaftId"), 40), "nachricht": text(d.get("nachricht"), 1000), "herkunft": auswahl(d.get("herkunft"), INTERESSE_HERKUNFT, "formular"), "einwilligung": wahr(d.get("einwilligung")),
	}
	if not i["nachname"] and not i["firma"]:
		raise fehler("Bitte geben Sie Ihren Namen bzw. die Organisation an.", "nachname")
	if not _EMAIL.match(i["email"]):
		raise fehler("Bitte geben Sie eine gültige E-Mail-Adresse an.", "email")
	if not i["plz"]:
		raise fehler("Bitte geben Sie Ihre Postleitzahl (vierstellig) an.", "plz")
	if not i["einwilligung"]:
		raise fehler("Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.", "einwilligung")
	if str(d.get("zaehlpunktnummer") or "").strip():
		p = zaehlpunkt_pruefen(d.get("zaehlpunktnummer"), netzbetreiber or [])
		if not p["ok"]:
			raise fehler(p["fehler"], "zaehlpunktnummer")
		i["zaehlpunktnummer"] = p["wert"]
	return i


def _zi(v):
	return None if v is None else _int(v)


def interesse_cluster(i, netzbetreiber=None):
	netzbetreiber = netzbetreiber or []
	p = zaehlpunkt_pruefen(i["zaehlpunktnummer"], netzbetreiber) if (i or {}).get("zaehlpunktnummer") else None
	nb = p["netzbetreiberId"] if p and p["ok"] else ""
	plz = (i or {}).get("plz") or (plz_aus_zaehlpunkt(p["wert"]) if p and p["ok"] else "")
	return {"netzbetreiberId": nb, "plz": plz, "schluessel": f"{nb or 'NB-offen'}:{plz or '----'}"}


BEITRITT_VERSION = "2026-10"
BEITRITT_DOKUMENTE = [
	{"id": "statuten", "titel": "Statuten der Gemeinschaft", "text": "Sie erkennen die Statuten an: Zweck ist nicht in erster Linie finanzieller Gewinn, die Teilnahme ist freiwillig und offen, Austritt nach den Statuten jederzeit möglich.", "pflicht": True},
	{"id": "vertrag", "titel": "Bezugs- bzw. Einspeisevereinbarung", "text": "Regelt Preis je kWh laut Preisblatt, Abrechnung durch die Gemeinschaft, Gutschriften für eingebrachten Strom (Gutschriftverfahren nach § 11 Abs. 7 UStG) und die Kündigung. Ihren Reststrom liefert weiterhin Ihr bisheriger Lieferant.", "pflicht": True},
	{"id": "datenschutz", "titel": "Datenschutzinformation (Art. 13 DSGVO)", "text": "Für die Abrechnung verarbeiten wir Ihre Viertelstundenwerte, die der Netzbetreiber über den Datenaustausch (EDA) liefert (Art. 6 Abs. 1 lit. b DSGVO). Der Vorstand sieht standardmäßig nur Summen; jede Einzeleinsicht wird protokolliert.", "pflicht": True},
	{"id": "sepa", "titel": "SEPA-Lastschriftmandat", "text": "Sie ermächtigen die Gemeinschaft, Zahlungen von Ihrem Konto mittels Lastschrift einzuziehen. Erstattung binnen acht Wochen ab Belastung möglich.", "pflicht": True, "nurMit": "iban"},
]


def beitritt_bereinigen(d=None, gemeinschaft=None, netzbetreiber=None):
	d = d or {}
	p = d.get("person") or {}
	art = auswahl(d.get("art"), M.MITGLIED_ARTEN, "")
	if not art:
		raise fehler("Bitte wählen Sie, als wer Sie beitreten.", "art")
	person = {"vorname": text(p.get("vorname"), 80), "nachname": text(p.get("nachname"), 80), "firma": text(p.get("firma"), 140), "strasse": text(p.get("strasse"), 120), "plz": _plz4(p.get("plz")), "ort": text(p.get("ort"), 80), "telefon": text(p.get("telefon"), 40)}
	if not person["nachname"] and not person["firma"]:
		raise fehler("Bitte geben Sie Ihren Namen bzw. die Organisation an.", "person.nachname")
	if not person["strasse"] or not person["plz"] or not person["ort"]:
		raise fehler("Bitte geben Sie Ihre Anschrift vollständig an (Straße, PLZ, Ort).", "person.strasse")
	iban_roh = re.sub(r"\s", "", str(d.get("iban") or ""))
	iban = iban_pruefen(iban_roh) if iban_roh else ""
	if iban_roh and not iban:
		raise fehler("Die IBAN ist ungültig (Prüfsumme).", "iban")
	liste = (d.get("zaehlpunkte") if isinstance(d.get("zaehlpunkte"), list) else [])[:11]
	if not liste:
		raise fehler("Bitte geben Sie mindestens einen Zählpunkt an.", "zaehlpunkte")
	if len(liste) > 10:
		raise fehler("Höchstens zehn Zählpunkte je Antrag.", "zaehlpunkte")
	zps = []
	for i, z in enumerate(liste):
		z = z if isinstance(z, dict) else {}
		richtung = auswahl(z.get("richtung"), M.ZP_RICHTUNGEN, "")
		if not richtung:
			raise fehler(f"Zählpunkt {i + 1}: Bitte Verbrauch oder Erzeugung wählen.", f"zaehlpunkte.{i}.richtung")
		e = eignung_pruefen({"zaehlpunktnummer": z.get("zaehlpunktnummer"), "richtung": richtung, "art": art, "smartMeter": z.get("smartMeter")}, gemeinschaft, netzbetreiber)
		nein = next((x for x in e["punkte"] if x["ok"] is False), None)
		if nein:
			raise fehler(f"Zählpunkt {i + 1}: {nein['text']}", f"zaehlpunkte.{i}.zaehlpunktnummer")
		tf = ganz(100 if z.get("teilnahmefaktor") is None else z.get("teilnahmefaktor"), 1, 100)
		if tf is None:
			raise fehler(f"Zählpunkt {i + 1}: Der Teilnahmefaktor ist eine ganze Zahl von 1 bis 100 %.", f"zaehlpunkte.{i}.teilnahmefaktor")
		wert = e["zaehlpunkt"]["wert"]
		if any(x["zaehlpunktnummer"] == wert for x in zps):
			raise fehler(f"Zählpunkt {i + 1} ist doppelt angegeben.", f"zaehlpunkte.{i}.zaehlpunktnummer")
		ft = ganz(0 if z.get("fremdTf") is None else z.get("fremdTf"), 0, 99)
		fa = ganz(0 if z.get("fremdAnzahl") is None else z.get("fremdAnzahl"), 0, 4)
		zps.append({
			"zaehlpunktnummer": wert, "richtung": richtung, "teilnahmefaktor": tf, "bezeichnung": text(z.get("bezeichnung"), 80), "smartMeter": auswahl(z.get("smartMeter"), M.SMART_METER, "unbekannt"),
			"kwp": _zi(zahl(z.get("kwp"), 0, 6000, 1)) if richtung == "erzeugung" else None, "fremdTf": ft if ft is not None else 0, "fremdAnzahl": fa if fa is not None else 0,
		})
	zu = d.get("zustimmungen") or {}
	zustimmungen = []
	for dok in BEITRITT_DOKUMENTE:
		if dok.get("nurMit") == "iban" and not iban:
			continue
		if dok["pflicht"] and zu.get(dok["id"]) is not True:
			raise fehler(f"Bitte bestätigen Sie: {dok['titel']}.", f"zustimmungen.{dok['id']}")
		if zu.get(dok["id"]) is True:
			zustimmungen.append(dok["id"])
	u = d.get("unterschrift") or {}
	name = text(u.get("name"), 140)
	soll = (person["nachname"] or person["firma"]).lower()
	if u.get("bestaetigt") is not True or len(name) < 3 or soll not in name.lower():
		voll = person["firma"] if person["firma"] and not person["nachname"] else " ".join(x for x in [person["vorname"], person["nachname"]] if x)
		raise fehler(f"Bitte unterschreiben Sie mit Ihrem vollständigen Namen ({voll}).", "unterschrift.name")
	ug = d.get("unternehmensgroesse") or {}
	return {
		"mitglied": {"art": art, "person": person, "steuerstatusErzeuger": auswahl(d.get("steuerstatusErzeuger"), M.STEUERSTATUS_ERZEUGER, "kleinunternehmer"), "uid": text(d.get("uid"), 20), "iban": iban, "rechnungsweg": auswahl(d.get("rechnungsweg"), M.RECHNUNGSWEGE, "portal"), "unternehmensgroesse": {"mitarbeiter": _zi(zahl(ug.get("mitarbeiter"), 0, 1e7, 0)), "umsatzMioEur": _zi(zahl(ug.get("umsatzMioEur"), 0, 1e6, 2)), "bilanzMioEur": _zi(zahl(ug.get("bilanzMioEur"), 0, 1e6, 2)), "nachweis": ""}},
		"zaehlpunkte": zps, "zustimmungen": zustimmungen, "unterschrift": {"name": name},
	}


BEITRITT_OFFEN = ["in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit", "aktiv"]


def gemeinschaft_oeffentlich(g, tarif=None, mitglieder=0, plz_bereich=None, netzbetreiber_namen=None):
	sitz = g.get("sitzAdresse") or {}
	plz = sorted({x for x in [sitz.get("plz"), *(plz_bereich or [])] if _PLZ4.match(str(x or ""))})
	return {
		"id": g["id"], "name": g["name"], "kurzname": g.get("kurzname") or "", "modell": g["modell"], "zonelevel": _n(g.get("zonelevel")) or None, "status": g["status"],
		"statusLabel": (M.GEMEINSCHAFT_STATUS.get(g["status"]) or {}).get("label", g["status"]), "beitrittOffen": g["status"] in BEITRITT_OFFEN, "ort": sitz.get("ort") or "", "plz": sitz.get("plz") or "",
		"netzbetreiber": list(g.get("netzbetreiber") or []), "netzbetreiberNamen": list(netzbetreiber_namen or []), "plzBereich": plz, "mitglieder": _n(mitglieder),
		"bezugspreisCt": tarif.get("bezugspreisCt") if tarif else None, "einspeisepreisCt": tarif.get("einspeisepreisCt") if tarif else None,
		"mitgliedsbeitragJahr": tarif.get("mitgliedsbeitragJahr") if tarif else None, "einmalgebuehrBeitritt": tarif.get("einmalgebuehrBeitritt") if tarif else None,
		"zeitfenster": [{"label": z.get("label"), "von": z.get("von"), "bis": z.get("bis"), "monate": list(z.get("monate") or []), "bezugspreisCt": z.get("bezugspreisCt")} for z in (tarif.get("zeitfenster") or [])] if tarif else [],
		"beschreibung": text(g.get("beschreibung"), 400),
	}


def gemeinschaften_suchen(liste=None, plz="", zaehlpunktnummer="", netzbetreiber=None):
	p = zaehlpunkt_pruefen(zaehlpunktnummer, netzbetreiber or []) if zaehlpunktnummer else None
	nb = p["netzbetreiberId"] if p and p["ok"] else ""
	ort = str(plz or (plz_aus_zaehlpunkt(p["wert"]) if p and p["ok"] else "") or "")
	aus = []
	for g in liste or []:
		if not g.get("beitrittOffen"):
			continue
		bereich = g.get("plzBereich") or []
		plz_treffer = bool(ort) and ort in bereich
		region = bool(ort) and any(x[:2] == ort[:2] for x in bereich)
		nb_treffer = bool(nb) and nb in (g.get("netzbetreiber") or [])
		weit = g["modell"] == "beg" and _n(g.get("zonelevel")) in (6, 7)
		passung, punkte, grund = "", 0, ""
		if plz_treffer:
			passung, punkte, grund = "nahe", 3, f"Mitglieder und Anlagen im Postleitzahlbereich {ort}."
		elif nb_treffer or (region and not nb):
			passung, punkte, grund = "netzgebiet", 2, ("Gleiches Netzgebiet wie Ihr Zählpunkt." if nb_treffer else f"In Ihrer Region (PLZ {ort[:2]}…).")
		elif weit:
			passung, punkte, grund = "oesterreichweit", 1, "Bürgerenergiegemeinschaft ohne Nahebereich – Teilnahme unabhängig vom Ort möglich (ohne Netzentgelt-Reduktion)."
		if not passung:
			continue
		if g["modell"] in ("eeg", "gea") and passung != "nahe":
			grund += " Ob Ihr Anschluss im Nahebereich liegt, prüft der Netzbetreiber bei der Anmeldung."
		aus.append({"id": g["id"], "name": g["name"], "modell": g["modell"], "passung": passung, "punkte": punkte, "grund": grund})
	return sorted(aus, key=lambda a: (-a["punkte"], a["name"].lower()))


def eignung_pruefen(d=None, gemeinschaft=None, netzbetreiber=None):
	d = d or {}
	netzbetreiber = netzbetreiber or []
	g = gemeinschaft or {}
	punkte = []
	p = zaehlpunkt_pruefen(d.get("zaehlpunktnummer"), netzbetreiber)
	gnb = g.get("netzbetreiber") or []
	z = _n(g.get("zonelevel"))
	if not p["ok"]:
		punkte.append({"id": "zaehlpunkt", "ok": False, "text": p["fehler"]})
	else:
		punkte.append({"id": "zaehlpunkt", "ok": True, "text": f"Zählpunktnummer im gültigen Format ({p['wert'][:13]}…)."})
		nb_name = next((x.get("kurzname") for x in netzbetreiber if x.get("id") == p["netzbetreiberId"]), "") or ""
		if not p["netzbetreiberId"]:
			punkte.append({"id": "netz", "ok": None, "text": f"Netzbetreiber zur Nummer {p['nbNummer']} ist noch nicht hinterlegt – wir ordnen ihn bei der Prüfung zu."})
		elif gnb and p["netzbetreiberId"] not in gnb:
			zusatz = " Netzgebietsübergreifende Teilnahme ist ab Marktphase 2 vorgesehen (zu bestätigen)." if g.get("modell") == "beg" else ""
			punkte.append({"id": "netz", "ok": None if (g.get("modell") == "beg" and z in (5, 6, 7)) else False, "text": f"Ihr Zählpunkt liegt im Netz von {nb_name}; die Gemeinschaft ist in einem anderen Netzgebiet angemeldet.{zusatz}"})
		else:
			punkte.append({"id": "netz", "ok": True, "text": f"Netzgebiet passt ({nb_name})."})
		if g.get("modell") in ("eeg", "gea"):
			punkte.append({"id": "nahebereich", "ok": None, "text": "Teilnahme nur an derselben Hauptleitung bzw. im selben Objekt." if g.get("modell") == "gea" else f"Ob Ihr Anschluss im {'Lokalbereich (gleiche Trafostation)' if z == 3 else 'Regionalbereich (gleiches Umspannwerk)'} liegt, prüft der Netzbetreiber bei der Anmeldung."})
	if d.get("richtung") and d.get("richtung") not in M.ZP_RICHTUNGEN:
		punkte.append({"id": "richtung", "ok": False, "text": "Bitte Verbrauch oder Erzeugung wählen."})
	art = d.get("art")
	if art and g.get("modell") == "eeg" and art in M.MITGLIED_ARTEN and not M.MITGLIED_ARTEN[art].get("eeg"):
		punkte.append({"id": "art", "ok": False, "text": "Großunternehmen dürfen nicht Mitglied einer Erneuerbare-Energie-Gemeinschaft sein – möglich ist eine Bürgerenergiegemeinschaft (BEG)."})
	elif art:
		punkte.append({"id": "art", "ok": True, "text": f"Mitgliedsart „{(M.MITGLIED_ARTEN.get(art) or {}).get('label') or art}“ ist zulässig."})
	sm = auswahl(d.get("smartMeter"), M.SMART_METER, "unbekannt")
	if sm == "ja":
		punkte.append({"id": "smartmeter", "ok": True, "text": "Smart Meter mit Viertelstundenwerten vorhanden."})
	else:
		punkte.append({"id": "smartmeter", "ok": None, "text": "Ohne Smart Meter baut der Netzbetreiber nach der Anmeldung einen ein – das kann bis zu zwei Monate dauern." if sm == "nein" else "Smart Meter unbekannt – steht meist auf der Netzrechnung. Fehlt er, baut der Netzbetreiber nach der Anmeldung einen ein."})
	if g.get("status") and g["status"] not in BEITRITT_OFFEN:
		punkte.append({"id": "status", "ok": False, "text": f"Die Gemeinschaft nimmt derzeit keine Anträge an ({(M.GEMEINSCHAFT_STATUS.get(g['status']) or {}).get('label') or g['status']})."})
	ergebnis = "nicht_geeignet" if any(x["ok"] is False for x in punkte) else "pruefen" if any(x["ok"] is None for x in punkte) else "geeignet"
	return {"ergebnis": ergebnis, "punkte": punkte, "zaehlpunkt": {"wert": p["wert"], "netzbetreiberId": p["netzbetreiberId"], "plz": p["plz"]} if p["ok"] else None}


# ---------------------------------------------------------------- Ersparnis-Rechner

RECHNER_MODELLE = {
	"eeg_lokal": {"label": "EEG lokal", "sub": "gleiche Trafostation", "modell": "eeg", "zonelevel": 3},
	"eeg_regional": {"label": "EEG regional", "sub": "gleiches Umspannwerk", "modell": "eeg", "zonelevel": 4},
	"beg": {"label": "BEG", "sub": "österreichweit", "modell": "beg", "zonelevel": 6},
	"gea": {"label": "GEA", "sub": "im selben Haus", "modell": "gea", "zonelevel": 1},
}
RECHNER_PROFILE = {
	"haushalt": {"label": "Haushalt", "faktor": 0.75, "max": 0.4}, "haushalt_flex": {"label": "Haushalt flexibel", "faktor": 0.9, "max": 0.55},
	"gewerbe": {"label": "Betrieb", "faktor": 1, "max": 0.65}, "landwirtschaft": {"label": "Landwirtschaft", "faktor": 0.85, "max": 0.5},
}
RECHNER_DECKUNG = {"knapp": {"verhaeltnis": 0.3}, "ausgewogen": {"verhaeltnis": 0.7}, "reichlich": {"verhaeltnis": 1.5}}
RECHNER_ROLLEN = {"verbraucher": "Ich verbrauche", "erzeuger": "Ich erzeuge", "prosumer": "Beides"}
RECHNER_JAHRE = {"2026": "2026-11-15", "2027": "2027-06-15"}
# Standardwerte = src/lib/invest/markt.js GEMEINSCHAFTEN.rechner.at, REGIONEN at (1120 kWh/kWp × 0,9 Dach), ALLGEMEIN.co2KgProKwh
_AT = {"energiepreis": 12, "netzAp": 7, "abgabenCt": 0.82, "ueberschussCt": 5, "gemeinschaftCt": 10, "verwaltung": 20}
RECHNER_STANDARD = {
	"rolle": "verbraucher", "profil": "haushalt", "modell": "eeg_lokal", "deckung": "ausgewogen", "jahr": 2026, "verbrauchKwh": 3500, "kwp": 10, "eigenverbrauchPct": 30,
	"lieferantCt": 12, "gemeinschaftCt": 10, "netzApCt": 7, "abgabenCt": 0.82, "einspeiseEgCt": 8, "marktCt": 5, "gebuehrenJahr": 20, "ertragKwhJeKwp": 1008, "co2KgJeKwh": 0.65,
}


def nutzungsgrad(r):
	return 1 / (1 + _n(r) / 1.7)


def rechner_oeffentlich(eingabe=None):
	e = {**RECHNER_STANDARD, **(eingabe or {})}

	def z(v, mn, mx, std):
		x = zahl(v, mn, mx)
		return std if x is None else _int(x)

	rolle = auswahl(e.get("rolle"), RECHNER_ROLLEN, "verbraucher")
	profil = e.get("profil") if e.get("profil") in RECHNER_PROFILE else "haushalt"
	modell_id = e.get("modell") if e.get("modell") in RECHNER_MODELLE else "eeg_lokal"
	deckung = e.get("deckung") if e.get("deckung") in RECHNER_DECKUNG else "ausgewogen"
	jahr = str(e.get("jahr")) if str(e.get("jahr")) in RECHNER_JAHRE else "2026"
	m = RECHNER_MODELLE[modell_id]
	pr = RECHNER_PROFILE[profil]
	verh = RECHNER_DECKUNG[deckung]["verhaeltnis"]
	verbrauch = 0 if rolle == "erzeuger" else z(e.get("verbrauchKwh"), 0, 1e7, 3500)
	kwp = 0 if rolle == "verbraucher" else z(e.get("kwp"), 0, 6000, 10)
	p = {"lieferant": z(e.get("lieferantCt"), 0, 100, _AT["energiepreis"]), "gemeinschaft": z(e.get("gemeinschaftCt"), 0, 100, _AT["gemeinschaftCt"]), "netzAp": z(e.get("netzApCt"), 0, 50, _AT["netzAp"]),
		"abgaben": z(e.get("abgabenCt"), 0, 10, _AT["abgabenCt"]), "einspeise": z(e.get("einspeiseEgCt"), 0, 100, 8), "markt": z(e.get("marktCt"), 0, 100, _AT["ueberschussCt"])}
	gebuehren = z(e.get("gebuehrenJahr"), 0, 10000, _AT["verwaltung"])
	regel = netzentgelt_regel(RECHNER_JAHRE[jahr], m["modell"], m["zonelevel"], 7)
	n = nutzungsgrad(verh)
	quote = min(pr["max"], n * verh * pr["faktor"])
	bezug = verbrauch * quote
	netz_ct = r2(p["netzAp"] - reduzierter_ap(p["netzAp"], regel["reduktionPct"]))
	abg_ct = p["abgaben"] if regel["abgabenBefreit"] else 0
	ertrag = z(e.get("ertragKwhJeKwp"), 500, 1500, RECHNER_STANDARD["ertragKwhJeKwp"])
	erzeugung = kwp * ertrag
	ueberschuss = erzeugung * (1 - z(e.get("eigenverbrauchPct"), 0, 100, 30) / 100)
	eingebracht = ueberschuss * n * 0.85
	teile = []
	if verbrauch > 0:
		teile.append({"id": "energie", "label": "Günstigerer Energiepreis", "eur": r2((bezug * (p["lieferant"] - p["gemeinschaft"])) / 100), "ct": r2(p["lieferant"] - p["gemeinschaft"])})
		teile.append({"id": "netz", "label": f"Reduziertes Netzentgelt (−{regel['reduktionPct']} % Arbeitspreis)" if regel["reduktionPct"] > 0 else "Netzentgelt (keine Reduktion)", "eur": r2((bezug * netz_ct) / 100), "ct": netz_ct})
		if abg_ct > 0:
			teile.append({"id": "abgaben", "label": "Elektrizitätsabgabe entfällt", "eur": r2((bezug * abg_ct) / 100), "ct": abg_ct})
	if kwp > 0:
		teile.append({"id": "erzeuger", "label": "Mehrerlös für eingebrachten Strom", "eur": r2((eingebracht * (p["einspeise"] - p["markt"])) / 100), "ct": r2(p["einspeise"] - p["markt"])})
	vorteil = r2(_summe(t["eur"] for t in teile))
	netto = r2(vorteil - gebuehren)
	hinweise = []
	if jahr == "2026" and regel["reduktionPct"] > 0:
		hinweise.append({"id": "luecke", "text": "Okt.–Dez. 2026: Ob die reduzierten Netzentgelte nach SNE-V 2018 im Übergang weiter gelten, wird unterschiedlich dargestellt – maßgeblich ist Ihre Netzrechnung (zu bestätigen)."})
	if regel["status"] == "platzhalter":
		hinweise.append({"id": "platzhalter", "text": "Ab 2027 richtet sich das Netzentgelt nach dem Nahebereich; die Werte der neuen Verordnung stehen noch aus – hier als Arbeitshypothese gerechnet."})
	if m["modell"] == "beg":
		hinweise.append({"id": "beg", "text": "Bürgerenergiegemeinschaften erhalten nach heutigem Stand keine Netzentgelt-Reduktion und keine Abgabenbefreiung – der Vorteil entsteht über den Preis."})
	if netto < 0:
		hinweise.append({"id": "negativ", "text": "Mit diesen Annahmen decken die Vorteile die Gebühren nicht. Ein flexiblerer Verbrauch oder ein günstigerer Gemeinschaftspreis verbessert das Ergebnis."})
	return {
		"eingabe": {"rolle": rolle, "profil": profil, "modell": modell_id, "deckung": deckung, "jahr": int(jahr)},
		"regel": {"text": regel["text"], "reduktionPct": regel["reduktionPct"], "abgabenBefreit": regel["abgabenBefreit"], "status": regel["status"], "quelle": regel["quelle"]},
		"quotePct": r1(quote * 100), "bezugKwh": r0(bezug), "erzeugungKwh": r0(erzeugung), "eingebrachtKwh": r0(eingebracht),
		"teile": teile, "vorteilEur": vorteil, "gebuehrenEur": r2(gebuehren), "nettoEur": netto,
		"vorteilJeKwhCt": r2(_summe(t["ct"] for t in teile if t["id"] != "erzeuger")) if bezug > 0 else 0,
		"co2Kg": r0((bezug + eingebracht) * z(e.get("co2KgJeKwh"), 0, 2, RECHNER_STANDARD["co2KgJeKwh"])),
		"nutzungsgradPct": r1(n * 100), "hinweise": hinweise,
		"annahmen": {"verhaeltnis": verh, "faktor": pr["faktor"], "maxQuote": pr["max"], "ertragKwhJeKwp": ertrag, "nutzungsgrad": r3(n)},
	}


def _summe(xs):
	s = 0
	for x in xs:
		s += x
	return s


# ================================================================ dashboard.js

KUENDIGUNG_FRIST_TAGE = 28
SOZIALQUOTE_PCT = 10
FRIST_DRINGEND_TAGE = 7


def zeitraeume(heute):
	g = plus_tage(_tag(heute), -1)
	return {"gestern": {"id": "gestern", "label": "Gestern", "von": g, "bis": g}, "monat": {"id": "monat", "label": "Dieser Monat", "von": f"{g[:8]}01", "bis": g}, "jahr": {"id": "jahr", "label": "Dieses Jahr", "von": f"{g[:4]}-01-01", "bis": g}}


def energie_kennzahlen(eintraege=None, p=None):
	eintraege = eintraege or []
	p = p or {}

	def g(e, k):
		return _n((e.get("groessen") or {}).get(k))

	vz = [e for e in eintraege if e.get("richtung") != "erzeugung"]
	ez = [e for e in eintraege if e.get("richtung") == "erzeugung"]
	verbrauch = _summe(g(e, "verbrauch_gemessen") for e in vz)
	ed = _summe(g(e, "eigendeckung") for e in vz)
	erzeugung = _summe(g(e, "erzeugung_gemessen") for e in ez)
	rest = _summe(g(e, "restueberschuss") for e in ez)
	eingebracht = _summe(max(0, (g(e, "erzeugung_tf") or g(e, "erzeugung_gemessen")) - g(e, "restueberschuss")) for e in ez)
	bezug = _n(p.get("bezugspreisCt"))
	netz_ct = r2(_n(p.get("netzApCt")) - reduzierter_ap(p.get("netzApCt"), p.get("reduktionPct"))) if p.get("netzApCt") else 0
	energie = (ed * (_n(p.get("lieferantCt")) - bezug)) / 100 if p.get("lieferantCt") else 0
	netz = (ed * netz_ct) / 100
	abgaben = (ed * _n(p.get("abgabenCt"))) / 100 if p.get("abgabenBefreit") else 0
	return {
		"hatDaten": len(eintraege) > 0 and verbrauch + erzeugung > 0,
		"verbrauchKwh": r3(verbrauch), "eigendeckungKwh": r3(ed), "anteilPct": r1((ed / verbrauch) * 100) if verbrauch > 0 else None,
		"erzeugungKwh": r3(erzeugung), "eingebrachtKwh": r3(eingebracht), "restueberschussKwh": r3(rest), "nutzungPct": r1((eingebracht / erzeugung) * 100) if erzeugung > 0 else None,
		"ersparnis": {"energieEur": r2(energie), "netzEur": r2(netz), "abgabenEur": r2(abgaben), "gesamtEur": r2(energie + netz + abgaben)},
		"erloesEur": r2((eingebracht * _n(p.get("einspeisepreisCt"))) / 100),
		"co2Kg": r1((ed + eingebracht) * _n(p.get("co2KgJeKwh"))),
		"vollstaendig": all(e.get("vollstaendig") is not False for e in eintraege),
		"anteilL3Pct": r1(max([0, *[_n(e.get("anteilL3")) for e in eintraege]]) * 100),
	}


SCHRITTE = [
	{"id": "antrag", "label": "Beitrittsantrag", "text": "Antrag mit Verträgen und Unterschrift."},
	{"id": "aufnahme", "label": "Aufnahme", "text": "Die Gemeinschaft prüft und nimmt Sie auf."},
	{"id": "anmeldung", "label": "Anmeldung beim Netzbetreiber", "text": "Wir melden Ihren Zählpunkt elektronisch an."},
	{"id": "zustimmung", "label": "Ihre Zustimmung", "text": "Sie bestätigen im Portal Ihres Netzbetreibers."},
	{"id": "technik", "label": "Aktivierung", "text": "Der Netzbetreiber ordnet zu, ggf. mit Smart-Meter-Einbau."},
	{"id": "aktiv", "label": "Gemeinschaftsstrom", "text": "Ab dem Aktivierungsdatum zählt jede Viertelstunde."},
]


def teilnahme_schritte(mitglied_status="", teilnahme=None, heute=""):
	t = teilnahme or {}
	st = t.get("status") or ""
	idx, fehler_bei, aufgabe = 0, "", ""
	if mitglied_status == "interessent":
		idx, aufgabe = 0, "Beitrittsantrag ausfüllen und unterschreiben."
	elif mitglied_status in ("antrag", "geprueft"):
		idx, aufgabe = 1, "Nichts zu tun – die Gemeinschaft entscheidet über die Aufnahme."
	elif not st or st == "entwurf":
		idx, aufgabe = 2, "Nichts zu tun – wir bereiten die Anmeldung beim Netzbetreiber vor."
	elif st == "angefragt":
		idx, aufgabe = 2, "Nichts zu tun – der Netzbetreiber prüft die Anmeldung."
	elif st == "zustimmung_offen":
		idx, aufgabe = 3, "Jetzt im Portal Ihres Netzbetreibers zustimmen."
	elif st in ("zugestimmt", "wartet_technik"):
		idx, aufgabe = 4, ("Nichts zu tun – der Netzbetreiber baut bzw. stellt den Smart Meter um." if st == "wartet_technik" else "Nichts zu tun – der Netzbetreiber bestätigt das Aktivierungsdatum.")
	elif st in ("aktiv", "abmeldung_angefragt", "beendet"):
		idx, aufgabe = 5, ("" if st == "aktiv" else "Die Teilnahme ist beendet." if st == "beendet" else "Die Abmeldung läuft.")
	elif st == "abgelehnt":
		idx, fehler_bei, aufgabe = 2, "anmeldung", "Der Netzbetreiber hat abgelehnt – wir klären den Grund und starten neu."
	elif st == "abgelaufen":
		idx, fehler_bei, aufgabe = 3, "zustimmung", "Die Frist ist abgelaufen – wir starten die Anmeldung auf Wunsch neu."
	elif st == "verworfen":
		idx, fehler_bei, aufgabe = 2, "anmeldung", "Die Anmeldung wurde verworfen."
	fertig = st in ("aktiv", "abmeldung_angefragt", "beendet")
	schritte = [{**s, "zustand": "fehler" if s["id"] == fehler_bei else "erledigt" if (i < idx or (fertig and i == idx)) else "aktuell" if i == idx else "offen"} for i, s in enumerate(SCHRITTE)]
	frist = None
	if st == "zustimmung_offen" and t.get("fristBis"):
		rest = tage_zwischen(_tag(heute), _tag(t["fristBis"]))
		frist = {"bis": _tag(t["fristBis"]), "tageRest": rest, "dringend": rest <= FRIST_DRINGEND_TAGE}
	return {"schritte": schritte, "aktuell": SCHRITTE[idx]["id"], "frist": frist, "aufgabe": aufgabe, "beendet": st == "beendet", "statusLabel": (M.TEILNAHME_STATUS.get(st) or {}).get("label", "")}


def zustimmungs_anleitung(netzbetreiber=None, gemeinschaft=None, teilnahme=None, zaehlpunktnummer=""):
	nb = (netzbetreiber or {}).get("kurzname") or (netzbetreiber or {}).get("name") or "Ihres Netzbetreibers"
	name = (gemeinschaft or {}).get("name") or "Ihrer Energiegemeinschaft"
	gid = str((gemeinschaft or {}).get("gemeinschaftsId") or "")
	zp = str(zaehlpunktnummer or "")
	tf = _n((teilnahme or {}).get("teilnahmefaktor")) or 100
	return {
		"titel": f"So stimmen Sie bei {nb} zu" if netzbetreiber else "So stimmen Sie bei Ihrem Netzbetreiber zu",
		"schritte": [
			{"id": "portal", "titel": "Kundenportal öffnen", "text": f"Melden Sie sich im Kunden- bzw. Smart-Meter-Portal {('von ' + nb) if netzbetreiber else 'Ihres Netzbetreibers'} an. Noch kein Zugang? Für die Registrierung brauchen Sie meist die Zählpunktnummer und die Kundennummer von Ihrer Netzrechnung."},
			{"id": "menue", "titel": "Bereich für Energiegemeinschaften wählen", "text": "Der Menüpunkt heißt je Netzbetreiber unterschiedlich, etwa „Energiegemeinschaften“, „Datenfreigaben“ oder „Zustimmungen“."},
			{"id": "anfrage", "titel": "Anfrage prüfen", "text": f"Dort wartet eine Anfrage von „{name}“{(' (Gemeinschafts-ID ' + gid[:13] + '…)') if gid else ''}{(' für den Zählpunkt …' + zp[-6:]) if zp else ''} mit einem Teilnahmefaktor von {tf} %."},
			{"id": "zustimmen", "titel": "Zustimmen", "text": "Bestätigen Sie die Teilnahme. Damit kommt die Zusatzvereinbarung zum Netzzugangsvertrag zustande."},
			{"id": "fertig", "titel": "Fertig", "text": "Ihre Zustimmung erreicht uns automatisch über den Datenaustausch der Netzbetreiber (EDA). Sie müssen uns nichts senden."},
		],
		"hinweise": [
			"Ohne Zustimmung lehnt der Netzbetreiber die Anmeldung nach Fristablauf ab – sie muss dann neu gestartet werden. Am besten gleich erledigen.",
			"Kein Online-Zugang? Fragen Sie uns nach der Offline-Variante: Der Netzbetreiber stellt einen QR-Code zu (30 Tage gültig, danach 5 Tage Widerrufsfrist).",
		],
	}


def mehrfach_uebersicht(zaehlpunkte=None, teilnahmen=None, gemeinschaften=None):
	gemeinschaften = gemeinschaften or []
	teilnahmen = teilnahmen or []

	def name(gid):
		return next((g["name"] for g in gemeinschaften if g["id"] == gid), gid)

	aus = []
	for z in zaehlpunkte or []:
		tn = [{"teilnahmeId": t["id"], "gemeinschaftId": t["gemeinschaftId"], "gemeinschaft": name(t["gemeinschaftId"]), "teilnahmefaktor": _n(t.get("teilnahmefaktor")), "status": t["status"], "statusLabel": (M.TEILNAHME_STATUS.get(t["status"]) or {}).get("label", t["status"]), "zaehlt": t["status"] in M.TEILNAHME_ZAEHLT} for t in teilnahmen if t["zaehlpunktId"] == z["id"]]
		zl = [t for t in tn if t["zaehlt"]]
		summe = _summe(t["teilnahmefaktor"] for t in zl)
		hinweise = []
		if summe > M.TF_MAX:
			hinweise.append(f"Die Teilnahmefaktoren ergeben {summe} % – höchstens {M.TF_MAX} % sind zulässig.")
		elif summe < M.TF_MAX and zl:
			hinweise.append(f"{M.TF_MAX - summe} % {'Ihrer Erzeugung' if z.get('richtung') == 'erzeugung' else 'Ihres Verbrauchs'} sind noch keiner Gemeinschaft zugeordnet.")
		if len(zl) >= M.MAX_TEILNAHMEN_JE_ZP:
			hinweise.append(f"Höchstzahl von {M.MAX_TEILNAHMEN_JE_ZP} Gemeinschaften erreicht.")
		aus.append({"zaehlpunktId": z["id"], "zaehlpunktnummer": z.get("zaehlpunktnummer"), "bezeichnung": z.get("bezeichnung") or "", "richtung": z.get("richtung"), "teilnahmen": tn, "summeTf": summe, "freiTf": max(0, M.TF_MAX - summe), "anzahl": len(zl), "maxAnzahl": M.MAX_TEILNAHMEN_JE_ZP, "mehrfach": len(zl) > 1, "hinweise": hinweise})
	return aus


def sozialquote(erzeugungKwh=0, anSchutzbeduerftigeKwh=0, schutzbeduerftigeHaushalte=0, sozialtarif=None):  # noqa: N803
	e, a, n = _n(erzeugungKwh), _n(anSchutzbeduerftigeKwh), _n(schutzbeduerftigeHaushalte)
	kontingent = _n((sozialtarif or {}).get("kontingentPct"))
	quote = r1((a / e) * 100) if e > 0 else None
	status, txt = "keine_daten", "Sobald Energiedaten vorliegen, zeigen wir hier, welcher Anteil der Gemeinde-Erzeugung schutzbedürftigen Haushalten zugutekommt."
	if quote is not None:
		status = "erfuellt" if quote >= SOZIALQUOTE_PCT else "unter"
		txt = f"{_de(quote)} % der Gemeinde-Erzeugung kommen schutzbedürftigen Haushalten zugute – Mindestanteil {SOZIALQUOTE_PCT} % erreicht." if quote >= SOZIALQUOTE_PCT else f"Bisher {_de(quote)} % – für den Mindestanteil von {SOZIALQUOTE_PCT} % braucht es mehr teilnehmende schutzbedürftige Haushalte oder einen höheren Teilnahmefaktor."
	hinweise = []
	if not n:
		hinweise.append("In der Gemeinschaft ist noch kein schutzbedürftiger Haushalt gekennzeichnet. Nachweis z. B. über GIS-Befreiung oder Sozialhilfebescheid (zu bestätigen).")
	if kontingent < SOZIALQUOTE_PCT:
		hinweise.append(f"Im Preisblatt ist {('ein Sozialkontingent von ' + _de(kontingent) + ' %') if kontingent else 'kein Sozialkontingent'} hinterlegt – empfohlen sind mindestens {SOZIALQUOTE_PCT} %.")
	return {"sollPct": SOZIALQUOTE_PCT, "quotePct": quote, "status": status, "text": txt, "schutzbeduerftigeHaushalte": n, "kontingentPct": kontingent, "erzeugungKwh": r0(e), "anSchutzbeduerftigeKwh": r0(a), "hinweise": hinweise}


def kuendigung_fruehestens(heute, frist_tage=KUENDIGUNG_FRIST_TAGE):
	return plus_tage(_tag(heute), max(0, int(_n(frist_tage))))


# ================================================================ empfehlung.js

TYPISCHE_FENSTER = {
	"sommer": {"monate": [4, 5, 6, 7, 8, 9], "von": "10:30", "bis": "15:30", "staerke": "hoch"},
	"uebergang": {"monate": [3, 10], "von": "11:00", "bis": "14:30", "staerke": "mittel"},
	"winter": {"monate": [11, 12, 1, 2], "von": "11:30", "bis": "13:30", "staerke": "gering"},
}
_HHMM = re.compile(r"(\d{1,2}):(\d{2})")


def _hhmm(v):
	s = str("" if v is None else v).strip()
	if not s:
		return ""
	m = _HHMM.search(s)
	if m:
		return f"{m.group(1).zfill(2)}:{m.group(2)}"
	try:
		h = float(s)
	except ValueError:
		return ""
	return f"{int(h):02d}:00" if h.is_integer() and 0 <= h <= 24 else ""


def typisches_fenster(datum):
	try:
		m = int(_tag(datum)[5:7]) or 6
	except ValueError:
		m = 6
	f = next((x for x in TYPISCHE_FENSTER.values() if m in x["monate"]), TYPISCHE_FENSTER["sommer"])
	return {"von": f["von"], "bis": f["bis"], "staerke": f["staerke"]}


def _erst(*werte):
	return next((w for w in werte if w is not None), None)


def _aus_stunden(liste):
	h = []
	for x in liste:
		hh = _hhmm(_erst(x.get("beginn"), x.get("von")))
		s = _erst(x.get("stunde"), x.get("h"))
		if s is None:
			s = int(hh[:2]) if hh else None
		w = _erst(x.get("ueberschussKwh"), x.get("ueberschuss"), x.get("wert"), x.get("kwh"))
		w = _n(w) if w is not None else ((_n(x.get("e")) - _n(x.get("v"))) if x.get("e") is not None else 0)
		if isinstance(s, (int, float)) and not isinstance(s, bool) and float(s).is_integer() and w > 0:
			h.append({"s": int(s), "w": w})
	h.sort(key=lambda x: x["s"])
	mx = max([0, *[x["w"] for x in h]])
	aus = []
	for x in h:
		if aus and aus[-1]["bisH"] == x["s"]:
			aus[-1]["bisH"] = x["s"] + 1
			aus[-1]["summe"] += x["w"]
		else:
			aus.append({"vonH": x["s"], "bisH": x["s"] + 1, "summe": x["w"]})
	return [{"von": f"{f['vonH']:02d}:00", "bis": f"{f['bisH']:02d}:00", "staerke": "hoch" if mx and f["summe"] / (f["bisH"] - f["vonH"]) >= mx * 0.6 else "mittel"} for f in aus]


def gruene_stunden(prognose, heute=""):
	tage = []
	p = prognose if isinstance(prognose, (dict, list)) else None
	roh = None
	if isinstance(p, list):
		roh = p
	elif isinstance(p, dict):
		roh = next((p[k] for k in ("tage", "gruen", "grueneStunden", "stunden", "fenster") if p.get(k)), None)
	if isinstance(roh, list) and roh:
		ist_tag = any(isinstance(x, dict) and (isinstance(x.get("fenster"), list) or isinstance(x.get("gruenFenster"), list) or isinstance(x.get("stunden"), list)) for x in roh)
		if ist_tag:
			for t in roh:
				liste = t["fenster"] if isinstance(t.get("fenster"), list) else t["gruenFenster"] if isinstance(t.get("gruenFenster"), list) and t["gruenFenster"] else None
				if liste is not None:
					f = [{"von": _hhmm(_erst(x.get("von"), x.get("beginn"))), "bis": _hhmm(_erst(x.get("bis"), x.get("ende"))), "staerke": x.get("staerke") or "hoch"} for x in liste]
					f = [x for x in f if x["von"] and x["bis"]]
				else:
					f = _aus_stunden(t.get("stunden") or [])
				if f:
					eintrag = {"datum": _tag(t.get("datum") or t.get("tag") or heute), "fenster": f}
					if isinstance(t.get("quote"), (int, float)) and not isinstance(t.get("quote"), bool):
						eintrag["quotePct"] = _int(_js_round(t["quote"] * 1000) / 10)
					tage.append(eintrag)
		elif any(isinstance(x, dict) and (x.get("von") or x.get("beginn")) and (x.get("bis") or x.get("ende")) for x in roh):
			nach = {}
			for x in roh:
				b = x.get("beginn") or x.get("von")
				d = _tag(x.get("datum") or (b if len(str(b)) > 8 else heute))
				nach.setdefault(d, []).append({"von": _hhmm(_erst(x.get("von"), x.get("beginn"))), "bis": _hhmm(_erst(x.get("bis"), x.get("ende"))), "staerke": x.get("staerke") or "hoch"})
			for d, f in nach.items():
				tage.append({"datum": d, "fenster": [x for x in f if x["von"] and x["bis"]]})
		else:
			f = _aus_stunden(roh)
			if f:
				tage.append({"datum": _tag(heute), "fenster": f})
	if tage:
		return {"quelle": "prognose", "tage": sorted(tage, key=lambda t: t["datum"])[:3]}
	return {"quelle": "typisch", "tage": [{"datum": _tag(heute), "fenster": [typisches_fenster(heute)]}]}


def fenster_text(f):
	return f"{f['von'].replace(':00', '')}–{f['bis'].replace(':00', '')} Uhr" if f else ""


def tf_empfehlung(opt):
	if not isinstance(opt, dict):
		return None
	liste = next((opt[k] for k in ("vorschlaege", "vorschlag", "aufteilung", "empfehlung") if opt.get(k)), None)
	if not isinstance(liste, list) or not liste:
		return None
	v = [{"gemeinschaftId": str(x.get("gemeinschaftId") or ""), "teilnahmeId": str(x.get("teilnahmeId") or ""), "label": str(x.get("label") or ""), "aktuellTf": None if x.get("aktuellTf") is None else r0(x.get("aktuellTf")), "teilnahmefaktor": r0(_erst(x.get("empfohlenTf"), x.get("teilnahmefaktor"), x.get("tf")))} for x in liste]
	v = [x for x in v if x["teilnahmefaktor"] >= 0 and (x["gemeinschaftId"] or x["teilnahmeId"])]
	if not v:
		return None
	mehr = _erst(opt.get("mehrwertEur"), opt.get("verbesserungEur"), opt.get("vorteilEur"), opt.get("zusatzEur"))
	try:
		mehr = r2(float(mehr)) if mehr is not None else None
	except (TypeError, ValueError):
		mehr = None
	return {"vorschlaege": v, "mehrwertEur": mehr, "text": str(opt.get("text") or opt.get("begruendung") or "")}


# ================================================================ anreize.js

_WT = ["so", "mo", "di", "mi", "do", "fr", "sa"]


def wochentag(datum):
	try:
		return _WT[(date.fromisoformat(_tag(datum)).weekday() + 1) % 7]
	except ValueError:
		return "mo"


def tarif_zeitfenster_am(tarif, datum):
	if not tarif:
		return []
	try:
		m = int(str(datum)[5:7])
	except ValueError:
		m = 0
	w = wochentag(datum)
	aus = []
	for z in tarif.get("zeitfenster") or []:
		if (not z.get("monate") or m in z["monate"]) and (not z.get("tage") or w in z["tage"]):
			bp = z.get("bezugspreisCt")
			aus.append({"label": z.get("label") or "Zeitfenster", "von": z.get("von"), "bis": z.get("bis"), "bezugspreisCt": bp, "vorteilCt": r2(_n(tarif.get("bezugspreisCt")) - _n(bp)) if bp is not None else 0})
	return aus


MEILENSTEINE = [
	{"id": "kwh100", "art": "kwh", "wert": 100, "label": "100 kWh Gemeinschaftsstrom"},
	{"id": "kwh500", "art": "kwh", "wert": 500, "label": "500 kWh Gemeinschaftsstrom"},
	{"id": "kwh1000", "art": "kwh", "wert": 1000, "label": "1 MWh Gemeinschaftsstrom"},
	{"id": "anteil25", "art": "anteil", "wert": 25, "label": "Ein Viertel aus der Gemeinschaft"},
	{"id": "anteil40", "art": "anteil", "wert": 40, "label": "40 % aus der Gemeinschaft"},
]


def meilensteine(kwh=0, anteilPct=0):  # noqa: N803
	aus = []
	for m in MEILENSTEINE:
		ist = _n(kwh) if m["art"] == "kwh" else _n(anteilPct)
		aus.append({"id": m["id"], "label": m["label"], "erreicht": ist >= m["wert"], "fortschrittPct": min(100, int(_js_round((ist / m["wert"]) * 100)))})
	return aus


def anreize_fuer(tarif=None, heute="", stunden=None, kennzahlen=None, zaehlpunkte=None, anlagen=None, mehrfach=None):
	aus = []
	tou = [z for z in tarif_zeitfenster_am(tarif, heute) if z["vorteilCt"] > 0]
	f = ((((stunden or {}).get("tage") or [{}])[0].get("fenster") or [None])[0]) if (stunden or {}).get("tage") else None
	if f:
		prog = stunden.get("quelle") == "prognose"
		aus.append({"id": "zeit", "art": "zeit", "prio": 1, "titel": f"{'Viel Gemeinschaftsstrom' if prog else 'Typisch sonnenreich'}: {fenster_text(f)}", "text": "Laut Prognose deckt die Gemeinschaft in diesem Fenster am meisten. Waschmaschine, Geschirrspüler und Boiler jetzt einplanen." if prog else "Für Ihre Gemeinschaft liegt noch keine Prognose vor. In diesem Fenster erzeugen Photovoltaikanlagen in der Regel am meisten."})
	for z in tou:
		aus.append({"id": f"tou-{z['label']}", "art": "tarif", "prio": 1, "titel": f"{z['label']}: {z['von']}–{z['bis']} Uhr um {_de(z['vorteilCt'])} ct günstiger", "text": "Laut Preisblatt Ihrer Gemeinschaft kostet Gemeinschaftsstrom in diesem Zeitfenster weniger."})
	zps = zaehlpunkte or []
	erzeugt = any(z.get("richtung") == "erzeugung" for z in zps)
	verbraucht = any(z.get("richtung") != "erzeugung" for z in zps)
	speicher = any(a.get("art") == "speicher" or _n(a.get("speicherKwh")) > 0 for a in anlagen or [])
	nutzung = (kennzahlen or {}).get("nutzungPct")
	if erzeugt and not speicher:
		niedrig = nutzung is not None and nutzung < 60
		aus.append({"id": "speicher", "art": "speicher", "prio": 2 if niedrig else 3, "titel": "Speicher prüfen", "text": f"Nur {_de(nutzung)} % Ihrer Erzeugung werden in der Gemeinschaft genutzt. Ein Speicher verschiebt Mittagsstrom in den Abend – fürs eigene Haus und für Ihre Nachbarn." if niedrig else "Ein Batteriespeicher erhöht Ihren Eigenverbrauch. Für Gemeinschaftsspeicher sind die Messregeln (§ 111 ElWG) noch offen.", "link": "/rechner"})
	if verbraucht:
		ap = (kennzahlen or {}).get("anteilPct")
		aus.append({"id": "wallbox", "art": "wallbox", "prio": 2 if (ap is not None and ap < 25) else 3, "titel": "E-Auto und Wärmepumpe mittags laufen lassen", "text": "Ein Ladeplan für die Wallbox oder eine Zeitschaltung für Wärmepumpe und Boiler verschiebt Verbrauch in die Sonnenstunden – das erhöht Ihren Gemeinschaftsanteil ohne Komfortverlust."})
	for m in mehrfach or []:
		if m.get("richtung") == "erzeugung" and m.get("freiTf", 0) > 0 and m.get("anzahl", 0) > 0:
			aus.append({"id": f"frei-{m['zaehlpunktId']}", "art": "tf", "prio": 2, "titel": f"{m['freiTf']} % Ihrer Erzeugung sind frei", "text": "Sie können diesen Anteil einer weiteren Gemeinschaft zur Verfügung stellen (bis zu fünf Gemeinschaften je Zählpunkt).", "link": "/portal/eg/mehrfach"})
	return sorted(aus, key=lambda a: a["prio"])
