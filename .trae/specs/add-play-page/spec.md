# 在线玩页面（MC 模拟游戏）Spec

## Why
用户希望在网站上增加一个可玩的 Minecraft 风格小游戏页面，让访客不用装客户端也能在浏览器里体验类似 MC 1.21.x 的玩法，作为网站的趣味互动内容。

## What Changes
- 新增 `play.html` 页面，中文名"在线玩"，复用全站深色渐变背景、footer 主题设计
- 入口仅在所有页面的**页脚（footer）**显示"在线玩"链接，不在顶部导航栏显示
- 页面主体为一个圆角矩形的游戏画布区域，用 Canvas 渲染第一人称的方块世界
- 游戏画布下方提供"全屏"按钮，点击后游戏进入浏览器全屏模式
- 游戏内容模拟 Minecraft 1.21.x 风格：
  - 第一人称视角，WASD 移动、空格跳跃、鼠标转向
  - 方块世界（草地、泥土、石头、木头、树叶等基础方块）
  - 左键破坏方块、右键放置方块
  - 顶部物品栏（hotbar）9 格，数字键 1-9 切换当前方块类型
  - 准星（十字）居中显示
  - 方块纹理使用像素风纯色/简单图案绘制，贴近 MC 1.21.x 视觉
- UI 设计与 MC 1.21.x 相同：hotbar 居中底部、准星居中、十字光标、方块图标
- 页面加载时显示"点击开始"提示（浏览器需要用户交互后才能锁定鼠标）
- 移动端兼容：触摸屏显示虚拟摇杆和跳跃/破坏/放置按钮

## Impact
- Affected code:
  - 新增 `play.html`
  - 新增 `play.js`（游戏逻辑）
  - 新增 `play.css` 或在 `styles.css` 追加样式（推荐独立文件，避免污染全站样式）
  - 修改所有页面的 **footer（页脚）**，新增"在线玩"链接（index.html / event.html / announcement.html / wiki.html / allwiki.html / survival.html / bedwars.html / enchantments.html / agreement.html / admin.html / sitemap.html / 404.html / play.html 自身）
  - **不修改**任何页面的顶部导航栏（nav-links）
  - `script.js` 无需改动

## ADDED Requirements

### Requirement: 在线玩页面入口
系统 SHALL 仅在所有页面的**页脚（footer）**提供"在线玩"入口，点击跳转到 `play.html`。入口**不**出现在顶部导航栏。

#### Scenario: 桌面端页脚入口
- **WHEN** 用户在任意页面滚动到页脚，点击"在线玩"链接
- **THEN** 跳转到 `play.html`

#### Scenario: 移动端页脚入口
- **WHEN** 移动端用户滚动到页脚，点击"在线玩"链接
- **THEN** 跳转到 `play.html`

#### Scenario: 导航栏不含入口
- **WHEN** 用户查看任意页面顶部导航栏（桌面端导航或移动端汉堡菜单）
- **THEN** 导航栏中**不**出现"在线玩"链接

### Requirement: 页面主题一致
`play.html` SHALL 复用全站导航栏、深色渐变背景、footer，视觉风格与其他页面一致。

#### Scenario: 页面外观
- **WHEN** 用户打开 `play.html`
- **THEN** 顶部导航栏、背景渐变、底部 footer 与其他页面相同

### Requirement: 圆角矩形游戏区域
页面主体 SHALL 展示一个圆角矩形的 Canvas 游戏区域，承载游戏画面。

#### Scenario: 游戏区域外观
- **WHEN** 页面加载
- **THEN** 页面中央显示一个圆角矩形的游戏画布，带边框和阴影，符合全站设计语言

### Requirement: 全屏按钮
游戏画布下方 SHALL 提供"全屏"按钮。

#### Scenario: 进入全屏
- **WHEN** 用户点击"全屏"按钮
- **THEN** 游戏画布进入浏览器全屏模式，游戏区域铺满屏幕

#### Scenario: 退出全屏
- **WHEN** 用户按 ESC 或点击全屏按钮再次
- **THEN** 退出全屏，恢复普通页面布局

### Requirement: 点击开始提示
游戏 SHALL 在用户首次交互前显示"点击开始"提示，因为浏览器需要用户手势才能锁定鼠标。

#### Scenario: 首次进入
- **WHEN** 页面加载完成
- **THEN** 游戏画布上覆盖"点击开始"提示，游戏暂停
- **WHEN** 用户点击画布
- **THEN** 提示消失，鼠标锁定，游戏开始

### Requirement: 第一人称移动与视角
游戏 SHALL 支持第一人称视角，WASD 移动、空格跳跃、鼠标转向。

#### Scenario: 键盘移动
- **WHEN** 游戏进行中，用户按 W/A/S/D
- **THEN** 玩家在方块世界中前后左右移动

#### Scenario: 鼠标转向
- **WHEN** 游戏进行中，用户移动鼠标
- **THEN** 第一人称视角跟随转向

#### Scenario: 跳跃
- **WHEN** 用户按空格
- **THEN** 玩家跳跃

### Requirement: 方块破坏与放置
游戏 SHALL 支持左键破坏方块、右键放置方块。

#### Scenario: 破坏方块
- **WHEN** 用户准星对准方块并按左键
- **THEN** 该方块被破坏

#### Scenario: 放置方块
- **WHEN** 用户准星对准方块表面并按右键
- **THEN** 在该表面放置当前选中的方块

### Requirement: 物品栏（Hotbar）
游戏 SHALL 在底部居中显示 9 格 hotbar，数字键 1-9 切换当前方块类型。

#### Scenario: 切换方块
- **WHEN** 用户按数字键 1-9
- **THEN** hotbar 高亮对应格子，当前方块类型切换

#### Scenario: hotbar 显示
- **WHEN** 游戏进行中
- **THEN** 底部居中显示 9 格 hotbar，每格显示对应方块的图标，当前格高亮

### Requirement: 方块世界
游戏 SHALL 生成一个包含草地、泥土、石头、木头、树叶等基础方块的小型世界。

#### Scenario: 世界生成
- **WHEN** 游戏开始
- **THEN** 生成一片有草地地表、有树木、有石头地下的方块世界

### Requirement: MC 1.21.x UI 风格
游戏 UI SHALL 贴近 Minecraft 1.21.x 视觉风格：像素风准星、像素风 hotbar、方块纹理像素化。

#### Scenario: 准星
- **WHEN** 游戏进行中
- **THEN** 屏幕正中显示白色十字准星，像素风样式

#### Scenario: hotbar 风格
- **WHEN** 游戏进行中
- **THEN** hotbar 为 MC 风格的灰色格子边框，选中格有高亮描边

### Requirement: 移动端触摸控制
游戏 SHALL 在移动端显示虚拟摇杆和跳跃/破坏/放置按钮。

#### Scenario: 移动端控制
- **WHEN** 移动端用户进入游戏
- **THEN** 左下显示虚拟摇杆控制移动，右下显示跳跃、破坏、放置按钮
