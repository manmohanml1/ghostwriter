import { AfterViewInit, Component, inject, computed, signal, ElementRef, OnDestroy, ViewChild } from '@angular/core';
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
  labelX: number;
  labelY: number;
}

@Component({
  selector: 'app-tree-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-canvas.component.html',
  styleUrl: './tree-canvas.component.css'
})
export class TreeCanvasComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(TreeStore);

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  readonly panX = signal<number>(100);
  readonly panY = signal<number>(100);
  readonly viewportSize = signal({ width: 1600, height: 900 });
  private isPanning = false;
  private resizeObserver?: ResizeObserver;
  private startX = 0;
  private startY = 0;

  // Auto layout computation
  readonly computedNodes = computed<LayoutNode[]>(() => {
    const tree = this.store.currentTree();
    const showPruned = this.store.showPrunedNodes();
    const nodes = Object.values(tree.nodes).filter(n => showPruned || n.status !== 'PRUNED');
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

    (tree.edges || []).forEach(e => {
      const source = map.get(e.sourceNodeId);
      const target = map.get(e.targetNodeId);
      if (!source || !target) return;

      const x1 = source.x + source.width;
      const y1 = source.y + source.height / 2;
      const x2 = target.x;
      const y2 = target.y + target.height / 2;

      const dx = (x2 - x1) / 2;
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      const labelX = (x1 + x2) / 2;
      const labelY = (y1 + y2) / 2 - 12;

      edges.push({
        id: e.id,
        source,
        target,
        path,
        label: e.label,
        edgeType: e.edgeType,
        labelX,
        labelY
      });
    });

    return edges;
  });

  /** Keep large stories responsive by mounting only cards near the viewport. */
  readonly renderedNodes = computed<LayoutNode[]>(() => {
    const nodes = this.computedNodes();
    if (nodes.length <= 200) return nodes;

    const zoom = this.store.zoomLevel();
    const { width, height } = this.viewportSize();
    const overscan = 500;
    return nodes.filter(node => {
      const left = this.panX() + node.x * zoom;
      const top = this.panY() + node.y * zoom;
      const right = left + node.width * zoom;
      const bottom = top + node.height * zoom;
      return right >= -overscan && bottom >= -overscan && left <= width + overscan && top <= height + overscan;
    });
  });

  readonly renderedEdges = computed<LayoutEdge[]>(() => {
    if (this.computedNodes().length <= 200) return this.computedEdges();
    const visibleIds = new Set(this.renderedNodes().map(node => node.id));
    return this.computedEdges().filter(edge => visibleIds.has(edge.source.id) || visibleIds.has(edge.target.id));
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

  ngAfterViewInit(): void {
    const element = this.canvasContainer.nativeElement;
    const updateSize = () => this.viewportSize.set({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    this.resizeObserver = new ResizeObserver(updateSize);
    this.resizeObserver.observe(element);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

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

  onNodeKeyDown(event: KeyboardEvent, nodeId: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
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
    } else if (event.key === 'ArrowLeft') {
      const parents = this.store.getParentNodes(active.id);
      if (parents.length > 0) this.store.selectNode(parents[0].id);
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
