"""Markdown extension for lightweight theorem-style blocks."""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
import xml.etree.ElementTree as etree

from markdown import Extension
from markdown.blockprocessors import BlockProcessor
from markdown.util import AtomicString


HEADER_RE = re.compile(r"^:::\s*([A-Za-z][\w-]*\*?)\s*(.*?)\s*$")
CLOSE_RE = re.compile(r"^\s*:::\s*$")
TITLE_RE = re.compile(r'"((?:[^"\\]|\\.)*)"\s*$')
CLASS_SAFE_RE = re.compile(r"[^a-zA-Z0-9_-]+")


@dataclass(frozen=True)
class EnvironmentSpec:
    key: str
    label: str
    style: str = "plain"
    color: str = "blue"
    numbered: bool = True
    framed: bool = True
    title_break: bool = True
    title_punct: str = ""
    qed: bool = False
    qed_symbol: str = "□"


def class_name(value: str) -> str:
    """Return a conservative CSS class suffix."""

    return CLASS_SAFE_RE.sub("-", value.rstrip("*")).strip("-").lower() or "box"


def parse_header(line: str) -> tuple[str, str, str] | None:
    """Parse ``:::kind number "Title"`` into kind, number, title."""

    match = HEADER_RE.match(line)
    if match is None:
        return None

    kind = match.group(1)
    rest = match.group(2).strip()
    number = ""
    title = ""

    title_match = TITLE_RE.search(rest)
    if title_match is not None:
        title = title_match.group(1).replace(r"\"", '"')
        number = rest[: title_match.start()].strip()
    elif rest:
        number = rest

    return kind, number, title


def split_at_close(block: str) -> tuple[str, str, bool]:
    """Split a block at the first closing theorem fence."""

    lines = block.split("\n")
    close_at = next((index for index, line in enumerate(lines) if CLOSE_RE.match(line)), None)
    if close_at is None:
        return block, "", False

    before = "\n".join(lines[:close_at]).strip("\n")
    after = "\n".join(lines[close_at + 1 :]).strip("\n")
    return before, after, True


class TheoremBlockProcessor(BlockProcessor):
    """Parse custom theorem blocks delimited by ``:::`` fences."""

    def __init__(
        self,
        parser: Any,
        environments: dict[str, EnvironmentSpec],
        rule_vars: dict[str, str],
    ):
        super().__init__(parser)
        self.environments = environments
        self.rule_vars = rule_vars

    def test(self, parent: etree.Element, block: str) -> bool:
        first_line = block.split("\n", 1)[0]
        parsed = parse_header(first_line)
        return parsed is not None and parsed[0].rstrip("*") in self.environments

    def run(self, parent: etree.Element, blocks: list[str]) -> None:
        block = blocks.pop(0)
        first_line, _, remainder = block.partition("\n")
        parsed = parse_header(first_line)

        if parsed is None:
            parent.text = (parent.text or "") + block
            return

        raw_kind, number, title = parsed
        kind = raw_kind.rstrip("*")
        starred = raw_kind.endswith("*")
        spec = self.environments[kind]

        body_blocks: list[str] = []
        closed = False

        if remainder:
            before, after, closed = split_at_close(remainder)
            if before:
                body_blocks.append(before)
            if after:
                blocks.insert(0, after)

        while not closed and blocks:
            current = blocks.pop(0)
            before, after, closed = split_at_close(current)

            if before:
                body_blocks.append(before)
            if after:
                blocks.insert(0, after)
            if closed:
                break

        if not closed:
            body_blocks.append("")

        self._render(parent, spec, kind, starred, number, title, body_blocks)

    def _render(
        self,
        parent: etree.Element,
        spec: EnvironmentSpec,
        kind: str,
        starred: bool,
        number: str,
        title: str,
        body_blocks: list[str],
    ) -> None:
        classes = [
            "thm-box",
            f"thm-kind-{class_name(kind)}",
            f"thm-style-{class_name(spec.style)}",
            f"thm-color-{class_name(spec.color)}",
            "thm-framed" if spec.framed else "thm-frameless",
            "thm-title-break" if spec.title_break else "thm-title-inline",
        ]
        if starred:
            classes.append("thm-starred")
        if spec.qed:
            classes.append("thm-has-qed")

        section = etree.SubElement(parent, "section")
        section.set("class", " ".join(classes))
        section.set(
            "style",
            ";".join(f"--thm-{name}-rule:{value}" for name, value in self.rule_vars.items()),
        )

        title_el = etree.SubElement(section, "div")
        title_el.set("class", "thm-title")

        label_el = etree.SubElement(title_el, "span")
        label_el.set("class", "thm-label")
        label_el.text = spec.label

        if spec.numbered and not starred and number:
            number_el = etree.SubElement(title_el, "span")
            number_el.set("class", "thm-number")
            number_el.text = number

        if title:
            name_el = etree.SubElement(title_el, "span")
            name_el.set("class", "thm-name")
            name_el.text = title

        if spec.title_punct:
            punct_el = etree.SubElement(title_el, "span")
            punct_el.set("class", "thm-punct")
            punct_el.text = spec.title_punct

        body_el = etree.SubElement(section, "div")
        body_el.set("class", "thm-body")
        self.parser.parseBlocks(body_el, body_blocks)

        if spec.qed and spec.qed_symbol:
            qed_el = etree.SubElement(section, "span")
            qed_el.set("class", "thm-qed")
            qed_el.text = AtomicString(spec.qed_symbol)


class TheoremExtension(Extension):
    """Register theorem block parsing with Python-Markdown."""

    def __init__(self, **kwargs: Any):
        self.config = {
            "environments": [{}, "Registered theorem environments"],
            "rule_vars": [{}, "Per-box border rule CSS variables"],
        }
        super().__init__(**kwargs)

    def extendMarkdown(self, md: Any) -> None:
        md.parser.blockprocessors.register(
            TheoremBlockProcessor(
                md.parser,
                self.getConfig("environments"),
                self.getConfig("rule_vars"),
            ),
            "theorem_envs",
            175,
        )
