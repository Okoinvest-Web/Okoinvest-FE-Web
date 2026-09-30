# Copyright (c) 2026, ÖkoInvest GmbH
# Bedienung & Onboarding: globale Suche der Befehlspalette (Strg/⌘+K) und Onboarding-Zustand am Konto.
#
# suchen: setzt ausschließlich auf die bereits rechtegeprüften Listen-Methoden auf (vorgang.liste,
# flaeche.liste, projekt.liste, boerse.liste, nachricht.threads, admin.nutzer_liste) – dadurch kann die
# Suche nie mehr liefern, als der Nutzer ohnehin sehen darf. „alle“ nur mit Rolle admin, Börse nur für
# Investoren, Nutzer nur für das Backoffice. Links sind immer interne Portal-Pfade.
# Vertrag: docs/API.md (Abschnitt „Bedienung & Onboarding“), Demo-Referenz: src/lib/plattform/backend/demo/bedienung.js

import re
import unicodedata

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, aus_json, hat_rolle, ist_admin, jetzt_iso, nutzer, protokoll

SUCHE_MIN = 2
SUCHE_MAX = 80
ONBOARDING_STATUS = ("neu", "laufend", "erledigt", "uebersprungen")
ONBOARDING_SCHRITTE = 4  # profil, objekt, benachrichtigungen, fertig
ONBOARDING_MERKER = ("profil", "objekt", "benachrichtigungen", "bedienung", "fertig")
PORTAL_PFAD = re.compile(r"^/portal(/|$|\?)")


# ================================================================ Suche


def normalisieren(s):
	s = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
	return re.sub(r"[^a-z0-9@.\-]+", " ", s).strip()


def _wort_wert(wort, text):
	pos = text.find(wort)
	if pos == 0:
		return 1.0
	if pos > 0:
		return (0.9 if text[pos - 1] in " -." else 0.7) - min(0.15, pos / 400)
	# Buchstabenfolge (Subsequenz)
	j, erste, letzte = 0, -1, -1
	for i, c in enumerate(text):
		if j < len(wort) and c == wort[j]:
			if erste < 0:
				erste = i
			letzte = i
			j += 1
	if j < len(wort):
		return 0.0
	dichte = len(wort) / (letzte - erste + 1)
	if dichte < 0.25:
		return 0.0
	return 0.2 + 0.3 * dichte - min(0.1, erste / 500)


def fuzzy_wert(anfrage, felder):
	"""0 = kein Treffer … 1 = exakt; alle Suchwörter müssen passen (wie suche.js, ohne Tippfehler-Toleranz)."""
	q = normalisieren(anfrage)
	if not q:
		return 1.0
	texte = [normalisieren(f) for f in felder]
	worte = [w for w in q.split(" ") if w]
	summe = 0.0
	for w in worte:
		bester = max([_wort_wert(w, t) * (1 if i == 0 else 0.85) for i, t in enumerate(texte) if t] or [0.0])
		if bester == 0:
			return 0.0
		summe += bester
	bonus = 0.2 if texte and texte[0] == q else (0.1 if texte and texte[0].startswith(q) else 0)
	return min(1.0, summe / len(worte) + bonus)


def _rangieren(eintraege, anfrage, limit):
	bewertet = [(fuzzy_wert(anfrage, e["felder"]), i, e) for i, e in enumerate(eintraege)]
	bewertet = [x for x in bewertet if x[0] >= 0.2]
	bewertet.sort(key=lambda x: (-x[0], x[1]))
	return [x[2] for x in bewertet[:limit]]


def _name(k):
	k = k or {}
	return " ".join(x for x in (k.get("vorname"), k.get("nachname")) if x)


def _statuslabel(art, status):
	from oekoinvest_app.plattform.prozesse import PROZESSE

	eintrag = ((PROZESSE.get(art) or {}).get("status") or {}).get(status)
	if isinstance(eintrag, dict):
		return eintrag.get("label") or status or ""
	return eintrag or status or ""


def _mwp(x):
	return f"{str(x).replace('.', ',')} MWp" if x else None


@frappe.whitelist(methods=["POST"])
def suchen(q=None, limit=None, als_benutzer=None):
	from oekoinvest_app.plattform.api import admin as admin_api
	from oekoinvest_app.plattform.api import boerse, flaeche, nachricht, projekt, vorgang
	from oekoinvest_app.plattform.konstanten import PROJEKT_TYPEN, VORGANG_TYPEN

	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	anfrage = re.sub(r"[\x00-\x1f\x7f]", " ", str(q or "")).strip()[:SUCHE_MAX]
	max_je_art = min(20, max(1, int(v.zahl(limit, min=1, max=20, stellen=0) or 6)))
	if len(anfrage) < SUCHE_MIN:
		return {"q": anfrage, "treffer": []}
	admin = ist_admin(n)

	def als(fn, **kw):
		# Jede Unter-Methode prüft selbst (API-Benutzer → als_benutzer, Rolle UND Eigentum)
		frappe.set_user(api_user)
		try:
			return fn(als_benutzer=als_benutzer, **kw) or []
		except (frappe.PermissionError, frappe.DoesNotExistError):
			return []

	quellen = []
	if hat_rolle(n, ["flaeche", "landwirt"]):
		quellen.append([
			{
				"art": "flaeche", "id": f.get("id"), "titel": f.get("bezeichnung") or f.get("id"),
				"untertitel": " · ".join(x for x in (" ".join(y for y in (f.get("plz"), f.get("ort")) if y), _statuslabel("flaeche", f.get("status"))) if x),
				"href": f"/portal/flaechen/{f.get('id')}",
				"felder": [f.get("bezeichnung"), f.get("id"), f.get("ort"), f.get("plz"), f.get("gemarkung"), _name(f.get("eigentuemer")) if admin else ""],
			}
			for f in als(flaeche.liste, alle=admin)
		])
	if hat_rolle(n, ["anbieter"]):
		quellen.append([
			{
				"art": "projekt", "id": p.get("id"), "titel": p.get("titel") or p.get("id"),
				"untertitel": " · ".join(x for x in (PROJEKT_TYPEN.get(p.get("typ")), _mwp(p.get("mwp")), _statuslabel("projekt", p.get("status"))) if x),
				"href": f"/portal/projekte/{p.get('id')}",
				"felder": [p.get("titel"), p.get("id"), p.get("region"), _name(p.get("anbieter")) if admin else ""],
			}
			for p in als(projekt.liste, alle=admin)
		])
	quellen.append([
		{
			"art": "vorgang", "id": x.get("id"), "titel": f"{VORGANG_TYPEN.get(x.get('typ'), 'Anfrage')} · {x.get('id')}",
			"untertitel": " · ".join(y for y in ((_name(x.get("kontakt")) if admin else None), _statuslabel("vorgang", x.get("status"))) if y),
			"href": f"/portal/admin/vorgaenge/{x.get('id')}" if admin else f"/portal/anfragen/{x.get('id')}",
			"felder": [VORGANG_TYPEN.get(x.get("typ")), x.get("id")] + ([_name(x.get("kontakt")), (x.get("kontakt") or {}).get("firma"), (x.get("kontakt") or {}).get("email")] if admin else []),
		}
		for x in als(vorgang.liste, alle=admin)
	])
	quellen.append([
		{
			"art": "nachricht", "id": f"{t.get('bezugArt')}:{t.get('bezugId')}", "titel": t.get("titel") or "Unterhaltung",
			"untertitel": str((t.get("letzte") or {}).get("text") or "")[:90],
			"href": f"/portal/nachrichten?bezug={t.get('bezugArt')}:{t.get('bezugId')}",
			"felder": [t.get("titel"), t.get("bezugId"), (t.get("letzte") or {}).get("text")],
		}
		for t in als(nachricht.threads)
	])
	if hat_rolle(n, ["investor"]):
		b = als(boerse.liste)
		quellen.append([
			{
				"art": "boerse", "id": p.get("id"), "titel": p.get("titel"),
				"untertitel": " · ".join(x for x in (PROJEKT_TYPEN.get(p.get("typ")), _mwp(p.get("mwp")), p.get("land")) if x),
				"href": f"/portal/boerse/{p.get('id')}",
				"felder": [p.get("titel"), p.get("id"), p.get("region"), p.get("land")],
			}
			for p in ((b or {}).get("projekte") if isinstance(b, dict) else []) or []
		])
	if admin:
		quellen.append([
			{
				"art": "nutzer", "id": u.get("id"), "titel": _name(u) or u.get("email"),
				"untertitel": " · ".join(x for x in (u.get("email"), u.get("firma")) if x),
				"href": f"/portal/admin/nutzer?q={u.get('email')}",
				"felder": [_name(u), u.get("email"), u.get("firma"), u.get("id")],
			}
			for u in als(admin_api.nutzer_liste)
		])

	# zurück in den Nutzer (wie jede andere Methode)
	frappe.set_user(api_user)
	nutzer(als_benutzer)
	treffer = []
	for liste in quellen:
		for e in _rangieren(liste, anfrage, max_je_art):
			if PORTAL_PFAD.match(str(e.get("href") or "")):
				e.pop("felder", None)
				treffer.append(e)
	return {"q": anfrage, "treffer": treffer}


# ================================================================ Onboarding


def onboarding_leer():
	return {"status": "neu", "schritt": 0, "erledigt": [], "checklisteAus": False, "aktualisiertAm": None}


def onboarding_bereinigen(roh, basis=None):
	basis = basis or onboarding_leer()
	o = roh if isinstance(roh, dict) else {}
	status = o.get("status") if o.get("status") in ONBOARDING_STATUS else basis["status"]
	schritt = o.get("schritt")
	schritt = schritt if isinstance(schritt, int) and not isinstance(schritt, bool) and 0 <= schritt < ONBOARDING_SCHRITTE else basis["schritt"]
	erledigt = o.get("erledigt")
	erledigt = list(dict.fromkeys(x for x in erledigt if x in ONBOARDING_MERKER)) if isinstance(erledigt, list) else list(basis["erledigt"])
	aus = o.get("checklisteAus")
	aus = aus if isinstance(aus, bool) else basis["checklisteAus"]
	return {"status": status, "schritt": schritt, "erledigt": erledigt, "checklisteAus": aus, "aktualisiertAm": basis.get("aktualisiertAm")}


@frappe.whitelist(methods=["POST"])
def onboarding(als_benutzer=None):
	n = nutzer(als_benutzer)
	roh = aus_json(frappe.db.get_value("Plattform Konto", n.id, "onboarding"))
	if not roh:
		return onboarding_leer()
	z = onboarding_bereinigen(roh)
	z["aktualisiertAm"] = roh.get("aktualisiertAm") if isinstance(roh, dict) else None
	return z


@frappe.whitelist(methods=["POST"])
def onboarding_speichern(daten=None, als_benutzer=None):
	"""Nur das eigene Konto. `erledigt` wird ergänzt (nie entfernt), Status nie von „erledigt“ zurück auf „neu“."""
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else {}
	konto = frappe.get_doc("Plattform Konto", n.id)
	alt = onboarding_bereinigen(aus_json(konto.get("onboarding")))
	zusatz = d.get("erledigt") if isinstance(d.get("erledigt"), list) else []
	neu = onboarding_bereinigen({**alt, **{k: d[k] for k in ("status", "schritt", "checklisteAus") if k in d}, "erledigt": alt["erledigt"] + zusatz}, alt)
	if alt["status"] == "erledigt" and neu["status"] == "neu":
		neu["status"] = "erledigt"
	neu["aktualisiertAm"] = jetzt_iso()
	konto.onboarding = als_json(neu)
	konto.save(ignore_permissions=True)
	if neu["status"] != alt["status"] and neu["status"] in ("erledigt", "uebersprungen"):
		protokoll(n, "onboarding", "nutzer", konto.name, "Einstieg abgeschlossen" if neu["status"] == "erledigt" else "Einstieg übersprungen")
	return neu
