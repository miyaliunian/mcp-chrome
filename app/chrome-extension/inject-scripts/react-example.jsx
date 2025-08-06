import React, { useState, useEffect } from 'react';
import { injectExecutor, INJECT_SCRIPTS_MAP } from './inject-executor.js';

const InjectAutomationPanel = () => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [batchActions, setBatchActions] = useState([]);
  const [extensionId, setExtensionId] = useState('your-extension-id-here');

  // Available actions
  const availableActions = Object.entries(INJECT_SCRIPTS_MAP).map(([key, config]) => ({
    name: key,
    ...config
  }));

  // Initialize component
  useEffect(() => {
    // Load saved batch actions
    const saved = localStorage.getItem('react-batch-actions');
    if (saved) {
      setBatchActions(JSON.parse(saved));
    }

    // Initialize executor
    if (extensionId !== 'your-extension-id-here') {
      // You would initialize with your actual extension ID
    }
  }, [extensionId]);

  // Update parameters when action changes
  useEffect(() => {
    if (selectedAction) {
      setParameters(new Array(selectedAction.params.length).fill(''));
    }
  }, [selectedAction]);

  // Execute single action
  const executeAction = async () => {
    if (!selectedAction) return;

    setLoading(true);
    setLastError(null);
    setLastResult(null);

    try {
      const parsedParams = parameters.map((param, index) => 
        parseParameter(param, selectedAction.params[index])
      );

      const result = await injectExecutor.execute(
        selectedAction.name,
        ...parsedParams
      );

      setLastResult(result);
      
      // Add to batch
      addToBatch(selectedAction.name, parsedParams);
      
    } catch (error) {
      setLastError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick action methods
  const quickClick = async () => {
    setSelectedAction(availableActions.find(a => a.name === 'click'));
    setParameters(['#submit-button', 'true', '5000', 'null']);
    // Execute immediately
    setTimeout(executeAction, 100);
  };

  const quickFill = async () => {
    setSelectedAction(availableActions.find(a => a.name === 'fill'));
    setParameters(['#email-input', 'test@example.com']);
    setTimeout(executeAction, 100);
  };

  const quickScreenshot = async () => {
    setSelectedAction(availableActions.find(a => a.name === 'screenshot'));
    setParameters(['{ fullPage: true }']);
    setTimeout(executeAction, 100);
  };

  const findElements = async () => {
    setSelectedAction(availableActions.find(a => a.name === 'elements'));
    setParameters(['{ types: ["button", "input"] }']);
    setTimeout(executeAction, 100);
  };

  // Parameter handling
  const parseParameter = (param, paramName) => {
    if (!param || param === '') {
      return getDefaultValue(paramName);
    }

    try {
      if (param.startsWith('{') || param.startsWith('[') || param === 'null' || param === 'true' || param === 'false') {
        return JSON.parse(param);
      }
      
      if (!isNaN(param)) {
        return Number(param);
      }
      
      return param;
    } catch {
      return param;
    }
  };

  const getDefaultValue = (paramName) => {
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
    };
    return defaults[paramName] || null;
  };

  const getParamPlaceholder = (param) => {
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
    };
    return placeholders[param] || param;
  };

  // Batch operations
  const addToBatch = (action, params) => {
    const newBatch = [...batchActions, { action, params }];
    setBatchActions(newBatch);
    localStorage.setItem('react-batch-actions', JSON.stringify(newBatch));
  };

  const removeFromBatch = (index) => {
    const newBatch = batchActions.filter((_, i) => i !== index);
    setBatchActions(newBatch);
    localStorage.setItem('react-batch-actions', JSON.stringify(newBatch));
  };

  const executeBatch = async () => {
    if (batchActions.length === 0) {
      setLastError('No batch actions configured');
      return;
    }

    setLoading(true);
    setLastError(null);
    setLastResult(null);

    try {
      const results = await injectExecutor.executeBatch(batchActions);
      setLastResult(results);
    } catch (error) {
      setLastError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearBatch = () => {
    setBatchActions([]);
    localStorage.removeItem('react-batch-actions');
  };

  // Utility methods
  const testConnection = async () => {
    try {
      const actions = injectExecutor.getAvailableActions();
      setLastResult({ availableActions: Object.keys(actions) });
    } catch (error) {
      setLastError('Extension not available: ' + error.message);
    }
  };

  const showAvailableActions = () => {
    setLastResult(injectExecutor.getAvailableActions());
  };

  // Parameter input handlers
  const handleParameterChange = (index, value) => {
    const newParams = [...parameters];
    newParams[index] = value;
    setParameters(newParams);
  };

  return (
    <div className="inject-automation-panel">
      <h2>Chrome Extension Inject Scripts - React Example</h2>

      {/* Action Selection */}
      <div className="section">
        <h3>Select Action</h3>
        <select 
          value={selectedAction?.name || ''} 
          onChange={(e) => setSelectedAction(availableActions.find(a => a.name === e.target.value))}
          className="action-select"
        >
          <option value="">Select an action...</option>
          {availableActions.map(action => (
            <option key={action.name} value={action.name}>
              {action.name} - {action.description}
            </option>
          ))}
        </select>
      </div>

      {/* Parameter Input */}
      {selectedAction && (
        <div className="section">
          <h3>Parameters</h3>
          {selectedAction.params.map((param, index) => (
            <div key={param} className="param-input">
              <label>{param}:</label>
              <input
                type="text"
                value={parameters[index] || ''}
                onChange={(e) => handleParameterChange(index, e.target.value)}
                placeholder={getParamPlaceholder(param)}
                className="param-field"
              />
            </div>
          ))}
          <button onClick={executeAction} disabled={loading} className="btn btn-primary">
            {loading ? 'Executing...' : 'Execute Action'}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button onClick={quickClick} disabled={loading} className="btn btn-primary">
            Click Button
          </button>
          <button onClick={quickFill} disabled={loading} className="btn btn-primary">
            Fill Input
          </button>
          <button onClick={quickScreenshot} disabled={loading} className="btn btn-secondary">
            Take Screenshot
          </button>
          <button onClick={findElements} disabled={loading} className="btn btn-secondary">
            Find Elements
          </button>
        </div>
      </div>

      {/* Batch Operations */}
      <div className="section">
        <h3>Batch Operations</h3>
        <div className="batch-config">
          <button onClick={executeBatch} disabled={loading || batchActions.length === 0} className="btn btn-warning">
            Execute Batch ({batchActions.length})
          </button>
          <button onClick={clearBatch} className="btn btn-secondary">Clear</button>
        </div>
        <div className="batch-items">
          {batchActions.map((item, index) => (
            <div key={index} className="batch-item">
              <span>{item.action}: {JSON.stringify(item.params)}</span>
              <button onClick={() => removeFromBatch(index)} className="btn-remove">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Results Display */}
      <div className="section">
        <h3>Results</h3>
        {loading && <div className="loading">Executing...</div>}
        {lastResult && (
          <div className="result">
            <pre>{JSON.stringify(lastResult, null, 2)}</pre>
          </div>
        )}
        {lastError && (
          <div className="error">
            <strong>Error:</strong> {lastError}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="section">
        <h3>Debug</h3>
        <div className="debug-controls">
          <button onClick={testConnection} className="btn btn-info">Test Connection</button>
          <button onClick={showAvailableActions} className="btn btn-info">Show Available Actions</button>
        </div>
        <div className="extension-config">
          <label>Extension ID:</label>
          <input
            type="text"
            value={extensionId}
            onChange={(e) => setExtensionId(e.target.value)}
            placeholder="Enter Chrome extension ID"
            className="param-field"
          />
        </div>
      </div>
    </div>
  );
};

// CSS styles as JavaScript object
const styles = `
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  padding: 8px;
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

.pre {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  white-space: pre-wrap;
}

.debug-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.extension-config {
  margin-top: 10px;
}
`;

// CSS injection
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default InjectAutomationPanel;