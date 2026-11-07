import React from 'react';
import { AdSlotType } from '../types.ts';

interface AdSenseBannerProps {
  type: AdSlotType;
  slotId?: string;
  className?: string;
  onClose?: () => void;
}

// Iklan Google AdSense asli belum dipasang, jadi komponen ini sengaja tidak menampilkan apa pun
// (sebelumnya menampilkan iklan tiruan yang menyesatkan). Setelah akun disetujui, pasang kode
// <ins class="adsbygoogle"> asli dari AdSense di sini.
export const AdSenseBanner: React.FC<AdSenseBannerProps> = () => null;
