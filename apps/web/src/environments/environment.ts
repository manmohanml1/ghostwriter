import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'dev',
  version: '0.5.3',
  appTitle: 'Ghostwriter Studio (Development)',
  supabase: {
    url: 'https://yeamtarykhvoaoszzeag.supabase.co',
    anonKey: 'sb_publishable_ezfF9cgRUG6WzIGJPAmr5w_XcONjsYI',
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
