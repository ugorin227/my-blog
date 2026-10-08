import type { MicroCMSDate, MicroCMSImage, MicroCMSListContent } from "microcms-js-sdk";

export type BlogCategory = {
  id: string;
  name: string;
};

export type Blog = MicroCMSListContent &
  MicroCMSDate & {
    title: string;
    content: string;
    eyecatch?: MicroCMSImage;
    category?: BlogCategory | null;
  };

export type BlogListResponse = {
  contents: Blog[];
  totalCount: number;
  offset: number;
  limit: number;
};
