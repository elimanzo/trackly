import { redirect } from 'next/navigation'

// Root redirects to the app — the (app) layout handles auth/onboarding guards
export default function RootPage() {
  redirect('/dashboard')
}
