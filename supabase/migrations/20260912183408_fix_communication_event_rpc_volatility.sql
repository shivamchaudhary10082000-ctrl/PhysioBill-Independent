begin;

-- Communication event RPCs call persona resolvers that take row locks.
-- PostgREST executes STABLE RPCs in a read-only transaction, so these
-- functions must be VOLATILE even though their visible result is read-only.
alter function public.get_my_patient_communication_events(integer) volatile;
alter function public.get_my_professional_communication_events(integer) volatile;

commit;
