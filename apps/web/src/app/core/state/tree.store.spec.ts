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
    store.createNewStory('Echoes of the Void', 'Hard Sci-Fi', 'Gritty & Dark', 'The ship engine failed at 0300 hours.');
    
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

    const childNode = store.addBranch(rootId, 'Branch A: Enter the portal', 'The portal shimmered with energy.', 'HUMAN');
    const childNodeId = childNode.id;
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

    const nodeBObj = store.addBranch(rootId, 'Path B', 'Branch B content', 'HUMAN');
    const nodeB = nodeBObj.id;
    const nodeCObj = store.addBranch(nodeB, 'Path C', 'Branch C content', 'HUMAN');
    const nodeC = nodeCObj.id;

    store.selectNode(nodeC);
    const trail = store.breadcrumbTrail();

    expect(trail.length).toBe(3);
    expect(trail[0].id).toBe(rootId);
    expect(trail[1].id).toBe(nodeB);
    expect(trail[2].id).toBe(nodeC);
  });

  it('Scenario 5: Total words and read time compute correctly', () => {
    store.createNewStory('Word Count Test', 'Cyberpunk', 'Gritty & Dark', 'One two three four five six seven eight nine ten.');
    const totalWords = store.totalStoryWordCount();
    expect(totalWords).toBe(10);
  });

  it('Scenario 6: Reset to demo story restores starter Cyberpunk narrative', () => {
    store.createNewStory('Temporary Story');
    expect(store.currentTree().title).toBe('Temporary Story');

    store.resetToDemoStory();
    expect(store.currentTree().title).toContain('The Neon Protocol');
    expect(Object.keys(store.currentTree().nodes).length).toBeGreaterThan(1);
    expect(store.loreBible().length).toBeGreaterThan(0);
    expect(store.loreBible().some(e => e.name.includes('Kael Vance'))).toBeTrue();
  });

  it('Scenario 7: Create new story from scratch initializes empty lore bible and does NOT leak demo lore', () => {
    store.createNewStory('Sky Cities Odyssey', 'High Fantasy', 'Epic & Lyrical', 'There was a time when Shawn saw the cities in the sky.');
    
    expect(store.loreBible().length).toBe(0);
    expect(store.currentTree().loreBible).toEqual([]);
    expect(store.loreBible().some(e => e.name.includes('Kael Vance'))).toBeFalse();
  });

  it('Scenario 8: Batch adding lore entities populates lore bible without duplicates', () => {
    store.createNewStory('Sky Odyssey');
    expect(store.loreBible().length).toBe(0);

    store.batchAddLoreEntities([
      {
        id: 'lore-shawn',
        name: 'Shawn',
        category: 'CHARACTER',
        description: 'An ambitious dreamer aiming for the sky cities.',
        traits: ['Determined', 'Pilot']
      },
      {
        id: 'lore-sky-cities',
        name: 'The Cities in the Sky',
        category: 'LOCATION',
        description: 'Floating metropolises of wonder.',
        traits: ['High altitude', 'Sanctuary']
      }
    ]);

    expect(store.loreBible().length).toBe(2);
    expect(store.loreBible()[0].name).toBe('Shawn');
    expect(store.loreBible()[1].name).toBe('The Cities in the Sky');

    // Prevent duplicate adds of same entity name
    store.batchAddLoreEntities([
      {
        id: 'lore-shawn-dup',
        name: 'Shawn',
        category: 'CHARACTER',
        description: 'Duplicate Shawn entry',
        traits: []
      }
    ]);
    expect(store.loreBible().length).toBe(2);
  });

  it('Scenario 9: AI Lore Extraction from prose correctly identifies Shawn and Sky Cities offline', async () => {
    store.createNewStory('Shawn Story', 'Sci-Fi', 'Gritty & Dark', 'There was a time when Shawn saw the cities in the sky as the place he would reach someday!');
    
    await store.extractLoreFromActiveChapter();

    expect(store.isLoreGenModalOpen()).toBeTrue();
    const suggestions = store.extractedLoreSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.some(s => s.name === 'Shawn' && s.category === 'CHARACTER')).toBeTrue();
    expect(suggestions.some(s => s.name.includes('Cities in the Sky') && s.category === 'LOCATION')).toBeTrue();
  });
});
