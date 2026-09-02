// ==UserScript==
// @name         PogDesign TV Calendar - Copy Show & Episode Title
// @namespace    http://tampermonkey.net/
// @version      2.6.0
// @description  Adds an inline Copy button to calendar, summary pages (at the end of </li>), and season rows with configurable suffix.
// @match        https://www.pogdesign.co.uk/cat/
// @match        https://www.pogdesign.co.uk/cat/*-*
// @match        https://www.pogdesign.co.uk/cat/*-summary
// @updateURL    https://raw.githubusercontent.com/allanlaal/cat-title/master/cat-title.user.js
// @downloadURL  https://raw.githubusercontent.com/allanlaal/cat-title/master/cat-title.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const DEFAULT_SUFFIX = " 1080p";
    let copySuffix = GM_getValue("copy_suffix", DEFAULT_SUFFIX);

    GM_registerMenuCommand(`Set Copy Suffix (Current: "${copySuffix}")`, () => {
        const input = prompt("Enter text/suffix to append to copy string:", copySuffix);
        if (input !== null) {
            GM_setValue("copy_suffix", input);
            copySuffix = input;
            alert(`Copy suffix updated to: "${copySuffix}"`);
        }
    });

    // 2x width (20px) vs height (10px) SVG icon
    const COPY_ICON_SVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="10" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 6px; cursor: pointer;">
            <rect x="18" y="9" width="26" height="13" rx="2" ry="2"></rect>
            <path d="M10 15H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;

    function cleanShowName(showName) {
        return showName
            .replace(/Summary/gi, '')
            .replace(/['":!?,.-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function formatCopyText(showName, code) {
        const cleanName = cleanShowName(showName);
        const cleanCode = code.trim().toUpperCase();
        return `${cleanName} ${cleanCode}${copySuffix}`;
    }

    function createCopyButton(textToCopy) {
        const btn = document.createElement('span');
        btn.className = 'pog-copy-btn-inline';
        btn.title = `Copy: ${textToCopy}`;
        btn.style.cssText = 'display: inline-block !important; white-space: nowrap !important; color: #888; cursor: pointer; text-decoration: none; font-size: inherit; margin-left: 6px;';
        btn.innerHTML = COPY_ICON_SVG;

        btn.addEventListener('mouseenter', () => { 
            if (btn.style.color !== 'rgb(46, 204, 113)') btn.style.color = '#3498db'; 
        });
        btn.addEventListener('mouseleave', () => { 
            if (btn.style.color !== 'rgb(46, 204, 113)') btn.style.color = '#888'; 
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            navigator.clipboard.writeText(textToCopy).then(() => {
                btn.style.color = '#2ecc71';
                setTimeout(() => { btn.style.color = '#888'; }, 1500);
            }).catch(err => {
                console.error('Failed to copy text:', err);
            });
        });

        return btn;
    }

    function initCalendarPage() {
        const epDivs = document.querySelectorAll('div.ep p[id^="q/"]');

        epDivs.forEach(p => {
            if (p.querySelector('.pog-copy-btn-inline')) return;

            const anchors = p.querySelectorAll('a');
            if (anchors.length < 2) return;

            const showAnchor = anchors[0];
            const epAnchor = anchors[1];

            const showName = showAnchor.textContent.trim();
            const epCode = epAnchor.textContent.trim();

            if (!showName || !epCode) return;

            const textToCopy = formatCopyText(showName, epCode);
            const btn = createCopyButton(textToCopy);
            epAnchor.appendChild(btn);
        });
    }

    function initSummaryPage() {
        const h1Elem = document.querySelector('h1, h2');
        const fallbackShowName = h1Elem ? h1Elem.textContent.split('Summary')[0].trim() : '';

        // 1. Process Season Headers (<div class="seashead">)
        const seasHeads = document.querySelectorAll('div.seashead');
        seasHeads.forEach(head => {
            if (head.querySelector('.pog-copy-btn-inline')) return;

            const text = head.textContent.trim();
            const match = text.match(/Season\s+(\d+)/i);
            if (match) {
                const parentLi = head.closest('li.parent');
                const metaSeries = parentLi ? parentLi.querySelector('meta[itemprop="partOfSeries"]') : null;
                const showName = metaSeries ? metaSeries.getAttribute('content') : fallbackShowName;

                if (showName) {
                    const seasonNum = match[1].padStart(2, '0');
                    const textToCopy = formatCopyText(showName, `S${seasonNum}`);
                    const btn = createCopyButton(textToCopy);
                    
                    const strongTag = head.querySelector('strong');
                    (strongTag || head).appendChild(btn);
                }
            }
        });

        // 2. Process Episode Rows (<li class="ep info">) - Appends directly before </li>
        const epItems = document.querySelectorAll('li.ep[itemprop="episode"]');
        epItems.forEach(item => {
            if (item.querySelector('.pog-copy-btn-inline')) return;

            const metaSeries = item.querySelector('meta[itemprop="partOfSeries"]');
            const showName = metaSeries ? metaSeries.getAttribute('content') : fallbackShowName;

            const seasonSpan = item.querySelector('span[itemprop="seasonNumber"]');
            const seasonNum = seasonSpan ? seasonSpan.textContent.trim() : '';

            const epSpan = item.querySelector('span[itemprop="episodeNumber"]');
            const epNum = epSpan ? epSpan.getAttribute('content') || epSpan.textContent.trim() : '';

            if (showName && seasonNum && epNum) {
                const formattedSeason = seasonNum.padStart(2, '0');
                const formattedEp = epNum.padStart(2, '0');
                const epCode = `S${formattedSeason}E${formattedEp}`;

                const textToCopy = formatCopyText(showName, epCode);
                const btn = createCopyButton(textToCopy);

                // Append directly as the last element of the <li> container
                item.appendChild(btn);
            }
        });
    }

    function initAll() {
        if (window.location.pathname.endsWith('-summary')) {
            initSummaryPage();
        } else {
            initCalendarPage();
        }
    }

    initAll();

    const observer = new MutationObserver(() => {
        initAll();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
