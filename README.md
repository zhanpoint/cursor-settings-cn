# Cursor 设置页汉化

用于汉化 Cursor 设置页、相关弹窗及加载/失败提示，支持一键汉化和恢复原版。

## 使用方法

### 1. 准备环境

- Windows 系统
- Cursor 安装在 `D:\cursor`
- 已安装 [Node.js](https://nodejs.org/zh-cn)

### 2. 下载项目

点击 GitHub 页面右上角的 **Code → Download ZIP**，解压后保持下面 3 个文件在同一文件夹：

- `一键汉化Cursor.cmd`
- `apply.cjs`
- `汉化资源.json`

### 3. 一键汉化

双击 `一键汉化Cursor.cmd`。

脚本会自动：

1. 备份 Cursor 原始文件
2. 汉化设置页
3. 重启 Cursor

Cursor 更新后如果汉化失效，重新运行一次即可。

## 恢复原版

在项目文件夹的地址栏输入 `cmd` 并回车，然后运行：

```bat
一键汉化Cursor.cmd --restore
```

## 仅检查，不修改

想先确认可汉化内容时运行：

```bat
一键汉化Cursor.cmd --preview
```

预览不会关闭 Cursor，也不会修改任何文件。