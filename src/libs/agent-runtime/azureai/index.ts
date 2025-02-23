import createClient, { ModelClient } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import OpenAI from 'openai';

import { LobeRuntimeAI } from '../BaseAI';
import { AgentRuntimeErrorType } from '../error';
import { ChatCompetitionOptions, ChatStreamPayload, ModelProvider } from '../types';
import { AgentRuntimeError } from '../utils/createError';
import { debugStream } from '../utils/debugStream';
import { transformResponseToStream } from '../utils/openaiCompatibleFactory';
import { StreamingResponse } from '../utils/response';
import { OpenAIStream, createSSEDataExtractor } from '../utils/streams';

export class LobeAzureAI implements LobeRuntimeAI {
  client: ModelClient;

  constructor(params?: { apiKey?: string; apiVersion?: string; baseURL?: string }) {
    if (!params?.apiKey || !params?.baseURL)
      throw AgentRuntimeError.createError(AgentRuntimeErrorType.InvalidProviderAPIKey);

    this.client = createClient(params?.baseURL, new AzureKeyCredential(params?.apiKey));

    this.baseURL = params?.baseURL;
  }

  baseURL: string;

  async chat(payload: ChatStreamPayload, options?: ChatCompetitionOptions) {
    const { messages, model, ...params } = payload;
    // o1 series models on Azure OpenAI does not support streaming currently
    const enableStreaming = model.includes('o1') ? false : (params.stream ?? true);

    // Convert 'system' role to 'user' or 'developer' based on the model
    const systemToUserModels = new Set([
      'o1-preview',
      'o1-preview-2024-09-12',
      'o1-mini',
      'o1-mini-2024-09-12',
    ]);

    const updatedMessages = messages.map((message) => ({
      ...message,
      role:
        (model.includes('o1') || model.includes('o3')) && message.role === 'system'
          ? [...systemToUserModels].some((sub) => model.includes(sub))
            ? 'user'
            : 'developer'
          : message.role,
    }));
    
    try {
      const response = this.client.path('/chat/completions').post({
        body: {
          messages: updatedMessages as OpenAI.ChatCompletionMessageParam[],
          model,
          ...params,
          stream: enableStreaming,
          tool_choice: params.tools ? 'auto' : undefined,
        },
      });

      if (enableStreaming) {
        const stream = await response.asBrowserStream();

        const [prod, debug] = stream.body!.tee();

        if (process.env.DEBUG_AZURE_AI_CHAT_COMPLETION === '1') {
          debugStream(debug).catch(console.error);
        }

        return StreamingResponse(
          OpenAIStream(prod.pipeThrough(createSSEDataExtractor()), {
            callbacks: options?.callback,
          }),
          {
            headers: options?.headers,
          },
        );
      } else {
        const res = await response;

        // the azure AI inference response is openai compatible
        const stream = transformResponseToStream(res.body as OpenAI.ChatCompletion);
        return StreamingResponse(OpenAIStream(stream, { callbacks: options?.callback }), {
          headers: options?.headers,
        });
      }
    } catch (e) {
      let error = e as { [key: string]: any; code: string; message: string };

      if (error.code) {
        switch (error.code) {
          case 'DeploymentNotFound': {
            error = { ...error, deployId: model };
          }
        }
      } else {
        error = {
          cause: error.cause,
          message: error.message,
          name: error.name,
        } as any;
      }

      const errorType = error.code
        ? AgentRuntimeErrorType.ProviderBizError
        : AgentRuntimeErrorType.AgentRuntimeError;

      throw AgentRuntimeError.chat({
        endpoint: this.maskSensitiveUrl(this.baseURL),
        error,
        errorType,
        provider: ModelProvider.Azure,
      });
    }
  }

  private maskSensitiveUrl = (url: string) => {
    // 使用正则表达式匹配 'https://' 后面和 '.azure.com/' 前面的内容
    const regex = /^(https:\/\/)([^.]+)(\.cognitiveservices\.azure\.com\/.*)$/;

    // 使用替换函数
    return url.replace(regex, (match, protocol, subdomain, rest) => {
      // 将子域名替换为 '***'
      return `${protocol}***${rest}`;
    });
  };
}
