// Gemeinsame Testfälle JS ↔ Python erzeugen: node Backend-Import/dienste/geodaten/tests/faelle_erzeugen.mjs
// (im Website-Repository ausführen; schreibt tests/faelle.json mit den Ergebnissen der JS-Engine
// src/lib/plattform/geodaten/scoring.js). Die Python-Tests prüfen, dass scoring.py dieselben Werte liefert.
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.resolve(hier, "../../../..");
const s = await import(pathToFileURL(path.join(wurzel, "src/lib/plattform/geodaten/scoring.js")).href);
const g = await import(pathToFileURL(path.join(wurzel, "src/lib/plattform/geodaten/geo.js")).href);

const knoten = [
  { id: "uw-a", name: "UW A", art: "uw110", kapazitaet: "unbekannt", lon: 13.08, lat: 48.25 },
  { id: "tr-b", name: "Trafo B", art: "trafo", kapazitaet: "unbekannt", lon: 13.02, lat: 48.21 },
  { id: "uw-c", name: "UW C", art: "uw110", kapazitaet: "knapp", lon: 13.0, lat: 48.2 },
  { id: "uew-d", name: "UW D", art: "uew", kapazitaet: "frei", lon: 13.3, lat: 48.3 },
];
const basis = { ha: 12, kompaktheit: 0.92, neigungGrad: 2.5, exposition: "S", nutzung: { acker: 12, gruenland: 0, sonstige: 0 }, schutz: [], siedlungAbstandM: 450, bundesland: "Oberösterreich", land: "AT" };
const mitNetz = (m, punkt) => ({ ...m, netz: s.besterKnoten(punkt, s.mwpFuer(m.ha), knoten) });
const faelle = [
  { name: "Idealfläche nahe Trafo", m: mitNetz({ ...basis, widmung: s.widmungslage({ bundesland: "Oberösterreich", uwAbstandKm: 3.2 }) }, [13.03, 48.215]) },
  { name: "Groß, UW nötig, Priorität 2", m: mitNetz({ ...basis, ha: 38, kompaktheit: 0.7, neigungGrad: 6, exposition: "SO", widmung: s.widmungslage({ bundesland: "Oberösterreich", uwAbstandKm: 6.4 }) }, [13.05, 48.23]) },
  { name: "Zu klein", m: mitNetz({ ...basis, ha: 1.4, widmung: { status: "zone" } }, [13.03, 48.215]) },
  { name: "Natura 2000", m: mitNetz({ ...basis, ha: 20, schutz: [{ art: "natura2000", anteil: 0.4, abstandM: 0 }], widmung: s.widmungslage({ bundesland: "Salzburg" }) }, [13.03, 48.215]) },
  { name: "Steil, Nordhang, nah Siedlung, LSG", m: mitNetz({ ...basis, ha: 7, neigungGrad: 16.5, exposition: "N", siedlungAbstandM: 60, nutzung: { acker: 2, gruenland: 5, sonstige: 0 }, schutz: [{ art: "landschaftsschutz", anteil: 0.3, abstandM: 0 }, { art: "naturschutz", anteil: 0, abstandM: 120 }], widmung: s.widmungslage({ bundesland: "Oberösterreich", uwAbstandKm: 9 }) }, [13.03, 48.215]) },
  { name: "NÖ außerhalb Zone > 2 ha", m: mitNetz({ ...basis, ha: 9, bundesland: "Niederösterreich", widmung: s.widmungslage({ bundesland: "Niederösterreich", zoneAbstandM: 150 }) }, [13.03, 48.215]) },
  { name: "Kein Netz im Umkreis", m: { ...basis, ha: 5.5, netz: null, widmung: s.widmungslage({ bundesland: "Kärnten" }), bundesland: "Kärnten" } },
  { name: "Sehr groß, 110 kV", m: mitNetz({ ...basis, ha: 70, widmung: s.widmungslage({ bundesland: "Oberösterreich", uwAbstandKm: 2 }) }, [13.25, 48.28]) },
  // Deutschland (EEG-Kulisse, § 35 BauGB) und Schweiz (Richtplan, FFF) – Ausbaustufe A1b
  { name: "DE A 96 privilegiert + Randstreifen", m: mitNetz({ ...basis, bundesland: "Bayern", land: "DE", kulisse: { randstreifenAnteil: 1, privilegiertAnteil: 0.8 }, widmung: s.widmungslage({ bundesland: "Bayern", land: "DE", privilegiertAnteil: 0.8 }) }, [13.03, 48.215]) },
  { name: "DE nur Randstreifen 500 m", m: mitNetz({ ...basis, ha: 9, bundesland: "Bayern", land: "DE", kulisse: { randstreifenAnteil: 0.6, privilegiertAnteil: 0 }, widmung: s.widmungslage({ bundesland: "Bayern", land: "DE", privilegiertAnteil: 0 }) }, [13.05, 48.23]) },
  { name: "DE benachteiligtes Gebiet", m: mitNetz({ ...basis, ha: 16, bundesland: "Bayern", land: "DE", kulisse: { benachteiligtAnteil: 1 }, widmung: s.widmungslage({ bundesland: "Bayern", land: "DE" }) }, [13.03, 48.215]) },
  { name: "DE Moor mit Wiedervernässung", m: mitNetz({ ...basis, ha: 11, nutzung: { acker: 3, gruenland: 8, sonstige: 0 }, bundesland: "Bayern", land: "DE", kulisse: { moorAnteil: 0.9, benachteiligtAnteil: 0.3 }, widmung: s.widmungslage({ bundesland: "Bayern", land: "DE" }) }, [13.03, 48.215]) },
  { name: "DE ohne Kulisse (Niedersachsen)", m: mitNetz({ ...basis, bundesland: "Niedersachsen", land: "DE", kulisse: {}, widmung: s.widmungslage({ bundesland: "Niedersachsen", land: "DE" }) }, [13.03, 48.215]) },
  { name: "CH Eignungsgebiet mit FFF", m: mitNetz({ ...basis, ha: 8, bundesland: "Bern", land: "CH", kulisse: { eignungAnteil: 0.7, fffAnteil: 0.4 }, widmung: s.widmungslage({ bundesland: "Bern", land: "CH", eignungAnteil: 0.7 }) }, [13.03, 48.215]) },
  { name: "CH vorbelastet ohne Eignungsgebiet", m: mitNetz({ ...basis, ha: 6, bundesland: "Zürich", land: "CH", kulisse: { vorbelastet: true }, widmung: s.widmungslage({ bundesland: "Zürich", land: "CH" }) }, [13.03, 48.215]) },
];
const aus = {
  hinweis: "Automatisch erzeugt von faelle_erzeugen.mjs – nicht von Hand ändern.",
  version: s.SCORING_VERSION,
  knoten,
  bewertung: faelle.map((f) => {
    const r = s.bewerte(f.m);
    const m = { ...f.m, widmung: f.m.widmung ? { status: f.m.widmung.status } : undefined };
    return { name: f.name, eingabe: m, erwartet: { score: r.score, ampel: r.ampel, ko: r.ko.map((k) => k.id), punkte: Object.fromEntries(r.kriterien.map((k) => [k.id, k.punkte])), mwp: r.mwp } };
  }),
  netzkosten: [[5, 1, "auto", "unbekannt"], [10, 2, "auto", "frei"], [30, 3, "auto", "unbekannt"], [80, 4, "auto", "knapp"], [8, 6.5, "msLeitung", "unbekannt"]].map(([mwp, km, ebene, kap]) => ({ mwp, km, ebene, kapazitaet: kap, erwartet: s.netzkosten(mwp, km, { ebene, kapazitaet: kap }) })),
  bester: [[13.03, 48.215, 3], [13.05, 48.23, 30], [13.25, 48.28, 45]].map(([lon, lat, mwp]) => {
    const b = s.besterKnoten([lon, lat], mwp, knoten);
    return { punkt: [lon, lat], mwp, erwartet: b ? { id: b.knoten.id, luftlinieM: b.luftlinieM, trasseM: b.trasseM, summe: b.kosten.summe } : null };
  }),
  distanz: [[[13.0346, 48.2566], [13.4886, 48.2107]], [[12.83, 48.05], [13.04, 48.253]], [[16.3738, 48.2082], [13.0457, 47.8095]]].map(([a, b]) => ({ a, b, erwartetM: Math.round(g.distanzM(a, b) * 1000) / 1000 })),
  kompaktheit: (() => {
    const q = { type: "Polygon", coordinates: [[[13, 48], [13.004, 48], [13.004, 48.0027], [13, 48.0027], [13, 48]]] };
    const streifen = { type: "Polygon", coordinates: [[[13, 48], [13.02, 48], [13.02, 48.0004], [13, 48.0004], [13, 48]]] };
    const l = { type: "Polygon", coordinates: [[[13, 48], [13.006, 48], [13.006, 48.001], [13.001, 48.001], [13.001, 48.004], [13, 48.004], [13, 48]]] };
    return [q, streifen, l].map((geo) => ({ geo, flaecheM2: Math.round(g.flaecheM2(geo) * 10) / 10, erwartet: g.kompaktheit([geo], g.flaecheM2(geo)) }));
  })(),
};
writeFileSync(path.join(hier, "faelle.json"), JSON.stringify(aus, null, 1) + "\n");
console.log(`faelle.json geschrieben: ${aus.bewertung.length} Bewertungen, ${aus.netzkosten.length} Netzkosten, ${aus.bester.length} Knoten, ${aus.distanz.length} Distanzen`);
for (const b of aus.bewertung) console.log(`  ${b.name}: ${b.erwartet.score} ${b.erwartet.ampel} ko=${b.erwartet.ko.join(",")}`);
