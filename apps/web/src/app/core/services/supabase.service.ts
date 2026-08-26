import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { StoryTree, TreeNode, TreeEdge, LoreEntity } from '../models/graph.models';
import { environment } from '../../../environments/environment';

export function toUUID(str: string): string {
  if (!str) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  // Create 32 hex characters deterministically from string
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  
  const full = (p1 + p2 + p3 + p4).slice(0, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toCloudEntityId(storyId: string, id: string): string {
  return UUID_REGEX.test(id) ? id : toUUID(`${storyId}:${id}`);
}

const SUPABASE_URL_STORAGE = 'ghostwriter_supabase_url';
const SUPABASE_KEY_STORAGE = 'ghostwriter_supabase_anon_key';

export type CloudSyncStatus = 'LOCAL_SANDBOX' | 'SYNCING' | 'SYNCED_CLOUD' | 'SYNC_ERROR' | 'UNAUTHENTICATED';

export interface CloudStorySummary {
  id: string;
  title: string;
  description: string;
  genre: string;
  updatedAt: string;
  isPublic: boolean;
  nodeCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isCloudConfigured = signal<boolean>(false);
  readonly syncStatus = signal<CloudSyncStatus>('LOCAL_SANDBOX');
  readonly lastSyncTime = signal<string | null>(null);
  readonly userCloudStories = signal<CloudStorySummary[]>([]);
  readonly syncErrorMessage = signal<string | null>(null);

  constructor() {
    this.initClient();
  }

  getSupabaseUrl(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(SUPABASE_URL_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
    return environment.supabase.url || '';
  }

  getSupabaseKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(SUPABASE_KEY_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
    return environment.supabase.anonKey || '';
  }

  hasValidCloudConfig(): boolean {
    const url = this.getSupabaseUrl();
    const key = this.getSupabaseKey();
    return Boolean(
      url &&
      key &&
      url.startsWith('https://') &&
      url.includes('.supabase.co') &&
      !url.includes('demo') &&
      !url.includes('example') &&
      key.length > 15 &&
      !key.includes('dummy')
    );
  }

  hasCustomConfig(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(SUPABASE_URL_STORAGE);
      return Boolean(stored && stored.trim());
    }
    return false;
  }

  getCustomSupabaseUrl(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(SUPABASE_URL_STORAGE) || '';
    }
    return '';
  }

  getCustomSupabaseKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(SUPABASE_KEY_STORAGE) || '';
    }
    return '';
  }

  setCustomConfig(url: string, key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (url.trim() && key.trim()) {
        window.localStorage.setItem(SUPABASE_URL_STORAGE, url.trim());
        window.localStorage.setItem(SUPABASE_KEY_STORAGE, key.trim());
      } else {
        window.localStorage.removeItem(SUPABASE_URL_STORAGE);
        window.localStorage.removeItem(SUPABASE_KEY_STORAGE);
      }
      this.initClient();
    }
  }

  clearCustomConfig(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SUPABASE_URL_STORAGE);
      window.localStorage.removeItem(SUPABASE_KEY_STORAGE);
      this.initClient();
    }
  }

  private initClient(): void {
    const isConfigured = this.hasValidCloudConfig();
    this.isCloudConfigured.set(isConfigured);

    if (!isConfigured) {
      this.client = null;
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
      this.syncStatus.set('LOCAL_SANDBOX');
      return;
    }

    try {
      const url = this.getSupabaseUrl();
      const key = this.getSupabaseKey();

      this.client = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      // Check current session
      this.client.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.warn('Supabase getSession error:', error.message);
          this.syncStatus.set('UNAUTHENTICATED');
          return;
        }
        if (data.session?.user) {
          this.currentUser.set(data.session.user);
          this.isAuthenticated.set(true);
          this.syncStatus.set('SYNCED_CLOUD');
          this.fetchUserStories();
        } else {
          this.syncStatus.set('UNAUTHENTICATED');
        }
      }).catch(() => {
        this.syncStatus.set('LOCAL_SANDBOX');
      });

      // Listen for auth state changes
      this.client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          this.currentUser.set(session.user);
          this.isAuthenticated.set(true);
          this.syncStatus.set('SYNCED_CLOUD');
          this.fetchUserStories();
        } else {
          this.currentUser.set(null);
          this.isAuthenticated.set(false);
          this.syncStatus.set('UNAUTHENTICATED');
          this.userCloudStories.set([]);
        }
      });
    } catch (err: any) {
      console.warn('Failed to initialize Supabase client:', err);
      this.client = null;
      this.syncStatus.set('LOCAL_SANDBOX');
    }
  }

  /**
   * Real Email / Password Sign Up
   */
  async signUp(email: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.isCloudConfigured()) {
      return {
        success: false,
        message: 'Cloud Database not configured. Please set your Supabase Project URL and Anon Key in Settings.'
      };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password: pass
      });

      if (error) throw error;

      if (data.user && data.session) {
        this.currentUser.set(data.user);
        this.isAuthenticated.set(true);
        this.syncStatus.set('SYNCED_CLOUD');
        return { success: true, message: 'Account created! Connected to Ghostwriter Cloud.' };
      }

      return {
        success: true,
        message: 'Account created! Please check your email for the confirmation link.'
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Signup failed' };
    }
  }

  /**
   * Real Email / Password Sign In
   */
  async signIn(email: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.isCloudConfigured()) {
      return {
        success: false,
        message: 'Cloud Database not configured. Please set your Supabase Project URL and Anon Key in Settings.'
      };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      });

      if (error) throw error;

      if (data.user) {
        this.currentUser.set(data.user);
        this.isAuthenticated.set(true);
        this.syncStatus.set('SYNCED_CLOUD');
        await this.fetchUserStories();
        return { success: true, message: 'Logged in successfully!' };
      }

      return { success: false, message: 'Unable to authenticate with provided credentials.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  }

  /**
   * Real OAuth Sign In (Google / GitHub)
   */
  async signInWithOAuth(provider: 'google' | 'github'): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.isCloudConfigured()) {
      return {
        success: false,
        message: 'Cloud Database not configured. Please connect a Supabase project first.'
      };
    }

    try {
      const { error } = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });

      if (error) throw error;
      return { success: true, message: `Redirecting to ${provider}...` };
    } catch (err: any) {
      return { success: false, message: err.message || `OAuth sign-in failed` };
    }
  }

  /**
   * Real Sign Out
   */
  async signOut(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut().catch(() => {});
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.syncStatus.set(this.isCloudConfigured() ? 'UNAUTHENTICATED' : 'LOCAL_SANDBOX');
    this.userCloudStories.set([]);
  }

  async getAccessToken(): Promise<string> {
    if (!this.client) return '';
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token || '';
  }

  /**
   * Real Cloud Sync: Persists Stories, Nodes, Edges, and Lore into PostgreSQL tables
   */
  async syncStoryToCloud(tree: StoryTree): Promise<{ success: boolean; message: string; revision?: number; conflict?: boolean }> {
    if (!this.client || !this.isCloudConfigured()) {
      this.syncStatus.set('LOCAL_SANDBOX');
      return {
        success: false,
        message: 'Saved locally in browser storage. Connect Supabase to sync across devices.'
      };
    }

    const user = this.currentUser();
    if (!user) {
      this.syncStatus.set('UNAUTHENTICATED');
      return { success: false, message: 'Please sign in to sync your story to PostgreSQL Cloud.' };
    }

    this.syncStatus.set('SYNCING');
    this.syncErrorMessage.set(null);

    try {
      const isUUID = UUID_REGEX.test(tree.id);
      const storyUUID = isUUID ? tree.id : toUUID(`${user.id}:${tree.id}`);

      const storyPayload = {
        id: storyUUID,
        user_id: user.id,
        title: tree.title,
        description: tree.description || '',
        genre: tree.genre || 'Cyberpunk',
        root_node_id: tree.rootNodeId ? toCloudEntityId(storyUUID, tree.rootNodeId) : null,
        style_config: tree.styleConfig || {},
        expected_revision: tree.cloudRevision ?? 0,
        updated_at: new Date().toISOString()
      };

      const nodeArray = Object.values(tree.nodes || {});
      const nodePayloads = nodeArray.map(n => ({
        id: toCloudEntityId(storyUUID, n.id),
        parent_node_id: n.parentNodeId ? toCloudEntityId(storyUUID, n.parentNodeId) : null,
        title: n.title,
        content: n.content,
        author_type: n.authorType || 'HUMAN',
        agent_persona: n.agentPersona || null,
        status: n.status || 'ACTIVE',
        coherence_score: n.coherenceScore || null,
        depth: n.depth || 0,
        word_count: n.wordCount || 0,
        position_x: n.position?.x ?? 0,
        position_y: n.position?.y ?? 0,
        created_at: n.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const edgePayloads = (tree.edges || []).map(e => ({
        id: e.id && UUID_REGEX.test(e.id)
          ? e.id
          : toUUID(`${storyUUID}:${e.id || `${e.sourceNodeId}->${e.targetNodeId}`}`),
        source_node_id: toCloudEntityId(storyUUID, e.sourceNodeId),
        target_node_id: toCloudEntityId(storyUUID, e.targetNodeId),
        edge_type: e.edgeType || 'BRANCH',
        label: e.label || null
      }));

      const lorePayloads = (tree.loreBible || []).map(l => ({
        id: l.id && UUID_REGEX.test(l.id) ? l.id : toUUID(`${storyUUID}:${l.id || l.name}`),
        name: l.name,
        category: l.category || 'CHARACTER',
        description: l.description || '',
        traits: l.traits || []
      }));

      const { data: revision, error: syncErr } = await this.client.rpc('sync_story_tree_v2', {
        p_story: storyPayload,
        p_nodes: nodePayloads,
        p_edges: edgePayloads,
        p_lore: lorePayloads
      });
      if (syncErr) throw syncErr;

      this.syncStatus.set('SYNCED_CLOUD');
      this.lastSyncTime.set(new Date().toLocaleTimeString());
      await this.fetchUserStories();

      return { success: true, revision: Number(revision), message: '✨ Story successfully synced to PostgreSQL Cloud!' };
    } catch (err: any) {
      console.error('Real Cloud Sync failed:', err);
      this.syncStatus.set('SYNC_ERROR');
      this.syncErrorMessage.set(err.message || 'Database error');
      const isConflict = String(err.message || '').includes('STORY_REVISION_CONFLICT');
      return {
        success: false,
        conflict: isConflict,
        message: isConflict
          ? 'Cloud conflict: another device saved this story first. Your local draft is safe; open the cloud copy to review it.'
          : `Cloud Sync Error: ${err.message || 'PostgreSQL transaction failed'}`
      };
    }
  }

  /**
   * Fetch complete story tree from PostgreSQL
   */
  async loadStoryFromCloud(storyId: string): Promise<StoryTree | null> {
    if (!this.client || !this.isCloudConfigured()) return null;

    try {
      const uuid = toUUID(storyId);
      const { data: story, error: sErr } = await this.client
        .from('stories')
        .select('*')
        .eq('id', uuid)
        .single();

      if (sErr || !story) return null;

      const [nodesRes, edgesRes, loreRes] = await Promise.all([
        this.client.from('tree_nodes').select('*').eq('story_id', uuid).order('depth', { ascending: true }),
        this.client.from('tree_edges').select('*').eq('story_id', uuid),
        this.client.from('lore_entities').select('*').eq('story_id', uuid)
      ]);

      const nodeRecord: Record<string, TreeNode> = {};
      let firstNodeId = '';

      (nodesRes.data || []).forEach((n: any) => {
        if (!firstNodeId) firstNodeId = n.id;
        nodeRecord[n.id] = {
          id: n.id,
          treeId: n.story_id,
          parentNodeId: n.parent_node_id || null,
          title: n.title,
          content: n.content,
          authorType: n.author_type || 'HUMAN',
          agentPersona: n.agent_persona,
          status: n.status || 'ACTIVE',
          coherenceScore: n.coherence_score,
          depth: n.depth || 0,
          wordCount: n.word_count || 0,
          position: { x: Number(n.position_x || 0), y: Number(n.position_y || 0) },
          createdAt: n.created_at,
          updatedAt: n.updated_at
        };
      });

      const edges: TreeEdge[] = (edgesRes.data || []).map((e: any) => ({
        id: e.id,
        treeId: e.story_id,
        sourceNodeId: e.source_node_id,
        targetNodeId: e.target_node_id,
        edgeType: e.edge_type,
        label: e.label
      }));

      const loreBible: LoreEntity[] = (loreRes.data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        description: l.description,
        traits: l.traits || []
      }));

      return {
        id: story.id,
        title: story.title,
        description: story.description,
        genre: story.genre,
        styleConfig: story.style_config || undefined,
        rootNodeId: story.root_node_id || firstNodeId,
        nodes: nodeRecord,
        edges,
        loreBible,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        version: 1,
        cloudRevision: Number(story.revision || 0)
      };
    } catch (err) {
      console.error('Failed to load story from cloud:', err);
      return null;
    }
  }

  /**
   * List all stories owned by the current authenticated user
   */
  async fetchUserStories(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.client || !this.isCloudConfigured()) return;

    try {
      const { data, error } = await this.client
        .from('stories')
        .select('id, title, description, genre, updated_at, is_public')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        this.userCloudStories.set(data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          genre: d.genre || 'Cyberpunk',
          updatedAt: new Date(d.updated_at).toLocaleDateString(),
          isPublic: d.is_public || false
        })));
      }
    } catch (err) {
      console.warn('Failed to fetch user stories:', err);
    }
  }
}
