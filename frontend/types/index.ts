export type SpotStatus = 'AVAILABLE' | 'RESERVED' | 'PENDING_VERIFICATION' | 'CLAIMED' | 'LOCKED';

export interface Spot {
  spotNumber: number;
  x: number;
  y: number;
  status: SpotStatus;
  name?: string | null;
  message?: string | null;
  claimedAt?: string | null;
  moderationStatus?: string;
}

export interface ViewportResponse {
  mode: 'universe' | 'regions' | 'spots';
  claimed?: number;
  available?: number;
  spots?: Spot[];
  regions?: { x: number; y: number; claimed: number }[];
}

export interface Stats {
  claimed: number;
  available: number;
  pendingVerification: number;
  reserved: number;
  total: number;
  launchSpotsRemaining: number;
  currentPriceCents: number;
  nextPriceCents: number;
  launchRevenueCents: number;
  launchRevenueGoalCents: number;
}
