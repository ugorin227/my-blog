"use client";

import { useState } from "react";
import { buildShareLinks } from "@/lib/share";

type ShareButtonsProps = {
  title: string;
  url: string;
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100";

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
      <path d="M18.24 2H21l-6.04 6.9L22.07 22H16.5l-4.36-5.7L7.16 22H4.4l6.45-7.37L4.03 2H9.74l3.94 5.21L18.24 2Zm-.97 17.7h1.53L8.9 4.18H7.26L17.27 19.7Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.78-3.91 1.09 0 2.23.2 2.23.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 fill-none stroke-current"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" />
    </svg>
  );
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const links = buildShareLinks(title, url);
  const [message, setMessage] = useState("");

  async function shareToInstagram() {
    setMessage("");

    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage(
        "リンクをコピーしました。Instagramアプリで貼り付けて投稿してください。",
      );
    } catch {
      setMessage(`このURLをコピーして投稿してください：${url}`);
    }
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="mt-14 border-t border-zinc-200 pt-8 dark:border-zinc-800"
    >
      <h2
        id="share-heading"
        className="text-center text-base font-semibold text-zinc-900 dark:text-zinc-50"
      >
        この記事をシェア
      </h2>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label="Xでこの記事をシェア"
        >
          <XIcon />
          X
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label="Facebookでこの記事をシェア"
        >
          <FacebookIcon />
          Facebook
        </a>
        <button
          type="button"
          onClick={shareToInstagram}
          className={buttonClass}
          aria-describedby="instagram-share-note"
        >
          <InstagramIcon />
          Instagram
        </button>
      </div>
      <p
        id="instagram-share-note"
        className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400"
      >
        Instagramは端末の共有メニューから投稿できます。
      </p>
      <p aria-live="polite" className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-300">
        {message}
      </p>
    </section>
  );
}
