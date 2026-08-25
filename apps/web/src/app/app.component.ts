import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from './features/header/header.component';
import { TreeCanvasComponent } from './features/canvas/tree-canvas.component';
import { NodeInspectorComponent } from './features/inspector/node-inspector.component';
import { StoryReaderComponent } from './features/reader/story-reader.component';
import { AuthModalComponent } from './features/auth/auth-modal.component';
import { StyleControlsComponent } from './features/style-controls/style-controls.component';
import { LoreGenerationModalComponent } from './features/inspector/lore-generation-modal.component';
import { TreeStore } from './core/state/tree.store';
import { AIGeneratorService } from './core/services/ai-generator.service';
import { SupabaseService } from './core/services/supabase.service';
import { AIProviderType } from './core/models/graph.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HeaderComponent, 
    TreeCanvasComponent, 
    NodeInspectorComponent, 
    StoryReaderComponent,
    AuthModalComponent,
    StyleControlsComponent,
    LoreGenerationModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly supabase = inject(SupabaseService);

  readonly showSettingsModal = signal<boolean>(false);
  readonly showAuthModal = signal<boolean>(false);
  readonly showMobileMenu = signal<boolean>(false);

  geminiKeyInput = '';
  geminiModelInput = 'gemini-3.6-flash';
  availableGeminiModels = signal<{ id: string; name: string }[]>([
    { id: 'gemini-3.6-flash', name: '⚡ Gemini 3.6 Flash (Recommended: Ultra-Fast & Free Tier)' },
    { id: 'gemini-3.6-pro', name: '🧠 Gemini 3.6 Pro (Deep Reasoning & Complex Prose)' }
  ]);
  groqKeyInput = '';
  groqModelInput = 'llama-3.3-70b-versatile';
  availableGroqModels = signal<{ id: string; name: string }[]>([
    { id: 'llama-3.3-70b-versatile', name: '⚡ Llama 3.3 70B Versatile (Fast & High Quality)' },
    { id: 'deepseek-r1-distill-llama-70b', name: '🧠 DeepSeek R1 70B (Deep Reasoning)' },
    { id: 'llama-3.1-8b-instant', name: '🚀 Llama 3.1 8B Instant (Ultra-Fast)' },
    { id: 'qwen-2.5-32b', name: '⚙️ Qwen 2.5 32B' }
  ]);
  preferredProviderInput: AIProviderType = 'GEMINI';

  geminiTestResult = signal<{ success: boolean; message: string } | null>(null);
  groqTestResult = signal<{ success: boolean; message: string } | null>(null);

  async openSettingsModal(): Promise<void> {
    this.geminiKeyInput = this.aiService.getGeminiApiKey();
    this.geminiModelInput = this.aiService.getGeminiModel();
    this.groqKeyInput = this.aiService.getGroqApiKey();
    this.groqModelInput = this.aiService.getGroqModel();
    this.preferredProviderInput = this.aiService.getPreferredProvider();
    
    if (this.geminiKeyInput.trim() && this.preferredProviderInput === 'OFFLINE') {
      this.preferredProviderInput = 'GEMINI';
    }

    this.geminiTestResult.set(null);
    this.groqTestResult.set(null);
    this.showSettingsModal.set(true);

    if (this.geminiKeyInput.trim()) {
      const models = await this.aiService.fetchAvailableGeminiModels(this.geminiKeyInput);
      this.availableGeminiModels.set(models);
      if (!models.some(m => m.id === this.geminiModelInput)) {
        this.geminiModelInput = models[0]?.id || 'gemini-3.6-flash';
      }
    }

    if (this.groqKeyInput.trim()) {
      const groqModels = await this.aiService.fetchAvailableGroqModels(this.groqKeyInput);
      this.availableGroqModels.set(groqModels);
      if (!groqModels.some(m => m.id === this.groqModelInput)) {
        this.groqModelInput = groqModels[0]?.id || 'llama-3.3-70b-versatile';
      }
    }
  }

  async testProvider(provider: 'GEMINI' | 'GROQ'): Promise<void> {
    if (provider === 'GEMINI') {
      this.aiService.setGeminiApiKey(this.geminiKeyInput);
      this.aiService.setGeminiModel(this.geminiModelInput);
      const res = await this.aiService.testConnection('GEMINI');
      this.geminiTestResult.set(res);
      if (res.success) {
        this.preferredProviderInput = 'GEMINI';
        this.aiService.setPreferredProvider('GEMINI');
      }
      if (res.success || this.geminiKeyInput.trim()) {
        const models = await this.aiService.fetchAvailableGeminiModels(this.geminiKeyInput);
        this.availableGeminiModels.set(models);
        this.geminiModelInput = this.aiService.getGeminiModel();
      }
    } else {
      this.aiService.setGroqApiKey(this.groqKeyInput);
      this.aiService.setGroqModel(this.groqModelInput);
      const res = await this.aiService.testConnection('GROQ');
      this.groqTestResult.set(res);
      if (res.success) {
        this.preferredProviderInput = 'GROQ';
        this.aiService.setPreferredProvider('GROQ');
      }
      if (res.success || this.groqKeyInput.trim()) {
        const groqModels = await this.aiService.fetchAvailableGroqModels(this.groqKeyInput);
        this.availableGroqModels.set(groqModels);
        this.groqModelInput = this.aiService.getGroqModel();
      }
    }
  }

  isTestingOnSave = signal<boolean>(false);

  async saveAllSettings(): Promise<void> {
    this.aiService.setGeminiModel(this.geminiModelInput);
    this.aiService.setGroqModel(this.groqModelInput);
    this.aiService.setPreferredProvider(this.preferredProviderInput);
    this.showSettingsModal.set(false);
  }

  clearAllKeys(): void {
    this.geminiKeyInput = '';
    this.groqKeyInput = '';
    this.aiService.setGeminiApiKey('');
    this.aiService.setGroqApiKey('');
    this.aiService.setPreferredProvider('OFFLINE');
    this.showSettingsModal.set(false);
  }

  startNewStoryPrompt(): void {
    const title = prompt('Enter story title:', 'My New Webnovel');
    if (title && title.trim()) {
      this.store.createNewStory(title.trim());
    }
  }

  resetToDemo(): void {
    if (confirm('Load the starter Cyberpunk demo story? (Active draft will be replaced)')) {
      this.store.resetToDemoStory();
    }
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
  }
}
