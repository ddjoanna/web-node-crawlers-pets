# web-node-crawlers-pets

## 專案簡介

透過爬蟲技術抓取寵物商品資訊，以牧羊人集團旗下品牌為例
利用 AI 分析商品特徵，並提供 API 接口讓用戶輸入寵物資訊以取得推薦商品。

## 專案目標

1. **爬取商品資訊**：使用爬蟲工具從指定網站抓取商品資料。
2. **AI 分析商品特徵**：利用 OpenAI 或 Gemini 等 AI 工具對商品描述進行自然語言處理，萃取商品特徵。
3. **提供 API 接口**：建立 API 供用戶輸入寵物資訊，返回推薦的商品列表。

## 使用技術

- **爬蟲工具**：Puppeteer
- **AI 工具**：OpenAI、Gemini
- **API 框架**：Node.js 的 Express.js

## 專案啟動步驟

1. clone 專案 & 設定.env
   - OPENAI_API_KEY 可在 [官網](https://platform.openai.com/account/api-keys) 申請(付費)
   - GEMINI_API_KEY 可在 [官網](https://gemini.openai.com/account/api-keys) 申請(可免費使用 gemini-2.0-flash)
2. 安裝 docker 和 docker-compose
3. 執行 `make up` 安裝 mongodb 和 redis
   - redis 暫存商品頁面連結(queue/deadqueue)
   - mongodb 儲存商品資料
4. 執行 `make crawl` 爬取商品資訊
5. 執行 `make extract` 萃取商品特徵
6. 透過 API 接口取得推薦商品
   ```shell
   curl --location 'http://localhost:3000/api/products/recommend' \
    --header 'Content-Type: application/json' \
    --data '{
    "species": "狗",
    "breed": "台灣土狗",
    "age": 14,
    "weight": 16,
    "health": "關節老化、視力退化",
    "preferences": "零食、愛湊熱鬧"
    }'
   ```
7. 執行 `make run` 開啟 API 服務
8. 執行 `make down` 關閉服務 mongodb 和 redis

## API Documentation

[Swagger JSON](swagger.json)

## Note

AI 輸出的格式有時候解析會有問題有 retry 機制(ex: JSON 格式錯誤) \
AI 響應時間很難抓，如果要運用在即時響應的功能，可以在中間穿插一些人性化的回應
