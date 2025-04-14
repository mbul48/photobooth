import React, { useRef, useState, useEffect } from 'react';
import { Camera, Download, Image as ImageIcon, Sparkles, X, Square, Type, Upload } from 'lucide-react';

type PhotoStrip = {
  photos: string[];
  maxPhotos: number;
};

type Effect = {
  name: string;
  filter: string;
};

type Shape = {
  name: string;
  path: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void;
  preview: string;
};

type Language = {
  name: string;
  text: string;
};

const languages: Language[] = [
  { name: 'English', text: 'photobooth' },
  { name: 'Korean', text: '포토부스' },
  { name: 'Japanese', text: 'フォトブース' },
];

const effects: Effect[] = [
  { name: 'Normal', filter: '' },
  { name: 'Grayscale', filter: 'grayscale(100%)' },
  { name: 'Sepia', filter: 'sepia(100%)' },
  { name: 'Blur', filter: 'blur(2px)' },
  { name: 'Brightness', filter: 'brightness(150%)' },
  { name: 'Contrast', filter: 'contrast(200%)' }
];

const shapes: Shape[] = [
  {
    name: 'Regular',
    path: (ctx, x, y, w, h) => {
      ctx.rect(x, y, w, h);
    },
    preview: 'rounded-none'
  },
  {
    name: 'Rounded',
    path: (ctx, x, y, w, h) => {
      const radius = 20;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    },
    preview: 'rounded-xl'
  }
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEffect, setSelectedEffect] = useState<Effect>(effects[0]);
  const [selectedShape, setSelectedShape] = useState<Shape>(shapes[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoStrip, setPhotoStrip] = useState<PhotoStrip>({
    photos: [],
    maxPhotos: 3
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
              // Set canvas size to be square based on the smaller dimension
              const size = Math.min(img.width, img.height);
              canvas.width = size;
              canvas.height = size;

              // Calculate cropping position
              const offsetX = (img.width - size) / 2;
              const offsetY = (img.height - size) / 2;

              // Create a temporary canvas for the shaped photo
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = size;
              tempCanvas.height = size;
              const tempCtx = tempCanvas.getContext('2d');

              if (tempCtx) {
                // Draw the shape
                tempCtx.beginPath();
                selectedShape.path(tempCtx, 0, 0, size, size);
                tempCtx.closePath();
                tempCtx.clip();

                // Apply selected effect
                if (selectedEffect.filter) {
                  tempCtx.filter = selectedEffect.filter;
                }

                // Draw the cropped image
                tempCtx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
                tempCtx.filter = 'none';

                // Copy to main canvas
                context.drawImage(tempCanvas, 0, 0);

                const imageData = canvas.toDataURL('image/png');
                setPhotoStrip(prev => {
                  const newPhotos = [...prev.photos, imageData];
                  return { ...prev, photos: newPhotos };
                });
              }
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas size to match desired aspect ratio (1:1)
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        // Calculate cropping position
        const offsetX = (video.videoWidth - size) / 2;
        const offsetY = (video.videoHeight - size) / 2;
        
        // Create a temporary canvas for the shaped photo
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw the shape
          tempCtx.beginPath();
          selectedShape.path(
            tempCtx,
            0,
            0,
            size,
            size
          );
          tempCtx.closePath();
          tempCtx.clip();
          
          // Apply selected effect
          if (selectedEffect.filter) {
            tempCtx.filter = selectedEffect.filter;
          }
          
          // Draw the cropped video frame
          tempCtx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
          tempCtx.filter = 'none';
          
          // Copy to main canvas
          context.drawImage(tempCanvas, 0, 0);
        }
        
        const imageData = canvas.toDataURL('image/png');
        setPhotoStrip(prev => {
          const newPhotos = [...prev.photos, imageData];
          return { ...prev, photos: newPhotos };
        });

        if (photoStrip.photos.length < photoStrip.maxPhotos - 1) {
          setTimeout(() => {
            setCountdown(3);
            startCountdown();
          }, 1000);
        }
      }
    }
  };

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
      }
    }, 1000);
  };

  const startPhotoSequence = () => {
    setPhotoStrip({ photos: [], maxPhotos: 3 });
    startCountdown();
  };

  const createPhotoStrip = () => {
    if (!stripCanvasRef.current || photoStrip.photos.length === 0) return;

    const canvas = stripCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const photoWidth = Math.round(width * 0.9);
    const photoHeight = Math.round(height * 0.28);
    const topMargin = 30;
    const photoSpacing = 15;

    photoStrip.photos.forEach((photo, index) => {
      const img = new Image();
      img.onload = () => {
        const x = (width - photoWidth) / 2;
        const y = topMargin + (photoHeight + photoSpacing) * index;

        // Create a temporary canvas for the shaped photo
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = photoWidth;
        tempCanvas.height = photoHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          // Draw the shape
          tempCtx.beginPath();
          selectedShape.path(tempCtx, 0, 0, photoWidth, photoHeight);
          tempCtx.closePath();
          tempCtx.clip();

          // Apply selected effect
          if (selectedEffect.filter) {
            tempCtx.filter = selectedEffect.filter;
          }

          // Calculate dimensions to maintain aspect ratio while filling the frame
          const imgAspect = img.width / img.height;
          const frameAspect = photoWidth / photoHeight;
          
          let drawWidth = photoWidth;
          let drawHeight = photoHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspect > frameAspect) {
            // Image is wider than frame
            drawHeight = photoHeight;
            drawWidth = drawHeight * imgAspect;
            offsetX = -(drawWidth - photoWidth) / 2;
          } else {
            // Image is taller than frame
            drawWidth = photoWidth;
            drawHeight = drawWidth / imgAspect;
            offsetY = -(drawHeight - photoHeight) / 2;
          }

          // Draw the photo with cropping
          tempCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          tempCtx.filter = 'none';

          // Copy to main canvas
          ctx.drawImage(tempCanvas, x, y);
        }

        // Add Photobooth text and date after the last photo
        if (index === photoStrip.photos.length - 1) {
          const date = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });

          // Calculate the space between last photo and bottom
          const lastPhotoBottom = y + photoHeight;
          const remainingSpace = height - lastPhotoBottom;
          const textY = lastPhotoBottom + (remainingSpace * 0.6); // Adjusted to 60% of remaining space

          ctx.fillStyle = '#000000';
          
          // Draw photobooth text
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(selectedLanguage.text, width / 2, textY - 15);
          
          // Draw date right below the photobooth text
          ctx.font = '24px Arial';
          ctx.fillText(date, width / 2, textY + 15);
        }
      };
      img.src = photo;
    });
  };

  useEffect(() => {
    if (photoStrip.photos.length === photoStrip.maxPhotos) {
      createPhotoStrip();
      setCameraActive(false);
    }
  }, [photoStrip.photos]);

  useEffect(() => {
    if (photoStrip.photos.length === photoStrip.maxPhotos) {
      createPhotoStrip();
    }
  }, [selectedEffect, selectedShape, selectedLanguage]);

  const downloadPhotoStrip = () => {
    if (stripCanvasRef.current && photoStrip.photos.length === photoStrip.maxPhotos) {
      createPhotoStrip(); // Ensure the strip is up to date with current effects
      setTimeout(() => {
        if (stripCanvasRef.current) {
          const link = document.createElement('a');
          link.download = 'photo-strip.png';
          link.href = stripCanvasRef.current.toDataURL('image/png');
          link.click();
        }
      }, 100); // Small delay to ensure canvas is updated
    }
  };

  const resetPhotoStrip = () => {
    setPhotoStrip({ photos: [], maxPhotos: 3 });
    setCameraActive(false);
    setCountdown(null);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">PhotoBooth</h1>
          <p className="text-gray-600">Create your own photo strip with 3 poses!</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className={`relative aspect-square mb-6 bg-gray-900 overflow-hidden ${selectedShape.preview}`}>
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ filter: selectedEffect.filter }}
                    />
                    {countdown && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <span className="text-white text-7xl font-bold">{countdown}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4 mb-6">
                {!cameraActive ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setCameraActive(true);
                        setTimeout(() => startPhotoSequence(), 1000);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      disabled={photoStrip.photos.length === photoStrip.maxPhotos}
                    >
                      <Camera className="w-5 h-5" />
                      Start Photo Strip
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={photoStrip.photos.length === photoStrip.maxPhotos}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      disabled={photoStrip.photos.length === photoStrip.maxPhotos}
                    >
                      <Upload className="w-5 h-5" />
                      Upload Photo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCameraActive(false)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="relative bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">PhotoBooth Preview</h3>
              <div className="relative bg-white rounded-lg shadow-inner overflow-hidden" style={{ aspectRatio: '1/2' }}>
                {photoStrip.photos.length > 0 ? (
                  <div className="flex flex-col h-full pt-4 px-4" style={{ gap: '10px' }}>
                    {photoStrip.photos.map((photo, index) => (
                      <div key={index} className={`w-full ${selectedShape.preview} overflow-hidden`} style={{ 
                        height: 'calc((100% - 100px) / 3)',
                        marginBottom: index === photoStrip.photos.length - 1 ? 'auto' : '0'
                      }}>
                        <img
                          src={photo}
                          alt={`Strip photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          style={{ filter: selectedEffect.filter }}
                        />
                      </div>
                    ))}
                    {photoStrip.photos.length === photoStrip.maxPhotos && (
                      <div className="text-center flex-1 flex flex-col justify-center pb-4">
                        <div className="font-bold text-lg">{selectedLanguage.text}</div>
                        <div className="text-sm text-gray-600">{new Date().toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <p>Photos will appear here</p>
                  </div>
                )}
              </div>
              {photoStrip.photos.length === photoStrip.maxPhotos && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={downloadPhotoStrip}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Strip
                  </button>
                  <button
                    onClick={resetPhotoStrip}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Type className="w-5 h-5" />
                Text Language
              </h3>
              <div className="flex gap-3 flex-wrap">
                {languages.map((lang) => (
                  <button
                    key={lang.name}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedLanguage.name === lang.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Square className="w-5 h-5" />
                Shapes
              </h3>
              <div className="flex gap-3 flex-wrap">
                {shapes.map((shape) => (
                  <button
                    key={shape.name}
                    onClick={() => setSelectedShape(shape)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedShape.name === shape.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {shape.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Effects
              </h3>
              <div className="flex gap-3 flex-wrap">
                {effects.map((effect) => (
                  <button
                    key={effect.name}
                    onClick={() => setSelectedEffect(effect)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedEffect.name === effect.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {effect.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={stripCanvasRef} className="hidden" />
    </div>
  );
}

export default App;