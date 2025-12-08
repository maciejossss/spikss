const saveClient = async () => {
  // Prosta walidacja
  if (form.type === 'individual' && (!form.first_name || !form.last_name)) {
    alert('Wypełnij imię i nazwisko')
    return
  }
  if (form.type === 'business' && !form.company_name) {
    alert('Wypełnij nazwę firmy')
    return
  }
  if (!form.phone) {
    alert('Wypełnij telefon')
    return
  }

  try {
    const clientData = {
      ...form,
      id: Date.now(), // Proste ID
      created_at: new Date().toISOString(),
      is_active: 1
    }

    // Jeśli jest Electron - zapisz do bazy
    if (window.electronAPI) {
      try {
        await window.electronAPI.database.query(
          `INSERT INTO clients (type, first_name, last_name, company_name, nip, email, phone, 
           address_street, address_city, address_postal_code, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [form.type, form.first_name, form.last_name, form.company_name, form.nip, 
           form.email, form.phone, form.address_street, form.address_city, 
           form.address_postal_code, 1]
        )
      } catch (dbError) {
        console.warn('Database save failed, continuing with local data:', dbError)
      }
    }

    // ZAWSZE emituj klienta do listy (natychmiast widoczny)
    emit('client-saved', clientData)
    
    // Reset i zamknij
    resetForm()
    emit('close')
    
  } catch (error) {
    console.error('Error saving client:', error)
    alert('Błąd podczas zapisywania klienta')
  }
} 