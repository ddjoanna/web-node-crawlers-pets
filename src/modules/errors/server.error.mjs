class ServerError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ServerError";
    this.details = details;
    this.statusCode = 500; // 預設狀態碼為500（Internal Server Error）
  }
}

export default ServerError;
