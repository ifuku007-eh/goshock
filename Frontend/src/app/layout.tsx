import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GoShock — URL Shortener",
  description: "Pemendek URL cepat dengan QR Code. Login untuk mulai.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark">
      <body>{children}</body>
    </html>
  )
}
