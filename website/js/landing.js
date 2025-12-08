const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const escapeHtml = (input) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(input ?? '').replace(/[&<>"']/g, (char) => map[char] || char);
};

const state = {
  defaultContent: null,
  content: null,
  company: {
    phone: '',
    email: '',
    area: 'Wielkopolska'
  },
  steps: ['service', 'location', 'contact', 'summary'],
  stepIndex: 0,
  selectedServiceId: null,
  selectedReason: null,
  selectedAvailability: null,
  modals: {
    service: null
  },
  submitting: false,
  form: {
    description: '',
    deviceType: '',
    deviceBrand: '',
    deviceModel: '',
    street: '',
    postalCode: '',
    city: '',
    directions: '',
    preferredTime: '',
    clientType: 'individual',
    firstName: '',
    lastName: '',
    companyName: '',
    contactFirstName: '',
    contactLastName: '',
    phone: '',
    email: '',
    nip: '',
    existingClient: false,
    urgent: false,
    privacyPolicy: false
  }
};

const elements = {
  infoColumn: document.querySelector('[data-info-column]'),
  heroLogoWrapper: document.querySelector('[data-hero-logo]'),
  heroLogoImg: document.querySelector('[data-hero-logo-img]'),
  heroInitials: document.querySelector('[data-hero-initials]'),
  heroKicker: document.querySelector('[data-hero-kicker]'),
  heroTitle: document.querySelector('[data-hero-title]'),
  heroSubtitle: document.querySelector('[data-hero-subtitle]'),
  heroDescription: document.querySelector('[data-hero-description]'),
  heroStats: document.querySelector('[data-hero-stats]'),
  heroBadges: document.querySelector('[data-hero-badges]'),
  heroCta: document.querySelector('[data-hero-cta]'),
  servicesGrid: document.querySelector('[data-services-grid]'),
  highlights: document.querySelector('[data-highlights]'),
  serviceOptions: document.querySelector('[data-service-options]'),
  reasonOptions: document.querySelector('[data-reason-options]'),
  availabilityOptions: document.querySelector('[data-availability-options]'),
  steps: document.querySelector('[data-steps]'),
  form: document.querySelector('.service-form'),
  stepNodes: Array.from(document.querySelectorAll('.form-step')),
  prevBtn: document.querySelector('[data-btn-prev]'),
  nextBtn: document.querySelector('[data-btn-next]'),
  submitBtn: document.querySelector('[data-btn-submit]'),
  successCard: document.querySelector('[data-success]'),
  newRequestBtn: document.querySelector('[data-btn-new]'),
  summary: document.querySelector('[data-summary]'),
  descriptionField: document.querySelector('[data-field-description]'),
  deviceTypeField: document.querySelector('[data-field-device-type]'),
  deviceBrandField: document.querySelector('[data-field-device-brand]'),
  deviceModelField: document.querySelector('[data-field-device-model]'),
  streetField: document.querySelector('[data-field-street]'),
  postalField: document.querySelector('[data-field-postal]'),
  cityField: document.querySelector('[data-field-city]'),
  directionsField: document.querySelector('[data-field-directions]'),
  preferredField: document.querySelector('[data-field-preferred]'),
  clientTypeRadios: Array.from(document.querySelectorAll('[data-field-client-type]')),
  firstNameField: document.querySelector('[data-field-first-name]'),
  lastNameField: document.querySelector('[data-field-last-name]'),
  companyNameField: document.querySelector('[data-field-company-name]'),
  contactFirstField: document.querySelector('[data-field-contact-first]'),
  contactLastField: document.querySelector('[data-field-contact-last]'),
  phoneField: document.querySelector('[data-field-phone]'),
  emailField: document.querySelector('[data-field-email]'),
  nipField: document.querySelector('[data-field-nip]'),
  existingField: document.querySelector('[data-field-existing]'),
  urgentField: document.querySelector('[data-field-urgent]'),
  policyField: document.querySelector('[data-field-policy]'),
  individualSection: document.querySelector('[data-section-individual]'),
  businessSections: Array.from(document.querySelectorAll('[data-section-business]')),
  serviceModal: document.querySelector('[data-service-modal]'),
  modalContent: document.querySelector('[data-modal-content]'),
  toast: document.querySelector('[data-toast]'),
  companyPhone: document.querySelector('[data-company-phone]'),
  companyPhoneInline: document.querySelector('[data-company-phone-inline]'),
  companyEmail: document.querySelector('[data-company-email]'),
  companyArea: document.querySelector('[data-company-area]')
};

const ICONS = {
  droplet: '💧',
  flame: '🔥',
  bolt: '⚡',
  leaf: '🌿',
  tools: '🛠',
  waves: '🌊',
  snow: '❄️',
  shield: '🛡️'
};

const showToast = (message, options = {}) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.style.background = options.variant === 'error'
    ? 'rgba(220, 53, 69, 0.95)'
    : 'rgba(30, 140, 99, 0.95)';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, options.duration || 3200);
};

const closeModal = () => {
  if (!elements.serviceModal) return;
  elements.serviceModal.hidden = true;
  elements.modalContent.innerHTML = '';
};

const openModal = (service) => {
  if (!elements.serviceModal || !service) return;
  const bullets = (service.bulletPoints || []).map((item) => `<li>${item}</li>`).join('');
  elements.modalContent.innerHTML = `
    <h3>${service.name}</h3>
    <p>${service.detailedDescription || service.shortDescription || ''}</p>
    ${bullets ? `<ul class="modal__list">${bullets}</ul>` : ''}
  `;
  elements.serviceModal.hidden = false;
};

const mapContent = (incoming) => {
  if (!incoming || typeof incoming !== 'object') return clone(state.defaultContent);

  const safe = clone(state.defaultContent);
  try {
    if (incoming.hero) {
      safe.hero = {
        ...safe.hero,
        ...incoming.hero,
        stats: Array.isArray(incoming.hero.stats) ? incoming.hero.stats : safe.hero.stats,
        badges: Array.isArray(incoming.hero.badges) ? incoming.hero.badges : safe.hero.badges,
        cta: incoming.hero.cta ? { ...safe.hero.cta, ...incoming.hero.cta } : safe.hero.cta
      };
    }
    if (Array.isArray(incoming.highlights)) {
      safe.highlights = incoming.highlights;
    }
    if (Array.isArray(incoming.services)) {
      safe.services = incoming.services.map((service) => ({
        ...service,
        bulletPoints: Array.isArray(service.bulletPoints) ? service.bulletPoints : []
      }));
    }
    if (incoming.form) {
      safe.form = {
        ...safe.form,
        ...incoming.form,
        steps: Array.isArray(incoming.form.steps) ? incoming.form.steps : safe.form.steps,
        reasons: Array.isArray(incoming.form.reasons) ? incoming.form.reasons : safe.form.reasons,
        availabilityOptions: Array.isArray(incoming.form.availabilityOptions)
          ? incoming.form.availabilityOptions
          : safe.form.availabilityOptions,
        brandOptions: Array.isArray(incoming.form.brandOptions) && incoming.form.brandOptions.length
          ? incoming.form.brandOptions
          : safe.form.brandOptions
      };
    }
  } catch (error) {
    console.warn('[landing] mapContent fallback:', error);
  }
  return safe;
};

const renderHero = () => {
  const hero = state.content?.hero;
  if (!hero) return;

  if (elements.heroKicker) {
    elements.heroKicker.textContent = hero.kicker || '';
  }
  if (elements.heroTitle) {
    elements.heroTitle.textContent = hero.title || 'Instalacje Serwis';
  }

  if (elements.heroSubtitle) {
    elements.heroSubtitle.textContent = hero.subtitle || '';
  }
  if (elements.heroDescription) {
    elements.heroDescription.textContent = hero.description || '';
  }
  if (elements.heroCta) {
    const label = hero.cta?.label || 'Zgłoś wizytę serwisu';
    const subLabel = hero.cta?.subLabel || 'Szybki formularz bez dzwonienia';
    elements.heroCta.innerHTML = `<strong>${label}</strong><span>${subLabel}</span>`;
  }

  const computeInitials = (value) => {
    if (!value || typeof value !== 'string') return 'IS';
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'IS';
    const letters = words.slice(0, 2).map((word) => word.charAt(0));
    const initials = letters.join('').toUpperCase();
    return initials || 'IS';
  };

  if (hero.logo && typeof hero.logo === 'string') {
    if (elements.heroLogoImg) {
      elements.heroLogoImg.src = hero.logo;
      elements.heroLogoImg.alt = hero.title || 'Logo firmy';
    }
    if (elements.heroLogoWrapper) {
      elements.heroLogoWrapper.hidden = false;
    }
    if (elements.heroInitials) {
      elements.heroInitials.hidden = true;
    }
  } else {
    if (elements.heroLogoWrapper) {
      elements.heroLogoWrapper.hidden = true;
    }
    if (elements.heroInitials) {
      elements.heroInitials.hidden = false;
      elements.heroInitials.textContent = computeInitials(hero.kicker || hero.title || 'IS');
    }
  }

  if (elements.heroStats) {
    const stats = Array.isArray(hero.stats) ? hero.stats : [];
    const animation = String(hero.statsAnimation || 'none').toLowerCase() === 'marquee' ? 'marquee' : 'none';
    const renderStat = (item, index) => {
      const type = String(item?.type || '').toLowerCase() === 'image' ? 'image' : 'text';
      const value = escapeHtml(item?.value || '');
      const label = escapeHtml(item?.label || '');
      if (type === 'image' && item?.image) {
        const alt = escapeHtml(item?.alt || label || value || `Statystyka ${index + 1}`);
        return `
          <div class="brand-stat brand-stat--image">
            <span class="brand-stat__image">
              <img src="${item.image}" alt="${alt}" loading="lazy" />
            </span>
          </div>
        `;
      }
      return `
        <div class="brand-stat brand-stat--text">
          <div class="brand-stat__value">${value}</div>
          <p class="brand-stat__label">${label}</p>
        </div>
      `;
    };

    elements.heroStats.classList.toggle('brand-stats--marquee', animation === 'marquee' && stats.length > 0);
    if (!stats.length) {
      elements.heroStats.innerHTML = '';
    } else if (animation === 'marquee') {
      const trackContent = stats.map((item, index) => renderStat(item, index)).join('');
      elements.heroStats.innerHTML = `<div class="brand-stats__track">${trackContent}${trackContent}</div>`;
    } else {
      elements.heroStats.innerHTML = stats.map((item, index) => renderStat(item, index)).join('');
    }
  }
  if (elements.heroBadges) {
    elements.heroBadges.innerHTML = (hero.badges || []).map((badge) => `
      <span class="brand-badge">
        ${badge.icon ? `${ICONS[badge.icon] || ''}` : '✅'}
        ${badge.label || ''}
      </span>
    `).join('');
  }
};

const renderServices = () => {
  const services = state.content?.services || [];
  if (elements.servicesGrid) {
    elements.servicesGrid.innerHTML = services.map((service) => `
      <article class="service-card" data-service="${service.id}">
        <span class="service-card__icon">${ICONS[service.icon] || '🛠'}</span>
        <div>
          <h3 class="service-card__title">${service.name}</h3>
          <p class="service-card__subtitle">${service.shortDescription || ''}</p>
        </div>
        <span class="service-card__arrow">···</span>
      </article>
    `).join('');

    elements.servicesGrid.querySelectorAll('.service-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.service;
        const service = services.find((item) => item.id === id);
        if (service) {
          selectService(service.id);
        }
        openModal(service);
      });
    });
  }

  if (elements.serviceOptions) {
    elements.serviceOptions.innerHTML = services.map((service) => `
      <label class="option-chip" data-service-option="${service.id}">
        <input type="radio" name="serviceType" value="${service.id}" />
        <span>${service.name}</span>
      </label>
    `).join('');

    elements.serviceOptions.querySelectorAll('[data-service-option]').forEach((option) => {
      option.addEventListener('click', () => {
        selectService(option.dataset.serviceOption);
      });
    });

    if (!state.selectedServiceId && services.length) {
      selectService(services[0].id);
    } else if (state.selectedServiceId) {
      updateOptionSelection(elements.serviceOptions, '[data-service-option]', state.selectedServiceId);
    }
  }
};

const renderHighlights = () => {
  if (!elements.highlights) return;
  elements.highlights.innerHTML = (state.content?.highlights || []).map((item) => `
    <article class="highlight-card">
      <h3>${item.title}</h3>
      <p>${item.description || ''}</p>
    </article>
  `).join('');
};

const renderReasons = () => {
  if (!elements.reasonOptions) return;
  elements.reasonOptions.innerHTML = (state.content?.form?.reasons || []).map((reason) => `
    <label class="option-chip" data-reason-option="${reason}">
      <input type="radio" name="reason" value="${reason}" />
      <span>${reason}</span>
    </label>
  `).join('');

  elements.reasonOptions.querySelectorAll('[data-reason-option]').forEach((option) => {
    option.addEventListener('click', () => {
      state.selectedReason = option.dataset.reasonOption;
      updateOptionSelection(elements.reasonOptions, '[data-reason-option]', state.selectedReason);
      updateSummary();
    });
  });
};

const renderAvailabilityOptions = () => {
  if (!elements.availabilityOptions) return;
  elements.availabilityOptions.innerHTML = (state.content?.form?.availabilityOptions || []).map((label) => `
    <label class="option-chip" data-availability-option="${label}">
      <input type="radio" name="availability" value="${label}" />
      <span>${label}</span>
    </label>
  `).join('');

  elements.availabilityOptions.querySelectorAll('[data-availability-option]').forEach((option) => {
    option.addEventListener('click', () => {
      state.selectedAvailability = option.dataset.availabilityOption;
      updateOptionSelection(elements.availabilityOptions, '[data-availability-option]', state.selectedAvailability);
      updateSummary();
    });
  });
};

const renderBrandOptions = () => {
  if (!elements.deviceBrandField) return;
  const select = elements.deviceBrandField;
  const brands = Array.isArray(state.content?.form?.brandOptions) ? state.content.form.brandOptions : [];
  const uniqueBrands = [];
  brands.forEach((brand) => {
    if (typeof brand === 'string') {
      const trimmed = brand.trim();
      if (trimmed && !uniqueBrands.includes(trimmed)) {
        uniqueBrands.push(trimmed);
      }
    }
  });
  const previous = state.form.deviceBrand || select.value;
  const options = ['<option value="">Wybierz markę</option>'];
  uniqueBrands.forEach((brand) => {
    options.push(`<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`);
  });
  if (previous && previous.trim() && !uniqueBrands.includes(previous.trim())) {
    options.push(`<option value="${escapeHtml(previous.trim())}">${escapeHtml(previous.trim())}</option>`);
  }
  select.innerHTML = options.join('');
  select.value = previous || '';
  if (previous && select.value !== previous) {
    select.value = '';
  }
  state.form.deviceBrand = select.value || '';
};

const updateClientTypeUI = () => {
  collectFormState();
  const isBusiness = state.form.clientType === 'business';
  if (elements.individualSection) {
    elements.individualSection.hidden = isBusiness;
  }
  elements.businessSections.forEach((section) => {
    if (section) section.hidden = !isBusiness;
  });
  if (elements.firstNameField) {
    elements.firstNameField.required = !isBusiness;
  }
  if (elements.lastNameField) {
    elements.lastNameField.required = !isBusiness;
  }
  if (elements.companyNameField) {
    elements.companyNameField.required = isBusiness;
  }
  if (elements.contactFirstField) {
    elements.contactFirstField.required = false;
  }
  if (elements.contactLastField) {
    elements.contactLastField.required = false;
  }
  if (elements.nipField) {
    elements.nipField.required = isBusiness;
    elements.nipField.placeholder = isBusiness ? 'Wymagany dla firm' : 'Opcjonalnie';
  }
};

const buildStepIndicators = () => {
  if (!elements.steps) return;
  elements.steps.innerHTML = state.steps.map((step, index) => {
    const stepMeta = state.content?.form?.steps?.[index];
    const label = stepMeta?.title || `Krok ${index + 1}`;
    const desc = stepMeta?.description || '';
    return `
      <div class="step-indicator" data-step-indicator="${step}">
        <span class="step-indicator__circle">${index + 1}</span>
        <div>
          <strong>${label}</strong>
          <div>${desc}</div>
        </div>
      </div>
    `;
  }).join('');
};

const updateOptionSelection = (container, selector, value) => {
  if (!container) return;
  container.querySelectorAll(selector).forEach((node) => {
    const isSelected = node.dataset.serviceOption === value
      || node.dataset.reasonOption === value
      || node.dataset.availabilityOption === value;
    node.classList.toggle('is-selected', isSelected);
  });
};

const selectService = (serviceId) => {
  state.selectedServiceId = serviceId;
  updateOptionSelection(elements.serviceOptions, '[data-service-option]', serviceId);
  updateSummary();
};

const applyCompanyProfile = (data) => {
  if (!data) return;
  state.company.phone = data.phone || state.company.phone;
  state.company.email = data.email || state.company.email;
  state.company.area = data.address || state.company.area;

  if (elements.companyPhone) {
    elements.companyPhone.textContent = state.company.phone || '+48 000 000 000';
  }
  if (elements.companyPhoneInline) {
    elements.companyPhoneInline.textContent = state.company.phone || '+48 000 000 000';
  }
  if (elements.companyEmail) {
    elements.companyEmail.textContent = state.company.email || 'serwis@instalacjeserwis.pl';
  }
  if (elements.companyArea) {
    elements.companyArea.textContent = state.company.area || 'Wielkopolska';
  }
};

const updateNavigation = () => {
  const { stepIndex, steps } = state;
  if (elements.prevBtn) {
    elements.prevBtn.disabled = stepIndex === 0;
  }
  if (elements.nextBtn) {
    elements.nextBtn.hidden = stepIndex >= steps.length - 1;
  }
  if (elements.submitBtn) {
    elements.submitBtn.hidden = stepIndex < steps.length - 1;
    elements.submitBtn.disabled = state.submitting;
  }
  if (elements.steps) {
    elements.steps.querySelectorAll('[data-step-indicator]').forEach((indicator, index) => {
      indicator.classList.toggle('is-active', index === stepIndex);
      indicator.classList.toggle('is-complete', index < stepIndex);
    });
  }
  elements.stepNodes.forEach((node) => {
    node.classList.toggle('is-active', node.dataset.step === steps[stepIndex]);
  });
};

const collectFormState = () => {
  state.form.description = elements.descriptionField?.value?.trim() || '';
  state.form.deviceType = elements.deviceTypeField?.value?.trim() || '';
  state.form.deviceBrand = elements.deviceBrandField?.value?.trim() || '';
  state.form.deviceModel = elements.deviceModelField?.value?.trim() || '';
  state.form.street = elements.streetField?.value?.trim() || '';
  state.form.postalCode = elements.postalField?.value?.trim() || '';
  state.form.city = elements.cityField?.value?.trim() || '';
  state.form.directions = elements.directionsField?.value?.trim() || '';
  state.form.preferredTime = elements.preferredField?.value?.trim() || '';
  state.form.phone = elements.phoneField?.value?.trim() || '';
  state.form.email = elements.emailField?.value?.trim() || '';
  state.form.nip = elements.nipField?.value?.trim() || '';
  state.form.existingClient = !!elements.existingField?.checked;
  state.form.urgent = !!elements.urgentField?.checked;
  state.form.privacyPolicy = !!elements.policyField?.checked;
  state.form.clientType = elements.clientTypeRadios?.find(r => r.checked)?.value || 'individual';
  state.form.firstName = elements.firstNameField?.value?.trim() || '';
  state.form.lastName = elements.lastNameField?.value?.trim() || '';
  state.form.companyName = elements.companyNameField?.value?.trim() || '';
  state.form.contactFirstName = elements.contactFirstField?.value?.trim() || '';
  state.form.contactLastName = elements.contactLastField?.value?.trim() || '';
};

const validateStep = () => {
  collectFormState();
  const currentStep = state.steps[state.stepIndex];

  if (currentStep === 'service') {
    if (!state.selectedServiceId) {
      return { valid: false, message: 'Wybierz zakres prac.' };
    }
    if (!state.selectedReason) {
      return { valid: false, message: 'Wybierz powód zgłoszenia.' };
    }
    if (!state.form.deviceType) {
      return { valid: false, message: 'Wybierz typ urządzenia.' };
    }
    if (!state.form.deviceBrand) {
      return { valid: false, message: 'Wybierz markę urządzenia.' };
    }
    if (!state.form.description) {
      return { valid: false, message: 'Opisz krótko, co się dzieje.' };
    }
  }

  if (currentStep === 'location') {
    if (!state.form.street || !state.form.postalCode || !state.form.city) {
      return { valid: false, message: 'Wpisz pełny adres instalacji.' };
    }
    if (!state.selectedAvailability) {
      return { valid: false, message: 'Określ preferowany termin.' };
    }
  }

  if (currentStep === 'contact') {
    if (state.form.clientType === 'business') {
      if (!state.form.companyName) {
        return { valid: false, message: 'Podaj nazwę firmy.' };
      }
      if (!state.form.nip) {
        return { valid: false, message: 'Podaj NIP firmy.' };
      }
    } else {
      if (!state.form.firstName) {
        return { valid: false, message: 'Podaj imię kontaktowe.' };
      }
      if (!state.form.lastName) {
        return { valid: false, message: 'Podaj nazwisko kontaktowe.' };
      }
    }
    if (!state.form.phone) {
      return { valid: false, message: 'Podaj telefon kontaktowy.' };
    }
  }

  if (currentStep === 'summary') {
    if (!state.form.privacyPolicy) {
      return { valid: false, message: 'Zaakceptuj zgodę na kontakt w sprawie zgłoszenia.' };
    }
  }

  return { valid: true };
};

const buildSummary = () => {
  collectFormState();
  const service = (state.content?.services || []).find((item) => item.id === state.selectedServiceId);

  const sections = [
    {
      title: 'Zakres i powód',
      rows: [
        `Usługa: ${service?.name || '—'}`,
        `Powód: ${state.selectedReason || '—'}`,
        state.form.deviceType ? `Typ urządzenia: ${state.form.deviceType}` : null,
        state.form.deviceBrand ? `Marka: ${state.form.deviceBrand}` : null,
        state.form.deviceModel ? `Model: ${state.form.deviceModel}` : null,
        state.form.description ? `Opis: ${state.form.description}` : null,
        state.form.urgent ? 'Status: zgłoszenie pilne' : null
      ]
    },
    {
      title: 'Lokalizacja',
      rows: [
        `Adres: ${state.form.street}, ${[state.form.postalCode, state.form.city].filter(Boolean).join(' ')}`,
        state.form.directions ? `Dojazd: ${state.form.directions}` : null,
        `Termin: ${state.selectedAvailability || 'nie podano'}`,
        state.form.preferredTime ? `Dodatkowe okno: ${state.form.preferredTime}` : null
      ]
    },
    {
      title: 'Kontakt',
      rows: [
        `Typ klienta: ${state.form.clientType === 'business' ? 'Firma' : 'Klient prywatny'}`,
        state.form.clientType === 'business'
          ? `Nazwa firmy: ${state.form.companyName || '—'}`
          : `Imię i nazwisko: ${[state.form.firstName, state.form.lastName].filter(Boolean).join(' ') || '—'}`,
        state.form.clientType === 'business' && (state.form.contactFirstName || state.form.contactLastName)
          ? `Osoba kontaktowa: ${[state.form.contactFirstName, state.form.contactLastName].filter(Boolean).join(' ')}`
          : null,
        `Telefon: ${state.form.phone || '—'}`,
        state.form.email ? `E-mail: ${state.form.email}` : null,
        state.form.nip ? `NIP: ${state.form.nip}` : null,
        state.form.existingClient ? 'Stały klient: tak' : null
      ]
    }
  ];

  if (!elements.summary) return;
  elements.summary.innerHTML = sections.map((section) => `
    <div class="summary__section">
      <h3>${section.title}</h3>
      <ul>
        ${section.rows.filter(Boolean).map((row) => `<li>${row}</li>`).join('')}
      </ul>
    </div>
  `).join('');
};

const updateSummary = () => {
  collectFormState();
  updateNavigation();
  buildSummary();
};

const goToStep = (index) => {
  if (index < 0 || index >= state.steps.length) return;
  state.stepIndex = index;
  updateNavigation();
  buildSummary();
};

const nextStep = () => {
  const validation = validateStep();
  if (!validation.valid) {
    showToast(validation.message, { variant: 'error' });
    return;
  }
  if (state.stepIndex < state.steps.length - 1) {
    state.stepIndex += 1;
    updateNavigation();
    buildSummary();
  }
};

const prevStep = () => {
  if (state.stepIndex > 0) {
    state.stepIndex -= 1;
    updateNavigation();
  }
};

const buildApiDescription = (service) => {
  const lines = [];
  lines.push(`Zakres: ${service?.name || '—'}`);
  if (state.selectedReason) {
    lines.push(`Powód: ${state.selectedReason}`);
  }
  if (state.form.description) {
    lines.push(state.form.description);
  }
  const deviceLine = [
    state.form.deviceType ? `Typ urządzenia: ${state.form.deviceType}` : null,
    state.form.deviceBrand ? `Marka: ${state.form.deviceBrand}` : null,
    state.form.deviceModel ? `Model: ${state.form.deviceModel}` : null
  ].filter(Boolean).join(' | ');
  if (deviceLine) lines.push(deviceLine);
  if (state.selectedAvailability) {
    lines.push(`Preferowany termin: ${state.selectedAvailability}${state.form.preferredTime ? ` (${state.form.preferredTime})` : ''}`);
  }
  lines.push(`Adres: ${state.form.street}, ${[state.form.postalCode, state.form.city].filter(Boolean).join(' ')}`);
  if (state.form.directions) {
    lines.push(`Dojazd: ${state.form.directions}`);
  }
  if (state.form.urgent) {
    lines.push('⚠️ Zgłoszenie pilne – brak ogrzewania / zalanie.');
  }
  return lines.filter(Boolean).join('\n');
};

const buildApiPayload = () => {
  collectFormState();
  const service = (state.content?.services || []).find((item) => item.id === state.selectedServiceId);
  const combinedBrandModel = [state.form.deviceBrand, state.form.deviceModel].filter(Boolean).join(' ').trim();
  const isBusiness = state.form.clientType === 'business';
  const contactPerson = [state.form.contactFirstName, state.form.contactLastName].filter(Boolean).join(' ').trim();
  const individualName = [state.form.firstName, state.form.lastName].filter(Boolean).join(' ').trim();
  const displayName = isBusiness
    ? state.form.companyName || contactPerson || individualName || 'Klient'
    : individualName || 'Klient';
  const serviceCategoryId = (() => {
    if (!service) return null;
    const raw = service.desktopCategoryId ?? service.desktop_category_id ?? null;
    if (raw === null || raw === undefined || raw === '') return null;
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  })();
  return {
    type: service?.requestType || 'awaria',
    name: displayName,
    phone: state.form.phone,
    email: state.form.email || null,
    nip: state.form.nip || null,
    address_street: state.form.street,
    postal_code: state.form.postalCode || null,
    address_city: state.form.city || null,
    address_city_postal: [state.form.postalCode, state.form.city].filter(Boolean).join(' ') || null,
    directions: state.form.directions || null,
    device_type: state.form.deviceType || (service ? service.name : 'Instalacja'),
    device_brand: state.form.deviceBrand || null,
    device_model: state.form.deviceModel || null,
    brand_model: combinedBrandModel || null,
    client_type: state.form.clientType,
    first_name: isBusiness ? (state.form.contactFirstName || null) : (state.form.firstName || null),
    last_name: isBusiness ? (state.form.contactLastName || null) : (state.form.lastName || null),
    company_name: isBusiness ? (state.form.companyName || null) : null,
    is_existing_client: !!state.form.existingClient,
    description: buildApiDescription(service),
    service_category_id: serviceCategoryId
  };
};

const toggleSubmitting = (isSubmitting) => {
  state.submitting = !!isSubmitting;
  if (elements.submitBtn) {
    elements.submitBtn.disabled = state.submitting;
    elements.submitBtn.textContent = state.submitting ? 'Wysyłanie…' : 'Wyślij zgłoszenie';
  }
};

const resetForm = () => {
  state.stepIndex = 0;
  state.selectedServiceId = null;
  state.selectedReason = null;
  state.selectedAvailability = null;
  state.form = {
    description: '',
    deviceType: '',
    deviceBrand: '',
    deviceModel: '',
    street: '',
    postalCode: '',
    city: '',
    directions: '',
    preferredTime: '',
    clientType: 'individual',
    firstName: '',
    lastName: '',
    companyName: '',
    contactFirstName: '',
    contactLastName: '',
    phone: '',
    email: '',
    nip: '',
    existingClient: false,
    urgent: false,
    privacyPolicy: false
  };

  if (elements.form) {
    elements.form.reset();
  }
  if (elements.deviceBrandField) elements.deviceBrandField.value = '';
  if (elements.clientTypeRadios && elements.clientTypeRadios.length) {
    elements.clientTypeRadios.forEach((radio) => { radio.checked = radio.value === 'individual'; });
  }
  if (elements.individualSection) elements.individualSection.hidden = false;
  elements.businessSections.forEach((section) => { if (section) section.hidden = true; });
  if (elements.firstNameField) elements.firstNameField.required = true;
  if (elements.lastNameField) elements.lastNameField.required = true;
  if (elements.companyNameField) elements.companyNameField.required = false;
  if (elements.nipField) elements.nipField.placeholder = 'Opcjonalnie';
  updateOptionSelection(elements.serviceOptions, '[data-service-option]', null);
  updateOptionSelection(elements.reasonOptions, '[data-reason-option]', null);
  updateOptionSelection(elements.availabilityOptions, '[data-availability-option]', null);
  renderBrandOptions();
  updateClientTypeUI();
  goToStep(0);
  buildSummary();
};

const submitRequest = async (event) => {
  event.preventDefault();
  const validation = validateStep();
  if (!validation.valid) {
    showToast(validation.message, { variant: 'error' });
    return;
  }

  const payload = buildApiPayload();

  toggleSubmitting(true);
  try {
    const response = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));
    showToast('Zgłoszenie zostało wysłane. Dziękujemy!');
    if (elements.form) elements.form.hidden = true;
    if (elements.successCard) elements.successCard.hidden = false;
    resetForm();
    if (result?.reference_number && elements.successCard) {
      const meta = elements.successCard.querySelector('p');
      if (meta) {
        meta.innerHTML = `Potwierdzenie wysłaliśmy na podane dane. Numer zgłoszenia: <strong>${result.reference_number}</strong>.`;
      }
    }
  } catch (error) {
    console.error('[landing] submit error:', error);
    showToast('Nie udało się wysłać zgłoszenia. Spróbuj ponownie lub zadzwoń.', { variant: 'error' });
  } finally {
    toggleSubmitting(false);
  }
};

const loadDefaultContent = async () => {
  try {
    const resp = await fetch('/content/landing-default.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('default-json');
    const json = await resp.json();
    state.defaultContent = json;
    state.content = mapContent(json);
  } catch (error) {
    console.warn('[landing] default content load failed:', error);
    state.defaultContent = {
      hero: {
        subtitle: 'Serwis instalacji w Wielkopolsce',
        description: 'Nowoczesne instalacje wod-kan, kotłownie i ogrzewanie. Mobilny serwis 24/7.',
        stats: [],
        badges: [],
        cta: {}
      },
      highlights: [],
      services: [],
      form: {
        steps: [],
        reasons: [],
        availabilityOptions: [],
        brandOptions: ['Buderus', 'Bosch', 'Baxi', 'Viessmann', 'Junkers', 'De Dietrich']
      }
    };
    state.content = clone(state.defaultContent);
  }
};

const loadWebsiteContent = async () => {
  try {
    const resp = await fetch('/api/website/content', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json?.success && json?.data?.content) {
      state.content = mapContent(json.data.content);
    }
  } catch (error) {
    console.warn('[landing] remote content load skipped:', error);
  }
};

const loadCompanyProfile = async () => {
  const tryFetch = async (url) => {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    try {
      return await resp.json();
    } catch {
      return null;
    }
  };

  let payload = null;
  try {
    payload = await tryFetch('/company');
  } catch (error) {
    console.warn('[landing] company profile primary fetch skipped:', error);
  }

  if (!payload && window.location.hostname === 'www.instalacjeserwis.pl') {
    try {
      payload = await tryFetch('https://web-production-fc58d.up.railway.app/company');
    } catch (error) {
      console.warn('[landing] company profile fallback fetch skipped:', error);
    }
  }

  if (payload?.success && payload?.data) {
    applyCompanyProfile(payload.data);
  }
};

const attachListeners = () => {
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener('click', prevStep);
  }
  if (elements.nextBtn) {
    elements.nextBtn.addEventListener('click', nextStep);
  }
  if (elements.form) {
    elements.form.addEventListener('submit', submitRequest);
  }
  if (elements.newRequestBtn) {
    elements.newRequestBtn.addEventListener('click', () => {
      if (elements.successCard) elements.successCard.hidden = true;
      if (elements.form) elements.form.hidden = false;
      resetForm();
    });
  }
  if (elements.descriptionField) elements.descriptionField.addEventListener('input', updateSummary);
  if (elements.deviceTypeField) elements.deviceTypeField.addEventListener('change', updateSummary);
  if (elements.deviceBrandField) elements.deviceBrandField.addEventListener('change', updateSummary);
  if (elements.deviceModelField) elements.deviceModelField.addEventListener('input', updateSummary);
  if (elements.streetField) elements.streetField.addEventListener('input', updateSummary);
  if (elements.directionsField) elements.directionsField.addEventListener('input', updateSummary);
  if (elements.preferredField) elements.preferredField.addEventListener('input', updateSummary);
  if (elements.firstNameField) elements.firstNameField.addEventListener('input', updateSummary);
  if (elements.lastNameField) elements.lastNameField.addEventListener('input', updateSummary);
  if (elements.companyNameField) elements.companyNameField.addEventListener('input', updateSummary);
  if (elements.contactFirstField) elements.contactFirstField.addEventListener('input', updateSummary);
  if (elements.contactLastField) elements.contactLastField.addEventListener('input', updateSummary);
  if (elements.phoneField) elements.phoneField.addEventListener('input', updateSummary);
  if (elements.emailField) elements.emailField.addEventListener('input', updateSummary);
  if (elements.nipField) elements.nipField.addEventListener('input', updateSummary);
  if (elements.existingField) elements.existingField.addEventListener('change', updateSummary);
  if (elements.urgentField) elements.urgentField.addEventListener('change', updateSummary);
  if (elements.policyField) elements.policyField.addEventListener('change', updateSummary);
  if (elements.cityField) elements.cityField.addEventListener('input', updateSummary);
  if (elements.postalField) elements.postalField.addEventListener('input', updateSummary);
  if (elements.clientTypeRadios && elements.clientTypeRadios.length) {
    elements.clientTypeRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        collectFormState();
        updateClientTypeUI();
        updateSummary();
      });
    });
  }
  if (elements.serviceModal) {
    elements.serviceModal.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeModal);
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
};

const init = async () => {
  if (elements.successCard) {
    elements.successCard.hidden = true;
    elements.successCard.setAttribute('hidden', 'hidden');
  }
  if (elements.form) elements.form.hidden = false;
  if (elements.submitBtn) {
    elements.submitBtn.hidden = true;
  }

  await loadDefaultContent();
  renderHero();
  renderServices();
  renderHighlights();
  renderReasons();
  renderAvailabilityOptions();
  renderBrandOptions();
  updateClientTypeUI();
  buildStepIndicators();
  updateNavigation();
  buildSummary();
  attachListeners();

  await Promise.allSettled([
    loadWebsiteContent().then(() => {
      renderHero();
      renderServices();
      renderHighlights();
      renderReasons();
      renderAvailabilityOptions();
      renderBrandOptions();
      updateClientTypeUI();
      buildStepIndicators();
      updateNavigation();
      buildSummary();
    }),
    loadCompanyProfile()
  ]);
};

init().catch((error) => {
  console.error('[landing] initialization failed:', error);
  showToast('Nie udało się załadować treści strony. Spróbuj odświeżyć.', { variant: 'error', duration: 5000 });
});

