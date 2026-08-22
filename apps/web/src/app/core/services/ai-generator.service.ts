import { Injectable, signal } from '@angular/core';
import { TreeNode, LoreEntity, StoryStyleConfig, AIBranchSuggestion, ChapterGenerationOptions, AIProviderType, AIProviderTelemetry } from '../models/graph.models';

const GEMINI_KEY_STORAGE = 'ghostwriter_gemini_api_key';
const GROQ_KEY_STORAGE = 'ghostwriter_groq_api_key';
const PREFERRED_PROVIDER_STORAGE = 'ghostwriter_preferred_provider';

@Injectable({
  providedIn: 'root'
})
export class AIGeneratorService {
  private offlineParagraphIndex = 0;
  private branchCounter = 1;

  readonly telemetry = signal<AIProviderTelemetry>({
    activeProvider: this.getInitialActiveProvider(),
    geminiStatus: this.getGeminiApiKey() ? 'HEALTHY' : 'OFFLINE',
    groqStatus: this.getGroqApiKey() ? 'HEALTHY' : 'OFFLINE'
  });

  getGeminiApiKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    }
    return '';
  }

  setGeminiApiKey(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
      this.updateTelemetryProvider();
    }
  }

  getGroqApiKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(GROQ_KEY_STORAGE) || '';
    }
    return '';
  }

  setGroqApiKey(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
      this.updateTelemetryProvider();
    }
  }

  getPreferredProvider(): AIProviderType {
    if (typeof window !== 'undefined' && window.localStorage) {
      const pref = window.localStorage.getItem(PREFERRED_PROVIDER_STORAGE) as AIProviderType;
      if (pref && ['GEMINI', 'GROQ', 'OFFLINE'].includes(pref)) return pref;
    }
    return 'GEMINI';
  }

  setPreferredProvider(provider: AIProviderType): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PREFERRED_PROVIDER_STORAGE, provider);
      this.telemetry.update(t => ({ ...t, activeProvider: provider }));
    }
  }

  private getInitialActiveProvider(): AIProviderType {
    if (this.getGeminiApiKey()) return 'GEMINI';
    if (this.getGroqApiKey()) return 'GROQ';
    return 'OFFLINE';
  }

  private updateTelemetryProvider(): void {
    const gemini = this.getGeminiApiKey();
    const groq = this.getGroqApiKey();
    const preferred = this.getPreferredProvider();

    let active: AIProviderType = 'OFFLINE';
    if (preferred === 'GEMINI' && gemini) active = 'GEMINI';
    else if (preferred === 'GROQ' && groq) active = 'GROQ';
    else if (gemini) active = 'GEMINI';
    else if (groq) active = 'GROQ';

    this.telemetry.set({
      activeProvider: active,
      geminiStatus: gemini ? 'HEALTHY' : 'OFFLINE',
      groqStatus: groq ? 'HEALTHY' : 'OFFLINE'
    });
  }

  async testConnection(provider: 'GEMINI' | 'GROQ'): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = performance.now();
    try {
      if (provider === 'GEMINI') {
        const key = this.getGeminiApiKey();
        if (!key) throw new Error('No Gemini API key provided.');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
        });
        if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
        const latency = Math.round(performance.now() - start);
        return { success: true, message: `Connected to Gemini 2.5 Flash (${latency}ms)`, latencyMs: latency };
      } else {
        const key = this.getGroqApiKey();
        if (!key) throw new Error('No Groq API key provided.');
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
        const latency = Math.round(performance.now() - start);
        return { success: true, message: `Connected to Groq Llama 3.3 70B (${latency}ms)`, latencyMs: latency };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed', latencyMs: Math.round(performance.now() - start) };
    }
  }

  /**
   * Expand chapter with cascading auto-failover
   */
  async expandToFullChapter(
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[] = [],
    styleConfig?: StoryStyleConfig
  ): Promise<{ title: string; content: string; wordCount: number }> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();

    if (geminiKey && this.getPreferredProvider() !== 'GROQ') {
      try {
        const result = await this.callGeminiFullChapter(geminiKey, currentChapter, ancestorTrail, options, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GEMINI', geminiStatus: 'HEALTHY', failoverNotice: undefined }));
        return result;
      } catch (err: any) {
        console.warn('Gemini error/rate-limit; attempting failover to Groq:', err);
        this.telemetry.update(t => ({ ...t, geminiStatus: 'RATE_LIMITED', failoverNotice: 'Gemini busy/rate-limited; switched to Groq' }));
      }
    }

    if (groqKey) {
      try {
        const result = await this.callGroqFullChapter(groqKey, currentChapter, ancestorTrail, options, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GROQ', groqStatus: 'HEALTHY' }));
        return result;
      } catch (err: any) {
        console.warn('Groq error; falling back to offline generator:', err);
        this.telemetry.update(t => ({ ...t, groqStatus: 'ERROR', failoverNotice: 'All cloud APIs busy; using Smart Offline Engine' }));
      }
    }

    this.telemetry.update(t => ({ ...t, activeProvider: 'OFFLINE' }));
    await new Promise(r => setTimeout(r, 600));
    return this.generateOfflineFullChapter(currentChapter, options, loreBible, styleConfig);
  }

  /**
   * Propose 3 branches with cascading failover
   */
  async generateThreeBranches(
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[] = [],
    styleConfig?: StoryStyleConfig
  ): Promise<AIBranchSuggestion[]> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();

    if (geminiKey && this.getPreferredProvider() !== 'GROQ') {
      try {
        const result = await this.callGeminiAPI(geminiKey, currentChapter, ancestorTrail, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GEMINI', geminiStatus: 'HEALTHY', failoverNotice: undefined }));
        return result;
      } catch (err) {
        console.warn('Gemini error; failing over to Groq:', err);
        this.telemetry.update(t => ({ ...t, geminiStatus: 'RATE_LIMITED', failoverNotice: 'Gemini busy; switched to Groq' }));
      }
    }

    if (groqKey) {
      try {
        const result = await this.callGroqThreeBranches(groqKey, currentChapter, ancestorTrail, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GROQ', groqStatus: 'HEALTHY' }));
        return result;
      } catch (err) {
        console.warn('Groq error; falling back to offline engine:', err);
        this.telemetry.update(t => ({ ...t, groqStatus: 'ERROR', failoverNotice: 'Using Smart Offline Engine' }));
      }
    }

    this.telemetry.update(t => ({ ...t, activeProvider: 'OFFLINE' }));
    await new Promise(r => setTimeout(r, 550));
    return this.generateDynamicOfflineBranches(currentChapter, loreBible, styleConfig);
  }

  /**
   * Sequentially stream next paragraph
   */
  async continueNextParagraph(
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[] = [],
    styleConfig?: StoryStyleConfig
  ): Promise<string> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();

    if (geminiKey && this.getPreferredProvider() !== 'GROQ') {
      try {
        const res = await this.callGeminiNextParagraph(geminiKey, currentChapter, ancestorTrail, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GEMINI' }));
        return res;
      } catch (err) {
        console.warn('Gemini error; trying Groq:', err);
      }
    }

    if (groqKey) {
      try {
        const res = await this.callGroqNextParagraph(groqKey, currentChapter, ancestorTrail, loreBible, styleConfig);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GROQ' }));
        return res;
      } catch (err) {
        console.warn('Groq error; falling back to offline:', err);
      }
    }

    this.telemetry.update(t => ({ ...t, activeProvider: 'OFFLINE' }));
    await new Promise(r => setTimeout(r, 350));
    return this.generateDynamicOfflineParagraph(currentChapter, loreBible, styleConfig);
  }

  // --- GROQ API CLIENT ---
  private async callGroqFullChapter(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<{ title: string; content: string; wordCount: number }> {
    const prompt = `You are a webnovel author expanding a scene into a full chapter (1,200 - 2,000 words).
Genre: ${styleConfig?.genre || 'Cyberpunk'}
Beat: ${options.focusBeat}

Outline:
Title: ${currentChapter.title}
Text: ${currentChapter.content}

Return ONLY valid JSON matching:
{"title": "${currentChapter.title}", "content": "Full multi-scene prose"}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const words = parsed.content.trim().split(/\s+/).length;
    return { title: parsed.title || currentChapter.title, content: parsed.content, wordCount: words };
  }

  private async callGroqThreeBranches(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<AIBranchSuggestion[]> {
    const prompt = `Propose 3 distinct branching continuations (Action, Plot Twist, Intrigue) for:
${currentChapter.title}
${currentChapter.content}

Return ONLY valid JSON matching:
[
  {"title": "Title", "content": "2 paragraphs prose", "persona": "Action & Escalation" | "Plot Twist & Subversion" | "Intrigue & Investigation", "coherenceScore": 92, "rationale": "Why it fits"}
]`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.choices[0].message.content;
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Could not parse Groq JSON array');
    return JSON.parse(jsonMatch[0]);
  }

  private async callGroqNextParagraph(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<string> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Continue the story smoothly with the next 2-3 narrative paragraphs. Return only prose.' },
          { role: 'user', content: currentChapter.content }
        ]
      })
    });
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // --- GEMINI API CLIENT ---
  private async callGeminiFullChapter(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<{ title: string; content: string; wordCount: number }> {
    const loreContext = loreBible.length
      ? `\nLore & Character Bible:\n${loreBible.map(e => `- ${e.name} (${e.category}): ${e.description}`).join('\n')}`
      : '';

    const genre = styleConfig?.genre || 'Cyberpunk Noir';
    const pacing = styleConfig?.pacing || 'Balanced';
    const tone = styleConfig?.tone || 'Gritty & Dramatic';

    const prompt = `You are an elite novelist and webnovel author writing a full-length published chapter.
Genre: ${genre}
Pacing: ${pacing}
Tone: ${tone}
Focus Beat: ${options.focusBeat}
${loreContext}

Current chapter outline / seed text:
Title: ${currentChapter.title}
Text: ${currentChapter.content}

TASK: Expand this scene into a full, deep, immersive webnovel chapter (1,200 to 2,000 words).
Structure the chapter into multiple sequential scenes separated by double newlines:
- Scene 1: Rich environmental atmosphere, sensory worldbuilding, character mood.
- Scene 2: Realistic, sharp character dialogue and psychological stakes.
- Scene 3: Escalating tension, physical action, or unexpected investigation clue.
- Scene 4: A gripping chapter climax and page-turning cliffhanger ending.

Return strictly as JSON with this schema:
{
  "title": "${currentChapter.title}",
  "content": "Full multi-scene prose in Markdown format."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.85 }
      })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    const words = parsed.content.trim().split(/\s+/).length;
    return {
      title: parsed.title || currentChapter.title,
      content: parsed.content,
      wordCount: words
    };
  }

  private async callGeminiNextParagraph(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<string> {
    const prompt = `You are a creative co-writer continuing a story.
Read the story so far and write the immediate next sequential paragraph (2-3 sentences of vivid action, dialogue, or atmosphere).
Do not repeat what was already written. Continue the flow naturally.

Story so far:
${currentChapter.content}

Return ONLY the continuation text.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callGeminiAPI(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<AIBranchSuggestion[]> {
    const loreContext = loreBible.length
      ? `\nEstablished Lore & Characters:\n${loreBible.map(e => `- ${e.name} (${e.category}): ${e.description} [Traits: ${e.traits.join(', ')}]`).join('\n')}`
      : '';

    const storyHistory = ancestorTrail
      .map((n, i) => `[Chapter ${i + 1}: ${n.title}]\n${n.content}`)
      .join('\n\n');

    const genre = styleConfig?.genre || 'Cyberpunk Noir';
    const pacing = styleConfig?.pacing || 'Balanced';
    const tone = styleConfig?.tone || 'Gritty & Dramatic';

    const prompt = `You are Ghostwriter, an elite creative writing AI.
Story Genre: ${genre}
Pacing: ${pacing}
Tone: ${tone}
${loreContext}

Story context so far:
${storyHistory}

Current Active Chapter:
Title: ${currentChapter.title}
Content: ${currentChapter.content}

TASK: Propose exactly 3 compelling, distinct branching continuations for what could happen next.
1. Path A (Action & Direct Escalation): Immediate physical danger, high-stakes action, or pursuit.
2. Path B (Plot Twist & Subversion): An unexpected discovery, secret betrayal, or shocking revelation that changes everything.
3. Path C (Intrigue & Investigation): A methodical investigative lead, character vulnerability, or strategic deduction.

Return your response strictly as valid JSON matching this schema:
[
  {
    "title": "Short punchy chapter title",
    "content": "2-3 immersive, narrative paragraphs written in high-quality prose matching the story's tone.",
    "persona": "Action & Escalation" | "Plot Twist & Subversion" | "Intrigue & Investigation",
    "coherenceScore": 85 to 98,
    "rationale": "One sentence explaining why this branch creates compelling tension."
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed: AIBranchSuggestion[] = JSON.parse(rawText);
    return parsed.slice(0, 3);
  }

  private generateOfflineFullChapter(
    chapter: TreeNode,
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): { title: string; content: string; wordCount: number } {
    const charName = loreBible.find(e => e.category === 'CHARACTER')?.name || 'Kael';

    const expanded = `${chapter.content}

### Scene II: The Shadowed Approach

The neon reflections warped across rain-slicked asphalt as ${charName} navigated the lower tier. Every shadow in the underpass seemed to stretch with hostile intent. The district's ambient hum—a discordant choir of malfunctioning transformers and distant mag-trains—did nothing to drown out the sound of his own accelerated heartbeat.

He paused beside a shuttered kiosk, pretending to adjust the collar of his trench coat while scanning the alleyway through his thermal HUD. Three heat signatures were stationed sixty meters ahead, concealed behind an armored disposal unit. They weren't scavengers. Their stance was disciplined, weapons held in low-ready configuration.

"Apex tactical units," ${charName} muttered to himself, checking the kinetic charge in his magazine. "They arrived too fast. Someone in precinct dispatch sold the transmission coordinates before my terminal finished printing the log."

### Scene III: The Confrontation

Rather than waiting for the ambush to spring, ${charName} broke left into a narrow drainage corridor. The air here was freezing, choked with industrial coolant fumes that burned his lungs with every breath.

A boot clicked against steel.

"Detective Vance," a voice rang out from the darkness above. A figure stepped onto the catwalk, illuminated by the crimson beacon of an emergency relay. "You should have deleted the waveform and taken your pension. Some protocols were buried for the city's survival."

${charName} leveled his sidearm without hesitation. "Dr. Chen designed the protocol forty years ago to prevent a blackout cascade. Who authorized the execution order on his team?"

The operative didn't answer. Instead, the red targeting laser from his carbine centered directly on ${charName}'s chest.

### Scene IV: The Cliffhanger

A deafening shockwave shattered the silence. The subterranean power substation forty yards away detonated in a fountain of blue electric sparks. The grid died instantly, plunging the entire sector into absolute darkness—save for the glowing amber glyphs burning across ${charName}'s forearm implant.

The transmission wasn't just a message. It was an activation key. And it had just found its host.`;

    const wordCount = expanded.trim().split(/\s+/).length;
    return {
      title: chapter.title,
      content: expanded,
      wordCount
    };
  }

  private generateDynamicOfflineParagraph(
    chapter: TreeNode,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): string {
    const charName = loreBible.find(e => e.category === 'CHARACTER')?.name || 'Kael';

    const narrativeProgressionBeats = [
      `\n\n${charName} knelt beside the shattered terminal, brushing away shards of tempered glass. The backup cooling fans spun down with a dying whine, leaving only the sound of distant sirens echoing from the transit bridge above. He drew a deep breath, knowing that every minute spent lingering in this sector increased the likelihood of a corporate strike team intercept.`,
      
      `\n\nA sharp static discharge snapped across the console interface. A secondary data string began populating the buffer in rapid hexadecimals: coordinates pointing toward the decommissioned Sub-Level 9 pumping station. An encrypted audio note tagged with today's date appeared at the bottom of the stream.`,
      
      `\n\n"You're running out of time, Detective," the voice on the audio log whispered—a synthesized cadence that sounded unnervingly familiar. "They've already deployed the clean-up team to your current sector. If you want to survive the night, look inside the emergency transformer behind the main breaker."`,
      
      `\n\n${charName} turned swiftly, his trench coat snapping against the damp concrete. He pried open the rusted inspection panel of the transformer. Inside, nestled among frayed copper wiring, sat a military-grade neural decoder and a keycard stamped with the silver insignia of the High Directorate.`,
      
      `\n\nHeavy footsteps echoed from the access tunnel fifty yards away. The beam of high-powered tactical flashlights cut through the industrial haze. ${charName} pocketed the keycard, racked the slide of his sidearm, and ducked into the shadows beneath the catwalk.`
    ];

    const beat = narrativeProgressionBeats[this.offlineParagraphIndex % narrativeProgressionBeats.length];
    this.offlineParagraphIndex++;
    return beat;
  }

  private generateDynamicOfflineBranches(
    chapter: TreeNode,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): AIBranchSuggestion[] {
    const charName = loreBible.find(e => e.category === 'CHARACTER')?.name || 'Kael';
    const c = this.branchCounter++;

    const dynamicTemplates = [
      {
        title: `Ambush on Gantry ${c * 3 + 1}`,
        content: `${charName} ducked under a hail of suppressed gunfire as corporate enforcers breached the upper catwalk. Neon tracer rounds scarred the concrete pillars, raining sparks onto his trench coat.\n\nWith only one functional combat stim remaining, he had to decide whether to return fire and hold the bottleneck or trigger the emergency ventilation purge.`,
        persona: 'Action & Escalation',
        coherenceScore: 91 + (c % 7),
        rationale: 'Forces high-adrenaline combat stakes and immediate tactical movement.'
      },
      {
        title: `The Blackout Revelation`,
        content: `As the diagnostic decipher finished, the terminal displayed a redacted personnel record with ${charName}'s own military service number stamped in red.\n\nThe transmission wasn't an external intrusion—it was a pre-programmed dead man's switch created by someone who knew his exact neural signature.`,
        persona: 'Plot Twist & Subversion',
        coherenceScore: 94 + (c % 5),
        rationale: 'Inverts the core conspiracy with a shocking personal revelation.'
      },
      {
        title: `The Cyber-Doc in the Lower Sump`,
        content: `Slipping past the perimeter sensors, ${charName} sought out an old black-market cyber-technician operating out of a decommissioned filtration vault.\n\n"I haven't seen an optical cipher like that since before the quarantine," the doctor muttered, inspecting the glowing forearm glyph. "You didn't find this signal, Detective. It found you."`,
        persona: 'Intrigue & Alliance',
        coherenceScore: 89 + (c % 8),
        rationale: 'Expands the worldbuilding with an intriguing underground informant.'
      }
    ];

    return dynamicTemplates;
  }
}
