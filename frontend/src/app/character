'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'
import toast from 'react-hot-toast'

const PRESET_CHARACTERS = [
  { emoji: '🐰', name: '웍스', role: '글로벌 소싱 전문가 토끼', personality: '발랄, 친근, 호기심', speechStyle: '친근하고 밝은 어투' },
  { emoji: '🦊', name: '폭시', role: '전략가 여우', personality: '영리, 세련, 자신감', speechStyle: '논리적이고 세련된 어투' },
  { emoji: '🐻', name: '베어', role: '든든한 곰', personality: '신뢰, 따뜻함, 안정감', speechStyle: '따뜻하고 든든한 어투' },
  { emoji: '🦦', name: '오티', role: '트렌디 수달', personality: '유머, 개성, MZ감성', speechStyle: '유쾌하고 트렌디한 어투' },
]

export default function CharacterPage() {
  const router = useRouter()
  const { setCharacter, setStepStatus } = useStudioStore()

  const [selected, setSelected] = useState(0)
  const [name, setName] = useState(PRESET_CHARACTERS[0].name)
  const [personality, setPersonality] = useState(PRESET_CHARACTERS[0].personality)
  const [speechStyle, setSpeechStyle] = useState(PRESET_CHARACTERS[0].speechStyle)

  const handleSelect = (i: number) => {
    setSelected(i)
    setName(PRESET_CHARACTERS[i].name)
    setPersonality(PRESET_CHARACTERS[i].personality)
    setSpeechStyle(PRESET_CHARACTERS[i].speechStyle)
  }

  const handleNext = () => {
    const char = PRESET_CHARACTERS[selected]
    setCharacter({
      name,
      role: char.role,
      emoji: char.emoji,
      personality,
      speechStyle,
      lockedPrompt: `${char.emoji} ${name} character, ${personality}, consistent design, cartoon mascot style`,
      negativePrompt: 'no style change, no color change, maintain same character',
    })
    setStepStatus('character', 'done')
    toast.success('캐릭터 설정 완료!')
    router.push('/storyboard')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-cream-50 rounded-2xl border border-cream-300 p-6 shadow-sm mb-5">
        <h2 className="font-display text-lg text-ink-900 mb-5">🐾 캐릭터 선택</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PRESET_CHARACTERS.map((c, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                selected === i
                  ? 'border-forest-500 bg-forest-50'
                  : 'border-cream-300 hover:border-forest-300'
              }`}
            >
              <span className="text-3xl">{c.emoji}</span>
              <div>
                <div className="font-medium text-ink-900">{c.name}</div>
                <div className="text-xs text-ink-400">{c.role}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">캐릭터 이름</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-forest-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">성격 키워드</label>
            <input
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-forest-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">말투 스타일</label>
            <select
              value={speechStyle}
              onChange={e => setSpeechStyle(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-forest-400"
            >
              <option>친근하고 밝은 어투</option>
              <option>논리적이고 세련된 어투</option>
              <option>따뜻하고 든든한 어투</option>
              <option>유쾌하고 트렌디한 어투</option>
              <option>공손하고 격식체</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => router.push('/scenario')} className="px-5 py-2.5 rounded-xl border border-cream-300 text-sm text-ink-600 hover:bg-cream-100">
          ← 시나리오
        </button>
        <button onClick={handleNext} className="px-5 py-2.5 rounded-xl bg-forest-600 text-white text-sm font-medium hover:bg-forest-700">
          스토리보드 생성 →
        </button>
      </div>
    </div>
  )
}
