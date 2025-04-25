import { Client } from "@elastic/elasticsearch";
import config from "../src/modules/config/index.mjs";

const { ELASTICSEARCH } = config;

const esClient = new Client({ node: "http://localhost:9200" });

async function initIndex(indexName, aliasName) {
  // 1. 檢查索引是否存在
  const exists = await esClient.indices.exists({ index: indexName });
  if (exists) {
    console.log(`Index ${indexName} already exists.`);
  } else {
    // 2. 建立索引並設定 mapping 和 settings
    await esClient.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              custom_ik_max_word: {
                type: "custom",
                tokenizer: "ik_max_word",
                filter: ["stopword_filter", "extra_stopword_filter"],
              },
              custom_ik_smart: {
                type: "custom",
                tokenizer: "ik_smart",
                filter: ["stopword_filter", "extra_stopword_filter"],
              },
            },
            filter: {
              stopword_filter: {
                type: "stop",
                stopwords: ["的", "了", "和", "是"],
              },
              extra_stopword_filter: {
                type: "stop",
                stopwords: ["某些", "其他"],
              },
            },
          },
        },
        mappings: {
          properties: {
            brand: { type: "keyword" },
            id: { type: "keyword" },
            name: {
              type: "text",
              analyzer: "custom_ik_max_word",
              search_analyzer: "custom_ik_smart",
            },
            description: {
              type: "text",
              analyzer: "custom_ik_max_word",
              search_analyzer: "custom_ik_smart",
            },
            category: { type: "keyword" },
            tags: { type: "keyword" },
            purpose: { type: "keyword" },
            flavor: { type: "keyword" },
            form: { type: "keyword" },
            species: { type: "keyword" },
            createdAt: { type: "date" },
            updatedAt: { type: "date" },
            url: { type: "keyword" },
            image: { type: "keyword" },
            vector: {
              type: "dense_vector",
              dims: ELASTICSEARCH.products_vector_dim,
            },
          },
        },
      },
    });
    console.log(`Index ${indexName} created.`);
  }

  // 3. 建立或更新 alias 指向該索引
  const aliasExists = await esClient.indices.existsAlias({ name: aliasName });
  if (aliasExists.body) {
    const aliasInfo = await esClient.indices.getAlias({ name: aliasName });
    const oldIndices = Object.keys(aliasInfo.body);
    for (const oldIndex of oldIndices) {
      await esClient.indices.deleteAlias({ index: oldIndex, name: aliasName });
      console.log(`Removed alias ${aliasName} from index ${oldIndex}`);
    }
  }

  await esClient.indices.putAlias({ index: indexName, name: aliasName });
  console.log(`Alias ${aliasName} now points to index ${indexName}`);
}

function formatDateYYMMDD(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

(async () => {
  try {
    const date = new Date();
    const indexName = `products_v${formatDateYYMMDD(date)}`;
    await initIndex(indexName, "products");
  } catch (error) {
    console.error("Error initializing index:", error);
  }
})();
