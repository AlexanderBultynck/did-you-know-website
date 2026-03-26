"use client";

import React, { useEffect, useRef, useState } from "react";

const FACT_URL = "https://uselessfacts.jsph.pl/random.json?language=en";

export default function FactWidget(): React.ReactElement {
  const [fact, setFact] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [prefetched, setPrefetched] = useState<any>(null);
  const currentController = useRef<AbortController | null>(null);

  async function getFactFromApi(signal?: AbortSignal) {
    const res = await fetch(FACT_URL, { cache: "no-store", signal });
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  }

  async function fetchFact(usePrefetch = true) {
    if (isLoading) return;
    setIsLoading(true);
    setStatusMessage("");
    if (currentController.current) {
      try { currentController.current.abort(); } catch (e) {}
    }
    currentController.current = new AbortController();
    const { signal } = currentController.current;
    try {
      let data: any;
      if (usePrefetch && prefetched) {
        data = prefetched;
        setPrefetched(null);
        prefetchFact().catch(() => {});
      } else {
        data = await getFactFromApi(signal);
      }
      setFact(data.text || "No fact received.");
      // small reveal: handled via CSS class
      setStatusMessage("");
    } catch (err) {
      console.error("Error fetching fact:", err);
      setFact("Oops! Something went wrong. Try again.");
      setStatusMessage("Failed to load a fact. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  async function prefetchFact() {
    try {
      const controller = new AbortController();
      const data = await getFactFromApi(controller.signal);
      setPrefetched(data);
    } catch (e: any) {
      setPrefetched(null);
    }
  }

  async function copyFact() {
    const text = fact.trim();
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = (window.scrollY || 0) + "px";
        textarea.readOnly = true;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setStatusMessage("Copied to clipboard!");
      setTimeout(() => { if (statusMessage === "Copied to clipboard!") setStatusMessage(""); }, 2000);
      return true;
    } catch (e: any) {
      console.error("Copy failed:", e);
      const msg = (e && (e.name === 'NotAllowedError' || (e.message && e.message.toLowerCase().includes('permission')))) ?
        'Copy failed (permission denied). Use manual copy.' :
        'Copy failed. Try selecting the text.';
      setStatusMessage(msg);
      return false;
    }
  }

  async function shareFact() {
    const text = fact.trim();
    if (!text) return;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Did You Know?', text });
      } catch (e) {
        // user cancelled
      }
    } else {
      const copied = await copyFact();
      if (!copied) {
        try { window.prompt('Copy the fact below (Ctrl+C/Cmd+C):', text); } catch (e) { setStatusMessage('Unable to share. Please copy the text manually.'); }
      } else {
        setStatusMessage('Fact copied — paste it to share!');
        setTimeout(() => { if (statusMessage.startsWith('Fact copied')) setStatusMessage(''); }, 2000);
      }
    }
  }

  useEffect(() => {
    fetchFact(false).then(() => prefetchFact());
    const iv = setInterval(() => { if (!prefetched) prefetchFact(); }, 30000);
    return () => { clearInterval(iv); if (currentController.current) currentController.current.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element | null;
      if (target && target instanceof Element) {
        if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        fetchFact();
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        copyFact();
        return;
      }
      if (e.key.toLowerCase() === 's') {
        shareFact();
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fact, prefetched]);

  return (
    <section id="fact-container" aria-labelledby="fact-heading">
      <h2 id="fact-heading" className="visually-hidden">Fact</h2>
      <div id="fact" className={`fact-text${""}`} tabIndex={0} role="region" aria-live="polite" aria-atomic="true" aria-label="Fact content">
        {fact}
      </div>

      <div className="controls">
        <button id="new-fact-button" className="btn primary" aria-label="Show another fact" onClick={() => fetchFact()} disabled={isLoading}>Show Me Another Fact</button>
        <button id="copy-button" className="btn" aria-label="Copy fact to clipboard" onClick={() => copyFact()} disabled={isLoading}>Copy</button>
        <button id="share-button" className="btn" aria-label="Share this fact" onClick={() => shareFact()} disabled={isLoading}>Share</button>
        <div id="loading-spinner" className="spinner" role="status" aria-hidden={!isLoading} aria-label="Loading"></div>
      </div>

      <p id="status-message" className="muted" aria-live="polite">{statusMessage}</p>
      <noscript><p className="muted">JavaScript is required to load facts. Please enable JavaScript.</p></noscript>
    </section>
  );
}
