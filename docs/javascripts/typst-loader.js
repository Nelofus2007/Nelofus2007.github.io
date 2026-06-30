(function () {
  "use strict";

  var DEFAULT_MIN_WIDTH = 350;
  var DEFAULT_WIDTH_STEP = 50;
  var RESIZE_DEBOUNCE_MS = 150;
  var INTERSECTION_ROOT_MARGIN = "200px";

  var scriptUrl = document.currentScript ? document.currentScript.src : document.baseURI;
  var runtimeBaseUrl = new URL("typst-runtime/", scriptUrl);

  function runtimeUrl(path) {
    return new URL(path, runtimeBaseUrl).href;
  }

  function fontUrl(path) {
    return new URL("../fonts/" + path, scriptUrl).href;
  }

  function typstPublicUrl(path) {
    if (!path.startsWith("/docs/typst/")) {
      return null;
    }
    var relativePath = path.slice("/docs/typst/".length);
    return new URL("../typst/" + relativePath, scriptUrl).href;
  }

  function makeTypstAccessModel(runtime) {
    var encoder = new TextEncoder();
    var cache = runtime.sourceCache;
    var memoryData = runtime.memorySourceCache || (runtime.memorySourceCache = new Map());
    var memoryTimes = runtime.memorySourceTimes || (runtime.memorySourceTimes = new Map());
    if (!runtime.failedFetches) {
      runtime.failedFetches = new Set();
    }

    function fetchBytes(path) {
      if (cache.has(path)) {
        return cache.get(path);
      }

      var url = typstPublicUrl(path);
      if (!url) {
        runtime.failedFetches.add(path);
        return undefined;
      }

      var request = new XMLHttpRequest();
      request.overrideMimeType("text/plain; charset=utf-8");
      request.open("GET", url, false);
      try {
        request.send(null);
      } catch (networkErr) {
        runtime.failedFetches.add(path);
        return undefined;
      }

      if (request.status !== 200) {
        runtime.failedFetches.add(path);
        return undefined;
      }

      var bytes = encoder.encode(request.responseText);
      cache.set(path, bytes);
      return bytes;
    }

    return {
      insertFile: function (path, data, mtime) {
        memoryData.set(path, data);
        memoryTimes.set(path, mtime);
      },
      removeFile: function (path) {
        memoryData.delete(path);
        memoryTimes.delete(path);
      },
      getMTime: function (path) {
        if (path.startsWith("/@memory/")) {
          return memoryTimes.get(path);
        }
        if (!typstPublicUrl(path)) {
          return undefined;
        }
        return new Date(0);
      },
      isFile: function (path) {
        if (path.startsWith("/@memory/")) {
          return memoryData.has(path);
        }
        return !!typstPublicUrl(path);
      },
      getRealPath: function (path) {
        return path;
      },
      readAll: function (path) {
        if (path.startsWith("/@memory/")) {
          return memoryData.get(path);
        }
        return fetchBytes(path);
      }
    };
  }

  function getBlockSource(block) {
    var sourceNode = block.querySelector(".typst-source");
    if (!sourceNode) {
      throw new Error("Typst source node is missing.");
    }
    var payload = JSON.parse(sourceNode.textContent || "{}");
    if (typeof payload.source !== "string") {
      throw new Error("Typst source payload is invalid.");
    }
    return payload.source;
  }

  function getBlockId(block) {
    return block.getAttribute("data-typst-id") || Math.random().toString(36).slice(2);
  }

  function getBlockConfig(block) {
    var minWidthAttr = block.getAttribute("data-typst-min-width");
    var stepAttr = block.getAttribute("data-typst-width-step");
    var minWidth = minWidthAttr ? parseInt(minWidthAttr, 10) : DEFAULT_MIN_WIDTH;
    var widthStep = stepAttr ? parseInt(stepAttr, 10) : DEFAULT_WIDTH_STEP;
    if (!isFinite(minWidth) || minWidth <= 0) {
      minWidth = DEFAULT_MIN_WIDTH;
    }
    if (!isFinite(widthStep) || widthStep <= 0) {
      widthStep = DEFAULT_WIDTH_STEP;
    }
    return { minWidth: minWidth, widthStep: widthStep };
  }

  function renderPathForBlock(block) {
    return "/docs/typst/block-" + getBlockId(block) + ".typ";
  }

  function hashSource(source) {
    // FNV-1a 32-bit, enough for cache bucketing
    var h = 0x811c9dc5;
    for (var i = 0; i < source.length; i++) {
      h ^= source.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16);
  }

  function quantizeWidth(rawWidth, minWidth, widthStep) {
    var width = Math.max(0, Math.floor(rawWidth || 0));
    if (width <= minWidth) {
      return minWidth;
    }
    var bucketed = Math.floor((width - minWidth) / widthStep) * widthStep + minWidth;
    return bucketed;
  }

  function ensureRuntime() {
    if (!window.__mkdocsTypstRuntime) {
      window.__mkdocsTypstRuntime = {
        ready: false,
        loading: null,
        compiler: null,
        renderer: null,
        sourceCache: new Map(),
        artifactCache: new Map(),
        trackedBlocks: []
      };
    }

    var runtime = window.__mkdocsTypstRuntime;
    if (runtime.loading) {
      return runtime.loading;
    }

    runtime.loading = (async function () {
      var compilerModule = await import(runtimeUrl("esm/compiler.mjs"));
      var rendererModule = await import(runtimeUrl("esm/renderer.mjs"));
      var optionsModule = await import(runtimeUrl("esm/options.init.mjs"));
      var packageModule = await import(runtimeUrl("esm/fs/package.mjs"));
      var accessModel = makeTypstAccessModel(runtime);
      var packageRegistry = new packageModule.FetchPackageRegistry(accessModel);
      var compiler = compilerModule.createTypstCompiler();
      await compiler.init({
        getWrapper: function () {
          return import(runtimeUrl("pkg/compiler-shim.mjs"));
        },
        getModule: function () {
          return runtimeUrl("pkg/typst_ts_web_compiler_bg.wasm");
        },
        beforeBuild: [
          optionsModule.preloadRemoteFonts([
            fontUrl("IBMPlexSans-Regular.ttf"),
            fontUrl("IBMPlexSans-Italic.ttf"),
            fontUrl("IBMPlexSans-Bold.ttf"),
            fontUrl("IBMPlexSans-BoldItalic.ttf"),
            fontUrl("Literata-Regular.ttf"),
            fontUrl("Literata-Italic.ttf"),
            fontUrl("Literata-Bold.ttf"),
            fontUrl("Literata-BoldItalic.ttf"),
            fontUrl("LXGWWenKai-Regular.ttf"),
            fontUrl("LXGWWenKai-Medium.ttf"),
            fontUrl("NewCMMath-Regular.otf"),
            fontUrl("Cascadia-Code-Regular.ttf")
          ]),
          optionsModule.disableDefaultFontAssets(),
          optionsModule.withPackageRegistry(packageRegistry),
          optionsModule.withAccessModel(accessModel)
        ]
      });

      var renderer = rendererModule.createTypstRenderer();
      await renderer.init({
        getWrapper: function () {
          return import(runtimeUrl("pkg/renderer-shim.mjs"));
        },
        getModule: function () {
          return runtimeUrl("pkg/typst_ts_renderer_bg.wasm");
        }
      });

      runtime.compiler = compiler;
      runtime.compilerModule = compilerModule;
      runtime.renderer = renderer;
      runtime.accessModel = accessModel;
      runtime.ready = true;
      return runtime;
    })();

    return runtime.loading;
  }

  function setStatus(block, message, state) {
    block.setAttribute("data-typst-state", state);
    var output = block.querySelector(".typst-output");
    if (!output) {
      return;
    }
    var status = output.querySelector(".typst-status");
    if (!status) {
      status = document.createElement("span");
      status.className = "typst-status";
      output.appendChild(status);
    }
    status.textContent = message;
  }

  function clearOutput(block) {
    var output = block.querySelector(".typst-output");
    if (!output) {
      throw new Error("Typst output node is missing.");
    }
    output.innerHTML = "";
    return output;
  }

  function artifactCacheKey(source, widthStep) {
    return hashSource(source) + ":" + widthStep;
  }

  // FNV-1a over a Uint8Array. Used to fingerprint already-fetched Typst
  // template bytes so an artifact cache entry can be invalidated if the
  // same source+width is re-rendered after a template was (re)loaded.
  function hashBytes(bytes) {
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i += 1) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16);
  }

  function templateFingerprint(runtime) {
    // Build a stable fingerprint from every Typst source currently cached
    // under /docs/typst/ except the per-block main files and page_config.
    // Templates are loaded into sourceCache by the access model on demand;
    // since the cache never auto-evicts within a session, the fingerprint
    // is monotonic: it only grows when a new template path is loaded, and
    // it does not change once a given template is in memory.
    var keys = Array.from(runtime.sourceCache.keys())
      .filter(function (k) {
        return k.indexOf("/docs/typst/") === 0
          && k.indexOf("/docs/typst/block-") !== 0
          && k !== "/docs/typst/page_config.json";
      })
      .sort();
    if (keys.length === 0) {
      return "0";
    }
    var acc = 0x811c9dc5;
    for (var i = 0; i < keys.length; i += 1) {
      var bytes = runtime.sourceCache.get(keys[i]);
      for (var j = 0; j < bytes.length; j += 1) {
        acc ^= bytes[j];
        acc = Math.imul(acc, 0x01000193) >>> 0;
      }
      // fold the path length in so reusing a cached blob at a new path is noticed
      acc ^= keys[i].length & 0xff;
      acc = Math.imul(acc, 0x01000193) >>> 0;
    }
    return keys.length + ":" + (acc >>> 0).toString(16);
  }

  function withDefaultTypstPrelude(source) {
    return [
      '#set page(width: json("./page_config.json").width * 1pt, height: auto, margin: (x: 0pt, y: 4pt))',
      source
    ].join("\n\n");
  }

  async function compileArtifact(runtime, mainFilePath, source, widthStep) {
    runtime.compiler.addSource(mainFilePath, source);
    runtime.compiler.mapShadow(
      "/docs/typst/page_config.json",
      new TextEncoder().encode(JSON.stringify({ width: widthStep }))
    );
    var options = { mainFilePath: mainFilePath };
    if (runtime.compilerModule && runtime.compilerModule.CompileFormatEnum) {
      options.format = runtime.compilerModule.CompileFormatEnum.vector;
    }
    return normalizeCompileArtifact(await runtime.compiler.compile(options));
  }

  function normalizeCompileArtifact(result) {
    if (result instanceof Uint8Array) {
      return result;
    }
    if (result && result.result instanceof Uint8Array) {
      return result.result;
    }
    if (result && result.result && result.result.buffer instanceof ArrayBuffer) {
      return new Uint8Array(result.result);
    }
    if (result && result.diagnostics && result.diagnostics.length) {
      throw new Error(JSON.stringify(result.diagnostics));
    }
    throw new Error("Typst compiler did not return a vector artifact.");
  }

  // typst.ts compiler.compile throws a Rust-debug stringified
  // Vec<SourceDiagnostic> on error. Extract the human-readable messages and
  // hints; on missing imports, append the actual file path that failed to
  // load (compiler only says "failed to load file (access denied)").
  function formatCompileError(err, runtime) {
    var raw = "";
    if (typeof err === "string") {
      raw = err;
    } else if (err && typeof err.message === "string") {
      raw = err.message;
    } else {
      raw = String(err);
    }

    // typst.ts 0.7.0 compiler.compile returns failures as a JSON array of
    // diagnostics: [{"message": "...", "hints": [...], "path":..., "range":...}, ...].
    // Try that first; fall back to the legacy Rust debug-string parsing.
    var diags = null;
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        diags = parsed;
      }
    } catch (e) { /* not JSON, fall through */ }
    if (diags) {
      var lines = [];
      for (var i = 0; i < diags.length; i += 1) {
        var d = diags[i];
        var loc = d.path && d.range
          ? d.path + ":" + d.range
          : (d.path || "");
        var head = loc ? "[" + loc + "] " : "";
        lines.push(head + (d.message || ""));
        if (Array.isArray(d.hints) && d.hints.length) {
          lines.push("hint: " + d.hints.join(" / "));
        }
      }
      if (runtime && runtime.failedFetches && runtime.failedFetches.size) {
        var fails = Array.from(runtime.failedFetches).slice(0, 4);
        lines.push("failed to load: " + fails.join(", "));
      }
      return lines.join("\n");
    }

    var messages = [];
    var messageRe = /message:\s*"((?:[^"\\]|\\.)*)"/g;
    var hintRe = /hints:\s*\[([^\]]*)\]/g;
    var m;
    while ((m = messageRe.exec(raw)) !== null) {
      messages.push(unescapeTypstString(m[1]));
    }
    var hints = [];
    while ((m = hintRe.exec(raw)) !== null) {
      var inner = m[1].match(/"((?:[^"\\]|\\.)*)"/g);
      if (inner) {
        for (var i = 0; i < inner.length; i += 1) {
          hints.push(unescapeTypstString(inner[i].slice(1, -1)));
        }
      }
    }

    var lines = [];
    if (messages.length === 0) {
      lines.push(raw.slice(0, 240));
    } else {
      lines.push(messages.join("; "));
    }
    if (hints.length) {
      lines.push("hint: " + hints.join(" / "));
    }
    if (runtime && runtime.failedFetches && runtime.failedFetches.size) {
      var fails = Array.from(runtime.failedFetches).slice(0, 4);
      lines.push("failed to load: " + fails.join(", "));
    }
    return lines.join("\n");
  }

  function unescapeTypstString(s) {
    return s
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  async function renderBlockCore(block, source, widthStep) {
    var runtime;
    var phase = "runtime";
    try {
      runtime = await ensureRuntime();
      phase = "compile";
      var compileSource = withDefaultTypstPrelude(source);
      var cacheKey = artifactCacheKey(compileSource, widthStep);
      var currentFingerprint = templateFingerprint(runtime);
      var output = clearOutput(block);

      var entry = runtime.artifactCache.get(cacheKey);
      var artifact;

      if (entry && typeof entry.then === "function") {
        setStatus(block, "Rendering Typst at " + widthStep + "px...", "rendering");
        var awaited = await entry;
        if (awaited && awaited.artifact) {
          artifact = awaited.artifact;
        } else {
          entry = null;
        }
      } else if (entry && entry.fingerprint === currentFingerprint) {
        artifact = entry.artifact;
      }

      if (!artifact) {
        setStatus(block, "Rendering Typst at " + widthStep + "px...", "rendering");
        var mainFilePath = renderPathForBlock(block);
        var compilePromise = compileArtifact(runtime, mainFilePath, compileSource, widthStep)
          .then(function (a) {
            var fp = templateFingerprint(runtime);
            runtime.artifactCache.set(cacheKey, { artifact: a, fingerprint: fp });
            runtime.stats = runtime.stats || { compiles: 0, cacheHits: 0 };
            runtime.stats.compiles += 1;
            return { artifact: a, fingerprint: fp };
          })
          .catch(function (e) {
            if (runtime.artifactCache.get(cacheKey) === compilePromise) {
              runtime.artifactCache.delete(cacheKey);
            }
            var err = new Error("Typst compile failed:\n" + formatCompileError(e, runtime));
            err.phase = "compile";
            throw err;
          });
        runtime.artifactCache.set(cacheKey, compilePromise);
        var result = await compilePromise;
        artifact = result.artifact;
      } else {
        runtime.stats = runtime.stats || { compiles: 0, cacheHits: 0 };
        runtime.stats.cacheHits += 1;
      }

      phase = "render";
      // Use renderSvg (returns a string) rather than renderToSvg (in-place)
      // so we can control the container's innerHTML ourselves: on success we
      // inject the SVG, on failure we leave the container empty and let the
      // caller surface the error. This avoids leaving a partial SVG in the
      // DOM if the renderer wasm panics mid-generation.
      var svgString = await runtime.renderer.renderSvg({
        artifactContent: artifact
      });
      if (svgString) {
        output.innerHTML = svgString;
      } else {
        throw new Error("Typst renderer returned empty SVG.");
      }
    } catch (error) {
      if (!error.phase) {
        error.phase = phase;
      }
      throw error;
    }
  }

  function measureBlockWidth(block) {
    var rect = block.getBoundingClientRect();
    var width = rect && rect.width ? rect.width : block.clientWidth || 0;
    return width;
  }

  function startResizeObserver(block, source) {
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    var cfg = getBlockConfig(block);
    var timerId = null;

    var observer = new ResizeObserver(function (entries) {
      var entry = entries[entries.length - 1];
      var rawWidth = entry && entry.contentRect ? entry.contentRect.width : measureBlockWidth(block);
      var newStep = quantizeWidth(rawWidth, cfg.minWidth, cfg.widthStep);
      if (newStep === block.__typstCurrentStep) {
        return;
      }
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(function () {
        timerId = null;
        rerenderAtStep(block, source, newStep);
      }, RESIZE_DEBOUNCE_MS);
    });

    observer.observe(block);
    block.__typstResizeObserver = observer;
  }

  function formatBlockError(error) {
    var phase = error && error.phase ? error.phase : "render";
    var msg = error && typeof error.message === "string" ? error.message : String(error);
    if (phase === "runtime") {
      return "Typst runtime failed to load: " + msg;
    }
    if (phase === "compile") {
      return msg;
    }
    return "Typst render failed: " + msg;
  }

  function rerenderAtStep(block, source, newStep) {
    block.__typstCurrentStep = newStep;
    renderBlockCore(block, source, newStep)
      .then(function () {
        block.setAttribute("data-typst-state", "rendered");
      })
      .catch(function (error) {
        setStatus(block, formatBlockError(error), "error");
        console.error(error);
      });
  }

  async function renderBlockOnViewport(block, source) {
    if (block.__typstRenderStarted) {
      return;
    }
    block.__typstRenderStarted = true;

    var cfg = getBlockConfig(block);
    var initialStep = quantizeWidth(measureBlockWidth(block), cfg.minWidth, cfg.widthStep);
    block.__typstCurrentStep = initialStep;

    setStatus(block, "Rendering Typst at " + initialStep + "px...", "rendering");
    try {
      await renderBlockCore(block, source, initialStep);
      block.setAttribute("data-typst-state", "rendered");
      startResizeObserver(block, source);
    } catch (error) {
      setStatus(block, formatBlockError(error), "error");
      console.error(error);
    }
  }

  function observeBlockForRender(block, source) {
    if (typeof IntersectionObserver === "undefined") {
      renderBlockOnViewport(block, source);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i += 1) {
          if (entries[i].isIntersecting) {
            renderBlockOnViewport(block, source);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: INTERSECTION_ROOT_MARGIN }
    );
    observer.observe(block);
    block.__typstIntersectionObserver = observer;
  }

  function registerBlocks(blocks) {
    blocks.forEach(function (block, index) {
      if (block.__typstRegistered) {
        return;
      }
      try {
        block.__typstRegistered = true;
        var source = getBlockSource(block);
        block.__typstSource = source;
        setStatus(block, "Typst block waiting for viewport.", "pending-viewport");
        observeBlockForRender(block, source);
      } catch (err) {
        console.error("Typst: failed to register block " + index, err);
        try { setStatus(block, "Typst block setup failed: " + err.message, "error"); } catch (e2) {}
      }
    });
  }

  function cleanupDetachedBlocks() {
    // Material instant navigation replaces the main content. Old Typst blocks
    // are removed from the DOM, but their observers may still hold references.
    // Disconnect them so the runtime does not accumulate stale listeners.
    var visited = new Set();
    document.querySelectorAll(".typst-block[data-typst-scanned]").forEach(function (b) {
      visited.add(b);
    });

    var runtime = window.__mkdocsTypstRuntime;
    if (!runtime || !runtime.trackedBlocks) {
      return;
    }

    runtime.trackedBlocks.forEach(function (block) {
      if (!visited.has(block) || !document.body.contains(block)) {
        if (block.__typstIntersectionObserver) {
          block.__typstIntersectionObserver.disconnect();
          block.__typstIntersectionObserver = null;
        }
        if (block.__typstResizeObserver) {
          block.__typstResizeObserver.disconnect();
          block.__typstResizeObserver = null;
        }
      }
    });
    runtime.trackedBlocks = Array.from(visited);
  }

  function scanTypstBlocks() {
    cleanupDetachedBlocks();

    var blocks = document.querySelectorAll(".typst-block:not([data-typst-scanned])");
    if (!blocks.length) {
      return;
    }

    var runtime = window.__mkdocsTypstRuntime || (window.__mkdocsTypstRuntime = {
      ready: false,
      loading: null,
      compiler: null,
      renderer: null,
      sourceCache: new Map(),
      artifactCache: new Map(),
      trackedBlocks: []
    });
    if (!runtime.trackedBlocks) {
      runtime.trackedBlocks = [];
    }

    blocks.forEach(function (block) {
      block.setAttribute("data-typst-scanned", "true");
      runtime.trackedBlocks.push(block);
    });

    // Runtime is loaded lazily by the first block that actually enters the
    // viewport, so a page whose Typst blocks are all far below the fold does
    // not pay the typst.ts init cost until something scrolls near.
    registerBlocks(Array.prototype.slice.call(blocks));
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(scanTypstBlocks);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanTypstBlocks);
  } else {
    scanTypstBlocks();
  }
})();
