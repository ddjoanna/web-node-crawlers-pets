import dotenv from "dotenv";

dotenv.config();

const REDIS = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB,
};

const JWt = {
  secret: process.env.JWT_SECRET,
};

const SNOWFLAKE = {
  machineId: process.env.SNOWFLAKE_MACHINE_ID,
};

const AES = {
  key: process.env.AES_KEY,
  iv: process.env.AES_IV,
};

const MONGO = {
  url: process.env.MONGO_URI,
  timeoutMS: 5000,
  maxPoolSize: 10,
};

const AI = {
  provider: process.env.AI_PROVIDER,
  openAiKey: process.env.OPENAI_API_KEY,
  openAiContentModel: process.env.OPENAI_CONTENT_MODEL || "gpt-4-turbo",
  openAIEmbeddingsModel:
    process.env.OPENAI_EMBEDDINGS_MODEL || "text-embedding-ada-002",
  geminiAiKey: process.env.GEMINI_API_KEY,
  geminiAiContentModel:
    process.env.GEMINI_API_CONTENT_MODEL || "gemini-2.0-flash",
  geminiAiEmbeddingsModel:
    process.env.GEMINI_API_EMBEDDINGS_MODEL || "text-embedding-004",
};

const ELASTICSEARCH = {
  url: process.env.ELASTICSEARCH_URL,
};

export default {
  REDIS,
  JWt,
  SNOWFLAKE,
  AES,
  MONGO,
  AI,
  ELASTICSEARCH,
};
