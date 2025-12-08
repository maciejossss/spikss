# ANALIZA BŁĘDU - Cannot read properties of undefined (reading 'mime_type')

## FAKTY Z KODU (Bez Zgadywania)

### 1. STACK TRACE
```
TypeError: Cannot read properties of undefined (reading 'mime_type')
at Proxy._sfc_render (OrderDetails.vue:482:69)
```

### 2. KOD W ORDERDETAILS.VUE LINIA 482

```vue
<li v-for="f in deviceFiles.files" :key="f.id" 
    v-if="String(f.mime_type||f.file_type||'').includes('pdf')">
```

**PROBLEM**: `f` jest `undefined` podczas iteracji!

### 3. SKĄD POCHODZI deviceFiles.files?

**Linia 913 (deklaracja)**:
```javascript
const deviceFiles = ref({ photos: [], files: [] })
```

**Linia 1795 (reset)**:
```javascript
deviceFiles.value = { photos: [], files: [] }
```

**Linia 1813 (przypisanie danych)**:
```javascript
deviceFiles.value = { photos: Array.from(uniq.values()), files }
```

Gdzie `files` pochodzi z **linii 1804**:
```javascript
const files = Array.isArray(j?.files || j?.items) ? (j.files || j.items) : []
```

A `j` z **linii 1802-1803**:
```javascript
const r = await fetch(url)  // url = Railway API /api/devices/{id}/files
if (!r.ok) throw new Error(`HTTP ${r.status}`)
const j = await r.json().catch(()=>({}))
```

### 4. CO ZWRACA RAILWAY API?

**Plik**: `desktop/railway-backend/routes/devices.js`  
**Endpoint**: `GET /api/devices/:id/files` (linia 51-226)

**Linia 221 (response)**:
```javascript
return res.json({ 
  success: true, 
  photos: photosDedup,    // Array
  files: filesDedup,      // Array
  items: filesDedup       // Array (alias)
})
```

**Skąd filesDedup?** (linia 188):
```javascript
const filesDedup = dedupByBase(files)
```

**Skąd files?** (linia 165-173):
```javascript
const files = filesRaw.filter(it => {
  try {
    const url = String(it.public_url || '')
    if (!url) return false
    if (url.startsWith('/uploads/') && it.exists === false) return false
    return true
  } catch (_) { return true }
})
```

**Skąd filesRaw?** (linia 134-163):
```javascript
const filesRaw = (deviceFiles || []).map(f => ({
  id: f.id,
  file_name: f.name,
  file_path: f.path,
  file_type: f.type,
  file_size: f.size,
  mime_type: f.type && f.type.includes('/') ? f.type : undefined,  // ← MOŻE BYĆ UNDEFINED
  public_url: ...,
  exists: ...
}))
```

### 5. FUNKCJA dedupByBase (linia 175-187)

```javascript
const dedupByBase = (arr) => {
  const out = []
  const seen = new Set()
  for (const it of (arr || [])) {
    try {
      const display = String(it.file_name || '').trim()
      const name = display || baseName(it.public_url || it.file_path || it.url || it.path || '')
      const key = String(name || '').toLowerCase()
      if (key && !seen.has(key)) { 
        seen.add(key); 
        out.push(it)  // ← Dodaje obiekt
      }
    } catch (_) { 
      out.push(it)  // ← ⚠️ W RAZIE BŁĘDU DODAJE `it` (może być undefined/null!)
    }
  }
  return out
}
```

## ŹRÓDŁO PROBLEMU

### Scenariusz A: `dedupByBase` catch block

Jeśli podczas iteracji w `dedupByBase`:
1. `it` jest poprawnym obiektem
2. Ale `String(it.file_name || '')` rzuci błąd (np. `it` to Proxy z błędnymi getterami)
3. Catch block wykonuje `out.push(it)`
4. Jeśli `it` było problematyczne → dodaje problematyczny obiekt

### Scenariusz B: `filesRaw.map()` zwraca obiekty z undefined properties

Railway zwraca z bazy:
```javascript
deviceFiles = [
  { id: 1, file_name: 'photo.jpg', file_path: '/uploads/x.jpg', file_type: 'image' },  // ← type = 'image' (nie ma /)
  { id: 2, file_name: 'doc.pdf', file_path: null, file_type: null }  // ← type = null
]
```

Po `map()`:
```javascript
filesRaw = [
  { ..., mime_type: undefined },  // bo 'image'.includes('/') = false
  { ..., mime_type: undefined }   // bo null && null.includes() = undefined
]
```

Po `filter()`:
```javascript
files = [
  { ..., public_url: '/uploads/x.jpg', mime_type: undefined },  // ✅ Ma URL
  // Drugi element odfiltrowany bo brak URL
]
```

Po `dedupByBase()`:
```javascript
filesDedup = [
  { ..., public_url: '/uploads/x.jpg', mime_type: undefined }  // ✅ Obiekt istnieje, ale mime_type = undefined
]
```

**TO NIE POWINNO POWODOWAĆ BŁĘDU** bo `f` istnieje, tylko `f.mime_type` jest undefined.

### Scenariusz C: PRAWDZIWY PROBLEM - filter zwraca undefined

**SPRAWDŹMY DOKŁADNIEJ filter (linia 165)**:

```javascript
const files = filesRaw.filter(it => {
  try {
    const url = String(it.public_url || '')
    if (!url) return false
    if (url.startsWith('/uploads/') && it.exists === false) return false
    return true
  } catch (_) { 
    return true  // ← W RAZIE BŁĘDU ZWRACA TRUE - element ZOSTAJE w tablicy!
  }
})
```

**Jeśli `it` jest `undefined` lub `null`**:
- `String(undefined.public_url)` → TypeError
- Catch block: `return true`
- **`undefined` ZOSTAJE w tablicy!**

### Scenariusz D: deviceFiles (z DB) zawiera undefined

**Linia 57 (devices.js)**:
```javascript
let deviceFiles = []
```

**Linia 66-74 (mapowanie)**:
```javascript
deviceFiles = (filesR.rows || []).map(f => ({
  id: f.id,
  name: f.file_name,
  path: f.file_path,
  type: f.file_type,
  size: f.file_size,
  uploaded_at: f.upload_date,
  description: f.description
}))
```

**Jeśli `filesR.rows` zawiera `null` lub `undefined`**:
- `[undefined, {...}, null].map(f => ...)` 
- `f = undefined` → `{ id: undefined.id, ... }` → wszystko undefined
- Nie rzuca błędu, ale zwraca obiekt z undefined properties

**Albo jeśli SQL zwraca NULL w rekordach**:
```sql
SELECT id, file_name, file_path, file_type, file_size, upload_date, description
FROM device_files
WHERE device_id = $1
```

Jeśli rekord ma:
- `id = 5`
- `file_name = NULL`
- `file_path = NULL`
- `file_type = NULL`

To po map():
```javascript
{
  id: 5,
  name: null,
  path: null,
  type: null,
  size: null,
  uploaded_at: null,
  description: null
}
```

Po mapowaniu do `filesRaw`:
```javascript
{
  id: 5,
  file_name: null,
  file_path: null,
  file_type: null,
  mime_type: undefined,  // bo null && null.includes('/') = undefined
  public_url: null,
  exists: undefined
}
```

Filter:
```javascript
const url = String(null.public_url || '')  // String(undefined || '') = String('') = ''
if (!url) return false  // '' is falsy → ODFILTROWANY
```

**Ten rekord zostanie odfiltrowany - OK!**

## WNIOSEK - RZECZYWISTE ŹRÓDŁO

**Problem jest w catch block w filter (linia 165-173, devices.js)**:

```javascript
const files = filesRaw.filter(it => {
  try {
    // ...
  } catch (_) { 
    return true  // ← PROBLEM! Jeśli it=undefined, catch zwraca true
  }
})
```

**Jeśli `filesRaw` zawiera `undefined` (np. przez bug w map)**:
1. Filter próbuje: `String(undefined.public_url)` → TypeError
2. Catch: `return true` → `undefined` ZOSTAJE w tablicy `files`
3. `dedupByBase(files)` dostaje tablicę z `undefined`
4. Try block: `String(undefined.file_name)` → TypeError  
5. Catch: `out.push(undefined)` → `undefined` w wyniku
6. Railway zwraca: `{ files: [..., undefined, ...] }`
7. Desktop: `deviceFiles.files` zawiera `undefined`
8. Template: `v-for="f in deviceFiles.files"` → `f = undefined`
9. `String(f.mime_type)` → TypeError!

## ROZWIĄZANIE (Bez Implementacji)

### Desktop (OrderDetails.vue linia 482):

**Dodać filtrowanie przed użyciem**:
```javascript
// Linia 1804
const files = Array.isArray(j?.files || j?.items) 
  ? (j.files || j.items).filter(f => f != null)  // ← Usuń null/undefined
  : []
```

### Railway (devices.js):

**1. Linia 165-173 (filter catch block)**:
```javascript
catch (_) { 
  return false  // ← Zmień na false zamiast true
}
```

**2. Linia 175-187 (dedupByBase catch block)**:
```javascript
catch (_) { 
  // NIE dodawaj do output jeśli błąd
}
```

**3. Linia 66-74 (map z walidacją)**:
```javascript
deviceFiles = (filesR.rows || [])
  .filter(f => f != null && f.id != null)  // ← Dodaj filtr PRZED map
  .map(f => ({...}))
```

## BEZPIECZNE NAPRAWIENIE

**Priorytety** (od najbezpieczniejszego):

1. **Desktop - Defensywne filtrowanie** (najmniej ryzykowne):
   - Filtruj `null`/`undefined` po odebraniu z API
   - Nie zmienia Railway backend
   - Nie wpływa na mobilną aplikację

2. **Railway - Fix catch blocks**:
   - Zmień `return true` na `return false` w filter
   - Usuń `out.push(it)` w dedupByBase catch
   - Testuj czy nie psuje mobilki

3. **Railway - Walidacja DB response**:
   - Filtruj przed mapowaniem
   - Sprawdź czy rekordy w bazie są poprawne

**NIE WOLNO**:
- Zmieniać struktury response (łamie kompatybilność)
- Usuwać pól (może używa mobilka)
- Zmieniać logiki deduplikacji (może wpłynąć na inne miejsca)


