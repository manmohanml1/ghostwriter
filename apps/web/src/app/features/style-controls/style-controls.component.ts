import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { StoryStyleConfig } from '../../core/models/graph.models';

@Component({
  selector: 'app-style-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="style-toolbar">
      <div class="control-item">
        <label class="control-label">Genre</label>
        <select 
          [ngModel]="store.styleConfig().genre"
          (ngModelChange)="updateGenre($event)"
          class="control-select"
        >
          <option value="Cyberpunk">🌆 Cyberpunk</option>
          <option value="Noir Mystery">🕵️ Noir Mystery</option>
          <option value="Dark Fantasy">⚔️ Dark Fantasy</option>
          <option value="Hard Sci-Fi">🚀 Hard Sci-Fi</option>
          <option value="Gothic Thriller">🏰 Gothic Thriller</option>
        </select>
      </div>

      <div class="control-item">
        <label class="control-label">Pacing</label>
        <select 
          [ngModel]="store.styleConfig().pacing"
          (ngModelChange)="updatePacing($event)"
          class="control-select"
        >
          <option value="Methodical">🐢 Methodical / Slow-Burn</option>
          <option value="Balanced">⚖️ Balanced</option>
          <option value="Fast-Paced">⚡ Fast-Paced / Action</option>
        </select>
      </div>

      <div class="control-item">
        <label class="control-label">Tone</label>
        <select 
          [ngModel]="store.styleConfig().tone"
          (ngModelChange)="updateTone($event)"
          class="control-select"
        >
          <option value="Gritty & Dark">🌑 Gritty & Dark</option>
          <option value="Dramatic">🎭 Dramatic</option>
          <option value="Suspenseful">⏳ Suspenseful</option>
          <option value="Whimsical">✨ Whimsical</option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .style-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      padding: 6px 14px;
      border-radius: 12px;
    }

    .control-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .control-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .control-select {
      background: #0b1120;
      border: 1px solid #334155;
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
    }

    .control-select:focus {
      border-color: #a855f7;
    }
  `]
})
export class StyleControlsComponent {
  readonly store = inject(TreeStore);

  updateGenre(genre: StoryStyleConfig['genre']): void {
    this.store.updateStyleConfig({ genre });
  }

  updatePacing(pacing: StoryStyleConfig['pacing']): void {
    this.store.updateStyleConfig({ pacing });
  }

  updateTone(tone: StoryStyleConfig['tone']): void {
    this.store.updateStyleConfig({ tone });
  }
}
