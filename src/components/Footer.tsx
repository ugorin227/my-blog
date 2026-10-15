import Link from "next/link";
import { getCategories, isMicroCMSConfigured } from "@/lib/microcms";
import { SITE_NAME } from "@/lib/site";
import type { BlogCategory } from "@/types/blog";

const XI_URL = "https://x.com/xi_erg";

async function loadCategories(): Promise<BlogCategory[]> {
  if (!isMicroCMSConfigured) {
    return [];
  }

  try {
    return await getCategories();
  } catch {
    return [];
  }
}

export async function Footer() {
  const categories = await loadCategories();

  return (
    <footer className="bg-[#000000] text-[#FFFFFF]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link
            href="/"
            className="text-sm font-semibold text-[#FFFFFF] underline-offset-4 hover:underline"
          >
            {SITE_NAME}
          </Link>
          {categories.length > 0 ? (
            <nav aria-label="フッターのカテゴリー" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/?category=${category.id}`}
                  className="text-sm text-[#FFFFFF] underline-offset-4 hover:underline"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <p className="mt-8 text-sm">
          <a
            href={XI_URL}
            className="text-[#FFFFFF] underline-offset-4 hover:underline"
          >
            ©XI
          </a>
        </p>
      </div>
    </footer>
  );
}
