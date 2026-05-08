'use client'
/**
 * [Step 1] 시나리오 생성 페이지
 *
 * - 주제/메시지/길이/무드/핵심대사 입력
 * - Gemini 2.0 Flash API 호출 → 장면별 시나리오 + 대사 생성
 * - 생성 결과 미리보기 + 재생성 가능
 * - 완료 시 Zustand store에 저장 → 다음 단계 활성화
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import { scenarioApi } from '@/lib/api'
import type { ScenarioInput, ScenarioResult } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── 기본 입력값 ──────────────────────────────
const DEFAULT_INPUT: ScenarioInput = {
  topic:        '',
  keyMessage:   '',
  duration:     30,
  mood:         '밝고 유쾌함',
  coreDialogue: '',
}

const MOOD_OPTIONS = ['밝고 유쾌함', '감성적·따뜻함', '신뢰감·전문적', '유머·재치', '신비롭고 감각적']
const DURATION_OPTIONS: { label: string; value: ScenarioInput['duration'] }[] = [
  { label: '15초 (SNS 숏폼)', value: 15 },
  { label: '30초 (추천)', value: 30 },
  { label: '60초 (상세 설명)', value: 60 },
]

// ── 서브컴포넌트: 생성된 장면 카드 ─────────────
function SceneCard({
  scene,
  index,
}: {
  scene: ScenarioResult['scenes'][0]
  index: number
}) {
  const colors = ['bg-forest-50 border-forest-200', 'bg-amber-50 border-amber-200', 'bg-blue-50 border-blue-200']
  const dotColors = ['bg-forest-400', 'bg-amber-400', 'bg-blue-400']

  return (
    <div className={clsx('border rounded-xl p-4 animate-fade-up', colors[index % 3])}>
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('w-2.5 h-2.5 rounded-full', dotColors[index % 3])}/>
        <span className="text-xs font-mono text-ink-500">장면 {scene.sceneNumber}</span>
        <span className="text-xs text-ink-400 ml-auto">{scene.timeRange}</span>
      </div>
      <p className="text-sm text-ink-800 leading-relaxed mb-2">{scene.description}</p>
      {scene.dialogue && (
        <div className="bg-white/70 rounded-lg px-3 py-2 border border-white">
          <p className="text-xs text-ink-500 mb-0.5">💬 대사</p>
          <p className="text-sm text-ink-900 font-medium italic">"{scene.dialogue}"</p>
        </div>
      )}
      {scene.cameraNote && (
        <p className="text-xs text-ink-400 mt-2">📷 {scene.cameraNote}</p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────
export default function ScenarioPage() {
  const router = useRouter()
  const { setScenarioInput, setScenarioResult, setStepStatus } = useStudioStore()

  const [input, setInput]       = useState<ScenarioInput>(DEFAULT_INPUT)
  const [result, setResult]     = useState<ScenarioResult | null>(null)
  const [loading, setLoading]   = useState(false)

  // ── 유효성 검사 ──
  const isValid = input.topic.trim().length > 0 && input.keyMessage.trim().length > 0

  // ── Gemini 호출 ──
  const handleGenerate = async () => {
    if (!isValid) {
      toast.error('영상 주제와 핵심 메시지를 입력해주세요')
      return
    }

    setLoading(true)
    setStepStatus('scenario', 'generating')

    try {
      setScenarioInput(input)
      const res = await scenarioApi.generate(input)
      setResult(res)
      setScenarioResult(res)
      toast.success(`시나리오 ${res.scenes.length}개 장면 생성 완료!`)
    } catch (err: any) {
      toast.error(err.message ?? '시나리오 생성 실패')
      setStepStatus('scenario', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── 다음 단계 이동 ──
  const handleNext = () => {
    if (!result) return
    router.push('/character')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── 왼쪽: 입력 폼 ── */}
        <section className="bg-cream-50 rounded-2xl border border-cream-300 p-6 shadow-sm">
          <h2 className="font-display text-lg text-ink-900 mb-5 flex items-center gap-2">
            <span className="text-xl">✍️</span> 시나리오 설정
          </h2>

          {/* 영상 주제 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">
              영상 주제 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={input.topic}
              onChange={(e) => setInput({ ...input, topic: e.target.value })}
              placeholder="예: 봄맞이 신제품 출시 — 토끼 마케터의 하루"
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5
                         text-sm text-ink-900 placeholder-ink-300
                         focus:outline-none focus:border-forest-400 focus:ring-1 focus:ring-forest-200
                         transition-all"
            />
          </div>

          {/* 핵심 메시지 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">
              핵심 메시지 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={input.keyMessage}
              onChange={(e) => setInput({ ...input, keyMessage: e.target.value })}
              placeholder="예: 신선함, 생동감, 새로운 시작"
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5
                         text-sm text-ink-900 placeholder-ink-300
                         focus:outline-none focus:border-forest-400 focus:ring-1 focus:ring-forest-200
                         transition-all"
            />
          </div>

          {/* 영상 길이 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">영상 길이</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInput({ ...input, duration: opt.value })}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-xs font-medium border transition-all',
                    input.duration === opt.value
                      ? 'bg-forest-600 text-white border-forest-600'
                      : 'bg-white text-ink-600 border-cream-300 hover:border-forest-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 톤 & 무드 */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">톤 & 무드</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setInput({ ...input, mood })}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs border transition-all',
                    input.mood === mood
                      ? 'bg-forest-100 text-forest-700 border-forest-400 font-medium'
                      : 'bg-white text-ink-500 border-cream-300 hover:border-forest-300'
                  )}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* 핵심 대사 (선택) */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">
              핵심 대사 <span className="text-ink-300">(선택 — 반드시 포함할 문장)</span>
            </label>
            <textarea
              value={input.coreDialogue}
              onChange={(e) => setInput({ ...input, coreDialogue: e.target.value })}
              placeholder="예: 이 봄, 당신의 일상을 새롭게!"
              rows={2}
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5
                         text-sm text-ink-900 placeholder-ink-300 resize-none
                         focus:outline-none focus:border-forest-400 focus:ring-1 focus:ring-forest-200
                         transition-all"
            />
          </div>

          {/* AI 배지 */}
          <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-slow"/>
            Gemini 2.0 Flash로 생성됩니다
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={loading || !isValid}
            className={clsx(
              'w-full py-3 rounded-xl text-sm font-medium transition-all duration-200',
              loading || !isValid
                ? 'bg-ink-200 text-ink-400 cursor-not-allowed'
                : 'bg-forest-600 text-white hover:bg-forest-700 active:scale-[0.98] shadow-md hover:shadow-forest-200'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Gemini 생성 중...
              </span>
            ) : result ? '✨ 다시 생성' : '✨ AI 시나리오 생성'}
          </button>
        </section>

        {/* ── 오른쪽: 결과 ── */}
        <section className="flex flex-col gap-4">
          {!result && !loading && (
            <div className="bg-cream-50 rounded-2xl border border-dashed border-cream-300 p-8
                            flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <span className="text-4xl mb-3">🎬</span>
              <p className="text-sm text-ink-400">왼쪽에서 설정을 입력하고<br/>AI 생성 버튼을 눌러주세요</p>
            </div>
          )}

          {loading && (
            <div className="bg-cream-50 rounded-2xl border border-cream-300 p-8
                            flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <div className="flex gap-1 mb-4">
                {[0,1,2,3,4,5].map(i => (
                  <div
                    key={i}
                    className="wave-bar w-1.5 bg-forest-400 rounded-full"
                    style={{ height: 24, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-forest-600 font-medium">Gemini가 시나리오를 작성 중입니다</p>
              <p className="text-xs text-ink-400 mt-1">보통 10~20초 소요됩니다</p>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink-900 flex items-center gap-2">
                  <span>📋</span> 생성된 시나리오
                </h2>
                <div className="flex gap-2 text-xs">
                  <span className="bg-forest-100 text-forest-700 px-2 py-1 rounded-full">
                    {result.scenes.length}개 장면
                  </span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    {result.totalDuration}초
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {result.scenes.map((scene, i) => (
                  <SceneCard key={scene.sceneNumber} scene={scene} index={i} />
                ))}
              </div>

              {/* 다음 단계 */}
              <button
                onClick={handleNext}
                className="w-full py-3 rounded-xl bg-ink-900 text-cream-100 text-sm font-medium
                           hover:bg-ink-800 active:scale-[0.98] transition-all shadow-md mt-2"
              >
                캐릭터 설정으로 → 
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
