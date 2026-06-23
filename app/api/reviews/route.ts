import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id");
    const orderId = url.searchParams.get("order_id");
    const customerEmail = url.searchParams.get("customer_email");

    const supabase = getSupabaseAdmin(); // read access ok with anon but admin simplifies later updates
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Build base query
    const baseSelect = `*, customers!inner(email, name)`;

    // Helper to run query with a set of conditional filters. If a filter refers
    // to a column that doesn't exist in the schema cache (e.g. order_id),
    // try again without that filter so callers don't crash.
    const runQueryWithFilters = async (useOrderFilter: boolean) => {
      let q = supabase.from("reviews").select(baseSelect).order("created_at", { ascending: false });

      if (productId) q = q.eq("product_id", productId);
      if (useOrderFilter && orderId) q = q.eq("order_id", orderId);
      if (customerEmail) q = q.eq("customers.email", customerEmail);

      return await q;
    };

    // First attempt: include order filter if provided. If it fails due to a
    // missing 'order_id' column in the schema cache, retry without it.
    let data: any = null;
    let error: any = null;

    ({ data, error } = await runQueryWithFilters(true));
    if (error) {
      const msg = (error && (error.message || error.details || JSON.stringify(error))) || '';
      // Detect schema-cache missing column message from Supabase/PostgREST
      if (msg.includes("Could not find the 'order_id' column") || msg.includes('order_id')) {
        console.warn('order_id filter failed, retrying without order_id filter');
        ({ data, error } = await runQueryWithFilters(false));
      }
    }

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    // Transform the data to include customer_email and customer_name at the top level
    const transformedData = (data || []).map((review: any) => ({
      ...review,
      customer_email: review.customers?.email || null,
      customer_name: review.customers?.name || null,
    }));

    return NextResponse.json(transformedData);
  } catch (e) {
    console.error("Unexpected error in GET /api/reviews", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, rating, comment, title, customer_id, order_id } = body;

    if (!product_id || rating == null || !customer_id) {
      return NextResponse.json({ error: "Missing required fields: product_id, rating, and customer_id are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // insert new review data object
    const reviewData: any = {
      product_id,
      customer_id,
      rating,
      comment: comment || null,
      title: title || null,
    };

    // order_id may be a UUID or an order_number string like "ORD-...".
    // If it's not a UUID, try to resolve it to the order UUID via orders.order_number.
    const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    if (order_id) {
      if (typeof order_id === 'string' && !isUUID(order_id)) {
        try {
          const { data: orderMatch, error: orderErr } = await supabase.from('orders').select('id').eq('order_number', order_id).limit(1).maybeSingle();
          if (orderErr) {
            console.warn('Error looking up order_number for review order_id mapping:', orderErr);
          }
          if (orderMatch && (orderMatch as any).id) {
            reviewData.order_id = (orderMatch as any).id;
          } else {
            // couldn't resolve order_number -> UUID; don't set order_id to avoid UUID parse error
            console.warn('Could not resolve order_number to UUID for order_id:', order_id);
          }
        } catch (e) {
          console.warn('Exception resolving order_number:', e);
        }
      } else {
        reviewData.order_id = order_id;
      }
    }

    let newReview: any = null;
    let insertErr: any = null;

    ({ data: newReview, error: insertErr } = await supabase
      .from("reviews")
      .insert([reviewData])
      .select()
      .single());

    // If FK violation on customers happens, try a robust recovery flow:
    // 1) Check if a customer row exists for the given `customer_id`.
    // 2) If not, try to find a customer by email (from body or auth lookup).
    // 3) If still not found, create a new customer record (letting DB assign id),
    //    then set `reviewData.customer_id` to the found/created id and retry.
    if (insertErr && String(insertErr.message || '').includes('reviews_customer_id_fkey')) {
      console.warn('Review insert failed due to missing customer FK — attempting recovery flow');

      // Helper to attempt retrying insert after reviewData.customer_id is set/updated
      const tryRetryInsert = async () => {
        const { data: retried, error: retryErr } = await supabase
          .from('reviews')
          .insert([reviewData])
          .select()
          .single();
        return { retried, retryErr };
      };

      // 1) check by id
      try {
        if (customer_id) {
          const { data: existingById, error: byIdErr } = await supabase.from('customers').select('id').eq('id', customer_id).limit(1).maybeSingle();
          if (!byIdErr && existingById && (existingById as any).id) {
            console.log('Found existing customer by id, retrying review insert');
            ({ retried: newReview, retryErr: insertErr } = await tryRetryInsert() as any);
            if (!insertErr) {
              // success
            }
          }
        }
      } catch (e) {
        console.warn('Error checking existing customer by id:', e);
      }

      // If still failing, try by email (body.customer_email or fetch from auth admin)
      if (insertErr) {
        let emailToUse: string | null = (body as any)?.customer_email || null;
        try {
          if (!emailToUse && supabase && (supabase.auth as any) && (supabase.auth as any).admin && typeof (supabase.auth as any).admin.getUserById === 'function') {
            try {
              const { data: authUser, error: authErr } = await (supabase.auth as any).admin.getUserById(customer_id);
              if (!authErr && authUser && authUser.email) {
                emailToUse = authUser.email;
              }
            } catch (e) {
              console.warn('Error calling auth.admin.getUserById:', e);
            }
          }
        } catch (e) {
          console.warn('Error attempting to fetch auth user for customer email lookup:', e);
        }

        if (emailToUse) {
          try {
            const { data: existingByEmail, error: byEmailErr } = await supabase.from('customers').select('id').eq('email', emailToUse).limit(1).maybeSingle();
            if (!byEmailErr && existingByEmail && (existingByEmail as any).id) {
              reviewData.customer_id = (existingByEmail as any).id;
              console.log('Found existing customer by email, retrying review insert');
              ({ retried: newReview, retryErr: insertErr } = await tryRetryInsert() as any);
            } else {
              // create new customer using email/name
              const nameToUse = (body as any)?.customer_name || (emailToUse ? emailToUse.split('@')[0] : 'Customer');
              const { data: created, error: createErr } = await supabase.from('customers').insert([{ email: emailToUse, name: nameToUse }]).select().single();
              if (!createErr && created && (created as any).id) {
                reviewData.customer_id = (created as any).id;
                console.log('Created new customer record, retrying review insert');
                ({ retried: newReview, retryErr: insertErr } = await tryRetryInsert() as any);
              } else {
                console.warn('Failed to create customer record during recovery:', createErr || null);
              }
            }
          } catch (e) {
            console.warn('Error finding/creating customer by email:', e);
          }
        }
      }
    }

    if (insertErr) {
      console.error("Error inserting review:", insertErr);
      return NextResponse.json({ error: insertErr.message || String(insertErr) }, { status: 500 });
    }

    // recompute average rating for the product
    const { data: allRatings, error: fetchErr } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", product_id);

    if (!fetchErr && allRatings && allRatings.length > 0) {
      const sum = allRatings.reduce((acc: any, r: any) => acc + r.rating, 0);
      const avg = sum / allRatings.length;
      // store average on products table
      await supabase.from("products").update({ rating: avg }).eq("id", product_id);
    }

    return NextResponse.json(newReview);
  } catch (e) {
    console.error("Unexpected error in POST /api/reviews", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const reviewId = url.searchParams.get("id");

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["approved", "pending", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Valid status (approved, pending, rejected) is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: updatedReview, error: updateErr } = await supabase
      .from("reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewId)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating review status:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json(updatedReview);
  } catch (e) {
    console.error("Unexpected error in PATCH /api/reviews", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
