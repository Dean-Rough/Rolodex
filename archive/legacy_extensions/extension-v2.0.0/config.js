// config.js - Secure configuration for Rolodex Chrome Extension
// Implements dynamic environment detection and secure API endpoints

// Custom security error class
class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

class RolodexConfig {
  constructor() {
    this.environments = {
      development: {
        apiBaseUrl: 'http://localhost:8000',
        webAppUrl: 'http://localhost:3000',
        secure: false,
        allowInsecure: true,
        healthEndpoint: '/health',
        timeout: 2000
      },
      staging: {
        apiBaseUrl: 'https://staging-api.rolodex.app',
        webAppUrl: 'https://staging.rolodex.app',
        secure: true,
        allowInsecure: false,
        healthEndpoint: '/health',
        timeout: 5000
      },
      production: {
        apiBaseUrl: 'https://api.rolodex.app',
        webAppUrl: 'https://app.rolodex.app',
        secure: true,
        allowInsecure: false,
        healthEndpoint: '/health',
        timeout: 10000
      }
    };
    
    this.currentEnvironment = null;
    this.config = null;
    this.validationCache = new Map();
  }

  /**
   * Detects the current environment based on extension context
   * Priority: development -> staging -> production
   */
  async detectEnvironment() {
    const detectOrder = ['development', 'staging', 'production'];
    
    for (const envName of detectOrder) {
      const envConfig = this.environments[envName];
      
      try {
        console.log(`Rolodex: Testing ${envName} environment...`);
        
        const healthUrl = `${envConfig.apiBaseUrl}${envConfig.healthEndpoint}`;
        
        // Validate URL security before making request
        await this.validateUrlSecurityInternal(healthUrl, envConfig);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), envConfig.timeout);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.currentEnvironment = envName;
          this.config = envConfig;
          console.log(`Rolodex: ${envName} environment detected and validated`);
          return envName;
        }
        
      } catch (error) {
        console.log(`Rolodex: ${envName} environment not accessible:`, error.message);
        continue;
      }
    }
    
    // Fallback to production if no environment is accessible
    this.currentEnvironment = 'production';
    this.config = this.environments.production;
    console.warn('Rolodex: All health checks failed, defaulting to production');
    return 'production';
  }

  /**
   * Gets the current configuration
   * Automatically detects environment if not already done
   */
  async getConfig() {
    if (!this.config) {
      await this.detectEnvironment();
    }
    return this.config;
  }

  /**
   * Gets the API base URL with environment detection
   */
  async getApiBaseUrl() {
    const config = await this.getConfig();
    return config.apiBaseUrl;
  }

  /**
   * Gets the web app URL with environment detection
   */
  async getWebAppUrl() {
    const config = await this.getConfig();
    return config.webAppUrl;
  }

  /**
   * Checks if current environment requires secure connections
   */
  async isSecureEnvironment() {
    const config = await this.getConfig();
    return config.secure;
  }

  /**
   * Internal URL security validation with config parameter
   */
  async validateUrlSecurityInternal(url, config) {
    // Check cache first for performance
    const cacheKey = `${url}_${config.secure}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }
    
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      
      // Protocol validation
      if (config.secure && !config.allowInsecure && urlObj.protocol !== 'https:') {
        throw new Error(`HTTPS required in ${this.currentEnvironment} environment`);
      }
      
      // Hostname validation for production
      if (config.secure && urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
        // Ensure we're connecting to allowed domains
        const allowedDomains = ['rolodex.app', 'api.rolodex.app', 'app.rolodex.app', 'staging.rolodex.app', 'staging-api.rolodex.app'];
        const isAllowed = allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed) {
          throw new Error(`Domain not allowed: ${urlObj.hostname}`);
        }
      }
      
      // Cache successful validation
      this.validationCache.set(cacheKey, true);
      return true;
      
    } catch (error) {
      console.error('Rolodex: URL validation failed:', error.message);
      throw new SecurityError(`URL validation failed: ${error.message}`);
    }
  }

  /**
   * Validates URL security based on environment
   */
  async validateUrlSecurity(url) {
    const config = await this.getConfig();
    return this.validateUrlSecurityInternal(url, config);
  }

  /**
   * Constructs API endpoint URL with security validation
   */
  async getApiEndpoint(path) {
    const baseUrl = await this.getApiBaseUrl();
    const fullUrl = `${baseUrl}${path}`;
    
    await this.validateUrlSecurity(fullUrl);
    return fullUrl;
  }
}

// Secure token storage utilities
class SecureStorage {
  static get STORAGE_KEYS() {
    return {
      TOKEN: 'rolodex_auth_token',
      TOKEN_HASH: 'rolodex_token_hash',
      TIMESTAMP: 'rolodex_token_timestamp',
      ENVIRONMENT: 'rolodex_environment',
      USER_ID: 'rolodex_user_id'
    };
  }

  static get TOKEN_SETTINGS() {
    return {
      MAX_AGE_HOURS: 24,
      ENCRYPTION_KEY_LENGTH: 32
    };
  }

  /**
   * Simple hash function for token integrity verification
   */
  static async hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token + 'rolodex_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Stores authentication token securely with integrity verification
   */
  static async storeToken(token, userId = null) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token provided');
      }

      const tokenHash = await this.hashToken(token);
      const timestamp = Date.now();

      const storageData = {
        [this.STORAGE_KEYS.TOKEN]: token,
        [this.STORAGE_KEYS.TOKEN_HASH]: tokenHash,
        [this.STORAGE_KEYS.TIMESTAMP]: timestamp
      };

      if (userId) {
        storageData[this.STORAGE_KEYS.USER_ID] = userId;
      }

      await chrome.storage.local.set(storageData);
      console.log('Rolodex: Token stored securely with integrity hash');
    } catch (error) {
      console.error('Rolodex: Failed to store token:', error);
      throw new SecurityError('Failed to store authentication token securely');
    }
  }

  /**
   * Retrieves authentication token with expiry and integrity validation
   */
  static async getToken() {
    try {
      const keys = [
        this.STORAGE_KEYS.TOKEN,
        this.STORAGE_KEYS.TOKEN_HASH,
        this.STORAGE_KEYS.TIMESTAMP
      ];
      
      const result = await chrome.storage.local.get(keys);
      
      if (!result[this.STORAGE_KEYS.TOKEN]) {
        return null;
      }

      // Verify token integrity
      const storedHash = result[this.STORAGE_KEYS.TOKEN_HASH];
      if (storedHash) {
        const computedHash = await this.hashToken(result[this.STORAGE_KEYS.TOKEN]);
        if (computedHash !== storedHash) {
          console.warn('Rolodex: Token integrity check failed, clearing token');
          await this.clearToken();
          return null;
        }
      }

      // Check if token is older than configured max age
      const tokenAge = Date.now() - (result[this.STORAGE_KEYS.TIMESTAMP] || 0);
      const maxAge = this.TOKEN_SETTINGS.MAX_AGE_HOURS * 60 * 60 * 1000;
      
      if (tokenAge > maxAge) {
        await this.clearToken();
        console.log('Rolodex: Token expired, cleared from storage');
        return null;
      }
      
      return result[this.STORAGE_KEYS.TOKEN];
    } catch (error) {
      console.error('Rolodex: Failed to retrieve token:', error);
      // Clear potentially corrupted token
      await this.clearToken();
      return null;
    }
  }

  /**
   * Clears stored authentication token and related data
   */
  static async clearToken() {
    try {
      await chrome.storage.local.remove([
        this.STORAGE_KEYS.TOKEN,
        this.STORAGE_KEYS.TOKEN_HASH,
        this.STORAGE_KEYS.TIMESTAMP,
        this.STORAGE_KEYS.USER_ID
      ]);
      console.log('Rolodex: Token and related data cleared from storage');
    } catch (error) {
      console.error('Rolodex: Failed to clear token:', error);
    }
  }

  /**
   * Checks if user has valid authentication token
   */
  static async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Gets stored user ID if available
   */
  static async getUserId() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.USER_ID]);
      return result[this.STORAGE_KEYS.USER_ID] || null;
    } catch (error) {
      console.error('Rolodex: Failed to retrieve user ID:', error);
      return null;
    }
  }

  /**
   * Stores environment information for debugging
   */
  static async storeEnvironment(environment) {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ENVIRONMENT]: environment
      });
    } catch (error) {
      console.error('Rolodex: Failed to store environment:', error);
    }
  }

  /**
   * Gets stored environment information
   */
  static async getStoredEnvironment() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.ENVIRONMENT]);
      return result[this.STORAGE_KEYS.ENVIRONMENT] || null;
    } catch (error) {
      console.error('Rolodex: Failed to retrieve environment:', error);
      return null;
    }
  }
}

// Error handling and user feedback utilities
class ErrorHandler {
  static get RETRY_CONFIG() {
    return {
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000, // 1 second
      BACKOFF_MULTIPLIER: 2
    };
  }

  static get ERROR_CATEGORIES() {
    return {
      NETWORK: 'network',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      VALIDATION: 'validation',
      SERVER: 'server',
      SECURITY: 'security',
      UNKNOWN: 'unknown'
    };
  }

  /**
   * Categorizes error for appropriate handling
   */
  static categorizeError(error) {
    if (error.name === 'SecurityError') {
      return this.ERROR_CATEGORIES.SECURITY;
    } else if (error.name === 'NetworkError' || error.message.includes('fetch') || error.name === 'AbortError') {
      return this.ERROR_CATEGORIES.NETWORK;
    } else if (error.status === 401) {
      return this.ERROR_CATEGORIES.AUTHENTICATION;
    } else if (error.status === 403) {
      return this.ERROR_CATEGORIES.AUTHORIZATION;
    } else if (error.status >= 400 && error.status < 500) {
      return this.ERROR_CATEGORIES.VALIDATION;
    } else if (error.status >= 500) {
      return this.ERROR_CATEGORIES.SERVER;
    }
    return this.ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Determines if error is retryable
   */
  static isRetryableError(error, category) {
    const retryableCategories = [
      this.ERROR_CATEGORIES.NETWORK,
      this.ERROR_CATEGORIES.SERVER
    ];
    return retryableCategories.includes(category) && error.status !== 404;
  }

  /**
   * Executes function with retry logic
   */
  static async withRetry(fn, context = 'Operation', maxRetries = null) {
    const retries = maxRetries || this.RETRY_CONFIG.MAX_RETRIES;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const category = this.categorizeError(error);
        
        // Don't retry non-retryable errors
        if (!this.isRetryableError(error, category)) {
          console.warn(`Rolodex: ${context} failed with non-retryable error:`, error.message);
          break;
        }

        // Don't retry on last attempt
        if (attempt === retries) {
          console.error(`Rolodex: ${context} failed after ${retries} retries:`, error.message);
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.RETRY_CONFIG.RETRY_DELAY * Math.pow(this.RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
        console.warn(`Rolodex: ${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries}):`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Handles API errors with user-friendly messages and categorization
   */
  static handleApiError(error, context = 'API request') {
    const category = this.categorizeError(error);
    let userMessage;
    let logMessage = `Rolodex: ${context} failed - ${error.message} (category: ${category})`;

    switch (category) {
      case this.ERROR_CATEGORIES.NETWORK:
        userMessage = 'Unable to connect to Rolodex servers. Please check your internet connection.';
        break;
      case this.ERROR_CATEGORIES.SECURITY:
        userMessage = 'Secure connection required. Please ensure you\'re using the production version.';
        break;
      case this.ERROR_CATEGORIES.AUTHENTICATION:
        userMessage = 'Authentication required. Please sign in to your Rolodex account.';
        break;
      case this.ERROR_CATEGORIES.AUTHORIZATION:
        userMessage = 'Access denied. Please check your account permissions.';
        break;
      case this.ERROR_CATEGORIES.SERVER:
        userMessage = 'Server error. Please try again later.';
        break;
      case this.ERROR_CATEGORIES.VALIDATION:
        userMessage = error.message || 'Invalid request. Please check your input.';
        break;
      default:
        userMessage = 'An unexpected error occurred. Please try again.';
    }

    console.error(logMessage);
    
    // Show user notification
    this.showNotification('Rolodex Error', userMessage, 'error');
    
    return { userMessage, logMessage, category };
  }

  /**
   * Shows browser notification to user
   */
  static async showNotification(title, message, type = 'info') {
    try {
      const iconUrl = type === 'error' ? 'icons/icon16.png' : 'icons/icon16.png'; // Could use different icons for different types
      
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl,
        title: title,
        message: message
      });
    } catch (error) {
      console.error('Rolodex: Failed to show notification:', error);
      // Fallback to console for development
      console.log(`${title}: ${message}`);
    }
  }

  /**
   * Shows success notification
   */
  static async showSuccess(message) {
    await this.showNotification('Rolodex Success', message, 'success');
  }

  /**
   * Shows error notification
   */
  static async showError(message) {
    await this.showNotification('Rolodex Error', message, 'error');
  }
}

// Export for use in other extension files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RolodexConfig, SecureStorage, ErrorHandler };
}