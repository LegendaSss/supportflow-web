'use client'

import { useState, useEffect } from 'react'
import { Pagination } from '@/components/Pagination'

interface Template {
    id: string
    title: string
    content: string
    category: string | null
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ title: '', content: '', category: '' })
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    useEffect(() => {
        fetchTemplates()
    }, [])

    async function fetchTemplates() {
        const res = await fetch('/api/templates')
        setTemplates(await res.json())
    }

    async function saveTemplate() {
        const method = editId ? 'PUT' : 'POST'
        const url = editId ? `/api/templates/${editId}` : '/api/templates'
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        setShowModal(false)
        setEditId(null)
        setForm({ title: '', content: '', category: '' })
        fetchTemplates()
    }

    async function deleteTemplate(id: string) {
        await fetch(`/api/templates/${id}`, { method: 'DELETE' })
        fetchTemplates()
    }

    function openEdit(t: Template) {
        setEditId(t.id)
        setForm({ title: t.title, content: t.content, category: t.category || '' })
        setShowModal(true)
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>📋 Шаблоны ответов</h1>
                    <p>Быстрые ответы для тикетов</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditId(null)
                        setForm({ title: '', content: '', category: '' })
                        setShowModal(true)
                    }}
                >
                    + Создать
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Нет шаблонов</div>
                    <div className="empty-desc">Создайте шаблон быстрого ответа для операторов</div>
                </div>
            ) : (
                <>
                    <div className="cards-grid">
                        {templates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(t => (
                            <div key={t.id} className="card">
                                <div className="card-title">{t.title}</div>
                                <div className="card-content">{t.content.substring(0, 150)}{t.content.length > 150 ? '...' : ''}</div>
                                <div className="card-footer">
                                    {t.category && <span className="card-tag">{t.category}</span>}
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => deleteTemplate(t.id)}>🗑️</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {templates.length > itemsPerPage && (
                        <div style={{ marginTop: '24px' }}>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(templates.length / itemsPerPage)}
                                onPageChange={(page) => {
                                    setCurrentPage(page)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Редактировать шаблон' : 'Новый шаблон'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Название</label>
                            <input
                                className="form-input"
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Название шаблона"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Категория</label>
                            <input
                                className="form-input"
                                value={form.category}
                                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                placeholder="Например: общие, оплата, проблемы"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Текст ответа</label>
                            <textarea
                                className="form-textarea"
                                value={form.content}
                                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                placeholder="Текст шаблона..."
                                rows={5}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
                            <button className="btn btn-primary" onClick={saveTemplate}>
                                {editId ? 'Сохранить' : 'Создать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
