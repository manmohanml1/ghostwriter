import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { StoryStyleConfig } from '../../core/models/graph.models';

@Component({
  selector: 'app-style-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './style-controls.component.html',
  styleUrl: './style-controls.component.css'
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
