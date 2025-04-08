export default {
  productRecommend: {
    rules: {
      species: "required|in:貓,狗",
      breed: "required|string",
      age: "required|integer",
      weight: "required|integer",
      health: "string",
      preferences: "string",
    },
    messages: {
      "species.required": "Species is required",
      "species.in": "Species is invalid must be 貓 or 狗",
      "breed.required": "Breed is required",
      "bread.string": "Breed is invalid must be string",
      "age.required": "Age is required",
      "age.integer": "Age is invalid must be integer",
      "weight.required": "Weight is required",
      "weight.integer": "Weight is invalid must be integer",
      "health.string": "Health is invalid",
      "preferences.string": "Preferences is invalid must be string",
    },
  },
};
