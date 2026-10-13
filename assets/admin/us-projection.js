/* Albers equal-area geography; Alaska and Hawaii have separate labeled insets. */
(() => {
  'use strict';
  const radians = Math.PI / 180;
  function albers(lon, lat, central, origin, parallel1, parallel2) {
    const p1 = parallel1 * radians,
      p2 = parallel2 * radians;
    const n = (Math.sin(p1) + Math.sin(p2)) / 2,
      c = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
    const rho = Math.sqrt(c - 2 * n * Math.sin(lat * radians)) / n;
    const rho0 = Math.sqrt(c - 2 * n * Math.sin(origin * radians)) / n,
      theta = n * (lon - central) * radians;
    return [rho * Math.sin(theta), rho0 - rho * Math.cos(theta)];
  }
  const configs = {
    main: { central: -96, origin: 38, p1: 29.5, p2: 45.5, scale: 920, x: 460, y: 222 },
    alaska: { central: -154, origin: 62, p1: 55, p2: 65, scale: 230, x: 151, y: 450 },
    hawaii: { central: -157, origin: 20.5, p1: 18, p2: 23, scale: 1200, x: 358, y: 455 },
  };
  function project(lon, lat, area = 'main') {
    const c = configs[area];
    if (!c || !Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (area === 'alaska' && lon > 0) lon -= 360;
    const p = albers(lon, lat, c.central, c.origin, c.p1, c.p2);
    return [c.x + p[0] * c.scale, c.y - p[1] * c.scale];
  }
  window.DKLA_US_PROJECTION = { project };
})();
