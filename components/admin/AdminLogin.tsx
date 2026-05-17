'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AdminLoginProps {
  onLogin: (password: string) => Promise<boolean>;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await onLogin(password);
    if (!ok) {
      setError('Incorrect password');
      setPassword('');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-2xl font-extrabold logo-gradient mb-2">
            Admin Panel
          </h1>
          <p className="text-white/40 text-sm">
            Enter admin password to continue
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              placeholder="Admin password"
              autoFocus
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!password}
              className="w-full"
            >
              🔓 Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
