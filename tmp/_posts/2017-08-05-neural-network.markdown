---
layout: post
title: Neural Network based on Mathematics
date: 2017-09-12 13:32:20 +0300
description: Experimental c++ with openMP for mnist example
tags: [mnist, neural network, nn, cnn]
language: kr
---
## Neural Network based on Mathematics

----------------------------------------------------------------------------------------------------------------------------------

### 1. Universal Approximation Theorem [[WIKI](https://en.wikipedia.org/wiki/Universal_approximation_theorem), [Reference](http://mcneela.github.io/machine_learning/2017/03/21/Universal-Approximation-Theorem.html)]

임의의 함수 $ F(x) $가 연속한 실수공간에 존재하는 함수라 할 때, 아래와 같이 이에 근사하는 연속함수 $ f(x) $가 존재한다.  
  
$$ F(x) \simeq \sum_{i=1}^N v_i \Phi(w_i^Tx + b_i) = f(x) \text{ where } i \in 1, ..., N $$
  
이 때 $ \Phi() $는 비상수인 단조증가연속함수이며, 충분히 작은 $ \epsilon > 0 $에 대하여 $ |F(x) -  f(x)| > \epsilon $을 만족시키는  
자연수 $ N $ 과 실수 $ v_i, b_i $ 및 벡터 $ w_i $가 존재한다.  


(특히, $ \Phi() $가 sigmoid 함수인 경우 [시벤코 정리](https://ko.wikipedia.org/wiki/%EC%8B%9C%EB%B2%A4%EC%BD%94_%EC%A0%95%EB%A6%AC)라 한다.)

정리에 의해 임의의 함수 $ F(x) $는 single perceptron만으로 $ F(x) $에 근사하는 임의의 함수 $ f(x) $를 만들어낼 수 있다는 것을 의미한다.  
  
아래에서 소개할 과정은 Neural Network에서 $ w_i $와 $ b_i $를 찾아가는 과정을 알아볼 것이다.  
<br>

----------------------------------------------------------------------------------------------------------------------------------

### 2. Single perceptron  
  * Notation  
  아래와 같이 d번째 Layer에 존재하는 임의의 index i를 가지는 $ x $를 다음과 같이 표기하자.  
<br>
  $$ \Huge {x_{i}^{(d)} }$$  
<br>
  
  <img src="http://artrointel.github.io/assets/projects/neural-network/perceptron.JPG" />  
  
  위의 그림에서 다음 Layer의 $ x_{i}^{(1)} $를 일반화하면 다음과 같다.  
<br>
  $$ \Large f(\sum_{j=1}^N w_{i,j}^{(1)} x_{j}^{(0)} + b_{i}^{(1)}) = x_{i}^{(1)} \text{, f() is an activation function. } $$  
<br>

  이 때, 편의 상 $ z_{i}^{(1)} = \sum_{j=1}^N w_{i,j}^{(1)} x_{j}^{(0)} + b_{i}^{(1)} $ 라 정의하자.  
  
  그러면 $ f(z_{i}^{(1)}) = x_{i}^{(1)} $. 이며, 간단히 $ f(\vec z) = \vec x$ 로 표기할 수 있다.  
  
  이 처럼 이전 layer로부터 다음 layer로의 계산을 통해 $x_{i}^{d}$로 값을 전달하는 과정을 **forward propagation**이라 한다.
    
  단, $ z_{i}^{(1)} $ 의 계산에 $ x_{j}^{(0)} $, 즉 이전 Layer로부터의 입력된 값을 사용한다는 데 주의한다.  
  
----------------------------------------------------------------------------------------------------------------------------------
  
### 3. Loss function (J)  
  
  위 그림의 $ d = 1 $이 output layer일 때 $ x_{i}^{(1)} $ 은 예측 값이라 할 수 있다.  
  따라서 정답 값 $ t_{i} $ 와 예측 값 $ x_{i}^{(1)} $ 의 오차(이하 손실률 J)를 계산하고, 정답으로 근사시킬 $w(weight) $ 및 $ b(bias)$의 값을 찾아가야 한다.  
  이를 위해서는 $ x_{i}^{(1)} $의 계산에 참여한 $w_{i}^{(1)}$ 및 $b_{i}^{(1)}$ 값이 손실률에 얼마나 기여했는지에 대해 찾아서 아래처럼 적절히 update해야 할 것이다.  
<br>
$$ \begin{align}
w &\leftarrow w - \mu \frac{\partial J}{\partial w} , \mu \text{ is learning rate}  \\\\ 
b &\leftarrow b - \mu \frac{\partial J}{\partial b} , \mu \text{ is learning rate} \end{align} $$  
<br>
  예를 들어, 손실함수 J를 아래의 *mean-squared-error*를 사용하는 경우를 생각해보자.  
<br>
$$ \Large J = \frac{1}{2} \sum_{i=1}^N (t_{i} - x_{i})^2 $$  
<br>
  이 경우 그래프는 아래와 같다.  
  
![MSE](http://artrointel.github.io/assets/projects/neural-network/mse.JPG)
  
  위의 mean-square 역시 $ t_{i}=x_{i} $로 수렴하는 순간 손실률 $J = 0$이 된다.  
  정답 값으로 근사할 수록 J의 변화율이 줄어드므로, 과정을 반복할 수록 정답에 근사하는 $w $ 및 $ b $의 값을 찾아낼 수 있을 것임을 유추할 수 있다.
<br>

----------------------------------------------------------------------------------------------------------------------------------
  
### 4. Activation functions  
  앞서 Universal Approximation Theorem에서 $\Phi$가 단조증가연속함수로 정의하였으니,  
  activation function으로 아래와 같은 적절한 함수를 지정할 수 있다.  
  
  <br>
  * Sigmoid  
![Sigmoid](http://artrointel.github.io/assets/projects/neural-network/sigmoid.JPG)
  $ \Large f(x) = \frac{1}{1+e^{-x}}$ , $ \frac {d f}{d x} = f(x) (1-f(x)) $  
  <br>
  $ pf) $ <br>
  $ \begin{align} \\ 
  \frac {d f}{d x} &= -(1+e^{-x})^{-2} (-e^{-x})  \\\\ 
  &= \frac {1}{1+e^{-x}} \frac {e^{-x}}{1+e^{-x}}  \\\\ 
  \therefore \frac {d f}{d x} &= f(x) (1-f(x))  \end{align} $
     
  <br>
  * ReLU  
![ReLU](http://artrointel.github.io/assets/projects/neural-network/relu.JPG)
  $ \Large f(x) = \begin{cases} \\
  0 \text{, if } x \le 0  \\\\ 
  x \text{, if } x \gt 1  \\\\ 
  \end{cases}
  \text{, definitely }
  \frac {d f}{d x} = \begin{cases} \\
  0 \text{, if } x \le 0  \\\\ 
  1 \text{, if } x \gt 1  \\\\ 
  \end{cases} $
  
  <br>
  * softmax  
  $ f(x_{i}) = \frac {e^{x_{i}}}{\sum_{j=1}^N e^{x_{j}}} $  
  
<br>

----------------------------------------------------------------------------------------------------------------------------------

### 5. Back propagation  
  실제 network 구성 시 Single perceptron이 아닌 다수의 Neurons, Layers가 존재할 것이므로,  
  최종 결과 값 $ x_{j}^{(d)} $에 대한 손실률은 다변수 함수에 대한 편미분을 통해 $w$, $b$ 값을 업데이트할 수 있다. 가령,  
  어떤 $ w_{1,1}^{(0)} $ 값에 의한 손실률 J의 미분 즉 $\nabla_{w_{1,1}^{(0)}} J$ 는, 전파하였던 레이어들의 모든 $ w_{i,j}^{(1)}, w_{i,j}^{(2)}, ...$의 영향을 받는다.  
  따라서 하나의 $w_{i,j}^{(d)} $를 update 하기 위해서는 매우 큰 계산비용이 필요하다.  
  또한 각각의 모든 Neurons의 $\vec w$, $\vec b$를 update해야 하므로 비용은 더욱 커진다.  
  <br>
  이를 해결하기 위해 아래의 그림처럼 Chain rule을 통해 계산하여 비용을 대폭 줄일 수 있다.  
  <br>
  
  (그림)  
  
  <br>
  그림처럼 손실률 $J$ 를 아래의 cross entropy라 가정하면,
  
  <br>
  * cross-entropy  
  <br>
  $$ \Large J(x_{k}^{d}) = -\sum_{i=1}t_{i} \log x_{i}^{d} \small \text{ , where t is an answer vector, d is an output layer, k is one of index i} $$
  
  ⓐ$ \frac {\partial J }{\partial x_{k}} $  
  $ \begin{align} \text{definitely, } \frac {\partial J }{\partial x_{k}} &= - \frac {t}{x_{k}}  \\\\ 
  \therefore \frac {\partial J }{\partial x} &= - \frac {t}{x} \end{align} $  
  <br>
  (그림)  
  <br>
  ⓑ $z^{(2)} \rightarrow x^{(2)} \rightarrow \nabla_{z^{(2)}} J$ 의 손실률 $\nabla_{z^{(2)}} J $을 구해보자.  
  위 그림에서 보듯이, 특정 $z_{k}^{(2)} \text{, } (k = i) \text{ or } (k \ne i) $에 의한 cross entropy 계산은 다른 모든 $x_{i}^{(2)}$에 모두 영향을 미치므로,  
  모든 $x_{i}^{(2)}$에 대한 변화율을 합해주어야 한다. 즉,  
  <br>
  ⓒ $ \begin{align} \nabla_{z_{k}} J &= \sum_{i} \color{red}{\frac{\partial J}{\partial x_{i}}} \color{blue}{\frac{\partial x_{i}}{\partial z_{k}}} \text{, } (k = i) \text{ or } (k \ne i)  \\\\ 
   &= \sum_{i \ne k} \frac{\partial J}{\partial x_{i}} \frac{\partial x_{i}}{\partial z_{k}} + \frac{\partial J}{\partial x_{k}} \frac{\partial x_{k}}{\partial z_{k}} \end{align} $
  <br>
  그런데 이미 ⓐ에서 $ \color{red}{\frac {\partial J }{\partial x}} = - \frac {t}{x} $는 알고 있으니, $ \color{blue} {\frac{\partial x}{\partial z}} $에 대해 생각해보자.  
  <br>
  위 그림처럼 cross entropy를 통해 손실률 J을 계산하기 전에 사용한 activation function은 softmax이다. 즉,  
  $ x_{k}^{(2)}  = f(z_{k}^{(2)}) = \frac{e^{z_{k}^{(2)}}} { \sum e^{z_{i}^{(2)}}} \text{ , Let } S =\sum e^{z_{i}^{(2)}} $  
  여기에서 $x_{k}$의 $z_{k}$에 대한 편미분은 $ i = k $ 인 경우와 $ i \neq k $ 인 경우로 나누어 계산할 수 있다.  
  <br>
  *i)* $ i = k $ 인 경우 <br>
  $ \begin{align} \frac{\partial x_{i}}{\partial z_{k}} &= \frac{e^{z_{i}} S - e^{z_{k}} e^{z_{i}}}{S^2} = \frac{e^{z_{i}} (S - e^{z_{k}})} { S^2}   \\\\ 
  &= \frac{e^z_{i}}{S} \frac{S-e^{z_{k}}}{S} = x_{i} (1-x_{i}) \text{    } \because e^{z_{i}} = e^{z_{k}} \end{align} $  
  <br><br>
  
  *ii)* $ i \neq k $ 인 경우 <br>
  $ \frac{\partial x_{i}}{\partial z_{k}} = \frac{0 \cdot S - e^{z_{i}} e^{z_{k}}} {S^2} = \frac{- e^{z_{i}} e^{z_{k}}} {S \cdot S} = -x_{i} x_{k} $
  
  <br><br>
  
  이제 ⓒ의 식으로 돌아와서 다시 정리하면,  
  $ \begin{align} \nabla_{z_{k}} J &= \sum_{i} \color{red}{\frac{\partial J}{\partial x_{i}}} \color{blue}{\frac{\partial x_{i}}{\partial z_{k}}} \text{, } (k = i) \text{ or } (k \ne i)  \\\\ 
   &= \sum_{i \ne k} \frac{\partial J}{\partial x_{i}} \frac{\partial x_{i}}{\partial z_{k}} + \frac{\partial J}{\partial x_{k}} \frac{\partial x_{k}}{\partial z_{k}}   \\\\ 
   &= \sum_{i \ne k} (- \frac{t_{i}}{x_{i}}) \cdot (-x_{i} x_{k}) + (- \frac{t_{k}}{x_{k}}) \cdot ( x_{k} (1-x_{k}))   \\\\ 
   &= x_{k} \sum_{i \ne k} t_{i} + t_{k} (x_{k}-1) = x_{k} \sum_{i} t_{i} - t_{k}   \\\\ 
   &= x_{k} - t_{k} \text{ ,  } \because \sum t_{i} = 1  \end{align} $ <br><br>
  $ \Large \therefore \frac{\partial J}{\partial z} = x-t $  
  
  <br>
  ⓓ 이제 $w$, $b$에 의한 J의 변화율을 구하기에 앞서 $ z_{k}^{(d)} $의 정의를 Layer $d$에 대하여 일반화하면 다음과 같다.  
  <br>
  $$ \Large z_{i}^{(d)} = \sum_{j=1}^N w_{i,j}^{(d)} x_{j}^{(d-1)} + b_{i}^{(d)} $$
  <br>
  
  아래 ⓔ, ⓕ를 통해 각각의 변화율을 차례로 계산해보자.  
  <br>
  ⓔ $w$의 변화율  
  $ \frac{\partial J}{\partial w_{i,j}^{(d)}} = \color{red}{\frac{\partial J}{\partial z_{i}^{(d)}}} \cdot \color{blue}{\frac{\partial z_{i}^{(d)}} {\partial w_{i,j}^{(d)}}} $ 이고,  
  $ \color{red}{\frac{\partial J}{\partial z_{i}^{(d)}}} $ 는 ⓒ에서 이미 구한 값이다.  
  또한 $ \color{blue}{\frac{\partial z_{i}^{(d)}} {\partial w_{i,j}^{(d)}}} $는 명백히 $ x_{i}^{(d-1)} $ 이므로, 따라서  
  <br>
  $$ \therefore \frac{\partial J}{\partial w_{i,j}^{(d)}} = \frac{\partial J}{\partial z_{i}^{(d)}} \cdot x_{i}^{(d-1)} $$
  <br><br>
  
  ⓕ $b$의 변화율  
  $ \begin{align} \frac{\partial J}{\partial b_{i}^{(d)}} &= \frac{\partial J}{\partial z_{i}^{(d)}} \cdot \frac{\partial z_{i}^{(d)}}{\partial b_{i}^{(d)}}   \\\\ 
  &= \frac{\partial J}{\partial z_{i}^{(d)}} \text{  } (\because definitely \frac{\partial z_{i}^{(d)}}{\partial b_{i}^{(d)}} = 1) \end{align} $ 
  <br><br>
  
  ⓖ 마지막으로 $ \frac{\partial J} {\partial x_{j}^{(d-1)}} $를 구하면, 재귀적으로 ⓑ~ⓖ의 과정을 수행할 수 있다.  
  $ \begin{align} \frac{\partial J} {\partial x_{j}^{(d-1)}} &= \frac{\partial J}{\partial z_{i}^{(d)}} \cdot \frac{\partial z_{i}^{(d)}} {\partial x_{j}^{(d-1)}}   \\\\ 
  &= \frac{\partial J}{\partial z_{i}^{(d)}} \cdot w_{i,j}^{(d)} \end{align} $
  <br>
  여기에서 $ \frac{\partial J}{\partial z_{i}^{(d)}} $는 ⓒ에서 이미 구한 값이므로 $ \frac{\partial J} {\partial x_{j}^{(d-1)}} $의 계산이 가능하다.  
  <br>
  이 예제에서는 softmax-cross entropy로 계산하였으므로, ⓒ에서의  $ \frac{\partial J}{\partial z_{i}^{(d)}} $는 activation function 종류에 따라 별도로 확인해 볼 필요는 있다.  
  
  
----------------------------------------------------------------------------------------------------------------------------------
