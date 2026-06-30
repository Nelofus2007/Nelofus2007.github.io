"""Markdown extension that turns Typst fences into lazy render placeholders."""

from __future__ import annotations

import json
import re
from typing import Any

from markdown import Extension
from markdown.preprocessors import Preprocessor


OPEN_RE = re.compile(r"^([`~]{3,})\s*typst\s*$")


def closing_re(fence: str) -> re.Pattern[str]:
    marker = re.escape(fence[0])
    return re.compile(rf"^{marker}{{{len(fence)},}}\s*$")


def safe_json_script(value: dict[str, Any]) -> str:
    """Encode JSON so it is safe inside a script tag."""

    return json.dumps(value, ensure_ascii=False).replace("</", "<\\/")


class TypstFencePreprocessor(Preprocessor):
    """Replace ```typst fences before code highlighting extensions see them."""

    def __init__(self, md: Any, plugin_config: dict | None = None) -> None:
        super().__init__(md)
        self.plugin_config = plugin_config or {}

    def run(self, lines: list[str]) -> list[str]:
        output: list[str] = []
        index = 0
        block_index = 0

        min_width = self.plugin_config.get("min_width", 350)
        width_step = self.plugin_config.get("width_step", 50)

        while index < len(lines):
            line = lines[index]
            match = OPEN_RE.match(line)
            if match is None:
                output.append(line)
                index += 1
                continue

            fence = match.group(1)
            close_re = closing_re(fence)
            source_lines: list[str] = []
            index += 1

            while index < len(lines):
                if close_re.match(lines[index]):
                    index += 1
                    break
                source_lines.append(lines[index])
                index += 1

            block_index += 1
            source = "\n".join(source_lines)
            payload = safe_json_script({"source": source})
            html = (
                f'<div class="typst-block" data-typst-id="{block_index}"'
                f' data-typst-min-width="{min_width}"'
                f' data-typst-width-step="{width_step}">'
                f'<div class="typst-source" hidden>{payload}</div>'
                '<div class="typst-output" aria-hidden="true"></div>'
                "</div>"
            )
            output.extend(["", html, ""])

        return output


class TypstExtension(Extension):
    """Register Typst fenced code block handling."""

    def __init__(self, plugin_config: dict | None = None, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.plugin_config = plugin_config or {}

    def extendMarkdown(self, md: Any) -> None:
        md.preprocessors.register(
            TypstFencePreprocessor(md, self.plugin_config),
            "typst_fences",
            35,
        )
