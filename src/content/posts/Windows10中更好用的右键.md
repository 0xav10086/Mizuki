---
title: Windows10中更好用的右键
published: 2026-03-09
description: 这个教程将会教你如何在 Windows10 中拥有更多功能的右键。
image: “”
tags:
  - tutorial
  - howto
  - archive
  - Windows
category: software
draft: false
lang: ""
---
# Windows 10 右键菜单终极优化与现代化指南

本指南旨在从一个纯净的 Windows 10 系统开始，通过包管理器（Scoop）和强大的右键定制工具（Nilesoft Shell），打造一个极速、无广告、纯粹且高度定制化的右键菜单。不仅去除了原生菜单的臃肿，还完美集成了开发者常用的 Windows Terminal 和 7-Zip。

>本文档关于终端的后续配置可见[我的wezterm配置](./我的wezterm配置.html)
## 第一阶段：基础环境搭建 (安装 Scoop)

对于刚装好 Windows 10 的系统，我们首先需要引入现代化的命令行包管理器 **Scoop**，这将极大地简化后续软件的安装和路径配置。

1. **开启脚本执行权限**：
    
    右键点击开始菜单，选择“Windows PowerShell (管理员)”，执行以下命令：
    
    ```PowerShell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
    
    _输入 `Y` 确认。_
    
2. **安装 Scoop**：
    
    在 PowerShell 中运行官方安装脚本：
    
    ```PowerShell
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    ```
    
3. **添加扩展软件仓库 (Buckets)**：
    
    Nilesoft Shell 等工具存在于扩展库中，我们需要添加 `extras` 库：
    
    ```PowerShell
    scoop bucket add extras
    ```
    

## 第二阶段：核心软件安装

利用 Scoop，我们可以一行命令把需要的终端、解压软件和右键菜单核心程序全部装好。这些软件会统一安装在 `%USERPROFILE%\scoop\apps\` 目录下，方便后续在右键菜单中绝对定位。

打开 PowerShell，执行：
```PowerShell
scoop install 7zip windows-terminal pwsh nilesoft-shell
```

_(注：这里安装了 7-Zip、Windows Terminal、PowerShell 7 以及核心的 Nilesoft Shell)_

## 第三阶段：注入核心配置文件

软件安装完毕后，我们需要修改 Nilesoft Shell 的配置文件。

配置文件的根目录位于：`~\scoop\apps\nilesoft-shell\current\`。你需要修改或替换以下三个核心文件。

### 1. 主配置文件：`shell.nss`

这个文件是右键菜单的“总控中心”。我们在这里引入基础设置、移除重复项，并编写了完美的 7-Zip 右键解压缩逻辑。

使用文本编辑器打开 `~\scoop\apps\nilesoft-shell\current\shell.nss`，替换为以下内容：

```nss
settings
{
	priority=1
	exclude.where = !process.is_explorer
	showdelay = 200
	// Options to allow modification of system items
	modify.remove.duplicate=1
	tip.enabled=true
}

import 'imports/theme.nss'
import 'imports/images.nss'

import 'imports/modify.nss'

menu(mode="multiple" title="Pin/Unpin" image=icon.pin)
{
}

menu(mode="multiple" title=title.more_options image=icon.more_options)
{
}

import 'imports/terminal.nss'
import 'imports/file-manage.nss'
import 'imports/develop.nss'
import 'imports/goto.nss'
import 'imports/taskbar.nss'

menu(where=sel.count title='7-Zip' image='%USERPROFILE%\scoop\apps\7zip\current\7zFM.exe')
{
    item(title='Open 7-Zip' cmd='%USERPROFILE%\scoop\apps\7zip\current\7zFM.exe' args='@sel.path')

    sep

    item(title='Add to archive...' cmd='%USERPROFILE%\scoop\apps\7zip\current\7zG.exe' args='a')

    item(title='Compress to 7z' cmd='%USERPROFILE%\scoop\apps\7zip\current\7z.exe' args='a "@sel.name".7z "@sel.path"')

    item(title='Compress to zip' cmd='%USERPROFILE%\scoop\apps\7zip\current\7z.exe' args='a -tzip "@sel.name".zip "@sel.path"')
}
```

(说明：底部自定义的 7-Zip 菜单精准指向了 Scoop 的安装路径，彻底替代了原生右键中杂乱的解压选项 。)

### 2. 视觉主题配置：`theme.nss`

为了符合 Windows 10 经典的直角与不透明审美，我们需要关闭默认的毛玻璃效果。

打开 `~\scoop\apps\nilesoft-shell\current\imports\theme.nss`，替换为以下内容：

```nss
theme
{
	name="classic"
	dark=auto
	background
	{
		color=auto
		opacity=100
		effect=0
	}
	image.align=2
}
```

(说明：`opacity=100` 和 `effect=0` 禁用了透明与模糊特效，确保菜单呈现纯粹的 Win10 经典质感 。)

### 3. 终端调用配置：`terminal.nss`

原生菜单的“在此处打开 PowerShell”往往存在权限或路径解析问题。我们对其进行了重构，并加入了 Scoop 版 Windows Terminal 的绝对路径支持。

打开 `~\scoop\apps\nilesoft-shell\current\imports\terminal.nss`，替换为以下内容：

```nss
menu(type='*' where=(sel.count or wnd.is_taskbar or wnd.is_edit) title=title.terminal sep='top' image=icon.run_with_powershell)
{
        $tip_run_admin=["\xE1A7 Press SHIFT key to run " + this.title + " as administrator", tip.warning, 1.0]
        $has_admin=key.shift() or key.rbutton()

        item(title=title.command_prompt tip=tip_run_admin admin=has_admin image cmd='cmd.exe' args='/K TITLE Command Prompt &ver& PUSHD "@sel.dir"')
        item(title=title.windows_powershell admin=has_admin tip=tip_run_admin image cmd='powershell.exe' args='-noexit -command Set-Location -Path "@sel.dir\."')
    // item(where=package.exists("WindowsTerminal") title=title.Windows_Terminal tip=tip_run_admin admin=has_admin image='@package.path("WindowsTerminal")\WindowsTerminal.exe' cmd='wt.exe' arg='-d "@sel.path\."')
        item(title='Windows Terminal' tip=tip_run_admin admin=has_admin image='%USERPROFILE%\scoop\apps\windows-terminal\current\wt.exe' cmd='%USERPROFILE%\scoop\apps\windows-terminal\current\wt.exe' args='-d "@sel.dir\."')
    item(title='WezTerm' tip=tip_run_admin admin=has_admin image='%USERPROFILE%\scoop\apps\wezterm\current\wezterm-gui.exe' cmd='%USERPROFILE%\scoop\apps\wezterm\current\wezterm-gui.exe' args='start --cwd "@sel.dir\."')
}
```

(说明：这里注释掉了原版通过 UWP 包检测的逻辑，改为直接硬编码指向 Scoop 安装的 `wt.exe` 路径，保证了百分百的触发成功率 。)

## 第四阶段：注册与生效

配置文件修改完毕后，最后一步是将 Nilesoft Shell 注册到系统中。

1. 打开 PowerShell，进入工具目录：
    
    ```PowerShell
    cd ~/scoop/apps/nilesoft-shell/current
    ```
    
1. 运行注册安装程序（弹出的 UAC 提示请点击“是”）：
    
    ```PowerShell
    .\shell.exe -install
    ```
    
2. 在弹出的提示框中确认重启资源管理器 (Restart Windows Explorer)。
    

**至此，你的 Windows 10 右键菜单已成功脱胎换骨！** 随便在一个文件夹空白处点击右键，享受干净、快速且完全属于你的定制菜单吧。