---
publishDate: 2020-03-03T13:32:20+03:00
title: "Blurring an Android View Across Multiple Windows"
excerpt: "A design note on why view-level background blur is hard on Android and how a compositor-assisted approach can make it work."
author: "Woohyun Kim"
category: "Android"
tags:
  - "Android"
  - "View"
  - "Gaussian"
  - "Blur"
  - "Window"
  - "Runtime"
language: en
translations:
  ko: "android-blur-view-within-multi-windows-ko"
  en: "android-blur-view-within-multi-windows"
---

Blur is a familiar part of modern platform design. We see it in Windows, iOS, and Ubuntu, and it often gives the system a softer and more premium feel. Android historically exposed much less of this effect at the framework level, especially when the blurred content was supposed to come from windows behind the current one.

| Windows | iOS | Ubuntu |
|:-------:|:---:|:------:|
| [![](/assets/img/blur-win10.png)](/assets/img/blur-win10.png) | [![](/assets/img/blur-ios.png)](/assets/img/blur-ios.png) | [![](/assets/img/blur-ubuntu.png)](/assets/img/blur-ubuntu.png) |

Blur is common in graphics, and it improves the overall look and feel of a platform. At the same time, it can reduce content legibility, so platforms usually expose several controls such as blur radius, blend ratio, dim color, or intensity level.

To understand why this effect is hard to implement on Android, it helps to separate the display system into two layers.

#### 1. The window system

- Multiple independent windows are stacked and composed by a compositor.
- Each window normally belongs to a separate process and therefore a separate security boundary.

For example, a banking app window should not be trivially screen-captured by some unrelated process.

#### 2. The view hierarchy inside each window

Inside a window, the application process owns a view hierarchy. A local render thread draws that hierarchy into a buffer, and that buffer becomes the surface for the window.

In this model, one window does not know the internal view tree of another window.

---

## How iOS-style view blur looks from the outside

The effect is easy to observe on iOS:

| iOS Sample 1 | iOS Sample 2 |
|:------------:|:------------:|
| [![](/assets/img/blur-ios-view.png)](/assets/img/blur-ios-view.png) | [![](/assets/img/blur-ios-view2.png)](/assets/img/blur-ios-view2.png) |

From the user's point of view, the button or panel is just another view inside the foreground window. Yet its background clearly contains blurred information that visually comes from windows behind it.

That raises the real implementation question: how can a view blur content that belongs to other windows and other processes?

---

## Rendering system in Android

Android has a very similar split between windows and views. Every view hierarchy is rendered by a `RenderThread` in the application's own process. The resulting surface is then handed to `SurfaceFlinger`, which composites all window surfaces on every `vsync`.

<img src="/assets/img/android-graphics-pipeline.png" />

So the application process renders its own window, while `SurfaceFlinger` merges all windows into the final display buffer.

---

## Why background-window blur cannot be solved only inside a view

Under this window/view model, a single application process cannot safely access the rendered content of arbitrary windows behind it. If you want to blur what is visually behind a view, the blur operation has to happen at compositor level while windows are already being stacked in z-order.

In other words, the compositor needs a composition path that understands blur as part of the window compositing process.

Android does have a composition engine, even if it is not a fully abstract blur compositor out of the box. That means the platform can support this effect, but the responsibility has to sit closer to the compositor than to a normal application view.

---

## Requesting a blurred background buffer from the compositor

One workable design is this:

1. The foreground application asks the compositor to blur the windows behind a certain region.
2. The compositor generates that blurred result while composing the current window stack.
3. The blurred buffer is shared back to the requesting process as a platform-level shared buffer.
4. The application's `RenderThread` uses that shared buffer as a texture for the target view.

This avoids the application trying to read other windows directly and keeps the ownership of cross-window composition inside the system compositor where it belongs.

### Limitation: one-frame latency

With this design, one issue is unavoidable: frame sequencing.

<img src="/assets/img/android-graphics-pipeline-n-1.png" />

Suppose the app asks for a blurred background during frame `N - 1`. The compositor also generates that blurred composite during frame `N - 1`, but the app usually consumes the shared buffer during the next draw, which is effectively frame `N`.

So the view is often showing a blurred background that is one frame behind.

In practice, I consider this acceptable. Users rarely notice the difference between two consecutive blurred buffers, and a one-frame delay is usually much harder to perceive in a blurred background than it would be in sharply detailed content.

You can even observe a similar phenomenon on other platforms. On Windows 10, for example, a screenshot taken while opening and closing Notification Center can reveal the same kind of temporal gap.

---

## Conclusion

From my own implementation experience on Android P, this approach can produce a result that is visually comparable to other platforms. The cost, however, is not free: blur increases GPU work and can also raise power consumption.

So the final decision is still a platform trade-off. The aesthetic benefit is real, but so is the cost in performance and battery.
