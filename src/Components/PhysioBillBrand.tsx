import type { ReactNode } from 'react';

type PhysioBillBrandProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  suffix?: ReactNode;
};

export function PhysioBillBrand({
  className = '',
  markClassName = '',
  wordmarkClassName = '',
  showWordmark = true,
  suffix,
}: PhysioBillBrandProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <span className={`physiobill-mark ${markClassName}`.trim()} aria-hidden="true" />
      {showWordmark && (
        <span className={`min-w-0 ${wordmarkClassName}`.trim()}>
          <span className="block text-[17px] font-semibold tracking-[-.035em] text-foreground">
            Physio<span className="text-primary">Bill</span>
          </span>
          {suffix}
        </span>
      )}
    </span>
  );
}
