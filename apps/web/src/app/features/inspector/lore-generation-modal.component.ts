import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { LoreEntity } from '../../core/models/graph.models';

interface EditableLoreEntity extends LoreEntity {
  selected: boolean;
  traitsString: string;
}

@Component({
  selector: 'app-lore-generation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lore-generation-modal.component.html',
  styleUrl: './lore-generation-modal.component.css'
})
export class LoreGenerationModalComponent {
  readonly store = inject(TreeStore);

  readonly entities = signal<EditableLoreEntity[]>([]);

  constructor() {
    effect(() => {
      const raw = this.store.extractedLoreSuggestions();
      this.entities.set(
        raw.map(item => ({
          ...item,
          selected: true,
          traitsString: (item.traits || []).join(', ')
        }))
      );
    }, { allowSignalWrites: true });
  }

  selectedCount(): number {
    return this.entities().filter(e => e.selected).length;
  }

  closeOnBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.store.closeLoreGenModal();
    }
  }

  removeDraftEntity(id: string): void {
    this.entities.update(list => list.filter(e => e.id !== id));
  }

  addNewBlankEntity(): void {
    const newId = `lore-custom-${Date.now()}`;
    const newDraft: EditableLoreEntity = {
      id: newId,
      name: '',
      category: 'CHARACTER',
      description: '',
      traits: [],
      traitsString: '',
      selected: true
    };
    this.entities.update(list => [...list, newDraft]);
  }

  applyLoreToStory(): void {
    const approved = this.entities()
      .filter(e => e.selected && e.name.trim().length > 0)
      .map(e => ({
        id: e.id,
        name: e.name.trim(),
        category: e.category,
        description: e.description.trim(),
        traits: e.traitsString.split(',').map(t => t.trim()).filter(Boolean)
      }));

    if (approved.length > 0) {
      this.store.batchAddLoreEntities(approved);
    }
    this.store.closeLoreGenModal();
  }
}
