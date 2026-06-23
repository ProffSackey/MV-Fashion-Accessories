import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sb = cookieStore.get('sb-admin-token');
  const session = cookieStore.get('admin_session');
  if (sb) return sb.value;
  if (session) return session.value;
  return null;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file data
    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${file.name}`;
    const bucketName = 'product-images';

    console.log('Uploading file:', { fileName, fileSize: buffer.byteLength, fileType: file.type });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log('Upload successful:', { fileName, url: publicData.publicUrl });

    return NextResponse.json({
      url: publicData.publicUrl,
      fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
