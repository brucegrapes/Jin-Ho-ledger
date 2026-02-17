import os from 'os';

export function getTempDir() {
  // Prefer /tmp if available, else fallback to OS temp dir
  if (os.platform() === 'win32') {
    return os.tmpdir();
  }
  return '/tmp';
}
