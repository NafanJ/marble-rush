'use client';

import { useState, useRef } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

interface JoinFormProps {
  raceId: string;
  sessionId: string;
  onJoined: (entrantId: string, displayName: string) => void;
  disabled?: boolean;
}

export default function JoinForm({
  raceId,
  sessionId,
  onJoined,
  disabled = false,
}: JoinFormProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function validateName(val: string) {
    const trimmed = val.trim();
    if (trimmed.length < 2) return 'Name must be at least 2 characters';
    if (trimmed.length > 20) return 'Name must be 20 characters or less';
    return '';
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Image must be under 2MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const err = validateName(name);
    if (err) {
      setNameError(err);
      return;
    }
    setLoading(true);
    try {
      // Join the race
      const joinRes = await fetch('/api/entrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceId,
          displayName: name.trim(),
          browserSessionId: sessionId,
        }),
      });
      if (!joinRes.ok) {
        const body = await joinRes.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Failed to join race');
        setLoading(false);
        return;
      }
      const joined = await joinRes.json();
      const entrantId: string = (joined as { id: string }).id;

      // Upload image if provided
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('raceId', raceId);
        formData.append('entrantId', entrantId);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          // Non-fatal — joined without texture
          console.warn('Image upload failed');
        }
      }

      onJoined(entrantId, name.trim());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Your Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError(validateName(e.target.value));
        }}
        error={nameError}
        placeholder="Enter your marble name"
        maxLength={20}
        disabled={disabled || loading}
        autoFocus
      />

      {/* Optional image upload */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Custom Marble Texture{' '}
          <span className="text-white/30">(optional)</span>
        </label>
        <div className="flex items-center gap-3">
          {imagePreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Marble preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <span className="text-xl">🔮</span>
            </div>
          )}
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              disabled={disabled || loading}
            >
              {imageFile ? 'Change image' : 'Upload image'}
            </button>
            <p className="text-xs text-white/30 mt-0.5">
              JPEG, PNG, or WebP under 2MB
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageChange}
          disabled={disabled || loading}
        />
        {imageError && (
          <p className="mt-1.5 text-xs text-red-400">{imageError}</p>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={disabled || !!nameError || name.trim().length < 2}
        className="w-full"
      >
        🔮 Enter Race
      </Button>
    </form>
  );
}
