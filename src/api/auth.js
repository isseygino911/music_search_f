import axios from 'axios';
import { BASE_URL } from './config';

export async function register(email, password, displayName) {
  const { data } = await axios.post(`${BASE_URL}/api/auth/register`, {
    email,
    password,
    display_name: displayName,
  });
  return data;
}

export async function login(email, password) {
  const { data } = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
  return data;
}
