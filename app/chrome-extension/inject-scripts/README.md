# Chrome Extension Inject Scripts Integration

This directory contains the complete implementation for using Chrome extension inject scripts in Vue/React applications via map structure and New Function execution.

## 📁 Files Overview

- **`inject-executor.js`** - Core New Function execution wrapper
- **`chrome-integration.js`** - Chrome extension integration layer
- **`vue-example.vue`** - Complete Vue.js component example
- **`react-example.jsx`** - Complete React.js component example

## 🚀 Quick Start

### 1. Basic Usage

```javascript
// Import the executor
import { injectExecutor } from './inject-executor.js';

// Execute actions
const result = await injectExecutor.execute('click', '#submit-button', true, 5000);
console.log('Click result:', result);

// Fill form
const fillResult = await injectExecutor.execute('fill', '#email', 'test@example.com');
console.log('Fill result:', fillResult);
```

### 2. Vue.js Integration

```vue
<template>
  <InjectAutomationPanel />
</template>

<script>
import InjectAutomationPanel from './inject-scripts/vue-example.vue';

export default {
  components: { InjectAutomationPanel }
}
</script>
```

### 3. React Integration

```jsx
import React from 'react';
import InjectAutomationPanel from './inject-scripts/react-example';

function App() {
  return <InjectAutomationPanel />;
}
```

## 📋 Available Actions (Map Structure)

The system uses a map structure to define all available inject scripts:

### Click Actions
```javascript
{
  name: 'click',
  functionName: 'clickElement',
  params: ['selector', 'waitForNavigation', 'timeout', 'coordinates'],
  description: 'Click on elements by selector or coordinates'
}
```

### Form Actions
```javascript
{
  name: 'fill',
  functionName: 'fillElement',
  params: ['selector', 'value'],
  description: 'Fill form elements with values'
}
```

### Keyboard Actions
```javascript
{
  name: 'keyboard',
  functionName: 'simulateKeyboard',
  params: ['keysSequenceString', 'targetElement', 'delay'],
  description: 'Simulate keyboard input'
}
```

### Screenshot Actions
```javascript
{
  name: 'screenshot',
  functionName: 'captureScreenshot',
  params: ['options'],
  description: 'Capture page screenshots'
}
```

### Network Actions
```javascript
{
  name: 'network',
  functionName: 'replayNetworkRequest',
  params: ['url', 'method', 'headers', 'body', 'timeout'],
  description: 'Replay network requests'
}
```

### Element Discovery
```javascript
{
  name: 'elements',
  functionName: 'findInteractiveElements',
  params: ['options'],
  description: 'Find interactive elements on page'
}
```

### Content Extraction
```javascript
{
  name: 'webfetch',
  functionName: 'extractPageContent',
  params: ['options'],
  description: 'Extract readable page content'
}
```

## 🔧 New Function Execution

The system uses the New Function approach to dynamically execute inject scripts:

```javascript
// Create execution function
const executionFunction = new Function(`
  return (async () => {
    return await clickElement('#button', true, 5000);
  })();
`);

// Execute in page context
const result = await executionFunction();
```

## 🔄 Chrome Extension Integration

### Setup Chrome Extension

1. **Update manifest.json**:
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["inject-bridge.js"],
      "run_at": "document_end"
    }
  ],
  "permissions": [
    "activeTab",
    "scripting"
  ]
}
```

2. **Initialize with extension ID**:
```javascript
import { injectScriptsAPI } from './chrome-integration.js';

// Initialize with extension ID
await injectScriptsAPI.initialize('your-extension-id-here');

// Use unified API
const result = await injectScriptsAPI.execute('click', '#button');
```

### Extension Background Script

```javascript
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'EXECUTE_INJECT':
      handleExecuteInject(request, sender, sendResponse);
      break;
    case 'EXECUTE_BATCH':
      handleExecuteBatch(request, sender, sendResponse);
      break;
  }
  return true;
});

async function handleExecuteInject(request, sender, sendResponse) {
  const { action, params } = request.data;
  
  try {
    // Execute via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_INJECT',
      action,
      params
    });
    
    sendResponse({ success: true, result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

## 🎯 Advanced Usage Examples

### Batch Operations
```javascript
// Execute multiple actions
const batchActions = [
  { action: 'fill', params: ['#email', 'user@example.com'] },
  { action: 'fill', params: ['#password', 'secret123'] },
  { action: 'click', params: ['#login-button', true] }
];

const results = await injectExecutor.executeBatch(batchActions);
console.log('Batch results:', results);
```

### Custom Execution
```javascript
// Create custom execution pipeline
class AutomationPipeline {
  constructor() {
    this.actions = [];
  }

  add(action, ...params) {
    this.actions.push({ action, params });
    return this;
  }

  async execute() {
    return await injectExecutor.executeBatch(this.actions);
  }
}

// Usage
const pipeline = new AutomationPipeline()
  .add('fill', '#email', 'test@example.com')
  .add('fill', '#password', 'password123')
  .add('click', '#submit', true);

const results = await pipeline.execute();
```

### Error Handling
```javascript
// Robust error handling
try {
  const result = await injectExecutor.execute('click', '#non-existent-button');
} catch (error) {
  console.error('Automation failed:', error.message);
  // Handle specific error types
  if (error.message.includes('not found')) {
    // Handle element not found
  } else if (error.message.includes('timeout')) {
    // Handle timeout
  }
}
```

## 📊 Usage Statistics

The system provides built-in usage tracking:

```javascript
// Get available actions
const actions = injectExecutor.getAvailableActions();
console.log('Available:', Object.keys(actions));

// Validate parameters
const isValid = injectExecutor.validateParameters('click', ['#button', true, 5000]);
console.log('Valid:', isValid);
```

## 🎨 Custom Styling

### Vue Component Styles
```css
.inject-automation-panel {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.section {
  margin-bottom: 25px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

### React Component Styles
```css
.inject-automation-panel {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

## 🔍 Debugging

### Enable Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('inject-debug', 'true');

// Check connection
const connected = await injectScriptsAPI.testConnection();
console.log('Extension connected:', connected);

// Get detailed logs
const actions = await injectScriptsAPI.getAvailableActions();
console.log('Available actions:', actions);
```

### Common Issues

1. **Extension not found**: Ensure extension ID is correct
2. **Script not loaded**: Check content script permissions
3. **Function not available**: Verify script injection
4. **Timeout errors**: Increase timeout parameters

## 📦 Installation

1. Copy all files to your project
2. Update extension ID in initialization
3. Import required components
4. Start using inject scripts in your Vue/React app

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add new inject scripts to INJECT_SCRIPTS_MAP
4. Test with both Vue and React
5. Submit pull request

## 📄 License

MIT License - Feel free to use in your projects.