import type { ReactNode } from 'react';

type PhysioBillBrandProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  suffix?: ReactNode;
  inverse?: boolean;
};

export function PhysioBillBrand({
  className = '',
  markClassName = '',
  wordmarkClassName = '',
  showWordmark = true,
  suffix,
  inverse = false,
}: PhysioBillBrandProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <span
        className={`physiobill-mark ${inverse ? 'physiobill-mark-inverse' : ''} ${markClassName}`.trim()}
        aria-hidden="true"
      />
      {showWordmark && (
        <span className={`min-w-0 ${wordmarkClassName}`.trim()}>
          <span className={`block text-[18px] font-bold tracking-[-.04em] ${inverse ? 'physiobill-wordmark-inverse' : 'text-foreground'}`}>
            Physio<span className={inverse ? 'physiobill-wordmark-accent-inverse' : 'text-primary'}>Bill</span>
          </span>
          {suffix}
        </span>
      )}
    </span>
  );
}
