import type { ChatModelCard } from '@/types/llm';

import { ModelProvider } from '../types';
import { LobeOpenAICompatibleFactory } from '../utils/openaiCompatibleFactory';
import { OpenRouterModelCard, OpenRouterModelExtraInfo } from './type';

const formatPrice = (price: string) => {
  if (price === '-1') return undefined;
  return Number((Number(price) * 1e6).toPrecision(5));
};

export const LobeOpenRouterAI = LobeOpenAICompatibleFactory({
  baseURL: 'https://openrouter.ai/api/v1',
  chatCompletion: {
    handlePayload: (payload) => {
      return {
        ...payload,
        include_reasoning: true,
        model: payload.enabledSearch ? `${payload.model}:online` : payload.model,
        stream: payload.stream ?? true,
      } as any;
    },
  },
  constructorOptions: {
    defaultHeaders: {
      'HTTP-Referer': 'https://chat-preview.lobehub.com',
      'X-Title': 'Lobe Chat',
    },
  },
  debug: {
    chatCompletion: () => process.env.DEBUG_OPENROUTER_CHAT_COMPLETION === '1',
  },
  models: async ({ client }) => {
    const { LOBE_DEFAULT_MODEL_LIST } = await import('@/config/aiModels');

    const reasoningKeywords = [
      'deepseek/deepseek-r1',
      'openai/o1',
      'openai/o3',
      'qwen/qvq',
      'qwen/qwq',
      'thinking',
    ];

    const modelsPage = (await client.models.list()) as any;
    const modelList: OpenRouterModelCard[] = modelsPage.data;

    const response = await fetch('https://openrouter.ai/api/frontend/models');
    const modelsExtraInfo: OpenRouterModelExtraInfo[] = [];
    if (response.ok) {
      const data = await response.json();
      modelsExtraInfo.push(...data['data']);
    }

    return modelList
      .map((model) => {
        const knownModel = LOBE_DEFAULT_MODEL_LIST.find(
          (m) => model.id.toLowerCase() === m.id.toLowerCase(),
        );
        const extraInfo = modelsExtraInfo.find(
          (m) => m.slug.toLowerCase() === model.id.toLowerCase(),
        );

        return {
          contextWindowTokens: model.context_length,
          description: model.description,
          displayName: model.name,
          enabled: knownModel?.enabled || false,
          functionCall:
            model.description.includes('function calling') ||
            model.description.includes('tools') ||
            extraInfo?.endpoint?.supports_tool_parameters ||
            knownModel?.abilities?.functionCall ||
            false,
          id: model.id,
          maxTokens:
            typeof model.top_provider.max_completion_tokens === 'number'
              ? model.top_provider.max_completion_tokens
              : undefined,
          pricing: {
            input: formatPrice(model.pricing.prompt),
            output: formatPrice(model.pricing.completion),
          },
          reasoning:
            reasoningKeywords.some((keyword) => model.id.toLowerCase().includes(keyword)) ||
            extraInfo?.endpoint?.supports_reasoning ||
            knownModel?.abilities?.reasoning ||
            false,
          releasedAt: new Date(model.created * 1000).toISOString().split('T')[0],
          vision:
            model.architecture.modality.includes('image') || knownModel?.abilities?.vision || false,
        };
      })
      .filter(Boolean) as ChatModelCard[];
  },
  provider: ModelProvider.OpenRouter,
});
