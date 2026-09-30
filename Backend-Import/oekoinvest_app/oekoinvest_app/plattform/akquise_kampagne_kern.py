# Copyright (c) 2026, ÖkoInvest GmbH
#
# Akquise Ausbaustufe 2 – reine Logik ohne Frappe (testbar mit `python -m unittest`):
#   Kampagnen (Einmalcode, Sperr-Schlüssel, Grundbuch-Kostenschätzung, Pachtspanne, Nachfassstufen, Kennzahlen),
#   Serienbrief-Texte (Art. 14 DSGVO, Widerspruch Art. 21, Datenquelle Grundbuch je Land) und Gemeinde-Screening (Ranking).
# Gegenstücke in JS (gleiche Regeln): src/lib/plattform/akquise-kampagne.js, src/lib/plattform/gemeinde-screening.js,
# src/lib/plattform/geodaten/serienbrief.js. Rechtlicher Rahmen: docs/AKQUISE-GEODATEN.md Abschnitt 10 (keine Rechtsberatung).

import re
import secrets
import unicodedata
from datetime import datetime

KAMPAGNE_STATUS = {"entwurf": "Entwurf", "aktiv": "Aktiv", "abgeschlossen": "Abgeschlossen"}
ZIEL_STATUS = {
	"offen": "Eigentümer offen", "grundbuch": "Grundbuchabfrage läuft", "ermittelt": "Eigentümer ermittelt", "angeschrieben": "Angeschrieben",
	"reaktion": "Reaktion", "termin": "Termin vereinbart", "gesichert": "Gesichert", "abgelehnt": "Kein Interesse", "gesperrt": "Gesperrt (Widerspruch)",
}
EMPFAENGER_STATUS = {"neu": "Noch nicht angeschrieben", "angeschrieben": "Angeschrieben", "reaktion": "Reaktion", "termin": "Termin", "gesichert": "Gesichert", "abgelehnt": "Kein Interesse", "widerspruch": "Widerspruch (gesperrt)"}
SPERR_GRUENDE = {"widerspruch": "Widerspruch (Art. 21 DSGVO)", "kein_interesse": "Dauerhaft kein Interesse", "verstorben": "Verstorben / Nachlass", "sonstiges": "Sonstiges"}
SPERR_QUELLEN = {"online": "Online (Angebotsseite)", "brief": "Brief", "telefon": "Telefon", "email": "E-Mail", "persoenlich": "Persönlich"}
NACHFASS_ARTEN = {"zweiter_brief": "Zweiter Brief (einmalig)", "anruf_einwilligung": "Anruf nur mit Einwilligung"}

# Schätzungen (vor Einsatz prüfen), wie akquise-kampagne.js
GRUNDBUCH_KOSTEN = {
	"DE": {"jeAbfrage": 10, "waehrung": "EUR", "text": "Grundbuchausdruck bzw. Abruf ca. 8–10 € je Blatt (Schätzung, Gebühren vor Einsatz prüfen)"},
	"AT": {"jeAbfrage": 7.5, "waehrung": "EUR", "text": "Grundbuchauszug 4,89 € Gerichtsgebühr + Entgelt Verrechnungsstelle (Annahme)"},
	"CH": {"jeAbfrage": 20, "waehrung": "CHF", "text": "Eigentümerauskunft (Art. 970 ZGB) meist kostenlos, Auszug je Kanton mit Gebühr (Annahme)"},
}
VERSAND_KOSTEN = {"DE": {"porto": 0.95, "druck": 0.35}, "AT": {"porto": 0.95, "druck": 0.35}, "CH": {"porto": 1.2, "druck": 0.35}}
# wie src/lib/invest/markt.js → PACHT.freiflaecheProHa (€/ha und Jahr)
PACHT_PRO_HA = {"min": 1500, "mittel": 2800, "max": 4500}

CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CODE_LAENGE = 10
REAKTION = ("reaktion", "termin", "gesichert", "abgelehnt", "widerspruch")


def jsround(x):
	import math

	return math.floor(x + 0.5)


# ---------------------------------------------------------------- Nachfassen


def nachfass_standard(land="DE"):
	return [{"id": "s1", "art": "zweiter_brief", "nachTagen": 28, "aktiv": land != "AT"}, {"id": "s2", "art": "anruf_einwilligung", "nachTagen": 42, "aktiv": True}]


def nachfass_bereinigen(liste, land="DE"):
	if not isinstance(liste, list):
		return nachfass_standard(land)
	out = []
	for i, s in enumerate(liste[:4]):
		s = s if isinstance(s, dict) else {}
		if s.get("art") not in NACHFASS_ARTEN:
			continue
		try:
			tage = int(round(float(s.get("nachTagen") or 28)))
		except (TypeError, ValueError):
			tage = 28
		sid = s.get("id") if re.fullmatch(r"s\d", str(s.get("id") or "")) else f"s{i + 1}"
		out.append({"id": sid, "art": s["art"], "nachTagen": max(7, min(180, tage)), "aktiv": s.get("aktiv") is not False})
	return out


def _datum(x):
	if isinstance(x, datetime):
		return x
	t = str(x).strip().replace(" ", "T")
	return datetime.fromisoformat(t[:19] if len(t) >= 19 else t[:10])  # UTC-Sekunden genügen für Tagesfristen


# Widerspruch (Art. 21 DSGVO): gesperrte Empfänger nur noch mit Notizen – kein Status, Termin, Rücklauf oder Einwilligung
GESPERRT_VERBOTEN = ("status", "termin", "rueckmeldung", "einwilligungTelefon", "einwilligungEmail")
ZIEL_FORTGESCHRITTEN = ("angeschrieben", "reaktion", "termin", "gesichert", "abgelehnt")


def gesperrt_aenderung_erlaubt(gesperrt, daten):
	"""Wie empfaengerAendern (demo/akquise-kampagne.js): bei Sperre sind nur Notizen erlaubt."""
	return not gesperrt or all((daten or {}).get(f) is None for f in GESPERRT_VERBOTEN)


def ziel_status_nach_grundbuch(alt, alle_gesperrt):
	"""Erneute Grundbuch-Erfassung setzt einen fortgeschrittenen Ziel-Status nicht zurück."""
	if alt in ZIEL_FORTGESCHRITTEN:
		return alt
	return "gesperrt" if alle_gesperrt else "ermittelt"


def kampagne_status_wechsel_erlaubt(alt, neu):
	"""(ok, Fehlertext) – abgeschlossen bleibt abgeschlossen, aktiv nicht zurück in den Entwurf, Start nur über „Kampagne starten“."""
	if alt == "abgeschlossen" and neu != "abgeschlossen":
		return False, "Abgeschlossene Kampagnen lassen sich nicht wieder öffnen."
	if neu == "aktiv" and alt != "aktiv":
		return False, "Bitte „Kampagne starten“ verwenden (legt die Grundbuch-Aufgaben an)."
	if alt == "aktiv" and neu == "entwurf":
		return False, "Eine laufende Kampagne kann nicht zurück in den Entwurf (Codes und Nachfassen der Empfänger)."
	return True, ""


def hat_reagiert(e):
	return bool(e.get("anfragen") or e.get("termine") or e.get("widerspruchAm") or e.get("rueckmeldungAm") or e.get("status") in REAKTION)


def nachfass_faellig(kampagne, e, heute):
	"""Fällige Nachfassstufen wie nachfassFaellig() in akquise-kampagne.js."""
	if (kampagne or {}).get("status") != "aktiv" or not e:
		return []
	erst = next((b for b in (e.get("briefe") or []) if b.get("nr") == 1), None)
	if not erst or e.get("gesperrt") or hat_reagiert(e):
		return []
	tage = (_datum(heute) - _datum(erst["am"])).days
	erledigt = e.get("nachfass") or {}
	out = []
	for s in kampagne.get("nachfass") or []:
		if not s.get("aktiv") or erledigt.get(s["id"]) or tage < s["nachTagen"]:
			continue
		if s["art"] == "zweiter_brief":
			if len(e.get("briefe") or []) >= 2:
				out.append({"stufe": s, "ergebnis": "uebersprungen", "grund": "Bereits zwei Briefe versandt."})
			else:
				out.append({"stufe": s, "ergebnis": "aufgabe", "grund": ""})
		elif s["art"] == "anruf_einwilligung":
			if (e.get("einwilligungTelefon") or {}).get("am"):
				out.append({"stufe": s, "ergebnis": "aufgabe", "grund": ""})
			else:
				out.append({"stufe": s, "ergebnis": "uebersprungen", "grund": "Keine Einwilligung für Telefon – kein Anruf (UWG/TKG). Nur Brief möglich."})
	return out


# ---------------------------------------------------------------- Code, Sperr-Schlüssel


def code_erzeugen():
	return "".join(CODE_ALPHABET[secrets.randbelow(len(CODE_ALPHABET))] for _ in range(CODE_LAENGE))


def code_normalisieren(s):
	c = re.sub(r"[\s-]", "", str(s or "").upper())
	return c if len(c) == CODE_LAENGE and all(z in CODE_ALPHABET for z in c) else ""


def code_lesbar(c):
	return f"{c[:5]}-{c[5:]}" if c else ""


def norm_text(s):
	t = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	t = "".join(ch for ch in unicodedata.normalize("NFKD", t) if not unicodedata.combining(ch))
	t = re.sub(r"\b(str\.|strasse)\b", "str", t)
	return re.sub(r"[^a-z0-9]+", " ", t).strip()


def person_schluessel(p):
	"""Name bzw. Firma + PLZ (ohne Straße) – wie personSchluessel() in JS."""
	p = p or {}
	name = norm_text(p.get("firma")) if p.get("firma") and not p.get("nachname") else f"{norm_text(p.get('nachname'))}|{norm_text(p.get('vorname'))}"
	return f"p|{name}|{re.sub(r'\s', '', str(p.get('plz') or '')).upper()}"


def flurstueck_schluessel(land, kg_nr, gst_nr):
	return f"f|{land or ''}|{str(kg_nr or '').strip()}|{str(gst_nr or '').strip()}"


def person_maskiert(p):
	p = p or {}
	n = p.get("firma") if p.get("firma") and not p.get("nachname") else p.get("nachname")
	return f"{(p.get('vorname') or '')[:1] + '. ' if p.get('vorname') else ''}{(n or '')[:1] + '***' if n else '***'}{', ' + p['plz'] if p.get('plz') else ''}"


# ---------------------------------------------------------------- Kosten, Pacht, Kennzahlen


def grundbuch_schaetzung(land, anzahl):
	k = GRUNDBUCH_KOSTEN.get(land) or GRUNDBUCH_KOSTEN["DE"]
	n = max(1, int(anzahl or 1))
	return {"anzahl": n, "jeAbfrage": k["jeAbfrage"], "betrag": round(n * k["jeAbfrage"], 2), "waehrung": k["waehrung"], "text": k["text"]}


def pachtspanne(ha, ampel="gelb"):
	lo, hi = (PACHT_PRO_HA["mittel"], PACHT_PRO_HA["max"]) if ampel == "gruen" else (PACHT_PRO_HA["min"], PACHT_PRO_HA["mittel"])
	h = float(ha or 0)
	return {"proHaMin": lo, "proHaMax": hi, "jahrMin": jsround(h * lo / 100) * 100, "jahrMax": jsround(h * hi / 100) * 100}


def kampagnen_kennzahlen(kampagne, ziele):
	land = (kampagne or {}).get("land") or "DE"
	vk = dict(VERSAND_KOSTEN.get(land) or VERSAND_KOSTEN["DE"])
	for f in ("porto", "druck"):
		w = ((kampagne or {}).get("kosten") or {}).get(f)
		if w not in (None, ""):
			vk[f] = float(w)
	empf = [e for z in ziele for e in (z.get("empfaenger") or [])]
	angeschrieben = [e for e in empf if e.get("briefe")]
	briefe = sum(len(e.get("briefe") or []) for e in empf)
	anfragen = sum(len(e.get("anfragen") or []) for e in empf)
	termine = sum(len(e.get("termine") or []) for e in empf)
	mit_aufruf = len([e for e in empf if int(e.get("aufrufe") or 0) > 0])
	gesichert = round(sum(float(z.get("gesichertHa") if z.get("gesichertHa") is not None else z.get("ha") or 0) for z in ziele if z.get("status") == "gesichert"), 2)
	grundbuch = sum(float((z.get("grundbuch") or {}).get("kostenIst") or 0) for z in ziele)
	plan = sum(float(((z.get("grundbuch") or {}).get("schaetzung") or {}).get("betrag") or 0) for z in ziele)
	versand = round(briefe * (vk["porto"] + vk["druck"]), 2)
	sonstige = float(((kampagne or {}).get("kosten") or {}).get("sonstige") or 0)
	summe = round(grundbuch + versand + sonstige, 2)
	return {
		"ziele": len(ziele), "flurstuecke": sum(len(z.get("parzellen") or []) for z in ziele),
		"ha": round(sum(float(z.get("ha") or 0) for z in ziele), 1), "mwp": round(sum(float(z.get("mwp") or 0) for z in ziele), 1),
		"empfaenger": len(empf), "gesperrt": len([e for e in empf if e.get("gesperrt")]), "briefe": briefe,
		"aufrufe": sum(int(e.get("aufrufe") or 0) for e in empf), "empfaengerMitAufruf": mit_aufruf, "anfragen": anfragen, "termine": termine,
		"widersprueche": len([e for e in empf if e.get("widerspruchAm")]), "gesichertHa": gesichert,
		"kosten": {"grundbuch": round(grundbuch, 2), "grundbuchPlan": round(plan, 2), "versand": versand, "sonstige": sonstige, "summe": summe, "waehrung": (GRUNDBUCH_KOSTEN.get(land) or GRUNDBUCH_KOSTEN["DE"])["waehrung"]},
		"kostenJeHa": jsround(summe / gesichert) if gesichert > 0 else None,
		"ruecklaufQuote": round((anfragen + termine) / max(1, len(angeschrieben)) * 1000) / 10 if briefe else None,
		"aufrufQuote": round(mit_aufruf / max(1, len(angeschrieben)) * 1000) / 10 if briefe else None,
	}


# ---------------------------------------------------------------- Serienbrief-Texte (wie serienbrief.js)

DATENQUELLE = {
	"DE": "Ihr Name und Ihre Anschrift stammen aus dem Grundbuch (Einsicht beim Grundbuchamt nach § 12 GBO; für Vorhaben der erneuerbaren Energien § 43a GBV). Lage und Größe der Flurstücke stammen aus dem Liegenschaftskataster (ALKIS, Open Data der Länder) und öffentlichen Geodaten.",
	"AT": "Ihr Name und Ihre Anschrift stammen aus dem öffentlichen Grundbuch (Grundbuchauszug über eine Verrechnungsstelle). Lage und Größe der Grundstücke stammen aus dem Kataster (BEV) und öffentlichen Geodaten.",
	"CH": "Ihr Name und Ihre Anschrift stammen aus der Eigentümerauskunft des Grundbuchs (Art. 970 Abs. 2 ZGB). Lage und Größe der Parzellen stammen aus der amtlichen Vermessung (geodienste.ch) und öffentlichen Geodaten.",
}
BESCHWERDE = {
	"DE": "Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts (z. B. beim Landesamt bzw. Landesbeauftragten für den Datenschutz Ihres Bundeslandes), oder bei der für uns zuständigen Österreichischen Datenschutzbehörde (www.dsb.gv.at).",
	"AT": "Sie können sich bei der Österreichischen Datenschutzbehörde (www.dsb.gv.at) beschweren.",
	"CH": "Sie können sich an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) oder an die Österreichische Datenschutzbehörde (www.dsb.gv.at) wenden.",
}
KEIN_INTERESSE = {
	"DE": "Haben Sie kein Interesse, müssen Sie nichts tun. Möchten Sie keine weiteren Schreiben von uns erhalten, genügt ein kurzer Widerspruch – dann schreiben wir Sie nie wieder an.",
	"AT": "Haben Sie kein Interesse, müssen Sie nichts tun – wir schreiben Sie zu dieser Fläche nicht erneut an.",
	"CH": "Haben Sie kein Interesse, müssen Sie nichts tun. Möchten Sie keine weiteren Schreiben von uns erhalten, genügt ein kurzer Widerspruch – dann schreiben wir Sie nie wieder an.",
}
WIDERSPRUCH = "WIDERSPRUCHSRECHT: Sie können der Verwendung Ihrer Daten für diese Kontaktaufnahme jederzeit ohne Angabe von Gründen widersprechen (Art. 21 Abs. 2 DSGVO) – formlos per Brief an die obige Anschrift oder online über den Link bzw. QR-Code („Nicht mehr anschreiben“). Wir vermerken Ihren Widerspruch dann dauerhaft in unserer Sperrliste und schreiben Sie nicht mehr an."
STANDARD_BETREFF = "Ihre Fläche in {{flaeche.gemeinde}} – Anfrage zur Verpachtung für eine Photovoltaik-Anlage"
STANDARD_TEXT = "\n".join([
	"{{briefanrede}},",
	"",
	"wir sind die ÖkoInvest GmbH, ein Unternehmen der ÖKOVOLT Gruppe, und entwickeln Freiflächen- und Agri-Photovoltaikanlagen. Bei unserer Standortsuche sind wir auf Grundstücke in Ihrem Eigentum in {{flaeche.gemeinde}} gestoßen ({{flaeche.flurstuecke}}). Zusammen mit angrenzenden Flächen umfasst der Bereich rund {{flaeche.ha}} ha – genug für eine Anlage mit etwa {{flaeche.mwp}} MWp.",
	"",
	"Nach unserer ersten Einschätzung kommt die Fläche grundsätzlich für einen Solarpark in Frage. Für vergleichbare Flächen zahlen wir in der Regel eine Pacht zwischen {{flaeche.pachtMin}} und {{flaeche.pachtMax}} € je Hektar und Jahr, über 25 bis 30 Jahre und wertgesichert. Die Spanne ist unverbindlich; maßgeblich sind Netzanschluss, Baurecht und Naturschutz, die wir für Sie kostenfrei prüfen. Möglich ist auch Agri-PV, bei der die landwirtschaftliche Nutzung weiterläuft.",
	"",
	"Unter dem Link bzw. QR-Code unten finden Sie einen persönlichen Steckbrief Ihrer Fläche und können die Pacht selbst durchrechnen. Wenn Sie Interesse an einem unverbindlichen Gespräch haben, antworten Sie uns dort oder formlos per Brief.",
])
PLATZHALTER_KAMPAGNE = {
	"anrede", "briefanrede", "vorname", "nachname", "firma", "ort", "flaeche.bezeichnung", "flaeche.ha", "flaeche.ort", "flaeche.bundesland", "flaeche.mwp",
	"zustaendig.name", "zustaendig.vorname", "heute", "kampagne.name", "flaeche.gemeinde", "flaeche.flurstuecke", "flaeche.pachtMin", "flaeche.pachtMax", "angebot.link", "angebot.code",
	"email", "portal.link", "flaeche.score", "flaeche.status",
}
MUSTER = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_.]{0,60})\s*\}\}")


def zahl_de(x, st=0):
	s = f"{float(x or 0):,.{st}f}"
	return s.replace(",", "X").replace(".", ",").replace("X", ".")


def rendern(text, kontext):
	def ersetzen(m):
		k = m.group(1)
		if k not in PLATZHALTER_KAMPAGNE:
			return ""
		w = kontext
		for t in k.split("."):
			w = w.get(t) if isinstance(w, dict) else None
		return "" if w is None else str(w)

	return re.sub(r"\n{3,}", "\n\n", MUSTER.sub(ersetzen, str(text or "")))


def briefanrede(e):
	a = str(e.get("anrede") or "").lower()
	name = " ".join(x for x in (e.get("titel"), e.get("nachname")) if x)
	if a == "frau" and e.get("nachname"):
		return f"Sehr geehrte Frau {name}"
	if a == "herr" and e.get("nachname"):
		return f"Sehr geehrter Herr {name}"
	if e.get("firma") and not e.get("nachname"):
		return "Sehr geehrte Damen und Herren"
	return ("Guten Tag " + " ".join(x for x in (e.get("vorname"), e.get("nachname")) if x)).strip()


def flurstueck_text(ziel, e):
	alle = ziel.get("parzellen") or []
	eigene = [p for p in alle if p.get("id") in (e.get("flurstuecke") or [])] if e.get("flurstuecke") else alle
	land = ziel.get("land") or "DE"
	gruppen = {}
	for p in eigene:
		gem = re.sub(r"^DEMO-(KG|Gemarkung)\s*", "", str(p.get("kg") or "")) or str(p.get("kgNr") or "")
		gruppen.setdefault(gem, []).append(str(p.get("gstNr") or ""))
	teile = []
	for gem, nr in gruppen.items():
		liste = f"{', '.join(nr[:4])} und {len(nr) - 4} weitere" if len(nr) > 4 else ", ".join(nr)
		teile.append(f"KG {gem}, Gst.-Nr. {liste}" if land == "AT" else f"{gem}, Parzelle {liste}" if land == "CH" else f"Gemarkung {gem}, Flst. {liste}")
	return "; ".join(teile)


def brief(kampagne, ziel, e, basis_url, firma, vorlage=None, zustaendig=None, datum=None):
	"""Brief-Blöcke für Druckformat/PDF – wie briefFuer() in serienbrief.js."""
	land = ziel.get("land") or kampagne.get("land") or "DE"
	sp = pachtspanne(ziel.get("ha"), ziel.get("ampel"))
	link = f"{str(basis_url or '').rstrip('/')}/angebot/{e.get('code')}"
	datum = datum or datetime.now()
	k = {
		"anrede": e.get("anrede") or "", "briefanrede": briefanrede(e), "vorname": e.get("vorname") or "", "nachname": e.get("nachname") or "", "firma": e.get("firma") or "", "ort": e.get("ort") or "",
		"kampagne": {"name": kampagne.get("name")},
		"flaeche": {"bezeichnung": f"{ziel.get('gemeinde')} · {zahl_de(ziel.get('ha'), 1)} ha", "gemeinde": ziel.get("gemeinde") or "", "ha": zahl_de(ziel.get("ha"), 1), "mwp": zahl_de(ziel.get("mwp"), 1), "ort": ziel.get("gemeinde") or "", "bundesland": ziel.get("bundesland") or "", "flurstuecke": flurstueck_text(ziel, e), "pachtMin": zahl_de(sp["proHaMin"]), "pachtMax": zahl_de(sp["proHaMax"])},
		"angebot": {"link": link, "code": code_lesbar(e.get("code"))},
		"zustaendig": {"name": (zustaendig or {}).get("name") or "Ihr ÖkoInvest-Team", "vorname": (zustaendig or {}).get("vorname") or ""},
		"heute": datum.strftime("%d.%m.%Y"),
	}
	v = vorlage or {}
	anschrift = [x for x in [
		e.get("firma") if e.get("firma") else "",
		" ".join(x for x in (e.get("anrede"), e.get("titel"), e.get("vorname"), e.get("nachname")) if x) if (not e.get("firma") or e.get("nachname")) else "",
		e.get("zusatz"), e.get("strasse"), " ".join(x for x in (e.get("plz"), e.get("ort")) if x),
	] if x]
	return {
		"land": land,
		"absenderZeile": f"{firma['name']} · {firma['strasse']} · {firma['ort']} · {firma['land']}",
		"anschrift": anschrift,
		"datum": f"{firma['ort'].split(' ', 1)[-1]}, {datum.strftime('%d.%m.%Y')}",
		"zeichen": f"{kampagne.get('id')} · {ziel.get('id')}",
		"betreff": rendern(v.get("betreff") or STANDARD_BETREFF, k),
		"text": rendern(v.get("text") or STANDARD_TEXT, k),
		"keinInteresse": KEIN_INTERESSE.get(land) or KEIN_INTERESSE["DE"],
		"link": link,
		"code": code_lesbar(e.get("code")),
		"flaechenDaten": [
			["Gemeinde", ziel.get("gemeinde")], ["Fläche (Bereich)", f"rund {k['flaeche']['ha']} ha"], ["Mögliche Leistung", f"etwa {k['flaeche']['mwp']} MWp"],
			["Pacht (unverbindlich)", f"{k['flaeche']['pachtMin']}–{k['flaeche']['pachtMax']} € je ha und Jahr"],
		],
		"widerspruch": WIDERSPRUCH,
		"datenschutz": [
			f"Verantwortlich: {firma['name']}, {firma['strasse']}, {firma['ort']}, {firma['land']}, {firma['fn']} ({firma['gericht']}).",
			"Zweck: Kontaktaufnahme zur möglichen Verpachtung Ihrer Fläche für eine Photovoltaik-Anlage.",
			"Rechtsgrundlage: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an der Suche geeigneter Flächen für erneuerbare Energien; Direktwerbung per Brief (Erwägungsgrund 47 DSGVO)" + ("; für die Schweiz zusätzlich Art. 31 DSG (überwiegendes Interesse)." if land == "CH" else "."),
			"Kategorien: Name, Anschrift, Bezeichnung und Größe Ihrer Grundstücke, Eigentumsverhältnis.",
			f"Datenquelle: {DATENQUELLE.get(land) or DATENQUELLE['DE']}",
			"Empfänger: gegebenenfalls Druck- und Versanddienstleister als Auftragsverarbeiter; keine Weitergabe an Dritte zu deren Werbezwecken.",
			"Speicherdauer: bis zum Abschluss der Anfrage, höchstens 12 Monate ohne Rückmeldung. Nach einem Widerspruch speichern wir nur einen Sperrvermerk (verschlüsselter Abgleichswert), damit wir Sie nicht erneut anschreiben.",
			f"Ihre Rechte: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. {BESCHWERDE.get(land) or BESCHWERDE['DE']}",
		],
	}


# ---------------------------------------------------------------- Gemeinde-Screening (wie gemeinde-screening.js)

RANKING_GEWICHTE = {"flaeche": 35, "qualitaet": 15, "netz": 15, "planung": 15, "kulisse": 10, "konkurrenz": 10}
PLANUNG_PUNKTE = {"fnp": 15, "laufend": 11, "aufstellung": 11, "kriterien": 9, "keine": 5, "": 6}
KONKURRENZ_GEWICHT = {"geruecht": 1, "flaeche": 3, "verfahren": 4, "genehmigt": 5, "gebaut": 5}
KONKURRENZ_STATUS = {"geruecht": "Hinweis/Gerücht", "flaeche": "Flächen gesichert", "verfahren": "B-Plan-Verfahren läuft", "genehmigt": "Genehmigt/Baurecht", "gebaut": "In Bau/Betrieb"}


def gemeinde_schluessel(land, bundesland, name):
	n = re.sub(r"\((demo|fiktiv)\)", "", str(name or "").lower())
	n = re.sub(r"^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde|ortsgemeinde|große kreisstadt|kreisstadt)\s+", "", n)
	n = n.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	n = re.sub(r"[^a-z0-9]+", "-", n).strip("-")
	return f"{land or 'XX'}:{str(bundesland or '')[:3].lower()}:{n}"


def potenzial_je_gemeinde(kandidaten, kapazitaeten=None):
	kap = kapazitaeten or {}
	m = {}
	for k in kandidaten or []:
		if not k.get("gemeinde"):
			continue
		s = gemeinde_schluessel(k.get("land"), k.get("bundesland"), k["gemeinde"])
		g = m.setdefault(s, {"schluessel": s, "land": k.get("land"), "bundesland": k.get("bundesland"), "bezirk": k.get("bezirk"), "name": k["gemeinde"], "kandidaten": 0, "ha": 0.0, "mwp": 0.0, "haGeeignet": 0.0, "haKulisse": 0.0, "gewichteteHa": 0.0, "beste": [], "_knoten": {}})
		ha = float(k.get("ha") or 0)
		score = float(k.get("score") or 0)
		g["kandidaten"] += 1
		g["ha"] += ha
		g["mwp"] += float(k.get("mwp") or 0)
		if score >= 45:
			g["haGeeignet"] += ha
		g["gewichteteHa"] += ha * (score / 100) * (1 if score >= 45 else 0.3)
		ku = (k.get("merkmale") or {}).get("kulisse") or {}
		if k.get("land") == "DE":
			anteil = max(ku.get("randstreifenAnteil") or 0, ku.get("benachteiligtAnteil") or 0, ku.get("moorAnteil") or 0, ku.get("konversionAnteil") or 0)
		elif k.get("land") == "CH":
			anteil = ku.get("eignungAnteil") or 0
		else:
			anteil = {"zone": 1, "angrenzend": 0.5}.get((k.get("widmung") or {}).get("status"), 0)
		g["haKulisse"] += ha * anteil
		g["beste"].append({"id": k.get("id"), "ha": k.get("ha"), "mwp": k.get("mwp"), "score": k.get("score"), "ampel": k.get("ampel")})
		kn = ((k.get("netz") or {}).get("knoten")) or {}
		if kn.get("id"):
			alt = g["_knoten"].get(kn["id"]) or {}
			c = kap.get(kn["id"]) or {}
			g["_knoten"][kn["id"]] = {"id": kn["id"], "name": kn.get("name"), "art": kn.get("art"), "kapazitaet": c.get("kapazitaet") or kn.get("kapazitaet") or "unbekannt", "freiMw": c.get("freiMw"), "flaechen": (alt.get("flaechen") or 0) + 1, "mwp": (alt.get("mwp") or 0) + float(k.get("mwp") or 0)}
	for g in m.values():
		g["beste"] = sorted(g["beste"], key=lambda x: (-float(x["score"] or 0), -float(x["ha"] or 0)))[:3]
		kn = list(g.pop("_knoten").values())
		frei = [x for x in kn if x["kapazitaet"] == "frei"]
		g["netz"] = {
			"knoten": sorted(kn, key=lambda x: -x["mwp"])[:4],
			"status": "frei" if frei else "unbekannt" if any(x["kapazitaet"] == "unbekannt" for x in kn) else "knapp" if kn else "keiner",
			"freiMw": sum(float(x.get("freiMw") or 0) for x in frei) or None,
		}
		for f in ("ha", "mwp", "haGeeignet", "haKulisse", "gewichteteHa"):
			g[f] = round(g[f], 1)
	return m


def gemeinde_ranking(g, info=None):
	info = info or {}
	G = RANKING_GEWICHTE
	teile = [{"id": "flaeche", "punkte": min(1, (g.get("gewichteteHa") or 0) / 60) * G["flaeche"], "max": G["flaeche"]}]
	beste = g.get("beste") or []
	top = sum(float(x["score"] or 0) for x in beste) / len(beste) if beste else 0
	teile.append({"id": "qualitaet", "punkte": top / 100 * G["qualitaet"], "max": G["qualitaet"]})
	teile.append({"id": "netz", "punkte": {"frei": 15, "unbekannt": 8, "knapp": 2, "keiner": 0}[(g.get("netz") or {}).get("status") or "keiner"], "max": G["netz"]})
	pp = PLANUNG_PUNKTE.get(info.get("bauleitplanung") or "", 6)
	if info.get("kriterienkatalog") == "ja":
		pp = min(15, pp + 3)
	teile.append({"id": "planung", "punkte": pp, "max": G["planung"]})
	anteil = min(1, (g.get("haKulisse") or 0) / g["ha"]) if g.get("ha") else 0
	teile.append({"id": "kulisse", "punkte": anteil * G["kulisse"], "max": G["kulisse"]})
	druck = sum(KONKURRENZ_GEWICHT.get(x.get("status"), 1) for x in (info.get("konkurrenz") or []) if x.get("aktiv") is not False)
	teile.append({"id": "konkurrenz", "punkte": max(0, G["konkurrenz"] - druck * 2), "max": G["konkurrenz"]})
	punkte = jsround(sum(t["punkte"] for t in teile))
	for t in teile:
		t["punkte"] = round(t["punkte"] * 10) / 10
	return {"punkte": punkte, "stufe": "A" if punkte >= 65 else "B" if punkte >= 45 else "C", "teile": teile}
