class PermissionError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "PermissionError";
    this.details = details;
    this.statusCode = 403; // 預設狀態碼為403（Forbidden）
  }
}

export default PermissionError;
