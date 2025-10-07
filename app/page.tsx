import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Restaurant Admin</h1>
      <p className="text-lg mb-8 max-w-md">A modern restaurant management dashboard built with Next.js, Tailwind CSS, and Supabase</p>
      <Link href="/admin">
        <Button size="lg">Go to Admin Dashboard</Button>
      </Link>
    </div>
  )
}

