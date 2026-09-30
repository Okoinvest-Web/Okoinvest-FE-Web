# Copyright (c) 2026, ÖkoInvest GmbH
#
# Pachtakte (Team 1 – Flächeneigentümer, Landwirt, Dacheigentümer) – reine Regeln, 1:1 wie src/lib/plattform/pachtakte.js.
# Tabellen und Texte stehen in pachtakte_vorlagen.json (generiert: node scripts/pachtakte-vorlagen-export.mjs).
# Ohne Frappe/Datenbank lauffähig:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_pachtakte_kern
#
# Anliegen (Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung, Verlängerung), Fristen, Rückbau und
# Rückbausicherheit, Agri-PV-Bewirtschaftungsnachweis (DIN SPEC 91434), Jahresbescheinigung. Fehler als PachtakteFehler
# (status 409/422 wie die Website) – die API wandelt sie in frappe.ValidationError bzw. DuplicateEntryError um.
# KEINE Rechts- oder Steuerberatung – Hinweise sind vorsichtig formuliert und vor Livegang gegenzulesen.

import calendar
import json
import math
import os
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

_PFAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pachtakte_vorlagen.json")
with open(_PFAD, encoding="utf-8") as _f:
	V = json.load(_f)

ANLIEGEN_STATUS = V["ANLIEGEN_STATUS"]
ANLIEGEN_OFFEN = tuple(V["ANLIEGEN_OFFEN"])
ANLIEGEN_BEARBEITUNG_TAGE = V["ANLIEGEN_BEARBEITUNG_TAGE"]
KUENDIGUNG_GRUENDE = V["KUENDIGUNG_GRUENDE"]
WECHSEL_ANLAESSE = V["WECHSEL_ANLAESSE"]
ERBNACHWEISE = V["ERBNACHWEISE"]
AUFTEILUNG_GRUNDLAGEN = V["AUFTEILUNG_GRUNDLAGEN"]
VERLAENGERUNG_WUENSCHE = V["VERLAENGERUNG_WUENSCHE"]
ANLIEGEN_ARTEN = V["ANLIEGEN_ARTEN"]
ANLIEGEN_UEBERGAENGE = V["ANLIEGEN_UEBERGAENGE"]
RUECKBAU_STATUS = V["RUECKBAU_STATUS"]
RUECKBAU_UEBERGAENGE = V["RUECKBAU_UEBERGAENGE"]
SICHERHEIT_STATUS = V["SICHERHEIT_STATUS"]
SICHERHEIT_ARTEN = V["SICHERHEIT_ARTEN"]
AGRI_NACHWEIS_ARTEN = V["AGRI_NACHWEIS_ARTEN"]
AGRI_NACHWEIS_STATUS = V["AGRI_NACHWEIS_STATUS"]
AGRI_NACHWEIS_KULTUREN = V["AGRI_NACHWEIS_KULTUREN"]
AGRI_NACHWEIS_EINHEITEN = V["AGRI_NACHWEIS_EINHEITEN"]
AGRI_BEWIRTSCHAFTER = V["AGRI_BEWIRTSCHAFTER"]
JA_NEIN_ENTFAELLT = V["JA_NEIN_ENTFAELLT"]
DIN_91434 = V["DIN_91434"]
AGRI_NACHWEIS_UEBERGAENGE = V["AGRI_NACHWEIS_UEBERGAENGE"]
STEUER_HINWEISE_PACHT = V["STEUER_HINWEISE_PACHT"]
LAND_TEXT = V["LAND_TEXT"]


class PachtakteFehler(Exception):
	def __init__(self, status, text):
		super().__init__(text)
		self.status = status
		self.text = text


def _ungueltig(t):
	return PachtakteFehler(422, t)


def _konflikt(t):
	return PachtakteFehler(409, t)


# ---------------------------------------------------------------- Helfer (wie pachtakte.js)

_STEUER = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_TAG = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_EMAIL = re.compile(r'^[^\s@<>()\[\]\\,;:"]{1,64}@[^\s@<>()\[\]\\,;:"]{1,190}\.[a-z]{2,24}$', re.IGNORECASE)


def text(x, maximal=200):
	return re.sub(r"[\r\n]+", " ", _STEUER.sub("", "" if x is None else str(x))).strip()[:maximal]


def mehrzeilig(x, maximal=2000):
	return _STEUER.sub("", "" if x is None else str(x)).replace("\r\n", "\n").replace("\r", "\n").strip()[:maximal]


def auswahl(x, erlaubt, standard=""):
	s = "" if x is None else str(x)
	return s if s in erlaubt else standard


def zahl(x, minimum=float("-inf"), maximum=float("inf"), stellen=2):
	if x is None or x == "" or isinstance(x, bool):
		return None
	if isinstance(x, (int, float)):
		n = float(x)
	else:
		s = re.sub(r"\s", "", str(x))
		s = re.sub(r"\.(?=\d{3}(\D|$))", "", s).replace(",", ".")
		try:
			n = float(s)
		except ValueError:
			return None
	if math.isnan(n) or n < minimum or n > maximum:
		return None
	r = round(n * 10**stellen) / 10**stellen
	return int(r) if stellen == 0 else r


def email(x):
	e = text(x, 254).lower()
	if not e:
		return ""
	if not _EMAIL.match(e):
		raise _ungueltig(f"Ungültige E-Mail-Adresse: {e[:60]}")
	return e


def ist_datum(s):
	m = _TAG.match(str(s or ""))
	if not m:
		return False
	try:
		date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
		return True
	except ValueError:
		return False


def datum(x):
	return str(x) if ist_datum(x) else ""


def datum_de(s):
	return f"{s[8:10]}.{s[5:7]}.{s[0:4]}" if ist_datum(s) else ""


def plus_monate(tag, m):
	j, mo, t = (int(x) for x in str(tag).split("-"))
	gesamt = (mo - 1) + m
	j2, mo2 = j + gesamt // 12, gesamt % 12 + 1
	return f"{j2:04d}-{mo2:02d}-{min(t, calendar.monthrange(j2, mo2)[1]):02d}"


def plus_jahre(tag, j):
	return plus_monate(tag, 12 * j)


def plus_tage(tag, n):
	return date.fromordinal(date.fromisoformat(tag).toordinal() + int(n or 0)).isoformat()


def tage_zwischen(a, b):
	return date.fromisoformat(b).toordinal() - date.fromisoformat(a).toordinal()


def rund2(x):
	return round(float(x) + 0.0, 2)


def laufzeit_ende(beginn, jahre):
	"""Wie finanzen.laufzeitEnde: Beginn + Laufzeit − 1 Tag (29.02. → 28.02.)."""
	if not ist_datum(beginn) or not (jahre and int(jahre) > 0):
		return ""
	j = int(beginn[:4]) + int(jahre)
	ziel = f"{j}{beginn[4:]}"
	return plus_tage(ziel, -1) if ist_datum(ziel) else f"{j}-02-28"


def _land(l):
	return l if l in ("DE", "AT", "CH") else "DE"


# ================================================================ Anliegen


def anliegen_aktionen(status, wer):
	return [u for u in ANLIEGEN_UEBERGAENGE if u["wer"] == wer and status in u["von"]]


def anliegen_erlaubt(art, vertrag, offene=()):
	a = ANLIEGEN_ARTEN.get(art)
	if not a:
		raise _ungueltig("Unbekannte Art des Anliegens.")
	if not vertrag:
		raise _ungueltig("Pachtvertrag angeben.")
	if vertrag.get("status") not in a["nurStatus"]:
		st = vertrag.get("status")
		raise _konflikt("Der Pachtvertrag ist bereits beendet." if st == "beendet" else "Der Pachtvertrag ist bereits gekündigt." if st == "gekuendigt" else "Für diesen Vertrag ist das Anliegen derzeit nicht möglich.")
	if any(x.get("art") == art and x.get("status") in ANLIEGEN_OFFEN for x in offene):
		raise _konflikt(f"Zu diesem Vertrag ist bereits ein Anliegen „{a['kurz']}“ in Bearbeitung.")
	return True


def _personen(roh, mit_anteil=False, pflicht_anteil=False, minimum=1, maximum=20, was="Person"):
	liste = list(roh if isinstance(roh, list) else [])[: maximum + 1]
	if len(liste) > maximum:
		raise _ungueltig(f"Höchstens {maximum} Einträge.")
	aus = []
	for p in liste:
		p = p if isinstance(p, dict) else {}
		e = {"name": text(p.get("name"), 120), "email": email(p.get("email"))}
		if mit_anteil:
			e["anteilProzent"] = zahl(p.get("anteilProzent"), 0, 100, 4)
		if e["name"] or e["email"]:
			aus.append(e)
	if len(aus) < minimum:
		raise _ungueltig(f"Bitte mindestens eine {was} angeben." if minimum == 1 else f"Bitte mindestens {minimum} Einträge angeben.")
	if any(not p["name"] for p in aus):
		raise _ungueltig(f"Bitte zu jeder {was} den Namen angeben.")
	if mit_anteil:
		mit = [p for p in aus if p["anteilProzent"] is not None]
		if pflicht_anteil and len(mit) != len(aus):
			raise _ungueltig("Bitte zu jeder Person den Anteil in % angeben.")
		if mit and len(mit) != len(aus):
			raise _ungueltig("Anteile bitte für alle oder für niemanden angeben.")
		if any(not (p["anteilProzent"] > 0) for p in mit):
			raise _ungueltig("Anteile müssen größer als 0 % sein.")
		if mit:
			s = sum(p["anteilProzent"] for p in mit)
			if abs(s - 100) > 0.01:
				raise _ungueltig(f"Die Anteile ergeben zusammen {str(rund2(s)).rstrip('0').rstrip('.').replace('.', ',')} % – sie müssen genau 100 % ergeben.")
	return aus


def anliegen_bereinigen(art, roh=None, heute=None, land="DE", vertrag=None):
	d = roh if isinstance(roh, dict) else {}
	L = _land(land)
	bemerkung = mehrzeilig(d.get("bemerkung"), 2000)
	if art == "kuendigung":
		grund = auswahl(d.get("grund"), KUENDIGUNG_GRUENDE)
		if not grund:
			raise _ungueltig("Bitte den Grund der Kündigung wählen.")
		zum = datum(d.get("zumDatum"))
		if not zum:
			raise _ungueltig("Bitte angeben, zu welchem Datum der Vertrag enden soll.")
		if heute and zum < heute:
			raise _ungueltig("Das Datum der Beendigung darf nicht in der Vergangenheit liegen.")
		begr = mehrzeilig(d.get("begruendung"), 3000)
		if grund == "ausserordentlich" and len(begr) < 20:
			raise _ungueltig("Bitte den wichtigen Grund kurz beschreiben (mindestens 20 Zeichen).")
		return {"grund": grund, "zumDatum": zum, "begruendung": begr, "bemerkung": bemerkung}
	if art == "eigentuemerwechsel":
		anlass = auswahl(d.get("anlass"), WECHSEL_ANLAESSE)
		if not anlass:
			raise _ungueltig("Bitte den Anlass des Eigentümerwechsels wählen.")
		stichtag = datum(d.get("stichtag"))
		if not stichtag:
			raise _ungueltig("Bitte den Stichtag angeben (Übergang von Nutzen und Lasten).")
		e = d.get("erwerber") if isinstance(d.get("erwerber"), dict) else {}
		erwerber = {"name": text(e.get("name"), 160), "email": email(e.get("email")), "anschrift": text(e.get("anschrift"), 240)}
		if not erwerber["name"]:
			raise _ungueltig("Bitte den Namen des neuen Eigentümers angeben.")
		anteil = zahl(d.get("anteilProzent"), 0.01, 100, 4)
		return {"anlass": anlass, "stichtag": stichtag, "erwerber": erwerber, "anteilProzent": 100 if anteil is None else anteil, "bemerkung": bemerkung}
	if art == "erbfall":
		verstorben = text(d.get("verstorben"), 160)
		if not verstorben:
			raise _ungueltig("Bitte den Namen der verstorbenen Person angeben.")
		todestag = datum(d.get("todestag"))
		if not todestag:
			raise _ungueltig("Bitte das Todesdatum angeben.")
		if heute and todestag > heute:
			raise _ungueltig("Das Todesdatum darf nicht in der Zukunft liegen.")
		nachweis = auswahl(d.get("nachweis"), ERBNACHWEISE[L])
		if not nachweis:
			raise _ungueltig("Bitte den Erbnachweis wählen (oder „Nachweis folgt“).")
		erben = _personen(d.get("erben"), mit_anteil=True, was="erbende Person")
		vertreter = text(d.get("vertreter"), 160)
		if len(erben) > 1 and not vertreter:
			raise _ungueltig("Bei mehreren Erben bitte angeben, wer bis zur Auseinandersetzung für alle handelt (Vertretung).")
		return {"verstorben": verstorben, "todestag": todestag, "nachweis": nachweis, "erben": erben, "vertreter": vertreter, "bemerkung": bemerkung}
	if art == "zahlungsaufteilung":
		grundlage = auswahl(d.get("grundlage"), AUFTEILUNG_GRUNDLAGEN)
		if not grundlage:
			raise _ungueltig("Bitte die Grundlage der Aufteilung wählen.")
		empf = _personen(d.get("empfaenger"), mit_anteil=True, pflicht_anteil=True, minimum=2, was="empfangende Person")
		return {"grundlage": grundlage, "empfaenger": empf, "ab": datum(d.get("ab")), "bemerkung": bemerkung}
	if art == "verlaengerung":
		wunsch = auswahl(d.get("wunsch"), VERLAENGERUNG_WUENSCHE)
		if not wunsch:
			raise _ungueltig("Bitte wählen, was Sie möchten.")
		jahre = zahl(d.get("jahre"), 1, 40, 0)
		if wunsch == "ausueben" and vertrag is not None and not (vertrag.get("laufzeitJahre") or 0) > 0:
			raise _ungueltig("Für diesen Vertrag ist keine Laufzeit hinterlegt.")
		return {"wunsch": wunsch, "jahre": jahre, "bemerkung": bemerkung}
	raise _ungueltig("Unbekannte Art des Anliegens.")


def anliegen_uebergang(anliegen, nach, wer, eingabe=None, heute=None):
	eingabe = eingabe or {}
	u = next((x for x in ANLIEGEN_UEBERGAENGE if x["nach"] == nach and x["wer"] == wer and anliegen["status"] in x["von"]), None)
	if not u:
		raise _konflikt(f"Von „{ANLIEGEN_STATUS.get(anliegen['status'], {}).get('label', anliegen['status'])}“ ist dieser Schritt nicht möglich.")
	kommentar = mehrzeilig(eingabe.get("kommentar"), 2000)
	if "kommentar" in (u.get("pflicht") or []) and len(kommentar) < 3:
		raise _ungueltig("Bitte das Ergebnis für den Eigentümer beschreiben." if nach == "erledigt" else "Bitte eine Begründung bzw. Nachricht angeben.")
	ergebnis = {}
	daten = anliegen.get("daten") or {}
	if nach == "erledigt":
		if anliegen["art"] == "kuendigung":
			wz = datum(eingabe.get("wirksamZum")) or daten.get("zumDatum") or ""
			if not wz:
				raise _ungueltig("Bitte angeben, zu welchem Datum die Kündigung wirksam wird.")
			ergebnis["wirksamZum"] = wz
		if anliegen["art"] in ("eigentuemerwechsel", "erbfall") and eingabe.get("neuesKontoId"):
			ergebnis["neuesKontoId"] = text(eingabe.get("neuesKontoId"), 40)
		if anliegen["art"] == "eigentuemerwechsel":
			ergebnis["ab"] = datum(eingabe.get("ab")) or daten.get("stichtag") or ""
	return {"von": anliegen["status"], "nach": nach, "aktion": u["aktion"], "kommentar": kommentar, "ergebnis": ergebnis, "am": heute or ""}


def anliegen_info(art, land):
	a = ANLIEGEN_ARTEN.get(art)
	L = _land(land)
	return {"label": a["label"], "kurz": a["kurz"], "text": a["text"], "hinweise": a["hinweise"].get(L, []), "unterlagen": a["unterlagen"].get(L, [])} if a else None


def anliegen_zusammenfassung(a):
	d = (a or {}).get("daten") or {}
	art = (a or {}).get("art")
	if art == "kuendigung":
		return f"{KUENDIGUNG_GRUENDE.get(d.get('grund'), 'Kündigung')} zum {datum_de(d.get('zumDatum'))}"
	if art == "eigentuemerwechsel":
		return f"{WECHSEL_ANLAESSE.get(d.get('anlass'), 'Wechsel')} an {(d.get('erwerber') or {}).get('name') or '–'} zum {datum_de(d.get('stichtag'))}"
	if art == "erbfall":
		n = len(d.get("erben") or [])
		return f"Erbfall {d.get('verstorben') or ''} – {n} {'Erbe' if n == 1 else 'Erben'}"
	if art == "zahlungsaufteilung":
		e = d.get("empfaenger") or []

		def pz(x):
			return (f"{x:g}" if isinstance(x, (int, float)) else str(x)).replace(".", ",")

		return f"Aufteilung auf {len(e)} Empfänger ({' / '.join(pz(p.get('anteilProzent')) + ' %' for p in e)})"
	if art == "verlaengerung":
		zusatz = f" ({d['jahre']} Jahre)" if d.get("jahre") else ""
		return f"{VERLAENGERUNG_WUENSCHE.get(d.get('wunsch'), 'Verlängerung')}{zusatz}"
	return ""


# ================================================================ Fristen


def vertrags_fristen(vertrag, angebot=None, heute=None):
	f = []
	pa = angebot or {}

	def add(i, d, titel, t):
		if not ist_datum(d):
			return
		tage = tage_zwischen(heute, d) if heute else None
		ton = "info" if tage is None else "neutral" if tage < 0 else "warn" if tage <= 180 else "info"
		f.append({"id": i, "datum": d, "titel": titel, "text": t, "tage": tage, "ton": ton})

	if not vertrag:
		return f
	if not ist_datum(vertrag.get("beginn")) and ist_datum(vertrag.get("vertragsdatum")) and (pa.get("vorlaufJahre") or 0) > 0:
		nb = {"entschaedigung": "Sie erhalten die Fläche zurück und eine Entschädigung.", "rueckgabe": "Sie erhalten die Fläche zurück.", "nichts": "Der Vertrag regelt die Folgen nicht ausdrücklich – bitte ansprechen."}.get(pa.get("nichtbau"), "Die Folgen regelt Ihr Vertrag.")
		add("baubeginn", plus_jahre(vertrag["vertragsdatum"], int(pa["vorlaufJahre"])), "Späteste Frist bis Baubeginn", f"Wird bis dahin nicht gebaut: {nb}")
	ende = vertrag.get("ende") or ""
	if ist_datum(ende):
		vj = pa.get("verlaengerungJahre") or 0
		add("ende", ende, "Ende der Grundlaufzeit", f"Danach ist eine Verlängerung um {vj} Jahre vorgesehen – Voraussetzungen und Fristen laut Vertrag." if vj > 0 else "Danach endet der Vertrag, sofern nichts anderes vereinbart ist; es folgt der Rückbau.")
		add("vorbereitung", plus_monate(ende, -24), "Verlängerung oder Rückbau abstimmen", "Zwei Jahre vor Laufzeitende besprechen wir mit Ihnen Verlängerung, neue Konditionen oder den Rückbau.")
	if ist_datum(vertrag.get("kuendigungZum")):
		add("kuendigung", vertrag["kuendigungZum"], "Vertragsende laut Kündigung", "Zu diesem Datum endet der Vertrag; Rückbau und Rückgabe der Fläche folgen nach Vertrag.")
	return sorted(f, key=lambda x: x["datum"])


# ================================================================ Rückbau und Sicherheit


def akte_start(angebot=None):
	pa = angebot or {}
	vereinbart = bool(pa.get("rueckbau")) and pa.get("rueckbau") != "keine"
	return {
		"rueckbau": {"status": "offen", "termin": "", "verlauf": []},
		"sicherheit": {"status": "vorgesehen" if vereinbart else "keine", "art": pa.get("rueckbau") if vereinbart else "", "betrag": pa.get("rueckbauEuro") if vereinbart and pa.get("rueckbauEuro") else None, "ab": pa.get("rueckbauAb") or "", "geber": "", "hinterlegtAm": "", "verlauf": []},
	}


def rueckbau_moeglich(vertrag, heute):
	if not vertrag:
		return False
	if vertrag.get("status") in ("gekuendigt", "beendet"):
		return True
	return ist_datum(vertrag.get("ende")) and ist_datum(heute) and plus_monate(vertrag["ende"], -24) <= heute


def rueckbau_uebergang(akte, nach, wer, eingabe=None, vertrag=None, heute=None):
	eingabe = eingabe or {}
	st = ((akte or {}).get("rueckbau") or {}).get("status") or "offen"
	u = next((x for x in RUECKBAU_UEBERGAENGE if x["nach"] == nach and x["wer"] == wer and st in x["von"]), None)
	if not u:
		raise _konflikt(f"Rückbau: Von „{RUECKBAU_STATUS.get(st, {}).get('label', st)}“ ist dieser Schritt nicht möglich.")
	if nach == "angekuendigt" and not rueckbau_moeglich(vertrag, heute):
		raise _konflikt("Der Rückbau kann erst nach Kündigung oder in den letzten 24 Monaten vor Laufzeitende angekündigt werden.")
	kommentar = mehrzeilig(eingabe.get("kommentar"), 2000)
	if "kommentar" in (u.get("pflicht") or []) and len(kommentar) < 3:
		raise _ungueltig("Bitte die Mängel beschreiben." if nach == "maengel" else "Bitte einen Kommentar angeben.")
	termin = datum(eingabe.get("termin"))
	if "termin" in (u.get("pflicht") or []) and not termin:
		raise _ungueltig("Bitte den geplanten Beginn des Rückbaus angeben." if nach == "angekuendigt" else "Bitte einen Termin für die Abnahme angeben.")
	return {"von": st, "nach": nach, "aktion": u["aktion"], "kommentar": kommentar, "termin": termin}


def sicherheit_uebergang(akte, nach, eingabe=None):
	eingabe = eingabe or {}
	s = (akte or {}).get("sicherheit") or {"status": "keine"}
	if nach == "hinterlegt":
		if s.get("status") not in ("keine", "vorgesehen"):
			raise _konflikt("Die Sicherheit ist bereits hinterlegt oder freigegeben.")
		art = auswahl(eingabe.get("art"), SICHERHEIT_ARTEN)
		betrag = zahl(eingabe.get("betrag"), 1, 100000000, 2)
		geber = text(eingabe.get("geber"), 160)
		am = datum(eingabe.get("hinterlegtAm"))
		if not art or betrag is None or not geber or not am:
			raise _ungueltig("Bitte Art, Betrag, Sicherungsgeber (z. B. Bank) und Datum der Hinterlegung angeben.")
		return {"von": s.get("status"), "nach": nach, "art": art, "betrag": betrag, "geber": geber, "hinterlegtAm": am, "kommentar": mehrzeilig(eingabe.get("kommentar"), 1000)}
	if nach == "freigegeben":
		if s.get("status") != "hinterlegt":
			raise _konflikt("Freigeben lässt sich nur eine hinterlegte Sicherheit.")
		if ((akte or {}).get("rueckbau") or {}).get("status") != "abgenommen":
			raise _konflikt("Die Rückbausicherheit wird erst nach Abnahme des Rückbaus durch den Eigentümer freigegeben.")
		kommentar = mehrzeilig(eingabe.get("kommentar"), 1000)
		if len(kommentar) < 3:
			raise _ungueltig("Bitte die Freigabe kurz dokumentieren (z. B. Rückgabe der Bürgschaftsurkunde).")
		return {"von": s.get("status"), "nach": nach, "kommentar": kommentar}
	raise _ungueltig("Unbekannter Schritt für die Sicherheit.")


def beenden_pruefen(akte):
	if ((akte or {}).get("rueckbau") or {}).get("status") != "abgenommen":
		raise _konflikt("Der Vertrag kann erst nach Abnahme des Rückbaus beendet werden.")
	if ((akte or {}).get("sicherheit") or {}).get("status") == "hinterlegt":
		raise _konflikt("Bitte zuerst die Rückbausicherheit freigeben.")
	return True


def sicherheit_hinweise(akte, vertrag):
	s = (akte or {}).get("sicherheit") or {}
	h = []
	if s.get("status") == "vorgesehen" and s.get("ab") == "baubeginn" and ist_datum((vertrag or {}).get("beginn")):
		h.append({"ton": "warn", "text": "Die Rückbausicherheit ist ab Baubeginn vereinbart, aber noch nicht als hinterlegt erfasst – wir klären das und melden uns."})
	if s.get("status") == "keine":
		h.append({"ton": "info", "text": "Für diesen Vertrag ist keine Rückbausicherheit erfasst. Der Rückbau ist trotzdem Pflicht des Pächters – Einzelheiten regelt der Vertrag."})
	return h


# ================================================================ Agri-PV-Nachweis


def agri_nachweis_bereinigen(roh=None, heute=None):
	d = roh if isinstance(roh, dict) else {}
	jahr_heute = int(str(heute)[:4]) if heute else datetime.now(ZoneInfo("Europe/Vienna")).year
	jahr = zahl(d.get("jahr"), 2000, jahr_heute, 0)
	if jahr is None:
		raise _ungueltig(f"Bitte das Wirtschaftsjahr angeben (2000–{jahr_heute}).")
	art = auswahl(d.get("art"), AGRI_NACHWEIS_ARTEN)
	if not art:
		raise _ungueltig("Bitte wählen: Referenzjahr (ohne Anlage) oder Betriebsjahr (mit Anlage).")
	kultur = auswahl(d.get("kultur"), AGRI_NACHWEIS_KULTUREN)
	if not kultur:
		raise _ungueltig("Bitte die angebaute Kultur wählen.")
	gesamt = zahl(d.get("gesamtHa"), 0.01, 5000, 2)
	if gesamt is None:
		raise _ungueltig("Bitte die Gesamtfläche des Schlags in ha angeben.")
	bew = zahl(d.get("bewirtschaftetHa"), 0, 5000, 2)
	if bew is None:
		raise _ungueltig("Bitte die landwirtschaftlich genutzte Fläche in ha angeben.")
	if bew > gesamt:
		raise _ungueltig("Die bewirtschaftete Fläche kann nicht größer als die Gesamtfläche sein.")
	ertrag = zahl(d.get("ertrag"), 0, 100000, 1)
	if ertrag is None:
		raise _ungueltig("Bitte den Ertrag je ha angeben.")
	einheit = auswahl(d.get("einheit"), AGRI_NACHWEIS_EINHEITEN)
	if not einheit:
		raise _ungueltig("Bitte die Einheit des Ertrags wählen.")
	bewirtschafter = auswahl(d.get("bewirtschafter"), AGRI_BEWIRTSCHAFTER, "selbst")
	name = text(d.get("bewirtschafterName"), 160)
	if bewirtschafter == "paechter" and not name:
		raise _ungueltig("Bitte angeben, wer die Fläche bewirtschaftet.")
	return {
		"jahr": jahr, "art": art, "kultur": kultur, "kulturText": text(d.get("kulturText"), 120), "gesamtHa": gesamt, "bewirtschaftetHa": bew, "ertrag": ertrag, "einheit": einheit,
		"bewirtschafter": bewirtschafter, "bewirtschafterName": name, "gap": auswahl(d.get("gap"), JA_NEIN_ENTFAELLT, ""), "gapAktenzeichen": text(d.get("gapAktenzeichen"), 60),
		"besonderheiten": mehrzeilig(d.get("besonderheiten"), 2000),
	}


def agri_referenz(nachweise=(), fach_agri=None, einheit=""):
	ref = [x for x in nachweise if (x.get("daten") or {}).get("art") == "referenz" and x.get("status") != "entwurf" and (not einheit or x["daten"].get("einheit") == einheit)]
	if ref:
		e = einheit or ref[0]["daten"]["einheit"]
		gl = [x for x in ref if x["daten"]["einheit"] == e]
		jahre = ", ".join(str(j) for j in sorted(x["daten"]["jahr"] for x in gl))
		return {"wert": rund2(sum(x["daten"]["ertrag"] for x in gl) / len(gl)), "einheit": e, "quelle": f"Ø {len(gl)} Referenzjahr{'' if len(gl) == 1 else 'e'} ({jahre})"}
	fa = fach_agri or {}
	if (fa.get("referenzertrag") or 0) > 0 and (not einheit or not fa.get("referenzEinheit") or fa.get("referenzEinheit") == einheit):
		return {"wert": fa["referenzertrag"], "einheit": fa.get("referenzEinheit") or einheit, "quelle": "Referenzertrag aus Ihren Flächenangaben"}
	return None


def _pct(x):
	v = round(x * 1000) / 10
	return (f"{v:g}").replace(".", ",") + " %"


def agri_nachweis_pruefen(daten, kategorie="", referenz=None, land="DE"):
	p = []
	quote = None
	erfuellt = None
	verlust = round((1 - daten["bewirtschaftetHa"] / daten["gesamtHa"]) * 10000) / 10000 if daten.get("gesamtHa") else None
	if daten["art"] == "betrieb":
		if referenz and referenz.get("einheit") == daten["einheit"] and (referenz.get("wert") or 0) > 0:
			quote = round(daten["ertrag"] / referenz["wert"] * 10000) / 10000
			ok = quote >= DIN_91434["mindestErtrag"]
			erfuellt = ok
			p.append({"id": "quote", "stufe": "ok" if ok else "risiko", "titel": f"Ertrag {_pct(quote)} des Referenzertrags", "text": (f"DIN SPEC 91434 verlangt mindestens {_pct(DIN_91434['mindestErtrag'])} (Vergleich: {referenz['quelle']})." if ok else f"Unter der Schwelle von {_pct(DIN_91434['mindestErtrag'])} nach DIN SPEC 91434 (Vergleich: {referenz['quelle']}). Einzelne Jahre können witterungsbedingt abweichen – bitte Besonderheiten angeben; wir prüfen gemeinsam Bewirtschaftung und Anlage.")})
		else:
			p.append({"id": "quote", "stufe": "hinweis", "titel": "Kein Vergleich möglich", "text": (f"Der Referenzertrag liegt in einer anderen Einheit vor ({AGRI_NACHWEIS_EINHEITEN.get(referenz.get('einheit'), referenz.get('einheit'))})." if referenz else "Es gibt noch keinen Referenzertrag – bitte Referenzjahre vor dem Bau erfassen oder den Referenzertrag in den Flächenangaben ergänzen.")})
	else:
		p.append({"id": "referenz", "stufe": "hinweis", "titel": "Referenzjahr", "text": "Referenzjahre ohne Anlage bilden den Vergleichswert für die späteren Betriebsjahre (Ø mehrerer Jahre, gleiche Kultur und Einheit)."})
	if daten["art"] == "betrieb" and verlust is not None:
		maximal = DIN_91434["flaechenverlustMaxKat1"] if kategorie == "1" else DIN_91434["flaechenverlustMaxKat2"] if kategorie == "2" else None
		if maximal is None:
			p.append({"id": "verlust", "stufe": "hinweis", "titel": f"Flächenverlust {_pct(verlust)}", "text": f"Grenze nach DIN SPEC 91434: höchstens {_pct(DIN_91434['flaechenverlustMaxKat1'])} (Kategorie I) bzw. {_pct(DIN_91434['flaechenverlustMaxKat2'])} (Kategorie II) – Kategorie in den Flächenangaben ergänzen."})
		else:
			ok = verlust <= maximal + 1e-9
			if not ok:
				erfuellt = False
			p.append({"id": "verlust", "stufe": "ok" if ok else "risiko", "titel": f"Flächenverlust {_pct(verlust)}", "text": f"Grenze für Kategorie {'I' if kategorie == '1' else 'II'} nach DIN SPEC 91434: höchstens {_pct(maximal)} der Fläche."})
	if daten.get("gap") == "nein":
		p.append({"id": "gap", "stufe": "hinweis", "titel": "Kein Antrag auf Direktzahlungen", "text": {
			"DE": "In Deutschland bleiben Agri-PV-Flächen nach DIN SPEC 91434 nach aktuellem Stand in der Regel zu 85 % förderfähig (GAPDZV) – ohne Antrag entfallen die Direktzahlungen.",
			"AT": "Die Förderfähigkeit im Mehrfachantrag (INVEKOS/AMA) bitte mit Ihrer Landwirtschaftskammer klären – die Regeln für Agri-PV sind nach aktuellem Stand im Einzelfall zu prüfen.",
			"CH": "Die Beitragsberechtigung für Direktzahlungen bitte mit dem kantonalen Landwirtschaftsamt klären.",
		}[_land(land)]})
	return {"punkte": p, "quote": quote, "flaechenverlust": verlust, "erfuellt": erfuellt}


def agri_uebergang(nachweis, nach, wer, eingabe=None):
	eingabe = eingabe or {}
	u = next((x for x in AGRI_NACHWEIS_UEBERGAENGE if x["nach"] == nach and x["wer"] == wer and nachweis["status"] in x["von"]), None)
	if not u:
		raise _konflikt(f"Nachweis: Von „{AGRI_NACHWEIS_STATUS.get(nachweis['status'], {}).get('label', nachweis['status'])}“ ist dieser Schritt nicht möglich.")
	kommentar = mehrzeilig(eingabe.get("kommentar"), 2000)
	if "kommentar" in (u.get("pflicht") or []) and len(kommentar) < 3:
		raise _ungueltig("Bitte die Rückfrage formulieren.")
	return {"von": nachweis["status"], "nach": nach, "aktion": u["aktion"], "kommentar": kommentar}


def agri_bearbeitbar(nachweis):
	return not nachweis or nachweis.get("status") in ("entwurf", "rueckfrage")


# ================================================================ Jahresbescheinigung


def jahresbescheinigung(belege=(), vertraege=(), jahr=None):
	j = str(jahr)
	im_jahr = [b for b in belege if b.get("art") == "pacht" and b.get("status") != "storniert" and str((b.get("zeitraum") or {}).get("von") or "").startswith(j)]
	zeilen = []
	for b in im_jahr:
		vid = (b.get("bezug") or {}).get("pachtvertragId") or ""
		z = next((x for x in zeilen if x["vertragId"] == vid), None)
		if not z:
			vt = next((x for x in vertraege if x.get("id") == vid), {})
			z = {"vertragId": vid, "bezeichnung": vt.get("bezeichnung") or b.get("bezugText") or "Pachtvertrag", "land": vt.get("land") or "", "anzahl": 0, "netto": 0, "steuer": 0, "brutto": 0, "bezahlt": 0, "offen": 0, "belege": []}
			zeilen.append(z)
		steuer = b.get("steuerBetrag")
		if steuer is None:
			steuer = (b.get("steuer") or {}).get("betrag") or 0
		z["anzahl"] += 1
		z["netto"] = rund2(z["netto"] + float(b.get("netto") or 0))
		z["steuer"] = rund2(z["steuer"] + float(steuer or 0))
		z["brutto"] = rund2(z["brutto"] + float(b.get("brutto") or 0))
		if b.get("status") == "bezahlt":
			z["bezahlt"] = rund2(z["bezahlt"] + float(b.get("brutto") or 0))
		else:
			z["offen"] = rund2(z["offen"] + float(b.get("brutto") or 0))
		z["belege"].append({"nummer": b.get("nummer"), "von": (b.get("zeitraum") or {}).get("von"), "bis": (b.get("zeitraum") or {}).get("bis"), "brutto": b.get("brutto"), "status": b.get("status"), "bezahltAm": b.get("bezahltAm") or ""})
	summe = {"netto": 0, "steuer": 0, "brutto": 0, "bezahlt": 0, "offen": 0}
	for z in zeilen:
		summe = {k: rund2(wert + z[k]) for k, wert in summe.items()}
	laender = list(dict.fromkeys(z["land"] for z in zeilen if z["land"] in STEUER_HINWEISE_PACHT))
	return {"jahr": int(j), "zeilen": zeilen, "summe": summe, "anzahl": len(im_jahr), "laender": laender, "steuerhinweise": [{"land": l, "landText": LAND_TEXT[l], "hinweise": STEUER_HINWEISE_PACHT[l]} for l in laender]}


def bescheinigungs_jahre(belege=()):
	return sorted({int(str((b.get("zeitraum") or {}).get("von") or "")[:4]) for b in belege if b.get("art") == "pacht" and b.get("status") != "storniert" and str((b.get("zeitraum") or {}).get("von") or "")[:4].isdigit()}, reverse=True)
