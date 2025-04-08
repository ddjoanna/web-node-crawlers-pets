import puppeteer from "puppeteer";
import Product from "../models/mongo/product.model.mjs";
import redis from "../components/redis.component.mjs";
import mongoDb from "../components/mongodb.component.mjs";
import retryRequest from "../utils/retry.util.mjs";

// 品牌配置集中管理
const BRAND_CONFIG = {
  dogcatstar: {
    baseUrl: "https://www.dogcatstar.com/shop",
    queueKey: "queue:dogcatstar:product",
    deadQueueKey: "deadqueue:dogcatstar:product",
  },
  litomon: {
    baseUrl: "https://litomon.com/shop",
    queueKey: "queue:litomon:product",
    deadQueueKey: "deadqueue:litomon:product",
  },
  heromamapet: {
    baseUrl: "https://ladynpet.com/shop",
    queueKey: "queue:heromamapet:product",
    deadQueueKey: "deadqueue:heromamapet:product",
  },
  ladynpet: {
    baseUrl: "https://ladynpet.com/shop",
    queueKey: "queue:ladynpet:product",
    deadQueueKey: "deadqueue:ladynpet:product",
  },
};

class ProductCrawler {
  browserConfig = {
    headless: true,
    protocolTimeout: 60000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  };

  async execute() {
    for (const brand of Object.keys(BRAND_CONFIG)) {
      await this.crawlProductLinks(brand);
      await this.processProductQueue(brand);
    }
  }

  // 品牌商品連結抓取
  async crawlProductLinks(brand) {
    console.log(`🚀 開始抓取品牌 ${brand} 的商品連結...`);

    const { baseUrl, queueKey } = BRAND_CONFIG[brand];
    const existingItems = await redis.getQueueLength(queueKey);

    if (existingItems > 0) {
      console.log(`⏩ 队列 ${queueKey} 已有資料，跳過抓取`);
      return;
    }

    const browser = await this.launchBrowser();
    try {
      const productLinks = await this.scrapePaginatedLinks(browser, baseUrl);
      await this.storeLinksToRedis(queueKey, productLinks);
    } catch (error) {
      console.error(`❌ 抓取商品連結失敗：${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  // 分頁抓取連結
  async scrapePaginatedLinks(browser, baseUrl) {
    const productLinks = new Set();
    let currentPage = 1;

    while (true) {
      const pageUrl = `${baseUrl}/page/${currentPage}`;
      console.log(`📄 處理第 ${currentPage} 頁：${pageUrl}`);

      const page = await browser.newPage();
      try {
        await this.navigateWithRetry(page, pageUrl);

        const links = await this.extractProductLinks(page);
        links.forEach((link) => productLinks.add(link));

        const hasNextPage = await page.$(".icon-angle-right");
        if (!hasNextPage) break;

        currentPage++;
      } catch (error) {
        console.error(`❌ 抓取第 ${currentPage} 頁失敗：${error.message}`);
      } finally {
        await page.close();
      }
    }

    return productLinks;
  }

  // 處理單個品牌隊列
  async processProductQueue(brand) {
    console.log(`🚀 開始處理 ${brand} 的商品隊列...`);

    const browser = await this.launchBrowser();
    try {
      const { queueKey } = BRAND_CONFIG[brand];

      while (true) {
        const productUrl = await redis.popFromQueue(queueKey);
        if (!productUrl) {
          console.log("🏁 队列處理完成");
          break;
        }

        await this.processSingleProduct(browser, productUrl, brand);
      }
    } catch (error) {
      console.error(`❌ 處理隊列失敗：${error.message}`);
    } finally {
      if (browser) await browser.close();
      console.log("✅ 資源已釋放");
    }
  }

  // 處理單個商品
  async processSingleProduct(browser, productUrl, brand) {
    console.log(`🛍️ 處理商品：${productUrl}`);

    const page = await browser.newPage();
    try {
      await this.navigateWithRetry(page, productUrl);
      const productData = await this.extractProductMetadata(page);
      await this.upsertProductToDatabase(productData, brand);
    } catch (error) {
      await this.handleProcessingError(brand, productUrl, error);
    } finally {
      await page.close();
    }
  }

  // 商品資料提取
  async extractProductMetadata(page) {
    const productData = await page.evaluate(() => ({
      productId:
        document.querySelector('input[name="product_id"]')?.value || "",
      name: document.querySelector('meta[property="og:title"]')?.content || "",
      image: document.querySelector('meta[property="og:image"]')?.content || "",
      description:
        document.querySelector('meta[property="og:description"]')?.content ||
        "",
      category:
        document.querySelector("nav.woocommerce-breadcrumb a:nth-child(2)")
          ?.textContent || "",
    }));
    productData.url = page.url();
    return productData;
  }

  /** 通用工具方法 */
  async launchBrowser() {
    return puppeteer.launch(this.browserConfig);
  }

  // 頁面加載重試
  async navigateWithRetry(page, url, retries = 3) {
    await retryRequest(async () => {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    }, retries);
  }

  // 提取商品連結
  async extractProductLinks(page) {
    return page.$$eval("a", (links) =>
      links.map((el) => el.href).filter((href) => href.includes("/product/"))
    );
  }

  // 儲存連結到 Redis 隊列
  async storeLinksToRedis(queueKey, links) {
    for (const url of links) {
      await redis.pushToQueue(queueKey, url);
    }
    console.log(`✅ 已儲存 ${links.size} 個連結到 ${queueKey}`);
  }

  // 將商品資料更新到資料庫
  async upsertProductToDatabase(data, brand) {
    if (!data.productId || !data.name) {
      throw new Error("商品ID或名稱缺失");
    }

    await Product.findOneAndUpdate(
      { id: data.productId, brand },
      { ...data, brand },
      { upsert: true, new: true }
    );
  }

  // 處理失敗時儲存到 Redis 隊列
  async handleProcessingError(brand, url, error) {
    console.error(`⚠️ 處理失敗：${url} - ${error.message}`);
    await redis.pushToQueue(BRAND_CONFIG[brand].deadQueueKey, url);
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

    const job = new ProductCrawler();
    await job.execute();
    console.log("✅ 商品爬蟲執行完成");
    process.exit(0);
  } catch (error) {
    console.error(`❌ 執行失敗：${error.message}`);
    process.exit(1); // 退出程序，返回錯誤碼
  }
})();
