import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: true,
  name: 'stage',
  version: '0.5.2-stage',
  appTitle: 'Ghostwriter Studio (Staging Preview)',
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
    maxNodesPerGraph: 1000,
    maxLoreEntities: 100,
    targetChapterWords: 2000
  }
};
