import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og
 * Dynamic OpenGraph social card image generator.
 * Query Parameters:
 * - title: Card headline
 * - subtitle: Card description or category
 * - badge: Callout pill (e.g. "Verified Brand", "Official Merchant")
 * - price: Formatted BDT price (e.g. "৳18,500")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'AlifWorld Bangladesh';
    const subtitle = searchParams.get('subtitle') || 'Fast, Localized E-Commerce with Multi-Wallet Rewards';
    const badge = searchParams.get('badge') || '100% Authentic BD';
    const price = searchParams.get('price');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0F172A',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header Brand */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#FF6A00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '28px',
                }}
              >
                A
              </div>
              <div style={{ color: 'white', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                AlifWorld
              </div>
            </div>

            {badge && (
              <div
                style={{
                  backgroundColor: '#FF6A00',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  fontSize: '16px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {badge}
              </div>
            )}
          </div>

          {/* Central Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: title.length > 40 ? '48px' : '64px',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-1px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>

            {subtitle && (
              <div
                style={{
                  fontSize: '24px',
                  color: '#94A3B8',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '2px solid #1E293B',
              paddingTop: '30px',
            }}
          >
            <div style={{ display: 'flex', gap: '30px', color: '#CBD5E1', fontSize: '18px', fontWeight: 600 }}>
              <div>🇧🇩 64 Districts Delivery</div>
              <div>🛡️ Safe Escrow</div>
              <div>★ Independent Rewards</div>
            </div>

            {price && (
              <div style={{ color: '#FCD34D', fontSize: '36px', fontWeight: 900 }}>
                {price}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err: any) {
    return new Response(`Failed to generate image: ${err.message}`, { status: 500 });
  }
}
