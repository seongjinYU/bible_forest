// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, within, fireEvent } from "@testing-library/react";
import EarnedItemDialog from "@/components/forest/EarnedItemDialog";

// base-ui Dialog는 배경 콘텐츠를 inert 스냅샷으로 복제해두기 때문에
// screen(document 전역) 쿼리는 텍스트가 중복 매칭된다. dialog role 안으로 스코프를 좁혀서 조회한다.
function getDialog() {
  return within(document.body).getByRole("dialog");
}

describe("EarnedItemDialog", () => {
  it("B등급 species는 일반 획득 문구를 보여준다 (forest species=1)", () => {
    render(<EarnedItemDialog theme="forest" species={["1"]} onClose={vi.fn()} />);
    expect(within(getDialog()).getByText("와! 새로운 아이템을 획득했어요!")).toBeInTheDocument();
  });

  it("A등급 species는 귀한 아이템 문구를 보여준다 (forest species=11)", () => {
    render(<EarnedItemDialog theme="forest" species={["11"]} onClose={vi.fn()} />);
    expect(within(getDialog()).getByText("오! 귀한 아이템을 획득했어요!")).toBeInTheDocument();
  });

  it("S등급 species는 전설 문구를 보여준다 (forest species=20)", () => {
    render(<EarnedItemDialog theme="forest" species={["20"]} onClose={vi.fn()} />);
    expect(within(getDialog()).getByText("✨ 전설의 아이템 등장! ✨")).toBeInTheDocument();
  });

  it("여러 개 획득 시 진행 표시(index/total)를 보여주고, 다음 클릭 시 다음 아이템으로 넘어간다", () => {
    render(<EarnedItemDialog theme="forest" species={["1", "11"]} onClose={vi.fn()} />);
    const dialog = within(getDialog());
    expect(dialog.getByText("1 / 2")).toBeInTheDocument();
    expect(dialog.getByText("와! 새로운 아이템을 획득했어요!")).toBeInTheDocument();

    fireEvent.click(dialog.getByText("다음"));

    const dialogAfter = within(getDialog());
    expect(dialogAfter.getByText("2 / 2")).toBeInTheDocument();
    expect(dialogAfter.getByText("오! 귀한 아이템을 획득했어요!")).toBeInTheDocument();
  });

  it("마지막 아이템에서는 버튼 텍스트가 '확인'이고 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<EarnedItemDialog theme="forest" species={["1"]} onClose={onClose} />);

    fireEvent.click(within(getDialog()).getByText("확인"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("X 버튼을 클릭하면 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<EarnedItemDialog theme="forest" species={["1"]} onClose={onClose} />);

    const closeButton = within(getDialog()).getAllByRole("button")[0];
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
