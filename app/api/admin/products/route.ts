import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';
import { formatCurrency, parseCurrency } from '../../../../lib/currency';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sb = cookieStore.get('sb-admin-token');
  const session = cookieStore.get('admin_session');
  if (sb) return sb.value;
  if (session) return session.value;
  return null;
}

export async function GET(req: NextRequest) {
  // GET is public (for customers to browse products)
  // Only POST/PATCH/DELETE require admin auth

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Check if filtering by ID
  const id = req.nextUrl.searchParams.get('id');
  let query = supabase.from('products').select('*');
  
  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error('GET /api/admin/products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Log raw data for debugging
  console.log('GET /api/admin/products raw data:', JSON.stringify(data, null, 2));
  
  // Ensure prices are formatted correctly and quantity present
  const formattedData = (data || []).map((product: any) => {
    console.log(`Formatting price for product "${product.name}":`, { rawPrice: product.price, type: typeof product.price });
    
    // Handle null/undefined
    if (product.price === null || product.price === undefined) {
      product.price = formatCurrency(0);
      console.log(`Product "${product.name}": price was null, set to ${formatCurrency(0)}`);
      // also ensure stock_quantity
      if (product.stock_quantity == null) product.stock_quantity = 0;
      return product;
    }
    
    // If already formatted with GHS, return as-is
    if (typeof product.price === 'string' && product.price.toUpperCase().includes('GHS')) {
      console.log(`Product "${product.name}": price already formatted - ${product.price}`);
      if (product.stock_quantity == null) product.stock_quantity = 0;
      return product;
    }
    
    // Convert to number and format
    let priceNum: number;
    if (typeof product.price === 'string') {
      priceNum = parseCurrency(product.price);
    } else if (typeof product.price === 'number') {
      priceNum = product.price;
    } else {
      // Fallback for any other type
      priceNum = 0;
    }
    
    // If parsing failed, default to 0
    if (isNaN(priceNum)) {
      product.price = formatCurrency(0);
      console.log(`Product "${product.name}": parsing failed, set to ${formatCurrency(0)}`);
    } else {
      product.price = formatCurrency(priceNum);
      console.log(`Product "${product.name}": formatted to ${product.price}`);
    }
    if (product.stock_quantity == null) product.stock_quantity = 0;
    return product;
  });
  
  console.log('GET /api/admin/products formatted data:', JSON.stringify(formattedData, null, 2));
  return NextResponse.json(formattedData);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  console.log('ADMIN /api/admin/products POST body:', body);
  const cookieStore = await cookies();
  console.log('ADMIN cookies:', {
    sb_admin_token: cookieStore.get('sb-admin-token')?.value,
    admin_session: cookieStore.get('admin_session')?.value,
  });
  const { name, image, about, category, status, price, stock_quantity } = body || {};
  if (!name || price === undefined) {
    return NextResponse.json({ error: 'Missing fields (name, price required)' }, { status: 400 });
  }

  // Format price: convert raw number/string to "GHS X.XX" format
  const priceWithCurrency = formatCurrency(parseCurrency(price));

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Map form fields to schema: image → image_url (first image or string), images (array if provided)
  // Filter out blob: URLs as they can't be persisted
  let imageUrl: string | null = null;
  let images: string[] | null = null;
  if (Array.isArray(image)) {
    const validUrls = image.filter((url: string) => !url.startsWith('blob:'));
    imageUrl = validUrls[0] || null;
    images = validUrls.length > 0 ? validUrls : null;
  } else if (typeof image === 'string' && !image.startsWith('blob:')) {
    imageUrl = image;
  }

  const productData: any = {
    name,
    about,
    category: category || null,
    status: status || 'active',
    price: priceWithCurrency,
  };
  if (typeof stock_quantity !== 'undefined') {
    const qty = parseInt(stock_quantity, 10);
    productData.stock_quantity = isNaN(qty) ? 0 : qty;
  }
  if (imageUrl) productData.image_url = imageUrl;
  if (images) productData.images = images;

  console.log('ADMIN inserting product:', productData);
  const { data, error } = await supabase.from('products').insert([productData]).select().single();
  if (error) {
    console.error('POST /api/admin/products insert error:', error);
    return NextResponse.json({ error: error.message || 'insert failed' }, { status: 500 });
  }

  console.log('ADMIN product inserted:', data);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (id === undefined) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('DELETE /api/admin/products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  console.log('PATCH /api/admin/products body:', { id, updates });

  // Map form fields to schema and filter out blob URLs
  const sanitizedUpdates: any = {};
  
  if (updates.name) sanitizedUpdates.name = updates.name;
  if (updates.about !== undefined) sanitizedUpdates.about = updates.about;
  if (updates.category) sanitizedUpdates.category = updates.category;
  if (updates.status) sanitizedUpdates.status = updates.status;
  
  // Format price if it's being updated
  if (updates.price !== undefined) {
    sanitizedUpdates.price = formatCurrency(parseCurrency(updates.price));
  }
  
  // Quantity
  if (updates.stock_quantity !== undefined) {
    const q = parseInt(updates.stock_quantity, 10);
    sanitizedUpdates.stock_quantity = isNaN(q) ? 0 : q;
  }

  // Handle images - only if URLs don't contain blob:
  if (updates.image && Array.isArray(updates.image)) {
    const validUrls = updates.image.filter((url: string) => !url.startsWith('blob:'));
    if (validUrls.length > 0) {
      sanitizedUpdates.image_url = validUrls[0];
      sanitizedUpdates.images = validUrls;
    }
  }

  console.log('PATCH /api/admin/products sanitizedUpdates:', sanitizedUpdates);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await supabase.from('products').update(sanitizedUpdates).eq('id', id).select();
  if (error) {
    console.error('PATCH /api/admin/products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('PATCH /api/admin/products success:', data);
  return NextResponse.json({ product: data?.[0] });
}
