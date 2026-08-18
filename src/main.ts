/** 入口：创建平台 → 组装引擎 → 启动 */

import { createPlatform } from '@core/platform';
import { Engine } from '@core/engine';
import { App } from '@game/app';

const platform = createPlatform();
const app = new App(platform);
const engine = new Engine(platform, app);
engine.start();