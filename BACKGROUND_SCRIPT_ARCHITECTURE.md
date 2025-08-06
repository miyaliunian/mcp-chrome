# Chrome 扩展后台脚本 (native-host.ts) 工作流程解析

本文档详细解释了 `app/chrome-extension/entrypoints/background/native-host.ts` 文件的功能和执行逻辑。该文件是整个 Chrome 扩展的后台核心，扮演着“大脑”和“总控制室”的角色，只要 Chrome 浏览器处于打开状态，它就会在后台持续运行。

## 核心职责

该后台脚本主要有两大职责：

1.  **管理与本地程序的连接**：负责启动、维护和关闭与 `native-server` (Node.js 本地应用) 的通信连接。
2.  **作为扩展的内部通信枢纽**：处理来自扩展其他部分（如弹出窗口 UI）的请求，并协调与本地程序的数据交换。

## 关键 Chrome API 解析 (`chrome.runtime.*`)

理解此文件的关键在于理解 Chrome 为扩展提供的 `runtime` API。

### 1. `chrome.runtime.connectNative(HOST_NAME)`

- **功能**：这是连接本地程序的“特殊 `fetch`”。它请求 Chrome 启动在清单文件中注册的、名为 `HOST_NAME` (`com.chromemcp.nativehost`) 的本地程序。
- **返回**：一个 `Port` 对象，可以理解为一条与本地程序建立的、活跃的“电话线路”或“对讲机”。

### 2. `port.onMessage.addListener(...)`

- **功能**：为“电话线路”(`port`) 添加一个事件监听器。当本地程序通过这条线路发来消息时，此监听器内的函数就会被执行。
- **作用**：处理所有来自 `native-server` 的响应和事件，例如 `SERVER_STARTED`、`CALL_TOOL` 的结果等。

### 3. `port.onDisconnect.addListener(...)`

- **功能**：为“电话线路”添加一个断开连接的监听器。当连接意外中断或被关闭时，此函数被执行。
- **作用**：处理清理工作，例如将 `nativePort` 变量设为 `null`，并记录错误。

### 4. `port.postMessage(...)`

- **功能**：通过“电话线路”向本地程序**发送**消息。
- **作用**：用于向 `native-server` 发送指令，例如 `START` 指令，或返回工具调用的结果。

### 5. `chrome.runtime.onMessage.addListener(...)`

- **功能**：这是扩展的**内部**消息总机。它监听来自**同一扩展其他部分**（如 Popup 弹窗、Content Script 等）的消息。
- **作用**：接收来自 UI 的指令，例如用户点击“连接”按钮后，UI 会发送 `CONNECT_NATIVE` 消息，由这个监听器捕获并处理。

### 6. `chrome.runtime.onStartup.addListener(...)`

- **功能**：注册一个只在特定时机触发的事件监听器。
- **执行时机**：仅在**整个 Chrome 浏览器从关闭状态完全启动时**触发一次。它不会在重载扩展或打开新窗口时触发。
- **作用**：实现“开机自启”功能，让扩展在浏览器启动后自动尝试连接到本地服务，无需用户手动操作。

## 主要执行流程

代码的执行可以分为两大典型场景：

### 场景一：浏览器启动时的自动连接流程

此流程实现了扩展的自动初始化和连接。

1.  **`initNativeHostListener()` 被执行**
    - 作为后台脚本的入口，此函数在扩展加载时首先被调用。
2.  **`initNativeHostListener()` 内部流程**
    - **a. `loadServerStatus()`**: 异步从 Chrome 本地存储中加载上次保存的服务器状态。
    - **b. `chrome.runtime.onStartup.addListener(connectNativeHost)`**: **预约**一个任务。告诉 Chrome 在下一次浏览器启动时，自动调用 `connectNativeHost` 函数。
    - **c. `chrome.runtime.onMessage.addListener(...)`**: 设置内部消息总机，开始监听来自扩展其他部分的消息。
3.  **浏览器启动事件触发**
    - 当用户启动 Chrome 时，第 2b 步预约的 `onStartup` 事件被触发。
    - Chrome 自动调用 `connectNativeHost()` 函数。
4.  **`connectNativeHost()` 内部流程**
    - **a. `chrome.runtime.connectNative(...)`**: 建立与本地程序的连接。
    - **b. `nativePort.onMessage.addListener(...)`**: 设置消息监听器，处理来自 Node.js 的数据。
    - **c. `nativePort.onDisconnect.addListener(...)`**: 设置断开连接的处理器。
    - **d. `nativePort.postMessage(...)`**: 连接成功后，立即发送 `START` 消息，激活本地程序。

### 场景二：用户点击UI时的手动连接流程

此流程展示了扩展内部的通信与协作。

1.  **用户在弹窗 UI 中点击“连接”按钮**
    - UI 脚本调用 `chrome.runtime.sendMessage({ type: 'CONNECT_NATIVE' })`，向后台脚本发送指令。
2.  **后台的 `onMessage` 监听器被触发**
    - 在 `initNativeHostListener` 中设置的总机接收到这条消息，并匹配到 `CONNECT_NATIVE` 类型。
3.  **`connectNativeHost()` 被调用**
    - 总机内的代码调用 `connectNativeHost()` 函数来执行连接任务。
4.  **执行连接**
    - 此处的流程与**场景一的第 4 步完全相同**，完成实际的连接和初始化。
5.  **`sendResponse(...)` 被调用**
    - 在 `onMessage` 监听器中，`connectNativeHost` 执行后会调用 `sendResponse`，向 UI 回复一个确认消息，UI 可以据此更新界面状态。

## 总结

`native-host.ts` 通过 `initNativeHostListener` 函数初始化了所有的事件监听器，构建了一个响应式的后台服务。它既能通过 `onStartup` 事件在浏览器启动时自动连接，也能通过 `onMessage` 机制响应用户的实时操作，是连接扩展前端 UI 和本地原生程序的关键桥梁。
