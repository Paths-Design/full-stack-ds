import { Calendar, PageNavigator, Pagination, Postcard, Stack } from "@full-stack-ds/react";
import { useState } from "react";
import type { Bundle } from "../types/data";

/**
 * Repo activity, rendered from build-time data (vite-plugin-fsds-data):
 * recent commits and CAWS spec events as Postcards, with a Calendar strip
 * marking the days that produced them.
 */
export function ActivityView({ bundle }: { bundle: Bundle }) {
  const events = bundle.activity ?? [];
  const [requestedPage, setPage] = useState(0);
  const pageSize = 12;
  const pageCount = Math.ceil(events.length / pageSize);
  const page = Math.min(requestedPage, Math.max(0, pageCount - 1));
  const visibleEvents = events.slice(page * pageSize, (page + 1) * pageSize);
  const dayStamps = Array.from(
    new Set(events.map((e) => e.timestamp.slice(0, 10))),
  )
    .sort()
    .map((day) => new Date(`${day}T12:00:00`));

  return (
    <div className="page">
      <p className="page-eyebrow">Repository</p>
      <h1 className="page-title">Activity</h1>
      <p className="page-lede">
        Censused from the repo at build time — every entry below is a real
        commit or CAWS spec event, newest first.
      </p>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Recent days</h2>
          <span className="section-meta">{dayStamps.length} active days</span>
        </Stack>
        <Calendar days={dayStamps} aria-label="Days with recorded activity" />
      </section>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Feed</h2>
          <span className="section-meta">{events.length} events</span>
        </Stack>
        <Stack className="stack-gap-05" style={{ maxWidth: 720 }}>
          {events.length === 0 && (
            <p className="muted">No activity recorded at build time.</p>
          )}
          {visibleEvents.map((e) => (
            <Postcard
              key={e.id}
              postId={e.id}
              author={{ name: e.author, handle: e.author, avatar: "" }}
              timestamp={new Date(e.timestamp).toLocaleString()}
              stats={{ likes: e.stats.commits, replies: e.stats.replies, reposts: e.stats.reposts }}
            >
              <strong>{e.kind === "spec" ? "Spec · " : "Commit · "}</strong>
              {e.title}
            </Postcard>
          ))}
        </Stack>
        {pageCount > 1 && <PageNavigator pageCount={pageCount} label="Activity page navigation" index={page} onIndexChange={setPage} />}
        {pageCount > 1 && <Pagination
          pages={Array.from({ length: pageCount }, (_, index) => String(index + 1))}
          presentation="pages" label="Activity pages" index={page} onIndexChange={setPage}
        />}
      </section>
    </div>
  );
}
