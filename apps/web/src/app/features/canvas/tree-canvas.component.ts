import { Component, inject, computed, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeStore } from '../../core/state/tree.store';
import { TreeNode } from '../../core/models/graph.models';

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutEdge {
  id: string;
  source: LayoutNode;
  target: LayoutNode;
  path: string;
  label?: string;
  edgeType: string;
}

@Component({
  selector: 'app-tree-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #canvasContainer
      class="canvas-viewport"
      (mousedown)="onPanStart($event)"
      (mousemove)="onPanMove($event)"
      (mouseup)="onPanEnd()"
      (mouseleave)="onPanEnd()"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd()"
      (wheel)="onWheel($event)"
      tabindex="0"
      (keydown)="onKeyDown($event)"
    >
      <!-- Canvas Navigation Controls Overlay -->
      <div class="canvas-controls">
        <button class="btn-control" (click)="zoomIn()" title="Zoom In">+</button>
        <span class="zoom-indicator">{{ (store.zoomLevel() * 100) | number:'1.0-0' }}%</span>
        <button class="btn-control" (click)="zoomOut()" title="Zoom Out">-</button>
        <button class="btn-control btn-fit" (click)="resetView()" title="Fit View">⛶ Fit</button>
      </div>

      <!-- Graph Surface Container with Scale & Pan -->
      <div 
        class="canvas-surface"
        [style.transform]="'translate(' + panX() + 'px, ' + panY() + 'px) scale(' + store.zoomLevel() + ')'"
      >
        <!-- SVG Connecting Curves Layer -->
        <svg class="edges-layer" [attr.width]="canvasBounds().width" [attr.height]="canvasBounds().height">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#a855f7" stop-opacity="0.9" />
            </linearGradient>
            <linearGradient id="canonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#eab308" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#facc15" stop-opacity="1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          @for (edge of computedEdges(); track edge.id) {
            <path
              [attr.d]="edge.path"
              class="edge-path"
              [class.edge-canon]="edge.target.status === 'CANON_PATH'"
              [class.edge-pruned]="edge.target.status === 'PRUNED'"
            />
            @if (edge.label) {
              <text
                [attr.x]="(edge.source.x + edge.target.x) / 2 + 130"
                [attr.y]="(edge.source.y + edge.target.y) / 2 + 30"
                class="edge-label"
              >
                {{ edge.label }}
              </text>
            }
          }
        </svg>

        <!-- HTML Node Cards Layer -->
        <div class="nodes-layer">
          @for (node of computedNodes(); track node.id) {
            <div
              class="node-card"
              [class.selected]="store.selectedNodeId() === node.id"
              [class.canon]="node.status === 'CANON_PATH'"
              [class.pruned]="node.status === 'PRUNED'"
              [class.exploring]="node.status === 'EXPLORING'"
              [style.left.px]="node.x"
              [style.top.px]="node.y"
              (click)="onNodeClick($event, node.id)"
            >
              <!-- Card Header / Author Badge -->
              <div class="node-header">
                <span class="author-badge" [attr.data-author]="node.authorType">
                  @if (node.authorType === 'AGENT') { 🤖 {{ node.agentPersona || 'Co-Writer' }} }
                  @else if (node.authorType === 'SYSTEM') { ⚡ Story Synthesis }
                  @else { ✍️ Author }
                </span>

                @if (node.coherenceScore !== null && node.status !== 'PRUNED') {
                  <span class="score-badge" [class.high-score]="node.coherenceScore >= 85">
                    ★ {{ node.coherenceScore }}%
                  </span>
                }
              </div>

              <!-- Node Title -->
              <h3 class="node-title">{{ node.title }}</h3>

              <!-- Markdown Snippet Preview -->
              <p class="node-preview">{{ getPreviewText(node.content) }}</p>

              <!-- Node Footer / Depth & Quick Actions -->
              <div class="node-footer">
                <span class="depth-tag">Chapter {{ node.depth + 1 }}</span>
                @if (node.status === 'CANON_PATH') {
                  <span class="canon-tag">⭐ Canon Path</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .canvas-viewport {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #070a12;
      background-image: 
        radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, transparent 80%),
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
      cursor: grab;
      user-select: none;
      outline: none;
    }

    .canvas-viewport:active {
      cursor: grabbing;
    }

    .canvas-surface {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      transition: transform 0.05s ease-out;
      width: 3000px;
      height: 2000px;
    }

    .canvas-controls {
      position: absolute;
      bottom: 24px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
      padding: 6px 12px;
      border-radius: 12px;
      z-index: 50;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .btn-control {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-control:hover {
      background: #334155;
      color: #fff;
    }

    .btn-fit {
      width: auto;
      padding: 0 10px;
      font-size: 12px;
    }

    .zoom-indicator {
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      color: #94a3b8;
      min-width: 44px;
      text-align: center;
    }

    .edges-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 1;
    }

    .edge-path {
      fill: none;
      stroke: url(#edgeGrad);
      stroke-width: 2.5px;
      stroke-linecap: round;
      transition: all 0.3s ease;
    }

    .edge-canon {
      stroke: url(#canonGrad);
      stroke-width: 3.5px;
      filter: url(#glow);
    }

    .edge-pruned {
      stroke: #475569;
      stroke-dasharray: 4 4;
      opacity: 0.4;
    }

    .edge-label {
      font-size: 10px;
      fill: #a855f7;
      font-family: 'JetBrains Mono', monospace;
      text-anchor: middle;
    }

    .nodes-layer {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
    }

    .node-card {
      position: absolute;
      width: 260px;
      min-height: 120px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.8);
      border-radius: 14px;
      padding: 14px;
      cursor: pointer;
      box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.6);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .node-card:hover {
      transform: translateY(-2px);
      border-color: #a855f7;
      box-shadow: 0 12px 28px -4px rgba(168, 85, 247, 0.25);
    }

    .node-card.selected {
      border-color: #c084fc;
      box-shadow: 0 0 0 2px rgba(192, 132, 252, 0.5), 0 12px 28px -4px rgba(168, 85, 247, 0.4);
    }

    .node-card.canon {
      border-color: #eab308;
      background: linear-gradient(180deg, rgba(234, 179, 8, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%);
      box-shadow: 0 0 0 1px rgba(234, 179, 8, 0.6), 0 12px 30px -4px rgba(234, 179, 8, 0.25);
    }

    .node-card.pruned {
      opacity: 0.45;
      border-color: #ef4444;
      background: rgba(15, 23, 42, 0.6);
    }

    .node-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .author-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: #1e293b;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    .author-badge[data-author="AGENT"] {
      background: rgba(168, 85, 247, 0.15);
      color: #e9d5ff;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .author-badge[data-author="SYSTEM"] {
      background: rgba(234, 179, 8, 0.15);
      color: #fde047;
      border: 1px solid rgba(234, 179, 8, 0.3);
    }

    .author-badge[data-author="HUMAN"] {
      background: rgba(99, 102, 241, 0.15);
      color: #c7d2fe;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .score-badge {
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .score-badge.high-score {
      color: #facc15;
      background: rgba(250, 204, 21, 0.12);
      border: 1px solid rgba(250, 204, 21, 0.3);
    }

    .node-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 6px;
      line-height: 1.35;
    }

    .node-preview {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .node-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(51, 65, 85, 0.4);
      padding-top: 6px;
      font-size: 10px;
    }

    .depth-tag {
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
    }

    .canon-tag {
      color: #eab308;
      font-weight: 700;
    }
  `]
})
export class TreeCanvasComponent {
  readonly store = inject(TreeStore);

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  readonly panX = signal<number>(100);
  readonly panY = signal<number>(100);
  private isPanning = false;
  private startX = 0;
  private startY = 0;

  // Auto layout computation
  readonly computedNodes = computed<LayoutNode[]>(() => {
    const tree = this.store.currentTree();
    const nodes = Object.values(tree.nodes);
    if (!nodes.length) return [];

    const depthMap = new Map<number, TreeNode[]>();
    nodes.forEach(node => {
      const list = depthMap.get(node.depth) || [];
      list.push(node);
      depthMap.set(node.depth, list);
    });

    const CARD_WIDTH = 260;
    const CARD_HEIGHT = 140;
    const HORIZONTAL_GAP = 140;
    const VERTICAL_GAP = 40;

    const layoutNodes: LayoutNode[] = [];

    depthMap.forEach((depthNodes, depth) => {
      const x = 80 + depth * (CARD_WIDTH + HORIZONTAL_GAP);
      depthNodes.forEach((node, index) => {
        const y = 80 + index * (CARD_HEIGHT + VERTICAL_GAP);
        layoutNodes.push({
          ...node,
          x,
          y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT
        });
      });
    });

    return layoutNodes;
  });

  readonly nodeMap = computed(() => {
    const map = new Map<string, LayoutNode>();
    this.computedNodes().forEach(n => map.set(n.id, n));
    return map;
  });

  readonly computedEdges = computed<LayoutEdge[]>(() => {
    const tree = this.store.currentTree();
    const map = this.nodeMap();
    const edges: LayoutEdge[] = [];

    tree.edges.forEach(e => {
      const source = map.get(e.sourceNodeId);
      const target = map.get(e.targetNodeId);
      if (!source || !target) return;

      const x1 = source.x + source.width;
      const y1 = source.y + source.height / 2;
      const x2 = target.x;
      const y2 = target.y + target.height / 2;

      const dx = (x2 - x1) / 2;
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      edges.push({
        id: e.id,
        source,
        target,
        path,
        label: e.label,
        edgeType: e.edgeType
      });
    });

    return edges;
  });

  readonly canvasBounds = computed(() => {
    const nodes = this.computedNodes();
    let maxX = 1200;
    let maxY = 800;
    nodes.forEach(n => {
      if (n.x + 400 > maxX) maxX = n.x + 400;
      if (n.y + 300 > maxY) maxY = n.y + 300;
    });
    return { width: maxX, height: maxY };
  });

  onPanStart(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.node-card, .canvas-controls')) return;
    this.isPanning = true;
    this.startX = event.clientX - this.panX();
    this.startY = event.clientY - this.panY();
  }

  onPanMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.panX.set(event.clientX - this.startX);
    this.panY.set(event.clientY - this.startY);
  }

  onPanEnd(): void {
    this.isPanning = false;
  }

  onTouchStart(event: TouchEvent): void {
    if ((event.target as HTMLElement).closest('.node-card, .canvas-controls')) return;
    if (event.touches.length === 1) {
      this.isPanning = true;
      this.startX = event.touches[0].clientX - this.panX();
      this.startY = event.touches[0].clientY - this.panY();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isPanning || event.touches.length !== 1) return;
    this.panX.set(event.touches[0].clientX - this.startX);
    this.panY.set(event.touches[0].clientY - this.startY);
  }

  onTouchEnd(): void {
    this.isPanning = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    this.store.setZoom(this.store.zoomLevel() + delta);
  }

  zoomIn(): void {
    this.store.setZoom(this.store.zoomLevel() + 0.15);
  }

  zoomOut(): void {
    this.store.setZoom(this.store.zoomLevel() - 0.15);
  }

  resetView(): void {
    this.store.setZoom(1.0);
    this.panX.set(100);
    this.panY.set(100);
  }

  onNodeClick(event: MouseEvent | TouchEvent, nodeId: string): void {
    event.stopPropagation();
    this.store.selectNode(nodeId);
    this.store.isInspectorOpen.set(true);
  }

  onKeyDown(event: KeyboardEvent): void {
    const active = this.store.selectedNode();
    if (!active) return;

    if (event.key === 'ArrowRight') {
      const children = this.store.activeChildren();
      if (children.length > 0) {
        this.store.selectNode(children[0].id);
      }
    } else if (event.key === 'ArrowLeft' && active.parentNodeId) {
      this.store.selectNode(active.parentNodeId);
    }
  }

  getPreviewText(markdown: string): string {
    return markdown
      .replace(/#+\s/g, '')
      .replace(/[*_`]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  }
}
