const baseUrl = "https://go.dev.unlok.you";
const apiKey = "bdlg_sIu2f3ZqP9dEwT7yXvN1g_123";

async function fetchTg(id) {
    const res = await fetch(`${baseUrl}/api/users/by-telegram-id/${id}`, {
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Api-Key": apiKey
        }
    });
    console.log(id, res.status);
    const text = await res.text();
    console.log(text);
}

fetchTg("623812739").catch(console.error);
fetchTg("999999999").catch(console.error);
