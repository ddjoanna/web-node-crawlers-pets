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

  async generateEmbeddings(prompt, retry = 1) {
    return await retryRequest(async () => {
      return await this.service.generateEmbeddings(prompt);
    }, retry);
  }
}

export default new AiService();
