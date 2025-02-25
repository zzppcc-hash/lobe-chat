import { StateCreator } from 'zustand/vanilla';

import { searchService } from '@/services/search';
import { chatSelectors } from '@/store/chat/selectors';
import { ChatStore } from '@/store/chat/store';
import { CreateMessageParams } from '@/types/message';
import {
  SEARCH_SEARXNG_NOT_CONFIG,
  SearchContent,
  SearchQuery,
  SearchResponse,
} from '@/types/tool/search';
import { nanoid } from '@/utils/uuid';

export interface SearchAction {
  /**
   * 重新发起搜索
   * @description 会更新插件的 arguments 参数，然后再次搜索
   */
  reSearchWithSearXNG: (
    id: string,
    data: SearchQuery,
    options?: { aiSummary: boolean },
  ) => Promise<void>;
  saveSearXNGSearchResult: (id: string) => Promise<void>;
  searchWithSearXNG: (
    id: string,
    data: SearchQuery,
    aiSummary?: boolean,
  ) => Promise<void | boolean>;
  toggleSearchLoading: (id: string, loading: boolean) => void;
}

export const searchSlice: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  SearchAction
> = (set, get) => ({
  reSearchWithSearXNG: async (id, data, options) => {
    get().toggleSearchLoading(id, true);
    await get().updatePluginArguments(id, data);

    await get().searchWithSearXNG(id, data, options?.aiSummary);
  },
  saveSearXNGSearchResult: async (id) => {
    const message = chatSelectors.getMessageById(id)(get());
    if (!message || !message.plugin) return;

    const { internal_addToolToAssistantMessage, internal_createMessage, openToolUI } = get();
    // 1. 创建一个新的 tool call message
    const newToolCallId = `tool_call_${nanoid()}`;

    const toolMessage: CreateMessageParams = {
      content: message.content,
      id: undefined,
      parentId: message.parentId,
      plugin: message.plugin,
      pluginState: message.pluginState,
      role: 'tool',
      sessionId: get().activeId,
      tool_call_id: newToolCallId,
      topicId: get().activeTopicId,
    };

    const addToolItem = async () => {
      if (!message.parentId || !message.plugin) return;

      await internal_addToolToAssistantMessage(message.parentId, {
        id: newToolCallId,
        ...message.plugin,
      });
    };

    const [newMessageId] = await Promise.all([
      // 1. 添加 tool message
      internal_createMessage(toolMessage),
      // 2. 将这条 tool call message 插入到 ai 消息的 tools 中
      addToolItem(),
    ]);

    // 将新创建的 tool message 激活
    openToolUI(newMessageId, message.plugin.identifier);
  },
  searchWithSearXNG: async (id, params, aiSummary = true) => {
    get().toggleSearchLoading(id, true);
    let data: SearchResponse | undefined;
    try {
      data = await searchService.search(params.query, params.searchEngines);

      // 如果没有搜索到结果，那么尝试使用默认的搜索引擎再搜一次
      if (data?.results.length === 0 && params.searchEngines && params.searchEngines?.length > 0) {
        data = await searchService.search(params.query);
        get().updatePluginArguments(id, { ...params, searchEngines: undefined });
      }

      await get().updatePluginState(id, data);
    } catch (e) {
      if ((e as Error).message === SEARCH_SEARXNG_NOT_CONFIG) {
        await get().internal_updateMessagePluginError(id, {
          body: {
            provider: 'searxng',
          },
          message: 'SearXNG is not configured',
          type: 'PluginSettingsInvalid',
        });
      } else {
        await get().internal_updateMessagePluginError(id, {
          body: e,
          message: (e as Error).message,
          type: 'PluginServerError',
        });
      }
    }

    get().toggleSearchLoading(id, false);

    if (!data) return;

    // add 15 search results to message content
    const searchContent: SearchContent[] = data.results.slice(0, 15).map((item) => ({
      content: item.content,
      title: item.title,
      url: item.url,
    }));

    await get().internal_updateMessageContent(id, JSON.stringify(searchContent));

    // 如果没搜索到结果，那么不触发 ai 总结
    if (searchContent.length === 0) return;

    // 如果 aiSummary 为 true，则会自动触发总结
    return aiSummary;
  },

  toggleSearchLoading: (id, loading) => {
    set(
      { searchLoading: { ...get().searchLoading, [id]: loading } },
      false,
      `toggleSearchLoading/${loading ? 'start' : 'end'}`,
    );
  },
});
