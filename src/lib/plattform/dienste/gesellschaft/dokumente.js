// src/lib/plattform/dienste/gesellschaft/dokumente.js
//
// Dokumentenpaket des Gründungsassistenten (reine Funktion, client- und serverseitig): liefert strukturierte
// Dokumente [{ id, titel, untertitel, abschnitte: [{ titel?, text?, liste?, tabelle? }] }], aus denen server/pdf.js
// ein PDF setzt (Frappe: Jinja-Druckformat „Projektgesellschaft Gründungspaket“ mit gleicher Gliederung).
//
// ALLE Dokumente sind MUSTER zur Prüfung und Anpassung durch das Notariat bzw. die Rechtsberatung. Sie ersetzen weder
// die notarielle Urkunde noch eine Rechtsberatung; Paragrafenangaben nach aktuellem Stand, vor Verwendung prüfen.

import { RECHTSFORMEN, gegenstandVorlage, musterprotokollMoeglich } from "./rechtsformen";

export const MUSTER_HINWEIS = "MUSTER – Entwurf zur Prüfung und Beurkundung durch das Notariat. Keine Rechtsberatung. Vor Verwendung an den Einzelfall anpassen.";

const zahl = (n, w = "EUR") => `${Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${w === "EUR" ? "€" : w}`;
const datum = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "__________");
const leer = (s, ersatz = "__________") => (String(s || "").trim() ? String(s).trim() : ersatz);
const personZeile = (p) => [leer(p.name), p.geburtsdatum ? `geb. ${datum(p.geburtsdatum)}` : "geb. __________", leer(p.anschrift, "Anschrift __________")].join(", ");

function kerndaten(g, rf) {
  return [
    ["Firma", g.name],
    ["Rechtsform", rf.label],
    ["Sitz", `${leer(g.sitz)}${g.bundesland ? ` (${g.bundesland})` : ""}`],
    ["Geschäftsanschrift", leer(g.anschrift)],
    ["Stammkapital", rf.kapital || g.stammkapital ? zahl(g.stammkapital, rf.waehrung) : "– (Personengesellschaft)"],
    ["Bei Gründung eingezahlt", zahl(g.einzahlung, rf.waehrung)],
    ["Geschäftsjahr", g.bilanzstichtag && g.bilanzstichtag !== "12-31" ? `endet am ${g.bilanzstichtag.split("-").reverse().join(".")}` : "Kalenderjahr"],
    ["Projekt", g.projekt ? `${g.projekt.titel} (${g.projekt.id})` : "–"],
  ];
}

function gesellschafterTabelle(g, rf) {
  return {
    kopf: ["Nr.", "Gesellschafter", rf.komplementaer ? "Haftsumme / Einlage" : "Stammeinlage", "Anteil"],
    zeilen: (g.gesellschafter || []).map((x, i) => [String(i + 1), `${leer(x.name)}${x.register ? `, ${x.register}` : ""}${x.sitz ? `, ${x.sitz}` : ""}`, zahl(x.einlage, rf.waehrung), `${Number(x.anteil || 0).toLocaleString("de-DE")} %`]),
  };
}

const gf = (g) => (g.geschaeftsfuehrung || []).filter((x) => String(x.name || "").trim());
const vertretung = (g) => (gf(g).length > 1 ? "Sind mehrere Geschäftsführer bestellt, wird die Gesellschaft durch zwei Geschäftsführer gemeinsam oder durch einen Geschäftsführer gemeinsam mit einem Prokuristen vertreten. Die Gesellschafterversammlung kann Einzelvertretung erteilen." : "Ist nur ein Geschäftsführer bestellt, vertritt er die Gesellschaft allein.");

/** Wirtschaftliche Eigentümer (Meldedaten): natürliche Personen ≥ 25 %, juristische Personen → Durchsicht */
function eigentuemer(g) {
  const z = [];
  for (const x of g.gesellschafter || []) {
    const anteil = Number(x.anteil || 0);
    if (x.art === "person" && anteil > 25) z.push([leer(x.name), x.geburtsdatum ? datum(x.geburtsdatum) : "__________", leer(x.wohnsitzLand, "__"), `direkt, ${anteil.toLocaleString("de-DE")} %`]);
    else if (x.art !== "person" && anteil > 25) z.push([`Durchsicht auf ${leer(x.name)}`, "–", "–", `indirekt über ${anteil.toLocaleString("de-DE")} % – wirtschaftliche Eigentümer des Gesellschafters ergänzen`]);
  }
  if (!z.length) z.push(["Kein Gesellschafter über 25 % – oberste Führungsebene (Geschäftsführung) als wirtschaftliche Eigentümer melden", "", "", ""]);
  return { kopf: ["Name", "Geburtsdatum", "Wohnsitzland", "Art und Umfang"], zeilen: z };
}

// ---------------------------------------------------------------- Einzeldokumente

function deckblatt(g, rf) {
  return {
    id: "uebersicht", titel: "Gründungspaket – Übersicht", untertitel: g.name,
    abschnitte: [
      { text: `Dieses Paket fasst die Angaben für die Gründung der Projektgesellschaft zusammen. ${MUSTER_HINWEIS}` },
      { titel: "Kerndaten", tabelle: { kopf: ["Angabe", "Wert"], zeilen: kerndaten(g, rf) } },
      { titel: "Gesellschafter", tabelle: gesellschafterTabelle(g, rf) },
      { titel: "Geschäftsführung", liste: gf(g).map(personZeile) },
      ...(rf.komplementaer ? [{ titel: "Komplementärin", text: `${leer(g.komplementaer?.name)}${g.komplementaer?.register ? `, ${g.komplementaer.register}` : ""} – persönlich haftende Gesellschafterin ohne Kapitalanteil.` }] : []),
      { titel: "Form und Kapital", text: `${rf.beurkundung}. ${rf.einzahlungText}` },
      { titel: "Checkliste", liste: (g.schritte || []).map((s) => `[${s.status === "erledigt" ? "x" : s.status === "entfaellt" ? "–" : " "}] ${s.label}${s.pflicht ? "" : " (optional)"}`) },
    ],
  };
}

function atVertrag(g, rf) {
  const einer = (g.gesellschafter || []).length === 1;
  return {
    id: "vertrag", titel: einer ? "Erklärung über die Errichtung der Gesellschaft" : "Gesellschaftsvertrag", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { titel: "§ 1 Firma und Sitz", text: `Die Firma der Gesellschaft lautet „${g.name}“. Sitz der Gesellschaft ist ${leer(g.sitz)}.` },
      { titel: "§ 2 Gegenstand des Unternehmens", text: g.gegenstand || gegenstandVorlage({ land: "AT", typ: g.projekt?.typ, ort: g.projekt?.gemeinde }) },
      { titel: "§ 3 Stammkapital und Stammeinlagen", text: `Das Stammkapital beträgt ${zahl(g.stammkapital)}. ${einer ? "Die Stammeinlage wird zur Gänze von der Gründungsgesellschafterin übernommen" : "Die Stammeinlagen werden wie folgt übernommen"}; auf jede Stammeinlage wird bei Errichtung mindestens ein Viertel, insgesamt mindestens ${zahl(Math.max(rf.einzahlung, g.einzahlung || 0))} in bar eingezahlt.` },
      { tabelle: gesellschafterTabelle(g, rf) },
      { titel: "§ 4 Geschäftsführung und Vertretung", text: `Die Gesellschaft hat einen oder mehrere Geschäftsführer. ${vertretung(g)} Zu Geschäftsführern werden bestellt: ${gf(g).map((x) => x.name).join(", ") || "__________"}.` },
      { titel: "§ 5 Geschäftsjahr", text: g.bilanzstichtag && g.bilanzstichtag !== "12-31" ? `Das Geschäftsjahr endet am ${g.bilanzstichtag.split("-").reverse().join(".")} eines jeden Jahres.` : "Das Geschäftsjahr ist das Kalenderjahr. Das erste Geschäftsjahr ist ein Rumpfgeschäftsjahr." },
      { titel: "§ 6 Gesellschafterbeschlüsse", text: "Beschlüsse werden mit einfacher Mehrheit gefasst, soweit Gesetz oder dieser Vertrag nichts anderes bestimmen; Umlaufbeschlüsse sind zulässig." },
      ...(einer ? [] : [{ titel: "§ 7 Übertragung von Geschäftsanteilen", text: "Die Übertragung von Geschäftsanteilen bedarf der Zustimmung der Gesellschafterversammlung; den übrigen Gesellschaftern steht ein Aufgriffsrecht zu (Ausgestaltung durch das Notariat)." }]),
      { titel: `§ ${einer ? 7 : 8} Gründungskosten`, text: "Die Kosten der Gründung (Notar, Gerichtsgebühren, Bank) trägt die Gesellschaft bis zu einem Betrag von __________ €; darüber hinausgehende Kosten tragen die Gesellschafter." },
      { titel: "Form", text: "Die Errichtung erfolgt in Form eines Notariatsakts (Präsenz oder elektronisch per Videoübertragung nach § 69b NO)." },
    ],
  };
}

function deVertrag(g, rf) {
  if (musterprotokollMoeglich(g) && g.musterprotokoll) {
    return {
      id: "vertrag", titel: "Musterprotokoll (Anlage 1 zu § 2 Abs. 1a GmbHG) – Datenblatt", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
      abschnitte: [
        { text: "Das Musterprotokoll ist gesetzlich vorgegeben und darf inhaltlich nicht verändert werden; das Notariat setzt die folgenden Angaben ein. Voraussetzung: höchstens drei Gesellschafter, ein Geschäftsführer, Bargründung." },
        { tabelle: { kopf: ["Angabe", "Wert"], zeilen: [["Firma", g.name], ["Sitz", leer(g.sitz)], ["Gegenstand", g.gegenstand || gegenstandVorlage({ land: "DE", typ: g.projekt?.typ })], ["Stammkapital", zahl(g.stammkapital)], ["Geschäftsführer (befreit von § 181 BGB)", gf(g)[0]?.name || "__________"], ["Einzahlung", `${zahl(g.einzahlung)} (mindestens die Hälfte je Anteil bzw. voll bei UG)`]] } },
        { tabelle: gesellschafterTabelle(g, rf) },
      ],
    };
  }
  return {
    id: "vertrag", titel: "Gesellschaftsvertrag (Satzung)", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { titel: "§ 1 Firma, Sitz", text: `Die Firma der Gesellschaft lautet „${g.name}“. Sitz der Gesellschaft ist ${leer(g.sitz)}.` },
      { titel: "§ 2 Gegenstand", text: g.gegenstand || gegenstandVorlage({ land: "DE", typ: g.projekt?.typ, ort: g.projekt?.gemeinde }) },
      { titel: "§ 3 Stammkapital, Geschäftsanteile", text: `Das Stammkapital beträgt ${zahl(g.stammkapital)}. Es ist eingeteilt in Geschäftsanteile mit den laufenden Nummern 1 bis ${(g.gesellschafter || []).length}. Die Einlagen sind in Geld zu erbringen, ${rf.kapital === 1 ? "und zwar sofort in voller Höhe" : "und zwar sofort zur Hälfte, im Übrigen auf Anforderung der Geschäftsführung"}.` },
      { tabelle: gesellschafterTabelle(g, rf) },
      { titel: "§ 4 Geschäftsführung, Vertretung", text: `${vertretung(g)} Die Gesellschafterversammlung kann Geschäftsführer von den Beschränkungen des § 181 BGB befreien.` },
      { titel: "§ 5 Geschäftsjahr, Jahresabschluss", text: "Geschäftsjahr ist das Kalenderjahr. Der Jahresabschluss ist innerhalb der gesetzlichen Fristen aufzustellen und offenzulegen." },
      { titel: "§ 6 Verfügung über Geschäftsanteile", text: "Die Abtretung und Belastung von Geschäftsanteilen bedarf der Zustimmung der Gesellschafterversammlung." },
      ...(rf.kapital === 1 ? [{ titel: "§ 7 Gesetzliche Rücklage", text: "In der Bilanz ist eine gesetzliche Rücklage zu bilden, in die ein Viertel des um einen Verlustvortrag geminderten Jahresüberschusses einzustellen ist (§ 5a Abs. 3 GmbHG)." }] : []),
      { titel: `§ ${rf.kapital === 1 ? 8 : 7} Gründungsaufwand`, text: "Die Gesellschaft trägt die Kosten der Gründung bis zu einem Betrag von __________ €." },
      { titel: "Form", text: "Notarielle Beurkundung (§ 2 GmbHG) – in Präsenz oder online über das Videokommunikationssystem der Bundesnotarkammer." },
    ],
  };
}

function kgVertrag(g, rf) {
  return {
    id: "vertrag", titel: "Gesellschaftsvertrag der Kommanditgesellschaft", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { titel: "§ 1 Firma, Sitz", text: `Die Firma lautet „${g.name}“. Sitz ist ${leer(g.sitz)}.` },
      { titel: "§ 2 Gegenstand", text: g.gegenstand || gegenstandVorlage({ land: "DE", typ: g.projekt?.typ, ort: g.projekt?.gemeinde }) },
      { titel: "§ 3 Gesellschafter", text: `Persönlich haftende Gesellschafterin (Komplementärin) ohne Kapitalanteil ist die ${leer(g.komplementaer?.name)}${g.komplementaer?.register ? ` (${g.komplementaer.register})` : ""}. Kommanditisten sind die nachfolgend genannten Gesellschafter mit den angegebenen Hafteinlagen (Haftsummen).` },
      { tabelle: gesellschafterTabelle(g, rf) },
      { titel: "§ 4 Geschäftsführung und Vertretung", text: `Zur Geschäftsführung und Vertretung ist allein die Komplementärin berechtigt und verpflichtet, handelnd durch ihre Geschäftsführer (${gf(g).map((x) => x.name).join(", ") || "__________"}). Sie ist von den Beschränkungen des § 181 BGB befreit.` },
      { titel: "§ 5 Konten der Gesellschafter", text: "Für jeden Kommanditisten werden ein festes Kapitalkonto (Pflichteinlage), ein Verlustvortragskonto und ein Verrechnungskonto geführt." },
      { titel: "§ 6 Ergebnisverteilung", text: "Die Komplementärin erhält eine Haftungsvergütung und Auslagenersatz; im Übrigen wird das Ergebnis im Verhältnis der festen Kapitalkonten verteilt." },
      { titel: "§ 7 Haftungsbeschränkung", text: "Die Kommanditisten treten der Gesellschaft unter der aufschiebenden Bedingung ihrer Eintragung im Handelsregister bei (Schutz vor unbeschränkter Haftung nach § 176 HGB)." },
      { titel: "Form", text: "Der Vertrag bedarf keiner notariellen Beurkundung; die Anmeldung zum Handelsregister ist von allen Gesellschaftern in öffentlich beglaubigter Form zu unterzeichnen." },
    ],
  };
}

function chStatuten(g, rf) {
  return {
    id: "vertrag", titel: "Statuten der Gesellschaft mit beschränkter Haftung", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { titel: "Art. 1 Firma und Sitz", text: `Unter der Firma „${g.name}“ besteht eine Gesellschaft mit beschränkter Haftung gemäss Art. 772 ff. OR mit Sitz in ${leer(g.sitz)}.` },
      { titel: "Art. 2 Zweck", text: g.gegenstand || gegenstandVorlage({ land: "CH", typ: g.projekt?.typ, ort: g.projekt?.gemeinde }) },
      { titel: "Art. 3 Stammkapital", text: `Das Stammkapital beträgt ${zahl(g.stammkapital, "CHF")} und ist eingeteilt in Stammanteile gemäss nachstehender Aufstellung. Die Stammanteile sind vollständig liberiert.` },
      { tabelle: gesellschafterTabelle(g, rf) },
      { titel: "Art. 4 Gesellschafterversammlung", text: "Oberstes Organ ist die Gesellschafterversammlung. Sie genehmigt die Jahresrechnung innerhalb von sechs Monaten nach Abschluss des Geschäftsjahres." },
      { titel: "Art. 5 Geschäftsführung", text: `Geschäftsführer: ${gf(g).map((x) => `${x.name}${x.wohnsitzLand ? ` (Wohnsitz ${x.wohnsitzLand})` : ""}`).join(", ") || "__________"}. Mindestens eine zur Vertretung befugte Person muss Wohnsitz in der Schweiz haben.` },
      { titel: "Art. 6 Revision", text: "Die Gesellschaft kann auf die eingeschränkte Revision verzichten (Opting-out), sofern die gesetzlichen Voraussetzungen erfüllt sind." },
      { titel: "Art. 7 Mitteilungen", text: "Publikationsorgan ist das Schweizerische Handelsamtsblatt (SHAB)." },
    ],
  };
}

function gfBestellung(g, rf) {
  return {
    id: "gf", titel: rf.land === "CH" ? "Wahlannahmeerklärung der Geschäftsführung" : "Gesellschafterbeschluss – Bestellung der Geschäftsführung", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { text: rf.land === "CH" ? "Die nachstehenden Personen erklären, die Wahl zum Geschäftsführer bzw. zur Geschäftsführerin anzunehmen:" : `Die Gesellschafter der ${g.name} beschließen unter Verzicht auf alle Form- und Fristvorschriften einstimmig: Zu Geschäftsführern werden bestellt:` },
      { liste: gf(g).map(personZeile) },
      { text: vertretung(g) },
      { titel: "Unterschriftsprobe / Musterzeichnung", text: rf.land === "AT" ? "Die Geschäftsführer zeichnen ihre Unterschrift beim Notariat (beglaubigte Musterzeichnung für das Firmenbuch)." : rf.land === "DE" ? "Eine Unterschriftsprobe ist seit 2007 nicht mehr einzureichen; die Geschäftsführer versichern bei der Anmeldung, dass keine Bestellungshindernisse bestehen (§ 8 Abs. 3 GmbHG) – Belehrung durch das Notariat." : "Die zeichnungsberechtigten Personen hinterlegen ihre Unterschrift beglaubigt beim Handelsregisteramt." },
      { text: "Ort, Datum: __________________   Unterschriften: __________________" },
    ],
  };
}

function anmeldung(g, rf) {
  const reg = { AT: "Firmenbuch", DE: "Handelsregister", CH: "Handelsregister" }[rf.land];
  return {
    id: "anmeldung", titel: `Anmeldung zur Eintragung in das ${reg} – Entwurf`, untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { text: `Zur Eintragung in das ${reg} wird angemeldet: die Errichtung der ${g.name} (${rf.label}).` },
      { tabelle: { kopf: ["Angabe", "Wert"], zeilen: kerndaten(g, rf) } },
      { titel: rf.komplementaer ? "Gesellschafter" : "Geschäftsführung und Vertretung", liste: rf.komplementaer ? [`Komplementärin: ${leer(g.komplementaer?.name)}`, ...(g.gesellschafter || []).map((x) => `Kommanditist: ${leer(x.name)}, Haftsumme ${zahl(x.einlage)}`)] : gf(g).map(personZeile) },
      { text: vertretung(g) },
      { titel: "Beilagen", liste: {
        AT: ["Notariatsakt (Gesellschaftsvertrag bzw. Errichtungserklärung)", "Bankbestätigung über die Einzahlung (§ 10 Abs. 3 GmbHG)", "Musterzeichnung(en) der Geschäftsführer", "Nachweis über die Bestellung der Geschäftsführer", "Nachweis über die Entrichtung der Gebühren"],
        DE: rf.komplementaer ? ["Anmeldung in öffentlich beglaubigter Form (alle Gesellschafter)", "Registerauszug der Komplementär-GmbH"] : ["Gesellschaftsvertrag bzw. Musterprotokoll", "Gesellschafterliste", "Legitimation der Geschäftsführer", "Versicherung der Geschäftsführer über die Einzahlung und Bestellungshindernisse"],
        CH: ["Öffentliche Urkunde über die Gründung", "Statuten", "Wahlannahmeerklärungen", "Bescheinigung über die Kapitaleinzahlung (Bank)", "Stampa-Erklärung", "Domizilannahmeerklärung (falls c/o-Adresse)"],
      }[rf.land] },
      { text: "Die Anmeldung reicht das Notariat elektronisch ein. Ort, Datum und Unterschrift/Beglaubigung durch das Notariat." },
    ],
  };
}

function kapital(g, rf) {
  return {
    id: "kapital", titel: rf.land === "CH" ? "Anforderung – Bescheinigung über die Kapitaleinzahlung (Sperrkonto)" : "Anforderung – Bankbestätigung über die Einzahlung", untertitel: `${g.name} – Vorlage für die Bank`,
    abschnitte: [
      { text: `Wir bitten um Eröffnung eines ${rf.land === "CH" ? "Kapitaleinzahlungskontos" : "Geschäftskontos"} für die ${g.name} in Gründung und nach Eingang der Einlagen um eine Bestätigung, dass der Betrag von ${zahl(g.einzahlung, rf.waehrung)} eingezahlt wurde und ${rf.land === "CH" ? "nach Eintragung im Handelsregister zur Verfügung der Gesellschaft steht" : "sich endgültig in der freien Verfügung der Geschäftsführung befindet"}.` },
      { tabelle: gesellschafterTabelle(g, rf) },
      { text: "Kontoinhaber: die Gesellschaft in Gründung, vertreten durch die Geschäftsführung. Identifizierung der Geschäftsführer und wirtschaftlichen Eigentümer durch die Bank (Sorgfaltspflichten der Bank)." },
    ],
  };
}

function eigentuemerMeldung(g, rf) {
  const titel = { AT: "WiEReG-Meldung – Meldedaten", DE: "Transparenzregister – Meldedaten", CH: "Verzeichnis der Gesellschafter und wirtschaftlich Berechtigten" }[rf.land];
  const text = {
    AT: "Meldung über das Unternehmensserviceportal (USP) binnen vier Wochen nach der Eintragung im Firmenbuch; danach jährliche Überprüfung und Bestätigung (§§ 3, 5 WiEReG).",
    DE: "Meldung an das Transparenzregister (Bundesanzeiger Verlag); die frühere Mitteilungsfiktion über andere Register ist entfallen – jede Gesellschaft muss selbst melden (§ 20 GwG).",
    CH: "Die Gesellschaft führt ein Verzeichnis über die Gesellschafter und die gemeldeten wirtschaftlich berechtigten Personen (Art. 790a OR). Ein eidgenössisches Transparenzregister ist in Vorbereitung.",
  }[rf.land];
  return { id: "eigentuemer", titel, untertitel: g.name, abschnitte: [{ text }, { tabelle: eigentuemer(g) }, { titel: "Gesellschafter", tabelle: gesellschafterTabelle(g, rf) }] };
}

function gesellschafterliste(g, rf) {
  return {
    id: "gesellschafterliste", titel: rf.land === "DE" ? "Liste der Gesellschafter (§ 8 Abs. 1 Nr. 3, § 40 GmbHG)" : "Gesellschafterübersicht", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { tabelle: { kopf: ["Lfd. Nr. Anteil", "Gesellschafter (Name, Geburtsdatum bzw. Register, Sitz)", "Nennbetrag", "Prozent"], zeilen: (g.gesellschafter || []).map((x, i) => [String(i + 1), `${leer(x.name)}${x.art === "person" ? `, geb. ${datum(x.geburtsdatum)}` : x.register ? `, ${x.register}` : ""}${x.sitz ? `, ${x.sitz}` : ""}`, zahl(x.einlage, rf.waehrung), `${Number(x.anteil || 0).toLocaleString("de-DE")} %`]) } },
      { text: "Ort, Datum, Unterschrift der Geschäftsführung (bei Gründung: durch das Notariat einzureichen)." },
    ],
  };
}

function datenblattBehoerden(g, rf) {
  const zeilen = {
    AT: [["Finanzamt", "Erfassung über FinanzOnline bzw. Formular Verf 15 (Kapitalgesellschaften) – binnen eines Monats"], ["UID-Nummer", "mit der steuerlichen Erfassung beantragen"], ["Gewerbe/WKO", "Gewerbeberechtigung bzw. Kammermitgliedschaft für den Anlagenbetrieb prüfen"], ["Ökostrom", "Anlagenregistrierung/Förderung (EAG, OeMAG) im Projektablauf"]],
    DE: [["Finanzamt", "Fragebogen zur steuerlichen Erfassung über ELSTER binnen eines Monats (§ 138 AO)"], ["USt-IdNr.", "im Fragebogen beantragen"], ["Gewerbeamt", "Gewerbeanmeldung, sofern der Anlagenbetrieb gewerblich ist"], ["Marktstammdatenregister", "Anlage und Betreiber bei Inbetriebnahme registrieren (Bundesnetzagentur)"]],
    CH: [["Steuerverwaltung", "Anmeldung bei der kantonalen Steuerverwaltung erfolgt in der Regel über das Handelsregister"], ["MWST", "Registrierung ab CHF 100.000 Jahresumsatz (ESTV)"], ["Sozialversicherung", "AHV-Anmeldung bei Anstellung von Personal"], ["Förderung", "Einmalvergütung/Herkunftsnachweise über Pronovo"]],
  }[rf.land];
  return { id: "behoerden", titel: "Datenblatt Behörden und Folgemeldungen", untertitel: g.name, abschnitte: [{ tabelle: { kopf: ["Stelle", "Was ist zu tun"], zeilen } }, { tabelle: { kopf: ["Angabe", "Wert"], zeilen: kerndaten(g, rf) } }] };
}

function stampa(g) {
  return {
    id: "stampa", titel: "Stampa-Erklärung", untertitel: `${g.name} – ${MUSTER_HINWEIS}`,
    abschnitte: [
      { text: "Die unterzeichnenden Gründer erklären gegenüber dem Handelsregisteramt, dass keine Sacheinlagen, Sachübernahmen, Verrechnungstatbestände oder besonderen Vorteile bestehen, die nicht in den Belegen offengelegt sind." },
      { text: "Ort, Datum: __________________   Unterschriften: __________________" },
    ],
  };
}

function projektrechte(g) {
  return {
    id: "projektrechte", titel: "Übertragung der Projektrechte – Checkliste", untertitel: `${g.name}${g.projekt ? ` · ${g.projekt.titel}` : ""}`,
    abschnitte: [
      { text: "Die Projektrechte werden durch Einbringung (Sacheinlage bzw. Einlage in die Kapitalrücklage) oder Kaufvertrag auf die Projektgesellschaft übertragen. Form und steuerliche Folgen mit Notariat und Steuerberatung abstimmen." },
      { liste: [
        "Nutzungs-/Pachtverträge und Dienstbarkeiten (Zustimmung der Eigentümer, Grundbuch)",
        "Netzanschlusszusage bzw. Reservierung (Zustimmung des Netzbetreibers zur Übertragung)",
        "Planungsrecht und Genehmigungen (B-Plan/Widmung, Baugenehmigung, naturschutzrechtliche Auflagen)",
        "Gutachten (Blendung, Boden, Artenschutz, Ertrag) inkl. Nutzungsrechten",
        "Förderzusagen/Zuschläge (EEG/EAG/Einmalvergütung) – Übertragbarkeit prüfen",
        "Verträge mit Planern/Dienstleistern, Datenraum, Projektunterlagen",
        "Kaufpreis bzw. Einbringungswert, Gewährleistungen, aufschiebende Bedingungen",
      ] },
    ],
  };
}

/** Komplettes Paket je Rechtsform (Reihenfolge = Reihenfolge im PDF) */
export function dokumentenpaket(g) {
  const rf = RECHTSFORMEN[g?.rechtsform];
  if (!rf) return [];
  const docs = [deckblatt(g, rf)];
  if (rf.land === "AT") docs.push(atVertrag(g, rf), gfBestellung(g, rf), anmeldung(g, rf), kapital(g, rf), eigentuemerMeldung(g, rf), gesellschafterliste(g, rf));
  if (rf.land === "DE" && !rf.komplementaer) docs.push(deVertrag(g, rf), gesellschafterliste(g, rf), gfBestellung(g, rf), anmeldung(g, rf), kapital(g, rf), eigentuemerMeldung(g, rf));
  if (rf.komplementaer) docs.push(kgVertrag(g, rf), anmeldung(g, rf), kapital(g, rf), eigentuemerMeldung(g, rf));
  if (rf.land === "CH") docs.push(chStatuten(g, rf), gfBestellung(g, rf), stampa(g), anmeldung(g, rf), kapital(g, rf), eigentuemerMeldung(g, rf));
  docs.push(datenblattBehoerden(g, rf), projektrechte(g));
  return docs;
}

export const dokumentTitel = (g) => dokumentenpaket(g).map((d) => ({ id: d.id, titel: d.titel }));
