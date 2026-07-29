import type { SelectedContent } from "../types/navigation";

type StaticNavigationItem = {
  label: string;
  content: SelectedContent;
}

export const staticNavigationItems: StaticNavigationItem[] = [
  {
    label: "Overview",
    content: { type: "overview" },
  },
];
