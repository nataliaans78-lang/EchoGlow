export function initEqualizer(context) {
  const {
    refs: {
      audioControls,
      controlsToggleBtn,
      controlsToggleIcon,
      eqBtn,
      eqCloseBtn,
      eqIcon,
      eqPanel,
      eqPresetSelect,
      eqResetBtn,
      eqSliders
    },
    state,
    constants: { EQ_PRESETS, EQ_STORAGE_KEY }
  } = context;

  const presetDropdown = document.getElementById('eq-preset-dropdown');
  const presetToggle = document.getElementById('eq-preset-toggle');
  const presetLabel = document.getElementById('eq-preset-label');
  const presetMenu = document.getElementById('eq-preset-menu');
  const presetOptions = [...document.querySelectorAll('.eq-preset-option')];

  function syncCustomPresetUI(value) {
    const nextValue = value || 'custom';
    const activeOption = presetOptions.find(option => option.dataset.value === nextValue)
      || presetOptions.find(option => option.dataset.value === 'custom');

    presetOptions.forEach(option => {
      const isActive = option === activeOption;
      option.classList.toggle('is-selected', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });

    if (presetLabel && activeOption) {
      presetLabel.textContent = activeOption.textContent.trim();
    }
  }

  function closePresetMenu({ returnFocus = false } = {}) {
    presetDropdown?.classList.remove('open');
    presetToggle?.setAttribute('aria-expanded', 'false');
    presetMenu?.setAttribute('aria-hidden', 'true');
    presetMenu?.setAttribute('inert', '');
    if (returnFocus) presetToggle?.focus({ preventScroll: true });
  }

  function positionPresetMenu() {
    if (!presetDropdown || !presetMenu || !presetToggle) return;

    const toggleRect = presetToggle.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const gap = 10;

    const spaceBelow = viewportHeight - toggleRect.bottom - gap;
    const safeHeight = Math.max(90, Math.min(spaceBelow, 220));

    presetMenu.style.setProperty('--eq-menu-max-height', `${safeHeight}px`);
  }

  function openPresetMenu({ focus = 'selected' } = {}) {
    positionPresetMenu();
    presetDropdown?.classList.add('open');
    presetToggle?.setAttribute('aria-expanded', 'true');
    presetMenu?.setAttribute('aria-hidden', 'false');
    presetMenu?.removeAttribute('inert');

    const selectedIndex = Math.max(0, presetOptions.findIndex(option => option.getAttribute('aria-selected') === 'true'));
    const targetIndex = focus === 'first'
      ? 0
      : focus === 'last'
        ? presetOptions.length - 1
        : selectedIndex;
    requestAnimationFrame(() => presetOptions[targetIndex]?.focus());
  }

  function togglePresetMenu() {
    if (!presetDropdown || !presetToggle) return;
    const isOpen = presetDropdown.classList.contains('open');
    if (isOpen) closePresetMenu();
    else openPresetMenu();
  }

  function selectPreset(option) {
    const value = option?.dataset.value;
    if (!value || !eqPresetSelect) return;

    eqPresetSelect.value = value;
    eqPresetSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function focusPresetOption(index) {
    if (!presetOptions.length) return;
    const nextIndex = (index + presetOptions.length) % presetOptions.length;
    presetOptions[nextIndex].focus();
  }

  function handlePresetMenuKeydown(event) {
    const currentIndex = presetOptions.indexOf(document.activeElement);
    if (currentIndex < 0 && event.key !== 'Escape') return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusPresetOption(currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusPresetOption(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusPresetOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusPresetOption(presetOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectPreset(presetOptions[currentIndex]);
        closePresetMenu({ returnFocus: true });
        break;
      case 'Escape':
        event.preventDefault();
        closePresetMenu({ returnFocus: true });
        break;
      default:
        break;
    }
  }

  function getCurrentEQSettings() {
    return {
      bass: parseFloat(eqSliders.find(slider => slider.dataset.band === 'bass')?.value ?? '0'),
      mid: parseFloat(eqSliders.find(slider => slider.dataset.band === 'mid')?.value ?? '0'),
      treble: parseFloat(eqSliders.find(slider => slider.dataset.band === 'treble')?.value ?? '0')
    };
  }

  function saveEQState(preset = 'custom') {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({
      preset,
      settings: getCurrentEQSettings()
    }));
  }

  function applyEQSettings(settings, { save = true, preset = 'custom' } = {}) {
    eqSliders.forEach(slider => {
      const band = slider.dataset.band;
      const nextValue = settings[band] ?? 0;
      slider.value = String(nextValue);

      if (state.bassFilter && state.midFilter && state.trebleFilter) {
        if (band === 'bass') state.bassFilter.gain.value = nextValue;
        if (band === 'mid') state.midFilter.gain.value = nextValue;
        if (band === 'treble') state.trebleFilter.gain.value = nextValue;
      }
    });

    if (eqPresetSelect) {
      eqPresetSelect.value = EQ_PRESETS[preset] ? preset : 'custom';
    }

    syncCustomPresetUI(EQ_PRESETS[preset] ? preset : 'custom');

    if (save) {
      saveEQState(EQ_PRESETS[preset] ? preset : 'custom');
    }
  }

  function loadEQState() {
    try {
      const raw = localStorage.getItem(EQ_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.settings) return;
      applyEQSettings(parsed.settings, { save: false, preset: parsed.preset ?? 'custom' });
    } catch (_) {
      // ignore invalid localStorage payload
    }
  }

  function updateMobilePlaylistPush() {
    const isEqOpen = audioControls?.classList.contains('eq-open');
    const isMobile = window.innerWidth <= 768;

    if (!isEqOpen || !isMobile || !eqPanel) {
      document.body.style.setProperty('--eq-mobile-push', '0px');
      return;
    }

    const eqHeight = eqPanel.getBoundingClientRect().height || 0;
    const pushValue = Math.min(eqHeight * 0.22, window.innerHeight * 0.14);
    document.body.style.setProperty('--eq-mobile-push', `${Math.max(0, Math.round(pushValue))}px`);
  }

  function syncEQMobileLayout() {
    const isEqOpen = audioControls?.classList.contains('eq-open');
    const shouldCompactPlaylist = isEqOpen && window.innerWidth <= 768;
    document.body.classList.toggle('eq-mobile-open', shouldCompactPlaylist);
    updateMobilePlaylistPush();
  }

  function setEQState(isOpen) {
    const shouldRestoreFocus = !isOpen && Boolean(eqPanel?.contains(document.activeElement));
    audioControls?.classList.toggle('eq-open', isOpen);
    eqPanel?.classList.toggle('open', isOpen);
    eqBtn?.classList.toggle('active', isOpen);
    eqPanel?.setAttribute('aria-hidden', String(!isOpen));
    eqPanel?.toggleAttribute('inert', !isOpen);

    if (!isOpen) {
      closePresetMenu();
    }

    syncEQMobileLayout();
    requestAnimationFrame(updateMobilePlaylistPush);

    if (eqIcon) {
      eqIcon.src = isOpen ? 'icons/return.svg' : 'icons/eq.svg';
      eqIcon.alt = isOpen ? 'Close EQ' : 'EQ';
    }

    eqBtn?.setAttribute('aria-label', isOpen ? 'Close equalizer' : 'Open equalizer');
    controlsToggleBtn?.setAttribute('aria-label',
      document.body.classList.contains('controls-hidden') ? 'Show control bar' : 'Hide control bar');
    if (controlsToggleIcon) {
      controlsToggleIcon.alt = document.body.classList.contains('controls-hidden') ? 'Show controls' : 'Hide controls';
    }

    if (shouldRestoreFocus) {
      eqBtn?.focus({ preventScroll: true });
    }
  }

  eqSliders.forEach(slider => {
    slider.addEventListener('input', event => {
      if (!state.isAudioCtxInitialized) {
        context.actions.initAudioCtx?.();
      }

      if (!state.bassFilter || !state.midFilter || !state.trebleFilter) {
        return;
      }

      const value = parseFloat(event.target.value);
      const band = event.target.dataset.band;
      if (band === 'bass') state.bassFilter.gain.value = value;
      if (band === 'mid') state.midFilter.gain.value = value;
      if (band === 'treble') state.trebleFilter.gain.value = value;

      if (eqPresetSelect) {
        eqPresetSelect.value = 'custom';
      }
      syncCustomPresetUI('custom');
      saveEQState('custom');
    });
  });

  eqPresetSelect?.addEventListener('change', event => {
    syncCustomPresetUI(event.target.value);
    const preset = event.target.value;
    const presetValues = EQ_PRESETS[preset];
    if (!presetValues) {
      saveEQState('custom');
      return;
    }
    applyEQSettings(presetValues, { preset });
  });

  eqResetBtn?.addEventListener('click', () => {
    applyEQSettings(EQ_PRESETS.flat, { preset: 'flat' });
  });

  eqBtn?.addEventListener('click', () => {
    const isOpen = !audioControls?.classList.contains('eq-open');
    setEQState(isOpen);
  });

  eqCloseBtn?.addEventListener('click', () => {
    setEQState(false);
  });

  presetToggle?.addEventListener('click', togglePresetMenu);
  presetToggle?.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' || event.key === 'End') openPresetMenu({ focus: 'last' });
    else openPresetMenu({ focus: 'first' });
  });
  presetMenu?.addEventListener('keydown', handlePresetMenuKeydown);

  presetOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectPreset(option);
      closePresetMenu({ returnFocus: true });
    });
  });

  document.addEventListener('click', event => {
    if (!presetDropdown || !presetMenu) return;
    if (!presetDropdown.contains(event.target)) {
      closePresetMenu();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && presetDropdown?.classList.contains('open')) {
      event.preventDefault();
      closePresetMenu({ returnFocus: true });
    }
  });

  window.addEventListener('resize', () => {
    if (presetDropdown?.classList.contains('open')) {
      positionPresetMenu();
    }
  });

  syncCustomPresetUI(eqPresetSelect?.value || 'custom');
  loadEQState();
  syncEQMobileLayout();
  window.addEventListener('resize', syncEQMobileLayout);

  Object.assign(context.actions, {
    applyEQSettings,
    getCurrentEQSettings,
    initEQState: loadEQState,
    setEQState,
    syncEQMobileLayout,
    updateMobilePlaylistPush
  });
}
