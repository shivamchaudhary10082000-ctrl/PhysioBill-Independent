import type { ReactNode } from 'react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicFooter } from '@/Components/PublicFooter';

const updated = '14 September 2026';
const publicContactEmail = (import.meta.env.VITE_PUBLIC_CONTACT_EMAIL as string | undefined)?.trim() || null;
const publicOperatorName = (import.meta.env.VITE_PUBLIC_OPERATOR_NAME as string | undefined)?.trim() || null;

function LegalLayout({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-4 sm:px-6">
          <a href="/" aria-label="PhysioBill home"><PhysioBillBrand /></a>
          <a href="/" className="text-sm font-semibold text-primary">Back to PhysioBill</a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="prose prose-slate mt-8 max-w-none space-y-8 text-sm leading-7 text-foreground/90">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-[-.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

export function PrivacyNoticePage() {
  return (
    <LegalLayout title="Privacy notice" eyebrow="Privacy">
      <Section title="What PhysioBill is">
        <p>PhysioBill is a physiotherapy discovery, scheduling and professional-workspace service. The staging environment is used for controlled verification and is not the final production service.</p>
        {publicOperatorName && <p>Service operator: <strong className="text-foreground">{publicOperatorName}</strong>.</p>}
      </Section>
      <Section title="Information we process">
        <p>Depending on the feature used, PhysioBill may process professional account and credential information, patient identity and contact information, appointment information, therapist-owned clinical records, invoices, payment-destination details and security/session data.</p>
        <p>Public therapist discovery is deliberately limited to patient-safe professional information such as display name, verified credential facts, enabled service modes and broad service areas. Private patient, clinical and financial records are not public-profile content.</p>
      </Section>
      <Section title="Why information is used">
        <p>Information is used only for the feature the person is using: account authentication, professional verification, therapist discovery, appointment scheduling, clinical-care access after an explicit linkage, billing/financial visibility, communications preferences, security and service operation.</p>
        <p>Booking by itself does not create clinical-record access. A patient identity is not treated as a therapist-owned clinical chart.</p>
      </Section>
      <Section title="Hosting and service providers">
        <p>The current application uses Cloudflare for web delivery and Supabase for authentication and database services. A provider may process technical data needed to deliver its service. PhysioBill does not represent a third-party payment, SMS, WhatsApp or telehealth provider as active unless that provider has actually been configured and verified.</p>
      </Section>
      <Section title="Advertising and tracking">
        <p>The current release does not include a Meta Pixel or Meta Conversions API integration. Patient diagnoses, clinical records, appointment details and other health-related information must not be sent to advertising platforms merely for ad targeting or conversion measurement.</p>
      </Section>
      <Section title="Security and access">
        <p>Patient, physiotherapist and reviewer/Admin capabilities are separated. Sensitive database foundations use database-enforced ownership/persona checks, and protected application routes are configured not to be stored in shared browser caches.</p>
        <p>No online service can promise absolute security. Users should protect their account credentials, sign out on shared devices and report suspected unauthorized access promptly.</p>
      </Section>
      <Section title="Retention, deletion and account records">
        <p>PhysioBill should retain personal data only for as long as it is needed for the relevant service, security, professional recordkeeping or other lawful purpose. Deleting an account does not automatically mean that a professional may erase a clinical or billing record that must lawfully be retained.</p>
        <p>Public discovery information should stop being publicly available when a professional disables discovery, loses verification, or the listing is removed. Security and audit records may be retained for a limited period where needed to investigate misuse or demonstrate authorization history.</p>
      </Section>
      <Section title="Choices and requests">
        <p>Users may raise requests concerning access, correction, account information, consent choices, deletion where applicable, and privacy grievances. Some professional clinical or financial records may remain subject to lawful retention duties even when an account is closed.</p>
        {publicContactEmail ? (
          <p>Privacy and grievance contact: <a className="font-semibold text-primary hover:underline" href={`mailto:${publicContactEmail}`}>{publicContactEmail}</a>.</p>
        ) : (
          <p>A production contact/grievance channel must be configured before PhysioBill is activated as a public production service. The staging environment intentionally does not invent a contact address.</p>
        )}
        <p>Where consent is used for an optional communication or feature, withdrawing that consent should not be represented as withdrawing consent for unrelated necessary account or recordkeeping functions.</p>
      </Section>
      <Section title="Children and dependent patients">
        <p>Patient self-service is intended for adults. Where a parent or lawful guardian acts for a minor or dependent person, the professional must follow applicable consent and recordkeeping requirements and use only information necessary for care.</p>
      </Section>
      <Section title="Changes">
        <p>This notice may be updated as production providers, legal requirements or application features change. Material changes should be reflected by a new notice version before affected data processing begins.</p>
      </Section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of use" eyebrow="Terms">
      <Section title="Purpose of the service">
        <p>PhysioBill provides software for physiotherapist discovery, scheduling and professional record/workspace functions. It is not an emergency service, hospital, insurer, medical device or guarantee of any clinical outcome.</p>
      </Section>
      <Section title="Professional accounts">
        <p>A professional must provide truthful, current information and use only qualifications, registration details, professional titles and service claims they are lawfully entitled to use. A public listing is subject to PhysioBill verification and a separate publish choice.</p>
        <p>Professionals remain responsible for their own clinical decisions, informed consent, documentation, scope of practice, applicable registration and compliance with the professional regulator that governs their practice.</p>
      </Section>
      <Section title="Patient accounts">
        <p>Patients must use their own verified identity or act with lawful authority for another person. A patient account must not be used to obtain another person's private records. Appointment booking does not itself authorize access to clinical or financial records.</p>
      </Section>
      <Section title="Acceptable use">
        <p>Users must not submit false credentials, impersonate another person, attempt unauthorized access, upload unlawful content, manipulate reviews or availability, publish patient-identifying material without lawful authority, or use the service to make deceptive health or advertising claims.</p>
      </Section>
      <Section title="No guaranteed result">
        <p>PhysioBill does not promise cure, pain relief, recovery time, availability, suitability of a professional, insurance reimbursement, payment settlement or telehealth-provider performance. Clinical results vary by person and circumstances.</p>
      </Section>
      <Section title="Payments and external providers">
        <p>A stored manual UPI or bank destination identifies a professional-owned payment destination only. It does not prove a payment was made, settled or verified by a payment provider. External SMS, WhatsApp, telehealth and payment-provider features are active only when the application explicitly states that the corresponding provider has been configured.</p>
      </Section>
      <Section title="Records and privacy">
        <p>Use of PhysioBill is also subject to the Privacy Notice. Professionals should collect only information needed for care or lawful administration and should not place patient information in public profiles or advertisements.</p>
      </Section>
      <Section title="Suspension">
        <p>Access or public visibility may be restricted where credentials cannot be verified, information is misleading, security is threatened, a regulator or lawful authority requires action, or these terms are materially breached.</p>
      </Section>
      <Section title="Production contact">
        {publicOperatorName && <p>Service operator: <strong className="text-foreground">{publicOperatorName}</strong>.</p>}
        {publicContactEmail ? (
          <p>Account, privacy and grievance contact: <a className="font-semibold text-primary hover:underline" href={`mailto:${publicContactEmail}`}>{publicContactEmail}</a>.</p>
        ) : (
          <p>Before public production activation, PhysioBill must publish the responsible operator/contact and grievance channel. The current staging environment is not a substitute for that production disclosure.</p>
        )}
      </Section>
    </LegalLayout>
  );
}

export function ProfessionalStandardsPage() {
  return (
    <LegalLayout title="Professional and advertising standards" eyebrow="Professional standards">
      <Section title="Who may be publicly listed">
        <p>Public discovery is for physiotherapy professionals whose credential information has been reviewed through the application's verification workflow. Verification in PhysioBill is not a substitute for registration or any legal requirement imposed by the applicable professional authority.</p>
      </Section>
      <Section title="Truthful professional identity">
        <p>Use the professional title, qualification, registration authority and registration number that can be supported by genuine records. Do not use fabricated, borrowed or expired credentials, or a specialist/superlative description that cannot be substantiated.</p>
      </Section>
      <Section title="Advertising claims">
        <p>Profiles and ads must be factual and must not promise a guaranteed, permanent, miraculous or universal clinical result. Avoid unsupported claims such as “100% cure”, “guaranteed relief”, “No. 1”, “best physiotherapist” or fixed recovery promises.</p>
        <p>Describe the service offered rather than implying that an ad platform knows the viewer has a particular disease, disability, pain condition or other sensitive health attribute.</p>
      </Section>
      <Section title="Patients, photos and reviews">
        <p>Do not publish patient names, faces, treatment photos, clinical documents, testimonials or identifiable stories without an appropriate lawful basis and specific permission for the intended public use. Never manufacture reviews or present staff/friends as patients.</p>
      </Section>
      <Section title="Service areas and availability">
        <p>List only genuine service modes, broad areas you can realistically serve and availability you intend to honour. Home-visit discovery must not expose a professional's private residential address merely to create a service-area listing.</p>
      </Section>
      <Section title="Clinical responsibility">
        <p>Advertising does not replace assessment, informed consent, red-flag screening, referral where appropriate, documentation or professional judgment. A booking is scheduling provenance only; it is not clinical authorization.</p>
      </Section>
      <Section title="Physiotherapy scope only">
        <p>Professionals must provide only services that fall within their lawful physiotherapy scope. PhysioBill must not be used to prescribe medicines, provide allopathic treatment, drugs or medication, or advertise authority outside physiotherapy practice.</p>
      </Section>
      <Section title="Regulatory baseline">
        <p>PhysioBill is designed to support a conservative workflow around the National Commission for Allied and Healthcare Professions framework and the applicable Gujarat allied-health regulator. The platform does not certify that a user's practice is legally compliant; professionals remain responsible for checking current requirements applicable to them.</p>
      </Section>
    </LegalLayout>
  );
}
