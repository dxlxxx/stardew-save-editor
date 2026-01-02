<template>
  <div class="file-upload">
    <el-upload
      class="upload-area"
      drag
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
      accept="*"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        拖拽{{ acceptText }}文件到此处，或<em>点击选择</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          <p style="font-size: 13px; color: #909399; margin: 8px 0 0 0;">
            {{ tipText }}
          </p>
        </div>
      </template>
    </el-upload>

    <div v-if="fileName" class="file-info">
      <el-tag type="success" size="large">
        <el-icon><Document /></el-icon>
        已选择：{{ fileName }}
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Upload, UploadFilled, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  acceptText: {
    type: String,
    default: '存档'
  }
})

const emit = defineEmits(['file-loaded'])
const fileName = ref('')

const tipText = computed(() => {
  if (props.acceptText === 'SaveGameInfo') {
    return '上传SaveGameInfo文件'
  }
  return '上传主存档文件（如：YourName_123456789）'
})

const handleFileChange = (uploadFile) => {
  const file = uploadFile.raw
  fileName.value = file.name
  
  // 验证文件大小（不超过 50MB）
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件过大，请确认是否为正确的存档文件')
    return
  }
  
  emit('file-loaded', file)
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.upload-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload) {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

.el-icon--upload {
  font-size: 67px;
  color: #409eff;
  margin-bottom: 16px;
}

.el-upload__text {
  font-size: 14px;
  color: #606266;
}

.el-upload__text em {
  color: #409eff;
  font-style: normal;
}

.el-upload__tip {
  margin-top: 16px;
}

.el-upload__tip p {
  margin: 4px 0;
  font-size: 13px;
}

.file-info {
  margin-top: 20px;
  text-align: center;
}

.file-info .el-tag {
  padding: 12px 20px;
  font-size: 14px;
}
</style>
