'use client';

import { useState, useEffect, useCallback } from 'react';

interface AccessKeyItem {
  id: string;
  key_code: string;
  ip_address: string | null;
  expires_at: string | null;
  plan: 'free' | 'paid';
  created_at: string;
}

export default function AdminDashboard() {
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [keys, setKeys] = useState<AccessKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Form Create State
  const [plan, setPlan] = useState<'free' | 'paid'>('paid');
  const [daysValid, setDaysValid] = useState(30);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = useCallback(async (secret: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': secret,
        },
        body: JSON.stringify({ action: 'list' }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_secret');
        setAuthError(result.message || 'Admin key tidak valid.');
        return;
      }

      setIsAuthenticated(true);
      setAuthError('');
      setKeys(result.data || []);
    } catch {
      setAuthError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) {
      setAdminSecret(saved);
      fetchKeys(saved);
    }
  }, [fetchKeys]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) return;
    sessionStorage.setItem('admin_secret', adminSecret.trim());
    fetchKeys(adminSecret.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_secret');
    setIsAuthenticated(false);
    setAdminSecret('');
    setKeys([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminSecret,
        },
        body: JSON.stringify({
          action: 'create',
          plan,
          daysValid: plan === 'free' ? 1 : daysValid,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Gagal membuat key');
        return;
      }

      fetchKeys(adminSecret);
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (
    action: 'reset-ip' | 'delete' | 'extend',
    id: string,
    extra?: Record<string, unknown>
  ) => {
    if (action === 'delete' && !confirm('Yakin ingin menghapus key ini secara permanen?')) {
      return;
    }

    const res = await fetch('/api/key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminSecret,
      },
      body: JSON.stringify({ action, id, ...extra }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      alert(result.message || 'Aksi gagal dilakukan.');
      return;
    }

    fetchKeys(adminSecret);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ==========================================
  // HALAMAN LOGIN ADMIN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center px-6">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="space-y-1.5 text-center">
            <div className="w-9 h-9 mx-auto rounded-lg bg-white text-black flex items-center justify-center font-bold">
              K
            </div>
            <h1 className="text-xl font-bold text-white pt-2">Admin Access</h1>
            <p className="text-xs text-zinc-400">
              Masukkan <code className="text-zinc-200">ADMIN_API_KEY</code> untuk masuk ke dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition"
            />

            {authError && (
              <p className="text-xs text-red-400 text-center">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading || !adminSecret.trim()}
              className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3 rounded-xl text-sm transition disabled:opacity-40 cursor-pointer"
            >
              {loading ? 'Memverifikasi...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD ADMIN UTAMA
  // ==========================================
  const now = Date.now();
  const totalKeys = keys.length;
  const activeKeys = keys.filter(
    (k) => !k.expires_at || new Date(k.expires_at).getTime() > now
  ).length;
  const paidKeys = keys.filter((k) => k.plan === 'paid').length;

  const filteredKeys = keys.filter(
    (k) =>
      k.key_code.toLowerCase().includes(search.toLowerCase()) ||
      (k.ip_address && k.ip_address.includes(search))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* NAVBAR */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white text-black flex items-center justify-center font-bold text-sm">
              K
            </div>
            <span className="font-semibold text-white">KeyGate</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-xs text-zinc-400 hover:text-white transition"
            >
              Halaman Cek →
            </a>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-300 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* STATISTIK RINGKAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <p className="text-xs text-zinc-500">Total Keys</p>
            <p className="text-2xl font-bold text-white mt-1">{totalKeys}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <p className="text-xs text-zinc-500">Aktif</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeKeys}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <p className="text-xs text-zinc-500">Expired</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{totalKeys - activeKeys}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <p className="text-xs text-zinc-500">Paid Plan</p>
            <p className="text-2xl font-bold text-white mt-1">{paidKeys}</p>
          </div>
        </div>

        {/* FORM CREATE KEY */}
        <section className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80">
          <h2 className="text-sm font-semibold text-white mb-4">Generate Access Key Baru</h2>

          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
            {/* PILIH PLAN */}
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400">Plan</label>
              <div className="flex rounded-xl bg-black border border-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setPlan('free')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    plan === 'free'
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Free (1 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => setPlan('paid')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    plan === 'paid'
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Paid (Custom)
                </button>
              </div>
            </div>

            {/* DURASI HARI (JIKA PAID) */}
            {plan === 'paid' && (
              <div className="space-y-1.5">
                <label className="block text-xs text-zinc-400">Durasi (Hari)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={daysValid}
                    onChange={(e) => setDaysValid(Number(e.target.value))}
                    className="w-28 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  />
                  <div className="flex gap-1">
                    {[7, 30, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDaysValid(d)}
                        className={`px-2.5 py-2 rounded-lg text-xs border transition cursor-pointer ${
                          daysValid === d
                            ? 'border-white text-white bg-zinc-900'
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-40 cursor-pointer"
            >
              {creating ? 'Membuat...' : '+ Create Key'}
            </button>
          </form>
        </section>

        {/* TABEL DAFTAR KEYS */}
        <section className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden">
          <div className="p-5 border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-white">Daftar Access Keys</h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari key atau IP..."
                className="bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white w-full sm:w-64"
              />
              <button
                onClick={() => fetchKeys(adminSecret)}
                className="px-3 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs text-zinc-300 transition cursor-pointer"
                title="Refresh data"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-900">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Key Code</th>
                  <th className="py-3.5 px-4 font-medium">Plan</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium">IP Address</th>
                  <th className="py-3.5 px-4 font-medium">Expired At</th>
                  <th className="py-3.5 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Tidak ada access key ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((item) => {
                    const expired = item.expires_at
                      ? new Date(item.expires_at).getTime() <= now
                      : false;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition">
                        <td className="py-3.5 px-4 font-mono font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{item.key_code}</span>
                            <button
                              onClick={() => copyToClipboard(item.id, item.key_code)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                              item.plan === 'paid'
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}
                          >
                            {item.plan || 'free'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ${
                              expired
                                ? 'bg-red-950/50 text-red-400 border border-red-500/20'
                                : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                expired ? 'bg-red-400' : 'bg-emerald-400'
                              }`}
                            />
                            {expired ? 'Expired' : 'Aktif'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-zinc-300">
                          {item.ip_address || (
                            <span className="text-zinc-600 italic">Belum terikat</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-zinc-400">
                          {item.expires_at
                            ? new Date(item.expires_at).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {item.ip_address && (
                              <button
                                onClick={() => handleAction('reset-ip', item.id)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
                                title="Lepas ikatan IP"
                              >
                                Reset IP
                              </button>
                            )}

                            <button
                              onClick={() => handleAction('extend', item.id, { daysValid: 7 })}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
                              title="Tambah masa aktif 7 hari"
                            >
                              +7d
                            </button>

                            <button
                              onClick={() => handleAction('delete', item.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/80 border border-red-500/20 text-red-400 transition cursor-pointer"
                              title="Hapus key"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}