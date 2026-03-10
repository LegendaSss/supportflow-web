'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BotControl from './BotControl'
import {
    LayoutDashboard,
    Ticket,
    Users,
    CreditCard,
    BarChart,
    FileText,
    BrainCircuit,
    Bot,
    Megaphone,
    Library,
    ChevronRight,
    Sparkles,
    Sun,
    Moon,
    Bell,
    Volume2,
    VolumeX,
    CheckCircle2,
    Calendar,
    MessageSquare,
    Zap,
    X,
    Filter,
    Trash2,
    ArrowUpRight
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useNotifications } from './NotificationProvider'
import { useTranslation } from './LanguageProvider'


const navItems = [
    { href: '/', icon: LayoutDashboard, labelKey: 'nav.overview' },
    { href: '/tickets', icon: Ticket, labelKey: 'nav.tickets', badge: true },
    { href: '/clients', icon: Users, labelKey: 'nav.clients' },
    { href: '/tariffs', icon: CreditCard, labelKey: 'nav.billing' },
    // separator: Инструменты
    { href: '/statistics', icon: BarChart, labelKey: 'nav.analytics' },
    { href: '/templates', icon: FileText, labelKey: 'nav.templates' },
    { href: '/ai-settings', icon: BrainCircuit, labelKey: 'nav.ai' },
    { href: '/auto-responses', icon: Bot, labelKey: 'nav.automation' },
    { href: '/broadcasts', icon: Megaphone, labelKey: 'nav.marketing' },
    { href: '/knowledge', icon: Library, labelKey: 'nav.knowledge' },
]

export default function Sidebar() {
    const pathname = usePathname()


    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const { addToast, soundEnabled, setSoundEnabled } = useNotifications()
    const { t } = useTranslation()
    const lastActivityId = useRef<string | null>(null)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Real-time activity polling
    useEffect(() => {
        if (!mounted) return

        const pollActivities = async () => {
            try {
                const res = await fetch('/api/admin/activities')
                const activities = await res.json()

                if (Array.isArray(activities) && activities.length > 0) {
                    const latest = activities[0]

                    // If we have a new activity
                    if (lastActivityId.current && latest.id !== lastActivityId.current) {
                        // Find all new activities since last check
                        const index = activities.findIndex((a: any) => a.id === lastActivityId.current)
                        const newOnes = index === -1 ? activities : activities.slice(0, index)

                        // Process new ones (newest last)
                        newOnes.reverse().forEach((activity: any) => {
                            let type: any = 'info'
                            if (activity.type === 'ticket_created') type = 'ticket'
                            if (activity.type === 'payment_received') type = 'payment'
                            if (activity.type === 'broadcast_completed') type = 'success'
                            if (activity.type === 'message_received') type = 'message'

                            addToast(type, activity.message)
                        })

                        // Increment unread count
                        setUnreadCount(prev => prev + newOnes.length)
                    }

                    lastActivityId.current = latest.id
                }
            } catch (error) {
                console.error('Polling failed:', error)
            }
        }

        const interval = setInterval(pollActivities, 2000) // Poll every 2s
        pollActivities() // Initial check

        return () => clearInterval(interval)
    }, [mounted, addToast])

    const mainNav = navItems.slice(0, 4)
    const toolsNav = navItems.slice(4)

    return (
        <>
            <aside className="sidebar" style={{
                boxShadow: '20px 0 60px var(--shadow-base), inset -1px 0 0 var(--overlay-light)',
                background: 'var(--bg-sidebar)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderRight: '1px solid var(--overlay-light)',
                height: '100vh',
                width: '280px',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                overflowY: 'auto',
                overflowX: 'hidden'
            }}>
                {/* Ambient Top Glow */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px',
                    background: 'radial-gradient(circle, var(--border-glow) 0%, transparent 70%)',
                    filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0
                }} />

                <div className="sidebar-logo pb-8 pt-8 px-6" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="logo-icon" style={{
                        width: '44px', height: '44px',
                        background: 'var(--accent-gradient)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow), inset 0 2px 4px rgba(255,255,255,0.3)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }} />
                        <Sparkles size={20} color="white" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span className="logo-text" style={{
                            fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px',
                            background: 'linear-gradient(180deg, var(--text-primary) 0%, var(--text-muted) 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            SupportFlow
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '-2px' }}>
                            Enterprise
                        </span>
                    </div>

                    {/* Notification Bell */}
                    <div
                        onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0) }}
                        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '12px',
                            background: unreadCount > 0 ? 'rgba(238, 43, 84, 0.1)' : 'var(--overlay-base)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${unreadCount > 0 ? 'rgba(238, 43, 84, 0.3)' : 'var(--overlay-light)'}`,
                            transition: 'all 0.2s',
                            animation: unreadCount > 0 ? 'pulseCritical 2s infinite' : 'none'
                        }}>
                            <Bell size={18} color={unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                        </div>
                        {unreadCount > 0 && <div style={{
                            position: 'absolute', top: '-4px', right: '-4px',
                            minWidth: '18px', height: '18px', borderRadius: '10px',
                            background: 'var(--accent-primary)', border: '2px solid var(--bg-sidebar)',
                            boxShadow: '0 0 8px var(--accent-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 800, color: 'white', padding: '0 4px'
                        }} >{unreadCount}</div>}
                    </div>
                </div>

                <nav className="sidebar-nav px-4" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: 1 }}>


                    <div className="sidebar-section-title" style={{
                        fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)',
                        padding: '8px 16px 4px', fontWeight: 700, letterSpacing: '1.5px', marginTop: '8px'
                    }}>{t('sidebar.workspace')}</div>

                    {mainNav.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
                                    borderRadius: '14px', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'var(--overlay-base)' : 'transparent',
                                    border: isActive ? '1px solid var(--overlay-base)' : '1px solid transparent',
                                    boxShadow: isActive ? 'inset 0 1px 1px var(--overlay-light), 0 4px 12px var(--shadow-base)' : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    position: 'relative', overflow: 'hidden', fontWeight: isActive ? 600 : 500,
                                    textDecoration: 'none'
                                }}
                                onMouseOver={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'var(--overlay-light)'
                                    if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent'
                                    if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
                                }}
                            >
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                        width: '3px', height: '20px', background: 'var(--accent-gradient)',
                                        borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--accent-primary)'
                                    }} />
                                )}
                                <span style={{
                                    display: 'flex', alignItems: 'center',
                                    color: isActive ? 'var(--accent-primary)' : 'inherit',
                                    transition: 'color 0.3s'
                                }}>
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span style={{ fontSize: '14px', letterSpacing: '0.2px' }}>{t(item.labelKey)}</span>

                                {item.badge && mounted && (
                                    <span className="badge" style={{
                                        marginLeft: 'auto', background: 'var(--accent-gradient)',
                                        color: 'white', fontSize: '11px', padding: '2px 8px',
                                        borderRadius: '12px', fontWeight: 800,
                                        boxShadow: '0 2px 8px rgba(238, 43, 84, 0.4)'
                                    }}>
                                        ✨
                                    </span>
                                )}
                            </Link>
                        )
                    })}

                    <div className="sidebar-section-title" style={{
                        fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)',
                        padding: '24px 16px 4px', fontWeight: 700, letterSpacing: '1.5px'
                    }}>{t('sidebar.system')}</div>

                    {toolsNav.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
                                    borderRadius: '14px', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'var(--overlay-base)' : 'transparent',
                                    border: isActive ? '1px solid var(--overlay-base)' : '1px solid transparent',
                                    boxShadow: isActive ? 'inset 0 1px 1px var(--overlay-light), 0 4px 12px var(--shadow-base)' : 'none',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    position: 'relative', overflow: 'hidden', fontWeight: isActive ? 600 : 500,
                                    textDecoration: 'none'
                                }}
                                onMouseOver={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'var(--overlay-light)'
                                    if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent'
                                    if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
                                }}
                            >
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                        width: '3px', height: '20px', background: 'var(--accent-gradient)',
                                        borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--accent-primary)'
                                    }} />
                                )}
                                <span style={{
                                    display: 'flex', alignItems: 'center',
                                    color: isActive ? 'var(--accent-primary)' : 'inherit',
                                    transition: 'color 0.3s'
                                }}>
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span style={{ fontSize: '14px', letterSpacing: '0.2px' }}>{t(item.labelKey)}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="px-4" style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
                    <BotControl />
                </div>

                <div className="sidebar-footer px-4 pb-6" style={{ paddingTop: '24px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ height: '1px', background: 'radial-gradient(circle, var(--overlay-base) 0%, transparent 100%)' }} />

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'var(--bg-input)', border: '1px solid var(--overlay-light)',
                                color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: soundEnabled ? '0 4px 12px rgba(238, 43, 84, 0.15)' : 'none'
                            }}
                            title={soundEnabled ? "Выключить звук" : "Включить звук"}
                        >
                            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>

                        {mounted && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '4px 6px', background: 'var(--bg-input)',
                                borderRadius: '20px', border: '1px solid var(--overlay-light)'
                            }}>
                                <button
                                    onClick={() => setTheme('light')}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '8px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                                        background: theme === 'light' ? 'var(--bg-card)' : 'transparent',
                                        color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                        boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: theme === 'light' ? 600 : 500
                                    }}
                                >
                                    <Sun size={16} /> <span style={{ fontSize: '12px' }}>{t('sidebar.light')}</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '8px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                                        background: theme === 'dark' ? 'var(--bg-card)' : 'transparent',
                                        color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                        boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: theme === 'dark' ? 600 : 500
                                    }}
                                >
                                    <Moon size={16} /> <span style={{ fontSize: '12px' }}>{t('sidebar.dark')}</span>
                                </button>
                            </div>
                        )}


                    </div>

                    <div className="sidebar-user" style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px',
                        borderRadius: '16px', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        cursor: 'pointer', background: 'var(--overlay-light)',
                        border: '1px solid var(--overlay-light)'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--overlay-base)';
                            e.currentTarget.style.borderColor = 'var(--overlay-hover)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--overlay-light)';
                            e.currentTarget.style.borderColor = 'var(--overlay-light)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div className="avatar" style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--overlay-base)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)',
                            boxShadow: 'inset 0 2px 4px var(--overlay-light)'
                        }}>A</div>
                        <div className="user-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div className="user-name" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>Admin User</div>
                            <div className="user-role" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>System Administrator</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            ` }} />
                {/* Sidebar content ends here */}
            </aside>

            {/* Portaled-like elements (outside the hidden overflow container) */}
            <>
                {/* Notification Drawer Overlay */}
                {showNotifications && (
                    <div
                        onClick={() => setShowNotifications(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                            zIndex: 2000, animation: 'fadeIn 0.3s ease'
                        }}
                    />
                )}

                {/* Notification Drawer */}
                <div style={{
                    position: 'fixed', top: '20px', bottom: '20px',
                    right: showNotifications ? '20px' : '-450px',
                    width: '400px', background: 'var(--bg-sidebar)',
                    border: '1px solid var(--overlay-light)', borderRadius: '28px',
                    boxShadow: '-20px 0 80px rgba(0,0,0,0.4)',
                    zIndex: 2001, transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)'
                }}>
                    <div style={{ padding: '28px', borderBottom: '1px solid var(--overlay-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--overlay-base)' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Центр уведомлений</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Оперативный мониторинг событий</p>
                        </div>
                        <button
                            onClick={() => setShowNotifications(false)}
                            style={{
                                width: '40px', height: '40px', borderRadius: '14px',
                                background: 'var(--overlay-light)', border: '1px solid var(--overlay-light)',
                                color: 'var(--text-primary)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--overlay-base)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--overlay-light)'}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <NotificationList />
                    </div>

                    <div style={{ padding: '20px', borderTop: '1px solid var(--overlay-light)', background: 'var(--overlay-base)' }}>
                        <Link href="/" onClick={() => setShowNotifications(false)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px', borderRadius: '14px', background: 'var(--accent-primary)',
                            color: 'white', fontWeight: 700, textDecoration: 'none', fontSize: '14px',
                            boxShadow: '0 10px 20px rgba(238, 43, 84, 0.2)'
                        }}>
                            Перейти в управление <ArrowUpRight size={16} />
                        </Link>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            ` }} />
            </>
        </>
    )
}

function NotificationList() {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await fetch('/api/admin/activities')
                const data = await res.json()
                setActivities(Array.isArray(data) ? data.slice(0, 5) : [])
            } catch (error) {
                console.error('Failed to fetch notifications:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchActivities()
        const interval = setInterval(fetchActivities, 5000)
        return () => clearInterval(interval)
    }, [])

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
    if (activities.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Уведомлений пока нет</div>

    const getStyle = (type: string) => {
        switch (type) {
            case 'message_received': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: <MessageSquare size={16} /> }
            case 'ticket_created': return { bg: 'rgba(238, 43, 84, 0.1)', color: 'var(--accent-primary)', icon: <Ticket size={16} /> }
            case 'payment_received': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <Zap size={16} /> }
            default: return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', icon: <Bell size={16} /> }
        }
    }

    const timeAgo = (date: string) => {
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        if (diff < 60) return 'только что'
        if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
        if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
        return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    }

    return (
        <>
            {activities.map((activity) => {
                const s = getStyle(activity.type)
                return (
                    <div key={activity.id} style={{
                        padding: '14px', borderRadius: '16px', background: 'var(--overlay-light)',
                        border: '1px solid var(--overlay-light)', display: 'flex', gap: '12px',
                        alignItems: 'flex-start', transition: 'all 0.2s'
                    }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                            background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s.color
                        }}>
                            {s.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activity.message}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {timeAgo(activity.createdAt)}
                            </div>
                        </div>
                    </div>
                )
            })}
        </>
    )
}
