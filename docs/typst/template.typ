#let page-config = json("./page_config.json")

#set text(font: ("IBM Plex Sans", "LXGW WenKai", "New Computer Modern Math"), size: 16pt)

#let imported-banner(body) = {
  block(
    fill: rgb("#edf7ee"),
    stroke: rgb("#75a878"),
    inset: 8pt,
    radius: 3pt,
    width: 100%,
    [
      #body

      Template sees width: #page-config.width pt.
    ],
  )
}
