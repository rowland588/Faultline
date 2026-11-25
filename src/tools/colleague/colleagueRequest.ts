import {
  CHAT_FAST_NOTE, cacheMark, colleagueFastChat, colleagueMessages, colleagueRoom,
  colleagueSystemFor, colleagueSystemMode, colleagueToolsFor, colleagueToolsMode,
  type CapabilitySchema, type ColleagueAsk,
} from './colleagueAssist';

export function lunaModelSettings(get: (name: string) => string | undefined, defaultEffort: 'low' | 'high' = 'low') {
  return {
    work: get('ASSIST_COLLEAGUE_MODEL') || 'claude-opus-5-5',
    social: get('ASSIST_COLLEAGUE_SOCIAL_MODEL') || 'claude-haiku-5-5',
    effort: get('ASSIST_COLLEAGUE_EFFORT') || defaultEffort,
    maxTokens: colleagueRoom(get('ASSIST_COLLEAGUE_MAX_TOKENS')),
    tools: colleagueToolsMode(get('ASSIST_COLLEAGUE_TOOLS')),
    rules: colleagueSystemMode(get('ASSIST_COLLEAGUE_SYSTEM')),
    cache: get('ASSIST_COLLEAGUE_CACHE_TTL') === '5m' ? {} : { ttl: '1h' as const },
  };
}

const socialSystem = 'You are Luna, the AI colleague in Faultline. ' + CHAT_FAST_NOTE
  + ' Reply to the greeting or acknowledgement in the language the person used. Never claim to have looked up data, taken action or seen local conditions.';

export function lunaClaudeRequest(ask: ColleagueAsk, schemas: readonly CapabilitySchema[], settings: ReturnType<typeof lunaModelSettings>, evaluation = false) {
  const fast = colleagueFastChat(ask);
  const latest = ask.turns[ask.turns.length - 1]?.text.trim() || '';
  // Only literal greetings and acknowledgements are independent of the work already in the conversation.
  if (fast && /^(?:hi|hello|hey|hiya|good morning|good afternoon|good evening|morning|afternoon|evening|thanks|thank you|cheers|bye|goodbye)(?:,?\s+luna)?[.!?\s]*$/i.test(latest)) {
    const messages = [{ role: 'user' as const, content: latest }];
    return { fast, model: settings.social, effort: 'low', cacheTTL: null, params: {
      model: settings.social, max_tokens: 256, output_config: { effort: 'low' },
      system: socialSystem, messages,
    } };
  }

  const model = settings.work;
  const tools = fast ? [] : colleagueToolsFor(schemas, settings.tools, settings.cache);
  const params = {
    model, max_tokens: settings.maxTokens, output_config: { effort: settings.effort },
    ...(model.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
    system: [{ type: 'text' as const, text: colleagueSystemFor(settings.tools, settings.rules), cache_control: cacheMark(settings.cache) }],
    // The tools and rules can be reused across exams. Each throwaway browser's unique history only needs to live between its rounds.
    messages: colleagueMessages(ask, evaluation ? {} : settings.cache, { fastChat: fast }),
    ...(tools.length ? { tools, tool_choice: { type: 'auto' as const } } : {}),
  };
  return { fast, model, effort: settings.effort, cacheTTL: settings.cache.ttl || '5m', params };
}
