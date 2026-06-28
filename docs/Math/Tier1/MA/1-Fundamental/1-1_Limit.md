---
date: 2026-06-28
---

# §1.1 极限

参考为陈天权 3.1, 3.2 两小节, 以及于品的[讲义](https://www.bananaspace.org/wiki/%E8%AE%B2%E4%B9%89:%E6%95%B0%E5%AD%A6%E5%88%86%E6%9E%90).

文章中将有一部分陈述是从两者的陈述中抄来的. 亦有相当一部分是笔者自己的陈述.

## 序列极限

我们熟知, 实数列的极限有如下定义.

:::definition 1.1.1 "数列极限-1"
我们称实数列 $\{a_n\}$ 在 $n\rightarrow \infty$ 时趋于(或收敛于)极限 $\alpha$, 当且仅当

$$
\forall \epsilon > 0, \exists N \in \mathbb N, \text{s.t.} \forall n \ge N, a_n \in (\alpha - \epsilon, \alpha + \epsilon)
$$
:::

写作更常见的形式, 即

:::definition 1.1.2 "数列极限-2"
我们称实数列 $\{a_n\}$ 在 $n\rightarrow \infty$ 时趋于(或收敛于)极限 $\alpha$, 当且仅当

$$
\forall \epsilon > 0, \exists N \in \mathbb N, \text{s.t.} \forall n \ge N, |a_n - \alpha| < \epsilon
$$
:::

更改前后的定义在 $\mathbb R$ 上显然是等价的, 但后者想要延拓至 $\mathbb C$ 上只需将定义上的 $\mathbb R$ 改成 $\mathbb C$ 即可——绝对值在复数上的自然推广是我们所熟知的模长.

选择定义时挑选那些更便于推广的总是好的.

### Question?

极限(看起来)理应是一个数列自身内蕴的性质, 但我们定义一个数列收敛, 即有极限时, 却不得不引入一个外在的实数 $\alpha$.

自然的, 我们应当考虑如何内蕴的考虑极限, 有下列定理:

:::theorem 1.1.1 "柯西收敛准则"
我们称实数列 $\{a_n\}$ 在 $n\rightarrow \infty$ 时收敛, 当且仅当

$$
\forall \epsilon > 0, \exists N \in \mathbb N, \text{s.t.} \forall i, j \ge N, |a_i - a_j| < \epsilon
$$

我们称这是极限收敛的柯西条件.
:::

:::proof
先证必要性.

若实数列 $\{a_n\}$ 收敛, 也就是说对于任意 $\frac{\epsilon}{2} > 0, \exists N \in \mathbb N, \text{s.t.} \forall n\ge N, |a_n - \alpha| < \frac{\epsilon}{2}$

熟知对于实数 $a, b$, 有 $\lvert a + b\rvert \le \left \lvert \lvert a\rvert + \lvert b\rvert \right \rvert$, 此即所谓三角不等式.

即 $\forall i, j \ge N$ 有 $\lvert a_i - a_j\rvert \le \lvert \lvert a_i - \alpha\rvert  + \lvert \alpha - a_j \rvert \rvert < \frac{\epsilon}{2} + \frac{\epsilon}{2} = \epsilon$.

然后证充分性——我们将用到习题中会证明的 Bolzano-Weierstrass Theorem.

先理清大致的想法: 仅仅使用柯西的条件我们没办法把极限值 $\alpha$ 声明出来, 所以我们必须考量一个其他的结构, 使其收敛, 如此得到 $\alpha$. 然后再将原数列中的项与子列中的项进行比较.

Bolzano-Weierstrass Theorem 言述了"有界序列必有收敛子列", 那么想办法让序列有界, 取出其子列, 就可以得到一个 $\alpha$. 我们只需再证明这个子列收敛的 $\alpha$ 是原数列的极限即可, 由于柯西条件, 这看起来是非常可能的. 接下来实现我们的想法.

设 $\{a_n\}$ 为满足柯西条件的数列. 今设我们取 $\epsilon = 1$, 这里可以是任何正实数.

也就是说 $\exists N, \forall i, j\ge N, \lvert a_i - a_j\rvert < 1$.

不妨取 $i=N$, 这便是说 $\forall j\ge N$, 总有 $\lvert a_N - a_j\rvert \le 1$, 即 $\forall j\ge N, a_j \in (A - \epsilon, A + \epsilon)$.

由于有限项的部分必然是有界的, 这正是说原数列必有界. 如此, Bolzano-Weierstrass Theorem 保证我们必能抽出一个子列 $\{a_{n_k}\}$ 使得其收敛, 设其极限为 $\alpha$.

任取一 $\epsilon > 0$, 有 $\{a_n\}$ 满足柯西条件, 此即 $\exists N_1 \in \mathbb N, \text{s.t.} i, j\ge N_1, \lvert a_i - a_j\rvert < \frac{\epsilon}{2}$.

知所取子列收敛, 故对于刚才所取 $\epsilon$, 又有 $\exists K \in \mathbb N, \text{s.t.} \forall k > K, \lvert a_{n_k} - \alpha\rvert < \frac{\epsilon}{2}$.

取 $k$ 同时满足 $k> K \land n_k > N_1$, 依次便有对 $n>N_1$, 必满足:

$$
\lvert a_n - \alpha\rvert \le \lvert \lvert a_n - a_{n_k}\rvert + \lvert a_{n_k} - \alpha \rvert \rvert < \frac{\epsilon}{2} + \frac{\epsilon}{2} = \epsilon
$$

依此, 我们便证明了 $\lim_{n\rightarrow \infty} a_n = \alpha$.
:::

满足柯西条件的数列, 称之为柯西列, 上述事实正是说一个实数列收敛当且仅当它是柯西列.

从直观上, 这当然是等价的. "所有点到某个位置都足够近", 当然和"所有点两两之间的距离都足够近"说的是同一回事, 让我们稍后再证明它.

既然用数列自身内蕴的性质表示"数列收敛"的尝试成功了, 那么能否同样的, 只使用数列自身的性质表示"数列的极限"到底是什么, 而无需提前预知极限为 $\alpha$ ?

经过简单的尝试, 很容易发现: 在只使用数列本身信息的情况下, 似乎没有某种简单的手段可以简易的表示一个数列的极限是什么, 这促使我们去考虑它的反面. 而有如下的事实表明, 数列的极限并不能被简单的计算出:

:::lemma "极限的不可计算性"
即使数列 $\{a_n\}$ 满足 $\forall n, a_n \in \mathbb Q$ 且所有的 $a_n$ 都可计算, $\displaystyle \lim_{n\rightarrow \infty} a_n$ 仍然可能是不可计算的.
:::

:::proof
设 $K$ 是停机问题集合, 即 $K = \{i : 第 i 个图灵机停机\}$, 此处 $i$ 从 $0$ 始.

考量数列:

$$
a_n = \sum_{i\le n \\ 第 i 个图灵机在前 n 步停机} \frac{1}{3^{i+1}}
$$

此处选择三进制小数是为了避免二进制下 $0.11111\ldots$ 这样的非规范小数带来的混淆.

显然 $a_n$ 单调递增, 有理且有上界. 因此它在 $\mathbb R$ 中收敛. 又通过模拟执行可以计算出每一个图灵机是否在前 $n$ 步停机, 因此每个 $a_n$ 可计算.

假若极限 $\alpha = \lim_{n\rightarrow \infty} a_n$ 为可计算实数, 那么我们就可以用充分高的精度计算 $\alpha$ 得到 $K$, 从而判定任意图灵机是否停机, 这与停机问题不可判定矛盾, 故 $\alpha$ 不可计算.
:::

这说明了我们引入 $\alpha$ 这一行为的必要性.

### 完备与否

先前我们谈及, 在 $\mathbb R$ 内, 极限收敛的原始定义与 Cauchy 收敛准则所给出的定义是等价的. 而于品的讲义中提到:

> "...可见, 一个点的序列能否收敛与这个点列所生活的空间的性质密切相关."

围绕这一点, 应当可以展开进一步的论述.

考察实数列

$$
0.4, 0.41, 0.414, 0.4142, 0.41421, \cdots
$$

也就是 $\sqrt 2 - 1$ 的十进制小数点前 $n$ 位. 在 $\mathbb R$ 中此数列的极限显然为 $\sqrt 2 - 1$, 而它的每一项都在 $\mathbb Q$ 中.

在 $\mathbb Q$ 中, 显然不存在 $\sqrt 2 - 1$ 这个数, 因此按照极限的原始定义, 此数列**不存在极限**. 而若我们对其使用柯西审敛准则, 这数列又显然是一柯西列. 问题何在? 在于极限**不是**数列本身的性质, 它同时依赖于数列本身, 数列所置身的空间, 以及度量结构. 即, 它还与数列所处的距离空间 $(X, d)$ 有关.

极限的直接定义强度要高于柯西收敛准则给出的定义, 只有在**完备的度量空间中**, 两个定义才相等. 或者说, 完备的定义就是

:::definition 1.1.3 "完备性"
设域 $F$ 是一个带有距离 $d$ 的域, 则 $F$ 完备 $\iff$ $F$ 中的每一个柯西列都有极限.
:::

我们之所以会认为它"有极限, 只是不在 $\mathbb Q$ 里", 则是因为我们过于熟悉 $\mathbb R$, 以至于将其当作了思考的基底.

回首 Cauchy 收敛准则的证明, 其中我们用到了 Bolzano-Weierstrass Theorem, 而 Bolzano-Weierstrass Theorem 的证明又需要**单调有界序列必有极限**这一事实, 这看似平凡, 却是确界原理所保证的! 对于不完备的域, 并不存在这一事实. 这警示我们, 应当时时小心, 有哪些证明偷偷挪用了我们习以为常但并不一定总是成立的假设.

## 习题

陈天权的习题.

### 陈天权 3.1
