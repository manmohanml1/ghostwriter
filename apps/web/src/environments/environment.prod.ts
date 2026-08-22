import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: true,
  name: 'prod',
  version: '0.5.0',
  appTitle: 'Ghostwriter Studio',
  supabase: {
    url: 'https://ghostwriter-prod.supabase.co',
    anonKey: 'production_anon_key',
    authEnabled: true,
    autoSyncIntervalMs: 60000
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
    maxNodesPerGraph: 2000,
    maxLoreEntities: 250,
    targetChapterWords: 2500
  }
};
