import Product from "../models/mongo/product.model.mjs";
import redis from "../components/redis.component.mjs";
import mongoDb from "../components/mongodb.component.mjs";
import ai from "../services/ai.service.mjs";
import retryRequest from "../utils/retry.util.mjs";

class ExtractFeaturesWithProduct {
  async execute() {
    try {
      console.log("🚀 開始撈取商品描述...");

      // 從 MongoDB 中取得所有商品
      const brandNames = ["dogcatstar", "litomon", "heromamapet", "ladynpet"];
      const products = await Product.find({
        brand: { $in: brandNames },
      });
      console.log(`✅ 共撈取 ${products.length} 筆商品描述`);
      let extractedFeatures;
      // 迴圈處理每個商品
      for (const product of products) {
        console.log(`🛍️ 正在萃取商品 ${product._id} 的特徵...`);

        // 現有商品資料萃取商品特徵
        const prompt = `
          你是一個寵物AI專家，為了建立商品推薦系統
          請從以下商品資料中萃取出 species、age_stage、health_focus、type、tags、flavor、food_texture、purpose、pet_size、dietary_needs、life_stage_function、form，
          欄位型態都是Array萃取的資料請用中文，回傳 JSON 格式：
          分類：${product.category}
          名稱：${product.name}
          描述：${product.description}
        `;

        // // 請AI爬取網站資訊後萃取商品特徵
        // const prompt = `
        //   請爬取網站資訊${product.url}，萃取出 species、age_stage、health_focus、type、tags、flavor、food_texture、purpose、pet_size、dietary_needs、life_stage_function、form，
        //   欄位型態都是Array萃取的資料請用中文，單一商品，回傳 JSON 格式
        // `;

        try {
          extractedFeatures = await retryRequest(async () => {
            const response = await ai.generateContent(prompt);
            const jsonString = response.replace(/`|json/gi, "");
            return JSON.parse(jsonString);
          });

          console.log(`✅ 商品 ${product.name} 的特徵：`, extractedFeatures);

          if (Array.isArray(extractedFeatures)) {
            extractedFeatures = extractedFeatures[0];
          }
          // 更新 MongoDB 中的商品特徵
          await Product.findByIdAndUpdate(product._id, {
            $set: extractedFeatures,
          });
        } catch (error) {
          console.error(
            `❌ 萃取商品 ${product.name} 特徵失敗：${error.message}`
          );
        }
      }
    } catch (error) {
      console.error(`❌ 執行失敗：${error.message}`);
    }
  }
}

(async () => {
  try {
    console.log("🚀 連接 MongoDB...");
    await mongoDb.connect();
    // mongoDb.debug();
    console.log("✅ MongoDB 連接成功");

    console.log("🚀 連接 Redis...");
    await redis.connect();
    console.log("✅ Redis 連接成功");

    const job = new ExtractFeaturesWithProduct();
    await job.execute();
    console.log("✅ 商品特徵萃取完成");
    process.exit(0);
  } catch (error) {
    console.error(`❌ 執行失敗：${error.message}`);
    process.exit(1); // 退出程序，返回錯誤碼
  }
})();
