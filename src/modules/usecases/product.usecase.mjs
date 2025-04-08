import { Validator } from "node-input-validator";
import productValidationRules from "../validation_rules/product.validation.mjs";
import ValidationError from "../errors/validation.error.mjs";
import productService from "../services/product.service.mjs";

class ProductUsecase {
  /**
   * 推薦商品
   * @param {Object} input - 寵物資料資訊
   * @returns {Promise<Array>} products 商品資料
   */
  async recommendProducts(input) {
    if (!input || typeof input !== "object") {
      throw new ValidationError("Validation failed");
    }

    const v = new Validator(
      input,
      productValidationRules.productRecommend.rules,
      productValidationRules.productRecommend.messages
    );

    const matched = await v.check();
    if (!matched) {
      throw new ValidationError("Validation failed", v.errors);
    }

    const { species, breed, age, weight, health, preferences } = input;

    return productService.getProductsWithFeatures({
      species,
      breed,
      age,
      weight,
      health,
      preferences,
    });
  }
}

export default new ProductUsecase();
