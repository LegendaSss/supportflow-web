'use client'

import { useState, useEffect } from 'react'
import { Pagination } from '@/components/Pagination'

interface AutoResponse {
    id: string
    name: string
    keywords: string
    responseText: string
    isActive: boolean
}

export default function AutoResponsesPage() {
    const [items, setItems] = useState<AutoResponse[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', keywords: '', responseText: '' })
    const [keywordInput, setKeywordInput] = useState('')
    const [keywordsList, setKeywordsList] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => { fetchItems() }, [])

    async function fetchItems() {
        const res = await fetch('/api/auto-responses')
        setItems(await res.json())
    }

    function addKeyword() {
        if (keywordInput.trim()) {
            setKeywordsList([...keywordsList, keywordInput.trim()])
            setKeywordInput('')
        }
    }

    function removeKeyword(i: number) {
        setKeywordsList(keywordsList.filter((_, idx) => idx !== i))
    }

    async function save() {
        const method = editId ? 'PUT' : 'POST'
        const url = editId ? `/api/auto-responses/${editId}` : '/api/auto-responses'
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.name,
                keywords: JSON.stringify(keywordsList),
                responseText: form.responseText,
            }),
        })
        close()
        fetchItems()
    }

    async function toggleActive(id: string, isActive: boolean) {
        await fetch(`/api/auto-responses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !isActive }),
        })
        fetchItems()
    }

    async function deleteItem(id: string) {
        await fetch(`/api/auto-responses/${id}`, { method: 'DELETE' })
        fetchItems()
    }

    function openEdit(item: AutoResponse) {
        setEditId(item.id)
        setForm({ name: item.name, keywords: item.keywords, responseText: item.responseText })
        try { setKeywordsList(JSON.parse(item.keywords)) } catch { setKeywordsList([]) }
        setShowModal(true)
    }

    function close() {
        setShowModal(false)
        setEditId(null)
        setForm({ name: '', keywords: '', responseText: '' })
        setKeywordsList([])
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>🤖 Авто-ответы</h1>
                    <p>Автоматические ответы по ключевым словам и фразам</p>
                </div>
                <button className="btn btn-primary" onClick={() => { close(); setShowModal(true) }}>
                    + Создать
                </button>
            </div>

            {items.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🤖</div>
                    <div className="empty-title">Нет авто-ответов</div>
                    <div className="empty-desc">Создайте правила для автоматических ответов</div>
                </div>
            ) : (
                <>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Ключевые фразы</th>
                                <th>Ответ</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(item => {
                                let keywords: string[] = []
                                try { keywords = JSON.parse(item.keywords) } catch { keywords = [] }
                                return (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {keywords.slice(0, 3).map((kw, i) => (
                                                    <span key={i} className="keyword-tag">{kw}</span>
                                                ))}
                                                {keywords.length > 3 && (
                                                    <span className="keyword-tag">+{keywords.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{
                                            color: 'var(--text-secondary)', maxWidth: '300px',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {item.responseText}
                                        </td>
                                        <td>
                                            <div
                                                className={`toggle ${item.isActive ? 'active' : ''}`}
                                                onClick={() => toggleActive(item.id, item.isActive)}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {items.length > itemsPerPage && (
                        <div style={{ marginTop: '24px' }}>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(items.length / itemsPerPage)}
                                onPageChange={(page) => {
                                    setCurrentPage(page)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={close}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Редактировать' : 'Новый авто-ответ'}</h3>
                            <button className="modal-close" onClick={close}>×</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Название</label>
                            <input
                                className="form-input"
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Как получить ключ?"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Ключевые фразы</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    className="form-input"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                                    placeholder="Введите фразу и нажмите Enter"
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-secondary btn-sm" onClick={addKeyword}>Добавить</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {keywordsList.map((kw, i) => (
                                    <span key={i} className="keyword-tag">
                                        {kw}
                                        <span className="remove-tag" onClick={() => removeKeyword(i)}>×</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Текст ответа</label>
                            <textarea
                                className="form-textarea"
                                value={form.responseText}
                                onChange={(e) => setForm(f => ({ ...f, responseText: e.target.value }))}
                                placeholder="Чтобы получить ключ, напишите в личные сообщения..."
                                rows={4}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={close}>Отмена</button>
                            <button className="btn btn-primary" onClick={save}>
                                {editId ? 'Сохранить' : 'Создать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
