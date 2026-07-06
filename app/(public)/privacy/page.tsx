import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Kerala Groceries UK',
  description:
    'Privacy Policy for Kerala Groceries UK (Tasty Kerala Ltd). Learn how we collect, use, and protect your personal data in compliance with UK GDPR.',
  keywords: ['Kerala Groceries UK privacy policy', 'Tasty Kerala Ltd GDPR', 'Indian grocery UK data protection'],
  openGraph: {
    title: 'Privacy Policy | Kerala Groceries UK',
    description: 'How Kerala Groceries UK collects, uses, and protects your personal information.',
    url: 'https://keralagrocery.com/privacy',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

const LAST_UPDATED = '27 April 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">
            Last updated: <strong>{LAST_UPDATED}</strong>
          </p>
          <p className="text-gray-600 text-sm mt-3 max-w-xl">
            This Privacy Policy explains how <strong>Tasty Kerala Ltd</strong>, trading as{' '}
            <strong>Kerala Groceries UK</strong>, collects, uses, and protects your personal information
            when you use our website at <strong>keralagrocery.com</strong>.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Quick Nav */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <p className="font-semibold text-gray-900 mb-3">Contents</p>
          <ol className="list-decimal list-inside space-y-1 text-green-700 columns-1 sm:columns-2">
            {[
              ['who-we-are', 'Who We Are'],
              ['data-we-collect', 'Data We Collect'],
              ['how-we-use-data', 'How We Use Your Data'],
              ['third-party-services', 'Third-Party Services'],
              ['communications', 'Order & Service Communications'],
              ['wallet', 'Wallet, Cashback & Credits'],
              ['cookies', 'Cookies & Analytics'],
              ['data-sharing', 'Data Sharing'],
              ['data-security', 'Data Security'],
              ['retention', 'Data Retention'],
              ['your-rights', 'Your Rights (UK GDPR)'],
              ['childrens', "Children's Privacy"],
              ['changes', 'Changes to This Policy'],
              ['contact-dpo', 'Contact Us / Data Controller'],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="who-we-are" title="1. Who We Are">
          <p>
            Kerala Groceries UK is operated by <strong>Tasty Kerala Ltd</strong>, a company registered
            in England and Wales. We are the data controller for personal information collected through
            our website and mobile applications.
          </p>
          <p>
            <strong>Contact:</strong>{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>
            {' '}| Phone: <a href="tel:07769867549" className="text-green-600 hover:underline">07769 867 549</a>
          </p>
        </Section>

        <Section id="data-we-collect" title="2. Data We Collect">
          <p>We collect the following categories of personal information:</p>
          <h3 className="font-semibold text-gray-900 mt-4 mb-1">2.1 Information You Provide Directly</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Name</strong> — used to personalise your account and orders</li>
            <li><strong>Email address</strong> — used for account login, order confirmations, and service communications</li>
            <li><strong>Phone number</strong> — used for order updates via WhatsApp and SMS, and for phone verification</li>
            <li><strong>Delivery address</strong> (street address, city, postcode) — used to fulfil and deliver your orders</li>
            <li><strong>Payment details</strong> — processed by our payment gateway (we do not store full card numbers)</li>
            <li><strong>Order notes and preferences</strong> — any instructions you add to your orders</li>
          </ul>
          <h3 className="font-semibold text-gray-900 mt-4 mb-1">2.2 Account Login Data</h3>
          <p>
            We support email/password registration and <strong>Google Sign-In</strong>. When you sign in
            via Google, we receive your name, email address, and profile picture from Google, subject to
            your Google account privacy settings.
          </p>
          <h3 className="font-semibold text-gray-900 mt-4 mb-1">2.3 Data Collected Automatically</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>IP address and browser/device type</li>
            <li>Pages visited and time spent on site</li>
            <li>Referring website or search query</li>
            <li>Cart activity and browsing behaviour on our platform</li>
          </ul>
        </Section>

        <Section id="how-we-use-data" title="3. How We Use Your Data">
          <p>We use your personal data for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Order fulfilment</strong> — processing, packing, and delivering your grocery orders</li>
            <li><strong>Account management</strong> — creating and maintaining your user profile</li>
            <li><strong>Payment processing</strong> — securely processing card payments and managing your KG Wallet balance</li>
            <li><strong>Order notifications</strong> — sending order confirmation, dispatch, and delivery updates via WhatsApp, SMS, or email</li>
            <li><strong>Customer support</strong> — responding to your queries, complaints, and refund requests</li>
            <li><strong>Platform improvement</strong> — analysing usage data to improve the website and app experience</li>
            <li><strong>Legal compliance</strong> — retaining records as required by UK law (e.g., accounting, tax obligations)</li>
            <li><strong>Fraud prevention</strong> — detecting and preventing fraudulent transactions</li>
          </ul>
          <p className="mt-3">
            Our lawful basis for processing is: <strong>contract performance</strong> (to fulfil your
            orders), <strong>legitimate interests</strong> (platform security and improvement), and
            <strong>legal obligation</strong> (regulatory compliance).
          </p>
        </Section>

        <Section id="third-party-services" title="4. Third-Party Services">
          <p>We use trusted third-party service providers who may process your personal data on our behalf:</p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-1">4.1 Payment Gateways</h3>
          <p>
            Card payments are processed through <strong>Worldpay</strong> (and may also be processed
            through <strong>Stripe</strong> for certain transactions). These providers are PCI-DSS
            compliant. We do not store or access your full card number. Please refer to Worldpay&apos;s and
            Stripe&apos;s respective privacy policies for information on how they handle payment data.
          </p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-1">4.2 Communications – Twilio (WhatsApp & SMS)</h3>
          <p>
            We use <strong>Twilio</strong> to send order confirmation and delivery update messages via
            WhatsApp and SMS. Twilio processes your phone number to route these messages. Twilio is
            bound by its own privacy policy and data processing agreement. Your phone number is only
            used for transactional communications related to your orders or account security.
          </p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-1">4.3 Google Services</h3>
          <p>
            We use <strong>Google Sign-In</strong> for account authentication and <strong>Google
            Analytics</strong> to understand site traffic. Google may collect data per its own
            privacy policy. You can opt out of Google Analytics tracking via your browser settings
            or by using the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Google Analytics Opt-out Browser Add-on
            </a>.
          </p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-1">4.4 Supabase (Infrastructure)</h3>
          <p>
            Our platform is built on <strong>Supabase</strong>, a cloud database and authentication
            provider. Your account and order data is stored on Supabase's encrypted infrastructure,
            hosted within the European Economic Area (EEA).
          </p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-1">4.5 Address Lookup</h3>
          <p>
            When you enter a delivery address during checkout, we may use a UK address lookup service
            to autocomplete and validate your postcode. Only the postcode or partial address is sent
            to perform the lookup.
          </p>
        </Section>

        <Section id="communications" title="5. Order & Service Communications">
          <p>
            <strong>
              We may contact you via WhatsApp, SMS, or email for order updates and service notifications.
            </strong>
          </p>
          <p>
            These communications include: order confirmation, payment receipt, dispatch notification,
            delivery updates, and important account or security alerts. These are transactional
            messages and are necessary to fulfil your contract with us.
          </p>
          <p>
            We do not send unsolicited marketing messages. If we introduce a marketing channel in the
            future, we will obtain your explicit consent before doing so, and you will always have the
            option to opt out.
          </p>
        </Section>

        <Section id="wallet" title="6. Wallet, Cashback & Credits">
          <p>
            Kerala Groceries UK operates a digital <strong>KG Wallet</strong> system. This wallet may
            hold:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cashback credits</strong> — earned from qualifying orders</li>
            <li><strong>Refund credits</strong> — issued when a refund is processed to your wallet</li>
            <li><strong>Promotional credits</strong> — added as part of special offers or campaigns</li>
          </ul>
          <p>
            Wallet balance and transaction history are associated with your account and stored securely
            in our database. Wallet credits have no cash value outside the platform and cannot be
            transferred to another account. We may retain wallet transaction records for up to 7 years
            for accounting purposes.
          </p>
        </Section>

        <Section id="cookies" title="7. Cookies & Analytics">
          <p>We use cookies and similar tracking technologies for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Essential cookies</strong> — required for the website to function (e.g.,
              maintaining your session and cart)
            </li>
            <li>
              <strong>Analytics cookies</strong> — help us understand how visitors use our site
              (e.g., Google Analytics). These are anonymised where possible.
            </li>
            <li>
              <strong>Preference cookies</strong> — remember your settings such as delivery postcode
              or recently viewed products
            </li>
          </ul>
          <p>
            You can control non-essential cookies through your browser settings. Disabling cookies may
            affect your shopping experience on our site.
          </p>
        </Section>

        <Section id="data-sharing" title="8. Data Sharing">
          <p>We do not sell your personal data. We share data only in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Service providers</strong> — third parties that help us operate (payment
              processors, communication tools, hosting) under strict data processing agreements
            </li>
            <li>
              <strong>Delivery partners</strong> — couriers may receive your name and delivery
              address to complete your order
            </li>
            <li>
              <strong>Legal requirements</strong> — if required by law, court order, or government
              authority
            </li>
            <li>
              <strong>Business transfers</strong> — in the event of a merger or acquisition, your
              data may be transferred to the new entity, which will be bound by this policy
            </li>
          </ul>
        </Section>

        <Section id="data-security" title="9. Data Security">
          <p>
            We implement appropriate technical and organisational security measures to protect your
            personal data, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encrypted data storage (AES-256) and encrypted transmission (TLS/HTTPS)</li>
            <li>Row-level security on our database so users can only access their own data</li>
            <li>PCI-DSS compliant payment processing — we never handle raw card details</li>
            <li>Phone number verification via one-time passcode (OTP) before account actions</li>
            <li>Access controls limiting staff access to customer data on a need-to-know basis</li>
          </ul>
          <p>
            Despite our best efforts, no online system is 100% secure. If you suspect unauthorised
            access to your account, please contact us immediately at{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>.
          </p>
        </Section>

        <Section id="retention" title="10. Data Retention">
          <p>We retain personal data for as long as necessary to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintain your account and purchase history while your account is active</li>
            <li>Comply with UK legal and tax record-keeping requirements (typically 6–7 years)</li>
            <li>Resolve disputes or enforce our terms</li>
          </ul>
          <p>
            When you delete your account, we will remove or anonymise your personal data except where
            retention is required by law.
          </p>
        </Section>

        <Section id="your-rights" title="11. Your Rights Under UK GDPR">
          <p>
            As a UK resident, you have the following rights under the UK General Data Protection
            Regulation (UK GDPR) and the Data Protection Act 2018:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Right to rectification</strong> — ask us to correct inaccurate or incomplete data</li>
            <li><strong>Right to erasure</strong> — request deletion of your data (&quot;right to be forgotten&quot;), subject to legal retention obligations</li>
            <li><strong>Right to restrict processing</strong> — ask us to limit how we use your data in certain circumstances</li>
            <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
            <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
            <li><strong>Rights related to automated decision-making</strong> — we do not make solely automated decisions that significantly affect you</li>
          </ul>
          <p>
            To exercise any of these rights, email{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>{' '}
            with &quot;Data Rights Request&quot; in the subject line. We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with the{' '}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              Information Commissioner&apos;s Office (ICO)
            </a>{' '}
            if you believe we have not handled your data correctly.
          </p>
        </Section>

        <Section id="childrens" title="12. Children's Privacy">
          <p>
            Our platform is not intended for children under the age of 13. We do not knowingly collect
            personal data from children. If you believe a child has provided us with personal
            information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or
            applicable law. We will post the updated policy on this page with a revised &quot;Last updated&quot;
            date. For significant changes, we may notify you by email. Your continued use of our
            services after any changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section id="contact-dpo" title="14. Data Controller & Contact">
          <p>
            The data controller for all personal information collected through Kerala Groceries UK is:
          </p>
          <address className="not-italic bg-gray-50 border border-gray-200 rounded-xl p-5 mt-3 space-y-1">
            <p className="font-semibold text-gray-900">Tasty Kerala Ltd</p>
            <p>Trading as: Kerala Groceries UK</p>
            <p>21 Weald Bridge Nursery</p>
            <p>Essex, CM16 6AX</p>
            <p>
              Email:{' '}
              <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
                admin@keralagrocery.com
              </a>
            </p>
            <p>
              Phone:{' '}
              <a href="tel:07769867549" className="text-green-600 hover:underline">07769 867 549</a>
            </p>
          </address>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>Last updated: {LAST_UPDATED}</p>
          <p>
            Related:{' '}
            <Link href="/terms" className="underline hover:text-gray-600">Terms & Conditions</Link>
            {' · '}
            <Link href="/delivery-policy" className="underline hover:text-gray-600">Delivery Policy</Link>
            {' · '}
            <Link href="/refund-policy" className="underline hover:text-gray-600">Refund Policy</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
