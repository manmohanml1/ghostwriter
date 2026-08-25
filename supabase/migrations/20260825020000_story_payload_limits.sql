CREATE OR REPLACE FUNCTION public.enforce_story_sync_limits()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF char_length(NEW.content) > 100000 THEN
    RAISE EXCEPTION 'Chapter content exceeds 100000 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tree_nodes_content_limit ON public.tree_nodes;
CREATE TRIGGER tree_nodes_content_limit
BEFORE INSERT OR UPDATE ON public.tree_nodes
FOR EACH ROW EXECUTE FUNCTION public.enforce_story_sync_limits();

CREATE OR REPLACE FUNCTION public.enforce_story_node_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.tree_nodes WHERE story_id = NEW.story_id) > 1000 THEN
    RAISE EXCEPTION 'Story exceeds 1000 nodes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_story_lore_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.lore_entities WHERE story_id = NEW.story_id) > 500 THEN
    RAISE EXCEPTION 'Story exceeds 500 lore entries';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tree_nodes_count_limit ON public.tree_nodes;
CREATE CONSTRAINT TRIGGER tree_nodes_count_limit
AFTER INSERT OR UPDATE ON public.tree_nodes
DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.enforce_story_node_count();

DROP TRIGGER IF EXISTS lore_entities_count_limit ON public.lore_entities;
CREATE CONSTRAINT TRIGGER lore_entities_count_limit
AFTER INSERT OR UPDATE ON public.lore_entities
DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.enforce_story_lore_count();
