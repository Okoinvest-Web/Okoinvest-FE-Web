# Copyright (c) 2026, ÖkoInvest GmbH
#
# Onboarding-Assistenten je Rolle und Untertyp – reine Logik ohne Frappe (Team B1).
# Spiegel von src/lib/plattform/onboarding/motor.js. Die Pfad-Definitionen kommen als JSON aus
# scripts/onboarding-pfade-export.mjs (onboarding_pfade.json neben dieser Datei) – eine Quelle für Website und Frappe.
#
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_onboarding_kern

import json
import os
import re
from datetime import datetime, timezone

ID_MUSTER = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
TAG_S = 24 * 3600
ERINNERUNG_TAGE = [3, 7]
WILLKOMMEN_MAX_TAGE = 14
MAIL_ARTEN = ["willkommen", "erinnerung3", "erinnerung7"]

_DEFINITIONEN = None


def definitionen():
	"""{"pfade": [...], "touren": [...]} aus onboarding_pfade.json (einmal je Prozess geladen)."""
	global _DEFINITIONEN
	if _DEFINITIONEN is None:
		with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "onboarding_pfade.json"), encoding="utf-8") as f:
			_DEFINITIONEN = json.load(f)
	return _DEFINITIONEN


def pfad_nach_id(pfad_id):
	return next((p for p in definitionen()["pfade"] if p["id"] == pfad_id), None)


def pfade_fuer(rollen):
	rollen = rollen or []
	return [p for p in definitionen()["pfade"] if any(r in rollen for r in p["rollen"])]


def _ist_zahl(x):
	return isinstance(x, (int, float)) and not isinstance(x, bool)


def fakt_wert(fakten, pfad):
	w = fakten
	for teil in str(pfad or "").split("."):
		if not isinstance(w, dict):
			return None
		w = w.get(teil)
	return w


def _wahr(w):
	if isinstance(w, list):
		return len(w) > 0
	if _ist_zahl(w):
		return w > 0
	return bool(w)


def kriterium_erfuellt(k, fakten, bestaetigt, untertyp, schritt_id=None):
	if not isinstance(k, dict):
		return False
	if isinstance(k.get("alle"), list):
		return all(kriterium_erfuellt(x, fakten, bestaetigt, untertyp, schritt_id) for x in k["alle"])
	if isinstance(k.get("eines"), list):
		return any(kriterium_erfuellt(x, fakten, bestaetigt, untertyp, schritt_id) for x in k["eines"])
	if k.get("nicht"):
		return not kriterium_erfuellt(k["nicht"], fakten, bestaetigt, untertyp, schritt_id)
	if k.get("merker"):
		return bool(schritt_id) and schritt_id in bestaetigt
	if isinstance(k.get("untertyp"), list):
		return bool(untertyp) and untertyp in k["untertyp"]
	if isinstance(k.get("fakt"), str):
		w = fakt_wert(fakten, k["fakt"])
		if isinstance(k.get("in"), list):
			return w in k["in"]
		if _ist_zahl(k.get("min")):
			return _ist_zahl(w) and w >= k["min"]
		return _wahr(w)
	return False


def schritt_gilt(s, untertyp):
	nur = s.get("nurFuer")
	return not isinstance(nur, list) or (bool(untertyp) and untertyp in nur) or (not untertyp and "*" in nur)


def schritt_pflicht(s, untertyp):
	p = s.get("pflicht")
	return (bool(untertyp) and untertyp in p) if isinstance(p, list) else bool(p)


def _id_liste(x, maximal=60):
	if not isinstance(x, list):
		return []
	return list(dict.fromkeys(y for y in x if isinstance(y, str) and ID_MUSTER.match(y)))[:maximal]


def _zeit(x):
	if not isinstance(x, str) or len(x) > 40:
		return None
	try:
		datetime.fromisoformat(x.replace("Z", "+00:00"))
		return x
	except ValueError:
		return None


def zustand_leer():
	return {"aktiv": None, "pfade": {}, "tour": {"aus": False, "gesehen": []}, "mails": {}, "auswertung": None, "aktualisiertAm": None}


def zustand_bereinigen(roh):
	o = roh if isinstance(roh, dict) else {}
	z = zustand_leer()
	z["aktiv"] = o.get("aktiv") if isinstance(o.get("aktiv"), str) and ID_MUSTER.match(o["aktiv"]) else None
	pfade = o.get("pfade") if isinstance(o.get("pfade"), dict) else {}
	for pid, p in list(pfade.items())[:12]:
		if not ID_MUSTER.match(str(pid)) or not isinstance(p, dict):
			continue
		ut = p.get("untertyp")
		z["pfade"][pid] = {
			"untertyp": ut if isinstance(ut, str) and ID_MUSTER.match(ut) else None,
			"bestaetigt": _id_liste(p.get("bestaetigt")),
			"spaeter": _id_liste(p.get("spaeter")),
			"gestartetAm": _zeit(p.get("gestartetAm")),
			"abgeschlossenAm": _zeit(p.get("abgeschlossenAm")),
		}
	t = o.get("tour") if isinstance(o.get("tour"), dict) else {}
	z["tour"] = {"aus": t.get("aus") is True, "gesehen": _id_liste(t.get("gesehen"), 80)}
	m = o.get("mails") if isinstance(o.get("mails"), dict) else {}
	z["mails"] = {k: m[k] for k in MAIL_ARTEN if _zeit(m.get(k))}
	a = o.get("auswertung") if isinstance(o.get("auswertung"), dict) else None
	if a and isinstance(a.get("pfad"), str) and ID_MUSTER.match(a["pfad"]):
		ut = a.get("untertyp")
		z["auswertung"] = {
			"pfad": a["pfad"],
			"untertyp": ut if isinstance(ut, str) and ID_MUSTER.match(ut) else None,
			"erledigt": a["erledigt"] if _ist_zahl(a.get("erledigt")) else 0,
			"gesamt": a["gesamt"] if _ist_zahl(a.get("gesamt")) else 0,
			"pflichtOffen": _id_liste(a.get("pflichtOffen")),
			"quote": a["quote"] if _ist_zahl(a.get("quote")) else 0,
			"abgeschlossen": a.get("abgeschlossen") is True,
			"am": _zeit(a.get("am")),
		}
	z["aktualisiertAm"] = _zeit(o.get("aktualisiertAm"))
	return z


def pfad_auswerten(pfad, fakten, pz=None, untertyp_vorschlag=None, legacy_merker=None):
	"""Wie motor.pfadAuswerten (für Team-Sicht und Tests; Texte bleiben in der JSON-Definition)."""
	pz = pz or {}
	untertypen = pfad.get("untertypen") or {}
	gewaehlt = pz.get("untertyp") if pz.get("untertyp") in untertypen else None
	untertyp = gewaehlt or (untertyp_vorschlag if untertyp_vorschlag in untertypen else None)
	bestaetigt = set(pz.get("bestaetigt") or []) | set(legacy_merker or [])
	spaeter = set(pz.get("spaeter") or [])
	f = dict(fakten or {}, untertyp=untertyp)
	schritte = []
	for s in pfad["schritte"]:
		if not schritt_gilt(s, untertyp):
			continue
		erledigt = kriterium_erfuellt(s.get("kriterium"), f, bestaetigt, untertyp, s["id"])
		schritte.append({"id": s["id"], "kurz": s.get("kurz") or s["titel"], "pflicht": schritt_pflicht(s, untertyp), "bestaetigbar": bool(s.get("bestaetigbar")), "erledigt": erledigt, "spaeter": (not erledigt) and s["id"] in spaeter})
	erledigt_anzahl = sum(1 for s in schritte if s["erledigt"])
	pflicht_offen = [s["id"] for s in schritte if s["pflicht"] and not s["erledigt"]]
	return {
		"id": pfad["id"], "untertyp": untertyp, "schritte": schritte, "erledigt": erledigt_anzahl, "gesamt": len(schritte),
		"quote": round(erledigt_anzahl / len(schritte) * 100) if schritte else 100, "pflichtOffen": pflicht_offen,
		"abschliessbar": not pflicht_offen, "abgeschlossen": bool(pz.get("abgeschlossenAm")) and not pflicht_offen,
	}


class OnboardingFehler(Exception):
	def __init__(self, status, meldung):
		super().__init__(meldung)
		self.status = status
		self.meldung = meldung


def struktur_pruefen(rollen, aktion, zustand_alt, zustand_neu, unterrollen_liste=None, auswertung=None):
	"""Zweite Verteidigungslinie in Frappe: vergleicht den vom Website-Server geprüften neuen Zustand mit dem alten.

	Erlaubt ist nur die eine angegebene Aktion: Pfad passt zu den Rollen, Untertyp existiert (Backoffice: eigene
	Unterrolle), neu bestätigte Schritte existieren und sind bestätigbar, Abschluss nur mit Auswertung ohne offene
	Pflichtschritte. Wirft OnboardingFehler(status, meldung)."""
	a = aktion if isinstance(aktion, dict) else {}
	art = a.get("aktion") or ""
	erlaubt = {p["id"]: p for p in pfade_fuer(rollen)}
	alt = zustand_bereinigen(zustand_alt)
	neu = zustand_bereinigen(zustand_neu)
	if art == "tour":
		unbekannt = [x for x in neu["tour"]["gesehen"] if x not in definitionen()["touren"]]
		if unbekannt:
			raise OnboardingFehler(422, "Unbekannter Tour-Hinweis.")
		if neu["pfade"] != alt["pfade"]:
			raise OnboardingFehler(422, "Unzulässige Änderung.")
		return neu
	# Snapshot-Aktualisierung ohne Aktion (Auswertung beim Laden): Pfade und Tour müssen unverändert bleiben
	if not art:
		if neu["pfade"] != alt["pfade"] or neu["tour"] != alt["tour"] or (neu["aktiv"] and neu["aktiv"] not in erlaubt):
			raise OnboardingFehler(422, "Unzulässige Änderung.")
		return neu
	for pid in neu["pfade"]:
		if pid not in erlaubt and neu["pfade"][pid] != alt["pfade"].get(pid):
			raise OnboardingFehler(403, "Dieser Einstieg passt nicht zu Ihren Rollen.")
	if neu["aktiv"] and neu["aktiv"] not in erlaubt:
		raise OnboardingFehler(403, "Dieser Einstieg passt nicht zu Ihren Rollen.")
	pid = a.get("pfad")
	if pid not in erlaubt:
		raise OnboardingFehler(403, "Dieser Einstieg passt nicht zu Ihren Rollen.")
	pfad = erlaubt[pid]
	p_alt = alt["pfade"].get(pid) or {"untertyp": None, "bestaetigt": [], "spaeter": [], "abgeschlossenAm": None}
	p_neu = neu["pfade"].get(pid) or p_alt
	if p_neu.get("untertyp") != p_alt.get("untertyp"):
		ut = p_neu.get("untertyp")
		if art != "untertyp" or ut not in (pfad.get("untertypen") or {}):
			raise OnboardingFehler(422, "Diese Auswahl ist für Ihr Konto nicht möglich.")
		if pfad.get("untertypAus") == "unterrolle" and ut not in (unterrollen_liste or []):
			raise OnboardingFehler(422, "Diese Auswahl ist für Ihr Konto nicht möglich.")
	neu_bestaetigt = [x for x in p_neu.get("bestaetigt", []) if x not in (p_alt.get("bestaetigt") or [])]
	if neu_bestaetigt:
		schritte = {s["id"]: s for s in pfad["schritte"]}
		if art != "bestaetigen" or any(x not in schritte or not schritte[x].get("bestaetigbar") for x in neu_bestaetigt):
			raise OnboardingFehler(422, "Dieser Schritt wird automatisch erledigt, sobald die Angaben vorliegen.")
	if p_neu.get("abgeschlossenAm") and not p_alt.get("abgeschlossenAm"):
		if art != "abschliessen" or not isinstance(auswertung, dict) or auswertung.get("pfad") != pid or auswertung.get("pflichtOffen"):
			raise OnboardingFehler(409, "Abschluss erst, wenn alle Pflichtschritte erledigt sind.")
	return neu


def _alter_tage(erstellt_iso, jetzt=None):
	try:
		t = datetime.fromisoformat(str(erstellt_iso).replace("Z", "+00:00"))
	except ValueError:
		return None
	if t.tzinfo is None:
		t = t.replace(tzinfo=timezone.utc)
	jetzt = jetzt or datetime.now(timezone.utc)
	return (jetzt - t).total_seconds() / TAG_S


def faellige_mail(erstellt_am, checkliste_aus, zustand, jetzt=None):
	"""Wie motor.faelligeMail: "willkommen" | "erinnerung3" | "erinnerung7" | None."""
	alter = _alter_tage(erstellt_am, jetzt)
	if alter is None:
		return None
	m = zustand.get("mails") or {}
	a = zustand.get("auswertung")
	if not m.get("willkommen"):
		return "willkommen" if alter <= WILLKOMMEN_MAX_TAGE else None
	if not a or a.get("abgeschlossen") or not a.get("pflichtOffen") or checkliste_aus:
		return None
	for t in sorted(ERINNERUNG_TAGE, reverse=True):
		k = f"erinnerung{t}"
		if alter >= t and not m.get(k):
			return k if alter < t + 7 else None
	return None


def mail_inhalt(art, pfad_titel="Ihr Einstieg", offen=0):
	if art == "willkommen":
		return {
			"betreff": "Willkommen im Portal – ÖkoInvest",
			"text": f"vielen Dank für Ihre Registrierung. Ihr geführter Einstieg („{pfad_titel}“) zeigt Schritt für Schritt, was für ein arbeitsfähiges Konto nötig ist – jeder Schritt lässt sich auf später verschieben. Sie finden ihn jederzeit auf der Übersicht unter „Erste Schritte“.",
			"pfad": "/portal/willkommen",
		}
	anzahl = "ist noch 1 Pflichtschritt" if offen == 1 else f"sind noch {offen} Pflichtschritte"
	return {
		"betreff": "Ihr Einstieg im Portal – noch offene Schritte",
		"text": f"in Ihrem Einstieg („{pfad_titel}“) {anzahl} offen. Erst danach ist Ihr Konto vollständig arbeitsfähig. Sie können direkt dort weitermachen, wo Sie aufgehört haben. Diese Erinnerung erhalten Sie nicht mehr, wenn Sie die Checkliste auf der Übersicht ausblenden.",
		"pfad": "/portal/willkommen",
	}
