import { useEffect, useState } from 'react';
import { CalendarRange, RefreshCw } from 'lucide-react';
import {
  listAdminAppointmentOperations,
  type AdminAppointmentOperation,
} from '@/lib/admin-operations';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const serviceLabel = (value: string) => value.split('_').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');
const dateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const statusTone: Record<AdminAppointmentOperation['request_status'], string> = {
  requested: 'border-warning/15 bg-warning/10 text-warning',
  accepted: 'border-success/15 bg-success/10 text-success',
  rejected: 'border-destructive/15 bg-destructive/8 text-destructive',
  cancelled: 'border-border bg-secondary text-muted-foreground',
};

const statusOptions: Array<{ value: AdminAppointmentOperation['request_status'] | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Awaiting response' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminBookingsPage() {
  const today = new Date();
  const initialFrom = new Date(today);
  initialFrom.setDate(initialFrom.getDate() - 29);
  const [status, setStatus] = useState<AdminAppointmentOperation['request_status'] | 'all'>('all');
  const [fromDate, setFromDate] = useState(dateInput(initialFrom));
  const [toDate, setToDate] = useState(dateInput(today));
  const [requests, setRequests] = useState<AdminAppointmentOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);
    to.setDate(to.getDate() + 1);
    setLoading(true);
    setError(null);
    listAdminAppointmentOperations({
      from: from.toISOString(),
      to: to.toISOString(),
      status: status === 'all' ? null : status,
      limit: 100,
    })
      .then(setRequests)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load bookings.'))
      .finally(() => setLoading(false));
  }, [fromDate, reloadKey, status, toDate]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-primary/12 bg-[linear-gradient(135deg,hsl(var(--primary-soft)),hsl(var(--card))_72%)] p-5 shadow-[0_18px_50px_hsl(var(--foreground)/.04)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Booking oversight</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Patient → therapist bookings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Track request state, scheduled time and therapist response without exposing clinical information. Admin observes this workflow; the therapist retains appointment acceptance authority.</p></div>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-xs font-bold text-muted-foreground transition hover:border-primary/25 hover:text-primary" aria-label="Refresh bookings"><RefreshCw size={16} />Refresh</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-lg">
          <label className="text-[11px] font-semibold text-muted-foreground">Requested from<input required aria-label="Bookings requested from" type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-[11px] font-semibold text-muted-foreground">Requested to<input required aria-label="Bookings requested to" type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
        </div>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter booking status">
          {statusOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => setStatus(option.value)} className={`min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${status === option.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground'}`}>{option.label}</button>
          ))}
        </div>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !requests.length && <section className="rounded-2xl border bg-card p-10 text-center"><CalendarRange className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No matching booking records</h2><p className="mt-1 text-sm text-muted-foreground">Change the filter or wait for a patient request.</p></section>}

      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <article key={request.appointment_request_id} className="rounded-[22px] border border-primary/8 bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.025)] sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-bold">{request.public_patient_id} <span className="text-muted-foreground">→</span> {request.therapist_display_name}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone[request.request_status]}`}>{request.request_status === 'requested' ? 'Awaiting response' : request.request_status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{serviceLabel(request.service_mode)} · {request.public_physio_id}</p>
                </div>
                <div className="rounded-xl border bg-secondary/35 px-3.5 py-3 lg:min-w-48">
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Scheduled slot</p>
                  <time className="mt-1 block text-sm font-bold">{dateTime.format(new Date(request.starts_at))}</time>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/30 p-3"><dt className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">Requested</dt><dd className="mt-1 text-xs font-semibold">{dateTime.format(new Date(request.requested_at))}</dd></div>
                <div className="rounded-xl bg-secondary/30 p-3"><dt className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">Therapist response</dt><dd className="mt-1 text-xs font-semibold">{request.responded_at ? dateTime.format(new Date(request.responded_at)) : 'Awaiting response'}</dd></div>
                <div className="rounded-xl bg-secondary/30 p-3"><dt className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">Cancellation</dt><dd className="mt-1 text-xs font-semibold">{request.cancelled_at ? `${dateTime.format(new Date(request.cancelled_at))} · ${request.cancelled_by}` : 'Not cancelled'}</dd></div>
              </dl>
              {request.reschedules_request_id && <p className="mt-4 rounded-xl border border-primary/8 bg-primary/[.035] px-3 py-2 text-xs text-muted-foreground">This request replaces booking {request.reschedules_request_id}.</p>}
              <p className="mt-3 break-all text-[10px] leading-4 text-muted-foreground">Booking ID: {request.appointment_request_id}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
