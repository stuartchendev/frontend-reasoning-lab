import type { SelectedContent } from "../types/navigation";

type StaticNavgationItem = {
  label: string;
  content: SelectedContent;
}

export const staticNavigationItems = [
  {
    label: "Overview",
    content: {type:"overview"},
  },
] satisfies StaticNavgationItem[];
