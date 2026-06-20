import axios from 'axios';

export async function getProfile() {
  const { data } = await axios.get('/api/users/me');
  return data;
}

export async function updateProfile(displayName) {
  const { data } = await axios.put('/api/users/me', { display_name: displayName });
  return data;
}

export async function getDownloadHistory(page = 1) {
  const { data } = await axios.get('/api/users/me/downloads', { params: { page } });
  return data;
}
