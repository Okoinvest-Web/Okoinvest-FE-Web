# Copyright (c) 2026, ÖkoInvest GmbH
#
# Umsatzsteuer je Land und Vorgang als KONFIGURIERBARE VORLAGEN (Spiegel von src/lib/plattform/finanzen/steuer.js).
# Vorschlag nach aktuellem Stand – ersetzt keine Steuerberatung. In ERPNext entsprechen die Vorlagen
# „Sales/Purchase Taxes and Charges Template“ (einrichtung.py legt sie an, Zuordnung über site_config/Einstellungen).
# Ohne Frappe-Import (python -m unittest).

from oekoinvest_app.plattform.finanzen.logik import rund2

HINWEIS_STEUERBERATUNG = "Steuerliche Behandlung als Vorschlag hinterlegt – mit der Steuerberatung abstimmen."

# id → (land, satz, art, label, text auf dem Beleg, Rechtsgrundlage)
STEUERVORLAGEN = {
	"AT-USt-20": ("AT", 0.2, "ust", "AT Umsatzsteuer 20 %", "", "§ 10 Abs. 1 UStG 1994"),
	"AT-Pacht-frei": ("AT", 0, "steuerfrei", "AT Pacht steuerfrei (Grundstück)", "Steuerfreie Grundstücksvermietung gemäß § 6 Abs. 1 Z 16 UStG 1994.", "§ 6 Abs. 1 Z 16 UStG 1994"),
	"AT-Pacht-Option": ("AT", 0.2, "ust", "AT Pacht mit Option zur Steuerpflicht 20 %", "Option zur Steuerpflicht gemäß § 6 Abs. 2 UStG 1994.", "§ 6 Abs. 2 UStG 1994"),
	"AT-Kleinunternehmer": ("AT", 0, "kleinunternehmer", "AT Kleinunternehmer (ohne USt)", "Umsatzsteuerbefreit – Kleinunternehmer gemäß § 6 Abs. 1 Z 27 UStG 1994.", "§ 6 Abs. 1 Z 27 UStG 1994"),
	"AT-RC-EU": ("AT", 0, "reverse_charge", "Reverse Charge EU (B2B-Dienstleistung)", "Übergang der Steuerschuld auf den Leistungsempfänger (Reverse Charge). UID des Empfängers siehe oben.", "§ 3a Abs. 6 UStG 1994, Art. 196 MwSt-Richtlinie"),
	"AT-Drittland": ("AT", 0, "nicht_steuerbar", "Nicht steuerbar in AT (Drittland)", "Nicht im Inland steuerbare Leistung (Leistungsort beim Empfänger im Drittland).", "§ 3a Abs. 6 UStG 1994"),
	"DE-USt-19": ("DE", 0.19, "ust", "DE Umsatzsteuer 19 %", "", "§ 12 Abs. 1 UStG"),
	"DE-Pacht-frei": ("DE", 0, "steuerfrei", "DE Pacht steuerfrei (Grundstück)", "Steuerfreie Verpachtung gemäß § 4 Nr. 12 Buchst. a UStG.", "§ 4 Nr. 12 Buchst. a UStG"),
	"DE-Pacht-Option": ("DE", 0.19, "ust", "DE Pacht mit Option zur Steuerpflicht 19 %", "Verzicht auf die Steuerbefreiung gemäß § 9 UStG.", "§ 9 UStG"),
	"DE-Kleinunternehmer": ("DE", 0, "kleinunternehmer", "DE Kleinunternehmer (ohne USt)", "Steuerfreier Umsatz nach § 19 Abs. 1 UStG (Kleinunternehmer).", "§ 19 UStG"),
	"DE-RC-13b": ("DE", 0, "reverse_charge", "DE Steuerschuldnerschaft des Leistungsempfängers", "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).", "§ 13b Abs. 2 Nr. 5 Buchst. a UStG (Elektrizität durch im Ausland ansässigen Unternehmer)"),
	"CH-MWST-81": ("CH", 0.081, "ust", "CH MWST 8,1 %", "", "Art. 25 MWSTG"),
	"CH-Pacht-ausgenommen": ("CH", 0, "steuerfrei", "CH Pacht von der MWST ausgenommen", "Von der Steuer ausgenommene Überlassung von Grundstücken (Art. 21 Abs. 2 Ziff. 21 MWSTG).", "Art. 21 Abs. 2 Ziff. 21 MWSTG"),
	"CH-Pacht-Option": ("CH", 0.081, "ust", "CH Pacht mit Option 8,1 %", "Option für die Versteuerung gemäß Art. 22 MWSTG.", "Art. 22 MWSTG"),
}


def steuer_vorschlag(vorgang, land, option=False, kleinunternehmer=False, grundstuecksbezug=False):
	L = land if land in ("AT", "DE", "CH") else "AT"
	hinweise = [HINWEIS_STEUERBERATUNG]
	if vorgang == "pacht":
		if kleinunternehmer and L != "CH":
			return {"vorlage": f"{L}-Kleinunternehmer", "hinweise": hinweise}
		if option:
			hinweise.append("Option nach § 9 UStG nur, wenn der Pächter das Grundstück für steuerpflichtige Umsätze nutzt – Erklärung des Eigentümers erforderlich." if L == "DE" else "Option zur Steuerpflicht nur mit ausdrücklicher Erklärung des Eigentümers.")
			return {"vorlage": f"{L}-Pacht-Option", "hinweise": hinweise}
		if L != "AT":
			hinweise.append("Grundstück außerhalb Österreichs: Leistungsort ist die Lage des Grundstücks – ggf. Registrierung/Vorsteuervergütung prüfen.")
		return {"vorlage": "CH-Pacht-ausgenommen" if L == "CH" else f"{L}-Pacht-frei", "hinweise": hinweise}
	if vorgang == "contracting":
		if L == "AT":
			return {"vorlage": "AT-USt-20", "hinweise": hinweise}
		if L == "DE":
			hinweise.append("Stromlieferung an ein Unternehmen in Deutschland durch einen im Ausland ansässigen Unternehmer: Steuerschuld geht nach § 13b UStG über – entfällt, wenn eine deutsche Betriebsstätte beteiligt ist.")
			return {"vorlage": "DE-RC-13b", "hinweise": hinweise}
		hinweise.append("Lieferung in der Schweiz: MWST-Pflicht in der Schweiz (Registrierung/Steuervertretung) prüfen.")
		return {"vorlage": "CH-MWST-81", "hinweise": hinweise}
	if grundstuecksbezug:
		hinweise.append("Vermittlung mit Grundstücksbezug: Leistungsort kann am Grundstück liegen (Art. 31a MwSt-Durchführungsverordnung).")
	if L == "AT":
		return {"vorlage": "AT-USt-20", "hinweise": hinweise}
	if L == "CH":
		return {"vorlage": "AT-Drittland", "hinweise": hinweise}
	hinweise.append("Reverse Charge nur mit gültiger UID des Empfängers (Stufe-2-Abfrage) und Angabe beider UID auf der Rechnung.")
	return {"vorlage": "AT-RC-EU", "hinweise": hinweise}


def steuer_berechnen(netto, vorlage_id):
	n = rund2(netto)
	v = STEUERVORLAGEN.get(vorlage_id)
	if not v:
		return {"vorlage": vorlage_id or None, "label": "Keine Steuervorlage", "satz": 0, "art": "unbekannt", "betrag": 0, "netto": n, "brutto": n, "text": "Steuerliche Behandlung ungeklärt – bitte Steuervorlage wählen.", "rechtsgrundlage": ""}
	_land, satz, art, label, text, grundlage = v
	betrag = rund2(n * satz)
	return {"vorlage": vorlage_id, "label": label, "satz": satz, "art": art, "betrag": betrag, "netto": n, "brutto": rund2(n + betrag), "text": text, "rechtsgrundlage": grundlage}


# Kleinbetragsrechnungen: erleichterte Pflichtangaben bis zur Bruttogrenze (DE § 33 UStDV, AT § 11 Abs. 6
# UStG 1994). Nicht bei Reverse Charge / nicht steuerbar und nicht für Gutschriften. CH nicht abgebildet.
KLEINBETRAG_GRENZEN = {"AT": (400, "§ 11 Abs. 6 UStG 1994"), "DE": (250, "§ 33 UStDV")}


def kleinbetrag_info(beleg):
	"""{kleinbetrag, grenze, norm} – ob der Beleg als Kleinbetragsrechnung gilt (Spiegel von steuer.js)."""
	a = beleg.get("aussteller") or {}
	g = KLEINBETRAG_GRENZEN.get(a.get("land"))
	try:
		brutto = float(beleg.get("brutto"))
	except (TypeError, ValueError):
		brutto = 0
	art = (beleg.get("steuer") or {}).get("art")
	klein = bool(g) and beleg.get("beleg") != "gutschrift" and 0 < brutto <= (g[0] if g else 0) and art not in ("reverse_charge", "nicht_steuerbar")
	return {"kleinbetrag": klein, "grenze": g[0] if g else None, "norm": g[1] if g else ""}


def pflichtangaben_pruefen(beleg):
	"""§ 14 Abs. 4 UStG DE / § 11 Abs. 1 UStG 1994 AT; Gutschrift § 14 Abs. 2 UStG bzw. § 11 Abs. 7 UStG 1994.

	Kleinbetragsrechnungen (KLEINBETRAG_GRENZEN) brauchen keine Empfängerangaben, in DE keinen Leistungszeitraum.
	"""
	f = []
	a = beleg.get("aussteller") or {}
	e = beleg.get("empfaenger") or beleg.get("partei") or {}
	st = beleg.get("steuer") or {}
	klein = kleinbetrag_info(beleg)["kleinbetrag"]
	if not a.get("name") or not a.get("anschrift"):
		f.append("Name und Anschrift des leistenden Unternehmers")
	if not klein and not e.get("name"):
		f.append("Name des Leistungsempfängers")
	if not klein and not e.get("anschrift"):
		f.append("Anschrift des Leistungsempfängers")
	if not klein and not a.get("uid") and not a.get("steuernummer") and beleg.get("art") != "pacht":
		f.append("UID bzw. Steuernummer des Ausstellers")
	if not beleg.get("nummer"):
		f.append("Fortlaufende Rechnungsnummer")
	if not beleg.get("rechnungsdatum"):
		f.append("Ausstellungsdatum")
	z = beleg.get("zeitraum") or {}
	if not (klein and a.get("land") == "DE") and (not z.get("von") or not z.get("bis")):
		f.append("Leistungszeitraum")
	if not beleg.get("positionen"):
		f.append("Menge und Art der Leistung")
	if beleg.get("netto") is None:
		f.append("Entgelt (netto)")
	if not st.get("vorlage"):
		f.append("Steuersatz bzw. Hinweis auf Steuerbefreiung")
	if st and st.get("satz") == 0 and not st.get("text"):
		f.append("Hinweis auf Steuerbefreiung / Reverse Charge")
	if st.get("art") == "reverse_charge" and not e.get("uid"):
		f.append("UID des Leistungsempfängers (Reverse Charge)")
	if beleg.get("beleg") == "gutschrift" and "gutschrift" not in str(beleg.get("titel") or "").lower():
		f.append("Bezeichnung „Gutschrift“")
	if a.get("land") == "AT" and float(beleg.get("brutto") or 0) > 10000 and beleg.get("beleg") != "gutschrift" and not e.get("uid"):
		f.append("UID des Empfängers (AT: Rechnungsbetrag über 10.000 €)")
	return f
