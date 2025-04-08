import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

class Jwt {
  constructor(secret = process.env.JWT_SECRET) {
    this.secret = secret;
  }

  // 生成 JWT
  generateToken(user) {
    const payload = { id: user.id, role: user.role };
    return jwt.sign(payload, this.secret, { expiresIn: "1h" });
  }

  // 驗證 JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  // 解碼 JWT
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}

export default new Jwt();
