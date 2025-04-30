// options.js - Logic for the options page

// --- Constants ---
const STORAGE_KEY = 'blockedSites'; // Key used in chrome.storage.sync

// --- DOM Elements ---
const newDomainInput = document.getElementById('new-domain');
const addButton = document.getElementById('add-button');
const blockedListUl = document.getElementById('blocked-list');

// --- Functions ---

/**
 * Displays the list of blocked domains in the options UI.
 * @param {string[]} domains - An array of domain names.
 */
function displayBlockedSites(domains = []) {
    // Clear the current list in the UI
    blockedListUl.innerHTML = '';

    if (!Array.isArray(domains)) {
        console.error("Error: Blocked sites data is not an array.", domains);
        domains = []; // Reset to empty array to prevent errors
    }

    if (domains.length === 0) {
        blockedListUl.innerHTML = '<li>No sites currently blocked.</li>';
        return;
    }

    // Populate the list with domains and remove buttons
    domains.forEach(domain => {
        const li = document.createElement('li');

        const domainSpan = document.createElement('span');
        domainSpan.textContent = domain;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.dataset.domain = domain; // Store domain in data attribute
        removeButton.classList.add('remove-button'); // Add class for event delegation

        li.appendChild(domainSpan);
        li.appendChild(removeButton);
        blockedListUl.appendChild(li);
    });
}

/**
 * Loads the blocked domains from storage and displays them.
 */
async function loadBlockedSites() {
    try {
        const result = await chrome.storage.sync.get([STORAGE_KEY]);
        const domains = result[STORAGE_KEY] || [];
        displayBlockedSites(domains);
    } catch (error) {
        console.error("Error loading blocked sites:", error);
        displayBlockedSites([]); // Display empty list on error
    }
}

/**
 * Adds a new domain to the blocked list in storage.
 * @param {string} domainToAdd - The domain name to add.
 */
async function addDomain(domainToAdd) {
    const domain = domainToAdd.trim().toLowerCase();
    // Basic validation: not empty and looks somewhat like a domain (contains a dot)
    if (!domain || !domain.includes('.')) {
        alert('Please enter a valid domain name (e.g., example.com).');
        return;
    }

    try {
        const result = await chrome.storage.sync.get([STORAGE_KEY]);
        const currentDomains = result[STORAGE_KEY] || [];

        // Add only if it's not already in the list
        if (!currentDomains.includes(domain)) {
            const updatedDomains = [...currentDomains, domain].sort(); // Keep list sorted
            await chrome.storage.sync.set({ [STORAGE_KEY]: updatedDomains });
            console.log(`Added "${domain}" to blocked list.`);
            displayBlockedSites(updatedDomains); // Update UI immediately
            newDomainInput.value = ''; // Clear input field
        } else {
            alert(`"${domain}" is already in the block list.`);
        }
    } catch (error) {
        console.error("Error adding domain:", error);
        alert("Failed to add domain. See console for details.");
    }
}

/**
 * Removes a domain from the blocked list in storage.
 * @param {string} domainToRemove - The domain name to remove.
 */
async function removeDomain(domainToRemove) {
    if (!domainToRemove) return;

    try {
        const result = await chrome.storage.sync.get([STORAGE_KEY]);
        let currentDomains = result[STORAGE_KEY] || [];

        // Filter out the domain to remove
        const updatedDomains = currentDomains.filter(d => d !== domainToRemove);

        await chrome.storage.sync.set({ [STORAGE_KEY]: updatedDomains });
        console.log(`Removed "${domainToRemove}" from blocked list.`);
        displayBlockedSites(updatedDomains); // Update UI immediately
    } catch (error) {
        console.error("Error removing domain:", error);
        alert("Failed to remove domain. See console for details.");
    }
}

// --- Event Listeners ---

// Load sites when the options page DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadBlockedSites);

// Handle clicks on the "Add" button
addButton.addEventListener('click', () => {
    addDomain(newDomainInput.value);
});

// Handle Enter key press in the input field
newDomainInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addDomain(newDomainInput.value);
    }
});

// Handle clicks on "Remove" buttons using event delegation
blockedListUl.addEventListener('click', (event) => {
    // Check if the clicked element is a remove button
    if (event.target && event.target.classList.contains('remove-button')) {
        const domain = event.target.dataset.domain; // Get domain from data attribute
        removeDomain(domain);
    }
});