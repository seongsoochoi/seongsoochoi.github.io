---
publishDate: 2019-04-28T13:32:20+03:00
title: "Rotating Objects in 3D Engines"
excerpt: "Three practical rotation patterns for objects and cameras in 3D engines, from drag-based object control to camera-aware transforms."
author: "Woohyun Kim"
category: "Graphics"
tags:
  - "Unity"
  - "Unreal"
  - "Rotation"
  - "Mathematics"
language: en
translations:
  ko: "rotating-objects-ko"
  en: "rotating-objects"
---

Rotating an object from mouse input sounds simple until camera movement enters the picture. The same drag gesture can mean very different things depending on whether the camera is fixed, orbiting, or already rotated. This note walks through three rotation patterns that I have used in 3D engines and explains the math behind each one.

---

## 1. Rotate an object from a 2D mouse drag

Assume that the user drags across a 2D screen while the camera remains fixed. We only need two screen positions: the click-down point `P = (x, y)` and the current drag point `P' = (x', y')`.

<img src="/assets/projects/rotating-objects/rotating-objects.png" />

The drag vector `M = P' - P` gives us the rotation magnitude. If the camera is placed at `(0, 0, a)` and looks toward the origin, we can derive a rotation axis from the cross product between `M` and the camera look direction `(0, 0, -a)`.

<img src="/assets/projects/rotating-objects/rotating-objects-cross.png" />

That gives us the two pieces we need for an angle-axis rotation:

- the angle comes from the drag length `|M|`
- the axis comes from `cross((0, 0, -1), M)`

We can then build a quaternion from that angle-axis pair and apply it to the object's previous orientation.

```java
@Override
public void onDown(MouseEvent e, Object o) {
	// Store the current orientation when the drag begins.
	prevOrientation = o.get().getTransformData().getOrientation();
	prevX = e.x;
	prevY = e.y;
}

// Canvas defines right as +x and down as +y.
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

This approach works well while the camera is fixed. The limitation appears once the object's local axes flip past 180 degrees. From that point on, drag directions can start to feel unintuitive because the camera view is still fixed while the object has effectively turned over.

That is acceptable for a first-person style control, but not for a third-person viewer or inspection tool. In those cases it is usually better to orbit the camera instead of rotating the object directly.

---

## 2. Orbit the camera instead of the object

For model viewers and inspection tools, rotating the camera around the object usually feels more natural. Conceptually, the user is dragging over a sphere around the target, very much like Google Earth.

To do that, we first need the orthogonal basis of the camera because the drag direction on the screen should be interpreted in camera space rather than world space.

The camera LookAt is typically described with an up vector `U` and a look-at vector `L`. From those two vectors we can build an orthogonal basis `O`.

<img src="/assets/projects/rotating-objects/camera-lookat.png" />

$$ O.z = -L $$
$$ O.y = U $$
$$ O.x = cross(L, U) $$

Once we have that basis, we can translate the drag delta into camera-oriented space, derive a new angle-axis rotation, and then apply that rotation to the camera position and its up vector.

<img src="/assets/projects/rotating-objects/camera-orbital-rotation.png" />

```java
@Override
public void onDown(MouseEvent e, TransformCamera camera) {
	// Cache camera data when the drag begins.
	prevCameraBasis = camera.getOrthonormalBasisOrientationBase();
	prevCameraTransform = camera.getTransformData().getCurrentTransformMatrix();
	prevPosition = camera.getTransformData().getPosition3f();
	prevX = e.x;
	prevY = e.y;
}

@Override
public void onDrag(MouseEvent e, TransformCamera camera) {
	Point delta = new Point(e.x - prevX, -(e.y - prevY));

	// Translate screen-space drag into the camera basis.
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

This gives the user a clean turntable-like interaction and keeps object inspection intuitive.

---

## 3. Rotate an object correctly under a movable camera

The first solution assumed a fixed camera, so the drag-derived rotation lived in world coordinate space. Once the camera itself can move, we need to reinterpret that rotation in camera coordinate space.

Recall two equivalent ways to apply a rotation:

- `R = x_w * o`, where `x_w` is a world-space rotation and `o` is the object
- `R = o * x_l`, where `x_l` is a local-space rotation

If `v` is the current camera or view transform, then we can write

$$ R = x_w * v = v * x_l $$

which leads to

$$ x_v = x_l = v^{-1} * x_w * v $$

This converts the drag-derived rotation from world space into camera space. From there we can extract a quaternion and apply it to the object while preserving the intuitive drag behavior from the viewer's point of view.

```java
// Same setup as solution 1, except the rotated object here is a cubemap.
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

	// Convert world-space rotation to camera-space rotation.
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

This is the version I use when the camera can move freely but object rotation still needs to follow screen-space drag in an intuitive way.
