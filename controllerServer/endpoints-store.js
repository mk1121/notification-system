const fs = require('fs');
const path = require('path');
const { NAMED_ENDPOINTS, DEFAULT_ENDPOINT_TAG } = require('./config');
const { getConfig } = require('./config-store');

const statePath = path.join(__dirname, 'config-state.json');

/**
 * Load state from config-state.json
 */
function loadState() {
  try {
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf8');
      // Handle empty file
      if (!content || content.trim() === '') {
        console.warn('State file is empty, returning default state');
        return {
          activeEndpointTags: [],
          endpointOverrides: {},
          globalSettings: {}
        };
      }
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading state:', err.message);
  }
  return {
    activeEndpointTags: [],
    endpointOverrides: {},
    globalSettings: {}
  };
}

/**
 * Save state to config-state.json
 */
function saveState(state) {
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Error saving state:', err.message);
  }
}

/**
 * Get endpoint config by tag (with overrides from state)
 */
function getEndpointConfig(tag = DEFAULT_ENDPOINT_TAG) {
  if (!tag) {
    throw new Error('No endpoint tag specified and no default endpoint is set');
  }

  const state = loadState();

  // First check if there's an override (created from Setup UI)
  if (state.endpointOverrides && state.endpointOverrides[tag]) {
    return state.endpointOverrides[tag];
  }

  // Then check base config (if any)
  const baseConfig = NAMED_ENDPOINTS[tag];
  if (!baseConfig) {
    throw new Error(`Endpoint '${tag}' not found. Create it via Setup UI at http://localhost:3000/setup/ui`);
  }

  return { ...baseConfig };
}

/**
 * Get all available endpoints (with overrides)
 */
function getAllEndpoints() {
  const state = loadState();
  const endpoints = {};

  // First add all base configs
  for (const tag in NAMED_ENDPOINTS) {
    const base = NAMED_ENDPOINTS[tag];
    const overrides = state.endpointOverrides && state.endpointOverrides[tag];
    endpoints[tag] = overrides ? { ...base, ...overrides } : { ...base };
  }

  // Then add any configs created from Setup UI that don't have base config
  if (state.endpointOverrides) {
    for (const tag in state.endpointOverrides) {
      if (!endpoints[tag]) {
        endpoints[tag] = state.endpointOverrides[tag];
      }
    }
  }

  return endpoints;
}

/**
 * Get active endpoint tags (array)
 */
function getActiveTags() {
  const state = loadState();
  return state.activeEndpointTags || [];
}

/**
 * Get single active endpoint tag (for backward compatibility)
 */
function getActiveTag() {
  const tags = getActiveTags();
  return tags.length > 0 ? tags[0] : DEFAULT_ENDPOINT_TAG;
}

/**
 * Set active endpoint tags (array)
 */
function setActiveTags(tags) {
  const state = loadState();

  // Ensure tags is array
  const tagArray = Array.isArray(tags) ? tags : [tags];

  // Validate all tags exist
  for (const tag of tagArray) {
    const existsInBase = NAMED_ENDPOINTS[tag];
    const existsInOverrides = state.endpointOverrides && state.endpointOverrides[tag];

    if (!existsInBase && !existsInOverrides) {
      throw new Error(`Endpoint '${tag}' not found. Create it via Setup UI.`);
    }
  }

  state.activeEndpointTags = tagArray;
  saveState(state);

  return tagArray;
}

/**
 * Set single active endpoint tag (backward compatibility)
 */
function setActiveTag(tag) {
  return setActiveTags([tag])[0];
}

/**
 * Add endpoint tag to active list
 */
function addActiveTag(tag) {
  const state = loadState();
  const tags = state.activeEndpointTags || [];

  // Check if endpoint exists
  const existsInBase = NAMED_ENDPOINTS[tag];
  const existsInOverrides = state.endpointOverrides && state.endpointOverrides[tag];

  if (!existsInBase && !existsInOverrides) {
    throw new Error(`Endpoint '${tag}' not found. Create it via Setup UI.`);
  }

  // Add if not already present
  if (!tags.includes(tag)) {
    tags.push(tag);
    state.activeEndpointTags = tags;
    saveState(state);
  }

  return tags;
}

/**
 * Remove endpoint tag from active list
 */
function removeActiveTag(tag) {
  const state = loadState();
  const tags = state.activeEndpointTags || [];
  const filtered = tags.filter(t => t !== tag);

  state.activeEndpointTags = filtered;
  saveState(state);

  return filtered;
}

/**
 * Toggle endpoint tag active status
 */
function toggleActiveTag(tag) {
  const tags = getActiveTags();

  if (tags.includes(tag)) {
    return removeActiveTag(tag);
  } else {
    return addActiveTag(tag);
  }
}

/**
 * Get active endpoint config
 */
function getActiveEndpoint() {
  const tag = getActiveTag();
  return getEndpointConfig(tag);
}

/**
 * Update endpoint config (creates runtime override)
 */
function updateEndpoint(tag, updates) {
  const state = loadState();
  if (!state.endpointOverrides) {
    state.endpointOverrides = {};
  }

  // Get base config if exists, otherwise create new
  const baseConfig = NAMED_ENDPOINTS[tag] || state.endpointOverrides[tag] || {};

  // Auto-set SMS and Email endpoints from config (don't allow overrides)
  const config = getConfig();
  const autoSmsEndpoint = config.SMS_ENDPOINT || 'http://localhost:9090/api/sms/send';
  const autoEmailEndpoint = config.EMAIL_ENDPOINT || 'http://localhost:9090/api/email/send';

  // Merge updates but exclude smsEndpoint and emailEndpoint (they are auto-set)
  const filteredUpdates = { ...updates };
  delete filteredUpdates.smsEndpoint;
  delete filteredUpdates.emailEndpoint;

  // Merge updates
  state.endpointOverrides[tag] = {
    ...baseConfig,
    ...state.endpointOverrides[tag],
    ...filteredUpdates,
    smsEndpoint: autoSmsEndpoint,
    emailEndpoint: autoEmailEndpoint,
    tag: tag, // Keep the tag
    updatedAt: new Date().toISOString()
  };

  saveState(state);

  return getEndpointConfig(tag);
}

/**
 * Reset endpoint to default config (or delete if no base config)
 */
function resetEndpoint(tag) {
  const state = loadState();

  if (state.endpointOverrides && state.endpointOverrides[tag]) {
    // If no base config, delete the endpoint entirely
    if (!NAMED_ENDPOINTS[tag]) {
      delete state.endpointOverrides[tag];
      
      // Remove from active tags when deleting endpoint
      const tags = state.activeEndpointTags || [];
      state.activeEndpointTags = tags.filter(t => t !== tag);
      
      saveState(state);
      return { deleted: true, message: `Endpoint '${tag}' deleted successfully` };
    }

    // Otherwise, just remove override to revert to base
    delete state.endpointOverrides[tag];
    saveState(state);
  }

  return getEndpointConfig(tag);
}

/**
 * Check if endpoint exists (in base or overrides)
 */
function endpointExists(tag) {
  const state = loadState();
  const inBase = Object.prototype.hasOwnProperty.call(NAMED_ENDPOINTS, tag);
  const inOverrides = state.endpointOverrides && Object.prototype.hasOwnProperty.call(state.endpointOverrides, tag);
  return inBase || inOverrides;
}

/**
 * Get all endpoint tags (from base and overrides)
 */
function getAvailableTags() {
  const state = loadState();
  const baseTags = Object.keys(NAMED_ENDPOINTS);
  const overrideTags = state.endpointOverrides ? Object.keys(state.endpointOverrides) : [];

  // Combine and deduplicate
  return [...new Set([...baseTags, ...overrideTags])];
}

module.exports = {
  getEndpointConfig,
  getAllEndpoints,
  getActiveTags,
  getActiveTag,
  setActiveTags,
  setActiveTag,
  addActiveTag,
  removeActiveTag,
  toggleActiveTag,
  getActiveEndpoint,
  updateEndpoint,
  resetEndpoint,
  endpointExists,
  getAvailableTags,
  loadState,
  saveState,
  DEFAULT_ENDPOINT_TAG
};
