"use client";

// Grundbuch-Akte anlegen (aus Fläche, Anlage oder frei) und Stammdaten pflegen (Grundbuchdaten, Berechtigte, Entgelt,
// Laufzeit, Pfandgläubiger, Abbruch). Prüfungen serverseitig.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { Chip, ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { GB_LAENDER, GB_OBJEKTARTEN, GB_RECHTE } from "@/lib/plattform/closing/grundbuch";

const glaeubigerText = (liste) => (liste || []).map((g) => [g.name, g.recht].filter(Boolean).join(" | ")).join("\n");
const glaeubigerAus = (text) => String(text || "").split("\n").map((z) => z.trim()).filter(Boolean).map((z) => {
  const [name, recht] = z.split("|").map((x) => x.trim());
  return { name, recht: recht || "" };
});

export function GrundbuchAnlegen({ auswahl }) {
  const router = useRouter();
  const [art, setArt] = useState(auswahl.flaechen.some((f) => !f.belegt) ? "flaeche" : "anlage");
  const [bezugId, setBezugId] = useState("");
  const [land, setLand] = useState("DE");
  const [objektArt, setObjektArt] = useState("freiflaeche");
  const [recht, setRecht] = useState("");
  const [titel, setTitel] = useState("");
  const [eigentuemerName, setEigentuemerName] = useState("");
  const [eigentuemerEmail, setEigentuemerEmail] = useState("");
  const [glaeubiger, setGlaeubiger] = useState("");
  const [ohnePfand, setOhnePfand] = useState(false);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  const liste = art === "flaeche" ? auswahl.flaechen : art === "anlage" ? auswahl.anlagen : [];
  const gewaehlt = liste.find((x) => x.id === bezugId);
  const landEff = art === "frei" ? land : gewaehlt?.land || "DE";
  const rechte = GB_RECHTE[landEff] || GB_RECHTE.DE;

  async function anlegen(ev) {
    ev.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const body = { bezugArt: art, bezugId: art === "frei" ? undefined : bezugId, land: landEff, objektArt, recht: recht || Object.keys(rechte)[0], pfandglaeubiger: glaeubigerAus(glaeubiger), ohnePfandrecht: ohnePfand };
      if (art === "frei") Object.assign(body, { titel, eigentuemerName, eigentuemerEmail });
      const r = await senden("/api/admin/grundbuch", { body });
      router.push(`/portal/admin/grundbuch/${r.akte.id}`);
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={anlegen} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Bezug</legend>
        <div className="flex flex-wrap gap-2">
          {[["flaeche", "Fläche (Pacht)"], ["anlage", "Anlage (Contracting/Dach)"], ["frei", "Ohne Bezug"]].map(([k, l]) => (
            <Chip key={k} type="radio" name="gb-art" value={k} checked={art === k} onChange={() => { setArt(k); setBezugId(""); }}>{l}</Chip>
          ))}
        </div>
      </fieldset>
      {art !== "frei" ? (
        <Feld id="gb-bezug" label={art === "flaeche" ? "Fläche" : "Anlage"} pflicht hinweis={art === "flaeche" ? "Flächen ab Status „Pachtangebot“. Belegte Objekte haben bereits eine Akte." : "Anlagen, deren Dienstbarkeit nicht als „nicht erforderlich“ markiert ist."}>
          <select id="gb-bezug" required value={bezugId} onChange={(e) => setBezugId(e.target.value)} className={auswahlfeld}>
            <option value="">Bitte wählen …</option>
            {liste.map((x) => <option key={x.id} value={x.id} disabled={x.belegt}>{x.titel} ({x.land}{x.eigentuemer ? `, ${x.eigentuemer}` : ""}){x.belegt ? " – Akte vorhanden" : ""}</option>)}
          </select>
        </Feld>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="gb-titel" label="Titel" pflicht><input id="gb-titel" required value={titel} onChange={(e) => setTitel(e.target.value)} className={eingabe} placeholder="z. B. Baurecht Gewerbedach …" /></Feld>
          <Feld id="gb-eig" label="Eigentümer/in" pflicht><input id="gb-eig" required value={eigentuemerName} onChange={(e) => setEigentuemerName(e.target.value)} className={eingabe} /></Feld>
          <Feld id="gb-eigm" label="E-Mail des Portal-Kontos (optional)" hinweis="Dann sieht die Person die Akte im Portal."><input id="gb-eigm" type="email" value={eigentuemerEmail} onChange={(e) => setEigentuemerEmail(e.target.value)} className={eingabe} /></Feld>
          <Feld id="gb-land" label="Land">
            <select id="gb-land" value={land} onChange={(e) => { setLand(e.target.value); setRecht(""); }} className={auswahlfeld}>{Object.entries(GB_LAENDER).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </Feld>
          <Feld id="gb-obj" label="Objekt">
            <select id="gb-obj" value={objektArt} onChange={(e) => setObjektArt(e.target.value)} className={auswahlfeld}>{Object.entries(GB_OBJEKTARTEN).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}</select>
          </Feld>
        </div>
      )}
      <Feld id="gb-recht" label="Art des Rechts">
        <select id="gb-recht" value={recht || Object.keys(rechte)[0]} onChange={(e) => setRecht(e.target.value)} className={auswahlfeld}>{Object.entries(rechte).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select>
      </Feld>
      <Feld id="gb-pfand" label="Grundpfandgläubiger (eine Zeile je Bank, optional „| Recht“)" hinweis="Für jede Bank wird ein Rangrücktritt bzw. eine Vorrangseinräumung eingeholt.">
        <textarea id="gb-pfand" value={glaeubiger} onChange={(e) => setGlaeubiger(e.target.value)} className={textbereich} placeholder="Beispielbank eG | Grundschuld Abt. III Nr. 1" />
      </Feld>
      <label className="flex items-center gap-2 text-[14px] text-ink-700">
        <input type="checkbox" checked={ohnePfand} onChange={(e) => setOhnePfand(e.target.checked)} className="h-4 w-4 accent-ov-600" />
        Laut Grundbuchauszug keine Grundpfandrechte (Rang-Schritt entfällt)
      </label>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" size="sm" icon={Plus} disabled={laeuft || (art !== "frei" && !bezugId)}>Akte anlegen</Button>
    </form>
  );
}

export function GrundbuchStammdaten({ akte }) {
  const router = useRouter();
  const g = akte.grundstueck || {};
  const [f, setF] = useState({
    grundbuch: g.grundbuch || "", flurstuecke: g.flurstuecke || "", gebaeude: g.gebaeude || "", bezeichnung: g.bezeichnung || "",
    berechtigter: akte.berechtigter || "", eigentuemerName: akte.eigentuemerName || "", eigentuemerAnschrift: akte.eigentuemerAnschrift || "", eigentuemerAnzahl: akte.eigentuemerAnzahl || 1,
    entgeltJahr: akte.entgeltJahr || 0, laufzeitJahre: akte.laufzeitJahre || 25, laufzeitBeginn: akte.laufzeitBeginn || "", recht: akte.recht, glaeubiger: glaeubigerText(akte.pfandglaeubiger), notiz: akte.notiz || "",
  });
  const [grund, setGrund] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function speichern(ev) {
    ev.preventDefault();
    setFehler("");
    setErfolg("");
    try {
      await senden(`/api/admin/grundbuch/${akte.id}`, {
        method: "PATCH",
        body: {
          grundstueck: { bezeichnung: f.bezeichnung, grundbuch: f.grundbuch, flurstuecke: f.flurstuecke, gebaeude: f.gebaeude }, berechtigter: f.berechtigter, eigentuemerName: f.eigentuemerName,
          eigentuemerAnschrift: f.eigentuemerAnschrift, eigentuemerAnzahl: Number(f.eigentuemerAnzahl), entgeltJahr: Number(f.entgeltJahr), laufzeitJahre: Number(f.laufzeitJahre), laufzeitBeginn: f.laufzeitBeginn,
          recht: f.recht, pfandglaeubiger: glaeubigerAus(f.glaeubiger), notiz: f.notiz,
        },
      });
      setErfolg("Gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  async function abbrechen() {
    setFehler("");
    try {
      await senden(`/api/admin/grundbuch/${akte.id}`, { method: "PATCH", body: akte.abgebrochen ? { abgebrochen: false, wiederaufnehmen: true } : { abgebrochen: true, grund } });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  const rechte = GB_RECHTE[akte.land] || GB_RECHTE.DE;
  return (
    <div className="space-y-4">
      <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-2">
        <Feld id="gs-gb" label={akte.land === "AT" ? "KG / EZ" : akte.land === "CH" ? "Grundbuch / Gemeinde" : "Grundbuch von / Blatt"}><input id="gs-gb" value={f.grundbuch} onChange={set("grundbuch")} className={eingabe} /></Feld>
        <Feld id="gs-fl" label={akte.land === "AT" ? "Grundstücksnummer(n)" : akte.land === "CH" ? "Parzelle(n) / EGRID" : "Flurstück(e)"}><input id="gs-fl" value={f.flurstuecke} onChange={set("flurstuecke")} className={eingabe} /></Feld>
        {akte.objektArt === "dach" && <Feld id="gs-geb" label="Gebäude / Dachfläche"><input id="gs-geb" value={f.gebaeude} onChange={set("gebaeude")} className={eingabe} /></Feld>}
        <Feld id="gs-recht" label="Art des Rechts"><select id="gs-recht" value={f.recht} onChange={set("recht")} className={auswahlfeld}>{Object.entries(rechte).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Feld>
        <Feld id="gs-ber" label="Berechtigte/r"><input id="gs-ber" value={f.berechtigter} onChange={set("berechtigter")} className={eingabe} /></Feld>
        <Feld id="gs-eig" label="Eigentümer/in"><input id="gs-eig" value={f.eigentuemerName} onChange={set("eigentuemerName")} className={eingabe} /></Feld>
        <Feld id="gs-ans" label="Anschrift Eigentümer/in"><input id="gs-ans" value={f.eigentuemerAnschrift} onChange={set("eigentuemerAnschrift")} className={eingabe} /></Feld>
        <Feld id="gs-anz" label="Anzahl Unterschriften (Miteigentümer)"><input id="gs-anz" type="number" min="1" max="20" value={f.eigentuemerAnzahl} onChange={set("eigentuemerAnzahl")} className={eingabe} /></Feld>
        <Feld id="gs-ent" label="Entgelt pro Jahr (für Kostenschätzung)"><input id="gs-ent" type="number" min="0" step="100" value={f.entgeltJahr} onChange={set("entgeltJahr")} className={eingabe} /></Feld>
        <Feld id="gs-lz" label="Laufzeit (Jahre)"><input id="gs-lz" type="number" min="1" max="99" value={f.laufzeitJahre} onChange={set("laufzeitJahre")} className={eingabe} /></Feld>
        <Feld id="gs-lb" label="Laufzeit ab"><input id="gs-lb" value={f.laufzeitBeginn} onChange={set("laufzeitBeginn")} className={eingabe} placeholder="Inbetriebnahme" /></Feld>
        <Feld id="gs-pf" label="Grundpfandgläubiger (je Zeile „Bank | Recht“)" className="sm:col-span-2"><textarea id="gs-pf" value={f.glaeubiger} onChange={set("glaeubiger")} className={textbereich} /></Feld>
        <Feld id="gs-no" label="Interne Notiz" className="sm:col-span-2"><textarea id="gs-no" value={f.notiz} onChange={set("notiz")} className={textbereich} /></Feld>
        <div className="sm:col-span-2"><Button type="submit" size="sm" variant="navy" icon={Save}>Stammdaten speichern</Button></div>
      </form>
      <div className="border-t border-ink-100 pt-4">
        {!akte.abgebrochen && <Feld id="gs-grund" label="Grund für einen Abbruch"><input id="gs-grund" value={grund} onChange={(e) => setGrund(e.target.value)} className={eingabe} placeholder="z. B. Projekt nicht realisiert" /></Feld>}
        <Button type="button" size="sm" variant="ghost" icon={XCircle} onClick={abbrechen} className="mt-2">{akte.abgebrochen ? "Akte wieder aufnehmen" : "Akte abbrechen"}</Button>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
    </div>
  );
}
