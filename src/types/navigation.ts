export type BlogNavItem = {
  id: string;
  title: string;
};

export type AdjacentBlogs = {
  newer: BlogNavItem | null;
  older: BlogNavItem | null;
};
