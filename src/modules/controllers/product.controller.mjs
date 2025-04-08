import productUsecase from "../usecases/product.usecase.mjs";

class ProductController {
  // 推薦商品
  async recommendProducts(req, res, next) {
    try {
      const products = await productUsecase.recommendProducts(req.body);
      res.status(200).json(products);
    } catch (error) {
      console.error("❌ Controller Error:", error.message);
      next(error);
    }
  }
}

export default new ProductController();
