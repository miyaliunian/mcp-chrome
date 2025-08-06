/**
 * Chrome Extension Integration Layer
 * Provides seamless integration between inject-scripts and Chrome extension
 */

/**
 * Chrome Extension Bridge
 * Handles communication between inject scripts and Chrome extension
 */
class ChromeExtensionBridge {
  constructor() {
    this.extensionId = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  /**
   * Initialize the bridge with extension ID
   * @param {string} extensionId - Chrome extension ID
   */
  initialize(extensionId) {
    this.extensionId = extensionId;
    this.setupMessageHandling();
    this.connected = true;
    return this;
  }

  /**
   * Setup Chrome extension message handling
   * @private
   */
  setupMessageHandling() {
    if (!chrome.runtime) {
      console.warn('Chrome runtime not available');
      return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleIncomingMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  /**
   * Handle incoming messages from extension
   * @private
   */
  handleIncomingMessage(message, sender, sendResponse) {
    const { type, data, requestId } = message;

    switch (type) {
      case 'INJECT_RESPONSE':
        this.handleInjectResponse(requestId, data);
        break;
      case 'INJECT_ERROR':
        this.handleInjectError(requestId, data);
        break;
      case 'PING':
        sendResponse({ type: 'PONG', connected: true });
        break;
      default:
        if (this.messageHandlers.has(type)) {
          const handler = this.messageHandlers.get(type);
          handler(data, sender, sendResponse);
        }
    }
  }

  /**
   * Send message to extension
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @returns {Promise<any>} Response from extension
   */
  async sendMessage(type, data) {
    if (!this.connected) {
      throw new Error('Chrome extension bridge not initialized');
    }

    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      this.pendingRequests.set(requestId, { resolve, reject });

      chrome.runtime.sendMessage(
        this.extensionId,
        { type, data, requestId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Execute inject script via Chrome extension
   * @param {string} action - Action name from INJECT_SCRIPTS_MAP
   * @param {...any} params - Parameters for the action
   * @returns {Promise<any>} Execution result
   */
  async executeInjectScript(action, ...params) {
    return await this.sendMessage('EXECUTE_INJECT', {
      action,
      params,
      timestamp: Date.now()
    });
  }

  /**
   * Execute multiple inject scripts in sequence
   * @param {Array} actions - Array of { action, params } objects
   * @returns {Promise<Array>} Results array
   */
  async executeBatch(actions) {
    return await this.sendMessage('EXECUTE_BATCH', {
      actions,
      timestamp: Date.now()
    });
  }

  /**
   * Get available inject scripts from extension
   * @returns {Promise<Object>} Available scripts
   */
  async getAvailableScripts() {
    return await this.sendMessage('GET_AVAILABLE_SCRIPTS');
  }

  /**
   * Test connection to extension
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const response = await this.sendMessage('PING');
      return response?.type === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Register custom message handler
   * @param {string} type - Message type
   * @param {Function} handler - Message handler
   */
  registerMessageHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle inject response
   * @private
   */
  handleInjectResponse(requestId, data) {
    if (this.pendingRequests.has(requestId)) {
      const { resolve } = this.pendingRequests.get(requestId);
      this.pendingRequests.delete(requestId);
      resolve(data);
    }
  }

  /**
   * Handle inject error
   * @private
   */
  handleInjectError(requestId, error) {
    if (this.pendingRequests.has(requestId)) {
      const { reject } = this.pendingRequests.get(requestId);
      this.pendingRequests.delete(requestId);
      reject(new Error(error));
    }
  }

  /**
   * Get extension ID from storage
   * @returns {Promise<string>} Extension ID
   */
  async getExtensionId() {
    return new Promise((resolve) => {
      if (chrome.storage) {
        chrome.storage.local.get(['extensionId'], (result) => {
          resolve(result.extensionId || null);
        });
      } else {
        resolve(localStorage.getItem('chromeExtensionId'));
      }
    });
  }

  /**
   * Save extension ID to storage
   * @param {string} extensionId - Extension ID to save
   */
  async saveExtensionId(extensionId) {
    if (chrome.storage) {
      chrome.storage.local.set({ extensionId });
    } else {
      localStorage.setItem('chromeExtensionId', extensionId);
    }
  }
}

/**
 * Content Script Injector
 * Handles injection of scripts into page context
 */
class ContentScriptInjector {
  constructor() {
    this.injectedScripts = new Set();
    this.isContentScript = typeof chrome !== 'undefined' && chrome.runtime;
  }

  /**
   * Inject script into page context
   * @param {string} scriptName - Name of the script to inject
   * @returns {Promise<boolean>} Success status
   */
  async injectScript(scriptName) {
    if (this.injectedScripts.has(scriptName)) {
      return true; // Already injected
    }

    try {
      if (this.isContentScript) {
        return await this.injectViaContentScript(scriptName);
      } else {
        return await this.injectViaDOM(scriptName);
      }
    } catch (error) {
      console.error(`Failed to inject script ${scriptName}:`, error);
      return false;
    }
  }

  /**
   * Inject script via content script
   * @private
   */
  async injectViaContentScript(scriptName) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'INJECT_SCRIPT',
        scriptName: scriptName
      }, (response) => {
        if (response && response.success) {
          this.injectedScripts.add(scriptName);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Inject script via DOM manipulation
   * @private
   */
  async injectViaDOM(scriptName) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(`/inject-scripts/${scriptName}`);
      script.onload = () => {
        this.injectedScripts.add(scriptName);
        resolve(true);
      };
      script.onerror = () => resolve(false);
      
      (document.head || document.documentElement).appendChild(script);
    });
  }

  /**
   * Check if script is already injected
   * @param {string} scriptName - Script name to check
   * @returns {boolean} Injection status
   */
  isScriptInjected(scriptName) {
    return this.injectedScripts.has(scriptName);
  }

  /**
   * Inject all available scripts
   * @returns {Promise<Object>} Injection results
   */
  async injectAllScripts() {
    const scripts = [
      'click-helper.js',
      'fill-helper.js',
      'keyboard-helper.js',
      'screenshot-helper.js',
      'network-helper.js',
      'interactive-elements-helper.js',
      'web-fetcher-helper.js'
    ];

    const results = {};
    
    for (const script of scripts) {
      results[script] = await this.injectScript(script);
    }

    return results;
  }
}

/**
 * Unified API for inject scripts
 * Provides a clean interface for Vue/React integration
 */
class InjectScriptsAPI {
  constructor() {
    this.bridge = new ChromeExtensionBridge();
    this.injector = new ContentScriptInjector();
    this.initialized = false;
  }

  /**
   * Initialize the API
   * @param {string} extensionId - Chrome extension ID
   * @returns {Promise<InjectScriptsAPI>} API instance
   */
  async initialize(extensionId = null) {
    if (this.initialized) return this;

    // Try to get extension ID from storage if not provided
    if (!extensionId) {
      extensionId = await this.bridge.getExtensionId();
    }

    if (extensionId) {
      this.bridge.initialize(extensionId);
      await this.bridge.saveExtensionId(extensionId);
      this.initialized = true;
    } else {
      console.warn('No extension ID provided, using fallback methods');
    }

    return this;
  }

  /**
   * Execute inject script
   * @param {string} action - Action name from INJECT_SCRIPTS_MAP
   * @param {...any} params - Parameters for the action
   * @returns {Promise<any>} Execution result
   */
  async execute(action, ...params) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.initialized) {
      return await this.bridge.executeInjectScript(action, ...params);
    } else {
      // Fallback to direct execution
      const { injectExecutor } = await import('./inject-executor.js');
      return await injectExecutor.execute(action, ...params);
    }
  }

  /**
   * Execute batch of actions
   * @param {Array} actions - Array of action objects
   * @returns {Promise<Array>} Results array
   */
  async executeBatch(actions) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.initialized) {
      return await this.bridge.executeBatch(actions);
    } else {
      const { injectExecutor } = await import('./inject-executor.js');
      return await injectExecutor.executeBatch(actions);
    }
  }

  /**
   * Get available actions
   * @returns {Promise<Object>} Available actions
   */
  async getAvailableActions() {
    const { INJECT_SCRIPTS_MAP } = await import('./inject-executor.js');
    return INJECT_SCRIPTS_MAP;
  }

  /**
   * Test extension connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.initialized ? await this.bridge.testConnection() : false;
  }

  /**
   * Get current extension ID
   * @returns {string} Extension ID
   */
  getExtensionId() {
    return this.bridge.extensionId;
  }
}

// Create singleton instances
const chromeExtensionBridge = new ChromeExtensionBridge();
const contentScriptInjector = new ContentScriptInjector();
const injectScriptsAPI = new InjectScriptsAPI();

// Export for use
export {
  ChromeExtensionBridge,
  ContentScriptInjector,
  InjectScriptsAPI,
  chromeExtensionBridge,
  contentScriptInjector,
  injectScriptsAPI
};

// Default export
export default injectScriptsAPI;

// Global setup for content scripts
if (typeof window !== 'undefined' && chrome.runtime) {
  // Content script message handler
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
      case 'EXECUTE_INJECT':
        handleExecuteInject(request, sendResponse);
        break;
      case 'EXECUTE_BATCH':
        handleExecuteBatch(request, sendResponse);
        break;
      case 'GET_AVAILABLE_SCRIPTS':
        handleGetAvailableScripts(sendResponse);
        break;
      default:
        sendResponse({ error: 'Unknown request type' });
    }
    return true; // Keep channel open
  });
}

/**
 * Handle execute inject request
 * @private
 */
async function handleExecuteInject(request, sendResponse) {
  try {
    const { action, params } = request.data;
    const { injectExecutor } = await import('./inject-executor.js');
    const result = await injectExecutor.execute(action, ...params);
    sendResponse({ success: true, result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle execute batch request
 * @private
 */
async function handleExecuteBatch(request, sendResponse) {
  try {
    const { actions } = request.data;
    const { injectExecutor } = await import('./inject-executor.js');
    const results = await injectExecutor.executeBatch(actions);
    sendResponse({ success: true, results });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get available scripts request
 * @private
 */
function handleGetAvailableScripts(sendResponse) {
  sendResponse({ success: true, scripts: INJECT_SCRIPTS_MAP });
}