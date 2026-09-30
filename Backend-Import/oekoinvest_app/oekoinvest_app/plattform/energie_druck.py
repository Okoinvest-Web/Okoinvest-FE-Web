# Copyright (c) 2026, ÖkoInvest GmbH
#
# Jinja-Hilfen der Energiebeschaffung für die Druckformate „Angebotsvergleich Energie“ und „Zuschlagsschreiben Energie“
# (registriert in hooks.py → jinja.methods). Nur Lesezugriff; Rechte prüft der Desk (DocPerm auf Plattform Ausschreibung).


def oekoinvest_energie_vergleich(ausschreibung_id):
	"""Normierter Angebotsvergleich einer Ausschreibung: {zeilen[] mit Versorgername, ctx, bester, zuschlag, produkte}."""
	import frappe

	from oekoinvest_app.plattform import energie_kern as ek
	from oekoinvest_app.plattform.api.energie import A, _kurve, _lf_name, _vergleich
	from oekoinvest_app.plattform.kern import aus_json

	if not ausschreibung_id or not frappe.db.exists(A, ausschreibung_id):
		return {"zeilen": [], "ctx": {}, "bester": None, "zuschlag": None, "produkte": {}}
	a = frappe.get_doc(A, ausschreibung_id)
	vg = _vergleich(a, _kurve())
	produkte = {p["id"]: p for p in aus_json(a.produkte, []) or []}
	arten = {"fix": "Festpreis", "tranchen": "Tranchenmodell", "spot": "Spot-Index + Aufschlag"}
	for z in vg["zeilen"]:
		p = produkte.get(z["produktId"]) or {}
		z["lieferant"] = _lf_name(z["lieferantId"])
		z["produkt"] = f"{arten.get(p.get('art'), p.get('art'))}, {p.get('laufzeitJahre', 1)} J.{' Grünstrom' if p.get('gruen') else ''}"
	zs = aus_json(a.zuschlag, None)
	if zs and zs.get("angebotId"):
		g = frappe.db.get_value("Plattform Lieferantenangebot", zs["angebotId"], ["lieferant_id", "positionen", "bindefrist_bis", "zahlungsziel_tage", "sicherheit"], as_dict=True)
		if g:
			zs["lieferant"] = _lf_name(g.lieferant_id)
			zs["position"] = next((x for x in aus_json(g.positionen, []) or [] if x.get("produktId") == zs.get("produktId")), {})
			zs["bindefrist"] = g.bindefrist_bis
			zs["zahlungsziel"] = g.zahlungsziel_tage
			zs["sicherheit"] = g.sicherheit
			zs["produkt"] = (produkte.get(zs.get("produktId")) or {})
	return {"zeilen": vg["zeilen"], "ctx": vg["ctx"], "bester": vg["bester"], "zuschlag": zs, "produkte": produkte, "los": ek.los_kennzeichen(a.name), "szenarien": vg["szenarien"]}
