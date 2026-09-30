# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gemeindecockpit – reine Regeln (ohne Frappe), 1:1 aus src/lib/plattform/gemeinde/cockpit.js:
# Verfahrensschritte je Land (DE BauGB, AT Landes-Raumordnung, CH RPG), Termine, Einnahmen (§ 6 EEG bis 0,2 ct/kWh,
# Gemeindebeitrag, Pacht, Gewerbesteuer-Prognose), Stellungnahmen, Bürgerinfo-Material/Pressetexte (Entwürfe).
# Tests: tests/test_gemeinde_kern.py. Keine Rechtsberatung – Verfahren vereinfacht.

from oekoinvest_app.plattform.mitglied_kern import auswahl, datum, datum_zeit, fehler, mehrzeilig, rund2, text, zahl

BETEILIGUNG_CT = 0.2  # markt.js KOMMUNE.beteiligungCt (§ 6 Abs. 2 EEG 2023)

SCHRITT_STATUS = {"offen": "offen", "geplant": "terminiert", "erledigt": "erledigt", "entfaellt": "entfällt"}

VERFAHREN = {
	"DE": [
		("aufstellung", "Aufstellungsbeschluss Bebauungsplan", "§ 2 Abs. 1 BauGB"), ("fnp", "Änderung Flächennutzungsplan (Parallelverfahren)", "§ 8 Abs. 3 BauGB"),
		("fruehzeitig", "Frühzeitige Beteiligung Öffentlichkeit und Behörden", "§§ 3 Abs. 1, 4 Abs. 1 BauGB"), ("entwurf", "Billigung des Entwurfs, Beschluss zur Veröffentlichung", "§ 3 Abs. 2 BauGB"),
		("veroeffentlichung", "Veröffentlichung im Internet und Behördenbeteiligung (mind. ein Monat)", "§§ 3 Abs. 2, 4 Abs. 2 BauGB"), ("abwaegung", "Abwägung der Stellungnahmen", "§ 1 Abs. 7 BauGB"),
		("vertrag", "Städtebaulicher Vertrag / Durchführungsvertrag", "§§ 11, 12 BauGB"), ("par6", "Vereinbarung Kommunalbeteiligung", "§ 6 EEG 2023"), ("satzung", "Satzungsbeschluss", "§ 10 Abs. 1 BauGB"),
		("genehmigung_fnp", "Genehmigung FNP-Änderung (höhere Verwaltungsbehörde)", "§ 6 BauGB"), ("bekanntmachung", "Bekanntmachung – Bebauungsplan in Kraft", "§ 10 Abs. 3 BauGB"), ("baugenehmigung", "Baugenehmigung", "Landesbauordnung"),
	],
	"AT": [
		("grundsatz", "Grundsatzbeschluss Gemeinderat / Standortprüfung", "Gemeindeordnung"), ("vorbegutachtung", "Vorbegutachtung durch das Land (Raumordnung)", "Landes-Raumordnungsgesetz"),
		("auflage", "Kundmachung und Auflage des Entwurfs (Frist laut Landesrecht)", "Landes-Raumordnungsgesetz"), ("stellungnahmen", "Stellungnahmen und Einwendungen", "Landes-Raumordnungsgesetz"),
		("umwidmung", "Gemeinderatsbeschluss Umwidmung (Grünland-Photovoltaik bzw. Sonderwidmung)", "Landes-Raumordnungsgesetz"), ("genehmigung", "Aufsichtsbehördliche Genehmigung (Landesregierung)", "Landes-Raumordnungsgesetz"),
		("kundmachung", "Kundmachung – Widmung rechtswirksam", "Gemeindeordnung"), ("gemeindebeitrag", "Vereinbarung Gemeindebeitrag / Bürgerbeteiligung", "Vertrag"),
		("bewilligung", "Elektrizitätsrechtliche Bewilligung bzw. Baubewilligung", "Landes-Elektrizitätsgesetz / Bauordnung"), ("uvp", "UVP-Feststellung (falls Schwellenwert erreicht)", "UVP-G 2000"),
	],
	"CH": [
		("vorpruefung", "Kantonale Vorprüfung", "Art. 26 RPG, kantonales Recht"), ("mitwirkung", "Information und Mitwirkung der Bevölkerung", "Art. 4 RPG"),
		("auflage", "Öffentliche Auflage (in der Regel 30 Tage)", "kantonales Baurecht"), ("einsprachen", "Einsprachen und Einigungsverhandlungen", "kantonales Baurecht"),
		("beschluss", "Beschluss Gemeindeversammlung bzw. Gemeindeparlament", "Gemeindeordnung"), ("genehmigung", "Genehmigung durch den Kanton", "Art. 26 RPG"),
		("baubewilligung", "Baubewilligung bzw. Plangenehmigung", "Art. 22 RPG / kantonales Recht"),
	],
}
TERMIN_ARTEN = {"gemeinderat": "Gemeinderat / Gemeindeversammlung", "ausschuss": "Bau- bzw. Umweltausschuss", "buerger": "Bürgerinformation / Infoabend", "ortstermin": "Ortstermin", "frist": "Frist (Stellungnahme, Auslegung)", "sonstiges": "Sonstiger Termin"}
TERMIN_STATUS = {"geplant": "geplant", "stattgefunden": "stattgefunden", "abgesagt": "abgesagt"}
ZAHLUNG_ARTEN = {
	"par6": ("§ 6 EEG – Kommunalbeteiligung", ["DE"]), "gemeindebeitrag": ("Gemeindebeitrag (vertraglich)", ["AT", "CH"]), "pacht": ("Pacht für gemeindeeigene Fläche", ["DE", "AT", "CH"]),
	"gewerbesteuer": ("Gewerbesteuer (Prognose, nur Information)", ["DE"]), "sonstiges": ("Sonstige Zahlung", ["DE", "AT", "CH"]),
}
ZAHLUNG_STATUS = {"prognose": "Prognose", "vereinbart": "vereinbart", "abgerechnet": "abgerechnet", "gezahlt": "gezahlt"}
STELLUNGNAHME_STATUS = {"offen": "offen", "beantwortet": "beantwortet", "erledigt": "erledigt"}
MATERIAL_VORLAGEN = {"pressemitteilung": "Pressemitteilung (Entwurf)", "amtsblatt": "Text für Amtsblatt bzw. Gemeindezeitung", "faq": "Fragen und Antworten für Bürgerinnen und Bürger", "aushang": "Aushang Infoabend", "sitzungsvorlage": "Sachverhalt für die Sitzungsvorlage"}


def schritt_bereinigen(d, land):
	d = d if isinstance(d, dict) else {}
	ids = [s[0] for s in VERFAHREN.get(land, VERFAHREN["DE"])]
	sid = d.get("schritt") if d.get("schritt") in ids else ""
	if not sid:
		raise fehler("Unbekannter Verfahrensschritt.", "schritt")
	status = auswahl(d.get("status"), SCHRITT_STATUS, "offen")
	x = {"schritt": sid, "status": status, "datum": datum(d.get("datum")), "notiz": text(d.get("notiz"), 300)}
	if status == "erledigt" and not x["datum"]:
		raise fehler("Bitte geben Sie das Datum an, an dem der Schritt erledigt wurde.", "datum")
	if status == "geplant" and not x["datum"]:
		raise fehler("Bitte geben Sie den geplanten Termin an.", "datum")
	return x


def termin_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	t = {"art": auswahl(d.get("art"), TERMIN_ARTEN, ""), "titel": text(d.get("titel"), 160), "beginn": datum_zeit(d.get("beginn")), "ort": text(d.get("ort"), 200), "projektRef": text(d.get("projektRef"), 20), "status": auswahl(d.get("status"), TERMIN_STATUS, "geplant"), "notiz": mehrzeilig(d.get("notiz"), 1000), "oeffentlich": d.get("oeffentlich") is True}
	if not t["art"]:
		raise fehler("Bitte wählen Sie die Art des Termins.", "art")
	if not t["titel"]:
		raise fehler("Bitte geben Sie einen Titel an.", "titel")
	if not t["beginn"]:
		raise fehler("Bitte geben Sie Datum und Uhrzeit an.", "beginn")
	return t


def zahlung_bereinigen(d, land="DE"):
	d = d if isinstance(d, dict) else {}
	art = auswahl(d.get("art"), ZAHLUNG_ARTEN, "")
	if not art:
		raise fehler("Bitte wählen Sie die Art der Zahlung.", "art")
	if land not in ZAHLUNG_ARTEN[art][1]:
		raise fehler(f"„{ZAHLUNG_ARTEN[art][0]}“ gibt es in diesem Land nicht.", "art")
	jahr = zahl(d.get("jahr"), 2000, 2100)
	z = {"art": art, "jahr": int(jahr) if jahr else None, "status": auswahl(d.get("status"), ZAHLUNG_STATUS, "prognose"), "projektRef": text(d.get("projektRef"), 20), "kwh": None, "ctProKwh": None, "betragEur": None, "faellig": datum(d.get("faellig")), "gezahltAm": datum(d.get("gezahltAm")), "notiz": text(d.get("notiz"), 300)}
	if not z["jahr"]:
		raise fehler("Bitte geben Sie das Jahr an.", "jahr")
	if art == "par6":
		z["kwh"] = zahl(d.get("kwh"), 0, 1e11, 0)
		z["ctProKwh"] = zahl(d.get("ctProKwh"), 0.001, BETEILIGUNG_CT, 3)
		if z["ctProKwh"] is None:
			raise fehler("Der Satz nach § 6 EEG beträgt höchstens 0,2 ct/kWh.", "ctProKwh")
		if z["kwh"] is None:
			raise fehler("Bitte geben Sie die (erwartete) eingespeiste Strommenge in kWh an.", "kwh")
		z["betragEur"] = rund2(z["kwh"] * z["ctProKwh"] / 100)
	else:
		z["betragEur"] = zahl(d.get("betragEur"), 0, 1e9, 2)
		if z["betragEur"] is None:
			raise fehler("Bitte geben Sie den Betrag an.", "betragEur")
	if z["status"] == "gezahlt" and not z["gezahltAm"]:
		raise fehler("Bitte geben Sie das Zahlungsdatum an.", "gezahltAm")
	return z


def stellungnahme_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	s = {"betreff": text(d.get("betreff"), 160), "text": mehrzeilig(d.get("text"), 6000), "projektRef": text(d.get("projektRef"), 20), "frist": datum(d.get("frist"))}
	if not s["betreff"]:
		raise fehler("Bitte geben Sie einen Betreff an.", "betreff")
	if len(s["text"]) < 10:
		raise fehler("Bitte formulieren Sie die Stellungnahme bzw. Anfrage (mindestens 10 Zeichen).", "text")
	return s


def antwort_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	a = {"text": mehrzeilig(d.get("text"), 6000), "erledigt": d.get("erledigt") is True}
	if len(a["text"]) < 2:
		raise fehler("Bitte geben Sie eine Antwort ein.", "text")
	return a


def verfahren_stand(land, eintraege=None):
	eintraege = eintraege or {}
	schritte = []
	for sid, label, norm in VERFAHREN.get(land, VERFAHREN["DE"]):
		e = eintraege.get(sid) or {}
		schritte.append({"id": sid, "label": label, "norm": norm, **e, "status": e.get("status") or "offen"})
	rel = [s for s in schritte if s["status"] != "entfaellt"]
	erledigt = len([s for s in rel if s["status"] == "erledigt"])
	naechster = next((s for s in rel if s["status"] != "erledigt"), None)
	return {"schritte": schritte, "erledigt": erledigt, "gesamt": len(rel), "quotePct": round(erledigt / len(rel) * 100) if rel else 0, "naechster": naechster}


def einnahmen_summe(zahlungen):
	s = {"prognose": 0, "vereinbart": 0, "abgerechnet": 0, "gezahlt": 0, "jahre": {}}
	for z in zahlungen or []:
		b = z.get("betragEur") or 0
		if z.get("art") == "gewerbesteuer" and z.get("status") != "gezahlt":
			s["prognose"] = rund2(s["prognose"] + b)
		else:
			s[z["status"]] = rund2(s.get(z["status"], 0) + b)
		j = s["jahre"].setdefault(str(z.get("jahr")), {"prognose": 0, "fest": 0})
		if z.get("status") == "prognose":
			j["prognose"] = rund2(j["prognose"] + b)
		else:
			j["fest"] = rund2(j["fest"] + b)
	return s


def termine_sortiert(termine, jetzt=""):
	k = sorted([t for t in termine or [] if t.get("status") != "abgesagt" and t.get("beginn", "") >= jetzt], key=lambda t: t["beginn"])
	v = sorted([t for t in termine or [] if not (t.get("status") != "abgesagt" and t.get("beginn", "") >= jetzt)], key=lambda t: t.get("beginn", ""), reverse=True)
	return {"kommend": k, "vergangen": v}


def _zahl_de(x, stellen=1):
	s = f"{float(x or 0):,.{stellen}f}".replace(",", "X").replace(".", ",").replace("X", ".")
	return s.rstrip("0").rstrip(",") if "," in s else s


def material_entwurf(art, gemeinde=None, projekt=None, angebote=None, termin=None):
	"""Entwurfstext wie materialEntwurf() in cockpit.js (Inhalt gleichwertig, Formulierungen identisch gehalten)."""
	if art not in MATERIAL_VORLAGEN:
		raise fehler("Unbekannte Vorlage.", "art")
	gemeinde, p, angebote = gemeinde or {}, projekt or {}, angebote or []
	g = gemeinde.get("name") or "unserer Gemeinde"
	land = gemeinde.get("land") or "DE"
	groesse = f"rund {_zahl_de(p.get('ha'))} Hektar" if p.get("ha") else "eine noch festzulegende Fläche"
	art_text = p.get("art") or "Photovoltaik-Freiflächenanlage"
	par6 = p.get("par6") or {}
	kwp = f"etwa {_zahl_de(par6['kwp'] / 1000, 1)} MWp" if par6.get("kwp") else ""
	strom = f"rechnerisch rund {_zahl_de(par6['kwh'] / 1000, 0)} MWh im Jahr" if par6.get("kwh") else ""
	verfahren = {"DE": "Bauleitplanverfahren (Bebauungsplan, ggf. Änderung des Flächennutzungsplans)", "AT": "Umwidmungsverfahren (Flächenwidmungsplan, in der Regel Widmung „Grünland-Photovoltaik“ bzw. Sonderwidmung nach Landesrecht)"}.get(land, "Nutzungsplanverfahren (Art. 26 RPG) mit öffentlicher Auflage")
	beteiligung = ", ".join(a.get("titel") for a in angebote) if angebote else "Beteiligungsmodelle für Bürgerinnen und Bürger werden derzeit geprüft"
	if land == "DE":
		zusatz = f" – bei dieser Anlagengröße grob geschätzt {_zahl_de(par6['euroProJahr'], 0)} € im Jahr" if par6.get("euroProJahr") else ""
		p6 = f"Nach § 6 EEG kann der Betreiber der Gemeinde bis zu 0,2 ct je eingespeister Kilowattstunde zahlen{zusatz}. Zusätzlich erhält die Standortgemeinde bei Solaranlagen 90 % des Gewerbesteuermessbetrags."
	else:
		p6 = "Eine Beteiligung der Gemeinde wird vertraglich vereinbart; eine gesetzliche Kommunalabgabe wie in Deutschland gibt es nicht."
	t = ""
	if termin and termin.get("beginn"):
		b = termin["beginn"]
		t = f"{termin.get('titel') or 'Informationsabend'} am {'.'.join(reversed(b[:10].split('-')))} um {b[11:16]} Uhr" + (f", {termin['ort']}" if termin.get("ort") else "")
	phase = p.get("phase") or "Planung"
	texte = {
		"pressemitteilung": (f"{g}: Planung für {art_text} – Gemeinde informiert", [
			f"Im Gemeindegebiet von {g} wird eine {art_text} auf {groesse} geplant{f' (Leistung {kwp})' if kwp else ''}. Das Projekt befindet sich in der Phase „{phase}“.",
			f"Über die Zulässigkeit entscheidet die Gemeinde im {verfahren}. Bürgerinnen und Bürger können sich im Verfahren äußern.", p6, f"Beteiligung: {beteiligung}.",
			f"Die Gemeinde lädt zum {t} ein." if t else "Termine zur Bürgerinformation werden rechtzeitig bekannt gegeben.",
		]),
		"amtsblatt": (f"Information: Solarprojekt in {g}", [x for x in [
			f"Die Gemeinde {g} informiert über den Stand der Planung einer {art_text} ({groesse}).",
			f"Verfahren: {verfahren}. Aktueller Stand: {phase}. Die Unterlagen werden im Rahmen der gesetzlichen Beteiligung veröffentlicht.",
			f"Die Anlage würde {strom} Solarstrom erzeugen." if strom else "", p6, f"Beteiligungsmöglichkeiten: {beteiligung}.",
		] if x]),
		"faq": (f"Fragen und Antworten zum Solarprojekt in {g}", [
			"Wer entscheidet? – Die Gemeinde über die Bauleit- bzw. Flächenwidmungsplanung; ohne entsprechenden Beschluss kann nicht gebaut werden.",
			f"Was hat die Gemeinde davon? – {p6}",
			f"Kann ich mich beteiligen? – {beteiligung}. Eine Beteiligung ist eine unternehmerische Entscheidung; es gelten die jeweiligen Vertragsbedingungen.",
			"Was passiert mit der Fläche? – Die Anlage wird in der Regel auf Zeit errichtet und nach Ende der Nutzung zurückgebaut; der Rückbau wird vertraglich gesichert.",
			f"Wo gibt es Informationen? – In den öffentlichen Unterlagen des Verfahrens und bei den Terminen der Gemeinde{f' (nächster Termin: {t})' if t else ''}.",
		]),
		"aushang": (f"Einladung: Informationsabend Solarprojekt {g}", [
			f"{t}." if t else "Termin und Ort werden noch bekannt gegeben.",
			f"Themen: geplante {art_text} ({groesse}), Ablauf des Verfahrens, Landschaftsbild und Naturschutz, Nutzen für die Gemeinde, Beteiligungsmöglichkeiten.",
			"Alle Bürgerinnen und Bürger sind herzlich eingeladen. Fragen können vorab an die Gemeindeverwaltung gerichtet werden.",
		]),
		"sitzungsvorlage": (f"Sachverhalt: {art_text} in {g}", [
			f"Ein Projektentwickler beabsichtigt die Errichtung einer {art_text} auf {groesse} im Gemeindegebiet{f' mit {kwp}' if kwp else ''}.",
			f"Für die Zulässigkeit ist ein {verfahren} erforderlich. Der Gemeinderat entscheidet im Rahmen seiner Planungshoheit; ein Anspruch auf Planung besteht nicht.",
			p6, f"Beteiligung der Bürgerinnen und Bürger: {beteiligung}.", "Kosten des Verfahrens trägt nach üblicher Praxis der Vorhabenträger (städtebaulicher Vertrag bzw. Vereinbarung).",
		]),
	}
	titel, absaetze = texte[art]
	return {"art": art, "label": MATERIAL_VORLAGEN[art], "titel": titel, "absaetze": absaetze, "hinweis": "Entwurf – vor Veröffentlichung mit der Verwaltung und ÖkoInvest abstimmen. Zahlen sind grobe Schätzungen."}
