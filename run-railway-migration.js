console.log('🔄 Uruchamiam migrację na Railway...');

async function runRailwayMigration() {
  try {
    console.log('📡 Wysyłam żądanie migracji do Railway...');
    
    // Wysyłamy żądanie do endpointu health, który powinien uruchomić migrację
    const response = await fetch('https://web-production-fc58d.up.railway.app/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`📊 Status odpowiedzi: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migracja uruchomiona:', result);
      
      // Poczekaj chwilę i sprawdź techników
      console.log('⏳ Czekam 5 sekund...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Sprawdź techników
      const techResponse = await fetch('https://web-production-fc58d.up.railway.app/api/technicians');
      if (techResponse.ok) {
        const technicians = await techResponse.json();
        console.log(`✅ Technicy po migracji: ${technicians.length}`);
        technicians.forEach(tech => {
          console.log(`   - ID: ${tech.id} | ${tech.full_name}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Błąd migracji:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Błąd połączenia:', error.message);
  }
}

runRailwayMigration(); 