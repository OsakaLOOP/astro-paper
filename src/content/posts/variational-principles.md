---
title: 理论力学01——变分学初步
author: Loopo
pubDatetime: 2026-10-6T17:45:00+08:00
slug: variational-principles
featured: true
draft: false
tags:
  - Physics[Mechanics]
  - Variational Principles
  - Manuscript
  - Archived

description: A manuscript on Variational Principles applied in Mechanics, as well as its explanations and derivations.
---

> 这是我在寒假期间陆续整理的理论力学笔记的第一部分. 后续还会更新约束的变分问题.

## 泛函与泛函极值

**泛函**(Functional) 定义为函数到数的映射:

$$
S[f(x)]\coloneqq f(x)\mapsto S , \quad \mathcal{F}\rightarrow \mathbf{C},
$$

泛函与函数相关的范围, 可能是**局部的**, 此时常常与曲线、曲面或过程方程, 甚至特定的局域点联系. 经典力学中一类常见的泛函为单一积分形式, 称为**作用量泛函**:

$$
S[f]=\int_{t_1}^{t_2} \mathrm{d}t \, L(t, f(t), f'(t)),
$$

这里, $[t_1, t_2]$ 即可看作泛函的「定义域」. 物理上研究泛函的取值, 常常考虑限定的函数集合 $\mathcal{F}$, 例如:

$$
\mathcal{F} = \{y∣y \text{ 连续可微} , y ( a )= A , y ( b )= B \}
$$

这里 $y ( a )= A , y ( b )= B$ 是固定端点的**边值条件**. 在一定的边值条件下, 即可研究**泛函的极值问题**. 也就是找到函数 $y$, 使得对充分小的扰动 $h$, 都有

$$
J[y+h]\geq J[y] \text{ 或 }J[y+h]\leq J[y] .
$$

## 变分的性质

模仿一元微积分, 可以定义泛函的**变分**操作, 即函数本身的无穷小变化, 区别于自变量变化引起的微分 $\mathrm{d}x$.

$$

\delta y(x): =\widetilde y(x)-y(x),

$$

对函数的约束条件, 也会作用于变分. 后面我们将进一步讨论不同的约束. 限于上述的 $\mathcal{F}$ 中, 所有可能的变分组成集合:

$$

\mathscr V

=\{\eta\mid \eta\text{ 连续可微}, \ \eta(a)=\eta(b)=0\}.

$$

这个集合对线性运算是封闭的, 因此带来**变分的线性性质**:

$$

\delta (c_1 u + c_2 v) = c_1 \delta u + c_2 \delta v.
$$

一般意义上的 $\mathscr{V}$ 是无穷维向量空间, 包含了无穷的形态任意而满足约束的函数. 但我们有时选取一组形式上限定的完备基, 例如:

$$

\eta_N(x)=\sum_{k=1}^{\infty}c_k\phi_k(x),

$$

在 $[0, \pi]$ 上, 这里交替取正/余弦函数, 就变成了十分熟悉的 Fourier 级数. 你也可以想象一种 「局域扰动」的取法, 一段区间上的扰动函数由无穷多的 "小山包" 叠加而成. Euler 最早尝试导出变分原理时, 采用的差分方法便类似如此, 但不够严谨.

![_assets/v2-1e9c3dc5039092a3ba96bdc047760a6e_1440w.png]

数学上, 即便连续可微, 对扰动的性质仍然有所区分. 定义弱模和强模:

$$

||h||_w=\max_{x\in\ [x_1, x_2]}|h(x)|, \quad ||h||_s=\max_{x\in\ [x_1, x_2]}\big\{|h(x)|+|h'(x)|\big\}

$$

强模不仅限制扰动本身, 还限制其导数. 关于弱模的变分为强变分, 强模为弱变分. 也可以采用 $k$ 阶接近的概念, 弱模 $k=0$, 强模 $k=1$.
![_assets/v2-a5e71248f63488c08a28597bfed76d11_1440w.png]

## 泛函导数与微积分性质

之前的或许可以称为变分的线代性质; 下面进一步考虑变分与微积分相关的性质. 变分和微分运算的作用对象独立, 理应互不干扰, 猜测具有可交换性. 而高显《经典力学》中, 有这样一个如其名, 十分「经典」的伪证:

$$

\widetilde{f}(x+\mathrm{d}x)-f(x)\approx\delta f(x)+\mathrm{d}f(x)+\mathrm{d}(\delta f(x))\approx\delta f(x)+\mathrm{d}f(x)+\delta(\mathrm{d} f(x))\Rightarrow \mathrm{d}(\delta f(x))=\delta(\mathrm{d} f(x)),

$$

书中这个式子声称精确到一阶小量, 然而变分的微分、微分的变分都是二阶. 如果在两式末尾补上 $o(x)$, 使之成为严格的等式, 则两者都应该被合并到包含诸如 $\displaystyle{\frac12 \mathrm{d}^2x, \frac12 \delta^2x}$ 的二阶项里; 式中却为了导出交换性而只留下交叉项.

因此, 有关变分的微积分性质, 其证明不能停留在抽象层面, 必须采用进一步的分析方法. "无穷小的扰动函数"不是良定义的. 严谨的做法需要赋范线性空间和 Fréchet 导数, 这里我们可以不那么严谨地设想, 扰动函数在逼近无穷小的过程中, 其"形状"和"大小"都必须考虑, 那么利用其线性性质, 用一个有限大的确定函数 $\eta(x)$ 代表一族扰动函数, 取参数 $\varepsilon$, 令:

$$

\eta(x, \varepsilon)=\varepsilon \eta(x), \quad \widetilde{f}(x, \eta)=f(x)+\varepsilon\eta(x),

$$

固定 $\eta$ (也被称为线性空间中的"方向"), 则 $S[f+\varepsilon\eta]$ 仅是 $\varepsilon$ 的函数, 展开为:

$$

\Phi(\varepsilon)=S[f+\varepsilon\eta]=S[f]+\varepsilon \left. \frac{\mathrm{d} S[f+\varepsilon\eta]}{\mathrm{d} \varepsilon}\right|_{\varepsilon=0}+o(\varepsilon).

$$

如此, 定义**对给定基 $\eta$ 的变分**:

$$

\delta S[f; \eta]\coloneqq\varepsilon\left. \frac{\mathrm{d} S[f+\varepsilon\eta]}{\mathrm{d} \varepsilon}\right|_{\varepsilon=0} = \varepsilon \cdot dS[f;\eta],

$$

并定义**对 $\eta$ 的一阶泛函导数**(Gâteaux 导数):

$$

dS[f;\eta] = \lim_{\varepsilon \to 0} \frac{S[f+\varepsilon \eta] - S[f]}{\varepsilon} = \left. \frac{\mathrm{d}}{\mathrm{d} \varepsilon} S[f+\varepsilon \eta] \right|_{\varepsilon=0} .

$$

有了上述基于参数 $\varepsilon$ 的单变量微积分描述, 变分的微积分运算性质就可以严格证明.

-**可交换性**:
对 $\widetilde{f}(x, \varepsilon) = f(x) + \varepsilon \eta(x)$, 其中 $f$ 和 $\eta$ 连续可微, 由 Schwarz 定理, 对 $x, \varepsilon$ 的混合偏导数相等.

因此自然有

$$

\delta (\mathrm{d}f) = \delta \left( \frac{\partial f}{\partial x} \mathrm{d}x \right) = \varepsilon \left. \frac{\partial}{\partial \varepsilon} \left[ \frac{\partial \widetilde{f}}{\partial x} \right] \right|_{\varepsilon=0} \mathrm{d}x = \varepsilon \left. \frac{\partial}{\partial x} \left[ \frac{\partial \widetilde{f}}{\partial \varepsilon} \right] \right|_{\varepsilon=0} \mathrm{d}x = \frac{\partial}{\partial x} (\varepsilon \eta) \mathrm{d}x = \mathrm{d}(\delta f) ;

$$

对**等时变分**, $\displaystyle{\delta t=0\Leftrightarrow \frac{\mathrm{d}}{\mathrm{d} t} (\delta y)=\delta \left(\frac{\mathrm{d}}{\mathrm{d} t}y\right)}$

-**乘积法则**:

$$
\delta(u \cdot v) = \varepsilon \left.\frac{\mathrm{d}}{\mathrm{d}\varepsilon} \big[ (u+\varepsilon\eta_u)(v+\varepsilon\eta_v) \big] \right|_{\varepsilon=0}= \varepsilon(\eta_u v + u \eta_v) = (\delta u)v + u(\delta v);
$$

-**链式法则**:

$$
 \delta F(x, y, y') \coloneqq \varepsilon \left. \frac{\mathrm{d}}{\mathrm{d} \varepsilon} F\big(x, y+\varepsilon \eta, y'+\varepsilon \eta'\big) \right|_{\varepsilon=0} = \varepsilon \left( \frac{\partial F}{\partial y}\eta + \frac{\partial F}{\partial y'}\eta' \right) = \frac{\partial F}{\partial y}\delta y + \frac{\partial F}{\partial y'}\delta y'.
$$

---

如果泛函 $S$ 是 Fréchet 可微的, 前述 Gâteaux 导数 $dS[f;\eta]$ 将构成一个关于函数 $\eta$ 的连续线性泛函. Riesz 表示定理指出存在唯一的 $g(x)$, 使得:

$$
\mathrm{d} S[f;\eta] = \langle g,\eta \rangle = \int g(x) \eta(x) \mathrm{d}x=\int g(x) \, \delta f(x)\, \mathrm{d}x,
$$

这里的 $g(x)$ 就是**泛函导数**$\displaystyle{\frac{\delta S}{\delta f(x)}}$. 它给出了在无穷维函数空间, 泛函沿任意变分方向, 在 x 处的变化率密度.

泛函变分的形式可以类比多元函数的一阶微分:

$$
F(x_1, \, \cdots, x_N), \quad \mathrm{d}F=\sum_n^N\frac{\partial F}{\partial x_n}\mathrm{d}x_n,
$$

对应关系如表.

| 全微分 $\mathrm{d}F$                                    |                  泛函变分 $\delta S$                   |
| :------------------------------------------------------ | :----------------------------------------------------: |
| 求和 $\displaystyle{\sum_n^N}$                          |         积分 $\displaystyle{\int \mathrm{d}x}$         |
| 偏导数 $\displaystyle{\frac{\partial F}{\partial x_n}}$ | 泛函导数 $\displaystyle{\frac{\delta S}{\delta f(x)}}$ |
| 坐标分量微分 $\mathrm{d}x_n$                            |                 函数变分 $\delta f(x)$                 |

---

泛函导数可以根据 Gâteaux 导数的定义进行计算. 以作用量泛函

$$
S[f]=\int_{t_1}^{t_2} \mathrm{d}t \, L(t, f(t), f'(t))
$$

为例, 考虑泛函增量在 $\varepsilon \to 0$ 时的极限行为. 需要注意, 直接交换积分和极限次序的做法是不严谨的. 首先展开被积函数:

$$
L(t, f+\varepsilon\eta, f'+\varepsilon\eta') = L(t, f, f') + \varepsilon \left( \frac{\partial L}{\partial f}\eta + \frac{\partial L}{\partial f'}\eta' \right) + R(t, \varepsilon);
$$

$$
\lim_{\rho \to 0} \frac{R(t, \varepsilon)}{\rho(t, \varepsilon)} = 0, \quad \text{其中 } \rho(t, \varepsilon) = \sqrt{(\Delta f)^2 + (\Delta f')^2} = |\varepsilon| \sqrt{\eta(t)^2 + \eta'(t)^2}.
$$

尽管余项 $R(t, \varepsilon)$ 在任一点 $t$ 收敛, 积分 $\displaystyle{\int R \, \mathrm{d}t = o(\varepsilon)}$ 要求的是一致收敛. 假设 $L$ 服从**强模**, 才可以放缩得出. 记 $||\eta||_s=M$, 有:

$$
|\Delta f| = |\varepsilon| |\eta(t)| \leq M |\varepsilon|, \quad|\Delta f'| = |\varepsilon| |\eta'(t)| \leq M |\varepsilon|,
$$

进而:

$$
\rho(t, \varepsilon) \leq |\varepsilon| \big( |\eta(t)| + |\eta'(t)| \big) \leq |\varepsilon| M.
$$

由 Lagrange 中值定理, 可得:

$$
R(t, \varepsilon) = D_f(t, \varepsilon) \Delta f + D_{f'}(t, \varepsilon) \Delta f',
$$

放缩得:

$$
\vert{}R(t, \varepsilon)\vert{} \leq \sqrt{ D_f^2 + D_{f'}^2 } \cdot \sqrt{ (\Delta f)^2 + (\Delta f')^2 }\leq \rho(t, \varepsilon) \cdot \alpha(t, \varepsilon),\quad \alpha(t, \varepsilon) = \sqrt{ D_f^2 + D_{f'}^2 }
$$

实分析可以给出 $D_f, D_{f'}$ 的一致连续, 进而:

$$
\lim_{\varepsilon \to 0} \left( \max_{t \in [t_1, t_2]} \alpha(t, \varepsilon) \right) = 0.
$$

最终:

$$
\left\vert{} \int_{t_1}^{t_2} R(t, \varepsilon) \mathrm{d}t \right\vert{} \leq \int_{t_1}^{t_2} \rho(t, \varepsilon) \vert{}\alpha(t, \varepsilon)\vert{} \mathrm{d}t \leq \vert{}\varepsilon\vert{} \cdot M \cdot \left( \max_t \vert{}\alpha\vert{} \right) \cdot (t_2 - t_1) \Rightarrow \int R\,\mathrm{d}t\to0.
$$

如此, 在强模的意义下, 极限与积分的可交换得到了证明. 也就是可以写成:

$$
\mathrm{d}S[f;\eta]=\int_{t_1}^{t_2}\bigg(\frac{\partial L}{\partial f}\eta(t)+\frac{\partial L}{\partial f'}\eta'(t) \bigg) \,\mathrm{d}t
$$

为了提取整体 $\eta(t)$ 因子, 对第二项分部积分:

$$
\int_{t_1}^{t_2}\frac{\partial L}{\partial f'}\eta'(t) \,\mathrm{d}t= \left. \frac{\partial L}{\partial f'}\eta(t)\right|_{t_1}^{t_2} - \int_{t_1}^{t_2}\frac{\mathrm{d}}{\mathrm{d}t}\left(\frac{\partial L}{\partial f'}\right) \eta(t) \,\mathrm{d}t,
$$

边界项为零, 代回得到:

$$
\mathrm{d}S[f;\eta]=\int_{t_1}^{t_2}\left[\frac{\partial L}{\partial f} - \frac{\mathrm{d}}{\mathrm{d}t}\left(\frac{\partial L}{\partial f'}\right)\right]\eta(t)\, \mathrm{d}t
$$

对比积分内即得泛函导数

$$
\frac{\delta S}{\delta f(t)}=\frac{\partial L}{\partial f} - \frac{\mathrm{d}}{\mathrm{d}t}\left(\frac{\partial L}{\partial f'}\right).
$$

后面很快会用到这一结果.

有趣的是,**$\delta$-函数**也可以看成某个泛函的导数, 毕竟他只在积分时才有意义, 看起来像是:

$$

\int_{-\infty}^{\infty} \delta(x - a) f(x) dx = f(a),

$$

这是一个只与 $f(x)$ 在 $a$ 处局域值相关的泛函, 它的泛函导数就是 $\delta(x-a)$.

## 泛函极值的条件——Euler-Lagrange 方程

对于泛函极值问题, 为使 $\delta S[f;\eta]\geq0$, 考察其展开. 假设泛函是 Fréchet 可微的, 则应有:

$$
$S[f+\varepsilon \eta] - S[f] = \varepsilon \cdot \mathrm{d}S[f;\eta] + o(\varepsilon) \geq 0,

$$

由于参数 $\varepsilon$ 符号任意, 可知极值的必要条件是

$$

\mathrm{d}S[f;\eta]=\int \frac{\delta S}{\delta f(x)} \eta(x) \mathrm{d}x=0.

$$

这里讨论的是自由的或仅有**双侧约束**的变分问题. 如果存在**单侧约束**, 那么这里的 $\varepsilon$ 将只能取非正或非负值, 即极值还可能在约束边界处取到, 使之成为另一类问题:**变分不等式**.

**变分学基本引理**(Du Bois-Reymond Lemma) 指出, 若一个 $g(x)$ 满足对任意符合边界条件的连续可微函数 $h(x)\in C^1, h(t_1)=h(t_2)=0$, 成立

$$

\int_{t_1}^{t_2} g(x) h(x) \mathrm{d}x = 0,

$$

则在区间上必然有 $g(x) \equiv 0$, 故极值条件等价于泛函导数 $\displaystyle{\frac{\delta S}{\delta f(x)}=0}.$

对此前提到的作用量泛函, 代入它的泛函导数 (强模条件) 就得到了著名的**Euler-Lagrange 方程**:

$$

\frac{\delta S}{\delta f(t)} = \frac{\partial L}{\partial f} - \frac{\mathrm{d}}{\mathrm{d}t}\left(\frac{\partial L}{\partial f'}\right)=0.

$$

---

注意到

$$

\frac{\partial f}{\partial t} =\frac{\mathrm{d}f}{\mathrm{d}t}-\frac{\partial f}{\partial x}\frac{\mathrm{d}x}{\mathrm{d}t}-\frac{\partial f}{\partial x'}\frac{\mathrm{d}x'}{\mathrm{d}t}=\frac{\mathrm{d}}{\mathrm{d}t}\left(f-x'\frac{\partial f}{\partial x'}\right)-x'\underbrace{\left[\frac{\partial x}{\partial t}-\frac{\mathrm{d}}{\mathrm{d}t} \left(\frac{\partial f}{\partial x'}\right)\right]}_0

$$

还可得第二种形式的 Euler-Lagrange 方程:

$$

\frac{\partial f}{\partial t}+\frac{\mathrm{d}}{\mathrm{d}t}\left(x'\frac{\partial f}{\partial x'}-f\right)=0

$$

或者, 对 Euler-Lagrange 方程同乘 $x'$, 代入 $\displaystyle{\frac{\partial f}{\partial x}}$ 的表达式, 可得相同结果(相比书上推导的前者可能还更好注意到一点).

若 $f$ 不显含 $x$, 即 $\displaystyle{\frac{\partial f}{\partial t}=0}$, 则得到一个守恒量:

$$

x'\frac{\partial f}{\partial x'}-f\equiv \text{const}.

$$

## Euler-Lagrange 方程的推广

Euler-Lagrange 方程可以进一步推广到高阶和多元向量值函数情况. 对高阶问题, 形如:

$$

J[x(t)]=\int_a^b f(t,x(t),x'(t),\cdots,x^{(n)}(t)) \, \mathrm{d}t,

$$

并要求 $n+2$ 阶可微, 且边界条件为

$$

\begin{aligned}&x(t_0)=x_0;x'(t_0)=x'_0;...;x^{(n-1)}(t_0)=x_0^{(n-1)};\
&x(t_1)=x_1;x'(t_1)=x'_1;...;x^{(n-1)}(t_1)=x^{(n-1)},\end{aligned}

$$

那么有 $2n$ 阶的**Euler-Poisson 方程**为:

$$

\frac{\partial f}{\partial x}-\frac{\mathrm{d}}{\mathrm{d}t} \left(\frac{\partial f}{\partial x'}\right) +\cdots+(-1)^n\frac{\mathrm{d}^n}{\mathrm{d}t^n}\left(\frac{\partial f}{\partial x^{(n)}}\right)=0.

$$

而如果泛函与多个函数, 或者一个多元向量值函数相关, 形如:

$$

\mathbf{x}(t)=(x_1(t),\cdots,x_n(t)),\quad \mathbf{x}'(t)=(x_1'(t),\cdots,x_n'(t));\quad J[x]=J[x_1,\cdots,x_n]=\int_a^bf(t,x_1,\cdots,x_n,x_1',\cdots,x_n')\mathrm{d}t,

$$

独立地考察各个函数变量, 同样由变分学基本引理可得**Euler-Lagrange 方程组**:

$$

\dfrac{\partial f}{\partial x_i}-\dfrac{\mathrm{d}}{\mathrm{d}t} \left(\dfrac{\partial f}{\partial x_i'}\right)=0, \quad i=1,\cdots,n.

$$

此外, 变分法还可以推广到重积分问题. 考虑定义在开区域 $A$ 上的二维积分泛函, 形如:

$$

J[u]=\iint_A f(x,y,u,u_x,u_y)\,\mathrm{d}x\mathrm{d}y,

$$

其中 $u(x,y)$ 是定义在 $\mathbb{R}^2$ 中开区域 $A$ 上的函数, 满足边值条件:

$$

u(x,y)=u_0(x,y), \, (x,y)\in\partial A.

$$

考虑满足 $\eta|_{\partial A}=0$ 的变分方向 $\eta(x,y)$, 计算其 Gâteaux 导数, 极值条件要求:

$$

\mathrm{d}J[u;\eta]=\iint_A \left( \frac{\partial f}{\partial u}\eta + \frac{\partial f}{\partial u_x}\eta_x + \frac{\partial f}{\partial u_y}\eta_y \right) \mathrm{d}x\mathrm{d}y = 0.

$$

利用 Green 公式, 分部积分:

$$

\iint_A \left( \frac{\partial f}{\partial u_x}\eta_x + \frac{\partial f}{\partial u_y}\eta_y \right) \mathrm{d}x\mathrm{d}y = \oint_{\partial A} \eta \left( \frac{\partial f}{\partial u_x}\mathrm{d}y - \frac{\partial f}{\partial u_y}\mathrm{d}x \right) - \iint_A \eta \left[ \frac{\partial}{\partial x}\left(\frac{\partial f}{\partial u_x}\right) + \frac{\partial}{\partial y}\left(\frac{\partial f}{\partial u_y}\right) \right] \mathrm{d}x\mathrm{d}y.

$$

边界项自然为零. 提取公共因子 $\eta(x,y)$, 再由变分学基本引理的二维推广, 要求括号内的项在 $A$ 上处处为零, 即可得到偏微分形式的**Euler-Ostrogradsky 方程**:

$$

\frac{\partial f}{\partial u} - \frac{\partial}{\partial x}\left(\frac{\partial f}{\partial u_x}\right) - \frac{\partial}{\partial y}\left(\frac{\partial f}{\partial u_y}\right) = 0.

$$
