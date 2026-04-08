import { EASidebar } from '@/components/ea-sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <EASidebar />
      <main className="flex-1 md:p-8 p-4 mt-14 md:mt-0 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
