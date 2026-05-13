import Dashboard from "@/components/Dashboard"

export const metadata = {
  title: "Dashboard - GoShock",
  description: "Semua link pendek, statistik klik, dan status expiry.",
}

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen px-4 py-8 md:py-12">
      <Dashboard />
    </main>
  )
}
