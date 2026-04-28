import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  SERVER_URL: 'server_url',
  USERNAME:   'username',
};

export async function saveSettings(serverUrl: string, username: string) {
  await AsyncStorage.setItem(K.SERVER_URL, serverUrl);
  await AsyncStorage.setItem(K.USERNAME, username);
}

export async function loadSettings(): Promise<{ serverUrl: string; username: string }> {
  const serverUrl = await AsyncStorage.getItem(K.SERVER_URL);
  const username  = await AsyncStorage.getItem(K.USERNAME);
  return { serverUrl: serverUrl ?? '', username: username ?? '' };
}

export async function clearSettings() {
  await AsyncStorage.removeItem(K.SERVER_URL);
  await AsyncStorage.removeItem(K.USERNAME);
}
