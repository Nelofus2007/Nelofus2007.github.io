// Typst counterpart of the theorem/proof part in note-setup-leftsidebox.tex.

#let setup(body) = {
  set text(font: ("IBM Plex Sans", "LXGW WenKai", "New Computer Modern Math"), size: 16pt)
  body
}

#let royal-purple = rgb("#7851a9")
#let navy-blue = rgb("#1f4e8c")
#let sky-blue = rgb("#87ceeb")
#let ultramarine = rgb("#3f37c9")
#let forest-green = rgb("#228b22")
#let raw-sienna = rgb("#96522d")
#let wild-strawberry = rgb("#ff43a4")
#let note-orange = rgb("#cc7a00")

#let purple-title = rgb("#5f3f8c")
#let blue-title = rgb("#1f5faa")
#let ultramarine-title = rgb("#312aa6")
#let green-title = rgb("#1d731d")
#let sienna-title = rgb("#7b492e")
#let strawberry-title = rgb("#b54268")
#let orange-title = rgb("#c07716")

#let _is-empty(value) = value == none or value == ""

#let _show(value) = {
  if value == none {
    []
  } else {
    value
  }
}

#let _inside-body(body) = {
  set enum(numbering: "i)")
  body
}

#let _env-args(args) = {
  let pos = args.pos()
  let named = args.named()

  let body = named.at(
    "body",
    default: if pos.len() > 0 { pos.at(pos.len() - 1) } else { [] },
  )
  let positional-number = if pos.len() >= 2 { pos.at(0) } else { none }
  let positional-title = if pos.len() >= 3 { pos.at(1) } else { none }

  (
    number: named.at("number", default: positional-number),
    title: named.at("title", default: positional-title),
    body: body,
  )
}

#let _proof-args(args) = {
  let pos = args.pos()
  let named = args.named()

  let body = named.at(
    "body",
    default: if pos.len() > 0 { pos.at(pos.len() - 1) } else { [] },
  )
  let positional-title = if pos.len() >= 2 { pos.at(0) } else { [Proof] }

  (
    title: named.at("title", default: positional-title),
    qed: named.at("qed", default: $square$),
    body: body,
  )
}

#let _heading(kind, number: none, title: none) = {
  let has-number = not _is-empty(number)
  let has-title = not _is-empty(title)

  [
    #kind#if has-number [ #_show(number)]#if has-title [ (#_show(title))]
  ]
}

#let _styled-heading(kind, number: none, title: none, style: "bold", fill: none) = {
  let head = _heading(kind, number: number, title: title)

  if style == "italic" {
    emph(head)
  } else if fill != none {
    text(fill: fill, weight: "bold", head)
  } else {
    strong(head)
  }
}

#let leftsidebox(
  kind,
  number: none,
  title: none,
  frame: sky-blue,
  title-fill: none,
  fill: rgb("#f3fbfe"),
  radius: 0pt,
  body,
) = {
  v(3pt, weak: true)
  block(
    width: 100%,
    breakable: true,
    fill: fill,
    stroke: (
      left: 2pt + frame,
      right: 1pt + frame,
      top: none,
      bottom: none,
    ),
    radius: radius,
    inset: (x: 20pt, y: 11pt),
  )[
    #_styled-heading(kind, number: number, title: title, fill: title-fill)
    #v(0.35em)
    #_inside-body(body)
  ]
  v(3pt, weak: true)
}

#let theorem(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Theorem",
    number: a.number,
    title: a.title,
    frame: royal-purple,
    title-fill: purple-title,
    fill: rgb("#f7f3fb"),
    a.body,
  )
}

#let proposition(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Proposition",
    number: a.number,
    title: a.title,
    frame: royal-purple,
    title-fill: purple-title,
    fill: rgb("#f7f3fb"),
    a.body,
  )
}

#let corollary(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Corollary",
    number: a.number,
    title: a.title,
    frame: navy-blue,
    title-fill: blue-title,
    fill: rgb("#f3fbfe"),
    a.body,
  )
}

#let lemma(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Lemma",
    number: a.number,
    title: a.title,
    frame: navy-blue,
    title-fill: blue-title,
    fill: rgb("#f3fbfe"),
    a.body,
  )
}

#let claim(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Claim",
    number: a.number,
    title: a.title,
    frame: navy-blue,
    title-fill: blue-title,
    fill: rgb("#f3fbfe"),
    a.body,
  )
}

#let definition(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Definition",
    number: a.number,
    title: a.title,
    frame: forest-green,
    title-fill: green-title,
    fill: rgb("#f3faf3"),
    a.body,
  )
}

#let example(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Example",
    number: a.number,
    title: a.title,
    frame: raw-sienna,
    title-fill: sienna-title,
    fill: rgb("#faf6f4"),
    a.body,
  )
}

#let problem(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Problem",
    number: a.number,
    title: a.title,
    frame: wild-strawberry,
    title-fill: strawberry-title,
    fill: rgb("#fff5fb"),
    a.body,
  )
}

#let exercise(..args) = {
  let a = _env-args(args)
  leftsidebox(
    "Exercise",
    number: a.number,
    title: a.title,
    frame: ultramarine,
    title-fill: ultramarine-title,
    fill: rgb("#f5f4ff"),
    a.body,
  )
}

#let excercise = exercise

#let cbox(body, frame: sky-blue, fill: rgb("#f3fbfe")) = {
  v(3pt, weak: true)
  block(
    width: 100%,
    breakable: true,
    fill: fill,
    stroke: (
      left: 2pt + frame,
      right: 1pt + frame,
      top: none,
      bottom: none,
    ),
    radius: 0pt,
    inset: (x: 14pt, y: 9pt),
  )[
    #_inside-body(body)
  ]
  v(3pt, weak: true)
}

#let _plain-env(
  kind,
  number: none,
  title: none,
  style: "bold",
  fill: none,
  qed: none,
  body,
) = {
  v(3pt, weak: true)
  block(width: 100%, breakable: true)[
    #_styled-heading(kind, number: number, title: title, style: style, fill: fill)
    #v(0.35em)
    #_inside-body(body)#if qed != none [#box(width: 0pt)#h(1fr)#sym.wj#sym.space.nobreak#qed]
  ]
  v(3pt, weak: true)
}

#let remark(..args) = {
  let a = _env-args(args)
  _plain-env(
    "Remark",
    number: a.number,
    title: a.title,
    style: "italic",
    a.body,
  )
}

#let note(..args) = {
  let a = _env-args(args)
  _plain-env(
    "Note",
    number: a.number,
    title: a.title,
    fill: orange-title,
    a.body,
  )
}

#let solution(..args) = {
  let a = _env-args(args)
  let qed = args.named().at("qed", default: $square$)
  _plain-env(
    "Solution",
    number: a.number,
    title: a.title,
    qed: qed,
    a.body,
  )
}

#let proof(..args) = {
  let a = _proof-args(args)
  v(3pt, weak: true)
  block(width: 100%, breakable: true)[
    #if not _is-empty(a.title) [#strong[#a.title.]#sym.space]#_inside-body(a.body)#if a.qed != none [
      #box(width: 0pt)#h(1fr)#sym.wj#sym.space.nobreak#a.qed
    ]
  ]
  v(3pt, weak: true)
}
