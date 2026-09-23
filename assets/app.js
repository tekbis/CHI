(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const serviceContent = {
    home: {
      kicker: "Complete property view",
      title: "Comprehensive home inspection",
      copy: "A complete system-by-system evaluation using modern tools, color photos and a clear digital report.",
      points: ["Roof to foundation", "Major systems & safety", "Clear digital report"],
      alt: "CHI inspector pointing out a home's roof and exterior details"
    },
    radon: {
      kicker: "Measure what you cannot see",
      title: "Radon testing",
      copy: "Professional monitoring provides clear results and practical context for an invisible concern that cannot be judged by sight or smell.",
      points: ["Modern monitoring equipment", "Easy-to-read results", "Coordinated with your inspection"],
      alt: "CHI inspector setting up a radon monitor in a finished basement"
    },
    mold: {
      kicker: "Trace the source",
      title: "Mold & moisture testing",
      copy: "Targeted evaluation focuses on visible concerns, moisture-prone areas and conditions that may deserve closer attention.",
      points: ["Moisture-meter screening", "Concern-focused assessment", "Photo documentation"],
      alt: "CHI inspector checking a bathroom wall with a moisture meter"
    },
    water: {
      kicker: "Understand household water",
      title: "Water quality testing",
      copy: "Choose practical screening options for private wells and household water, coordinated with your property inspection.",
      points: ["Convenient sample collection", "Clear test options", "Coordinated scheduling"],
      alt: "CHI inspector collecting a residential water sample at a kitchen faucet"
    },
    termite: {
      kicker: "Specialist support",
      title: "Termite inspection",
      copy: "An experienced termite inspector evaluates accessible areas for visible evidence and conditions associated with wood-destroying insects.",
      points: ["Specialist on staff", "Visible evidence review", "Combined appointment option"],
      alt: "CHI inspector checking a basement sill plate for termite evidence"
    },
    thermal: {
      kicker: "Technology that adds perspective",
      title: "Thermal imaging",
      copy: "Infrared tools help identify temperature patterns that can guide a closer look at electrical, moisture or insulation concerns.",
      points: ["Infrared scanning", "Temperature anomaly review", "Images in your report"],
      alt: "CHI inspector scanning an electrical panel with a thermal camera"
    }
  };

  const regionNames = {
    md: "Maryland",
    pa: "Pennsylvania",
    dc: "Washington, DC",
    wv: "West Virginia"
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character]);

  const setYears = () => {
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  };

  const initHeader = () => {
    const header = document.querySelector("[data-header]");
    const toggle = document.querySelector(".menu-toggle");
    if (!header) return;

    const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 28);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = document.body.classList.toggle("menu-open");
        toggle.setAttribute("aria-expanded", String(open));
      });

      document.querySelectorAll("#primary-nav a, .header-cta, .header-call-button, .phone-link").forEach((link) => {
        link.addEventListener("click", () => {
          document.body.classList.remove("menu-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  };

  const initLimelightNav = () => {
    document.querySelectorAll(".limelight-nav").forEach((nav) => {
      const light = nav.querySelector(".nav-light");
      const links = [...nav.querySelectorAll("a")];
      if (!light || !links.length) return;

      let selected = nav.querySelector("a.active");

      const moveTo = (link) => {
        if (window.innerWidth <= 980) return;
        if (!link) {
          light.style.opacity = "0";
          return;
        }
        const navBox = nav.getBoundingClientRect();
        const box = link.getBoundingClientRect();
        light.style.opacity = "1";
        light.style.width = `${box.width}px`;
        light.style.transform = `translateX(${box.left - navBox.left - 5}px)`;
      };

      links.forEach((link) => {
        link.addEventListener("pointerenter", () => moveTo(link));
        link.addEventListener("focus", () => moveTo(link));
        link.addEventListener("click", () => {
          selected?.classList.remove("active");
          selected = link;
          selected.classList.add("active");
          moveTo(selected);
        });
      });

      nav.addEventListener("pointerleave", () => moveTo(selected));
      window.addEventListener("resize", () => moveTo(selected), { passive: true });
      requestAnimationFrame(() => moveTo(selected));
    });
  };

  const initReveal = () => {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -45px" });

    items.forEach((item) => observer.observe(item));
  };

  const initHero = () => {
    const root = document.querySelector("[data-hero-slider]");
    if (!root) return;

    const slides = [...root.querySelectorAll("[data-hero-slide]")];
    const controls = [...root.querySelectorAll("[data-hero-step]")];
    let current = 0;
    let timer;

    const show = (next) => {
      current = (next + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const active = index === current;
        slide.classList.toggle("active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });
      controls.forEach((control, index) => {
        const active = index === current;
        control.classList.toggle("active", active);
        control.setAttribute("aria-pressed", String(active));
      });
    };

    const start = () => {
      if (reduceMotion) return;
      window.clearInterval(timer);
      timer = window.setInterval(() => show(current + 1), 5600);
    };

    controls.forEach((control, index) => {
      control.addEventListener("click", () => {
        show(index);
        start();
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) window.clearInterval(timer);
      else start();
    });

    show(0);
    start();
  };

  const initInteractiveServices = () => {
    const root = document.querySelector("[data-interactive-list]");
    if (!root) return;

    const rows = [...root.querySelectorAll(".service-row")];
    const previewImages = [...root.querySelectorAll("[data-preview-image]")];
    const previewKicker = root.querySelector("[data-preview-kicker]");
    const previewTitle = root.querySelector("[data-preview-title]");
    const previewCopy = root.querySelector("[data-preview-copy]");
    const previewPoints = root.querySelector("[data-preview-points]");
    let activeRow = rows[0];

    const activate = (row) => {
      if (!row || row === activeRow && row.classList.contains("active")) return;
      activeRow = row;
      rows.forEach((item) => {
        const active = item === row;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      const key = row.dataset.service;
      const content = serviceContent[key];
      if (!content) return;

      previewImages.forEach((image) => image.classList.toggle("active", image.dataset.previewImage === key));
      if (previewKicker) previewKicker.textContent = content.kicker;
      if (previewTitle) previewTitle.textContent = content.title;
      if (previewCopy) previewCopy.textContent = content.copy;
      if (previewPoints) previewPoints.innerHTML = content.points.map((point) => `<li>${point}</li>`).join("");
    };

    rows.forEach((row) => {
      row.addEventListener("pointerenter", () => activate(row));
      row.addEventListener("focus", () => activate(row));
      row.addEventListener("click", () => activate(row));
      row.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        const index = rows.indexOf(row);
        const next = event.key === "ArrowDown" ? (index + 1) % rows.length : (index - 1 + rows.length) % rows.length;
        rows[next].focus();
      });
    });

  };

  const setRegion = (region) => {
    if (!regionNames[region]) return;
    document.querySelectorAll("[data-region]").forEach((node) => {
      node.classList.toggle("active", node.dataset.region === region);
    });
    document.querySelectorAll("[data-region-label]").forEach((node) => {
      const suffix = node.closest(".booking-map") ? " selected" : "";
      node.textContent = `${regionNames[region]}${suffix}`;
    });

    const select = document.querySelector("[data-state-select]");
    if (select && select.value !== region) select.value = region;
    const summary = document.querySelector("[data-summary-location]");
    if (summary) summary.textContent = regionNames[region];
  };

  const initRegionMaps = () => {
    document.querySelectorAll("[data-region]").forEach((control) => {
      control.addEventListener("click", () => setRegion(control.dataset.region));
    });

    const select = document.querySelector("[data-state-select]");
    select?.addEventListener("change", () => setRegion(select.value));
  };

  const initBookingForm = () => {
    const form = document.querySelector("[data-booking-form]");
    if (!form) return;

    const success = document.querySelector("[data-form-success]");
    const servicesSummary = document.querySelector("[data-summary-services]");
    const dateSummary = document.querySelector("[data-summary-date]");
    const dateInput = form.querySelector("[data-date-input]");
    const editButton = document.querySelector("[data-edit-request]");
    const successSummary = document.querySelector("[data-success-summary]");
    const submitButton = form.querySelector("[type='submit']");

    if (dateInput) {
      const today = new Date();
      const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      dateInput.min = localToday;
      dateInput.addEventListener("change", () => {
        dateSummary.textContent = dateInput.value ? new Date(`${dateInput.value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not selected";
      });
    }

    const query = new URLSearchParams(window.location.search);
    ["firstName", "phone", "address", "preferredDate"].forEach((name) => {
      const value = query.get(name);
      const field = form.elements.namedItem(name);
      if (!value || !(field instanceof HTMLElement)) return;
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const updateServices = () => {
      const selected = [...form.querySelectorAll("input[name='services']:checked")].map((input) => input.value);
      servicesSummary.textContent = selected.length ? selected.join(", ") : "None selected";
      form.querySelectorAll(".service-check").forEach((label) => {
        const checkbox = label.querySelector("input");
        label.classList.toggle("checked", checkbox.checked);
      });
    };

    form.querySelectorAll("input[name='services']").forEach((input) => input.addEventListener("change", updateServices));
    updateServices();

    const clearErrors = () => form.querySelectorAll(".field-error").forEach((field) => field.classList.remove("field-error"));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearErrors();

      const required = [...form.querySelectorAll("[required]")];
      const invalid = required.filter((field) => !field.checkValidity());
      if (invalid.length) {
        invalid.forEach((field) => field.classList.add("field-error"));
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const selectedServices = data.getAll("services");
      const date = data.get("preferredDate");
      const formattedDate = date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Flexible";

      if (successSummary) {
        successSummary.innerHTML = `
          <div><span>Property</span><strong>${escapeHtml(data.get("address"))}, ${escapeHtml(data.get("city"))}</strong></div>
          <div><span>Region</span><strong>${escapeHtml(regionNames[data.get("state")] || data.get("state"))}</strong></div>
          <div><span>Services</span><strong>${escapeHtml(selectedServices.join(", ") || "To be discussed")}</strong></div>
          <div><span>Preferred date</span><strong>${escapeHtml(formattedDate)}</strong></div>
        `;
      }

      submitButton.disabled = true;
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });

    editButton?.addEventListener("click", () => {
      success.hidden = true;
      form.hidden = false;
      submitButton.disabled = false;
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  };

  const initFaq = () => {
    const details = [...document.querySelectorAll(".faq-list details")];
    details.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        details.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  };

  const initWebMcp = () => {
    const form = document.querySelector("[data-booking-form]");
    const context = document.modelContext;
    if (!form || !context?.registerTool) return;

    const lifecycle = new AbortController();
    const allowedServices = ["Home inspection", "Radon testing", "Mold & moisture testing", "Water quality testing", "Termite inspection", "Thermal imaging"];

    const setField = (name, value) => {
      if (value === undefined || value === null || value === "") return;
      const field = form.elements.namedItem(name);
      if (!(field instanceof HTMLElement)) return;
      field.value = String(value);
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const register = context.registerTool({
      name: "stage_inspection_request",
      title: "Stage inspection request",
      description: "Prefill the visible CHI inspection request form for the visitor to review. This stages the request but does not send or confirm an appointment.",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string", minLength: 1 },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string", minLength: 1 },
          city: { type: "string", minLength: 1 },
          state: { type: "string", enum: ["md", "pa", "dc", "wv"] },
          zip: { type: "string" },
          propertyType: { type: "string" },
          squareFeet: { type: ["string", "number"] },
          services: { type: "array", items: { type: "string", enum: allowedServices }, uniqueItems: true },
          preferredDate: { type: "string" },
          preferredTime: { type: "string" },
          message: { type: "string" }
        },
        required: ["address", "city", "state"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== "object" || !regionNames[input.state]) {
          throw new Error("A valid address, city and service state are required.");
        }

        ["firstName", "lastName", "email", "phone", "address", "city", "zip", "propertyType", "squareFeet", "preferredDate", "preferredTime", "message"].forEach((name) => setField(name, input[name]));
        setRegion(input.state);

        if (Array.isArray(input.services)) {
          const selected = input.services.filter((service) => allowedServices.includes(service));
          form.querySelectorAll("input[name='services']").forEach((checkbox) => {
            checkbox.checked = selected.includes(checkbox.value);
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }

        form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        return {
          status: "staged",
          submitted: false,
          state: regionNames[input.state],
          services: Array.isArray(input.services) ? input.services : ["Home inspection"]
        };
      }
    }, { signal: lifecycle.signal });

    Promise.resolve(register).catch(() => {});
  };

  setYears();
  initHeader();
  initLimelightNav();
  initReveal();
  initHero();
  initInteractiveServices();
  initRegionMaps();
  initBookingForm();
  initFaq();
  initWebMcp();
})();
