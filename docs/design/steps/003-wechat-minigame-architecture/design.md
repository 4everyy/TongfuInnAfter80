# 003 WeChat Mini Game Architecture

## Goal

把项目开发主线调整为微信小游戏优先，确保首页和每一章剧情都能在微信开发者工具中实时调试。

## Decision

新增 `minigame/` 原生微信小游戏工程，作为之后主要开发入口。

保留 Unity，但 Unity 暂时不再作为日常调试主线。Unity 用于：

- 3D 模型和场景验证。
- 未来高配表现版本。
- 可能的角色渲染、截图、素材产出。

## Why

用户目标是轻量小游戏，重点是章节玩法和交互，而不是高成本 3D 构建。

微信小游戏原生工程的优势：

- 打开快。
- 保存后微信开发者工具可直接刷新。
- 更容易调试触摸、Canvas、小游戏生命周期。
- 更符合后续发布目标。

## Initial Implementation

本轮创建：

- `minigame/project.config.json`
- `minigame/game.json`
- `minigame/game.js`
- `minigame/assets/home-screen-concept-v3-mobile.jpg`

当前可玩内容：

- 首页展示已确认的首页概念图。
- 点击 `故事模式` 进入第一回交互原型。
- 第一回支持选择角色、选择行动、执行行动、查看资源和日志变化。
- 点击 `自由模式` 进入占位页面。

## Architecture Shape

```text
minigame/
  project.config.json
  game.json
  game.js
  assets/
    home-screen-concept-v3-mobile.jpg
```

下一步会逐渐拆分：

```text
minigame/
  src/
    data/
      chapters.js
      characters.js
      actions.js
    systems/
      story-state.js
      renderer.js
      input.js
    screens/
      home-screen.js
      story-screen.js
      free-screen.js
```

## Acceptance Criteria

- 微信开发者工具可以直接导入 `minigame/`。
- 首页能看到游戏概念图和两个入口。
- 点击故事模式能进入第一回。
- 第一回有真实交互，不只是静态文字。
- 不需要 Unity 构建即可验证交互效果。

## Next Steps

1. 用微信开发者工具打开 `minigame/`。
2. 确认首页尺寸和触摸区域。
3. 把 `game.js` 拆成数据层、渲染层、输入层。
4. 强化第一回：三幕事件、客栈热点、郭芙蓉加入结算。
