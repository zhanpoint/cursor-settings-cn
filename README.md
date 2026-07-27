# Cursor 设置页汉化

用于汉化 Cursor 设置页、相关弹窗及加载/失败提示，支持一键汉化和恢复原版。

## 使用方法

### 1. 准备环境

- Windows 系统
- 已安装 [Node.js](https://nodejs.org/zh-cn)
- 知道 Cursor 的安装目录

不知道安装目录时，可以右键 Cursor 快捷方式，选择“属性”，在“目标”中查看 `Cursor.exe` 所在文件夹。

### 2. 下载项目

点击 GitHub 页面右上角的 **Code → Download ZIP**，解压后保持下面 3 个文件在同一文件夹：

- `一键汉化Cursor.cmd`
- `apply.cjs`
- `汉化资源.json`

### 3. 一键汉化

在项目文件夹的地址栏输入 `cmd` 并回车，然后运行：

```bat
一键汉化Cursor.cmd "Cursor安装目录"
```

例如：

```bat
一键汉化Cursor.cmd "D:\cursor"
```

脚本会备份原始文件、汉化设置页并重启 Cursor。Cursor 更新后如果汉化失效，重新运行一次即可。

## 恢复原版

```bat
一键汉化Cursor.cmd "Cursor安装目录" --restore
```

## 仅检查，不修改

```bat
一键汉化Cursor.cmd "Cursor安装目录" --preview
```

预览不会关闭 Cursor，也不会修改任何文件。
