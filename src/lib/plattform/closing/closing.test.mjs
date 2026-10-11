// Reine Regeln des Deal-Abschlusses (Closing): CP-Anlage inkl. LOI-Bedingungen, Signing-/Closing-Prüfung,
// Kaufpreis-Ableitung, Meilensteine, überfällige Closing Conditions. Spiegel: plattform/closing_kern.py.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CP_AUS_LOI, CP_STANDARD, SIGNING_PUNKTE, closingPruefen, cpsAnlegen, cpsUeberfaellig, kaufpreisAbleiten,
  meilensteineBereinigen, signingAnlegen, signingPruefen, uebergabeAnlegen,
} from "./closing.js";

const HEUTE = "2026-10-11";

function closingBereit({ status = "signing", cps = [], zahlung = { eingangAm: "2026-10-01" }, struktur = "asset", notar = {} } = {}) {
  return { status, struktur, kaufpreis: 1000000, cps, zahlung, notar, signing: { punkte: signingAnlegen() } };
}

test("cpsAnlegen: Standard-CPs je Struktur plus CPs aus LOI-Bedingungen, ohne Dubletten", () => {
  const share = cpsAnlegen("share", { loiBedingungen: ["gremien", "netz"], heute: HEUTE });
  const schluessel = share.map((x) => x.schluessel);
  for (const c of [...CP_STANDARD.gemeinsam, ...CP_STANDARD.share]) assert.ok(schluessel.includes(c.schluessel), c.schluessel);
  assert.ok(schluessel.includes(CP_AUS_LOI.gremien.schluessel));
  assert.ok(schluessel.includes(CP_AUS_LOI.netz.schluessel));
  assert.equal(new Set(schluessel).size, schluessel.length, "keine doppelten CPs");
  for (const c of share) {
    assert.equal(c.status, "offen");
    assert.match(c.frist, /^20\d\d-\d\d-\d\d$/);
    assert.ok(c.frist > HEUTE, "Frist liegt in der Zukunft");
  }
  // Asset Deal hat eigene CPs, keine Share-CPs
  const asset = cpsAnlegen("asset", { heute: HEUTE }).map((x) => x.schluessel);
  assert.ok(asset.includes("vertragsuebernahme"));
  assert.ok(!asset.includes("abtretung_form"));
});

test("signingPruefen: KYC beider Seiten, Checkliste und Kaufpreis sind Pflicht", () => {
  const c = { status: "vorbereitung", kaufpreis: 500000, signing: { punkte: signingAnlegen() }, cps: [] };
  const ohneKyc = signingPruefen(c, {});
  assert.equal(ohneKyc.ok, false);
  assert.ok(ohneKyc.gruende.some((g) => g.includes("Käufers")));
  assert.ok(ohneKyc.gruende.some((g) => g.includes("Verkäufers")));
  // alles erledigt → ok
  for (const p of c.signing.punkte) Object.assign(p, { erledigt: true, am: HEUTE });
  const ok = signingPruefen(c, { kycKaeufer: true, kycVerkaeufer: true });
  assert.equal(ok.ok, true, ok.gruende.join(" "));
  // falscher Status bzw. fehlender Kaufpreis blocken
  assert.equal(signingPruefen({ ...c, status: "signing" }, { kycKaeufer: true, kycVerkaeufer: true }).ok, false);
  assert.equal(signingPruefen({ ...c, kaufpreis: 0 }, { kycKaeufer: true, kycVerkaeufer: true }).ok, false);
  // KYC-Punkte der Checkliste sind automatisch (nicht manuell abhakbar)
  assert.ok(SIGNING_PUNKTE.find((p) => p.schluessel === "kyc_kaeufer").auto);
});

test("closingPruefen: offene CPs, fehlender Zahlungseingang und fehlender Notartermin (Share) blocken", () => {
  const kyc = { kycKaeufer: true, kycVerkaeufer: true };
  const offenCp = closingBereit({ cps: [{ schluessel: "banken", label: "Bankenfreigabe", status: "offen" }] });
  const r1 = closingPruefen(offenCp, kyc);
  assert.equal(r1.ok, false);
  assert.ok(r1.gruende.some((g) => g.includes("Closing Condition")));
  const ohneGeld = closingBereit({ zahlung: { treuhand: true, eingangAm: "" } });
  const r2 = closingPruefen(ohneGeld, kyc);
  assert.ok(r2.gruende.some((g) => g.includes("Treuhand")));
  const shareOhneNotar = closingBereit({ struktur: "share" });
  assert.ok(closingPruefen(shareOhneNotar, kyc).gruende.some((g) => g.includes("Notartermin")));
  // verzichtete CPs blocken nicht; vollständig → ok
  const fertig = closingBereit({ struktur: "share", cps: [{ schluessel: "kein_mac", label: "MAC", status: "verzichtet" }], notar: { termin: "2026-10-20T08:00:00.000Z" } });
  const r3 = closingPruefen(fertig, kyc);
  assert.equal(r3.ok, true, r3.gruende.join(" "));
  // KYC muss zum Closing WEITER verifiziert sein
  assert.equal(closingPruefen(fertig, { kycKaeufer: true, kycVerkaeufer: false }).ok, false);
});

test("cpsUeberfaellig: nur unerledigte CPs mit abgelaufener Frist, nur in offenen Räumen", () => {
  const cps = [
    { schluessel: "a", status: "offen", frist: "2026-10-01" }, // überfällig
    { schluessel: "b", status: "gemeldet", frist: "2026-10-10" }, // überfällig (gemeldet ≠ geprüft)
    { schluessel: "c", status: "offen", frist: "2026-12-01" }, // Zukunft
    { schluessel: "d", status: "erfuellt", frist: "2026-09-01" }, // erledigt
    { schluessel: "e", status: "verzichtet", frist: "2026-09-01" }, // erledigt
    { schluessel: "f", status: "offen", frist: "" }, // ohne Frist
  ];
  const offen = { status: "signing", cps };
  assert.deepEqual(cpsUeberfaellig(offen, HEUTE).map((x) => x.schluessel), ["a", "b"]);
  assert.deepEqual(cpsUeberfaellig({ status: "vorbereitung", cps }, HEUTE).map((x) => x.schluessel), ["a", "b"]);
  for (const status of ["vollzogen", "abgebrochen"]) assert.equal(cpsUeberfaellig({ status, cps }, HEUTE).length, 0, status);
  assert.equal(cpsUeberfaellig(null, HEUTE).length, 0);
});

test("kaufpreisAbleiten: Zuschlag vor LOI, LOI-Betrag vor Preis je kWp", () => {
  assert.deepEqual(kaufpreisAbleiten({ gebotGesamt: 2500000, loi: { betrag: 2000000 } }), { betrag: 2500000, quelle: "zuschlag" });
  assert.deepEqual(kaufpreisAbleiten({ loi: { betrag: 2000000 } }), { betrag: 2000000, quelle: "loi" });
  assert.deepEqual(kaufpreisAbleiten({ loi: { preisProKwp: 100 }, mwp: 10 }), { betrag: 1000000, quelle: "loi" });
  assert.deepEqual(kaufpreisAbleiten({}), { betrag: 0, quelle: "" });
});

test("meilensteineBereinigen: Summe über dem Kaufpreis → 422, leere Zeilen fallen weg", () => {
  const ok = meilensteineBereinigen([{ label: "Closing", betrag: 800000 }, { label: "COD", betrag: 200000, faelligAm: "2027-09-30" }, { label: "", betrag: 999 }], 1000000);
  assert.equal(ok.length, 2);
  assert.equal(ok[1].faelligAm, "2027-09-30");
  assert.throws(() => meilensteineBereinigen([{ label: "Closing", betrag: 900000 }, { label: "COD", betrag: 200000 }], 1000000), (e) => e.status === 422);
});

test("Übergabe-Checkliste deckt Register-, Netzbetreiber- und Zugangs-Punkte ab", () => {
  const schluessel = uebergabeAnlegen().map((x) => x.schluessel);
  for (const k of ["unterlagen", "zugaenge", "netzbetreiber", "behoerden", "grundbuch"]) assert.ok(schluessel.includes(k), k);
});
