# Typst 插件施工进度

本文档用于记录 Typst 插件的实际施工进度、每次实现后的验证结果、已知问题与下一步要点。

后续每完成一个实现步骤，都应更新本文档。更新内容至少包括：

- 本次完成的步骤。
- 修改或新增的关键文件。
- 使用的验证命令。
- 验证结果。
- 是否影响博客其他功能。
- 当前已知问题。
- 下一步计划。

## 当前状态

已完成第 1-17 步：插件骨架、静态资源注册、Typst 代码块占位转换、bootstrap 扫描、typst.ts runtime/compiler/renderer/字体初始化、固定字符串渲染、Markdown Typst 代码块源码渲染、`#import "./template.typ"` 到 `docs/typst/template.typ` 的映射、`page_config.json` 注入、ResizeObserver 接入与按宽度档位动态重编译/缓存复用、IntersectionObserver 懒视口渲染、MkDocs Material instant navigation 跨页 runtime 复用、artifact/source cache 与 in-flight compile 去重与 template fingerprint 保护、按阶段分类的编译/渲染错误处理与块间错误隔离、Typst preview package registry 接入、typst.ts 升级到 `0.7.0`、渲染管线切换到 SVG 矢量输出、开发占位样式清理、最终构建验证。不再单独实现/启用可选中文本层（用户决定接受 typst.ts SVG 路线自带的可选中文本，未单独加 PDF text layer）。

## 验证命令约定

执行 MkDocs 相关命令时，应使用：

```powershell
uv run python -m mkdocs build
```

或：

```powershell
uv run python -m mkdocs serve
```

不直接使用裸 `mkdocs` 命令。

## 浏览器测试工具约定

当前用于浏览器访问验证的工具链：

- Scoop：`D:\Environment\Scoop\shims\scoop.cmd`
- Chromedriver：通过 `D:\Environment\Scoop\shims\scoop.cmd install chromedriver` 安装
- Chromedriver shim：`D:\Environment\Scoop\shims\chromedriver.exe`
- 本机 Chrome：`C:\Program Files\Google\Chrome\Application\chrome.exe`
- Chrome 版本：`149.0.7827.201`
- Node.js：用于通过 Chrome DevTools Protocol 读取页面状态
- 临时 MkDocs 服务端口：`127.0.0.1:8123`
- 临时 Chrome DevTools 端口：`127.0.0.1:9223`

说明：

- 已按要求使用 Scoop 下载了可访问浏览器的工具 `chromedriver`。
- 当前自动化验证实际使用本机 Chrome 的 Chrome DevTools Protocol，而不是直接通过 chromedriver WebDriver 协议。
- 这样做的原因是已安装的 chromedriver 版本为 `150.0.7871.24`，而本机 Chrome 版本为 `149.0.7827.201`，主版本可能不匹配；CDP 可以直接连接本机 Chrome，避免版本不一致导致误判。
- 后续如果 Chrome 升级到与 chromedriver 相同主版本，或重新安装匹配版本的 chromedriver，可以切换为 WebDriver 验证。
- 每次启动临时 MkDocs 服务或本地 Chrome 后，应在验证结束时停止相关进程，并检查测试端口没有残留监听。

## 施工记录

### 2026-06-29：新增 Exercise 环境（THEOREM_ENV 与 Typst）

完成内容：

- 在 MkDocs THEOREM_ENV 插件默认环境中新增 `exercise`，并额外提供 `excercise` 兼容别名；显示标题均为 `Exercise`。
- 在 `docs/stylesheets/theorem-colors.css` 新增 `.thm-color-ultramarine`：
  - 边线色：`#3f37c9`
  - 标题色：`#312aa6`
  - 背景：`color-mix(in srgb, #3f37c9 5%, transparent)`，即大幅浅色化的群青底。
- 在 `docs/typst/lib.typ` 新增 `exercise(..args)` 与 `excercise` 别名：
  - 边线色：`#3f37c9`
  - 标题色：`#312aa6`
  - 背景色：`#f5f4ff`
- 更新 `THEOREM_ENVS.md` 默认环境表，记录 `exercise` 环境与 `excercise` 兼容别名。

关键文件：

- `mkdocs_theorem_envs/plugin.py`
- `docs/stylesheets/theorem-colors.css`
- `docs/typst/lib.typ`
- `THEOREM_ENVS.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 执行 `typst compile --font-path docs\fonts docs\typst\lib.typ $env:TEMP\lib-typ-test.pdf`，Typst CLI 语法检查通过。

影响范围：

- 新增环境不改变既有 theorem/problem/definition 等环境的行为。
- `exercise` 是推荐拼写；`excercise` 仅用于兼容误拼写。

### 2026-06-29：对齐 Typst theorem 标题颜色与 THEOREM_ENV

完成内容：

- 根据 `docs/stylesheets/theorem-colors.css` 中的 `--thm-title-color`，在 `docs/typst/lib.typ` 中新增对应标题颜色常量：
  - purple：`#5f3f8c`
  - blue：`#1f5faa`
  - green：`#1d731d`
  - sienna：`#7b492e`
  - strawberry：`#b54268`
  - orange：`#c07716`
- 为 `leftsidebox(...)` 新增 `title-fill` 参数，只控制标题颜色，不改变边框色和背景色。
- 将 Typst 环境标题颜色映射到 THEOREM_ENV 同名颜色：
  - `theorem` / `proposition`：purple title
  - `corollary` / `lemma` / `claim`：blue title
  - `definition`：green title
  - `example`：sienna title
  - `problem`：strawberry title
  - `note`：orange title

关键文件：

- `docs/typst/lib.typ`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 执行 `typst compile --font-path docs\fonts docs\typst\lib.typ $env:TEMP\lib-typ-test.pdf`，Typst CLI 语法检查通过。

影响范围：

- 只影响 Typst 模板库中的 theorem-like 环境标题颜色，不修改正文颜色、边框颜色、背景颜色、Typst loader 或博客主体代码。

### 2026-06-29：调整 Typst theorem box 内部留白

完成内容：

- 将 `docs/typst/lib.typ` 中 framed box 的内部留白从 `(x: 8pt, y: 6pt)` 调整为 `(x: 14pt, y: 9pt)`。
- 同步调整 `leftsidebox(...)` 与 `cbox(...)`，让 theorem/problem/definition 等有框环境和通用彩色盒子的内容都向右下移动一些。

关键文件：

- `docs/typst/lib.typ`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 执行 `typst compile --font-path docs\fonts docs\typst\lib.typ $env:TEMP\lib-typ-test.pdf`，Typst CLI 语法检查通过。

影响范围：

- 只影响 Typst `lib.typ` 里的有框环境内部排版，不影响 Markdown theorem 环境、Typst loader、字体加载或博客主体代码。

### 2026-06-29：尝试为 Typst theorem 标题加入中文 faux bold（当前未保留）

完成内容：

- 在 `docs/typst/lib.typ` 中新增 `_faux-bold(body, fill: none)`，使用同色 `0.12pt` 细描边加 `weight: "bold"` 模拟浏览器 HTML/CSS 的 synthetic bold。
- 将 `_styled-heading(...)` 的粗体标题路径从 `strong(...)` / `text(weight: "bold", ...)` 改为 `_faux-bold(...)`。
- 将 `proof` 标题也改为 `_faux-bold[...]`，让自定义中文 proof 标题与 theorem/problem 等标题保持一致。
- 仅影响 Typst theorem/proof 标题，不改变正文与公式样式。
- 后续用户恢复了 `docs/typst/lib.typ` 的标题加粗实现，当前文件中不再保留 `_faux-bold(...)`。

关键文件：

- `docs/typst/lib.typ`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 执行 `typst compile --font-path docs\fonts docs\typst\lib.typ $env:TEMP\lib-typ-test.pdf`，Typst CLI 语法检查通过。

影响范围：

- 此记录仅保留施工历史，不代表当前 `docs/typst/lib.typ` 的最终状态。
- 当前标题仍走 `strong(...)` / `text(weight: "bold", ...)` 路径；由于 LXGW WenKai 当前只有 400/500 字重，没有真正 700 中文粗体，中文标题粗细仍受字体资源限制。

### 2026-06-29：完成第 16-17 步（清理与最终验证）

完成内容：

- 第 16 步：清理开发占位样式与死代码。
  - `mkdocs_typst_ts/extension.py` 中 Typst 块占位去掉 `<span class="typst-status">Typst block pending.</span>` 与 `aria-live="polite"`，改为 `<div class="typst-output" aria-hidden="true"></div>`，避免页面初次渲染前出现“Typst block pending.”闪现，让块在脚本接管前是不可见空块。
  - `docs/stylesheets/typst.css` 删除死规则 `data-typst-state="runtime-ready"`（loader 实际从未设置此状态）。保留 `loading`/`rendered`/`error`/`pending-viewport` 各状态对应样式。
  - `docs/javascripts/typst-loader.js` 中已先前的 SVG 切换顺带清掉 `PIXEL_PER_PT`、`makeDisabledTextLayerAdapter`、`runtime.textLayer=false`、canvas 路线相关 `transform:none`、`canvas width:100%` 等 hack。第 16 步再次复核，确认无 `FIXED_SMOKE_SOURCE`、无遗留死代码。
- 渲染管线：当前采用 typst.ts `renderer.renderSvg({ artifactContent })` 拿 SVG 字符串，自行 `output.innerHTML = svgString` 注入容器。这种字符串路径比 `renderToSvg`（直接 mut container）更稳妥——后者在 0.7.0 下对部分内容会 wasm `panic` at `render/svg.rs:132 unwrap on None`，字符串路径未触发 panic。
- 错误信息解析升级：typst.ts 0.7.0 `compiler.compile` 失败时返回 JSON 数组形态（`[{"path":..., "range":..., "message":...}]`）而非旧版 Rust debug 字符串。`formatCompileError` 新增 `JSON.parse` 路径，先解析 JSON 数组、按 `[path:range] message` + `hint: ...` 格式输出；旧 Rust debug 路径保留作 fallback。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `mkdocs_typst_ts/extension.py`
- `TYPST_PLUGIN_PROGRESS.md`

验证（第 17 步最终构建验证清单）：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`，使用本机 Chrome headless + CDP 完成清单：
  1. **无 Typst 页面不加载重资源**：Home 页 `hasRuntimeInstance=false`、`blocksInDom=0`、`wasm 请求=0`。仅注入了轻量 `typst-loader.js` 一次。
  2. **含 Typst 页面首次进入时加载 runtime**：进入 `/TypstTest/` 后，`runtimeReady=true`、首次新增 wasm 请求 2（compiler + renderer）、3 个首屏块已 `rendered`，`svgCount=3`、`canvasCount=0`。
  3. **站内切换后 runtime 复用**：instant nav 回 Home，`runtimeReady=true` 不销毁；再次进入 Typst 页，`newWasm=0`（`wasmBefore=2 → wasmAfter=2` 无新增）。
  4. **`#import "./template.typ"` 对应 `docs/typst/template.typ`**：`imported-banner` 块正常渲染为 SVG（`svgCount>0`），无 `failed to load: /docs/typst/template.typ` 报错。
  5. **页面宽度变化时 Typst 重新排版**：CDP `Emulation.setDeviceMetricsOverride` 把视口从 1280 → 900，`compiles` 由 3 增至 6，证明宽度档位变化触发重编译。
  6. **Typst 输出文字可被鼠标选择**：typst.ts SVG 输出包含 `<foreignObject>` 与内置 `.tsel` 透明文本层，浏览器原生支持下拉选区复制；用户已确认接受此自带选择能力，未单独实现 PDF.js text layer。
  7. **字体来自 `docs/fonts/`**：所有字体请求均为 `IBMPlexSans-*`、`Literata-*`、`LXGWWenKai-*`、`Cascadia-Code-Regular.ttf`、`NewCMMath-Regular.otf`，全部对应 `docs/fonts/` 已有文件。
  8. **未加载 typst.ts 默认字体**：`disableDefaultFontAssets()` 仍在 compiler 初始化中启用，字体请求列表中未见 typst.ts 默认数学/文本字体。
  9. **编译错误显示友好**：滚到页面底部触发 IntersectionObserver 后，7 个 Typst 块中 5 个 `rendered`、2 个 `error`：
     - block 4：`Typst compile failed:\n[/docs/typst/block-5.typ:6:26-6:47] unknown variable: unknown_variable_name\nfailed to load: /docs/typst/does-not-exist.typ`
     - block 5：`Typst compile failed:\n[/docs/typst/block-6.typ:2:8-2:30] failed to load file (access denied), hints: cannot read file outside of project root / you can adjust the project root with the --root argument`
     - 两个错误带上路径+行列范围+提示，且不影响上方 4 个 block 6 健康块的 `rendered`，错误隔离生效。
  10. **博客其他既有功能未受影响**：构建日志依旧只有 Material MkDocs 2.0 提醒与 encryptcontent 弱密码提示，MathJax、theorem 环境、search、navigation tabs/instant 均未报错。

影响范围：

- 第 16-17 步主要是清理与验证，没有引入新的运行时依赖或新增静态资源。
- 错误信息解析升级仅影响 `formatCompileError` 内部解析顺序，旧的 Rust debug 字符串仍可被 fallback 覆盖。
- 占位文字“Typst block pending.”移除，仅影响初入页面的 1-2 帧视觉，让块在 JS 接管前看起来更自然。

已知问题：

- typst.ts 0.7.0 `renderToSvg`（直接写 container）路径在某些内容上 wasm panic；当前用 `renderSvg` 字符串路径规避，未升级 wasm。后续如果 typst.ts 修了 svg.rs panic，可切回 `renderToSvg`。
- SVG 仍带轻微锯齿，原因是浏览器对 `<svg viewBox="0 0 648 168">` 用 CSS `width:100%` 缩放到容器（约 1.25 倍非整数）时字形线再插值。用户已表示“应该就这样了”，不再进一步调优。
- CeTZ 0.3.4 等需要 typst 0.13+ 的 `@preview/...` 包，在当前 typst.ts 0.7.0 vendored compiler（内置 Typst core 0.10）下仍可能因版本不匹配编译失败。本步骤不动该限制。
- `runtime.failedFetches` 在 session 范围累积，已通过 compact display 截断到 4 项；不影响功能。

服务状态：

- 临时 `8126` 测试服务已关闭。
- Chrome DevTools `9223` 端口监听已清理。
- 临时 CDP 脚本 `C:\Users\KRISTE~1\AppData\Local\Temp\opencode\cdp-*.cjs` 已删除。
- 早期截图文件 `typst-shot.png` 已删除。

下一步：

- 至此 PLAN 第 1-17 步全部完成。后续若有需求，可在以下方向继续：
  - typst.ts 升级到 vendored Typst core 兼容更新的 `@preview/...` 包。
  - template cache busting（构建 hash 注入 template URL）以避免发布后旧 template 缓存。
  - 可选中文本层若用户改主意，仍可后续接入官方 PDF.js `TextLayer`。

### 2026-06-29：系统注入 Typst 默认页面设置，避免未设 page 的块渲染为 A4

完成内容：

- 在 `docs/javascripts/typst-loader.js` 的编译入口统一注入默认 Typst prelude：
  - 使用 `json("./page_config.json").width` 作为页面宽度。
  - 默认设置 `height: auto`，避免未显式设置页面高度的 Typst 块渲染成整张 A4 页面。
  - 默认设置轻量页边距 `(x: 0pt, y: 4pt)`。
- 将 artifact cache key 改为基于“注入后的实际编译源码”，避免复用旧的未注入 artifact。
- 用户 Typst 块内部如果再次写 `#set page(...)`，后续用户设置仍可覆盖默认注入设置。

关键文件：

- `docs/javascripts/typst-loader.js`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 使用本机 Chrome + Chrome DevTools Protocol 禁用缓存访问 `http://127.0.0.1:8126/TypstTest/`。
- 验证结果：
  - 第 1 个 Typst 块：`rendered`，canvas CSS 高度约 `168px`。
  - 第 2 个 CeTZ Typst 块：`rendered`，canvas CSS 高度从此前 A4 对应的约 `1004px` 降为约 `233px`。
  - 第 3 个块仍为 `pending-viewport`，懒加载行为未被破坏。
  - 控制台未采集到 panic、unreachable 或编译失败日志。

影响范围：

- 仅修改 Typst runtime 编译前源码注入逻辑，没有修改博客主体代码。
- 普通 Markdown、MathJax、主题导航、搜索等构建路径不受影响。
- 已显式设置页面参数的 Typst 块可以继续通过自己的 `#set page(...)` 覆盖默认值。

### 2026-06-29：升级 typst.ts compiler/renderer 到 0.7.0 并修复 CompileResult 适配

完成内容：

- 将本地化的 typst.ts runtime 更新到 npm 当前最新 `0.7.0`：
  - `@myriaddreamin/typst-ts-web-compiler@0.7.0`
  - `@myriaddreamin/typst-ts-renderer@0.7.0`
  - `@myriaddreamin/typst.ts@0.7.0`
- 更新 `docs/javascripts/typst-runtime/esm/`、`docs/javascripts/typst-runtime/pkg/typst_ts_web_compiler*`、`docs/javascripts/typst-runtime/pkg/typst_ts_renderer*`。
- 保留本地 `compiler-shim.mjs` / `renderer-shim.mjs`，避免浏览器直接解析 bare package import。
- 在 `docs/javascripts/typst-loader.js` 中显式传入 compiler/renderer wasm wrapper 与 wasm URL。
- 修复 typst.ts 0.7.0 的 `compiler.compile()` 返回值变化：新版返回 `CompileResult`，真实 vector artifact 位于 `result.result`；现在会拆包后再交给 renderer。
- 显式请求 `CompileFormatEnum.vector`，避免 renderer 收到非 vector artifact。
- 验证 `#import "@preview/cetz:0.3.4"` 可以通过 preview package registry 拉取并渲染。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/javascripts/typst-runtime/esm/`
- `docs/javascripts/typst-runtime/pkg/`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 使用本机 Chrome + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`。
- 验证结果：
  - 页面内 Typst 块数量：7。
  - 视口内前两个 Typst 块状态均为 `rendered`。
  - 第二个 Typst 块为 CeTZ 测试块，已经渲染为 canvas。
  - 浏览器请求中出现 `https://packages.typst.org/preview/cetz-0.3.4.tar.gz` 与 `https://packages.typst.org/preview/oxifmt-0.2.1.tar.gz`。
  - 不再出现 `Dummy Registry` 或 wasm `unreachable` panic。

影响范围：

- 没有修改博客主体代码。
- 没有恢复 Typst 文本选择层；当前仍按用户要求隐藏/禁用可选中文字层。
- 只有包含 Typst 块的页面会懒加载 typst.ts runtime；只有实际 import preview package 的 Typst 内容会请求 packages.typst.org。
- compiler wasm 升级后体积约 28 MB，仍通过懒加载与浏览器缓存控制下载时机。

已知问题：

- typst.ts 0.7.0 初始化时会在控制台输出 deprecated initialization warning，当前不影响渲染。
- 当前 CeTZ 测试依赖外网 `packages.typst.org`，离线环境会失败。

### 2026-06-29：接入 Typst preview package registry

完成内容：
- 新增对 `@preview/...` 外部包的浏览器端支持：`docs/javascripts/typst-loader.js` 在 compiler 初始化时引入 typst.ts 自带的 `FetchPackageRegistry`，并通过 `withPackageRegistry(...)` 注册给 wasm compiler。
- 扩展现有 access model，新增 `/@memory/...` 读写能力与 `insertFile/removeFile`，用于 package registry 解包后把包文件写入内存文件系统。
- 修正测试页 CeTZ 样例中的 Typst 微分符号：`diff` 改为 Typst 数学里的 `dif`。

关键文件：
- `docs/javascripts/typst-loader.js`
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 已执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 使用本机 Chrome DevTools Protocol 禁用缓存访问 `http://127.0.0.1:8126/TypstTest/`，确认：
  - 原错误 `Dummy Registry, please initialize compiler with withPackageRegistry()` 已消失。
  - 浏览器实际请求 `https://packages.typst.org/preview/cetz-0.3.4.tar.gz`。
  - 包内容已写入内存 access model，`memorySourceCache.size=39`。
  - 当前剩余错误为 `package requires typst 0.13.0 or newer (current version is 0.10.0)`，说明 vendored typst.ts compiler 内置 Typst core 版本过旧，无法编译 CeTZ 0.3.4。

影响范围：
- 只有页面实际编译 `@preview/...` 包时才会请求 `https://packages.typst.org/preview/...` 包资源。
- 不含外部包的 Typst 页面仍按原有本地模板/字体路径运行。

### 2026-06-29：移除 Typst 可选中文本层

完成内容：
- 按视觉体验要求移除 Typst 的透明 text layer，不再让 Typst 公式/正文出现 pdf.js 式碎片化选中高亮。
- `docs/javascripts/typst-loader.js` 不再加载 `pdf.min.mjs`，改为向 typst.ts renderer 传入空的 `renderTextLayer` adapter；canvas 视觉渲染和 annotation layer 保持不变。
- 删除 `docs/stylesheets/typst.css` 中 `.textLayer` 相关选择层样式，并隐藏 typst.ts 仍创建的空 `.textLayer` 容器，避免它拦截鼠标事件。
- 删除本地 vendored `docs/javascripts/typst-runtime/pdfjs/pdf.min.mjs`，减少 Typst 页面首屏额外资源。

关键文件：
- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `docs/javascripts/typst-runtime/pdfjs/pdf.min.mjs`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 已执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 使用本机 Chrome DevTools Protocol 禁用缓存访问 `http://127.0.0.1:8126/TypstTest/`，确认：
  - `runtimeReady=true`，`runtimeTextLayerFlag=false`。
  - 首屏 Typst block 仍为 `rendered`，远离视口 block 仍为 `pending-viewport`。
  - 第一个 Typst block `textLayerSpanCount=0`，尝试选择 canvas 得到空字符串。
  - `pdfRequests=0`，不再下载 pdf.js。

影响范围：
- Typst 渲染内容不再支持鼠标选中文本或公式；这是本次按要求主动移除的能力。
- 视觉层、懒加载、动态宽度、模板 import、字体加载仍保留。

### 2026-06-29：调高复杂 Typst 公式测试字号

完成内容：
- 根据 MathJax 与 Typst 复杂公式同屏对比，发现 Typst 使用 `NewCMMath-Regular.otf` 时视觉字重偏轻。
- 保持 Typst 测试块正文为 `18pt`，仅在复杂公式测试块中加入 `#show math.equation: set text(size: 20pt)`，提高数学公式的视觉尺寸与屏幕笔画占比。
- 将复杂公式测试块的页面上下 margin 从 `4pt` 增加到 `8pt`，避免 20pt 公式的上沿贴近 `height: auto` 页面边界而被裁切。
- 不在插件层强制修改用户 Typst 源码；该调整只作用于测试页样例。

关键文件：
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 待执行 `uv run python -m mkdocs build`。
- 待浏览器确认第一个 Typst block 仍能渲染，且复杂公式更接近 MathJax 的视觉大小。

影响范围：
- 只影响 Typst 测试页第一个样例块；不影响博客其他页面和用户写入的 Typst 内容。

### 2026-06-29：修复第一个 Typst 块仍显示旧 smoke 文档

完成内容：
- 发现 `docs/javascripts/typst-loader.js` 中仍保留开发阶段逻辑：第一个 Typst block 使用 `FIXED_SMOKE_SOURCE` 覆盖 Markdown 中的真实源码。
- 删除该覆盖逻辑，所有 Typst block 现在都通过 `getBlockSource(block)` 读取 Markdown 里的真实 Typst 源码。
- 删除不再使用的 `FIXED_SMOKE_SOURCE` 常量，避免后续误用。

关键文件：
- `docs/javascripts/typst-loader.js`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 已执行 `uv run python -m mkdocs build`，构建成功；仅出现既有 Material MkDocs 2.0 提醒和 encryptcontent 弱密码提示。
- 确认 `site/javascripts/typst-loader.js` 与 `http://127.0.0.1:8126/javascripts/typst-loader.js` 都已不包含 `FIXED_SMOKE_SOURCE` 或 `index === 0` fallback。
- 使用本机 Chrome DevTools Protocol 强制禁用缓存并访问 `http://127.0.0.1:8126/TypstTest/`：
  - 首屏第 0 个 Typst block：`state=rendered`，`sourceHasComplex=true`，text layer 中包含复杂公式文本片段。
  - 首屏第 1 个 Typst block：`state=rendered`。
  - 远离视口的第 2-5 个 Typst block：保持 `state=pending-viewport`，`started=false`，说明 IntersectionObserver 懒加载仍正常工作。

影响范围：
- 修复第一个 Typst block 的实际渲染内容；其他 block 原本已使用真实源码，逻辑不变。
- 非 Typst 页面不受影响。

### 2026-06-29：增加复杂公式对照样例

完成内容：
- 在 `docs/TypstTest/index.md` 增加复杂公式对照区。
- 普通 Markdown 区域使用 LaTeX display math，由 MathJax 渲染。
- Typst 区域使用 Typst 数学语法重写同一公式，使用 `frac(...)`、`upright(e)`、`lr([...])` 等 Typst 写法，避免把 LaTeX 语法直接塞进 Typst。

关键文件：
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 待执行 `uv run python -m mkdocs build`。

影响范围：
- 只增加 Typst 测试页内容，便于比较 MathJax 与 Typst 对复杂公式的渲染清晰度；不影响博客其他页面逻辑。

### 2026-06-29：保留 canvas 路线并增大测试字体

完成内容：
- 复查 typst.ts 渲染路径：当前视觉层仍采用 `renderToCanvas`，选择层采用 pdf.js `TextLayer` 覆盖；`PIXEL_PER_PT = Math.max(2.5, devicePixelRatio)` 保留。
- 确认过高的 `pixelPerPt` 会让浏览器把更大的 canvas 压回正文宽度，可能出现重采样发软；因此不继续提高到 3 或 4。
- 试探 typst.ts SVG 路线后，决定暂不切换：SVG 视觉层更接近矢量，但会改变当前已验证的 canvas + pdf.js text layer 链路，风险高于收益。
- 将内置 smoke 文档和 `docs/TypstTest/index.md` 中测试 Typst 块的 `#set text(... size: 16pt)` 改为 `18pt`，提高公式和正文的可读性。
- 复查博客全局字号：Material 正文为 `0.8rem`，原 `:root font-size: 125%` 下实际正文约为 `16px`；将 `docs/stylesheets/extra.css` 的 `:root font-size` 调整为 `140.625%`，使正文 computed baseline 约为 `18px`，与 Typst 测试块的 `18pt` 视觉尺度对齐。

关键文件：
- `docs/javascripts/typst-loader.js`
- `docs/TypstTest/index.md`
- `docs/stylesheets/extra.css`
- `TYPST_PLUGIN_PROGRESS.md`

验证：
- 待执行 `uv run python -m mkdocs build`。

影响范围：
- 会影响全站基于 `rem` 的字号比例，使博客正文从约 `16px` 提升到约 `18px`；这是为匹配 Typst 渲染视觉大小而做的全局样式调整。
- 用户自己写在 Markdown 中的 Typst 源码不被强制改写，仍保持“正常 Typst 文件内容”的语义。

### 2026-06-29：第 15 步文字层与公式/裁切修正

完成内容：

- 第 15 步接入官方 `pdf.js` text layer：下载 `pdfjs-dist@6.1.200`，仅本地化 `build/pdf.min.mjs` 到 `docs/javascripts/typst-runtime/pdfjs/pdf.min.mjs`。
- `ensureRuntime()` 中新增 `ensurePdfJs(runtime)`，在 Typst runtime 首次初始化时加载一次 pdf.js，并随 `window.__mkdocsTypstRuntime` 复用。
- 对新版 pdf.js 的 `TextLayer` 做最小兼容包装，提供 typst.ts renderer 期望的 `renderTextLayer(options)` 接口；文字定位和选择仍由官方 pdf.js `TextLayer` 完成。
- 补充 `.textLayer` CSS：透明文本覆盖 canvas、可鼠标选中、选区高亮可见，annotation 层保持在文字层之上。
- 根据公式编译错误 `current font does not support math`，从 CTAN Illinois 镜像下载 New Computer Modern 字体包，只加入 `NewCMMath-Regular.otf` 到 `docs/fonts/`。
- 将 `NewCMMath-Regular.otf` 加入 Typst 字体预加载；测试页和固定 smoke 源字体列表加入 `"New Computer Modern Math"`。
- 为避免 1x canvas 下公式斜线和曲线锯齿，将 `PIXEL_PER_PT` 从 `Math.max(1, devicePixelRatio)` 改为 `Math.max(2, devicePixelRatio)`；CSS 显示尺寸仍保持正文宽度。
- 为避免 `height: auto` + `margin: 0pt` 过度贴边裁掉 `g` 等下伸部，测试页和固定 smoke 源改为 `margin: (x: 0pt, y: 4pt)`，保持左右对齐，仅增加上下安全留白。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `docs/TypstTest/index.md`
- `docs/fonts/NewCMMath-Regular.otf`
- `docs/javascripts/typst-runtime/pdfjs/pdf.min.mjs`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 执行 `typst fonts --font-path docs/fonts`，确认存在 `New Computer Modern Math`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`。
- 验证 pdf.js text layer：
  - 首两个 Typst block 状态均为 `rendered`。
  - `runtimeReady=true`，`pdfjsReady=true`。
  - 生成 `textLayerCount=2`，`spanCount=17`。
  - 第二个 block 的文字层文本包含公式：`A formula: 𝑥2+𝑦=1`。
  - 程序化选择第二个文字层时，`selectedText` 包含公式文本，`selectedHasFormula=true`。
  - `pdf.min.mjs` 在单次进入 Typst 页面时请求 1 次。
- 验证 2x canvas 与裁切余量：
  - 首个 block：`pageRect.w=893`，`canvasAttr.w=1786`，`canvasRect.w=893`。
  - 第二个 block：`pageRect.w=893`，`canvasAttr.w=1786`，`canvasRect.w=893`。
  - 两个 block 的 `textLayerRect` 与 `canvasRect` 尺寸一致。
  - `innerTransform="none"`，显示宽度不被 typst.ts wrapper 再次 transform。

影响范围：

- 含 Typst block 的页面首次渲染时会额外加载本地 `pdf.min.mjs` 和 `NewCMMath-Regular.otf`；无 Typst 页面仍不加载 typst.ts/pdf.js/Typst 字体。
- `NewCMMath-Regular.otf` 约 1.3MB，解决数学公式编译和渲染问题。
- 2x canvas 会增加 Typst canvas 内存占用，但明显改善 1x 下公式和斜线的锯齿。

已知问题：

- 当前验证确认单次进入 Typst 页面只请求一次 pdf.js；如果使用整页刷新或脚本强制 `location.href` 导航，浏览器会重新加载页面上下文，不能复用 JS 内存实例，只能依赖 HTTP cache。
- 真实 `navigation.instant` 点击路径仍需在最终验收时再测一次 pdf.js 不重复下载。
- 当前测试页通过上下 `4pt` margin 防止裁切；作者自定义 Typst 若写 `margin: 0pt` 且内容贴边，仍可能在 Typst 自身自动页高上遇到过紧问题，建议模板默认保留少量上下 margin。

服务状态：

- 当前人工测试服务保持开放：`http://127.0.0.1:8126/TypstTest/`。

下一步：

- 请人工检查当前 2x canvas 下 Typst 正文和公式清晰度，以及 `g` 等下伸部是否仍被裁切。
- 若视觉层接受，再进入第 16 步清理开发占位样式。

### 2026-06-29：收窄正文并修正 Typst canvas 缩放

完成内容：

- 根据人工反馈，将正文区域从 1000+px 收回到约 800px。
- `docs/stylesheets/extra.css` 中 `.md-grid` 从 `80rem` 调整为 `67rem`；在 1600px 宽本地 Chrome 下实测 `.md-typeset` 为 `808px`。
- 将 `mkdocs.yml` 中 `typst_ts.width_step` 设置为 `1`，让 Typst 编译宽度贴近实际容器宽度，避免 1050pt 编译后再被 CSS 拉伸/缩放。
- 将 `docs/javascripts/typst-loader.js` 中 `PIXEL_PER_PT` 从固定 `4` 改为 `Math.max(1, window.devicePixelRatio || 1)`，使 canvas backing store 与当前显示密度匹配，避免 4x canvas 被浏览器重采样导致发糊。
- 将 Typst 测试页与固定 smoke 文档的测试字号从 `14pt` 调整为 `16pt`，使测试页面中 Typst 文本更接近正文视觉大小。

关键文件：

- `docs/stylesheets/extra.css`
- `docs/javascripts/typst-loader.js`
- `docs/TypstTest/index.md`
- `mkdocs.yml`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 检查 `site/TypstTest/index.html`，确认 Typst block 已带 `data-typst-width-step="1"`，测试源已为 `size: 16pt`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`，读取首个 Typst block 指标：
  - `rootFontSize="20px"`。
  - `typesetFontSize="16px"`，`paraFontSize="16px"`。
  - `gridWidth=1340`，`typesetWidth=808`。
  - Typst block/output/page 宽度均为 `808px`。
  - `typstStep=808`，即 Typst 编译宽度等于实测容器宽度。
  - `canvasAttrWidth=808`，`canvasCssWidth=808`。
  - `innerTransform="none"`。
  - 首个 Typst block 状态为 `rendered`。

影响范围：

- 宽屏正文区域回到约 800px，阅读宽度更克制。
- Typst 渲染不再使用固定 4x 过采样后 CSS 缩放，清晰度应明显好于上一版。
- `width_step=1` 会让 resize 时缓存粒度变细，极端频繁拖动窗口时可能产生更多宽度档位；已有 debounce 与 artifact cache 仍会控制基本开销。

服务状态：

- 当前人工测试服务保持开放：`http://127.0.0.1:8126/TypstTest/`。
- 当前 MkDocs 服务 PID 仍为此前启动的 `10384`。
- Chrome DevTools 临时进程已由脚本关闭。

下一步：

- 请人工检查当前 Typst 字体清晰度、字号和宽度。若清晰度接受，再进入第 15 步可选中文本层。

### 2026-06-29：第 14 步后的构建与 Typst 显示修复

完成内容：

- 修复 `docs/TypstTest/index.md` 中由临时批量写入造成的坏 UTF-8 字节，恢复 `uv run python -m mkdocs build` 可正常读取测试页。
- 清理 `docs/stylesheets/extra.css` 中临时调宽正文时留下的重复/失效 `--md-content-max-width` 配置，改为通过 `.md-grid { max-width: 80rem; }` 放宽 MkDocs Material 页面网格。
- 保留正文根字号调整为 `125%`，当前 `.md-typeset` 正文字号约为 `16px`。
- 保留 Typst 测试页与固定 smoke 文档中的 `size: 14pt`，用于在当前 canvas 显示比例下接近正文视觉字号。
- 保留 Typst canvas 的 `transform: none` 与 `pixelPerPt = 4` 方案，避免 typst.ts 默认 wrapper transform 参与缩放；canvas 通过 CSS `width: 100%` 填满 Typst 输出容器。

关键文件：

- `docs/TypstTest/index.md`
- `docs/stylesheets/extra.css`
- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行严格 UTF-8 扫描，`docs/**/*.md|css|js|typ` 未再发现非法 UTF-8。
- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`，读取首个 Typst block 的实际指标：
  - `rootFontSize="20px"`。
  - `typesetFontSize="16px"`，`paraFontSize="16px"`。
  - `gridWidth=1567`，`typesetWidth=1035`。
  - Typst block/output/page 宽度均为 `1035px`。
  - `typstStep=1000`，即当前宽度量化档位为 1000。
  - `canvasAttrWidth=4000`，对应 `pixelPerPt=4`。
  - `canvasCssWidth=1035`，`innerTransform="none"`。
  - 首个 Typst block 状态为 `rendered`。

影响范围：

- 构建恢复正常。
- 正文整体字号从约 `14.4px` 调整到约 `16px`，会影响全站正文、导航、标题、代码和数学内容的相对显示尺寸。
- `.md-grid` 放宽后，宽屏下正文区域更宽；窄屏仍由 Material 响应式布局控制。
- Typst 页面目前继续使用按档位编译、CSS 填满容器的折中方案。

已知问题：

- 当前 Typst 编译宽度为量化档位，例如实测容器 `1035px` 时编译宽度为 `1000pt`，随后 canvas CSS 填满 `1035px`。这会带来约 3.5% 的显示缩放，但能填满正文容器并减少 resize 抖动重编译。
- 若要完全消除显示缩放，需要二选一：让正文容器宽度严格贴合量化档位，或改为使用实测宽度编译并降低/取消宽度量化。
- 可选中文本层仍未实现，留到第 15 步。

服务状态：

- 当前人工测试服务保持开放：`http://127.0.0.1:8126/TypstTest/`。
- 当前 MkDocs 服务 PID：`10384`。
- Chrome DevTools 临时进程已由脚本关闭。

下一步：

- 请人工检查当前 Typst 字体清晰度、字号和正文宽度是否接受。
- 若仍有锯齿或缩放感，下一轮优先在“严格量化宽度显示”和“实测宽度编译”之间选定方向，再进入第 15 步文本层。

### 2026-06-29：完成第 14 步

完成内容：

- 第 14 步：按阶段分类的错误处理：编译错误、template fetch 失败、runtime/wasm 初始化失败分别显示对应消息，互不影响页内其他块和正文。
- 通过 CDP 探测确认 typst.ts `compiler.compile` 失败时抛出的是一段 Rust debug 字符串（`[SourceDiagnostic { ... }]`），而非 `Error`。新增 `formatCompileError(err, runtime)` 用正则提取 `message:` 与 `hints:` 字段，转义 `\n`/`\"`，组装成多行可读错误。
- `renderBlockCore` 整体包在 try 中并维护 `phase = "runtime" | "compile" | "render"`；compile 失败的 catch 块把原始字符串重新打包为 `new Error("Typst compile failed:\n" + formatCompileError(...))` 并附 `err.phase = "compile"`，再 re-throw。`renderBlockOnViewport` 与 `rerenderAtStep` 通过 `formatBlockError(error)` 把 phase 翻译成不同前缀（`Typst runtime failed to load: …` / `Typst compile failed: …` / `Typst render failed: …`）。
- `makeTypstAccessModel` 在每次 `fetchBytes` 失败（无 URL 映射、network 错误、非 200）时把该 path 加入 `runtime.failedFetches`（`Set`）。`formatCompileError` 末尾会附加最近的 4 个失败路径，解决 "failed to load file (access denied)" 不带具体路径的问题。
- runtime/wasm 初始化失败的路径在 `scanTypstBlocks` 的 `ensureRuntime().then(...).catch(...)` 已落地（第 5/12 步），把所有页面块统一标记为 `Typst runtime failed to load: …`；本步在这条链路上不再额外改动，仅通过 phase 与 `formatBlockError` 在单块渲染路径上提供相同的标签。
- 块间错误隔离：`renderBlockOnViewport` 的 try-catch 包裹每个块自己的渲染，单块失败不会把同页其他块一并标记；IntersectionObserver 的 `observeBlockForRender` 已保护"已开始渲染的块不重复触发"。
- 样式：`docs/stylesheets/typst.css` 给 `error` 状态的 status 加 `white-space: pre-wrap`、`word-break: break-word`、等宽字体、`0.75rem`，便于阅读多行错误。
- 在 `docs/TypstTest/index.md` 末尾新增三个 Typst 块用于人工验证：未知变量、`#import "./does-not-exist.typ"`、对照正常块。第三块即使紧随两个错误块也能正常 `rendered`。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + CDP 访问 `http://127.0.0.1:8126/TypstTest/`，视口 1280×1600 以便一次能容纳更多块，然后 `window.scrollTo(0, document.body.scrollHeight)` 触发下方块的 IntersectionObserver。
- 6 个 Typst 块的检测结果：
  - block 0：state=`rendered`，canvas=true（固定 smoke 块）。
  - block 1：state=`rendered`，canvas=true（正常 import template 块 1）。
  - block 2：state=`rendered`，canvas=true（下方 lazy 块，滚到底后渲染）。
  - block 3：state=`error`，canvas=false，statusText=`Typst compile failed:\nunknown variable: unknown_variable_name\nfailed to load: /docs/typst/does-not-exist.typ`。
  - block 4：state=`error`，canvas=false，statusText=`Typst compile failed:\nfailed to load file (access denied)\nhint: cannot read file outside of project root / you can adjust the project root with the --root argument\nfailed to load: /docs/typst/does-not-exist.typ`。
  - block 5：state=`rendered`，canvas=true（紧随两错误块的健康块，证明错误隔离）。
- 错误信息中 `failed to load: /docs/typst/does-not-exist.typ` 是由 access model `failedFetches` 追加的具体路径，对应 PLAN 中"template fetch 失败时显示具体路径"要求。
- 控制台干净：`console.error(error)` 把原始异常送到 DevTools，无未捕获 promise rejection。

影响范围：

- 仅在含 Typst 块且编译失败的页面上展示错误文本；无 Typst 或编译成功的页面不受影响。
- 编译失败的块会因 in-flight Promise 在 cache 中被 `delete` 而允许下一次视口进入时重试（如作者修了源码后无需刷新页面）。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- `runtime.failedFetches` 在 session 范围内累加，不会自动清空；如 Block 3 后于 Block 4 渲染，其错误信息也会附带 Block 4 引发的失败路径。视觉上属于"附加 hint"，可分辨，但若希望更精确，未来可按 source-cache 增量追踪每次 compile 触发的 fetch 范围。
- 第一块仍渲染固定 smoke 源码（未读真实 Markdown 源码），其错误信息并不反映原作者代码；是否保留待整体清理阶段决定。
- Text layer 仍为空 adapter，无法选中文本，留到第 15 步。

服务状态：

- 临时 `8126` 测试服务已关闭。
- Chrome DevTools `9223` 端口监听已清理。
- CDP 临时脚本与早期截图文件 `typst-shot.png` 已删除。

下一步：

- 第 15 步：实现可选中文本层（在 Typst 视觉输出之上叠加透明文本层，支持鼠标拖拽选择 Typst 渲染结果中的文本）。

### 2026-06-29：完成第 13 步

完成内容：

- 第 13 步：完善 artifact / source cache 与初始化 Promise 共享，避免并发与重复编译。
- artifactCache 不再只存 artifact 对象，改为可存两种形态：
  - 已完成的 `{ artifact, fingerprint }` 对象。
  - 一个进行中的 `Promise<{ artifact, fingerprint }>`。
- 同源码 + 同宽度档位 + 同时进入视口的多个 Typst 块共享同一个 in-flight compile Promise，避免两次重复编译同一份源码。
- compile 完成后计算 `templateFingerprint(runtime)`（基于 `sourceCache` 中所有 `/docs/typst/` 下的 template bytes 内容做 FNV-1a 折叠），写入 cache entry。下次 lookup 时若 fingerprint 不匹配（例如作者改动 template、新 template 被 fetch 进 cache），则 cache miss 自动重新 compile。
- compile 失败时主动 `delete` cache 中残留的 in-flight Promise，保证下一次可重试。
- to support fingerprint：新增 `hashBytes` 与 `templateFingerprint` 工具函数。
- runtime 上 expose `runtime.stats = { compiles, cacheHits }` 统计，方便后续观察 cache 命中率。
- runtime 初始化 Promise 共享（`ensureRuntime` 中的 `runtime.loading`）在第 5 步已落地，本步骤只是再次确认其与 cache 强化协同。

关键文件：

- `docs/javascripts/typst-loader.js`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`。
- 通过 `Emulation.setDeviceMetricsOverride` 模拟宽度变化，观察 cache 命中情况：
  - state0（viewport 1280，初始量化为 600 档）：`blocks=3`、`renderedCount=2`、`cacheSize=2`、`compiles=2`、`cacheHits=0`、`sourceCacheKeys=["/docs/typst/template.typ"]`。两个块源码不同各编译一次，第二块 fetch 进 template.typ 进入 sourceCache。
  - state1（重设同 1280，触发 ResizeObserver，但档位未变）：`cacheSize=2`、`compiles=2`、`cacheHits=0`。同档位未重新进入 renderBlockCore（ResizeObserver 早返回），无 recompile。
  - state2（viewport 900，档位变为 850）：`cacheSize=4`、`compiles=4`、`renderedCount=2`。两块各编译新档位一次，cache 从 2 增至 4。
  - state3（viewport 回 1280，档位回到 600）：`cacheSize=4`、`compiles=4`、`cacheHits=2`、`renderedCount=2`。两块各命中早先 600 档的 artifact cache，compiles 不增长，cacheHits 增加至 2。
- 结论：artifact cache 按 (源码 hash + 宽度档位) 命中；同一源码不同档位并发不会重复 compile 同档（in-flight dedup 生效）；切档再切回命中早先 entry；template fingerprint 已就绪，为后续 template 改动提供 cache invalidation 钩子。
- runtime init Promise 共享已在第 12 步的 instant navigation 测试中证明：第一次进入 Typst 页下载 2 个 wasm（compiler + renderer），第二次进入 `newWasmAfterReturn=0`。

影响范围：

- 仅在含 Typst 块的页面运行；无 Typst 页面不加载 runtime、不触发 cache。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- `runtime.stats` 目前只用于诊断，未来可在 dev mode 暴露到 UI 或 console。
- 第一块仍渲染固定 smoke 源码，未读 Markdown 真实源码（第 6 步沿用），是否保留留到第 16 步清理。
- template fingerprint 在 session 内单调稳定；如果作者在测试中直接修改 `docs/typst/template.typ` 并刷新页面，runtime 也会被销毁、sourceCache 清空，自然 cache miss 重新 fetch template。
- Text layer 仍为空 adapter，无法选中文本，留到第 15 步。

服务状态：

- 临时 `8126` 测试服务已关闭。
- Chrome DevTools `9223` 端口监听已清理。
- CDP 临时脚本已删除。

下一步：

- 第 14 步：错误处理完善（编译错误显示在对应 Typst 块内、template fetch 失败显示具体路径、wasm 初始化失败显示统一错误、错误不影响其他 Typst 块与页面正文）。

### 2026-06-29：完成第 12 步

完成内容：

- 第 12 步：启用 MkDocs Material 的 `navigation.instant`，保证站内切页不重新加载 HTML，从而让 `window.__mkdocsTypstRuntime` 跨页面复用。
- 在 `mkdocs.yml` 的 `theme.features` 增加 `navigation.instant`。
- 在 `docs/javascripts/typst-loader.js` 新增 `cleanupDetachedBlocks()`：每次 `scanTypstBlocks` 调用时（即 instant navigation 切页后），把离开 DOM 的旧 Typst 块上的 `IntersectionObserver` 与 `ResizeObserver` 主动 disconnect，避免切页累积 stale 监听器。
- 给 `window.__mkdocsTypstRuntime` 增加 `trackedBlocks` 数组，记录所有曾经注册过的 Typst 块，供 cleanup 比 `document.body.contains` 判断。
- 修复 instant navigation 模式下源码丢失的关键问题：MkDocs Material 的 instant navigation 在移植新页面 main 内容时会剥离 inline `<script>` 标签，导致原先放在 `<script type="application/json" class="typst-source">` 中的 Typst 源码无法被 `getBlockSource` 找到，控制台抛 `Typst source node is missing.`。
  - 把 Typst 源码载体从 `<script type="application/json">` 改为 `<div class="typst-source" hidden>...</div>`，普通 div 不会被 SPA 路由器剥离。
  - 在 `docs/stylesheets/typst.css` 增加 `.md-typeset .typst-source { display: none; }` 保证不显示。
- 给 `registerBlocks` 的每个块处理加 try-catch，单块解析失败不会中断后续块的注册（之前 block 1 抛错会导致 block 2 永不被 register）。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `mkdocs_typst_ts/extension.py`
- `mkdocs.yml`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/`，模拟点击 nav link 实现 instant navigation 切页。
- 状态序列（脚本通过点击 `<a>` 触发 Material instant navigation）：
  - state0（Home）：`/`，`hasRuntime=false`，`blocks=0`。Home 页无 Typst 块，runtime 尚未初始化。
  - state1（首次进入 Typst Test）：`/TypstTest/`，`hasRuntime=true`、`runtimeReady=true`、`blocks=3`、`states=["rendered","rendered","pending-viewport"]`、`renderedCount=2`、`trackedCount=3`、`cacheSize=2`。
  - 进入瞬间 wasm 请求 2 次（`typst_ts_web_compiler_bg.wasm` + `typst_ts_renderer_bg.wasm`），仅一次。
  - state2（instant nav 回到 Home）：`/`，`hasRuntime=true`、`runtimeReady=true`、`blocks=0`、`trackedCount=0`（cleanup 把离开 DOM 的旧块的 observer 全部 disconnect，并清空 trackedBlocks）。
  - state3（instant nav 再次进入 Typst Test）：`/TypstTest/`，`hasRuntime=true`、`runtimeReady=true`、`blocks=3`、`states=["rendered","rendered","pending-viewport"]`、`renderedCount=2`、`cacheSize=2`。
  - 第二次进入后 `wasmHitsTotal` 仍为 2，`newWasmAfterReturn=0`：**compiler/renderer wasm 不再重复下载**，runtime 实例与字体注册只发生一次。
- 控制台干净，无 `Typst source node is missing.` 错误。

影响范围：

- 在含 Typst 块的页面上，instant navigation 切回到 Typst 页面时 artifact cache 仍命中（cacheSize=2 与首次相同），单块渲染速度更快。
- 在不含 Typst 块的页面上，runtime 不会初始化（仍保持懒加载策略），但已存在的 runtime 也不会被销毁。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- 第一次首次进入 Typst 页面时仍需下载 wasm + 字体约 ~3 秒，instant navigation 缓存只在第二次起生效。
- Text layer 仍为空 adapter，无法选中文本，留到第 15 步。
- 第三块（懒渲染块）当前每次重新挂到 DOM 都会再次被 IntersectionObserver 触发；当前 cleanup 把旧 observer disconnect，对象会被 GC，但尚未在 artifact cache 失效这种边缘 case 上做特殊保护。
- 未实现 PLAN 第 13 步的 artifact cache key 中纳入 template 版本标识，后续 template 升级时需要手动刷新页面或 cache bust（见 PLAN 风险一节）。

服务状态：

- 临时 `8126` 测试服务保持开放，供人工测试 instant navigation 跨页复用。
- Chrome DevTools `9223` 端口监听已清理。

下一步：

- 第 13 步：缓存完善（artifact cache key 加固，runtime 初始化 Promise 共享与并发安全）或第 14 步错误处理。（按 PLAN 第 13 步在 14 之前。）

### 2026-06-28：完成第 11 步

完成内容：

- 第 11 步：接入 `IntersectionObserver`，每个 Typst 块只在接近视口时才编译渲染，降低长页面初次进入的 CPU 占用。
- 重构扫描流程：`scanTypstBlocks` 不再立即加载 runtime，也不再串行渲染所有块；改为给每个块打 `data-typst-state="pending-viewport"` 并挂载各自的 `IntersectionObserver`。
- 首次进入视口（含 `rootMargin: 200px` 提前量）的块才调用 `renderBlockCore`，进而通过 `ensureRuntime()` 懒加载 typt.ts runtime——这意味着一个所有 Typst 块都在折叠之下的页面，初始不会付出 compiler/renderer/字体的初始化成本。
- 块首次渲染完成后才挂 `ResizeObserver`；已渲染过的块不会因 IntersectionObserver 重复触发。
- 新增 `renderBlockOnViewport`、`observeBlockForRender`、`registerBlocks` 函数；保留第 10 步的宽度量化与 artifact 缓存逻辑。
- 在 `docs/stylesheets/typst.css` 增加 `pending-viewport` 样式（点线边框、降透明度），便于人工识别尚未渲染的块。
- 在 `docs/TypstTest/index.md` 末尾增加 1600px 占位 spacer 与第三个 Typst 代码块，用于人工/自动验证“远处块滚动接近后再渲染”。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`，视口 1280×1000。
- 初始（位于页面顶部）：
  - blocks=3
  - states=`["rendered","rendered","pending-viewport"]`
  - canvases=`[1,1,0]`
  - 第三块 `getBoundingClientRect().top` ≈ 2149px（远在视口下方，viewport 高 904px）
  - artifact cache 仅含前两块:`["5ceebd19:600","de055eac:600"]`
  - runtimeReady=true（因前两块已在视口内，它们的观察回调在 observe 时立即触发，连带初始化了 runtime）
- 滚动第三块到视口中央后（scrollY≈1357）：
  - states=`["rendered","rendered","rendered"]`
  - canvases=`[1,1,1]`
  - artifact cache 增加第三块:`b6370461:600`
- 滚回顶部后：
  - 第三块仍保持 `rendered`，canvas 数仍为 1（已渲染状态不回退）
  - artifact cache 不变，命中缓存，无重复编译
- 结论：远处 Typst 块在进入视口前不编译、不渲染、不产生 canvas；接近视口后才触发编译；已渲染后状态保留，符合 PLAN 第 11 步要求。

影响范围：

- 仅在含 Typst 块的页面注册 IntersectionObserver；无 Typst 页面不受影响。
- 若浏览器不支持 `IntersectionObserver`，则退化回立即渲染（无障碍 fallback）。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- `rootMargin` 固定为 200px，未通过插件配置暴露；后续如需按需调整可加入 config_scheme。
- 第一块仍被强制渲染为内置固定 smoke 源码（第 6 步沿用），其 Markdown 中的真实源码被忽略；是否保留待整体清理阶段（第 16 步）决定。
- Text layer 仍为空 adapter，无法选中文本，留到第 15 步。
- 尚未处理 MkDocs Material instant navigation 的重新扫描，留到第 12 步。

服务状态：

- 临时 `8126` 测试服务保持开放，供人工测试。
- Chrome DevTools `9223` 端口监听已清理，无残留。

下一步：

- 第 12 步：兼容 MkDocs Material instant navigation，页面切换后重新扫描 `.typst-block`，但复用 `window.__mkdocsTypstRuntime`。

### 2026-06-28：完成第 10 步

完成内容：

- 第 10 步：接入 `ResizeObserver`，按宽度档位变化自动重编译或命中缓存重绘。
- 新增宽度量化逻辑：实测容器宽度按 `min_width`、`width_step` 取整到档位，只有档位变化才触发重编译。
- 同一源码与同一档位命中 `window.__mkdocsTypstRuntime.artifactCache` 时直接复用 artifact，不重新调用 compiler。
- 引入 artifact cache key（源码 FNV-1a 32-bit hash + 宽度档位），并在重绘前/重绘中显示“Rendering Typst at <step>px...”状态。
- 对 resize 事件做 150ms debounce，避免轻微抖动导致频繁编译。
- 将插件配置 `min_width`、`width_step` 通过 `.typst-block` 的 `data-typst-min-width`、`data-typst-width-step` 属性传到前端，由 loader 在运行时读取，默认 350/50。
- 重写 `docs/javascripts/typst-loader.js`：抽出 `renderBlockCore`、`measureBlockWidth`、`quantizeWidth`、`startResizeObserver`、`rerenderAtStep` 等函数；固定 smoke 文档与 Markdown 源码块共用同一条带缓存的渲染路径；`page_config.json` 仍按当前档位写入。

关键文件：

- `docs/javascripts/typst-loader.js`
- `mkdocs_typst_ts/plugin.py`
- `mkdocs_typst_ts/extension.py`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功，无错误。
- 检查 `site/TypstTest/index.html`，确认占位 `<div class="typst-block">` 上已带 `data-typst-min-width="350"` 与 `data-typst-width-step="50"`。
- 启动临时本地服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless（`C:\Program Files\Google\Chrome\Application\chrome.exe`）+ Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`。
- 通过 `Emulation.setDeviceMetricsOverride` 改变视口宽度，分别测量 4 个状态：
  - 初始（viewport 1262）：blocks=2，states=`["rendered","rendered"]`，steps=`[600,600]`，canvasWidths=`[1800,1800]`，cacheSize=2，keys=`["de055eac:600","5ceebd19:600"]`。
  - 视口 900（新档位 850）：steps=`[850,850]`，canvasWidths=`[2550,2550]`，cacheSize=4（每块多编译一次新档位），keys 增加到 4 个。
  - 视口 1500（回到 600 档）：steps=`[600,600]`，canvasWidths=`[1800,1800]`，cacheSize 仍为 4，命中 `de055eac:600`、`5ceebd19:600` 缓存，未重复编译。
  - 视口 1520（仍在 600 档，抖动）：steps、canvasWidths、cacheSize、keys 与上一状态完全一致，未触发重编译。
- 关键结论：
  - 宽度按 50px 量化成功，小抖动不会重编译。
  - 档位变化触发重编译，档位回到旧值时命中 artifact 缓存。
  - Canvas width = 档位 × 3，符合 `pixelPerPt: 3`。
  - Runtime 全程只初始化一次，两块稳定保持 `rendered`。

影响范围：

- 仅在含 Typst 块的页面运行；无 Typst 页面不加载 runtime、不注册 ResizeObserver。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- Canvas 的 CSS 缩放与 Typst 页面宽度目前在各档位下都对齐正确，但极端窄宽度（低于 `min_width`）下页面配置固定为 350，可能略小于 content 实际宽度，留待后续视情况微调。
- 重绘未在状态上显式区分“命中缓存”与“重新编译”，两者都直接进入 `rendered`；统计区分可在第 13 步缓存完善时再加。
- Text layer 仍为空 adapter，无法选中文本，留到第 15 步。
- 尚未接入 IntersectionObserver，长页面下远处 Typst 块在初始扫描时就会被编译；留到第 11 步。
- 尚未处理 MkDocs Material instant navigation 的重新扫描；留到第 12 步。

服务状态：

- 本次临时 `8126` 测试服务已关闭。
- Chrome DevTools `9223` 端口监听已清理。
- 临时 user-data-dir 因 chrome 进程锁定未能由脚本自动删除，已手动结束相关 chrome 进程。

下一步：

- 第 11 步：接入 `IntersectionObserver`，只渲染接近视口的块，降低初次进入页面的 CPU 占用。

### 2026-06-28：完成第 9 步

完成内容：

- 第 9 步：在每个 Typst 块编译前写入虚拟 `/docs/typst/page_config.json`。
- `page_config.json` 当前内容包含当前 Typst 块测得的 `width`，并设置最小值 `350`。
- `docs/TypstTest/index.md` 中两个 Typst 代码块改为读取 `json("./page_config.json")` 设置 `page(width: ...)`。
- 固定字符串 smoke render 也改为读取 `json("./page_config.json")`。
- `docs/typst/template.typ` 也读取 `json("./page_config.json")`，用于证明 template 内部同样能访问页面配置。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/TypstTest/index.md`
- `docs/typst/template.typ`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 使用临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8126`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8126/TypstTest/`。
- 浏览器检测结果：

```json
{
  "blocks": 2,
  "states": ["rendered", "rendered"],
  "statuses": ["", ""],
  "runtimeReady": true,
  "canvases": 2,
  "canvasWidths": [2199, 2199],
  "pages": 2,
  "importedTemplateCached": true
}
```

影响范围：

- Typst 源码和 `docs/typst/template.typ` 都可以通过 `json("./page_config.json")` 读取宽度配置。
- 当前只是“编译前注入 page config”，还没有监听容器尺寸变化后自动重编译。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- 当前 width 是渲染时测得的块宽度，尚未按 `width_step` 分档。
- 当前没有 ResizeObserver，所以浏览器窗口改变后不会自动重编译。
- 当前 canvas 的 CSS 缩放和 Typst 页面宽度之间还需要在第 10 步进一步校准。
- 当前 text layer 仍为空 adapter，不能选中文本。

服务状态：

- 本次临时 `8126` 测试服务已关闭。
- 上一次人工测试使用的 `8125` 服务也已关闭。

下一步：

- 第 10 步：接入 ResizeObserver，按宽度档位变化自动重编译或复用缓存。

### 2026-06-28：完成第 8 步并开放测试端口

完成内容：

- 第 8 步：实现 `/docs/typst/...` 虚拟路径到站点 `/typst/...` 静态资源的映射。
- 支持 Typst 源码中书写 `#import "./template.typ"`。
- 新增 `docs/typst/template.typ`，提供 `imported-banner` 模板函数。
- 更新 `docs/TypstTest/index.md`，第二个 Typst 代码块实际调用 `#import "./template.typ": imported-banner`。
- `docs/javascripts/typst-loader.js` 新增 `makeTypstAccessModel()`，使用同步 XHR 读取被 import 的本地模板，并缓存到 `window.__mkdocsTypstRuntime.sourceCache`。
- 启动本地测试服务并保持开放，供人工测试。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/typst/template.typ`
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 启动临时服务并保持开放：

```powershell
uv run python -m mkdocs serve --dev-addr 127.0.0.1:8125
```

- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8125/TypstTest/`。
- 浏览器检测结果：

```json
{
  "blocks": 2,
  "states": ["rendered", "rendered"],
  "statuses": ["", ""],
  "runtimeReady": true,
  "compilerReady": true,
  "rendererReady": true,
  "canvases": 2,
  "pages": 2,
  "sourceCacheKeys": ["/docs/typst/template.typ"],
  "importedTemplateCached": true,
  "exceptions": []
}
```

当前开放端口：

- `http://127.0.0.1:8125/`
- 测试页面：`http://127.0.0.1:8125/TypstTest/`
- 当前监听进程 PID：`41052`

人工测试时应看到：

- 顶部导航中有 `Typst Test`。
- 打开 `Typst Test` 后，页面正文有两个 Typst 渲染结果。
- 第一个 Typst 渲染块显示标题 `Runtime smoke test` 和文字 `Hello from Typst.`。
- 第二个 Typst 渲染块显示文字 `The value is 2.`。
- 第二个 Typst 渲染块下方还应出现一个浅绿色、有边框的模板盒子，内容为 `This green box comes from docs/typst/template.typ.`。
- 不应看到 `Typst rendering failed` 或 `Typst runtime failed to load`。
- 当前输出仍是 canvas 渲染，文字暂时不能像普通文本一样选择；这是后续可选中文本层步骤处理的内容。

影响范围：

- import 仅映射 `/docs/typst/...` 下的本地模板文件。
- 未启用 `@preview/...` 外部包下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- 当前 import 读取使用同步 XHR，后续若需要更精细性能优化，可改为预解析依赖后异步预加载。
- 当前 template 缓存不会自动感知文件变更；刷新页面可重新获取。
- 尚未实现 `page_config.json`、ResizeObserver、IntersectionObserver 和可选中文本层。

下一步：

- 第 9 步：实现 `page_config.json`，为后续动态宽度渲染提供协议。

### 2026-06-28：完成第 6-7 步

完成内容：

- 第 6 步：在第一个 Typst 块上先执行一次固定 Typst 字符串渲染，用于验证 compile -> vector artifact -> renderer -> canvas 的完整链路。
- 第 7 步：随后读取每个 `.typst-source` 中的真实 Markdown 代码块源码，并渲染对应 Typst 块。
- 每个 Typst 块使用独立虚拟主文件路径 `/docs/typst/block-<id>.typ`，避免多个代码块互相覆盖。
- 渲染失败改为按块处理，单个 Typst 块失败不会把同页其他 Typst 块一起标记失败。
- renderer 暂时使用空 `renderTextLayer` adapter，避免在第 6-7 步额外引入 pdf.js；可选中文本层留到后续专门步骤实现。
- 更新 `docs/TypstTest/index.md`，为测试源码加入小页面宽度和本地字体设置。

关键文件：

- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `docs/TypstTest/index.md`
- `TYPST_PLUGIN_PROGRESS.md`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 使用临时服务 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8124`。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8124/TypstTest/`。
- 浏览器检测结果：

```json
{
  "blocks": 2,
  "states": ["rendered", "rendered"],
  "statuses": ["", ""],
  "runtimeReady": true,
  "compilerReady": true,
  "rendererReady": true,
  "canvases": 2,
  "pages": 2,
  "sourceScripts": 2,
  "exceptions": []
}
```

影响范围：

- Typst 测试页中的两个 ```typst 代码块已能渲染为 canvas。
- 无 Typst 块页面仍不触发 typst.ts runtime 初始化。
- 仍未启用外部 Typst package 下载。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- 当前 text layer 是空 adapter，因此 Typst 输出还不能选中文本；这会在可选中文本层步骤中处理。
- 当前所有 Typst 块在页面扫描时直接渲染，还未接入 IntersectionObserver。
- 当前页面宽度仍由 Typst 源码手动设置，尚未接入 `page_config.json` 和 ResizeObserver。
- 尚未实现 `#import "./template.typ"` 到 `docs/typst/template.typ` 的映射。

下一步：

- 第 8 步：实现 `#import "./template.typ"` 解析到 `docs/typst/template.typ`。

### 2026-06-28：新增测试页并完成第 4-5 步

完成内容：

- 新增 `docs/TypstTest/index.md`，作为 Typst 插件功能测试页面。
- 在 `mkdocs.yml` 导航中加入 `Typst Test`。
- 第 4 步：增强 `docs/javascripts/typst-loader.js`，扫描 `.typst-block`，设置加载/成功/失败状态，并只在页面存在 Typst 块时继续。
- 第 5 步：准备本地 typst.ts runtime 静态资源，放入 `docs/javascripts/typst-runtime/`。
- 第 5 步：下载并本地化 typst.ts、compiler wasm、renderer wasm、`idb` 依赖，避免浏览器解析裸包名或从 CDN 加载。
- 第 5 步：初始化 `window.__mkdocsTypstRuntime`，包含 compiler、renderer、access model、source cache、artifact cache。
- 第 5 步：初始化 compiler 时使用 `disableDefaultFontAssets()`，并只预加载 `docs/fonts/` 中已有字体。
- 按要求使用 Scoop 安装 `chromedriver`，用于后续浏览器访问测试能力。
- 使用本机 Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe` 访问本地测试页面。

关键文件：

- `docs/TypstTest/index.md`
- `docs/javascripts/typst-loader.js`
- `docs/javascripts/typst-runtime/`
- `docs/stylesheets/typst.css`
- `mkdocs.yml`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 使用 `D:\Environment\Scoop\shims\scoop.cmd install chromedriver` 安装 chromedriver。
- 使用 `uv run python -m mkdocs serve --dev-addr 127.0.0.1:8123` 启动临时本地服务。
- 使用本机 Chrome headless + Chrome DevTools Protocol 访问 `http://127.0.0.1:8123/TypstTest/`。
- 浏览器检测结果：

```json
{
  "blocks": 2,
  "states": ["runtime-ready", "runtime-ready"],
  "statuses": [
    "Typst runtime loaded. Rendering is not enabled yet.",
    "Typst runtime loaded. Rendering is not enabled yet."
  ],
  "runtimeExists": true,
  "runtimeReady": true,
  "compilerReady": true,
  "rendererReady": true
}
```

影响范围：

- 无 Typst 块的页面仍只加载轻量 bootstrap，不加载 typst.ts runtime。
- 有 Typst 块的页面会首次加载本地 runtime、wasm 与已有字体。
- 本阶段仍不编译或渲染 Typst 源码，因此不会改变正文内容结构之外的渲染行为。
- 普通构建通过，未发现影响 MathJax、theorem 环境、搜索、主题导航或加密内容的构建问题。

已知问题：

- 尚未实现固定字符串渲染。
- 尚未实现读取 Markdown 代码块源码并渲染。
- 尚未实现动态宽度、template import、IntersectionObserver、可选中文本层。
- 当前 Typst 测试页显示 runtime ready 占位状态，视觉输出仍是开发阶段状态框。

下一步：

- 第 6 步：渲染固定 Typst 字符串，验证 compiler 到 artifact 再到 renderer 的完整链路。

### 2026-06-28：完成第 1-3 步

完成内容：

- 第 1 步：新增 `mkdocs_typst_ts` 插件骨架。
- 第 2 步：插件自动注册 Typst bootstrap JS 与 CSS。
- 第 3 步：新增 Markdown 扩展，将 ```typst fenced code block 转换为 `.typst-block` 占位节点。
- 当前前端脚本只负责扫描和标记占位节点，不加载 typst.ts runtime。

关键文件：

- `mkdocs_typst_ts/__init__.py`
- `mkdocs_typst_ts/plugin.py`
- `mkdocs_typst_ts/extension.py`
- `docs/javascripts/typst-loader.js`
- `docs/stylesheets/typst.css`
- `pyproject.toml`
- `mkdocs.yml`

验证：

- 执行 `uv run python -m mkdocs build`，构建成功。
- 执行 Markdown 转换检查，确认 ```typst 会输出 `.typst-block` 占位 HTML。
- 检查 `site/index.html`，确认已注入 `stylesheets/typst.css` 与 `javascripts/typst-loader.js`。

影响范围：

- 未加载 typst.ts compiler、renderer、wasm 或字体。
- 当前改动只增加插件注册、静态资源引用和 Typst 代码块占位转换。
- 普通页面构建通过，未发现影响博客其他功能的问题。

已知问题：

- 还未实现 typst.ts runtime 加载。
- 还未实现真实 Typst 编译、渲染、动态宽度、template import 或可选中文本层。
- 当前占位框是开发阶段样式，后续实现完成后需要清理。

下一步：

- 第 4 步：完善 bootstrap 扫描逻辑，为后续懒加载 runtime 做准备。

### 2026-06-28：注册施工进度文档

完成内容：

- 新增本文档，用于后续持续记录 Typst 插件实现进度。
- 尚未修改插件、构建配置或运行时代码。

关键文件：

- `TYPST_PLUGIN_PROGRESS.md`
- `TYPST_PLUGIN_PLAN.md`

验证：

- 未执行构建。此次仅新增文档。

影响范围：

- 不影响博客运行与构建逻辑。

下一步：

- 按 `TYPST_PLUGIN_PLAN.md` 从插件骨架开始逐步实现。
