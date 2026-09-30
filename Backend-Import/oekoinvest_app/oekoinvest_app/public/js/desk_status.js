// Copyright (c) 2026, ÖkoInvest GmbH
//
// Statuswechsel im Desk über den Zustandsautomaten der App (nicht über Frappe-Workflows).
// Eingebunden per hooks.doctype_js für Vorgang, Fläche, Projekt, Interesse, Provision.
// Die Prüfung (Rolle, Automat, Pflichtangaben, Bedingungen) und alle Nebenwirkungen passieren serverseitig in
// oekoinvest_app.plattform.desk.wechseln – dieses Skript zeigt nur die erlaubten Schritte als Knöpfe an.

frappe.provide("oekoinvest");

oekoinvest.status_knoepfe = function (frm) {
	if (frm.is_new()) return;
	frappe
		.call({
			method: "oekoinvest_app.plattform.desk.aktionen",
			args: { doctype: frm.doctype, name: frm.doc.name },
		})
		.then((r) => {
			(r.message || []).forEach((a) => {
				const knopf = frm.add_custom_button(__(a.aktion), () => oekoinvest.status_dialog(frm, a), __("Status"));
				if (a.gefahr && knopf) knopf.addClass("text-danger");
			});
		});
	frm.set_intro(
		__("Statuswechsel bitte über „Status“ oben rechts – so entstehen Statusverlauf, Nachricht an den Nutzer und Protokoll."),
		"blue"
	);
};

oekoinvest.status_dialog = function (frm, a) {
	const ausfuehren = (werte) =>
		frappe
			.call({
				method: "oekoinvest_app.plattform.desk.wechseln",
				args: { doctype: frm.doctype, name: frm.doc.name, nach: a.nach, angaben: werte || {} },
				freeze: true,
				freeze_message: __("Status wird geändert …"),
			})
			.then(() => {
				frappe.show_alert({ message: __("Status: {0}", [__(a.nachLabel)]), indicator: "green" });
				frm.reload_doc();
			});

	if (!a.felder || !a.felder.length) {
		frappe.confirm(__("Schritt „{0}“ ausführen? Neuer Status: {1}", [__(a.aktion), __(a.nachLabel)]), () => ausfuehren());
		return;
	}
	const d = new frappe.ui.Dialog({
		title: __(a.aktion),
		fields: a.felder,
		primary_action_label: __("Ausführen"),
		primary_action(werte) {
			d.hide();
			ausfuehren(werte);
		},
	});
	d.show();
};

// Die Datei wird je DocType-Formular geladen – Handler nur einmal je DocType registrieren (sonst doppelte Knöpfe).
oekoinvest._status_registriert = oekoinvest._status_registriert || {};
["Plattform Vorgang", "Plattform Flaeche", "Plattform Projekt", "Plattform Interesse", "Plattform Provision"].forEach((dt) => {
	if (oekoinvest._status_registriert[dt]) return;
	oekoinvest._status_registriert[dt] = true;
	frappe.ui.form.on(dt, {
		refresh(frm) {
			oekoinvest.status_knoepfe(frm);
		},
	});
});
