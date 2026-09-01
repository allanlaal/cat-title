// ==UserScript==
// @name         PogDesign TV Calendar - Copy Show & Episode Title
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds an inline Copy button strictly on the same line as episode numbers on PogDesign.
// @match        https://www.pogdesign.co.uk/cat/
// @match        https://www.pogdesign.co.uk/cat/index.php
// @match        https://www.pogdesign.co.uk/cat/#*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // SVG icon: Two overlapping clipboard pages
    const COPY_ICON_SVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: baseline; margin-left: 2px; cursor: pointer;">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;

    function formatCopyText(showName, epCode) {
        let cleanName = showName
            .replace(/['":!?,.-]/g, ' ')  // Strip punctuation/special chars
            .replace(/\s+/g, ' ')         // Collapse multiple spaces
            .trim();

        let cleanEp = epCode.trim().toUpperCase(); // "s12e03" -> "S12E03"

        return `${cleanName} ${cleanEp}`;
    }

    function initCopyButtons() {
        const epDivs = document.querySelectorAll('div.ep p[id^="q/"]');

        epDivs.forEach(p => {
            // Prevent duplicate injection
            if (p.querySelector('.pog-copy-btn-inline')) return;

            const anchors = p.querySelectorAll('a');
            if (anchors.length < 2) return;

            const showAnchor = anchors[0];
            const epAnchor = anchors[1];

            const showName = showAnchor.textContent.trim();
            const epCode = epAnchor.textContent.trim();

            if (!showName || !epCode) return;

            // Create strictly inline span wrapper
            const btn = document.createElement('span');
            btn.className = 'pog-copy-btn-inline';
            btn.title = `Copy: ${formatCopyText(showName, epCode)}`;
            btn.style.cssText = 'display: inline !important; white-space: nowrap !important; color: #888; cursor: pointer; text-decoration: none;';
            btn.innerHTML = COPY_ICON_SVG;

            // Hover effects
            btn.addEventListener('mouseenter', () => { 
                if (btn.style.color !== 'rgb(46, 204, 113)') btn.style.color = '#3498db'; 
            });
            btn.addEventListener('mouseleave', () => { 
                if (btn.style.color !== 'rgb(46, 204, 113)') btn.style.color = '#888'; 
            });

            // Clipboard copy execution
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const textToCopy = formatCopyText(showName, epCode);

                navigator.clipboard.writeText(textToCopy).then(() => {
                    btn.style.color = '#2ecc71'; // Green confirmation
                    setTimeout(() => { btn.style.color = '#888'; }, 1500);
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                });
            });

            // Injecting inside epAnchor prevents line-breaks from parent p wrapping
            epAnchor.appendChild(btn);
        });
    }

    // Run on script load
    initCopyButtons();

    // Re-run on calendar changes/navigation
    const observer = new MutationObserver(() => {
        initCopyButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
