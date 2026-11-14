import type { CSSProperties } from 'react';
import type { FontChoice, PublicQuestion, TextSize } from '../types';

/**
 * Question heading: an optional title plus the question text, each with its own
 * font and size. Line breaks the author typed are kept.
 */
type Fixed = Exclude<TextSize, 'auto'>;
type Variant = 'host' | 'player';

const TEXT_SIZES: Record<Variant, Record<Fixed, string>> = {
  host: { s: 'text-xl xl:text-2xl', m: 'text-2xl xl:text-4xl', l: 'text-3xl xl:text-5xl', xl: 'text-4xl xl:text-7xl' },
  player: { s: 'text-base sm:text-lg', m: 'text-lg sm:text-2xl', l: 'text-xl sm:text-3xl', xl: 'text-2xl sm:text-4xl' },
};
const TITLE_SIZES: Record<Variant, Record<Fixed, string>> = {
  host: { s: 'text-base xl:text-lg', m: 'text-lg xl:text-2xl', l: 'text-2xl xl:text-3xl', xl: 'text-3xl xl:text-5xl' },
  player: { s: 'text-sm', m: 'text-base sm:text-lg', l: 'text-lg sm:text-xl', xl: 'text-xl sm:text-2xl' },
};

export const FONTS: Record<FontChoice, { label: string; css: string }> = {
  sans: { label: 'Standard', css: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif' },
  serif: { label: 'Serif', css: 'Georgia, Cambria, "Times New Roman", serif' },
  mono: { label: 'Code', css: '"Cascadia Code", Consolas, "SF Mono", Menlo, ui-monospace, monospace' },
  hand: { label: 'Handwritten', css: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive' },
};
export const FONT_OPTIONS = (Object.keys(FONTS) as FontChoice[]).map((value) => ({ value, label: FONTS[value].label }));

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' },
];

export function autoSize(text: string): Fixed {
  const lines = text.split('\n').length;
  const weight = text.length + (lines - 1) * 30; // each extra line costs about half a line of width
  if (weight <= 40) return 'xl';
  if (weight <= 90) return 'l';
  if (weight <= 180) return 'm';
  return 's';
}

const font = (f?: FontChoice): CSSProperties | undefined => (f && f !== 'sans' ? { fontFamily: FONTS[f].css } : undefined);

type Heading = Pick<PublicQuestion, 'text' | 'textSize' | 'textFont' | 'title' | 'titleSize' | 'titleFont'>;

export function QuestionText({ q, variant, className = '' }: { q: Heading; variant: Variant; className?: string }) {
  const title = q.title?.trim();
  const textSize = !q.textSize || q.textSize === 'auto' ? autoSize(q.text) : q.textSize;
  const titleSize = !q.titleSize || q.titleSize === 'auto' ? 'm' : q.titleSize;
  return (
    <div className={className}>
      {title && (
        <p className={`mb-2 whitespace-pre-wrap break-words font-semibold leading-tight text-brand-700 ${TITLE_SIZES[variant][titleSize]}`} style={font(q.titleFont)}>
          {title}
        </p>
      )}
      <h1 className={`whitespace-pre-wrap break-words font-bold leading-tight ${TEXT_SIZES[variant][textSize]}`} style={font(q.textFont)}>
        {q.text.trim()}
      </h1>
    </div>
  );
}
