import { describe, it, expect } from "vitest";
import { computeTeamStats, sortTeamsByScore, type TeamStat } from "@/app/forests/team-stats";

describe("computeTeamStats", () => {
  it("팀별로 유저 점수(bible_progress count)를 합산한다", () => {
    const teams = [{ id: "t1", name: "1팀", theme: "forest" }];
    const users = [
      { team_id: "t1", bible_progress: [{ count: 30 }] },
      { team_id: "t1", bible_progress: [{ count: 20 }] },
      { team_id: "t2", bible_progress: [{ count: 999 }] }, // 다른 팀 — 섞이면 안 됨
    ];
    const result = computeTeamStats(teams, [], users);
    expect(result).toEqual([
      { id: "t1", name: "1팀", score: 50, tree_count: 0, theme: "forest", plantedTrees: [] },
    ]);
  });

  it("bible_progress가 빈 배열이면 점수 0으로 취급한다", () => {
    const teams = [{ id: "t1", name: "1팀", theme: null }];
    const users = [{ team_id: "t1", bible_progress: [] }];
    const result = computeTeamStats(teams, [], users);
    expect(result[0].score).toBe(0);
  });

  it("팀별로 심어진 나무 개수와 목록을 집계한다", () => {
    const teams = [{ id: "t1", name: "1팀", theme: "forest" }];
    const trees = [
      { team_id: "t1", species: "1", x: 10, y: 20 },
      { team_id: "t1", species: "2", x: 30, y: 40 },
      { team_id: "t2", species: "99", x: 0, y: 0 }, // 다른 팀 — 섞이면 안 됨
    ];
    const result = computeTeamStats(teams, trees, []);
    expect(result[0].tree_count).toBe(2);
    expect(result[0].plantedTrees).toEqual([
      { species: "1", x: 10, y: 20 },
      { species: "2", x: 30, y: 40 },
    ]);
  });

  it("theme이 null/undefined면 null로 정규화한다", () => {
    const teams = [{ id: "t1", name: "1팀", theme: null }];
    const result = computeTeamStats(teams, [], []);
    expect(result[0].theme).toBeNull();
  });
});

describe("sortTeamsByScore", () => {
  function team(id: string, score: number): TeamStat {
    return { id, name: id, score, tree_count: 0, theme: null, plantedTrees: [] };
  }

  it("점수 내림차순으로 정렬한다", () => {
    const teams = [team("a", 10), team("b", 50), team("c", 30)];
    const result = sortTeamsByScore(teams);
    expect(result.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("배열 순서와 무관하게 오직 점수만으로 정렬한다 (특정 팀 우선 배치 없음)", () => {
    // 과거 버그: 'My팀'을 항상 맨 앞에 두던 로직이 있었다. 순수 점수 정렬만 해야 한다.
    const myTeam = team("my-team", 5); // 낮은 점수인데 배열 맨 앞에 위치
    const teams = [myTeam, team("b", 100), team("c", 80)];
    const result = sortTeamsByScore(teams);
    expect(result.map((t) => t.id)).toEqual(["b", "c", "my-team"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const teams = [team("a", 10), team("b", 50)];
    const original = [...teams];
    sortTeamsByScore(teams);
    expect(teams).toEqual(original);
  });

  it("빈 배열을 그대로 처리한다", () => {
    expect(sortTeamsByScore([])).toEqual([]);
  });

  it("동점일 때도 에러 없이 처리한다", () => {
    const teams = [team("a", 10), team("b", 10)];
    const result = sortTeamsByScore(teams);
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.score === 10)).toBe(true);
  });
});
