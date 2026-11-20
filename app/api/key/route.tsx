import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAdmin(request: Request) {
  const adminSecret = process.env.ADMIN_API_KEY;
  const providedSecret = request.headers.get('x-admin-key');

  if (!adminSecret || !providedSecret) return false;

  const a = Buffer.from(adminSecret);
  const b = Buffer.from(providedSecret);

  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, accessKey, daysValid, plan, id } = body;

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : '127.0.0.1';

    // ==========================================
    // 1. ADMIN ACTIONS (BUTUH x-admin-key)
    // ==========================================
    const adminActions = ['create', 'list', 'delete', 'reset-ip', 'extend'];
    if (adminActions.includes(action)) {
      if (!isAdmin(request)) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized. Admin key salah atau kosong.' },
          { status: 401 }
        );
      }

      // A. LIST ALL KEYS
      if (action === 'list') {
        const { data, error } = await supabaseAdmin
          .from('access_keys')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data });
      }

      // B. CREATE KEY
      if (action === 'create') {
        const selectedPlan = plan === 'paid' ? 'paid' : 'free';
        const duration = selectedPlan === 'free' ? 1 : Number(daysValid);

        if (!Number.isInteger(duration) || duration < 1 || duration > 3650) {
          return NextResponse.json(
            { success: false, message: 'Masa berlaku tidak valid (1 - 3650 hari).' },
            { status: 400 }
          );
        }

        const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
        const newKey = `AKM-${randomString}`;
        const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from('access_keys')
          .insert({
            key_code: newKey,
            ip_address: null,
            expires_at: expiresAt,
            plan: selectedPlan,
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Access key berhasil dibuat.',
          data,
        }, { status: 201 });
      }

      // C. RESET IP
      if (action === 'reset-ip') {
        if (!id) return NextResponse.json({ success: false, message: 'ID wajib diisi.' }, { status: 400 });

        const { error } = await supabaseAdmin
          .from('access_keys')
          .update({ ip_address: null })
          .eq('id', id);

        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'IP berhasil di-reset.' });
      }

      // D. EXTEND EXPIRED (+ HARI)
      if (action === 'extend') {
        if (!id || !daysValid) {
          return NextResponse.json({ success: false, message: 'ID dan jumlah hari wajib diisi.' }, { status: 400 });
        }

        const { data: current } = await supabaseAdmin
          .from('access_keys')
          .select('expires_at')
          .eq('id', id)
          .single();

        const baseTime = current?.expires_at && new Date(current.expires_at).getTime() > Date.now()
          ? new Date(current.expires_at).getTime()
          : Date.now();

        const newExpiresAt = new Date(baseTime + Number(daysValid) * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabaseAdmin
          .from('access_keys')
          .update({ expires_at: newExpiresAt })
          .eq('id', id);

        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: `Masa aktif ditambah ${daysValid} hari.` });
      }

      // E. DELETE KEY
      if (action === 'delete') {
        if (!id) return NextResponse.json({ success: false, message: 'ID wajib diisi.' }, { status: 400 });

        const { error } = await supabaseAdmin
          .from('access_keys')
          .delete()
          .eq('id', id);

        if (error) {
          return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'Access key berhasil dihapus.' });
      }
    }

    // ==========================================
    // 2. CLAIM FREE KEY (1x / 24 JAM PER IP)
    // ==========================================
    if (action === 'claim-free') {
      const { data: existingFree } = await supabaseAdmin
        .from('access_keys')
        .select('*')
        .eq('plan', 'free')
        .eq('ip_address', clientIp)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingFree) {
        return NextResponse.json({
          success: true,
          message: 'Kamu sudah memiliki free key yang masih aktif.',
          data: {
            key_code: existingFree.key_code,
            expires_at: existingFree.expires_at,
            ip_address: existingFree.ip_address,
            plan: existingFree.plan,
          },
        });
      }

      const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
      const newKey = `AKM-${randomString}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .insert({
          key_code: newKey,
          ip_address: clientIp,
          expires_at: expiresAt,
          plan: 'free',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Free access key berhasil dibuat!',
          data: {
            key_code: data.key_code,
            expires_at: data.expires_at,
            ip_address: data.ip_address,
            plan: data.plan,
          },
        },
        { status: 201 }
      );
    }

    // ==========================================
    // 3. PUBLIC ACTIONS (CHECK & VERIFY)
    // ==========================================
    if (!accessKey || typeof accessKey !== 'string') {
      return NextResponse.json({ valid: false, message: 'Access key wajib diisi.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .select('*')
      .eq('key_code', accessKey.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ valid: false, message: 'Access key tidak ditemukan.' }, { status: 404 });
    }

    const isExpired = data.expires_at
      ? new Date(data.expires_at).getTime() <= Date.now()
      : false;

    if (action === 'check') {
      return NextResponse.json({
        success: true,
        valid: !isExpired,
        message: isExpired ? 'Access key sudah kadaluarsa.' : 'Access key masih aktif!',
        data: {
          key_code: data.key_code,
          expires_at: data.expires_at,
          ip_address: data.ip_address,
          plan: data.plan,
        },
      });
    }

    if (isExpired) {
      return NextResponse.json({ valid: false, message: 'Access key sudah kadaluarsa.' }, { status: 403 });
    }

    if (!data.ip_address) {
      const { error: updateError } = await supabaseAdmin
        .from('access_keys')
        .update({ ip_address: clientIp })
        .eq('id', data.id);

      if (updateError) {
        return NextResponse.json({ valid: false, message: 'Gagal mengikat IP address.' }, { status: 500 });
      }
    } else if (data.ip_address !== clientIp) {
      return NextResponse.json({ valid: false, message: 'Access key terkunci untuk IP lain.' }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      message: 'Akses diterima!',
      data: {
        key_code: data.key_code,
        expires_at: data.expires_at,
        ip_address: data.ip_address || clientIp,
        plan: data.plan,
      },
    });
  } catch (err) {
    console.error('KEY API ERROR:', err);
    return NextResponse.json(
      { success: false, valid: false, message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// ==========================================
// 4. AKSES LEWAT LINK (GET /api/key?key=AKM-XXXX)
// ==========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessKey = searchParams.get('key');
    const action = searchParams.get('action') || 'verify';

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : '127.0.0.1';

    if (!accessKey) {
      return NextResponse.json(
        { valid: false, message: 'Parameter ?key= wajib diisi di URL.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .select('*')
      .eq('key_code', accessKey.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, message: 'Access key tidak ditemukan.' },
        { status: 404 }
      );
    }

    const isExpired = data.expires_at
      ? new Date(data.expires_at).getTime() <= Date.now()
      : false;

    if (action === 'check') {
      return NextResponse.json({
        success: true,
        valid: !isExpired,
        message: isExpired ? 'Access key sudah kadaluarsa.' : 'Access key masih aktif!',
        data: {
          key_code: data.key_code,
          expires_at: data.expires_at,
          ip_address: data.ip_address,
          plan: data.plan,
        },
      });
    }

    if (isExpired) {
      return NextResponse.json(
        { valid: false, message: 'Access key sudah kadaluarsa.' },
        { status: 403 }
      );
    }

    if (!data.ip_address) {
      const { error: updateError } = await supabaseAdmin
        .from('access_keys')
        .update({ ip_address: clientIp })
        .eq('id', data.id);

      if (updateError) {
        return NextResponse.json(
          { valid: false, message: 'Gagal mengikat IP address.' },
          { status: 500 }
        );
      }
    } else if (data.ip_address !== clientIp) {
      return NextResponse.json(
        { valid: false, message: 'Access key terkunci untuk IP lain.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Akses diterima!',
      data: {
        key_code: data.key_code,
        expires_at: data.expires_at,
        ip_address: data.ip_address || clientIp,
        plan: data.plan,
      },
    });
  } catch (err) {
    console.error('GET KEY API ERROR:', err);
    return NextResponse.json(
      { valid: false, message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}