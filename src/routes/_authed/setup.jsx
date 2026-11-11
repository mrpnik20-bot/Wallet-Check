import { createFileRoute } from "@tanstack/react-router";
import LoginScreen from "@/components/wallet/LoginScreen";

export const Route = createFileRoute("/_authed/setup")({
  ssr: false,
  head: () => ({ meta: [{ title: "Log in · Meridian" }] }),
  component: LoginScreen,
});