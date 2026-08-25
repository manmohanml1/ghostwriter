-- Staging integration test for public.sync_story_tree.
-- It runs in one transaction and rolls back all test data.

BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'ghostwriter-staging-test@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

DO $$
DECLARE
  v_story_id UUID := '20000000-0000-0000-0000-000000000001';
  v_root_id UUID := '30000000-0000-0000-0000-000000000001';
  v_child_id UUID := '30000000-0000-0000-0000-000000000002';
  v_edge_id UUID := '40000000-0000-0000-0000-000000000001';
  v_lore_id UUID := '50000000-0000-0000-0000-000000000001';
BEGIN
  PERFORM public.sync_story_tree(
    jsonb_build_object(
      'id', v_story_id, 'user_id', auth.uid(), 'title', 'Staging Sync Test',
      'description', 'Transactional sync verification', 'genre', 'Noir Mystery',
      'root_node_id', v_root_id, 'style_config', jsonb_build_object('genre', 'Noir Mystery')
    ),
    jsonb_build_array(
      jsonb_build_object('id', v_child_id, 'parent_node_id', v_root_id, 'title', 'Child',
        'content', 'Child content', 'author_type', 'HUMAN', 'status', 'ACTIVE',
        'depth', 1, 'word_count', 2, 'position_x', 480, 'position_y', 24),
      jsonb_build_object('id', v_root_id, 'parent_node_id', null, 'title', 'Root',
        'content', 'Root content', 'author_type', 'HUMAN', 'status', 'CANON_PATH',
        'depth', 0, 'word_count', 2, 'position_x', 12, 'position_y', 34)
    ),
    jsonb_build_array(jsonb_build_object('id', v_edge_id, 'source_node_id', v_root_id,
      'target_node_id', v_child_id, 'edge_type', 'BRANCH', 'label', 'Investigate')),
    jsonb_build_array(jsonb_build_object('id', v_lore_id, 'name', 'Mara', 'category', 'CHARACTER',
      'description', 'A witness', 'traits', ARRAY['observant']))
  );

  IF (SELECT root_node_id FROM public.stories WHERE id = v_story_id) <> v_root_id
     OR (SELECT count(*) FROM public.tree_nodes WHERE story_id = v_story_id) <> 2
     OR (SELECT position_x FROM public.tree_nodes WHERE id = v_root_id) <> 12
     OR (SELECT count(*) FROM public.tree_edges WHERE story_id = v_story_id) <> 1
     OR (SELECT count(*) FROM public.lore_entities WHERE story_id = v_story_id) <> 1 THEN
    RAISE EXCEPTION 'Initial atomic sync assertion failed';
  END IF;

  -- A second save removes the child, edge, and lore. They must not resurrect.
  PERFORM public.sync_story_tree(
    jsonb_build_object(
      'id', v_story_id, 'user_id', auth.uid(), 'title', 'Staging Sync Test Updated',
      'description', 'Only the root remains', 'genre', 'Noir Mystery',
      'root_node_id', v_root_id, 'style_config', jsonb_build_object('genre', 'Noir Mystery')
    ),
    jsonb_build_array(jsonb_build_object('id', v_root_id, 'parent_node_id', null,
      'title', 'Root', 'content', 'Updated root content', 'author_type', 'HUMAN',
      'status', 'CANON_PATH', 'depth', 0, 'word_count', 3, 'position_x', 99, 'position_y', 77)),
    '[]'::jsonb,
    '[]'::jsonb
  );

  IF (SELECT count(*) FROM public.tree_nodes WHERE story_id = v_story_id) <> 1
     OR (SELECT count(*) FROM public.tree_edges WHERE story_id = v_story_id) <> 0
     OR (SELECT count(*) FROM public.lore_entities WHERE story_id = v_story_id) <> 0
     OR (SELECT position_x FROM public.tree_nodes WHERE id = v_root_id) <> 99
     OR (SELECT title FROM public.stories WHERE id = v_story_id) <> 'Staging Sync Test Updated' THEN
    RAISE EXCEPTION 'Deletion reconciliation assertion failed';
  END IF;
END;
$$;

ROLLBACK;
