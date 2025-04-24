import Product from "../models/mongo/product.model.mjs";
import retryRequest from "../utils/retry.util.mjs";
import ai from "../services/ai.service.mjs";
import esClient from "../components/elasticsearch.component.mjs";

class ProductService {
  async getProductsWithFeatures(input) {
    const info = `
      寵物資訊：
        - 物種：${input.species}
        - 品種：${input.breed}
        - 體重：${input.weight}kg
        - 健康狀況：${input.health}
        - 喜好：${input.preferences}
    `;

    let embeddings, features;

    try {
      embeddings = await this.extractedEmbeddings(info);
      features = await this.extractedFeatures(info);

      // 如果 features 是 null 或空物件，視為失敗
      if (!features || Object.keys(features).length === 0) {
        throw new Error("Features is empty");
      }
    } catch (error) {
      console.error(`❌ AI 服務異常，改用 IK 分詞全文檢索: ${error.message}`);

      // 直接用 info 做全文檢索，不用 embeddings 和 features
      const products = await this.searchProductsByText(info);
      return this.transformProducts(products);
    }

    // AI 正常，走向量+特徵推薦
    const products = await this.getRecommandProductWithElasticSearch(
      embeddings,
      features
    );
    return this.transformProducts(products);
  }

  async extractedEmbeddings(info) {
    try {
      return ai.generateEmbeddings(info, 1536);
    } catch (error) {
      console.error(`❌ 生成商品向量失敗：${error.message}`);
    }
  }

  async extractedFeatures(info) {
    try {
      const spec = await this.getProductFeatureSpecs();
      const prompt = `
        你是電商推薦系統的 AI 助手。
        請依據以下寵物資訊，分析其對應的產品推薦特徵，並根據已定義的特徵規範（見下方 spec）篩選推薦商品。
        ${info}
        特徵規範（spec）：
        ${JSON.stringify(spec)}
        請輸出符合這些條件的特徵，用JSON格式輸出
      `;

      return await retryRequest(async () => {
        const response = await ai.generateContent(prompt);
        const jsonString = response.replace(/`|json/gi, "");
        return JSON.parse(jsonString);
      });
    } catch (error) {
      console.error(`❌ AI 生成查詢失敗：${error.message}`);
      return null;
    }
  }

  // 取得特徵規範，將MongoDB所有特徵規範過濾重複後，合併為一個物件spec
  async getProductFeatureSpecs() {
    const fields = [
      "species",
      "age_stage",
      "health_focus",
      "type",
      "tags",
      "flavor",
      "food_texture",
      "purpose",
      "pet_size",
      "dietary_needs",
      "life_stage_function",
      "form",
    ];

    const spec = await Product.aggregate([
      {
        $project: fields.reduce((acc, field) => {
          acc[field] = { $ifNull: [`$${field}`, []] };
          return acc;
        }, {}),
      },
      {
        $group: fields.reduce(
          (acc, field) => {
            acc[`unique_${field}`] = { $addToSet: `$${field}` };
            return acc;
          },
          { _id: null }
        ),
      },
    ]);

    if (!spec.length) return {};

    const result = spec[0];
    const output = {};

    fields.forEach((field) => {
      // flat 展平二維陣列，Set 去重
      output[field] = [...new Set(result[`unique_${field}`].flat())];
    });

    return output;
  }

  async searchProductsByText(text) {
    const query = {
      multi_match: {
        query: text,
        fields: ["name", "description"],
        analyzer: "custom_ik_smart", // 你 mapping 裡的搜尋分析器
      },
    };

    const response = await esClient.search("products", query, {
      size: 10,
    });

    return response.hits?.hits?.map((hit) => hit._source) || [];
  }

  async getRecommandProductWithElasticSearch(embeddings, features) {
    const weights = {
      species: 2,
      age_stage: 3,
      health_focus: 5,
      type: 2,
      tags: 3,
      flavor: 2,
      food_texture: 2,
      purpose: 5,
      pet_size: 1,
      dietary_needs: 2,
      life_stage_function: 2,
      form: 2,
    };

    // 將多個特徵欄位合併成全文檢索字串
    const queryText = Object.values(features)
      .filter((arr) => Array.isArray(arr))
      .flat()
      .join(" ");

    // 將 features 和 weights 傳入 params，方便腳本使用
    const params = {
      query_vector: embeddings,
      features,
      weights,
    };

    const query = {
      script_score: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: queryText,
                  fields: ["name", "description"],
                },
              },
            ],
          },
        },
        script: {
          lang: "painless",
          source: `
            double score = cosineSimilarity(params.query_vector, 'vector') + 1.0;
            Map features = params.features;
            Map weights = params.weights;
  
            for (entry in features.entrySet()) {
              String field = entry.getKey();
              List values = entry.getValue();
  
              if (doc.containsKey(field) && !doc[field].empty) {
                if (doc[field].size() == 1) {
                  // 單值欄位
                  def val = doc[field].value;
                  if (values.contains(val)) {
                    score += weights.containsKey(field) ? weights[field] : 1;
                  }
                } else {
                  // 多值欄位
                  for (val in doc[field]) {
                    if (values.contains(val)) {
                      score += weights.containsKey(field) ? weights[field] : 1;
                      break;
                    }
                  }
                }
              }
            }
            return score;
          `,
          params,
        },
      },
    };

    const response = await esClient.search("products", query, { size: 10 });

    return (
      response.hits?.hits?.map((hit) => ({
        ...hit._source,
        _score: hit._score, // 把分數帶出來
      })) || []
    );
  }

  transformProducts(products) {
    return products.map((product) => ({
      brand: product.brand,
      url: product.url,
      image: product.image,
      name: product.name,
      description: product.description,
    }));
  }
}

export default new ProductService();
