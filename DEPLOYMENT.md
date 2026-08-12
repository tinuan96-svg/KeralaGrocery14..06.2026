# Kerala Groceries UK - Bolt Deployment

## Overview

This Next.js e-commerce application is configured for Bolt hosting with Supabase as the database.

## Current Configuration

### Environment Variables (Already Configured)

All required environment variables are set in `.env`:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key
- `NEXT_PUBLIC_BASE_URL` - Site URL (keralagrocery.com)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key

### Database Status

Your Supabase database is fully configured with:
- 163 active products
- 10 categories
- 6 brands
- Complete RLS security policies
- Order management system
- User authentication and profiles
- Shopping cart and wishlist
- Payment processing via Stripe

## Bolt Hosting

The application is ready to run on Bolt. The dev server starts automatically.

### Key Features

1. **Product Catalog** - Browse Kerala groceries by category and brand
2. **User Authentication** - Secure login/signup with Supabase Auth
3. **Shopping Cart** - Persistent cart with optimistic updates
4. **Wishlist** - Save favorite products
5. **Checkout** - Stripe payment integration
6. **Order Tracking** - View order history
7. **SEO Optimized** - Meta tags, structured data, sitemaps
8. **Mobile Responsive** - Works on all devices

### Pages

- `/` - Homepage with featured products
- `/products` - Product listing page
- `/products/[slug]` - Product detail pages
- `/categories` - Browse by category
- `/brands` - Browse by brand
- `/cart` - Shopping cart
- `/checkout` - Checkout process
- `/orders` - Order history
- `/account` - User profile
- `/health` - System health check

### Admin Features

- `/admin` - Admin dashboard (requires admin role in Supabase)

## Troubleshooting

### Health Check

Visit `/health` to verify all environment variables are configured correctly.

### Common Issues

1. **Blank page** - Check `/health` to ensure environment variables are set
2. **No products showing** - Verify Supabase connection in browser console
3. **Payment errors** - Check Stripe keys are configured correctly

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
