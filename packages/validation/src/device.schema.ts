import { z } from 'zod';

export const deviceRegistrationSchema = z.object({
  pairingToken: z.string().length(64, 'Invalid pairing token format'),
  publicKey: z.string().min(1, 'Public key is required'),
  deviceInfo: z.object({
    deviceName: z.string().min(1).max(200),
    manufacturer: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    androidVersion: z.string().min(1).max(20),
    securityPatchLevel: z.string().min(1).max(20),
    serialNumber: z.string().min(1).max(100),
  }),
});

export const deviceCommandSchema = z.object({
  type: z.enum([
    'GET_DEVICE_INFO',
    'GET_BATTERY_STATUS',
    'GET_NETWORK_STATUS',
    'PING',
    'REQUEST_DIAGNOSTIC',
  ]),
  payload: z.record(z.unknown()).optional(),
});

export type DeviceRegistrationInput = z.infer<typeof deviceRegistrationSchema>;
export type DeviceCommandInput = z.infer<typeof deviceCommandSchema>;
