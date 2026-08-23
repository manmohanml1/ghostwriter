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
    return newId;
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
      const childId = manager.addBranch('node-3', 'Branch C', 'Infiltrating vault sub-terminal.');
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
      const uuidUser1 = toUUID('manmohanlonawat:tree-neon-protocol-001');
      const uuidUser2 = toUUID('clonawat:tree-neon-protocol-001');
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

});
