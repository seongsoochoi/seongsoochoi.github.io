---
publishDate: 2019-04-28T13:32:20+03:00
title: "3D 엔진에서 오브젝트를 회전시키는 방법"
excerpt: "드래그 입력을 이용한 오브젝트 회전, 오비탈 카메라, 이동 가능한 카메라 기준 회전을 수식과 함께 정리합니다."
author: "Woohyun Kim"
category: "Graphics"
tags:
  - "Unity"
  - "Unreal"
  - "Rotation"
  - "Mathematics"
language: ko
translations:
  ko: "rotating-objects-ko"
  en: "rotating-objects"
---

마우스로 오브젝트를 회전시키는 기능은 겉보기보다 훨씬 미묘합니다. 카메라가 고정되어 있는지, 오브젝트를 보는 카메라가 공전하는지, 이미 카메라가 기울어진 상태인지에 따라 같은 드래그 입력도 전혀 다른 의미를 갖기 때문입니다. 이 글에서는 3D 엔진에서 자주 쓰는 세 가지 회전 방식과 그 수학적 배경을 정리해 보겠습니다.

---

## 1. 2D 화면의 마우스 드래그로 오브젝트 회전시키기

우선 카메라가 고정되어 있다고 가정해 보겠습니다. 이 경우 필요한 값은 클릭이 시작된 지점 `P = (x, y)` 와 현재 드래그 지점 `P' = (x', y')` 두 개뿐입니다.

<img src="/assets/projects/rotating-objects/rotating-objects.png" />

드래그 벡터 `M = P' - P` 는 회전량의 크기를 알려줍니다. 카메라가 `(0, 0, a)` 위치에서 원점을 바라보고 있다면, `M` 과 카메라의 시선 방향 `(0, 0, -a)` 의 외적을 통해 회전축을 구할 수 있습니다.

<img src="/assets/projects/rotating-objects/rotating-objects-cross.png" />

즉, angle-axis 회전에 필요한 두 요소를 다음처럼 얻을 수 있습니다.

- 회전 각도는 드래그 길이 `|M|`
- 회전축은 `cross((0, 0, -1), M)`

이 값을 이용해 쿼터니언을 만들고, 드래그 시작 시점의 오브젝트 orientation에 곱해주면 됩니다.

```java
@Override
public void onDown(MouseEvent e, Object o) {
	// 드래그 시작 시점의 orientation을 저장한다.
	prevOrientation = o.get().getTransformData().getOrientation();
	prevX = e.x;
	prevY = e.y;
}

// Canvas는 오른쪽이 +x, 아래쪽이 +y이다.
@Override
public void onDrag(MouseEvent e, Object o) {
	int dx = e.x - prevX;
	int dy = e.y - prevY;
	Vector3f delta = new Vector3f(dx, -dy, 0);

	float angle = delta.length();
	Vector3f rotAxis = new Vector3f(0, 0, -1).cross(delta).normalize();

	Quaternionf rotation = new Quaternionf(new AxisAngle4f(angle, rotAxis));
	Quaternionf newOrientation = new Quaternionf(prevOrientation).mul(rotation);

	o.get().getTransformData().setOrientation(newOrientation);
}
```

이 방식은 카메라가 고정되어 있을 때는 잘 동작합니다. 다만 오브젝트의 로컬 축이 180도 이상 뒤집히기 시작하면, 드래그 방향과 실제 회전 결과가 직관적으로 느껴지지 않을 수 있습니다. 화면은 그대로인데 오브젝트만 뒤집혀 있기 때문입니다.

즉, FPS처럼 1인칭 시점 기반 제어에는 어울릴 수 있지만, 모델 뷰어나 에디터처럼 고정 카메라로 대상을 관찰하는 용도에는 다음 방식이 더 자연스럽습니다.

---

## 2. 오브젝트 대신 카메라를 공전시키기

모델 뷰어나 프리뷰 도구에서는 오브젝트를 직접 돌리기보다 카메라가 대상을 중심으로 공전하도록 만드는 편이 훨씬 자연스럽습니다. 사용자는 사실상 구면 위를 드래그하면서 대상을 둘러보는 것이고, 감각적으로는 Google Earth와 비슷합니다.

이때는 화면상의 드래그를 월드 좌표계가 아니라 카메라 좌표계에서 해석해야 합니다. 따라서 먼저 카메라의 직교 기저를 구해야 합니다.

카메라 LookAt은 일반적으로 up 벡터 `U`, look-at 벡터 `L` 로 정의할 수 있고, 여기서 직교 기저 `O` 를 구성하면 다음과 같습니다.

<img src="/assets/projects/rotating-objects/camera-lookat.png" />

$$ O.z = -L $$
$$ O.y = U $$
$$ O.x = cross(L, U) $$

이 기저를 기준으로 드래그 입력을 해석하면 화면상의 움직임을 카메라 기준 방향으로 변환할 수 있습니다. 그 뒤 angle-axis 회전을 구해 카메라 위치와 up 벡터에 함께 적용하면 오비탈 카메라를 만들 수 있습니다.

<img src="/assets/projects/rotating-objects/camera-orbital-rotation.png" />

```java
@Override
public void onDown(MouseEvent e, TransformCamera camera) {
	// 드래그 시작 시점의 카메라 데이터를 보관한다.
	prevCameraBasis = camera.getOrthonormalBasisOrientationBase();
	prevCameraTransform = camera.getTransformData().getCurrentTransformMatrix();
	prevPosition = camera.getTransformData().getPosition3f();
	prevX = e.x;
	prevY = e.y;
}

@Override
public void onDrag(MouseEvent e, TransformCamera camera) {
	Point delta = new Point(e.x - prevX, -(e.y - prevY));

	// 화면상의 드래그를 카메라 기저 기준의 방향으로 변환한다.
	Vector3f dx = new Vector3f(prevCameraBasis[0]).mul(delta.x);
	Vector3f dy = new Vector3f(prevCameraBasis[1]).mul(delta.y);
	Vector3f direction = new Vector3f(dx).add(dy);

	float angle = direction.length();
	Vector3f rotAxis = new Vector3f(direction).cross(prevPosition).normalize();
	Quaternionf rotation = new Quaternionf(new AxisAngle4f(angle, rotAxis)).normalize();

	Matrix4f transform = TransformData.getOrbitalRotationLookup(prevCameraTransform, zero, rotation);
	camera.setTransformData(transform);
}

// TransformData#getOrbitalRotationLookup
public static Matrix4f getOrbitalRotationLookup(Matrix4f xForm, Vector3f center, Quaternionf rotation) {
	TransformData data = new TransformData(xForm);
	Vector3f newPosition = data.getPosition3f();
	Vector4f up = new Vector4f();
	data.getCurrentTransformMatrix().getColumn(1, up);
	Vector3f newUpVector = new Vector3f(up.x, up.y, up.z);

	newPosition = rotation.transform(newPosition.sub(center));
	newUpVector = rotation.transform(newUpVector);

	Matrix4f ret = new Matrix4f();
	ret.setLookAt(newPosition, center, newUpVector);
	ret.invert(); // to view matrix
	return ret;
}
```

이 방식은 사용자에게 깔끔한 턴테이블 조작감을 제공하고, 대상 관찰도 훨씬 자연스럽게 만들어 줍니다.

---

## 3. 이동 가능한 카메라 기준으로 오브젝트를 올바르게 회전시키기

첫 번째 방식은 카메라가 고정되어 있다고 가정했기 때문에, 드래그에서 얻은 회전 값이 월드 좌표계 기준으로 해석됩니다. 하지만 카메라 자체가 이미 이동하거나 회전할 수 있다면, 이제 그 회전은 카메라 좌표계로 다시 옮겨 해석해야 합니다.

회전은 보통 다음 두 형태로 생각할 수 있습니다.

- `R = x_w * o` : 월드 좌표계에서 회전 행렬 `x_w` 를 오브젝트 `o` 에 적용
- `R = o * x_l` : 로컬 좌표계에서 회전 행렬 `x_l` 를 적용

현재 카메라(또는 view) 변환을 `v` 라고 두면, 카메라가 움직이는 상황에서는 다음처럼 쓸 수 있습니다.

$$ R = x_w * v = v * x_l $$

따라서

$$ x_v = x_l = v^{-1} * x_w * v $$

를 통해 월드 기준 회전을 카메라 기준 회전으로 바꿀 수 있습니다. 이렇게 변환한 뒤 쿼터니언을 추출해 오브젝트에 적용하면, 사용자는 화면 기준 드래그와 일치하는 자연스러운 회전 결과를 얻게 됩니다.

```java
// 기본 구조는 1번 해법과 같고, 여기서는 cubemap을 회전 대상으로 사용한다.
@Override
public void onDown(MouseEvent e, GLPreview preview) {
	prevOrientation = TypeConverter.FloatArrayToQuaternionf(preview.getCubemap());
	prevX = e.x;
	prevY = e.y;
}

@Override
public void onDrag(MouseEvent e, GLPreview preview) {
	int dx = e.x - prevX;
	int dy = e.y - prevY;
	Vector3f delta = new Vector3f(dx, -dy, 0);

	float angle = delta.length() / CAM_SENSITIVITY;
	Vector3f rotAxis = new Vector3f(0, 0, -1).cross(delta).normalize();
	Matrix4f rotationMat = new Matrix4f().set(new AxisAngle4f(angle, rotAxis));

	// 월드 좌표계 회전을 카메라 좌표계 회전으로 바꾼다.
	Matrix4f viewMatrix = new Matrix4f().set(mCamera.getViewMatrix());
	Matrix4f viewMatrixInv = new Matrix4f(viewMatrix).invert();
	rotationMat = viewMatrixInv.mul(rotationMat).mul(viewMatrix);

	Quaternionf rotationCameraBased = new Quaternionf();
	rotationMat.getUnnormalizedRotation(rotationCameraBased);

	Quaternionf newOrientation = rotationCameraBased.mul(new Quaternionf(prevOrientation));
	mPreviewCanvas.setCubemap(TypeConverter.quaternionfToFloatArray(newOrientation));
	if(!mPreviewCanvas.isDisposed()) {
		mPreviewCanvas.redraw();
	}
}
```

카메라가 자유롭게 움직이는 환경에서도 화면 드래그와 회전 감각이 일치해야 한다면, 결국 이 방식이 가장 실용적입니다.
