import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { StyleControlsComponent } from '../style-controls/style-controls.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, StyleControlsComponent],
  template: `
    <header class="app-header">
      <!-- Left: Logo & Story Title Switcher -->
      <div class="brand-group">
        <div class="logo-icon" (click)="toggleStoryMenu()" title="Switch Story / Create New">✍️</div>
        <div class="brand-text">
          <div class="flex items-center gap-1.5">
            <span class="brand-title">Ghostwriter</span>
            <span class="version-badge">v0.5.0</span>
          </div>
          <button class="story-switcher-btn" (click)="toggleStoryMenu()" title="Click to switch story">
            <span class="story-title-text">{{ store.currentTree().title }}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
        </div>

        <!-- Story Dropdown Menu -->
        @if (showStoryMenu()) {
          <div class="story-dropdown-menu" (click)="$event.stopPropagation()">
            <div class="dropdown-header">Story Workspace</div>
            <button class="dropdown-item-btn primary" (click)="startNewStoryPrompt()">
              <span>✨</span> + New Story from Scratch
            </button>
            <button class="dropdown-item-btn" (click)="resetToDemo()">
              <span>🌆</span> Reset to Cyberpunk Demo
            </button>

            @if (supabase.userCloudStories().length > 0) {
              <div class="dropdown-divider">Saved in Cloud</div>
              @for (story of supabase.userCloudStories(); track story.id) {
                <button class="dropdown-item-btn cloud" (click)="loadCloudStory(story.id)">
                  <span>☁️</span>
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-100 text-xs">{{ story.title }}</span>
                    <span class="text-xxs text-slate-400">{{ story.genre }} • {{ story.updatedAt }}</span>
                  </div>
                </button>
              }
            }
          </div>
        }
      </div>

      <!-- Center: View Mode (Studio Canvas | Reader Mode) -->
      <div class="view-mode-pill">
        <button 
          class="mode-btn" 
          [class.active]="store.activeViewMode() === 'CANVAS'"
          (click)="store.setViewMode('CANVAS')"
        >
          🎨 Studio Canvas
        </button>
        <button 
          class="mode-btn" 
          [class.active]="store.activeViewMode() === 'READER'"
          (click)="store.setViewMode('READER')"
        >
          📖 Reader Mode
        </button>
      </div>

      <!-- Center-Right: Genre, Pacing, Tone Style Selectors (Desktop) -->
      <div class="desktop-style-controls">
        <app-style-controls />
      </div>

      <!-- Right: Global Actions & Telemetry (Desktop) -->
      <div class="desktop-actions">
        <!-- Cloud Sync Button -->
        <button 
          class="action-btn cloud-sync-btn" 
          [class.authenticated]="supabase.isAuthenticated()"
          (click)="openAuthEvent.emit()"
          title="Supabase Cloud Sync"
        >
          <span class="status-dot" [class.online]="supabase.isAuthenticated()"></span>
          <span>{{ supabase.isAuthenticated() ? (supabase.currentUser()?.email?.split('@')?.[0] || 'Cloud Sync') : '☁️ Cloud Sync' }}</span>
        </button>

        <!-- AI Engine Health Pill -->
        <div 
          class="ai-telemetry-pill"
          [attr.data-provider]="aiService.telemetry().activeProvider"
          (click)="openSettingsEvent.emit()"
          title="Click to configure AI Keys"
        >
          <span class="ai-pulse-dot"></span>
          <span>
            @if (aiService.telemetry().activeProvider === 'GEMINI') { ⚡ Gemini 2.5 Flash }
            @else if (aiService.telemetry().activeProvider === 'GROQ') { ⚡ Groq 70B }
            @else { 🟣 Offline Engine }
          </span>
        </div>

        <!-- AI Keys Settings -->
        <button class="action-btn" (click)="openSettingsEvent.emit()" title="AI API Keys">
          ⚙️ AI Keys
        </button>

        <!-- Export Dropdown -->
        <div class="export-container">
          <button class="action-btn" (click)="toggleExportMenu()" title="Export Story">
            📥 Export ▾
          </button>
          @if (showExportMenu()) {
            <div class="export-dropdown" (click)="$event.stopPropagation()">
              <button class="export-item-btn" (click)="downloadNovelManuscript()">
                <span>📖</span>
                <div>
                  <div class="font-bold text-xs text-white">Novel Manuscript (.md)</div>
                  <div class="text-xxs text-slate-400">Complete linear chapter prose</div>
                </div>
              </button>
              <button class="export-item-btn" (click)="downloadTreeJson()">
                <span>💾</span>
                <div>
                  <div class="font-bold text-xs text-white">Story Tree (.json)</div>
                  <div class="text-xxs text-slate-400">Full DAG graph & Lore Bible</div>
                </div>
              </button>
            </div>
          }
        </div>

        <!-- Inspector Toggle Button -->
        @if (store.activeViewMode() === 'CANVAS') {
          <button 
            class="action-btn inspector-btn" 
            [class.active]="store.isInspectorOpen()"
            (click)="store.toggleInspector()" 
            title="Toggle Inspector Sidebar"
          >
            📋 Inspector
          </button>
        }
      </div>

      <!-- Mobile Right Controls (< 1024px) -->
      <div class="mobile-actions">
        @if (store.activeViewMode() === 'CANVAS') {
          <button 
            class="mobile-btn inspector-pill" 
            [class.active]="store.isInspectorOpen()"
            (click)="store.toggleInspector()" 
            title="Toggle Chapter Editor"
          >
            ✍️ Edit
          </button>
        }

        <button class="mobile-btn menu-btn" (click)="openMobileMenuEvent.emit()" title="Open Menu">
          ☰
        </button>
      </div>
    </header>

    <!-- Sleek In-App Modal: Create New Story -->
    @if (showNewStoryModal()) {
      <div class="custom-modal-backdrop" (click)="showNewStoryModal.set(false)">
        <div class="custom-modal-card" (click)="$event.stopPropagation()">
          <div class="custom-modal-header">
            <div class="flex items-center gap-2">
              <span class="text-xl">✨</span>
              <div>
                <h3 class="custom-modal-title">Create New Story</h3>
                <p class="custom-modal-subtitle">Start a fresh branching narrative universe.</p>
              </div>
            </div>
            <button class="btn-modal-close" (click)="showNewStoryModal.set(false)">✕</button>
          </div>

          <div class="custom-modal-body">
            <div class="form-field">
              <label class="field-label">Story Title</label>
              <input 
                type="text" 
                class="field-input" 
                [(ngModel)]="newStoryTitle" 
                placeholder="e.g. The Quantum Cipher"
              />
            </div>

            <div class="form-field">
              <label class="field-label">Genre</label>
              <select class="field-select" [(ngModel)]="newStoryGenre">
                <option value="Cyberpunk">Cyberpunk Noir</option>
                <option value="Sci-Fi">Hard Sci-Fi / Space Opera</option>
                <option value="Dark Fantasy">Dark Fantasy</option>
                <option value="Mystery">Mystery / Thriller</option>
                <option value="LitRPG">LitRPG / Progression Fantasy</option>
                <option value="Romance">Urban Romance</option>
              </select>
            </div>
          </div>

          <div class="custom-modal-footer">
            <button class="btn-cancel" (click)="showNewStoryModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="confirmCreateNewStory()">✨ Create Story</button>
          </div>
        </div>
      </div>
    }

    <!-- Sleek In-App Modal: Reset to Demo Story -->
    @if (showResetDemoModal()) {
      <div class="custom-modal-backdrop" (click)="showResetDemoModal.set(false)">
        <div class="custom-modal-card" (click)="$event.stopPropagation()">
          <div class="custom-modal-header">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌆</span>
              <div>
                <h3 class="custom-modal-title">Reset to Cyberpunk Demo?</h3>
                <p class="custom-modal-subtitle">Reload starter story: <i>The Neon Protocol</i>.</p>
              </div>
            </div>
            <button class="btn-modal-close" (click)="showResetDemoModal.set(false)">✕</button>
          </div>

          <div class="custom-modal-body">
            <div class="warning-box">
              <span class="warning-tag">⚠️ Warning</span>
              <p class="warning-text">
                Your active workspace draft will be replaced with the starter Cyberpunk demo. Make sure any personal work is synced to your cloud account first.
              </p>
            </div>
          </div>

          <div class="custom-modal-footer">
            <button class="btn-cancel" (click)="showResetDemoModal.set(false)">Cancel</button>
            <button class="btn-danger" (click)="confirmResetToDemo()">🌆 Confirm Reset</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .app-header {
      height: 56px;
      background: #070a12;
      border-bottom: 1px solid rgba(168, 85, 247, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      z-index: 50;
      position: relative;
      gap: 10px;
    }

    /* Left Brand */
    .brand-group {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      flex-shrink: 0;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      max-width: 170px;
    }

    .brand-title {
      font-size: 13px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    .version-badge {
      font-size: 9px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #c084fc;
      background: rgba(168, 85, 247, 0.15);
      padding: 0 4px;
      border-radius: 3px;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .story-switcher-btn {
      background: transparent;
      border: none;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      color: #94a3b8;
      font-size: 10px;
      text-align: left;
    }

    .story-switcher-btn:hover {
      color: #c084fc;
    }

    .story-title-text {
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-arrow {
      font-size: 9px;
    }

    /* Story Dropdown Menu */
    .story-dropdown-menu {
      position: absolute;
      top: 46px;
      left: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.5);
      border-radius: 12px;
      padding: 8px;
      width: 270px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.9), 0 0 25px rgba(168, 85, 247, 0.2);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 1000;
    }

    .dropdown-header {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 8px;
    }

    .dropdown-item-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
    }

    .dropdown-item-btn.primary {
      background: rgba(124, 58, 237, 0.25);
      border-color: rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
    }

    .dropdown-item-btn:hover {
      background: #334155;
    }

    .dropdown-divider {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      padding: 6px 8px 2px;
      border-top: 1px solid #1e293b;
      margin-top: 4px;
    }

    /* Center View Mode */
    .view-mode-pill {
      display: flex;
      background: #0b1120;
      padding: 2px;
      border-radius: 8px;
      border: 1px solid rgba(51, 65, 85, 0.8);
      gap: 2px;
      flex-shrink: 0;
    }

    .mode-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .mode-btn.active {
      background: #7c3aed;
      color: #fff;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.5);
    }

    /* Desktop Controls */
    .desktop-style-controls {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .desktop-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .action-btn {
      background: #0f172a;
      border: 1px solid rgba(51, 65, 85, 0.8);
      color: #e2e8f0;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: #1e293b;
      border-color: rgba(168, 85, 247, 0.4);
      color: #fff;
    }

    .action-btn.inspector-btn.active {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      color: #e9d5ff;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.25);
    }

    .cloud-sync-btn.authenticated {
      background: rgba(124, 58, 237, 0.15);
      border-color: rgba(168, 85, 247, 0.4);
      color: #c7d2fe;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .status-dot.online {
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }

    .ai-telemetry-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #e9d5ff;
      white-space: nowrap;
    }

    .ai-telemetry-pill[data-provider="GEMINI"] {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
    }

    .ai-telemetry-pill[data-provider="GROQ"] {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.4);
      color: #fde047;
    }

    .ai-telemetry-pill[data-provider="OFFLINE"] {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
    }

    .ai-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .export-container {
      position: relative;
    }

    .export-dropdown {
      position: absolute;
      top: 38px;
      right: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 10px;
      padding: 6px;
      width: 240px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 1000;
    }

    .export-item-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
    }

    .export-item-btn:hover { background: #1e293b; }

    /* Mobile Controls (< 1024px) */
    .mobile-actions {
      display: none;
      align-items: center;
      gap: 6px;
    }

    .mobile-btn {
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #f8fafc;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .mobile-btn.inspector-pill.active {
      background: #7c3aed;
      border-color: #a855f7;
    }

    .mobile-btn.menu-btn {
      font-size: 15px;
      padding: 4px 8px;
    }

    .text-xxs { font-size: 9px; }

    /* Responsive Media Queries */
    @media (max-width: 1180px) {
      .desktop-style-controls { display: none; }
    }

    @media (max-width: 900px) {
      .desktop-actions { display: none; }
      .mobile-actions { display: flex; }
      .brand-text { max-width: 120px; }
      .story-title-text { max-width: 100px; }
    }

    /* Custom In-App Modal Dialogs */
    .custom-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    .custom-modal-card {
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 14px;
      padding: 20px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(168, 85, 247, 0.2);
    }

    .custom-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
    }

    .custom-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
    }

    .custom-modal-subtitle {
      font-size: 11px;
      color: #94a3b8;
    }

    .btn-modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
    }

    .custom-modal-body {
      padding: 14px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #cbd5e1;
    }

    .field-input, .field-select {
      background: #070a12;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }

    .field-input:focus, .field-select:focus {
      border-color: #a855f7;
    }

    .warning-box {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 8px;
      padding: 12px;
    }

    .warning-tag {
      font-size: 11px;
      font-weight: 700;
      color: #fbbf24;
    }

    .warning-text {
      font-size: 11px;
      color: #e2e8f0;
      margin-top: 4px;
      line-height: 1.4;
    }

    .custom-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid #1e293b;
      padding-top: 14px;
    }

    .btn-cancel {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #fff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(168, 85, 247, 0.35);
    }

    .btn-danger {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class HeaderComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly supabase = inject(SupabaseService);

  readonly openSettingsEvent = output<void>();
  readonly openAuthEvent = output<void>();
  readonly openMobileMenuEvent = output<void>();

  readonly showExportMenu = signal<boolean>(false);
  readonly showStoryMenu = signal<boolean>(false);
  readonly showNewStoryModal = signal<boolean>(false);
  readonly showResetDemoModal = signal<boolean>(false);

  newStoryTitle = 'The Quantum Cipher';
  newStoryGenre = 'Cyberpunk';

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

  confirmCreateNewStory(): void {
    if (this.newStoryTitle.trim()) {
      this.store.createNewStory(this.newStoryTitle.trim());
      this.showNewStoryModal.set(false);
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
