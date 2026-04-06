---
title: 我的wezterm配置
published: 2026-03-25
description: 这个教程将会教你如何让Windows的终端更好用。
image: '""'
tags:
  - Windows
  - archive
  - howto
  - bash
category: Windows
draft: false
pinned: false
comment: true
lang: zh-CN
---
# 我的 WezTerm 配置归档

>本文档的内容与 [Windows10中更好用的右键](/posts/windows10%E4%B8%AD%E6%9B%B4%E5%A5%BD%E7%94%A8%E7%9A%84%E5%8F%B3%E9%94%AE/)已相互关联

## 一、 核心概念：终端模拟器与 Shell 的关系

要打造一个完美的命令行环境，首先要明确“壳”（终端）与“大脑”（Shell）的分工。

### 1. 终端模拟器 (Terminal Emulator) —— 舞台与外壳

- **代表：** WezTerm, Windows Terminal, Alacritty。
    
- **职责：** 纯粹的 UI 容器。它不负责执行任何系统命令，只负责**接收键盘输入**、**渲染字体（如 Nerd Fonts 图标）**、**绘制颜色主题（如 Catppuccin）** 以及提供分屏、多标签页等界面交互功能。
    

### 2. Shell (命令行解释器) —— 大脑与执行者

它们运行在终端模拟器内部，负责解析输入的命令并向操作系统下达指令。

- **CMD (Command Prompt)：** 微软的 DOS 时代遗留产物，语法古老，仅用于向下兼容老旧的 `.bat` 批处理脚本，日常开发已极少作为主力。
    
- **PowerShell 5 (Windows PowerShell)：** Windows 10/11 系统自带的默认版本（通常为蓝底白字）。基于较老的 .NET Framework，与 Windows 深度绑定，但官方已停止为其开发新功能。
    
- **PowerShell 7 (pwsh / PowerShell Core)：** 微软开源的新世代跨平台 Shell。基于现代 .NET 开发，性能更强，语法更现代（支持三元运算符等），且跨平台一致。其执行文件名为 `pwsh.exe`。
    

## 二、 配置方式指南

虽然它们配合工作，但配置文件是相互独立的：

- **WezTerm 的配置：**
    
    - **位置：** 用户主目录下的 `.wezterm.lua` (例如 `C:\Users\用户名\.wezterm.lua`)。
        
    - **特点：** 使用 Lua 语言编写，保存文件后 WezTerm 会**自动热重载**，立即生效。决定了字体、字号、颜色主题和窗口外观。
        
- **Shell (pwsh) 的配置：**
    
    - **位置：** 通常位于 `~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`。
        
    - **配置方法：** 在 pwsh 中直接输入 `nvim $PROFILE` 即可编辑。
        
    - **特点：** 使用 PowerShell 语法编写，需要重新打开终端或运行 `. $PROFILE` 才能生效。负责配置别名（Aliases）、启动 Oh My Posh 提示符渲染、运行 Fastfetch 等环境变量与启动项。
        
- **CMD 的配置：**
    
    - 通常通过修改注册表或快捷方式属性来进行极其有限的外观调整，在现代开发流中通常不进行深度配置。
        

## 三、 我的最终选择与配置文件

**我的组合方案：WezTerm + PowerShell 7 (pwsh)**

这套组合将 WezTerm 强大的 GPU 渲染能力、丰富的自定义外观与 pwsh 现代化的跨平台脚本能力完美结合。搭配 JetBrains Mono 字体与 Catppuccin 莫兰迪色系，实现了高信噪比、护眼且极客的沉浸式体验。

### 1. WezTerm 配置 (`~/.wezterm.lua`)

包含了字体连字、暗色主题以及无边框沉浸模式的设定。

```Lua
local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- 1. 核心运行环境
-- 设置默认启动 PowerShell 7
config.default_prog = { "pwsh.exe"}

-- 2. 字体与渲染
-- 使用支持编程连字和内置图标的 JetBrains Mono
config.font = wezterm.font("JetBrainsMono Nerd Font")
config.font_size = 12.0

-- 3. 颜色主题
-- 采用柔和护眼的 Catppuccin Mocha 莫兰迪暗色系
config.color_scheme = "Catppuccin Mocha"

-- 4. 窗口外观 (无边框沉浸模式)
-- 隐藏系统自带的标题栏，保留拖拽边缘调整大小的能力
config.window_decorations = "RESIZE"
-- 增加内边距，防止文字紧贴屏幕边缘
config.window_padding = {
  left = '1cell',
  right = '1cell',
  top = '0.5cell',
  bottom = '0.5cell',
}

return config
```

### 2. PowerShell 配置 (`$PROFILE`)

统一了终端内部的提示符排版，并复刻了 Linux 风格的包管理习惯。

```PowerShell
# ==========================================
# 1. 别名与快捷命令
# ==========================================
function p { scoop @args }             # 简化包管理命令
Set-Alias -Name vi -Value nvim         # 肌肉记忆适配
Set-Alias -Name sudo -Value gsudo      # 权限提升

# ==========================================
# 2. 提示符美化 (Oh My Posh)
# ==========================================
# 使用与 WezTerm 颜色完美契合的 catppuccin_mocha 主题
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\catppuccin_mocha.omp.json" | Invoke-Expression

# ==========================================
# 3. 终端扩展模块
# ==========================================
# 为 ls/dir 命令添加彩色文件图标
Import-Module Terminal-Icons

# 每次打开终端时输出系统信息面板
fastfetch
```

## 四、 WezTerm 进阶玩法探索 (备忘)

除了外观调整和快捷键分屏外，WezTerm 还有许多强大的内置特性，日后可以逐步探索：

### 1. Launch Menu (多环境快速启动菜单)

如果系统中同时存在多种开发环境（如 pwsh、MSYS2、WSL、连接服务器的 SSH），可以在 Lua 中配置 `launch_menu`。配置后，通过右上角的加号按钮或快捷键，可以弹出一个菜单，一键启动并进入纯净的特定环境，而无需在不同终端软件间来回切换。

### 2. 自定义现代标签页栏 (Custom Tab Bar)

WezTerm 允许通过 Lua 脚本彻底重绘顶部的标签页栏（Tab Bar）。你可以隐藏默认的复古标签，将其改为类似现代浏览器（如 Edge 或 Chrome）的圆角样式，或者在标签页的最右侧实时显示当前的系统时间、笔记本电量、甚至 CPU 占用率，打造一个全能的状态栏。