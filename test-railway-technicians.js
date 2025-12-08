console.log('🧪 Testuję endpoint techników na Railway...');

async function testRailwayTechnicians() {
  try {
    console.log('📡 Wysyłam żądanie do Railway...');
    
    const response = await fetch('https://web-production-fc58d.up.railway.app/api/technicians', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`📊 Status odpowiedzi: ${response.status}`);
    
    if (response.ok) {
      const technicians = await response.json();
      console.log(`✅ Pobrano ${technicians.length} techników z Railway:`);
      technicians.forEach((tech, index) => {
        console.log(`   ${index + 1}. ID: ${tech.id} | ${tech.full_name} | ${tech.username} | ${tech.role}`);
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Błąd pobierania techników:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Błąd połączenia:', error.message);
  }
}

testRailwayTechnicians(); 