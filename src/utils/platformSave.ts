// ─────────────────────────────────────────────────────────────────────────────
// platformSave — save a text file on Tauri, Capacitor, or Web
//
// ponytail: dynamic imports keep the bundle tree-shakeable; if a native
// platform package is missing the fallback to web Blob still works.
// ─────────────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';

/**
 * Save a string as a file. Picks the right API automatically:
 *  1. Tauri -> plugin-dialog + plugin-fs (save dialog)
 *  2. Capacitor native -> Filesystem.writeFile + Share.share
 *  3. Web fallback -> Blob + <a download>
 */
export async function platformSave(content: string, filename: string): Promise<void> {
  // -- Tauri --
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const { save } = await import('@tauri-apps/api/dialog');
      const { writeTextFile } = await import('@tauri-apps/api/fs');
      const path = await save({
        defaultPath: filename,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path) {
        await writeTextFile(path, content);
      }
      return;
    } catch (err) {
      console.warn('[platformSave] Tauri API failed, falling back to web:', err);
    }
  }

  // -- Capacitor native --
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const result = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: filename,
        url: result.uri,
        dialogTitle: 'Save backup',
      });
      return;
    } catch (err) {
      console.warn('[platformSave] Capacitor API failed, falling back to web:', err);
    }
  }

  // -- Web fallback --
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
