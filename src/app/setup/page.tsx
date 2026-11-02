export default function SetupPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold">Supabase is not configured</h1>
      <ol className="list-decimal space-y-2 pl-5 text-muted">
        <li>Create a free project at supabase.com.</li>
        <li>
          Open the SQL editor and run <code className="kbd">supabase/schema.sql</code>.
        </li>
        <li>
          Copy <code className="kbd">.env.example</code> to <code className="kbd">.env.local</code> and paste the
          project URL and anon key from Project Settings → API.
        </li>
        <li>
          Restart <code className="kbd">npm run dev</code>.
        </li>
      </ol>
    </main>
  );
}
