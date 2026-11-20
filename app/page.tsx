'use client';

import { useState } from 'react';
import Link from 'next/link';

interface KeyResult {
  valid: boolean;
  message?: string;
  key_code?: string;
  expires_at?: string | null;
  ip_address?: string | null;
}

function formatRemainingTime(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'Tidak diketahui';

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Sudah kadaluarsa';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days > 0) {
    return remainingHours > 0
      ? `${days} hari ${remainingHours} jam lagi`
      : `${days} hari lagi`;
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0
      ? `${totalHours} jam ${remainingMinutes} menit lagi`
      : `${totalHours} jam lagi`;
  }

  return `${Math.max(1, totalMinutes)} menit lagi`;
}

function maskIpAddress(ip: string | null | undefined): string {
  if (!ip) return 'Belum terikat';

  // Untuk IPv4 (contoh: 103.120.45.12 -> 103.120.xxx.xxx)
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }

  // Untuk IPv6 (contoh: 2001:4860:4860::8888 -> 2001:4860:xxxx:xxxx)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
    }
  }

  return 'Terikat (Disensor)';
}

export default function Home() {
  const [checkKey, setCheckKey] = useState('');
  const [keyResult, setKeyResult] = useState<KeyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!checkKey.trim()) {
      alert('Masukkan key terlebih dahulu!');
      return;
    }

    setLoading(true);
    setKeyResult(null);

    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          accessKey: checkKey.trim().toUpperCase(),
        }),
      });

      const result = await res.json();

      setKeyResult({
        valid: result.valid === true,
        message: result.message || result.error,
        key_code: result.data?.key_code || checkKey.trim().toUpperCase(),
        expires_at: result.data?.expires_at ?? null,
        ip_address: result.data?.ip_address ?? null,
      });
    } catch {
      setKeyResult({
        valid: false,
        message: 'Terjadi kesalahan server.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black">
      {/* MAIN CONTENT (CENTERED) */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* HERO TEXT */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Access Key Verification
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Masukkan kode lisensi untuk memverifikasi status aktif, masa berlaku, dan alamat IP perangkat.
            </p>
          </div>

          {/* CHECK CARD */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-5 shadow-2xl">
            <form onSubmit={handleCheckKey} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Access Key
                </label>
                <input
                  type="text"
                  value={checkKey}
                  onChange={(e) => setCheckKey(e.target.value)}
                  placeholder="AKM-XXXXXXXX"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !checkKey.trim()}
                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3.5 px-4 rounded-xl transition disabled:opacity-40 cursor-pointer"
              >
                {loading ? 'Memeriksa...' : 'Check Key'}
              </button>
            </form>

            {/* HASIL VALIDASI */}
            {keyResult && (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  keyResult.valid
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/30 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>{keyResult.valid ? '✓' : '✕'}</span>
                  <span>
                    {keyResult.valid ? 'Access Key Valid' : 'Access Key Tidak Valid'}
                  </span>
                </div>

                <p className="text-xs text-zinc-300">{keyResult.message}</p>

                <div className="pt-3 border-t border-zinc-800/80 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">KEY</span>
                    <span className="text-zinc-200">{keyResult.key_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">IP ADDRESS</span>
                    <span className="text-zinc-200">
                      {maskIpAddress(keyResult.ip_address)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">EXPIRED</span>
                    <span className="text-zinc-200">
                      {formatRemainingTime(keyResult.expires_at)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DIRECT LINKS */}
            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Belum punya key?</span>
              <Link
                href="/free"
                className="text-white hover:underline font-medium transition"
              >
                Ambil Free Key (24 Jam) →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 py-6 px-6">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>AKM - Access Key Manager &copy; 2024. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/free" className="hover:text-zinc-300 transition">
              Free Key
            </Link>
            <Link href="/admin" className="hover:text-zinc-300 transition">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}