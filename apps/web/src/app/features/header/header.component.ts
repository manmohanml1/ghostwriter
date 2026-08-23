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
      <!-- Left: Brand & Story Switcher -->
      <div class="brand-group">
        <div class="logo-icon">✍️</div>
        <div class="brand-text">
          <div class="flex items-center gap-2">
            <h1 class="brand-title">Ghostwriter</h1>
            <span class="version-badge">v0.5.0</span>
          </div>
          <p class="brand-subtitle" [title]="store.currentTree().title">{{ store.currentTree().title }}</p>
        </div>

        <!-- Story Management Dropdown -->
        <div class="story-actions-wrapper">
          <button class="btn-story-action" (click)="toggleStoryMenu()" title="New Story or Switch Draft">
            📁 Story ▾
          </button>

          @if (showStoryMenu()) {
            <div class="story-menu">
              <button class="story-menu-item" (click)="startNewStoryPrompt()">
                <span class="menu-icon">✨</span>
                <div>
                  <div class="menu-title">+ New Story from Scratch</div>
                  <div class="menu-desc">Blank canvas for an original novel</div>
                </div>
              </button>

              <button class="story-menu-item" (click)="resetToDemo()">
                <span class="menu-icon">🌆</span>
                <div>
                  <div class="menu-title">Load Cyberpunk Demo</div>
                  <div class="menu-desc">Starter branching narrative tree</div>
                </div>
              </button>

              @if (supabase.userCloudStories().length > 0) {
                <div class="menu-divider"><span>Cloud Stories</span></div>
                @for (cloudStory of supabase.userCloudStories(); track cloudStory.id) {
                  <button class="story-menu-item" (click)="loadCloudStoryById(cloudStory.id)">
                    <span class="menu-icon">☁️</span>
                    <div>
                      <div class="menu-title">{{ cloudStory.title }}</div>
                      <div class="menu-desc">{{ cloudStory.genre }} • {{ cloudStory.updatedAt }}</div>
                    </div>
                  </button>
                }
              }
            </div>
          }
        </div>
      </div>

      <!-- Center: View Mode & Style Controls -->
      <div class="center-controls">
        <div class="view-mode-toggle">
          <button 
            class="btn-mode" 
            [class.active]="store.activeViewMode() === 'CANVAS'"
            (click)="store.setViewMode('CANVAS')"
          >
            🎨 Canvas
          </button>
          <button 
            class="btn-mode" 
            [class.active]="store.activeViewMode() === 'READER'"
            (click)="store.setViewMode('READER')"
          >
            📖 Reader
          </button>
        </div>

        <div class="style-controls-wrapper">
          <app-style-controls />
        </div>
      </div>

      <!-- Right: AI Status, Cloud Account & Export Suite -->
      <div class="header-actions">
        <!-- Cloud Sync & User Account Pill -->
        <button 
          class="btn-cloud-account" 
          [class.authenticated]="supabase.isAuthenticated()"
          (click)="openAuthEvent.emit()"
          title="Account & Cloud Sync"
        >
          @if (supabase.isAuthenticated()) {
            <span class="cloud-dot online"></span>
            <span class="user-label truncate-text">{{ supabase.currentUser()?.email?.split('@')?.[0] }}</span>
          } @else {
            <span class="cloud-dot offline"></span>
            <span class="user-label">☁️ Cloud</span>
          }
        </button>

        <!-- Live AI Health Status Pill -->
        <div 
          class="ai-status-pill"
          [attr.data-provider]="aiService.telemetry().activeProvider"
          (click)="openSettingsEvent.emit()"
          title="Click to view AI Provider & Key Settings"
        >
          <span class="status-dot"></span>
          <span class="status-text">
            @if (aiService.telemetry().activeProvider === 'GEMINI') { ✨ Gemini }
            @else if (aiService.telemetry().activeProvider === 'GROQ') { ⚡ Groq }
            @else { 💾 Offline }
          </span>
        </div>

        <button class="btn-settings" (click)="openSettingsEvent.emit()" title="Configure Gemini & Groq Keys">
          ⚙️ Keys
        </button>

        <!-- Export Dropdown -->
        <div class="export-dropdown-wrapper">
          <button class="btn-export" (click)="toggleExportMenu()" title="Export Story">
            📥 Export ▾
          </button>

          @if (showExportMenu()) {
            <div class="export-menu">
              <button class="export-menu-item" (click)="downloadNovelManuscript()">
                <span class="item-icon">📖</span>
                <div>
                  <div class="item-title">Novel Manuscript (.md)</div>
                  <div class="item-desc">Clean book text of the active storyline</div>
                </div>
              </button>

              <button class="export-menu-item" (click)="downloadTreeJson()">
                <span class="item-icon">💾</span>
                <div>
                  <div class="item-title">Story Tree Backup (.json)</div>
                  <div class="item-desc">Complete DAG graph & Lore Bible</div>
                </div>
              </button>
            </div>
          }
        </div>

        @if (store.activeViewMode() === 'CANVAS') {
          <button 
            class="btn-toggle-inspector" 
            [class.active]="store.isInspectorOpen()"
            (click)="store.toggleInspector()" 
            title="Toggle Inspector"
          >
            📋
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 60px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      z-index: 50;
      position: relative;
      gap: 10px;
      overflow-x: auto;
      overflow-y: visible;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.35);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      max-width: 140px;
    }

    .brand-title {
      font-size: 14px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .brand-subtitle {
      font-size: 10px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
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

    .story-actions-wrapper {
      position: relative;
    }

    .btn-story-action {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-story-action:hover {
      background: #334155;
      color: #fff;
    }

    .story-menu {
      position: absolute;
      top: 36px;
      left: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 10px;
      padding: 6px;
      width: 250px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 999;
    }

    .story-menu-item {
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

    .story-menu-item:hover {
      background: #1e293b;
    }

    .menu-icon { font-size: 16px; }
    .menu-title { font-size: 11px; font-weight: 700; color: #f8fafc; }
    .menu-desc { font-size: 9px; color: #94a3b8; }

    .menu-divider {
      padding: 4px 8px 2px;
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-top: 1px solid #1e293b;
      margin-top: 2px;
    }

    .center-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 1;
    }

    .view-mode-toggle {
      display: flex;
      background: #0b1120;
      padding: 2px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      gap: 2px;
      flex-shrink: 0;
    }

    .btn-mode {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-mode:hover { color: #f8fafc; }
    .btn-mode.active {
      background: #7c3aed;
      color: #fff;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
      flex-shrink: 0;
    }

    .btn-cloud-account {
      display: flex;
      align-items: center;
      gap: 5px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-cloud-account:hover { background: #334155; }
    .btn-cloud-account.authenticated {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
    }

    .cloud-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .cloud-dot.online { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
    .cloud-dot.offline { background: #94a3b8; }

    .truncate-text {
      max-width: 70px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ai-status-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 14px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      background: #1e293b;
      border: 1px solid #334155;
      white-space: nowrap;
    }

    .ai-status-pill[data-provider="GEMINI"] {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
    }

    .ai-status-pill[data-provider="GROQ"] {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.4);
      color: #fde047;
    }

    .ai-status-pill[data-provider="OFFLINE"] {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .btn-settings, .btn-export, .btn-toggle-inspector {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-settings:hover, .btn-export:hover, .btn-toggle-inspector:hover {
      background: #334155;
      color: #fff;
    }

    .btn-toggle-inspector.active {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      color: #e9d5ff;
    }

    .export-dropdown-wrapper { position: relative; }

    .export-menu {
      position: absolute;
      top: 36px;
      right: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 10px;
      padding: 6px;
      width: 240px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 999;
    }

    .export-menu-item {
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

    .export-menu-item:hover { background: #1e293b; }
    .item-icon { font-size: 16px; }
    .item-title { font-size: 11px; font-weight: 700; color: #f8fafc; }
    .item-desc { font-size: 9px; color: #94a3b8; }

    @media (max-width: 1100px) {
      .style-controls-wrapper { display: none; }
    }
  `]
})
export class HeaderComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly supabase = inject(SupabaseService);

  readonly openSettingsEvent = output<void>();
  readonly openAuthEvent = output<void>();

  readonly showExportMenu = signal<boolean>(false);
  readonly showStoryMenu = signal<boolean>(false);

  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
    this.showStoryMenu.set(false);
  }

  toggleStoryMenu(): void {
    this.showStoryMenu.update(v => !v);
    this.showExportMenu.set(false);
  }

  startNewStoryPrompt(): void {
    const title = prompt('Enter story title:', 'My New Webnovel');
    if (title && title.trim()) {
      this.store.createNewStory(title.trim());
    }
    this.showStoryMenu.set(false);
  }

  resetToDemo(): void {
    if (confirm('Load the starter Cyberpunk demo story? (Your active draft will be replaced with the demo)')) {
      this.store.resetToDemoStory();
    }
    this.showStoryMenu.set(false);
  }

  async loadCloudStoryById(id: string): Promise<void> {
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
