"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CameraIcon, FlipHorizontalIcon, ScanLine } from "lucide-react";

export const QrScannerComponent = ({ 
  onScan, 
  stopScanning 
}: { 
  onScan: (data: string) => void, 
  stopScanning: boolean 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Set interval ID for scanning
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error("Browser does not support camera");
          return;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true);
            startScanning();
          };
        }
      } catch (error) {
        console.error("Error opening camera:", error);
        toast.error("Cannot open camera, please grant access");
      }
    };

    const startScanning = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      scanIntervalRef.current = setInterval(() => {
        scanQRCode();
      }, 500); // Scan every 500ms
    };

    if (!stopScanning) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      setIsScanning(false);
    };
  }, [stopScanning, facingMode]);

  // QR code scanning function
  const scanQRCode = async () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current frame from video to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Use BarcodeDetector library if supported by the browser
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code']
        });
        
        const barcodes = await barcodeDetector.detect(canvas);
        
        if (barcodes.length > 0) {
          // QR code found
          const qrData = barcodes[0].rawValue;
          if (qrData) {
            clearInterval(scanIntervalRef.current!);
            onScan(qrData);
          }
        }
      }
    } catch (error) {
      console.error("Error scanning QR code:", error);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  // Simulated QR code for testing
  const handleTestQR = () => {
    const testData = JSON.stringify({
      mintAddress: "BJAGZ5GqDxm7bPSDDjM473XCkPFvewtXJHkMnY3KFM7Z",
      amount: 100,
      type: "compressed-token-claim",
      timestamp: new Date().toISOString()
    });
    onScan(testData);
    toast.success("Test QR code scanned");
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-[300px] h-[300px] bg-black mx-auto overflow-hidden rounded-lg">
        <video 
          ref={videoRef} 
          className="absolute top-0 left-0 w-full h-full object-cover"
          playsInline
        />
        <canvas 
          ref={canvasRef} 
          className="hidden"
        />
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-primary border-dashed opacity-70 rounded-md"></div>
            <ScanLine className="absolute text-primary animate-pulse w-44 h-44" />
          </div>
        )}
      </div>
      
      <div className="mt-4 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex gap-1 items-center" 
          onClick={toggleCamera}
        >
          <FlipHorizontalIcon className="w-4 h-4" />
          <span>Switch camera</span>
        </Button>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex gap-1 items-center" 
          onClick={handleTestQR}
        >
          <span>QR Test</span>
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-2">
        {isScanning ? "Place the QR code within the frame to scan" : "Initializing camera..."}
      </p>
    </div>
  );
};