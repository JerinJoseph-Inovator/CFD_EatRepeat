
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ScannerProps {
  onAnalyze: (images: string[]) => void;
  isProcessing: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onAnalyze, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  useEffect(() => {
    if (isActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isActive, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions and ensure you are using HTTPS.");
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
      
      const maxDim = 768;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width === 0 || height === 0) return;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, dataUrl]);
        
        // If it was the 3rd image, we automatically stop camera to let them focus on the UI
        if (capturedImages.length === 2) {
          stopCamera();
        }
      }
    }
  }, [capturedImages, stream]);

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (capturedImages.length > 0) {
      onAnalyze(capturedImages);
      setCapturedImages([]);
      stopCamera();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full">
      <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
        {!isActive && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center px-8">
              <i className="fas fa-camera-rotate text-emerald-500 text-4xl mb-4"></i>
              <h3 className="text-white text-lg font-bold">Multi-Angle Scan</h3>
              <p className="text-gray-400 text-sm mt-1">Capture up to 3 photos (label, expiry, item) for best results.</p>
            </div>
            
            <button 
              onClick={startCamera}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center space-x-3 transition-all transform hover:scale-105 active:scale-95"
            >
              <i className="fas fa-camera"></i>
              <span>{capturedImages.length > 0 ? 'Continue Scanning' : 'Start Scanning'}</span>
            </button>
          </div>
        )}

        {isActive && (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
              <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/20">
                Shot {capturedImages.length + 1} / 3
              </div>
              <button 
                onClick={stopCamera}
                className="w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors border border-white/20"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-8 z-10">
              <button 
                onClick={capture}
                disabled={capturedImages.length >= 3}
                className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${capturedImages.length >= 3 ? 'bg-gray-400 border-gray-300' : 'bg-white border-emerald-500 hover:bg-emerald-50'} transition-all active:scale-90 shadow-2xl`}
              >
                <div className={`w-14 h-14 rounded-full ${capturedImages.length >= 3 ? 'bg-gray-500' : 'bg-emerald-500'}`}></div>
              </button>
            </div>

            <div className="absolute inset-0 border-[40px] border-black/10 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 rounded-2xl"></div>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <i className="fas fa-microchip absolute inset-0 flex items-center justify-center text-emerald-500 text-2xl"></i>
            </div>
            <h3 className="text-2xl font-bold mb-2">Analyzing Multi-Shots</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Gemini is synthesizing info from all captured angles to identify your product accurately.</p>
          </div>
        )}
      </div>

      {/* Capture Previews */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Captured Views</span>
          <span className="text-xs text-emerald-600 font-bold">{capturedImages.length}/3 shots</span>
        </div>
        <div className="flex gap-4">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="flex-1 aspect-square bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden relative shadow-sm">
              {capturedImages[idx] ? (
                <>
                  <img src={capturedImages[idx]} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-md hover:bg-red-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <i className="fas fa-camera text-xl"></i>
                </div>
              )}
            </div>
          ))}
        </div>

        {capturedImages.length > 0 && !isProcessing && (
          <button 
            onClick={handleAnalyze}
            className="w-full mt-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center space-x-2 transform hover:-translate-y-1"
          >
            <i className="fas fa-wand-magic-sparkles"></i>
            <span>Analyze {capturedImages.length} {capturedImages.length === 1 ? 'Photo' : 'Photos'}</span>
          </button>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scanner;
