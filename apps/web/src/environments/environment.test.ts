import { AppEnvironment } from './environment.interface';

export const environment: AppEnvironment = {
  production: false,
  name: 'test',
  version: '0.5.0-test',
  appTitle: 'Ghostwriter Studio (CI Test Runner)',
  supabase: {
    url: 'https://test-fixture.supabase.co',
    anonKey: 'test_anon_key_mock',
    authEnabled: false,
    autoSyncIntervalMs: 0
  },
  features: {
    aiProviders: false,
    multiProviderFailover: true,
    offlineHeuristicFallback: true,
    loreBible: true,
    storyReader: true,
    manuscriptExport: true
  },
  limits: {
    maxNodesPerGraph: 50,
    maxLoreEntities: 10,
    targetChapterWords: 500
  }
};
