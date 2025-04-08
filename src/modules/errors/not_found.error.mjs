class NotFoundError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "NotFoundError";
    this.details = details;
    this.statusCode = 404; // 預設狀態碼為404（Not Found）
  }
}

export default NotFoundError;
