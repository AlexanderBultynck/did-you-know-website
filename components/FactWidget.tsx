"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const FACT_URL = "https://uselessfacts.jsph.pl/random.json?language=en";

type FactData = { text?: string } & Record<string, unknown>;

export default function FactWidget(): React.ReactElement {
  const [fact, setFact] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [prefetched, setPrefetched] = useState<FactData | null>(null);
  const currentController = useRef<AbortController | null>(null);
  const prefetchedRef = useRef<FactData | null>(null);
  const isLoadingRef = useRef(false);
  const factRef = useRef<string>(fact);

  useEffect(() => {
    prefetchedRef.current = prefetched;
  }, [prefetched]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    factRef.current = fact;
  }, [fact]);

  const getFactFromApi = useCallback(async (signal?: AbortSignal): Promise<FactData> => {
    const res = await fetch(FACT_URL, { cache: "no-store", signal });
    if (!res.ok) throw new Error("Network response was not ok");
    return (await res.json()) as FactData;
  }, []);

  const prefetchFact = useCallback(async () => {
    try {
      const controller = new AbortController();
      const data = await getFactFromApi(controller.signal);
      prefetchedRef.current = data;
      setPrefetched(data);
    } catch {
      prefetchedRef.current = null;
      setPrefetched(null);
    }
  }, [getFactFromApi]);

  const fetchFact = useCallback(async (usePrefetch = true) => {
    if (isLoadingRef.current) return;
    setIsLoading(true);
    isLoadingRef.current = true;
    setStatusMessage("");
    if (currentController.current) {
      try { currentController.current.abort(); } catch { }
    }
    currentController.current = new AbortController();
    const { signal } = currentController.current;
    try {
      let data: FactData | null = null;
      if (usePrefetch && prefetchedRef.current) {
        data = prefetchedRef.current;
        prefetchedRef.current = null;
        setPrefetched(null);
        prefetchFact().catch(() => {});
      } else {
        data = await getFactFromApi(signal);
      }
      setFact(data.text || "No fact received.");
      setStatusMessage("");
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        console.error("Error fetching fact:", err);
        setFact("Oops! Something went wrong. Try again.");
        setStatusMessage("Failed to load a fact. Check your connection.");
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [getFactFromApi, prefetchFact]);

  const copyFact = useCallback(async () => {
    const text = factRef.current.trim();
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage("Copied to clipboard!");
      setTimeout(() => {
        setStatusMessage((current) => current === "Copied to clipboard!" ? "" : current);
      }, 2000);
      return true;
    } catch (err: unknown) {
      console.error("Copy failed:", err);
      const e = err as { name?: string; message?: string } | undefined;
      const msg = (e && (e.name === 'NotAllowedError' || (e.message && e.message.toLowerCase().includes('permission')))) ?
        'Copy failed (permission denied). Use manual copy.' :
        'Copy failed. Try selecting the text.';
      setStatusMessage(msg);
      return false;
    }
  }, []);

  const shareFact = useCallback(async () => {
    const text = factRef.current.trim();
    if (!text) return;
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Did You Know?', text });
      } catch {
        // user cancelled
      }
    } else {
      const copied = await copyFact();
      if (!copied) {
        try {
          window.prompt('Copy the fact below (Ctrl+C/Cmd+C):', text);
        } catch {
          setStatusMessage('Unable to share. Please copy the text manually.');
        }
      } else {
        const shareMsg = 'Fact copied — paste it to share!';
        setStatusMessage(shareMsg);
        setTimeout(() => { setStatusMessage((cur) => cur && cur === shareMsg ? '' : cur); }, 2000);
      }
    }
  }, [copyFact]);

  useEffect(() => {
    const t = setTimeout(() => { void fetchFact(false).then(() => prefetchFact()).catch(() => {}); }, 0);
    const iv = setInterval(() => { if (!prefetchedRef.current) prefetchFact(); }, 30000);
    return () => { clearTimeout(t); clearInterval(iv); if (currentController.current) currentController.current.abort(); };
  }, [fetchFact, prefetchFact]);

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
  }, [copyFact, fetchFact, shareFact]);

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
