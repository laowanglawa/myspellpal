# 简单的导入测试脚本
print("开始测试导入...")

try:
    from flask import Flask
    print("✓ Flask 导入成功")
except Exception as e:
    print(f"✗ Flask 导入失败: {e}")

try:
    from flask_sqlalchemy import SQLAlchemy
    print("✓ SQLAlchemy 导入成功")
except Exception as e:
    print(f"✗ SQLAlchemy 导入失败: {e}")

try:
    from flask_cors import CORS
    print("✓ CORS 导入成功")
except Exception as e:
    print(f"✗ CORS 导入失败: {e}")

try:
    from dotenv import load_dotenv
    print("✓ dotenv 导入成功")
    load_dotenv()
    print("✓ 环境变量加载成功")
except Exception as e:
    print(f"✗ dotenv 导入或加载失败: {e}")

try:
    from routes.classrooms import classrooms_bp
    print("✓ 班级管理路由导入成功")
except Exception as e:
    print(f"✗ 班级管理路由导入失败: {e}")

try:
    from models.classroom import Classroom
    print("✓ 班级模型导入成功")
except Exception as e:
    print(f"✗ 班级模型导入失败: {e}")

print("导入测试完成")