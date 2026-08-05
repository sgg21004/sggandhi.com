// ── Interactive fluid gradient ──────────────────────────────────────────────
// A full-screen WebGL shader: domain-warped simplex noise flows like liquid,
// and the cursor swirls + reveals a faint iridescence. Falls back silently to
// the CSS gradient when WebGL is unavailable or reduced-motion is requested.

(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('fluid');
  if (!canvas || reduce) return; // CSS gradient stays as the fallback

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return;

  // ── Shaders ────────────────────────────────────────────────────────────────
  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;   // 0..1, y-up
    uniform float u_vel;     // cursor speed, smoothed
    uniform float u_dark;    // 0 = light, 1 = dark (lerped for smooth toggle)

    // ── simplex noise 3D (Ashima / Stefan Gustavson) ──
    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 mv = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      mv = mv * mv;
      return 42.0 * dot(mv*mv, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float fbm(vec3 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++){ v += a * snoise(p); p *= 2.0; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      float aspect = u_res.x / u_res.y;
      vec2 p = uv;      p.x *= aspect;
      vec2 m = u_mouse; m.x *= aspect;

      float t = u_time * 0.045;

      // cursor swirl — a gaussian bloom of rotational displacement
      vec2  toM  = p - m;
      float d    = length(toM);
      float infl = exp(-d * d * 5.0);
      float amt  = infl * (0.55 + u_vel * 6.0);
      vec2  swirl = vec2(-toM.y, toM.x) * amt;

      // domain-warped flow — this is the "liquid" motion
      vec2 q = p * 1.35 + swirl;
      float w1 = fbm(vec3(q + vec2(0.0, t), t));
      vec2  warp = vec2(w1, fbm(vec3(q + 5.2 + w1, t * 1.1)));
      float n = fbm(vec3(q + warp * 0.85 + swirl, t * 0.8));
      n = clamp(n * 0.5 + 0.5, 0.0, 1.0);

      // ── palettes ──
      vec3 lA = vec3(0.780, 0.760, 0.710);  // shadow beige
      vec3 lB = vec3(0.902, 0.882, 0.835);  // mid cream
      vec3 lC = vec3(0.965, 0.953, 0.925);  // light cream
      vec3 lAcc = vec3(0.86, 0.74, 0.52);   // warm gold sheen

      vec3 dA = vec3(0.043, 0.050, 0.063);  // near-black
      vec3 dB = vec3(0.098, 0.106, 0.129);  // charcoal
      vec3 dC = vec3(0.168, 0.180, 0.224);  // lifted slate
      vec3 dAcc = vec3(0.42, 0.36, 0.62);   // indigo sheen

      vec3 cA = mix(lA, dA, u_dark);
      vec3 cB = mix(lB, dB, u_dark);
      vec3 cC = mix(lC, dC, u_dark);
      vec3 acc = mix(lAcc, dAcc, u_dark);

      vec3 col = mix(cA, cB, smoothstep(0.0, 0.55, n));
      col = mix(col, cC, smoothstep(0.45, 1.0, n));

      // iridescent bloom around the cursor — subtle, motion-revealed
      float sheen = infl * (0.12 + u_vel * 0.9);
      col += acc * sheen * (0.5 + 0.5 * sin(n * 6.2831 + u_time * 0.6));

      // gentle grain to kill banding
      float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.015;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── compile / link ───────────────────────────────────────────────────────
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);

  // fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res:   gl.getUniformLocation(prog, 'u_res'),
    time:  gl.getUniformLocation(prog, 'u_time'),
    mouse: gl.getUniformLocation(prog, 'u_mouse'),
    vel:   gl.getUniformLocation(prog, 'u_vel'),
    dark:  gl.getUniformLocation(prog, 'u_dark'),
  };

  // ── state ──────────────────────────────────────────────────────────────────
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  function resize() {
    W = Math.floor(innerWidth * DPR);
    H = Math.floor(innerHeight * DPR);
    canvas.width = W; canvas.height = H;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    gl.viewport(0, 0, W, H);
  }
  resize();
  addEventListener('resize', resize);

  // cursor — smoothed position + velocity
  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, vel = 0;
  function point(x, y) { tx = x / innerWidth; ty = 1 - y / innerHeight; }
  addEventListener('mousemove', e => point(e.clientX, e.clientY));
  addEventListener('touchmove', e => { if (e.touches[0]) point(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  let darkNow = document.documentElement.dataset.theme === 'dark' ? 1 : 0;
  let dark = darkNow;

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  const start = performance.now();
  function frame(now) {
    if (!running) return;
    const time = (now - start) / 1000;

    // ease cursor + estimate speed
    const dx = tx - mx, dy = ty - my;
    mx += dx * 0.08; my += dy * 0.08;
    vel += (Math.min(Math.hypot(dx, dy) * 4.0, 1.0) - vel) * 0.1;

    // smooth theme cross-fade
    darkNow = document.documentElement.dataset.theme === 'dark' ? 1 : 0;
    dark += (darkNow - dark) * 0.06;

    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.time, time);
    gl.uniform2f(U.mouse, mx, my);
    gl.uniform1f(U.vel, vel);
    gl.uniform1f(U.dark, dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(frame);
  }

  // canvas is ready — reveal it over the CSS fallback
  canvas.style.opacity = '1';
  requestAnimationFrame(frame);
})();
