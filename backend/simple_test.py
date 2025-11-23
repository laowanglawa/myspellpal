# 简单测试脚本，用于检查模块导入和基本功能
import sys

print("Python版本:", sys.version)

# 尝试导入必要的模块
try:
    from app import create_app
    print("✓ 成功导入create_app")
    
except Exception as e:
    print(f"✗ 导入create_app失败: {str(e)}")
    sys.exit(1)

try:
    from models.user import User
    from models.classroom import Classroom
    print("✓ 成功导入用户和班级模型")
    
except Exception as e:
    print(f"✗ 导入模型失败: {str(e)}")
    sys.exit(1)

print("\n所有必要模块导入成功！")
print("班级模型功能检查:")

# 测试班级代码生成功能
try:
    code = Classroom.generate_unique_code()
    print(f"✓ 成功生成班级代码: {code}")
    print(f"✓ 代码长度: {len(code)}")
    
except Exception as e:
    print(f"✗ 生成班级代码失败: {str(e)}")

print("\n模块导入测试完成！")