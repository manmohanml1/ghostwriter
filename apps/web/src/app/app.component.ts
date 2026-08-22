import { Component, inject } from '@angular/core';
import { HeaderComponent } from './features/header/header.component';
import { TreeCanvasComponent } from './features/canvas/tree-canvas.component';
import { NodeInspectorComponent } from './features/inspector/node-inspector.component';
import { StoryReaderComponent } from './features/reader/story-reader.component';
import { TreeStore } from './core/state/tree.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, TreeCanvasComponent, NodeInspectorComponent, StoryReaderComponent],
  template: `
    <div class="app-layout">
      <app-header />
      <main class="main-workspace">
        @if (store.activeViewMode() === 'CANVAS') {
          <app-tree-canvas class="canvas-area" />
          <app-node-inspector />
        } @else {
          <app-story-reader class="w-full h-full" />
        }
      </main>
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
  `]
})
export class AppComponent {
  readonly store = inject(TreeStore);
}
