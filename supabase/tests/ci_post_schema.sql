-- Emulate the table grants Supabase applies to API roles.

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.stories,
  public.tree_nodes,
  public.tree_edges,
  public.lore_entities
TO authenticated;

GRANT SELECT ON
  public.stories,
  public.tree_nodes,
  public.tree_edges,
  public.lore_entities
TO anon;
