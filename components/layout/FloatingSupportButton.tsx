'use client';

import { useState } from 'react';
import { Phone, MessageCircle, Mail, Truck, X } from 'lucide-react';

const SUPPORT_ACTIONS = [
  {
    icon: Phone,
    label: 'Call Now',
    sub: '07769 867 549',
    href: 'tel:+447769867549',
    color: 'bg-green-50 text-[#0B5D3B]',
    iconBg: 'bg-[#0B5D3B]',
    iconColor: 'text-white',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    sub: 'Chat with us',
    href: 'https://wa.me/447769867549?text=Hello%2C%20I%20need%20support%20with%20my%20Kerala%20Groceries%20order.',
    color: 'bg-green-50 text-green-800',
    iconBg: 'bg-[#25D366]',
    iconColor: 'text-white',
  },
  {
    icon: Mail,
    label: 'Email Us',
    sub: 'admin@keralagrocery.com',
    href: 'mailto:admin@keralagrocery.com',
    color: 'bg-blue-50 text-blue-800',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
  },
  {
    icon: Truck,
    label: 'Delivery Info',
    sub: 'Rates & timescales',
    href: '/delivery-policy',
    color: 'bg-amber-50 text-amber-800',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
  },
];

export default function FloatingSupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — bottom-left, mobile only */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Customer support"
        className={[
          'lg:hidden fixed-gpu',
          'w-[52px] h-[52px] rounded-full',
          'bg-[#0B5D3B] text-white',
          'flex items-center justify-center',
          'shadow-[0_6px_20px_rgba(11,93,59,0.40),_0_2px_6px_rgba(0,0,0,0.10)]',
          'active:scale-90 transition-transform duration-150',
        ].join(' ')}
        style={{
          position: 'fixed',
          bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 8px)',
          left: '16px',
          zIndex: 998,
        }}
      >
        <Phone className="h-[20px] w-[20px]" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-[1001] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom drawer */}
      <div
        className={[
          'lg:hidden fixed left-0 right-0 z-[1002] bg-white rounded-t-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Customer support options"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B5D3B] flex items-center justify-center">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-gray-900 leading-none">Customer Support</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Available 9AM – 9PM</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Action list */}
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {SUPPORT_ACTIONS.map(({ icon: Icon, label, sub, href, color, iconBg, iconColor }) => {
            const isExternal = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
            const props = isExternal
              ? { href, target: href.startsWith('http') ? '_blank' : undefined, rel: href.startsWith('http') ? 'noopener noreferrer' : undefined }
              : { href };

            return (
              <a
                key={label}
                {...props}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-100 ${color} transition-all active:scale-[0.98]`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-none">{label}</p>
                  <p className="text-[11px] opacity-60 mt-0.5 truncate">{sub}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
