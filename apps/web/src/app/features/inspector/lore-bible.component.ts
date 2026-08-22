import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { LoreEntity } from '../../core/models/graph.models';

@Component({
  selector: 'app-lore-bible',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lore-panel">
      <div class="lore-header">
        <div>
          <h4 class="lore-title">📜 World Lore & Character Bible</h4>
          <p class="lore-desc">Grounds the AI so continuations preserve established facts.</p>
        </div>
        <button class="btn-add-lore" (click)="showAddModal.set(true)">＋ Add Entity</button>
      </div>

      <!-- Lore Entities List -->
      <div class="lore-list">
        @for (entity of store.loreBible(); track entity.id) {
          <div class="lore-card" [attr.data-cat]="entity.category">
            <div class="card-header">
              <span class="category-badge">{{ getCategoryEmoji(entity.category) }} {{ entity.category }}</span>
              <button class="btn-delete" (click)="store.removeLoreEntity(entity.id)" title="Delete Entity">✕</button>
            </div>
            <h5 class="entity-name">{{ entity.name }}</h5>
            <p class="entity-desc">{{ entity.description }}</p>
            <div class="traits-row">
              @for (trait of entity.traits; track $index) {
                <span class="trait-pill">{{ trait }}</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Add Lore Modal / Box -->
      @if (showAddModal()) {
        <div class="add-box">
          <h5 class="add-title">Add Lore Entity</h5>
          <div class="form-row">
            <input type="text" [(ngModel)]="newName" placeholder="Entity Name (e.g. Detective Kael)" class="lore-input" />
            <select [(ngModel)]="newCategory" class="lore-select">
              <option value="CHARACTER">👤 Character</option>
              <option value="ITEM">🗝 Item / Relic</option>
              <option value="LOCATION">📍 Location</option>
              <option value="FACTION">🛡 Faction / Corp</option>
            </select>
          </div>
          <textarea [(ngModel)]="newDesc" rows="2" placeholder="Description and background facts..." class="lore-textarea"></textarea>
          <input type="text" [(ngModel)]="newTraits" placeholder="Traits (comma-separated, e.g. Cyber-arm, Veteran)" class="lore-input" />

          <div class="flex gap-2 justify-end mt-2">
            <button class="btn-cancel" (click)="showAddModal.set(false)">Cancel</button>
            <button class="btn-save" (click)="saveEntity()">Save to Bible</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .lore-panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .lore-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .lore-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }

    .lore-desc {
      font-size: 11px;
      color: #94a3b8;
    }

    .btn-add-lore {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .lore-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .lore-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .category-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #1e293b;
      color: #cbd5e1;
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-delete:hover {
      color: #ef4444;
    }

    .entity-name {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }

    .entity-desc {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
    }

    .traits-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }

    .trait-pill {
      font-size: 9px;
      background: rgba(168, 85, 247, 0.12);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.25);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .add-box {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid #7c3aed;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .add-title {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
    }

    .form-row {
      display: flex;
      gap: 6px;
    }

    .lore-input, .lore-select, .lore-textarea {
      background: #0b1120;
      border: 1px solid #334155;
      color: #f8fafc;
      font-size: 11px;
      padding: 6px 8px;
      border-radius: 6px;
      outline: none;
    }

    .lore-input {
      flex: 1;
    }

    .lore-textarea {
      resize: vertical;
    }

    .btn-save {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }
  `]
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
