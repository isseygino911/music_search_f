import axios from 'axios';

export async function register(email, password, displayName) {
  const { data } = await axios.post('/api/auth/register', {
    email,
    password,
    display_name: displayName,
  });
  return data;
}

export async function login(email, password) {
  const { data } = await axios.post('/api/auth/login', { email, password });
  return data;
}
