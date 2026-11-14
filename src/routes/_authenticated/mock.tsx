import { createFileRoute } from "@tanstack/react-router";
import { TestArchive } from "@/components/app/TestArchive";

export const Route = createFileRoute("/_authenticated/mock")({
  head: () => ({ meta: [{ title: "Test Archive · SciOly Center" }, { name: "description", content: "Browse past Science Olympiad tests and answer keys by event, division, season and tournament." }, { property: "og:title", content: "Test Archive · SciOly Center" }, { property: "og:description", content: "Past tournament tests and answer keys." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TestArchive,
});

