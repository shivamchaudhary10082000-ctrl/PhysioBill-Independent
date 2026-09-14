begin;

-- Phase 5 appointment workflow corrective migration.
-- The appointment read RPCs call persona resolvers that take FOR UPDATE locks.
-- PostgREST executes STABLE RPCs in read-only transactions, which rejects
-- those locks with SQLSTATE 25006 / HTTP 405. Mark these RPCs VOLATILE so
-- Supabase JS POST /rpc calls run in a read-write transaction while preserving
-- the same authorization, result shape, and zero clinical/financial authority.

alter function public.get_my_patient_appointment_requests()
  volatile;

alter function public.get_my_professional_appointment_requests()
  volatile;

alter function public.get_my_patient_appointment_requests_v2()
  volatile;

alter function public.get_my_professional_appointment_requests_v2()
  volatile;

commit;
