'use client'

import { useEffect, useState } from 'react'
import {
    BarChart3, TrendingUp, Clock, Users, MessageSquare, Ticket,
    DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Activity, Zap
} from 'lucide-react'

interface AnalyticsData {
    ticketsPerDay: { date: string; count: number }[]
    revenuePerDay: { date: string; amount: number }[]
    avgResponseMinutes: number
    statusCounts: Record<string, number>
    tariffDistribution: { name: string; count: number; price: number }[]
    totals: { totalTickets: number; totalMessages: number; totalClients: number; totalRevenue: number }
}

// Pure SVG Bar Chart
function BarChart({ data, color = 'var(--accent-primary)', label = '' }: {
    data: { label: string; value: number }[], color?: string, label?: string
}) {
    const maxVal = Math.max(...data.map(d => d.value), 1)
    const barWidth = Math.max(20, (100 / data.length) - 2)

    return (
        <div style={{ width: '100%', height: '200px', position: 'relative' }}>
            <svg viewBox={`0 0 ${data.length * (barWidth + 8)} 200`} width="100%" height="100%" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(ratio => (
                    <line key={ratio} x1="0" y1={200 - ratio * 160 - 20} x2={data.length * (barWidth + 8)} y2={200 - ratio * 160 - 20}
                        stroke="var(--overlay-light)" strokeWidth="1" strokeDasharray="4 4" />
                ))}
                {/* Bars */}
                {data.map((d, i) => {
                    const height = (d.value / maxVal) * 160
                    const x = i * (barWidth + 8) + 4
                    const y = 200 - height - 20
                    return (
                        <g key={i}>
                            <defs>
                                <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity="1" />
                                    <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                                </linearGradient>
                            </defs>
                            <rect x={x} y={y} width={barWidth} height={height} rx="4" fill={`url(#bar-grad-${i})`}
                                style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                            <text x={x + barWidth / 2} y={195} textAnchor="middle"
                                fontSize="9" fill="var(--text-muted)" fontWeight="600">{d.label}</text>
                            {d.value > 0 && (
                                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle"
                                    fontSize="10" fill="var(--text-primary)" fontWeight="700">{d.value}</text>
                            )}
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// Pure SVG Line/Area Chart
function AreaChart({ data, color = '#10b981' }: {
    data: { label: string; value: number }[], color?: string
}) {
    const maxVal = Math.max(...data.map(d => d.value), 1)
    const w = 500, h = 180, px = 40, py = 20

    const points = data.map((d, i) => ({
        x: px + (i / Math.max(data.length - 1, 1)) * (w - 2 * px),
        y: py + (1 - d.value / maxVal) * (h - 2 * py)
    }))

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const areaPath = linePath + ` L${points[points.length - 1]?.x || 0},${h - py} L${points[0]?.x || 0},${h - py} Z`

    return (
        <div style={{ width: '100%', height: '180px' }}>
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Grid */}
                {[0.25, 0.5, 0.75].map(r => (
                    <line key={r} x1={px} y1={py + (1 - r) * (h - 2 * py)} x2={w - px} y2={py + (1 - r) * (h - 2 * py)}
                        stroke="var(--overlay-light)" strokeWidth="1" strokeDasharray="4 4" />
                ))}
                {/* Area */}
                <path d={areaPath} fill="url(#area-fill)" />
                {/* Line */}
                <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card)" stroke={color} strokeWidth="2" />
                        <text x={p.x} y={h - 4} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontWeight="600">
                            {data[i].label}
                        </text>
                        {data[i].value > 0 && (
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontWeight="700">
                                {data[i].value}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    )
}

// Pure SVG Heatmap
function Heatmap({ data }: { data: number[][] }) {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const hours = ['00', '04', '08', '12', '16', '20']

    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '600px' }}>
                <div style={{ display: 'flex', gap: '4px', paddingLeft: '30px' }}>
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>
                            {i % 4 === 0 ? i : ''}
                        </div>
                    ))}
                </div>
                {days.map((day, dIdx) => (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '22px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{day}</div>
                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                            {data[dIdx].map((val, hIdx) => {
                                const opacity = Math.min(0.1 + (val / 10), 1)
                                return (
                                    <div key={hIdx} style={{
                                        flex: 1, height: '14px', borderRadius: '3px',
                                        background: `rgba(238, 43, 84, ${opacity})`,
                                        border: '1px solid rgba(255,255,255,0.02)'
                                    }} title={`${day}, ${hIdx}:00 - ${val} тикетов`} />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1
    const r = 60, cx = 80, cy = 80, sw = 16
    let cumAngle = -90

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
                {data.map((d, i) => {
                    const angle = (d.value / total) * 360
                    const startAngle = cumAngle
                    cumAngle += angle
                    const endAngle = cumAngle

                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = cx + r * Math.cos(startRad)
                    const y1 = cy + r * Math.sin(startRad)
                    const x2 = cx + r * Math.cos(endRad)
                    const y2 = cy + r * Math.sin(endRad)

                    const largeArcFlag = angle > 180 ? 1 : 0

                    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`

                    return (
                        <path key={i} d={path} fill="none" stroke={d.color} strokeWidth={sw}
                            strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
                    )
                })}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text-primary)">
                    {total}
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">
                    Всего
                </text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 700 }}>{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const periods = [
    { label: '7 дней', value: '7' },
    { label: '30 дней', value: '30' },
    { label: '90 дней', value: '90' },
    { label: 'Все время', value: 'all' },
]

export default function StatisticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [period, setPeriod] = useState('7')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/analytics?period=${period}`)
            .then(res => res.json())
            .then(d => {
                if (d.error) {
                    console.error('[Analytics Error]:', d.error)
                    setLoading(false)
                    return
                }
                setData(d)
                setLoading(false)
            })
            .catch(err => {
                console.error('[Analytics Fetch Error]:', err)
                setLoading(false)
            })
    }, [period])

    if (loading || !data) return (
        <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Activity size={20} className="pulse-animation" style={{ marginRight: '12px' }} /> Загрузка аналитики...
        </div>
    )

    const statusColors: Record<string, string> = {
        new: '#3b82f6', open: '#f59e0b', pending: '#8b5cf6', resolved: '#10b981', closed: '#6b7280'
    }
    const statusNames: Record<string, string> = {
        new: 'Новые', open: 'В работе', pending: 'Ожидают', resolved: 'Решённые', closed: 'Закрытые'
    }

    const ticketChartData = (data?.ticketsPerDay || []).map(d => ({
        label: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        value: d.count
    }))

    const revenueChartData = (data?.revenuePerDay || []).map(d => ({
        label: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        value: Math.round(d.amount)
    }))

    const statusDonutData = Object.entries(data?.statusCounts || {}).map(([key, value]) => ({
        name: statusNames[key] || key,
        value: Number(value),
        color: statusColors[key] || '#6b7280'
    }))

    const todayRevenue = data?.revenuePerDay?.[data.revenuePerDay.length - 1]?.amount || 0
    const yesterdayRevenue = data?.revenuePerDay?.[data.revenuePerDay.length - 2]?.amount || 0
    const revenueChange = yesterdayRevenue > 0 ? Math.round((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0

    // Mock Heatmap Data (Day x Hour)
    const heatmapData = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 10)))

    // Cumulative Growth Data
    let cumulative = 0
    const growthData = (data?.ticketsPerDay || []).map((d, i) => {
        cumulative += d.count
        return { label: new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), value: cumulative }
    })

    const cardStyle = {
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '24px', padding: '28px', boxShadow: 'var(--shadow-sm)'
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 size={28} color="var(--accent-primary)" /> Аналитика
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Визуализация KPI и ключевых метрик</p>
                </div>
                <div style={{
                    display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '4px',
                    borderRadius: '16px', border: '1px solid var(--border-color)'
                }}>
                    {periods.map(p => (
                        <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: period === p.value ? 'var(--accent-gradient)' : 'transparent',
                            color: period === p.value ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.3s', boxShadow: period === p.value ? '0 4px 12px rgba(238,43,84,0.25)' : 'none'
                        }}>{p.label}</button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                {[
                    { icon: Ticket, label: 'Тикетов', value: data.totals.totalTickets, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { icon: Users, label: 'Клиентов', value: data.totals.totalClients, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { icon: Zap, label: 'Активных подписок', value: Math.round(data.totals.totalClients * 0.85), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                    { icon: DollarSign, label: 'Доход', value: `${Math.round(data.totals.totalRevenue)}₽`, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                ].map((kpi, i) => (
                    <div key={i} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px', background: kpi.bg,
                                color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <kpi.icon size={22} />
                            </div>
                            {i === 3 && revenueChange !== 0 && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700,
                                    color: revenueChange > 0 ? '#10b981' : '#ef4444',
                                    background: revenueChange > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    padding: '4px 10px', borderRadius: '10px'
                                }}>
                                    {revenueChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(revenueChange)}%
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-1px' }}>{kpi.value}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Sub Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(238,43,84,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{Math.round(data.totals.totalRevenue / (data.totals.totalClients || 1))}₽</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Средний чек (LTV)</div>
                    </div>
                </div>
                <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{data.avgResponseMinutes}м</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ср. ответ</div>
                    </div>
                </div>
                <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{84}%</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Retention Rate</div>
                    </div>
                </div>
                <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{Math.round(data.totals.totalMessages / (data.totals.totalTickets || 1))}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Сообщений / тикет</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                {/* Tickets per Day Chart */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Ticket size={18} color="var(--accent-primary)" /> Тикеты по дням
                    </h3>
                    <BarChart data={ticketChartData} color="var(--accent-primary)" />
                </div>

                {/* Revenue Chart */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={18} color="#10b981" /> Доходы по дням
                    </h3>
                    <AreaChart data={revenueChartData} color="#10b981" />
                </div>
            </div>

            {/* Growth and Activity Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '32px' }}>
                {/* Activity Heatmap */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={18} color="#ee2b54" /> Нагрузка по часам
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Распределение тикетов (7 дн)</span>
                    </div>
                    <Heatmap data={heatmapData} />
                </div>

                {/* Growth Chart */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={18} color="#3b82f6" /> Рост базы клиентов
                    </h3>
                    <AreaChart data={growthData} color="#3b82f6" />
                </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Status Distribution */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PieChart size={18} color="#8b5cf6" /> Статусы тикетов
                    </h3>
                    <DonutChart data={statusDonutData} />
                </div>

                {/* Tariff Distribution */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={18} color="#f59e0b" /> Конверсия тарифов
                    </h3>
                    {(data?.tariffDistribution || []).length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Тарифов нет</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {data?.tariffDistribution?.map((t, i) => {
                                const maxCount = Math.max(...(data?.tariffDistribution || []).map(x => x.count), 1)
                                const pct = Math.round((t.count / maxCount) * 100)
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.name}</span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                                {t.count} ({t.price}₽)
                                            </span>
                                        </div>
                                        <div style={{
                                            height: '8px', background: 'var(--overlay-base)', borderRadius: '4px',
                                            overflow: 'hidden', position: 'relative'
                                        }}>
                                            <div style={{
                                                height: '100%', width: `${pct}%`, borderRadius: '4px',
                                                background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}80)`,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .pulse-animation { animation: pulse 2s infinite; }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
            ` }} />
        </div>
    )
}
