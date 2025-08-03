/**
 * Client-side authenticated API helpers
 */

/**
 * Make authenticated API request with Clerk token
 */
export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<Response> {
  try {
    const token = await getToken({ template: "supabase" });
    if (!token) {
      throw new Error("No authentication token available");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("Authenticated request failed:", error);
    throw error;
  }
}

/**
 * Authenticated GET request
 */
export async function authenticatedGet(
  url: string,
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<Response> {
  return makeAuthenticatedRequest(url, { method: "GET" }, getToken);
}

/**
 * Authenticated POST request
 */
export async function authenticatedPost(
  url: string,
  data: unknown,
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<Response> {
  return makeAuthenticatedRequest(
    url,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    getToken
  );
}

/**
 * Authenticated PUT request
 */
export async function authenticatedPut(
  url: string,
  data: unknown,
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<Response> {
  return makeAuthenticatedRequest(
    url,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    getToken
  );
}

/**
 * Authenticated DELETE request
 */
export async function authenticatedDelete(
  url: string,
  data?: unknown,
  getToken?: (options?: { template?: string }) => Promise<string | null>
): Promise<Response> {
  if (getToken) {
    return makeAuthenticatedRequest(
      url,
      {
        method: "DELETE",
        body: data ? JSON.stringify(data) : undefined,
      },
      getToken
    );
  } else {
    // Fallback for non-authenticated delete (for system operations)
    return fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}
