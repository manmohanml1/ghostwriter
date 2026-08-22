/**
 * Author / Generator of a narrative chapter or decision node
 */
export type AuthorType = 'HUMAN' | 'AGENT' | 'SYSTEM';

/**
 * Status lifecycle of an individual chapter in the story tree
 */
export type NodeStatus = 'ACTIVE' | 'EXPLORING' | 'PRUNED' | 'CANON_PATH';

/**
 * Edge relationship between narrative nodes
 */
export type EdgeType = 'BRANCH' | 'MERGE' | 'REBASE';

/**
 * View modes supported in Ghostwriter
 */
export type ViewMode = 'CANVAS' | 'READER';

/**
 * Reader themes matching modern webnovel and e-reader standards
 */
export type ReaderTheme = 'DARK_SLATE' | 'OLED_BLACK' | 'WARM_SEPIA' | 'NOVEL_PAPER';

/**
 * Supported AI Inference Providers
 */
export type AIProviderType = 'GEMINI' | 'GROQ' | 'OFFLINE';

/**
 * Provider operational status
 */
export type ProviderHealthStatus = 'HEALTHY' | 'RATE_LIMITED' | 'ERROR' | 'OFFLINE';

/**
 * Real-time telemetry for AI provider routing
 */
export interface AIProviderTelemetry {
  activeProvider: AIProviderType;
  geminiStatus: ProviderHealthStatus;
  groqStatus: ProviderHealthStatus;
  lastLatencyMs?: number;
  failoverNotice?: string;
}

/**
 * Target length for chapter generation
 */
export type TargetChapterLength = 'SCENE_SNIPPET' | 'FULL_CHAPTER' | 'EPIC_LONGFORM';

/**
 * Narrative beat focus for AI chapter expansion
 */
export type ChapterBeatFocus = 'BALANCED' | 'ACTION_CONFRONTATION' | 'CHARACTER_DIALOGUE' | 'INVESTIGATION_LORE' | 'CLIFFHANGER_CLIMAX';

/**
 * Options guiding full chapter expansion
 */
export interface ChapterGenerationOptions {
  targetLength: TargetChapterLength;
  focusBeat: ChapterBeatFocus;
  sceneGoal?: string;
}

/**
 * Evaluation score across narrative dimensions
 */
export interface NarrativeScore {
  perspectiveName: string;
  score: number;
  reasoning: string;
}

/**
 * Character, item, location, or faction entity stored in the Lore Bible
 */
export interface LoreEntity {
  id: string;
  name: string;
  category: 'CHARACTER' | 'ITEM' | 'LOCATION' | 'FACTION';
  description: string;
  traits: string[];
}

/**
 * Style and tone settings guiding AI co-writer generation
 */
export interface StoryStyleConfig {
  genre: 'Cyberpunk' | 'Noir Mystery' | 'Dark Fantasy' | 'Hard Sci-Fi' | 'Gothic Thriller';
  pacing: 'Methodical' | 'Balanced' | 'Fast-Paced';
  tone: 'Gritty & Dark' | 'Dramatic' | 'Whimsical' | 'Suspenseful';
  dialogueDensity: 'Narrative-Focused' | 'Balanced' | 'Dialogue-Heavy';
}

/**
 * AI-generated branch hypothesis suggested for story continuation
 */
export interface AIBranchSuggestion {
  id?: string;
  title: string;
  content: string;
  persona: string;
  coherenceScore: number;
  rationale: string;
}

/**
 * An individual story chapter or decision node
 */
export interface TreeNode {
  id: string;
  treeId: string;
  parentNodeId: string | null;
  title: string;
  content: string; // GitHub-flavored Markdown
  authorType: AuthorType;
  agentPersona?: string;
  status: NodeStatus;
  coherenceScore: number | null;
  perspectiveScores?: NarrativeScore[];
  depth: number;
  wordCount?: number;
  readTimeMinutes?: number;
  position?: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

/**
 * Directed edge connecting two narrative choices in the story tree
 */
export interface TreeEdge {
  id: string;
  treeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  label?: string;
}

/**
 * The root container representing a full branching story
 */
export interface StoryTree {
  id: string;
  title: string;
  description: string;
  genre?: string;
  rootNodeId: string;
  nodes: Record<string, TreeNode>; // Keyed by nodeId for O(1) lookups
  edges: TreeEdge[];
  loreBible?: LoreEntity[];
  styleConfig?: StoryStyleConfig;
  createdAt: string;
  updatedAt: string;
  version: number;
}
