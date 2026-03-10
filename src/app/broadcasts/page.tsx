'use client'

import { useEffect, useState, useRef } from 'react'
import {
    Megaphone, Plus, Target, Send, BarChart, Clock, CheckCircle2,
    AlertCircle, Image as ImageIcon, Link as LinkIcon, Trash2,
    RefreshCw, Filter, Users, Layout, Zap, ChevronRight, Eye,
    Upload, Video, FileText, Check, X, PencilLine
} from 'lucide-react'
import { Pagination } from '@/components/Pagination'

interface Broadcast {
    id: string
    title: string
    content: string
    mediaUrl: string | null
    mediaType: string | null
    status: 'draft' | 'sending' | 'completed' | 'failed'
    targetFilters: string | null
    sentCount: number
    totalCount: number
    errorCount: number
    createdAt: string
    sentAt: string | null
}

interface Tariff {
    id: string
    name: string
}

export default function BroadcastsPage() {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
    const [tariffs, setTariffs] = useState<Tariff[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [activeTab, setActiveTab] = useState<'history' | 'create'>('history')
    const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
    const [editContent, setEditContent] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Form state
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [mediaUrl, setMediaUrl] = useState('')
    const [mediaType, setMediaType] = useState('photo')
    const [targetTariff, setTargetTariff] = useState('all')
    const [vpnAudience, setVpnAudience] = useState('all')
    const [minBalance, setMinBalance] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchBroadcasts, 5000)
        return () => clearInterval(interval)
    }, [])

    async function fetchData() {
        setIsLoading(true)
        await Promise.all([fetchBroadcasts(), fetchTariffs()])
        setIsLoading(false)
    }

    async function fetchBroadcasts() {
        try {
            const res = await fetch('/api/broadcasts')
            const data = await res.json()
            if (Array.isArray(data)) {
                setBroadcasts(data)
            } else {
                console.error('API Error:', data)
                setBroadcasts([])
            }
        } catch (e) {
            console.error(e)
            setBroadcasts([])
        }
    }

    async function fetchTariffs() {
        try {
            const res = await fetch('/api/admin/billing/stats') // Use existing billing stats or tariffs endpoint
            const data = await res.json()
            if (data.tariffDistribution) {
                setTariffs(data.tariffDistribution.map((t: any) => ({ id: t.id || t.name, name: t.name })))
            }
        } catch (e) {
            console.error(e)
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                setMediaUrl(data.url)
                if (file.type.startsWith('image')) setMediaType('photo')
                else if (file.type.startsWith('video')) setMediaType('video')
                else setMediaType('document')
            }
        } catch (e) {
            alert('Ошибка при загрузке файла')
        } finally {
            setIsUploading(false)
        }
    }

    async function handleCreate() {
        if (!title || !content) return alert('Заполните название и текст рассылки')

        setIsCreating(true)
        try {
            const res = await fetch('/api/broadcasts', {
                method: 'POST',
                body: JSON.stringify({
                    title, content, mediaUrl, mediaType,
                    targetFilters: {
                        tariffId: targetTariff === 'all' ? null : targetTariff,
                        vpnAudience: vpnAudience === 'all' ? null : vpnAudience,
                        minBalance: minBalance || null
                    }
                })
            })
            if (res.ok) {
                setActiveTab('history')
                fetchBroadcasts()
                resetForm()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsCreating(false)
        }
    }

    async function handleSend(id: string) {
        if (!confirm('Начать рассылку прямо сейчас?')) return

        try {
            await fetch(`/api/broadcasts/${id}/send`, { method: 'POST' })
            fetchBroadcasts()
        } catch (e) {
            console.error(e)
        }
    }

    async function handleEditSent() {
        if (!editingBroadcast || !editContent) return
        setIsEditing(true)
        try {
            const res = await fetch(`/api/broadcasts/${editingBroadcast.id}/edit-sent`, {
                method: 'POST',
                body: JSON.stringify({ content: editContent })
            })
            if (res.ok) {
                alert('Процесс редактирования запущен в фоновом режиме')
                setEditingBroadcast(null)
                fetchBroadcasts()
            }
        } catch (e) {
            alert('Ошибка при редактировании')
        } finally {
            setIsEditing(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Вы уверены, что хотите удалить эту рассылку и всю историю её отправки?')) return

        try {
            const res = await fetch(`/api/broadcasts/${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchBroadcasts()
            } else {
                alert('Ошибка при удалении')
            }
        } catch (e) {
            console.error(e)
            alert('Ошибка при удалении')
        }
    }

    function resetForm() {
        setTitle('')
        setContent('')
        setMediaUrl('')
        setMinBalance('')
        setTargetTariff('all')
        setVpnAudience('all')
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                <RefreshCw className="animate-spin" size={48} color="var(--accent-primary)" />
            </div>
        )
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>🚀 Маркетинг</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Управление массовыми рассылками и вовлеченностью</p>
                </div>

                <div style={{ display: 'flex', background: 'var(--overlay-base)', padding: '4px', borderRadius: '14px', border: '1px solid var(--overlay-light)' }}>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: activeTab === 'history' ? 'var(--bg-card)' : 'transparent',
                            color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
                        }}
                    >
                        История
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: activeTab === 'create' ? 'var(--bg-card)' : 'transparent',
                            color: activeTab === 'create' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'create' ? 'var(--shadow-sm)' : 'none',
                        }}
                    >
                        Новая рассылка
                    </button>
                </div>
            </div>

            {activeTab === 'create' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 1fr', gap: '32px' }}>
                    {/* Composer */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '32px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Layout size={20} color="var(--accent-primary)" /> Содержание сообщения
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Название кампании</label>
                                <input
                                    value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="Например: Скидки к началу весны"
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Текст (HTML доступно)</label>
                                <textarea
                                    value={content} onChange={e => setContent(e.target.value)}
                                    placeholder="Привет! У нас отличные новости..."
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none', minHeight: '200px', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Медиа-файл</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%', height: '52px', background: 'var(--bg-input)', border: '1px dashed var(--border-color)',
                                            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '10px', cursor: 'pointer', color: mediaUrl ? 'var(--accent-green)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {isUploading ? <RefreshCw className="animate-spin" size={18} /> :
                                            mediaUrl ? <CheckCircle2 size={18} /> : <Upload size={18} />}
                                        <span style={{ fontSize: '14px' }}>
                                            {mediaUrl ? 'Файл загружен' : 'Нажмите для выбора фото/видео'}
                                        </span>
                                        <input
                                            type="file" ref={fileInputRef} hidden accept="image/*,video/*"
                                            onChange={handleUpload}
                                        />
                                    </div>
                                    {mediaUrl && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <LinkIcon size={12} /> {mediaUrl.split('/').pop()}
                                            <button onClick={() => setMediaUrl('')} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}>Удалить</button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Тип медиа</label>
                                    <select
                                        value={mediaType} onChange={e => setMediaType(e.target.value)}
                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                    >
                                        <option value="photo">Изображение</option>
                                        <option value="video">Видео-ролик</option>
                                        <option value="document">Документ/Файл</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Target Builder */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '32px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Target size={20} color="var(--accent-primary)" /> Аудитория
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Выбор тарифа</label>
                                    <select
                                        value={targetTariff} onChange={e => setTargetTariff(e.target.value)}
                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                    >
                                        <option value="all">Все пользователи</option>
                                        {tariffs.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>VPN Аудитория</label>
                                    <select
                                        value={vpnAudience} onChange={e => setVpnAudience(e.target.value)}
                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                    >
                                        <option value="all">Все (без фильтра VPN)</option>
                                        <option value="low_traffic">Заканчивается трафик (&gt;80%)</option>
                                        <option value="expiring_soon">Истекает &lt; 3 дней</option>
                                        <option value="expired">Уже истекли (EXPIRED)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Минимальный баланс (₽)</label>
                                    <input
                                        type="number"
                                        value={minBalance} onChange={e => setMinBalance(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ background: 'rgba(238, 43, 84, 0.05)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--accent-primary)', marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                        <Users size={16} /> Расчетная аудитория
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Список получателей формируется автоматически из активных подписчиков бота.</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating || isUploading}
                                style={{ flex: 1, padding: '16px', background: 'var(--accent-gradient)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '16px', cursor: (isCreating || isUploading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(238, 43, 84, 0.3)' }}
                            >
                                {isCreating ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                                Сохранить рассылку
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {broadcasts.length === 0 ? (
                        <div className="empty-state" style={{ background: 'var(--bg-card)', padding: '80px 40px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                            <div className="empty-icon">📢</div>
                            <div className="empty-title">История пуста</div>
                            <div className="empty-desc">Создайте свою первую рассылку, чтобы она появилась здесь</div>
                        </div>
                    ) : (
                        <>
                            {broadcasts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(b => (
                                <div key={b.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '56px', height: '56px', borderRadius: '16px', background: 'var(--overlay-base)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)'
                                            }}>
                                                {b.mediaType === 'photo' ? <ImageIcon size={24} /> :
                                                    b.mediaType === 'video' ? <Video size={24} /> : <Megaphone size={24} />}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{b.title}</h4>
                                                    {b.status === 'completed' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingBroadcast(b)
                                                                setEditContent(b.content)
                                                            }}
                                                            style={{
                                                                padding: '4px 10px', background: 'rgba(238, 43, 84, 0.1)', color: 'var(--accent-primary)',
                                                                border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: '5px'
                                                            }}
                                                        >
                                                            <PencilLine size={12} /> Изменить
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(b.createdAt).toLocaleDateString()}</span>
                                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                                                    <span>{b.mediaUrl ? 'С медиа-файлом' : 'Только текст'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Разослано</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '120px', height: '8px', background: 'var(--overlay-base)', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${(b.sentCount / (b.totalCount || 1)) * 100}%`, height: '100%',
                                                            background: b.status === 'completed' ? 'var(--accent-green)' : (b.status === 'failed' ? '#ef4444' : 'var(--accent-primary)'),
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: 800 }}>{b.sentCount} / {b.totalCount}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {b.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleSend(b.id)}
                                                        style={{ padding: '10px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    >
                                                        <Send size={14} /> Запустить
                                                    </button>
                                                )}
                                                {b.status === 'sending' && (
                                                    <span style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '12px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <RefreshCw className="animate-spin" size={14} /> Отправка
                                                    </span>
                                                )}
                                                {b.status === 'completed' && (
                                                    <span style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '12px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <CheckCircle2 size={14} /> Готово
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(b.id)}
                                                    style={{ padding: '10px', background: 'var(--overlay-base)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--overlay-base)', padding: '16px 32px', display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--overlay-light)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} /> Доставлено: {b.totalCount > 0 ? ((b.sentCount / b.totalCount) * 100).toFixed(0) : 0}%</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}><AlertCircle size={14} /> Ошибки: {b.errorCount}</div>
                                        <div style={{ marginLeft: 'auto', fontStyle: 'italic', opacity: 0.6 }}>ID: {b.id.slice(0, 8)}...</div>
                                    </div>
                                </div>
                            ))}
                            {broadcasts.length > itemsPerPage && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(broadcasts.length / itemsPerPage)}
                                    onPageChange={(page) => {
                                        setCurrentPage(page)
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>
            )
            }
            {/* Editing Modal */}
            {
                editingBroadcast && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease'
                    }}>
                        <div style={{
                            background: 'var(--bg-card)', padding: '40px', borderRadius: '32px', width: '100%',
                            maxWidth: '600px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '24px', fontWeight: 800 }}>✏️ Редактирование текста</h3>
                                <button onClick={() => setEditingBroadcast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                                Новый текст будет применен ко всем уже отправленным сообщениям в Telegram для этой кампании.
                            </p>
                            <textarea
                                value={editContent} onChange={e => setEditContent(e.target.value)}
                                style={{
                                    width: '100%', height: '250px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                    borderRadius: '16px', padding: '20px', color: 'var(--text-primary)', outline: 'none',
                                    fontSize: '15px', resize: 'none', marginBottom: '24px'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={() => setEditingBroadcast(null)}
                                    style={{ flex: 1, padding: '14px', background: 'var(--overlay-base)', color: 'var(--text-primary)', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleEditSent}
                                    disabled={isEditing || editContent === editingBroadcast.content}
                                    style={{
                                        flex: 1, padding: '14px', background: 'var(--accent-gradient)', color: 'white',
                                        border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    {isEditing ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                    Применить изменения
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
