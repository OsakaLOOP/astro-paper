import type { BangumiCardData } from "../../backends/src/bangumi";
import {
  bangumiTypes,
  collectionStatus,
  collectionProgress,
} from "@/utils/bangumi";

const initialized = new WeakSet<HTMLElement>();

function updateSummary(card: HTMLElement) {
  const summary = card.querySelector<HTMLElement>("[data-summary]")!;
  const toggle = card.querySelector<HTMLButtonElement>(
    "[data-summary-toggle]"
  )!;
  toggle.hidden =
    summary.hidden ||
    (!summary.classList.contains("is-expanded") &&
      summary.scrollHeight <= summary.clientHeight);
}

const summaryObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    updateSummary(entry.target.closest<HTMLElement>("[data-bangumi-card]")!);
  }
});
document.addEventListener("astro:before-swap", () =>
  summaryObserver.disconnect()
);

function updateCard(card: HTMLElement, data: BangumiCardData) {
  const { subject, collection } = data;
  card.dataset.subjectType = String(subject.type);
  const element = <T extends HTMLElement = HTMLElement>(name: string) =>
    card.querySelector<T>(`[data-${name}]`)!;
  const text = (name: string, value: string) => {
    element(name).textContent = value;
  };
  text("title", subject.nameCn || subject.name);
  text(
    "category",
    [subject.platform || bangumiTypes[subject.type], subject.date]
      .filter(Boolean)
      .join(" · ")
  );
  text("original", subject.name);
  element("original").hidden = !subject.nameCn;
  const cover = element<HTMLImageElement>("cover");
  cover.hidden = !subject.image;
  if (subject.image)
    cover.src = new URL(
      `/blog/bangumi/subjects/${subject.id}/cover`,
      card.dataset.api
    ).href;
  cover.alt = subject.name;
  const meta = element("meta");
  meta.replaceChildren(
    ...subject.infobox.map(item => {
      const row = document.createElement("div");
      const key = document.createElement("dt");
      const value = document.createElement("dd");
      key.textContent = item.key;
      value.textContent = item.value;
      row.append(key, value);
      return row;
    })
  );
  text("score", subject.total ? subject.score.toFixed(1) : "—");
  text(
    "votes",
    `${subject.total} 人评分${subject.rank ? ` · #${subject.rank}` : ""}`
  );
  const maximum = Math.max(1, ...subject.counts);
  element("chart").setAttribute(
    "aria-label",
    `评分分布：${subject.counts.map((count, i) => `${i + 1}分 ${count}人`).join("，")}`
  );
  card.querySelectorAll<HTMLElement>("[data-bar]").forEach((bar, i) => {
    bar.style.height = `${(subject.counts[i] / maximum) * 100}%`;
    bar.parentElement!.parentElement!.title = `${i + 1} 分：${subject.counts[i]} 人`;
  });
  text("summary", subject.summary.replaceAll("&amp;", "&"));
  element("summary").hidden = !subject.summary;
  updateSummary(card);
  // 收藏接口暂时失效时，继续显示文章内的公开收藏快照。
  if (collection || !data.warning || data.warning === "token_expiring") {
    element("personal").hidden = !collection;
    if (collection) {
      text("owner", collection.nickname);
      element<HTMLAnchorElement>("owner").href =
        `https://bangumi.tv/user/${encodeURIComponent(collection.username)}`;
      text("progress", collectionStatus(subject.type, collection.status));
      text(
        "personal-score",
        collection.rate ? `${collection.rate} / 10` : "未评分"
      );
      text(
        "episodes",
        collectionProgress(
          subject.type,
          collection.episodes,
          collection.volumes,
          subject.episodes,
          subject.volumes
        )
      );
    }
  }
  text(
    "note",
    data.stale
      ? "暂时无法更新 · 显示已保存信息"
      : data.warning && data.warning !== "token_expiring"
        ? "阅读状态暂未更新"
        : `更新于 ${data.updatedAt.slice(0, 10)}`
  );
  if (data.warning)
    console.warn(
      `[Bangumi] #${subject.id}: ${data.warning}，请检查后端令牌有效期和代理配置。`
    );
}

async function loadCard(card: HTMLElement) {
  if (initialized.has(card)) return;
  initialized.add(card);
  const summary = card.querySelector<HTMLElement>("[data-summary]")!;
  const toggle = card.querySelector<HTMLButtonElement>(
    "[data-summary-toggle]"
  )!;
  toggle.addEventListener("click", () => {
    const expanded = summary.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "收起简介" : "展开简介";
  });
  summaryObserver.observe(summary);
  updateSummary(card);
  const cover = card.querySelector<HTMLImageElement>("[data-cover]");
  cover?.addEventListener("error", () => {
    cover.hidden = true;
  });
  try {
    const url = new URL(
      `/blog/bangumi/subjects/${card.dataset.subjectId}`,
      card.dataset.api
    );
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as BangumiCardData;
    if (data.subject?.id !== Number(card.dataset.subjectId))
      throw new Error("作品响应无效");
    updateCard(card, data);
  } catch (error) {
    const note = card.querySelector<HTMLElement>("[data-note]");
    if (note) note.textContent = "暂时无法更新 · 可前往 Bangumi 查看";
    console.warn(`[Bangumi] #${card.dataset.subjectId} 更新失败`, error);
  }
}

function initCards() {
  document
    .querySelectorAll<HTMLElement>("[data-bangumi-card]")
    .forEach(card => {
      void loadCard(card);
    });
}
document.addEventListener("astro:page-load", initCards);
initCards();
