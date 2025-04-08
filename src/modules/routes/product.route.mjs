import express from "express";
import productController from "../controllers/product.controller.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/products/recommend:
 *   post:
 *     summary: Recommend Products
 *     description: Recommend products based on the current user
 *     tags:
 *       - Product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - species
 *               - breed
 *               - age
 *               - weight
 *             properties:
 *               species:
 *                 type: string
 *                 description: The species of the pet
 *                 enum:
 *                   - 貓
 *                   - 狗
 *               breed:
 *                 type: string
 *                 description: The breed of the pet
 *               age:
 *                 type: integer
 *                 description: The age of the pet
 *               weight:
 *                 type: integer
 *                 description: The weight of the pet
 *               health:
 *                 type: string
 *                 description: The health of the pet
 *               preferences:
 *                 type: string
 *                 description: The preferences of the pet
 *     responses:
 *       200:
 *         description: Recommended products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: The product name
 *                   brand:
 *                     type: string
 *                     description: The product brand
 *                   url:
 *                     type: string
 *                     description: The product URL
 *                   image:
 *                     type: string
 *                     description: The product image
 *                   description:
 *                     type: string
 *                     description: The product description
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/recommend", productController.recommendProducts);

export default router;
