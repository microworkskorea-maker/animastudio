'use client'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function StoryboardPage() {
  const router = useRouter()
  const { project, setStoryboard, setStepStatus } = useStudioStore()
  const [loading, setLoading] = useState(false)
  const scenes = project.scenarioResult ? project.scenarioResult.scenes : []
  const colors = ['bg-blue-100', 'bg-green-100', 'bg-pink-100']

  function handleGenerate() {
    setLoading(true)
    const frames = []
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i]
      frames.push({ frameId: 'frame_' + s.sceneNumber + '_1', sceneNumber: s.sceneNumber, cutNumber: 1, description: s.description, imageStatus: 'done', compositionNote: s.cameraNote })
      frames.push({ frameId: 'frame_' + s.sceneNumber + '_2', sceneNumber: s.sceneNumber, cutNumber: 2, description: s.dialogue, imageStatus: 'done', compositionNote: '클로즈업' })
    }
    setStoryboard(frames as any)
    setStepStatus('storyboard', 'done')
    toast.success('스토리보드 생성 완료!')
    setLoading(false)
  }

  function handleNext() {
    if (project.storyboard) {
      router.push('/video')
    } else {
      toast.error('먼저 스토리보드를 생성해주세요')
    }
  }

  const frameList = []
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]
    const c = colors[i % 3]
    frameList.push({ label: '장면 ' + s.sceneNumber + ' · 컷 1', desc: s.description, color: c })
    frameList.push({ label: '장면 ' + s.sceneNumber + ' · 컷 2', desc: s.dialogue, color: c })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-cream-50 rounded-2xl border border-cream-300 p-6 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-ink-900">🎬 스토리보드</h2>
          <button onClick={handleGenerate} disabled={loading} className="px-4 py-2 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:bg-ink-200 disabled:text-ink-400">
            {loading ? '생성 중...' : '✨ 스토리보드 생성'}
          </button>
        </div>
        {scenes.length === 0 ? (
          <div className="text-center py-12 text-ink-400 text-sm">먼저 시나리오를 생성해주세요</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {frameList.map(function(f, idx) {
              return (
                <div key={idx} className="border border-cream-300 rounded-xl overflow-hidden">
                  <div className={'h-24 flex items-center justify-center text-3xl ' + f.color}>🖼️</div>
                  <div className="p-3">
                    <div className="text-xs text-ink-400 mb-1">{f.label}</div>
                    <div className="text-sm text-ink-800">{f.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={function() { router.push('/character') }} className="px-5 py-2.5 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-100">← 캐릭터</button>
        <button onClick={handleNext} className="px-5 py-2.5 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700">영상 생성 →</button>
      </div>
    </div>
  )
}
