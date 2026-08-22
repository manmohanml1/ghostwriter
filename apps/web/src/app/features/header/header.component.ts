import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { StyleControlsComponent } from '../style-controls/style-controls.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, StyleControlsComponent],
  template: `
    <header class="app-header">
      <!-- Left: Brand -->
      <div class="brand-group">
        <div class="logo-icon">✍️</div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="brand-title">Ghostwriter</h1>
            <span class="version-badge">v0.4.0</span>
          </div>
          <p class="brand-subtitle">{{ store.currentTree().title }}</p>
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
            🎨 Studio Canvas
          </button>
          <button 
            class="btn-mode" 
            [class.active]="store.activeViewMode() === 'READER'"
            (click)="store.setViewMode('READER')"
          >
            📖 Reader Mode
          </button>
        </div>

        <app-style-controls />
      </div>

      <!-- Right: AI Status, Export Suite & Settings -->
      <div class="header-actions">
        <!-- Live AI Health Status Pill -->
        <div 
          class="ai-status-pill"
          [attr.data-provider]="aiService.telemetry().activeProvider"
          (click)="openSettingsEvent.emit()"
          title="Click to view AI Provider & Key Settings"
        >
          <span class="status-dot"></span>
          <span class="status-text">
            @if (aiService.telemetry().activeProvider === 'GEMINI') { ✨ Gemini Flash }
            @else if (aiService.telemetry().activeProvider === 'GROQ') { ⚡ Groq Llama 3.3 }
            @else { 💾 Offline Engine }
          </span>
        </div>

        <!-- Pruned Nodes Visibility Toggle -->
        @if (store.prunedNodesCount() > 0 && store.activeViewMode() === 'CANVAS') {
          <button 
            class="btn-pruned-toggle"
            [class.active]="store.showPrunedNodes()"
            (click)="store.toggleShowPruned()"
            title="Toggle visibility of pruned branches"
          >
            {{ store.showPrunedNodes() ? '👁️' : '🙈' }} {{ store.prunedNodesCount() }} Pruned
          </button>
        }

        <button class="btn-settings" (click)="openSettingsEvent.emit()" title="Configure Gemini & Groq Keys">
          ⚙️ AI Keys
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
            📋 Inspector
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 64px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 50;
      position: relative;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
    }

    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      font-size: 11px;
      color: #94a3b8;
      max-width: 240px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .version-badge {
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #c084fc;
      background: rgba(168, 85, 247, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .center-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .view-mode-toggle {
      display: flex;
      background: #0b1120;
      padding: 3px;
      border-radius: 10px;
      border: 1px solid #1e293b;
      gap: 3px;
    }

    .btn-mode {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-mode:hover {
      color: #f8fafc;
    }

    .btn-mode.active {
      background: #7c3aed;
      color: #fff;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .ai-status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: #1e293b;
      border: 1px solid #334155;
      transition: all 0.15s ease;
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
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .btn-pruned-toggle {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-settings, .btn-export, .btn-toggle-inspector {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
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

    .export-dropdown-wrapper {
      position: relative;
    }

    .export-menu {
      position: absolute;
      top: 42px;
      right: 0;
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 12px;
      padding: 8px;
      width: 260px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 60;
    }

    .export-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: transparent;
      border: none;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease;
    }

    .export-menu-item:hover {
      background: #1e293b;
    }

    .item-icon {
      font-size: 18px;
    }

    .item-title {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
    }

    .item-desc {
      font-size: 10px;
      color: #94a3b8;
    }
  `]
})
export class HeaderComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);
  readonly openSettingsEvent = output<void>();

  readonly showExportMenu = signal<boolean>(false);

  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
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
