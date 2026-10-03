# Copyright (c) 2026, ÖkoInvest GmbH
#
# Lead-Kette (Welle 2, Paket B3) – Spiegel der Website-Logik:
#   src/lib/anfrage/protokoll.js   Pseudonym, Eintragsform, Hash-Kette, Kanal-Ampel, IP-Kürzung
#   src/data/lead-routing.js       Routing-Matrix Land × Typ × Größe, Desks (TODO Inhaber), Absagecodes
#   src/lib/anfrage/routing.js     Routing (Desk → Gebiet → ohne Zuständigkeit)
#   src/lib/anfrage/score.js       Score A/B/C mit Begründung
#   src/lib/anfrage/feiertage.js   landesweite Feiertage DE/AT/CH (Ostern berechnet)
#   src/lib/anfrage/sla.js         Frist in Geschäftsstunden, Ampel, Median/P90
#   src/lib/plattform/backend/demo/leadkette.js   Lead-Desk, Widerruf, Absage, Art. 17
#
# Speicher:
#   Plattform Einwilligung Protokoll  append-only, Hash-Kette (prev_hash/entry_hash), NUR Pseudonym + Textversion/-Hash
#   Plattform Lead Person             Personendaten getrennt und löschbar; gekürzte IP, Löschung nach 30 Tagen (Scheduler)
#   Plattform Vorgang.herkunft.lead   Lead-Meta (Land, Desk, Score, SLA …) – dem Anfragenden nicht sichtbar
#
# Pepper für das Pseudonym: site_config „lead_pseudonym_pepper“ (mind. 32 Zeichen), sonst Umgebung LEAD_PSEUDONYM_PEPPER.
# Ohne Pepper nur im developer_mode ein fester Testwert, sonst Fehler (keine Anfrage ohne sauberes Pseudonym).
# Personendaten erscheinen nie in Logs, Fehlermeldungen oder im Aktivitätsprotokoll.

import hashlib
import hmac
import json
import os
import re
import secrets
import unicodedata
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.hashkette import KETTE_START, eintrag_hash, verify_chain
from oekoinvest_app.plattform.kern import als_json, api_pruefen, aus_json, ist_admin, iso, jetzt, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

DT = "Plattform Einwilligung Protokoll"
PERSON = "Plattform Lead Person"
SPERRE = "oekoinvest_einwilligung_kette"

# ================================================================ Protokoll (protokoll.js)

ARTEN = ["hinweis", "einwilligung", "widerruf", "doi"]
WERBE_ZWECKE = ["werbeanruf", "newsletter", "weitergabe_partner", "bericht"]
ZWECKE = WERBE_ZWECKE + ["anfrage"]
ZWECK_LABEL = {"werbeanruf": "Werbeanruf", "newsletter": "Newsletter/Alarm", "weitergabe_partner": "Weitergabe an benannte Partner", "bericht": "Bericht per E-Mail", "anfrage": "Bearbeitung der Anfrage"}
DOI_ZWECKE = ["newsletter", "bericht"]
KANAELE = ["web_formular", "portal", "doi_link", "abmeldelink", "backoffice", "telefon", "email", "art17_loeschung"]
EINWILLIGUNG_ZWECK = {"werbeanruf": "werbeanruf", "newsletter": "newsletter", "partner": "weitergabe_partner"}  # hinweise.js zweckFuer
IP_FRIST_TAGE = 30
NACHWEIS_FRIST_JAHRE = 5  # TODO Rechtsabteilung: Frist je Land (DE § 7a Abs. 2 UWG: 5 Jahre; AT/CH zu prüfen)
LAENDER = ["DE", "AT", "CH"]

HEX64 = re.compile(r"^[0-9a-f]{64}$")
TEXT_ID = re.compile(r"^[a-z][a-z0-9_.-]{0,59}$")
VERSION = re.compile(r"^[A-Za-z][A-Za-z0-9_.:-]{0,39}$")
EID = re.compile(r"^EP-[0-9A-Z]{10,20}$")
ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
ENTWICKLUNG_PEPPER = "nur-entwicklung-oekoinvest-lead-pseudonym-pepper-2026"


def _pepper():
	p = str(frappe.conf.get("lead_pseudonym_pepper") or os.environ.get("LEAD_PSEUDONYM_PEPPER") or "")
	if len(p) >= 32:
		return p
	if frappe.conf.get("developer_mode"):
		return ENTWICKLUNG_PEPPER
	frappe.throw("Die Plattform ist nicht vollständig eingerichtet.")


def email_normal(email):
	return unicodedata.normalize("NFC", str(email or "")).strip().lower()


def pseudonym(email, pepper=None):
	e = email_normal(email)
	if not e or "@" not in e:
		ungueltig("Für das Protokoll fehlt eine gültige E-Mail-Adresse.")
	return hmac.new((pepper or _pepper()).encode("utf-8"), e.encode("utf-8"), hashlib.sha256).hexdigest()


def iso_ms(dt):
	"""datetime → ISO wie JavaScript toISOString() (UTC, Millisekunden, „Z“)."""
	if dt.tzinfo is None:
		dt = dt.replace(tzinfo=timezone.utc)
	dt = dt.astimezone(timezone.utc)
	return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _zeit_lesen(wert):
	if isinstance(wert, datetime):
		return wert
	try:
		return datetime.fromisoformat(str(wert).replace("Z", "+00:00"))
	except (TypeError, ValueError):
		return None


def _land_normal(wert):
	s = wert.strip().upper() if isinstance(wert, str) else ""
	return s if s in LAENDER else ""


def lead_land(wert):
	return _land_normal(wert) or "unbekannt"


def _pruefen(bedingung, feld):
	if not bedingung:
		ungueltig(f"Protokolleintrag ungültig ({feld}).")


def neue_eintrag_id():
	return "EP-" + "".join(ALPHABET[b % len(ALPHABET)] for b in secrets.token_bytes(12))


def eintrag_erstellen(d):
	"""Eintragsform: nur erlaubte Felder mit festen Mustern (wie eintragErstellen in protokoll.js)."""
	d = d if isinstance(d, dict) else {}
	ps, art, zweck = d.get("pseudonym"), d.get("art"), d.get("zweck")
	text_id, version, text_hash, kanal = d.get("textId"), d.get("textVersion"), d.get("textHash", ""), d.get("kanal")
	_pruefen(isinstance(ps, str) and HEX64.match(ps), "pseudonym")
	_pruefen(art in ARTEN, "art")
	_pruefen(zweck in ZWECKE, "zweck")
	_pruefen((art == "hinweis") == (zweck == "anfrage"), "zweck")
	_pruefen(isinstance(text_id, str) and TEXT_ID.match(text_id), "textId")
	_pruefen(isinstance(version, str) and VERSION.match(version), "textVersion")
	_pruefen(isinstance(text_hash, str) and (HEX64.match(text_hash) or (art == "widerruf" and text_hash == "")), "textHash")
	_pruefen(kanal in KANAELE, "kanal")
	land = "unbekannt" if d.get("land") == "unbekannt" else lead_land(d.get("land"))
	t = datetime.now(timezone.utc) if d.get("zeit") is None else _zeit_lesen(d.get("zeit"))
	_pruefen(t is not None, "zeit")
	eid = neue_eintrag_id() if d.get("id") is None else d.get("id")
	_pruefen(isinstance(eid, str) and EID.match(eid), "id")
	return {"id": eid, "pseudonym": ps, "art": art, "zweck": zweck, "textId": text_id, "textVersion": version, "textHash": text_hash, "kanal": kanal, "land": land, "zeit": iso_ms(t)}


def kette_form(e):
	"""Abbildung auf die kanonischen Felder der Hash-Kette (hashkette.py) – identisch zu ketteForm in protokoll.js."""
	return {
		"id": e["id"],
		"am": e["zeit"],
		"nutzerId": "",
		"aktion": e["art"],
		"objektArt": e["zweck"],
		"objektId": e["pseudonym"],
		"text": json.dumps([e["textId"], e["textVersion"], e["textHash"], e["kanal"], e["land"]], ensure_ascii=False, separators=(",", ":")),
		"ip": "",
	}


NUR_FELDER = {"id", "pseudonym", "art", "zweck", "textId", "textVersion", "textHash", "kanal", "land", "zeit"}


def _sperre_freigeben():
	try:
		frappe.db.sql("select release_lock(%s)", (SPERRE,))
	except Exception:
		pass


def anhaengen(eintrag):
	"""Eintrag anhängen (append-only). Serialisiert über GET_LOCK + Sperrlesung des letzten Eintrags."""
	_pruefen(isinstance(eintrag, dict) and not (set(eintrag) - NUR_FELDER), "unbekanntes Feld")
	e = eintrag_erstellen(eintrag)
	_pruefen(not frappe.db.exists(DT, e["id"]), "id doppelt")
	ok = frappe.db.sql("select get_lock(%s, 15)", (SPERRE,))
	if not ok or ok[0][0] != 1:
		frappe.throw("Das Protokoll ist gerade belegt. Bitte versuchen Sie es erneut.")
	frappe.db.after_commit.add(_sperre_freigeben)
	frappe.db.after_rollback.add(_sperre_freigeben)
	letzter = frappe.db.sql(f"select entry_hash, kette_nr from `tab{DT}` order by kette_nr desc limit 1 for update", as_dict=True)
	prev = letzter[0].entry_hash if letzter else KETTE_START
	nr = (int(letzter[0].kette_nr or 0) if letzter else 0) + 1
	h = eintrag_hash(prev, kette_form(e))
	doc = frappe.get_doc(
		{
			"doctype": DT,
			"eintrag_id": e["id"],
			"pseudonym": e["pseudonym"],
			"art": e["art"],
			"zweck": e["zweck"],
			"text_id": e["textId"],
			"text_version": e["textVersion"],
			"text_hash": e["textHash"],
			"kanal": e["kanal"],
			"land": e["land"],
			"zeit": e["zeit"],
			"kette_nr": nr,
			"prev_hash": prev,
			"entry_hash": h,
		}
	)
	doc.flags.lead_kette = True
	doc.insert(ignore_permissions=True)
	return {**e, "prevHash": prev, "hash": h}


def _eintraege(pseudonym_=None):
	filters = {"pseudonym": pseudonym_} if pseudonym_ else {}
	zeilen = frappe.get_all(DT, filters=filters, fields=["eintrag_id", "pseudonym", "art", "zweck", "text_id", "text_version", "text_hash", "kanal", "land", "zeit", "prev_hash", "entry_hash"], order_by="kette_nr asc", limit_page_length=0)
	return [
		{"id": z.eintrag_id, "pseudonym": z.pseudonym, "art": z.art, "zweck": z.zweck, "textId": z.text_id, "textVersion": z.text_version, "textHash": z.text_hash or "", "kanal": z.kanal, "land": z.land, "zeit": z.zeit, "prevHash": z.prev_hash, "hash": z.entry_hash}
		for z in zeilen
	]


def protokoll_pruefen_liste(eintraege):
	return verify_chain([{**kette_form(e), "prevHash": e["prevHash"], "hash": e["hash"]} for e in eintraege], alle_fehler=True)


def kanal_ampel(eintraege, ps, zweck):
	stand, seit, eid = "keine", None, None
	if zweck not in WERBE_ZWECKE or not isinstance(ps, str) or not HEX64.match(ps):
		return {"erlaubt": False, "stand": stand, "seit": seit, "eintragId": eid}
	for e in eintraege:
		if e["pseudonym"] != ps or e["zweck"] != zweck:
			continue
		if e["art"] == "einwilligung":
			stand = "doi_ausstehend" if zweck in DOI_ZWECKE else "erteilt"
		elif e["art"] == "doi" and stand == "doi_ausstehend":
			stand = "erteilt"
		elif e["art"] == "widerruf":
			stand = "widerrufen"
		else:
			continue
		seit, eid = e["zeit"], e["id"]
	return {"erlaubt": stand == "erteilt", "stand": stand, "seit": seit, "eintragId": eid}


def ip_kuerzen(ip):
	"""IPv4 → letztes Oktett 0, IPv6 → erste drei Gruppen + „::“ (identisch zu ipKuerzen in protokoll.js)."""
	s = str(ip or "").strip()
	m = re.match(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$", re.sub(r"(?i)^::ffff:", "", s))
	if m:
		return f"{m.group(1)}.{m.group(2)}.{m.group(3)}.0" if all(int(x) <= 255 for x in m.groups()) else ""
	if re.match(r"(?i)^[0-9a-f:]+$", s) and ":" in s:
		kopf = s.split("::")[0]
		gruppen = [g for g in kopf.split(":") if g]
		voll = (gruppen + ["0", "0", "0"])[:3] if "::" in s else s.split(":")[:3]
		return (":".join(voll).lower() + "::") if all(re.match(r"(?i)^[0-9a-f]{1,4}$", g) for g in voll) else ""
	return ""


def nachweis_bis(ab):
	try:
		return iso_ms(ab.replace(year=ab.year + NACHWEIS_FRIST_JAHRE))
	except ValueError:  # 29. Februar
		return iso_ms(ab.replace(year=ab.year + NACHWEIS_FRIST_JAHRE, day=28))


# ================================================================ Routing (lead-routing.js, routing.js)

ROUTING_STAND = "ENTWURF-2026-10-03"
LEAD_TYPEN = {
	"flaeche": ("Freifläche", "flaeche"), "agri": ("Agri-PV", "flaeche"), "dach": ("Dachfläche", "flaeche"), "carport": ("Solarcarport", "flaeche"),
	"kommune": ("Kommune", "kommune"), "energiegemeinschaft": ("Energiegemeinschaft", "kommune"), "genossenschaft": ("Genossenschaft", "kommune"),
	"investor": ("Investor", "kapital"), "projekt": ("Projekt anbieten", "kapital"), "speicher": ("Großspeicher", "energie"), "reststrom": ("Reststrom-Pool", "energie"),
	"kontakt": ("Allgemeine Anfrage", "allgemein"),
}
INF = float("inf")
GROESSEN = {
	"flaeche": {"einheit": "ha", "grenzen": [("klein", 5), ("mittel", 20), ("gross", INF)]},
	"agri": {"einheit": "ha", "grenzen": [("klein", 5), ("mittel", 20), ("gross", INF)]},
	"dach": {"einheit": "m²", "grenzen": [("klein", 1000), ("mittel", 5000), ("gross", INF)]},
	"carport": {"einheit": "Stellplätze", "grenzen": [("klein", 50), ("mittel", 250), ("gross", INF)]},
	"speicher": {"einheit": "MW", "grenzen": [("klein", 10), ("mittel", 50), ("gross", INF)], "auswahl": {"bis10": "klein", "10-50": "mittel", "ueber50": "gross"}},
	"reststrom": {"einheit": "MWh/a", "grenzen": [("klein", 100), ("mittel", 1000), ("gross", INF)]},
	"investor": {"einheit": "MWp", "grenzen": [("klein", 5), ("mittel", 20), ("gross", INF)], "auswahl": {"bis5": "klein", "5-20": "mittel", "20-50": "gross", "ueber50": "gross"}},
	"projekt": {"einheit": "MWp", "grenzen": [("klein", 5), ("mittel", 20), ("gross", INF)]},
}
GRUPPEN = {"flaeche": ("Flächen", "akquise"), "kommune": ("Kommunen & Gemeinschaften", "akquise"), "kapital": ("Kapital & Projekte", "transaktion"), "energie": ("Energie & Speicher", "energie"), "allgemein": ("Allgemein", "leitung")}
LAND_LABEL = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz", "unbekannt": "Land unbekannt"}
TODO_DESK = "TODO Inhaber: Person, Vertretung und Postfach benennen (E7, Postfächer je Land)"


def _desks():
	out = {}
	for land in LAENDER + ["unbekannt"]:
		gruppen = {"clearing": ("Clearing", "leitung")} if land == "unbekannt" else GRUPPEN
		for g, (label, rolle) in gruppen.items():
			did = f"{land.lower()}-{g}"
			out[did] = {"id": did, "land": land, "gruppe": g, "label": f"{LAND_LABEL[land]} · {label}", "rolle": rolle, "person": None, "vertretung": None, "postfach": None, "todo": TODO_DESK}
	return out


LEAD_DESKS = _desks()

ABSAGE_CODES = {
	"groesse": ("Größe passt nicht", "Die Fläche bzw. das Vorhaben passt in der Größe derzeit nicht zu unseren Projekten."),
	"netz": ("Kein Netzanschluss absehbar", "Für den Standort ist nach unserer Prüfung derzeit kein wirtschaftlicher Netzanschluss absehbar."),
	"lage": ("Lage / Planungsrecht", "Die Lage ist nach unserer ersten Prüfung planungsrechtlich derzeit nicht geeignet."),
	"region": ("Region nicht betreut", "Diese Region betreuen wir derzeit nicht."),
	"angebot": ("Kein passendes Angebot", "Für Ihr Anliegen haben wir derzeit kein passendes Angebot."),
	"dublette": ("Doppelte Anfrage", "Ihre Anfrage liegt uns bereits vor und wird unter der ersten Vorgangsnummer bearbeitet."),
	"nicht_erreicht": ("Nicht erreicht", "Wir konnten Sie leider mehrfach nicht erreichen. Melden Sie sich gern erneut."),
	"sonstiges": ("Sonstiges (Begründung Pflicht)", ""),
}


def _sla_basis(typ, groesse):
	if typ in ("speicher", "investor", "kommune"):
		return "h4"
	if typ in ("flaeche", "agri") and groesse == "gross":
		return "taggleich"
	return "wt2"


def _zahl(x):
	if isinstance(x, bool):
		return None
	if isinstance(x, (int, float)):
		return float(x) if x == x and x not in (INF, -INF) else None
	if not isinstance(x, str) or not x.strip():
		return None
	s = re.sub(r"\s", "", x.strip())
	if re.match(r"^\d{1,3}(\.\d{3})+(,\d+)?$", s):
		s = s.replace(".", "")
	try:
		n = float(s.replace(",", ".", 1))
	except ValueError:
		return None
	return n if n == n and n not in (INF, -INF) else None


def lead_typ(typ, daten):
	d = daten if isinstance(daten, dict) else {}
	if typ == "flaeche" and d.get("art") == "dach":
		return "dach"
	return typ if typ in LEAD_TYPEN else "kontakt"


def _erster(d, *schluessel):
	for s in schluessel:
		if d.get(s) is not None:
			return d.get(s)
	return None


def _messwert(typ, d):
	ein = d.get("eingaben") if isinstance(d.get("eingaben"), dict) else {}
	if typ in ("flaeche", "agri"):
		w = _erster(d, "ha", "hektar", "flaeche", "flaecheHa")
		return _zahl(w if w is not None else ein.get("flaecheHa"))
	quellen = {"dach": ("dachflaeche", "dachflaecheM2", "m2"), "carport": ("stellplaetze",), "speicher": ("mw",), "reststrom": ("verbrauchMwh",), "investor": ("mwp",), "projekt": ("mwp",)}
	if typ not in quellen:
		return None
	w = _erster(d, *quellen[typ])
	return _zahl(w if w is not None else ein.get(quellen[typ][0]))


def groesse_ermitteln(typ, daten):
	g = GROESSEN.get(typ)
	if not g:
		return {"klasse": "unbekannt", "wert": None, "einheit": ""}
	d = daten if isinstance(daten, dict) else {}
	wert = _messwert(typ, d)
	if wert is not None and wert > 0:
		klasse = next((k for k, bis in g["grenzen"] if wert < bis), "gross")
		return {"klasse": klasse, "wert": int(wert) if wert == int(wert) else wert, "einheit": g["einheit"]}
	roh = d.get("groesse") if d.get("groesse") is not None else d.get("ticket")
	auswahl = (g.get("auswahl") or {}).get(roh) if isinstance(roh, str) else None
	out = {"klasse": auswahl or "unbekannt", "wert": None, "einheit": g["einheit"]}
	if auswahl:
		out["auswahl"] = roh
	return out


def routen(typ, daten, land, gebiet=None, aktiv=None):
	"""Spiegel von routen() in routing.js. gebiet: {mitarbeiterId, name, grund} oder None; aktiv: fn(konto_id) -> bool."""
	lt = lead_typ(typ, daten)
	l = lead_land(land)
	groesse = groesse_ermitteln(lt, daten)
	desk = LEAD_DESKS["unbekannt-clearing" if l == "unbekannt" else f"{l.lower()}-{LEAD_TYPEN[lt][1]}"]

	def ist_aktiv(kid):
		try:
			return bool(kid) and bool(aktiv and aktiv(kid))
		except Exception:
			return False

	gruende, zid, quelle = [], None, None
	if desk.get("person") and ist_aktiv(desk["person"]):
		zid, quelle = desk["person"], "desk"
		gruende.append(f"Lead-Desk {desk['label']}")
	elif l != "unbekannt" and gebiet and ist_aktiv(gebiet.get("mitarbeiterId")):
		zid, quelle = gebiet["mitarbeiterId"], "gebiet"
		gruende.append(f"Gebiet „{gebiet.get('name') or '?'}“" + (f" ({gebiet['grund']})" if gebiet.get("grund") else ""))
	else:
		gruende.append("Land unbekannt – Clearing nötig" if l == "unbekannt" else "Kein Desk und kein Gebiet besetzt")
	if not desk.get("person"):
		gruende.append("Desk-Person offen (TODO Inhaber)")
	vertretung = desk["vertretung"] if desk.get("vertretung") and ist_aktiv(desk["vertretung"]) and desk["vertretung"] != zid else None
	return {
		"land": l, "landBekannt": l != "unbekannt", "typ": lt, "groesse": groesse, "desk": {"id": desk["id"], "label": desk["label"]},
		"zustaendigId": zid, "zustaendigQuelle": quelle, "vertretungId": vertretung, "ohneZustaendigkeit": not zid,
		"slaKlasseBasis": _sla_basis(lt, groesse["klasse"]), "gruende": gruende, "stand": ROUTING_STAND,
	}


# ================================================================ Score (score.js)

GROESSE_PUNKTE = {"gross": 40, "mittel": 25, "klein": 10, "unbekannt": 0}
GROESSE_TEXT = {"gross": "große Größenklasse", "mittel": "mittlere Größenklasse", "klein": "kleine Größenklasse", "unbekannt": "Größe unbekannt"}


def _gefuellt(x):
	if isinstance(x, str):
		return bool(x.strip())
	return isinstance(x, (int, float)) and not isinstance(x, bool) and x == x


def _zahl_text(w):
	return str(int(w)) if isinstance(w, float) and w == int(w) else str(w).replace(".", ",")


def score_berechnen(typ, groesse, land_bekannt, rueckruf, kontakt, daten):
	k = kontakt if isinstance(kontakt, dict) else {}
	d = daten if isinstance(daten, dict) else {}
	gruende = []
	if typ in GROESSEN:
		kl = (groesse or {}).get("klasse") if (groesse or {}).get("klasse") in GROESSE_PUNKTE else "unbekannt"
		wert = (groesse or {}).get("wert")
		zusatz = f" ({' '.join(x for x in (_zahl_text(wert), (groesse or {}).get('einheit') or '') if x)})" if wert is not None else ""
		gruende.append({"text": GROESSE_TEXT[kl] + zusatz, "punkte": GROESSE_PUNKTE[kl]})
	else:
		gruende.append({"text": "Anfragetyp ohne Größenklasse", "punkte": 20})
	gruende.append({"text": "Land bekannt", "punkte": 20} if land_bekannt else {"text": "Land unbekannt", "punkte": 0})
	gruende.append({"text": "Rückruf gewünscht", "punkte": 20} if rueckruf else {"text": "kein Rückrufwunsch", "punkte": 0})
	da = [n for n, w in (("Firma", k.get("firma")), ("PLZ", k.get("plz")), ("Telefon", k.get("telefon")), ("Nachricht", d.get("nachricht"))) if _gefuellt(w)]
	gruende.append({"text": f"Angaben vollständig: {', '.join(da)} ({len(da)} von 4)" if da else "keine Zusatzangaben", "punkte": len(da) * 5})
	punkte = min(100, sum(g["punkte"] for g in gruende))
	klasse = "A" if punkte >= 70 else "B" if punkte >= 40 else "C"
	return {"klasse": klasse, "punkte": punkte, "gruende": gruende, "begruendung": f"{klasse} ({punkte} Punkte): " + " · ".join(f"{g['text']} +{g['punkte']}" for g in gruende)}


# ================================================================ Feiertage und SLA (feiertage.js, sla.js)


def oster_sonntag(jahr):
	a, b, c = jahr % 19, jahr // 100, jahr % 100
	d, e = b // 4, b % 4
	f = (b + 8) // 25
	g = (b - f + 1) // 3
	h = (19 * a + b - d - g + 15) % 30
	i, k = c // 4, c % 4
	l = (32 + 2 * e + 2 * i - h - k) % 7  # noqa: E741
	m = (a + 11 * h + 22 * l) // 451
	return date(jahr, (h + l - 7 * m + 114) // 31, ((h + l - 7 * m + 114) % 31) + 1)


OSTERN = {"karfreitag": -2, "ostermontag": 1, "himmelfahrt": 39, "pfingstmontag": 50, "fronleichnam": 60}
FEIERTAGE = {
	"DE": [(1, 1), "karfreitag", "ostermontag", (5, 1), "himmelfahrt", "pfingstmontag", (10, 3), (12, 25), (12, 26)],
	"AT": [(1, 1), (1, 6), "ostermontag", (5, 1), "himmelfahrt", "pfingstmontag", "fronleichnam", (8, 15), (10, 26), (11, 1), (12, 8), (12, 25), (12, 26)],
	"CH": [(1, 1), "himmelfahrt", (8, 1), (12, 25)],  # Neujahr, Auffahrt, Weihnachtstag: „zu prüfen“ (siehe feiertage.js)
}
_feiertag_cache = {}


def feiertage(land, jahr):
	key = (land, jahr)
	if key not in _feiertag_cache:
		ostern = oster_sonntag(jahr)
		_feiertag_cache[key] = {date(jahr, r[0], r[1]) if isinstance(r, tuple) else ostern + timedelta(days=OSTERN[r]) for r in FEIERTAGE.get(land, [])}
	return _feiertag_cache[key]


GESCHAEFTSZEIT = {
	"DE": ("Europe/Berlin", 8, 17, "DE"),
	"AT": ("Europe/Vienna", 8, 17, "AT"),
	"CH": ("Europe/Zurich", 8, 17, "CH"),
	"unbekannt": ("Europe/Vienna", 8, 17, "AT"),
}
SLA_KLASSEN = {
	"h1": {"label": "A-Lead mit Rückruf", "ziel": "unter 1 Geschäftsstunde", "minuten": 60, "gelbMin": 15},
	"h4": {"label": "Großspeicher, Investor, Kommune", "ziel": "4 Geschäftsstunden", "minuten": 240, "gelbMin": 60},
	"taggleich": {"label": "Fläche ab 20 ha", "ziel": "am selben Geschäftstag", "gelbMin": 120},
	"wt2": {"label": "Standard", "ziel": "2 Werktage", "werktage": 2, "gelbMin": 240},
}


def sla_klasse(basis, score, rueckruf):
	if score == "A" and rueckruf is True:
		return "h1"
	return basis if basis in SLA_KLASSEN else "wt2"


def _zeit(land):
	return GESCHAEFTSZEIT.get(land) or GESCHAEFTSZEIT["unbekannt"]


def ist_geschaeftstag(land, tag):
	return tag.weekday() < 5 and tag not in feiertage(_zeit(land)[3], tag.year)


def _fenster(land, tag):
	if not ist_geschaeftstag(land, tag):
		return None
	tz, von, bis, _ = _zeit(land)
	z = ZoneInfo(tz)
	return (datetime(tag.year, tag.month, tag.day, von, tzinfo=z).timestamp(), datetime(tag.year, tag.month, tag.day, bis, tzinfo=z).timestamp())


def _ts(wert):
	if wert is None or wert == "":
		return None
	if isinstance(wert, (int, float)):
		return float(wert)
	dt = _zeit_lesen(wert)
	if dt is None:
		return None
	if dt.tzinfo is None:
		dt = dt.replace(tzinfo=timezone.utc)
	return dt.timestamp()


def _orts_tag(ts, land):
	return datetime.fromtimestamp(ts, ZoneInfo(_zeit(land)[0])).date()


def _iso_ts(ts):
	return iso_ms(datetime.fromtimestamp(ts, timezone.utc))


def frist_berechnen(eingang, klasse, land):
	ms = _ts(eingang)
	if ms is None:
		return None
	k = SLA_KLASSEN.get(klasse) or SLA_KLASSEN["wt2"]
	_, von, bis, _ = _zeit(land)
	tag = _orts_tag(ms, land)
	if klasse == "taggleich":
		for _ in range(400):
			f = _fenster(land, tag)
			if f and f[1] - max(ms, f[0]) >= 3600:
				return _iso_ts(f[1])
			tag += timedelta(days=1)
		return None
	rest = (k.get("minuten") or k["werktage"] * (bis - von) * 60) * 60
	for _ in range(400):
		f = _fenster(land, tag)
		tag += timedelta(days=1)
		if not f:
			continue
		start = max(ms, f[0])
		if start >= f[1]:
			continue
		if rest <= f[1] - start:
			return _iso_ts(start + rest)
		rest -= f[1] - start
	return None


def geschaefts_minuten(von, bis, land):
	a, b = _ts(von), _ts(bis)
	if a is None or b is None or b <= a:
		return 0
	tag, ende, summe = _orts_tag(a, land), _orts_tag(b, land), 0.0
	for _ in range(1200):
		if tag > ende:
			break
		f = _fenster(land, tag)
		if f:
			summe += max(0.0, min(b, f[1]) - max(a, f[0]))
		tag += timedelta(days=1)
	return round(summe / 60)


def _dauer_text(minuten):
	return (f"{round(minuten / 6) / 10:g} h".replace(".", ",")) if minuten >= 120 else f"{minuten} min"


def sla_auswerten(eingang, erstkontakt_am=None, klasse="wt2", land="unbekannt", jetzt_ts=None):
	k = klasse if klasse in SLA_KLASSEN else "wt2"
	ein = _ts(eingang)
	leer = {"klasse": k, "frist": None, "status": "unbekannt", "ampel": "grau", "ueberfaellig": False, "kalenderMin": None, "geschaeftsMin": None, "text": "Kein Eingang"}
	if ein is None:
		return leer
	frist = frist_berechnen(ein, k, land)
	frist_ts = _ts(frist)
	kontakt = _ts(erstkontakt_am)
	if kontakt is not None:
		kal = max(0, round((kontakt - ein) / 60))
		gm = geschaefts_minuten(ein, kontakt, land)
		in_frist = kontakt <= frist_ts
		return {"klasse": k, "frist": frist, "status": "erledigt" if in_frist else "verspaetet", "ampel": "gruen" if in_frist else "gelb", "ueberfaellig": False, "kalenderMin": kal, "geschaeftsMin": gm, "text": f"Erstkontakt nach {_dauer_text(gm)} Geschäftszeit" + ("" if in_frist else " (nach Frist)")}
	now = jetzt_ts if jetzt_ts is not None else datetime.now(timezone.utc).timestamp()
	basis = {"klasse": k, "frist": frist, "kalenderMin": None, "geschaeftsMin": None}
	if now > frist_ts:
		return {**basis, "status": "ueberfaellig", "ampel": "rot", "ueberfaellig": True, "text": f"Überfällig seit {_dauer_text(geschaefts_minuten(frist_ts, now, land))} Geschäftszeit"}
	rest = round((frist_ts - now) / 60)
	if rest <= SLA_KLASSEN[k]["gelbMin"]:
		return {**basis, "status": "faellig", "ampel": "gelb", "ueberfaellig": False, "text": f"Fällig in {_dauer_text(rest)}"}
	return {**basis, "status": "offen", "ampel": "gruen", "ueberfaellig": False, "text": f"Frist läuft ({_dauer_text(geschaefts_minuten(now, frist_ts, land))} Geschäftszeit)"}


def kennzahlen(werte):
	x = sorted(w for w in werte if isinstance(w, (int, float)) and not isinstance(w, bool) and w == w)
	n = len(x)
	if not n:
		return {"anzahl": 0, "median": None, "p90": None}
	median = x[(n - 1) // 2] if n % 2 else (x[n // 2 - 1] + x[n // 2]) / 2
	p90 = x[max(0, -(-9 * n // 10) - 1)]  # Nearest-Rank: ceil(0.9 n) − 1
	return {"anzahl": n, "median": median, "p90": p90}


def _gruppe(liste):
	erledigt = [x for x in liste if x["sla"]["status"] in ("erledigt", "verspaetet")]
	return {
		"anzahl": len(liste),
		"mitErstkontakt": len(erledigt),
		"inFrist": len([x for x in liste if x["sla"]["status"] == "erledigt"]),
		"offen": len([x for x in liste if x["sla"]["status"] in ("offen", "faellig", "ueberfaellig")]),
		"ueberfaellig": len([x for x in liste if x["sla"]["ueberfaellig"]]),
		"ohneZustaendigkeit": len([x for x in liste if x.get("ohneZustaendigkeit")]),
		"geschaeftsMin": kennzahlen([x["sla"]["geschaeftsMin"] for x in erledigt]),
		"kalenderMin": kennzahlen([x["sla"]["kalenderMin"] for x in erledigt]),
	}


def sla_auswertung(leads):
	def nach(f):
		m = {}
		for x in leads:
			m.setdefault(f(x), []).append(x)
		return m

	je_land_typ = [{"land": s[0], "typ": s[1], **_gruppe(liste)} for s, liste in sorted(nach(lambda x: (x.get("land") or "unbekannt", x.get("typ") or "kontakt")).items())]
	return {
		"gesamt": _gruppe(leads),
		"jeLand": {s: _gruppe(liste) for s, liste in nach(lambda x: x.get("land") or "unbekannt").items()},
		"jeTyp": {s: _gruppe(liste) for s, liste in nach(lambda x: x.get("typ") or "kontakt").items()},
		"jeLandTyp": je_land_typ,
	}


# ================================================================ Anlage einer Anfrage (aufgerufen von anfrage.py)


def _aktives_backoffice(kid):
	from oekoinvest_app.plattform.backoffice import _aktive_backoffice

	return _aktive_backoffice(kid)


def lead_berechnen(typ, daten, land, kontakt, rueckruf, gebiet, eingang):
	r = routen(typ, daten, land, gebiet, _aktives_backoffice)
	sc = score_berechnen(r["typ"], r["groesse"], r["landBekannt"], rueckruf, kontakt, daten)
	kl = sla_klasse(r["slaKlasseBasis"], sc["klasse"], rueckruf)
	return {
		"land": r["land"], "typ": r["typ"], "groesse": r["groesse"], "desk": r["desk"], "zustaendigId": r["zustaendigId"], "zustaendigQuelle": r["zustaendigQuelle"],
		"vertretungId": r["vertretungId"], "ohneZustaendigkeit": r["ohneZustaendigkeit"], "routingGruende": r["gruende"], "score": sc, "slaKlasse": kl,
		"frist": frist_berechnen(eingang, kl, r["land"]), "stand": ROUTING_STAND,
	}


def _version(x):
	return x if isinstance(x, str) and VERSION.match(x) else "unversioniert"


def lead_vorbereiten(typ, d, k, rueckruf, gebiet, eingang):
	"""Vor dem Anlegen des Vorgangs: Lead-Meta (Routing, Score, SLA) + Pseudonym – ohne Schreibzugriff."""
	lead = lead_berechnen(typ, d, k.get("land"), k, rueckruf, gebiet, eingang)
	lead["pseudonym"] = pseudonym(k["email"]) if k.get("email") else None
	lead["erstkontaktAm"] = None
	return lead


def lead_anlegen(vorgang_id, lead, eingang, k, ip_, hinweis, einwilligung_text, optional, kanal="web_formular"):
	"""Nach dem Anlegen des Vorgangs – Spiegel von leadAnlegenDb (demo/leadkette.js): getrennte Personenzeile und
	Protokolleinträge (Hinweis + nur ausdrücklich erteilte Einwilligungen)."""
	ps = lead.get("pseudonym")
	if not ps:
		return lead
	gek = ip_kuerzen(ip_)
	frappe.get_doc(
		{
			"doctype": PERSON,
			"pseudonym": ps,
			"vorgang_id": vorgang_id,
			"vorname": k.get("vorname") or "",
			"nachname": k.get("nachname") or "",
			"firma": k.get("firma") or "",
			"email": k.get("email") or "",
			"telefon": k.get("telefon") or "",
			"ip_gekuerzt": gek,
			"ip_loeschen_ab": (jetzt() + timedelta(days=IP_FRIST_TAGE)) if gek else None,
			"land": lead["land"],
		}
	).insert(ignore_permissions=True)
	hw = hinweis if isinstance(hinweis, dict) else {}
	if HEX64.match(str(hw.get("textHash") or "")):
		h = {"textId": "hinweis_anfrage", "textVersion": _version(hw.get("version")), "textHash": hw["textHash"]}
	elif einwilligung_text:
		h = {"textId": "anfrage_text", "textVersion": "unversioniert", "textHash": hashlib.sha256(str(einwilligung_text).encode("utf-8")).hexdigest()}
	else:
		h = None
	if h:
		anhaengen({"pseudonym": ps, "art": "hinweis", "zweck": "anfrage", **h, "kanal": kanal, "land": lead["land"], "zeit": eingang})
	for e in optional or []:
		zweck = EINWILLIGUNG_ZWECK.get(e.get("id"))
		if not zweck or e.get("erteilt") is not True or not HEX64.match(str(e.get("textHash") or "")):
			continue  # nur ausdrücklich erteilt, mit Text-Hash – keine mutmaßliche Einwilligung
		anhaengen({"pseudonym": ps, "art": "einwilligung", "zweck": zweck, "textId": e["id"], "textVersion": _version(e.get("version")), "textHash": e["textHash"], "kanal": kanal, "land": lead["land"], "zeit": eingang})
	return lead


# ================================================================ Öffentliche Methoden (nur API-Benutzer)


def _ps_aus(email=None, pseudonym_=None):
	if isinstance(pseudonym_, str) and HEX64.match(pseudonym_):
		return pseudonym_
	return pseudonym(email)


@frappe.whitelist(methods=["POST"])
def protokoll_anhaengen(eintrag=None):
	api_pruefen()
	e = dict(eintrag) if isinstance(eintrag, dict) else {}
	ps = _ps_aus(e.pop("email", None), e.pop("pseudonym", None))
	r = anhaengen({**e, "pseudonym": ps})
	return {"id": r["id"], "zeit": r["zeit"], "hash": r["hash"]}


@frappe.whitelist(methods=["POST"])
def werbekanal_erlaubt(email=None, pseudonym=None, zweck=None):  # noqa: A002 – Vertrag
	api_pruefen()
	ps = _ps_aus(email, pseudonym)
	return kanal_ampel(_eintraege(ps), ps, zweck)["erlaubt"]


@frappe.whitelist(methods=["POST"])
def kanal_stand(email=None, pseudonym=None):  # noqa: A002 – Vertrag
	api_pruefen()
	ps = _ps_aus(email, pseudonym)
	liste = _eintraege(ps)
	return {z: kanal_ampel(liste, ps, z) for z in WERBE_ZWECKE}


def _ip_aufraeumen():
	zeilen = frappe.db.sql(f"select name from `tab{PERSON}` where ifnull(ip_gekuerzt, '') != '' and (ip_loeschen_ab is null or ip_loeschen_ab <= %s)", (jetzt(),))
	for (name,) in zeilen:
		frappe.db.set_value(PERSON, name, {"ip_gekuerzt": "", "ip_loeschen_ab": None}, update_modified=False)
	return len(zeilen)


@frappe.whitelist(methods=["POST"])
def ip_aufraeumen():
	api_pruefen()
	return {"entfernt": _ip_aufraeumen()}


def ip_aufraeumen_taeglich():
	"""Scheduler (hooks.py, täglich): gekürzte IPs nach 30 Tagen löschen."""
	n = _ip_aufraeumen()
	frappe.db.commit()
	return n


# ================================================================ Backoffice


def _lesen(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "vorgaenge") >= 1):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Vorgänge“ kein lesen.")


def _schreiben(n):
	if not n:
		nicht_angemeldet()
	if not (ist_admin(n) and stufe(n, "vorgaenge") >= 2):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Vorgänge“ kein schreiben.")


def meta_von(vg):
	h = aus_json(vg.get("herkunft"), {}) or {}
	return h.get("lead") if isinstance(h.get("lead"), dict) else None


def _meta_setzen(vg_name, meta):
	h = aus_json(frappe.db.get_value("Plattform Vorgang", vg_name, "herkunft"), {}) or {}
	h["lead"] = meta
	frappe.db.set_value("Plattform Vorgang", vg_name, "herkunft", als_json(h), update_modified=False)


def _lead_von(vg):
	m = meta_von(vg)
	if m:
		return m
	kt = aus_json(vg.get("kontakt"), {}) or {}
	d = aus_json(vg.get("daten"), {}) or {}
	m = lead_berechnen(vg.typ, d, kt.get("land"), kt, d.get("rueckrufGewuenscht") is True, None, iso(vg.creation))
	return {**m, "pseudonym": None, "nachberechnet": True}


def _name(kid):
	from oekoinvest_app.plattform.kern import name_von

	return name_von(kid) if kid else ""


@frappe.whitelist(methods=["POST"])
def lead_desk(land="", tage=90, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	from oekoinvest_app.plattform.backoffice import erstkontakt_am

	t = min(730, max(1, int(v.zahl(tage, min=1, max=730) or 90)))
	ab = jetzt() - timedelta(days=t)
	ip_entfernt = _ip_aufraeumen()
	kette = _eintraege()
	alle = []
	for name in frappe.get_all("Plattform Vorgang", filters={"creation": (">=", ab)}, pluck="name", order_by="creation desc", limit_page_length=2000):
		vg = frappe.get_doc("Plattform Vorgang", name)
		lead = _lead_von(vg)
		eingang = iso(vg.creation)
		ek = lead.get("erstkontaktAm")
		if not ek:
			roh = erstkontakt_am("vorgang", vg, vg.creation)
			ek = iso(roh) if roh else None
			if ek and meta_von(vg):
				_meta_setzen(vg.name, {**lead, "erstkontaktAm": ek})
		sla = sla_auswerten(eingang, ek, lead.get("slaKlasse"), lead.get("land"))
		kt = aus_json(vg.kontakt, {}) or {}
		ps = lead.get("pseudonym")
		alle.append(
			{
				"id": vg.name,
				"typ": lead.get("typ"),
				"typLabel": LEAD_TYPEN.get(lead.get("typ"), (vg.typ, ""))[0],
				"status": vg.status,
				"land": lead.get("land") or "unbekannt",
				"eingang": eingang,
				"anzeige": "gelöscht (Art. 17)" if lead.get("loeschung") else " ".join(x for x in (kt.get("vorname"), (kt.get("nachname") or "")[:1] + "." if kt.get("nachname") else "") if x) or "–",
				"desk": lead.get("desk"),
				"zustaendig": {"id": vg.zustaendig_id, "name": _name(vg.zustaendig_id)} if vg.zustaendig_id else None,
				"vertretung": {"id": lead["vertretungId"], "name": _name(lead["vertretungId"])} if lead.get("vertretungId") else None,
				"ohneZustaendigkeit": not vg.zustaendig_id,
				"zustaendigQuelle": (lead.get("zustaendigQuelle") if vg.zustaendig_id == lead.get("zustaendigId") else "manuell") if vg.zustaendig_id else None,
				"score": lead.get("score"),
				"slaKlasse": lead.get("slaKlasse"),
				"sla": sla,
				"groesse": lead.get("groesse"),
				"absage": lead.get("absage"),
				"geloescht": bool(lead.get("loeschung")),
				"nachberechnet": bool(lead.get("nachberechnet")),
				"kanaele": {z: kanal_ampel(kette, ps, z)["stand"] for z in WERBE_ZWECKE} if ps else None,
			}
		)
	l = "" if lead_land(land) == "unbekannt" and land != "unbekannt" else lead_land(land)
	liste = [x for x in alle if not l or x["land"] == l]
	liste.sort(key=lambda x: x["eingang"] or "", reverse=True)
	liste.sort(key=lambda x: not x["sla"]["ueberfaellig"])  # stabil: überfällige zuerst, sonst neueste zuerst
	absagen = {}
	for x in alle:
		if x["absage"]:
			a = absagen.setdefault(x["absage"]["code"], {"code": x["absage"]["code"], "label": ABSAGE_CODES.get(x["absage"]["code"], (x["absage"]["code"], ""))[0], "anzahl": 0, "begruendungen": []})
			a["anzahl"] += 1
			a["begruendungen"].append({"vorgangId": x["id"], "text": x["absage"]["begruendung"]})
	pr = protokoll_pruefen_liste(kette)
	personen = frappe.db.count(PERSON)
	return {
		"ok": True,
		"zeitraum": {"tage": t, "ab": iso(ab)},
		"land": l,
		"leads": liste[:500],
		"anzahl": len(liste),
		"auswertung": sla_auswertung([{"land": x["land"], "typ": x["typ"], "sla": x["sla"], "ohneZustaendigkeit": x["ohneZustaendigkeit"]} for x in alle]),
		"absagen": list(absagen.values()),
		"absageCodes": [{"id": k, "label": a[0], "text": a[1]} for k, a in ABSAGE_CODES.items()],
		"slaKlassen": [{"id": k, "label": x["label"], "ziel": x["ziel"]} for k, x in SLA_KLASSEN.items()],
		"desks": [{"id": d["id"], "land": d["land"], "label": d["label"], "besetzt": bool(d["person"]), "vertretung": bool(d["vertretung"]), "postfach": bool(d["postfach"]), "todo": "" if d["person"] else d["todo"]} for d in LEAD_DESKS.values()],
		"kette": {"ok": pr["ok"], "anzahl": pr["anzahl"], "fehler": pr["fehler"][:10], "letzterHash": pr["letzterHash"]},
		"personen": {"anzahl": personen, "mitIp": frappe.db.count(PERSON, {"ip_gekuerzt": ("!=", "")}), "ipEntfernt": ip_entfernt, "ipFristTage": IP_FRIST_TAGE},
		"nachweisFristJahre": NACHWEIS_FRIST_JAHRE,
		"todo": ["Personen, Vertretungen und Postfächer je Land benennen (TODO Inhaber, E7)", "Nachweisfrist je Land bestätigen (TODO Rechtsabteilung)", "Geschäftszeiten je Desk festlegen (TODO Inhaber/Vertrieb)"],
	}


@frappe.whitelist(methods=["POST"])
def kette_pruefen(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lesen(n)
	r = protokoll_pruefen_liste(_eintraege())
	return {**r, "fehler": r["fehler"][:20], "geprueftAm": iso(jetzt())}


def _vorgang(vorgang_id):
	kennung = v.kennung(vorgang_id)
	if not kennung or not frappe.db.exists("Plattform Vorgang", kennung):
		nicht_gefunden("Anfrage nicht gefunden.")
	return frappe.get_doc("Plattform Vorgang", kennung)


def _ps_des_vorgangs(vg):
	m = meta_von(vg)
	if m and m.get("pseudonym"):
		return m["pseudonym"]
	return pseudonym(vg.email) if vg.email else None


@frappe.whitelist(methods=["POST"])
def widerrufen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = daten if isinstance(daten, dict) else {}
	zweck, kanal = d.get("zweck"), d.get("kanal") or "backoffice"
	if zweck not in WERBE_ZWECKE:
		ungueltig("Unbekannter Zweck.")
	if kanal not in ("backoffice", "telefon", "email"):
		ungueltig("Unbekannter Kanal.")
	vg = _vorgang(d.get("vorgangId"))
	ps = _ps_des_vorgangs(vg)
	if not ps:
		frappe.throw("Zu dieser Anfrage gibt es kein Protokoll.", frappe.DuplicateEntryError)
	m = meta_von(vg) or {}
	e = anhaengen({"pseudonym": ps, "art": "widerruf", "zweck": zweck, "textId": "widerruf", "textVersion": ROUTING_STAND, "textHash": "", "kanal": kanal, "land": m.get("land") or lead_land((aus_json(vg.kontakt, {}) or {}).get("land"))})
	protokoll(n, "lead_widerruf", "vorgang", vg.name, f"Widerruf eingetragen: {ZWECK_LABEL[zweck]}")
	return {"ok": True, "eintrag": {"id": e["id"], "zeit": e["zeit"]}, "stand": kanal_ampel(_eintraege(ps), ps, zweck)}


@frappe.whitelist(methods=["POST"])
def absage_setzen(vorgang_id=None, daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = daten if isinstance(daten, dict) else {}
	code = d.get("code")
	if code not in ABSAGE_CODES:
		ungueltig("Unbekannter Absagecode.")
	text = v.text(d.get("begruendung"), 1000) or ABSAGE_CODES[code][1]
	if not text:
		ungueltig("Bitte geben Sie eine Begründung an.")
	vg = _vorgang(vorgang_id)
	meta = dict(_lead_von(vg))
	meta["absage"] = {"code": code, "begruendung": text, "am": iso(jetzt()), "vonId": n.id}
	_meta_setzen(vg.name, meta)
	protokoll(n, "lead_absage", "vorgang", vg.name, f"Absagecode „{ABSAGE_CODES[code][0]}“")
	return {"ok": True, "absage": meta["absage"]}


GELOESCHT = {"anrede": "", "vorname": "Gelöscht", "nachname": "(Art. 17)", "firma": "", "email": "", "telefon": "", "plz": "", "ort": ""}


@frappe.whitelist(methods=["POST"])
def person_loeschen(daten=None, als_benutzer=None):
	"""Art. 17 – Spiegel von personLoeschen (demo/leadkette.js)."""
	n = nutzer(als_benutzer)
	_schreiben(n)
	d = daten if isinstance(daten, dict) else {}
	vg = _vorgang(d.get("vorgangId"))
	ps = _ps_des_vorgangs(vg)
	am = jetzt()
	bis = nachweis_bis(datetime.now(timezone.utc))
	namen = set(frappe.get_all(PERSON, filters={"vorgang_id": vg.name}, pluck="name"))
	if ps:
		namen |= set(frappe.get_all(PERSON, filters={"pseudonym": ps}, pluck="name"))
	for name in namen:
		frappe.delete_doc(PERSON, name, ignore_permissions=True, force=True)
	widerrufen_ = []
	if ps:
		liste = _eintraege(ps)
		for z in WERBE_ZWECKE:
			if kanal_ampel(liste, ps, z)["stand"] in ("erteilt", "doi_ausstehend"):
				anhaengen({"pseudonym": ps, "art": "widerruf", "zweck": z, "textId": "art17", "textVersion": ROUTING_STAND, "textHash": "", "kanal": "art17_loeschung", "land": (meta_von(vg) or {}).get("land") or "unbekannt"})
				widerrufen_.append(z)
	betroffen = {vg.name}
	if ps:
		betroffen |= set(frappe.get_all("Plattform Vorgang", filters={"herkunft": ("like", f'%"pseudonym":"{ps}"%')}, pluck="name"))
	konto = False
	for name in betroffen:
		x = frappe.get_doc("Plattform Vorgang", name)
		konto = konto or bool(x.nutzer_id)
		kt = aus_json(x.kontakt, {}) or {}
		dd = aus_json(x.daten, {}) or {}
		if dd.get("nachricht"):
			dd["nachricht"] = "[gelöscht]"
		ew = aus_json(x.einwilligung, {}) or {}
		if ew:
			ew["ip"] = ""
		meta = {**_lead_von(x), "pseudonym": (meta_von(x) or {}).get("pseudonym") or ps, "loeschung": {"am": iso(am), "nachweisBis": bis, "grund": v.text(d.get("grund"), 200), "vonId": n.id}}
		h = aus_json(x.herkunft, {}) or {}
		h["lead"] = meta
		frappe.db.set_value("Plattform Vorgang", name, {"kontakt": als_json({**kt, **GELOESCHT, "land": kt.get("land") or ""}), "email": "", "ip": "", "daten": als_json(dd), "einwilligung": als_json(ew) if ew else x.einwilligung, "herkunft": als_json(h)}, update_modified=False)
		for parent in frappe.get_all("Plattform CRM Bezug", filters={"parenttype": "Plattform CRM Kontakt", "bezug_id": name}, pluck="parent"):
			if frappe.db.get_value("Plattform CRM Kontakt", parent, "nutzer_id"):
				continue
			frappe.db.set_value("Plattform CRM Kontakt", parent, {"anrede": "", "vorname": "Gelöscht", "nachname": "(Art. 17)", "firma": "", "email": "", "telefon": "", "plz": "", "ort": "", "notiz": ""}, update_modified=True)
	protokoll(n, "lead_geloescht", "vorgang", vg.name, f"Personendaten gelöscht (Art. 17), {len(betroffen)} Vorgang/Vorgänge; Nachweis bis {bis[:10]}")
	pr = protokoll_pruefen_liste(_eintraege())
	return {"ok": True, "entfernt": len(namen), "vorgaenge": sorted(betroffen), "widerrufen": widerrufen_, "nachweisBis": bis, "kontoVorhanden": konto, "ketteOk": pr["ok"]}
