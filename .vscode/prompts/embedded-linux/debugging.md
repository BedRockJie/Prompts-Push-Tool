# 调试 Prompt / Debugging Prompts

用于分析 dmesg、gdb、死锁、内存泄漏等问题。

---

## 场景：分析 dmesg / 内核日志定位问题 / Scenario: Analyze dmesg / kernel log

**中文 Prompt：**

你现在是一名资深 Linux 内核调试工程师，请帮我分析下面的 dmesg / 内核日志，目标是：

1. 归纳出最核心的错误信息和调用栈
2. 判断问题大致属于哪一类（驱动、内存、文件系统、锁、设备树配置错误等）
3. 给出可能的根本原因假设（可以有多个），并按可能性大致排序
4. 针对每个假设，给出下一步建议的排查步骤（例如增加哪些日志、打开哪些内核配置、使用哪些工具）

下面是日志（可截取关键部分）：

<在这里粘贴 dmesg / 日志>

**English Prompt:**

You are a senior Linux kernel debugging engineer. Please analyze the following dmesg / kernel logs with these goals:

1. Summarize the key error messages and call stacks
2. Classify the problem (driver, memory, filesystem, locking, device tree misconfiguration, etc.)
3. Propose several possible root causes, roughly ranked by likelihood
4. For each hypothesis, suggest next debugging steps (e.g., extra logging, enabling specific kernel configs, using particular tools)

Here are the logs (you can paste only the relevant part):

<paste dmesg/logs here>

---

## 场景：分析内核 oops / panic / call trace / Scenario: Analyze kernel oops/panic

**中文 Prompt：**

请以 Linux 内核专家身份，分析下面的 oops/panic/call trace，帮助我：

1. 找出触发异常的关键函数和代码路径
2. 判断这更可能是空指针解引用、越界访问、use-after-free，还是其他类型的问题
3. 结合堆栈信息，推断可能的错误使用方式（例如锁使用顺序错误、错误的 API 调用参数等）
4. 给出建议的修复方向和需要重点检查的代码位置（函数/模块级别即可）

下面是 oops/panic 信息：

<在这里粘贴 oops/panic>

**English Prompt:**

Act as a Linux kernel expert and analyze the following oops/panic/call trace. Please:

1. Identify the key functions and code path that triggered the exception
2. Determine whether it is more likely a NULL pointer dereference, out-of-bounds access, use-after-free, or something else
3. Based on the stack trace, infer possible misuse patterns (e.g., wrong lock acquisition order, wrong API parameters)
4. Suggest directions for fixing the issue and which parts of the code (functions/modules) should be reviewed first

Here is the oops/panic info:

<paste the oops/panic here>