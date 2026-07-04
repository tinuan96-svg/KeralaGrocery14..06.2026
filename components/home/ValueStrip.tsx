const STATS = [
  { value: '500+',    label: 'Products'         },
  { value: '4.9★',    label: 'Rating'           },
  { value: '1,000+',  label: 'Happy Customers'  },
  { value: 'UK-Wide', label: 'Delivery'         },
  { value: '24hr',    label: 'Dispatch'         },
  { value: '15%',     label: 'Max Cashback'     },
];

// Separator dot between stats
const Dot = () => (
  <span className="flex-shrink-0 w-1 h-1 rounded-full bg-gray-300 self-center" aria-hidden />
);

export default function ValueStrip() {
  return (
    <section className="hidden md:block bg-white border-b border-gray-100 py-2 overflow-hidden">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-4 max-w-7xl mx-auto">
        {STATS.map((stat, i) => (
          <span key={stat.label} className="flex items-center gap-3 flex-shrink-0">
            {i > 0 && <Dot />}
            <span className="flex items-center gap-1.5">
              <span className="text-[13px] font-extrabold text-[#0F6A38] leading-none">{stat.value}</span>
              <span className="text-[11px] text-gray-500 leading-none">{stat.label}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
