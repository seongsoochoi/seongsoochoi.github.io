---
layout: post
title: Efficient blur rendering
date: 2020-02-28 20:32:20 +0300
description: Introduction of key points on real-time blur rendering algorithm
tags: [Gaussian, Blur, Real-time, Rendering]
language: kr
---
## Efficient Blur for real-time rendering
  
  Blur rendering is used in various forms in industries where user experience is important.  
  The blur rendering can be found in many Games, Movies and also Mobile platforms. Especially, you can easily find the blur rendering in most of Apple's products.  
  But, the blur rendering using GPU costs high as a post processing. Hence, implementation of the blur with efficient way is necessary if it is real-time rendering base.  
  
  Here is well-known for the blur rendering pass,  
  
  
  1. Texture input for blur rendering  
  2. Do Blur Rendering On Downscaled FBO1(or RTT anyway) Vertically/Horizontally  
  3. Do Blur Rendering On Downscaled FBO2(or RTT anyway) Horizontally/Vertically, putting color texture from FBO1  
  4. Upscaling the FBO2 (use the result of color texture from FBO2)  
  
  <img src="http://artrointel.github.io/assets/img/blur-renderpass.png" />  
  
  Blur Shader is quite simple.
  ```
   // in fragment shader,
   void main(void) {
	// ...
	vec4 blurColor = texture(sInputTexture, vUv) * uWeights[0];
		for(int i = 0; i < uBlurRadius; i++) { // note that this uBlurRadius should be determined by CPU with downscaling ratio.
			blurColor += texture(sInputTexture, vUv + uTexelOffset*float(i)) * uWeights[i];
			blurColor += texture(sInputTexture, vUv - uTexelOffset*float(i)) * uWeights[i];
		}
	// ...
   }
 
  ```
  
  Basically there're 2 key points for performance, though we can see dependencies from this blur rendering passes.  
  
  - Down-up scaling by GPU with low cost  
  - Doing Separated vertical/horizontal blur render passes based on mathematical optimization  
  
  To process blur efficiently based on this fact, you'll have to handle blur 'radius' properly by downscaling ratio and for loop iteration in fragment shader.  
  Down-up scaling will not only make it blurred itself, but also it makes the size of FBO smaller.  
  
  More downscaling does more blur effect,  
  More smaller size of the color buffer lowers the cost in fragment stage.  
  
  
----------------------------------------------------------------------------------------------------------------------------------
  
## Essential Features  

### Reduced texture fetch operation with downscaled buffer  
  Iteration of the for loop in blur shader should be increased by blur radius in mathematical point of view.  
  It means that the GPU Cost will be increased by the bigger input radius.  
  But GPU shouldn't have to process very big radius iterations. This big radius can be handled by downscaling too.  
  
  Hence, most important thing is that doing down scaling as much as possible instead of adding more iterations.  
  This tunning could be done with heuristical way by updating the radius, or done by mathematical relationship between down-scaling ratio and your kernel function.  
  
  This worked fine with various range of radius using Gaussian kernel, doing from only 4 to 32 texture sampling in fragment shader based on FHD screen.  
  Note that higher radius does not have higher sampling count always; it is simply determined by kernel calculation.  
  I used the 'radius' factor in gaussian kernel's sigma calculation and for downsampling ratio as same ratio. 

```
  void determineKernel(float radius, int maxIteration = 32) {
    // make proper downscaling ratio & radius like this;
	while(radius < maxIteration) {
		mDownscaleRatio *= 2.0;
		radius *= 0.5;
	}
	mGaussianRadius = radius;
	setGaussianKernels();
  }
  
  void setGaussianKernel() {
	final float s = mGaussianRadius / Math.sqrt(2.0f * Math.log(255.0f));
	final float c1 = 1.0f / (Math.sqrt(2.0f * PI) * s);
	final float c2 = -1.0f / (2.0f * s * s);
	
	float sum = 0.0f;
	for(int i = 0; i < mGaussianRadius; i++) {
		mWeights[i] = c1 * Math.pow(e, i*i*c2);
		sum += (i == 0 ? mWeights[i] : 2.0f * mWeights[i]);
	}
	
	for(int i = 0; i < mGaussianRadius; i++)
		mWeights[i] /= sum; // normalization
  }
```  
  
#### Input texture Mipmapping  
  
  Trillinear filtering on the input texture should be done to remove visual artifacts on the first blur render pass. Because it renders to the downscaled the buffer.  
  In other words, Input texture should have LINEAR_MIPMAP_LINEAR as MIN_FILTER.  
  Note that this mipmap generation can only be done correctly after GPU job is already finished for the input texture.  
  Visual artifacts like aliasing could be shown unless doing the trillinear filtering.  
  
  
#### Optional: Jumping texels by Weighted arithmetic mean  
  Blur fragment shader normally fetches every texels from the input texture.  
  The 'radius' in blur rendering can be defined in units of pixels, to get more intuitive interface for the blur rendering.  
  And, it guarantees the quality of the blur effect by fetching every texels.  
  But, you could jump out some texels by Weighted arithmetic mean for better performance.  
  It could make aliasing, but you can reduce the iteration by half.  
  
  
#### Handling Visual Artifacts on edge screen  
  Visual artifacts can be shown on edge fragments due to lack of texels. Using MIRRORED_REPEAT can be a solution for general cases.  
  
  
## Conclusion: Trade-off: Performance and Quality

Without understanding this trade-off between performance and quality, you're not going to get a satisfactory solution. 
  