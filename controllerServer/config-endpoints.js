const { NAMED_ENDPOINTS, DEFAULT_ENDPOINT_TAG } = require('./config');

/**
 * Get configuration for a specific endpoint by tag
 * @param {string} tag - Endpoint tag/name
 * @returns {object} Endpoint configuration
 */
function getEndpointConfig(tag = DEFAULT_ENDPOINT_TAG) {
  const endpointConfig = NAMED_ENDPOINTS[tag];
  if (!endpointConfig) {
    throw new Error(`Endpoint '${tag}' not found. Available: ${Object.keys(NAMED_ENDPOINTS).join(', ')}`);
  }
  return endpointConfig;
}

/**
 * Get all available endpoint tags
 * @returns {string[]} Array of endpoint tags
 */
function getAvailableEndpoints() {
  return Object.keys(NAMED_ENDPOINTS);
}

/**
 * Check if an endpoint tag exists
 * @param {string} tag - Endpoint tag to check
 * @returns {boolean}
 */
function endpointExists(tag) {
  return NAMED_ENDPOINTS.hasOwnProperty(tag);
}

/**
 * Get all endpoint configs
 * @returns {object} All named endpoints
 */
function getAllEndpoints() {
  return NAMED_ENDPOINTS;
}

module.exports = {
  getEndpointConfig,
  getAvailableEndpoints,
  endpointExists,
  getAllEndpoints,
  DEFAULT_ENDPOINT_TAG
};
