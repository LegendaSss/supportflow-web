'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'

export function SearchModal({ onSelect }: { onSelect: (ticketId: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Обработка Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
                e.preventDefault()
                setIsOpen(true)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Фокус на инпут при открытии
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50)
        } else {
            setQuery('')
            setResults([])
        }
    }, [isOpen])

    // Поиск (простой debounce)
    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            return
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setResults(data)
            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [query])

    if (!isOpen) return null

    return (
        <div
            onClick={() => setIsOpen(false)}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                zIndex: 9999, display: 'flex', justifyContent: 'center', paddingTop: '10vh'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '600px', maxWidth: '90%', maxHeight: '80vh',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '24px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}
            >
                {/* Search Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--overlay-base)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Search size={24} color="var(--text-secondary)" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Поиск по клиентам, ID тикетов и сообщениям..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '20px', outline: 'none', fontWeight: 500
                        }}
                    />
                    {isLoading && <Loader2 className="animate-spin" size={20} color="var(--text-secondary)" />}
                    <div style={{ fontSize: '11px', fontWeight: 700, background: 'var(--overlay-base)', padding: '4px 8px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                        ESC
                    </div>
                </div>

                {/* Results List */}
                {results.length > 0 && (
                    <div style={{ overflowY: 'auto', maxHeight: '500px', padding: '12px' }}>
                        {results.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    onSelect(item.ticket.id)
                                    setIsOpen(false)
                                }}
                                style={{
                                    padding: '16px', borderRadius: '16px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--overlay-hover)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600
                                }}>
                                    #{item.ticket.number}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {item.ticket.client.firstName || item.ticket.client.username || 'Неизвестный'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {item.type === 'message' && item.match ? `"${item.match}"` : `Найдено по: ${item.type === 'number' ? 'ID' : 'Имени'}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {query.length >= 2 && results.length === 0 && !isLoading && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Ничего не найдено
                    </div>
                )}
            </div>
        </div>
    )
}
