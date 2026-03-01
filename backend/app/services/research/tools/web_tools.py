"""
Web browsing and search tools for the Sales Copilot research agents.
Uses DuckDuckGo (no API key) for search and httpx for page fetching.
"""

import re
from typing import Optional

import httpx
from strands import tool


# ── HTML utilities ────────────────────────────────────────────────────────────


def _clean_html(html: str, max_chars: int = 4000) -> str:
    """Strip HTML tags, return plain text truncated to max_chars."""
    html = re.sub(
        r"<(script|style|noscript|nav|footer|header)[^>]*>.*?</(script|style|noscript|nav|footer|header)>",
        "",
        html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _extract_href_links(html: str, base_url: str = "") -> list[str]:
    """Extract href URLs from HTML."""
    raw = re.findall(r'href=["\']([^"\']+)["\']', html, re.IGNORECASE)
    links = []
    for href in raw:
        href = href.strip()
        if (
            not href
            or href.startswith("#")
            or href.startswith("mailto:")
            or href.startswith("javascript:")
        ):
            continue
        if href.startswith("//"):
            href = "https:" + href
        elif href.startswith("/") and base_url:
            from urllib.parse import urljoin
            href = urljoin(base_url, href)
        elif not href.startswith("http"):
            if base_url:
                from urllib.parse import urljoin
                href = urljoin(base_url, href)
            else:
                continue
        links.append(href)
    return list(dict.fromkeys(links))


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


# ── Strands tools ─────────────────────────────────────────────────────────────


@tool
def search_web(query: str, max_results: int = 5) -> str:
    """
    Search the web using DuckDuckGo and return a list of results.
    No API key required.

    Args:
        query: Search query string
        max_results: Maximum number of results to return (default 5, max 8)

    Returns:
        JSON-formatted list of search results with title, url, and snippet
    """
    import json

    max_results = min(max_results, 8)
    results = []

    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    }
                )
        return json.dumps(results, indent=2)
    except ImportError:
        pass
    except Exception as e:
        return json.dumps({"error": f"DDGS search failed: {e}", "results": []})

    # Fallback HTML scrape
    try:
        with httpx.Client(
            timeout=15, headers=_HEADERS, follow_redirects=True
        ) as client:
            resp = client.get("https://html.duckduckgo.com/html/", params={"q": query})
            if resp.status_code != 200:
                return json.dumps({"error": f"HTTP {resp.status_code}", "results": []})
            html = resp.text
            titles = re.findall(
                r'class="result__title"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
                html,
                re.DOTALL,
            )
            snippets = re.findall(
                r'class="result__snippet"[^>]*>(.*?)</(?:a|div|span)>', html, re.DOTALL
            )
            for i, (url, title) in enumerate(titles[:max_results]):
                snippet = snippets[i] if i < len(snippets) else ""
                results.append(
                    {
                        "title": re.sub(r"<[^>]+>", "", title).strip(),
                        "url": url,
                        "snippet": re.sub(r"<[^>]+>", "", snippet).strip(),
                    }
                )
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "results": []})


@tool
def fetch_web_page(url: str, max_chars: int = 4000) -> str:
    """
    Fetch the content of a web page and return cleaned plain text.

    Args:
        url: Full URL to fetch (must start with http:// or https://)
        max_chars: Maximum number of characters to return (default 4000)

    Returns:
        Cleaned text content of the web page, or an error message
    """
    try:
        with httpx.Client(
            timeout=20, follow_redirects=True, headers=_HEADERS
        ) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                ct = resp.headers.get("content-type", "")
                if "html" in ct or ct == "":
                    return _clean_html(resp.text, max_chars)
                return resp.text[:max_chars]
            return f"HTTP {resp.status_code} when fetching {url}"
    except Exception as e:
        return f"Error fetching {url}: {e}"


@tool
def extract_page_links(
    url: str, max_links: int = 20, same_domain_only: bool = True
) -> str:
    """
    Fetch a page and return all hyperlinks found on it.

    Args:
        url: URL of the page to scan for links
        max_links: Maximum number of links to return (default 20)
        same_domain_only: If True, only return links on the same domain as the URL

    Returns:
        JSON list of {url, text} objects representing discovered links
    """
    import json
    from urllib.parse import urlparse

    try:
        with httpx.Client(
            timeout=20, follow_redirects=True, headers=_HEADERS
        ) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return json.dumps({"error": f"HTTP {resp.status_code}", "links": []})
            html = resp.text
            base_domain = urlparse(url).netloc

            raw_links = _extract_href_links(html, url)

            link_blocks = re.findall(
                r'<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
                html,
                re.IGNORECASE | re.DOTALL,
            )
            text_map = {
                href: re.sub(r"<[^>]+>", "", txt).strip() for href, txt in link_blocks
            }

            results = []
            seen = set()
            for link in raw_links:
                if same_domain_only:
                    if urlparse(link).netloc != base_domain:
                        continue
                if link in seen:
                    continue
                seen.add(link)
                results.append({"url": link, "text": text_map.get(link, "")})
                if len(results) >= max_links:
                    break

            return json.dumps({"source": url, "links": results}, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "links": []})


@tool
def fetch_multiple_pages(urls_json: str, max_chars_each: int = 3000) -> str:
    """
    Fetch multiple web pages in sequence and return combined content.

    Args:
        urls_json: JSON array of URLs to fetch, e.g. '["https://example.com/about", "https://example.com/products"]'
        max_chars_each: Max characters per page (default 3000)

    Returns:
        JSON object mapping URL → extracted text content
    """
    import json

    try:
        urls = json.loads(urls_json)
    except Exception:
        return json.dumps({"error": "urls_json must be a valid JSON array of URL strings"})

    if not isinstance(urls, list):
        return json.dumps({"error": "urls_json must be a JSON array"})

    results = {}
    with httpx.Client(timeout=15, follow_redirects=True, headers=_HEADERS) as client:
        for url in urls[:3]:  # cap at 3 pages
            try:
                resp = client.get(url)
                if resp.status_code == 200:
                    results[url] = _clean_html(resp.text, max_chars_each)
                else:
                    results[url] = f"HTTP {resp.status_code}"
            except Exception as e:
                results[url] = f"Error: {e}"

    return json.dumps(results, indent=2)
