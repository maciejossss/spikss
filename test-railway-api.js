// Test Railway API
async function testRailwayAPI() {
  try {
    console.log('🔍 Testowanie Railway API...');
    
    // Test 1: Sprawdź health endpoint
    console.log('\n1️⃣ Test health endpoint...');
    const healthResponse = await fetch('https://web-production-fc58d.up.railway.app/api/health');
    console.log(`Health status: ${healthResponse.status}`);
    
    // Test 2: Sprawdź technicians endpoint
    console.log('\n2️⃣ Test technicians endpoint...');
    const techniciansResponse = await fetch('https://web-production-fc58d.up.railway.app/api/technicians');
    console.log(`Technicians status: ${techniciansResponse.status}`);
    if (techniciansResponse.ok) {
      const technicians = await techniciansResponse.json();
      console.log(`Technicy: ${technicians.length}`);
      technicians.forEach(t => console.log(`  - ${t.name} (ID: ${t.id})`));
    }
    
    // Test 3: Sprawdź orders endpoint dla technika 1
    console.log('\n3️⃣ Test orders endpoint dla technika 1...');
    const ordersResponse = await fetch('https://web-production-fc58d.up.railway.app/api/desktop/orders/1');
    console.log(`Orders status: ${ordersResponse.status}`);
    
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      console.log(`Zlecenia: ${orders.length}`);
      orders.forEach(o => console.log(`  - ${o.order_number}: ${o.client_name}`));
    } else {
      const errorText = await ordersResponse.text();
      console.log(`Błąd: ${errorText}`);
    }
    
    // Test 4: Sprawdź orders endpoint dla technika 13
    console.log('\n4️⃣ Test orders endpoint dla technika 13...');
    const ordersResponse2 = await fetch('https://web-production-fc58d.up.railway.app/api/desktop/orders/13');
    console.log(`Orders status: ${ordersResponse2.status}`);
    
    if (ordersResponse2.ok) {
      const orders = await ordersResponse2.json();
      console.log(`Zlecenia: ${orders.length}`);
      orders.forEach(o => console.log(`  - ${o.order_number}: ${o.client_name}`));
    } else {
      const errorText = await ordersResponse2.text();
      console.log(`Błąd: ${errorText}`);
    }
    
    console.log('\n✅ Test zakończony!');
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error);
  }
}

// Uruchom test
testRailwayAPI(); 