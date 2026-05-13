import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";
import {
  lessons,
  getLesson,
  getNextLesson,
  getPreviousLesson,
} from "@/lib/learn/curriculum";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const lesson = getLesson(params.slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} | Trainer School`,
    description: `${lesson.title} — a Trainer School lesson on TCG Dexter.`,
  };
}

/* Tailwind-tokened MDX component overrides. The lesson MDX files are plain
   markdown today (no custom components), so we only need to style the basic
   element set: headings, paragraphs, lists, code, links, images. */
const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="text-3xl font-bold text-text-primary mt-2 mb-5 leading-tight"
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="text-xl font-bold text-text-primary mt-8 mb-3"
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="text-lg font-semibold text-text-primary mt-6 mb-2"
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className="leading-relaxed mb-4 text-text-secondary"
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="list-disc pl-6 mb-4 space-y-1.5 text-text-secondary marker:text-text-muted"
      {...props}
    />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol
      className="list-decimal pl-6 mb-4 space-y-1.5 text-text-secondary marker:text-text-muted"
      {...props}
    />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="text-text-primary font-semibold" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className="border-l-2 border-accent pl-4 my-4 text-text-secondary italic"
      {...props}
    />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-border" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="bg-white border border-border rounded-lg p-4 overflow-x-auto text-xs sm:text-sm font-mono text-text-primary mb-5 leading-relaxed"
      {...props}
    />
  ),
  code: ({
    className,
    ...rest
  }: React.HTMLAttributes<HTMLElement> & { className?: string }) =>
    className ? (
      // Fenced block — let <pre> styling wrap us.
      <code className={className} {...rest} />
    ) : (
      <code
        className="bg-surface px-1.5 py-0.5 rounded text-[0.9em] font-mono text-text-primary"
        {...rest}
      />
    ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-accent hover:text-accent-dark underline underline-offset-2"
      {...props}
    />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      className="rounded-lg my-5 mx-auto max-w-[220px] warm-shadow"
      loading="lazy"
      {...props}
    />
  ),
};

export default async function LessonPage({
  params,
}: {
  params: { slug: string };
}) {
  const lesson = getLesson(params.slug);
  if (!lesson) notFound();

  const filePath = path.join(
    process.cwd(),
    "app/learn/(content)",
    `${params.slug}.mdx`,
  );

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    notFound();
  }

  const { content: body } = matter(raw);
  const { content: mdx } = await compileMDX({
    source: body,
    components: mdxComponents,
  });

  const prev = getPreviousLesson(params.slug);
  const next = getNextLesson(params.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <nav className="text-xs text-text-muted mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/learn" className="hover:text-text-secondary">
          Trainer School
        </Link>
        <span aria-hidden>›</span>
        <span>
          Lesson {lesson.order} of {lessons.length}
        </span>
        <span className="ml-auto">{lesson.estimatedMinutes} min read</span>
      </nav>

      <article>{mdx}</article>

      <nav className="mt-10 pt-6 border-t border-border grid grid-cols-2 gap-3">
        {prev ? (
          <Link
            href={`/learn/${prev.slug}`}
            className="bg-white border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors min-w-0"
          >
            <div className="text-xs text-text-muted mb-1">← Previous</div>
            <div className="text-sm font-medium text-text-primary truncate">
              {prev.title}
            </div>
          </Link>
        ) : (
          <Link
            href="/learn"
            className="bg-white border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors min-w-0"
          >
            <div className="text-xs text-text-muted mb-1">← Back</div>
            <div className="text-sm font-medium text-text-primary truncate">
              Trainer School index
            </div>
          </Link>
        )}
        {next ? (
          <Link
            href={`/learn/${next.slug}`}
            className="bg-white border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors text-right min-w-0"
          >
            <div className="text-xs text-text-muted mb-1">Next →</div>
            <div className="text-sm font-medium text-text-primary truncate">
              {next.title}
            </div>
          </Link>
        ) : (
          <Link
            href="/"
            className="bg-accent text-white rounded-lg px-4 py-3 hover:bg-accent-dark transition-colors text-right min-w-0"
          >
            <div className="text-xs text-white/80 mb-1">You're ready →</div>
            <div className="text-sm font-semibold truncate">
              Profile your first deck
            </div>
          </Link>
        )}
      </nav>
    </main>
  );
}
