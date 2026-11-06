'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="error-page"><h1>Unable to load this workspace</h1><p>Please retry. Your saved evidence remains in the database.</p><button onClick={reset}>Try again</button></main>;}
