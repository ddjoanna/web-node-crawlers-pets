import mongoose from "mongoose";
import config from "../config/index.mjs";

const { MONGO } = config;

class MongoDB {
  async connect() {
    try {
      await mongoose.connect(MONGO.url, {
        serverSelectionTimeoutMS: MONGO.timeoutMS,
        maxPoolSize: MONGO.maxPoolSize,
      });

      // 事件監聽
      mongoose.connection.on("connected", () => {
        console.log("🗄️  MongoDB 已連接");
      });

      mongoose.connection.on("disconnected", () => {
        console.log("⚠️  MongoDB 連線中斷");
      });
    } catch (error) {
      throw error;
    }
  }

  async debug() {
    mongoose.set("debug", true);
  }

  /**
   * 安全關閉資料庫連線
   * @returns {Promise<void>}
   */
  async close() {
    await mongoose.disconnect();
    console.log("🔌 資料庫連線已關閉");
  }
}

export default new MongoDB();
