'use client'

import { useEffect, useState, useRef } from 'react'
import {
    Paperclip, Mic, Send, Check, CheckCheck,
    MessageSquare, Trash2, X, Play, Pause, AlertTriangle,
    Search, Stethoscope, RefreshCw, Plus, Zap,
    Wallet, TrendingUp, Fingerprint, Activity, Clock,
    ChevronRight, User, Hash, Shield, Edit2
} from 'lucide-react'
import { SearchModal } from '@/components/SearchModal'
import { Pagination } from '@/components/Pagination'
import confetti from 'canvas-confetti'

/* ─── Interfaces ─── */

interface Ticket {
    id: string
    number: number
    status: string
    priority: string
    createdAt: string
    client: {
        id: string
        firstName: string | null
        username: string | null
        telegramId: string
        tags: string | null
    }
    operator: { name: string } | null
    messages: { content: string; createdAt: string }[]
}

interface ChatMessage {
    id: string
    content: string
    senderType: string
    createdAt: string
    mediaType: string | null
    mediaUrl: string | null
    fileName: string | null
    duration: number | null
    isRead: boolean
    isEdited: boolean
    telegramMsgId: number | null
    isInternal?: boolean
}

interface Template {
    id: string
    title: string
    content: string
    category: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: 'Новый', color: '#ee2b54', bg: 'rgba(238,43,84,0.1)' },
    open: { label: 'В работе', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    pending: { label: 'Ожидание', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
    resolved: { label: 'Решён', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    closed: { label: 'Закрыт', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

/* ─── Audio Player ─── */

function AudioPlayer({ src, duration, isOp }: { src: string; duration?: number; isOp: boolean }) {
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [time, setTime] = useState(0)
    const ref = useRef<HTMLAudioElement>(null)

    const toggle = () => {
        if (!ref.current) return
        playing ? ref.current.pause() : ref.current.play()
        setPlaying(!playing)
    }

    const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: isOp ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderRadius: '12px', minWidth: '180px' }}>
            <audio ref={ref} src={src} onTimeUpdate={() => { if (!ref.current) return; setTime(ref.current.currentTime); const d = ref.current.duration || duration || 1; setProgress((ref.current.currentTime / d) * 100) }} onEnded={() => setPlaying(false)} />
            <button onClick={toggle} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: isOp ? 'rgba(255,255,255,0.9)' : 'var(--accent-primary)', color: isOp ? '#1a1a2e' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {playing ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: isOp ? 'white' : 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.1s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '3px', opacity: 0.5 }}>
                    <span>{fmt(time)}</span><span>{fmt(duration || 0)}</span>
                </div>
            </div>
        </div>
    )
}

function Media({ msg }: { msg: ChatMessage }) {
    if (!msg.mediaUrl) return null
    const isOp = msg.senderType === 'operator'
    if (msg.mediaType === 'photo') return <img src={msg.mediaUrl} style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '6px', cursor: 'zoom-in' }} alt="" />
    if (msg.mediaType === 'voice') return <AudioPlayer src={msg.mediaUrl} duration={msg.duration || 0} isOp={isOp} />
    if (msg.mediaType === 'video') return <video src={msg.mediaUrl} controls style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '6px' }} />
    return (
        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', marginBottom: '6px', fontSize: '12px' }}>
            <Paperclip size={14} /> {msg.fileName || 'Файл'}
        </a>
    )
}

/* ─── Typing Indicator ─── */

function TypingDots() {
    return (
        <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', animation: 'fadeIn .3s' }}>
            {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.4, animation: `pulse 1.2s ${d}s infinite` }} />)}
        </div>
    )
}

/* ─── Time Ago Helper ─── */

function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'только что'
    if (m < 60) return `${m}м`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}ч`
    return `${Math.floor(h / 24)}д`
}

/* ─── Main Page ─── */

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [activeTab, setActiveTab] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [replyText, setReplyText] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const perPage = 15
    const [clientInfo, setClientInfo] = useState<{
        id: string; firstName: string | null; username: string | null;
        telegramId: string; balance: number; tags: string | null;
        tariff: { name: string } | null;
        transactions: Array<{ amount: number; type: string; description: string | null; createdAt: string }>
    } | null>(null)

    const [counts, setCounts] = useState({ all: 0, mine: 0, unassigned: 0 })
    const [isSending, setIsSending] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [tagInput, setTagInput] = useState('')
    const [typingId, setTypingId] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isInternal, setIsInternal] = useState(false)
    const [txAmount, setTxAmount] = useState('')
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
    const [activeMsgId, setActiveMsgId] = useState<string | null>(null)
    const [templates, setTemplates] = useState<Template[]>([])
    const [showTemplateMenu, setShowTemplateMenu] = useState(false)
    const [templateFilter, setTemplateFilter] = useState('')

    const endRef = useRef<HTMLDivElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    useEffect(() => {
        fetchTickets()
        const iv = setInterval(() => { fetchTickets(); if (selectedTicket) refreshMessages(selectedTicket, false) }, 3000)
        return () => clearInterval(iv)
    }, [activeTab, selectedTicket, searchTerm])

    useEffect(() => { setCurrentPage(1) }, [activeTab, searchTerm])

    useEffect(() => {
        fetch('/api/templates').then(r => r.json()).then(setTemplates).catch(() => { })
    }, [])

    async function fetchTickets() {
        const res = await fetch('/api/tickets?status=open')
        const all: Ticket[] = await res.json()
        setCounts({ all: all.length, mine: all.filter(t => t.operator !== null).length, unassigned: all.filter(t => t.operator === null).length })
        let filtered = all
        if (activeTab === 'mine') filtered = all.filter(t => t.operator !== null)
        else if (activeTab === 'unassigned') filtered = all.filter(t => t.operator === null)
        if (searchTerm) {
            const s = searchTerm.toLowerCase()
            filtered = filtered.filter(t => t.number.toString().includes(s) || (t.client.firstName || '').toLowerCase().includes(s) || (t.client.username || '').toLowerCase().includes(s))
        }
        setTickets(filtered)
    }

    async function selectTicket(id: string) {
        setSelectedTicket(id)
        setTypingId(id)
        setTimeout(() => setTypingId(null), 1500)
        await refreshMessages(id, true)
    }

    async function refreshMessages(id: string, scroll = false) {
        const res = await fetch(`/api/tickets/${id}`)
        const data = await res.json()
        let hasNew = false
        setChatMessages(prev => { if (prev.length > 0 && data.messages?.length > prev.length) hasNew = true; return data.messages || [] })
        setClientInfo(data.client || null)
        if (scroll || hasNew) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }

    async function sendReply() {
        if (!replyText.trim() || !selectedTicket || isSending) return
        setIsSending(true)
        const fd = new FormData()
        fd.append('content', replyText)
        fd.append('senderType', 'operator')
        if (isInternal) fd.append('isInternal', 'true')
        await fetch(`/api/tickets/${selectedTicket}/messages`, { method: 'POST', body: fd })
        setReplyText(''); setIsInternal(false)
        await refreshMessages(selectedTicket, true)
        setIsSending(false)
    }

    async function uploadFile(file: File) {
        if (!selectedTicket || isSending) return
        setIsSending(true)
        const fd = new FormData()
        fd.append('file', file); fd.append('senderType', 'operator')
        let mt = 'document'
        if (file.type.startsWith('image/')) mt = 'photo'
        else if (file.type.startsWith('video/')) mt = 'video'
        else if (file.type.startsWith('audio/')) mt = 'audio'
        fd.append('mediaType', mt)
        if (isInternal) fd.append('isInternal', 'true')
        await fetch(`/api/tickets/${selectedTicket}/messages`, { method: 'POST', body: fd })
        if (fileRef.current) fileRef.current.value = ''
        setIsInternal(false)
        await refreshMessages(selectedTicket, true)
        setIsSending(false)
    }

    async function toggleRec() {
        if (isRecording) { recorderRef.current?.stop(); setIsRecording(false); return }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const rec = new MediaRecorder(stream)
            chunksRef.current = []
            rec.ondataavailable = e => chunksRef.current.push(e.data)
            rec.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                if (!selectedTicket || isSending) return
                setIsSending(true)
                const fd = new FormData()
                fd.append('file', new Blob(chunksRef.current, { type: 'audio/webm' }), 'voice.ogg')
                fd.append('senderType', 'operator'); fd.append('mediaType', 'voice'); fd.append('content', '🎤 Голосовое')
                if (isInternal) fd.append('isInternal', 'true')
                await fetch(`/api/tickets/${selectedTicket}/messages`, { method: 'POST', body: fd })
                setIsInternal(false)
                await refreshMessages(selectedTicket, true)
                setIsSending(false)
            }
            recorderRef.current = rec; rec.start(); setIsRecording(true)
        } catch { alert('Микрофон недоступен') }
    }

    async function updateStatus(id: string, status: string) {
        if (status === 'resolved') confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
        await fetch(`/api/tickets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
        fetchTickets()
        if (selectedTicket === id) refreshMessages(id, false)
    }

    async function deleteTicket(id: string) {
        if (!confirm('Удалить тикет и переписку?')) return
        const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
        if (res.ok) { setSelectedTicket(null); setChatMessages([]); setClientInfo(null); fetchTickets() }
    }

    async function deleteMessage(msgId: string) {
        if (!selectedTicket || !confirm('Удалить сообщение?')) return
        await fetch(`/api/tickets/${selectedTicket}/messages/${msgId}`, { method: 'DELETE' })
        await refreshMessages(selectedTicket, false)
    }

    function startEdit(msg: ChatMessage) {
        if (msg.mediaType && msg.mediaType !== 'document') return // can't edit media
        setEditingMessageId(msg.id)
        setEditContent(msg.content)
    }

    async function saveEdit() {
        if (!selectedTicket || !editContent.trim() || !editingMessageId) return
        await fetch(`/api/tickets/${selectedTicket}/messages/${editingMessageId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editContent })
        })
        setEditingMessageId(null); setEditContent('')
        await refreshMessages(selectedTicket, false)
    }

    function cancelEdit() { setEditingMessageId(null); setEditContent('') }

    async function runDiag() {
        if (!selectedTicket || isSending) return
        const t = tickets.find(x => x.id === selectedTicket)
        if (!t) return
        setIsSending(true)
        try {
            const res = await fetch(`/api/clients/${t.client.id}/diagnostics`)
            const d = await res.json()
            let c = ''
            if (!res.ok) {
                c = `🩺 Диагностика\n━━━━━━━━━━━━━━━━━\n❌ ${d.error}`
            } else {
                const statusEmoji = d.status === 'ACTIVE' ? '🟢' : d.status === 'DISABLED' ? '🔴' : '🟡'
                const usedGB = (d.usedTrafficBytes / 1073741824).toFixed(2)
                const limitGB = d.trafficLimitBytes > 0 ? (d.trafficLimitBytes / 1073741824).toFixed(0) : '∞'
                const pct = d.trafficPercent || 0
                const bar = pct > 0 ? '█'.repeat(Math.min(Math.round(pct / 10), 10)) + '░'.repeat(Math.max(10 - Math.round(pct / 10), 0)) : '░░░░░░░░░░'
                const trafficWarn = pct >= 90 ? ' ⚠️' : pct >= 70 ? ' ⚡' : ''
                const onlineIcon = d.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'
                const expireStr = d.expireAt ? new Date(d.expireAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Не установлено'
                const daysStr = d.daysRemaining !== null ? (d.daysRemaining === 0 ? '⛔ Истекло!' : d.daysRemaining <= 3 ? `⚠️ ${d.daysRemaining} дн.` : `${d.daysRemaining} дн.`) : ''
                const healthIcon = d.ok ? '✅ Здоров' : '⚠️ Проблемы'

                c = `🩺 Диагностика клиента\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
                c += `📋 Статус:     ${statusEmoji} ${d.status}\n`
                c += `🌐 Связь:      ${onlineIcon}\n`
                c += `🏥 Здоровье:   ${healthIcon}\n`
                if (d.username) c += `👤 Юзер:      ${d.username}\n`
                c += `\n📊 Трафик\n`
                c += `   ${bar} ${pct}%${trafficWarn}\n`
                c += `   Использовано: ${usedGB} / ${limitGB} ГБ\n`
                c += `\n📅 Подписка\n`
                c += `   Истекает: ${expireStr}\n`
                if (daysStr) c += `   Осталось: ${daysStr}\n`
                if (d.warnings && d.warnings.length > 0) {
                    c += `\n🚨 Предупреждения\n`
                    d.warnings.forEach((w: string) => { c += `   ⚠ ${w}\n` })
                }
                c += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━`
            }
            await fetch(`/api/tickets/${selectedTicket}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: c, senderType: 'system' }) })
            refreshMessages(selectedTicket, true)
        } catch { } finally { setIsSending(false) }
    }

    async function resetHwid() {
        if (!clientInfo) return
        const r = await fetch(`/api/clients/${clientInfo.id}/subscriptions/hwid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) })
        alert(r.ok ? 'HWID сброшен' : 'Ошибка')
    }

    async function extendDay() {
        if (!clientInfo || !selectedTicket) return
        const r = await fetch(`/api/clients/${clientInfo.id}/subscriptions/extend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addDays: 1 }) })
        if (r.ok) { alert('Продлено на 1 день'); refreshMessages(selectedTicket, false) }
    }

    async function handleTransaction(type: 'credit' | 'debit') {
        if (!clientInfo || !selectedTicket) return
        const amount = parseFloat(txAmount)
        if (isNaN(amount) || amount <= 0) return
        const res = await fetch('/api/billing/transactions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: clientInfo.id, amount, type, category: type === 'credit' ? 'payment' : 'bonus', description: type === 'credit' ? 'Ручное пополнение' : 'Списание' })
        })
        if (res.ok) { setTxAmount(''); alert(type === 'credit' ? 'Баланс пополнен' : 'Успешно списано'); refreshMessages(selectedTicket, false) }
        else alert('Ошибка транзакции')
    }

    async function addTag() {
        if (!tagInput.trim() || !clientInfo || !selectedTicket) return
        const cur = JSON.parse(clientInfo.tags || '[]')
        const next = [...new Set([...cur, tagInput.trim()])]
        await fetch(`/api/clients/${clientInfo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: JSON.stringify(next) }) })
        setTagInput(''); refreshMessages(selectedTicket, false)
    }

    async function removeTag(tag: string) {
        if (!clientInfo || !selectedTicket) return
        const cur = JSON.parse(clientInfo.tags || '[]')
        await fetch(`/api/clients/${clientInfo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: JSON.stringify(cur.filter((t: string) => t !== tag)) }) })
        refreshMessages(selectedTicket, false)
    }

    const pageItems = tickets.slice((currentPage - 1) * perPage, currentPage * perPage)
    const totalTx = (clientInfo?.transactions || []).reduce((s, t) => s + (t.type === 'credit' ? t.amount : 0), 0)

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(templateFilter.toLowerCase()) ||
        t.content.toLowerCase().includes(templateFilter.toLowerCase())
    )

    // Group consecutive photos from the same sender
    type GroupedItem = ChatMessage | ChatMessage[]
    const groupedMessages: GroupedItem[] = []
    for (let i = 0; i < chatMessages.length; i++) {
        const msg = chatMessages[i]
        if (msg.mediaType === 'photo' && msg.senderType !== 'system') {
            const group: ChatMessage[] = [msg]
            while (i + 1 < chatMessages.length &&
                chatMessages[i + 1].mediaType === 'photo' &&
                chatMessages[i + 1].senderType === msg.senderType) {
                i++
                group.push(chatMessages[i])
            }
            if (group.length > 1) groupedMessages.push(group)
            else groupedMessages.push(msg)
        } else {
            groupedMessages.push(msg)
        }
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setReplyText(val)
        if (val.startsWith('/')) {
            setShowTemplateMenu(true)
            setTemplateFilter(val.slice(1))
        } else {
            setShowTemplateMenu(false)
        }
    }

    const insertTemplate = (tpl: Template) => {
        setReplyText(tpl.content)
        setShowTemplateMenu(false)
    }

    /* ─── RENDER ─── */

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 40px)', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: '100%', maxWidth: '1400px', gap: '12px', padding: '12px', height: '100%' }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}>

                <SearchModal onSelect={selectTicket} />

                {/* Drop overlay */}
                {isDragging && (
                    <div onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f) }}
                        style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Paperclip size={36} /></div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>Отпустите файл</div>
                    </div>
                )}

                {/* ═══ LEFT: Ticket List ═══ */}
                <div className="col-panel" style={{ width: '300px', flexShrink: 0 }}>
                    <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Тикеты</h2>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>{counts.all}</span>
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Поиск..." className="search-input" />
                        </div>

                        {/* Tabs */}
                        <div className="tab-bar">
                            {([['all', 'Все', counts.all], ['mine', 'Мои', counts.mine], ['unassigned', 'Новые', counts.unassigned]] as [string, string, number][]).map(([id, label, count]) => (
                                <button key={id} onClick={() => setActiveTab(id)} className={`tab-btn ${activeTab === id ? 'active' : ''}`}>
                                    {label}
                                    {count > 0 && <span className="tab-count">{count}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {pageItems.map(t => {
                            const lastMsg = t.messages?.[t.messages.length - 1]
                            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.new
                            return (
                                <div key={t.id} onClick={() => selectTicket(t.id)} className={`ticket-row ${selectedTicket === t.id ? 'selected' : ''}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="avatar-sm">{(t.client.firstName || '?')[0]}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{t.client.firstName || 'Клиент'}</span>
                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{timeAgo(lastMsg?.createdAt || t.createdAt)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                                    {lastMsg?.content || '...'}
                                                </span>
                                                <span style={{ fontSize: '9px', fontWeight: 800, color: sc.color, background: sc.bg, padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>{sc.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Pagination currentPage={currentPage} totalPages={Math.ceil(tickets.length / perPage)} onPageChange={setCurrentPage} />
                    </div>
                </div>

                {/* ═══ MIDDLE: Chat ═══ */}
                <div className="col-panel" style={{ flex: 1, minWidth: 0 }}>
                    {selectedTicket && clientInfo ? (
                        <>
                            {/* Clean header — name + actions only */}
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="avatar-md">{clientInfo.firstName?.[0] || '?'}</div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>{clientInfo.firstName || 'Клиент'}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            @{clientInfo.username || 'unknown'} <span style={{ opacity: 0.3 }}>•</span> #{tickets.find(t => t.id === selectedTicket)?.number}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => updateStatus(selectedTicket, 'resolved')} className="action-btn green">
                                        <Check size={14} /> Решить
                                    </button>
                                    <button onClick={() => deleteTicket(selectedTicket)} className="action-btn red">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                onClick={(e) => { if ((e.target as HTMLElement).closest('.msg-bubble') === null) setActiveMsgId(null) }}>
                                {groupedMessages.map((item, i) => {
                                    const isGroup = Array.isArray(item)
                                    const msg = isGroup ? item[0] : item
                                    const isOp = msg.senderType === 'operator'
                                    const isSys = msg.senderType === 'system'

                                    if (isSys) return (
                                        <div key={msg.id} style={{ alignSelf: 'center', maxWidth: '90%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'pre-wrap', lineHeight: 1.5, textAlign: 'center' }}>
                                            {msg.content}
                                        </div>
                                    )

                                    return (
                                        <div key={msg.id} style={{ alignSelf: isOp ? 'flex-end' : 'flex-start', maxWidth: '70%', marginTop: '4px', position: 'relative' }}>

                                            {/* Click-based action bar */}
                                            {activeMsgId === msg.id && isOp && !isGroup && (
                                                <div className="msg-context-bar" style={{ position: 'absolute', top: '-38px', right: 0, zIndex: 20 }}>
                                                    {!msg.mediaType && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEdit(msg); setActiveMsgId(null) }} className="ctx-btn" title="Редактировать">
                                                            <Edit2 size={13} /> Ред.
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); setActiveMsgId(null) }} className="ctx-btn delete" title="Удалить">
                                                        <Trash2 size={13} /> Удал.
                                                    </button>
                                                </div>
                                            )}

                                            <div className={`msg-bubble ${isOp ? 'op' : 'cl'} ${msg.isInternal ? 'internal' : ''}`}
                                                style={{ borderRadius: isOp ? '18px 18px 4px 18px' : '18px 18px 18px 4px', cursor: isOp ? 'pointer' : 'default' }}
                                                onClick={() => { if (isOp && !isGroup) setActiveMsgId(activeMsgId === msg.id ? null : msg.id) }}>
                                                {msg.isInternal && (
                                                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#fbbf24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.05em' }}>
                                                        <Shield size={10} /> ЗАМЕТКА ОПЕРАТОРА
                                                    </div>
                                                )}

                                                {isGroup ? (
                                                    <div className={`media-grid media-grid-${Math.min(item.length, 4)}`} style={{ width: '280px', height: item.length === 2 ? '140px' : '280px' }}>
                                                        {item.map(m => (
                                                            <img key={m.id} src={m.mediaUrl || ''} className="media-grid-item"
                                                                onClick={() => setSelectedImage(m.mediaUrl)} alt="" />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    msg.mediaType === 'photo' && msg.mediaUrl ? (
                                                        <img src={msg.mediaUrl} style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '6px', cursor: 'zoom-in' }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedImage(msg.mediaUrl) }} alt="" />
                                                    ) : (
                                                        <Media msg={msg} />
                                                    )
                                                )}

                                                {!isGroup && msg.content && !(msg.mediaType === 'voice' && msg.mediaUrl) && (
                                                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, whiteSpace: 'pre-wrap', letterSpacing: '-0.01em' }}>{msg.content}</div>
                                                )}

                                                <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.4, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                                                    {msg.isEdited && <span style={{ fontStyle: 'italic', marginRight: '2px' }}>изм.</span>}
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isOp && !msg.isInternal && (msg.telegramMsgId ? <CheckCheck size={12} style={{ color: '#34d399' }} /> : <Check size={12} />)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {typingId === selectedTicket && <TypingDots />}
                                <div ref={endRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '12px 20px 16px' }}>
                                {editingMessageId && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: '8px', background: 'rgba(238,43,84,0.06)', borderRadius: '10px', border: '1px solid rgba(238,43,84,0.15)', fontSize: '12px', color: 'var(--accent-primary)' }}>
                                        <span><Edit2 size={12} /> Редактирование</span>
                                        <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                )}

                                {showTemplateMenu && filteredTemplates.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <div className="template-popup">
                                            <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', letterSpacing: '0.05em' }}>ШАБЛОНЫ</div>
                                            {filteredTemplates.slice(0, 6).map(tpl => (
                                                <div key={tpl.id} onClick={() => insertTemplate(tpl)} className="template-item">
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{tpl.title}</div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={`input-bar ${isInternal ? 'internal' : ''}`}>
                                    <textarea value={editingMessageId ? editContent : replyText}
                                        onChange={editingMessageId ? e => setEditContent(e.target.value) : handleTextChange}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingMessageId ? saveEdit() : sendReply() }
                                            if (e.key === 'Escape') { cancelEdit(); setShowTemplateMenu(false) }
                                        }}
                                        placeholder={editingMessageId ? 'Редактирование...' : (isInternal ? '✍️ Внутренняя заметка...' : 'Сообщение... (/ — шаблоны)')}
                                        rows={1} className="msg-textarea" />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button onClick={() => fileRef.current?.click()} className="icon-btn" disabled={!!editingMessageId}><Paperclip size={16} /></button>
                                            <button onClick={toggleRec} className={`icon-btn ${isRecording ? 'recording' : ''}`} disabled={!!editingMessageId}><Mic size={16} /></button>
                                            <button onClick={runDiag} className="icon-btn" title="Диагностика" disabled={!!editingMessageId}><Stethoscope size={16} /></button>
                                            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                                            <button onClick={() => setIsInternal(!isInternal)} className={`mode-toggle ${isInternal ? 'active' : ''}`} disabled={!!editingMessageId}>
                                                {isInternal ? '🔒 Заметка' : '📤 Публично'}
                                            </button>
                                        </div>
                                        <button onClick={editingMessageId ? saveEdit : sendReply}
                                            disabled={editingMessageId ? !editContent.trim() : (!replyText.trim() || isSending)}
                                            className="send-btn">
                                            {editingMessageId ? <Check size={16} /> : <Send size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <input type="file" ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} style={{ display: 'none' }} />
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', opacity: 0.3 }}>
                            <MessageSquare size={48} strokeWidth={1} />
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Выберите тикет</span>
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT: Client Hub ═══ */}
                <div className="col-panel" style={{ width: '320px', flexShrink: 0 }}>
                    {clientInfo ? (
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Client Profile */}
                            <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div className="avatar-lg">{clientInfo.firstName?.[0] || '?'}</div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>{clientInfo.firstName || 'Клиент'}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>@{clientInfo.username || 'unknown'}</div>
                                    </div>
                                </div>
                                {/* Quick Profile Link */}
                                <a href={`/clients?openProfile=${clientInfo.id}`}
                                    className="profile-link-btn"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', marginBottom: '12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', color: 'var(--accent-primary)', background: 'rgba(238,43,84,0.06)', border: '1px solid rgba(238,43,84,0.1)', cursor: 'pointer', transition: 'all .2s', letterSpacing: '0.02em' }}>
                                    <User size={13} /> Перейти в профиль <ChevronRight size={13} />
                                </a>
                                {/* Mini Metrics */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div className="mini-metric">
                                        <Wallet size={12} style={{ color: '#34d399' }} />
                                        <div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Баланс</div>
                                            <div style={{ fontSize: '15px', fontWeight: 900, color: 'white' }}>{clientInfo.balance.toLocaleString()} ₽</div>
                                        </div>
                                    </div>
                                    <div className="mini-metric">
                                        <TrendingUp size={12} style={{ color: 'var(--accent-primary)' }} />
                                        <div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Всего</div>
                                            <div style={{ fontSize: '15px', fontWeight: 900, color: 'white' }}>{totalTx.toLocaleString()} ₽</div>
                                        </div>
                                    </div>
                                </div>
                                {/* Deposit / Withdraw */}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center' }}>
                                    <input value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="Сумма ₽" type="number" className="tx-input" />
                                    <button onClick={() => handleTransaction('credit')} className="balance-btn credit">+ Пополнить</button>
                                    <button onClick={() => handleTransaction('debit')} className="balance-btn debit">− Списать</button>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{ padding: '16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '10px' }}>ИНСТРУМЕНТЫ</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button onClick={runDiag} className="tool-btn">
                                        <Stethoscope size={14} /> <span>Диагностика</span> <ChevronRight size={12} className="tool-arrow" />
                                    </button>
                                    <button onClick={resetHwid} className="tool-btn">
                                        <Fingerprint size={14} /> <span>Сброс HWID</span> <ChevronRight size={12} className="tool-arrow" />
                                    </button>
                                    <button onClick={extendDay} className="tool-btn">
                                        <Zap size={14} /> <span>+1 день</span> <ChevronRight size={12} className="tool-arrow" />
                                    </button>
                                </div>
                            </div>

                            {/* Tags */}
                            <div style={{ padding: '0 16px 16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '10px' }}>ТЕГИ</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {JSON.parse(clientInfo.tags || '[]').map((tag: string) => (
                                        <span key={tag} className="tag-chip">
                                            {tag} <X size={10} onClick={() => removeTag(tag)} style={{ cursor: 'pointer', opacity: 0.5 }} />
                                        </span>
                                    ))}
                                </div>
                                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Добавить тег..." className="tag-input" />
                            </div>

                            {/* Recent Transactions */}
                            {(clientInfo.transactions || []).length > 0 && (
                                <div style={{ padding: '0 16px 16px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '10px' }}>ИСТОРИЯ</div>
                                    {(clientInfo.transactions || []).slice(0, 5).map((tx, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>{tx.description || (tx.type === 'credit' ? 'Пополнение' : 'Списание')}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</div>
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: tx.type === 'credit' ? '#34d399' : '#ee2b54' }}>
                                                {tx.type === 'credit' ? '+' : '-'}{tx.amount} ₽
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                            <User size={80} strokeWidth={0.5} />
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div onClick={() => setSelectedImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(16px)' }}>
                    <img src={selectedImage} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '16px' }} alt="" />
                </div>
            )}

            <style jsx global>{`
                /* ─── Base tokens ─── */
                :root { --accent-primary: #ee2b54; --accent-gradient: linear-gradient(135deg, #ee2b54 0%, #ff6b42 100%); }

                /* ─── Panels ─── */
                .col-panel {
                    display: flex; flex-direction: column;
                    background: rgba(20, 20, 28, 0.85);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 20px;
                    overflow: hidden;
                    backdrop-filter: blur(12px);
                }

                /* ─── Search ─── */
                .search-input {
                    width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 10px; padding: 9px 10px 9px 30px; font-size: 12px; color: white; outline: none;
                    transition: border-color .2s;
                }
                .search-input:focus { border-color: rgba(238,43,84,0.3); }
                .search-input::placeholder { color: rgba(255,255,255,0.25); }

                /* ─── Tabs ─── */
                .tab-bar { display: flex; gap: 2px; background: rgba(0,0,0,0.2); padding: 3px; border-radius: 10px; }
                .tab-btn {
                    flex: 1; padding: 7px 4px; border: none; border-radius: 8px; font-size: 11px; font-weight: 700;
                    color: rgba(255,255,255,0.35); background: transparent; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 4px; transition: all .2s;
                }
                .tab-btn.active { background: rgba(255,255,255,0.08); color: white; }
                .tab-count { font-size: 9px; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
                .tab-btn.active .tab-count { background: var(--accent-primary); color: white; }

                /* ─── Ticket rows ─── */
                .ticket-row {
                    padding: 12px; border-radius: 14px; cursor: pointer; margin-bottom: 4px;
                    transition: all .2s; border: 1px solid transparent;
                }
                .ticket-row:hover { background: rgba(255,255,255,0.03); }
                .ticket-row.selected { background: rgba(238,43,84,0.06); border-color: rgba(238,43,84,0.15); }

                /* ─── Avatars ─── */
                .avatar-sm {
                    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
                    background: linear-gradient(135deg, rgba(238,43,84,0.2), rgba(255,107,66,0.2));
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 800; font-size: 14px;
                }
                .avatar-md {
                    width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
                    background: var(--accent-gradient);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 900; font-size: 16px;
                }
                .avatar-lg {
                    width: 42px; height: 42px; border-radius: 14px; flex-shrink: 0;
                    background: var(--accent-gradient);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 900; font-size: 18px;
                    box-shadow: 0 4px 12px rgba(238,43,84,0.25);
                }

                /* ─── Action buttons (header) ─── */
                .action-btn {
                    display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px;
                    font-size: 11px; font-weight: 800; border: none; cursor: pointer; transition: all .15s;
                }
                .action-btn.green { background: rgba(52,211,153,0.1); color: #34d399; }
                .action-btn.green:hover { background: rgba(52,211,153,0.2); }
                .action-btn.red { background: rgba(238,43,84,0.1); color: #ee2b54; padding: 6px 8px; }
                .action-btn.red:hover { background: rgba(238,43,84,0.2); }

                /* ─── Messages ─── */
                .msg-bubble {
                    padding: 10px 14px; font-size: 13.5px; line-height: 1.55;
                    animation: fadeIn .25s;
                }
                .msg-bubble.op {
                    background: var(--accent-gradient); color: white;
                }
                .msg-bubble.cl {
                    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.9);
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .msg-bubble.internal {
                    background: rgba(251,191,36,0.08) !important;
                    border: 1px solid rgba(251,191,36,0.2) !important;
                    color: rgba(255,255,255,0.9) !important;
                }

                /* ─── Input bar ─── */
                .input-bar {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px; padding: 8px; transition: all .2s;
                }
                .input-bar:focus-within { border-color: rgba(255,255,255,0.12); }
                .input-bar.internal { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.03); }
                .msg-textarea {
                    width: 100%; background: transparent; border: none; outline: none;
                    color: white; font-size: 14px; resize: none; padding: 6px 4px;
                    min-height: 36px; max-height: 120px; font-family: inherit;
                }
                .msg-textarea::placeholder { color: rgba(255,255,255,0.25); }

                .icon-btn {
                    width: 32px; height: 32px; border-radius: 8px; border: none;
                    background: transparent; color: rgba(255,255,255,0.35); cursor: pointer;
                    display: flex; align-items: center; justify-content: center; transition: all .15s;
                }
                .icon-btn:hover { background: rgba(255,255,255,0.06); color: white; }
                .icon-btn.recording { color: var(--accent-primary); animation: pulse-red 1s infinite; }

                .mode-toggle {
                    padding: 4px 10px; border-radius: 6px; border: none;
                    font-size: 10px; font-weight: 800; cursor: pointer; transition: all .15s;
                    background: transparent; color: rgba(255,255,255,0.35);
                }
                .mode-toggle.active { background: rgba(251,191,36,0.1); color: #fbbf24; }

                .send-btn {
                    width: 36px; height: 36px; border-radius: 10px; border: none;
                    background: var(--accent-gradient); color: white; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .15s; box-shadow: 0 2px 8px rgba(238,43,84,0.25);
                }
                .send-btn:hover { transform: scale(1.05); }
                .send-btn:disabled { opacity: 0.3; transform: none; cursor: default; }

                /* ─── Right sidebar ─── */
                .mini-metric {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px; border-radius: 12px;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                }
                .tool-btn {
                    width: 100%; padding: 10px 12px; border-radius: 10px;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600;
                    display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all .2s;
                }
                .tool-btn span { flex: 1; text-align: left; }
                .tool-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(238,43,84,0.2); color: white; }
                .tool-arrow { opacity: 0; transition: all .2s; margin-left: auto; }
                .tool-btn:hover .tool-arrow { opacity: 0.5; transform: translateX(2px); }

                .tx-input {
                    width: 80px; padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 700;
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    color: white; outline: none; font-family: inherit;
                }
                .tx-input::placeholder { color: rgba(255,255,255,0.2); }
                .tx-input:focus { border-color: rgba(238,43,84,0.3); }
                .tx-input::-webkit-inner-spin-button, .tx-input::-webkit-outer-spin-button { -webkit-appearance: none; }

                .balance-btn {
                    padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 800;
                    border: none; cursor: pointer; transition: all .15s;
                }
                .balance-btn.credit { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.15); }
                .balance-btn.credit:hover { background: rgba(52,211,153,0.2); }
                .balance-btn.debit { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.15); }
                .balance-btn.debit:hover { background: rgba(251,191,36,0.2); }

                .tag-chip {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
                    background: rgba(238,43,84,0.1); color: var(--accent-primary);
                    border: 1px solid rgba(238,43,84,0.15);
                }
                .tag-input {
                    width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 8px; padding: 6px 10px; font-size: 11px; color: white; outline: none;
                }
                .tag-input::placeholder { color: rgba(255,255,255,0.2); }

                /* ─── Scrollbar ─── */
                .custom-scroll::-webkit-scrollbar { width: 3px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }

                /* ─── Animations ─── */
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
                @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 0 0 rgba(238,43,84,0); } 50% { box-shadow: 0 0 0 6px rgba(238,43,84,0.15); } }

                .msg-actions { position: absolute; display: flex; flex-direction: column; gap: 2px; z-index: 10; }
                .msg-action-btn {
                    width: 28px; height: 28px; border-radius: 8px; border: none;
                    background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all .15s; backdrop-filter: blur(8px);
                }
                .msg-action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                .msg-action-btn.delete:hover { background: rgba(238,43,84,0.15); color: #ee2b54; }

                .media-grid { display: grid; gap: 3px; border-radius: 12px; overflow: hidden; margin-bottom: 6px; }
                .media-grid-2 { grid-template-columns: 1fr 1fr; }
                .media-grid-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
                .media-grid-3 .media-grid-item:first-child { grid-row: span 2; }
                .media-grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
                .media-grid-item { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; transition: filter .15s; }
                .media-grid-item:hover { filter: brightness(1.1); }

                .template-menu {
                    background: rgba(20,20,28,0.95); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px; margin-bottom: 8px; overflow: hidden;
                    backdrop-filter: blur(16px); max-height: 240px; overflow-y: auto;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                }
                .template-popup {
                    background: rgba(20,20,28,0.97); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px; overflow: hidden;
                    backdrop-filter: blur(20px); max-height: 260px; overflow-y: auto;
                    box-shadow: 0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(238,43,84,0.1);
                    margin-bottom: 6px;
                    animation: slideUp .2s ease-out;
                }
                .template-item { padding: 10px 12px; cursor: pointer; transition: all .15s; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .template-item:hover { background: rgba(238,43,84,0.06); }
                .template-item:last-child { border-bottom: none; }

                .msg-context-bar {
                    display: flex; gap: 4px; padding: 4px;
                    background: rgba(20,20,28,0.95); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px; backdrop-filter: blur(16px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    animation: fadeIn .15s ease-out;
                }
                .ctx-btn {
                    display: flex; align-items: center; gap: 4px;
                    padding: 6px 10px; border-radius: 7px; border: none;
                    font-size: 11px; font-weight: 700; cursor: pointer;
                    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
                    transition: all .15s;
                }
                .ctx-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                .ctx-btn.delete { color: rgba(238,43,84,0.7); }
                .ctx-btn.delete:hover { background: rgba(238,43,84,0.12); color: #ee2b54; }

                @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
