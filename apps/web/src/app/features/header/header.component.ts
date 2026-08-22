import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AIGeneratorService } from '../../core/services/ai-generator.service';
import { StyleControlsComponent } from '../style-controls/style-controls.component';
import { AIProviderType } from '../../core/models/graph.models';

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
          (click)="showSettingsModal.set(true)"
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

        <button class="btn-settings" (click)="openSettings()" title="Configure Gemini & Groq Keys">
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

      <!-- Multi-Provider Settings Modal -->
      @if (showSettingsModal()) {
        <div class="modal-backdrop" (click)="showSettingsModal.set(false)">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">⚙️ AI Multi-Provider & Rate Limit Defense</h3>
              <button class="btn-modal-close" (click)="showSettingsModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="failover-notice-box">
                <span class="notice-icon">🛡️</span>
                <p class="text-xs text-purple-200">
                  **Tri-Provider Auto-Failover Active**: If Gemini is rate-limited (HTTP 429), Ghostwriter automatically routes to Groq, and falls back to the Smart Offline Engine.
                </p>
              </div>

              <!-- Provider 1: Google Gemini -->
              <div class="provider-config-card">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-xs text-slate-200">1. Google AI Studio (Gemini 2.5 Flash)</span>
                  <button class="btn-test-conn" (click)="testProvider('GEMINI')">Test ⚡</button>
                </div>
                <input 
                  type="password" 
                  [(ngModel)]="geminiKeyInput" 
                  placeholder="AIzaSy... (Gemini API Key)" 
                  class="input-key"
                />
                @if (geminiTestResult()) {
                  <p class="test-result-msg" [class.success]="geminiTestResult()?.success">
                    {{ geminiTestResult()?.message }}
                  </p>
                }
              </div>

              <!-- Provider 2: Groq -->
              <div class="provider-config-card">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-xs text-slate-200">2. Groq (Llama 3.3 70B - 300 tokens/s)</span>
                  <button class="btn-test-conn" (click)="testProvider('GROQ')">Test ⚡</button>
                </div>
                <input 
                  type="password" 
                  [(ngModel)]="groqKeyInput" 
                  placeholder="gsk_... (Groq API Key)" 
                  class="input-key"
                />
                @if (groqTestResult()) {
                  <p class="test-result-msg" [class.success]="groqTestResult()?.success">
                    {{ groqTestResult()?.message }}
                  </p>
                }
              </div>

              <!-- Preferred Provider -->
              <div class="form-group mt-2">
                <label class="form-label">Preferred Primary Provider</label>
                <select [(ngModel)]="preferredProviderInput" class="select-pref">
                  <option value="GEMINI">Google Gemini 2.5 Flash (Primary)</option>
                  <option value="GROQ">Groq Llama 3.3 70B (Primary)</option>
                  <option value="OFFLINE">Smart Offline Engine ($0 Cost, Infinite)</option>
                </select>
              </div>

              <p class="text-xxs text-slate-400 mt-2">
                All API keys are encrypted strictly in your local browser storage and never transmitted to third-party databases.
              </p>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="clearAllKeys()">Clear All Keys</button>
              <button class="btn-primary" (click)="saveAllSettings()">Save Configuration</button>
            </div>
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    .app-header {
      height: 64px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
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

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal-box {
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 16px;
      width: 520px;
      max-width: 90vw;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
    }

    .btn-modal-close {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
    }

    .failover-notice-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(124, 58, 237, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 10px;
      padding: 10px 12px;
    }

    .provider-config-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .btn-test-conn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .test-result-msg {
      font-size: 11px;
      color: #f87171;
    }

    .test-result-msg.success {
      color: #4ade80;
    }

    .input-key, .select-pref {
      width: 100%;
      background: #070a12;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      outline: none;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid #1e293b;
      padding-top: 14px;
    }

    .btn-primary {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .text-xxs { font-size: 10px; }
  `]
})
export class HeaderComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);

  readonly showSettingsModal = signal<boolean>(false);
  readonly showExportMenu = signal<boolean>(false);

  geminiKeyInput = '';
  groqKeyInput = '';
  preferredProviderInput: AIProviderType = 'GEMINI';

  geminiTestResult = signal<{ success: boolean; message: string } | null>(null);
  groqTestResult = signal<{ success: boolean; message: string } | null>(null);

  openSettings(): void {
    this.geminiKeyInput = this.aiService.getGeminiApiKey();
    this.groqKeyInput = this.aiService.getGroqApiKey();
    this.preferredProviderInput = this.aiService.getPreferredProvider();
    this.geminiTestResult.set(null);
    this.groqTestResult.set(null);
    this.showSettingsModal.set(true);
  }

  async testProvider(provider: 'GEMINI' | 'GROQ'): Promise<void> {
    if (provider === 'GEMINI') {
      this.aiService.setGeminiApiKey(this.geminiKeyInput);
      const res = await this.aiService.testConnection('GEMINI');
      this.geminiTestResult.set(res);
    } else {
      this.aiService.setGroqApiKey(this.groqKeyInput);
      const res = await this.aiService.testConnection('GROQ');
      this.groqTestResult.set(res);
    }
  }

  saveAllSettings(): void {
    this.aiService.setGeminiApiKey(this.geminiKeyInput);
    this.aiService.setGroqApiKey(this.groqKeyInput);
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
