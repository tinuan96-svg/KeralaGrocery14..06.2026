import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Kerala Groceries UK – Customer Support',
  description:
    'Contact Kerala Groceries UK (Tasty Kerala Ltd) for order support, product enquiries, or general questions. Email, phone, and online contact form available.',
  keywords: [
    'contact Kerala Groceries UK',
    'Kerala groceries customer support',
    'Indian grocery UK contact',
    'Tasty Kerala Ltd',
    'Kerala grocery delivery help',
  ],
  openGraph: {
    title: 'Contact Us | Kerala Groceries UK',
    description: 'Reach our UK-based support team for any order or product queries.',
    url: 'https://keralagrocery.com/contact',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
