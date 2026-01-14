
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ScannerProps {
  onAnalyze: (images: string[]) => void;
  isProcessing: boolean;
  demoImage?: string | null;
  tutorialAssetsFlying?: string[];
}

const Scanner: React.FC<ScannerProps> = ({ onAnalyze, isProcessing, demoImage, tutorialAssetsFlying = [] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isActive, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    if (demoImage || tutorialAssetsFlying.length > 0) return;
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err: any) {
      setCameraError("Camera access denied.");
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current && capturedImages.length < 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0) return;
      
      canvas.width = 1024;
      canvas.height = Math.round((video.videoHeight * 1024) / video.videoWidth);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.85)]);
        if (capturedImages.length === 2) stopCamera();
      }
    }
  }, [capturedImages, stream]);

  const handleAnalyze = () => {
    if (capturedImages.length > 0) {
      onAnalyze(capturedImages);
      setCapturedImages([]);
      stopCamera();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 w-full max-w-2xl mx-auto">
      <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-[4rem] overflow-hidden shadow-6xl border-[16px] border-white group">
        
        {/* Default View */}
        {!isActive && !isProcessing && !demoImage && tutorialAssetsFlying.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-10 bg-gradient-to-br from-slate-900 via-slate-800 to-black p-10">
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform">
                <i className="fas fa-camera-viewfinder text-emerald-400 text-4xl"></i>
              </div>
              <h3 className="text-white text-3xl font-black tracking-tight mb-3 uppercase">Neural Eye</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[250px] mx-auto">Scan products or fresh produce for instant AI profiling.</p>
            </div>
            
            <button onClick={startCamera} className="bg-emerald-500 text-white px-12 py-6 rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-5xl active:scale-95 flex items-center space-x-4">
              <i className="fas fa-video"></i>
              <span>Activate Neural Stream</span>
            </button>
          </div>
        )}

        {/* Tutorial Asset Previews Flying In */}
        {tutorialAssetsFlying.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center gap-6 p-8 overflow-hidden bg-slate-900/40">
             {tutorialAssetsFlying.map((url, i) => (
               <div key={i} className="relative w-24 h-32 bg-white rounded-2xl overflow-hidden shadow-6xl animate-fly-to-scanner ring-4 ring-emerald-500/30">
                  <img src={url} className="w-full h-full object-cover" alt="Flying Item" />
                  <div className="absolute inset-0 bg-emerald-400/10 animate-pulse"></div>
               </div>
             ))}
          </div>
        )}

        {/* Demo scanning view */}
        {demoImage && tutorialAssetsFlying.length === 0 && !isProcessing && (
          <div className="absolute inset-0 animate-in fade-in duration-1000">
             <img src={demoImage} className="w-full h-full object-cover" alt="Demo Scan" />
             <div className="absolute inset-0 bg-emerald-500/20">
                <div className="w-full h-2 bg-emerald-400 absolute animate-[scan_3s_ease-in-out_infinite] shadow-[0_0_40px_#10b981]"></div>
             </div>
             <div className="absolute top-10 left-10 bg-emerald-500 text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl">Scanning Reference Asset</div>
          </div>
        )}

        {/* Live Camera View */}
        {isActive && !demoImage && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-12 left-12 right-12 flex justify-between items-center z-10">
              <div className="bg-black/80 backdrop-blur-2xl px-6 py-3 rounded-full text-white text-[11px] font-black uppercase tracking-widest border border-white/10">
                Frame {capturedImages.length + 1} / 3
              </div>
              <button onClick={stopCamera} className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="absolute bottom-16 left-0 right-0 flex justify-center z-10">
              <button onClick={capture} className="w-24 h-24 bg-white rounded-full p-2 shadow-6xl active:scale-90 transition-transform">
                 <div className="w-full h-full rounded-full border-4 border-slate-900 flex items-center justify-center">
                    <div className="w-14 h-14 bg-slate-900 rounded-full"></div>
                 </div>
              </button>
            </div>
          </>
        )}

        {/* Analysis Loading Screen */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-16 text-center animate-in fade-in duration-500">
            <div className="relative mb-14">
              <div className="w-32 h-32 border-4 border-emerald-500/10 rounded-full animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute inset-0 border-t-4 border-emerald-400 rounded-full animate-spin"></div>
              <i className="fas fa-microchip absolute inset-0 flex items-center justify-center text-emerald-400 text-5xl animate-pulse"></i>
            </div>
            <h3 className="text-4xl font-black tracking-tight mb-4 uppercase">Neural Extraction</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">Resolving molecular structures and verifying nutritional integrity signatures.</p>
          </div>
        )}
      </div>

      {!demoImage && tutorialAssetsFlying.length === 0 && (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between px-6">
              <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Neural Buffer</span>
              <span className="text-[12px] text-emerald-500 font-black uppercase tracking-widest">{capturedImages.length} / 3 SAMPLES</span>
            </div>
            <div className="flex gap-6">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex-1 aspect-square bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden relative shadow-sm hover:shadow-xl transition-all">
                  {capturedImages[idx] ? (
                    <img src={capturedImages[idx]} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <i className="fas fa-cube text-2xl"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {capturedImages.length > 0 && !isProcessing && (
              <button onClick={handleAnalyze} className="w-full py-8 bg-slate-900 text-white font-black rounded-full hover:bg-slate-800 transition-all shadow-6xl uppercase text-xs tracking-[0.4em] active:scale-95">
                <i className="fas fa-bolt mr-4 text-emerald-400"></i> Run Final Analysis
              </button>
            )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scanner;
