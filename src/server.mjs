import express from "express";
import swaggerUi from "swagger-ui-express";
import specs from "./swagger.mjs";
import productRoute from "./modules/routes/product.route.mjs";
import mongoDB from "./modules/components/mongodb.component.mjs";
import ValidationError from "./modules/errors/validation.error.mjs";

const app = express();
// 啟用 Swagger UI
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(specs));

// health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// redirect to health check
app.get("/", (req, res) => {
  res.redirect("/health");
});

// 解析 JSON 數據
app.use(express.json());

// 商品資料路由
app.use("/api/products", productRoute);

// 404 處理中間件
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: "Not Found",
  });
});

// 全局錯誤處理中間件
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      details: err.details,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// 初始化
(async () => {
  try {
    console.log("🚀 連接 MongoDB...");
    await mongoDB.connect();
    console.log("✅ MongoDB 連接成功");
  } catch (error) {
    console.error(`❌ 執行失敗：${error.message}`);
    process.exit(1); // 退出程序，返回錯誤碼
  }
})();
