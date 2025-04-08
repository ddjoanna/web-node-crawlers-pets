import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

class MongoDB {
  async connect() {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
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
