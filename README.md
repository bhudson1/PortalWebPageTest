# VanMap Portal OAuth-to-hosting test v4

This GitHub Pages site is a diagnostic test, not the production GLU Explorer.

## Installation
Upload `index.html` to the root of `bhudson1/PortalWebPageTest` and hard-refresh the site. The registered redirect URL must match the GitHub Pages URL exactly. No access tokens are included in this file.

## Test steps
1. From a City-network/VPN-connected browser, open the deployed GitHub Pages site.
2. Click **1 · Sign in with City Portal**. Complete SSO if prompted.
3. Click **2 · Test OAuth → hosting token**. The page first sends the OAuth access token via an HTTPS form POST to the hosting service. If that is rejected, it attempts to exchange the Portal token for a server-specific token using the Portal `generateToken` operation. If either succeeds, the ArcGIS Map SDK is asked to render the layer.
4. If unsuccessful, click **4 · Diagnose browser access** and capture diagnostics and any *redacted* browser Console CORS errors.
5. **Do not paste or share** tokens, Authorization headers, OAuth fragments, or the request body from the browser Network tab.

## Expected outcomes
- `A: readable HTTP 200; valid JSON` and map success: Portal token itself works; SDK resource-to-credential matching may be the issue.
- `A: ArcGIS error 498/499`, `B: valid JSON`: server-scoped token exchange works and should enable FeatureLayer.
- `A: ArcGIS error 498/499`, `B: no readable response`: Portal token exchange is blocked by CORS, browser network policy, or reverse proxy; requires City-side assistance or deployment in the Portal-trusted origin.
- `A: ArcGIS error 498/499`, `B: ArcGIS error`: token or federated server URL not accepted; error code indicates next step.

The test does not save tokens to localStorage, source code, or logs; HTTPS POST bodies are only sent to the specified geo.vancouver.ca endpoints. `js.arcgis.com` serves the Maps SDK.

ArcGIS Enterprise documentation: https://developers.arcgis.com/rest/users-groups-and-items/authentication/ and https://developers.arcgis.com/rest/users-groups-and-items/generate-token/
