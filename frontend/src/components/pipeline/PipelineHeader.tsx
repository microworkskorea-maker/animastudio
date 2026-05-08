'use client'
/**
 * PipelineHeader — 상단 파이프라인 진행 표시줄
 * 6단계 스텝 + 현재 단계 제목
 */
import { usePathname } from 'next/navigation'
import { useStudioStore, PIPELINE_STEPS, STEP_LABELS } from '@/lib/store'
import clsx from 'clsx'

const PATH_TO_STEP: Record<string, string> = {
  '/':           'scenario',
  '/scenario':   'scenario',
  '/character':  'character',
  '/storyboard': 'storyboard',
  '/video':      'video',
  '/voice':      'voice',
  '/export':     'export',
}

export default function PipelineHeader() {
  const pathname = usePathname()
  const { project } = useStudioStore()

  const currentStep = PATH_TO_STEP[pathname] ?? 'scenario'
  const currentIdx  = PIPELINE_STEPS.indexOf(currentStep as any)

  return (
    <header className="bg-cream-50 border-b border-cream-300 px-6 py-0">
      {/* ── 상단: 타이틀 + 프로젝트명 ── */}
      <div className="flex items-center justify-between h-12 border-b border-cream-200">
        <h1 className="font-display text-[17px] text-ink-900">
          {STEP_LABELS[currentStep as keyof typeof STEP_LABELS]}
        </h1>
        <div className="flex items-center gap-3 text-sm text-ink-400">
          <span className="font-mono text-[11px] bg-cream-200 px-2 py-0.5 rounded">
            {project.name}
          </span>
        </div>
      </div>

      {/* ── 하단: 스텝 인디케이터 ── */}
      <div className="flex items-center h-10">
        {PIPELINE_STEPS.map((step, idx) => {
          const status    = project.stepStatus[step]
          const isCurrent = idx === currentIdx
          const isDone    = status === 'done'
          const isPast    = idx < currentIdx

          return (
            <div key={step} className="flex items-center">
              {/* 스텝 라벨 */}
              <div className={clsx(
                'flex items-center gap-1.5 text-xs transition-all',
                isCurrent && 'text-forest-600 font-medium',
                (isDone || isPast) && !isCurrent && 'text-ink-400',
                !isCurrent && !isDone && !isPast && 'text-ink-300'
              )}>
                {/* 체크 or 번호 */}
                <span className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0',
                  isCurrent && 'bg-forest-600 text-white',
                  isDone && !isCurrent && 'bg-forest-200 text-forest-700',
                  !isCurrent && !isDone && 'bg-cream-200 text-ink-400'
                )}>
                  {isDone && !isCurrent
                    ? '✓'
                    : String(idx + 1)
                  }
                </span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </div>

              {/* 연결선 */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="mx-2 h-px w-8 bg-cream-300 relative overflow-hidden">
                  {(isDone || isPast) && (
                    <div className="absolute inset-0 bg-forest-400 step-connector-fill"/>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </header>
  )
}
