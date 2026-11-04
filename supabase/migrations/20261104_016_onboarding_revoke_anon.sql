-- The public (anon) key never touches these tables; the onboarding function uses the service role.
revoke all on public.onboarding_orders from anon;
revoke all on public.onboarding_invites from anon;
