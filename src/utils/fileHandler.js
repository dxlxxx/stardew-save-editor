import { saveAs } from "file-saver";

// 检测是否在Electron环境
const isElectron = () => {
  return (
    typeof window !== "undefined" &&
    window.electronAPI &&
    window.electronAPI.isElectron
  );
};

/**
 * 读取文件内容为文本
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 文件文本内容
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("文件读取失败"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * 导出存档文件
 * @param {string} content - 文件内容
 * @param {string} fileName - 文件名（不含扩展名）
 */
export async function exportSaveFile(content, fileName) {
  try {
    // Electron环境：使用原生文件对话框保存
    if (isElectron()) {
      const result = await window.electronAPI.saveFileDialog(fileName, [
        { name: "所有文件", extensions: ["*"] },
      ]);

      if (result.canceled) {
        throw new Error("用户取消了保存");
      }

      const saveResult = await window.electronAPI.saveFile(
        result.filePath,
        content
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      return;
    }

    // 浏览器环境：使用file-saver下载
    const blob = new Blob([content], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  } catch (error) {
    throw new Error(`文件导出失败: ${error.message}`);
  }
}

/**
 * 获取当前运行环境
 * @returns {string} 'electron' 或 'browser'
 */
export function getEnvironment() {
  return isElectron() ? "electron" : "browser";
}

/**
 * 验证是否为有效的星露谷存档文件
 * @param {string} xmlContent - XML 内容
 * @returns {boolean} 是否有效
 */
export function validateSaveFile(xmlContent) {
  // 只检查是否为有效的XML格式（包含<?xml标签或有<开头）
  if (!xmlContent || xmlContent.trim().length === 0) {
    return false;
  }
  const trimmed = xmlContent.trim();
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<");
}

/**
 * 验证是否为有效的SaveGameInfo文件
 * @param {string} xmlContent - XML 内容
 * @returns {boolean} 是否有效
 */
export function validateSaveGameInfo(xmlContent) {
  // SaveGameInfo文件只包含一个Farmer节点
  return xmlContent.includes("<Farmer") && xmlContent.includes("<name>");
}

/**
 * 在Electron环境中从目录加载存档文件
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Object>} 包含存档文件信息的对象
 */
export async function loadSaveFromDirectory(dirPath) {
  if (!isElectron()) {
    throw new Error("此功能仅在Electron环境中可用");
  }

  try {
    // 读取目录内容
    const result = await window.electronAPI.readDirectory(dirPath);
    if (!result.success) {
      throw new Error(result.error);
    }

    const files = result.files;
    console.log("目录路径:", dirPath);
    console.log("读取到的文件列表:", files);

    if (!files || files.length === 0) {
      throw new Error("目录为空或无法读取文件列表");
    }

    // 从目录路径获取目录名（存档文件名与目录名相同）
    const dirParts = dirPath.split(/[\\\/]/);
    const dirName = dirParts[dirParts.length - 1];
    console.log("目录名:", dirName);

    // 检查同名文件是否存在
    const saveFilePathResult = await window.electronAPI.joinPath(
      dirPath,
      dirName
    );
    if (!saveFilePathResult.success) {
      throw new Error(saveFilePathResult.error);
    }
    const saveFilePath = saveFilePathResult.path;

    const fileExistsResult = await window.electronAPI.fileExists(saveFilePath);
    if (!fileExistsResult.success || !fileExistsResult.exists) {
      throw new Error(`未找到存档文件: ${dirName}`);
    }

    const isFileResult = await window.electronAPI.isFile(saveFilePath);
    if (!isFileResult.success || !isFileResult.isFile) {
      throw new Error(`${dirName} 不是一个有效的文件`);
    }

    const saveFile = dirName;

    const saveInfoPathResult = await window.electronAPI.joinPath(
      dirPath,
      "SaveGameInfo"
    );
    if (!saveInfoPathResult.success) {
      throw new Error(saveInfoPathResult.error);
    }
    const saveInfoPath = saveInfoPathResult.path;

    // 读取主存档
    const saveResult = await window.electronAPI.readFile(saveFilePath);
    if (!saveResult.success) {
      throw new Error(`读取存档文件失败: ${saveResult.error}`);
    }

    const response = {
      saveFile: {
        name: saveFile,
        path: saveFilePath,
        content: saveResult.content,
      },
      saveInfo: null,
      dirPath,
    };

    // 尝试读取SaveGameInfo
    const saveInfoExists = await window.electronAPI.fileExists(saveInfoPath);
    if (saveInfoExists.exists) {
      const saveInfoResult = await window.electronAPI.readFile(saveInfoPath);
      if (saveInfoResult.success) {
        response.saveInfo = {
          name: "SaveGameInfo",
          path: saveInfoPath,
          content: saveInfoResult.content,
        };
      }
    }

    return response;
  } catch (error) {
    throw new Error(`加载存档失败: ${error.message}`);
  }
}

/**
 * 在Electron环境中保存文件（覆盖原文件）
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 */
export async function saveFileDirectly(filePath, content) {
  if (!isElectron()) {
    throw new Error("此功能仅在Electron环境中可用");
  }

  try {
    const result = await window.electronAPI.saveFile(filePath, content);
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (error) {
    throw new Error(`保存文件失败: ${error.message}`);
  }
}
