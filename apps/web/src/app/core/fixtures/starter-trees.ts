import { StoryTree } from '../models/graph.models';

export const STARTER_TREE_NEON_PROTOCOL: StoryTree = {
  id: 'tree-neon-protocol-001',
  title: 'The Neon Protocol: Sub-Level 9',
  description: 'A cyberpunk noir branching webnovel about Detective Kael Vance and a 40-year-old encrypted protocol.',
  genre: 'Cyberpunk Noir',
  rootNodeId: 'node-root-001',
  styleConfig: {
    genre: 'Cyberpunk',
    pacing: 'Balanced',
    tone: 'Gritty & Dark',
    dialogueDensity: 'Balanced'
  },
  loreBible: [
    {
      id: 'lore-001',
      name: 'Detective Kael Vance',
      category: 'CHARACTER',
      description: 'A seasoned corporate precinct detective who survived the Sub-Level 9 quarantine riots.',
      traits: ['Cynical', 'Neural HUD', 'Kinetic Sidearm']
    },
    {
      id: 'lore-002',
      name: 'Protocol 40-X',
      category: 'ITEM',
      description: 'An ancient pre-collapse encryption pulse capable of overriding the regional energy grid.',
      traits: ['Autonomous', '128-bit', 'Dead Man Switch']
    },
    {
      id: 'lore-003',
      name: 'Apex Tactical',
      category: 'FACTION',
      description: 'Private security enforcers deployed by the High Directorate to sanitize contaminated sectors.',
      traits: ['Ruthless', 'Thermal Scanners', 'Suppressed Carbines']
    }
  ],
  nodes: {
    'node-root-001': {
      id: 'node-root-001',
      treeId: 'tree-neon-protocol-001',
      parentNodeId: null,
      title: 'Chapter 1: The Midnight Transmission',
      content: `Rain streaked down the electro-chromic glass of the observation deck. Detective Kael stared at the terminal. A 128-bit cryptographic pulse had just bypassed the district firewall—signed with an encryption key archived forty years ago.

Two immediate leads flashed on the console. The first pointed to the submerged conduit relay in the Lower Sump, pulsing with uncharacteristic power draws. The second referenced an unauthorized breach attempt at the High Directorate's classified corporate archive vault.

He checked the charge on his kinetic sidearm, knowing that whichever lead he pursued would alert the district enforcers.`,
      authorType: 'HUMAN',
      status: 'CANON_PATH',
      coherenceScore: 100,
      depth: 0,
      wordCount: 105,
      readTimeMinutes: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'node-branch-a-002': {
      id: 'node-branch-a-002',
      treeId: 'tree-neon-protocol-001',
      parentNodeId: 'node-root-001',
      title: 'Path A: Trace the Relay Tower in the Lower Sump',
      content: `Kael grabs his rain slicker and descends into the submerged industrial conduits beneath Sector 4. The ambient hum of the ancient cooling grid vibrates through the catwalk.

At the base of the relay, he discovers fresh boot prints and an active splice bypass glowing with illegal turquoise optical fiber. Someone beat him here—and they left the relay terminal warm.`,
      authorType: 'AGENT',
      agentPersona: 'Noir Co-Writer (Action)',
      status: 'CANON_PATH',
      coherenceScore: 89,
      depth: 1,
      wordCount: 88,
      readTimeMinutes: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'node-branch-b-003': {
      id: 'node-branch-b-003',
      treeId: 'tree-neon-protocol-001',
      parentNodeId: 'node-root-001',
      title: 'Path B: Interrogate the Corporate Archive Vault',
      content: `Rather than wading through flooded alleyways, Kael uses emergency credentials to infiltrate the corporate archive building. 

The security logs reveal that the encryption key was accessed from an executive terminal registered to Dr. Aris Chen—a biometric signature that was supposedly decommissioned after the 2062 blackout.`,
      authorType: 'AGENT',
      agentPersona: 'Intrigue Co-Writer (Conspiracy)',
      status: 'ACTIVE',
      coherenceScore: 82,
      depth: 1,
      wordCount: 78,
      readTimeMinutes: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  edges: [
    {
      id: 'edge-001',
      treeId: 'tree-neon-protocol-001',
      sourceNodeId: 'node-root-001',
      targetNodeId: 'node-branch-a-002',
      edgeType: 'BRANCH',
      label: 'Explore Lower Sump'
    },
    {
      id: 'edge-002',
      treeId: 'tree-neon-protocol-001',
      sourceNodeId: 'node-root-001',
      targetNodeId: 'node-branch-b-003',
      edgeType: 'BRANCH',
      label: 'Infiltrate Vault'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 4
};

export const NARRATIVE_STORY_TREE = STARTER_TREE_NEON_PROTOCOL;
export const ARCHITECTURE_DECISION_TREE = STARTER_TREE_NEON_PROTOCOL;
