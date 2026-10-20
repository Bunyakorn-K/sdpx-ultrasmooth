import { redirect } from "next/navigation";
import { LandingScreen } from "@/features/landing/screens/landing-screen";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  if (params?.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }
  return <LandingScreen />;
}
