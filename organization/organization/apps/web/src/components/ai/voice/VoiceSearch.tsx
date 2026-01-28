'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Volume2, X, Search } from 'lucide-react';

// Web Speech API types - uses global types from @/types/speech-recognition.d.ts

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  onClose?: () => void;
  placeholder?: string;
  suggestions?: string[];
}

export function VoiceSearch({
  onSearch,
  onClose,
  placeholder = 'Try saying: "Show me red running shoes"',
  suggestions = [
    'Find wireless headphones under $100',
    'Show me trending electronics',
    'Search for summer dresses',
    'Find gifts for mom',
  ],
}: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined') {
      const win = window;
      const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionAPI);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice search is not supported in your browser');
      return;
    }

    setError(null);
    setTranscript('');
    setIsListening(true);

    // Get the SpeechRecognition constructor from window
    const win = window;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Voice search is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        setIsListening(false);
        setIsProcessing(true);
        setTimeout(() => {
          onSearch(text);
          setIsProcessing(false);
        }, 500);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions.');
      } else {
        setError('An error occurred. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isSupported, onSearch]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setTranscript(suggestion);
    onSearch(suggestion);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="pt-6 space-y-6">
        {/* Close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Voice indicator */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-primary animate-pulse'
                : isProcessing
                ? 'bg-yellow-500'
                : 'bg-gray-100'
            }`}
          >
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/50 animate-pulse" />
              </>
            )}
            {isProcessing ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : isListening ? (
              <Volume2 className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-gray-500" />
            )}
          </div>

          <div className="text-center">
            {isListening ? (
              <p className="text-lg font-medium text-primary">Listening...</p>
            ) : isProcessing ? (
              <p className="text-lg font-medium text-yellow-600">Processing...</p>
            ) : (
              <p className="text-muted-foreground">{placeholder}</p>
            )}
          </div>

          {/* Transcript display */}
          {transcript && (
            <div className="w-full p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">You said:</Badge>
              </div>
              <p className="text-lg">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="w-full p-4 bg-red-50 text-red-600 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {isListening ? (
              <Button variant="destructive" size="lg" onClick={stopListening}>
                <MicOff className="h-5 w-5 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={startListening}
                disabled={isProcessing || !isSupported}
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Voice Search
              </Button>
            )}
          </div>

          {!isSupported && (
            <p className="text-sm text-muted-foreground text-center">
              Voice search is not supported in your browser. Try Chrome or Edge.
            </p>
          )}
        </div>

        {/* Suggestions */}
        {!isListening && !transcript && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Try saying:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1"
                >
                  <Search className="h-3 w-3" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VoiceSearch;
