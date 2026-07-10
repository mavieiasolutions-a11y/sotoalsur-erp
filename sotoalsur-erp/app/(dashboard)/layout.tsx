'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { AIChat } from '@/components/layout/AIChat'
import { Sparkles } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-b border-border/30 h-16 glass flex-shrink-0">
          <button
            id="ai-chat-toggle-btn"
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              text-primary border border-primary/30 hover:bg-primary/10
              transition-colors duration-150"
            style={{
              background: 'linear-gradient(135deg, oklch(0.62 0.22 264 / 0.1), oklch(0.58 0.24 300 / 0.1))',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Asistente IA
          </button>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* AI Chat Panel */}
      <AIChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Overlay when chat is open */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
