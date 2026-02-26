# Stardew Save Editor (Web)

星露谷物语存档主机迁移工具，Web 版本，桌面版见 https://github.com/dxlxxx/stardew-save-editor-electron

## 功能

- 解析并编辑 Stardew Valley 存档 XML
- 上传主存档文件与 `SaveGameInfo`
- 选择成员并迁移为主机
- 导出修改后的文件（浏览器下载）

## 使用方式

1. 上传主存档文件（通常是与存档目录同名的文件）。
2. 上传 `SaveGameInfo` 文件。
3. 在玩家列表中选择要设置为主机的玩家。
4. 执行迁移并下载导出的新文件。
5. 用下载后的文件替换原存档。

> 强烈建议在操作前先备份原始存档！！

## 本地开发

```bash
npm install
npm run dev
```

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，可部署到任意静态托管服务。

## 技术栈

- Vue 3
- Vite
- Element Plus
- fast-xml-parser
