import axios from "axios";
import config from "../config/index.mjs";

const { AI } = config;

// 目前免費版gemini-2.0-flash
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/";
const GEMINI_API_KEY = AI.geminiAiKey;
const GEMINI_API_GENERATE_CONTENT_MODEL = AI.geminiAiContentModel;
const GEMINI_API_GENERATE_EMBEDDINGS_MODEL = AI.geminiAiEmbeddingsModel;

class GeminiAi {
  constructor() {
    this.maxRetries = 3; // 最大重試次數
    this.initialDelay = 5000; // 初始延遲（毫秒）
  }

  async generateContent(prompt) {
    return this.retryRequest(async () => {
      try {
        const response = await axios.post(
          `${GEMINI_API_URL}${GEMINI_API_GENERATE_CONTENT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (
          response.data &&
          response.data.candidates &&
          response.data.candidates.length > 0
        ) {
          return response.data.candidates[0].content.parts[0].text;
        } else {
          throw new Error("無效的 Gemini API 回應");
        }
      } catch (error) {
        throw error;
      }
    });
  }

  async generateEmbeddings(prompt) {
    return this.retryRequest(async () => {
      try {
        const response = await axios.post(
          `${GEMINI_API_URL}${GEMINI_API_GENERATE_EMBEDDINGS_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
          {
            model: GEMINI_API_GENERATE_EMBEDDINGS_MODEL,
            content: {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (
          response.data &&
          response.data.embedding &&
          Array.isArray(response.data.embedding.values)
        ) {
          return response.data.embedding.values;
        } else {
          throw new Error("無效的 Gemini API 回應");
        }
      } catch (error) {
        throw error;
      }
    });
  }

  async retryRequest(fn, retries = this.maxRetries, delay = this.initialDelay) {
    try {
      // 嘗試執行函數
      return await fn();
    } catch (error) {
      const statusCode = error.response?.status;
      let retryDelaySeconds;

      console.error(`Gemini AI 失敗：${error.message}`);

      // 判斷是否為非重試性錯誤（4xx 且非 429）
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        throw error;
      }

      // 如果是速率限制（429），則嘗試獲取 retryDelay
      if (statusCode === 429 && error.response.data?.error?.details) {
        const retryInfo = error.response.data.error.details.find(
          (detail) =>
            detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        // 提取秒數
        if (retryInfo?.retryDelay) {
          const match = retryInfo.retryDelay.match(/(\d+)s/);
          if (match) {
            retryDelaySeconds = parseInt(match[1], 10);
          }
        }
      }

      // 如果是速率限制（429）或伺服器錯誤（5xx），則進行重試
      if (retries > 0) {
        const delayMs = retryDelaySeconds ? retryDelaySeconds * 1000 : delay;
        console.log(`等待 ${delayMs / 1000} 秒後重試...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.retryRequest(fn, retries - 1, delay);
      } else {
        throw error;
      }
    }
  }
}

export default new GeminiAi();
