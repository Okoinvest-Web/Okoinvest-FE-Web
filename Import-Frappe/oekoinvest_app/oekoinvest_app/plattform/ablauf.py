# Copyright (c) 2026, ÖkoInvest GmbH
#
# Statuswechsel mit Nebenwirkungen (docs/API.md, Abschnitt 4) – Port von uebergangAnwenden/systemWechsel
# aus src/lib/plattform/backend/demo.js. Die Prüfung (pruefe_uebergang) passiert VOR dem Aufruf.
#
# Nebenwirkungen:
#  1. statusVerlauf + System-Nachricht „Status: „alt“ → „neu“. <kommentar|grund>“ (außer Provision)
#  2. grund → ablehn_grund
#  3. Interesse → loi_angenommen: Projekt veroeffentlicht → reserviert (system)
#  4. Projekt → verkauft: Provision + Käufer-Interesse abgeschlossen + übrige Interessen abgelehnt
#     (im Controller des Projekts, damit es auch bei Pflege im Desk greift – siehe verkauf_abschliessen)
#  5. Projekt → veroeffentlicht: veroeffentlicht_am einmalig, passende Investoren benachrichtigen
#  6. Dokument-Upload: System-Nachricht (in api/dokument.py)

import frappe
from frappe.utils import cint, flt

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import (
	als_json,
	aus_json,
	jetzt,
	jetzt_iso,
	nachricht_anlegen,
	protokoll,
	verlauf,
)
from oekoinvest_app.plattform.konstanten import PROVISION_MAX, PROVISION_MIN, ROLLE_FUER_TYP
from oekoinvest_app.plattform.matching import matching
from oekoinvest_app.plattform.prozesse import PROZESSE, status_label


def _js_round(x):
	import math

	return int(math.floor(x + 0.5))


def provision_satz_normalisieren(wert):
	"""Eingabe > 0,2 wird als Prozent interpretiert (2 → 0,02). Liefert Satz oder wirft ValidationError."""
	satz = v.zahl(wert, min=0, max=100)
	if satz is not None and satz > 0.2:
		satz = satz / 100
	v.pflicht(
		satz is not None and PROVISION_MIN - 1e-9 <= satz <= PROVISION_MAX + 1e-9,
		f"Provisionssatz muss zwischen {PROVISION_MIN * 100:g} und {PROVISION_MAX * 100:g} % liegen.".replace(".", ","),
	)
	return round(satz, 4)


def uebergang_anwenden(n, art, o, nach, als, extra=None, ip=""):
	"""Geprüften Übergang auf Dokument `o` anwenden und speichern (inkl. Nebenwirkungen)."""
	extra = extra if isinstance(extra, dict) else {}
	von = o.status
	kommentar = v.mehrzeilig(extra.get("grund") or extra.get("kommentar") or "", 1000)

	if extra.get("grund"):
		o.ablehn_grund = kommentar

	if art == "flaeche" and nach == "pachtangebot":
		pa = extra.get("pachtangebot") if isinstance(extra.get("pachtangebot"), dict) else {}
		euro = v.zahl(pa.get("euroProHaJahr"), min=50, max=50000)
		jahre = v.zahl(pa.get("laufzeitJahre"), min=1, max=60)
		v.pflicht(euro is not None and jahre is not None, "Pachtangebot: Pacht je ha und Laufzeit angeben.")
		o.pachtangebot = als_json(
			{
				"euroProHaJahr": euro,
				"laufzeitJahre": jahre,
				"verlaengerung": v.text(pa.get("verlaengerung"), 80),
				"text": v.mehrzeilig(pa.get("text"), 2000),
				"am": jetzt_iso(),
			}
		)

	if art == "projekt" and nach == "veroeffentlicht":
		o.provision_satz = provision_satz_normalisieren(extra.get("provisionSatz"))
		if not o.veroeffentlicht_am:
			o.veroeffentlicht_am = jetzt()

	if art == "interesse" and nach == "loi_abgegeben":
		loi = extra.get("loi") if isinstance(extra.get("loi"), dict) else {}
		t = v.mehrzeilig(loi.get("text"), 3000)
		v.pflicht(len(t) >= 10, "Bitte beschreiben Sie Ihre Absichtserklärung (mind. 10 Zeichen).")
		o.loi = als_json(
			{
				"betrag": v.zahl(loi.get("betrag"), min=0, max=1e10),
				"text": t,
				"bedingungen": v.mehrzeilig(loi.get("bedingungen"), 2000),
				"gueltigBis": v.text(loi.get("gueltigBis"), 10),
				"am": jetzt_iso(),
			}
		)

	if art == "projekt" and nach == "verkauft":
		kaeufer_id = v.kennung(extra.get("interesseId"))
		kaeufer = frappe.db.get_value("Plattform Interesse", kaeufer_id, ["name", "projekt_id", "status"], as_dict=True) if kaeufer_id else None
		v.pflicht(
			kaeufer and kaeufer.projekt_id == o.name and kaeufer.status in ("nda_freigegeben", "loi_abgegeben", "loi_angenommen"),
			"Käufer muss ein Interessent mit freigegebenem Datenraum sein.",
		)
		kaufpreis = v.zahl(extra.get("kaufpreis"), min=1, max=1e11)
		v.pflicht(kaufpreis, "Bitte Kaufpreis angeben.")
		o.kaeufer_interesse_id = kaeufer.name
		o.kaufpreis = kaufpreis

	o.status = nach
	verlauf(o, nach, n, als, kommentar)
	o.flags.plattform_uebergang = (von, nach)
	o.flags.plattform_nutzer = n
	o.flags.plattform_ip = ip
	o.save(ignore_permissions=True)

	if art == "projekt" and nach == "veroeffentlicht":
		investoren_benachrichtigen(o)

	if art == "interesse" and nach == "loi_angenommen":
		p = frappe.get_doc("Plattform Projekt", o.projekt_id)
		if p.status == "veroeffentlicht":
			system_wechsel("projekt", p, "reserviert", "LOI eines Investors angenommen.")

	if art != "provision":
		text = f"Status: „{status_label(art, von)}“ → „{status_label(art, nach)}“." + (f" {kommentar}" if kommentar else "")
		if als == "eigentuemer":
			nachricht_anlegen(art, o.name, von_id=n.get("id") if n else None, von_admin=False, system=True, text=text, gelesen_nutzer=True, gelesen_admin=False)
		else:
			nachricht_anlegen(art, o.name, von_id=n.get("id") if n else None, von_admin=(als == "admin"), system=True, text=text)

	protokoll(n, "status", art, o.name, f"{status_label(art, von)} → {status_label(art, nach)}", ip)
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: Automationen

	backoffice_ereignis("status", art, o, von=von, nach=nach)
	return o


def system_wechsel(art, o, nach, kommentar):
	"""Automatischer Übergang (wer = system bzw. admin-Übergang ohne Pflichtangaben) mit Nachricht."""
	von = o.status
	erlaubt = any(u["nach"] == nach and von in u["von"] and u["wer"] in ("system", "admin") for u in PROZESSE[art]["uebergaenge"])
	if not erlaubt:
		return False
	o.status = nach
	verlauf(o, nach, None, "system", kommentar)
	if art == "interesse" and nach == "abgelehnt":
		o.ablehn_grund = kommentar
	o.flags.plattform_uebergang = (von, nach)
	o.save(ignore_permissions=True)
	nachricht_anlegen(art, o.name, von_admin=True, system=True, text=f"Status: „{status_label(art, von)}“ → „{status_label(art, nach)}“. {kommentar}")
	from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: Automationen

	backoffice_ereignis("status", art, o, von=von, nach=nach)
	return True


def verkauf_abschliessen(projekt):
	"""Nebenwirkung Projekt → verkauft (aus PlattformProjekt.on_update): Provision + Interessen."""
	if frappe.db.exists("Plattform Provision", {"projekt_id": projekt.name}):
		return None
	kaeufer = frappe.get_doc("Plattform Interesse", projekt.kaeufer_interesse_id)
	satz = flt(projekt.provision_satz) or PROVISION_MIN
	kaufpreis = flt(projekt.kaufpreis)
	pv = frappe.get_doc(
		{
			"doctype": "Plattform Provision",
			"projekt_id": projekt.name,
			"anbieter_id": projekt.anbieter_id,
			"investor_id": kaeufer.investor_id,
			"interesse_id": kaeufer.name,
			"kaufpreis": kaufpreis,
			"satz": satz,
			"betrag": _js_round(kaufpreis * satz),
			"status": "offen",
		}
	)
	verlauf(pv, "offen", None, "system", "Automatisch bei Verkauf berechnet.")
	pv.insert(ignore_permissions=True)

	for name in frappe.get_all("Plattform Interesse", filters={"projekt_id": projekt.name}, pluck="name"):
		i = frappe.get_doc("Plattform Interesse", name)
		if i.name == kaeufer.name:
			system_wechsel("interesse", i, "abgeschlossen", "Kauf abgeschlossen.")
		elif i.status not in ("abgelehnt", "abgeschlossen"):
			system_wechsel("interesse", i, "abgelehnt", "Projekt anderweitig verkauft.")

	n = projekt.flags.get("plattform_nutzer")
	protokoll(
		n,
		"provision",
		"provision",
		pv.name,
		f"Provision {cint(pv.betrag)} € ({flt(satz) * 100:g} %) für {projekt.name}",
		projekt.flags.get("plattform_ip") or "",
	)
	return pv


def investoren_benachrichtigen(p):
	"""Suchprofil-Alarm: neu veröffentlicht → Investoren mit `benachrichtigen` und Score ≥ eigener Schwelle (Standard 70)
	erhalten System-Nachricht, Benachrichtigung (Glocke) und – je nach Einstellung – eine E-Mail (öffentlicher Titel + Passung)."""
	from oekoinvest_app.plattform import benachrichtigung
	from oekoinvest_app.plattform.konstanten import SUCHPROFIL_SCHWELLE

	from oekoinvest_app.plattform.ausgabe import projekt_json

	pj = projekt_json(p)
	konten = frappe.get_all(
		"Plattform Konto",
		filters={"aktiv": 1, "name": ("!=", p.anbieter_id)},
		fields=["name", "suchprofil"],
		limit_page_length=0,
	)
	investoren = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": "investor", "parenttype": "Plattform Konto"}, pluck="parent"))
	bereits = set()  # je Person höchstens ein Alarm (persönlich vor Team-Suchprofil)
	for k in konten:
		if k.name not in investoren:
			continue
		profil = aus_json(k.suchprofil) or {}
		if not profil.get("benachrichtigen"):
			continue
		m = matching(pj, profil)
		schwelle = v.zahl(profil.get("schwelle"), min=SUCHPROFIL_SCHWELLE["min"], max=SUCHPROFIL_SCHWELLE["max"]) or SUCHPROFIL_SCHWELLE["standard"]
		if m["score"] < schwelle:
			continue
		bereits.add(k.name)
		nachricht_anlegen(
			"nutzer",
			k.name,
			von_admin=True,
			system=True,
			text=f"Neues Projekt passend zu Ihrem Suchprofil ({m['score']} % Passung): {p.titel}. Zum Exposé: /portal/boerse/{p.name}",
			melden=False,
		)
		benachrichtigung.anlegen(
			k.name,
			"suchprofil",
			f"Passendes Projekt: {p.titel}",
			f"{m['score']} % Passung" + (f" · {', '.join(m['gruende'])}" if m.get("gruende") else ""),
			f"/portal/boerse/{p.name}",
			"projekt",
			p.name,
			mail_text=f"In der Projektbörse wurde ein Projekt veröffentlicht, das zu Ihrem Suchprofil passt ({m['score']} % Passung): „{p.titel}“. Vertrauliche Angaben und Datenraum sehen Sie nach Klick-NDA im Portal.",
		)
		protokoll(None, "suchprofil_treffer", "projekt", p.name, f"Suchprofil-Treffer für {k.name} ({m['score']} %)")
		from oekoinvest_app.plattform.backoffice import backoffice_ereignis  # Backoffice: Automationen

		backoffice_ereignis("suchprofil", "projekt", p, extra={"score": m["score"], "investorId": k.name})
	# Team-Suchprofile der Organisationen (Login, Sicherheit & Teams)
	from oekoinvest_app.plattform.organisation import organisations_alarm

	organisations_alarm(p, pj, bereits)


# ================================================================ Konto-Verknüpfung


def verknuepfen(konto):
	"""Offene Anfragen mit gleicher (bestätigter) E-Mail dem Konto zuordnen, Rolle ergänzen, Flächen übernehmen."""
	if not cint(konto.email_bestaetigt):
		return 0
	anzahl = 0
	rollen = [r.rolle for r in (konto.get("rollen") or [])]
	neu = []
	for vg in frappe.get_all(
		"Plattform Vorgang",
		filters={"email": konto.email, "nutzer_id": ("is", "not set")},
		fields=["name", "typ", "flaeche_id"],
	):
		frappe.db.set_value("Plattform Vorgang", vg.name, "nutzer_id", konto.name, update_modified=False)
		anzahl += 1
		rolle = ROLLE_FUER_TYP.get(vg.typ)
		if rolle and vg.typ != "kontakt" and rolle not in rollen and rolle not in neu:
			neu.append(rolle)
		if vg.flaeche_id and not frappe.db.get_value("Plattform Flaeche", vg.flaeche_id, "nutzer_id"):
			frappe.db.set_value("Plattform Flaeche", vg.flaeche_id, "nutzer_id", konto.name, update_modified=False)
	if neu:
		for r in neu:
			konto.append("rollen", {"rolle": r})
		konto.save(ignore_permissions=True)
	return anzahl

