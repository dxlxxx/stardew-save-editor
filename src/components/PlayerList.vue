<template>
  <div class="player-list">
    <div v-if="playersInfo" class="stardew-panel">
      <div class="stardew-header">{{ playersInfo.host.farmName }}农场</div>

      <div class="stardew-row stardew-row--host">
        <div class="avatar-slot">
          <img class="avatar-icon" :src="playerIcon" alt="player" />
        </div>
        <div class="row-main">
          <div class="row-title">
            <strong>{{ playersInfo.host.name }}</strong>
            <span class="role-tag">主机</span>
            <img class="meta-icon meta-icon--host" :src="farmComputer" alt="host" />
          </div>
          <div class="row-sub">
            第 {{ playersInfo.host.yearForSaveGame }} 年 {{ formatSeason(playersInfo.host.seasonForSaveGame) }} {{ playersInfo.host.dayOfMonthForSaveGame }} 日
          </div>
        </div>
        <div class="row-meta">
          <div class="meta-item">
            <img class="meta-icon" :src="goldIcon" alt="gold" />
            <span class="meta-value">{{ formatMoney(playersInfo.host.money) }}</span>
            <img class="meta-icon" :src="timeIcon" alt="time" />
            <span class="meta-value">{{ formatPlayedTime(playersInfo.host.millisecondsPlayed) }}</span>
          </div>
        </div>
      </div>

      <div
        v-for="(farmhand, index) in playersInfo.farmhands"
        :key="index"
        class="stardew-row"
      >
        <div class="avatar-slot">
          <img class="avatar-icon" :src="playerIcon" alt="player" />
        </div>
        <div class="row-main">
          <div class="row-title">
            <strong>{{ farmhand.name }}</strong>
            <span class="role-tag role-tag--worker">玩家</span>
          </div>
          <div class="row-sub">第 {{ playersInfo.host.yearForSaveGame }} 年 {{ formatSeason(playersInfo.host.seasonForSaveGame) }} {{ playersInfo.host.dayOfMonthForSaveGame }} 日</div>
        </div>
        <div class="row-meta">
          <div class="meta-item">
            <img class="meta-icon" :src="goldIcon" alt="gold" />
            <span class="meta-value">{{ formatMoney(farmhand.money) }}</span>
            <img class="meta-icon" :src="timeIcon" alt="time" />
            <span class="meta-value">{{ formatPlayedTime(farmhand.millisecondsPlayed) }}</span>
          </div>
          <el-tooltip
            :disabled="canInteract"
            :content="lockMessage || '主存档文件或SaveGameInfo还没上传'"
            effect="light"
            placement="top"
            popper-class="locked-tip"
          >
            <span class="button-wrap">
              <el-button
                class="stardew-button"
                type="primary"
                size="small"
                :disabled="!canInteract"
                @click="handleMigrate(index)"
              >
                设为主机
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </div>

      <div v-if="playersInfo.farmhands.length === 0" class="stardew-empty">
        没有农场工人，无法执行主机迁移
      </div>
    </div>
  </div>
</template>

<script setup>
import goldIcon from '../assets/image/Gold.png'
import timeIcon from '../assets/image/Time_Icon.png'
import playerIcon from '../assets/image/The_Player_Icon.png'
import farmComputer from '../assets/image/Farm_Computer.png'

const props = defineProps({
  playersInfo: {
    type: Object,
    default: null
  },
  canInteract: {
    type: Boolean,
    default: false
  },
  lockMessage: {
    type: String,
    default: ''
  }
  
})

const emit = defineEmits(['migrate-host'])

const formatMoney = (money) => {
  return parseInt(money || 0).toLocaleString('zh-CN')
}


const formatSeason = (season) => {
  const map = {
    0: '春季',
    1: '夏季',
    2: '秋季',
    3: '冬季'
  }
  return map[season] || season || ''
}

const formatPlayedTime = (milliseconds) => {
  if (!milliseconds || isNaN(milliseconds)) return '0 小时'
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  return `${hours}:${minutes} `
}


const handleMigrate = (index) => {
  if (!props.canInteract) return
  emit('migrate-host', index)
}


</script>

<style scoped>
.player-list {
  margin-top: 20px;
}

.stardew-panel {
  background: #f8d79a;
  border: 3px solid #8c4a1f;
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px #e7b676;
  overflow: hidden;
}

.stardew-header {
  text-align: center;
  padding: 18px 16px;
  font-weight: 700;
  font-size: 18px;
  color: #6b2f12;
  border-bottom: 3px solid #8c4a1f;
  background: #f3c778;
}

.stardew-row {
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 2px solid #e1ad62;
  background: #f8d79a;
}

.stardew-row--host {
  border-top: none;
}

.avatar-slot {
  width: 72px;
  height: 72px;
  border: 2px solid #9a5a2a;
  background: #f3c778;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  image-rendering: pixelated;
}

.row-main {
  flex: 1;
  padding: 0 16px;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: #6b2f12;
  margin-bottom: 6px;
}

.row-sub {
  color: #7c4a1f;
  font-size: 14px;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6b2f12;
  font-weight: 600;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  image-rendering: pixelated;
}

.meta-icon--host {
  width: 24px;
  height: 34px;
}

.meta-value {
  font-size: 15px;
}

.role-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: #f4e3a3;
  border: 1px solid #c7913f;
  font-size: 12px;
  color: #6b2f12;
}

.role-tag--worker {
  background: #f1d7a1;
}

.stardew-button {
  background: #c7832d;
  border-color: #9a5a2a;
}

.stardew-empty {
  padding: 18px;
  text-align: center;
  color: #7c4a1f;
  border-top: 2px solid #e1ad62;
}

.button-wrap {
  display: inline-block;
}

@media (max-width: 768px) {
  .row-meta {
    gap: 8px;
  }

  .row-meta .meta-item {
    display: none;
  }
}
</style>
