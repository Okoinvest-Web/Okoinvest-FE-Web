// src/components/Region/laender.js
//
// Länderrahmen der Regionalseiten: was bundesweit (DE), österreichweit (AT) bzw.
// schweizweit (CH) gleich ist. Bewusst kurz – die Regionalseiten tragen den
// regionsspezifischen Inhalt aus src/data/regionen/<slug>.js.

import { ClipboardCheck, FileSignature, Gavel, Hammer, Landmark, PlugZap, Scale, Sprout, Vote } from "lucide-react";
import { AGRI } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

export const LAND = {
  DE: {
    name: "Deutschland",
    code: "DE",
    ratgeber: [
      { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Ratgeber Genehmigung", text: "Bebauungsplan, Privilegierung und Verfahrensschritte in Deutschland." },
      { href: "/wissen/ratgeber/eeg-ausschreibung-freiflaeche", titel: "Ratgeber EEG-Ausschreibung", text: "Flächenkulisse, benachteiligte Gebiete und Zuschlagswerte." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Fläche & Netz prüfen", text: "Flächenkulisse, Schutzgebiete, Regionalplan und Netzverknüpfungspunkt klären; Netzanschlussanfrage beim Verteilnetzbetreiber." },
      { icon: Vote, title: "Aufstellungsbeschluss", text: "Der Gemeinderat beschließt, einen Bebauungsplan aufzustellen – meist mit Änderung des Flächennutzungsplans im Parallelverfahren." },
      { icon: Scale, title: "Beteiligung & Gutachten", text: "Frühzeitige und förmliche Beteiligung von Öffentlichkeit und Behörden, Umweltbericht, Artenschutz, Blendgutachten." },
      { icon: Gavel, title: "Satzungsbeschluss", text: "Mit dem Satzungsbeschluss entsteht Baurecht; danach Bauantrag bzw. Genehmigungsfreistellung nach Landesbauordnung." },
      { icon: PlugZap, title: "Zuschlag oder PPA, Bau", text: "Gebot in der EEG-Ausschreibung oder Stromliefervertrag, Rückbaubürgschaft, Bau und Netzanschluss." },
    ],
    schritteHinweis: "Ausnahme: Anlagen im 200-m-Streifen an Autobahnen und zweigleisigen Schienenwegen sowie kleine Agri-PV-Anlagen mit Hofbezug sind im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 8 und 9 BauGB) und brauchen keinen Bebauungsplan.",
    agri: [
      { t: "GAP-Direktzahlungen", k: `${fmt(AGRI.gapFoerderfaehig * 100)} %`, x: "der Fläche bleiben bei Agri-PV nach DIN SPEC 91434 förderfähig." },
      { t: "Privilegierung", k: `bis ${fmt(AGRI.privilegierungHa, 1)} ha`, x: "Grundfläche mit Hofbezug ohne Bebauungsplan (§ 35 Abs. 1 Nr. 9 BauGB)." },
      { t: "EEG", k: "besondere Solaranlage", x: "Agri-PV darf auch außerhalb der Flächenkulisse an der Ausschreibung teilnehmen." },
    ],
  },
  AT: {
    name: "Österreich",
    code: "AT",
    ratgeber: [
      { href: "/wissen/ratgeber/freiflaechen-pv-oesterreich", titel: "Ratgeber Österreich", text: "Widmung je Bundesland, Bewilligungen, EAG-Marktprämie und Abschlag." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Zonen & Netz prüfen", text: "Überörtliche PV-Zonen oder Kriterienkatalog des Landes, Bodengüte, Schutzgebiete; Netzzugangsanfrage beim Verteilernetzbetreiber." },
      { icon: Vote, title: "Widmung durch die Gemeinde", text: "Der Gemeinderat ändert den Flächenwidmungsplan (Grünland-Photovoltaik bzw. Sonderwidmung); das Land prüft als Aufsichtsbehörde." },
      { icon: Landmark, title: "Bewilligungen", text: "Naturschutzrechtliche und – ab der Landesschwelle – elektrizitätsrechtliche Bewilligung, dazu je nach Fall Wasser-, Forst- und Straßenrecht." },
      { icon: FileSignature, title: "Förderung & Vermarktung", text: "EAG-Marktprämie per Ausschreibung (mit oder ohne Abschlag), Investitionszuschuss für kleinere Anlagen oder Stromliefervertrag." },
      { icon: Hammer, title: "Bau & Netzanschluss", text: "Rückbausicherheit, Bau und Inbetriebnahme innerhalb der Frist ab Zuschlag." },
    ],
    schritteHinweis: "Raumordnung, Naturschutz und Elektrizitätsrecht für Erzeugungsanlagen sind in Österreich Landessache – Schwellen und Zonen unterscheiden sich je Bundesland.",
    agri: [
      { t: "EAG-Abschlag", k: `−${fmt(AGRI.eagAbschlagAt * 100)} %`, x: "auf den Zuschlagswert bei PV auf Agrar- und Grünland – qualifizierte Agri-PV kann davon ausgenommen sein (§ 33 EAG)." },
      { t: "Doppelnutzung", k: "Hauptnutzung bleibt", x: "Die landwirtschaftliche Nutzung muss tatsächlich weiterlaufen; Details regelt die Marktprämienverordnung." },
      { t: "Widmung", k: "Landesrecht", x: "Mehrere Länder bevorzugen Agri-PV oder schreiben sie auf guten Böden vor." },
    ],
  },
  CH: {
    name: "Schweiz",
    code: "CH",
    ratgeber: [
      { href: "/wissen/ratgeber/freiflaechen-pv-schweiz", titel: "Ratgeber Schweiz", text: "Raumplanung, Solarexpress, Einmalvergütung und Auktionen." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Vorabklärung", text: "Kantonaler Richtplan (Teil Energie), Schutzinventare, Fruchtfolgeflächen und Netzanschluss mit Gemeinde und kantonaler Fachstelle klären." },
      { icon: FileSignature, title: "Baugesuch", text: "Baugesuch bei der Gemeinde; außerhalb der Bauzone entscheidet die kantonale Behörde über die Bewilligung nach Art. 24ter RPG." },
      { icon: Scale, title: "Interessenabwägung", text: "Landschaft, Natur, Kulturland und Energieinteresse werden umfassend abgewogen; Einsprachen sind möglich." },
      { icon: PlugZap, title: "Förderung", text: "Einmalvergütung, Auktion für Anlagen ohne Eigenverbrauch oder Rückliefervergütung – je nach Größe und Modell." },
      { icon: Sprout, title: "Bau & Betrieb", text: "Bau, Netzanschluss beim Verteilnetzbetreiber, Betrieb – bei Agri-PV mit Nachweis des landwirtschaftlichen Nutzens." },
    ],
    schritteHinweis: "Die Schweiz trennt Bau- und Nichtbaugebiet streng. Klassische Solarparks auf Ackerland sind die Ausnahme; die Verfahren regeln die Kantone.",
    agri: [
      { t: "Voraussetzung", k: "Vorteil nötig", x: "Agri-PV auf landwirtschaftlicher Nutzfläche muss der Produktion Vorteile bringen oder der Forschung dienen (Art. 24ter Abs. 2 RPG)." },
      { t: "Typische Kulturen", k: "Beeren, Obst", x: "Schutz vor Hagel, Starkregen und Sonnenbrand ist der häufigste Nutzen-Nachweis." },
      { t: "Fruchtfolgeflächen", k: "streng", x: "Auf den besten Ackerböden sind die Hürden besonders hoch." },
    ],
  },
};
