import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

type Destination = {
  id: string;
  destination_type: 'upi' | 'bank' | 'provider';
  display_label: string;
  upi_id: string | null;
  bank_name: string | null;
  account_number_display: string | null;
  ifsc_display: string | null;
  provider_code: string | null;
  status: 'draft' | 'active' | 'external_activation_pending' | 'disabled';
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type Draft = {
  id: string | null;
  type: 'upi' | 'bank';
  label: string;
  upiId: string;
  bankName: string;
  accountDisplay: string;
  ifsc: string;
  makeDefault: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  type: 'upi',
  label: '',
  upiId: '',
  bankName: '',
  accountDisplay: '',
  ifsc: '',
  makeDefault: false,
});

export function PaymentDestinationSettings() {
  const [items, setItems] = useState<Destination[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await getSupabaseClient().rpc('list_my_payment_destinations');
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as Destination[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (item: Destination) => {
    if (item.destination_type === 'provider') return;
    setDraft({
      id: item.id,
      type: item.destination_type,
      label: item.display_label,
      upiId: item.upi_id ?? '',
      bankName: item.bank_name ?? '',
      accountDisplay: item.account_number_display ?? '',
      ifsc: item.ifsc_display ?? '',
      makeDefault: item.is_default,
    });
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await getSupabaseClient().rpc('save_my_manual_payment_destination', {
      p_destination_id: draft.id,
      p_destination_type: draft.type,
      p_display_label: draft.label.trim(),
      p_upi_id: draft.type === 'upi' ? draft.upiId.trim() : null,
      p_bank_name: draft.type === 'bank' ? draft.bankName.trim() : null,
      p_account_number_display: draft.type === 'bank' ? draft.accountDisplay.trim() : null,
      p_ifsc_display: draft.type === 'bank' ? draft.ifsc.trim().toUpperCase() : null,
      p_make_default: draft.makeDefault,
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }
    setDraft(null);
    await load();
    setBusy(false);
  };

  const disable = async (item: Destination) => {
    if (!window.confirm(`Disable ${item.display_label}?`)) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await getSupabaseClient().rpc('disable_my_payment_destination', {
      p_destination_id: item.id,
    });
    if (rpcError) setError(rpcError.message);
    else await load();
    setBusy(false);
  };

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Payment destinations</p>
          <h3 className="mt-1 text-lg font-extrabold">Where patients can pay you</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            These destinations belong to your physiotherapist account. Provider-managed settlement remains externally activated and cannot be configured here.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => setDraft(emptyDraft())} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Plus size={16} /> Add destination
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="mt-5 space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading payment destinations…</p> : items.length ? items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{item.display_label}</p>
                {item.is_default && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">Default</span>}
                {item.status !== 'active' && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.status.replace(/_/g, ' ')}</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.destination_type === 'upi' ? item.upi_id : item.destination_type === 'bank' ? [item.bank_name, item.account_number_display, item.ifsc_display].filter(Boolean).join(' · ') : `Provider activation pending${item.provider_code ? ` · ${item.provider_code}` : ''}`}
              </p>
            </div>
            {item.destination_type !== 'provider' && item.status === 'active' && (
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => edit(item)} className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold disabled:opacity-50">Edit</button>
                <button type="button" disabled={busy} onClick={() => void disable(item)} className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive disabled:opacity-50">Disable</button>
              </div>
            )}
          </div>
        )) : <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">No payment destination configured yet.</div>}
      </div>

      {draft && (
        <div className="mt-5 rounded-2xl border bg-background p-5">
          <div className="flex items-center justify-between gap-3"><h4 className="font-extrabold">{draft.id ? 'Edit destination' : 'Add destination'}</h4><button type="button" aria-label="Close" onClick={() => setDraft(null)}><X size={18} /></button></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Type</span><select value={draft.type} onChange={(event) => setDraft((current) => current ? { ...current, type: event.target.value as Draft['type'] } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"><option value="upi">UPI</option><option value="bank">Bank transfer</option></select></label>
            <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Label</span><input value={draft.label} onChange={(event) => setDraft((current) => current ? { ...current, label: event.target.value } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm" placeholder="e.g. Clinic UPI" /></label>
            {draft.type === 'upi' ? <label className="space-y-1.5 md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">UPI ID</span><input value={draft.upiId} onChange={(event) => setDraft((current) => current ? { ...current, upiId: event.target.value } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm" placeholder="name@bank" /></label> : <><label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Bank name</span><input value={draft.bankName} onChange={(event) => setDraft((current) => current ? { ...current, bankName: event.target.value } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm" /></label><label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Account display</span><input value={draft.accountDisplay} onChange={(event) => setDraft((current) => current ? { ...current, accountDisplay: event.target.value } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm" placeholder="Masked or intended display value" /></label><label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">IFSC</span><input value={draft.ifsc} onChange={(event) => setDraft((current) => current ? { ...current, ifsc: event.target.value } : current)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm uppercase" /></label></>}
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold"><input type="checkbox" checked={draft.makeDefault} onChange={(event) => setDraft((current) => current ? { ...current, makeDefault: event.target.checked } : current)} /> Use as default active destination</label>
          <div className="mt-4 flex justify-end"><button type="button" disabled={busy || !draft.label.trim() || (draft.type === 'upi' ? !draft.upiId.trim() : !draft.bankName.trim() || !draft.accountDisplay.trim() || !draft.ifsc.trim())} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Check size={16} /> {busy ? 'Saving…' : 'Save destination'}</button></div>
        </div>
      )}
    </section>
  );
}
