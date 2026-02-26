-- Alias compatibility for admin semantics:
-- sequence => order_index
-- token_modifier => token_cost
-- Existing schema already supports required constraints/indexes.

create index if not exists idx_pickup_points_route_sequence
  on public.pickup_points(route_id, order_index);

create or replace function public.reorder_pickup_points(
  p_route_id uuid,
  p_items jsonb
)
returns void
language plpgsql
as $$
declare
  v_item record;
begin
  for v_item in
    select
      (item->>'id')::uuid as id,
      (item->>'sequence')::int as sequence
    from jsonb_array_elements(p_items) item
  loop
    update public.pickup_points
    set order_index = v_item.sequence,
        updated_at = now()
    where id = v_item.id
      and route_id = p_route_id;
  end loop;
end;
$$;
