'use client'

import React, { useState, useMemo } from 'react'
import {
    Search, Book, Shield, Zap, Smartphone,
    Globe, HelpCircle, ArrowRight,
    Download, ChevronRight,
    AlertCircle, Terminal, X, ExternalLink,
    Clock, User, Star
} from 'lucide-react'

// Mock database for articles
const ARTICLE_CONTENT: Record<string, { title: string, content: string, date: string, author: string, readTime: string }> = {
    'Как купить подписку': {
        title: 'Как купить подписку',
        date: '24 Фев 2024',
        author: 'Admin',
        readTime: '3 мин',
        content: `
# Инструкция по покупке подписки

Для того чтобы начать пользоваться нашим VPN, выполните следующие шаги:

1. **Перейдите в бот**: Основное управление подписками происходит через Telegram бот.
2. **Выберите тариф**: Мы предлагаем гибкие планы — от 1 месяца до года. Чем больше срок, тем дешевле месяц!
3. **Выберите способ оплаты**: Мы поддерживаем банковские карты, криптовалюту и СБП.
4. **Получите ключ**: После оплаты вам придет уникальная ссылка доступа VLESS/VMR.

> [!IMPORTANT]
> Никогда не передавайте ваш ключ доступа третьим лицам. Это может привести к блокировке аккаунта.
        `
    },
    'Windows / macOS': {
        title: 'Настройка на Windows и macOS',
        date: '10 Мар 2024',
        author: 'Support Team',
        readTime: '5 мин',
        content: `
# Настройка Happ Proxy на ПК

Для компьютеров мы рекомендуем использовать приложение **Happ Proxy**.

### Шаги установки:
1. **Скачайте клиент**: Ссылки доступны в разделе "Полезные ресурсы".
2. **Скопируйте ключ**: Скопируйте ссылку из бота (начинается на vless://).
3. **Добавьте сервер**: В приложении нажмите кнопку "+" или "Import from Clipboard".
4. **Запустите**: Выберите сервер и нажмите кнопку подключения.

### Особенности Windows:
- Включите "System Proxy" в настройках, чтобы трафик всего ПК шел через VPN.
- Убедитесь, что ваш брандмауэр не блокирует приложение.
        `
    },
    'Android / TV': {
        title: 'Настройка на Android и TV',
        date: '15 Фев 2024',
        author: 'Rasul',
        readTime: '4 мин',
        content: `
# VPN для Android и Android TV

Для мобильных устройств и телевизоров есть два основных способа:

1. **Happ Proxy (APK)**: Самый простой способ. Просто установите и вставьте ключ.
2. **AmneziaWG**: Используйте этот вариант, если стандартные протоколы блокируются вашим провайдером.

### Для телевизоров:
- Устанавливайте через Google Play или флешку (APK).
- На Android TV лучше всего работает Happ Proxy.
        `
    },
    'Маршрутизация (Happ)': {
        title: 'Настройка маршрутизации в Happ Proxy',
        date: '01 Мар 2024',
        author: 'Technical Dept',
        readTime: '10 мин',
        content: `
# Глобальная настройка маршрутов

В нашем сервисе нет автоматической маршрутизации "из коробки", но вы можете настроить её вручную.

### Что это дает?
Вы можете сделать так, чтобы только определенные сайты (например, YouTube или Instagram) шли через VPN, а всё остальное — напрямую.

### Как настроить:
1. Перейдите на [routing.happ.su](https://routing.happ.su).
2. Выберите нужные вам сервисы из списка.
3. Скопируйте сгенерированный JSON-код.
4. В приложении Happ перейдите в **Settings -> Routing -> Advanced** и вставьте код.

> [!WARNING]
> Ошибки в JSON коде могут привести к тому, что интернет перестанет работать. Используйте наш генератор!
        `
    },
    'Первое подключение': {
        title: 'Первое подключение к VPN',
        date: '02 Мар 2024',
        author: 'Admin',
        readTime: '3 мин',
        content: `
# Как подключиться в первый раз

Если вы только что купили подписку, следуйте этому гайду:

1. **Дождитесь сообщения от бота**: Он пришлет вам длинный код или ссылку (vless://...).
2. **Скопируйте этот код** целиком.
3. **Установите приложение**: Рекомендуем Happ Proxy для всех платформ.
4. **Добавьте конфигурацию**: В приложении выберите "Import from Clipboard".
5. **Нажмите 'Connect'**: Если всё сделано верно, значок станет зеленым.

### Проверка связи:
Зайдите на любой заблокированный ресурс. Если он открывается — всё работает!
        `
    },
    'iPhone / iPad (Apple)': {
        title: 'Настройка на iPhone и iPad',
        date: '12 Мар 2024',
        author: 'iOS Dev',
        readTime: '4 мин',
        content: `
# Настройка VPN на Apple устройствах

Для iPhone и iPad мы рекомендуем использовать приложение **Utility** или **Utility Plus**.

### Процесс настройки:
1. **Установите из App Store**: Найдите "Utility" (разработчик Happ).
2. **Копирование ключа**: Возьмите ключ из нашего Telegram-бота.
3. **Импорт**: В приложении Utility нажмите "+" и выберите "Import from Clipboard".
4. **Конфигурация VPN**: Система спросит разрешение на добавление конфигурации VPN — нажмите "Разрешить" и введите код-пароль устройства.

> [!NOTE]
> На iOS 17 и выше рекомендуем использовать последнюю версию Utility Plus для стабильной работы.
        `
    },
    'Happ Proxy: Ошибки': {
        title: 'Устранение ошибок в Happ Proxy',
        date: '05 Мар 2024',
        author: 'Support',
        readTime: '6 мин',
        content: `
# Распространенные ошибки Happ Proxy

Если VPN не подключается, проверьте следующее:

1. **Ошибка "Timeout"**: Чаще всего означает, что порт заблокирован провайдером или сервером. Попробуйте сменить локацию.
2. **"Invalid Config"**: Вы скопировали ключ не полностью. Убедитесь, что захватили все символы от vless:// до конца.
3. **Бесконечное "Connecting"**: Проверьте системное время. Оно должно быть синхронизировано автоматически, иначе протокол VLESS не установит соединение.

### Совет:**
Если ничего не помогает, попробуйте переключиться на **AmneziaWG** (инструкция есть в соседнем разделе).
        `
    },
    'AmneziaWG: Настройка': {
        title: 'Настройка AmneziaWG',
        date: '08 Мар 2024',
        author: 'Dev',
        readTime: '5 мин',
        content: `
# Настройка протокола AmneziaWG

AmneziaWG — это модифицированный WireGuard, который лучше обходит блокировки.

### Инструкция:
1. **Запросите конфиг**: В боте выберите тип подключения "AmneziaWG".
2. **Скачайте файл .conf** или скопируйте текст.
3. **Установите клиент AmneziaWG**: Доступен для всех систем.
4. **Импорт**: Нажмите "Add Tunnel" -> "Import from File".
5. **Активация**: Включите туннель.

> [!TIP]
> Этот протокол работает быстрее VLESS, но может потреблять чуть больше заряда батареи на мобильных устройствах.
        `
    },
    'Регламент поддержки': {
        title: 'Регламент работы службы поддержки',
        date: '20 Янв 2024',
        author: 'Operations',
        readTime: '2 мин',
        content: `
# Как мы работаем

Наша поддержка старается отвечать максимально быстро, но просим соблюдать правила:

- **Время ответа**: В среднем 5-15 минут в дневное время.
- **Ночные смены**: Могут быть задержки до 1-2 часов.
- **Тон**: Мы вежливы с вами и ждем взаимности.
- **Данные**: Оператор никогда не попросит ваш пароль, только ID клиента.

Если у вас возникла техническая проблема, пожалуйста, сначала воспользуйтесь кнопкой **"Диагностика"** в чате.
        `
    }
}

export default function KnowledgePage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeArticle, setActiveArticle] = useState<string | null>(null)

    const categories = [
        {
            id: 'getting-started',
            title: '🚀 Начало работы',
            desc: 'Быстрый старт, выбор тарифа и первая настройка.',
            icon: <Zap size={24} style={{ color: '#fbbf24' }} />,
            articles: ['Как купить подписку', 'Первое подключение', 'Выбор локации']
        },
        {
            id: 'apps',
            title: '📱 Приложения',
            desc: 'Ссылки на скачивание и инструкции для всех платформ.',
            icon: <Smartphone size={24} style={{ color: '#60a5fa' }} />,
            articles: ['Windows / macOS', 'Android / TV', 'iPhone / iPad (Apple)']
        },
        {
            id: 'troubleshooting',
            title: '🛠️ Решение проблем',
            desc: 'Что делать, если VPN не подключается или работает медленно.',
            icon: <HelpCircle size={24} style={{ color: '#fb923c' }} />,
            articles: ['Happ Proxy: Ошибки', 'AmneziaWG: Настройка', 'Маршрутизация (Happ)']
        },
        {
            id: 'policy',
            title: '🛡️ Политика и правила',
            desc: 'Как работает поддержка и условия использования сервиса.',
            icon: <Shield size={24} style={{ color: '#4ad991' }} />,
            articles: ['Регламент поддержки', 'Возврат средств', 'Правила сообщества']
        }
    ]

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories
        const lowQuery = searchQuery.toLowerCase()
        return categories.map(cat => ({
            ...cat,
            articles: cat.articles.filter(a =>
                a.toLowerCase().includes(lowQuery) ||
                cat.title.toLowerCase().includes(lowQuery)
            )
        })).filter(cat => cat.articles.length > 0 || cat.title.toLowerCase().includes(lowQuery))
    }, [searchQuery])

    const articleData = activeArticle ? ARTICLE_CONTENT[activeArticle] : null

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .article-modal-content h1 { font-size: 24px; font-weight: 800; margin-bottom: 20px; color: var(--text-primary); }
                .article-modal-content h2 { font-size: 20px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
                .article-modal-content h3 { font-size: 18px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; }
                .article-modal-content p { line-height: 1.6; color: var(--text-secondary); margin-bottom: 12px; font-size: 15px; }
                .article-modal-content ul, .article-modal-content ol { margin-bottom: 16px; padding-left: 20px; color: var(--text-secondary); }
                .article-modal-content li { margin-bottom: 8px; }
                .article-modal-content strong { color: var(--text-primary); font-weight: 600; }
                .article-modal-content blockquote { border-left: 4px solid var(--accent-primary); padding: 12px 20px; background: rgba(255,255,255,0.03); border-radius: 4px 12px 12px 4px; margin: 20px 0; font-style: italic; }
            `}</style>

            {/* Header section */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    База знаний
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                    Все инструкции, ссылки на приложения и ответы на популярные вопросы в одном месте.
                </p>

                {/* Search Bar */}
                <div style={{
                    marginTop: '24px', position: 'relative', maxWidth: '600px',
                    background: 'var(--overlay-base)', borderRadius: '16px',
                    border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)'
                }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                    <input
                        type="text"
                        placeholder="Поиск по статьям и руководствам..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '16px 16px 16px 48px',
                            background: 'transparent', border: 'none',
                            color: 'var(--text-primary)', outline: 'none',
                            fontSize: '14px'
                        }}
                    />
                </div>
            </div>

            {/* Categories Grid */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px', marginBottom: '48px'
            }}>
                {filteredCategories.map((cat) => (
                    <div key={cat.id} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                        }}>
                        <div style={{ marginBottom: '16px' }}>{cat.icon}</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{cat.title}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>{cat.desc}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {cat.articles.map(article => (
                                <div
                                    key={article}
                                    onClick={() => ARTICLE_CONTENT[article] ? setActiveArticle(article) : alert('Статья в разработке')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        fontSize: '13px', color: ARTICLE_CONTENT[article] ? 'var(--text-primary)' : 'var(--text-muted)',
                                        padding: '10px 12px', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.02)', cursor: ARTICLE_CONTENT[article] ? 'pointer' : 'default',
                                        transition: 'all 0.2s'
                                    }}
                                    className="article-link"
                                    onMouseOver={(e) => ARTICLE_CONTENT[article] && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                    onMouseOut={(e) => ARTICLE_CONTENT[article] && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                >
                                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                                    {article}
                                    {ARTICLE_CONTENT[article] && <Zap size={10} style={{ marginLeft: 'auto', color: '#fbbf24' }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Popular Guides */}
            <div style={{
                background: 'var(--overlay-base)', borderRadius: '24px', padding: '24px',
                border: '1px solid var(--border-color)', marginBottom: '48px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={20} style={{ color: '#fbbf24' }} /> Технические руководства
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div
                        onClick={() => setActiveArticle('Маршрутизация (Happ)')}
                        style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    >
                        <div style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '10px', display: 'inline-block' }}>Happ Proxy</div>
                        <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Генератор маршрутизации</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Как пользоваться routing.happ.su и настраивать раздельные маршруты.</p>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6 }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', textTransform: 'uppercase', marginBottom: '10px', display: 'inline-block' }}>AmneziaWG</div>
                        <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Настройка Amnezia</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Скоро: Настройка устойчивого протокола для сложных блоков.</p>
                    </div>
                </div>
            </div>

            {/* Article Modal */}
            {activeArticle && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setActiveArticle(null)}>
                    <div style={{
                        width: '100%', maxWidth: '800px', maxHeight: '90vh',
                        background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                        borderRadius: '28px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.5)', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--overlay-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {articleData?.date}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {articleData?.author}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Book size={14} /> {articleData?.readTime} чтение</span>
                                </div>
                                <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{articleData?.title}</h1>
                            </div>
                            <button
                                onClick={() => setActiveArticle(null)}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: '32px', overflowY: 'auto' }} className="article-modal-content">
                            {articleData?.content.split('\n').map((line, k) => {
                                if (line.startsWith('# ')) return <h1 key={k}>{line.substring(2)}</h1>
                                if (line.startsWith('## ')) return <h2 key={k}>{line.substring(3)}</h2>
                                if (line.startsWith('### ')) return <h3 key={k}>{line.substring(4)}</h3>
                                if (line.startsWith('> ')) return <blockquote key={k}>{line.substring(2)}</blockquote>
                                if (line.trim() === '') return <br key={k} />
                                if (line.match(/^\\d+\\./)) return <div key={k} style={{ paddingLeft: '20px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{line}</div>
                                if (line.startsWith('- ')) return <div key={k} style={{ paddingLeft: '20px', marginBottom: '8px', color: 'var(--text-secondary)' }}>• {line.substring(2)}</div>

                                // Handling basic bolding with strong tags (manual replacement since no markdown parser)
                                let processedLine: any = line
                                if (line.includes('**')) {
                                    const parts = line.split('**')
                                    processedLine = parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
                                }

                                return <p key={k}>{processedLine}</p>
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '20px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--overlay-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--overlay-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <Star size={16} /> Полезно
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Поделиться ссылкой <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
