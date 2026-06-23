import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '../../../lib/supabaseClient';

async function fetchCategories() {
  const { data, error } = await supabaseServer
    .from('categories')
    .select('name');
  if (error) throw error;
  return (data ?? []).map((row: any) => row.name as string);
}

async function insertCategory(name: string) {
  const db = supabaseAdmin || supabaseServer;
  const { data, error } = await db.from('categories').insert({ name }).select();
  if (error) {
    console.error('insertCategory error:', error);
    throw error;
  }
  return data;
}

async function updateCategory(oldName: string, newName: string) {
  const db = supabaseAdmin || supabaseServer;
  const { data, error } = await db
    .from('categories')
    .update({ name: newName })
    .eq('name', oldName)
    .select();
  if (error) {
    console.error('updateCategory error:', error);
    throw error;
  }
  return data;
}

async function deleteCategory(name: string) {
  const db = supabaseAdmin || supabaseServer;
  const { data, error } = await db.from('categories').delete().eq('name', name).select();
  if (error) {
    console.error('deleteCategory error:', error);
    throw error;
  }
  return data;
}

export async function GET() {
  try {
    const categories = await fetchCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('GET /api/categories failed:', err);
    // return a JSON error message so the client doesn't try to parse an empty body
    return NextResponse.json({ error: 'could not fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    const created = await insertCategory(name);
    // return updated list (created may be array)
    const categories = await fetchCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('POST /api/categories error:', err);
    // if Supabase returned an error with status, include it
    return NextResponse.json({ error: (err as any).message || 'failed to create category' }, { status: 500 });
  }
}

// simple PATCH for rename, DELETE for remove by name
export async function PATCH(request: Request) {
  try {
    const { oldName, newName } = await request.json();
    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Both old and new names required' }, { status: 400 });
    }
    await updateCategory(oldName, newName);
    const categories = await fetchCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('PATCH /api/categories error:', err);
    return NextResponse.json({ error: (err as any).message || 'failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    await deleteCategory(name);
    const categories = await fetchCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('DELETE /api/categories error:', err);
    return NextResponse.json({ error: (err as any).message || 'failed to delete category' }, { status: 500 });
  }
}