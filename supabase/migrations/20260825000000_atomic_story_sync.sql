-- Apply to staging first. The client calls this function once per save so the
-- complete story replaces its previous cloud representation atomically.

CREATE OR REPLACE FUNCTION public.sync_story_tree(
  p_story JSONB,
  p_nodes JSONB DEFAULT '[]'::jsonb,
  p_edges JSONB DEFAULT '[]'::jsonb,
  p_lore JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_story_id UUID := (p_story ->> 'id')::uuid;
  v_user_id UUID := (p_story ->> 'user_id')::uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Cannot sync a story for another user';
  END IF;

  IF jsonb_typeof(p_nodes) <> 'array'
     OR jsonb_typeof(p_edges) <> 'array'
     OR jsonb_typeof(p_lore) <> 'array' THEN
    RAISE EXCEPTION 'Story sync collections must be arrays';
  END IF;

  INSERT INTO public.stories (
    id, user_id, title, description, genre, root_node_id, style_config, updated_at
  ) VALUES (
    v_story_id, v_user_id,
    COALESCE(p_story ->> 'title', 'Untitled Story'),
    COALESCE(p_story ->> 'description', ''),
    COALESCE(p_story ->> 'genre', 'Cyberpunk'),
    NULLIF(p_story ->> 'root_node_id', '')::uuid,
    COALESCE(p_story -> 'style_config', '{}'::jsonb),
    COALESCE(NULLIF(p_story ->> 'updated_at', '')::timestamptz, timezone('utc', now()))
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    genre = EXCLUDED.genre,
    root_node_id = EXCLUDED.root_node_id,
    style_config = EXCLUDED.style_config,
    updated_at = EXCLUDED.updated_at;

  -- Remove links before nodes; node deletion safely cascades any remaining links.
  DELETE FROM public.tree_edges e
  WHERE e.story_id = v_story_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_edges) AS incoming(id uuid)
      WHERE incoming.id = e.id
    );

  DELETE FROM public.tree_nodes n
  WHERE n.story_id = v_story_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_nodes) AS incoming(id uuid)
      WHERE incoming.id = n.id
    );

  -- Store parents in a second statement: payload order cannot violate the
  -- self-referencing parent foreign key when both nodes are new.
  INSERT INTO public.tree_nodes (
    id, story_id, parent_node_id, title, content, author_type, agent_persona,
    status, coherence_score, depth, word_count, position_x, position_y, created_at, updated_at
  )
  SELECT
    n.id, v_story_id, NULL, n.title, n.content, n.author_type, n.agent_persona,
    n.status, n.coherence_score, n.depth, n.word_count, n.position_x, n.position_y,
    COALESCE(n.created_at, timezone('utc', now())),
    COALESCE(n.updated_at, timezone('utc', now()))
  FROM jsonb_to_recordset(p_nodes) AS n(
    id uuid, parent_node_id uuid, title text, content text, author_type text,
    agent_persona text, status text, coherence_score numeric, depth integer,
    word_count integer, position_x numeric, position_y numeric,
    created_at timestamptz, updated_at timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    story_id = EXCLUDED.story_id,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    author_type = EXCLUDED.author_type,
    agent_persona = EXCLUDED.agent_persona,
    status = EXCLUDED.status,
    coherence_score = EXCLUDED.coherence_score,
    depth = EXCLUDED.depth,
    word_count = EXCLUDED.word_count,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    updated_at = EXCLUDED.updated_at;

  UPDATE public.tree_nodes stored
  SET parent_node_id = incoming.parent_node_id
  FROM jsonb_to_recordset(p_nodes) AS incoming(id uuid, parent_node_id uuid)
  WHERE stored.story_id = v_story_id AND stored.id = incoming.id;

  INSERT INTO public.tree_edges (id, story_id, source_node_id, target_node_id, edge_type, label)
  SELECT id, v_story_id, source_node_id, target_node_id, edge_type, label
  FROM jsonb_to_recordset(p_edges) AS e(
    id uuid, source_node_id uuid, target_node_id uuid, edge_type text, label text
  )
  ON CONFLICT (id) DO UPDATE SET
    story_id = EXCLUDED.story_id,
    source_node_id = EXCLUDED.source_node_id,
    target_node_id = EXCLUDED.target_node_id,
    edge_type = EXCLUDED.edge_type,
    label = EXCLUDED.label;

  DELETE FROM public.lore_entities l
  WHERE l.story_id = v_story_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_lore) AS incoming(id uuid)
      WHERE incoming.id = l.id
    );

  INSERT INTO public.lore_entities (id, story_id, name, category, description, traits)
  SELECT id, v_story_id, name, category, description, traits
  FROM jsonb_to_recordset(p_lore) AS l(
    id uuid, name text, category text, description text, traits text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    story_id = EXCLUDED.story_id,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    traits = EXCLUDED.traits;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_story_tree(JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_story_tree(JSONB, JSONB, JSONB, JSONB) TO authenticated;
