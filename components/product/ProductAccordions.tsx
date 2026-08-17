'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, Leaf, Thermometer, Info } from 'lucide-react';
import SafeHtml from '@/components/ui/SafeHtml';

interface AccordionSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface ProductAccordionsProps {
  description?: string | null;
  ingredients?: string | null;
  storage?: string | null;
  additionalInfo?: string | null;
  categoryName?: string;
}

function AccordionItem({
  section,
  isOpen,
  onToggle,
}: {
  section: AccordionSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F8F6F2] flex items-center justify-center text-[#0B5D3B] flex-shrink-0">
            {section.icon}
          </div>
          <span className="font-semibold text-gray-900 text-sm">{section.label}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-2"
        >
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-11 text-gray-600 text-sm leading-relaxed">
              {section.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductAccordions({
  description,
  ingredients,
  storage,
  additionalInfo,
  categoryName,
}: ProductAccordionsProps) {
  const [openId, setOpenId] = useState<string | null>('description');

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  const defaultStorage = `Store in a cool, dry place away from direct sunlight.
Once opened, transfer to an airtight container.
Keep away from strong odours.`;

  const defaultIngredients = categoryName
    ? `100% natural ${categoryName.toLowerCase()} product. No artificial additives or preservatives.`
    : '100% natural product. No artificial additives or preservatives.';

  const sections: AccordionSection[] = [
    {
      id: 'description',
      label: 'Product Description',
      icon: <FileText className="w-4 h-4" />,
      content: (
        <SafeHtml
          html={description}
          fallback="Authentic Kerala grocery product. Sourced directly from trusted farmers and producers in Kerala, India. Every product is carefully selected to bring you the finest quality."
        />
      ),
    },
    {
      id: 'ingredients',
      label: 'Ingredients',
      icon: <Leaf className="w-4 h-4" />,
      content: (
        <SafeHtml html={ingredients} fallback={defaultIngredients} />
      ),
    },
    {
      id: 'storage',
      label: 'Storage Instructions',
      icon: <Thermometer className="w-4 h-4" />,
      content: (
        <SafeHtml html={storage} fallback={defaultStorage} />
      ),
    },
    ...(additionalInfo
      ? [
          {
            id: 'info',
            label: 'Additional Information',
            icon: <Info className="w-4 h-4" />,
            content: <SafeHtml html={additionalInfo} />,
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 divide-y-0">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          section={section}
          isOpen={openId === section.id}
          onToggle={() => toggle(section.id)}
        />
      ))}
    </div>
  );
}
