# 第一回 18 镜头场景资产清单

用途：把第一回从 6 个粗场景升级为 18 个可逐张替换的剧情镜头背景。当前游戏已建立同名资源位，正式美术图只需要覆盖 `minigame/assets/backgrounds/chapter001/scenes/` 下对应 JPG。

输出统一规格：

- 源图：`1170 x 2532`
- 游戏图：`780 x 1688` 和 `390 x 844`
- 构图：竖屏 3/4 俯视，底部 18%-22% 留给半透明交互面板
- 风格：同福客栈江湖情景喜剧，暖木、米纸光、朱砂点缀、少量玉绿色
- 禁止：现代物件、写实明星脸、暗黑武侠、科幻面板、过度紫蓝渐变

## 场景列表

| 编号 | 文件 | 用途 | 画面重点 |
|---|---|---|---|
| S01 | `ch001_s01_empty_noon.jpg` | 晌午算盘声、秀才叹气 | 空堂、柜台、账本、算盘、门外强光 |
| S02 | `ch001_s02_kitchen_peek.jpg` | 芙蓉探头、三钱争论、打断典故 | 后厨门半开、锅铲前景、柜台对峙 |
| S03 | `ch001_s03_door_heat.jpg` | 掌柜未归 | 门帘、街口热浪、等待感 |
| S04 | `ch001_s04_curtain_entry.jpg` | 掌柜掀帘入店 | 门帘先动、佟湘玉前景、白展堂半遮 |
| S05 | `ch001_s05_bundle_counter.jpg` | 李员外收账、龙井包袱 | 青布包袱、银两、茶包、掌柜高兴 |
| S06 | `ch001_s06_bai_entry.jpg` | 白展堂入店、京城来客介绍 | 白展堂低头、掌柜引荐、楼梯动线 |
| S07 | `ch001_s07_furong_watch.jpg` | 芙蓉觉得眼熟 | 芙蓉前景侧目、白展堂背影、中景压缩 |
| S08 | `ch001_s08_xiaobei_stairs.jpg` | 小贝跑下楼、问皇上 | 楼梯纵深、小贝脚步、白展堂停顿 |
| S09 | `ch001_s09_room_plate.jpg` | 天字号房、收拾客房 | 房牌、房门、窗闩、歪椅、乱被 |
| S10 | `ch001_s10_abacus_glance.jpg` | 白展堂看算盘、芙蓉盯背影 | 柜台近景、算盘一亮、背影构图 |
| S11 | `ch001_s11_low_voice.jpg` | 私下质疑、客栈规矩 | 柜台低声、掌柜稳场、芙蓉压低声音 |
| S12 | `ch001_s12_kitchen_order.jpg` | 大嘴问点菜、缺鲈鱼 | 后厨灶火、菜单牌、托盘、蒸汽 |
| S13 | `ch001_s13_tea_and_fee.jpg` | 房饭钱、赠茶上楼 | 账本、茶壶、楼梯茶香 |
| S14 | `ch001_s14_upstairs_crash.jpg` | 楼上哐当、倒地椅子 | 客房内部、倒椅、白展堂扶椅 |
| S15 | `ch001_s15_waist_clue.jpg` | 腰间鼓包、掌柜圆场 | 白展堂侧身、芙蓉视线、鼓包高光 |
| S16 | `ch001_s16_serve_spy.jpg` | 下楼密谈、送菜探房 | 楼梯、托盘、房内一瞥、温和侦查 |
| S17 | `ch001_s17_street_officer.jpg` | 窗外喧哗、官差画像 | 门外剪影、画像纸、小贝偷听 |
| S18 | `ch001_s18_final_door.jpg` | 登记册、楼梯隔离、江湖起风 | 大堂防线、登记册、官差临门定格 |

## 通用出图提示词

Create a vertical mobile game background for a warm comedic Jianghu inn management game. Scene: [替换成上表画面重点]. Location: Tongfu-style inn interior, slightly elevated 3/4 portrait camera, full-screen composition for WeChat mini game, readable gameplay zones, warm wood beams, rice-paper sunlight, cloth curtains, ledger papers, paper lanterns, jade green and cinnabar accents. Mood: lively sitcom warmth with subtle Jianghu suspense. Style: stylized 3D mobile game, not photorealistic, no celebrity likeness, no dark fantasy armor, no modern objects. Leave clear lower area for translucent action panel.

## 替换规则

1. 正式图保持相同文件名覆盖当前占位图。
2. 不要把人物画死在背景里，人物仍由角色模型层控制。
3. 背景里可以画远处剪影、道具和光影，但不要画完整主角。
4. 热点道具必须留出清晰区域：算盘、房牌、托盘、倒椅、画像、登记册。
5. 每张图底部不要放关键内容，避免被交互面板遮挡。
