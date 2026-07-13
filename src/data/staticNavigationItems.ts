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
] satisfies StaticNavigationItem[];
