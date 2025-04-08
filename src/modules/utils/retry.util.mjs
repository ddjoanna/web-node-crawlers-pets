/**
 * 執行帶有重試機制的函數
 * @param {Function} fn - 要執行的函數
 * @param {Number} [maxRetries=3] - 最大重試次數
 * @param {Number} [initialDelay=5000] - 初始延遲時間（毫秒）
 * @returns {Promise} - 執行結果
 */
async function retryRequest(fn, maxRetries = 3, initialDelay = 5000) {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      console.error(`第 ${attempt} 次嘗試失敗：${error.message}`);

      if (attempt < maxRetries) {
        console.log(`等待 ${delay / 1000} 秒後重試...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // 指數回退
      } else {
        throw error;
      }
    }
  }
}

export default retryRequest;
