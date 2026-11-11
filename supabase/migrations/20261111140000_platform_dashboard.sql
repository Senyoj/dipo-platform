create table public.platform_demo (
  section text primary key,
  records jsonb not null check (jsonb_typeof(records) = 'array')
);

alter table public.platform_demo enable row level security;
revoke all on public.platform_demo from anon, authenticated;

insert into public.platform_demo (section, records) values
('organizations', '[{"name":"Demo · Sunyani Wholesale","id":"demo-sunyani"},{"name":"Demo · Accra Distribution","id":"demo-accra"}]'),
('users', '[{"email":"owner@example.invalid","id":"demo-owner","created_at":"2026-11-11T08:00:00Z"},{"email":"driver@example.invalid","id":"demo-driver","created_at":"2026-11-11T08:15:00Z"}]'),
('memberships', '[{"organization":"Demo · Sunyani Wholesale","email":"owner@example.invalid","role":"owner"},{"organization":"Demo · Sunyani Wholesale","email":"driver@example.invalid","role":"driver"}]'),
('stock', '[{"organization":"Demo · Sunyani Wholesale","label":"Bottled water","email":"driver@example.invalid","channel":"van","remaining":24,"price":1250}]'),
('sales', '[{"organization":"Demo · Sunyani Wholesale","id":"demo-sale-001","email":"driver@example.invalid","channel":"van","posted_at":"2026-11-11T09:00:00Z","total":2500,"lines":[{"skuId":"demo-water","quantity":2,"unitPricePesewas":1250}]}]'),
('admins', '[{"email":"platform@example.invalid","id":"demo-admin"}]');

create function public.platform_dashboard(
  section text default 'overview',
  page_number integer default 0,
  demo boolean default false,
  distributor uuid default null
) returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  skip_rows integer := greatest(0, least(coalesce(page_number, 0), 1000000)) * 25;
  result jsonb;
begin
  if not exists (select 1 from public.platform_admins where user_id = auth.uid()) then
    raise exception 'Platform superadmin access required' using errcode = '42501';
  end if;

  if demo then
    if section = 'overview' then
      return (select jsonb_object_agg(d.section, jsonb_array_length(d.records)) from public.platform_demo d);
    end if;
    return coalesce((select d.records from public.platform_demo d where d.section = platform_dashboard.section), '[]'::jsonb);
  end if;

  case section
  when 'overview' then
    return jsonb_build_object(
      'organizations', (select count(*) from public.organizations),
      'users', (select count(*) from auth.users),
      'memberships', (select count(*) from public.memberships),
      'stock', (select count(*) from public.selling_stock),
      'sales', (select count(*) from public.recorded_sales),
      'admins', (select count(*) from public.platform_admins)
    );
  when 'organizations' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select id, name from public.organizations order by name, id limit 25 offset skip_rows
    ) r;
  when 'users' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select id, email, created_at, last_sign_in_at from auth.users
      order by created_at desc, id limit 25 offset skip_rows
    ) r;
  when 'memberships' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select o.name as organization, u.email, m.role, m.user_id
      from public.memberships m join public.organizations o on o.id = m.organization_id
      join auth.users u on u.id = m.user_id
      where distributor is null or m.organization_id = distributor
      order by o.name, m.organization_id, m.user_id, m.role limit 25 offset skip_rows
    ) r;
  when 'stock' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select o.name as organization, u.email, s.label, s.channel, s.remaining, s.price, s.location_id, s.sku_id
      from public.selling_stock s join public.organizations o on o.id = s.organization_id
      join auth.users u on u.id = s.user_id
      where distributor is null or s.organization_id = distributor
      order by o.name, s.organization_id, s.user_id, s.location_id, s.sku_id, s.channel limit 25 offset skip_rows
    ) r;
  when 'sales' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select o.name as organization, u.email, s.id, s.posted_at,
        s.payload->>'channel' as channel, s.payload->'lines' as lines,
        (select sum((line->>'quantity')::numeric * (line->>'unitPricePesewas')::numeric)
          from jsonb_array_elements(s.payload->'lines') line) as total
      from public.recorded_sales s join public.organizations o on o.id = s.organization_id
      join auth.users u on u.id = s.user_id
      where distributor is null or s.organization_id = distributor
      order by s.posted_at desc, s.organization_id, s.id limit 25 offset skip_rows
    ) r;
  when 'admins' then
    select jsonb_agg(to_jsonb(r)) into result from (
      select u.id, u.email, u.last_sign_in_at from public.platform_admins a
      join auth.users u on u.id = a.user_id order by u.email, u.id limit 25 offset skip_rows
    ) r;
  else raise exception 'Unknown dashboard section';
  end case;
  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.platform_dashboard(text,integer,boolean,uuid) from public, anon;
grant execute on function public.platform_dashboard(text,integer,boolean,uuid) to authenticated;
