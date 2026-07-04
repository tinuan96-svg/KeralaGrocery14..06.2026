'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ContactClient() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const subject = encodeURIComponent(`Contact Form – ${form.name}`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
      );
      window.location.href = `mailto:admin@keralagrocery.com?subject=${subject}&body=${body}`;
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const isSent = status === 'sent';

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-700/50 text-green-200 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <MessageSquare className="h-4 w-4" />
            We're here to help
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-green-100 text-lg max-w-xl mx-auto">
            Questions about your order, a product, or anything else? Our UK-based support team
            is ready to assist — typically within 24 hours on business days.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-10">

          {/* Contact Details */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Get in Touch</h2>
              <p className="text-gray-500 text-sm">
                Reach us by email, phone, or fill in the form and we'll respond promptly.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Email</p>
                  <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline text-sm">
                    admin@keralagrocery.com
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">We reply within 24 hours on business days</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Phone</p>
                  <a href="tel:07769867549" className="text-blue-600 hover:underline text-sm">
                    07769 867 549
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">Mon–Sat, 9 am – 6 pm (UK time)</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Address</p>
                  <p className="text-sm text-gray-700">21 Weald Bridge Nursery</p>
                  <p className="text-sm text-gray-700">Essex, CM16 6AX</p>
                  <p className="text-xs text-gray-400 mt-0.5">Registered: Tasty Kerala Ltd, England & Wales</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Support Hours</p>
                  <p className="text-sm text-gray-700">Monday – Saturday · 9:00 am – 6:00 pm (UK)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Email support available 24/7 — reply next business day</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-800 space-y-1">
              <p className="font-semibold">Order Issues & Tracking</p>
              <p>
                Already placed an order? Visit your{' '}
                <Link href="/orders" className="underline font-medium hover:text-green-900">
                  Orders page
                </Link>{' '}
                for live status, or email us with your order number for fastest support.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Send Us a Message</h2>
            <p className="text-sm text-gray-500 mb-6">We'll get back to you within one business day.</p>

            {isSent ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-semibold text-gray-900">Message ready to send!</p>
                <p className="text-sm text-gray-500">
                  Your email client has opened with your message pre-filled. Please send it to complete your enquiry.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Smith"
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="07700 900 000"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help…"
                    rows={5}
                    required
                    className="resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">
                    Something went wrong. Please email us directly at{' '}
                    <a href="mailto:admin@keralagrocery.com" className="underline">admin@keralagrocery.com</a>.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Message
                  </span>
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  By submitting this form you agree to our{' '}
                  <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Company info bar */}
        <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-200 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-900 mb-2">Company Information</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
            <p><span className="font-medium">Registered Name:</span> Tasty Kerala Ltd</p>
            <p><span className="font-medium">Trading Name:</span> Kerala Groceries UK</p>
            <p>
              <span className="font-medium">Email:</span>{' '}
              <a href="mailto:admin@keralagrocery.com" className="text-green-600 hover:underline">
                admin@keralagrocery.com
              </a>
            </p>
            <p>
              <span className="font-medium">Phone:</span>{' '}
              <a href="tel:07769867549" className="text-green-600 hover:underline">07769 867 549</a>
            </p>
            <p><span className="font-medium">Country:</span> United Kingdom</p>
          </div>
        </div>
      </div>
    </main>
  );
}
