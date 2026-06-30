"""MkDocs plugin that installs lazy typst.ts rendering hooks."""

from __future__ import annotations

from typing import Any

from mkdocs.config import config_options
from mkdocs.plugins import BasePlugin

from .extension import TypstExtension


class TypstPlugin(BasePlugin):
    """Register Typst Markdown handling and lightweight static assets."""

    config_scheme = (
        ("javascript", config_options.Type(str, default="javascripts/typst-loader.js")),
        ("stylesheet", config_options.Type(str, default="stylesheets/typst.css")),
        ("min_width", config_options.Type(int, default=350)),
        ("width_step", config_options.Type(int, default=50)),
        ("source_root", config_options.Type(str, default="docs/typst")),
        ("virtual_root", config_options.Type(str, default="/docs/typst")),
        ("public_root", config_options.Type(str, default="/typst")),
    )

    def on_config(self, config: Any) -> Any:
        config["markdown_extensions"].append(
            TypstExtension(plugin_config=dict(self.config))
        )

        javascript = self.config["javascript"]
        if javascript and javascript not in config["extra_javascript"]:
            config["extra_javascript"].append(javascript)

        stylesheet = self.config["stylesheet"]
        if stylesheet and stylesheet not in config["extra_css"]:
            config["extra_css"].append(stylesheet)

        return config

