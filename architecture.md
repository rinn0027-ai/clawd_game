# Claw'd — 架构文档

> **规则：每次对话开始前必须先读此文件。每次修改完成后必须更新对应章节。**

---

## 一、文件结构

```
clawd_game/
├── index.html              # 唯一 HTML，所有 DOM 结构在此定义
├── css/style.css           # 全部样式
├── js/
│   ├── main.js             # 入口：初始化 + rAF 游戏循环
│   ├── state.js            # 唯一全局状态源（所有模块从此 import）
│   ├── engine/
│   │   ├── constants.js    # 常量：GRAV/BNCE/ESIZ/ANIM_DEFS/ITEM_DEFS
│   │   ├── matter-world.js # Matter.js 物理世界封装
│   │   ├── physics.js      # 每帧物理步进（主体/克隆/道具/苹果同步）
│   │   └── renderer.js     # 画布绘制（所有阶段形态程序绘制）
│   ├── entities/
│   │   ├── drag.js         # 拖拽系统（pointermove/up/cancel）
│   │   └── individual.js   # 克隆生成/死亡/灵魂/血液/轨迹
│   ├── items/
│   │   ├── spawner.js      # 道具 & 苹果生成/清理
│   │   └── collisions.js   # 仅保留 checkClean（soap/bucket 近距判断）
│   ├── behavior/
│   │   ├── actions.js      # 用户操作（feed/play/sleep/pet）
│   │   ├── emotions.js     # 情绪 tick + 阶段检测 checkStage
│   │   └── lifecycle.js    # 时间推进/死亡/重生/checkAllDead
│   └── ui/
│       ├── chat.js         # Anthropic/Gemini API 对话面板
│       ├── feedback.js     # setLog / showBubble / spawnParticle / tickZzz
│       ├── hud.js          # 情绪条、人格标签、时钟更新
│       └── persistence.js  # saveGame/loadGame/initPhys/restartGame/buildScene
└── architecture.md         # 本文件
```

---

## 二、游戏主循环

```
main.js → requestAnimationFrame(loop)
  dt = min((ts - lastTs) / 1000, 0.05)   // 单位：秒，最大帧步 50ms
  tickAnim(dt)      → renderer.js：更新动画帧计数，重绘主体画布
  physStep(dt)      → physics.js：步进 Matter.js，同步所有实体 DOM 位置
  tickZzz(dt)       → feedback.js：睡眠时生成 zzz 粒子
  accumSec += dt
  while accumSec >= 1.0 → gameTick()   // 每真实秒 = 1 游戏分钟
    advanceTime / 情绪 tick / 阶段检测 / 死亡判断 / UI 更新
```

**绝对不能修改的循环约束：**
- `dt` 上限 0.05s（防止失焦后大步进）
- `SECS_PER_GMIN = 1.0`：1 真实秒 = 1 游戏分钟（main.js 硬编码）
- `gameTick` 只在 `accumSec` 积累后调用，不能直接调用多次

---

## 三、全局状态（state.js）

### 3.1 枚举 / 常量（不可变）

```js
E = { LONE:0, TRUST:1, HAPPY:2, CURIO:3, ATTACH:4, FEAR:5 }
STAGE_NAMES = ['蛋','婴儿','幼儿','少年','成年','老年']
STAGE_DAYS  = [0, 1, 2, 4, 6, 8]   // 达到该阶段所需 day 数
DRIFT = [.40, -.02, -.20, -.15, -.005, -.30]  // 情绪每游戏分钟自然漂移
```

### 3.2 物理对象（数组，原地修改，不重新赋值）

```js
phys = { x, y, vx, vy }          // 主体左上角坐标及速度（px / px·s⁻¹）
clones  = [ cloneObj, ... ]       // 最多 5 个，见 §3.5
items   = [ itemObj, ... ]        // 最多 10 个，见 §3.6
apples  = [ appleObj, ... ]       // 最多 3 个，见 §3.7
trailPool = [ {el, ctx}, × 5 ]   // 轨迹画布池（固定 5 个）
trailPos  = [ {x,y,f,fl}, ... ]  // 最近帧的轨迹位置（最多 5 条）
```

### 3.3 gs 对象（所有标量状态）

| 字段 | 类型 | 说明 |
|---|---|---|
| `emo[6]` | float[6] | 六维情绪，范围 0-100，索引对应 E 枚举 |
| `hunger` | float | 饥饿度 0-100 |
| `energy` | float | 精力 0-100 |
| `health` | float | 健康 0-100 |
| `day` | int | 游戏天数（0=蛋期，满 10 天自然死亡） |
| `gameHour` | int 0-23 | 游戏小时 |
| `gameMin` | int 0-59 | 游戏分钟 |
| `totalMins` | int | 本次生命累计游戏分钟 |
| `stage` | int 0-5 | 成长阶段，由 checkStage 根据 day 更新 |
| `isSleeping` | bool | 睡眠状态 |
| `isDead` | bool | 主体死亡（不等于 allDead） |
| `allDead` | bool | 主体+所有克隆全灭，触发死亡画面 |
| `deathCause` | string | 死因文本 |
| `actionLocked` | bool | 动作锁（防止动画中重复触发） |
| `entityDirty` | float 0-80 | 主体脏度 |
| `wanderTimer` | float | 自动漫游计时器（秒） |
| `minutesSinceInteract` | int | 上次互动后的游戏分钟数 |
| `apiKey` | string | Anthropic API Key（localStorage） |
| `geminiKey` | string | Gemini API Key（localStorage） |
| `geminiProxy` | string | Gemini 代理地址（localStorage） |
| `apiProvider` | 'anthropic'\|'gemini' | 当前 AI 提供商 |
| `chatHistory` | Message[] | 对话历史，最多保留 12 条 |
| `currentAnim` | string | 当前动画名：idle/sleep/eat/happy/sad |
| `animFrame` | int | 当前动画帧索引（0-3） |
| `animTimer` | float | 动画帧计时器（秒） |
| `flipX` | bool | 主体是否水平翻转 |
| `lastTs` | float | 上一帧时间戳（ms） |
| `accumSec` | float | gameTick 累计秒数 |
| `activeDrag` | DragState\|null | 当前拖拽状态，见 §3.4 |
| `rebirthTO` | TimeoutID | 重生定时器句柄 |
| `zzzTimer` | float | zzz 粒子计时器 |
| `bubbleTO` | TimeoutID | 主体气泡隐藏计时器 |

### 3.4 DragState（gs.activeDrag）

```js
{
  kind:  'main' | 'clone' | 'item',
  ref:   cloneObj | itemObj | null,   // 'main' 时为 null
  offX, offY: float,    // 指针与元素左上角偏移
  prevX, prevY: float,  // 上一帧指针位置（用于计算投掷速度）
  prevT: float,         // 上一帧时间戳（ms）
  moved: bool,          // 是否实际移动过（区分点击与拖拽）
}
```

### 3.5 cloneObj

```js
{
  el: HTMLDivElement,       // 克隆容器 div（position:absolute）
  bub: HTMLDivElement,      // 气泡 .cbub
  bubTO: TimeoutID,         // 气泡隐藏计时器
  ctx: CanvasRenderingContext2D,  // 16×16 画布 context
  x, y: float,              // 左上角位置（px）
  vx, vy: float,            // 速度（px·s⁻¹，从 Matter 体读取 ×60）
  af: int,                  // 动画帧
  at: float,                // 动画帧计时器
  age: float,               // 存活秒数（600s 自然死亡）
  anim: string,             // 当前动画名
  animLock: bool,           // 动画锁（true 时不随主体同步）
  flipX: bool,              // 水平翻转
  dirty: float,             // 脏度 0-80
  dragging: bool,           // 是否被拖拽中
  dead: bool,               // 是否已死亡
}
```

### 3.6 itemObj

```js
{
  type: 'ball'|'hammer'|'rock'|'bucket'|'soap',
  el: HTMLDivElement,
  x, y: float,             // 左上角位置（从 Matter 体同步）
  vx, vy: float,           // 速度（从 Matter 体同步 ×60）
  size: int,               // 像素尺寸（来自 ITEM_DEFS）
  mass: float,             // 质量（来自 ITEM_DEFS，影响 Matter density）
  bounce: float,           // 弹性（来自 ITEM_DEFS）
  matterBody: MatterBody,  // 对应的 Matter.js 刚体引用
}
```

### 3.7 appleObj

```js
{
  el: HTMLDivElement,
  x, y: float,             // 左上角位置（从 Matter 体同步）
  vx, vy: float,           // 速度
  matterBody: MatterBody,  // 对应的 Matter.js 刚体引用
}
```

---

## 四、Matter.js 物理系统（matter-world.js）

### 4.1 引擎配置

- CDN：`matter-js 0.19.0`，通过 `window.Matter` 访问（ES module 中用 `window.Matter.xxx`）
- 重力：默认 `gravity.y=1, gravity.scale=0.001`（不修改）
- 迭代：`positionIterations:6, velocityIterations:4, constraintIterations:2`
- 每帧调用：`Engine.update(engine, dt * 1000)`（dt 单位秒转 ms）

### 4.2 静态边界体

由 `initWorld()` 在场景尺寸确定后创建，标签为 `'ground'/'wallL'/'wallR'`：
- `ground`：中心在 `(w/2, scnH()*0.55 + 25)`，宽 `w+200`，高 50
- `wallL`：中心在 `(-25, h/2)`，宽 50，高 `h*3`
- `wallR`：中心在 `(w+25, h/2)`，宽 50，高 `h*3`

### 4.3 动态刚体规格

| 实体 | 形状 | 尺寸 | 中心 | label |
|---|---|---|---|---|
| 主体 | 矩形 | 40×56 | `(phys.x+32, phys.y+32)` | `'main'` |
| 克隆 | 矩形 | 36×52 | `(c.x+32, c.y+32)` | `'clone'` |
| 道具 | 圆形 | `radius = size/2 * 0.82` | `(item.x+size/2, item.y+size/2)` | 道具类型名 |
| 苹果 | 圆形 | radius=5 | `(apple.x+5, apple.y+5)` | `'apple'` |

所有动态体：`inertia:Infinity`（不旋转）

### 4.4 Body Map（注意事项）

```js
// matter-world.js 导出的 Map，key = 游戏对象，value = Matter Body
cloneBodyMap: Map<cloneObj, MatterBody>
itemBodyMap:  Map<itemObj,  MatterBody>
appleBodyMap: Map<appleObj, MatterBody>
mainBody: MatterBody | null   // 主体刚体，死亡时设为 null
```

**每次创建/销毁实体必须同步维护这些 Map，否则 Matter 体泄漏。**

### 4.5 碰撞事件

`onCollision(fn)` 注册回调，Matter `collisionStart` 事件触发，在 `physics.js` 中处理：
- `rock` 打 `main`/`clone` 且相对速度 > 60 px/s → `killEntity`
- `hammer` 打 `main`/`clone` 且相对速度 > 80 px/s → BONK 效果 + 向上冲量
- `ball` 打 `main`/`clone` 且相对速度 > 30 px/s → 快乐 +0.8

### 4.6 速度单位换算（绝对不能搞混）

```
游戏内速度（px/s）÷ 60 = Matter body.velocity（px/step at 60fps）
读取时：body.velocity.x * 60 = 游戏速度（px/s）
投掷：Body.setVelocity(body, { x: vx/60, y: vy/60 })
漫游：Body.setVelocity(body, { x: (Math.random()-.5)*1.8, y: body.velocity.y })
```

### 4.7 拖拽时的运动学模式

拖拽期间每帧在 `physStep` 中强制设置：
```js
Body.setPosition(body, { x: phys.x+32, y: phys.y+32 });
Body.setVelocity(body, { x: 0, y: 0 });
```
松手时通过 `drag.js releaseDrag` 调用 `Body.setVelocity` 施加投掷速度。

---

## 五、渲染系统（renderer.js）

### 5.1 画布规格

- 主体：`#clawd-canvas`，16×16 像素，CSS 64×64px，`image-rendering: pixelated`
- 克隆：动态创建 `<canvas width=16 height=16>`，同样 64×64 渲染
- `imageSmoothingEnabled = false`

### 5.2 阶段形态（全程序绘制，无图片资源）

`drawEntityFrame(ectx, anim, frame, flip, dirty)` 根据 `gs.stage` 分发：

| gs.stage | 阶段 | CSS scale | 绘制函数 | 特征 |
|---|---|---|---|---|
| 0 | 🥚 蛋 | 0.42 | `_drawEgg` | 椭圆蛋，4帧摇晃，gameHour≥20时出现裂缝 |
| 1 | 👶 婴儿 | 0.50 | `_drawBaby` | 14×6大头，1px臂截，短腿，色#e08858 |
| 2 | 🐣 幼儿 | 0.65 | `_drawToddler` | 12×5头，3px短臂，色#d47050 |
| 3 | 🐥 少年 | 0.80 | `_drawTeen` | 8×4头，5px¾臂，较长腿，色#cc6840 |
| 4 | 🐈 成年 | 1.00 | `_drawAdult` | 8×4头，全16px横臂，标准腿，色#cc6644 |
| 5 | 🧓 老年 | 1.00 | `_drawElder` | 整体下移（驼背），1px细眼，额点，色#aa5535 + sepia CSS |

CSS scale 通过 `transform: scale(X)` + `transform-origin: bottom center` 实现，保持角色踩地。

老年阶段额外 CSS filter：`sepia(22%) brightness(0.82) contrast(0.9)`

### 5.3 动画帧偏移规则（所有阶段通用）

```
_yOff(anim, frame):
  idle:  [ 0, +1,  0, -1]  (轻微上下晃动)
  happy: [ 0, -2, -3, -1]  (跳跃弧线)
  sad:   [ 0, +1, +1,  0]  (下沉)
  sleep: [ 0,  0, +1,  0]  (轻微下沉)
  eat:   固定 0，frames 1-2 显示嘴巴像素
```

### 5.4 阶段视觉更新

`applyStageVisuals()` 在以下时机调用：
1. `initPhys()` 初始化时
2. `checkStage()` 检测到阶段变化时（动态 import 避免循环依赖）
3. `rebirthMain()` 重生时（明确设 stage=0 后立即调用）
4. `restartGame()` 重启时
5. `spawnIndividual()` 新克隆生成后（同步 CSS 到克隆画布）

---

## 六、成长阶段系统

### 6.1 阶段判定

```
checkStage()（每游戏分钟调用，在 emotions.js 中）：
  根据 gs.day 与 STAGE_DAYS 对比，检测 gs.stage 是否需要更新
  若变化：更新 gs.stage → 调用 applyStageVisuals() → 显示过渡通知
```

### 6.2 生命时间线

```
gs.day 推进：每游戏小时（60游戏分钟=60真实秒）gameMin 归零时 day++
STAGE_DAYS = [0, 1, 2, 4, 6, 8]
             蛋  婴 幼  少 成 老
day >= 10 → checkCritical() 触发自然死亡 ('寿终正寝')
```

### 6.3 死亡与重生

| 类型 | 触发 | 后续 |
|---|---|---|
| 自然死亡 | day≥10 或 health≤0 | 1.8s 后：自然死亡→rebirthMain；饥饿→checkAllDead |
| 石头压扁 | Matter 碰撞 rock+relSpd>60 | killEntity → checkAllDead |
| 全灭 | isDead 且所有 clone 均 dead | 显示死亡画面 |
| 重生 | 自然死亡 1s 后 | day=0, stage=0, 蛋形出现 |
| 重启 | 玩家点击重启按钮 | day=1, stage=1（跳过蛋期） |

---

## 七、情绪系统

### 7.1 六维情绪

每游戏分钟自然漂移（DRIFT）：
- 孤独 +0.40（持续升高需要互动）
- 信任 -0.02（缓慢下降）
- 快乐 -0.20（需要喂食/玩耍维持）
- 好奇 -0.15
- 依恋 -0.005（极缓慢）
- 恐惧 -0.30（自然消散）

### 7.2 情绪联动规则（不可随意修改）

```
孤独>70   → 快乐-0.15×(孤独/100), 好奇-0.10×(孤独/100)
恐惧>50   → 好奇-0.12×(恐惧/100), 快乐-0.10×(恐惧/100)
信任>70   → 快乐+0.05×((信任-70)/30)
依恋>60   → 孤独-0.10×((依恋-60)/40)
快乐>75   → 依恋+0.01
信任<15   → 恐惧+0.20
minutesSinceInteract>30 → 孤独+0.04×(超出分钟数), 孤独>80时信任-0.05
```

### 7.3 时段影响

```
22:00-04:00 → 好奇+0.08, 恐惧+0.03
05:00-08:00 → 快乐+0.05, 恐惧-0.05
13:00-17:00 → 孤独+0.05
```

---

## 八、克隆（Individual）系统

- 最多同时存在 5 个
- 触发条件：投掷速度>320px/s 时概率 0.55；玩耍快乐>85 时概率 0.3
- 初始速度：`vx=(Math.random()-.5)*120, vy=-100-Math.random()*80`（Matter body 同步）
- 自然寿命：600s（10真实分钟），死亡后 500ms 补充新克隆
- 同步主体动画（除非 animLock=true）
- 独立的 dirty 值（初始 = 主体 dirty * 0.7）
- 每个克隆拥有独立的 Matter 刚体（cloneBodyMap 管理）

---

## 九、道具系统

### 9.1 道具配置（constants.js ITEM_DEFS，不可修改）

| 类型 | emoji | size | mass | bounce | fs |
|---|---|---|---|---|---|
| ball | 🔵 | 22 | 0.4 | 0.80 | 20 |
| hammer | 🔨 | 24 | 0.9 | 0.12 | 22 |
| rock | 🪨 | 30 | 2.8 | 0.06 | 26 |
| bucket | 🪣 | 24 | 0.6 | 0.22 | 22 |
| soap | 🧼 | 18 | 0.3 | 0.42 | 16 |

### 9.2 Matter.js 对应参数

| 类型 | restitution | density |
|---|---|---|
| ball | 0.80 | 0.001 |
| hammer | 0.12 | 0.008 |
| rock | 0.06 | 0.030 |
| bucket | 0.22 | 0.005 |
| soap | 0.42 | 0.001 |

### 9.3 苹果

- 最多 3 个，摇树（速度>80px/s 且命中树坐标）触发
- 10×10px 红色 div，Matter 圆形 radius=5
- 吃掉条件：主体/克隆与苹果中心距离 < 46px（proximity，非碰撞）

### 9.4 洗澡（checkClean）

仅 `collisions.js` 保留，proximity 判断：
- soap/bucket 中心距主体/克隆中心 < 48px
- soap 每帧扣脏度 4，bucket 扣 2

---

## 十、AI 对话系统

- 支持双 provider：Anthropic（`claude-sonnet-4-20250514`）和 Gemini（`gemini-2.0-flash`）
- 历史最多 12 条消息，超出时取最后 12 条
- System prompt 包含：性格、状态、时段、阶段、情绪六维数值
- API Key 存 localStorage（`clawd_apikey` / `clawd_geminikey` / `clawd_geminiproxy`）

---

## 十一、持久化

`saveGame()` 每 30 秒自动保存到 `localStorage('clawd_save')`，保存字段：
`hunger, energy, health, day, gameHour, gameMin, totalMins, emo[6], stage, isSleeping, physX, physY, entityDirty`

---

## 十二、DOM 关键 ID

| ID | 作用 |
|---|---|
| `#scene` | 游戏场景容器（所有实体的 position:absolute 父元素） |
| `#clawd-wrap` | 主体容器 div（position 由 phys.x/y 驱动） |
| `#clawd-canvas` | 主体 16×16 画布 |
| `#bubble` | 主体气泡 |
| `#ground` | 地面装饰 div |
| `#tree` | 树（可摇晃，碰撞触发苹果） |
| `#stage` | 阶段文字显示（6px 小字） |
| `#death` | 死亡画面覆盖层 |
| `#chat-panel` | 对话面板（toggle .open） |
| `#log` | 底部事件日志单行文本 |

---

## 十三、绝对不能修改的底层约定

1. **`state.js` 中的数组不能重新赋值**（`clones = []` 是错的，应 `clones.length = 0`）
2. **Matter.js 通过 `window.Matter` 访问**，不能 import（CDN 全局加载）
3. **速度换算**：游戏速度 px/s，Matter velocity px/step，换算系数 60（详见 §4.6）
4. **`gs.stage` 只能由 `checkStage()` 或 `rebirthMain()`/`restartGame()` 修改**，不能在其他地方随意设置
5. **Matter Body Map 必须同步**：每次 `World.add` 对应一次 Map.set，`World.remove` 对应 Map.delete
6. **`physStep` 中道具/克隆的 DOM 位置全部从 Matter 体位置读取**，不能再手动积分
7. **`gndY() = scnH()*0.55 - ESIZ`**：地面 y 坐标计算方式，ESIZ=64 不变
8. **动画名只有 5 种**：`idle / sleep / eat / happy / sad`（对应 ANIM_DEFS 的键）
9. **`#clawd-canvas` 的 CSS filter 由 `applyStageVisuals()` 统一管理**，其他地方不能单独修改
10. **克隆气泡使用 `.cbub` class + `ent.bubTO` 计时器**，与主体气泡 `#bubble + bubbleTO` 完全独立

---

## 十四、变更日志

| 版本 | 变更内容 |
|---|---|
| 初版 | 基础物理（手动 Euler 积分）、情绪系统、克隆、道具、AI 对话 |
| Matter.js 集成 | 替换手动积分为 Matter.js 0.19；实体碰撞事件化；道具/克隆/苹果全部纳入物理世界 |
| 阶段形态变化 | 全程序绘制替代 base64 精灵图；6 个阶段独立形态；CSS scale 驱动大小渐变；`applyStageVisuals()` 统一管理 |
