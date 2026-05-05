import FactWidget from "../components/FactWidget";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function Home() {
  return (
    <div>
      <a className="skip-link" href="#new-fact-button">Skip to controls</a>
      <header>
        <div className="header-inner">
          <h1>Did You Know?</h1>
          <p className="tagline">Short, surprising facts.</p>
        </div>
        <p className="kbd-hint">Keyboard: <kbd>Space</kbd> for new fact • <kbd>C</kbd> copy • <kbd>S</kbd> share</p>
        <ThemeSwitcher />
      </header>

      <main>
        <FactWidget />
      </main>

      <footer>
        <p>&copy; <span id="current-year">{new Date().getFullYear()}</span> - Did You Know?</p>
      </footer>
    </div>
  );
}
