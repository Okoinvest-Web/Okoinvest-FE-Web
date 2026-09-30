# Copyright (c) 2026, ÖkoInvest GmbH
#
# Betriebsführung der Anlagen – reine Regeln, 1:1 wie src/lib/plattform/betrieb/kern.js der Website
# (bei Änderungen dort hier nachziehen). Ohne Datenbankzugriff, damit ohne Bench testbar:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_betrieb_kern
#
# SLA je Schwere · Ursachen · Ertragsausfall · Serviceaufträge und Versicherungsfälle (Zustandsautomaten) · Wartungsplan je
# Land (DE/AT/CH) · Prüfprotokoll-Bewertung (IEC 62446-1, IEC TS 62446-3) · Ersatzteilbestand · Fristen · Kennzahlen (PR,
# Verfügbarkeit) · Plausibilisierung und Freigabe von Zählerständen.
# Normen, Intervalle und Schwellen sind Orientierungswerte (Verträge, Hersteller, Gefährdungsbeurteilung gehen vor).

import calendar
import math
from datetime import date, datetime, timedelta, timezone


class BetriebFehler(Exception):
	def __init__(self, status, text):
		super().__init__(text)
		self.status = status
		self.text = text


def _ungueltig(t):
	raise BetriebFehler(422, t)


def _konflikt(t):
	raise BetriebFehler(409, t)


def _d(s):
	try:
		return date.fromisoformat(str(s)[:10])
	except (TypeError, ValueError):
		return None


def _ts(s):
	"""ISO-Zeitpunkt → aware datetime (UTC) oder None."""
	if not s:
		return None
	if isinstance(s, datetime):
		return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
	t = str(s).strip().replace("Z", "+00:00")
	try:
		d = datetime.fromisoformat(t)
	except ValueError:
		return None
	return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def tage_zwischen(von, bis):
	a, b = _d(von), _d(bis)
	return (b - a).days if a and b else None


def plus_monate(datum, monate):
	d = _d(datum)
	if not d:
		return ""
	m = d.month - 1 + int(monate or 0)
	j = d.year + m // 12
	m = m % 12 + 1
	return date(j, m, min(d.day, calendar.monthrange(j, m)[1])).isoformat()


# ================================================================ SLA

SLA_STOERUNG = {
	"kritisch": {"reaktionH": 2, "loesungH": 24},
	"hoch": {"reaktionH": 4, "loesungH": 48},
	"mittel": {"reaktionH": 24, "loesungH": 120},
	"niedrig": {"reaktionH": 48, "loesungH": 240},
	"info": {"reaktionH": 72, "loesungH": None},
}


def _frist_teil(start, stunden, erledigt, jetzt):
	if not stunden:
		return None
	bis = start + timedelta(hours=stunden)
	e = _ts(erledigt)
	m = e or jetzt
	return {
		"bis": bis.isoformat().replace("+00:00", "Z"), "erledigt": e is not None, "erfuellt": e is not None and e <= bis, "verletzt": m > bis,
		"restMin": round((bis - jetzt).total_seconds() / 60) if e is None else None, "anteilVerbraucht": max(0.0, (m - start) / (bis - start)),
	}


def sla_status(s, jetzt=None):
	"""s: dict mit schwere, erkanntAm, quittiertAm, behobenAm → {vorgabe, reaktion, loesung, ampel}"""
	jetzt = jetzt or datetime.now(timezone.utc)
	d = SLA_STOERUNG.get(s.get("schwere")) or SLA_STOERUNG["mittel"]
	start = _ts(s.get("erkanntAm"))
	if not start:
		return None
	r = _frist_teil(start, d["reaktionH"], s.get("quittiertAm"), jetzt)
	l = _frist_teil(start, d["loesungH"], s.get("behobenAm"), jetzt)
	teile = [x for x in (r, l) if x]
	offen = [x for x in teile if not x["erledigt"]]
	ampel = "rot" if any(x["verletzt"] for x in teile) else "gelb" if any(x["anteilVerbraucht"] >= 0.75 for x in offen) else "gruen"
	if any(x["verletzt"] for x in teile):
		text = "SLA verletzt (" + ", ".join(n for n, x in (("Reaktion", r), ("Lösung", l)) if x and x["verletzt"]) + ")"
	elif offen:
		n = min(offen, key=lambda x: x["restMin"])
		text = f"{'Reaktion' if n is r else 'Lösung'} bis {n['bis'][:16].replace('T', ' ')} UTC"
	else:
		text = "SLA eingehalten"
	return {"vorgabe": d, "reaktion": r, "loesung": l, "ampel": ampel, "text": text}


# ================================================================ Ursachen

URSACHEN = {
	"wechselrichter": ("Wechselrichter (Defekt, Fehlercode)", False),
	"modul": ("PV-Modul (Bruch, Hotspot, Delamination)", False),
	"dc_verkabelung": ("DC-Verkabelung / Steckverbinder", False),
	"schutzorgan": ("Schutzorgan ausgelöst (Sicherung, RCD, Überspannungsschutz)", False),
	"ueberspannung": ("Überspannung / Blitz", True),
	"netz": ("Netzstörung / Abschaltung durch Netzbetreiber", False),
	"einspeisemanagement": ("Einspeisemanagement / Redispatch (Netzbetreiber)", False),
	"kommunikation": ("Kommunikation (Datenlogger, Internet, SIM)", False),
	"speicher": ("Speicher / BMS", False),
	"witterung": ("Sturm, Hagel, Schneelast", True),
	"tiere": ("Tierverbiss (z. B. Marder)", True),
	"vandalismus": ("Vandalismus / Diebstahl", True),
	"brand": ("Brand / Feuer", True),
	"verschmutzung": ("Verschmutzung / Verschattung", False),
	"bedienung": ("Bedien- oder Montagefehler", False),
	"unbekannt": ("Unbekannt / nicht reproduzierbar", False),
}


def behebung_pruefen(ursache_kategorie, massnahme):
	if ursache_kategorie not in URSACHEN:
		_ungueltig("Bitte vor dem Beheben die Ursache auswählen (Reiter „Ursache & Ertragsausfall“).")
	if len(str(massnahme or "").strip()) < 5:
		_ungueltig("Bitte die durchgeführte Maßnahme beschreiben (mind. 5 Zeichen).")
	return True


# ================================================================ Ertragsausfall

PV_MONATSANTEILE = [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025]  # = markt.js ALLGEMEIN.pvMonatsanteile
MARKTWERT_SOLAR_CT = 4.0  # = markt.js ERLOESE.merchantCt
TAGESLAENGE_H = [8.6, 10.0, 11.9, 13.7, 15.3, 16.1, 15.7, 14.3, 12.4, 10.6, 9.0, 8.2]


def _sommerzeit(t):
	def letzter_sonntag(monat):
		d = datetime(t.year, monat, calendar.monthrange(t.year, monat)[1], 1, tzinfo=timezone.utc)
		return d - timedelta(days=(d.weekday() + 1) % 7)

	return letzter_sonntag(3) <= t < letzter_sonntag(10)


def erwartete_energie_kwh(jahres_kwh, von, bis):
	jahr = float(jahres_kwh or 0)
	if jahr <= 0 or not von or not bis or bis <= von:
		return 0.0
	schritt = timedelta(minutes=15)
	summe = 0.0
	t = von
	while t < bis:
		dt = min(schritt, bis - t)
		mitte = t + dt / 2
		so = _sommerzeit(mitte)
		lokal = mitte + timedelta(hours=2 if so else 1)
		m = lokal.month - 1
		L = TAGESLAENGE_H[m]
		mittag = 12.2 + (1 if so else 0)
		stunde = lokal.hour + lokal.minute / 60 + lokal.second / 3600
		x = (stunde - (mittag - L / 2)) / L
		if 0 < x < 1:
			tag_kwh = jahr * PV_MONATSANTEILE[m] / calendar.monthrange(lokal.year, m + 1)[1]
			summe += tag_kwh * (math.pi / (2 * L)) * math.sin(math.pi * x) * (dt.total_seconds() / 3600)
		t += dt
	return summe


def ertragsausfall(jahres_kwh, von, bis, betroffen_pct=100, arbeitspreis_ct=None, eigenverbrauch_quote=None, einspeise_ct=MARKTWERT_SOLAR_CT, jetzt=None):
	v0, b0 = _ts(von), _ts(bis)
	if not v0 or not b0:
		_ungueltig("Bitte Beginn und Ende des Ausfalls angeben.")
	if b0 <= v0:
		_ungueltig("Das Ende des Ausfalls muss nach dem Beginn liegen.")
	if b0 - v0 > timedelta(days=400):
		_ungueltig("Ausfallzeitraum höchstens 400 Tage – längere Ausfälle bitte abschnittsweise erfassen.")
	if b0 > (jetzt or datetime.now(timezone.utc)) + timedelta(minutes=5):
		_ungueltig("Das Ende des Ausfalls darf nicht in der Zukunft liegen (für laufende Ausfälle „bis jetzt“ verwenden).")
	anteil = min(100.0, max(0.0, float(betroffen_pct or 0))) / 100
	soll = erwartete_energie_kwh(jahres_kwh, v0, b0)
	ausfall = soll * anteil
	q = 0.0 if arbeitspreis_ct is None else (0.7 if eigenverbrauch_quote is None else min(1.0, max(0.0, float(eigenverbrauch_quote))))
	erloes = q * float(arbeitspreis_ct or 0) + (1 - q) * float(einspeise_ct or 0)
	return {
		"stunden": round((b0 - v0).total_seconds() / 3600, 1), "sollKwh": round(soll, 1), "ausfallKwh": round(ausfall, 1), "betroffenPct": anteil * 100,
		"eigenverbrauchQuote": q, "erloesCtKwh": round(erloes, 3), "ausfallEur": round(ausfall * erloes) / 100,
		"annahme": "Marktwert Solar (ohne Contracting-Vertrag)" if arbeitspreis_ct is None else ("Eigenverbrauchsanteil 70 % (Annahme)" if eigenverbrauch_quote is None else "Eigenverbrauchsanteil aus Monitoring"),
	}


# ================================================================ Serviceaufträge

AUFTRAG_ARTEN = {"techniker": "Eigener Techniker", "dienstleister": "O&M-Dienstleister / Elektrofachbetrieb", "hersteller": "Herstellerservice (Garantie/Gewährleistung)", "netzbetreiber": "Meldung an den Netzbetreiber"}
AUFTRAG_STATUS = {"angelegt": "Angelegt", "beauftragt": "Beauftragt", "terminiert": "Termin vereinbart", "vor_ort": "Techniker vor Ort", "erledigt": "Erledigt", "storniert": "Storniert"}
AUFTRAG_UEBERGAENGE = {
	"angelegt": ["beauftragt", "storniert"], "beauftragt": ["terminiert", "vor_ort", "erledigt", "storniert"], "terminiert": ["vor_ort", "erledigt", "storniert"],
	"vor_ort": ["erledigt"], "erledigt": [], "storniert": [],
}
AUFTRAG_OFFEN = ("angelegt", "beauftragt", "terminiert", "vor_ort")


def auftrag_uebergang(auftrag, neu, daten=None, heute=None):
	daten = daten or {}
	heute = heute or date.today().isoformat()
	alt = auftrag.get("status") or "angelegt"
	if neu not in AUFTRAG_STATUS:
		_ungueltig("Unbekannter Status.")
	if neu not in AUFTRAG_UEBERGAENGE.get(alt, []):
		_konflikt(f"Von „{AUFTRAG_STATUS[alt]}“ nach „{AUFTRAG_STATUS[neu]}“ ist nicht möglich.")
	patch = {"status": neu}
	if neu == "beauftragt":
		if len(str(auftrag.get("dienstleister") or daten.get("dienstleister") or "").strip()) < 2:
			_ungueltig("Bitte den Auftragnehmer angeben.")
		patch["beauftragtAm"] = datetime.now(timezone.utc).isoformat()
	if neu == "terminiert":
		t = str(daten.get("termin") or auftrag.get("termin") or "")
		if not _d(t):
			_ungueltig("Bitte den Termin angeben.")
		patch["termin"] = t[:16]
	if neu == "erledigt":
		bericht = str(daten.get("bericht") if daten.get("bericht") is not None else auftrag.get("bericht") or "").strip()
		if len(bericht) < 10:
			_ungueltig("Bitte einen kurzen Einsatzbericht erfassen (mind. 10 Zeichen).")
		patch["bericht"] = bericht
		patch["erledigtAm"] = str(daten.get("erledigtAm") or heute)[:10]
		if patch["erledigtAm"] > heute:
			_ungueltig("Das Erledigt-Datum darf nicht in der Zukunft liegen.")
	if neu == "storniert":
		g = str(daten.get("grund") or "").strip()
		if len(g) < 3:
			_ungueltig("Bitte einen Stornogrund angeben.")
		patch["stornoGrund"] = g
	return patch


# ================================================================ Versicherungsfall

VERSICHERUNG_ARTEN = {"allgefahren": "PV-Allgefahren- bzw. Elektronikversicherung (Sachschaden)", "ertragsausfall": "Ertragsausfall / Betriebsunterbrechung", "haftpflicht": "Betreiberhaftpflicht (Schaden Dritter)"}
VERSICHERUNG_STATUS = {"entwurf": "Entwurf", "gemeldet": "Gemeldet", "in_pruefung": "In Prüfung (Gutachter)", "reguliert": "Reguliert", "abgelehnt": "Abgelehnt", "zurueckgezogen": "Zurückgezogen"}
VERSICHERUNG_UEBERGAENGE = {
	"entwurf": ["gemeldet", "zurueckgezogen"], "gemeldet": ["in_pruefung", "reguliert", "abgelehnt", "zurueckgezogen"], "in_pruefung": ["reguliert", "abgelehnt"],
	"reguliert": [], "abgelehnt": [], "zurueckgezogen": [],
}
VERSICHERUNG_OFFEN = ("entwurf", "gemeldet", "in_pruefung")
MELDEFRIST_TAGE = 7


def meldefrist_bis(schadentag):
	d = _d(schadentag)
	return (d + timedelta(days=MELDEFRIST_TAGE)).isoformat() if d and len(str(schadentag)) == 10 else ""


def versicherung_uebergang(fall, neu, daten=None, heute=None):
	daten = daten or {}
	heute = heute or date.today().isoformat()
	alt = fall.get("status") or "entwurf"
	if neu not in VERSICHERUNG_STATUS:
		_ungueltig("Unbekannter Status.")
	if neu not in VERSICHERUNG_UEBERGAENGE.get(alt, []):
		_konflikt(f"Von „{VERSICHERUNG_STATUS[alt]}“ nach „{VERSICHERUNG_STATUS[neu]}“ ist nicht möglich.")
	f = {**fall, **{k: v for k, v in daten.items() if v is not None}}
	patch = {"status": neu}
	if neu == "gemeldet":
		if len(str(f.get("versicherer") or "").strip()) < 2:
			_ungueltig("Bitte den Versicherer angeben.")
		if not _d(f.get("schadentag")):
			_ungueltig("Bitte den Schadentag angeben.")
		if not (float(f.get("schadenEur") or 0) > 0) and not (float(f.get("ertragsausfallEur") or 0) > 0):
			_ungueltig("Bitte die geschätzte Schadenhöhe bzw. den Ertragsausfall angeben.")
		if len(str(f.get("schadenbeschreibung") or "").strip()) < 10:
			_ungueltig("Bitte den Schaden beschreiben (mind. 10 Zeichen).")
		patch["gemeldetAm"] = str(daten.get("gemeldetAm") or heute)[:10]
		if patch["gemeldetAm"] > heute:
			_ungueltig("Das Meldedatum darf nicht in der Zukunft liegen.")
		patch["verspaetet"] = bool(f.get("meldefristBis")) and patch["gemeldetAm"] > f.get("meldefristBis")
	if neu == "reguliert":
		e = daten.get("erstattetEur", f.get("erstattetEur"))
		try:
			e = float(e)
		except (TypeError, ValueError):
			e = None
		if e is None or e < 0:
			_ungueltig("Bitte den erstatteten Betrag angeben (0 möglich).")
		patch["erstattetEur"] = round(e, 2)
		patch["reguliertAm"] = heute
	if neu in ("abgelehnt", "zurueckgezogen"):
		if len(str(daten.get("grund") or "").strip()) < 3:
			_ungueltig("Bitte eine Begründung angeben.")
		patch["abschlussGrund"] = str(daten.get("grund")).strip()
	return patch


# ================================================================ Wartungsplan

_GEMEINSAM = [
	{"art": "inspektion", "bezeichnung": "Jährliche Inspektion (Sichtprüfung Module, Unterkonstruktion, Verkabelung, Wechselrichter, Schutzeinrichtungen)", "intervallMonate": 12, "norm": "IEC 62446-2 (Wartung von PV-Systemen), Herstellervorgaben", "vorlaufTage": 30},
	{"art": "thermografie", "bezeichnung": "Thermografie Module und DC-/AC-Verteiler", "intervallMonate": 12, "norm": "IEC TS 62446-3 (Aufnahme bei mindestens 600 W/m² Einstrahlung)", "vorlaufTage": 45, "hinweis": "Oft Auflage der Versicherung; Termin in die einstrahlungsreichen Monate legen."},
	{"art": "reinigung", "bezeichnung": "Modulreinigung nach Bedarf (Verschmutzungsverlust prüfen)", "intervallMonate": 24, "norm": "Herstellervorgaben (Garantiebedingungen, zulässige Reinigungsmittel)", "vorlaufTage": 30, "hinweis": "Agri-PV, Tierhaltung, Staub oder geringe Neigung: häufiger."},
	{"art": "software", "bezeichnung": "Firmware-Update Wechselrichter und Datenlogger", "intervallMonate": 12, "norm": "Herstellervorgaben; Sicherheitsupdates", "vorlaufTage": 14},
	{"art": "inspektion", "bezeichnung": "Speicher: Herstellerwartung (BMS, Klimatisierung, Brandschutz, Kapazitätstest)", "intervallMonate": 12, "norm": "Herstellervorgaben; DE: VDE-AR-E 2510-50", "vorlaufTage": 30, "nurSpeicher": True},
]
WARTUNG_VORLAGEN = {
	"DE": [{"art": "pruefung", "bezeichnung": "Wiederkehrende Prüfung der elektrischen Anlage (E-Check / DGUV Vorschrift 3)", "intervallMonate": 48, "norm": "DGUV Vorschrift 3, DIN VDE 0105-100; Prüfverfahren DIN EN 62446-1 (VDE 0126-23-1)", "vorlaufTage": 60, "hinweis": "Richtwert für ortsfeste Anlagen 4 Jahre – Intervall nach Gefährdungsbeurteilung festlegen."}, *_GEMEINSAM],
	"AT": [{"art": "pruefung", "bezeichnung": "Wiederkehrende Überprüfung der elektrischen Anlage (Prüfbefund)", "intervallMonate": 60, "norm": "ESV 2012, OVE E 8101; PV: OVE R 11-1", "vorlaufTage": 60, "hinweis": "In Arbeitsstätten in der Regel höchstens alle 5 Jahre – kürzer, wenn Betriebsstätte oder Versicherer es verlangen."}, *_GEMEINSAM],
	"CH": [{"art": "pruefung", "bezeichnung": "Periodische Kontrolle mit Sicherheitsnachweis (SiNa)", "intervallMonate": 60, "norm": "NIV, NIN (SN 411000)", "vorlaufTage": 90, "hinweis": "Kontrollperiode nach NIV-Anhang je nach Objekt – bitte objektbezogen festlegen; Kontrolle durch unabhängiges Kontrollorgan."}, *_GEMEINSAM],
}


def plan_vorschlag(anlage, vorhandene=()):
	vorlage = WARTUNG_VORLAGEN.get(anlage.get("land")) or WARTUNG_VORLAGEN["DE"]
	mit_speicher = anlage.get("typ") == "speicher" or float(anlage.get("speicherKwh") or 0) > 0
	ohne_pv = anlage.get("typ") == "speicher"
	erg = []
	for p in vorlage:
		if p.get("nurSpeicher") and not mit_speicher:
			continue
		if not p.get("nurSpeicher") and ohne_pv and p["art"] in ("thermografie", "reinigung"):
			continue
		if any(x.get("art") == p["art"] and x.get("bezeichnung") == p["bezeichnung"] for x in vorhandene):
			continue
		erg.append(dict(p))
	return erg


def naechste_faelligkeit(datum, intervall_monate):
	return plus_monate(datum, max(1, int(intervall_monate or 12)))


def plan_stand(plan, heute=None):
	heute = heute or date.today().isoformat()
	if not plan.get("aktiv"):
		return {"stufe": "inaktiv", "tage": None}
	if not plan.get("naechsteFaelligkeit"):
		return {"stufe": "faellig", "tage": 0}
	t = tage_zwischen(heute, plan["naechsteFaelligkeit"])
	vorlauf = int(plan.get("vorlaufTage") or 30)
	return {"tage": t, "stufe": "ueberfaellig" if t < 0 else "faellig" if t <= vorlauf else "geplant"}


# ================================================================ Prüfprotokoll

PRUEF_ARTEN = {"wiederkehrend": "Wiederkehrende Prüfung (E-Check / DGUV V3 / ESV / NIV)", "erstpruefung": "Erstprüfung / Inbetriebnahmeprüfung (IEC 62446-1)", "thermografie": "Thermografie (IEC TS 62446-3)", "inspektion": "Inspektion / Sichtprüfung", "reinigung": "Reinigungsnachweis"}
PRUEF_WARTUNG_ART = {"wiederkehrend": "pruefung", "erstpruefung": "pruefung", "thermografie": "thermografie", "inspektion": "inspektion", "reinigung": "reinigung"}
PRUEF_ERGEBNIS = {"bestanden": "Bestanden – ohne Mängel", "maengel": "Mängel – Betrieb zulässig, Behebung nötig", "nicht_bestanden": "Nicht bestanden – Gefahr, Anlage(nteil) freischalten"}
PRUEF_PUNKTE = {
	"sicht_module": "Module, Unterkonstruktion, Befestigung ohne Befund", "sicht_verkabelung": "Verkabelung, Steckverbinder, Kabelführung ohne Befund",
	"schutzleiter": "Durchgängigkeit Schutz- und Potentialausgleichsleiter", "ueberspannungsschutz": "Überspannungsschutz (SPD) in Ordnung",
	"rcd": "Fehlerstrom-Schutzeinrichtung (RCD) ausgelöst und in Ordnung", "wechselrichter": "Wechselrichter: Funktion, Kühlung, Anzeigen/Fehlerspeicher",
	"kennzeichnung": "Kennzeichnung, Warnhinweise, Feuerwehrplan / Abschaltstelle", "dokumentation": "Anlagendokumentation vollständig (IEC 62446-1)",
}


def mindest_isolation_mohm(uoc_v):
	try:
		u = float(uoc_v)
	except (TypeError, ValueError):
		u = 0
	return 0.5 if 0 < u <= 120 else 1.0


def _z(x):
	if x is None or x == "":
		return None
	try:
		return float(x)
	except (TypeError, ValueError):
		return None


def _de(x):
	s = f"{x:.2f}".rstrip("0").rstrip(".")
	return s.replace(".", ",")


def pruefung_bewerten(strings=(), punkte=None, thermografie=(), maengel=()):
	befunde = []
	isc = sorted(x for x in (_z(s.get("iscA")) for s in strings) if x and x > 0)
	isc_med = isc[len(isc) // 2] if isc else None
	uoc = sorted(x for x in (_z(s.get("uocV")) for s in strings) if x and x > 0)
	uoc_med = uoc[len(uoc) // 2] if uoc else None
	for s in strings:
		name = str(s.get("bezeichnung") or "String")
		u, soll, ri, i = _z(s.get("uocV")), _z(s.get("uocSollV")), _z(s.get("rIsoMOhm")), _z(s.get("iscA"))
		if ri is not None:
			mn = mindest_isolation_mohm(u)
			if ri < mn:
				befunde.append({"text": f"{name}: Isolationswiderstand {_de(ri)} MΩ unter Mindestwert {_de(mn)} MΩ (IEC 62446-1)", "stufe": "gefahr"})
		ref = soll if soll and soll > 0 else uoc_med
		if u is not None and ref and abs(u - ref) / ref > 0.05:
			befunde.append({"text": f"{name}: Leerlaufspannung {_de(u)} V weicht mehr als 5 % vom {'Sollwert' if soll and soll > 0 else 'Median der Strings'} ab – Modulanzahl, Verschaltung bzw. Bypass-Dioden prüfen", "stufe": "mangel"})
		if i is not None and isc_med and len(isc) >= 3 and abs(i - isc_med) / isc_med > 0.1:
			befunde.append({"text": f"{name}: Kurzschlussstrom weicht mehr als 10 % vom Median ab – Verschattung, Verschmutzung oder Moduldefekt prüfen (Einstrahlung während der Messung beachten)", "stufe": "hinweis"})
	for k, ok in (punkte or {}).items():
		if ok is False and k in PRUEF_PUNKTE:
			befunde.append({"text": f"Prüfpunkt nicht in Ordnung: {PRUEF_PUNKTE[k]}", "stufe": "gefahr" if k in ("schutzleiter", "rcd") else "mangel"})
	for t in thermografie:
		dk = _z(t.get("deltaK"))
		if dk is None:
			continue
		ort = str(t.get("ort") or "Befund")
		if dk > 20:
			befunde.append({"text": f"Thermografie {ort}: ΔT {_de(dk)} K – kurzfristig beheben", "stufe": "mangel"})
		elif dk >= 10:
			befunde.append({"text": f"Thermografie {ort}: ΔT {_de(dk)} K – Maßnahme planen", "stufe": "mangel"})
		elif dk > 0:
			befunde.append({"text": f"Thermografie {ort}: ΔT {_de(dk)} K – beobachten", "stufe": "hinweis"})
	for m in maengel:
		t = str(m.get("text") or "").strip()
		if t:
			befunde.append({"text": t, "stufe": "gefahr" if m.get("schwere") == "gefahr" else "hinweis" if m.get("schwere") == "gering" else "mangel"})
	ergebnis = "nicht_bestanden" if any(b["stufe"] == "gefahr" for b in befunde) else "maengel" if any(b["stufe"] == "mangel" for b in befunde) else "bestanden"
	return {"ergebnis": ergebnis, "befunde": befunde}


# ================================================================ Ersatzteile

ERSATZTEIL_BEWEGUNG = {"zugang": "Zugang (Lieferung)", "entnahme": "Entnahme (Einsatz)", "korrektur": "Inventurkorrektur"}


def bestand_nach(bestand, art, menge):
	if art not in ERSATZTEIL_BEWEGUNG:
		_ungueltig("Unbekannte Bewegungsart.")
	m = _z(menge)
	if m is None or m < 0 or (art != "korrektur" and m == 0):
		_ungueltig("Bitte eine gültige Menge angeben.")
	alt = float(bestand or 0)
	neu = alt + m if art == "zugang" else alt - m if art == "entnahme" else m
	if neu < 0:
		_konflikt(f"Nicht genug auf Lager (Bestand {_de(alt)}).")
	return round(neu, 3)


def nachbestellung(teil):
	mn = float(teil.get("mindestbestand") or 0)
	b = float(teil.get("bestand") or 0)
	if mn <= 0 or b > mn:
		return None
	ziel = max(float(teil.get("zielbestand") or 0), mn * 2, mn + 1)
	return {"menge": round(ziel - b, 3), "grund": "Kein Bestand" if b == 0 else f"Bestand {_de(b)} ≤ Mindestbestand {_de(mn)}"}


# ================================================================ Fristen

def frist_stufe(tage):
	if tage is None:
		return "fehlt"
	return "ueberfaellig" if tage < 0 else "dringend" if tage <= 30 else "bald" if tage <= 90 else "spaeter"


def fristen_ermitteln(anlage, komponenten=(), messpunkte=(), plaene=(), versicherungen=(), heute=None):
	heute = heute or date.today().isoformat()
	liste = []

	def add(art, titel, datum, bezug, horizont=180):
		t = tage_zwischen(heute, datum) if datum else None
		if t is not None and t > horizont:
			return
		liste.append({"art": art, "titel": titel, "datum": datum or "", "tage": t, "stufe": frist_stufe(t), "bezug": bezug, "anlageId": anlage.get("id")})

	for m in messpunkte:
		if m.get("abrechnungsrelevant"):
			add("eichung", f"Eichgültigkeit Zähler {m.get('zaehlernummer')}{'' if m.get('eichgueltigBis') else ' – nicht gepflegt'}", m.get("eichgueltigBis") or "", {"art": "messpunkt", "id": m.get("id")}, 365)
	for k in komponenten:
		if k.get("garantieBis"):
			add("garantie", " ".join(str(x) for x in ("Garantieende", k.get("hersteller") or "", k.get("modell") or k.get("art") or "") if x).strip(), k["garantieBis"], {"art": "komponente", "id": k.get("id")}, 180)
	for p in plaene:
		if p.get("aktiv"):
			add("wartung", p.get("bezeichnung"), p.get("naechsteFaelligkeit") or heute, {"art": "plan", "id": p.get("id")}, max(90, int(p.get("vorlaufTage") or 30)))
	for f in versicherungen:
		if f.get("status") == "entwurf" and f.get("meldefristBis"):
			add("versicherung", f"Meldefrist Versicherungsfall {f.get('versicherer') or ''}".strip(), f["meldefristBis"], {"art": "versicherung", "id": f.get("id")}, 60)
	rang = {"ueberfaellig": 0, "fehlt": 1, "dringend": 2, "bald": 3, "spaeter": 4}
	return sorted(liste, key=lambda f: (rang[f["stufe"]], f["tage"] if f["tage"] is not None else -1e9))


# ================================================================ Kennzahlen

def kennzahlen(kwp=0, ist_kwh=None, soll_kwh=None, einstrahlung_kwh_m2=None, ausfall_kwh=0):
	ist = _z(ist_kwh)
	soll = _z(soll_kwh) or 0
	H = _z(einstrahlung_kwh_m2) or 0
	p = _z(kwp) or 0
	pr = ist / (p * H) if ist is not None and H > 0 and p > 0 else None
	return {
		"istKwh": ist, "sollKwh": soll if soll > 0 else None, "performanceIndex": ist / soll if ist is not None and soll > 0 else None,
		"spezErtragKwhKwp": ist / p if ist is not None and p > 0 else None, "pr": pr, "prPlausibel": None if pr is None else 0.5 <= pr <= 1.0,
		"verfuegbarkeit": min(1.0, max(0.0, 1 - float(ausfall_kwh or 0) / soll)) if soll > 0 else None, "ausfallKwh": float(ausfall_kwh or 0),
	}


# ================================================================ Zählerstände plausibilisieren / freigeben

def _monatsende(monat):
	try:
		j, m = int(str(monat)[:4]), int(str(monat)[5:7])
		return date(j, m, calendar.monthrange(j, m)[1]).isoformat()
	except (TypeError, ValueError):
		return ""


def plausibilisieren(monat, menge=None, monitoring_kwh=None, soll_kwh=None, eichgueltig_bis="", ist_erzeugung=False):
	befunde = []
	eich = False
	ende = _monatsende(monat)
	if not eichgueltig_bis:
		befunde.append({"text": "Eichgültigkeit des Zählers nicht gepflegt – bitte am Messpunkt nachtragen.", "stufe": "warnung"})
	elif ende and ende > str(eichgueltig_bis)[:10]:
		eich = True
		befunde.append({"text": f"Eichfrist am {str(eichgueltig_bis)[:10]} abgelaufen – Messwerte dürfen in der Regel nicht abgerechnet werden (DE § 33 MessEG, AT MEG, CH MessMV).", "stufe": "fehler"})
	m = _z(menge)
	if m is None:
		befunde.append({"text": "Erster Monatswert dieses Registers – die Menge ergibt sich ab dem Folgemonat.", "stufe": "hinweis"})
	mon = _z(monitoring_kwh) or 0
	if m is not None and mon > 0:
		abw = (m - mon) / mon
		if abs(abw) > 0.25:
			befunde.append({"text": f"Abweichung zum Monitoring {abw * 100:.1f} % – Ablesung, Wandlerfaktor und Zählerzuordnung prüfen.".replace(".", ",", 1), "stufe": "fehler"})
		elif abs(abw) > 0.1:
			befunde.append({"text": f"Abweichung zum Monitoring {abw * 100:.1f} %.".replace(".", ",", 1), "stufe": "warnung"})
	soll = _z(soll_kwh) or 0
	if ist_erzeugung and m is not None and soll > 0 and (m < soll * 0.5 or m > soll * 1.5):
		befunde.append({"text": f"Erzeugung {round(m / soll * 100)} % der Prognose – Ausfälle bzw. Ablesung prüfen.", "stufe": "warnung"})
	rang = {"ok": 0, "hinweis": 1, "warnung": 2, "fehler": 3}
	stufe = "ok"
	for b in befunde:
		if rang[b["stufe"]] > rang[stufe]:
			stufe = b["stufe"]
	return {"stufe": stufe, "befunde": befunde, "eichFehler": eich, "abrechenbar": not eich}


def freigabe_pruefen(befund, begruendung=""):
	if (befund or {}).get("eichFehler"):
		_konflikt("Freigabe nicht möglich: Die Eichfrist des Zählers ist abgelaufen.")
	if (befund or {}).get("stufe") == "fehler" and len(str(begruendung or "").strip()) < 10:
		_ungueltig("Der Wert ist auffällig – bitte die Freigabe begründen (mind. 10 Zeichen).")
	return True
