import axios from 'axios'

const instance = axios.create({
  // baseURL: 'https://psi.example.kz/api',
  baseURL: 'http://localhost:3000/api',
  withCredentials: false,
  headers: {},
})

export { instance }
