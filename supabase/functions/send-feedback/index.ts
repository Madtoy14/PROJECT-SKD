import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const ADMIN_EMAIL = Deno.env.get('FEEDBACK_EMAIL') || 'skdquest@gmail.com';
const FROM_EMAIL = Deno.env.get('FEEDBACK_FROM_EMAIL') || 'onboarding@resend.dev';

interface FeedbackPayload {
  category: string;
  message: string;
  user_id?: string;
  email?: string;
  page_path?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: FeedbackPayload = await req.json();

    if (!body.message || !body.message.trim()) {
      return new Response(JSON.stringify({ error: 'Pesan wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const category = body.category || 'Lainnya';
    const userInfo = body.email
      ? `Email: ${body.email}${body.user_id ? ` (ID: ${body.user_id})` : ''}`
      : body.user_id
        ? `User ID: ${body.user_id}`
        : 'Anonymous';
    const pageInfo = body.page_path ? `\nHalaman: ${body.page_path}` : '';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `SKDQuest Feedback <${FROM_EMAIL}>`,
        to: ADMIN_EMAIL,
        subject: `[SKDQuest Feedback] ${category}`,
        text: [
          `Kategori: ${category}`,
          `${userInfo}${pageInfo}`,
          `---`,
          body.message.trim(),
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Gagal mengirim email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-feedback error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});