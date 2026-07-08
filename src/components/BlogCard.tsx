import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/date";
import type { Blog } from "@/types/blog";

type BlogCardProps = {
  blog: Blog;
};

export function BlogCard({ blog }: BlogCardProps) {
  return (
    <article className="group">
      <Link href={`/blog/${blog.id}`} className="block">
        {blog.eyecatch && (
          <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
            <Image
              src={blog.eyecatch.url}
              alt={blog.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
        )}
        <time
          dateTime={blog.publishedAt ?? blog.createdAt}
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {formatDate(blog.publishedAt ?? blog.createdAt)}
        </time>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
          {blog.title}
        </h2>
      </Link>
    </article>
  );
}
