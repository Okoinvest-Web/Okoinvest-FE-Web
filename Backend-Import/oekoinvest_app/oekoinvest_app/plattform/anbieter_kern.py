# Copyright (c) 2026, ÖkoInvest GmbH
#
# Anbieter / Verkäufer – reine Regeln (ohne Frappe lauffähig), 1:1 aus
#   src/lib/plattform/anbieter/regeln.js  (Vermittlungsauftrag, Prüfpunkte, Anonymisierung, LOI-Stellungnahme, Vorkenntnis, Sperren)
#   src/lib/plattform/anbieter/bestand.js (Bestandsanlage: Ertragshistorie, Verträge, Förderung, technische DD)
#
# Test ohne Bench:  cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_anbieter_kern
# Alle Vertragstexte sind MUSTER/ENTWURF zur anwaltlichen Prüfung – keine Rechtsberatung.

import calendar
import datetime
import hashlib
import json
import math
import re
from zoneinfo import ZoneInfo

ANB_SCHEMA = 1
WIEN = ZoneInfo("Europe/Vienna")


class AnbieterFehler(ValueError):
	def __init__(self, status, message, code=""):
		super().__init__(message)
		self.status = status
		self.code = code


def _pflicht(b, msg, status=422, code=""):
	if not b:
		raise AnbieterFehler(status, msg, code)


# ================================================================ Hilfen

_STEUER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def mehrzeilig(v, maximal):
	if v is None or isinstance(v, (dict, list, bool)):
		return ""
	return _STEUER.sub("", str(v)).replace("\r\n", "\n").replace("\r", "\n").strip()[:maximal]


def text(v, maximal):
	return re.sub(r"\s+", " ", mehrzeilig(v, maximal))


def auswahl(v, erlaubt, std=""):
	return v if isinstance(v, str) and v in erlaubt else std


def _rund(n, stellen):
	r = math.floor(n * 10**stellen + 0.5) / 10**stellen
	return int(r) if stellen == 0 else r


def zahl(v, mn, mx, stellen=2):
	if v is None or v == "" or isinstance(v, (bool, dict, list)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", ".", 1))
	except ValueError:
		return None
	if not math.isfinite(n) or n < mn or n > mx:
		return None
	return _rund(n, stellen)


def ist_datum(s):
	if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
		return False
	try:
		datetime.date.fromisoformat(s)
		return True
	except ValueError:
		return False


def datum_oder(s):
	return s if ist_datum(s) else ""


def tag_von(iso):
	"""Kalendertag (YYYY-MM-DD) eines ISO-Zeitpunkts in Europe/Vienna."""
	if not iso:
		return ""
	if isinstance(iso, datetime.datetime):
		d = iso
	else:
		s = str(iso).replace("Z", "+00:00")
		if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
			return s
		try:
			d = datetime.datetime.fromisoformat(s)
		except ValueError:
			return str(iso)[:10]
	if d.tzinfo is None:
		d = d.replace(tzinfo=datetime.timezone.utc)
	return d.astimezone(WIEN).date().isoformat()


def heute_wien():
	return datetime.datetime.now(WIEN).date().isoformat()


def tage_plus(datum, tage):
	return (datetime.date.fromisoformat(datum) + datetime.timedelta(days=tage)).isoformat()


def werktage_plus(datum, n):
	"""n Werktage (Mo–Fr) nach `datum` – Feiertage bleiben unberücksichtigt."""
	d = datetime.date.fromisoformat(datum)
	rest = max(0, int(n))
	while rest > 0:
		d += datetime.timedelta(days=1)
		if d.weekday() < 5:
			rest -= 1
	return d.isoformat()


def monate_plus(datum, monate):
	d = datetime.date.fromisoformat(datum)
	j, m = d.year + (d.month - 1 + monate) // 12, (d.month - 1 + monate) % 12 + 1
	return datetime.date(j, m, min(d.day, calendar.monthrange(j, m)[1])).isoformat()


def monatsende(datum):
	d = datetime.date.fromisoformat(datum)
	return datetime.date(d.year, d.month, calendar.monthrange(d.year, d.month)[1]).isoformat()


def de_zahl(x, stellen=3):
	"""Zahl wie toLocaleString("de-DE", {maximumFractionDigits}) – Tausenderpunkt, Dezimalkomma."""
	if x is None:
		return ""
	r = _rund(float(x), stellen)
	neg = r < 0
	ganz, _, bruch = f"{abs(r):.{stellen}f}".partition(".")
	bruch = bruch.rstrip("0")
	ganz = f"{int(ganz):,}".replace(",", ".")
	return ("-" if neg else "") + ganz + ("," + bruch if bruch else "")


def _pct(x):
	return f"{de_zahl(x * 100, 1)} %"


def _tag_de(d):
	return "-".join(reversed(str(d)[:10].split("-"))).replace("-", ".") if d else ""


def sha256_hex(s):
	return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ================================================================ 1. Vermittlungsauftrag

MANDAT_VERSION = "2026-09-entwurf"
MANDAT_ARTEN = {
	"einfach": {"label": "Einfacher Vermittlungsauftrag"},
	"exklusiv": {"label": "Alleinvermittlungsauftrag (Exklusivität)"},
}
MANDAT_DAUER = [3, 6, 9, 12]
MANDAT_STATUS = {
	"keiner": "Kein Auftrag",
	"wirksam": "Wirksam",
	"wartet": "Exklusivität wartet auf Gegenbestätigung",
	"gekuendigt": "Gekündigt",
}
MANDAT_HINWEIS = "Muster/Entwurf – der Wortlaut wird vor dem Livegang anwaltlich geprüft. Maßgeblich sind die Besonderen Bedingungen der Projektbörse und die Nutzungsbedingungen."

_NAME = re.compile(r"^[^\W\d_](?:[^\W\d_]|[ .'’-])*$")


def _nur_buchstaben(s):
	return re.sub(r"[\W\d_]", "", str(s).lower().replace("(demo)", ""))


def mandat_eingabe(d, konto_name=""):
	d = d if isinstance(d, dict) else {}
	art = auswahl(d.get("art"), MANDAT_ARTEN, "")
	_pflicht(art, "Bitte wählen Sie die Art des Vermittlungsauftrags.")
	try:
		dauer = int(float(d.get("dauerMonate"))) if d.get("dauerMonate") not in (None, "") else None
	except (TypeError, ValueError):
		dauer = None
	dauer_monate = (dauer if dauer in MANDAT_DAUER else None) if art == "exklusiv" else None
	_pflicht(art != "exklusiv" or dauer_monate, f"Bitte wählen Sie die Mindestlaufzeit der Exklusivität ({', '.join(str(x) for x in MANDAT_DAUER)} Monate).")
	roh = d.get("vorbehalte")
	liste = roh if isinstance(roh, list) else str(roh or "").split("\n")
	vorbehalte = [t for t in (text(x, 120) for x in liste) if t][:20]
	name = text(d.get("name"), 80)
	_pflicht(len(name) >= 2 and _NAME.match(name), "Bitte geben Sie Ihren vollständigen Namen als Unterschrift ein.")
	if konto_name:
		teile = re.sub(r"\(demo\)", "", str(konto_name), flags=re.I).strip().split()
		nachname = _nur_buchstaben(teile[-1] if teile else "")
		_pflicht(not nachname or nachname in _nur_buchstaben(name), "Der getippte Name muss Ihren Nachnamen laut Konto enthalten.")
	_pflicht(d.get("zustimmung") is True, "Bitte bestätigen Sie, dass Sie den Vermittlungsauftrag erteilen.")
	return {"art": art, "dauerMonate": dauer_monate, "vorbehalte": vorbehalte, "name": name}


def _prozent_de(x, stellen):
	return de_zahl(x * 100, stellen)


def mandat_text(projekt=None, mandat=None, anbieter=None, provision=None):
	"""Wortlaut des Vermittlungsauftrags – identisch zu mandatText (regeln.js)."""
	p = projekt or {}
	m = mandat or {}
	a = anbieter or {}
	pv = provision or {"min": 0.015, "max": 0.03}
	von, bis = _prozent_de(pv["min"], 1), _prozent_de(pv["max"], 1)
	satz = f"{_prozent_de(p['provisionSatz'], 2)} %" if p.get("provisionSatz") is not None else f"zwischen {von} und {bis} % (Festlegung bei der Freigabe)"
	person = " ".join(x for x in (a.get("vorname"), a.get("nachname")) if x)
	wer = ", ".join(x for x in (a.get("firma"), person) if x) or "Anbieter"
	art_label = MANDAT_ARTEN.get(m.get("art"), {}).get("label", "–")
	if m.get("art") == "exklusiv":
		art_text = (
			f"Mindestlaufzeit der Exklusivität: {m.get('dauerMonate')} Monate ab Gegenbestätigung durch ÖkoInvest; danach endet sie mit Kündigung durch eine Seite zum Ende des laufenden Monats. "
			"Während der Exklusivität bietet der Auftraggeber das Projekt nicht über andere Vermittler oder Plattformen an und leitet eigene Interessenten an ÖkoInvest weiter; "
			"ÖkoInvest spricht passende Investoren aktiv an und berichtet regelmäßig über Zugriffe und Interessenten."
		)
	else:
		art_text = "Der Auftraggeber bleibt frei, das Projekt selbst oder über andere Wege anzubieten."
	vb = m.get("vorbehalte") or []
	return [
		f"Auftraggeber: {wer}. Auftragnehmer: ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething (AT). Gegenstand: Nachweis und Vermittlung von Investoren für das Projekt {p.get('id') or ''} „{p.get('titel') or ''}“ über die Projektbörse.",
		f"Art des Auftrags: {art_label}. {art_text}",
		f"Provision: {satz} der Bemessungsgrundlage nach § 3 der Besonderen Bedingungen der Projektbörse, zuzüglich Umsatzsteuer, soweit diese anfällt. Die Provision entsteht nur bei wirksamem Abschluss eines Vertrags über das Projekt mit einem von ÖkoInvest nachgewiesenen oder vermittelten Investor; ohne Abschluss entstehen keine Kosten.",
		"Nachweis und Vorkenntnis: Als nachgewiesen gilt ein Investor, dem die Projektdetails über die Plattform freigeschaltet wurden. War er dem Auftraggeber für genau dieses Projekt bereits als Interessent bekannt, meldet der Auftraggeber dies unter Nachweis innerhalb von zehn Werktagen, nachdem ihm der Interessent (auch pseudonym) angezeigt wurde (§ 4 der Besonderen Bedingungen).",
		f"Bereits bekannte Interessenten (Vorbehaltsliste, nur für ÖkoInvest einsehbar): {'; '.join(vb)}." if vb else "Bereits bekannte Interessenten (Vorbehaltsliste): keine angegeben.",
		"Umgehungsschutz: Der Provisionsanspruch besteht auch bei Abschluss unter Umgehung der Plattform innerhalb von 24 Monaten nach Freischaltung der Projektdetails (§ 5 der Besonderen Bedingungen). Er besteht nach Rückzug oder Kündigung für bereits nachgewiesene Investoren fort.",
		"Pflichten des Auftraggebers: richtige und vollständige Angaben, Verfügungsbefugnis über das Projekt, aktueller Datenraum, fristgerechte Antworten auf moderierte Fragen und gleiche Information aller zugelassenen Interessenten (§ 7 der Besonderen Bedingungen, § 5 der Nutzungsbedingungen).",
		"Laufzeit und Kündigung: Der Auftrag ist jederzeit mit Wirkung für die Zukunft kündbar, sofern das Projekt nicht veröffentlicht oder reserviert ist. Eine Exklusivität kann frühestens zum Ende der Mindestlaufzeit, danach zum Ende eines Monats beendet werden; der Auftrag gilt dann als einfacher Vermittlungsauftrag weiter.",
		f"Erklärung: Der Auftraggeber erteilt den Auftrag durch Eingabe seines Namens im Portal (einfache elektronische Signatur); Zeitpunkt, IP-Adresse und die SHA-256-Prüfsumme dieses Wortlauts (Version {MANDAT_VERSION}) werden protokolliert.",
	]


def mandat_hash(absaetze):
	"""SHA-256 wie im Demo-Backend: JSON.stringify({version, absaetze})."""
	return sha256_hex(json.dumps({"version": MANDAT_VERSION, "absaetze": absaetze}, ensure_ascii=False, separators=(",", ":")))


def mandat_stand(mandat, heute):
	leer = {"status": "keiner", "exklusivAktiv": False, "mindestBis": "", "exklusivEndetAm": "", "endetAm": ""}
	if not mandat or not mandat.get("erteiltAm"):
		return leer
	basis = {"mindestBis": mandat.get("mindestBis") or "", "exklusivEndetAm": mandat.get("exklusivEndetAm") or "", "endetAm": mandat.get("endetAm") or ""}
	if mandat.get("gekuendigtAm") and (not mandat.get("endetAm") or mandat["endetAm"] <= heute):
		return {**basis, "status": "gekuendigt", "exklusivAktiv": False}
	if mandat.get("art") == "exklusiv" and not mandat.get("bestaetigtAm"):
		return {**basis, "status": "wartet", "exklusivAktiv": False}
	ende = mandat.get("exklusivEndetAm")
	return {**basis, "status": "wirksam", "exklusivAktiv": mandat.get("art") == "exklusiv" and not (ende and ende < heute)}


def exklusivitaet_ende(mandat, heute):
	m = mandat or {}
	_pflicht(m.get("erteiltAm") and not m.get("gekuendigtAm") and m.get("art") == "exklusiv" and m.get("bestaetigtAm"), "Es besteht keine bestätigte Exklusivität.", 409)
	_pflicht(not m.get("exklusivEndetAm"), "Die Exklusivität ist bereits beendet bzw. gekündigt.", 409)
	ende = monatsende(heute)
	return m["mindestBis"] if m.get("mindestBis") and m["mindestBis"] > ende else ende


def mandat_kuendigung(mandat, heute, projekt_status):
	m = mandat or {}
	_pflicht(m.get("erteiltAm") and not m.get("gekuendigtAm"), "Es besteht kein kündbarer Vermittlungsauftrag.", 409)
	_pflicht(projekt_status not in ("veroeffentlicht", "reserviert"), "Nehmen Sie das Projekt zuerst von der Börse, bevor Sie den Auftrag kündigen.", 409)
	st = mandat_stand(m, heute)
	if st["exklusivAktiv"]:
		bis = st["exklusivEndetAm"] or st["mindestBis"]
		_pflicht(bis and bis < heute, f"Die Exklusivität läuft noch bis {_tag_de(bis) if bis else 'zur Beendigung'} – beenden Sie zuerst die Exklusivität.", 409)
	return heute


# ================================================================ 2. Prüfpunkte

PRUEFPUNKT_BEREICHE = {
	"datenblatt": "Datenblatt",
	"unterlagen": "Unterlagen / Datenraum",
	"anonymitaet": "Anonymisierung Teaser",
	"recht": "Rechte & Verfügungsbefugnis",
	"wirtschaft": "Preis & Wirtschaftlichkeit",
	"sonstiges": "Sonstiges",
}
PRUEFPUNKT_STATUS = {
	"offen": {"label": "Offen bei Ihnen", "labelBo": "Offen beim Anbieter", "ton": "warn"},
	"beantwortet": {"label": "Beantwortet – in Prüfung", "labelBo": "Beantwortet – bitte prüfen", "ton": "info"},
	"erledigt": {"label": "Erledigt", "labelBo": "Erledigt", "ton": "ok"},
	"verworfen": {"label": "Entfällt", "labelBo": "Entfällt", "ton": "neutral"},
}
PRUEFPUNKT_FRIST = {"standard": 7, "min": 1, "max": 30}
PRUEFPUNKTE_MAX = 60

_PP_AKTIONEN = {
	"antworten": ("anbieter", ("offen",), "beantwortet"),
	"erledigt": ("backoffice", ("offen", "beantwortet"), "erledigt"),
	"erneut": ("backoffice", ("beantwortet", "erledigt"), "offen"),
	"verwerfen": ("backoffice", ("offen", "beantwortet"), "verworfen"),
}


def pruefpunkt_eingabe(d, heute):
	d = d if isinstance(d, dict) else {}
	bereich = auswahl(d.get("bereich"), PRUEFPUNKT_BEREICHE, "")
	_pflicht(bereich, "Bitte wählen Sie einen Bereich.")
	t = mehrzeilig(d.get("text"), 1500)
	_pflicht(len(t) >= 10, "Bitte beschreiben Sie die Rückfrage (mind. 10 Zeichen).")
	tage = zahl(d.get("fristTage"), PRUEFPUNKT_FRIST["min"], PRUEFPUNKT_FRIST["max"], 0)
	tage = PRUEFPUNKT_FRIST["standard"] if tage is None else tage
	return {"bereich": bereich, "text": t, "pflicht": d.get("pflicht") is not False, "fristAm": tage_plus(heute, tage)}


def pruefpunkt_aktion(punkt, aktion, wer, antwort=None, kommentar=None):
	regel = _PP_AKTIONEN.get(aktion)
	_pflicht(regel, "Unbekannte Aktion.", 400)
	_pflicht(regel[0] == wer, "Diesen Schritt dürfen Sie nicht auslösen.", 403)
	status = punkt.get("status")
	_pflicht(status in regel[1], f"Der Prüfpunkt ist „{PRUEFPUNKT_STATUS.get(status, {}).get('labelBo', status)}“ – dieser Schritt ist nicht möglich.", 409)
	out = {"status": regel[2]}
	if aktion == "antworten":
		a = mehrzeilig(antwort, 3000)
		_pflicht(len(a) >= 5, "Bitte geben Sie eine Antwort ein (mind. 5 Zeichen).")
		out["antwort"] = a
	if aktion == "erneut":
		k = mehrzeilig(kommentar, 1000)
		_pflicht(len(k) >= 5, "Bitte begründen Sie, was noch fehlt (mind. 5 Zeichen).")
		out["kommentar"] = k
	if aktion in ("erledigt", "verwerfen"):
		out["kommentar"] = mehrzeilig(kommentar, 1000)
	return out


def pruefpunkte_offen(punkte):
	return [p for p in (punkte or []) if p.get("status") == "offen"]


def pruefpunkte_ungeklaert(punkte):
	return [p for p in (punkte or []) if p.get("pflicht") and p.get("status") not in ("erledigt", "verworfen")]


# ================================================================ 3. Anonymisierung Teaser

_KONTAKT = [
	(re.compile(r"[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,120}\.[A-Z]{2,24}", re.I), "E-Mail-Adresse"),
	(re.compile(r"\b(?:https?://|www\.)\S+", re.I), "Link / Webadresse"),
	(re.compile(r"(?<![\d.,])(?<!\d[ .,])(?:\+|00)\d[\d ()/.-]{6,20}\d"), "Telefonnummer"),
	(re.compile(r"(?<![\d.,])(?<!\d[ .,])\b0\d{2,5}(?:[ /.-]?\d){4,14}\b"), "Telefonnummer"),
]
_KRITISCH = [
	(re.compile(r"\b(?:flurst(?:ü|ue)cks?|fl\.?\s?-?\s?nr\.?|parzellen?|grundst(?:ü|ue)cks?-?\s?nr\.?|gst\.?\s?-?\s?nr\.?|einlagezahl|ez)\s*[:.]?\s*\d", re.I), "Flurstücks-/Grundstücksnummer"),
	(re.compile(r"\b\d{1,2}[.,]\d{4,}\s*[,;/]?\s*°?\s*[NS]?\s*[,;/ ]\s*\d{1,3}[.,]\d{4,}", re.I), "Koordinaten"),
	(re.compile(r"\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|gasse|weg|platz|allee)\s+\d+"), "Straßenadresse"),
]
_WARNUNG = [(re.compile(r"\b(?:D-|A-|CH-)\d{4,5}\b|\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]{2,}"), "mögliche Postleitzahl mit Ort")]


def _norm(s):
	return " " + re.sub(r"[^\w/]+|_+", " ", str(s or "").lower()).strip() + " "


def _enthaelt(heu, phrase):
	p = _norm(phrase).strip()
	return len(p) >= 4 and f" {p} " in heu


def _oeffentlich(p):
	hl = p.get("highlights")
	hl = hl if isinstance(hl, list) else []
	felder = [("titel", "Titel", p.get("titel")), ("region", "Region", p.get("region")), ("beschreibung", "Beschreibung", p.get("beschreibung")), ("highlights", "Highlights", " · ".join(str(x) for x in hl))]
	return [f for f in felder if f[2]]


def anonymitaet_pruefen(p, anbieter=None):
	p = p or {}
	vt = p.get("vertraulich") if isinstance(p.get("vertraulich"), dict) else {}
	treffer = []

	def add(stufe, feld, t):
		if not any(x["feld"] == feld and x["text"] == t for x in treffer):
			treffer.append({"stufe": stufe, "feld": feld, "text": t})

	for feld, label, roh in _oeffentlich(p):
		s = str(roh)
		n = _norm(s)
		for k, l in (("gemeinde", "Gemeinde"), ("gemarkung", "Gemarkung / Katastralgemeinde")):
			for teil in re.split(r"[,;/]| und ", str(vt.get(k) or "")):
				if _enthaelt(n, teil):
					add("kritisch", feld, f"{label} nennt die vertrauliche Angabe „{l}“ ({text(teil, 60)}).")
		for fs in re.split(r"[,;\s]+", str(vt.get("flurstuecke") or "")):
			if not re.search(r"\d", fs) or len(fs) < 3 or not re.search(r"(^|[^\d/])" + re.escape(fs) + r"($|[^\d/])", s):
				continue
			if "/" in fs:
				add("kritisch", feld, f"{label} nennt ein vertrauliches Flurstück ({fs}).")
			else:
				add("warnung", feld, f"{label} nennt eine Zahl, die einem vertraulichen Flurstück entspricht ({fs}).")
		for k, l in (("netzbetreiber", "Netzbetreiber"), ("einspeisepunkt", "Einspeisepunkt / Umspannwerk")):
			if _enthaelt(n, vt.get(k)):
				add("warnung", feld, f"{label} nennt den {l} – das kann den Standort eingrenzen.")
		for re_, l in _KONTAKT:
			if re_.search(s):
				add("kritisch", feld, f"{label} enthält eine {l} (Umgehungsschutz).")
		for re_, l in _KRITISCH:
			if re_.search(s):
				add("kritisch", feld, f"{label} enthält eine {l}.")
		for re_, l in _WARNUNG:
			if re_.search(s):
				add("warnung", feld, f"{label} enthält eine {l}.")
		if anbieter:
			name = re.sub(r"\(demo\)", "", " ".join(x for x in (anbieter.get("vorname"), anbieter.get("nachname")) if x), flags=re.I).strip()
			if _enthaelt(n, anbieter.get("firma")):
				add("warnung", feld, f"{label} nennt Ihre Firma – Investoren sehen den Anbieter erst nach der Kontaktfreigabe.")
			if len(name.split(" ")) >= 2 and _enthaelt(n, name):
				add("warnung", feld, f"{label} nennt Ihren Namen.")
	kritisch = len([t for t in treffer if t["stufe"] == "kritisch"])
	return {"ok": kritisch == 0, "kritisch": kritisch, "warnungen": len(treffer) - kritisch, "treffer": treffer}


# ================================================================ 4. Stellungnahme zu LOIs

VOTUM_ARTEN = {"zustimmung": "Zustimmung", "verhandeln": "Verhandeln", "ablehnung": "Ablehnung"}


def votum_eingabe(d):
	d = d if isinstance(d, dict) else {}
	art = auswahl(d.get("art"), VOTUM_ARTEN, "")
	_pflicht(art, "Bitte wählen Sie Ihre Stellungnahme.")
	kommentar = mehrzeilig(d.get("kommentar"), 1500)
	_pflicht(art == "zustimmung" or len(kommentar) >= 10, "Bitte begründen Sie Ihre Stellungnahme (mind. 10 Zeichen).")
	gegen = zahl(d.get("gegenvorschlag"), 1, 1e11, 0) if art == "verhandeln" else None
	return {"art": art, "kommentar": kommentar, "gegenvorschlag": gegen}


def aktuelles_votum(voten, interesse_id, loi_am):
	liste = [x for x in (voten or []) if not x.get("gebotId") and x.get("interesseId") == interesse_id and (not loi_am or x.get("loiAm") == loi_am)]
	return liste[-1] if liste else None


def gebot_votum(voten, gebot_id, version=None):
	"""Maßgebliche Stellungnahme zu einem Gebot im Bieterverfahren (je Gebotsversion) – = regeln.js gebotVotum."""
	liste = [x for x in (voten or []) if x.get("gebotId") and x.get("gebotId") == gebot_id and (not version or x.get("gebotVersion") == version)]
	return liste[-1] if liste else None


def zuschlag_sperre(akte=None, gebot_id=None, version=None):
	"""Zuschlag im Bieterverfahren: vom Verkäufer abgelehntes Gebot → 409 „votum“."""
	vt = gebot_votum((akte or {}).get("voten") or [], gebot_id, version)
	_pflicht(not vt or vt.get("art") != "ablehnung", "Der Verkäufer hat dieses Gebot abgelehnt. Ein Zuschlag ist gesperrt – bitte klären Sie das weitere Vorgehen mit dem Anbieter.", 409, "votum")
	return True


# ================================================================ 5. Vorkenntnis

VORKENNTNIS_WERKTAGE = 10
VORKENNTNIS_NACHWEIS = {
	"korrespondenz": "E-Mail- oder Briefwechsel",
	"termin": "Gesprächs- oder Besuchstermin",
	"vertrag": "NDA, LOI oder Vertrag mit dem Interessenten",
	"sonstiges": "Sonstiger Nachweis",
}
VORKENNTNIS_STATUS = {"gemeldet": "Gemeldet – in Prüfung", "anerkannt": "Anerkannt", "abgelehnt": "Nicht anerkannt"}


def vorkenntnis_frist(angezeigt_am):
	return werktage_plus(tag_von(angezeigt_am), VORKENNTNIS_WERKTAGE) if angezeigt_am else ""


def vorkenntnis_eingabe(d, angezeigt_am, heute):
	d = d if isinstance(d, dict) else {}
	begruendung = mehrzeilig(d.get("begruendung"), 2000)
	_pflicht(len(begruendung) >= 20, "Bitte beschreiben Sie, woher Sie den Interessenten für dieses Projekt kennen (mind. 20 Zeichen).")
	art = auswahl(d.get("nachweisArt"), VORKENNTNIS_NACHWEIS, "")
	_pflicht(art, "Bitte wählen Sie die Art des Nachweises.")
	nd = datum_oder(d.get("nachweisDatum"))
	_pflicht(nd, "Bitte geben Sie das Datum des Nachweises an.")
	_pflicht(nd <= heute, "Das Datum des Nachweises liegt in der Zukunft.")
	_pflicht(not angezeigt_am or nd <= tag_von(angezeigt_am), "Vorkenntnis setzt einen Kontakt vor der Anzeige über die Plattform voraus.")
	frist = vorkenntnis_frist(angezeigt_am)
	return {"begruendung": begruendung, "nachweisArt": art, "nachweisDatum": nd, "dokumentId": text(d.get("dokumentId"), 40) or None, "frist": frist, "verspaetet": bool(frist) and heute > frist}


# Vermerk, wenn wegen anerkannter Vorkenntnis keine Provision entsteht (Verkauf/Closing, Provisionsstorno)
VORKENNTNIS_VERMERK = "Vorkenntnis anerkannt"


def vorkenntnis_anerkannt(akte, interesse_id):
	"""Anerkannte Vorkenntnis-Meldung zum Käufer-Interesse → keine Provision aus diesem Projekt (§ 4 Abs. 2) – sonst None (= regeln.js)."""
	if not interesse_id:
		return None
	return next((x for x in ((akte or {}).get("vorkenntnis") or []) if x.get("interesseId") == interesse_id and x.get("status") == "anerkannt"), None)


# ================================================================ 6. Sperren für Statusübergänge


def uebergang_sperre(art, nach, von, akte=None, projekt=None, anbieter=None, interesse_id=None, loi_am=None):
	punkte = (akte or {}).get("pruefpunkte") or []
	if art == "projekt" and nach == "pruefung":
		offen = len(pruefpunkte_offen(punkte))
		_pflicht(not offen, f"Bitte beantworten Sie zuerst {'die offene Rückfrage' if offen == 1 else f'die {offen} offenen Rückfragen'} des Backoffice.", 422, "pruefpunkte")
	if art == "projekt" and nach == "veroeffentlicht" and von == "pruefung":
		u = len(pruefpunkte_ungeklaert(punkte))
		_pflicht(not u, f"Vor der Veröffentlichung {'ist ein Pflicht-Prüfpunkt' if u == 1 else f'sind {u} Pflicht-Prüfpunkte'} zu erledigen.", 409, "pruefpunkte")
		an = anonymitaet_pruefen(projekt or {}, anbieter=anbieter)
		_pflicht(an["ok"], "Der öffentliche Teaser enthält identifizierende Angaben: " + " ".join(t["text"] for t in an["treffer"] if t["stufe"] == "kritisch"), 409, "anonymitaet")
	if art == "interesse" and nach == "loi_angenommen":
		vt = aktuelles_votum((akte or {}).get("voten") or [], interesse_id, loi_am)
		_pflicht(not vt or vt.get("art") != "ablehnung", "Der Verkäufer hat diese LOI abgelehnt. Bitte klären Sie das weitere Vorgehen mit dem Anbieter.", 409, "votum")
	return True


# ================================================================ Bestand (bestand.js)

BESTAND_MAX_MONATE = 360
BESTAND_MAX_VERTRAEGE = 30
VERTRAG_ARTEN = {
	"om": "Betriebsführung / Wartung (O&M)",
	"direktvermarktung": "Direktvermarktung / Stromabnahme (PPA)",
	"versicherung": "Versicherung (Allgefahren, Ertragsausfall, Haftpflicht)",
	"pacht": "Pacht- / Nutzungsvertrag Fläche bzw. Dach",
	"netz": "Netzanschluss- / Einspeisevertrag",
	"monitoring": "Fernüberwachung / Datenlogger",
	"sicherheit": "Rückbausicherheit (Bürgschaft)",
	"sonstiges": "Sonstiger Vertrag",
}
UEBERTRAGBAR = {"ja": "frei übertragbar", "zustimmung": "Zustimmung des Vertragspartners erforderlich", "nein": "nicht übertragbar – Neuabschluss nötig", "unklar": "noch zu prüfen"}
VERMARKTUNG = {
	"marktpraemie": "Direktvermarktung mit Marktprämie (DE EEG / AT EAG)",
	"einspeiseverguetung": "Feste Einspeisevergütung / Tarifförderung",
	"sonstige": "Sonstige Direktvermarktung (ohne Förderung)",
	"ppa": "PPA (physisch oder virtuell)",
	"eigenverbrauch": "Eigenverbrauch / Mieterstrom / ZEV",
}
BESTAND_DD = [
	("doku", True), ("abnahme", True), ("netzkonform", True), ("monitoring", True), ("stoerungen", True), ("messung", False), ("wr", True),
	("module", False), ("versicherung", True), ("pruefung", True), ("sicherung", True), ("rueckbau", False), ("messkonzept", False),
]
BESTAND_DD_LABEL = {
	"doku": "Anlagendokumentation (As-built, Stringpläne, Datenblätter)",
	"abnahme": "Inbetriebnahme- und Abnahmeprotokoll",
	"netzkonform": "Nachweise des Netzbetreibers (z. B. Anlagenzertifikat / Konformität nach VDE-AR-N 4110/4120 in DE)",
	"monitoring": "Monitoring-Zugang bzw. Rohdatenexport der Ertragsdaten",
	"stoerungen": "Störungs- und Wartungshistorie (Tickets, Wartungsprotokolle)",
	"messung": "Thermografie und/oder IV-Kennlinienmessung (aktuell)",
	"wr": "Wechselrichter: Tauschhistorie, Garantien, Ersatzteilstrategie",
	"module": "Modul-Leistungsgarantien und Herstellerstatus",
	"versicherung": "Versicherungsnachweis und Schadenhistorie",
	"pruefung": "Wiederkehrende Prüfung der elektrischen Anlage (z. B. DGUV V3 / E-Check), Blitz- und Brandschutz",
	"sicherung": "Flächensicherung: Nutzungsvertrag, Dienstbarkeit / Servitut, Grundbuch",
	"rueckbau": "Rückbauverpflichtung und Sicherheit",
	"messkonzept": "Messkonzept, Zähler (MaLo/MeLo), Einspeisemanagement / Redispatch",
}
DD_STATUS = {"vorhanden": "vorhanden", "fehlt": "fehlt", "nz": "nicht zutreffend"}

_MONAT_OK = re.compile(r"^(19|20)\d\d-(0[1-9]|1[0-2])$")


def _zahl_de(s, dezimal_komma):
	t = re.sub(r"\s|%", "", str(s if s is not None else "").strip())
	if not t:
		return None
	if "." in t and "," in t:
		t = t.replace(".", "").replace(",", ".", 1)
	elif dezimal_komma:
		t = t.replace(",", ".", 1)
	try:
		n = float(t)
	except ValueError:
		return float("nan")
	return n if math.isfinite(n) else float("nan")


def _monat_de(s):
	t = str(s or "").strip()
	m = re.fullmatch(r"((?:19|20)\d\d)[-/.](\d{1,2})", t)
	if m:
		return f"{m.group(1)}-{int(m.group(2)):02d}"
	m = re.fullmatch(r"(\d{1,2})[-/.]((?:19|20)\d\d)", t)
	if m:
		return f"{m.group(2)}-{int(m.group(1)):02d}"
	m = re.fullmatch(r"((?:19|20)\d\d)-(\d\d)-\d\d", t)
	if m:
		return f"{m.group(1)}-{m.group(2)}"
	return ""


def monate_bereinigen(liste):
	karte = {}
	for m in liste if isinstance(liste, list) else []:
		if not isinstance(m, dict) or not _MONAT_OK.match(str(m.get("monat") or "")):
			continue
		ertrag = zahl(m.get("ertragKwh"), 0, 1e9, 1)
		if ertrag is None:
			continue
		karte[m["monat"]] = {
			"monat": m["monat"],
			"ertragKwh": ertrag,
			"prognoseKwh": zahl(m.get("prognoseKwh"), 0, 1e9, 1),
			"einstrahlungKwhM2": zahl(m.get("einstrahlungKwhM2"), 0, 400, 1),
			"verfuegbarkeitPct": zahl(m.get("verfuegbarkeitPct"), 0, 100, 2),
		}
	return [karte[k] for k in sorted(karte)][-BESTAND_MAX_MONATE:]


def ertrag_csv_lesen(roh):
	zeilen = [z.strip() for z in str(roh or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")]
	zeilen = [z for z in zeilen if z][: BESTAND_MAX_MONATE + 5]
	monate, fehler = [], []
	for i, z in enumerate(zeilen):
		trenner = ";" if ";" in z else "\t" if "\t" in z else ","
		sp = [x.strip().strip('"') for x in z.split(trenner)]
		monat = _monat_de(sp[0])
		if not monat:
			if i == 0 and re.search(r"[a-zä]", z, re.I):
				continue
			fehler.append(f"Zeile {i + 1}: Monat nicht erkannt („{text(sp[0], 20)}“) – erwartet z. B. 2024-05 oder 05.2024")
			continue
		dk = trenner != ","
		werte = [_zahl_de(x, dk) for x in (sp[1:5] + [None] * 4)[:4]]
		ertrag, prognose, einstrahlung, verf = werte
		if ertrag is None or math.isnan(ertrag) or ertrag < 0:
			fehler.append(f"Zeile {i + 1}: Ertrag (kWh) fehlt oder ist ungültig")
			continue
		if any(x is not None and math.isnan(x) for x in (prognose, einstrahlung, verf)):
			fehler.append(f"Zeile {i + 1}: Zahl nicht lesbar")
			continue
		monate.append({"monat": monat, "ertragKwh": ertrag, "prognoseKwh": prognose, "einstrahlungKwhM2": einstrahlung, "verfuegbarkeitPct": verf})
	return {"monate": monate_bereinigen(monate), "fehler": fehler[:20]}


def _monat_folge(von, bis):
	y, m = (int(x) for x in von.split("-"))
	yb, mb = (int(x) for x in bis.split("-"))
	out = []
	while y < yb or (y == yb and m <= mb):
		out.append(f"{y}-{m:02d}")
		m += 1
		if m > 12:
			m, y = 1, y + 1
		if len(out) > BESTAND_MAX_MONATE + 12:
			break
	return out


def _summe(arr, f):
	return sum((x.get(f) or 0) for x in arr)


def _r1(x):
	return _rund(x, 1)


def _r3(x):
	return _rund(x, 3)


def ertrag_auswerten(monate, kwp=0, heute=""):
	liste = monate_bereinigen(monate or [])
	hinweise = []
	if not liste:
		return {"jahre": [], "gesamt": None, "luecken": [], "rueckgangPctJahr": None, "hinweise": [{"stufe": "info", "text": "Noch keine Ertragshistorie erfasst – Investoren bewerten Bestandsanlagen nach Ist-Daten."}]}
	vorhanden = {m["monat"] for m in liste}
	luecken = [m for m in _monat_folge(liste[0]["monat"], liste[-1]["monat"]) if m not in vorhanden]
	jahre_map = {}
	for m in liste:
		jahre_map.setdefault(int(m["monat"][:4]), []).append(m)
	jahre = []
	for jahr, ms in jahre_map.items():
		ertrag = _summe(ms, "ertragKwh")
		mp = [x for x in ms if x.get("prognoseKwh")]
		mst = [x for x in ms if x.get("einstrahlungKwhM2")]
		mv = [x for x in ms if x.get("verfuegbarkeitPct") is not None]
		jahre.append({
			"jahr": jahr,
			"monate": len(ms),
			"voll": len(ms) == 12,
			"ertragKwh": _r1(ertrag),
			"spezErtrag": _r1(ertrag / kwp) if kwp > 0 else None,
			"istZuPrognose": _r3(_summe(mp, "ertragKwh") / _summe(mp, "prognoseKwh")) if mp else None,
			"pr": _r3(_summe(mst, "ertragKwh") / (kwp * _summe(mst, "einstrahlungKwhM2"))) if kwp > 0 and mst else None,
			"verfuegbarkeitPct": _rund(_summe(mv, "verfuegbarkeitPct") / len(mv), 2) if mv else None,
		})
	volle = [j for j in jahre if j["voll"]]
	rueckgang = None
	if kwp > 0 and len(volle) >= 3:
		xs = [j["jahr"] for j in volle]
		ys = [j["pr"] if j["pr"] else j["spezErtrag"] for j in volle]
		mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
		steigung = sum((x - mx) * (ys[i] - my) for i, x in enumerate(xs)) / sum((x - mx) ** 2 for x in xs)
		rueckgang = _rund(-steigung / my * 100, 1) if my > 0 else None
	mp = [x for x in liste if x.get("prognoseKwh")]
	mv = [x for x in liste if x.get("verfuegbarkeitPct") is not None]
	mst = [x for x in liste if x.get("einstrahlungKwhM2")]
	gesamt = {
		"von": liste[0]["monat"],
		"bis": liste[-1]["monat"],
		"monate": len(liste),
		"ertragKwh": _r1(_summe(liste, "ertragKwh")),
		"istZuPrognose": _r3(_summe(mp, "ertragKwh") / _summe(mp, "prognoseKwh")) if mp else None,
		"pr": _r3(_summe(mst, "ertragKwh") / (kwp * _summe(mst, "einstrahlungKwhM2"))) if kwp > 0 and mst else None,
		"verfuegbarkeitPct": _rund(_summe(mv, "verfuegbarkeitPct") / len(mv), 2) if mv else None,
		"spezErtragVollJahr": _r1(sum(j["spezErtrag"] for j in volle) / len(volle)) if kwp > 0 and volle else None,
	}
	if not kwp > 0:
		hinweise.append({"stufe": "warnung", "text": "Leistung (MWp) im Projekt fehlt – spezifischer Ertrag und Performance Ratio können nicht berechnet werden."})
	if len(liste) < 12:
		hinweise.append({"stufe": "warnung", "text": f"Nur {len(liste)} Monate erfasst – für eine belastbare Bewertung sind in der Regel mindestens 12, besser 24–36 Monate üblich."})
	if luecken:
		hinweise.append({"stufe": "warnung", "text": f"Datenlücken: {len(luecken)} Monat(e) ohne Wert ({', '.join(luecken[:6])}{' …' if len(luecken) > 6 else ''}) – Ausfälle bitte erläutern."})
	if gesamt["istZuPrognose"] is not None and gesamt["istZuPrognose"] < 0.92:
		hinweise.append({"stufe": "warnung", "text": f"Ist-Ertrag bei {_pct(gesamt['istZuPrognose'])} der Prognose – Ursachen (Ausfälle, Abregelung, Verschattung, Prognosegrundlage) erläutern."})
	if gesamt["verfuegbarkeitPct"] is not None and gesamt["verfuegbarkeitPct"] < 97:
		hinweise.append({"stufe": "warnung", "text": f"Mittlere technische Verfügbarkeit {de_zahl(gesamt['verfuegbarkeitPct'])} % – O&M-Verträge sehen üblicherweise 97–99 % vor."})
	if gesamt["pr"] is not None and gesamt["pr"] < 0.75:
		hinweise.append({"stufe": "warnung", "text": f"Performance Ratio {_pct(gesamt['pr'])} – für neuere Anlagen liegen Werte in der Regel über 75–80 %. Messort der Einstrahlung (Modulebene?) prüfen."})
	if gesamt["pr"] is not None and gesamt["pr"] > 1:
		hinweise.append({"stufe": "fehler", "text": f"Performance Ratio über 100 % ({_pct(gesamt['pr'])}) ist physikalisch unplausibel – Einheit der Einstrahlung (kWh/m²) oder Leistung prüfen."})
	for j in volle:
		if j["spezErtrag"] is not None and (j["spezErtrag"] > 1450 or j["spezErtrag"] < 550):
			hinweise.append({"stufe": "warnung", "text": f"{j['jahr']}: spezifischer Ertrag {de_zahl(j['spezErtrag'])} kWh/kWp liegt außerhalb der für DACH üblichen Spanne – Einheit (kWh) und Leistung prüfen."})
	if rueckgang is not None and rueckgang > 1:
		hinweise.append({"stufe": "warnung", "text": f"Rechnerischer Rückgang {de_zahl(rueckgang)} % pro Jahr – deutlich über üblicher Moduldegradation; Ursachen (Wetter, Ausfälle, Verschattung) erläutern."})
	if heute and ist_datum(heute) and gesamt["bis"] < monate_plus(heute, -4)[:7]:
		hinweise.append({"stufe": "info", "text": f"Letzter Monatswert {gesamt['bis']} – bitte aktuelle Monate nachtragen."})
	return {"jahre": jahre, "gesamt": gesamt, "luecken": luecken, "rueckgangPctJahr": rueckgang, "hinweise": hinweise}


def vertrag_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	art = auswahl(d.get("art"), VERTRAG_ARTEN, "")
	_pflicht(art, "Bitte wählen Sie die Vertragsart.")
	beginn, ende = datum_oder(d.get("beginn")), datum_oder(d.get("ende"))
	_pflicht(not (beginn and ende and ende < beginn), f"{VERTRAG_ARTEN.get(art, art)}: Ende liegt vor dem Beginn.")
	return {
		"id": text(d.get("id"), 40) or None,
		"art": art,
		"partner": text(d.get("partner"), 120),
		"beginn": beginn,
		"ende": ende,
		"kuendigungsfristMonate": zahl(d.get("kuendigungsfristMonate"), 0, 120, 0),
		"kostenJahr": zahl(d.get("kostenJahr"), 0, 1e9, 0),
		"uebertragbar": auswahl(d.get("uebertragbar"), UEBERTRAGBAR, "unklar"),
		"changeOfControl": d.get("changeOfControl") is True,
		"dokumentId": text(d.get("dokumentId"), 40) or None,
		"bemerkung": mehrzeilig(d.get("bemerkung"), 600),
	}


def foerder_ende(f, land="DE"):
	f = f or {}
	if f.get("foerderEndeManuell"):
		return {"datum": f["foerderEndeManuell"], "quelle": "Angabe des Anbieters"}
	if land == "DE" and ist_datum(f.get("inbetriebnahme")) and f.get("vermarktung") in ("marktpraemie", "einspeiseverguetung"):
		return {"datum": f"{int(f['inbetriebnahme'][:4]) + 20}-12-31", "quelle": "berechnet: 20 Jahre zzgl. Inbetriebnahmejahr (§ 25 Abs. 1 EEG 2023 bzw. Vorgängerfassungen) – bitte prüfen"}
	return {"datum": "", "quelle": "" if land == "DE" else "bitte angeben (Förderdauer je Programm verschieden)"}


def foerderung_bereinigen(d, land="DE"):
	d = d if isinstance(d, dict) else {}
	reg = text(d.get("register"), 40).upper()
	return {
		"inbetriebnahme": datum_oder(d.get("inbetriebnahme")),
		"register": reg,
		"vermarktung": auswahl(d.get("vermarktung"), VERMARKTUNG, ""),
		"anzulegenderWertCt": zahl(d.get("anzulegenderWertCt"), 0, 100, 3),
		"zuschlagNr": text(d.get("zuschlagNr"), 60),
		"direktvermarkter": text(d.get("direktvermarkter"), 120),
		"foerderEndeManuell": datum_oder(d.get("foerderEndeManuell")),
		"redispatch": auswahl(d.get("redispatch"), {"ja", "nein", "nz"}, ""),
		"bemerkung": mehrzeilig(d.get("bemerkung"), 600),
		"registerFormatOk": land != "DE" or not reg or bool(re.fullmatch(r"SEE\d{12}", reg)),
	}


def dd_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	out = {}
	for pid, _ in BESTAND_DD:
		e = d.get(pid) if isinstance(d.get(pid), dict) else {}
		st = auswahl(e.get("status"), DD_STATUS, "")
		if st:
			out[pid] = {"status": st, "dokumentId": text(e.get("dokumentId"), 40) or None, "bemerkung": text(e.get("bemerkung"), 200)}
	return out


def dd_stand(dd):
	dd = dd or {}
	ok = [pid for pid, _ in BESTAND_DD if (dd.get(pid) or {}).get("status") in ("vorhanden", "nz")]
	offen = [BESTAND_DD_LABEL[pid] for pid, pfl in BESTAND_DD if pfl and (dd.get(pid) or {}).get("status") not in ("vorhanden", "nz")]
	return {"quote": _rund(len(ok) / len(BESTAND_DD) * 100, 0), "offenPflicht": offen, "gesamt": len(BESTAND_DD), "erfuellt": len(ok)}


def bestand_bereinigen(eingabe, basis=None, land="DE"):
	e = eingabe if isinstance(eingabe, dict) else {}
	out = dict(basis or {})
	if "monate" in e:
		out["monate"] = monate_bereinigen(e.get("monate"))
	if "vertraege" in e:
		liste = e.get("vertraege") if isinstance(e.get("vertraege"), list) else []
		out["vertraege"] = [{**vertrag_bereinigen(x), "id": text((x or {}).get("id"), 40) or f"V{i + 1}"} for i, x in enumerate(liste[:BESTAND_MAX_VERTRAEGE])]
	if "foerderung" in e:
		out["foerderung"] = foerderung_bereinigen(e.get("foerderung") or {}, land)
	if "dd" in e:
		out["dd"] = dd_bereinigen(e.get("dd") or {})
	return out


def vertraege_hinweise(vertraege, foerder_ende_datum="", heute=""):
	h = []
	arten = {v.get("art") for v in vertraege or []}
	if "om" not in arten:
		h.append({"stufe": "warnung", "text": "Kein O&M-/Wartungsvertrag erfasst – Käufer fragen Betriebsführung, Reaktionszeiten und Verfügbarkeitsgarantie ab."})
	if "versicherung" not in arten:
		h.append({"stufe": "warnung", "text": "Keine Versicherung erfasst."})
	if "pacht" not in arten:
		h.append({"stufe": "info", "text": "Kein Pacht-/Nutzungsvertrag erfasst (entfällt nur bei Eigentumsfläche)."})
	for v in vertraege or []:
		name = VERTRAG_ARTEN.get(v.get("art"), "") + (f" ({v['partner']})" if v.get("partner") else "")
		ende = v.get("ende")
		if heute and ende and ende < heute:
			h.append({"stufe": "warnung", "text": f"{name}: bereits ausgelaufen ({ende})."})
		elif heute and ende and ende < monate_plus(heute, 12):
			h.append({"stufe": "warnung", "text": f"{name}: läuft innerhalb von 12 Monaten aus ({ende}) – Verlängerung oder Nachfolge klären."})
		if v.get("art") == "pacht" and foerder_ende_datum and ende and ende < foerder_ende_datum:
			h.append({"stufe": "warnung", "text": f"{name}: endet vor dem Förderende ({foerder_ende_datum}) – Verlängerungsoption prüfen."})
		if v.get("uebertragbar") == "zustimmung" or v.get("changeOfControl"):
			h.append({"stufe": "info", "text": f"{name}: Zustimmung des Vertragspartners bzw. Change-of-Control-Klausel – als Vollzugsbedingung (CP) vorsehen."})
		if v.get("uebertragbar") == "nein":
			h.append({"stufe": "warnung", "text": f"{name}: nicht übertragbar – Neuabschluss vor dem Closing einplanen."})
	return h


def bestand_auswertung(bestand, projekt, heute=""):
	b = bestand or {}
	p = projekt or {}
	kwp = float(p.get("mwp") or 0) * 1000
	land = p.get("land") or "DE"
	f = b.get("foerderung") or {}
	fe = foerder_ende(f, land)
	fh = []
	if not f.get("inbetriebnahme"):
		fh.append({"stufe": "warnung", "text": "Inbetriebnahmedatum fehlt."})
	if not f.get("vermarktung"):
		fh.append({"stufe": "warnung", "text": "Vermarktungsform (Marktprämie, Einspeisevergütung, PPA …) fehlt."})
	if f.get("register") and f.get("registerFormatOk") is False:
		fh.append({"stufe": "warnung", "text": "MaStR-Nummer der Einheit hat üblicherweise das Format SEE + 12 Ziffern – bitte prüfen."})
	if f.get("vermarktung") == "marktpraemie" and not f.get("direktvermarkter"):
		fh.append({"stufe": "info", "text": "Direktvermarkter nicht angegeben."})
	if land == "DE" and kwp >= 100 and not f.get("redispatch"):
		fh.append({"stufe": "info", "text": "Redispatch 2.0: Umsetzung für Anlagen ab 100 kW angeben."})
	if fe["datum"] and heute and fe["datum"] < monate_plus(heute, 36):
		fh.append({"stufe": "warnung", "text": f"Förderende {fe['datum']} in weniger als drei Jahren – Anschlussvermarktung (PPA, Direktvermarktung) ist wertbestimmend."})
	return {
		"ertrag": ertrag_auswerten(b.get("monate") or [], kwp=kwp, heute=heute),
		"foerderEnde": fe,
		"foerderHinweise": fh,
		"vertraegeHinweise": vertraege_hinweise(b.get("vertraege") or [], fe["datum"], heute),
		"dd": dd_stand(b.get("dd") or {}),
	}


# ================================================================ LOI-Anzeige (fach/loi.js → loiZeilen)

_LOI_PREISBASIS = {"gesamt": "Kaufpreis gesamt (€)", "proKwp": "Preis je kWp (€/kWp)", "ev": "Enterprise Value (€, cash-/debt-free)"}
_LOI_STRUKTUR = {"asset": "Asset Deal", "share": "Share Deal (Anteile Projektgesellschaft)", "offen": "Nach Due Diligence"}
_LOI_ZAHLUNG = {"einmal": "Einmalzahlung bei Closing", "meilensteine": "Meilensteinzahlungen (z. B. Baurecht, RTB, COD)", "earnout": "Fixbetrag plus Earn-out"}
_LOI_FINANZIERUNG = {"ek": "Vollständig aus Eigenmitteln", "fk": "Mit Projektfinanzierung (Bank)", "fonds": "Aus Fonds-/Mandatsmitteln"}


def loi_zeilen(loi):
	if not loi:
		return []

	def eur(x):
		return f"{de_zahl(_rund(float(x), 0), 0)} €" if x or x == 0 else ""

	z = [
		("Preisbasis", _LOI_PREISBASIS.get(loi.get("preisbasis"), "")),
		("Indikativer Kaufpreis (Eigenkapital)", eur(loi.get("betrag")) if loi.get("betrag") is not None else ""),
		("Preis je kWp", f"{de_zahl(loi['preisProKwp'])} €/kWp" if loi.get("preisProKwp") else ""),
		("Enterprise Value", eur(loi.get("enterpriseValue")) if loi.get("enterpriseValue") else ""),
		("Nettofinanzverbindlichkeiten", eur(loi.get("nettoschulden") or 0) if loi.get("enterpriseValue") else ""),
		("Transaktionsstruktur", _LOI_STRUKTUR.get(loi.get("transaktion"), "")),
		("Zahlungsstruktur", " – ".join(x for x in (_LOI_ZAHLUNG.get(loi.get("zahlung"), ""), loi.get("zahlungDetails") or "") if x)),
		("Finanzierung", _LOI_FINANZIERUNG.get(loi.get("finanzierung"), "")),
		("Bedingungen", loi.get("bedingungen") or ""),
		("Exklusivität", f"{loi['exklusivitaetWochen']} Wochen ab Annahme" if loi.get("exklusivitaetWochen") else ""),
		("Gültig bis", _tag_de(loi.get("gueltigBis")) if loi.get("gueltigBis") else ""),
		("Inhalt", loi.get("text") or ""),
	]
	return [{"label": l, "wert": w} for l, w in z if w]
