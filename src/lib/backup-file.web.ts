import * as DocumentPicker from 'expo-document-picker';

/** Downloads the backup as a file. */
export async function saveBackupFile(name: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lets the user pick a backup file. Resolves null if they cancel. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}
