# Copyright (c) 2026, ÖkoInvest GmbH
#
# Querschnitt (Team 10) – reine Regeln ohne Datenbank, gleiche Logik wie src/lib/plattform/querschnitt.js:
#  - Freigabestatus von Dokumenten
#  - Revisionsprotokoll: Filter bereinigen, filtern, Facetten, Seiten
#  - Tages-Digest: Text nur mit Anzahl je Ereignisart (keine Inhalte)
# Läuft ohne Bench: cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_querschnitt_kern -v

import math
import re

DOKUMENT_FREIGABE = {
	"eingegangen": "Eingegangen",
	"in_pruefung": "In Prüfung",
	"freigegeben": "Freigegeben",
	"abgelehnt": "Nachbesserung nötig",
}
DOKUMENT_FREIGABE_TEXT = {
	"eingegangen": "Liegt dem Backoffice vor, noch nicht geprüft.",
	"in_pruefung": "Wird vom Backoffice geprüft.",
	"freigegeben": "Geprüft und freigegeben.",
	"abgelehnt": "Bitte eine neue Version hochladen (Begründung siehe Hinweis).",
}
MAIL_RHYTHMEN = ("sofort", "taeglich")
DIGEST_AUSNAHMEN = ("sicherheit",)
DIGEST_ABSTAND_STUNDEN = 20

_TAG = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _t(x, laenge):
	return str("" if x is None else x).strip()[:laenge]


def protokoll_filter_bereinigen(f=None):
	f = f if isinstance(f, dict) else {}

	def zahl(x, standard):
		try:
			return int(math.floor(float(x)))
		except (TypeError, ValueError):
			return standard

	von, bis = _t(f.get("von"), 10), _t(f.get("bis"), 10)
	return {
		"q": _t(f.get("q"), 80),
		"aktion": re.sub(r"[^a-zA-Z0-9_-]", "", _t(f.get("aktion"), 40)),
		"objektArt": re.sub(r"[^a-zA-Z0-9_-]", "", _t(f.get("objektArt"), 40)),
		"nutzer": _t(f.get("nutzer"), 80),
		"von": von if _TAG.match(von) else "",
		"bis": bis if _TAG.match(bis) else "",
		"seite": max(1, min(500, zahl(f.get("seite"), 1) or 1)),
		"proSeite": max(10, min(200, zahl(f.get("proSeite"), 50) or 50)),
		"alle": f.get("alle") is True,
	}


def protokoll_filtern(eintraege, filter_=None):
	"""eintraege = [{id, am (ISO), aktion, objektArt, objektId, text, nutzer, nutzerId}] – Ergebnis wie protokollFiltern (JS)."""
	f = protokoll_filter_bereinigen(filter_)
	q = f["q"].lower()
	nu = f["nutzer"].lower()

	def passt(e):
		tag = str(e.get("am") or "")[:10]
		if f["aktion"] and e.get("aktion") != f["aktion"]:
			return False
		if f["objektArt"] and e.get("objektArt") != f["objektArt"]:
			return False
		if f["von"] and tag < f["von"]:
			return False
		if f["bis"] and tag > f["bis"]:
			return False
		if nu and not (str(e.get("nutzerId") or "").lower() == nu or nu in str(e.get("nutzer") or "").lower()):
			return False
		if q and q not in " ".join(str(e.get(k) or "") for k in ("text", "objektId", "aktion", "nutzer", "id")).lower():
			return False
		return True

	treffer = [e for e in eintraege if passt(e)]
	treffer.sort(key=lambda e: str(e.get("am") or ""), reverse=True)

	def zaehle(feld):
		m = {}
		for e in treffer:
			if e.get(feld):
				m[e[feld]] = m.get(e[feld], 0) + 1
		return [{"wert": w, "anzahl": a} for w, a in sorted(m.items(), key=lambda x: -x[1])[:30]]

	start = (f["seite"] - 1) * f["proSeite"]
	return {
		"filter": f,
		"gesamt": len(treffer),
		"eintraege": treffer[:5000] if f["alle"] else treffer[start : start + f["proSeite"]],
		"facetten": {"aktion": zaehle("aktion"), "objektArt": zaehle("objektArt")},
		"seiten": max(1, math.ceil(len(treffer) / f["proSeite"])),
	}


def digest_text(eintraege, arten_labels=None):
	"""eintraege = [{art}] → {betreff, text, anzahl}; keine Inhalte, nur Anzahl je Art."""
	arten_labels = arten_labels or {}
	je = {}
	reihenfolge = []
	for e in eintraege:
		art = e.get("art")
		if art not in je:
			reihenfolge.append(art)
			je[art] = 0
		je[art] += 1
	zeilen = [f"{arten_labels.get(a, a)}: {je[a]}" for a in sorted(reihenfolge, key=lambda a: (-je[a], reihenfolge.index(a)))]
	summe = len(eintraege)
	return {
		"betreff": f"{summe} {'neues Ereignis' if summe == 1 else 'neue Ereignisse'} im Portal – ÖkoInvest",
		"text": "Ihre Zusammenfassung des Tages:\n" + "\n".join(zeilen) + "\n\nDetails finden Sie im Portal unter „Benachrichtigungen“.",
		"anzahl": summe,
	}


def digest_faellig(rhythmus, zuletzt_stunden, erzwingen=False):
	"""Ist ein Digest fällig? zuletzt_stunden = Stunden seit dem letzten Digest (None = noch nie)."""
	if rhythmus != "taeglich":
		return False
	return bool(erzwingen) or zuletzt_stunden is None or zuletzt_stunden >= DIGEST_ABSTAND_STUNDEN
