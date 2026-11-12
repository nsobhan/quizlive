type ShapeName = 'triangle' | 'diamond' | 'circle' | 'square';

export function Shape({ shape, className = 'h-8 w-8' }: { shape: ShapeName; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="currentColor">
      {shape === 'triangle' && <path d="M16 3 30 28H2z" />}
      {shape === 'diamond' && <path d="M16 1 31 16 16 31 1 16z" />}
      {shape === 'circle' && <circle cx="16" cy="16" r="14" />}
      {shape === 'square' && <rect x="3" y="3" width="26" height="26" rx="2" />}
    </svg>
  );
}
