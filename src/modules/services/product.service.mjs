import Product from "../models/mongo/product.model.mjs";
import retryRequest from "../utils/retry.util.mjs";
import ai from "../components/google_gen_ai.component.mjs";

class ProductService {
  /**
   * 推薦商品
   * @param {Object} input - 寵物資料資訊
   * @returns {Promise<Array>} products 商品資料
   */
  async getProductsWithFeatures(input) {
    const spec = await this.getProductFeatureSpecs();
    const query = await this.generatAggregateQueryWithFeatures(spec, input);
    return await this.getProductWithAggregateQuery(query);
  }

  /**
   * 取得特徵規範，將MongoDB所有特徵規範過濾重複後，合併為一個物件spec
   * @returns {Promise<Object>} spec 特徵規範
   */
  async getProductFeatureSpecs() {
    const spec = await Product.aggregate([
      // 對每個欄位進行預設值處理
      {
        $addFields: {
          species: { $ifNull: ["$species", []] },
          age_stage: { $ifNull: ["$age_stage", []] },
          health_focus: { $ifNull: ["$health_focus", []] },
          type: { $ifNull: ["$type", []] },
          tags: { $ifNull: ["$tags", []] },
          flavor: { $ifNull: ["$flavor", []] },
          food_texture: { $ifNull: ["$food_texture", []] },
          purpose: { $ifNull: ["$purpose", []] },
          pet_size: { $ifNull: ["$pet_size", []] },
          dietary_needs: { $ifNull: ["$dietary_needs", []] },
          life_stage_function: { $ifNull: ["$life_stage_function", []] },
          form: { $ifNull: ["$form", []] },
        },
      },
      {
        $group: {
          _id: null,
          uniqueSpecies: { $addToSet: "$species" },
          uniqueAgeStage: { $addToSet: "$age_stage" },
          uniqueHealthFocus: { $addToSet: "$health_focus" },
          uniqueType: { $addToSet: "$type" },
          uniqueTags: { $addToSet: "$tags" },
          uniqueFlavor: { $addToSet: "$flavor" },
          uniqueFoodTexture: { $addToSet: "$food_texture" },
          uniquePurpose: { $addToSet: "$purpose" },
          uniquePetSize: { $addToSet: "$pet_size" },
          uniqueDietaryNeeds: { $addToSet: "$dietary_needs" },
          uniqueLifeStageFunction: { $addToSet: "$life_stage_function" },
          uniqueForm: { $addToSet: "$form" },
        },
      },
      // 將結果投射到需要的格式
      {
        $project: {
          _id: 0,
          species: { $ifNull: ["$uniqueSpecies", []] },
          age_stage: { $ifNull: ["$uniqueAgeStage", []] },
          health_focus: { $ifNull: ["$uniqueHealthFocus", []] },
          type: { $ifNull: ["$uniqueType", []] },
          tags: { $ifNull: ["$uniqueTags", []] },
          flavor: { $ifNull: ["$uniqueFlavor", []] },
          food_texture: { $ifNull: ["$uniqueFoodTexture", []] },
          purpose: { $ifNull: ["$uniquePurpose", []] },
          pet_size: { $ifNull: ["$uniquePetSize", []] },
          dietary_needs: { $ifNull: ["$uniqueDietaryNeeds", []] },
          life_stage_function: { $ifNull: ["$uniqueLifeStageFunction", []] },
          form: { $ifNull: ["$uniqueForm", []] },
        },
      },
    ]);

    if (spec.length > 0) {
      const result = spec[0];
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

      const output = {};
      fields.forEach((field) => {
        const uniqueValues = new Set(result[field].flat());
        output[field] = Array.from(uniqueValues);
      });

      return output;
    } else {
      return {};
    }
  }

  /**
   * 使用 AI 生成 MongoDB 查詢語句
   * @param {Object} spec 特徵規範
   * @param {Object} input 寵物資訊
   * @returns {Promise<Object>} 查詢語句
   */
  async generatAggregateQueryWithFeatures(spec, input) {
    try {
      const prompt = `
      你是電商推薦系統的 AI 助手。
      請依據以下寵物資訊，分析其對應的產品推薦特徵，並根據已定義的特徵規範（見下方 spec）篩選推薦商品。
      🦴 寵物資訊：
      - 物種：${input.species}
      - 品種：${input.breed}
      - 體重：${input.weight}kg
      - 健康狀況：${input.health}
      - 喜好：${input.preferences}
      📦 特徵規範（spec）：
      ${JSON.stringify(spec)}
      🎯 請輸出符合這些條件的 MongoDB aggregate $match 查詢語句，$in裡面的element不超過8個，用以下格式輸出：
      \`\`\`json
      {
          $match: {
              $and: [
                  {"species": {$in: [...]}},
              ],
              $or: [
                  {"age_stage": {$in: [...]}},
                  {"health_focus": {$in: [...]}},
                  ...
              ]
          }
      }
      \`\`\`
      只輸出符合格式的 JSON 區塊，請不要加入任何額外說明。
    `;

      const response = await retryRequest(async () => {
        const result = await ai.generateContent(prompt);
        // 清理非法字符並解析為 JSON
        const jsonString = result
          .replace(/`|javascript|json/gi, "")
          .replace(/'/g, '"');
        const validJsonString = jsonString.trim();

        let parsedQuery;
        try {
          parsedQuery = JSON.parse(validJsonString);
        } catch (error) {
          throw new Error(`JSON 解析失敗: ${error.message}`);
        }
        return parsedQuery;
      });

      console.log(`✅ 生成商品查詢：${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      console.error(`❌ AI 生成查詢失敗：${error.message}`);
      return null;
    }
  }

  /**
   * 執行 MongoDB 查詢取得商品資料
   * @param {Object} query 查詢語句
   * @param {Number} limit 查詢結果數量
   * @returns {Promise<Array>} 商品資料
   */
  async getProductWithAggregateQuery(query, limit = 15) {
    try {
      // 將查詢轉換為管道陣列
      const pipeline = Array.isArray(query) ? query : [query];

      // 定義輸出欄位
      const projectStage = {
        $project: {
          _id: 0,
          name: 1,
          brand: 1,
          category: 1,
          url: 1,
          image: 1,
          description: 1,
        },
      };

      // 限制查詢結果數量
      const limitStage = { $limit: limit };

      // 添加查詢條件
      pipeline.push(projectStage, limitStage);

      const products = await Product.aggregate(pipeline);

      // 格式化查詢結果
      return products.map((product) => ({
        brand: product.brand,
        url: product.url,
        image: product.image,
        name: product.name,
        description: product.description,
      }));
    } catch (error) {
      console.error(`❌ 執行 MongoDB 查詢失敗：${error.message}`);
      return {};
    }
  }
}

export default new ProductService();
