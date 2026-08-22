import { StoryTree } from '../models/graph.models';

export const NARRATIVE_STORY_TREE: StoryTree = {
  id: 'tree-story-001',
  title: 'The Neon Protocol: Cyber-Noir Chronicles',
  description: 'An immersive, long-form cyber-noir investigation into an anomalous signal originating from the sealed sub-levels of Sector 7.',
  genre: 'Cyberpunk / Noir Mystery',
  rootNodeId: 'story-root',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: {
    'story-root': {
      id: 'story-root',
      treeId: 'tree-story-001',
      parentNodeId: null,
      title: 'Chapter 1: The Midnight Transmission',
      content: `The rain over New Carthage never stopped; it simply changed frequency.

Tonight, it fell in a heavy, acidic curtain that sizzled against the electro-chromic observation panes of the 42nd precinct. Inside his cramped cubicle on the observation mezzanine, Detective Kael Vance adjusted the focal array on his cybernetic left eye. The optical servo whirred with an irritating, metallic click—a relic from the Second Reclamation War that the department's medical insurance refused to recalibrate.

Before him, three phosphor monitors hummed in the semi-darkness. On the central terminal, a waveform spiked erratically.

It was not a standard encrypted police dispatch, nor was it the automated advertising chatter blasted across the commercial skyways. It was an antique 128-bit cryptographic pulse—a frequency protocol abandoned more than forty years ago when the Old Core collapsed.

"Vance," grunted Captain Miller, leaning over the low partition with a steaming mug of synthetic chicory. "Tell me your terminal is glitching again. The Commissioner is on line four asking why our sub-grid telemetry is lighting up like a solar flare."

"It’s not a glitch, Cap," Kael muttered, his fingers clattering rapidly across the mechanical keyboard. "The signal bypassed the outer district firewall in three microseconds. It didn’t brute-force the handshake; it possessed a valid root authentication token."

Miller paused mid-sip, his eyes narrowing beneath heavy gray brows. "Root authentication? That level of clearance was retired when the Archival Vaults were sealed in '84. Who owns that signature key?"

Kael hit the terminal's decode sequence. The progress bar resolved with a chime.

The name on the digital registry flashed in glowing amber: **DR. ARLO CHEN — CHIEF ARCHITECT, PROJECT NEON**.

"Chen is dead," Miller whispered, his voice suddenly dropping. "He died in the Core meltdown before either of us wore a badge. If someone is broadcasting under his cryptographic seal, they are doing it from a terminal physically wired into the submerged foundation beneath Sector 7."

Kael grabbed his rain slicker from the chair and checked the battery indicator on his sidearm. Two immediate investigative leads presented themselves on the forensic console.`,
      authorType: 'HUMAN',
      status: 'ACTIVE',
      coherenceScore: null,
      depth: 0,
      wordCount: 382,
      readTimeMinutes: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'story-branch-a': {
      id: 'story-branch-a',
      treeId: 'tree-story-001',
      parentNodeId: 'story-root',
      title: 'Chapter 2A: The Submerged Conduit',
      content: `The descent into the Lower Sump felt like plunging into the belly of an ancient iron leviathan.

Water dripped ceaselessly from overhead steam vents, carrying the stench of rusted copper and stagnant coolant. Kael stepped off the rusted service lift, his tactical boots splashing into ankle-deep runoff. His HUD flared with warning alerts: atmospheric scrubbers had ceased operating in this sub-tier three decades ago.

"Command, this is Vance," he spoke into his sub-vocal comms collar. "I’m at the junction of Line 4 and the Old Drainage Vault. Signal telemetry is gaining amplitude. It’s broadcasting from behind the high-voltage turbine substation."

"Copy, Vance. Be advised: private corporate security from Apex Heavy Industries just logged a perimeter sweep in your grid. You do not have jurisdictional clearance if they engage."

Kael didn’t reply. He unholstered his kinetic sidearm and clicked the safety off.

Ahead, past a curtain of vapor, an archaic server mainframe hummed inside a reinforced concrete bunker. Thick fiber cables—thick as pythons and glowing with pale blue bioluminescence—traveled across the ceiling, disappearing into an iron bulkhead sealed with an automated hydraulic lock.

Suddenly, a shadow detached itself from the conduit catwalk above.

A sharp clatter echoed against the steel floor. A cylindrical flare rolled to Kael's feet, erupting in blinding magnesium light.

"Step away from the terminal, Detective," a synthesized voice commanded through a respirator grille. "Some transmissions were meant to remain buried."`,
      authorType: 'AGENT',
      agentPersona: 'Action & Atmosphere Co-Writer',
      status: 'CANON_PATH',
      coherenceScore: 94,
      perspectiveScores: [
        { perspectiveName: 'Atmospheric Prose', score: 96, reasoning: 'Rich environmental sensory details and strong visual worldbuilding.' },
        { perspectiveName: 'Narrative Tension', score: 92, reasoning: 'High-stakes confrontation at the end of the chapter.' }
      ],
      depth: 1,
      wordCount: 265,
      readTimeMinutes: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'story-branch-b': {
      id: 'story-branch-b',
      treeId: 'tree-story-001',
      parentNodeId: 'story-root',
      title: 'Chapter 2B: Infiltration of the Apex Spire',
      content: `Instead of wading through flooded sewer tunnels, Kael took the high-speed mag-rail to the Upper District, where the glass towers of Apex Global pierced through the storm clouds like gleaming obsidian needles.

Using an emergency judicial override key, he slipped into the Central Biometric Archive on the 88th floor. The air here was pristine, chilled to exactly 16 degrees Celsius, smelling faintly of ozone and expensive filtration.

Rows of cylindrical cryo-storage data drives stood silently behind bulletproof glass.

Kael slid his neural jack into the maintenance terminal. His vision swam as hundreds of encrypted file indexes flooded his visual cortex.

He filtered the records for Dr. Arlo Chen and the year 2044.

A red classification banner flashed across his retina: **RESTRICTED EXECUTIVE CLEARANCE REQUIRED**.

Beneath the warning, a corrupted video log began auto-playing. Dr. Chen’s face appeared on screen, illuminated by flashing emergency sirens in an underground laboratory.

*"If you are watching this, the containment protocol failed. The signal we detected wasn't artificial intelligence. It was a digital consciousness copy of—"*

The video feed abruptly cut to static. The archive room’s fluorescent lights flickered red, and an automated lockdown chime resonated through the ceiling speakers.`,
      authorType: 'AGENT',
      agentPersona: 'Intrigue & Conspiracy Co-Writer',
      status: 'EXPLORING',
      coherenceScore: 88,
      perspectiveScores: [
        { perspectiveName: 'Plot Intrigue', score: 92, reasoning: 'Uncovers historical conspiracy and raises core mystery stakes.' }
      ],
      depth: 1,
      wordCount: 232,
      readTimeMinutes: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  edges: [
    { id: 'se1', treeId: 'tree-story-001', sourceNodeId: 'story-root', targetNodeId: 'story-branch-a', edgeType: 'BRANCH', label: 'Descend to Sump' },
    { id: 'se2', treeId: 'tree-story-001', sourceNodeId: 'story-root', targetNodeId: 'story-branch-b', edgeType: 'BRANCH', label: 'Infiltrate Apex Vault' }
  ]
};

export const ARCHITECTURE_DECISION_TREE: StoryTree = {
  id: 'tree-arch-001',
  title: 'Architecture Evaluation: High-Throughput Ingestion Engine',
  description: 'Evaluating architectural patterns for scaling ingestion under zero-cost constraints.',
  genre: 'Technical ADR',
  rootNodeId: 'node-root',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: {
    'node-root': {
      id: 'node-root',
      treeId: 'tree-arch-001',
      parentNodeId: null,
      title: 'Root Decision: Core Ingestion Pattern',
      content: 'We need to design a high-throughput event ingestion system capable of handling bursty traffic while running within free-tier container limits.\n\n### Primary Constraints:\n- Zero recurring monthly infrastructure cost\n- Resilient to container scale-to-zero sleeping\n- Support for real-time validation and dead-letter queues',
      authorType: 'HUMAN',
      status: 'ACTIVE',
      coherenceScore: null,
      depth: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    'node-branch-mono': {
      id: 'node-branch-mono',
      treeId: 'tree-arch-001',
      parentNodeId: 'node-root',
      title: 'Option A: Modular Monolith (Spring Boot 4 + Virtual Threads)',
      content: 'Consolidate ingestion, validation, and storage into a single Spring Boot modular application leveraging Java 25 Virtual Threads (Project Loom).\n\n### Pros:\n- Zero network latency between modules\n- Single container memory footprint fits easily within 512MB free tier\n- Atomic database transactions with PostgreSQL\n\n### Cons:\n- Scaling requires scaling the entire monolith',
      authorType: 'AGENT',
      agentPersona: 'Pragmatic Systems Architect',
      status: 'CANON_PATH',
      coherenceScore: 92,
      depth: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  edges: [
    { id: 'e1', treeId: 'tree-arch-001', sourceNodeId: 'node-root', targetNodeId: 'node-branch-mono', edgeType: 'BRANCH', label: 'Modular Monolith' }
  ]
};
