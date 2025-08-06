/**
 * Inject Executor - New Function based execution wrapper
 * Executes inject-scripts via map structure and New Function approach
 */

// Map structure for all available inject scripts
const INJECT_SCRIPTS_MAP = {
  click: {
    name: 'click',
    script: 'click-helper.js',
    functionName: 'clickElement',
    params: ['selector', 'waitForNavigation', 'timeout', 'coordinates'],
    description: 'Click on elements by selector or coordinates',
  },
  fill: {
    name: 'fill',
    script: 'fill-helper.js',
    functionName: 'fillElement',
    params: ['selector', 'value'],
    description: 'Fill form elements with values',
  },
  keyboard: {
    name: 'keyboard',
    script: 'keyboard-helper.js',
    functionName: 'simulateKeyboard',
    params: ['keysSequenceString', 'targetElement', 'delay'],
    description: 'Simulate keyboard input',
  },
  screenshot: {
    name: 'screenshot',
    script: 'screenshot-helper.js',
    functionName: 'captureScreenshot',
    params: ['options'],
    description: 'Capture page screenshots',
  },
  network: {
    name: 'network',
    script: 'network-helper.js',
    functionName: 'replayNetworkRequest',
    params: ['url', 'method', 'headers', 'body', 'timeout'],
    description: 'Replay network requests',
  },
  elements: {
    name: 'elements',
    script: 'interactive-elements-helper.js',
    functionName: 'findInteractiveElements',
    params: ['options'],
    description: 'Find interactive elements on page',
  },
  webfetch: {
    name: 'webfetch',
    script: 'web-fetcher-helper.js',
    functionName: 'extractPageContent',
    params: ['options'],
    description: 'Extract readable page content',
  },
};

/**
 * Inject Executor Class
 * Handles New Function execution of inject scripts
 */
class InjectExecutor {
  constructor() {
    this.scriptsMap = INJECT_SCRIPTS_MAP;
    this.executionCache = new Map();
  }

  /**
   * Execute inject script via New Function
   * @param {string} action - Action name from map
   * @param {...any} params - Parameters for the action
   * @returns {Promise<any>} Execution result
   */
  async execute(action, ...params) {
    const scriptConfig = this.scriptsMap[action];
    if (!scriptConfig) {
      throw new Error(
        `Unknown action: ${action}. Available: ${Object.keys(this.scriptsMap).join(', ')}`,
      );
    }

    return await this.executeWithNewFunction(scriptConfig, params);
  }

  /**
   * Execute script using New Function approach
   * @private
   */
  async executeWithNewFunction(scriptConfig, params) {
    try {
      // Build function parameter string
      const paramString = params.map((p) => this.serializeParameter(p)).join(', ');

      // Create execution function
      const executionFunction = this.createExecutionFunction(scriptConfig, paramString);

      // Execute in page context
      return await this.executeInPageContext(executionFunction);
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Create execution function using New Function
   * @private
   */
  createExecutionFunction(scriptConfig, paramString) {
    const functionBody = `
      return (async () => {
        try {
          // Check if function exists in page context
          if (typeof ${scriptConfig.functionName} === 'function') {
            return await ${scriptConfig.functionName}(${paramString});
          }
          
          // If not found, try to inject the script dynamically
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('/inject-scripts/${scriptConfig.script}');
          document.head.appendChild(script);
          
          // Wait for script to load
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load script'));
          });
          
          // Now execute the function
          if (typeof ${scriptConfig.functionName} === 'function') {
            return await ${scriptConfig.functionName}(${paramString});
          } else {
            throw new Error('${scriptConfig.functionName} not available after script injection');
          }
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      })();
    `;

    // Create New Function
    return new Function(functionBody);
  }

  /**
   * Execute function in page context
   * @private
   */
  async executeInPageContext(executionFunction) {
    return new Promise((resolve, reject) => {
      const requestId = `exec-${Date.now()}-${Math.random()}`;

      // Create message event
      const message = {
        type: 'INJECT_EXECUTE',
        requestId: requestId,
        code: executionFunction.toString(),
      };

      // Set up response listener
      const handleResponse = (event) => {
        if (event.data.type === 'INJECT_RESPONSE' && event.data.requestId === requestId) {
          window.removeEventListener('message', handleResponse);

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      window.addEventListener('message', handleResponse);

      // Send to page context
      window.postMessage(message, '*');

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        reject(new Error('Execution timeout'));
      }, 30000);
    });
  }

  /**
   * Serialize parameters for New Function
   * @private
   */
  serializeParameter(param) {
    if (param === null || param === undefined) {
      return 'null';
    }

    if (typeof param === 'string') {
      return JSON.stringify(param);
    }

    if (typeof param === 'number' || typeof param === 'boolean') {
      return String(param);
    }

    if (typeof param === 'object') {
      return JSON.stringify(param);
    }

    return 'null';
  }

  /**
   * Get available actions
   * @returns {Object} Available actions
   */
  getAvailableActions() {
    const actions = {};
    Object.keys(this.scriptsMap).forEach((key) => {
      actions[key] = {
        description: this.scriptsMap[key].description,
        params: this.scriptsMap[key].params,
        example: this.generateExample(this.scriptsMap[key]),
      };
    });
    return actions;
  }

  /**
   * Generate example usage
   * @private
   */
  generateExample(scriptConfig) {
    const paramExamples = {
      selector: "'#submit-button'",
      waitForNavigation: 'true',
      timeout: '5000',
      coordinates: '{ x: 100, y: 200 }',
      value: "'test@example.com'",
      keysSequenceString: "'Enter,Ctrl+C'",
      targetElement: 'null',
      delay: '100',
      options: '{ includeCoordinates: true }',
      url: "'https://api.example.com/data'",
      method: "'POST'",
      headers: "{ 'Content-Type': 'application/json' }",
      body: "{ key: 'value' }",
    };

    const params = scriptConfig.params.map((p) => paramExamples[p] || 'null');
    return `injectExecutor.execute('${scriptConfig.name}', ${params.join(', ')});`;
  }

  /**
   * Batch execute multiple actions
   * @param {Array} actions - Array of action objects
   * @returns {Promise<Array>} Results array
   */
  async executeBatch(actions) {
    const results = [];

    for (const actionObj of actions) {
      try {
        const result = await this.execute(actionObj.action, ...actionObj.params);
        results.push({
          action: actionObj.action,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          action: actionObj.action,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Validate parameters
   * @param {string} action - Action name
   * @param {Array} params - Parameters to validate
   * @returns {boolean} Validation result
   */
  validateParameters(action, params) {
    const scriptConfig = this.scriptsMap[action];
    if (!scriptConfig) return false;

    // Basic parameter count validation
    const minParams = scriptConfig.params.filter((p) => !p.includes('=')).length;
    return params.length >= minParams;
  }

  /**
   * Clear execution cache
   */
  clearCache() {
    this.executionCache.clear();
  }
}

// Create global instance
const injectExecutor = new InjectExecutor();

// Page context execution setup
if (typeof window !== 'undefined') {
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'INJECT_EXECUTE' && event.data.code) {
      try {
        // Create function from string and execute
        const executeFn = new Function('return ' + event.data.code);
        const result = await executeFn();

        // Send response back
        window.postMessage(
          {
            type: 'INJECT_RESPONSE',
            requestId: event.data.requestId,
            result: result,
          },
          '*',
        );
      } catch (error) {
        window.postMessage(
          {
            type: 'INJECT_RESPONSE',
            requestId: event.data.requestId,
            error: error.message,
          },
          '*',
        );
      }
    }
  });
}

// Export for use in Vue/React
export { InjectExecutor, INJECT_SCRIPTS_MAP, injectExecutor };

// Default export
export default injectExecutor;
