# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energie-Stammdaten (Abnahmestellen, Energiegemeinschaften) – 1:1 aus src/lib/plattform/fach/energie.js.
# MaLo-ID: 11 Ziffern, Prüfziffer nach BDEW (ungerade Stellen + 2 × gerade Stellen, (10 − Summe mod 10) mod 10).
# MeLo-ID (DE) / Zählpunktnummer (AT): 33 Zeichen, Land + 6 Ziffern Netzbetreiber + 5 Ziffern PLZ + 20 Zeichen.
# CH-Messpunkt: CH + 31 alphanumerische Zeichen. Fehler als ValueError (API übersetzt in ValidationError).

import math
import re

MESSARTEN = ["rlm", "slp", "imsys"]
SPANNUNGSEBENEN = ["ns", "ms_ns", "ms", "hs_ms", "hs"]
NETZEBENEN_AT = ["7", "6", "5", "4", "3"]
PREISSTRUKTUREN = ["fest", "tranchen", "spot", "mischung", "grundversorgung"]
PAR19 = ["keine", "atypisch", "intensiv", "singulaer", "pruefung"]
EG_FORMEN = {"DE": ["energy_sharing", "buergerenergie"], "AT": ["eeg_lokal", "eeg_regional", "beg", "gea"], "CH": ["leg", "zev", "vzev"]}
EG_ROLLEN = ["bezug", "einspeisung", "beides"]
DATUM = re.compile(r"^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


class EnergieFehler(ValueError):
	pass


def _zeichen(s):
	return re.sub(r"[\s.\-_/]", "", str(s or "")).upper()


def malo_pruefziffer(zehn):
	z = str(zehn)
	if not re.fullmatch(r"\d{10}", z):
		return None
	ungerade = sum(int(z[i]) for i in range(0, 10, 2))
	gerade = sum(int(z[i]) for i in range(1, 10, 2))
	return (10 - ((ungerade + 2 * gerade) % 10)) % 10


def malo_pruefen(eingabe):
	s = _zeichen(eingabe)
	if not s:
		return {"ok": False, "wert": "", "fehler": "Bitte geben Sie die Marktlokations-ID an."}
	if not re.fullmatch(r"\d{11}", s):
		return {"ok": False, "wert": s, "fehler": "Die Marktlokations-ID hat genau 11 Ziffern."}
	if s[0] == "0":
		return {"ok": False, "wert": s, "fehler": "Eine Marktlokations-ID beginnt nicht mit 0."}
	if malo_pruefziffer(s[:10]) != int(s[10]):
		return {"ok": False, "wert": s, "fehler": "Prüfziffer stimmt nicht – bitte Tippfehler prüfen (Angabe auf der Stromrechnung)."}
	return {"ok": True, "wert": s, "fehler": ""}


def zaehlpunkt_pruefen(eingabe, land="DE"):
	s = _zeichen(eingabe)
	name = "Zählpunktnummer" if land == "AT" else "Messpunktbezeichnung" if land == "CH" else "Messlokations-ID"
	if not s:
		return {"ok": False, "wert": "", "fehler": f"Bitte geben Sie die {name} an."}
	if len(s) != 33:
		return {"ok": False, "wert": s, "fehler": f"Die {name} hat 33 Zeichen (derzeit {len(s)})."}
	if not s.startswith(land):
		return {"ok": False, "wert": s, "fehler": f"Die {name} beginnt mit „{land}“."}
	if land == "CH":
		if not re.fullmatch(r"CH[0-9A-Z]{31}", s):
			return {"ok": False, "wert": s, "fehler": f"Die {name} enthält nur Ziffern und Großbuchstaben."}
	elif not re.fullmatch(r"(DE|AT)\d{11}[0-9A-Z]{20}", s):
		return {"ok": False, "wert": s, "fehler": f"Aufbau: {land} + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen."}
	return {"ok": True, "wert": s, "fehler": ""}


def _text(v, maximal=160):
	if v is None or isinstance(v, (dict, list)):
		return ""
	return re.sub(r"\s{2,}", " ", re.sub(r"[\x00-\x1f\x7f]", " ", str(v))).strip()[:maximal]


def _zahl(v, mn, mx, stellen=0):
	if v is None or v == "" or isinstance(v, (bool, dict, list)):
		return None
	try:
		n = float(v) if isinstance(v, (int, float)) else float(str(v).replace(" ", "").replace(",", "."))
	except ValueError:
		return None
	if not math.isfinite(n) or n < mn or n > mx:
		return None
	r = math.floor(n * 10**stellen + 0.5) / 10**stellen
	return int(r) if stellen == 0 else r


def _ja_nein(v):
	if v is True or v == "ja":
		return True
	if v is False or v == "nein":
		return False
	return None


def abnahmestelle_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	land = d.get("land") if d.get("land") in ("DE", "AT", "CH") else "DE"
	s = {
		"bezeichnung": _text(d.get("bezeichnung"), 80), "land": land, "plz": _text(d.get("plz"), 10), "ort": _text(d.get("ort"), 80),
		"maloId": "", "meloId": "", "zaehlpunkt": "",
		"messart": d.get("messart") if d.get("messart") in MESSARTEN else "",
		"netzbetreiber": _text(d.get("netzbetreiber"), 120),
		"spannungsebene": "" if land == "AT" else (d.get("spannungsebene") if d.get("spannungsebene") in SPANNUNGSEBENEN else ""),
		"netzebeneAt": (str(d.get("netzebeneAt")) if str(d.get("netzebeneAt") or "") in NETZEBENEN_AT else "") if land == "AT" else "",
		"jahresverbrauchKwh": _zahl(d.get("jahresverbrauchKwh"), 0, 5e9), "spitzeKw": _zahl(d.get("spitzeKw"), 0, 5e6, 1),
		"lieferant": _text(d.get("lieferant"), 120), "vertragEnde": str(d.get("vertragEnde") or "") if DATUM.match(str(d.get("vertragEnde") or "")) else "",
		"kuendigungsfristMonate": _zahl(d.get("kuendigungsfristMonate"), 0, 36),
		"preisstruktur": d.get("preisstruktur") if d.get("preisstruktur") in PREISSTRUKTUREN else "",
		"arbeitspreisCt": _zahl(d.get("arbeitspreisCt"), 0, 200, 3), "leistungspreisEurKwJahr": _zahl(d.get("leistungspreisEurKwJahr"), 0, 1000, 2),
		"grundpreisEurMonat": _zahl(d.get("grundpreisEurMonat"), 0, 100000, 2), "netzentgeltCt": _zahl(d.get("netzentgeltCt"), 0, 100, 3),
		"stromsteuerEntlastung": _ja_nein(d.get("stromsteuerEntlastung")) if land == "DE" else None,
		"par19": (d.get("par19") if d.get("par19") in PAR19 else "keine") if land == "DE" else "",
		"eigenerzeugungKwp": _zahl(d.get("eigenerzeugungKwp"), 0, 1e6, 1), "bemerkung": _text(d.get("bemerkung"), 300),
	}
	if not s["bezeichnung"]:
		raise EnergieFehler("Bitte geben Sie eine Bezeichnung der Abnahmestelle an (z. B. „Werk Nord“).")
	if land == "DE":
		m = malo_pruefen(d.get("maloId"))
		if not m["ok"]:
			raise EnergieFehler(m["fehler"])
		s["maloId"] = m["wert"]
		if d.get("meloId"):
			z = zaehlpunkt_pruefen(d.get("meloId"), "DE")
			if not z["ok"]:
				raise EnergieFehler(z["fehler"])
			s["meloId"] = z["wert"]
	else:
		z = zaehlpunkt_pruefen(d.get("zaehlpunkt"), land)
		if not z["ok"]:
			raise EnergieFehler(z["fehler"])
		s["zaehlpunkt"] = z["wert"]
	if not s["messart"]:
		raise EnergieFehler("Bitte wählen Sie die Messart (RLM, SLP oder intelligentes Messsystem).")
	if s["jahresverbrauchKwh"] is None:
		raise EnergieFehler("Bitte geben Sie den Jahresverbrauch in kWh an.")
	return s


def eg_teilnahme_bereinigen(d):
	d = d if isinstance(d, dict) else {}
	land = d.get("land") if d.get("land") in ("DE", "AT", "CH") else "DE"
	t = {
		"land": land, "form": d.get("form") if d.get("form") in EG_FORMEN[land] else "", "rolle": d.get("rolle") if d.get("rolle") in EG_ROLLEN else "bezug",
		"maloId": "", "zaehlpunkt": "", "zaehlpunktEinspeisung": "", "netzbetreiber": _text(d.get("netzbetreiber"), 120),
		"plz": _text(d.get("plz"), 10), "ort": _text(d.get("ort"), 80), "jahresverbrauchKwh": _zahl(d.get("jahresverbrauchKwh"), 0, 1e8),
		"anlageKwp": _zahl(d.get("anlageKwp"), 0, 100000, 1), "smartMeter": _ja_nein(d.get("smartMeter")), "datenfreigabe": _ja_nein(d.get("datenfreigabe")),
	}
	if not t["form"]:
		raise EnergieFehler("Bitte wählen Sie die Form der Energiegemeinschaft.")
	if land == "DE":
		m = malo_pruefen(d.get("maloId"))
		if not m["ok"]:
			raise EnergieFehler(m["fehler"])
		t["maloId"] = m["wert"]
	else:
		z = zaehlpunkt_pruefen(d.get("zaehlpunkt"), land)
		if not z["ok"]:
			raise EnergieFehler(z["fehler"])
		t["zaehlpunkt"] = z["wert"]
		if t["rolle"] != "bezug" and d.get("zaehlpunktEinspeisung"):
			e = zaehlpunkt_pruefen(d.get("zaehlpunktEinspeisung"), land)
			if not e["ok"]:
				raise EnergieFehler("Einspeisung: " + e["fehler"])
			if e["wert"] == t["zaehlpunkt"]:
				raise EnergieFehler("Für Bezug und Einspeisung gibt es in der Regel zwei verschiedene Zählpunkte.")
			t["zaehlpunktEinspeisung"] = e["wert"]
	if not t["netzbetreiber"]:
		raise EnergieFehler("Bitte geben Sie Ihren Netzbetreiber an.")
	if not t["plz"]:
		raise EnergieFehler("Bitte geben Sie die Postleitzahl der Abnahmestelle an.")
	return t
