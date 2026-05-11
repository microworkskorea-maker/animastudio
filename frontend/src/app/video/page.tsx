'use client'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function VideoPage() {
  const router = useRouter()
  const { project, setVideoClips, setStepStatus } = useStudioStore()
  const [loading, setLoading] = useState(false)
  const scenes = project.scenarioResult?.scenes || []

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/backend/video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          frames: project.storyboard || [],
          character: project.character,
          settings: { resolution: '1080p', fps: 24, transition: 'fade', bgMusic: null },
        })
      })
      const data = await res.json()
      if (data.success) {
        setVideoClips(data.data.clips)
        setStepStatus('video', 'done')
        toast.success('영상 생성 시작!')
      }
    } catch(e) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-cream-50 rounded-2xl border border-cream-300 p-6 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-ink-900">🎥 영상 생성</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Kling AI</span>
        </div>

        <div className="space-y-3 mb-6">
          {scenes.map((s) => (
            <div key={s.sceneNumber} className="flex items-center gap-3 p-3 bg-cream-100 rounded-xl">
              <div className="w-16 h-10 bg-cream-200 rounded-lg flex items-center justify-center text-lg">🎬</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink-900">장면 {s.sceneNumber} · {s.timeRange}</div>
                <div className="text-xs text-ink-400 truncate">{s.description}</div>
              </div>
              <span className="text-xs text-ink-400">대기 중</span>
            </div>
          ))}
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-3 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:bg-ink-200 disabled:text-ink-400">
          {loading ? '⏳ 영상 생성 중...' : '✨ AI 영상 생성 시작'}
        </button>
        <p className="text-xs text-ink-400 text-center mt-2">보통 2~5분 소요됩니다</p>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => router.push('/storyboard')} className="px-5 py-2.5 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-100">← 스토리보드</button>
        <button onClick={() => router.push('/voice')} className="px-5 py-2.5 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700">더빙 & 자막 →</button>
      </div>
    </div>
  )
}
