'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Download,
  Share2,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image: string;
  category: 'eyewear' | 'jewelry' | 'accessories' | 'clothing';
  arOverlay?: string;
}

interface VirtualTryOnProps {
  products: Product[];
  onCapture?: (imageData: string) => void;
  onShare?: (imageData: string) => void;
}

export function VirtualTryOn({ products, onCapture, onShare }: VirtualTryOnProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 30 });
  const [overlayScale, setOverlayScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserImage(e.target?.result as string);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (canvasRef.current && userImage && selectedProduct) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCapture?.(dataUrl);
    }
  }, [userImage, selectedProduct, onCapture]);

  const handleShare = useCallback(() => {
    if (canvasRef.current && userImage && selectedProduct) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onShare?.(dataUrl);
    }
  }, [userImage, selectedProduct, onShare]);

  const resetPosition = () => {
    setOverlayPosition({ x: 50, y: 30 });
    setOverlayScale(1);
  };

  const categoryLabels = {
    eyewear: 'Eyewear',
    jewelry: 'Jewelry',
    accessories: 'Accessories',
    clothing: 'Clothing',
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <CardTitle>Virtual Try-On</CardTitle>
            <Badge variant="secondary">AI Powered</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload your photo and see how products look on you
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Upload Area */}
        <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
          {userImage ? (
            <>
              <Image
                src={userImage}
                alt="Your photo"
                fill
                className="object-contain"
              />
              {selectedProduct?.arOverlay && (
                <div
                  className="absolute transition-transform"
                  style={{
                    left: `${overlayPosition.x}%`,
                    top: `${overlayPosition.y}%`,
                    transform: `translate(-50%, -50%) scale(${overlayScale})`,
                  }}
                >
                  <Image
                    src={selectedProduct.arOverlay}
                    alt={selectedProduct.name}
                    width={200}
                    height={100}
                    className="pointer-events-none"
                  />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {isProcessing ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Processing image...</p>
                </>
              ) : (
                <>
                  <Camera className="h-16 w-16 text-gray-400" />
                  <p className="text-muted-foreground text-center">
                    Upload a photo to start trying on products
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Controls */}
        {userImage && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setOverlayScale((s) => s * 1.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setOverlayScale((s) => s * 0.9)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetPosition}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Move className="h-4 w-4" />
            </Button>
            <div className="border-l h-8 mx-2" />
            <Button variant="outline" size="icon" onClick={handleCapture}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <div className="border-l h-8 mx-2" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Change Photo
            </Button>
          </div>
        )}

        {/* Product Selection */}
        <Tabs defaultValue="eyewear" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(categoryLabels).map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="grid grid-cols-4 gap-3">
                {products
                  .filter((p) => p.category === category)
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
              </div>
              {products.filter((p) => p.category === category).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No products available in this category for virtual try-on
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {selectedProduct && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded overflow-hidden">
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {categoryLabels[selectedProduct.category]}
                </p>
              </div>
            </div>
            <Button>View Product</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VirtualTryOn;
