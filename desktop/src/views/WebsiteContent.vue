<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h1>Zarządzanie treścią strony WWW</h1>
        <p>
          Edytuj lewą kolumnę landing page (hero, kafelki usług, wyróżniki). Zmiany po zapisaniu zostaną wysłane na Railway,
          a lokalna kopia posłuży jako cache offline.
        </p>
      </div>
      <div class="page__actions">
        <button class="btn btn--ghost" :disabled="saving || loading" @click="resetToDefault">
          Przywróć domyślne
        </button>
        <button class="btn btn--primary" :disabled="saving || loading" @click="saveContent">
          <span v-if="saving">Zapisywanie…</span>
          <span v-else>Zapisz zmiany</span>
        </button>
      </div>
    </header>

    <section v-if="successMessage" class="alert alert--success">
      {{ successMessage }}
    </section>

    <section v-if="errorMessage" class="alert alert--error">
      {{ errorMessage }}
    </section>

    <section v-if="meta.updatedAt" class="meta">
      <span>Ostatnia aktualizacja: {{ formatDate(meta.updatedAt) }}</span>
      <span>Źródło danych: {{ metaSourceLabel }}</span>
    </section>

    <section class="card" v-if="loading">
      <p>Ładowanie treści…</p>
    </section>

    <section class="card" v-else>
      <h2>Hero & nagłówek</h2>
      <div class="grid grid--two">
        <label class="field">
          <span class="field__label">Kicker (małe hasło nad tytułem)</span>
          <input v-model="content.hero.kicker" type="text" placeholder="Serwis ekologicznych instalacji" />
        </label>
        <label class="field">
          <span class="field__label">Tytuł</span>
          <input v-model="content.hero.title" type="text" placeholder="Instalacje wod-kan i kotłownie bez przestojów" />
        </label>
      </div>
      <label class="field">
        <span class="field__label">Podtytuł</span>
        <input v-model="content.hero.subtitle" type="text" placeholder="Mobilny serwis 24/7 dla domów i firm" />
      </label>
      <label class="field">
        <span class="field__label">Opis</span>
        <textarea v-model="content.hero.description" rows="3" placeholder="Opis skrótowy na hero…"></textarea>
      </label>

      <div class="grid grid--two">
        <label class="field">
          <span class="field__label">CTA – etykieta</span>
          <input v-model="content.hero.cta.label" type="text" placeholder="Zgłoś wizytę serwisu" />
        </label>
        <label class="field">
          <span class="field__label">CTA – opis</span>
          <input v-model="content.hero.cta.subLabel" type="text" placeholder="Formularz w 3 krokach – bez dzwonienia" />
        </label>
      </div>

      <div class="logo-upload">
        <span class="field__label">Logo (zamieni literowe „IS” w hero)</span>
        <div v-if="content.hero.logo" class="logo-upload__preview">
          <img :src="content.hero.logo" alt="Podgląd logo" />
          <button class="btn btn--small" type="button" @click="removeLogo">Usuń logo</button>
        </div>
        <input
          ref="logoInputRef"
          class="logo-upload__input"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          @change="handleLogoChange"
        />
        <p class="logo-upload__hint">Obsługiwane formaty: PNG, JPG, SVG lub WEBP (do 400 kB).</p>
        <p v-if="logoError" class="logo-upload__error">{{ logoError }}</p>
      </div>

      <div class="section-group">
        <div class="section-group__header">
          <h3>Statystyki</h3>
          <button class="btn btn--ghost" type="button" @click="addHeroStat">Dodaj statystykę</button>
        </div>
        <div class="list">
          <div
            v-for="(item, index) in content.hero.stats"
            :key="'stat-' + index"
            class="list-item list-item--stat"
          >
            <div class="stat-row">
              <label class="field">
                <span class="field__label">Typ kafelka</span>
                <select v-model="item.type" @change="handleStatTypeChange(index)">
                  <option value="text">Tekst</option>
                  <option value="image">Obraz</option>
                </select>
              </label>
              <button class="btn btn--small" type="button" @click="removeHeroStat(index)">Usuń</button>
            </div>

            <template v-if="item.type === 'image'">
              <div class="stats-upload">
                <div v-if="item.image" class="stats-upload__preview">
                  <img :src="item.image" alt="Podgląd statystyki" />
                  <button class="btn btn--small" type="button" @click="clearStatImage(index)">Usuń obraz</button>
                </div>
                <input
                  class="stats-upload__input"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  @change="handleStatImageChange(index, $event)"
                />
                <p class="stats-upload__hint">Sugerowane ~300×300 px, maks. ~90 KB po kompresji.</p>
                <p v-if="item._error" class="stats-upload__error">{{ item._error }}</p>
              </div>

              <label class="field">
                <span class="field__label">Tekst alternatywny (ALT)</span>
                <input v-model="item.alt" type="text" placeholder="Opis grafiki dla czytników" />
              </label>
              <label class="field">
                <span class="field__label">Tekst główny (fallback)</span>
                <input v-model="item.value" type="text" placeholder="1200+" />
              </label>
              <label class="field">
                <span class="field__label">Opis (fallback / podpis)</span>
                <input v-model="item.label" type="text" placeholder="Zleceń rocznie" />
              </label>
            </template>

            <template v-else>
              <label class="field">
                <span class="field__label">Wartość</span>
                <input v-model="item.value" type="text" placeholder="1200+" />
              </label>
              <label class="field">
                <span class="field__label">Opis</span>
                <input v-model="item.label" type="text" placeholder="Zleceń rocznie" />
              </label>
            </template>
          </div>
        </div>

        <div class="section-group">
          <label class="field">
            <span class="field__label">Animacja statystyk</span>
            <select v-model="content.hero.statsAnimation">
              <option value="none">Brak animacji</option>
              <option value="marquee">Przewijanie (marquee)</option>
            </select>
          </label>
          <p class="section-group__hint">
            Przy animacji kafelki przesuwają się w poziomie w pętli. Zatrzymują się po najechaniu kursorem lub przy
            preferencjach „reduced motion”.
          </p>
        </div>
      </div>

      <div class="section-group">
        <div class="section-group__header">
          <h3>Odznaki (badges)</h3>
          <button class="btn btn--ghost" type="button" @click="addHeroBadge">Dodaj odznakę</button>
        </div>
        <div class="list">
          <div v-for="(badge, index) in content.hero.badges" :key="'badge-' + index" class="list-item list-item--columns">
            <label class="field">
              <span class="field__label">Ikona (skrót np. leaf)</span>
              <input v-model="badge.icon" type="text" placeholder="leaf" />
            </label>
            <label class="field">
              <span class="field__label">Etykieta</span>
              <input v-model="badge.label" type="text" placeholder="Eco-friendly" />
            </label>
            <label class="field">
              <span class="field__label">Opis</span>
              <input v-model="badge.description" type="text" placeholder="Krótki opis odznaki" />
            </label>
            <button class="btn btn--small" type="button" @click="removeHeroBadge(index)">Usuń</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card" v-if="!loading">
      <div class="section-group section-group--header">
        <div>
          <h2>Wyróżniki (sekcja „Dlaczego my”)</h2>
          <p class="section-group__hint">Te bloki pojawiają się w lewej kolumnie landing page pod kafelkami usług.</p>
        </div>
        <button class="btn btn--ghost" type="button" @click="addHighlight">Dodaj wyróżnik</button>
      </div>
      <div class="list">
        <div v-for="(item, index) in content.highlights" :key="'highlight-' + index" class="list-item list-item--columns">
          <label class="field">
            <span class="field__label">Tytuł</span>
            <input v-model="item.title" type="text" placeholder="Stały opiekun techniczny" />
          </label>
          <label class="field">
            <span class="field__label">Opis</span>
            <input v-model="item.description" type="text" placeholder="Jedna osoba odpowiada za Twoją instalację." />
          </label>
          <button class="btn btn--small" type="button" @click="removeHighlight(index)">Usuń</button>
        </div>
      </div>
    </section>

    <section class="card" v-if="!loading">
      <div class="section-group section-group--header">
        <div>
          <h2>Lista usług (kafelki)</h2>
          <p class="section-group__hint">Kafelki wyświetlają się w landing page oraz w formularzu (krok 1).</p>
        </div>
        <button class="btn btn--ghost" type="button" @click="addService">Dodaj usługę</button>
      </div>
      <div class="services">
        <aside class="services__list">
          <button
            v-for="service in content.services"
            :key="service.id"
            type="button"
            :class="['services__item', service.id === selectedServiceId ? 'is-active' : '']"
            @click="selectService(service.id)"
          >
            <strong>{{ service.name || 'Bez nazwy' }}</strong>
            <span>{{ service.shortDescription || 'Brak opisu' }}</span>
          </button>
        </aside>
        <div class="services__editor" v-if="currentService">
          <div class="services__editor-head">
            <h3>Edytujesz: {{ currentService.name || currentService.id }}</h3>
            <button class="btn btn--small" type="button" @click="removeService(currentService.id)">Usuń usługę</button>
          </div>
          <label class="field">
            <span class="field__label">ID (bez spacji – użyte w formularzu)</span>
            <input v-model="currentService.id" type="text" @blur="normalizeServiceId" />
          </label>
          <label class="field">
            <span class="field__label">Nazwa usługi</span>
            <input v-model="currentService.name" type="text" />
          </label>
          <label class="field">
            <span class="field__label">Krótki opis (widoczny na kafelku)</span>
            <textarea v-model="currentService.shortDescription" rows="2"></textarea>
          </label>
          <label class="field">
            <span class="field__label">Opis szczegółowy (modal + auto opis w formularzu)</span>
            <textarea v-model="currentService.detailedDescription" rows="4"></textarea>
          </label>
          <div class="grid grid--two">
            <label class="field">
              <span class="field__label">Ikona (droplet/flame/bolt/leaf/tools…)</span>
              <input v-model="currentService.icon" type="text" />
            </label>
            <label class="field">
              <span class="field__label">Typ zgłoszenia (awaria/przeglad/naprawa…)</span>
              <input v-model="currentService.requestType" type="text" />
            </label>
          </div>
          <label class="field">
            <span class="field__label">Powiąż z kategorią desktop (typ zlecenia)</span>
            <select v-model="currentService.desktopCategoryId" :disabled="serviceCategoriesLoading">
              <option value="">
                {{ serviceCategoriesLoading ? 'Ładowanie kategorii…' : '— Bez powiązania —' }}
              </option>
              <option
                v-for="category in topLevelCategories"
                :key="`desktop-category-${category.id}`"
                :value="String(category.id)"
              >
                {{ category.name }}<template v-if="category.code"> ({{ category.code }})</template>
              </option>
            </select>
            <p v-if="serviceCategoriesError" class="field__note field__note--error">
              {{ serviceCategoriesError }}
            </p>
            <p v-else class="field__note">
              Ustawienie spina usługę WWW z kategorią serwisową w desktopie.
            </p>
          </label>
          <label class="field">
            <span class="field__label">Lista punktów (jeden na linię)</span>
            <textarea v-model="serviceForm.bulletText" rows="5"></textarea>
          </label>
        </div>
        <div class="services__placeholder" v-else>
          <p>Wybierz usługę z listy, żeby rozpocząć edycję.</p>
        </div>
      </div>
    </section>

    <section class="card" v-if="!loading">
      <h2>Treści formularza zgłoszeniowego</h2>
      <div class="section-group">
        <div class="section-group__header">
          <h3>Kroki formularza</h3>
          <button class="btn btn--ghost" type="button" @click="addFormStep">Dodaj krok</button>
        </div>
        <div class="list list--two">
          <div v-for="(step, index) in content.form.steps" :key="'step-' + index" class="list-item">
            <label class="field">
              <span class="field__label">Tytuł kroku</span>
              <input v-model="step.title" type="text" placeholder="Wybierz zakres" />
            </label>
            <label class="field">
              <span class="field__label">Opis</span>
              <input v-model="step.description" type="text" placeholder="Zaznacz usługę i wskaż, co się dzieje." />
            </label>
            <button class="btn btn--small" type="button" @click="removeFormStep(index)">Usuń</button>
          </div>
        </div>
      </div>

      <div class="section-group">
        <div class="section-group__header">
          <h3>Powody zgłoszenia</h3>
          <button class="btn btn--ghost" type="button" @click="addReason">Dodaj powód</button>
        </div>
        <div class="chips">
          <span v-for="(reason, index) in content.form.reasons" :key="'reason-' + index" class="chip">
            {{ reason }}
            <button class="chip__remove" type="button" @click="removeReason(index)">×</button>
          </span>
        </div>
      </div>

      <div class="section-group">
        <div class="section-group__header">
          <h3>Opcje dostępności / terminu</h3>
          <button class="btn btn--ghost" type="button" @click="addAvailability">Dodaj opcję</button>
        </div>
        <div class="chips">
          <span
            v-for="(item, index) in content.form.availabilityOptions"
            :key="'availability-' + index"
            class="chip"
          >
            {{ item }}
            <button class="chip__remove" type="button" @click="removeAvailability(index)">×</button>
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import defaultContent from '../../../website/content/landing-default.json'

const API_BASE = 'http://localhost:5174'

const clone = (value) => JSON.parse(JSON.stringify(value ?? {}))

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const serviceCategories = ref([])
const serviceCategoriesLoading = ref(false)
const serviceCategoriesError = ref('')

const topLevelCategories = computed(() => {
  const items = Array.isArray(serviceCategories.value) ? [...serviceCategories.value] : []
  return items
    .filter((item) => item && (item.parent_id === null || item.parent_id === undefined))
    .sort((a, b) => {
      const sortA = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : 0
      const sortB = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : 0
      if (sortA !== sortB) return sortA - sortB
      const nameA = String(a?.name || '').toLowerCase()
      const nameB = String(b?.name || '').toLowerCase()
      return nameA.localeCompare(nameB, 'pl-PL')
    })
})

const meta = reactive({
  updatedAt: null,
  source: 'default'
})

const content = reactive({
  hero: {
    kicker: '',
    title: '',
    subtitle: '',
    description: '',
    logo: null,
    cta: {
      label: '',
      subLabel: ''
    },
    stats: [],
    badges: [],
    statsAnimation: 'none'
  },
  highlights: [],
  services: [],
  form: {
    steps: [],
    reasons: [],
    availabilityOptions: []
  }
})

const selectedServiceId = ref(null)
const serviceForm = reactive({ bulletText: '' })
const logoError = ref('')
const logoInputRef = ref(null)

const metaSourceLabel = computed(() => {
  if (meta.source === 'railway') return 'Railway (online)'
  if (meta.source === 'desktop-cache') return 'Kopia lokalna'
  return 'Domyślne'
})

const loadServiceCategories = async () => {
  serviceCategoriesLoading.value = true
  serviceCategoriesError.value = ''
  try {
    const cacheBust = `?t=${Date.now()}`
    const response = await fetch(`${API_BASE}/api/desktop/service-categories${cacheBust}`, {
      method: 'GET',
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const json = await response.json().catch(() => ({}))
    const rows = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : []
    const normalized = rows
      .map((item) => ({
        id: item?.id,
        code: item?.code ?? '',
        name: item?.name ?? '',
        parent_id: item?.parent_id ?? null,
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : 0,
        is_active: item?.is_active === undefined ? true : !!item.is_active
      }))
      .filter((item) => item.is_active !== false && item.id != null)
    serviceCategories.value = normalized
  } catch (error) {
    console.warn('[WebsiteContent] load service categories failed:', error)
    serviceCategories.value = []
    serviceCategoriesError.value = 'Nie udało się pobrać listy kategorii z desktopu.'
  } finally {
    serviceCategoriesLoading.value = false
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pl-PL')
  } catch (_) {
    return value
  }
}

const hydrateContent = (incoming) => {
  const base = clone(defaultContent)
  const input = incoming && typeof incoming === 'object' ? incoming : {}

  const hero = input.hero || {}
  const form = input.form || {}

  const baseStats = Array.isArray(base.hero?.stats) ? base.hero.stats : []
  const sourceStats =
    Array.isArray(hero.stats) && hero.stats.length
      ? hero.stats
      : baseStats

  return {
    hero: {
      kicker: hero.kicker ?? base.hero?.kicker ?? '',
      title: hero.title ?? base.hero?.title ?? '',
      subtitle: hero.subtitle ?? base.hero?.subtitle ?? '',
      description: hero.description ?? base.hero?.description ?? '',
      logo: hero.logo ?? base.hero?.logo ?? null,
      cta: {
        label: hero.cta?.label ?? base.hero?.cta?.label ?? '',
        subLabel: hero.cta?.subLabel ?? base.hero?.cta?.subLabel ?? ''
      },
      stats: sourceStats.map((item, index) => {
        const fallback = baseStats[index] || {}
        const raw = item || fallback || {}
        const type = String(raw.type || fallback.type || 'text').toLowerCase() === 'image' ? 'image' : 'text'
        const value = raw.value ?? fallback.value ?? ''
        const label = raw.label ?? fallback.label ?? ''
        const image = type === 'image' && typeof raw.image === 'string' ? raw.image : null
        const alt = type === 'image' ? raw.alt ?? fallback.alt ?? '' : ''
        return {
          type,
          value,
          label,
          image,
          alt,
          _error: ''
        }
      }),
      badges: Array.isArray(hero.badges)
        ? hero.badges.map((item) => ({
            icon: item?.icon ?? '',
            label: item?.label ?? '',
            description: item?.description ?? ''
          }))
        : clone(base.hero?.badges || []),
      statsAnimation:
        String(hero.statsAnimation || base.hero?.statsAnimation || 'none').toLowerCase() === 'marquee'
          ? 'marquee'
          : 'none'
    },
    highlights: Array.isArray(input.highlights)
      ? input.highlights.map((item) => ({
          title: item?.title ?? '',
          description: item?.description ?? ''
        }))
      : clone(base.highlights || []),
    services: Array.isArray(input.services)
      ? input.services.map((service) => {
          const rawCategoryId = service?.desktopCategoryId ?? service?.categoryId ?? null
          const normalizedCategoryId =
            rawCategoryId === null || rawCategoryId === undefined || rawCategoryId === ''
              ? ''
              : String(rawCategoryId).trim()
          return {
            id: service?.id ?? '',
            name: service?.name ?? '',
            shortDescription: service?.shortDescription ?? '',
            detailedDescription: service?.detailedDescription ?? '',
            bulletPoints: Array.isArray(service?.bulletPoints) ? service.bulletPoints : [],
            icon: service?.icon ?? 'tools',
            requestType: service?.requestType ?? 'awaria',
            desktopCategoryId: normalizedCategoryId
          }
        })
      : clone(base.services || []).map((service) => {
          const rawCategoryId = service?.desktopCategoryId ?? service?.categoryId ?? null
          const normalizedCategoryId =
            rawCategoryId === null || rawCategoryId === undefined || rawCategoryId === ''
              ? ''
              : String(rawCategoryId).trim()
          return {
            ...service,
            desktopCategoryId: normalizedCategoryId
          }
        }),
    form: {
      steps: Array.isArray(form.steps)
        ? form.steps.map((step) => ({
            title: step?.title ?? '',
            description: step?.description ?? ''
          }))
        : clone(base.form?.steps || []),
      reasons: Array.isArray(form.reasons)
        ? form.reasons.map((item) => item ?? '')
        : clone(base.form?.reasons || []),
      availabilityOptions: Array.isArray(form.availabilityOptions)
        ? form.availabilityOptions.map((item) => item ?? '')
        : clone(base.form?.availabilityOptions || [])
    }
  }
}

const MAX_LOGO_SIZE = 400 * 1024
const MAX_BASE64_LENGTH = 110 * 1024
const TARGET_MAX_DIMENSION = 340

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })

const loadImageElement = (source) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nie udało się zinterpretować obrazu.'))
    img.src = typeof source === 'string' ? source : ''
  })

const generateRasterLogo = async (dataUrl) => {
  let dimension = TARGET_MAX_DIMENSION
  let quality = 0.85

  const render = async () => {
    const img = await loadImageElement(dataUrl)
    const scale = Math.min(1, dimension / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)
    let encoded = canvas.toDataURL('image/webp', quality)
    if (encoded.length > MAX_BASE64_LENGTH) {
      encoded = canvas.toDataURL('image/jpeg', quality)
    }
    if (encoded.length > MAX_BASE64_LENGTH) {
      encoded = canvas.toDataURL('image/png')
    }
    return encoded
  }

  let encoded = await render()
  while (encoded.length > MAX_BASE64_LENGTH && dimension > 160) {
    dimension = Math.max(160, Math.round(dimension * 0.8))
    quality = Math.max(0.65, quality - 0.1)
    encoded = await render()
  }

  return encoded
}

const clearLogoInput = () => {
  if (logoInputRef.value) {
    logoInputRef.value.value = ''
  }
}

const handleLogoChange = async (event) => {
  logoError.value = ''
  const file = event.target?.files?.[0]
  if (!file) return

  if (file.size > MAX_LOGO_SIZE) {
    logoError.value = 'Plik jest zbyt duży. Maksymalny rozmiar to 400 kB.'
    clearLogoInput()
    return
  }

  const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowedMime.includes(file.type)) {
    logoError.value = 'Obsługiwane formaty: PNG, JPG, SVG lub WEBP.'
    clearLogoInput()
    return
  }

  try {
    let encoded = await readFileAsDataUrl(file)
    if (file.type !== 'image/svg+xml' && typeof encoded === 'string') {
      encoded = await generateRasterLogo(encoded)
    }

    if (typeof encoded !== 'string' || encoded.length > MAX_BASE64_LENGTH) {
      throw new Error('Logo po optymalizacji jest wciąż zbyt duże. Spróbuj mniejszego pliku (np. 320×320 px).')
    }

    content.hero.logo = encoded
  } catch (error) {
    console.error('[WebsiteContent] logo upload failed:', error)
    logoError.value = error?.message || 'Nie udało się wgrać logo. Spróbuj mniejszego pliku.'
    content.hero.logo = null
    clearLogoInput()
  }
}

const removeLogo = () => {
  content.hero.logo = null
  logoError.value = ''
  clearLogoInput()
}

const applyContent = (incoming) => {
  const mapped = hydrateContent(incoming)
  content.hero = mapped.hero
  content.highlights = mapped.highlights
  content.services = mapped.services
  content.form = mapped.form
  logoError.value = ''
  clearLogoInput()

  if (!content.services.length) {
    selectedServiceId.value = null
  } else if (!selectedServiceId.value || !content.services.find((item) => item.id === selectedServiceId.value)) {
    selectedServiceId.value = content.services[0].id
  }
}

const currentService = computed(() => content.services.find((service) => service.id === selectedServiceId.value) || null)

watch(currentService, (service) => {
  serviceForm.bulletText = service && Array.isArray(service.bulletPoints) ? service.bulletPoints.join('\n') : ''
}, { immediate: true })

watch(
  () => serviceForm.bulletText,
  (text) => {
    if (!currentService.value) return
    const points = String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    currentService.value.bulletPoints = points
  }
)

const selectService = (serviceId) => {
  selectedServiceId.value = serviceId
}

const normalizeServiceId = () => {
  if (!currentService.value) return
  const normalized = String(currentService.value.id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  currentService.value.id = normalized || `service-${Date.now()}`
}

const addHeroStat = () =>
  content.hero.stats.push({ type: 'text', value: '', label: '', image: null, alt: '', _error: '' })
const removeHeroStat = (index) => content.hero.stats.splice(index, 1)

const handleStatTypeChange = (index) => {
  const stat = content.hero.stats[index]
  if (!stat) return
  stat.type = stat.type === 'image' ? 'image' : 'text'
  if (stat.type === 'text') {
    stat.image = null
    stat.alt = ''
  }
  stat._error = ''
}

const handleStatImageChange = async (index, event) => {
  const stat = content.hero.stats[index]
  if (!stat) return
  stat._error = ''
  const file = event.target?.files?.[0]
  if (!file) return

  if (file.size > MAX_LOGO_SIZE) {
    stat._error = 'Plik jest zbyt duży. Maksymalny rozmiar to 400 kB.'
    event.target.value = ''
    return
  }

  const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowedMime.includes(file.type)) {
    stat._error = 'Obsługiwane formaty: PNG, JPG, SVG lub WEBP.'
    event.target.value = ''
    return
  }

  try {
    let encoded = await readFileAsDataUrl(file)
    if (file.type !== 'image/svg+xml' && typeof encoded === 'string') {
      encoded = await generateRasterLogo(encoded)
    }

    if (typeof encoded !== 'string' || encoded.length > MAX_BASE64_LENGTH) {
      throw new Error('Grafika po optymalizacji jest wciąż zbyt duża. Spróbuj mniejszego rozmiaru.')
    }

    stat.image = encoded
    stat.type = 'image'
    stat._error = ''
  } catch (error) {
    console.error('[WebsiteContent] stat image upload failed:', error)
    stat.image = null
    stat._error = error?.message || 'Nie udało się wgrać grafiki. Spróbuj mniejszego pliku.'
  } finally {
    event.target.value = ''
  }
}

const clearStatImage = (index) => {
  const stat = content.hero.stats[index]
  if (!stat) return
  stat.image = null
  stat._error = ''
}

const addHeroBadge = () => content.hero.badges.push({ icon: '', label: '', description: '' })
const removeHeroBadge = (index) => content.hero.badges.splice(index, 1)

const addHighlight = () => content.highlights.push({ title: '', description: '' })
const removeHighlight = (index) => content.highlights.splice(index, 1)

const addService = () => {
  const id = `custom-${Date.now()}`
  content.services.push({
    id,
    name: 'Nowa usługa',
    shortDescription: '',
    detailedDescription: '',
    bulletPoints: [],
    icon: 'tools',
    requestType: 'awaria',
    desktopCategoryId: ''
  })
  selectedServiceId.value = id
}

const removeService = (serviceId) => {
  const index = content.services.findIndex((service) => service.id === serviceId)
  if (index >= 0) content.services.splice(index, 1)
  if (!content.services.length) {
    selectedServiceId.value = null
  } else if (!content.services.find((item) => item.id === selectedServiceId.value)) {
    selectedServiceId.value = content.services[0].id
  }
}

const addFormStep = () => content.form.steps.push({ title: '', description: '' })
const removeFormStep = (index) => content.form.steps.splice(index, 1)

const addReason = () => content.form.reasons.push('Nowy powód zgłoszenia')
const removeReason = (index) => content.form.reasons.splice(index, 1)

const addAvailability = () => content.form.availabilityOptions.push('Nowa dostępność')
const removeAvailability = (index) => content.form.availabilityOptions.splice(index, 1)

const sanitizeArray = (array, mapper) =>
  (array || [])
    .map(mapper)
    .filter((item) => {
      if (typeof item === 'string') return item.trim().length > 0
      if (item && typeof item === 'object') {
        return Object.values(item).some((value) => String(value || '').trim())
      }
      return Boolean(item)
    })

const toDesktopCategoryId = (value) => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  if (Number.isInteger(numeric) && numeric > 0) return numeric
  return null
}

const preparePayload = () => {
  const payload = clone(content)

  payload.hero.kicker = String(payload.hero.kicker || '').trim()
  payload.hero.title = String(payload.hero.title || '').trim()
  payload.hero.subtitle = String(payload.hero.subtitle || '').trim()
  payload.hero.description = String(payload.hero.description || '').trim()
  const logoValue = typeof payload.hero.logo === 'string' ? payload.hero.logo.trim() : ''
  payload.hero.logo =
    logoValue && /^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/i.test(logoValue) ? logoValue : null
  payload.hero.cta = {
    label: String(payload.hero.cta?.label || '').trim(),
    subLabel: String(payload.hero.cta?.subLabel || '').trim()
  }

  payload.hero.statsAnimation =
    String(content.hero.statsAnimation || '').toLowerCase() === 'marquee' ? 'marquee' : 'none'

  payload.hero.stats = sanitizeArray(content.hero.stats, (item) => {
    const type = String(item?.type || 'text').toLowerCase() === 'image' ? 'image' : 'text'
    const value = String(item?.value || '').trim()
    const label = String(item?.label || '').trim()
    const stat = {
      type,
      value,
      label,
      image: null,
      alt: ''
    }
    if (type === 'image') {
      const image = typeof item?.image === 'string' ? item.image.trim() : ''
      stat.image = image || null
      stat.alt = String(item?.alt || '').trim()
    }
    return stat
  })

  payload.hero.badges = sanitizeArray(payload.hero.badges, (item) => ({
    icon: String(item?.icon || '').trim(),
    label: String(item?.label || '').trim(),
    description: String(item?.description || '').trim()
  }))

  payload.highlights = sanitizeArray(payload.highlights, (item) => ({
    title: String(item?.title || '').trim(),
    description: String(item?.description || '').trim()
  }))

  payload.services = sanitizeArray(payload.services, (service) => ({
    id:
      String(service?.id || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-') || `service-${Date.now()}`,
    name: String(service?.name || '').trim(),
    shortDescription: String(service?.shortDescription || '').trim(),
    detailedDescription: String(service?.detailedDescription || '').trim(),
    bulletPoints: Array.isArray(service?.bulletPoints)
      ? service.bulletPoints.map((point) => String(point || '').trim()).filter(Boolean)
      : [],
    icon: String(service?.icon || 'tools').trim(),
    requestType: String(service?.requestType || 'awaria').trim(),
    desktopCategoryId: toDesktopCategoryId(service?.desktopCategoryId)
  }))

  payload.form.steps = sanitizeArray(payload.form.steps, (step) => ({
    title: String(step?.title || '').trim(),
    description: String(step?.description || '').trim()
  }))
  payload.form.reasons = sanitizeArray(payload.form.reasons, (reason) => String(reason || '').trim())
  payload.form.availabilityOptions = sanitizeArray(
    payload.form.availabilityOptions,
    (option) => String(option || '').trim()
  )

  return payload
}

const loadContent = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`${API_BASE}/api/website/content`, { method: 'GET' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const json = await response.json()
    if (json?.success && json?.data?.content) {
      applyContent(json.data.content)
      meta.updatedAt = json.data.updatedAt || null
      meta.source = json.data.source || 'railway'
    } else {
      applyContent(defaultContent)
      meta.updatedAt = null
      meta.source = 'default'
    }
  } catch (error) {
    console.error('[WebsiteContent] load failed:', error)
    applyContent(defaultContent)
    meta.updatedAt = null
    meta.source = 'default'
    errorMessage.value = 'Nie udało się pobrać danych z Railway. Zastosowano domyślne wartości.'
  } finally {
    loading.value = false
  }
}

const saveContent = async () => {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const payload = preparePayload()
  try {
    const response = await fetch(`${API_BASE}/api/website/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: payload })
    })
    if (response.status === 413) {
      errorMessage.value =
        'Logo jest zbyt duże dla serwera Railway. Użyj pliku ok. 300×300 px (maks. ~90 KB po kompresji).'
      return
    }
    const json = await response.json().catch(() => ({}))
    if (!response.ok || !json?.success) {
      throw new Error(json?.error || `HTTP ${response.status}`)
    }
    meta.updatedAt = json.data?.updatedAt || new Date().toISOString()
    meta.source = 'railway'
    successMessage.value = 'Treść została zapisana i wysłana na Railway.'
  } catch (error) {
    console.error('[WebsiteContent] save failed:', error)
    errorMessage.value =
      error?.message?.includes('413')
        ? 'Logo jest zbyt duże dla serwera Railway. Użyj pliku ok. 300×300 px (maks. ~90 KB).'
        : 'Nie udało się zapisać zmian. Sprawdź połączenie z Railway i spróbuj ponownie.'
  } finally {
    saving.value = false
  }
}

const resetToDefault = () => {
  applyContent(defaultContent)
  meta.updatedAt = null
  meta.source = 'default'
  successMessage.value = 'Przywrócono domyślne treści. Zapisz, aby wysłać na Railway.'
  logoError.value = ''
  clearLogoInput()
}

onMounted(() => {
  loadServiceCategories()
  loadContent()
})
</script>

<style scoped>
.page {
  display: grid;
  gap: 24px;
  padding: 24px;
}

.page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page__header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.page__header p {
  margin: 8px 0 0;
  color: #475569;
  max-width: 640px;
}

.page__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 20px;
}

.card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.grid {
  display: grid;
  gap: 16px;
}

.grid--two {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.field input,
.field textarea,
.field select {
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  background: #f8fafc;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.6);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.field__note {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.field__note--error {
  color: #dc2626;
}

.section-group {
  display: grid;
  gap: 16px;
}

.section-group__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-group__header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.section-group__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.list {
  display: grid;
  gap: 12px;
}

.list--two {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.list-item {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.list-item--columns {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.services {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(200px, 240px) 1fr;
}

.services__list {
  display: grid;
  gap: 10px;
  align-content: start;
}

.services__item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f1f5f9;
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.services__item strong {
  font-size: 14px;
  color: #1f2937;
}

.services__item span {
  font-size: 12px;
  color: #64748b;
}

.services__item:hover {
  border-color: rgba(37, 99, 235, 0.4);
}

.services__item.is-active {
  background: rgba(37, 99, 235, 0.12);
  border-color: rgba(37, 99, 235, 0.6);
}

.services__editor {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 20px;
  background: #f8fafc;
  display: grid;
  gap: 16px;
}

.services__editor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.services__editor-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.services__placeholder {
  display: grid;
  place-content: center;
  padding: 32px;
  color: #64748b;
  background: #f8fafc;
  border: 1px dashed rgba(100, 116, 139, 0.4);
  border-radius: 16px;
}

.logo-upload {
  display: grid;
  gap: 10px;
}

.logo-upload__preview {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f1f5f9;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
}

.logo-upload__preview img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.logo-upload__input {
  font-size: 13px;
}

.logo-upload__hint {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.logo-upload__error {
  margin: 0;
  font-size: 13px;
  color: #b91c1c;
}

.list-item--stat {
  gap: 12px;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.stats-upload {
  display: grid;
  gap: 10px;
}

.stats-upload__input {
  font-size: 13px;
}

.stats-upload__hint {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.stats-upload__error {
  margin: 0;
  font-size: 13px;
  color: #b91c1c;
}

.stats-upload__preview {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f1f5f9;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
}

.stats-upload__preview img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 13px;
}

.chip__remove {
  border: none;
  background: transparent;
  font-size: 14px;
  color: inherit;
  cursor: pointer;
}

.meta {
  display: inline-flex;
  gap: 16px;
  font-size: 13px;
  color: #475569;
}

.alert {
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
}

.alert--success {
  background: rgba(22, 163, 74, 0.12);
  color: #047857;
  border: 1px solid rgba(22, 163, 74, 0.25);
}

.alert--error {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.25);
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}

.btn--ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.btn--small {
  padding: 6px 12px;
  font-size: 13px;
  background: rgba(15, 23, 42, 0.08);
}

@media (max-width: 960px) {
  .services {
    grid-template-columns: 1fr;
  }

  .services__list {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 640px) {
  .page {
    padding: 16px;
  }

  .card {
    padding: 18px;
  }

  .page__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

