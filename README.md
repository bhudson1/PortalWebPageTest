# VanMap Portal feature-layer access test

A tiny static GitHub Pages proof of concept for the ArcGIS Enterprise FeatureServer layer:

`https://geo.vancouver.ca/hosting/rest/services/Hosted/Sites_over_5_acres/FeatureServer/0`

## Publish in minutes

1. Create a GitHub repository (or a dedicated folder in an existing Pages repo).
2. Upload **only `index.html`**. No GIS data or credentials are included.
3. In repository **Settings → Pages**, publish the `main` branch (root folder, or `/docs` if you put the file there).
4. Open the new GitHub Pages URL **from your City-network/VPN browser** and click **Test layer access**.
5. If the layer requires authentication, use one of the paths below.

## For proper staff sign-in (recommended)

1. Find the ArcGIS **Portal** URL (it may differ from `geo.vancouver.ca/hosting`).
2. Register an application in the Portal and configure its OAuth redirect URI to **the exact GitHub Pages page URL**.
3. Enter the Portal URL and the application's **Client ID** into the page (never use a client secret in a static website).
4. Click **Sign in with Portal**; once authenticated, the page attempts to load the secured layer.
5. Share the hosted feature layer with the Portal group or organization whose members should have access.

Depending on the organization's CORS, local-network-access and authentication settings, an admin may still need to approve the Pages origin. The test distinguishes authentication failure from other failures as far as the browser exposes details.

## For an isolated test without registering an OAuth app

Under **Optional: test using a temporary token**, enter a short-lived token only in your browser. This input is not saved by the page or checked into GitHub. Do **not** put a token into the HTML, Git URL, or README. The token expires; this is diagnostic only, not deployment authentication.

## Interpretation

- **Success** means the layer metadata loaded. The app attempts to draw the polygon layer and retrieve a feature count.
- **498 / 499** usually indicates token required/invalid/expired.
- **403** can indicate a permissions restriction.
- **CORS** or **network error / failed to fetch** means the GitHub Pages browser may be blocked from contacting Portal; the layer could work on an internal web page instead.
- If an auth dialog appears unexpectedly, the service may be using a different security mechanism or Portal URL than expected.
- If GIS data is genuinely internal-only, do not publish it to a public repository. Keep data permissions enforced server-side in Portal.

## Limitations

- The exact service could not be reached from the development environment; it may require City-network access.
- There is no ArcGIS admin setting bypass. A secured service still requires authorized users.
- ArcGIS Maps SDK 4.34 is loaded from Esri's CDN; network access to `js.arcgis.com` is needed.
- The test deliberately uses a plain grey map so it doesn't depend on a licensed basemap service.
