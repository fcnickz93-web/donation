import { useState, useCallback, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { generatePixCode, parseCurrencyInput } from "@/lib/pix";

const BITCOIN_WALLET = "bc1qcgfrv79marhzve5cnmdl08khxx67d0477chjc8";

type CopyState = "idle" | "copied";

function useCopy(timeout = 2000) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState("idle"), timeout);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setState("copied");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState("idle"), timeout);
    }
  }, [timeout]);

  return { state, copy };
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="10" y="18" width="44" height="52" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <rect x="6" y="14" width="52" height="6" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <rect x="22" y="8" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <line x1="22" y1="30" x2="22" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="30" x2="32" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="30" x2="42" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PixSection() {
  const [rawValue, setRawValue] = useState("");
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state: copyState, copy } = useCopy();
  const { state: qrCopyState, copy: copyQr } = useCopy();
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  const handleGenerate = useCallback(() => {
    setError(null);

    const amount = parseCurrencyInput(rawValue);

    if (rawValue.trim() !== "" && amount === undefined) {
      setError("Valor inválido. Use um número positivo até R$ 999.999,99");
      return;
    }

    const code = generatePixCode(amount);

    setPixCode(code);
    setQrGenerated(false);
  }, [rawValue]);

  useEffect(() => {
    if (pixCode && qrRef.current && !qrGenerated) {
      QRCode.toCanvas(qrRef.current, pixCode, {
        width: 200,
        margin: 1,
        color: { dark: "#e0e0e0", light: "#0a0a0a" },
      }).then(() => setQrGenerated(true)).catch(() => {});
    }
  }, [pixCode, qrGenerated]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9.,]*$/.test(val)) {
      setRawValue(val);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleGenerate();
  };

  return (
    <div className="card-metal rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-sm font-mono text-white/60">₽</span>
        </div>
        <div>
          <p className="text-xs tracking-widest text-white/30 uppercase font-mono">Pix</p>
          <p className="text-sm text-white/60 font-light">Transferência instantânea</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono">R$</span>
          <input
            data-testid="input-pix-amount"
            type="text"
            inputMode="decimal"
            value={rawValue}
            onChange={handleValueChange}
            onKeyDown={handleKeyDown}
            placeholder="0,00"
            className="input-metal w-full rounded-lg pl-12 pr-4 py-3.5 text-lg font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400/70 font-mono">{error}</p>
        )}

        <p className="text-xs text-white/25 font-mono">
          Deixe em branco para gerar sem valor fixo
        </p>

        <button
          data-testid="button-generate-pix"
          onClick={handleGenerate}
          className="btn-metal w-full rounded-lg py-3.5 text-sm tracking-widest uppercase font-mono text-white/70"
        >
          Gerar Pix
        </button>
      </div>

      {pixCode && (
        <div className="space-y-4 pt-2">
          <div className="divider-metal" />

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <canvas
              ref={qrRef}
              data-testid="canvas-pix-qr"
              className="rounded-lg mx-auto sm:mx-0 flex-shrink-0"
              style={{ imageRendering: "pixelated", border: "1px solid rgba(255,255,255,0.06)" }}
            />

            <div className="flex-1 space-y-3 w-full">
              <div
                className="rounded-lg p-3 copy-code text-white/50 select-all"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
                data-testid="text-pix-code"
              >
                {pixCode}
              </div>

              <div className="flex gap-2">
                <button
                  data-testid="button-copy-pix"
                  onClick={() => copy(pixCode)}
                  className="btn-metal flex-1 rounded-lg py-3 text-xs tracking-widest uppercase font-mono text-white/60"
                >
                  {copyState === "copied" ? "Copiado ✓" : "Copiar Pix"}
                </button>

                <button
                  data-testid="button-copy-pix-qr"
                  onClick={() => copyQr(pixCode)}
                  className="btn-metal px-4 rounded-lg py-3 text-xs tracking-widest uppercase font-mono text-white/40"
                  title="Copiar código"
                >
                  {qrCopyState === "copied" ? "✓" : "#"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BitcoinSection() {
  const { state: copyState, copy } = useCopy();
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (qrRef.current && !qrReady) {
      QRCode.toCanvas(qrRef.current, `bitcoin:${BITCOIN_WALLET}`, {
        width: 160,
        margin: 1,
        color: { dark: "#e0e0e0", light: "#0a0a0a" },
      }).then(() => setQrReady(true)).catch(() => {});
    }
  }, [qrReady]);

  return (
    <div className="card-metal rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-sm font-mono text-white/60">₿</span>
        </div>
        <div>
          <p className="text-xs tracking-widest text-white/30 uppercase font-mono">Bitcoin</p>
          <p className="text-sm text-white/60 font-light">Carteira on-chain</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <canvas
          ref={qrRef}
          data-testid="canvas-bitcoin-qr"
          className="rounded-lg mx-auto sm:mx-0 flex-shrink-0"
          style={{ imageRendering: "pixelated", border: "1px solid rgba(255,255,255,0.06)" }}
        />

        <div className="flex-1 space-y-3 w-full">
          <div
            className="rounded-lg p-3 copy-code text-white/50 select-all"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
            data-testid="text-bitcoin-wallet"
          >
            {BITCOIN_WALLET}
          </div>

          <button
            data-testid="button-copy-bitcoin"
            onClick={() => copy(BITCOIN_WALLET)}
            className="btn-metal w-full rounded-lg py-3 text-xs tracking-widest uppercase font-mono text-white/60"
          >
            {copyState === "copied" ? "Copiado ✓" : "Copiar Carteira"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-lg space-y-10">

        <header className="text-center space-y-4 pt-4">
          <div className="flex justify-center mb-2">
            <TrashIcon className="w-14 h-14 text-white/20 trash-icon" />
          </div>

          <div>
            <h1
              className="text-5xl font-light tracking-[0.25em] uppercase metal-text glow-subtle"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Trashboy
            </h1>
            <p className="mt-2 text-xs tracking-[0.4em] uppercase text-white/25 font-mono">
              Donations
            </p>
          </div>

          <p className="text-sm text-white/30 font-light tracking-wide max-w-xs mx-auto">
            Se curtiu o conteúdo, manda um café
          </p>
        </header>

        <div className="divider-metal" />

        <div className="space-y-4">
          <PixSection />
          <BitcoinSection />
        </div>

        <footer className="text-center pb-4">
          <p className="text-xs text-white/15 font-mono tracking-widest uppercase">
            trashboy · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}
