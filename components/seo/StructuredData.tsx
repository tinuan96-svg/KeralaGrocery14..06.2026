interface StructuredDataProps {
  data: Record<string, unknown>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organisation schema — output in root layout <head> */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://keralagrocery.com/#organization',
    name: 'Kerala Groceries UK',
    legalName: 'Tasty Kerala Ltd',
    alternateName: ['KG', 'Kerala Grocery UK'],
    url: 'https://keralagrocery.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://keralagrocery.com/logo_KG_Trans.png',
      width: 800,
      height: 800,
    },
    description:
      'Authentic Kerala and Indian groceries delivered across the United Kingdom. Operated by Tasty Kerala Ltd.',
    email: 'admin@keralagrocery.com',
    telephone: '+447769867549',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '21 Weald Bridge Nursery',
      addressRegion: 'Essex',
      postalCode: 'CM16 6AX',
      addressCountry: 'GB',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    sameAs: [],
  };

  return <StructuredData data={schema} />;
}

/** WebSite schema with Sitelinks Searchbox — output in root layout <head> */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://keralagrocery.com/#website',
    url: 'https://keralagrocery.com',
    name: 'Kerala Groceries UK',
    description:
      'Buy authentic Kerala and Indian groceries online for fast UK delivery. Spices, rice, snacks, pickles, and more.',
    publisher: {
      '@id': 'https://keralagrocery.com/#organization',
    },
    inLanguage: 'en-GB',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://keralagrocery.com/products?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <StructuredData data={schema} />;
}

/** GroceryStore / OnlineStore schema for homepage */
export function GroceryStoreSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['GroceryStore', 'OnlineStore'],
    '@id': 'https://keralagrocery.com/#store',
    name: 'Kerala Groceries UK',
    legalName: 'Tasty Kerala Ltd',
    url: 'https://keralagrocery.com',
    telephone: '+447769867549',
    email: 'admin@keralagrocery.com',
    description:
      'UK-based online grocery store specialising in authentic Kerala and South Indian products. Fast delivery across England, Scotland, and Wales.',
    image: 'https://keralagrocery.com/logo_KG_Trans.png',
    priceRange: '£',
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Credit Card, Debit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '21 Weald Bridge Nursery',
      addressRegion: 'Essex',
      postalCode: 'CM16 6AX',
      addressCountry: 'GB',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday', 'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
    ],
    hasMap: 'https://keralagrocery.com/contact',
    sameAs: [],
  };

  return <StructuredData data={schema} />;
}

/** MerchantReturnPolicy schema — referenced by ProductSchema Offer */
export function MerchantReturnPolicySchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MerchantReturnPolicy',
    '@id': 'https://keralagrocery.com/#returnpolicy',
    applicableCountry: 'GB',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
    refundType: 'https://schema.org/FullRefund',
  };
  return <StructuredData data={schema} />;
}

/** ShippingDeliveryTime / OfferShippingDetails for the store */
export function ShippingPolicySchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'OfferShippingDetails',
    '@id': 'https://keralagrocery.com/#shippingpolicy',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'GB',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: 1,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: 3,
        unitCode: 'DAY',
      },
    },
    shippingRate: {
      '@type': 'MonetaryAmount',
      currency: 'GBP',
      value: '0',
    },
    doesNotShip: false,
  };
  return <StructuredData data={schema} />;
}

/** Product schema — for product detail pages */
export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = 'GBP',
  availability = 'InStock',
  brand = 'Kerala Groceries UK',
  sku,
  url,
}: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: string;
  brand?: string;
  sku?: string;
  url?: string;
}) {
  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    offers: {
      '@type': 'Offer',
      url: url ?? 'https://keralagrocery.com/products',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      priceValidUntil,
      seller: {
        '@type': 'Organization',
        name: 'Tasty Kerala Ltd',
        url: 'https://keralagrocery.com',
      },
      hasMerchantReturnPolicy: {
        '@id': 'https://keralagrocery.com/#returnpolicy',
      },
      shippingDetails: {
        '@id': 'https://keralagrocery.com/#shippingpolicy',
      },
    },
  };

  if (sku) schema.sku = sku;

  return <StructuredData data={schema} />;
}

/** Breadcrumb schema — for category/product pages */
export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <StructuredData data={schema} />;
}

/** FAQ schema — for landing/SEO pages */
export function FAQSchema({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return <StructuredData data={schema} />;
}

/** LocalBusiness schema */
export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://keralagrocery.com/#localbusiness',
    name: 'Kerala Groceries UK',
    legalName: 'Tasty Kerala Ltd',
    description:
      'Buy authentic Kerala groceries in the UK. Fresh spices, snacks, rice, and traditional essentials delivered to your door.',
    url: 'https://keralagrocery.com',
    telephone: '+447769867549',
    email: 'admin@keralagrocery.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '21 Weald Bridge Nursery',
      addressRegion: 'Essex',
      postalCode: 'CM16 6AX',
      addressCountry: 'GB',
    },
    image: 'https://keralagrocery.com/logo_KG_Trans.png',
    priceRange: '£',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };

  return <StructuredData data={schema} />;
}
