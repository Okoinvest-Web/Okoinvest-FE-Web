// src/data/faq.js
//
// Zentrale Fragen & Antworten der ÖkoInvest-Website.
// - FAQ_GRUPPEN speist die Seite /faq (Suche, Filter, FAQPage-Schema).
// - Die thematischen Listen (FAQ_VPP, FAQ_RESTSTROM …) nutzen die Fachseiten.
// Zahlen kommen ausschließlich aus src/lib/invest/markt.js.
//
// Regeln: Antworten als Klartext (für Schema), Sie-Form, vorsichtig bei
// Rechtsfragen („in der Regel", „nach aktuellem Stand"), keine Zusagen zu
// Renditen, keine erfundenen Referenzen.

import { PACHT, AGRI, FREIFLAECHE, PROVISION, PHASEN, STROM, KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const spanne = (s, einheit = "") => `${fmt(s.min)}–${fmt(s.max)}${einheit}`;
const ct = (n) => fmt(n, n < 1 ? 2 : 1);
const hebelMin = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
const hebelMax = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);
const beschaffung = STROM.bestandteile.find((b) => b.id === "beschaffung")?.ct;
const fixCt = STROM.bestandteile.filter((b) => !b.beeinflussbar).reduce((s, b) => s + b.ct, 0);

/* ------------------------------------------------------------------ */
/* Virtuelles Kraftwerk                                                */
/* ------------------------------------------------------------------ */

export const FAQ_VPP = [
  {
    q: "Was ist ein virtuelles Kraftwerk?",
    a: "Ein virtuelles Kraftwerk (Virtual Power Plant, VPP) verbindet viele dezentrale Anlagen – Solarparks, Speicher, steuerbare Verbraucher – über eine gemeinsame Leitwarte. Nach außen tritt der Verbund wie ein großes Kraftwerk auf: Er kann Strom vermarkten, Flexibilität anbieten und Fahrpläne einhalten, die eine einzelne Anlage allein nicht erreichen würde.",
  },
  {
    q: "Was bedeutet Direktvermarktung?",
    a: "Neuere Anlagen ab 100 kW müssen ihren Strom in Deutschland in der Regel direkt an der Börse bzw. über einen Direktvermarkter verkaufen. Zusätzlich zum Markterlös erhält der Betreiber eine Marktprämie nach EEG, sofern die Anlage gefördert ist. Der Direktvermarkter prognostiziert die Erzeugung, handelt die Mengen und steuert die Anlage fern – etwa bei negativen Preisen.",
  },
  {
    q: "Welche Rolle spielen Speicher im virtuellen Kraftwerk?",
    a: "Speicher verschieben Solarstrom aus der Mittagsspitze in die teuren Abendstunden, glätten Prognosefehler und können Regelleistung anbieten. Im Verbund lassen sich so Viertelstunden mit niedrigen oder negativen Preisen gezielt nutzen – davon profitieren sowohl die Erlöse der Parks als auch die Beschaffung für den Reststrom-Pool.",
  },
  {
    q: "Was hat Redispatch 2.0 mit dem virtuellen Kraftwerk zu tun?",
    a: "Seit Oktober 2021 werden in Deutschland auch Erzeugungsanlagen ab 100 kW in das Engpassmanagement der Netzbetreiber einbezogen. Betreiber müssen Stammdaten, Planungsdaten und Nichtverfügbarkeiten melden und Abregelungen umsetzen. In einem gut organisierten Verbund werden diese Prozesse gebündelt, meist zusammen mit dem Direktvermarkter als Einsatzverantwortlichem.",
  },
  {
    q: "Kann ich meine eigene Anlage in das virtuelle Kraftwerk einbringen?",
    a: "Grundsätzlich ja, wenn die Anlage fernsteuerbar ist und über eine viertelstündliche Messung verfügt. Wir prüfen im Einzelfall, ob sich die Einbindung wirtschaftlich lohnt – bei kleinen Anlagen übersteigen die Kosten für Messung und Steuerung mitunter den Nutzen. Sprechen Sie uns über das Formular an.",
  },
  {
    q: "Ist ÖkoInvest ein Energieversorger?",
    a: "Nein. ÖkoInvest entwickelt Solarkraftwerke, organisiert den Verbund und die gemeinsame Beschaffung. Die Belieferung mit Strom erfolgt über einen lizenzierten Energielieferanten bzw. Bilanzkreisverantwortlichen, mit dem wir zusammenarbeiten. Sie erhalten dafür einen regulären Liefervertrag.",
  },
];

/* ------------------------------------------------------------------ */
/* Reststrom-Pool                                                      */
/* ------------------------------------------------------------------ */

export const FAQ_RESTSTROM = [
  {
    q: "Was ist Reststrom?",
    a: "Reststrom ist der Strom, den ein Unternehmen trotz eigener Photovoltaik und Speicher weiterhin aus dem Netz beziehen muss – nachts, im Winter, bei Schlechtwetter oder in Schichten außerhalb der Sonnenstunden. Bei den meisten Betrieben bleibt das der größere Teil des Verbrauchs.",
  },
  {
    q: "Wie viel kann ich mit dem Pool sparen?",
    a: `Der Pool wirkt auf die Beschaffungskomponente Ihres Strompreises (nach unserer Einschätzung für Neuverträge 2026 rund ${ct(beschaffung)} ct/kWh netto). Aus Bündelung, Solar-PPA und Flexibilität halten wir zusammen etwa ${ct(hebelMin)} bis ${ct(hebelMax)} ct/kWh für erreichbar – je nach Lastprofil, Menge und Marktlage. Netzentgelte, Umlagen und Steuern (zusammen rund ${ct(fixCt)} ct/kWh) sind nicht verhandelbar. Der Reststrom-Rechner zeigt Ihre persönliche Spanne.`,
  },
  {
    q: "Muss ich eine Anlage von ÖKOVOLT haben, um teilzunehmen?",
    a: "Nein. Der Pool ist aus den Kunden entstanden, denen ÖKOVOLT Photovoltaik und Speicher baut – er steht aber auch Unternehmen ohne eigene Anlage offen. Mit eigener PV und Speicher wird Ihr Profil für den Pool allerdings attraktiver, weil Sie Lastspitzen und Mittagsbezug bereits selbst decken.",
  },
  {
    q: "Ab welchem Verbrauch lohnt sich der Pool?",
    a: "Als Orientierung ab etwa 100 MWh Jahresverbrauch. In Deutschland ist ab 100.000 kWh in der Regel eine registrierende Leistungsmessung (RLM) mit Viertelstundenwerten eingebaut – das erleichtert die strukturierte Beschaffung. Kleinere Betriebe mit Standardlastprofil (SLP) prüfen wir gern ebenfalls, der Hebel ist dort aber meist geringer.",
  },
  {
    q: "Wie läuft der Wechsel in den Pool ab?",
    a: "Sie schicken uns Lastgang oder Jahresverbrauch und Ihren aktuellen Vertrag. Wir analysieren Profil und Preisbestandteile, erstellen ein Angebot und übernehmen auf Wunsch die Kündigung. Entscheidend sind die Kündigungsfristen Ihres bestehenden Vertrags – viele Gewerbeverträge laufen zum Kalenderjahr und müssen Monate vorher gekündigt werden.",
  },
  {
    q: "Wer liefert den Strom und wer haftet dafür?",
    a: "Die Belieferung übernimmt ein lizenzierter Energielieferant, der den Bilanzkreis führt. ÖkoInvest bündelt die Nachfrage, bringt Solarstrom aus den Parks der Gruppe ein und steuert die Beschaffungsstrategie. Ihr Liefervertrag regelt Preise, Laufzeit und Versorgungssicherheit wie bei jedem anderen Stromliefervertrag.",
  },
  {
    q: "Was bedeutet die Stromsteuer-Entlastung ab 2026?",
    a: `Seit 2026 zahlen Unternehmen des produzierenden Gewerbes sowie der Land- und Forstwirtschaft in Deutschland für betrieblich genutzten Strom nur noch den EU-Mindestsatz von ${ct(STROM.stromsteuerProduzierend)} ct/kWh statt ${ct(STROM.bestandteile.find((b) => b.id === "stromsteuer")?.ct)} ct/kWh. Die Entlastung gibt es nicht automatisch, sie wird beim Hauptzollamt beantragt. Sie ist keine Leistung des Pools, gehört aber in jede ehrliche Preisrechnung.`,
  },
  {
    q: "Schützt mich der Pool vor steigenden Strompreisen?",
    a: "Er verringert das Risiko, schließt es aber nicht aus. Statt den gesamten Jahresbedarf an einem Stichtag einzukaufen, beschafft der Pool in mehreren Tranchen über einen längeren Zeitraum. Das glättet Preisspitzen. Steigen die Großhandelspreise dauerhaft, steigt auch der Poolpreis – nur weniger sprunghaft.",
  },
  {
    q: "Gibt es den Pool auch in Österreich und der Schweiz?",
    a: "Wir starten mit Deutschland, weil dort die meisten Pool-Kunden der Gruppe sitzen. In Österreich bieten Erneuerbare-Energie-Gemeinschaften zusätzliche Möglichkeiten. In der Schweiz haben Endverbraucher erst ab 100 MWh Jahresverbrauch freien Zugang zum Strommarkt – darunter bleibt man in der Grundversorgung. Sprechen Sie uns für AT und CH gern an; wir prüfen die Möglichkeiten im Einzelfall.",
  },
];

/* ------------------------------------------------------------------ */
/* Energiegemeinschaften                                               */
/* ------------------------------------------------------------------ */

export const FAQ_GEMEINSCHAFT = [
  {
    q: "Was ist Energy Sharing nach § 42c EnWG?",
    a: "Seit dem 1. Juni 2026 können Letztverbraucher in Deutschland Strom aus gemeinsam betriebenen Erneuerbare-Energien-Anlagen über das öffentliche Netz teilen – zunächst innerhalb des Bilanzierungsgebiets eines Verteilnetzbetreibers, ab dem 1. Juni 2028 auch in angrenzenden Gebieten derselben Regelzone. Der geteilte Strom ist kein Eigenverbrauch: Netzentgelte und Umlagen fallen nach aktuellem Stand weiterhin an. Einige Netzbetreiber haben angekündigt, die Abwicklung erst später technisch umsetzen zu können.",
  },
  {
    q: "Was ist in Österreich der Unterschied zwischen EEG und BEG?",
    a: "Erneuerbare-Energie-Gemeinschaften (EEG) sind auf ein Nahebereich-Netzgebiet begrenzt und erhalten dafür reduzierte Netzentgelte auf den geteilten Strom – lokal (bis Netzebene 6/7) nach aktuellem Stand 57 %, regional 28 % auf den Arbeitspreis des Netznutzungsentgelts. Bürgerenergiegemeinschaften (BEG) dürfen österreichweit tätig sein, erhalten aber keine Netzentgeltreduktion. Mit dem neuen Elektrizitätswirtschaftsgesetz (ElWG) werden die Regeln ab Oktober 2026 neu gefasst; bestehende Gemeinschaften bleiben bestehen.",
  },
  {
    q: "Was ist eine LEG in der Schweiz?",
    a: "Seit dem 1. Januar 2026 können sich Endverbraucher, Produzenten und Speicherbetreiber innerhalb derselben Gemeinde zu einer lokalen Elektrizitätsgemeinschaft (LEG) zusammenschließen und lokal erzeugten Strom über das Verteilnetz teilen. Auf den geteilten Strom gibt es einen Abschlag auf das Netznutzungsentgelt – 40 % auf derselben Netzebene, 20 % über mehrere Netzebenen. Daneben bestehen weiterhin der Zusammenschluss zum Eigenverbrauch (ZEV) und der virtuelle ZEV (vZEV) ohne Nutzung des öffentlichen Netzes.",
  },
  {
    q: "Kann ein Solarpark eine Energiegemeinschaft versorgen?",
    a: "In Österreich und der Schweiz grundsätzlich ja, sofern Park und Teilnehmer im zulässigen Nahebereich liegen. In Deutschland setzt Energy Sharing voraus, dass die Anlage den teilnehmenden Verbrauchern zugeordnet ist – etwa weil sie ihnen gemeinsam gehört oder von ihnen betrieben wird. Eine Beteiligung über eine Genossenschaft kann hier der Schlüssel sein. Wir prüfen das je Standort.",
  },
  {
    q: "Welche Rolle übernimmt ÖkoInvest in einer Energiegemeinschaft?",
    a: "Wir bringen Strom aus Parks der Gruppe ein, unterstützen bei Gründung, Satzung und Anmeldung beim Netzbetreiber und können – geplant – die laufende Abrechnung und Zuordnung der Mengen als Dienstleister übernehmen. Die Gemeinschaft selbst gehört ihren Mitgliedern.",
  },
  {
    q: "Brauche ich ein intelligentes Messsystem?",
    a: "Ja, in allen drei Ländern werden geteilte Mengen viertelstündlich zugeordnet. Dafür ist ein Smart Meter bzw. ein intelligentes Messsystem mit Viertelstundenwerten nötig, das der Netzbetreiber einbaut.",
  },
];

/* ------------------------------------------------------------------ */
/* Genossenschaft                                                      */
/* ------------------------------------------------------------------ */

export const FAQ_GENOSSENSCHAFT = [
  {
    q: "Gibt es die Energiegenossenschaft schon?",
    a: "Die Genossenschaft ist im Aufbau. Sie können Ihr Interesse unverbindlich registrieren – wir informieren Sie, sobald Satzung, Beteiligungsunterlagen und das erste Projekt feststehen. Eine Zeichnung von Anteilen über die Website ist nicht möglich und nicht geplant, ohne dass Sie vorher alle Unterlagen erhalten haben.",
  },
  {
    q: "Wer kann Mitglied werden?",
    a: "Geplant ist eine Genossenschaft für Bürgerinnen und Bürger aus den Standortregionen, Landwirte und Flächeneigentümer, Gemeinden sowie Unternehmen. Landwirte, die Flächen für einen Park zur Verfügung stellen, sollen bevorzugt Mitglied werden können.",
  },
  {
    q: "Wie funktioniert die Mitbestimmung?",
    a: "In einer Genossenschaft hat grundsätzlich jedes Mitglied eine Stimme – unabhängig davon, wie viele Anteile es hält (§ 43 GenG in Deutschland). Die Generalversammlung wählt den Aufsichtsrat, beschließt über den Jahresabschluss und die Verwendung eines Überschusses.",
  },
  {
    q: "Welche Risiken hat eine Beteiligung?",
    a: "Eine Genossenschaftsbeteiligung ist unternehmerisches Kapital. Im schlechtesten Fall kann die Einlage ganz verloren gehen. Anteile sind nicht börsennotiert und nur eingeschränkt übertragbar; die Kündigung ist an Fristen gebunden, die die Satzung festlegt. Es gibt keine gesetzliche Einlagensicherung. Ausschüttungen sind nicht garantiert und hängen vom Ergebnis und von Beschlüssen der Generalversammlung ab.",
  },
  {
    q: "Welche Rendite kann ich erwarten?",
    a: "Wir machen dazu bewusst keine Zusagen. Wie hoch ein möglicher Überschuss ausfällt, hängt von Erträgen, Strompreisen, Finanzierung und Kosten der Parks ab, an denen die Genossenschaft beteiligt ist. Diese Seite ist keine Anlageberatung und kein Angebot zum Erwerb von Anteilen.",
  },
  {
    q: "Braucht die Genossenschaft einen Prospekt?",
    a: "In Deutschland sind Anteile an eingetragenen Genossenschaften unter bestimmten Voraussetzungen von der Prospektpflicht nach dem Vermögensanlagengesetz ausgenommen – unter anderem, wenn für den Vertrieb keine erfolgsabhängige Vergütung gezahlt wird. Die Mitglieder müssen dennoch vorab die wesentlichen Informationen erhalten. Für Österreich und die Schweiz gelten eigene Regeln. Die konkrete Ausgestaltung lassen wir vor dem Start rechtlich prüfen.",
  },
  {
    q: "Wer prüft die Genossenschaft?",
    a: "Eingetragene Genossenschaften müssen in Deutschland Mitglied eines genossenschaftlichen Prüfungsverbands sein, der Geschäftsführung und wirtschaftliche Verhältnisse regelmäßig prüft. In Österreich übernimmt diese Aufgabe ein Revisionsverband. Das gilt als einer der Gründe, warum Genossenschaften zu den insolvenzärmsten Rechtsformen zählen – eine Garantie ist es nicht.",
  },
];

/* ------------------------------------------------------------------ */
/* Prozess                                                             */
/* ------------------------------------------------------------------ */

export const FAQ_PROZESS = [
  {
    q: "Wie lange dauert es von der Fläche bis zum fertigen Solarpark?",
    a: `Realistisch zwei bis vier Jahre. Der größte Zeitblock ist das Planungsrecht (B-Plan in Deutschland, Umwidmung in Österreich) und die Netzanschlusszusage. Der Bau selbst dauert meist nur wenige Monate. Wir entwickeln rund 50 MWp pro Jahr neu – baureif werden diese Projekte in der Regel erst Jahre später.`,
  },
  {
    q: "Was sehe ich im Portal?",
    a: "Ihren Vorgang mit dem aktuellen Status, alle Dokumente (Verträge, Gutachten, Pläne), Nachrichten mit Ihrem Ansprechpartner und die nächsten Schritte. Anfragen, die Sie vor der Registrierung gestellt haben, erscheinen automatisch, wenn Sie sich mit derselben E-Mail-Adresse registrieren.",
  },
  {
    q: "Was kostet mich die Zusammenarbeit?",
    a: `${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)}; Investoren nutzen die Projektbörse ${PROVISION.kaeufer.text.replace(/^für Investoren /, "")}. Anbieter von Projekten zahlen ${PROVISION.verkaeufer.text}.`,
  },
  {
    q: "Was passiert, wenn das Projekt scheitert?",
    a: "Das kommt vor – etwa wenn der Gemeinderat keinen Aufstellungsbeschluss fasst oder kein Netzanschluss möglich ist. Für Flächeneigentümer entstehen dadurch keine Kosten; der Nutzungsvertrag regelt, wann er endet. Im Portal sehen Sie jederzeit, in welcher Phase Ihr Projekt steht und woran es gerade hängt.",
  },
];

/* ------------------------------------------------------------------ */
/* Kontakt                                                             */
/* ------------------------------------------------------------------ */

export const FAQ_KONTAKT = [
  {
    q: "Wie schnell bekomme ich eine Antwort?",
    // QM Welle 1: keine öffentliche Zeitangabe vor 4 Wochen gemessenem Nachweis (Masterplan Abschnitt 5)
    a: "Jede Anfrage wird als Vorgang angelegt und einer zuständigen Person für Ihr Land zugeordnet, die sich persönlich bei Ihnen meldet. Den Stand sehen Sie nach der Registrierung im Portal.",
  },
  {
    q: "Warum gibt es keine Telefonnummer auf der Website?",
    a: "Wir bauen den Kundendienst der Plattform gerade auf. Damit keine Anfrage verloren geht, laufen alle Anliegen derzeit über die Formulare und das Portal. Wenn Sie einen Rückruf wünschen, tragen Sie Ihre Nummer im Formular ein – wir melden uns.",
  },
  {
    q: "Welche Unterlagen sollte ich bereithalten?",
    a: "Für Flächen: Flurstücke oder ein Kartenausschnitt, Größe und aktuelle Nutzung. Für den Reststrom-Pool: Jahresverbrauch oder Lastgang und Ihr aktueller Stromvertrag. Für Projekte: Entwicklungsstand, Netzanfrage und Flächensicherung. Alles Weitere können Sie später im Portal hochladen.",
  },
  {
    q: "Kann ich Sie in Ostermiething besuchen?",
    a: "Gern nach Terminvereinbarung. Schreiben Sie uns über das Formular, wann es Ihnen passt – spontane Besuche können wir leider nicht immer ermöglichen.",
  },
];

/* ------------------------------------------------------------------ */
/* Zentrale FAQ-Seite: Gruppen                                         */
/* ------------------------------------------------------------------ */

const FLAECHE = [
  {
    q: "Welche Flächen eignen sich für einen Solarpark?",
    a: `Ab etwa ${fmt(FREIFLAECHE.mindestHa)} ha wird ein Solarpark in der Regel wirtschaftlich, deutlich besser sind zusammenhängende Flächen ab 10 ha. Entscheidend sind außerdem die Entfernung zum Netzverknüpfungspunkt, Schutzgebiete, Hangneigung und Verschattung. In Deutschland sind Flächen in benachteiligten Gebieten sowie Randstreifen bis 500 m entlang von Autobahnen und Schienenwegen besonders gefragt; entlang dieser Trassen gilt in einem 200-m-Korridor zudem eine baurechtliche Privilegierung.`,
  },
  {
    q: "Wie viel Pacht erhalte ich für meine Fläche?",
    a: `Für Freiflächen-Photovoltaik werden im DACH-Raum derzeit meist ${spanne(PACHT.freiflaecheProHa, " € je Hektar und Jahr")} gezahlt, in vielen Fällen um ${fmt(PACHT.freiflaecheProHa.mittel)} €. Die Höhe hängt vor allem von Netzanschluss, Einstrahlung, Flächengröße und Vergütungsmodell ab. Üblich sind eine jährliche Indexierung und bis zum Baubeginn eine Reservierungsprämie.`,
  },
  {
    q: "Wie lange läuft ein Pachtvertrag für einen Solarpark?",
    a: `Üblich sind ${PACHT.laufzeit} Jahre ab Inbetriebnahme, häufig mit Verlängerungsoptionen (${PACHT.verlaengerung}). Der Vertrag regelt außerdem den vollständigen Rückbau nach Ende der Nutzung – abgesichert durch eine Rückbaubürgschaft oder Rücklage.`,
  },
  {
    q: "Was kostet mich die Prüfung meiner Fläche?",
    a: `Nichts – die Plattform ist ${PROVISION.flaeche.text}. Den Flächencheck können Sie online in wenigen Minuten ausfüllen; die ausführliche Prüfung übernimmt unser Projektteam.`,
  },
  {
    q: "Verliert meine Fläche ihren Status als landwirtschaftliches Vermögen?",
    a: "Das Jahressteuergesetz 2024 hat die Lage für verpachtete PV-Flächen in Deutschland verbessert: Unter bestimmten Voraussetzungen bleiben sie bei Erbschaft- und Grundsteuer dem land- und forstwirtschaftlichen Vermögen zugeordnet. Die Einzelheiten hängen vom Betrieb ab – bitte stimmen Sie das mit Ihrer Steuerberatung ab.",
  },
];

const LANDWIRTE = [
  {
    q: "Was unterscheidet Agri-PV von einem normalen Solarpark?",
    a: `Bei Agri-PV bleibt die Fläche landwirtschaftlich genutzt. Nach DIN SPEC 91434 dürfen die Aufbauten höchstens ${fmt(AGRI.flaechenverlustMaxKat1 * 100)} % (Kategorie 1) bzw. ${fmt(AGRI.flaechenverlustMaxKat2 * 100)} % (Kategorie 2) der Fläche beanspruchen, und der landwirtschaftliche Ertrag muss mindestens ${fmt(AGRI.mindestErtrag * 100)} % des Referenzertrags erreichen.`,
  },
  {
    q: "Bekomme ich für Agri-PV-Flächen weiter GAP-Direktzahlungen?",
    a: `In Deutschland bleiben Agri-PV-Flächen, die die Anforderungen der DIN SPEC 91434 erfüllen, in der Regel zu ${fmt(AGRI.gapFoerderfaehig * 100)} % förderfähig. Für klassische Freiflächenanlagen entfällt die Förderfähigkeit dagegen meist.`,
  },
  {
    q: "Welche Möglichkeiten habe ich als Landwirt?",
    a: "Drei Wege: Sie verpachten die Fläche und bewirtschaften sie unter den Modulen weiter; Sie investieren selbst und betreiben die Anlage; oder ein Investor baut und betreibt die Anlage, während Sie über die geplante Energiegenossenschaft als Mitglied beteiligt sind. Der Agri-PV-Rechner vergleicht die Wege.",
  },
  {
    q: "Brauche ich für Agri-PV einen Bebauungsplan?",
    a: `Nicht immer. In Deutschland sind Agri-PV-Anlagen mit räumlich-funktionalem Bezug zu einem land- oder forstwirtschaftlichen Betrieb bis zu einer Grundfläche von ${fmt(AGRI.privilegierungHa, 1)} ha im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 9 BauGB). Größere Anlagen brauchen in der Regel einen B-Plan.`,
  },
  {
    q: "Wie hoch ist die Pacht bei Agri-PV?",
    a: `Weil die Landwirtschaft auf der Fläche bleibt, liegt die Pacht meist niedriger als beim reinen Solarpark – als Orientierung ${spanne(PACHT.agriProHa, " € je Hektar und Jahr")}. Dafür behalten Sie Ernte und in der Regel den Großteil der Direktzahlungen.`,
  },
];

const INVESTOREN = [
  {
    q: "Welche Projekte finde ich auf der Projektbörse?",
    a: `Projekte in allen Phasen – von der gesicherten Fläche über Baurecht bis zum baureifen Projekt (RTB) und zu Bestandsanlagen. Je Phase unterscheiden sich Risiko und Preis erheblich: von etwa ${fmt(PHASEN[0].preisProKwp.min)} €/kWp für gesicherte Flächen bis ${fmt(PHASEN[4].preisProKwp.max)} €/kWp für baureife Projekte.`,
  },
  {
    q: "Was kostet die Projektbörse für Investoren?",
    a: `Sie ist ${PROVISION.kaeufer.text}. Die Provision trägt der Verkäufer – und nur bei erfolgreichem Abschluss.`,
  },
  {
    q: "Wie komme ich an Details und Unterlagen eines Projekts?",
    a: "Öffentlich sehen Sie einen anonymisierten Exposé-Teaser. Nach Registrierung und Unterzeichnung einer Vertraulichkeitsvereinbarung (NDA) erhalten Sie Zugang zu Standortdaten und Datenraum.",
  },
  {
    q: "Welche Rendite bringt ein Solarpark?",
    a: "Das hängt von Kaufpreis, Errichtungskosten, Vergütungsmodell (EEG-Zuschlag oder PPA), Finanzierung und Standort ab. Wir versprechen keine Renditen. Der Solarpark-Renditerechner zeigt Projekt- und Eigenkapitalrendite für Ihre eigenen Annahmen.",
  },
  {
    q: "Wie groß ist die Pipeline von ÖkoInvest?",
    a: "Wir nehmen rund 50 MWp pro Jahr neu in die Entwicklung. Bis diese Projekte baureif sind, vergehen in der Regel mehrere Jahre – deshalb nennen wir bewusst keine Fertigstellungszahlen.",
  },
];

const PROJEKTBOERSE = [
  {
    q: "Was kostet es, ein Projekt einzustellen?",
    a: `Das Einstellen ist kostenlos. Verkäufer zahlen ${PROVISION.verkaeufer.text}.`,
  },
  {
    q: "Welche Unterlagen brauche ich für ein Inserat?",
    a: "Mindestens Lage und Größe, Stand der Flächensicherung, Netzanfrage oder -zusage und den Stand des Planungsrechts. Gutachten, Pläne und Verträge können Sie später in den Datenraum laden – sie werden erst nach NDA freigegeben.",
  },
  {
    q: "Bleibt mein Projekt vertraulich?",
    a: "Ja. Öffentlich erscheint nur ein anonymisierter Teaser ohne exakten Standort. Details sieht erst, wer registriert ist und die Vertraulichkeitsvereinbarung akzeptiert hat. Auf Wunsch stellen wir Ihr Projekt nur ausgewählten Investoren vor.",
  },
  {
    q: "Wie wird der Preis meines Projekts eingeschätzt?",
    a: "Maßgeblich sind Entwicklungsphase, Netzanschluss, Größe, Vergütungsmodell und Standort. Die Projektbewertung zeigt übliche Spannen je kWp; eine belastbare Einschätzung bekommen Sie nach der Prüfung durch unser Team.",
  },
];

const STROM_POOL = [
  FAQ_RESTSTROM[0],
  FAQ_RESTSTROM[1],
  FAQ_RESTSTROM[2],
  FAQ_RESTSTROM[3],
  FAQ_RESTSTROM[6],
  FAQ_VPP[0],
  FAQ_VPP[5],
  FAQ_GEMEINSCHAFT[0],
  FAQ_GENOSSENSCHAFT[0],
  {
    q: "Wie profitieren Gemeinden von einem Solarpark?",
    a: `In Deutschland können Betreiber der Standortgemeinde nach § 6 EEG freiwillig bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je eingespeister kWh zahlen; mehrere Bundesländer schreiben eine Beteiligung inzwischen per Landesgesetz vor. Zusätzlich fließen ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % der Gewerbesteuer eines Solarparks an die Standortgemeinde. Der Kommunal-Rechner zeigt die Größenordnung für Ihr Projekt.`,
  },
];

const PORTAL = [
  {
    q: "Wofür brauche ich einen Portalzugang?",
    a: "Im Portal sehen Sie den Status Ihrer Anfragen und Projekte, laden Dokumente hoch und herunter und schreiben direkt mit Ihrem Ansprechpartner. Investoren verwalten dort Suchprofil, NDAs und Datenräume.",
  },
  {
    q: "Kostet das Portal etwas?",
    a: "Nein. Registrierung und Nutzung sind kostenlos. Provisionen fallen nur für Verkäufer auf der Projektbörse und nur bei erfolgreichem Abschluss an.",
  },
  {
    q: "Ich habe schon eine Anfrage gestellt – sehe ich sie im Portal?",
    a: "Ja. Registrieren Sie sich mit derselben E-Mail-Adresse, die Sie im Formular angegeben haben. Ihre Anfrage erscheint dann automatisch als Vorgang mit Status.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Wir verarbeiten Ihre Angaben nur, um Ihre Anfrage zu bearbeiten und das Projekt zu begleiten. Projektdaten geben wir nur mit Ihrer Zustimmung und – bei Investoren – erst nach unterzeichneter Vertraulichkeitsvereinbarung weiter. Einzelheiten finden Sie in der Datenschutzerklärung.",
  },
  {
    q: "Kann ich meinen Zugang wieder löschen?",
    a: "Ja. Sie können die Löschung Ihres Zugangs jederzeit verlangen. Daten, die wir aus gesetzlichen Gründen aufbewahren müssen (etwa Verträge), werden bis zum Ende der Aufbewahrungsfrist gesperrt und danach gelöscht.",
  },
];

/** Gruppen der zentralen FAQ-Seite – id dient als Anker und Filter. */
export const FAQ_GRUPPEN = [
  { id: "flaecheneigentuemer", titel: "Flächeneigentümer", items: FLAECHE },
  { id: "landwirte", titel: "Landwirte", items: LANDWIRTE },
  { id: "investoren", titel: "Investoren", items: INVESTOREN },
  { id: "projektboerse", titel: "Projektbörse", items: PROJEKTBOERSE },
  { id: "strom", titel: "Strom & Pool", items: STROM_POOL },
  { id: "portal", titel: "Portal & Datenschutz", items: PORTAL },
];
