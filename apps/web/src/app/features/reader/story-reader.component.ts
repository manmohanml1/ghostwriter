import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeStore } from '../../core/state/tree.store';
import { ReaderTheme } from '../../core/models/graph.models';

@Component({
  selector: 'app-story-reader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reader-viewport" [attr.data-theme]="store.readerTheme()">
      <!-- Top LNReader-Style Header -->
      <header class="reader-header">
        <div class="header-left">
          <button class="btn-back" (click)="store.setViewMode('CANVAS')" title="Return to Story Graph">
            ← Studio Canvas
          </button>
          <div class="story-meta">
            <h2 class="story-title">{{ store.currentTree().title }}</h2>
            <span class="genre-tag">{{ store.styleConfig().genre }} • {{ store.styleConfig().tone }}</span>
          </div>
        </div>

        <!-- Center: Webnovel Customization Toolbar -->
        <div class="reader-toolbar">
          <!-- Theme Switcher -->
          <div class="theme-picker">
            <button 
              class="theme-dot dot-slate" 
              [class.active]="store.readerTheme() === 'DARK_SLATE'"
              (click)="store.setReaderTheme('DARK_SLATE')"
              title="Dark Slate Theme"
            ></button>
            <button 
              class="theme-dot dot-oled" 
              [class.active]="store.readerTheme() === 'OLED_BLACK'"
              (click)="store.setReaderTheme('OLED_BLACK')"
              title="OLED Pure Black Theme"
            ></button>
            <button 
              class="theme-dot dot-sepia" 
              [class.active]="store.readerTheme() === 'WARM_SEPIA'"
              (click)="store.setReaderTheme('WARM_SEPIA')"
              title="Warm Vintage Sepia Theme"
            ></button>
            <button 
              class="theme-dot dot-paper" 
              [class.active]="store.readerTheme() === 'NOVEL_PAPER'"
              (click)="store.setReaderTheme('NOVEL_PAPER')"
              title="Paper Light Theme"
            ></button>
          </div>

          <!-- Font Size Adjuster -->
          <div class="font-controls">
            <button class="btn-font" (click)="decreaseFont()" title="Decrease font size">A-</button>
            <span class="font-indicator">{{ store.readerFontSize() }}px</span>
            <button class="btn-font" (click)="increaseFont()" title="Increase font size">A+</button>
          </div>

          <!-- Table of Contents Toggle -->
          <button 
            class="btn-toc" 
            [class.active]="showToc()"
            (click)="toggleToc()"
            title="Table of Contents"
          >
            📑 Chapters ({{ store.breadcrumbTrail().length }})
          </button>
        </div>

        <div class="header-right">
          <span class="word-count-badge">
            📚 {{ store.totalStoryWordCount() }} words total
          </span>
        </div>
      </header>

      <!-- Main Webnovel Flow & Drawer Container -->
      <div class="reader-layout-body">
        <!-- Table of Contents Sidebar Drawer -->
        @if (showToc()) {
          <aside class="toc-drawer">
            <div class="toc-header">
              <h4 class="toc-title">Table of Contents</h4>
              <button class="btn-close-toc" (click)="closeToc()">✕</button>
            </div>
            <div class="toc-list">
              @for (chapter of store.breadcrumbTrail(); track chapter.id; let idx = $index; let last = $last) {
                <div 
                  class="toc-item"
                  [class.active]="last"
                  (click)="selectChapter(chapter.id)"
                >
                  <span class="toc-chapter-num">Ch {{ idx + 1 }}</span>
                  <div class="toc-item-meta">
                    <span class="toc-item-title">{{ chapter.title }}</span>
                    <span class="toc-item-words">{{ getWordCount(chapter.content) }}w</span>
                  </div>
                </div>
              }
            </div>
          </aside>
        }

        <!-- Main Reading Flow -->
        <main class="reader-container">
          <article class="prose-container" [style.fontSize.px]="store.readerFontSize()">
            <!-- Render Trail of Past Chapters -->
            @for (chapter of store.breadcrumbTrail(); track chapter.id; let last = $last; let idx = $index) {
              <section 
                class="chapter-section"
                [class.active-chapter]="last"
                [class.past-chapter]="!last"
              >
                <div class="chapter-header">
                  <span class="chapter-badge">Chapter {{ idx + 1 }}</span>
                  <h3 class="chapter-heading">{{ chapter.title }}</h3>
                  <div class="chapter-stats">
                    <span class="stat-pill">📖 ~{{ getReadTime(chapter.content) }} min read</span>
                    <span class="stat-pill">✍️ {{ getWordCount(chapter.content) }} words</span>
                  </div>
                </div>

                <div class="chapter-body">
                  @for (paragraph of formatParagraphs(chapter.content); track $index) {
                    @if (paragraph.startsWith('###')) {
                      <h4 class="scene-subheading">{{ paragraph.replace('###', '').trim() }}</h4>
                    } @else {
                      <p class="prose-paragraph">{{ paragraph }}</p>
                    }
                  }
                </div>

                @if (!last) {
                  <div class="chapter-divider">
                    <span class="divider-line"></span>
                    <button class="btn-rewind" (click)="store.selectNode(chapter.id)">Rewind to this chapter ↺</button>
                    <span class="divider-line"></span>
                  </div>
                }
              </section>
            }

            <!-- Branching Decisions / Next Path Selection -->
            <div class="decision-fork-section">
              <h4 class="fork-title">✨ Where does the story branch next?</h4>

              @if (store.activeChildren().length > 0) {
                <div class="choices-grid">
                  @for (choice of store.activeChildren(); track choice.id) {
                    <div 
                      class="choice-card"
                      [class.canon-choice]="choice.status === 'CANON_PATH'"
                      (click)="store.selectNode(choice.id)"
                    >
                      <div class="choice-header">
                        <span class="choice-persona">
                          @if (choice.authorType === 'AGENT') { 🤖 {{ choice.agentPersona || 'Co-Writer' }} }
                          @else { 👤 Author Choice }
                        </span>
                        @if (choice.status === 'CANON_PATH') {
                          <span class="canon-badge">⭐ Canon</span>
                        }
                      </div>
                      <h5 class="choice-title">{{ choice.title }}</h5>
                      <p class="choice-preview">{{ getPreviewSnippet(choice.content) }}</p>
                      <button class="btn-choose">Continue down this path →</button>
                    </div>
                  }
                </div>
              } @else {
                <!-- No Branches Yet: Prompt AI or Return to Studio -->
                <div class="empty-fork-card">
                  <div class="empty-icon">✍️</div>
                  <h5 class="empty-title">You have reached the frontier of this timeline!</h5>
                  <p class="empty-desc">Expand this chapter with more scenes or propose 3 new AI continuations.</p>
                  <div class="flex gap-3 justify-center mt-4">
                    <button 
                      class="btn-expand-chapter" 
                      [disabled]="store.isExpandingChapter()"
                      (click)="expandCurrentChapter()"
                    >
                      @if (store.isExpandingChapter()) { ⏳ Expanding Chapter... }
                      @else { ⚡ Expand into Full Chapter }
                    </button>
                    <button 
                      class="btn-generate-ai" 
                      [disabled]="store.isGeneratingAI()"
                      (click)="store.generate3AIPaths()"
                    >
                      @if (store.isGeneratingAI()) { ⏳ Writing... }
                      @else { ✨ Suggest 3 AI Branches }
                    </button>
                  </div>
                </div>
              }
            </div>
          </article>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .reader-viewport {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    /* THEME DEFINITIONS */
    .reader-viewport[data-theme="DARK_SLATE"] {
      background: #090d16;
      --reader-card-bg: rgba(15, 23, 42, 0.92);
      --reader-border: rgba(51, 65, 85, 0.6);
      --reader-text: #cbd5e1;
      --reader-heading: #f8fafc;
      --reader-accent: #c084fc;
      --reader-header-bg: rgba(15, 23, 42, 0.95);
    }

    .reader-viewport[data-theme="OLED_BLACK"] {
      background: #000000;
      --reader-card-bg: #0a0a0a;
      --reader-border: #222222;
      --reader-text: #d4d4d8;
      --reader-heading: #ffffff;
      --reader-accent: #a855f7;
      --reader-header-bg: #050505;
    }

    .reader-viewport[data-theme="WARM_SEPIA"] {
      background: #fbf0d9;
      --reader-card-bg: #f4e4c1;
      --reader-border: #e0cca4;
      --reader-text: #433422;
      --reader-heading: #261b11;
      --reader-accent: #8b5cf6;
      --reader-header-bg: #edd9b1;
    }

    .reader-viewport[data-theme="NOVEL_PAPER"] {
      background: #f8fafc;
      --reader-card-bg: #ffffff;
      --reader-border: #e2e8f0;
      --reader-text: #334155;
      --reader-heading: #0f172a;
      --reader-accent: #7c3aed;
      --reader-header-bg: #f1f5f9;
    }

    .reader-header {
      height: 64px;
      background: var(--reader-header-bg);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--reader-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 30;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .btn-back {
      background: rgba(0, 0, 0, 0.15);
      color: var(--reader-heading);
      border: 1px solid var(--reader-border);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .story-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--reader-heading);
    }

    .genre-tag {
      font-size: 11px;
      color: var(--reader-text);
      opacity: 0.8;
    }

    .reader-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .theme-picker {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.15);
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid var(--reader-border);
    }

    .theme-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .theme-dot:hover {
      transform: scale(1.15);
    }

    .theme-dot.active {
      border-color: #a855f7;
    }

    .dot-slate { background: #090d16; }
    .dot-oled { background: #000000; border: 1px solid #444; }
    .dot-sepia { background: #fbf0d9; border: 1px solid #d4be94; }
    .dot-paper { background: #ffffff; border: 1px solid #cbd5e1; }

    .font-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(0, 0, 0, 0.15);
      padding: 2px 6px;
      border-radius: 8px;
      border: 1px solid var(--reader-border);
    }

    .btn-font {
      background: transparent;
      border: none;
      color: var(--reader-heading);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .font-indicator {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--reader-text);
      min-width: 32px;
      text-align: center;
    }

    .btn-toc {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid var(--reader-border);
      color: var(--reader-heading);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-toc.active {
      background: var(--reader-accent);
      color: #fff;
    }

    .word-count-badge {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--reader-heading);
      background: rgba(0, 0, 0, 0.15);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--reader-border);
    }

    .reader-layout-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    .toc-drawer {
      width: 280px;
      height: 100%;
      background: var(--reader-header-bg);
      border-right: 1px solid var(--reader-border);
      display: flex;
      flex-direction: column;
      z-index: 20;
    }

    .toc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--reader-border);
    }

    .toc-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--reader-heading);
    }

    .btn-close-toc {
      background: transparent;
      border: none;
      color: var(--reader-text);
      cursor: pointer;
      font-size: 14px;
    }

    .toc-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .toc-item:hover {
      background: rgba(0, 0, 0, 0.1);
      border-color: var(--reader-border);
    }

    .toc-item.active {
      background: rgba(168, 85, 247, 0.15);
      border-color: var(--reader-accent);
    }

    .toc-chapter-num {
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--reader-accent);
    }

    .toc-item-meta {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toc-item-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--reader-heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .toc-item-words {
      font-size: 10px;
      color: var(--reader-text);
      opacity: 0.7;
    }

    .reader-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      padding: 40px 20px 80px 20px;
    }

    .prose-container {
      max-width: 760px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .chapter-section {
      background: var(--reader-card-bg);
      border: 1px solid var(--reader-border);
      border-radius: 16px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    }

    .chapter-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--reader-border);
      padding-bottom: 16px;
    }

    .chapter-badge {
      font-size: 11px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--reader-accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .chapter-heading {
      font-size: 24px;
      font-weight: 800;
      color: var(--reader-heading);
      letter-spacing: -0.02em;
    }

    .chapter-stats {
      display: flex;
      gap: 8px;
    }

    .stat-pill {
      font-size: 11px;
      color: var(--reader-text);
      opacity: 0.8;
    }

    .chapter-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .scene-subheading {
      font-size: 18px;
      font-weight: 700;
      color: var(--reader-heading);
      margin-top: 14px;
      border-left: 3px solid var(--reader-accent);
      padding-left: 10px;
    }

    .prose-paragraph {
      line-height: 1.85;
      color: var(--reader-text);
      font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
      text-indent: 1.5em;
    }

    .chapter-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 28px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: var(--reader-border);
    }

    .btn-rewind {
      background: transparent;
      border: 1px solid var(--reader-border);
      color: var(--reader-text);
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 12px;
      cursor: pointer;
    }

    .btn-rewind:hover {
      border-color: var(--reader-accent);
      color: var(--reader-heading);
    }

    .decision-fork-section {
      background: var(--reader-card-bg);
      border: 1px solid var(--reader-accent);
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .fork-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--reader-heading);
      text-align: center;
    }

    .choices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .choice-card {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid var(--reader-border);
      border-radius: 12px;
      padding: 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .choice-card:hover {
      transform: translateY(-3px);
      border-color: var(--reader-accent);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .choice-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .choice-persona {
      font-size: 10px;
      font-weight: 600;
      color: var(--reader-accent);
    }

    .canon-badge {
      font-size: 10px;
      font-weight: 700;
      color: #facc15;
    }

    .choice-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--reader-heading);
    }

    .choice-preview {
      font-size: 12px;
      color: var(--reader-text);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .btn-choose {
      margin-top: auto;
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .empty-fork-card {
      text-align: center;
      padding: 20px 10px;
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--reader-heading);
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 13px;
      color: var(--reader-text);
    }

    .btn-expand-chapter {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
    }

    .btn-generate-ai {
      background: rgba(0, 0, 0, 0.15);
      color: var(--reader-heading);
      border: 1px solid var(--reader-border);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class StoryReaderComponent {
  readonly store = inject(TreeStore);
  readonly showToc = signal<boolean>(false);

  toggleToc(): void {
    this.showToc.update(v => !v);
  }

  closeToc(): void {
    this.showToc.set(false);
  }

  selectChapter(id: string): void {
    this.store.selectNode(id);
    this.closeToc();
  }

  increaseFont(): void {
    this.store.setReaderFontSize(this.store.readerFontSize() + 1);
  }

  decreaseFont(): void {
    this.store.setReaderFontSize(this.store.readerFontSize() - 1);
  }

  formatParagraphs(content: string): string[] {
    return content
      .split(/\n\n+/)
      .map(p => p.replace(/#+\s/g, '').trim())
      .filter(p => p.length > 0);
  }

  getPreviewSnippet(content: string): string {
    return content
      .replace(/#+\s/g, '')
      .replace(/[*_`]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  }

  getWordCount(content: string): number {
    return content ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  }

  getReadTime(content: string): number {
    const words = this.getWordCount(content);
    return Math.max(1, Math.ceil(words / 200));
  }

  expandCurrentChapter(): void {
    this.store.expandActiveChapter({
      targetLength: 'FULL_CHAPTER',
      focusBeat: 'BALANCED'
    });
  }
}
