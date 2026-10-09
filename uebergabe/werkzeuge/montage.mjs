import { chromium } from "playwright";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
const [dir, prefix, per, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter(f => f.startsWith(prefix + "-")).sort();
const b = await chromium.launch(); const p = await b.newPage();
for (let i = 0; i < files.length; i += +per) {
  const grp = files.slice(i, i + +per);
  const imgs = grp.map(f => `<div><div style="font:12px sans-serif">${f}</div><img src="data:image/png;base64,${readFileSync(dir + "/" + f).toString("base64")}" style="display:block;border:1px solid #f0f"></div>`).join("");
  await p.setContent(`<body style="margin:0;display:flex;gap:6px;background:#888">${imgs}</body>`);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${prefix}-m${String(i).padStart(2,"0")}.png`, fullPage: true });
}
await b.close();
