import { describe, expect, it, vi } from "vitest";
import { useToast } from "./chrome";

describe("useToast", () => {
  it("shows a message and clears it after the delay", () => {
    vi.useFakeTimers();
    const { toast, say, clearToast } = useToast(1000);
    say("추가했어요");
    expect(toast.value).toBe("추가했어요");
    vi.advanceTimersByTime(1000);
    expect(toast.value).toBe("");
    say("다시");
    clearToast();
    expect(toast.value).toBe("");
    vi.useRealTimers();
  });
});
