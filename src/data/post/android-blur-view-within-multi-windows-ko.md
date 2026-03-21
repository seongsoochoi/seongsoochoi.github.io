---
publishDate: 2020-03-03T13:32:20+03:00
title: "멀티 윈도우 환경에서 Android View 블러 구현하기"
excerpt: "안드로이드에서 뷰 뒤편의 윈도우를 블러 처리하기 어려운 이유와 compositor 기반 접근 방식을 정리합니다."
author: "Woohyun Kim"
category: "Android"
tags:
  - "Android"
  - "View"
  - "Gaussian"
  - "Blur"
  - "Window"
  - "Runtime"
language: ko
translations:
  ko: "android-blur-view-within-multi-windows-ko"
  en: "android-blur-view-within-multi-windows"
---

블러는 현대 플랫폼 디자인에서 매우 익숙한 요소입니다. Windows, iOS, Ubuntu에서는 이미 자연스럽게 볼 수 있고, 화면 전체를 조금 더 부드럽고 고급스럽게 보이게 만듭니다. 반면 Android에서는 특히 현재 윈도우 뒤에 있는 다른 윈도우 내용을 블러 처리해야 하는 경우, 이 효과를 프레임워크 차원에서 직접 다루기가 쉽지 않았습니다.

| Windows | iOS | Ubuntu |
|:-------:|:---:|:------:|
| [![](/assets/img/blur-win10.png)](/assets/img/blur-win10.png) | [![](/assets/img/blur-ios.png)](/assets/img/blur-ios.png) | [![](/assets/img/blur-ubuntu.png)](/assets/img/blur-ubuntu.png) |

블러는 플랫폼의 look and feel을 확실히 끌어올려 주지만, 동시에 콘텐츠 가독성을 낮출 수도 있습니다. 그래서 실제 구현에서는 blur radius, blend ratio, dim color, intensity level 같은 여러 파라미터를 함께 다루게 됩니다.

Android에서 이 문제가 어려운 이유를 이해하려면, 표시 시스템을 두 층으로 나눠서 보는 것이 좋습니다.

#### 1. 윈도우 시스템

- 여러 개의 독립적인 윈도우가 쌓이고, compositor가 이를 합성해 화면에 표시합니다.
- 각 윈도우는 보통 서로 다른 프로세스와 보안 경계를 가집니다.

예를 들어, 은행 앱의 윈도우가 외부 프로세스에 의해 임의로 캡처되면 안 됩니다.

#### 2. 각 윈도우 안의 뷰 계층

윈도우 내부에서는 애플리케이션 프로세스가 자기 own view hierarchy를 렌더링합니다. 로컬 `RenderThread` 가 이 계층을 버퍼에 그리면, 그 결과가 해당 윈도우의 surface가 됩니다.

즉, 한 윈도우는 다른 윈도우 내부의 뷰 트리를 직접 알 필요도 없고, 보통 알아서도 안 됩니다.

---

## iOS의 view blur는 바깥에서 보면 어떻게 보이는가

iOS에서는 이 효과를 비교적 쉽게 관찰할 수 있습니다.

| iOS Sample 1 | iOS Sample 2 |
|:------------:|:------------:|
| [![](/assets/img/blur-ios-view.png)](/assets/img/blur-ios-view.png) | [![](/assets/img/blur-ios-view2.png)](/assets/img/blur-ios-view2.png) |

사용자 입장에서는 전경 윈도우 안의 버튼이나 패널이 단순한 view처럼 보입니다. 그런데 그 배경에는 분명히 뒤쪽 윈도우에서 온 것처럼 보이는 블러 정보가 부분적으로 섞여 있습니다.

결국 구현 관점의 핵심 질문은 이것입니다. 서로 다른 윈도우, 서로 다른 프로세스에 속한 배경 내용을 어떻게 특정 view 안에서 블러 처리할 수 있을까?

---

## Android의 렌더링 시스템

Android도 기본 구조는 비슷합니다. 각 앱 프로세스는 자신의 `RenderThread` 를 통해 view hierarchy를 렌더링하고, 그 결과 surface를 `SurfaceFlinger` 에 넘깁니다. `SurfaceFlinger` 는 매 `vsync` 시점마다 여러 윈도우 surface를 합성해 최종 디스플레이 버퍼를 만듭니다.

<img src="/assets/img/android-graphics-pipeline.png" />

즉, 앱 프로세스는 자기 윈도우만 그릴 뿐이고, 전체 윈도우 스택을 하나로 합치는 일은 시스템 compositor가 담당합니다.

---

## 왜 view 내부만으로는 배경 윈도우 블러를 해결할 수 없는가

이 window/view 모델에서는 하나의 앱 프로세스가 자기 뒤에 있는 임의의 윈도우 렌더링 결과를 안전하게 직접 읽어올 수 없습니다. 만약 특정 view 뒤편의 시각적 배경을 블러 처리하고 싶다면, 그 블러 연산은 윈도우들이 이미 z-order로 쌓이는 compositor 단계에서 수행되어야 합니다.

즉, compositor 자체가 blur를 윈도우 합성 과정의 일부로 이해해야 합니다.

Android에는 composition engine이 존재하므로, 완전한 추상 블러 compositor가 아니더라도 플랫폼 차원에서 이 효과를 지원할 가능성은 있습니다. 다만 책임 위치는 일반 view가 아니라 시스템 compositor 쪽에 가까워야 합니다.

---

## compositor에게 블러 버퍼를 요청하는 방식

실용적인 설계는 다음과 같습니다.

1. 전경 앱이 특정 영역 뒤편의 윈도우를 블러해 달라고 compositor에 요청합니다.
2. compositor는 현재 window stack을 합성하는 시점에 그 블러 결과를 생성합니다.
3. 생성된 블러 버퍼를 플랫폼 레벨 공유 버퍼 형태로 요청한 프로세스에 전달합니다.
4. 앱의 `RenderThread` 는 그 공유 버퍼를 target view의 배경 텍스처처럼 사용합니다.

이 방식은 앱이 다른 윈도우를 직접 읽으려 하지 않도록 해주고, cross-window 합성의 책임도 원래 있어야 할 위치인 시스템 compositor 안에 유지해 줍니다.

### 한계: 1프레임 지연

이 설계에서는 프레임 시퀀스 문제를 피할 수 없습니다.

<img src="/assets/img/android-graphics-pipeline-n-1.png" />

예를 들어 앱이 `N - 1` 프레임에서 블러 배경을 요청했다면, compositor도 `N - 1` 프레임 합성 시점에 블러 결과를 만듭니다. 하지만 앱은 보통 다음 draw에서 그 공유 버퍼를 소비하므로, 실제로는 `N` 프레임에서 `N - 1` 기준의 블러 버퍼를 보게 됩니다.

즉, view는 한 프레임 늦은 블러 배경을 표시하는 셈입니다.

실제로는 이 정도 지연은 충분히 감내 가능하다고 봅니다. 블러된 배경은 원래 고주파 디테일이 적기 때문에, 연속된 두 프레임 차이나 1프레임 지연을 사용자가 인지하기가 훨씬 어렵습니다.

비슷한 현상은 다른 플랫폼에서도 관찰할 수 있습니다. 예를 들어 Windows 10에서도 알림 센터를 열고 닫는 순간에 스크린샷을 찍어 보면 유사한 시간 차를 발견할 수 있습니다.

---

## 결론

Android P에서 직접 이 방식을 구현해 본 경험상, 시각적인 결과 자체는 다른 플랫폼과 비교해도 충분히 유사한 수준으로 만들 수 있습니다. 다만 그 대가는 분명합니다. 블러 연산은 GPU 작업량을 늘리고, 전력 소모 역시 증가시킬 수 있습니다.

그래서 최종 판단은 결국 플랫폼 차원의 trade-off입니다. 시각적인 완성도는 분명 좋아지지만, 성능과 배터리 비용도 함께 고려해야 합니다.
