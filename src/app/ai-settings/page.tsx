'use client'

import { useState, useEffect } from 'react'

interface AISettingsData {
    id: string
    isEnabled: boolean
    model: string
    systemPrompt: string
    ragEnabled: boolean
    maxKnowledgeRecords: number
    balanceOnErrors: boolean
}

const models = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
]

export default function AISettingsPage() {
    const [settings, setSettings] = useState<AISettingsData | null>(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetch('/api/ai-settings').then(r => r.json()).then(setSettings)
    }, [])

    async function save() {
        if (!settings) return
        await fetch('/api/ai-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    if (!settings) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Загрузка...</div>

    return (
        <>
            <div className="page-header">
                <h1>🧠 ИИ Настройки</h1>
                <p>Настройки искусственного интеллекта для поддержки</p>
            </div>

            {/* Enable AI */}
            <div className="card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="card-title">ИИ Ассистент</div>
                    <div className="card-content">Включить ИИ для автоматических ответов</div>
                </div>
                <div
                    className={`toggle ${settings.isEnabled ? 'active' : ''}`}
                    onClick={() => setSettings(s => s ? { ...s, isEnabled: !s.isEnabled } : s)}
                />
            </div>

            {/* System Prompt */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ marginBottom: '12px' }}>📝 Системный промпт</div>
                <textarea
                    className="form-textarea"
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings(s => s ? { ...s, systemPrompt: e.target.value } : s)}
                    rows={6}
                    placeholder="Ты помощник техподдержки..."
                    style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Определяет поведение и стиль ответов ИИ
                </div>
            </div>

            {/* RAG Settings */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ marginBottom: '12px' }}>📚 Параметры RAG</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>Балансировка на ошибки</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Автоматически пересылать оператору при ошибке ИИ</div>
                    </div>
                    <div
                        className={`toggle ${settings.balanceOnErrors ? 'active' : ''}`}
                        onClick={() => setSettings(s => s ? { ...s, balanceOnErrors: !s.balanceOnErrors } : s)}
                    />
                </div>
                <div>
                    <label className="form-label">Макс. записей из базы знаний</label>
                    <input
                        className="form-input"
                        type="number"
                        value={settings.maxKnowledgeRecords}
                        onChange={(e) => setSettings(s => s ? { ...s, maxKnowledgeRecords: parseInt(e.target.value) || 0 } : s)}
                        style={{ width: '100px' }}
                    />
                </div>
            </div>

            {/* Models */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="card-title">🤖 Модели ИИ</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {models.map(m => (
                        <div
                            key={m.id}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                background: settings.model === m.id ? 'var(--bg-tertiary)' : 'transparent',
                                border: `1px solid ${settings.model === m.id ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onClick={() => setSettings(s => s ? { ...s, model: m.id } : s)}
                        >
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>provider: {m.provider}</div>
                            </div>
                            <div style={{
                                padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                background: settings.model === m.id ? 'rgba(232, 64, 87, 0.15)' : 'var(--bg-tertiary)',
                                color: settings.model === m.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                            }}>
                                {settings.model === m.id ? 'Активна' : 'Выбрать'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {saved && (
                    <span style={{ color: 'var(--accent-green)', alignSelf: 'center', fontSize: '14px' }}>
                        ✅ Сохранено!
                    </span>
                )}
                <button className="btn btn-primary" onClick={save}>💾 Сохранить</button>
            </div>
        </>
    )
}
