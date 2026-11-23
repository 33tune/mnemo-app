-- canvases.updated_at is the cut-off the editor uses to replay canvas_ops (it loads
-- only ops with created_at > updated_at). canvas_ops.created_at comes from the
-- server clock, so updated_at must too: a client clock running ahead would hide
-- the edits made right after a save. Whenever a write changes updated_at, the
-- server stamps its own now(); writes that leave it alone keep it as is.
create or replace function public.canvases_server_updated_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.updated_at is distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists canvases_server_updated_at on public.canvases;
create trigger canvases_server_updated_at before insert or update on public.canvases
  for each row execute function public.canvases_server_updated_at();
