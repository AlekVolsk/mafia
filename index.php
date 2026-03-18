<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mafia</title>
    <meta id="metaDescription" name="description" content="">
    <meta id="metaKeywords" name="keywords" content="">
    <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
    <link rel="stylesheet" href="assets/fonts/NotoSans/fonts.css">
    <link rel="stylesheet" href="assets/style.css?v=<?php echo time(); ?>">
    <script src="assets/script.js?v=<?php echo time(); ?>" defer></script>
</head>
<body>

<div
    id="preloader"
    style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        transition:opacity 0.4s ease;opacity:1;pointer-events:all;"
    aria-label="Loading"
>
    <span
        style="font-size:clamp(1.2rem,4vw,2.2rem);font-weight:700;color:#fff;letter-spacing:0.08em;
            font-family:sans-serif;text-shadow:0 2px 12px rgba(0,0,0,0.5);"
    >Mafia loading...</span>
</div>

<div id="svgSprites" aria-hidden="true" style="display:none"></div>

<div class="game-container">
    <h1>
        <span id="pageTitle">
            <img src="assets/favicon.svg" alt="Logo" aria-hidden="true">
            <span data-i18n="common.title"></span>
        </span>
        <div class="lang-switcher">
            <button class="lang-btn" id="langBtnEn" title="English">
                <svg viewBox="0 0 60 40"><use href="#flag-en"/></svg>
            </button>
            <button class="lang-btn" id="langBtnRu" title="Русский">
                <svg viewBox="0 0 60 40"><use href="#flag-ru"/></svg>
            </button>
            <button class="lang-btn" id="langBtnEs" title="Español">
                <svg viewBox="0 0 60 40"><use href="#flag-es"/></svg>
            </button>
            <button class="lang-btn" id="langBtnPt" title="Português">
                <svg viewBox="0 0 60 40"><use href="#flag-pt"/></svg>
            </button>
            <button class="lang-btn" id="langBtnDe" title="Deutsch">
                <svg viewBox="0 0 60 40"><use href="#flag-de"/></svg>
            </button>
            <button class="lang-btn" id="langBtnFr" title="Français">
                <svg viewBox="0 0 60 40"><use href="#flag-fr"/></svg>
            </button>
            <button class="lang-btn" id="langBtnIt" title="Italiano">
                <svg viewBox="0 0 60 40"><use href="#flag-it"/></svg>
            </button>
            <button class="lang-btn" id="langBtnTr" title="Türkçe">
                <svg viewBox="0 0 60 40"><use href="#flag-tr"/></svg>
            </button>
            <button class="lang-btn" id="langBtnHi" title="हिन्दी">
                <svg viewBox="0 0 60 40"><use href="#flag-hi"/></svg>
            </button>
            <button class="lang-btn" id="langBtnHe" title="עברית">
                <svg viewBox="0 0 60 40"><use href="#flag-he"/></svg>
            </button>
            <button class="lang-btn" id="langBtnAr" title="العربية">
                <svg viewBox="0 0 60 40"><use href="#flag-ar"/></svg>
            </button>
            <button class="lang-btn" id="langBtnFa" title="فارسی">
                <svg viewBox="0 0 60 40"><use href="#flag-fa"/></svg>
            </button>
        </div>
    </h1>

    <p class="site-desc" id="siteDesc"></p>

    <div class="settings-panel">
        <div class="setting-group">
            <label>
                <svg viewBox="0 -1 24 24"><use href="#icon-users"/></svg>
                <span data-i18n="common.playersLabel"></span>
            </label>
            <div class="slider-container">
                <input type="range" id="playerSlider" min="8" max="24" value="12" step="1">
                <span id="playerCountValue">12</span>
            </div>
            <div class="mafia-info">
                <svg class="mafia-icon"><use href="#icon-gun"/></svg>
                <div id="mafiaCountDisplay"></div>
            </div>
        </div>

        <div class="setting-group fw">
            <label>
                <svg viewBox="0 0 24 24"><use href="#icon-gear"/></svg>
                <span data-i18n="common.optionalRolesLabel"></span>
            </label>
            <p class="roles-note" id="rolesNote"></p>
            <div class="checkboxes">
                <label><input type="checkbox" id="chkPatrol"><span data-i18n-role="patrol"></span></label>
                <label><input type="checkbox" id="chkDoctor" checked><span data-i18n-role="doctor"></span></label>
                <label><input type="checkbox" id="chkNurse"><span data-i18n-role="nurse"></span></label>
                <label><input type="checkbox" id="chkManiac"><span data-i18n-role="maniac"></span></label>
                <label><input type="checkbox" id="chkEscort"><span data-i18n-role="escort"></span></label>
                <label><input type="checkbox" id="chkJester"><span data-i18n-role="jester"></span></label>
                <label><input type="checkbox" id="chkJournalist"><span data-i18n-role="journalist"></span></label>
            </div>
        </div>

        <div class="upload-area">
            <input type="file" id="backImageUpload" accept="image/*">
            <label for="backImageUpload">
                <svg viewBox="0 -1 22 22"><use href="#icon-folder"/></svg>
                <span data-i18n="common.uploadBackLabel"></span>
            </label>
            <button id="resetBackBtn" class="warning">
                <svg viewBox="0 0 24 24"><use href="#icon-close"/></svg>
            </button>
        </div>
    </div>

    <div class="action-buttons">
        <button class="primary" id="dealBtn">
            <svg viewBox="0 0 423.757 423.757"><use href="#icon-dice"/></svg>
            <span data-i18n="common.dealBtn"></span>
        </button>
        <button id="rerollBtn">
            <svg viewBox="0 0 423.757 423.757"><use href="#icon-dice"/></svg>
            <span data-i18n="common.rerollBtn"></span>
        </button>
        <button id="revealAllBtn"></button>
        <button id="resetAllBtn">
            <svg viewBox="0 0 16 16"><use href="#icon-reset"/></svg>
            <span data-i18n="common.resetAllBtn"></span>
        </button>
        <button id="likeBtn">
            <svg viewBox="0 0 48 48"><use href="#icon-like"/></svg>
        </button>
        <button id="dislikeBtn">
            <svg viewBox="0 0 24 24"><use href="#icon-dislike"/></svg>
        </button>
        <button id="timerBtn">
            <svg viewBox="0 0 24 24"><use href="#icon-timer"/></svg>
        </button>
    </div>

    <div class="mode-cards-container">
        <p><b data-i18n="common.footerHint"></b></p>
    </div>

    <div class="cards-wrapper">
        <div class="cards-container" id="cardsContainer"></div>
    </div>

    <div class="footer-note">
        <div class="footer-rules-btns">
            <button class="rules-btn" id="btnGameplay"></button>
            <button class="rules-btn" id="btnRoles"></button>
            <button class="rules-btn" id="btnHost"></button>
            <button class="rules-btn" id="btnHistory"></button>
        </div>

        <div class="footer-c">
            <small>
                &copy; <?php echo date('Y'); ?> Aleksey A. Morozov. All right reserved.
                No personal data is collected or processed.<br>
                <a href="https://github.com/alekvolsk/mafia/" target="_blank" data-i18n="meta.support"></a>
            </small>
        </div>
    </div>
</div>

<div class="modal" id="cardModal">
    <div class="modal-card" id="modalCard"></div>
</div>

<dialog id="appDialog">
    <div class="dialog-header">
        <h2 id="dialogTitle"></h2>
    </div>
    <div class="dialog-body" id="dialogBody"></div>
    <div class="dialog-footer">
        <button class="dialog-close-btn" id="dialogCloseBtn"></button>
    </div>
</dialog>

</body>
</html>
