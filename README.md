# 教学视频库 · lh-video-lab

> **EN** · A Foundry VTT GM utility for sending short teaching clips and images to players. Organize media into virtual groups (drag-and-drop, no disk changes), upload local files or browse the whole server, then whisper to one player or broadcast to all via the chat log. Chat images open in a lightbox (GM) or a new tab (players). All panel state is stored client-side and survives world/module switches. GM-only install — players need no module. Licensed MIT.

GM 用的教学素材工具。把常用的 10~15 秒基础教学视频（图片也行）收进一个固定文件夹，GM 一键把它私聊发给某位玩家，或发给全体玩家的聊天栏——对方点播放即看，不用自己去翻 Journal。

## 功能（v1.5.0）

- **固定的素材文件夹**（缺省 `Data/教学视频/`，全局目录不绑世界 ID），可点「选择文件夹…」用官方文件夹选择器（`FilePicker type:"folder"`）可视化挑选，不用手输路径。
- **虚拟收藏分组**：左侧列表顶部是「收藏分组」、底部是「全部素材」平铺。把素材**拖进分组块**即可归组（纯 UI 收纳，不动服务器文件，一个素材可同时归入多个组）；可「新建分组」「删除分组」（删组不删素材）「组内移出」。这是你要的「随便拖、放在一起，不管它们本来在服务器哪个位置」。
- **跨世界包持久化**：文件夹路径、引用清单、显示名别名、配色、窗口位置全部存 **client 级**（GM 浏览器 localStorage）——换世界包、升级 mod 都保持不变；升级到 v1.4 时自动把旧 world 设置与 user flag 迁移过来（一次性）。
- **导出 / 导入状态**：面板右上角「导出 / 导入」按钮。导出三件套：存服务器 `Data/vlab-exports/`、浏览器下载 json、复制剪贴板（可多选）；导入：粘贴 JSON 或「从服务器文件加载」（`FilePicker type:"json"` + fetch 读回）。换电脑时导出→拷 json→导入即可完整恢复左栏状态。
- **左右分栏布局**：左侧素材列表（缩略图 + 名字 + 悬浮操作按钮），右侧小预览台——点左选右看。
- **小预览 + 点击放大**：预览台显示 200px 小预览（不挤压下方信息栏与发送栏），图片悬停出「点击放大」徽章，点击弹官方 `ImagePopout` 灯箱大图（窗口可自由拖拽缩放）；视频用原生播放条 + 全屏按钮。
- **图片 + 视频都支持**：面板列出文件夹里的图片和视频；发送时视频用 `<video controls>`、图片用 `<img>` 内联到聊天栏。
- **聊天图片点击放大**：发到聊天栏的图片，GM 端点击弹 `ImagePopout` 灯箱（捕获阶段拦截，避免与 Foundry `game.mjs` 冒泡阶段 `_onClickHyperlink` 双开新标签）；玩家端（免装模块）点击用 `<a target="_blank">` 原生新标签打开原图，浏览器自带缩放。
- **全目录浏览**：「浏览服务器」打开官方 `FilePicker type:"imagevideo"`，从 Data 根开始随便逛所有文件夹，挑中的文件自动加入面板列表（引用清单），随时可发。
- **改名 = 显示名**：FVTT v13 没有文件重命名 API（服务端 `manageFiles` 只有 browseFiles/createDirectory/configurePath 三种动作），所以改名只改面板与聊天里的显示名，不动服务器磁盘文件；真实文件名以灰色小字保留显示。
- **5 套预设配色**：深空蓝（默认）/ 蓝白 / 紫绿 / 鎏金黑 / 薄荷，标题栏色环一键切换，对比度都拉满。
- **窗口记忆**：窗口可拖、可缩放（右下角手柄），关闭时会记住位置 / 大小 / 配色，下次打开原样恢复。
- **UI 动画**：面板入场淡入、列表行逐条浮现、按钮 hover 扫光、缩略图缩放、选中行发光、发送成功闪光、色环旋转（仿 gacha-banner 动画体系）。
- **发送可选**：「全体玩家」或「某位玩家私聊」，点「发送」即发。
- 只装 **GM 一端**：`ChatMessage.create` 的 HTML content 会由 Foundry 原生同步到所有客户端聊天栏，**玩家端无需安装此模块**。

## 安装

1. 把整个 `lh-video-lab/` 文件夹拷到 Foundry 的 `Data/modules/` 目录：
   `Data/modules/lh-video-lab/`
2. 打开 Foundry，在 **设置 → 模块** 里启用「教学视频库」。
3. 刷新页面。

## 使用

- 进入游戏后，画布**左侧工具按钮**会多出一个「🎬 教学视频库」图标（仅 GM 可见）；或从收藏头宏调用 `renderVideoLabApp()`。
- 选文件夹：点「选择文件夹…」可视化挑目录 → 点「应用」。
- 收藏分组：点「新建分组」起名 → 把「全部素材」里的行拖进分组块即归组；组头「🗑」删组、组内行「✕」移出组。
- 导入：点「本地上传」（图片/视频都行）或「浏览服务器」（从 Data 全目录挑，挑中即入列表）。
- 预览：点左侧列表任意素材，右侧小预览台显示；图片点它弹灯箱大图，视频用播放条看。
- 改名：点素材行或预览台下方的 ✎ 图标 → 输入显示名 → 保存。
- 发送：预览台下方「发送给」选「全体玩家」或某个玩家 → 点「发送」→ 确认 → 聊天栏弹出。
- 聊天里点图片：GM 端弹灯箱；玩家端开新标签看原图。
- 备份/迁移：点右上角「导出」（选存服务器/下载/复制）→ 换电脑后点「导入」粘贴或从服务器文件加载。

## v1.5.0 变更记录（虚拟收藏分组 · 修 UI）

- **方向修正**：v1.4 把「文件夹」做成了真实文件系统子文件夹（新建子目录 + 上传选子目录 + 按子目录分组），但你要的是「素材在左边随便拖到一起、不动磁盘」的**虚拟收藏分组**。v1.5 弃用真实子文件夹方向，改为：
  - 左侧 = 「收藏分组」（`groups` client setting 存 `{组名:[路径]}`）+「全部素材」平铺（合并当前文件夹、各子目录、引用清单）。
  - 素材行 `draggable`，拖进分组块即归组；可新建/删除分组、组内移出；纯 UI 不改服务器文件。
  - 本地上传不再弹「选子文件夹」窗，直接传进当前素材文件夹。
- **修 UI**：所有 Dialog 底部按钮的 `icon` 从 `"fa-..."` 字符串改成 `<i class="fa-..."></i>` HTML——修复「fa-solid fa-xmark 关闭」这种 icon 名被当文本渲染的坏字（gacha 用的是 `icon:'<i>'` 才渲染，我们之前误用了 class 字符串）；`footfolder` 路径 `decodeURIComponent` 修复右下角 `%E8%A3…` 乱码；标题 badge / 头部版本同步。

## v1.4.0 变更记录（文件夹功能 + 跨世界持久化）

- **跨世界包保存**：左栏全部状态（文件夹路径/引用清单/显示名别名/主题/窗口位置）从 world 设置与 user flag 迁移到 **client 级设置**（`game.settings` scope:"client"，存 GM 浏览器 localStorage——`client/core/settings.js` 的 `#setClient`/JSONField 坐实 Object/Array 支持）。换世界包、升级 mod 均不变；视频文件本身在 `Data/` 用户目录，升级 mod 只覆盖 `Data/modules/`，天然互不干扰。
- **一次性自动迁移**：升级后 GM 首次进入世界，自动读旧值并写入 client 设置——旧 world 设置经 `game.settings.storage.get("world").getItem("lh-video-lab.键")`（`client/documents/collections/world-settings.mjs:45`），旧 user flag 经 `game.user.getFlag`。已迁移标记存 `migrated_v14`。
- **文件夹分组**：`FilePicker.browse("data", folder)` 的返回含 `dirs` 数组（子文件夹路径，`dist/files/local.mjs` getFiles 坐实），遍历子目录按组显示。
- **新建子文件夹**：`FilePicker.createDirectory("data", target, {})`（v13 服务端 manageFiles 三动作之一）。
- **上传归类**：上传前先列当前文件夹 + 子文件夹弹单选窗，选定后 `FilePicker.upload("data", chosen, file)`。
- **导出/导入**：机制照抄用户世界已验证的 `gacha-banner/scripts/config.js:179-443`——导出=存服务器（`FilePicker.upload("data","vlab-exports",file)`）+ 浏览器下载（Blob + `<a download>`）+ 剪贴板（`navigator.clipboard`）三选；导入=粘贴 JSON 或 `FilePicker type:"json"` + `fetch("/路径")` 读回。
- **输入框外边框**：`border: 2px solid rgba(255,255,255,0.45)`（用户点名要的粗外边框），按钮进一步缩小（5px 10px / 11.5px）。

## v1.3.1 修复记录（聊天点击放大失效 · 根因坐实）

用户反馈「发到侧边栏后有个点击放大，点了没用」——查证链：`ChatMessage.content` 字段是 `HTMLField`（`common/documents/chat-message.mjs:52`，`common/data/fields.mjs:3066` 定义「服务端存档时清洗 HTML」）→ **内联 onclick 在消息创建时就被服务端清洗掉了，属性根本没进数据库**，与 CSP、渲染无关。修复双保险：

- GM 端（装模块）：模块挂 document 级委托 `$(document).on("click", ".vlab-chat-media-link", ...)` → `new ImagePopout({src, window:{title}}).render(true)` 灯箱。
- 玩家端（免装模块）：`<a href="原图路径" target="_blank" rel="noreferrer">` 原生新标签打开原图，浏览器自带缩放——零 JS、零清洗风险，100% 可用。

同时按用户要求把右侧大预览台改成 200px 小预览（不再挤压底部信息栏），点击图片弹灯箱放大；视频保持原生播放条（`image-popout.hbs` 模板里视频是 `autoplay loop muted` 无 controls，不适合做视频灯箱）。

## v1.3 修复记录（血泪教训）

v1.2 用户反馈「暗色主题黑字看不清、窗口没法缩放、不记位置、图片没法放大、要左右布局、没有动画」——全部根因查证自本机 v13.351 源码：

1. **黑字根因**：v1 的 `Dialog(data, options)` 构造器只把**第二个参数**交给 Application；v1.2 把 `classes/width/height/resizable` 误放进了 data 第一参数 → 窗口没有 `.video-lab-app` 类（CSS 变量全失效），且 `client/appv1/api/application-v1.mjs:81` 强制给 v1 应用补 `theme-light` 类，浅色主题黑字压面。本版：选项全部进第二参数，`classes` 自带 `theme-dark` 阻止 theme-light 注入，`data-theme` 直接挂窗口元素（弃用 `:has`）。
2. **窗口缩放/拖动**：v1 Dialog 默认 `popOut:true`（application-v1.mjs:244），`resizable:true` 即出右下角缩放手柄，头部拖动原生支持。
3. **位置记忆**：`top/left/width/height` 选项回放，关闭时把 `app.position` 存 user flag `winState`。
4. **聊天图片放大**：v13 聊天栏无内置 lightbox（全源码搜 `lightbox/chat-image` 0 命中），主页面无 CSP（仅 `.svg` 静态文件有 `default-src 'none'`）——用内联 onclick + `new foundry.applications.apps.ImagePopout({src, window:{title}}).render(true)`（官方示例写法，`image-popout.mjs`）。

## 已验证依据（出处）

- 发送 / 私聊：`ChatMessage.create({ content, whisper:[userId] })`；不设 `whisper` 即全体。
- 导入与浏览：`FilePicker.browse("data", folder)` 列文件、`FilePicker.upload("data", folder, file)` 本地上传、`new FilePicker({type:"imagevideo", current, callback})` 图片+视频挑文件、`new FilePicker({type:"folder", callback})` 挑文件夹。以上 type 枚举均核实自本机 v13.351 客户端源码 `resources/app/client/applications/apps/file-picker.mjs`（`FILE_TYPES = ["any","audio","folder","font","graphics","image","imagevideo","text","video"]`）。
- 改名边界：v13 服务端 `resources/app/dist/files/files.mjs` 的 `manageFiles` socket 处理器仅支持 `browseFiles` / `createDirectory` / `configurePath` 三种 action，**无 rename/delete**——故采用显示名别名方案。
- 媒体类型判定：优先用 v13 官方助手 `foundry.helpers.media.ImageHelper.hasImageExtension` / `VideoHelper.hasVideoExtension`（核实自 `file-picker.mjs`）。
- 图片灯箱：`foundry.applications.apps.ImagePopout`（`client/applications/apps/image-popout.mjs`），`new ImagePopout({src, caption, uuid, showTitle, window:{title}})` + `render(true)`。
- 聊天消息内 `<video>` 渲染：Foundry 聊天栏支持 HTML 富文本 content，`<video>` 可内联显示（`controls` 保证可点播）。
- 若发现聊天消息里视频默认是"点击才播"（部分浏览器限制自动播放），可加挂 [push-play](https://github.com/emptywrapper/push-play) 模块增强点开即播体验。

## 技术栈对齐

- FVTT v13（coreVersion 13.351 / dnd5e 5.3.3，与你世界一致）
- `module.json` 结构参照你已验证的 `gacha-banner`
- UI 样式体系仿 `gacha-banner/styles/gacha-config.css`（深底亮字、发光强调色、Signika、圆角卡片）+ gacha 动画（shine/pulse/滑入）
- 窗口为 `new Dialog(data, options)` v1 金标准（ApplicationV2 曾致模块静默加载失败）
- 代码仅运行于 GM 端，未引入 socketlib（此场景用不到）
