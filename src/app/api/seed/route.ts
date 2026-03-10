import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { hashSync } from 'bcryptjs'

export async function POST() {
    // Создаём операторов
    const admin = await prisma!.user.upsert({
        where: { email: 'admin@supportflow.local' },
        update: {},
        create: {
            name: 'Администратор',
            email: 'admin@supportflow.local',
            passwordHash: hashSync('admin123', 10),
            role: 'admin',
        },
    })

    const operator1 = await prisma!.user.upsert({
        where: { email: 'yan@supportflow.local' },
        update: {},
        create: {
            name: 'Ян',
            email: 'yan@supportflow.local',
            passwordHash: hashSync('operator123', 10),
            role: 'operator',
        },
    })

    const operator2 = await prisma!.user.upsert({
        where: { email: 'shah@supportflow.local' },
        update: {},
        create: {
            name: 'Шах',
            email: 'shah@supportflow.local',
            passwordHash: hashSync('operator123', 10),
            role: 'operator',
        },
    })

    // Тарифы
    const tariff1 = await prisma!.tariff.create({
        data: { name: 'Базовый', price: 199, duration: 30, description: '1 устройство, базовая скорость' },
    })

    const tariff2 = await prisma!.tariff.create({
        data: { name: 'Стандарт', price: 399, duration: 30, description: '3 устройства, высокая скорость' },
    })

    const tariff3 = await prisma!.tariff.create({
        data: { name: 'Премиум', price: 599, duration: 30, description: '5 устройств, максимальная скорость' },
    })

    // Клиенты
    const clients = []
    const clientData = [
        { telegramId: '100234561', username: 'ivan_vpn', firstName: 'Иван', balance: 1215, tariffId: tariff2.id },
        { telegramId: '100789456', username: 'maria_k', firstName: 'Мария', balance: 450, tariffId: tariff1.id },
        { telegramId: '100345678', username: 'alexey_dev', firstName: 'Алексей', balance: 0, tariffId: null },
        { telegramId: '100567890', username: 'olga_star', firstName: 'Ольга', balance: 2300, tariffId: tariff3.id },
        { telegramId: '100112233', username: 'dmitry_net', firstName: 'Дмитрий', balance: 199, tariffId: tariff1.id },
    ]

    for (const cd of clientData) {
        const client = await prisma!.client.create({ data: cd })
        clients.push(client)
    }

    // Тикеты и сообщения
    const ticketData = [
        {
            clientIdx: 0, operatorId: operator1.id, status: 'open', number: 1,
            messages: [
                { content: 'Здравствуйте, vpn не работает, Сиг... кирга', senderType: 'client' },
                { content: 'Пока отправлю общую сверху...', senderType: 'client' },
                { content: 'Здравствуйте! Уточните, какой протокол вы используете?', senderType: 'operator' },
            ],
        },
        {
            clientIdx: 1, operatorId: operator2.id, status: 'new', number: 2,
            messages: [
                { content: 'Как получить ключ для подписки?', senderType: 'client' },
            ],
        },
        {
            clientIdx: 2, operatorId: null, status: 'new', number: 3,
            messages: [
                { content: 'С подпиской МобВай когда обемне...', senderType: 'client' },
            ],
        },
        {
            clientIdx: 3, operatorId: operator1.id, status: 'resolved', number: 4,
            messages: [
                { content: 'как войти с другой страной?', senderType: 'client' },
                { content: 'Выберите нужную локацию в настройках подключения', senderType: 'operator' },
                { content: 'Спасибо, разобрался!', senderType: 'client' },
            ],
        },
        {
            clientIdx: 4, operatorId: operator2.id, status: 'pending', number: 5,
            messages: [
                { content: 'у меня закончилась подписка, хочу продлить', senderType: 'client' },
                { content: 'Пополните баланс и подписка активируется автоматически', senderType: 'operator' },
                { content: 'а я пополнял в 2 месяца, просила провести оплатил лю платеж, внесите деньги на банковскую карту', senderType: 'client' },
            ],
        },
    ]

    for (const td of ticketData) {
        const ticket = await prisma!.ticket.create({
            data: {
                number: td.number,
                clientId: clients[td.clientIdx].id,
                operatorId: td.operatorId,
                status: td.status,
            },
        })

        for (const msg of td.messages) {
            await prisma!.message.create({
                data: {
                    ticketId: ticket.id,
                    content: msg.content,
                    senderType: msg.senderType,
                    clientId: msg.senderType === 'client' ? clients[td.clientIdx].id : undefined,
                    operatorId: msg.senderType === 'operator' ? (td.operatorId || undefined) : undefined,
                },
            })
        }
    }

    // Транзакции
    await prisma!.transaction.createMany({
        data: [
            { clientId: clients[0].id, amount: 399, type: 'credit', description: 'Пополнение' },
            { clientId: clients[0].id, amount: -399, type: 'debit', description: 'Списание за услугу' },
            { clientId: clients[0].id, amount: 1215, type: 'credit', description: 'Пополнение' },
            { clientId: clients[3].id, amount: 599, type: 'credit', description: 'Пополнение' },
            { clientId: clients[3].id, amount: -599, type: 'debit', description: 'Списание за услугу' },
            { clientId: clients[3].id, amount: 2300, type: 'credit', description: 'Пополнение' },
        ],
    })

    // Шаблоны ответов
    await prisma!.template.createMany({
        data: [
            { title: 'Не работает', content: 'Здравствуйте, для начала проверьте подключение к интернету. Попробуйте переключить протокол в настройках.', category: 'Проблемы' },
            { title: 'Ограничение по устройствам', content: 'Здравствуйте, до 5 штук устройств, пожалуйста, проверьте нашу политику подключённых устройств.', category: 'Общие' },
            { title: 'Маршрутизация', content: 'Маршрутизация от 4-х серверов прописывается для разных протоколов (VLESS/v2Ray). Основные поля навигации: сервер, область, протокол. Пришли.', category: 'Техническое' },
            { title: 'Если тип подключение тупит на Windows', content: 'Чтобы на Wi-Fi подключение не работало следующего образом, нужно проверить  количество выходных проложенных компонентов. Переключите протокол.', category: 'Windows' },
            { title: 'Возврат средств', content: 'Сначала удалите некую подписку 1. После деактивации вентиляционных компонентов, до полного удаления вам нужен возврат.', category: 'Оплата' },
            { title: 'Отключить услугу', content: 'Здравствуйте, отключить услугу можно напрямую в ваш бои, но не так просто выполнить, но допустимо выполнять чтобы удалять.', category: 'Общие' },
            { title: 'Получение ключа для подписки', content: 'Чтобы получить ключ, напишите в личные сообщения бота команду /key. Ключ будет отправлен автоматически.', category: 'Ключи' },
            { title: 'Ключ AWG/Роутер 3 дн.', content: 'Если у Вас новый активный аккаунт - наш менеджер предоставляет ключи пробника на 3 дня. Он уже раздаёт пробные ключи.', category: 'Ключи' },
        ],
    })

    // Авто-ответы
    await prisma!.autoResponse.createMany({
        data: [
            { name: 'Как получить ключ?', keywords: '["как получить ключ", "где ключ", "ключ подписки"]', responseText: 'Чтобы получить ключ, напишите в личные сообщения...' },
            { name: 'Не работает VPN', keywords: '["не работает", "не подключается", "vpn не работает"]', responseText: 'Попробуйте переключить протокол или сервер в настройках.' },
            { name: 'Цены', keywords: '["сколько стоит", "цена", "тариф", "прайс"]', responseText: 'Наши тарифы: Базовый — 199₽/мес, Стандарт — 399₽/мес, Премиум — 599₽/мес.' },
        ],
    })

    // AI Settings
    await prisma!.aISettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            isEnabled: false,
            model: 'gemini-2.0-flash',
            systemPrompt: 'Ты помощник техподдержки VPN сервиса. Отвечай на вопросы пользователей вежливо и по делу.',
        },
    })

    return NextResponse.json({
        message: 'Seed data created!',
        stats: {
            operators: 3,
            clients: clients.length,
            tickets: ticketData.length,
            templates: 8,
            autoResponses: 3,
            tariffs: 3,
        },
    })
}
