'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, Phone, MessageCircle, Zap, Gift, X } from 'lucide-react';

// ── Menu items ─────────────────────────────────────────────────────────────────
// "action" items: navigate | call | whatsapp | scroll

interface MenuItem {
  label: string;
  sub: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  color: string;        // icon color
  bg: string;           // button background gradient
  ring: string;         // ring glow color (rgba)
  action: 'navigate' | 'call' | 'whatsapp' | 'scroll';
  payload: string;      // href, tel, wa url, or section-id
}

const MENU_ITEMS: MenuItem[] = [
  {
    label:   'My Orders',
    sub:     'View order history',
    icon:    Package,
    color:   '#1D4ED8',
    bg:      'linear-gradient(135deg,#dbeafe,#eff6ff)',
    ring:    'rgba(59,130,246,0.35)',
    action:  'navigate',
    payload: '/orders',
  },
  {
    label:   'Track Order',
    sub:     'Real-time tracking',
    icon:    Truck,
    color:   '#0F766E',
    bg:      'linear-gradient(135deg,#ccfbf1,#f0fdfa)',
    ring:    'rgba(20,184,166,0.35)',
    action:  'navigate',
    payload: '/orders',
  },
  {
    label:   'Call Support',
    sub:     '07769 867 549',
    icon:    Phone,
    color:   '#0B5D3B',
    bg:      'linear-gradient(135deg,#dcfce7,#f0fdf4)',
    ring:    'rgba(22,163,74,0.35)',
    action:  'call',
    payload: 'tel:+447769867549',
  },
  {
    label:   'WhatsApp',
    sub:     'Chat with us now',
    icon:    MessageCircle,
    color:   '#15803d',
    bg:      'linear-gradient(135deg,#d1fae5,#ecfdf5)',
    ring:    'rgba(37,211,102,0.4)',
    action:  'whatsapp',
    payload: 'https://wa.me/447769867549?text=Hello%2C%20I%20need%20help%20with%20my%20order.',
  },
  {
    label:   'Flash Deals',
    sub:     'Limited time offers',
    icon:    Zap,
    color:   '#DC2626',
    bg:      'linear-gradient(135deg,#fee2e2,#fff1f2)',
    ring:    'rgba(220,38,38,0.35)',
    action:  'navigate',
    payload: '/products?filter=deals',
  },
  {
    label:   "Today's Offers",
    sub:     'Best deals today',
    icon:    Gift,
    color:   '#B45309',
    bg:      'linear-gradient(135deg,#fef3c7,#fffbeb)',
    ring:    'rgba(245,158,11,0.35)',
    action:  'navigate',
    payload: '/offers',
  },
];

// ── Fan arc geometry ───────────────────────────────────────────────────────────
// 6 items spread from 88° (near-vertical) to 8° (near-horizontal), radius 116px

const FAN_RADIUS = 116;
const ANGLES_DEG = [88, 70, 52, 35, 20, 5];

function fanPos(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x:  FAN_RADIUS * Math.cos(rad),
    y: -FAN_RADIUS * Math.sin(rad),
  };
}

// ── Pulse ring animation ───────────────────────────────────────────────────────

const pulseVariants = {
  idle:   { scale: 1,    opacity: 0 },
  pulse:  { scale: [1, 1.55, 1.55], opacity: [0.7, 0.3, 0] },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function KGQuickMenu() {
  const [open, setOpen]   = useState(false);
  const [pulsed, setPulsed] = useState(false);
  const router            = useRouter();
  const pathname          = usePathname();
  const containerRef      = useRef<HTMLDivElement>(null);

  // Pulse once after 3 s to draw attention
  useEffect(() => {
    const t = setTimeout(() => setPulsed(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Close on outside click / touch
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [open]);

  // Lock body scroll when open (prevents page scroll-through on mobile)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleItemClick = (item: MenuItem) => {
    if ('vibrate' in navigator) navigator.vibrate(8);
    setOpen(false);

    switch (item.action) {
      case 'navigate':
        router.push(item.payload);
        break;
      case 'call':
        window.location.href = item.payload;
        break;
      case 'whatsapp':
        window.open(item.payload, '_blank', 'noopener,noreferrer');
        break;
      case 'scroll': {
        const el = document.getElementById(item.payload);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (pathname !== '/') {
          router.push('/');
        }
        break;
      }
    }
  };

  const toggle = () => {
    if ('vibrate' in navigator) navigator.vibrate(open ? 6 : 12);
    setOpen(v => !v);
    setPulsed(true);
  };

  // Trigger button origin — center of the 52px button
  const ORIGIN_BOTTOM = 'calc(4rem + env(safe-area-inset-bottom, 0px) + 8px)';
  const ORIGIN_LEFT   = '16px';
  const BTN_HALF      = 26; // half of 52px

  return (
    <div ref={containerRef} className="lg:hidden">

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            className="fixed inset-0"
            style={{ zIndex: 980, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.38)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Fan items ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && MENU_ITEMS.map((item, i) => {
          const pos        = fanPos(ANGLES_DEG[i]);
          const Icon       = item.icon;
          const labelRight = ANGLES_DEG[i] >= 45;

          return (
            <motion.button
              key={item.label}
              onClick={() => handleItemClick(item)}
              aria-label={item.label}
              style={{
                position:       'fixed',
                bottom:         ORIGIN_BOTTOM,
                left:           ORIGIN_LEFT,
                width:          50,
                height:         50,
                borderRadius:   '50%',
                background:     item.bg,
                boxShadow:      `0 4px 18px ${item.ring}, 0 1px 6px rgba(0,0,0,0.10)`,
                border:         `1.5px solid rgba(255,255,255,0.9)`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                zIndex:         990,
                cursor:         'pointer',
                padding:        0,
                outline:        'none',
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x:       pos.x,
                y:       pos.y,
                scale:   1,
                opacity: 1,
              }}
              exit={{
                x:       0,
                y:       0,
                scale:   0,
                opacity: 0,
                transition: {
                  delay:    (MENU_ITEMS.length - 1 - i) * 0.025,
                  duration: 0.18,
                  ease:     'easeIn',
                },
              }}
              transition={{
                delay:     i * 0.05,
                type:      'spring',
                stiffness: 420,
                damping:   30,
                mass:      0.9,
              }}
              whileTap={{ scale: 0.82 }}
            >
              <Icon style={{ width: 20, height: 20, color: item.color, flexShrink: 0 }} />

              {/* Label pill */}
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.12, duration: 0.15 }}
                style={{
                  position:        'absolute',
                  whiteSpace:      'nowrap',
                  pointerEvents:   'none',
                  ...(labelRight
                    ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
                    : { bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' }
                  ),
                }}
              >
                <span style={{
                  display:       'block',
                  background:    'rgba(17,24,39,0.92)',
                  backdropFilter:'blur(8px)',
                  color:         'white',
                  fontSize:      10,
                  fontWeight:    700,
                  lineHeight:    1.2,
                  padding:       '4px 9px',
                  borderRadius:  20,
                  boxShadow:     '0 2px 10px rgba(0,0,0,0.2)',
                  letterSpacing: '0.02em',
                }}>
                  {item.label}
                </span>
              </motion.span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* ── Main trigger button ────────────────────────────────────────────── */}

      {/* Pulse ring (attention pulse when closed) */}
      {!open && (
        <motion.span
          key={pulsed ? 'pulsed' : 'not-pulsed'}
          animate={pulsed ? pulseVariants.pulse : pulseVariants.idle}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          onAnimationComplete={() => setPulsed(false)}
          style={{
            position:     'fixed',
            bottom:       ORIGIN_BOTTOM,
            left:         ORIGIN_LEFT,
            width:        52,
            height:       52,
            borderRadius: '50%',
            background:   'rgba(11,93,59,0.45)',
            zIndex:       998,
            pointerEvents:'none',
          }}
        />
      )}

      <motion.button
        onClick={toggle}
        aria-label={open ? 'Close quick menu' : 'Open quick menu'}
        aria-expanded={open}
        style={{
          position:     'fixed',
          bottom:       ORIGIN_BOTTOM,
          left:         ORIGIN_LEFT,
          width:        52,
          height:       52,
          borderRadius: '50%',
          background:   open
            ? 'linear-gradient(135deg,#374151,#1f2937)'
            : 'linear-gradient(145deg,#0D7A4E,#0B5D3B,#094d30)',
          boxShadow:    open
            ? '0 4px 16px rgba(0,0,0,0.30)'
            : '0 6px 22px rgba(11,93,59,0.50), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          zIndex:       1000,
          border:       'none',
          cursor:       'pointer',
          padding:      0,
          outline:      'none',
          transition:   'background 0.25s ease, box-shadow 0.25s ease',
        }}
        whileTap={{ scale: 0.86 }}
        animate={{ rotate: open ? 135 : 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1,   rotate: 0 }}
              exit={{    opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <X style={{ width: 22, height: 22, color: 'white' }} />
            </motion.span>
          ) : (
            <motion.span
              key="kg"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
            >
              {/* KG monogram */}
              <span style={{
                fontSize:      13,
                fontWeight:    900,
                color:         'white',
                lineHeight:    1,
                letterSpacing: '0.05em',
                fontFamily:    'inherit',
                textShadow:    '0 1px 3px rgba(0,0,0,0.25)',
              }}>
                KG
              </span>
              {/* Decorative underline */}
              <span style={{
                width:        20,
                height:       1.5,
                borderRadius: 4,
                background:   'rgba(255,255,255,0.45)',
                display:      'block',
              }} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
