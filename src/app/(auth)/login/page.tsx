import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { devAdminEnabled } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" devAdmin={devAdminEnabled()} />
    </Suspense>
  );
}
