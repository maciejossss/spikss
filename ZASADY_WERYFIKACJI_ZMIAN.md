# ZASADY WERYFIKACJI ZMIAN - Obowiązkowe przed każdą modyfikacją

## ⚠️ OBOWIĄZKOWA PROCEDURA PRZED KAŻDĄ ZMIANĄ

### **KROK 1: ZROZUMIENIE ISTNIEJĄCEGO KODU**

**PRZED wprowadzeniem zmian MUSZĘ:**

1. ✅ **Przeczytać cały fragment kodu który zmieniam**
   - Nie tylko linie które modyfikuję
   - Przeczytać przynajmniej 50 linii przed i po
   - Zrozumieć kontekst i przepływ danych

2. ✅ **Zidentyfikować wszystkie parametry SQL**
   - Policzyć dokładnie ile jest parametrów ($1, $2, $3...)
   - Sprawdzić mapowanie: kolumna → parametr → wartość
   - Zweryfikować czy kolejność jest zgodna

3. ✅ **Sprawdzić istniejące wartości**
   - Jakie wartości są przekazywane do każdego parametru
   - Czy typy danych są zgodne (string, number, null)
   - Czy są użyte COALESCE, NULL checks, itp.

4. ✅ **Znaleźć wszystkie podobne miejsca**
   - Jeśli zmieniam INSERT w jednym miejscu, szukam wszystkich INSERT
   - Jeśli zmieniam UPDATE, szukam wszystkich UPDATE
   - Sprawdzam czy wszystkie miejsca wymagają tej samej zmiany

---

### **KROK 2: PLANOWANIE ZMIAN**

**PRZED wprowadzeniem zmian MUSZĘ:**

1. ✅ **Ustalić dokładny plan**
   - Lista wszystkich miejsc do zmiany
   - Dokładna kolejność parametrów dla każdego miejsca
   - Mapowanie kolumna → parametr → wartość dla każdego miejsca

2. ✅ **Zweryfikować kolejność parametrów**
   - Jeśli dodaję kolumnę w środku: czy muszę zmienić numery następnych parametrów?
   - Jeśli dodaję na końcu: czy dodaję kolejny numer ($N+1)?
   - Czy kolejność VALUES odpowiada kolejności kolumn?

3. ✅ **Sprawdzić backward compatibility**
   - Czy istniejące dane będą działać?
   - Czy użycie COALESCE chroni przed nadpisaniem NULL?
   - Czy brakujące wartości są obsłużone (NULL checks)?

4. ✅ **Przewidzieć konsekwencje**
   - Co się stanie jeśli wartość jest NULL?
   - Co się stanie jeśli tabela nie istnieje?
   - Co się stanie jeśli JOIN zwróci pusty wynik?
   - Co się stanie jeśli typ danych jest nieprawidłowy?

---

### **KROK 3: WERYFIKACJA MAPOWANIA**

**Dla każdego SQL statement MUSZĘ sprawdzić:**

```
KOLUMNA W INSERT/UPDATE          PARAMETR W VALUES/SET          WARTOŚĆ W TABLICY
─────────────────────────────────────────────────────────────────────────────────
order_number                    $1                            orderData.order_number
external_id                     $2                            externalId
...                             ...                           ...
notes                           $17                           orderData.notes
parts_used                      $18                           partsUsed          ← NOWE
completed_at                    $19                           completedAt        ← NOWE
assigned_user_id                $20                           assignedUser...    ← ISTNIEJĄCE
```

**Zasady:**
- ✅ Kolejność kolumn w INSERT = kolejność parametrów w VALUES
- ✅ Kolejność parametrów w VALUES = kolejność wartości w tablicy
- ✅ Jeśli dodaję kolumnę przed ostatnią → muszę przesunąć numery następnych parametrów
- ✅ Jeśli dodaję kolumnę na końcu → dodaję kolejny numer parametru

---

### **KROK 4: CHECKLISTA PRZED WPISANIEM KODU**

**MUSZĘ odpowiedzieć TAK na wszystkie pytania:**

- [ ] Czy przeczytałem cały fragment kodu który zmieniam?
- [ ] Czy zrozumiałem jak działa istniejący kod?
- [ ] Czy policzyłem wszystkie parametry SQL?
- [ ] Czy sprawdziłem mapowanie kolumna → parametr → wartość?
- [ ] Czy zweryfikowałem kolejność parametrów?
- [ ] Czy znalazłem wszystkie podobne miejsca?
- [ ] Czy mam plan dla wszystkich miejsc?
- [ ] Czy przewidziałem konsekwencje zmian?
- [ ] Czy sprawdziłem backward compatibility?
- [ ] Czy zweryfikowałem obsługę błędów (try/catch, NULL checks)?

---

### **KROK 5: WERYFIKACJA PO WPROWADZENIU ZMIAN**

**PO wprowadzeniu zmian MUSZĘ:**

1. ✅ **Sprawdzić czy kolejność parametrów jest zgodna**
   - Porównać kolumny w INSERT z parametrami w VALUES
   - Porównać parametry w VALUES z wartościami w tablicy
   - Sprawdzić czy numery parametrów są ciągłe ($1, $2, $3...)

2. ✅ **Sprawdzić czy wszystkie miejsca zostały zmienione**
   - Jeśli zmieniam INSERT w jednym miejscu, czy zmieniłem wszystkie INSERT?
   - Jeśli zmieniam UPDATE, czy zmieniłem wszystkie UPDATE?
   - Czy wszystkie miejsca mają tę samą strukturę?

3. ✅ **Sprawdzić czy nie wprowadziłem błędów składniowych**
   - Czy wszystkie nawiasy są zamknięte?
   - Czy wszystkie przecinki są na miejscu?
   - Czy SQL jest poprawny?

4. ✅ **Uruchomić linter**
   - Sprawdzić czy nie ma błędów składniowych
   - Sprawdzić czy nie ma ostrzeżeń

---

## 🚫 ZAKAZANE CZYNNOŚCI

**NIGDY NIE WOLNO:**

1. ❌ Wprowadzać zmian bez przeczytania istniejącego kodu
2. ❌ Zmieniać kolejności parametrów bez uzasadnienia
3. ❌ Używać różnych numerów parametrów w różnych miejscach dla tej samej kolumny
4. ❌ Dodawać parametrów bez sprawdzenia czy nie kolidują z istniejącymi
5. ❌ Pomijać weryfikacji mapowania kolumna → parametr → wartość
6. ❌ Wprowadzać zmian "na ślepo" bez planu

---

## ✅ PRZYKŁAD DOBREJ WERYFIKACJI

### **Przed zmianą:**

**Istniejący kod:**
```sql
INSERT INTO service_orders (
  order_number, external_id, ..., notes, assigned_user_id
) VALUES ($1, $2, ..., $17, $18)
```

**Wartości:**
```javascript
[
  orderData.order_number,  // $1
  externalId,               // $2
  ...
  orderData.notes,         // $17
  assignedUserResolved      // $18
]
```

**Weryfikacja:**
- ✅ Kolumny: 18 kolumn (order_number, external_id, ..., notes, assigned_user_id)
- ✅ Parametry: $1-$18 (18 parametrów)
- ✅ Wartości: 18 wartości w tablicy
- ✅ Mapowanie: $18 → assigned_user_id → assignedUserResolved ✅

### **Plan zmiany:**

**Chcę dodać:** `parts_used`, `completed_at` przed `assigned_user_id`

**Nowa struktura:**
```sql
INSERT INTO service_orders (
  order_number, external_id, ..., notes, parts_used, completed_at, assigned_user_id
) VALUES ($1, $2, ..., $17, $18, $19, $20)
```

**Nowe wartości:**
```javascript
[
  orderData.order_number,  // $1
  externalId,               // $2
  ...
  orderData.notes,         // $17
  partsUsed,                // $18 (NOWE)
  completedAt,              // $19 (NOWE)
  assignedUserResolved      // $20 (było $18, teraz $20)
]
```

**Weryfikacja:**
- ✅ Kolumny: 20 kolumn (dodano 2, ostatnia przesunęła się)
- ✅ Parametry: $1-$20 (dodano 2 parametry)
- ✅ Wartości: 20 wartości w tablicy (dodano 2 wartości)
- ✅ Mapowanie: $18→parts_used, $19→completed_at, $20→assigned_user_id ✅

---

## 📋 SZABLON WERYFIKACJI

**Przed każdą zmianą SQL wypełnij:**

```
PLIK: _______________________
LINIA: ______________________

ISTNIEJĄCY KOD:
- Kolumny w INSERT/UPDATE: _______________________
- Parametry w VALUES/SET: _______________________
- Wartości w tablicy: _______________________
- Mapowanie: _______________________

PLAN ZMIANY:
- Co dodaję: _______________________
- Gdzie dodaję: _______________________
- Nowe kolumny: _______________________
- Nowe parametry: _______________________
- Nowe wartości: _______________________
- Nowe mapowanie: _______________________

WERYFIKACJA:
- [ ] Kolejność kolumn = kolejność parametrów?
- [ ] Kolejność parametrów = kolejność wartości?
- [ ] Wszystkie numery parametrów są ciągłe?
- [ ] Nie ma konfliktów z istniejącymi parametrami?
- [ ] Backward compatibility zachowana?
```

---

## 🎯 ZASADA ZŁOTA

**"Nigdy nie zmieniaj kodu bez pełnego zrozumienia istniejącej struktury"**

Przed każdą zmianą:
1. PRZECZYTAJ
2. ZROZUM
3. ZWERYFIKUJ
4. ZAPLANUJ
5. DOPIERO WTEDY ZMIEŃ


