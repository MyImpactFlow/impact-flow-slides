/**
 * Impact Flow Presentation Framework
 * JavaScript-Hilfsfunktionen für erweiterte Features
 */

(function() {
  'use strict';

  // ============================================
  // CUSTOM BOTTOM NAVIGATION
  // Pfeil links + Logo/Foliennummer zentriert + Pfeil rechts
  // Ersetzt die Standard reveal.js Controls & Slide-Number
  // ============================================
  function addBottomNav() {
    if (window.location.search.indexOf('print-pdf') > -1) return;
    if (document.getElementById('if-bottom-nav')) return;

    var nav = document.createElement('div');
    nav.id = 'if-bottom-nav';

    // Logo-Pfad je nach Verzeichnis
    var path = window.location.pathname;
    var logoSrc = (path.indexOf('/praesentationen/') > -1 || path.split('/').filter(Boolean).length > 1)
      ? '../assets/IF-logo-color.png'
      : 'assets/IF-logo-color.png';

    // Linker Pfeil
    var prevBtn = document.createElement('button');
    prevBtn.id = 'if-nav-prev';
    prevBtn.className = 'nav-arrow nav-prev';
    prevBtn.setAttribute('aria-label', 'Vorherige Folie');
    prevBtn.addEventListener('click', function() { Reveal.prev(); });

    // Rechter Pfeil
    var nextBtn = document.createElement('button');
    nextBtn.id = 'if-nav-next';
    nextBtn.className = 'nav-arrow nav-next';
    nextBtn.setAttribute('aria-label', 'Nächste Folie');
    nextBtn.addEventListener('click', function() { Reveal.next(); });

    // Mitte: Logo + Foliennummer
    var center = document.createElement('div');
    center.className = 'nav-center';

    var logo = document.createElement('img');
    logo.className = 'nav-logo';
    logo.src = logoSrc;
    logo.alt = 'Impact Flow';
    center.appendChild(logo);

    var number = document.createElement('span');
    number.id = 'if-nav-number';
    number.className = 'nav-number';
    center.appendChild(number);

    nav.appendChild(prevBtn);
    nav.appendChild(center);
    nav.appendChild(nextBtn);
    document.body.appendChild(nav);

    // Initialen Stand + auf Folienwechsel reagieren
    updateBottomNav();
    Reveal.on('slidechanged', updateBottomNav);
  }

  function updateBottomNav() {
    var state = Reveal.getState();
    var total = document.querySelectorAll('.reveal .slides > section').length;
    var current = state.indexh + 1;

    var numEl = document.getElementById('if-nav-number');
    if (numEl) numEl.textContent = current;

    var prevBtn = document.getElementById('if-nav-prev');
    var nextBtn = document.getElementById('if-nav-next');

    if (prevBtn) {
      if (current <= 1) prevBtn.classList.add('disabled');
      else prevBtn.classList.remove('disabled');
    }
    if (nextBtn) {
      if (current >= total) nextBtn.classList.add('disabled');
      else nextBtn.classList.remove('disabled');
    }
  }

  // ============================================
  // STAGGERED ANIMATIONS
  // ============================================
  function setupStaggeredAnimations() {
    var staggerGroups = document.querySelectorAll('[data-stagger]');
    staggerGroups.forEach(function(group) {
      var delay = parseInt(group.dataset.stagger) || 200;
      var items = group.querySelectorAll('.fragment');
      items.forEach(function(item, index) {
        item.style.transitionDelay = (index * delay) + 'ms';
      });
    });
  }

  // ============================================
  // AUTO-ANIMATE NUMBER COUNTER
  // ============================================
  function setupCounters() {
    var counters = document.querySelectorAll('[data-count-to]');
    counters.forEach(function(counter) {
      var suffix = counter.dataset.countSuffix || '';
      var prefix = counter.dataset.countPrefix || '';
      counter._counted = false;
      counter.textContent = prefix + '0' + suffix;
    });
  }

  function animateCounters() {
    var counters = document.querySelectorAll('[data-count-to]');
    counters.forEach(function(counter) {
      if (counter._counted) return;
      var slide = counter.closest('section');
      if (!slide || !slide.classList.contains('present')) return;

      counter._counted = true;
      var target = parseInt(counter.dataset.countTo);
      var duration = parseInt(counter.dataset.countDuration) || 2000;
      var suffix = counter.dataset.countSuffix || '';
      var prefix = counter.dataset.countPrefix || '';
      var start = 0;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(start + (target - start) * eased);
        counter.textContent = prefix + current.toLocaleString('de-CH') + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // ============================================
  // TYPEWRITER EFFECT
  // ============================================
  function setupTypewriter() {
    var elements = document.querySelectorAll('[data-typewriter]');
    elements.forEach(function(el) {
      el._originalText = el.textContent;
      el.textContent = '';
      el._typed = false;
    });
  }

  function triggerTypewriter(el) {
    if (el._typed) return;
    el._typed = true;
    var text = el._originalText;
    var speed = parseInt(el.dataset.typewriter) || 50;
    var index = 0;
    function type() {
      if (index < text.length) {
        el.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  // ============================================
  // PDF EXPORT HELPER
  // ============================================
  window.ImpactFlowPDF = {
    exportPDF: function() {
      var url = window.location.href.split('#')[0];
      if (url.indexOf('?') > -1) {
        url += '&print-pdf';
      } else {
        url += '?print-pdf';
      }
      window.open(url, '_blank');
    }
  };

  // ============================================
  // SLIDE NAVIGATOR (NEU)
  // Menü zum direkten Springen zu jeder Folie
  // Tastenkürzel: M oder Taste drücken
  // ============================================
  var navigatorOpen = false;
  var navigatorEl = null;

  function getSlideTitle(slide) {
    // Versuche einen Titel aus der Slide zu extrahieren
    var h = slide.querySelector('h1') || slide.querySelector('h2') || slide.querySelector('h3');
    if (h) return h.innerText.trim().replace(/\s+/g, ' ').substring(0, 60);

    // Fallback: Badge/Label Text
    var badge = slide.querySelector('.badge, .top-label');
    if (badge) return badge.textContent.trim();

    return 'Folie';
  }

  function getSlideType(slide) {
    if (slide.classList.contains('slide-title')) return '🎯';
    if (slide.classList.contains('slide-section')) return '📌';
    if (slide.classList.contains('slide-stats')) return '📊';
    if (slide.classList.contains('slide-quote')) return '💬';
    if (slide.classList.contains('slide-cta')) return '🚀';
    if (slide.classList.contains('slide-icon-list')) return '📋';
    if (slide.classList.contains('slide-timeline') || slide.querySelector('.timeline')) return '🔄';
    return '📄';
  }

  function createNavigator() {
    // Overlay-Container
    navigatorEl = document.createElement('div');
    navigatorEl.id = 'if-navigator';
    navigatorEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(45,45,45,0.95)', 'z-index:1000',
      'display:none', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)'
    ].join(';');

    // Innerer Container
    var inner = document.createElement('div');
    inner.style.cssText = [
      'background:white', 'border-radius:20px', 'padding:32px',
      'max-width:800px', 'width:90%', 'max-height:80vh',
      'overflow-y:auto', 'box-shadow:0 24px 80px rgba(0,0,0,0.3)',
      'font-family:Inter,-apple-system,sans-serif'
    ].join(';');

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;';
    header.innerHTML = '<div style="font-size:20px;font-weight:700;color:#2d2d2d;">📑 Foliennavigation</div>' +
      '<div style="display:flex;gap:12px;align-items:center;">' +
      '<span style="font-size:12px;color:#888;background:#f5f5f5;padding:4px 10px;border-radius:6px;">M oder ESC zum Schliessen</span>' +
      '<button id="if-nav-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#888;padding:4px;">✕</button>' +
      '</div>';
    inner.appendChild(header);

    // Suchfeld
    var searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'margin-bottom:20px;';
    searchWrap.innerHTML = '<input id="if-nav-search" type="text" placeholder="Folie suchen oder Nummer eingeben..." ' +
      'style="width:100%;padding:12px 16px;border:2px solid #e0e0e0;border-radius:12px;font-size:15px;' +
      'font-family:Inter,sans-serif;outline:none;box-sizing:border-box;transition:border-color 0.2s;">';
    inner.appendChild(searchWrap);

    // Folien-Liste
    var list = document.createElement('div');
    list.id = 'if-nav-list';
    list.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    inner.appendChild(list);

    navigatorEl.appendChild(inner);
    document.body.appendChild(navigatorEl);

    // Event: Overlay-Klick schliesst
    navigatorEl.addEventListener('click', function(e) {
      if (e.target === navigatorEl) closeNavigator();
    });

    // Scroll-Events blockieren: Document-Level Capture — feuert VOR reveal.js
    document.addEventListener('wheel', function(e) {
      if (navigatorOpen) {
        e.stopImmediatePropagation(); // Blockiert reveal.js
        // KEIN preventDefault() → erlaubt natives Scrollen im Navigator
      }
    }, true);
    document.addEventListener('touchmove', function(e) {
      if (navigatorOpen) {
        e.stopImmediatePropagation();
      }
    }, true);

    // Event: Close-Button
    navigatorEl.querySelector('#if-nav-close').addEventListener('click', closeNavigator);

    // Event: Suchfeld mit Nummern-Direktsprung
    var searchInput = navigatorEl.querySelector('#if-nav-search');
    searchInput.addEventListener('input', function() {
      var val = this.value.trim();
      var totalSlides = document.querySelectorAll('.reveal .slides > section').length;

      // Nummern-Erkennung: Wenn nur eine Zahl eingegeben wird
      if (/^\d+$/.test(val)) {
        var num = parseInt(val);
        if (num >= 1 && num <= totalSlides) {
          // Alle ausblenden, nur diese Folie zeigen + hervorheben
          filterByNumber(num);
          showNumberHint(num, totalSlides);
          return;
        }
      }
      hideNumberHint();
      filterSlides(val.toLowerCase());
    });
    searchInput.addEventListener('keydown', function(e) {
      // Enter: Bei Nummern-Eingabe direkt zur Folie springen
      if (e.key === 'Enter') {
        var val = this.value.trim();
        if (/^\d+$/.test(val)) {
          var num = parseInt(val);
          var totalSlides = document.querySelectorAll('.reveal .slides > section').length;
          if (num >= 1 && num <= totalSlides) {
            Reveal.slide(num - 1);
            closeNavigator();
            return;
          }
        }
        // Sonst: Wenn nur eine Folie sichtbar, diese anspringen
        var visible = document.querySelectorAll('.if-nav-item[style*="display: flex"], .if-nav-item:not([style*="display: none"])');
        var reallyVisible = [];
        visible.forEach(function(item) {
          if (item.style.display !== 'none') reallyVisible.push(item);
        });
        if (reallyVisible.length === 1) {
          reallyVisible[0].click();
        }
      }
    });
    searchInput.addEventListener('focus', function() {
      this.style.borderColor = '#f29cb6';
    });
    searchInput.addEventListener('blur', function() {
      this.style.borderColor = '#e0e0e0';
    });
  }

  function populateNavigator() {
    var list = document.getElementById('if-nav-list');
    if (!list) return;
    list.innerHTML = '';

    var slides = document.querySelectorAll('.reveal .slides > section');
    var currentIndex = Reveal.getState().indexh;

    slides.forEach(function(slide, index) {
      var title = getSlideTitle(slide);
      var icon = getSlideType(slide);
      var isCurrent = (index === currentIndex);

      var item = document.createElement('button');
      item.className = 'if-nav-item';
      item.dataset.index = index;
      item.dataset.search = title.toLowerCase();
      item.style.cssText = [
        'display:flex', 'align-items:center', 'gap:14px',
        'padding:12px 16px', 'border:none', 'border-radius:12px',
        'cursor:pointer', 'text-align:left', 'width:100%',
        'font-family:Inter,sans-serif', 'transition:all 0.15s',
        'background:' + (isCurrent ? '#fef5f7' : 'transparent'),
        'border-left:3px solid ' + (isCurrent ? '#f29cb6' : 'transparent')
      ].join(';');

      // Nummer
      var num = document.createElement('span');
      num.style.cssText = 'flex-shrink:0;width:32px;height:32px;border-radius:8px;' +
        'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;' +
        'background:' + (isCurrent ? 'linear-gradient(135deg,#f29cb6,#e8799e)' : '#f5f5f5') + ';' +
        'color:' + (isCurrent ? 'white' : '#888') + ';';
      num.textContent = (index + 1);
      item.appendChild(num);

      // Icon
      var iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'font-size:18px;flex-shrink:0;';
      iconSpan.textContent = icon;
      item.appendChild(iconSpan);

      // Titel
      var titleSpan = document.createElement('span');
      titleSpan.style.cssText = 'font-size:14px;color:#2d2d2d;font-weight:' + (isCurrent ? '600' : '400') + ';' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
      titleSpan.textContent = title;
      item.appendChild(titleSpan);

      // Hover-Effekt
      item.addEventListener('mouseenter', function() {
        if (!isCurrent) this.style.background = '#f9f9f9';
      });
      item.addEventListener('mouseleave', function() {
        if (!isCurrent) this.style.background = 'transparent';
      });

      // Klick → Slide anspringen
      item.addEventListener('click', function() {
        Reveal.slide(index);
        closeNavigator();
      });

      list.appendChild(item);
    });
  }

  function filterSlides(query) {
    var items = document.querySelectorAll('.if-nav-item');
    items.forEach(function(item) {
      if (!query || item.dataset.search.indexOf(query) > -1) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  function filterByNumber(num) {
    var items = document.querySelectorAll('.if-nav-item');
    items.forEach(function(item) {
      var slideNum = parseInt(item.dataset.index) + 1;
      if (slideNum === num) {
        item.style.display = 'flex';
        item.style.background = '#fef5f7';
        item.style.borderLeft = '3px solid #f29cb6';
      } else {
        item.style.display = 'none';
      }
    });
  }

  function showNumberHint(num, total) {
    var hint = document.getElementById('if-nav-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'if-nav-hint';
      hint.style.cssText = 'text-align:center;padding:10px;color:#6bb8a8;font-size:13px;font-weight:600;';
      var list = document.getElementById('if-nav-list');
      if (list) list.parentNode.insertBefore(hint, list);
    }
    hint.style.display = 'block';
    hint.textContent = '↵ Enter drücken → Folie ' + num + ' von ' + total;
  }

  function hideNumberHint() {
    var hint = document.getElementById('if-nav-hint');
    if (hint) hint.style.display = 'none';
  }

  function openNavigator() {
    if (navigatorOpen) return;
    navigatorOpen = true;
    // Reveal.js komplett deaktivieren während Navigator offen
    if (typeof Reveal !== 'undefined') {
      Reveal.configure({ keyboard: false, touch: false });
    }
    populateNavigator();
    navigatorEl.style.display = 'flex';
    // Suchfeld fokussieren
    setTimeout(function() {
      var input = document.getElementById('if-nav-search');
      if (input) { input.value = ''; input.focus(); }
    }, 100);
  }

  function closeNavigator() {
    navigatorOpen = false;
    navigatorEl.style.display = 'none';
    hideNumberHint();
    // Reveal.js wieder aktivieren
    if (typeof Reveal !== 'undefined') {
      Reveal.configure({ keyboard: true, touch: true });
    }
  }

  function toggleNavigator() {
    if (navigatorOpen) closeNavigator();
    else openNavigator();
  }

  // ============================================
  // KEYBOARD SHORTCUTS (capture phase — vor reveal.js)
  // ============================================
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // M: Slide Navigator öffnen/schliessen
      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toggleNavigator();
          return;
        }
      }

      // ESC: Navigator schliessen (wenn offen)
      if (e.key === 'Escape' && navigatorOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeNavigator();
        return;
      }

      // Wenn Navigator offen: Reveal.js ist via configure() deaktiviert,
      // daher kein aggressives Event-Blocking nötig — Tastatur-Events
      // fliessen normal zum Suchfeld (Enter, Backspace etc.)
      if (navigatorOpen) {
        return; // Nichts blockieren, Reveal ist bereits deaktiviert
      }

      // Ctrl+E: PDF Export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        ImpactFlowPDF.exportPDF();
      }
    }, true); // capture: true — feuert VOR reveal.js
  }

  // ============================================
  // SPEAKER NOTES HELPER
  // ============================================
  function setupSpeakerNotes() {
    var notes = document.querySelectorAll('aside.notes');
    notes.forEach(function(note) {
      note.style.display = 'none';
    });
  }

  // ============================================
  // TOOLBAR (oben rechts)
  // ============================================
  var zusammenarbeitenOpen = false;

  function createToolbar() {
    var toolbar = document.createElement('div');
    toolbar.id = 'if-toolbar';
    toolbar.style.cssText = 'position:fixed;top:15px;right:15px;z-index:100;display:flex;gap:8px;opacity:0.4;transition:opacity 0.3s;';
    toolbar.addEventListener('mouseenter', function() { toolbar.style.opacity = '1'; });
    toolbar.addEventListener('mouseleave', function() { toolbar.style.opacity = '0.4'; });

    var btnStyle = 'padding:6px 14px;color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;';

    // Navigator Button
    var navBtn = document.createElement('button');
    navBtn.textContent = '☰ Menü';
    navBtn.title = 'Foliennavigation (M)';
    navBtn.style.cssText = btnStyle + 'background:#2d2d2d;';
    navBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      toggleNavigator();
    });
    toolbar.appendChild(navBtn);

    // Zusammenarbeiten Dropdown
    var shareWrap = document.createElement('div');
    shareWrap.style.cssText = 'position:relative;';

    var shareBtn = document.createElement('button');
    shareBtn.textContent = '👥 Zusammenarbeiten ▾';
    shareBtn.title = 'Teilen, QR-Code, Export, Einbetten';
    shareBtn.style.cssText = btnStyle + 'background:#6bb8a8;';
    shareBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      toggleZusammenarbeiten();
    });
    shareWrap.appendChild(shareBtn);

    // Dropdown-Menü
    var dropdown = document.createElement('div');
    dropdown.id = 'if-zusammenarbeiten-dropdown';
    dropdown.style.cssText = [
      'position:absolute', 'top:calc(100% + 8px)', 'right:0', 'min-width:220px',
      'background:white', 'border-radius:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.18)', 'border:1px solid #e8e8e8',
      'overflow:hidden', 'z-index:200', 'display:none',
      'font-family:Inter,-apple-system,sans-serif'
    ].join(';');

    var dropdownItems = [
      { icon: '🔗', label: 'Teilen', action: 'share' },
      { icon: '📱', label: 'QR-Code', action: 'qr' },
      { icon: '📄', label: 'Exportieren (PDF)', action: 'export' },
      { icon: '</>', label: 'Einbetten', action: 'embed' }
    ];

    dropdownItems.forEach(function(item) {
      var btn = document.createElement('button');
      btn.style.cssText = [
        'display:flex', 'align-items:center', 'gap:10px',
        'padding:12px 16px', 'font-size:13px', 'font-weight:500',
        'color:#2d2d2d', 'cursor:pointer', 'transition:background 0.15s',
        'border:none', 'background:none', 'width:100%',
        'font-family:Inter,sans-serif', 'text-align:left'
      ].join(';');
      btn.innerHTML = '<span style="font-size:16px;width:20px;text-align:center;">' + item.icon + '</span> ' + item.label;
      btn.addEventListener('mouseenter', function() { this.style.background = '#fef5f7'; });
      btn.addEventListener('mouseleave', function() { this.style.background = 'none'; });
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeZusammenarbeiten();
        handleToolbarAction(item.action);
      });
      dropdown.appendChild(btn);
    });

    shareWrap.appendChild(dropdown);
    toolbar.appendChild(shareWrap);

    // Fullscreen Button
    var fsBtn = document.createElement('button');
    fsBtn.textContent = 'Fullscreen';
    fsBtn.title = 'Vollbild (F)';
    fsBtn.style.cssText = btnStyle + 'background:#9dd3c7;';
    fsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    toolbar.appendChild(fsBtn);

    if (window.location.search.indexOf('print-pdf') === -1) {
      document.body.appendChild(toolbar);
    }

    // Klick ausserhalb schliesst Dropdown
    document.addEventListener('click', function() {
      closeZusammenarbeiten();
    });
  }

  function toggleZusammenarbeiten() {
    var dd = document.getElementById('if-zusammenarbeiten-dropdown');
    if (!dd) return;
    zusammenarbeitenOpen = !zusammenarbeitenOpen;
    dd.style.display = zusammenarbeitenOpen ? 'block' : 'none';
  }

  function closeZusammenarbeiten() {
    zusammenarbeitenOpen = false;
    var dd = document.getElementById('if-zusammenarbeiten-dropdown');
    if (dd) dd.style.display = 'none';
  }

  function handleToolbarAction(action) {
    var url = window.location.href.split('#')[0];

    switch (action) {
      case 'share':
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function() {
            showToolbarToast('✅ Link kopiert!');
          });
        } else {
          var input = document.createElement('input');
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
          showToolbarToast('✅ Link kopiert!');
        }
        break;

      case 'qr':
        showToolbarQR(url);
        break;

      case 'export':
        ImpactFlowPDF.exportPDF();
        showToolbarToast('📄 PDF-Export wird geöffnet...');
        break;

      case 'embed':
        showToolbarEmbed(url);
        break;
    }
  }

  function showToolbarToast(text) {
    var existing = document.getElementById('if-toolbar-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'if-toolbar-toast';
    toast.textContent = text;
    toast.style.cssText = [
      'position:fixed', 'bottom:30px', 'left:50%',
      'transform:translateX(-50%)', 'background:#2d2d2d', 'color:white',
      'padding:12px 24px', 'border-radius:999px', 'font-size:14px',
      'font-weight:600', 'z-index:2000', 'font-family:Inter,sans-serif',
      'animation:if-toast-in 0.3s ease'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  function showToolbarQR(url) {
    var existing = document.getElementById('if-toolbar-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'if-toolbar-modal';
    modal.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(45,45,45,0.85)', 'z-index:1500',
      'display:flex', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)'
    ].join(';');

    var content = document.createElement('div');
    content.style.cssText = [
      'background:white', 'border-radius:24px', 'padding:40px',
      'text-align:center', 'max-width:400px', 'width:90%',
      'box-shadow:0 24px 80px rgba(0,0,0,0.3)',
      'font-family:Inter,-apple-system,sans-serif'
    ].join(';');

    // QR über API generieren (kein externes Script nötig)
    var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);

    content.innerHTML = '<h3 style="font-size:18px;font-weight:700;color:#2d2d2d;margin-bottom:8px;">📱 QR-Code</h3>' +
      '<p style="font-size:13px;color:#888;margin-bottom:24px;">Scanne den Code, um die Präsentation zu öffnen:</p>' +
      '<img src="' + qrImgUrl + '" alt="QR Code" style="border-radius:8px;margin-bottom:20px;">' +
      '<div style="font-size:12px;color:#888;word-break:break-all;padding:10px 14px;background:#fafafa;border-radius:8px;margin-bottom:20px;">' + url + '</div>' +
      '<button id="if-modal-close" style="padding:10px 28px;background:linear-gradient(135deg,#f29cb6,#e8799e);color:white;border:none;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">Schliessen</button>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
      if (e.target === modal || e.target.id === 'if-modal-close') {
        modal.remove();
      }
    });
  }

  function showToolbarEmbed(url) {
    var existing = document.getElementById('if-toolbar-modal');
    if (existing) existing.remove();

    var embedCode = '<iframe src="' + url + '" width="960" height="540" frameborder="0" allowfullscreen style="border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);"></iframe>';

    var modal = document.createElement('div');
    modal.id = 'if-toolbar-modal';
    modal.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(45,45,45,0.85)', 'z-index:1500',
      'display:flex', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)'
    ].join(';');

    var content = document.createElement('div');
    content.style.cssText = [
      'background:white', 'border-radius:24px', 'padding:40px',
      'text-align:center', 'max-width:480px', 'width:90%',
      'box-shadow:0 24px 80px rgba(0,0,0,0.3)',
      'font-family:Inter,-apple-system,sans-serif'
    ].join(';');

    content.innerHTML = '<h3 style="font-size:18px;font-weight:700;color:#2d2d2d;margin-bottom:8px;">&lt;/&gt; Einbetten</h3>' +
      '<p style="font-size:13px;color:#888;margin-bottom:20px;">Kopiere diesen Code in deine Webseite:</p>' +
      '<textarea id="if-embed-code" rows="4" readonly style="width:100%;font-family:SF Mono,Fira Code,monospace;font-size:12px;padding:14px;border:2px solid #e8e8e8;border-radius:8px;background:#fafafa;color:#2d2d2d;resize:none;outline:none;box-sizing:border-box;margin-bottom:16px;">' +
      embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button id="if-embed-copy" style="padding:10px 24px;background:linear-gradient(135deg,#9dd3c7,#6bb8a8);color:white;border:none;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">Kopieren</button>' +
      '<button id="if-modal-close" style="padding:10px 24px;background:#f0f0f0;color:#555;border:none;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">Schliessen</button>' +
      '</div>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Code auswählen bei Klick auf Textarea
    var textarea = modal.querySelector('#if-embed-code');
    textarea.addEventListener('click', function() { this.select(); });

    // Kopieren Button
    modal.querySelector('#if-embed-copy').addEventListener('click', function() {
      textarea.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(embedCode).then(function() {
          showToolbarToast('✅ Code kopiert!');
        });
      } else {
        document.execCommand('copy');
        showToolbarToast('✅ Code kopiert!');
      }
    });

    modal.addEventListener('click', function(e) {
      if (e.target === modal || e.target.id === 'if-modal-close') {
        modal.remove();
      }
    });
  }

  // ============================================
  // INITIALIZE
  // ============================================
  function init() {
    addBottomNav();
    setupStaggeredAnimations();
    setupCounters();
    setupTypewriter();
    setupKeyboardShortcuts();
    setupSpeakerNotes();
    createToolbar();
    createNavigator();

    if (typeof Reveal !== 'undefined') {
      Reveal.on('slidechanged', function(event) {
        animateCounters();
        var typewriters = event.currentSlide.querySelectorAll('[data-typewriter]');
        typewriters.forEach(function(el) { triggerTypewriter(el); });
      });
      animateCounters();
    }
  }

  // Warten bis DOM und Reveal.js bereit sind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }

})();
