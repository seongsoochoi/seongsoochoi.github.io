---
publishDate: 2020-02-28T20:32:20+03:00
title: "Efficient Blur Rendering for Real-Time Applications"
excerpt: "A compact guide to real-time blur using downscaled passes, separable Gaussian filters, and careful quality-performance trade-offs."
author: "Woohyun Kim"
category: "Graphics"
tags:
  - "Gaussian"
  - "Blur"
  - "Real-time"
  - "Rendering"
language: en
translations:
  ko: "efficient-blur-rendering-ko"
  en: "efficient-blur-rendering"
---

Blur is everywhere in modern user interfaces and real-time graphics. We see it in games, films, desktop operating systems, and mobile platforms. The visual result can feel polished and premium, but the GPU cost is still large because blur is usually implemented as a post-processing step. For real-time applications, the real challenge is not whether blur looks good, but whether it remains affordable.

A common blur pipeline looks like this:

1. Use the source texture as the blur input.
2. Blur a downscaled render target vertically or horizontally.
3. Blur a second downscaled render target in the other direction while sampling from the first pass.
4. Upscale the result back to the target resolution.

<img src="/assets/img/blur-renderpass.png" />

The blur shader itself is straightforward.

```glsl
// fragment shader
void main(void) {
	// ...
	vec4 blurColor = texture(sInputTexture, vUv) * uWeights[0];
	for (int i = 0; i < uBlurRadius; i++) {
		// uBlurRadius should be chosen on the CPU side together with the downscaling ratio.
		blurColor += texture(sInputTexture, vUv + uTexelOffset * float(i)) * uWeights[i];
		blurColor += texture(sInputTexture, vUv - uTexelOffset * float(i)) * uWeights[i];
	}
	// ...
}
```

In practice, two ideas dominate the performance discussion:

- make downscaling and upscaling cheap
- split the blur into horizontal and vertical passes

Once you accept that structure, the real tuning knobs are the blur radius, the downscaling ratio, and the number of texture fetches in the fragment shader.

---

## Essential features

### Reduce texture fetches with a downscaled buffer

From a mathematical point of view, a larger blur radius usually means more iterations in the shader. That quickly becomes expensive if you try to run the entire filter at full resolution.

The better approach is to downscale aggressively first and let the smaller buffer do part of the visual work for you. Downscaling has two benefits at the same time:

- it already softens the image
- it reduces the number of fragments that the GPU needs to process

In other words, do not spend all of your budget on a larger kernel if a smaller render target can achieve a similar visual result more cheaply.

In my own tests with Gaussian kernels on an FHD target, I was able to cover a fairly wide range of blur radii with only about 4 to 32 texture samples per fragment. The sampling count was not determined by the radius alone; it was determined by how the radius and the downscaling ratio were paired together.

```cpp
void determineKernel(float radius, int maxIteration = 32) {
	// Choose a practical downscaling ratio and a matching radius.
	while (radius >= maxIteration) {
		mDownscaleRatio *= 2.0f;
		radius *= 0.5f;
	}

	mGaussianRadius = radius;
	setGaussianKernel();
}

void setGaussianKernel() {
	const float s = mGaussianRadius / Math.sqrt(2.0f * Math.log(255.0f));
	const float c1 = 1.0f / (Math.sqrt(2.0f * PI) * s);
	const float c2 = -1.0f / (2.0f * s * s);

	float sum = 0.0f;
	for (int i = 0; i < mGaussianRadius; i++) {
		mWeights[i] = c1 * Math.pow(e, i * i * c2);
		sum += (i == 0 ? mWeights[i] : 2.0f * mWeights[i]);
	}

	for (int i = 0; i < mGaussianRadius; i++) {
		mWeights[i] /= sum; // normalization
	}
}
```

### Use mipmapping for the input texture

If the first blur pass reads from a texture that is being downsampled, trilinear filtering is often necessary to avoid aliasing and other visual artifacts. In practice that means using `LINEAR_MIPMAP_LINEAR` as the minification filter for the input texture.

One thing to keep in mind is timing: mipmaps can only be generated correctly after the GPU has finished writing the input texture.

### Optionally skip texels with weighted averaging

A blur shader usually samples every texel within the chosen radius. That gives the blur radius a nice interpretation in pixel units and keeps the output quality stable.

However, if performance matters more than perfect quality, you can skip some texels and approximate the missing contribution with a weighted arithmetic mean. This reduces iterations, sometimes by nearly half, but it can also introduce visible aliasing.

### Handle artifacts at the screen edge

Blur samples near the edge of the screen have fewer valid neighbors, which can produce visible discontinuities. For many practical cases, `MIRRORED_REPEAT` is a simple and effective fix.

---

## Conclusion: performance and quality are a trade-off

Real-time blur is mostly a balancing exercise. Without understanding the trade-off between performance and quality, it is very hard to build a solution that looks good and still fits within a frame budget.

The important part is not a single blur shader. It is the whole system around it: downscaling policy, kernel generation, filtering mode, edge handling, and how much aliasing you are willing to tolerate.
