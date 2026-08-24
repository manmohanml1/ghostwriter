import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { LoreEntity } from '../../core/models/graph.models';

@Component({
  selector: 'app-lore-bible',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lore-bible.component.html',
  styleUrl: './lore-bible.component.css'
})
export class LoreBibleComponent {
  readonly store = inject(TreeStore);

  readonly showAddModal = signal<boolean>(false);
  newName = '';
  newCategory: LoreEntity['category'] = 'CHARACTER';
  newDesc = '';
  newTraits = '';

  getCategoryEmoji(category: LoreEntity['category']): string {
    switch (category) {
      case 'CHARACTER': return '👤';
      case 'ITEM': return '🗝';
      case 'LOCATION': return '📍';
      case 'FACTION': return '🛡';
    }
  }

  saveEntity(): void {
    if (!this.newName.trim()) return;

    this.store.addLoreEntity({
      name: this.newName.trim(),
      category: this.newCategory,
      description: this.newDesc.trim(),
      traits: this.newTraits.split(',').map(t => t.trim()).filter(t => t.length > 0)
    });

    this.newName = '';
    this.newDesc = '';
    this.newTraits = '';
    this.showAddModal.set(false);
  }
}
