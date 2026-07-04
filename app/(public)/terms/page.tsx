import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Kerala Groceries UK',
  description:
    'Terms and Conditions for shopping at Kerala Groceries UK, operated by Tasty Kerala Ltd. Covers orders, payments, delivery, refunds, wallet credits, and user responsibilities.',
  keywords: [
    'Kerala Groceries UK terms',
    'Tasty Kerala Ltd terms and conditions',
    'Indian grocery UK terms',
    'Kerala grocery delivery terms',
  ],
  openGraph: {
    title: 'Terms & Conditions | Kerala Groceries UK',
    description:
      'Read the Terms & Conditions for shopping at Kerala Groceries UK, operated by Tasty Kerala Ltd.',
    url: 'https://keralagrocery.com/terms',
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

export default function TermsPage() {
  return (
    <main className="bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms &amp; Conditions</h1>
          <p className="text-gray-500 text-sm">Last updated: <strong>{LAST_UPDATED}</strong></p>
          <p className="text-gray-600 text-sm mt-3 max-w-xl">
            Please read these Terms and Conditions carefully before using the Kerala Groceries UK
            website (<strong>keralagrocery.com</strong>). By placing an order or creating an account,
            you agree to be bound by these terms.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Quick Nav */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <p className="font-semibold text-gray-900 mb-3">Contents</p>
          <ol className="list-decimal list-inside space-y-1 text-green-700 columns-1 sm:columns-2">
            {[
              ['about', 'About Us'],
              ['acceptance', 'Acceptance of Terms'],
              ['account', 'Account Registration'],
              ['orders', 'Order Processing'],
              ['pricing', 'Pricing & Availability'],
              ['payment', 'Payment Methods'],
              ['wallet', 'KG Wallet & Credits'],
              ['delivery', 'Delivery Terms'],
              ['cancellations', 'Cancellations'],
              ['refunds', 'Returns & Refunds'],
              ['user-responsibilities', 'User Responsibilities'],
              ['platform-rights', 'Platform Rights'],
              ['intellectual-property', 'Intellectual Property'],
              ['limitation', 'Limitation of Liability'],
              ['governing-law', 'Governing Law'],
              ['changes', 'Changes to Terms'],
              ['contact-terms', 'Contact'],
            ].map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="hover:underline">{label}</a></li>
            ))}
          </ol>
        </nav>

        <Section id="about" title="1. About Us">
          <p>
            Kerala Groceries UK is operated by <strong>Tasty Kerala Ltd</strong>, a company registered
            in England and Wales. References to "we", "us", or "our" in these Terms refer to Tasty
            Kerala Ltd trading as Kerala Groceries UK.
          </p>
          <p>
            Email:{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>
            {' '}| Phone:{' '}
            <a href="tel:07769867549" className="text-green-600 hover:underline">07769 867 549</a>
          </p>
        </Section>

        <Section id="acceptance" title="2. Acceptance of Terms">
          <p>
            By accessing our website, creating an account, or placing an order, you confirm that you:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Are at least 18 years of age</li>
            <li>Are located in the United Kingdom</li>
            <li>Have read and agree to these Terms and Conditions and our{' '}
              <Link href="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
            </li>
          </ul>
          <p>If you do not agree to these terms, please do not use our services.</p>
        </Section>

        <Section id="account" title="3. Account Registration">
          <p>
            To place an order you must create an account. You agree to provide accurate, current, and
            complete information during registration and to keep your account details up to date.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your password and for all
            activity that occurs under your account. If you believe your account has been compromised,
            notify us immediately at{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>.
          </p>
          <p>
            We require phone number verification via one-time passcode (OTP) to confirm your identity
            and to enable order notification services (WhatsApp/SMS). You agree to provide a valid UK
            phone number for this purpose.
          </p>
        </Section>

        <Section id="orders" title="4. Order Processing">
          <p>
            When you place an order, you are making an offer to purchase the products listed in your
            basket. Your order is confirmed only when you receive an order confirmation from us (via
            email or WhatsApp/SMS).
          </p>
          <p>
            We operate a <strong>multi-store model</strong>: your basket may include products from
            multiple supplier stores within our platform. All items are consolidated and dispatched as
            a single order where possible.
          </p>
          <p>
            We reserve the right to refuse, cancel, or limit any order for any reason, including but
            not limited to: suspected fraudulent activity, pricing errors, product unavailability, or
            delivery restrictions in your area.
          </p>
          <p>
            If we cannot fulfil your order (in whole or in part), we will notify you promptly and
            arrange a refund for any items not fulfilled.
          </p>
        </Section>

        <Section id="pricing" title="5. Pricing & Availability">
          <p>
            All prices are displayed in <strong>Pounds Sterling (GBP)</strong> and include any
            applicable VAT where stated. Prices are subject to change without prior notice.
          </p>
          <p>
            Product availability is subject to stock levels. We make reasonable efforts to display
            accurate stock information, but availability is not guaranteed until your order is confirmed.
          </p>
          <p>
            In the event of a pricing error on our website, we are not obliged to honour the incorrect
            price. We will notify you of the correct price and give you the option to proceed or cancel.
          </p>
        </Section>

        <Section id="payment" title="6. Payment Methods">
          <p>We accept the following payment methods:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Debit/credit card</strong> — processed securely via Worldpay (PCI-DSS compliant)</li>
            <li><strong>Cash on Delivery (COD)</strong> — available for selected delivery areas</li>
            <li><strong>KG Wallet</strong> — digital wallet credits (see Section 7)</li>
          </ul>
          <p>
            Payment must be completed at the time of ordering (except for Cash on Delivery).
            We do not store your full card details on our servers.
          </p>
        </Section>

        <Section id="wallet" title="7. KG Wallet & Credits">
          <p>
            The <strong>KG Wallet</strong> is a digital account credit system available to registered
            customers. Wallet credits may be issued as:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cashback credits</strong> — automatically credited after qualifying orders</li>
            <li><strong>Refund credits</strong> — issued when a refund is processed to your wallet</li>
            <li><strong>Promotional credits</strong> — added during special campaigns or promotions</li>
          </ul>
          <p>
            Wallet credits have <strong>no monetary value</strong> outside our platform. They cannot be
            withdrawn as cash, transferred to another account, or exchanged for gift cards. Credits may
            have expiry dates; we will communicate any expiry at the time of issuance.
          </p>
          <p>
            We reserve the right to adjust, suspend, or terminate wallet balances if we detect misuse,
            fraud, or breach of these Terms.
          </p>
        </Section>

        <Section id="delivery" title="8. Delivery Terms">
          <p>
            We deliver to addresses across the United Kingdom. Delivery fees (if any) and estimated
            delivery windows are displayed at checkout before you complete your order.
          </p>
          <p>
            Delivery timeframes are estimates only. While we aim to meet all stated delivery windows,
            factors outside our control (weather, carrier delays, etc.) may cause delays. We are not
            liable for losses caused by delivery delays.
          </p>
          <p>
            You are responsible for ensuring someone is available to receive your order at the
            delivery address. If a delivery attempt fails due to no one being available and the
            goods cannot be stored safely, we reserve the right to charge a re-delivery fee.
          </p>
          <p>
            For more details, please see our{' '}
            <Link href="/delivery-policy" className="text-green-600 hover:underline">Delivery Policy</Link>.
          </p>
        </Section>

        <Section id="cancellations" title="9. Cancellations">
          <p>
            You may request to cancel an order only if it has not yet been dispatched. To cancel,
            contact us immediately at{' '}
            <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
              admin@keralagrocery.com
            </a>{' '}
            or call us on{' '}
            <a href="tel:07769867549" className="text-green-600 hover:underline">07769 867 549</a>.
          </p>
          <p>
            Once an order has been dispatched, it cannot be cancelled. You may still be eligible for a
            return after delivery (see Section 10).
          </p>
          <p>
            We reserve the right to cancel orders at our discretion. If we cancel your order, you will
            receive a full refund to your original payment method or to your KG Wallet, as applicable.
          </p>
        </Section>

        <Section id="refunds" title="10. Returns & Refunds">
          <p>
            We want you to be completely satisfied with your order. If there is a problem with your
            delivery, please contact us within <strong>48 hours</strong> of receipt.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Damaged or faulty goods</strong> — we will arrange a refund or replacement at no
              cost to you. Please provide photographic evidence where possible.
            </li>
            <li>
              <strong>Missing items</strong> — if an item is missing from your order, we will refund
              the item or send it with your next order.
            </li>
            <li>
              <strong>Perishable goods</strong> — due to their nature, perishable items (fresh
              produce, chilled goods) cannot be returned unless they are damaged, faulty, or not as
              described on delivery.
            </li>
            <li>
              <strong>Non-perishable goods</strong> — unopened, undamaged non-perishable items may be
              returned within 14 days of delivery. Return postage costs are the customer's
              responsibility unless the return is due to our error.
            </li>
          </ul>
          <p>
            Refunds are processed to your original payment method within 5–10 business days, or
            credited to your KG Wallet if you prefer. For full details, see our{' '}
            <Link href="/refund-policy" className="text-green-600 hover:underline">Refund Policy</Link>.
          </p>
        </Section>

        <Section id="user-responsibilities" title="11. User Responsibilities">
          <p>By using our platform, you agree that you will not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide false, misleading, or fraudulent information</li>
            <li>Use our platform for any unlawful purpose</li>
            <li>Attempt to gain unauthorised access to any part of our system</li>
            <li>Submit multiple accounts to abuse promotions or wallet credits</li>
            <li>Interfere with the operation of our website or mobile application</li>
            <li>Resell or commercially exploit products purchased at promotional pricing without our consent</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these conditions, and to
            cancel any outstanding orders associated with such accounts.
          </p>
        </Section>

        <Section id="platform-rights" title="12. Platform Rights">
          <p>We reserve the right to, at any time:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Add, remove, or modify products, pricing, and promotions</li>
            <li>Restrict or suspend access to any part of the platform</li>
            <li>Change the features or structure of the website or app</li>
            <li>Terminate or modify the KG Wallet programme</li>
          </ul>
          <p>
            Material changes that affect existing orders will be communicated to affected customers.
          </p>
        </Section>

        <Section id="intellectual-property" title="13. Intellectual Property">
          <p>
            All content on the Kerala Groceries UK website — including text, images, logos, product
            descriptions, and software — is owned by or licensed to Tasty Kerala Ltd.
          </p>
          <p>
            You may not reproduce, distribute, or create derivative works from any of our content
            without our express written permission.
          </p>
        </Section>

        <Section id="limitation" title="14. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Tasty Kerala Ltd shall not be liable for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Indirect, incidental, or consequential losses arising from use of our platform</li>
            <li>Loss of data, revenue, or profits resulting from service downtime</li>
            <li>Delays or failures caused by third-party service providers (couriers, payment gateways, etc.)</li>
          </ul>
          <p>
            Nothing in these Terms limits our liability for death or personal injury caused by
            negligence, fraud, or any other liability that cannot be excluded under UK law.
          </p>
        </Section>

        <Section id="governing-law" title="15. Governing Law">
          <p>
            These Terms and Conditions are governed by and construed in accordance with the laws of
            <strong> England and Wales</strong>. Any disputes arising under these Terms shall be
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section id="changes" title="16. Changes to These Terms">
          <p>
            We may update these Terms and Conditions from time to time. The "Last updated" date at the
            top of this page will reflect any changes. Continued use of our platform after changes are
            posted constitutes your acceptance of the revised Terms.
          </p>
        </Section>

        <Section id="contact-terms" title="17. Contact">
          <p>If you have any questions about these Terms, please contact us:</p>
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
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
            {' · '}
            <Link href="/refund-policy" className="underline hover:text-gray-600">Refund Policy</Link>
            {' · '}
            <Link href="/delivery-policy" className="underline hover:text-gray-600">Delivery Policy</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
