# Theorem Environments

本项目使用本地 MkDocs 插件 `theorem_envs` 实现定理环境，不使用
`admonition`，也不修改 Material for MkDocs 本体。

插件入口在 `mkdocs_theorem_envs/`，样式文件在 `docs/stylesheets/`：

- `theorem-box.css`：盒子结构、标题排版、无框环境、QED 位置。
- `theorem-colors.css`：颜色变量，修改配色时优先改这里。

## 基本用法

在 Markdown 中使用三冒号块：

```markdown
:::theorem 1.1 "生成函数的唯一性"
这里写定理正文，可以继续使用 **Markdown**、列表、公式等。
:::
```

语法格式是：

```text
:::环境种类 定理编号 "定理名字"
正文
:::
```

编号和名字都可以省略：

```markdown
:::lemma 1.2
只有编号，没有名字。
:::

:::proof
Expand the product:

$$(a+b)^2 = a^2 + 2ab + b^2.$$
:::
```

星号环境也可使用，例如 `:::theorem* "无编号定理"`。星号环境不会显示编号。

## 默认环境

默认环境尽量对应 `note-setup-leftsidebox.tex`：

| 环境 | 标题 | 默认样式 | 默认颜色 | 编号 | 框体 | QED |
| --- | --- | --- | --- | --- | --- | --- |
| `theorem` | Theorem | plain | purple | 是 | 是 | 否 |
| `proposition` | Proposition | plain | purple | 是 | 是 | 否 |
| `corollary` | Corollary | plain | blue | 是 | 是 | 否 |
| `lemma` | Lemma | plain | blue | 是 | 是 | 否 |
| `claim` | Claim | plain | blue | 是 | 是 | 否 |
| `definition` | Definition | definition | green | 是 | 是 | 否 |
| `example` | Example | definition | sienna | 是 | 是 | 否 |
| `problem` | Problem | definition | strawberry | 是 | 是 | 否 |
| `exercise` | Exercise | definition | ultramarine | 是 | 是 | 否 |
| `remark` | Remark | remark | gray | 是 | 否 | 否 |
| `note` | Note | note | orange | 是 | 否 | 否 |
| `solution` | Solution | solution | gray | 是 | 否 | 是 |
| `proof` | Proof | solution | gray | 否 | 否 | 是 |

其中 `proof` 对应 `amsthm` 的 proof 效果：无框，默认显示为
`Proof.`，正文直接接在后面，末尾右侧显示方块。

`excercise` 作为 `exercise` 的兼容别名可用，但推荐使用正确拼写
`exercise`。

## 插件配置

插件在 `mkdocs.yml` 的 `plugins` 下配置：

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
```

全局边线宽度只影响有框环境。设为 `0px` 也是合法的，例如：

```yaml
  - theorem_envs:
      left_rule: 0px
      right_rule: 0px
      top_rule: 0px
      bottom_rule: 0px
```

## 修改颜色

颜色单独存放在 `docs/stylesheets/theorem-colors.css`。

例如修改 theorem/proposition 使用的紫色：

```css
.md-typeset .thm-color-purple {
  --thm-frame: #7851a9;
  --thm-bg: color-mix(in srgb, #7851a9 8%, transparent);
  --thm-title-color: #5f3f8c;
}
```

三个变量含义是：

- `--thm-frame`：左右边线颜色。
- `--thm-bg`：背景色。
- `--thm-title-color`：标题颜色。

新增颜色时，只要添加新的 `.thm-color-颜色名` 类即可：

```css
.md-typeset .thm-color-red {
  --thm-frame: #b3261e;
  --thm-bg: color-mix(in srgb, #b3261e 6%, transparent);
  --thm-title-color: #9f1f18;
}
```

然后在环境配置里写 `color: red`。

## 增加环境

在 `mkdocs.yml` 的 `theorem_envs.environments` 下增加即可：

```yaml
plugins:
  - theorem_envs:
      left_rule: 2px
      right_rule: 1px
      top_rule: 0px
      bottom_rule: 0px
      environments:
        axiom:
          label: Axiom
          style: plain
          color: purple
          numbered: true
          framed: true
          title_break: true
          title_punct: ""
          qed: false
```

之后就可以写：

```markdown
:::axiom 1.1 "选择公理"
这里是公理内容。
:::
```

可用字段：

| 字段 | 含义 |
| --- | --- |
| `label` | 显示在标题处的名字，例如 `Theorem`。 |
| `style` | 标题风格类，例如 `plain`、`definition`、`remark`、`note`、`solution`。 |
| `color` | 颜色类名，对应 `theorem-colors.css` 中的 `.thm-color-*`。 |
| `numbered` | 是否显示编号。 |
| `framed` | 是否显示框体和背景。 |
| `title_break` | 标题后是否换行。 |
| `title_punct` | 标题后标点，例如 proof 使用 `"."`。 |
| `qed` | 是否在末尾显示结尾符。 |
| `qed_symbol` | 结尾符内容，例如 `□`、`Q.E.D.`、`∎`。 |

## 修改 Proof 的排版

默认 `proof` 配置等价于：

```yaml
proof:
  label: Proof
  style: solution
  color: gray
  numbered: false
  framed: false
  title_break: false
  title_punct: "."
  qed: true
  qed_symbol: "□"
```

默认效果是：

```text
Proof. Expand the product:
```

如果希望 `Proof.` 后换行，把 `title_break` 改成 `true`：

```yaml
plugins:
  - theorem_envs:
      environments:
        proof:
          title_break: true
```

如果希望把结尾方块改成 `Q.E.D.`：

```yaml
plugins:
  - theorem_envs:
      environments:
        proof:
          qed_symbol: "Q.E.D."
```

如果不想显示结尾符：

```yaml
plugins:
  - theorem_envs:
      environments:
        proof:
          qed: false
```

`solution` 也支持同样的字段。默认 `solution` 是无框、标题后换行、末尾显示方块。

## 完全关闭默认环境

如果想只保留自己注册的环境，可以关闭默认环境：

```yaml
plugins:
  - theorem_envs:
      default_environments: false
      environments:
        theorem:
          label: Theorem
          style: plain
          color: purple
          numbered: true
          framed: true
```
