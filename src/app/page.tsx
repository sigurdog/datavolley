import { redirect } from "next/navigation";

// The proxy sends authenticated users to /dashboard and others to /login.
export default function Home() {
  redirect("/dashboard");
}
