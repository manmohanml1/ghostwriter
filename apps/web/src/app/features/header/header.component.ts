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
      <!-- Left: Logo & Story Selector -->
      <div class="brand-container">
        <div class="logo-badge" (click)="toggleStoryMenu()" title="Manage Stories">
          ✍️
        </div>
        <div class="brand-info">
          <div class="brand-title-row">
            <span class="brand-name">Ghostwriter</span>
            <span class="version-pill">v0.5.0</span>
          </div>
          <button class="story-title-btn" (click)="toggleStoryMenu()" title="Click to switch story">
            <span class="story-name">{{ store.currentTree().title }}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
        </div>

        <!-- Story Menu Dropdown -->
        @if (showStoryMenu()) {
          <div class="story-dropdown-menu" (click)="$event.stopPropagation()">
            <div class="dropdown-header">Story Workspace</div>
            <button class="dropdown-action-btn primary" (click)="startNewStoryPrompt()">
              <span>✨</span> + New Story from Scratch
            </button>
            <button class="dropdown-action-btn" (click)="resetToDemo()">
              <span>🌆</span> Reset to Cyberpunk Demo
            </button>

            @if (supabase.userCloudStories().length > 0) {
              <div class="dropdown-divider">Saved in Cloud</div>
              @for (story of supabase.userCloudStories(); track story.id) {
                <button class="dropdown-story-item" (click)="loadCloudStory(story.id)">
                  <span class="cloud-icon">☁️</span>
                  <div class="story-meta">
                    <span class="item-title">{{ story.title }}</span>
                    <span class="item-sub">{{ story.genre }} • {{ story.updatedAt }}</span>
                  </div>
                </button>
              }
            }
          </div>
        }
      </div>

      <!-- Center: View Mode (Canvas vs Reader) -->
      <div class="view-mode-pill">
        <button 
          class="mode-btn" 
          [class.active]="store.activeViewMode() === 'CANVAS'"
          (click)="store.setViewMode('CANVAS')"
        >
          🎨 <span class="mode-label">Canvas</span>
        </button>
        <button 
          class="mode-btn" 
          [class.active]="store.activeViewMode() === 'READER'"
          (click)="store.setViewMode('READER')"
        >
          📖 <span class="mode-label">Reader</span>
        </button>
      </div>

      <!-- Desktop Style Controls -->
      <div class="desktop-style-controls">
        <app-style-controls />
      </div>

      <!-- Right: Desktop Actions -->
      <div class="desktop-actions">
        <!-- Cloud Sync -->
        <button 
          class="action-btn cloud-btn" 
          [class.active]="supabase.isAuthenticated()"
          (click)="openAuthEvent.emit()"
          title="Supabase Cloud Sync"
        >
          <span class="dot" [class.online]="supabase.isAuthenticated()"></span>
          <span>{{ supabase.isAuthenticated() ? (supabase.currentUser()?.email?.split('@')?.[0] || 'Cloud') : '☁️ Cloud' }}</span>
        </button>

        <!-- AI Health -->
        <div 
          class="ai-telemetry-badge"
          [attr.data-provider]="aiService.telemetry().activeProvider"
          (click)="openSettingsEvent.emit()"
          title="AI Provider Settings"
        >
          <span class="ai-dot"></span>
          <span>
            @if (aiService.telemetry().activeProvider === 'GEMINI') { Gemini Flash }
            @else if (aiService.telemetry().activeProvider === 'GROQ') { Groq 70B }
            @else { Offline }
          </span>
        </div>

        <button class="action-btn icon-only" (click)="openSettingsEvent.emit()" title="AI Keys">
          ⚙️
        </button>

        <!-- Export Dropdown -->
        <div class="export-container">
          <button class="action-btn" (click)="toggleExportMenu()" title="Export">
            📥 Export ▾
          </button>
          @if (showExportMenu()) {
            <div class="export-dropdown" (click)="$event.stopPropagation()">
              <button class="export-btn" (click)="downloadNovelManuscript()">
                <span>📖</span>
                <div>
                  <div class="exp-title">Novel Manuscript (.md)</div>
                  <div class="exp-desc">Linear chapter prose</div>
                </div>
              </button>
              <button class="export-btn" (click)="downloadTreeJson()">
                <span>💾</span>
                <div>
                  <div class="exp-title">Story Tree (.json)</div>
                  <div class="exp-desc">Full DAG & Lore Bible</div>
                </div>
              </button>
            </div>
          }
        </div>

        @if (store.activeViewMode() === 'CANVAS') {
          <button 
            class="action-btn inspector-toggle-btn" 
            [class.active]="store.isInspectorOpen()"
            (click)="store.toggleInspector()" 
            title="Toggle Inspector"
          >
            📋 Editor
          </button>
        }
      </div>

      <!-- Mobile Right Controls (< 820px) -->
      <div class="mobile-actions">
        @if (store.activeViewMode() === 'CANVAS') {
          <button 
            class="mobile-action-btn" 
            [class.active]="store.isInspectorOpen()"
            (click)="store.toggleInspector()" 
            title="Toggle Chapter Editor"
          >
            ✍️ Edit
          </button>
        }

        <button class="mobile-action-btn menu-btn" (click)="showMobileMenu.set(true)" title="Menu">
          ☰
        </button>
      </div>

      <!-- Mobile Slide-Over Drawer -->
      @if (showMobileMenu()) {
        <div class="mobile-drawer-backdrop" (click)="showMobileMenu.set(false)">
          <div class="mobile-drawer" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <span class="font-bold text-sm text-white">Ghostwriter Menu</span>
              <button class="btn-drawer-close" (click)="showMobileMenu.set(false)">✕</button>
            </div>

            <div class="drawer-content">
              <!-- Story Management -->
              <div class="drawer-section">
                <span class="drawer-section-title">Story Workspace</span>
                <button class="drawer-item-btn" (click)="startNewStoryPrompt(); showMobileMenu.set(false)">
                  <span>✨</span> + New Story from Scratch
                </button>
                <button class="drawer-item-btn" (click)="resetToDemo(); showMobileMenu.set(false)">
                  <span>🌆</span> Load Cyberpunk Demo
                </button>
              </div>

              <!-- Style Controls -->
              <div class="drawer-section">
                <span class="drawer-section-title">Genre & Style Controls</span>
                <app-style-controls />
              </div>

              <!-- Cloud & AI -->
              <div class="drawer-section">
                <span class="drawer-section-title">Cloud & AI Settings</span>
                <button class="drawer-item-btn" (click)="openAuthEvent.emit(); showMobileMenu.set(false)">
                  <span>☁️</span> {{ supabase.isAuthenticated() ? 'Manage Account (' + supabase.currentUser()?.email + ')' : 'Connect Supabase Cloud' }}
                </button>
                <button class="drawer-item-btn" (click)="openSettingsEvent.emit(); showMobileMenu.set(false)">
                  <span>⚙️</span> Configure AI Keys (Gemini / Groq)
                </button>
              </div>

              <!-- Export -->
              <div class="drawer-section">
                <span class="drawer-section-title">Export Options</span>
                <button class="drawer-item-btn" (click)="downloadNovelManuscript(); showMobileMenu.set(false)">
                  <span>📖</span> Export Novel Manuscript (.md)
                </button>
                <button class="drawer-item-btn" (click)="downloadTreeJson(); showMobileMenu.set(false)">
                  <span>💾</span> Export Story Tree Backup (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    .app-header {
      height: 56px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      z-index: 50;
      position: relative;
      gap: 8px;
    }

    /* Left Brand */
    .brand-container {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .logo-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
      flex-shrink: 0;
    }

    .brand-info {
      display: flex;
      flex-direction: column;
      max-width: 160px;
    }

    .brand-title-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .brand-name {
      font-size: 13px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    .version-pill {
      font-size: 9px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #c084fc;
      background: rgba(168, 85, 247, 0.15);
      padding: 0 4px;
      border-radius: 3px;
    }

    .story-title-btn {
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

    .story-title-btn:hover {
      color: #c084fc;
    }

    .story-name {
      max-width: 130px;
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
      top: 44px;
      left: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 12px;
      padding: 8px;
      width: 260px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9);
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

    .dropdown-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 8px 10px;
      border-radius: 7px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
    }

    .dropdown-action-btn.primary {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
    }

    .dropdown-action-btn:hover {
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

    .dropdown-story-item {
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

    .dropdown-story-item:hover {
      background: #1e293b;
    }

    .story-meta {
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-size: 11px;
      font-weight: 700;
      color: #f8fafc;
    }

    .item-sub {
      font-size: 9px;
      color: #94a3b8;
    }

    /* Center View Mode */
    .view-mode-pill {
      display: flex;
      background: #070a12;
      padding: 2px;
      border-radius: 8px;
      border: 1px solid #1e293b;
      gap: 2px;
      flex-shrink: 0;
    }

    .mode-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mode-btn.active {
      background: #7c3aed;
      color: #fff;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
    }

    /* Desktop Controls */
    .desktop-style-controls {
      display: flex;
      align-items: center;
    }

    .desktop-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      padding: 5px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    .action-btn:hover {
      background: #334155;
      color: #fff;
    }

    .action-btn.icon-only {
      padding: 5px 7px;
    }

    .action-btn.inspector-toggle-btn.active {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      color: #e9d5ff;
    }

    .cloud-btn.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .dot.online {
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }

    .ai-telemetry-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      background: #1e293b;
      border: 1px solid #334155;
      white-space: nowrap;
    }

    .ai-telemetry-badge[data-provider="GEMINI"] {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
    }

    .ai-telemetry-badge[data-provider="GROQ"] {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.4);
      color: #fde047;
    }

    .ai-telemetry-badge[data-provider="OFFLINE"] {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.4);
      color: #e9d5ff;
    }

    .ai-dot {
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
      top: 36px;
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

    .export-btn {
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

    .export-btn:hover { background: #1e293b; }
    .exp-title { font-size: 11px; font-weight: 700; color: #f8fafc; }
    .exp-desc { font-size: 9px; color: #94a3b8; }

    /* Mobile Controls */
    .mobile-actions {
      display: none;
      align-items: center;
      gap: 6px;
    }

    .mobile-action-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .mobile-action-btn.active {
      background: #7c3aed;
      border-color: #a855f7;
    }

    .mobile-action-btn.menu-btn {
      font-size: 15px;
      padding: 4px 8px;
    }

    /* Mobile Drawer */
    .mobile-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      justify-content: flex-end;
    }

    .mobile-drawer {
      width: 320px;
      max-width: 85vw;
      height: 100%;
      background: #0f172a;
      border-left: 1px solid #334155;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
    }

    .btn-drawer-close {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .drawer-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .drawer-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .drawer-section-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .drawer-item-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
    }

    .drawer-item-btn:hover { background: #334155; }

    /* Media Queries */
    @media (max-width: 1024px) {
      .desktop-style-controls { display: none; }
    }

    @media (max-width: 820px) {
      .desktop-actions { display: none; }
      .mobile-actions { display: flex; }
      .brand-info { max-width: 110px; }
      .story-name { max-width: 90px; }
      .mode-label { display: none; }
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
  readonly showMobileMenu = signal<boolean>(false);

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
    if (confirm('Load the starter Cyberpunk demo story? (Active draft will be replaced)')) {
      this.store.resetToDemoStory();
    }
    this.showStoryMenu.set(false);
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
