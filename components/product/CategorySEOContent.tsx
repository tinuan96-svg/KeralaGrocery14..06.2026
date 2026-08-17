'use client';

import { motion } from 'framer-motion';
import { ChefHat, Info, CheckCircle2, Leaf } from 'lucide-react';

interface CategorySEOContentProps {
  category: string;
}

const SEO_DATA: Record<string, { title: string; description: string; benefits: string[] }> = {
  'Spices': {
    title: 'Authentic Kerala Spices & Masalas Online UK',
    description: 'Kerala is known as the "Land of Spices" for a reason. Our collection brings the rich, aromatic heritage of Malabar directly to your UK kitchen. From the heat of Kashmiri Chilli Powder to the earthy depth of Turmeric and the complex notes of roasted Garam Masala, we source only from trusted Kerala suppliers. Whether you are making a traditional Meen Curry or a slow-cooked Biriyani, our spices ensure that authentic "taste of home."',
    benefits: ['100% Pure & Unadulterated', 'Sourced from local Kerala farms', 'Preserved freshness in air-tight packaging']
  },
  'Rice': {
    title: 'Buy Palakkadan Matta Rice & Basmati Online',
    description: 'Matta Rice (also known as Rosematta or Palakkadan Matta) is the heart of every Kerala meal. Known for its distinct earthy flavor and high nutrient content, our Matta rice is parboiled to perfection. We also offer premium Basmati for those special occasions. All our rice varieties are aged and cleaned to ensure the perfect texture for your Kanji or full Kerala Sadhya.',
    benefits: ['Rich in fiber and minerals', 'Authentic Palakkad origin', 'Pesticide-free processing']
  },
  'Pickles': {
    title: 'Traditional Kerala Pickles (Achar) UK Delivery',
    description: 'No Kerala meal is complete without a side of tangy, spicy Achar. Our pickles are made using traditional recipes—preserved in authentic gingelly oil and seasoned with bird’s eye chilli (Kanthari) and asafoetida. From the classic Cut Mango and Lime to exotic options like Prawn or Garlic pickle, every jar is a burst of Malabar flavors.',
    benefits: ['Preserved in traditional oils', 'No artificial colors', 'Authentic Grandma-style recipes']
  },
  'Snacks': {
    title: 'Kerala Banana Chips & Traditional Tea-time Snacks',
    description: 'Experience the crunch of real coconut oil-fried snacks. Our Banana chips are made from premium "Nendran" bananas, sliced thin and fried to golden perfection. We also stock Murukku, Achappam, and Sharkara Varatti—the essential sweet ginger-jaggery snack for every festival.',
    benefits: ['Fried in 100% pure coconut oil', 'Freshly packed for maximum crunch', 'Traditional tea-time favorites']
  }
};

export default function CategorySEOContent({ category }: CategorySEOContentProps) {
  const content = SEO_DATA[category];

  if (!content) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 bg-white rounded-[2.5rem] border border-green-100 p-8 md:p-12 shadow-sm"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
            {content.title}
          </h2>
        </div>

        <div className="prose prose-green max-w-none">
          <p className="text-gray-600 text-lg leading-relaxed mb-8 italic border-l-4 border-green-100 pl-6">
            {content.description}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mt-10">
          {content.benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#f4faf6] p-4 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-bold text-green-900 leading-snug">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <ChefHat className="w-4 h-4 text-green-600" />
            Kerala Heritage Quality Verified
          </div>
          <div className="hidden sm:block">
             <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">Verified Kerala Source</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
