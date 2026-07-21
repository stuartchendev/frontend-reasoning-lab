import type {
  PracticeSessionFailure,
  PracticeSessionState,
} from "./practiceSession";

export function selectCanSubmitAnswer(
  state: PracticeSessionState,
): boolean {
  return state.phase === "answering" && Boolean(state.answerDraft.trim());
}

export function selectCanSubmitRevision(
  state: PracticeSessionState,
): boolean {
  return state.phase === "revising" && Boolean(state.revisionDraft.trim());
}

export function selectIsPracticeSessionBusy(
  state: PracticeSessionState,
): boolean {
  return state.phase === "diagnosing" || state.phase === "reviewing-revision";
}

export function selectPracticeSessionFailure(
  state: PracticeSessionState,
): PracticeSessionFailure | null {
  if (
    state.phase === "diagnosis-failed" ||
    state.phase === "revision-review-failed"
  ) {
    return state.failure;
  }

  return null;
}
