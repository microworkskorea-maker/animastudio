'use client'
import { useRouter } from 'next/navigation'
import { useStudioStore } from '@/lib/store'

export default function ExportPage() {
  const router = useRouter()
  const { project } = useStudioStore()

  const checklist = [
    { label: '시나리오', done: project.scenarioResult != null },
    { label: '캐릭터', done: project.character != null },
    { label: '스토리보드', done: project.storyboard != null },
    { label: '영상 생성', done: project.videoClips != null },
    { label: '더빙 & 자막', done: project.voiceTracks != null },
  ]

  const exports = project.exports || []

  return (
    <div style={{maxWidth: '600px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '16px', border: '1px solid #e8dfc2', padding: '24px', marginBottom: '16px'}}>
        <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>📦 최종 내보내기</h2>
        <div style={{background: '#f9f6ee', borderRadius: '12px', padding: '16px', marginBottom: '20px'}}>
          {checklist.map(function(item) {
            return (
              <div key={item.label} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px'}}>
                <span style={{color: item.done ? '#127545' : '#b8b8b8'}}>{item.done ? '✅' : '○'}</span>
                <span style={{color: item.done ? '#1a1a1a' : '#b8b8b8'}}>{item.label}</span>
              </div>
            )
          })}
        </div>

        {exports.length > 0 ? (
          <div>
            {exports.map(function(asset) {
              return (
                <div key={asset.assetId} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#f9f6ee', borderRadius: '12px', marginBottom: '8px'}}>
                  <div style={{fontSize: '28px'}}>🎬</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '500', fontSize: '14px'}}>{asset.label}</div>
                    <div style={{color: '#787878', fontSize: '12px'}}>{asset.filename}</div>
                  </div>
                  {asset.downloadUrl ? (
                    <a href={asset.downloadUrl} download style={{background: '#127545', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: '500'}}>
                      ⬇️ 다운로드
                    </a>
                  ) : (
                    <span style={{color: '#787878', fontSize: '12px'}}>준비 중</span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '20px', color: '#787878', fontSize: '14px'}}>
            더빙 & 자막 단계를 완료하면 여기에 파일이 나타나요
          </div>
        )}
      </div>
      <div style={{display: 'flex', justifyContent: 'flex-end'}}>
        <button onClick={function() { router.push('/voice') }} style={{padding: '10px 20px', borderRadius: '12px', border: '1px solid #e8dfc2', background: 'white', cursor: 'pointer', fontSize: '14px'}}>← 더빙 & 자막</button>
      </div>
    </div>
  )
}
