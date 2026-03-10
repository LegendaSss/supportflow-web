'use client'

import { useEffect, useState, useMemo } from 'react'
import {
    Users, Search, X, Ticket, DollarSign, Calendar, Tag, Shield,
    ChevronRight, ArrowUpRight, Ban, CheckCircle2, Clock, Zap, RefreshCw, Trash2, Plus, Database,
    Smartphone, Unlink, QrCode, AlertTriangle, Activity
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Pagination } from '@/components/Pagination'

interface ClientRow {
    id: string
    telegramId: string
    username: string | null
    firstName: string | null
    balance: number
    tags: string | null
    isBlocked: boolean
    createdAt: string
    tariff: { name: string } | null
    _count: { tickets: number; transactions: number }
}

interface ClientProfile {
    id: string
    telegramId: string
    username: string | null
    firstName: string | null
    lastName: string | null
    balance: number
    tags: string | null
    isBlocked: boolean
    createdAt: string
    totalSpent: number
    ticketCount: number
    tariff: { name: string; price: number } | null
    tickets: { id: string; number: number; status: string; createdAt: string; messages: { content: string }[] }[]
    transactions: { id: string; amount: number; type: string; description: string | null; createdAt: string }[]
    subscriptions: { id: string; status: string; expireAt: string; createdAt: string }[]
}

function ClientProfileDrawer({ clientId, onClose }: { clientId: string; onClose: () => void }) {
    const [profile, setProfile] = useState<ClientProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'tickets' | 'transactions' | 'subs'>('tickets')

    const [liveSub, setLiveSub] = useState<any>(null)
    const [liveLoading, setLiveLoading] = useState(false)
    const [liveError, setLiveError] = useState<string | null>(null)
    const [showQr, setShowQr] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/clients/${clientId}/profile`)
            .then(r => r.json())
            .then(d => { setProfile(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [clientId])

    // Fetch live sub when tab changes to 'subs'
    useEffect(() => {
        if (activeTab === 'subs' && clientId) {
            setLiveLoading(true)
            setLiveError(null)
            fetch(`/api/clients/${clientId}/subscriptions/live`)
                .then(r => r.json())
                .then(d => {
                    if (d.success) setLiveSub(d.subscription)
                    else setLiveError(d.error || 'У клиента нет активных подписок в панели VPN')
                })
                .catch(() => setLiveError('Ошибка связи с API VPN'))
                .finally(() => setLiveLoading(false))
        }
    }, [activeTab, clientId])

    const handleExtend = async (days: number) => {
        if (!confirm(`Вы действительно хотите БЕСПЛАТНО накинуть ${days} дней подписки клиенту?`)) return;
        setLiveLoading(true)
        const res = await fetch(`/api/clients/${clientId}/subscriptions/extend`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addDays: days })
        })
        if (res.ok) {
            const r = await fetch(`/api/clients/${clientId}/subscriptions/live`).then(r => r.json())
            if (r.success) setLiveSub(r.subscription)
        } else {
            alert('Ошибка продления')
        }
        setLiveLoading(false)
    }

    const handleSetLimit = async () => {
        const input = window.prompt('Введите новый лимит трафика в ГБ (например, 50). Введите 0 для безлимита:');
        if (input === null) return;
        const limitGb = parseInt(input);
        if (isNaN(limitGb) || limitGb < 0) {
            alert('Некорректный лимит');
            return;
        }

        setLiveLoading(true)
        const res = await fetch(`/api/clients/${clientId}/subscriptions/extend`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limitGb })
        })
        if (res.ok) {
            const r = await fetch(`/api/clients/${clientId}/subscriptions/live`).then(r => r.json())
            if (r.success) setLiveSub(r.subscription)
        } else {
            alert('Ошибка обновления лимита')
        }
        setLiveLoading(false)
    }

    const handleHwidAction = async (action: 'reset' | 'set_limit') => {
        let limit = 0;
        if (action === 'set_limit') {
            const input = window.prompt('Введите новый лимит устройств. Введите 0 для безлимита:');
            if (input === null) return;
            limit = parseInt(input);
            if (isNaN(limit) || limit < 0) {
                alert('Некорректный лимит');
                return;
            }
        } else {
            if (!confirm('Вы уверены, что хотите сбросить HWID привязку устройства? Выполняйте только если клиент не может подключиться.')) return;
        }

        setLiveLoading(true)
        const res = await fetch(`/api/clients/${clientId}/subscriptions/hwid`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, limit })
        })
        if (res.ok) {
            const r = await fetch(`/api/clients/${clientId}/subscriptions/live`).then(r => r.json())
            if (r.success) setLiveSub(r.subscription)
        } else {
            const err = await res.json().catch(() => ({}));
            alert(`Ошибка обновления HWID: ${err.error || 'Неизвестная ошибка'}${err.details ? '\n' + err.details : ''}`);
        }
        setLiveLoading(false)
    }

    const handleReissue = async () => {
        if (!confirm('Перевыпустить конфиг? Старая ссылка на ВПН перестанет работать!')) return;
        setLiveLoading(true)
        const res = await fetch(`/api/clients/${clientId}/subscriptions/reissue`, { method: 'POST' })
        if (res.ok) {
            alert('Связка конфига успешно обновлена.')
            const r = await fetch(`/api/clients/${clientId}/subscriptions/live`).then(r => r.json())
            if (r.success) setLiveSub(r.subscription)
        } else {
            const err = await res.json().catch(() => ({}));
            alert(`Ошибка перевыпуска: ${err.error || 'Неизвестная ошибка'}`);
        }
        setLiveLoading(false)
    }

    const handleRevoke = async () => {
        if (!confirm('ВНИМАНИЕ! Полностью удалить пользователя из панели VPN и закрыть ему доступ?')) return;
        setLiveLoading(true)
        const res = await fetch(`/api/clients/${clientId}/subscriptions/revoke`, { method: 'POST' })
        if (res.ok) {
            setLiveSub(null)
            setLiveError('Подписка отозвана и удалена.')
        } else {
            alert('Ошибка удаления')
        }
        setLiveLoading(false)
    }

    const statusColors: Record<string, string> = {
        new: '#3b82f6', open: '#f59e0b', pending: '#8b5cf6', resolved: '#10b981', closed: '#6b7280'
    }

    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                zIndex: 2000, animation: 'fadeIn 0.3s ease'
            }} />

            {/* Drawer */}
            <div style={{
                position: 'fixed', top: '20px', bottom: '20px', right: '20px',
                width: '480px', background: 'var(--bg-sidebar)', borderRadius: '28px',
                border: '1px solid var(--overlay-light)', boxShadow: '-20px 0 80px rgba(0,0,0,0.4)',
                zIndex: 2001, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{ padding: '28px', borderBottom: '1px solid var(--overlay-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Профиль клиента</h2>
                    <button onClick={onClose} style={{
                        width: '40px', height: '40px', borderRadius: '14px', background: 'var(--overlay-light)',
                        border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><X size={20} /></button>
                </div>

                {loading || !profile ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Загрузка...
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                        {/* Avatar & Name */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '20px',
                                background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '24px', fontWeight: 800, flexShrink: 0
                            }}>
                                {(profile.firstName || profile.username || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                                    {profile.firstName || profile.username || 'Unknown'}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    @{profile.username || profile.telegramId}
                                </div>
                                {profile.isBlocked && (
                                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <Ban size={12} /> Заблокирован
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                            {[
                                { icon: DollarSign, label: 'Баланс', value: `${profile.balance}₽`, color: '#10b981' },
                                { icon: Ticket, label: 'Тикетов', value: profile.ticketCount, color: '#3b82f6' },
                                { icon: Zap, label: 'Потрачено', value: `${profile.totalSpent}₽`, color: '#8b5cf6' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    padding: '14px', borderRadius: '16px', background: 'var(--overlay-base)',
                                    border: '1px solid var(--overlay-light)', textAlign: 'center'
                                }}>
                                    <s.icon size={18} color={s.color} style={{ marginBottom: '6px' }} />
                                    <div style={{ fontSize: '18px', fontWeight: 800 }}>{s.value}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Tags */}
                        {profile.tags && JSON.parse(profile.tags).length > 0 && (
                            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {JSON.parse(profile.tags).map((tag: string, i: number) => (
                                    <span key={i} style={{
                                        padding: '5px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                        background: 'var(--overlay-light)', color: 'var(--text-secondary)',
                                        border: '1px solid var(--overlay-light)'
                                    }}><Tag size={10} style={{ marginRight: '4px' }} />{tag}</span>
                                ))}
                            </div>
                        )}

                        {/* Tariff & Registration */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                flex: 1, padding: '14px', borderRadius: '16px', background: 'var(--overlay-base)',
                                border: '1px solid var(--overlay-light)'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Тариф</div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>{profile.tariff?.name || 'Нет'}</div>
                            </div>
                            <div style={{
                                flex: 1, padding: '14px', borderRadius: '16px', background: 'var(--overlay-base)',
                                border: '1px solid var(--overlay-light)'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Регистрация</div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                                    {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex', gap: '4px', padding: '4px', background: 'var(--overlay-base)',
                            borderRadius: '14px', marginBottom: '16px'
                        }}>
                            {([
                                { key: 'tickets', label: 'Тикеты' },
                                { key: 'transactions', label: 'Транзакции' },
                                { key: 'subs', label: 'Подписки' },
                            ] as const).map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                    flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                                    border: 'none', cursor: 'pointer',
                                    background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                                    color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                    boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none'
                                }}>{tab.label}</button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeTab === 'tickets' && profile.tickets.map(t => (
                                <div key={t.id} style={{
                                    padding: '14px', borderRadius: '14px', background: 'var(--overlay-light)',
                                    border: '1px solid var(--overlay-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700 }}>#{t.number}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {t.messages[0]?.content?.substring(0, 40) || '—'}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                        background: (statusColors[t.status] || '#6b7280') + '20',
                                        color: statusColors[t.status] || '#6b7280'
                                    }}>{t.status}</span>
                                </div>
                            ))}
                            {activeTab === 'transactions' && profile.transactions.map(tx => (
                                <div key={tx.id} style={{
                                    padding: '14px', borderRadius: '14px', background: 'var(--overlay-light)',
                                    border: '1px solid var(--overlay-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{tx.description || tx.type}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {new Date(tx.createdAt).toLocaleDateString('ru-RU')}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontWeight: 800, fontSize: '14px',
                                        color: tx.type === 'credit' ? '#10b981' : '#ef4444'
                                    }}>
                                        {tx.type === 'credit' ? '+' : '-'}{tx.amount}₽
                                    </span>
                                </div>
                            ))}
                            {activeTab === 'subs' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {liveLoading ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка данных из ядра VPN... ⏳</div>
                                    ) : liveSub ? (
                                        <div style={{
                                            border: '1px solid var(--overlay-hover)', borderRadius: '16px',
                                            background: 'var(--bg-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Shield size={16} color="#3b82f6" />
                                                    VLESS / Reality
                                                </h3>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {new Date(liveSub.expireAt).getTime() - Date.now() < 172800000 && new Date(liveSub.expireAt).getTime() > Date.now() && (
                                                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Скоро истечет</span>
                                                    )}
                                                    {liveSub.trafficLimitBytes > 0 && (liveSub.userTraffic?.usedTrafficBytes || 0) >= liveSub.trafficLimitBytes && (
                                                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Лимит исчерпан</span>
                                                    )}
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800,
                                                        background: liveSub.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: liveSub.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                                                    }}>{liveSub.status}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--overlay-base)', padding: '12px', borderRadius: '12px' }}>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Потрачено трафика</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                                                        {((liveSub.userTraffic?.usedTrafficBytes || 0) / 1073741824).toFixed(2)} ГБ
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
                                                            {liveSub.trafficLimitBytes === 0 ? ' / Безлимит' : ` / ${(liveSub.trafficLimitBytes / 1073741824).toFixed(0)} ГБ`}
                                                        </span>
                                                    </div>
                                                    {liveSub.trafficLimitBytes > 0 ? (
                                                        <div style={{ width: '100%', height: '6px', background: 'var(--overlay-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${Math.min(((liveSub.userTraffic?.usedTrafficBytes || 0) / liveSub.trafficLimitBytes) * 100, 100)}%`,
                                                                height: '100%',
                                                                background: ((liveSub.userTraffic?.usedTrafficBytes || 0) / liveSub.trafficLimitBytes) > 0.9 ? '#ef4444' : ((liveSub.userTraffic?.usedTrafficBytes || 0) / liveSub.trafficLimitBytes) > 0.7 ? '#f59e0b' : '#10b981',
                                                                transition: 'width 0.3s ease'
                                                            }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '100%', height: '6px', background: 'rgba(16,185,129,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: '100%', height: '100%', background: '#10b981', opacity: 0.5 }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Истекает</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: new Date(liveSub.expireAt) < new Date() ? '#ef4444' : 'var(--text-primary)' }}>
                                                        {new Date(liveSub.expireAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {liveSub.url && (
                                                <div style={{ fontSize: '12px' }}>
                                                    <div style={{ marginBottom: '4px', color: 'var(--text-muted)' }}>Ссылка на настройки (Subscription URL)</div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input
                                                            readOnly
                                                            value={liveSub.url}
                                                            onClick={e => { (e.target as HTMLInputElement).select(); navigator.clipboard.writeText(liveSub.url) }}
                                                            style={{
                                                                flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--overlay-light)',
                                                                background: 'var(--overlay-base)', color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer'
                                                            }}
                                                            title="Нажми, чтобы скопировать"
                                                        />
                                                        <button onClick={() => setShowQr(true)} style={{
                                                            width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)',
                                                            color: '#3b82f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <QrCode size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--overlay-base)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Smartphone size={14} color="var(--text-muted)" /> Устройства (HWID)
                                                        <span style={{ padding: '2px 6px', background: 'var(--overlay-light)', borderRadius: '6px', fontSize: '10px' }}>
                                                            {liveSub.hwidDeviceLimit ? `Лимит: ${liveSub.hwidDeviceLimit}` : 'Безлимит'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {liveSub.subLastUserAgent && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <Activity size={10} /> {liveSub.subLastUserAgent}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handleHwidAction('set_limit')} style={{
                                                        flex: 1, padding: '6px 12px', background: 'var(--overlay-light)', color: 'var(--text-primary)', border: 'none',
                                                        borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                                                    }}>
                                                        Изменить лимит
                                                    </button>
                                                    <button onClick={() => handleHwidAction('reset')} style={{
                                                        flex: 1, padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none',
                                                        borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                    }}>
                                                        <Unlink size={12} /> Сбросить HWID
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleExtend(1)} style={{
                                                    flex: 1, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <Plus size={14} /> +1 День
                                                </button>
                                                <button onClick={() => handleExtend(7)} style={{
                                                    flex: 1, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <Plus size={14} /> +7 Дней
                                                </button>
                                                <button onClick={() => handleExtend(30)} style={{
                                                    flex: 1, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <Plus size={14} /> +30 Дней
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={handleSetLimit} style={{
                                                    flex: 1, padding: '8px 12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <Database size={14} /> Лимит ГБ
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={handleReissue} style={{
                                                    flex: 1, padding: '8px 12px', background: 'var(--overlay-light)', color: 'var(--text-primary)', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <RefreshCw size={14} /> Перевыпустить
                                                </button>
                                                <button onClick={handleRevoke} style={{
                                                    flex: 1, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}>
                                                    <Trash2 size={14} /> Заблокировать
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>{liveError || 'Подписка не найдена'}</div>
                                    )}
                                </div>
                            )}
                            {(activeTab === 'tickets' && profile.tickets.length === 0) && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Тикетов нет</div>
                            )}
                            {(activeTab === 'transactions' && profile.transactions.length === 0) && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Транзакций нет</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            ` }} />

            {/* QR Modal */}
            {showQr && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                    zIndex: 2002, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease'
                }} onClick={() => setShowQr(false)}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '32px', borderRadius: '24px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
                        animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid var(--overlay-light)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>VLESS / Reality QR</h3>
                        <div style={{ background: 'white', padding: '16px', borderRadius: '16px' }}>
                            <QRCodeSVG value={liveSub?.url || ''} size={220} />
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '240px' }}>
                            Отсканируйте этот QR-код из приложения Happ для подключения.
                        </p>
                        <button onClick={() => setShowQr(false)} style={{
                            width: '100%', padding: '12px', background: 'var(--overlay-light)', color: 'var(--text-primary)', border: 'none',
                            borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer'
                        }}>
                            Закрыть
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default function ClientsPage() {
    const [clients, setClients] = useState<ClientRow[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedClient, setSelectedClient] = useState<string | null>(null)
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    // Parse the query string on load to see if a client ID was passed (from tickets page)
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const openClientId = queryParams.get('openProfile')
        if (openClientId) {
            setSelectedClient(openClientId)
            // clean up url without reloading
            window.history.replaceState({}, '', '/clients')
        }
    }, [])

    useEffect(() => {
        fetch('/api/clients?limit=100')
            .then(r => r.json())
            .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    // Extract all unique tags, deduplicating them case-insensitively but preserving first found case
    const uniqueTags = useMemo(() => {
        const tagMap = new Map<string, string>()
        clients.forEach(c => {
            if (!c.tags) return
            try {
                const parsed = JSON.parse(c.tags)
                if (Array.isArray(parsed)) {
                    parsed.forEach(t => {
                        if (typeof t === 'string') {
                            const trimmed = t.trim()
                            if (trimmed) {
                                const lower = trimmed.toLowerCase()
                                if (!tagMap.has(lower)) {
                                    tagMap.set(lower, trimmed)
                                }
                            }
                        }
                    })
                }
            } catch {
                // Ignore parse errors
            }
        })
        return Array.from(tagMap.values()).sort((a, b) => a.localeCompare(b))
    }, [clients])

    // Filter tags for suggestions based on current search input
    const suggestedTags = useMemo(() => {
        if (!search.trim()) return uniqueTags
        const lowerSearch = search.toLowerCase()
        return uniqueTags.filter((tag: string) => tag.toLowerCase().includes(lowerSearch))
    }, [uniqueTags, search])

    // Reset pagination to page 1 whenever search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedTag])

    const filtered = clients.filter(c => {
        const matchesSearch = (c.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.username || '').toLowerCase().includes(search.toLowerCase()) ||
            c.telegramId.includes(search) ||
            (c.tags || '').toLowerCase().includes(search.toLowerCase())

        let matchesTag = true
        if (selectedTag) {
            try {
                const parsedTags = c.tags ? JSON.parse(c.tags) : []
                if (Array.isArray(parsedTags)) {
                    matchesTag = parsedTags.some(t => typeof t === 'string' && t.trim().toLowerCase() === selectedTag.toLowerCase())
                } else {
                    matchesTag = false
                }
            } catch {
                matchesTag = false
            }
        }

        return matchesSearch && matchesTag
    })

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users size={28} color="var(--accent-primary)" /> Аудитория
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{clients.length} клиентов в системе</p>
                </div>
                <div style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)',
                        padding: '10px 18px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '320px',
                        boxShadow: 'inset 0 2px 4px var(--overlay-base)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderColor: isSearchFocused ? 'var(--accent-primary)' : 'var(--border-color)'
                    }}>
                        <Search size={18} color="var(--text-muted)" />
                        {selectedTag && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-gradient)',
                                color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700
                            }}>
                                <Tag size={10} />
                                {selectedTag}
                                <button onClick={() => setSelectedTag(null)} style={{ background: 'none', border: 'none', color: 'white', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={selectedTag ? "Поиск..." : "Поиск или фильтр тегов..."}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            style={{
                                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                                fontSize: '14px', color: 'var(--text-primary)', width: '100%'
                            }} />
                    </div>

                    {/* Tag Suggestions Dropdown */}
                    {isSearchFocused && search.trim().length > 0 && suggestedTags.length > 0 && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', zIndex: 10,
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
                            padding: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', backdropFilter: 'blur(20px)',
                            display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto',
                            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', padding: '6px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Подсказки автодополнения
                            </div>
                            {suggestedTags.map((tag: string) => (
                                <button
                                    key={tag}
                                    onMouseDown={(e) => {
                                        e.preventDefault() // prevent input blur so focus isn't lost instantly if they misclick
                                        setSelectedTag(selectedTag === tag ? null : tag);
                                        setSearch('');
                                        setIsSearchFocused(false);
                                    }}
                                    style={{
                                        padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                        background: selectedTag === tag ? 'var(--accent-gradient)' : 'transparent', textAlign: 'left',
                                        color: selectedTag === tag ? 'white' : 'var(--text-primary)', border: 'none', cursor: 'pointer',
                                        transition: 'background 0.2s', display: 'flex', alignItems: 'center'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = selectedTag === tag ? 'var(--accent-gradient)' : 'var(--overlay-base)'}
                                    onMouseOut={e => e.currentTarget.style.background = selectedTag === tag ? 'var(--accent-gradient)' : 'transparent'}
                                >
                                    <Tag size={12} style={{ marginRight: '6px', opacity: 0.7 }} />
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
            }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Клиентов не найдено</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--overlay-light)' }}>
                                {['Клиент', 'Telegram ID', 'Баланс', 'Тариф', 'Тикетов', 'Дата', ''].map(h => (
                                    <th key={h} style={{
                                        padding: '16px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                                        color: 'var(--text-muted)', textAlign: 'left', letterSpacing: '1px'
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(client => (
                                <tr key={client.id} onClick={() => setSelectedClient(client.id)}
                                    style={{ borderBottom: '1px solid var(--overlay-base)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseOver={e => (e.currentTarget.style.background = 'var(--overlay-light)')}
                                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '38px', height: '38px', borderRadius: '12px',
                                                background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0
                                            }}>
                                                {(client.firstName || client.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                                    {client.firstName || client.username || 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    @{client.username || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                        {client.telegramId}
                                    </td>
                                    <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: '14px' }}>
                                        {client.balance}₽
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                            background: client.tariff ? 'rgba(16,185,129,0.1)' : 'var(--overlay-base)',
                                            color: client.tariff ? '#10b981' : 'var(--text-muted)'
                                        }}>
                                            {client.tariff?.name || 'Нет'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600 }}>
                                        {client._count?.tickets || 0}
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && filtered.length > itemsPerPage && (
                    <div style={{ padding: '20px' }}>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(filtered.length / itemsPerPage)}
                            onPageChange={(page) => {
                                setCurrentPage(page)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                        />
                    </div>
                )}
            </div>

            {
                selectedClient && (
                    <ClientProfileDrawer clientId={selectedClient} onClose={() => setSelectedClient(null)} />
                )
            }
        </div >
    )
}
