import { createFileRoute, redirect } from "@tanstack/react-router";

// The app opens straight into the wallet's seed-phrase + PIN screen — no account login.
export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/setup", replace: true });
  },
});