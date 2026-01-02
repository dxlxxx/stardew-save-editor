# 星露谷存档编辑器 - 桌面版使用说明

## 功能特性

- ✅ 支持浏览器和桌面两种运行模式
- ✅ 桌面版使用原生文件对话框保存文件
- ✅ 浏览器版使用下载方式保存文件
- ✅ 同一套前端代码，自动检测运行环境

## 运行方式

### 方式1：桌面应用（推荐）

1. 启动开发服务器：
```bash
npm run dev
```

2. 在新终端启动Electron：
```bash
# Windows PowerShell
$env:NODE_ENV="development"
npx electron .
```

### 方式2：浏览器访问

直接运行：
```bash
npm run dev
```

然后在浏览器打开 http://localhost:5173

## 文件保存行为

### 桌面版 (Electron)
- 点击"导出修改后的存档"时，会弹出**系统原生文件保存对话框**
- 可以自由选择保存位置和文件名
- 文件直接保存到选择的位置，无扩展名

### 浏览器版
- 点击"导出修改后的存档"时，文件会下载到浏览器默认下载文件夹
- 文件名为原文件名，无扩展名

## 开发说明

### 关键文件

- `electron/main.cjs` - Electron主进程
- `electron/preload.cjs` - 预加载脚本（IPC桥接）
- `src/utils/fileHandler.js` - 文件处理（环境检测+分支逻辑）
- `src/App.vue` - 主界面（显示当前运行环境）

### 环境检测逻辑

```javascript
// fileHandler.js
const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.electronAPI && 
         window.electronAPI.isElectron
}

export async function exportSaveFile(content, fileName) {
  if (isElectron()) {
    // 使用Electron的原生文件对话框
    const result = await window.electronAPI.saveFileDialog(fileName, ...)
    await window.electronAPI.saveFile(result.filePath, content)
  } else {
    // 使用浏览器下载
    saveAs(blob, fileName)
  }
}
```

### IPC通信

Electron预加载脚本暴露了以下API：

```javascript
window.electronAPI = {
  isElectron: true,
  saveFileDialog: (defaultPath, filters) => Promise<{canceled, filePath}>,
  saveFile: (filePath, content) => Promise<{success, error}>,
  readFile: (filePath) => Promise<{success, content, error}>,
  openFileDialog: (filters) => Promise<{canceled, filePath}>
}
```

## 构建发布版

```bash
# 构建Web版本
npm run build

# 构建桌面版本（需要配置electron-builder）
npm run build:electron
```

## 注意事项

1. **开发时**：需要同时运行Vite开发服务器和Electron
2. **package.json的type字段**：设为"module"，Electron文件使用.cjs扩展名
3. **安全性**：使用contextIsolation + preload脚本，避免直接暴露Node.js API
4. **网络问题**：如果Electron下载慢，设置镜像源：
   ```bash
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   npm install electron --save-dev
   ```
