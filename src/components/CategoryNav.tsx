"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BlogCategory } from "@/types/blog";

type CategoryNavProps = {
  categories: BlogCategory[];
  activeCategoryId?: string;
};

type CategoryItem = {
  id: string;
  href: string;
  name: string;
};

const linkClassName = (current: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
    current
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
  }`;

export function CategoryNav({ categories, activeCategoryId }: CategoryNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocus = useRef(false);
  const items = categoryItems(categories);
  const activeName = items.find((item) => item.id === activeCategoryId)?.name;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    function onChange(event: MediaQueryListEvent) {
      if (!event.matches) return;
      shouldRestoreFocus.current = false;
      setOpen(false);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) {
      if (shouldRestoreFocus.current) {
        buttonRef.current?.focus();
        shouldRestoreFocus.current = false;
      }
      return;
    }

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const siblings = [...document.body.children].filter(
      (element) => element !== overlay,
    );
    siblings.forEach((element) => {
      element.setAttribute("inert", "");
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        shouldRestoreFocus.current = true;
        setOpen(false);
        return;
      }
      if (event.key === "Tab") {
        trapTab(event, panel);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      siblings.forEach((element) => {
        element.removeAttribute("inert");
      });
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openMenu() {
    shouldRestoreFocus.current = true;
    setOpen(true);
  }

  function closeMenu() {
    shouldRestoreFocus.current = true;
    setOpen(false);
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-6 min-w-0 bg-zinc-50 px-6 py-3 md:hidden dark:bg-zinc-950">
        <button
          ref={buttonRef}
          type="button"
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-left text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="dialog"
          onClick={open ? closeMenu : openMenu}
        >
          <MenuIcon />
          <span className="text-sm font-semibold">カテゴリー</span>
          {activeName ? (
            <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {activeName}
            </span>
          ) : null}
        </button>
      </div>

      <aside className="hidden md:sticky md:top-8 md:block">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
          カテゴリー
        </h2>
        <nav aria-label="カテゴリー" className="mt-3 flex flex-col gap-1">
          {items.map((item) => (
            <CategoryLink
              key={item.id}
              href={item.href}
              current={item.id === activeCategoryId}
            >
              {item.name}
            </CategoryLink>
          ))}
        </nav>
      </aside>

      {open
        ? createPortal(
            <MobileCategoryDrawer
              overlayRef={overlayRef}
              panelRef={panelRef}
              menuId={menuId}
              titleId={titleId}
              items={items}
              activeCategoryId={activeCategoryId}
              onClose={closeMenu}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function MobileCategoryDrawer({
  overlayRef,
  panelRef,
  menuId,
  titleId,
  items,
  activeCategoryId,
  onClose,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  menuId: string;
  titleId: string;
  items: CategoryItem[];
  activeCategoryId?: string;
  onClose: () => void;
}) {
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50">
      <div
        className="category-backdrop absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="category-drawer absolute inset-y-0 left-0 flex w-[min(85vw,20rem)] flex-col bg-white text-zinc-900 shadow-xl outline-none dark:bg-zinc-950 dark:text-zinc-50"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 dark:border-zinc-800">
          <h2 id={titleId} className="text-sm font-semibold">
            カテゴリー
          </h2>
          <button
            type="button"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100"
            aria-label="カテゴリーメニューを閉じる"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <nav
          aria-label="カテゴリー"
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {items.map((item) => (
            <CategoryLink
              key={item.id}
              href={item.href}
              current={item.id === activeCategoryId}
              onNavigate={onClose}
              className="flex min-h-11 items-center"
            >
              {item.name}
            </CategoryLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function CategoryLink({
  href,
  current,
  children,
  onNavigate,
  className,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={`${linkClassName(current)} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

function categoryItems(categories: BlogCategory[]): CategoryItem[] {
  return [
    { id: "all", href: "/", name: "すべて" },
    ...categories.map((category) => ({
      id: category.id,
      href: `/?category=${category.id}`,
      name: category.name,
    })),
  ];
}

function tabbables(panel: HTMLElement) {
  return [
    ...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
  ].filter((element) => element.tabIndex >= 0);
}

function trapTab(event: KeyboardEvent, panel: HTMLElement | null) {
  if (!panel) return;

  const items = tabbables(panel);
  if (items.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === panel || !panel.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !panel.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
