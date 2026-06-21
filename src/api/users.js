import axios from 'axios';
import { BASE_URL } from './config';

export async function getProfile() {
  const { data } = await axios.get(`${BASE_URL}/api/users/me`);
  return data;
}

export async function updateProfile(displayName) {
  const { data } = await axios.put(`${BASE_URL}/api/users/me`, { display_name: displayName });
  return data;
}

export async function getDownloadHistory(page = 1) {
  const { data } = await axios.get(`${BASE_URL}/api/users/me/downloads`, { params: { page } });
  return data;
}
