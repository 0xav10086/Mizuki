---
title: asyncio-异步编程
published: 2026-02-07
description: 这个教程将会教你如何使用asyncio进行异步编程。
image: ""
tags:
  - tutorial
  - archive
  - python
category: Code
draft: false
lang: ""
---

# 用asyncio进行异步编程
本教程源于[【Py】asyncio：为异步编程而生 | Python 教程 | 并发编程 | 协程](https://www.bilibili.com/video/BV157mFYEEkH/?vd_source=3654085a5ac7355d466d8ad324a1973f)

本教程适用于Python

## 基本概念

主要讲解‘协程’、‘事件循环’和‘任务’这三者

### 协程

- 协程是可挂起和恢复的函数，它允许在执行期间暂停，以便其他任务可以运行。
- 在Python中，协程是使用`async def`定义的，内部可以使用`await`等待其他协程或异步操作。

与线程或进程的不同之处在于，协程在单个线程中并发运行，避免了线程切换的开销。

以下是一些关于协程的关键概念：

- 定义：协程是一种可以暂停和恢复执行的函数。可以将其看作是一个可挂起的函数，当它遇到某些等待操作时（例如I/O），可以暂时挂起，允许其他协程继续执行。

- 非阻塞：协程在等待某些操作完成时不会阻塞主程序的执行，这使得程序可以同时处理多个任务，尤其在处理I/O密集型操作时非常高效。

- `async`和`await`关键字：在Python中，使用`async def`定义协程，使用`await`来调用其他协程。这些关键字使得协程的语法更加清晰易懂。

- 状态保持：协程可以在暂停时保持其状态。当它恢复执行时，可以继续从上次暂停的位置继续运行，这样可以有效管理复杂的异步逻辑。

#### 协程函数和协程对象

```Python
import asyncio

async def coroutine_function():
    return 'This is a coroutine function'

print(coroutine_function())

# output:
# <coroutine object coroutine_function at 0x000001EDFFB15430>
# C:\Users\li\SynologyDrive\code\test.py:6: RuntimeWarning: coroutine 'coroutine_function' was never awaited
# print(coroutine_function())
# RuntimeWarning: Enable tracemalloc to get the object allocation traceback
```
在这个例子中，这个函数的返回值是一个协程对象`coroutine object`

协程函数：

- 协程函数是使用`async def`定义的函数。调用协程函数时，它不会立即执行函数体中的代码，而是返回一个协程对象。
- 协程函数可以包含`await`表达式，用于暂停执行并等待其他协程或异步操作。

协程对象：

- 协程对象是协程函数调用后返回的对象。这个对象可以被事件循环调度并执行。
- 当事件循环运行并调用协程对象时，协程函数的代码才会被执行。

关系：

- 在调用协程函数时，返回的是一个协程对象；真正的代码执行发生在事件循环调度协程对象时。

这种关系与生成器和生成器函数之间的关系相似：

- 生成器函数：使用`def`定义的函数，包含`yield`语句，调用时返回一个生成器对象。
- 生成器对象：在调用生成器函数时返回的对象，实际的代码执行在迭代生成器对象时发生。

### 事件循环

- 事件循环是一个管理协程和任务的机制。它负责调度和执行协程，并在需要时切换控制权。
- 事件循环会不断检查哪些协程可以运行，哪些需要等待，以及何时可以恢复已经挂起的协程。

事件循环是异步编程的核心概念，负责调度和管理所有异步任务的执行。

它的基本功能如下：

- 管理任务：事件循环会监视多个任务，并在任务处于等待状态时，不会阻塞主程序，而是继续处理其他任务。

- 调度执行：当某个任务准备好执行时，事件循环会将其从等待队列中取出并执行。这种机制使得可以在同一线程中并发处理多个任务。

- 处理I/O操作：事件循环特别适合处理I/O密集型操作，如网络请求、文件读取等，因为这些操作通常需要等待，而事件循环可以在等待期间执行其他任务。

- 回调和事件：事件循环允许注册回调函数，当特定事件发生时（例如I/O操作完成），这些回调会被调用。

### 任务

- 任务是事件循环中的一个概念，它表示一个计划在未来某个时刻执行的协程。
- 当协程被调度到事件循环中执行时，它会被封装为一个任务（使用`asyncio.create_task()`等方法创建）。任务会被事件循环管理，并可以在后台运行。

### 关系
- 协程是实际的执行单位，定义了异步操作的逻辑。
- 事件循环是调度这些协程的机制，负责管理它们的执行。
- 任务是事件循环中协程的封装形式，用于跟踪协程的执行状态。任务可以在事件循环中并发执行，并允许事件循环在等待时管理其他协程。

![w-50%](./Resource/20241031000654.webp)
## 异步代码步骤

异步编程只需要做三件事：
- 定义协程函数
- 包装协程为任务
- 建立事件循环

以下是原始代码：

```Python
from time import sleep, perf_counter

def fetch_url(url):
    print('Fetching The URL')
    sleep(1)
    print('Finished Fetching')
    return 'url_content'

def read_file(filename):
    print('Reading File')
    sleep(1)
    print('Finished Reading')
    return 'file_content'

def main():
    url = 'example.com'
    filename = 'example.txt'
    fetch_result = fetch_url(url)
    read_result = read_file(filename)

if __name__ == '__main__':
    start_time = perf_counter()
    main()
    end_time = perf_counter()
    print(f'Execution Time: {end_time - start_time:.2f}')
```

首先修改部分代码，进行定义协程函数的操作（省略库的导入）：

```Python
async def fetch_url(url):
    print('Fetching The URL')
    await asyncio.sleep(1)
    print('Finished Fetching')
    return 'url_content'

async def read_file(filename):
    print('Reading File')
    await asyncio.sleep(1)
    print('Finished Reading')
    return 'file_content'
```

然后进行包装协程为任务：

```Python
async def main():
    url = 'example.com'
    filename = 'example.txt'
    task1 = asyncio.create_task(fetch_url(url))
    task2 = asyncio.create_task(read_file(filename))
    fetch_result = await task1
    read_result = await task2
```

最后建立事件循环：

```Python
if __name__ == '__main__':
    start_time = perf_counter()
    asyncio.run(main())
    end_time = perf_counter()
    print(f'Execution Time: {end_time - start_time:.2f}')
```

`await`的作用：
- 暂停当前协程
- 包装`await`后的协程为任务，若`await`后是一个协程对象时，会直接执行该协程，而不是将其包装为任务
- 获取`await`后的协程结果

完整代码：
```Python
from time import sleep, perf_counter
import asyncio

async def fetch_url(url):
    print('Fetching The URL')
    await asyncio.sleep(1)
    print('Finished Fetching')
    return 'url_content'

async def read_file(filename):
    print('Reading File')
    await asyncio.sleep(1)
    print('Finished Reading')
    return 'file_content'

async def main():
    url = 'example.com'
    filename = 'example.txt'
    task1 = asyncio.create_task(fetch_url(url))
    task2 = asyncio.create_task(read_file(filename))
    fetch_result = await task1
    read_result = await task2

if __name__ == '__main__':
    start_time = perf_counter()
    asyncio.run(main())
    end_time = perf_counter()
    print(f'Execution Time: {end_time - start_time:.2f}')
```
运行结果：

```
Fetching The URL
Reading File
Finished Fetching
Finished Reading
Execution Time: 1.02
```