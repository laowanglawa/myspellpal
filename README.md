# word_spelling

这是一个专注于英语单词学习和记忆的网站应用，提供单词默写、学习进度跟踪和个性化学习体验。

## 项目功能

- **用户系统**：注册、登录、用户信息管理
- **单词学习**：提供不同难度级别的单词（简单、中等、困难）
- **进度跟踪**：记录用户的单词掌握程度、正确率和练习历史
- **个性化学习**：根据用户的学习情况推荐单词
- **单词详情**：提供单词定义、例句、发音等详细信息

## 技术栈

### 后端
- Python 3.x
- Flask - Web框架
- SQLAlchemy - ORM数据库工具
- Flask-CORS - 跨域资源共享
- python-dotenv - 环境变量管理
- passlib - 密码哈希处理

### 前端
- HTML5
- Tailwind CSS - UI框架
- Font Awesome - 图标库
- JavaScript (原生)

### 数据库
- SQLite (默认)，可配置为其他数据库

## 项目结构

```
├── backend/                  # 后端应用
│   ├── app.py                # Flask应用入口
│   ├── .env                  # 环境变量配置
│   ├── models/               # 数据库模型
│   │   ├── user.py           # 用户模型
│   │   ├── word.py           # 单词模型
│   │   └── user_word_progress.py # 用户学习进度模型
│   ├── routes/               # API路由
│   │   ├── auth.py           # 认证相关路由
│   │   ├── words.py          # 单词相关路由
│   │   └── user.py           # 用户相关路由
│   └── requirements.txt      # 项目依赖
├── forgot-password.html      # 忘记密码页面
├── login.html                # 登录页面
├── register.html             # 注册页面
└── word-memorization.html    # 单词默写主页面
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

在 `backend/.env` 文件中配置必要的环境变量：

```
# 应用配置
SECRET_KEY=your_secret_key_here
DEBUG=True
API_PREFIX=/api/v1

# 数据库配置
DATABASE_URL=sqlite:///words.db  # 默认使用SQLite
```

### 3. 运行后端服务

```bash
cd backend
python app.py
```

后端服务将在 http://localhost:5000 上运行。

### 4. 访问前端页面

直接在浏览器中打开 `login.html`、`register.html` 或 `word-memorization.html` 文件。

## API接口

### 认证相关
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录

### 单词相关
- `GET /api/v1/words` - 获取单词列表（支持分页和筛选）
- `GET /api/v1/words/<word_id>` - 获取单词详情

### 用户相关
- `GET /api/v1/user/<username>` - 获取用户信息
- `PUT /api/v1/user/<username>` - 更新用户信息

## 数据库模型

### User (用户模型)
- `id` - 用户ID
- `username` - 用户名
- `email` - 邮箱
- `password_hash` - 哈希后的密码
- `created_at` - 创建时间
- `last_login` - 最后登录时间

### Word (单词模型)
- `id` - 单词ID
- `word` - 单词
- `definition` - 定义
- `example` - 例句
- `level` - 难度级别（simple, medium, hard）
- `pronunciation` - 发音
- `category` - 分类

### UserWordProgress (用户单词进度)
- `id` - 进度ID
- `user_id` - 用户ID
- `word_id` - 单词ID
- `correct_count` - 正确次数
- `incorrect_count` - 错误次数
- `last_practiced` - 最后练习时间
- `is_mastered` - 是否已掌握
- `mastery_level` - 掌握程度（0-100）

## 项目特点

1. **分层架构**：清晰的路由、模型和业务逻辑分离
2. **安全设计**：密码哈希存储，防止明文泄露
3. **响应式UI**：基于Tailwind CSS的现代响应式界面
4. **学习算法**：基于艾宾浩斯遗忘曲线的学习进度跟踪
5. **灵活配置**：通过环境变量实现灵活配置

## 开发说明

### 添加新单词

单词数据会在应用第一次启动时自动初始化。如需添加新单词，可以在 `app.py` 文件中的 `sample_words` 列表中添加，或通过管理界面（后续开发）添加。

### 扩展功能

1. **添加新路由**：在 `routes/` 目录下创建新的蓝图文件
2. **添加新模型**：在 `models/` 目录下创建新的模型类
3. **前端开发**：修改相应的HTML文件，添加必要的JavaScript交互

## 许可证

本项目仅供学习和研究使用。

## 致谢

- Flask 社区
- Tailwind CSS 团队
- 所有为此项目提供灵感和帮助的资源
