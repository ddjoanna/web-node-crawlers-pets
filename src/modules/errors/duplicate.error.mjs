class DuplicateError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "DuplicateError";
    this.details = details;
    this.statusCode = 409; // 預設狀態碼為409（Conflict）
  }
}

export default DuplicateError;
