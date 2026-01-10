<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FileUpload from './components/FileUpload.vue'
import DirectoryPicker from './components/DirectoryPicker.vue'
import PlayerList from './components/PlayerList.vue'
import stardewLogo from './assets/image/Stardew_logo_4x.png'
import { parseXML, buildXML, extractPlayersInfo, migrateHost, updateSaveGameInfo, fixNullableFields } from './utils/xmlParser'
import { readFileAsText, exportSaveFile, validateSaveFile, validateSaveGameInfo, getEnvironment, loadSaveFromDirectory, saveFileDirectly } from './utils/fileHandler'

const loadingDirectory = ref(false)
const loadingMain = ref(false)
const loadingInfo = ref(false)
const saveData = ref(null)
const saveInfoData = ref(null)
const playersInfo = ref(null)
const originalFileName = ref('')
const originalSaveInfoName = ref('SaveGameInfo')
const xmlContent = ref('')
const saveInfoContent = ref('')
const hasSaveInfo = ref(false)
const currentEnvironment = ref('browser')
const saveError = ref('')
const saveInfoError = ref('')

const canInteract = computed(() => Boolean(saveData.value) && Boolean(hasSaveInfo.value))
const lockMessage = computed(() => {
  if (canInteract.value) return ''
  if (!saveData.value && !hasSaveInfo.value) {
    return '主存档文件和SaveGameInfo还没上传'
  }
  if (!saveData.value) return '主存档文件还没上传'
  return 'SaveGameInfo还没上传'
})

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
  loadingDirectory.value = true
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
    loadingDirectory.value = false
  }
}

// 处理主存档文件上传
const handleFileLoaded = async (file) => {
  loadingMain.value = true
  saveError.value = ''
  try {
    // 读取文件内容
    const content = await readFileAsText(file)
    xmlContent.value = content
    originalFileName.value = file.name
    
    // 验证文件格式
    if (!validateSaveFile(content)) {
      ElMessage.error('这不是有效的星露谷存档文件')
      saveError.value = '这不是有效的星露谷存档文件'
      saveData.value = null
      playersInfo.value = null
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
    saveError.value = `文件加载失败，请确认文件后重新上传`
    saveData.value = null
    playersInfo.value = null
  } finally {
    loadingMain.value = false
  }
}

// 处理SaveGameInfo文件上传（可选）
const handleSaveInfoLoaded = async (file) => {
  loadingInfo.value = true
  saveInfoError.value = ''
  try {
    if (file.name !== 'SaveGameInfo') {
      ElMessage.error('文件名必须是 SaveGameInfo')
      saveInfoError.value = '文件名必须是 SaveGameInfo'
      return
    }
    const content = await readFileAsText(file)
    
    // 验证文件格式
    if (!validateSaveGameInfo(content)) {
      ElMessage.error('这不是有效的SaveGameInfo文件')
      saveInfoError.value = '这不是有效的SaveGameInfo文件'
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
    saveInfoError.value = `加载失败: ${error.message}`
    hasSaveInfo.value = false
  } finally {
    loadingInfo.value = false
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
    
    // Keep UI responsive; no global loading overlay.
    
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
    // No global loading overlay.
  }
}
</script>

<template>
  <div class="app-container">
    <div class="header">
      <img
        class="header-logo"
        :src="stardewLogo"
        :srcset="`${stardewLogo} 2x`"
        alt="Stardew Valley Save Editor"
      />
      <div class="title-box">
        <p class="title">星露谷物语 - 主机迁移工具</p>
      </div>
    </div>

    <div class="content">
      <!-- Electron环境：使用目录选择器 -->
      <div v-if="currentEnvironment === 'electron'">
        <div class="content-frame" style="margin-bottom: 20px;" v-loading-mask="loadingDirectory">
          <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>选择存档目录</span>
              <el-tag v-if="saveData" type="success" size="small">已加载</el-tag>
            </div>
          </template>
          <DirectoryPicker @directory-selected="handleDirectorySelected" />
        </el-card>
        </div>
      </div>

      <!-- 浏览器环境：使用文件上传 -->
      <el-row v-else :gutter="20">
        <el-col :span="12">
          <div class="content-frame" v-loading-mask="loadingMain">
            <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>1. 上传主存档文件</span>
                <el-tag
                  size="small"
                  :type="saveError ? 'danger' : saveData ? 'success' : 'warning'"
                >
                  {{ saveError ? '加载失败' : saveData ? '已上传' : '未上传' }}
                </el-tag>
              </div>
              <p class="card-subtitle">包含玩家的完整游戏进度、角色数据和农场状态</p>
            </template>
            <FileUpload
              @file-loaded="handleFileLoaded"
              :status="saveError ? 'error' : saveData ? 'success' : 'idle'"
              :error-message="saveError"
            />
            </el-card>
          </div>
        </el-col>
        
        <el-col :span="12">
          <div class="content-frame" v-loading-mask="loadingInfo">
            <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>2. 上传SaveGameInfo</span>
                <el-tag
                  size="small"
                  :type="saveInfoError ? 'danger' : hasSaveInfo ? 'success' : 'warning'"
                >
                  {{ saveInfoError ? '加载失败' : hasSaveInfo ? '已上传' : '未上传' }}
                </el-tag>
              </div>
              <p class="card-subtitle">用于在游戏「加载存档」界面中正确显示：玩家名称、农场名称、资金、游戏时间等信息</p>
            </template>
            <FileUpload
              @file-loaded="handleSaveInfoLoaded"
              accept-text="SaveGameInfo"
              :status="saveInfoError ? 'error' : hasSaveInfo ? 'success' : 'idle'"
              :error-message="saveInfoError"
            />
            </el-card>
          </div>
        </el-col>
      </el-row>
      
      <div v-if="playersInfo" class="content-frame player-frame">
        <PlayerList 
          :players-info="playersInfo"
          :can-interact="canInteract"
          :lock-message="lockMessage"
          @migrate-host="handleMigrateHost"
        />
      </div>
    </div>

    <div class="footer">
      <span><p >使用说明：</p></span>
      <el-alert type="info" :closable="false">
        <ol v-if="currentEnvironment === 'electron'">
          <li>点击"选择存档目录"按钮，选择存档所在的文件夹</li>
          <li>程序会自动读取目录中的主存档和SaveGameInfo文件</li>
          <li>在农场工人列表中选择要设为主机的玩家，点击"设为主机"</li>
          <li>修改后的文件会<strong>自动覆盖</strong>原文件</li>
          <li>⚠️<strong>修改前务必备份原存档！</strong></li>
        </ol>
        <ol v-else>
          <li>上传 <b>主存档文件</b> 和 <b>SaveGameInfo</b> 文件（存档位置详见：<a href="https://zh.stardewvalleywiki.com/%E5%AD%98%E6%A1%A3#.E6.B8.B8.E6.88.8F.E5.AD.98.E6.A1.A3.E4.BD.8D.E7.BD.AE">游戏中存档位置</a>）</li>
          <li>在玩家列表中选择要设为主机的玩家，点击 "<b>设为主机</b>" </li>
          <li>下载修改后的文件，替换原存档文件</li>
        </ol>
        <p>⚠️ <strong>迁移前务必备份原存档！</strong></p>
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

.title-box {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  margin: 0 auto 5px;
  border: 20px solid transparent;
  border-image: url("./assets/image/scrollborder.png") 24 fill repeat;
}

.title-box .title {
  font-size: 22px;
  color: #303133;
  margin: 0;
  font-weight: 600;
}


.header-logo {
  display: block;
  width: auto;
  height: auto;
  margin: 0 auto 12px;
  image-rendering: pixelated;
}



.content {
  margin-bottom: 40px;
}

.content-frame {
  border: 24px solid transparent;
  border-image: url("./assets/image/woodenboxborder.png") 24 stretch;
  border-radius: 15px;
  padding: 0;
  background-color: #fff6d4;
  position: relative;
}

.content-frame .el-card {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.content-frame .el-card__header,
.content-frame .el-card__body {
  padding: 16px;
}

.player-frame {
  margin-top: 20px;
}

.player-frame :deep(.el-card) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

::v-deep .el-upload-dragger  {
  background-color: #fff6d4 ;
}
::v-deep .el-icon--upload {
    color: #c19b10;
  }


.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #7a8699;
  line-height: 1.4;
}

.footer {
  margin-top: 40px;
  display: inline-block;
  width: 100%;
  border: 15px solid transparent;
  border-radius: 15px;
  border-image: url("./assets/image/menu_border_noshadowtopleft.png") 22 stretch;
  background-color: #fff3cc;
  padding: 15px 30px 30px;
  color: #252525;
  box-sizing: border-box;
}

.footer :deep(.el-alert) {
  background: transparent;
  border: none;
  padding: 0;
}

.footer :deep(.el-alert__icon),
.footer :deep(.el-alert__close-btn) {
  display: none;
}

.footer :deep(.el-alert__title),
.footer :deep(.el-alert__content) {
  color: #252525;
}
.footer :deep(.el-alert__description) {
  color: #252525;
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
