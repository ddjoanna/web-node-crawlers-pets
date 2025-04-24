import axios from "axios";
import config from "../config/index.mjs";

const { AI } = config;

const OPENAI_API_KEY = AI.openAiKey;
const OPENAI_GENERATE_CONTENT_MODEL = AI.openAiContentModel;
const OPENAI_API_GENERATE_EMBEDDINGS_MODEL = AI.geminiAiEmbeddingsModel;

class OpenAI {
  constructor() {
    this.maxRetries = 3; // 最大重試次數
    this.initialDelay = 1000; // 初始延遲（毫秒）
  }

  async generateContent(prompt) {
    return this.retryRequest(async () => {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: OPENAI_GENERATE_CONTENT_MODEL,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        return response.data.choices[0].message.content;
      } catch (error) {
        throw error;
      }
    });
  }

  async generateEmbeddings(prompt) {
    return this.retryRequest(async () => {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/embeddings",
          {
            model: OPENAI_API_GENERATE_EMBEDDINGS_MODEL,
            input: prompt,
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        return response.data.data[0].embedding;
      } catch (error) {
        throw error;
      }
    });
  }

  async retryRequest(fn, retries = this.maxRetries, delay = this.initialDelay) {
    try {
      return await fn();
    } catch (error) {
      const statusCode = error.response?.status;

      console.error(`OpenAI API 失敗：${error.message}`);

      // 判斷是否為非重試性錯誤（4xx 且非 429）
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        throw error;
      }

      // 如果是速率限制（429）或伺服器錯誤（5xx），則進行重試
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryRequest(fn, retries - 1, delay);
      } else {
        throw error;
      }
    }
  }
}

export default new OpenAI();
