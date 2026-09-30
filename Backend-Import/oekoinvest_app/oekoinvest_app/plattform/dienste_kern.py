# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dienste „Firmen, Bonität, Identität + SPV-Gründung“ – reine Regeln (ohne Frappe-Import auf Modulebene, mit
# python -m unittest testbar). Gegenstücke der Website:
#   MRZ/ICAO 9303           src/lib/plattform/dienste/identitaet/mrz.js
#   Webhook-Signaturen      src/lib/plattform/dienste/identitaet/anbieter.js
#   Register/Namensprüfung  src/lib/plattform/dienste/register/basis.js
#   Bonität                 src/lib/plattform/dienste/bonitaet/basis.js
#   Rechtsformen/Schritte   src/lib/plattform/dienste/gesellschaft/rechtsformen.js
# Rechtsrahmen, Anbieter, Kosten: docs/DIENSTE-EXTERN.md.

import hashlib
import hmac
import math
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone

# ====================================================================== MRZ (ICAO Doc 9303)


def _zeichen_wert(c):
	if "0" <= c <= "9":
		return ord(c) - 48
	if "A" <= c <= "Z":
		return ord(c) - 55
	if c == "<":
		return 0
	return -1


def pruefziffer(feld):
	"""Prüfziffer nach ICAO 9303 Teil 3 (Gewichte 7-3-1, mod 10) oder None bei ungültigen Zeichen."""
	summe = 0
	for i, c in enumerate(str(feld or "")):
		w = _zeichen_wert(c)
		if w < 0:
			return None
		summe += w * (7, 3, 1)[i % 3]
	return summe % 10


def pruefziffer_ok(feld, ziffer):
	soll = pruefziffer(feld)
	if soll is None:
		return False
	ist = 0 if ziffer == "<" else (int(ziffer) if str(ziffer).isdigit() else -1)
	return ist == soll


def mrz_normalisieren(eingabe):
	t = str(eingabe or "").upper().replace("«", "<").replace("‹", "<").replace("\r", "")
	zeilen = [re.sub(r"[^A-Z0-9<]", "", re.sub(r"\s+", "", z)) for z in t.split("\n")]
	zeilen = [z for z in zeilen if z]
	if len(zeilen) == 1:
		z = zeilen[0]
		if len(z) == 90:
			return [z[:30], z[30:60], z[60:]]
		if len(z) == 88:
			return [z[:44], z[44:]]
		if len(z) == 72:
			return [z[:36], z[36:]]
	return zeilen


def mrz_format(zeilen):
	if len(zeilen) == 3 and all(len(z) == 30 for z in zeilen):
		return "TD1"
	if len(zeilen) == 2 and all(len(z) == 44 for z in zeilen):
		return "TD3"
	if len(zeilen) == 2 and all(len(z) == 36 for z in zeilen):
		return "TD2"
	return None


def _fueller(s):
	return re.sub(r"\s+", " ", str(s or "").replace("<", " ")).strip()


def _name_teilen(feld):
	teile = str(feld or "").split("<<")
	return {"nachname": _fueller(teile[0]), "vornamen": _fueller("<<".join(teile[1:]))}


def mrz_datum(jjmmtt, art="geburt", heute=None):
	if not re.match(r"^\d{6}$", str(jjmmtt or "")):
		return None
	heute = heute or datetime.now(timezone.utc).date()
	jj, mm, tt = int(jjmmtt[:2]), int(jjmmtt[2:4]), int(jjmmtt[4:6])
	jetzt_j = heute.year % 100
	if art == "geburt":
		jahr = 1900 + jj if jj > jetzt_j else 2000 + jj
	else:
		jahr = 1900 + jj if jj >= jetzt_j + 50 else 2000 + jj
	try:
		return date(jahr, mm, tt).isoformat()
	except ValueError:
		return None


_DOKUMENTART = {"P": "Reisepass", "I": "Personalausweis", "A": "Ausweis", "C": "Ausweis", "V": "Visum"}


def mrz_pruefen(eingabe, heute=None):
	"""Zerlegt die MRZ und prüft alle Prüfziffern. Liefert {ok, format, felder, pruefungen, fehler}."""
	zeilen = [str(z).upper().replace(" ", "") for z in eingabe] if isinstance(eingabe, (list, tuple)) else mrz_normalisieren(eingabe)
	fmt = mrz_format(zeilen)
	if not fmt:
		return {"ok": False, "format": None, "felder": {}, "pruefungen": [], "fehler": ["Unbekanntes Format der maschinenlesbaren Zone."]}
	p = []
	fehler = []

	def pruef(feld, label, wert, ziffer):
		p.append({"feld": feld, "label": label, "ok": pruefziffer_ok(wert, ziffer)})

	if fmt == "TD1":
		a, b, c = zeilen
		nummer, nummer_z, opt1 = a[5:14], a[14], a[15:30]
		if nummer_z == "<" and re.match(r"[A-Z0-9]", opt1[:1]):
			ende = opt1.find("<")
			rest = opt1[:ende] if ende > 0 else opt1
			nummer, nummer_z, opt1 = nummer + rest[:-1], rest[-1], opt1[len(rest):]
		f = {"dokumentcode": a[:2], "ausstellerstaat": a[2:5], "dokumentnummer": nummer.replace("<", ""), "geburtsdatumRoh": b[:6], "geschlecht": b[7],
			"ablaufRoh": b[8:14], "staatsangehoerigkeit": b[15:18], "optional": _fueller(opt1 + b[18:29]), **_name_teilen(c)}
		pruef("dokumentnummer", "Dokumentnummer", nummer, nummer_z)
		pruef("geburtsdatum", "Geburtsdatum", b[:6], b[6])
		pruef("ablauf", "Gültig bis", b[8:14], b[14])
		pruef("gesamt", "Gesamtprüfziffer", a[5:30] + b[:7] + b[8:15] + b[18:29], b[29])
	elif fmt == "TD3":
		a, b = zeilen
		f = {"dokumentcode": a[:2], "ausstellerstaat": a[2:5], **_name_teilen(a[5:44]), "dokumentnummer": b[:9].replace("<", ""), "staatsangehoerigkeit": b[10:13],
			"geburtsdatumRoh": b[13:19], "geschlecht": b[20], "ablaufRoh": b[21:27], "optional": _fueller(b[28:42])}
		pruef("dokumentnummer", "Dokumentnummer", b[:9], b[9])
		pruef("geburtsdatum", "Geburtsdatum", b[13:19], b[19])
		pruef("ablauf", "Gültig bis", b[21:27], b[27])
		pruef("optional", "Persönliche Nummer / optionale Daten", b[28:42], b[42])
		pruef("gesamt", "Gesamtprüfziffer", b[:10] + b[13:20] + b[21:43], b[43])
	else:
		a, b = zeilen
		f = {"dokumentcode": a[:2], "ausstellerstaat": a[2:5], **_name_teilen(a[5:36]), "dokumentnummer": b[:9].replace("<", ""), "staatsangehoerigkeit": b[10:13],
			"geburtsdatumRoh": b[13:19], "geschlecht": b[20], "ablaufRoh": b[21:27], "optional": _fueller(b[28:35])}
		pruef("dokumentnummer", "Dokumentnummer", b[:9], b[9])
		pruef("geburtsdatum", "Geburtsdatum", b[13:19], b[19])
		pruef("ablauf", "Gültig bis", b[21:27], b[27])
		pruef("gesamt", "Gesamtprüfziffer", b[:10] + b[13:20] + b[21:35], b[35])
	f["dokumentart"] = _DOKUMENTART.get(f["dokumentcode"][:1], "Reisedokument")
	f["ausstellerstaat"] = f["ausstellerstaat"].replace("<", "")
	f["staatsangehoerigkeit"] = f["staatsangehoerigkeit"].replace("<", "")
	f["geburtsdatum"] = mrz_datum(f["geburtsdatumRoh"], "geburt", heute)
	f["gueltigBis"] = mrz_datum(f["ablaufRoh"], "ablauf", heute)
	if not f["geburtsdatum"]:
		fehler.append("Das Geburtsdatum ist kein gültiges Datum.")
	if not f["gueltigBis"]:
		fehler.append("Das Ablaufdatum ist kein gültiges Datum.")
	for x in p:
		if not x["ok"]:
			fehler.append(f"Prüfziffer „{x['label']}“ stimmt nicht – bitte Eingabe prüfen.")
	return {"ok": not fehler, "format": fmt, "felder": f, "pruefungen": p, "fehler": fehler}


def mrz_name(s):
	t = str(s or "").upper().replace("Ä", "AE").replace("Ö", "OE").replace("Ü", "UE").replace("ẞ", "SS").replace("ß", "SS")
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	return re.sub(r"\s+", " ", re.sub(r"[^A-Z]+", " ", t)).strip()


def _tokens(s):
	return [t for t in mrz_name(s).split(" ") if len(t) > 1]


def name_stimmt(soll, felder):
	nach_m, vor_m = _tokens(felder.get("nachname")), _tokens(felder.get("vornamen"))
	nach_s, vor_s = _tokens(soll.get("nachname")), _tokens(soll.get("vorname"))
	if not nach_s or not nach_m:
		return False
	nach_ok = all(any(m == t or (len(m) >= 3 and t.startswith(m)) for m in nach_m) for t in nach_s)
	vor_ok = not vor_s or any(m == vor_s[0] or (len(m) >= 3 and vor_s[0].startswith(m)) for m in vor_m)
	return nach_ok and vor_ok


def nummer_maskiert(n):
	n = str(n or "")
	return ("•" * max(0, len(n) - 3)) + n[-3:] if n else ""


def mrz_vorpruefung(eingabe, soll=None, heute=None):
	"""Vorprüfung wie mrzVorpruefung() der Website: plausibel | auffaellig | ungueltig (ersetzt keine Identifizierung)."""
	soll = soll or {}
	heute = heute or datetime.now(timezone.utc).date()
	m = mrz_pruefen(eingabe, heute)
	if not m["ok"]:
		return {"ergebnis": "ungueltig", "hinweise": m["fehler"], "mrz": m, "abgleich": {}, "tageGueltig": None}
	f = m["felder"]
	tage = (date.fromisoformat(f["gueltigBis"]) - heute).days if f["gueltigBis"] else None
	abgleich = {
		"name": name_stimmt(soll, f) if soll.get("nachname") else None,
		"geburtsdatum": (str(soll.get("geburtsdatum"))[:10] == f["geburtsdatum"]) if soll.get("geburtsdatum") else None,
		"gueltig": tage is not None and tage >= 0,
		"ausweisNummer": (mrz_name(soll.get("ausweisNummer")).replace(" ", "") == f["dokumentnummer"]) if soll.get("ausweisNummer") else None,
	}
	hinweise = []
	if not abgleich["gueltig"]:
		hinweise.append(f"Das Dokument ist abgelaufen (gültig bis {f['gueltigBis']}).")
	if abgleich["name"] is False:
		hinweise.append("Der Name in der MRZ weicht von den Angaben im Konto ab.")
	if abgleich["geburtsdatum"] is False:
		hinweise.append("Das Geburtsdatum in der MRZ weicht von den Angaben ab.")
	if abgleich["ausweisNummer"] is False:
		hinweise.append("Die Dokumentnummer weicht von der angegebenen Ausweisnummer ab.")
	auffaellig = not abgleich["gueltig"] or False in (abgleich["name"], abgleich["geburtsdatum"], abgleich["ausweisNummer"])
	return {"ergebnis": "auffaellig" if auffaellig else "plausibel", "hinweise": hinweise, "mrz": m, "abgleich": abgleich, "tageGueltig": tage}


# ====================================================================== Identitätsanbieter: Webhook-Signaturen

IDENT_ANBIETER = {
	"demo": {"label": "Demo-Simulator", "header": "x-oekoinvest-signatur", "alg": "sha256", "ueber": "zeit.body", "zeit_header": "x-oekoinvest-zeit"},
	"veriff": {"label": "Veriff", "header": "x-hmac-signature", "alg": "sha256", "ueber": "body"},
	"sumsub": {"label": "Sumsub", "header": "x-payload-digest", "alg_header": "x-payload-digest-alg", "alg": "sha256", "ueber": "body"},
	"onfido": {"label": "Onfido (Entrust)", "header": "x-sha2-signature", "alg": "sha256", "ueber": "body"},
	"idnow": {"label": "IDnow", "header": "x-oekoinvest-signatur", "alg": "sha256", "ueber": "body"},
	"webid": {"label": "WebID", "header": "x-oekoinvest-signatur", "alg": "sha256", "ueber": "body"},
}
_ALG_AUS_HEADER = {"HMAC_SHA256_HEX": "sha256", "HMAC_SHA512_HEX": "sha512", "HMAC_SHA1_HEX": "sha1"}


def webhook_signatur_pruefen(anbieter, kopf, roh, geheimnis, jetzt_s=None):
	"""kopf: Funktion(name) → Wert; roh: Roh-Body (bytes oder str). Liefert (ok, grund). Zeitkonstanter Vergleich."""
	d = IDENT_ANBIETER.get(anbieter)
	if not d:
		return False, "anbieter"
	if not geheimnis:
		return False, "kein_geheimnis"
	gesendet = str(kopf(d["header"]) or "").strip()
	if gesendet.startswith("sha256="):
		gesendet = gesendet[7:]
	if not gesendet:
		return False, "keine_signatur"
	alg = d["alg"]
	if d.get("alg_header"):
		alg = _ALG_AUS_HEADER.get(str(kopf(d["alg_header"]) or "").upper(), alg)
		if alg == "sha1":
			return False, "algorithmus"
	daten = roh.encode() if isinstance(roh, str) else (roh or b"")
	if d["ueber"] == "zeit.body":
		try:
			zeit = int(kopf(d["zeit_header"]))
		except (TypeError, ValueError):
			return False, "zeit"
		jetzt_s = jetzt_s if jetzt_s is not None else int(datetime.now(timezone.utc).timestamp())
		if abs(jetzt_s - zeit) > 300:
			return False, "zeit"
		daten = f"{zeit}.".encode() + daten
	erwartet = hmac.new(str(geheimnis).encode(), daten, getattr(hashlib, alg)).hexdigest()
	ok = hmac.compare_digest(gesendet.lower(), erwartet)
	return ok, "" if ok else "signatur"


def webhook_signieren(anbieter, roh, geheimnis, zeit=None):
	d = IDENT_ANBIETER[anbieter]
	daten = roh.encode() if isinstance(roh, str) else roh
	kopf = {}
	if d["ueber"] == "zeit.body":
		zeit = zeit or int(datetime.now(timezone.utc).timestamp())
		daten = f"{zeit}.".encode() + daten
		kopf[d["zeit_header"]] = str(zeit)
	kopf[d["header"]] = hmac.new(str(geheimnis).encode(), daten, hashlib.sha256).hexdigest()
	if d.get("alg_header"):
		kopf[d["alg_header"]] = "HMAC_SHA256_HEX"
	return kopf


def _kurz(s, n=200):
	return re.sub(r"[\x00-\x1f]", " ", str(s or "")).strip()[:n]


def webhook_normalisieren(anbieter, p):
	"""Payload → {sitzungId, externeId, ergebnis: bestanden|pruefen|abgelehnt|abgebrochen, verfahren, grund, ereignisId} oder None."""
	if not isinstance(p, dict):
		return None
	if anbieter == "demo":
		e = p.get("ergebnis") if p.get("ergebnis") in ("bestanden", "pruefen", "abgelehnt", "abgebrochen") else None
		return e and {"sitzungId": _kurz(p.get("sitzungId"), 40), "externeId": _kurz(p.get("externeId"), 80), "ergebnis": e, "verfahren": _kurz(p.get("verfahren"), 60) or "Simulation", "grund": _kurz(p.get("grund"), 300), "ereignisId": _kurz(p.get("ereignisId"), 80)}
	if anbieter == "veriff":
		v = p.get("verification") or {}
		st = str(v.get("status") or p.get("status") or "").lower()
		m = {"approved": "bestanden", "declined": "abgelehnt", "resubmission_requested": "pruefen", "review": "pruefen", "expired": "abgebrochen", "abandoned": "abgebrochen"}.get(st)
		return m and {"sitzungId": _kurz(v.get("vendorData") or p.get("vendorData"), 40), "externeId": _kurz(v.get("id") or p.get("id"), 80), "ergebnis": m, "verfahren": "Veriff", "grund": _kurz(v.get("reason"), 300), "ereignisId": _kurz(f"{v.get('id') or p.get('id')}:{st}", 80)}
	if anbieter == "sumsub":
		if p.get("type") not in ("applicantReviewed", "applicantOnHold"):
			return None
		rr = p.get("reviewResult") or {}
		ans = rr.get("reviewAnswer")
		e = "pruefen" if p.get("type") == "applicantOnHold" else "bestanden" if ans == "GREEN" else ("abgelehnt" if rr.get("reviewRejectType") == "FINAL" else "pruefen") if ans == "RED" else None
		return e and {"sitzungId": _kurz(p.get("externalUserId"), 40), "externeId": _kurz(p.get("applicantId"), 80), "ergebnis": e, "verfahren": "Sumsub", "grund": _kurz(", ".join(rr.get("rejectLabels") or []), 300), "ereignisId": _kurz(f"{p.get('applicantId')}:{p.get('correlationId') or p.get('createdAtMs') or p.get('type')}", 80)}
	if anbieter == "onfido":
		r = p.get("payload") or {}
		if r.get("resource_type") != "workflow_run" or r.get("action") != "workflow_run.completed":
			return None
		o = r.get("object") or {}
		st = str(o.get("status") or "").lower()
		m = {"approved": "bestanden", "declined": "abgelehnt", "review": "pruefen", "abandoned": "abgebrochen", "error": "pruefen"}.get(st)
		sitzung = next((t for t in (o.get("tags") or []) if str(t).startswith("IP-")), o.get("customer_user_id"))
		return m and {"sitzungId": _kurz(sitzung, 40), "externeId": _kurz(o.get("id"), 80), "ergebnis": m, "verfahren": "Onfido", "grund": "", "ereignisId": _kurz(f"{o.get('id')}:{st}", 80)}
	if anbieter == "idnow":
		ip = p.get("identificationprocess") or {}
		res = str(ip.get("result") or "").upper()
		m = {"SUCCESS": "bestanden", "SUCCESS_DATA_CHANGED": "pruefen", "REVIEW_PENDING": "pruefen", "FRAUD_SUSPICION_PENDING": "pruefen", "FRAUD_SUSPICION_CONFIRMED": "abgelehnt", "CANCELED": "abgebrochen", "ABORTED": "abgebrochen"}.get(res)
		return m and {"sitzungId": _kurz(ip.get("transactionnumber"), 40), "externeId": _kurz(ip.get("id"), 80), "ergebnis": m, "verfahren": "IDnow", "grund": _kurz(ip.get("reason"), 300), "ereignisId": _kurz(f"{ip.get('id')}:{res}", 80)}
	if anbieter == "webid":
		res = str(p.get("result") or p.get("status") or "").lower()
		m = {"success": "bestanden", "successful": "bestanden", "review": "pruefen", "failed": "abgelehnt", "cancelled": "abgebrochen", "canceled": "abgebrochen"}.get(res)
		return m and {"sitzungId": _kurz(p.get("transactionId") or p.get("reference"), 40), "externeId": _kurz(p.get("actionId") or p.get("id"), 80), "ergebnis": m, "verfahren": "WebID", "grund": _kurz(p.get("reason"), 300), "ereignisId": _kurz(f"{p.get('actionId') or p.get('id')}:{res}", 80)}
	return None


IDENT_KYC_ERGEBNIS = {"bestanden": "ok", "pruefen": "auffaellig", "abgelehnt": "auffaellig", "abgebrochen": "hinweis"}
IDENT_ERGEBNIS_LABEL = {"ausstehend": "Läuft", "bestanden": "Bestanden (Anbieter)", "pruefen": "Manuelle Prüfung nötig", "abgelehnt": "Nicht bestanden", "abgebrochen": "Abgebrochen / abgelaufen"}

# ====================================================================== Register

REGISTER_LAENDER = {
	"AT": {"register": "Firmenbuch", "muster": r"^FN\s?\d{1,6}\s?[a-z]$"},
	"DE": {"register": "Handelsregister", "muster": r"^(HR[AB]|GnR|PR|VR)\s?\d{1,7}(\s?[A-Z]{1,3})?$"},
	"CH": {"register": "Handelsregister (Zefix)", "muster": r"^CHE-?\d{3}\.?\d{3}\.?\d{3}$"},
}


def registernummer_pruefen(land, nummer):
	r = REGISTER_LAENDER.get(land)
	n = re.sub(r"\s+", " ", str(nummer or "").strip())
	if not r:
		return False, n, "Unbekanntes Land."
	if not n or not re.match(r["muster"], n, re.I):
		return False, n, "Format der Registernummer nicht erkannt."
	if land == "AT":
		m = re.match(r"^FN\s?(\d+)\s?([a-z])$", n, re.I)
		n = f"FN {m.group(1)}{m.group(2).lower()}"
	elif land == "CH":
		m = re.match(r"^CHE-?(\d{3})\.?(\d{3})\.?(\d{3})$", n, re.I)
		n = f"CHE-{m.group(1)}.{m.group(2)}.{m.group(3)}"
	else:
		n = re.sub(r"^(HR[AB]|GNR|PR|VR)\s?", lambda x: x.group(1) + " ", n.upper())
	return True, n, ""


_RF_PHRASEN = [r"\bgesellschaft mit beschraenkter haftung\b", r"\bunternehmergesellschaft\b", r"\bhaftungsbeschraenkt\b", r"\bflexible kapitalgesellschaft\b", r"\bin gruendung\b", r"\bco kg\b"]
_RF_WOERTER = {"gmbh", "ug", "ag", "kg", "og", "ohg", "co", "ig", "sarl", "sagl", "ltd", "se", "eg", "eu", "flexco", "mbh"}


def firma_normalisieren(s):
	t = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	t = re.sub(r"\((demo|fiktiv|test)\)", " ", t)
	t = re.sub(r"[^a-z0-9]+", " ", t)
	for p in _RF_PHRASEN:
		t = re.sub(p, " ", t)
	return " ".join(w for w in t.split() if w not in _RF_WOERTER)


def namens_aehnlichkeit(a, b):
	x, y = firma_normalisieren(a), firma_normalisieren(b)
	if not x or not y:
		return 0.0
	if x == y:
		return 1.0

	def bi(s):
		s = f" {s} "
		m = {}
		for i in range(len(s) - 1):
			m[s[i : i + 2]] = m.get(s[i : i + 2], 0) + 1
		return m

	A, B = bi(x), bi(y)
	schnitt = sum(min(n, B.get(k, 0)) for k, n in A.items())
	return 2 * schnitt / (sum(A.values()) + sum(B.values()))


_ZUSATZ = {
	"at_gmbh": r"\bGmbH\b|Gesellschaft mit beschränkter Haftung",
	"de_gmbh": r"\bGmbH\b|Gesellschaft mit beschränkter Haftung",
	"de_ug": r"UG \(haftungsbeschränkt\)|Unternehmergesellschaft \(haftungsbeschränkt\)",
	"de_gmbh_co_kg": r"GmbH\s?&\s?Co\.?\s?KG",
	"ch_gmbh": r"\bGmbH\b|\bSàrl\b|\bSagl\b|\bSarl\b",
}
_IRREFUEHREND = [r"\bbank\b", r"\bsparkasse\b", r"\bversicherung\b", r"\bkapitalanlagegesellschaft\b", r"\binvestmentfonds\b", r"\bstaatlich\b", r"\bbundes", r"\bamt\b"]


def firmenname_pruefen(name, rechtsform, treffer=None):
	"""Vorprüfung wie firmennamePruefen() der Website → {ergebnis: frei|aehnlich|belegt|unzulaessig, hinweise, aehnlich}."""
	n = str(name or "").strip()
	if len(n) < 3:
		return {"ergebnis": "unzulaessig", "hinweise": ["Bitte geben Sie einen Firmennamen an."], "aehnlich": []}
	hinweise = []
	if rechtsform in _ZUSATZ and not re.search(_ZUSATZ[rechtsform], n, re.I):
		hinweise.append("Der Rechtsformzusatz fehlt oder passt nicht zur gewählten Rechtsform.")
	if any(re.search(p, n, re.I) for p in _IRREFUEHREND):
		hinweise.append("Der Name enthält Begriffe, die in der Regel geschützt sind oder irreführen können.")
	aehnlich = sorted(
		[{"name": t.get("name"), "nummer": t.get("nummer") or "", "status": t.get("status") or "", "aehnlichkeit": round(namens_aehnlichkeit(n, t.get("name")), 2)} for t in (treffer or [])],
		key=lambda x: -x["aehnlichkeit"],
	)
	aehnlich = [t for t in aehnlich if t["aehnlichkeit"] >= 0.6][:8]
	ergebnis = "frei"
	if any(t["aehnlichkeit"] >= 0.95 and t["status"] != "geloescht" for t in aehnlich):
		ergebnis = "belegt"
	elif aehnlich:
		ergebnis = "aehnlich"
	if hinweise and ergebnis != "belegt":
		ergebnis = "unzulaessig"  # unzulässiger Name hat Vorrang vor „ähnlich“
	return {"ergebnis": ergebnis, "hinweise": hinweise, "aehnlich": aehnlich}


# ====================================================================== Bonität

BONITAET_ANBIETER = {"demo": "Demo-Simulator", "ksv1870": "KSV1870", "creditreform": "Creditreform", "crif": "CRIF", "dnb": "Dun & Bradstreet"}
BONITAET_ANLAESSE = {"loi": "Vor Absichtserklärung (LOI)", "bieter": "Vor Teilnahme am Bieterverfahren", "vertrag": "Vor Vertragsabschluss", "pruefung": "Laufende Prüfung"}
BONITAET_RECHTSGRUNDLAGEN = {
	"berechtigtes_interesse": "Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) – Prüfung der Zahlungsfähigkeit vor Kaufverhandlungen",
	"vorvertraglich": "Vorvertragliche Maßnahmen auf Anfrage der Person (Art. 6 Abs. 1 lit. b DSGVO)",
	"einwilligung": "Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)",
}
BONITAET_HINWEIS_NUTZER = (
	"Vor Abgabe einer Absichtserklärung bzw. eines Gebots prüfen wir die Zahlungsfähigkeit des erwerbenden Unternehmens (Bonitätsauskunft). "
	"Das Backoffice ist informiert und meldet sich bei Ihnen – das dauert in der Regel nicht länger als einen Werktag."
)


def zahl_oder_null(x):
	"""Zahl oder None – None/"" der Auskunftei bleiben „keine Angabe“ (wie zahlOderNull in bonitaet/adapter.js)."""
	if x is None or x == "" or isinstance(x, bool):
		return None
	try:
		z = float(x)
	except (TypeError, ValueError):
		return None
	return z if math.isfinite(z) else None


def bonitaet_ampel(anbieter, score):
	s = zahl_oder_null(score)  # None/""/NaN → „unbekannt“, nie „grün“
	if s is None:
		return "unbekannt"
	if anbieter == "ksv1870":
		return "gruen" if s <= 299 else "gelb" if s <= 399 else "rot"
	if anbieter == "dnb":
		return "gruen" if s >= 51 else "gelb" if s >= 21 else "rot"
	if anbieter == "crif":
		return "gruen" if s >= 600 else "gelb" if s >= 450 else "rot"
	return "gruen" if s <= 250 else "gelb" if s <= 350 else "rot"


def bonitaet_einstellungen_standard():
	return {"geltung": None, "pilotKonten": [], "gueltigTage": 180, "rotSperrt": True, "schritte": {"loi": True, "gebot": True}}


def bonitaet_geltung(einstellungen=None, umgebung=None, produktion=True):
	e = (einstellungen or {}).get("geltung")
	if e in ("alle", "firmen", "pilot", "aus"):
		return e
	u = str(umgebung or "").lower()
	if u in ("alle", "firmen", "pilot", "aus"):
		return u
	return "firmen" if produktion else "pilot"


def bonitaet_pflicht_aktiv(schritt, konto_id, firma, einstellungen=None, umgebung=None, produktion=True):
	e = {**bonitaet_einstellungen_standard(), **(einstellungen or {})}
	if (e.get("schritte") or {}).get(schritt) is False:
		return False
	g = bonitaet_geltung(e, umgebung, produktion)
	if g == "aus":
		return False
	if g == "alle":
		return True
	if g == "firmen":
		return bool(firma)
	return bool(firma) and konto_id in (e.get("pilotKonten") or [])


def bonitaet_gueltig(a, einstellungen=None, jetzt=None):
	"""a: dict mit status, auskunftAm (ISO/datetime), ampel, freigabe. Liefert (ok, grund)."""
	e = {**bonitaet_einstellungen_standard(), **(einstellungen or {})}
	if not a:
		return False, "fehlt"
	if a.get("status") not in ("abgeschlossen", "keine_daten"):
		return False, "offen"
	am = a.get("auskunftAm")
	if isinstance(am, str):
		am = datetime.fromisoformat(am.replace("Z", "+00:00"))
	if am and am.tzinfo is None:
		am = am.replace(tzinfo=timezone.utc)
	jetzt = jetzt or datetime.now(timezone.utc)
	if not am or (jetzt - am).days > int(e.get("gueltigTage") or 180):
		return False, "veraltet"
	if a.get("status") == "keine_daten" and not a.get("freigabe"):
		return False, "keine_daten"
	if a.get("ampel") == "rot" and e.get("rotSperrt") and not a.get("freigabe"):
		return False, "rot"
	return True, ""


def bonitaet_information(anbieter_label, subjekt, rechtsgrundlage):
	rg = BONITAET_RECHTSGRUNDLAGEN.get(rechtsgrundlage) or BONITAET_RECHTSGRUNDLAGEN["berechtigtes_interesse"]
	return (
		f"Wir haben zur Prüfung der Zahlungsfähigkeit von „{subjekt}“ eine Bonitätsauskunft bei {anbieter_label} eingeholt. "
		f"Zweck: Prüfung vor Eintritt in Kaufverhandlungen über Projektrechte bzw. Projektgesellschaften auf der ÖkoInvest-Plattform. Rechtsgrundlage: {rg}. "
		"Das Ergebnis wird nur einem kleinen, berechtigten Personenkreis angezeigt und nach Ablauf der Aufbewahrungsfrist gelöscht. Eine automatisierte Entscheidung findet nicht statt – ein Mensch bewertet die Auskunft. "
		"Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch (Art. 15–21 DSGVO) sowie auf Beschwerde bei der Aufsichtsbehörde."
	)


def demo_auskunft(name, land):
	"""Deterministischer Simulator (wie bonitaet/adapter.js): „Insolvenz/Liquidation“ im Namen → rot."""
	h = hashlib.sha256(str(name).lower().encode()).digest()
	kritisch = bool(re.search(r"insolven|liquidation|konkurs", str(name), re.I))
	score = 520 + (h[0] % 60) if kritisch else 140 + ((h[0] * 7 + h[1]) % 230)
	pd = round((0.18 + (h[2] % 10) / 100) if kritisch else (0.002 + (score - 140) / 9000), 3)
	limit = 0 if kritisch else round((250000 + (h[3] % 40) * 125000) / 5000) * 5000
	return {
		"status": "abgeschlossen", "score": score, "skala": "Demo-Index 100–600 (niedrig = gut)", "kreditlimit": limit, "waehrung": "CHF" if land == "CH" else "EUR",
		"ausfallwahrscheinlichkeit": pd, "zahlungsweise": "Zahlungsstörungen bekannt" if kritisch else ("innerhalb vereinbarter Ziele" if score <= 250 else "gelegentlich verzögert"),
		"negativmerkmale": ["Insolvenzverfahren eröffnet (Demo)"] if kritisch else [], "referenz": "DEMO-" + h.hex()[:10].upper(),
	}


# ====================================================================== Rechtsformen und Gründungsschritte

RECHTSFORMEN = {
	"at_gmbh": {"land": "AT", "label": "GmbH (Österreich)", "kurz": "GmbH", "waehrung": "EUR", "kapital": 10000, "einzahlung": 5000, "register": "Firmenbuch (FN)"},
	"de_gmbh": {"land": "DE", "label": "GmbH (Deutschland)", "kurz": "GmbH", "waehrung": "EUR", "kapital": 25000, "einzahlung": 12500, "register": "Handelsregister Abteilung B (HRB)"},
	"de_ug": {"land": "DE", "label": "UG (haftungsbeschränkt) (Deutschland)", "kurz": "UG (haftungsbeschränkt)", "waehrung": "EUR", "kapital": 1, "einzahlung": 1, "register": "Handelsregister Abteilung B (HRB)"},
	"de_gmbh_co_kg": {"land": "DE", "label": "GmbH & Co. KG (Deutschland)", "kurz": "GmbH & Co. KG", "waehrung": "EUR", "kapital": 0, "einzahlung": 0, "register": "Handelsregister Abteilung A (HRA)", "komplementaer": True},
	"ch_gmbh": {"land": "CH", "label": "GmbH (Schweiz)", "kurz": "GmbH", "waehrung": "CHF", "kapital": 20000, "einzahlung": 20000, "register": "Handelsregister (CHE-Nummer, Zefix)"},
}

_SCHRITTE = [
	("namenspruefung", "Vorbereitung", "Firmenname geprüft (Registersuche)", True, None, None, None),
	("komplementaer", "Vorbereitung", "Komplementär-GmbH vorhanden bzw. gegründet", True, None, None, ["de_gmbh_co_kg"]),
	("unterlagen", "Vorbereitung", "Dokumentenpaket erstellt und an das Notariat übermittelt", True, None, None, None),
	("notartermin", "Notariat", "Notartermin gebucht", True, "termin", None, None),
	("beurkundet", "Notariat", "Gründung beurkundet", True, None, None, None),
	("bankkonto", "Kapital", "Bankkonto eröffnet", True, None, None, None),
	("einzahlung", "Kapital", "Stammeinlage eingezahlt, Bankbestätigung liegt vor", True, "betrag", None, None),
	("anmeldung", "Register", "Anmeldung zum Register eingereicht", True, None, None, None),
	("eingetragen", "Register", "Eingetragen (FN / HRB / HRA / CHE)", True, "registernummer", None, None),
	("steuer", "Behörden", "Steuerliche Erfassung (Steuernummer, UID)", True, "uid", ("eingetragen", 30), None),
	("transparenz", "Behörden", "Wirtschaftliche Eigentümer gemeldet", True, None, ("eingetragen", 28), None),
	("gewerbe", "Behörden", "Gewerbe-/Kammerpflichten geprüft", False, None, None, None),
	("projektrechte", "Projekt", "Projektrechte übertragen (Einbringungs- bzw. Kaufvertrag)", True, None, None, None),
	("erp", "Projekt", "Gesellschaft in der Buchhaltung angelegt (ERPNext-Company)", False, None, None, None),
]
VORAUSSETZUNG = {"beurkundet": ["unterlagen"], "einzahlung": ["bankkonto"], "anmeldung": ["beurkundet", "einzahlung"], "eingetragen": ["anmeldung"], "steuer": ["beurkundet"], "transparenz": ["eingetragen"], "projektrechte": ["beurkundet"]}
_LAND_LABEL = {
	"transparenz": {"AT": "WiEReG-Meldung erstattet", "DE": "Transparenzregister-Meldung erstattet", "CH": "Verzeichnis der wirtschaftlich Berechtigten angelegt"},
	"steuer": {"AT": "Steuernummer und UID beantragt (FinanzOnline / Verf 15)", "DE": "Steuerliche Erfassung (ELSTER) und USt-IdNr.", "CH": "Steuerliche Anmeldung / MWST geprüft"},
}


def schritte_fuer(rechtsform):
	rf = RECHTSFORMEN[rechtsform]
	aus = []
	for i, (s, gruppe, label, pflicht, feld, frist, nur) in enumerate(x for x in _SCHRITTE if not x[6] or rechtsform in x[6]):
		if s in _LAND_LABEL:
			label = _LAND_LABEL[s][rf["land"]]
		if s == "eingetragen":
			label = f"Eingetragen im {rf['register']}"
		aus.append({"schluessel": s, "reihenfolge": i + 1, "gruppe": gruppe, "label": label, "pflicht": pflicht, "feld": feld, "frist": {"nach": frist[0], "tage": frist[1]} if frist else None, "status": "offen", "datum": None, "notiz": "", "wert": ""})
	return aus


def status_aus_schritten(status, schritte):
	if status in ("bestand", "aufgeloest"):
		return status
	fertig = lambda k: any(x["schluessel"] == k and x["status"] in ("erledigt", "entfaellt") for x in schritte)  # noqa: E731
	pflicht = [x for x in schritte if x["pflicht"]]
	if pflicht and all(x["status"] in ("erledigt", "entfaellt") for x in pflicht):
		return "aktiv"
	if fertig("eingetragen"):
		return "eingetragen"
	if fertig("beurkundet") or fertig("notartermin") or fertig("anmeldung"):
		return "in_gruendung"
	return "entwurf"


JAHRESABSCHLUSS = {"AT": (9, "Jahresabschluss beim Firmenbuch einreichen (§ 277 UGB)"), "DE": (12, "Jahresabschluss offenlegen (Unternehmensregister, § 325 HGB)"), "CH": (6, "Ordentliche Gesellschafterversammlung – Genehmigung Jahresrechnung (Art. 805 OR)")}


def _plus_monate(d, m):
	jahr, monat = d.year + (d.month - 1 + m) // 12, (d.month - 1 + m) % 12 + 1
	tag = min(d.day, [31, 29 if jahr % 4 == 0 and (jahr % 100 or jahr % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monat - 1])
	return date(jahr, monat, tag)


def fristen_fuer(land, status, schritte, bilanzstichtag="12-31", heute=None, gegruendet=None):
	"""Meldefristen nach Eintragung, nächster Jahresabschluss, WiEReG-Jahresprüfung (AT)."""
	heute = heute or date.today()
	aus = []
	for s in schritte:
		if not s.get("frist"):
			continue
		basis = next((x for x in schritte if x["schluessel"] == s["frist"]["nach"]), None)
		if not basis or basis["status"] != "erledigt" or not basis.get("datum"):
			continue
		faellig = date.fromisoformat(str(basis["datum"])[:10]) + timedelta(days=s["frist"]["tage"])
		aus.append({"art": "meldung", "schritt": s["schluessel"], "label": s["label"], "faellig": faellig.isoformat(), "erledigt": s["status"] in ("erledigt", "entfaellt")})
	if status in ("eingetragen", "aktiv", "bestand") and land in JAHRESABSCHLUSS:
		monate, label = JAHRESABSCHLUSS[land]
		mm, tt = [int(x) for x in str(bilanzstichtag or "12-31").split("-")]
		gegruendet = date.fromisoformat(str(gegruendet)[:10]) if gegruendet else None
		# nächste noch offene Frist für ein Geschäftsjahr, das es schon gibt (Stichtag nach der Gründung)
		for jahr in (heute.year - 1, heute.year, heute.year + 1):
			stichtag = date(jahr, mm, tt)
			faellig = _plus_monate(stichtag, monate)
			if (not gegruendet or stichtag >= gegruendet) and faellig >= heute:
				break
		aus.append({"art": "abschluss", "label": f"{label} – Geschäftsjahr bis {stichtag.strftime('%d.%m.%Y')}", "faellig": faellig.isoformat(), "erledigt": False})
		if land == "AT":
			aus.append({"art": "wiereg", "label": "WiEReG: jährliche Überprüfung und Bestätigung der wirtschaftlichen Eigentümer", "faellig": (faellig + timedelta(days=28)).isoformat(), "erledigt": False})
	return sorted(aus, key=lambda x: x["faellig"])


def gruendung_pruefen(g):
	"""Pflichtangaben wie gruendungPruefen() der Website. Liefert Fehlerliste."""
	f = []
	rf = RECHTSFORMEN.get(g.get("rechtsform"))
	if not rf:
		return ["Bitte wählen Sie Land und Rechtsform."]
	if not str(g.get("name") or "").strip():
		f.append("Bitte geben Sie den Firmennamen an.")
	if not str(g.get("sitz") or "").strip():
		f.append("Bitte geben Sie den Sitz (Gemeinde) an.")
	kap = float(g.get("stammkapital") or 0)
	if rf["kapital"] and kap < rf["kapital"]:
		f.append(f"Das Stammkapital muss mindestens {rf['kapital']:,} {rf['waehrung']} betragen.".replace(",", "."))
	einz = float(g.get("einzahlung") or 0)
	if rf["einzahlung"] and einz < rf["einzahlung"]:
		f.append(f"Bei Gründung müssen mindestens {rf['einzahlung']:,} {rf['waehrung']} eingezahlt werden.".replace(",", "."))
	if rf["kapital"] and einz > kap:
		f.append("Die Einzahlung kann das Stammkapital nicht übersteigen.")
	ges = g.get("gesellschafter") or []
	if not ges:
		f.append("Bitte erfassen Sie mindestens einen Gesellschafter.")
	summe = sum(float(x.get("anteil") or 0) for x in ges)
	if ges and abs(summe - 100) > 0.01:
		f.append("Die Anteile der Gesellschafter müssen zusammen 100 % ergeben.")
	if not any(str(x.get("name") or "").strip() for x in (g.get("geschaeftsfuehrung") or [])):
		f.append("Bitte geben Sie mindestens eine Geschäftsführerin bzw. einen Geschäftsführer an.")
	if rf.get("komplementaer") and not str((g.get("komplementaer") or {}).get("name") or "").strip():
		f.append("Bitte geben Sie die Komplementär-GmbH an.")
	if rf["land"] == "CH" and not any(str(x.get("wohnsitzLand") or "").upper() == "CH" for x in (g.get("geschaeftsfuehrung") or [])):
		f.append("Mindestens eine vertretungsbefugte Person muss Wohnsitz in der Schweiz haben.")
	return f


def musterprotokoll_moeglich(g):
	return g.get("rechtsform") in ("de_gmbh", "de_ug") and len(g.get("gesellschafter") or []) <= 3 and len(g.get("geschaeftsfuehrung") or []) == 1


def gegenstand_vorlage(land="AT", typ="freiflaeche", ort=""):
	art = {"agri": "Agri-Photovoltaik-Anlage", "speicher": "Batteriespeicheranlage", "carport": "Photovoltaik-Parkplatzüberdachung", "hybrid": "Photovoltaik-Kraftwerks mit Batteriespeicher"}.get(typ, "Photovoltaik-Freiflächenanlage")
	standort = f" am Standort {ort}" if ort else ""
	zusatz = (
		"Die Gesellschaft kann Zweigniederlassungen errichten, sich an anderen Unternehmen beteiligen sowie Grundstücke erwerben, belasten und veräußern."
		if land == "CH"
		else "Die Gesellschaft ist zu allen Geschäften und Maßnahmen berechtigt, die dem Gesellschaftszweck unmittelbar oder mittelbar dienen, insbesondere zum Abschluss von Nutzungs-, Netzanschluss- und Stromlieferverträgen (PPA) sowie zur Beteiligung an anderen Unternehmen, soweit dies keiner behördlichen Erlaubnis bedarf."
	)
	return f"Gegenstand des Unternehmens ist die Planung, Errichtung, der Erwerb und der Betrieb einer {art}{standort} sowie die Erzeugung, Speicherung und Vermarktung von elektrischer Energie aus erneuerbaren Quellen. {zusatz}"


# ====================================================================== Frappe-Teil: Bonität vor LOI/Gebot (für ablauf.py, api/bieter.py)


def _bonitaet_fehler():
	import frappe

	class BonitaetErforderlich(frappe.ValidationError):
		"""HTTP 409 – der Website-Adapter (backend/frappe.js) macht daraus PlattformFehler(409, …, "bonitaet")."""

		http_status_code = 409

	return BonitaetErforderlich


def bonitaet_einstellungen():
	import json

	import frappe

	roh = frappe.db.get_default("oekoinvest_bonitaet_einstellungen")
	try:
		gespeichert = json.loads(roh) if roh else {}
	except ValueError:
		gespeichert = {}
	return {**bonitaet_einstellungen_standard(), **gespeichert}


def ist_firma(konto_id=None, organisation_id=None):
	import frappe

	if organisation_id:
		return True
	if konto_id and str(frappe.db.get_value("Plattform Konto", konto_id, "firma") or "").strip():
		return True
	if konto_id and frappe.db.exists("DocType", "KYC Fall"):
		return frappe.db.get_value("KYC Fall", {"konto": konto_id}, "kontotyp") == "unternehmen"
	return False


def bonitaet_aktuell(konto_id=None, organisation_id=None):
	import frappe

	if not (organisation_id or konto_id):
		return None
	# Organisation vor Konto (wie bonitaetAktuell in JS): gibt es Firmenauskünfte, zählt nur diese – eine neuere Personenauskunft
	# darf eine (rote) Firmenauskunft nicht überdecken; ohne Firmenauskunft gilt die Auskunft zum Konto.
	namen = []
	if organisation_id:
		namen = frappe.get_all("Plattform Bonitaetsauskunft", filters={"subjekt_organisation": organisation_id}, pluck="name", order_by="auskunft_am desc", limit_page_length=1)
	if not namen and konto_id:
		namen = frappe.get_all("Plattform Bonitaetsauskunft", filters={"subjekt_konto": konto_id}, pluck="name", order_by="auskunft_am desc", limit_page_length=1)
	if not namen:
		return None
	d = frappe.get_doc("Plattform Bonitaetsauskunft", namen[0])
	return {"id": d.name, "status": d.status, "auskunftAm": d.auskunft_am, "ampel": d.ampel, "freigabe": bool(d.freigabe_am)}


def bonitaet_freigabe(schritt, konto_id=None, organisation_id=None):
	import frappe

	e = bonitaet_einstellungen()
	aktiv = bonitaet_pflicht_aktiv(schritt, konto_id, ist_firma(konto_id, organisation_id), e, frappe.conf.get("oekoinvest_bonitaet_vor_loi"), not frappe.conf.get("developer_mode"))
	if not aktiv:
		return {"ok": True, "aktiv": False, "grund": ""}
	a = bonitaet_aktuell(konto_id, organisation_id)
	ok, grund = bonitaet_gueltig(a, e)
	return {"ok": ok, "aktiv": True, "grund": grund, "auskunftId": (a or {}).get("id")}


def bonitaet_sperre(schritt, konto_id=None, organisation_id=None, text=None):
	"""Wirft BonitaetErforderlich (HTTP 409), wenn für LOI/Gebot keine gültige Auskunft vorliegt (nur wenn Pflicht)."""
	import frappe

	r = bonitaet_freigabe(schritt, konto_id, organisation_id)
	if r["ok"]:
		return r
	frappe.throw(text or BONITAET_HINWEIS_NUTZER, _bonitaet_fehler(), title="Bonität")


def bonitaet_uebergang_pruefen(art, o, nach):
	"""Hook für ablauf.uebergang_anwenden: LOI nur mit gültiger Bonitätsauskunft (wenn Pflicht)."""
	if art == "interesse" and nach == "loi_abgegeben":
		bonitaet_sperre("loi", konto_id=o.investor_id, organisation_id=o.get("organisation_id") or None)
	return True


_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def neue_kennung(doctype, praefix, laenge=6):
	"""Kennung PRÄFIX-JJ-XXXXXX (zufällig, nicht aufzählbar) – wie kern.neue_id, aber ohne Eintrag in konstanten.PRAEFIX."""
	import secrets

	import frappe
	from frappe.utils import now_datetime

	jahr = now_datetime().strftime("%y")
	for _ in range(25):
		name = f"{praefix}-{jahr}-" + "".join(secrets.choice(_ALPHABET) for _ in range(laenge))
		if not frappe.db.exists(doctype, name):
			return name
	frappe.throw("Kennung konnte nicht erzeugt werden.")


# ====================================================================== Jinja (Druckformat „Projektgesellschaft Gründungspaket“)

MUSTER_HINWEIS = "MUSTER – Entwurf zur Prüfung und Beurkundung durch das Notariat. Keine Rechtsberatung. Vor Verwendung an den Einzelfall anpassen."
_BEURKUNDUNG = {
	"at_gmbh": "Notariatsakt (Präsenz oder elektronisch per Video-Notar nach § 69b NO)",
	"de_gmbh": "Notarielle Beurkundung (Präsenz oder online über das Videokommunikationssystem der Bundesnotarkammer)",
	"de_ug": "Notarielle Beurkundung (Präsenz oder online über das Videokommunikationssystem der Bundesnotarkammer)",
	"de_gmbh_co_kg": "KG-Vertrag privatschriftlich; Handelsregisteranmeldung notariell beglaubigt",
	"ch_gmbh": "Öffentliche Urkunde (Urkundsperson nach kantonalem Recht)",
}


def oekoinvest_gesellschaft(name):
	"""Daten einer Projektgesellschaft für das Druckformat (nur mit Leserecht auf den DocType)."""
	import json

	import frappe

	if not name or not frappe.has_permission("Plattform Projektgesellschaft", "read", name):
		return {}
	g = frappe.get_doc("Plattform Projektgesellschaft", name)

	def js(x, standard):
		try:
			return json.loads(x) if x else standard
		except ValueError:
			return standard

	rf = RECHTSFORMEN.get(g.rechtsform, {})
	gesellschafter = js(g.gesellschafter, [])
	eigentuemer = [x for x in gesellschafter if float(x.get("anteil") or 0) > 25]
	return {
		"rf": rf, "beurkundung": _BEURKUNDUNG.get(g.rechtsform, ""), "muster": MUSTER_HINWEIS, "gesellschafter": gesellschafter, "geschaeftsfuehrung": js(g.geschaeftsfuehrung, []),
		"komplementaer": js(g.komplementaer, None), "projekt": js(g.projekt_json, None), "eigentuemer": eigentuemer, "einer": len(gesellschafter) == 1,
		"gegenstand": g.gegenstand or gegenstand_vorlage(g.land), "musterprotokoll": bool(g.musterprotokoll) and musterprotokoll_moeglich({"rechtsform": g.rechtsform, "gesellschafter": gesellschafter, "geschaeftsfuehrung": js(g.geschaeftsfuehrung, [])}),
		"register": {"AT": "Firmenbuch", "DE": "Handelsregister", "CH": "Handelsregister"}.get(g.land, "Register"),
		"meldung": {"AT": "WiEReG-Meldung über das Unternehmensserviceportal binnen vier Wochen nach Eintragung; jährliche Überprüfung.", "DE": "Meldung an das Transparenzregister (§ 20 GwG) – jede Gesellschaft meldet selbst.", "CH": "Verzeichnis der Gesellschafter und wirtschaftlich Berechtigten führen (Art. 790a OR)."}.get(g.land, ""),
	}
