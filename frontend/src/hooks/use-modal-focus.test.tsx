import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { expect, it } from "vitest";

import { useModalFocus } from "./use-modal-focus";

function FocusDrawer() {
  const [tick, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useModalFocus({
    active: true,
    containerRef: panelRef,
    initialFocusRef: closeRef,
    onEscape: () => undefined,
  });

  return <>
    <button onClick={() => setTick((value) => value + 1)}>rerender {tick}</button>
    <div ref={panelRef} tabIndex={-1}>
      <button ref={closeRef}>닫기</button>
      <button>답안 40</button>
    </div>
  </>;
}

it("keeps the reader's focus when an open drawer rerenders", () => {
  render(<FocusDrawer />);
  const answer = screen.getByRole("button", { name: "답안 40" });
  answer.focus();

  fireEvent.click(screen.getByRole("button", { name: /rerender/ }));

  expect(document.activeElement).toBe(answer);
});
