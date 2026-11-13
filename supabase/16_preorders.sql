-- =====================================================================
-- Precomenzi: reminder pe recepție cu o oră înainte de intervalul ales
-- Recepția vede reminderul (cu sunet) până apasă „Am văzut”; confirmarea e comună pentru toate ecranele.
-- =====================================================================

alter table public.orders add column if not exists pre_reminder_ack_at timestamptz;

create or replace function public.preorder_ack(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Doar recepția confirmă reminderul.' using errcode = 'P0001'; end if;
  update public.orders set pre_reminder_ack_at = now() where id = p_order and scheduled_for is not null and pre_reminder_ack_at is null;
end $$;
revoke execute on function public.preorder_ack(uuid) from public, anon;
grant execute on function public.preorder_ack(uuid) to authenticated;
