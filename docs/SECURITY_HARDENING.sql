-- Run this entire script once in the Supabase SQL Editor.
-- It removes permissive policies that could expose admin data or allow anonymous writes.

drop policy if exists "Customers can insert reviews" on public.reviews;
drop policy if exists "Authenticated customers can insert reviews" on public.reviews;

-- reviews stores customer_id, while the email is stored on customers.
-- A SECURITY DEFINER helper avoids depending on customers table RLS while exposing
-- only a boolean ownership result (never the customer's data).
create or replace function public.current_user_owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id
      and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.current_user_owns_customer(uuid) from public;
grant execute on function public.current_user_owns_customer(uuid) to authenticated;

create policy "Authenticated customers can insert reviews"
on public.reviews for insert to authenticated
with check (public.current_user_owns_customer(customer_id));

drop policy if exists "Admins can see notifications" on public.notifications;
create policy "Service role can see admin notifications"
on public.notifications for select to service_role
using (true);

drop policy if exists "Insert notifications" on public.notifications;
create policy "Service role can insert notifications"
on public.notifications for insert to service_role
with check (true);

drop policy if exists "Admins update notifications" on public.notifications;
create policy "Service role can update notifications"
on public.notifications for update to service_role
using (true) with check (true);

drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Products bucket authenticated upload" on storage.objects;
drop policy if exists "Products bucket authenticated update" on storage.objects;
drop policy if exists "Products bucket admin delete" on storage.objects;

create policy "Service role can upload product images"
on storage.objects for insert to service_role
with check (bucket_id in ('products', 'product-images'));

create policy "Service role can update product images"
on storage.objects for update to service_role
using (bucket_id in ('products', 'product-images'))
with check (bucket_id in ('products', 'product-images'));

create policy "Service role can delete product images"
on storage.objects for delete to service_role
using (bucket_id in ('products', 'product-images'));
