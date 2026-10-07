import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { signOutCurrentSession } from '@/lib/auth';

export function RouteLoading({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <p className="mt-4 text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function SessionResolutionError() {
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border border-destructive/20 bg-card p-7 text-center shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:p-10">
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <h1 className="mt-5 text-2xl font-semibold tracking-[-.03em]">Session authority could not be resolved.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          PhysioBill will not infer an account persona from the browser session alone.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void signOutCurrentSession()
              .catch(() => undefined)
              .finally(() => window.location.replace('/'));
          }}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <LogOut size={16} /> {busy ? 'Clearing session…' : 'Clear session'}
        </button>
      </section>
    </main>
  );
}

export function PersonaDeniedPage({
  title,
  message,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  message: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border bg-card p-7 text-center shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:p-10">
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <p className="mt-5 text-sm font-semibold text-primary">Persona boundary</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.03em]">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a href={primaryHref} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">{primaryLabel}</a>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void signOutCurrentSession()
                .then(() => window.location.replace('/'))
                .catch(() => setBusy(false));
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <LogOut size={15} /> {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border bg-card p-7 text-center shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:p-10">
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <p className="mt-5 text-sm font-semibold text-primary">PhysioBill</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">This route is not available. Return to the public PhysioBill entrance or use the appropriate sign-in route.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">Back to PhysioBill</a>
          <a href="/patient/sign-in" className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-secondary">Patient sign in</a>
          <a href="/professional/sign-in" className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-secondary">Professional sign in</a>
        </div>
      </section>
    </main>
  );
}
