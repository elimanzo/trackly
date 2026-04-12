-- Atomically replace all department memberships for a user within an org.
-- Called via RPC from updateUserDepartmentsAction to guarantee that the
-- delete and insert succeed or fail together — no partial state possible.

create or replace function public.replace_user_departments(
  p_user_id       uuid,
  p_org_id        uuid,
  p_department_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_departments
  where user_id = p_user_id
    and org_id  = p_org_id;

  if array_length(p_department_ids, 1) > 0 then
    insert into public.user_departments (user_id, org_id, department_id)
    select p_user_id, p_org_id, unnest(p_department_ids);
  end if;
end;
$$;

revoke all on function public.replace_user_departments(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_user_departments(uuid, uuid, uuid[]) to service_role;
