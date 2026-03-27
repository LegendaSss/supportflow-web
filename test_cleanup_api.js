fetch('http://93.183.83.53:3000/api/admin/media-cleanup', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer supportflow-unlok-secret-2026`
    }
})
.then(res => res.json())
.then(data => console.log('✅ API Response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('❌ API Error:', err));
