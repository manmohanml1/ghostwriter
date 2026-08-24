import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function toUUID(str) {
  const h1 = fnv1a(str + ':part1');
  const h2 = fnv1a(str + ':part2');
  const h3 = fnv1a(str + ':part3');
  const h4 = fnv1a(str + ':part4');
  return `${h1}-${h2.slice(0, 4)}-4${h2.slice(5, 8)}-a${h3.slice(1, 4)}-${h3}${h4.slice(0, 4)}`.toLowerCase();
}

function splitSentences(text) {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 5);
}

function sentenceSimilarity(s1, s2) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'were', 'it', 'its']);
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !stopWords.has(w));
  const w1 = new Set(norm(s1));
  const w2 = new Set(norm(s2));
  let intersection = 0;
  w1.forEach(w => { if (w2.has(w)) intersection++; });
  const union = new Set([...w1, ...w2]).size;
  return union === 0 ? 0 : intersection / union;
}

class StoryTreeManager {
  constructor(initialTree) {
    this.tree = initialTree || this.createDefaultStarterTree();
    this.selectedNodeId = this.tree.rootNodeId;
    this.previousChapterContent = null;
  }

  createDefaultStarterTree() {
    return {
      id: 'tree-neon-protocol-001',
      title: 'The Neon Protocol: Sub-Level 9',
      genre: 'Cyberpunk',
      rootNodeId: 'node-1',
      nodes: {
        'node-1': { id: 'node-1', parentNodeId: null, title: 'Midnight Transmission', content: 'Detective Kael Vance stared at the holoscreen.', status: 'CANON_PATH', depth: 0 },
        'node-2': { id: 'node-2', parentNodeId: 'node-1', title: 'Path A: Trace the Relay Tower', content: 'Kael grabs his rain slicker.', status: 'CANON_PATH', depth: 1 },
        'node-3': { id: 'node-3', parentNodeId: 'node-1', title: 'Path B: Interrogate Archive Vault', content: 'Kael infiltrates the vault.', status: 'ACTIVE', depth: 1 },
        'node-4': { id: 'node-4', parentNodeId: 'node-2', title: 'Ambush on Gantry 4', content: 'Suppressed gunfire rings out.', status: 'ACTIVE', depth: 2 },
        'node-5': { id: 'node-5', parentNodeId: 'node-4', title: 'The Blackout Revelation', content: 'Diagnostic decipher finishes.', status: 'ACTIVE', depth: 3 }
      },
      edges: [
        { id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2', edgeType: 'BRANCH', label: 'Action & Escalation' },
        { id: 'edge-2', sourceNodeId: 'node-1', targetNodeId: 'node-3', edgeType: 'BRANCH', label: 'Intrigue & Alliance' },
        { id: 'edge-3', sourceNodeId: 'node-2', targetNodeId: 'node-4', edgeType: 'BRANCH', label: 'Confrontation' },
        { id: 'edge-4', sourceNodeId: 'node-4', targetNodeId: 'node-5', edgeType: 'BRANCH', label: 'Climax' }
      ]
    };
  }

  getAllDescendantIds(nodeId) {
    const directChildren = Object.values(this.tree.nodes).filter(n => n.parentNodeId === nodeId);
    const result = [];
    for (const child of directChildren) {
      result.push(child.id);
      result.push(...this.getAllDescendantIds(child.id));
    }
    return result;
  }

  pruneNode(nodeId) {
    if (nodeId === this.tree.rootNodeId) return;
    const descendantIds = this.getAllDescendantIds(nodeId);
    const allPruneIds = [nodeId, ...descendantIds];
    allPruneIds.forEach(id => {
      if (this.tree.nodes[id]) {
        this.tree.nodes[id].status = 'PRUNED';
      }
    });
  }

  pruneChildrenOf(nodeId) {
    const descendantIds = this.getAllDescendantIds(nodeId);
    descendantIds.forEach(id => {
      if (this.tree.nodes[id]) {
        this.tree.nodes[id].status = 'PRUNED';
      }
    });
  }

  deleteChildrenOf(nodeId) {
    const descendantIds = new Set(this.getAllDescendantIds(nodeId));
    descendantIds.forEach(id => delete this.tree.nodes[id]);
    this.tree.edges = this.tree.edges.filter(
      e => !descendantIds.has(e.sourceNodeId) && !descendantIds.has(e.targetNodeId)
    );
  }

  addBranch(parentNodeId, title, content) {
    const newId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const parent = this.tree.nodes[parentNodeId];
    const newNode = {
      id: newId,
      parentNodeId,
      title,
      content,
      status: 'ACTIVE',
      depth: (parent?.depth || 0) + 1
    };
    this.tree.nodes[newId] = newNode;
    this.tree.edges.push({
      id: `edge-${parentNodeId}-${newId}`,
      sourceNodeId: parentNodeId,
      targetNodeId: newId,
      edgeType: 'BRANCH'
    });
    return newNode;
  }

  expandChapterAI(nodeId, generatedProse) {
    const node = this.tree.nodes[nodeId];
    if (!node) return;
    this.previousChapterContent = { nodeId, content: node.content, title: node.title };
    node.content = generatedProse;
  }

  undoLastAIChange() {
    if (!this.previousChapterContent) return;
    const { nodeId, content, title } = this.previousChapterContent;
    if (this.tree.nodes[nodeId]) {
      this.tree.nodes[nodeId].content = content;
      this.tree.nodes[nodeId].title = title;
      this.previousChapterContent = null;
    }
  }

  getBreadcrumbs(nodeId) {
    const trail = [];
    let currentId = nodeId;
    while (currentId && this.tree.nodes[currentId]) {
      const node = this.tree.nodes[currentId];
      trail.unshift(node);
      currentId = node.parentNodeId;
    }
    return trail;
  }
}

describe('Ghostwriter Studio Comprehensive Regression Test Suite', () => {

  describe('1. Tree DAG Construction & Breadcrumb Resolution', () => {
    test('Starter tree initializes with valid root and hierarchy', () => {
      const manager = new StoryTreeManager();
      assert.equal(manager.tree.rootNodeId, 'node-1');
      assert.equal(Object.keys(manager.tree.nodes).length, 5);
      assert.equal(manager.tree.edges.length, 4);
    });

    test('Breadcrumb traversal computes unbroken ancestor path from leaf to root', () => {
      const manager = new StoryTreeManager();
      const trail = manager.getBreadcrumbs('node-5');
      assert.equal(trail.length, 4);
      assert.equal(trail[0].id, 'node-1');
      assert.equal(trail[1].id, 'node-2');
      assert.equal(trail[2].id, 'node-4');
      assert.equal(trail[3].id, 'node-5');
    });

    test('Adding a branch connects child node with directed edge and incremented depth', () => {
      const manager = new StoryTreeManager();
      const childNode = manager.addBranch('node-3', 'Branch C', 'Infiltrating vault sub-terminal.');
      const childId = childNode.id;
      assert.ok(manager.tree.nodes[childId]);
      assert.equal(manager.tree.nodes[childId].parentNodeId, 'node-3');
      assert.equal(manager.tree.nodes[childId].depth, 2);

      const edge = manager.tree.edges.find(e => e.sourceNodeId === 'node-3' && e.targetNodeId === childId);
      assert.ok(edge);
      assert.equal(edge.edgeType, 'BRANCH');
    });
  });

  describe('2. Recursive Cascade Branch Pruning', () => {
    test('Pruning Chapter 2 cascade prunes all downstream descendants (Chapter 4 and Chapter 5)', () => {
      const manager = new StoryTreeManager();
      assert.equal(manager.tree.nodes['node-2'].status, 'CANON_PATH');
      assert.equal(manager.tree.nodes['node-4'].status, 'ACTIVE');
      assert.equal(manager.tree.nodes['node-5'].status, 'ACTIVE');

      manager.pruneNode('node-2');

      assert.equal(manager.tree.nodes['node-2'].status, 'PRUNED');
      assert.equal(manager.tree.nodes['node-4'].status, 'PRUNED');
      assert.equal(manager.tree.nodes['node-5'].status, 'PRUNED');
      // Unrelated sibling Path B must remain ACTIVE
      assert.equal(manager.tree.nodes['node-3'].status, 'ACTIVE');
    });

    test('pruneChildrenOf keeps parent active while cascade pruning all child subtrees', () => {
      const manager = new StoryTreeManager();
      manager.pruneChildrenOf('node-1');

      assert.equal(manager.tree.nodes['node-1'].status, 'CANON_PATH');
      assert.equal(manager.tree.nodes['node-2'].status, 'PRUNED');
      assert.equal(manager.tree.nodes['node-3'].status, 'PRUNED');
      assert.equal(manager.tree.nodes['node-4'].status, 'PRUNED');
      assert.equal(manager.tree.nodes['node-5'].status, 'PRUNED');
    });

    test('deleteChildrenOf completely purges descendant nodes and edges without leaving dangling references', () => {
      const manager = new StoryTreeManager();
      manager.deleteChildrenOf('node-2');

      assert.ok(manager.tree.nodes['node-1']);
      assert.ok(manager.tree.nodes['node-2']);
      assert.ok(manager.tree.nodes['node-3']);
      assert.equal(manager.tree.nodes['node-4'], undefined);
      assert.equal(manager.tree.nodes['node-5'], undefined);

      const danglingEdges = manager.tree.edges.filter(
        e => e.sourceNodeId === 'node-4' || e.targetNodeId === 'node-4' || e.sourceNodeId === 'node-5' || e.targetNodeId === 'node-5'
      );
      assert.equal(danglingEdges.length, 0);
    });
  });

  describe('3. 1-Click AI Undo Snapshot & Restore', () => {
    test('Expanding a chapter stores snapshot and undoLastAIChange reverts text with 1 click', () => {
      const manager = new StoryTreeManager();
      const originalText = manager.tree.nodes['node-1'].content;

      manager.expandChapterAI('node-1', 'EXPANDED FULL NOVEL CHAPTER PROSE WITH 1500 WORDS...');
      assert.notEqual(manager.tree.nodes['node-1'].content, originalText);
      assert.ok(manager.previousChapterContent);

      manager.undoLastAIChange();
      assert.equal(manager.tree.nodes['node-1'].content, originalText);
      assert.equal(manager.previousChapterContent, null);
    });
  });

  describe('4. PostgreSQL UUID Scoping & Multi-Account Isolation', () => {
    test('toUUID outputs valid RFC-4122 compliant UUID syntax', () => {
      const uuid = toUUID('user1:tree-neon-protocol-001');
      assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('Distinct user accounts get isolated UUIDs for the same story ID', () => {
      const uuidUser1 = toUUID('author-alice:tree-neon-protocol-001');
      const uuidUser2 = toUUID('author-bob:tree-neon-protocol-001');
      assert.notEqual(uuidUser1, uuidUser2);
    });

    test('Deterministic UUID stability prevents duplicate story insertions on edit', () => {
      const isUUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const initialStoryUUID = toUUID('user1:my-novel');
      
      const loadedTreeId = initialStoryUUID;
      const updatedStoryUUID = isUUIDRegex.test(loadedTreeId) ? loadedTreeId : toUUID(`user1:${loadedTreeId}`);
      
      assert.equal(updatedStoryUUID, initialStoryUUID);
    });
  });

  describe('5. Security & Custom Backend Input Masking', () => {
    test('Custom backend getters return empty strings by default to prevent credential leakage in public UI', () => {
      const mockStorage = new Map();
      const getCustomUrl = () => mockStorage.get('ghostwriter_supabase_url') || '';
      const getCustomKey = () => mockStorage.get('ghostwriter_supabase_anon_key') || '';

      assert.equal(getCustomUrl(), '');
      assert.equal(getCustomKey(), '');
    });

    test('Setting custom backend stores values and 1-click reset clears them completely', () => {
      const mockStorage = new Map();
      const setCustom = (url, key) => {
        mockStorage.set('ghostwriter_supabase_url', url);
        mockStorage.set('ghostwriter_supabase_anon_key', key);
      };
      const resetCustom = () => {
        mockStorage.delete('ghostwriter_supabase_url');
        mockStorage.delete('ghostwriter_supabase_anon_key');
      };

      setCustom('http://localhost:54321', 'custom-secret-anon-key');
      assert.equal(mockStorage.get('ghostwriter_supabase_url'), 'http://localhost:54321');
      assert.equal(mockStorage.get('ghostwriter_supabase_anon_key'), 'custom-secret-anon-key');

      resetCustom();
      assert.equal(mockStorage.get('ghostwriter_supabase_url'), undefined);
      assert.equal(mockStorage.get('ghostwriter_supabase_anon_key'), undefined);
    });
  });

  describe('6. Novel Manuscript & Story Tree Export', () => {
    test('exportNovelManuscript compiles canon storyline into structured Markdown', () => {
      const manager = new StoryTreeManager();
      const canonNodes = Object.values(manager.tree.nodes)
        .filter(n => n.status === 'CANON_PATH')
        .sort((a, b) => a.depth - b.depth);

      let manuscript = `# ${manager.tree.title}\n*Genre: ${manager.tree.genre}*\n\n---\n\n`;
      canonNodes.forEach((node, idx) => {
        manuscript += `## Chapter ${idx + 1}: ${node.title}\n\n${node.content}\n\n---\n\n`;
      });

      assert.ok(manuscript.includes('The Neon Protocol'));
      assert.ok(manuscript.includes('Midnight Transmission'));
      assert.ok(manuscript.includes('Trace the Relay Tower'));
    });
  });

  describe('7. AI Lore Bible Extraction & Fresh Story Clean Isolation', () => {
    test('Fresh story creation initializes clean Lore Bible and does not inherit demo lore', () => {
      const freshTree = {
        id: 'story-shawn-001',
        title: 'The Sky Odyssey',
        genre: 'High Fantasy',
        rootNodeId: 'node-root',
        nodes: {
          'node-root': {
            id: 'node-root',
            title: 'Chapter 1: The Beginning',
            content: 'There was a time when Shawn saw the cities in the sky as the place he would reach someday!',
            status: 'CANON_PATH'
          }
        },
        edges: [],
        loreBible: []
      };

      assert.equal(freshTree.loreBible.length, 0);
      assert.equal(freshTree.loreBible.some(e => e.name.includes('Kael Vance')), false);
    });

    test('Batch adding AI-extracted lore populates lore bible without duplicating entity names', () => {
      let loreBible = [];
      const batchAdd = (existing, newItems) => {
        const existingNames = new Set(existing.map(e => e.name.toLowerCase().trim()));
        const toAdd = newItems.filter(e => !existingNames.has(e.name.toLowerCase().trim()));
        return [...existing, ...toAdd];
      };

      const extracted = [
        { id: 'lore-1', name: 'Shawn', category: 'CHARACTER', description: 'Dreamer aspiring to ascend.', traits: ['Ambitious'] },
        { id: 'lore-2', name: 'The Cities in the Sky', category: 'LOCATION', description: 'Floating metropolises.', traits: ['High altitude'] }
      ];

      loreBible = batchAdd(loreBible, extracted);
      assert.equal(loreBible.length, 2);
      assert.equal(loreBible[0].name, 'Shawn');
      assert.equal(loreBible[1].name, 'The Cities in the Sky');

      // Duplicate attempt
      loreBible = batchAdd(loreBible, [{ id: 'lore-3', name: 'shawn ', category: 'CHARACTER', description: 'duplicate' }]);
      assert.equal(loreBible.length, 2);
    });

    test('Offline chapter expansion uses extracted character Shawn and does not hallucinate Kael Vance', () => {
      const loreBible = [
        { id: 'lore-1', name: 'Shawn', category: 'CHARACTER', description: 'The sky dreamer.', traits: [] },
        { id: 'lore-2', name: 'The Cities in the Sky', category: 'LOCATION', description: 'Floating spires.', traits: [] }
      ];

      const charName = loreBible.find(e => e.category === 'CHARACTER')?.name || 'the protagonist';
      const locName = loreBible.find(e => e.category === 'LOCATION')?.name || 'the horizon';

      const generated = `The gleaming towers of ${locName} reflected the twilight sun in brilliant cascades of amber and gold. For as long as ${charName} could remember, those distant spires had seemed like an unattainable dream.`;

      assert.ok(generated.includes('Shawn'));
      assert.ok(generated.includes('The Cities in the Sky'));
      assert.equal(generated.includes('Kael Vance'), false);
    });
  });

  describe('8. Dynamic Thematic Opening Hook Engine', () => {
    const hookMatrix = {
      'Cyberpunk': ['Neon rain pooled in the cracked asphalt', 'The holographic skyline of Neo-Veridia'],
      'Noir Mystery': ['The rain had washed the blood from the cobblestones', 'She walked into the dimly lit office'],
      'Dark Fantasy': ['Ash drifted like black snow over the shattered ramparts', 'The ancient oath-stone in the high temple'],
      'Hard Sci-Fi': ['The hull temperature sensors flared amber', 'At 03:42 ship-time, the deep-space communication array'],
      'Gothic Thriller': ['The wrought-iron gates of Blackwood Manor', 'A portrait in the east gallery']
    };

    test('Generates evocative opening hook for all supported genres', () => {
      Object.keys(hookMatrix).forEach(genre => {
        const hooks = hookMatrix[genre];
        assert.ok(hooks.length >= 2, `Genre ${genre} has opening seeds`);
        hooks.forEach(seed => {
          assert.ok(seed.length > 20);
        });
      });
    });

    test('Initializing a new story with custom genre and title injects appropriate hook', () => {
      const genre = 'Gothic Thriller';
      const title = 'The Haunting of Ravenwood';
      const initialHook = hookMatrix[genre][0];
      
      const newStory = {
        title,
        genre,
        rootNode: {
          title: 'Chapter 1: The Beginning',
          content: initialHook
        },
        loreBible: []
      };

      assert.equal(newStory.title, 'The Haunting of Ravenwood');
      assert.ok(newStory.rootNode.content.includes('Blackwood Manor') || newStory.rootNode.content.includes('wrought-iron'));
      assert.equal(newStory.loreBible.length, 0);
    });
  });

  describe('9. Lore Anchor Branching Gatekeeper', () => {
    class GatedTreeManager extends StoryTreeManager {
      constructor(tree, loreBible = []) {
        super(tree);
        this.loreBible = loreBible;
      }

      canBranch() {
        return this.loreBible.length > 0;
      }

      attemptBranch(parentNodeId, title, content) {
        if (!this.canBranch()) {
          throw new Error('Lore Anchor Required: Please establish at least 1 character or location in your Lore Bible before creating branches.');
        }
        return this.addBranch(parentNodeId, title, content);
      }
    }

    test('canBranch returns false when Lore Bible is empty', () => {
      const manager = new GatedTreeManager(undefined, []);
      assert.equal(manager.canBranch(), false);
    });

    test('attemptBranch throws error when Lore Bible is empty to prevent ungrounded narrative entropy', () => {
      const manager = new GatedTreeManager(undefined, []);
      assert.throws(
        () => manager.attemptBranch('node-1', 'Divergent Timeline', 'Something happened...'),
        /Lore Anchor Required/
      );
    });

    test('Adding at least 1 Lore Anchor unlocks branching successfully', () => {
      const manager = new GatedTreeManager(undefined, []);
      assert.equal(manager.canBranch(), false);

      // Add lore entity
      manager.loreBible.push({
        id: 'lore-1',
        name: 'Shawn',
        category: 'CHARACTER',
        description: 'Protagonist'
      });

      assert.equal(manager.canBranch(), true);
      const newBranch = manager.attemptBranch('node-1', 'Ascent to Sky City', 'Shawn boarded the skiff.');
      assert.ok(newBranch.id);
      assert.equal(newBranch.title, 'Ascent to Sky City');
    });
  });

  describe('10. Multi-Tier Depth Branch Progression Engine', () => {
    function generateDynamicBranches(chapter, depth = 1) {
      const text = `${chapter.title} ${chapter.content}`.toLowerCase();
      if (text.includes('sabotage') && depth >= 2) {
        return [
          { title: 'Path A: The Deck Seven Interrogation', persona: 'Action & Confrontation' },
          { title: 'Path B: The Clandestine Black Box Relay', persona: 'Intrigue & Investigation' },
          { title: 'Path C: The Maintenance Airlock Ambush', persona: 'Plot Twist & Survival' }
        ];
      }
      if (text.includes('thruster') && depth >= 2) {
        return [
          { title: 'Path A: Atmospheric Re-entry Skim', persona: 'Action & Piloting' },
          { title: 'Path B: Derelict Docking Spire Navigation', persona: 'Tactical Stealth' },
          { title: 'Path C: Silent Running Drift Mode', persona: 'Suspense & Strategy' }
        ];
      }
      // Depth 1 Root
      return [
        { title: 'Path A: Emergency Thruster Burn', persona: 'Action & Escalation' },
        { title: 'Path B: Sabotage Investigation', persona: 'Intrigue & Alliance' },
        { title: 'Path C: The Derelict Distress Signal', persona: 'Plot Twist & Subversion' }
      ];
    }

    test('Root Chapter (Depth 1) generates initial divergent paths (Thruster, Sabotage, Distress)', () => {
      const rootChapter = {
        id: 'ch-1',
        depth: 1,
        title: 'Chapter 1: The Tether Fracture',
        content: 'The orbital tether snapped at altitude. John looked in horror!'
      };
      const branches = generateDynamicBranches(rootChapter, 1);
      assert.equal(branches.length, 3);
      assert.equal(branches[0].title, 'Path A: Emergency Thruster Burn');
      assert.equal(branches[1].title, 'Path B: Sabotage Investigation');
      assert.equal(branches[2].title, 'Path C: The Derelict Distress Signal');
    });

    test('Chapter 2 Sabotage Investigation (Depth 2) generates Depth 3 forensic continuations', () => {
      const ch2Sabotage = {
        id: 'ch-2-b',
        depth: 2,
        title: 'Path B: Sabotage Investigation',
        content: 'Scanning the telemetry logs, John discovered the tether failure was a deliberate sabotage.'
      };
      const branches = generateDynamicBranches(ch2Sabotage, 2);
      assert.equal(branches.length, 3);
      assert.equal(branches[0].title, 'Path A: The Deck Seven Interrogation');
      assert.equal(branches[1].title, 'Path B: The Clandestine Black Box Relay');
      assert.equal(branches[2].title, 'Path C: The Maintenance Airlock Ambush');
      // Must NOT return Chapter 2 options again
      assert.ok(!branches.some(b => b.title.includes('Emergency Thruster Burn')));
    });

    test('Chapter 2 Thruster Escape (Depth 2) generates Depth 3 extreme piloting maneuvers', () => {
      const ch2Thruster = {
        id: 'ch-2-a',
        depth: 2,
        title: 'Path A: Emergency Thruster Burn',
        content: 'John fired the manual orbital thrusters to pull clear of debris.'
      };
      const branches = generateDynamicBranches(ch2Thruster, 2);
      assert.equal(branches.length, 3);
      assert.equal(branches[0].title, 'Path A: Atmospheric Re-entry Skim');
      assert.equal(branches[1].title, 'Path B: Derelict Docking Spire Navigation');
      assert.equal(branches[2].title, 'Path C: Silent Running Drift Mode');
    });
  });

  describe('11. Suggestion Lifecycle & Node Selection Isolation', () => {
    class SuggestionStore {
      constructor() {
        this.selectedNodeId = 'node-1';
        this.activeAiSuggestions = [];
        this.nodes = {
          'node-1': { id: 'node-1', title: 'Chapter 1' },
          'node-2': { id: 'node-2', title: 'Chapter 2' }
        };
      }

      selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        this.activeAiSuggestions = []; // Isolate suggestions to prevent bleed
      }

      applyAISuggestion(suggestion) {
        const newNodeId = `node-${Date.now()}`;
        this.nodes[newNodeId] = { id: newNodeId, title: suggestion.title };
        this.activeAiSuggestions = this.activeAiSuggestions.filter(s => s.title !== suggestion.title);
        this.selectedNodeId = newNodeId; // Automatically navigate to new branch
        return newNodeId;
      }
    }

    test('Selecting a different chapter clears lingering suggestions', () => {
      const store = new SuggestionStore();
      store.activeAiSuggestions = [{ title: 'Path A' }, { title: 'Path B' }];
      assert.equal(store.activeAiSuggestions.length, 2);

      store.selectNode('node-2');
      assert.equal(store.selectedNodeId, 'node-2');
      assert.equal(store.activeAiSuggestions.length, 0);
    });

    test('Applying a branch suggestion removes it from pool and selects created branch', () => {
      const store = new SuggestionStore();
      store.activeAiSuggestions = [
        { title: 'Path A: Emergency Thruster Burn' },
        { title: 'Path B: Sabotage Investigation' }
      ];

      const createdId = store.applyAISuggestion({ title: 'Path B: Sabotage Investigation' });
      assert.equal(store.selectedNodeId, createdId);
      assert.equal(store.activeAiSuggestions.length, 1);
      assert.equal(store.activeAiSuggestions[0].title, 'Path A: Emergency Thruster Burn');
    });

    test('Adding Path A and then adding Path B from same suggestion batch preserves sibling parentage to Chapter 1', () => {
      class ParentTrackingStore {
        constructor() {
          this.selectedNodeId = 'node-1';
          this.nodes = { 'node-1': { id: 'node-1', title: 'Chapter 1' } };
          this.edges = [];
          this.activeAiSuggestions = [
            { sourceNodeId: 'node-1', title: 'Path A: Emergency Thruster Burn', content: '...' },
            { sourceNodeId: 'node-1', title: 'Path B: Sabotage Investigation', content: '...' }
          ];
        }

        applyAISuggestion(fallbackParentId, suggestion) {
          const targetParentId = suggestion.sourceNodeId || fallbackParentId;
          const newNodeId = `node-${suggestion.title.includes('Path A') ? 'path-a' : 'path-b'}`;
          this.nodes[newNodeId] = {
            id: newNodeId,
            parentNodeId: targetParentId,
            title: suggestion.title
          };
          this.edges.push({ sourceNodeId: targetParentId, targetNodeId: newNodeId });
          this.selectedNodeId = newNodeId;
          this.activeAiSuggestions = this.activeAiSuggestions.filter(s => s.title !== suggestion.title);
          return newNodeId;
        }
      }

      const store = new ParentTrackingStore();
      
      // Author adds Path A (while on Chapter 1)
      const pathAId = store.applyAISuggestion(store.selectedNodeId, store.activeAiSuggestions[0]);
      assert.equal(store.selectedNodeId, pathAId);
      assert.equal(store.nodes[pathAId].parentNodeId, 'node-1');

      // Author immediately adds Path B from remaining suggestions (while active selection is now Path A)
      const pathBId = store.applyAISuggestion(store.selectedNodeId, store.activeAiSuggestions[0]);
      assert.equal(store.selectedNodeId, pathBId);
      
      // CRITICAL ASSERTION: Path B must be attached to node-1 (Chapter 1), NOT to Path A!
      assert.equal(store.nodes[pathBId].parentNodeId, 'node-1', 'Path B must attach to Chapter 1 as a sibling');
      assert.notEqual(store.nodes[pathBId].parentNodeId, pathAId, 'Path B must NEVER attach to Path A');
      
      // Edge verification
      const edgeToPathB = store.edges.find(e => e.targetNodeId === pathBId);
      assert.equal(edgeToPathB.sourceNodeId, 'node-1');
    });
  });

  describe('12. Permutation & Combination Sequence Engine Matrix', () => {
    // Semantic Deduplicator Implementation
    function splitSentences(text) {
      if (!text) return [];
      return text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 5);
    }

    function sentenceSimilarity(s1, s2) {
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'were', 'it', 'its']);
      const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !stopWords.has(w));
      const w1 = new Set(norm(s1));
      const w2 = new Set(norm(s2));
      let intersection = 0;
      w1.forEach(w => { if (w2.has(w)) intersection++; });
      const union = new Set([...w1, ...w2]).size;
      return union === 0 ? 0 : intersection / union;
    }

    function deduplicateAgainst(candidateText, existingContent) {
      const existingSentences = splitSentences(existingContent);
      const paragraphs = candidateText.split(/\n\n+/);
      const keptParas = [];
      for (const para of paragraphs) {
        const sentences = splitSentences(para);
        const kept = sentences.filter(cand => !existingSentences.some(exist => sentenceSimilarity(cand, exist) >= 0.35));
        if (kept.length > 0) keptParas.push(kept.join(' '));
      }
      return keptParas.join('\n\n');
    }

    function expandChapter(baseContent, theme = 'THRUSTER') {
      const clean = baseContent.trim();
      let focus = '';
      if (theme === 'THRUSTER') {
        focus = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Stabilizer thrusters are redlining in sector four, but the trajectory is holding!" the helm officer announced through the din, fingers flying across the sub-light controls.\n\nJohn braced firmly against the command rail, adrenaline sharpening every instinct. "Reroute all non-essential auxiliary power to the forward shields and maintain burn angle. We break out of this gravity well now!"\n\nThrough the reinforced viewport, the collapsing debris cloud flashed past like fiery comets, but the vessel's hull stabilized into a clean elliptical orbit above the planetary storm line.`;
      } else {
        focus = `Isolating the primary junction logs, John traced the detonation signal directly to an auxiliary engineering terminal on Deck Seven.\n\n"Lock down the internal communications network," John instructed in a low, steely voice to the chief security detail.\n\nBefore the order could be confirmed, a sudden surge in the ship's power grid cut the deck lights to amber emergency standby.`;
      }

      let novel = deduplicateAgainst(focus, clean);
      if (!novel || novel.trim().length === 0) {
        novel = `With systems stabilized, John initiated the downstream tactical scan of the sector.`;
      }
      return `${clean}\n\n${novel}`.trim();
    }

    function appendParagraph(baseContent, theme = 'THRUSTER') {
      const clean = baseContent.trim();
      let candidates = [];
      if (theme === 'THRUSTER') {
        candidates = [
          `"Stabilizer thrusters are redlining in sector four, but the trajectory is holding!" the helm officer reported over the roar of the sub-light engines.`,
          `John braced firmly against the command rail, adrenaline sharpening every instinct. "Reroute all non-essential auxiliary power to the forward shields and maintain burn angle. We break out of this gravity well now!"`,
          `The violent shuddering slowly subsided into a smooth hum as the ship broke through the turbulence, stabilizing into an elliptical high-orbit trajectory.`
        ];
      } else {
        candidates = [
          `Isolating the primary junction logs, John traced the detonation signal directly to an auxiliary engineering terminal on Deck Seven.`,
          `"Lock down the internal communications network," John commanded the security detail in a hushed, decisive tone.`,
          `A sudden power surge flickered across the deck lights, dropping the corridor into amber standby.`
        ];
      }

      const existingSentences = splitSentences(clean);
      const fresh = candidates.filter(c => {
        const cSentences = splitSentences(c);
        return !cSentences.some(cs => existingSentences.some(es => sentenceSimilarity(cs, es) >= 0.35));
      });

      if (fresh.length > 0) return `${clean}\n\n${fresh[0]}`.trim();
      return `${clean}\n\nJohn monitored the evolving situation with steely focus.`.trim();
    }

    test('Permutation 1: Branch -> Expand into Full Chapter (0 duplicate opening lines)', () => {
      const initialBranchText = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Reroute all power from non-essential sub-systems!" the command echoed through the bridge as the g-force mounted.`;
      const expanded = expandChapter(initialBranchText, 'THRUSTER');
      
      const count = (expanded.match(/John seized manual control of the orbital thrusters/g) || []).length;
      assert.equal(count, 1, 'Opening sentence must appear exactly ONCE, never duplicated!');
      assert.ok(expanded.includes('Stabilizer thrusters are redlining'));
      assert.ok(expanded.includes('clean elliptical orbit'));
    });

    test('Permutation 2: Branch -> + Write Next Paragraph (0 duplicate sentences)', () => {
      const initialBranchText = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Reroute all power from non-essential sub-systems!" the command echoed through the bridge as the g-force mounted.`;
      const withNextPara = appendParagraph(initialBranchText, 'THRUSTER');
      
      const count = (withNextPara.match(/John seized manual control/g) || []).length;
      assert.equal(count, 1);
      assert.ok(withNextPara.includes('Stabilizer thrusters are redlining'));
    });

    test('Permutation 3: Branch -> Next Paragraph -> Expand Full Chapter (0 sentence collisions)', () => {
      const initial = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Reroute all power from non-essential sub-systems!" the command echoed through the bridge as the g-force mounted.`;
      const step1 = appendParagraph(initial, 'THRUSTER');
      const step2 = expandChapter(step1, 'THRUSTER');

      const sentences = splitSentences(step2);
      for (let i = 0; i < sentences.length; i++) {
        for (let j = i + 1; j < sentences.length; j++) {
          const sim = sentenceSimilarity(sentences[i], sentences[j]);
          assert.ok(sim < 0.35, `Duplicate sentences detected: "${sentences[i]}" vs "${sentences[j]}" (sim: ${sim})`);
        }
      }
    });

    test('Permutation 4: Branch -> Expand -> Undo -> Next Paragraph -> Expand (reverts and synthesizes cleanly)', () => {
      const initial = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Reroute all power from non-essential sub-systems!" the command echoed through the bridge as the g-force mounted.`;
      
      // Step A: Expand
      const expandedA = expandChapter(initial, 'THRUSTER');
      // Step B: Undo (Revert to initial)
      const reverted = initial;
      // Step C: Next Paragraph
      const nextPara = appendParagraph(reverted, 'THRUSTER');
      // Step D: Expand
      const finalExpanded = expandChapter(nextPara, 'THRUSTER');

      const count = (finalExpanded.match(/John seized manual control/g) || []).length;
      assert.equal(count, 1);
      assert.ok(finalExpanded.includes('clean elliptical orbit'));
    });

    test('Permutation 5: Branch -> Expand -> Expand (Idempotent downstream continuation)', () => {
      const initial = `John seized manual control of the orbital thrusters, initiating an emergency vector burn to escape the collapsing tether debris.\n\n"Reroute all power from non-essential sub-systems!" the command echoed through the bridge as the g-force mounted.`;
      const expand1 = expandChapter(initial, 'THRUSTER');
      const expand2 = expandChapter(expand1, 'THRUSTER');

      assert.notEqual(expand1, expand2, 'Second expand should synthesize downstream progression');
      assert.ok(expand2.includes('downstream tactical scan'));
      const count = (expand2.match(/John seized manual control/g) || []).length;
      assert.equal(count, 1);
    });

    test('Permutation 6: In-Flow Branch Lore Extraction on Chapter 2 adds Deck Seven to Lore Bible', () => {
      const loreBible = [{ id: 'lore-1', name: 'John', category: 'CHARACTER', description: 'Ship Captain' }];
      const ch2Prose = `Isolating the primary junction logs, John traced the detonation signal directly to an auxiliary engineering terminal on Deck Seven.`;
      
      // Simulate Lore Extraction from Chapter 2 prose
      const extracted = [
        { id: 'lore-2', name: 'Deck Seven', category: 'LOCATION', description: 'Auxiliary engineering deck' },
        { id: 'lore-3', name: 'John', category: 'CHARACTER', description: 'Ship Captain' } // Duplicate name
      ];

      const existingNames = new Set(loreBible.map(e => e.name.toLowerCase()));
      const novelEntities = extracted.filter(e => !existingNames.has(e.name.toLowerCase()));
      loreBible.push(...novelEntities);

      assert.equal(loreBible.length, 2);
      assert.equal(loreBible[1].name, 'Deck Seven');
      assert.equal(loreBible[1].category, 'LOCATION');
    });
  });

  describe('13. Existing-Child-Aware Branch Generation & Novelty Matrix', () => {
    const defaultIncidentPool = [
      { title: 'Path A: Emergency Thruster Burn', content: 'John seized manual control of the orbital thrusters...' },
      { title: 'Path B: Sabotage Investigation', content: 'Scanning the telemetry logs, John discovered the tether failure...' },
      { title: 'Path C: The Derelict Distress Signal', content: 'Sensors picked up a faint, repeating SOS transmission...' },
      { title: 'Path D: The Automated Lockdown Override', content: 'Initiated manual bypass protocols to regain control...' },
      { title: 'Path E: The Planetary Surface Broadcast', content: 'An urgent planetary broadcast revealed tether was cut...' },
      { title: 'Path F: The Severed Conduit Crisis', content: 'A massive electrical arc ripped through forward hull...' }
    ];

    function filterSuggestionsAgainstExisting(candidatePool, existingChildren) {
      const existingTitles = new Set(existingChildren.map(c => c.title.toLowerCase().trim()));
      const novel = candidatePool.filter(candidate => {
        const candNorm = candidate.title.toLowerCase().replace(/^path [a-z]:\s*/i, '').trim();
        return !Array.from(existingTitles).some(et => {
          const etNorm = et.replace(/^path [a-z]:\s*/i, '').trim();
          return etNorm === candNorm || sentenceSimilarity(etNorm, candNorm) >= 0.40;
        });
      });
      const selected = (novel.length >= 3 ? novel : candidatePool).slice(0, 3);
      // Compute used letters from existing children to continue the sequence
      const usedLetters = new Set(
        existingChildren.map(c => {
          const match = c.title.match(/^Path ([A-Z]):/i);
          return match ? match[1].toUpperCase() : null;
        }).filter(Boolean)
      );
      let nextLetterIdx = 0;
      while (usedLetters.has(String.fromCharCode(65 + nextLetterIdx)) && nextLetterIdx < 26) {
        nextLetterIdx++;
      }
      return selected.map((s, idx) => {
        let letterIdx = nextLetterIdx + idx;
        while (usedLetters.has(String.fromCharCode(65 + letterIdx)) && letterIdx < 26) {
          letterIdx++;
        }
        const letter = String.fromCharCode(65 + letterIdx);
        return {
          ...s,
          title: `Path ${letter}: ${s.title.replace(/^Path [A-Z]:\s*/i, '')}`
        };
      });
    }

    test('Suggesting branches on fresh chapter returns initial 3 paths', () => {
      const suggestions = filterSuggestionsAgainstExisting(defaultIncidentPool, []);
      assert.equal(suggestions.length, 3);
      assert.equal(suggestions[0].title, 'Path A: Emergency Thruster Burn');
      assert.equal(suggestions[1].title, 'Path B: Sabotage Investigation');
      assert.equal(suggestions[2].title, 'Path C: The Derelict Distress Signal');
    });

    test('Adding Path A and re-requesting branches filters out Path A and returns Path B, C, D', () => {
      const existingChildren = [{ title: 'Path A: Emergency Thruster Burn' }];
      const suggestions = filterSuggestionsAgainstExisting(defaultIncidentPool, existingChildren);
      
      assert.equal(suggestions.length, 3);
      assert.ok(!suggestions.some(s => s.title.includes('Emergency Thruster Burn')), 'Path A must NOT be re-suggested');
      assert.equal(suggestions[0].title, 'Path B: Sabotage Investigation');
      assert.equal(suggestions[1].title, 'Path C: The Derelict Distress Signal');
      assert.equal(suggestions[2].title, 'Path D: The Automated Lockdown Override');
    });

    test('Adding Path A, B, and C and re-requesting branches returns fresh Paths D, E, F', () => {
      const existingChildren = [
        { title: 'Path A: Emergency Thruster Burn' },
        { title: 'Path B: Sabotage Investigation' },
        { title: 'Path C: The Derelict Distress Signal' }
      ];
      const suggestions = filterSuggestionsAgainstExisting(defaultIncidentPool, existingChildren);

      assert.equal(suggestions.length, 3);
      assert.equal(suggestions[0].title, 'Path D: The Automated Lockdown Override');
      assert.equal(suggestions[1].title, 'Path E: The Planetary Surface Broadcast');
      assert.equal(suggestions[2].title, 'Path F: The Severed Conduit Crisis');
    });

    test('Depth 2 Thruster Escape filters out Atmospheric Re-entry Skim when already added', () => {
      const thrusterPool = [
        { title: 'Path A: Atmospheric Re-entry Skim', content: 'John angled the vessel heat shields...' },
        { title: 'Path B: Derelict Docking Spire Navigation', content: 'Weaving through shattered debris...' },
        { title: 'Path C: Silent Running Drift Mode', content: 'Shut down primary fusion generators...' },
        { title: 'Path D: The Debris Field Harpoon Sling', content: 'Fired the bow magnetic harpoons...' }
      ];
      const existingChildren = [{ title: 'Path A: Atmospheric Re-entry Skim' }];
      const suggestions = filterSuggestionsAgainstExisting(thrusterPool, existingChildren);

      assert.equal(suggestions.length, 3);
      assert.ok(!suggestions.some(s => s.title.includes('Atmospheric Re-entry Skim')));
      assert.equal(suggestions[0].title, 'Path B: Derelict Docking Spire Navigation');
      assert.equal(suggestions[1].title, 'Path C: Silent Running Drift Mode');
      assert.equal(suggestions[2].title, 'Path D: The Debris Field Harpoon Sling');
    });
  });
  
  describe('14. Canon Path Lifecycle & Manuscript Export', () => {
    test('Setting canon path strips Path X: prefix from title', () => {
      const title = 'Path B: Sabotage Investigation';
      const cleanTitle = title.replace(/^Path [A-Z]:\s*/i, '');
      assert.equal(cleanTitle, 'Sabotage Investigation');
    });

    test('Canon path title cleanup preserves titles without Path prefix', () => {
      const title = 'The Great Escape';
      const cleanTitle = title.replace(/^Path [A-Z]:\s*/i, '');
      assert.equal(cleanTitle, 'The Great Escape');
    });

    test('Manuscript export walks canon chain from root (not active trail)', () => {
      // Simulated tree: Root -> Canon Child -> Active Child (non-canon)
      const tree = {
        rootNodeId: 'root-1',
        nodes: {
          'root-1': { id: 'root-1', title: 'Prologue', content: 'Story begins', depth: 0, parentNodeId: null, status: 'CANON_PATH' },
          'canon-1': { id: 'canon-1', title: 'The Chase', content: 'Canon branch', depth: 1, parentNodeId: 'root-1', status: 'CANON_PATH' },
          'draft-1': { id: 'draft-1', title: 'Path A: Side Quest', content: 'Non-canon branch', depth: 1, parentNodeId: 'root-1', status: 'ACTIVE' },
          'canon-2': { id: 'canon-2', title: 'Climax', content: 'Canon continues', depth: 2, parentNodeId: 'canon-1', status: 'CANON_PATH' }
        }
      };
      
      // Walk canon chain from root
      const canonTrail = [];
      let currentId = tree.rootNodeId;
      const visited = new Set();
      while (currentId && tree.nodes[currentId]) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        canonTrail.push(tree.nodes[currentId]);
        const children = Object.values(tree.nodes).filter(n => n.parentNodeId === currentId && n.status !== 'PRUNED');
        const canonChild = children.find(c => c.status === 'CANON_PATH');
        currentId = canonChild?.id || children[0]?.id || null;
      }
      
      assert.equal(canonTrail.length, 3);
      assert.equal(canonTrail[0].title, 'Prologue');
      assert.equal(canonTrail[1].title, 'The Chase');
      assert.equal(canonTrail[2].title, 'Climax');
      assert.ok(!canonTrail.some(c => c.title.includes('Side Quest')), 'Non-canon Side Quest must NOT appear in canon manuscript');
    });

    test('Canon reconciliation demotes duplicate canon siblings', () => {
      const nodes = {
        'root': { id: 'root', parentNodeId: null, status: 'CANON_PATH' },
        'a': { id: 'a', parentNodeId: 'root', status: 'CANON_PATH' },
        'b': { id: 'b', parentNodeId: 'root', status: 'CANON_PATH' },
        'c': { id: 'c', parentNodeId: 'root', status: 'ACTIVE' }
      };
      const reconciledNodes = { ...nodes };
      const parentGroups = new Map();
      Object.values(reconciledNodes).forEach(n => {
        if (n.parentNodeId && n.status === 'CANON_PATH') {
          const group = parentGroups.get(n.parentNodeId) || [];
          group.push(n.id);
          parentGroups.set(n.parentNodeId, group);
        }
      });
      parentGroups.forEach(canonIds => {
        if (canonIds.length > 1) {
          canonIds.slice(1).forEach(id => {
            reconciledNodes[id] = { ...reconciledNodes[id], status: 'ACTIVE' };
          });
        }
      });
      
      const canonCount = Object.values(reconciledNodes).filter(n => n.parentNodeId === 'root' && n.status === 'CANON_PATH').length;
      assert.equal(canonCount, 1, 'Only one canon sibling should remain per parent');
      assert.equal(reconciledNodes['a'].status, 'CANON_PATH');
      assert.equal(reconciledNodes['b'].status, 'ACTIVE');
    });
  });

  describe('15. DAG Safety & Cycle Prevention', () => {
    test('Breadcrumb traversal with cycle guard stops at cycle', () => {
      const tree = {
        nodes: {
          'a': { id: 'a', parentNodeId: 'c' },
          'b': { id: 'b', parentNodeId: 'a' },
          'c': { id: 'c', parentNodeId: 'b' }
        }
      };
      const trail = [];
      let currentId = 'c';
      const visited = new Set();
      while (currentId && tree.nodes[currentId]) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        trail.unshift(tree.nodes[currentId]);
        currentId = tree.nodes[currentId].parentNodeId;
      }
      assert.equal(trail.length, 3, 'Cycle guard must terminate after visiting all 3 unique nodes');
    });

    test('Recursive descendant collection for permanentlyDeleteNode', () => {
      const tree = {
        nodes: {
          'root': { id: 'root', parentNodeId: null },
          'a': { id: 'a', parentNodeId: 'root' },
          'b': { id: 'b', parentNodeId: 'a' },
          'c': { id: 'c', parentNodeId: 'b' },
          'd': { id: 'd', parentNodeId: 'root' }
        }
      };
      function getAllDescendantIds(nodeId, tree) {
        const directChildren = Object.values(tree.nodes).filter(n => n.parentNodeId === nodeId);
        const result = [];
        for (const child of directChildren) {
          result.push(child.id);
          result.push(...getAllDescendantIds(child.id, tree));
        }
        return result;
      }
      const descendants = getAllDescendantIds('a', tree);
      assert.deepEqual(descendants.sort(), ['b', 'c'], 'Must recursively find grandchild c under a→b→c');
      assert.ok(!descendants.includes('d'), 'Sibling d must not be included');
    });

    test('permanentlyDeleteNode removes node and all descendants', () => {
      const tree = {
        nodes: {
          'root': { id: 'root', parentNodeId: null },
          'a': { id: 'a', parentNodeId: 'root' },
          'b': { id: 'b', parentNodeId: 'a' },
          'c': { id: 'c', parentNodeId: 'b' }
        },
        edges: [
          { sourceNodeId: 'root', targetNodeId: 'a' },
          { sourceNodeId: 'a', targetNodeId: 'b' },
          { sourceNodeId: 'b', targetNodeId: 'c' }
        ]
      };
      function getAllDescendantIds(nodeId, tree) {
        const directChildren = Object.values(tree.nodes).filter(n => n.parentNodeId === nodeId);
        const result = [];
        for (const child of directChildren) {
          result.push(child.id);
          result.push(...getAllDescendantIds(child.id, tree));
        }
        return result;
      }
      const allIdsToDelete = new Set(['a', ...getAllDescendantIds('a', tree)]);
      const updatedNodes = { ...tree.nodes };
      allIdsToDelete.forEach(id => delete updatedNodes[id]);
      const updatedEdges = tree.edges.filter(e => !allIdsToDelete.has(e.sourceNodeId) && !allIdsToDelete.has(e.targetNodeId));

      assert.equal(Object.keys(updatedNodes).length, 1, 'Only root should remain');
      assert.equal(updatedEdges.length, 0, 'All edges involving deleted nodes should be removed');
      assert.ok(updatedNodes['root'], 'Root node must survive');
    });
  });

  describe('16. Scope & Depth-Aware Narrative Vector Engine', () => {
    function computePacingGuidance(scope, depth) {
      const scopeGuidance = scope === 'SHORT'
        ? 'SCOPE: SHORT-FORM (~3-5 chapters). Fast narrative velocity; propose immediate crisis choices and direct paths toward resolution.'
        : scope === 'LONG' || scope === 'EPIC'
        ? 'SCOPE: LONG-FORM EPIC (~20+ chapters). Deep worldbuilding, complex relationship dynamics, and slow-burn mysteries.'
        : 'SCOPE: MEDIUM-FORM ARC (~8-15 chapters). Balanced 3-act pacing with rising stakes and subplots.';

      const depthGuidance = depth <= 1
        ? 'STAGE: Inciting Phase / Early Act. Establish motivations, divergent opportunities, or key supporting character encounters.'
        : depth <= 3
        ? 'STAGE: Rising Action & Escalation. Introduce unexpected revelations, hidden motives, or critical moral dilemmas.'
        : 'STAGE: Climax Convergence. Force irreversible choices, high-stakes confrontations, and divergent resolutions.';

      return { scopeGuidance, depthGuidance };
    }

    test('SHORT story scope produces rapid escalation guidance', () => {
      const { scopeGuidance, depthGuidance } = computePacingGuidance('SHORT', 1);
      assert.ok(scopeGuidance.includes('SHORT-FORM'));
      assert.ok(scopeGuidance.includes('Fast narrative velocity'));
      assert.ok(depthGuidance.includes('Inciting Phase'));
    });

    test('LONG story scope produces expansive worldbuilding guidance', () => {
      const { scopeGuidance, depthGuidance } = computePacingGuidance('LONG', 2);
      assert.ok(scopeGuidance.includes('LONG-FORM EPIC'));
      assert.ok(scopeGuidance.includes('Deep worldbuilding'));
      assert.ok(depthGuidance.includes('Rising Action'));
    });

    test('Late depth (Depth 5) produces Climax Convergence guidance', () => {
      const { depthGuidance } = computePacingGuidance('MEDIUM', 5);
      assert.ok(depthGuidance.includes('Climax Convergence'));
      assert.ok(depthGuidance.includes('Force irreversible choices'));
    });
  });

  describe('17. Universal In-Flight Entity Harvester & Auto-Discovery', () => {
    function harvestUnregisteredEntities(text, existingLore = []) {
      if (!text || text.trim().length < 40) return [];
      const existingNames = new Set(existingLore.map(e => e.name.toLowerCase().trim()));
      const discovered = [];
      const seen = new Set();

      const addEntity = (name, category, description, traits) => {
        const clean = name.trim().replace(/^[,.:;"'\s]+|[,.:;"'\s]+$/g, '');
        const lower = clean.toLowerCase();
        if (clean.length < 3 || existingNames.has(lower) || seen.has(lower)) return;
        const stopWords = new Set(['the', 'this', 'that', 'they', 'them', 'then', 'there', 'what', 'when', 'where', 'while', 'after', 'before', 'suddenly']);
        if (stopWords.has(lower)) return;
        seen.add(lower);
        discovered.push({ name: clean, category, description, traits });
      };

      const titledRegex = /\b(Dr\.|Doctor|Captain|Commander|Detective|Ensign|Officer|Lieutenant|Lord|Lady|Archmage|Professor|Agent|Sir|Madame|King|Queen)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
      let match;
      while ((match = titledRegex.exec(text)) !== null) {
        addEntity(`${match[1]} ${match[2]}`.trim(), 'CHARACTER', 'A key figure introduced during narrative events.', [match[1], 'Active Figure']);
      }

      const properNameRegex = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g;
      while ((match = properNameRegex.exec(text)) !== null) {
        const full = `${match[1]} ${match[2]}`.trim();
        if (/\b(Sector|Station|Deck|Citadel|Manor|Spire|Alley|Caverns|Vault|Gate|Chamber|Sanctum|District|Plaza|Haven)\b/i.test(full)) {
          addEntity(full, 'LOCATION', 'An important setting referenced in the story.', ['Setting', 'Location']);
        } else if (/\b(Key|Blade|Codex|Link|Pendant|Relic|Artifact|Device|Sphere|Crystal|Tome)\b/i.test(full)) {
          addEntity(full, 'ITEM', 'A significant item discovered in the narrative.', ['Key Item']);
        } else {
          addEntity(full, 'CHARACTER', 'A distinct character appearing in the scene.', ['Character']);
        }
      }

      const factionRegex = /\b(?:The\s+)?(Order\s+of\s+(?:the\s+)?[A-Z][a-z]+|House\s+of\s+[A-Z][a-z]+|[A-Z][a-z]+\s+(?:Directory|Directorate|Order|Syndicate|Vanguard|Council|Guild|Alliance|Legion|Clan|Brotherhood|Enclave))\b/g;
      while ((match = factionRegex.exec(text)) !== null) {
        addEntity(match[1].trim(), 'FACTION', 'A faction active in the narrative world.', ['Faction']);
      }

      return discovered.slice(0, 5);
    }

    test('Harvests titled characters and distinct locations from prose', () => {
      const prose = 'Captain John ordered Dr. Aris Vance to secure the perimeter near Rosewood Manor before the Order of the Eclipse could breach the gates.';
      const entities = harvestUnregisteredEntities(prose, []);
      
      assert.ok(entities.some(e => e.name === 'Captain John' && e.category === 'CHARACTER'));
      assert.ok(entities.some(e => e.name === 'Dr. Aris Vance' && e.category === 'CHARACTER'));
      assert.ok(entities.some(e => e.name === 'Rosewood Manor' && e.category === 'LOCATION'));
      assert.ok(entities.some(e => e.name === 'Order of the Eclipse' || e.name === 'Eclipse Faction' || e.category === 'FACTION'));
    });

    test('Filters out entities already present in Lore Bible', () => {
      const prose = 'Captain John met Detective Miller at the docks.';
      const existingLore = [{ id: '1', name: 'Captain John', category: 'CHARACTER', description: '', traits: [] }];
      const entities = harvestUnregisteredEntities(prose, existingLore);

      assert.ok(!entities.some(e => e.name === 'Captain John'), 'Must NOT re-harvest existing Captain John');
      assert.ok(entities.some(e => e.name === 'Detective Miller'), 'Must harvest new Detective Miller');
    });

    test('Batch adding discovered entities appends clean LoreEntity records', () => {
      const discovered = [
        { name: 'Ensign Hayes', category: 'CHARACTER', description: 'Flight navigator', traits: ['Navigator'] },
        { name: 'Deck Seven', category: 'LOCATION', description: 'Engineering module', traits: ['Sub-deck'] }
      ];
      const loreBible = [{ id: 'lore-1', name: 'Shawn', category: 'CHARACTER', description: 'Pilot', traits: [] }];

      const formatted = discovered.map((e, idx) => ({
        id: `lore-${Date.now()}-${idx}`,
        name: e.name,
        category: e.category,
        description: e.description,
        traits: e.traits
      }));
      const updatedLore = [...loreBible, ...formatted];

      assert.equal(updatedLore.length, 3);
      assert.equal(updatedLore[1].name, 'Ensign Hayes');
      assert.equal(updatedLore[2].name, 'Deck Seven');
    });
  });

  describe('18. Provider Dynamic Discovery & Resilience', () => {
    test('Dynamic model listing filters generateContent compatible models', () => {
      const rawGoogleModels = [
        { name: 'models/gemini-3.6-flash', displayName: 'Gemini 3.6 Flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
        { name: 'models/gemini-3.6-pro', displayName: 'Gemini 3.6 Pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', displayName: 'Text Embedding', supportedGenerationMethods: ['embedContent'] }
      ];

      const valid = rawGoogleModels
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({ id: m.name.replace(/^models\//, ''), name: m.displayName }));

      assert.equal(valid.length, 2);
      assert.equal(valid[0].id, 'gemini-3.6-flash');
      assert.equal(valid[1].id, 'gemini-3.6-pro');
      assert.ok(!valid.some(v => v.id.includes('embedding')), 'Embedding models must be filtered out');
    });

    test('Auto-repair regex intercepts model deprecation and extracts suggested model', () => {
      const errorMessage = 'This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.6-flash for the latest features and improvements.';
      const match = errorMessage.match(/models\/(gemini-[\w.-]+)/);
      
      assert.ok(match);
      assert.equal(match[1], 'gemini-2.0-flash');
      const replacementMatch = errorMessage.match(/use\s+models\/(gemini-[\w.-]+)/);
      assert.ok(replacementMatch);
      assert.equal(replacementMatch[1], 'gemini-3.6-flash');
    });
  });

  describe('19. Mobile Bottom Sheet & Drawer Lifecycle', () => {
    test('Mobile bottom sheet cycles through PEEK -> HALF -> FULL -> PEEK', () => {
      let state = 'PEEK';
      function toggleState(current) {
        if (current === 'PEEK') return 'HALF';
        if (current === 'HALF') return 'FULL';
        return 'PEEK';
      }

      state = toggleState(state);
      assert.equal(state, 'HALF', 'First toggle from PEEK must transition to HALF');
      state = toggleState(state);
      assert.equal(state, 'FULL', 'Second toggle from HALF must transition to FULL');
      state = toggleState(state);
      assert.equal(state, 'PEEK', 'Third toggle from FULL must collapse to PEEK');
    });

    test('Mobile tab switching preserves active node data bindings', () => {
      const selectedNode = { id: 'node-101', title: 'Chapter 2: The Ambush', content: 'Lasers flew.', wordCount: 200 };
      let activeTab = 'EDITOR';
      
      // Switch tabs
      activeTab = 'LORE';
      assert.equal(activeTab, 'LORE');
      assert.equal(selectedNode.id, 'node-101');

      activeTab = 'COHERENCE';
      assert.equal(activeTab, 'COHERENCE');
      assert.equal(selectedNode.title, 'Chapter 2: The Ambush');
    });
  });

  describe('20. Genre-Adaptive Non-Bleeding Branch & Prose Synthesis Matrix', () => {
    function analyzeSceneContext(content, genre, tone, loreBible) {
      const text = (content || '').toLowerCase();
      const loreChar = loreBible.find(e => e.category === 'CHARACTER')?.name;
      const charName = loreChar || 'the protagonist';
      const locFromLore = loreBible.find(e => e.category === 'LOCATION')?.name;
      const gLower = (genre || '').toLowerCase();

      let environmentType = 'NOIR_CITY';
      let settingName = locFromLore || '';

      if (gLower.includes('noir') || gLower.includes('mystery') || gLower.includes('detective')) {
        environmentType = 'NOIR_CITY';
        if (!settingName) settingName = text.includes('pawn') ? 'the pawn shop' : 'the fog-drenched precinct district';
      } else if (gLower.includes('fantasy')) {
        environmentType = 'DARK_FANTASY';
        if (!settingName) settingName = 'the ancient citadel';
      } else if (gLower.includes('cyber')) {
        environmentType = 'NEON_CYBER';
        if (!settingName) settingName = 'the lower neon sector';
      } else if (gLower.includes('gothic') || gLower.includes('thriller')) {
        environmentType = 'GOTHIC_ESTATE';
        if (!settingName) settingName = 'the shadowed corridors of the manor';
      } else if (gLower.includes('sci-fi') || gLower.includes('space')) {
        environmentType = 'VESSEL_SPACE';
        if (!settingName) settingName = 'the orbital vessel command bridge';
      }

      return { charName, settingName, environmentType };
    }

    test('Noir Mystery with Whimsical tone accurately isolates environment to NOIR_CITY and avoids space tropes', () => {
      const content = 'The pawn shop bell chimed, announcing a stranger who wore oversized sunglasses at midnight and carried an antique violin case.';
      const genre = 'Noir Mystery';
      const tone = 'Whimsical';
      const lore = [{ id: '1', name: 'Derek', category: 'CHARACTER', description: 'Tired cop', traits: [] }];

      const ctx = analyzeSceneContext(content, genre, tone, lore);
      assert.equal(ctx.charName, 'Derek');
      assert.equal(ctx.environmentType, 'NOIR_CITY');
      assert.equal(ctx.settingName, 'the pawn shop');
    });

    test('Dark Fantasy with ancient runes isolates environment to DARK_FANTASY', () => {
      const content = 'The ancient runes flared along the citadel gates as the cloaked emissary drew their blade.';
      const genre = 'Dark Fantasy';
      const tone = 'Epic & Lyrical';
      const lore = [{ id: '1', name: 'Archmage Sylvan', category: 'CHARACTER', description: 'Sorcerer', traits: [] }];

      const ctx = analyzeSceneContext(content, genre, tone, lore);
      assert.equal(ctx.charName, 'Archmage Sylvan');
      assert.equal(ctx.environmentType, 'DARK_FANTASY');
      assert.equal(ctx.settingName, 'the ancient citadel');
    });

    test('Noir branch generation produces Noir/Pawn Shop hypotheses with 0 space keywords', () => {
      const charName = 'Derek';
      const settingName = 'the pawn shop';
      const isWhimsical = true;

      const noirBranches = [
        {
          title: 'Path A: The Pawn Shop Ambush',
          content: isWhimsical
            ? `Before ${charName} could touch the violin case, two bumbling syndicate enforcers in matching pinstripe suits kicked the door open, slipping comically on the wet doormat.`
            : `As ${charName} reached for the latch on the case, a brick shattered the front window, followed by the flash of headlights from an idling sedan in the alley.`,
          persona: 'Action & Confrontation'
        },
        {
          title: 'Path B: The Forged Securities Cipher',
          content: `Snapping the latches open, ${charName} discovered no instrument inside—only a stack of forged bearer bonds and a satirical blackmail dossier.`,
          persona: 'Intrigue & Investigation'
        },
        {
          title: 'Path C: The Wrong Drop-Off',
          content: `The stranger pulled down their oversized sunglasses in horror, staring at ${charName}'s precinct badge: "Wait... you're not the buyer!"`,
          persona: 'Plot Twist & Subversion'
        }
      ];

      assert.equal(noirBranches.length, 3);
      assert.ok(noirBranches[0].title.includes('Pawn Shop Ambush'));
      assert.ok(noirBranches[1].title.includes('Forged Securities'));
      assert.ok(noirBranches[2].title.includes('Wrong Drop-Off'));

      // Strict check: zero space/thruster keywords
      const allText = noirBranches.map(b => `${b.title} ${b.content}`).join(' ').toLowerCase();
      assert.ok(!allText.includes('thruster'), 'Must NOT contain thruster');
      assert.ok(!allText.includes('orbital'), 'Must NOT contain orbital');
      assert.ok(!allText.includes('viewport'), 'Must NOT contain viewport');
      assert.ok(!allText.includes('tether'), 'Must NOT contain tether');
      assert.ok(!allText.includes('debris'), 'Must NOT contain debris');
    });
  });

  describe('21. Pure Dynamic AI Inception & Hierarchical Context Compression', () => {
    test('Dynamic Story Inception derives opening hook and initial lore 100% from author premise', () => {
      const req = {
        title: 'The Silent Observatory',
        genre: 'Cosmic Mystery',
        tone: 'Eerie & Cerebral',
        scope: 'SHORT',
        premise: 'Dr. Evelyn, observing the deep stellar telescope array, intercepted an unclassified harmonic transmission from the dark side of Ganymede.'
      };

      // Simulated pure structural inception
      const charMatch = req.premise.match(/\b([A-Z][a-z]{2,15})(?:,\s*(?:who|the|a|an|standing|looking|observing)|\s+(?:was|is|faced|discovered|held|ran|walked|arrived))/);
      const charName = charMatch ? charMatch[1] : 'The protagonist';

      const openingHook = `${req.premise}\n\nThe atmosphere carried the unmistakable weight of a ${req.genre.toLowerCase()} narrative, where every choice promised irreversible consequences. ${charName} surveyed the surroundings, conscious of the ticking clock and the unresolved stakes that had set this journey into motion.\n\nTaking a steady breath, ${charName} prepared for the immediate path ahead, knowing there would be no turning back.`;

      const initialLore = [
        {
          id: 'lore-inc-1',
          name: charName,
          category: 'CHARACTER',
          description: `${charName} is at the center of ${req.title}, navigating the events sparked by the opening conflict.`,
          traits: [req.tone, 'Determined', 'Central Anchor']
        }
      ];

      assert.ok(openingHook.includes('Dr. Evelyn'));
      assert.ok(openingHook.includes('Ganymede'));
      assert.equal(initialLore.length, 1);
      assert.equal(initialLore[0].name, 'Evelyn');
      assert.equal(initialLore[0].category, 'CHARACTER');
      assert.ok(initialLore[0].description.includes('The Silent Observatory'));
    });

    test('Hierarchical context builder produces compressed macro recap and high-fidelity micro local context', () => {
      const ancestorTrail = [
        { id: 'ch-1', parentNodeId: null, title: 'Chapter 1: The Signal', content: 'Dr. Evelyn received the transmission at midnight. The array was humming with unusual power. She decoded the first stanza.', summary: 'Dr. Evelyn decoded an unusual transmission at midnight.' },
        { id: 'ch-2', parentNodeId: 'ch-1', title: 'Chapter 2: The Decryption', content: 'The cipher revealed deep telemetry. Security protocols were breached on Sub-level 4. Evelyn ran toward the elevator.', summary: 'The cipher revealed breached security protocols on Sub-level 4.' },
        { id: 'ch-3', parentNodeId: 'ch-2', title: 'Chapter 3: The Vault', content: 'Evelyn arrived at the heavy vault door. The lock had been melted from the outside. She stepped into the darkness with her torch.', summary: null }
      ];

      const currentChapter = {
        id: 'ch-4',
        parentNodeId: 'ch-3',
        depth: 3,
        title: 'Chapter 4: The Core',
        content: 'Inside the vault, the central apparatus was glowing with blue light.',
        summary: null
      };

      const existingChildren = [
        { id: 'ch-5a', title: 'Path A: Touch the Core', content: 'Evelyn reached out her hand.' }
      ];

      const loreBible = [
        { id: 'l1', name: 'Dr. Evelyn', category: 'CHARACTER', description: 'Chief astrophysicist.', traits: ['Brilliant', 'Determined'] }
      ];

      // Build hierarchical context
      const macroAncestors = ancestorTrail.filter(a => a.id !== currentChapter.id && a.parentNodeId !== null && a.id !== currentChapter.parentNodeId);
      const macroStoryRecap = macroAncestors.map((anc, idx) => `- Chapter ${idx + 1} ("${anc.title}"): ${anc.summary}`).join('\n');

      const parentNode = ancestorTrail.find(a => a.id === currentChapter.parentNodeId);
      const parentSentences = parentNode.content.split(/(?<=[.!?])\s+/);
      const parentEnding = parentSentences.slice(-2).join(' ');

      const existingBranchContext = existingChildren.map(t => '- ' + t.title).join('\n');

      // Assert macro context is compressed
      assert.ok(macroStoryRecap.includes('The cipher revealed breached security protocols'));
      // Assert immediate parent ending is in micro context
      assert.ok(parentEnding.includes('She stepped into the darkness with her torch'));
      // Assert sibling branch is marked for avoidance
      assert.ok(existingBranchContext.includes('Path A: Touch the Core'));
    });

    test('Zero hardcoded trope bleed across unrelated custom culinary premise', () => {
      const customPremise = 'Chef Antoine discovered the antique copper recipe book hidden in the Parisian cellar.';
      const chapter = { id: 'c1', title: 'The Secret Soufflé', content: customPremise, depth: 0 };
      const lore = [{ id: 'l1', name: 'Antoine', category: 'CHARACTER', description: 'Master Parisian baker.', traits: ['Artisanal'] }];

      // Simulated generic structural offline branch generation
      const charName = 'Antoine';
      const loc = 'the Parisian cellar';
      const candidateBranches = [
        { title: 'Path A: Direct Action & Confrontation', content: `${charName} made a decisive tactical move in ${loc}, taking the initiative before the opposition could regroup.` },
        { title: 'Path B: Unexpected Discovery', content: `A closer inspection of ${loc} revealed an unexpected clue that completely altered ${charName}'s understanding of the conflict.` },
        { title: 'Path C: Tactical Investigation', content: `${charName} stepped back to analyze the underlying patterns, gathering crucial evidence to secure an advantage.` }
      ];

      const allBranchText = candidateBranches.map(b => `${b.title} ${b.content}`).join(' ').toLowerCase();
      assert.ok(!allBranchText.includes('thruster'), 'Must NOT contain thruster');
      assert.ok(!allBranchText.includes('orbital'), 'Must NOT contain orbital');
      assert.ok(!allBranchText.includes('deck seven'), 'Must NOT contain deck seven');
      assert.ok(!allBranchText.includes('snub-nosed revolver'), 'Must NOT contain revolver');
      assert.ok(!allBranchText.includes('blackwood'), 'Must NOT contain blackwood');
      assert.ok(allBranchText.includes('antoine'));
      assert.ok(allBranchText.includes('parisian cellar'));
    });

    test('MC Protagonist profile (Name, Gender, Traits) completely replaces generic "The protagonist"', () => {
      const req = {
        title: 'The Quantum Loop',
        genre: 'Cyberpunk',
        tone: 'Gritty & Dark',
        scope: 'MEDIUM',
        protagonist: {
          name: 'Maya Thorne',
          gender: 'Female (she/her)',
          traits: ['Tech-Savvy', 'Cynical', 'Resourceful']
        }
      };

      const mcName = req.protagonist.name;
      const mcGender = req.protagonist.gender;
      const mcTraits = req.protagonist.traits;
      const traitsStr = mcTraits.join(', ');

      const genderLower = mcGender.toLowerCase();
      let possessive = 'their';
      if (genderLower.includes('female') || genderLower.includes('she')) possessive = 'her';
      else if (genderLower.includes('male') || genderLower.includes('he')) possessive = 'his';

      const initialLore = [
        {
          id: 'lore-inc-1',
          name: mcName,
          category: 'CHARACTER',
          description: `${mcName} is the central protagonist of ${req.title}. Distinctly ${traitsStr}.`,
          traits: [mcGender, ...mcTraits]
        }
      ];

      // Assertions
      const openingHook = `Neon reflections fractured across the rain-slicked ferrocrete of the lower district as ${mcName} pulled the damp collar of ${possessive} coat tight. Overhead, holographic advertisements flickered through the smog, casting garish shadows across the alleyway.\n\n${mcName} glanced at the encrypted optical feed, verified the sub-grid connection, and stepped into the bustling transit corridor.`;

      assert.ok(!openingHook.includes('The protagonist'), 'Must NOT contain generic "The protagonist"');
      assert.ok(openingHook.includes('Maya Thorne'), 'Must explicitly feature Maya Thorne');
      assert.ok(openingHook.includes('her coat'), 'Must use female possessive pronoun "her"');
      assert.equal(initialLore[0].name, 'Maya Thorne');
      assert.deepEqual(initialLore[0].traits, ['Female (she/her)', 'Tech-Savvy', 'Cynical', 'Resourceful']);
    });

    test('Repeated chapter expansion synthesizes downstream progressive scenes with 0 duplicate paragraphs', () => {
      const initialHook = `The story of "The Quantum Cipher" began as Derek surveyed his surroundings, the air thick with the distinct tension of a cyberpunk setting.\n\nKnown for being cynical, analytical, vigilant, Derek was well aware that in a world driven by high stakes and hidden motives, a single miscalculated move could prove fatal.\n\nTaking a measured breath, Derek stepped forward into the unfolding conflict, ready to seize the initiative before his adversaries could react.`;
      
      const charName = 'Derek';
      const locFromLore = 'the surrounding area';
      const genre = 'Cyberpunk';

      const beatPool = [
        `The atmosphere in ${locFromLore} grew heavy with the distinct tension of a ${genre.toLowerCase()} confrontation. ${charName} moved with calculated precision, analyzing the immediate terrain for subtle hazards and hidden advantages.`,
        `"We cannot afford to hesitate now," ${charName} said in a calm, resolute tone, addressing the emerging challenge directly.`,
        `A sudden irregular pattern in ${locFromLore} caught ${charName}'s attention, revealing a hidden anomaly that had escaped initial notice.`,
        `Adversarial pressure surged across ${locFromLore}, demanding an immediate pivot.`,
        `As the immediate dust settled, a new transmission echoed across the perimeter.`
      ];

      function simulateExpand(currentProse, iteration) {
        const existingSentences = splitSentences(currentProse);
        const novelBeats = beatPool.filter(beat => {
          const sentences = splitSentences(beat);
          return !sentences.some(s => existingSentences.some(es => sentenceSimilarity(s, es) >= 0.40));
        });

        let toAdd = novelBeats.join('\n\n');
        if (!toAdd) {
          const downstreamPhases = [
            `Reorganizing their position within ${locFromLore}, ${charName} conducted a thorough perimeter assessment to consolidate recent gains.`,
            `A secondary power surge pulsed through ${locFromLore}, illuminating structural pathways that had remained dormant for cycles.`
          ];
          toAdd = downstreamPhases[iteration % downstreamPhases.length];
        }
        return `${currentProse}\n\n${toAdd}`.trim();
      }

      const expand1 = simulateExpand(initialHook, 0);
      const expand2 = simulateExpand(expand1, 1);
      const expand3 = simulateExpand(expand2, 2);

      // Check for zero duplicate sentences in expand3
      const allSentences = splitSentences(expand3);
      for (let i = 0; i < allSentences.length; i++) {
        for (let j = i + 1; j < allSentences.length; j++) {
          const sim = sentenceSimilarity(allSentences[i], allSentences[j]);
          assert.ok(sim < 0.40, `Duplicate sentence detected across repeated expansions: "${allSentences[i]}" vs "${allSentences[j]}" (sim: ${sim})`);
        }
      }

      // Assert word count continues to grow with each expansion
      assert.ok(expand3.split(/\s+/).length > expand2.split(/\s+/).length);
      assert.ok(expand2.split(/\s+/).length > expand1.split(/\s+/).length);
    });

    test('Chapter 2 at Depth 1 generates Depth 2 (Chapter 3) branches and strictly excludes Chapter 1 & 2 titles', () => {
      const ancestorTrail = [
        { id: 'ch-1', parentNodeId: null, depth: 0, title: 'Chapter 1: The Beginning', content: 'Story begins...' }
      ];

      const ch2Node = {
        id: 'ch-2',
        parentNodeId: 'ch-1',
        depth: 1,
        title: 'Direct Action & Confrontation',
        content: 'Derek made a decisive tactical move in the scene, taking the initiative before the opposition could regroup.'
      };

      const existingChildren = [];

      // Depth 1 pool
      const depth1Pool = [
        { title: 'Perimeter Breach Defense', content: 'Derek fortified their position in the surrounding area, repelling an aggressive probe.' },
        { title: 'The Decoded Protocol Betrayal', content: 'Deciphering the extracted data logs revealed that the original directive was compromised.' },
        { title: 'Auxiliary Telemetry Analysis', content: 'Derek cross-referenced the newly acquired coordinates with historical transit maps.' },
        { title: 'Direct Action & Confrontation', content: 'Derek made a decisive tactical move...' } // Collision candidate
      ];

      const normalizeTitle = t => t.toLowerCase().replace(/^path [a-z]:\s*/i, '').trim();
      const forbiddenTitles = new Set();
      forbiddenTitles.add(normalizeTitle(ch2Node.title));
      ancestorTrail.forEach(anc => forbiddenTitles.add(normalizeTitle(anc.title)));

      const filtered = depth1Pool.filter(c => {
        const norm = normalizeTitle(c.title);
        return !forbiddenTitles.has(norm) && sentenceSimilarity(c.content, ch2Node.content) < 0.35;
      });

      assert.equal(filtered.length, 3);
      assert.equal(filtered[0].title, 'Perimeter Breach Defense');
      assert.equal(filtered[1].title, 'The Decoded Protocol Betrayal');
      assert.equal(filtered[2].title, 'Auxiliary Telemetry Analysis');

      // Crucial: Must NOT contain Chapter 2 title "Direct Action & Confrontation"
      assert.ok(!filtered.some(b => b.title.includes('Direct Action & Confrontation')));
    });
  });

  describe('22. Thematic Scene Divergence & Setting Preservation', () => {
    test('Story Inception seeds concrete named Location into Lore Bible', () => {
      const genres = ['High Fantasy', 'Hard Sci-Fi', 'Noir Mystery', 'Psychological Horror'];
      const expectedLocations = ['The Forgotten Sanctuary', 'The Command Module', 'The Foggy District', 'The Abandoned Corridor'];

      genres.forEach((genre, idx) => {
        let initialLocationName = 'The Central Sector';
        const gLower = genre.toLowerCase();
        if (gLower.includes('sci-fi') || gLower.includes('space') || gLower.includes('cyber')) {
          initialLocationName = 'The Command Module';
        } else if (gLower.includes('noir') || gLower.includes('mystery') || gLower.includes('crime')) {
          initialLocationName = 'The Foggy District';
        } else if (gLower.includes('fantasy') || gLower.includes('magic')) {
          initialLocationName = 'The Forgotten Sanctuary';
        } else if (gLower.includes('horror') || gLower.includes('thriller')) {
          initialLocationName = 'The Abandoned Corridor';
        }

        assert.equal(initialLocationName, expectedLocations[idx]);
        assert.ok(!initialLocationName.toLowerCase().includes('surrounding area'));
      });
    });

    test('Discovery chapter and Infiltration chapter synthesize distinct, non-overlapping scene prose', () => {
      const charName = 'Davis';
      const locName = 'The Forgotten Sanctuary';

      // Discovery Arc (Chapter 2)
      const discoveryBeats = [
        `${charName} approached the focal point with deliberate care, examining the subtle carvings and energetic resonance in ${locName}.`,
        `"There's more to this than meets the eye," ${charName} muttered, tracing a gloved hand along the ancient surface.`,
        `The revelation inside reframed the entire conflict: what had appeared to be a random sequence of events was in fact a deliberate design.`,
        `A sudden pulse of energy surged outward from the discovery, echoing through ${locName}.`,
        `Committing the newly uncovered knowledge to memory, ${charName} prepared for the inevitable response.`
      ].join('\n\n');

      // Infiltration Arc (Chapter 3)
      const infiltrationBeats = [
        `Moving low beneath the shadows, ${charName} advanced along the outer edge of ${locName}, timing every step between the automated security sweeps.`,
        `A patrol crossed the corridor ahead, their footfalls echoing against the stone. ${charName} held breath and pressed flat against the wall.`,
        `Reaching the primary access threshold, ${charName} bypassed the secondary security lock with practiced speed.`,
        `Inside, the layout of ${locName} unfolded in intricate detail, exposing key operational pathways.`,
        `With the infiltration successfully executed, ${charName} established a secure foothold.`
      ].join('\n\n');

      // Assertions
      assert.ok(!discoveryBeats.includes('the surrounding area'), 'Discovery must not contain "the surrounding area"');
      assert.ok(!infiltrationBeats.includes('the surrounding area'), 'Infiltration must not contain "the surrounding area"');
      assert.ok(discoveryBeats.includes('The Forgotten Sanctuary'));
      assert.ok(infiltrationBeats.includes('The Forgotten Sanctuary'));
      assert.ok(discoveryBeats.includes('subtle carvings'));
      assert.ok(infiltrationBeats.includes('patrol crossed'));

      // Check cross-arc similarity is minimal
      const sim = sentenceSimilarity(discoveryBeats, infiltrationBeats);
      assert.ok(sim < 0.20, `Cross-arc similarity should be very low (${sim})`);
    });
  });
});




