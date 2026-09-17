-- These read-model RPCs call authenticated persona resolvers that take row locks.
-- Keep them VOLATILE so PostgREST does not execute them under read-only semantics.

alter function public.get_my_appointment_clinical_linkage_status() volatile;
alter function public.get_my_professional_clinical_onboarding_requests() volatile;
