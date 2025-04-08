class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    this.statusCode = 400; // 預設狀態碼為400（Bad Request）
  }
}

export default ValidationError;
