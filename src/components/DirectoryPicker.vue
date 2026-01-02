<template>
  <div class="directory-picker">
    <el-button 
      type="primary" 
      size="large" 
      @click="handleSelectDirectory"
      :loading="loading"
      style="width: 100%;"
    >
      <el-icon style="margin-right: 8px;"><FolderOpened /></el-icon>
      选择存档目录
    </el-button>

    <div v-if="selectedPath" class="directory-info">
      <el-alert type="success" :closable="false">
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-icon><Folder /></el-icon>
            <span>已选择目录</span>
          </div>
        </template>
        <div class="path-info">
          <code>{{ selectedPath }}</code>
        </div>
      </el-alert>

      <div v-if="filesInfo" class="files-list" style="margin-top: 12px;">
        <el-tag v-if="filesInfo.saveFile" type="success" size="large">
          <el-icon><Document /></el-icon>
          存档: {{ filesInfo.saveFile }}
        </el-tag>
        <el-tag v-if="filesInfo.saveInfo" type="success" size="large" style="margin-left: 8px;">
          <el-icon><Document /></el-icon>
          SaveGameInfo
        </el-tag>
        <el-tag v-else type="warning" size="large" style="margin-left: 8px;">
          <el-icon><WarningFilled /></el-icon>
          未找到 SaveGameInfo
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FolderOpened, Folder, Document, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['directory-selected'])
const loading = ref(false)
const selectedPath = ref('')
const filesInfo = ref(null)

const handleSelectDirectory = async () => {
  if (!window.electronAPI) {
    ElMessage.error('此功能仅在桌面版中可用')
    return
  }

  loading.value = true
  try {
    const result = await window.electronAPI.openDirectoryDialog()
    
    if (result.canceled) {
      loading.value = false
      return
    }

    selectedPath.value = result.dirPath

    // 读取目录内容
    const dirResult = await window.electronAPI.readDirectory(result.dirPath)
    if (!dirResult.success) {
      throw new Error(dirResult.error)
    }

    const files = dirResult.files
    const saveFile = files.find(f => f !== 'SaveGameInfo' && f !== 'SaveGameInfo_old' && !f.endsWith('.old'))
    const hasSaveInfo = files.includes('SaveGameInfo')

    if (!saveFile) {
      ElMessage.error('该目录中未找到有效的存档文件')
      selectedPath.value = ''
      filesInfo.value = null
      return
    }

    filesInfo.value = {
      saveFile,
      saveInfo: hasSaveInfo
    }

    emit('directory-selected', result.dirPath)
    ElMessage.success('目录选择成功！')
  } catch (error) {
    console.error('选择目录失败:', error)
    ElMessage.error(`选择失败: ${error.message}`)
    selectedPath.value = ''
    filesInfo.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.directory-picker {
  width: 100%;
}

.directory-info {
  margin-top: 16px;
}

.path-info {
  margin-top: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  word-break: break-all;
}

.path-info code {
  font-size: 13px;
  color: #303133;
}

.files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.files-list .el-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
