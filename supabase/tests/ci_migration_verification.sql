-- Executes the tested migrations against PostgreSQL 17 and verifies their
-- authorization, optimistic-conflict, and payload-limit behavior.

BEGIN;

INSERT INTO auth.users (id) VALUES
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

DO $$
DECLARE
  v_revision INTEGER;
BEGIN
  v_revision := public.sync_story_tree_v2(
    jsonb_build_object(
      'id', '20000000-0000-0000-0000-000000000001',
      'user_id', auth.uid(),
      'title', 'CI Story',
      'description', 'Migration verification',
      'genre', 'Noir',
      'root_node_id', '30000000-0000-0000-0000-000000000001',
      'style_config', '{}'::jsonb,
      'expected_revision', 0
    ),
    jsonb_build_array(jsonb_build_object(
      'id', '30000000-0000-0000-0000-000000000001',
      'parent_node_id', null,
      'title', 'Root',
      'content', 'Initial content',
      'author_type', 'HUMAN',
      'status', 'CANON_PATH',
      'depth', 0,
      'word_count', 2,
      'position_x', 0,
      'position_y', 0
    )),
    '[]'::jsonb,
    '[]'::jsonb
  );

  IF v_revision <> 1 THEN
    RAISE EXCEPTION 'Expected initial revision 1, got %', v_revision;
  END IF;

  BEGIN
    PERFORM public.sync_story_tree_v2(
      jsonb_build_object(
        'id', '20000000-0000-0000-0000-000000000001',
        'user_id', auth.uid(),
        'title', 'Stale write',
        'root_node_id', '30000000-0000-0000-0000-000000000001',
        'expected_revision', 0
      ),
      jsonb_build_array(jsonb_build_object(
        'id', '30000000-0000-0000-0000-000000000001',
        'title', 'Root',
        'content', 'Stale content',
        'author_type', 'HUMAN',
        'status', 'CANON_PATH',
        'depth', 0,
        'word_count', 2,
        'position_x', 0,
        'position_y', 0
      )),
      '[]'::jsonb,
      '[]'::jsonb
    );
    RAISE EXCEPTION 'Stale revision was accepted';
  EXCEPTION
    WHEN serialization_failure THEN NULL;
  END;

  BEGIN
    PERFORM public.sync_story_tree_v2(
      jsonb_build_object(
        'id', '20000000-0000-0000-0000-000000000001',
        'user_id', auth.uid(),
        'title', 'Oversized write',
        'root_node_id', '30000000-0000-0000-0000-000000000001',
        'expected_revision', 1
      ),
      jsonb_build_array(jsonb_build_object(
        'id', '30000000-0000-0000-0000-000000000001',
        'title', 'Root',
        'content', repeat('x', 100001),
        'author_type', 'HUMAN',
        'status', 'CANON_PATH',
        'depth', 0,
        'word_count', 1,
        'position_x', 0,
        'position_y', 0
      )),
      '[]'::jsonb,
      '[]'::jsonb
    );
    RAISE EXCEPTION 'Oversized chapter content was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'Chapter content exceeds 100000 characters%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.stories) <> 1 THEN
    RAISE EXCEPTION 'Owner cannot read the saved story';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.stories) <> 0 THEN
    RAISE EXCEPTION 'RLS exposed another user''s story';
  END IF;

  BEGIN
    PERFORM public.sync_story_tree_v2(
      jsonb_build_object(
        'id', '20000000-0000-0000-0000-000000000001',
        'user_id', '10000000-0000-0000-0000-000000000001',
        'title', 'Cross-owner overwrite',
        'expected_revision', 1
      ),
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb
    );
    RAISE EXCEPTION 'Cross-owner synchronization was accepted';
  EXCEPTION
    WHEN serialization_failure OR insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.sync_story_tree_v2(jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role can execute authenticated sync RPC';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tree_nodes_count_limit' AND tgenabled <> 'D'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'lore_entities_count_limit' AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Required story-size triggers are not enabled';
  END IF;
END;
$$;

ROLLBACK;
