import type { TextSize } from '../types';

/**
 * Renders question text with the line breaks the author typed and a font size
 * that is either chosen per question or picked automatically from the length.
 */
const SIZES: Record<'host' | 'player', Record<Exclude<TextSize, 'auto'>, string>> = {
  host: {
    s: 'text-xl xl:text-2xl',
    m: 'text-2xl xl:text-4xl',
    l: 'text-3xl xl:text-5xl',
    xl: 'text-4xl xl:text-7xl',
  },
  player: {
    s: 'text-base sm:text-lg',
    m: 'text-lg sm:text-2xl',
    l: 'text-xl sm:text-3xl',
    xl: 'text-2xl sm:text-4xl',
  },
};

export function autoSize(text: string): Exclude<TextSize, 'auto'> {
  const lines = text.split('\n').length;
  const weight = text.length + (lines - 1) * 30; // each extra line costs about half a line of width
  if (weight <= 40) return 'xl';
  if (weight <= 90) return 'l';
  if (weight <= 180) return 'm';
  return 's';
}

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' },
];

export function QuestionText({
  text,
  size = 'auto',
  variant,
  className = '',
}: {
  text: string;
  size?: TextSize;
  variant: 'host' | 'player';
  className?: string;
}) {
  const resolved = size === 'auto' ? autoSize(text) : size;
  return (
    <h1 className={`whitespace-pre-wrap break-words font-bold leading-tight ${SIZES[variant][resolved]} ${className}`}>
      {text.trim()}
    </h1>
  );
}
