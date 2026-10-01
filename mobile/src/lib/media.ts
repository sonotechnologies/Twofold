import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio';

const MAX_EDGE = 1280;

export type PickedImage = { uri: string; width: number; height: number };

/** Pick or take a photo, then shrink it (≤1280px, JPEG 70%) so it sends fast on slow networks. */
export async function pickImage(source: 'library' | 'camera'): Promise<PickedImage | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Allow camera access in Settings to take photos.' : 'Allow photo access in Settings to send photos.');

  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (result.canceled || !result.assets[0]) return null;
  return compressImage(result.assets[0]);
}

export async function compressImage(asset: { uri: string; width: number; height: number }): Promise<PickedImage> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  const longest = Math.max(asset.width, asset.height);
  if (longest > MAX_EDGE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** Small mono AAC voice notes (~240 KB per minute). */
export const voiceRecordingOptions: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.LOW },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

/** Turn metering samples (dBFS, about -60..0) into a fixed number of bar heights (4..24). */
export function toWaveform(samples: number[], bars = 24): number[] {
  if (samples.length === 0) return Array.from({ length: bars }, () => 6);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const slice = samples.slice(Math.floor((i * samples.length) / bars), Math.max(Math.floor(((i + 1) * samples.length) / bars), Math.floor((i * samples.length) / bars) + 1));
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const level = Math.max(0, Math.min(1, (avg + 50) / 50));
    out.push(Math.round(4 + level * 20));
  }
  return out;
}
