import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: String,
    url: String,
    image: String,
    description: String,
    species: Array,
    age_stage: Array,
    health_focus: Array,
    type: Array,
    tags: Array,
    flavor: Array,
    food_texture: Array,
    purpose: Array,
    pet_size: Array,
    dietary_needs: Array,
    life_stage_function: Array,
    form: Array,
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("product", productSchema);

export default Product;
