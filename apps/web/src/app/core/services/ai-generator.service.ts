import { Injectable, inject, signal } from '@angular/core';
import { TreeNode, LoreEntity, StoryStyleConfig, AIBranchSuggestion, ChapterGenerationOptions, AIProviderType, AIProviderTelemetry, DiscoveredEntity, StoryInceptionRequest, StoryInceptionResult } from '../models/graph.models';
import { SupabaseService } from './supabase.service';

const GEMINI_KEY_STORAGE = 'ghostwriter_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'ghostwriter_gemini_model';
const GROQ_KEY_STORAGE = 'ghostwriter_groq_api_key';
const GROQ_MODEL_STORAGE = 'ghostwriter_groq_model';
const PREFERRED_PROVIDER_STORAGE = 'ghostwriter_preferred_provider';

@Injectable({
  providedIn: 'root'
})
export class AIGeneratorService {
  private readonly supabase = inject(SupabaseService);
  private offlineParagraphIndex = 0;
  private branchCounter = 1;

  readonly telemetry = signal<AIProviderTelemetry>({
    activeProvider: this.getInitialActiveProvider(),
    geminiStatus: this.getGeminiApiKey() ? 'HEALTHY' : 'OFFLINE',
    groqStatus: this.getGroqApiKey() ? 'HEALTHY' : 'OFFLINE'
  });

  getGeminiModel(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(GEMINI_MODEL_STORAGE) || 'gemini-3.6-flash';
    }
    return 'gemini-3.6-flash';
  }

  setGeminiModel(model: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GEMINI_MODEL_STORAGE, (model || 'gemini-3.6-flash').trim());
    }
  }

  getGroqModel(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(GROQ_MODEL_STORAGE) || 'llama-3.3-70b-versatile';
    }
    return 'llama-3.3-70b-versatile';
  }

  setGroqModel(model: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GROQ_MODEL_STORAGE, (model || 'llama-3.3-70b-versatile').trim());
    }
  }

  async fetchAvailableGroqModels(keyInput?: string): Promise<{ id: string; name: string }[]> {
    const key = (keyInput || this.getGroqApiKey()).trim();
    if (!key) {
      return [
        { id: 'llama-3.3-70b-versatile', name: '⚡ Llama 3.3 70B Versatile (Fast & High Quality)' },
        { id: 'deepseek-r1-distill-llama-70b', name: '🧠 DeepSeek R1 70B (Deep Reasoning)' },
        { id: 'llama-3.1-8b-instant', name: '🚀 Llama 3.1 8B Instant (Ultra-Fast)' },
        { id: 'qwen-2.5-32b', name: '⚙️ Qwen 2.5 32B' }
      ];
    }

    try {
      const url = `https://api.groq.com/openai/v1/models`;
      const res = await this.providerFetch(url, {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawList = data?.data || [];
      const valid = rawList
        .filter((m: any) => m.active !== false)
        .map((m: any) => {
          const id = String(m.id || '');
          const isLlama = id.includes('llama');
          const isDeepseek = id.includes('deepseek');
          const isQwen = id.includes('qwen');
          const icon = isDeepseek ? '🧠' : isLlama ? '⚡' : isQwen ? '⚙️' : '🤖';
          return {
            id,
            name: `${icon} ${id}`
          };
        });
      if (valid.length > 0) {
        return valid;
      }
    } catch {}

    return [
      { id: 'llama-3.3-70b-versatile', name: '⚡ Llama 3.3 70B Versatile (Fast & High Quality)' },
      { id: 'deepseek-r1-distill-llama-70b', name: '🧠 DeepSeek R1 70B (Deep Reasoning)' },
      { id: 'llama-3.1-8b-instant', name: '🚀 Llama 3.1 8B Instant (Ultra-Fast)' },
      { id: 'qwen-2.5-32b', name: '⚙️ Qwen 2.5 32B' }
    ];
  }

  async fetchAvailableGeminiModels(keyInput?: string): Promise<{ id: string; name: string }[]> {
    const key = (keyInput || this.getGeminiApiKey()).trim();
    if (!key) {
      return [
        { id: 'gemini-3.6-flash', name: '⚡ Gemini 3.6 Flash (Recommended: Ultra-Fast & Free Tier)' },
        { id: 'gemini-3.6-pro', name: '🧠 Gemini 3.6 Pro (Deep Reasoning & Complex Prose)' }
      ];
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await this.providerFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawList = data?.models || [];
      const valid = rawList
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => {
          const id = String(m.name || '').replace(/^models\//, '');
          const isFlash = id.includes('flash');
          const isPro = id.includes('pro');
          const icon = isFlash ? '⚡' : isPro ? '🧠' : '🤖';
          return {
            id,
            name: `${icon} ${m.displayName || id} (${id})`
          };
        });
      if (valid.length > 0) {
        return valid;
      }
    } catch {}

    return [
      { id: 'gemini-3.6-flash', name: '⚡ Gemini 3.6 Flash (Recommended: Ultra-Fast & Free Tier)' },
      { id: 'gemini-3.6-pro', name: '🧠 Gemini 3.6 Pro (Deep Reasoning & Complex Prose)' }
    ];
  }

  getGeminiApiKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    return 'server-managed';
  }

  setGeminiApiKey(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GEMINI_KEY_STORAGE);
      this.updateTelemetryProvider();
    }
  }

  getGroqApiKey(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GROQ_KEY_STORAGE);
    }
    return 'server-managed';
  }

  setGroqApiKey(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GROQ_KEY_STORAGE);
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
      this.updateTelemetryProvider();
    }
  }

  private getInitialActiveProvider(): AIProviderType {
    const pref = this.getPreferredProvider();
    if (pref === 'GEMINI' && this.getGeminiApiKey()) return 'GEMINI';
    if (pref === 'GROQ' && this.getGroqApiKey()) return 'GROQ';
    if (this.getGeminiApiKey()) return 'GEMINI';
    if (this.getGroqApiKey()) return 'GROQ';
    return 'OFFLINE';
  }

  updateTelemetryProvider(): void {
    const gemini = this.getGeminiApiKey();
    const groq = this.getGroqApiKey();
    const preferred = this.getPreferredProvider();

    let active: AIProviderType = 'OFFLINE';
    if (preferred === 'GEMINI' && gemini) active = 'GEMINI';
    else if (preferred === 'GROQ' && groq) active = 'GROQ';
    else if (gemini) active = 'GEMINI';
    else if (groq) active = 'GROQ';
    else if (preferred === 'OFFLINE') active = 'OFFLINE';

    this.telemetry.set({
      activeProvider: active,
      geminiStatus: gemini ? 'HEALTHY' : 'OFFLINE',
      groqStatus: groq ? 'HEALTHY' : 'OFFLINE'
    });
  }

  private async providerFetch(url: string, init: RequestInit = {}): Promise<Response> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('AI provider URL is invalid.');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      throw new Error('AI provider URL must use direct HTTPS.');
    }
    const provider = parsed.hostname === 'generativelanguage.googleapis.com' ? 'GEMINI'
      : parsed.hostname === 'api.groq.com' ? 'GROQ' : null;
    if (!provider) throw new Error('AI provider host is not allowed.');

    const token = await this.supabase.getAccessToken();
    if (!token) return new Response(JSON.stringify({ error: 'Sign in to use server-managed AI.' }), { status: 401 });
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, path: parsed.pathname, method: init.method || 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined })
    });
    return response;
  }

  async testConnection(provider: 'GEMINI' | 'GROQ'): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = performance.now();
    try {
      if (provider === 'GEMINI') {
        const key = this.getGeminiApiKey();
        if (!key) throw new Error('No Gemini API key provided.');
        let model = this.getGeminiModel();
        
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        let res = await this.providerFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
        });

        if (!res.ok) {
          let detail = `Status ${res.status}: ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData?.error?.message) {
              detail = errData.error.message;
            }
          } catch {}

          // Check if Google returned a suggested replacement model (e.g. "update your code to use models/gemini-3.6-flash")
          const match = detail.match(/models\/(gemini-[\w.-]+)/);
          if (match && match[1] && match[1] !== model) {
            const suggestedModel = match[1];
            const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${suggestedModel}:generateContent?key=${key}`;
            const retryRes = await this.providerFetch(retryUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
            });
            if (retryRes.ok) {
              this.setGeminiModel(suggestedModel);
              const latency = Math.round(performance.now() - start);
              return { success: true, message: `Connected to ${suggestedModel} (${latency}ms)`, latencyMs: latency };
            }
          }

          // If still failing and not 3.6, try gemini-3.6-flash directly
          if (model !== 'gemini-3.6-flash') {
            const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
            const retryRes = await this.providerFetch(retryUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
            });
            if (retryRes.ok) {
              this.setGeminiModel('gemini-3.6-flash');
              const latency = Math.round(performance.now() - start);
              return { success: true, message: `Connected to gemini-3.6-flash (${latency}ms)`, latencyMs: latency };
            }
          }

          throw new Error(detail);
        }

        const latency = Math.round(performance.now() - start);
        return { success: true, message: `Connected to ${model} (${latency}ms)`, latencyMs: latency };
      } else {
        const key = this.getGroqApiKey();
        if (!key) throw new Error('No Groq API key provided.');
        const model = this.getGroqModel();
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        const res = await this.providerFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          let detail = `Status ${res.status}: ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData?.error?.message) {
              detail = errData.error.message;
            }
          } catch {}
          throw new Error(detail);
        }
        const latency = Math.round(performance.now() - start);
        return { success: true, message: `Connected to ${model} (${latency}ms)`, latencyMs: latency };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed', latencyMs: Math.round(performance.now() - start) };
    }
  }

  // =========================================================================
  // 🌟 DYNAMIC STORY INCEPTION ENGINE
  // =========================================================================
  async generateStoryInception(req: StoryInceptionRequest): Promise<StoryInceptionResult> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();
    const preferred = this.getPreferredProvider();

    if (preferred === 'GEMINI' && geminiKey) {
      try {
        return await this.callGeminiStoryInception(geminiKey, req);
      } catch (err) {
        console.warn('Gemini Story Inception failed, trying Groq fallback:', err);
      }
    }

    if (preferred === 'GROQ' && groqKey) {
      try {
        return await this.callGroqStoryInception(groqKey, req);
      } catch (err) {
        console.warn('Groq Story Inception failed, trying Gemini fallback:', err);
      }
    }

    if (geminiKey) {
      try {
        return await this.callGeminiStoryInception(geminiKey, req);
      } catch (err) {}
    }
    if (groqKey) {
      try {
        return await this.callGroqStoryInception(groqKey, req);
      } catch (err) {}
    }

    return this.generateOfflineStoryInception(req);
  }

  private async callGeminiStoryInception(apiKey: string, req: StoryInceptionRequest): Promise<StoryInceptionResult> {
    const mcName = req.protagonist?.name?.trim() || 'Derek';
    const mcGender = req.protagonist?.gender || 'Protagonist';
    const mcTraits = req.protagonist?.traits?.length ? req.protagonist.traits : [req.tone || 'Determined'];

    const prompt = `You are a master creative novelist and worldbuilder initializing a new branching interactive webnovel.
STORY CONFIGURATION:
- Title: "${req.title}"
- Genre: "${req.genre}"
- Tone: "${req.tone}"
- Target Scope: "${req.scope}"
- Author's Custom Premise / Pitch: "${req.premise || `The journey of ${mcName} in ${req.title}`}"

PROTAGONIST PROFILE:
- Name: "${mcName}"
- Gender & Pronouns: "${mcGender}"
- Core Personality Traits: ${mcTraits.join(', ')}

TASK:
1. Write a gripping, atmospheric opening chapter hook (3-4 rich paragraphs) that directly starts the story placing ${mcName} at the heart of the opening scene. Use their specified pronouns and embody their traits.
2. NEVER refer to them as "The protagonist" or "the main character"—always use "${mcName}" and their pronouns.
3. Extract 2-3 essential foundational Lore Bible entities (The first entity MUST be "${mcName}" with category "CHARACTER" and their traits, followed by 1 Location, and 1 Item or Faction).

Return STRICT JSON matching this schema:
{
  "openingHook": "3-4 rich continuous narrative paragraphs in markdown.",
  "initialLore": [
    {
      "name": "${mcName}",
      "category": "CHARACTER",
      "description": "2-3 sentences of context",
      "traits": ${JSON.stringify(mcTraits)}
    },
    {
      "name": "Primary Location or Key Entity",
      "category": "LOCATION" | "ITEM" | "FACTION",
      "description": "2-3 sentences of context",
      "traits": ["Trait 1", "Trait 2"]
    }
  ]
}`;

    const model = this.getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await this.providerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.75 }
      })
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    const parsed = JSON.parse(text);
    return {
      openingHook: parsed.openingHook || req.premise || `The story of ${mcName} begins.`,
      initialLore: (parsed.initialLore || []).map((e: any, idx: number) => ({
        id: `lore-inc-${Date.now()}-${idx}`,
        name: e.name || (idx === 0 ? mcName : 'Core Setting'),
        category: e.category || (idx === 0 ? 'CHARACTER' : 'LOCATION'),
        description: e.description || '',
        traits: Array.isArray(e.traits) ? e.traits : (idx === 0 ? mcTraits : [])
      }))
    };
  }

  private async callGroqStoryInception(apiKey: string, req: StoryInceptionRequest): Promise<StoryInceptionResult> {
    const mcName = req.protagonist?.name?.trim() || 'Derek';
    const mcGender = req.protagonist?.gender || 'Protagonist';
    const mcTraits = req.protagonist?.traits?.length ? req.protagonist.traits : [req.tone || 'Determined'];

    const prompt = `You are a master creative novelist initializing a new branching interactive webnovel.
Title: "${req.title}"
Genre: "${req.genre}"
Tone: "${req.tone}"
Scope: "${req.scope}"
Premise: "${req.premise || `The journey of ${mcName} in ${req.title}`}"

PROTAGONIST:
- Name: "${mcName}"
- Gender/Pronouns: "${mcGender}"
- Traits: ${mcTraits.join(', ')}

TASK:
1. Write an evocative 3-paragraph opening hook for Chapter 1 featuring ${mcName} directly. Do NOT use generic "the protagonist".
2. Provide 2-3 foundational lore entities starting with ${mcName}.

Respond strictly with a JSON object matching:
{
  "openingHook": "string",
  "initialLore": [
    {
      "name": "${mcName}",
      "category": "CHARACTER",
      "description": "string",
      "traits": ${JSON.stringify(mcTraits)}
    }
  ]
}`;

    const model = this.getGroqModel();
    const response = await this.providerFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.75
      })
    });
    if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
    const data = await response.json();
    const raw = data.choices[0].message.content;
    const parsed = JSON.parse(raw);
    return {
      openingHook: parsed.openingHook || req.premise || `The story of ${mcName} begins.`,
      initialLore: (parsed.initialLore || []).map((e: any, idx: number) => ({
        id: `lore-inc-${Date.now()}-${idx}`,
        name: e.name || (idx === 0 ? mcName : 'Core Setting'),
        category: e.category || (idx === 0 ? 'CHARACTER' : 'LOCATION'),
        description: e.description || '',
        traits: Array.isArray(e.traits) ? e.traits : (idx === 0 ? mcTraits : [])
      }))
    };
  }

  private generateOfflineStoryInception(req: StoryInceptionRequest): StoryInceptionResult {
    const genre = req.genre || 'Fiction';
    const tone = req.tone || 'Dramatic';
    const mcName = req.protagonist?.name?.trim() || 'Derek';
    const mcGender = req.protagonist?.gender || 'Protagonist';
    const mcTraits = req.protagonist?.traits?.length ? req.protagonist.traits : [tone, 'Determined'];
    const traitsStr = mcTraits.join(', ');

    const genderLower = mcGender.toLowerCase();
    let possessive = 'their';
    let subject = 'they';
    if (genderLower.includes('female') || genderLower.includes('she')) {
      possessive = 'her';
      subject = 'she';
    } else if (genderLower.includes('male') || genderLower.includes('he')) {
      possessive = 'his';
      subject = 'he';
    }

    let openingHook = '';
    if (req.premise && req.premise.trim().length > 0) {
      openingHook = `${req.premise.trim()}\n\n${mcName} surveyed the immediate surroundings with measured precision, analyzing the unfolding situation as tension mounted. With every passing second, the stakes grew sharper, leaving little room for error.\n\nTaking a steady breath, ${mcName} set ${possessive} plan into motion, ready to confront the challenges ahead.`;
    } else {
      const gLower = genre.toLowerCase();
      if (gLower.includes('sci-fi') || gLower.includes('space') || gLower.includes('cyber')) {
        openingHook = `The diagnostic terminal in the command module flickered with amber warning lines as ${mcName} initiated the orbital descent sequence. Outside the reinforced viewport, distant constellations burned cold against the endless vacuum.\n\n${mcName} checked the pressure seals, adjusted the telemetry monitors, and prepared for the volatile burn ahead, well aware that precision was the only margin for survival.\n\nTaking a steady breath, ${subject} engaged the manual thruster controls and locked the trajectory forward.`;
      } else if (gLower.includes('noir') || gLower.includes('mystery') || gLower.includes('crime')) {
        openingHook = `Smoke drifted toward the rain-streaked windows as ${mcName} stared at the sealed case file on the desk. Outside in the foggy district, sirens wailed in the distance before fading into the city's ceaseless drone.\n\nChecking the chamber of ${possessive} revolver with practiced muscle memory, ${mcName} pocketed the key and prepared for the meeting they knew was a trap.\n\nStepping out into the cold night, ${subject} moved swiftly down the shadowed alleyway toward the rendezvous point.`;
      } else if (gLower.includes('fantasy') || gLower.includes('magic')) {
        openingHook = `The ancient stone runes etched into the archway hummed with a faint, luminous pulse as ${mcName} approached the perimeter of the forgotten sanctuary. A chill wind swept through the ruined colonnade, carrying the scent of elder ash and dormant power.\n\nTightening the leather grip on ${possessive} weapon, ${mcName} crossed the threshold into the shadowed depths, listening intently to the reverberations in the stone.\n\nThere was no turning back now; the first step into the sanctuary had already awakened what lay beneath.`;
      } else if (gLower.includes('horror') || gLower.includes('thriller')) {
        openingHook = `The silence in the corridor was absolute, save for the irregular dripping of moisture somewhere beyond the peeling walls. ${mcName} stood motionless, listening to the subtle creak of floorboards in the darkness ahead.\n\nGripping the flashlight with white-knuckled intensity, ${mcName} forced ${possessive} feet forward into the shadows, knowing that hesitation would only make things worse.\n\nAs the beam of light swept across the doorway, a sudden draft extinguished the faint warmth in the room.`;
      } else {
        openingHook = `The morning air was crisp and charged with quiet tension as ${mcName} stepped out onto the open path. Every instinct urged caution as the weight of recent decisions began to take shape.\n\n${mcName} paused for a moment to take in the surroundings, assessing the obstacles ahead before setting the journey into motion.\n\nWith clear focus and unwavering resolve, ${subject} took the first decisive step forward.`;
      }
    }

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

    const initialLore: LoreEntity[] = [
      {
        id: `lore-inc-1`,
        name: mcName,
        category: 'CHARACTER',
        description: `${mcName} is the central protagonist of ${req.title}. Distinctly ${traitsStr}.`,
        traits: [mcGender, ...mcTraits]
      },
      {
        id: `lore-inc-2`,
        name: initialLocationName,
        category: 'LOCATION',
        description: `The primary opening setting where the story begins.`,
        traits: ['Atmospheric', 'Opening Setting']
      }
    ];

    return { openingHook, initialLore };
  }

  // =========================================================================
  // ⚡ HIERARCHICAL CONTEXT COMPRESSION & SLIDING WINDOW BUILDER
  // =========================================================================
  async summarizeChapter(chapter: TreeNode): Promise<string> {
    if (chapter.summary && chapter.summary.trim().length > 10) {
      return chapter.summary;
    }
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();
    const prompt = `Summarize this novel chapter in exactly 2 concise sentences (under 40 words total), focusing on the protagonist's key decision and the current cliffhanger:\n\n${chapter.content.slice(0, 1500)}`;

    if (geminiKey) {
      try {
        const model = this.getGeminiModel();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await this.providerFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) return txt.trim();
        }
      } catch {}
    }

    if (groqKey) {
      try {
        const res = await this.providerFetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: this.getGroqModel(),
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data.choices[0]?.message?.content;
          if (txt) return txt.trim();
        }
      } catch {}
    }

    return this.quickSummarize(chapter.content);
  }

  async generateLoreBibleFromProse(prose: string, genre = 'Fiction', tone = 'Dramatic'): Promise<LoreEntity[]> {
    return this.extractLoreEntities(prose, genre, tone);
  }


  private quickSummarize(content: string): string {
    if (!content) return 'The chapter unfolds.';
    const sentences = this.splitIntoSentences(content);
    if (sentences.length <= 2) return sentences.join(' ');
    return `${sentences[0]} ${sentences[sentences.length - 1]}`;
  }

  private buildHierarchicalPromptContext(
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig,
    existingChildren: TreeNode[] = []
  ): {
    systemDirectives: string;
    macroStoryRecap: string;
    microLocalContext: string;
    loreContext: string;
    existingBranchContext: string;
    pacingDirectives: string;
  } {
    const genre = styleConfig?.genre || 'Fiction';
    const tone = styleConfig?.tone || 'Dramatic';
    const pacing = styleConfig?.pacing || 'Balanced';
    const scope = styleConfig?.storyScope || 'MEDIUM';
    const depth = currentChapter.depth || 0;

    const systemDirectives = `Genre: ${genre} | Tone: ${tone} | Pacing: ${pacing} | Target Scope: ${scope}`;

    let macroStoryRecap = '';
    const macroAncestors = ancestorTrail.filter(a => a.id !== currentChapter.id && a.parentNodeId !== null);
    if (macroAncestors.length > 0) {
      macroStoryRecap = `STORY SO FAR (Previous Chapters Summary):\n` +
        macroAncestors.map((anc, idx) => {
          const summary = anc.summary || this.quickSummarize(anc.content);
          return `- Chapter ${idx + 1} ("${anc.title}"): ${summary}`;
        }).join('\n');
    }

    const parentNode = ancestorTrail.find(a => a.id === currentChapter.parentNodeId);
    let microLocalContext = '';
    if (parentNode && parentNode.content) {
      const parentSentences = this.splitIntoSentences(parentNode.content);
      const parentEnding = parentSentences.slice(-3).join(' ');
      microLocalContext += `IMMEDIATE PRECEDING EVENT (Chapter Ending):\n"...${parentEnding}"\n\n`;
    }
    microLocalContext += `CURRENT CHAPTER DRAFT (${currentChapter.title}):\n"""\n${currentChapter.content || '(Chapter draft begins here)'}\n"""`;

    const loreContext = loreBible.length > 0
      ? `LORE BIBLE & ACTIVE ENTITIES:\n` + loreBible.map(e => `- ${e.name} [${e.category}]: ${e.description}${e.traits?.length ? ` (Traits: ${e.traits.join(', ')})` : ''}`).join('\n')
      : '';

    const existingChildTitles = existingChildren.map(c => c.title);
    const existingBranchContext = existingChildTitles.length > 0
      ? `EXISTING BRANCHES (DO NOT duplicate or repeat these directions):\n${existingChildTitles.map(t => '- ' + t).join('\n')}`
      : '';

    const scopeGuidance = scope === 'SHORT'
      ? 'Short-Form Velocity (~3-5 Chapters): Drive directly toward crisis confrontation and rapid stakes resolution.'
      : scope === 'LONG' || scope === 'EPIC'
      ? 'Long-Form Epic Velocity (~20+ Chapters): Foster deep atmospheric immersion, character nuance, and layered mysteries.'
      : 'Medium-Form Velocity (~8-15 Chapters): Classic 3-act narrative with progressive tension and subplot development.';

    const depthGuidance = depth <= 1
      ? 'Act 1 (Inciting Discovery): Establish the immediate stakes, motivations, and central obstacles.'
      : depth <= 3
      ? 'Act 2 (Rising Action & Complications): Introduce unexpected twists, secret motives, and critical dilemmas.'
      : 'Act 3 (Climax & Resolution): Force decisive actions, character transformations, and high-consequence outcomes.';

    const pacingDirectives = `PACING & NARRATIVE STAGE:\n- ${scopeGuidance}\n- ${depthGuidance}`;

    return {
      systemDirectives,
      macroStoryRecap,
      microLocalContext,
      loreContext,
      existingBranchContext,
      pacingDirectives
    };
  }

  // =========================================================================
  // 📚 EXPAND TO FULL CHAPTER
  // =========================================================================
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
    return this.generateOfflineFullChapter(currentChapter, ancestorTrail, options, loreBible, styleConfig);
  }

  private async callGeminiFullChapter(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<{ title: string; content: string; wordCount: number }> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig);

    const prompt = `You are an elite webnovel novelist expanding a chapter draft into full published prose (1,200 to 2,000 words).
DIRECTIVES:
${ctx.systemDirectives}
Focus Beat: ${options.focusBeat}

${ctx.loreContext}

${ctx.macroStoryRecap}

${ctx.microLocalContext}

${ctx.pacingDirectives}

TASK: Expand the current chapter draft into continuous, vivid novel prose with natural dialogue, atmospheric sensory details, and narrative momentum.
FORMATTING RULES:
- Write continuous novel prose without scene headers like "Scene I" or "### Scene".
- Maintain character voice and continuity from previous chapters.

Return strictly as JSON with this schema:
{
  "title": "${currentChapter.title}",
  "content": "Full continuous novel prose in Markdown without scene headers."
}`;

    const model = this.getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await this.providerFetch(url, {
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
    if (!rawText) throw new Error('Empty response from Gemini');
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    const words = parsed.content.trim().split(/\s+/).length;
    return { title: parsed.title || currentChapter.title, content: parsed.content, wordCount: words };
  }

  private async callGroqFullChapter(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<{ title: string; content: string; wordCount: number }> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig);

    const prompt = `You are a published webnovel author expanding a chapter draft into full immersive prose (1,200 to 2,000 words).
${ctx.systemDirectives}
Focus Beat: ${options.focusBeat}
${ctx.loreContext}
${ctx.macroStoryRecap}
${ctx.microLocalContext}
${ctx.pacingDirectives}

Expand into rich continuous novel prose without scene headers.
Return strictly as JSON matching:
{
  "title": "${currentChapter.title}",
  "content": "Full continuous novel prose in Markdown without scene headers."
}`;

    const model = this.getGroqModel();
    const res = await this.providerFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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

  // =========================================================================
  // 🌿 3-PATH DIVERGENT BRANCHING ENGINE
  // =========================================================================
  async generateThreeBranches(
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    existingChildren: TreeNode[] = [],
    loreBible: LoreEntity[] = [],
    styleConfig?: StoryStyleConfig
  ): Promise<AIBranchSuggestion[]> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();

    if (geminiKey && this.getPreferredProvider() !== 'GROQ') {
      try {
        const result = await this.callGeminiAPI(geminiKey, currentChapter, ancestorTrail, loreBible, styleConfig, existingChildren);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GEMINI', geminiStatus: 'HEALTHY', failoverNotice: undefined }));
        return result;
      } catch (err) {
        console.warn('Gemini error; failing over to Groq:', err);
        this.telemetry.update(t => ({ ...t, geminiStatus: 'RATE_LIMITED', failoverNotice: 'Gemini busy; switched to Groq' }));
      }
    }

    if (groqKey) {
      try {
        const result = await this.callGroqThreeBranches(groqKey, currentChapter, ancestorTrail, loreBible, styleConfig, existingChildren);
        this.telemetry.update(t => ({ ...t, activeProvider: 'GROQ', groqStatus: 'HEALTHY' }));
        return result;
      } catch (err) {
        console.warn('Groq error; falling back to offline engine:', err);
        this.telemetry.update(t => ({ ...t, groqStatus: 'ERROR', failoverNotice: 'Using Smart Offline Engine' }));
      }
    }

    this.telemetry.update(t => ({ ...t, activeProvider: 'OFFLINE' }));
    await new Promise(r => setTimeout(r, 550));
    return this.generateDynamicOfflineBranches(currentChapter, ancestorTrail, existingChildren, loreBible, styleConfig);
  }

  private async callGeminiAPI(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig,
    existingChildren: TreeNode[] = []
  ): Promise<AIBranchSuggestion[]> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig, existingChildren);

    const nextLetter = String.fromCharCode(65 + existingChildren.length);
    const prompt = `You are Ghostwriter, an elite creative writing AI.
DIRECTIVES:
${ctx.systemDirectives}

${ctx.loreContext}

${ctx.macroStoryRecap}

${ctx.microLocalContext}

${ctx.pacingDirectives}

${ctx.existingBranchContext}

TASK: Propose exactly 3 compelling, distinct branching continuations for what could happen next from this chapter.
- Branch 1 (Action & Escalation): Immediate physical, emotional, or situational stakes increase.
- Branch 2 (Plot Twist & Subversion): An unexpected discovery, secret motive, or surprising turn of events.
- Branch 3 (Intrigue & Investigation): Methodical tactical deduction, atmospheric lore discovery, or character vulnerability.

Label your suggestions starting from Path ${nextLetter}.
Return strictly as valid JSON matching this schema:
[
  {
    "title": "Path ${nextLetter}: Short punchy title",
    "content": "2-3 immersive narrative paragraphs written in high-quality prose matching the story's tone.",
    "persona": "Action & Escalation" | "Plot Twist & Subversion" | "Intrigue & Investigation",
    "coherenceScore": 85 to 98,
    "rationale": "One sentence explaining why this branch fits the story context."
  }
]`;

    const model = this.getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await this.providerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.85 }
      })
    });

    if (!response.ok) throw new Error(`Gemini API returned status ${response.status}`);
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: AIBranchSuggestion[] = JSON.parse(cleanJson);
    return parsed.slice(0, 3);
  }

  private async callGroqThreeBranches(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig,
    existingChildren: TreeNode[] = []
  ): Promise<AIBranchSuggestion[]> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig, existingChildren);
    const nextLetter = String.fromCharCode(65 + existingChildren.length);

    const prompt = `Propose 3 distinct branching continuations for:
${ctx.systemDirectives}
${ctx.loreContext}
${ctx.macroStoryRecap}
${ctx.microLocalContext}
${ctx.pacingDirectives}
${ctx.existingBranchContext}

Start labeling from Path ${nextLetter}.
Return ONLY valid JSON matching:
[
  {"title": "Path ${nextLetter}: Title", "content": "2 paragraphs prose", "persona": "Action & Escalation" | "Plot Twist & Subversion" | "Intrigue & Investigation", "coherenceScore": 92, "rationale": "Why it fits"}
]`;

    const model = this.getGroqModel();
    const res = await this.providerFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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

  // =========================================================================
  // ✍️ SEQUENTIAL PARAGRAPH CONTINUATION
  // =========================================================================
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
    return this.generateDynamicOfflineParagraph(currentChapter, ancestorTrail, loreBible, styleConfig);
  }

  private async callGeminiNextParagraph(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<string> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig);
    const prompt = `You are a creative novelist continuing a scene.
${ctx.systemDirectives}
${ctx.loreContext}
${ctx.microLocalContext}

TASK: Write a full, substantive narrative paragraph (4-6 rich sentences with vivid sensory detail, natural character actions/dialogue, and escalating narrative tension).
Do NOT write a short 1-line sentence or brief summary. Write a complete, immersive paragraph of fiction that naturally continues the narrative from the last sentence.
Do NOT repeat existing sentences. Do NOT include chapter/scene headers.

Return ONLY the continuation paragraph prose.`;

    const model = this.getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await this.providerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callGroqNextParagraph(
    apiKey: string,
    currentChapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): Promise<string> {
    const ctx = this.buildHierarchicalPromptContext(currentChapter, ancestorTrail, loreBible, styleConfig);
    const model = this.getGroqModel();
    const res = await this.providerFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: `You are an expert novelist. Write a full, rich narrative paragraph (4-6 vivid sentences with actions, sensory atmosphere, and dialogue) that seamlessly continues the story. Do NOT write a single short line.` },
          { role: 'user', content: `${ctx.systemDirectives}\n${ctx.loreContext}\n${ctx.microLocalContext}\n\nTASK: Write the next full narrative paragraph (4-6 sentences).` }
        ]
      })
    });
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // =========================================================================
  // 🔍 IN-FLIGHT ENTITY HARVESTER
  // =========================================================================
  harvestUnregisteredEntities(text: string, existingLore: LoreEntity[] = []): DiscoveredEntity[] {
    if (!text || text.trim().length < 40) return [];

    const existingNames = new Set(existingLore.map(e => e.name.toLowerCase().trim()));
    const discovered: DiscoveredEntity[] = [];
    const seenInBatch = new Set<string>();

    const charRegex = /\b(Doctor|Dr\.|Detective|Captain|Commander|Inspector|Lord|Lady|Master|Professor|Officer|Navigator|Pilot|Archivist|Agent|Archmage)\s+([A-Z][a-z]{2,15})\b/g;
    let match: RegExpExecArray | null;
    while ((match = charRegex.exec(text)) !== null) {
      const fullTitle = `${match[1]} ${match[2]}`;
      const nameKey = fullTitle.toLowerCase();
      if (!existingNames.has(nameKey) && !seenInBatch.has(nameKey)) {
        seenInBatch.add(nameKey);
        discovered.push({
          name: fullTitle,
          category: 'CHARACTER',
          description: `Discovered character introduced in recent prose.`,
          traits: [match[1], 'Active Character']
        });
      }
    }

    const locRegex = /\b(?:in|at|toward|inside|outside|beyond|within)\s+(?:the\s+)?([A-Z][a-z]{2,15}\s+(?:District|Sector|Spire|Tower|Manor|Citadel|Vault|Corridor|Station|Alley|Precinct|Chamber|Bridge|Quarters|Plaza|Shop|Bakery))\b/g;
    while ((match = locRegex.exec(text)) !== null) {
      const locName = match[1];
      const locKey = locName.toLowerCase();
      if (!existingNames.has(locKey) && !seenInBatch.has(locKey)) {
        seenInBatch.add(locKey);
        discovered.push({
          name: locName,
          category: 'LOCATION',
          description: `Key location or theater of action identified in recent events.`,
          traits: ['Setting', 'Key Location']
        });
      }
    }

    const factionRegex = /\b(The\s+[A-Z][a-z]{2,15}\s+(?:Syndicate|Directorate|Order|Guild|Enforcers|Guard|Council|Assembly|Federation|Alliance))\b/g;
    while ((match = factionRegex.exec(text)) !== null) {
      const facName = match[1];
      const facKey = facName.toLowerCase();
      if (!existingNames.has(facKey) && !seenInBatch.has(facKey)) {
        seenInBatch.add(facKey);
        discovered.push({
          name: facName,
          category: 'FACTION',
          description: `Organized faction or authority influencing the narrative arc.`,
          traits: ['Authority', 'Faction']
        });
      }
    }

    return discovered.slice(0, 6);
  }

  // =========================================================================
  // 🧠 LORE EXTRACTION FOR LORE BIBLE MODAL
  // =========================================================================
  async extractLoreEntities(
    prose: string,
    genre = 'Fiction',
    tone = 'Dramatic'
  ): Promise<LoreEntity[]> {
    const geminiKey = this.getGeminiApiKey();
    const groqKey = this.getGroqApiKey();
    const preferred = this.getPreferredProvider();

    if (preferred === 'GEMINI' && geminiKey) {
      try {
        return await this.callGeminiLoreExtraction(geminiKey, prose, genre, tone);
      } catch (err) {
        console.warn('Gemini lore extraction failed, trying Groq:', err);
      }
    }

    if (preferred === 'GROQ' && groqKey) {
      try {
        return await this.callGroqLoreExtraction(groqKey, prose, genre, tone);
      } catch (err) {
        console.warn('Groq lore extraction failed, falling back to offline:', err);
      }
    }

    if (geminiKey) {
      try {
        return await this.callGeminiLoreExtraction(geminiKey, prose, genre, tone);
      } catch (err) {}
    }
    if (groqKey) {
      try {
        return await this.callGroqLoreExtraction(groqKey, prose, genre, tone);
      } catch (err) {}
    }

    return this.generateOfflineLoreExtraction(prose, genre, tone);
  }

  private async callGeminiLoreExtraction(
    apiKey: string,
    prose: string,
    genre: string,
    tone: string
  ): Promise<LoreEntity[]> {
    const model = this.getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a narrative lore analyst for an interactive story editor.
Analyze the following story seed and extract 2-4 key world lore entities (Characters, Locations, Items, Factions) that anchor the world.
Genre: ${genre}, Tone: ${tone}

Story Seed:
"""
${prose}
"""

Return strictly a JSON array of entities:
[
  {
    "name": "Entity Name",
    "category": "CHARACTER" | "LOCATION" | "ITEM" | "FACTION",
    "description": "2-3 sentences explaining who/what they are and their narrative role",
    "traits": ["Trait 1", "Trait 2", "Trait 3"]
  }
]`;

    const response = await this.providerFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    });

    if (!response.ok) throw new Error(`Gemini status ${response.status}`);
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const list: any[] = JSON.parse(cleanJson);

    return list.map((item: any, idx: number) => ({
      id: `lore-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: String(item.name || 'Unnamed Entity'),
      category: ['CHARACTER', 'LOCATION', 'ITEM', 'FACTION'].includes(item.category) ? item.category : 'CHARACTER',
      description: String(item.description || ''),
      traits: Array.isArray(item.traits) ? item.traits.map(String) : []
    }));
  }

  private async callGroqLoreExtraction(
    apiKey: string,
    prose: string,
    genre: string,
    tone: string
  ): Promise<LoreEntity[]> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const systemPrompt = `You are a narrative lore analyst. Extract 2-5 world lore & character entities from the story seed in JSON format.`;
    const userPrompt = `Genre: ${genre}, Tone: ${tone}\nStory Text:\n"""\n${prose}\n"""\nRespond strictly in JSON array format: [{"name": "Name", "category": "CHARACTER"|"LOCATION"|"ITEM"|"FACTION", "description": "...", "traits": ["..."]}]`;

    const response = await this.providerFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.getGroqModel(),
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) throw new Error(`Groq status ${response.status}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    const list = Array.isArray(parsed) ? parsed : (parsed.entities || []);
    return list.map((item: any, idx: number) => ({
      id: `lore-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: String(item.name || 'Unnamed Entity'),
      category: ['CHARACTER', 'LOCATION', 'ITEM', 'FACTION'].includes(item.category) ? item.category : 'CHARACTER',
      description: String(item.description || ''),
      traits: Array.isArray(item.traits) ? item.traits.map(String) : []
    }));
  }

  // =========================================================================
  // 🧩 PURE STRUCTURAL DYNAMIC GENERATORS (ZERO HARDCODED TROPE STRINGS)
  // =========================================================================
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'The', 'A', 'An', 'There', 'When', 'Then', 'Once', 'Chapter', 'This', 'That', 'These', 'Those',
      'Below', 'Above', 'Across', 'Every', 'With', 'After', 'Before', 'During', 'Under', 'Over', 'From',
      'Into', 'Through', 'Without', 'Suddenly', 'Deep', 'Cold', 'Dark', 'Midnight', 'Ash', 'Neon', 'Rain',
      'Life', 'Sub', 'Orbital', 'Three', 'Seven', 'At', 'In', 'On', 'Of', 'To', 'For', 'And', 'But',
      'Or', 'As', 'If', 'While', 'Although', 'Because', 'Where', 'Why', 'How', 'What', 'Who', 'Whom',
      'Whose', 'Which', 'Meanwhile', 'Inside', 'Outside', 'Nearby', 'Somewhere', 'Nowhere', 'Everywhere',
      'Someone', 'Everyone', 'Nobody', 'Nothing', 'Everything', 'Something', 'His', 'Her', 'Their', 'Its',
      'My', 'Your', 'Our', 'Just', 'Even', 'Already', 'Still', 'Almost', 'Only', 'Both', 'Either', 'Neither',
      'First', 'Second', 'Third', 'Last', 'Next', 'Another', 'Some', 'Many', 'Few', 'All', 'Any'
    ]);
    return stopWords.has(word);
  }

  private extractProtagonistName(chapter: TreeNode, loreBible: LoreEntity[]): string {
    const loreChar = loreBible.find(e => e.category === 'CHARACTER')?.name;
    if (loreChar && loreChar.trim() && loreChar.toLowerCase() !== 'the protagonist') return loreChar.trim();

    const text = (chapter.content || '').trim();
    if (!text) return 'the protagonist';

    const titleNameMatch = text.match(/\b(Captain|Commander|Detective|Doctor|Dr\.|Lord|Lady|Officer|Navigator|Pilot|Archivist|Agent|Master|Professor|Inspector|Archmage)\s+([A-Z][a-z]{2,15})/i);
    if (titleNameMatch && titleNameMatch[2]) {
      return `${titleNameMatch[1]} ${titleNameMatch[2]}`;
    }

    const appositiveMatch = text.match(/\b([A-Z][a-z]{2,15})(?:,\s*(?:who was|the|a|an|standing|looking|observing|seated|hearing|feeling)\b)/i);
    if (appositiveMatch && !this.isStopWord(appositiveMatch[1])) {
      return appositiveMatch[1];
    }

    const words = text.split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-zA-Z]/g, '');
      if (/^[A-Z][a-z]{2,15}$/.test(clean) && !this.isStopWord(clean)) {
        return clean;
      }
    }

    if (text.toLowerCase().includes('captain')) return 'the captain';
    if (text.toLowerCase().includes('detective')) return 'the detective';
    if (text.toLowerCase().includes('shawn')) return 'Shawn';
    return 'the protagonist';
  }

  private generateOfflineLoreExtraction(prose: string, genre: string, tone: string): LoreEntity[] {
    const charName = this.extractProtagonistName({ content: prose } as TreeNode, []);
    const entities: LoreEntity[] = [
      {
        id: `lore-${Date.now()}-1`,
        name: charName.replace(/^the /i, ''),
        category: 'CHARACTER',
        description: `${charName} is at the center of this ${genre} narrative, driving the stakes forward.`,
        traits: [tone, 'Determined', 'Central Focus']
      }
    ];

    const locMatch = prose.match(/\b(?:in|at|toward|inside)\s+(?:the\s+)?([A-Z][a-z]{2,15}\s+(?:District|Sector|Spire|Tower|Manor|Citadel|Vault|Corridor|Station|Alley|Precinct|Chamber|Shop|Bakery|Room|Hall))\b/i);
    if (locMatch && locMatch[1]) {
      entities.push({
        id: `lore-${Date.now()}-2`,
        name: locMatch[1],
        category: 'LOCATION',
        description: `The primary theater of action where key events unfold.`,
        traits: ['Atmospheric', 'Primary Setting']
      });
    }

    return entities;
  }

  private splitIntoSentences(text: string): string[] {
    if (!text) return [];
    return text
      .split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  private computeSentenceSimilarity(s1: string, s2: string): number {
    const w1 = new Set(s1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !this.isStopWord(w)));
    const w2 = new Set(s2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !this.isStopWord(w)));
    if (w1.size === 0 || w2.size === 0) return 0;
    let match = 0;
    w1.forEach(w => { if (w2.has(w)) match++; });
    return match / Math.max(w1.size, w2.size);
  }

  private deduplicateAgainstExisting(candidateText: string, existingContent: string, ancestorTrail: TreeNode[] = []): string {
    const existingSentences = this.splitIntoSentences(existingContent);
    ancestorTrail.forEach(anc => existingSentences.push(...this.splitIntoSentences(anc.content)));

    const candidateParagraphs = candidateText.split(/\n\n+/);
    const resultParagraphs: string[] = [];

    for (const para of candidateParagraphs) {
      const sentences = this.splitIntoSentences(para);
      const kept = sentences.filter(candSentence => {
        return !existingSentences.some(es => this.computeSentenceSimilarity(candSentence, es) >= 0.40);
      });
      if (kept.length > 0) resultParagraphs.push(kept.join(' '));
    }
    return resultParagraphs.join('\n\n');
  }

  private extractKeyNouns(text: string): string[] {
    if (!text) return ['situation', 'objective', 'crossroads'];
    const words = text
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z]/g, '').trim())
      .filter(w => w.length > 3 && !this.isStopWord(w));
    const unique = Array.from(new Set(words));
    return unique.length > 0 ? unique : ['situation', 'objective', 'crossroads'];
  }

  private extractLocationName(chapter: TreeNode, loreBible: LoreEntity[]): string {
    const locEntity = loreBible.find(e => e.category === 'LOCATION');
    if (locEntity && locEntity.name && !locEntity.name.toLowerCase().includes('surrounding')) {
      return locEntity.name;
    }

    const text = (chapter.content || '');
    const match = text.match(/\b(?:in|at|toward|inside|within|through|into)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Sanctuary|Station|Module|Terminal|District|Precinct|Citadel|Spire|Tower|Vault|Corridor|Archive|Sector|Chamber|Manor|Alley|Ruins|Forest|Bridge|Cellar|Bakery|Haven|Outpost|Temple))\b/i);
    if (match && match[1]) {
      return match[1];
    }

    const titleMatch = chapter.title.match(/(?:of|in|at)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (titleMatch && titleMatch[1] && !titleMatch[1].toLowerCase().includes('path')) {
      return `the ${titleMatch[1]}`;
    }

    return 'the sanctuary';
  }

  private generateOfflineFullChapter(
    chapter: TreeNode,
    ancestorTrail: TreeNode[],
    options: ChapterGenerationOptions,
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): { title: string; content: string; wordCount: number } {
    const charName = this.extractProtagonistName(chapter, loreBible);
    const locName = this.extractLocationName(chapter, loreBible);
    const titleLower = chapter.title.toLowerCase();
    const contentLower = chapter.content.toLowerCase();

    const cleanBaseContent = chapter.content.replace(/### Scene [I|V|X]+: [^\n]+/g, '').trim();

    let thematicBeats: string[] = [];

    if (titleLower.includes('secret') || titleLower.includes('discovery') || titleLower.includes('stone') || titleLower.includes('anomaly') || contentLower.includes('anomaly')) {
      // 🔍 DISCOVERY & ANOMALY ARC
      thematicBeats = [
        `${charName} approached the focal point with deliberate care, examining the subtle carvings and energetic resonance in ${locName}. Every marking seemed intentionally placed, concealing an intricate mechanism that had remained undisturbed for ages.`,
        `"There's more to this than meets the eye," ${charName} muttered, tracing a gloved hand along the ancient surface. With a faint click and a soft hum of power, the structure responded to ${charName}'s touch, revealing a hidden compartment etched into the core.`,
        `The revelation inside reframed the entire conflict: what had appeared to be a random sequence of events was in fact a deliberate design. Deciphering the symbols, ${charName} realized that the stakes were far higher than anyone had anticipated.`,
        `A sudden pulse of energy surged outward from the discovery, echoing through ${locName} and activating dormant ward systems in the distance. Time was suddenly running short.`,
        `Committing the newly uncovered knowledge to memory, ${charName} prepared for the inevitable response from rival factions, knowing that possession of this secret made them a prime target.`
      ];
    } else if (titleLower.includes('infiltrat') || titleLower.includes('covert') || titleLower.includes('shadow') || titleLower.includes('stealth') || contentLower.includes('slipped')) {
      // 🥷 STEALTH & INFILTRATION ARC
      thematicBeats = [
        `Moving low beneath the shadows, ${charName} advanced along the outer edge of ${locName}, timing every step between the automated security sweeps. The darkness offered just enough cover to mask their approach.`,
        `A patrol crossed the corridor ahead, their footfalls echoing against the stone. ${charName} held breath and pressed flat against the wall, remaining completely motionless until the danger passed into the adjacent sector.`,
        `Reaching the primary access threshold, ${charName} bypassed the secondary security lock with practiced speed. The heavy portal slid open with barely a whisper, granting entry to the restricted inner sector.`,
        `Inside, the layout of ${locName} unfolded in intricate detail, exposing key operational pathways and undefended vantage points. ${charName} moved swiftly to secure a commanding tactical position.`,
        `With the infiltration successfully executed, ${charName} established a secure foothold, ready to initiate the next phase of the operation from deep within enemy territory.`
      ];
    } else if (titleLower.includes('confront') || titleLower.includes('action') || titleLower.includes('breach') || titleLower.includes('strike') || contentLower.includes('decisive')) {
      // ⚔️ ACTION & CONFRONTATION ARC
      thematicBeats = [
        `Closing the distance with absolute focus, ${charName} engaged the opposition in ${locName}, seizing the initiative before the enemy could establish defensive lines.`,
        `"Not another step," ${charName} warned, delivering a rapid series of tactical counters that forced the forward vanguard to yield ground. The clash of forces reverberated across the perimeter.`,
        `A sudden flanking maneuver from the opposition threatened to turn the tide, but ${charName} anticipated the strike, executing a swift defensive pivot to deflect the incoming threat.`,
        `Pressing the advantage with unwavering resolve, ${charName} shattered the remaining barrier, driving the hostile force back into full retreat.`,
        `As the immediate skirmish subsided, ${charName} secured the perimeter of ${locName}, weapons ready as the dust settled over the battlefield.`
      ];
    } else {
      // 🏛️ BALANCED NARRATIVE ARC
      thematicBeats = [
        `The atmosphere in ${locName} grew heavy with tension as ${charName} stepped forward to assess the emerging developments. Every detail in the surroundings pointed toward a rapidly shifting balance of power.`,
        `"We stay focused on the objective," ${charName} said in a calm, resolute tone, navigating the path ahead with measured determination.`,
        `An unexpected complication surfaced as new signs of activity appeared along the perimeter, challenging ${charName}'s original approach and demanding an immediate tactical adjustment.`,
        `Adapting quickly, ${charName} executed a bold maneuver that restored control and opened a clear route forward through ${locName}.`,
        `With the immediate hurdle overcome, ${charName} paused to take stock of recent progress, aware that the path ahead would demand even greater vigilance.`
      ];
    }

    const candidateProse = thematicBeats.join('\n\n');
    let novelText = this.deduplicateAgainstExisting(candidateProse, cleanBaseContent, ancestorTrail);

    if (!novelText || novelText.trim().length < 50) {
      const downstreamBeats = [
        `Securing the position within ${locName}, ${charName} conducted a thorough survey to ensure no residual threats remained in the sector.\n\n"Hold the line and verify our egress routes," ${charName} instructed.`,
        `A secondary lead developed deeper within ${locName}, pointing the way toward the next critical objective.\n\nWith clear resolve, ${charName} pressed forward into the next stage of the journey.`
      ];
      const selectedDownstream = downstreamBeats[this.fullChapterExpansionCounter++ % downstreamBeats.length];
      novelText = this.deduplicateAgainstExisting(selectedDownstream, cleanBaseContent, ancestorTrail) || selectedDownstream;
    }

    const expanded = `${cleanBaseContent}\n\n${novelText}`.trim();
    const wordCount = expanded.split(/\s+/).filter(Boolean).length;
    return { title: chapter.title, content: expanded, wordCount };
  }

  private fullChapterExpansionCounter = 0;

  private generateDynamicOfflineParagraph(
    chapter: TreeNode,
    ancestorTrail: TreeNode[],
    loreBible: LoreEntity[],
    styleConfig?: StoryStyleConfig
  ): string {
    const charName = this.extractProtagonistName(chapter, loreBible);
    const locName = this.extractLocationName(chapter, loreBible);

    const candidateParagraphs = [
      `${charName} surveyed the shifting shadows across ${locName}, conscious that every passing second narrowed the margin for error. A faint disturbance in the air signaled that the immediate situation was rapidly evolving. Keeping low and maintaining sharp focus, ${charName} moved to counter the emerging threat before control could slip away.`,
      `A sudden quiet settled over ${locName}, heavy with anticipation. ${charName} paused, analyzing the terrain for any tactical advantage. "We keep moving," ${charName} muttered under their breath, setting the next phase into motion with unwavering resolve.`,
      `The unresolved tension in ${locName} demanded immediate action. Taking a steadying breath, ${charName} stepped forward into the unfolding scene, determined to seize the initiative and uncover the truth.`
    ];

    const c = this.offlineParagraphIndex++;
    const selectedPara = candidateParagraphs[c % candidateParagraphs.length];
    return this.deduplicateAgainstExisting(selectedPara, chapter.content, ancestorTrail) || selectedPara;
  }

  private generateDynamicOfflineBranches(
    chapter: TreeNode,
    ancestorTrail: TreeNode[],
    existingChildren: TreeNode[] = [],
    loreBible: LoreEntity[] = [],
    styleConfig?: StoryStyleConfig
  ): AIBranchSuggestion[] {
    const charName = this.extractProtagonistName(chapter, loreBible);
    const locName = this.extractLocationName(chapter, loreBible);
    const genre = styleConfig?.genre || 'Fiction';
    const tone = styleConfig?.tone || 'Dramatic';
    const depth = chapter.depth || 0;
    const nouns = this.extractKeyNouns(chapter.content);
    const noun1 = nouns[0] || 'Perimeter';
    const noun2 = nouns[1] || (nouns.length > 2 ? nouns[2] : 'Signal');
    const noun3 = nouns[2] || 'Archive';

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const n1 = capitalize(noun1);
    const n2 = capitalize(noun2);
    const n3 = capitalize(noun3);

    // Build forbidden normalized titles (current chapter, ancestors, existing siblings)
    const normalizeTitle = (t: string) => t.toLowerCase().replace(/^path [a-z]:\s*/i, '').trim();
    const forbiddenTitles = new Set<string>();
    forbiddenTitles.add(normalizeTitle(chapter.title));
    ancestorTrail.forEach(anc => forbiddenTitles.add(normalizeTitle(anc.title)));
    existingChildren.forEach(child => forbiddenTitles.add(normalizeTitle(child.title)));

    // Purely dynamic branch candidates synthesized directly from the active scene's nouns, characters, and setting
    const dynamicCandidatePool: AIBranchSuggestion[] = [
      {
        title: `Confronting the ${n1}`,
        content: `${charName} pushed forward decisively across ${locName}, taking the initiative to address the ${noun1.toLowerCase()} before adversary forces could organize a response.`,
        persona: 'Action & Escalation',
        coherenceScore: 95,
        rationale: `Directly escalates the confrontation around the ${noun1.toLowerCase()}.`
      },
      {
        title: `The Secret of the ${n2}`,
        content: `A closer inspection of ${locName} revealed an unexpected anomaly regarding the ${noun2.toLowerCase()}, uncovering a hidden truth that completely altered ${charName}'s understanding of the conflict.`,
        persona: 'Plot Twist & Subversion',
        coherenceScore: 97,
        rationale: `Subverts expectations with a surprise revelation about the ${noun2.toLowerCase()}.`
      },
      {
        title: `Investigating the ${n3}`,
        content: `${charName} stepped back to analyze the underlying patterns in ${locName}, methodically isolating key clues from the ${noun3.toLowerCase()} to secure a strategic advantage.`,
        persona: 'Intrigue & Investigation',
        coherenceScore: 94,
        rationale: `Methodical deduction and tactical inquiry into the ${noun3.toLowerCase()}.`
      },
      {
        title: `Covert Infiltration of ${locName}`,
        content: `${charName} slipped quietly past the outer boundaries of ${locName}, evading direct detection to gain an advantageous vantage point.`,
        persona: 'Stealth & Infiltration',
        coherenceScore: 93,
        rationale: `Employs stealth and tactical maneuvering within ${locName}.`
      },
      {
        title: `The High-Stakes Gamble`,
        content: `Faced with escalating risks, ${charName} executed a bold gambit regarding the ${noun1.toLowerCase()}, pushing the conflict into uncharted territory.`,
        persona: 'High-Stakes Drama',
        coherenceScore: 96,
        rationale: `Pushes narrative stakes to the limit.`
      }
    ];

    // Filter out forbidden or highly similar titles/contents
    const novelCandidates = dynamicCandidatePool.filter(candidate => {
      const candNorm = normalizeTitle(candidate.title);
      const hasTitleCollision = Array.from(forbiddenTitles).some(ft => {
        return candNorm === ft || this.computeSentenceSimilarity(candNorm, ft) >= 0.40;
      });
      if (hasTitleCollision) return false;

      const contentSim = this.computeSentenceSimilarity(candidate.content, chapter.content);
      if (contentSim >= 0.35) return false;

      return true;
    });

    // If fewer than 3 novel candidates remain, dynamically create fresh variants with salt
    let finalSelection = novelCandidates;
    if (finalSelection.length < 3) {
      const dynamicFallbacks: AIBranchSuggestion[] = [
        {
          title: `Pursuit Beyond ${locName}`,
          content: `${charName} followed the fresh trail leading outward from ${locName}, determined to uncover where the next phase would lead.`,
          persona: 'Action & Escalation',
          coherenceScore: 94,
          rationale: 'Continues the active chase beyond current boundaries.'
        },
        {
          title: `The Hidden Motive Revealed`,
          content: `An unexpected transmission intercepted in ${locName} revealed that earlier events were part of a larger, undisclosed agenda.`,
          persona: 'Plot Twist & Subversion',
          coherenceScore: 95,
          rationale: 'Introduces a deep twist in character motivations.'
        },
        {
          title: `Forensic Deduction at ${locName}`,
          content: `${charName} conducted a rapid analysis of the scene, piecing together crucial evidence before any trail could grow cold.`,
          persona: 'Intrigue & Investigation',
          coherenceScore: 93,
          rationale: 'Gathers investigative clues to maintain narrative momentum.'
        }
      ];

      for (const fallback of dynamicFallbacks) {
        if (finalSelection.length >= 3) break;
        const norm = normalizeTitle(fallback.title);
        if (!forbiddenTitles.has(norm)) {
          finalSelection.push(fallback);
          forbiddenTitles.add(norm);
        }
      }
    }

    const selected = finalSelection.slice(0, 3);

    // Compute used letters from existing children to continue alphabetical sequence
    const usedLetters = new Set(
      existingChildren.map(child => {
        const match = child.title.match(/^Path ([A-Z]):/i);
        return match ? match[1].toUpperCase() : null;
      }).filter(Boolean)
    );

    let nextLetterIdx = 0;
    while (usedLetters.has(String.fromCharCode(65 + nextLetterIdx)) && nextLetterIdx < 26) {
      nextLetterIdx++;
    }

    return selected.map((item, idx) => {
      let letterIdx = nextLetterIdx + idx;
      while (usedLetters.has(String.fromCharCode(65 + letterIdx)) && letterIdx < 26) {
        letterIdx++;
      }
      const letter = String.fromCharCode(65 + letterIdx);
      const cleanTitle = item.title.replace(/^Path [A-Z]:\s*/i, '');
      return {
        ...item,
        title: `Path ${letter}: ${cleanTitle}`
      };
    });
  }

  async generateThematicOpeningHook(options: {
    title?: string;
    genre: StoryStyleConfig['genre'];
    tone?: StoryStyleConfig['tone'];
    pacing?: StoryStyleConfig['pacing'];
  }): Promise<string> {
    const genre = options.genre || 'Cyberpunk';
    const tone = options.tone || 'Gritty & Dark';
    const title = options.title?.trim();

    return `The first chapter of "${title || 'The Journey'}" begins as the immediate conflict of this ${genre.toLowerCase()} tale takes hold under a ${tone.toLowerCase()} atmosphere.`;
  }
}

