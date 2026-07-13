import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: product } = await supabase
    .from('products')
    .select('name, price, image_url, image_main, brand')
    .eq('slug', slug)
    .single();

  if (!product) {
    return new Response('Product not found', { status: 404 });
  }

  const name = product.name;
  const price = `£${Number(product.price).toFixed(2)}`;
  const image = product.image_main || product.image_url || 'https://keralagrocery.com/placeholder.webp';
  const brand = product.brand || 'Kerala Grocery UK';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f4faf6',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '40px',
            padding: '40px',
            boxShadow: '0 20px 50px rgba(11, 93, 59, 0.1)',
            border: '2px solid #d1ead9',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <img
                src="https://keralagrocery.com/logo_KG_Trans.png"
                width="60"
                height="60"
                style={{ marginRight: '15px' }}
              />
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0B5D3B', letterSpacing: '-1px' }}>
                Kerala Grocery UK
              </span>
            </div>

            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#6FDB2F', textTransform: 'uppercase', marginBottom: '10px' }}>
              {brand}
            </span>

            <h1 style={{ fontSize: '48px', fontWeight: 'black', color: '#1a1a1a', marginBottom: '20px', lineHeight: '1.1' }}>
              {name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '56px', fontWeight: '900', color: '#0B5D3B' }}>
                {price}
              </span>
              <div
                style={{
                  marginLeft: '20px',
                  backgroundColor: '#0B5D3B',
                  color: 'white',
                  padding: '10px 25px',
                  borderRadius: '20px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                Shop Now
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexShrink: 0 }}>
            <img
              src={image}
              width="400"
              height="400"
              style={{
                objectFit: 'contain',
                borderRadius: '30px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: '30px', color: '#0B5D3B', fontSize: '18px', fontWeight: 'bold' }}>
          Free Next Day UK Delivery on orders over £45
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
