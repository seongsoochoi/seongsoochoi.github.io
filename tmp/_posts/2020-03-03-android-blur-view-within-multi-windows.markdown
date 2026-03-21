---
layout: post
title: Android View blur with windows
date: 2020-03-03 13:32:20 +0300
description: Implementation of Blur in view with background windows
tags: [Android, View, Gaussian, Blur, Window, Runtime]
language: kr
---
## Blurred View with background windows

  We can observe blur rendering with many platforms. MS Windows, Apple's IOS and also Ubuntu except Android OS.  
  
  | Windows | IOS | Ubuntu |
  |:-------:|:---:|:------:|
  | [![](http://artrointel.github.io/assets/img/blur-win10.png)](http://artrointel.github.io/assets/img/blur-win10.png){:target="_blank"} | [![](http://artrointel.github.io/assets/img/blur-ios.png)](http://artrointel.github.io/assets/img/blur-ios.png){:target="_blank"} | [![](http://artrointel.github.io/assets/img/blur-ubuntu.png)](http://artrointel.github.io/assets/img/blur-ubuntu.png){:target="_blank"} |
  
  
  Blur rendering is very common in graphics, and it gives the platform a nice look and feel. (*Sometimes, this blur rendering could make less visibility of the contents.*)  
  This blur rendering can have some parameters to improve visual effect for user experience, blur radius, blend, dim color and level et al.   
  
  Most of the platform seems that they're supporting customized-rendering anyway.  
  All those platform have a common display system with 'window' and 'view'.  
  
#### 1. A system of the 'Window', multiple independent windows to be displayed.  
  - There is a window stack to display the screen, and they're composited synthesized in order by a 'Composer' system process.  
  - Each window normally would be per-processed. it means that they have an independent security zone in general.  
  
  For example, a bank application with a window shall not be screen-captured by external anonymous processes.  
  
#### 2. A system of the Hierarchy 'View' within a window.  
  A window rendered by its process can have a view hierarchy. those view objects are rendered by a local render thread in the process.  
  The render thread will draw all of views in hierarchy tree to a buffer, and it becomes a window.  
  
  In this mechanism, Every window does not need to know its 'view' tree each other, of course.  
  
----------------------------------------------------------------------------------------------------------------------------------

## View blur rendering with background windows in IOS  
  
  Let's take a look at these examples in IOS.  
  
  | IOS Sample 1 | IOS Sample 2 |
  |:-------:|:---:|
  | [ ![](http://artrointel.github.io/assets/img/blur-ios-view.png)](http://artrointel.github.io/assets/img/blur-ios-view.png){:target="_blank"} | [ ![](http://artrointel.github.io/assets/img/blur-ios-view2.png)](http://artrointel.github.io/assets/img/blur-ios-view2.png){:target="_blank"} |
  
  We can suppose there are the background windows behind the buttons.  
  Top of the window showing those blurred view buttons should be rendered by a process independent of the background windows.  
  Despite of this fact, background of the view takes partially blurred texture.  
 
  Then how can it be done ?  
    
----------------------------------------------------------------------------------------------------------------------------------
  
## Rendering system in Android OS  
  
  Android OS has a window and view system similar as the above description.
  Every view in hierarchy with a window process is drawn by a 'RenderThread' invoked by its process.
  Those windows are stacked and merged by 'SurfaceFlinger' system process at a time with a hardware signal called by 'vsync', which is a compositor of windows.
  
  <img src="http://artrointel.github.io/assets/img/android-graphics-pipeline.png" />  
  
  Hence, Each process renders all the views and delivers the result as a window(Surface) to the SurfaceFlinger.
  The SurfaceFlinger will composite the window stacks to display screen.
  This final display screen buffer will be delivered to display driver.  
  
----------------------------------------------------------------------------------------------------------------------------------
  
### Background windows projection on a view
  
  Under the constraints in window/view systems, we cannot get background rendering in a specific window.
  To make it possible, you'll have to do blur rendering in the compositer level during the z-ordered stacking and compositing operations.
  It means that the compositer should have a support like 'Abstract Composition engine' for the blur rendering.
  
  Fortunately, Android OS have the composition engine, though it is not perfect as an abstract composition engine.
  It means that you can make it possible to get a blur-supported compositer.
  
### Request blurred texture buffer sharing function to the Compositer by an application process
  
  A window process whose want to have a blurred background on its views, it could request "do blur rendering on my behind windows" to the compositer.
  Then, the Compositer accepts the blur request and renders by the engine with behind windows on Compositing timing.
  This rendered buffer should be shared to the requested process in platform level as zero-copied buffer.
  The window process will be able to get the file descriptor as blurred raw data in system level. 
  Finally, The RenderThread can use the shared blur buffer as a background texture in system level.
  
#### Limitation: 1 Frame latency
  
  With the above mechanism, there is an important issue that we have to keep in mind about frame sequences.
  <img src="http://artrointel.github.io/assets/img/android-graphics-pipeline-n-1.png" />  
  
  If you request to use blurred background on views at N-1 frame rendering, 
  The Compositor(SurfaceFlinger) will do composite all the windows by the blur compositor engine at the N-1 frame, too.
  Thus, the process will use the blurred 'N-1 buffer' at the next new draw call, but it is actually N's frame rendering.
  
  I want to say it's okay with the 1 frame latency. that's because it is very hard to be recognized for most users.
  Not only the difference of blurred textures between two sequence is unrecognizable, but also it's hard to recognize difference of 1 frame latency.
  
  Furthermore, This 1-frame latency issue can be observed in other platforms, too!
  You can make this issue using windows 10 os. Take a screen-shot by pressing 'Print Screen' key opening and closing your Notification Center.
    
----------------------------------------------------------------------------------------------------------------------------------

  With my working experience for this blur implementation in Android P OS, it resulted like the other platforms.
  And it increased power consumption due to blur rendering operations.
  
  Hence, You'll have to consider the trade-off of power consumption and the Aesthetic effect.
  