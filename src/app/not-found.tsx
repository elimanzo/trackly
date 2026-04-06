import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-muted-foreground text-6xl font-bold">404</p>
      <h1 className="text-foreground text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/orgs"
        className="text-primary mt-2 text-sm font-medium underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
