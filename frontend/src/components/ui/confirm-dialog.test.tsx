import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("supports an explicit confirmation and Escape cancellation", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog confirmLabel="Run" description="Description" onCancel={onCancel} onConfirm={onConfirm} open title="Confirm action" />,
    );

    expect(screen.getByRole("button", { name: "Run" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(<ConfirmDialog confirmLabel="Run" description="Description" onCancel={onCancel} onConfirm={onConfirm} open={false} title="Confirm action" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a pending confirmation open when Escape or the backdrop is used", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog confirmLabel="Run" description="Description" loading onCancel={onCancel} onConfirm={vi.fn()} open title="Confirm action" />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
