import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund & Returns Policy | Kerala Groceries UK',
  description:
    'Refund and returns policy for Kerala Groceries UK (Tasty Kerala Ltd). Learn about eligibility, process, and timelines for refunds on grocery orders.',
  keywords: ['Kerala Groceries UK refund policy', 'Indian grocery UK returns', 'Tasty Kerala Ltd refunds'],
  openGraph: {
    title: 'Refund & Returns Policy | Kerala Groceries UK',
    description: 'Refund and returns policy for Kerala Groceries UK — damaged goods, missing items, perishables, and processing times.',
    url: 'https://keralagrocery.com/refund-policy',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

const LAST_UPDATED = '29 April 2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 mt-10 mb-3">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <main className="bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Refund &amp; Returns Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: <strong>{LAST_UPDATED}</strong></p>
          <p className="text-gray-600 text-sm mt-3 max-w-xl">
            We want every order to arrive perfectly. If something is wrong, we will make it right.
            This policy explains when you are eligible for a refund and how to request one.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Quick Nav */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
          <p className="font-semibold text-gray-900 mb-3">Contents</p>
          <ol className="list-decimal list-inside space-y-1 text-green-700 columns-1 sm:columns-2">
            {[
              ['eligibility', 'Refund Eligibility'],
              ['non-refundable', 'Non-Refundable Items'],
              ['how-to-request', 'How to Request a Refund'],
              ['process', 'Our Review Process'],
              ['methods', 'Refund Methods'],
              ['timelines', 'Processing Timelines'],
              ['cancellations', 'Order Cancellations'],
              ['contact-refund', 'Contact Us'],
            ].map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="hover:underline">{label}</a></li>
            ))}
          </ol>
        </nav>

        <Section id="eligibility" title="1. Refund Eligibility">
          <p>We will issue a full or partial refund in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Damaged or defective items</strong> — goods that arrive visibly damaged,
              broken, or in unusable condition
            </li>
            <li>
              <strong>Missing items</strong> — items listed on your order confirmation that were not
              included in your delivery
            </li>
            <li>
              <strong>Incorrect items</strong> — you received a different product to what you ordered
            </li>
            <li>
              <strong>Significantly not as described</strong> — items that materially differ from
              their product description on our website
            </li>
            <li>
              <strong>Failed delivery</strong> — your order was not delivered and we cannot
              re-arrange delivery within a reasonable timeframe
            </li>
          </ul>
          <p>
            You must report any of the above issues <strong>within 48 hours of delivery</strong>.
            Reports made after this window may not be eligible for a refund, except where required
            by consumer law.
          </p>
        </Section>

        <Section id="non-refundable" title="2. Non-Refundable Items">
          <p>The following are generally not eligible for a refund:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Change of mind</strong> — we do not accept returns for items you no longer
              want after delivery
            </li>
            <li>
              <strong>Perishable goods</strong> — fresh produce, chilled or frozen items, and
              short-shelf-life products cannot be returned unless they arrive damaged or faulty
            </li>
            <li>
              <strong>Opened non-perishables</strong> — unsealed packaged goods cannot be returned
              unless defective
            </li>
            <li>
              <strong>Promotional or discounted items</strong> — items purchased at a sale price
              are refunded at the price actually paid, not the original price
            </li>
          </ul>
        </Section>

        <Section id="how-to-request" title="3. How to Request a Refund">
          <p>To request a refund, contact us within 48 hours of receiving your order:</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-2">
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
                admin@keralagrocery.com
              </a>
            </p>
            <p>
              <strong>Phone:</strong>{' '}
              <a href="tel:07902205199" className="text-green-600 hover:underline">07902205199</a>
            </p>
            <p>
              <strong>WhatsApp:</strong> Message us on the same number above
            </p>
          </div>
          <p>Please include the following in your message:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your order number</li>
            <li>The item(s) affected</li>
            <li>A brief description of the issue</li>
            <li>Photographic evidence (for damaged or incorrect items)</li>
          </ul>
        </Section>

        <Section id="process" title="4. Our Review Process">
          <p>
            Once we receive your refund request, we will review it within <strong>1–2 business
            days</strong>. We may ask for additional information or photos to help assess your
            claim.
          </p>
          <p>
            We will notify you by email or WhatsApp once a decision has been made. If your refund
            is approved, we will confirm the amount and the refund method.
          </p>
          <p>
            We aim to resolve all refund requests fairly and promptly. If you are not satisfied
            with our decision, you may escalate to your card provider or contact the Citizens
            Advice Bureau for guidance.
          </p>
        </Section>

        <Section id="methods" title="5. Refund Methods">
          <p>Approved refunds will be issued via one of the following methods:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Original payment method</strong> — refunded back to the card or payment
              method used at checkout (Worldpay)
            </li>
            <li>
              <strong>KG Wallet credit</strong> — if you prefer, we can credit the refund amount
              to your Kerala Groceries Wallet for use on future orders. Wallet credits are typically
              processed faster than card refunds.
            </li>
          </ul>
          <p>
            Please indicate your preferred refund method when contacting us. If no preference is
            stated, we will refund to your original payment method.
          </p>
        </Section>

        <Section id="timelines" title="6. Processing Timelines">
          <p>Once a refund is approved:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>KG Wallet credits</strong> — credited within <strong>1 business day</strong>
            </li>
            <li>
              <strong>Card/bank refunds</strong> — processed within <strong>3–7 business days</strong>.
              Your bank may take a further 3–5 days to reflect the refund in your account, depending
              on your card issuer.
            </li>
          </ul>
          <p>
            Refund timelines may vary around public holidays or during peak periods. If you have
            not received your refund after 10 business days, please contact us.
          </p>
        </Section>

        <Section id="cancellations" title="7. Order Cancellations">
          <p>
            You may cancel an order <strong>before it has been dispatched</strong>. To cancel,
            contact us as soon as possible via the details above.
          </p>
          <p>
            Once an order has been dispatched, it cannot be cancelled — but you may still be
            eligible for a refund on receipt if any item is damaged, missing, or incorrect
            (see Section 1).
          </p>
          <p>
            If we cancel your order for any reason (e.g., stock unavailability, delivery
            restrictions), you will receive a full refund to your original payment method within
            3–5 business days.
          </p>
        </Section>

        <Section id="contact-refund" title="8. Contact Us">
          <p>For all refund and returns queries, please contact:</p>
          <address className="not-italic bg-gray-50 border border-gray-200 rounded-xl p-5 mt-3 space-y-1">
            <p className="font-semibold text-gray-900">Tasty Kerala Ltd</p>
            <p>Trading as: Kerala Groceries UK</p>
            <p>21, weald bridge nursery</p>
            <p>kents Lane, North Weald</p>
            <p>epping CM166AX</p>
            <p>
              Email:{' '}
              <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
                admin@keralagrocery.com
              </a>
            </p>
            <p>
              Phone:{' '}
              <a href="tel:07902205199" className="text-green-600 hover:underline">07902205199</a>
            </p>
          </address>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>Last updated: {LAST_UPDATED}</p>
          <p>
            Related:{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
            {' · '}
            <Link href="/terms" className="underline hover:text-gray-600">Terms &amp; Conditions</Link>
            {' · '}
            <Link href="/delivery-policy" className="underline hover:text-gray-600">Delivery Policy</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
