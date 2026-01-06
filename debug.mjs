import { readFileSync, writeFileSync } from 'fs'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { 
  extractPlayersInfo, 
  migrateHost, 
  updateSaveGameInfo,
  fixNullableFields 
} from './src/utils/xmlParser.js'

// XML 解析器配置
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
  htmlEntities: false
}

// XML 构建器配置
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
  processEntities: false,
  suppressBooleanAttributes: false
}

// 解析 XML
function parseXML(xmlContent) {
  const parser = new XMLParser(parserOptions)
  return parser.parse(xmlContent)
}

// 构建 XML
function buildXML(data) {
  const builder = new XMLBuilder(builderOptions)
  return builder.build(data)
}

function displayMigrationInfo(currentHost, targetFarmhand) {
  console.log('\n=== 开始交换 ===')
  console.log('当前主机:', currentHost.name, '(ID:', currentHost.UniqueMultiplayerID, ')')
  console.log('目标工人:', targetFarmhand.name, '(ID:', targetFarmhand.UniqueMultiplayerID, ')')
  
  // 同步时间（如果工人很久没上线，更新为主机的最新时间）
  targetFarmhand.dayOfMonthForSaveGame = currentHost.dayOfMonthForSaveGame
  targetFarmhand.seasonForSaveGame = currentHost.seasonForSaveGame
  targetFarmhand.yearForSaveGame = currentHost.yearForSaveGame
  console.log('已同步存档时间:', `第${targetFarmhand.yearForSaveGame}年 ${targetFarmhand.seasonForSaveGame} ${targetFarmhand.dayOfMonthForSaveGame}日`)
  
  // 交换关键字段（避免家具bug和位置错乱）
  // 1. 交换房屋等级
  const tempHouseUpgrade = currentHost.houseUpgradeLevel
  currentHost.houseUpgradeLevel = targetFarmhand.houseUpgradeLevel
  targetFarmhand.houseUpgradeLevel = tempHouseUpgrade
  console.log('已交换房屋等级:', currentHost.houseUpgradeLevel, '<->', targetFarmhand.houseUpgradeLevel)
  
  // 2. 交换家的位置
  const tempHomeLocation = currentHost.homeLocation
  currentHost.homeLocation = targetFarmhand.homeLocation
  targetFarmhand.homeLocation = tempHomeLocation
  console.log('已交换家的位置:', currentHost.homeLocation, '<->', targetFarmhand.homeLocation)
  
  // 3. 交换最后睡觉位置
  const tempLastSleep = currentHost.lastSleepLocation
  currentHost.lastSleepLocation = targetFarmhand.lastSleepLocation
  targetFarmhand.lastSleepLocation = tempLastSleep
  console.log('已交换睡觉位置:', currentHost.lastSleepLocation, '<->', targetFarmhand.lastSleepLocation)
  
  // 4. 交换已看过的事件（避免重复触发剧情对话）
  const tempEventsSeen = currentHost.eventsSeen
  currentHost.eventsSeen = targetFarmhand.eventsSeen
  targetFarmhand.eventsSeen = tempEventsSeen
  const hostEventsCount = Array.isArray(currentHost.eventsSeen?.int) ? currentHost.eventsSeen.int.length : 0
  const farmhandEventsCount = Array.isArray(targetFarmhand.eventsSeen?.int) ? targetFarmhand.eventsSeen.int.length : 0
  console.log('已交换事件记录:', hostEventsCount, '个事件 <->', farmhandEventsCount, '个事件')
  
  // 5. 交换邮件记录（解决矿车、巴士、桥梁等基础设施访问问题）
  const tempMailReceived = currentHost.mailReceived
  currentHost.mailReceived = targetFarmhand.mailReceived
  targetFarmhand.mailReceived = tempMailReceived
  const hostMailCount = Array.isArray(currentHost.mailReceived?.string) ? currentHost.mailReceived.string.length : 0
  const farmhandMailCount = Array.isArray(targetFarmhand.mailReceived?.string) ? targetFarmhand.mailReceived.string.length : 0
  console.log('已交换邮件记录:', hostMailCount, '封邮件 <->', farmhandMailCount, '封邮件')
  
  // 交换玩家数据
  gameSave.player = targetFarmhand
  gameSave.farmhands.Farmer[farmhandIndex] = currentHost
  
  console.log('交换完成！')
  console.log('新主机:', gameSave.player.name)
  console.log('新工人[' + farmhandIndex + ']:', gameSave.farmhands.Farmer[farmhandIndex].name)
  
  return saveData
}

function displayPlayers(playersInfo) {
  console.log('\n=== 玩家列表 ===')
  const host = playersInfo.host
  console.log(`\n[主机] ${host.name}`)
  console.log(`  农场: ${host.farmName}`)
  console.log(`  ID: ${host.uniqueMultiplayerID}`)
  console.log(`  金钱: ${host.money}`)
  
  if (playersInfo.farmhands.length > 0) {
    console.log('\n农场工人:')
    playersInfo.farmhands.forEach((farmhand) => {
      console.log(`\n[${farmhand.index}] ${farmhand.name}`)
      console.log(`  农场: ${farmhand.farmName}`)
      console.log(`  ID: ${farmhand.uniqueMultiplayerID}`)
      console.log(`  金钱: ${farmhand.money}`)
    })
  } else {
    console.log('\n没有农场工人')
  }
}

// 主函数
function main() {
  const saveDir = 'C:\\Users\\Deng\\AppData\\Roaming\\StardewValley\\Saves\\魔仙堡_422195038'
  const savePath = `${saveDir}\\魔仙堡_422195038`
  const saveInfoPath = `${saveDir}\\SaveGameInfo`
  const backupPath = savePath + '.backup'
  const saveInfoBackupPath = saveInfoPath + '.backup'
  
  // 要迁移的农场工人索引（0 = 第一个工人，1 = 第二个工人）
  const targetFarmhandIndex = 0
  
  console.log('========================================')
  console.log('星露谷物语存档主机迁移工具')
  console.log('========================================')
  
  try {
    // 1. 读取主存档文件
    console.log('\n[1/6] 读取主存档文件...')
    console.log('路径:', savePath)
    const xmlContent = readFileSync(savePath, 'utf-8')
    console.log('文件大小:', (xmlContent.length / 1024).toFixed(2), 'KB')
    
    // 2. 读取SaveGameInfo文件
    console.log('\n[2/6] 读取SaveGameInfo文件...')
    console.log('路径:', saveInfoPath)
    const saveInfoContent = readFileSync(saveInfoPath, 'utf-8')
    console.log('文件大小:', (saveInfoContent.length / 1024).toFixed(2), 'KB')
    
    // 3. 解析 XML
    console.log('\n[3/6] 解析 XML...')
    const saveData = parseXML(xmlContent)
    const saveInfoData = parseXML(saveInfoContent)
    console.log('解析成功！')
    
    // 4. 显示玩家信息
    console.log('\n[4/6] 提取玩家信息...')
    const players = extractPlayersInfo(saveData)
    displayPlayers(players)
    
    if (players.farmhands.length === 0) {
      console.log('\n❌ 错误: 没有农场工人，无法执行主机迁移')
      return
    }
    
    // 5. 执行迁移
    console.log('\n[5/6] 执行主机迁移...')
    console.log('将主机迁移给农场工人:', players.farmhands[targetFarmhandIndex].name)
    
    // 5. 执行迁移（包含farmhandReference替换）
    console.log('\n[5/6] 执行主机迁移...')
    console.log('将主机迁移给农场工人:', players.farmhands[targetFarmhandIndex].name)
    const modifiedData = migrateHost(saveData, targetFarmhandIndex)
    
    // 提取新主机的Farmer数据用于SaveGameInfo
    const newHostFarmer = modifiedData.SaveGame.player
    const modifiedSaveInfoData = updateSaveGameInfo(saveInfoData, newHostFarmer)
    
    // 6. 生成新的 XML
    console.log('\n[6/6] 生成新的存档文件...')
    let newXmlContent = buildXML(modifiedData)
    let newSaveInfoContent = buildXML(modifiedSaveInfoData)
    
    // 修复可空字段
    console.log('修复SaveGameInfo中的可空字段...')
    newSaveInfoContent = fixNullableFields(newSaveInfoContent)
    
    // 备份原文件
    console.log('备份主存档到:', backupPath)
    writeFileSync(backupPath, xmlContent, 'utf-8')
    console.log('备份SaveGameInfo到:', saveInfoBackupPath)
    writeFileSync(saveInfoBackupPath, saveInfoContent, 'utf-8')
    
    // 直接覆盖原文件
    console.log('写入修改到主存档:', savePath)
    writeFileSync(savePath, newXmlContent, 'utf-8')
    console.log('写入修改到SaveGameInfo:', saveInfoPath)
    writeFileSync(saveInfoPath, newSaveInfoContent, 'utf-8')
    
    console.log('\n✅ 完成！')
    console.log('✓ 主存档已备份到:', backupPath)
    console.log('✓ SaveGameInfo已备份到:', saveInfoBackupPath)
    console.log('✓ 两个文件都已更新，新主机:', players.farmhands[targetFarmhandIndex].name)
    console.log('\n💡 提示：')
    console.log('   - 现在可以直接启动游戏测试')
    console.log('   - 如果有问题，用 .backup 文件恢复')
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    console.error(error.stack)
  }
}

main()
