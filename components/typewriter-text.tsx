'use client';

import { useEffect, useMemo, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  className?: string;
}

export default function TypewriterText({ text, speedMs = 36, className }: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const characters = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    setVisibleCount(0);
    const interval = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= characters.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, speedMs);

    return () => window.clearInterval(interval);
  }, [characters.length, speedMs, text]);

  return (
    <span className={className} aria-label={text}>
      {characters.slice(0, visibleCount).join('')}
      <span className="ml-1 inline-block h-[1em] w-[0.08em] animate-pulse bg-current align-middle" />
    </span>
  );
}
