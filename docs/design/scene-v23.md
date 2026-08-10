# 13 张剧情重点地图精修 v23

更新时间：2026-08-03

## 实现范围

v23 在不重画既有背景、不修改地图碰撞和剧情坐标的前提下，为 13 张重点地图补齐：

- 39 张早晨、中午、晚间透明 WebP 光照层。
- 39 张按现有障碍边界提取的透明 PNG 前景遮挡。
- 27 份压缩剧情道具运行副本，按剧情旗标显示或隐藏。
- 三个可选原生分包：`scene-core-v23`、`scene-s1-v23`、`scene-s2-v23`。

覆盖地图：客栈、后院、十字街、纸坊、废弃驿站、粮市、商盟会馆、地下账库、水巷分店、江南码头、河市、香料作坊和旧灶院。

## 运行接口

- `MapArt.layers` 支持 `kind / phase / weather / blend / alpha / order`。
- `MapArt.props` 继续使用 `pivot / sortY / obstacleId / requires / unless`，并增加 `interactionAnchor`，将实际道具位置与既有热点坐标解耦。
- 绘制顺序固定为：背景、地面道具、热点、人物与 NPC、排序前景、固定前景、时段光照、天气、UI。
- 当前时段只预加载本时段正式光照，并预取下一时段；相邻地图只预取当前时段。
- v23 资源属于可选增强。加载失败时继续使用原背景与 Canvas 通用光照，不阻塞地图，也不进入色块占位场景。

## 分包预算

| 分包 | 内容 | 体积 |
|---|---|---:|
| `scene-core-v23` | 客栈、后院、十字街 | 0.98 MB |
| `scene-s1-v23` | 五张第一季重点图 | 1.52 MB |
| `scene-s2-v23` | 五张江南重点图 | 1.52 MB |
| 合计 | v23 新增运行资源 | 4.03 MB |

三个分包根目录均包含最小 `game.js`，每包低于内部 `3.8 MB` 目标，新增资源合计低于 `4.5 MB` 目标。

## 美术来源

三张无文字剧情道具源图存放于：

- `D:\AI\design-assets\dengxia\scene-v23\source\core-props-chroma-v23.png`
- `D:\AI\design-assets\dengxia\scene-v23\source\s1-props-chroma-v23.png`
- `D:\AI\design-assets\dengxia\scene-v23\source\s2-props-chroma-v23.png`

Creative Production 继续使用面板 `3c8d45a9-cc54-4953-b929-c20701dab745`，三组素材登记完成后 revision 为 `95`。确定性去背、边缘去色、前景提取、光照生成和压缩由 `tools/build_scene_layers_v23.js` 完成。

## 复现与检查

```powershell
node tools/build_scene_layers_v23.js
node tools/validate_scene_layers_v23.js
node tools/render_scene_v23_previews.js
```

构建报告：`outputs/scene-v23-build-report.json`。

39 张 `844 × 390` 运行合成与三张联系表位于 `outputs/product-design/scene-v23-audit/`。

## 验收状态

- 13 张地图、三时段、Alpha、尺寸、资源路径、条件旗标、`sortY` 和障碍关联通过自动检查。
- 道具热点使用 `interactionAnchor` 对齐，非装饰道具与原热点距离不超过 12 逻辑像素。
- 正式光照加载成功时不再叠加通用色块；失败时后备路径仍可用。
- 24 项全局验证、AssetStore 测试及全仓库 95 个 JavaScript 文件语法检查通过。
- 微信开发者工具 CLI 当前因“服务端口关闭”未完成自动真实截图；需要在 GUI 开启服务端口后补做触控、帧率和动态遮挡验收。
- Canva 连接器连续两次网络失败，本轮没有产生草稿或保存修改。
- Figma 尚未提供原设计文件链接，本轮没有创建替代文件。

### 2026-08-03 客栈热修

- 柜台前景只截取`y=220–294`的真实前沿，不再把后墙和货架覆盖到柜台后 NPC 上。
- 白展堂脚底锚点调整到`(430,250)`，头肩与上半身可见，腰部仍由柜台遮挡。
- 右侧桌席碰撞调整后，客栈主出生点可以实际走入街道出口。

## 下一恢复点

1. 开启微信开发者工具服务端口，真实编译并导出三种横屏比例截图。
2. 实走客栈、纸坊、码头三个锚点，检查人物前后遮挡、任务物件状态变化和早晚淡变。
3. Canva 网络恢复后，将 13 图分层、三时段对比和剧情道具状态加入 `DAHQuvyc0eE`；先展示预览，得到明确许可后保存。
4. 收到 Figma 原文件链接后同步地图状态、光照与过场组件。
