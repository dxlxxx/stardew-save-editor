const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 检查是否在Electron环境
  isElectron: true,
  
  // 保存文件对话框
  saveFileDialog: (defaultName, filters) => {
    return ipcRenderer.invoke('save-file-dialog', { defaultName, filters })
  },
  
  // 保存文件内容
  saveFile: (filePath, content) => {
    return ipcRenderer.invoke('save-file', { filePath, content })
  },
  
  // 读取文件
  readFile: (filePath) => {
    return ipcRenderer.invoke('read-file', filePath)
  },
  
  // 打开文件对话框
  openFileDialog: (options) => {
    return ipcRenderer.invoke('open-file-dialog', options)
  },
  
  // 打开文件夹对话框
  openDirectoryDialog: () => {
    return ipcRenderer.invoke('open-directory-dialog')
  },
  
  // 读取目录内容
  readDirectory: (dirPath) => {
    return ipcRenderer.invoke('read-directory', dirPath)
  },
  
  // 检查文件是否存在
  fileExists: (filePath) => {
    return ipcRenderer.invoke('file-exists', filePath)
  },
  
  // 检查是否为文件
  isFile: (filePath) => {
    return ipcRenderer.invoke('is-file', filePath)
  },
  
  // 拼接路径
  joinPath: (...parts) => {
    return ipcRenderer.invoke('join-path', ...parts)
  }
})
