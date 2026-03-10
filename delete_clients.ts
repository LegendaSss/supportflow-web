import { prisma } from './src/lib/prisma';

async function main() {
    const clients = await prisma!.client.findMany({
        select: { id: true, username: true, telegramId: true }
    });
    console.log("All clients:", clients.length);

    // Filter the clients to delete
    const toDelete = clients.filter(c => c.username !== 'IT_Special_Program' && c.username !== 'Error_404_Back');
    console.log("Clients to delete:", toDelete.map(c => c.username));

    // Delete them
    for (const c of toDelete) {
        // Delete related records first
        await prisma!.message.deleteMany({ where: { ticket: { clientId: c.id } } });
        await prisma!.ticket.deleteMany({ where: { clientId: c.id } });
        await prisma!.transaction.deleteMany({ where: { clientId: c.id } });
        await prisma!.subscription.deleteMany({ where: { clientId: c.id } });
        await prisma!.client.delete({ where: { id: c.id } });
        console.log(`Deleted client: ${c.username}`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma!.$disconnect(); });
