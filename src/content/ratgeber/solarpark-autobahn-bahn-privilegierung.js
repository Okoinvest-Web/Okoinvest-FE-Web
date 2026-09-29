// Ratgeber: Solarpark an Autobahn und Bahn – 200-m-Privilegierung, 500-m-EEG-Randstreifen,
// Anbauzonen nach FStrG, Bahn-Stellungnahmen, Blendung, Kombination Baurecht + Förderung
// Recherchestand 29.09.2026 (BauGB § 35 Abs. 1 Nr. 8 b, Abs. 5; EEG 2023 §§ 37, 48; FStrG § 9 Abs. 2c;
// AEG § 2b; StMB Bayern „PV-Freiflächenanlagen als Anbau an Straßen“ 10.01.2024).
// Keine Rechtsberatung – Text bewusst vorsichtig formuliert.

import { FREIFLAECHE, ERLOESE, KOMMUNE, REGIONEN, PACHT, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
const PRIV_KORRIDOR_M = 200; // § 35 Abs. 1 Nr. 8 b BauGB, gemessen vom äußeren Rand der Fahrbahn
const EEG_RANDSTREIFEN_M = 500; // § 37 Abs. 1 Nr. 2 c EEG, § 48 Abs. 1 Satz 1 Nr. 3 c aa EEG
// § 9 FStrG: Anbauverbot / Anbaubeschränkung (außerhalb Ortsdurchfahrten), in m
const FSTRG = { autobahn: { verbot: 40, beschraenkung: 100 }, bundesstrasse: { verbot: 20, beschraenkung: 40 } };
// StMB Bayern (10.01.2024): Änderung § 9 Abs. 2c FStrG zugunsten von PV zum 29.12.2023
const FSTRG_AENDERUNG = "29.12.2023";
// StMB Bayern (10.01.2024): BayStrWG Anbauverbot/-beschränkung Staatsstraßen 20/40 m, Kreisstraßen 15/30 m
const BAY_STRWG = { staats: { verbot: 20, beschraenkung: 40 }, kreis: { verbot: 15, beschraenkung: 30 } };

/* ------------------------------------------------------------------ */
/* Beispiel: 1 km Autobahnabschnitt, einseitig                        */
/* ------------------------------------------------------------------ */

const LAENGE_M = 1000;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const streifen = (tiefe) => {
  const ha = (LAENGE_M * tiefe) / 10000;
  const mwp = ha / FREIFLAECHE.haProMwp;
  const kwh = mwp * 1000 * REGION.ertrag;
  return {
    ha,
    mwp,
    kwh,
    erloes: (kwh * ERLOESE.eegFreiflaecheCt) / 100,
    kommune: (kwh * KOMMUNE.beteiligungCt) / 100,
    pacht: ha * PACHT.freiflaecheProHa.mittel,
  };
};
const S200 = streifen(PRIV_KORRIDOR_M);
const S500 = streifen(EEG_RANDSTREIFEN_M);
const mio = (n) => `${fmt(n / 1e6, 1)} Mio.`;

const artikel = {
  slug: "solarpark-autobahn-bahn-privilegierung",
  title: "Solarpark an Autobahn und Bahn: 200 m Baurecht, 500 m EEG-Förderung",
  seoTitle: "Solarpark an Autobahn und Bahn: 200/500 m | ÖkoInvest",
  kurzTitel: "Solarpark an Autobahn und Bahn",
  description:
    "Solarpark an Autobahn und Bahn: 200-m-Privilegierung nach § 35 BauGB, 500-m-Randstreifen im EEG, Anbauzonen nach FStrG, Bahn-Auflagen und Blendung im Überblick.",
  excerpt:
    "Flächen entlang von Autobahnen und Hauptbahnstrecken sind für Solarparks besonders gefragt. Welche Korridore gelten, wann kein Bebauungsplan nötig ist, was Straßen- und Bahnbehörden prüfen und wie sich Baurecht und Förderung kombinieren.",
  hauptKeyword: "solarpark autobahn",
  keywords: [
    "Solarpark Autobahn",
    "Photovoltaik an Bahnstrecken",
    "200 m Privilegierung § 35 BauGB",
    "500 m Randstreifen EEG",
    "Anbauverbotszone Photovoltaik FStrG",
    "Freiflächen-PV Schiene zweigleisig",
    "Blendgutachten Autobahn",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/freiflaeche-begehung.jpg",
  bildAlt: "Zwei Fachleute mit Schutzhelm und Warnweste gehen zwischen aufgeständerten Modulreihen eines Solarparks",
  badge: { wert: `${PRIV_KORRIDOR_M} / ${EEG_RANDSTREIFEN_M} m`, text: "Baurecht-Korridor und EEG-Randstreifen an Autobahn und Schiene" },

  kurzFazit: [
    `**Bis ${PRIV_KORRIDOR_M} m** vom Fahrbahnrand einer Autobahn oder eines zweigleisigen Schienenwegs des übergeordneten Netzes ist ein Solarpark im Außenbereich **privilegiert** (§ 35 Abs. 1 Nr. 8 b BauGB) – eine Baugenehmigung genügt, ein Bebauungsplan ist nicht zwingend.`,
    `**Bis ${EEG_RANDSTREIFEN_M} m** längs von Autobahnen und Schienenwegen liegt die Fläche im **EEG-Randstreifen** (§ 37 Abs. 1 Nr. 2 c EEG) und darf an der Ausschreibung teilnehmen; außerhalb des 200-m-Korridors braucht sie dafür einen Bebauungsplan.`,
    `Die **Anbauzonen an Bundesfernstraßen** (${FSTRG.autobahn.verbot} m und ${FSTRG.autobahn.beschraenkung} m an Autobahnen) gelten für Solaranlagen seit dem ${FSTRG_AENDERUNG} nicht mehr als Verbot; stattdessen wird die Straßenbaubehörde beteiligt (§ 9 Abs. 2c FStrG).`,
    "An Bahnstrecken prüft der Infrastrukturbetreiber vor allem **Blendung von Triebfahrzeugführern, Signale, Oberleitungen und Entwässerung** – ein Blendgutachten gehört an Verkehrswegen praktisch immer dazu.",
    `Im Beispiel liefert ein 1 km langer, ${PRIV_KORRIDOR_M} m tiefer Streifen rund **${fmt(S200.mwp, 0)} MWp** und etwa ${mio(S200.kwh)} kWh im Jahr – ohne Bebauungsplan und mit EEG-Zugang.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was gilt für einen Solarpark an Autobahn und Bahn?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Entlang von Autobahnen und bestimmten Bahnstrecken überlagern sich drei Regelwerke: das Baurecht mit einem privilegierten ${PRIV_KORRIDOR_M}-m-Korridor, das EEG mit einem förderfähigen ${EEG_RANDSTREIFEN_M}-m-Randstreifen und das Straßen- bzw. Eisenbahnrecht mit Anbauzonen und Beteiligungspflichten.** Wer alle drei zusammendenkt, erkennt schnell, ob eine Fläche ohne Bebauungsplan gebaut werden kann, ob sie an der Ausschreibung teilnehmen darf und welche Auflagen zu erwarten sind.`,
        },
        {
          typ: "p",
          text: "Der Gesetzgeber hat diese Flächen bewusst begünstigt: Sie sind durch den Verkehrsweg ohnehin vorbelastet, das Landschaftsbild ist bereits verändert, und Konflikte mit Wohnbebauung sind seltener. Die Grundlagen zum Planverfahren erklärt der Ratgeber [Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan); hier geht es um die Besonderheiten am Verkehrsweg.",
        },
        {
          typ: "tabelle",
          caption: `Abstandszonen an Autobahnen und Schienenwegen im Überblick, Stand ${STAND}`,
          kopf: ["Abstand vom Fahrbahnrand", "Baurecht", "EEG-Ausschreibung", "Straßenrecht (Autobahn)"],
          zeilen: [
            [`0–${FSTRG.autobahn.verbot} m`, "privilegiert (Nr. 8 b)", "zulässig", `früher Anbauverbot; für PV seit ${FSTRG_AENDERUNG} Beteiligung der Straßenbaubehörde`],
            [`${FSTRG.autobahn.verbot}–${FSTRG.autobahn.beschraenkung} m`, "privilegiert (Nr. 8 b)", "zulässig", "früher Anbaubeschränkung; für PV Beteiligung statt Zustimmung"],
            [`${FSTRG.autobahn.beschraenkung}–${PRIV_KORRIDOR_M} m`, "**privilegiert (Nr. 8 b)**", "**zulässig**", "keine Anbauzone"],
            [`${PRIV_KORRIDOR_M}–${EEG_RANDSTREIFEN_M} m`, "Bebauungsplan nötig", "zulässig, wenn Fläche bei Aufstellungsbeschluss im Streifen lag", "keine Anbauzone"],
            [`über ${EEG_RANDSTREIFEN_M} m`, "Bebauungsplan nötig", "nur über andere Kategorien, z. B. benachteiligte Gebiete", "keine Anbauzone"],
          ],
          hervorheben: 2,
          markierteZeile: 2,
          minBreite: 760,
          fussnote: "Quellen: § 35 Abs. 1 Nr. 8 b BauGB, § 37 Abs. 1 Nr. 2 c EEG, § 9 FStrG (gesetze-im-internet.de, abgerufen 09/2026). Die baurechtliche Privilegierung gilt an Schienen nur für zweigleisige Strecken des übergeordneten Netzes, der EEG-Randstreifen nach Wortlaut für Schienenwege allgemein. Keine Rechtsberatung.",
        },
      ],
    },
    {
      id: "privilegierung",
      titel: "Die 200-m-Privilegierung nach § 35 Abs. 1 Nr. 8 b BauGB",
      tocLabel: "200 m Baurecht",
      bloecke: [
        {
          typ: "p",
          text: `**Privilegiert ist eine Solaranlage auf einer Fläche längs von Autobahnen oder von Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen in einer Entfernung von bis zu ${PRIV_KORRIDOR_M} m, gemessen vom äußeren Rand der Fahrbahn.** Sie ist dann im Außenbereich zulässig, wenn öffentliche Belange nicht entgegenstehen und die Erschließung gesichert ist – ein Bebauungsplan ist nicht erforderlich.`,
        },
        {
          typ: "liste",
          punkte: [
            "**Autobahnen:** Nach dem Wortlaut sind nur Autobahnen erfasst. Vierstreifig ausgebaute Bundesstraßen fallen nicht automatisch darunter.",
            "**Schienenwege:** Das übergeordnete Netz ist in § 2b AEG definiert – das regelspurige Eisenbahnnetz ohne funktional getrennte Stadt- und Vorortnetze, private Werksbahnen und reine Museums- oder Touristikstrecken. Zusätzlich müssen mindestens zwei Hauptgleise vorhanden sein; eingleisige Nebenstrecken sind nicht privilegiert.",
            "**Öffentliche Belange:** Naturschutz, Wasserschutz, Denkmalschutz, Landschaftsbild und schädliche Umwelteinwirkungen wie Blendung werden trotzdem geprüft (§ 35 Abs. 3 BauGB).",
            "**Gemeinde:** Sie muss ihr Einvernehmen erteilen, kann es bei privilegierten Vorhaben aber nur aus den gesetzlichen Gründen verweigern.",
            "**Rückbau:** Als weitere Zulässigkeitsvoraussetzung ist eine Rückbauverpflichtung abzugeben (§ 35 Abs. 5 BauGB), meist mit Sicherheit. Details im Ratgeber [Rückbau und Rückbaubürgschaft](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
          ],
        },
        {
          typ: "p",
          text: `Die [Privilegierung im Außenbereich](/wissen/lexikon#privilegierung-aussenbereich) spart Zeit: Statt eines Bebauungsplanverfahrens mit Aufstellungs- und Satzungsbeschluss genügt ein Bauantrag nach Landesbauordnung. Viele Gemeinden bestehen dennoch auf einem [Bebauungsplan](/wissen/lexikon#bebauungsplan), um Eingrünung, Ausgleich und Kommunalbeteiligung verbindlich zu regeln – und manche Projektierer wählen ihn freiwillig, weil er gegenüber Nachbarn und Banken mehr Rechtssicherheit bietet.`,
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Messen Sie richtig",
          text: `Maßgeblich ist der äußere Rand der Fahrbahn, nicht die Grundstücksgrenze der Autobahn und nicht die Mitte der Trasse. Böschungen, Rastanlagen und Anschlussstellen verschieben die Linie. Lassen Sie den Korridor vor Vertragsabschluss auf einem amtlichen Lageplan einzeichnen – ein Flurstück, das nur zur Hälfte im ${PRIV_KORRIDOR_M}-m-Korridor liegt, ist baurechtlich zweigeteilt. Eine erste Prüfung bietet der [Flächencheck](/flaechencheck).`,
        },
      ],
    },
    {
      id: "eeg",
      titel: "Der 500-m-Randstreifen im EEG",
      tocLabel: "500 m EEG",
      bloecke: [
        {
          typ: "p",
          text: `**Für die EEG-Ausschreibung zählt eine Fläche zu den zulässigen [Randstreifen](/wissen/lexikon#randstreifen), wenn sie entweder die Voraussetzungen der 200-m-Privilegierung erfüllt oder zum Zeitpunkt des Aufstellungsbeschlusses für den Bebauungsplan längs von Autobahnen oder Schienenwegen lag und die Anlage bis zu ${EEG_RANDSTREIFEN_M} m vom äußeren Fahrbahnrand entfernt errichtet wird (§ 37 Abs. 1 Nr. 2 c EEG).** Die Fläche darf außerdem kein entwässerter Moorboden sein.`,
        },
        {
          typ: "p",
          text: "Daraus folgt eine wichtige Kombination: **Im 200-m-Korridor ist die Anlage zugleich privilegiert und förderfähig** – sie kann ohne Bebauungsplan an der Ausschreibung teilnehmen. Zwischen 200 und 500 m bleibt sie förderfähig, braucht aber einen Bebauungsplan. Für kleinere Anlagen außerhalb der Ausschreibung enthält § 48 Abs. 1 Satz 1 Nr. 3 c aa EEG eine entsprechende 500-m-Regel mit Bebauungsplan. Wie die Ausschreibung funktioniert, erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/ratgeber/eeg-ausschreibung-freiflaeche).",
        },
        {
          typ: "p",
          text: "Auch im Randstreifen gelten die Biodiversitätskriterien des § 37 Abs. 1a EEG: Die Anlage soll mindestens drei von fünf naturschutzfachlichen Kriterien erfüllen. Welche das sind, zeigt der Ratgeber [Artenschutz und Biodiversität](/ratgeber/solarpark-artenschutz-biodiversitaet). Liegt die Fläche außerhalb aller Kategorien der [Flächenkulisse](/wissen/lexikon#flaechenkulisse), bleiben [benachteiligte Gebiete](/ratgeber/benachteiligte-gebiete-pv-freiflaeche) mit Landesöffnung oder die Vermarktung über einen [Stromliefervertrag](/ratgeber/ppa-fuer-unternehmen).",
        },
        {
          typ: "tabelle",
          caption: `Beispiel: 1 km Autobahnabschnitt, einseitig, Süddeutschland (${fmt(REGION.ertrag)} kWh/kWp)`,
          kopf: ["Kennzahl", `Streifen bis ${PRIV_KORRIDOR_M} m`, `Streifen bis ${EEG_RANDSTREIFEN_M} m`],
          zeilen: [
            ["Fläche", `${fmt(S200.ha)} ha`, `${fmt(S500.ha)} ha`],
            ["Leistung (Süd, fest)", `rund ${fmt(S200.mwp, 1)} MWp`, `rund ${fmt(S500.mwp, 1)} MWp`],
            ["Stromerzeugung im ersten Jahr", `${mio(S200.kwh)} kWh`, `${mio(S500.kwh)} kWh`],
            [`Erlös bei ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh Zuschlagswert`, `${fmtEur(S200.erloes)} pro Jahr`, `${fmtEur(S500.erloes)} pro Jahr`],
            [`Kommunalbeteiligung ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`, `${fmtEur(S200.kommune)} pro Jahr`, `${fmtEur(S500.kommune)} pro Jahr`],
            [`Pacht bei ${fmt(PACHT.freiflaecheProHa.mittel)} €/ha`, `${fmtEur(S200.pacht)} pro Jahr`, `${fmtEur(S500.pacht)} pro Jahr`],
            ["Baurecht", "**Baugenehmigung genügt**", "Bebauungsplan für den Teil über 200 m"],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: `Vereinfachte Rechnung mit ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp, ohne Abzüge für Böschungen, Leitungen, Abstandsflächen und Ausgleich. In der Praxis ist die nutzbare Fläche oft deutlich kleiner. Orientierungswerte, kein Angebot.`,
        },
        {
          typ: "p",
          text: `Die [Kommunalbeteiligung](/wissen/lexikon#kommunalbeteiligung) nach § 6 EEG kann die Zustimmung der Gemeinde erleichtern – auch bei privilegierten Anlagen, bei denen die Gemeinde keinen Bebauungsplan beschließen muss. Was die Pacht für Ihre Fläche ergibt, rechnen Sie im [Pachtrechner](/rechner/pacht).`,
        },
      ],
    },
    {
      id: "anbauzonen",
      titel: "Anbauverbots- und Anbaubeschränkungszone nach FStrG",
      tocLabel: "Anbauzonen FStrG",
      bloecke: [
        {
          typ: "p",
          text: `**An Bundesfernstraßen gelten Anbauzonen: Hochbauten sind bis ${FSTRG.autobahn.verbot} m von Autobahnen und ${FSTRG.bundesstrasse.verbot} m von Bundesstraßen grundsätzlich verboten, bauliche Anlagen bis ${FSTRG.autobahn.beschraenkung} m bzw. ${FSTRG.bundesstrasse.beschraenkung} m zustimmungspflichtig (§ 9 Abs. 1 und 2 FStrG).** Für Solaranlagen gelten das Hochbauverbot und die Anbaubeschränkung seit dem ${FSTRG_AENDERUNG} nicht mehr (§ 9 Abs. 2c FStrG).`,
        },
        {
          typ: "p",
          text: `An die Stelle des Verbots ist eine **Beteiligung** getreten: Die zuständige Straßenbaubehörde wird im Genehmigungsverfahren bei Vorhaben bis ${FSTRG.autobahn.beschraenkung} m an Autobahnen und bis ${FSTRG.bundesstrasse.beschraenkung} m an Bundesstraßen beteiligt. Ist keine Genehmigung erforderlich, muss der Vorhabenträger das Vorhaben vor Baubeginn anzeigen. Die Straßenbaubehörde bringt die Ausbauabsichten, die Sicherheit und Leichtigkeit des Verkehrs und die Straßenbaugestaltung ein und kann Nebenbestimmungen empfehlen. Das Bayerische Bauministerium weist darauf hin, dass dabei zugleich § 2 EEG zu beachten ist, der erneuerbaren Energien ein überragendes öffentliches Interesse zuweist.`,
        },
        {
          typ: "tabelle",
          caption: "Anbauzonen und Zuständigkeiten an Straßen (Beispiel Bayern für Landesstraßen)",
          kopf: ["Straße", "Anbauverbotszone", "Anbaubeschränkungszone", "Regel für Solaranlagen", "Beteiligt"],
          zeilen: [
            ["Bundesautobahn", `${FSTRG.autobahn.verbot} m`, `${FSTRG.autobahn.beschraenkung} m`, "Verbot/Zustimmung entfallen, Beteiligung bzw. Anzeige (§ 9 Abs. 2c FStrG)", "Autobahn GmbH im B-Plan-Verfahren, Fernstraßen-Bundesamt"],
            ["Bundesstraße", `${FSTRG.bundesstrasse.verbot} m`, `${FSTRG.bundesstrasse.beschraenkung} m`, "wie Autobahn", "zuständige Straßenbauverwaltung des Landes"],
            ["Staatsstraße (Bayern)", `${BAY_STRWG.staats.verbot} m`, `${BAY_STRWG.staats.beschraenkung} m`, "Landesrecht gilt weiter; Ausnahme im Einzelfall möglich", "Staatliches Bauamt"],
            ["Kreisstraße (Bayern)", `${BAY_STRWG.kreis.verbot} m`, `${BAY_STRWG.kreis.beschraenkung} m`, "Landesrecht gilt weiter; Ausnahme im Einzelfall möglich", "Landkreis bzw. kreisfreie Stadt"],
          ],
          minBreite: 780,
          fussnote: "Quellen: § 9 FStrG; Bayerisches Staatsministerium für Wohnen, Bau und Verkehr, PV-Freiflächenanlagen als Anbau an Straßen (Stand 10.01.2024). Abstände außerhalb der Ortsdurchfahrten, gemessen vom äußeren Fahrbahnrand. Andere Länder haben eigene Straßengesetze mit abweichenden Werten.",
        },
        {
          typ: "p",
          text: "Unverändert gilt: Eine Zufahrt direkt von der Autobahn ist nicht möglich; die Erschließung läuft über das nachgeordnete Wegenetz. Außerdem sollten Sie Platz für einen künftigen Ausbau der Straße einplanen – die Straßenbaubehörde fragt danach, und eine [Anbauverbotszone](/wissen/lexikon#anbauverbotszone) nach Landesrecht kann an Staats- und Kreisstraßen weiterhin greifen.",
        },
      ],
    },
    {
      id: "bahn",
      titel: "Solarpark an der Bahnstrecke: Was die Bahn prüft",
      tocLabel: "Bahnstrecken",
      bloecke: [
        {
          typ: "p",
          text: "**An Bahnstrecken ist der Eisenbahninfrastrukturbetreiber – bei Bundesschienenwegen in der Regel die DB InfraGO – als Träger öffentlicher Belange zu beteiligen und verlangt in seinen Stellungnahmen typischerweise, dass der Betrieb der Bahn weder durch Blendung noch durch Bauwerke, Bewuchs oder Entwässerung beeinträchtigt wird.** Ein festes gesetzliches Abstandsmaß wie im Straßenrecht gibt es dafür nicht; konkrete Abstände und Auflagen ergeben sich aus der Stellungnahme.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Blendfreiheit:** Keine Blendung von Triebfahrzeugführern; Signale dürfen weder überstrahlt noch vorgetäuscht werden. Tritt Blendung nach Inbetriebnahme auf, verlangt die Bahn meist nachträglichen Sichtschutz.",
            "**Oberleitung und Bahnstrom:** Sicherheitsabstände zu Oberleitungen und Bahnstromleitungen, Erdung und Schutz vor Beeinflussung.",
            "**Standsicherheit:** Keine Belastung oder Durchfeuchtung von Bahndämmen und Einschnitten; Rammarbeiten nahe dem Gleis abstimmen.",
            "**Entwässerung:** Niederschlagswasser darf nicht auf Bahngelände geleitet werden.",
            "**Bewuchs und Zaun:** Hecken und Zäune außerhalb der von der Bahn freizuhaltenden Bereiche, damit Instandhaltung und Sicht nicht behindert werden.",
            "**Kabelkreuzungen:** Querungen der Bahntrasse nur mit Gestattungsvertrag – für die Kabeltrasse zum Netzverknüpfungspunkt oft ein Zeitfaktor.",
          ],
        },
        {
          typ: "p",
          text: "Für die Netzanbindung lohnt ein früher Blick auf die Trasse: Muss die Kabelverbindung Autobahn oder Bahn queren, sind Bohrungen und Verträge mit dem Baulastträger nötig. Mehr dazu im Ratgeber [Netzanschluss für Solarparks](/ratgeber/netzanschluss-solarpark).",
        },
      ],
    },
    {
      id: "blendung",
      titel: "Blendung von Autofahrern und Lokführern",
      tocLabel: "Blendung Verkehr",
      bloecke: [
        {
          typ: "p",
          text: "**An Verkehrswegen ist ein Blendgutachten praktisch immer Teil der Unterlagen, weil Straßenbaubehörden und Bahn Blendfreiheit für den Verkehr verlangen.** Anders als bei Wohnhäusern gibt es für Verkehrsteilnehmer keine festen Minutenwerte; geprüft wird, ob Reflexionen im relevanten Blickfeld der Fahrer liegen.",
        },
        {
          typ: "p",
          text: "Besonders sensibel sind Abschnitte, in denen die Trasse nach Osten oder Westen verläuft und die Sonne tief steht, sowie Kurven, Anschlussstellen und Signalstandorte. Abhilfe schaffen die Ausrichtung der Module, ein modulfreier Randstreifen, Sichtschutz in Höhe der Moduloberkante oder reflexionsarme Module. Die Methodik und die Maßstäbe für Wohnhäuser erklärt der Ratgeber [Abstand zur Wohnbebauung und Blendgutachten](/ratgeber/solarpark-abstand-wohnbebauung-blendgutachten).",
        },
      ],
    },
    {
      id: "dach",
      titel: "Österreich und Schweiz: Flächen an Autobahnen",
      tocLabel: "Österreich und Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**Eine bundesweite Privilegierung wie den 200-m-Korridor gibt es nach aktuellem Stand weder in Österreich noch in der Schweiz.** Freiflächen an Autobahnen werden dort über die Flächenwidmung bzw. die kantonale Nutzungsplanung entwickelt; Verkehrsflächen und Lärmschutzwände werden teils direkt vom Straßenbetreiber für Photovoltaik bereitgestellt. Einstieg in die Rahmenbedingungen geben die Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich) und [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vorgehen: Fläche am Verkehrsweg prüfen",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Korridore einzeichnen", `${PRIV_KORRIDOR_M}-m- und ${EEG_RANDSTREIFEN_M}-m-Linie vom äußeren Fahrbahnrand auf dem Lageplan eintragen; bei Bahnstrecken Gleiszahl und Zugehörigkeit zum übergeordneten Netz klären.`],
            ["Genehmigungsweg wählen", "Privilegierung mit Bauantrag oder Bebauungsplan – in Abstimmung mit der Gemeinde."],
            ["Behörden früh einbinden", "Straßenbaubehörde bzw. Autobahn GmbH und Fernstraßen-Bundesamt, bei Bahnstrecken den Infrastrukturbetreiber."],
            ["Gutachten beauftragen", "Blendgutachten, Artenschutz und gegebenenfalls Baugrund an Böschungen."],
            ["Netz und Trasse klären", "Netzverknüpfungspunkt und mögliche Querungen von Straße oder Schiene prüfen."],
          ],
        },
        {
          typ: "tool",
          href: "/flaechencheck",
          titel: "Liegt Ihre Fläche im Korridor?",
          text: "Der Flächencheck schätzt Lage zu Autobahn und Bahn, Netzanschluss und Planungsrecht ein.",
          label: "Zum Flächencheck",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Brauche ich an der Autobahn einen Bebauungsplan für einen Solarpark?",
      a: `Im Korridor bis ${PRIV_KORRIDOR_M} m vom Fahrbahnrand nicht zwingend: Dort ist die Anlage nach § 35 Abs. 1 Nr. 8 b BauGB privilegiert, eine Baugenehmigung genügt. Viele Gemeinden bevorzugen trotzdem einen Bebauungsplan. Jenseits von ${PRIV_KORRIDOR_M} m ist er erforderlich.`,
    },
    {
      q: "Gilt die Privilegierung an jeder Bahnstrecke?",
      a: "Nein. Privilegiert sind nur Schienenwege des übergeordneten Netzes im Sinne des § 2b AEG mit mindestens zwei Hauptgleisen. An eingleisigen Strecken braucht es einen Bebauungsplan; der EEG-Randstreifen bis 500 m kann nach Wortlaut aber auch dort greifen.",
    },
    {
      q: "Ab wie viel Metern an der Autobahn darf ich Module aufstellen?",
      a: `Für Solaranlagen gilt das Anbauverbot der ${FSTRG.autobahn.verbot}-m-Zone seit dem ${FSTRG_AENDERUNG} nicht mehr; die Straßenbaubehörde wird aber beteiligt und kann Auflagen empfehlen, etwa zu Ausbauflächen oder Blendung. In der Praxis begrenzen Böschungen, Leitungen und Ausbauplanungen den nutzbaren Streifen.`,
    },
    {
      q: "Ist eine Fläche in 350 m Abstand zur Autobahn förderfähig?",
      a: `Ja, wenn sie zum Zeitpunkt des Aufstellungsbeschlusses längs der Autobahn lag und die Anlage innerhalb von ${EEG_RANDSTREIFEN_M} m errichtet wird. Sie braucht dann aber einen Bebauungsplan, weil sie außerhalb des ${PRIV_KORRIDOR_M}-m-Korridors liegt.`,
    },
    {
      q: "Wer muss bei einem Solarpark an der Autobahn beteiligt werden?",
      a: "Im Bebauungsplanverfahren die Autobahn GmbH des Bundes und wegen der anbaurechtlichen Zuständigkeit das Fernstraßen-Bundesamt, im Baugenehmigungsverfahren das Fernstraßen-Bundesamt. An Bundesstraßen ist die Straßenbauverwaltung des Landes zuständig.",
    },
    {
      q: "Zahlen Betreiber an der Autobahn mehr Pacht?",
      a: `Häufig ja, weil Baurecht und Förderung dort leichter zu erreichen sind. Entscheidend bleibt aber der Netzanschluss. Die übliche Spanne liegt bei ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr; Details im [Pachtrechner](/rechner/pacht).`,
    },
  ],

  passend: [
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Das Regelverfahren und wann die Privilegierung hilft." },
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Flächenkulisse, Höchstwerte und Zuschläge." },
    { href: "/ratgeber/solarpark-abstand-wohnbebauung-blendgutachten", titel: "Abstand und Blendgutachten", text: "Wie Blendung geprüft und vermieden wird." },
    { href: "/flaechencheck", titel: "Flächencheck", text: "Lage zu Autobahn und Bahn prüfen lassen." },
  ],

  quellen: [
    { titel: "Baugesetzbuch – § 35 BauGB (Bauen im Außenbereich, Abs. 1 Nr. 8 b und Abs. 5)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "EEG 2023 – § 37 Gebote für Solaranlagen des ersten Segments (Abs. 1 Nr. 2 c Randstreifen)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023 – § 48 Solaranlagen (anzulegender Wert, Abs. 1 Nr. 3 c)", url: "https://www.gesetze-im-internet.de/eeg_2014/__48.html", stand: "09/2026" },
    { titel: "Bundesfernstraßengesetz – § 9 FStrG (Bauliche Anlagen an Bundesfernstraßen, Abs. 2c)", url: "https://www.gesetze-im-internet.de/fstrg/__9.html", stand: "09/2026" },
    { titel: "Allgemeines Eisenbahngesetz – § 2b AEG (Übergeordnetes Netz)", url: "https://www.gesetze-im-internet.de/aeg_1994/__2b.html", stand: "09/2026" },
    { titel: "Bayerisches Staatsministerium für Wohnen, Bau und Verkehr – PV-Freiflächenanlagen als Anbau an Straßen (Stand 10.01.2024)", url: "https://www.energieatlas.bayern.de/sites/default/files/PV-Freifl%C3%A4chenanlagen%20als%20Anbau%20an%20Strassen_Stand%2010.01.2024.pdf", stand: "09/2026" },
    { titel: "Wissenschaftliche Dienste des Bundestages – WD 7 - 3000 - 017/25: Privilegierung von Freiflächen-PV an Autobahnen", url: "https://www.bundestag.de/resource/blob/1097610/WD-7-017-25.pdf", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Liegt Ihre Fläche im Korridor?",
    text: "Lage zu Autobahn und Bahn, Netz und Planungsrecht prüfen.",
    href: "/flaechencheck",
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Flächen an Autobahn und Bahn schnell einordnen.",
    text: "Im Flächencheck prüfen wir Korridore, Netzanschluss und Planungsrecht Ihrer Fläche. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: "/flaechencheck" },
    secondary: { label: "Pacht berechnen", href: "/rechner/pacht" },
  },
};

export default artikel;
