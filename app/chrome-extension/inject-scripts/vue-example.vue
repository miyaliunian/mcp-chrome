<template>
  <div class="inject-automation-panel">
    <h2>Chrome Extension Inject Scripts - Vue Example</h2>
    
    <!-- Action Selection -->
    <div class="section">
      <h3>Select Action</h3>
      <select v-model="selectedAction" class="action-select">
        <option v-for="action in availableActions" :key="action.name" :value="action">
          {{ action.name }} - {{ action.description }}
        </option>
      </select>
    </div>

    <!-- Parameter Input -->
    <div v-if="selectedAction" class="section">
      <h3>Parameters</h3>
      <div v-for="(param, index) in selectedAction.params" :key="param" class="param-input">
        <label>{{ param }}:</label>
        <input 
          v-model="parameters[index]" 
          :placeholder="getParamPlaceholder(param)"
          class="param-field"
        />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <h3>Quick Actions</h3>
      <div class="quick-actions">
        <button @click="quickClick" class="btn btn-primary">Click Button</button>
        <button @click="quickFill" class="btn btn-primary">Fill Input</button>
        <button @click="quickScreenshot" class="btn btn-secondary">Take Screenshot</button>
        <button @click="findElements" class="btn btn-secondary">Find Elements</button>
      </div>
    </div>

    <!-- Batch Operations -->
    <div class="section">
      <h3>Batch Operations</h3>
      <div class="batch-config">
        <button @click="executeBatch" class="btn btn-warning">Execute Batch</button>
        <button @click="clearBatch" class="btn btn-secondary">Clear</button>
      </div>
      <div class="batch-items">
        <div v-for="(item, index) in batchActions" :key="index" class="batch-item">
          {{ item.action }}: {{ JSON.stringify(item.params) }}
          <button @click="removeFromBatch(index)" class="btn-remove">×</button>
        </div>
      </div>
    </div>

    <!-- Results Display -->
    <div class="section">
      <h3>Results</h3>
      <div v-if="loading" class="loading">Executing...</div>
      <div v-if="lastResult" class="result">
        <pre>{{ JSON.stringify(lastResult, null, 2) }}</pre>
      </div>
      <div v-if="lastError" class="error">
        <strong>Error:</strong> {{ lastError }}
      </div>
    </div>

    <!-- Debug Info -->
    <div class="section">
      <h3>Debug</h3>
      <button @click="testConnection" class="btn btn-info">Test Connection</button>
      <button @click="showAvailableActions" class="btn btn-info">Show Available Actions</button>
    </div>
  </div>
</template>

<script>
import { injectExecutor, INJECT_SCRIPTS_MAP } from './inject-executor.js'

export default {
  name: 'InjectAutomationPanel',
  data() {
    return {
      selectedAction: null,
      parameters: [],
      loading: false,
      lastResult: null,
      lastError: null,
      batchActions: [],
      extensionId: 'your-extension-id-here'
    }
  },
  computed: {
    availableActions() {
      return Object.entries(INJECT_SCRIPTS_MAP).map(([key, config]) => ({
        name: key,
        ...config
      }))
    }
  },
  watch: {
    selectedAction(newAction) {
      this.parameters = new Array(newAction.params.length).fill('')
    }
  },
  mounted() {
    // Initialize the executor
    if (this.extensionId !== 'your-extension-id-here') {
      // You would set this to your actual extension ID
      // injectExecutor.initialize(this.extensionId)
    }
    
    // Load saved batch actions
    const saved = localStorage.getItem('batchActions')
    if (saved) {
      this.batchActions = JSON.parse(saved)
    }
  },
  methods: {
    async executeAction() {
      if (!this.selectedAction) return

      this.loading = true
      this.lastError = null
      this.lastResult = null

      try {
        // Parse parameters based on type
        const parsedParams = this.parameters.map((param, index) => {
          const paramName = this.selectedAction.params[index]
          return this.parseParameter(param, paramName)
        })

        const result = await injectExecutor.execute(
          this.selectedAction.name,
          ...parsedParams
        )
        
        this.lastResult = result
        
        // Add to batch for future use
        this.addToBatch(this.selectedAction.name, parsedParams)
        
      } catch (error) {
        this.lastError = error.message
      } finally {
        this.loading = false
      }
    },

    // Quick action methods
    async quickClick() {
      this.selectedAction = this.availableActions.find(a => a.name === 'click')
      this.parameters = ['#submit-button', 'true', '5000', 'null']
      await this.executeAction()
    },

    async quickFill() {
      this.selectedAction = this.availableActions.find(a => a.name === 'fill')
      this.parameters = ['#email-input', 'test@example.com']
      await this.executeAction()
    },

    async quickScreenshot() {
      this.selectedAction = this.availableActions.find(a => a.name === 'screenshot')
      this.parameters = ['{ fullPage: true }']
      await this.executeAction()
    },

    async findElements() {
      this.selectedAction = this.availableActions.find(a => a.name === 'elements')
      this.parameters = ['{ types: ["button", "input"] }']
      await this.executeAction()
    },

    // Batch operations
    addToBatch(action, params) {
      this.batchActions.push({ action, params })
      this.saveBatch()
    },

    removeFromBatch(index) {
      this.batchActions.splice(index, 1)
      this.saveBatch()
    },

    async executeBatch() {
      if (this.batchActions.length === 0) {
        this.lastError = 'No batch actions configured'
        return
      }

      this.loading = true
      this.lastError = null
      this.lastResult = null

      try {
        const results = await injectExecutor.executeBatch(this.batchActions)
        this.lastResult = results
      } catch (error) {
        this.lastError = error.message
      } finally {
        this.loading = false
      }
    },

    clearBatch() {
      this.batchActions = []
      this.saveBatch()
    },

    saveBatch() {
      localStorage.setItem('batchActions', JSON.stringify(this.batchActions))
    },

    // Utility methods
    parseParameter(param, paramName) {
      if (!param || param === '') {
        return this.getDefaultValue(paramName)
      }

      try {
        // Try to parse as JSON for objects/arrays
        if (param.startsWith('{') || param.startsWith('[') || param === 'null' || param === 'true' || param === 'false') {
          return JSON.parse(param)
        }
        
        // Try to parse as number
        if (!isNaN(param)) {
          return Number(param)
        }
        
        // Return as string
        return param
      } catch {
        return param
      }
    },

    getDefaultValue(paramName) {
      const defaults = {
        selector: '#element',
        waitForNavigation: false,
        timeout: 5000,
        coordinates: null,
        value: 'test-value',
        keysSequenceString: 'Enter',
        targetElement: null,
        delay: 0,
        options: {}
      }
      return defaults[paramName] || null
    },

    getParamPlaceholder(param) {
      const placeholders = {
        selector: 'CSS selector, e.g., #submit-button',
        waitForNavigation: 'true/false - wait for page navigation',
        timeout: 'milliseconds, e.g., 5000',
        coordinates: '{ x: 100, y: 200 } - optional coordinates',
        value: 'value to fill, e.g., test@example.com',
        keysSequenceString: 'keyboard sequence, e.g., Enter,Ctrl+C',
        url: 'URL for network request',
        method: 'HTTP method, e.g., GET, POST',
        headers: '{ "Content-Type": "application/json" }',
        body: 'request body object'
      }
      return placeholders[param] || param
    },

    async testConnection() {
      try {
        const actions = injectExecutor.getAvailableActions()
        this.lastResult = { availableActions: Object.keys(actions) }
      } catch (error) {
        this.lastError = 'Extension not available: ' + error.message
      }
    },

    showAvailableActions() {
      this.lastResult = injectExecutor.getAvailableActions()
    }
  }
}
</script>

<style scoped>
.inject-automation-panel {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.section {
  margin-bottom: 25px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.section h3 {
  margin-top: 0;
  color: #333;
}

.action-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.param-input {
  margin-bottom: 10px;
}

.param-input label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.param-field {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary { background-color: #007bff; color: white; }
.btn-secondary { background-color: #6c757d; color: white; }
.btn-warning { background-color: #ffc107; color: black; }
.btn-info { background-color: #17a2b8; color: white; }

.batch-items {
  margin-top: 10px;
}

.batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 5px;
}

.btn-remove {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.result, .error {
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
}

.result { background-color: #d4edda; border: 1px solid #c3e6cb; }
.error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }

.loading {
  color: #007bff;
  font-style: italic;
}

pre {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
</style>