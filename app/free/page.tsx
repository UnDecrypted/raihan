'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FreeKeyData {
  key_code: string;
  expires_at: string | null;
  ip_address: string | null;
  plan: string;
}

// ==========================================
// ATUR LINK SOSIAL MEDIA KAMU DI SINI
// ==========================================
const SOCIAL_TASKS = [
  {
    id: 'youtube',
    label: 'Subscribe YouTube Channel',
    url: 'https://youtube.com/@usernamekamu',
  },
  {
    id: 'tiktok',
    label: 'Follow TikTok / Instagram',
    url: 'https://tiktok.com/@usernamekamu',
  },
];

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

  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
    }
  }

  return 'Terikat (Disensor)';
}

export default function FreeKeyPage() {
  const [keyData, setKeyData] = useState<FreeKeyData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // State untuk melacak task sosmed
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);

  const allTasksCompleted = completedTasks.length === SOCIAL_TASKS.length;

  const handleSocialClick = (id: string, url: string) => {
    // Buka sosmed di tab baru
    window.open(url, '_blank', 'noopener,noreferrer');

    // Jika sudah selesai sebelumnya, abaikan
    if (completedTasks.includes(id)) return;

    // Simulasi verifikasi 5 detik setelah klik
    setCheckingTaskId(id);
    setTimeout(() => {
      setCompletedTasks((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setCheckingTaskId(null);
    }, 5000);
  };

  const handleClaimFreeKey = async () => {
    if (!allTasksCompleted) {
      alert('Selesaikan semua misi kunjungan sosial media terlebih dahulu!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim-free' }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert(result.message || 'Gagal mendapatkan free key.');
        return;
      }

      setKeyData(result.data);
      setMessage(result.message);
    } catch {
      alert('Terjadi kesalahan pada server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!keyData?.key_code) return;
    navigator.clipboard.writeText(keyData.key_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black">
      {/* MAIN CONTENT (CENTERED) */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* HERO TEXT */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
              <span>24 Hours Access</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Get Free Access Key
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Kunjungi sosial media di bawah ini untuk membuka kunci akses gratis selama 24 jam.
            </p>
          </div>

          {/* CARD */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-5 shadow-2xl">
            {!keyData ? (
              <div className="space-y-5">
                {/* STEP 1: SOCIAL TASKS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-400 uppercase tracking-wider">
                      Langkah 1: Kunjungi Sosmed
                    </span>
                    <span className="font-mono text-zinc-500">
                      {completedTasks.length}/{SOCIAL_TASKS.length} Selesai
                    </span>
                  </div>

                  <div className="space-y-2">
                    {SOCIAL_TASKS.map((task) => {
                      const isDone = completedTasks.includes(task.id);
                      const isChecking = checkingTaskId === task.id;

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleSocialClick(task.id, task.url)}
                          disabled={isChecking}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-black border-zinc-800 hover:border-zinc-600 text-zinc-200'
                          }`}
                        >
                          <span>{task.label}</span>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isChecking
                                ? 'bg-zinc-800 text-zinc-400 animate-pulse'
                                : 'bg-white text-black'
                            }`}
                          >
                            {isDone
                              ? '✓ Selesai'
                              : isChecking
                              ? 'Memverifikasi...'
                              : 'Kunjungi ↗'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: GENERATE BUTTON */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-900">
                  <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Langkah 2: Ambil Key
                  </span>

                  <button
                    onClick={handleClaimFreeKey}
                    disabled={loading || !allTasksCompleted}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3.5 px-4 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading
                      ? 'Generating Key...'
                      : allTasksCompleted
                      ? 'Generate Free Key'
                      : '🔒 Selesaikan Langkah 1 Dulu'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span>✓</span>
                    <span>{message}</span>
                  </div>

                  {/* BOX KEY + COPY */}
                  <div className="flex items-center justify-between gap-2 bg-black p-3 rounded-xl border border-zinc-800">
                    <code className="font-mono text-sm font-bold text-white break-all">
                      {keyData.key_code}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition cursor-pointer"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">PLAN</span>
                      <span className="text-zinc-200 uppercase">{keyData.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">IP ADDRESS</span>
                      <span className="text-zinc-200">
                        {maskIpAddress(keyData.ip_address)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">EXPIRED</span>
                      <span className="text-zinc-200">
                        {formatRemainingTime(keyData.expires_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/"
                  className="block w-full text-center py-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-medium text-zinc-300 transition"
                >
                  Cek Status Key →
                </Link>
              </div>
            )}

            {/* BACK LINK */}
            {!keyData && (
              <div className="pt-3 border-t border-zinc-900 text-center">
                <Link
                  href="/"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  ← Kembali ke Halaman Cek Key
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        AKM - Access Key Manager &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}