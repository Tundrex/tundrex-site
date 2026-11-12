/* ============================================
   TUNDREX — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll effect ── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /* ── Mobile nav toggle ── */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.nav-mobile');
  const mobileClose = document.querySelector('.nav-mobile-close');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (mobileClose && mobileNav) {
    mobileClose.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll animations (IntersectionObserver) ── */
  const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px -20px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all fade-up and fade-in elements
  document.querySelectorAll('.fade-up, .fade-in').forEach(el => {
    observer.observe(el);
  });

  /* ── Immediately reveal elements already in the viewport ── */
  const revealInView = () => {
    document.querySelectorAll('.fade-up, .fade-in').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 50 && rect.bottom >= 0) {
        el.classList.add('visible');
      }
    });
  };
  revealInView();

  /* ── Safety fallback: reveal everything after 1.5s ── */
  setTimeout(() => {
    document.querySelectorAll('.fade-up, .fade-in').forEach(el => {
      if (!el.classList.contains('visible')) {
        el.classList.add('visible');
      }
    });
  }, 1500);

  /* ── Hero elements animate in on load ── */
  const heroEls = document.querySelectorAll('.hero-animate');
  heroEls.forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 200 + i * 150);
  });

  /* ── Counter animation for gut stats ── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-count'));
          const suffix = el.getAttribute('data-suffix') || '';
          const prefix = el.getAttribute('data-prefix') || '';
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const isDecimal = target % 1 !== 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
          }, duration / steps);

          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  /* ── Smooth reveal for product cards (unified with main observer) ── */
  // Note: product-card, why-card, sign-item elements that don't already have fade-up
  // will be observed here. We don't double-add fade-up if already present.
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

  document.querySelectorAll('.product-card, .why-card, .sign-item').forEach(card => {
    if (!card.classList.contains('fade-up')) {
      card.classList.add('fade-up');
    }
    cardObserver.observe(card);
  });

  /* ── Active nav link ── */
  const currentPath = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.style.color = 'var(--frost-blue)';
    }
  });

  /* ── Form submission (demo) ── */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.form-submit');
      const original = btn.textContent;
      btn.textContent = '✓ Message Sent!';
      btn.style.background = 'linear-gradient(135deg, #2ecc71, #1a9456)';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.disabled = false;
        contactForm.reset();
      }, 3000);
    });
  }

  /* ── Lightbox for protocol images ── */
  const lightbox = document.createElement('div');
  lightbox.id = 'tundrex-lightbox';
  lightbox.innerHTML = `
    <div id="tundrex-lightbox-backdrop"></div>
    <div id="tundrex-lightbox-content">
      <button id="tundrex-lightbox-close" aria-label="Close">✕</button>
      <img id="tundrex-lightbox-img" src="" alt="" />
    </div>
  `;
  document.body.appendChild(lightbox);

  const lbClose = document.getElementById('tundrex-lightbox-close');
  const lbBackdrop = document.getElementById('tundrex-lightbox-backdrop');
  const lbImg = document.getElementById('tundrex-lightbox-img');

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

  // Attach lightbox to protocol images
  document.querySelectorAll('.protocol-card-shop-img, .protocol-img-enlarge').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(img.src, img.alt);
    });
  });

});

/* ── Also run revealInView on scroll (for late-loading pages) ── */
window.addEventListener('scroll', () => {
  document.querySelectorAll('.fade-up:not(.visible), .fade-in:not(.visible)').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 50 && rect.bottom >= 0) {
      el.classList.add('visible');
    }
  });
}, { passive: true });
