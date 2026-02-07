---
title: how-to-use-github-actions
published: 2026-01-02
category: git
tags:
  - git
  - howto
  - tutorial
  - archive
summary: ""
---
## 1. GitHub 网页端设置：开启与保护

由于我的仓库是 **Fork** 来的，GitHub 为了安全会默认锁定自动化脚本。

- **启用 Actions**：必须手动进入仓库的 **Actions** 选项卡，点击 **"I understand my workflows, go ahead and enable them"** 才能激活工作流。
    
- **配置加密保险箱 (Secrets)**：
    
    - **路径**：`Settings -> Secrets and variables -> Actions -> Repository secrets -> New repository secrets`。
        
    - **原则**：千万不要在代码中明文写入 IP、用户名或私钥。
        
    - **必填条目**：`SSH_HOST` (IP)、`SSH_USER` (通常为 root)、`SSH_KEY` (完整的 **私钥** 内容)。
        
![w-50%](./Resource/20260129010211.webp)

---

## 2. CI.yml 编写：自动化的指令集

针对“本地构建 `dist`，GitHub 搬运”的需求，核心配置如下：

- **触发条件 (`on`)**：设置为 `push: branches: [master]`，确保你每次 `git push` 都会触发部署。
    
- **搬运工具 (`rsync`)**：推荐使用 `Burnett01/rsync-deployments`，因为它比单纯的 SSH 命令更擅长处理文件夹同步。
    
- **关键代码段**：
    
    
```yml
    with:
      switches: -avzr --delete       # -a 同步属性, --delete 保持目标与源完全一致
      path: dist/                    # 仓库中的源目录
      remote_path: /var/www/blog      # VPS 上的目的地
      remote_host: ${{ secrets.SSH_HOST }}
      remote_user: ${{ secrets.SSH_USER }}
      remote_key: ${{ secrets.SSH_KEY }}
```


---

## 3. VPS 端设置：安全门禁与接收

VPS 是部署的终点，必须配置好接收权限。

- **SSH 密钥对**：
    
    - 使用 `ed25519` 算法生成，更安全高效。
        
    - **公钥** (`.pub`) 必须存放在 VPS 的 `~/.ssh/authorized_keys` 中。
        
    - **私钥** 交给 GitHub Secrets。
        
- **权限规范**（SSH 极其挑剔）：
    
    - `~/.ssh` 目录：`700`。
        
    - `authorized_keys` 文件：`600`。
        
- **环境准备**：
    
    - 手动创建目标目录：`mkdir -p /var/www/blog`。
        
    - 配置 Nginx：将 `root` 指向该目录，并使用 Certbot 开启 HTTPS。详细的配置过程可以参照[[how-to-configuration-HTTPS]]这篇教程。

### 详细的配置流程
以下是详细的配置流程。请按顺序在 VPS 上检查：

#### 1. 检查 VPS 上的权限

SSH 对文件权限极其敏感。如果权限太高，SSH 会出于安全考虑拒绝连接。请在 VPS 终端执行：

```bash
# 生成密钥
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "github-actions-deploy"

# 信任该公钥
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# 确保 .ssh 目录权限为 700
chmod 700 ~/.ssh

# 确保 authorized_keys 权限为 600
chmod 600 ~/.ssh/authorized_keys

# 确保 /root 或 /home/用户 目录没有赋予过高的组权限
chmod 755 /root
```

---

#### 2. 核对公钥内容

请确认公钥是否**完整且正确**地存放在了 `authorized_keys` 文件中：

1. 查看公钥内容：
    
    
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
    
2. 查看 `authorized_keys` 文件：
    
    
    ```bash
    cat ~/.ssh/authorized_keys
    ```
    
    **检查点**：`authorized_keys` 中必须包含一行以 `ssh-ed25519 ... github-actions-deploy` 结尾的内容。如果里面有换行错误或字符缺失，请清空它并重新写入：
    
    
    ```Bash
    echo "这里粘贴你刚才查看到的 id_ed25519.pub 完整内容" > ~/.ssh/authorized_keys
    ```
    

---

#### 3. 检查 root 用户登录限制

如果在 `SSH_USER` 中填的是 `root`，很多 Linux 系统默认是禁止 root 通过密钥远程登录的。

1. 打开 SSH 配置文件：
    
    
    ```Bash
    nano /etc/ssh/sshd_config
    ```
    
2. 查找并确保以下两行没有被注释（前面没有 `#`）且设置正确：
    
    
    ```Plaintext
    PubkeyAuthentication yes
    PermitRootLogin yes
    ```
    
3. 如果修改了文件，记得重启 SSH 服务：
    
    
    ```Bash
    systemctl restart ssh
    ```
    

---

#### 4. 再次核对 GitHub 端的 SSH_KEY

请再次确认你在 GitHub **Secrets** 中填入的是 **私钥**（即没有 `.pub` 后缀的那个文件）。

- **错误做法**：把 `id_ed25519.pub`（公钥）填到了 GitHub。
    
- **正确做法**：把 `id_ed25519`（内容以 `-----BEGIN OPENSSH PRIVATE KEY-----` 开头）填到了 GitHub。

---

## 4. 验证工作是否修复

你可以点击 GitHub 上的 **"Run workflow"**。如果权限配置正确，你会看到日志显示：
- **绿色对勾 (✔️)**：恭喜，部署成功。
    
- **红色叉号 (❌)**：出错了。点击进去看具体的错误日志（比如 `Permission denied` 或者 `No such file or directory`）。

![w-50%](./Resource/20260129010902.webp)

当在 Actions 页面看到 **红叉 (❌)** 时，可以根据日志快速定位：

| **错误提示**                           | **原因**             | **解决方法**                                          |
| ---------------------------------- | ------------------ | ------------------------------------------------- |
| **`Name does not resolve`**        | `remote_host` 变量为空 | 检查 Secrets 里的变量名是否拼写正确。                           |
| **`Permission denied (password)`** | VPS 拒绝了密钥          | 1. 检查公钥是否在 `authorized_keys` 中；2. 检查 `.ssh` 目录权限。 |
| **`No such file or directory`**    | VPS 路径不存在          | 在 VPS 上手动执行 `mkdir -p` 创建目标文件夹。                   |
| **`Certbot: DNS check failed`**    | 域名未解析              | 在 Cloudflare 添加根域名（@）的 A 记录 。                     |

---

## 5. 终极工作流

以后更新博客只需要：

1. **本地**：写文章。
    
2. **本地**：`pnpm build`（生成最新的 `dist`）。
    
3. **本地**：`git add .` -> `git commit` -> `git push`。
    
4. **云端**：GitHub 自动把文件推送到 VPS。
    
5. **结果**：刷新 `0xav10086.space` 即可看到更新。