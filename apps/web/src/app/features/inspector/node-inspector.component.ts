import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { AuthorType, ChapterBeatFocus, DiscoveredEntity } from '../../core/models/graph.models';
import { LoreBibleComponent } from './lore-bible.component';

type InspectorTab = 'EDITOR' | 'LORE' | 'COHERENCE';

@Component({
  selector: 'app-node-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, LoreBibleComponent],
  templateUrl: './node-inspector.component.html',
  styleUrl: './node-inspector.component.css'
})
export class NodeInspectorComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly Math = Math;

  readonly activeTab = signal<InspectorTab>('EDITOR');
  readonly showNewBranchForm = signal<boolean>(false);
  readonly showExpandWarningModal = signal<boolean>(false);
  pendingAction: 'EXPAND' | 'PARAGRAPH' = 'EXPAND';
  selectedBeatFocus: ChapterBeatFocus = 'BALANCED';

  // In-Flight Entity Discovery
  discoveredEntities = signal<DiscoveredEntity[]>([]);

  // Mobile Bottom Sheet Height State
  mobileSheetState = signal<'PEEK' | 'HALF' | 'FULL'>('HALF');

  toggleMobileSheet(): void {
    const cur = this.mobileSheetState();
    if (cur === 'PEEK') this.mobileSheetState.set('HALF');
    else if (cur === 'HALF') this.mobileSheetState.set('FULL');
    else this.mobileSheetState.set('PEEK');
  }

  setMobileSheetState(state: 'PEEK' | 'HALF' | 'FULL'): void {
    this.mobileSheetState.set(state);
  }

  readonly hasStoryContent = computed<boolean>(() => {
    const node = this.store.selectedNode();
    return !!(node && node.content && node.content.trim().length >= 10);
  });

  newBranchTitle = '';
  newBranchContent = '';
  newBranchAuthor: AuthorType = 'HUMAN';
  mergeTargetId = '';

  readonly mergeCandidates = computed(() => {
    const active = this.store.selectedNode();
    if (!active) return [];
    return Object.values(this.store.currentTree().nodes)
      .filter(node => node.status !== 'PRUNED' && this.store.canLinkNodes(active.id, node.id))
      .sort((left, right) => left.depth - right.depth || left.title.localeCompare(right.title));
  });

  onTitleChange(title: string): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.updateNode(active.id, { title });
    }
  }

  onContentChange(content: string): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.updateNode(active.id, { content });
    }
  }

  submitTimelineMerge(): void {
    const active = this.store.selectedNode();
    if (!active || !this.mergeTargetId) return;
    if (this.store.linkExistingNode(active.id, this.mergeTargetId)) {
      this.mergeTargetId = '';
    }
  }

  handleExpandClick(): void {
    if (this.store.activeChildren().length > 0) {
      this.pendingAction = 'EXPAND';
      this.showExpandWarningModal.set(true);
    } else {
      this.executeAIWrite('EXPAND');
    }
  }

  handleAppendParaClick(): void {
    if (this.store.activeChildren().length > 0) {
      this.pendingAction = 'PARAGRAPH';
      this.showExpandWarningModal.set(true);
    } else {
      this.executeAIWrite('PARAGRAPH');
    }
  }

  proceedWithPruneChildren(): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.pruneChildrenOf(active.id);
    }
    this.showExpandWarningModal.set(false);
    this.executeAIWrite(this.pendingAction);
  }

  proceedWithDeleteChildren(): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.deleteChildrenOf(active.id);
    }
    this.showExpandWarningModal.set(false);
    this.executeAIWrite(this.pendingAction);
  }

  private async executeAIWrite(action: 'EXPAND' | 'PARAGRAPH'): Promise<void> {
    if (action === 'EXPAND') {
      await this.store.expandActiveChapter({
        targetLength: 'FULL_CHAPTER',
        focusBeat: this.selectedBeatFocus
      });
    } else {
      await this.store.appendNextParagraph();
    }

    // Run in-flight entity harvester
    const active = this.store.selectedNode();
    if (active && active.content) {
      const harvested = this.aiService.harvestUnregisteredEntities(active.content, this.store.loreBible());
      this.discoveredEntities.set(harvested);
    }
  }

  addHarvestedEntity(entity: DiscoveredEntity): void {
    this.store.addLoreEntity({
      name: entity.name,
      category: entity.category,
      description: entity.description,
      traits: entity.traits
    });
    this.discoveredEntities.update(list => list.filter(e => e.name.toLowerCase() !== entity.name.toLowerCase()));
  }

  addAllHarvestedEntities(): void {
    this.store.batchAddDiscoveredEntities(this.discoveredEntities());
    this.discoveredEntities.set([]);
  }

  dismissHarvestedEntities(): void {
    this.discoveredEntities.set([]);
  }

  submitNewBranch(): void {
    const active = this.store.selectedNode();
    if (!active) return;

    this.store.addBranch(
      active.id,
      this.newBranchTitle,
      this.newBranchContent,
      this.newBranchAuthor
    );

    this.newBranchTitle = '';
    this.newBranchContent = '';
    this.showNewBranchForm.set(false);
  }
}
