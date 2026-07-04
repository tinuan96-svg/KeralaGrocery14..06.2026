import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Policy | Kerala Groceries UK',
  description: 'Delivery policy for Kerala Groceries UK. Learn about delivery areas, timing, and charges.',
};

export default function DeliveryPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Delivery Policy</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-lg mb-6">
          We strive to deliver your order quickly and efficiently.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Areas</h2>
        <p className="mb-6">
          We deliver across selected UK areas. Check at checkout if delivery is available to your postcode.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Time</h2>
        <p className="mb-6">
          Delivery is usually next day for orders placed before 6 PM. Delivery times are estimates and may vary depending on your location and order volume.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Charges</h2>
        <p className="mb-6">
          Delivery charges may vary based on your location and order value. The delivery fee will be displayed at checkout before you complete your order.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Order Tracking</h2>
        <p className="mb-6">
          Once your order is dispatched, you will receive a confirmation. For any queries about your delivery, please contact our customer service team.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="mb-6">
          For delivery inquiries, contact us at{' '}
          <a href="mailto:admin@keralagrocery.com" className="text-blue-600 hover:underline">
            admin@keralagrocery.com
          </a>{' '}
          or call{' '}
          <a href="tel:07769867549" className="text-blue-600 hover:underline">
            07769867549
          </a>
        </p>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-gray-600">
            <strong>Company Name:</strong> Tasty Kerala Ltd<br />
            <strong>Trading Name:</strong> Kerala Groceries UK<br />
            <strong>Email:</strong> <a href="mailto:admin@keralagrocery.com" className="text-blue-600 hover:underline">admin@keralagrocery.com</a><br />
            <strong>Phone:</strong> <a href="tel:07769867549" className="text-blue-600 hover:underline">07769867549</a>
          </p>
        </div>
      </div>
    </div>
  );
}
