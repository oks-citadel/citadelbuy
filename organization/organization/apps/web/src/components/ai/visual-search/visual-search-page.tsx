'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Palette,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { visualSearchService } from '@/services/ai';
import { Product, VisualSearchResult, DetectedObject } from '@/types';
import { cn } from '@/lib/utils';

export function VisualSearchPage() {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<VisualSearchResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [detectedColors, setDetectedColors] = React.useState<string[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
    await performSearch(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
    await performSearch(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setError(null);
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
      await performSearch(file);
    }, 'image/jpeg', 0.9);
  };

  const performSearch = async (file: File) => {
    setIsSearching(true);
    setError(null);

    try {
      const [result, colors] = await Promise.all([
        visualSearchService.searchByImage(file),
        visualSearchService.detectColors(file).catch(() => []),
      ]);

      setSearchResult(result);
      setDetectedColors(colors);
    } catch (err) {
      setError('Search failed. Please try again with a different image.');
      console.error('Visual search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSearchResult(null);
    setDetectedColors([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white py-12">
        <div className="container">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Visual Search</h1>
              <p className="text-white/80">
                Upload or capture an image to find similar products
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>AI-powered recognition</span>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>Find similar styles</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Color matching</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left - Upload Area */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* Camera Mode */}
              {isCameraActive ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : imagePreview ? (
                /* Image Preview */
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={imagePreview}
                      alt="Uploaded image"
                      fill
                      className="object-contain"
                    />
                    {isSearching && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Analyzing image...</p>
                        </div>
                      </div>
                    )}
                    {/* Detected Objects Overlay */}
                    {searchResult?.detectedObjects?.map((obj, index) => (
                      <div
                        key={index}
                        className="absolute border-2 border-primary"
                        style={{
                          left: `${obj.boundingBox.x}%`,
                          top: `${obj.boundingBox.y}%`,
                          width: `${obj.boundingBox.width}%`,
                          height: `${obj.boundingBox.height}%`,
                        }}
                      >
                        <Badge className="absolute -top-6 left-0 text-xs">
                          {obj.label} ({Math.round(obj.confidence * 100)}%)
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Detected Colors */}
                  {detectedColors.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Detected Colors:
                      </p>
                      <div className="flex gap-2">
                        {detectedColors.map((color, index) => (
                          <div
                            key={index}
                            className="h-8 w-8 rounded-full border shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style Match */}
                  {searchResult?.styleMatch && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Style Analysis:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{searchResult.styleMatch.style}</Badge>
                        {searchResult.styleMatch.patterns.map((pattern) => (
                          <Badge key={pattern} variant="outline">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={clearSearch}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Another Image
                    </Button>
                  </div>
                </div>
              ) : (
                /* Upload Area */
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop an image here</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <Button variant="outline" className="mb-4">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span>or</span>
                  </div>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCamera();
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Tips for better results
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use clear, well-lit images</li>
                  <li>• Focus on the main product</li>
                  <li>• Avoid cluttered backgrounds</li>
                  <li>• Higher resolution images work better</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Right - Results */}
          <div className="lg:col-span-3">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p className="font-medium">Searching for similar products...</p>
                <p className="text-sm text-muted-foreground">
                  Our AI is analyzing your image
                </p>
              </div>
            ) : searchResult ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Similar Products</h2>
                    <p className="text-sm text-muted-foreground">
                      Found {searchResult.products.length} matching products
                      {searchResult.confidence && (
                        <span className="ml-1">
                          • {Math.round(searchResult.confidence * 100)}% match confidence
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {searchResult.products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {searchResult.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">No matching products found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try uploading a different image or adjust the photo angle
                    </p>
                    <Button onClick={clearSearch}>
                      Try Another Image
                    </Button>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center h-full flex flex-col items-center justify-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">
                  Find Products with Images
                </h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Upload or take a photo of any product, and our AI will find
                  similar items from our catalog. Works with clothing, furniture,
                  electronics, and more!
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-sm">
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-3xl">
                    👗
                  </div>
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-3xl">
                    🛋️
                  </div>
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-3xl">
                    📱
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
