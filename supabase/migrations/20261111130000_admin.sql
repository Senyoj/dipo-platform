create function public.manage_distributor(
  action text, org uuid default null, label text default null,
  staff_email text default null, staff_role public.distributor_role default null
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  platform boolean;
  target uuid;
begin
  select exists (select 1 from public.platform_admins where user_id = actor) into platform;

  if action = 'organizations' then
    return coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name, o.id)
      from public.organizations o
      where platform or exists (
        select 1 from public.memberships m where m.organization_id = o.id and m.user_id = actor and m.role = 'owner'
      )
    ), '[]'::jsonb);
  end if;

  if action = 'create' and platform then
    insert into public.organizations (name) values (btrim(label)) returning id into target;
    return jsonb_build_object('id', target);
  end if;

  if not platform and not exists (
    select 1 from public.memberships m where m.organization_id = org and m.user_id = actor and m.role = 'owner'
  ) then
    raise exception 'Management access required' using errcode = '42501';
  end if;

  if action = 'staff' then
    return coalesce((
      select jsonb_agg(jsonb_build_object('email', u.email, 'role', m.role) order by u.email, m.role)
      from public.memberships m join auth.users u on u.id = m.user_id
      where m.organization_id = org
    ), '[]'::jsonb);
  end if;

  if action in ('assign', 'remove') then
    if staff_role is null or (staff_role = 'owner' and not platform) then
      raise exception 'Platform access required to change ownership' using errcode = '42501';
    end if;
    select id into target from auth.users where lower(email) = lower(btrim(staff_email));
    if target is null then raise exception 'Create this staff account in Supabase Auth first'; end if;
    if action = 'assign' then
      insert into public.memberships (organization_id, user_id, role)
      values (org, target, staff_role) on conflict do nothing;
    else
      delete from public.memberships where organization_id = org and user_id = target and role = staff_role;
    end if;
    return '{}'::jsonb;
  end if;

  raise exception 'Unknown management action';
end;
$$;

revoke all on function public.manage_distributor(text,uuid,text,text,public.distributor_role) from public, anon;
grant execute on function public.manage_distributor(text,uuid,text,text,public.distributor_role) to authenticated;
