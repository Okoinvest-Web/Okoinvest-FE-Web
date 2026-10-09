// src/components/Flaeche/flaechencheckEn.js – englische Anzeige-Texte für den Flächencheck (Sprachmodell)
//
// Die Rechenlogik (src/lib/rechner/flaechencheck.js) bleibt unverändert und liefert deutsche Texte und ids.
// Der Assistent (FlaechenWizard) übersetzt nur die ANZEIGE: Auswahllisten über die ids, Begründungen und
// nächste Schritte über die deutschen Sätze (feste Sätze exakt, Sätze mit Zahlen über Muster).
// Unbekannte Sätze bleiben deutsch (Rückfall wie in src/lib/sprache/woerterbuch.js).
// Was an das Backend geht (Anfrage, Bericht), bleibt deutsch.

import { fmtZahl } from "@/lib/sprache/format";

export const LAENDER_EN = { DE: "Germany", AT: "Austria", CH: "Switzerland" };

/** Regionen des Checks (ids aus src/lib/invest/laender/regionen.js) */
export const REGIONEN_EN = {
  "de-nord": { label: "Northern Germany" },
  "de-ost": { label: "Eastern Germany" },
  "de-west": { label: "Western & central Germany" },
  "de-sued": { label: "Southern Germany" },
  at: { label: "Austria", sub: "Lowland and hill country" },
  ch: { label: "Switzerland", sub: "Swiss Plateau" },
};

export const NUTZUNGEN_EN = {
  acker: { label: "Arable land", text: "Arable land under cultivation" },
  gruenland: { label: "Grassland", text: "Meadow, pasture, permanent grassland" },
  konversion: { label: "Conversion site", text: "Former military, commercial, railway, extraction" },
  deponie: { label: "Landfill", text: "Capped landfill, spoil heap" },
  parkplatz: { label: "Car park", text: "Sealed parking area" },
  sonstige: { label: "Other", text: "Fallow land, mixed use, unclear" },
};

export const BESONDERHEITEN_EN = {
  randstreifen: { label: "Strip along motorway/railway", text: "Up to 500 m from a motorway or railway line" },
  benachteiligt: { label: "Less-favoured area", text: "Designated less-favoured agricultural area" },
  schutzgebiet: { label: "Protected area", text: "Nature reserve, Habitats Directive, bird protection or water protection area" },
  wald: { label: "Adjacent forest", text: "Forest edge directly next to the land" },
  hang: { label: "Slope", text: "Noticeably sloping, especially to the north" },
  ueberschwemmung: { label: "Floodplain", text: "Designated floodplain" },
};

export const NETZ_EN = { lt1: "under 1 km", "1-3": "1–3 km", "3-5": "3–5 km", "5-10": "5–10 km", gt10: "over 10 km", unbekannt: "don’t know" };

export const EIGENTUM_EN = {
  allein: { label: "Sole ownership", text: "I decide alone" },
  gemeinschaft: { label: "Several owners", text: "Married couple, community of heirs, partnership" },
  verpachtet: { label: "Currently leased", text: "A farmer farms the land" },
  kommune: { label: "Municipality / church / association", text: "Committee resolution required" },
};

export const AMPEL_EN = {
  gruen: { label: "Well suited", text: "Your land has good prerequisites. Now a detailed assessment is worthwhile." },
  gelb: { label: "Partly suited", text: "Possible – but we need to check individual points carefully before it becomes concrete." },
  rot: { label: "Rather difficult", text: "Difficult as a conventional solar park. Often there are still options – such as agrivoltaics, neighbouring land or a carport." },
};

/** Feste Sätze der Rechenlogik → Englisch */
const SAETZE = {
  "Unter 1 ha ist ein eigener Solarpark kaum wirtschaftlich – eher Agri-PV am Hof, Carport oder Anschluss an eine Nachbarfläche.":
    "Below 1 ha, a solar park of its own is hardly economical – agrivoltaics on the farm, a carport or joining a neighbouring site are more realistic.",
  "Die Größe reicht für einen kleineren Solarpark.": "The size is enough for a smaller solar park.",
  "Gute Größe: Fixkosten für Planung und Netzanschluss verteilen sich auf viel Leistung.": "Good size: fixed costs for planning and grid connection are spread over a lot of capacity.",
  "Sehr große Fläche – attraktiv, aber Netzkapazität und Genehmigung werden zum Engpass; ggf. in Abschnitten.":
    "Very large site – attractive, but grid capacity and permitting become the bottleneck; possibly in phases.",
  "Ackerland ist meist eben und gut erschlossen. Gemeinden achten auf Bodenqualität – Agri-PV kann eine Alternative sein.":
    "Arable land is usually flat and has good access. Municipalities pay attention to soil quality – agrivoltaics can be an alternative.",
  "Grünland ist möglich; bei Dauergrünland gelten teils Umbruch- und Naturschutzauflagen.": "Grassland is possible; for permanent grassland, ploughing and nature conservation restrictions sometimes apply.",
  "Konversionsflächen sind politisch erwünscht und in Deutschland EEG-förderfähig.": "Conversion sites are politically desired and eligible for EEG funding in Germany.",
  "Konversionsflächen sind als vorbelastete Flächen politisch erwünscht.": "As pre-impacted land, conversion sites are politically desired.",
  "Deponien sind geeignet, brauchen aber Ballast- statt Rammfundamente und Abstimmung mit der Abfallbehörde.":
    "Landfills are suitable but need ballasted instead of driven foundations and coordination with the waste authority.",
  "Auf Parkplätzen wird statt eines Solarparks ein Solarcarport gebaut – eigenes Modell, gern prüfen wir beides.":
    "On car parks, a solar carport is built instead of a solar park – a separate model; we are happy to check both.",
  "Die Nutzung klären wir im Gespräch – Brachen sind oft gut geeignet.": "We will clarify the use in a conversation – fallow land is often well suited.",
  "Randstreifen an Autobahn/Schiene: EEG-Flächenkulisse (bis 500 m). Baurechtlich privilegiert im Außenbereich ist die Anlage bis 200 m entlang von Autobahnen oder Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen (§ 35 Abs. 1 Nr. 8 b BauGB).":
    "Strip along a motorway/railway: EEG land category (up to 500 m). Under building law, the installation is privileged in the outer zone up to 200 m along motorways or main-network railways with at least two main tracks (§ 35 (1) no. 8 b BauGB, German Federal Building Code).",
  "Flächen entlang von Verkehrswegen gelten auch in AT/CH als vorbelastet und sind raumplanerisch oft bevorzugt.":
    "Land along transport routes is also considered pre-impacted in AT/CH and is often preferred in spatial planning.",
  "Benachteiligtes Gebiet: Acker- und Grünland ist dort grundsätzlich EEG-förderfähig, sofern das Land nicht ausgeschlossen hat.":
    "Less-favoured area: arable land and grassland there are in principle eligible for EEG funding, unless the federal state has excluded them.",
  "Benachteiligte Gebiete spielen in AT/CH für die Förderung keine eigene Rolle.": "Less-favoured areas do not play a separate role for funding in AT/CH.",
  "Schutzgebiet: Naturschutz-, FFH- und Wasserschutzgebiete schließen einen Solarpark meist aus; Landschaftsschutzgebiete im Einzelfall möglich.":
    "Protected area: nature reserves, Habitats Directive sites and water protection areas usually rule out a solar park; landscape protection areas are possible in individual cases.",
  "Waldrand: Abstand, Verschattung und Brandschutz kosten nutzbare Fläche.": "Forest edge: setbacks, shading and fire protection cost usable land.",
  "Hangneigung: Süd- und leichte Ost/West-Hänge gehen gut, steile Nordhänge kaum.": "Slope: south-facing and gentle east/west slopes work well, steep north-facing slopes hardly at all.",
  "Überschwemmungsgebiet: nur mit wasserrechtlicher Ausnahme und erhöhter Aufständerung.": "Floodplain: only with an exemption under water law and raised mounting.",
  "Entfernung zum Netz unbekannt – wir fragen die Anschlusskapazität beim Netzbetreiber an.": "Distance to the grid unknown – we will ask the grid operator about connection capacity.",
  "Netzanschluss nah: geringe Kosten für Kabeltrasse und Übergabestation.": "Grid connection close by: low costs for cable route and transfer station.",
  "Netzanschluss tragbar.": "Grid connection affordable.",
  "Netzanschluss teuer – erst ab mehr Fläche gut tragbar.": "Grid connection expensive – only affordable with more land.",
  "Netzanschluss sehr teuer. Mit Nachbarflächen oder Speicher neu rechnen.": "Grid connection very expensive. Recalculate with neighbouring land or storage.",
  "Alleineigentum: kurze Wege bis zur Unterschrift.": "Sole ownership: a short path to signing.",
  "Mehrere Eigentümer: Alle müssen zustimmen – wir helfen bei der Abstimmung.": "Several owners: everyone has to agree – we help with the coordination.",
  "Bestehender Landpachtvertrag: Kündigungsfristen und Ausgleich für den Pächter einplanen.": "Existing agricultural lease: plan for notice periods and compensation for the tenant.",
  "Kommunale oder kirchliche Fläche: Gremienbeschluss und ggf. Ausschreibung einplanen.": "Municipal or church land: plan for a committee resolution and possibly a tender.",
  "Österreich: Nötig ist eine Widmung als Grünland-Photovoltaik bzw. eine Zonierung nach Landesrecht – die Regeln unterscheiden sich je Bundesland.":
    "Austria: a zoning designation as ‘Grünland-Photovoltaik’ (green land for photovoltaics) or zoning under state law is required – the rules differ between federal states.",
  "Schweiz: Ausserhalb der Bauzone braucht es Standortgebundenheit nach Raumplanungsrecht; grosse Freiflächenanlagen sind nur eingeschränkt möglich.":
    "Switzerland: outside the building zone, the installation must be site-bound under spatial planning law; large ground-mounted plants are only possible to a limited extent.",
  // Nächste Schritte
  "Flurstücke nennen – wir prüfen Schutzgebiete, Regionalplan, Netz und Einstrahlung am Kartentisch (kostenfrei).":
    "Give us the plot numbers – we check protected areas, regional plan, grid and irradiation at our desk (free of charge).",
  "Netzanschlussanfrage beim Netzbetreiber – erst die Kapazität entscheidet über die Parkgröße.": "Grid connection request to the grid operator – only the capacity determines the size of the park.",
  "Alle Miteigentümer frühzeitig einbinden – ein gemeinsames Gespräch spart Monate.": "Involve all co-owners early – a joint conversation saves months.",
  "Laufenden Landpachtvertrag prüfen: Kündigungsfrist, Teilflächen, Ausgleich für den Pächter.": "Review the current agricultural lease: notice period, partial areas, compensation for the tenant.",
  "Frühes Gespräch mit der Gemeinde – ohne Bebauungsplan (Ausnahme: privilegierte Flächen) geht es in Deutschland nicht.":
    "Talk to the municipality early – in Germany it does not work without a development plan (exception: privileged sites).",
  "Abstimmung mit der Gemeinde zur Widmung Grünland-Photovoltaik und zur Landes-Zonierung.": "Coordination with the municipality on zoning as ‘Grünland-Photovoltaik’ and on the state zoning.",
  "Vorabklärung mit Gemeinde und kantonaler Fachstelle zur Standortgebundenheit.": "Preliminary clarification of site-bound status with the municipality and the cantonal specialist agency.",
  "Parkplatz: Solarcarport mit Ladepunkten als Alternative rechnen.": "Car park: calculate a solar carport with charging points as an alternative.",
  "Pachtangebot mit Vertragsentwurf – Sie prüfen in Ruhe, gern mit Ihrer Beratung.": "Lease offer with draft contract – you review it at your leisure, ideally with your adviser.",
};

/** Sätze mit Zahlen (Werte aus der Rechenlogik, im englischen Zahlenformat) */
const MUSTER = [
  [/^Unter ([\d.,]+) ha wird es knapp; mit Nachbarflächen oder als Agri-PV kann es passen\.$/, (m) => `Below ${m[1]} ha it gets tight; with neighbouring land or as agrivoltaics it can work.`],
  [/^Netzanschluss nah: rund (\d+) €\/kWp für Kabeltrasse und Übergabestation\.$/, (m) => `Grid connection close by: around €${fmtZahl(m[1], 0, "en")}/kWp for cable route and transfer station.`],
  [/^Netzanschluss tragbar: rund (\d+) €\/kWp\.$/, (m) => `Grid connection affordable: around €${fmtZahl(m[1], 0, "en")}/kWp.`],
  [/^Netzanschluss teuer: rund (\d+) €\/kWp – erst ab mehr Fläche gut tragbar\.$/, (m) => `Grid connection expensive: around €${fmtZahl(m[1], 0, "en")}/kWp – only affordable with more land.`],
  [/^Netzanschluss sehr teuer: rund (\d+) €\/kWp\. Mit Nachbarflächen oder Speicher neu rechnen\.$/, (m) => `Grid connection very expensive: around €${fmtZahl(m[1], 0, "en")}/kWp. Recalculate with neighbouring land or storage.`],
];

/** Satz der Rechenlogik in der Sprache der Seite (Rückfall: deutscher Satz). */
export function satzEn(deutsch) {
  if (typeof deutsch !== "string") return deutsch;
  if (Object.hasOwn(SAETZE, deutsch)) return SAETZE[deutsch];
  for (const [re, f] of MUSTER) {
    const m = deutsch.match(re);
    if (m) return f(m);
  }
  return deutsch;
}

/** Fehlende Übersetzungen (für Tests): alle festen Sätze müssen englisch sein. */
export const SAETZE_EN = SAETZE;
