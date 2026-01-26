const axios = require('axios');
const { getConfig } = require('./config-store');

/**
 * Fetch spy transactions from the API
 * @returns {Promise<Object>} { ok, status, data, error }
 */
async function fetchTransactions() {
  try {
    const { API_ENDPOINT } = getConfig();
    const response = await axios.get(API_ENDPOINT);
    const ok = response.status === 200;
    if (ok) {
      console.log(`[${new Date().toISOString()}] Successfully fetched transactions`);
    } else {
      console.log(`[${new Date().toISOString()}] API returned status code: ${response.status}`);
    }
    return { ok, status: response.status, data: response.data, error: ok ? null : `HTTP ${response.status}` };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching transactions:`, error.message);
    return { ok: false, status: null, data: null, error: error.message };
  }
}

module.exports = {
  fetchTransactions
};
