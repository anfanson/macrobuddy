
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLock = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const elementId = "reader";

    const startScanner = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Controllo Permessi Esplicito e Inizializzazione Stream
        // Questo passaggio è CRUCIALE per i browser mobile per "svegliare" la camera corretta
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Il tuo browser non supporta l'accesso alla fotocamera.");
        }

        // Richiediamo esplicitamente la camera posteriore (environment)
        // Usiamo un catch qui per intercettare subito il 'Permission Denied'
        await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
            } 
        });

        if (!isMounted) return;

        // 2. Inizializzazione Libreria
        // Usiamo Html5Qrcode (Core) invece di Scanner per avere controllo totale
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E 
          ]
        };

        // 3. Avvio Scanner
        await html5QrCode.start(
          { facingMode: "environment" }, // Forza camera posteriore
          config,
          (decodedText) => {
             if (scanLock.current) return;
             
             console.log("Codice rilevato:", decodedText);
             scanLock.current = true;

             if (typeof navigator !== 'undefined' && navigator.vibrate) {
               navigator.vibrate(200);
             }

             // Stop e invia risultato
             html5QrCode.stop().then(() => {
                html5QrCode.clear();
                onScan(decodedText);
             }).catch(err => {
                console.error("Stop failed", err);
                onScan(decodedText);
             });
          },
          (errorMessage) => {
             // Ignora errori di parsing frame-by-frame
          }
        );
        
        // 4. Fix attributi video per Mobile (iOS/Android)
        // Assicura che il video non vada in fullscreen e sia muto
        const videoElement = document.querySelector(`#${elementId} video`);
        if (videoElement) {
            videoElement.setAttribute("playsinline", "true");
            videoElement.setAttribute("muted", "true");
            videoElement.setAttribute("autoplay", "true");
        }

        setLoading(false);

      } catch (err: any) {
        console.error("Errore inizializzazione camera:", err);
        let msg = "Errore sconosciuto fotocamera.";
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = "Permesso fotocamera negato. Abilitalo nelle impostazioni del browser.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = "Nessuna fotocamera trovata sul dispositivo.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = "Impossibile accedere alla fotocamera. Potrebbe essere in uso da un'altra app.";
        } else if (typeof err === 'string') {
            msg = err;
        } else if (err.message) {
            msg = err.message;
        }

        if (isMounted) {
            setError(msg);
            setLoading(false);
        }
      }
    };

    // Piccolo timeout per dare tempo al DOM di renderizzare il div #reader
    const t = setTimeout(startScanner, 100);

    return () => {
      isMounted = false;
      clearTimeout(t);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error).finally(() => {
            scannerRef.current?.clear();
        });
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="w-full h-full relative flex flex-col justify-center bg-black">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-slate-800/50 p-2 rounded-full z-20 backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
        >
          <XMarkIcon className="w-8 h-8" />
        </button>
        
        <div className="relative w-full max-w-md mx-auto px-4 flex flex-col items-center">
          
          {/* Titolo */}
          <div className="text-white text-center mb-6 text-sm font-bold uppercase tracking-widest opacity-80">
            Scannerizza Codice EAN
          </div>

          {/* Area Scanner */}
          <div className="relative w-full aspect-square max-w-[300px] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">
            <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
            
            {/* Loading Spinner */}
            {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                    <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Avvio Fotocamera...</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 z-20 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 text-rose-500 mb-4" />
                    <p className="text-white font-bold text-sm mb-2">Errore Accesso</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
                    <button onClick={onClose} className="mt-6 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700">Chiudi</button>
                </div>
            )}

            {/* Overlay Grafico (Mostrato solo se attivo) */}
            {!loading && !error && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-green-500/50 rounded-lg relative shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-400 -mt-0.5 -ml-0.5 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-400 -mt-0.5 -mr-0.5 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-400 -mb-0.5 -ml-0.5 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-400 -mb-0.5 -mr-0.5 rounded-br-lg"></div>
                        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                    </div>
                 </div>
            )}
          </div>
        </div>

        {!loading && !error && (
            <p className="text-white/50 text-center mt-8 text-xs font-medium px-8 animate-pulse">
            Mantieni il codice a barre al centro
            </p>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
