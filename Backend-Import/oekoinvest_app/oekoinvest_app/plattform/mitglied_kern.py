# Copyright (c) 2026, ÖkoInvest GmbH
#
# Mitgliederbereich – reine Regeln (ohne Frappe), 1:1 aus src/lib/plattform/mitglied/{basis,genossenschaft,versammlung,gemeinschaft}.js:
#  Genossenschaft (DE eG/GenG, AT eGen/GenG AT, CH Art. 828 ff. OR): Stammdaten, Beitrittserklärung, Einzahlung, Geschäftsguthaben,
#  weitere Anteile, Kündigung mit Stichtag, Übertragung, Ausschüttung (Dividende mit Steuerabzug / Rückvergütung).
#  Generalversammlung: Anlage, Einladungsfrist, Stimmzettel, Mehrheiten, Ergebnis, Protokoll-Prüfsumme.
#  Energiegemeinschaft (AT EEG/BEG, DE § 42c EnWG, CH LEG): Stammdaten, Hindernisse, Verteilschlüssel, Monatsabrechnung.
# Tests: tests/test_mitglied_kern.py (ohne Bench lauffähig). KEINE Anlage-, Rechts- oder Steuerberatung.

import calendar
import math
import re
from datetime import date, timedelta

# ---------------------------------------------------------------- Werte aus markt.js (GEMEINSCHAFTEN) – Abgleich im Test
STEUER_ABZUG = {"DE": 0.26375, "AT": 0.275, "CH": 0.35, "freibetragDeEur": 1000}
RECHNER = {
	"DE": {"energiepreis": 14, "netzAp": 9, "abgabenCt": 0, "ueberschussCt": 6, "rabatte": {"keiner": 0}},
	"AT": {"energiepreis": 12, "netzAp": 7, "abgabenCt": 0.82, "ueberschussCt": 5, "rabatte": {"lokal": 0.57, "regional": 0.28, "beg": 0}},
	"CH": {"energiepreis": 14, "netzAp": 10, "abgabenCt": 0, "ueberschussCt": 6, "rabatte": {"leg40": 0.4, "leg20": 0.2}},
}
PV_MONATSANTEILE = [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025]


class MitgliedFehler(ValueError):
	def __init__(self, msg, status=422, feld=""):
		super().__init__(msg)
		self.status = status
		self.feld = feld


def fehler(msg, feld=""):
	return MitgliedFehler(msg, 422, feld)


def konflikt_fehler(msg):
	return MitgliedFehler(msg, 409)


# ---------------------------------------------------------------- Helfer (wie basis.js)
_STEUER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def text(v, max_=200):
	if v is None or isinstance(v, (dict, list)):
		return ""
	s = _STEUER.sub("", str(v))
	s = re.sub(r"[\r\n\t]+", " ", s)
	s = re.sub(r"\s{2,}", " ", s).strip()
	return s[:max_]


def mehrzeilig(v, max_=5000):
	if v is None or isinstance(v, (dict, list)):
		return ""
	s = _STEUER.sub("", str(v)).replace("\r\n", "\n").replace("\r", "\n")
	s = re.sub(r"\n{4,}", "\n\n\n", s).strip()
	return s[:max_]


def auswahl(v, erlaubt, std=""):
	return v if isinstance(v, str) and v in erlaubt else std


def wahr(v):
	return v is True or v == "true" or v == "ja" or v == 1


def zahl(v, min_=-math.inf, max_=math.inf, stellen=None):
	if v is None or v == "" or isinstance(v, (dict, list, bool)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if math.isnan(n) or math.isinf(n) or n < min_ or n > max_:
		return None
	return n if stellen is None else _js_round(n * 10 ** stellen) / 10 ** stellen


def ganz(v, min_, max_):
	n = zahl(v, min_, max_)
	return None if n is None else int(_js_round(n))


def _js_round(x):
	return math.floor(x + 0.5)


def rund2(x):
	x = float(x or 0)
	return _js_round(x * 100 + (1e-9 if x >= 0 else -1e-9)) / 100


def datum(v):
	s = str(v or "")[:10]
	if not re.match(r"^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$", s):
		return ""
	try:
		date.fromisoformat(s)
	except ValueError:
		return ""
	return s


def datum_zeit(v):
	s = str(v or "")[:16]
	return s if re.match(r"^20\d\d-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d$", s) and datum(s) else ""


def monat(v):
	return str(v) if re.match(r"^20\d\d-(0[1-9]|1[0-2])$", str(v or "")) else ""


def iban(v):
	s = re.sub(r"\s", "", str(v or "").upper())
	if not re.match(r"^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$", s):
		return ""
	r = "".join(str(ord(c) - 55) if c.isalpha() else c for c in s[4:] + s[:4])
	return s if int(r) % 97 == 1 else ""


def iban_maskiert(s):
	return f"{s[:4]} •••• •••• {s[-4:]}" if s else ""


def tage_zwischen(a, b):
	return (date.fromisoformat(str(b)[:10]) - date.fromisoformat(str(a)[:10])).days


def plus_tage(iso, tage):
	return (date.fromisoformat(str(iso)[:10]) + timedelta(days=tage)).isoformat()


def plus_monate(iso, monate):
	d = date.fromisoformat(str(iso)[:10])
	m0 = d.month - 1 + monate
	j, m = d.year + m0 // 12, m0 % 12 + 1
	return date(j, m, min(d.day, calendar.monthrange(j, m)[1])).isoformat()


# ================================================================ Genossenschaft
GENO_REGISTER = {"aufbau": "im Aufbau", "eingetragen": "eingetragen – Beitritt möglich", "geschlossen": "Beitritt derzeit geschlossen"}
RECHTSFORM = {"DE": "eG", "AT": "eGen", "CH": "Genossenschaft"}
REGISTER_NAME = {"DE": "Genossenschaftsregister", "AT": "Firmenbuch", "CH": "Handelsregister"}
VERBAND_NAME = {"DE": "Prüfungsverband (§ 54 GenG)", "AT": "Revisionsverband (GenRevG 1997)", "CH": "Revisionsstelle (Art. 906 OR)"}
NACHSCHUSS = {"ausgeschlossen": "Nachschusspflicht ausgeschlossen", "beschraenkt": "Nachschusspflicht beschränkt auf eine Haftsumme", "unbeschraenkt": "Unbeschränkte Nachschusspflicht"}
MITGLIED_STATUS = {"erklaert": "Beitrittserklärung eingegangen", "zugelassen": "Zugelassen – Einzahlung offen", "aktiv": "Mitglied", "ausgeschieden": "Ausgeschieden", "abgelehnt": "Beitritt nicht zugelassen", "zurueckgezogen": "Erklärung zurückgezogen"}
MITGLIED_AKTIV = ["aktiv"]
MITGLIED_ARTEN = {"privat": "Privatperson", "landwirt": "Landwirt / Flächeneigentümer", "unternehmen": "Unternehmen", "kommune": "Kommune / öffentliche Hand", "verein": "Verein / Initiative"}
ORGANISATION = ["unternehmen", "kommune", "verein"]
ANREDEN = {"frau": "Frau", "herr": "Herr", "divers": "Divers", "firma": "Firma"}
AUSSCHUETTUNG_ARTEN = {"dividende": "Dividende auf das Geschäftsguthaben", "rueckverguetung": "Rückvergütung nach Strombezug"}
EINLADUNGSFRIST_MIN = {"DE": 14, "AT": 7, "CH": 5}
BESTAETIGUNG_IDS = ["satzung", "einzahlung", "risiko", "beratung", "mitgliederliste"]


def beitritt_bestaetigungen(geno):
	ids = list(BESTAETIGUNG_IDS)
	if (geno or {}).get("nachschusspflicht") and geno.get("nachschusspflicht") != "ausgeschlossen":
		ids.insert(2, "nachschuss")
	return ids


def geno_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	land = auswahl(d.get("land"), RECHTSFORM, "DE")
	gj = str(d.get("geschaeftsjahrEnde") or "")
	g = {
		"name": text(d.get("name"), 120), "land": land, "rechtsform": RECHTSFORM[land], "registerStatus": auswahl(d.get("registerStatus"), GENO_REGISTER, "aufbau"),
		"registerNr": text(d.get("registerNr"), 60), "registergericht": text(d.get("registergericht"), 120), "pruefungsverband": text(d.get("pruefungsverband"), 160),
		"sitz": text(d.get("sitz"), 120), "vorstand": text(d.get("vorstand"), 200), "anteilEur": zahl(d.get("anteilEur"), 1, 100000, 2),
		"minAnteile": ganz(d.get("minAnteile"), 1, 1000) or 1, "maxAnteile": ganz(d.get("maxAnteile"), 1, 100000) or 100,
		"eintrittsgeldEur": zahl(d.get("eintrittsgeldEur"), 0, 10000, 2) or 0, "einzahlungsfristTage": ganz(d.get("einzahlungsfristTage"), 1, 365) or 14,
		"kuendigungsfristMonate": ganz(d.get("kuendigungsfristMonate"), 1, 60) or (12 if land == "CH" else 3),
		"geschaeftsjahrEnde": gj if re.match(r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$", gj) else "12-31",
		"nachschusspflicht": auswahl(d.get("nachschusspflicht"), NACHSCHUSS, "ausgeschlossen"), "haftsummeEur": zahl(d.get("haftsummeEur"), 0, 1000000, 2) or 0,
		"iban": iban(d.get("iban")) if d.get("iban") else "", "bic": text(d.get("bic"), 11).upper(), "kontoinhaber": text(d.get("kontoinhaber"), 120),
		"satzungStand": datum(d.get("satzungStand")), "onlineGv": wahr(d.get("onlineGv")), "einladungsfristTage": ganz(d.get("einladungsfristTage"), 1, 90), "info": mehrzeilig(d.get("info"), 2000),
	}
	if not g["name"]:
		raise fehler("Bitte geben Sie den Namen der Genossenschaft an.", "name")
	if not g["anteilEur"]:
		raise fehler("Bitte geben Sie den Betrag eines Geschäftsanteils laut Satzung an.", "anteilEur")
	if g["maxAnteile"] < g["minAnteile"]:
		raise fehler("Die Höchstzahl der Anteile muss mindestens der Pflichtbeteiligung entsprechen.", "maxAnteile")
	if d.get("iban") and not g["iban"]:
		raise fehler("Die IBAN der Genossenschaft ist ungültig (Prüfziffer).", "iban")
	if g["nachschusspflicht"] == "beschraenkt" and not g["haftsummeEur"] > 0:
		raise fehler("Bei beschränkter Nachschusspflicht ist die Haftsumme je Anteil anzugeben.", "haftsummeEur")
	if g["registerStatus"] == "eingetragen":
		if not g["registerNr"]:
			raise fehler(f"Für den Beitritt muss die Eintragung im {REGISTER_NAME[land]} hinterlegt sein.", "registerNr")
		if land != "CH" and not g["pruefungsverband"]:
			raise fehler(f"Für den Beitritt muss der {VERBAND_NAME[land]} hinterlegt sein.", "pruefungsverband")
		if not g["iban"]:
			raise fehler("Für die Einzahlungen wird das Konto der Genossenschaft benötigt.", "iban")
		if not g["satzungStand"]:
			raise fehler("Bitte geben Sie den Stand der Satzung an.", "satzungStand")
	return g


def beitritt_moeglich(geno):
	return (geno or {}).get("registerStatus") == "eingetragen"


def einladungsfrist(geno):
	g = geno or {}
	return max(EINLADUNGSFRIST_MIN.get(g.get("land"), 14), int(g.get("einladungsfristTage") or 0))


def beitritt_bereinigen(d, geno, heute):
	d = d if isinstance(d, dict) else {}
	if not beitritt_moeglich(geno):
		raise konflikt_fehler("Die Genossenschaft nimmt derzeit keine neuen Mitglieder auf." if (geno or {}).get("registerStatus") == "geschlossen" else "Die Genossenschaft ist noch im Aufbau – bitte nutzen Sie die unverbindliche Vormerkung.")
	art = auswahl(d.get("art"), MITGLIED_ARTEN, "")
	if not art:
		raise fehler("Bitte wählen Sie, als wer Sie beitreten.", "art")
	org = art in ORGANISATION
	anteile = ganz(d.get("anteile"), 1, 100000)
	if not anteile or anteile < geno["minAnteile"] or anteile > geno["maxAnteile"]:
		raise fehler(f"Bitte zeichnen Sie zwischen {geno['minAnteile']} und {geno['maxAnteile']} Geschäftsanteile.", "anteile")
	b = {
		"art": art, "anrede": auswahl(d.get("anrede"), ANREDEN, "firma" if org else ""), "vorname": text(d.get("vorname"), 80), "nachname": text(d.get("nachname"), 80),
		"firma": text(d.get("firma"), 160), "vertretung": text(d.get("vertretung"), 160), "strasse": text(d.get("strasse"), 120), "plz": text(d.get("plz"), 10), "ort": text(d.get("ort"), 80),
		"land": auswahl(d.get("land"), RECHTSFORM, geno["land"]), "geburtsdatum": datum(d.get("geburtsdatum")), "kontoinhaber": text(d.get("kontoinhaber"), 120),
		"iban": iban(d.get("iban")), "freistellung": wahr(d.get("freistellung")) if geno["land"] == "DE" and not org else False, "anteile": anteile,
	}
	if not b["nachname"] or (not org and not b["vorname"]):
		raise fehler("Bitte geben Sie Vor- und Nachnamen an.", "nachname")
	if org and not b["firma"]:
		raise fehler("Bitte geben Sie den Namen des Unternehmens, der Kommune bzw. des Vereins an.", "firma")
	if org and not b["vertretung"]:
		raise fehler("Bitte geben Sie an, wer die Organisation beim Beitritt vertritt.", "vertretung")
	if not b["strasse"] or not b["plz"] or not b["ort"]:
		raise fehler("Bitte geben Sie die vollständige Anschrift an (Mitgliederliste).", "strasse")
	if not b["iban"]:
		raise fehler("Bitte geben Sie eine gültige IBAN für Auszahlungen an (Prüfziffer).", "iban")
	if not b["kontoinhaber"]:
		b["kontoinhaber"] = b["firma"] if org else f"{b['vorname']} {b['nachname']}"
	if b["geburtsdatum"] and heute and b["geburtsdatum"] > heute:
		raise fehler("Das Geburtsdatum liegt in der Zukunft.", "geburtsdatum")
	if not org and b["geburtsdatum"] and heute and plus_monate(b["geburtsdatum"], 18 * 12) > heute:
		raise fehler("Minderjährige können nur mit Zustimmung der gesetzlichen Vertreter beitreten – bitte wenden Sie sich an uns.", "geburtsdatum")
	best = d.get("bestaetigt") if isinstance(d.get("bestaetigt"), dict) else {}
	fehlt = [k for k in beitritt_bestaetigungen(geno) if best.get(k) is not True]
	if fehlt:
		raise fehler("Bitte bestätigen Sie alle Erklärungen der Beitrittserklärung.", f"bestaetigt.{fehlt[0]}")
	b["bestaetigt"] = {k: True for k in beitritt_bestaetigungen(geno)}
	b["betragEur"] = rund2(anteile * geno["anteilEur"])
	b["eintrittsgeldEur"] = geno.get("eintrittsgeldEur") or 0
	return b


def pflicht_betrag(m, geno):
	return rund2((m.get("anteile") or 0) * (geno.get("anteilEur") or 0) + (geno.get("eintrittsgeldEur") or 0))


def offener_betrag(m, geno):
	return max(0, rund2(pflicht_betrag(m, geno) - (m.get("eingezahltEur") or 0)))


def geschaeftsguthaben(m, geno):
	return rund2(min(max(0, (m.get("eingezahltEur") or 0) - (geno.get("eintrittsgeldEur") or 0)), (m.get("anteile") or 0) * (geno.get("anteilEur") or 0)))


def mitglied_kennzahlen(m, geno):
	return {"pflichtEur": pflicht_betrag(m, geno), "eingezahltEur": rund2(m.get("eingezahltEur") or 0), "offenEur": offener_betrag(m, geno), "guthabenEur": geschaeftsguthaben(m, geno), "nennwertEur": rund2((m.get("anteile") or 0) * (geno.get("anteilEur") or 0))}


def einzahlung_bereinigen(d, heute):
	d = d if isinstance(d, dict) else {}
	betrag = zahl(d.get("betragEur"), 0.01, 10000000, 2)
	if not betrag:
		raise fehler("Bitte geben Sie den eingegangenen Betrag an.", "betragEur")
	am = datum(d.get("am")) or heute
	if heute and am > heute:
		raise fehler("Der Zahlungseingang kann nicht in der Zukunft liegen.", "am")
	return {"betragEur": betrag, "am": am, "referenz": text(d.get("referenz"), 80)}


def verwendungszweck(m):
	return f"Geschäftsanteile {m.get('nr') or m.get('id') or ''}".strip()


def naechste_nummer(vorhandene):
	mx = 0
	for n in vorhandene or []:
		z = re.sub(r"\D", "", str(n or ""))
		mx = max(mx, int(z) if z else 0)
	return str(mx + 1).zfill(4)


def zeichnung_bereinigen(d, m, geno):
	d = d if isinstance(d, dict) else {}
	if not m or m.get("status") != "aktiv":
		raise konflikt_fehler("Weitere Anteile können nur aktive Mitglieder zeichnen.")
	if not beitritt_moeglich(geno):
		raise konflikt_fehler("Die Genossenschaft nimmt derzeit keine weiteren Anteile an.")
	anteile = ganz(d.get("anteile"), 1, 100000)
	if not anteile:
		raise fehler("Bitte geben Sie an, wie viele weitere Anteile Sie zeichnen möchten.", "anteile")
	offen = sum(z["anteile"] for z in m.get("zeichnungen") or [] if z.get("status") == "beantragt")
	if m["anteile"] + offen + anteile > geno["maxAnteile"]:
		raise fehler(f"Höchstens {geno['maxAnteile']} Anteile je Mitglied laut Satzung (derzeit {m['anteile']}{f', {offen} beantragt' if offen else ''}).", "anteile")
	best = d.get("bestaetigt") if isinstance(d.get("bestaetigt"), dict) else {}
	if best.get("einzahlung") is not True:
		raise fehler("Bitte bestätigen Sie die Einzahlungsverpflichtung für die weiteren Anteile (§ 15b GenG)." if geno["land"] == "DE" else "Bitte bestätigen Sie die Einzahlungsverpflichtung für die weiteren Anteile.", "bestaetigt.einzahlung")
	return {"anteile": anteile, "betragEur": rund2(anteile * geno["anteilEur"])}


def kuendigungs_stichtag(eingang, frist_monate, gj_ende="12-31"):
	mm, tt = (int(x) for x in gj_ende.split("-"))
	frueh = plus_monate(eingang, frist_monate)
	jahr = int(str(eingang)[:4])
	for _ in range(80):
		e = date(jahr, mm, min(tt, calendar.monthrange(jahr, mm)[1])).isoformat()
		if e >= frueh:
			return e
		jahr += 1
	return frueh


def auszahlung_bis(stichtag, land):
	return plus_monate(stichtag, 6) if land == "DE" else None


def _offene_kuendigung(m):
	return any(k.get("status") in ("eingereicht", "bestaetigt") for k in m.get("kuendigungen") or [])


def kuendigung_bereinigen(d, m, geno, heute):
	d = d if isinstance(d, dict) else {}
	if not m or m.get("status") != "aktiv":
		raise konflikt_fehler("Kündigen können nur aktive Mitglieder.")
	if _offene_kuendigung(m):
		raise konflikt_fehler("Es liegt bereits eine offene Kündigung vor.")
	art = auswahl(d.get("art"), {"voll": 1, "teil": 1}, "")
	if not art:
		raise fehler("Bitte wählen Sie, ob Sie die Mitgliedschaft oder einzelne Anteile kündigen.", "art")
	anteile = m["anteile"]
	if art == "teil":
		anteile = ganz(d.get("anteile"), 1, 100000)
		if not anteile or anteile >= m["anteile"]:
			raise fehler("Bitte geben Sie an, wie viele Anteile Sie kündigen (weniger als alle – sonst Mitgliedschaft kündigen).", "anteile")
		if m["anteile"] - anteile < geno["minAnteile"]:
			raise fehler(f"Die Pflichtbeteiligung von {geno['minAnteile']} Anteil(en) muss bestehen bleiben ({'§ 67b GenG, ' if geno['land'] == 'DE' else ''}Satzung).", "anteile")
	if d.get("bestaetigt") is not True:
		raise fehler("Bitte bestätigen Sie die Kündigung.", "bestaetigt")
	wirksam = kuendigungs_stichtag(heute, geno["kuendigungsfristMonate"], geno["geschaeftsjahrEnde"])
	return {"art": art, "anteile": anteile, "eingereichtAm": heute, "wirksamZum": wirksam, "auszahlungBis": auszahlung_bis(wirksam, geno["land"]), "grund": text(d.get("grund"), 300)}


def auseinandersetzung(m, geno, anteile):
	g = geschaeftsguthaben(m, geno)
	n = m.get("anteile") or 0
	return rund2(min(g, (anteile / n) * g)) if n else 0


def uebertragung_bereinigen(d, m, geno):
	d = d if isinstance(d, dict) else {}
	if not m or m.get("status") != "aktiv":
		raise konflikt_fehler("Übertragen können nur aktive Mitglieder.")
	if offener_betrag(m, geno) > 0:
		raise konflikt_fehler("Übertragen werden kann nur voll eingezahltes Geschäftsguthaben – bitte zuerst die offene Einzahlung leisten.")
	if _offene_kuendigung(m):
		raise konflikt_fehler("Während einer offenen Kündigung ist keine Übertragung möglich.")
	an = str(d.get("anEmail") or "").strip().lower()[:190]
	if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", an):
		raise fehler("Bitte geben Sie die E-Mail-Adresse des Empfängers an (Konto auf der Plattform).", "anEmail")
	art = auswahl(d.get("art"), {"voll": 1, "teil": 1}, "teil")
	anteile = m["anteile"] if art == "voll" else ganz(d.get("anteile"), 1, 100000)
	if not anteile or anteile > m["anteile"]:
		raise fehler("Bitte geben Sie eine gültige Anzahl Anteile an.", "anteile")
	if art == "teil" and anteile == m["anteile"]:
		raise fehler("Für alle Anteile bitte „gesamtes Geschäftsguthaben übertragen“ wählen – Sie scheiden dann aus.", "art")
	if art == "teil" and m["anteile"] - anteile < geno["minAnteile"]:
		raise fehler(f"Die Pflichtbeteiligung von {geno['minAnteile']} Anteil(en) muss bestehen bleiben.", "anteile")
	if d.get("bestaetigt") is not True:
		raise fehler("Bitte bestätigen Sie die Übertragungsvereinbarung (§ 76 GenG, schriftliche Vereinbarung)." if geno["land"] == "DE" else "Bitte bestätigen Sie die Übertragungsvereinbarung.", "bestaetigt")
	return {"art": art, "anteile": anteile, "anEmail": an, "betragEur": rund2((anteile / m["anteile"]) * geschaeftsguthaben(m, geno))}


def uebertragung_empfaenger_pruefen(empf, anteile, geno):
	if not empf or empf.get("status") != "aktiv":
		raise konflikt_fehler("Der Empfänger muss Mitglied der Genossenschaft sein (ggf. zuerst beitreten).")
	if empf["anteile"] + anteile > geno["maxAnteile"]:
		raise konflikt_fehler(f"Der Empfänger würde die Höchstzahl von {geno['maxAnteile']} Anteilen überschreiten.")


def ausschuettung_bereinigen(d, heute):
	d = d if isinstance(d, dict) else {}
	art = auswahl(d.get("art"), AUSSCHUETTUNG_ARTEN, "")
	if not art:
		raise fehler("Bitte wählen Sie Dividende oder Rückvergütung.", "art")
	gj = ganz(d.get("geschaeftsjahr"), 2000, 2100)
	if not gj:
		raise fehler("Bitte geben Sie das Geschäftsjahr an.", "geschaeftsjahr")
	if heute and gj > int(heute[:4]):
		raise fehler("Ausgeschüttet wird nur für abgeschlossene Geschäftsjahre.", "geschaeftsjahr")
	a = {"art": art, "geschaeftsjahr": gj, "stichtag": datum(d.get("stichtag")) or f"{gj}-12-31", "satzPct": None, "ctProKwh": None, "notiz": text(d.get("notiz"), 300)}
	if art == "dividende":
		a["satzPct"] = zahl(d.get("satzPct"), 0.01, 15, 2)
		if not a["satzPct"]:
			raise fehler("Bitte geben Sie den Dividendensatz in % des Geschäftsguthabens an (0,01–15 %).", "satzPct")
	else:
		a["ctProKwh"] = zahl(d.get("ctProKwh"), 0.01, 20, 3)
		if not a["ctProKwh"]:
			raise fehler("Bitte geben Sie die Rückvergütung in ct/kWh an (0,01–20 ct).", "ctProKwh")
	return a


def ausschuettung_berechnen(a, mitglieder, geno):
	satz = STEUER_ABZUG.get((geno or {}).get("land"), STEUER_ABZUG["DE"])
	positionen = []
	for x in mitglieder or []:
		basis = float(x.get("guthabenEur") or 0) if a["art"] == "dividende" else float(x.get("umsatzKwh") or 0)
		if not basis > 0:
			continue
		brutto = rund2(basis * a["satzPct"] / 100 if a["art"] == "dividende" else basis * a["ctProKwh"] / 100)
		if not brutto > 0:
			continue
		steuer = 0
		if a["art"] == "dividende":
			bemessung = max(0, brutto - STEUER_ABZUG["freibetragDeEur"]) if geno.get("land") == "DE" and x.get("freistellung") else brutto
			steuer = rund2(bemessung * satz)
		positionen.append({"mitgliedId": x.get("mitgliedId"), "nutzerId": x.get("nutzerId"), "name": x.get("name") or "", "nr": x.get("nr") or "", "basis": rund2(basis), "bruttoEur": brutto, "steuerEur": steuer, "nettoEur": rund2(brutto - steuer), "freistellung": bool(x.get("freistellung"))})
	summe = {"bruttoEur": 0, "steuerEur": 0, "nettoEur": 0}
	for p in positionen:
		for k in summe:
			summe[k] = rund2(summe[k] + p[k])
	return {"positionen": positionen, "summe": summe, "steuersatz": satz if a["art"] == "dividende" else 0, "anzahl": len(positionen)}


# ================================================================ Generalversammlung
GV_STATUS = {"entwurf": "Entwurf", "eingeladen": "Eingeladen", "abstimmung": "Abstimmung läuft", "abgeschlossen": "Abgeschlossen – Protokoll liegt vor", "abgesagt": "Abgesagt"}
GV_ARTEN = {"ordentlich": "Ordentliche Generalversammlung", "ausserordentlich": "Außerordentliche Generalversammlung"}
GV_FORMEN = {"praesenz": "Präsenzversammlung", "online": "Virtuelle Versammlung (online)", "hybrid": "Hybride Versammlung", "schriftlich": "Schriftliche bzw. elektronische Beschlussfassung"}
MEHRHEITEN = {"einfach": (0.5, True), "zweidrittel": (2 / 3, False), "dreiviertel": (0.75, False)}
STIMMEN = {"ja": "Ja", "nein": "Nein", "enthaltung": "Enthaltung"}
ONLINE_FORMEN = ["online", "hybrid", "schriftlich"]


def versammlung_bereinigen(d, geno):
	d = d if isinstance(d, dict) else {}
	g = {
		"titel": text(d.get("titel"), 160), "art": auswahl(d.get("art"), GV_ARTEN, "ordentlich"), "form": auswahl(d.get("form"), GV_FORMEN, "praesenz"), "datum": datum_zeit(d.get("datum")),
		"ort": text(d.get("ort"), 200), "zugang": text(d.get("zugang"), 300), "abstimmungBis": datum_zeit(d.get("abstimmungBis")), "einleitung": mehrzeilig(d.get("einleitung"), 3000),
		"tagesordnung": [], "unterlagen": [],
	}
	if not g["titel"]:
		raise fehler("Bitte geben Sie einen Titel an (z. B. „Ordentliche Generalversammlung 2026“).", "titel")
	if not g["datum"]:
		raise fehler("Bitte geben Sie Datum und Uhrzeit der Versammlung an.", "datum")
	if g["form"] in ONLINE_FORMEN and not (geno or {}).get("onlineGv"):
		raise fehler("Die Satzung sieht keine virtuelle bzw. elektronische Beschlussfassung vor (Stammdaten „Online-Versammlung laut Satzung“).", "form")
	if g["form"] in ("praesenz", "hybrid") and not g["ort"]:
		raise fehler("Bitte geben Sie den Versammlungsort an.", "ort")
	if g["form"] in ONLINE_FORMEN:
		if not g["abstimmungBis"]:
			raise fehler("Bitte geben Sie an, bis wann online abgestimmt werden kann.", "abstimmungBis")
		if g["abstimmungBis"] < g["datum"] and g["form"] != "schriftlich":
			raise fehler("Die Online-Abstimmung endet frühestens mit der Versammlung.", "abstimmungBis")
	else:
		g["abstimmungBis"] = ""
	for t in (d.get("tagesordnung") if isinstance(d.get("tagesordnung"), list) else [])[:30]:
		t = t if isinstance(t, dict) else {}
		titel = text(t.get("titel"), 200)
		if not titel:
			continue
		beschluss = t.get("beschluss") is True
		g["tagesordnung"].append({"id": "", "titel": titel, "text": mehrzeilig(t.get("text"), 2000), "beschluss": beschluss, "mehrheit": auswahl(t.get("mehrheit"), MEHRHEITEN, "einfach") if beschluss else None, "satzung": beschluss and t.get("satzung") is True})
	for i, t in enumerate(g["tagesordnung"]):
		t["id"] = f"T{i + 1}"
	if not g["tagesordnung"]:
		raise fehler("Die Tagesordnung ist leer.", "tagesordnung")
	for t in g["tagesordnung"]:
		if t["satzung"]:
			mindest = "dreiviertel" if (geno or {}).get("land") == "DE" else "zweidrittel"
			if MEHRHEITEN[t["mehrheit"]][0] < MEHRHEITEN[mindest][0]:
				t["mehrheit"] = mindest
	for i, u in enumerate((d.get("unterlagen") if isinstance(d.get("unterlagen"), list) else [])[:20]):
		u = u if isinstance(u, dict) else {}
		titel = text(u.get("titel"), 160)
		if titel:
			g["unterlagen"].append({"id": f"U{i + 1}", "titel": titel, "text": mehrzeilig(u.get("text"), 8000)})
	return g


def einladung_pruefen(gv, geno, heute):
	if gv.get("status") != "entwurf":
		raise konflikt_fehler("Eingeladen werden kann nur zu einer Versammlung im Entwurf.")
	frist = einladungsfrist(geno)
	tage = tage_zwischen(heute, gv["datum"][:10])
	if tage < frist:
		norm = "§ 46 Abs. 1 GenG" if geno.get("land") == "DE" else "Art. 882 OR" if geno.get("land") == "CH" else "Satzung"
		frueh = ".".join(reversed(plus_tage(heute, frist).split("-")))
		raise fehler(f"Die Einladungsfrist beträgt mindestens {frist} Tage ({norm}) – frühester Termin: {frueh}.", "datum")
	return {"frist": frist, "tage": tage}


def abstimmung_offen(gv, jetzt):
	return (gv or {}).get("status") == "abstimmung" and (not gv.get("abstimmungBis") or not jetzt or jetzt <= gv["abstimmungBis"])


def stimme_bereinigen(d, gv):
	d = d if isinstance(d, dict) else {}
	out = {}
	for t in [x for x in gv["tagesordnung"] if x.get("beschluss")]:
		w = auswahl(d.get(t["id"]), STIMMEN, "")
		if not w:
			raise fehler(f"Bitte stimmen Sie zu „{t['titel']}“ ab (Ja, Nein oder Enthaltung).", t["id"])
		out[t["id"]] = w
	if not out:
		raise konflikt_fehler("Diese Versammlung hat keine Beschlusspunkte zur Abstimmung.")
	return out


def angenommen(ja, nein, mehrheit="einfach"):
	abgegeben = ja + nein
	if not abgegeben:
		return False
	anteil, strikt = MEHRHEITEN.get(mehrheit, MEHRHEITEN["einfach"])
	q = ja / abgegeben
	return q > anteil if strikt else q >= anteil - 1e-12


def ergebnis_rechnen(gv, stimmen, stimmberechtigt=0, zusatz=None):
	zusatz = zusatz or {}
	tops = []
	for t in [x for x in gv["tagesordnung"] if x.get("beschluss")]:
		z = (zusatz.get("tops") or {}).get(t["id"]) or {}
		ja, nein, enth = int(z.get("ja") or 0), int(z.get("nein") or 0), int(z.get("enthaltung") or 0)
		for s in stimmen or []:
			w = (s.get("stimmen") or {}).get(t["id"])
			ja += w == "ja"
			nein += w == "nein"
			enth += w == "enthaltung"
		tops.append({"id": t["id"], "titel": t["titel"], "mehrheit": t.get("mehrheit"), "ja": ja, "nein": nein, "enthaltung": enth, "abgegeben": ja + nein, "angenommen": angenommen(ja, nein, t.get("mehrheit"))})
	anwesend = int(zusatz.get("anwesend") or 0)
	teil = len(stimmen or []) + anwesend
	return {"stimmberechtigt": stimmberechtigt, "teilgenommen": teil, "online": len(stimmen or []), "anwesend": anwesend, "beteiligungPct": _js_round(teil / stimmberechtigt * 1000) / 10 if stimmberechtigt else 0, "tops": tops}


def stimmen_kanonisch(gv_id, stimmen):
	zeilen = sorted(f"{s['id']}|{s['am']}|" + ",".join(f"{k}={v}" for k, v in sorted((s.get("stimmen") or {}).items())) for s in stimmen or [])
	return "\n".join([gv_id, *zeilen])


def abschluss_bereinigen(d, gv, stimmberechtigt=0, online=0):
	d = d if isinstance(d, dict) else {}

	def anzahl(v):
		try:
			return max(0, min(1000000, int(_js_round(float(v or 0)))))
		except (TypeError, ValueError):
			return 0

	x = {"versammlungsleiter": text(d.get("versammlungsleiter"), 120), "protokollfuehrer": text(d.get("protokollfuehrer"), 120), "anwesend": 0, "tops": {}, "notiz": mehrzeilig(d.get("notiz"), 3000)}
	if not x["versammlungsleiter"] or not x["protokollfuehrer"]:
		raise fehler("Bitte geben Sie Versammlungsleitung und Protokollführung an.", "versammlungsleiter")
	if gv and gv.get("form") in ("praesenz", "hybrid"):
		x["anwesend"] = anzahl(d.get("anwesend"))
		if x["anwesend"] + online > stimmberechtigt:
			raise fehler(f"Mehr Teilnehmende ({x['anwesend'] + online}) als stimmberechtigte Mitglieder ({stimmberechtigt}).", "anwesend")
		tops = d.get("tops") if isinstance(d.get("tops"), dict) else {}
		for t in [y for y in gv["tagesordnung"] if y.get("beschluss")]:
			z = tops.get(t["id"]) if isinstance(tops.get(t["id"]), dict) else {}
			e = {"ja": anzahl(z.get("ja")), "nein": anzahl(z.get("nein")), "enthaltung": anzahl(z.get("enthaltung"))}
			if e["ja"] + e["nein"] + e["enthaltung"] > x["anwesend"]:
				raise fehler(f"„{t['titel']}“: mehr Stimmen im Saal als anwesende Mitglieder.", t["id"])
			x["tops"][t["id"]] = e
	return x


# ================================================================ Energiegemeinschaft
EG_FORMEN = {
	"DE": {"energy_sharing": "Energy Sharing (§ 42c EnWG)", "buergerenergie": "Bürgerenergiegesellschaft"},
	"AT": {"eeg_lokal": "Erneuerbare-Energie-Gemeinschaft – lokal", "eeg_regional": "Erneuerbare-Energie-Gemeinschaft – regional", "beg": "Bürgerenergiegemeinschaft (BEG)", "gea": "Gemeinschaftliche Erzeugungsanlage (Mehrparteienhaus)"},
	"CH": {"leg": "Lokale Elektrizitätsgemeinschaft (LEG)", "zev": "Zusammenschluss zum Eigenverbrauch (ZEV)", "vzev": "Virtueller ZEV (vZEV)"},
}
GEMEINSCHAFT_STATUS = {"aufbau": "In Gründung", "aktiv": "Aktiv", "geschlossen": "Keine neuen Teilnehmer"}
TEILNAHME_STATUS = {"beantragt": "Beitritt beantragt", "angemeldet": "Beim Netzbetreiber angemeldet", "aktiv": "Aktiv – Strom wird geteilt", "beendet": "Beendet", "abgelehnt": "Nicht aufgenommen"}
VERTEILSCHLUESSEL = {"dynamisch": "Dynamisch", "statisch": "Statisch"}


def rabatt_fuer(land, form):
	r = RECHNER.get(land)
	if not r:
		return 0
	rid = ("lokal" if form == "eeg_lokal" else "regional" if form == "eeg_regional" else "beg") if land == "AT" else ("leg40" if form == "leg" else None) if land == "CH" else "keiner"
	return r["rabatte"].get(rid, 0) if rid else 0


def gemeinschaft_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	land = auswahl(d.get("land"), EG_FORMEN, "AT")
	plz = d.get("plzListe")
	roh = ",".join(str(x) for x in plz) if isinstance(plz, list) else str(plz or "")
	liste = []
	for x in re.split(r"[\s,;]+", roh):
		x = x.strip()
		if re.match(r"^\d{4,5}$", x) and x not in liste:
			liste.append(x)
	g = {
		"name": text(d.get("name"), 120), "land": land, "form": auswahl(d.get("form"), EG_FORMEN[land], ""), "status": auswahl(d.get("status"), GEMEINSCHAFT_STATUS, "aufbau"),
		"rechtsform": text(d.get("rechtsform"), 80), "netzbetreiber": text(d.get("netzbetreiber"), 120), "gebiet": text(d.get("gebiet"), 200), "plzListe": liste[:200],
		"tarifBezugCt": zahl(d.get("tarifBezugCt"), 0, 100, 2), "tarifEinspeisungCt": zahl(d.get("tarifEinspeisungCt"), 0, 100, 2), "grundgebuehrMonat": zahl(d.get("grundgebuehrMonat"), 0, 100, 2) or 0,
		"verteilschluessel": auswahl(d.get("verteilschluessel"), VERTEILSCHLUESSEL, "dynamisch"), "gemeinschaftsId": text(d.get("gemeinschaftsId"), 40), "info": mehrzeilig(d.get("info"), 2000),
	}
	if not g["name"]:
		raise fehler("Bitte geben Sie den Namen der Gemeinschaft an.", "name")
	if not g["form"]:
		raise fehler("Bitte wählen Sie die Form der Gemeinschaft.", "form")
	if not g["netzbetreiber"]:
		raise fehler("Bitte geben Sie den Netzbetreiber an.", "netzbetreiber")
	if g["tarifBezugCt"] is None or g["tarifEinspeisungCt"] is None:
		raise fehler("Bitte geben Sie die Preise für Bezug und Einspeisung innerhalb der Gemeinschaft an.", "tarifBezugCt")
	if g["tarifEinspeisungCt"] > g["tarifBezugCt"]:
		raise fehler("Der Einspeisepreis liegt über dem Bezugspreis – die Gemeinschaft könnte ihre Kosten nicht decken.", "tarifEinspeisungCt")
	if land == "AT" and g["form"] == "eeg_lokal" and not g["gebiet"]:
		raise fehler("Bei einer lokalen EEG bitte die Trafostation bzw. das Netzgebiet angeben.", "gebiet")
	return g


def teilnahme_hindernisse(stamm, eg):
	if not stamm:
		return ["Bitte speichern Sie zuerst Ihre Teilnahmedaten (Zählpunkt bzw. Marktlokation)."]
	if not eg:
		return ["Gemeinschaft nicht gefunden."]
	h = []
	if eg.get("status") == "geschlossen":
		h.append("Die Gemeinschaft nimmt derzeit keine neuen Teilnehmer auf.")
	if stamm.get("land") != eg.get("land"):
		h.append("Ihre Abnahmestelle liegt in einem anderen Land als die Gemeinschaft.")
	if eg.get("plzListe") and stamm.get("plz") and str(stamm["plz"]) not in eg["plzListe"]:
		h.append(f"Ihre Postleitzahl {stamm['plz']} liegt nicht im Gebiet der Gemeinschaft ({eg.get('gebiet') or ', '.join(eg['plzListe'])}).")
	if eg.get("land") == "AT" and stamm.get("smartMeter") is False:
		h.append("Für die Teilnahme ist ein Smart Meter mit Viertelstundenwerten nötig.")
	if eg.get("land") == "DE" and stamm.get("smartMeter") is False:
		h.append("Energy Sharing setzt ein intelligentes Messsystem voraus.")
	return h


def eg_beitritt_bereinigen(d, stamm, eg):
	d = d if isinstance(d, dict) else {}
	h = teilnahme_hindernisse(stamm, eg)
	if h:
		raise konflikt_fehler(h[0])
	if d.get("bestaetigt") is not True:
		raise fehler("Bitte bestätigen Sie Beitritt, Datenfreigabe der Viertelstundenwerte und Preisblatt der Gemeinschaft." if eg.get("land") == "AT" else "Bitte bestätigen Sie Beitritt, Datenverarbeitung der Messwerte und Preisblatt der Gemeinschaft.", "bestaetigt")
	return {"anteilPct": zahl(d.get("anteilPct"), 0.1, 100, 1) if eg.get("verteilschluessel") == "statisch" else None}


def teilnahme_ende(heute):
	d = date.fromisoformat(str(heute)[:10])
	return date(d.year, d.month, calendar.monthrange(d.year, d.month)[1]).isoformat()


def _r1(x):
	return _js_round(x * 10) / 10


def verteilen(erzeugung_kwh, teilnehmer, schluessel="dynamisch"):
	zu = {t["id"]: 0.0 for t in teilnehmer or []}
	rest = max(0.0, float(erzeugung_kwh or 0))
	if schluessel == "statisch":
		for t in teilnehmer:
			soll = max(0.0, float(t.get("anteilPct") or 0)) / 100 * rest
			zu[t["id"]] = min(soll, max(0.0, float(t.get("verbrauchKwh") or 0)))
		rest = max(0.0, rest - sum(zu.values()))
	else:
		offen = [t for t in teilnehmer if float(t.get("verbrauchKwh") or 0) > 0]
		for _ in range(20):
			if rest <= 1e-9 or not offen:
				break
			bedarf = sum(float(t["verbrauchKwh"]) - zu[t["id"]] for t in offen)
			if bedarf <= 1e-9:
				break
			menge = min(rest, bedarf)
			for t in offen:
				zu[t["id"]] += menge * (float(t["verbrauchKwh"]) - zu[t["id"]]) / bedarf
			rest -= menge
			offen = [t for t in offen if float(t["verbrauchKwh"]) - zu[t["id"]] > 1e-9]
	return {"zuteilung": {k: _r1(x) for k, x in zu.items()}, "ueberschussKwh": _r1(rest)}


def schaetzung(stamm, mon):
	m = int(str(mon)[5:7]) - 1
	stamm = stamm or {}
	verbrauch = 0 if stamm.get("rolle") == "einspeisung" else (float(stamm.get("jahresverbrauchKwh") or 3500) / 12)
	ertrag = 1120 if stamm.get("land") == "AT" else 1050 if stamm.get("land") == "CH" else 1000
	erzeugung = 0 if stamm.get("rolle") == "bezug" else float(stamm.get("anlageKwp") or 0) * ertrag * PV_MONATSANTEILE[m] * 0.6
	return {"verbrauchKwh": _js_round(verbrauch), "erzeugungKwh": _js_round(erzeugung)}


def monatsabrechnung(eg, mon, teilnehmer):
	if not monat(mon):
		raise fehler("Bitte wählen Sie den Abrechnungsmonat (JJJJ-MM).", "monat")
	werte = []
	for t in teilnehmer or []:
		m = t.get("messwerte")
		if m and ("verbrauchKwh" in m or "erzeugungKwh" in m):
			s = {"verbrauchKwh": max(0.0, float(m.get("verbrauchKwh") or 0)), "erzeugungKwh": max(0.0, float(m.get("erzeugungKwh") or 0))}
			g = False
		else:
			s, g = schaetzung(t.get("stamm"), mon), True
		werte.append({**t, **s, "geschaetzt": g})
	erzeugung = sum(t["erzeugungKwh"] for t in werte)
	v = verteilen(erzeugung, [{"id": t["id"], "verbrauchKwh": t["verbrauchKwh"], "anteilPct": t.get("anteilPct")} for t in werte], eg.get("verteilschluessel"))
	geteilt = sum(v["zuteilung"].values())
	r = RECHNER.get(eg.get("land"), RECHNER["DE"])
	rabatt = rabatt_fuer(eg.get("land"), eg.get("form"))
	vorteil_ct = r["energiepreis"] + r["netzAp"] * rabatt + r["abgabenCt"] - eg["tarifBezugCt"]
	positionen = []
	for t in werte:
		bezug = v["zuteilung"].get(t["id"], 0)
		eing = _r1(geteilt * t["erzeugungKwh"] / erzeugung) if erzeugung > 0 else 0
		bezug_eur = rund2(bezug * eg["tarifBezugCt"] / 100)
		gut = rund2(eing * eg["tarifEinspeisungCt"] / 100)
		grund = rund2(eg.get("grundgebuehrMonat") or 0)
		positionen.append({
			"teilnahmeId": t["id"], "nutzerId": t.get("nutzerId"), "name": t.get("name") or "", "verbrauchKwh": t["verbrauchKwh"], "erzeugungKwh": t["erzeugungKwh"],
			"bezugGemeinschaftKwh": bezug, "einspeisungGemeinschaftKwh": eing, "deckungPct": _js_round(bezug / t["verbrauchKwh"] * 1000) / 10 if t["verbrauchKwh"] else 0,
			"bezugEur": bezug_eur, "gutschriftEur": gut, "grundgebuehrEur": grund, "saldoEur": rund2(gut - bezug_eur - grund),
			"ersparnisEur": rund2(bezug * vorteil_ct / 100 + eing * (eg["tarifEinspeisungCt"] - r["ueberschussCt"]) / 100), "geschaetzt": t["geschaetzt"],
		})
	summe = {"bezugEur": 0, "gutschriftEur": 0, "grundgebuehrEur": 0}
	for p in positionen:
		for k in summe:
			summe[k] = rund2(summe[k] + p[k])
	return {"monat": mon, "erzeugungKwh": _js_round(erzeugung), "geteiltKwh": _js_round(geteilt), "ueberschussKwh": v["ueberschussKwh"], "rabattAnteil": rabatt, "positionen": positionen, "summe": summe, "geschaetzt": any(p["geschaetzt"] for p in positionen)}


def messwerte_bereinigen(d):
	out = {}
	if not isinstance(d, dict):
		return out
	for k, w in list(d.items())[:500]:
		if not re.match(r"^[A-Z]{1,3}-[0-9A-Z-]{4,40}$", str(k)) or not isinstance(w, dict):
			continue
		v = zahl(w.get("verbrauchKwh"), 0, 1e7, 1)
		e = zahl(w.get("erzeugungKwh"), 0, 1e7, 1)
		if v is None and e is None:
			continue
		out[k] = {"verbrauchKwh": v or 0, "erzeugungKwh": e or 0}
	return out
