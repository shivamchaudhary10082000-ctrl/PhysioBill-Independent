import type { ReactNode } from 'react';

type PhysioBillBrandProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  suffix?: ReactNode;
  inverse?: boolean;
};

export function PhysioBillLogoMark({
  className = '',
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  const blue = inverse ? '#8ebcff' : '#0b5cad';
  const teal = inverse ? '#6ee7df' : '#0ba7a5';

  return (
    <svg
      viewBox="0 0 72 72"
      role="img"
      aria-label="PhysioBill"
      className={`h-10 w-10 shrink-0 ${className}`.trim()}
    >
      <path
        d="M14 51C6 37 11 18 27 11c6-3 12-3 17-1"
        fill="none"
        stroke={teal}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="45" cy="13" r="6" fill={blue} />
      <path
        d="M45 22c-7 6-10 14-9 24 1 6 5 11 9 15-1-9 2-17 8-23 6-5 10-12 12-20-8 7-14 10-20 11Z"
        fill={blue}
      />
      <path
        d="M32 42c-7 5-11 12-12 20 5-6 11-10 18-9 4 0 7 2 9 4-3-7-8-12-15-15Z"
        fill={teal}
      />
      {[24, 29, 34, 39, 44, 49].map((cy, index) => (
        <circle
          key={cy}
          cx={40 - Math.abs(index - 2.5) * 1.1}
          cy={cy}
          r={index === 2 || index === 3 ? 2.3 : 1.55}
          fill={teal}
        />
      ))}
      <path
        d="M49 36h13l6 6v20H49Z"
        fill="white"
        stroke={blue}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M62 36v7h6" fill="none" stroke={blue} strokeWidth="3" strokeLinejoin="round" />
      <path d="M55 48h7M58.5 44.5v7" stroke={teal} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M54 55h9M54 59h7" stroke={blue} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PhysioBillBrand({
  className = '',
  markClassName = '',
  wordmarkClassName = '',
  showWordmark = true,
  suffix,
  inverse = false,
}: PhysioBillBrandProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <PhysioBillLogoMark className={markClassName} inverse={inverse} />
      {showWordmark && (
        <span className={`min-w-0 ${wordmarkClassName}`.trim()}>
          <span
            className={`block text-[18px] font-extrabold tracking-[-.045em] ${
              inverse ? 'physiobill-wordmark-inverse' : 'text-foreground'
            }`}
          >
            Physio
            <span className={inverse ? 'physiobill-wordmark-accent-inverse' : 'text-teal-600'}>
              Bill
            </span>
          </span>
          {suffix}
        </span>
      )}
    </span>
  );
}
