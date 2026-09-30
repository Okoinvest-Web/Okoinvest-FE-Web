// src/lib/plattform/closing/muster.js
//
// Textbausteine der Muster-Dokumente (Grundbuch & Closing) als Struktur für den PDF-Satz dienste/pdf.js
// ([{ titel, untertitel, abschnitte: [{ titel?, text?, liste?, tabelle? }] }]). Die Frappe-App hat dazu gleichwertige
// Jinja-Druckformate (plattform/print_format/*_muster). ALLES MUSTER – keine Rechtsberatung, vor Verwendung durch
// Rechtsanwalt bzw. Notar prüfen und an den Einzelfall anpassen.
//
// Reine Funktionen (client- und serverseitig).

import { GB_HINWEIS, GB_LAENDER, GB_LOESCHUNG, GB_RECHTE, GB_VORLAGEN, grundbuchKosten } from "./grundbuch.js";
import { CL_HINWEIS, CL_STRUKTUREN, CL_VERANTWORTLICH, SIGNING_PUNKTE, TREUHAND_HINWEIS, UEBERGABE_PUNKTE, formHinweise } from "./closing.js";

const FIRMA = "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething, FN 541505g, LG Ried im Innkreis";
const eur = (x, w = "EUR") => (Number.isFinite(Number(x)) ? `${Math.round(Number(x)).toLocaleString("de-DE")} ${w === "CHF" ? "CHF" : "€"}` : "–");
const datum = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
const leer = (s, ersatz = "[ergänzen]") => (String(s || "").trim() ? String(s).trim() : ersatz);

const MUSTER_KOPF = { titel: "Wichtiger Hinweis", text: `MUSTER – ${GB_HINWEIS}` };

function grundstueckTabelle(a) {
  const g = a.grundstueck || {};
  const zeilen = [
    ["Land", GB_LAENDER[a.land] || a.land],
    [a.land === "AT" ? "Katastralgemeinde / EZ" : a.land === "CH" ? "Gemeinde / Grundbuch" : "Grundbuch von / Blatt", leer(g.grundbuch)],
    [a.land === "AT" ? "Grundstücksnummer(n)" : a.land === "CH" ? "Parzelle(n) / EGRID" : "Flurstück(e)", leer(g.flurstuecke)],
    ["Bezeichnung", leer(g.bezeichnung || a.titel)],
  ];
  if (a.objektArt === "dach") zeilen.push(["Gebäude / Dachfläche", leer(g.gebaeude)]);
  return { kopf: ["Angabe", "Inhalt"], zeilen };
}

function parteien(a) {
  return {
    titel: "Vertragsparteien",
    liste: [
      `Eigentümer/in (Besteller/in des Rechts): ${leer(a.eigentuemerName)}${a.eigentuemerAnschrift ? `, ${a.eigentuemerAnschrift}` : ""} – alle Miteigentümer bzw. Verfügungsberechtigten unterzeichnen.`,
      `Berechtigte/r: ${leer(a.berechtigter, "ÖkoInvest GmbH")} bzw. eine von ihr benannte Projektgesellschaft (${FIRMA}).`,
    ],
  };
}

function rechtText(a) {
  const r = GB_RECHTE[a.land]?.[a.recht]?.label || "Dienstbarkeit";
  if (a.land === "AT") return `Die Eigentümerin räumt der Berechtigten eine ${r} ein. Die Eigentümerin erteilt ihre ausdrückliche Einwilligung, dass auf Grund dieses Vertrages ob der oben bezeichneten Liegenschaft die Dienstbarkeit zugunsten der Berechtigten einverleibt werden kann (Aufsandungserklärung).`;
  if (a.land === "CH") return `Die Eigentümerin räumt der Berechtigten ein ${r} ein und bewilligt dessen Eintragung im Grundbuch. Der Vertrag bedarf der öffentlichen Beurkundung.`;
  return `Die Eigentümerin bestellt der Berechtigten eine ${r} und bewilligt und beantragt deren Eintragung im Grundbuch an nächstoffener Rangstelle, im Rang vor den in Abteilung III eingetragenen Rechten (Rangrücktritt wird eingeholt).`;
}

/** Dienstbarkeitsvertrag Freifläche bzw. Dachnutzungs-/Servitutsvertrag */
function vertragMuster(a, dach) {
  const kosten = grundbuchKosten({ land: a.land, entgeltJahr: a.entgeltJahr, laufzeitJahre: a.laufzeitJahre, rangruecktritt: (a.pfandglaeubiger || []).length });
  const w = kosten.waehrung;
  const inhalt = dach
    ? [
        "das Dach bzw. die bezeichneten Dachflächen des Gebäudes zur Errichtung, zum Betrieb, zur Wartung, Instandsetzung, Erneuerung und zum Rückbau einer Photovoltaikanlage samt Unterkonstruktion, Wechselrichtern, Leitungen und Messeinrichtungen zu nutzen,",
        "Leitungen durch das Gebäude zu führen sowie Technikräume bzw. Wandflächen in vereinbartem Umfang zu nutzen,",
        "das Grundstück und das Gebäude zu diesen Zwecken zu betreten und mit Fahrzeugen und Hebezeugen anzufahren (nach Ankündigung, außer bei Gefahr im Verzug),",
        "von der Eigentümerin die Unterlassung von Maßnahmen zu verlangen, die den Betrieb beeinträchtigen (z. B. Verschattung, Aufbauten), soweit vereinbart.",
      ]
    : [
        "das Grundstück bzw. die im Lageplan bezeichnete Teilfläche zur Errichtung, zum Betrieb, zur Wartung, Instandsetzung, Erneuerung (Repowering) und zum Rückbau einer Photovoltaik-Freiflächenanlage samt Nebenanlagen (Wechselrichter, Trafostation, Zaun, Kameras, Wege) zu nutzen,",
        "Kabel und Leitungen zu verlegen, zu betreiben und zu erneuern,",
        "das Grundstück jederzeit zu betreten und zu befahren, soweit für Bau, Betrieb und Rückbau erforderlich,",
        "von der Eigentümerin die Unterlassung von Maßnahmen zu verlangen, die Bestand oder Betrieb beeinträchtigen (z. B. Bebauung, Verschattung, Aufwuchs über eine vereinbarte Höhe).",
      ];
  const eigentumAnlage =
    a.land === "DE"
      ? "Die Anlage wird nur zu einem vorübergehenden Zweck und in Ausübung dieser Dienstbarkeit mit Grundstück bzw. Gebäude verbunden; sie wird kein wesentlicher Bestandteil (Scheinbestandteil, § 95 BGB) und bleibt Eigentum der Berechtigten."
      : a.land === "AT"
        ? "Die Anlage wird in der Absicht errichtet, dass sie nicht stets auf dem Grundstück bzw. Gebäude bleiben soll, und bleibt Eigentum der Berechtigten (Superädifikat, § 435 ABGB, soweit anwendbar). Zur Absicherung kann eine Urkundenhinterlegung erfolgen."
        : "Die Anlage bleibt Eigentum der Berechtigten. Wegen des Akzessionsprinzips (Art. 667, 671 ZGB) wird dies über die Dienstbarkeit bzw. ein Baurecht (Art. 675, 779 ff. ZGB) abgesichert; Fahrnisbauten (Art. 677 ZGB) nur nach Prüfung.";
  const titel = dach ? GB_VORLAGEN.dachnutzung_servitut.label : GB_VORLAGEN.dienstbarkeit_freiflaeche.label;
  return {
    titel,
    untertitel: `${GB_LAENDER[a.land] || a.land} · ${GB_RECHTE[a.land]?.[a.recht]?.label || "Dienstbarkeit"} · Akte ${a.id}`,
    abschnitte: [
      MUSTER_KOPF,
      parteien(a),
      { titel: "§ 1 Belastetes Grundstück", tabelle: grundstueckTabelle(a) },
      { titel: "§ 2 Inhalt des Rechts", text: "Die Berechtigte ist befugt,", liste: inhalt },
      { titel: "§ 3 Bestellung und Eintragung", text: rechtText(a) },
      { titel: "§ 4 Eigentum an der Anlage", text: eigentumAnlage },
      {
        titel: "§ 5 Entgelt und Laufzeit",
        text: `Laufzeit ${a.laufzeitJahre || "[…]"} Jahre ab ${leer(a.laufzeitBeginn, "Inbetriebnahme")}, Verlängerungsoption nach Vereinbarung. Entgelt für die Einräumung: ${a.entgeltJahr ? `${eur(a.entgeltJahr, w)} pro Jahr` : "abgegolten durch das Entgelt aus dem Nutzungs- bzw. Pachtvertrag"}${a.vertragBezug ? ` (${a.vertragBezug})` : ""}. Wertsicherung wie im Nutzungsvertrag.`,
      },
      {
        titel: "§ 6 Übertragung und Ausübung durch Dritte",
        text:
          a.land === "DE"
            ? "Die Berechtigte darf die Ausübung Dritten überlassen (§ 1092 Abs. 1 Satz 2 BGB). Für den Fall eines Betreiberwechsels oder der Verwertung durch finanzierende Banken verpflichtet sich die Eigentümerin, inhaltsgleiche Dienstbarkeiten zugunsten des benannten Dritten zu bestellen (Eintrittsrecht). Übertragbarkeit nach § 1092 Abs. 3 BGB im Einzelfall prüfen."
            : a.land === "AT"
              ? "Die Berechtigte darf die Ausübung Dritten (Projektgesellschaft, Betriebsführer) überlassen. Für einen Betreiberwechsel verpflichtet sich die Eigentümerin, die Dienstbarkeit auf den Nachfolger zu übertragen bzw. neu einzuräumen und die erforderlichen Erklärungen in grundbuchsfähiger Form abzugeben."
              : "Die Berechtigte darf die Ausübung Dritten überlassen; Übertragbarkeit nach Art. 781 ZGB bzw. als selbständiges Baurecht (Art. 779 Abs. 3 ZGB) vereinbaren.",
      },
      { titel: "§ 7 Rang", text: a.land === "AT" ? "Die Dienstbarkeit soll im Rang vor bestehenden Pfandrechten einverleibt werden. Die Eigentümerin wirkt an der Vorrangseinräumung durch die Pfandgläubiger mit." : "Die Dienstbarkeit soll im Rang vor bestehenden Grundpfandrechten eingetragen werden. Die Eigentümerin wirkt am Rangrücktritt der Gläubiger mit." },
      { titel: "§ 8 Rückbau und Löschung", text: `Nach Vertragsende baut die Berechtigte die Anlage zurück. ${GB_LOESCHUNG[a.land] || GB_LOESCHUNG.DE}` },
      { titel: "§ 9 Kosten", text: `Die Kosten der Beurkundung bzw. Beglaubigung, der Eintragung, des Rangrücktritts und der späteren Löschung trägt die Berechtigte. Schätzung laut Kostenschätzer: rund ${eur(kosten.summe, w)} (Orientierung, siehe Anlage).` },
      { titel: "Anlage: Kostenschätzung (Orientierung)", tabelle: { kopf: ["Position", "Betrag", "Quelle"], zeilen: kosten.positionen.map((p) => [p.label, eur(p.betrag, w), p.quelle]) } },
      { text: kosten.hinweis },
      { titel: "Unterschriften", text: `Ort, Datum, Unterschrift Eigentümer/in – ${a.land === "CH" ? "öffentliche Beurkundung durch die Urkundsperson" : a.land === "AT" ? "Unterschrift gerichtlich oder notariell beglaubigt (§ 31 GBG)" : "Unterschrift unter der Bewilligung öffentlich beglaubigt (§ 29 GBO)"}.\n\nOrt, Datum, Unterschrift Berechtigte/r` },
    ],
  };
}

function rangMuster(a) {
  const glaeubiger = (a.pfandglaeubiger || []).length ? a.pfandglaeubiger.map((g) => g.name).join(", ") : "[Bank]";
  const recht = a.land === "AT" ? "Pfandrecht(e) im C-Blatt" : a.land === "CH" ? "Grundpfandrecht(e) (Schuldbrief/Grundpfandverschreibung)" : "Grundschuld(en)/Hypothek(en) in Abteilung III";
  return {
    titel: GB_VORLAGEN.rangruecktritt.label,
    untertitel: `An: ${glaeubiger} · Akte ${a.id}`,
    abschnitte: [
      MUSTER_KOPF,
      { titel: "Betreff", text: `${a.land === "AT" ? "Ersuchen um Vorrangseinräumung" : "Ersuchen um Rangrücktritt"} zugunsten einer Dienstbarkeit für eine Photovoltaikanlage – Grundstück ${leer(a.grundstueck?.grundbuch)}` },
      {
        text: `Sehr geehrte Damen und Herren,\n\nzugunsten von ${leer(a.berechtigter, "ÖkoInvest GmbH")} soll auf dem oben bezeichneten Grundstück der Eigentümerin ${leer(a.eigentuemerName)} eine Dienstbarkeit für Errichtung und Betrieb einer Photovoltaikanlage eingetragen werden. Auf dem Grundstück lastet zu Ihren Gunsten ${recht}.\n\nWir bitten Sie, ${a.land === "AT" ? "der Dienstbarkeit den Vorrang vor Ihrem Pfandrecht einzuräumen (§ 30 GBG) und die Vorrangseinräumungserklärung mit beglaubigter Unterschrift auszustellen" : a.land === "CH" ? "mit Ihrem Grundpfandrecht im Rang hinter die Dienstbarkeit zurückzutreten und die Erklärung in grundbuchfähiger Form auszustellen" : "mit Ihrem Recht im Rang hinter die Dienstbarkeit zurückzutreten (§ 880 BGB) und die Rangrücktrittsbewilligung in öffentlich beglaubigter Form (§ 29 GBO) zu erteilen"}.`,
      },
      {
        titel: "Warum das für Ihre Sicherheit unschädlich ist",
        liste: [
          "Die Anlage steigert in der Regel den Ertrag des Grundstücks (Nutzungsentgelt an die Eigentümerin).",
          "Die Dienstbarkeit betrifft nur die Nutzung für die Anlage; das Eigentum bleibt bei Ihrer Kreditnehmerin.",
          "Die Anlage wird am Ende zurückgebaut, die Dienstbarkeit gelöscht (Rückbauverpflichtung mit Sicherheit).",
        ],
      },
      { titel: "Anlagen", liste: ["Auszug aus dem Nutzungs- bzw. Dienstbarkeitsvertrag", "Lageplan der belasteten Fläche", "Zustimmung der Eigentümerin zum Rangrücktritt"] },
      { titel: "Kosten", text: "Die Kosten der Erklärung und ihrer Beglaubigung sowie der Eintragung übernimmt die Berechtigte." },
      { text: "Mit freundlichen Grüßen\n\n" + FIRMA },
    ],
  };
}

function loeschungMuster(a) {
  return {
    titel: GB_VORLAGEN.loeschung_hinweis.label,
    untertitel: `${GB_LAENDER[a.land] || a.land} · Akte ${a.id}`,
    abschnitte: [
      MUSTER_KOPF,
      { titel: "Worum geht es?", text: `Die Dienstbarkeit sichert die Anlage während der Laufzeit. Endet der Vertrag und ist die Anlage zurückgebaut, wird das Recht wieder gelöscht – so ist das Grundstück wieder lastenfrei (bezogen auf dieses Recht).` },
      { titel: "Ablauf", text: GB_LOESCHUNG[a.land] || GB_LOESCHUNG.DE },
      {
        titel: "Was im Vertrag stehen sollte",
        liste: [
          "Pflicht der Berechtigten, die Löschung nach Rückbau in grundbuchfähiger Form zu bewilligen – innerhalb einer festen Frist.",
          "Kostentragung der Löschung durch die Berechtigte.",
          "Löschungspflicht auch bei Nichtbau (z. B. wenn die Anlage bis zu einem Stichtag nicht errichtet ist).",
          "Rückbausicherheit (Bürgschaft/Versicherung) bis zur Löschung.",
        ],
      },
      { titel: "Hinweis zur Eintragung vor Baubeginn", text: "Wird die Dienstbarkeit schon vor Baubeginn eingetragen, sollte der Vertrag eine Löschungspflicht für den Fall enthalten, dass nicht gebaut wird (Option „sofort, mit Löschungspflicht bei Nichtbau“ im Pachtangebot)." },
    ],
  };
}

/** Dokumente einer Grundbuch-Akte für den PDF-Satz. vorlage: Schlüssel aus GB_VORLAGEN */
export function grundbuchMuster(akte, vorlage) {
  if (vorlage === "dachnutzung_servitut") return [vertragMuster(akte, true)];
  if (vorlage === "rangruecktritt") return [rangMuster(akte)];
  if (vorlage === "loeschung_hinweis") return [loeschungMuster(akte)];
  return [vertragMuster(akte, akte.objektArt === "dach")];
}

// ================================================================ Closing

/** SPA-Muster (Asset bzw. Share Deal) – Kerndaten aus Projekt und Gebot/LOI */
export function spaMuster(c) {
  const share = c.struktur === "share";
  const w = c.land === "CH" ? "CHF" : "EUR";
  const kaeufer = c.kaeufer?.anzeige || "Käufer";
  const verkaeufer = c.verkaeufer?.anzeige || "Verkäufer";
  const meilensteine = (c.meilensteine || []).map((m) => [m.label, eur(m.betrag, w), m.bedingung || "–", datum(m.faelligAm)]);
  return [
    {
      titel: share ? "Anteilskaufvertrag (Share Purchase Agreement) – Muster" : "Kaufvertrag über Anlage und Projektrechte (Asset Purchase Agreement) – Muster",
      untertitel: `${c.projekt?.titel || "Projekt"} · ${CL_STRUKTUREN[c.struktur]?.label || ""} · Closing-Akte ${c.id}`,
      abschnitte: [
        { titel: "Wichtiger Hinweis", text: `MUSTER – ${CL_HINWEIS}` },
        { titel: "Parteien", liste: [`Verkäufer: ${verkaeufer}`, `Käufer: ${kaeufer}`, `Vermittlerin (nicht Partei): ${FIRMA} – Provision nach gesonderter Vereinbarung mit dem Verkäufer`] },
        {
          titel: "§ 1 Kaufgegenstand",
          text: share
            ? `${c.anteilProzent || 100} % der Geschäftsanteile an der ${leer(c.spvName, "[Projektgesellschaft]")} (Projektgesellschaft), Inhaberin des Projekts „${c.projekt?.titel || ""}“ (${c.projekt?.mwp || "–"} MWp, ${c.projekt?.land || ""}), einschließlich Gewinnbezugsrecht ab dem Stichtag.`
            : `Die Photovoltaikanlage bzw. die Projektrechte „${c.projekt?.titel || ""}“ (${c.projekt?.mwp || "–"} MWp, ${c.projekt?.land || ""}) mit allen Bestandteilen, Genehmigungen, Nutzungs- und Dienstbarkeitsverträgen, Netzanschlusszusage und Unterlagen gemäß Anlage (Asset-Liste).`,
        },
        {
          titel: "§ 2 Kaufpreis und Zahlung",
          text: `Kaufpreis ${eur(c.kaufpreis, w)} (${c.kaufpreisQuelle === "zuschlag" ? "Zuschlag im Bieterverfahren" : c.kaufpreisQuelle === "loi" ? "angenommene LOI" : "vereinbart"})${share ? ", Eigenkapitalwert auf Basis Locked Box bzw. Stichtagsabschluss (Completion Accounts) – Verfahren festlegen" : ""}. Fälligkeit zum Closing${c.zahlung?.treuhand ? `; Zahlung über ${c.land === "DE" ? "Notaranderkonto" : "Treuhandkonto"} – ${TREUHAND_HINWEIS[c.land] || TREUHAND_HINWEIS.DE}` : " durch Überweisung auf das Konto des Verkäufers"}.${c.earnOut ? ` Earn-out: ${c.earnOut}` : ""}`,
        },
        ...(meilensteine.length ? [{ titel: "Meilensteinzahlungen", tabelle: { kopf: ["Meilenstein", "Betrag", "Bedingung", "Fällig"], zeilen: meilensteine } }] : []),
        { titel: "§ 3 Signing und Closing", text: "Der Vertrag wird mit Unterzeichnung (Signing) wirksam; der dingliche Vollzug (Closing) erfolgt, sobald alle aufschiebenden Bedingungen erfüllt oder verzichtet sind und der Kaufpreis gezahlt bzw. auf dem Treuhandkonto eingegangen ist. Longstop Date: [Datum] – danach Rücktrittsrecht beider Parteien." },
        { titel: "§ 4 Aufschiebende Bedingungen (Closing Conditions)", tabelle: { kopf: ["Bedingung", "Verantwortlich", "Frist"], zeilen: (c.cps || []).map((x) => [x.label, CL_VERANTWORTLICH[x.verantwortlich] || x.verantwortlich, datum(x.frist)]) } },
        {
          titel: "§ 5 Garantien des Verkäufers (Auswahl)",
          liste: [
            share ? "Bestand und Lastenfreiheit der Anteile, ordnungsgemäße Gründung und Kapitalaufbringung der Gesellschaft." : "Eigentum und Lastenfreiheit der Anlage bzw. Inhaberschaft der Projektrechte.",
            "Wirksamkeit und Ungekündigtheit der Nutzungsverträge; Dienstbarkeiten eingetragen bzw. Eintragung gesichert, Rang wie offengelegt.",
            "Genehmigungen erteilt und bestandskräftig bzw. wie offengelegt; keine Auflagen außer den offengelegten.",
            "Netzanschlusszusage bzw. Netzanschlussvertrag wirksam; Einspeise-/Förderansprüche wie offengelegt.",
            "Keine Rechtsstreitigkeiten, keine Steuerrückstände, Datenraum vollständig und richtig (Disclosure).",
          ],
        },
        { titel: "§ 6 Haftung", text: "Rechtsfolgen und Beschränkungen: De-minimis-Betrag [ ], Schwelle (Basket) [ ], Höchstbetrag (Cap) [ ] % des Kaufpreises, Verjährung [ ] Monate (Steuern länger). Optional W&I-Versicherung. Freistellungen für bekannte Risiken gesondert." },
        { titel: "§ 7 Material Adverse Change", text: "Tritt bis zum Closing eine wesentliche nachteilige Veränderung ein (Definition vereinbaren, z. B. Verlust der Netzzusage, Aufhebung der Genehmigung), kann der Käufer zurücktreten bzw. Nachverhandlung verlangen." },
        { titel: "§ 8 Form, Steuern, Kosten", liste: formHinweise(c.struktur, c.land) },
        { titel: "§ 9 Übergabe", liste: UEBERGABE_PUNKTE.map((p) => `${p.label}: ${p.text}`) },
        { titel: "§ 10 Schlussbestimmungen", text: "Rechtswahl [ ], Gerichtsstand bzw. Schiedsgericht [ ], Vertraulichkeit, salvatorische Klausel, Schriftform. Anlagen: Asset-Liste bzw. Gesellschaftsdaten, Offenlegungsbrief, Datenraum-Index." },
      ],
    },
  ];
}

/** Abschlussbericht nach Closing */
export function abschlussbericht(c) {
  const w = c.land === "CH" ? "CHF" : "EUR";
  const signing = SIGNING_PUNKTE.map((p) => {
    const s = (c.signingStand || []).find((x) => x.schluessel === p.schluessel) || {};
    return [p.label, s.erledigt ? "ja" : "nein", s.am ? datum(s.am) : "–"];
  });
  return [
    {
      titel: "Abschlussbericht Transaktion",
      untertitel: `${c.projekt?.titel || "Projekt"} · Closing-Akte ${c.id} · Status: ${c.statusLabel || c.status}`,
      abschnitte: [
        {
          titel: "Eckdaten",
          tabelle: {
            kopf: ["Angabe", "Wert"],
            zeilen: [
              ["Struktur", CL_STRUKTUREN[c.struktur]?.label || c.struktur],
              ["Verkäufer", c.verkaeufer?.anzeige || "–"],
              ["Käufer", c.kaeufer?.anzeige || "–"],
              ["Kaufpreis", eur(c.kaufpreis, w)],
              ["Herkunft", c.herkunft === "zuschlag" ? "Zuschlag im Bieterverfahren" : "Angenommene LOI"],
              ["Signing", datum(c.signingAm)],
              ["Notartermin", c.notar?.termin ? `${datum(c.notar.termin)} · ${c.notar.name || ""} ${c.notar.kanzlei ? `(${c.notar.kanzlei})` : ""}` : "–"],
              ["Zahlungseingang", c.zahlung?.eingangAm ? `${datum(c.zahlung.eingangAm)}${c.zahlung.treuhand ? " (Treuhand)" : ""}` : "–"],
              ["Closing", datum(c.vollzogenAm)],
              ["Provision", c.provision ? `${eur(c.provision.betrag)} (${(Number(c.provision.satz || 0) * 100).toLocaleString("de-DE")} %) – ${c.provision.status}` : "–"],
              ["Provisionsrechnung", c.rechnung?.nummer ? `${c.rechnung.nummer} (${c.rechnung.status || ""})` : "–"],
            ],
          },
        },
        { titel: "Signing-Checkliste", tabelle: { kopf: ["Punkt", "Erledigt", "Am"], zeilen: signing } },
        { titel: "Closing Conditions", tabelle: { kopf: ["Bedingung", "Status", "Nachweis", "Am"], zeilen: (c.cps || []).map((x) => [x.label, x.status, x.nachweis || "–", datum(x.erfuelltAm)]) } },
        { titel: "Übergabe", tabelle: { kopf: ["Punkt", "Erledigt", "Am"], zeilen: UEBERGABE_PUNKTE.map((p) => { const u = (c.uebergabe || []).find((x) => x.schluessel === p.schluessel) || {}; return [p.label, u.erledigt ? "ja" : "offen", datum(u.am)]; }) } },
        { titel: "Verlauf", liste: (c.verlauf || []).slice(-25).map((v) => `${datum(v.am)} – ${v.text}`) },
        { text: CL_HINWEIS },
      ],
    },
  ];
}

export { SIGNING_PUNKTE, UEBERGABE_PUNKTE };
