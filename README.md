# VanMap Portal browser-network diagnostic (v3)

This is a one-file, client-side GitHub Pages diagnostic for a City of Vancouver ArcGIS Enterprise Portal and its hosted Sites_over_5_acres layer. It does **not** embed any access tokens, cookies or client secrets. The OAuth Client ID is public client configuration.

## Deploy

Upload `index.html` to the root of your existing GitHub Pages repository `PortalWebPageTest`, replacing the prior test. Keep the registered OAuth redirect `https://bhudson1.github.io/PortalWebPageTest/`. Force-reload the website after GitHub has published the change.

## Diagnostic sequence

1. Use **1 · Sign in with City Portal** to verify OAuth SSO. The app may restore an existing session automatically.
2. Use **2 · Load secured layer** and read the diagnostics.
3. If it says **Failed to fetch**, use **3 · Diagnose browser access**. This performs *unauthenticated*, cookie-free browser fetches to (a) Portal REST metadata and (b) hosted layer REST metadata. HTTP 498/499 or an ArcGIS error JSON means the browser could read the response, whereas `Failed to fetch` means there was no readable response.
4. Open **Portal REST** and **layer REST** links in new tabs. If navigation works but browser fetch fails, check DevTools Console for CORS policy, local-network access, certificate, VPN, or policy errors. New-tab navigation is not subject to the same CORS checks as JavaScript `fetch`.
5. If staff have a browser site permission for local network access, ensure the GitHub Pages site is allowed. Do not bypass enterprise security controls.

The origin to verify in allowed-origin/CORS configuration, **if a CORS restriction is confirmed**, is `https://bhudson1.github.io` (the origin, **not** the `/PortalWebPageTest/` path). ArcGIS Portal and its Hosting Server and any reverse proxy may have distinct CORS rules. Check with the Portal administrator if changes are required.

No need to register a second OAuth application if existing SSO sign-in works.

## Security

Do not commit any temporary ArcGIS token or client secret to GitHub. The temporary-token input in the page is for one-time local testing only and stores it in page memory. Keep this test page limited to non-sensitive service metadata in a public repository; access to secured layers remains enforced by Portal.

## Limitations

A completed no-CORS fetch is opaque and cannot confirm a successful REST response. This diagnostic cannot itself enable CORS, solve VPN restrictions, or verify access from outside the City network. The main GIS app will require working authenticated, browser-readable REST requests to retrieve secured data from GitHub Pages.
