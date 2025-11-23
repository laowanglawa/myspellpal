from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

# 添加当前目录到Python路径，以支持绝对导入
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 加载环境变量
load_dotenv()

# 创建Flask应用实例，为Python 3.14兼容性，指定instance_path参数
app = Flask(__name__, instance_path=os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance'))

# 配置应用
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///words.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 从database.py导入数据库实例
from database import db

# 初始化数据库
db.init_app(app)

# 配置CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 定义AI图片生成API端点
@app.route('/api/v1/words/image', methods=['GET'])
def get_word_image():
    """生成单词相关的AI图片"""
    try:
        # 获取查询参数
        sentence = request.args.get('sentence', '')
        word = request.args.get('word', '')
        
        # 优先使用sentence参数（重新生成图片时），如果没有则使用word参数（初始加载时）
        if sentence:
            prompt = sentence
        elif word:
            prompt = word
        else:
            return jsonify({'success': False, 'message': '单词或例句不能为空'}), 400
        
        # URL编码提示词
        encoded_prompt = urllib.parse.quote(prompt)
        
        # 使用pollinations.ai API生成图片
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        
        return jsonify({'success': True, 'image_url': image_url}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'生成图片失败: {str(e)}'}), 500

# 数据库初始化函数
def init_db():
    """初始化数据库"""
    with app.app_context():
        # 动态导入模型以避免循环导入
        from models.user import User
        from models.word import Word
        from models.user_word_progress import UserWordProgress
        
        # 创建所有表
        db.create_all()
        
        # 检查是否需要添加示例数据
        if Word.query.count() == 0:
            # 添加一些示例单词
            sample_words = [
                {"word": "apple", "definition": "苹果", "example": "I eat an apple every day.", "level": "simple"},
                {"word": "book", "definition": "书", "example": "This book is very interesting.", "level": "simple"},
                {"word": "computer", "definition": "电脑", "example": "I use my computer to work.", "level": "simple"},
                {"word": "beautiful", "definition": "美丽的", "example": "She is a beautiful girl.", "level": "simple"},
                {"word": "important", "definition": "重要的", "example": "This is an important meeting.", "level": "simple"},
                {"word": "accomplish", "definition": "完成", "example": "She accomplished her goal.", "level": "medium"},
                {"word": "approximately", "definition": "大约", "example": "It will take approximately two hours.", "level": "medium"},
                {"word": "circumstance", "definition": "情况", "example": "Under the circumstances, we have to leave.", "level": "medium"},
                {"word": "demonstration", "definition": "示范", "example": "The teacher gave a demonstration.", "level": "medium"},
                {"word": "establishment", "definition": "建立", "example": "The establishment of the new company took time.", "level": "medium"},
                {"word": "ambiguous", "definition": "模糊的", "example": "His answer was ambiguous.", "level": "hard"},
                {"word": "conscientious", "definition": "认真的", "example": "She is a conscientious worker.", "level": "hard"},
                {"word": "ephemeral", "definition": "短暂的", "example": "Fame in Hollywood is often ephemeral.", "level": "hard"},
                {"word": "idiosyncratic", "definition": "特殊的", "example": "He has idiosyncratic habits.", "level": "hard"},
                {"word": "perennial", "definition": "多年生的", "example": "Roses are perennial flowers.", "level": "hard"},
            ]
            
            for word_data in sample_words:
                word = Word(**word_data)
                db.session.add(word)
            
            db.session.commit()

# 导入必要的模块用于API端点
from flask import request
import urllib.parse

# 初始化数据库
init_db()

if __name__ == "__main__":
    app.run(debug=os.environ.get('DEBUG', 'True').lower() == 'true', host='0.0.0.0', port=5000)
