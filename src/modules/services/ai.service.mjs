import retryRequest from "../utils/retry.util.mjs";
import gemini_ai from "../components/google_gen_ai.component.mjs";
import open_ai from "../components/open_ai.component.mjs";
import config from "../config/index.mjs";

const provider = config.AI.provider;

class AiService {
  constructor() {
    this.service = provider === "gemini" ? gemini_ai : open_ai;
  }

  async generateContent(prompt, retry = 1) {
    return retryRequest(async () => {
      return await this.service.generateContent(prompt);
    }, retry);
  }

  async generateEmbeddings(prompt, dims = 1536, retry = 1) {
    const vector = await retryRequest(async () => {
      return await this.service.generateEmbeddings(prompt);
    }, retry);

    return this.fixVectorDim(vector, dims);
  }

  // 依據OpenAI模型向量長度設定ElasticSearch欄位；ES向量尺寸固定，所以小於1536補0，大於1536則截取
  fixVectorDim(vector, dims) {
    if (!Array.isArray(vector)) return Array(dims).fill(0);
    if (vector.length > dims) return vector.slice(0, dims);
    if (vector.length < dims)
      return vector.concat(Array(dims - vector.length).fill(0));
    return vector;
  }
}

export default new AiService();
