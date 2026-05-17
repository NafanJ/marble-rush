'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface RaceFormProps {
  onSubmit: (data: RaceFormData) => Promise<void>;
  onCancel: () => void;
}

export interface RaceFormData {
  title: string;
  maxEntries: number;
  entryWindowSeconds: number;
  speedMultiplier: number;
  trackDifficulty: 'easy' | 'normal' | 'chaos';
  trackSeed: string;
  raceTimeoutSeconds: number;
  awardPoints: boolean;
}

export default function RaceForm({ onSubmit, onCancel }: RaceFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RaceFormData>({
    title: `Marble Rush Race`,
    maxEntries: 20,
    entryWindowSeconds: 300,
    speedMultiplier: 1.0,
    trackDifficulty: 'normal',
    trackSeed: Math.random().toString(36).substring(2, 10),
    raceTimeoutSeconds: 300,
    awardPoints: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Race Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="e.g. Friday Night Marble Madness"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Max Entries"
          type="number"
          min={2}
          max={50}
          value={form.maxEntries}
          onChange={(e) => setForm({ ...form, maxEntries: parseInt(e.target.value) })}
        />
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            Track Difficulty
          </label>
          <select
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={form.trackDifficulty}
            onChange={(e) =>
              setForm({
                ...form,
                trackDifficulty: e.target.value as 'easy' | 'normal' | 'chaos',
              })
            }
          >
            <option value="easy">😌 Easy</option>
            <option value="normal">⚡ Normal</option>
            <option value="chaos">🌀 Chaos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Speed Multiplier"
          type="number"
          min={0.5}
          max={3}
          step={0.1}
          value={form.speedMultiplier}
          onChange={(e) => setForm({ ...form, speedMultiplier: parseFloat(e.target.value) })}
        />
        <Input
          label="Race Timeout (s)"
          type="number"
          min={60}
          max={900}
          value={form.raceTimeoutSeconds}
          onChange={(e) =>
            setForm({ ...form, raceTimeoutSeconds: parseInt(e.target.value) })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Track Seed
        </label>
        <div className="flex gap-2">
          <Input
            value={form.trackSeed}
            onChange={(e) => setForm({ ...form, trackSeed: e.target.value })}
            hint="Same seed = same track layout"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={() =>
              setForm({ ...form, trackSeed: Math.random().toString(36).substring(2, 10) })
            }
          >
            🎲
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id="awardPoints"
          checked={form.awardPoints}
          onChange={(e) => setForm({ ...form, awardPoints: e.target.checked })}
          className="w-4 h-4 rounded accent-purple-600"
        />
        <label htmlFor="awardPoints" className="text-sm text-white/70">
          Award leaderboard points for this race
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          🏁 Create Race
        </Button>
      </div>
    </form>
  );
}
