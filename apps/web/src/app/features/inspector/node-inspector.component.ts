import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeStore } from '../../core/state/tree.store';
import { AuthorType, ChapterBeatFocus } from '../../core/models/graph.models';
import { LoreBibleComponent } from './lore-bible.component';

type InspectorTab = 'EDITOR' | 'LORE' | 'COHERENCE';

@Component({
  selector: 'app-node-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, LoreBibleComponent],
  template: `
    @if (store.selectedNode(); as node) {
      <aside class="inspector-panel" [class.collapsed]="!store.isInspectorOpen()">
        <!-- Header & Breadcrumbs -->
        <div class="inspector-header">
          <div class="breadcrumbs">
            @for (crumb of store.breadcrumbTrail(); track crumb.id; let last = $last) {
              <span 
                class="crumb-link" 
                [class.active]="last"
                (click)="store.selectNode(crumb.id)"
              >
                {{ crumb.title || 'Chapter' }}
              </span>
              @if (!last) { <span class="crumb-separator">/</span> }
            }
          </div>

          <button class="btn-close" (click)="store.isInspectorOpen.set(false)" title="Close Inspector">✕ Done</button>
        </div>

        <!-- Inspector Tabs -->
        <div class="tab-bar">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'EDITOR'"
            (click)="activeTab.set('EDITOR')"
          >
            ✍️ Chapter Editor
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'LORE'"
            (click)="activeTab.set('LORE')"
          >
            📜 Lore Bible ({{ store.loreBible().length }})
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'COHERENCE'"
            (click)="activeTab.set('COHERENCE')"
          >
            🎯 Coherence
          </button>
        </div>

        <div class="inspector-body">
          <!-- TAB 1: CHAPTER EDITOR -->
          @if (activeTab() === 'EDITOR') {
            <!-- Status & Chapter Metrics Banner -->
            <div class="metrics-card">
              <div class="flex items-center justify-between">
                <div class="status-info">
                  <span class="status-indicator"></span>
                  <span class="status-title">
                    @if (node.status === 'CANON_PATH') { ⭐ Canon Storyline Path }
                    @else if (node.status === 'PRUNED') { ⛔ Pruned (Abandoned Timeline) }
                    @else { ✍️ Active Chapter Branch }
                  </span>
                </div>
                <span class="read-badge">📖 ~{{ store.activeChapterReadTime() }} min read</span>
              </div>

              <!-- Word Count Goal Progress Meter with Clean Layout -->
              <div class="word-meter-box">
                <div class="meter-labels-row">
                  <span class="meter-current-count">{{ store.activeChapterWordCount() }} words</span>
                  <span class="meter-target-label">Target: 1,500w (Novel Chapter)</span>
                </div>
                <div class="meter-bar">
                  <div 
                    class="meter-fill" 
                    [style.width.%]="Math.min(100, (store.activeChapterWordCount() / 1500) * 100)"
                  ></div>
                </div>
              </div>
            </div>

            @if (node.status === 'PRUNED') {
              <!-- Pruned Node Recovery Banner -->
              <div class="pruned-alert-box">
                <div class="flex items-center justify-between">
                  <div>
                    <h5 class="pruned-title">⛔ This branch was pruned</h5>
                    <p class="pruned-desc">This timeline is excluded from the canon story.</p>
                  </div>
                  <div class="flex gap-2">
                    <button class="btn-restore" (click)="store.restorePrunedNode(node.id)">♻️ Restore</button>
                    <button class="btn-delete-perm" (click)="store.permanentlyDeleteNode(node.id)">🗑️ Delete</button>
                  </div>
                </div>
              </div>
            }

            <!-- Title Input -->
            <div class="form-group">
              <label class="form-label">Chapter / Scene Title</label>
              <input
                type="text"
                class="input-title"
                [ngModel]="node.title"
                (ngModelChange)="onTitleChange($event)"
                placeholder="e.g. Chapter 1: The Midnight Transmission"
              />
            </div>

            <!-- Deep Webnovel Chapter Expander Actions -->
            <div class="novel-writer-tools">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200">⚡ Webnovel Pro Actions:</span>
                <select [(ngModel)]="selectedBeatFocus" class="select-beat">
                  <option value="BALANCED">⚖️ Balanced Multi-Scene</option>
                  <option value="ACTION_CONFRONTATION">💥 Action & Confrontation</option>
                  <option value="CHARACTER_DIALOGUE">🗣️ Deep Dialogue & Drama</option>
                  <option value="INVESTIGATION_LORE">🔍 Forensic Investigation</option>
                  <option value="CLIFFHANGER_CLIMAX">⚡ Shocking Cliffhanger</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2 mt-2">
                <button 
                  class="btn-expand-novel"
                  [disabled]="store.isExpandingChapter()"
                  (click)="expandChapter()"
                >
                  @if (store.isExpandingChapter()) { ⏳ Expanding Novel Chapter... }
                  @else { ⚡ Expand into Full Chapter }
                </button>

                <button 
                  class="btn-continue-para"
                  [disabled]="store.isGeneratingAI()"
                  (click)="store.appendNextParagraph()"
                >
                  @if (store.isGeneratingAI()) { ⏳ Writing... }
                  @else { ⏩ + Write Next Paragraph }
                </button>
              </div>
            </div>

            <!-- Content / Markdown Editor -->
            <div class="form-group flex-1 flex flex-col">
              <div class="flex justify-between items-center mb-1">
                <label class="form-label">Chapter Narrative (Markdown)</label>
                <div class="flex items-center gap-2">
                  @if (store.canUndoAI()) {
                    <button class="btn-undo-link" (click)="store.undoLastAIChange()" title="Revert to previous text before AI generation">
                      ↺ Undo AI Write
                    </button>
                  }
                  <span class="text-xs text-slate-500 font-mono">{{ node.content.length }} chars</span>
                </div>
              </div>

              @if (store.activeChildren().length > 0) {
                <div class="parent-branch-warning-banner mb-2">
                  <div class="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <span>⚠️</span>
                    <span>Parent Chapter ({{ store.activeChildren().length }} Child Branches)</span>
                  </div>
                  <p class="text-xxs text-amber-200 mt-0.5">
                    Modifying this root prose may create narrative divergence with downstream paths.
                  </p>
                </div>
              }

              @if (store.canUndoAI()) {
                <div class="undo-banner mb-2">
                  <span class="undo-text">✨ AI writing generated. Review or revert anytime:</span>
                  <button class="btn-undo-ai" (click)="store.undoLastAIChange()">
                    ↺ Restore Previous Text
                  </button>
                </div>
              }

              <textarea
                class="textarea-content"
                [ngModel]="node.content"
                (ngModelChange)="onContentChange($event)"
                rows="8"
                placeholder="Write story text, multi-character dialogue, and world details..."
              ></textarea>
            </div>

            <!-- AI 3-Way Continuation Trigger -->
            <div class="ai-trigger-card">
              <div class="ai-trigger-header">
                <div>
                  <h4 class="ai-title">✨ Branching AI Engine</h4>
                  <p class="ai-subtitle">Generate 3 branching paths (*Action*, *Plot Twist*, *Intrigue*).</p>
                </div>
                <button 
                  class="btn-sparkle" 
                  [disabled]="store.isGeneratingAI()"
                  (click)="store.generate3AIPaths()"
                >
                  @if (store.isGeneratingAI()) { ⏳ Writing... }
                  @else { ✨ Suggest 3 Paths }
                </button>
              </div>

              <!-- AI Suggestions Preview Cards -->
              @if (store.activeAiSuggestions().length > 0) {
                <div class="suggestions-list">
                  <div class="flex items-center justify-between mt-2 mb-1">
                    <span class="text-xs font-semibold text-purple-300">Suggested Branch Hypotheses:</span>
                    <button class="btn-add-all" (click)="store.applyAllAISuggestions(node.id)">＋ Add All 3 Paths</button>
                  </div>

                  @for (suggestion of store.activeAiSuggestions(); track suggestion.title) {
                    <div class="suggestion-card">
                      <div class="suggestion-header">
                        <span class="persona-tag">🤖 {{ suggestion.persona }}</span>
                        <span class="score-tag">★ {{ suggestion.coherenceScore }}%</span>
                      </div>
                      <h5 class="suggestion-title">{{ suggestion.title }}</h5>
                      <p class="suggestion-desc">{{ suggestion.content }}</p>
                      <p class="suggestion-rationale">💡 {{ suggestion.rationale }}</p>
                      <button class="btn-apply-suggestion" (click)="store.applyAISuggestion(node.id, suggestion)">
                        ＋ Add this branch to canvas
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Manual Branch Creator Form -->
            @if (showNewBranchForm()) {
              <div class="branch-create-box">
                <h4 class="box-title">Create Manual Branch</h4>
                <input
                  type="text"
                  class="input-branch-title"
                  [(ngModel)]="newBranchTitle"
                  placeholder="Branch title..."
                />
                <textarea
                  class="textarea-branch-content"
                  [(ngModel)]="newBranchContent"
                  rows="3"
                  placeholder="Chapter continuation notes..."
                ></textarea>

                <div class="flex gap-2 items-center mb-3">
                  <label class="text-xs text-slate-400">Author:</label>
                  <select [(ngModel)]="newBranchAuthor" class="select-author">
                    <option value="HUMAN">✍️ Human Author</option>
                    <option value="AGENT">🤖 AI Persona</option>
                  </select>
                </div>

                <div class="flex gap-2 justify-end">
                  <button class="btn-secondary" (click)="showNewBranchForm.set(false)">Cancel</button>
                  <button class="btn-primary" (click)="submitNewBranch()">Add Branch</button>
                </div>
              </div>
            }

            <!-- Bottom Actions -->
            <div class="inspector-actions">
              @if (!showNewBranchForm() && node.status !== 'PRUNED') {
                <button class="btn-action btn-add-branch" (click)="showNewBranchForm.set(true)">
                  <span>＋</span> Manual Branch
                </button>
              }

              @if (node.status !== 'CANON_PATH' && node.parentNodeId && node.status !== 'PRUNED') {
                <button class="btn-action btn-winner" (click)="store.setCanonPath(node.id)">
                  <span>⭐</span> Set as Canon
                </button>
              }

              @if (node.status !== 'PRUNED' && node.parentNodeId) {
                <button class="btn-action btn-prune" (click)="store.pruneNode(node.id)">
                  <span>⛔</span> Prune Timeline
                </button>
              }

              @if (store.prunedNodesCount() > 0) {
                <button class="btn-purge-all" (click)="store.purgeAllPruned()">
                  🧹 Clean Up All {{ store.prunedNodesCount() }} Pruned Branches
                </button>
              }
            </div>
          }

          <!-- TAB 2: LORE BIBLE -->
          @if (activeTab() === 'LORE') {
            <app-lore-bible />
          }

          <!-- TAB 3: COHERENCE MATRIX -->
          @if (activeTab() === 'COHERENCE') {
            <div class="coherence-tab">
              <h4 class="section-title">Narrative Coherence Matrix</h4>
              @if (node.perspectiveScores && node.perspectiveScores.length > 0) {
                <div class="scores-list">
                  @for (score of node.perspectiveScores; track score.perspectiveName) {
                    <div class="score-card">
                      <div class="score-row">
                        <span class="score-name">{{ score.perspectiveName }}</span>
                        <span class="score-val">{{ score.score }}%</span>
                      </div>
                      <p class="score-reasoning">{{ score.reasoning }}</p>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-xs text-slate-400">Coherence is automatically scored when AI co-writers generate branch continuations.</p>
              }
            </div>
          }
        </div>
      </aside>
    }

    <!-- Divergence Confirmation Modal -->
    @if (showExpandWarningModal()) {
      <div class="custom-modal-backdrop" (click)="showExpandWarningModal.set(false)">
        <div class="custom-modal-card" (click)="$event.stopPropagation()">
          <div class="custom-modal-header">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚠️</span>
              <div>
                <h3 class="custom-modal-title">Modify Active Parent Chapter?</h3>
                <p class="custom-modal-subtitle">This node has {{ store.activeChildren().length }} child branch(es).</p>
              </div>
            </div>
            <button class="btn-modal-close" (click)="showExpandWarningModal.set(false)">✕</button>
          </div>

          <div class="custom-modal-body">
            <div class="warning-box">
              <span class="warning-tag">⚠️ Continuity & Divergence Notice</span>
              <p class="warning-text">
                Expanding or rewriting this root chapter will alter the narrative context for its <b>{{ store.activeChildren().length }}</b> existing downstream branches.
              </p>
              <p class="warning-text mt-2">
                Child branches will remain connected, but their setup may diverge from the rewritten text. You can also use <b>↺ Undo AI Write</b> to restore previous text at any time.
              </p>
            </div>
          </div>

          <div class="custom-modal-footer">
            <button class="btn-cancel" (click)="showExpandWarningModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="proceedWithExpand()">⚡ Proceed with AI Expand</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .inspector-panel {
      width: 480px;
      height: 100%;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(51, 65, 85, 0.8);
      display: flex;
      flex-direction: column;
      z-index: 40;
      box-shadow: -8px 0 25px rgba(0, 0, 0, 0.5);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .inspector-panel.collapsed {
      transform: translateX(100%);
      width: 0;
      opacity: 0;
    }

    .inspector-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .breadcrumbs {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 11px;
      color: #64748b;
    }

    .crumb-link {
      cursor: pointer;
      color: #94a3b8;
      transition: color 0.15s ease;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .crumb-link:hover {
      color: #c084fc;
    }

    .crumb-link.active {
      color: #f8fafc;
      font-weight: 600;
    }

    .crumb-separator {
      color: #475569;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .btn-close:hover {
      background: #1e293b;
      color: #f8fafc;
    }

    .tab-bar {
      display: flex;
      background: #0b1120;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      padding: 4px 12px 0 12px;
      gap: 4px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: #f8fafc;
    }

    .tab-btn.active {
      background: rgba(30, 41, 59, 0.8);
      color: #c084fc;
      border-bottom: 2px solid #a855f7;
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metrics-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a855f7;
      display: inline-block;
      margin-right: 6px;
    }

    .status-title {
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .read-badge {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
      background: #0f172a;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .word-meter-box {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .meter-labels-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .meter-current-count {
      font-size: 12px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #f8fafc;
    }

    .meter-target-label {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: #c084fc;
      background: rgba(192, 132, 252, 0.12);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .meter-bar {
      width: 100%;
      height: 6px;
      background: #0f172a;
      border-radius: 3px;
      overflow: hidden;
    }

    .meter-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
      transition: width 0.3s ease;
    }

    .parent-branch-warning-banner {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 8px;
      padding: 8px 12px;
      animation: fadeIn 0.2s ease-out;
    }

    .undo-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.4);
      padding: 8px 12px;
      border-radius: 8px;
      animation: fadeIn 0.2s ease-out;
    }

    .undo-text {
      font-size: 11px;
      color: #e9d5ff;
      font-weight: 500;
    }

    .btn-undo-ai {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
    }

    .btn-undo-ai:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .btn-undo-link {
      background: transparent;
      border: none;
      color: #c084fc;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }

    .btn-undo-link:hover {
      color: #e9d5ff;
    }

    .pruned-alert-box {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 10px;
      padding: 10px 14px;
    }

    .pruned-title {
      font-size: 12px;
      font-weight: 700;
      color: #fca5a5;
    }

    .pruned-desc {
      font-size: 10px;
      color: #94a3b8;
    }

    .btn-restore {
      background: #1e293b;
      border: 1px solid #475569;
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-delete-perm {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    .novel-writer-tools {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
    }

    .select-beat {
      background: #0b1120;
      border: 1px solid #334155;
      color: #cbd5e1;
      font-size: 11px;
      padding: 3px 6px;
      border-radius: 6px;
      outline: none;
    }

    .btn-expand-novel {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      border: none;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .btn-continue-para {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-continue-para:hover {
      background: #334155;
      color: #fff;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .input-title {
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      outline: none;
    }

    .textarea-content {
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.6;
      outline: none;
      resize: vertical;
      font-family: inherit;
    }

    .ai-trigger-card {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(168, 85, 247, 0.05) 100%);
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ai-trigger-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .ai-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }

    .ai-subtitle {
      font-size: 10px;
      color: #94a3b8;
    }

    .btn-sparkle {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
      white-space: nowrap;
    }

    .suggestions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .suggestion-card {
      background: #0b1120;
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .suggestion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .persona-tag {
      font-size: 10px;
      font-weight: 700;
      color: #c084fc;
    }

    .score-tag {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: #facc15;
    }

    .suggestion-title {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
    }

    .suggestion-desc {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .suggestion-rationale {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }

    .btn-apply-suggestion {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
    }

    .btn-add-all {
      background: transparent;
      border: 1px solid #a855f7;
      color: #c084fc;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .branch-create-box {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid #a855f7;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .box-title {
      font-size: 12px;
      font-weight: 700;
      color: #e2e8f0;
    }

    .input-branch-title, .textarea-branch-content, .select-author {
      background: #0b1120;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11px;
      color: #f8fafc;
      outline: none;
    }

    .inspector-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: auto;
      border-top: 1px solid rgba(51, 65, 85, 0.6);
      padding-top: 12px;
    }

    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-add-branch {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }

    .btn-add-branch:hover {
      background: #334155;
      color: #fff;
    }

    .btn-winner {
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.4);
      color: #fde047;
    }

    .btn-winner:hover {
      background: rgba(234, 179, 8, 0.25);
    }

    .btn-prune {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .btn-purge-all {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-purge-all:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    .btn-primary {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }

    .score-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .score-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .score-name {
      color: #c4b5fd;
    }

    .score-val {
      font-family: 'JetBrains Mono', monospace;
      color: #facc15;
    }

    .score-reasoning {
      font-size: 10px;
      color: #64748b;
      line-height: 1.35;
    }

    /* Modal Styles */
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

    @media (max-width: 1024px) {
      .inspector-panel {
        position: fixed;
        top: 56px;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100vw;
        max-width: 100vw;
        z-index: 100;
        border-left: none;
        border-top: 1px solid rgba(168, 85, 247, 0.4);
      }

      .inspector-panel.collapsed {
        transform: translateY(100%);
        width: 100vw;
        opacity: 0;
        pointer-events: none;
      }
    }
  `]
})
export class NodeInspectorComponent {
  readonly store = inject(TreeStore);
  readonly Math = Math;

  readonly activeTab = signal<InspectorTab>('EDITOR');
  readonly showNewBranchForm = signal<boolean>(false);
  readonly showExpandWarningModal = signal<boolean>(false);
  selectedBeatFocus: ChapterBeatFocus = 'BALANCED';

  newBranchTitle = '';
  newBranchContent = '';
  newBranchAuthor: AuthorType = 'HUMAN';

  onTitleChange(title: string): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.updateNode(active.id, { title });
    }
  }

  onContentChange(content: string): void {
    const active = this.store.selectedNode();
    if (active) {
      this.store.updateNode(active.id, { content });
    }
  }

  expandChapter(): void {
    if (this.store.activeChildren().length > 0) {
      this.showExpandWarningModal.set(true);
    } else {
      this.proceedWithExpand();
    }
  }

  proceedWithExpand(): void {
    this.showExpandWarningModal.set(false);
    this.store.expandActiveChapter({
      targetLength: 'FULL_CHAPTER',
      focusBeat: this.selectedBeatFocus
    });
  }

  submitNewBranch(): void {
    const active = this.store.selectedNode();
    if (!active) return;

    this.store.addBranch(
      active.id,
      this.newBranchTitle,
      this.newBranchContent,
      this.newBranchAuthor
    );

    this.newBranchTitle = '';
    this.newBranchContent = '';
    this.showNewBranchForm.set(false);
  }
}
