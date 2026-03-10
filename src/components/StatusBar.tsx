'use client'

import { useState, useEffect } from 'react'
import { Activity, Server, Bot, Users, Clock, Wifi } from 'lucide-react'

export default function StatusBar() {
    const [currentTime, setCurrentTime] = useState<Date>(new Date())
    const [uptime, setUptime] = useState<number>(0)
    const [onlineClients, setOnlineClients] = useState<number>(0)
    const [isBotRunning, setIsBotRunning] = useState<boolean>(true)
    const [ping, setPing] = useState<number>(12)
    // Create a stable unique ID per browser tab for the heartbeat
    const [clientId] = useState(() => Math.random().toString(36).substring(2, 15))

    useEffect(() => {
        // Update time every second
        const timer = setInterval(() => {
            setCurrentTime(new Date())
            setUptime(prev => prev + 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const fetchStats = async () => {
            const startTime = Date.now()
            try {
                // Network latency ping measurement

                // Actual session heartbeat
                const heartRes = await fetch('/api/admin/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId })
                })

                if (heartRes.ok) {
                    const data = await heartRes.json()
                    setOnlineClients(data.onlineCount || 1)
                }

                // Measure elapsed time as ping
                const endTime = Date.now()
                setPing(Math.max(12, Math.floor((endTime - startTime) / 2)))

                // Actual bot status check could go here if we expose an endpoint
                const res = await fetch('/api/admin/bot/status')
                if (res.ok) {
                    const data = await res.json()
                    setIsBotRunning(data.running)
                }
            } catch (e) {
                // Ignore errors for now to prevent spam
            }
        }

        // Initialize immediately
        fetchStats()
        // Poll every 10 seconds to keep heartbeat alive and fetch stats
        const intervalId = setInterval(fetchStats, 10000)
        return () => clearInterval(intervalId)
    }, [clientId])

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 'var(--sidebar-width)',
            width: 'calc(100% - var(--sidebar-width))',
            height: 'var(--status-bar-height, 32px)',
            background: 'var(--bg-card)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            zIndex: 50,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
        }}>
            {/* Left side metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10b981', opacity: 0.4, animation: 'pulse 2s infinite' }} />
                        <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    System Operational
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={12} color={isBotRunning ? '#10b981' : '#ee2b54'} />
                    <span>Bot Status: {isBotRunning ? 'Active' : 'Offline'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} />
                    <span>Online: {onlineClients}</span>
                </div>
            </div>

            {/* Right side metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wifi size={12} />
                    <span>{ping}ms</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>Uptime: {formatUptime(uptime)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={12} color="var(--accent-primary)" />
                    <span>v0.1.0</span>
                </div>
            </div>
        </div>
    )
}
