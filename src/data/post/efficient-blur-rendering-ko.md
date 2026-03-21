---
publishDate: 2020-02-28T20:32:20+03:00
title: "실시간 렌더링을 위한 효율적인 블러"
excerpt: "다운스케일 패스와 분리 가우시안 블러를 활용해 실시간 블러를 효율적으로 구현하는 핵심 포인트를 정리합니다."
author: "Woohyun Kim"
category: "Graphics"
tags:
  - "Gaussian"
  - "Blur"
  - "Real-time"
  - "Rendering"
language: ko
translations:
  ko: "efficient-blur-rendering-ko"
  en: "efficient-blur-rendering"
---

블러는 현대 UI와 실시간 그래픽에서 매우 흔하게 쓰이는 효과입니다. 게임, 영화, 데스크톱 운영체제, 모바일 플랫폼 어디에서나 볼 수 있습니다. 결과물은 세련되고 고급스럽게 느껴지지만, 구현 관점에서는 여전히 비용이 큰 후처리 효과입니다. 실시간 환경에서 중요한 것은 블러가 보기 좋은가보다도, 프레임 예산 안에서 감당 가능한가입니다.

일반적으로 많이 쓰는 블러 파이프라인은 다음과 같습니다.

1. 원본 텍스처를 블러 입력으로 사용한다.
2. 다운스케일된 렌더 타깃에 대해 세로 또는 가로 방향 블러를 수행한다.
3. 첫 번째 패스의 결과를 입력으로 삼아, 두 번째 다운스케일 렌더 타깃에서 반대 방향 블러를 수행한다.
4. 최종 결과를 다시 목표 해상도로 업스케일한다.

<img src="/assets/img/blur-renderpass.png" />

블러 셰이더 자체는 비교적 단순합니다.

```glsl
// fragment shader
void main(void) {
	// ...
	vec4 blurColor = texture(sInputTexture, vUv) * uWeights[0];
	for (int i = 0; i < uBlurRadius; i++) {
		// uBlurRadius는 CPU에서 downscaling ratio와 함께 결정해야 한다.
		blurColor += texture(sInputTexture, vUv + uTexelOffset * float(i)) * uWeights[i];
		blurColor += texture(sInputTexture, vUv - uTexelOffset * float(i)) * uWeights[i];
	}
	// ...
}
```

실제로 성능을 좌우하는 핵심은 크게 두 가지입니다.

- 다운스케일과 업스케일을 얼마나 저렴하게 처리할 수 있는가
- 블러를 가로/세로 패스로 분리해서 계산량을 줄일 수 있는가

결국 이 구조를 받아들이고 나면, 실제 튜닝 포인트는 블러 반경, 다운스케일 비율, 그리고 fragment shader의 texture fetch 횟수로 모입니다.

---

## 핵심 포인트

### 다운스케일 버퍼로 texture fetch를 줄이기

수학적으로 보면 블러 반경이 커질수록 셰이더의 반복 횟수도 늘어나는 경우가 많습니다. 이를 그대로 풀 해상도에서 처리하면 금방 비싸집니다.

더 나은 방법은 먼저 적극적으로 다운스케일하고, 줄어든 버퍼 크기 자체가 시각적 블러 효과에 기여하도록 만드는 것입니다. 다운스케일은 두 가지 이점을 동시에 제공합니다.

- 이미지가 이미 한 번 부드러워진다
- GPU가 처리해야 할 fragment 수가 줄어든다

즉, 같은 품질에 가까운 결과를 더 작은 비용으로 얻을 수 있다면, 무조건 큰 커널에만 예산을 쓰기보다 더 작은 렌더 타깃을 적극적으로 활용하는 편이 낫습니다.

제가 가우시안 커널을 기준으로 FHD 타깃에서 테스트했을 때는, 비교적 넓은 반경 범위를 대략 4회에서 32회 정도의 샘플링으로 처리할 수 있었습니다. 중요한 것은 반경만 키우는 것이 아니라, 반경과 다운스케일 비율을 같이 조정하는 것이었습니다.

```cpp
void determineKernel(float radius, int maxIteration = 32) {
	// 실용적인 downscaling ratio와 대응되는 radius를 결정한다.
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

### 입력 텍스처에 mipmapping 적용하기

첫 번째 블러 패스가 다운샘플링된 버퍼를 향해 렌더링된다면, aliasing과 같은 시각적 아티팩트를 줄이기 위해 입력 텍스처에 trilinear filtering이 필요한 경우가 많습니다. 실무적으로는 입력 텍스처의 MIN_FILTER를 `LINEAR_MIPMAP_LINEAR` 로 두는 방식이 자주 쓰입니다.

단, mipmap은 입력 텍스처에 대한 GPU 작업이 끝난 뒤에야 올바르게 생성할 수 있다는 점을 기억해야 합니다.

### 필요하다면 texel 일부를 건너뛰기

일반적인 블러 셰이더는 선택한 반경 안의 모든 texel을 샘플링합니다. 이렇게 하면 블러 반경을 픽셀 단위로 직관적으로 정의할 수 있고, 품질도 안정적으로 유지됩니다.

반대로 성능이 더 중요하다면 일부 texel을 건너뛰고 가중 평균으로 그 기여분을 근사할 수도 있습니다. 이 경우 반복 횟수를 크게 줄일 수 있지만, aliasing이 더 잘 보일 수 있다는 대가가 있습니다.

### 화면 가장자리 아티팩트 처리하기

화면 가장자리 근처의 샘플은 주변 이웃 texel이 부족하기 때문에 눈에 띄는 이음새가 생길 수 있습니다. 일반적인 경우에는 `MIRRORED_REPEAT` 만으로도 꽤 실용적인 해결책이 됩니다.

---

## 결론: 성능과 품질의 균형

실시간 블러는 결국 균형의 문제입니다. 성능과 품질의 trade-off를 이해하지 못하면, 보기 좋으면서도 프레임 예산 안에 들어오는 구현을 만들기 어렵습니다.

중요한 것은 블러 셰이더 한 조각이 아니라 그 주변 전체 시스템입니다. 다운스케일 정책, 커널 생성 방식, 필터링 모드, 가장자리 처리, 그리고 어느 정도의 aliasing을 감수할 것인지까지 모두 함께 결정해야 합니다.
