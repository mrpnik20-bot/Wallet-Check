import { createFileRoute, redirect } from "@tanstack/react-router";

// There is no account sign-up: wallets open with a recovery phrase and a PIN.
export const Route = createFileRoute("/register")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/setup", replace: true });
  },
});