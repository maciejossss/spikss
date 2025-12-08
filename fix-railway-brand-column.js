console.log('🔧 Naprawiam kolumnę brand na Railway...');

async function fixBrandColumn() {
  try {
    console.log('📡 Wysyłam żądanie naprawy do Railway...');
    
    // Wysyłamy żądanie POST do endpointu sync/devices z pustymi danymi
    // To powinno uruchomić migrację
    const response = await fetch('https://web-production-fc58d.up.railway.app/api/sync/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([])
    });
    
    console.log(`📊 Status odpowiedzi: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Naprawa zakończona:', result);
      
      // Poczekaj chwilę i sprawdź zlecenia
      console.log('⏳ Czekam 3 sekundy...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Sprawdź zlecenia
      const ordersResponse = await fetch('https://web-production-fc58d.up.railway.app/api/desktop/orders/13');
      console.log(`📊 Status zleceń: ${ordersResponse.status}`);
      
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        console.log(`✅ Zlecenia po naprawie: ${orders.length}`);
        orders.forEach(order => {
          console.log(`   - ${order.order_number}: ${order.title}`);
        });
      } else {
        const errorText = await ordersResponse.text();
        console.log(`❌ Błąd zleceń: ${errorText}`);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Błąd naprawy:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Błąd połączenia:', error.message);
  }
}

fixBrandColumn(); 