// src/components/Rechtstexte/DatenschutzEn.js – englische Fassung der Datenschutzerklärung (Sprachmodell)
//
// Übersetzung zur Information; maßgeblich ist die deutsche Fassung (src/app/(stamm)/datenschutz/page.js,
// Hinweis oben im Text über LegalShell). Gleiche Gliederung und Abschnittsnummern wie die deutsche
// Fassung, Gesetzesbezeichnungen im Original mit kurzer Erklärung. ENTWURF wie die deutsche Fassung –
// Prüfung durch die Rechtsabteilung (Strang R). Platzhalter bleiben sichtbar markiert.
//
// Liefert ein Fragment (keine Komponente), damit LegalShell die <h2> für das Inhaltsverzeichnis sieht.

import Link from "@/components/Land/Link";
import { GESELLSCHAFT, KONTAKT } from "@/data/site";
import { pfad as seitenPfad } from "@/lib/land";
import { datumText } from "@/lib/sprache/format";

const G = GESELLSCHAFT;

/** Speicherfristen (Reihenfolge wie FRISTEN der deutschen Fassung). */
const FRISTEN_EN = [
  ["Server log data", "usually 14 days; in the event of security incidents, until the matter has been resolved"],
  ["Enquiries that do not lead to a contract", "up to 3 years after the last communication, unless you request erasure earlier"],
  ["Report request without confirmation (double opt-in)", "expires 48 hours after the request"],
  ["Report retrieval link", "30 days, after which the report is no longer available"],
  ["Newsletter", "a sign-up without confirmation expires after 48 hours; active subscriptions until you unsubscribe; we keep the consent and unsubscribe log (without content) as evidence plus the statutory limitation periods [pending legal review]"],
  ["Portal account", "for the duration of the registration; after the account has been deleted, removal within 30 days unless there is a retention obligation"],
  ["Ended sessions and invitations not accepted", "30 days"],
  ["Sign-in history (successful and failed sign-ins)", "180 days"],
  ["Notifications in the portal", "read notifications 12 months, all others at most 24 months"],
  ["NDA logs, data room access and exposé downloads", "for the duration of the confidentiality obligation plus the statutory limitation periods"],
  ["Signature logs and signed documents", "as long as the underlying document must be retained, at least until the limitation periods expire"],
  ["Appointments", "appointment details up to 12 months after the appointment, unless a case or contract results from it; management links expire with the appointment"],
  ["Support tickets", "up to 3 years after the ticket is closed, unless they relate to a contract"],
  ["AI assistant log (without content)", "12 months"],
  ["KYC/KYB documents and personal details", "5 years from the end of the calendar year in which the business relationship ends (rejected cases from the date of rejection)"],
  ["Credit reports", "[Platzhalter: up to 12 months after the check is completed or for the duration of the contract – to be set in the deletion concept]"],
  ["Land acquisition: owner data from the land register without a response", "12 months after the letter, then erasure"],
  ["Land acquisition: blocking note after an objection", "as long as necessary to respect the objection (name, address, reference to the plot and date only)"],
  ["Energy procurement: load profiles, supply points, procurement mandate", "for the duration of the procurement mandate; proof of the mandate plus the limitation periods"],
  ["Bank package and banks' access logs", "for the duration of the financing request or the loan relationship plus the limitation periods"],
  ["Plant measurement data (monitoring)", "[Platzhalter: high-resolution values e.g. 24 months, aggregated values for the term of the contract – to be set in the deletion concept]"],
  ["Billing-relevant meter readings, invoices, credit notes, payment runs", "Austria 7 years (§ 132 BAO, § 212 UGB), up to 22 years where land is concerned; Germany up to 10 years (§ 147 AO, § 257 HGB; accounting vouchers currently 8 years); Switzerland 10 years (Art. 958f OR)"],
  ["Contract, commission and accounting records", "7 years under § 132 BAO or § 212 UGB, longer where land is concerned; for German and Swiss companies, the periods applicable there (see above)"],
  ["Land register and easement files", "for the term of the easement or land-use agreement plus the limitation periods"],
  ["Consent (cookie settings)", "12 months, after which we ask again"],
  ["Country choice (cookie “land”, only after you choose)", "12 months or until you delete the cookie [pending legal review]"],
  ["Language choice (cookie “sprache”, only after you choose)", "12 months or until you delete the cookie [pending legal review]"],
  ["Google Analytics cookies", "up to 2 years or until consent is withdrawn; event data in Google Analytics at most 14 months"],
];

/** Sichtbar markierter Platzhalter (wie in der deutschen Fassung) – vor Livegang ersetzen. */
function Platzhalter({ children }) {
  return <mark className="rounded-md bg-sun-300/40 px-1.5 py-0.5 font-semibold text-ink-900">[Placeholder: {children}]</mark>;
}

/**
 * @param {{ stand: string }} p  Stand der deutschen Fassung
 */
export function datenschutzInhaltEn({ stand }) {
  const standEn = datumText(stand, "en");
  return (
    <>
      <nav aria-label="Contents of the privacy policy" className="mb-12 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 sm:p-5 md:p-6">
        <p className="px-1 font-display text-[16px] font-bold text-ink-900">Quick links</p>
        <ul className="!mt-3 grid !list-none gap-2 !pl-0 text-[14.5px] sm:grid-cols-2 [&_li+li]:!mt-0">
          {[
            ["#konto", "Portal, sign-in and teams (6–6g)"],
            ["#boerse", "Project exchange, signature, closing (7–7b)"],
            ["#pruefungen", "Identity, creditworthiness, registers (8b–8e)"],
            ["#akquise", "Land acquisition and land register (8f)"],
            ["#energie", "Energy procurement (8g)"],
            ["#finanzierung", "Financing, monitoring, billing (8h–8j)"],
            ["#empfaenger", "Recipients (12)"],
            ["#speicherdauer", "Retention periods (13) and your rights (14)"],
          ].map(([href, text]) => (
            <li key={href}>
              <a href={href} className="flex h-full items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 font-medium !text-ink-800 !no-underline ring-1 ring-ink-200/70 transition-colors hover:!text-ov-800 hover:ring-ov-300">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                {text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <h2>1. Controller</h2>
      <p>The controller responsible for data processing on this website and in our portal is:</p>
      <address className="not-italic">
        <strong>{G.name}</strong>
        <br />
        {G.sitz}, {G.plz} {G.ort}, Austria
        <br />
        Commercial register (Firmenbuch) {G.register}, {G.gericht}
        <br />
        Management: {G.geschaeftsfuehrung.join(", ")}
      </address>
      <p>
        <strong>Data protection contact:</strong>{" "}
        {KONTAKT.email ? <a href={`mailto:${KONTAKT.email}?subject=Data%20protection`}>{KONTAKT.email}</a> : <Platzhalter>e-mail address for data protection requests or data protection officer, if appointed</Platzhalter>}
        . Until then, you can reach us via the <Link href="/kontakt">contact form</Link> (subject “Data protection”) or by post at the address above.
      </p>
      <p>
        Where project companies (e.g. companies that own plants) or other companies of the ÖKOVOLT Group conclude contracts with you – for example as the
        issuer of invoices in contracting or as the lessee of land – they are themselves responsible for processing within the scope of that contract;
        ÖkoInvest GmbH then operates the platform on their behalf. You can see which company is your contractual partner in the contract or on the
        document.
      </p>

      <h2>2. Principles and legal bases</h2>
      <p>
        We process personal data in accordance with the General Data Protection Regulation (GDPR) and the Austrian Data Protection Act (DSG) – only to
        the extent necessary for the respective purpose. The legal bases are in particular:
      </p>
      <ul>
        <li>
          <strong>Art. 6(1)(a) GDPR</strong> – your consent (e.g. Google Analytics, contact by phone or e-mail for marketing purposes); it can be withdrawn
          at any time with effect for the future.
        </li>
        <li>
          <strong>Art. 6(1)(b) GDPR</strong> – contract or pre-contractual measures (enquiries, portal account, project exchange, NDA, energy procurement,
          billing).
        </li>
        <li>
          <strong>Art. 6(1)(c) GDPR</strong> – legal obligations (e.g. retention under company and tax law, due diligence obligations to prevent money
          laundering, where they apply to us).
        </li>
        <li>
          <strong>Art. 6(1)(f) GDPR</strong> – legitimate interests (secure operation of the website, proof of non-disclosure agreements and signatures,
          prevention of misuse, allocation of enquiries, search for suitable land, financing of our own projects).
        </li>
        <li>
          <strong>Art. 9(2)(a) GDPR</strong> – your explicit consent if biometric data (facial comparison) is processed during online identification
          (section 8c).
        </li>
      </ul>
      <p>
        Where we rely on legitimate interests, we have carried out a balancing of interests; you can object to the processing under Art. 21 GDPR
        (section 14). The website is delivered exclusively in encrypted form (TLS).
      </p>

      <h2>3. Hosting</h2>
      <p>
        This website is operated by <Platzhalter>name and registered office of the hosting provider, server location</Platzhalter>. The provider processes
        the data generated when the website is accessed solely on our behalf on the basis of a data processing agreement under Art. 28 GDPR. The legal
        basis is our legitimate interest in secure and stable provision (Art. 6(1)(f) GDPR).
      </p>

      <h2>4. Server log data</h2>
      <p>
        Each time the website is accessed, the server automatically stores technical data: IP address, date and time, address accessed, volume of data
        transferred, status code, referring page, and browser and operating system. The data is used to deliver the pages, analyse errors and fend off
        attacks (Art. 6(1)(f) GDPR). It is not combined with other data and is deleted after a short period (see section 13). This also applies when
        partners embed our <strong>widgets</strong> (e.g. deadline ticker or savings calculator) on their pages: the widget is loaded from our server,
        sets no cookies, loads no scripts and performs no tracking; only the server log data mentioned above is generated.{" "}
        <em>[Draft · pending legal review]</em>
      </p>

      <h2>5. Enquiries via forms (land check, project, investor, residual power, etc.)</h2>
      <p>
        If you send us an enquiry via a form – for example about the land check, agrivoltaics, a project, as an investor, about the residual power pool,
        energy communities or the cooperative – we process your contact details (salutation, name, company if applicable, e-mail, phone if applicable,
        postcode, town, country) and the information on your request (e.g. location and size of a piece of land, project key figures, power consumption).
        The enquiry is stored as a <strong>case</strong> with a reference number in our customer management and ERP system so that we can process it and
        make its status transparent to you.
      </p>
      <p>
        In addition, <strong>without cookies</strong>, we transmit with the enquiry how you came to the website (e.g. campaign parameters, referring domain,
        entry and submission page). This information is only held in your browser&apos;s memory and is sent exclusively together with an enquiry.
      </p>
      <p>
        The legal basis is the performance of pre-contractual measures at your request (Art. 6(1)(b) GDPR) and our legitimate interest in the orderly
        processing and evaluation of contact channels (Art. 6(1)(f) GDPR). If you later register in the portal with the same e-mail address, your case
        is assigned to your account so that you can follow it there.
      </p>
      <p>
        If you send a form from an English page, we store the language of the wording shown to you together with the notice and any consent, so that we
        can prove which version you saw. <em>[Draft · pending legal review]</em>
      </p>

      <h2>5a. Report by e-mail from calculators (double opt-in)</h2>
      <p>
        For some calculators you can request the result as a detailed report. For this we process your first name, surname and e-mail address
        (phone only if you provide it voluntarily), the calculator chosen, your inputs and the country, as well as any voluntary, separately
        ticked consents (e.g. contact by phone). We first send you only a confirmation e-mail; only once you confirm the link in it within
        48 hours (<strong>double opt-in</strong>) is a case created (section 5) and the report available for 30 days via a personal link. If
        you do not confirm, your details expire. As evidence, we log the wording of the notices shown (as a checksum), the time and the
        confirmation; the retrieval link is stored on our side only as a checksum (SHA-256). Legal basis: Art. 6(1)(b) GDPR (report requested
        by you); for the voluntary tick boxes, your consent (Art. 6(1)(a) GDPR), revocable at any time. <em>[Draft · pending legal review]</em>
      </p>

      <h2>5b. Newsletter (double opt-in)</h2>
      <p>
        For the newsletter we process your e-mail address, the country chosen, your topics, the language and the place of sign-up (e.g. the
        newsletter page or a market data page). The subscription only becomes active once you confirm the link in our e-mail within 48 hours
        (<strong>double opt-in</strong>); without confirmation, your details expire. As evidence, we log the wording of the consent (as a
        checksum), the time, the confirmation and any unsubscribe; the management and unsubscribe link is stored on our side only as a
        checksum (SHA-256). Every issue contains an unsubscribe link (one click, also via your e-mail program&apos;s unsubscribe function);
        after you unsubscribe, we remove your personal data from the mailing list. Legal basis: your consent (Art. 6(1)(a) GDPR), revocable
        at any time with effect for the future. <em>[Draft · pending legal review]</em>
      </p>

      <h2 id="konto">6. Portal account and roles</h2>
      <p>
        To use the portal, you create an account. We process your registration data (name, e-mail, company, phone and address if applicable), your role
        (e.g. landowner, farmer, investor, project seller, company, member or municipality), access data (passwords only as a cryptographic hash), sign-in
        times and the content you store in the portal: land, projects, search profiles, messages and documents. For sign-in, we use technically necessary
        session cookies.
      </p>
      <p>
        We assign some roles by invitation only: <strong>experts and planners</strong> (for a specific assignment in project development),{" "}
        <strong>energy suppliers</strong> (for requests for quotation in energy procurement) and <strong>banks</strong> (for a specific financing request).
        For these accounts we also process the invitation (invited e-mail address, time, inviting person) and the assignment to the order, tender or
        financing request. Municipalities only receive the municipal view after their request has been reviewed; there they only see simplified project
        information without owners, plots or lease terms.
      </p>
      <p>
        The processing is necessary to provide the portal (Art. 6(1)(b) GDPR). For security purposes, we log security-relevant events such as sign-ins
        and changes to permissions (Art. 6(1)(f) GDPR). What content other users see depends on your role and your approvals; employees of ÖkoInvest GmbH
        see the data to the extent they need it for review, support and brokerage. Internally, access is restricted by area of responsibility (e.g.
        acquisition, transactions, accounting, operations, compliance, energy, project management).
      </p>
      <p>
        In your profile, you can export your data as a file (JSON) and delete your account at any time. Deletion anonymises your details and blocks the
        account; documents subject to a statutory retention obligation remain blocked until the period expires.
      </p>

      <h2>6a. Sign-in, sessions, devices and two-factor authentication</h2>
      <p>
        To protect your account, we process the following each time you sign in and for each active session: time, IP address, browser and operating
        system (user agent), sign-in method (password, e-mail link, second factor), success or failed attempt, and the last activity (updated at most
        every five minutes). Under <strong>Security</strong> in the portal, you can see your active sessions, known devices and sign-in history and end
        sessions.
      </p>
      <ul>
        <li>
          <strong>Known devices:</strong> we set a cookie with a random device identifier; we only store its hash. If someone signs in from a new device,
          we inform you by notification and e-mail. These security messages cannot be unsubscribed from.
        </li>
        <li>
          <strong>Two-factor authentication (TOTP):</strong> we store the secret for your authenticator app in encrypted form, and recovery codes only as a
          hash. You choose the authenticator app yourself; it receives no data from us other than the QR code displayed once.
        </li>
        <li>
          <strong>Account lock:</strong> after repeated failed attempts, we temporarily block sign-in and inform you.
        </li>
        <li>
          <strong>Password check (optional):</strong> if activated, we check new passwords against the “Have I Been Pwned” service. Only the first five
          characters of a hash value leave our server – neither your password nor your e-mail address.
        </li>
      </ul>
      <p>
        The legal basis is Art. 6(1)(b) GDPR (secure provision of the account) and Art. 6(1)(f) GDPR (prevention of unauthorised access). For retention
        periods, see section 13.
      </p>

      <h2>6b. Organisations and teams</h2>
      <p>
        You can create an organisation and invite colleagues by e-mail. For this we process the invited e-mail address, the team role (owner, admin,
        member, read-only), the time and the inviting person, and acceptance or departure. Members see the organisation&apos;s objects (e.g. land,
        projects, interests, plants) to the extent of their team role; owners and admins see the list of members. The legal basis is Art. 6(1)(b) GDPR
        vis-à-vis the organisation&apos;s account, and Art. 6(1)(f) GDPR (collaboration in the team) vis-à-vis invited persons.
      </p>

      <h2>6c. Notifications and e-mails</h2>
      <p>
        We inform you about events in your cases (e.g. new message, status change, deadlines, search profile matches, appointments, tenders) in the
        portal (bell icon) and – depending on your setting under “Notifications” – by e-mail. E-mails contain no message texts and no confidential project
        data, only a notice and a link to the portal. We always send mandatory e-mails (confirmation of your address, password, sign-in link, security
        notices, confirmation codes for signatures). These e-mails serve the performance of the contract (Art. 6(1)(b) GDPR); we only send marketing
        e-mails with your consent. For sending, we use <Platzhalter>mail provider or own mail server, location</Platzhalter>.
      </p>

      <h2>6d. Customer management, tasks and activity log</h2>
      <p>
        We keep contacts and organisations from enquiries, registrations, events or public sources (e.g. municipalities, authorities, grid operators) in a
        customer management system with activities, follow-ups and responsibilities. Automatic rules help the team prioritise (e.g. “large site”,
        “municipal enquiry”); they do not make decisions about you. We write important actions in the portal – such as status changes, approvals,
        downloads and exports – to an activity log that is protected against subsequent alteration by a hash chain. Legal basis: Art. 6(1)(b) and (f)
        GDPR (processing, verifiability, investigation of misuse).
      </p>

      <h2>6e. Appointment booking</h2>
      <p>
        You can book appointments (e.g. site visit, advice by phone or video, municipal meeting, data room session) in the portal or without an account
        via the “Book an appointment” page. We process name, e-mail, phone if applicable (mandatory for a call-back), company or municipality, postcode
        and town, type of appointment, time, your message and the person responsible. You will receive a confirmation with a calendar file (ICS) and a
        reminder 24 hours beforehand. To reschedule or cancel, we send a <strong>personal one-time link</strong>; the associated page is not released to
        search engines and does not pass a referrer address to third parties. Anyone who knows the link can manage the appointment – please do not forward
        it. For video appointments, we use <Platzhalter>video conferencing service and provider</Platzhalter>. The legal basis is Art. 6(1)(b) GDPR; when
        booking without an account, you confirm that we may process your details for this purpose and send you a confirmation and reminder.
      </p>

      <h2>6f. Support requests</h2>
      <p>
        We store requests in the “Support” area as a ticket with subject, description, attachments, history, responsibility and processing deadlines.
        Employees can add internal notes that you do not see. Faults in your plant can automatically create a ticket. Where used, we manage tickets in the
        “Helpdesk” module of our ERP system (section 12). Legal basis: Art. 6(1)(b) GDPR.
      </p>

      <h2>6g. Documents and storage</h2>
      <p>
        We store documents that you upload or that we provide to you in the ERP system outside the publicly accessible area; the file type is checked on
        upload. For internal collaboration, documents may also be mirrored in the ERP system&apos;s document storage (Frappe Drive); who may see a document
        continues to be determined by the platform. Identity verification documents are excluded from this or stored only in encrypted and separate form.
        The team&apos;s internal knowledge articles are never visible to customers.
      </p>

      <h2 id="boerse">7. Project exchange: exposés, NDA, deal room and data room</h2>
      <p>
        Only anonymised exposé teasers without any personal reference appear on the public <Link href="/projektboerse">project exchange</Link>. Details and
        documents are only accessible after signing in and concluding a non-disclosure agreement (NDA).
      </p>
      <ul>
        <li>
          <strong>NDA log:</strong> when an NDA is concluded, we store the name, company, e-mail, the project concerned, the version of the NDA text, the{" "}
          <strong>time stamp</strong> and the <strong>IP address</strong>. The log serves as proof of who agreed to which confidentiality obligation and when
          (Art. 6(1)(b) and (f) GDPR). We log consent to the commission agreement in the same way (time, IP address, text version).
        </li>
        <li>
          <strong>Data room:</strong> we log which account accessed or downloaded which documents and when. This protects the sellers&apos; confidential
          documents and makes it possible to investigate breaches (Art. 6(1)(f) GDPR).
        </li>
        <li>
          <strong>Marking of documents:</strong> the confidential exposé names the recipient (name, e-mail, time) on every page; downloaded data room files
          carry the recipient and date in the file name. This makes it possible to trace the origin of documents that have been passed on.
        </li>
        <li>
          <strong>Deal room (questions and answers, bidding process):</strong> questions, answers and bids are moderated by the back office. Until contact is
          released, sellers only see investors under a pseudonym (e.g. “Investor A”) and investors only see the seller as “Seller”. We automatically remove
          e-mail addresses, links and phone numbers from free text; only the back office sees the original. Bids (price, conditions, financing, timetable,
          proof of financing if applicable) are sealed: other bidders never see them. The seller only sees the access log for their data room in
          pseudonymised form.
        </li>
        <li>
          <strong>Letter of intent (LOI):</strong> we store information on price, structure, conditions and financing with the interest and pass it on to the
          seller in the course of initiating the transaction (Art. 6(1)(b) GDPR).
        </li>
        <li>
          <strong>Private working tools:</strong> notes, tags and search profiles in your deal pipeline are visible only to you. We use search profiles to
          notify you of suitable projects (match score); this is a recommendation, not a decision about you.
        </li>
        <li>
          <strong>Disclosure in the brokerage process:</strong> if you express interest in a project or conclude an NDA, the seller of the project learns your
          name, company and contact details, insofar as this is necessary to initiate the transaction – in the deal room only once contact has been released.
          Conversely, after the NDA, investors receive the information the seller has released for their project (Art. 6(1)(b) GDPR).
        </li>
        <li>
          <strong>Sellers&apos; documents:</strong> project documents may contain personal data of third parties (e.g. landowners in land register extracts or
          lease agreements). Sellers are responsible for only uploading such data if they are entitled to do so, and for redacting it as far as possible
          (see <Link href="/nutzungsbedingungen">terms of use</Link>).
        </li>
      </ul>

      <h2>7a. Electronic signature</h2>
      <p>
        You can sign certain documents (e.g. NDA, commission agreement, letter of intent for a lease, expert assignment, procurement mandate)
        electronically in the portal. This is a <strong>simple electronic signature</strong>; we do not use an external signature service for it. We
        process the name and e-mail of the signatories, the drawn signature as an image or the typed name, a confirmation code sent by e-mail, the consent
        text, time, <strong>IP address</strong>, <strong>browser (user agent)</strong> and <strong>checksums (SHA-256)</strong> of the document before and
        after each signature, as well as the order, reminders, revocation or rejection with reasons.
      </p>
      <p>
        After the last signature, an audit page with this log information is appended to the document. It is visible to all signatories and to everyone
        who later lawfully receives the document (e.g. contractual partners, notary, financing bank). Its purpose is to prove who signed which unaltered
        document and when. Legal basis: Art. 6(1)(b) GDPR (conclusion of contract) and Art. 6(1)(f) GDPR (preservation of evidence).
      </p>

      <h2>7b. Closing, land register and easements</h2>
      <p>
        For the completion of a project purchase, we run a closing room with purchase price, payment milestones, conditions, responsible persons, evidence
        and notary appointment. A prerequisite is completed identity verification of both sides (section 8b). Buyer and seller only see each other by name
        once contact has been released. Recipients are – where necessary for completion – the other contracting party, the appointed notary or certifying
        officer, a trustee and financing banks.
      </p>
      <p>
        To secure plants in rem (easement, servitude, building right), we keep a land register file for each plot or roof with owners and co-owners, plot
        designation, encumbrances (including mortgage lenders whose subordination is required), status of contract and certification, file number or
        journal number and land register extract. Recipients are notaries, land register courts and offices, affected mortgage lenders and the financing
        bank. Owners see their own file in the portal. Legal basis: Art. 6(1)(b) GDPR (land-use agreement) and Art. 6(1)(c) GDPR (formal requirements of
        land register law).
      </p>

      <h2>8. Calculators and tools</h2>
      <p>
        Our <Link href={seitenPfad("/rechner")}>calculators</Link> (e.g. lease, agrivoltaics, solar park, project valuation and residual power calculators)
        calculate <strong>locally in your browser</strong>. Your entries are not transmitted to us and are not stored. Only if you expressly send us a
        result with an enquiry do we process it as described in section 5.
      </p>
      <p>
        In the portal, you can save valuations and financing scenarios (valuation tool, financing cockpit). These scenarios are assigned to your account
        and are not visible to other users (Art. 6(1)(b) GDPR).
      </p>

      <h2>8a. AI assistant in the portal (optional)</h2>
      <p>
        In the portal you can optionally use an assistant: draft exposés, summaries of enquiries, questions about released project documents,
        explanations of your land and drafts of messages. If AI mode is activated, we only transmit the information required for the respective task and
        released for you to the Claude service of Anthropic PBC (USA) or its contractual partners as processors – project data, information about your
        land, the message history for the case in question and your question. <strong>E-mail addresses, phone numbers and IP addresses are not
        transmitted.</strong> The legal basis is Art. 6(1)(b) GDPR (use of the portal) or Art. 6(1)(f) GDPR (efficient processing). For the transfer to the
        USA, <mark>[EU-US Data Privacy Framework or standard contractual clauses – to be determined by legal]</mark> applies. The results are drafts that a
        human reviews; there is no automated decision within the meaning of Art. 22 GDPR.
      </p>
      <p>
        <strong>Log:</strong> we store which account used which assistance function on which object and when, as well as technical consumption values –{" "}
        <strong>no questions, entries or answers</strong>. Purpose: protection against misuse, daily quota and cost control. Retention period:{" "}
        <mark>[12 months – to be determined]</mark>. Without AI mode, the assistant works on a rule basis; your details do not leave the platform.
      </p>

      <h2 id="pruefungen">8b. Identity and company verification (KYC/KYB)</h2>
      <p>
        Before you use the data room, submit letters of intent or bids, publish projects, receive lease payments or conclude contracting agreements, we
        verify your identity or that of your company, the beneficial owners, any status as a politically exposed person and screen against EU sanctions
        lists. We process name, date and place of birth, nationality, address, ID document data and copy, register extracts, information on beneficial
        owners and representatives, source of funds, bank details and proof of ownership.
      </p>
      <p>
        The <strong>legal basis</strong> is Art. 6(1)(c) GDPR in conjunction with the German Anti-Money Laundering Act (Geldwäschegesetz) or the
        corresponding provisions in Austria and Switzerland, where we are obliged to do so; otherwise Art. 6(1)(b) GDPR (initiation and performance of
        contracts, e.g. payouts) and Art. 6(1)(f) GDPR (legitimate interest in preventing fraud and money laundering on the platform).{" "}
        <strong>Retention period:</strong> five years from the end of the calendar year in which the business relationship ends, then erasure.{" "}
        <strong>Recipients:</strong> exclusively the compliance staff of ÖkoInvest GmbH, our technical service provider (processing on our behalf), in the
        case of online identification the commissioned, licensed identification provider and, where required by law, authorities. Documents are stored in{" "}
        <strong>encrypted</strong> form and every access is logged. Please redact information that is not required on copies of ID documents (notice in the
        portal). Without this information, we cannot release the steps mentioned. There is no automated decision within the meaning of Art. 22 GDPR; the
        sanctions screening only provides indications, and decisions are made by people.
      </p>
      <p>
        <strong>Check of the machine-readable zone (MRZ):</strong> in the “ID document” step, you type in the lines with the “&lt;” characters from your ID
        card or passport (required for the “ID document and video call” route, otherwise voluntary). No image recognition takes place. We check the check
        digits, validity, age of majority and consistency with your details; the result is an indication for our compliance team and may feed into the
        risk classification. We store the typed lines in encrypted form with the KYC case; legal basis, recipients and retention period as above.
      </p>
      <p>
        <strong>Video call with our compliance team:</strong> if you choose this route, you book an appointment; the call is conducted by a member of our
        compliance team using the video conferencing tool <Platzhalter>tool, provider and storage location still to be determined</Platzhalter>. We record
        neither image nor sound. We log the verification steps (e.g. comparison with the photo, security features of the document, reading out the document
        number) with time and result, the person conducting the check and the confirmation of a one-time code that we send to you by e-mail during the call
        (we only store whether the code was confirmed). At the start, we inform you about the logging and ask for your agreement; without it, we end the
        call and the other routes remain open to you. Legal basis, recipients and retention period as above.
      </p>

      <h2>8c. Online identification via external providers</h2>
      <p>
        Instead of an ID copy and manual verification, you can – where offered – identify yourself online via a specialised identification provider:{" "}
        <Platzhalter>provider not yet determined, e.g. Veriff (Estonia), Sumsub or IDnow (Germany); name, registered office, storage location</Platzhalter>.
        You are redirected to the provider&apos;s website for this. The provider captures images of your ID document and, depending on the procedure, a photo
        or video of your face, checks the authenticity of the document and compares the face with the ID photo. It reports the result to us (passed,
        rejected, to be reviewed) together with the ID data read out; the report is transmitted with a signature and assigned to the KYC case.
      </p>
      <p>
        The facial comparison processes <strong>biometric data</strong> (Art. 9 GDPR). It only takes place with your <strong>explicit consent</strong>{" "}
        (Art. 9(2)(a) GDPR), which you give before starting and can withdraw at any time; without consent, verification with an ID copy remains open to you.
        Whether the provider acts as our processor (Art. 28 GDPR) or is itself responsible for parts of the processing – such as its own fraud prevention or
        legal obligations – depends on the contract with the provider; <Platzhalter>allocation of roles and link to the provider&apos;s privacy notice</Platzhalter>.
        We will inform you about this before the verification begins.
      </p>
      <p>
        Independently of this, you can enter the machine-readable zone of your ID document for an <strong>automatic preliminary check</strong>. The check
        digits are first checked in your browser; only when you click do we send the line to our server, which repeats the check and compares it with your
        details. Only the result is stored.
      </p>

      <h2>8d. Credit reports</h2>
      <p>
        Before you submit a letter of intent or a binding bid or conclude a contract with a financial default risk (e.g. purchase of a project,
        contracting), the back office may obtain a credit report on your company. For this purpose, we transmit the company name, address, commercial
        register number and – in the case of sole traders, partnerships or where the individual is relevant – name, address and date of birth. The credit
        agency sends us a credit score or rating, payment experience and register details. Credit agencies:{" "}
        <Platzhalter>not yet determined, e.g. KSV1870 (Austria), Creditreform (Germany), CRIF (Austria/Germany/Switzerland)</Platzhalter>. The credit agency
        is itself responsible for its own data processing and provides information about it in its privacy notice.
      </p>
      <p>
        The <strong>legal basis</strong> is our legitimate interest in protecting ourselves and the contractual partners on the platform against payment
        defaults (Art. 6(1)(f) GDPR) or the initiation of a contract (Art. 6(1)(b) GDPR). We only obtain reports in the case of a specific contract
        initiation involving economic risk, document the reason and <strong>inform you before the query</strong> (Art. 14 GDPR) – without anticipating the
        result. A person decides on the release with a written justification; there is no rejection based solely on a score (no automated decision within
        the meaning of Art. 22 GDPR). You can state your point of view and request a new review.
      </p>

      <h2>8e. Register queries and formation of project companies</h2>
      <p>
        To verify companies, we retrieve information from public registers – the commercial register (Firmenbuch, Austria), the commercial register and
        company register (Handelsregister, Unternehmensregister, Germany), Zefix or the UID register (Switzerland) and, where we are entitled to do so,
        registers of beneficial owners (WiEReG register, transparency register). We retrieve the company name, registered office, legal form, register
        number, persons authorised to represent the company, shareholders and, where applicable, beneficial owners. The query is recorded with its date in
        the KYC case. The source of this data is the public registers mentioned (Art. 14(2)(f) GDPR); the legal basis is Art. 6(1)(c) or (f) GDPR. Queries
        of the Austrian commercial register may be made via a clearing agency: <Platzhalter>clearing agency</Platzhalter>.
      </p>
      <p>
        For the formation of our own project companies, we process the data of the future shareholders, managing directors and beneficial owners and
        transmit it – where required by law – to the notary, the commercial register, the tax office, the register of beneficial owners and the account-holding
        bank (Art. 6(1)(b) and (c) GDPR).
      </p>

      <h2 id="akquise">8f. Land acquisition: geodata, land register and initial contact by post</h2>
      <p>
        To find suitable land for ground-mounted photovoltaic and agrivoltaic plants, we evaluate <strong>public geodata</strong> – the official cadastre
        (without owner information), agricultural fields, terrain, protected areas, distances to settlements and the distance to substations from open data.
        This evaluation contains <strong>no information about persons</strong>; it assesses plots according to technical and planning criteria.
      </p>
      <p>
        If a piece of land appears suitable, we identify the owners by means of a <strong>land register query</strong>. We only query by plot (cadastral
        municipality or district and plot number), never by person, and only via the official access route or a licensed clearing agency (
        <Platzhalter>clearing agency or access route per country</Platzhalter>). In Germany and Switzerland, inspection only takes place insofar as the
        regulations there permit it. Every query is logged with purpose, person and plot. We process the name, address and ownership share of the owners
        and the plot details.
      </p>
      <p>
        The <strong>purpose</strong> is a single contact by post offering to lease the land for a solar plant or use it in another way. The{" "}
        <strong>legal basis</strong> is our legitimate interest in finding sites for renewable energy and in approaching potential contractual partners
        directly (Art. 6(1)(f) GDPR); we keep this approach to the minimum necessary. The letter contains the information required under{" "}
        <strong>Art. 14 GDPR</strong> – controller, purpose, legal basis, <strong>source of the data (land register)</strong>, retention period and your
        rights – as well as a clear reference to your right to object. Plot details are not visible from the outside.
      </p>
      <ul>
        <li>We write to you <strong>once by letter</strong>; if you do not respond, no further mailings will follow.</li>
        <li>
          You will only receive calls, e-mails or text messages from us <strong>with your prior consent</strong>.
        </li>
        <li>
          <strong>Objection:</strong> you can object at any time without giving reasons (Art. 21(2) GDPR) – informally by letter or via the{" "}
          <Link href="/kontakt">contact form</Link>. We will then immediately add you to our <strong>blocking list</strong> and will no longer use your data
          to contact you. On the blocking list we only keep your name, address, reference to the plot and the date so that you are not contacted again.
        </li>
        <li>
          If you do not respond, we delete the owner data 12 months after the letter. If you show interest, we continue to process your data as an enquiry
          (section 5).
        </li>
      </ul>
      <p>
        We approach municipalities, authorities and grid operators as organisations; in doing so, we process the business contact details of the
        responsible persons from public sources or from previous contact (Art. 6(1)(f) GDPR).
      </p>

      <h2 id="energie">8g. Energy procurement and supplier tenders</h2>
      <p>
        If you instruct us to purchase your electricity, we process the master data of your supply points (address, market and metering location or
        metering point number, grid operator, voltage level, metering type), your consumption and <strong>load profile</strong> (15-minute values),
        information on your own PV and storage, your current supply contracts (supplier, prices, term, notice period) as well as offers, comparisons,
        approvals and awards. Load profiles of corporations are generally not personal data; in the case of sole traders or partnerships they may be. In
        any case, we treat them as trade secrets.
      </p>
      <ul>
        <li>
          <strong>Procurement mandate:</strong> we store your consent with the text version, time, IP address and browser, and on request additionally with
          an electronic signature (section 7a). You can revoke the mandate in the portal.
        </li>
        <li>
          <strong>Anonymised disclosure to energy suppliers:</strong> in the request for quotation, the invited suppliers only receive a lot identifier,
          rounded key figures (annual volume, peak load), a standardised weekly profile, monthly shares, country, voltage level and metering type –{" "}
          <strong>no name, no address, no location IDs and no time series</strong>. If several customers are bundled (pool), this applies to all parties
          involved.
        </li>
        <li>
          <strong>After the award:</strong> only after your express approval in the portal do we transmit the company name, address, contact person and
          location IDs to the selected supplier so that it can conclude the supply contract and carry out the change of supplier; in the process, your
          previous supplier learns of the termination.
        </li>
        <li>
          <strong>Ongoing switching analysis:</strong> we compare your contract with market prices and remind you of notice periods. The recommendation is a
          suggestion; the decision is yours.
        </li>
        <li>
          <strong>Energy suppliers as users:</strong> for invited suppliers, we process company name, contact person, offers, participation history, company
          verification and an internal assessment of the cooperation (Art. 6(1)(b) and (f) GDPR).
        </li>
      </ul>
      <p>
        The legal basis is Art. 6(1)(b) GDPR (procurement mandate); for suppliers Art. 6(1)(b) or (f) GDPR. We obtain market price data on the server side
        (section 9) or from licensed sources; it contains no information about you.
      </p>

      <h2 id="finanzierung">8h. Financing of our own projects and bank portal</h2>
      <p>
        We finance some of the projects that we or our project companies operate ourselves through banks. For this purpose, we put together a{" "}
        <strong>bank package</strong> (e.g. project profile, financial model, yield assessment, contracts, permits) and transmit it to the{" "}
        <strong>banks we approach</strong>. The banks receive a personal, time-limited invitation link and, in the bank portal, only see the requests
        addressed to their institution and only the components we have released; every access is logged.
      </p>
      <p>
        The bank package may contain personal data of third parties, in particular of <strong>landowners and roof owners</strong> (lease or land-use
        agreement, easement, land register extract) and contractual partners (e.g. power offtakers in contracting). We only pass on what the bank needs for
        its credit decision and collateral, and redact any further information. The legal basis is our legitimate interest in financing the plant
        (Art. 6(1)(f) GDPR) or the performance of the land-use agreement, which provides for collateral (Art. 6(1)(b) GDPR). The banks are themselves
        responsible for their own processing.
      </p>
      <p>
        For bank users, we process name, business contact details, queries, term sheets and rejections (Art. 6(1)(b) and (f) GDPR). During the term of the
        loan, we report key figures (e.g. debt service coverage) from the plant&apos;s yield data to the bank – aggregated, without consumption data of
        individual power offtakers.
      </p>

      <h2>8i. Plant monitoring in contracting</h2>
      <p>
        If we operate a plant at your premises (contracting), on-site data loggers continuously record technical measurements: generation and output, meter
        readings for grid consumption and feed-in, on-site consumption, state of charge and output of a storage system, status and error messages.
        Consumption values may allow conclusions to be drawn about operating times and are personal data in the case of sole traders. Purposes: operation
        and maintenance, fault detection and reporting, your “My solar power” overview and – exclusively from calibrated meters – billing. The measurements
        are transmitted in encrypted form and stored in a separate time-series database (<Platzhalter>operator and location of the measurement data
        server</Platzhalter>). Access is available to you or the members of your organisation and our operations team. Legal basis: Art. 6(1)(b) GDPR
        (contracting agreement).
      </p>

      <h2>8j. Finance, billing and payouts</h2>
      <p>
        For lease payments (credit notes), contracting invoices and commission invoices, we process name or company name, address, VAT ID, contract data,
        billing periods, quantities, amounts, payment status and dunning notices as well as your <strong>bank details (IBAN, BIC, account holder)</strong>.
        We take the bank details for payouts exclusively from the verified identity check (section 8b). We create payouts as a SEPA file, which our bank
        executes; for this purpose, the bank receives the recipient, IBAN, amount and payment reference. We only store a checksum of the file itself.
      </p>
      <p>
        The legal basis is Art. 6(1)(b) GDPR (contract) and Art. 6(1)(c) GDPR (accounting and retention obligations). Accounting data is – where used – kept
        in the finance module of our ERP system. Recipients are our bank, tax advisers and auditors, and tax authorities. Retention: in Austria 7 years
        (§ 132 BAO, § 212 UGB), up to 22 years where land is concerned; for German companies up to 10 years (§ 147 AO, § 257 HGB); for Swiss companies 10
        years (Art. 958f OR).
      </p>

      <h2>8k. Project development, experts and planners</h2>
      <p>
        For the development of projects through to ready-to-build, we keep project files with land, milestones, risks, costs, decisions and parties
        involved. In them, we process data of landowners, business contact details of authorities, municipalities, grid operators and other parties, as
        well as of <strong>experts and planners</strong>. We invite experts by e-mail to a specific assignment; they only see the tasks and documents assigned
        to them, and we store their contact details, proof of qualifications, uploads and queries. Landowners see a simplified view of their project;
        investors in a co-development only see expressly released information. Legal basis: Art. 6(1)(b) and (f) GDPR. Our employees receive separate
        information on the processing of employee data (e.g. time recording, deputies).
      </p>

      <h2>9. Live power market data</h2>
      <p>
        We obtain exchange power prices and generation data (e.g. on the <Link href={seitenPfad("/energie-live")}>Energy live</Link> page){" "}
        <strong>on the server side</strong> from the Energy-Charts platform of the Fraunhofer Institute for Solar Energy Systems ISE. Your browser does not
        establish a connection to Energy-Charts for this; no personal data of yours is transmitted to Fraunhofer ISE.
      </p>

      <h2>9a. Maps in the land passport (official map services)</h2>
      <p>
        In the “land passport” tool you can draw your land on a map. We load the map tiles directly from official providers: for Germany from
        the Federal Agency for Cartography and Geodesy (BKG, TopPlusOpen), for Austria from basemap.at and for Switzerland from swisstopo. The
        map only loads <strong>once you click “Load map”</strong>; your IP address is then transmitted to the respective provider
        (Art. 6(1)(a) GDPR – consent through your click, valid only for that page view, no cookie is set). Without the map, you can enter the
        size directly. The drawn land stays in your browser until you request a report (section 5a). <em>[Draft · pending legal review]</em>
      </p>

      <h2>10. Cookies and consent management</h2>
      <p>
        We use technically necessary cookies without consent (§ 165(3) of the Austrian Telecommunications Act 2021 (TKG 2021); Art. 6(1)(f) GDPR) – for
        example for signing in to the portal and to store your selection in the cookie banner (cookie “cookieConsent”, lifetime 12 months). All other
        services are only loaded after your consent (Art. 6(1)(a) GDPR). There is no “Functional” category in the cookie banner: the official maps in
        the land passport only load after a separate click on the respective page (section 9a) and do not set a cookie.
      </p>
      <p>In the portal, we use the following technically necessary cookies:</p>
      <ul>
        <li>
          <strong>“oi_sitzung”</strong> – your sign-in (signed session identifier, up to 7 days or until you sign out),
        </li>
        <li>
          <strong>“oi_2fa”</strong> – intermediate step of two-factor authentication (5 minutes),
        </li>
        <li>
          <strong>“oi_geraet”</strong> – random device identifier to recognise new devices and for “remember this device” (at most 400 days).
        </li>
      </ul>
      <p>
        In live operation, these names carry the prefix “__Host-”. In addition, the portal stores convenience settings such as saved list views or
        “recently used” only in your browser&apos;s storage; they are not transmitted to us.
      </p>
      <p>
        You can change or withdraw your selection at any time via <strong>“Privacy settings”</strong> in the footer of every page.
      </p>
      <h3>Country choice</h3>
      <p>
        On request, the website shows the content for Germany, Austria or Switzerland (law, figures, contact persons). You choose the country yourself – in
        the header or via the address (e.g. “/at”). There is no evaluation of your IP address or language setting and no automatic redirection based on
        origin.
      </p>
      <p>
        Only when you <strong>actively choose a country</strong> (click in the country switcher) do we store your choice in the cookie{" "}
        <strong>“land”</strong> (content: DE, AT or CH; lifetime 12 months). The home page then opens your country&apos;s pages directly on your next visit
        until you change your choice. Legal basis: § 165(3) TKG 2021 or § 25(2) no. 2 of the German Telecommunications Digital Services Data Protection Act
        (TDDDG) (a function you have expressly requested) and Art. 6(1)(f) GDPR. You can delete the cookie in your browser at any time.{" "}
        <em>[Draft · pending legal review]</em>
      </p>
      <h3>Language choice</h3>
      <p>
        You can switch the website between German and English (DE · EN in the header). Only when you <strong>actively choose a language</strong> do we store
        your choice in the cookie <strong>“sprache”</strong> (content: de or en; lifetime 12 months), so that the home page opens in your language on your
        next visit. There is no evaluation of your browser&apos;s language setting. Legal basis as for the country choice. You can delete the cookie in your
        browser at any time. <em>[Draft · pending legal review]</em>
      </p>

      <h2>11. Google Analytics 4 (only with consent)</h2>
      <p>
        Only if you consent to the “Statistics” category do we use Google Analytics 4 from Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
        Ireland. The script is not loaded before your consent. Google Analytics records which pages are accessed, time spent, origin (e.g. search engine or
        campaign), device, browser and approximate location (country/region) as well as events such as submitted forms. Google Signals and advertising
        features are deactivated; according to Google, IP addresses are not stored in Google Analytics 4. The cookies “_ga” and “_ga_*” are set with a
        lifetime of up to 2 years.
      </p>
      <p>
        A transfer to the USA is possible. Google LLC is certified under the EU-US Data Privacy Framework; the transfer is based on the European
        Commission&apos;s adequacy decision (Art. 45 GDPR). If you withdraw your consent, we stop the measurement immediately and delete the Analytics cookies
        in your browser. Further information:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google privacy policy<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>

      <h2 id="empfaenger">12. Recipients and processors</h2>
      <p>
        Personal data is only received by bodies that need it for the respective purpose. We only use service providers who act on our behalf on the basis
        of a contract under Art. 28 GDPR. Where a provider has not yet been determined, this is marked below; we will add the details before use.
      </p>
      <p>
        <strong>Processors (acting on our behalf):</strong>
      </p>
      <ul>
        <li>
          <strong>ERP and portal system:</strong> we manage enquiries, cases, portal accounts, messages and documents in an ERP system based on the open-source
          framework Frappe (where applicable with the modules for finance, HR, document storage and helpdesk). Operation and hosting:{" "}
          <Platzhalter>operator and server location of the ERP system</Platzhalter>. Where service providers or companies of the ÖKOVOLT Group operate or
          maintain the system for us, this is done as processing on our behalf on the basis of a contract under Art. 28 GDPR.
        </li>
        <li>
          <strong>Hosting and IT service providers</strong> for the website (see section 3), also as processors.
        </li>
        <li>
          <strong>E-mail sending:</strong> <Platzhalter>mail provider or own mail server, location</Platzhalter>.
        </li>
        <li>
          <strong>Backups:</strong> encrypted backup copies at <Platzhalter>provider and location of the backup storage</Platzhalter>.
        </li>
        <li>
          <strong>Geodata service</strong> (no personal reference) and <strong>measurement data service</strong> for plants:{" "}
          <Platzhalter>operator and location of the servers</Platzhalter>.
        </li>
        <li>
          <strong>AI assistant:</strong> Anthropic PBC (USA), only when AI mode is activated (section 8a).
        </li>
        <li>
          <strong>Online identification:</strong> <Platzhalter>identity provider</Platzhalter> – as a processor or itself responsible for parts of the
          processing (section 8c).
        </li>
        <li>
          <strong>Video conferencing</strong> for advisory appointments: <Platzhalter>video conferencing service</Platzhalter>.
        </li>
      </ul>
      <p>
        <strong>Independent controllers and other recipients:</strong>
      </p>
      <ul>
        <li>
          <strong>Companies of the ÖKOVOLT Group and project companies</strong>, insofar as they are involved in handling your request or are your
          contractual partner (e.g. planning, construction, operation, ownership of a plant) – on the basis of Art. 6(1)(b) or (f) GDPR.
        </li>
        <li>
          <strong>Project sellers and investors</strong> within the project exchange and the deal room, as described in section 7.
        </li>
        <li>
          <strong>Energy suppliers</strong> only in anonymised form in the request for quotation, and with your contract data after the award and your
          approval (section 8g).
        </li>
        <li>
          <strong>Banks</strong> we approach to finance our own projects, and our account-holding bank for payments (sections 8h and 8j).
        </li>
        <li>
          <strong>Experts and planners</strong> within the scope of their assignment (section 8k).
        </li>
        <li>
          <strong>Credit agencies</strong> (section 8d) and <strong>register offices</strong> or clearing agencies for land register and commercial register
          queries (sections 8e and 8f).
        </li>
        <li>
          <strong>Notaries, certifying officers, trustees, land register courts and offices</strong> for the conclusion of contracts and for easements
          (section 7b).
        </li>
        <li>
          <strong>Grid operators, metering point operators and funding bodies</strong>, insofar as necessary for grid connection, metering, change of
          supplier or subsidies.
        </li>
        <li>
          <strong>Google Ireland Limited</strong> for Google Analytics – only with consent (section 11).
        </li>
        <li>
          <strong>Tax advisers, auditors, legal advisers and authorities</strong>, insofar as required by law or necessary to enforce claims.
        </li>
      </ul>
      <p>
        Data is only transferred to countries outside the EEA as described in this policy (Google Analytics, AI assistant and, where applicable, an identity
        provider with its registered office or subcontractors outside the EEA). Switzerland is covered by an adequacy decision of the European Commission;
        data on Swiss projects and contractual partners may therefore be transferred to parties involved in Switzerland.
      </p>

      <h2 id="speicherdauer">13. Retention periods</h2>
      <p>
        We only store personal data for as long as is necessary for the respective purpose or as statutory retention obligations require. Guide values:
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-ink-200/80">
        <table className="w-full border-collapse text-left text-[15px] max-sm:block">
          <caption className="sr-only">Retention periods by data category</caption>
          <thead className="bg-sand-50 max-sm:sr-only">
            <tr className="border-b border-ink-200">
              <th scope="col" className="w-[42%] px-5 py-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-600">Data</th>
              <th scope="col" className="px-5 py-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-600">Retention period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 max-sm:block">
            {FRISTEN_EN.map(([daten, dauer]) => (
              <tr key={daten} className="transition-colors hover:bg-sand-50/70 max-sm:block max-sm:px-4 max-sm:py-3.5">
                <th scope="row" className="px-5 py-3.5 align-top font-semibold leading-snug text-ink-900 max-sm:block max-sm:p-0">{daten}</th>
                <td className="px-5 py-3.5 align-top leading-relaxed text-ink-700 max-sm:mt-1 max-sm:block max-sm:p-0">
                  {dauer.startsWith("[Platzhalter: ") ? <Platzhalter>{dauer.slice(14, -1)}</Platzhalter> : dauer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>14. Your rights</h2>
      <p>You have the right at any time to:</p>
      <ul>
        <li>access the data stored about you (Art. 15 GDPR),</li>
        <li>rectification of inaccurate data (Art. 16 GDPR),</li>
        <li>erasure (Art. 17 GDPR) and restriction of processing (Art. 18 GDPR),</li>
        <li>data portability (Art. 20 GDPR),</li>
        <li>
          <strong>object</strong> to processing based on legitimate interests on grounds relating to your particular situation (Art. 21(1) GDPR),
        </li>
        <li>
          <strong>object to direct marketing</strong> – for example to our letter for land acquisition – at any time and without giving reasons (Art. 21(2)
          and (3) GDPR),
        </li>
        <li>withdraw consent given with effect for the future (Art. 7(3) GDPR).</li>
      </ul>
      <p>
        To do so, please contact the data protection contact named above. We may request reasonable proof to confirm your identity. Registered users can
        export their data and delete their account themselves in their profile.
      </p>

      <h2>15. Right to lodge a complaint</h2>
      <p>
        If you believe that the processing of your data infringes data protection law, you can lodge a complaint with a supervisory authority. The authority
        responsible for us is the:
      </p>
      <address className="not-italic">
        <strong>Austrian Data Protection Authority (Österreichische Datenschutzbehörde)</strong>
        <br />
        Barichgasse 40–42, 1030 Vienna, Austria
        <br />
        E-mail: <a href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a>
        <br />
        Website:{" "}
        <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer">
          www.dsb.gv.at<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </address>
      <p>
        You can also contact the supervisory authority at your place of habitual residence or place of work, in Germany for example the data protection
        authority of your federal state. For persons in Switzerland, the Federal Data Protection and Information Commissioner (FDPIC/EDÖB) is also a point
        of contact.
      </p>

      <h2>16. Obligation to provide data, no automated decisions</h2>
      <p>
        The website can be used without providing personal data. For enquiries, the portal and the project exchange, we need the information marked as
        required fields; without it, we cannot process the request. Automated decisions including profiling within the meaning of Art. 22 GDPR do not take
        place. Projects and accounts are reviewed and released by employees.
      </p>
      <p>
        This also applies to tools that calculate values: match scores between search profile and project, assessments of land from geodata, priorities in
        customer management, hits in sanctions screening, credit scores and recommendations from the switching analysis are indications for people.
        Decisions with legal or similarly significant effects for you – for example about a release, an award or a rejection – are always made by an
        employee.
      </p>

      <h2>17. Changes</h2>
      <p>
        We adapt this policy when our offers or the legal situation change. The version published here applies. As of: {standEn}.
      </p>
    </>
  );
}
