(function () {

    /**
     * @todo
     * - правила для ведущего
     * - все описания - в отдельные диалоги
     */

    // -------------------------------------------------------------------------
    // Константы
    // -------------------------------------------------------------------------

    const rolePool = {
        mandatory: ['mafia', 'don', 'commissar'],
        optional: ['patrol', 'doctor', 'nurse', 'maniac', 'escort', 'jester', 'journalist']
    };

    const rolesDisplayOrder = [
        'peaceful', 'mafia', 'don', 'commissar', 'patrol',
        'doctor', 'nurse', 'escort', 'jester', 'journalist', 'maniac'
    ];

    const langs = ['en', 'ru', 'es', 'de', 'fr', 'it', 'tr', 'pt', 'hi', 'he', 'ar', 'fa'];

    const TIMER_DURATIONS      = [5, 30, 60, 120, 180];
    const TIMER_DUR_LABELS     = ['5s', '30s', '1m', '2m', '3m'];
    const TIMER_DEFAULT_INDEX  = 2; // 60s

    // -------------------------------------------------------------------------
    // DOM-ссылки
    // -------------------------------------------------------------------------

    const playerSlider = document.getElementById('playerSlider');
    const playerCountValue = document.getElementById('playerCountValue');
    const mafiaCountDisplay = document.getElementById('mafiaCountDisplay');
    const container = document.getElementById('cardsContainer');
    const dealBtn = document.getElementById('dealBtn');
    const revealAllBtn = document.getElementById('revealAllBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const backImageUpload = document.getElementById('backImageUpload');
    const resetBackBtn = document.getElementById('resetBackBtn');
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    const timerBtn = document.getElementById('timerBtn');
    const rerollBtn = document.getElementById('rerollBtn');
    const modal = document.getElementById('cardModal');
    const modalCard = document.getElementById('modalCard');
    const appDialog = document.getElementById('appDialog');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogBody = document.getElementById('dialogBody');
    const dialogCloseBtn = document.getElementById('dialogCloseBtn');
    const chkPatrol = document.getElementById('chkPatrol');
    const chkDoctor = document.getElementById('chkDoctor');
    const chkNurse = document.getElementById('chkNurse');
    const chkManiac = document.getElementById('chkManiac');
    const chkEscort = document.getElementById('chkEscort');
    const chkJester = document.getElementById('chkJester');
    const chkJournalist = document.getElementById('chkJournalist');

    const langBtns = {
        en: document.getElementById('langBtnEn'),
        ru: document.getElementById('langBtnRu'),
        es: document.getElementById('langBtnEs'),
        de: document.getElementById('langBtnDe'),
        fr: document.getElementById('langBtnFr'),
        it: document.getElementById('langBtnIt'),
        tr: document.getElementById('langBtnTr'),
        pt: document.getElementById('langBtnPt'),
        hi: document.getElementById('langBtnHi'),
        he: document.getElementById('langBtnHe'),
        ar: document.getElementById('langBtnAr'),
        fa: document.getElementById('langBtnFa')
    };

    // -------------------------------------------------------------------------
    // Состояние
    // -------------------------------------------------------------------------

    let locale = null;
    let roleMeta = {};
    let currentLang = 'en';
    let customBackImage = null;

    let timerDuration  = TIMER_DURATIONS[TIMER_DEFAULT_INDEX];
    let timerRemaining = TIMER_DURATIONS[TIMER_DEFAULT_INDEX];
    let dealtOnce = false;

    let timerRunning = false;
    let timerIntervalId = null;
    let timerExpectedEnd = 0;

    // -------------------------------------------------------------------------
    // i18n
    // -------------------------------------------------------------------------

    function t(key) {
        const parts = key.split('.');
        let val = locale;
        for (const p of parts) {
            if (val == null) return key;
            val = val[p];
        }
        return val != null ? val : key;
    }

    function fmt(key, vars) {
        let str = t(key);
        for (const [k, v] of Object.entries(vars)) {
            str = str.replace('{' + k + '}', v);
        }
        return str;
    }

    async function loadLocale(lang) {
        if (window._locales[lang]) return window._locales[lang];
        try {
            const r = await fetch(`lang/${lang}.json?v=${Date.now()}`);
            if (!r.ok) throw new Error(r.status);
            const data = await r.json();
            window._locales[lang] = data;
            return data;
        } catch (e) {
            return null;
        }
    }

    function detectBrowserLang() {
        try {
            const list = (navigator.languages && navigator.languages.length)
                ? navigator.languages
                : (navigator.language ? [navigator.language] : []);
            const candidates = list.map(l => String(l).slice(0, 2).toLowerCase());
            return candidates.find(l => langs.includes(l)) || 'en';
        } catch (e) {
            return 'en';
        }
    }

    async function switchLang(lang) {
        const data = await loadLocale(lang);
        if (!data) return;
        currentLang = lang;
        localStorage.setItem('mafiaLang', lang);
        locale = data;
        applyTranslations();
    }

    function applyTranslations() {
        roleMeta = locale.roleMeta;

        document.documentElement.lang = currentLang;
        document.documentElement.dir = t('meta.dir');
        document.title = t('common.title');
        document.getElementById('metaDescription').setAttribute('content', t('meta.metaDescription'));
        document.getElementById('metaKeywords').setAttribute('content', t('meta.metaKeywords'));
        document.getElementById('siteDesc').innerHTML = t('common.siteDesc');
        document.getElementById('rolesNote').textContent = t('common.rolesNote');

        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });

        document.querySelectorAll('[data-i18n-role]').forEach(el => {
            const key = el.dataset.i18nRole;
            el.textContent = roleMeta[key] ? roleMeta[key].name : key;
        });

        langs.forEach(l => langBtns[l].classList.toggle('active', l === currentLang));

        updateMafiaCount();
        syncRevealBtn();
        buildRules();
        buildRolesList();

        if (container.children.length > 0) {
            rerenderCardLabels();
        }
    }

    // -------------------------------------------------------------------------
    // Игровая логика
    // -------------------------------------------------------------------------

    function updateMafiaCount() {
        const playerCount = parseInt(playerSlider.value, 10);
        const mafiaTotal = Math.floor(playerCount / 3.5);
        mafiaCountDisplay.textContent = fmt('common.mafiaCount', { n: mafiaTotal });
    }

    function getSelectedOptional() {
        const selected = [];
        if (chkPatrol.checked) selected.push('patrol');
        if (chkDoctor.checked) selected.push('doctor');
        if (chkNurse.checked) selected.push('nurse');
        if (chkManiac.checked) selected.push('maniac');
        if (chkEscort.checked) selected.push('escort');
        if (chkJester.checked) selected.push('jester');
        if (chkJournalist.checked) selected.push('journalist');
        return selected;
    }

    function generateRoles() {
        const playerCount = parseInt(playerSlider.value, 10);
        const mafiaTotal = Math.floor(playerCount / 3.5);
        const donPresent = mafiaTotal >= 1;
        const mafiaCount = donPresent ? mafiaTotal - 1 : 0;

        let roles = [];
        if (donPresent) roles.push('don');
        for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
        roles.push('commissar');
        roles.push(...getSelectedOptional());

        if (roles.length > playerCount) {
            alert(fmt('common.alertTooManyRoles', { roles: roles.length, players: playerCount }));
            return null;
        }

        const peacefulCount = playerCount - roles.length;
        for (let i = 0; i < peacefulCount; i++) roles.push('peaceful');

        return shuffleArray(roles);
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // -------------------------------------------------------------------------
    // Карточки
    // -------------------------------------------------------------------------

    function renderCards(roles) {
        container.innerHTML = '';
        roles.forEach((roleKey, index) => {
            const card = document.createElement('div');
            card.className = 'card back';
            card.dataset.index = index;
            card.dataset.role = roleKey;
            card.dataset.revealed = 'false';

            const meta = roleMeta[roleKey] || { name: roleKey, letter: '?', desc: '' };

            const numberSpan = document.createElement('div');
            numberSpan.className = 'card-number';
            numberSpan.textContent = index + 1;

            const letterSpan = document.createElement('div');
            letterSpan.className = 'role-letter';
            letterSpan.textContent = meta.letter;

            const nameSpan = document.createElement('div');
            nameSpan.className = 'role-name';
            nameSpan.textContent = meta.name;

            card.appendChild(numberSpan);
            card.appendChild(letterSpan);
            card.appendChild(nameSpan);
            card.addEventListener('click', (e) => onCardClick(e, card));

            container.appendChild(card);
        });

        container.classList.remove('all-visible');
    }

    function rerenderCardLabels() {
        Array.from(container.children).forEach(card => {
            const meta = roleMeta[card.dataset.role] || { name: card.dataset.role, letter: '?' };
            card.querySelector('.role-letter').textContent = meta.letter;
            card.querySelector('.role-name').textContent = meta.name;
        });
    }

    function onCardClick(event, card) {
        event.stopPropagation();

        if (card.classList.contains('seen') && !container.classList.contains('all-visible')) return;

        showModal(card);
        card.classList.add('seen');
    }

    function syncRevealBtn() {
        const isVisible = container.classList.contains('all-visible');
        const icon = isVisible
            ? '<svg viewBox="0 0 24 24"><use href="#icon-eye-off"/></svg>'
            : '<svg viewBox="0 0 512 512"><use href="#icon-eye"/></svg>';
        revealAllBtn.innerHTML = icon + '<span>' + (isVisible ? t('common.hideAllBtn') : t('common.revealAllBtn')) + '</span>';
    }

    function revealAll() {
        if (!container.children.length) return;
        container.classList.add('all-visible');
        Array.from(container.children).forEach(card => {
            card.classList.add(card.dataset.role);
            card.classList.remove('back');
        });
        syncRevealBtn();
    }

    function resetCardsToBack() {
        Array.from(container.children).forEach(card => {
            card.classList.remove(card.dataset.role);
            card.classList.add('back');
        });
        container.classList.remove('all-visible');
        syncRevealBtn();
    }

    // -------------------------------------------------------------------------
    // Модальное окно
    // -------------------------------------------------------------------------

    function showModal(card) {
        const roleKey = card.dataset.role;
        const meta = roleMeta[roleKey] || { name: '???', letter: '?', desc: '' };
        const cardNumber = card.dataset.index !== undefined ? parseInt(card.dataset.index) + 1 : '';

        modalCard.className = 'modal-card ' + roleKey;
        modalCard.innerHTML = `
            <div class="card-number">${cardNumber}</div>
            <div class="role-letter">${meta.letter}</div>
            <div class="role-name">${meta.name}</div>
            <div class="role-desc">${meta.desc || ''}</div>
        `;
        modal.classList.add('active');
    }

    function closeModal() {
        if (timerRunning || timerRemaining !== timerDuration) {
            timerStop(true);
        }
        modal.classList.remove('active');
    }

    function showRerollModal() {
        const n = parseInt(playerSlider.value, 10);
        const positions = Array.from({ length: n }, (_, i) => i + 1);
        const shuffled = positions.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const rows = positions.map(old =>
            `<tr><td>${old}</td><td class="reroll-arrow">→</td><td>${shuffled[old - 1]}</td></tr>`
        ).join('');

        modalCard.className = 'modal-card reroll-card';
        modalCard.innerHTML = `
            <div class="reroll-title">${t('reroll.title')}</div>
            <table class="reroll-table"><tbody>${rows}</tbody></table>
        `;
        modal.classList.add('active');
    }

    function showReactionModal(type) {
        modalCard.className = 'modal-card reaction-card ' + type;
        modalCard.innerHTML = type === 'like'
            ? '<svg viewBox="0 0 48 48"><use href="#icon-like"/></svg>'
            : '<svg viewBox="0 0 24 24"><use href="#icon-dislike"/></svg>';
        modal.classList.add('active');
    }

    function showTimerModal() {
        timerRemaining = timerDuration;

        modalCard.className = 'modal-card timer-card';
        const durBtns = TIMER_DURATIONS.map((d, i) =>
            `<button class="timer-dur-btn${d === timerDuration ? ' active' : ''}" data-dur="${d}">${TIMER_DUR_LABELS[i]}</button>`
        ).join('');

        modalCard.innerHTML = `
            <div class="timer-durations">${durBtns}</div>
            <div class="timer-display">${timerFmt(timerDuration)}</div>
            <button class="timer-start-btn">${t('timer.start')}</button>
        `;

        modalCard.querySelectorAll('.timer-dur-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (timerRunning) return;
                timerDuration = parseInt(btn.dataset.dur, 10);
                timerRemaining = timerDuration;
                timerUpdateDisplay();
                timerUpdateDurationBtns();
            });
        });

        modalCard.querySelector('.timer-start-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            timerRunning ? timerStop(true) : timerStart();
        });

        modal.classList.add('active');
    }

    // -------------------------------------------------------------------------
    // Таймер
    // -------------------------------------------------------------------------

    function timerFmt(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function timerUpdateDisplay() {
        const el = modalCard.querySelector('.timer-display');
        if (!el) return;
        el.textContent = timerFmt(timerRemaining);
        el.classList.toggle('warn', timerRemaining <= 10 && timerRemaining > 5);
        el.classList.toggle('danger', timerRemaining <= 5);
    }

    function timerUpdateDurationBtns() {
        modalCard.querySelectorAll('.timer-durations button').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.dur, 10) === timerDuration);
            btn.disabled = timerRunning;
        });
    }

    function timerUpdateStartBtn() {
        const btn = modalCard.querySelector('.timer-start-btn');
        if (!btn) return;
        btn.textContent = timerRunning ? t('timer.stop') : t('timer.start');
    }

    function timerStop(reset) {
        if (timerIntervalId !== null) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
        timerRunning = false;
        if (reset) timerRemaining = timerDuration;
        timerUpdateDisplay();
        timerUpdateDurationBtns();
        timerUpdateStartBtn();
    }

    function timerTick() {
        const now = performance.now();
        const elapsed = Math.round((now - timerExpectedEnd + 1000) / 1000);
        timerRemaining = Math.max(0, timerRemaining - elapsed);
        timerExpectedEnd += elapsed * 1000;
        timerUpdateDisplay();
        if (timerRemaining <= 0) timerStop(true);
    }

    function timerStart() {
        timerRunning = true;
        timerExpectedEnd = performance.now() + 1000;
        timerIntervalId = setInterval(timerTick, 1000);
        timerUpdateDurationBtns();
        timerUpdateStartBtn();
    }

    // -------------------------------------------------------------------------
    // Кастомный фон карточек
    // -------------------------------------------------------------------------

    function saveCustomBackToStorage(dataUrl) {
        try { localStorage.setItem('mafiaCustomBack', dataUrl); } catch (e) { }
    }

    function loadCustomBackFromStorage() {
        try {
            const data = localStorage.getItem('mafiaCustomBack');
            if (data) {
                customBackImage = data;
                applyBackImageToContainer();
            }
        } catch (e) { }
    }

    function applyBackImageToContainer() {
        if (customBackImage) {
            container.style.setProperty('--custom-back', `url('${customBackImage}')`);
            container.classList.add('custom-back');
        } else {
            container.style.removeProperty('--custom-back');
            container.classList.remove('custom-back');
        }
    }

    function resetCustomBack() {
        customBackImage = null;
        localStorage.removeItem('mafiaCustomBack');
        applyBackImageToContainer();
    }

    // -------------------------------------------------------------------------
    // Правила и список ролей
    // -------------------------------------------------------------------------

    function buildRules() {
        document.getElementById('btnGameplay').textContent = t('rules.gameplayTitle');
        document.getElementById('btnRoles').textContent    = t('rules.rolesTitle');
        document.getElementById('btnHost').textContent     = t('rules.hostTitle');
    }

    function buildRolesList() {}

    function renderRolesDl() {
        const dl = document.createElement('dl');
        dl.className = 'roles-dl';
        rolesDisplayOrder.forEach(roleKey => {
            const meta = roleMeta[roleKey];
            if (!meta) return;
            const dt = document.createElement('dt');
            const dot = document.createElement('span');
            dot.className = 'role-dot ' + roleKey;
            dt.appendChild(dot);
            dt.appendChild(document.createTextNode(' ' + meta.name));
            const dd = document.createElement('dd');
            dd.textContent = meta.desc || '';
            dl.appendChild(dt);
            dl.appendChild(dd);
        });
        return dl.outerHTML;
    }

    // -------------------------------------------------------------------------
    // Инициализация и события
    // -------------------------------------------------------------------------

    async function loadSprites() {
        const r = await fetch(`assets/sprites.svg?v=${Date.now()}`);
        document.getElementById('svgSprites').innerHTML = await r.text();
    }

    // Настройки

    chkNurse.addEventListener('change', () => {
        if (chkNurse.checked) chkDoctor.checked = true;
    });

    chkDoctor.addEventListener('change', () => {
        if (!chkDoctor.checked) chkNurse.checked = false;
    });

    playerSlider.addEventListener('input', () => {
        playerCountValue.textContent = playerSlider.value;
        updateMafiaCount();
    });

    // Кнопки управления

    dealBtn.addEventListener('click', () => {
        const roles = generateRoles();
        if (roles) {
            renderCards(roles);
            resetCardsToBack();
            dealtOnce = true;
        }
    });

    window.addEventListener('beforeunload', e => {
        if (dealtOnce) e.preventDefault();
    });

    revealAllBtn.addEventListener('click', () => {
        if (container.children.length === 0) {
            alert(t('common.alertDealFirst'));
            return;
        }
        container.classList.contains('all-visible') ? resetCardsToBack() : revealAll();
    });

    resetAllBtn.addEventListener('click', () => {
        playerSlider.value = 12;
        playerCountValue.textContent = 12;
        chkPatrol.checked = false;
        chkDoctor.checked = true;
        chkNurse.checked = false;
        chkManiac.checked = false;
        chkEscort.checked = false;
        chkJester.checked = false;
        chkJournalist.checked = false;
        updateMafiaCount();
        const roles = generateRoles();
        if (roles) {
            renderCards(roles);
            syncRevealBtn();
        }
    });

    rerollBtn.addEventListener('click', () => showRerollModal());
    likeBtn.addEventListener('click', () => showReactionModal('like'));
    dislikeBtn.addEventListener('click', () => showReactionModal('dislike'));
    timerBtn.addEventListener('click', () => showTimerModal());

    // Загрузка фона

    backImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                customBackImage = ev.target.result;
                saveCustomBackToStorage(customBackImage);
                applyBackImageToContainer();
            };
            reader.readAsDataURL(file);
        }
    });

    resetBackBtn.addEventListener('click', resetCustomBack);

    // Модальное окно

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    // Диалог

    function openDialog(title, html) {
        dialogTitle.textContent = title;
        dialogBody.innerHTML = html;
        dialogCloseBtn.textContent = t('common.close');
        appDialog.showModal();
    }

    dialogCloseBtn.addEventListener('click', () => appDialog.close());

    appDialog.addEventListener('click', e => {
        if (e.target === appDialog) appDialog.close();
    });

    document.getElementById('btnGameplay').addEventListener('click', () => {
        const html = (locale.rules.paragraphs || []).map(p => `<p>${p}</p>`).join('');
        openDialog(t('rules.gameplayTitle'), html);
    });

    document.getElementById('btnRoles').addEventListener('click', () => {
        openDialog(t('rules.rolesTitle'), renderRolesDl());
    });

    document.getElementById('btnHost').addEventListener('click', () => {
        const html = (locale.rules.hostParagraphs || []).map(p => `<p>${p}</p>`).join('');
        openDialog(t('rules.hostTitle'), html);
    });

    // Язык

    langs.forEach(l => langBtns[l].addEventListener('click', () => switchLang(l)));

    // Загрузка при старте

    window._locales = {};

    window.addEventListener('load', async () => {
        const saved = localStorage.getItem('mafiaLang');
        const preferred = (saved && langs.includes(saved)) ? saved : detectBrowserLang();

        const [data] = await Promise.all([
            loadLocale(preferred).then(d => d || loadLocale('en')),
            loadSprites()
        ]);

        currentLang = window._locales[preferred] ? preferred : 'en';
        locale = data;
        applyTranslations();
        loadCustomBackFromStorage();
        const roles = generateRoles();
        if (roles) renderCards(roles);

        const preloader = document.getElementById('preloader');
        preloader.style.opacity = '0';
        preloader.style.pointerEvents = 'none';
        setTimeout(() => preloader.remove(), 400);
    });

})();
