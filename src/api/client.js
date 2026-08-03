import { getStorageProvider } from "../storage/index.js";
import { sessionStore } from "./session.js";
import { CONFIG } from "../config.js";

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const AUTH_NO_REFRESH_PATHS = ["/api/auth/login", "/api/auth/refresh"];
let refreshPromise = null;

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.endsWith("/index.html") || path === "/") return;
  window.location.href = "index.html";
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = sessionStore.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(
        "No refresh token available",
        401,
        "RefreshError",
      );
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (e) {
      payload = null;
    }

    if (!response.ok || !payload?.data?.token) {
      throw new ApiError(
        payload?.message || "Token refresh failed",
        response.status || 401,
        payload?.error || "RefreshError",
        payload?.details,
      );
    }

    sessionStore.setToken(payload.data.token);
    sessionStore.setRefreshToken(payload.data.refreshToken);
    return payload.data.token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request(path, options = {}) {
  const provider = getStorageProvider();
  const { method = "GET", body, headers = {}, _isRetry = false, ...rest } = options;

  const finalHeaders = { "Content-Type": "application/json", ...headers };
  const token = sessionStore.getToken() || provider.token;
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const fetchOptions = { method, headers: finalHeaders, ...rest };
  if (body !== undefined) {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response;
  try {
    console.log("FETCH", `${CONFIG.API_BASE_URL}${path}`, fetchOptions);

    response = await fetch(`${CONFIG.API_BASE_URL}${path}`, fetchOptions);
  } catch (e) {
    throw new ApiError(
      `Unable to reach the server (${method} ${path})`,
      0,
      "NetworkError",
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message || `Request failed with status ${response.status}`;
    const error = new ApiError(
      message,
      response.status,
      payload?.error || "ApiError",
      payload?.details,
    );

    if (response.status === 401 && !_isRetry && !AUTH_NO_REFRESH_PATHS.includes(path)) {
      try {
        await refreshAccessToken();
      } catch (refreshError) {
        sessionStore.clear();
        redirectToLogin();
        throw error;
      }
      return request(path, { ...options, _isRetry: true });
    }

    throw error;
  }

  return payload;
}

export const apiClient = {
  request,
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path),
};
