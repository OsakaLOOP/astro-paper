/** @jsxImportSource astro */
import {
  createComponent,
  markHTMLString,
  render,
  renderJSX,
} from "astro/runtime/server/index.js";
import "../styles/guide-example-list.css";

const KANJI_RUN = /[\u3400-\u9fff々〆ヵヶ]+$/;
const INLINE_TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

function inlineMarkup(text) {
  if (!text) return [];

  const nodes = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code class="guide-example__inline-code">{token.slice(1, -1)}</code>
      );
    } else {
      nodes.push(<strong>{token.slice(2, -2)}</strong>);
    }
    cursor = index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function japaneseText(text) {
  if (!text) return "";

  const nodes = [];
  const annotation = /\[([^\]]+)\]/g;
  let cursor = 0;
  let match;

  while ((match = annotation.exec(text))) {
    const before = text.slice(cursor, match.index);
    const base = before.match(KANJI_RUN);

    if (!base) {
      nodes.push(before, match[0]);
      cursor = match.index + match[0].length;
      continue;
    }

    const baseStart = match.index - base[0].length;
    nodes.push(text.slice(cursor, baseStart));
    nodes.push(
      <ruby>
        {base[0]}
        <rp>(</rp>
        <rt>{match[1]}</rt>
        <rp>)</rp>
      </ruby>
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function BookmarkIcon() {
  return (
    <svg
      class="guide-example__bookmark"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2v8l3-3 3 3V2" />
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18l-7-4-7 4V4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ExplanationIcon() {
  return (
    <span class="guide-item-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    </span>
  );
}

const GuideExampleList = createComponent(async (result, props) => {
  const items = Array.isArray(props.items) ? props.items : [];

  const content = (
    <div class="guide-example-list">
      {items.map((item, index) => {
        if (item?.type === "explanation") {
          return (
            <div class="guide-example-row guide-example-row--explanation">
              <ExplanationIcon />
              <p class="guide-explanation__body">
                <span class="guide-explanation__label">讲解</span>
                <span class="guide-explanation__text">
                  {inlineMarkup(item.text)}
                </span>
              </p>
            </div>
          );
        }

        const noteId = `guide-note-${String(item?.id ?? index).replace(
          /[^a-zA-Z0-9_-]/g,
          "-"
        )}`;

        return (
          <div class="guide-example-row">
            <article class="guide-example" data-example-id={item?.id}>
              <BookmarkIcon />
              <div class="guide-example__text">
                {item?.id && (
                  <span class="guide-example__index">{item.id}</span>
                )}
                <span class="guide-example__sentence" lang="ja">
                  {japaneseText(item?.ja)}
                </span>
                {item?.source && (
                  <span class="guide-example__source">{item.source}</span>
                )}
              </div>
              {item?.note && (
                <span class="guide-example__note">
                  <button
                    type="button"
                    aria-label="查看例句讲解"
                    aria-describedby={noteId}
                  >
                    <InfoIcon />
                  </button>
                  <span
                    class="guide-example__tooltip"
                    role="tooltip"
                    id={noteId}
                  >
                    <span class="guide-example__tooltip-label">悬浮解说</span>
                    <span>{inlineMarkup(item.note)}</span>
                  </span>
                </span>
              )}
              {item?.zh && (
                <p class="guide-example__translation">
                  <span class="guide-example__label">译文</span>
                  <span>{inlineMarkup(item.zh)}</span>
                </p>
              )}
            </article>
          </div>
        );
      })}
    </div>
  );

  return render`${markHTMLString(await renderJSX(result, content))}`;
});

export default GuideExampleList;
