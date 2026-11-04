create policy "staff manage onboarding uploads" on storage.objects
  for all to authenticated
  using (bucket_id = 'onboarding-uploads' and public.is_staff())
  with check (bucket_id = 'onboarding-uploads' and public.is_staff());