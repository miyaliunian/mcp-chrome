<!--
 * @Author: 逗逗飞 wufei@strongdata.com.cn
 * @Date: 2025-08-04 17:01:18
 * @LastEditors: 逗逗飞 wufei@strongdata.com.cn
 * @LastEditTime: 2025-08-04 17:01:35
 * @FilePath: /mcp-chrome/REGISTER-DEV.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

```mermaid
  flowchart TD
      Start([register-dev.ts 启动]) --> Import[导入 utils.ts]
      Import --> CallRegister[调用 tryRegisterUserLevelHost()]

      CallRegister --> StartRegister[开始用户级注册流程]

      StartRegister --> Step1[1. ensureExecutionPermissions<br/>确保执行权限]
      Step1 --> Step1a{操作系统}
      Step1a --> |macOS/Linux| Step1b[chmod 755 关键文件]
      Step1a --> |Windows| Step1c[移除只读属性]

      Step1 --> Step2[2. 计算清单路径<br/>getUserManifestPath()]
      Step2 --> Step2a{操作系统}
      Step2a --> |macOS| Step2b[~/Library/.../NativeMessagingHosts/]
      Step2a --> |Windows| Step2c[%APPDATA%/.../NativeMessagingHosts/]
      Step2a --> |Linux| Step2d[~/.config/.../NativeMessagingHosts/]

      Step2 --> Step3[3. 确保目录存在<br/>mkdir -p]
      Step3 --> Step4[4. 创建清单内容<br/>createManifestContent()]

      Step4 --> Step5[5. 写入清单文件<br/>writeFile JSON.stringify]
      Step5 --> Step6{Windows?}

      Step6 --> |是| Step7[6. Windows注册表<br/>reg add HKCU\\...]
      Step6 --> |否| Step8[注册完成]

      Step7 --> Step7a[验证注册表项]
      Step7a --> |成功| Step8[✅ 注册成功]
      Step7a --> |失败| Step9[⚠️ 警告但继续]

      Step8 --> End([注册完成])
      Step9 --> End

      %% 异常处理
      StartRegister -.-> ErrorHandler[异常捕获]
      ErrorHandler --> ErrorLog[打印错误日志]
      ErrorLog --> End

```
