import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://192.168.19.100:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

