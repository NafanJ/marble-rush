import type { CSSProperties } from 'react';

interface MarbleProps {
  /** Any CSS colour */
  color?: string;
  /** Diameter in px */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** The brand mark: a glossy CSS marble. Used as logo, avatar and accent. */
export default function Marble({ color = '#8b7cff', size = 16, className = '', style }: MarbleProps) {
  return (
    <span
      aria-hidden
      className={`marble ${className}`}
      style={{ ['--marble-color' as string]: color, width: size, height: size, ...style }}
    />
  );
}
