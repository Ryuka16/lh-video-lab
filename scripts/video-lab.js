/* =====================================================================
 *  教学视频库 · lh-video-lab  v1.5.2
 *  GM 端面板：素材文件夹 + 全目录浏览 → 一键私聊 / 群发到聊天栏
 *
 *  v1.5 —— 虚拟收藏分组（用户最终方向，改 v1.4 的错误）：
 *  ① 弃用 v1.4 的「真实子文件夹分组 / 新建文件夹 / 上传选子文件夹」。
 *  ② 左侧列表改为「虚拟收藏分组 + 全部素材平铺」：素材行可拖拽进分组
 *     块归组（groups client setting 存 {组名:[路径]}，纯 UI 不动磁盘），
 *     可新建/删除分组、组内移出；「全部素材」块平铺所有素材供拖拽。
 *  ③ 本地上传直接传进当前素材文件夹（不再弹选子文件夹窗）。
 *  ④ 修复：所有 Dialog 底部按钮 icon 从 "fa-..." 字符串改为 <i> HTML
 *     （根因：字符串被当文本渲染出「fa-solid fa-xmark 关闭」）；
 *     footfolder 路径 decodeURIComponent。
 *  ⑤ 拖拽改「移动」语义（拖走即从原组消失，一个素材只属一个组）；
 *     分组块可折叠收纳（collapsedGroups setting）；删掉 folder 行左端
 *     渲染成空白方块的文件夹图标（folder-icon）。
 *
 *  v1.4 —— 文件夹功能 + 跨世界持久化：
 *  ① 所有左栏状态（文件夹路径/引用清单/显示名别名/主题/窗口位置）
 *     改为 client 级设置（存 GM 浏览器 localStorage），跨世界包、跨
 *     mod 升级都不变；升级后自动迁移旧 world 设置与 user flag
 *     （game.settings.storage.get("world").getItem —— world-settings.mjs:45）。
 *  ② 新建子文件夹（FilePicker.createDirectory 已验）+ 本地上传时选择
 *     目标子文件夹（FilePicker.browse 返回 dirs 数组 —— local.mjs）。
 *  ③ 左侧列表按文件夹分组：当前文件夹 / 各子文件夹 / 引用素材。
 *  ④ 导出/导入状态（照 gacha-banner config.js:179-443 已验证三件套：
 *     FilePicker.upload 存服务器 + Blob 浏览器下载 + 剪贴板；
 *     导入 = 粘贴 JSON 或 FilePicker(json) + fetch 读回）。
 *  ⑤ 路径输入框外边框加粗（2px 亮边）。
 *
 *  v1.3 改版 —— 用户五条反馈全部落地：
 *  ① 修复黑字（根因，源码坐实）：
 *     v1.2 把 classes/width/height/resizable 误放进了 new Dialog(data) 的
 *     data 第一参数 —— v1 的 Dialog(data, options) 构造器只把第二个参数
 *     交给 Application，于是窗口没有 .video-lab-app 类（CSS 变量全失效），
 *     且 application-v1.mjs:81 强制给 v1 应用补 classes: theme-light，
 *     FVTT 浅色主题的黑字直接压在面板上。
 *     本版：所有 Application 选项挪进第二个参数；classes 自带 theme-dark
 *     阻止 theme-light 注入；data-theme 直接挂窗口元素（弃用 :has）。
 *  ② 窗口缩放 + 记忆：v1 Dialog 默认 popOut=true（application-v1.mjs:244），
 *     头部可拖、resizable:true 即出右下角手柄；top/left/width/height 选项
 *     回放位置；close 时把 app.position 存进 user flag winState。
 *  ③ 聊天图片放大：v13 聊天栏无内置 lightbox（全源码 0 命中），主页面
 *     无 CSP（仅 .svg 静态文件有），故用内联 onclick + ImagePopout，
 *     玩家端免装模块、点击即放大（ImagePopout 官方示例 render(true)）。
 *  ④ 左右布局：左素材列表 + 右大预览台；图片滚轮缩放/拖拽平移/双击复位，
 *     视频原生播放条。
 *  ⑤ UI 动画：入场淡入、行 stagger、按钮扫光、缩略图缩放、选中发光、
 *     发送成功闪光、色环 hover 旋转（仿 gacha-banner 动画体系）。
 * ===================================================================== */
(() => {
  const MODULE_ID = "lh-video-lab";
  const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp", "tif", "tiff"];
  const VIDEO_EXTS = ["mp4", "webm", "ogv", "mov", "m4v"];
  const DEFAULT_FOLDER = "教学视频";   // 全局目录（不绑 worldId），跨世界包共享

  // ---------- 工具 ----------
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const getFlag = (k, def) => {
    try { return game.user.getFlag(MODULE_ID, k) ?? def; } catch (e) { return def; }
  };
  const setFlag = (k, v) => {
    try { return game.user.setFlag(MODULE_ID, k, v); } catch (e) { return Promise.resolve(); }
  };
  const getSetting = (k, def) => {
    try { return game.settings.get(MODULE_ID, k) ?? def; } catch (e) { return def; }
  };
  const setSetting = (k, v) => {
    try { return game.settings.set(MODULE_ID, k, v); } catch (e) { return Promise.resolve(); }
  };

  // ---------- 权限：可配置允许列表 ----------
  const getAllowed = () => getSetting("allowedUsers", ["gm"]);
  const canUse = () => {
    if (!game.user) return false;
    if (game.user.isGM) return true;
    const list = getAllowed();
    if (!Array.isArray(list)) return false;
    if (list.includes("all")) return true;
    if (list.includes(game.user.id)) return true;
    if (list.includes(game.user.name)) return true;
    return false;
  };

  // ---------- 路径 / 媒体类型 ----------
  const normPath = (p) => String(p || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const baseName = (p) => {
    try { return decodeURIComponent(normPath(p).split("/").pop() || ""); }
    catch (e) { return normPath(p).split("/").pop() || ""; }
  };
  const extOf = (p) => baseName(p).split(".").pop()?.toLowerCase() || "";

  // 优先用 v13 官方媒体助手（file-picker.mjs 官方用法），失败回落本地表
  const isImage = (p) => {
    try { return foundry.helpers.media.ImageHelper.hasImageExtension(p); }
    catch (e) { return IMAGE_EXTS.includes(extOf(p)); }
  };
  const isVideo = (p) => {
    try { return foundry.helpers.media.VideoHelper.hasVideoExtension(p); }
    catch (e) { return VIDEO_EXTS.includes(extOf(p)); }
  };

  // ---------- 显示名别名（改名不改磁盘文件） ----------
  const getAliases = () => {
    const a = getSetting("aliases", {});
    return (a && typeof a === "object" && !Array.isArray(a)) ? a : {};
  };
  const setAliases = (obj) => setSetting("aliases", obj);
  const displayNameOf = (p) => {
    const a = getAliases()[normPath(p)];
    return a ? String(a) : baseName(p);
  };

  // ---------- 引用清单（浏览服务器挑中的任意路径文件） ----------
  const getPicked = () => {
    const p = getSetting("picked", []);
    return Array.isArray(p) ? p.map(normPath) : [];
  };
  const setPicked = (arr) => setSetting("picked", arr);

  // ---------- 虚拟收藏分组（纯 UI 逻辑分组，不动磁盘文件） ----------
  // 结构：{ 组名: [素材路径数组] }，一个素材可属于多个组，client 级跨世界共享
  const getGroups = () => {
    const g = getSetting("groups", {});
    const out = {};
    if (g && typeof g === "object" && !Array.isArray(g)) {
      for (const [name, arr] of Object.entries(g)) {
        if (Array.isArray(arr)) out[name] = arr.map(normPath);
      }
    }
    return out;
  };
  const setGroups = (obj) => setSetting("groups", obj);

  // ---------- 分组折叠状态：{ 组名: true }（纯 UI 收纳，不删素材） ----------
  const getCollapsed = () => {
    const c = getSetting("collapsedGroups", {});
    return (c && typeof c === "object" && !Array.isArray(c)) ? c : {};
  };
  const setCollapsed = (obj) => setSetting("collapsedGroups", obj);

  // ---------- 主题预设 ----------
  const THEMES = [
    { id: "deep", name: "深空蓝", a: "#00d2ff", b: "#ffd700" },
    { id: "bluewhite", name: "蓝白", a: "#2563eb", b: "#0ea5e9" },
    { id: "purgreen", name: "紫绿", a: "#a78bfa", b: "#34d399" },
    { id: "gold", name: "鎏金黑", a: "#ffd700", b: "#ff9d4d" },
    { id: "mint", name: "薄荷", a: "#34d399", b: "#60a5fa" },
  ];
  const getTheme = () => {
    const t = getSetting("theme", "deep");
    return THEMES.some((x) => x.id === t) ? t : "deep";
  };

  // ---------- 聊天栏 HTML：视频 <video> / 图片点击放大 ----------
  // 注意：ChatMessage.content 是 HTMLField（common/documents/chat-message.mjs:52），
  // 服务端存档时会清洗 HTML，内联 onclick 进不了数据库 → 点击放大不能靠内联事件。
  // 双保险：GM 端模块挂 document 级委托 → 弹官方 ImagePopout 灯箱；
  // 玩家端（免装模块）→ <a href target="_blank"> 原生新标签打开原图（浏览器自带缩放）。
  const buildChatContent = (path, caption) => {
    const src = normPath(path);
    const title = caption || baseName(path);
    const cap = caption
      ? `<div class="vlab-chat-cap"><span class="cap-tag">教学</span>${esc(caption)}</div>`
      : "";
    const media = isImage(path)
      ? `<div class="vlab-chat-media">
           <a class="vlab-chat-media-link" href="${src}" target="_blank" rel="noreferrer"
              data-src="${src}" data-title="${esc(title)}">
             <img src="${src}" style="width:100%;display:block;max-height:420px;object-fit:contain;background:#000;">
           </a>
           <span class="vlab-chat-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i> 点击放大</span>
         </div>`
      : `<video controls playsinline preload="metadata" src="${src}"></video>`;
    return `<div class="vlab-chat-wrap">${media}${cap}</div>`;
  };

  // ---------- 当前打开的窗口实例（模块级单例） ----------
  let videoLabApp = null;
  let permApp = null;

  // ---------- v1 窗口通用选项（v1.2 的教训：必须放第二个参数） ----------
  const winOptions = (extra = {}) => Object.assign({
    classes: ["dialog", "video-lab-app", "theme-dark"], // theme-dark 阻止 v1 强制 theme-light 黑字
    resizable: true,
    minimizable: true,
  }, extra);

  // =====================================================================
  //  状态导出 / 导入（照 gacha-banner config.js:179-443 已验证三件套：
  //  存服务器 FilePicker.upload → 浏览器下载 Blob → 剪贴板；
  //  导入 = 粘贴 JSON 或 FilePicker(json) + fetch 读回）
  // =====================================================================
  const statePayload = () => ({
    module: MODULE_ID,
    type: "vlab-state",
    version: 1,
    exportedAt: new Date().toISOString(),
    videoFolder: getSetting("videoFolder", DEFAULT_FOLDER),
    aliases: getAliases(),
    picked: getPicked(),
    theme: getTheme(),
    winState: getSetting("winState", {}),
  });

  function exportState() {
    if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
    const json = JSON.stringify(statePayload(), null, 2);
    const filename = `vlab-state-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const isElectron = /electron/i.test(navigator.userAgent);
    const textareaId = "vlab-export-textarea";
    const content = `
      <div class="form-group">
        <p style="margin:0 0 0.5rem;font-weight:bold">选择导出方式（可多选）：</p>
        <label style="display:block;margin:0.25rem 0;cursor:pointer"><input type="checkbox" id="vlab-opt-save" checked> 保存到服务器 <b>Data/vlab-exports/</b>（换电脑可从服务器直接导入）</label>
        <label style="display:block;margin:0.25rem 0;cursor:pointer"><input type="checkbox" id="vlab-opt-download" ${isElectron ? "" : "checked"}> 浏览器下载 json 文件${isElectron ? '<span style="color:#f08064;font-size:0.75rem">（桌面客户端可能无法下载，用浏览器打开时可用）</span>' : ""}</label>
        <label style="display:block;margin:0.25rem 0;cursor:pointer"><input type="checkbox" id="vlab-opt-copy" checked> 复制到剪贴板</label>
        <textarea id="${textareaId}" rows="12" spellcheck="false" style="width:100%;font-family:monospace;font-size:0.75rem;box-sizing:border-box;margin-top:0.5rem"></textarea>
      </div>`;
    new Dialog({
      title: "导出面板状态",
      content,
      buttons: {
        export: {
          label: "导出",
          icon: '<i class="fa-solid fa-file-export"></i>',
          callback: async (html) => {
            const root = html[0];
            const wantSave = root.querySelector("#vlab-opt-save")?.checked;
            const wantDownload = root.querySelector("#vlab-opt-download")?.checked;
            const wantCopy = root.querySelector("#vlab-opt-copy")?.checked;
            const results = [];
            if (wantSave) {
              let savedPath = null;
              const file = new File([json], filename, { type: "application/json" });
              try {
                await foundry.applications.apps.FilePicker.upload("data", "vlab-exports", file);
                savedPath = `vlab-exports/${filename}`;
              } catch (err) {
                try {
                  await foundry.applications.apps.FilePicker.upload("data", "", file);
                  savedPath = filename;
                } catch (err2) {
                  console.warn("lh-video-lab | 保存到数据目录失败:", err2);
                }
              }
              results.push(savedPath ? "已保存到 Foundry 数据目录：" + savedPath : "保存到数据目录失败");
            }
            if (wantDownload) {
              try {
                const blob = new Blob([json], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 1500);
                results.push("已触发浏览器下载");
              } catch (err) { console.warn("lh-video-lab | 浏览器下载失败:", err); }
            }
            if (wantCopy) {
              try {
                if (navigator.clipboard) {
                  await navigator.clipboard.writeText(json);
                  results.push("已复制到剪贴板");
                } else throw new Error("no clipboard");
              } catch (err) {
                results.push("复制失败（可手动在文本框全选复制）");
              }
            }
            if (!results.length) results.push("未选择任何导出方式");
            ui.notifications.info(results.join("；"));
          },
        },
        close: { label: "关闭", icon: '<i class="fa-solid fa-xmark"></i>' },
      },
      default: "export",
      render: (html) => {
        html.closest(".window-app").attr("data-theme", getTheme());
        const ta = html[0].querySelector(`#${textareaId}`);
        if (ta) { ta.value = json; ta.focus(); ta.select(); }
      },
    }, winOptions({ width: 580 })).render(true);
  }

  async function parseState(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) {
      ui.notifications.error("导入失败：不是有效的 JSON。");
      return;
    }
    const isVlab = data && (data.module === MODULE_ID || data.type === "vlab-state");
    if (!isVlab) { ui.notifications.error("导入失败：这不是教学视频库的导出文件。"); return; }
    if (typeof data.videoFolder === "string" && data.videoFolder) await setSetting("videoFolder", data.videoFolder);
    if (data.aliases && typeof data.aliases === "object" && !Array.isArray(data.aliases)) await setSetting("aliases", data.aliases);
    if (Array.isArray(data.picked)) await setSetting("picked", data.picked);
    if (typeof data.theme === "string" && data.theme) await setSetting("theme", data.theme);
    if (data.winState && typeof data.winState === "object" && !Array.isArray(data.winState)) await setSetting("winState", data.winState);
    ui.notifications.notify("状态导入成功！重开面板即生效。");
  }

  function importState() {
    if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
    const textareaId = "vlab-import-textarea";
    const content = `
      <div class="form-group">
        <label style="display:block;margin-bottom:0.5rem;font-weight:bold"><i class="fa-solid fa-paste"></i> 粘贴 JSON 内容，或点下方按钮从文件加载</label>
        <button type="button" id="vlab-import-file-btn" style="margin-bottom:0.5rem"><i class="fa-solid fa-folder-open"></i> 从服务器文件加载</button>
        <textarea id="${textareaId}" rows="14" spellcheck="false" style="width:100%;font-family:monospace;font-size:0.75rem;box-sizing:border-box"></textarea>
      </div>`;
    new Dialog({
      title: "导入面板状态",
      content,
      buttons: {
        import: {
          label: "导入",
          icon: '<i class="fa-solid fa-file-import"></i>',
          callback: async (html) => {
            const ta = html[0].querySelector(`#${textareaId}`);
            const text = (ta?.value || "").trim();
            if (!text) return ui.notifications.warn("请先粘贴 JSON 内容或从文件加载。");
            await parseState(text);
          },
        },
        cancel: { label: "取消", icon: '<i class="fa-solid fa-xmark"></i>' },
      },
      default: "import",
      render: (html) => {
        html.closest(".window-app").attr("data-theme", getTheme());
        const btn = html[0].querySelector("#vlab-import-file-btn");
        btn.addEventListener("click", () => {
          const picker = new FilePicker({
            type: "json",
            callback: async (path) => {
              try {
                let url = path;
                if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) url = "/" + url;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                const text = await res.text();
                const ta = html[0].querySelector(`#${textareaId}`);
                if (ta) ta.value = text;
              } catch (err) {
                console.error("lh-video-lab | 读取文件失败:", err);
                ui.notifications.error("读取文件失败，请改用复制粘贴。");
              }
            },
          });
          picker.render(true);
        });
      },
    }, winOptions({ width: 560 })).render(true);
  }

  // ---------- 旧设置迁移（v1.3 → v1.4：world settings + user flag → client settings） ----------
  async function migrateToClient() {
    if (getSetting("migrated_v14", false)) return;
    try {
      // world 设置旧值：game.settings.storage.get("world").getItem（world-settings.mjs:45）
      const ws = game.settings.storage.get("world");
      const read = (key) => {
        try {
          const v = ws.getItem(`${MODULE_ID}.${key}`);
          if (typeof v === "string") { try { return JSON.parse(v); } catch (e) { return v; } }
          return v;
        } catch (e) { return undefined; }
      };
      const aliases = read("aliases");
      if (aliases && typeof aliases === "object" && !Array.isArray(aliases)) await setSetting("aliases", aliases);
      const picked = read("picked");
      if (Array.isArray(picked) && picked.length) await setSetting("picked", picked);
      const folder = read("videoFolder");
      if (typeof folder === "string" && folder) await setSetting("videoFolder", folder);
      // user flag 旧值（v1.3 的 videoFolder/theme/winState 存这）
      const u = game.user;
      if (u) {
        const t = getFlag("theme");
        if (typeof t === "string" && t) await setSetting("theme", t);
        const w = getFlag("winState");
        if (w && typeof w === "object" && !Array.isArray(w)) await setSetting("winState", w);
        const f = getFlag("videoFolder");
        if (typeof f === "string" && f) await setSetting("videoFolder", f);
      }
      console.log("[lh-video-lab] 旧设置已迁移到客户端存储（跨世界包共享）");
    } catch (e) {
      console.warn("[lh-video-lab] 旧设置迁移失败（可忽略）:", e);
    }
    await setSetting("migrated_v14", true);
  }

  // =====================================================================
  //  权限设置面板 —— 检索玩家，打勾授权
  // =====================================================================
  function openPermission() {
    if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
    if (permApp) { try { permApp.close(); } catch (e) {} permApp = null; }
    const players = game.users.contents.slice().sort((a, b) => {
      if (a.isGM !== b.isGM) return a.isGM ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    let draft = (() => {
      const s = getAllowed();
      return Array.isArray(s) ? s.slice() : ["gm"];
    })();
    let query = "";

    const rowsHTML = () => {
      const q = query.trim().toLowerCase();
      const list = players.filter((p) => !q || (p.name || "").toLowerCase().includes(q)
        || (p.character?.name || "").toLowerCase().includes(q));
      const out = list.map((p) => {
        const checked = p.isGM || draft.includes(p.id);
        const ava = p.avatar
          ? `<img class="vlab-perm-ava" src="${p.avatar}" />`
          : `<span class="vlab-perm-ava vlab-perm-ava-ico"><i class="fa-solid fa-user"></i></span>`;
        const disco = p.isGM ? `<span class="vlab-perm-tag gm">GM</span>` : "";
        const role = p.character ? `<span class="vlab-perm-role">${esc(p.character.name)}</span>` : "";
        return `
          <label class="vlab-perm-row" data-uid="${p.id}">
            ${ava}
            <span class="vlab-perm-name"><b>${esc(p.name)}</b>${disco}</span>
            ${role}
            <input type="checkbox" data-uid="${p.id}" ${checked ? "checked" : ""} ${p.isGM ? "disabled" : ""} />
          </label>`;
      }).join("");
      return out || `<div class="vlab-perm-none">没有匹配玩家</div>`;
    };

    const content = `
      <div class="vlab-perm">
        <div class="vlab-perm-sub">
          <div class="vlab-perm-sub-t">勾选允许使用此面板的玩家</div>
          <div class="vlab-perm-sub-d">GM 永久放行。被授权玩家可打开面板、上传与发送。</div>
        </div>
        <div class="vlab-perm-quick">
          <button class="vlab-btn amber" data-quick="gm"><i class="fa-solid fa-crown"></i> 仅 GM（默认）</button>
          <button class="vlab-btn" data-quick="all"><i class="fa-solid fa-users"></i> 全体玩家</button>
          <button class="vlab-btn" data-quick="clear"><i class="fa-solid fa-eraser"></i> 清空</button>
        </div>
        <div class="vlab-perm-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input data-fld="search" placeholder="检索玩家…" type="text" />
        </div>
        <div class="vlab-perm-list">${rowsHTML()}</div>
      </div>`;

    permApp = new Dialog({
      title: "教学视频库 · 授权玩家",
      content,
      render: (html) => {
        html.closest(".window-app").attr("data-theme", getTheme());
        const list = html.find(".vlab-perm-list");
        const apply = () => list.html(rowsHTML());
        html.find("[data-fld=search]").on("input", (ev) => {
          query = ev.currentTarget.value || "";
          apply();
        });
        html.find("[data-quick=gm]").on("click", () => { draft = ["gm"]; apply(); });
        html.find("[data-quick=all]").on("click", () => { draft = ["all"]; apply(); });
        html.find("[data-quick=clear]").on("click", () => { draft = []; apply(); });
        html.on("change", ".vlab-perm-list input[type=checkbox]", (ev) => {
          const uid = ev.currentTarget.dataset.uid;
          if (ev.currentTarget.checked) {
            const n = draft.filter((x) => x !== "all" && x !== "gm" && x !== uid);
            if (!n.includes(uid)) n.push(uid);
            draft = n;
          } else {
            draft = draft.filter((x) => x !== uid);
          }
        });
      },
      buttons: {
        save: {
          icon: '<i class="fa-solid fa-check"></i>',
          label: "保存",
          callback: async () => {
            let final = draft.slice();
            if (final.includes("all")) final = ["all"];
            try {
              await game.settings.set(MODULE_ID, "allowedUsers", final);
              const n = final.includes("all") ? "全体玩家"
                : (final.length ? final.filter((x) => x !== "gm").join(", ") : "仅 GM");
              ui.notifications.notify("已保存授权：" + n);
            } catch (e) {
              console.error("[lh-video-lab] 保存授权失败", e);
              ui.notifications.error("保存失败：" + (e?.message || e));
            }
          },
        },
        cancel: {
          icon: '<i class="fa-solid fa-xmark"></i>',
          label: "取消",
          callback: () => {},
        },
      },
      default: "save",
    }, winOptions({ width: 540, height: 660 }));
    permApp.render(true);
  }

  // =====================================================================
  //  主面板 —— 左右布局素材库
  // =====================================================================
  function openVideoLab() {
    if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
    if (videoLabApp) { try { videoLabApp.close(); } catch (e) {} videoLabApp = null; }

    let recipient = "all";   // "all" 或 userId
    let selected = null;     // 当前选中素材路径
    let dirSetCache = new Set();
    let winEl = null;        // 窗口元素（主题直接挂这里）

    const players = () => game.users.filter((u) => !u.isGM && u.active);
    const getFolder = () => getSetting("videoFolder", DEFAULT_FOLDER);
    const targetLabel = () => recipient === "all"
      ? "全体玩家" : (game.users.get(recipient)?.name || "该玩家");

    // ---------- 完整 HTML ----------
    const content = `
      <div class="vlab-root" data-theme="${getTheme()}">
        <div class="vlab-head">
          <div class="vlab-title"><i class="fa-solid fa-clapperboard"></i> 教学视频库 <span class="vlab-ver">v1.5.2</span></div>
          <div class="vlab-head-actions">
            <span class="vlab-theme-panel" data-widget="themes" title="预设配色"></span>
            <button class="vlab-btn" data-act="export" title="导出状态（跨电脑备份）"><i class="fa-solid fa-file-export"></i> 导出</button>
            <button class="vlab-btn" data-act="import" title="导入状态"><i class="fa-solid fa-file-import"></i> 导入</button>
            <button class="vlab-btn" data-act="perm" title="管理授权玩家"><i class="fa-solid fa-user-gear"></i> 权限</button>
            <button class="vlab-btn" data-act="refresh" title="刷新列表"><i class="fa-solid fa-rotate"></i></button>
          </div>
        </div>

        <div class="vlab-folder-row">
          <input class="vlab-folder-input" data-fld="folder" spellcheck="false" placeholder="相对 Data/ 的路径，如 worlds/你的世界/教学视频" />
          <button class="vlab-btn vlab-folder-btn" data-act="pickdir"><i class="fa-solid fa-folder-open"></i> 选择文件夹…</button>
          <button class="vlab-btn primary vlab-folder-btn" data-act="setdir"><i class="fa-solid fa-check"></i> 应用</button>
        </div>

        <div class="vlab-main">
          <div class="vlab-side">
            <div class="vlab-side-toolbar">
              <button class="vlab-btn primary" data-act="upload"><i class="fa-solid fa-cloud-arrow-up"></i> 本地上传</button>
              <button class="vlab-btn" data-act="browse"><i class="fa-solid fa-server"></i> 浏览服务器</button>
              <button class="vlab-btn amber" data-act="addgroup" title="新建收藏分组"><i class="fa-solid fa-folder-plus"></i> 新建分组</button>
            </div>
            <div class="vlab-side-hint">素材无论在哪，拖进分组即可归类（纯 UI 收纳，不动服务器文件）</div>
            <div class="vlab-list" data-widget="list">
              <div class="vlab-loading"><i class="fa-solid fa-spinner fa-spin"></i>读取素材列表…</div>
            </div>
          </div>

          <div class="vlab-stage-wrap">
            <div class="vlab-stage" data-widget="stage">
              <div class="vlab-stage-empty">
                <i class="fa-solid fa-hand-pointer"></i>
                <div>点击左侧素材开始预览</div>
              </div>
            </div>
            <div class="vlab-stage-bar" data-widget="stagebar">
              <div class="vlab-stage-info">
                <div class="vlab-stage-name" data-widget="stagename">—</div>
                <div class="vlab-stage-real" data-widget="stagereal"></div>
              </div>
              <div class="vlab-stage-tools">
                <button class="vlab-btn icon-btn" data-act="rename" title="改名（显示名）"><i class="fa-solid fa-pen"></i></button>
                <button class="vlab-btn icon-btn warn" data-act="unlink" data-widget="unlinkbtn" title="从列表移除（不删文件）" style="display:none"><i class="fa-solid fa-link-slash"></i></button>
              </div>
            </div>
            <div class="vlab-sendbar" data-widget="sendbar">
              <div class="vlab-recip" data-widget="recip"></div>
              <button class="vlab-btn primary vlab-send-btn" data-act="send">
                <i class="fa-solid fa-paper-plane"></i><span class="send-target" data-widget="sendlabel">发送给全体玩家</span>
              </button>
            </div>
          </div>
        </div>

        <div class="vlab-foot">
          <span><i class="fa-solid fa-film"></i> 共 <b data-widget="count">0</b> 个素材</span>
          <span class="vlab-foot-folder" data-widget="footfolder"></span>
        </div>
      </div>`;

    // ---------- 主题 ----------
    const themeDotsHTML = (cur) => THEMES.map((t) => `
      <button class="vlab-theme-dot${t.id === cur ? " active" : ""}" data-theme="${t.id}"
        title="${t.name}" style="--ta:${t.a};--tb:${t.b}"></button>`).join("");

    const applyTheme = (html, t) => {
      if (winEl) winEl.attr("data-theme", t);
      html.find(".vlab-root").attr("data-theme", t);
      html.find("[data-widget=themes]").html(themeDotsHTML(t));
    };

    // ---------- 接收人 chips ----------
    const renderRecip = (html) => {
      const chips = [];
      chips.push(`<div class="vlab-chip${recipient === "all" ? " ga active" : ""}" data-value="all"><i class="fa-solid fa-users"></i> 全体玩家</div>`);
      for (const p of players()) {
        const on = recipient === p.id;
        const ava = p.avatar
          ? `<img style="width:16px;height:16px;border-radius:50%;object-fit:cover" src="${p.avatar}" />`
          : "";
        chips.push(
          `<div class="vlab-chip${on ? " active" : ""}" data-value="${p.id}">
              ${ava || `<i class="fa-solid fa-user"></i>`} ${esc(p.name)}
              ${on ? "<span>●</span>" : ""}
           </div>`
        );
      }
      html.find("[data-widget=recip]").html(
        chips.length ? chips.join("") : `<div class="vlab-recip-empty">暂无在线玩家</div>`
      );
    };
    const updateSendLabel = (html) => {
      html.find("[data-widget=sendlabel]").text("发送给" + targetLabel());
    };

    // ---------- 素材行 ----------
    const rowHTML = (f, dirSet, i, groupName) => {
      const src = normPath(f);
      const real = baseName(f);
      const disp = displayNameOf(f);
      const aliased = disp !== real;
      const img = isImage(f);
      const isPicked = !dirSet.has(src) && getPicked().includes(src);
      const media = img
        ? `<img loading="lazy" src="${src}" alt="">`
        : `<video preload="metadata" muted src="${src}"></video>`;
      const badge = img
        ? `<span class="vlab-kind img">图片</span>`
        : `<span class="vlab-kind vid">视频</span>`;
      return `
        <div class="vlab-row${selected === src ? " sel" : ""}" data-path="${esc(src)}" title="${esc(real)}" style="--i:${i}" draggable="true">
          <div class="vlab-row-thumb">
            ${media}
            ${img ? "" : `<span class="vlab-row-play"><i class="fa-solid fa-play"></i></span>`}
            ${badge}
          </div>
          <div class="vlab-row-info">
            <div class="vlab-row-name">${esc(disp)}</div>
            ${aliased ? `<div class="vlab-row-real">${esc(real)}</div>` : ""}
          </div>
          <div class="vlab-row-tools">
            <button class="vlab-btn icon-btn" data-act="send" title="发送"><i class="fa-solid fa-paper-plane"></i></button>
            <button class="vlab-btn icon-btn" data-act="rename" title="改名（显示名）"><i class="fa-solid fa-pen"></i></button>
            ${groupName ? `<button class="vlab-btn icon-btn warn" data-act="rmgroup" data-group="${esc(groupName)}" title="移出此分组"><i class="fa-solid fa-xmark"></i></button>` : ""}
            ${isPicked ? `<button class="vlab-btn icon-btn warn" data-act="unlink" title="从列表移除（不删文件）"><i class="fa-solid fa-link-slash"></i></button>` : ""}
          </div>
        </div>`;
    };

    // ---------- 读取素材（分组：当前文件夹 / 各子文件夹 / 引用素材） ----------
    const allMedia = async () => {
      const folder = normPath(getFolder());
      let errMsg = "";
      const out = { rootMedia: [], groups: [], extra: [], folder, dirCount: 0, dirSample: [], dirDirs: [] };
      const isMedia = (f) => isImage(f) || isVideo(f);
      try {
        // browse 返回 { target, dirs:[子文件夹路径], files:[文件路径], ... }（local.mjs getFiles）
        const res = await FilePicker.browse("data", folder);
        const files = (res?.files || []).map((f) => normPath(String(f)));
        out.dirCount = files.length;
        out.dirSample = files.slice(0, 5);
        out.rootMedia = files.filter(isMedia);
        const dirs = (res?.dirs || []).map((d) => normPath(String(d)));
        for (const d of dirs) {
          try {
            const sub = await FilePicker.browse("data", d);
            const subMedia = (sub?.files || []).map((f) => normPath(String(f))).filter(isMedia);
            if (subMedia.length) {
              let nm = d.split("/").pop() || d;
              try { nm = decodeURIComponent(nm); } catch (e) {}
              out.groups.push({ name: nm, path: d, files: subMedia });
            }
          } catch (e) {
            console.debug("[lh-video-lab] 子文件夹读取跳过", d, e?.message || e);
          }
        }
        out.groups.sort((a, b) => a.name.localeCompare(b.name, "zh"));
      } catch (e) {
        errMsg = String(e?.message || e);
        console.warn("[lh-video-lab] 读取失败", e);
      }
      // 引用清单（浏览服务器挑中、且不在上面已展示列表里的路径）
      const shown = new Set(out.rootMedia.concat(out.groups.flatMap((g) => g.files)));
      out.extra = getPicked().filter((p) => !shown.has(p) && isMedia(p));
      out.all = out.rootMedia.concat(out.groups.flatMap((g) => g.files), out.extra);
      out.errMsg = errMsg;
      return out;
    };

    // ---------- 右侧预览台（小预览，点击图片放大） ----------
    const refreshStage = (html) => {
      const stage = html.find("[data-widget=stage]");
      const name = selected ? displayNameOf(selected) : "";
      const real = selected ? baseName(selected) : "";
      html.find("[data-widget=stagename]").text(name || "—");
      html.find("[data-widget=stagereal]").text((selected && name !== real) ? `原名：${real}` : "");
      const isPicked = selected ? !dirSetCache.has(selected) && getPicked().includes(selected) : false;
      html.find("[data-widget=unlinkbtn]").toggle(!!(selected && isPicked));
      if (!selected) {
        stage.html(`<div class="vlab-stage-empty"><i class="fa-solid fa-hand-pointer"></i><div>点击左侧素材开始预览</div></div>`);
        return;
      }
      const src = normPath(selected);
      if (isImage(selected)) {
        stage.html(`<img class="vlab-stage-img" src="${src}" alt="" draggable="false">
          <div class="vlab-stage-hint"><i class="fa-solid fa-magnifying-glass-plus"></i> 点击放大</div>`);
      } else {
        stage.html(`<video class="vlab-stage-vid" controls playsinline preload="metadata" src="${src}"></video>`);
      }
    };

    // ---------- 左侧列表加载（虚拟收藏分组 + 全部素材平铺） ----------
    const loadList = async (html) => {
      const listEl = html.find("[data-widget=list]");
      listEl.html(`<div class="vlab-loading"><i class="fa-solid fa-spinner fa-spin"></i>读取素材列表…</div>`);
      const m = await allMedia();
      dirSetCache = new Set(m.rootMedia.concat(m.groups.flatMap((g) => g.files)));
      let footFolder = m.folder || "（未设置文件夹）";
      try { footFolder = decodeURIComponent(footFolder); } catch (e) {}
      html.find("[data-widget=footfolder]").text(footFolder);

      if (!m.all.length) {
        let hint;
        if (m.errMsg) {
          hint = `<div class="vlab-diag"><b>读取出错：</b>${esc(m.errMsg)}</div>
                  <div class="vlab-diag"><b>目标路径：</b>${esc(m.folder)}</div>
                  <div class="vlab-diag">可能原因：文件夹不存在，或没有权限访问。点「本地上传」会自动创建文件夹。</div>`;
        } else if (m.dirCount > 0) {
          const sample = m.dirSample.map((f) => f.split("/").pop()).join("、");
          hint = `<div class="vlab-diag">该文件夹里有 <b>${m.dirCount}</b> 个文件，但都不是图片/视频。</div>
                  <div class="vlab-diag">前几个文件名：${esc(sample)}</div>`;
        } else {
          hint = `<div class="vlab-diag">文件夹是空的或不存在：</div>
                  <div class="vlab-diag"><b>${esc(m.folder)}</b></div>
                  <div class="vlab-diag">请确认图片/视频放在这个目录下（相对 Data/ 根）。</div>`;
        }
        listEl.html(`<div class="vlab-empty">
          <div class="vlab-empty-icon"><i class="fa-solid fa-clapperboard"></i></div>
          没有可显示的素材
          ${hint}
          <div class="vlab-empty-hint">点「本地上传」传进来（自动建文件夹），或点「浏览服务器」从 Data 全目录挑</div>
        </div>`);
        html.find("[data-widget=count]").text("0");
        selected = null;
        refreshStage(html);
        return;
      }

      const pool = m.all.slice()
        .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b), "zh"));
      let i = 0;
      const parts = [];
      const groupHead = (title, icon, count, extra) => `
        <div class="vlab-group-head"><i class="fa-solid ${icon}"></i>
          <span class="vlab-group-title">${esc(title)}</span>
          <span class="vlab-group-count">${count}</span>
          ${extra || ""}
        </div>`;

      // 虚拟收藏分组（素材无论在哪，拖进来归组，纯 UI 不动磁盘；可折叠收纳）
      const groups = getGroups();
      const collapsed = getCollapsed();
      for (const [gname, paths] of Object.entries(groups)) {
        const gFiles = (paths || []).filter((p) => pool.includes(p)).slice()
          .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b), "zh"));
        const isFolded = !!collapsed[gname];
        const rows = gFiles.map((f) => rowHTML(f, dirSetCache, i++, gname)).join("");
        const headExtra = `
          <button class="vlab-btn icon-btn vlab-foldbtn" data-act="foldgroup" data-group="${esc(gname)}" title="${isFolded ? "展开" : "收起"}">
            <i class="fa-solid ${isFolded ? "fa-chevron-down" : "fa-chevron-up"}"></i>
          </button>
          <button class="vlab-btn icon-btn vlab-delgroup" data-act="delgroup" data-group="${esc(gname)}" title="删除分组（不移除素材）"><i class="fa-solid fa-trash-can"></i></button>`;
        parts.push(`<div class="vlab-vgroup${isFolded ? " folded" : ""}" data-group="${esc(gname)}">
          ${groupHead(gname, "fa-layer-group", gFiles.length, headExtra)}
          <div class="vlab-vgroup-body" data-group="${esc(gname)}">
            ${rows || `<div class="vlab-vgroup-empty">拖素材到这里归组</div>`}
          </div>
        </div>`);
      }

      // 全部素材（平铺，可拖进上方任意分组）
      const poolRows = pool.map((f) => rowHTML(f, dirSetCache, i++)).join("");
      parts.push(`<div class="vlab-vgroup vlab-pool">
        ${groupHead("全部素材", "fa-images", pool.length)}
        <div class="vlab-vgroup-body">${poolRows}</div>
      </div>`);

      listEl.html(parts.join(""));
      html.find("[data-widget=count]").text(String(pool.length));
      selectRow(html, (selected && pool.includes(selected)) ? selected : (pool[0] || null));
    };

    const selectRow = (html, path) => {
      selected = path;
      html.find("[data-widget=list] .vlab-row").each((_, el) => {
        $(el).toggleClass("sel", $(el).attr("data-path") === path);
      });
      refreshStage(html);
    };

    // ---------- 发送 ----------
    const sendPath = async (html, path, rowEl) => {
      if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
      if (!path) return;
      const name = displayNameOf(path);
      const target = targetLabel();
      const whisper = recipient === "all" ? [] : [recipient];

      let ok = false;
      try {
        ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: "发送教学素材" },
          content: `<p>把 <b>${esc(name)}</b> 发送给 <b>${esc(target)}</b>？</p>
                    <p style="font-size:12px;color:#999">将在聊天栏弹出，点播放即可观看。</p>`,
          confirm: { label: "发送" },
          reject: { label: "取消" },
        });
      } catch (e) {
        ok = await new Promise((res) => {
          new Dialog({
            title: "发送教学素材",
            content: `<p>发送 <b>${esc(name)}</b> 给 <b>${esc(target)}</b>？</p>`,
            buttons: {
              yes: { label: "发送", callback: () => res(true) },
              no: { label: "取消", callback: () => res(false) },
            },
            default: "no",
            close: () => res(false),
          }, winOptions({ width: 420 })).render(true);
        });
      }
      if (!ok) return;

      try {
        await ChatMessage.create({
          speaker: { alias: game.user.name },
          content: buildChatContent(path, name),
          ...(whisper.length ? { whisper } : {}),
        });
        ui.notifications.notify("已发送给 " + target);
        if (rowEl?.length) {
          rowEl.addClass("sent");
          setTimeout(() => rowEl.removeClass("sent"), 1700);
        }
      } catch (e) {
        console.error("[lh-video-lab] 发送失败", e);
        ui.notifications.error("发送失败：" + (e?.message || e));
      }
    };

    const pathFromEvent = (ev) => {
      const row = $(ev.currentTarget).closest(".vlab-row");
      return row.length ? normPath(row.attr("data-path")) : selected;
    };

    // ---------- 改名 = 显示名别名 ----------
    const renameCard = (html, ev) => {
      const path = pathFromEvent(ev);
      if (!path) return;
      const cur = getAliases()[path] || baseName(path);
      const dlg = new Dialog({
        title: "改名（显示名）",
        content: `<form class="vlab-rename-form" autocomplete="off">
          <p class="vlab-rename-hint">只改面板与聊天里的显示名，服务器上的文件不会动。</p>
          <input type="text" class="vlab-rename-input" value="${esc(cur)}" />
        </form>`,
        buttons: {
          save: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: "保存",
            callback: async () => {
              const v = dlg.element.find(".vlab-rename-input").val()?.trim() || "";
              const aliases = getAliases();
              if (!v) delete aliases[path]; else aliases[path] = v;
              try {
                await setAliases(aliases);
                ui.notifications.notify("已更新显示名");
                await loadList(html);
              } catch (e) {
                console.error("[lh-video-lab] 改名失败", e);
                ui.notifications.error("改名失败：" + (e?.message || e));
              }
            },
          },
          cancel: { icon: '<i class="fa-solid fa-xmark"></i>', label: "取消", callback: () => {} },
        },
        default: "save",
        render: (h) => {
          h.closest(".window-app").attr("data-theme", getTheme());
          h.find(".vlab-rename-input").select();
        },
      }, winOptions({ width: 420 }));
      dlg.render(true);
    };

    // ---------- 从引用清单移除（不删文件） ----------
    const unlinkCard = async (html, ev) => {
      const path = pathFromEvent(ev);
      if (!path) return;
      try {
        await setPicked(getPicked().filter((p) => p !== path));
        ui.notifications.notify("已从列表移除（服务器文件未删除）");
        await loadList(html);
      } catch (e) {
        console.error("[lh-video-lab] 移除失败", e);
        ui.notifications.error("移除失败：" + (e?.message || e));
      }
    };

    // ---------- 虚拟收藏分组：新建 / 删除 / 拖入 / 移出（纯 UI 不动磁盘） ----------
    const addGroupCard = (html) => {
      const dlg = new Dialog({
        title: "新建收藏分组",
        content: `<form class="vlab-rename-form" autocomplete="off">
          <p class="vlab-rename-hint">起个分组名，素材拖进来即可归组（纯 UI 收纳，不动服务器文件）。</p>
          <input type="text" class="vlab-rename-input" placeholder="例如：萌新必看" />
        </form>`,
        buttons: {
          ok: {
            icon: '<i class="fa-solid fa-folder-plus"></i>',
            label: "创建",
            callback: () => {
              const v = (dlg.element.find(".vlab-rename-input").val() || "").trim();
              if (!v) throw new Error("请输入分组名");
              const groups = getGroups();
              if (v in groups) throw new Error("分组名已存在");
              groups[v] = [];
              setGroups(groups).then(() => loadList(html));
            },
          },
          cancel: { icon: '<i class="fa-solid fa-xmark"></i>', label: "取消", callback: () => {} },
        },
        default: "ok",
        render: (h) => {
          h.closest(".window-app").attr("data-theme", getTheme());
          h.find(".vlab-rename-input").focus();
        },
      }, winOptions({ width: 440 }));
      dlg.render(true);
    };

    const delGroup = async (html, groupName) => {
      const groups = getGroups();
      delete groups[groupName];
      await setGroups(groups);
      ui.notifications.notify("已删除分组「" + groupName + "」（素材未删除）");
      await loadList(html);
    };

    const addToGroup = async (html, groupName, path) => {
      const groups = getGroups();
      // 移动语义：先从所有组里移除该素材（拖走即消失），再归入目标组
      for (const g of Object.keys(groups)) {
        groups[g] = (groups[g] || []).filter((p) => p !== path);
        if (!groups[g].length) delete groups[g];
      }
      const list = Array.isArray(groups[groupName]) ? groups[groupName] : [];
      if (!list.includes(path)) list.push(path);
      groups[groupName] = list;
      await setGroups(groups);
      ui.notifications.notify("已移动到「" + groupName + "」");
      await loadList(html);
      selectRow(html, path);
    };

    const removeFromGroup = async (html, groupName, path) => {
      const groups = getGroups();
      groups[groupName] = (Array.isArray(groups[groupName]) ? groups[groupName] : []).filter((p) => p !== path);
      if (!groups[groupName].length) delete groups[groupName];
      await setGroups(groups);
      await loadList(html);
      selectRow(html, path);
    };

    // ---------- 本地上传（直接传进当前素材文件夹，归组靠拖拽） ----------
    const uploadLocal = (html) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*,image/*";
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        const folder = normPath(getFolder());

        html.find(".vlab-side-toolbar").prepend(`<button class="vlab-btn" disabled><i class="fa-solid fa-spinner fa-spin"></i> 上传中…</button>`);
        try {
          try {
            await FilePicker.createDirectory("data", folder, {});
          } catch (e) {
            console.debug("[lh-video-lab] createDirectory（可能已存在）:", e?.message || e);
          }
          for (const f of files) {
            await FilePicker.upload("data", folder, f, { notify: false });
          }
          ui.notifications.info("上传完成，共 " + files.length + " 个文件 → " + folder);
          await loadList(html);
        } catch (e) {
          console.error("[lh-video-lab] 上传失败", e);
          ui.notifications.error("上传失败：" + (e?.message || e));
        } finally {
          html.find(".vlab-side-toolbar .vlab-btn[disabled]").first().remove();
        }
      };
      input.click();
    };

    // ---------- 窗口状态记忆（client 级，跨世界包共享） ----------
    const winState = (() => {
      const s = getSetting("winState", {});
      return (s && typeof s === "object" && !Array.isArray(s)) ? s : {};
    })();

    const dlgData = {
      title: "教学视频库",
      content,
      render: (html) => {
        winEl = html.closest(".window-app");
        winEl.attr("data-theme", getTheme());
        html.find("[data-fld=folder]").val(getFolder());
        renderRecip(html);
        html.find("[data-widget=themes]").html(themeDotsHTML(getTheme()));
        updateSendLabel(html);
        loadList(html);

        // 头部
        html.on("click", "[data-act=perm]", () => openPermission());
        html.on("click", "[data-act=export]", () => exportState());
        html.on("click", "[data-act=import]", () => importState());
        html.on("click", "[data-act=refresh]", () => loadList(html));

        // 主题切换（挂窗口元素 + 根节点，双保险）
        html.on("click", "[data-widget=themes] .vlab-theme-dot", async (ev) => {
          const id = ev.currentTarget.dataset.theme;
          await setSetting("theme", id);
          applyTheme(html, id);
        });

        // 文件夹：选择 + 应用
        html.on("click", "[data-act=pickdir]", () => {
          if (!canUse()) return;
          const fp = new FilePicker({
            type: "folder",                       // 官方文件夹选择模式（SelectFolder）
            current: getFolder(),
            callback: (dirPath) => {
              const d = normPath(dirPath).replace(/\/+$/, "");
              if (d) html.find("[data-fld=folder]").val(d);
            },
          });
          fp.browse();
        });
        html.on("click", "[data-act=setdir]", async () => {
          const v = normPath(html.find("[data-fld=folder]").val()?.trim());
          if (!v) return;
          await setSetting("videoFolder", v);
          ui.notifications.notify("已更新素材文件夹为 " + v);
          await loadList(html);
        });

        // 虚拟收藏分组：新建分组
        html.on("click", "[data-act=addgroup]", () => addGroupCard(html));

        // 本地上传
        html.on("click", "[data-act=upload]", () => uploadLocal(html));

        // 浏览服务器：imagevideo 全目录
        html.on("click", "[data-act=browse]", () => {
          if (!canUse()) return;
          const fp = new FilePicker({
            type: "imagevideo",                   // 图片+视频扩展名合并过滤（官方 FILE_TYPES）
            current: "",                          // 从 Data 根开始，全目录随便逛
            callback: async (path) => {
              if (!path) return;
              const p = normPath(path);
              if (!isImage(p) && !isVideo(p)) { ui.notifications.warn("请选择图片或视频文件"); return; }
              const picked = getPicked();
              if (!picked.includes(p)) {
                picked.push(p);
                await setPicked(picked);
              }
              await loadList(html);
              selectRow(html, p);
              const row = html.find(".vlab-row").filter((_, el) => $(el).attr("data-path") === p).first();
              if (row.length) {
                row.addClass("sent");
                setTimeout(() => row.removeClass("sent"), 1700);
              }
            },
          });
          fp.browse();
        });

        // 接收人
        html.on("click", "[data-widget=recip] .vlab-chip", (ev) => {
          recipient = ev.currentTarget.dataset.value ?? "all";
          renderRecip(html);
          updateSendLabel(html);
        });

        // 列表：选中行 / 行内按钮
        html.on("click", "[data-widget=list] .vlab-row", (ev) => {
          if ($(ev.target).closest("button").length) return;
          selectRow(html, normPath($(ev.currentTarget).attr("data-path")));
        });
        html.on("click", "[data-widget=list] .vlab-btn[data-act=send]", (ev) => {
          sendPath(html, pathFromEvent(ev), $(ev.currentTarget).closest(".vlab-row"));
        });
        html.on("click", "[data-widget=list] .vlab-btn[data-act=rename]", (ev) => renameCard(html, ev));
        html.on("click", "[data-widget=list] .vlab-btn[data-act=unlink]", (ev) => unlinkCard(html, ev));

        // 虚拟分组：折叠/展开 / 删除分组 / 移出组
        html.on("click", "[data-widget=list] .vlab-btn[data-act=foldgroup]", (ev) => {
          const g = ev.currentTarget.dataset.group;
          const c = getCollapsed();
          if (c[g]) delete c[g]; else c[g] = true;
          setCollapsed(c).then(() => loadList(html));
        });
        html.on("click", "[data-widget=list] .vlab-btn[data-act=delgroup]", (ev) => {
          delGroup(html, ev.currentTarget.dataset.group);
        });
        html.on("click", "[data-widget=list] .vlab-btn[data-act=rmgroup]", (ev) => {
          removeFromGroup(html, ev.currentTarget.dataset.group, pathFromEvent(ev));
        });

        // 拖拽归组（素材行 → 分组块，纯 UI 不改磁盘）
        let dragPath = null;
        html.on("dragstart", "[data-widget=list] .vlab-row", (ev) => {
          dragPath = $(ev.currentTarget).attr("data-path");
          ev.originalEvent.dataTransfer.effectAllowed = "move";
          try { ev.originalEvent.dataTransfer.setData("text/plain", dragPath || ""); } catch (e) {}
        });
        html.on("dragover", "[data-widget=list] .vlab-vgroup-body", (ev) => {
          const body = $(ev.currentTarget);
          if (body.closest(".vlab-pool").length) return;
          ev.preventDefault();
          ev.originalEvent.dataTransfer.dropEffect = "move";
          body.addClass("drag-over");
        });
        html.on("dragleave", "[data-widget=list] .vlab-vgroup-body", (ev) => {
          $(ev.currentTarget).removeClass("drag-over");
        });
        html.on("drop", "[data-widget=list] .vlab-vgroup-body", (ev) => {
          ev.preventDefault();
          const body = $(ev.currentTarget);
          body.removeClass("drag-over");
          if (body.closest(".vlab-pool").length) return;
          const group = body.attr("data-group");
          if (!dragPath || !group) return;
          addToGroup(html, group, dragPath);
        });

        // 预览台：发送 / 改名 / 移除
        html.on("click", "[data-widget=sendbar] .vlab-btn[data-act=send]", (ev) => {
          sendPath(html, selected, html.find(".vlab-row").filter((_, el) => $(el).attr("data-path") === selected).first());
        });
        html.on("click", "[data-widget=stagebar] .vlab-btn[data-act=rename]", (ev) => renameCard(html, ev));
        html.on("click", "[data-widget=stagebar] .vlab-btn[data-act=unlink]", (ev) => unlinkCard(html, ev));

        // 预览台：点击图片 → 官方灯箱放大（视频用自带播放条/全屏）
        html.on("click", "[data-widget=stage] .vlab-stage-img", () => {
          if (!selected) return;
          try {
            new foundry.applications.apps.ImagePopout({
              src: normPath(selected),
              window: { title: displayNameOf(selected) },
            }).render(true);
          } catch (e) {
            console.warn("[lh-video-lab] 灯箱打开失败，回退新标签", e);
            window.open(normPath(selected), "_blank");
          }
        });
      },
      buttons: {
        close: { icon: '<i class="fa-solid fa-xmark"></i>', label: "关闭", callback: () => {} },
      },
      default: "close",
      close: () => {
        // 关闭时记住位置 / 大小 / 配色（client 级，跨世界包共享）
        try {
          const pos = videoLabApp?.position;
          if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
            setSetting("winState", {
              top: pos.top, left: pos.left,
              width: pos.width, height: pos.height,
            });
          }
          setSetting("theme", getTheme());
        } catch (e) { /* 忽略 */ }
      },
    };

    // ---------- 窗口选项（第二个参数！） ----------
    const opts = winOptions({
      width: winState.width || 1060,
      height: winState.height || 640,
    });
    if (typeof winState.left === "number" && typeof winState.top === "number") {
      opts.left = winState.left;
      opts.top = winState.top;
    }

    videoLabApp = new Dialog(dlgData, opts);
    videoLabApp.render(true);
  }

  // =====================================================================
  //  模块入口
  // =====================================================================
  const registerSettings = () => {
    try {
      // 跨世界包共享的状态一律 client 级（存 GM 浏览器 localStorage，升级 mod 也不丢）
      game.settings.register(MODULE_ID, "videoFolder", {
        name: "教学视频文件夹",
        hint: "存放教学短视频的目录（相对 Data/，如 教学视频）。存 GM 浏览器，跨世界包共享。",
        scope: "client",
        config: false,
        type: String,
        default: DEFAULT_FOLDER,
        restricted: true,
      });
      game.settings.register(MODULE_ID, "allowedUsers", {
        name: "允许使用此模块的用户",
        hint: "在「教学视频库」面板里点右上角「权限」检索玩家并打勾授权。GM 永久放行。",
        scope: "world",
        config: false,
        type: Array,
        default: ["gm"],
        restricted: true,
      });
      // 显示名别名：路径 → 显示名（v13 无文件重命名 API，改名只改显示名）
      game.settings.register(MODULE_ID, "aliases", {
        name: "显示名别名",
        hint: "素材路径到显示名的映射（面板内「改名」写入，不动磁盘文件）。client 级，跨世界共享。",
        scope: "client",
        config: false,
        type: Object,
        default: {},
        restricted: true,
      });
      // 引用清单：浏览服务器挑中的任意路径（不限于素材文件夹）
      game.settings.register(MODULE_ID, "picked", {
        name: "引用清单",
        hint: "从服务器全目录挑中的图片/视频路径（面板内「浏览服务器」写入）。client 级，跨世界共享。",
        scope: "client",
        config: false,
        type: Array,
        default: [],
        restricted: true,
      });
      // 虚拟收藏分组：{ 组名: [素材路径] }（纯 UI 拖拽收纳，不动磁盘）
      game.settings.register(MODULE_ID, "groups", {
        name: "收藏分组",
        hint: "素材拖拽归组（{组名:[路径]}）。面板内「新建分组/拖入/移出」写入。client 级，跨世界共享。",
        scope: "client",
        config: false,
        type: Object,
        default: {},
        restricted: true,
      });
      // 分组折叠状态：{ 组名: true }（收纳列表）
      game.settings.register(MODULE_ID, "collapsedGroups", {
        name: "分组折叠状态",
        hint: "哪些分组被折叠收起（{组名:true}）。面板内点分组头「收起/展开」写入。client 级。",
        scope: "client",
        config: false,
        type: Object,
        default: {},
        restricted: true,
      });
      // 主题 / 窗口位置（client 级）
      game.settings.register(MODULE_ID, "theme", {
        name: "面板配色",
        hint: "面板预设配色。",
        scope: "client",
        config: false,
        type: String,
        default: "deep",
        restricted: true,
      });
      game.settings.register(MODULE_ID, "winState", {
        name: "窗口位置与大小",
        hint: "关闭面板时记住的位置/大小。",
        scope: "client",
        config: false,
        type: Object,
        default: {},
        restricted: true,
      });
      game.settings.register(MODULE_ID, "migrated_v14", {
        name: "v1.4 迁移标记",
        hint: "旧 world 设置/flag 已迁移到 client 的标记。",
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
        restricted: true,
      });
    } catch (e) { console.warn("[lh-video-lab] settings 注册跳过：", e?.message); }
  };

  Hooks.once("init", () => {
    registerSettings();
    console.log("[lh-video-lab] init 完成，模块已加载。");
  });

  Hooks.once("ready", () => {
    if (!canUse()) return;

    // 旧设置迁移（world settings / user flag → client settings，一次性）
    if (game.user?.isGM) migrateToClient();

    // ---- 聊天图片点击放大（GM 端 · 捕获阶段拦截） ----
    // 铁证：game.mjs:2018 Foundry 在 document【冒泡阶段】挂了 _onClickHyperlink，
    // 对任何 a[href] 无条件 preventDefault + window.open(a.href) 开新标签，
    // 且注册比任何模块都早 → 冒泡阶段挂委托必然「灯箱 + 新标签」双开。
    // 解法：本模块挂【捕获阶段】并 stopPropagation，事件到不了 Foundry 的冒泡处理器。
    // 玩家端（没装模块）：点击由 Foundry 处理器开新标签看原图（preventDefault 会吞掉
    // 原生 target=_blank，只开一个标签，不会双开）。
    document.addEventListener("click", (ev) => {
      const link = ev.target instanceof Element ? ev.target.closest(".vlab-chat-media-link") : null;
      const src = link?.dataset?.src;
      if (!src) return;
      ev.preventDefault();
      ev.stopPropagation();
      const title = link.dataset.title;
      try {
        new foundry.applications.apps.ImagePopout({ src, window: { title: title || baseName(src) } }).render(true);
      } catch (e) {
        console.warn("[lh-video-lab] 聊天灯箱失败，回退新标签", e);
        window.open(src, "_blank");
      }
    }, true);

    // ---- 场景控制按钮：轮询 + insertAfter 锚点（照已验证的「简单陷阱」「冒险者履历」模式）----
    const BTN_ID = "vlab-video-lab-btn";
    const BTN_HTML = `<button id="${BTN_ID}" class="control ui-control layer icon fa-solid fa-clapperboard" title="教学视频库" style="color:#00d2ff;"></button>`;
    let logged = false;
    setInterval(() => {
      const $anchor = $("button.control.ui-control.layer.icon.fa-solid.fa-bookmark");
      if (!$anchor.length) return;
      if ($("#" + BTN_ID).length > 0) return;
      const $btn = $(BTN_HTML);
      $btn.on("click", () => openVideoLab());
      $btn.insertAfter($anchor);
      if (!logged) { logged = true; console.log("[lh-video-lab] 🎬 场景控制按钮已挂载（常驻巡查，切场景自动贴回）"); }
    }, 1500);

    // 挂载到 window 方便宏调用（同 renderAdventurerLogApp 模式）
    window.renderVideoLabApp = () => {
      if (!canUse()) { ui.notifications.warn("你没有权限使用教学视频库"); return; }
      openVideoLab();
    };
  });
})();
