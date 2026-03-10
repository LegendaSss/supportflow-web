'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Info, ShieldCheck, Ticket, Zap, X, MessageSquare } from 'lucide-react'

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'ticket' | 'payment' | 'message'

interface Toast {
    id: string
    type: ToastType
    message: string
    description?: string
}

interface NotificationContextType {
    addToast: (type: ToastType, message: string, description?: string) => void
    soundEnabled: boolean
    setSoundEnabled: (enabled: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const [soundEnabled, setSoundEnabled] = useState(true)

    // Load sound preference
    useEffect(() => {
        const saved = localStorage.getItem('sf_sound_enabled')
        if (saved) setSoundEnabled(saved === 'true')
    }, [])

    const toggleSound = useCallback((enabled: boolean) => {
        setSoundEnabled(enabled)
        localStorage.setItem('sf_sound_enabled', enabled.toString())
    }, [])

    const playNotificationSound = useCallback(() => {
        if (!soundEnabled) return
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtx) return
            const ctx = new AudioCtx()

            // Two-tone notification beep
            const playTone = (freq: number, startTime: number, dur: number) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.frequency.value = freq
                osc.type = 'sine'
                gain.gain.setValueAtTime(0.15, startTime)
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur)
                osc.start(startTime)
                osc.stop(startTime + dur)
            }

            playTone(880, ctx.currentTime, 0.12)
            playTone(1320, ctx.currentTime + 0.12, 0.15)

            setTimeout(() => ctx.close(), 500)
        } catch (e) {
            console.error('Failed to play sound:', e)
        }
    }, [soundEnabled])

    const addToast = useCallback((type: ToastType, message: string, description?: string) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev.slice(-4), { id, type, message, description }])

        // Play sound for important events
        if (type === 'ticket' || type === 'payment' || type === 'message') {
            playNotificationSound()
        }

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 5000)
    }, [playNotificationSound])

    const getToastStyle = (type: ToastType) => {
        switch (type) {
            case 'message': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: <MessageSquare size={20} /> }
            case 'ticket': return { bg: 'rgba(238, 43, 84, 0.1)', color: 'var(--accent-primary)', icon: <Ticket size={20} /> }
            case 'payment': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <ShieldCheck size={20} /> }
            case 'success': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <Zap size={20} /> }
            default: return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: <Info size={20} /> }
        }
    }

    return (
        <NotificationContext.Provider value={{ addToast, soundEnabled, setSoundEnabled: toggleSound }}>
            {children}

            {/* Toast Container */}
            <div style={{
                position: 'fixed', bottom: '24px', right: '24px',
                zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '12px',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => {
                    const style = getToastStyle(toast.type)
                    return (
                        <div key={toast.id} style={{
                            pointerEvents: 'auto', width: '340px', background: 'var(--bg-card)',
                            border: `1px solid ${style.color}30`, borderRadius: '20px',
                            padding: '16px', boxShadow: `0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--overlay-light), 0 0 20px ${style.color}15`,
                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                            animation: 'sf-toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: style.bg, color: style.color
                            }}>
                                {style.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{toast.message}</div>
                                {toast.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{toast.description}</div>}
                            </div>
                            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                <X size={14} />
                            </button>
                        </div>
                    )
                })}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes sf-toast-in {
                    from { transform: translateX(100%) scale(0.9); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
            ` }} />
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (!context) throw new Error('useNotifications must be used within NotificationProvider')
    return context
}
