console.log('🧪 Testuję endpointy na Railway...');

async function testEndpoints() {
  const endpoints = [
    '/',
    '/api/technicians',
    '/api/desktop/orders/13',
    '/api/sync/users'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testuję: ${endpoint}`);
      const response = await fetch(`https://web-production-fc58d.up.railway.app${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ OK: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Connection error: ${error.message}`);
    }
  }
}

testEndpoints(); 