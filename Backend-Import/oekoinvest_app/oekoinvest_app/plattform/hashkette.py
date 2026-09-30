# Copyright (c) 2026, ÖkoInvest GmbH
#
# Revisionssicheres Aktivitätsprotokoll: Hash-Kette (identisch zu src/lib/plattform/hashkette.js).
#
#   entry_hash_n = SHA-256( prev_hash_n + "\n" + inhalt_n ),  prev_hash_n = entry_hash_(n-1)
#
# inhalt = kanonisches JSON der fachlichen Felder in fester Reihenfolge
#   [["id", …], ["am", ISO-UTC], ["nutzerId", …], ["aktion", …], ["objektArt", …], ["objektId", …], ["text", …], ["ip", …]]
# (JSON.stringify ohne Leerzeichen, Nicht-ASCII unverändert – daher ensure_ascii=False, separators=(",", ":")).
#
# Anhängen: Controller der Plattform Aktivitaet (before_insert) sperrt den Kettenkopf `Plattform Kette`
# (SELECT … FOR UPDATE) und vergibt kette_nr, prev_hash und entry_hash – parallele Einträge werden serialisiert.
# Prüfen: verify_chain() über alle Einträge nach kette_nr (auch als API berichte.kette_pruefen).

import hashlib
import json

KETTE_START = "0" * 64
KETTE_FELDER = ["id", "am", "nutzerId", "aktion", "objektArt", "objektId", "text", "ip"]


def _wert(v):
	return "" if v is None else str(v)


def eintrag_inhalt(e):
	"""e: dict mit den Schlüsseln aus KETTE_FELDER (camelCase, Zeit als ISO 8601 UTC wie die Website)."""
	return json.dumps([[k, _wert(e.get(k))] for k in KETTE_FELDER], ensure_ascii=False, separators=(",", ":"))


def eintrag_hash(prev_hash, e):
	return hashlib.sha256(f"{prev_hash}\n{eintrag_inhalt(e)}".encode("utf-8")).hexdigest()


def verify_chain(eintraege, anker=None, alle_fehler=False):
	"""eintraege: Liste von dicts (KETTE_FELDER + prevHash + hash) in Kettenreihenfolge.

	Liefert {ok, geprueft, anzahl, fehler: [{index, id, am, grund}], letzterHash, start}.
	"""
	start = (anker or {}).get("hash") or KETTE_START
	prev = start
	fehler = []
	geprueft = 0
	for i, e in enumerate(eintraege):
		geprueft += 1
		grund = ""
		if not e.get("hash"):
			grund = "Eintrag ohne Hash (ungesichert eingefügt)"
		elif e.get("prevHash") != prev:
			grund = "Verweis auf den Vorgänger passt nicht (Eintrag gelöscht, eingefügt oder umsortiert)"
		elif eintrag_hash(prev, e) != e.get("hash"):
			grund = "Inhalt wurde nachträglich verändert"
		if grund:
			fehler.append({"index": i, "id": e.get("id"), "am": e.get("am"), "grund": grund})
			if not alle_fehler:
				break
		prev = e.get("hash") or prev
	return {"ok": not fehler, "geprueft": geprueft, "anzahl": len(eintraege), "fehler": fehler, "letzterHash": prev, "start": start}


def doc_als_eintrag(d):
	"""Plattform Aktivitaet (Dokument oder dict mit snake_case) → Eintrag für die Kette."""
	from oekoinvest_app.plattform.kern import iso

	g = d.get if hasattr(d, "get") else lambda k: getattr(d, k, None)
	return {
		"id": g("name"),
		"am": iso(g("am")),
		"nutzerId": g("nutzer_id") or None,
		"aktion": g("aktion"),
		"objektArt": g("objekt_art"),
		"objektId": g("objekt_id"),
		"text": g("text"),
		"ip": g("ip"),
		"prevHash": g("prev_hash"),
		"hash": g("entry_hash"),
	}
