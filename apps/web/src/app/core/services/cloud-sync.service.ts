import { Injectable, signal } from '@angular/core';
import { StoryTree } from '../models/graph.models';

export type SyncState = 'LOCAL_ONLY' | 'SYNCING' | 'SYNCED' | 'OFFLINE';

@Injectable({
  providedIn: 'root'
})
export class CloudSyncService {
  readonly syncState = signal<SyncState>('LOCAL_ONLY');
  readonly lastSyncTimestamp = signal<string | null>(null);

  /**
   * Export story snapshot to remote backup / cloud gist
   */
  async createCloudSnapshot(tree: StoryTree): Promise<{ success: boolean; snapshotUrl?: string }> {
    this.syncState.set('SYNCING');
    await new Promise(r => setTimeout(r, 600)); // Simulated sync network hop

    this.lastSyncTimestamp.set(new Date().toLocaleTimeString());
    this.syncState.set('SYNCED');
    return {
      success: true,
      snapshotUrl: `https://ghostwriter.app/s/${tree.id}`
    };
  }
}
