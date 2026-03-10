/**
 * Impact Flow Slides Hub — Dashboard Logic
 * Lädt Präsentationen aus JSON, rendert Karten, Filter, Suche, QR
 */

(function() {
  'use strict';

  // ============================================
  // STATE
  // ============================================
  var state = {
    praesentationen: [],
    filter: 'alle',
    sortBy: 'datum-desc',
    searchQuery: ''
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    fetch('data/praesentationen.json')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        state.praesentationen = data.praesentationen || [];
        render();
        setupEventListeners();
        setupKeyboard();
      })
      .catch(function(err) {
        console.error('Fehler beim Laden der Präsentationen:', err);
        showEmpty('Präsentationen konnten nicht geladen werden.');
      });
  }

  // ============================================
  // RENDERING
  // ============================================
  function render() {
    var filtered = getFilteredAndSorted();
    var grid = document.getElementById('hub-grid');
    var empty = document.getElementById('hub-empty');
    var count = document.getElementById('hub-count');

    if (!grid) return;

    // Count aktualisieren
    if (count) {
      var total = state.praesentationen.length;
      if (filtered.length === total) {
        count.textContent = total + ' Präsentation' + (total !== 1 ? 'en' : '');
      } else {
        count.textContent = filtered.length + ' von ' + total + ' Präsentationen';
      }
    }

    // Filter-Buttons aktualisieren
    updateFilterButtons();

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) {
        empty.style.display = 'block';
        empty.querySelector('.hub-empty-text').textContent =
          state.searchQuery ? 'Keine Präsentationen für "' + state.searchQuery + '" gefunden.' : 'Keine Präsentationen vorhanden.';
      }
      return;
    }

    if (empty) empty.style.display = 'none';

    var html = '';
    filtered.forEach(function(p, index) {
      html += createCard(p, index + 1);
    });
    grid.innerHTML = html;

    // Event-Listener für Karten-Buttons setzen
    attachCardEvents();
  }

  function createCard(p, displayNum) {
    var isNeu = checkNeu(p.datum);
    var isArchived = p.status === 'archiviert';
    var dateStr = formatDatum(p.datum);
    var statusBadge = isArchived
      ? '<span class="hub-badge hub-badge-archiviert">Archiviert</span>'
      : '<span class="hub-badge hub-badge-aktiv">Aktiv</span>';

    // Thumbnail oder Fallback
    var thumbHtml = '<div class="hub-card-thumb-fallback">' +
      '<img src="assets/IF-logo-color.png" alt="">' +
      '<span>' + escapeHtml(p.titel) + '</span>' +
      '</div>';

    if (p.thumbnail) {
      thumbHtml = '<img src="' + escapeHtml(p.thumbnail) + '" alt="' + escapeHtml(p.titel) + '" ' +
        'onerror="this.parentNode.innerHTML=\'<div class=hub-card-thumb-fallback>' +
        '<img src=assets/IF-logo-color.png alt=><span>' + escapeHtml(p.titel).replace(/'/g, "\\'") + '</span></div>\'">';
    }

    return '<div class="hub-card' + (isArchived ? ' archived' : '') + '" data-id="' + escapeHtml(p.id) + '">' +
      '<div class="hub-card-thumb">' +
        thumbHtml +
        (isNeu ? '<div class="hub-card-badge-neu">NEU</div>' : '') +
      '</div>' +
      '<div class="hub-card-body">' +
        '<div class="hub-card-number">' + String(displayNum).padStart(2, '0') + '</div>' +
        '<h3 class="hub-card-title">' + escapeHtml(p.titel) + '</h3>' +
        '<p class="hub-card-desc">' + escapeHtml(p.beschreibung) + '</p>' +
        '<div class="hub-card-meta">' + p.slides + ' Folien' + (p.dauer ? ' · ' + p.dauer : '') + '</div>' +
        '<div class="hub-card-badges">' +
          '<span class="hub-badge hub-badge-version">v' + escapeHtml(p.version) + '</span>' +
          statusBadge +
        '</div>' +
        '<div class="hub-card-date">' + dateStr + '</div>' +
        '<a href="' + escapeHtml(p.datei) + '" class="hub-card-start" target="_blank">' +
          '▶ Präsentation starten' +
        '</a>' +
        '<div class="hub-card-actions">' +
          '<div class="hub-card-share-wrap">' +
            '<button class="hub-card-action hub-card-share-btn" data-id="' + escapeHtml(p.id) + '">' +
              '👥 Zusammenarbeiten ▾' +
            '</button>' +
            '<div class="hub-card-share-dropdown" data-dropdown="' + escapeHtml(p.id) + '">' +
              '<button class="hub-card-share-item" data-action="share" data-url="' + escapeHtml(p.datei) + '">' +
                '<span class="share-icon">🔗</span> Teilen' +
              '</button>' +
              '<button class="hub-card-share-item" data-action="qr" data-url="' + escapeHtml(p.datei) + '" data-titel="' + escapeHtml(p.titel) + '">' +
                '<span class="share-icon">📱</span> QR-Code' +
              '</button>' +
              '<button class="hub-card-share-item" data-action="export" data-url="' + escapeHtml(p.datei) + '">' +
                '<span class="share-icon">📄</span> Exportieren (PDF)' +
              '</button>' +
              '<button class="hub-card-share-item" data-action="embed" data-url="' + escapeHtml(p.datei) + '" data-titel="' + escapeHtml(p.titel) + '">' +
                '<span class="share-icon">&lt;/&gt;</span> Einbetten' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ============================================
  // FILTER & SORT
  // ============================================
  function getFilteredAndSorted() {
    var list = state.praesentationen.slice();

    // Filter
    if (state.filter === 'aktiv') {
      list = list.filter(function(p) { return p.status === 'aktiv'; });
    } else if (state.filter === 'archiviert') {
      list = list.filter(function(p) { return p.status === 'archiviert'; });
    }

    // Suche
    if (state.searchQuery) {
      var q = state.searchQuery.toLowerCase();
      list = list.filter(function(p) {
        return p.titel.toLowerCase().indexOf(q) > -1 ||
               p.beschreibung.toLowerCase().indexOf(q) > -1 ||
               (p.tags || []).join(' ').toLowerCase().indexOf(q) > -1;
      });
    }

    // Sort
    list.sort(function(a, b) {
      switch (state.sortBy) {
        case 'datum-desc': return new Date(b.datum) - new Date(a.datum);
        case 'datum-asc': return new Date(a.datum) - new Date(b.datum);
        case 'name-az': return a.titel.localeCompare(b.titel, 'de');
        case 'name-za': return b.titel.localeCompare(a.titel, 'de');
        case 'slides-desc': return (b.slides || 0) - (a.slides || 0);
        default: return 0;
      }
    });

    return list;
  }

  function updateFilterButtons() {
    var btns = document.querySelectorAll('.hub-filter-btn');
    var counts = { alle: 0, aktiv: 0, archiviert: 0 };
    state.praesentationen.forEach(function(p) {
      counts.alle++;
      if (p.status === 'aktiv') counts.aktiv++;
      else if (p.status === 'archiviert') counts.archiviert++;
    });

    btns.forEach(function(btn) {
      var f = btn.dataset.filter;
      btn.classList.toggle('active', f === state.filter);
      var countSpan = btn.querySelector('.filter-count');
      if (countSpan && counts[f] !== undefined) {
        countSpan.textContent = counts[f];
      }
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  function setupEventListeners() {
    // Filter Buttons
    var filterBtns = document.querySelectorAll('.hub-filter-btn');
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.filter = this.dataset.filter;
        render();
      });
    });

    // Sort
    var sortSelect = document.getElementById('hub-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        state.sortBy = this.value;
        render();
      });
    }

    // Suche
    var searchInput = document.getElementById('hub-search');
    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener('input', function() {
        var val = this.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          state.searchQuery = val;
          render();
        }, 150);
      });
    }

    // Klick ausserhalb schliesst Dropdowns
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.hub-card-share-wrap')) {
        closeAllDropdowns();
      }
    });

    // QR Modal schliessen
    var qrModal = document.getElementById('qr-modal');
    if (qrModal) {
      qrModal.addEventListener('click', function(e) {
        if (e.target === qrModal || e.target.classList.contains('qr-modal-close')) {
          qrModal.classList.remove('open');
        }
      });
    }
  }

  function attachCardEvents() {
    // Zusammenarbeiten Dropdown Toggle
    var shareBtns = document.querySelectorAll('.hub-card-share-btn');
    shareBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.dataset.id;
        var dropdown = document.querySelector('[data-dropdown="' + id + '"]');
        var wasOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        if (!wasOpen) dropdown.classList.add('open');
      });
    });

    // Dropdown-Items
    var shareItems = document.querySelectorAll('.hub-card-share-item');
    shareItems.forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        var action = this.dataset.action;
        var url = this.dataset.url;
        var titel = this.dataset.titel || '';
        closeAllDropdowns();

        switch (action) {
          case 'share':
            shareLink(url);
            break;
          case 'qr':
            showQR(url, titel);
            break;
          case 'export':
            exportPDF(url);
            break;
          case 'embed':
            showEmbed(url, titel);
            break;
        }
      });
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.hub-card-share-dropdown').forEach(function(d) {
      d.classList.remove('open');
    });
  }

  // ============================================
  // ACTIONS
  // ============================================
  function shareLink(relUrl) {
    var fullUrl = getFullUrl(relUrl);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(function() {
        showToast('✅ Link kopiert!');
      });
    } else {
      // Fallback
      var input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('✅ Link kopiert!');
    }
  }

  function showQR(relUrl, titel) {
    var fullUrl = getFullUrl(relUrl);
    var modal = document.getElementById('qr-modal');
    if (!modal) return;

    var titleEl = modal.querySelector('.qr-modal-title');
    var urlEl = modal.querySelector('.qr-modal-url');
    var codeEl = modal.querySelector('.qr-modal-code');

    if (titleEl) titleEl.textContent = titel || 'QR-Code';
    if (urlEl) urlEl.textContent = fullUrl;

    // QR generieren
    if (codeEl && typeof qrcode !== 'undefined') {
      var qr = qrcode(0, 'M');
      qr.addData(fullUrl);
      qr.make();
      codeEl.innerHTML = qr.createImgTag(6, 16);
    }

    modal.classList.add('open');
  }

  function exportPDF(relUrl) {
    var url = relUrl;
    if (url.indexOf('?') > -1) {
      url += '&print-pdf';
    } else {
      url += '?print-pdf';
    }
    window.open(url, '_blank');
    showToast('📄 PDF-Export wird geöffnet...');
  }

  function showEmbed(relUrl, titel) {
    var fullUrl = getFullUrl(relUrl);
    var modal = document.getElementById('qr-modal');
    if (!modal) return;

    var titleEl = modal.querySelector('.qr-modal-title');
    var subtitleEl = modal.querySelector('.qr-modal-subtitle');
    var codeEl = modal.querySelector('.qr-modal-code');
    var urlEl = modal.querySelector('.qr-modal-url');

    if (titleEl) titleEl.textContent = 'Einbetten';
    if (subtitleEl) subtitleEl.textContent = 'Kopiere diesen Code in deine Webseite:';
    if (urlEl) urlEl.textContent = '';

    var embedCode = '<iframe src="' + fullUrl + '" width="960" height="540" frameborder="0" allowfullscreen style="border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);"></iframe>';

    if (codeEl) {
      codeEl.innerHTML = '<textarea class="embed-modal-code" rows="4" readonly onclick="this.select()">' +
        escapeHtml(embedCode) + '</textarea>';
    }

    modal.classList.add('open');
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Wenn Modal offen: nur Escape
      var modal = document.getElementById('qr-modal');
      if (modal && modal.classList.contains('open')) {
        if (e.key === 'Escape') modal.classList.remove('open');
        return;
      }

      // In Input-Feldern: nur Escape
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.value = '';
          e.target.blur();
          state.searchQuery = '';
          render();
        }
        return;
      }

      // / oder Ctrl+K: Suche fokussieren
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        var search = document.getElementById('hub-search');
        if (search) search.focus();
        return;
      }

      // 1-9: Direkt Präsentation öffnen
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var num = parseInt(e.key);
        var visible = getFilteredAndSorted();
        if (num <= visible.length) {
          var p = visible[num - 1];
          window.open(p.datei, '_blank');
        }
      }
    });
  }

  // ============================================
  // HELPERS
  // ============================================
  function getFullUrl(relUrl) {
    // Auf GitHub Pages oder lokalem Server: absolute URL bauen
    var base = window.location.href.split('#')[0].split('?')[0];
    if (base.endsWith('/')) {
      return base + relUrl;
    } else {
      return base.replace(/\/[^\/]*$/, '/') + relUrl;
    }
  }

  function checkNeu(datum) {
    if (!datum) return false;
    var diff = Date.now() - new Date(datum).getTime();
    return diff < 14 * 24 * 60 * 60 * 1000;
  }

  function formatDatum(isoDate) {
    if (!isoDate) return '';
    var monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    var d = new Date(isoDate);
    return d.getDate() + '. ' + monate[d.getMonth()] + ' ' + d.getFullYear();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(text) {
    var toast = document.getElementById('hub-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 2500);
  }

  function showEmpty(text) {
    var empty = document.getElementById('hub-empty');
    if (empty) {
      empty.style.display = 'block';
      empty.querySelector('.hub-empty-text').textContent = text;
    }
  }

  // ============================================
  // START
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
