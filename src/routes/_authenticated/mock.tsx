import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mock")({
  beforeLoad: () => { throw redirect({ to: "/practice", replace: true, statusCode: 301 }); },
});

