import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: true,
  name: 'prod',
  version: '0.5.3',
  appTitle: 'Ghostwriter Studio',
  supabase: {
    url: 'https://wuzasgwsyyukhhrwehau.supabase.co',
    anonKey: 'sb_publishable_6h20KrE1Oya2-AGjFleRFQ_42GdlnDW',
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
    maxNodesPerGraph: 2000,
    maxLoreEntities: 250,
    targetChapterWords: 2500
  }
};
