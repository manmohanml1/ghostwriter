import { TestBed } from '@angular/core/testing';
import { TreeStore } from './tree.store';
import { ARCHITECTURE_DECISION_TREE, NARRATIVE_STORY_TREE } from '../fixtures/starter-trees';

describe('TreeStore', () => {
  let store: TreeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TreeStore]
    });
    store = TestBed.inject(TreeStore);
    store.loadTree(ARCHITECTURE_DECISION_TREE);
  });

  it('should initialize with the root node selected', () => {
    expect(store.currentTree().id).toBe('tree-arch-001');
    expect(store.selectedNodeId()).toBe('node-root');
    expect(store.selectedNode()?.title).toContain('Root Decision');
  });

  it('should add a branch node correctly and update parent-child relationship', () => {
    const parentId = 'node-root';
    const initialNodeCount = store.allNodes().length;

    const newBranch = store.addBranch(
      parentId,
      'Option D: Hybrid Gateway',
      'Test content description',
      'HUMAN'
    );

    expect(store.allNodes().length).toBe(initialNodeCount + 1);
    expect(newBranch.parentNodeId).toBe(parentId);
    expect(store.selectedNodeId()).toBe(newBranch.id);
  });

  it('should update node properties reactively', () => {
    const activeNode = store.selectedNode();
    expect(activeNode).toBeTruthy();

    if (activeNode) {
      store.updateNode(activeNode.id, { title: 'Updated Title' });
      expect(store.selectedNode()?.title).toBe('Updated Title');
    }
  });

  it('should mark branch as pruned', () => {
    const branchId = 'node-branch-micro';
    store.pruneNode(branchId);

    const prunedNode = store.currentTree().nodes[branchId];
    expect(prunedNode.status).toBe('PRUNED');
  });

  it('should set ghostwriter winner and update sibling nodes', () => {
    const winnerId = 'node-branch-serverless';
    store.setGhostwriterWinner(winnerId);

    const winnerNode = store.currentTree().nodes[winnerId];
    expect(winnerNode.status).toBe('GHOSTWRITER_WINNER');

    const previousWinner = store.currentTree().nodes['node-branch-mono'];
    expect(previousWinner.status).toBe('ACTIVE');
  });

  it('should switch between preset trees seamlessly', () => {
    store.loadNarrativeDemo();
    expect(store.currentTree().id).toBe('tree-story-001');
    expect(store.selectedNodeId()).toBe('story-root');

    store.loadArchitectureDemo();
    expect(store.currentTree().id).toBe('tree-arch-001');
  });
});
