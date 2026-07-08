import type { MicroCMSDate, MicroCMSImage, MicroCMSListContent } from "microcms-js-sdk";

export type Blog = MicroCMSListContent &
  MicroCMSDate & {
    title: string;
    content: string;
    eyecatch?: MicroCMSImage;
  };

export type BlogListResponse = {
  contents: Blog[];
  totalCount: number;
  offset: number;
  limit: number;
};
