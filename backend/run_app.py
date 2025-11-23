# 运行应用并捕获完整错误信息
import sys

try:
    print("导入app模块...")
    from app import create_app
    print("导入成功，创建应用...")
    app = create_app()
    print("应用创建成功，准备运行...")
    print("应用将在 http://0.0.0.0:5000 上运行")
    app.run(debug=True, host='0.0.0.0', port=5000)
except Exception as e:
    print(f"错误类型: {type(e).__name__}")
    print(f"错误信息: {str(e)}")
    import traceback
    print("堆栈跟踪:")
    traceback.print_exc()
    sys.exit(1)