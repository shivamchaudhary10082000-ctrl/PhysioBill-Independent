import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarClock, UserRoundCheck, UsersRound } from 'lucide-react';
import { listAdminPatientOperations, type AdminPatientOperation } from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatientOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminPatientOperations({ limit: 100 })
      .then(setPatients)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load patient operations.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    requests: patients.reduce((sum, patient) => sum + Number(patient.appointment_requests_30d), 0),
    accepted: patients.reduce((sum, patient) => sum + Number(patient.accepted_appointments_30d), 0),
  }), [patients]);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Masked support operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Patients</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Platform patient identifiers and booking counts only. Names, phone numbers, email, address, diagnosis, treatment records and clinical links are not exposed.</p>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5"><UsersRound className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Patients in this page</p><p className="mt-1 text-2xl font-bold">{integer.format(patients.length)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><CalendarClock className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Requests · 30 days</p><p className="mt-1 text-2xl font-bold">{integer.format(totals.requests)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><CalendarCheck2 className="text-success" size={19} /><p className="mt-4 text-xs text-muted-foreground">Accepted · 30 days</p><p className="mt-1 text-2xl font-bold">{integer.format(totals.accepted)}</p></div>
          </section>

          {!patients.length ? <section className="rounded-2xl border bg-card p-10 text-center"><UserRoundCheck className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No platform patients found</h2></section> : <div className="grid gap-3 lg:grid-cols-2">{patients.map((patient) => (
            <article key={patient.platform_patient_id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-primary">{patient.public_patient_id}</h2><p className="mt-1 text-xs text-muted-foreground">Registered {date.format(new Date(patient.registered_at))}</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{integer.format(patient.accepted_appointments_30d)} accepted</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Requests · 30d</span><strong className="mt-1 block text-sm">{integer.format(patient.appointment_requests_30d)}</strong></div><div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Last request · 30d</span><strong className="mt-1 block text-sm">{patient.last_appointment_request_at ? dateTime.format(new Date(patient.last_appointment_request_at)) : 'None'}</strong></div></div>
            </article>
          ))}</div>}
        </>
      )}
    </div>
  );
}
