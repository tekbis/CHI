/* =============================================================================
   CHI CMS — field map
   The single source of truth for what is editable on the site.

   The live site reads this to know WHERE to put each value (selectors).
   The dashboard reads this to know WHAT to show (groups, labels, types).

   Nothing here touches index.html, so the markup stays exactly as designed.

   type:  text  -> element.textContent
          html  -> element.innerHTML (use only for copy with inline markup)
          image -> element.src (and the dashboard offers an uploader)
          attr  -> a named attribute (href, alt, content...)
          data  -> not in the DOM; handed to app.js (service copy, region names)
   sel:   one CSS selector, or an array when the same value appears in
          several places (phone number, logo, ...). Missing nodes are skipped,
          so the same map works on the homepage and the booking page.
============================================================================= */
(function (root) {
  "use strict";

  var MAP = {
    /* ---------------------------------------------------------- business */
    business: {
      label: "Business details",
      icon: "building",
      fields: [
        { path: "business.phone", label: "Phone number", type: "text",
          sel: [".header-phone span", ".quick-booking-copy a strong", ".phone-card strong",
                ".footer-phone", ".mobile-call-bar strong", ".booking-contact-card a"] },
        { path: "business.phoneHref", label: "Phone link (tel:)", type: "attr", attr: "href",
          hint: "Digits only, e.g. +13017886608",
          sel: ['a[href^="tel:"]'], all: true },
        { path: "business.logo", label: "Logo", type: "image",
          sel: [".brand-image-wrap img", ".footer-brand img"] },
        { path: "business.utility1", label: "Top bar — item 1", type: "text",
          sel: [".header-utility-inner span:nth-child(1)"] },
        { path: "business.utility2", label: "Top bar — item 2", type: "text",
          sel: [".header-utility-inner span:nth-child(2)"] },
        { path: "business.utility3", label: "Top bar — item 3", type: "text",
          sel: [".header-utility-inner span:nth-child(3)"] },
        { path: "business.utility4", label: "Top bar — item 4", type: "text",
          sel: [".header-utility-note"] },
        { path: "business.callButton", label: "Header 'Call us' button", type: "text",
          sel: [".header-call-button"] },
        { path: "business.mobileBarLabel", label: "Mobile bar label", type: "text",
          sel: [".mobile-call-bar span"] }
      ]
    },

    /* -------------------------------------------------------------- SEO */
    seo: {
      label: "Page title & SEO",
      icon: "search",
      fields: [
        { path: "seo.title", label: "Browser tab title", type: "text", sel: ["title"] },
        { path: "seo.description", label: "Search description", type: "attr", attr: "content",
          multiline: true, sel: ['meta[name="description"]'] }
      ]
    },

    /* ------------------------------------------------------------- hero */
    hero: {
      label: "Hero (top banner)",
      icon: "image",
      page: "home",
      fields: [
        { path: "hero.overline", label: "Small line above heading", type: "text", sel: [".hero-overline"] },
        { path: "hero.title", label: "Main heading", type: "html", multiline: true,
          hint: "Wrap the light-blue part in <em>…</em>", sel: [".hero-copy h1"] },
        { path: "hero.subline", label: "Sub-heading", type: "text", sel: [".hero-subline"] },
        { path: "hero.lede", label: "Intro paragraph", type: "text", multiline: true, sel: [".hero-lede"] },
        { path: "hero.btnPrimary", label: "Green button text", type: "text", sel: [".hero-buttons .button-lime"] },
        { path: "hero.btnSecondary", label: "Outline button text", type: "text", sel: [".hero-buttons .button-white"] },
        { path: "hero.slide1", label: "Background image 1", type: "image", sel: [".hero-slide:nth-of-type(1)"] },
        { path: "hero.slide2", label: "Background image 2", type: "image", sel: [".hero-slide:nth-of-type(2)"] },
        { path: "hero.slide3", label: "Background image 3", type: "image", sel: [".hero-slide:nth-of-type(3)"] },
        { path: "hero.slide4", label: "Background image 4", type: "image", sel: [".hero-slide:nth-of-type(4)"] }
      ]
    },

    /* ------------------------------------------------------- trust strip */
    trust: {
      label: "Trust badges",
      icon: "badge",
      page: "home",
      repeat: { count: 4, base: ".trust-grid > div" },
      repeatFields: [
        { path: "trust.#.big",   label: "Big text",   type: "text", sel: [".trust-grid > div:nth-child(#) .trust-icon b"] },
        { path: "trust.#.small", label: "Small text", type: "text", sel: [".trust-grid > div:nth-child(#) .trust-icon small"] },
        { path: "trust.#.title", label: "Title",      type: "text", sel: [".trust-grid > div:nth-child(#) p strong"] },
        { path: "trust.#.desc",  label: "Description",type: "text", sel: [".trust-grid > div:nth-child(#) p small"] }
      ]
    },

    /* --------------------------------------------------- booking section */
    booking: {
      label: "Booking form section",
      icon: "form",
      page: "home",
      fields: [
        { path: "booking.eyebrow", label: "Small label", type: "text", sel: [".quick-booking-copy .eyebrow"], keepFirstChild: true },
        { path: "booking.title", label: "Heading", type: "text", sel: [".quick-booking-copy h2"] },
        { path: "booking.text", label: "Paragraph", type: "text", multiline: true, sel: [".quick-booking-copy > p:not(.eyebrow)"] },
        { path: "booking.callLabel", label: "'Prefer to call?' label", type: "text", sel: [".quick-booking-copy a span"] },
        { path: "booking.note", label: "Note under the form", type: "text", sel: [".quick-form-note"] }
      ]
    },

    /* ----------------------------------------------------------- services */
    services: {
      label: "Services",
      icon: "list",
      page: "home",
      fields: [
        { path: "services.eyebrow", label: "Small label", type: "text", sel: [".services-section .eyebrow"], keepFirstChild: true },
        { path: "services.title", label: "Heading", type: "text", sel: [".services-section .section-heading h2"] },
        { path: "services.intro", label: "Intro paragraph", type: "text", multiline: true,
          sel: [".services-section .section-heading > p:not(.eyebrow)"] }
      ],
      items: {
        key: "services.items",
        /* ids are fixed because app.js wires the list to them */
        ids: ["home", "radon", "mold", "water", "termite", "thermal"],
        fields: [
          { k: "title", label: "Service name", type: "text", sel: '.service-row[data-service="$"] .service-main strong' },
          { k: "desc",  label: "One-line summary", type: "text", sel: '.service-row[data-service="$"] .service-main small' },
          { k: "image", label: "Photo", type: "image", sel: '[data-preview-image="$"]' },
          { k: "kicker", label: "Panel label", type: "data" },
          { k: "panelTitle", label: "Panel heading", type: "data" },
          { k: "copy", label: "Panel paragraph", type: "data", multiline: true },
          { k: "points", label: "Bullet points", type: "datalist" },
          { k: "alt", label: "Photo description (accessibility)", type: "data" }
        ]
      }
    },

    /* ------------------------------------------------------------ gallery */
    gallery: {
      label: "Photo gallery",
      icon: "gallery",
      page: "home",
      fields: [
        { path: "gallery.eyebrow", label: "Small label", type: "text",
          sel: [".inspection-gallery-section .eyebrow"], keepFirstChild: true },
        { path: "gallery.title", label: "Heading", type: "text", sel: ["#inspection-gallery-title"] },
        { path: "gallery.intro", label: "Intro paragraph", type: "text", multiline: true,
          sel: [".inspection-gallery-section .section-heading > p:not(.eyebrow)"] }
      ],
      repeat: { count: 3, base: ".inspection-gallery .gallery-card" },
      repeatFields: [
        { path: "gallery.cards.#.image", label: "Photo", type: "image",
          sel: [".inspection-gallery .gallery-card:nth-of-type(#) img"] },
        { path: "gallery.cards.#.tag", label: "Tag", type: "text",
          sel: [".inspection-gallery .gallery-card:nth-of-type(#) div span"] },
        { path: "gallery.cards.#.title", label: "Caption", type: "text",
          sel: [".inspection-gallery .gallery-card:nth-of-type(#) div h3"] }
      ]
    },

    /* ------------------------------------------------------------ reports */
    report: {
      label: "Reports section",
      icon: "doc",
      page: "home",
      fields: [
        { path: "report.image", label: "Photo", type: "image", sel: [".report-photo-main > img"] },
        { path: "report.labelKicker", label: "Photo label — small", type: "text", sel: [".report-photo-label span"] },
        { path: "report.labelTitle", label: "Photo label — bold", type: "text", sel: [".report-photo-label strong"] },
        { path: "report.labelText", label: "Photo label — text", type: "text", multiline: true, sel: [".report-photo-label p"] },
        { path: "report.eyebrow", label: "Small label", type: "text", sel: [".report-copy .eyebrow"], keepFirstChild: true },
        { path: "report.title", label: "Heading", type: "text", sel: [".report-copy h2"] },
        { path: "report.text", label: "Paragraph", type: "text", multiline: true, sel: [".report-copy > p:not(.eyebrow)"] },
        { path: "report.linkText", label: "Link text", type: "text", sel: [".report-copy .text-link"], keepLastChild: true }
      ],
      repeat: { count: 3, base: ".feature-stack article" },
      repeatFields: [
        { path: "report.features.#.title", label: "Title", type: "text", sel: [".feature-stack article:nth-of-type(#) h3"] },
        { path: "report.features.#.text", label: "Text", type: "text", multiline: true, sel: [".feature-stack article:nth-of-type(#) div p"] }
      ]
    },

    /* ---------------------------------------------------------------- why */
    why: {
      label: "Why choose us",
      icon: "star",
      page: "home",
      fields: [
        { path: "why.eyebrow", label: "Small label", type: "text", sel: [".why-intro .eyebrow"], keepFirstChild: true },
        { path: "why.title", label: "Heading", type: "html", hint: "Use <br /> for a line break", sel: [".why-intro h2"] },
        { path: "why.intro", label: "Intro paragraph", type: "text", multiline: true, sel: [".why-intro > p:not(.eyebrow)"] },
        { path: "why.bigNumber", label: "Big number", type: "text", sel: [".experience-display strong"] },
        { path: "why.bigLabel", label: "Big number label", type: "text", sel: [".experience-display span"] }
      ],
      repeat: { count: 4, base: ".why-cards .why-card" },
      repeatFields: [
        { path: "why.cards.#.title", label: "Title", type: "text", sel: [".why-cards .why-card:nth-of-type(#) h3"] },
        { path: "why.cards.#.text", label: "Text", type: "text", multiline: true, sel: [".why-cards .why-card:nth-of-type(#) p"] }
      ]
    },

    /* ------------------------------------------------------------ process */
    process: {
      label: "Process steps",
      icon: "steps",
      page: "home",
      fields: [
        { path: "process.eyebrow", label: "Small label", type: "text", sel: [".process-section .eyebrow"], keepFirstChild: true },
        { path: "process.title", label: "Heading", type: "text", sel: [".process-section .section-heading h2"] },
        { path: "process.btn", label: "Button text", type: "text", sel: [".process-section .button-outline"] }
      ],
      repeat: { count: 3, base: ".process-track article" },
      repeatFields: [
        { path: "process.steps.#.label", label: "Step label", type: "text", sel: [".process-track article:nth-of-type(#) .process-label"] },
        { path: "process.steps.#.title", label: "Step title", type: "text", sel: [".process-track article:nth-of-type(#) h3"] },
        { path: "process.steps.#.text", label: "Step text", type: "text", multiline: true,
          sel: [".process-track article:nth-of-type(#) p:last-of-type"] }
      ]
    },

    /* ------------------------------------------------------------ reviews */
    reviews: {
      label: "Customer reviews",
      icon: "quote",
      page: "home",
      fields: [
        { path: "reviews.eyebrow", label: "Small label", type: "text", sel: [".reviews-heading .eyebrow"], keepFirstChild: true },
        { path: "reviews.title", label: "Heading", type: "text", sel: ["#reviews-title"] }
      ],
      /* reviews have no JS behaviour, so rows can be added and removed */
      dynamic: {
        key: "reviews.items",
        container: ".reviews-grid",
        template:
          '<article class="review-card reveal">' +
          '<div class="review-stars" aria-label="Five stars">{{stars}}</div>' +
          "<blockquote>{{quote}}</blockquote>" +
          "<p>{{author}}</p></article>",
        fields: [
          { k: "stars", label: "Stars", type: "stars", default: "★★★★★" },
          { k: "quote", label: "Review text", type: "text", multiline: true, default: "" },
          { k: "author", label: "Who wrote it", type: "text", default: "Homeowner review" }
        ]
      }
    },

    /* -------------------------------------------------------- service area */
    area: {
      label: "Service area & map",
      icon: "map",
      page: "home",
      fields: [
        { path: "area.eyebrow", label: "Small label", type: "text", sel: [".area-copy .eyebrow"], keepFirstChild: true },
        { path: "area.title", label: "Heading", type: "text", sel: [".area-copy h2"] },
        { path: "area.text", label: "Paragraph", type: "text", multiline: true, sel: [".area-copy > p:not(.eyebrow):not(.area-status)"] },
        { path: "area.statusPrefix", label: "Text before region name", type: "data",
          hint: "e.g. 'Serving'" },
        { path: "area.statusSuffix", label: "Text after region name", type: "text",
          hint: "Shown after 'Serving …'", sel: [".area-status"], keepUntilStrong: true },
        { path: "area.btn", label: "Button text", type: "text", sel: [".area-copy .button-primary"] },
        { path: "area.legend", label: "Map caption", type: "text", sel: [".map-legend"], keepFirstChild: true }
      ],
      regions: {
        key: "area.regions",
        ids: ["md", "pa", "dc", "wv"],
        fields: [
          { k: "name", label: "Region name", type: "text",
            sel: ['.area-pills button[data-region="$"]'] },
          { k: "code", label: "Map pin code", type: "text",
            sel: ['.map-node[data-region="$"] span'], firstTextOnly: true },
          { k: "mapLabel", label: "Map pin label", type: "text",
            sel: ['.map-node[data-region="$"] span small'] }
        ]
      }
    },

    /* ---------------------------------------------------------------- FAQ */
    faq: {
      label: "FAQ",
      icon: "help",
      page: "home",
      fields: [
        { path: "faq.eyebrow", label: "Small label", type: "text", sel: [".faq-intro .eyebrow"], keepFirstChild: true },
        { path: "faq.title", label: "Heading", type: "text", sel: [".faq-intro h2"] },
        { path: "faq.intro", label: "Intro paragraph", type: "text", multiline: true, sel: [".faq-intro > p:not(.eyebrow)"] },
        { path: "faq.callLabel", label: "Call card label", type: "text", sel: [".phone-card span"] }
      ],
      dynamic: {
        key: "faq.items",
        container: ".faq-list",
        template: "<details><summary>{{q}}<span></span></summary><p>{{a}}</p></details>",
        fields: [
          { k: "q", label: "Question", type: "text", default: "" },
          { k: "a", label: "Answer", type: "text", multiline: true, default: "" }
        ]
      }
    },

    /* ------------------------------------------------------------- footer */
    footer: {
      label: "Footer",
      icon: "footer",
      fields: [
        { path: "footer.blurb", label: "About text", type: "text", multiline: true, sel: [".footer-brand p"] },
        { path: "footer.col1Title", label: "Column 1 heading", type: "text", sel: [".footer-top > div:nth-of-type(2) h3"] },
        { path: "footer.col2Title", label: "Column 2 heading", type: "text", sel: [".footer-top > div:nth-of-type(3) h3"] },
        { path: "footer.scheduleTitle", label: "Schedule heading", type: "text", sel: [".footer-contact h3"] },
        { path: "footer.availability", label: "Availability line", type: "text", sel: [".footer-contact p"] },
        { path: "footer.btn", label: "Button text", type: "text", sel: [".footer-contact .button"] },
        { path: "footer.copyright", label: "Copyright text", type: "text",
          hint: "The year is added automatically", sel: [".footer-bottom p:first-child"], keepYearSpan: true },
        { path: "footer.tagline", label: "Bottom-right tagline", type: "text", sel: [".footer-bottom p:last-child"] }
      ],
      repeat: { count: 4, base: ".footer-top > div:nth-of-type(2) a" },
      repeatFields: [
        { path: "footer.col1.#", label: "Link", type: "text", sel: [".footer-top > div:nth-of-type(2) a:nth-of-type(#)"] },
        { path: "footer.col2.#", label: "Link", type: "text", sel: [".footer-top > div:nth-of-type(3) a:nth-of-type(#)"] }
      ]
    }
  };

  root.CHI_CMS_MAP = MAP;
})(typeof window !== "undefined" ? window : globalThis);
