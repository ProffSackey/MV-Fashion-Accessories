import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseClient';

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('sender_email, recipient_email, body, subject, is_read, created_at')
      .or(`recipient_email.eq.admin@boanipa.com,sender_email.eq.admin@boanipa.com`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching message threads:', error);
      return NextResponse.json([], { status: 200 });
    }

    const map = new Map<string, any>();

    for (const m of data || []) {
      // Get the "other" person in the conversation
      const otherEmail = m.sender_email === 'admin@boanipa.com' ? m.recipient_email : m.sender_email;
      
      if (!map.has(otherEmail)) {
        const namePart = otherEmail.split('@')[0] || otherEmail;
        const initials = namePart
          .split(/[._-]/)
          .map((s: string) => (s && s[0] ? s[0].toUpperCase() : ''))
          .join('')
          .slice(0, 2);

        map.set(otherEmail, {
          id: otherEmail,
          name: namePart,
          email: otherEmail,
          lastMessage: (m.body || m.subject || '').slice(0, 160),
          time: m.created_at,
          unread: 0,
          online: false,
          avatar: initials || otherEmail.slice(0, 2).toUpperCase(),
          resolved: false,
        });
      }

      const thread = map.get(otherEmail);
      // Count unread messages where admin is the recipient
      if (m.is_read === false && m.recipient_email === 'admin@boanipa.com') {
        thread.unread = (thread.unread || 0) + 1;
      }
    }

    const threads = Array.from(map.values());

    // Attempt to resolve full customer names from the customers table
    try {
      const emails = threads.map((t: any) => t.email).filter(Boolean);
      if (emails.length > 0) {
        const { data: customers } = await supabaseAdmin
          .from('customers')
          .select('email, name')
          .in('email', emails);

        if (customers && Array.isArray(customers)) {
          const custMap = Object.fromEntries((customers as any[]).map(c => [c.email, c]));
          for (const t of threads) {
            const c = custMap[t.email];
            if (c && c.name) {
              t.name = c.name;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not resolve customer names for message threads', e);
    }

    return NextResponse.json(threads);
  } catch (err) {
    console.error('Failed to load threads:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
