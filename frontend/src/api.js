import axios from "axios";

const TOKEN_KEY = "fleurish_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const getSignupInfo = () =>
  api.get("/auth/signup-info/").then((r) => r.data);

export const registerUser = (payload) =>
  api.post("/auth/register/", payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post("/auth/login/", payload).then((r) => r.data);

export const logoutUser = () =>
  api.post("/auth/logout/").then((r) => r.data);

export const getMe = () => api.get("/auth/me/").then((r) => r.data);

export const requestUpgrade = (payload) =>
  api.post("/auth/upgrade-request/", payload).then((r) => r.data);

export const getTeamUsers = () =>
  api.get("/auth/team/").then((r) => r.data);

export const createTeamUser = (payload) =>
  api.post("/auth/create-user/", payload).then((r) => r.data);

export const changePassword = (payload) =>
  api.post("/auth/change-password/", payload).then((r) => r.data);

export const getDashboardStats = (date) =>
  api.get("/dashboard/", { params: date ? { date } : {} }).then((r) => r.data);

export const getTodayDeliveries = (params = {}) =>
  api.get("/today/", { params }).then((r) => r.data);

export const updateDeliveryStatus = (id, payload) =>
  api.patch(`/deliveries/${id}/update_status/`, payload).then((r) => r.data);

export const getCustomers = (params = {}) =>
  api.get("/customers/", { params }).then((r) => {
    const data = r.data;
    return Array.isArray(data) ? data : data.results || [];
  });

export const getCustomerAreas = () =>
  api.get("/customers/areas/").then((r) => r.data);

export const createCustomer = (payload) =>
  api.post("/customers/", payload).then((r) => r.data);

export const updateCustomer = (id, payload) =>
  api.put(`/customers/${id}/`, payload).then((r) => r.data);

export const getSchedules = () =>
  api.get("/schedules/").then((r) => {
    const data = r.data;
    return Array.isArray(data) ? data : data.results || [];
  });

export default api;
