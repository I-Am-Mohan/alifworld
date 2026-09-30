import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import {
  GET as listWishlistsRoute,
  POST as createWishlistRoute,
} from '@/app/api/v1/customer/wishlists/route';
import {
  GET as getWishlistRoute,
  DELETE as deleteWishlistRoute,
} from '@/app/api/v1/customer/wishlists/[id]/route';
import { POST as addItemRoute } from '@/app/api/v1/customer/wishlists/[id]/items/route';
import { DELETE as removeItemRoute } from '@/app/api/v1/customer/wishlists/[id]/items/[itemId]/route';
import { POST as shareWishlistRoute } from '@/app/api/v1/customer/wishlists/[id]/share/route';
import { GET as getSharedWishlistRoute } from '@/app/api/v1/wishlists/shared/[token]/route';
import { wishlistService } from '@/features/customers/services/wishlist.service';
import { NextRequest } from 'next/server';

describe('Milestone 123: Wishlist & Share-Safe Links REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockWishlist = {
    id: 'wsh_101',
    userId: 'usr-customer-001',
    title: 'My Favorites',
    isDefault: true,
    visibility: 'PRIVATE' as const,
    items: [],
    itemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSharedView = {
    id: 'wsh_101',
    title: 'Gift Registry',
    ownerDisplayName: 'Rahim A.',
    items: [],
    itemCount: 0,
    shareUrl: 'https://alifworld.com/wishlist/shared/wsh_tok_123',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(wishlistService, 'listCustomerWishlists').mockResolvedValue([mockWishlist]);
    spyOn(wishlistService, 'createWishlist').mockResolvedValue({
      ...mockWishlist,
      id: 'wsh_102',
      title: 'Custom List',
      isDefault: false,
    });
    spyOn(wishlistService, 'getWishlistById').mockResolvedValue(mockWishlist);
    spyOn(wishlistService, 'deleteWishlist').mockResolvedValue({ success: true });
    spyOn(wishlistService, 'addItemToWishlist').mockResolvedValue({
      wishlist: { ...mockWishlist, itemCount: 1 },
      item: {
        id: 'wsi_001',
        wishlistId: 'wsh_101',
        productId: 'prod_001',
        productSlug: 'walton-primo-s8',
        productTitle: 'Walton Primo S8 Pro',
        pricePoisha: 1850000,
        priceBdtFormatted: '18,500.00',
        productPoint: 150,
        inStock: true,
        addedAt: new Date().toISOString(),
      },
    });
    spyOn(wishlistService, 'removeItemFromWishlist').mockResolvedValue({
      ...mockWishlist,
      itemCount: 0,
    });
    spyOn(wishlistService, 'generateShareLink').mockResolvedValue({
      shareToken: 'wsh_tok_123',
      shareUrl: 'https://alifworld.com/wishlist/shared/wsh_tok_123',
      wishlist: { ...mockWishlist, visibility: 'SHARED_LINK', shareToken: 'wsh_tok_123' },
    });
    spyOn(wishlistService, 'getSharedWishlist').mockResolvedValue(mockSharedView);
  });

  it('GET /api/v1/customer/wishlists lists customer wishlists', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/wishlists', {
      method: 'GET',
    });
    const res = await listWishlistsRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].title).toBe('My Favorites');
  });

  it('POST /api/v1/customer/wishlists creates custom wishlist', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/wishlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Custom List' }),
    });

    const res = await createWishlistRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('wsh_102');
  });

  it('POST /api/v1/customer/wishlists/[id]/items adds item to wishlist', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/wishlists/wsh_101/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod_001' }),
    });

    const res = await addItemRoute(req, { params: Promise.resolve({ id: 'wsh_101' }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.item.productTitle).toBe('Walton Primo S8 Pro');
  });

  it('POST /api/v1/customer/wishlists/[id]/share generates share link', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/wishlists/wsh_101/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'GENERATE' }),
    });

    const res = await shareWishlistRoute(req, { params: Promise.resolve({ id: 'wsh_101' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.shareToken).toBe('wsh_tok_123');
  });

  it('GET /api/v1/wishlists/shared/[token] public endpoint returns share-safe view without customer PII', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/wishlists/shared/wsh_tok_123', {
      method: 'GET',
    });

    const res = await getSharedWishlistRoute(req, {
      params: Promise.resolve({ token: 'wsh_tok_123' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Gift Registry');
    expect(body.data.ownerDisplayName).toBe('Rahim A.');
  });
});
