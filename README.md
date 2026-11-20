# VanMap Portal OAuth + Feature Layer Test v2

This is a **single-file static test** for GitHub Pages. It accesses the ArcGIS Enterprise hosted feature layer only after the user authenticates. The map and diagnostic panel are intentionally compact.

## Deploy

1. Upload `index.html` to the **root** of the `PortalWebPageTest` GitHub Pages repository.
2. In your Portal application item, make sure `https://bhudson1.github.io/PortalWebPageTest/` is in **Redirect URLs** (same spelling, case and trailing slash as the deployed page). If you access `index.html` explicitly, add `https://bhudson1.github.io/PortalWebPageTest/index.html` as an additional allowed redirect.
3. Visit `https://bhudson1.github.io/PortalWebPageTest/` and hard-refresh.
4. Click **1 · Sign in with City Portal**. Complete City SSO if prompted, returning to the test page. If a redirect reloads the app, continue with step 5.
5. Click **2 · Load secured layer**. The diagnostics will separately confirm Portal sign-in, Portal REST availability, hosted layer metadata, query feature count, and map layer rendering.

## What is preconfigured

- Portal: `https://geo.vancouver.ca/portal/`
- Public OAuth Client ID: `clgZdX7HR1BywYdB`
- Feature layer: `https://geo.vancouver.ca/hosting/rest/services/Hosted/Sites_over_5_acres/FeatureServer/0`

These URLs and the Client ID are *public configuration*, not secrets. No access token or client secret is included in any file.

## Diagnostics

- **Portal session not yet verified**: you have not signed in with this GitHub application or the sign-in has not returned to the site successfully.
- **Sign-in error / invalid redirect_uri**: check exact allowed redirect URL in Portal registration.
- **Portal signed in; hosted service fails 498/499**: likely token-to-server federation or authorization issue, or the Portal account lacks permission for the layer.
- **REST query succeeds but no polygons render**: investigate drawing, extent, CORS, data geometry, and feature service layer view.
- **Temporary token works but OAuth fails**: proves basic connectivity, not that the Portal OAuth session was registered for the hosted feature service. Use log to identify whether failure occurs before or after successful sign-in.

Do not publish temporary tokens in a repository, page URL, screenshot, or logs. The optional test token field exists only for a single browser session.

This static test does not require admin privileges once the Portal OAuth application has been registered and the layer is shared with the signed-in account. It has not been tested against the private City Portal directly from this environment.
