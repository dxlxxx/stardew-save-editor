import { XMLParser, XMLBuilder } from "fast-xml-parser";

// XML 解析器配置
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
  htmlEntities: false,
};

// XML 构建器配置
const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: false,
  processEntities: false,
  cdataPropName: "__cdata",
  suppressBooleanAttributes: false,
};

/**
 * 解析存档 XML 文件
 * @param {string} xmlContent - XML 文本内容
 * @returns {object} 解析后的 JavaScript 对象
 */
export function parseXML(xmlContent) {
  try {
    const parser = new XMLParser(parserOptions);
    return parser.parse(xmlContent);
  } catch (error) {
    throw new Error(`XML 解析失败: ${error.message}`);
  }
}

/**
 * 将对象转换为 XML 字符串
 * @param {object} data - JavaScript 对象
 * @returns {string} XML 字符串
 */
export function buildXML(data) {
  try {
    const builder = new XMLBuilder(builderOptions);
    return builder.build(data);
  } catch (error) {
    throw new Error(`XML 构建失败: ${error.message}`);
  }
}

/**
 * 修复XML中的空可空字段（需要 xsi:nil="true"）
 * @param {string} xmlContent - XML 文本内容
 * @returns {string} 修复后的 XML 字符串
 */
export function fixNullableFields(xmlContent) {
  // 已知需要 xsi:nil="true" 的可空字段列表
  const nullableFields = [
    "datingFarmer",
    "divorcedFromFarmer",
    "loveInterest",
    "endOfRouteBehaviorName",
    "isBigCraftable",
    "which",
    "catPerson",
    "canUnderstandDwarves",
    "hasClubCard",
    "hasDarkTalisman",
    "hasMagicInk",
    "hasMagnifyingGlass",
    "hasRustyKey",
    "hasSkullKey",
    "hasSpecialCharm",
    "HasTownKey",
    "hasUnlockedSkullDoor",
    "daysMarried",
    "isMale",
    "averageBedtime",
    "beveragesMade",
    "caveCarrotsFound",
    "cheeseMade",
    "chickenEggsLayed",
    "copperFound",
    "cowMilkProduced",
    "cropsShipped",
    "daysPlayed",
    "diamondsFound",
    "dirtHoed",
    "duckEggsLayed",
    "fishCaught",
    "geodesCracked",
    "giftsGiven",
    "goatCheeseMade",
    "goatMilkProduced",
    "goldFound",
    "goodFriends",
    "individualMoneyEarned",
    "iridiumFound",
    "ironFound",
    "itemsCooked",
    "itemsCrafted",
    "itemsForaged",
    "itemsShipped",
    "monstersKilled",
    "mysticStonesCrushed",
    "notesFound",
    "otherPreciousGemsFound",
    "piecesOfTrashRecycled",
    "preservesMade",
    "prismaticShardsFound",
    "questsCompleted",
    "rabbitWoolProduced",
    "rocksCrushed",
    "sheepWoolProduced",
    "slimesKilled",
    "stepsTaken",
    "stoneGathered",
    "stumpsChopped",
    "timesFished",
    "timesUnconscious",
    "totalMoneyGifted",
    "trufflesFound",
    "weedsEliminated",
    "seedsSown",
  ];

  let fixedXml = xmlContent;

  // 为每个可空字段替换空标签
  for (const field of nullableFields) {
    // 匹配 <field></field> 或 <field />（没有属性的自闭合标签）
    const emptyTagPattern = new RegExp(
      `<${field}\\s*></${field}>|<${field}\\s*/>`,
      "g"
    );
    fixedXml = fixedXml.replace(emptyTagPattern, `<${field} xsi:nil="true" />`);
  }

  return fixedXml;
}

/**
 * 从存档数据中提取玩家信息
 * @param {object} saveData - 解析后的存档数据
 * @returns {object} 包含主机和农场工人的信息
 */
export function extractPlayersInfo(saveData) {
  try {
    const gameSave = saveData.SaveGame;

    // 主机玩家信息
    const hostPlayer = gameSave.player;
    const hostInfo = {
      type: "host",
      name: hostPlayer.name,
      farmName: hostPlayer.farmName,
      uniqueMultiplayerID: hostPlayer.UniqueMultiplayerID,
      money: hostPlayer.money,
      totalMoneyEarned: hostPlayer.totalMoneyEarned,
      rawData: hostPlayer,
      yearForSaveGame: hostPlayer.yearForSaveGame,
      dayOfMonthForSaveGame: hostPlayer.dayOfMonthForSaveGame,
      seasonForSaveGame: hostPlayer.seasonForSaveGame,
      millisecondsPlayed: hostPlayer.millisecondsPlayed,
    };

    // 农场工人信息 - 数据在 farmhands.Farmer 中
    const farmhands = [];
    const farmhandsData = gameSave.farmhands?.Farmer;

    if (farmhandsData) {
      const farmhandArray = Array.isArray(farmhandsData)
        ? farmhandsData
        : [farmhandsData];

      farmhandArray.forEach((farmhand, index) => {
        // 过滤掉空数据或没有名字的玩家（离线玩家槽位）
        if (farmhand && farmhand.name && typeof farmhand.name === "string") {
          farmhands.push({
            type: "farmhand",
            index,
            name: farmhand.name,
            farmName: farmhand.farmName,
            uniqueMultiplayerID: farmhand.UniqueMultiplayerID,
            money: farmhand.money,
            totalMoneyEarned: farmhand.totalMoneyEarned,
            rawData: farmhand,
            yearForSaveGame: farmhand.yearForSaveGame,
            dayOfMonthForSaveGame: farmhand.dayOfMonthForSaveGame,
            seasonForSaveGame: farmhand.seasonForSaveGame,
            millisecondsPlayed: farmhand.millisecondsPlayed,
          });
        }
      });
    }

    return {
      host: hostInfo,
      farmhands,
      allPlayers: [hostInfo, ...farmhands],
    };
  } catch (error) {
    throw new Error(`提取玩家信息失败: ${error.message}`);
  }
}

/**
 * 迁移主机：交换主机和指定农场工人的数据
 * @param {object} saveData - 原始存档数据
 * @param {number} farmhandIndex - 要提升为主机的农场工人索引
 * @returns {object} 修改后的存档数据
 */
export function migrateHost(saveData, farmhandIndex) {
  try {
    const newSaveData = JSON.parse(JSON.stringify(saveData)); // 深拷贝
    const gameSave = newSaveData.SaveGame;

    // 获取当前主机和目标农场工人
    const currentHost = gameSave.player;
    const farmhandsData = gameSave.farmhands?.Farmer;

    if (!farmhandsData) {
      throw new Error("存档中没有农场工人数据");
    }

    const farmhandArray = Array.isArray(farmhandsData)
      ? farmhandsData
      : [farmhandsData];
    const targetFarmhand = farmhandArray[farmhandIndex];

    if (!targetFarmhand) {
      throw new Error(`找不到索引为 ${farmhandIndex} 的农场工人`);
    }

    // 同步时间（如果工人很久没上线，更新为主机的最新时间）
    targetFarmhand.dayOfMonthForSaveGame = currentHost.dayOfMonthForSaveGame;
    targetFarmhand.seasonForSaveGame = currentHost.seasonForSaveGame;
    targetFarmhand.yearForSaveGame = currentHost.yearForSaveGame;

    // 交换关键字段（避免家具bug和位置错乱）
    // 1. 交换房屋等级
    const tempHouseUpgrade = currentHost.houseUpgradeLevel;
    currentHost.houseUpgradeLevel = targetFarmhand.houseUpgradeLevel;
    targetFarmhand.houseUpgradeLevel = tempHouseUpgrade;

    // 2. 交换家的位置
    const tempHomeLocation = currentHost.homeLocation;
    currentHost.homeLocation = targetFarmhand.homeLocation;
    targetFarmhand.homeLocation = tempHomeLocation;

    // 3. 交换最后睡觉位置
    const tempLastSleep = currentHost.lastSleepLocation;
    currentHost.lastSleepLocation = targetFarmhand.lastSleepLocation;
    targetFarmhand.lastSleepLocation = tempLastSleep;

    // 4. 交换已看过的事件（避免重复触发剧情对话）
    const tempEventsSeen = currentHost.eventsSeen;
    currentHost.eventsSeen = targetFarmhand.eventsSeen;
    targetFarmhand.eventsSeen = tempEventsSeen;

    // 5. 交换邮件记录（解决矿车、巴士、桥梁等基础设施访问问题）
    const tempMailReceived = currentHost.mailReceived;
    currentHost.mailReceived = targetFarmhand.mailReceived;
    targetFarmhand.mailReceived = tempMailReceived;

    // 交换玩家数据
    // 6. 将当前主机降级为农场工人
    gameSave.farmhands.Farmer[farmhandIndex] = currentHost;

    // 7. 将目标农场工人提升为主机
    gameSave.player = targetFarmhand;

    // 8. 替换farmhandReference中的ID
    // farmhandReference应该指向农场工人，所以需要用原主机ID替换新主机ID
    const oldHostId = currentHost.UniqueMultiplayerID;
    const newHostId = targetFarmhand.UniqueMultiplayerID;

    console.log("替换farmhandReference中的ID...");
    let replacementCount = 0;

    // 递归遍历并替换farmhandReference
    function traverseAndReplace(obj) {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        obj.forEach((item) => traverseAndReplace(item));
      } else {
        for (const key in obj) {
          if (key === "farmhandReference") {
            if (obj[key] === newHostId) {
              obj[key] = oldHostId;
              replacementCount++;
            }
          } else if (obj[key] && typeof obj[key] === "object") {
            traverseAndReplace(obj[key]);
          }
        }
      }
    }

    traverseAndReplace(gameSave);

    console.log("主机迁移成功:", {
      oldHost: currentHost.name,
      newHost: targetFarmhand.name,
      farmhandReferencesReplaced: replacementCount,
    });

    return newSaveData;
  } catch (error) {
    throw new Error(`主机迁移失败: ${error.message}`);
  }
}

/**
 * 更新SaveGameInfo文件 - SaveGameInfo只包含单个Farmer节点，代表当前主机
 * @param {object} saveInfoData - SaveGameInfo数据
 * @param {object} newHostFarmer - 新主机的Farmer数据
 * @returns {object} 修改后的SaveGameInfo数据
 */
export function updateSaveGameInfo(saveInfoData, newHostFarmer) {
  try {
    const newSaveInfoData = JSON.parse(JSON.stringify(saveInfoData)); // 深拷贝

    // 直接替换整个Farmer节点为新主机的数据
    newSaveInfoData.Farmer = JSON.parse(JSON.stringify(newHostFarmer));

    // 确保保留命名空间属性（星露谷物语需要这些）
    if (!newSaveInfoData.Farmer["@_xmlns:xsi"]) {
      newSaveInfoData.Farmer["@_xmlns:xsi"] =
        "http://www.w3.org/2001/XMLSchema-instance";
    }
    if (!newSaveInfoData.Farmer["@_xmlns:xsd"]) {
      newSaveInfoData.Farmer["@_xmlns:xsd"] =
        "http://www.w3.org/2001/XMLSchema";
    }

    console.log("SaveGameInfo更新成功:", {
      oldHost: saveInfoData.Farmer.name,
      newHost: newHostFarmer.name,
    });

    return newSaveInfoData;
  } catch (error) {
    throw new Error(`SaveGameInfo更新失败: ${error.message}`);
  }
}

/**
 * 替换farmhandReference中的UniqueMultiplayerID
 * farmhandReference应指向农场工人，所以需要用原主机ID替换新主机ID
 * @param {object} saveData - 存档数据
 * @param {string} oldHostId - 原主机ID（现在是农场工人）
 * @param {string} newHostId - 新主机ID
 * @returns {object} 修改后的存档数据
 */
export function replaceFarmhandReferences(saveData, oldHostId, newHostId) {
  try {
    const newSaveData = JSON.parse(JSON.stringify(saveData)); // 深拷贝
    const gameSave = newSaveData.SaveGame;

    let replacementCount = 0;

    // 递归遍历并替换farmhandReference
    function traverseAndReplace(obj) {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        obj.forEach((item) => traverseAndReplace(item));
      } else {
        for (const key in obj) {
          if (key === "farmhandReference") {
            // 检查farmhandReference值是否为新主机ID
            if (obj[key] === newHostId) {
              console.log(
                `  找到farmhandReference: ${newHostId}，替换为: ${oldHostId}`
              );
              obj[key] = oldHostId;
              replacementCount++;
            }
          } else if (obj[key] && typeof obj[key] === "object") {
            traverseAndReplace(obj[key]);
          }
        }
      }
    }

    traverseAndReplace(gameSave);

    console.log(`farmhandReference替换完成，总共替换了 ${replacementCount} 个`);

    return newSaveData;
  } catch (error) {
    throw new Error(`替换farmhandReference失败: ${error.message}`);
  }
}
