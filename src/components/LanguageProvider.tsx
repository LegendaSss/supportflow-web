'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'ru' | 'en'

const translations: Record<Language, Record<string, string>> = {
    ru: {
        // Sidebar
        'nav.overview': 'Обзор',
        'nav.tickets': 'Тикеты',
        'nav.clients': 'Аудитория',
        'nav.billing': 'Биллинг',
        'nav.analytics': 'Аналитика',
        'nav.templates': 'Шаблоны',
        'nav.ai': 'AI Модуль',
        'nav.automation': 'Автоматизация',
        'nav.marketing': 'Маркетинг',
        'nav.knowledge': 'База знаний',
        'sidebar.workspace': 'Рабочее пространство',
        'sidebar.system': 'Система',
        'sidebar.light': 'Светлая',
        'sidebar.dark': 'Темная',
        // Dashboard
        'dashboard.title': '🛰️ Mission Control',
        'dashboard.subtitle': 'Глобальный мониторинг вашей экосистемы',
        'dashboard.total_tickets': 'Всего тикетов',
        'dashboard.clients': 'Клиентов',
        'dashboard.in_progress': 'В обработке',
        'dashboard.messages': 'Сообщений',
        'dashboard.recent': 'Недавние тикеты',
        'dashboard.all_tickets': 'Все тикеты',
        'dashboard.live_feed': 'Живая лента',
        'dashboard.revenue': 'Доход за неделю',
        'dashboard.revenue_today': 'Сегодня',
        'dashboard.bot_status': 'Статус бота',
        'dashboard.active': 'Активен',
        'dashboard.stopped': 'Остановлен',
        // Analytics
        'analytics.title': 'Аналитика',
        'analytics.subtitle': 'Визуализация KPI и ключевых метрик',
        'analytics.tickets_by_day': 'Тикеты по дням',
        'analytics.revenue_by_day': 'Доходы по дням',
        'analytics.status_dist': 'Статусы тикетов',
        'analytics.tariff_conv': 'Конверсия тарифов',
        'analytics.avg_response': 'Ср. ответ',
        'analytics.revenue': 'Доход',
        // Clients
        'clients.title': 'Аудитория',
        'clients.search': 'Поиск клиентов...',
        'clients.profile': 'Профиль клиента',
        'clients.balance': 'Баланс',
        'clients.spent': 'Потрачено',
        'clients.tickets_tab': 'Тикеты',
        'clients.transactions_tab': 'Транзакции',
        'clients.subs_tab': 'Подписки',
        // Notifications
        'notifications.title': 'Центр уведомлений',
        'notifications.subtitle': 'Оперативный мониторинг событий',
        'notifications.go': 'Перейти в управление',
        // Common
        'common.loading': 'Загрузка...',
        'common.no_data': 'Нет данных',
        'common.save': 'Сохранить',
        'common.cancel': 'Отменить',
        'common.delete': 'Удалить',
    },
    en: {
        // Sidebar
        'nav.overview': 'Overview',
        'nav.tickets': 'Tickets',
        'nav.clients': 'Audience',
        'nav.billing': 'Billing',
        'nav.analytics': 'Analytics',
        'nav.templates': 'Templates',
        'nav.ai': 'AI Module',
        'nav.automation': 'Automation',
        'nav.marketing': 'Marketing',
        'nav.knowledge': 'Knowledge Base',
        'sidebar.workspace': 'Workspace',
        'sidebar.system': 'System',
        'sidebar.light': 'Light',
        'sidebar.dark': 'Dark',
        // Dashboard
        'dashboard.title': '🛰️ Mission Control',
        'dashboard.subtitle': 'Global monitoring of your ecosystem',
        'dashboard.total_tickets': 'Total Tickets',
        'dashboard.clients': 'Clients',
        'dashboard.in_progress': 'In Progress',
        'dashboard.messages': 'Messages',
        'dashboard.recent': 'Recent Tickets',
        'dashboard.all_tickets': 'All Tickets',
        'dashboard.live_feed': 'Live Feed',
        'dashboard.revenue': 'Weekly Revenue',
        'dashboard.revenue_today': 'Today',
        'dashboard.bot_status': 'Bot Status',
        'dashboard.active': 'Active',
        'dashboard.stopped': 'Stopped',
        // Analytics
        'analytics.title': 'Analytics',
        'analytics.subtitle': 'KPI visualization and key metrics',
        'analytics.tickets_by_day': 'Tickets per Day',
        'analytics.revenue_by_day': 'Revenue per Day',
        'analytics.status_dist': 'Ticket Statuses',
        'analytics.tariff_conv': 'Tariff Conversion',
        'analytics.avg_response': 'Avg Response',
        'analytics.revenue': 'Revenue',
        // Clients
        'clients.title': 'Audience',
        'clients.search': 'Search clients...',
        'clients.profile': 'Client Profile',
        'clients.balance': 'Balance',
        'clients.spent': 'Spent',
        'clients.tickets_tab': 'Tickets',
        'clients.transactions_tab': 'Transactions',
        'clients.subs_tab': 'Subscriptions',
        // Notifications
        'notifications.title': 'Notification Center',
        'notifications.subtitle': 'Real-time event monitoring',
        'notifications.go': 'Go to Dashboard',
        // Common
        'common.loading': 'Loading...',
        'common.no_data': 'No data',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
    }
}

interface I18nContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
    language: 'ru',
    setLanguage: () => { },
    t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('ru')

    useEffect(() => {
        const saved = localStorage.getItem('sf-language') as Language
        if (saved && (saved === 'ru' || saved === 'en')) setLanguage(saved)
    }, [])

    const changeLang = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('sf-language', lang)
    }

    const t = (key: string) => translations[language][key] || key

    return (
        <I18nContext.Provider value={{ language, setLanguage: changeLang, t }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useTranslation() {
    return useContext(I18nContext)
}
