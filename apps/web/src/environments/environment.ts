import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'dev',
  version: '0.5.0-dev',
  appTitle: 'Ghostwriter Studio (Development)',
  supabase: {
    url: 'https://ghostwriter-demo.supabase.co',
    anonKey: 'dummy_anon_key_for_local_dev',
    authEnabled: true,
    autoSyncIntervalMs: 15000
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
    maxNodesPerGraph: 500,
    maxLoreEntities: 50,
    targetChapterWords: 1500
  }
};
