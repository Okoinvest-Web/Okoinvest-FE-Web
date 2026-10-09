// src/components/Rechtstexte/NutzungsbedingungenEn.js – englische Fassung der Nutzungsbedingungen (Sprachmodell)
//
// Übersetzung zur Information; maßgeblich ist die deutsche Fassung (src/app/(stamm)/nutzungsbedingungen/page.js).
// Gleiche Paragrafen und Absätze; ENTWURF wie die deutsche Fassung – anwaltliche Prüfung (Strang R).
// Liefert ein Fragment (keine Komponente), damit LegalShell die <h2> für das Inhaltsverzeichnis sieht.

import Link from "@/components/Land/Link";
import { AlertTriangle } from "lucide-react";
import { GESELLSCHAFT } from "@/data/site";
import { PROVISION } from "@/lib/invest/markt";
import { datumText, fmtZahl } from "@/lib/sprache/format";

const G = GESELLSCHAFT;
const provVon = fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en");
const provBis = fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en");

const BESONDERE_EN = [
  { href: "/bedingungen/projektboerse", titel: "Special terms for the project exchange", text: "framework of the commission agreement, protection against circumvention, optional exclusivity" },
  { href: "/bedingungen/energiebeschaffung", titel: "Energy procurement service agreement", text: "for companies that purchase their electricity via ÖkoInvest" },
  { href: "/bedingungen/lieferanten", titel: "Terms of participation for energy suppliers", text: "for invited suppliers in requests for quotation" },
  { href: "/bedingungen/banken", titel: "Confidentiality terms for banks", text: "for banks in the bank portal (bank package)" },
];

/** @param {{ entwurf: boolean, stand: string }} p */
export function nutzungsbedingungenInhaltEn({ entwurf, stand }) {
  return (
    <>
      {entwurf && (
        <aside role="note" className="mb-10 flex gap-4 rounded-2xl bg-sun-300/20 p-5 ring-1 ring-sun-300/60 md:p-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-navy-950">
            <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="font-display text-[16.5px] font-bold text-ink-900">Draft – for review by our lawyers</p>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-700">
              This version is a draft and has not yet been legally approved. Until approval, the agreements concluded in the individual case
              (in particular the non-disclosure agreement and the commission agreement) are authoritative for the project exchange.
            </p>
          </div>
        </aside>
      )}

      <h2>§ 1 Scope and provider</h2>
      <p>
        (1) These terms of use apply to the use of the website, the portal and the project exchange (together the “platform”) of {G.name}, {G.sitz},{" "}
        {G.plz} {G.ort}, Austria, {G.register}, {G.gericht} (“ÖkoInvest”, “we”).
      </p>
      <p>
        (2) The platform is aimed primarily at entrepreneurs, farmers, municipalities and institutional and private investors acting in the course of a
        commercial or professional activity. Users&apos; deviating terms and conditions only apply if we agree to them in writing.
      </p>
      <p>
        (3) Separate agreements may apply to individual services, in particular the non-disclosure agreement (NDA), the commission agreement, the
        procurement mandate and the following special terms. In the event of a conflict, these take precedence over the terms of use.
      </p>
      <ul>
        {BESONDERE_EN.map((b) => (
          <li key={b.href}>
            <Link href={b.href}>{b.titel}</Link> – {b.text}
          </li>
        ))}
      </ul>

      <h2>§ 2 Services of the platform</h2>
      <p>(1) The platform offers in particular:</p>
      <ul>
        <li>general information, guides, a glossary, calculators and market data,</li>
        <li>enquiries, for example about the assessment of land (land check), agrivoltaics, residual power, energy communities or the cooperative,</li>
        <li>a portal with role-based areas for land, projects, enquiries, messages, documents, appointments and support,</li>
        <li>
          the <Link href="/projektboerse">project exchange</Link>, in which sellers present photovoltaic and storage projects at different stages of
          development and investors can find suitable projects, with a deal room (data room, questions and answers, bidding process) and support with the
          conclusion of contracts,
        </li>
        <li>obtaining and evaluating electricity offers for companies (energy procurement, § 11),</li>
        <li>tools for valuation and financing, an AI assistant (§ 14) and the electronic signature (§ 10),</li>
        <li>for contracting customers, an overview of the plant on site, measurements and statements.</li>
      </ul>
      <p>
        (2) On the project exchange, we put sellers and investors in touch and support the initiation of transactions. Purchase, lease or other contracts
        relating to projects are concluded exclusively between the respective parties. If ÖkoInvest or a company of the ÖKOVOLT Group offers one of its own
        projects, this is indicated in the exposé.
      </p>
      <p>
        (3) There is no entitlement to any particular availability of the platform, to the publication of a project or to the conclusion of a contract. We
        may further develop, change or discontinue functions insofar as this is reasonable for users.
      </p>

      <h2>§ 3 Registration and account</h2>
      <p>
        (1) Registration is required for the portal and the detailed information on the project exchange. Natural persons with full legal capacity as well
        as legal entities and partnerships, represented by an authorised person, may register.
      </p>
      <p>
        (2) The information provided on registration must be true, complete and up to date; changes must be entered in the profile. Access data must be
        kept secret and must not be passed on to third parties. If misuse is suspected, we must be notified without delay.
      </p>
      <p>
        (3) There is no entitlement to activation. We may in particular refuse registration or block an account if information is implausible, an identity
        or authorisation check is not possible or these terms are breached.
      </p>
      <p>
        (4) We may require two-factor authentication for certain roles or functions. Personal one-time links (e.g. sign-in, invitation or appointment links)
        must be treated like access data and must not be forwarded.
      </p>
      <p>
        (5) Users can create an organisation and invite other persons. Anyone who creates an organisation or manages it as owner warrants that they are
        authorised to represent it and is responsible for ensuring that only authorised persons are members and that persons who have left are removed.
        Declarations made by members via the platform within the scope of their team role are deemed to be declarations of the organisation, insofar as
        the person is authorised to make them.
      </p>

      <h2>§ 4 Roles and permissions</h2>
      <p>
        (1) Users register in a role. The role determines which areas and information are accessible. A person may have several roles if we approve this.
        There are in particular the following roles:
      </p>
      <ul>
        <li>
          <strong>Landowners and farmers</strong> (including owners of roof areas): offer land or roofs for use and follow the assessment, lease offer,
          contract, land register and statements.
        </li>
        <li>
          <strong>Investors</strong>: create search profiles, receive access to exposés and data rooms after an NDA and submit letters of intent and bids.
        </li>
        <li>
          <strong>Project sellers</strong> (project developers, sellers of projects or operating plants): list projects that we review before publication
          (§ 6).
        </li>
        <li>
          <strong>Companies</strong>: submit enquiries about residual power, carports or storage; as <strong>contracting customers</strong> they obtain power
          from a plant that ÖkoInvest or a project company operates at their premises; as <strong>energy procurement customers</strong> they have their
          electricity purchased via us (§ 11).
        </li>
        <li>
          <strong>Members or citizens</strong>: are interested in the cooperative and energy communities (§ 13).
        </li>
        <li>
          <strong>Municipalities</strong>: accompany projects in their municipal area. We only activate the municipal view after checking eligibility; it only
          shows simplified, non-confidential project information.
        </li>
        <li>
          <strong>Experts and planners</strong> (by invitation only): work on assigned tasks in project development (§ 12).
        </li>
        <li>
          <strong>Energy suppliers</strong> (by invitation only): submit offers in energy procurement (§ 11 and special terms of participation).
        </li>
        <li>
          <strong>Banks</strong> (by invitation only): review financing requests for ÖkoInvest&apos;s own projects or those of its project companies (§ 12 and
          special confidentiality terms).
        </li>
      </ul>
      <p>
        (2) Roles assigned only by invitation apply exclusively to the assignment, tender or financing request to which the invitation relates. We may adjust
        or withdraw roles and permissions if this is necessary for security or confidentiality or if the reason no longer applies.
      </p>

      <h2>§ 5 Obligations of project sellers</h2>
      <p>(1) Anyone who lists a project warrants that</p>
      <ul>
        <li>
          all information and documents are, to the best of their knowledge, <strong>correct, complete and up to date</strong> and that material risks (e.g.
          missing commitments, deadlines, objections, encumbrances) are not concealed,
        </li>
        <li>
          they are <strong>authorised to dispose of</strong> the project or have been instructed by the entitled party to market it, the necessary rights
          (e.g. land securing, grid connection commitment, planning rights) exist to the extent stated and the marketing does not infringe the rights of
          third parties or contractual restrictions,
        </li>
        <li>
          they are entitled to upload personal data of third parties (such as landowners) and redact or anonymise such data as far as possible,
        </li>
        <li>they will promptly add to the portal or notify us of any changes that affect the value or feasibility of the project,</li>
        <li>
          they will answer questions in the deal room objectively and completely within the deadline set, and will not give answers intended for all
          interested parties only to individual investors.
        </li>
      </ul>
      <p>
        (2) Information on economic viability (e.g. return, yield) is information provided by the seller and is marked as such. The seller indemnifies
        ÖkoInvest against third-party claims based on incorrect information or missing rights of the seller, including reasonable costs of legal defence,
        insofar as the seller is responsible for the breach of duty.
      </p>

      <h2>§ 6 Review and release by ÖkoInvest</h2>
      <p>
        (1) We review listed projects for <strong>plausibility and completeness</strong> before publication. We may ask questions, request documents,
        anonymise information for the public teaser and refuse or end publication without giving reasons.
      </p>
      <p>
        (2) The review does not replace due diligence. We give no guarantee that project information is correct, that permits will be granted, that grid
        connections will materialise or that projects will be economically successful. Investors review each project on their own responsibility and with
        their own advisers.
      </p>

      <h2>§ 7 Confidentiality and NDA</h2>
      <p>
        (1) Only anonymised exposé teasers are publicly visible. Detailed information, location and documents in the data room are only unlocked after
        signing in and concluding a non-disclosure agreement (NDA) for the respective project. The conclusion is logged with a time stamp and IP address
        (see <Link href="/datenschutz">privacy policy</Link>).
      </p>
      <p>
        (2) Confidential information may be used exclusively to assess the respective project and may only be passed on to the user&apos;s own corporate
        bodies, employees and advisers and financiers bound by confidentiality, insofar as they need it. Copying, forwarding or automatically extracting
        data room content for other purposes is prohibited.
      </p>
      <p>(3) The obligations under an NDA continue to apply after the end of use, for the duration agreed therein.</p>

      <h2>§ 8 Deal room: anonymity, questions and answers, data room, bidding process</h2>
      <p>
        (1) <strong>Anonymity and prohibition of circumvention.</strong> Until contact is released by ÖkoInvest, investors only appear to the seller under a
        pseudonym and the seller only appears to investors as “Seller”. It is prohibited to deliberately establish the identity of the other side, to
        contact them outside the platform or to include contact details, links or clues to identity in questions, answers, documents or bids. We remove such
        information and may block access in the event of breaches. Protection against circumvention under § 17(4) remains unaffected.
      </p>
      <p>
        (2) <strong>Questions and answers.</strong> We moderate questions before passing them on to the seller; we may summarise or reject them or set
        deadlines for the answer. We review answers before publication. Answers released for everyone are seen by all interested parties with data room
        access, without the person asking being named. There is no entitlement to an answer.
      </p>
      <p>
        (3) <strong>Data room stages.</strong> Documents are released in stages: the first stage is open after NDA approval, the second as a rule only after a
        letter of intent (LOI) or admission to a binding bidding round. The seller determines, in consultation with us, which document belongs to which
        stage.
      </p>
      <p>
        (4) <strong>Marking and log.</strong> Confidential exposés and downloads bear the name of the recipient and the date. Every access is logged; the
        seller sees the log in pseudonymised form. Removing or obscuring the marking is prohibited.
      </p>
      <p>
        (5) <strong>Bidding process.</strong> If we conduct a bidding process for a project, the rules communicated in advance (rounds, deadlines, mandatory
        information) apply. Bids are <strong>sealed</strong>: no bidder learns of other bidders&apos; bids, names or number; the seller only receives the
        overview after our release and in pseudonymised form. In each round, the most recently submitted bid applies; bids are locked after the deadline.
        Indicative bids are non-binding; binding bids bind the bidder until the date stated, unless otherwise agreed, and require information on financing
        and timetable.
      </p>
      <p>
        (6) The seller is free to award the project or to end the process without an award. There is no <strong>entitlement to an award</strong> or to the
        conclusion of a purchase agreement. An award reserves the project; the purchase agreement is only concluded when it is signed in the form required
        by law (e.g. notarisation for the purchase of shares).
      </p>

      <h2>§ 9 Identity verification (KYC/KYB) and credit check</h2>
      <p>
        (1) We only release certain steps – in particular data room access, letters of intent and bids, publication of projects, awards, conclusion of
        contracts, payouts and contracting agreements – after a successful identity or company check. Users undertake to{" "}
        <strong>cooperate truthfully and completely</strong>: to submit valid identity and register documents, disclose beneficial owners and
        representatives, answer questions on the source of funds and notify changes (e.g. change of shareholders, expiry of an ID document) without delay.
        We may repeat the check at reasonable intervals.
      </p>
      <p>
        (2) Before a letter of intent, a binding bid or a contract involving financial risk, we may obtain a credit report; we will inform you about this in
        advance. The decision is made by an employee; users can present their point of view and submit further documents (e.g. confirmation of financing).
      </p>
      <p>
        (3) If information is not provided, if there are hits on sanctions lists that cannot be cleared, or if there are indications of money laundering or
        fraud, we may refuse the steps concerned, block the account and – where required by law – inform authorities. There is no entitlement to release.
      </p>

      <h2>§ 10 Electronic signature</h2>
      <p>
        (1) Documents can be signed electronically in the portal. This is a <strong>simple electronic signature</strong> within the meaning of Art. 3(10) of
        the eIDAS Regulation – expressly not an advanced or qualified electronic signature. The signature is logged with a confirmation code sent by e-mail,
        time, IP address, browser and checksums of the document; the signed document receives an audit page.
      </p>
      <p>
        (2) Users agree that declarations they make in this way are deemed to have been made by them as between them and ÖkoInvest or the contracting
        parties involved, unless it is proven that an unauthorised person acted. They only sign for themselves or within the scope of an existing power of
        representation.
      </p>
      <p>
        (3) <strong>Formal requirements remain unaffected.</strong> The simple electronic signature replaces neither the statutory written form nor
        certification or notarisation (e.g. land register declarations, assignment of shares in a limited liability company, contracts for the purchase of
        land). For such declarations, the portal serves only as preparation.
      </p>

      <h2>§ 11 Energy procurement and requests for quotation among energy suppliers</h2>
      <p>
        (1) Companies can instruct ÖkoInvest to obtain offers from energy suppliers for their electricity supply, including bundled with other customers.
        This requires a valid procurement mandate and the service agreement (see{" "}
        <Link href="/bedingungen/energiebeschaffung">Energy procurement service agreement</Link>). Customers are responsible for the accuracy of their
        information (supply points, consumption, load profile, current contracts and notice periods).
      </p>
      <p>
        (2) <strong>Participation.</strong> Only energy suppliers we invite take part in requests for quotation. All invited suppliers receive the same
        documents and deadlines; answers to questions go to all in anonymised form. The consumption data is anonymised and may only be used for the
        respective offer.
      </p>
      <p>
        (3) <strong>Validity period.</strong> Offers are binding until the validity date stated in the offer. After the offer deadline has expired, offers
        are locked; the offer submitted last in each round is authoritative.
      </p>
      <p>
        (4) <strong>Confidentiality.</strong> Offers are sealed; no supplier learns the prices or names of other suppliers. In subsequent rounds, we share at
        most the information announced in advance (e.g. rank or distance to the best offer, never names).
      </p>
      <p>
        (5) <strong>No entitlement to an award.</strong> The award is only made after the customer&apos;s express approval in the portal. The customer is
        free not to accept any offer. The supply contract is concluded exclusively between the customer and the supplier; ÖkoInvest does not become a party
        to the electricity supply contract.
      </p>
      <p>
        (6) Public contracting authorities are subject to public procurement law. The request for quotation does not replace a formal award procedure;
        municipalities only use it for market research or together with an award procedure.
      </p>

      <h2>§ 12 Obligations of experts, planners and banks</h2>
      <p>
        (1) <strong>Experts and planners</strong> only receive access to the assignments allocated to them. They treat all project and owner data
        confidentially, use it only for the assignment, do not pass it on to third parties (except to assistants bound by confidentiality) and delete or
        hand it over on completion as instructed. They provide their services with professional independence and in accordance with the recognised rules
        of their discipline; content, remuneration and liability are governed by the respective assignment. Proof of qualifications must be submitted on
        request.
      </p>
      <p>
        (2) <strong>Banks</strong> only see the requests addressed to their institution and only released documents in the bank portal. They treat the bank
        package as confidential, use it exclusively to assess and carry out the respective financing and only pass it on to their corporate bodies,
        employees, committees, supervisory authorities and advisers, experts and refinancers bound by confidentiality. Details are set out in the{" "}
        <Link href="/bedingungen/banken">confidentiality terms for banks</Link>. Banking secrecy and any further agreements remain unaffected.
      </p>
      <p>
        (3) <strong>Municipalities</strong> use information from the municipal view for their tasks in land-use planning and participation. They only pass on
        non-public project information insofar as they are legally obliged to do so.
      </p>

      <h2>§ 13 Contracting customers, members and energy communities</h2>
      <p>
        (1) Contracting customers see measurements and statements in the portal for the plant that ÖkoInvest or a project company operates at their
        premises. The plant remains the property of the operator. Only the values of the calibrated meters are authoritative for billing; monitoring values
        are for information. Rights and obligations arise from the contracting agreement.
      </p>
      <p>
        (2) The cooperative is being set up. Reservations and expressions of interest in the portal are non-binding and do not constitute a subscription
        for shares. No cooperative shares or participations are offered publicly via the platform; a declaration of membership is only made after the
        cooperative has been founded and on the basis of the articles of association then in force. The terms of the respective community apply to energy
        communities.
      </p>

      <h2>§ 14 AI assistant</h2>
      <p>
        (1) The optional assistant creates <strong>drafts and summaries</strong> (e.g. exposé texts, answers on released documents, draft messages). Results
        may be incomplete or wrong. They must be checked before any use; only what the user confirms is adopted, saved or sent.
      </p>
      <p>
        (2) The assistant does <strong>not provide legal, tax, investment or technical advice</strong> and does not replace a review of documents by experts.
        Answers relate only to the data released to the user. For queries about the project, the route via questions and answers or messages is
        authoritative. We may limit use or switch off AI mode.
      </p>

      <h2>§ 15 No investment advice, calculators and valuations</h2>
      <p>
        (1) Content on the platform – including guides, calculators, market data, project valuations and exposés – is provided for general information. It
        does <strong>not constitute investment, legal or tax advice</strong> or a recommendation to acquire a particular project.
      </p>
      <p>
        (2) No financial instruments, investments or securities are offered publicly via the platform. Calculation results are based on simplified
        assumptions as of the date stated and are not an assurance of future income. Investments in energy projects involve risks up to and including the
        total loss of the capital invested.
      </p>
      <p>
        (3) Calculators, the valuation tool, financing cockpit, subsidy check, land assessment, lease offer check, due diligence index, switching analysis and
        grid connection estimates provide <strong>guidance</strong>. They replace neither a review by your own advisers nor binding information from grid
        operators, authorities, funding bodies or banks. Tax statements are approximations and must be checked with a tax adviser. Information on subsidies
        is not a commitment.
      </p>

      <h2>§ 16 Liability</h2>
      <p>
        (1) We are not liable for information, documents and declarations of third parties, in particular project sellers, experts, energy suppliers and
        banks. We do not adopt such information as our own.
      </p>
      <p>
        (2) Otherwise, we are only liable for damage caused by us intentionally or through gross negligence. This limitation does not apply to personal
        injury, to the breach of material contractual obligations within the scope of the foreseeable, typical damage, or insofar as mandatory law (for
        example in favour of consumers) provides for more extensive liability.
      </p>
      <p>
        (3) We are not liable for interruptions to availability or data loss due to force majeure or the actions of third parties. For decisions that users
        make on the basis of calculation results, valuations or drafts by the AI assistant (§§ 14, 15), we are only liable in accordance with paragraph 2.
      </p>

      <h2>§ 17 Commission</h2>
      <p>
        (1) Use of the platform is <strong>free of charge for investors and landowners</strong>.
      </p>
      <p>
        (2) If a contract relating to the project is concluded between a project seller and an investor introduced or referred via the platform (for example
        the purchase of project rights, shares in a project company or the plant), the seller owes a{" "}
        <strong>
          seller commission of {provVon} to {provBis} % of the purchase price
        </strong>
        . The commission is <strong>only payable on closing</strong>; if there is no closing, the seller incurs no costs.
      </p>
      <p>
        (3) The amount, basis of assessment, due date (e.g. in the case of staggered purchase price or milestone payments) and all other details are set out
        in a <strong>separate commission agreement</strong>, which is concluded before a project is published (framework:{" "}
        <Link href="/bedingungen/projektboerse">special terms for the project exchange</Link>). Services in energy procurement are remunerated in accordance
        with the service agreement applicable there.
      </p>
      <p>
        (4) <strong>Protection against circumvention:</strong> the entitlement to commission also exists if the contract is concluded directly, circumventing
        the platform, or via affiliated companies, trustees or other third parties, provided that the investor first became known to the seller via the
        platform and the contract is concluded within 24 months of the project details being unlocked. Investors undertake not to use contacts obtained via
        the platform for circumvention. Details are set out in the commission agreement.
      </p>

      <h2>§ 18 User content</h2>
      <p>
        (1) Users retain the rights to their content. They grant us the simple right, limited to the duration of publication, to store this content for the
        purposes of the platform, to process it (e.g. anonymised teasers) and to make it accessible to authorised users.
      </p>
      <p>
        (2) In particular, false identity information, unlawful or misleading content, malware, automated extraction of the platform (scraping) and attempts
        to circumvent security mechanisms are prohibited.
      </p>

      <h2>§ 19 Term and termination</h2>
      <p>
        (1) The user agreement runs for an indefinite period. Users can terminate their account at any time without notice, for example via the profile in
        the portal or the <Link href="/kontakt">contact form</Link>. We can terminate with four weeks&apos; notice.
      </p>
      <p>
        (2) The right to terminate for good cause remains unaffected, in particular in the event of serious or repeated breaches of these terms, an NDA, the
        prohibition of circumvention or the obligations to cooperate under § 9.
      </p>
      <p>
        (3) Confidentiality obligations, accrued commission claims, binding bids and offers until the end of their validity period and the protection against
        circumvention continue to apply after termination. Stored data is deleted in accordance with the <Link href="/datenschutz">privacy policy</Link>.
      </p>

      <h2>§ 20 Changes to these terms</h2>
      <p>
        We may amend these terms with effect for the future if this is necessary for legal, technical or business reasons. We inform registered users at least
        four weeks before the changes take effect. If they do not object before the changes take effect, the changes are deemed accepted; we point out this
        consequence in the notification. In the event of an objection, either party may terminate the user agreement.
      </p>

      <h2>§ 21 Applicable law and place of jurisdiction</h2>
      <p>
        (1) <strong>Austrian law</strong> applies, excluding the conflict-of-law rules of private international law and the UN Convention on Contracts for the
        International Sale of Goods. Vis-à-vis consumers, this choice of law only applies insofar as it does not deprive them of the protection of mandatory
        provisions of the state in which they have their habitual residence.
      </p>
      <p>
        (2) The exclusive place of jurisdiction for disputes with entrepreneurs is the court with subject-matter jurisdiction for the registered office of{" "}
        {G.name} in {G.ort}. The statutory places of jurisdiction apply to consumers.
      </p>

      <h2>§ 22 Final provisions</h2>
      <p>
        Should any provision be or become invalid, the validity of the remaining provisions remains unaffected. Vis-à-vis entrepreneurs, it is replaced by a
        valid provision that comes as close as possible to the economic purpose.
      </p>
      <p>As of: {datumText(stand, "en")}.</p>
    </>
  );
}
