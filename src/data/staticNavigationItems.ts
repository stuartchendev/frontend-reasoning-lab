import { reactStateOwnershipQuestion } from "../domain/v3/questionContent";
import type { SelectedContent } from "../types/navigation";

type StaticNavigationItem = {
  label: string;
  content: SelectedContent;
}

export const staticNavigationItems = [
  {
    label: "Overview",
    content: { type: "overview" },
  },
  {
    label: `Featured: ${reactStateOwnershipQuestion.title}`,
    content: {
      type: "question",
      questionId: reactStateOwnershipQuestion.id,
    },
  },
] satisfies StaticNavigationItem[];
