import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the backup to a temporary file and opens the share sheet (Files, AirDrop, Mail…). */
export async function saveBackupFile(name: string, json: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save Splitty backup',
  });
}

/** Lets the user pick a backup file. Resolves null if they cancel. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
