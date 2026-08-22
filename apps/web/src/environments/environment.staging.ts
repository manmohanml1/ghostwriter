import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: true,
  name: 'stage',
  version: '0.5.0-preview',
  appTitle: 'Ghostwriter Studio (Staging Preview)',
  supabase: {
    url: 'https://ghostwriter-staging.supabase.co',
    anonKey: 'staging_anon_key',
    authEnabled: true,
    autoSyncIntervalMs: 30000
  },
  features: {
    aiProviders: true,
    multiProviderFailover: true,
    offlineHeuristicFallback: true,
    loreBible: true,
    storyReader: true,
    manuscriptExport: true
  },
  limits: {
    maxNodesPerGraph: 1000,
    maxLoreEntities: 100,
    targetChapterWords: 2000
  }
};
