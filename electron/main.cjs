const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: '星露谷物语存档编辑器',
    autoHideMenuBar: true,  // 自动隐藏菜单栏
    frame: true,             // 保留窗口边框
    titleBarStyle: 'default' // 使用默认标题栏样式
  })

  // 开发环境加载Vite服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 保存文件对话框
ipcMain.handle('save-file-dialog', async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (result.canceled) {
    return { canceled: true }
  }
  
  return { canceled: false, filePath: result.filePath }
})

// 保存文件内容
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // 尝试多种编码方式读取
    let content = null
    
    try {
      // 首先尝试 UTF-8
      content = fs.readFileSync(filePath, 'utf-8')
      if (content && content.trim().length > 0) {
        return { success: true, content }
      }
    } catch (e) {
      console.log('UTF-8 读取失败，尝试其他编码')
    }
    
    try {
      // 尝试 latin1 (ISO-8859-1)
      content = fs.readFileSync(filePath, 'latin1')
      if (content && content.trim().length > 0) {
        return { success: true, content }
      }
    } catch (e) {
      console.log('Latin1 读取失败')
    }
    
    // 最后尝试以 buffer 读取然后转换
    const buffer = fs.readFileSync(filePath)
    content = buffer.toString('utf-8')
    
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 拼接路径
ipcMain.handle('join-path', async (event, ...parts) => {
  try {
    return { success: true, path: path.join(...parts) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 打开文件对话框
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (result.canceled) {
    return { canceled: true }
  }
  
  return { canceled: false, filePath: result.filePaths[0] }
})

// 打开文件夹对话框
ipcMain.handle('open-directory-dialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  
  if (result.canceled) {
    return { canceled: true }
  }
  
  return { canceled: false, dirPath: result.filePaths[0] }
})

// 读取目录内容
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    console.log('读取目录:', dirPath)
    const files = fs.readdirSync(dirPath)
    console.log('找到的文件:', files)
    return { success: true, files }
  } catch (error) {
    console.error('读取目录失败:', error)
    return { success: false, error: error.message }
  }
})

// 检查文件是否存在
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return { success: true, exists: fs.existsSync(filePath) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 检查是否为文件
ipcMain.handle('is-file', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath)
    return { success: true, isFile: stats.isFile() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
