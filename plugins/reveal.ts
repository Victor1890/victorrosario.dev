// Scroll-reveal via a lightweight IntersectionObserver directive.
// No window scroll listeners (jank), no extra runtime deps.
//
// Usage:
//   <div v-reveal>              -> reveal with no delay
//   <div v-reveal="120">        -> reveal after a 120ms stagger delay
//   <div v-reveal="i * 90">     -> stagger a list by index
//
// The directive is registered universally so SSR can resolve it (getSSRProps),
// but all DOM work happens client-side only. Under prefers-reduced-motion the
// hidden initial state is skipped entirely (see assets/styles/main.css), so
// this is effectively a no-op there.

export default defineNuxtPlugin((nuxtApp) => {
  // Gate the hidden initial state on JS being live: if the bundle never loads,
  // content stays visible instead of hidden forever.
  if (import.meta.client) {
    document.documentElement.classList.add("reveal-enabled");
  }

  const supportsObserver = import.meta.client && typeof IntersectionObserver !== "undefined";

  const reveal = (el: HTMLElement) => el.classList.add("is-in");

  nuxtApp.vueApp.directive("reveal", {
    // Renders nothing extra on the server; presence of this makes the directive
    // resolvable during SSR so @vue/server-renderer does not throw.
    getSSRProps() {
      return {};
    },
    mounted(el: HTMLElement, binding) {
      el.dataset.reveal = "";

      const delay = typeof binding.value === "number" ? binding.value : 0;
      if (delay > 0) el.style.setProperty("--reveal-delay", `${delay}ms`);

      // No observer support: just show it immediately.
      if (!supportsObserver) {
        reveal(el);
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(el);
            obs.unobserve(entry.target); // reveal-once
          }
        },
        { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
      );

      observer.observe(el);
      (el as HTMLElement & { _revealObserver?: IntersectionObserver })._revealObserver = observer;
    },
    unmounted(el: HTMLElement & { _revealObserver?: IntersectionObserver }) {
      el._revealObserver?.disconnect();
      delete el._revealObserver;
    },
  });
});
