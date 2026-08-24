import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'dev',
  version: '0.5.3',
  appTitle: 'Ghostwriter Studio (Development)',
  supabase: {
    url: 'https://wuzasgwsyyukhhrwehau.supabase.co',
    anonKey: 'sb_publishable_6h20KrE1Oya2-AGjFleRFQ_42GdlnDW',
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
