// ┌─────────────────────────────────────────────────────────────────┐
// │  /forests 페이지에서 쓰는 순수 집계/정렬 로직.                     │
// │  DB 호출 없이 입력→출력만으로 결정되는 부분만 여기 모아 테스트한다. │
// └─────────────────────────────────────────────────────────────────┘

export type PlantedTree = { species: string; x: number; y: number };
export type TeamStat = {
  id: string;
  name: string;
  score: number;
  tree_count: number;
  theme: string | null;
  plantedTrees: PlantedTree[];
};

type TeamRow = { id: string; name: string; theme: string | null };
type TreeRow = { team_id: string; species: string; x: number; y: number };
type UserRow = { team_id: string; bible_progress: { count: number }[] };

/** 팀/나무/유저 원본 row로부터 팀별 점수·나무 개수를 집계한다. */
export function computeTeamStats(
  teams: TeamRow[],
  trees: TreeRow[],
  users: UserRow[]
): TeamStat[] {
  return teams.map((team) => {
    const teamUsers = users.filter((u) => u.team_id === team.id);
    const score = teamUsers.reduce((sum, u) => sum + (u.bible_progress[0]?.count ?? 0), 0);
    const teamTrees = trees.filter((t) => t.team_id === team.id);
    const plantedTrees = teamTrees.map(({ species, x, y }) => ({ species, x, y }));
    return {
      id: team.id,
      name: team.name,
      score,
      tree_count: teamTrees.length,
      theme: team.theme ?? null,
      plantedTrees,
    };
  });
}

/**
 * 팀 순위 정렬. 점수 내림차순만 기준으로 하며, 특정 팀(내 팀 등)을
 * 최상단에 강제 배치하지 않는다 — 과거 이 로직이 잘못 들어가 실제 순위와
 * 어긋난 적이 있었다.
 */
export function sortTeamsByScore(teams: TeamStat[]): TeamStat[] {
  return [...teams].sort((a, b) => b.score - a.score);
}
