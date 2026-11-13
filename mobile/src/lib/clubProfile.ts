/**
 * Club profile data the API does not have yet: the rating (sample numbers until 2GIS is
 * connected) and the PC setup of each zone (the specs the club gave us). Pure data.
 */

export type Review = { name: string; stars: number; text: string; when: string };

/** Sample 2GIS-style rating, out of 5 stars. Replace with the 2GIS feed later. */
export const SAMPLE_RATING = {
  value: 4.8,
  count: 128,
  reviews: [
    { name: 'Aidar S.', stars: 5, text: 'Fast PCs, 300 Hz screens and clean headsets. Booked a seat and it was ready.', when: '2 weeks ago' },
    { name: 'Dana K.', stars: 5, text: 'Comfortable chairs and a quiet room. Good for long sessions with the team.', when: '1 month ago' },
    { name: 'Timur B.', stars: 4, text: 'Great hardware. It gets busy on Friday nights, so book ahead.', when: '2 months ago' },
  ] satisfies Review[],
};

export type Setup = {
  characteristics: { cpu: string; gpu: string; ram: string };
  peripherals: { monitor: string; mouse: string; keyboard: string; headphones: string; chair: string };
};

const STANDARD: Setup = {
  characteristics: { cpu: 'R5 9600X', gpu: 'RTX 5060 Ti', ram: 'DDR5 32 GB' },
  peripherals: {
    monitor: 'Asus TUF Gaming 300 Hz',
    mouse: 'HyperX Pulsefire Haste 2',
    keyboard: 'HyperX Alloy Origins',
    headphones: 'HyperX Cloud III',
    chair: 'ANDA SEAT gaming chair',
  },
};

const PREMIUM: Setup = {
  characteristics: { cpu: 'R7 7800X3D', gpu: 'RTX 5070', ram: 'DDR5 32 GB' },
  peripherals: {
    monitor: 'Asus ROG 380 Hz',
    mouse: 'Logitech G Pro X Superlight 2',
    keyboard: 'ROG Falchion',
    headphones: 'Logitech G PRO X',
    chair: 'ANDA SEAT gaming chair',
  },
};

/** The Standard zone has its own setup; the 5x5 and VIP zones share the premium one. */
export function setupForZone(zoneName: string): Setup {
  return /standa?rt/i.test(zoneName) ? STANDARD : PREMIUM;
}
