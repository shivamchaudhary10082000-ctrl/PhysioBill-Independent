from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text()
original = text

anchor = "import { TooltipProvider } from '@/Components/ui/tooltip';\n"
imports = """import { TooltipProvider } from '@/Components/ui/tooltip';
import { AuthPage } from '@/pages/AuthPage';
import { useAuthSession } from '@/hooks/use-auth-session';
import { signOutPhysiotherapist } from '@/lib/auth';
import {
  loadProductionWorkspace,
  saveProductionProfile,
  saveProductionSettings,
  type ProductionWorkspace,
} from '@/lib/production-workspace';
"""
if anchor not in text:
    raise SystemExit('import anchor not found')
text = text.replace(anchor, imports, 1)

old_workspace_header = re.compile(
    r"function WorkspaceController\(\{ authUser \}: \{ authUser: AuthUser \}\) \{\n"
    r"  const currentPhysioId = authUser\.id;\n"
    r"  const \[profile, setProfile\] = usePersistentState<Profile>\(.*?\n  \);\n"
    r"  const \[settings, setSettings\] = usePersistentState<Settings>\(.*?\n  \);\n",
    re.S,
)
replacement_header = """function WorkspaceController({
  authUser,
  currentPhysioId,
  initialProfile,
  initialSettings,
}: {
  authUser: AuthUser;
  currentPhysioId: string;
  initialProfile: Profile;
  initialSettings: Settings;
}) {
  const [profile, setProfileState] = useState<Profile>(initialProfile);
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const setProfile: React.Dispatch<React.SetStateAction<Profile>> = (value) => {
    setProfileState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      setPersistenceError(null);
      void saveProductionProfile(currentPhysioId, next)
        .then((saved) => setProfileState(saved))
        .catch((error: unknown) =>
          setPersistenceError(error instanceof Error ? error.message : 'Unable to save profile.'),
        );
      return next;
    });
  };

  const setSettings: React.Dispatch<React.SetStateAction<Settings>> = (value) => {
    setSettingsState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      setPersistenceError(null);
      void saveProductionSettings(currentPhysioId, next)
        .then((saved) => setSettingsState(saved))
        .catch((error: unknown) =>
          setPersistenceError(error instanceof Error ? error.message : 'Unable to save settings.'),
        );
      return next;
    });
  };
"""
text, count = old_workspace_header.subn(replacement_header, text, count=1)
if count != 1:
    raise SystemExit(f'WorkspaceController header replacement count={count}')

for demo, normalizer in [
    ('demoPatients', 'normalizePatientsForWorkspace'),
    ('demoVisits', 'normalizeVisitsForWorkspace'),
    ('demoInvoices', 'normalizeInvoicesForWorkspace'),
]:
    old = f"    {normalizer}({demo}, currentPhysioId),"
    if old not in text:
        raise SystemExit(f'migration-state initializer not found: {old}')
    text = text.replace(old, '    [],', 1)

workspace_state_anchor = "  recordInvoicePayment: (invoice: Invoice, actor: AuditActor) => InvoiceMutationResult;\n};"
if workspace_state_anchor not in text:
    raise SystemExit('WorkspaceState anchor not found')
text = text.replace(
    workspace_state_anchor,
    "  recordInvoicePayment: (invoice: Invoice, actor: AuditActor) => InvoiceMutationResult;\n  persistenceError: string | null;\n};",
    1,
)

workspace_object_anchor = "    recordInvoicePayment,\n  };"
if workspace_object_anchor not in text:
    raise SystemExit('workspace object anchor not found')
text = text.replace(
    workspace_object_anchor,
    "    recordInvoicePayment,\n    persistenceError,\n  };",
    1,
)

old_local_logout = "  const [, setAuthUser] = useAuthenticatedUser();\n"
if old_local_logout not in text:
    raise SystemExit('AppShell local logout state not found')
text = text.replace(old_local_logout, '', 1)
text = text.replace("onClick={() => setAuthUser(null)} className=\"mt-3 inline-flex", "onClick={() => void signOutPhysiotherapist()} className=\"mt-3 inline-flex", 1)
text = text.replace('Phase-1 demo workspace', 'Authenticated private workspace', 1)
text = text.replace('Demo workspace · local data', 'Authenticated workspace', 1)
text = text.replace('Clinical records and billing share one controlled workspace state. Production authentication and database enforcement come later.', 'Your identity, profile and settings are backed by Supabase Auth, Postgres and RLS. Clinical data migration follows in the next production phase.', 1)
text = text.replace("value.replaceAll('_', ' ')", "value.replace(/_/g, ' ')", 1)

main_anchor = '<main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">{children}</main>'
if main_anchor not in text:
    raise SystemExit('AppShell main anchor not found')
text = text.replace(
    main_anchor,
    '<main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">{workspace.persistenceError && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{workspace.persistenceError}</div>}{children}</main>',
    1,
)

router_pattern = re.compile(r"function ApplicationRouter\(\) \{.*?\n\}\n\nfunction App\(\)", re.S)
router_replacement = """function ApplicationRouter() {
  const auth = useAuthSession();
  const [workspace, setWorkspace] = useState<ProductionWorkspace | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!auth.user) {
      setWorkspace(null);
      setWorkspaceError(null);
      return () => {
        active = false;
      };
    }

    setWorkspace(null);
    setWorkspaceError(null);
    loadProductionWorkspace(auth.user)
      .then((resolved) => {
        if (active) setWorkspace(resolved);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setWorkspaceError(
          error instanceof Error ? error.message : 'Unable to resolve the physiotherapist workspace.',
        );
      });

    return () => {
      active = false;
    };
  }, [auth.user?.id]);

  if (!auth.configured) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border bg-card p-6"><h1 className="font-extrabold">Supabase configuration required</h1><p className="mt-2 text-sm text-muted-foreground">The public Supabase URL and publishable key are not available to this deployment.</p></div></div>;
  }
  if (auth.loading) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Restoring secure session…</div>;
  }
  if (auth.error) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border border-destructive/20 bg-card p-6"><h1 className="font-extrabold text-destructive">Unable to restore session</h1><p className="mt-2 text-sm text-muted-foreground">{auth.error}</p></div></div>;
  }
  if (!auth.user) return <AuthPage />;
  if (workspaceError) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border border-destructive/20 bg-card p-6"><h1 className="font-extrabold text-destructive">Unable to open your workspace</h1><p className="mt-2 text-sm text-muted-foreground">{workspaceError}</p><button type="button" onClick={() => void signOutPhysiotherapist()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign out</button></div></div>;
  }
  if (!workspace) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Opening your private workspace…</div>;
  }

  return (
    <WorkspaceController
      authUser={workspace.authUser}
      currentPhysioId={workspace.physioId}
      initialProfile={workspace.profile}
      initialSettings={workspace.settings}
    />
  );
}

function App()"""
text, count = router_pattern.subn(router_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'ApplicationRouter replacement count={count}')

if text == original:
    raise SystemExit('no changes made')
path.write_text(text)
print('Phase 2 auth integration patch applied')
