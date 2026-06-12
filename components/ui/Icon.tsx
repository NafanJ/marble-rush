interface IconProps {
  name: keyof typeof PATHS;
  size?: number;
  className?: string;
}

// Single-path 24×24 outline icons (stroke = currentColor)
const PATHS = {
  trophy:
    'M8 21h8m-4-4v4m-6-17h12v5a6 6 0 0 1-12 0V4Zm12 2h2a2 2 0 0 1 2 2c0 2-1.5 3.5-4 3.5M6 6H4a2 2 0 0 0-2 2c0 2 1.5 3.5 4 3.5',
  flag: 'M5 21V4m0 1h13l-2.5 4L18 13H5',
  clock: 'M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.06-.4.1-.8.1-1.2Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  play: 'M7 4.5 19 12 7 19.5v-15Z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  medal:
    'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 0v6m0-6-4.5 5M12 15l4.5 5M9 3 7 7m8-4 2 4',
  sparkle: 'M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2 2m-5 5-2 2m9 0-2-2m-5-5-2-2',
  warning: 'M12 9v4m0 4h.01M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z',
  x: 'M18 6 6 18M6 6l12 12',
} as const;

export default function Icon({ name, size = 18, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
