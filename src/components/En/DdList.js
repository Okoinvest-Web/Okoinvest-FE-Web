import { Gauge, Landmark, MapPinned, PlugZap, Scale, Wrench } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

/**
 * Due-Diligence-Bereiche auf Englisch (statisch, inhaltlich wie
 * Investoren/DdCheckliste). Deutsche Rechtsbegriffe in Klammern, damit
 * Käufer sie in den Unterlagen wiederfinden.
 */
export const DD_EN = [
  {
    icon: MapPinned,
    titel: "Land rights",
    punkte: [
      "Lease or use agreements for all plots, term covering operation plus decommissioning",
      "Easements registered in the land register (beschränkte persönliche Dienstbarkeiten) and subordination of mortgagees",
      "Consent of all owners, heirs and tenants; termination of existing agricultural leases",
      "Assignability of agreements to the buyer and the financing bank (step-in rights)",
    ],
  },
  {
    icon: Landmark,
    titel: "Permits & planning law",
    punkte: [
      "Zoning plan (B-Plan): resolution to draw up, public participation, adoption, publication – or privileged status under § 35 BauGB",
      "Building permit including conditions, deadlines and ancillary provisions",
      "Environmental and species protection (environmental report, special species assessment, compensation areas), EIA screening where required",
      "Glare, soil and unexploded-ordnance surveys, heritage and water protection",
      "Urban development contract and agreement with the municipality under § 6 EEG",
    ],
  },
  {
    icon: PlugZap,
    titel: "Grid connection",
    punkte: [
      "Grid connection commitment with point of connection, voltage level and capacity",
      "Reservation and its deadlines, construction cost contribution, grid operator's cost estimate",
      "Cable route: rights of way, crossings, permits along the route",
      "Curtailment, redispatch expectations and, where applicable, a flexible connection agreement",
    ],
  },
  {
    icon: Gauge,
    titel: "Energy yield assessment",
    punkte: [
      "Independent assessment with P50 and P90 (1-year and 10-year), irradiation data and uncertainties",
      "Layout, module and inverter selection, shading, losses, degradation",
      "For agri-PV: compliance with DIN SPEC 91434 and an agricultural use concept",
    ],
  },
  {
    icon: Wrench,
    titel: "Technology & construction",
    punkte: [
      "EPC offer or contract, construction schedule, warranties and guarantees",
      "Geotechnics and pile tests, fencing, access, fire protection",
      "Substation or transfer station, protection concept, certification under VDE application rules",
      "O&M, monitoring and insurance",
    ],
  },
  {
    icon: Scale,
    titel: "Legal, revenues & SPV",
    punkte: [
      "Project company (SPV): commercial register, shareholders, no legacy liabilities or side agreements",
      "EEG tender award (bid date, deadlines, penalties) or PPA term sheet / contract",
      "Direct marketing agreement, eligibility for support, registration in the market master data register (MaStR)",
      "Decommissioning obligation and security, taxes and trade-tax apportionment",
    ],
  },
];

export default function DdList() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {DD_EN.map((b, i) => {
        const Icon = b.icon;
        return (
          <Reveal key={b.titel} delay={i * 60} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="font-display text-[18px] font-bold text-ink-900">{b.titel}</h3>
            </div>
            <ul className="mt-5 space-y-2.5">
              {b.punkte.map((p) => (
                <li key={p} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        );
      })}
    </div>
  );
}
