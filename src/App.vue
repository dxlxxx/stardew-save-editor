<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FileUpload from './components/FileUpload.vue'
import DirectoryPicker from './components/DirectoryPicker.vue'
import PlayerList from './components/PlayerList.vue'
import { parseXML, buildXML, extractPlayersInfo, migrateHost, updateSaveGameInfo, fixNullableFields } from './utils/xmlParser'
import { readFileAsText, exportSaveFile, validateSaveFile, validateSaveGameInfo, getEnvironment, loadSaveFromDirectory, saveFileDirectly } from './utils/fileHandler'

const loading = ref(false)
const saveData = ref(null)
const saveInfoData = ref(null)
const playersInfo = ref(null)
const originalFileName = ref('')
const originalSaveInfoName = ref('SaveGameInfo')
const xmlContent = ref('')
const saveInfoContent = ref('')
const hasSaveInfo = ref(false)
const currentEnvironment = ref('browser')

// Electron 环境专用
const saveFilePath = ref('')
const saveInfoPath = ref('')
const currentDirectory = ref('')

onMounted(() => {
  currentEnvironment.value = getEnvironment()
  console.log('当前运行环境:', currentEnvironment.value)
})

// 处理目录选择（Electron环境）
const handleDirectorySelected = async (dirPath) => {
  loading.value = true
  try {
    currentDirectory.value = dirPath
    
    // 从目录加载存档
    const result = await loadSaveFromDirectory(dirPath)
    
    // 处理主存档
    xmlContent.value = result.saveFile.content
    originalFileName.value = result.saveFile.name
    saveFilePath.value = result.saveFile.path
    
    console.log('存档文件名:', result.saveFile.name)
    console.log('文件内容长度:', result.saveFile.content.length)
    console.log('文件开头:', result.saveFile.content.substring(0, 200))
    
    if (!validateSaveFile(result.saveFile.content)) {
      ElMessage.error('这不是有效的星露谷存档文件')
      console.error('验证失败，文件不包含必需的标签')
      return
    }
    
    saveData.value = parseXML(result.saveFile.content)
    playersInfo.value = extractPlayersInfo(saveData.value)
    
    // 处理SaveGameInfo（如果存在）
    if (result.saveInfo) {
      saveInfoContent.value = result.saveInfo.content
      saveInfoPath.value = result.saveInfo.path
      
      if (validateSaveGameInfo(result.saveInfo.content)) {
        saveInfoData.value = parseXML(result.saveInfo.content)
        hasSaveInfo.value = true
        ElMessage.success('存档和SaveGameInfo加载成功！')
      } else {
        ElMessage.warning('主存档加载成功，但SaveGameInfo文件格式不正确')
      }
    } else {
      hasSaveInfo.value = false
      ElMessage.success('主存档加载成功！未找到SaveGameInfo文件')
    }
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error(`加载失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 处理主存档文件上传
const handleFileLoaded = async (file) => {
  loading.value = true
  try {
    // 读取文件内容
    const content = await readFileAsText(file)
    xmlContent.value = content
    originalFileName.value = file.name
    
    // 验证文件格式
    if (!validateSaveFile(content)) {
      ElMessage.error('这不是有效的星露谷存档文件')
      return
    }
    
    // 解析 XML
    const parsed = parseXML(content)
    saveData.value = parsed
    
    // 提取玩家信息
    playersInfo.value = extractPlayersInfo(parsed)
    
    ElMessage.success('主存档加载成功！')
  } catch (error) {
    console.error('文件加载失败:', error)
    ElMessage.error(`加载失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 处理SaveGameInfo文件上传（可选）
const handleSaveInfoLoaded = async (file) => {
  loading.value = true
  try {
    const content = await readFileAsText(file)
    
    // 验证文件格式
    if (!validateSaveGameInfo(content)) {
      ElMessage.error('这不是有效的SaveGameInfo文件')
      return
    }
    
    saveInfoContent.value = content
    saveInfoData.value = parseXML(content)
    originalSaveInfoName.value = file.name || 'SaveGameInfo'
    hasSaveInfo.value = true
    
    ElMessage.success('SaveGameInfo加载成功！')
  } catch (error) {
    console.error('SaveGameInfo加载失败:', error)
    ElMessage.error(`加载失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 处理主机迁移
const handleMigrateHost = async (farmhandIndex) => {
  try {
    const farmhand = playersInfo.value.farmhands[farmhandIndex]
    const currentHost = playersInfo.value.host
    
    await ElMessageBox.confirm(
      `确定要将主机从 "${currentHost.name}" 迁移到 "${farmhand.name}" 吗？`,
      '确认主机迁移',
      {
        confirmButtonText: '确定迁移',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    loading.value = true
    
    // 执行主存档迁移
    const newSaveData = migrateHost(saveData.value, farmhandIndex)
    const newXmlContent = buildXML(newSaveData)
    
    // Electron环境：直接覆盖文件
    if (currentEnvironment.value === 'electron' && saveFilePath.value) {
      try {
        await saveFileDirectly(saveFilePath.value, newXmlContent)
        
        // 如果有SaveGameInfo，也更新它
        if (hasSaveInfo.value && saveInfoData.value && saveInfoPath.value) {
          const newHostFarmer = newSaveData.SaveGame.player
          const newSaveInfoData = updateSaveGameInfo(saveInfoData.value, newHostFarmer)
          let newSaveInfoContent = buildXML(newSaveInfoData)
          newSaveInfoContent = fixNullableFields(newSaveInfoContent)
          
          await saveFileDirectly(saveInfoPath.value, newSaveInfoContent)
        }
        
        // 保存成功后，重新加载文件以更新内存中的数据
        ElMessage.success({
          message: '主机迁移成功！正在重新加载存档...',
          duration: 2000
        })
        
        // 重新加载目录中的文件
        await handleDirectorySelected(currentDirectory.value)
        
      } catch (error) {
        throw new Error(`保存文件失败: ${error.message}`)
      }
    } else {
      // 浏览器环境：下载文件
      exportSaveFile(newXmlContent, originalFileName.value)
      
      if (hasSaveInfo.value && saveInfoData.value) {
        const newHostFarmer = newSaveData.SaveGame.player
        const newSaveInfoData = updateSaveGameInfo(saveInfoData.value, newHostFarmer)
        let newSaveInfoContent = buildXML(newSaveInfoData)
        newSaveInfoContent = fixNullableFields(newSaveInfoContent)
        
        exportSaveFile(newSaveInfoContent, originalSaveInfoName.value)
        
        ElMessage.success({
          message: '主机迁移成功！两个文件都已下载（主存档 + SaveGameInfo），请替换原存档文件',
          duration: 6000
        })
      } else {
        ElMessage.success({
          message: '主机迁移成功！主存档已下载，请替换原文件。⚠️ 建议同时上传并修改SaveGameInfo文件',
          duration: 6000
        })
      }
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('迁移失败:', error)
      ElMessage.error(`迁移失败: ${error.message}`)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="app-container" v-loading="loading">
    <div class="header">
      <h1>🌾 星露谷物语 - 存档编辑器</h1>
      <p class="subtitle">
        主机迁移工具
        <el-tag 
          :type="currentEnvironment === 'electron' ? 'success' : 'info'" 
          size="small" 
          style="margin-left: 10px"
        >
          {{ currentEnvironment === 'electron' ? '🖥️ 桌面版' : '🌐 网页版' }}
        </el-tag>
      </p>
    </div>

    <div class="content">
      <!-- Electron环境：使用目录选择器 -->
      <div v-if="currentEnvironment === 'electron'">
        <el-card shadow="hover" style="margin-bottom: 20px;">
          <template #header>
            <div class="card-header">
              <span>选择存档目录</span>
              <el-tag v-if="saveData" type="success" size="small">已加载</el-tag>
            </div>
          </template>
          <DirectoryPicker @directory-selected="handleDirectorySelected" />
        </el-card>
      </div>

      <!-- 浏览器环境：使用文件上传 -->
      <el-row v-else :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>1. 上传主存档</span>
                <el-tag v-if="saveData" type="success" size="small">已加载</el-tag>
              </div>
            </template>
            <FileUpload @file-loaded="handleFileLoaded" />
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>2. 上传SaveGameInfo（可选但推荐）</span>
                <el-tag v-if="hasSaveInfo" type="success" size="small">已加载</el-tag>
              </div>
            </template>
            <FileUpload @file-loaded="handleSaveInfoLoaded" accept-text="SaveGameInfo" />
          </el-card>
        </el-col>
      </el-row>
      
      <PlayerList 
        v-if="playersInfo" 
        :players-info="playersInfo"
        @migrate-host="handleMigrateHost"
      />
    </div>

    <div class="footer">
      <el-alert type="info" :closable="false">
        <p>💡 使用说明：</p>
        <ol v-if="currentEnvironment === 'electron'">
          <li>点击"选择存档目录"按钮，选择存档所在的文件夹</li>
          <li>程序会自动读取目录中的主存档和SaveGameInfo文件</li>
          <li>在农场工人列表中选择要设为主机的玩家，点击"设为主机"</li>
          <li>修改后的文件会<strong>自动覆盖</strong>原文件</li>
          <li>⚠️ <strong>修改前务必备份原存档！</strong></li>
        </ol>
        <ol v-else>
          <li>上传主存档文件和SaveGameInfo文件（位于 %appdata%\StardewValley\Saves\存档文件夹\ 目录下）</li>
          <li>SaveGameInfo文件是可选的，但<strong>强烈建议</strong>一起上传以确保游戏正常运行</li>
          <li>在农场工人列表中选择要设为主机的玩家，点击"设为主机"</li>
          <li>下载修改后的文件，替换原存档文件</li>
          <li>⚠️ <strong>修改前务必备份原存档！</strong></li>
        </ol>
      </el-alert>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 32px;
  color: #303133;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.subtitle {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.content {
  margin-bottom: 40px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer {
  margin-top: 40px;
}

.footer ol {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.footer li {
  margin: 4px 0;
  line-height: 1.6;
}
</style>
