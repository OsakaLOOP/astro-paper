export const bangumiTypes: Record<number, string> = {
  1: "书籍",
  2: "动画",
  3: "音乐",
  4: "游戏",
  6: "三次元",
};

export function collectionStatus(type: number, status: number) {
  const verb =
    ({ 1: "读", 3: "听", 4: "玩" } as Record<number, string>)[type] ?? "看";
  return (
    ["", `想${verb}`, `${verb}过`, `在${verb}`, "搁置", "抛弃"][status] ?? ""
  );
}

export function collectionProgress(
  type: number,
  episodes: number,
  volumes: number,
  totalEpisodes: number,
  totalVolumes: number
) {
  const unit =
    ({ 1: "话", 3: "曲", 4: "章" } as Record<number, string>)[type] ?? "集";
  return [
    episodes
      ? `${episodes}${totalEpisodes ? ` / ${totalEpisodes}` : ""} ${unit}`
      : "",
    volumes ? `${volumes}${totalVolumes ? ` / ${totalVolumes}` : ""} 卷` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
