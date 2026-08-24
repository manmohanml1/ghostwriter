import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeStore } from '../../core/state/tree.store';
import { ReaderTheme } from '../../core/models/graph.models';

@Component({
  selector: 'app-story-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './story-reader.component.html',
  styleUrl: './story-reader.component.css'
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
