import { Phone } from 'lucide-react';

export default function SupportBar() {
  return (
    <div className="md:hidden bg-[#0a3d22] border-b border-green-900/40">
      <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-center">
        <a
          href="tel:+447769867549"
          className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors active:text-white"
          aria-label="Call customer care"
        >
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span className="text-[11px] font-semibold">
            Customer Care:{' '}
            <span className="text-white font-bold">07769 867 549</span>
          </span>
        </a>
      </div>
    </div>
  );
}
