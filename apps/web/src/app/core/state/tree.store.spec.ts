import { TestBed } from '@angular/core/testing';
import { TreeStore } from './tree.store';
import { AIGeneratorService } from '../services/ai-generator.service';
import { SupabaseService } from '../services/supabase.service';

describe('TreeStore Regression & Scenario Test Suite', () => {
  let store: TreeStore;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        TreeStore,
        AIGeneratorService,
        SupabaseService
      ]
    });

    store = TestBed.inject(TreeStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('Scenario 1: Default Starter Tree loads with valid root node', () => {
    const tree = store.currentTree();
    expect(tree).toBeTruthy();
    expect(tree.rootNodeId).toBeTruthy();
    expect(tree.nodes[tree.rootNodeId]).toBeTruthy();
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(0);
  });

  it('Scenario 2: Create new story from scratch initializes clean canvas', () => {
    store.createNewStory('Echoes of the Void', 'Hard Sci-Fi', 'The ship engine failed at 0300 hours.');
    
    const tree = store.currentTree();
    expect(tree.title).toBe('Echoes of the Void');
    expect(tree.genre).toBe('Hard Sci-Fi');
    expect(Object.keys(tree.nodes).length).toBe(1);
    
    const rootNode = tree.nodes[tree.rootNodeId];
    expect(rootNode.title).toBe('Chapter 1: The Beginning');
    expect(rootNode.content).toContain('The ship engine failed');
    expect(rootNode.depth).toBe(0);
    expect(rootNode.status).toBe('CANON_PATH');
  });

  it('Scenario 3: Branching creates valid child node and directed edge without cycles', () => {
    store.createNewStory('Test Odyssey');
    const rootId = store.currentTree().rootNodeId;

    const childNodeId = store.createBranch(rootId, 'Branch A: Enter the portal');
    expect(childNodeId).toBeTruthy();

    const tree = store.currentTree();
    expect(Object.keys(tree.nodes).length).toBe(2);
    expect(tree.nodes[childNodeId].parentNodeId).toBe(rootId);
    expect(tree.nodes[childNodeId].depth).toBe(1);

    const edge = tree.edges.find(e => e.sourceNodeId === rootId && e.targetNodeId === childNodeId);
    expect(edge).toBeTruthy();
    expect(edge?.edgeType).toBe('BRANCH');
  });

  it('Scenario 4: Breadcrumb trail accurately computes ancestor path to root', () => {
    store.createNewStory('Chronicle');
    const rootId = store.currentTree().rootNodeId;

    const nodeB = store.createBranch(rootId, 'Path B');
    const nodeC = store.createBranch(nodeB, 'Path C');

    store.selectNode(nodeC);
    const trail = store.breadcrumbTrail();

    expect(trail.length).toBe(3);
    expect(trail[0].id).toBe(rootId);
    expect(trail[1].id).toBe(nodeB);
    expect(trail[2].id).toBe(nodeC);
  });

  it('Scenario 5: Total words and read time compute correctly', () => {
    store.createNewStory('Word Count Test', 'Cyberpunk', 'One two three four five six seven eight nine ten.');
    const totalWords = store.totalWords();
    expect(totalWords).toBe(10);
  });

  it('Scenario 6: Reset to demo story restores starter Cyberpunk narrative', () => {
    store.createNewStory('Temporary Story');
    expect(store.currentTree().title).toBe('Temporary Story');

    store.resetToDemoStory();
    expect(store.currentTree().title).toContain('The Neon Protocol');
    expect(Object.keys(store.currentTree().nodes).length).toBeGreaterThan(1);
  });
});
