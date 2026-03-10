'use client'

import { useEffect, useState } from 'react'
import {
    Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Calendar, ChevronRight, CreditCard, Download, Plus, Receipt, RefreshCw, ShieldCheck, TrendingUp, Users, Wallet, X, Zap, Search
} from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'

interface Client {
    firstName: string | null
    username: string | null
    telegramId: string
}

interface Stats {
    summary: {
        totalRevenue: number
        totalBalance: number
        activeSubsCount: number
        totalClients: number
        arpu: number
        categoryStats: Array<{ name: string, amount: number }>
    }
    dailyRevenue: Array<{ date: string, amount: number }>
    tariffStats: Array<{ name: string, count: number, color: string }>
    latestTransactions: Array<{
        id: string
        amount: number
        type: string
        category: string
        status: string
        description: string | null
        createdAt: string
        client: {
            firstName: string | null
            username: string | null
            telegramId: string
        }
    }>
}

export default function TariffsPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [filterType, setFilterType] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    const [globalDateFilter, setGlobalDateFilter] = useState('7d')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const [searchQuery, setSearchQuery] = useState('')

    // Reset page on search or filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, filterType, filterCategory])

    // Форма новой транзакции
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [newTxForm, setNewTxForm] = useState({
        clientId: '',
        amount: '',
        type: 'credit',
        category: 'bonus',
        description: ''
    })
    const [isSubmittingTx, setIsSubmittingTx] = useState(false)

    // Детали Транзакции и Чек
    const [selectedTx, setSelectedTx] = useState<any>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

    // Система Toasts
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function fetchStats(isBackground = false) {
        try {
            if (!stats) setIsLoading(true)
            if (!isBackground) setIsSyncing(true)
            // Запрашиваем больше данных, чтобы пагинация работала на клиенте (limit=100)
            const response = await fetch(`/api/admin/billing/stats?period=${globalDateFilter}&limit=100`)
            const data = await response.json()
            if (data.error) {
                console.error('[Billing Stats Error]:', data.error)
                if (!isBackground || !stats) {
                    setStats(null)
                } else {
                    showToast('Ошибка фонового обновления данных', 'error')
                }
            } else {
                setStats(data)
            }
        } catch (e) {
            console.error('[Fetch Stats Error]:', e)
        } finally {
            setIsLoading(false)
            setIsSyncing(false)
        }
    }

    useEffect(() => {
        fetchStats(false)
        const interval = setInterval(() => fetchStats(true), 30000)
        return () => clearInterval(interval)
    }, [globalDateFilter])

    async function handleRefund(txId: string) {
        if (!confirm('Вы уверены, что хотите сделать возврат по этой транзакции?')) return
        try {
            const response = await fetch('/api/admin/billing/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: txId })
            })
            if (response.ok) {
                showToast('Возврат успешно выполнен', 'success')
                fetchStats(true)
            } else {
                const data = await response.json()
                showToast(`Ошибка: ${data.error}`, 'error')
            }
        } catch (e) {
            console.error(e)
            showToast('Сетевая ошибка', 'error')
        }
    }

    async function handleCreateTransaction(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmittingTx(true)
        try {
            const response = await fetch('/api/admin/billing/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTxForm,
                    amount: parseFloat(newTxForm.amount)
                })
            })
            if (response.ok) {
                setIsTransactionModalOpen(false)
                setNewTxForm({ clientId: '', amount: '', type: 'credit', category: 'bonus', description: '' })
                showToast('Транзакция успешно создана', 'success')
                fetchStats(true)
            } else {
                const data = await response.json()
                showToast(`Ошибка: ${data.error}`, 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Сетевая ошибка', 'error')
        } finally {
            setIsSubmittingTx(false)
        }
    }

    const exportToPDF = async () => {
        if (!stats) return
        setIsGeneratingPDF(true)
        showToast('Генерация PDF отчета...', 'success')

        try {
            const element = document.getElementById('pdf-report-template')
            if (!element) return

            // Рендерим HTML в канвас через html2canvas (он поддерживает шрифты браузера и кириллицу)
            const canvas = await html2canvas(element, {
                scale: 2, // Высокое качество
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`SupportFlow_Report_${new Date().toISOString().split('T')[0]}.pdf`)

            showToast('PDF отчет успешно скачан!', 'success')
        } catch (error) {
            console.error('PDF Generation Error:', error)
            showToast('Ошибка при генерации PDF', 'error')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const exportToExcel = () => {
        if (!stats) return
        const data = stats.latestTransactions.map(tx => ({
            'Дата и время': new Date(tx.createdAt).toLocaleString('ru-RU'),
            'Клиент': tx.client.firstName || tx.client.username || 'System',
            'Telegram ID': tx.client.telegramId,
            'Сумма (RUB)': tx.amount,
            'Тип': tx.type === 'credit' ? 'Приход' : 'Расход',
            'Категория': tx.category,
            'Статус': tx.status,
            'Описание': tx.description || ''
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Financial Data')

        // Настройка ширины колонок
        const wscols = [
            { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 30 }
        ]
        ws['!cols'] = wscols

        XLSX.writeFile(wb, `SupportFlow_Billing_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                <div style={{ position: 'relative' }}>
                    <RefreshCw className="animate-spin" size={64} color="var(--accent-primary)" />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '50%', filter: 'blur(10px)', opacity: 0.5 }} />
                </div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '32px', border: '1px solid var(--border-color)', margin: '40px auto', maxWidth: '600px', backdropFilter: 'blur(20px)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(238, 43, 84, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', margin: '0 auto 24px' }}>
                    <ShieldCheck size={40} />
                </div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Ошибка загрузки данных</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>Не удалось синхронизироваться с финансовым шлюзом</p>
                <button onClick={() => fetchStats(false)} style={{ padding: '12px 32px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 8px 16px -4px rgba(238, 43, 84, 0.3)' }}>
                    Попробовать снова
                </button>
            </div>
        )
    }

    const maxDaily = Math.max(...(stats.dailyRevenue || []).map(d => d.amount), 100)

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg-main)' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .glass-card {
                    background: rgba(var(--bg-card-rgb), 0.6);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 32px;
                    padding: 32px;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.1);
                }
                .glass-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 12px 40px -5px rgba(0, 0, 0, 0.2);
                    border-color: rgba(var(--accent-primary-rgb), 0.3);
                }
                .status-badge {
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .premium-table tr {
                    transition: all 0.2s ease;
                }
                .premium-table tr:hover {
                    background: rgba(var(--accent-primary-rgb), 0.03) !important;
                }
                .action-btn {
                    padding: 8px;
                    border-radius: 10px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                }
                .action-btn:hover {
                    background: rgba(238, 43, 84, 0.1);
                    color: var(--accent-primary);
                    border-color: rgba(238, 43, 84, 0.2);
                }
                .kpi-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 8px;
                }
                .kpi-value {
                    font-size: 36px;
                    font-weight: 900;
                    letter-spacing: -1px;
                    background: var(--text-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}} />

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    right: '32px',
                    background: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-primary)',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: `0 10px 30px -5px ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(238, 43, 84, 0.4)'}`,
                    zIndex: 2000,
                    animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}

            {/* Hidden Report Template for PDF */}
            <div id="pdf-report-template" style={{
                position: 'fixed',
                left: '-9999px',
                width: '800px',
                background: 'white',
                color: '#1a1a1a',
                padding: '40px',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', borderBottom: '2px solid #f0f0f0', paddingBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ee2b54', margin: 0 }}>SupportFlow Enterprise</h1>
                        <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Финансовый аналитический отчет</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>Дата: {new Date().toLocaleDateString('ru-RU')}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>Период: {
                            globalDateFilter === 'all' ? 'За все время' :
                                globalDateFilter === 'today' ? 'Сегодня' :
                                    globalDateFilter === '7d' ? '7 дней' : '30 дней'
                        }</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>Выручка</p>
                        <p style={{ fontSize: '24px', fontWeight: 800 }}>{(stats?.summary.totalRevenue || 0).toLocaleString()} ₽</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>Подписки</p>
                        <p style={{ fontSize: '24px', fontWeight: 800 }}>{stats?.summary.activeSubsCount || 0}</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>ARPU</p>
                        <p style={{ fontSize: '24px', fontWeight: 800 }}>{(stats?.summary.arpu || 0).toFixed(2)} ₽</p>
                    </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Распределение доходов</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: '#f3f4f6' }}>
                            <th style={{ padding: '12px', fontSize: '12px', borderBottom: '1px solid #e5e7eb' }}>Категория</th>
                            <th style={{ padding: '12px', fontSize: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.summary.categoryStats.map(c => (
                            <tr key={c.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontSize: '13px' }}>{c.name.toUpperCase()}</td>
                                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 600 }}>{c.amount.toLocaleString()} ₽</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Последние транзакции</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: '#111', color: 'white' }}>
                            <th style={{ padding: '8px', border: '1px solid #333' }}>Дата</th>
                            <th style={{ padding: '8px', border: '1px solid #333' }}>Клиент</th>
                            <th style={{ padding: '8px', border: '1px solid #333' }}>Сумма</th>
                            <th style={{ padding: '8px', border: '1px solid #333' }}>Тип</th>
                            <th style={{ padding: '8px', border: '1px solid #333' }}>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.latestTransactions.slice(0, 25).map(tx => (
                            <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px' }}>{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</td>
                                <td style={{ padding: '8px' }}>{tx.client.firstName || tx.client.username}</td>
                                <td style={{ padding: '8px', fontWeight: 700 }}>{tx.amount} ₽</td>
                                <td style={{ padding: '8px' }}>{tx.category}</td>
                                <td style={{ padding: '8px' }}>{tx.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '10px', color: '#999' }}>
                    SupportFlow Enterprise — Лицензионная система учета трафика и финансов
                </div>
            </div>

            <div className="page-header" style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1.5px' }}>
                        💎 Финансовый Интеллект
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '18px', fontWeight: 500 }}>Профессиональный аудит транзакций и потоков выручки</p>
                        <span style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 700, fontSize: '14px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} />
                            Live Sync <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>• Обновлено {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        value={globalDateFilter}
                        onChange={(e) => setGlobalDateFilter(e.target.value)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', height: '48px' }}
                    >
                        <option value="today">Сегодня</option>
                        <option value="7d">Последние 7 дней</option>
                        <option value="30d">Последние 30 дней</option>
                        <option value="all">За все время</option>
                    </select>
                    <button onClick={() => fetchStats(false)} className="action-btn" style={{ height: '48px', width: '48px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                    </button>

                    <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <button
                            onClick={exportToPDF}
                            disabled={isGeneratingPDF}
                            className="action-btn"
                            style={{ height: '48px', padding: '0 16px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', opacity: isGeneratingPDF ? 0.5 : 1 }}
                            title="Скачать PDF отчет"
                        >
                            {isGeneratingPDF ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>PDF</span>
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="action-btn"
                            style={{ height: '48px', padding: '0 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                            title="Экспорт в Excel (XLSX)"
                        >
                            <Receipt size={18} />
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>XLSX</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        style={{ height: '48px', padding: '0 24px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 20px -5px rgba(238, 43, 84, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <Plus size={20} /> Новая операция
                    </button>
                </div>
            </div>

            {/* New Transaction Modal */}
            {isTransactionModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '32px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Новая операция</h2>
                            <button onClick={() => setIsTransactionModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>ID Клиента</label>
                                <input
                                    required
                                    value={newTxForm.clientId}
                                    onChange={e => setNewTxForm(prev => ({ ...prev, clientId: e.target.value }))}
                                    placeholder="UUID клиента"
                                    style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Тип операции</label>
                                    <select
                                        value={newTxForm.type}
                                        onChange={e => setNewTxForm(prev => ({ ...prev, type: e.target.value }))}
                                        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none' }}
                                    >
                                        <option value="credit">Пополнение (+)</option>
                                        <option value="debit">Списание (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Сумма (₽)</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={newTxForm.amount}
                                        onChange={e => setNewTxForm(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Категория</label>
                                    <select
                                        value={newTxForm.category}
                                        onChange={e => setNewTxForm(prev => ({ ...prev, category: e.target.value }))}
                                        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none' }}
                                    >
                                        <option value="bonus">Бонус</option>
                                        <option value="payment">Платеж</option>
                                        <option value="renewal">Продление</option>
                                        <option value="correction">Корректировка</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Комментарий</label>
                                    <input
                                        value={newTxForm.description}
                                        onChange={e => setNewTxForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Необязательно"
                                        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: '12px', color: 'white', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsTransactionModalOpen(false)} style={{ padding: '14px 24px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                    Отмена
                                </button>
                                <button type="submit" disabled={isSubmittingTx} style={{ padding: '14px 32px', borderRadius: '14px', border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 700, cursor: isSubmittingTx ? 'not-allowed' : 'pointer', opacity: isSubmittingTx ? 0.7 : 1 }}>
                                    {isSubmittingTx ? 'Выполнение...' : 'Подтвердить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(238, 43, 84, 0.2), rgba(238, 43, 84, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                            <TrendingUp size={28} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '100px' }}>+12.4%</div>
                        </div>
                    </div>
                    <div className="kpi-title">Общая выручка</div>
                    <div className="kpi-value">{(stats.summary?.totalRevenue || 0).toLocaleString()} ₽</div>
                    <div style={{ marginTop: '16px', height: '4px', width: '100%', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '75%', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Activity size={28} />
                        </div>
                    </div>
                    <div className="kpi-title">Активные подписки</div>
                    <div className="kpi-value">{stats.summary?.activeSubsCount || 0}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: 600 }}>На 5% больше, чем вчера</div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                            <Wallet size={28} />
                        </div>
                    </div>
                    <div className="kpi-title">Ликвидность системы</div>
                    <div className="kpi-value">{(stats.summary?.totalBalance || 0).toLocaleString()} ₽</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: 600 }}>Средства на балансах пользователей</div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <Users size={28} />
                        </div>
                        <Zap size={20} color="#8b5cf6" style={{ opacity: 0.5 }} />
                    </div>
                    <div className="kpi-title">Средний чек (ARPU)</div>
                    <div className="kpi-value">{(stats.summary?.arpu || 0).toFixed(1)} ₽</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', fontWeight: 600 }}>Высокая лояльность аудитории</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(350px, 1fr)', gap: '32px', marginBottom: '48px' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '32px', border: '1px solid var(--border-color)', padding: '40px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Динамика доходов</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Среднесуточный объем транзакций за неделю</p>
                        </div>
                        <Calendar size={24} color="var(--text-muted)" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '300px', borderBottom: '2px solid var(--overlay-base)', paddingBottom: '32px' }}>
                        {(stats.dailyRevenue || []).map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' }}>
                                <div style={{
                                    width: '100%',
                                    height: `${(d.amount / maxDaily) * 100}%`,
                                    background: 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(238, 43, 84, 0.4) 100%)',
                                    borderRadius: '12px 12px 6px 6px',
                                    minHeight: '8px',
                                    transition: 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)',
                                    boxShadow: '0 4px 15px -2px rgba(238, 43, 84, 0.2)'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    opacity: d.amount > 0 ? 1 : 0
                                }}>
                                    {d.amount.toLocaleString()}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                    {new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ background: 'var(--bg-card)', borderRadius: '32px', border: '1px solid var(--border-color)', padding: '40px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px' }}>Структура доходов</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {(stats.summary?.categoryStats || []).map((cat, i) => {
                            const labels: Record<string, string> = {
                                payment: 'Пополнения кошелька', renewal: 'Продление VPN',
                                bonus: 'Бонусные начисления', refund: 'Возвраты средств', referral: 'Реферальная программа'
                            }
                            const colors: Record<string, string> = {
                                payment: 'var(--accent-green)', renewal: 'var(--accent-primary)',
                                bonus: '#f59e0b', refund: '#ef4444', referral: '#8b5cf6'
                            }
                            if (cat.amount === 0 && cat.name !== 'payment' && cat.name !== 'renewal') return null

                            const percentage = Math.min((cat.amount / Math.max(stats.summary?.totalRevenue || 1, 1)) * 100, 100)

                            return (
                                <div key={i} style={{ transition: 'all 0.3s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: colors[cat.name] || '#6b7280' }} />
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{labels[cat.name] || cat.name}</span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: colors[cat.name] || '#6b7280',
                                            borderRadius: '6px',
                                            boxShadow: `0 0 10px ${colors[cat.name]}44`
                                        }} />
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>
                                        {Math.round(cat.amount).toLocaleString()} ₽
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Tariff Distribution */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '32px', border: '1px solid var(--border-color)', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 800 }}>Популярные тарифы</h3>
                        <Users size={24} color="var(--text-muted)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {(stats.tariffStats || []).map((t, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: t.color || 'var(--accent-primary)',
                                            boxShadow: `0 0 10px ${t.color || 'var(--accent-primary)'}66`
                                        }} />
                                        <span style={{ fontSize: '15px', fontWeight: 700 }}>{t.name}</span>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.count} чел.</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min((t.count / Math.max(stats.summary?.totalClients || 1, 1)) * 100, 100)}%`,
                                        height: '100%',
                                        background: t.color || 'var(--accent-primary)',
                                        borderRadius: '4px',
                                        boxShadow: `0 0 8px ${t.color || 'var(--accent-primary)'}44`
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transactions Table Section */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '32px', border: '1px solid var(--border-color)', padding: '40px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Реестр транзакций</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Полный аудит последних финансовых операций</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', height: '40px' }}
                        >
                            <option value="all">Все категории</option>
                            <option value="payment">Платежи</option>
                            <option value="bonus">Бонусы</option>
                            <option value="refund">Возвраты</option>
                            <option value="renewal">Продления</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', height: '40px' }}
                        >
                            <option value="all">Все типы</option>
                            <option value="credit">Пополнения</option>
                            <option value="debit">Списания</option>
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                            <input
                                type="text"
                                placeholder="Поиск операций..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px',
                                    padding: '0 16px 0 36px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                                    outline: 'none', height: '40px', width: '220px', transition: 'border-color 0.2s'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Клиент</th>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Тип Операции</th>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Детали</th>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Сумма</th>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Дата и Время</th>
                                <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.latestTransactions || [])
                                .filter(tx => filterType === 'all' || tx.type === filterType)
                                .filter(tx => filterCategory === 'all' || tx.category === filterCategory)
                                .filter(tx => {
                                    if (!searchQuery.trim()) return true;
                                    const q = searchQuery.toLowerCase();
                                    return (
                                        tx.id.toLowerCase().includes(q) ||
                                        tx.description?.toLowerCase().includes(q) ||
                                        tx.client?.telegramId.includes(q) ||
                                        tx.client?.username?.toLowerCase().includes(q) ||
                                        tx.client?.firstName?.toLowerCase().includes(q) ||
                                        String(tx.amount).includes(q)
                                    );
                                })
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map((tx) => (
                                    <tr key={tx.id} style={{
                                        background: tx.status === 'refunded' ? 'rgba(0,0,0,0.02)' : 'var(--bg-card)',
                                        opacity: tx.status === 'refunded' ? 0.7 : 1
                                    }}>
                                        <td style={{ padding: '20px', borderRadius: '16px 0 0 16px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '14px' }}>
                                                    {(tx.client?.firstName || tx.client?.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{tx.client?.firstName || tx.client?.username || '—'}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TG ID: {tx.client?.telegramId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {tx.type === 'credit' ? (
                                                    <div className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>
                                                        <ArrowUpRight size={12} /> Пополнение
                                                    </div>
                                                ) : (
                                                    <div className="status-badge" style={{ background: 'rgba(238, 43, 84, 0.1)', color: 'var(--accent-primary)' }}>
                                                        <ArrowDownRight size={12} /> Списание
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '4px' }}>
                                                    • {tx.category.toUpperCase()}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ maxWidth: '250px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
                                                {tx.description || 'Без описания'}
                                                {tx.status === 'refunded' && (
                                                    <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <RefreshCw size={10} /> ВОЗВРАТ ПРОВЕДЕН
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{
                                                fontWeight: 900,
                                                fontSize: '17px',
                                                color: tx.status === 'refunded' ? 'var(--text-muted)' : (tx.type === 'credit' ? 'var(--accent-green)' : 'var(--text-primary)')
                                            }}>
                                                {tx.type === 'credit' ? '+' : '-'}{(tx.amount || 0).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>₽</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                                {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—'}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
                                                {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', borderRadius: '0 16px 16px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTx(tx)
                                                        setIsDetailsModalOpen(true)
                                                    }}
                                                    className="action-btn" title="Детали"
                                                >
                                                    <ChevronRight size={18} color="var(--text-muted)" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTx(tx)
                                                        setIsReceiptModalOpen(true)
                                                    }}
                                                    className="action-btn" title="Чек"
                                                >
                                                    <Receipt size={18} color="var(--text-muted)" />
                                                </button>
                                                {tx.status === 'completed' && tx.category !== 'refund' && (
                                                    <button onClick={() => handleRefund(tx.id)} className="action-btn" title="Возврат" style={{ color: '#ef4444' }}>
                                                        <RefreshCw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    {(() => {
                        const filteredTx = (stats.latestTransactions || [])
                            .filter(tx => filterType === 'all' || tx.type === filterType)
                            .filter(tx => filterCategory === 'all' || tx.category === filterCategory)
                            .filter(tx => {
                                if (!searchQuery.trim()) return true;
                                const q = searchQuery.toLowerCase();
                                return (
                                    tx.id.toLowerCase().includes(q) ||
                                    tx.description?.toLowerCase().includes(q) ||
                                    tx.client?.telegramId.includes(q) ||
                                    tx.client?.username?.toLowerCase().includes(q) ||
                                    tx.client?.firstName?.toLowerCase().includes(q) ||
                                    String(tx.amount).includes(q)
                                );
                            });

                        if (filteredTx.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                                    <CreditCard size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                    <div style={{ fontSize: '18px', fontWeight: 700 }}>Транзакций по выбранным фильтрам пока нет</div>
                                </div>
                            );
                        }

                        if (filteredTx.length > itemsPerPage) {
                            return (
                                <div style={{ padding: '24px' }}>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(filteredTx.length / itemsPerPage)}
                                        onPageChange={(page) => {
                                            setCurrentPage(page)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                    />
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* Transaction Details Modal */}
            {isDetailsModalOpen && selectedTx && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '32px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Детали Операции</h2>
                            <button onClick={() => setIsDetailsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>ID Транзакции</span>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedTx.id.split('-')[0]}...</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>ID Клиента</span>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedTx.clientId.split('-')[0]}...</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Сумма</span>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: selectedTx.type === 'credit' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                                    {selectedTx.type === 'credit' ? '+' : '-'}{selectedTx.amount} ₽
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Статус</span>
                                <span style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: selectedTx.status === 'refunded' ? '#ef4444' : 'var(--accent-green)' }}>
                                    {selectedTx.status === 'completed' ? 'Успешно' : 'Возврат'}
                                </span>
                            </div>
                            {selectedTx.operatorId && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Оператор (Admin ID)</span>
                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', background: 'rgba(238, 43, 84, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                        {selectedTx.operatorId.split('-')[0]}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Electronic Receipt Modal */}
            {isReceiptModalOpen && selectedTx && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '40px', position: 'relative', borderTop: '8px solid var(--accent-primary)', borderBottom: '8px solid var(--accent-primary)' }}>
                        <button onClick={() => setIsReceiptModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 16px' }}>
                                <ShieldCheck size={32} />
                            </div>
                            <h2 style={{ color: '#111', fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Prym Finance</h2>
                            <div style={{ color: '#666', fontSize: '12px', fontWeight: 600 }}>ЭЛЕКТРОННЫЙ ЧЕК №{selectedTx.id.split('-')[0].toUpperCase()}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '2px dashed #eee', borderBottom: '2px dashed #eee', padding: '24px 0', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#888' }}>КЛИЕНТ</span>
                                <span style={{ fontSize: '13px', fontWeight: 800 }}>{selectedTx.client?.telegramId}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#888' }}>КАТЕГОРИЯ</span>
                                <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>{selectedTx.category}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#888' }}>ДАТА</span>
                                <span style={{ fontSize: '13px', fontWeight: 800 }}>{new Date(selectedTx.createdAt).toLocaleString('ru-RU')}</span>
                            </div>
                            {selectedTx.description && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333', marginTop: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#888' }}>ОПИСАНИЕ</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, textAlign: 'right', maxWidth: '150px' }}>{selectedTx.description}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#111' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800 }}>ИТОГО</span>
                            <span style={{ fontSize: '32px', fontWeight: 900 }}>{selectedTx.amount.toLocaleString()} ₽</span>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80%', height: '40px', background: 'repeating-linear-gradient(90deg, #111, #111 2px, transparent 2px, transparent 4px)', opacity: 0.8 }} />
                            <div style={{ color: '#aaa', fontSize: '10px', fontWeight: 600 }}>ДОКУМЕНТ СФОРМИРОВАН АВТОМАТИЧЕСКИ</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
