window.MathJax = {
  loader: {
    load: ["[tex]/color", "[tex]/physics"]
  },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
    packages: { "[+]": ["color", "physics"] },
    processEscapes: true,
    processEnvironments: true
  },
  chtml: {
    mtextInheritFont: true,
    unknownFamily: '"LXGW WenKai Local", "LXGW WenKai", sans-serif'
  },
  options: {
    ignoreHtmlClass: ".*|",
    processHtmlClass: "arithmatex"
  }
};
