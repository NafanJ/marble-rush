'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Race, Entrant, FinishResult, MarblePosition, RaceStatus, RaceRow } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import EntrantList from '../race/EntrantList';
import Countdown from '../race/Countdown';
import RaceForm, { RaceFormData } from './RaceForm';
import ResultsModal from '../race/ResultsModal';
const MarbleRaceGame = dynamic(() => import('../race/MarbleRaceGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[800px] mx-auto bg-white/5 rounded-xl flex items-center justify-center" style={{ height: 400 }}>
      <p className="text-white/40">Loading physics engine...</p>
    </div>
  ),
});

interface AdminDashboardProps {
  adminPassword: string;
}

const STATUS_LABELS: Record<RaceStatus, string> = {
  draft: 'Draft',
  entries_open: 'Entries Open',
  countdown: 'Countdown',
  running: 'Running',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<RaceStatus, string> = {
  draft: 'text-white/40',
  entries_open: 'text-green-400',
  countdown: 'text-yellow-400',
  running: 'text-blue-400',
  complete: 'text-purple-400',
  cancelled: 'text-red-400',
};

export default function AdminDashboard({ adminPassword }: AdminDashboardProps) {
  const [race, setRace] = useState<Race | null>(null);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [results, setResults] = useState<FinishResult[] | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [trackedEntrantId, setTrackedEntrantId] = useState<string | null>(null);
  const [positions, setPositions] = useState<MarblePosition[]>([]);
  const raceIdRef = useRef<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': adminPassword,
  };

  // Load active race on mount
  useEffect(() => {
    setPublicUrl(window.location.origin);
    fetchActiveRace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchActiveRace() {
    // Try the latest manageable race first (includes drafts) so the admin
    // still sees their race after a page refresh.
    const res = await fetch('/api/races/latest', { headers });
    if (res.ok) {
      const data = await res.json() as Race | null;
      if (data) {
        setRace(data);
        fetchEntrants(data.id);
        return;
      }
    }
    // Fall back to the public active-race endpoint
    const res2 = await fetch('/api/races/active');
    if (res2.ok) {
      const data = await res2.json() as Race | null;
      if (data) {
        setRace(data);
        fetchEntrants(data.id);
      }
    }
  }

  async function fetchEntrants(raceId: string) {
    const res = await fetch(`/api/races/${raceId}/entrants`);
    if (res.ok) {
      const data = await res.json() as Entrant[];
      setEntrants(data);
    }
  }

  // Keep raceIdRef current so countdown callback has a stable reference
  useEffect(() => { raceIdRef.current = race?.id ?? null; }, [race?.id]);

  // Show countdown overlay when status becomes 'countdown'
  useEffect(() => {
    if (race?.status === 'countdown') setShowCountdown(true);
    else setShowCountdown(false);
  }, [race?.status]);

  // Countdown completion → auto-transition to running
  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false);
    if (!raceIdRef.current) return;
    setActionLoading('running');
    const res = await fetch(`/api/races/${raceIdRef.current}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify({ status: 'running' }),
    });
    if (res.ok) setRace(await res.json() as Race);
    setActionLoading(null);
  }, [adminPassword]);

  // Realtime subscriptions
  useEffect(() => {
    if (!race) return;
    const channel = supabase
      .channel(`admin-race-${race.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entrants', filter: `race_id=eq.${race.id}` },
        () => fetchEntrants(race.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'races', filter: `id=eq.${race.id}` },
        (payload: RealtimePostgresChangesPayload<RaceRow>) => {
          const row = payload.new as RaceRow;
          setRace({
            id: row.id,
            title: row.title,
            status: row.status,
            maxEntries: row.max_entries,
            entryWindowSeconds: row.entry_window_seconds,
            speedMultiplier: Number(row.speed_multiplier),
            trackDifficulty: row.track_difficulty,
            trackSeed: row.track_seed,
            raceTimeoutSeconds: row.race_timeout_seconds,
            awardPoints: row.award_points,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race?.id]);

  async function createRace(data: RaceFormData) {
    const res = await fetch('/api/races', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newRace = await res.json() as Race;
      setRace(newRace);
      setEntrants([]);
      setResults(null);
      setShowCreateModal(false);
    }
  }

  async function changeStatus(status: RaceStatus) {
    if (!race) return;
    setActionLoading(status);
    const res = await fetch(`/api/races/${race.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json() as Race;
      setRace(updated);
    }
    setActionLoading(null);
  }

  async function restartRace() {
    if (!race) return;
    if (!confirm('Restart race? This will clear all entrants and results.')) return;
    setActionLoading('restart');
    const res = await fetch(`/api/races/${race.id}/restart`, { method: 'POST', headers });
    if (res.ok) {
      const updated = await res.json() as Race;
      setRace(updated);
      setEntrants([]);
      setResults(null);
    }
    setActionLoading(null);
  }

  async function addTestEntrants() {
    if (!race) return;
    setActionLoading('test_entrants');
    const names = ['Zippy', 'Blaze', 'Comet', 'Rocket', 'Storm', 'Flash', 'Turbo', 'Nova', 'Spike', 'Dash'];
    for (let i = 0; i < names.length; i++) {
      await fetch('/api/entrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceId: race.id,
          displayName: names[i],
          browserSessionId: `test-bot-${i}-${Date.now()}`,
        }),
      });
    }
    await fetchEntrants(race.id);
    setActionLoading(null);
  }

  async function removeEntrant(entrantId: string) {
    const res = await fetch(`/api/entrants/${entrantId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok && race) {
      setEntrants((prev) => prev.filter((e) => e.id !== entrantId));
    }
  }

  const handleTrack = useCallback((id: string | null) => {
    setTrackedEntrantId(id);
  }, []);

  const handlePositionUpdate = useCallback((pos: MarblePosition[]) => {
    setPositions(pos);
  }, []);

  const handleRaceComplete = useCallback(async (finishResults: FinishResult[]) => {
    if (!race) return;
    // Save results via API
    const res = await fetch(`/api/races/${race.id}/results`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ results: finishResults }),
    });
    if (res.ok) {
      setResults(finishResults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race]);

  function copyUrl() {
    if (race) {
      navigator.clipboard.writeText(`${publicUrl}/race/${race.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Race control center</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          disabled={!!race && !['complete', 'cancelled', 'draft'].includes(race.status)}
        >
          + Create Race
        </Button>
      </div>

      {/* No race state */}
      {!race && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h2 className="text-xl font-bold mb-2">No Active Race</h2>
          <p className="text-white/40 mb-6">Create a race to get started</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Create Race
          </Button>
        </div>
      )}

      {/* Race control */}
      {race && (
        <div className="space-y-4">
          {/* Race info card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{race.title}</h2>
                <p className={`text-sm font-medium mt-1 ${STATUS_COLORS[race.status]}`}>
                  ● {STATUS_LABELS[race.status]}
                </p>
              </div>
              <div className="text-right text-sm text-white/40">
                <p>{entrants.length} / {race.maxEntries} entrants</p>
                <p>{race.trackDifficulty} track</p>
                <p>{race.speedMultiplier}× speed</p>
              </div>
            </div>

            {/* Public URL */}
            {['entries_open', 'countdown', 'running'].includes(race.status) && (
              <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3 mb-4">
                <span className="text-xs text-white/40 flex-shrink-0">Share:</span>
                <span className="text-sm text-white/70 truncate flex-1">
                  {publicUrl}/race/{race.id}
                </span>
                <Button variant="ghost" size="sm" onClick={copyUrl}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </Button>
              </div>
            )}

            {/* Status control buttons */}
            <div className="flex flex-wrap gap-3">
              {race.status === 'draft' && (
                <Button
                  variant="primary"
                  loading={actionLoading === 'entries_open'}
                  onClick={() => changeStatus('entries_open')}
                >
                  🟢 Open Entries
                </Button>
              )}
              {race.status === 'entries_open' && (
                <>
                  <Button
                    variant="primary"
                    loading={actionLoading === 'countdown'}
                    onClick={() => changeStatus('countdown')}
                    disabled={entrants.length < 1}
                  >
                    🏁 Start Race!
                  </Button>
                  <Button
                    variant="secondary"
                    loading={actionLoading === 'test_entrants'}
                    onClick={addTestEntrants}
                    disabled={entrants.length >= race.maxEntries}
                  >
                    🤖 Add Test Entrants
                  </Button>
                  <Button
                    variant="secondary"
                    loading={actionLoading === 'cancelled'}
                    onClick={() => changeStatus('cancelled')}
                  >
                    Cancel Race
                  </Button>
                </>
              )}
              {race.status === 'running' && (
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Race in progress...
                </div>
              )}
              {['complete', 'cancelled'].includes(race.status) && (
                <Button
                  variant="primary"
                  onClick={() => { setRace(null); setShowCreateModal(true); }}
                >
                  + New Race
                </Button>
              )}

              {/* Force end (admin safety) */}
              {race.status === 'running' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => changeStatus('complete')}
                >
                  Force End
                </Button>
              )}

              {/* Restart — available once a race has progressed */}
              {['countdown', 'running', 'complete', 'cancelled'].includes(race.status) && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={actionLoading === 'restart'}
                  onClick={restartRace}
                >
                  🔄 Restart Race
                </Button>
              )}
            </div>
          </div>

          {/* Countdown overlay */}
          {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

          {/* Entries open — entrant list */}
          {['entries_open', 'draft'].includes(race.status) && (
            <div className="card p-6">
              <EntrantList
                entrants={entrants}
                maxEntries={race.maxEntries}
                isAdmin
                onRemove={removeEntrant}
              />
            </div>
          )}

          {/* Running — game + entrant list side by side */}
          {race.status === 'running' && (
            <div className="flex gap-4 items-start">
              <div className="flex-1 card p-4">
                <MarbleRaceGame
                  race={race}
                  entrants={entrants}
                  isAdmin
                  started={race.status === 'running'}
                  trackedEntrantId={trackedEntrantId}
                  onRaceComplete={handleRaceComplete}
                  onPositionUpdate={handlePositionUpdate}
                />
              </div>
              <div className="w-56 flex-shrink-0 card p-4">
                <EntrantList
                  entrants={entrants}
                  maxEntries={race.maxEntries}
                  isAdmin
                  onRemove={removeEntrant}
                  positions={positions}
                  trackedId={trackedEntrantId}
                  onTrack={handleTrack}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create race modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Race"
        size="lg"
      >
        <RaceForm
          onSubmit={createRace}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Results modal */}
      {results && race && (
        <ResultsModal
          results={results}
          entrants={entrants}
          raceTitle={race.title}
          onNewRace={() => {
            setResults(null);
            setRace(null);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}
