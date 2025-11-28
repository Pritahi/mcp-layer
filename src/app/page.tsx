import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-4xl font-bold leading-10 tracking-tight text-zinc-50">
            MCP Guard
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-400">
            Secure API key proxy and management system. Protect your API keys with advanced monitoring and access control.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link href="/login">
            <Button className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-50 px-8 text-zinc-950 transition-colors hover:bg-zinc-200 md:w-auto">
              Get Started
            </Button>
          </Link>
          <Link href="/projects">
            <Button className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-800 bg-transparent px-8 text-zinc-50 transition-colors hover:bg-zinc-900 md:w-auto">
              Projects
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}