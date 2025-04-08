import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

class Redis {
  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost", // Redis 主機
        port: parseInt(process.env.REDIS_PORT, 10) || 6379, // Redis 埠號
      },
      password: process.env.REDIS_PASSWORD || null, // Redis 密碼（若無則為 null）
      database: parseInt(process.env.REDIS_DB, 10) || 0, // Redis 資料庫編號，默認為 0
    });

    this.client.on("error", (err) => {
      console.error("❌ Redis Error:", err.message);
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log("✅ Redis connected");
    } catch (error) {
      console.error("❌ Error connecting to Redis:", error.message);
      setTimeout(() => this.connect(), 5000); // 5秒後重新嘗試
    }
  }

  async pushToQueue(queueName, value) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }

      await this.client.lPush(queueName, value); // 使用 lPush 推送到隊列
    } catch (error) {
      console.error(`❌ Error pushing to ${queueName}:`, error.message);
    }
  }

  async popFromQueue(queueName) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }

      const value = await this.client.rPop(queueName); // 使用 rPop 從隊列中取出
      return value;
    } catch (error) {
      console.error(`❌ Error popping from ${queueName}:`, error.message);
      return null;
    }
  }

  async getQueueLength(queueName) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }

      const length = await this.client.lLen(queueName);
      return length;
    } catch (error) {
      console.error(`❌ Error getting length of ${queueName}:`, error.message);
      return null;
    }
  }

  // 關閉 Redis 連接
  async disconnect() {
    try {
      await this.client.quit();
      console.log("✅ Redis disconnected");
    } catch (error) {
      console.error("❌ Error disconnecting from Redis:", error.message);
    }
  }
}

export default new Redis();
