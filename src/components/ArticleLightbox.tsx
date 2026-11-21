"use client";

import { useEffect, useState } from "react";

/**
 * 記事本文の画像（ハスミのアイコン以外）をクリック／タップすると
 * 原寸大でポップアップ表示するライトボックス。
 */
export function ArticleLightbox() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const handlers: { img: HTMLImageElement; onClick: () => void }[] = [];

    document
      .querySelectorAll<HTMLImageElement>(".article-body img")
      .forEach((img) => {
        const rawSrc = img.getAttribute("src") ?? img.src;
        if (rawSrc.includes("hasumi-icon")) return;
        if (img.closest(".hasumi-comment")) return;

        const onClick = () => setSrc(rawSrc.split("?")[0]);
        img.classList.add("article-lightbox-target");
        img.addEventListener("click", onClick);
        handlers.push({ img, onClick });
      });

    return () => {
      handlers.forEach(({ img, onClick }) => {
        img.removeEventListener("click", onClick);
        img.classList.remove("article-lightbox-target");
      });
    };
  }, []);

  useEffect(() => {
    if (!src) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSrc(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [src]);

  if (!src) return null;

  return (
    <div
      className="article-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="画像の拡大表示"
      onClick={() => setSrc(null)}
    >
      <button
        type="button"
        className="article-lightbox-close"
        aria-label="閉じる"
        onClick={() => setSrc(null)}
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
    </div>
  );
}
