import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from './features/header/header.component';
import { TreeCanvasComponent } from './features/canvas/tree-canvas.component';
import { NodeInspectorComponent } from './features/inspector/node-inspector.component';
import { StoryReaderComponent } from './features/reader/story-reader.component';
import { TreeStore } from './core/state/tree.store';
import { AIGeneratorService } from './core/services/ai-generator.service';
import { AIProviderType } from './core/models/graph.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TreeCanvasComponent, NodeInspectorComponent, StoryReaderComponent],
  template: `
    <div class="app-layout">
      <app-header (openSettingsEvent)="openSettingsModal()" />

      <main class="main-workspace">
        @if (store.activeViewMode() === 'CANVAS') {
          <app-tree-canvas class="canvas-area" />
          <app-node-inspector />
        } @else {
          <app-story-reader class="w-full h-full" />
        }
      </main>

      <!-- GLOBAL MODAL (Placed at root so position:fixed is never trapped by backdrop-filter) -->
      @if (showSettingsModal()) {
        <div class="global-modal-backdrop" (click)="showSettingsModal.set(false)">
          <div class="global-modal-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">⚙️ AI Multi-Provider & Rate Limit Defense</h3>
              <button class="btn-modal-close" (click)="showSettingsModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="failover-notice-box">
                <span class="notice-icon">🛡️</span>
                <p class="text-xs text-purple-200">
                  <strong>Tri-Provider Auto-Failover Active</strong>: If Gemini is rate-limited (HTTP 429), Ghostwriter automatically routes to Groq, and falls back to the Smart Offline Engine.
                </p>
              </div>

              <!-- Provider 1: Google Gemini -->
              <div class="provider-config-card">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-xs text-slate-200">1. Google AI Studio (Gemini 2.5 Flash)</span>
                  <button class="btn-test-conn" (click)="testProvider('GEMINI')">Test Connection ⚡</button>
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
                  <button class="btn-test-conn" (click)="testProvider('GROQ')">Test Connection ⚡</button>
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
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: #070a12;
      position: relative;
    }

    .main-workspace {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    .canvas-area {
      flex: 1;
      height: 100%;
      position: relative;
    }

    .w-full { width: 100%; }
    .h-full { height: 100%; }

    /* GLOBAL MODAL BACKDROP */
    .global-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    }

    .global-modal-box {
      background: #0f172a;
      border: 1px solid rgba(168, 85, 247, 0.5);
      border-radius: 18px;
      width: 540px;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(168, 85, 247, 0.2);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 14px;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
    }

    .btn-modal-close {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-modal-close:hover {
      background: #334155;
      color: #fff;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .failover-notice-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(124, 58, 237, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 10px;
      padding: 10px 14px;
    }

    .notice-icon {
      font-size: 18px;
    }

    .provider-config-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-test-conn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-test-conn:hover {
      background: #334155;
      color: #fff;
    }

    .test-result-msg {
      font-size: 11px;
      color: #f87171;
      margin-top: 2px;
    }

    .test-result-msg.success {
      color: #4ade80;
    }

    .input-key, .select-pref {
      width: 100%;
      background: #070a12;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      outline: none;
    }

    .input-key:focus, .select-pref:focus {
      border-color: #a855f7;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid #1e293b;
      padding-top: 16px;
    }

    .btn-primary {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-primary:hover {
      background: #6d28d9;
    }

    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #334155;
      color: #fff;
    }

    .text-xxs { font-size: 10px; }
  `]
})
export class AppComponent {
  readonly store = inject(TreeStore);
  readonly aiService = inject(AIGeneratorService);

  readonly showSettingsModal = signal<boolean>(false);

  geminiKeyInput = '';
  groqKeyInput = '';
  preferredProviderInput: AIProviderType = 'GEMINI';

  geminiTestResult = signal<{ success: boolean; message: string } | null>(null);
  groqTestResult = signal<{ success: boolean; message: string } | null>(null);

  openSettingsModal(): void {
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
}
