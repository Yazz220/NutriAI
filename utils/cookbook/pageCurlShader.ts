/**
 * Page curl fragment shader for React Native Skia.
 *
 * Implements a 2D cylinder-based page curl using per-pixel UV remapping.
 * The curl is defined by a curl axis (a 2D line) and a cylinder radius.
 * Each pixel's signed distance d from the curl axis determines which region
 * it falls into:
 *
 *   d < 0       → Behind the curl (not yet reached) → flat front page
 *   0 < d < r   → On the cylinder (front face, convex) → unroll arc to source UV
 *   d > r       → Beyond the cylinder (back face, flat) → mirrored back texture
 *
 * The back face extends beyond the page boundary into the adjacent page's
 * canvas area, so the canvas must be 2x the page width.
 *
 * This approach eliminates texture stretching entirely because every pixel
 * independently computes its source UV from the curl geometry — no vertex
 * interpolation, no sheared triangles.
 *
 * References:
 *   - Nudgie Dev Diary, "Page Curl Shader Breakdown" (2018)
 *   - flutter_page_curl GLSL shader by Nghi-NV
 *   - Shopify react-native-skia page curl transition
 */

export const PAGE_CURL_SHADER = `
uniform shader u_front;
uniform shader u_back;
uniform vec2 u_canvasSize;     // full canvas size (2*pageWidth, pageHeight)
uniform vec2 u_pageOffset;     // page origin within canvas (pageWidth,0) or (0,0)
uniform vec2 u_pageSize;       // (pageWidth, pageHeight)
uniform vec2 u_curlPos;        // curl axis position in page-local pixels
uniform vec2 u_curlDir;        // curl travel direction (need not be normalized)
uniform float u_radius;        // cylinder radius in pixels
uniform float u_progress;      // 0..1
uniform float u_backOpacity;   // 0..1 back face darkening

const float PI = 3.14159265359;

half4 main(vec2 fragCoord) {
  vec2 dir = normalize(u_curlDir);
  vec2 curlCanvas = u_pageOffset + u_curlPos;

  // Signed distance from the curl axis.
  // d > 0: beyond the curl (page has turned past)
  // d < 0: behind the curl (page not yet reached)
  float d = dot(fragCoord - curlCanvas, dir);
  float r = u_radius;

  // Projection of the fragment onto the curl axis
  vec2 linePoint = fragCoord - d * dir;
  vec2 linePointPage = linePoint - u_pageOffset;

  // --- Behind the curl: flat front page ---
  if (d < 0.0 || r < 0.001) {
    vec2 fragPage = fragCoord - u_pageOffset;
    if (fragPage.x >= 0.0 && fragPage.x <= u_pageSize.x &&
        fragPage.y >= 0.0 && fragPage.y <= u_pageSize.y) {
      return u_front.eval(fragCoord);
    }
    // Outside page bounds: transparent
    return half4(0.0, 0.0, 0.0, 0.0);
  }

  // --- d > 0: the page is curling ---

  float arcDist;
  bool isBackFace;
  float theta = 0.0;

  if (d < r) {
    // On the cylinder: front face (convex side visible)
    theta = asin(clamp(d / r, -1.0, 1.0));
    arcDist = theta * r;
    isBackFace = false;
  } else {
    // Beyond the cylinder: back face (page has curled over, now flat)
    // Arc = quarter circle (PI/2 * r) + flat distance beyond cylinder
    arcDist = (PI * 0.5) * r + (d - r);
    isBackFace = true;
  }

  // Source position in page-local coordinates.
  // The source is always BEHIND the curl (in the -dir direction),
  // at a distance equal to the arc length from the curl axis.
  vec2 sourcePage = linePointPage - dir * arcDist;

  // Check if source is within the page texture bounds
  if (sourcePage.x < 0.0 || sourcePage.x > u_pageSize.x ||
      sourcePage.y < 0.0 || sourcePage.y > u_pageSize.y) {
    // Source out of bounds: the page edge has been reached.
    // Show a fading shadow on the beneath page.
    float shadowDist = d - r;
    float shadowWidth = r * 3.0;
    float shadow = 1.0 - clamp(shadowDist / shadowWidth, 0.0, 1.0);
    shadow = pow(shadow, 2.0) * 0.3 * sin(PI * u_progress);
    return half4(0.0, 0.0, 0.0, shadow);
  }

  if (isBackFace) {
    // Back face: mirror x within page bounds, sample back texture
    vec2 backPage = vec2(u_pageSize.x - sourcePage.x, sourcePage.y);
    vec2 backCanvas = u_pageOffset + backPage;
    half4 color = u_back.eval(backCanvas);
    // Darken and desaturate the back face
    float grey = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(grey), u_backOpacity * 0.3);
    color.rgb *= mix(0.55, 0.82, u_backOpacity);
    // Self-shadow: darkest near the fold edge (d ≈ r), lighter further away
    float edgeDist = (d - r) / max(r, 0.001);
    float shadowFactor = mix(0.65, 1.0, clamp(edgeDist, 0.0, 1.0));
    color.rgb *= shadowFactor;
    return color;
  }

  // Front face on the cylinder
  vec2 sampleCanvas = u_pageOffset + sourcePage;
  half4 color = u_front.eval(sampleCanvas);
  // Specular highlight on the convex surface
  float highlight = mix(1.0, 1.1, clamp(1.0 - abs(theta - PI * 0.35) / (PI * 0.3), 0.0, 1.0));
  color.rgb *= highlight;
  // Slight darkening near the fold edge (d approaching r)
  float edgeShadow = mix(1.0, 0.88, clamp(theta / (PI * 0.5), 0.0, 1.0));
  color.rgb *= edgeShadow;
  return color;
}
`;
