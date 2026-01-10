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
      <img class="upload-icon" :src="uploadIcon" alt="upload" />
      <div class="el-upload__text">
        拖拽{{ acceptText }}文件到此处，或<em>点击选择</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">

          <P v-if="fileName" >已上传文件：<span class="file-name" style="font-weight: bold;">{{ fileName }}</span></P>

          <p
            v-if="errorMessage"
            class="upload-tip upload-tip--error"
          >
            {{ errorMessage }}
          </p>

          <p
            v-else-if="!fileName"
            class="upload-tip"
            :class="tipClass"
          >
            {{ tipText }}
          </p>
          <p
            v-else-if="fileName && status === 'success'"
            class="upload-tip"
            :class="tipClass"
          >
            已成功加载文件：{{ fileName }}
          </p>
        </div>
      </template>
    </el-upload>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import uploadIcon from '../assets/image/upload.png'

const props = defineProps({
  acceptText: {
    type: String,
    default: '存档'
  },
  status: {
    type: String,
    default: 'idle'
  },
  errorMessage: {
    type: String,
    default: ''
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

const tipClass = computed(() => {
  if (props.status === 'error') return 'upload-tip--error'
  if (props.status === 'success') return 'upload-tip--success'
  return 'upload-tip--warning'
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

.upload-icon {
  width: 72px;
  height: auto;
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

.upload-tip {
  margin: 4px 0;
  font-size: 13px;
  color: #909399;
}

.upload-tip--warning {
  color: #e6a23c;
}

.upload-tip--error {
  color: #f56c6c;
}

.upload-tip--success {
  color: #67c23a;
}

</style>
