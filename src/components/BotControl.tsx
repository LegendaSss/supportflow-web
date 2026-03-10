'use client'

import { useState, useEffect } from 'react'

export default function BotControl() {
    const [status, setStatus] = useState<{ running: boolean; hasToken: boolean } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 10000) // Проверять каждые 10 сек
        return () => clearInterval(interval)
    }, [])

    async function fetchStatus() {
        try {
            const res = await fetch('/api/bot')
            setStatus(await res.json())
        } catch {
            // ignore
        }
    }

    async function toggleBot() {
        if (!status) return
        setLoading(true)
        setError('')
        try {
            const action = status.running ? 'stop' : 'start'
            const res = await fetch('/api/bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            })
            const data = await res.json()
            if (data.error) setError(data.error)
            await fetchStatus()
        } catch {
            setError('Ошибка подключения')
        }
        setLoading(false)
    }

    if (!status) return null

    return (
        <div
            style={{
                padding: '10px 14px',
                margin: '0 10px 8px',
                borderRadius: 'var(--radius-md)',
                background: status.running
                    ? 'rgba(52, 211, 153, 0.1)'
                    : 'rgba(232, 64, 87, 0.1)',
                border: `1px solid ${status.running ? 'rgba(52, 211, 153, 0.3)' : 'rgba(232, 64, 87, 0.3)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onClick={toggleBot}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: status.running ? 'var(--accent-green)' : 'var(--accent-primary)',
                        animation: status.running ? 'pulse 2s infinite' : 'none',
                    }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {loading ? '⏳ ...' : status.running ? '🤖 Бот онлайн' : '⭕ Бот офлайн'}
                </span>
            </div>
            {!status.hasToken && (
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                    Добавьте TELEGRAM_BOT_TOKEN в .env
                </div>
            )}
            {error && (
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                    {error}
                </div>
            )}
        </div>
    )
}
