import OpenAI from 'openai';
import { configManager } from './configManager.js';

export const createClient = () => {
  const { api } = configManager.getConfig();
  return new OpenAI({
    baseURL: api.baseUrl,
    apiKey: api.apiKey,
  });
};