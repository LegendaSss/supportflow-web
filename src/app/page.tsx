import { prisma } from '@/lib/prisma'
import {
  Ticket as TicketIcon, Users, MessageSquare, Zap, Activity,
  CheckCircle2, Clock, Terminal, ShieldCheck, ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { getBotStatus } from '@/lib/bot'

// Component for the Live Activity Feed
async function LiveActivities() {
  const activities = await prisma!.activityLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="activity-feed" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {activities.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--overlay-base)', borderRadius: '16px' }}>
          Событий пока нет
        </div>
      ) : (
        activities.map((activity: any) => (
          <div key={activity.id} style={{
            display: 'flex', gap: '12px', padding: '12px', background: 'var(--overlay-base)',
            borderRadius: '16px', border: '1px solid var(--overlay-light)',
            transition: 'transform 0.2s', cursor: 'default'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', background: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              flexShrink: 0
            }}>
              {activity.type === 'user_joined' ? <Users size={16} /> :
                activity.type === 'ticket_created' ? <TicketIcon size={16} /> :
                  activity.type === 'broadcast_completed' ? <Zap size={16} /> : <Activity size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{activity.message}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {new Date(activity.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default async function Dashboard() {
  const ticketCounts = {
    total: await prisma!.ticket.count(),
    new: await prisma!.ticket.count({ where: { status: 'new' } }),
    open: await prisma!.ticket.count({ where: { status: 'open' } }),
    pending: await prisma!.ticket.count({ where: { status: 'pending' } }),
    resolved: await prisma!.ticket.count({ where: { status: 'resolved' } }),
    closed: await prisma!.ticket.count({ where: { status: 'closed' } }),
  }

  const clientCount = await prisma!.client.count()
  const messageCount = await prisma!.message.count()
  const botStatus = getBotStatus()

  // Revenue data for sparkline
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentTransactions = await prisma!.transaction.findMany({
    where: { type: 'credit', createdAt: { gte: sevenDaysAgo } },
    select: { amount: true, createdAt: true }
  })
  const revenueByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    revenueByDay[d.toISOString().split('T')[0]] = 0
  }
  recentTransactions.forEach(tx => {
    const key = tx.createdAt.toISOString().split('T')[0]
    if (revenueByDay[key] !== undefined) revenueByDay[key] += tx.amount
  })
  const dailyRevenue = Object.values(revenueByDay)
  const totalWeekRevenue = dailyRevenue.reduce((a, b) => a + b, 0)

  const recentTickets = await prisma!.ticket.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      client: true,
      operator: true,
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  })

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>🛰️ Mission Control</h1>
          <p style={{ color: 'var(--text-muted)' }}>Глобальный мониторинг вашей экосистемы</p>
        </div>

        {/* Bot Pulse Widget */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          background: 'var(--bg-card)', padding: '12px 24px',
          borderRadius: '20px', border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: botStatus.running ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: botStatus.running ? '#10b981' : '#ef4444'
            }}>
              <Zap size={20} className={botStatus.running ? "pulse-animation" : ""} />
            </div>
            {botStatus.running && (
              <div style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#10b981', border: '2px solid var(--bg-card)'
              }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Статус бота</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {botStatus.running ? 'Активен' : 'Остановлен'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
        {/* Main Stats Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TicketIcon size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>+12%</span>
              </div>
              <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800 }}>{ticketCounts.total}</div>
              <div className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Всего тикетов</div>
            </div>

            <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800 }}>{clientCount}</div>
              <div className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Клиентов</div>
            </div>

            <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(238, 43, 84, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800 }}>{ticketCounts.new + ticketCounts.open}</div>
              <div className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>В обработке</div>
            </div>

            <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800 }}>{Math.round(totalWeekRevenue)}₽</div>
              <div className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Доход за неделю</div>
              {/* SVG Sparkline */}
              <svg viewBox="0 0 120 30" width="100%" height="30" style={{ marginTop: '10px' }} preserveAspectRatio="none">
                {(() => {
                  const maxVal = Math.max(...dailyRevenue, 1)
                  const points = dailyRevenue.map((v, i) => {
                    const x = (i / Math.max(dailyRevenue.length - 1, 1)) * 120
                    const y = 28 - (v / maxVal) * 26
                    return `${x},${y}`
                  }).join(' ')
                  return (
                    <>
                      <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points={`0,28 ${points} 120,28`} fill="url(#spark-fill)" stroke="none" />
                      <defs>
                        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </>
                  )
                })()}
              </svg>
            </div>
          </div>

          {/* Recent Tickets Table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="var(--accent-primary)" /> Недавние тикеты
              </h3>
              <Link href="/tickets" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Все тикеты <ArrowUpRight size={14} />
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                📭 У вас пока нет обращений
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', marginTop: '-8px' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Клиент</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Сообщение</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Статус</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Время</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="table-row-hover" style={{ background: 'var(--overlay-base)' }}>
                      <td style={{ padding: '14px 16px', borderRadius: '12px 0 0 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          {ticket.client.firstName || ticket.client.username || 'Client'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{ticket.client.username || ticket.client.telegramId}</div>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {ticket.messages[0]?.content || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`status-badge ${ticket.status}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                          {ticket.status === 'new' ? 'Новый' : ticket.status === 'open' ? 'В работе' : 'Ожидает'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', borderRadius: '0 12px 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {new Date(ticket.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '24px', padding: '24px', minHeight: '500px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="var(--accent-primary)" /> Живая лента
            </h3>
            <LiveActivities />
          </div>

          <div style={{
            background: 'var(--accent-gradient)', borderRadius: '24px', padding: '24px', color: 'white',
            boxShadow: '0 12px 24px rgba(238, 43, 84, 0.2)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h4 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} /> Безопасность
              </h4>
              <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '8px', lineHeight: 1.5 }}>
                Все соединения зашифрованы. Резервное копирование выполняется ежедневно.
              </p>
            </div>
            <ShieldCheck size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1, color: 'white' }} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
                .pulse-animation {
                    animation: zap-pulse 2s infinite;
                }
                @keyframes zap-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .table-row-hover:hover {
                    background: var(--overlay-light) !important;
                }
            ` }} />
    </div>
  )
}
