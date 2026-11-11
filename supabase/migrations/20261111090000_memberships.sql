create type public.distributor_role as enum (
  'owner', 'operations_manager', 'buyer', 'warehouse', 'sales', 'cashier',
  'dispatcher', 'driver', 'finance', 'auditor'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0)
);

create table public.memberships (
  organization_id uuid references public.organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role public.distributor_role not null,
  primary key (organization_id, user_id, role)
);

create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade
);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;

revoke all on public.organizations, public.memberships, public.platform_admins
from anon, authenticated;
grant select on public.organizations, public.memberships, public.platform_admins
to authenticated;

create policy read_own_memberships on public.memberships for select
to authenticated using (user_id = (select auth.uid()));

create policy read_own_platform_role on public.platform_admins for select
to authenticated using (user_id = (select auth.uid()));

create policy read_member_organizations on public.organizations for select
to authenticated using (
  exists (
    select 1 from public.memberships
    where organization_id = organizations.id and user_id = (select auth.uid())
  ) or exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  )
);
