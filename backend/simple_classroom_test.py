# 简单的班级模型测试脚本
print("开始测试班级模型...")

# 导入必要的模块
try:
    print("导入模块...")
    from app import create_app, db
    from models.user import User
    from models.classroom import Classroom
    print("模块导入成功")
except Exception as e:
    print(f"导入模块失败: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)

# 创建应用实例并测试核心功能
try:
    print("\n创建应用实例...")
    app = create_app()
    print("应用实例创建成功")
    
    with app.app_context():
        print("\n进入应用上下文")
        
        # 测试班级代码生成功能
        print("\n测试班级代码生成:")
        code = Classroom.generate_unique_code()
        print(f"生成的班级代码: {code}")
        print(f"代码长度: {len(code)}")
        
        print("\n测试完成！")
        
 except Exception as e:
    print(f"测试过程中出错: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()