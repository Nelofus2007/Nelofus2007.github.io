"""MkDocs plugin that installs theorem-style Markdown environments."""

from __future__ import annotations

from typing import Any

from mkdocs.config import config_options
from mkdocs.plugins import BasePlugin

from .extension import EnvironmentSpec, TheoremExtension


DEFAULT_ENVIRONMENTS: dict[str, dict[str, Any]] = {
    "theorem": {
        "label": "Theorem",
        "style": "plain",
        "color": "purple",
        "numbered": True,
    },
    "proposition": {
        "label": "Proposition",
        "style": "plain",
        "color": "purple",
        "numbered": True,
    },
    "corollary": {
        "label": "Corollary",
        "style": "plain",
        "color": "blue",
        "numbered": True,
    },
    "lemma": {
        "label": "Lemma",
        "style": "plain",
        "color": "blue",
        "numbered": True,
    },
    "claim": {
        "label": "Claim",
        "style": "plain",
        "color": "blue",
        "numbered": True,
    },
    "definition": {
        "label": "Definition",
        "style": "definition",
        "color": "green",
        "numbered": True,
    },
    "example": {
        "label": "Example",
        "style": "definition",
        "color": "sienna",
        "numbered": True,
    },
    "problem": {
        "label": "Problem",
        "style": "definition",
        "color": "strawberry",
        "numbered": True,
    },
    "exercise": {
        "label": "Exercise",
        "style": "definition",
        "color": "ultramarine",
        "numbered": True,
    },
    "excercise": {
        "label": "Exercise",
        "style": "definition",
        "color": "ultramarine",
        "numbered": True,
    },
    "remark": {
        "label": "Remark",
        "style": "remark",
        "color": "gray",
        "numbered": True,
        "framed": False,
    },
    "note": {
        "label": "Note",
        "style": "note",
        "color": "orange",
        "numbered": True,
        "framed": False,
    },
    "solution": {
        "label": "Solution",
        "style": "solution",
        "color": "gray",
        "numbered": True,
        "framed": False,
        "title_break": True,
        "qed": True,
        "qed_symbol": "□",
    },
    "proof": {
        "label": "Proof",
        "style": "solution",
        "color": "gray",
        "numbered": False,
        "framed": False,
        "title_break": True,
        "title_punct": ".",
        "qed": True,
        "qed_symbol": "□",
    },
}


class TheoremPlugin(BasePlugin):
    """Register theorem environments and their companion stylesheets."""

    config_scheme = (
        ("default_environments", config_options.Type(bool, default=True)),
        ("environments", config_options.Type(dict, default={})),
        ("stylesheet", config_options.Type(str, default="stylesheets/theorem-box.css")),
        ("colorsheet", config_options.Type(str, default="stylesheets/theorem-colors.css")),
        ("left_rule", config_options.Type(str, default="2px")),
        ("right_rule", config_options.Type(str, default="1px")),
        ("top_rule", config_options.Type(str, default="0px")),
        ("bottom_rule", config_options.Type(str, default="0px")),
    )

    def on_config(self, config: Any) -> Any:
        environments = self._load_environments()
        rule_vars = {
            "left": self.config["left_rule"],
            "right": self.config["right_rule"],
            "top": self.config["top_rule"],
            "bottom": self.config["bottom_rule"],
        }
        config["markdown_extensions"].append(
            TheoremExtension(environments=environments, rule_vars=rule_vars)
        )

        for css_path in (self.config["stylesheet"], self.config["colorsheet"]):
            if css_path and css_path not in config["extra_css"]:
                config["extra_css"].append(css_path)
        return config

    def _load_environments(self) -> dict[str, EnvironmentSpec]:
        raw: dict[str, Any] = {}
        if self.config["default_environments"]:
            raw.update({key: value.copy() for key, value in DEFAULT_ENVIRONMENTS.items()})

        for key, value in self.config["environments"].items():
            normalized_key = key.rstrip("*")
            if (
                isinstance(value, dict)
                and isinstance(raw.get(normalized_key), dict)
            ):
                merged_value = raw[normalized_key].copy()
                merged_value.update(value)
                raw[normalized_key] = merged_value
            else:
                raw[normalized_key] = value

        environments: dict[str, EnvironmentSpec] = {}
        for key, value in raw.items():
            if value is None:
                continue
            if isinstance(value, str):
                value = {"label": value}
            if not isinstance(value, dict):
                raise TypeError(f"Environment {key!r} must be a mapping or label string.")

            environments[key.rstrip("*")] = EnvironmentSpec(
                key=key.rstrip("*"),
                label=str(value.get("label", key.rstrip("*").title())),
                style=str(value.get("style", "plain")),
                color=str(value.get("color", "blue")),
                numbered=bool(value.get("numbered", True)),
                framed=bool(value.get("framed", True)),
                title_break=bool(value.get("title_break", True)),
                title_punct=str(value.get("title_punct", "")),
                qed=bool(value.get("qed", False)),
                qed_symbol=str(value.get("qed_symbol", "□")),
            )

        return environments
