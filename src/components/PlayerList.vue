<template>
  <div class="player-list">
    <el-card v-if="playersInfo">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>存档信息</span>
        </div>
      </template>

      <!-- 农场信息 -->
      <el-descriptions :column="2" border class="farm-info">
        <el-descriptions-item label="农场名称">
          {{ playersInfo.host.farmName }}
        </el-descriptions-item>
        <el-descriptions-item label="玩家总数">
          {{ playersInfo.allPlayers.length }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 当前主机 -->
      <div class="section-title">
        <el-icon><Star /></el-icon>
        <span>当前主机</span>
      </div>
      <el-card class="player-card host-card" shadow="hover">
        <div class="player-info">
          <div class="player-avatar">
            <el-icon size="32"><User /></el-icon>
          </div>
          <div class="player-details">
            <div class="player-name">
              <strong>{{ playersInfo.host.name }}</strong>
              <el-tag type="warning" size="small">主机</el-tag>
            </div>
            <div class="player-stats">
              <span>💰 金钱: {{ formatMoney(playersInfo.host.money) }}</span>
              <span class="divider">|</span>
              <span>ID: {{ playersInfo.host.uniqueMultiplayerID }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 农场工人列表 -->
      <div v-if="playersInfo.farmhands.length > 0">
        <div class="section-title">
          <el-icon><Avatar /></el-icon>
          <span>农场工人</span>
        </div>
        
        <el-card 
          v-for="(farmhand, index) in playersInfo.farmhands" 
          :key="index"
          class="player-card farmhand-card"
          shadow="hover"
        >
          <div class="player-info">
            <div class="player-avatar">
              <el-icon size="28"><User /></el-icon>
            </div>
            <div class="player-details">
              <div class="player-name">
                <strong>{{ farmhand.name }}</strong>
                <el-tag type="info" size="small">工人</el-tag>
              </div>
              <div class="player-stats">
                <span>💰 金钱: {{ formatMoney(farmhand.money) }}</span>
                <span class="divider">|</span>
                <span>ID: {{ farmhand.uniqueMultiplayerID }}</span>
              </div>
            </div>
            <div class="player-actions">
              <el-button 
                type="primary" 
                size="small"
                @click="$emit('migrate-host', index)"
              >
                设为主机
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty 
        v-else 
        description="没有农场工人，无法执行主机迁移"
        :image-size="100"
      />
    </el-card>
  </div>
</template>

<script setup>
import { User, Star, Avatar } from '@element-plus/icons-vue'

defineProps({
  playersInfo: {
    type: Object,
    default: null
  }
})

defineEmits(['migrate-host'])

const formatMoney = (money) => {
  return parseInt(money || 0).toLocaleString('zh-CN')
}
</script>

<style scoped>
.player-list {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.farm-info {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.player-card {
  margin-bottom: 12px;
}

.host-card {
  background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
  border: 2px solid #e6a23c;
}

.farmhand-card {
  border: 1px solid #dcdfe6;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: #f0f2f5;
  border-radius: 50%;
  color: #409eff;
}

.player-details {
  flex: 1;
}

.player-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 16px;
}

.player-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.divider {
  color: #dcdfe6;
}

.player-actions {
  margin-left: auto;
}
</style>
