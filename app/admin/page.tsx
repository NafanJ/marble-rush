'use client';

import { useState, useEffect } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

const STORAGE_KEY = 'marble_admin_pw';

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setAdminPassword(stored);
    setLoaded(true);
  }, []);

  async function handleLogin(password: string): Promise<boolean> {
    // Verify by making an authenticated request
    const res = await fetch('/api/races/active', {
      headers: { 'x-admin-password': password },
    });
    // We can't verify in this endpoint, try a protected one
    const testRes = await fetch('/api/races', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ title: '__auth_test__' }),
    });
    // 401 = wrong password; other errors mean password worked (server-side validation failed for different reason)
    if (testRes.status === 401) return false;
    // Don't care about the actual response — just check it wasn't 401
    // The test race won't be created because title validation etc. happens after auth check
    // Actually, let's check if it's not 401
    if (testRes.status !== 401) {
      localStorage.setItem(STORAGE_KEY, password);
      setAdminPassword(password);
      return true;
    }
    return false;
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAdminPassword(null);
  }

  if (!loaded) return null;

  return (
    <div>
      {adminPassword ? (
        <div>
          {/* Logout button */}
          <div className="max-w-5xl mx-auto px-4 pt-4 flex justify-end">
            <button
              onClick={handleLogout}
              className="text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              🔒 Logout
            </button>
          </div>
          <AdminDashboard adminPassword={adminPassword} />
        </div>
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </div>
  );
}
