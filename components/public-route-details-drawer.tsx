'use client';

import { useMemo } from 'react';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { Clock3, MapPinned, Route as RouteIcon, Ticket, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils/client-api';
import type { PublicRouteCardItem } from '@/components/public-route-card';

interface PickupPointDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  tokenCost: number;
}

interface RouteDetailDto extends PublicRouteCardItem {
  companyId: string | null;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
  pickupPoints: PickupPointDto[];
}

interface PublicRouteDetailsDrawerProps {
  routeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number): string {
  return `NGN ${amount.toLocaleString()}`;
}

export default function PublicRouteDetailsDrawer({ routeId, open, onOpenChange }: PublicRouteDetailsDrawerProps) {
  const detailQuery = useQuery({
    queryKey: ['public-route', routeId],
    enabled: open && Boolean(routeId),
    queryFn: async (): Promise<RouteDetailDto> => {
      const response = await apiRequest<RouteDetailDto>(`/api/routes/${routeId}`, { skipAuth: true });
      if (response.hasError || !response.data) {
        throw new Error(response.message || 'Unable to load route details');
      }
      return response.data;
    },
  });

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded: mapLoaded } = useJsApiLoader({
    id: 'tripline-public-routes-map',
    googleMapsApiKey: mapsKey,
  });

  const detail = detailQuery.data;
  const mapPoints = useMemo(() => {
    if (!detail) return [] as Array<{ lat: number; lng: number; title: string }>;
    return [
      { lat: detail.fromLatitude, lng: detail.fromLongitude, title: 'Origin' },
      ...detail.pickupPoints.map((point) => ({ lat: point.latitude, lng: point.longitude, title: point.name })),
      { lat: detail.toLatitude, lng: detail.toLongitude, title: 'Destination' },
    ];
  }, [detail]);

  const center = useMemo(() => {
    if (mapPoints.length === 0) return { lat: 6.5244, lng: 3.3792 };
    const lat = mapPoints.reduce((sum, point) => sum + point.lat, 0) / mapPoints.length;
    const lng = mapPoints.reduce((sum, point) => sum + point.lng, 0) / mapPoints.length;
    return { lat, lng };
  }, [mapPoints]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-4xl">
        <DrawerHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DrawerTitle>{detail?.name ?? 'Route details'}</DrawerTitle>
              <DrawerDescription>
                {detail
                  ? `${detail.fromName} to ${detail.toName}`
                  : 'Explore route overview, pickup points, and live map context.'}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {detailQuery.isLoading ? (
            <div className="space-y-5">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-80 rounded-3xl" />
              <Skeleton className="h-52 rounded-3xl" />
            </div>
          ) : null}

          {detailQuery.isError ? (
            <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
              {(detailQuery.error as Error).message}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${detail.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {detail.status === 'available' ? 'Available' : 'Coming Soon'}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {detail.pickupPoints.length} pickup points
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-card p-4">
                    <div className="flex items-center gap-2 text-primary"><Ticket className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Base Fare</span></div>
                    <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(detail.baseTokenCost)}</p>
                  </div>
                  <div className="rounded-2xl bg-card p-4">
                    <div className="flex items-center gap-2 text-primary"><RouteIcon className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Stops</span></div>
                    <p className="mt-2 text-lg font-semibold text-foreground">{detail.pickupPoints.length}</p>
                  </div>
                  <div className="rounded-2xl bg-card p-4">
                    <div className="flex items-center gap-2 text-primary"><Clock3 className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Service</span></div>
                    <p className="mt-2 text-lg font-semibold text-foreground">{detail.status === 'available' ? 'Ready to launch rides' : 'Waitlist mode'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <h3 className="text-lg font-semibold text-foreground font-mono">Map View</h3>
                <p className="mt-1 text-sm text-muted-foreground">Origin, destination, and each pickup point are plotted below.</p>
                <div className="mt-4 h-[320px] overflow-hidden rounded-2xl border border-border bg-muted/20">
                  {mapLoaded && detail ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={center}
                      zoom={11}
                      options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
                    >
                      <PolylineF path={mapPoints.map((point) => ({ lat: point.lat, lng: point.lng }))} options={{ strokeColor: '#2eab66', strokeOpacity: 0.9, strokeWeight: 4 }} />
                      {mapPoints.map((point, index) => (
                        <MarkerF key={`${point.title}-${index}`} position={{ lat: point.lat, lng: point.lng }} title={point.title} />
                      ))}
                    </GoogleMap>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading route map...</div>
                  )}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <h3 className="text-lg font-semibold text-foreground font-mono">Pickup Points</h3>
                  <div className="mt-4 space-y-3">
                    {detail.pickupPoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pickup points have been configured for this route yet.</p>
                    ) : (
                      detail.pickupPoints.map((point) => (
                        <div key={point.id} className="rounded-2xl border border-border/70 bg-card p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-primary">Stop {point.orderIndex}</p>
                              <p className="mt-1 font-medium text-foreground">{point.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              {formatCurrency(point.tokenCost)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-background p-5">
                  <h3 className="text-lg font-semibold text-foreground font-mono">Route Summary</h3>
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-2xl bg-card p-4">
                      <div className="flex items-center gap-2 text-primary"><MapPinned className="h-4 w-4" /><span className="font-semibold">Origin</span></div>
                      <p className="mt-2 text-foreground">{detail.fromName}</p>
                    </div>
                    <div className="rounded-2xl bg-card p-4">
                      <div className="flex items-center gap-2 text-primary"><MapPinned className="h-4 w-4" /><span className="font-semibold">Destination</span></div>
                      <p className="mt-2 text-foreground">{detail.toName}</p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border p-4 text-muted-foreground">
                      Riders will choose one of these pickup points during booking, and that stop cost becomes the actual booking cost snapshot.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
