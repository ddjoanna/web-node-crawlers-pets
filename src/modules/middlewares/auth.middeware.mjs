import Jwt from "./../components/jwt.component.mjs";

class AuthMiddleware {
  // 驗證 token
  async verifyToken(req, res, next) {
    try {
      // 可針對會員進行驗證

      // 繼續執行下一個中間件
      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      return res.status(401).json({ message: "Unauthorized" });
    }
  }
}

export default new AuthMiddleware();
