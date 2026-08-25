import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { StoryTree, TreeNode, TreeEdge, AuthorType, ViewMode, ReaderTheme, LoreEntity, StoryStyleConfig, AIBranchSuggestion, ChapterGenerationOptions, DiscoveredEntity, StoryScope, ProtagonistProfile } from '../models/graph.models';
import { NARRATIVE_STORY_TREE, ARCHITECTURE_DECISION_TREE } from '../fixtures/starter-trees';
import { AIGeneratorService } from '../services/ai-generator.service';
import { SupabaseService } from '../services/supabase.service';

const STORAGE_KEY = 'ghostwriter_active_story_v1';
const CLOUD_BASELINE_KEY = 'ghostwriter_cloud_baseline_v1';
const ANONYMOUS_STORAGE_SCOPE = 'anonymous';
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
  /**
   * Stories are device-local, but they must never be shared between guest mode
   * and different cloud accounts on the same browser profile.
   */
  private activeStorageScope = ANONYMOUS_STORAGE_SCOPE;
  private cloudSyncDebounceTimer: any = null;
  private cloudSyncQueue: Promise<void> = Promise.resolve();
  private cloudSyncVersion = 0;

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
  readonly previousChapterContent = signal<{ nodeId: string; content: string; title: string } | null>(null);

  // Reader Settings
  readonly readerTheme = signal<ReaderTheme>(this.loadInitialTheme());
  readonly readerFontSize = signal<number>(17);

  // Lore & Style Signals
  readonly loreBible = signal<LoreEntity[]>(
    this.currentTree().loreBible ?? (this.currentTree().id === NARRATIVE_STORY_TREE.id ? DEFAULT_LORE : [])
  );
  readonly styleConfig = signal<StoryStyleConfig>(this.currentTree().styleConfig || DEFAULT_STYLE);
  readonly isLoreGenModalOpen = signal<boolean>(false);
  readonly isExtractingLore = signal<boolean>(false);
  readonly extractedLoreSuggestions = signal<LoreEntity[]>([]);

  readonly canUndoAI = computed<boolean>(() => {
    const prev = this.previousChapterContent();
    const active = this.selectedNode();
    return prev !== null && active !== null && prev.nodeId === active.id;
  });

  readonly canBranch = computed<boolean>(() => {
    return this.loreBible().length > 0;
  });

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
    const visited = new Set<string>();

    while (currentId && tree.nodes[currentId]) {
      if (visited.has(currentId)) break; // Cycle guard: prevent infinite loop
      visited.add(currentId);
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

  constructor() {
    effect(() => {
      // Do not auto-open a cloud story here. That used to overwrite whichever
      // local draft happened to be active when authentication changed.
      this.switchStorageScope(this.supabase.currentUser()?.id ?? null);
    });
  }

  selectNode(nodeId: string): void {
    if (this.currentTree().nodes[nodeId]) {
      this.selectedNodeId.set(nodeId);
      this.activeAiSuggestions.set([]);
      this.isLoreGenModalOpen.set(false);
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

    // Save previous state for 1-click Undo
    this.previousChapterContent.set({
      nodeId: active.id,
      content: active.content,
      title: active.title
    });

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

    // Save previous state for 1-click Undo
    this.previousChapterContent.set({
      nodeId: active.id,
      content: active.content,
      title: active.title
    });

    this.isGeneratingAI.set(true);
    try {
      const addition = await this.aiService.continueNextParagraph(
        active,
        this.breadcrumbTrail(),
        this.loreBible(),
        this.styleConfig()
      );

      const cleanAddition = addition.trim();
      const currentContent = active.content.trim();
      const newContent = currentContent ? `${currentContent}\n\n${cleanAddition}` : cleanAddition;
      const wordCount = newContent.split(/\s+/).filter(Boolean).length;
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

  undoLastAIChange(): void {
    const prev = this.previousChapterContent();
    if (!prev) return;
    const tree = this.currentTree();
    if (tree.nodes[prev.nodeId]) {
      this.updateNode(prev.nodeId, {
        content: prev.content,
        title: prev.title
      });
      this.previousChapterContent.set(null);
    }
  }

  checkLoreGateAndPrompt(): boolean {
    if (this.canBranch()) return true;

    // Prompt user to extract lore only if chapter prose is written
    const active = this.selectedNode();
    if (active && active.content && active.content.trim().length >= 10) {
      this.extractLoreFromActiveChapter();
    }
    return false;
  }

  async generate3AIPaths(): Promise<void> {
    const active = this.selectedNode();
    if (!active) return;

    if (!this.checkLoreGateAndPrompt()) {
      return;
    }

    this.isGeneratingAI.set(true);
    try {
      const directChildren = Object.values(this.currentTree().nodes).filter(
        n => n.parentNodeId === active.id && n.status !== 'PRUNED'
      );

      const suggestions = await this.aiService.generateThreeBranches(
        active,
        this.breadcrumbTrail(),
        directChildren,
        this.loreBible(),
        this.styleConfig()
      );
      const tagged = suggestions.map(s => ({
        ...s,
        sourceNodeId: active.id
      }));
      this.activeAiSuggestions.set(tagged);
    } catch (err) {
      console.error('Failed to generate AI branches:', err);
    } finally {
      this.isGeneratingAI.set(false);
    }
  }

  applyAISuggestion(fallbackParentNodeId: string, suggestion: AIBranchSuggestion): TreeNode {
    const targetParentId = suggestion.sourceNodeId || fallbackParentNodeId;
    const createdNode = this.addBranch(
      targetParentId,
      suggestion.title,
      suggestion.content,
      'AGENT',
      suggestion.persona,
      true
    );
    this.activeAiSuggestions.update(list => list.filter(s => s.title !== suggestion.title));
    return createdNode;
  }

  applyAllAISuggestions(fallbackParentNodeId: string): void {
    const suggestions = this.activeAiSuggestions();
    suggestions.forEach(s => {
      const targetParentId = s.sourceNodeId || fallbackParentNodeId;
      this.addBranch(targetParentId, s.title, s.content, 'AGENT', s.persona, false);
    });
    this.activeAiSuggestions.set([]);
  }

  addBranch(
    parentNodeId: string,
    title: string,
    content: string,
    authorType: AuthorType = 'HUMAN',
    agentPersona?: string,
    selectCreatedNode: boolean = true
  ): TreeNode {
    if (!this.canBranch()) {
      this.checkLoreGateAndPrompt();
      throw new Error('Lore Anchor Required: Please establish at least 1 character or location in your Lore Bible before creating branches.');
    }

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
    if (selectCreatedNode) {
      this.selectedNodeId.set(newNodeId);
    }
    this.saveToStorage(updatedTree);

    // Background asynchronous chapter summary caching for token conservation
    if (!parent.summary && parent.content && parent.content.length > 50) {
      this.aiService.summarizeChapter(parent).then(sum => {
        if (sum) {
          const t = this.currentTree();
          if (t.nodes[parentNodeId] && !t.nodes[parentNodeId].summary) {
            const updated = {
              ...t,
              nodes: {
                ...t.nodes,
                [parentNodeId]: { ...t.nodes[parentNodeId], summary: sum }
              }
            };
            this.currentTree.set(updated);
            this.saveToStorage(updated);
          }
        }
      }).catch(() => {});
    }

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

  getAllDescendantIds(nodeId: string, tree: StoryTree = this.currentTree()): string[] {
    const directChildren = Object.values(tree.nodes).filter(n => n.parentNodeId === nodeId);
    const result: string[] = [];
    for (const child of directChildren) {
      result.push(child.id);
      result.push(...this.getAllDescendantIds(child.id, tree));
    }
    return result;
  }

  pruneNode(nodeId: string): void {
    const tree = this.currentTree();
    if (nodeId === tree.rootNodeId) return;

    // Recursively cascade prune node AND all descendant child branches
    const descendantIds = this.getAllDescendantIds(nodeId, tree);
    const allPruneIds = new Set([nodeId, ...descendantIds]);

    const updatedNodes = { ...tree.nodes };
    allPruneIds.forEach(id => {
      if (updatedNodes[id]) {
        updatedNodes[id] = { ...updatedNodes[id], status: 'PRUNED', updatedAt: new Date().toISOString() };
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
    if (allPruneIds.has(this.selectedNodeId())) {
      const node = tree.nodes[nodeId];
      this.selectedNodeId.set(node?.parentNodeId || tree.rootNodeId);
    }
    this.saveToStorage(updatedTree);
  }

  pruneChildrenOf(nodeId: string): void {
    const tree = this.currentTree();
    const descendantIds = this.getAllDescendantIds(nodeId, tree);
    if (descendantIds.length === 0) return;

    const updatedNodes = { ...tree.nodes };
    descendantIds.forEach(id => {
      if (updatedNodes[id]) {
        updatedNodes[id] = { ...updatedNodes[id], status: 'PRUNED', updatedAt: new Date().toISOString() };
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

  deleteChildrenOf(nodeId: string): void {
    const tree = this.currentTree();
    const descendantIds = new Set(this.getAllDescendantIds(nodeId, tree));
    if (descendantIds.size === 0) return;

    const updatedNodes = { ...tree.nodes };
    descendantIds.forEach(id => delete updatedNodes[id]);

    const updatedEdges = tree.edges.filter(
      e => !descendantIds.has(e.sourceNodeId) && !descendantIds.has(e.targetNodeId)
    );

    const updatedTree: StoryTree = {
      ...tree,
      nodes: updatedNodes,
      edges: updatedEdges,
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig(),
      updatedAt: new Date().toISOString(),
      version: tree.version + 1
    };

    this.currentTree.set(updatedTree);
    this.saveToStorage(updatedTree);
  }

  permanentlyDeleteNode(nodeId: string): void {
    const tree = this.currentTree();
    if (nodeId === tree.rootNodeId) return;

    // Recursively collect all descendant IDs to delete
    const allIdsToDelete = new Set([nodeId, ...this.getAllDescendantIds(nodeId, tree)]);

    const updatedNodes = { ...tree.nodes };
    allIdsToDelete.forEach(id => delete updatedNodes[id]);

    const updatedEdges = tree.edges.filter(
      e => !allIdsToDelete.has(e.sourceNodeId) && !allIdsToDelete.has(e.targetNodeId)
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
          // Strip the "Path X: " prefix from the title when promoting to canon
          const cleanTitle = n.title.replace(/^Path [A-Z]:\s*/i, '');
          updatedNodes[n.id] = { ...n, title: cleanTitle, status: 'CANON_PATH', updatedAt: new Date().toISOString() };
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

  async createNewStory(
    title: string,
    genre: StoryStyleConfig['genre'] = 'Cyberpunk',
    tone: StoryStyleConfig['tone'] = 'Gritty & Dark',
    customPremise?: string,
    storyScope: StoryScope = 'MEDIUM',
    protagonist?: ProtagonistProfile
  ): Promise<void> {
    const storyId = 'story-' + Date.now();
    const rootNodeId = 'node-' + Math.random().toString(36).substring(2, 9);

    const inception = await this.aiService.generateStoryInception({
      title,
      genre,
      tone,
      scope: storyScope,
      premise: customPremise,
      protagonist
    });

    const rootContent = inception.openingHook;
    const initialLore = inception.initialLore || [];

    const rootNode: TreeNode = {
      id: rootNodeId,
      treeId: storyId,
      parentNodeId: null,
      title: 'Chapter 1: The Beginning',
      content: rootContent,
      authorType: 'HUMAN',
      status: 'CANON_PATH',
      coherenceScore: 100,
      depth: 0,
      wordCount: rootContent.split(/\s+/).filter(Boolean).length,
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
      loreBible: initialLore,
      styleConfig: {
        genre,
        pacing: 'Balanced',
        tone,
        dialogueDensity: 'Balanced',
        storyScope
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    this.currentTree.set(newTree);
    this.selectedNodeId.set(rootNodeId);
    this.loreBible.set(initialLore);
    this.styleConfig.set(newTree.styleConfig!);
    this.activeAiSuggestions.set([]);
    this.previousChapterContent.set(null);
    this.saveToStorage(newTree);
  }

  resetToDemoStory(): void {
    this.currentTree.set(NARRATIVE_STORY_TREE);
    this.selectedNodeId.set(NARRATIVE_STORY_TREE.rootNodeId);
    this.loreBible.set(NARRATIVE_STORY_TREE.loreBible || DEFAULT_LORE);
    this.styleConfig.set(NARRATIVE_STORY_TREE.styleConfig || DEFAULT_STYLE);
    this.previousChapterContent.set(null);
    this.saveToStorage(NARRATIVE_STORY_TREE);
  }

  addLoreEntity(entity: Omit<LoreEntity, 'id'>): void {
    const newEntity: LoreEntity = {
      ...entity,
      id: `lore-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
    };
    this.loreBible.update(list => [...list, newEntity]);
    this.saveToStorage(this.currentTree());
  }

  batchAddLoreEntities(entities: LoreEntity[]): void {
    this.loreBible.update(existing => {
      const existingIds = new Set(existing.map(e => e.id));
      const existingNames = new Set(existing.map(e => e.name.toLowerCase().trim()));
      
      const newItems = entities.filter(e => {
        return !existingIds.has(e.id) && !existingNames.has(e.name.toLowerCase().trim());
      });
      return [...existing, ...newItems];
    });
    this.saveToStorage(this.currentTree());
  }

  batchAddDiscoveredEntities(entities: DiscoveredEntity[]): void {
    const formatted: LoreEntity[] = entities.map((e, idx) => ({
      id: `lore-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: e.name,
      category: e.category,
      description: e.description,
      traits: e.traits
    }));
    this.batchAddLoreEntities(formatted);
  }

  async extractLoreFromActiveChapter(): Promise<void> {
    const node = this.selectedNode();
    if (!node || !node.content || node.content.trim().length === 0) return;

    this.isExtractingLore.set(true);
    try {
      const style = this.styleConfig();
      const suggestions = await this.aiService.generateLoreBibleFromProse(
        node.content,
        style.genre,
        style.tone
      );
      this.extractedLoreSuggestions.set(suggestions);
      this.isLoreGenModalOpen.set(true);
    } catch (err) {
      console.error('Failed to extract lore from chapter prose:', err);
    } finally {
      this.isExtractingLore.set(false);
    }
  }

  closeLoreGenModal(): void {
    this.isLoreGenModalOpen.set(false);
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
    const style = this.styleConfig();
    const tree = this.currentTree();

    // Walk the canon chain from root instead of the active breadcrumb trail
    const canonTrail: TreeNode[] = [];
    let currentId: string | null = tree.rootNodeId;
    const visited = new Set<string>();

    while (currentId && tree.nodes[currentId]) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      canonTrail.push(tree.nodes[currentId]);
      // Find the CANON_PATH child at this depth, fall back to first ACTIVE child
      const children = Object.values(tree.nodes).filter(n => n.parentNodeId === currentId && n.status !== 'PRUNED');
      const canonChild = children.find(c => c.status === 'CANON_PATH');
      currentId = canonChild?.id || children[0]?.id || null;
    }

    let manuscript = `# ${tree.title}\n\n`;
    manuscript += `*Genre: ${style.genre} | Tone: ${style.tone}*\n\n`;
    manuscript += `---\n\n`;

    canonTrail.forEach((chapter, idx) => {
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
    // Reconcile canon paths: ensure at most 1 CANON_PATH sibling per parent
    const reconciledNodes = { ...story.nodes };
    const parentGroups = new Map<string, string[]>();
    Object.values(reconciledNodes).forEach(n => {
      if (n.parentNodeId && n.status === 'CANON_PATH') {
        const group = parentGroups.get(n.parentNodeId) || [];
        group.push(n.id);
        parentGroups.set(n.parentNodeId, group);
      }
    });
    parentGroups.forEach(canonIds => {
      if (canonIds.length > 1) {
        // Keep the first, demote the rest
        canonIds.slice(1).forEach(id => {
          reconciledNodes[id] = { ...reconciledNodes[id], status: 'ACTIVE' };
        });
      }
    });
    const reconciledStory = { ...story, nodes: reconciledNodes };

    this.currentTree.set(reconciledStory);
    this.selectedNodeId.set(reconciledStory.rootNodeId || Object.keys(reconciledStory.nodes)[0] || '');
    this.loreBible.set(reconciledStory.loreBible || []);
    this.styleConfig.set(reconciledStory.styleConfig || DEFAULT_STYLE);
    this.previousChapterContent.set(null);
    this.saveToStorage(reconciledStory);
    this.markCloudBaseline(reconciledStory);
  }

  /**
   * Returns true only when loading a cloud copy would replace an unsynced
   * local draft in the currently active account workspace.
   */
  needsCloudLoadConfirmation(story: StoryTree): boolean {
    if (!this.hasStoredTreeForActiveScope() || !this.hasUnsyncedLocalChanges()) {
      return false;
    }
    return this.storyFingerprint(this.currentTree()) !== this.storyFingerprint(story);
  }

  hasUnsyncedLocalChanges(): boolean {
    if (typeof window === 'undefined' || !window.localStorage || !this.supabase.isAuthenticated()) {
      return false;
    }

    const baseline = window.localStorage.getItem(this.cloudBaselineStorageKey());
    return !baseline || baseline !== this.storyFingerprint(this.currentTree());
  }

  markCurrentTreeAsSynced(): void {
    if (this.supabase.isAuthenticated()) {
      this.markCloudBaseline(this.currentTree());
    }
  }

  applyCloudRevision(revision: number): void {
    const updated = { ...this.currentTree(), cloudRevision: revision };
    this.currentTree.set(updated);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.activeStoryStorageKey(), JSON.stringify(this.toStoragePayload(updated)));
      }
    } catch {}
  }

  private saveToStorage(tree: StoryTree): void {
    try {
      const payload = this.toStoragePayload(tree);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.activeStoryStorageKey(), JSON.stringify(payload));
      }

      // Auto-sync to Supabase PostgreSQL when user is authenticated
      const accountId = this.supabase.currentUser()?.id;
      if (accountId) {
        if (this.cloudSyncDebounceTimer) {
          clearTimeout(this.cloudSyncDebounceTimer);
        }
        const version = ++this.cloudSyncVersion;
        const storageScope = this.activeStorageScope;
        this.cloudSyncDebounceTimer = setTimeout(
          () => this.enqueueCloudSync(version, payload, storageScope, accountId),
          1500
        );
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Serialize cloud writes. Debouncing alone does not prevent an older request
   * that is already in flight from completing after a newer edit.
   */
  private enqueueCloudSync(version: number, payload: StoryTree, storageScope: string, accountId: string): void {
    this.cloudSyncQueue = this.cloudSyncQueue
      .catch(() => undefined)
      .then(async () => {
        // A queued write must not follow the user into a different account or
        // survive a sign-out while it waits behind another request.
        if (
          version < this.cloudSyncVersion ||
          storageScope !== this.activeStorageScope ||
          accountId !== this.supabase.currentUser()?.id
        ) return;

        const result = await this.supabase.syncStoryToCloud(payload);
        if (result.success) {
          if (result.revision !== undefined && payload.id === this.currentTree().id) {
            this.applyCloudRevision(result.revision);
          }
          this.markCloudBaseline(payload, storageScope);
        }
      })
      .catch(() => undefined);
  }

  private loadInitialTree(): StoryTree {
    const anonymousTree = this.readStoredTree(this.activeStoryStorageKey(ANONYMOUS_STORAGE_SCOPE));
    if (anonymousTree) return anonymousTree;

    // One-time, non-destructive migration of the pre-v0.5.3 shared workspace.
    const legacyTree = this.readStoredTree(STORAGE_KEY);
    if (legacyTree) {
      try {
        window.localStorage.setItem(this.activeStoryStorageKey(ANONYMOUS_STORAGE_SCOPE), JSON.stringify(legacyTree));
      } catch {
        // The legacy draft remains readable if browser storage is full.
      }
      return legacyTree;
    }

    return NARRATIVE_STORY_TREE;
  }

  private switchStorageScope(userId: string | null): void {
    const nextScope = userId ? `user:${userId}` : ANONYMOUS_STORAGE_SCOPE;
    if (nextScope === this.activeStorageScope) return;

    if (this.cloudSyncDebounceTimer) {
      clearTimeout(this.cloudSyncDebounceTimer);
      this.cloudSyncDebounceTimer = null;
    }
    // Invalidate writes captured under the previous account/workspace.
    this.cloudSyncVersion++;
    this.activeStorageScope = nextScope;

    const storedTree = this.readStoredTree(this.activeStoryStorageKey());
    const nextTree = storedTree || NARRATIVE_STORY_TREE;
    this.currentTree.set(nextTree);
    this.selectedNodeId.set(nextTree.rootNodeId || Object.keys(nextTree.nodes)[0] || '');
    this.loreBible.set(nextTree.loreBible || (nextTree.id === NARRATIVE_STORY_TREE.id ? DEFAULT_LORE : []));
    this.styleConfig.set(nextTree.styleConfig || DEFAULT_STYLE);
    this.previousChapterContent.set(null);
    this.activeAiSuggestions.set([]);
  }

  private activeStoryStorageKey(scope = this.activeStorageScope): string {
    return `${STORAGE_KEY}:${scope}`;
  }

  private cloudBaselineStorageKey(scope = this.activeStorageScope): string {
    return `${CLOUD_BASELINE_KEY}:${scope}`;
  }

  private hasStoredTreeForActiveScope(): boolean {
    return this.readStoredTree(this.activeStoryStorageKey()) !== null;
  }

  private readStoredTree(storageKey: string): StoryTree | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.rootNodeId && parsed?.nodes ? parsed as StoryTree : null;
    } catch {
      return null;
    }
  }

  private toStoragePayload(tree: StoryTree): StoryTree {
    return {
      ...tree,
      loreBible: this.loreBible(),
      styleConfig: this.styleConfig()
    };
  }

  private storyFingerprint(tree: StoryTree): string {
    return JSON.stringify(this.toStoragePayload(tree));
  }

  private markCloudBaseline(tree: StoryTree, storageScope = this.activeStorageScope): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.cloudBaselineStorageKey(storageScope), this.storyFingerprint(tree));
      }
    } catch {
      // Baselines improve conflict detection but must not block writing.
    }
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
