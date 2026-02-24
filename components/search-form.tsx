'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';

interface SearchFormProps {
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  onSubmit?: (data: any) => void;
}

export default function SearchForm({
  title = 'Find Your Route',
  showTitle = true,
  onSubmit,
}: SearchFormProps) {
  const [selectedTrip, setSelectedTrip] = useState('One way');
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Mock address suggestions (in production, use Google Places API)
  const lagosLocations = [
    'Lekki Phase 1, Lagos',
    'Lekki Phase 2, Lagos',
    'Victoria Island, Lagos',
    'Ikoyi, Lagos',
    'Ajah, Lagos',
    'Ikeja, Lagos',
    'Surulere, Lagos',
    'Yaba, Lagos',
    'Festac, Lagos',
    'Badagry, Lagos',
  ];

  const handlePickupChange = (value: string) => {
    setPickup(value);
    if (value.length > 0) {
      const filtered = lagosLocations.filter((loc) =>
        loc.toLowerCase().includes(value.toLowerCase())
      );
      setPickupSuggestions(filtered);
      setShowPickupDropdown(true);
    } else {
      setPickupSuggestions([]);
      setShowPickupDropdown(false);
    }
  };

  const handleDestChange = (value: string) => {
    setDestination(value);
    if (value.length > 0) {
      const filtered = lagosLocations.filter((loc) =>
        loc.toLowerCase().includes(value.toLowerCase())
      );
      setDestSuggestions(filtered);
      setShowDestDropdown(true);
    } else {
      setDestSuggestions([]);
      setShowDestDropdown(false);
    }
  };

  const selectPickup = (location: string) => {
    setPickup(location);
    setShowPickupDropdown(false);
  };

  const selectDest = (location: string) => {
    setDestination(location);
    setShowDestDropdown(false);
  };

  const handleSearch = () => {
    if (onSubmit) {
      onSubmit({ tripType: selectedTrip, pickup, destination, date });
    }
  };

  return (
    <div className="w-full">
      {showTitle && <h2 className="text-2xl font-bold text-foreground mb-6 font-mono">{title}</h2>}

      <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
        {/* Search Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
          {/* Pickup Location */}
          <div className="relative">
            <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
              Pick up location
            </label>
            <div className="flex items-center gap-4 px-5 py-4 bg-background rounded-lg border border-input hover:border-primary/50 transition-colors">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter address"
                value={pickup}
                onChange={(e) => handlePickupChange(e.target.value)}
                onFocus={() => pickup.length > 0 && setShowPickupDropdown(true)}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
              />
            </div>
            {showPickupDropdown && pickupSuggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-10">
                {pickupSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectPickup(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-primary/10 transition-colors text-sm text-foreground border-b border-border last:border-b-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
              Destination location
            </label>
            <div className="flex items-center gap-4 px-5 py-4 bg-background rounded-lg border border-input hover:border-primary/50 transition-colors">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter address"
                value={destination}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={() => destination.length > 0 && setShowDestDropdown(true)}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
              />
            </div>
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-10">
                {destSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectDest(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-primary/10 transition-colors text-sm text-foreground border-b border-border last:border-b-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-foreground uppercase mb-2 block font-mono">
                First trip
              </label>
              <div className="flex items-center gap-4 px-5 py-4 bg-background rounded-lg border border-input hover:border-primary/50 transition-colors">
                <svg className="w-5 h-5 text-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
                />
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="flex items-center justify-center w-14 h-14 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors flex-shrink-0 mt-7"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
