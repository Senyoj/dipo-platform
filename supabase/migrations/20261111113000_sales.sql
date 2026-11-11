create table public.selling_stock (
  organization_id uuid not null references public.organizations,
  user_id uuid not null references auth.users,
  location_id uuid not null,
  sku_id uuid not null,
  channel text not null check (channel in ('counter', 'van')),
  label text not null,
  remaining integer not null check (remaining >= 0),
  price integer not null check (price >= 0),
  primary key (organization_id, user_id, location_id, sku_id, channel)
);

create table public.recorded_sales (
  organization_id uuid not null references public.organizations,
  id uuid not null,
  user_id uuid not null references auth.users,
  payload jsonb not null,
  posted_at timestamptz not null default now(),
  primary key (organization_id, id)
);

alter table public.selling_stock enable row level security;
alter table public.recorded_sales enable row level security;
revoke all on public.selling_stock, public.recorded_sales from anon, authenticated;
grant select on public.selling_stock to authenticated;
create policy own_selling_stock on public.selling_stock for select to authenticated
using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.memberships m
    where m.organization_id = selling_stock.organization_id
      and m.user_id = (select auth.uid())
      and (m.role in ('owner','operations_manager','sales')
        or (m.role = 'cashier' and channel = 'counter')
        or (m.role = 'driver' and channel = 'van'))
  )
);

create function public.post_sale(event jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  org uuid := (event->>'organizationId')::uuid;
  sale uuid := (event->>'id')::uuid;
  location uuid := (event->>'stockLocationId')::uuid;
  mode text := event->>'channel';
  item record;
  existing public.recorded_sales%rowtype;
begin
  if actor is null or (event->>'userId')::uuid is distinct from actor
    or mode is null or mode not in ('counter','van') or not exists (
      select 1 from public.memberships m where m.organization_id = org and m.user_id = actor
        and (m.role in ('owner','operations_manager','sales')
          or (m.role = 'cashier' and mode = 'counter')
          or (m.role = 'driver' and mode = 'van'))
    ) then
    raise exception 'Sale permission denied' using errcode = '42501';
  end if;

  insert into public.recorded_sales (organization_id, id, user_id, payload)
    values (org, sale, actor, event) on conflict do nothing;
  if not found then
    select * into existing from public.recorded_sales s where s.organization_id = org and s.id = sale;
    if existing.user_id is distinct from actor or existing.payload is distinct from event then
      raise exception 'Sale ID already used for a different transaction';
    end if;
    return sale;
  end if;

  if coalesce(jsonb_array_length(event->'lines'), 0) not between 1 and 100 then
    raise exception 'A sale needs between 1 and 100 lines';
  end if;

  for item in
    select * from jsonb_to_recordset(event->'lines')
      as x("skuId" uuid, quantity integer, "unitPricePesewas" integer)
      order by "skuId"
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Invalid sale quantity';
    end if;

    update public.selling_stock
      set remaining = remaining - item.quantity
      where organization_id = org and user_id = actor and location_id = location
        and sku_id = item."skuId" and channel = mode
        and remaining >= item.quantity and price = item."unitPricePesewas";
    if not found then
      raise exception 'Stock or price changed. Review this sale.';
    end if;
  end loop;
  return sale;
end;
$$;

revoke all on function public.post_sale(jsonb) from public, anon;
grant execute on function public.post_sale(jsonb) to authenticated;
