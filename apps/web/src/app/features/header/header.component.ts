import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { StoryStyleConfig, StoryScope, ProtagonistProfile } from '../../core/models/graph.models';
import { StyleControlsComponent } from '../style-controls/style-controls.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, StyleControlsComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly supabase = inject(SupabaseService);
  readonly appVersion = environment.version;

  readonly openSettingsEvent = output<void>();
  readonly openAuthEvent = output<void>();
  readonly openMobileMenuEvent = output<void>();

  readonly showExportMenu = signal<boolean>(false);
  readonly showStoryMenu = signal<boolean>(false);
  readonly showNewStoryModal = signal<boolean>(false);
  readonly showResetDemoModal = signal<boolean>(false);
  readonly isCreatingStory = signal<boolean>(false);

  newStoryTitle = 'The Quantum Cipher';
  newStoryGenre: StoryStyleConfig['genre'] = 'Cyberpunk';
  newStoryTone: StoryStyleConfig['tone'] = 'Gritty & Dark';
  newStoryScope: StoryScope = 'MEDIUM';
  newStoryCustomPremise = '';

  // Protagonist (MC) Profile
  mcName = 'Derek';
  mcGender = 'Male (he/him)';
  availableTraits: string[] = [
    'Cynical', 'Tech-Savvy', 'Determined', 'Haunted', 'Resourceful',
    'Rebellious', 'Charismatic', 'Stoic', 'Ruthless', 'Analytical',
    'Idealistic', 'Sarcastic', 'Empathetic', 'Vigilant'
  ];
  selectedTraits: string[] = ['Determined', 'Resourceful'];
  customTraitInput = '';

  toggleTrait(trait: string): void {
    if (this.selectedTraits.includes(trait)) {
      this.selectedTraits = this.selectedTraits.filter(t => t !== trait);
    } else {
      if (this.selectedTraits.length < 5) {
        this.selectedTraits.push(trait);
      }
    }
  }

  addCustomTrait(): void {
    const clean = this.customTraitInput.trim();
    if (clean && !this.selectedTraits.includes(clean) && this.selectedTraits.length < 6) {
      this.selectedTraits.push(clean);
      this.customTraitInput = '';
    }
  }

  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
    this.showStoryMenu.set(false);
  }

  toggleStoryMenu(): void {
    this.showStoryMenu.update(v => !v);
    this.showExportMenu.set(false);
  }

  startNewStoryPrompt(): void {
    this.showStoryMenu.set(false);
    this.showNewStoryModal.set(true);
  }

  async confirmCreateNewStory(): Promise<void> {
    if (!this.newStoryTitle.trim() || this.isCreatingStory()) return;
    this.isCreatingStory.set(true);
    try {
      const protagonist: ProtagonistProfile = {
        name: this.mcName.trim() || 'Derek',
        gender: this.mcGender,
        traits: this.selectedTraits.length > 0 ? this.selectedTraits : ['Determined', 'Resourceful']
      };
      await this.store.createNewStory(
        this.newStoryTitle.trim(),
        this.newStoryGenre,
        this.newStoryTone,
        this.newStoryCustomPremise.trim() || undefined,
        this.newStoryScope,
        protagonist
      );
      this.showNewStoryModal.set(false);
    } finally {
      this.isCreatingStory.set(false);
    }
  }

  resetToDemo(): void {
    this.showStoryMenu.set(false);
    this.showResetDemoModal.set(true);
  }

  confirmResetToDemo(): void {
    this.store.resetToDemoStory();
    this.showResetDemoModal.set(false);
  }

  async loadCloudStory(id: string): Promise<void> {
    const cloudStory = await this.supabase.loadStoryFromCloud(id);
    if (cloudStory) {
      this.store.loadCloudStory(cloudStory);
    }
    this.showStoryMenu.set(false);
  }

  downloadNovelManuscript(): void {
    const markdown = this.store.exportNovelManuscript();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.store.currentTree().title.replace(/[^a-zA-Z0-9]/g, '_')}_manuscript.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showExportMenu.set(false);
  }

  downloadTreeJson(): void {
    const json = this.store.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostwriter-story-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showExportMenu.set(false);
  }
}
