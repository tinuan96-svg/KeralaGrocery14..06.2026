declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const analytics = {
  pageView: (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      });
    }
  },

  event: ({
    action,
    category,
    label,
    value,
  }: {
    action: string;
    category: string;
    label?: string;
    value?: number;
  }) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  },

  trackAddToCart: (productId: string, productName: string, price: number) => {
    analytics.event({
      action: 'add_to_cart',
      category: 'ecommerce',
      label: productName,
      value: price,
    });
  },

  trackRemoveFromCart: (productId: string, productName: string) => {
    analytics.event({
      action: 'remove_from_cart',
      category: 'ecommerce',
      label: productName,
    });
  },

  trackPurchase: (orderId: string, total: number, items: any[]) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: total,
        currency: 'GBP',
        items: items,
      });
    }
  },

  trackBeginCheckout: (total: number) => {
    analytics.event({
      action: 'begin_checkout',
      category: 'ecommerce',
      value: total,
    });
  },

  trackSearch: (searchTerm: string) => {
    analytics.event({
      action: 'search',
      category: 'engagement',
      label: searchTerm,
    });
  },

  trackNewsletterSignup: (email: string) => {
    analytics.event({
      action: 'newsletter_signup',
      category: 'engagement',
      label: 'Email capture',
    });
  },

  trackProductView: (productId: string, productName: string, price: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item', {
        items: [
          {
            item_id: productId,
            item_name: productName,
            price: price,
            currency: 'GBP',
          },
        ],
      });
    }
  },

  trackAddToWishlist: (productId: string, productName: string) => {
    analytics.event({
      action: 'add_to_wishlist',
      category: 'ecommerce',
      label: productName,
    });
  },
};

export function initGoogleAnalytics(measurementId: string) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: any[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
      page_path: window.location.pathname,
    });
  }
}
