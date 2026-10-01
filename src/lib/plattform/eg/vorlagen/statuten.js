// src/lib/plattform/eg/vorlagen/statuten.js
//
// WP5 – Musterstatuten Verein (EEG/BEG) und Mustersatzung Genossenschaft (eGen) als reine Daten für eg/vertraege.js.
// Grundlagen: VerG 2002 § 3 Abs. 2 (Pflichtinhalte der Statuten), §§ 5, 8, 11, 13, 20–22, 28 VerG; EAG § 79 Abs. 2;
// ElWG §§ 66–68, 70; GenG, GenRevG 1997; Vorschlag für Vereinsstatuten EEG und Leitfaden der Koordinationsstelle
// (energiegemeinschaften.gv.at/downloads/vorschlag-fuer-vereinsstatuten-erneuerbare-energie-gemeinschaft/).
// MUSTER – vor Verwendung anwaltlich bzw. vom Revisionsverband prüfen lassen (Fachkonzept 9, Punkt 8).

export const STATUTEN_VEREIN = {
  id: "statuten_verein",
  kurz: "Statuten (Verein)",
  gruppe: "statuten",
  titel: "Statuten des Vereins „{{name}}“",
  untertitel: "{{modellLabel}} – Muster nach VerG 2002, Stand ElWG 01.10.2026",
  art: "statuten",
  modelle: ["eeg", "beg"],
  rechtsformen: ["verein"],
  quelle: "VerG 2002 § 3 Abs. 2, §§ 5, 8, 21, 22, 28; EAG § 79 Abs. 2; ElWG §§ 66–68, 70; Musterstatuten der Koordinationsstelle",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "name", label: "Vereinsname", pflicht: true },
    { id: "sitzOrt", label: "Sitz (Gemeinde)", pflicht: true },
    { id: "taetigkeitsgebiet", label: "Tätigkeitsbereich (z. B. Gemeindegebiet, Trafostation, Umspannwerk)", pflicht: true },
    { id: "zweckZusatz", label: "Zusätzlicher Zweck (optional, z. B. Bürgerbeteiligung an Anlagen)" },
    { id: "kuendigungsfristWochen", label: "Austrittsfrist in Wochen (üblich 3–7)", pflicht: true },
    { id: "funktionsperiodeJahre", label: "Funktionsperiode Vorstand und Rechnungsprüfer (Jahre)", pflicht: true },
    { id: "einladungsfristTage", label: "Einladungsfrist Mitgliederversammlung (Tage)", pflicht: true },
    { id: "gvTurnusJahre", label: "Ordentliche Mitgliederversammlung alle … Jahre (höchstens 5)" },
    { id: "onlineGv", label: "Virtuelle bzw. hybride Mitgliederversammlung zulassen" },
    { id: "tarifeDurch", label: "Tarife beschließt (vorstand | gv)" },
    { id: "vermoegensempfaenger", label: "Vermögensverwendung bei Auflösung", pflicht: true },
  ],
  abschnitte: [
    {
      titel: "Name, Sitz und Tätigkeitsbereich",
      absaetze: [
        "Der Verein führt den Namen „{{name}}“.",
        "Er hat seinen Sitz in {{sitzOrt}} und erstreckt seine Tätigkeit auf {{taetigkeitsgebiet}}.",
        "Der Verein ist eine {{modellLabel}} im Sinne des {{rechtsgrundlage}}. Er nimmt an der gemeinsamen Energienutzung nach § 68 ElWG teil.",
        "Die Errichtung von Zweigvereinen ist nicht beabsichtigt.",
      ],
    },
    {
      titel: "Zweck",
      absaetze: [
        "Der Verein, dessen Tätigkeit nicht auf Gewinn gerichtet ist, bezweckt die gemeinsame Erzeugung, Speicherung, den Verbrauch und den Verkauf von elektrischer Energie aus erneuerbaren Quellen durch seine Mitglieder.",
        "Hauptzweck des Vereins ist nicht die Erzielung finanzieller Gewinne. Der Verein soll seinen Mitgliedern bzw. dem Gebiet, in dem er tätig ist, vorrangig ökologische, wirtschaftliche oder sozialgemeinschaftliche Vorteile bringen.",
        { text: "Darüber hinaus verfolgt der Verein folgenden Zweck: {{zweckZusatz}}", wenn: "zweckZusatz" },
        { text: "Der Verein wird ausschließlich von natürlichen Personen, Gebietskörperschaften und kleinen Unternehmen kontrolliert, die nicht als Elektrizitätsunternehmen tätig sind. Diese Mitglieder halten gemeinsam jedenfalls die für eine Statutenänderung erforderliche Mehrheit der Stimmen (§ 67 Abs. 3 ElWG).", wenn: "modell=beg" },
        "Die Teilnahme am Verein ist offen und freiwillig.",
      ],
    },
    {
      titel: "Mittel zur Erreichung des Vereinszwecks",
      absaetze: [
        "Der Vereinszweck soll durch die in den folgenden Absätzen angeführten ideellen und materiellen Mittel erreicht werden.",
        "Als ideelle Mittel dienen:",
        {
          liste: [
            "die Organisation der gemeinsamen Energienutzung, die Zuordnung der Zählpunkte und die Abwicklung der Marktprozesse mit dem Netzbetreiber über die EDA-Plattform,",
            "Information und Beratung der Mitglieder zu Eigendeckung, Lastverschiebung und Energieeffizienz,",
            "Mitgliederversammlungen, Informations- und Bildungsveranstaltungen,",
            "die Zusammenarbeit mit Gemeinden, Netzbetreibern, Energiegemeinschaften und Fachorganisationen.",
          ],
        },
        "Die erforderlichen materiellen Mittel sollen aufgebracht werden durch:",
        {
          liste: [
            "Beitrittsgebühren und Mitgliedsbeiträge,",
            "Entgelte der Mitglieder für die ihnen zugeordnete Energie und die Erlöse aus der Weitergabe von Energie,",
            "Förderungen und Subventionen,",
            "Spenden, Sammlungen, Vermächtnisse und sonstige Zuwendungen,",
            "Erträge aus Veranstaltungen und vereinseigenen Anlagen.",
          ],
        },
        "Überschüsse sind ausschließlich für den Vereinszweck zu verwenden, insbesondere für die Preisgestaltung gegenüber den Mitgliedern, Rücklagen und Investitionen in Erzeugungs- und Speicheranlagen. Eine Ausschüttung von Gewinnen an die Mitglieder findet nicht statt.",
      ],
    },
    {
      titel: "Arten der Mitgliedschaft",
      absaetze: [
        "Die Mitglieder gliedern sich in ordentliche und fördernde Mitglieder.",
        "Ordentliche Mitglieder sind Netzbenutzer, die mit mindestens einem Zählpunkt an der gemeinsamen Energienutzung des Vereins teilnehmen (Verbraucher, Erzeuger oder beides). Fördernde Mitglieder unterstützen den Verein ohne eigenen Zählpunkt.",
      ],
    },
    {
      titel: "Erwerb der Mitgliedschaft",
      absaetze: [
        "Mitglieder können werden: {{mitgliederkreisText}}.",
        "Voraussetzung für die ordentliche Mitgliedschaft ist ein Zählpunkt {{nahebereichText}} sowie ein intelligentes Messgerät mit Viertelstundenwerten.",
        "Über die Aufnahme entscheidet der Vorstand. Die Aufnahme darf nur aus sachlichen Gründen abgelehnt werden, insbesondere wenn die Voraussetzungen der vorstehenden Absätze nicht vorliegen, der Netzbetreiber die Teilnahme ablehnt oder der Vorstand einen Aufnahmestopp wegen fehlender Erzeugungskapazität beschlossen hat. Die Ablehnung ist zu begründen.",
        "Die Mitgliedschaft entsteht mit dem Aufnahmebeschluss. Die Teilnahme an der Energiezuordnung beginnt mit der Aktivierung des Zählpunkts durch den Netzbetreiber; dafür ist die Zustimmung des Mitglieds im Portal des Netzbetreibers innerhalb der dort genannten Frist erforderlich.",
        "Bis zur Entstehung des Vereins erfolgt die vorläufige Aufnahme von Mitgliedern durch die Proponentinnen und Proponenten, im Fall eines bereits bestellten Vorstands durch diesen. Diese Mitgliedschaft wird erst mit Entstehung des Vereins wirksam.",
      ],
    },
    {
      titel: "Beendigung der Mitgliedschaft",
      absaetze: [
        "Die Mitgliedschaft erlischt durch Tod, bei juristischen Personen durch Verlust der Rechtspersönlichkeit, durch freiwilligen Austritt und durch Ausschluss.",
        "Der Austritt ist jederzeit mit einer Frist von {{kuendigungsfristWochen}} Wochen zum Monatsende möglich. Er ist dem Vorstand schriftlich, per E-Mail oder über das Mitgliederportal mitzuteilen. Der Verein meldet die Zählpunkte des Mitglieds zum Austrittstermin beim Netzbetreiber ab; eine rückwirkende Abmeldung ist nicht möglich.",
        "Widerruft ein Mitglied seine Zustimmung im Portal des Netzbetreibers oder endet die Netznutzung am Zählpunkt (z. B. Auszug), endet die Teilnahme des betroffenen Zählpunkts an der Energiezuordnung. Hat das Mitglied keinen weiteren Zählpunkt im Verein, gilt dies als Austritt zum Ende des Monats, sofern es nicht binnen vier Wochen die Fortsetzung als förderndes Mitglied erklärt.",
        "Der Vorstand kann ein Mitglied ausschließen, wenn es trotz zweimaliger schriftlicher Mahnung unter Setzung einer angemessenen Nachfrist länger als drei Monate mit fälligen Zahlungen im Rückstand ist oder wenn es grob gegen die Mitgliedspflichten oder die Statuten verstößt. Gegen den Ausschluss ist binnen vier Wochen die Anrufung des Schiedsgerichts zulässig.",
        "Mit der Beendigung der Mitgliedschaft erfolgt eine Schlussabrechnung. Bis dahin entstandene Forderungen bleiben unberührt.",
      ],
    },
    {
      titel: "Rechte und Pflichten der Mitglieder",
      absaetze: [
        "Die Mitglieder sind berechtigt, an allen Veranstaltungen des Vereins teilzunehmen und die Einrichtungen des Vereins zu beanspruchen. Das Stimmrecht in der Mitgliederversammlung sowie das aktive und passive Wahlrecht stehen den ordentlichen Mitgliedern zu; jedes ordentliche Mitglied hat eine Stimme.",
        "Jedes Mitglied ist berechtigt, vom Vorstand die Ausfolgung der Statuten zu verlangen. Der Vorstand informiert die Mitglieder in jeder Mitgliederversammlung über die Tätigkeit und die finanzielle Gebarung des Vereins; auf Verlangen von mindestens einem Zehntel der Mitglieder auch sonst binnen vier Wochen (§ 20 VerG).",
        "Die Mitglieder sind verpflichtet, die Interessen des Vereins zu fördern, die Statuten und die Beschlüsse der Vereinsorgane zu beachten, die Beitrittsgebühr, die Mitgliedsbeiträge und die Entgelte fristgerecht zu bezahlen und Änderungen ihrer Daten (Anschrift, Bankverbindung, Zählpunkt, Erzeugungsanlage, Lieferant) unverzüglich mitzuteilen.",
        "Die Mitglieder stimmen der Teilnahme im Portal ihres Netzbetreibers zu und gestatten dem Verein den Bezug ihrer Viertelstundenwerte über die EDA-Plattform, soweit dies für die Zuordnung und Abrechnung erforderlich ist.",
        "Erzeugende Mitglieder bringen Energie nach Maßgabe ihres Erzeugervertrags ein. Eine Pflicht zur Volleinspeisung besteht nicht.",
      ],
    },
    {
      titel: "Vereinsorgane",
      absaetze: ["Organe des Vereins sind die Mitgliederversammlung, der Vorstand, die Rechnungsprüferinnen bzw. Rechnungsprüfer und das Schiedsgericht."],
    },
    {
      titel: "Mitgliederversammlung",
      absaetze: [
        "Die Mitgliederversammlung ist die Generalversammlung im Sinne des VerG 2002. Eine ordentliche Mitgliederversammlung findet {{gvTurnusText}} statt, jedenfalls aber mindestens alle fünf Jahre (§ 5 Abs. 2 VerG).",
        "Eine außerordentliche Mitgliederversammlung findet binnen vier Wochen statt auf Beschluss des Vorstands oder der ordentlichen Mitgliederversammlung, auf schriftlichen Antrag von mindestens einem Zehntel der Mitglieder, auf Verlangen der Rechnungsprüfer (§ 21 Abs. 5 VerG) oder auf Beschluss eines gerichtlich bestellten Kurators.",
        "Zu den Mitgliederversammlungen sind alle Mitglieder mindestens {{einladungsfristTage}} Tage vor dem Termin schriftlich, per E-Mail an die bekanntgegebene Adresse oder über das Mitgliederportal einzuladen. Die Einladung enthält die Tagesordnung.",
        { text: "Die Mitgliederversammlung kann auch virtuell (über eine Videoplattform bzw. das Mitgliederportal) oder hybrid abgehalten werden. Der Vorstand stellt sicher, dass die Teilnehmenden zweifelsfrei identifiziert werden, der Versammlung folgen, sich zu Wort melden und ihre Stimme abgeben können. Beschlüsse können auch schriftlich bzw. elektronisch im Umlauf gefasst werden, wenn kein ordentliches Mitglied binnen der Abstimmungsfrist widerspricht; Wahlen und Statutenänderungen sind davon ausgenommen.", wenn: "onlineGv" },
        "Anträge zur Mitgliederversammlung sind mindestens sieben Tage vor dem Termin beim Vorstand schriftlich, per E-Mail oder über das Mitgliederportal einzureichen. Gültige Beschlüsse – ausgenommen über einen Antrag auf Einberufung einer außerordentlichen Mitgliederversammlung – können nur zur Tagesordnung gefasst werden.",
        "Die Mitgliederversammlung ist bei Anwesenheit bzw. Teilnahme der Hälfte aller stimmberechtigten Mitglieder beschlussfähig. Ist sie zur festgesetzten Zeit nicht beschlussfähig, findet die Mitgliederversammlung 30 Minuten später mit derselben Tagesordnung statt und ist dann ohne Rücksicht auf die Anzahl der Erschienenen beschlussfähig.",
        "Wahlen und Beschlüsse erfolgen mit einfacher Mehrheit der abgegebenen gültigen Stimmen; Stimmenthaltungen gelten nicht als abgegebene Stimmen. Beschlüsse über eine Änderung der Statuten oder die Auflösung des Vereins bedürfen einer Mehrheit von zwei Dritteln der abgegebenen gültigen Stimmen. Die Übertragung des Stimmrechts auf ein anderes ordentliches Mitglied mit schriftlicher Vollmacht ist zulässig; ein Mitglied darf höchstens zwei weitere Mitglieder vertreten.",
        "Den Vorsitz führt die Obfrau bzw. der Obmann, bei Verhinderung die Stellvertretung. Über die Mitgliederversammlung ist ein Protokoll zu führen, das die gefassten Beschlüsse mit den Stimmenverhältnissen enthält.",
      ],
    },
    {
      titel: "Aufgaben der Mitgliederversammlung",
      absaetze: [
        "Der Mitgliederversammlung sind folgende Aufgaben vorbehalten:",
        {
          liste: [
            "Entgegennahme und Genehmigung des Rechenschaftsberichts und des Rechnungsabschlusses unter Einbindung der Rechnungsprüfer,",
            "Beschlussfassung über den Voranschlag,",
            "Wahl und Enthebung der Mitglieder des Vorstands und der Rechnungsprüfer,",
            "Genehmigung von Rechtsgeschäften zwischen Rechnungsprüfern und Verein,",
            "Entlastung des Vorstands,",
            "Festsetzung der Höhe der Beitrittsgebühr und der Mitgliedsbeiträge,",
            { text: "Beschlussfassung über die Tarife (Bezugs- und Einspeisepreise) und das Preisblatt,", wenn: "tarifeDurch=gv" },
            { text: "Festlegung von Grundsätzen der Preisgestaltung; die Tarife selbst beschließt der Vorstand,", wenn: "tarifeDurch!=gv" },
            "Beschlussfassung über Statutenänderungen und die freiwillige Auflösung des Vereins,",
            "Beratung und Beschlussfassung über sonstige auf der Tagesordnung stehende Fragen.",
          ],
        },
      ],
    },
    {
      titel: "Vorstand",
      absaetze: [
        "Der Vorstand ist das Leitungsorgan im Sinne des VerG 2002. Er besteht aus {{leitungText}}.",
        "Der Vorstand wird von der Mitgliederversammlung gewählt. Er hat bei Ausscheiden eines gewählten Mitglieds das Recht, an seine Stelle ein anderes wählbares Mitglied zu kooptieren; dazu ist die nachträgliche Genehmigung in der nächstfolgenden Mitgliederversammlung einzuholen.",
        "Die Funktionsperiode des Vorstands beträgt {{funktionsperiodeJahre}} Jahre; Wiederwahl ist möglich. Jede Funktion im Vorstand ist persönlich auszuüben.",
        "Der Vorstand wird von der Obfrau bzw. vom Obmann einberufen. Er ist beschlussfähig, wenn alle seine Mitglieder eingeladen wurden und mindestens die Hälfte von ihnen anwesend ist oder an einer Video- bzw. Telefonkonferenz teilnimmt. Er fasst seine Beschlüsse mit einfacher Stimmenmehrheit; bei Stimmengleichheit gibt die Stimme der bzw. des Vorsitzenden den Ausschlag. Umlaufbeschlüsse per E-Mail oder über das Portal sind zulässig, wenn kein Vorstandsmitglied widerspricht.",
        "Die Mitgliederversammlung kann jederzeit den gesamten Vorstand oder einzelne seiner Mitglieder entheben.",
      ],
    },
    {
      titel: "Aufgaben des Vorstands",
      absaetze: [
        "Dem Vorstand obliegt die Leitung des Vereins. Ihm kommen alle Aufgaben zu, die nicht durch die Statuten einem anderen Vereinsorgan zugewiesen sind. Insbesondere:",
        {
          liste: [
            "Einrichtung eines den Anforderungen des Vereins entsprechenden Rechnungswesens mit laufender Aufzeichnung der Einnahmen und Ausgaben und Führung eines Vermögensverzeichnisses (§§ 21, 22 VerG),",
            "Erstellung des Jahresvoranschlags, des Rechenschaftsberichts und des Rechnungsabschlusses,",
            "Vorbereitung und Einberufung der Mitgliederversammlung, Information der Mitglieder,",
            "Verwaltung des Vereinsvermögens, Aufnahme und Ausschluss von Mitgliedern,",
            "Abschluss und Pflege der Verträge mit dem Netzbetreiber, der Registrierung als Marktpartner und des Zugangs zur EDA-Plattform,",
            { text: "Festsetzung der Tarife unter Einhaltung der Informationspflichten gegenüber den Mitgliedern,", wenn: "tarifeDurch!=gv" },
            "Bestellung eines Organisators im Sinne des § 68 Abs. 2 ElWG und Abschluss der Dienstleistungs- und Auftragsverarbeitungsverträge; die Bestellung ist dem Netzbetreiber anzuzeigen,",
            "Aufnahme und Kündigung von Angestellten sowie Beauftragung Dritter.",
          ],
        },
      ],
    },
    {
      titel: "Vertretung und besondere Obliegenheiten",
      absaetze: [
        "Die Obfrau bzw. der Obmann vertritt den Verein nach außen. Schriftliche Ausfertigungen des Vereins bedürfen zu ihrer Gültigkeit der Unterschriften der Obfrau bzw. des Obmanns und der Schriftführerin bzw. des Schriftführers, in Geldangelegenheiten (vermögenswerte Dispositionen) der Obfrau bzw. des Obmanns und der Kassierin bzw. des Kassiers (Vier-Augen-Prinzip).",
        "Rechtsgeschäfte zwischen Vorstandsmitgliedern und dem Verein bedürfen der Zustimmung eines anderen Vorstandsmitglieds.",
        "Rechtsgeschäftliche Bevollmächtigungen, den Verein nach außen zu vertreten bzw. für ihn zu zeichnen, können ausschließlich von den in Abs. 1 genannten Vorstandsmitgliedern erteilt werden. Die Bevollmächtigung eines Organisators für die Kommunikation mit dem Netzbetreiber und die Abrechnung ist zulässig.",
        "Die Kassierin bzw. der Kassier ist für die ordnungsgemäße Geldgebarung verantwortlich, die Schriftführerin bzw. der Schriftführer für die Protokolle der Mitgliederversammlung und des Vorstands.",
      ],
    },
    {
      titel: "Rechnungsprüfer",
      absaetze: [
        "Zwei Rechnungsprüferinnen bzw. Rechnungsprüfer werden von der Mitgliederversammlung auf die Dauer von {{funktionsperiodeJahre}} Jahren gewählt; Wiederwahl ist möglich. Sie dürfen keinem Organ – mit Ausnahme der Mitgliederversammlung – angehören, dessen Tätigkeit Gegenstand der Prüfung ist (§ 5 Abs. 5 VerG).",
        "Den Rechnungsprüfern obliegen die laufende Geschäftskontrolle sowie die Prüfung der Finanzgebarung im Hinblick auf die Ordnungsmäßigkeit der Rechnungslegung und die statutengemäße Verwendung der Mittel binnen vier Monaten ab Erstellung der Einnahmen- und Ausgabenrechnung (§ 21 Abs. 2 VerG). Der Vorstand hat ihnen die erforderlichen Unterlagen vorzulegen und Auskünfte zu erteilen.",
        "Die Rechnungsprüfer berichten der Mitgliederversammlung über das Ergebnis der Prüfung. Stellen sie fest, dass der Vorstand beharrlich und auf schwerwiegende Weise gegen die Rechnungslegungspflichten verstößt, ohne dass Abhilfe zu erwarten ist, verlangen sie die Einberufung einer Mitgliederversammlung.",
      ],
    },
    {
      titel: "Schiedsgericht",
      absaetze: [
        "Zur Schlichtung von allen aus dem Vereinsverhältnis entstehenden Streitigkeiten ist das vereinsinterne Schiedsgericht berufen. Es ist eine Schlichtungseinrichtung im Sinne des § 8 VerG und kein Schiedsgericht nach den §§ 577 ff. ZPO.",
        "Das Schiedsgericht setzt sich aus drei ordentlichen Mitgliedern zusammen. Jeder Streitteil macht binnen 14 Tagen ein Mitglied namhaft; diese wählen binnen weiterer 14 Tage ein drittes Mitglied zum Vorsitz. Die Mitglieder des Schiedsgerichts dürfen keinem Organ angehören, dessen Tätigkeit Gegenstand der Streitigkeit ist.",
        "Das Schiedsgericht entscheidet nach Gewährung beiderseitigen Gehörs mit einfacher Stimmenmehrheit. Seine Entscheidungen sind vereinsintern endgültig. Der ordentliche Rechtsweg steht spätestens sechs Monate nach Anrufung des Schiedsgerichts offen (§ 8 Abs. 1 VerG).",
      ],
    },
    {
      titel: "Datenschutz",
      absaetze: [
        "Der Verein verarbeitet die personenbezogenen Daten seiner Mitglieder (Stammdaten, Zählpunkte, Bankverbindung, Viertelstundenwerte) zur Erfüllung des Vereinszwecks und der Mitgliedschaft (Art. 6 Abs. 1 lit. b DSGVO) sowie zur Erfüllung gesetzlicher Pflichten (Art. 6 Abs. 1 lit. c DSGVO). Viertelstundenwerte einzelner Mitglieder werden nur zweckgebunden für Zuordnung und Abrechnung verwendet; den Organen werden grundsätzlich zusammengefasste Werte angezeigt.",
        "Der Verein kann Auftragsverarbeiter (Art. 28 DSGVO), insbesondere einen Organisator, einsetzen. Die Mitglieder erhalten eine Datenschutzinformation nach Art. 13 DSGVO.",
      ],
    },
    {
      titel: "Freiwillige Auflösung des Vereins",
      absaetze: [
        "Die freiwillige Auflösung des Vereins kann nur in einer zu diesem Zweck einberufenen Mitgliederversammlung mit einer Mehrheit von zwei Dritteln der abgegebenen gültigen Stimmen beschlossen werden.",
        "Die Mitgliederversammlung beschließt über die Abwicklung und bestellt eine Abwicklerin bzw. einen Abwickler. Vor dem Ende der Abwicklung sind alle Zählpunkte beim Netzbetreiber abzumelden, der Vertrag mit dem Netzbetreiber zu kündigen, die Schlussabrechnung mit den Mitgliedern zu erstellen und die Registrierung als Marktpartner zu beenden.",
        "Das nach Abdeckung der Passiven verbleibende Vereinsvermögen fällt an {{vermoegensempfaenger}}. Eine Verteilung an die Mitglieder ist ausgeschlossen.",
        "Die Abwicklerin bzw. der Abwickler hat die freiwillige Auflösung binnen vier Wochen nach Beschlussfassung der Vereinsbehörde anzuzeigen (§ 28 Abs. 2 VerG). Bücher und Belege sind sieben Jahre aufzubewahren (§ 132 BAO).",
      ],
    },
  ],
  unterschriften: ["Ort, Datum", "Proponent/in bzw. Obfrau/Obmann", "Proponent/in bzw. Schriftführer/in"],
};

export const STATUTEN_EGEN = {
  id: "statuten_egen",
  kurz: "Satzung (Genossenschaft)",
  gruppe: "statuten",
  titel: "Satzung der „{{name}} eGen“",
  untertitel: "{{modellLabel}} als eingetragene Genossenschaft – Muster nach GenG, Stand ElWG 01.10.2026",
  art: "statuten",
  modelle: ["eeg", "beg"],
  rechtsformen: ["egen"],
  quelle: "GenG §§ 1, 2, 5, 15 ff., 24, 27 ff., 77; GenRevG 1997; EAG § 79 Abs. 2; ElWG §§ 66–68 (Details mit dem Revisionsverband abstimmen, zu bestätigen)",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "name", label: "Firma (ohne „eGen“)", pflicht: true },
    { id: "sitzOrt", label: "Sitz", pflicht: true },
    { id: "taetigkeitsgebiet", label: "Tätigkeitsbereich", pflicht: true },
    { id: "geschaeftsanteilEur", label: "Geschäftsanteil (Euro)", pflicht: true },
    { id: "kuendigungsfristMonate", label: "Kündigungsfrist (Monate zum Geschäftsjahresende)", pflicht: true },
    { id: "revisionsverband", label: "Revisionsverband", pflicht: true },
    { id: "aufsichtsrat", label: "Aufsichtsrat einrichten" },
    { id: "onlineGv", label: "Virtuelle Generalversammlung zulassen" },
    { id: "vermoegensempfaenger", label: "Vermögensverwendung bei Auflösung", pflicht: true },
  ],
  abschnitte: [
    { titel: "Firma und Sitz", absaetze: ["Die Genossenschaft führt die Firma „{{name}} eGen“.", "Sitz der Genossenschaft ist {{sitzOrt}}."] },
    {
      titel: "Zweck und Gegenstand",
      absaetze: [
        "Zweck der Genossenschaft ist die Förderung des Erwerbs und der Wirtschaft ihrer Mitglieder (§ 1 GenG) durch die gemeinsame Erzeugung, Speicherung, den Verbrauch und den Verkauf von elektrischer Energie aus erneuerbaren Quellen als {{modellLabel}} ({{rechtsgrundlage}}).",
        "Hauptzweck ist nicht die Erzielung finanzieller Gewinne; die Genossenschaft soll ihren Mitgliedern bzw. dem Gebiet {{taetigkeitsgebiet}} vorrangig ökologische, wirtschaftliche oder sozialgemeinschaftliche Vorteile bringen.",
        "Gegenstand des Unternehmens sind insbesondere die Organisation der gemeinsamen Energienutzung nach § 68 ElWG, die Errichtung, der Erwerb, die Pacht und der Betrieb von Erzeugungs- und Speicheranlagen sowie die Abrechnung mit den Mitgliedern.",
        { text: "Die Genossenschaft wird ausschließlich von natürlichen Personen, Gebietskörperschaften und kleinen Unternehmen kontrolliert, die nicht als Elektrizitätsunternehmen tätig sind; diese halten jedenfalls die für eine Satzungsänderung erforderliche Mehrheit (§ 67 Abs. 3 ElWG).", wenn: "modell=beg" },
      ],
    },
    {
      titel: "Mitgliedschaft",
      absaetze: [
        "Mitglieder können werden: {{mitgliederkreisText}}. Die Teilnahme ist offen und freiwillig.",
        "Die Mitgliedschaft wird durch eine unterzeichnete Beitrittserklärung und die Zulassung durch den Vorstand erworben. Die Zulassung darf nur aus sachlichen Gründen verweigert werden.",
        "Die Mitglieder nehmen mit ihren Zählpunkten nach Maßgabe ihres Teilnahmevertrags an der gemeinsamen Energienutzung teil; die Zustimmung im Portal des Netzbetreibers ist Voraussetzung.",
      ],
    },
    {
      titel: "Geschäftsanteile und Haftung",
      absaetze: [
        "Der Geschäftsanteil beträgt {{geschaeftsanteilEur}} Euro und ist bei Zulassung zur Gänze einzuzahlen. Jedes Mitglied hat mindestens einen Geschäftsanteil zu übernehmen.",
        "Die Genossenschaft ist eine Genossenschaft mit beschränkter Haftung. Die Mitglieder haften im Fall der Insolvenz bzw. Liquidation mit ihren Geschäftsanteilen und zusätzlich mit einem Betrag in Höhe ihrer Geschäftsanteile (Haftsumme) (zu bestätigen).",
      ],
    },
    {
      titel: "Ausscheiden",
      absaetze: [
        "Ein Mitglied scheidet durch Kündigung, Tod, Ausschluss oder Übertragung aller Geschäftsanteile aus.",
        "Die Kündigung ist schriftlich mit einer Frist von {{kuendigungsfristMonate}} Monaten zum Ende eines Geschäftsjahres zu erklären. Die Teilnahme der Zählpunkte an der Energiezuordnung endet mit Abmeldung beim Netzbetreiber; eine rückwirkende Abmeldung ist nicht möglich.",
        "Das ausgeschiedene Mitglied hat Anspruch auf Auszahlung seines Geschäftsguthabens nach Feststellung des Jahresabschlusses; an Rücklagen und sonstigem Vermögen besteht kein Anspruch.",
      ],
    },
    {
      titel: "Organe",
      absaetze: [
        { text: "Organe der Genossenschaft sind der Vorstand, der Aufsichtsrat und die Generalversammlung.", wenn: "aufsichtsrat" },
        { text: "Organe der Genossenschaft sind der Vorstand und die Generalversammlung. Ein Aufsichtsrat wird eingerichtet, sobald dies gesetzlich vorgeschrieben ist oder die Generalversammlung es beschließt (§ 24 GenG, zu bestätigen).", wenn: "!aufsichtsrat" },
        "Der Vorstand besteht aus mindestens zwei Mitgliedern, die von der Generalversammlung auf die Dauer von {{funktionsperiodeJahre}} Jahren gewählt werden. Er führt die Geschäfte und vertritt die Genossenschaft durch zwei Vorstandsmitglieder gemeinsam.",
        { text: "Der Aufsichtsrat besteht aus mindestens drei Mitgliedern; er überwacht die Geschäftsführung des Vorstands.", wenn: "aufsichtsrat" },
        "Der Vorstand kann einen Organisator im Sinne des § 68 Abs. 2 ElWG bestellen; die Bestellung ist dem Netzbetreiber anzuzeigen.",
      ],
    },
    {
      titel: "Generalversammlung",
      absaetze: [
        "Die ordentliche Generalversammlung findet jährlich innerhalb der ersten acht Monate nach Ende des Geschäftsjahres statt (zu bestätigen). Sie beschließt insbesondere über den Jahresabschluss, die Verwendung des Ergebnisses, die Entlastung, Wahlen, Satzungsänderungen und die Auflösung.",
        "Die Einberufung erfolgt mindestens {{einladungsfristTage}} Tage vorher schriftlich bzw. per E-Mail unter Angabe der Tagesordnung.",
        { text: "Die Generalversammlung kann virtuell oder hybrid abgehalten werden, sofern Identifikation, Teilnahme und Stimmabgabe aller Mitglieder sichergestellt sind.", wenn: "onlineGv" },
        "Jedes Mitglied hat eine Stimme. Beschlüsse werden mit einfacher Mehrheit gefasst; Satzungsänderungen und die Auflösung bedürfen einer Mehrheit von zwei Dritteln der abgegebenen Stimmen.",
      ],
    },
    {
      titel: "Revision",
      absaetze: ["Die Genossenschaft ist Mitglied des Revisionsverbands {{revisionsverband}} und unterliegt der Revision nach dem Genossenschaftsrevisionsgesetz 1997. Der Revisionsbericht ist der Generalversammlung vorzulegen."],
    },
    {
      titel: "Geschäftsjahr, Jahresabschluss und Ergebnisverwendung",
      absaetze: [
        "Das Geschäftsjahr ist das Kalenderjahr.",
        "Überschüsse dienen vorrangig der Preisgestaltung, Rücklagen und Investitionen in Erzeugungs- und Speicheranlagen. Eine Rückvergütung an die Mitglieder nach dem Umfang ihrer Teilnahme kann die Generalversammlung beschließen; eine Gewinnerzielung als Hauptzweck ist ausgeschlossen.",
      ],
    },
    {
      titel: "Datenschutz",
      absaetze: ["Die Genossenschaft verarbeitet personenbezogene Daten ihrer Mitglieder einschließlich der Viertelstundenwerte zweckgebunden für Zuordnung und Abrechnung (Art. 6 Abs. 1 lit. b DSGVO) und kann Auftragsverarbeiter nach Art. 28 DSGVO einsetzen."],
    },
    {
      titel: "Auflösung",
      absaetze: [
        "Die Auflösung kann die Generalversammlung mit einer Mehrheit von zwei Dritteln der abgegebenen Stimmen beschließen. Vor der Liquidation sind alle Zählpunkte beim Netzbetreiber abzumelden und der Vertrag mit dem Netzbetreiber zu kündigen.",
        "Das nach Rückzahlung der Geschäftsguthaben verbleibende Vermögen fällt an {{vermoegensempfaenger}}.",
      ],
    },
  ],
  unterschriften: ["Ort, Datum", "Gründungsmitglied", "Gründungsmitglied"],
};
