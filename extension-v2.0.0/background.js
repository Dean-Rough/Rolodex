// background.js – Rolodex Chrome Extension
// Secure context menu implementation with dynamic API endpoints

// Import secure configuration utilities
importScripts('config.js');

// Initialize secure configuration
const config = new RolodexConfig();
const storage = SecureStorage;
const errorHandler = ErrorHandler;

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for image saving
  chrome.contextMenus.create({
    id: "rolodex-save-image",
    title: "Save to Rolodex",
    contexts: ["image"]
  });

  // Initialize environment detection on installation
  config.detectEnvironment().then(env => {
    console.log(`Rolodex: Extension installed in ${env} environment`);
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "rolodex-save-image") {
    try {
      await saveImageToRolodex(info.srcUrl, tab);
    } catch (error) {
      errorHandler.handleApiError(error, 'Image save');
    }
  }
});

/**
 * Securely saves image to Rolodex with proper authentication and error handling
 */
async function saveImageToRolodex(imageUrl, tab) {
  const saveOperation = async () => {
    // Validate image URL
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    // Check authentication
    const isAuthenticated = await storage.isAuthenticated();
    if (!isAuthenticated) {
      // Show authentication prompt
      await errorHandler.showError('Please sign in to save images to Rolodex');
      // Could open authentication flow here
      return;
    }

    // Get secure API endpoint with validation
    const apiEndpoint = await config.getApiEndpoint('/api/items');
    
    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Rolodex-Extension/2.0.0',
      'Accept': 'application/json'
    };

    // Add authentication token if available
    const token = await storage.getToken();
    if (token && typeof token === 'string') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare request payload with additional context
    const payload = {
      img_url: imageUrl,
      source_url: tab?.url || '',
      source_title: tab?.title || '',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      extension_version: '2.0.0'
    };

    console.log(`Rolodex: Saving image to ${apiEndpoint}`);

    // Make secure API request with timeout
    const currentConfig = await config.getConfig();
    const timeoutMs = currentConfig.timeout || 10000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle response
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Rolodex: Could not parse error response');
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      const data = await response.json();
      console.log('Rolodex: Image saved successfully', data);
      
      // Show success notification
      await errorHandler.showSuccess('Image saved to your Rolodex library!');
      
      return data;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Enhance error with more context
      if (fetchError.name === 'AbortError') {
        const error = new Error('Request timeout - please try again');
        error.name = 'NetworkError';
        throw error;
      } else if (fetchError.message.includes('Failed to fetch')) {
        const error = new Error('Network error - please check your connection');
        error.name = 'NetworkError';
        throw error;
      } else {
        throw fetchError;
      }
    }
  };

  // Execute with retry logic
  try {
    return await errorHandler.withRetry(saveOperation, 'Image save');
  } catch (error) {
    errorHandler.handleApiError(error, 'Image save');
    throw error;
  }
}

/**
 * Handle authentication flow
 */
async function handleAuthentication() {
  try {
    const webAppUrl = await config.getWebAppUrl();
    
    // Open authentication tab
    const authTab = await chrome.tabs.create({
      url: `${webAppUrl}/auth/extension`,
      active: true
    });

    // Listen for authentication completion
    const authListener = (tabId, changeInfo, tab) => {
      if (tabId === authTab.id && changeInfo.url && changeInfo.url.includes('auth-success')) {
        // Extract token from URL or handle auth completion
        chrome.tabs.remove(authTab.id);
        chrome.tabs.onUpdated.removeListener(authListener);
        
        console.log('Rolodex: Authentication completed');
        errorHandler.showSuccess('Successfully signed in to Rolodex!');
      }
    };

    chrome.tabs.onUpdated.addListener(authListener);

  } catch (error) {
    errorHandler.handleApiError(error, 'Authentication');
  }
}

/**
 * Handle extension messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getConfig':
      config.getConfig().then(sendResponse);
      return true; // Keep channel open for async response

    case 'authenticate':
      handleAuthentication().then(() => sendResponse({ success: true }));
      return true;

    case 'logout':
      storage.clearToken().then(() => {
        console.log('Rolodex: User logged out');
        sendResponse({ success: true });
      });
      return true;

    case 'checkAuth':
      storage.isAuthenticated().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Handle installation and update events
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Rolodex: Extension installed');
    // Could show welcome notification or open onboarding
  } else if (details.reason === 'update') {
    console.log('Rolodex: Extension updated');
    // Could show update notification
  }
}); 