# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektentwicklung – Steuerung, reine Regeln 1:1 wie src/lib/plattform/entwicklung-steuerung.js (bei Änderungen dort hier
# nachziehen): Projektampel, Pipeline Phase × Land, Ziel-Abgleich, Kapazitätsplanung, Risikokosten, Entscheidungsvorlagen
# (Zustandsautomat, Vier-Augen-Prinzip, Folgen), Aufgaben aus fälligen Meilensteinen, Grundbuch-Sicherung, Optionsfristen.
# Ohne Frappe/Datenbank – mit `python -m unittest` testbar. Objekte sind dicts mit den Schlüsseln der Website (camelCase).
#
# Die Planwerte der Kapazitätsplanung und die Wahrscheinlichkeiten der Risikostufen sind INTERNE Planungskonventionen.

from datetime import date, timedelta

from oekoinvest_app.plattform import entwicklung_kern as K

FERTIG = ("erledigt", "entfaellt")
OFFEN = ("aktiv", "pausiert")


def _r(x, stellen=0):
	f = 10 ** stellen
	return K._js_round(float(x or 0) * f) / f if stellen else K._js_round(float(x or 0))


def _plus_tage(iso, n):
	return (date.fromisoformat(str(iso)[:10]) + timedelta(days=n)).isoformat()


# ================================================================ Projektampel

AMPEL = {"gruen": "im Plan", "gelb": "beobachten", "rot": "kritisch", "grau": "keine Daten"}
RANG = {"grau": 0, "gruen": 1, "gelb": 2, "rot": 3}
AMPEL_DIMENSIONEN = {"termin": "Termine", "kosten": "Kosten", "risiko": "Risiken", "flaeche": "Flächensicherung", "dokumente": "Dokumente & Fristen"}


def _phase_index(ph):
	return K.PHASEN_IDS.index(ph) if ph in K.PHASEN_IDS else -1


def projekt_ampel(k):
	ms = k.get("meilensteine") or {}
	if isinstance(ms, list):  # vollständige Meilensteinliste (Projektdetail) statt Kennzahlen
		ms = {"ueberfaellig": len([m for m in ms if m.get("ueberfaellig")]), "kritischUeberfaellig": len([m for m in ms if m.get("ueberfaellig") and m.get("kritisch")])}
	d = {}
	kue, ue, cod = ms.get("kritischUeberfaellig") or 0, ms.get("ueberfaellig") or 0, k.get("codVerzugMonate") or 0
	if kue > 0 or cod >= 6:
		d["termin"] = {"farbe": "rot", "grund": f"{kue} überfällig auf dem kritischen Pfad" if kue else f"COD +{cod} Monate"}
	elif ue > 0 or cod >= 1:
		d["termin"] = {"farbe": "gelb", "grund": f"{ue} Meilenstein(e) überfällig" if ue else f"COD +{cod} Monat(e)"}
	else:
		d["termin"] = {"farbe": "gruen", "grund": "Termine im Plan"}
	plan, ist = float(k.get("budgetPlan") or 0), float(k.get("budgetIst") or 0)
	if plan <= 0:
		d["kosten"] = {"farbe": "rot", "grund": "Ist-Kosten ohne freigegebenes Budget"} if ist > 0 else {"farbe": "grau", "grund": "Kein Budget erfasst"}
	else:
		q = ist / plan
		if q > 1.1:
			d["kosten"] = {"farbe": "rot", "grund": f"Budget um {K._js_round((q - 1) * 100)} % überschritten"}
		elif q > 0.9:
			d["kosten"] = {"farbe": "gelb", "grund": f"Budget zu {K._js_round(q * 100)} % ausgeschöpft"}
		else:
			d["kosten"] = {"farbe": "gruen", "grund": f"{K._js_round(q * 100)} % des Budgets verbraucht"}
	rm = int(k.get("risikoMax") or 0)
	d["risiko"] = {"farbe": "rot" if rm >= 15 else "gelb" if rm >= 8 else "gruen", "grund": f"Höchstes Risiko {rm}/25" if rm else "Keine offenen Risiken"}
	if (k.get("pruefungUeberfaellig") or 0) > 0 and d["risiko"]["farbe"] == "gruen":
		d["risiko"] = {"farbe": "gelb", "grund": f"{k['pruefungUeberfaellig']} Risikoprüfung(en) überfällig"}
	ha, ges = float(k.get("flaecheHa") or 0), float(k.get("flaecheGesichertHa") or 0)
	if ha <= 0:
		d["flaeche"] = {"farbe": "rot", "grund": "Keine Projektfläche erfasst"}
	elif ges / ha >= 0.999:
		d["flaeche"] = {"farbe": "gruen", "grund": f"{_fmt1(ges)} ha gesichert"}
	else:
		d["flaeche"] = {"farbe": "rot" if _phase_index(k.get("phase")) >= _phase_index("netz") else "gelb", "grund": f"{_fmt1(ges)} von {_fmt1(ha)} ha gesichert"}
	if (k.get("optionsfristen") or 0) > 0 and d["flaeche"]["farbe"] == "gruen":
		d["flaeche"] = {"farbe": "gelb", "grund": f"{k['optionsfristen']} Optionsfrist(en) ≤ 60 Tage"}
	dl = k.get("dokumentLuecken") or 0
	d["dokumente"] = {"farbe": "gelb", "grund": f"{dl} fällige(r) Meilenstein(e) ohne Pflichtdokument"} if dl > 0 else {"farbe": "gruen", "grund": "Pflichtdokumente vollständig"}
	schlecht = sorted([(i, x) for i, x in d.items() if x["farbe"] != "grau"], key=lambda t: -RANG[t[1]["farbe"]])
	farbe = schlecht[0][1]["farbe"] if schlecht else "grau"
	gruende = [f"{AMPEL_DIMENSIONEN[i]}: {x['grund']}" for i, x in schlecht if x["farbe"] == farbe and farbe != "gruen"]
	return {**d, "gesamt": {"farbe": farbe, "label": AMPEL[farbe], "grund": " · ".join(gruende) or "Alle Dimensionen im Plan"}}


def _fmt1(x):
	v = _r(x, 1)
	return (f"{v:.1f}".rstrip("0").rstrip(".")).replace(".", ",")


def ampel_verteilung(liste):
	z = {"gruen": 0, "gelb": 0, "rot": 0, "grau": 0}
	for a in liste:
		z[((a or {}).get("gesamt") or {}).get("farbe") or "grau"] += 1
	return z


def dokument_luecken(meilensteine, dokumente, heute, tage=30):
	bis = _plus_tage(heute, tage)
	erg = []
	for m in meilensteine:
		pflicht = m.get("dokumentPflicht") or []
		if m.get("status") in FERTIG or not m.get("sollEnde") or m["sollEnde"] > bis or not pflicht:
			continue
		if len(m.get("nachweisVerzicht") or "") >= 10:
			continue
		doks = [d for d in dokumente if d.get("meilensteinId") == m["id"]]
		if any(not any(d.get("pflicht") == pf for d in doks) for pf in pflicht):
			erg.append(m)
	return erg


# ================================================================ Pipeline-Bericht


def pipeline_matrix(projekte, laender=("DE", "AT", "CH")):
	def leer():
		return {"anzahl": 0, "mwp": 0, "mwpGewichtet": 0, "wert": 0}

	def add(z, p):
		z["anzahl"] += 1
		z["mwp"] = _r(z["mwp"] + float(p.get("mwp") or 0), 2)
		z["mwpGewichtet"] = _r(z["mwpGewichtet"] + float((p.get("pipeline") or {}).get("gewichtetMwp") or 0), 2)
		z["wert"] += float((p.get("pipeline") or {}).get("wert") or 0)

	offen = [p for p in projekte if p.get("status") in OFFEN]
	spalten = {land: leer() for land in laender}
	gesamt = leer()
	zeilen = []
	for ph in [None, *K.PHASEN_IDS]:
		zellen = {land: leer() for land in laender}
		summe = leer()
		for p in (x for x in offen if (x.get("phase") or None) == ph):
			if p.get("land") in zellen:
				add(zellen[p["land"]], p)
				add(spalten[p["land"]], p)
			add(summe, p)
			add(gesamt, p)
		zeilen.append({"phase": ph, "label": K.phase_label(ph), "zellen": zellen, "summe": summe})
	return {"zeilen": zeilen, "spalten": spalten, "gesamt": gesamt, "laender": list(laender)}


def ziel_abgleich(je_jahr, ziel=K.ZIEL_MWP_JAHR, ab_jahr=None, jahre=5):
	start = ab_jahr or date.today().year
	erg = []
	for i in range(jahre):
		jahr = start + i
		e = next((x for x in je_jahr if x.get("jahr") == jahr), {"mwp": 0, "mwpGewichtet": 0, "anzahl": 0})
		deckung = (e["mwpGewichtet"] / ziel) if ziel else 0
		erg.append({"jahr": jahr, "anzahl": e.get("anzahl") or 0, "mwp": _r(e["mwp"], 2), "mwpGewichtet": _r(e["mwpGewichtet"], 2), "ziel": ziel, "deckung": _r(deckung, 2),
			"luecke": _r(max(0, ziel - e["mwpGewichtet"]), 2), "farbe": "gruen" if deckung >= 1 else "gelb" if deckung >= 0.6 else "rot"})
	return erg


# ================================================================ Kapazitätsplanung

KAPAZITAET = {"stundenMonat": 120, "grundlastProjekt": 8, "jeMeilenstein": 6, "jeGutachten": 3, "gelbAb": 0.85, "rotAb": 1.0, "min": 10, "max": 200}


def auslastung_farbe(q):
	return "rot" if q > KAPAZITAET["rotAb"] else "gelb" if q >= KAPAZITAET["gelbAb"] else "gruen"


def _monatsliste(heute, n):
	j, m = int(heute[:4]), int(heute[5:7])
	erg = []
	for i in range(n):
		mm = m - 1 + i
		erg.append(f"{j + mm // 12}-{mm % 12 + 1:02d}")
	return erg


def kapazitaetsplan(leiter, projekte, meilensteine, heute, monate=6, planwerte=None):
	pw = planwerte or KAPAZITAET
	liste = _monatsliste(heute, monate)
	jetzt = liste[0]
	pl = {p["id"]: p for p in projekte}
	zeilen = []
	for u in leiter:
		kap = float(u.get("stundenMonat") or 0) or pw["stundenMonat"]
		eigene = [p for p in projekte if p.get("projektleiterId") == u["id"] and p.get("status") in OFFEN]
		offene = []
		for m in meilensteine:
			p = pl.get(m.get("projektId"))
			if m.get("status") in FERTIG or not p or p.get("status") not in OFFEN:
				continue
			if (m.get("verantwortlichId") or p.get("projektleiterId")) == u["id"]:
				offene.append(m)
		je = []
		for monat in liste:
			stunden, anzahl = len(eigene) * pw["grundlastProjekt"], 0
			for m in offene:
				von = str(m.get("sollStart") or m.get("sollEnde") or "")[:7]
				bis = str(m.get("sollEnde") or m.get("sollStart") or "")[:7]
				if bis and bis < jetzt:
					bis = jetzt
				if von and bis and von <= monat <= bis:
					stunden += pw["jeGutachten"] if m.get("gutachten") else pw["jeMeilenstein"]
					anzahl += 1
			q = _r(stunden / kap, 2)
			je.append({"monat": monat, "stunden": stunden, "meilensteine": anzahl, "auslastung": q, "farbe": auslastung_farbe(q)})
		spitze = max(je, key=lambda x: x["auslastung"]) if je else {"auslastung": 0, "monat": jetzt}
		zeilen.append({"id": u["id"], "name": u.get("name") or "", "stundenMonat": int(kap) if float(kap).is_integer() else kap, "individuell": bool(u.get("stundenMonat")), "projekte": len(eigene),
			"offeneMeilensteine": len(offene), "je": je, "spitze": spitze["auslastung"], "spitzeMonat": spitze["monat"], "farbe": auslastung_farbe(spitze["auslastung"]),
			"frei": max(0, kap - (je[0]["stunden"] if je else 0))})
	zeilen.sort(key=lambda z: -z["spitze"])
	return {"monate": liste, "zeilen": zeilen, "planwerte": dict(pw)}


def projektleiter_vorschlag(plan):
	z = sorted((plan or {}).get("zeilen") or [], key=lambda x: x["spitze"])
	return z[0] if z else None


# ================================================================ Risikokosten

RISIKO_WAHRSCHEINLICHKEIT = {1: 0.05, 2: 0.15, 3: 0.35, 4: 0.6, 5: 0.85}


def _stufe(x):
	return min(5, max(1, K._js_round(float(x or 1))))


def risiko_bewertung(r):
	e, a = _stufe(r.get("eintritt")), _stufe(r.get("auswirkung"))
	re = _stufe(r["restEintritt"]) if r.get("restEintritt") else None
	ra = _stufe(r["restAuswirkung"]) if r.get("restAuswirkung") else None
	kosten = max(0.0, float(r.get("kostenEur") or 0))
	return {"score": e * a, "restScore": (re or e) * (ra or a) if (re or ra) else None, "erwartet": K._js_round(kosten * RISIKO_WAHRSCHEINLICHKEIT[e]),
		"erwartetRest": K._js_round(kosten * RISIKO_WAHRSCHEINLICHKEIT[re]) if re else None}


# ================================================================ Entscheidungsvorlagen

VORLAGE_ARTEN = {
	"gate_entwicklung": {"label": "Gate 1 – Entwicklungsfreigabe", "budget": True},
	"gate_genehmigung": {"label": "Gate 2 – Genehmigungsverfahren", "budget": True},
	"gate_rtb": {"label": "Gate 3 – Baureife & Verwertung", "verwertung": True},
	"verwertung": {"label": "Verwertungsentscheidung", "verwertung": True},
	"spv": {"label": "Gründung Projektgesellschaft (SPV)"},
	"budget": {"label": "Budgeterhöhung", "budget": True},
	"abbruch": {"label": "Projektabbruch"},
}
VERWERTUNG = {
	"eigenbetrieb": {"label": "Eigenbetrieb mit Bankfinanzierung (Bestand ÖkoInvest bzw. SPV)", "folge": "Finanzierungsfall anlegen, Bankenpaket zusammenstellen und Banken anfragen (/portal/admin/finanzierung)."},
	"verkauf": {"label": "Verkauf der Projektrechte bzw. der SPV über die Projektbörse", "folge": "Übergabe an die Projektbörse vorbereiten (Exposé, Datenraum, Bieterverfahren über die Transaktion)."},
	"bau_investor": {"label": "Bau für einen Investor (Forward-Verkauf, EPC durch ÖKOVOLT)", "folge": "Investor über Projektbörse/Deal-Room gewinnen, EPC-Angebot und Forward-Kaufvertrag vorbereiten."},
}
VORLAGE_STATUS = {"entwurf": "Entwurf", "eingereicht": "Zur Entscheidung eingereicht", "genehmigt": "Genehmigt", "abgelehnt": "Abgelehnt", "zurueckgestellt": "Zurückgestellt (Nacharbeit)", "zurueckgezogen": "Zurückgezogen"}
VORLAGE_OFFEN = ("entwurf", "eingereicht", "zurueckgestellt")
VORLAGE_AKTIONEN = {
	"einreichen": {"label": "Zur Entscheidung einreichen", "von": ("entwurf", "zurueckgestellt"), "nach": "eingereicht", "wer": "schreiben", "begruendung": False},
	"zurueckziehen": {"label": "Zurückziehen", "von": ("entwurf", "eingereicht", "zurueckgestellt"), "nach": "zurueckgezogen", "wer": "schreiben", "begruendung": False},
	"genehmigen": {"label": "Genehmigen", "von": ("eingereicht",), "nach": "genehmigt", "wer": "leitung", "begruendung": False},
	"ablehnen": {"label": "Ablehnen", "von": ("eingereicht",), "nach": "abgelehnt", "wer": "leitung", "begruendung": True},
	"zurueckstellen": {"label": "Zurückstellen (Nacharbeit)", "von": ("eingereicht",), "nach": "zurueckgestellt", "wer": "leitung", "begruendung": True},
}


def vorlage_pruefen(v):
	f = []
	art = VORLAGE_ARTEN.get(v.get("art"))
	if not art:
		f.append("Bitte die Art der Vorlage wählen.")
	if len(str(v.get("titel") or "").strip()) < 5:
		f.append("Titel fehlt (mind. 5 Zeichen).")
	if len(str(v.get("beschlussvorschlag") or "").strip()) < 20:
		f.append("Beschlussvorschlag fehlt (mind. 20 Zeichen).")
	if len(str(v.get("sachverhalt") or "").strip()) < 20:
		f.append("Sachverhalt fehlt (mind. 20 Zeichen).")
	if art and art.get("budget") and not float(v.get("budgetEur") or 0) > 0:
		f.append("Bitte den beantragten Budgetbetrag angeben.")
	if art and art.get("verwertung") and v.get("empfehlung") not in VERWERTUNG:
		f.append("Bitte eine empfohlene Verwertung wählen.")
	if v.get("art") == "abbruch" and len(str(v.get("beschlussvorschlag") or "")) < 40:
		f.append("Beim Abbruch den Grund im Beschlussvorschlag ausführen (mind. 40 Zeichen).")
	return f


def vorlage_uebergang(vorlage, aktion, leitung=False, schreiben=False, nutzer_id=None, begruendung="", option=""):
	"""Liefert {ok, status, fehler, nach} wie vorlageUebergang (JS)."""
	a = VORLAGE_AKTIONEN.get(aktion)
	if not a:
		return {"ok": False, "status": 400, "fehler": "Unbekannte Aktion."}
	st = vorlage.get("status")
	if st not in a["von"]:
		return {"ok": False, "status": 409, "fehler": f"„{a['label']}“ ist im Status „{VORLAGE_STATUS.get(st, st)}“ nicht möglich."}
	if a["wer"] == "leitung" and not leitung:
		return {"ok": False, "status": 403, "fehler": "Über Entscheidungsvorlagen entscheidet die Leitung (Geschäftsführung)."}
	if a["wer"] == "schreiben" and not schreiben:
		return {"ok": False, "status": 403, "fehler": "Ihre Rolle erlaubt keine Bearbeitung von Entscheidungsvorlagen."}
	if a["wer"] == "leitung" and nutzer_id and vorlage.get("eingereichtVon") == nutzer_id:
		return {"ok": False, "status": 409, "fehler": "Vier-Augen-Prinzip: Wer die Vorlage eingereicht hat, entscheidet nicht selbst darüber."}
	if a["begruendung"] and len(str(begruendung or "").strip()) < 10:
		return {"ok": False, "status": 422, "fehler": "Bitte begründen Sie die Entscheidung (mind. 10 Zeichen)."}
	if aktion == "einreichen":
		f = vorlage_pruefen(vorlage)
		if f:
			return {"ok": False, "status": 422, "fehler": " ".join(f)}
	if aktion == "genehmigen" and (VORLAGE_ARTEN.get(vorlage.get("art")) or {}).get("verwertung"):
		if (option or vorlage.get("empfehlung")) not in VERWERTUNG:
			return {"ok": False, "status": 422, "fehler": "Bitte die gewählte Verwertung angeben."}
	return {"ok": True, "nach": a["nach"]}


def vorlage_folgen(vorlage, option=""):
	art = vorlage.get("art")
	va = VORLAGE_ARTEN.get(art) or {}
	erg = {"aufgaben": [], "budgetEur": 0, "status": None, "verwertung": None, "entscheidungArt": "go"}
	if va.get("budget") and float(vorlage.get("budgetEur") or 0) > 0:
		erg["budgetEur"] = K._js_round(float(vorlage["budgetEur"]))
	if art == "gate_entwicklung":
		erg["aufgaben"].append({"titel": "Gate 1 genehmigt: Netzanfrage stellen und Gemeindetermin vereinbaren", "tage": 14})
	if art == "gate_genehmigung":
		erg["aufgaben"].append({"titel": "Gate 2 genehmigt: Gutachter beauftragen und Planungsverfahren einleiten", "tage": 14})
	if va.get("verwertung"):
		o = option if option in VERWERTUNG else vorlage.get("empfehlung")
		erg["verwertung"] = o
		erg["entscheidungArt"] = "strategie"
		erg["aufgaben"].append({"titel": f"Verwertung „{(VERWERTUNG.get(o) or {}).get('label', o)}“ umsetzen", "text": (VERWERTUNG.get(o) or {}).get("folge", ""), "tage": 21})
	if art == "spv":
		erg["aufgaben"].append({"titel": "SPV-Gründung im Gründungsassistenten anlegen", "text": "Gesellschaftsvertrag, Notartermin, Firmenbuch/Handelsregister, WiEReG/Transparenzregister, Bankkonto: /portal/admin/gesellschaften.", "tage": 14})
	if art == "budget":
		erg["entscheidungArt"] = "budget"
	if art == "abbruch":
		erg["status"] = "abgebrochen"
		erg["entscheidungArt"] = "nogo"
		erg["aufgaben"].append({"titel": "Projektabbruch: Eigentümer, Gemeinde und Gutachter informieren, Verträge/Optionen kündigen", "tage": 14})
	return erg


# ================================================================ Aufgaben, Flächensicherung


def aufgaben_faellig(meilensteine, heute, vorlauf_tage=14):
	bis = _plus_tage(heute, vorlauf_tage)
	return [m for m in meilensteine if m.get("status") not in FERTIG and m.get("sollEnde") and m["sollEnde"] <= bis and not m.get("aufgabeId")]


GRUNDBUCH_SICHERUNG = {"keine": "Keine Eintragung", "beantragt": "Eintragung beantragt", "vorgemerkt": "Rang gesichert / vorgemerkt", "eingetragen": "Dienstbarkeit eingetragen"}
GRUNDBUCH_HINWEIS = {
	"DE": "In der Regel Vormerkung (§ 883 BGB) auf eine beschränkte persönliche Dienstbarkeit (§ 1090 BGB) mit notariell beglaubigter Bewilligung; Rangrücktritt vorrangiger Grundpfandrechte klären.",
	"AT": "In der Regel Anmerkung der Rangordnung (§§ 53 ff. GBG) bzw. Einverleibung einer Dienstbarkeit (§§ 472 ff. ABGB) mit beglaubigter Unterschrift; Zustimmung von Pfandgläubigern prüfen.",
	"CH": "In der Regel Vormerkung persönlicher Rechte (Art. 959 ZGB) bzw. Dienstbarkeit oder Baurecht (Art. 779 ZGB), Vertrag meist öffentlich beurkundet; Zustimmung von Grundpfandgläubigern prüfen.",
}


def optionsfristen(flaechen, heute, tage=60):
	erg = []
	for f in flaechen:
		if f.get("pachtStatus") == "option" and f.get("optionBis"):
			t = K.tage_zwischen(heute, f["optionBis"])
			if t <= tage:
				erg.append({**f, "inTagen": t})
	return sorted(erg, key=lambda f: f["inTagen"])


def sicherungsgrad(flaechen):
	ha = sum(float(f.get("ha") or 0) for f in flaechen)
	vertrag = sum(float(f.get("ha") or 0) for f in flaechen if f.get("pachtStatus") in ("option", "pachtvertrag"))
	gb = sum(float(f.get("ha") or 0) for f in flaechen if f.get("pachtStatus") in ("option", "pachtvertrag") and f.get("grundbuch") in ("vorgemerkt", "eingetragen"))
	return {"ha": _r(ha, 1), "vertragHa": _r(vertrag, 1), "grundbuchHa": _r(gb, 1), "vertragQuote": _r(vertrag / ha, 2) if ha else 0, "grundbuchQuote": _r(gb / ha, 2) if ha else 0}
