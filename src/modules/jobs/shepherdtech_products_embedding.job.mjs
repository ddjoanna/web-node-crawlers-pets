import Product from "../models/mongo/product.model.mjs";
import redis from "../components/redis.component.mjs";
import mongoDb from "../components/mongodb.component.mjs";
import ai from "../services/ai.service.mjs";
import esClient from "../components/elasticsearch.component.mjs";

class GenerateProductEmbeddings {
  async execute() {
    try {
      console.log("🚀 開始產生商品向量...");

      // 從 MongoDB 中取得所有商品
      const brandNames = ["dogcatstar", "litomon", "heromamapet", "ladynpet"];
      const products = await Product.find({
        brand: { $in: brandNames },
      });
      console.log(`✅ 共撈取 ${products.length} 筆商品`);
      // 迴圈處理每個商品
      for (const product of products) {
        // 組合 prompt 字串
        const prompt = [
          `商品名稱：${product.name}`,
          `分類：${product.category}`,
          `描述：${product.description}`,
          `標籤：${(product.tags || []).join(", ")}`,
          `用途：${(product.purpose || []).join(", ")}`,
          `口味：${(product.flavor || []).join(", ")}`,
          `形態：${(product.form || []).join(", ")}`,
          `物種：${(product.species || []).join(", ")}`,
        ].join("\n");

        const cacheKey = this.getCacheKey(product._id);
        let embeddings = await this.getCachedEmbeddings(cacheKey);

        try {
          if (!embeddings) {
            embeddings = await ai.generateEmbeddings(prompt, 1536, 3);
          }

          console.log(`✅ 商品 ${product.name} 的向量：`, embeddings);
          await this.setCachedEmbeddings(cacheKey, embeddings);
        } catch (error) {
          console.error(
            `❌ 生成商品 ${product.name} 向量失敗：${error.message}`
          );
        }

        // 寫入Elasticsearch
        await this.createEsDocument(product, embeddings);
      }
    } catch (error) {
      console.error(`❌ 執行失敗：${error.message}`);
    }
  }

  getCacheKey(productId) {
    return `product:embedding:${productId}`;
  }

  async getCachedEmbeddings(cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`❌ 從 Redis 讀取快取失敗: ${error.message}`);
      return null;
    }
  }

  async setCachedEmbeddings(cacheKey, embeddings) {
    try {
      const expirySeconds = 60 * 60 * 24 * 7; // 7 天过期时间
      const success = await redis.setNx(
        cacheKey,
        JSON.stringify(embeddings),
        expirySeconds
      );

      if (!success) {
        await redis.expire(cacheKey, expirySeconds);
      }
    } catch (error) {
      console.error(`❌ 寫入 Redis 快取失敗: ${error.message}`);
    }
  }

  async createEsDocument(product, embeddings) {
    await esClient.indexDocument("products", product._id.toString(), {
      brand: product.brand,
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      tags: product.tags,
      purpose: product.purpose,
      flavor: product.flavor,
      form: product.form,
      species: product.species,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      url: product.url,
      image: product.image,
      vector: embeddings, // 直接存 embeddings 向量
    });
    console.log(`✅ 已寫入商品 ${product.name} 至 Elasticsearch`);
  }
}

(async () => {
  try {
    console.log("🚀 連接 MongoDB...");
    await mongoDb.connect();
    console.log("✅ MongoDB 連接成功");

    console.log("🚀 連接 Redis...");
    await redis.connect();
    console.log("✅ Redis 連接成功");

    console.log("🚀 連接 Elasticsearch...");
    await esClient.ping();
    console.log("✅ Elasticsearch 連接成功");

    const job = new GenerateProductEmbeddings();
    await job.execute();
    console.log("✅ 商品特徵萃取完成");
    process.exit(0);
  } catch (error) {
    console.error(`❌ 執行失敗：${error.message}`);
    process.exit(1);
  }
})();
