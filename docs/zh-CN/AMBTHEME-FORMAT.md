# .ambtheme 主题格式说明 — schema 1

[English](../AMBTHEME-FORMAT.md) · [主题使用帮助](THEMES.md) · [示例 JSON](../theme-example.json) · [下载基础示例](../AMBER-Theme-Starter.ambtheme)

适用于 AMBER 与 AmberE 1.1.0–1.2.1，两款产品读取同一格式。主题不能更改产品身份、账号规则、更新仓库或游戏数据。基础示例展示配色、圆角和双栏首页，单独提供下载，不预置在软件内。本说明及基础示例采用 MPL-2.0 许可。

## 导入、修改和恢复

设置 → 外观与主题 → 主题库 → 导入。检查作者和兼容信息后，选择“应用此主题”或“仅加入主题库”。已有主题直接点击“应用”；“预览与编辑”用于载入可修改的草稿。

首次应用及重大改动需要 30 秒内确认，未确认或中断后会恢复原样。已确认且未变化的主题直接切换。按范围导入与精细编辑在高级菜单；Ctrl+Shift+F12 可恢复经典外观，不影响账号与实例。

## 文件结构

`.ambtheme` 是 ZIP 压缩包，不能直接把 JSON 文件改后缀。压缩包根目录直接放置以下文件，不再嵌套外层文件夹：

```text
theme.json                         必需，UTF-8 JSON
LICENSE.txt                        可选
preview.png                        可选，目前主题库不展示这张图
assets/<64 位小写十六进制>.png       theme.json 引用的图片
```

只允许以上文件。说明文档应放在主题包外；在包内添加 README 等文件会被拒绝。`AMBTHEME-Guide-1.2.0.zip` 是帮助资料压缩包，不能作为主题导入；请先解压，再导入其中的 `.ambtheme` 示例。

顶层 `format` 必须为 `ambtheme`，`schema` 必须为 `1`，`appearance` 保存外观配置。可选 `compatibleVersions` 为版本数组，例如 `["1.1.0"]`。`requiredCapabilities` 可包含 `appearance-v1`、`layout-v1`、`composition-v1`。布局树应声明前两者；使用 1.1.1 编排或分区样式时还需声明第三项。未知必需能力或格式版本会被拒绝；未匹配当前软件版本会提示但允许预览；未知可选外观字段会提示并忽略。

## appearance 字段

缺失字段使用运行时默认值；[完整示例](../theme-example.json) 为演示调整了部分默认值。数字不要写成带单位的字符串。颜色必须是六位 HEX，例如 `#245b48`。

| 字段 | 取值与含义 |
| --- | --- |
| `name`、`author`、`source`、`license` | 名称、作者、来源、许可，各最多 300 字符。仅展示，不执行或自动打开。 |
| `enabled` | 布尔值；导入的主题在应用时启用。 |
| `mode` | `system` 跟随系统、`light` 浅色、`dark` 深色、`custom` 完全自定义。只有 custom 使用全部自定义颜色。 |
| `accent`、`background`、`surface`、`text`、`muted`、`line` | 强调色、背景、面板、正文、次要文字、边框；其他模式只自定义强调色。 |
| `radius`、`borderWidth` | 控件圆角 0–24 px、边框 0–3 px；系统窗口边框另设。 |
| `controlHeight`、`rowHeight`、`iconSize` | 控件高 36–60 px、列表行高 40–90 px、实例图标 24–64 px。 |
| `fontFamily`、`fontSize`、`scale` | 本机字体名称 1–80 字符，不含 CSS 语法；字号 12–22 px；缩放 85–125%。缺失字体或字形自动回退。 |
| `fontOffset` | 1.1.2 新增，可选，默认 0；范围 −3 至 +3 px，编辑器步进 0.5 px。正值向下、负值向上；仅调整按钮、菜单和单行输入框的文字。旧版忽略此可选字段。 |
| `menuStyle` | `filled` 填色、`outline` 描边、`minimal` 简约。 |
| `listStyle` | `lines` 分隔线、`striped` 交替底色、`spacious` 留白。 |
| `navLabels` | 是否显示导航文字，false 允许更窄的图标侧栏。 |
| `panelOpacity`、`windowOpacity` | 面板不透明度 60–100%；整个窗口 70–100%，后者仅在桌面端生效，也会淡化文字。 |
| `backgroundAsset`、`heroAsset`、`artworkAsset` | null 或 PNG 文件名（SHA-256 加 .png，不带 assets/ 前缀），分别用于软件背景、启动背景和配图模块。 |
| `backgroundFit`、`backgroundPosition` | `cover` 覆盖或 `contain` 完整显示；垂直位置 0–100%。 |
| `overlay`、`blur` | 遮罩 0–90%；背景模糊 0–20 px。 |
| `motion` | `none`、`light`、`standard`。 |
| `canvas` | null 表示经典首页，否则为下述布局树。 |

## 首页布局树

每个节点需要唯一 `id`（1–60 个英文字母、数字或连字符）及 `type`：

- `module`：`module` 可为 launch 启动、shortcuts 快捷操作、activity 任务、details 实例信息、instances 实例列表、favorites 收藏、recent 最近启动、artwork 配图。同一模块最多一次，launch 必须保留。
- `split`：填写 `direction`（vertical 纵排或 horizontal 横排）及 `children` 数组。双栏使用恰好两个子项，`ratio` 为 25–75%。其他子项数量会纵排；窄窗口也会自动纵排。
- `tabs`：填写 `children`，作为可切换的页面。标签名称由软件内的模块名称生成。

最多 32 个节点；根节点深度为 0，最大深度 5；每个容器 1–8 个子项。编辑器支持嵌套、模块交换和分栏尺寸调整。主题只调整位置与外观，不能用代码替换启动或认证动作。

## 导航与窗口

可选的 `layout` 字段：

| 字段 | 取值 |
| --- | --- |
| `navigation` | left 左侧、right 右侧、top 顶部 |
| `sidebarWidth` | 72–360 的整数，单位 px；低于 220 仅在隐藏导航文字时生效，顶部导航不使用此宽度。 |
| `contentWidth` | wide 或 comfortable |
| `instanceView` | list 或 grid |
| `homeSections` | launch、shortcuts、activity、details 各一次，顺序决定经典首页排列。 |
| `hiddenSections` | 可包含 shortcuts、activity、details，不能隐藏 launch。 |

可选 `chrome`：`windowCorners` 为 system/square，`titlebarColor` 为 theme/accent，`background` 为 forest/none。提供内嵌启动 PNG 时优先使用图片。系统窗口圆角依赖 Windows 支持。布局编辑统一在外观与主题 → 布局中完成。

## 图片、大小与安全边界

最方便的方式是在软件中选择图片并导出，由软件规范化为 PNG 和计算文件名。手工制作时，对 PNG 原始字节计算 SHA-256，以小写摘要命名，再在 appearance 中填写这个文件名。不能使用远程图片地址或本机绝对路径。

压缩包最大 32 MiB，最多 64 个条目，解压后总计 64 MiB，单项最大 20 MiB，theme.json 最大 128,000 字节。引用 PNG 的尺寸须非零，且不超过 1600 万像素。不允许 JavaScript、CSS、HTML、SVG、字体或可执行文件。只分发有权使用的图片，并检查是否含私人信息。导出不包含账号、令牌、实例及本机游戏路径。

## 常见问题与校验

| 问题 | 处理方式 |
| --- | --- |
| 不支持或不安全的文件 | 移除外层目录、系统附加文件、README 及不支持的格式。 |
| 图片缺失或校验不一致 | 重新计算 SHA-256，核对文件名与 JSON 引用。 |
| 布局无效 | 保留唯一启动模块，避免重复 ID/模块，检查节点数和深度。 |
| 更改颜色没有效果 | 非强调色需要 custom 模式；载入并应用编辑草稿。 |
| 侧栏无法进一步缩窄 | 先隐藏导航文字，再调整侧栏宽度。 |
| 应用后难以阅读 | 等待首次应用确认超时或按 Ctrl+Shift+F12。 |

[JSON Schema](../theme.schema.json) 可用于编辑器辅助。运行时 theme-schema.mjs、layout-schema.mjs 与 themes.mjs 还会检查大小、路径、哈希和跨字段约束。通过校验不等于作者可信认证。未来扩展应显式声明能力和版本，保留可恢复性。

## 1.1.1 — composition-v1

1.1.0 主题可直接导入，缺少 `composition` 时使用旧布局默认值。归档 `schema` 仍为 1。启用新布局时将 `composition-v1` 加入 `requiredCapabilities`，并将 `compatibleVersions` 设为 `["1.1.1"]`。旧客户端会拒绝所需能力未知的主题；不要删掉此声明来绕过版本检查。

`appearance.composition` 是可选对象（默认 `null`）：`launchLayout` 为 `classic` 或 `stacked`；`shortcuts` 为 `classic` 或 `compact`；`sidebarExtras`、`eyebrow` 为布尔值。数值范围见下表。

| Field | Range |
|---|---|
| `workspacePadding` | 0–64 px |
| `gap` | 0–64 px |
| `headerHeight` | 64–96 px |
| `navigationSize` | 20–32 px |
| `launchWidth` | 280–760 px |
| `titleSize` | 28–72 px |
| `launchTopSpace` | 0–320 px |
| `buttonHeight` | 44–88 px |
| `dockOpacity` | 0–100 % |

每个布局节点可附带 `style`：`padding` 以及四个 `paddingTop/Right/Bottom/Left`（0–80px）、`gap`（0–64px）、`surfaceOpacity`（0–100%）、`position`（0–100%）、`background`（`none/global/hero/artwork`）、`fit`（`cover/contain`）、`separator`（`none/left/top`）、`viewport`（布尔值）。单边留白覆盖统一留白。背景引用已有的三种已验证图片，不接受路径或 URL。`viewport` 设置最小页面高度，并保持背景层为窗口高度，内容展开仍可滚动。

所有新增选项均为声明式样式，不能注入 CSS 或代码、隐藏启动错误或改变账号规则。窄窗口自动纵排。设置中的分区样式可单独重置；恢复经典、30 秒确认与中断恢复继续生效。

[AMBER Alloy 精细布局示例](../AMBER-Alloy-1.1.1.ambtheme)：可按 ZIP 打开查看配置和哈希命名的 PNG，需要 1.1.1，与兼容旧版的基础示例分别提供。

## 1.2.0 首页模块

格式版本仍为 `schema: 1`，不引入脚本或任意 CSS。使用 `calendar`（日历）、`news`（新闻）、`storage`（存储摘要）、`tools`（快捷工具）时，在 `requiredCapabilities` 声明 `home-modules-v1`，兼容版本声明 `1.2.0`。旧版会安全拒绝不支持的能力；现有主题文件继续可读；首页默认优先适配窗口，内容可在分区内滚动。

可选布尔字段 `appearance.composition.sidebarAbout` 独立控制关于入口；`sidebarExtras` 控制实例快捷区。字段省略时保留旧版联动行为。新 Alloy 显示关于入口，隐藏侧栏实例快捷区。

新闻来源由应用固定，不由主题指定网址。主题不包含游玩记录、截图、新闻缓存、工具收藏或账号信息。[新版 Alloy](../AMBER-Alloy-1.2.0.ambtheme) 保留原背景图片字节。

### 首页高度与滚动

`appearance.homeOverflow` 可选 `sections`（默认）或 `page`。前者在至少 1000 × 640 CSS 像素的窗口中限制首页为一个工作区高度，模块内容独立滚动；较小窗口或放大后可用空间不足时恢复整页滚动。`page` 始终保留整页滚动。旧主题省略该字段时也使用单页优先。

节点 `style.scroll` 可选 `auto`（默认，子模块独立滚动）或 `section`（整个分区一起滚动）。双子节点的纵向分区使用 `ratio` 分配高度。以上均为可选字段，格式仍为 schema 1。主题编辑器的布局页可设置首页滚动方式，高级编辑可设置分区滚动。


## 1.2.1：独立面板与精简日历

`schema: 1` 保持不变，1.1.0 至 1.2.0 的主题可继续导入。分区 `style` 新增可选字段：

| 字段 | 值 | 作用 |
| --- | --- | --- |
| `radius` | 0–24 | 独立面板圆角，单位 px |
| `borderWidth` | 0–3 | 四边边框宽度，颜色沿用主题 `line` |
| `shadow` | `none`、`soft`、`raised` | 有界阴影预设，不接受任意 CSS |

省略时保留旧外观。使用这些字段时声明 `requiredCapabilities` 包含 `section-panels-v1`，并在 `compatibleVersions` 中声明 `1.2.1`，避免旧版本静默丢失面板效果。导出会自动加入能力声明。高级布局中的“分区背景与留白”可编辑这些选项。面板是首页内的独立区域，不是系统悬浮窗口；通过已有分区布局调整排列及比例，内容超出时分区滚动。

游玩日历统一只显示标题、月份与日期网格。点击日期查看记录，右上角更多按钮打开筛选、统计与记录设置。原有主题与 Alloy 自动使用此组件，无需为日历添加主题字段。主题不控制或修改游玩记录。

导出信息中的名称必填，其余字段可留空。保存到主题库不会切换当前外观；同名主题需更名后保存，原始主题不会被覆盖。外观草稿仅保存外观配置，恢复后仍需手动应用。
