"use client";

import {
  FormEvent,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FaGithub } from "react-icons/fa6";
import { SiLeetcode } from "react-icons/si";
import { submitFeedback } from "@/lib/feedback";

type FooterPanel = "about" | "terms" | "contact";
type ContactCategory = "bug" | "feedback" | "visual";
type SocialPlatform = "github" | "leetcode";

type CreatorSocial = {
  platform: SocialPlatform;
  href: string;
};

type CreatorProfile = {
  name: string;
  degree: string;
  role: string;
  bio: string;
  initials: string;
  socials: CreatorSocial[];
};

const SOCIAL_CONFIG: Record<
  SocialPlatform,
  { label: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  github: { label: "GitHub", Icon: FaGithub },
  leetcode: { label: "LeetCode", Icon: SiLeetcode },
};

const CREATORS: CreatorProfile[] = [
  {
    name: "Christian Dedios",
    degree: "B.S. Computer Science & Systems",
    role: "Backend",
    bio: "Built the game's core logic and infrastructure — real-time multiplayer, matchmaking, and reconnect handling — plus major pieces of the frontend architecture.",
    initials: "CD",
    socials: [
      { platform: "github", href: "https://github.com/ChristianDedios23" },
      { platform: "leetcode", href: "https://leetcode.com/u/Chris_dedios/" },
    ],
  },
  {
    name: "Kevin Lam",
    degree: "B.S. Computer Science & Systems",
    role: "Frontend",
    bio: "Built the Pokémon dataset via APIs and sprite pipeline, designed and refined the entire visual experience — board, themes, animations, and UI polish.",
    initials: "KL",
    socials: [
      { platform: "github", href: "https://github.com/kevlam1" },
      { platform: "leetcode", href: "https://leetcode.com/u/Kaneto/" },
    ],
  },
];

function CreatorSocialBar({ socials }: { socials: CreatorSocial[] }) {
  if (socials.length === 0) return null;

  return (
    <div className="mt-auto flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
      {socials.map((social) => {
        const { label, Icon } = SOCIAL_CONFIG[social.platform];
        return (
          <a
            key={`${social.platform}-${social.href}`}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden={true} />
          </a>
        );
      })}
    </div>
  );
}

function CreatorCard({ creator }: { creator: CreatorProfile }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/40">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold tracking-wide text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          aria-hidden="true"
        >
          {creator.initials}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {creator.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {creator.degree}
          </p>
          <span className="mt-1.5 inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            {creator.role}
          </span>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {creator.bio}
      </p>
      <CreatorSocialBar socials={creator.socials} />
    </article>
  );
}

/** Same shell/animation pattern as Themes / Rules / How to Play. */
function SiteInfoModal({
  panel,
  onClose,
}: {
  panel: FooterPanel | null;
  onClose: () => void;
}) {
  const [renderedPanel, setRenderedPanel] = useState(panel);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [category, setCategory] = useState<ContactCategory>("feedback");
  const [pokemonRef, setPokemonRef] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submittedNote, setSubmittedNote] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (panel) {
      setRenderedPanel(panel);
      setVisible(false);
      setSubmittedNote(null);
      setSubmitError(null);

      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setRenderedPanel(null), 180);
    return () => window.clearTimeout(timeout);
  }, [panel]);

  useEffect(() => {
    if (!renderedPanel) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renderedPanel, onClose]);

  if (!mounted || !renderedPanel) return null;

  const title =
    renderedPanel === "about"
      ? "About"
      : renderedPanel === "terms"
        ? "Terms"
        : "Contact / Report";

  async function handleContactSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitFeedback({
        category,
        message,
        pokemonRef: category === "visual" ? pokemonRef : undefined,
        email,
      });
      setSubmittedNote("Thanks — your message was sent. We'll take a look.");
      setMessage("");
      setPokemonRef("");
      setEmail("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Portal onto document.body with inline fixed centering — same viewport
  // overlay behavior as Themes / How to Play (not in the page/footer flow).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-info-title"
      className={`p-4 ${visible ? "" : "pointer-events-none"}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className={`relative z-10 w-full overflow-y-auto rounded-2xl border border-zinc-500 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 ${
          renderedPanel === "about"
            ? "max-h-[min(100%,40rem)] max-w-2xl"
            : "max-w-md"
        }`}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="site-info-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        {renderedPanel === "about" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Meet the makers of PokéGuess.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {CREATORS.map((creator) => (
                <CreatorCard key={creator.name} creator={creator} />
              ))}
            </div>
          </div>
        )}

        {renderedPanel === "terms" && (
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            PokéGuess is not produced, endorsed, supported, or affiliated with
            Nintendo, Game Freak, Creatures, Hasbro, or The Pokémon Company.
          </p>
        )}

        {renderedPanel === "contact" && (
          <form
            onSubmit={handleContactSubmit}
            className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <p>
              Send bug reports, general feedback, or notify us of Pokémon sprites
              that clip or sit oddly on the board.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-category"
                className="block text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
              >
                Category
              </label>
              <select
                id="contact-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ContactCategory)
                }
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="feedback">General feedback</option>
                <option value="bug">Bug report</option>
                <option value="visual">Visual / sprite clipping issue</option>
              </select>
            </div>

            {category === "visual" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-pokemon"
                  className="block text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
                >
                  Pokémon name or Pokédex #
                </label>
                <input
                  id="contact-pokemon"
                  type="text"
                  value={pokemonRef}
                  onChange={(event) => setPokemonRef(event.target.value)}
                  placeholder="e.g. Bramblin or 946"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500">
                  Note too-low / too-high placement, overflow outside the
                  circle, or other clipping.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="contact-message"
                className="block text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={
                  category === "bug"
                    ? "What happened, and what did you expect?"
                    : category === "visual"
                      ? "Describe the visual issue (and board theme if relevant)…"
                      : "What’s on your mind?"
                }
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-email"
                className="block text-[11px] font-semibold tracking-wide text-zinc-500 uppercase"
              >
                Email <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="If you’d like a reply later"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            {submittedNote && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
                {submittedNote}
              </p>
            )}

            {submitError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Owns main + thin footer + centered info modal.
 * Modal is a sibling of the footer (not inside it), matching Themes/Rules.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<FooterPanel | null>(null);

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>

      <footer className="shrink-0 border-t border-zinc-200/70 bg-white/70 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-5 px-6 py-3 text-xs text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => setPanel("about")}
            className="transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            About
          </button>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            ·
          </span>
          <button
            type="button"
            onClick={() => setPanel("terms")}
            className="transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Terms
          </button>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            ·
          </span>
          <button
            type="button"
            onClick={() => setPanel("contact")}
            className="transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Contact / Report
          </button>
        </div>
      </footer>

      <SiteInfoModal panel={panel} onClose={() => setPanel(null)} />
    </>
  );
}
