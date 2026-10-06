import satori, { type SatoriOptions } from "satori";

type QqImageOptions = {
  title: string;
  footer: string;
  fonts: SatoriOptions["fonts"];
};

export async function renderQqImage({ title, footer, fonts }: QqImageOptions) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const titleWidth = 1056;
  let measuredWidth = 0;
  await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          fontFamily: "Google Sans Code, Noto Sans SC",
          fontSize: 100,
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: "nowrap",
        },
        children: normalizedTitle,
      },
    },
    {
      height: 140,
      fonts,
      onNodeDetected: node => {
        measuredWidth = node.width;
      },
    }
  );
  const fontSize = Math.min(
    960,
    ((titleWidth - 2) / (measuredWidth || 1)) * 100
  );

  return satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#fefbfb",
          fontFamily: "Google Sans Code, Noto Sans SC",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 48,
                left: 48,
                width: 1128,
                height: 1128,
                border: "4px solid #000",
                borderRadius: 4,
                background: "#ecebeb",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute",
                top: 24,
                left: 24,
                width: 1128,
                height: 1128,
                border: "4px solid #000",
                borderRadius: 4,
                background: "#fefbfb",
                alignItems: "center",
                justifyContent: "center",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: titleWidth,
                      justifyContent: "center",
                      fontSize,
                      fontWeight: 700,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    },
                    children: normalizedTitle,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute",
                      bottom: 36,
                      left: 32,
                      right: 32,
                      display: "flex",
                      justifyContent: "center",
                      fontSize: 28,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    },
                    children: footer,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 1200, embedFont: true, fonts }
  );
}
