"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, LockKeyhole, Mail, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login, register } from "@/lib/api"

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [showRegister, setShowRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState("")
  const [registerError, setRegisterError] = useState("")

  useEffect(() => {
    if (localStorage.getItem("goshock_token")) router.replace("/dashboard")
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await login(email.trim(), password)
      localStorage.setItem("goshock_token", data.token)
      localStorage.setItem("goshock_username", data.username)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegisterError("")
    setRegistering(true)
    try {
      const data = await register(username.trim(), registerEmail.trim(), registerPassword)
      localStorage.setItem("goshock_token", data.token)
      localStorage.setItem("goshock_username", data.username)
      router.replace("/dashboard")
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Register gagal")
    } finally {
      setRegistering(false)
    }
  }

  return (
    <main className="relative min-h-screen px-4 py-10">
      <div className="z-content mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <h1 className="font-display text-6xl font-extrabold leading-none">
            Go<span className="text-primary">Shock</span>
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[3px] text-muted-foreground">
            Login untuk mulai shorten URL
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-lg border border-border/70 bg-card/85 p-5 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background/60 pl-9 font-mono text-sm"
                  placeholder="nama@email.com"
                  required
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background/60 pl-9 font-mono text-sm"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full font-display font-bold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Masuk <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <p className="font-mono text-xs text-muted-foreground">Belum punya akun?</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRegister(true)} className="font-mono text-xs">
              Register
            </Button>
          </div>
        </form>
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <form onSubmit={handleRegister} className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Buat akun</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">Register tetap di modal login.</p>
              </div>
              <button type="button" onClick={() => setShowRegister(false)} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 bg-background/60 pl-9 font-mono text-sm" placeholder="username" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="h-11 bg-background/60 pl-9 font-mono text-sm" placeholder="email" required />
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="h-11 bg-background/60 pl-9 font-mono text-sm" placeholder="password" required />
              </div>

              {registerError && (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                  {registerError}
                </div>
              )}

              <Button type="submit" disabled={registering} className="h-11 w-full font-display font-bold">
                {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Daftar dan masuk"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
