import { useState } from 'react';
import { Landmark, Loader2, Smartphone } from 'lucide-react';
import {
  loadMyInvoicePaymentInstructions,
  type InvoicePaymentInstructions,
} from '@/lib/patient-financial-access';

type Props = {
  invoiceId: string;
  outstanding: number;
};

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function PatientInvoicePaymentInstructions({ invoiceId, outstanding }: Props) {
  const [instructions, setInstructions] = useState<InvoicePaymentInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (outstanding <= 0) return null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setInstructions(await loadMyInvoicePaymentInstructions(invoiceId));
    } catch {
      setError('Payment instructions are unavailable for this invoice.');
    } finally {
      setLoading(false);
    }
  };

  if (!instructions) {
    return <div className="mt-4 rounded-xl border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Need payment details?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Load the physiotherapist's current payment destination for this finalized invoice. These details are instructions only and do not mark the invoice as paid.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? 'Loading…' : 'Show payment instructions'}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>;
  }

  const destination = instructions.destination;
  return <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold">Payment instructions</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">For {instructions.invoiceNumber} · outstanding {money(instructions.outstanding)}. Sending money does not automatically prove settlement; payment status changes only through PhysioBill's controlled payment authority.</p>
      </div>
      <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">Instructions only</span>
    </div>

    {!destination ? <div className="mt-3 rounded-lg bg-background/80 p-3 text-sm text-muted-foreground">This physiotherapist has not configured an active default payment destination.</div> : null}

    {destination?.type === 'upi' ? <div className="mt-3 flex items-start gap-3 rounded-lg bg-background/80 p-3">
      <Smartphone size={18} className="mt-0.5 text-primary" />
      <div><p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{destination.label || 'UPI'}</p><p className="mt-1 break-all font-mono text-sm font-semibold">{destination.upiId}</p></div>
    </div> : null}

    {destination?.type === 'bank' ? <div className="mt-3 flex items-start gap-3 rounded-lg bg-background/80 p-3">
      <Landmark size={18} className="mt-0.5 text-primary" />
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{destination.label || 'Bank transfer'}</p><p className="mt-1 text-sm font-semibold">{destination.bankName || 'Bank'}</p><p className="mt-1 font-mono text-sm">A/C {destination.accountNumberDisplay || '—'}</p><p className="font-mono text-sm">IFSC {destination.ifscDisplay || '—'}</p></div>
    </div> : null}

    {destination?.type === 'provider' ? <div className="mt-3 rounded-lg bg-background/80 p-3 text-sm text-muted-foreground">Provider-managed destination is externally activated. Provider settlement is not represented as payment evidence on this screen.</div> : null}
  </div>;
}
