import { redirect } from "next/navigation";
import { AuthScreen } from "@/features/auth/screens/auth-screen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  if (params?.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`);
  }
  return <AuthScreen mode="login" initialError={params?.error} />;
}
