const COOKIE_NAME_PREFIX = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+=.*/;

const splitCombinedSetCookieHeader = (setCookieHeader: string) => {
  const cookies: string[] = [];
  let current = "";
  let inExpiresValue = false;

  for (let index = 0; index < setCookieHeader.length; index += 1) {
    const char = setCookieHeader[index];

    if (char === ",") {
      const nextChunk = setCookieHeader.slice(index + 1).trimStart();

      if (!inExpiresValue && COOKIE_NAME_PREFIX.test(nextChunk)) {
        if (current.trim()) {
          cookies.push(current.trim());
        }
        current = "";
        continue;
      }
    }

    current += char;

    if (!inExpiresValue && current.toLowerCase().endsWith("expires=")) {
      inExpiresValue = true;
    } else if (inExpiresValue && char === ";") {
      inExpiresValue = false;
    }
  }

  if (current.trim()) {
    cookies.push(current.trim());
  }

  return cookies;
};

export const getSetCookieHeaders = (response: Response) => {
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithCookies.getSetCookie === "function") {
    return headersWithCookies.getSetCookie().filter(Boolean);
  }

  const combinedHeader = headersWithCookies.get("set-cookie");
  if (!combinedHeader) {
    return [];
  }

  return splitCombinedSetCookieHeader(combinedHeader).filter(Boolean);
};
