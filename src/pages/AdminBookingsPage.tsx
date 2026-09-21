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
  requested: 'bg-warning/10 text-warning',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-destructive/8 text-destructive',
  cancelled: 'bg-secondary text-muted-foreground',
};

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
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Booking oversight</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Patient → therapist bookings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Masked operational evidence showing who requested which therapist, the scheduled slot, and whether the therapist accepted. No clinical information is included.</p></div>
          <div className="flex flex-wrap gap-2">
            <label className="text-[11px] font-semibold text-muted-foreground">Requested from<input required aria-label="Bookings requested from" type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block h-11 rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
            <label className="text-[11px] font-semibold text-muted-foreground">Requested to<input required aria-label="Bookings requested to" type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block h-11 rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
            <select aria-label="Booking status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 self-end rounded-xl border bg-background px-3 text-sm font-semibold"><option value="all">All states</option><option value="requested">Awaiting response</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-11 self-end place-items-center rounded-xl border bg-background text-muted-foreground hover:text-primary" aria-label="Refresh bookings"><RefreshCw size={17} /></button>
          </div>
        </div>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !requests.length && <section className="rounded-2xl border bg-card p-10 text-center"><CalendarRange className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No matching booking records</h2><p className="mt-1 text-sm text-muted-foreground">Change the filter or wait for a patient request.</p></section>}

      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <article key={request.appointment_request_id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.025)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{request.public_patient_id} → {request.therapist_display_name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[request.request_status]}`}>{request.request_status}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{request.public_physio_id} · {serviceLabel(request.service_mode)}</p>
                </div>
                <time className="text-sm font-semibold">{dateTime.format(new Date(request.starts_at))}</time>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                <p><span className="block font-semibold text-foreground">Requested</span>{dateTime.format(new Date(request.requested_at))}</p>
                <p><span className="block font-semibold text-foreground">Therapist response</span>{request.responded_at ? dateTime.format(new Date(request.responded_at)) : 'Awaiting response'}</p>
                <p><span className="block font-semibold text-foreground">Cancellation</span>{request.cancelled_at ? `${dateTime.format(new Date(request.cancelled_at))} · ${request.cancelled_by}` : 'Not cancelled'}</p>
              </div>
              {request.reschedules_request_id && <p className="mt-4 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Replacement for booking {request.reschedules_request_id}</p>}
              <p className="mt-3 break-all text-[11px] text-muted-foreground">Booking ID: {request.appointment_request_id}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
