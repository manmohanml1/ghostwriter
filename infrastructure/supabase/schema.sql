-- Ghostwriter Cloud Schema (Supabase PostgreSQL)
-- Multi-Tenant Story Decision Graphs with Row-Level Security (RLS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT DEFAULT 'Cyberpunk Noir',
    root_node_id UUID,
    style_config JSONB DEFAULT '{"genre": "Cyberpunk", "pacing": "Balanced", "tone": "Gritty & Dark", "dialogueDensity": "Balanced"}'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    public_slug TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Nodes Table (Chapters / Story Beats)
CREATE TABLE IF NOT EXISTS public.tree_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    parent_node_id UUID REFERENCES public.tree_nodes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_type TEXT DEFAULT 'HUMAN' CHECK (author_type IN ('HUMAN', 'AGENT', 'SYSTEM')),
    agent_persona TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPLORING', 'PRUNED', 'CANON_PATH')),
    coherence_score NUMERIC(5, 2),
    depth INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 1,
    position_x NUMERIC(10, 2) DEFAULT 0,
    position_y NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Edges Table (Branching Transitions)
CREATE TABLE IF NOT EXISTS public.tree_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES public.tree_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.tree_nodes(id) ON DELETE CASCADE,
    edge_type TEXT DEFAULT 'BRANCH' CHECK (edge_type IN ('BRANCH', 'MERGE', 'REBASE')),
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Lore Bible Entities
CREATE TABLE IF NOT EXISTS public.lore_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('CHARACTER', 'ITEM', 'LOCATION', 'FACTION')),
    description TEXT,
    traits TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lore_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can manage their own stories
CREATE POLICY "Users can manage own stories" ON public.stories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public stories" ON public.stories
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can manage nodes of own stories" ON public.tree_nodes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.stories WHERE id = tree_nodes.story_id AND user_id = auth.uid())
    );

CREATE POLICY "Anyone can view nodes of public stories" ON public.tree_nodes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stories WHERE id = tree_nodes.story_id AND is_public = TRUE)
    );

-- Indexes for lightning fast traversal
CREATE INDEX IF NOT EXISTS idx_tree_nodes_story_id ON public.tree_nodes(story_id);
CREATE INDEX IF NOT EXISTS idx_tree_nodes_parent ON public.tree_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_tree_edges_story_id ON public.tree_edges(story_id);
CREATE INDEX IF NOT EXISTS idx_lore_entities_story_id ON public.lore_entities(story_id);
