import { Injectable, signal, computed, inject } from '@angular/core';
import { StoryTree, TreeNode, TreeEdge, AuthorType, ViewMode, ReaderTheme, LoreEntity, StoryStyleConfig, AIBranchSuggestion, ChapterGenerationOptions } from '../models/graph.models';
import { NARRATIVE_STORY_TREE, ARCHITECTURE_DECISION_TREE } from '../fixtures/starter-trees';
import { AIGeneratorService } from '../services/ai-generator.service';
import { SupabaseService } from '../services/supabase.service';

const STORAGE_KEY = 'ghostwriter_active_story_v1';
const THEME_STORAGE_KEY = 'ghostwriter_reader_theme';

const DEFAULT_LORE: LoreEntity[] = [
  {
    id: 'lore-1',
    name: 'Detective Kael Vance',
    category: 'CHARACTER',
    description: 'Veteran cyber-forensics investigator assigned to Sector 7. Has an obsolete Gen-2 optical implant and distrusts corporate security forces.',
    traits: ['Cyber-forensic expert', 'Military veteran', 'Obsessive investigator']
  },
  {
    id: 'lore-2',
    name: 'Apex Spire',
    category: 'LOCATION',
    description: 'The monolithic corporate headquarters towering over the Upper Tier, housing the central biometric archive vaults.',
    traits: ['Heavily fortified', 'Electrified perimeter', 'Zero public access']
  },
  {
    id: 'lore-3',
    name: 'The Midnight Pulse',
    category: 'ITEM',
    description: 'A 128-bit anomalous signal broadcast across legacy radio frequencies using 40-year-old encryption.',
    traits: ['Archived cipher', 'Sub-grid origin', 'Self-deleting header']
  }
];

const DEFAULT_STYLE: StoryStyleConfig = {
  genre: 'Cyberpunk',
  pacing: 'Balanced',
  tone: 'Gritty & Dark',
  dialogueDensity: 'Balanced'
};

@Injectable({
  providedIn: 'root'
})
export class TreeStore {
  private readonly aiService = inject(AIGeneratorService);
  private readonly supabase = inject(SupabaseService);
  private cloudSyncDebounceTimer: any = null;

  // Core Signals
  readonly currentTree = signal<StoryTree>(this.loadInitialTree());
  readonly selectedNodeId = signal<string>(this.currentTree().rootNodeId);
  readonly isInspectorOpen = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth > 820 : true);
  readonly zoomLevel = signal<number>(1.0);
  readonly activeViewMode = signal<ViewMode>('CANVAS');
  readonly showPrunedNodes = signal<boolean>(true);
  readonly isGeneratingAI = signal<boolean>(false);
  readonly isExpandingChapter = signal<boolean>(false);
  readonly activeAiSuggestions = signal<AIBranchSuggestion[]>([]);

  // Reader Settings
  readonly readerTheme = signal<ReaderTheme>(this.loadInitialTheme());
  readonly readerFontSize = signal<number>(17);

  // Lore & Style Signals
  readonly loreBible = signal<LoreEntity[]>(this.currentTree().loreBible || DEFAULT_LORE);
  readonly styleConfig = signal<StoryStyleConfig>(this.currentTree().styleConfig || DEFAULT_STYLE);

  // Computeds
  readonly selectedNode = computed<TreeNode | null>(() => {
    const tree = this.currentTree();
    const id = this.selectedNodeId();
    return tree.nodes[id] ?? null;
  });

  readonly rootNode = computed<TreeNode | null>(() => {
    const tree = this.currentTree();
    return tree.nodes[tree.rootNodeId] ?? null;
  });

  readonly allNodes = computed<TreeNode[]>(() => {
    const nodes = Object.values(this.currentTree().nodes);
    if (this.showPrunedNodes()) return nodes;
    return nodes.filter(n => n.status !== 'PRUNED');
  });

  readonly prunedNodesCount = computed<number>(() => {
    return Object.values(this.currentTree().nodes).filter(n => n.status === 'PRUNED').length;
  });

  readonly allEdges = computed<TreeEdge[]>(() => {
    return this.currentTree().edges;
  });

  readonly breadcrumbTrail = computed<TreeNode[]>(() => {
    const trail: TreeNode[] = [];
    const tree: StoryTree = this.currentTree();
    let currentId: string | null = this.selectedNodeId();

    while (currentId && tree.nodes[currentId]) {
      const node: TreeNode = tree.nodes[currentId];
      trail.unshift(node);
      currentId = node.parentNodeId;
    }
    return trail;
  });

  readonly activeChildren = computed<TreeNode[]>(() => {
    const currentId = this.selectedNodeId();
    if (!currentId) return [];
    const tree = this.currentTree();
    return Object.values(tree.nodes).filter(n => n.parentNodeId === currentId && n.status !== 'PRUNED');
  });

  readonly activeChapterWordCount = computed<number>(() => {
    const node = this.selectedNode();
    if (!node || !node.content) return 0;
    return node.content.trim().split(/\s+/).filter(w => w.length > 0).length;
  });

  readonly activeChapterReadTime = computed<number>(() => {
    const words = this.activeChapterWordCount();
    return Math.max(1, Math.ceil(words / 200));
  });

  readonly totalStoryWordCount = computed<number>(() => {
    const trail = this.breadcrumbTrail();
    return trail.reduce((acc, node) => {
      const words = node.content ? node.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
      return acc + words;
    }, 0);
  });

  constructor() {}

  selectNode(nodeId: string): void {
    if (this.currentTree().nodes[nodeId]) {
      this.selectedNodeId.set(nodeId);
      this.activeAiSuggestions.set([]);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.activeViewMode.set(mode);
  }

  toggleShowPruned(): void {
    this.showPrunedNodes.update(v => !v);
  }

  setReaderTheme(theme: ReaderTheme): void {
    this.readerTheme.set(theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  setReaderFontSize(size: number): void {
    this.readerFontSize.set(Math.max(13, Math.min(26, size)));
  }

  toggleInspector(): void {
    this.isInspectorOpen.update(v => !v);
  }

  setZoom(zoom: number): void {
    this.zoomLevel.set(Math.max(0.4, Math.min(2.5, zoom)));
  }

  loadTree(tree: StoryTree): void {
    this.currentTree.set(tree);
    this.selectedNodeId.set(tree.rootNodeId);
    this.loreBible.set(tree.loreBible || DEFAULT_LORE);
    this.styleConfig.set(tree.styleConfig || DEFAULT_STYLE);
    this.activeAiSuggestions.set([]);
    this.saveToStorage(tree);
  }

  loadNarrativeDemo(): void {
    this.loadTree(NARRATIVE_STORY_TREE);
  }

  loadArchitectureDemo(): void {
    this.loadTree(ARCHITECTURE_DECISION_TREE);
  }

  async expandActiveChapter(options: ChapterGenerationOptions): Promise<void> {
    const active = this.selectedNode();
    if (!active) return;

    this.isExpandingChapter.set(true);
    try {
      const result = await this.aiService.expandToFullChapter(
        active,
        this.breadcrumbTrail(),
        options,
        this.loreBible(),
        this.styleConfig()
      );

      this.updateNode(active.id, {
        title: result.title,
        content: result.content,
        wordCount: result.wordCount,
        readTimeMinutes: Math.max(1, Math.ceil(result.wordCount / 200))
      });
    } catch (err) {
      console.error('Failed to expand chapter:', err);
    } finally {
      this.isExpandingChapter.set(false);
    }
  }

  async appendNextParagraph(): Promise<void> {
    const active = this.selectedNode();
    if (!active) return;

    this.isGeneratingAI.set(true);
    try {
      const addition = await this.aiService.continueNextParagraph(
        active,
        this.breadcrumbTrail(),
        this.loreBible(),
        this.styleConfig()
      );

      const newContent = active.content + addition;
      const wordCount = newContent.trim().split(/\s+/).length;
      this.updateNode(active.id, {
        content: newContent,
        wordCount,
        readTimeMinutes: Math.max(1, Math.ceil(wordCount / 200))
      });
    } catch (err) {
      console.error('Failed to append paragraph:', err);
    } finally {
      this.isGeneratingAI.set(false);
    }
  }

  async generate3AIPaths(): Promise<void> {
    const active = this.selectedNode();
    if (!active) return;

    this.isGeneratingAI.set(true);
    try {
      const suggestions = await this.aiService.generateThreeBranches(
        active,
        this.breadcrumbTrail(),
        this.loreBible(),
        this.styleConfig()
      );
      this.activeAiSuggestions.set(suggestions);
    } catch (err) {
      console.error('Failed to generate AI branches:', err);
    } finally {
      this.isGeneratingAI.set(false);
    }
  }

  applyAISuggestion(parentNodeId: string, suggestion: AIBranchSuggestion): TreeNode {
    const createdNode = this.addBranch(
      parentNodeId,
      suggestion.title,
      suggestion.content,
      'AGENT',
      suggestion.persona
    );
    this.activeAiSuggestions.update(list => list.filter(s => s.title !== suggestion.title));
    return createdNode;
  }

  applyAllAISuggestions(parentNodeId: string): void {
    const suggestions = this.activeAiSuggestions();
    suggestions.forEach(s => {
      this.addBranch(parentNodeId, s.title, s.content, 'AGENT', s.persona);
    });
    this.activeAiSuggestions.set([]);
  }

  addBranch(
    parentNodeId: string,
    title: string,
    content: string,
    authorType: AuthorType = 'HUMAN',
    agentPersona?: string
  ): TreeNode {
    const tree = this.currentTree();
    const parent = tree.nodes[parentNodeId];
    if (!parent) {
      throw new Error(`Parent chapter with id ${parentNodeId} not found`);
    }

    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEdgeId = `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

    const newNode: TreeNode = {
      id: newNodeId,
      treeId: tree.id,
      parentNodeId: parentNodeId,
      title: title.trim() || 'Untitled Chapter Branch',
      content: content.trim() || 'Write story continuation or plot hypothesis...',
      authorType,
      agentPersona,
      status: 'ACTIVE',
      coherenceScore: authorType === 'AGENT' ? Math.floor(82 + Math.random() * 14) : null,
      depth: parent.depth + 1,
      wordCount,
      readTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newEdge: TreeEdge = {
      id: newEdgeId,
      treeId: tree.id,
      sourceNodeId: parentNodeId,
      targetNodeId: newNodeId,
      edgeType: 'BRANCH',
      label: authorType === 'AGENT' ? agentPersona : 'Author Choice'
    };

    const updatedTree: StoryTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [newNodeId]: newNode
      },
      edges: [...tree.edges, newEdge],
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig(),
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    this.selectedNodeId.set(newNodeId);
    this.saveToStorage(updatedTree);

    return newNode;
  }

  updateNode(nodeId: string, updates: Partial<Pick<TreeNode, 'title' | 'content' | 'status' | 'coherenceScore' | 'wordCount' | 'readTimeMinutes'>>): void {
    const tree = this.currentTree();
    const node = tree.nodes[nodeId];
    if (!node) return;

    const wordCount = updates.content ? updates.content.trim().split(/\s+/).filter(w => w.length > 0).length : node.wordCount;
    const readTimeMinutes = wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : node.readTimeMinutes;

    const updatedNode: TreeNode = {
      ...node,
      ...updates,
      wordCount,
      readTimeMinutes,
      updatedAt: new Date().toISOString()
    };

    const updatedTree: StoryTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [nodeId]: updatedNode
      },
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig(),
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    this.saveToStorage(updatedTree);
  }

  pruneNode(nodeId: string): void {
    const tree = this.currentTree();
    if (nodeId === tree.rootNodeId) return;

    this.updateNode(nodeId, { status: 'PRUNED' });
    if (this.selectedNodeId() === nodeId) {
      const node = tree.nodes[nodeId];
      if (node?.parentNodeId) {
        this.selectedNodeId.set(node.parentNodeId);
      }
    }
  }

  restorePrunedNode(nodeId: string): void {
    this.updateNode(nodeId, { status: 'ACTIVE' });
    this.selectedNodeId.set(nodeId);
  }

  permanentlyDeleteNode(nodeId: string): void {
    const tree = this.currentTree();
    if (nodeId === tree.rootNodeId) return;

    const updatedNodes = { ...tree.nodes };
    delete updatedNodes[nodeId];

    // Remove child connections
    Object.values(updatedNodes).forEach(n => {
      if (n.parentNodeId === nodeId) {
        delete updatedNodes[n.id];
      }
    });

    const updatedEdges = tree.edges.filter(
      e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
    );

    const updatedTree: StoryTree = {
      ...tree,
      nodes: updatedNodes,
      edges: updatedEdges,
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    this.selectedNodeId.set(tree.rootNodeId);
    this.saveToStorage(updatedTree);
  }

  purgeAllPruned(): void {
    const tree = this.currentTree();
    const prunedIds = new Set(
      Object.values(tree.nodes).filter(n => n.status === 'PRUNED').map(n => n.id)
    );

    if (prunedIds.size === 0) return;

    const updatedNodes = { ...tree.nodes };
    prunedIds.forEach(id => delete updatedNodes[id]);

    const updatedEdges = tree.edges.filter(
      e => !prunedIds.has(e.sourceNodeId) && !prunedIds.has(e.targetNodeId)
    );

    const updatedTree: StoryTree = {
      ...tree,
      nodes: updatedNodes,
      edges: updatedEdges,
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    if (prunedIds.has(this.selectedNodeId())) {
      this.selectedNodeId.set(tree.rootNodeId);
    }
    this.saveToStorage(updatedTree);
  }

  setCanonPath(nodeId: string): void {
    const tree = this.currentTree();
    const targetNode = tree.nodes[nodeId];
    if (!targetNode || !targetNode.parentNodeId) return;

    const updatedNodes = { ...tree.nodes };
    Object.values(updatedNodes).forEach(n => {
      if (n.parentNodeId === targetNode.parentNodeId) {
        if (n.id === nodeId) {
          updatedNodes[n.id] = { ...n, status: 'CANON_PATH', updatedAt: new Date().toISOString() };
        } else if (n.status === 'CANON_PATH') {
          updatedNodes[n.id] = { ...n, status: 'ACTIVE', updatedAt: new Date().toISOString() };
        }
      }
    });

    const updatedTree: StoryTree = {
      ...tree,
      nodes: updatedNodes,
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig(),
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    this.saveToStorage(updatedTree);
  }

  createNewStory(title = 'Untitled Story', genre: StoryStyleConfig['genre'] = 'Cyberpunk', premise = 'Begin writing your opening scene here...'): void {
    const storyId = 'story-' + Date.now();
    const rootNodeId = 'node-' + Math.random().toString(36).substring(2, 9);

    const rootNode: TreeNode = {
      id: rootNodeId,
      treeId: storyId,
      parentNodeId: null,
      title: 'Chapter 1: The Beginning',
      content: premise,
      authorType: 'HUMAN',
      status: 'CANON_PATH',
      coherenceScore: 100,
      depth: 0,
      wordCount: premise.split(/\s+/).filter(Boolean).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newTree: StoryTree = {
      id: storyId,
      title,
      description: 'An original branching webnovel created with Ghostwriter.',
      genre,
      rootNodeId,
      nodes: {
        [rootNodeId]: rootNode
      },
      edges: [],
      loreBible: [],
      styleConfig: {
        genre,
        pacing: 'Balanced',
        tone: 'Gritty & Dark',
        dialogueDensity: 'Balanced'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    this.currentTree.set(newTree);
    this.selectedNodeId.set(rootNodeId);
    this.saveToStorage(newTree);
  }

  resetToDemoStory(): void {
    this.currentTree.set(NARRATIVE_STORY_TREE);
    this.selectedNodeId.set(NARRATIVE_STORY_TREE.rootNodeId);
    this.saveToStorage(NARRATIVE_STORY_TREE);
  }

  addLoreEntity(entity: Omit<LoreEntity, 'id'>): void {
    const newEntity: LoreEntity = {
      ...entity,
      id: `lore-${Date.now()}`
    };
    this.loreBible.update(list => [...list, newEntity]);
    this.saveToStorage(this.currentTree());
  }

  removeLoreEntity(id: string): void {
    this.loreBible.update(list => list.filter(e => e.id !== id));
    this.saveToStorage(this.currentTree());
  }

  updateStyleConfig(config: Partial<StoryStyleConfig>): void {
    this.styleConfig.update(c => ({ ...c, ...config }));
    this.saveToStorage(this.currentTree());
  }

  exportNovelManuscript(): string {
    const trail = this.breadcrumbTrail();
    const style = this.styleConfig();
    const tree = this.currentTree();

    let manuscript = `# ${tree.title}\n\n`;
    manuscript += `*Genre: ${style.genre} | Tone: ${style.tone}*\n\n`;
    manuscript += `---\n\n`;

    trail.forEach((chapter, idx) => {
      manuscript += `## Chapter ${idx + 1}: ${chapter.title}\n\n`;
      manuscript += `${chapter.content}\n\n`;
      manuscript += `---\n\n`;
    });

    return manuscript;
  }

  exportJson(): string {
    const fullTree: StoryTree = {
      ...this.currentTree(),
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig()
    };
    return JSON.stringify(fullTree, null, 2);
  }

  loadCloudStory(story: StoryTree): void {
    this.currentTree.set(story);
    this.selectedNodeId.set(story.rootNodeId || Object.keys(story.nodes)[0] || '');
    this.saveToStorage(story);
  }

  private saveToStorage(tree: StoryTree): void {
    try {
      const payload: StoryTree = {
        ...tree,
        loreBible: this.loreBible(),
        styleConfig: this.styleConfig()
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }

      // Auto-sync to Supabase PostgreSQL when user is authenticated
      if (this.supabase.isAuthenticated()) {
        if (this.cloudSyncDebounceTimer) {
          clearTimeout(this.cloudSyncDebounceTimer);
        }
        this.cloudSyncDebounceTimer = setTimeout(() => {
          this.supabase.syncStoryToCloud(payload).catch(() => {});
        }, 1500);
      }
    } catch {
      // Ignore
    }
  }

  private loadInitialTree(): StoryTree {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.rootNodeId && parsed.nodes) {
            return parsed;
          }
        }
      }
    } catch {
      // Fallback
    }
    return NARRATIVE_STORY_TREE;
  }

  private loadInitialTheme(): ReaderTheme {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(THEME_STORAGE_KEY) as ReaderTheme;
        if (raw && ['DARK_SLATE', 'OLED_BLACK', 'WARM_SEPIA', 'NOVEL_PAPER'].includes(raw)) {
          return raw;
        }
      }
    } catch {
      // Fallback
    }
    return 'DARK_SLATE';
  }
}
