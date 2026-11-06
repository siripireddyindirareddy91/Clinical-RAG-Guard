import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Page not found</h1>
      <Link href="/overview">Return to workspace →</Link>
    </main>
  );
}
