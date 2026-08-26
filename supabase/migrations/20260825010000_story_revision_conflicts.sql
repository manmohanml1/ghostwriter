-- Optimistic concurrency for two devices editing the same story.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);

CREATE OR REPLACE FUNCTION public.sync_story_tree_v2(
  p_story JSONB,
  p_nodes JSONB DEFAULT '[]'::jsonb,
  p_edges JSONB DEFAULT '[]'::jsonb,
  p_lore JSONB DEFAULT '[]'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_story_id UUID := (p_story ->> 'id')::uuid;
  v_expected_revision INTEGER := COALESCE(NULLIF(p_story ->> 'expected_revision', '')::integer, 0);
  v_current_revision INTEGER;
BEGIN
  -- Serializes first-save races as well as normal updates for this story.
  PERFORM pg_advisory_xact_lock(hashtext(v_story_id::text));
  SELECT revision INTO v_current_revision FROM public.stories WHERE id = v_story_id FOR UPDATE;

  IF FOUND AND v_current_revision <> v_expected_revision THEN
    RAISE EXCEPTION 'STORY_REVISION_CONFLICT: expected %, found %', v_expected_revision, v_current_revision
      USING ERRCODE = '40001';
  END IF;
  IF NOT FOUND AND v_expected_revision <> 0 THEN
    RAISE EXCEPTION 'STORY_REVISION_CONFLICT: story no longer exists'
      USING ERRCODE = '40001';
  END IF;

  PERFORM public.sync_story_tree(p_story, p_nodes, p_edges, p_lore);
  UPDATE public.stories SET revision = v_expected_revision + 1 WHERE id = v_story_id;
  RETURN v_expected_revision + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_story_tree_v2(JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_story_tree_v2(JSONB, JSONB, JSONB, JSONB) TO authenticated;
