import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  SERVER_URL: 'server_url',
  USERNAME:   'username',
  PASSWORD:   'password',
};

export async function saveSettings(serverUrl: string, username: string, password?: string) {
  await AsyncStorage.setItem(K.SERVER_URL, serverUrl);
  await AsyncStorage.setItem(K.USERNAME, username);
  if (password) await AsyncStorage.setItem(K.PASSWORD, password);
}

export async function loadSettings(): Promise<{ serverUrl: string; username: string; password: string }> {
  const serverUrl = await AsyncStorage.getItem(K.SERVER_URL);
  const username  = await AsyncStorage.getItem(K.USERNAME);
  const password  = await AsyncStorage.getItem(K.PASSWORD);
  return { serverUrl: serverUrl ?? '', username: username ?? '', password: password ?? '' };
}

export async function clearSettings() {
  await AsyncStorage.removeItem(K.SERVER_URL);
  await AsyncStorage.removeItem(K.USERNAME);
  await AsyncStorage.removeItem(K.PASSWORD);
}
