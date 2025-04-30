// background.js - Manifest V3 Service Worker

// --- Constants ---
const STORAGE_KEY = 'blockedSites'; // Key to store the blocked domain list in chrome.storage.sync
const DYNAMIC_RULE_ID_START = 1; // Start dynamic rule IDs from 1 (must be >= 1)

// --- Helper Functions ---

/**
 * Generates declarativeNetRequest rules based on a list of domains.
 * @param {string[]} blockedDomains - An array of domain names to block.
 * @returns {chrome.declarativeNetRequest.Rule[]} An array of rules.
 */
function generateRules(blockedDomains = []) {
  let rules = [];
  blockedDomains.forEach((domain, index) => {
    // Ensure domain is a non-empty string
    if (typeof domain === 'string' && domain.trim() !== '') {
      const cleanedDomain = domain.trim();
      rules.push({
        id: DYNAMIC_RULE_ID_START + index, // Assign unique IDs sequentially
        priority: 1,
        action: { type: 'block' }, // Action is to block the request
        condition: {
          // Block requests specifically for these domains
          requestDomains: [cleanedDomain],
          // Apply rule only to main document navigations
          resourceTypes: ['main_frame']
        }
      });
    }
  });
  console.log("Generated rules:", rules); // Log generated rules for debugging
  return rules;
}

/**
 * Updates the dynamic blocking rules in declarativeNetRequest.
 * Removes all existing dynamic rules managed by this extension and adds new ones.
 * @param {string[]} blockedDomains - The current list of domains to block.
 */
async function updateBlockingRules(blockedDomains = []) {
  try {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = currentRules.map(rule => rule.id);

    const newRules = generateRules(blockedDomains);
    const newRuleIds = newRules.map(rule => rule.id); // Get IDs of new rules

    // Rules to remove: all previously added dynamic rules by this logic
    // Assuming all dynamic rules starting from DYNAMIC_RULE_ID_START are managed here.
    // A more robust approach might involve checking rule source/metadata if available/needed.
    const ruleIdsToRemove = existingRuleIds.filter(id => id >= DYNAMIC_RULE_ID_START);

    if (ruleIdsToRemove.length > 0 || newRules.length > 0) {
        console.log("Updating rules. Removing IDs:", ruleIdsToRemove, "Adding rules:", newRules);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove,
            addRules: newRules
        });
        console.log("Successfully updated dynamic rules.");
    } else {
        console.log("No rule changes needed.");
    }

  } catch (error) {
    console.error("Error updating dynamic rules:", error);
  }
}

// --- Event Listeners ---

// 1. On Extension Install/Update (or browser startup) - Initialize rules
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`Extension ${details.reason}. Initializing rules...`);
  // Get the initial list from storage and update rules
  const result = await chrome.storage.sync.get([STORAGE_KEY]);
  const blockedDomains = result[STORAGE_KEY] || [];
  console.log("Initial blocked domains from storage:", blockedDomains);
  await updateBlockingRules(blockedDomains);
});

// 2. On Storage Change - Update rules if the blocklist changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  // Check if the change is for our specific key and in the 'sync' area
  if (areaName === 'sync' && changes[STORAGE_KEY]) {
    const newBlockedDomains = changes[STORAGE_KEY].newValue || [];
    const oldBlockedDomains = changes[STORAGE_KEY].oldValue || [];

    // Optional: Check if list actually changed to avoid unnecessary updates
    if (JSON.stringify(newBlockedDomains) !== JSON.stringify(oldBlockedDomains)) {
        console.log("Storage changed. New blocked domains:", newBlockedDomains);
        await updateBlockingRules(newBlockedDomains);
    } else {
        console.log("Storage changed, but blocked list content is identical. No rule update needed.");
    }
  }
});

// Optional: Log when the service worker starts (useful for debugging lifecycle)
console.log("Background service worker started.");

// Optional: Keep service worker alive briefly if needed for async setup,
// usually not necessary just for listeners but can help in complex scenarios.
// Consider using chrome.alarms API for periodic tasks instead if needed.