// 简化的 Native Host MVP 实现
// 这个文件模拟了原始 native-host.ts 的核心功能

interface ServerStatus {
  isRunning: boolean;
  port?: number;
  lastUpdated: number;
}

// 模拟消息类型
enum MessageType {
  CONNECT_NATIVE = 'CONNECT_NATIVE',
  DISCONNECT_NATIVE = 'DISCONNECT_NATIVE',
  PING_NATIVE = 'PING_NATIVE',
  START = 'START',
  SERVER_STARTED = 'SERVER_STARTED',
  SERVER_STOPPED = 'SERVER_STOPPED',
  CALL_TOOL = 'CALL_TOOL',
  TOOL_RESPONSE = 'TOOL_RESPONSE',
  ERROR = 'ERROR'
}

// 存储当前状态
let nativePort: any = null;
let currentServerStatus: ServerStatus = {
  isRunning: false,
  lastUpdated: Date.now()
};

// 模拟 Chrome API
const mockChrome = {
  runtime: {
    connectNative: (hostName: string) => {
      console.log(`[MVP] 连接到原生主机: ${hostName}`);
      return {
        onMessage: {
          addListener: (callback: (message: any) => void) => {
            console.log('[MVP] 添加消息监听器');
            // 模拟服务器启动消息
            setTimeout(() => {
              callback({
                type: MessageType.SERVER_STARTED,
                payload: { port: 3000 }
              });
            }, 1000);
          }
        },
        onDisconnect: {
          addListener: (callback: () => void) => {
            console.log('[MVP] 添加断开连接监听器');
          }
        },
        postMessage: (message: any) => {
          console.log('[MVP] 发送消息到原生主机:', message);
        },
        disconnect: () => {
          console.log('[MVP] 断开连接');
        }
      };
    },
    lastError: null,
    sendMessage: (message: any) => {
      console.log('[MVP] 广播消息:', message);
    },
    onStartup: {
      addListener: (callback: () => void) => {
        console.log('[MVP] 添加启动监听器');
      }
    },
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => {
        console.log('[MVP] 添加消息监听器');
      }
    }
  },
  storage: {
    local: {
      set: (data: any) => {
        console.log('[MVP] 保存到存储:', data);
        return Promise.resolve();
      },
      get: (keys: string[]) => {
        console.log('[MVP] 从存储获取:', keys);
        return Promise.resolve({});
      }
    }
  }
};

// 简化的连接函数
export function connectNativeHost(port: number = 3000) {
  if (nativePort) {
    console.log('[MVP] 已连接，跳过');
    return;
  }

  try {
    console.log(`[MVP] 尝试连接到原生主机，端口: ${port}`);
    nativePort = mockChrome.runtime.connectNative('com.chromemcp.nativehost');
    
    // 模拟消息处理
    nativePort.onMessage.addListener((message: any) => {
      console.log('[MVP] 收到消息:', message);
      
      switch (message.type) {
        case MessageType.SERVER_STARTED:
          currentServerStatus = {
            isRunning: true,
            port: message.payload.port,
            lastUpdated: Date.now()
          };
          console.log('[MVP] 服务器已启动:', currentServerStatus);
          break;
          
        case MessageType.SERVER_STOPPED:
          currentServerStatus = {
            isRunning: false,
            lastUpdated: Date.now()
          };
          console.log('[MVP] 服务器已停止');
          break;
          
        case MessageType.CALL_TOOL:
          console.log('[MVP] 处理工具调用:', message.payload);
          // 模拟工具响应
          setTimeout(() => {
            nativePort?.postMessage({
              responseToRequestId: message.requestId,
              payload: {
                status: 'success',
                data: { result: '工具执行成功', tool: message.payload.toolName }
              }
            });
          }, 500);
          break;
      }
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('[MVP] 连接已断开');
      nativePort = null;
    });

    // 发送启动消息
    nativePort.postMessage({ type: MessageType.START, payload: { port } });
    
  } catch (error) {
    console.error('[MVP] 连接失败:', error);
  }
}

// 初始化函数
export function initMVP() {
  console.log('[MVP] 初始化 Native Host MVP');
  
  // 添加消息监听
  window.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'CONNECT_NATIVE':
        connectNativeHost(payload?.port || 3000);
        break;
        
      case 'DISCONNECT_NATIVE':
        if (nativePort) {
          nativePort.disconnect();
          nativePort = null;
        }
        break;
        
      case 'GET_STATUS':
        window.postMessage({
          type: 'STATUS_RESPONSE',
          payload: {
            connected: nativePort !== null,
            serverStatus: currentServerStatus
          }
        }, '*');
        break;
    }
  });
  
  console.log('[MVP] Native Host MVP 已就绪');
}

// 启动 MVP
initMVP();