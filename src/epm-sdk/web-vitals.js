/** @format */

var e,
	n,
	t,
	i,
	r,
	a = -1,
	o = function (e) {
		addEventListener(
			"pageshow",
			function (n) {
				n.persisted && ((a = n.timeStamp), e(n))
			},
			!0
		)
	},
	c = function () {
		return (
			window.performance &&
			performance.getEntriesByType &&
			performance.getEntriesByType("navigation")[0]
		)
	},
	u = function () {
		var e = c()
		return (e && e.activationStart) || 0
	},
	f = function (e, n) {
		var t = c(),
			i = "navigate"
		return (
			a >= 0
				? (i = "back-forward-cache")
				: t &&
				  (document.prerendering || u() > 0
						? (i = "prerender")
						: document.wasDiscarded
						? (i = "restore")
						: t.type && (i = t.type.replace(/_/g, "-"))),
			{
				name: e,
				value: void 0 === n ? -1 : n,
				rating: "good",
				delta: 0,
				entries: [],
				id: "v3-"
					.concat(Date.now(), "-")
					.concat(Math.floor(8999999999999 * Math.random()) + 1e12),
				navigationType: i,
			}
		)
	},
	s = function (e, n, t) {
		try {
			if (PerformanceObserver.supportedEntryTypes.includes(e)) {
				var i = new PerformanceObserver(function (e) {
					Promise.resolve().then(function () {
						n(e.getEntries())
					})
				})
				return i.observe(Object.assign({ type: e, buffered: !0 }, t || {})), i
			}
		} catch (e) {}
	},
	d = function (e, n, t, i) {
		var r, a
		return function (o) {
			n.value >= 0 &&
				(o || i) &&
				((a = n.value - (r || 0)) || void 0 === r) &&
				((r = n.value),
				(n.delta = a),
				(n.rating = (function (e, n) {
					return e > n[1] ? "poor" : e > n[0] ? "needs-improvement" : "good"
				})(n.value, t)),
				e(n))
		}
	},
	l = function (e) {
		requestAnimationFrame(function () {
			return requestAnimationFrame(function () {
				return e()
			})
		})
	},
	p = function (e) {
		var n = function (n) {
			;("pagehide" !== n.type && "hidden" !== document.visibilityState) || e(n)
		}
		addEventListener("visibilitychange", n, !0),
			addEventListener("pagehide", n, !0)
	},
	v = function (e) {
		var n = !1
		return function (t) {
			n || (e(t), (n = !0))
		}
	},
	m = -1,
	gg = function () {
		return "hidden" !== document.visibilityState || document.prerendering
			? 1 / 0
			: 0
	},
	g = function (e) {
		"hidden" === document.visibilityState &&
			m > -1 &&
			((m = "visibilitychange" === e.type ? e.timeStamp : 0), T())
	},
	y = function () {
		addEventListener("visibilitychange", g, !0),
			addEventListener("prerenderingchange", g, !0)
	},
	T = function () {
		removeEventListener("visibilitychange", g, !0),
			removeEventListener("prerenderingchange", g, !0)
	},
	E = function () {
		return (
			m < 0 &&
				((m = gg()),
				y(),
				o(function () {
					setTimeout(function () {
						;(m = gg()), y()
					}, 0)
				})),
			{
				get firstHiddenTime() {
					return m
				},
			}
		)
	},
	C = function (e) {
		document.prerendering
			? addEventListener(
					"prerenderingchange",
					function () {
						return e()
					},
					!0
			  )
			: e()
	},
	L = [1800, 3e3],
	w = function (e, n) {
		;(n = n || {}),
			C(function () {
				var t,
					i = E(),
					r = f("FCP"),
					a = s("paint", function (e) {
						e.forEach(function (e) {
							"first-contentful-paint" === e.name &&
								(a.disconnect(),
								e.startTime < i.firstHiddenTime &&
									((r.value = Math.max(e.startTime - u(), 0)),
									r.entries.push(e),
									t(!0)))
						})
					})
				a &&
					((t = d(e, r, L, n.reportAllChanges)),
					o(function (i) {
						;(r = f("FCP")),
							(t = d(e, r, L, n.reportAllChanges)),
							l(function () {
								;(r.value = performance.now() - i.timeStamp), t(!0)
							})
					}))
			})
	},
	S = [0.1, 0.25],
	b = function (e, n) {
		;(n = n || {}),
			w(
				v(function () {
					var t,
						i = f("CLS", 0),
						r = 0,
						a = [],
						c = function (e) {
							e.forEach(function (e) {
								if (!e.hadRecentInput) {
									var n = a[0],
										t = a[a.length - 1]
									r &&
									e.startTime - t.startTime < 1e3 &&
									e.startTime - n.startTime < 5e3
										? ((r += e.value), a.push(e))
										: ((r = e.value), (a = [e]))
								}
							}),
								r > i.value && ((i.value = r), (i.entries = a), t())
						},
						u = s("layout-shift", c)
					u &&
						((t = d(e, i, S, n.reportAllChanges)),
						p(function () {
							c(u.takeRecords()), t(!0)
						}),
						o(function () {
							;(r = 0),
								(i = f("CLS", 0)),
								(t = d(e, i, S, n.reportAllChanges)),
								l(function () {
									return t()
								})
						}),
						setTimeout(t, 0))
				})
			)
	},
	A = [1800, 3e3],
	P = function (e, n) {
		;(n = n || {}),
			C(function () {
				var t,
					i = E(),
					r = f("FP"),
					a = s("paint", function (e) {
						e.forEach(function (e) {
							"first-paint" === e.name &&
								(a.disconnect(),
								e.startTime < i.firstHiddenTime &&
									((r.value = Math.max(e.startTime - u(), 0)),
									r.entries.push(e),
									t(!0)))
						})
					})
				a &&
					((t = d(e, r, A, n.reportAllChanges)),
					o(function (i) {
						;(r = f("FP")),
							(t = d(e, r, A, n.reportAllChanges)),
							l(function () {
								;(r.value = performance.now() - i.timeStamp), t(!0)
							})
					}))
			})
	},
	F = { passive: !0, capture: !0 },
	I = new Date(),
	M = function (i, r) {
		e || ((e = r), (n = i), (t = new Date()), x(removeEventListener), k())
	},
	k = function () {
		if (n >= 0 && n < t - I) {
			var r = {
				entryType: "first-input",
				name: e.type,
				target: e.target,
				cancelable: e.cancelable,
				startTime: e.timeStamp,
				processingStart: e.timeStamp + n,
			}
			i.forEach(function (e) {
				e(r)
			}),
				(i = [])
		}
	},
	D = function (e) {
		if (e.cancelable) {
			var n =
				(e.timeStamp > 1e12 ? new Date() : performance.now()) - e.timeStamp
			"pointerdown" == e.type
				? (function (e, n) {
						var t = function () {
								M(e, n), r()
							},
							i = function () {
								r()
							},
							r = function () {
								removeEventListener("pointerup", t, F),
									removeEventListener("pointercancel", i, F)
							}
						addEventListener("pointerup", t, F),
							addEventListener("pointercancel", i, F)
				  })(n, e)
				: M(n, e)
		}
	},
	x = function (e) {
		;["mousedown", "keydown", "touchstart", "pointerdown"].forEach(function (
			n
		) {
			return e(n, D, F)
		})
	},
	B = [100, 300],
	H = function (t, r) {
		;(r = r || {}),
			C(function () {
				var a,
					c = E(),
					u = f("FID"),
					l = function (e) {
						e.startTime < c.firstHiddenTime &&
							((u.value = e.processingStart - e.startTime),
							u.entries.push(e),
							a(!0))
					},
					m = function (e) {
						e.forEach(l)
					},
					h = s("first-input", m)
				;(a = d(t, u, B, r.reportAllChanges)),
					h &&
						p(
							v(function () {
								m(h.takeRecords()), h.disconnect()
							})
						),
					h &&
						o(function () {
							var o
							;(u = f("FID")),
								(a = d(t, u, B, r.reportAllChanges)),
								(i = []),
								(n = -1),
								(e = null),
								x(addEventListener),
								(o = l),
								i.push(o),
								k()
						})
			})
	},
	R = 0,
	N = 1 / 0,
	O = 0,
	q = function (e) {
		e.forEach(function (e) {
			e.interactionId &&
				((N = Math.min(N, e.interactionId)),
				(O = Math.max(O, e.interactionId)),
				(R = O ? (O - N) / 7 + 1 : 0))
		})
	},
	j = function () {
		return r ? R : performance.interactionCount || 0
	},
	_ = function () {
		"interactionCount" in performance ||
			r ||
			(r = s("event", q, { type: "event", buffered: !0, durationThreshold: 0 }))
	},
	z = [200, 500],
	G = 0,
	J = function () {
		return j() - G
	},
	K = [],
	Q = {},
	U = function (e) {
		var n = K[K.length - 1],
			t = Q[e.interactionId]
		if (t || K.length < 10 || e.duration > n.latency) {
			if (t) t.entries.push(e), (t.latency = Math.max(t.latency, e.duration))
			else {
				var i = { id: e.interactionId, latency: e.duration, entries: [e] }
				;(Q[i.id] = i), K.push(i)
			}
			K.sort(function (e, n) {
				return n.latency - e.latency
			}),
				K.splice(10).forEach(function (e) {
					delete Q[e.id]
				})
		}
	},
	V = function (e, n) {
		;(n = n || {}),
			C(function () {
				_()
				var t,
					i = f("INP"),
					r = function (e) {
						e.forEach(function (e) {
							;(e.interactionId && U(e), "first-input" === e.entryType) &&
								!K.some(function (n) {
									return n.entries.some(function (n) {
										return (
											e.duration === n.duration && e.startTime === n.startTime
										)
									})
								}) &&
								U(e)
						})
						var n,
							r = ((n = Math.min(K.length - 1, Math.floor(J() / 50))), K[n])
						r &&
							r.latency !== i.value &&
							((i.value = r.latency), (i.entries = r.entries), t())
					},
					a = s("event", r, { durationThreshold: n.durationThreshold || 40 })
				;(t = d(e, i, z, n.reportAllChanges)),
					a &&
						(a.observe({ type: "first-input", buffered: !0 }),
						p(function () {
							r(a.takeRecords()),
								i.value < 0 && J() > 0 && ((i.value = 0), (i.entries = [])),
								t(!0)
						}),
						o(function () {
							;(K = []),
								(G = j()),
								(i = f("INP")),
								(t = d(e, i, z, n.reportAllChanges))
						}))
			})
	},
	W = [2500, 4e3],
	X = {},
	Y = function (e, n) {
		;(n = n || {}),
			C(function () {
				var t,
					i = E(),
					r = f("LCP"),
					a = function (e) {
						var n = e[e.length - 1]
						n &&
							n.startTime < i.firstHiddenTime &&
							((r.value = Math.max(n.startTime - u(), 0)),
							(r.entries = [n]),
							t())
					},
					c = s("largest-contentful-paint", a)
				if (c) {
					t = d(e, r, W, n.reportAllChanges)
					var m = v(function () {
						X[r.id] ||
							(a(c.takeRecords()), c.disconnect(), (X[r.id] = !0), t(!0))
					})
					;["keydown", "click"].forEach(function (e) {
						addEventListener(e, m, !0)
					}),
						p(m),
						o(function (i) {
							;(r = f("LCP")),
								(t = d(e, r, W, n.reportAllChanges)),
								l(function () {
									;(r.value = performance.now() - i.timeStamp),
										(X[r.id] = !0),
										t(!0)
								})
						})
				}
			})
	},
	Z = [800, 1800],
	$ = function e(n) {
		document.prerendering
			? C(function () {
					return e(n)
			  })
			: "complete" !== document.readyState
			? addEventListener(
					"load",
					function () {
						return e(n)
					},
					!0
			  )
			: setTimeout(n, 0)
	},
	ee = function (e, n) {
		n = n || {}
		var t = f("TTFB"),
			i = d(e, t, Z, n.reportAllChanges)
		$(function () {
			var r = c()
			if (r) {
				var a = r.responseStart
				if (a <= 0 || a > performance.now()) return
				;(t.value = Math.max(a - u(), 0)),
					(t.entries = [r]),
					i(!0),
					o(function () {
						;(t = f("TTFB", 0)), (i = d(e, t, Z, n.reportAllChanges))(!0)
					})
			}
		})
	}
export {
	S as CLSThresholds,
	L as FCPThresholds,
	B as FIDThresholds,
	A as FPThresholds,
	z as INPThresholds,
	W as LCPThresholds,
	Z as TTFBThresholds,
	b as getCLS,
	w as getFCP,
	H as getFID,
	P as getFP,
	V as getINP,
	Y as getLCP,
	ee as getTTFB,
	s as observe,
	b as onCLS,
	w as onFCP,
	H as onFID,
	P as onFP,
	V as onINP,
	Y as onLCP,
	ee as onTTFB,
}
