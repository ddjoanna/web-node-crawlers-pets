import { Client } from "@elastic/elasticsearch";
import config from "../config/index.mjs";

const { ELASTICSEARCH } = config;

class ElasticsearchComponent {
  constructor() {
    this.client = new Client({
      node: ELASTICSEARCH.url || "http://localhost:9200",
    });
  }

  async ping() {
    try {
      await this.client.ping();
      console.log("✅ Elasticsearch cluster is up!");
      return true;
    } catch (error) {
      console.error("❌ Elasticsearch cluster is down!", error);
      return false;
    }
  }

  // 創建索引
  async createIndex(indexName, settings = {}, mappings = {}) {
    const exists = await this.client.indices.exists({ index: indexName });
    if (exists.body) {
      console.log(`索引 ${indexName} 已存在`);
      return;
    }
    await this.client.indices.create({
      index: indexName,
      body: {
        settings,
        mappings,
      },
    });
    console.log(`✅ 索引 ${indexName} 创建成功`);
  }

  // 寫入或更新文檔
  async indexDocument(indexName, id, document) {
    return this.client.index({
      index: indexName,
      id: id.toString(),
      document,
      refresh: "wait_for", // 保證寫入後可立即搜索
    });
  }

  // 批次寫入文檔
  async bulkIndex(indexName, docs) {
    const operations = docs.flatMap((doc) => [
      { index: { _index: indexName, _id: doc.id.toString() } },
      doc,
    ]);
    const result = await this.client.bulk({
      refresh: "wait_for",
      operations,
    });
    if (result.body.errors) {
      console.error("批量寫入時發生錯誤", result.body.items);
      throw new Error("批量寫入時發生錯誤");
    }
    return result;
  }

  // 簡單搜索
  async search(indexName, query, options = {}) {
    return this.client.search({
      index: indexName,
      body: {
        query,
        ...options,
      },
    });
  }
}

export default new ElasticsearchComponent();
