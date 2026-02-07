---
title: how-to-use-office-in-arch
published: 2026-02-06
description: 这个教程将会教你如何在 Arch Linux 中完美驱动 Microsoft Office。
image: ""
tags:
  - tutorial
  - howto
  - archive
  - Windows
  - Office
category: Games
draft: false
lang: ""
---

这份指南旨在为那些在 Arch Linux (Hyprland) 环境下挣扎于办公软件兼容性的开发者提供一套“终极方案”。通过 WinApps，我们可以让 Microsoft Word 像原生应用一样漂浮在 Linux 桌面上。

---

# 深度指南：在 Arch Linux 中完美驱动 Microsoft Office (WinApps 篇)

在 Linux 生态中，虽然有 LibreOffice 和 OnlyOffice，但在复杂的学术排版或企业协作中，原生 Microsoft Word 依然是不可替代的。本文将记录如何利用 KVM 虚拟化与 RDP 协议，在 Arch Linux 上优雅地运行 Office 套件。

---

## 一、 虚拟化后端：构建稳固的底座

首先，我们需要在 Arch Linux 上搭建高性能的 KVM/Libvirt 环境。

### 1. 安装核心组件

```bash
sudo pacman -S qemu-full virt-manager libvirt edk2-ovmf dnsmasq freerdp
```
**组件功能说明：**

- **`qemu-full`**：核心模拟器，负责虚拟化硬件。
    
- **`virt-manager`**：图形化界面，让你像操作普通软件一样管理虚拟机。
    
- **`libvirt`**：管理虚拟机的后台守护进程。
    
- **`edk2-ovmf`**：让虚拟机支持 UEFI 启动（现代 Windows 必需）。
    
- **`dnsmasq`**：为虚拟机提供网络地址分配（DHCP）。
    
- **`freerdp`**：远程桌面协议客户端，负责将 Word 窗口“拉”到 Linux 桌面。

### 2. 权限与网络持久化

为了避免每次操作虚拟机都要输入 `sudo`，我们需要将当前用户加入相关的权限组，并确保虚拟网络随系统自启：

- **权限分配**：
	
    ```bash
    sudo usermod -aG libvirt,kvm $(whoami)
    ```
    
    _注：执行此命令后，必须重启电脑或注销登录才能生效。_
    
- **网络自启动设置**：
    
    `libvirt` 默认的 NAT 网络（default）通常是关闭的。
	
    ```bash
    sudo virsh net-start default        # 立即启动
    sudo virsh net-autostart default   # 设置开机自启
    ```
    
- **虚拟机自启动设置**：
    
    如果你希望开机即享 Word 的秒开体验，可以让虚拟机后台静默启动：
    
    ```bash
    sudo virsh autostart <你的虚拟机名称>  # 例如: win10
    ```
    
    _若要关闭自启，只需执行 `sudo virsh autostart --disable <名称>`。_
### 3 下载 WinApps 源码

由于 Arch Linux 的 AUR 仓库包名可能变动或版本滞后，推荐直接通过 GitHub 克隆最新源码以获得最佳兼容性：

- **安装必要依赖**： WinApps 核心依赖 `FreeRDP` 进行窗口渲染，同时需要 `libnotify` 处理系统通知。
    
    ```bash
    sudo pacman -S freerdp libnotify binutils
    ```
    
- **克隆仓库**： 在你的家目录下执行克隆命令，这将创建一个 `winapps` 文件夹，其中包含后续步骤所需的 `install`、`oem` 目录和 `setup.sh` 脚本。
	
    ```bash
    git clone https://github.com/winapps-org/winapps.git
    ```
    
---

## 二、Windows 虚拟机配置

### 1. 获取 Windows 10 ISO 镜像

推荐使用 **Windows 10 LTSC** 版本（精简、稳定、无广告）。

- **官方途径**：访问微软官网 [Windows 10 下载页](https://www.microsoft.com/zh-cn/software-download/windows10)。
    
- **镜像站推荐**：搜索“I Tell You”或使用知名的镜像收录站下载 `LTSC 2021` 版本的 ISO 文件。
    

### 2. 使用 virt-manager 创建虚拟机

1. 打开 **虚拟系统管理器 (virt-manager)**。
    
2. 点击 **“新建虚拟机”** -> 选择 **“本地安装介质”**。
    
3. **选择镜像**：浏览并选中你下载的 `.iso` 文件。
    
4. **配置硬件**：建议分配 **4GB 内存** 和 **4 核 CPU**，存储大小最小设置为30G，可以保证在安装完word、excel、ppt后还有大概3G的存储空间。
    
5. **自定义安装前勾选**：在最后一步勾选 **“在安装前自定义配置”**。
    
    - 检查 **固件** 是否为 `UEFI`。
        
    - 检查 **NIC (网络)** 是否连接到 `Virtual network 'default' : NAT`。
        

### 3. Windows 内部核心设置

进入 Windows 桌面后，必须完成以下三项安装以配合 WinApps。

#### **A. 安装 spice-guest-tools (解决剪贴板与流畅度)**

1. 在 Windows 浏览器中下载：[spice-guest-tools-latest.exe](https://www.google.com/search?q=https://www.spice-space.org/download/windows/spice-guest-tools/spice-guest-tools-latest.exe)。
    
2. 以管理员身份运行，一路点击安装并信任驱动。
    
3. **重启 Windows**。
    
![w-50%](./Resource/20260206211143.webp)
#### **B. 注入 RDPApps.reg (开启远程应用模式)**

1. 从 Arch 下载的 `winapps/oem` 目录下找到 `RDPApps.reg` 复制到虚拟机中。
    
2. **双击运行**并确认导入。它会修改注册表，允许 Word 以独立窗口模式运行。
    

#### **C. 运行 ExtractPrograms.ps1 (应用路径提取)**

1. 进入虚拟机中解压的 `winapps/install` 目录。
    
2. 右键点击 `ExtractPrograms.ps1`，选择 **“使用 PowerShell 运行”**。
	  
3. 该脚本会扫描你安装好的 Office 路径（如用 Office Tool Plus 安装的套件），为 Linux 端提供调用地址。

#### **D 使用 Office Tool Plus 安装 Office 套件**

为了获得最纯净的 Office 安装体验，推荐使用 Office Tool Plus (OTP)。

1. **下载工具**：访问 [officetool.plus](https://www.officetool.plus/) 下载并运行。
    
2. **部署套件**：
    
    - 点击 **“部署”** -> **“添加产品”**。
        
    - 产品选择 `Microsoft 365 企业应用版 - O364ProPlusRetail`，应用程序按需选择，这里我只选择了word、excel、ppt。
        
    - **应用程序**：仅勾选你需要的组件（如 Word, Excel, PowerPoint），减少空间占用。
        
    - **设置**：架构选 `x64`，更新通道选 `半年度企业通道`，语言选 `简体中文`。
        
    - 点击 **“开始部署”** 等待安装完成。
        
3. **激活软件**：
        
    - 在 **“许可证管理”** 中安装`office Mondo 2016 批量许可证`。
	    
    - 在 **“KMS管理”** 中输入`kms.loli.beer`，并设置主机。
	    
	- 点击 **“激活”** 选项卡。
	    
	- 登录你的微软账号即可完成自动激活。

这是实现 **Linux 与 Windows 剪贴板无缝同步**、**鼠标流畅切换**以及**分辨率自适应**的核心步骤。

---

## 三、 WinApps 配置详解

WinApps 的核心在于 `~/.config/winapps/winapps.conf`。

### 配置模板

```toml
VM_NAME="win10"               # 必须与 virt-manager 中的虚拟机名一致
RDP_USER="你的Windows用户名"
RDP_PASS="你的Windows密码"
RDP_IP="192.168.122.75"       # 在 Windows 中输入 ipconfig 获取
WAFLAVOR="libvirt"            # 强制使用本地 KVM 模式
MULTIMON="true"               # 多显示器支持开关
RDP_FLAGS="/cert:ignore /gfx:avc420 /network:auto /drive:home,/home/av10086 /dynamic-resolution +clipboard /multimon:force"
```
### 我的配置
![w-50%](./Resource/20260206211103.webp)
![w-50%](./Resource/20260206211407.webp)
```bash
❯ cat ~/.config/winapps/winapps.conf
#VM_NAME="DESKTOP-JC29B84"
VM_NAME="win10"
RDP_USER="vir-0xav10086"
RDP_PASS="abcd"
RDP_IP="192.168.122.75"
WAFLAVOR="libvirt"
RDP_SCALE=100
MULTIMON="true"
DEBUG="true"
RDP_FLAGS="/cert:ignore /gfx:avc420 /network:auto /drive:home,/home/av10086 /dynamic-resolution +clipboard /multimon:force"
```
### 关键参数解析：

- **MULTIMON (Multi-Monitor)**：
    
    - **为什么设为 `true`？**：它允许 RDP 协议识别并利用 Linux 端的多个物理显示器。
        
    - **什么时候开启？**：当你的工作流涉及多显示器（如笔记本+外接显示器）时必须开启。开启后，你可以将 Word 窗口自由地从主屏拖动到副屏，而不会出现渲染黑屏或坐标偏移。
        
- **RDP_FLAGS**：
    
    - `/dynamic-resolution`：允许窗口在拉伸时自动调整内部 Windows 的分辨率。
        
    - `/drive:home,...`：将你的 Linux 家目录映射为 Windows 的 `Z:` 盘，实现文件互通。
        
    - `/multimon:force`：强制 FreeRDP 使用全显示器布局，解决垂直堆叠显示器的渲染难题。
        
---

## 四、 为什么 Hyprland 适配不是必须的？

在早期的 WinApps 教程中，通常会建议针对平铺管理器（如 Hyprland）编写大量的 `windowrule`。

**现实情况是：** 随着 `xfreerdp` 版本的更新以及我们在 `winapps.conf` 中加入了 `/dynamic-resolution` 和 `/multimon:force` 参数，现代的 RDP 客户端已经能很好地处理窗口坐标。只要在 Windows 端运行了 `ExtractPrograms.ps1` 和 `RDPApps.reg`，Word 就会以真正的“独立窗口”模式运行，Hyprland 会将其识别为一个标准的 XWayland 窗口进行浮动处理，不再需要额外的语法补丁。

---

## 五、 最终上线：安装与集成

在完成上述所有配置并确保虚拟机处于“注销”状态后，在 Arch 终端执行：

```bash
cd ~/path/to/winapps
./setup.sh --user
```

安装完成后，你可以在 `rofi`、`wofi` 或任何应用启动器中直接搜索 **"Word"**。

---
## 六、 自动化管理命令总结

为了让环境更“傻瓜化”，你需要掌握以下 `virsh` 命令。

| **需求**        | **命令**                                 |
| ------------- | -------------------------------------- |
| **开机自动运行虚拟机** | `sudo virsh autostart win10`           |
| **关闭虚拟机自动启动** | `sudo virsh autostart --disable win10` |
| **手动强制开启虚拟机** | `virsh start win10`                    |
| **优雅地关闭虚拟机**  | `virsh shutdown win10`                 |
| **查看虚拟机运行状态** | `virsh list --all`                     |

## 小提示：关于文件互通
WinApps 的文件互通功能是建立在 **RDP（远程桌面协议）** 基础上的，而不是 KVM 虚拟硬件本身。

---

### 1. 为什么你在当前窗口找不到“Linux 文件夹”？

- **控制台视图（你现在的画面）：** 你现在看到的是 Windows 系统的“物理屏幕”。在 Windows 看来，它只是运行在一台没有连接任何外部驱动器的电脑上。
    
- **RDP 映射（WinApps 的工作方式）：** 当你通过 `rofi` 启动 Word 时，`xfreerdp` 会带着 `/drive:home,/home/av10086` 这个参数连接 Windows。这时，RDP 协议会像“插 U 盘”一样，把你的 Linux 家目录临时挂载为一个**网络驱动器**。
    

---

### 2. 你该去哪里找到互通的文件？

你不需要在 `virt-manager` 的窗口里找。请按照以下步骤操作：

1. **启动 Word**：通过 `rofi` 或终端启动 Word。
    
2. **点击“打开”**：在 Word 的起始界面点击 **“打开 (Open)”** -> **“这台电脑 (This PC)”**。
    
3. **寻找网络位置**：在弹出的文件浏览器里，除了 `C:` 盘，你应该能看到一个名为 **`home 上的 av10086`** 的磁盘（通常带有网络驱动器的图标）。
    

---

### 3. 如何在 Windows “此电脑”中永久看到它？

如果你希望在 Windows 的资源管理器里直接管理 Linux 文件，你有两种方法：

#### **方法 A：通过 WinApps 的 RDP 链接启动（推荐）**

如果你通过终端手动测试一次连接，这个文件夹就会出现：

```bash
xfreerdp3 /u:"vir-0xav10086" /p:"abcd" /v:192.168.122.75 /cert:ignore /drive:home,/home/av10086
```

连接成功后，在弹出的 Windows 窗口里打开“此电脑”，你会发现多了一个 **`home (\\tsclient)`** 驱动器。

#### **方法 B：在虚拟机里通过网络访问**

即使不通过 RDP，Windows 和 Arch 其实也在同一个虚拟局域网里：

1. 在 Windows 资源管理器的地址栏输入：`\\192.168.122.1`（这是 Arch 在虚拟网桥中的默认 IP）。
    
2. 如果你在 Arch 上配置了 **Samba** 服务，这里就会出现文件夹。 _注：WinApps 默认不推荐这种方法，因为它比 RDP 映射要复杂得多。_
    

---

### 4. 一个让体验更“优雅”的小贴士

既然你已经配置好了 WinApps，最优雅的文件互通方式其实是**文件关联**：

1. 在 Arch 的文件管理器（如 Dolphin 或 Thunar）中，右键点击一个 `.docx` 文件。
    
2. 选择 **“属性”** -> **“打开方式”** -> **“Word”**。
    
3. 以后你只需要在 Arch 里双击文档，它就会自动“穿越”到虚拟机里被 Word 打开，你根本不需要去 Windows 里翻找文件夹。
    

---

**总结：** 你没看到文件夹，是因为你正在看“裸机”的显示器。**请尝试通过 `rofi` 打开 Word，然后在 Word 的“打开”菜单里看看，那个 `home` 驱动器是不是已经在那儿等着你了？**
### 结语

这套方案通过 libvirt 保证了性能，通过 Spice 保证了交互，通过 WinApps 保证了体验。对于 Arch 用户来说，这或许是目前在 Linux 下处理 `.docx` 文档最专业、最“优雅”的方式。
![w-50%](./Resource/20260206212013.webp)
# 参考资料
[【Office】Office Tool Plus安装激活Office保姆级使用教程](https://www.bilibili.com/video/BV1f1421Q7Li/)
[Windows 10 下载页](https://www.microsoft.com/zh-cn/software-download/windows10)