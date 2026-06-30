# Typst 插件设计与实施计划

本文档描述为当前 MkDocs 博客增加 Typst 渲染插件的完整设计要求与分步实施计划。目标是在尽量不改动博客主体代码的前提下，通过 MkDocs 插件支持在 Markdown 中直接书写 Typst 代码块，并在浏览器端使用 typst.ts 渲染。

## 目标

为博客增加一个独立 Typst 插件，使作者可以在 Markdown 中使用如下形式调用 Typst：

````markdown
```typst
#import "./template.typ": *

Typst content here.
```
````

渲染逻辑应满足：

- 使用 typst.ts。
- 使用 Form 2 思路渲染，即编译为 vector artifact 后交给 renderer 渲染。
- 支持根据页面实际宽度动态调整 Typst 页面宽度。
- 支持 `#import "./template.typ"`，并将其解析到仓库中的 `docs/typst/template.typ`。
- 只使用博客已经上传的字体，不重新下载 typst.ts 默认字体。
- 尽量少加载资源，保证普通阅读速度。
- 渲染结果应尽量像正常 Typst/PDF 文档一样，允许用户用鼠标指针选中一段文本。
- 以 MkDocs 插件方式注册，避免大幅修改博客主体代码。
- 无论实现推进到哪一步，都不得影响博客其他既有功能。除非实现错误导致构建失败，否则普通 Markdown、MathJax、theorem 环境、加密内容、搜索、主题导航等功能应保持原状。

## 当前项目约束

当前博客使用 MkDocs Material。已有本地插件 `theorem_envs`，它通过 `pyproject.toml` 中的 MkDocs entry point 注册，并在 `mkdocs.yml` 的 `plugins` 中启用。Typst 插件应沿用这一模式。

当前静态资源布局包括：

- `docs/javascripts/`：放置前端脚本。
- `docs/stylesheets/`：放置样式。
- `docs/fonts/`：放置本地字体。
- 计划新增 `docs/typst/`：放置 Typst template 与可 import 文件。

当前已有字体：

- `IBMPlexSans-Regular.ttf`
- `IBMPlexSans-Italic.ttf`
- `IBMPlexSans-Bold.ttf`
- `IBMPlexSans-BoldItalic.ttf`
- `Literata-Regular.ttf`
- `Literata-Italic.ttf`
- `Literata-Bold.ttf`
- `Literata-BoldItalic.ttf`
- `LXGWWenKai-Regular.ttf`
- `LXGWWenKai-Medium.ttf`
- `Cascadia-Code-Regular.ttf`

插件不得为了 Typst 渲染额外下载默认字体。若复杂数学或特殊符号因缺少数学字体出现缺字，应先以错误或缺字状态暴露，不主动新增字体资源。

MkDocs 相关命令必须通过 uv 执行，例如：

```powershell
uv run python -m mkdocs build
```

或：

```powershell
uv run python -m mkdocs serve
```

不直接使用裸 `mkdocs` 命令。

项目根目录维护施工进度文档：

```text
TYPST_PLUGIN_PROGRESS.md
```

每次完成实现步骤后，都应同步更新该文档，记录完成内容、关键文件、验证命令、验证结果、影响范围、已知问题和下一步计划。

## 参考实现要点

参考仓库 `Wallbreaker5th/Wallbreaker5th.github.io` 的 Typst 渲染器提供了几个关键思路：

- 使用 `ResizeObserver` 观察渲染容器宽度。
- 将宽度按固定档位量化，例如 50px 一档，避免窗口轻微变化导致频繁重编译。
- 将页面宽度写入虚拟 `page_config.json`。
- Typst 侧读取 JSON 后设置 `#set page(width: ..., height: auto)`。
- 对相同宽度的编译产物进行缓存。
- 使用本地 wasm 文件初始化 compiler 和 renderer。

本项目不直接照搬 Vue 组件形式，而是改为 MkDocs + 原生浏览器脚本形式。

## 资源加载原则

### 不含 Typst 的页面

页面不应加载 Typst 编译器、renderer wasm、compiler wasm 或 Typst 字体注册逻辑。

允许加载一个极小的 bootstrap 脚本。该脚本只负责检查当前页面是否存在 Typst 代码块，以及在 MkDocs Material 前端导航后重新扫描 DOM。

### 含 Typst 的页面

首次发现 Typst 块时才加载 Typst runtime。加载完成后，当前浏览会话内应复用同一个 runtime。

全局单例建议挂载在：

```js
window.__mkdocsTypstRuntime
```

其中保存：

- compiler 初始化 Promise
- renderer 初始化 Promise
- font preload 状态
- 已加载的 template/source 缓存
- 已编译的 artifact 缓存
- 渲染队列状态

### 跨页面复用

严格意义上的“进入站点后只加载一次 compiler 和字体”依赖前端无刷新导航。若每次站内跳转都是整页刷新，浏览器会销毁 JS 内存，无法保留 compiler 实例。

因此建议启用 MkDocs Material 的 `navigation.instant`。启用后，站内切页不会销毁当前 JS 环境，`window.__mkdocsTypstRuntime` 可以跨页面复用。

如果发生整页刷新，则只能依赖浏览器 HTTP cache，使 typst.ts JS、wasm 和字体文件不重复下载，但 JS 内存实例仍需重新初始化。

### 推荐策略

采用“首次遇到 Typst 块才加载”的策略，而不是站点首页立即预加载。这样可以同时满足：

- 没有 Typst 的页面保持最快阅读速度。
- 第一次进入含 Typst 的页面后，后续站内页面复用同一个 runtime。
- wasm 与字体 URL 稳定，浏览器可缓存。

## import 规则

作者在 Typst 中书写：

```typst
#import "./template.typ": *
```

插件应将其解析到仓库中的：

```text
docs/typst/template.typ
```

运行时虚拟路径设计：

- 当前 Markdown 代码块源码映射为 `/docs/typst/main.typ`。
- `./template.typ` 基于 `/docs/typst/main.typ` 解析为 `/docs/typst/template.typ`。
- 浏览器实际 fetch URL 映射为 `/typst/template.typ`。

换言之，Typst 编译器看到的是 `/docs/typst/template.typ`，站点静态资源访问的是 `/typst/template.typ`。

对于嵌套文件，例如：

```typst
#import "./templates/article.typ": *
```

应对应：

```text
docs/typst/templates/article.typ
```

实际 fetch URL 为：

```text
/typst/templates/article.typ
```

## Typst 页面宽度协议

插件会为每个 Typst 块提供虚拟文件：

```text
/docs/typst/page_config.json
```

内容类似：

```json
{
  "width": 650
}
```

模板可以读取它：

```typst
#let page-width = json("./page_config.json").width
#set page(width: page-width * 1pt, height: auto, margin: 5pt)
```

由于当前主文件路径是 `/docs/typst/main.typ`，`./page_config.json` 会自然解析为 `/docs/typst/page_config.json`。

宽度计算规则：

- 使用 Typst 容器的实际内容宽度。
- 设置最小宽度，例如 350px。
- 按固定档位取整，例如 50px 一档。
- 只有档位变化时才重新编译。
- 同一源码与同一宽度档位命中 artifact 缓存。

## Markdown 转换设计

插件应拦截 Markdown fenced code block：

````markdown
```typst
...
```
````

并转换为 HTML 占位结构。建议结构：

```html
<div class="typst-block" data-typst-id="...">
  <script type="application/json" class="typst-source">
    {"source":"..."}
  </script>
  <div class="typst-output" aria-live="polite"></div>
</div>
```

注意事项：

- Typst 源码必须安全编码，避免破坏 HTML。
- 不应让 `pymdownx.superfences` 把 `typst` 当普通代码高亮块处理。
- 错误信息应显示在当前 Typst 块内，不影响页面其他内容。
- 最终样式应轻量自然，不保留开发阶段的粗糙调试框体。

## 前端渲染设计

### Bootstrap 脚本

Bootstrap 脚本应始终很小，只负责：

- 扫描 `.typst-block`。
- 如果没有 Typst 块，立即返回。
- 如果有 Typst 块，注册懒加载逻辑。
- 兼容 MkDocs Material 的 instant navigation，在页面切换后重新扫描。

### IntersectionObserver

每个 Typst 块应使用 `IntersectionObserver` 延迟渲染。

推荐行为：

- Typst 块接近视口时加入渲染队列。
- 不在页面加载时一次性编译所有 Typst 块。
- 已渲染过的块在 DOM 未销毁时不重复渲染。

### ResizeObserver

每个 Typst 块应使用 `ResizeObserver` 监听容器宽度。

推荐行为：

- 首次进入视口后开始观察宽度。
- 宽度档位变化时重新编译或命中缓存后重绘。
- 对 resize 事件做 debounce，避免频繁编译。

### 编译与渲染缓存

缓存 key 应至少包含：

- Typst 源码 hash。
- 宽度档位。
- 相关 template/source 版本标识。

简单实现阶段可以先只用源码 hash + 宽度档位。后续如果 template 更新导致缓存陈旧，可以在开发模式下禁用缓存，或将 template 内容 hash 纳入 key。

## typst.ts 初始化要求

初始化 compiler 时：

- 使用本地 compiler wasm。
- 使用本地 renderer wasm。
- 调用 `disableDefaultFontAssets()`。
- 调用 `preloadRemoteFonts()`，只传入 `docs/fonts/` 中已有字体对应的站点 URL。
- 设置自定义 access model，使 `/docs/typst/...` 可以从站点静态资源懒加载。
- 设置 package registry 或明确限制包加载策略。

关于 `@preview/...` 包：

- 初始版本不承诺支持外部 package 下载。
- 如果 Typst 源码 import `@preview/...`，应给出明确错误。
- 这样可以避免因为包下载导致阅读时产生额外网络请求。

## 样式要求

Typst 渲染区域应：

- 不破坏 MkDocs Material 正文布局。
- 宽度跟随 `.md-typeset` 内容区域。
- canvas 或 SVG 输出不应横向溢出正文。
- 支持鼠标选中文本。若 typst.ts 的渲染结果本身无法提供可选择文本，应在视觉渲染层之上叠加一层透明文本层，使用户可以像选择普通文档文本一样选择一段内容。
- 透明文本层应尽量与视觉排版位置对齐，不应遮挡链接、按钮或正文其他内容。
- 透明文本层应只服务于选择和复制，不应改变视觉效果。
- loading 状态简洁。
- error 状态清晰显示编译错误。
- 最终不保留明显调试边框。

## 可选中文本层设计

Typst 浏览器端渲染通常会产生 canvas 或 SVG/vector 输出。若该输出无法自然支持文本选择，则需要额外叠加透明文本层。

初始可采用分阶段策略：

1. 先完成视觉渲染。
2. 再为每个 Typst 块生成透明文本层。
3. 透明文本层使用与 Typst 输出相同的容器尺寸。
4. 文本层内容来自 Typst 源码的可读文本提取，或来自 typst.ts artifact 中可获得的文本位置信息。
5. 若能从 artifact 获得字形或文本位置，应优先做位置对齐；若初期只能提取连续纯文本，则作为临时实现，并在进度文档中明确记录限制。
6. 文本层应设置透明颜色，但保留可选择性。
7. 文本层不能吞掉滚动、链接点击或页面导航等正常交互。

最终目标：

- 用户能用鼠标拖拽选择 Typst 渲染结果中的一段文字。
- 复制结果应尽量接近 Typst 源文档的自然文本。
- 该能力不影响 Typst 视觉渲染质量。

开发阶段可以短暂保留占位框，以便验证每一步；最后必须清理。

## 插件配置建议

`mkdocs.yml` 中建议配置形态：

```yaml
plugins:
  - search
  - encryptcontent:
      title_prefix: '[LOCKED]'
  - theorem_envs:
      left_rule: 2px
      right_rule: 1px
      top_rule: 0px
      bottom_rule: 0px
  - typst_ts:
      min_width: 350
      width_step: 50
      source_root: docs/typst
      virtual_root: /docs/typst
      public_root: /typst
```

如果启用 instant navigation，则在 theme features 中加入：

```yaml
theme:
  features:
    - navigation.instant
```

此项属于小幅配置修改，目的是支持站内切页时复用 Typst runtime。

## 详细实施步骤

### 第 1 步：建立插件骨架

目标：

- 新增 `mkdocs_typst_ts` 包。
- 新增 MkDocs plugin class。
- 在 `pyproject.toml` 中注册 entry point。
- 在 `mkdocs.yml` 中启用插件。
- 更新 `TYPST_PLUGIN_PROGRESS.md` 记录本步完成情况。

验证：

- 运行 `uv run python -m mkdocs build`。
- 确认插件能被加载。
- 此阶段不改变任何 Markdown 输出。
- 确认博客其他页面构建输出不受影响。

### 第 2 步：注册静态资源

目标：

- 插件自动向 `extra_javascript` 添加 Typst bootstrap 脚本。
- 插件自动向 `extra_css` 添加 Typst 样式。
- 避免用户手动维护多个资源路径。

验证：

- 构建后 HTML 中存在 bootstrap 脚本。
- 无 Typst 页面不会加载重资源。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 3 步：转换 Typst 代码块为占位节点

目标：

- 拦截 ```typst fenced code block。
- 输出 `.typst-block` 占位 DOM。
- 源码安全嵌入 JSON script。

验证：

- 在测试 Markdown 中写一个 Typst 代码块。
- 构建后页面出现占位节点。
- Typst 源码没有被普通代码高亮处理。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 4 步：实现最小 bootstrap 扫描

目标：

- 页面加载后扫描 `.typst-block`。
- 找不到 Typst 块时立即返回。
- 找到 Typst 块时显示临时 loading 状态，但还不加载 compiler。

验证：

- 无 Typst 页面控制台无错误。
- 有 Typst 页面能识别块数量。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 5 步：手动加载 typst.ts runtime

目标：

- 准备 typst.ts 所需 JS/wasm 静态资源。
- 首次发现 Typst 块时初始化 `window.__mkdocsTypstRuntime`。
- 初始化 compiler、renderer 和本地字体。

验证：

- compiler wasm 只请求一次。
- renderer wasm 只请求一次。
- 字体只请求 `docs/fonts/` 中已有文件。
- 不请求 typst.ts 默认字体。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 6 步：渲染固定 Typst 字符串

目标：

- 不使用 Markdown 中的源码，先渲染一个内置固定 Typst 字符串。
- 验证 compiler 到 artifact 再到 renderer 的完整链路。

验证：

- 页面中出现 Typst 渲染结果。
- 编译错误能显示在对应块内。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 7 步：渲染 Markdown 代码块源码

目标：

- 从 `.typst-source` 中读取真实源码。
- 将其映射为 `/docs/typst/main.typ`。
- 编译并渲染到当前块。

验证：

- Markdown 中的 ```typst 内容能正常显示。
- 多个 Typst 块能分别渲染。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 8 步：实现 `./template.typ` import

目标：

- 将 `/docs/typst/...` 虚拟路径映射到 `/typst/...` 静态 URL。
- 支持 `#import "./template.typ"`。
- 对已 fetch 的 template 做 source cache。

验证：

- 新建 `docs/typst/template.typ`。
- Typst 代码块中 `#import "./template.typ"` 能成功编译。
- 同一 template 不重复 fetch。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 9 步：实现 `page_config.json`

目标：

- 为每次编译写入 `/docs/typst/page_config.json`。
- template 可以通过 `json("./page_config.json")` 读取宽度。

验证：

- template 中设置 page width 后，输出宽度随配置变化。
- 不需要作者在每个代码块中手写宽度逻辑。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 10 步：接入 ResizeObserver

目标：

- 监听每个 Typst 块容器宽度。
- 按 `width_step` 量化宽度。
- 宽度档位变化时重新编译或命中缓存重绘。

验证：

- 调整浏览器宽度，Typst 排版随之变化。
- 小幅宽度抖动不会频繁重编译。
- 同一宽度档位不会重复编译。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 11 步：接入 IntersectionObserver

目标：

- 页面中有多个 Typst 块时，只渲染接近视口的块。
- 降低初次进入页面的 CPU 占用。

验证：

- 长文章顶部 Typst 块先渲染。
- 远处 Typst 块滚动接近后再渲染。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 12 步：兼容 MkDocs Material instant navigation

目标：

- 监听 Material 前端导航生命周期。
- 页面切换后重新扫描 `.typst-block`。
- 不重新初始化 `window.__mkdocsTypstRuntime`。

验证：

- 从一个含 Typst 页面跳到另一个含 Typst 页面，compiler 不重新初始化。
- 新页面 Typst 块正常渲染。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 13 步：缓存完善

目标：

- artifact cache 按源码 hash + 宽度档位保存。
- source cache 保存 template 内容。
- runtime 初始化 Promise 共享，避免并发初始化。

验证：

- 多个 Typst 块同时进入视口时不会重复初始化 runtime。
- 回到已访问页面或同宽度重绘时速度明显更快。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 14 步：错误处理

目标：

- 编译错误显示在对应 Typst 块内。
- template fetch 失败时显示具体路径。
- wasm 初始化失败时显示统一错误。
- 错误不影响其他 Typst 块和页面正文。

验证：

- 故意写错 Typst 语法。
- 故意 import 不存在的 template。
- 页面仍可正常阅读。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 15 步：实现可选中文本层

目标：

- 在 Typst 视觉输出之上叠加透明文本层。
- 支持鼠标拖拽选择 Typst 渲染结果中的文本。
- 尽量保证复制结果接近自然文本。
- 不影响视觉渲染、页面滚动、链接点击和其他博客功能。

验证：

- 用户可以用鼠标选择 Typst 输出中的一段文字。
- 复制后文本内容可读。
- 透明文本层不造成明显视觉偏移或遮挡。
- 页面其他正文仍可正常选择。
- 运行 `uv run python -m mkdocs build`。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

### 第 16 步：清理开发占位样式

目标：

- 去除临时调试框。
- 保留轻量 loading 和 error 样式。
- 输出区域与正文视觉风格协调。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

验证：

- Typst 块在文章中自然呈现。
- 无明显开发痕迹。
- 可选中文本层仍可工作。

### 第 17 步：最终构建验证

目标：

- 运行 `uv run python -m mkdocs build`。
- 检查构建输出。
- 手动测试至少一个无 Typst 页面和一个含 Typst 页面。
- 更新 `TYPST_PLUGIN_PROGRESS.md`。

验证清单：

- 无 Typst 页面不加载 compiler/renderer/font。
- 含 Typst 页面首次进入时加载 runtime。
- 站内切换后 runtime 复用。
- `#import "./template.typ"` 对应 `docs/typst/template.typ`。
- 页面宽度变化时 Typst 重新排版。
- Typst 输出中的文字可以被鼠标选择。
- 字体来自 `docs/fonts/`。
- 未加载 typst.ts 默认字体。
- 编译错误显示友好。
- 博客其他既有功能未受影响。

## 风险与边界

### JS 内存无法跨整页刷新保留

如果没有启用 `navigation.instant`，每次站内跳转都会重新加载 HTML，JS 全局对象会消失。这是浏览器页面生命周期限制，不是插件可以单独绕过的问题。

解决方式：

- 启用 `navigation.instant` 以支持站内切页复用 runtime。
- 即使整页刷新，也依赖浏览器缓存避免重复下载 wasm 和字体。

### 数学字体缺失

当前字体集中没有专用 Typst 数学字体。复杂数学内容可能出现缺字或 fallback 不理想。

初始实现不新增字体。若后续确认数学渲染质量不足，再单独评估是否添加数学字体。

### 外部 Typst package

初始实现不支持 `@preview/...` 自动下载。原因是它会引入额外网络请求，违背少加载资源的要求。

如果未来需要支持，应通过显式配置开启，而不是默认开启。

### template 缓存失效

生产环境中浏览器可能缓存 template 文件。开发阶段如果 template 更新后页面未刷新，可能看到旧内容。

后续可以考虑：

- 开发模式禁用 template cache。
- 将构建 hash 或版本号加入 template URL。
- 将 template 内容 hash 纳入 artifact cache key。

## 完成标准

插件完成后，应达到以下状态：

- 作者只需写 ```typst 代码块即可渲染 Typst。
- 作者可以用 `#import "./template.typ"` 引入 `docs/typst/template.typ`。
- 含 Typst 页面能根据正文宽度动态排版。
- 无 Typst 页面不会加载 Typst 重资源。
- 首次加载 Typst runtime 后，站内无刷新导航复用同一个 compiler、renderer 和字体状态。
- 字体只来自博客已有 `docs/fonts/`。
- 插件通过 MkDocs plugin 注册，不大幅修改博客主体代码。
- 构建流程仍然可以通过 `mkdocs build` 完成。
- 构建验证使用 `uv run python -m mkdocs build`。
- 根目录 `TYPST_PLUGIN_PROGRESS.md` 持续记录了每一步施工进度和验证结果。
