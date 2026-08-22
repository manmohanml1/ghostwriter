export type EnvironmentName = 'dev' | 'test' | 'stage' | 'prod';

export interface AppEnvironment {
  production: boolean;
  name: EnvironmentName;
  version: string;
  appTitle: string;
  supabase: {
    url: string;
    anonKey: string;
    authEnabled: boolean;
    autoSyncIntervalMs: number;
  };
  features: {
    aiProviders: boolean;
    multiProviderFailover: boolean;
    offlineHeuristicFallback: boolean;
    loreBible: boolean;
    storyReader: boolean;
    manuscriptExport: boolean;
  };
  limits: {
    maxNodesPerGraph: number;
    maxLoreEntities: number;
    targetChapterWords: number;
  };
}
