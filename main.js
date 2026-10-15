// Edulytical landing page: theme toggle, scroll reveals, count-ups, confetti and the trend chart.
(function () {
  'use strict'

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var root = document.documentElement

  document.getElementById('year').textContent = String(new Date().getFullYear())

  // ---------- Theme ----------

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var dark = root.classList.toggle('dark')
    try { localStorage.setItem('edulytical-theme', dark ? 'dark' : 'light') } catch (e) {}
  })

  // ---------- Number formatting ----------

  // Thousands separators, no cents, a true minus for negatives.
  function format(n, el) {
    var d = Number(el.dataset.decimals || 0)
    var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
    return (n < 0 ? '\u2212' : '') + (el.dataset.prefix || '') + abs + (el.dataset.suffix || '')
  }

  // ---------- Count-up ----------

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

  function countUp(el) {
    var to = Number(el.dataset.to)
    if (reduceMotion) { el.textContent = format(to, el); return }
    var duration = 1400
    var start = null
    function frame(ts) {
      if (start === null) start = ts
      var t = Math.min(1, (ts - start) / duration)
      el.textContent = format(to * easeOutCubic(t), el)
      if (t < 1) requestAnimationFrame(frame)
      else land(el)
    }
    el.textContent = format(0, el)
    requestAnimationFrame(frame)
  }

  // When a number lands: a single light sweep, plus confetti if it's the celebrated one.
  function land(el) {
    el.classList.add('shine', 'shine-once')
    if (el.dataset.confetti) confetti(el.parentNode, el.dataset.confetti === 'money')
  }

  // ---------- Confetti ----------

  var PARTY = ['#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#06b6d4']
  var MONEY = ['#059669', '#10b981', '#34d399', '#16a34a', '#ca8a04']

  function confetti(el, money) {
    var colors = money ? MONEY : PARTY
    var count = 18
    for (var i = 0; i < count; i++) {
      var piece = document.createElement('span')
      var color = colors[i % colors.length]
      piece.className = 'confetti-piece' + (money ? ' confetti-glyph' : '')
      if (money) {
        piece.textContent = '$'
        piece.style.color = color
        piece.style.fontSize = (14 + Math.round(Math.random() * 8)) + 'px'
      } else {
        piece.style.background = color
      }
      el.appendChild(piece)

      // Fan out upward and to the sides, then fall and fade.
      var angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.3
      var dist = 50 + Math.random() * 60
      var dx = Math.cos(angle) * dist
      var dy = Math.sin(angle) * dist
      var spin = (Math.random() - 0.5) * 720
      var anim = piece.animate([
        { transform: 'translate(-50%, -50%) scale(.6) rotate(0deg)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + dx * 0.7 + 'px), calc(-50% + ' + dy * 0.7 + 'px)) scale(1) rotate(' + spin * 0.5 + 'deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (dy + 40) + 'px)) scale(.9) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: 1300, delay: i * 12, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' })
      anim.onfinish = (function (p) { return function () { p.remove() } })(piece)
    }
  }

  // ---------- Season chart ----------

  var SVG_NS = 'http://www.w3.org/2000/svg'
  function svgEl(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name)
    for (var k in attrs) node.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(node)
    return node
  }

  // Catmull-Rom to cubic Bézier, tension 0.3 (matches the dashboard's line charts).
  function smoothPath(pts, tension) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1]
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i]
      var p1 = pts[i]
      var p2 = pts[i + 1]
      var p3 = pts[i + 2] || p2
      var c1x = p1[0] + (p2[0] - p0[0]) * tension / 2
      var c1y = p1[1] + (p2[1] - p0[1]) * tension / 2
      var c2x = p2[0] - (p3[0] - p1[0]) * tension / 2
      var c2y = p2[1] - (p3[1] - p1[1]) * tension / 2
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1)
    }
    return d
  }

  var chart = null

  function buildChart(container) {
    var months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
    var values = [96.1, 95.3, 94.2, 93.1, 92.4, 93.2, 94.3, 95.2, 95.6, 95.9]
    var lastYear = [95.6, 94.5, 93.3, 92.1, 91.0, 91.5, 92.2, 92.8, 93.1, 93.4]
    var targets = [{ v: 95, label: 'Goal 95%' }]
    var milestones = [{ i: 5, label: 'Campaign starts' }, { i: 7, label: 'Goal met' }]

    var W = 520, H = 230, L = 34, R = 10, T = 30, B = 24
    var yMin = 90, yMax = 97
    function x(i) { return L + i * (W - L - R) / (months.length - 1) }
    function y(v) { return T + (yMax - v) / (yMax - yMin) * (H - T - B) }

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, container)
    var defs = svgEl('defs', {}, svg)
    var grad = svgEl('linearGradient', { id: 'trend-fill', x1: '0', y1: '0', x2: '0', y2: '1' }, defs)
    svgEl('stop', { offset: '0%', 'stop-color': '#3b82f6', 'stop-opacity': '0.35' }, grad)
    svgEl('stop', { offset: '100%', 'stop-color': '#3b82f6', 'stop-opacity': '0' }, grad)

    // Grid and y ticks
    ;[90, 92, 94, 96].forEach(function (v) {
      svgEl('line', { class: 'grid-line', x1: L, x2: W - R, y1: y(v), y2: y(v) }, svg)
      var t = svgEl('text', { class: 'axis-label', x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, svg)
      t.textContent = v + '%'
    })
    months.forEach(function (m, i) {
      var t = svgEl('text', { class: 'axis-label', x: x(i), y: H - 4, 'text-anchor': 'middle' }, svg)
      t.textContent = m
    })

    // Reference goal
    targets.forEach(function (tg) {
      svgEl('line', { class: 'target', x1: L, x2: W - R, y1: y(tg.v), y2: y(tg.v) }, svg)
      var t = svgEl('text', { class: 'target-label', x: W - R, y: y(tg.v) + 12, 'text-anchor': 'end' }, svg)
      t.textContent = tg.label
    })

    // Last year, for comparison
    var prev = svgEl('path', { class: 'line line-2', d: smoothPath(lastYear.map(function (v, i) { return [x(i), y(v)] }), 0.3) }, svg)

    var pts = values.map(function (v, i) { return [x(i), y(v)] })
    var lineD = smoothPath(pts, 0.3)
    var areaD = lineD + ' L' + x(values.length - 1) + ',' + (H - B) + ' L' + x(0) + ',' + (H - B) + ' Z'
    var area = svgEl('path', { class: 'area', d: areaD, fill: 'url(#trend-fill)' }, svg)
    var line = svgEl('path', { class: 'line', d: lineD }, svg)

    // Milestone flags: small primary pill on a 2px stem with a dot on the line
    var flags = milestones.map(function (m) {
      var g = svgEl('g', { class: 'flag' }, svg)
      var px = x(m.i), py = y(values[m.i])
      var top = py - 30
      var w = m.label.length * 6 + 14
      svgEl('line', { class: 'stem', x1: px, x2: px, y1: top + 16, y2: py }, g)
      svgEl('rect', { x: px - w / 2, y: top, width: w, height: 16, rx: 8 }, g)
      var t = svgEl('text', { x: px, y: top + 11.5, 'text-anchor': 'middle' }, g)
      t.textContent = m.label
      svgEl('circle', { class: 'dot', cx: px, cy: py, r: 4 }, g)
      return { g: g, at: m.i / (values.length - 1) }
    })

    var len = line.getTotalLength()
    if (!reduceMotion) {
      line.style.strokeDasharray = len
      line.style.strokeDashoffset = len
      area.style.opacity = 0
      prev.style.opacity = 0
    } else {
      flags.forEach(function (f) { f.g.classList.add('show') })
    }

    return { line: line, area: area, prev: prev, flags: flags, len: len }
  }

  function drawChart(c) {
    if (reduceMotion || c.drawn) return
    c.drawn = true
    c.prev.style.opacity = 1
    var duration = 1400
    var start = null
    function frame(ts) {
      if (start === null) start = ts
      var t = Math.min(1, (ts - start) / duration)
      c.line.style.strokeDashoffset = c.len * (1 - t)
      c.flags.forEach(function (f) { if (!f.shown && t >= f.at) { f.shown = true; f.g.classList.add('show') } })
      if (t < 1) requestAnimationFrame(frame)
      else c.area.style.opacity = 1
    }
    requestAnimationFrame(frame)
  }

  var chartEl = document.getElementById('trend-chart')
  if (chartEl) chart = buildChart(chartEl)

  // ---------- Scroll reveals ----------

  var reveals = document.querySelectorAll('.reveal')
  var counts = document.querySelectorAll('.count')

  function onReveal(el) {
    el.classList.add('in')
    if (chart && el.dataset.feature === 'timeline') setTimeout(function () { drawChart(chart) }, 300)
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(onReveal)
    counts.forEach(function (el) { el.textContent = format(Number(el.dataset.to), el) })
    return
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return
      onReveal(entry.target)
      revealObserver.unobserve(entry.target)
    })
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' })
  reveals.forEach(function (el) { revealObserver.observe(el) })

  // Numbers start at zero and count up the first time they're visible.
  counts.forEach(function (el) { el.textContent = format(0, el) })
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return
      var el = entry.target
      countObserver.unobserve(el)
      setTimeout(function () { countUp(el) }, 250)
    })
  }, { threshold: 0.6 })
  counts.forEach(function (el) { countObserver.observe(el) })
})()
