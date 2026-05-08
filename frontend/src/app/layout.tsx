/**
 * AnimaStudio — 루트 레이아웃
 * 사이드바 + 파이프라인 헤더를 포함한 전체 앱 셸
 */
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/ui/Sidebar'
import PipelineHeader from '@/components/pipeline/PipelineHeader'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'AnimaStudio | AI 동물 영상 자동화',
  description: '사내 마케팅팀 전용 AI 동물 홍보 영상 제작 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex h-screen overflow-hidden bg-cream-100">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              background: '#1a1a1a',
              color: '#f9f6ee',
              borderRadius: '10px',
            },
          }}
        />

        {/* ── 사이드바 ── */}
        <Sidebar />

        {/* ── 메인 영역 ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <PipelineHeader />
          <main className="flex-1 overflow-y-auto p-6 bg-cream-100">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
