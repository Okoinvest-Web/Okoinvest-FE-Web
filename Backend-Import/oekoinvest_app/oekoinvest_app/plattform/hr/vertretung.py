# Copyright (c) 2026, ÖkoInvest GmbH
#
# Abwesenheit → Vertretung, Auslastung, Zeitsummen, Wissenssuche – reine Funktionen (Spiegel von src/lib/plattform/hr/index.js).

from datetime import date

ABWESENHEIT_ARTEN = {"urlaub": "Urlaub", "krank": "Krankheit", "fortbildung": "Fortbildung", "dienstreise": "Dienstreise", "sonstiges": "Sonstiges"}
TAETIGKEITEN = {
	"akquise": "Akquise & Flächensicherung", "planung": "Planung & Genehmigung", "netz": "Netzanschluss", "gutachten": "Gutachten & Prüfungen",
	"gemeinde": "Gemeinde & Bürgerbeteiligung", "transaktion": "Transaktion & Datenraum", "verwaltung": "Verwaltung",
}
WISSEN_KATEGORIEN = {"prozesse": "Prozesse & Abläufe", "recht": "Recht & Förderung", "technik": "Technik & Netz", "vertrieb": "Akquise & Kommunikation", "vorlagen": "Vorlagen & Checklisten", "it": "Portal & IT"}
GRENZEN = {"stunden_tag_max": 12, "abwesenheit_tage_max": 120, "wissen_inhalt": 20000, "vertretung_tiefe": 4}


def abwesenheit_am(abwesenheiten, konto_id, tag):
	t = str(tag)[:10]
	for a in abwesenheiten:
		if a["mitarbeiterId"] == konto_id and a.get("status") != "abgelehnt" and a["von"] <= t <= a["bis"]:
			return a
	return None


def vertretung_finden(mitarbeiter_id, tag, abwesenheiten, mitarbeiter):
	"""{id, kette, grund} oder None. Reihenfolge: Vertretung der Abwesenheit → Standardvertretung → Kette (Tiefe 4)."""
	kette = [mitarbeiter_id]
	aktuell = mitarbeiter_id
	for i in range(GRENZEN["vertretung_tiefe"] + 1):
		ab = abwesenheit_am(abwesenheiten, aktuell, tag)
		if not ab and (mitarbeiter.get(aktuell) or {}).get("aktiv", True) is not False:
			return {"id": aktuell, "kette": kette, "grund": "anwesend" if i == 0 else "vertretung"}
		naechster = (ab or {}).get("vertretungId") or (mitarbeiter.get(aktuell) or {}).get("vertretungId")
		if not naechster or naechster in kette:
			return None
		kette.append(naechster)
		aktuell = naechster
	return None


def tage_zwischen(von, bis):
	try:
		a, b = date.fromisoformat(von), date.fromisoformat(bis)
	except (TypeError, ValueError):
		return 0
	return (b - a).days + 1 if b >= a else 0


def auslastung(kapazitaet_stunden=38.5, termin_minuten=0, aufgaben_offen=0, tickets_offen=0, signaturen_offen=0, abwesende_tage=0):
	kap = max(0.0, kapazitaet_stunden * (1 - min(5, abwesende_tage) / 5))
	last = termin_minuten / 60 + aufgaben_offen * 1 + tickets_offen * 1.5 + signaturen_offen * 0.25
	prozent = min(150, round(last / kap * 100)) if kap > 0 else (150 if last > 0 else 0)
	return {"prozent": prozent, "stundenLast": round(last, 1), "stundenKapazitaet": round(kap, 1), "ampel": "hoch" if prozent >= 100 else "mittel" if prozent >= 75 else "frei"}


def zeiten_summieren(eintraege):
	je = {}
	for z in eintraege:
		k = z.get("projektId") or z.get("erpProjekt") or "ohne"
		p = je.setdefault(k, {"projektId": z.get("projektId"), "erpProjekt": z.get("erpProjekt"), "stunden": 0.0, "taetigkeiten": {}})
		p["stunden"] = round(p["stunden"] + float(z.get("stunden") or 0), 2)
		p["taetigkeiten"][z.get("taetigkeit")] = round(p["taetigkeiten"].get(z.get("taetigkeit"), 0) + float(z.get("stunden") or 0), 2)
	return sorted(je.values(), key=lambda x: -x["stunden"])


def wissen_treffer(artikel, q):
	worte = [w for w in str(q or "").lower().split() if len(w) >= 2][:8]
	if not worte:
		return 1
	titel = str(artikel.get("titel") or "").lower()
	text = f"{artikel.get('inhalt') or ''} {' '.join(artikel.get('tags') or [])}".lower()
	punkte = 0
	for w in worte:
		if w in titel:
			punkte += 3
		elif w in text:
			punkte += 1
		else:
			return 0
	return punkte
