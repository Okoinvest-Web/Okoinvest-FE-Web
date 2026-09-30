# Copyright (c) 2026, ÖkoInvest GmbH
#
# Berichte & Analysen, Backoffice-Unterrollen und Prüfung der Hash-Kette.
#  - bericht: Trichter über Zeit, Kohorten-Trichter, Konversion je Quelle (Herkunft/UTM), Pipeline-MWp nach Phase/Land,
#    Provision erwartet (gewichtet nach Abschlusswahrscheinlichkeit) vs. realisiert, Durchlaufzeiten, Team-Leistung.
#    Ausgabe wie berichtBerechnen in backend/demo/berichte.js (PDF/CSV erzeugt die Website).
#  - rechte / rollen_setzen: Unterrollen (plattform/rechte.py), nur Leitung.
#  - kette_pruefen: verify_chain über das Aktivitätsprotokoll (plattform/hashkette.py).

from statistics import median

import frappe
from frappe.utils import cint, get_datetime, getdate, nowdate

from oekoinvest_app.plattform import backoffice as bo
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.hashkette import doc_als_eintrag, verify_chain
from oekoinvest_app.plattform.kern import aus_json, iso, jetzt, name_von, nicht_gefunden, nutzer, protokoll
from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN, PROVISION_MIN, VORGANG_TYPEN
from oekoinvest_app.plattform.prozesse import PROZESSE, status_label
from oekoinvest_app.plattform.rechte import BACKOFFICE_ROLLEN, BEREICHE, RECHTE_MATRIX, darf_lesen, recht_noetig, rollen_aus_feld, unterrollen

WAHRSCHEINLICHKEIT = {
	"pruefung": {"label": "In Prüfung", "p": 0.05},
	"veroeffentlicht": {"label": "Veröffentlicht, ohne NDA", "p": 0.1},
	"nda": {"label": "Datenraum freigegeben", "p": 0.2},
	"loi": {"label": "LOI abgegeben", "p": 0.35},
	"reserviert": {"label": "LOI angenommen / reserviert", "p": 0.6},
	"verkauft": {"label": "Verkauft", "p": 1},
}
# Mitte der Preisspannen je Phase in €/kWp (wie PHASEN.preisProKwp in src/lib/invest/markt.js) – nur Schätzung,
# wenn ein Projekt „Preis auf Anfrage“ hat
PHASE_PREIS_MITTE = {"flaeche": 12.5, "netz": 27.5, "aufstellung": 40, "satzung": 67.5, "rtb": 95, "cod": 700}
STUFEN = {"vorgang": ["eingegangen", "in_pruefung", "qualifiziert", "angebot", "abgeschlossen"], "flaeche": ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag"]}
LISTE = {"vorgang": "Plattform Vorgang", "flaeche": "Plattform Flaeche", "projekt": "Plattform Projekt", "interesse": "Plattform Interesse"}


def _zeitraum(von, bis):
	heute = getdate(nowdate())
	try:
		b = getdate(bis) if bis else heute
	except Exception:  # noqa: BLE001
		b = heute
	try:
		vn = getdate(von) if von else None
	except Exception:  # noqa: BLE001
		vn = None
	if not vn:
		m = b.month - 11
		j = b.year + (m - 1) // 12
		vn = getdate(f"{j}-{(m - 1) % 12 + 1:02d}-01")
	vn = min(vn, b)
	monate, j, m = [], vn.year, vn.month
	while (j, m) <= (b.year, b.month) and len(monate) < 60:
		monate.append(f"{j}-{m:02d}")
		m += 1
		if m > 12:
			j, m = j + 1, 1
	return {"von": str(vn), "bis": str(b), "monate": monate}


def _verlauf(dt):
	zeilen = frappe.get_all("Plattform Statusverlauf", filters={"parenttype": dt}, fields=["parent", "status", "am", "von_id", "von_rolle"], order_by="am asc", limit_page_length=0)
	out = {}
	for z in zeilen:
		out.setdefault(z.parent, []).append(z)
	return out


def _erreicht(verlauf, art, status, erstellt=None):
	if art == "vorgang" and status == "eingegangen":
		return erstellt
	pipe = PROZESSE[art]["pipeline"]
	idx = pipe.index(status)
	treffer = [e.am for e in verlauf if e.status in pipe and pipe.index(e.status) >= idx]
	return min(treffer) if treffer else None


def _erster(verlauf, status):
	t = [e.am for e in verlauf if e.status == status]
	return min(t) if t else None


def bericht_berechnen(n, von=None, bis=None):
	z = _zeitraum(von, bis)
	vd, bd = z["von"], z["bis"]
	im = lambda t: bool(t) and vd <= str(getdate(t)) <= bd  # noqa: E731
	mi = {m: i for i, m in enumerate(z["monate"])}
	leer = lambda: [0 for _ in z["monate"]]  # noqa: E731
	objekte = {art: frappe.get_all(dt, fields=["*"], limit_page_length=0) for art, dt in LISTE.items()}
	verlaeufe = {art: _verlauf(dt) for art, dt in LISTE.items()}

	trichter_zeit = {}
	for art, stufen in STUFEN.items():
		reihen = {s: leer() for s in stufen}
		for o in objekte[art]:
			for s in stufen:
				am = _erreicht(verlaeufe[art].get(o.name, []), art, s, o.creation)
				if am and im(am) and str(getdate(am))[:7] in mi:
					reihen[s][mi[str(getdate(am))[:7]]] += 1
		trichter_zeit[art] = {"stufen": [{"id": s, "label": status_label(art, s)} for s in stufen], "reihen": reihen}
	kohorte = [o for o in objekte["vorgang"] if im(o.creation)]
	k_trichter = [{"id": s, "label": status_label("vorgang", s), "anzahl": sum(1 for o in kohorte if _erreicht(verlaeufe["vorgang"].get(o.name, []), "vorgang", s, o.creation))} for s in STUFEN["vorgang"]]
	f_kohorte = [f for f in objekte["flaeche"] if f.status != "entwurf" and im(f.creation)]
	f_trichter = [{"id": s, "label": status_label("flaeche", s), "anzahl": sum(1 for o in f_kohorte if _erreicht(verlaeufe["flaeche"].get(o.name, []), "flaeche", s))} for s in STUFEN["flaeche"]]

	quellen = {}
	for vg in kohorte:
		h = aus_json(vg.herkunft) or {}
		k = h.get("kanal") or "Unbekannt"
		e = quellen.setdefault(k, {"kanal": k, "anfragen": 0, "qualifiziert": 0, "abgeschlossen": 0, "abgelehnt": 0, "kampagnen": {}})
		e["anfragen"] += 1
		if _erreicht(verlaeufe["vorgang"].get(vg.name, []), "vorgang", "qualifiziert"):
			e["qualifiziert"] += 1
		e["abgeschlossen"] += 1 if vg.status == "abgeschlossen" else 0
		e["abgelehnt"] += 1 if vg.status == "abgelehnt" else 0
		c = h.get("utm_campaign") or h.get("utm_source")
		if c:
			e["kampagnen"][c] = e["kampagnen"].get(c, 0) + 1
	quellen_liste = sorted(
		[{**e, "quoteQualifiziert": e["qualifiziert"] / e["anfragen"], "quoteAbschluss": e["abgeschlossen"] / e["anfragen"], "kampagnen": [{"name": a, "anzahl": b} for a, b in sorted(e["kampagnen"].items(), key=lambda x: -x[1])[:5]]} for e in quellen.values()],
		key=lambda e: -e["anfragen"],
	)

	offen_p = [p for p in objekte["projekt"] if p.status in ("pruefung", "veroeffentlicht", "reserviert")]
	phasen = [{"id": ph["id"], "label": ph.get("kurz") or ph["label"], "werte": {l: round(sum(float(p.mwp or 0) for p in offen_p if p.phase == ph["id"] and p.land == l) * 10) / 10 for l in LAENDER}} for ph in PHASEN]
	st_f = ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"]
	flaechen_pipe = [{"id": s, "label": status_label("flaeche", s), "werte": {l: round(sum(float(f.ha or 0) / bo.HA_JE_MWP for f in objekte["flaeche"] if f.status == s and f.land == l) * 10) / 10 for l in LAENDER}} for s in st_f]

	interessen = {}
	for i in objekte["interesse"]:
		interessen.setdefault(i.projekt_id, []).append(i.status)
	erwartet = []
	for p in offen_p:
		st = interessen.get(p.name, [])
		stand = "reserviert" if p.status == "reserviert" or "loi_angenommen" in st else "pruefung" if p.status == "pruefung" else "loi" if "loi_abgegeben" in st else "nda" if "nda_freigegeben" in st else "veroeffentlicht"
		preis = float(p.preis or 0) if p.preis_modus == "gesamt" else float(p.preis_pro_kwp or 0) * float(p.mwp or 0) * 1000 if p.preis_modus == "proKwp" else 0
		geschaetzt = not preis
		if not preis:
			preis = PHASE_PREIS_MITTE.get(p.phase, 0) * float(p.mwp or 0) * 1000
		satz = float(p.provision_satz or PROVISION_MIN)
		w = WAHRSCHEINLICHKEIT[stand]
		erwartet.append({"id": p.name, "titel": p.titel, "land": p.land, "mwp": float(p.mwp or 0), "stand": stand, "standLabel": w["label"], "p": w["p"], "kaufpreis": round(preis), "geschaetzt": geschaetzt, "satz": satz, "provision": round(preis * satz), "gewichtet": round(preis * satz * w["p"])})
	erwartet.sort(key=lambda x: -x["gewichtet"])
	prov = frappe.get_all("Plattform Provision", fields=["name", "betrag", "status", "creation"], limit_page_length=0)
	prov_v = _verlauf("Plattform Provision")
	real_m, bez_m = leer(), leer()
	for x in prov:
		if x.status != "storniert" and im(x.creation) and str(getdate(x.creation))[:7] in mi:
			real_m[mi[str(getdate(x.creation))[:7]]] += float(x.betrag or 0)
		b_am = _erster(prov_v.get(x.name, []), "bezahlt")
		if x.status == "bezahlt" and b_am and im(b_am) and str(getdate(b_am))[:7] in mi:
			bez_m[mi[str(getdate(b_am))[:7]]] += float(x.betrag or 0)
	provision = {
		"erwartetGewichtet": sum(x["gewichtet"] for x in erwartet), "erwartetUngewichtet": sum(x["provision"] for x in erwartet),
		"realisiert": sum(real_m), "bezahlt": sum(bez_m), "offen": sum(float(x.betrag or 0) for x in prov if x.status in ("offen", "in_rechnung")),
		"realisiertMonat": real_m, "bezahltMonat": bez_m, "projekte": erwartet if darf_lesen(n, "provisionen") else [], "wahrscheinlichkeiten": WAHRSCHEINLICHKEIT,
	}

	durchlauf = {}
	for art in LISTE:
		pipe = PROZESSE[art]["pipeline"]
		durchlauf[art] = []
		for i, s in enumerate(pipe[:-1]):
			tage = []
			for o in objekte[art]:
				ve = verlaeufe[art].get(o.name, [])
				a = o.creation if art == "vorgang" and s == "eingegangen" else _erster(ve, s)
				b = _erster(ve, pipe[i + 1])
				if a and b and im(b) and get_datetime(b) >= get_datetime(a):
					tage.append((get_datetime(b) - get_datetime(a)).total_seconds() / 86400)
			durchlauf[art].append({"von": s, "nach": pipe[i + 1], "label": f"{status_label(art, s)} → {status_label(art, pipe[i + 1])}", "anzahl": len(tage), "median": round(median(tage), 1) if tage else None, "mittel": round(sum(tage) / len(tage), 1) if tage else None})

	team = []
	for kid in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"):
		if not bo._aktive_backoffice(kid):
			continue
		wechsel = sum(1 for art in LISTE for ve in verlaeufe[art].values() for e in ve if e.von_id == kid and im(e.am))
		team.append({
			"id": kid, "name": name_von(kid),
			"offen": frappe.db.count("Plattform Vorgang", {"zustaendig_id": kid, "status": ("in", ["eingegangen", "in_pruefung", "qualifiziert", "angebot"])}) + frappe.db.count("Plattform Flaeche", {"zustaendig_id": kid, "status": ("in", st_f)}),
			"statuswechsel": wechsel,
			"aufgabenErledigt": frappe.db.count("Plattform Aufgabe", {"erledigt_von": kid, "erledigt_am": ("between", [vd, f"{bd} 23:59:59"])}),
			"aufgabenUeberfaellig": frappe.db.count("Plattform Aufgabe", {"zustaendig_id": kid, "status": "offen", "faellig_am": ("<", nowdate())}),
			"crmAktivitaeten": frappe.db.count("Plattform CRM Aktivitaet", {"von_id": kid, "system": 0, "am": ("between", [vd, f"{bd} 23:59:59"])}),
			"slaQuote": None, "slaBasis": 0,
		})
	summe = lambda liste: round(sum(sum(x["werte"].values()) for x in liste) * 10) / 10  # noqa: E731
	return {
		"zeitraum": z, "erstelltAm": iso(jetzt()),
		"kennzahlen": {
			"anfragen": len(kohorte), "qualifiziertQuote": (k_trichter[2]["anzahl"] / len(kohorte)) if kohorte else 0,
			"flaechenNeu": len(f_kohorte), "flaechenHa": round(sum(float(f.ha or 0) for f in f_kohorte) * 10) / 10,
			"projekteVeroeffentlicht": sum(1 for p in objekte["projekt"] if im(p.veroeffentlicht_am)),
			"verkaeufe": sum(1 for p in objekte["projekt"] if p.status == "verkauft" and im(_erster(verlaeufe["projekt"].get(p.name, []), "verkauft"))),
			"pipelineMwp": summe(phasen), "flaechenMwp": summe(flaechen_pipe), "provisionRealisiert": provision["realisiert"], "provisionErwartet": provision["erwartetGewichtet"],
		},
		"trichterZeit": trichter_zeit, "kohorteTrichter": k_trichter, "flaechenTrichter": f_trichter, "quellen": quellen_liste,
		"typen": sorted([{"typ": t, "label": VORGANG_TYPEN.get(t, t), "anzahl": sum(1 for x in kohorte if x.typ == t)} for t in {x.typ for x in kohorte}], key=lambda x: -x["anzahl"]),
		"pipelinePhasen": phasen, "flaechenPipeline": flaechen_pipe, "provision": provision, "durchlauf": durchlauf, "team": team,
	}


@frappe.whitelist(methods=["POST"])
def bericht(von=None, bis=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "berichte", 1)
	return bericht_berechnen(n, von, bis)


# ================================================================ Unterrollen


@frappe.whitelist(methods=["POST"])
def rechte(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "rechte", 1)
	konten = []
	for kid in frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"):
		k = frappe.db.get_value("Plattform Konto", kid, ["name", "email", "aktiv", "backoffice_rollen"], as_dict=True)
		if not k:
			continue
		r = rollen_aus_feld(k.backoffice_rollen)
		konten.append({"id": k.name, "name": name_von(k.name), "email": k.email, "aktiv": bool(cint(k.aktiv)), "backofficeRollen": unterrollen(frappe._dict(rollen=["admin"], backofficeRollen=r)), "ausdruecklich": bool(r), "demo": False})
	rollen = {r: {"label": {"leitung": "Leitung", "akquise": "Akquise", "transaktion": "Transaktion", "buchhaltung": "Buchhaltung", "lesen": "Nur lesen"}[r], "text": ""} for r in BACKOFFICE_ROLLEN}
	return {"rollen": rollen, "bereiche": BEREICHE, "matrix": RECHTE_MATRIX, "konten": konten}


@frappe.whitelist(methods=["POST"])
def rollen_setzen(nutzerId=None, rollen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "rechte", 2)
	r = v.mehrfach(rollen, BACKOFFICE_ROLLEN)
	v.pflicht(r, "Mindestens eine Backoffice-Rolle wählen.")
	kid = v.kennung(nutzerId)
	if not kid or not frappe.db.exists("Plattform Konto Rolle", {"parent": kid, "parenttype": "Plattform Konto", "rolle": "admin"}):
		nicht_gefunden("Backoffice-Konto nicht gefunden.")
	if kid == n.id and "leitung" not in r:
		frappe.throw("Die eigene Leitungsrolle kann nicht entfernt werden.", frappe.DuplicateEntryError)
	frappe.db.set_value("Plattform Konto", kid, "backoffice_rollen", ",".join(r))
	protokoll(n, "rechte", "nutzer", kid, f"Backoffice-Rollen: {', '.join(r)}")
	return {"id": kid, "backofficeRollen": r}


# ================================================================ Hash-Kette


@frappe.whitelist(methods=["POST"])
def kette_pruefen(limit=30, als_benutzer=None):
	"""verify_chain über alle Einträge (Reihenfolge kette_nr) + letzte Einträge mit Hashes."""
	n = nutzer(als_benutzer)
	recht_noetig(n, "protokoll", 1)
	felder = ["name", "am", "nutzer_id", "aktion", "objekt_art", "objekt_id", "text", "ip", "prev_hash", "entry_hash", "kette_nr", "nachgesiegelt"]
	zeilen = frappe.get_all("Plattform Aktivitaet", filters={"kette_nr": (">", 0)}, fields=felder, order_by="kette_nr asc", limit_page_length=0)
	kopf = frappe.get_single("Plattform Kette")
	anker = {"hash": kopf.anker_hash, "anzahl": cint(kopf.anker_anzahl)} if kopf.anker_hash else None
	eintraege = [doc_als_eintrag(z) for z in zeilen]
	r = verify_chain(eintraege, anker=anker, alle_fehler=True)
	ohne = frappe.db.count("Plattform Aktivitaet", {"entry_hash": ("is", "not set")})
	if ohne:
		r["ok"] = False
		r["fehler"].append({"index": None, "id": None, "am": None, "grund": f"{ohne} Einträge ohne Hash (Patch hashkette_einfuehren ausführen)"})
	if kopf.letzter_hash and eintraege and eintraege[-1]["hash"] != kopf.letzter_hash:
		r["ok"] = False
		r["fehler"].append({"index": len(eintraege) - 1, "id": eintraege[-1]["id"], "am": eintraege[-1]["am"], "grund": "Letzter Eintrag passt nicht zum Kettenkopf (Eintrag am Ende gelöscht?)"})
	letzte = list(reversed(zeilen[-min(200, cint(limit) or 30):]))
	return {
		**r, "eingefuehrt": True, "seit": iso(kopf.seit), "nachgesiegelt": sum(1 for z in zeilen if cint(z.nachgesiegelt)), "anker": anker,
		"verfahren": "SHA-256(prevHash + LF + kanonischer Inhalt)", "erster": {"id": zeilen[0].name, "am": iso(zeilen[0].am)} if zeilen else None,
		"letzter": {"id": zeilen[-1].name, "am": iso(zeilen[-1].am), "hash": zeilen[-1].entry_hash} if zeilen else None, "geprueftAm": iso(jetzt()),
		"eintraege": [{"id": z.name, "am": iso(z.am), "aktion": z.aktion, "objektArt": z.objekt_art, "objektId": z.objekt_id, "text": z.text, "nutzer": name_von(z.nutzer_id) or "Gast/System", "prevHash": z.prev_hash, "hash": z.entry_hash, "nachgesiegelt": bool(cint(z.nachgesiegelt))} for z in letzte],
	}
