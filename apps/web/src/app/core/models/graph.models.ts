export type AuthorType = 'HUMAN' | 'AGENT' | 'SYSTEM';
export type NodeStatus = 'ACTIVE' | 'EXPLORING' | 'PRUNED' | 'CANON_PATH';
export type EdgeType = 'BRANCH' | 'MERGE' | 'REBASE';
export type ViewMode = 'CANVAS' | 'READER';
export type ReaderTheme = 'DARK_SLATE' | 'OLED_BLACK' | 'WARM_SEPIA' | 'NOVEL_PAPER';

export type AIProviderType = 'GEMINI' | 'GROQ' | 'OFFLINE';
export type ProviderHealthStatus = 'HEALTHY' | 'RATE_LIMITED' | 'ERROR' | 'OFFLINE';

export interface AIProviderTelemetry {
  activeProvider: AIProviderType;
  geminiStatus: ProviderHealthStatus;
  groqStatus: ProviderHealthStatus;
  lastLatencyMs?: number;
  failoverNotice?: string;
}

export type TargetChapterLength = 'SCENE_SNIPPET' | 'FULL_CHAPTER' | 'EPIC_LONGFORM';
export type ChapterBeatFocus = 'BALANCED' | 'ACTION_CONFRONTATION' | 'CHARACTER_DIALOGUE' | 'INVESTIGATION_LORE' | 'CLIFFHANGER_CLIMAX';

export interface ChapterGenerationOptions {
  targetLength: TargetChapterLength;
  focusBeat: ChapterBeatFocus;
  sceneGoal?: string;
}

export interface NarrativeScore {
  perspectiveName: string;
  score: number;
  reasoning: string;
}

export interface LoreEntity {
  id: string;
  name: string;
  category: 'CHARACTER' | 'ITEM' | 'LOCATION' | 'FACTION';
  description: string;
  traits: string[];
}

export type StoryScope = 'SHORT' | 'MEDIUM' | 'LONG' | 'EPIC';

export interface DiscoveredEntity {
  name: string;
  category: 'CHARACTER' | 'ITEM' | 'LOCATION' | 'FACTION';
  description: string;
  traits: string[];
  alreadyInBible?: boolean;
}

export interface StoryStyleConfig {
  genre: 'Cyberpunk' | 'Noir Mystery' | 'Dark Fantasy' | 'Hard Sci-Fi' | 'Gothic Thriller' | string;
  pacing: 'Methodical' | 'Balanced' | 'Fast-Paced';
  tone: 'Gritty & Dark' | 'Dramatic' | 'Whimsical' | 'Suspenseful' | string;
  dialogueDensity: 'Narrative-Focused' | 'Balanced' | 'Dialogue-Heavy';
  storyScope?: StoryScope;
}

export interface AIBranchSuggestion {
  id?: string;
  sourceNodeId?: string;
  title: string;
  content: string;
  persona: string;
  coherenceScore: number;
  rationale: string;
}

export interface TreeNode {
  id: string;
  treeId: string;
  parentNodeId: string | null;
  title: string;
  content: string;
  summary?: string;
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

export interface TreeEdge {
  id: string;
  treeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  label?: string;
}

export interface ProtagonistProfile {
  name: string;
  gender: string;
  traits: string[];
}

export interface StoryInceptionRequest {
  title: string;
  genre: string;
  tone: string;
  scope: StoryScope;
  premise?: string;
  protagonist?: ProtagonistProfile;
}

export interface StoryInceptionResult {
  openingHook: string;
  initialLore: LoreEntity[];
}

export interface SeedHookOptions {
  title?: string;
  genre: StoryStyleConfig['genre'];
  tone?: StoryStyleConfig['tone'];
  pacing?: StoryStyleConfig['pacing'];
}

export interface LoreGateStatus {
  canBranch: boolean;
  requiredAnchorCount: number;
  currentAnchorCount: number;
  message?: string;
}

export interface StoryTree {
  id: string;
  title: string;
  description: string;
  genre?: string;
  rootNodeId: string;
  nodes: Record<string, TreeNode>;
  edges: TreeEdge[];
  loreBible?: LoreEntity[];
  styleConfig?: StoryStyleConfig;
  createdAt: string;
  updatedAt: string;
  version: number;
}


