'use client'
/**
 * Sidebar — 사이드바 네비게이션
 * 파이프라인 6단계 + 프로젝트 관리 메뉴
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStudioStore, PIPELINE_STEPS, STEP_LABELS } from '@/lib/store'
import clsx from 'clsx'

// 단계별 아이콘 (SVG inline — Tabler 스타일)
const STEP_ICONS: Record<string, React.ReactNode> = {
  scenario:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6M7 8h10M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/>,
  character:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>,
  storyboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"/>,
  video:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>,
  voice:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z"/>,
  export:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>,
}

// 단계 완료 상태 배지
function StatusDot({ status }: { status: string }) {
  if (status === 'done')       return <span className="w-2 h-2 rounded-full bg-forest-400"/>
  if (status === 'generating') return <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
  if (status === 'error')      return <span className="w-2 h-2 rounded-full bg-red-400"/>
  return null
}

export default function Sidebar() {
  const pathname  = usePathname()
  const { project, setProjectName } = useStudioStore()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-ink-900 text-cream-50 select-none">
      {/* ── 로고 ── */}
      <div className="px-5 py-5 border-b border-ink-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <div>
            <p className="font-display text-base leading-tight text-cream-100">AnimaStudio</p>
            <p className="text-[11px] text-ink-400 mt-0.5">AI 동물 영상 자동화</p>
          </div>
        </div>
      </div>

      {/* ── 프로젝트명 ── */}
      <div className="px-4 py-3 border-b border-ink-800">
        <p className="text-[10px] text-ink-400 uppercase tracking-widest mb-1">현재 프로젝트</p>
        <input
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full bg-transparent text-sm text-cream-200 font-medium
                     border-b border-transparent focus:border-forest-400
                     outline-none pb-0.5 truncate placeholder-ink-600"
          placeholder="프로젝트명 입력"
        />
      </div>

      {/* ── 파이프라인 메뉴 ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] text-ink-500 uppercase tracking-widest px-2 mb-2">
          제작 파이프라인
        </p>

        {PIPELINE_STEPS.map((step, idx) => {
          const href      = `/${step}`
          const isActive  = pathname === href || (pathname === '/' && step === 'scenario')
          const status    = project.stepStatus[step]
          const isDone    = status === 'done'
          const isLocked  = !isDone && idx > 0 && project.stepStatus[PIPELINE_STEPS[idx - 1]] !== 'done'

          return (
            <Link
              key={step}
              href={isLocked ? '#' : href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive  && 'bg-forest-700 text-cream-100',
                !isActive && !isLocked && 'text-ink-300 hover:bg-ink-800 hover:text-cream-200',
                isLocked  && 'text-ink-600 cursor-not-allowed'
              )}
            >
              {/* 단계 번호 */}
              <span className={clsx(
                'text-[11px] font-mono w-5 text-center shrink-0',
                isActive ? 'text-forest-300' : 'text-ink-500'
              )}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* 아이콘 */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-none stroke-current">
                {STEP_ICONS[step]}
              </svg>

              {/* 라벨 */}
              <span className="flex-1">{STEP_LABELS[step]}</span>

              {/* 상태 배지 */}
              <StatusDot status={status} />
            </Link>
          )
        })}
      </nav>

      {/* ── 하단 메뉴 ── */}
      <div className="px-3 py-4 border-t border-ink-800 space-y-0.5">
        <Link href="/history"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-400 hover:bg-ink-800 hover:text-cream-200 transition-all">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          프로젝트 히스토리
        </Link>
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-400 hover:bg-ink-800 hover:text-cream-200 transition-all">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          API 키 설정
        </Link>
      </div>

      {/* ── AI 엔진 뱃지 ── */}
      <div className="px-4 py-3 border-t border-ink-800">
        <p className="text-[10px] text-ink-500 mb-2">AI 엔진</p>
        {[
          { label: 'Gemini 2.0 Flash', color: 'text-blue-400' },
          { label: 'Google Veo 3', color: 'text-purple-400' },
          { label: 'ElevenLabs TTS', color: 'text-forest-400' },
        ].map((e) => (
          <div key={e.label} className={`text-[11px] ${e.color} mb-0.5 flex items-center gap-1`}>
            <span className="w-1 h-1 rounded-full bg-current inline-block"/>
            {e.label}
          </div>
        ))}
      </div>
    </aside>
  )
}
