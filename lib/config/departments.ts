export interface SubcategoryLink {
  label: string;
  slug: string;
}

export interface DepartmentConfig {
  label: string;
  slug: string;
  emoji: string;
  description: string;
  categorySlugs: string[];
  subcategories: SubcategoryLink[];
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    label: 'Rice & Grains',
    slug: 'rice-grains',
    emoji: '🍚',
    description: 'Matta rice, basmati, flour & more',
    categorySlugs: ['rice-grains', 'rice-powders-flour'],
    subcategories: [
      { label: 'Matta Rice', slug: 'matta-rice' },
      { label: 'Basmati Rice', slug: 'basmati-rice' },
      { label: 'Other Rice', slug: 'other-rice' },
      { label: 'Rice Flour', slug: 'rice-flour' },
      { label: 'Puttu Podi', slug: 'puttu-podi' },
      { label: 'Appam / Idiyappam Flour', slug: 'appam-idiyappam-flour' },
      { label: 'Wheat & Flours', slug: 'wheat-flours' },
      { label: 'Rava & Grains', slug: 'rava-grains' },
    ],
  },
  {
    label: 'Spices & Masalas',
    slug: 'spices-masalas',
    emoji: '🌶️',
    description: 'Authentic Kerala spices & curry powders',
    categorySlugs: ['spices'],
    subcategories: [
      { label: 'Whole Spices', slug: 'whole-spices' },
      { label: 'Curry Powders', slug: 'curry-powders' },
      { label: 'Chicken Masala', slug: 'chicken-masala' },
      { label: 'Fish Masala', slug: 'fish-masala' },
      { label: 'Meat Masala', slug: 'meat-masala' },
      { label: 'Sambar & Rasam', slug: 'sambar-rasam' },
      { label: 'Chilli & Turmeric', slug: 'chilli-turmeric' },
      { label: 'Pepper', slug: 'pepper' },
      { label: 'Cardamom', slug: 'cardamom' },
      { label: 'Ginger & Garlic', slug: 'ginger-garlic' },
    ],
  },
  {
    label: 'Kerala Snacks',
    slug: 'kerala-snacks',
    emoji: '🍌',
    description: 'Banana chips, mixture, traditional snacks',
    categorySlugs: ['snacks-namkeens'],
    subcategories: [
      { label: 'Banana Chips', slug: 'banana-chips' },
      { label: 'Sharkara Varatti', slug: 'sharkara-varatti' },
      { label: 'Tapioca Chips', slug: 'tapioca-chips' },
      { label: 'Jackfruit Chips', slug: 'jackfruit-chips' },
      { label: 'Kerala Mixture', slug: 'kerala-mixture' },
      { label: 'Bombay Mixture', slug: 'bombay-mixture' },
      { label: 'Pakkavada', slug: 'pakkavada' },
      { label: 'Kuzhalappam', slug: 'kuzhalappam' },
      { label: 'Achappam', slug: 'achappam' },
      { label: 'Murukku', slug: 'murukku' },
      { label: 'Sweet Snacks', slug: 'sweet-snacks' },
    ],
  },
  {
    label: 'Frozen Foods',
    slug: 'frozen-foods',
    emoji: '❄️',
    description: 'Fish, meat, parotta, snacks & more',
    categorySlugs: ['frozen-foods'],
    subcategories: [
      { label: 'Frozen Fish', slug: 'frozen-fish' },
      { label: 'Frozen Meat', slug: 'frozen-meat' },
      { label: 'Frozen Vegetables', slug: 'frozen-vegetables' },
      { label: 'Frozen Parotta', slug: 'frozen-parotta' },
      { label: 'Frozen Appam', slug: 'frozen-appam' },
      { label: 'Frozen Snacks', slug: 'frozen-snacks' },
      { label: 'Ready-to-Cook', slug: 'ready-to-cook' },
    ],
  },
  {
    label: 'Oils & Coconut',
    slug: 'oils-coconut',
    emoji: '🥥',
    description: 'Coconut oil, ghee & cooking oils',
    categorySlugs: ['oils-ghee'],
    subcategories: [
      { label: 'Coconut Oil', slug: 'coconut-oil' },
      { label: 'Sesame Oil', slug: 'sesame-oil' },
      { label: 'Sunflower Oil', slug: 'sunflower-oil' },
      { label: 'Ghee', slug: 'ghee' },
      { label: 'Coconut Products', slug: 'coconut-products' },
    ],
  },
  {
    label: 'Pickles & Chutneys',
    slug: 'pickles-chutneys',
    emoji: '🥭',
    description: 'Mango, lime, fish pickles & more',
    categorySlugs: ['pickles-chutneys', 'condiments'],
    subcategories: [
      { label: 'Mango Pickle', slug: 'mango-pickle' },
      { label: 'Lime Pickle', slug: 'lime-pickle' },
      { label: 'Fish Pickle', slug: 'fish-pickle' },
      { label: 'Garlic Pickle', slug: 'garlic-pickle' },
      { label: 'Ginger Pickle', slug: 'ginger-pickle' },
      { label: 'Chutneys', slug: 'chutneys' },
      { label: 'Thokku', slug: 'thokku' },
      { label: 'Pappadam', slug: 'pappadam' },
    ],
  },
  {
    label: 'Pulses & Lentils',
    slug: 'pulses-lentils',
    emoji: '🫘',
    description: 'Toor dal, urad dal, chickpeas & more',
    categorySlugs: [],
    subcategories: [
      { label: 'Toor Dal', slug: 'toor-dal' },
      { label: 'Urad Dal', slug: 'urad-dal' },
      { label: 'Moong Dal', slug: 'moong-dal' },
      { label: 'Chana Dal', slug: 'chana-dal' },
      { label: 'Chickpeas', slug: 'chickpeas' },
      { label: 'Green Gram', slug: 'green-gram' },
      { label: 'Other Pulses', slug: 'other-pulses' },
    ],
  },
  {
    label: 'Breakfast & Ready-to-Cook',
    slug: 'breakfast-ready-to-cook',
    emoji: '🥞',
    description: 'Puttu, appam, dosa, instant mixes',
    categorySlugs: ['ready-to-eat'],
    subcategories: [
      { label: 'Puttu', slug: 'puttu' },
      { label: 'Appam', slug: 'appam' },
      { label: 'Idiyappam', slug: 'idiyappam' },
      { label: 'Dosa', slug: 'dosa' },
      { label: 'Idli', slug: 'idli' },
      { label: 'Instant Mixes', slug: 'instant-mixes' },
      { label: 'Ready-to-Cook Meals', slug: 'ready-to-cook-meals' },
    ],
  },
  {
    label: 'Tea, Coffee & Drinks',
    slug: 'tea-coffee-drinks',
    emoji: '☕',
    description: 'Tea, coffee, squash & instant drinks',
    categorySlugs: ['tea-coffee', 'beverages'],
    subcategories: [
      { label: 'Tea', slug: 'tea' },
      { label: 'Coffee', slug: 'coffee' },
      { label: 'Squash', slug: 'squash' },
      { label: 'Sharbat', slug: 'sharbat' },
      { label: 'Instant Drinks', slug: 'instant-drinks' },
    ],
  },
  {
    label: 'Sweets & Desserts',
    slug: 'sweets-desserts',
    emoji: '🍯',
    description: 'Halwa, payasam, jaggery & Indian sweets',
    categorySlugs: ['sweets', 'sugar'],
    subcategories: [
      { label: 'Halwa', slug: 'halwa' },
      { label: 'Payasam', slug: 'payasam' },
      { label: 'Jaggery', slug: 'jaggery' },
      { label: 'Indian Sweets', slug: 'indian-sweets' },
    ],
  },
  {
    label: 'Personal Care',
    slug: 'personal-care',
    emoji: '🧴',
    description: 'Hair oil, soap, shampoo & ayurvedic',
    categorySlugs: ['personal-care'],
    subcategories: [
      { label: 'Hair Oil', slug: 'hair-oil' },
      { label: 'Soap', slug: 'soap' },
      { label: 'Shampoo', slug: 'shampoo' },
      { label: 'Ayurvedic Products', slug: 'ayurvedic-products' },
      { label: 'Skincare', slug: 'skincare' },
    ],
  },
  {
    label: 'Household',
    slug: 'household',
    emoji: '🧹',
    description: 'Cleaning, kitchen & pooja essentials',
    categorySlugs: ['cleaning'],
    subcategories: [
      { label: 'Cleaning', slug: 'cleaning' },
      { label: 'Kitchen Essentials', slug: 'kitchen-essentials' },
      { label: 'Disposable Products', slug: 'disposable-products' },
      { label: 'Pooja Items', slug: 'pooja-items' },
      { label: 'Household Essentials', slug: 'household-essentials' },
    ],
  },
];

export interface ShopByNeedItem {
  title: string;
  emoji: string;
  description: string;
  searchTerms: string[];
}

export const SHOP_BY_NEED: ShopByNeedItem[] = [
  {
    title: 'Cook Kerala Food',
    emoji: '🍲',
    description: 'Rice, coconut oil, spices, curry powders, pickles',
    searchTerms: ['rice', 'coconut oil', 'curry powder', 'pickle', 'spice'],
  },
  {
    title: 'Kerala Breakfast',
    emoji: '🌅',
    description: 'Puttu, appam, idiyappam, dosa, coconut products',
    searchTerms: ['puttu', 'appam', 'idiyappam', 'dosa', 'idli'],
  },
  {
    title: 'Kerala Snacks',
    emoji: '🍌',
    description: 'Banana chips, sharkara varatti, mixture, pakkavada',
    searchTerms: ['banana chips', 'mixture', 'sharkara', 'pakkavada'],
  },
  {
    title: 'Fish Curry',
    emoji: '🐟',
    description: 'Fish curry masala, kudampuli, coconut oil, spices',
    searchTerms: ['fish masala', 'kudampuli', 'coconut oil', 'curry'],
  },
  {
    title: 'Kerala Sadhya',
    emoji: '🍽️',
    description: 'Matta rice, pappadam, pickles, coconut, payasam',
    searchTerms: ['matta rice', 'pappadam', 'pickle', 'payasam', 'coconut'],
  },
];
