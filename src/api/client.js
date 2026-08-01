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

async function request(path, options = {}) {
  const provider = getStorageProvider();
  const { method = "GET", body, headers = {}, ...rest } = options;

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
    throw new ApiError(
      message,
      response.status,
      payload?.error || "ApiError",
      payload?.details,
    );
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
