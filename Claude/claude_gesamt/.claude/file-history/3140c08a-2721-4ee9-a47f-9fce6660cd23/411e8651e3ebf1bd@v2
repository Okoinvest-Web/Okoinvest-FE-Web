// Liest das Workflow-Journal und schreibt alle fertigen Ergebnisse in Dateien,
// damit eine Fortsetzung sie ohne Neuberechnung nutzen kann.
//   dossier-teams.md   – Berichte der Team-Leads (kompakt, für Strategie-Rat und Personalchef)
//   experten/*.md      – Einzelergebnisse aller fertigen Experten (Tiefe, bei Bedarf nachlesen)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const WF = "C:/Users/SALEADMIN/.claude/projects/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/subagents/workflows/wf_7a952aea-a4c/journal.jsonl";
const HIER = decodeURIComponent(new URL(".", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const L = readFileSync(WF, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const labelVon = new Map(L.filter((x) => x.type === "started").map((x) => [x.key, x.label]));

// je Label das zuletzt fertige Ergebnis
const fertig = new Map();
for (const x of L) if (x.type === "result" && labelVon.has(x.key)) fertig.set(labelVon.get(x.key), x.result);

const text = (r) => (typeof r === "string" ? r : [
  r.kernbefunde && "Kernbefunde:\n" + r.kernbefunde.map((s) => "- " + s).join("\n"),
  r.initiativen && "Initiativen:\n" + r.initiativen.map((i) => `- [${i.land}|Wirkung ${i.wirkung}|Aufwand ${i.aufwand}] ${i.titel}: ${i.beschreibung} | Alleinstellung: ${i.alleinstellung} | Risiko: ${i.risiko} | Messung: ${i.messgroesse}`).join("\n"),
  r.fehler_im_bestand && "Fehler im Bestand:\n" + r.fehler_im_bestand.map((s) => "- " + s).join("\n"),
  r.quick_wins && "Quick Wins:\n" + r.quick_wins.map((s) => "- " + s).join("\n"),
  r.warnungen && "Warnungen:\n" + r.warnungen.map((s) => "- " + s).join("\n"),
  r.quellen && "Quellen: " + r.quellen.join(" ; "),
].filter(Boolean).join("\n"));

const leads = [...fertig.entries()].filter(([l]) => / · Team-Lead$/.test(l));
const experten = [...fertig.entries()].filter(([l]) => !/ · Team-Lead$/.test(l) && !/^Leitstelle/.test(l));
writeFileSync(HIER + "dossier-teams.md", `# Team-Berichte (fertig, aus dem ersten Lauf)\n\n${leads.map(([l, r]) => `## ${l.replace(" · Team-Lead", "")}\n${text(r)}`).join("\n\n")}\n`);
mkdirSync(HIER + "experten", { recursive: true });
for (const [l, r] of experten) writeFileSync(HIER + "experten/" + l.replace(/[^\wäöüÄÖÜß&-]+/g, "_") + ".md", `# ${l}\n\n${text(r)}\n`);
console.log(`Team-Leads: ${leads.length} → dossier-teams.md (${Math.round(readFileSync(HIER + "dossier-teams.md").length / 1024)} KB)`);
console.log(leads.map(([l]) => "  " + l).join("\n"));
console.log(`Experten: ${experten.length} → experten/`);
